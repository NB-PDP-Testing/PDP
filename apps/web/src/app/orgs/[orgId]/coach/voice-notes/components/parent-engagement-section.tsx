"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ParentEngagement = {
  playerName: string;
  playerIdentityId: Id<"playerIdentities">;
  summariesSent: number;
  summariesViewed: number;
  viewRate: number;
  lastViewedAt?: number;
};

type ParentEngagementSectionProps = {
  parentEngagement: ParentEngagement[];
};

/**
 * Get color class for engagement badge based on view rate
 */
function getEngagementColorClass(rate: number): string {
  if (rate < 30) {
    return "bg-red-100 text-red-700 border-red-300 hover:bg-red-200";
  }
  if (rate < 60) {
    return "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200";
  }
  return "bg-green-100 text-green-700 border-green-300 hover:bg-green-200";
}

/**
 * Parent Engagement Section - Phase 8 Week 3 (US-P8-016)
 *
 * Shows bottom 5 parents with lowest view rates to help coaches
 * identify who needs follow-up. Color-coded by engagement level:
 * - Red (<30%): Low engagement, needs attention
 * - Yellow (30-60%): Moderate engagement
 * - Green (>60%): Good engagement
 */
export function ParentEngagementSection({
  parentEngagement,
}: ParentEngagementSectionProps) {
  // Get bottom 5 parents sorted by view rate (ascending)
  const leastEngaged = parentEngagement
    .filter((p) => p.summariesSent > 0) // Only show parents who received summaries
    .sort((a, b) => a.viewRate - b.viewRate) // Sort by view rate ascending (lowest first)
    .slice(0, 5); // Take top 5

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Parent Engagement</CardTitle>
            <p className="text-muted-foreground text-sm">
              Parents who may need follow-up
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {leastEngaged.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            All parents are engaged! 🎉
          </p>
        ) : (
          <div className="space-y-3">
            {leastEngaged.map((parent) => (
              <div
                className="flex items-center justify-between rounded-lg border p-3"
                key={parent.playerIdentityId}
              >
                <div className="flex-1">
                  <p className="font-medium">Parent of {parent.playerName}</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {parent.summariesSent} sent · {parent.summariesViewed}{" "}
                    viewed
                    {parent.lastViewedAt
                      ? ` · Last viewed ${format(parent.lastViewedAt, "MMM d")}`
                      : " · Never viewed"}
                  </p>
                </div>
                <Badge className={getEngagementColorClass(parent.viewRate)}>
                  {parent.viewRate.toFixed(0)}%
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
