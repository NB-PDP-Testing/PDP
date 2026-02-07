"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type DatePreset = "30d" | "90d" | "season" | "all";

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

  // "season" - approximate as current calendar year
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
  // Limit to top 10
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
// Main Page
// ============================================================

export default function AdminInjuriesPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const dateRange = getDateRange(datePreset);

  const analytics = useQuery(api.models.playerInjuries.getOrgInjuryAnalytics, {
    organizationId: orgId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

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
        <div className="flex gap-2">
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
          {/* Summary Cards */}
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

          {/* Team Comparison placeholder - US-ANA-012 */}
          <SkeletonChart />

          {/* Recent Injuries Table placeholder - US-ANA-013 */}
          <SkeletonChart />
        </>
      )}
    </div>
  );
}
