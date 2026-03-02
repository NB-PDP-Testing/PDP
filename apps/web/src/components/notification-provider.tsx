"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { useMembershipContext } from "@/providers/membership-provider";
import { showNotificationToast } from "./notification-toast";

// Matches /orgs/[orgId] in pathname — defined at top level for performance
const ORG_ID_REGEX = /\/orgs\/([^/]+)/;

type NotificationProviderProps = {
  children: ReactNode;
};

/**
 * Provider that subscribes to unseen notifications and displays them as toasts
 * Notifications are displayed staggered (500ms apart) to prevent overwhelming the user
 * Each notification is marked as seen after being displayed
 *
 * Role-scoped filtering: passes the user's active functional role for the current org
 * so notifications for other role contexts are suppressed while in a different role.
 * Only applies to multi-role users — single-role users see all their notifications.
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Get active role for the current org from membership context
  // Same data source as OrgRoleSwitcher — avoids duplicate queries
  const { getMembershipForOrg } = useMembershipContext();

  // Extract orgId from pathname: /orgs/[orgId]/...
  const orgIdMatch = pathname?.match(ORG_ID_REGEX);
  const orgId = orgIdMatch ? orgIdMatch[1] : null;

  // Get activeFunctionalRole for the current org (undefined if no org context)
  const membership = orgId ? getMembershipForOrg(orgId) : undefined;
  const activeFunctionalRole = membership?.activeFunctionalRole ?? undefined;

  // Track which notifications we've already displayed
  const displayedIdsRef = useRef<Set<string>>(new Set());

  // Query unseen notifications filtered by active role when available
  const notifications = useQuery(
    api.models.notifications.getUnseenNotifications,
    session?.user ? { activeRole: activeFunctionalRole } : "skip"
  );

  // Mutation to mark notifications as seen
  const markSeen = useMutation(api.models.notifications.markNotificationSeen);

  // Handle navigation from toast actions
  const handleNavigate = useCallback(
    (link: string) => {
      router.push(link as Route);
    },
    [router]
  );

  useEffect(() => {
    if (!notifications || notifications.length === 0) {
      return;
    }

    // Find notifications we haven't displayed yet
    const newNotifications = notifications.filter(
      (n) => !displayedIdsRef.current.has(n._id)
    );

    if (newNotifications.length === 0) {
      return;
    }

    // Display each new notification with staggered timing
    for (const [index, notification] of newNotifications.entries()) {
      setTimeout(
        () => {
          // Show the toast
          showNotificationToast(
            {
              _id: notification._id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              link: notification.link,
              createdAt: notification.createdAt,
            },
            handleNavigate
          );

          // Mark as displayed locally
          displayedIdsRef.current.add(notification._id);

          // Mark as seen in the database
          markSeen({
            notificationId: notification._id as Id<"notifications">,
          });
        },
        index * 500 // 500ms stagger between each toast
      );
    }
  }, [notifications, markSeen, handleNavigate]);

  return <>{children}</>;
}
