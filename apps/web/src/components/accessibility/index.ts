/**
 * Accessibility Components
 *
 * Phase 12 UX improvements: WCAG AA compliance
 *
 * Components:
 * - SkipLink: Skip to main content link for keyboard users
 * - VisuallyHidden: Hide content visually but keep accessible
 * - LiveRegion: ARIA live region for dynamic announcements
 * - AnnouncerProvider: Programmatic screen reader announcements
 * - FocusRing: Visible focus indicator wrapper
 * - FocusableItem: Make any content focusable
 *
 * Hooks:
 * - useAnnouncer: Programmatic announcements
 * - useFocusWithin: Manage focus within container
 * - useKeyboardNavigation: Detect keyboard navigation
 * - useFocusTrap: Trap focus within container
 * - useReducedMotion: Detect reduced motion preference
 */

// Focus management
export {
  FocusableItem,
  type FocusableItemProps,
  FocusRing,
  type FocusRingProps,
  getFocusableElements,
  useFocusTrap,
  useFocusWithin,
  useKeyboardNavigation,
} from "./focus-visible";
// Live regions and announcer
export {
  AnnouncerProvider,
  type AnnouncerProviderProps,
  LiveRegion,
  type LiveRegionProps,
  useAnnouncer,
} from "./live-region";
// Skip links
export {
  SkipLink,
  type SkipLinkProps,
  SkipLinks,
  type SkipLinksItem,
  type SkipLinksProps,
} from "./skip-link";
// Visually hidden / Screen reader only
export {
  ScreenReaderOnly,
  VisuallyHidden,
  type VisuallyHiddenProps,
} from "./visually-hidden";
