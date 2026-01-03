"use client";

import { usePostHog } from "posthog-js/react";
import { useEffect, useRef } from "react";
import { AnalyticsEvents } from "@/lib/analytics";
import { useSession } from "@/lib/auth-client";

/**
 * PostHog Auth Tracker
 * Automatically identifies users when they log in and resets on logout
 */
export function PostHogAuthTracker() {
  const { data: session } = useSession();
  const posthog = usePostHog();
  const previousSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!posthog) {
      return;
    }

    const currentUserId = session?.user?.id;
    const previousUserId = previousSessionRef.current;

    // User logged in (session exists and is new)
    if (currentUserId && currentUserId !== previousUserId) {
      // Identify user with PostHog
      posthog.identify(currentUserId, {
        email: session.user.email,
        name: session.user.name,
        // Add any other user properties
      });

      // Track login event (only if this is not the first load)
      if (previousUserId !== null) {
        posthog.capture(AnalyticsEvents.USER_LOGGED_IN, {
          email: session.user.email,
        });
      }

      previousSessionRef.current = currentUserId;
    }

    // User logged out (no session but there was one before)
    if (!currentUserId && previousUserId) {
      posthog.capture(AnalyticsEvents.USER_LOGGED_OUT);
      posthog.reset();
      previousSessionRef.current = null;
    }
  }, [session, posthog]);

  return null;
}
