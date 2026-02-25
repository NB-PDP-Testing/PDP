"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================
// Score badge colours (aggregate 1–5)
// ============================================================

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

function ScoreBadge({ score }: { score: number | null }) {
  const color = getScoreColor(score);
  if (score === null) {
    return (
      <span className="rounded border px-2 py-0.5 text-muted-foreground text-xs">
        No data
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded border px-2 py-0.5 font-bold text-sm"
      style={{ borderColor: color, color }}
    >
      {score.toFixed(1)}
    </span>
  );
}

// ============================================================
// Sparkline chart
// ============================================================

function Sparkline({ trend }: { trend: { date: string; score: number }[] }) {
  if (trend.length < 2) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  return (
    <div className="w-20">
      <ResponsiveContainer height={32} width="100%">
        <LineChart data={trend}>
          <Tooltip
            contentStyle={{ fontSize: 10 }}
            formatter={(v) => [
              typeof v === "number" ? v.toFixed(1) : v,
              "Score",
            ]}
          />
          <Line
            connectNulls={false}
            dataKey="score"
            dot={false}
            stroke="#22c55e"
            strokeWidth={1.5}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================
// Main tab component
// ============================================================

type WellnessTabProps = {
  coachUserId: string;
  coachName: string;
  organizationId: string;
  teamId: string;
};

export function WellnessTab({
  coachUserId,
  coachName,
  organizationId,
  teamId,
}: WellnessTabProps) {
  // Approved players with wellness data
  const wellnessData = useQuery(
    api.models.playerHealthChecks.getWellnessForCoach,
    {
      coachUserId,
      organizationId,
    }
  );

  // All access requests for this coach (for pending/denied/revoked state)
  const accessRequests = useQuery(
    api.models.playerHealthChecks.getCoachAccessRequests,
    {
      coachUserId,
      organizationId,
    }
  );

  // All team players (to show those without approved access)
  const teamPlayers = useQuery(
    api.models.teamPlayerIdentities.getPlayersForTeam,
    {
      teamId,
    }
  );

  const requestAccess = useMutation(
    api.models.playerHealthChecks.requestWellnessAccess
  );

  // Track locally-sent requests during this session
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(
    new Set()
  );

  const isLoading =
    wellnessData === undefined ||
    accessRequests === undefined ||
    teamPlayers === undefined;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  // Build set of approved playerIdentityIds (as strings for cross-type comparison)
  const approvedIds = new Set<string>(
    wellnessData.map((p) => p.playerIdentityId as string)
  );

  // Build map of access request status per player
  const accessStatusMap = new Map<string, string>(
    accessRequests.map((r) => [r.playerIdentityId as string, r.status])
  );
  // Players without approved access
  const nonApprovedPlayers = teamPlayers.filter(
    (p) => !approvedIds.has(p.playerIdentityId as string)
  );

  const approvedCount = wellnessData.length;
  const checkedInToday = wellnessData.filter(
    (p) => p.todayScore !== null
  ).length;

  const handleRequestAccess = async (
    playerIdentityId: Id<"playerIdentities">
  ) => {
    try {
      await requestAccess({
        playerIdentityId,
        coachUserId,
        organizationId,
        coachName,
      });
      setPendingRequests((prev) =>
        new Set(prev).add(playerIdentityId as string)
      );
      toast.success("Access request sent");
    } catch {
      toast.error("Failed to send access request");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Team Wellness</span>
          {approvedCount > 0 && (
            <span className="font-normal text-muted-foreground text-sm">
              {checkedInToday} of {approvedCount} checked in today
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Approved players with wellness data */}
        {wellnessData.length === 0 && nonApprovedPlayers.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground text-sm">
            No players have shared their wellness data with you. Use the Request
            Access button next to each player to ask for access.
          </p>
        ) : (
          <>
            {/* Approved players */}
            {wellnessData.map((player) => {
              const isLowScore =
                player.todayScore !== null && player.todayScore <= 2.0;
              return (
                <div
                  className="flex min-h-[44px] items-center gap-3 rounded-lg border px-3 py-2"
                  key={player.playerIdentityId as string}
                  style={{
                    borderColor: isLowScore ? "#f59e0b" : undefined,
                    backgroundColor: isLowScore ? "#fffbeb" : undefined,
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm"
                      style={{ fontWeight: isLowScore ? 700 : 500 }}
                    >
                      {isLowScore && (
                        <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-amber-500" />
                      )}
                      {player.playerName}
                    </p>
                  </div>
                  <ScoreBadge score={player.todayScore} />
                  <Sparkline trend={player.trend7Days} />
                </div>
              );
            })}

            {/* Players without approved access */}
            {nonApprovedPlayers.map((player) => {
              const pid = player.playerIdentityId as string;
              const existingStatus = accessStatusMap.get(pid);
              const isPendingLocally = pendingRequests.has(pid);
              const isPending =
                existingStatus === "pending" || isPendingLocally;
              const isDeniedOrRevoked =
                existingStatus === "denied" || existingStatus === "revoked";

              return (
                <div
                  className="flex min-h-[44px] items-center gap-3 rounded-lg border px-3 py-2"
                  key={pid}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">
                      {player.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Access not granted
                    </p>
                  </div>
                  {isPending ? (
                    <Badge variant="secondary">
                      Request sent — awaiting approval
                    </Badge>
                  ) : (
                    <Button
                      onClick={() =>
                        handleRequestAccess(
                          player.playerIdentityId as unknown as Id<"playerIdentities">
                        )
                      }
                      size="sm"
                      variant="outline"
                    >
                      {isDeniedOrRevoked
                        ? "Request access again"
                        : "Request Access"}
                    </Button>
                  )}
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}
