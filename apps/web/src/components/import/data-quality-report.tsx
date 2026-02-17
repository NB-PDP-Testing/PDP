"use client";

import type {
  Issue,
  QualityReport,
} from "@pdp/backend/convex/lib/import/dataQuality";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  Sparkles,
  Wrench,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

type DataQualityReportProps = {
  qualityReport: QualityReport;
  onFixIssue: (rowIndex: number, field: string, newValue: string) => void;
  onContinue: () => void;
  onBack: () => void;
  parsedData: { rows: Record<string, string>[] };
  confirmedMappings: Record<string, string>;
};

// ============================================================
// Grade Colors & Labels
// ============================================================

function getGradeColor(grade: QualityReport["grade"]): string {
  switch (grade) {
    case "excellent":
      return "text-emerald-600";
    case "good":
      return "text-green-600";
    case "fair":
      return "text-yellow-600";
    case "poor":
      return "text-orange-600";
    case "critical":
      return "text-red-600";
    default:
      return "text-muted-foreground";
  }
}

function getGradeBadgeClass(grade: QualityReport["grade"]): string {
  switch (grade) {
    case "excellent":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "good":
      return "bg-green-100 text-green-800 border-green-200";
    case "fair":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "poor":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getScoreBarClass(score: number): string {
  if (score >= 90) {
    return "[&>[data-slot=progress-indicator]]:bg-emerald-500";
  }
  if (score >= 75) {
    return "[&>[data-slot=progress-indicator]]:bg-green-500";
  }
  if (score >= 60) {
    return "[&>[data-slot=progress-indicator]]:bg-yellow-500";
  }
  if (score >= 40) {
    return "[&>[data-slot=progress-indicator]]:bg-orange-500";
  }
  return "[&>[data-slot=progress-indicator]]:bg-red-500";
}

function getGradeLabel(grade: QualityReport["grade"]): string {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

// ============================================================
// Score Display
// ============================================================

function OverallScore({ report }: { report: QualityReport }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 pt-6 sm:flex-row sm:gap-6">
        <div className="flex flex-col items-center">
          <span
            className={cn("font-bold text-5xl", getGradeColor(report.grade))}
          >
            {report.overallScore}
          </span>
          <span className="text-muted-foreground text-sm">out of 100</span>
        </div>
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Badge
            className={cn("text-sm", getGradeBadgeClass(report.grade))}
            variant="outline"
          >
            {getGradeLabel(report.grade)}
          </Badge>
          <p className="text-center text-muted-foreground text-sm sm:text-left">
            {report.summary.totalRows} rows analyzed &middot;{" "}
            {report.summary.rowsWithIssues} with issues
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Dimension Bars
// ============================================================

function DimensionBars({ report }: { report: QualityReport }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quality Dimensions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.dimensions.map((dim) => (
          <div className="space-y-1" key={dim.name}>
            <div className="flex items-center justify-between">
              <span className="text-sm">{dim.name}</span>
              <span className="font-medium text-sm">{dim.score}/100</span>
            </div>
            <Progress
              className={cn("h-2", getScoreBarClass(dim.score))}
              value={dim.score}
            />
            <span className="text-muted-foreground text-xs">
              Weight: {Math.round(dim.weight * 100)}%
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Issue Row
// ============================================================

function IssueRow({
  issue,
  onFix,
  playerName,
}: {
  issue: Issue;
  onFix: (rowIndex: number, field: string, newValue: string) => void;
  playerName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2 border-b py-2 last:border-b-0">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="text-xs" variant="outline">
            Row {issue.rowIndex + 1}
          </Badge>
          {playerName && (
            <Badge className="text-xs" variant="default">
              {playerName}
            </Badge>
          )}
          <Badge className="text-xs" variant="secondary">
            {issue.field}
          </Badge>
        </div>
        <p className="text-sm">{issue.message}</p>
        {issue.value && (
          <p className="text-muted-foreground text-xs">
            Current:{" "}
            <code className="rounded bg-muted px-1">{issue.value}</code>
          </p>
        )}
        {issue.suggestedFix && (
          <p className="text-emerald-600 text-xs">
            Suggested:{" "}
            <code className="rounded bg-emerald-50 px-1">
              {issue.suggestedFix}
            </code>
          </p>
        )}
      </div>
      {issue.suggestedFix && (
        <Button
          className="shrink-0"
          onClick={() =>
            onFix(issue.rowIndex, issue.field, issue.suggestedFix ?? "")
          }
          size="sm"
          variant="outline"
        >
          <Wrench className="mr-1 h-3 w-3" />
          Fix
        </Button>
      )}
    </div>
  );
}

// ============================================================
// Issue Section
// ============================================================

function IssueSection({
  title,
  issues,
  icon,
  colorClass,
  badgeVariant,
  onFix,
  defaultOpen,
  parsedData,
  confirmedMappings,
}: {
  title: string;
  issues: Issue[];
  icon: React.ReactNode;
  colorClass: string;
  badgeVariant: "destructive" | "default" | "secondary";
  onFix: (rowIndex: number, field: string, newValue: string) => void;
  defaultOpen?: boolean;
  parsedData: { rows: Record<string, string>[] };
  confirmedMappings: Record<string, string>;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);

  // Helper to get mapped value from row
  const getMappedValue = (row: Record<string, string>, targetField: string) => {
    const sourceColumn = Object.entries(confirmedMappings).find(
      ([_, target]) => target === targetField
    )?.[0];
    return sourceColumn ? row[sourceColumn] : "";
  };

  if (issues.length === 0) {
    return null;
  }

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50",
            colorClass
          )}
          type="button"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-sm">{title}</span>
            <Badge className="text-xs" variant={badgeVariant}>
              {issues.length}
            </Badge>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 rounded-lg border px-3">
          {issues.map((issue, idx) => {
            const row = parsedData.rows[issue.rowIndex];
            const firstName = row ? getMappedValue(row, "firstName") : "";
            const lastName = row ? getMappedValue(row, "lastName") : "";
            const playerName = [firstName, lastName].filter(Boolean).join(" ");

            return (
              <IssueRow
                issue={issue}
                key={`${issue.rowIndex}-${issue.field}-${idx}`}
                onFix={onFix}
                playerName={playerName}
              />
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function DataQualityReport({
  qualityReport,
  onFixIssue,
  onContinue,
  onBack,
  parsedData,
  confirmedMappings,
}: DataQualityReportProps) {
  const hasCriticalIssues = qualityReport.summary.criticalCount > 0;
  const canSkip =
    qualityReport.grade === "excellent" || qualityReport.grade === "good";

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <OverallScore report={qualityReport} />

      {/* Dimension Bars */}
      <DimensionBars report={qualityReport} />

      {/* Issues */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Issues Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {qualityReport.summary.criticalCount === 0 &&
          qualityReport.summary.warningCount === 0 &&
          qualityReport.summary.suggestionCount === 0 ? (
            <div className="flex items-center gap-2 py-4 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm">
                No issues found — your data looks great!
              </span>
            </div>
          ) : (
            <>
              <IssueSection
                badgeVariant="destructive"
                colorClass="border-red-200 bg-red-50"
                confirmedMappings={confirmedMappings}
                defaultOpen
                icon={<XCircle className="h-4 w-4 text-red-600" />}
                issues={qualityReport.categorized.critical}
                onFix={onFixIssue}
                parsedData={parsedData}
                title="Critical Issues"
              />
              <IssueSection
                badgeVariant="default"
                colorClass="border-amber-200 bg-amber-50"
                confirmedMappings={confirmedMappings}
                icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
                issues={qualityReport.categorized.warnings}
                onFix={onFixIssue}
                parsedData={parsedData}
                title="Warnings"
              />
              <IssueSection
                badgeVariant="secondary"
                colorClass="border-blue-200 bg-blue-50"
                confirmedMappings={confirmedMappings}
                icon={<Info className="h-4 w-4 text-blue-600" />}
                issues={qualityReport.categorized.suggestions}
                onFix={onFixIssue}
                parsedData={parsedData}
                title="Suggestions"
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Skip message for high quality data */}
      {canSkip && !hasCriticalIssues && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span className="text-emerald-800 text-sm">
            Quality looks great — skip to review?
          </span>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button onClick={onBack} variant="outline">
          Back
        </Button>
        <Button disabled={hasCriticalIssues} onClick={onContinue}>
          {hasCriticalIssues
            ? `Fix ${qualityReport.summary.criticalCount} critical issue${qualityReport.summary.criticalCount > 1 ? "s" : ""} to continue`
            : "Continue"}
        </Button>
      </div>
    </div>
  );
}
