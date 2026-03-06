"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  ActivitySquare,
  AlertCircle,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Heart,
  LayoutDashboard,
  Lightbulb,
  Users,
  Vote,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { ActivityTab } from "./components/activity-tab";
import { DecisionsTab } from "./components/decisions-tab";
import { InsightsTab } from "./components/insights-tab";
import { OverviewTab } from "./components/overview-tab";
import { PlanningTab } from "./components/planning-tab";
import { PlayersTab } from "./components/players-tab";
import { QuickStatsPanel } from "./components/quick-stats-panel";
import { TasksTab } from "./components/tasks-tab";
import { WellnessTab } from "./components/wellness-tab";

type TabValue =
  | "overview"
  | "players"
  | "planning"
  | "activity"
  | "decisions"
  | "tasks"
  | "insights"
  | "wellness";

export default function TeamHubPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId as BetterAuthId<"organization">;
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [teamsExpanded, setTeamsExpanded] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");

  // Get current tab from URL, default to "overview"
  const currentTab = (searchParams.get("tab") as TabValue) || "overview";

  // Get current user ID
  const userId = session?.user?.id;

  // Get coach assignments with enriched team data
  // Using getCoachAssignmentsWithTeams (consistent with assess, session-plans, goals pages)
  // This eliminates the need for a separate getTeamsByOrganization query
  const coachAssignments = useQuery(
    api.models.coaches.getCoachAssignmentsWithTeams,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );

  // Extract teams assigned to this coach
  // getCoachAssignmentsWithTeams returns enriched team objects
  // Filter out invalid/corrupted team IDs (e.g., player IDs mistakenly stored as team IDs)
  const coachTeams = useMemo(() => {
    if (!coachAssignments?.teams) {
      return [];
    }
    return coachAssignments.teams
      .filter((team) => {
        // Skip if team data is missing or invalid
        if (!(team.teamId && team.teamName)) {
          console.warn("[Team Hub] Skipping invalid team:", team);
          return false;
        }
        // Skip if teamId appears to be from wrong table (data corruption)
        // Convex IDs contain table info - player IDs will have "players" table marker
        if (team.teamId.includes("players")) {
          console.warn(
            `[Team Hub] Skipping corrupted teamId (player ID): ${team.teamId}`
          );
          return false;
        }
        return true;
      })
      .map((team) => ({
        _id: team.teamId,
        name: team.teamName,
        sportCode: team.sportCode,
        ageGroup: team.ageGroup,
        gender: team.gender,
        isActive: team.isActive,
      }));
  }, [coachAssignments?.teams]);

  // Get team player links to derive player counts per team
  const teamPlayerLinks = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    orgId ? { organizationId: orgId, status: "active" } : "skip"
  );

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

  // Auto-select single team when coachTeams loads with exactly 1 team
  useEffect(() => {
    if (coachTeams.length === 1) {
      setSelectedTeamId(coachTeams[0]._id);
    }
  }, [coachTeams.length, coachTeams[0]?._id]);

  // displayTeamId for tab content — always a specific team
  const displayTeamId =
    selectedTeamId === "all"
      ? (coachTeams[0]?._id ?? null)
      : selectedTeamId || (coachTeams[0]?._id ?? null);

  const allTeamIds = useMemo(() => coachTeams.map((t) => t._id), [coachTeams]);

  // Per-team summary stats for card indicators
  const teamSummaryStats = useQuery(
    api.models.teams.getTeamSummaryStats,
    userId && orgId && allTeamIds.length > 0
      ? { teamIds: allTeamIds, organizationId: orgId, userId }
      : "skip"
  );

  const statsByTeam = useMemo(() => {
    const map = new Map<
      string,
      { activeInjuries: number; openTasks: number; unreadInsights: number }
    >();
    for (const s of teamSummaryStats ?? []) {
      map.set(s.teamId, {
        activeInjuries: s.activeInjuries,
        openTasks: s.openTasks + s.inProgressTasks,
        unreadInsights: s.unreadInsights,
      });
    }
    return map;
  }, [teamSummaryStats]);

  // Check if user is head coach
  const isHeadCoach = coachAssignments?.roles?.includes("head_coach") ?? false;

  // Handle tab change - update URL
  const handleTabChange = (newTab: string) => {
    const urlParams = new URLSearchParams(searchParams);
    urlParams.set("tab", newTab);
    router.replace(`?${urlParams.toString()}`);
  };

  return (
    <div className="space-y-6">
      <OrgThemedGradient className="rounded-lg p-4 shadow-md md:p-6">
        <div className="flex items-center gap-2 md:gap-3">
          <Users className="h-7 w-7 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-xl md:text-2xl">
              Team Collaboration Hub
            </h1>
            <p className="text-sm opacity-90">
              Real-time collaboration and team management
            </p>
          </div>
        </div>
      </OrgThemedGradient>

      {/* Quick stats */}
      {orgId &&
        coachTeams.length > 0 &&
        (selectedTeamId === "all" && coachTeams.length > 1 ? (
          <QuickStatsPanel organizationId={orgId} teamIds={allTeamIds} />
        ) : displayTeamId ? (
          <QuickStatsPanel organizationId={orgId} teamId={displayTeamId} />
        ) : null)}

      {/* Team selector — clickable cards, one per team */}
      {coachTeams.length > 0 && (
        <div>
          <button
            className="mb-3 flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-gray-50"
            onClick={() => setTeamsExpanded((prev) => !prev)}
            type="button"
          >
            <span className="font-semibold text-gray-700 text-sm">
              {selectedTeamId === "all" || !selectedTeamId
                ? "All Teams"
                : `${coachTeams.find((t) => t._id === selectedTeamId)?.name ?? "All Teams"} · selected`}
            </span>
            {teamsExpanded ? (
              <ChevronUp className="text-gray-500" size={18} />
            ) : (
              <ChevronDown className="text-gray-500" size={18} />
            )}
          </button>
          {teamsExpanded && (
            <div
              className={`grid gap-3 md:gap-4 ${coachTeams.length === 1 ? "max-w-xs grid-cols-1" : "grid-cols-2 md:grid-cols-4"}`}
            >
              {coachTeams.length > 1 && (
                <Card
                  className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
                    selectedTeamId === "all" ? "ring-2 ring-green-500" : ""
                  }`}
                  onClick={() => setSelectedTeamId("all")}
                  style={{
                    backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                    borderColor: "rgba(var(--org-primary-rgb), 0.25)",
                  }}
                >
                  <CardContent className="p-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm leading-tight">
                          All Teams
                        </p>
                        <p className="text-gray-500 text-xs">
                          {coachTeams.length} teams
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800 text-lg leading-tight">
                          {coachTeams.reduce(
                            (sum, t) =>
                              sum + (playerCountByTeam.get(t._id) ?? 0),
                            0
                          )}
                        </p>
                        <p className="text-gray-500 text-xs">players</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {coachTeams.map((team) => {
                const isSelected = selectedTeamId === team._id;
                const playerCount = playerCountByTeam.get(team._id) ?? 0;
                const ageMeta = [team.ageGroup, team.gender]
                  .filter(Boolean)
                  .join(" • ");
                return (
                  <Card
                    className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${isSelected ? "ring-2 ring-green-500" : ""}`}
                    key={team._id}
                    onClick={() => setSelectedTeamId(team._id)}
                    style={{
                      backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                      borderColor: "rgba(var(--org-primary-rgb), 0.25)",
                    }}
                  >
                    <CardContent className="p-2.5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-semibold text-gray-800 text-sm leading-tight"
                            title={team.name}
                          >
                            {team.name}
                          </p>
                          {ageMeta && (
                            <p className="text-gray-500 text-xs">{ageMeta}</p>
                          )}
                        </div>
                        <div className="ml-2 shrink-0 text-right">
                          <p className="font-bold text-gray-800 text-sm leading-tight">
                            {playerCount}
                          </p>
                          <p className="text-gray-500 text-xs">players</p>
                        </div>
                      </div>
                      {(() => {
                        const s = statsByTeam.get(team._id);
                        return (
                          <div className="flex flex-wrap gap-1">
                            <Badge
                              className="bg-red-100 text-red-700"
                              title="Active Injuries"
                            >
                              <AlertCircle className="h-3 w-3" />
                              <span className="ml-0.5">
                                {s?.activeInjuries ?? 0}
                              </span>
                            </Badge>
                            <Badge
                              className="bg-orange-100 text-orange-700"
                              title="Open Tasks"
                            >
                              <CheckSquare className="h-3 w-3" />
                              <span className="ml-0.5">
                                {s?.openTasks ?? 0}
                              </span>
                            </Badge>
                            <Badge
                              className="bg-purple-100 text-purple-700"
                              title="Unread Insights"
                            >
                              <Lightbulb className="h-3 w-3" />
                              <span className="ml-0.5">
                                {s?.unreadInsights ?? 0}
                              </span>
                            </Badge>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation and Content */}
      {displayTeamId && orgId && userId ? (
        <Card>
          <CardContent className="pt-6">
            <Tabs onValueChange={handleTabChange} value={currentTab}>
              <TabsList className="mb-6 w-full overflow-x-auto overflow-y-hidden md:w-auto">
                <TabsTrigger
                  className="flex items-center gap-2"
                  value="overview"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger
                  className="flex items-center gap-2"
                  value="players"
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Players</span>
                </TabsTrigger>
                <TabsTrigger
                  className="flex items-center gap-2"
                  value="planning"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Planning</span>
                </TabsTrigger>
                <TabsTrigger
                  className="flex items-center gap-2"
                  value="activity"
                >
                  <ActivitySquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Activity</span>
                </TabsTrigger>
                <TabsTrigger
                  className="flex items-center gap-2"
                  value="decisions"
                >
                  <Vote className="h-4 w-4" />
                  <span className="hidden sm:inline">Decisions</span>
                </TabsTrigger>
                <TabsTrigger className="flex items-center gap-2" value="tasks">
                  <CheckSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Tasks</span>
                </TabsTrigger>
                <TabsTrigger
                  className="flex items-center gap-2"
                  value="insights"
                >
                  <Lightbulb className="h-4 w-4" />
                  <span className="hidden sm:inline">Insights</span>
                </TabsTrigger>
                <TabsTrigger
                  className="flex items-center gap-2"
                  value="wellness"
                >
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">Wellness</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <OverviewTab
                  organizationId={params.orgId}
                  teamId={displayTeamId}
                />
              </TabsContent>

              <TabsContent value="players">
                <PlayersTab
                  organizationId={params.orgId}
                  teamId={displayTeamId}
                />
              </TabsContent>

              <TabsContent value="planning">
                <PlanningTab
                  organizationId={orgId}
                  teamId={displayTeamId || ""}
                />
              </TabsContent>

              <TabsContent value="activity">
                <ActivityTab organizationId={orgId} teamId={displayTeamId} />
              </TabsContent>

              <TabsContent value="decisions">
                <DecisionsTab
                  currentUserId={userId}
                  isHeadCoach={isHeadCoach}
                  organizationId={orgId}
                  teamId={displayTeamId}
                />
              </TabsContent>

              <TabsContent value="tasks">
                <TasksTab
                  currentUserId={userId || ""}
                  currentUserName={
                    session?.user?.name || session?.user?.email || "Unknown"
                  }
                  organizationId={orgId}
                  teamId={displayTeamId}
                />
              </TabsContent>

              <TabsContent value="insights">
                <InsightsTab organizationId={orgId} teamId={displayTeamId} />
              </TabsContent>

              <TabsContent value="wellness">
                <WellnessTab
                  coachName={
                    session?.user?.name || session?.user?.email || "Coach"
                  }
                  coachUserId={userId || ""}
                  organizationId={orgId}
                  teamId={displayTeamId}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Empty>
          <EmptyMedia>
            <Users className="h-12 w-12 text-muted-foreground" />
          </EmptyMedia>
          <EmptyContent>
            <EmptyTitle>No Team Selected</EmptyTitle>
            <EmptyDescription>
              {coachTeams.length === 0
                ? "You have no teams assigned. Contact your organization administrator."
                : "Select a team above to view activity feed and presence."}
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
