"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Bell,
  Flag,
  Lightbulb,
  MessageCircle,
  Mic,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ListSkeleton } from "@/components/loading/list-skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/use-current-user";

interface NotificationCenterProps {
  organizationId: string;
}

export function NotificationCenter({
  organizationId,
}: NotificationCenterProps) {
  const router = useRouter();
  const user = useCurrentUser();
  const markAsRead = useMutation(
    api.models.teamCollaboration.markActivityAsRead
  );

  // Get unread notifications
  const notificationsData = useQuery(
    api.models.teamCollaboration.getUnreadNotifications,
    user?._id
      ? {
          userId: user._id,
          organizationId,
          limit: 50,
        }
      : "skip"
  );

  const handleNotificationClick = async (
    activityId: Id<"teamActivityFeed">,
    entityType: string,
    entityId: string
  ) => {
    if (!user?._id) {
      return;
    }

    // Mark as read
    await markAsRead({
      activityId,
      userId: user._id,
      organizationId,
    });

    // Navigate to target
    const targetUrl = getNavigationUrl(entityType, entityId, organizationId);
    if (targetUrl) {
      router.push(targetUrl as any);
    }
  };

  const getNavigationUrl = (
    entityType: string,
    entityId: string,
    orgId: string
  ): string | null => {
    switch (entityType) {
      case "voice_note":
        return `/orgs/${orgId}/coach/voice-notes?noteId=${entityId}`;
      case "insight":
        return `/orgs/${orgId}/coach/voice-notes?noteId=${entityId}`;
      case "comment":
        return `/orgs/${orgId}/coach/voice-notes?noteId=${entityId}`;
      case "skill_assessment":
        return `/orgs/${orgId}/coach/voice-notes`;
      case "goal":
        return `/orgs/${orgId}/coach/goals`;
      case "injury":
        return `/orgs/${orgId}/coach/voice-notes`;
      default:
        return null;
    }
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case "voice_note_added":
        return <Mic className="h-4 w-4 text-blue-500" />;
      case "insight_applied":
        return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case "comment_added":
        return <MessageCircle className="h-4 w-4 text-green-500" />;
      case "player_assessed":
        return <UserCheck className="h-4 w-4 text-purple-500" />;
      case "goal_created":
        return <Flag className="h-4 w-4 text-indigo-500" />;
      case "injury_logged":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return (
          <Badge className="ml-auto text-xs" variant="destructive">
            Critical
          </Badge>
        );
      case "important":
        return (
          <Badge
            className="ml-auto bg-yellow-500 text-white text-xs hover:bg-yellow-600"
            variant="secondary"
          >
            Important
          </Badge>
        );
      default:
        return null;
    }
  };

  const getInitials = (name: string): string => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const groupByPriority = (notifications: typeof notificationsData) => {
    if (!notifications) {
      return { critical: [], important: [], normal: [] };
    }

    const groups = {
      critical: [] as typeof notifications.notifications,
      important: [] as typeof notifications.notifications,
      normal: [] as typeof notifications.notifications,
    };

    for (const notification of notifications.notifications) {
      if (notification.priority === "critical") {
        groups.critical.push(notification);
      } else if (notification.priority === "important") {
        groups.important.push(notification);
      } else {
        groups.normal.push(notification);
      }
    }

    return groups;
  };

  const grouped = groupByPriority(notificationsData);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="relative" size="icon" variant="ghost">
          <Bell className="h-5 w-5" />
          {notificationsData && notificationsData.unreadCount > 0 && (
            <Badge
              className="-right-1 -top-1 absolute h-5 w-5 rounded-full p-0 text-xs"
              variant="destructive"
            >
              {notificationsData.unreadCount > 99
                ? "99+"
                : notificationsData.unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {!notificationsData && <ListSkeleton items={3} />}

        {notificationsData && notificationsData.unreadCount === 0 && (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No new notifications
          </div>
        )}

        {notificationsData && notificationsData.unreadCount > 0 && (
          <div className="max-h-[400px] overflow-y-auto">
            {/* Critical notifications */}
            {grouped.critical.length > 0 && (
              <>
                <div className="px-2 py-1 font-semibold text-red-600 text-xs">
                  Critical
                </div>
                {grouped.critical.map(
                  (notification: (typeof grouped.critical)[number]) => (
                    <DropdownMenuItem
                      className="cursor-pointer p-3 hover:bg-muted/50"
                      key={notification._id}
                      onClick={() => {
                        handleNotificationClick(
                          notification._id,
                          notification.entityType,
                          notification.entityId
                        );
                      }}
                    >
                      <div className="flex w-full items-start gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={notification.actorAvatar} />
                          <AvatarFallback className="text-xs">
                            {getInitials(notification.actorName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start gap-2">
                            {getActivityIcon(notification.actionType)}
                            <p className="flex-1 text-sm">
                              {notification.summary}
                            </p>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {formatDistanceToNow(notification._creationTime, {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        {getPriorityBadge(notification.priority)}
                      </div>
                    </DropdownMenuItem>
                  )
                )}
                <DropdownMenuSeparator />
              </>
            )}

            {/* Important notifications */}
            {grouped.important.length > 0 && (
              <>
                <div className="px-2 py-1 font-semibold text-xs text-yellow-600">
                  Important
                </div>
                {grouped.important.map(
                  (notification: (typeof grouped.important)[number]) => (
                    <DropdownMenuItem
                      className="cursor-pointer p-3 hover:bg-muted/50"
                      key={notification._id}
                      onClick={() => {
                        handleNotificationClick(
                          notification._id,
                          notification.entityType,
                          notification.entityId
                        );
                      }}
                    >
                      <div className="flex w-full items-start gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={notification.actorAvatar} />
                          <AvatarFallback className="text-xs">
                            {getInitials(notification.actorName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start gap-2">
                            {getActivityIcon(notification.actionType)}
                            <p className="flex-1 text-sm">
                              {notification.summary}
                            </p>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {formatDistanceToNow(notification._creationTime, {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        {getPriorityBadge(notification.priority)}
                      </div>
                    </DropdownMenuItem>
                  )
                )}
                <DropdownMenuSeparator />
              </>
            )}

            {/* Normal notifications */}
            {grouped.normal.length > 0 && (
              <>
                <div className="px-2 py-1 font-semibold text-gray-600 text-xs">
                  Other
                </div>
                {grouped.normal.map(
                  (notification: (typeof grouped.normal)[number]) => (
                    <DropdownMenuItem
                      className="cursor-pointer p-3 hover:bg-muted/50"
                      key={notification._id}
                      onClick={() => {
                        handleNotificationClick(
                          notification._id,
                          notification.entityType,
                          notification.entityId
                        );
                      }}
                    >
                      <div className="flex w-full items-start gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={notification.actorAvatar} />
                          <AvatarFallback className="text-xs">
                            {getInitials(notification.actorName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start gap-2">
                            {getActivityIcon(notification.actionType)}
                            <p className="flex-1 text-sm">
                              {notification.summary}
                            </p>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {formatDistanceToNow(notification._creationTime, {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        {getPriorityBadge(notification.priority)}
                      </div>
                    </DropdownMenuItem>
                  )
                )}
              </>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
