"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { ParseResult } from "@pdp/backend/convex/lib/import/parser";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BenchmarkSettings,
  WizardState,
} from "@/components/import/import-wizard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// ============================================================
// Types
// ============================================================

type ImportPhase = "preparing" | "importing" | "complete" | "failed";

type ImportStepProps = {
  organizationId: string;
  parsedData: ParseResult;
  confirmedMappings: Record<string, string>;
  selectedRows: Set<number>;
  benchmarkSettings: BenchmarkSettings;
  sportCode: string;
  sessionId: Id<"importSessions"> | null;
  onImportComplete: (result: WizardState["importResult"]) => void;
  goNext: () => void;
};

type ProgressStats = {
  playersCreated: number;
  playersReused: number;
  guardiansCreated: number;
  guardiansLinked: number;
  enrollmentsCreated: number;
  passportsCreated: number;
  benchmarksApplied: number;
  totalPlayers: number;
};

type ProgressError = {
  rowNumber: number;
  playerName: string;
  error: string;
  timestamp: number;
};

// ============================================================
// Helpers
// ============================================================

function getMappedValue(
  row: Record<string, string>,
  targetField: string,
  mappings: Record<string, string>
): string {
  for (const [sourceCol, target] of Object.entries(mappings)) {
    if (target === targetField) {
      return row[sourceCol] ?? "";
    }
  }
  return "";
}

function buildPlayerPayload(
  row: Record<string, string>,
  mappings: Record<string, string>
) {
  const get = (field: string) => getMappedValue(row, field, mappings);
  const gender = get("gender").toLowerCase();
  let normalizedGender: "male" | "female" | "other" = "other";
  if (gender === "male" || gender === "m") {
    normalizedGender = "male";
  } else if (gender === "female" || gender === "f") {
    normalizedGender = "female";
  }

  return {
    firstName: get("firstName"),
    lastName: get("lastName"),
    dateOfBirth: get("dateOfBirth"),
    gender: normalizedGender,
    ageGroup: get("ageGroup") || "Unknown",
    season: get("season") || new Date().getFullYear().toString(),
    address: get("address") || undefined,
    town: get("town") || undefined,
    postcode: get("postcode") || undefined,
    country: get("country") || undefined,
    parentFirstName: get("parentFirstName") || undefined,
    parentLastName: get("parentLastName") || undefined,
    parentEmail: get("parentEmail") || undefined,
    parentPhone: get("parentPhone") || undefined,
  };
}

// ============================================================
// Phase Display Components
// ============================================================

function PhaseIcon({ phase }: { phase: ImportPhase }) {
  if (phase === "complete") {
    return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  }
  if (phase === "failed") {
    return <XCircle className="h-5 w-5 text-red-600" />;
  }
  return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
}

// Stats Card component showing live statistics
function StatsCard({ stats }: { stats: ProgressStats | null }) {
  if (!stats) {
    return (
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex animate-pulse gap-4">
            <div className="h-4 w-1/4 rounded bg-muted" />
            <div className="h-4 w-1/4 rounded bg-muted" />
            <div className="h-4 w-1/4 rounded bg-muted" />
            <div className="h-4 w-1/4 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Players</p>
            <p className="font-semibold text-lg">
              {stats.playersCreated + stats.playersReused}/{stats.totalPlayers}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Guardians</p>
            <p className="font-semibold text-lg">
              {stats.guardiansCreated + stats.guardiansLinked}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Enrollments</p>
            <p className="font-semibold text-lg">{stats.enrollmentsCreated}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Passports</p>
            <p className="font-semibold text-lg">{stats.passportsCreated}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Current operation display with smooth fade transitions
function CurrentOperation({ operation }: { operation: string | null }) {
  if (!operation) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center gap-2 text-muted-foreground text-sm">
      <Loader2 className="h-4 w-4 animate-spin" />
      <AnimatePresence mode="wait">
        <motion.span
          animate={{ opacity: 1, y: 0 }}
          className="truncate"
          exit={{ opacity: 0, y: 10 }}
          initial={{ opacity: 0, y: -10 }}
          key={operation}
          transition={{ duration: 0.2 }}
        >
          Currently: {operation}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

// Error list component
function ErrorList({ errors }: { errors: ProgressError[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const errorListRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new errors added
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isExpanded && errorListRef.current) {
      errorListRef.current.scrollTop = errorListRef.current.scrollHeight;
    }
  }, [isExpanded]);

  if (errors.length === 0) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-green-800 text-sm">
        <CheckCircle2 className="h-4 w-4" />
        <span>No errors (0)</span>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <button
        className="flex w-full items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800 text-sm hover:bg-red-100"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <span className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Errors ({errors.length})
        </span>
        <span className="text-xs">{isExpanded ? "Hide" : "Show"}</span>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="mt-2 max-h-48 overflow-y-auto rounded-md border border-red-200 bg-white"
              ref={errorListRef}
            >
              <div className="space-y-1 p-2">
                {errors.map((err, idx) => (
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-sm bg-red-50 px-2 py-1.5 text-xs"
                    initial={{ opacity: 0, x: -10 }}
                    key={`${err.rowNumber}-${idx}`}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                  >
                    <span className="font-semibold">Row #{err.rowNumber}:</span>{" "}
                    {err.playerName} - {err.error}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PhaseIndicator({
  phase,
  error,
  progress,
}: {
  phase: ImportPhase;
  error: string | null;
  progress: number;
}) {
  // Determine progress bar variant based on phase
  const getProgressVariant = () => {
    if (phase === "complete") {
      return "success";
    }
    if (phase === "failed") {
      return "error";
    }
    return "default";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PhaseIcon phase={phase} />
          {phase === "preparing" && "Preparing import..."}
          {phase === "importing" && "Importing players..."}
          {phase === "complete" && "Import complete!"}
          {phase === "failed" && "Import failed"}
        </CardTitle>
        <CardDescription>
          {phase === "preparing" && "Building import data..."}
          {phase === "importing" && "Processing player records..."}
          {phase === "complete" && "All players have been processed."}
          {phase === "failed" && (error || "An unexpected error occurred.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress
          className="h-2"
          value={progress}
          variant={getProgressVariant()}
        />
        <p className="mt-2 text-center text-muted-foreground text-xs">
          {Math.round(progress)}%
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main ImportStep
// ============================================================

export default function ImportStep({
  organizationId,
  parsedData,
  confirmedMappings,
  selectedRows,
  benchmarkSettings,
  sportCode,
  sessionId,
  onImportComplete,
  goNext,
}: ImportStepProps) {
  const [phase, setPhase] = useState<ImportPhase>("preparing");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const hasStarted = useRef(false);

  const batchImport = useMutation(
    api.models.playerImport.batchImportPlayersWithIdentity
  );
  const recordStats = useMutation(api.models.importSessions.recordSessionStats);
  const updateStatus = useMutation(
    api.models.importSessions.updateSessionStatus
  );
  const cleanupProgress = useMutation(
    api.models.importProgress.cleanupProgressTracker
  );

  // Poll progress tracker during import
  const progressData = useQuery(
    api.models.importProgress.getProgressTracker,
    sessionId && isImporting ? { sessionId } : "skip"
  );

  // Update local state from progress tracker
  useEffect(() => {
    if (progressData) {
      setProgress(progressData.percentage);
      if (progressData.phase === "completed") {
        setPhase("complete");
        setIsImporting(false);
      } else if (progressData.phase === "failed") {
        setPhase("failed");
        setIsImporting(false);
      } else {
        setPhase("importing");
      }
    }
  }, [progressData]);

  const runImport = useCallback(async () => {
    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;
    setIsImporting(true);

    try {
      setPhase("preparing");
      setProgress(10);

      // Build player array from selected rows
      const players = [...selectedRows].map((idx) => {
        const row = parsedData.rows[idx];
        return buildPlayerPayload(row, confirmedMappings);
      });

      setProgress(20);
      setPhase("importing");

      // Update session status to "importing" before starting import
      if (sessionId) {
        await updateStatus({
          sessionId,
          status: "importing",
        });
      }

      const result = await batchImport({
        organizationId,
        sportCode: sportCode || undefined,
        sessionId: sessionId ?? undefined,
        selectedRowIndices: [...selectedRows],
        benchmarkSettings: benchmarkSettings.applyBenchmarks
          ? {
              applyBenchmarks: true,
              strategy: benchmarkSettings.strategy,
              templateId: benchmarkSettings.customTemplateId ?? undefined,
              ageGroup: "all",
            }
          : undefined,
        players,
      });

      setProgress(100);
      setPhase("complete");
      setIsImporting(false);

      onImportComplete({
        playersCreated: result.playersCreated,
        playersUpdated: result.playersReused,
        playersSkipped: 0,
        guardiansCreated: result.guardiansCreated,
        guardiansLinked:
          result.guardiansLinkedToVerifiedAccounts + result.guardiansReused,
        teamsCreated: 0,
        passportsCreated: result.enrollmentsCreated,
        benchmarksApplied: result.benchmarksApplied,
      });

      // Record final stats to import session before cleanup
      if (sessionId) {
        await recordStats({
          sessionId,
          stats: {
            totalRows: parsedData.rows.length,
            selectedRows: selectedRows.size,
            validRows: selectedRows.size - result.errors.length,
            errorRows: result.errors.length,
            duplicateRows: 0, // TODO: Track duplicates if needed
            playersCreated: result.playersCreated,
            playersUpdated: result.playersReused,
            playersSkipped: 0,
            guardiansCreated: result.guardiansCreated,
            guardiansLinked:
              result.guardiansLinkedToVerifiedAccounts + result.guardiansReused,
            teamsCreated: 0,
            passportsCreated: result.enrollmentsCreated,
            benchmarksApplied: result.benchmarksApplied,
          },
        });

        // Mark session as completed
        await updateStatus({
          sessionId,
          status: "completed",
        });
      }

      // Cleanup progress tracker after successful import
      if (sessionId) {
        await cleanupProgress({ sessionId });
      }
    } catch (err) {
      setPhase("failed");
      setIsImporting(false);
      setError(err instanceof Error ? err.message : "Import failed");

      // Cleanup progress tracker after failed import
      if (sessionId) {
        await cleanupProgress({ sessionId });
      }
    }
  }, [
    selectedRows,
    parsedData.rows,
    confirmedMappings,
    batchImport,
    recordStats,
    updateStatus,
    cleanupProgress,
    organizationId,
    sportCode,
    sessionId,
    benchmarkSettings,
    onImportComplete,
  ]);

  useEffect(() => {
    runImport().catch(() => {
      // Error handled in runImport state
    });
  }, [runImport]);

  return (
    <div className="space-y-4">
      {/* Live Stats Card */}
      {isImporting && sessionId && (
        <StatsCard stats={progressData?.stats ?? null} />
      )}

      {/* Current Operation */}
      {isImporting && sessionId && (
        <CurrentOperation operation={progressData?.currentOperation ?? null} />
      )}

      {/* Error List */}
      {isImporting && sessionId && (
        <ErrorList errors={progressData?.errors ?? []} />
      )}

      {/* Progress Indicator */}
      <PhaseIndicator error={error} phase={phase} progress={progress} />

      {phase === "complete" && (
        <div className="flex justify-center pt-2">
          <Button onClick={goNext} size="lg">
            View Results
          </Button>
        </div>
      )}

      {phase === "failed" && (
        <div className="flex justify-center pt-2">
          <Button
            onClick={() => {
              hasStarted.current = false;
              setPhase("preparing");
              setProgress(0);
              setError(null);
              setIsImporting(true);
              runImport().catch(() => {
                // Error handled in runImport state
              });
            }}
            variant="outline"
          >
            Retry Import
          </Button>
        </div>
      )}
    </div>
  );
}
