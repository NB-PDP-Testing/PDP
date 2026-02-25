"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ============================================================
// Types
// ============================================================

type TimeRange = 7 | 30 | 90;

interface ChartDataPoint {
  date: string;
  shortDate: string;
  value: number | null;
}

// ============================================================
// Constants
// ============================================================

const DIMENSION_LABELS: Record<string, string> = {
  sleepQuality: "Sleep Quality",
  energyLevel: "Energy",
  mood: "Mood",
  physicalFeeling: "Physical Feeling",
  motivation: "Motivation",
  foodIntake: "Food Intake",
  waterIntake: "Water Intake",
  muscleRecovery: "Muscle Recovery",
};

// Color interpolated from red (1) to green (5)
const SCORE_COLORS = {
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#86efac",
  5: "#22c55e",
};

function scoreToColor(score: number | null): string {
  if (score === null) {
    return "#94a3b8";
  }
  const rounded = Math.round(score) as keyof typeof SCORE_COLORS;
  return SCORE_COLORS[rounded] ?? "#94a3b8";
}

// Gradient stroke for the line — recharts doesn't natively support per-point
// colors, so we use a single representative color for the series
function seriesColor(data: ChartDataPoint[]): string {
  const values = data
    .map((d) => d.value)
    .filter((v): v is number => v !== null);
  if (values.length === 0) {
    return "#94a3b8";
  }
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return scoreToColor(avg);
}

// ============================================================
// Helper: build chart data for a date range
// ============================================================

function buildDateRange(days: number): string[] {
  const dates: string[] = [];
  const d = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(d);
    date.setDate(d.getDate() - i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ============================================================
// Single line chart component
// ============================================================

function DimensionChart({
  title,
  data,
}: {
  title: string;
  data: ChartDataPoint[];
}) {
  const validCount = data.filter((d) => d.value !== null).length;

  if (validCount < 2) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-muted-foreground text-xs">
            Check in for a few more days to see your trends
          </p>
        </CardContent>
      </Card>
    );
  }

  const color = seriesColor(data);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div style={{ minWidth: Math.max(data.length * 20, 200) }}>
          <ResponsiveContainer height={120} width="100%">
            <LineChart
              data={data}
              margin={{ bottom: 0, left: -20, right: 8, top: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="shortDate"
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
                tickLine={false}
              />
              <YAxis
                domain={[1, 5]}
                tick={{ fontSize: 10 }}
                tickLine={false}
                ticks={[1, 2, 3, 4, 5]}
              />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value) => {
                  const num = typeof value === "number" ? value : null;
                  return num !== null ? [num.toFixed(1), title] : ["—", title];
                }}
                labelFormatter={(label) => label}
              />
              <Line
                connectNulls={false}
                dataKey="value"
                dot={false}
                stroke={color}
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main export
// ============================================================

export function WellnessTrendCharts({
  playerIdentityId,
  enabledDimensions,
}: {
  playerIdentityId: Id<"playerIdentities">;
  enabledDimensions: string[];
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>(30);

  const history = useQuery(api.models.playerHealthChecks.getWellnessHistory, {
    playerIdentityId,
    days: timeRange,
  });

  if (history === undefined) {
    return null; // loading — don't show skeleton, just wait
  }

  // Build full date range (for gaps)
  const allDates = buildDateRange(timeRange);

  // Map history records by date for fast lookup
  const recordByDate = new Map(history.map((h) => [h.checkDate, h]));

  // Build aggregate chart data
  const aggregateData: ChartDataPoint[] = allDates.map((date) => {
    const record = recordByDate.get(date);
    if (!record) {
      return { date, shortDate: formatShortDate(date), value: null };
    }
    const values: number[] = [];
    for (const dim of record.enabledDimensions) {
      const v = record[dim as keyof typeof record];
      if (typeof v === "number") {
        values.push(v);
      }
    }
    const avg =
      values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;
    return {
      date,
      shortDate: formatShortDate(date),
      value: avg !== null ? Math.round(avg * 10) / 10 : null,
    };
  });

  // Build per-dimension chart data
  const dimensionChartData: Record<string, ChartDataPoint[]> = {};
  for (const dim of enabledDimensions) {
    dimensionChartData[dim] = allDates.map((date) => {
      const record = recordByDate.get(date);
      if (!record) {
        return { date, shortDate: formatShortDate(date), value: null };
      }
      const v = record[dim as keyof typeof record];
      return {
        date,
        shortDate: formatShortDate(date),
        value: typeof v === "number" ? v : null,
      };
    });
  }

  const totalCheckins = history.length;

  return (
    <div className="space-y-4">
      {/* Section header + time range toggle */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Your Trends</h2>
        <div className="flex overflow-hidden rounded-lg border">
          {([7, 30, 90] as TimeRange[]).map((days) => (
            <button
              className="px-3 py-1.5 font-medium text-xs transition-colors"
              key={days}
              onClick={() => setTimeRange(days)}
              style={{
                backgroundColor:
                  timeRange === days ? "hsl(var(--primary))" : "transparent",
                color:
                  timeRange === days
                    ? "hsl(var(--primary-foreground))"
                    : "hsl(var(--muted-foreground))",
              }}
              type="button"
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {totalCheckins === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Check in for a few more days to see your trends
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Aggregate wellness score chart */}
          <DimensionChart data={aggregateData} title="Overall Wellness Score" />

          {/* Per-dimension charts */}
          {enabledDimensions.map((dim) => (
            <DimensionChart
              data={dimensionChartData[dim] ?? []}
              key={dim}
              title={DIMENSION_LABELS[dim] ?? dim}
            />
          ))}
        </>
      )}
    </div>
  );
}
