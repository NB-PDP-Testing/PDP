"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { ParseResult } from "@pdp/backend/convex/lib/import/parser";
import {
  type BatchValidationResult,
  validateBatch,
} from "@pdp/backend/convex/lib/import/validator";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  PlayCircle,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BenchmarkSettings } from "@/components/import/import-wizard";
import SimulationResults from "@/components/import/simulation-results";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// ============================================================
// Types
// ============================================================

export type DuplicateInfo = {
  rowNumber: number;
  existingPlayerId: Id<"playerIdentities">;
  resolution: "skip" | "merge" | "replace";
};

export type ReviewValidationError = {
  rowNumber: number;
  field: string;
  error: string;
  value?: string;
  suggestedFix?: string;
};

type ReviewStepProps = {
  parsedData: ParseResult;
  confirmedMappings: Record<string, string>;
  selectedRows: Set<number>;
  validationErrors: ReviewValidationError[];
  onValidationErrorsChange: (errors: ReviewValidationError[]) => void;
  duplicates: DuplicateInfo[];
  onDuplicatesChange: (duplicates: DuplicateInfo[]) => void;
  goBack: () => void;
  goNext: () => void;
  organizationId: string;
  sportCode: string;
  benchmarkSettings: BenchmarkSettings;
};

// ============================================================
// Helper: get mapped value from a row
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

// ============================================================
// Player payload builder (for simulation query)
// ============================================================

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
// Sub-components
// ============================================================

function SummaryCards({
  validCount,
  errorCount,
  duplicateCount,
  selectedCount,
}: {
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  selectedCount: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card>
        <CardContent className="p-3 text-center">
          <Users className="mx-auto mb-1 h-5 w-5 text-primary" />
          <p className="font-bold text-lg">{selectedCount}</p>
          <p className="text-muted-foreground text-xs">Selected</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 text-center">
          <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-green-600" />
          <p className="font-bold text-lg">{validCount}</p>
          <p className="text-muted-foreground text-xs">Valid</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 text-center">
          <XCircle className="mx-auto mb-1 h-5 w-5 text-red-600" />
          <p className="font-bold text-lg">{errorCount}</p>
          <p className="text-muted-foreground text-xs">With Errors</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 text-center">
          <AlertTriangle className="mx-auto mb-1 h-5 w-5 text-amber-600" />
          <p className="font-bold text-lg">{duplicateCount}</p>
          <p className="text-muted-foreground text-xs">Duplicates</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorTable({
  errors,
  searchQuery,
}: {
  errors: ReviewValidationError[];
  searchQuery: string;
}) {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) {
      return errors;
    }
    const q = searchQuery.toLowerCase();
    return errors.filter(
      (e) =>
        e.field.toLowerCase().includes(q) ||
        e.error.toLowerCase().includes(q) ||
        (e.value ?? "").toLowerCase().includes(q)
    );
  }, [errors, searchQuery]);

  if (filtered.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground text-sm">
        {errors.length === 0
          ? "No validation errors found."
          : "No errors match your search."}
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background">
          <tr className="border-b text-left text-muted-foreground text-xs">
            <th className="px-3 py-2">Row</th>
            <th className="px-3 py-2">Field</th>
            <th className="px-3 py-2">Error</th>
            <th className="px-3 py-2">Value</th>
            <th className="px-3 py-2">Suggested Fix</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((err) => (
            <tr
              className="border-b last:border-0"
              key={`${String(err.rowNumber)}-${err.field}`}
            >
              <td className="px-3 py-2 text-muted-foreground">
                {err.rowNumber + 1}
              </td>
              <td className="px-3 py-2 font-medium">{err.field}</td>
              <td className="px-3 py-2 text-red-600">{err.error}</td>
              <td className="max-w-[100px] truncate px-3 py-2">
                {err.value ?? "—"}
              </td>
              <td className="px-3 py-2 text-green-600">
                {err.suggestedFix ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getResolutionVariant(
  resolution: DuplicateInfo["resolution"]
): "secondary" | "outline" | "default" {
  if (resolution === "skip") {
    return "secondary";
  }
  if (resolution === "merge") {
    return "outline";
  }
  return "default";
}

function DuplicateCard({
  duplicate,
  row,
  mappings,
  onResolutionChange,
}: {
  duplicate: DuplicateInfo;
  row: Record<string, string>;
  mappings: Record<string, string>;
  onResolutionChange: (resolution: DuplicateInfo["resolution"]) => void;
}) {
  const firstName = getMappedValue(row, "firstName", mappings);
  const lastName = getMappedValue(row, "lastName", mappings);
  const dob = getMappedValue(row, "dateOfBirth", mappings);

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">
            {firstName} {lastName}
          </p>
          <p className="text-muted-foreground text-xs">
            Row {duplicate.rowNumber + 1} &middot; DOB: {dob || "N/A"}
          </p>
        </div>
        <Badge variant={getResolutionVariant(duplicate.resolution)}>
          {duplicate.resolution}
        </Badge>
      </div>
      <div className="mt-2 flex gap-1">
        <Button
          onClick={() => onResolutionChange("skip")}
          size="sm"
          variant={duplicate.resolution === "skip" ? "destructive" : "outline"}
        >
          Skip
        </Button>
        <Button
          onClick={() => onResolutionChange("merge")}
          size="sm"
          variant={duplicate.resolution === "merge" ? "default" : "outline"}
        >
          Merge
        </Button>
        <Button
          onClick={() => onResolutionChange("replace")}
          size="sm"
          variant={duplicate.resolution === "replace" ? "default" : "outline"}
        >
          Replace
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Team Creation Preview
// ============================================================

function TeamCreationPreview({
  parsedData,
  confirmedMappings,
  selectedRows,
}: {
  parsedData: ParseResult;
  confirmedMappings: Record<string, string>;
  selectedRows: Set<number>;
}) {
  const teams = useMemo(() => {
    const teamSet = new Set<string>();
    for (const idx of selectedRows) {
      const row = parsedData.rows[idx];
      if (row) {
        const team = getMappedValue(row, "team", confirmedMappings);
        if (team.trim()) {
          teamSet.add(team.trim());
        }
      }
    }
    return [...teamSet].sort();
  }, [parsedData.rows, confirmedMappings, selectedRows]);

  if (teams.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Teams Referenced</CardTitle>
        <CardDescription>
          These team names appear in the import data. New teams will be created
          if they don&apos;t already exist.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {teams.map((team) => (
            <Badge key={team} variant="outline">
              {team}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Validation logic (extracted for complexity)
// ============================================================

function buildMappedRows(
  parsedData: ParseResult,
  selectedRows: Set<number>,
  confirmedMappings: Record<string, string>
): Record<string, string>[] {
  const mappedRows: Record<string, string>[] = [];
  for (const idx of selectedRows) {
    const row = parsedData.rows[idx];
    if (!row) {
      continue;
    }
    const mapped: Record<string, string> = {};
    for (const [sourceCol, targetField] of Object.entries(confirmedMappings)) {
      if (targetField && row[sourceCol] !== undefined) {
        mapped[targetField] = row[sourceCol];
      }
    }
    mappedRows.push(mapped);
  }
  return mappedRows;
}

function extractErrors(
  result: BatchValidationResult,
  selectedIndices: number[]
): ReviewValidationError[] {
  const errors: ReviewValidationError[] = [];
  for (const { rowIndex, result: rowResult } of result.results) {
    if (!rowResult.valid) {
      for (const err of rowResult.errors) {
        errors.push({
          rowNumber: selectedIndices[rowIndex] ?? rowIndex,
          field: err.field,
          error: err.error,
          value: err.value,
          suggestedFix: err.suggestedFix,
        });
      }
    }
  }
  return errors;
}

// ============================================================
// Main ReviewStep
// ============================================================

export default function ReviewStep({
  parsedData,
  confirmedMappings,
  selectedRows,
  validationErrors,
  onValidationErrorsChange,
  duplicates,
  onDuplicatesChange,
  goBack,
  goNext,
  organizationId,
  sportCode,
  benchmarkSettings,
}: ReviewStepProps) {
  const [errorSearch, setErrorSearch] = useState("");
  const [hasValidated, setHasValidated] = useState(false);
  const [simulationRequested, setSimulationRequested] = useState(false);

  // Run validation on mount
  useEffect(() => {
    if (hasValidated) {
      return;
    }

    const mappedRows = buildMappedRows(
      parsedData,
      selectedRows,
      confirmedMappings
    );
    const result = validateBatch(mappedRows);
    const errors = extractErrors(result, [...selectedRows]);

    onValidationErrorsChange(errors);
    setHasValidated(true);
  }, [
    hasValidated,
    parsedData,
    selectedRows,
    confirmedMappings,
    onValidationErrorsChange,
  ]);

  // Build player payloads for simulation
  const simulationPlayers = useMemo(() => {
    if (!simulationRequested) {
      return null;
    }
    return [...selectedRows].map((idx) => {
      const row = parsedData.rows[idx];
      return buildPlayerPayload(row, confirmedMappings);
    });
  }, [simulationRequested, selectedRows, parsedData.rows, confirmedMappings]);

  // Query args — "skip" until simulation is requested
  const simulationArgs = useMemo(() => {
    if (!simulationPlayers) {
      return "skip" as const;
    }
    return {
      organizationId,
      sportCode: sportCode || undefined,
      players: simulationPlayers,
      applyBenchmarks: benchmarkSettings.applyBenchmarks,
      benchmarkStrategy: benchmarkSettings.strategy,
    };
  }, [
    simulationPlayers,
    organizationId,
    sportCode,
    benchmarkSettings.applyBenchmarks,
    benchmarkSettings.strategy,
  ]);

  const simulationResult = useQuery(
    api.models.importSimulation.simulate,
    simulationArgs
  );

  const isSimulating = simulationRequested && simulationResult === undefined;

  const handleRunSimulation = useCallback(() => {
    setSimulationRequested(true);
  }, []);

  const handleRerunSimulation = useCallback(() => {
    setSimulationRequested(false);
    // Reset and re-trigger on next render
    requestAnimationFrame(() => setSimulationRequested(true));
  }, []);

  // Count unique rows with errors
  const errorRowCount = useMemo(() => {
    const rowsWithErrors = new Set(validationErrors.map((e) => e.rowNumber));
    return rowsWithErrors.size;
  }, [validationErrors]);

  const validCount = selectedRows.size - errorRowCount;
  const hasErrors = validationErrors.length > 0;
  const hasDuplicates = duplicates.length > 0;

  const handleDuplicateResolution = (
    rowNumber: number,
    resolution: DuplicateInfo["resolution"]
  ) => {
    const updated = duplicates.map((d) =>
      d.rowNumber === rowNumber ? { ...d, resolution } : d
    );
    onDuplicatesChange(updated);
  };

  // If simulation has been run and has results, show SimulationResults
  if (simulationRequested && (simulationResult || isSimulating)) {
    return (
      <SimulationResults
        isLoading={isSimulating}
        onBack={() => setSimulationRequested(false)}
        onProceed={goNext}
        onRerun={handleRerunSimulation}
        simulationResult={simulationResult ?? null}
        totalRows={selectedRows.size}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <SummaryCards
        duplicateCount={duplicates.length}
        errorCount={errorRowCount}
        selectedCount={selectedRows.size}
        validCount={validCount}
      />

      {/* Validation Errors */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5" />
              Validation Errors
              {hasErrors && (
                <Badge variant="destructive">{validationErrors.length}</Badge>
              )}
            </CardTitle>
          </div>
          {hasErrors && (
            <CardDescription>
              These rows have validation issues. You can still proceed, but
              affected rows may fail during import.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {hasErrors && (
            <div className="relative mb-3">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setErrorSearch(e.target.value)}
                placeholder="Search errors..."
                value={errorSearch}
              />
            </div>
          )}
          <ErrorTable errors={validationErrors} searchQuery={errorSearch} />
        </CardContent>
      </Card>

      {/* Duplicates */}
      {hasDuplicates && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Duplicate Players
              <Badge variant="secondary">{duplicates.length}</Badge>
            </CardTitle>
            <CardDescription>
              These players may already exist in the system. Choose how to
              handle each one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-72 space-y-2 overflow-auto">
              {duplicates.map((dup) => {
                const row = parsedData.rows[dup.rowNumber];
                if (!row) {
                  return null;
                }
                return (
                  <DuplicateCard
                    duplicate={dup}
                    key={dup.rowNumber}
                    mappings={confirmedMappings}
                    onResolutionChange={(res) =>
                      handleDuplicateResolution(dup.rowNumber, res)
                    }
                    row={row}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Creation Preview */}
      <TeamCreationPreview
        confirmedMappings={confirmedMappings}
        parsedData={parsedData}
        selectedRows={selectedRows}
      />

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button onClick={goBack} variant="outline">
          Back
        </Button>
        <div className="flex gap-2">
          {hasErrors ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  Proceed with Errors ({validationErrors.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Proceed with validation errors?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    There are {validationErrors.length} validation error(s)
                    across {errorRowCount} row(s). Rows with errors may fail
                    during import or have incomplete data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Go Back</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRunSimulation}>
                    Continue to Simulation
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              disabled={selectedRows.size === 0}
              onClick={handleRunSimulation}
            >
              <PlayCircle className="mr-1 h-4 w-4" />
              Run Simulation
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
