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
 * - ux_enhanced_tables: Use DataTableEnhanced with column visibility, bulk actions, export
 * - ux_swipe_cards: Enable swipe actions on mobile cards
 * - ux_pull_to_refresh: Enable pull-to-refresh on card lists
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
 * - ux_pwa_install_prompt: Show PWA install prompt after multiple visits
 * - ux_resizable_sidebar: Enable resizable sidebar with drag handle
 * - ux_pinned_favorites: Enable pinned favorites in sidebar
 * - ux_recent_items: Enable recent items history
 *
 * PHASE 10 - Context Menu & Advanced Interactions:
 * - ux_context_menu: Enable responsive context menus (long-press on mobile, right-click on desktop)
 * - ux_action_sheet: Enable action sheets (bottom sheet on mobile, dropdown on desktop)
 * - ux_inline_edit: Enable inline editing (modal on mobile, in-place on desktop)
 *
 * PHASE 11 - PWA & Offline:
 * - ux_service_worker: Enable service worker registration
 * - ux_offline_support: Enable offline support features
 * - ux_pwa_update_prompt: Show update available prompt
 *
 * PHASE 12 - Accessibility:
 * - ux_skip_links: Enable skip to main content links
 * - ux_focus_visible: Enhanced visible focus indicators
 * - ux_reduced_motion: Respect reduced motion preferences
 * - ux_announcer: Enable screen reader announcements
 *
 * PHASE 13 - Performance:
 * - ux_lazy_components: Enable lazy loading components
 * - ux_web_vitals: Enable Web Vitals monitoring
 * - ux_deferred_render: Enable deferred rendering
 * - ux_resource_hints: Enable resource hints (preconnect, prefetch)
 *
 * PHASE 14 - Theme & Accessibility:
 * - ux_theme_enhanced: Enhanced theme toggle with checkmark, ARIA, smooth transitions
 * - ux_theme_contrast_colors: Auto-contrast text colors on org backgrounds
 * - ux_theme_dark_variants: Adaptive org colors for dark mode
 * - ux_theme_smooth_transitions: Smooth 200ms transitions when changing themes
 * - ux_header_nav_minimal: Hide header nav links (Home, Platform, Coach, Parent, Admin)
 *
 * PHASE 15 - Enhanced User Menu:
 * - ux_enhanced_user_menu: Enhanced user menu with profile settings, preferences, and alerts
 * - ux_org_usage_tracking: Organization usage tracking in user menu
 *
 * PHASE 16 - Logo Visibility Enhancement:
 * - ux_logo_adaptive_visibility: WCAG-based logo box contrast calculation using org colors
 *
 * PHASE 17 - Parent Features:
 * - parent_summary_share_image: Enable shareable image generation for parent summaries
 *
 * PHASE 18 - Voice Notes Features:
 * - voice_notes_whatsapp: Enable WhatsApp integration for voice notes (Twilio-based)
 * - voice_notes_ai_model_display: Show coaches which AI models are being used for transcription/insights
 *
 * ACCESS CONTROL:
 * - Feature flags can only be enabled/disabled by Platform Staff via PostHog admin
 * - When enabled, features are visible to ALL users (not restricted to staff)
 * - PostHog dashboard access is required to toggle feature flags
 */

export type AdminNavStyle = "current" | "sidebar" | "bottomsheet" | "tabs";
export type QuickActionsVariant = "control" | "fab" | "horizontal" | "two-tier";

export type UXFeatureFlags = {
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
  /** Use DataTableEnhanced with column visibility, bulk actions, export */
  useEnhancedTables: boolean;
  /** Enable swipe actions on mobile cards */
  useSwipeCards: boolean;
  /** Enable pull-to-refresh on card lists */
  usePullToRefresh: boolean;

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
  /** Show PWA install prompt after multiple visits */
  usePWAInstallPrompt: boolean;
  /** Enable resizable sidebar with drag handle */
  useResizableSidebar: boolean;
  /** Enable pinned favorites in sidebar */
  usePinnedFavorites: boolean;
  /** Enable recent items history */
  useRecentItems: boolean;

  // Phase 10 - Context Menu & Advanced Interactions
  /** Enable responsive context menus (long-press on mobile, right-click on desktop) */
  useContextMenu: boolean;
  /** Enable action sheets (bottom sheet on mobile, dropdown on desktop) */
  useActionSheet: boolean;
  /** Enable inline editing (modal on mobile, in-place on desktop) */
  useInlineEdit: boolean;

  // Phase 11 - PWA & Offline
  /** Enable service worker registration */
  useServiceWorker: boolean;
  /** Enable offline support features */
  useOfflineSupport: boolean;
  /** Show update available prompt */
  usePWAUpdatePrompt: boolean;

  // Phase 12 - Accessibility
  /** Enable skip to main content links */
  useSkipLinks: boolean;
  /** Enhanced visible focus indicators */
  useFocusVisible: boolean;
  /** Respect reduced motion preferences */
  useReducedMotion: boolean;
  /** Enable screen reader announcements */
  useAnnouncer: boolean;

  // Phase 13 - Performance
  /** Enable lazy loading components */
  useLazyComponents: boolean;
  /** Enable Web Vitals monitoring */
  useWebVitalsMonitoring: boolean;
  /** Enable deferred rendering */
  useDeferredRender: boolean;
  /** Enable resource hints (preconnect, prefetch) */
  useResourceHints: boolean;

  // Phase 14 - Theme & Accessibility
  /** Enhanced theme toggle with checkmark indicator, ARIA attributes, smooth transitions */
  useEnhancedThemeToggle: boolean;
  /** Auto-contrast text colors on org-colored backgrounds (black/white based on luminance) */
  useThemeContrastColors: boolean;
  /** Adaptive org colors for dark mode (lightened variants) */
  useThemeDarkVariants: boolean;
  /** Smooth 200ms transitions when changing themes (respects prefers-reduced-motion) */
  useThemeSmoothTransitions: boolean;

  // Phase 14 - Header Navigation
  /** Hide header nav links (Home, Platform, Coach, Parent, Admin) - users should use the switcher */
  useMinimalHeaderNav: boolean;

  // Phase 15 - Enhanced User Menu
  /** Enhanced user menu with profile settings, preferences, and alerts */
  useEnhancedUserMenu: boolean;
  /** Organization usage tracking in user menu */
  useOrgUsageTracking: boolean;

  // Phase 16 - Logo Visibility Enhancement
  /** Adaptive logo visibility using org colors and smart contrast detection */
  useAdaptiveLogoVisibility: boolean;

  // Phase 17 - Parent Features
  /** Enable shareable image generation for parent summaries (WASM-based PNG generation) */
  useParentSummaryShareImage: boolean;

  // Phase 18 - Voice Notes Features
  /** Enable WhatsApp integration for voice notes via Twilio */
  useVoiceNotesWhatsApp: boolean;

  // Quick Actions A/B/C Testing
  /** Which quick actions variant to display: control (collapsible grid), fab (floating button), horizontal (icon scroll), two-tier (3 primary + more) */
  quickActionsVariant: QuickActionsVariant;
};

/**
 * Hook to access UX feature flags
 * All flags default to false/current to maintain existing behavior
 * until explicitly enabled in PostHog
 *
 * ACCESS CONTROL:
 * - Only Platform Staff (with PostHog access) can enable/disable features
 * - When enabled, features apply to ALL users
 *
 * DEV MODE:
 * - Set ENABLE_ALL_UX_FLAGS to true to enable all flags for local development
 */

// Toggle this to enable all UX feature flags for local development
const ENABLE_ALL_UX_FLAGS = true;

export function useUXFeatureFlags(): UXFeatureFlags {
  const { isFeatureEnabled } = useAnalytics();

  // Helper that returns true if dev mode is enabled, otherwise checks PostHog
  const checkFlag = (flag: string) =>
    ENABLE_ALL_UX_FLAGS || isFeatureEnabled(flag);

  return {
    // Phase 1 - Navigation Foundation
    useBottomNav: checkFlag("ux_bottom_nav"),
    useTouchTargets44: checkFlag("ux_touch_targets_44px"),
    adminNavStyle: ENABLE_ALL_UX_FLAGS
      ? "sidebar"
      : getAdminNavStyle(isFeatureEnabled),
    useAppShell: checkFlag("ux_app_shell"),
    useHoverActions: checkFlag("ux_hover_actions"),
    useResponsiveInputs: checkFlag("ux_responsive_inputs"),

    // Phase 2 - Data Display
    useMobileCards: checkFlag("ux_mobile_cards"),
    useSkeletonLoaders: checkFlag("ux_skeleton_loaders"),
    useEnhancedTables: checkFlag("ux_enhanced_tables"),
    useSwipeCards: checkFlag("ux_swipe_cards"),
    usePullToRefresh: checkFlag("ux_pull_to_refresh"),

    // Phase 3 - Forms
    useResponsiveForms: checkFlag("ux_responsive_forms"),

    // Phase 4 - Interactions
    useCommandMenu: checkFlag("ux_command_menu"),
    useResponsiveDialogs: checkFlag("ux_responsive_dialogs"),

    // Phase 5 - Polish
    useKeyboardShortcutsOverlay: checkFlag("ux_keyboard_shortcuts_overlay"),
    useDensityToggle: checkFlag("ux_density_toggle"),
    useOfflineIndicator: checkFlag("ux_offline_indicator"),
    usePWAInstallPrompt: checkFlag("ux_pwa_install_prompt"),
    useResizableSidebar: checkFlag("ux_resizable_sidebar"),
    usePinnedFavorites: checkFlag("ux_pinned_favorites"),
    useRecentItems: checkFlag("ux_recent_items"),

    // Phase 10 - Context Menu & Advanced Interactions
    useContextMenu: checkFlag("ux_context_menu"),
    useActionSheet: checkFlag("ux_action_sheet"),
    useInlineEdit: checkFlag("ux_inline_edit"),

    // Phase 11 - PWA & Offline
    useServiceWorker: checkFlag("ux_service_worker"),
    useOfflineSupport: checkFlag("ux_offline_support"),
    usePWAUpdatePrompt: checkFlag("ux_pwa_update_prompt"),

    // Phase 12 - Accessibility
    useSkipLinks: checkFlag("ux_skip_links"),
    useFocusVisible: checkFlag("ux_focus_visible"),
    useReducedMotion: checkFlag("ux_reduced_motion"),
    useAnnouncer: checkFlag("ux_announcer"),

    // Phase 13 - Performance
    useLazyComponents: checkFlag("ux_lazy_components"),
    useWebVitalsMonitoring: checkFlag("ux_web_vitals"),
    useDeferredRender: checkFlag("ux_deferred_render"),
    useResourceHints: checkFlag("ux_resource_hints"),

    // Phase 14 - Theme & Accessibility
    useEnhancedThemeToggle: checkFlag("ux_theme_enhanced"),
    useThemeContrastColors: checkFlag("ux_theme_contrast_colors"),
    useThemeDarkVariants: checkFlag("ux_theme_dark_variants"),
    useThemeSmoothTransitions: checkFlag("ux_theme_smooth_transitions"),

    // Phase 14 - Header Navigation
    useMinimalHeaderNav: checkFlag("ux_header_nav_minimal"),

    // Phase 15 - Enhanced User Menu
    useEnhancedUserMenu: checkFlag("ux_enhanced_user_menu"),
    useOrgUsageTracking: checkFlag("ux_org_usage_tracking"),

    // Phase 16 - Logo Visibility Enhancement
    useAdaptiveLogoVisibility: checkFlag("ux_logo_adaptive_visibility"),

    // Phase 17 - Parent Features
    useParentSummaryShareImage: checkFlag("parent_summary_share_image"),

    // Phase 18 - Voice Notes Features
    useVoiceNotesWhatsApp: checkFlag("voice_notes_whatsapp"),

    // Quick Actions A/B/C Testing
    quickActionsVariant: ENABLE_ALL_UX_FLAGS
      ? "two-tier"
      : getQuickActionsVariant(isFeatureEnabled),
  };
}

/**
 * Get the admin navigation style based on feature flags
 * Supports A/B testing different approaches
 */
function getAdminNavStyle(
  isFeatureEnabled: (flag: string) => boolean
): AdminNavStyle {
  if (isFeatureEnabled("ux_admin_nav_sidebar")) {
    return "sidebar";
  }
  if (isFeatureEnabled("ux_admin_nav_bottomsheet")) {
    return "bottomsheet";
  }
  if (isFeatureEnabled("ux_admin_nav_tabs")) {
    return "tabs";
  }
  return "current";
}

/**
 * Get the quick actions variant based on feature flags
 * Supports A/B/C testing different quick actions patterns
 */
function getQuickActionsVariant(
  isFeatureEnabled: (flag: string) => boolean
): QuickActionsVariant {
  if (isFeatureEnabled("ux_quick_actions_fab")) {
    return "fab";
  }
  if (isFeatureEnabled("ux_quick_actions_horizontal")) {
    return "horizontal";
  }
  if (isFeatureEnabled("ux_quick_actions_two_tier")) {
    return "two-tier";
  }
  return "control";
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
  PWA_INSTALL_PROMPTED: "ux_pwa_install_prompted",
  PWA_INSTALLED: "ux_pwa_installed",
  SIDEBAR_RESIZED: "ux_sidebar_resized",
  FAVORITE_ADDED: "ux_favorite_added",
  FAVORITE_REMOVED: "ux_favorite_removed",
  RECENT_ITEM_CLICKED: "ux_recent_item_clicked",

  // Phase 10 - Context Menu & Advanced Interactions events
  CONTEXT_MENU_OPENED: "ux_context_menu_opened",
  CONTEXT_MENU_ACTION: "ux_context_menu_action",
  ACTION_SHEET_OPENED: "ux_action_sheet_opened",
  ACTION_SHEET_ACTION: "ux_action_sheet_action",
  INLINE_EDIT_STARTED: "ux_inline_edit_started",
  INLINE_EDIT_SAVED: "ux_inline_edit_saved",
  INLINE_EDIT_CANCELLED: "ux_inline_edit_cancelled",

  // Phase 11 - PWA & Offline events
  SERVICE_WORKER_REGISTERED: "ux_service_worker_registered",
  SERVICE_WORKER_UPDATE_FOUND: "ux_service_worker_update_found",
  SERVICE_WORKER_UPDATE_ACTIVATED: "ux_service_worker_update_activated",
  OFFLINE_PAGE_VIEWED: "ux_offline_page_viewed",
  CACHE_HIT: "ux_cache_hit",
  CACHE_MISS: "ux_cache_miss",

  // Phase 12 - Accessibility events
  SKIP_LINK_USED: "ux_skip_link_used",
  KEYBOARD_NAVIGATION_DETECTED: "ux_keyboard_navigation_detected",
  REDUCED_MOTION_DETECTED: "ux_reduced_motion_detected",
  SCREEN_READER_ANNOUNCEMENT: "ux_screen_reader_announcement",
  FOCUS_TRAP_ACTIVATED: "ux_focus_trap_activated",

  // Phase 13 - Performance events
  WEB_VITALS_REPORTED: "ux_web_vitals_reported",
  LAZY_COMPONENT_LOADED: "ux_lazy_component_loaded",
  LONG_TASK_DETECTED: "ux_long_task_detected",
  RESOURCE_PRELOADED: "ux_resource_preloaded",
  PERFORMANCE_MARK: "ux_performance_mark",

  // Phase 14 - Theme events
  THEME_CHANGED: "ux_theme_changed",
  THEME_TOGGLE_OPENED: "ux_theme_toggle_opened",

  // Phase 15 - Enhanced User Menu events
  ENHANCED_USER_MENU_OPENED: "ux_enhanced_user_menu_opened",
  ENHANCED_USER_MENU_THEME_CHANGED: "ux_enhanced_user_menu_theme_changed",
  ENHANCED_USER_MENU_PREFERENCES_OPENED:
    "ux_enhanced_user_menu_preferences_opened",
  ENHANCED_USER_MENU_ALERTS_OPENED: "ux_enhanced_user_menu_alerts_opened",
  ENHANCED_USER_MENU_PROFILE_SETTINGS_OPENED:
    "ux_enhanced_user_menu_profile_settings_opened",

  // Quick Actions A/B/C Testing events
  QUICK_ACTIONS_VARIANT_VIEWED: "ux_quick_actions_variant_viewed",
  QUICK_ACTIONS_ACTION_CLICKED: "ux_quick_actions_action_clicked",
  QUICK_ACTIONS_FAB_OPENED: "ux_quick_actions_fab_opened",
  QUICK_ACTIONS_COLLAPSED: "ux_quick_actions_collapsed",
  QUICK_ACTIONS_EXPANDED: "ux_quick_actions_expanded",

  // Phase 18 - Voice Notes events
  WHATSAPP_VOICE_NOTE_SENT: "voice_notes_whatsapp_sent",
  WHATSAPP_VOICE_NOTE_RECEIVED: "voice_notes_whatsapp_received",
  WHATSAPP_VOICE_NOTE_PROCESSED: "voice_notes_whatsapp_processed",
  WHATSAPP_VOICE_NOTE_FAILED: "voice_notes_whatsapp_failed",
} as const;
