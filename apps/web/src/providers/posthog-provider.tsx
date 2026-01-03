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
        session_recording: {
          maskAllInputs: true, // Privacy: mask all form inputs by default
          maskTextSelector: ".sensitive", // Mask elements with 'sensitive' class
        },
      });
    }
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
