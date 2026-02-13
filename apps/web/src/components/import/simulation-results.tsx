"use client";

import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  ChevronLeft,
  LinkIcon,
  RefreshCw,
  Shield,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================
// Types
// ============================================================

export type SimulationResult = {
  summary: {
    playersToCreate: number;
    playersToUpdate: number;
    guardiansToCreate: number;
    guardiansToLink: number;
    enrollmentsToCreate: number;
    passportsToCreate: number;
    benchmarksToApply: number;
  };
  playerPreviews: Array<{
    name: string;
    dateOfBirth: string;
    age: number;
    ageGroup: string;
    gender: string;
    action: "create" | "update";
    guardianName?: string;
    guardianAction?: "create" | "link";
  }>;
  warnings: string[];
  errors: string[];
};

type SimulationResultsProps = {
  simulationResult: SimulationResult | null;
  onProceed: () => void;
  onBack: () => void;
  onRerun?: () => void;
  isLoading: boolean;
  totalRows: number;
};

// ============================================================
// Loading Skeleton
// ============================================================

function SimulationSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={`skeleton-${String(i)}`}>
            <CardContent className="p-4 text-center">
              <Skeleton className="mx-auto mb-2 h-5 w-5" />
              <Skeleton className="mx-auto mb-1 h-8 w-12" />
              <Skeleton className="mx-auto h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              className="h-16 w-full"
              key={`preview-skeleton-${String(i)}`}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Stat Card
// ============================================================

function StatCard({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  variant: "green" | "blue" | "purple" | "amber";
}) {
  const variantStyles = {
    green: "text-green-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
    amber: "text-amber-600",
  };

  return (
    <Card>
      <CardContent className="p-4 text-center">
        <Icon className={`mx-auto mb-1 h-5 w-5 ${variantStyles[variant]}`} />
        <p className="font-bold text-2xl">{value}</p>
        <p className="text-muted-foreground text-xs">{label}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Player Preview Card
// ============================================================

function PlayerPreviewCard({
  preview,
}: {
  preview: SimulationResult["playerPreviews"][number];
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-sm">{preview.name}</p>
          <Badge
            variant={preview.action === "create" ? "default" : "secondary"}
          >
            {preview.action === "create" ? "New" : "Update"}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-xs">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {preview.dateOfBirth} (age {preview.age})
          </span>
          <span>{preview.ageGroup}</span>
          <span className="capitalize">{preview.gender}</span>
        </div>
        {preview.guardianName && (
          <p className="mt-1 text-muted-foreground text-xs">
            Guardian: {preview.guardianName}
            {preview.guardianAction && (
              <Badge className="ml-1" variant="outline">
                {preview.guardianAction === "create" ? "New" : "Link"}
              </Badge>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function SimulationResults({
  simulationResult,
  onProceed,
  onBack,
  onRerun,
  isLoading,
  totalRows,
}: SimulationResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              Running Simulation...
            </CardTitle>
            <CardDescription>
              Analyzing {totalRows} player record{totalRows !== 1 ? "s" : ""} to
              preview what will happen during import.
              {totalRows > 50 && (
                <span className="mt-1 block text-muted-foreground text-xs">
                  Larger imports may take a few seconds...
                </span>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
        <SimulationSkeleton />
      </div>
    );
  }

  if (!simulationResult) {
    return null;
  }

  const { summary, playerPreviews, warnings, errors } = simulationResult;
  const hasErrors = errors.length > 0;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Simulation Results</CardTitle>
          <CardDescription>
            Preview of what will happen when you run the import. No changes have
            been made yet.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatCard
          icon={UserPlus}
          label="Players to Create"
          value={summary.playersToCreate}
          variant="green"
        />
        <StatCard
          icon={Users}
          label="Players to Update"
          value={summary.playersToUpdate}
          variant="blue"
        />
        <StatCard
          icon={UserPlus}
          label="Guardians to Create"
          value={summary.guardiansToCreate}
          variant="green"
        />
        <StatCard
          icon={LinkIcon}
          label="Guardians to Link"
          value={summary.guardiansToLink}
          variant="purple"
        />
        <StatCard
          icon={Users}
          label="Enrollments"
          value={summary.enrollmentsToCreate}
          variant="green"
        />
        <StatCard
          icon={Shield}
          label="Passports"
          value={summary.passportsToCreate}
          variant="green"
        />
        <StatCard
          icon={Shield}
          label="Benchmarks"
          value={summary.benchmarksToApply}
          variant="amber"
        />
      </div>

      {/* Errors */}
      {hasErrors && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>
            {errors.length} Error{errors.length !== 1 ? "s" : ""} Found
          </AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Fix these errors before importing. Rows with errors will be
              skipped.
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {warnings.length} Warning{warnings.length !== 1 ? "s" : ""}
          </AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Player Previews */}
      {playerPreviews.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Sample Player Previews</CardTitle>
            <CardDescription>
              Showing {playerPreviews.length} of{" "}
              {summary.playersToCreate + summary.playersToUpdate} total players
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {playerPreviews.map((preview) => (
                <PlayerPreviewCard
                  key={`${preview.name}-${preview.dateOfBirth}`}
                  preview={preview}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button onClick={onBack} variant="outline">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          {onRerun && (
            <Button onClick={onRerun} variant="outline">
              <RefreshCw className="mr-1 h-4 w-4" />
              Re-run Simulation
            </Button>
          )}
          {hasErrors ? (
            <Button disabled variant="destructive">
              Fix errors before importing
            </Button>
          ) : (
            <Button onClick={onProceed}>
              Run Live Import
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
