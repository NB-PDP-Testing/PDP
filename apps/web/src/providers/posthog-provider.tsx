"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

// Cookie names (must match middleware.ts)
const POSTHOG_FLAGS_COOKIE = "ph-bootstrap-flags";
const POSTHOG_DISTINCT_ID_COOKIE = "ph-distinct-id";

/**
 * Read a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split("=");
    if (cookieName === name) {
      try {
        return decodeURIComponent(cookieValue);
      } catch {
        return cookieValue;
      }
    }
  }
  return null;
}

/**
 * Get bootstrapped feature flags from cookie (set by middleware)
 */
function getBootstrappedFlags(): Record<string, boolean | string> {
  const flagsCookie = getCookie(POSTHOG_FLAGS_COOKIE);
  if (!flagsCookie) {
    return {};
  }

  try {
    return JSON.parse(flagsCookie);
  } catch (error) {
    console.warn("[PostHog] Failed to parse bootstrapped flags:", error);
    return {};
  }
}

/**
 * Get distinct ID from cookie (set by middleware)
 */
function getDistinctId(): string | undefined {
  return getCookie(POSTHOG_DISTINCT_ID_COOKIE) || undefined;
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    // Only initialize PostHog if both key and host are provided
    if (key && host && key !== "phc_your_key_here") {
      // Get bootstrapped flags and distinct ID from cookies (set by middleware)
      const bootstrappedFlags = getBootstrappedFlags();
      const distinctId = getDistinctId();
      posthog.init(key, {
        api_host: host,
        person_profiles: "identified_only", // Only create profiles for logged-in users
        capture_pageview: false, // We'll manually track pageviews for better control
        capture_pageleave: true, // Track when users leave pages
        // Bootstrap with pre-fetched flags from middleware
        bootstrap: {
          distinctID: distinctId,
          featureFlags: bootstrappedFlags,
        },
        loaded: (ph) => {
          // Refresh flags in background for next navigation
          // This ensures we have fresh flags without blocking render
          ph.reloadFeatureFlags();
        },
        session_recording: {
          maskAllInputs: true, // Privacy: mask all form inputs by default
          maskTextSelector: ".sensitive", // Mask elements with 'sensitive' class
        },
      });
    }
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
