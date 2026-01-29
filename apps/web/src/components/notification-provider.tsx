"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { showNotificationToast } from "./notification-toast";

type NotificationProviderProps = {
  children: ReactNode;
};

/**
 * Provider that subscribes to unseen notifications and displays them as toasts
 * Notifications are displayed staggered (500ms apart) to prevent overwhelming the user
 * Each notification is marked as seen after being displayed
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  // Track which notifications we've already displayed
  const displayedIdsRef = useRef<Set<string>>(new Set());

  // Query unseen notifications (only if user is authenticated)
  const notifications = useQuery(
    api.models.notifications.getUnseenNotifications,
    session?.user ? {} : "skip"
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
