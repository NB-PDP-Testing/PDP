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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  // Get coach assignments
  const coachAssignment = useQuery(
    api.models.coaches.getCoachAssignments,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );

  // Fetch team observations
  const observations = useQuery(
    api.models.teamObservations.getOrganizationObservations,
    orgId ? { organizationId: orgId } : "skip"
  );

  // Get all teams for the organization to resolve names to IDs
  const allTeams = useQuery(
    api.models.teams.getTeamsByOrganization,
    orgId ? { organizationId: orgId } : "skip"
  );

  // Get unique team IDs from coach assignment (resolving names to IDs)
  const coachTeamIds = useMemo(() => {
    if (!(coachAssignment?.teams && allTeams)) {
      return [];
    }

    // Build maps for lookup (by ID and by name)
    const teamByIdMap = new Map(
      allTeams.map((team) => [String(team._id), team])
    );
    const teamByNameMap = new Map(allTeams.map((team) => [team.name, team]));

    // Resolve team values (could be IDs or names) to actual IDs
    // Use a Set to deduplicate in case same team is listed by both ID and name
    const resolvedIdSet = new Set<string>();
    for (const teamValue of coachAssignment.teams) {
      const team = teamByIdMap.get(teamValue) || teamByNameMap.get(teamValue);
      if (team) {
        resolvedIdSet.add(String(team._id));
      }
    }

    return [...resolvedIdSet];
  }, [coachAssignment, allTeams]);

  // Filter observations by selected team
  const filteredObservations = useMemo(() => {
    if (!observations) {
      return [];
    }

    // Filter to only teams the coach is assigned to
    const coachTeamSet = new Set(coachTeamIds);
    let filtered = observations.filter((obs) => coachTeamSet.has(obs.teamId));

    // Apply team filter
    if (selectedTeam !== "all") {
      filtered = filtered.filter((obs) => obs.teamId === selectedTeam);
    }

    return filtered;
  }, [observations, selectedTeam, coachTeamIds]);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-2xl tracking-tight sm:text-3xl">
            <Users className="h-7 w-7" />
            Team Insights
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Team-level observations and culture notes from voice notes
          </p>
        </div>

        {/* Team filter */}
        {coachTeamIds.length > 1 && (
          <Select onValueChange={setSelectedTeam} value={selectedTeam}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {coachTeamIds.map((teamId) => {
                const teamObs = observationsByTeam.get(teamId);
                const teamName = teamObs?.[0]?.teamName || teamId;
                return (
                  <SelectItem key={teamId} value={teamId}>
                    {teamName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>

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
      ) : selectedTeam === "all" ? (
        // Show grouped by team
        <div className="space-y-6">
          {Array.from(observationsByTeam.entries()).map(([teamId, teamObs]) => (
            <Card key={teamId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {teamObs[0]?.teamName || teamId}
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
            <CardTitle>{filteredObservations[0]?.teamName || "Team"}</CardTitle>
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
