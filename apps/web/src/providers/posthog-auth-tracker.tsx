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
      const userEmail = session.user.email;

      // Check if this is an internal user
      // Temporarily disabled - tracking all users during initial setup
      const internalEmails: string[] = [];

      if (userEmail && internalEmails.includes(userEmail)) {
        // Internal user - opt out of tracking
        posthog.opt_out_capturing();
        console.log(
          "🚫 [PostHog] Internal user detected, opted out of tracking"
        );
      } else {
        // External user - identify and track
        posthog.identify(currentUserId, {
          email: userEmail,
          name: session.user.name,
        });

        // Track login event (only if this is not the first load)
        if (previousUserId !== null) {
          posthog.capture(AnalyticsEvents.USER_LOGGED_IN, {
            email: userEmail,
          });
        }
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
