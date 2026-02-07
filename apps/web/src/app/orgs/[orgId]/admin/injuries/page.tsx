"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Download } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ============================================================
// Constants
// ============================================================

type DatePreset = "30d" | "90d" | "season" | "all";
type StatusFilter = "all" | "active" | "recovering" | "cleared" | "healed";

function getDateRange(preset: DatePreset): {
  startDate?: string;
  endDate?: string;
} {
  if (preset === "all") {
    return {};
  }

  const now = new Date();
  const endDate = now.toISOString().split("T")[0];

  if (preset === "30d") {
    const start = new Date(now.getTime() - 30 * 86_400_000);
    return { startDate: start.toISOString().split("T")[0], endDate };
  }

  if (preset === "90d") {
    const start = new Date(now.getTime() - 90 * 86_400_000);
    return { startDate: start.toISOString().split("T")[0], endDate };
  }

  return { startDate: `${now.getFullYear()}-01-01`, endDate };
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan",
  "02": "Feb",
  "03": "Mar",
  "04": "Apr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Aug",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dec",
};

const SEVERITY_COLORS: Record<string, string> = {
  minor: "#22c55e",
  moderate: "#f59e0b",
  severe: "#f97316",
  long_term: "#ef4444",
};

const CONTEXT_COLORS: Record<string, string> = {
  training: "#3b82f6",
  match: "#ef4444",
  other_sport: "#8b5cf6",
  non_sport: "#6b7280",
  unknown: "#d1d5db",
};

const CONTEXT_LABELS: Record<string, string> = {
  training: "Training",
  match: "Match",
  other_sport: "Other Sport",
  non_sport: "Non-Sport",
  unknown: "Unknown",
};

const STATUS_BADGE_VARIANTS: Record<
  string,
  "destructive" | "default" | "secondary" | "outline"
> = {
  active: "destructive",
  recovering: "default",
  cleared: "secondary",
  healed: "outline",
};

// ============================================================
// Skeleton Components
// ============================================================

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="mt-2 h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function SkeletonChart() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

// ============================================================
// Trend Indicator (US-ANA-007 / US-ANA-016)
// ============================================================

/**
 * Shows a trend indicator with arrow and percentage.
 * `invertColors` flips the color logic: green for decrease (fewer injuries = good).
 */
function TrendIndicator({
  change,
  changePercent,
  invertColors = false,
}: {
  change: number;
  changePercent: number;
  invertColors?: boolean;
}) {
  if (change === 0 && changePercent === 0) {
    return (
      <span className="text-muted-foreground text-xs">— vs last period</span>
    );
  }

  // For most injury metrics, a decrease is good (green) and increase is bad (red)
  // When invertColors is false: decrease = green, increase = red
  const isPositiveChange = change > 0;
  const isImprovement = invertColors ? isPositiveChange : !isPositiveChange;

  return (
    <span
      className={`font-medium text-xs ${isImprovement ? "text-green-600" : "text-red-600"}`}
    >
      {isPositiveChange ? "↑" : "↓"} {Math.abs(changePercent)}% vs last period
    </span>
  );
}

// ============================================================
// Chart Components
// ============================================================

function InjuryTrendChart({
  data,
}: {
  data: { month: string; count: number }[];
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: MONTH_LABELS[d.month.split("-")[1]] || d.month,
  }));

  if (chartData.every((d) => d.count === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Injury Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            No injury data for selected period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Injury Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer height={300} width="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Line
              dataKey="count"
              name="Injuries"
              stroke="#3b82f6"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function BodyPartChart({
  data,
}: {
  data: { bodyPart: string; count: number }[];
}) {
  const chartData = data.slice(0, 10);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Injuries by Body Part</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Injuries by Body Part</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer height={300} width="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis allowDecimals={false} fontSize={12} type="number" />
            <YAxis
              dataKey="bodyPart"
              fontSize={12}
              type="category"
              width={100}
            />
            <Tooltip />
            <Bar dataKey="count" fill="#8b5cf6" name="Injuries" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function SeverityChart({
  data,
}: {
  data: { severity: string; count: number }[];
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Severity Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: d.severity.replace("_", " "),
    fill: SEVERITY_COLORS[d.severity] || "#6b7280",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Severity Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <ResponsiveContainer height={300} width="100%">
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={chartData}
                dataKey="count"
                innerRadius={60}
                label={({ severity, count }) =>
                  `${severity} (${Math.round((count / total) * 100)}%)`
                }
                nameKey="label"
                outerRadius={100}
              >
                {chartData.map((entry) => (
                  <Cell fill={entry.fill} key={entry.severity} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-4">
          {chartData.map((d) => (
            <div className="flex items-center gap-1.5 text-sm" key={d.severity}>
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: d.fill }}
              />
              <span className="capitalize">{d.label}</span>
              <span className="text-muted-foreground">({d.count})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InjuryContextChart({
  data,
}: {
  data: { context: string; count: number }[];
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Injury Context</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: CONTEXT_LABELS[d.context] || d.context,
    fill: CONTEXT_COLORS[d.context] || "#6b7280",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Injury Context</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer height={300} width="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Bar dataKey="count" name="Injuries" radius={4}>
              {chartData.map((entry) => (
                <Cell fill={entry.fill} key={entry.context} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Team Comparison Table (US-ANA-012)
// ============================================================

function TeamComparisonTable({
  orgId,
  startDate,
  endDate,
}: {
  orgId: string;
  startDate?: string;
  endDate?: string;
}) {
  const teamData = useQuery(api.models.playerInjuries.getInjuriesByTeam, {
    organizationId: orgId,
    startDate,
    endDate,
  });

  if (teamData === undefined) {
    return <SkeletonChart />;
  }

  if (teamData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Comparison</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No team injury data available</p>
        </CardContent>
      </Card>
    );
  }

  const avgInjuries =
    teamData.reduce((sum, t) => sum + t.totalInjuries, 0) / teamData.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Team Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Active</TableHead>
              <TableHead>Avg Severity</TableHead>
              <TableHead>Common Body Part</TableHead>
              <TableHead>Common Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamData.map((team) => (
              <TableRow
                className={
                  team.totalInjuries > avgInjuries ? "bg-red-50/50" : ""
                }
                key={team.teamId}
              >
                <TableCell className="font-medium">{team.teamName}</TableCell>
                <TableCell className="text-right">
                  {team.totalInjuries}
                </TableCell>
                <TableCell className="text-right">{team.activeCount}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      team.avgSeverity === "severe" ||
                      team.avgSeverity === "long_term"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {team.avgSeverity.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">
                  {team.mostCommonBodyPart}
                </TableCell>
                <TableCell className="capitalize">
                  {team.mostCommonType}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Recent Injuries Table (US-ANA-013)
// ============================================================

function RecentInjuriesTable({
  orgId,
  statusFilter,
  onStatusFilterChange,
}: {
  orgId: string;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
}) {
  const injuries = useQuery(
    api.models.playerInjuries.getRecentInjuriesForAdmin,
    {
      organizationId: orgId,
      status:
        statusFilter === "all"
          ? undefined
          : (statusFilter as "active" | "recovering" | "cleared" | "healed"),
    }
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Injuries</CardTitle>
        <Select
          onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}
          value={statusFilter}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="recovering">Recovering</SelectItem>
            <SelectItem value="cleared">Cleared</SelectItem>
            <SelectItem value="healed">Healed</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {injuries === undefined ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => `skeleton-${i}`).map((key) => (
              <Skeleton className="h-12 w-full" key={key} />
            ))}
          </div>
        ) : injuries.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No injuries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Team(s)</TableHead>
                  <TableHead>Body Part</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Days Out</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {injuries.map((injury) => (
                  <TableRow key={injury.injuryId}>
                    <TableCell className="font-medium">
                      {injury.playerName}
                    </TableCell>
                    <TableCell>
                      {injury.teamNames.length > 0
                        ? injury.teamNames.join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="capitalize">
                      {injury.bodyPart}
                    </TableCell>
                    <TableCell className="capitalize">
                      {injury.injuryType}
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor:
                            SEVERITY_COLORS[injury.severity] || "#6b7280",
                          color: "white",
                        }}
                        variant="default"
                      >
                        {injury.severity.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          STATUS_BADGE_VARIANTS[injury.status] || "outline"
                        }
                      >
                        {injury.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(injury.dateOccurred).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {injury.daysOut ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main Page
// ============================================================

// ============================================================
// CSV Export Helper
// ============================================================

function escapeCsvField(value: string | number | undefined | null): string {
  if (value == null) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function AdminInjuriesPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const dateRange = getDateRange(datePreset);

  const analytics = useQuery(api.models.playerInjuries.getOrgInjuryAnalytics, {
    organizationId: orgId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Trend data for period comparison indicators on summary cards
  const trendPeriodDays =
    datePreset === "30d" ? 30 : datePreset === "90d" ? 90 : 30;
  const trends = useQuery(api.models.playerInjuries.getInjuryTrends, {
    organizationId: orgId,
    periodDays: trendPeriodDays,
  });

  // Separate query for CSV export (all injuries, no status filter, higher limit)
  const allInjuriesForExport = useQuery(
    api.models.playerInjuries.getRecentInjuriesForAdmin,
    {
      organizationId: orgId,
      limit: 1000,
    }
  );

  const handleExportCsv = useCallback(() => {
    if (!allInjuriesForExport || allInjuriesForExport.length === 0) {
      toast.error("No injury data to export");
      return;
    }

    const headers = [
      "Player Name",
      "Team",
      "Body Part",
      "Injury Type",
      "Severity",
      "Status",
      "Date Occurred",
      "Days Out",
      "Expected Return",
      "Occurred During",
      "Treatment",
      "Medical Provider",
    ];

    const rows = allInjuriesForExport.map((injury) => [
      escapeCsvField(injury.playerName),
      escapeCsvField(injury.teamNames.join("; ")),
      escapeCsvField(injury.bodyPart),
      escapeCsvField(injury.injuryType),
      escapeCsvField(injury.severity),
      escapeCsvField(injury.status),
      escapeCsvField(injury.dateOccurred),
      escapeCsvField(injury.daysOut),
      escapeCsvField(injury.expectedReturn),
      escapeCsvField(injury.occurredDuring),
      escapeCsvField(injury.treatment),
      escapeCsvField(injury.medicalProvider),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `injury-report-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Injury report exported successfully");
  }, [allInjuriesForExport]);

  const isLoading = analytics === undefined;

  return (
    <div className="space-y-6">
      {/* Header with date range controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">
            Injury Analytics
          </h1>
          <p className="mt-1 text-muted-foreground">
            Organization-wide injury statistics and trends
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "30d", label: "Last 30 days" },
              { key: "90d", label: "Last 90 days" },
              { key: "season", label: "This season" },
              { key: "all", label: "All time" },
            ] as const
          ).map(({ key, label }) => (
            <Button
              key={key}
              onClick={() => setDatePreset(key)}
              size="sm"
              variant={datePreset === key ? "default" : "outline"}
            >
              {label}
            </Button>
          ))}
          <Button
            disabled={
              !allInjuriesForExport || allInjuriesForExport.length === 0
            }
            onClick={handleExportCsv}
            size="sm"
            variant="outline"
          >
            <Download className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Dashboard content */}
      {isLoading ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SkeletonChart />
            <SkeletonChart />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SkeletonChart />
            <SkeletonChart />
          </div>
          <SkeletonChart />
          <SkeletonChart />
        </>
      ) : analytics.totalInjuries === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              No injury data recorded for the selected period.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards with Trend Indicators */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-medium text-muted-foreground text-sm">
                  Total Injuries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  {analytics.totalInjuries}
                </div>
                <div className="mt-1">
                  {trends ? (
                    <TrendIndicator
                      change={trends.changes.totalChange}
                      changePercent={trends.changes.totalChangePercent}
                    />
                  ) : (
                    <Skeleton className="h-3 w-24" />
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-medium text-muted-foreground text-sm">
                  Currently Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  {analytics.activeCount + analytics.recoveringCount}
                </div>
                <div className="mt-1">
                  <span className="text-muted-foreground text-xs">
                    {analytics.activeCount} active, {analytics.recoveringCount}{" "}
                    recovering
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-medium text-muted-foreground text-sm">
                  Avg Recovery Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  {analytics.avgRecoveryDays}
                </div>
                <div className="mt-1">
                  {trends ? (
                    <TrendIndicator
                      change={trends.changes.avgRecoveryChange}
                      changePercent={trends.changes.avgRecoveryChangePercent}
                    />
                  ) : (
                    <Skeleton className="h-3 w-24" />
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-medium text-muted-foreground text-sm">
                  Recurrence Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  {analytics.recurrenceRate}%
                </div>
                <div className="mt-1">
                  <span className="text-muted-foreground text-xs">
                    Players with repeat injuries
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1: Trends + Body Part */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InjuryTrendChart data={analytics.byMonth} />
            <BodyPartChart data={analytics.byBodyPart} />
          </div>

          {/* Charts Row 2: Severity + Context */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SeverityChart data={analytics.bySeverity} />
            <InjuryContextChart data={analytics.byOccurredDuring} />
          </div>

          {/* Team Comparison */}
          <TeamComparisonTable
            endDate={dateRange.endDate}
            orgId={orgId}
            startDate={dateRange.startDate}
          />

          {/* Recent Injuries Table */}
          <RecentInjuriesTable
            onStatusFilterChange={setStatusFilter}
            orgId={orgId}
            statusFilter={statusFilter}
          />
        </>
      )}
    </div>
  );
}
