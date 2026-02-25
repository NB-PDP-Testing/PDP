"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AlertTriangle, Download, Heart } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WellnessAnalyticsTabProps {
  organizationId: string;
}

// Individual player detail panel — full dimension history (admin access)
function PlayerWellnessDetail({
  playerIdentityId,
  playerName,
  onClose,
}: {
  playerIdentityId: Id<"playerIdentities">;
  playerName: string;
  onClose: () => void;
}) {
  const history = useQuery(
    api.models.playerHealthChecks.getPlayerWellnessForAdmin,
    { playerIdentityId, days: 90 }
  );

  if (history === undefined) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{playerName} — Full Dimension History</h3>
        <Button onClick={onClose} size="sm" variant="outline">
          Back
        </Button>
      </div>
      {history.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm">
          No wellness data found.
        </p>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {history.map((h) => (
            <div
              className="flex flex-wrap items-start gap-3 rounded-lg border px-4 py-3 text-sm"
              key={h.checkDate}
            >
              <span className="w-24 shrink-0 font-mono text-muted-foreground text-xs">
                {h.checkDate}
              </span>
              <div className="flex flex-wrap gap-2">
                {h.sleepQuality !== undefined && (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">
                    Sleep: {h.sleepQuality}
                  </span>
                )}
                {h.energyLevel !== undefined && (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">
                    Energy: {h.energyLevel}
                  </span>
                )}
                {h.mood !== undefined && (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">
                    Mood: {h.mood}
                  </span>
                )}
                {h.physicalFeeling !== undefined && (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">
                    Physical: {h.physicalFeeling}
                  </span>
                )}
                {h.motivation !== undefined && (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">
                    Motivation: {h.motivation}
                  </span>
                )}
                {h.foodIntake !== undefined && (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">
                    Food: {h.foodIntake}
                  </span>
                )}
                {h.waterIntake !== undefined && (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">
                    Water: {h.waterIntake}
                  </span>
                )}
                {h.muscleRecovery !== undefined && (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">
                    Muscle: {h.muscleRecovery}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WellnessAnalyticsTab({
  organizationId,
}: WellnessAnalyticsTabProps) {
  const [dateRangeDays, setDateRangeDays] = useState(30);
  const [drillDownPlayer, setDrillDownPlayer] = useState<{
    id: Id<"playerIdentities">;
    name: string;
  } | null>(null);

  // Org-level daily averages
  const orgAnalytics = useQuery(
    api.models.playerHealthChecks.getOrgWellnessAnalytics,
    { organizationId, days: dateRangeDays }
  );

  // Players with 3+ consecutive low scores (≤ 2.0)
  const lowWellnessPlayers = useQuery(
    api.models.playerHealthChecks.getConsecutiveLowWellnessPlayers,
    { organizationId, threshold: 2.0, consecutiveCount: 3 }
  );

  const handleExportCsv = () => {
    if (!orgAnalytics || orgAnalytics.length === 0) {
      return;
    }
    const header = "date,avgScore,submissionCount";
    const rows = orgAnalytics
      .map((r) => `${r.checkDate},${r.avgScore},${r.submissionCount}`)
      .join("\n");
    const blob = new Blob([`${header}\n${rows}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wellness-analytics-${organizationId}-${dateRangeDays}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (drillDownPlayer) {
    return (
      <PlayerWellnessDetail
        onClose={() => setDrillDownPlayer(null)}
        playerIdentityId={drillDownPlayer.id}
        playerName={drillDownPlayer.name}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-500" />
          <h2 className="font-semibold text-lg">Wellness Analytics</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select
            onValueChange={(v) => setDateRangeDays(Number(v))}
            value={String(dateRangeDays)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportCsv} size="sm" variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Org-level trend chart */}
      <Card>
        <CardHeader>
          <CardTitle>Average Daily Wellness Score</CardTitle>
          <CardDescription>
            Aggregate wellness across all players who submitted that day
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orgAnalytics === undefined ? (
            <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
              Loading…
            </div>
          ) : orgAnalytics.length < 2 ? (
            <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
              Not enough data yet. Wellness scores will appear here once players
              start submitting.
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={orgAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="checkDate"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => {
                      const num =
                        typeof value === "number"
                          ? value.toFixed(2)
                          : String(value);
                      return [num, "Avg Score"];
                    }}
                    labelFormatter={(label: string) => `Date: ${label}`}
                  />
                  <Line
                    connectNulls={false}
                    dataKey="avgScore"
                    dot={false}
                    name="Avg Score"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low wellness alert panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Players with Consecutive Low Scores
          </CardTitle>
          <CardDescription>
            Players whose last 3+ check-ins averaged ≤ 2.0. Click a name for
            their full dimension history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lowWellnessPlayers === undefined ? (
            <p className="py-4 text-center text-muted-foreground text-sm">
              Loading…
            </p>
          ) : lowWellnessPlayers.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground text-sm">
              No players with 3+ consecutive low scores. 🎉
            </p>
          ) : (
            <div className="space-y-2">
              {lowWellnessPlayers.map((p) => (
                <div
                  className="flex min-h-[44px] items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
                  key={String(p.playerIdentityId)}
                >
                  <div className="min-w-0 flex-1">
                    <button
                      className="font-medium text-sm hover:underline"
                      onClick={() =>
                        setDrillDownPlayer({
                          id: p.playerIdentityId,
                          name: `${p.firstName} ${p.lastName}`,
                        })
                      }
                      type="button"
                    >
                      {p.firstName} {p.lastName}
                    </button>
                    <p className="text-muted-foreground text-xs">
                      Last check: {p.lastCheckDate} · Score:{" "}
                      {p.lastScore.toFixed(1)}
                    </p>
                  </div>
                  <Badge className="shrink-0 bg-amber-100 text-amber-800 hover:bg-amber-100">
                    {p.consecutiveLowDays} low days
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
