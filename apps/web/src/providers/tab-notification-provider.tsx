"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type React from "react";
import { useTabNotification } from "@/hooks/use-tab-notification";

interface TabNotificationProviderProps {
  children: React.ReactNode;
  orgId: string;
}

/**
 * Provider that manages browser tab notifications for parents
 * Shows unread message count in tab title
 * Note: This provider should only be used in parent-specific contexts
 * The layout handles role-based routing
 */
export function TabNotificationProvider({
  children,
  orgId,
}: TabNotificationProviderProps) {
  // Fetch unread summaries count for parents
  const unreadCount = useQuery(
    api.models.coachParentSummaries.getParentUnreadCount,
    { organizationId: orgId }
  );

  // Update tab notification with count
  useTabNotification(unreadCount ?? 0);

  return <>{children}</>;
}
