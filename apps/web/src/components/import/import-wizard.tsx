"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import {
  calculateDataQuality,
  type QualityReport,
} from "@pdp/backend/convex/lib/import/dataQuality";
import type { MappingSuggestion } from "@pdp/backend/convex/lib/import/mapper";
import type { ParseResult } from "@pdp/backend/convex/lib/import/parser";
import { useMutation } from "convex/react";
import { Check } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import DataQualityReport from "@/components/import/data-quality-report";
import BenchmarkConfigStep from "@/components/import/steps/benchmark-config-step";
import CompleteStep from "@/components/import/steps/complete-step";
import ImportStep from "@/components/import/steps/import-step";
import MappingStep from "@/components/import/steps/mapping-step";
import PlayerSelectionStep from "@/components/import/steps/player-selection-step";
import type {
  DuplicateInfo,
  ReviewValidationError,
} from "@/components/import/steps/review-step";
import ReviewStep from "@/components/import/steps/review-step";
import UploadStep from "@/components/import/steps/upload-step";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

export type BenchmarkSettings = {
  applyBenchmarks: boolean;
  strategy:
    | "blank"
    | "middle"
    | "age-appropriate"
    | "ngb-benchmarks"
    | "custom";
  customTemplateId?: Id<"benchmarkTemplates">;
  passportStatuses: string[];
};

export type WizardState = {
  templateId: Id<"importTemplates"> | null;
  sportCode: string;
  parsedData: ParseResult | null;
  mappings: MappingSuggestion[];
  confirmedMappings: Record<string, string>;
  selectedRows: Set<number>;
  benchmarkSettings: BenchmarkSettings;
  sessionId: Id<"importSessions"> | null;
  validationErrors: ReviewValidationError[];
  duplicates: DuplicateInfo[];
  importResult: {
    playersCreated: number;
    playersUpdated: number;
    playersSkipped: number;
    guardiansCreated: number;
    guardiansLinked: number;
    teamsCreated: number;
    passportsCreated: number;
    benchmarksApplied: number;
  } | null;
};

export type WizardStep = {
  id: number;
  name: string;
  description: string;
};

export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, name: "Upload", description: "Upload CSV file or paste data" },
  { id: 2, name: "Map Columns", description: "Review column mappings" },
  { id: 3, name: "Select Players", description: "Choose players to import" },
  {
    id: 4,
    name: "Quality Check",
    description: "Review data quality and fix issues",
  },
  {
    id: 5,
    name: "Benchmarks",
    description: "Configure skill rating initialization",
  },
  {
    id: 6,
    name: "Review",
    description: "Review validation and duplicates",
  },
  { id: 7, name: "Import", description: "Import players" },
  { id: 8, name: "Complete", description: "Import summary" },
];

// ============================================================
// Step Indicator
// ============================================================

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: WizardStep[];
  currentStep: number;
}) {
  return (
    <nav aria-label="Import wizard progress" className="w-full">
      {/* Desktop: horizontal stepper */}
      <ol className="hidden items-center md:flex">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <li
              className={cn(
                "flex items-center",
                index < steps.length - 1 && "flex-1"
              )}
              key={step.id}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-medium text-xs",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary",
                    !(isCompleted || isCurrent) && "border-muted-foreground/30"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span
                  className={cn(
                    "whitespace-nowrap text-sm",
                    isCurrent && "font-medium",
                    !(isCompleted || isCurrent) && "text-muted-foreground"
                  )}
                >
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-3 h-0.5 flex-1",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: compact stepper */}
      <div className="flex items-center justify-between md:hidden">
        <span className="font-medium text-sm">
          Step {currentStep} of {steps.length}
        </span>
        <span className="text-muted-foreground text-sm">
          {steps.find((s) => s.id === currentStep)?.name}
        </span>
      </div>
      <div className="mt-2 flex gap-1 md:hidden">
        {steps.map((step) => (
          <div
            className={cn(
              "h-1.5 flex-1 rounded-full",
              currentStep >= step.id ? "bg-primary" : "bg-muted-foreground/20"
            )}
            key={step.id}
          />
        ))}
      </div>
    </nav>
  );
}

// ============================================================
// Helpers
// ============================================================

/**
 * Build mapped rows for quality scoring — applies column mappings to selected rows.
 */
function buildMappedRows(
  parsedData: ParseResult,
  confirmedMappings: Record<string, string>,
  selectedRows: Set<number>
): Record<string, string>[] {
  const reverseMap: Record<string, string> = {};
  for (const [sourceCol, targetField] of Object.entries(confirmedMappings)) {
    reverseMap[targetField] = sourceCol;
  }

  return parsedData.rows
    .filter((_, idx) => selectedRows.has(idx))
    .map((row) => {
      const mapped: Record<string, string> = {};
      for (const [targetField, sourceCol] of Object.entries(reverseMap)) {
        mapped[targetField] = row[sourceCol] ?? "";
      }
      return mapped;
    });
}

// ============================================================
// Import Wizard Component
// ============================================================

type ImportWizardProps = {
  organizationId: string;
  templateId: Id<"importTemplates"> | null;
  sportCode: string;
};

export default function ImportWizard({
  organizationId,
  templateId,
  sportCode,
}: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<WizardState>({
    templateId,
    sportCode: sportCode || "gaa_football",
    parsedData: null,
    mappings: [],
    confirmedMappings: {},
    selectedRows: new Set(),
    benchmarkSettings: {
      applyBenchmarks: true,
      strategy: "age-appropriate",
      passportStatuses: ["active"],
    },
    sessionId: null,
    validationErrors: [],
    duplicates: [],
    importResult: null,
  });

  const [qualityReport, setQualityReport] = useState<QualityReport | null>(
    null
  );

  const createSession = useMutation(
    api.models.importSessions.createImportSession
  );
  const { data: session } = authClient.useSession();
  const sessionCreating = useRef(false);

  const goNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length));
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const updateState = useCallback((updates: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Build mapped rows for quality scoring
  const mappedSelectedRows = useMemo(() => {
    if (!state.parsedData) {
      return [];
    }
    return buildMappedRows(
      state.parsedData,
      state.confirmedMappings,
      state.selectedRows
    );
  }, [state.parsedData, state.confirmedMappings, state.selectedRows]);

  const runQualityCheck = useCallback(() => {
    const report = calculateDataQuality(
      mappedSelectedRows,
      state.confirmedMappings,
      state.sportCode
    );
    setQualityReport(report);
  }, [mappedSelectedRows, state.confirmedMappings, state.sportCode]);

  const handleFixIssue = useCallback(
    (rowIndex: number, field: string, newValue: string) => {
      if (!state.parsedData) {
        return;
      }

      // Find the source column for this field
      let sourceCol: string | undefined;
      for (const [src, target] of Object.entries(state.confirmedMappings)) {
        if (target === field) {
          sourceCol = src;
          break;
        }
      }
      if (!sourceCol) {
        return;
      }

      // Find the actual row index in parsedData (accounting for selectedRows filtering)
      const selectedIndices = Array.from(state.selectedRows).sort(
        (a, b) => a - b
      );
      const actualRowIndex = selectedIndices[rowIndex];
      if (actualRowIndex === undefined) {
        return;
      }

      // Update the row data
      const updatedRows = [...state.parsedData.rows];
      updatedRows[actualRowIndex] = {
        ...updatedRows[actualRowIndex],
        [sourceCol]: newValue,
      };

      const updatedParsedData = {
        ...state.parsedData,
        rows: updatedRows,
      };

      updateState({ parsedData: updatedParsedData });

      // Re-run quality check with updated data
      const updatedMapped = buildMappedRows(
        updatedParsedData,
        state.confirmedMappings,
        state.selectedRows
      );
      const report = calculateDataQuality(
        updatedMapped,
        state.confirmedMappings,
        state.sportCode
      );
      setQualityReport(report);
    },
    [
      state.parsedData,
      state.confirmedMappings,
      state.selectedRows,
      updateState,
      state.sportCode,
    ]
  );

  const handleDataParsed = useCallback(
    async (data: ParseResult, fileName?: string) => {
      // Select all rows by default
      const allIndices = new Set(
        Array.from({ length: data.rows.length }, (_, i) => i)
      );
      updateState({
        parsedData: data,
        selectedRows: allIndices,
      });

      // Create import session for tracking
      if (!sessionCreating.current) {
        sessionCreating.current = true;
        try {
          const sessionId = await createSession({
            organizationId,
            templateId: templateId ?? undefined,
            initiatedBy: session?.user?.id ?? "unknown",
            sourceInfo: {
              type: "file" as const,
              fileName,
              rowCount: data.totalRows,
              columnCount: data.headers.length,
            },
          });
          updateState({ sessionId });
        } catch {
          // Session creation is non-blocking — import can proceed without it
        }
      }

      goNext();
    },
    [
      updateState,
      goNext,
      createSession,
      organizationId,
      templateId,
      session?.user?.id,
    ]
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} steps={WIZARD_STEPS} />

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <UploadStep goBack={goBack} onDataParsed={handleDataParsed} />
        )}
        {currentStep === 2 && state.parsedData && (
          <MappingStep
            goBack={goBack}
            onMappingsConfirmed={(mappings) => {
              updateState({ confirmedMappings: mappings });
              goNext();
            }}
            parsedData={state.parsedData}
          />
        )}
        {currentStep === 3 && state.parsedData && (
          <PlayerSelectionStep
            confirmedMappings={state.confirmedMappings}
            goBack={goBack}
            goNext={() => {
              // Run quality check when entering the quality check step
              runQualityCheck();
              goNext();
            }}
            onSelectionChange={(selected) =>
              updateState({ selectedRows: selected })
            }
            parsedData={state.parsedData}
            selectedRows={state.selectedRows}
          />
        )}
        {currentStep === 4 && qualityReport && (
          <DataQualityReport
            onBack={goBack}
            onContinue={goNext}
            onFixIssue={handleFixIssue}
            qualityReport={qualityReport}
          />
        )}
        {currentStep === 5 && (
          <BenchmarkConfigStep
            goBack={goBack}
            goNext={goNext}
            onSettingsChange={(settings) =>
              updateState({ benchmarkSettings: settings })
            }
            settings={state.benchmarkSettings}
          />
        )}
        {currentStep === 6 && state.parsedData && (
          <ReviewStep
            confirmedMappings={state.confirmedMappings}
            duplicates={state.duplicates}
            goBack={goBack}
            goNext={() => {
              updateState({ importResult: null });
              goNext();
            }}
            onDuplicatesChange={(duplicates) => updateState({ duplicates })}
            onValidationErrorsChange={(validationErrors) =>
              updateState({ validationErrors })
            }
            parsedData={state.parsedData}
            selectedRows={state.selectedRows}
            validationErrors={state.validationErrors}
          />
        )}
        {currentStep === 7 && state.parsedData && (
          <ImportStep
            benchmarkSettings={state.benchmarkSettings}
            confirmedMappings={state.confirmedMappings}
            goNext={goNext}
            onImportComplete={(result) => updateState({ importResult: result })}
            organizationId={organizationId}
            parsedData={state.parsedData}
            selectedRows={state.selectedRows}
            sessionId={state.sessionId}
            sportCode={state.sportCode}
          />
        )}
        {currentStep === 8 && (
          <CompleteStep
            importResult={state.importResult}
            organizationId={organizationId}
          />
        )}
      </div>
    </div>
  );
}
