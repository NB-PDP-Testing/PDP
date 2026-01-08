"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    // Only initialize PostHog if both key and host are provided
    if (key && host && key !== "phc_your_key_here") {
      posthog.init(key, {
        api_host: host,
        person_profiles: "identified_only", // Only create profiles for logged-in users
        capture_pageview: false, // We'll manually track pageviews for better control
        capture_pageleave: true, // Track when users leave pages
        // Feature flags configuration
        bootstrap: {
          featureFlags: {}, // Start with empty, will be fetched
        },
        loaded: (ph) => {
          // Debug logging in development
          if (process.env.NODE_ENV === "development") {
            console.log("[PostHog] Initialized with host:", host);
            console.log("[PostHog] Reloading feature flags...");
          }

          // Set up callback for when flags load
          posthog.onFeatureFlags((flags, variants) => {
            if (process.env.NODE_ENV === "development") {
              console.log("[PostHog] Feature flags LOADED!");
              console.log("[PostHog] Flags:", flags);
              console.log("[PostHog] Variants:", variants);
              console.log("[PostHog] isFeatureEnabled('ux_admin_nav_sidebar'):", posthog.isFeatureEnabled("ux_admin_nav_sidebar"));
            }
          });

          // Now reload feature flags
          ph.reloadFeatureFlags();
        },
        session_recording: {
          maskAllInputs: true, // Privacy: mask all form inputs by default
          maskTextSelector: ".sensitive", // Mask elements with 'sensitive' class
        },
      });
    } else {
      if (process.env.NODE_ENV === "development") {
        console.warn("[PostHog] Not initialized - missing NEXT_PUBLIC_POSTHOG_KEY or NEXT_PUBLIC_POSTHOG_HOST");
      }
    }
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
