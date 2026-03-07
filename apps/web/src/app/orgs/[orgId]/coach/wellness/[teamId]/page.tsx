"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowLeft, Heart } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

// ── Types ────────────────────────────────────────────────────

type TimeRange = 7 | 30 | 90;

type ChartDataPoint = {
  date: string;
  shortDate: string;
  value: number | null;
  count: number;
};

// ── Constants ────────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  sleepQuality: "Sleep Quality",
  energyLevel: "Energy",
  mood: "Mood",
  physicalFeeling: "Physical Feeling",
  motivation: "Motivation",
};

// Only the 5 core dimensions are active in the check-in form
const ALL_DIMENSIONS = Object.keys(DIMENSION_LABELS);

const SCORE_COLORS: Record<number, string> = {
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

// ── Helpers ──────────────────────────────────────────────────

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
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

// ── Chart component ──────────────────────────────────────────

function TeamDimensionChart({
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
            Not enough data yet for this period
          </p>
        </CardContent>
      </Card>
    );
  }

  const color = seriesColor(data);

  return (
    <Card className="overflow-hidden">
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

// ── Page ─────────────────────────────────────────────────────

export default function TeamWellnessDetailPage() {
  const params = useParams<{ orgId: string; teamId: string }>();
  const { orgId, teamId } = params;
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const [timeRange, setTimeRange] = useState<TimeRange>(30);

  const history = useQuery(
    api.models.playerHealthChecks.getTeamWellnessHistory,
    userId && orgId && teamId
      ? { teamId, organizationId: orgId, coachUserId: userId, days: timeRange }
      : "skip"
  );

  // Get team name from coach assignments
  const coachAssignments = useQuery(
    api.models.coaches.getCoachAssignmentsWithTeams,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );
  const teamName =
    coachAssignments?.teams?.find((t) => t.teamId === teamId)?.teamName ??
    "Team";

  const isLoading = history === undefined || coachAssignments === undefined;

  // Build full date range with gaps
  const allDates = buildDateRange(timeRange);
  const recordByDate = new Map((history ?? []).map((h) => [h.date, h]));

  // Overall wellness chart data
  const overallData: ChartDataPoint[] = allDates.map((date) => {
    const record = recordByDate.get(date);
    return {
      date,
      shortDate: formatShortDate(date),
      value: record?.overall ?? null,
      count: record?.checkedInCount ?? 0,
    };
  });

  // Per-dimension chart data
  const dimensionData: Record<string, ChartDataPoint[]> = {};
  for (const dim of ALL_DIMENSIONS) {
    dimensionData[dim] = allDates.map((date) => {
      const record = recordByDate.get(date);
      const val = record?.[dim as keyof typeof record];
      return {
        date,
        shortDate: formatShortDate(date),
        value: typeof val === "number" ? val : null,
        count: record?.checkedInCount ?? 0,
      };
    });
  }

  const totalCheckins = history?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border hover:bg-muted"
          href={`/orgs/${orgId}/coach/wellness`}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-muted-foreground" />
          <h1 className="font-bold text-xl">
            {isLoading ? "Loading…" : teamName} — Wellness
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : totalCheckins === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">
              No wellness check-ins in this period for {teamName}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Time range toggle */}
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Team averages — aggregated, never individual
            </p>
            <div className="flex overflow-hidden rounded-lg border">
              {([7, 30, 90] as TimeRange[]).map((days) => (
                <button
                  className="px-3 py-1.5 font-medium text-xs transition-colors"
                  key={days}
                  onClick={() => setTimeRange(days)}
                  style={{
                    backgroundColor:
                      timeRange === days
                        ? "hsl(var(--primary))"
                        : "transparent",
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

          {/* Overall score chart */}
          <TeamDimensionChart
            data={overallData}
            title="Overall Wellness Score"
          />

          {/* Per-dimension charts */}
          {ALL_DIMENSIONS.map((dim) => (
            <TeamDimensionChart
              data={dimensionData[dim] ?? []}
              key={dim}
              title={DIMENSION_LABELS[dim] ?? dim}
            />
          ))}
        </div>
      )}
    </div>
  );
}
