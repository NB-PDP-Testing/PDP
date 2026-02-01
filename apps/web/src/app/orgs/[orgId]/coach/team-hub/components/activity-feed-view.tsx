"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  Circle,
  Flag,
  Loader2,
  MessageCircle,
  Mic,
  Star,
  UserCheck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ListSkeleton } from "@/components/loading/list-skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type Activity = {
  _id: string;
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  actionType: string;
  entityType: string;
  entityId: string;
  summary: string;
  priority: "critical" | "important" | "normal";
  metadata?: {
    playerName?: string;
    insightTitle?: string;
    commentPreview?: string;
  };
  _creationTime: number;
};

export function ActivityFeedView({
  teamId,
  organizationId,
}: ActivityFeedViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = (searchParams.get("filter") as FilterType) || "all";

  // Pagination state (only used for "all" filter)
  const [paginatedActivities, setPaginatedActivities] = useState<Activity[]>(
    []
  );
  const [cursor, setCursor] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Query with current filter
  // For "all" filter with pagination, we'll handle it separately
  const shouldUsePagination = currentFilter === "all";

  // Initial paginated query for "all" filter
  const paginatedResult = useQuery(
    api.models.teamCollaboration.getTeamActivityFeed,
    shouldUsePagination
      ? {
          teamId,
          organizationId,
          filterType: "all",
          paginationOpts: {
            cursor: null,
            numItems: 50,
          },
        }
      : "skip"
  );

  // Non-paginated query for filtered views
  const filteredActivities = useQuery(
    api.models.teamCollaboration.getTeamActivityFeed,
    shouldUsePagination
      ? "skip"
      : {
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

  // Initialize paginated activities when first page loads
  useEffect(() => {
    if (
      shouldUsePagination &&
      paginatedResult &&
      typeof paginatedResult === "object" &&
      "page" in paginatedResult
    ) {
      setPaginatedActivities(paginatedResult.page);
      setCursor(paginatedResult.continueCursor);
      setIsDone(paginatedResult.isDone);
    }
  }, [paginatedResult, shouldUsePagination]);

  // Reset pagination when filter changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentFilter is intentionally used to reset pagination
  useEffect(() => {
    setPaginatedActivities([]);
    setCursor(null);
    setIsDone(false);
  }, [currentFilter]);

  // Load more handler
  const loadMoreQuery = useQuery(
    api.models.teamCollaboration.getTeamActivityFeed,
    isLoadingMore && cursor
      ? {
          teamId,
          organizationId,
          filterType: "all",
          paginationOpts: {
            cursor,
            numItems: 50,
          },
        }
      : "skip"
  );

  // Handle load more result
  useEffect(() => {
    if (
      isLoadingMore &&
      loadMoreQuery &&
      typeof loadMoreQuery === "object" &&
      "page" in loadMoreQuery
    ) {
      setPaginatedActivities((prev) => [...prev, ...loadMoreQuery.page]);
      setCursor(loadMoreQuery.continueCursor);
      setIsDone(loadMoreQuery.isDone);
      setIsLoadingMore(false);
    }
  }, [loadMoreQuery, isLoadingMore]);

  const handleLoadMore = () => {
    if (!(isLoadingMore || isDone) && cursor) {
      setIsLoadingMore(true);
    }
  };

  // Calculate counts by filter type
  const counts = {
    all: Array.isArray(allActivities) ? allActivities.length : 0,
    insights: Array.isArray(allActivities)
      ? allActivities.filter((a) =>
          ["voice_note_added", "insight_applied"].includes(a.actionType)
        ).length
      : 0,
    comments: Array.isArray(allActivities)
      ? allActivities.filter((a) => a.actionType === "comment_added").length
      : 0,
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

  // Loading state
  const isLoading = shouldUsePagination
    ? !paginatedResult
    : !filteredActivities;

  if (isLoading) {
    // Loading skeleton - 5 items
    return (
      <div className="space-y-4">
        <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
        <ListSkeleton items={5} />
      </div>
    );
  }

  // Determine which activities to display - type-safe
  const displayActivities: Activity[] = shouldUsePagination
    ? paginatedActivities
    : Array.isArray(filteredActivities)
      ? filteredActivities
      : [];

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
        {displayActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No activity in this category yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayActivities.map((activity: Activity) => {
              const initials = activity.actorName
                .split(" ")
                .map((n: string) => n[0])
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

            {/* Load More Button (only for "all" filter with pagination) */}
            {shouldUsePagination && !isDone && (
              <div className="flex justify-center pt-4">
                <Button
                  disabled={isLoadingMore}
                  onClick={handleLoadMore}
                  variant="outline"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
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
