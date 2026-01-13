/**
 * Session Plan Configuration
 *
 * Centralized configuration for session plan caching and behavior.
 * Supports environment variables and PostHog feature flags (when available).
 *
 * Note: CI/CD pipeline optimized for 50% reduction in Actions minutes.
 */

// Cache duration in hours - configurable via env or PostHog
const DEFAULT_CACHE_HOURS = 1; // 1 hour default (override with NEXT_PUBLIC_SESSION_PLAN_CACHE_HOURS)

/**
 * Get the cache duration for session plans
 * Priority: PostHog feature flag > Environment variable > Default
 */
export function getSessionPlanCacheDuration(): number {
  // Check environment variable first
  if (typeof window !== "undefined") {
    const envCacheDuration = process.env.NEXT_PUBLIC_SESSION_PLAN_CACHE_HOURS;
    if (envCacheDuration) {
      const parsed = Number.parseFloat(envCacheDuration);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  // TODO: Add PostHog feature flag check here when PostHog is integrated
  // Example:
  // const posthogValue = posthog.getFeatureFlag('session-plan-cache-hours');
  // if (typeof posthogValue === 'number' && posthogValue > 0) {
  //   return posthogValue;
  // }

  // Fall back to default
  return DEFAULT_CACHE_HOURS;
}

/**
 * Configuration object for session plans
 */
export const sessionPlanConfig = {
  get cacheDurationHours() {
    return getSessionPlanCacheDuration();
  },

  // Convert to milliseconds for easy use
  get cacheDurationMs() {
    return this.cacheDurationHours * 60 * 60 * 1000;
  },

  // PostHog event names for tracking
  events: {
    PLAN_GENERATED: "session_plan_generated",
    PLAN_CACHED: "session_plan_cached",
    PLAN_REGENERATED: "session_plan_regenerated",
    PLAN_SHARED: "session_plan_shared",
    PLAN_VIEWED: "session_plan_viewed",
  },
} as const;
