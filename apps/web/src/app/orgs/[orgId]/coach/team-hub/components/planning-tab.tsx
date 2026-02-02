"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeasonTimeline } from "./season-timeline";
import { SessionPlanList } from "./session-plan-list";

type PlanningTabProps = {
  teamId: string;
  organizationId: string;
};

export function PlanningTab({ teamId, organizationId }: PlanningTabProps) {
  // Fetch session plans for this team
  const sessions = useQuery(api.models.sessionPlans.listByTeam, {
    teamId,
    organizationId,
  });

  // Fetch season milestones
  const milestones = useQuery(api.models.sessionPlans.getSeasonMilestones, {
    teamId,
  });

  const isLoadingSessions = sessions === undefined;
  const isLoadingMilestones = milestones === undefined;

  return (
    <div className="space-y-6">
      {/* Header with New Session Plan button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Session Planning</h2>
          <p className="text-muted-foreground text-sm">
            Manage training sessions and track season progress
          </p>
        </div>
        <Button className="gap-2" size="sm">
          <Plus className="h-4 w-4" />
          New Session Plan
        </Button>
      </div>

      {/* Season Timeline */}
      {!isLoadingMilestones && milestones && (
        <SeasonTimeline
          keyDates={milestones.keyDates}
          seasonEnd={milestones.seasonEnd}
          seasonStart={milestones.seasonStart}
        />
      )}

      {/* Session Plan List */}
      <div>
        <SessionPlanList
          isLoading={isLoadingSessions}
          organizationId={organizationId}
          sessions={sessions || []}
        />
      </div>
    </div>
  );
}
