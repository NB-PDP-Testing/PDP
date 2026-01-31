"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useQuery } from "convex/react";
import { Users } from "lucide-react";
import { useParams } from "next/navigation";
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
import { authClient } from "@/lib/auth-client";
import { ActivityFeedView } from "./components/activity-feed-view";
import { PresenceIndicators } from "./components/presence-indicators";

export default function TeamHubPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId as BetterAuthId<"organization">;
  const { data: session } = authClient.useSession();

  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");

  // Get current user ID
  const userId = session?.user?.id;

  // Get coach assignments to find which teams this coach has access to
  const coachAssignment = useQuery(
    api.models.coaches.getCoachAssignments,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );

  // Get all teams for the organization
  const allTeams = useQuery(
    api.models.teams.getTeamsByOrganization,
    orgId ? { organizationId: orgId } : "skip"
  );

  // Get team IDs this coach has access to
  const coachTeamIds = useMemo(() => {
    if (!(coachAssignment?.teams && allTeams)) {
      return [];
    }

    // Map team names from coachAssignment to team IDs
    const teamMap = new Map(allTeams.map((team) => [team.name, team._id]));
    return coachAssignment.teams
      .map((teamName) => teamMap.get(teamName))
      .filter((id) => id !== undefined) as string[];
  }, [coachAssignment?.teams, allTeams]);

  // Filter teams to only show those assigned to this coach
  const coachTeams = useMemo(() => {
    if (!allTeams) {
      return [];
    }
    return allTeams.filter((team) => coachTeamIds.includes(team._id));
  }, [allTeams, coachTeamIds]);

  // Determine which team to show
  const displayTeamId =
    selectedTeamId === "all" && coachTeams.length > 0
      ? coachTeams[0]._id
      : selectedTeamId !== "all"
        ? selectedTeamId
        : null;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Team Collaboration Hub</h1>
          <p className="mt-2 text-muted-foreground">
            Real-time activity feed and team presence
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

      {/* Activity Feed */}
      {displayTeamId && orgId ? (
        <Card>
          <CardHeader>
            <CardTitle>Team Activity</CardTitle>
            <CardDescription>
              Recent activity from your team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeedView organizationId={orgId} teamId={displayTeamId} />
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
