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
      {data.map((item) => (
        <div className="flex items-center gap-2 text-sm" key={item.label}>
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

  useEffect(() => {
    if (user && !isPlatformStaff) {
      router.push("/orgs/current");
    }
  }, [user, isPlatformStaff, router]);

  const now = Date.now();
  const rangeMs =
    TIME_RANGES.find((r) => r.value === timeRange)?.ms ?? 24 * 60 * 60 * 1000;
  const startTime = now - rangeMs;
  const periodType: "hourly" | "daily" =
    timeRange === "7d" || timeRange === "30d" ? "daily" : "hourly";

  const realTimeMetrics = useQuery(
    api.models.voicePipelineMetrics.getRealTimeMetrics,
    isPlatformStaff ? {} : "skip"
  );

  const historicalMetrics = useQuery(
    api.models.voicePipelineMetrics.getHistoricalMetrics,
    isPlatformStaff ? { periodType, startTime, endTime: now } : "skip"
  );

  const stageBreakdown = useQuery(
    api.models.voicePipelineMetrics.getStageBreakdown,
    isPlatformStaff ? { periodType, startTime, endTime: now } : "skip"
  );

  const orgBreakdown = useQuery(
    api.models.voicePipelineMetrics.getOrgBreakdown,
    isPlatformStaff ? { periodType, startTime, endTime: now } : "skip"
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
              <BarChart
                data={stageBreakdown.stages.map((s) => ({
                  label: s.stage.replace(/_/g, " "),
                  value: Math.round(s.avgLatency),
                }))}
                label="Avg latency (ms)"
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
              <LineChart
                color="text-green-600"
                data={costData}
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
