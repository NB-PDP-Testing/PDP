"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ParentSummaryCard } from "./parent-summary-card";

type CoachFeedbackProps = {
  orgId: string;
};

export function CoachFeedback({ orgId }: CoachFeedbackProps) {
  // Fetch AI-generated summaries grouped by child and sport
  const summariesData = useQuery(
    api.models.coachParentSummaries.getParentSummariesByChildAndSport,
    {
      organizationId: orgId,
    }
  );

  // Mark summary as viewed mutation
  const markViewed = useMutation(
    api.models.coachParentSummaries.markSummaryViewed
  );

  const handleViewSummary = async (summaryId: Id<"coachParentSummaries">) => {
    try {
      await markViewed({
        summaryId,
        viewSource: "dashboard",
      });
      // Silently mark as viewed - no toast needed
    } catch (error) {
      console.error("Failed to mark summary as read:", error);
    }
  };

  // Show only if we have AI summaries
  const hasSummaries = summariesData && summariesData.length > 0;

  if (!hasSummaries) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          AI Coach Summaries
        </CardTitle>
        <CardDescription>
          AI-generated summaries from your coach's voice notes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {summariesData?.map((childData) => (
            <div key={childData.player._id}>
              {/* Child name header */}
              <h3 className="mb-3 font-semibold text-lg">
                {childData.player.firstName} {childData.player.lastName}
              </h3>

              {/* Sport groups for this child */}
              <div className="space-y-4">
                {childData.sportGroups.map((sportGroup) => (
                  <div key={sportGroup.sport?._id || `sport-${Math.random()}`}>
                    {/* Sport name subheader */}
                    {sportGroup.sport && (
                      <h4 className="mb-2 flex items-center gap-2 font-medium text-muted-foreground text-sm">
                        {sportGroup.sport.name}
                        {sportGroup.unreadCount > 0 && (
                          <span className="rounded-full bg-red-500 px-2 py-0.5 text-white text-xs">
                            {sportGroup.unreadCount} new
                          </span>
                        )}
                      </h4>
                    )}

                    {/* Summary cards */}
                    <div className="space-y-2">
                      {sportGroup.summaries.map((summary) => (
                        <ParentSummaryCard
                          isUnread={!summary.viewedAt}
                          key={summary._id}
                          onView={handleViewSummary}
                          summary={summary}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
