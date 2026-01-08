import { useAnalytics } from "@/lib/analytics";

/**
 * UX Feature Flags for gradual rollout of UX improvements
 *
 * These flags control which UX experiments are enabled:
 *
 * PHASE 1 - Navigation Foundation:
 * - ux_bottom_nav: Enable bottom navigation on mobile
 * - ux_admin_nav_style: Which admin navigation style to use
 * - ux_touch_targets_44px: Use 44px minimum touch targets
 * - ux_app_shell: Use new AppShell responsive layout wrapper
 * - ux_hover_actions: Enable desktop hover-reveal actions
 * - ux_responsive_inputs: Use responsive input/select sizing
 *
 * PHASE 2 - Data Display:
 * - ux_mobile_cards: Use card-based mobile data display
 * - ux_skeleton_loaders: Use skeleton loading states
 *
 * PHASE 3 - Forms:
 * - ux_responsive_forms: Use mobile-optimized form components
 *
 * PHASE 4 - Interactions:
 * - ux_command_menu: Enable Cmd+K command palette
 * - ux_responsive_dialogs: Use responsive dialogs (sheet on mobile, modal on desktop)
 *
 * PHASE 5 - Polish:
 * - ux_keyboard_shortcuts_overlay: Show keyboard shortcuts help (? key)
 * - ux_density_toggle: Enable density toggle (compact/comfortable/spacious)
 * - ux_offline_indicator: Show offline status indicator
 *
 * ACCESS CONTROL:
 * - Feature flags can only be enabled/disabled by Platform Staff via PostHog admin
 * - When enabled, features are visible to ALL users (not restricted to staff)
 * - PostHog dashboard access is required to toggle feature flags
 */

export type AdminNavStyle = "current" | "sidebar" | "bottomsheet" | "tabs";

export interface UXFeatureFlags {
  // Phase 1 - Navigation Foundation
  /** Enable bottom navigation on mobile */
  useBottomNav: boolean;
  /** Use 44px minimum touch targets */
  useTouchTargets44: boolean;
  /** Which admin navigation style to use */
  adminNavStyle: AdminNavStyle;
  /** Use new AppShell responsive layout wrapper */
  useAppShell: boolean;
  /** Enable desktop hover-reveal actions on rows/cards */
  useHoverActions: boolean;
  /** Use responsive input/select sizing (48px mobile → 40px desktop) */
  useResponsiveInputs: boolean;

  // Phase 2 - Data Display
  /** Use card-based mobile data display instead of tables */
  useMobileCards: boolean;
  /** Use skeleton loading states */
  useSkeletonLoaders: boolean;

  // Phase 3 - Forms
  /** Use responsive form components with mobile optimizations */
  useResponsiveForms: boolean;

  // Phase 4 - Interactions
  /** Enable Cmd+K command palette */
  useCommandMenu: boolean;
  /** Use responsive dialogs - sheet on mobile, modal on desktop */
  useResponsiveDialogs: boolean;

  // Phase 5 - Polish
  /** Show keyboard shortcuts help overlay (? key) */
  useKeyboardShortcutsOverlay: boolean;
  /** Enable density toggle (compact/comfortable/spacious) */
  useDensityToggle: boolean;
  /** Show offline status indicator */
  useOfflineIndicator: boolean;
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
    // Phase 1 - Navigation Foundation
    useBottomNav: isFeatureEnabled("ux_bottom_nav"),
    useTouchTargets44: isFeatureEnabled("ux_touch_targets_44px"),
    adminNavStyle: getAdminNavStyle(isFeatureEnabled),
    useAppShell: isFeatureEnabled("ux_app_shell"),
    useHoverActions: isFeatureEnabled("ux_hover_actions"),
    useResponsiveInputs: isFeatureEnabled("ux_responsive_inputs"),

    // Phase 2 - Data Display
    useMobileCards: isFeatureEnabled("ux_mobile_cards"),
    useSkeletonLoaders: isFeatureEnabled("ux_skeleton_loaders"),

    // Phase 3 - Forms
    useResponsiveForms: isFeatureEnabled("ux_responsive_forms"),

    // Phase 4 - Interactions
    useCommandMenu: isFeatureEnabled("ux_command_menu"),
    useResponsiveDialogs: isFeatureEnabled("ux_responsive_dialogs"),

    // Phase 5 - Polish
    useKeyboardShortcutsOverlay: isFeatureEnabled("ux_keyboard_shortcuts_overlay"),
    useDensityToggle: isFeatureEnabled("ux_density_toggle"),
    useOfflineIndicator: isFeatureEnabled("ux_offline_indicator"),
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
 * UX Analytics Events for tracking mockup preferences and feature usage
 */
export const UXAnalyticsEvents = {
  // Mockup preference events
  MOCKUP_VIEWED: "ux_mockup_viewed",
  MOCKUP_PREFERENCE_SELECTED: "ux_mockup_preference_selected",
  MOCKUP_FEEDBACK_SUBMITTED: "ux_mockup_feedback_submitted",

  // Phase 1 - Navigation events
  BOTTOM_NAV_USED: "ux_bottom_nav_used",
  APP_SHELL_NAV_USED: "ux_app_shell_nav_used",
  HOVER_ACTION_USED: "ux_hover_action_used",

  // Phase 2 - Data display events
  SWIPE_ACTION_USED: "ux_swipe_action_used",
  PULL_TO_REFRESH_USED: "ux_pull_to_refresh_used",
  MOBILE_CARD_TAPPED: "ux_mobile_card_tapped",

  // Phase 3 - Form events
  FORM_SHORTCUT_USED: "ux_form_shortcut_used",
  STICKY_SUBMIT_USED: "ux_sticky_submit_used",

  // Phase 4 - Interaction events
  COMMAND_MENU_OPENED: "ux_command_menu_opened",
  COMMAND_MENU_ACTION: "ux_command_menu_action",
  KEYBOARD_SHORTCUT_USED: "ux_keyboard_shortcut_used",

  // Phase 5 - Polish events
  SHORTCUTS_OVERLAY_OPENED: "ux_shortcuts_overlay_opened",
  DENSITY_CHANGED: "ux_density_changed",
  OFFLINE_STATUS_CHANGED: "ux_offline_status_changed",
} as const;
