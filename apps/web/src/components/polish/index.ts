/**
 * Polish Components
 *
 * Phase 5 UX improvements: Polish & Platform Features
 * - Keyboard shortcuts overlay (? to show)
 * - Density toggle (compact/comfortable/spacious)
 * - Offline indicator (PWA support)
 * - PWA install prompt
 * - Resizable sidebar
 * - Pinned favorites
 * - Recent items
 */

// Density controls
export {
  DENSITY_CONFIG,
  type DensityLevel,
  DensityProvider,
  type DensityProviderProps,
  DensityToggle,
  type DensityToggleProps,
  useDensity,
  useDensityClasses,
  useDensityOptional,
} from "./density-toggle";
// Keyboard shortcuts
export {
  DEFAULT_SHORTCUTS,
  KeyboardShortcutsOverlay,
  type KeyboardShortcutsOverlayProps,
  type ShortcutCategory,
  useKeyboardShortcutsOverlay,
} from "./keyboard-shortcuts-overlay";

// Offline support
export {
  OfflineBadge,
  OfflineContent,
  OfflineIndicator,
  type OfflineIndicatorProps,
  OfflineWrapper,
  useOnlineStatus,
} from "./offline-indicator";
// Pinned favorites
export {
  type FavoriteItem,
  FavoriteToggleButton,
  PinnedFavorites,
  useFavorites,
} from "./pinned-favorites";
// PWA install prompt
export {
  PWAInstallPrompt,
  useIsPWAInstalled,
} from "./pwa-install-prompt";
// Recent items history
export {
  PageTracker,
  type RecentItem,
  RecentItems,
  useRecentItems,
} from "./recent-items";
// Resizable sidebar
export {
  ResizableSidebar,
  useSidebarState,
} from "./resizable-sidebar";
