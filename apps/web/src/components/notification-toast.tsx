"use client";

import { toast } from "sonner";

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

export type NotificationData = {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  createdAt: number;
};

/**
 * Show a notification toast with title, message, and optional navigation link
 * Used by NotificationProvider to display real-time notifications
 */
export function showNotificationToast(
  notification: NotificationData,
  onNavigate?: (link: string) => void
) {
  toast(notification.title, {
    description: notification.message,
    duration: 5000,
    action: notification.link
      ? {
          label: "View",
          onClick: () => {
            if (onNavigate && notification.link) {
              onNavigate(notification.link);
            }
          },
        }
      : undefined,
  });
}
