"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Activity,
  Bike,
  Dumbbell,
  type LucideIcon,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

// Sport icon mapping (US-019)
const sportCodeToIcon: Record<string, LucideIcon> = {
  GAA: Trophy, // Gaelic Athletic Association
  soccer: Trophy,
  football: Trophy,
  basketball: Dumbbell,
  rugby: Trophy,
  cycling: Bike,
  athletics: Activity,
};

export function CoachFeedback({ orgId }: CoachFeedbackProps) {
  // Fetch AI-generated summaries grouped by child and sport
  const summariesData = useQuery(
    api.models.coachParentSummaries.getParentSummariesByChildAndSport,
    {
      organizationId: orgId,
    }
  );

  // Get sport icon or default
  const getSportIcon = (sportCode?: string) => {
    if (!sportCode) {
      return Activity;
    }
    return sportCodeToIcon[sportCode.toLowerCase()] || Activity;
  };

  // Mark summary as viewed mutation
  const markViewed = useMutation(
    api.models.coachParentSummaries.markSummaryViewed
  );

  // Acknowledge summary mutation
  const acknowledgeSummary = useMutation(
    api.models.coachParentSummaries.acknowledgeParentSummary
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

  const handleAcknowledgeSummary = async (
    summaryId: Id<"coachParentSummaries">
  ) => {
    try {
      await acknowledgeSummary({ summaryId });
      // Success feedback handled by parent-summary-card
    } catch (error) {
      console.error("Failed to acknowledge summary:", error);
      throw error;
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
          {summariesData?.map((childData: any) => (
            <div key={childData.player._id}>
              {/* Child name header */}
              <h3 className="mb-3 font-semibold text-lg">
                {childData.player.firstName} {childData.player.lastName}
              </h3>

              {/* Sport groups for this child */}
              <div className="space-y-4">
                {childData.sportGroups.map((sportGroup: any) => (
                  <div key={sportGroup.sport?._id || `sport-${Math.random()}`}>
                    {/* Sport name subheader with icon (US-019) and badge (US-020) */}
                    {sportGroup.sport && (
                      <h4 className="mb-2 flex items-center gap-2 font-medium text-muted-foreground text-sm">
                        {(() => {
                          const SportIcon = getSportIcon(sportGroup.sport.code);
                          return <SportIcon className="h-4 w-4" />;
                        })()}
                        {sportGroup.sport.name}
                        {sportGroup.unreadCount > 0 && (
                          <Badge variant="destructive">
                            {sportGroup.unreadCount}
                          </Badge>
                        )}
                      </h4>
                    )}

                    {/* Summary cards */}
                    <div className="space-y-2">
                      {sportGroup.summaries.map((summary: any) => (
                        <ParentSummaryCard
                          isUnread={!summary.acknowledgedAt}
                          key={summary._id}
                          onAcknowledge={handleAcknowledgeSummary}
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
