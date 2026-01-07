/**
 * Polish Components
 * 
 * Phase 5 UX improvements: Polish & Platform Features
 * - Keyboard shortcuts overlay (? to show)
 * - Density toggle (compact/comfortable/spacious)
 * - Offline indicator (PWA support)
 */

export {
  KeyboardShortcutsOverlay,
  useKeyboardShortcutsOverlay,
  DEFAULT_SHORTCUTS,
  type KeyboardShortcutsOverlayProps,
  type ShortcutCategory,
} from "./keyboard-shortcuts-overlay";

export {
  DensityProvider,
  DensityToggle,
  useDensity,
  useDensityOptional,
  useDensityClasses,
  DENSITY_CONFIG,
  type DensityLevel,
  type DensityProviderProps,
  type DensityToggleProps,
} from "./density-toggle";

export {
  OfflineIndicator,
  OfflineBadge,
  OfflineWrapper,
  OfflineContent,
  useOnlineStatus,
  type OfflineIndicatorProps,
} from "./offline-indicator";