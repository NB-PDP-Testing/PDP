import { usePostHog } from "posthog-js/react";

/**
 * PostHog Analytics Event Constants
 * Centralized event naming for consistent tracking across the app
 */
export const AnalyticsEvents = {
  // Authentication events
  USER_SIGNED_UP: "user_signed_up",
  USER_LOGGED_IN: "user_logged_in",
  USER_LOGGED_OUT: "user_logged_out",
  USER_INVITED: "user_invited",
  INVITATION_ACCEPTED: "invitation_accepted",

  // Organization events
  ORG_CREATED: "organization_created",
  ORG_JOINED: "organization_joined",
  ORG_SETTINGS_UPDATED: "organization_settings_updated",

  // Team events
  TEAM_CREATED: "team_created",
  TEAM_UPDATED: "team_updated",
  PLAYER_ENROLLED: "player_enrolled",
  PLAYER_PROFILE_VIEWED: "player_profile_viewed",

  // Voice note & AI events
  VOICE_NOTE_RECORDED: "voice_note_recorded",
  VOICE_NOTE_TRANSCRIBED: "voice_note_transcribed",
  AI_INSIGHT_GENERATED: "ai_insight_generated",
  AI_INSIGHT_APPLIED: "ai_insight_applied",

  // Skill assessment events
  SKILL_ASSESSMENT_STARTED: "skill_assessment_started",
  SKILL_ASSESSMENT_COMPLETED: "skill_assessment_completed",

  // Feature usage
  PARENT_DASHBOARD_ACCESSED: "parent_dashboard_accessed",
  BULK_IMPORT_STARTED: "bulk_import_started",
  BULK_IMPORT_COMPLETED: "bulk_import_completed",
  EXPORT_INITIATED: "export_initiated",

  // Onboarding events (Phase 6)
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_STEP_SHOWN: "onboarding_step_shown",
  ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
  ONBOARDING_STEP_SKIPPED: "onboarding_step_skipped",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_ERROR: "onboarding_error",
} as const;

/**
 * Type-safe analytics properties
 */
export type AnalyticsProperties = Record<string, string | number | boolean>;

/**
 * Hook to access PostHog analytics
 * @returns Analytics tracking functions
 */
export function useAnalytics() {
  const posthog = usePostHog();

  return {
    /**
     * Track a custom event
     * @param event - Event name (use AnalyticsEvents constants)
     * @param properties - Optional event properties
     */
    track: (event: string, properties?: AnalyticsProperties) => {
      if (posthog) {
        posthog.capture(event, properties);
      }
    },

    /**
     * Identify a user with PostHog
     * @param userId - Unique user ID
     * @param traits - User properties (email, role, etc.)
     */
    identify: (userId: string, traits?: AnalyticsProperties) => {
      if (posthog) {
        posthog.identify(userId, traits);
      }
    },

    /**
     * Reset user identity (on logout)
     */
    reset: () => {
      if (posthog) {
        posthog.reset();
      }
    },

    /**
     * Check if a feature flag is enabled
     * @param flag - Feature flag name
     * @returns Whether the flag is enabled
     */
    isFeatureEnabled: (flag: string): boolean => {
      if (posthog) {
        return posthog.isFeatureEnabled(flag) ?? false;
      }
      return false;
    },
  };
}
