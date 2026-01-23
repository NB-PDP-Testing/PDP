"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ChildSummaryCard } from "./child-summary-card";
import { CoachFeedback } from "./coach-feedback";

type CoachFeedbackWithChildCardsProps = {
  orgId: string;
};

export function CoachFeedbackWithChildCards({
  orgId,
}: CoachFeedbackWithChildCardsProps) {
  // Fetch AI-generated summaries grouped by child and sport
  const summariesData = useQuery(
    api.models.coachParentSummaries.getParentSummariesByChildAndSport,
    {
      organizationId: orgId,
    }
  );

  // Show nothing if we have no data yet
  if (!summariesData || summariesData.length === 0) {
    return <CoachFeedback orgId={orgId} />;
  }

  return (
    <div className="space-y-6">
      {/* Child Summary Cards Grid (US-009) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {summariesData.map((childData: any) => {
          // Calculate total unread count for this child
          const unreadCount = childData.sportGroups.reduce(
            (sum: number, sportGroup: any) => sum + sportGroup.unreadCount,
            0
          );

          return (
            <ChildSummaryCard
              key={childData.player._id}
              orgId={orgId}
              player={childData.player}
              unreadCount={unreadCount}
            />
          );
        })}
      </div>

      {/* Coach Feedback Component */}
      <CoachFeedback orgId={orgId} />
    </div>
  );
}
