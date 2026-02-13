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
import { AlertTriangle, Check, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataQualityReport from "@/components/import/data-quality-report";
import type { SimulationResult } from "@/components/import/simulation-results";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  simulationResult: SimulationResult | null;
  simulationDataHash: string | null;
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
// Draft data type for resume flow
// ============================================================

export type DraftData = {
  _id: Id<"importSessionDrafts">;
  step: number;
  parsedHeaders?: string[];
  parsedRowCount?: number;
  mappings?: Record<string, string>;
  playerSelections?: Array<{
    rowIndex: number;
    selected: boolean;
    reason?: string;
  }>;
  benchmarkSettings?: {
    applyBenchmarks: boolean;
    strategy: string;
    customTemplateId?: Id<"benchmarkTemplates">;
    passportStatuses: string[];
  };
  templateId?: Id<"importTemplates">;
  sourceFileName?: string;
};

// ============================================================
// Step Indicator
// ============================================================

function StepIndicator({
  steps,
  currentStep,
  saveStatus,
}: {
  steps: WizardStep[];
  currentStep: number;
  saveStatus: "idle" | "saving" | "saved";
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
        <div className="flex items-center gap-2">
          {saveStatus !== "idle" && (
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <Save className="h-3 w-3" />
              {saveStatus === "saving" ? "Saving..." : "Saved"}
            </span>
          )}
          <span className="text-muted-foreground text-sm">
            {steps.find((s) => s.id === currentStep)?.name}
          </span>
        </div>
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

      {/* Desktop save indicator */}
      {saveStatus !== "idle" && (
        <div className="mt-2 hidden justify-end md:flex">
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <Save className="h-3 w-3" />
            {saveStatus === "saving" ? "Saving draft..." : "Draft saved"}
          </span>
        </div>
      )}
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

const SAVE_DEBOUNCE_MS = 500;

type ImportWizardProps = {
  organizationId: string;
  templateId: Id<"importTemplates"> | null;
  sportCode: string;
  draftData?: DraftData | null;
};

export default function ImportWizard({
  organizationId,
  templateId,
  sportCode,
  draftData,
}: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<WizardState>(() => ({
    templateId: draftData?.templateId ?? templateId,
    sportCode: sportCode || "gaa_football",
    parsedData: null,
    mappings: [],
    confirmedMappings: draftData?.mappings ?? {},
    selectedRows: new Set(
      draftData?.playerSelections
        ?.filter((s) => s.selected)
        .map((s) => s.rowIndex) ?? []
    ),
    benchmarkSettings: draftData?.benchmarkSettings
      ? {
          applyBenchmarks: draftData.benchmarkSettings.applyBenchmarks,
          strategy: draftData.benchmarkSettings
            .strategy as BenchmarkSettings["strategy"],
          customTemplateId: draftData.benchmarkSettings.customTemplateId,
          passportStatuses: draftData.benchmarkSettings.passportStatuses,
        }
      : {
          applyBenchmarks: true,
          strategy: "age-appropriate",
          passportStatuses: ["active"],
        },
    sessionId: null,
    validationErrors: [],
    duplicates: [],
    importResult: null,
    simulationResult: null,
    simulationDataHash: null,
  }));

  const [qualityReport, setQualityReport] = useState<QualityReport | null>(
    null
  );

  // Draft save state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const draftIdRef = useRef<Id<"importSessionDrafts"> | null>(
    draftData?._id ?? null
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref to the latest state for async save callbacks
  const stateRef = useRef(state);
  stateRef.current = state;
  // Store source file name for drafts
  const sourceFileNameRef = useRef<string | undefined>(
    draftData?.sourceFileName
  );

  // Header mismatch dialog state for resume flow
  const [headerMismatchOpen, setHeaderMismatchOpen] = useState(false);
  const pendingParseRef = useRef<{
    data: ParseResult;
    fileName?: string;
  } | null>(null);

  const createSession = useMutation(
    api.models.importSessions.createImportSession
  );
  const saveDraftMutation = useMutation(
    api.models.importSessionDrafts.saveDraft
  );
  const deleteDraftMutation = useMutation(
    api.models.importSessionDrafts.deleteDraft
  );
  const { data: session } = authClient.useSession();
  const sessionCreating = useRef(false);

  // Debounced auto-save after step transitions
  const triggerSave = useCallback(
    (step: number) => {
      // Don't save on step 7 (importing) or 8 (complete)
      if (step >= 7) {
        return;
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        const currentState = stateRef.current;
        setSaveStatus("saving");
        try {
          const selections = Array.from(currentState.selectedRows).map(
            (rowIndex) => ({
              rowIndex,
              selected: true,
            })
          );

          const id = await saveDraftMutation({
            organizationId,
            step,
            parsedHeaders: currentState.parsedData?.headers,
            parsedRowCount: currentState.parsedData?.totalRows,
            mappings:
              Object.keys(currentState.confirmedMappings).length > 0
                ? currentState.confirmedMappings
                : undefined,
            playerSelections: selections.length > 0 ? selections : undefined,
            benchmarkSettings: currentState.benchmarkSettings,
            templateId: currentState.templateId ?? undefined,
            sourceFileName: sourceFileNameRef.current,
          });
          draftIdRef.current = id;
          setSaveStatus("saved");
          // Reset "saved" indicator after 2 seconds
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch {
          setSaveStatus("idle");
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [organizationId, saveDraftMutation]
  );

  // Cleanup save timer on unmount
  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    },
    []
  );

  // Delete draft on completion or cancellation
  const cleanupDraft = useCallback(async () => {
    // Cancel any pending debounced save to prevent re-creating a deleted draft
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (draftIdRef.current) {
      try {
        await deleteDraftMutation({ draftId: draftIdRef.current });
        draftIdRef.current = null;
      } catch {
        // Non-blocking — draft will expire on its own
      }
    }
  }, [deleteDraftMutation]);

  const goNext = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.min(prev + 1, WIZARD_STEPS.length);
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  // Trigger save whenever step changes (after initial render)
  const prevStepRef = useRef(currentStep);
  useEffect(() => {
    if (prevStepRef.current !== currentStep) {
      prevStepRef.current = currentStep;
      triggerSave(currentStep);
    }
  }, [currentStep, triggerSave]);

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

  // Apply draft state (mappings, selections, settings) and jump to saved step
  const applyDraftAndResume = useCallback(
    (data: ParseResult, fileName?: string) => {
      sourceFileNameRef.current = fileName;

      // Restore selections from draft, or default to all selected
      let selectedRows: Set<number>;
      if (
        draftData?.playerSelections &&
        draftData.playerSelections.length > 0
      ) {
        selectedRows = new Set(
          draftData.playerSelections
            .filter((s) => s.selected)
            .map((s) => s.rowIndex)
        );
      } else {
        selectedRows = new Set(
          Array.from({ length: data.rows.length }, (_, i) => i)
        );
      }

      updateState({
        parsedData: data,
        selectedRows,
        confirmedMappings: draftData?.mappings ?? {},
        benchmarkSettings: draftData?.benchmarkSettings
          ? {
              applyBenchmarks: draftData.benchmarkSettings.applyBenchmarks,
              strategy: draftData.benchmarkSettings
                .strategy as BenchmarkSettings["strategy"],
              customTemplateId: draftData.benchmarkSettings.customTemplateId,
              passportStatuses: draftData.benchmarkSettings.passportStatuses,
            }
          : stateRef.current.benchmarkSettings,
      });

      // Jump to saved step (minimum step 2 since we just parsed)
      const resumeStep = Math.max(draftData?.step ?? 2, 2);
      setCurrentStep(resumeStep);
    },
    [draftData, updateState]
  );

  // Proceed fresh (no draft state) — just select all rows and go to step 2
  const proceedFresh = useCallback(
    (data: ParseResult, fileName?: string) => {
      sourceFileNameRef.current = fileName;
      const allIndices = new Set(
        Array.from({ length: data.rows.length }, (_, i) => i)
      );
      updateState({
        parsedData: data,
        selectedRows: allIndices,
      });
      goNext();
    },
    [updateState, goNext]
  );

  const handleDataParsed = useCallback(
    async (data: ParseResult, fileName?: string) => {
      // Create import session for tracking (always, regardless of resume)
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

      // If resuming from a draft, check header compatibility
      if (draftData?.parsedHeaders && draftData.parsedHeaders.length > 0) {
        const draftHeaders = draftData.parsedHeaders;
        const uploadedHeaders = data.headers;

        // Check for exact match (same columns in same order)
        const headersMatch =
          draftHeaders.length === uploadedHeaders.length &&
          draftHeaders.every((h, i) => h === uploadedHeaders[i]);

        if (headersMatch) {
          // Headers match — auto-restore draft state and jump to saved step
          applyDraftAndResume(data, fileName);
          return;
        }

        // Headers don't match — show warning dialog
        pendingParseRef.current = { data, fileName };
        setHeaderMismatchOpen(true);
        return;
      }

      // No draft or no saved headers — proceed normally
      proceedFresh(data, fileName);
    },
    [
      updateState,
      createSession,
      organizationId,
      templateId,
      session?.user?.id,
      draftData,
      applyDraftAndResume,
      proceedFresh,
    ]
  );

  // Handler: user chose "Apply Anyway" despite header mismatch
  const handleApplyAnyway = useCallback(() => {
    setHeaderMismatchOpen(false);
    if (pendingParseRef.current) {
      applyDraftAndResume(
        pendingParseRef.current.data,
        pendingParseRef.current.fileName
      );
      pendingParseRef.current = null;
    }
  }, [applyDraftAndResume]);

  // Handler: user chose "Start Fresh" — discard draft and proceed normally
  const handleStartFresh = useCallback(() => {
    setHeaderMismatchOpen(false);
    cleanupDraft();
    if (pendingParseRef.current) {
      proceedFresh(
        pendingParseRef.current.data,
        pendingParseRef.current.fileName
      );
      pendingParseRef.current = null;
    }
  }, [cleanupDraft, proceedFresh]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Step Indicator with save status */}
      <StepIndicator
        currentStep={currentStep}
        saveStatus={saveStatus}
        steps={WIZARD_STEPS}
      />

      {/* Resume prompt for re-upload */}
      {draftData && currentStep === 1 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
          <p className="text-sm">
            Please re-upload{" "}
            <span className="font-medium">
              {draftData.sourceFileName ?? "your CSV file"}
            </span>{" "}
            to continue where you left off.
            {draftData.parsedRowCount != null && (
              <span className="text-muted-foreground">
                {" "}
                ({draftData.parsedRowCount} rows expected)
              </span>
            )}
          </p>
        </div>
      )}

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
            benchmarkSettings={state.benchmarkSettings}
            cachedSimulationDataHash={state.simulationDataHash}
            cachedSimulationResult={state.simulationResult}
            confirmedMappings={state.confirmedMappings}
            duplicates={state.duplicates}
            goBack={goBack}
            goNext={() => {
              updateState({ importResult: null });
              // Delete draft before importing — the import is about to happen
              cleanupDraft();
              goNext();
            }}
            onDuplicatesChange={(duplicates) => updateState({ duplicates })}
            onSimulationComplete={(result, dataHash) =>
              updateState({
                simulationResult: result,
                simulationDataHash: dataHash,
              })
            }
            onValidationErrorsChange={(validationErrors) =>
              updateState({ validationErrors })
            }
            organizationId={organizationId}
            parsedData={state.parsedData}
            selectedRows={state.selectedRows}
            sportCode={state.sportCode}
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
            sessionId={state.sessionId}
          />
        )}
      </div>

      {/* Header mismatch dialog for resume flow */}
      <AlertDialog
        onOpenChange={setHeaderMismatchOpen}
        open={headerMismatchOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Column Headers Don&apos;t Match
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  The uploaded file has different column headers than your saved
                  draft. Your saved mappings and selections may not apply
                  correctly.
                </p>
                <p className="font-medium text-foreground">
                  Would you like to apply your saved settings anyway, or start
                  fresh?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartFresh}>
              Start Fresh
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyAnyway}>
              Apply Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
