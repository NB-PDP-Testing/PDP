"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  ActivitySquare,
  Calendar,
  CheckSquare,
  Heart,
  LayoutDashboard,
  Lightbulb,
  Users,
  Vote,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PresenceIndicators } from "./components/presence-indicators";
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

  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

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

  // Auto-select first team when coachTeams loads (only if not already set)
  useEffect(() => {
    if (coachTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(coachTeams[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachTeams.length, selectedTeamId]);

  // Determine which team to show
  const displayTeamId =
    coachTeams.length === 1
      ? coachTeams[0]._id // Single team - always show it
      : selectedTeamId
        ? selectedTeamId
        : coachTeams.length > 0
          ? coachTeams[0]._id
          : null;

  // Check if user is head coach
  const isHeadCoach = coachAssignments?.roles?.includes("head_coach") ?? false;

  // Handle tab change - update URL
  const handleTabChange = (newTab: string) => {
    const urlParams = new URLSearchParams(searchParams);
    urlParams.set("tab", newTab);
    router.replace(`?${urlParams.toString()}`);
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Team Collaboration Hub</h1>
          <p className="mt-2 text-muted-foreground">
            Real-time collaboration and team management
          </p>
        </div>
      </div>

      {/* Team selector — clickable cards, one per team */}
      {coachTeams.length > 0 && (
        <div
          className={`grid gap-4 ${coachTeams.length === 1 ? "max-w-sm grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}
        >
          {coachTeams.map((team) => {
            const isSelected = displayTeamId === team._id;
            const playerCount = playerCountByTeam.get(team._id) ?? 0;
            const meta = [team.ageGroup, team.gender, team.sportCode]
              .filter(Boolean)
              .join(" • ");
            return (
              <Card
                className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
                  isSelected ? "border-2 border-green-500 bg-green-50" : ""
                }`}
                key={team._id}
                onClick={() => setSelectedTeamId(team._id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle
                        className="truncate text-lg md:text-xl"
                        title={team.name}
                      >
                        {team.name}
                      </CardTitle>
                      <p className="text-gray-600 text-xs md:text-sm">
                        {playerCount} Players
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0 text-right">
                      {meta && (
                        <p className="whitespace-nowrap text-gray-500 text-xs">
                          {meta}
                        </p>
                      )}
                      {isSelected && displayTeamId && (
                        <div className="mt-1">
                          <PresenceIndicators
                            organizationId={orgId}
                            teamId={displayTeamId}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
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
