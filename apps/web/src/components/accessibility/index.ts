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

// Skip links
export { SkipLink, SkipLinks, type SkipLinkProps, type SkipLinksProps, type SkipLinksItem } from "./skip-link";

// Visually hidden / Screen reader only
export { VisuallyHidden, ScreenReaderOnly, type VisuallyHiddenProps } from "./visually-hidden";

// Live regions and announcer
export {
  LiveRegion,
  AnnouncerProvider,
  useAnnouncer,
  type LiveRegionProps,
  type AnnouncerProviderProps,
} from "./live-region";

// Focus management
export {
  FocusRing,
  FocusableItem,
  useFocusWithin,
  useKeyboardNavigation,
  useFocusTrap,
  getFocusableElements,
  type FocusRingProps,
  type FocusableItemProps,
} from "./focus-visible";