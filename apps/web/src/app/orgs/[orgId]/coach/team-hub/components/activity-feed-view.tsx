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
import { ListSkeleton } from "@/components/loading/list-skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ActivityFeedViewProps {
  teamId: string;
  organizationId: string;
}

export function ActivityFeedView({
  teamId,
  organizationId,
}: ActivityFeedViewProps) {
  const activities = useQuery(
    api.models.teamCollaboration.getTeamActivityFeed,
    {
      teamId,
      organizationId,
    }
  );

  if (!activities) {
    // Loading skeleton - 5 items
    return <ListSkeleton items={5} />;
  }

  if (activities.length === 0) {
    // Empty state
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          No recent activity - start by adding voice notes or comments!
        </p>
      </div>
    );
  }

  return (
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
        const { icon: Icon, color } = getActivityIcon(activity.actionType);

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
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
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
              <p className="text-muted-foreground text-xs">{relativeTime}</p>
            </div>
          </div>
        );
      })}
    </div>
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
