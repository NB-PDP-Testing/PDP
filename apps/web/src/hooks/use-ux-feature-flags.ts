import { useAnalytics } from "@/lib/analytics";

/**
 * UX Feature Flags for gradual rollout of UX improvements
 *
 * These flags control which UX experiments are enabled:
 * - ux_bottom_nav: Enable bottom navigation on mobile
 * - ux_mobile_cards: Use card-based mobile data display
 * - ux_touch_targets_44px: Use 44px minimum touch targets
 * - ux_admin_nav_style: Which admin navigation style to use
 * - ux_skeleton_loaders: Use skeleton loading states
 *
 * ACCESS CONTROL:
 * - Feature flags can only be enabled/disabled by Platform Staff via PostHog admin
 * - When enabled, features are visible to ALL users (not restricted to staff)
 * - PostHog dashboard access is required to toggle feature flags
 */

export type AdminNavStyle = "current" | "sidebar" | "bottomsheet" | "tabs";

export interface UXFeatureFlags {
  /** Enable bottom navigation on mobile */
  useBottomNav: boolean;
  /** Use card-based mobile data display instead of tables */
  useMobileCards: boolean;
  /** Use 44px minimum touch targets */
  useTouchTargets44: boolean;
  /** Which admin navigation style to use */
  adminNavStyle: AdminNavStyle;
  /** Use skeleton loading states */
  useSkeletonLoaders: boolean;
}

/**
 * Hook to access UX feature flags
 * All flags default to false/current to maintain existing behavior
 * until explicitly enabled in PostHog
 *
 * ACCESS CONTROL:
 * - Only Platform Staff (with PostHog access) can enable/disable features
 * - When enabled, features apply to ALL users
 */
export function useUXFeatureFlags(): UXFeatureFlags {
  const { isFeatureEnabled } = useAnalytics();

  return {
    useBottomNav: isFeatureEnabled("ux_bottom_nav"),
    useMobileCards: isFeatureEnabled("ux_mobile_cards"),
    useTouchTargets44: isFeatureEnabled("ux_touch_targets_44px"),
    adminNavStyle: getAdminNavStyle(isFeatureEnabled),
    useSkeletonLoaders: isFeatureEnabled("ux_skeleton_loaders"),
  };
}

/**
 * Get the admin navigation style based on feature flags
 * Supports A/B testing different approaches
 */
function getAdminNavStyle(
  isFeatureEnabled: (flag: string) => boolean
): AdminNavStyle {
  if (isFeatureEnabled("ux_admin_nav_sidebar")) return "sidebar";
  if (isFeatureEnabled("ux_admin_nav_bottomsheet")) return "bottomsheet";
  if (isFeatureEnabled("ux_admin_nav_tabs")) return "tabs";
  return "current";
}

/**
 * UX Analytics Events for tracking mockup preferences
 */
export const UXAnalyticsEvents = {
  // Mockup preference events
  MOCKUP_VIEWED: "ux_mockup_viewed",
  MOCKUP_PREFERENCE_SELECTED: "ux_mockup_preference_selected",
  MOCKUP_FEEDBACK_SUBMITTED: "ux_mockup_feedback_submitted",

  // Feature interaction events
  BOTTOM_NAV_USED: "ux_bottom_nav_used",
  SWIPE_ACTION_USED: "ux_swipe_action_used",
  PULL_TO_REFRESH_USED: "ux_pull_to_refresh_used",
} as const;
