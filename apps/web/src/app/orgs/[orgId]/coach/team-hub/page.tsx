"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  ActivitySquare,
  Calendar,
  CheckSquare,
  LayoutDashboard,
  Lightbulb,
  Users,
  Vote,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
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

type TabValue =
  | "overview"
  | "players"
  | "planning"
  | "activity"
  | "decisions"
  | "tasks"
  | "insights";

export default function TeamHubPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId as BetterAuthId<"organization">;
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const coachTeams = useMemo(() => {
    if (!coachAssignments?.teams) {
      return [];
    }
    return coachAssignments.teams.map((team) => ({
      _id: team.teamId,
      name: team.teamName,
      sportCode: team.sportCode,
      ageGroup: team.ageGroup,
      gender: team.gender,
      isActive: team.isActive,
    }));
  }, [coachAssignments?.teams]);

  // Determine which team to show
  const displayTeamId =
    selectedTeamId === "all" && coachTeams.length > 0
      ? coachTeams[0]._id
      : selectedTeamId !== "all"
        ? selectedTeamId
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

      {/* Team Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Team</CardTitle>
          <CardDescription>
            View activity feed and presence for your teams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select onValueChange={setSelectedTeamId} value={selectedTeamId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {coachTeams.length > 0 ? (
                  coachTeams.map((team) => (
                    <SelectItem key={team._id} value={team._id}>
                      {team.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem disabled value="none">
                    No teams assigned
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {displayTeamId && (
              <PresenceIndicators
                organizationId={orgId}
                teamId={displayTeamId}
              />
            )}
          </div>
        </CardContent>
      </Card>

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
              </TabsList>

              <TabsContent value="overview">
                <OverviewTab
                  organizationId={params.orgId}
                  teamId={displayTeamId}
                />
              </TabsContent>

              <TabsContent value="players">
                <PlayersTab />
              </TabsContent>

              <TabsContent value="planning">
                <PlanningTab />
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
                <TasksTab />
              </TabsContent>

              <TabsContent value="insights">
                <InsightsTab />
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
