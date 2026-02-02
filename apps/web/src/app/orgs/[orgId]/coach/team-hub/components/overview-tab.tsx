"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HealthSafetyWidget } from "./health-safety-widget";
import { PresenceIndicators } from "./presence-indicators";
import { QuickStatsPanel } from "./quick-stats-panel";
import { UpcomingEventsWidget } from "./upcoming-events-widget";

type OverviewTabProps = {
  teamId: string;
  organizationId: string;
};

export function OverviewTab({ teamId, organizationId }: OverviewTabProps) {
  const router = useRouter();

  // Fetch first 10 activity items for summary
  const activityData = useQuery(
    api.models.teamCollaboration.getTeamActivityFeed,
    {
      teamId,
      organizationId,
      filterType: "all",
      paginationOpts: {
        cursor: null,
        numItems: 10,
      },
    }
  );

  const activityItems =
    activityData && !Array.isArray(activityData) ? activityData.page : [];

  return (
    <div className="space-y-6">
      {/* Presence Indicators */}
      <div>
        <PresenceIndicators organizationId={organizationId} teamId={teamId} />
      </div>

      {/* Quick Stats Panel */}
      <QuickStatsPanel organizationId={organizationId} teamId={teamId} />

      {/* Two Column Layout: Widgets (left) + Activity Feed (right) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Widgets */}
        <div className="space-y-6">
          <HealthSafetyWidget organizationId={organizationId} teamId={teamId} />
          <UpcomingEventsWidget teamId={teamId} />
        </div>

        {/* Right Column: Activity Feed Summary */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <button
                  className="flex items-center gap-1 text-primary text-sm hover:underline"
                  onClick={() =>
                    router.push(
                      `/orgs/${organizationId}/coach/team-hub?tab=activity` as any
                    )
                  }
                  type="button"
                >
                  View all activity
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {activityData ? (
                activityItems.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    No recent activity
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityItems.map((activity) => {
                      const initials = activity.actorName
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .substring(0, 2);

                      const getPriorityBadge = (priority: string) => {
                        switch (priority) {
                          case "critical":
                            return (
                              <Badge variant="destructive">Critical</Badge>
                            );
                          case "important":
                            return <Badge variant="default">Important</Badge>;
                          default:
                            return null;
                        }
                      };

                      return (
                        <div
                          className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                          key={activity._id}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              alt={activity.actorName}
                              src={activity.actorAvatar}
                            />
                            <AvatarFallback className="text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm">
                                  <span className="font-medium">
                                    {activity.actorName}
                                  </span>{" "}
                                  {activity.summary}
                                </p>
                              </div>
                              {getPriorityBadge(activity.priority)}
                            </div>
                            <p className="text-muted-foreground text-xs">
                              {formatDistanceToNow(activity._creationTime, {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton className="h-16 w-full" key={i} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
