"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  Circle,
  Flag,
  MessageCircle,
  Mic,
  Star,
  UserCheck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ListSkeleton } from "@/components/loading/list-skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ActivityFeedViewProps {
  teamId: string;
  organizationId: string;
}

type FilterType =
  | "all"
  | "insights"
  | "comments"
  | "reactions"
  | "sessions"
  | "votes";

export function ActivityFeedView({
  teamId,
  organizationId,
}: ActivityFeedViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = (searchParams.get("filter") as FilterType) || "all";

  // Query with current filter
  const activities = useQuery(
    api.models.teamCollaboration.getTeamActivityFeed,
    {
      teamId,
      organizationId,
      filterType: currentFilter,
    }
  );

  // Query for counts (always get all activities to calculate tab counts)
  const allActivities = useQuery(
    api.models.teamCollaboration.getTeamActivityFeed,
    {
      teamId,
      organizationId,
      filterType: "all",
      limit: 100, // Get enough to calculate accurate counts
    }
  );

  // Calculate counts by filter type
  const counts = {
    all: allActivities?.length || 0,
    insights:
      allActivities?.filter((a) =>
        ["voice_note_added", "insight_applied"].includes(a.actionType)
      ).length || 0,
    comments:
      allActivities?.filter((a) => a.actionType === "comment_added").length ||
      0,
    reactions: 0, // Not implemented yet
    sessions: 0, // Not implemented yet
    votes: 0, // Not implemented yet
  };

  // Handle filter change
  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("filter");
    } else {
      params.set("filter", value);
    }
    router.push(`?${params.toString()}`);
  };

  if (!activities) {
    // Loading skeleton - 5 items
    return (
      <div className="space-y-4">
        <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
        <ListSkeleton items={5} />
      </div>
    );
  }

  return (
    <Tabs onValueChange={handleFilterChange} value={currentFilter}>
      <TabsList>
        <TabsTrigger value="all">
          All{" "}
          <Badge className="ml-1" variant="secondary">
            {counts.all}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="insights">
          Insights{" "}
          <Badge className="ml-1" variant="secondary">
            {counts.insights}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="comments">
          Comments{" "}
          <Badge className="ml-1" variant="secondary">
            {counts.comments}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="reactions">
          Reactions{" "}
          <Badge className="ml-1" variant="secondary">
            {counts.reactions}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="sessions">
          Sessions{" "}
          <Badge className="ml-1" variant="secondary">
            {counts.sessions}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="votes">
          Votes{" "}
          <Badge className="ml-1" variant="secondary">
            {counts.votes}
          </Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value={currentFilter}>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No activity in this category yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const initials = activity.actorName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .substring(0, 2);

              // Format relative timestamp
              const relativeTime = formatDistanceToNow(activity._creationTime, {
                addSuffix: true,
              });

              // Get icon and color based on action type
              const { icon: Icon, color } = getActivityIcon(
                activity.actionType
              );

              // Get priority color
              const priorityColor = getPriorityColor(activity.priority);

              return (
                <div
                  className="flex gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  key={activity._id}
                >
                  {/* Actor Avatar */}
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage
                      alt={activity.actorName}
                      src={activity.actorAvatar}
                    />
                    <AvatarFallback className="text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {/* Action Icon */}
                      <Icon className={`h-4 w-4 ${color}`} />

                      {/* Summary */}
                      <span className="font-medium text-foreground text-sm">
                        {activity.summary}
                      </span>

                      {/* Priority Indicator */}
                      {activity.priority !== "normal" && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs ${priorityColor}`}
                        >
                          {activity.priority === "critical" && (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {activity.priority === "important" && (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {activity.priority === "critical"
                            ? "Critical"
                            : "Important"}
                        </span>
                      )}
                    </div>

                    {/* Timestamp */}
                    <p className="text-muted-foreground text-xs">
                      {relativeTime}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

/**
 * Get icon and color for action type
 */
function getActivityIcon(actionType: string): {
  icon: typeof MessageCircle;
  color: string;
} {
  switch (actionType) {
    case "voice_note_added":
      return { icon: Mic, color: "text-blue-500" };
    case "insight_applied":
      return { icon: Star, color: "text-yellow-500" };
    case "comment_added":
      return { icon: MessageCircle, color: "text-green-500" };
    case "player_assessed":
      return { icon: UserCheck, color: "text-purple-500" };
    case "goal_created":
      return { icon: Flag, color: "text-orange-500" };
    case "injury_logged":
      return { icon: AlertCircle, color: "text-red-500" };
    default:
      return { icon: Circle, color: "text-gray-500" };
  }
}

/**
 * Get priority color classes
 */
function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "important":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
}
