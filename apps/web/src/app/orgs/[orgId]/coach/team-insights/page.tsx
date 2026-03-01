"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useQuery } from "convex/react";
import { Calendar, Lightbulb, Mic, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { authClient } from "@/lib/auth-client";

// Format date as "Mon Jan 22, 10:30 PM"
function formatDate(date: Date | string | number): string {
  const d =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TeamInsightsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId as BetterAuthId<"organization">;
  const { data: session } = authClient.useSession();

  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  // Get current user ID
  const userId = session?.user?.id;

  // Get coach assignments with enriched team data (Pattern B)
  const coachAssignment = useQuery(
    api.models.coaches.getCoachAssignmentsWithTeams,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );

  // Fetch team observations
  const observations = useQuery(
    api.models.teamObservations.getOrganizationObservations,
    orgId ? { organizationId: orgId } : "skip"
  );

  // Get coach's teams with names (Pattern B - already resolved server-side)
  // Filter out corrupted team IDs (e.g., player IDs) and deduplicate
  const coachTeams = useMemo(() => {
    if (!coachAssignment?.teams) {
      return [];
    }
    const seen = new Set<string>();
    return coachAssignment.teams.filter((team) => {
      if (!team.teamId) {
        return false;
      }
      if (team.teamId.includes("players")) {
        console.warn(
          `[Team Insights] Skipping corrupted teamId: ${team.teamId}`
        );
        return false;
      }
      if (seen.has(team.teamId)) {
        return false;
      }
      seen.add(team.teamId);
      return true;
    });
  }, [coachAssignment?.teams]);

  const coachTeamIds = useMemo(
    () => coachTeams.map((t) => t.teamId),
    [coachTeams]
  );

  // Get team player links to derive player counts per team
  const teamPlayerLinks = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    orgId ? { organizationId: orgId, status: "active" } : "skip"
  );

  // Name map from assignment data (used instead of observation data for team names)
  const teamNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of coachTeams) {
      map.set(team.teamId, team.teamName);
    }
    return map;
  }, [coachTeams]);

  // Player count per team
  const playerCountByTeam = useMemo(() => {
    const counts = new Map<string, number>();
    if (!teamPlayerLinks) {
      return counts;
    }
    for (const link of teamPlayerLinks) {
      counts.set(link.teamId, (counts.get(link.teamId) ?? 0) + 1);
    }
    return counts;
  }, [teamPlayerLinks]);

  // When there's only one team, auto-select it; otherwise use user selection
  const effectiveSelectedTeam = useMemo(() => {
    if (coachTeamIds.length === 1) {
      return coachTeamIds[0];
    }
    return selectedTeam;
  }, [coachTeamIds, selectedTeam]);

  // Observation count per team (all observations for coach's teams, unfiltered)
  const observationCountByTeam = useMemo(() => {
    const counts = new Map<string, number>();
    if (!observations) {
      return counts;
    }
    const coachTeamSet = new Set(coachTeamIds);
    for (const obs of observations) {
      if (coachTeamSet.has(obs.teamId)) {
        counts.set(obs.teamId, (counts.get(obs.teamId) ?? 0) + 1);
      }
    }
    return counts;
  }, [observations, coachTeamIds]);

  // Filter observations by selected team
  const filteredObservations = useMemo(() => {
    if (!observations) {
      return [];
    }

    // Filter to only teams the coach is assigned to
    const coachTeamSet = new Set(coachTeamIds);
    let filtered = observations.filter((obs) => coachTeamSet.has(obs.teamId));

    // Apply team filter
    if (effectiveSelectedTeam !== "all") {
      filtered = filtered.filter((obs) => obs.teamId === effectiveSelectedTeam);
    }

    return filtered;
  }, [observations, effectiveSelectedTeam, coachTeamIds]);

  // Group observations by team
  const observationsByTeam = useMemo(() => {
    const grouped = new Map<string, (typeof filteredObservations)[number][]>();

    for (const obs of filteredObservations) {
      if (!grouped.has(obs.teamId)) {
        grouped.set(obs.teamId, []);
      }
      const teamObs = grouped.get(obs.teamId);
      if (teamObs) {
        teamObs.push(obs);
      }
    }

    return grouped;
  }, [filteredObservations]);

  if (!orgId) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 font-bold text-2xl tracking-tight sm:text-3xl">
          <Users className="h-7 w-7" />
          Team Insights
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Team-level observations and culture notes from voice notes
        </p>
      </div>

      {/* Team selector — clickable cards, one per team */}
      {coachTeams.length > 0 && (
        <div
          className={`grid gap-4 ${
            coachTeams.length === 1
              ? "max-w-sm grid-cols-1"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {/* "All teams" card — only shown when there are multiple teams */}
          {coachTeams.length > 1 && (
            <Card
              className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
                effectiveSelectedTeam === "all"
                  ? "border-2 border-green-500 bg-green-50"
                  : ""
              }`}
              onClick={() => setSelectedTeam("all")}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg md:text-xl">
                      All Teams
                    </CardTitle>
                    <p className="text-gray-600 text-xs md:text-sm">
                      {coachTeams.length} teams
                    </p>
                  </div>
                  <div className="ml-3 flex-shrink-0 text-right">
                    <div className="font-bold text-2xl text-green-600 md:text-3xl">
                      {Array.from(observationCountByTeam.values()).reduce(
                        (s, n) => s + n,
                        0
                      )}
                    </div>
                    <div className="whitespace-nowrap text-gray-500 text-xs">
                      Insights
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {coachTeams.map((team) => {
            const isSelected = effectiveSelectedTeam === team.teamId;
            const playerCount = playerCountByTeam.get(team.teamId) ?? 0;
            const insightCount = observationCountByTeam.get(team.teamId) ?? 0;
            const meta = [team.ageGroup, team.gender, team.sportCode]
              .filter(Boolean)
              .join(" • ");
            return (
              <Card
                className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
                  isSelected ? "border-2 border-green-500 bg-green-50" : ""
                }`}
                key={team.teamId}
                onClick={() => setSelectedTeam(team.teamId)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle
                        className="truncate text-lg md:text-xl"
                        title={team.teamName}
                      >
                        {team.teamName}
                      </CardTitle>
                      <p className="text-gray-600 text-xs md:text-sm">
                        {playerCount} Players
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0 text-right">
                      <div className="font-bold text-2xl text-green-600 md:text-3xl">
                        {insightCount}
                      </div>
                      <div className="whitespace-nowrap text-gray-500 text-xs">
                        Insights
                      </div>
                      {meta && (
                        <p className="mt-0.5 whitespace-nowrap text-gray-500 text-xs">
                          {meta}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">
              Total Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {filteredObservations.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">
              Teams with Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{observationsByTeam.size}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">
              From Voice Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {
                filteredObservations.filter((o) => o.source === "voice_note")
                  .length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Observations list */}
      {filteredObservations.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <Lightbulb className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>No team insights yet</EmptyTitle>
                <EmptyDescription>
                  Team insights from voice notes will appear here once you
                  record and apply them.
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : effectiveSelectedTeam === "all" ? (
        // Show grouped by team
        <div className="space-y-6">
          {Array.from(observationsByTeam.entries()).map(([teamId, teamObs]) => (
            <Card key={teamId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {teamNameMap.get(teamId) || teamObs[0]?.teamName || teamId}
                </CardTitle>
                <CardDescription>
                  {teamObs.length} observation{teamObs.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {teamObs.map((obs) => (
                  <div
                    className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4"
                    key={obs._id}
                  >
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className="text-xs"
                          variant={
                            obs.source === "voice_note" ? "default" : "outline"
                          }
                        >
                          {obs.source === "voice_note" && (
                            <Mic className="mr-1 h-3 w-3" />
                          )}
                          {obs.source === "voice_note"
                            ? "Voice Note"
                            : "Manual"}
                        </Badge>
                        {obs.category && (
                          <Badge className="text-xs" variant="secondary">
                            {obs.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Calendar className="h-3 w-3" />
                        {formatDate(obs.dateObserved)}
                      </div>
                    </div>
                    <h3 className="mb-1 font-semibold text-sm">{obs.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      {obs.description}
                    </p>
                    <p className="mt-2 text-muted-foreground text-xs">
                      By {obs.coachName}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Show single team
        <Card>
          <CardHeader>
            <CardTitle>
              {effectiveSelectedTeam !== "all"
                ? (teamNameMap.get(effectiveSelectedTeam) ??
                  filteredObservations[0]?.teamName ??
                  "Team")
                : (filteredObservations[0]?.teamName ?? "Team")}
            </CardTitle>
            <CardDescription>
              {filteredObservations.length} observation
              {filteredObservations.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredObservations.map((obs) => (
              <div
                className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4"
                key={obs._id}
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className="text-xs"
                      variant={
                        obs.source === "voice_note" ? "default" : "outline"
                      }
                    >
                      {obs.source === "voice_note" && (
                        <Mic className="mr-1 h-3 w-3" />
                      )}
                      {obs.source === "voice_note" ? "Voice Note" : "Manual"}
                    </Badge>
                    {obs.category && (
                      <Badge className="text-xs" variant="secondary">
                        {obs.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Calendar className="h-3 w-3" />
                    {formatDate(obs.dateObserved)}
                  </div>
                </div>
                <h3 className="mb-1 font-semibold text-sm">{obs.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {obs.description}
                </p>
                <p className="mt-2 text-muted-foreground text-xs">
                  By {obs.coachName}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
