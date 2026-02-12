"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { MappingSuggestion } from "@pdp/backend/convex/lib/import/mapper";
import type { ParseResult } from "@pdp/backend/convex/lib/import/parser";
import { Check } from "lucide-react";
import { useCallback, useState } from "react";
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
    name: "Benchmarks",
    description: "Configure skill rating initialization",
  },
  {
    id: 5,
    name: "Review",
    description: "Review validation and duplicates",
  },
  { id: 6, name: "Import", description: "Import players" },
  { id: 7, name: "Complete", description: "Import summary" },
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

  const goNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length));
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const updateState = useCallback((updates: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} steps={WIZARD_STEPS} />

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <UploadStep
            goBack={goBack}
            onDataParsed={(data) => {
              // Select all rows by default
              const allIndices = new Set(
                Array.from({ length: data.rows.length }, (_, i) => i)
              );
              updateState({
                parsedData: data,
                selectedRows: allIndices,
              });
              goNext();
            }}
          />
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
            goNext={goNext}
            onSelectionChange={(selected) =>
              updateState({ selectedRows: selected })
            }
            parsedData={state.parsedData}
            selectedRows={state.selectedRows}
          />
        )}
        {currentStep === 4 && (
          <BenchmarkConfigStep
            goBack={goBack}
            goNext={goNext}
            onSettingsChange={(settings) =>
              updateState({ benchmarkSettings: settings })
            }
            settings={state.benchmarkSettings}
          />
        )}
        {currentStep === 5 && state.parsedData && (
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
        {currentStep === 6 && state.parsedData && (
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
        {currentStep === 7 && (
          <CompleteStep
            importResult={state.importResult}
            organizationId={organizationId}
          />
        )}
      </div>
    </div>
  );
}
