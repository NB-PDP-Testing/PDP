"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  Heart,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

// ── Score colour helper ──────────────────────────────────────

function getScoreColor(score: number | null): string {
  if (score === null) {
    return "#94a3b8";
  }
  if (score <= 1.5) {
    return "#ef4444";
  }
  if (score <= 2.5) {
    return "#f97316";
  }
  if (score <= 3.5) {
    return "#eab308";
  }
  if (score <= 4.5) {
    return "#86efac";
  }
  return "#22c55e";
}

function ScoreDisplay({ score }: { score: number | null }) {
  const color = getScoreColor(score);
  if (score === null) {
    return (
      <div className="text-center">
        <p className="font-bold text-2xl text-muted-foreground">—</p>
        <p className="text-muted-foreground text-xs">No data today</p>
      </div>
    );
  }
  const label =
    score <= 1.5
      ? "Critical"
      : score <= 2.5
        ? "Low"
        : score <= 3.5
          ? "Moderate"
          : score <= 4.5
            ? "Good"
            : "Excellent";

  return (
    <div className="text-center">
      <p className="font-bold text-3xl" style={{ color }}>
        {score.toFixed(1)}
      </p>
      <p className="text-xs" style={{ color }}>
        {label}
      </p>
    </div>
  );
}

function TeamTrend({ trend }: { trend: { date: string; score: number }[] }) {
  if (trend.length < 2) {
    return (
      <p className="text-center text-muted-foreground text-xs">
        Not enough data for trend
      </p>
    );
  }
  const first = trend[0].score;
  const last = trend.at(-1).score;
  const delta = last - first;
  const TrendIcon = delta >= 0 ? TrendingUp : TrendingDown;
  const trendColor =
    delta >= 0.2 ? "#22c55e" : delta <= -0.2 ? "#ef4444" : "#94a3b8";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">7-day trend</span>
        <div className="flex items-center gap-1" style={{ color: trendColor }}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span className="font-medium text-xs">
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)}
          </span>
        </div>
      </div>
      <ResponsiveContainer height={48} width="100%">
        <LineChart data={trend}>
          <Tooltip
            contentStyle={{ fontSize: 10 }}
            formatter={(v) => [
              typeof v === "number" ? v.toFixed(1) : v,
              "Avg score",
            ]}
          />
          <Line
            connectNulls={false}
            dataKey="score"
            dot={false}
            stroke="#22c55e"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Team wellness card ───────────────────────────────────────

type TeamSummary = {
  teamId: string;
  totalPlayers: number;
  playersSharing: number;
  avgScore: number | null;
  checkedInToday: number;
  alertCount: number;
  trend7Days: { date: string; score: number }[];
};

function TeamWellnessCard({
  summary,
  teamName,
}: {
  summary: TeamSummary;
  teamName: string;
}) {
  const hasAlerts = summary.alertCount > 0;

  return (
    <Card
      className="transition-shadow hover:shadow-md"
      style={
        hasAlerts
          ? { borderColor: "#f59e0b", backgroundColor: "#fffbeb" }
          : undefined
      }
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="truncate">{teamName}</span>
          {hasAlerts && (
            <Badge className="shrink-0 bg-amber-100 text-amber-700">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {summary.alertCount} alert{summary.alertCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score + check-in stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1 flex items-center justify-center">
            <ScoreDisplay score={summary.avgScore} />
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/50 p-2 text-center">
              <p className="font-bold text-lg">{summary.checkedInToday}</p>
              <p className="text-muted-foreground text-xs">Checked in today</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2 text-center">
              <p className="font-bold text-lg">{summary.playersSharing}</p>
              <p className="text-muted-foreground text-xs">
                of {summary.totalPlayers} sharing
              </p>
            </div>
          </div>
        </div>

        {/* 7-day team trend */}
        <TeamTrend trend={summary.trend7Days} />
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function CoachWellnessPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  // Team-level wellness summaries (opt-out model — all players sharing by default)
  const teamSummaries = useQuery(
    api.models.playerHealthChecks.getTeamWellnessSummary,
    userId && orgId ? { coachUserId: userId, organizationId: orgId } : "skip"
  );

  // Fetch team names from coach assignments
  const coachAssignments = useQuery(
    api.models.coaches.getCoachAssignmentsWithTeams,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );

  const teamNameMap = new Map(
    coachAssignments?.teams?.map((t) => [t.teamId, t.teamName]) ?? []
  );

  const isLoading =
    teamSummaries === undefined || coachAssignments === undefined;

  // Overall org stats (across all teams)
  const totalPlayers =
    teamSummaries?.reduce((s, t) => s + t.totalPlayers, 0) ?? 0;
  const totalSharing =
    teamSummaries?.reduce((s, t) => s + t.playersSharing, 0) ?? 0;
  const totalCheckedIn =
    teamSummaries?.reduce((s, t) => s + t.checkedInToday, 0) ?? 0;
  const totalAlerts = teamSummaries?.reduce((s, t) => s + t.alertCount, 0) ?? 0;

  const teamsWithScores =
    teamSummaries?.filter((t) => t.avgScore !== null) ?? [];
  const overallAvg =
    teamsWithScores.length > 0
      ? Math.round(
          (teamsWithScores.reduce((s, t) => s + (t.avgScore ?? 0), 0) /
            teamsWithScores.length) *
            10
        ) / 10
      : null;

  return (
    <div className="space-y-6">
      <OrgThemedGradient className="rounded-lg p-4 shadow-md md:p-6">
        <div className="flex items-center gap-2 md:gap-3">
          <Heart className="h-7 w-7 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-xl md:text-2xl">Player Wellness</h1>
            <p className="text-sm opacity-90">
              Team wellness at a glance — aggregated, never individual
            </p>
          </div>
        </div>
      </OrgThemedGradient>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton className="h-52 w-full" key={i} />
          ))}
        </div>
      ) : teamSummaries?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-muted-foreground">
              No teams assigned to you yet.
            </p>
            <p className="max-w-xs text-muted-foreground text-sm">
              Contact your organisation administrator to be assigned to a team.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="font-bold text-2xl">{totalPlayers}</p>
                <p className="text-muted-foreground text-xs">Total players</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="font-bold text-2xl">{totalCheckedIn}</p>
                <p className="text-muted-foreground text-xs">
                  Checked in today
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p
                  className="font-bold text-2xl"
                  style={{ color: getScoreColor(overallAvg) }}
                >
                  {overallAvg !== null ? overallAvg.toFixed(1) : "—"}
                </p>
                <p className="text-muted-foreground text-xs">Avg score today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p
                  className="font-bold text-2xl"
                  style={{ color: totalAlerts > 0 ? "#f59e0b" : undefined }}
                >
                  {totalAlerts}
                </p>
                <p className="text-muted-foreground text-xs">
                  Low-score alerts
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Per-team cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teamSummaries?.map((summary) => (
              <TeamWellnessCard
                key={summary.teamId}
                summary={summary}
                teamName={
                  teamNameMap.get(summary.teamId) ??
                  `Team ${summary.teamId.slice(0, 6)}`
                }
              />
            ))}
          </div>

          {/* Opt-out notice */}
          <p className="text-center text-muted-foreground text-xs">
            Players sharing:{" "}
            <span className="font-medium">
              {totalSharing} of {totalPlayers}
            </span>
            . Players can disable wellness sharing in their settings.
          </p>
        </>
      )}
    </div>
  );
}
