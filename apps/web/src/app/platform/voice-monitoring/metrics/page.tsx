"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";

// ── Time range helpers ────────────────────────────────────────

type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";

const TIME_RANGES: { label: string; value: TimeRange; ms: number }[] = [
  { label: "1H", value: "1h", ms: 60 * 60 * 1000 },
  { label: "6H", value: "6h", ms: 6 * 60 * 60 * 1000 },
  { label: "24H", value: "24h", ms: 24 * 60 * 60 * 1000 },
  { label: "7D", value: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30D", value: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
];

// ── CSS Bar Chart (ADR-VNM-022 pattern) ───────────────────────

function BarChart({
  data,
  label,
}: {
  data: { label: string; value: number }[];
  label: string;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground text-sm">
        No data available
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="font-medium text-muted-foreground text-xs">{label}</p>
      {data.map((item, index) => (
        <div
          className="flex items-center gap-2 text-sm"
          key={`${item.label}-${index}`}
        >
          <div className="w-24 truncate text-muted-foreground text-xs">
            {item.label}
          </div>
          <div className="flex-1">
            <div className="relative h-6 w-full overflow-hidden rounded bg-gray-100">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
          <div className="w-16 text-right font-medium text-xs">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── CSS Stacked Bar Chart (ADR-VNM-022) ──────────────────────

function StackedBarChart({
  data,
  label,
}: {
  data: { label: string; value: number; color: string }[];
  label: string;
}) {
  if (data.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground text-sm">
        No data available
      </p>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-2">
      <p className="font-medium text-muted-foreground text-xs">{label}</p>

      {/* Stacked bar showing cumulative latency */}
      <div className="relative h-10 w-full overflow-hidden rounded bg-gray-100">
        {data.map((item, index) => {
          const widthPercent = total > 0 ? (item.value / total) * 100 : 0;
          const leftPercent = data
            .slice(0, index)
            .reduce((sum, d) => sum + (d.value / total) * 100, 0);

          return (
            <div
              className="absolute h-full transition-all"
              key={item.label}
              style={{
                backgroundColor: item.color,
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
              title={`${item.label}: ${Math.round(item.value)}ms`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2">
        {data.map((item) => (
          <div className="flex items-center gap-1.5" key={item.label}>
            <div
              className="h-3 w-3 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground text-xs">
              {item.label}: {Math.round(item.value)}ms
            </span>
          </div>
        ))}
      </div>

      <p className="pt-1 text-right text-muted-foreground text-xs">
        Total: {Math.round(total)}ms
      </p>
    </div>
  );
}

// ── SVG Line Chart (ADR-VNM-022 - no external library) ───────

function LineChart({
  data,
  label,
  color = "text-blue-500",
}: {
  data: number[];
  label: string;
  color?: string;
}) {
  const width = 400;
  const height = 80;
  const maxValue = Math.max(...data, 1);

  if (data.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground text-sm">
        No data available
      </p>
    );
  }

  const points = data
    .map(
      (d, i) =>
        `${(i / Math.max(data.length - 1, 1)) * width},${height - (d / maxValue) * height}`
    )
    .join(" ");

  return (
    <div className="space-y-1">
      <p className="font-medium text-muted-foreground text-xs">{label}</p>
      <svg
        aria-label={label}
        className={`w-full ${color}`}
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <polyline
          fill="none"
          points={points}
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

// ── SVG Area Chart with Gradient (ADR-VNM-022) ───────────────

function AreaChart({
  data,
  label,
  color = "text-green-500",
  gradientId = "areaGradient",
}: {
  data: number[];
  label: string;
  color?: string;
  gradientId?: string;
}) {
  const width = 400;
  const height = 80;
  const maxValue = Math.max(...data, 1);

  if (data.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground text-sm">
        No data available
      </p>
    );
  }

  // Build path for area (line + close to bottom)
  const linePoints = data.map(
    (d, i) =>
      `${(i / Math.max(data.length - 1, 1)) * width},${height - (d / maxValue) * height}`
  );

  // Path: start at bottom-left, draw line, end at bottom-right, close path
  const pathData = `
    M 0,${height}
    L ${linePoints.join(" L ")}
    L ${width},${height}
    Z
  `;

  return (
    <div className="space-y-1">
      <p className="font-medium text-muted-foreground text-xs">{label}</p>
      <svg
        aria-label={label}
        className={`w-full ${color}`}
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={pathData} fill={`url(#${gradientId})`} />
        <polyline
          fill="none"
          points={linePoints.join(" ")}
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────

function MetricCard({
  title,
  value,
  sub,
  isLoading,
}: {
  title: string;
  value: string | number;
  sub?: string;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="mt-2 h-4 w-28" />
          </>
        ) : (
          <>
            <div className="font-bold text-2xl">{value}</div>
            <p className="mt-0.5 text-muted-foreground text-sm">{title}</p>
            {sub && (
              <p className="mt-0.5 text-muted-foreground text-xs">{sub}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function MetricsPage() {
  const user = useCurrentUser();
  const isPlatformStaff = user?.isPlatformStaff === true;
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  // Store timestamp in state to prevent recalculation on every render
  const [baseTimestamp] = useState(() => Date.now());

  useEffect(() => {
    if (user && !isPlatformStaff) {
      router.push("/orgs/current");
    }
  }, [user, isPlatformStaff, router]);

  const rangeMs =
    TIME_RANGES.find((r) => r.value === timeRange)?.ms ?? 24 * 60 * 60 * 1000;
  const startTime = baseTimestamp - rangeMs;
  const periodType: "hourly" | "daily" =
    timeRange === "7d" || timeRange === "30d" ? "daily" : "hourly";

  const realTimeMetrics = useQuery(
    api.models.voicePipelineMetrics.getRealTimeMetrics,
    isPlatformStaff ? {} : "skip"
  );

  const historicalMetrics = useQuery(
    api.models.voicePipelineMetrics.getHistoricalMetrics,
    isPlatformStaff ? { periodType, startTime, endTime: baseTimestamp } : "skip"
  );

  const stageBreakdown = useQuery(
    api.models.voicePipelineMetrics.getStageBreakdown,
    isPlatformStaff ? { periodType, startTime, endTime: baseTimestamp } : "skip"
  );

  const orgBreakdown = useQuery(
    api.models.voicePipelineMetrics.getOrgBreakdown,
    isPlatformStaff ? { periodType, startTime, endTime: baseTimestamp } : "skip"
  );

  const isLoading =
    realTimeMetrics === undefined || historicalMetrics === undefined;

  // Compute completion rate
  const completionRate =
    realTimeMetrics && realTimeMetrics.artifactsReceived1h > 0
      ? Math.round(
          (realTimeMetrics.artifactsCompleted1h /
            realTimeMetrics.artifactsReceived1h) *
            100
        )
      : 0;

  // Build chart data from historical metrics
  const throughputData = (historicalMetrics ?? []).map((s) => ({
    label: new Date(s.periodStart).toLocaleTimeString("en", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    value: s.artifactsReceived,
  }));

  const errorRateData = (historicalMetrics ?? []).map(
    (s) => s.overallFailureRate * 100
  );

  const costData = (historicalMetrics ?? []).map((s) => s.totalAICost);

  const avgLatency =
    historicalMetrics && historicalMetrics.length > 0
      ? Math.round(
          historicalMetrics.reduce((sum, s) => sum + s.avgEndToEndLatency, 0) /
            historicalMetrics.length
        )
      : 0;

  const totalCost = (historicalMetrics ?? []).reduce(
    (sum, s) => sum + s.totalAICost,
    0
  );

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      {/* Header + Time range selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lg">Metrics</h2>
          <p className="text-muted-foreground text-sm">
            Pipeline performance over time
          </p>
        </div>
        <div className="flex gap-1">
          {TIME_RANGES.map((r) => (
            <Button
              className="h-8 px-3 text-xs"
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              size="sm"
              variant={timeRange === r.value ? "default" : "outline"}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          isLoading={isLoading}
          sub="last 1h"
          title="Total Artifacts"
          value={realTimeMetrics?.artifactsReceived1h ?? 0}
        />
        <MetricCard
          isLoading={isLoading}
          title="Completion Rate"
          value={`${completionRate}%`}
        />
        <MetricCard
          isLoading={isLoading}
          sub="end-to-end"
          title="Avg Latency"
          value={`${avgLatency}ms`}
        />
        <MetricCard
          isLoading={isLoading}
          sub="selected range"
          title="Total Cost"
          value={`$${totalCost.toFixed(4)}`}
        />
        <MetricCard
          isLoading={isLoading}
          title="Auto-Resolved"
          value={realTimeMetrics?.entitiesResolved1h ?? 0}
        />
        <MetricCard
          isLoading={isLoading}
          sub="last 1h"
          title="Failures"
          value={realTimeMetrics?.failures1h ?? 0}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Throughput bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Throughput Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <BarChart
                data={throughputData.slice(-12)}
                label="Artifacts received"
              />
            )}
          </CardContent>
        </Card>

        {/* Latency by stage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Latency by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {stageBreakdown === undefined ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <StackedBarChart
                data={stageBreakdown.stages.map((s, i) => {
                  // Assign distinct colors to each stage
                  const colors = [
                    "#3b82f6", // blue-500
                    "#8b5cf6", // violet-500
                    "#ec4899", // pink-500
                    "#f97316", // orange-500
                    "#10b981", // emerald-500
                    "#06b6d4", // cyan-500
                  ];
                  return {
                    label: s.stage.replace(/_/g, " "),
                    value: Math.round(s.avgLatency),
                    color: colors[i % colors.length],
                  };
                })}
                label="End-to-end latency breakdown"
              />
            )}
          </CardContent>
        </Card>

        {/* Error rate trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Error Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <LineChart
                color="text-red-500"
                data={errorRateData}
                label="Error rate (%)"
              />
            )}
          </CardContent>
        </Card>

        {/* Cost trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cost Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <AreaChart
                color="text-green-600"
                data={costData}
                gradientId="costGradient"
                label="Total AI cost ($)"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Org breakdown table */}
      {orgBreakdown && orgBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Organization Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Org</th>
                    <th className="px-4 py-3 text-right font-medium">Volume</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Avg Latency
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Error Rate
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {orgBreakdown.map((org) => (
                    <tr className="border-t" key={org.organizationId}>
                      <td className="px-4 py-2 font-mono text-xs">
                        {org.organizationId.slice(0, 16)}...
                      </td>
                      <td className="px-4 py-2 text-right text-xs">
                        {org.artifactsReceived}
                      </td>
                      <td className="px-4 py-2 text-right text-xs">
                        {Math.round(org.avgLatency)}ms
                      </td>
                      <td className="px-4 py-2 text-right text-xs">
                        <Badge
                          className={
                            org.failureRate > 0.1
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }
                          variant="outline"
                        >
                          {(org.failureRate * 100).toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right text-xs">
                        ${org.totalAICost.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
