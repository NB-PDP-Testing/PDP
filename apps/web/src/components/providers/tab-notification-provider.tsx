"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { useTabNotification } from "@/hooks/use-tab-notification";
import { authClient } from "@/lib/auth-client";

type TabNotificationProviderProps = {
  children: ReactNode;
  orgId: string;
};

/**
 * Provider that manages browser tab notifications for parents
 * Shows unread message count in tab title
 *
 * Defensive programming: Checks for authenticated session before querying.
 * Note: This provider is used in parent-specific layout which is already
 * protected by routing, but we add defensive checks for safety.
 */
export function TabNotificationProvider({
  children,
  orgId,
}: TabNotificationProviderProps) {
  const { data: session } = authClient.useSession();

  // Only query if user is authenticated
  // The parent layout handles role-based routing, but we add defensive check
  const shouldQuery = !!session?.user;

  // Fetch unread summaries count for parents
  const unreadCount = useQuery(
    api.models.coachParentSummaries.getParentUnreadCount,
    shouldQuery ? { organizationId: orgId } : "skip"
  );

  // Update tab notification with count
  useTabNotification(unreadCount ?? 0);

  return <>{children}</>;
}
