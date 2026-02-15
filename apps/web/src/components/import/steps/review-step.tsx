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
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  PlayCircle,
  Search,
  Shield,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { useMembershipContext } from "@/providers/membership-provider";

// ============================================================
// Simulation Error Boundary
// ============================================================

class SimulationErrorBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardContent className="py-8 text-center">
            <XCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
            <p className="font-medium">Simulation Failed</p>
            <p className="mt-1 text-muted-foreground text-sm">
              An error occurred while running the simulation. Please try again.
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onRetry();
              }}
              variant="outline"
            >
              Retry Simulation
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// Types
// ============================================================

export type SignalBreakdown = {
  signal: string;
  matched: boolean;
  weight: number; // Percentage (0-100)
  contribution: number; // Actual score contributed (0-weight)
  explanation: string;
};

export type DuplicateInfo = {
  rowNumber: number;
  existingPlayerId: Id<"playerIdentities">;
  resolution: "skip" | "merge" | "replace";
  // Phase 3.1: Confidence scoring for guardian matches
  guardianConfidence?: {
    score: number; // 0-100 confidence score
    level: "high" | "medium" | "low"; // Confidence level
    matchReasons: string[]; // Reasons for the match (email, phone, address, etc.)
    signalBreakdown?: SignalBreakdown[]; // Phase 3.1.003: Detailed signal breakdown
  };
  // Phase 3.1.004: Admin override tracking
  adminOverride?: {
    action: "force_link" | "reject_link";
    reason?: string;
    overriddenBy: string; // User ID
    timestamp: number;
  };
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
  cachedSimulationResult:
    | import("@/components/import/simulation-results").SimulationResult
    | null;
  cachedSimulationDataHash: string | null;
  onSimulationComplete: (
    result: import("@/components/import/simulation-results").SimulationResult,
    dataHash: string
  ) => void;
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
// Player payload builder (for duplicate detection query)
// ============================================================

function buildDuplicateDetectionPayload(
  row: Record<string, string>,
  rowIndex: number,
  mappings: Record<string, string>
) {
  const get = (field: string) => getMappedValue(row, field, mappings);

  return {
    rowIndex,
    firstName: get("firstName"),
    lastName: get("lastName"),
    dateOfBirth: get("dateOfBirth"),
    parentEmail: get("parentEmail") || undefined,
    parentPhone: get("parentPhone") || undefined,
    parentFirstName: get("parentFirstName") || undefined,
    parentLastName: get("parentLastName") || undefined,
    parentAddress: get("parentAddress") || undefined,
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
  parsedData,
  confirmedMappings,
}: {
  errors: ReviewValidationError[];
  searchQuery: string;
  parsedData: ParseResult;
  confirmedMappings: Record<string, string>;
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
            <th className="px-3 py-2">Player Name</th>
            <th className="px-3 py-2">Field</th>
            <th className="px-3 py-2">Error</th>
            <th className="px-3 py-2">Value</th>
            <th className="px-3 py-2">Suggested Fix</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((err) => {
            const row = parsedData.rows[err.rowNumber];
            const firstName = row
              ? getMappedValue(row, "firstName", confirmedMappings)
              : "";
            const lastName = row
              ? getMappedValue(row, "lastName", confirmedMappings)
              : "";
            const playerName =
              [firstName, lastName].filter(Boolean).join(" ") || "—";

            return (
              <tr
                className="border-b last:border-0"
                key={`${String(err.rowNumber)}-${err.field}`}
              >
                <td className="px-3 py-2 text-muted-foreground">
                  {err.rowNumber + 1}
                </td>
                <td className="px-3 py-2 font-medium">{playerName}</td>
                <td className="px-3 py-2 font-medium">{err.field}</td>
                <td className="px-3 py-2 text-red-600">{err.error}</td>
                <td className="max-w-[100px] truncate px-3 py-2">
                  {err.value ?? "—"}
                </td>
                <td className="px-3 py-2 text-green-600">
                  {err.suggestedFix ?? "—"}
                </td>
              </tr>
            );
          })}
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

// Helper: Get confidence badge properties based on score
function getConfidenceBadgeProps(score: number) {
  if (score >= 60) {
    return {
      label: "High Confidence",
      icon: Check,
      className:
        "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
      progressClassName: "bg-green-100 dark:bg-green-950",
      progressBarColor: "bg-green-600",
    };
  }
  if (score >= 40) {
    return {
      label: "Review Required",
      icon: AlertCircle,
      className:
        "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
      progressClassName: "bg-yellow-100 dark:bg-yellow-950",
      progressBarColor: "bg-yellow-600",
    };
  }
  return {
    label: "Low Confidence",
    icon: X,
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
    progressClassName: "bg-red-100 dark:bg-red-950",
    progressBarColor: "bg-red-600",
  };
}

function DuplicateCard({
  duplicate,
  row,
  mappings,
  onResolutionChange,
  organizationId,
}: {
  duplicate: DuplicateInfo;
  row: Record<string, string>;
  mappings: Record<string, string>;
  onResolutionChange: (resolution: DuplicateInfo["resolution"]) => void;
  organizationId: string;
}) {
  const firstName = getMappedValue(row, "firstName", mappings);
  const lastName = getMappedValue(row, "lastName", mappings);
  const dob = getMappedValue(row, "dateOfBirth", mappings);

  // Get confidence data if available (Phase 3.1)
  const confidence = duplicate.guardianConfidence;
  const badgeProps = confidence
    ? getConfidenceBadgeProps(confidence.score)
    : null;
  const ConfidenceIcon = badgeProps?.icon;

  // Phase 3.1.003: Collapsible state for match details
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Phase 3.1.004: Admin override functionality
  const { getMembershipForOrg } = useMembershipContext();
  const membership = getMembershipForOrg(organizationId);
  const isAdminOrOwner =
    membership?.betterAuthRole === "admin" ||
    membership?.betterAuthRole === "owner";

  // Check if confidence score qualifies for override buttons
  const canForceLink = confidence && confidence.score < 40; // Low confidence
  const canRejectLink = confidence && confidence.score >= 60; // High confidence
  const showOverrideButtons = isAdminOrOwner && (canForceLink || canRejectLink);

  return (
    <div className="rounded-lg border p-3">
      {/* Phase 3.1.004: Admin Override Badge */}
      {duplicate.adminOverride && (
        <div className="mb-2">
          <Badge className="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-400">
            <Shield className="h-3 w-3" />
            Admin Override:{" "}
            {duplicate.adminOverride.action === "force_link"
              ? "Force Linked"
              : "Rejected"}
          </Badge>
          {duplicate.adminOverride.reason && (
            <p className="mt-1 text-muted-foreground text-xs">
              Reason: {duplicate.adminOverride.reason}
            </p>
          )}
        </div>
      )}

      {/* Phase 3.1: Confidence Badge at top if guardian matching used */}
      {confidence && badgeProps && ConfidenceIcon && (
        <div className="mb-2 flex items-center gap-2">
          <Badge className={badgeProps.className}>
            <ConfidenceIcon className="h-3 w-3" />
            {badgeProps.label}
          </Badge>
          <span className="text-muted-foreground text-xs">
            {confidence.score}%
          </span>
        </div>
      )}

      {/* Phase 3.1: Confidence Progress Bar */}
      {confidence && badgeProps && (
        <div
          className={`mb-3 ${badgeProps.progressClassName} rounded-full p-0.5`}
        >
          <div
            className={`h-2 rounded-full transition-all duration-300 ${badgeProps.progressBarColor}`}
            style={{ width: `${confidence.score}%` }}
          />
        </div>
      )}

      {/* Phase 3.1.003: Expandable Match Details */}
      {confidence?.signalBreakdown && (
        <Collapsible
          className="mb-3"
          onOpenChange={setDetailsOpen}
          open={detailsOpen}
        >
          <CollapsibleTrigger asChild>
            <Button
              className="h-auto w-full justify-between p-2 text-xs"
              size="sm"
              variant="ghost"
            >
              <span>Match Details</span>
              <ChevronDown
                className={`h-3 w-3 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 px-2 pt-2">
            {confidence.signalBreakdown.map((signal) => (
              <div
                className="flex items-center justify-between text-xs"
                key={signal.signal}
              >
                <div className="flex items-center gap-2">
                  {signal.matched ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <X className="h-3 w-3 text-red-600" />
                  )}
                  <span className="font-medium">{signal.signal}:</span>
                  <span className="text-muted-foreground">
                    {signal.weight}%
                  </span>
                </div>
                <span
                  className={
                    signal.matched ? "text-green-600" : "text-muted-foreground"
                  }
                >
                  {signal.contribution} pts
                </span>
              </div>
            ))}
            <div className="mt-2 border-t pt-2 text-muted-foreground text-xs">
              Total Score: {confidence.score} / 100
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

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
      <div className="mt-2 flex flex-wrap gap-1">
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

        {/* Phase 3.1.004: Admin Override Buttons */}
        {showOverrideButtons && (
          <>
            {canForceLink && (
              <Button
                className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
                size="sm"
                variant="outline"
              >
                <Shield className="h-3 w-3" />
                Force Link
              </Button>
            )}
            {canRejectLink && (
              <Button
                className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
                size="sm"
                variant="outline"
              >
                <Shield className="h-3 w-3" />
                Reject Link
              </Button>
            )}
          </>
        )}
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
// Review Form (validation errors, duplicates, teams, nav)
// ============================================================

function ReviewForm({
  validationErrors,
  validCount,
  errorRowCount,
  hasErrors,
  duplicates,
  onDuplicateResolution,
  parsedData,
  confirmedMappings,
  selectedRows,
  goBack,
  onRunSimulation,
  dataChanged,
  organizationId,
}: {
  validationErrors: ReviewValidationError[];
  validCount: number;
  errorRowCount: number;
  hasErrors: boolean;
  duplicates: DuplicateInfo[];
  onDuplicateResolution: (
    rowNumber: number,
    resolution: DuplicateInfo["resolution"]
  ) => void;
  parsedData: ParseResult;
  confirmedMappings: Record<string, string>;
  selectedRows: Set<number>;
  goBack: () => void;
  onRunSimulation: () => void;
  dataChanged: boolean;
  organizationId: string;
}) {
  const [errorSearch, setErrorSearch] = useState("");
  const hasDuplicates = duplicates.length > 0;

  return (
    <div className="space-y-4">
      {dataChanged && <DataChangedBanner onRerun={onRunSimulation} />}

      <SummaryCards
        duplicateCount={duplicates.length}
        errorCount={errorRowCount}
        selectedCount={selectedRows.size}
        validCount={validCount}
      />

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
          <ErrorTable
            confirmedMappings={confirmedMappings}
            errors={validationErrors}
            parsedData={parsedData}
            searchQuery={errorSearch}
          />
        </CardContent>
      </Card>

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
                      onDuplicateResolution(dup.rowNumber, res)
                    }
                    organizationId={organizationId}
                    row={row}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <TeamCreationPreview
        confirmedMappings={confirmedMappings}
        parsedData={parsedData}
        selectedRows={selectedRows}
      />

      <ReviewNavigation
        errorCount={validationErrors.length}
        errorRowCount={errorRowCount}
        hasErrors={hasErrors}
        onBack={goBack}
        onRunSimulation={onRunSimulation}
      />
    </div>
  );
}

// ============================================================
// Data Changed Banner
// ============================================================

function DataChangedBanner({ onRerun }: { onRerun: () => void }) {
  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
      <CardContent className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm">
            Data has changed since the last simulation. Results may be outdated.
          </span>
        </div>
        <Button onClick={onRerun} size="sm" variant="outline">
          <PlayCircle className="mr-1 h-3 w-3" />
          Re-run
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Navigation Actions
// ============================================================

function ReviewNavigation({
  hasErrors,
  errorCount,
  errorRowCount,
  onBack,
  onRunSimulation,
}: {
  hasErrors: boolean;
  errorCount: number;
  errorRowCount: number;
  onBack: () => void;
  onRunSimulation: () => void;
}) {
  return (
    <div className="flex justify-between pt-2">
      <Button onClick={onBack} variant="outline">
        Back
      </Button>
      <div className="flex gap-2">
        {hasErrors ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                Proceed with Errors ({errorCount})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Proceed with validation errors?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  There are {errorCount} validation error(s) across{" "}
                  {errorRowCount} row(s). Rows with errors may fail during
                  import or have incomplete data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Go Back</AlertDialogCancel>
                <AlertDialogAction onClick={onRunSimulation}>
                  Continue to Simulation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button onClick={onRunSimulation}>
            <PlayCircle className="mr-1 h-4 w-4" />
            Run Simulation
          </Button>
        )}
      </div>
    </div>
  );
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
  cachedSimulationResult,
  cachedSimulationDataHash,
  onSimulationComplete,
}: ReviewStepProps) {
  const [hasValidated, setHasValidated] = useState(false);
  const [simulationRequested, setSimulationRequested] = useState(false);

  // Compute data fingerprint to detect changes since last simulation
  const currentDataHash = useMemo(() => {
    const indices = [...selectedRows].sort((a, b) => a - b).join(",");
    const mappings = Object.entries(confirmedMappings)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, vv]) => `${k}:${vv}`)
      .join(",");
    return `${indices}|${mappings}|${sportCode}|${String(benchmarkSettings.applyBenchmarks)}|${benchmarkSettings.strategy}`;
  }, [
    selectedRows,
    confirmedMappings,
    sportCode,
    benchmarkSettings.applyBenchmarks,
    benchmarkSettings.strategy,
  ]);

  // Use cached results if data hasn't changed
  const hasCachedResults =
    cachedSimulationResult !== null &&
    cachedSimulationDataHash === currentDataHash;

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

  // Build player payloads for duplicate detection (Phase 3.1)
  const duplicateDetectionPlayers = useMemo(
    () =>
      [...selectedRows].map((idx) => {
        const row = parsedData.rows[idx];
        return buildDuplicateDetectionPayload(row, idx, confirmedMappings);
      }),
    [selectedRows, parsedData.rows, confirmedMappings]
  );

  // Query args for duplicate detection
  const duplicateDetectionArgs = useMemo(() => {
    if (duplicateDetectionPlayers.length === 0) {
      return "skip" as const;
    }
    return {
      organizationId,
      players: duplicateDetectionPlayers,
    };
  }, [duplicateDetectionPlayers, organizationId]);

  // Detect duplicate guardians (Phase 3.1: Confidence Indicators)
  const duplicateDetectionResult = useQuery(
    api.models.importSessions.detectDuplicateGuardians,
    duplicateDetectionArgs
  );

  // Update duplicates when detection results arrive
  useEffect(() => {
    if (!duplicateDetectionResult) {
      return;
    }

    const detectedDuplicates: DuplicateInfo[] = duplicateDetectionResult.map(
      (dup) => ({
        rowNumber: dup.rowNumber,
        existingPlayerId:
          dup.existingGuardianId as unknown as Id<"playerIdentities">,
        resolution: "skip",
        guardianConfidence: {
          score: dup.confidence.score,
          level: dup.confidence.level,
          matchReasons: dup.confidence.matchReasons,
          signalBreakdown: dup.confidence.signalBreakdown,
        },
      })
    );

    onDuplicatesChange(detectedDuplicates);
  }, [duplicateDetectionResult, onDuplicatesChange]);

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

  // Cache simulation result in wizard state when it arrives
  useEffect(() => {
    if (simulationResult && simulationRequested) {
      onSimulationComplete(simulationResult, currentDataHash);
    }
  }, [
    simulationResult,
    simulationRequested,
    onSimulationComplete,
    currentDataHash,
  ]);

  const isSimulating = simulationRequested && simulationResult === undefined;

  const handleRunSimulation = useCallback(() => {
    setSimulationRequested(true);
  }, []);

  const handleRerunSimulation = useCallback(() => {
    setSimulationRequested(false);
    requestAnimationFrame(() => setSimulationRequested(true));
  }, []);

  // Count unique rows with errors
  const errorRowCount = useMemo(() => {
    const rowsWithErrors = new Set(validationErrors.map((e) => e.rowNumber));
    return rowsWithErrors.size;
  }, [validationErrors]);

  const validCount = selectedRows.size - errorRowCount;
  const hasErrors = validationErrors.length > 0;

  const handleDuplicateResolution = (
    rowNumber: number,
    resolution: DuplicateInfo["resolution"]
  ) => {
    const updated = duplicates.map((d) =>
      d.rowNumber === rowNumber ? { ...d, resolution } : d
    );
    onDuplicatesChange(updated);
  };

  // Determine which simulation result to display
  const activeSimResult =
    simulationResult ?? (hasCachedResults ? cachedSimulationResult : null);
  const dataChanged = cachedSimulationResult !== null && !hasCachedResults;
  const simBackHandler = simulationRequested
    ? () => setSimulationRequested(false)
    : goBack;
  const displayResult = activeSimResult ?? cachedSimulationResult;

  // Show simulation view: either actively requested or cached results available
  if (simulationRequested && (activeSimResult || isSimulating)) {
    return (
      <SimulationErrorBoundary onRetry={handleRerunSimulation}>
        <SimulationResults
          isLoading={isSimulating}
          onBack={simBackHandler}
          onProceed={goNext}
          onRerun={handleRerunSimulation}
          simulationResult={displayResult}
          totalRows={selectedRows.size}
        />
      </SimulationErrorBoundary>
    );
  }

  if (hasCachedResults && cachedSimulationResult) {
    return (
      <SimulationErrorBoundary onRetry={handleRerunSimulation}>
        <SimulationResults
          isLoading={false}
          onBack={goBack}
          onProceed={goNext}
          onRerun={handleRerunSimulation}
          simulationResult={cachedSimulationResult}
          totalRows={selectedRows.size}
        />
      </SimulationErrorBoundary>
    );
  }

  // Empty state: no rows selected
  if (selectedRows.size === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-lg">No Players Selected</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Go back and select at least one player to review and simulate the
              import.
            </p>
            <Button className="mt-4" onClick={goBack} variant="outline">
              Back to Selection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ReviewForm
      confirmedMappings={confirmedMappings}
      dataChanged={dataChanged}
      duplicates={duplicates}
      errorRowCount={errorRowCount}
      goBack={goBack}
      hasErrors={hasErrors}
      onDuplicateResolution={handleDuplicateResolution}
      onRunSimulation={handleRunSimulation}
      organizationId={organizationId}
      parsedData={parsedData}
      selectedRows={selectedRows}
      validationErrors={validationErrors}
      validCount={validCount}
    />
  );
}
