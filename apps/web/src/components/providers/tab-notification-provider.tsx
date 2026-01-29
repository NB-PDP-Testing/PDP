"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { useTabNotification } from "@/hooks/use-tab-notification";
import { authClient } from "@/lib/auth-client";
import { useMembershipContext } from "@/providers/membership-provider";

type TabNotificationProviderProps = {
  children: ReactNode;
  orgId: string;
};

/**
 * Provider that manages browser tab notifications for parents
 * Shows unread message count in tab title
 *
 * US-005: Only queries unread count when user has parent role
 */
export function TabNotificationProvider({
  children,
  orgId,
}: TabNotificationProviderProps) {
  const { data: session } = authClient.useSession();

  // Get membership data from context (shared across header components)
  // Performance: Uses MembershipProvider to avoid duplicate queries
  const { getMembershipForOrg } = useMembershipContext();

  // Find current org membership
  const currentMembership = getMembershipForOrg(orgId);

  // Only query if user is authenticated and has parent role
  const isParent =
    !!session?.user && currentMembership?.activeFunctionalRole === "parent";

  // Fetch unread summaries count for parents
  const unreadCount = useQuery(
    api.models.coachParentSummaries.getParentUnreadCount,
    isParent ? { organizationId: orgId } : "skip"
  );

  // Update tab notification with count
  useTabNotification(unreadCount ?? 0);

  return <>{children}</>;
}
