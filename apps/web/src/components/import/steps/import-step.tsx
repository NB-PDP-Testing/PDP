"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { ParseResult } from "@pdp/backend/convex/lib/import/parser";
import { useMutation } from "convex/react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
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
// Phase Display
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

function PhaseIndicator({
  phase,
  error,
  progress,
  totalPlayers,
}: {
  phase: ImportPhase;
  error: string | null;
  progress: number;
  totalPlayers: number;
}) {
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
          {phase === "preparing" &&
            `Building data for ${totalPlayers} player(s)...`}
          {phase === "importing" && "Processing player records..."}
          {phase === "complete" && "All players have been processed."}
          {phase === "failed" && (error || "An unexpected error occurred.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress className="h-2" value={progress} />
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
  const hasStarted = useRef(false);

  const batchImport = useMutation(
    api.models.playerImport.batchImportPlayersWithIdentity
  );

  const runImport = useCallback(async () => {
    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;

    try {
      setPhase("preparing");
      setProgress(10);

      // Build player array from selected rows
      const players = [...selectedRows].map((idx) => {
        const row = parsedData.rows[idx];
        return buildPlayerPayload(row, confirmedMappings);
      });

      setProgress(30);
      setPhase("importing");

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
    } catch (err) {
      setPhase("failed");
      setError(err instanceof Error ? err.message : "Import failed");
    }
  }, [
    selectedRows,
    parsedData.rows,
    confirmedMappings,
    batchImport,
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
      <PhaseIndicator
        error={error}
        phase={phase}
        progress={progress}
        totalPlayers={selectedRows.size}
      />

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
