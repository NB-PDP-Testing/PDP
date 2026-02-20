"use client";

/**
 * NotificationBell - Header notification icon with pending items dropdown
 *
 * Shows a bell icon with a badge count when there are pending items:
 * - Pending organization invitations
 * - Injury notifications (reported, status changed, cleared, severe alerts)
 * - Other system notifications
 *
 * Clicking opens a dropdown panel to view and act on pending items.
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Heart,
  Mail,
  Users,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { authClient } from "@/lib/auth-client";

type NotificationType =
  | "role_granted"
  | "team_assigned"
  | "team_removed"
  | "child_declined"
  | "invitation_request"
  | "injury_reported"
  | "injury_status_changed"
  | "severe_injury_alert"
  | "injury_cleared";

// Get icon for notification type
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "severe_injury_alert":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "injury_reported":
      return <Heart className="h-4 w-4 text-orange-500" />;
    case "injury_cleared":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "injury_status_changed":
      return <Heart className="h-4 w-4 text-blue-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

// Format relative time
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = authClient.useSession();

  // Query for pending invitations
  const pendingInvitations = useQuery(
    api.models.members.getPendingInvitationsForUser,
    session?.user?.email ? { email: session.user.email } : "skip"
  );

  // Query for recent notifications (including unseen)
  const recentNotifications = useQuery(
    api.models.notifications.getRecentNotifications,
    session?.user ? { limit: 10 } : "skip"
  );

  // Mutation to mark notifications as seen
  const markSeen = useMutation(api.models.notifications.markNotificationSeen);
  const markAllSeen = useMutation(
    api.models.notifications.markAllNotificationsSeen
  );

  // Calculate counts
  const invitationCount = pendingInvitations?.length ?? 0;
  const unseenNotificationCount =
    recentNotifications?.filter((n) => !n.seenAt).length ?? 0;
  const totalUnseenCount = invitationCount + unseenNotificationCount;

  // Always show the bell (even with 0 notifications) so users can check
  // But only show the badge if there are unseen items

  const handleAcceptInvitation = (invitationId: string) => {
    setIsOpen(false);
    router.push(`/orgs/accept-invitation/${invitationId}`);
  };

  const handleNotificationClick = async (notification: {
    _id: Id<"notifications">;
    link?: string;
    seenAt?: number;
  }) => {
    // Mark as seen if not already
    if (!notification.seenAt) {
      await markSeen({ notificationId: notification._id });
    }

    // Navigate to link if provided
    if (notification.link) {
      setIsOpen(false);
      router.push(notification.link as Route);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllSeen({});
  };

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <Button
          className="relative h-9 w-9 rounded-full"
          size="icon"
          variant="ghost"
        >
          <Bell className="h-5 w-5 text-white" />
          {/* Notification badge - only show if there are unseen items */}
          {totalUnseenCount > 0 && (
            <span className="-right-1 -top-1 absolute flex h-5 w-5 items-center justify-center rounded-full bg-red-500 font-bold text-[10px] text-white">
              {totalUnseenCount > 9 ? "9+" : totalUnseenCount}
            </span>
          )}
          <span className="sr-only">
            {totalUnseenCount > 0
              ? `${totalUnseenCount} pending notification${totalUnseenCount !== 1 ? "s" : ""}`
              : "Notifications"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-muted-foreground text-sm">
              {totalUnseenCount > 0
                ? `${totalUnseenCount} unread`
                : "All caught up!"}
            </p>
          </div>
          {unseenNotificationCount > 0 && (
            <Button onClick={handleMarkAllRead} size="sm" variant="ghost">
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {/* Pending Invitations Section */}
          {invitationCount > 0 && (
            <div className="border-b p-2">
              <div className="mb-2 flex items-center gap-2 px-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  Organization Invitations
                </span>
              </div>
              <div className="space-y-1">
                {pendingInvitations?.map((invitation) => (
                  <div
                    className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
                    key={invitation.invitationId}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">
                          {invitation.organizationName}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {invitation.functionalRoles.map((role: string) => (
                            <Badge
                              className="text-xs"
                              key={role}
                              variant="secondary"
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </Badge>
                          ))}
                        </div>
                        {invitation.playerLinks &&
                          invitation.playerLinks.length > 0 && (
                            <p className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
                              <Users className="h-3 w-3" />
                              {invitation.playerLinks.length} child
                              {invitation.playerLinks.length !== 1 ? "ren" : ""}{" "}
                              linked
                            </p>
                          )}
                      </div>
                      <Button
                        onClick={() =>
                          handleAcceptInvitation(invitation.invitationId)
                        }
                        size="sm"
                        variant="default"
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Notifications Section */}
          {recentNotifications && recentNotifications.length > 0 && (
            <div className="p-2">
              <div className="mb-2 flex items-center gap-2 px-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Recent Activity</span>
              </div>
              <div className="space-y-1">
                {recentNotifications.map((notification) => (
                  <button
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      notification.link
                        ? "cursor-pointer hover:bg-muted/50"
                        : "cursor-default"
                    } ${
                      notification.seenAt
                        ? "bg-card"
                        : "border-primary/30 bg-primary/5"
                    }`}
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    type="button"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        {getNotificationIcon(
                          notification.type as NotificationType
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`truncate text-sm ${notification.seenAt ? "font-medium" : "font-semibold"}`}
                          >
                            {notification.title}
                          </p>
                          {!notification.seenAt && (
                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="line-clamp-2 text-muted-foreground text-xs">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-muted-foreground text-xs">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {invitationCount === 0 &&
            (!recentNotifications || recentNotifications.length === 0) && (
              <div className="p-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground text-sm">
                  No notifications yet
                </p>
              </div>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
