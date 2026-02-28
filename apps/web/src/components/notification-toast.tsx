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
  | "injury_cleared"
  | "milestone_completed"
  | "clearance_received"
  | "org_invitation_received"
  | "age_transition_available"
  | "age_transition_claimed"
  | "age_transition_30_days"
  | "age_transition_7_days"
  | "wellness_access_request"
  | "wellness_reminder"
  | "player_role_approved";

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
