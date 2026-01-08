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

// Keyboard shortcuts
export {
  KeyboardShortcutsOverlay,
  useKeyboardShortcutsOverlay,
  DEFAULT_SHORTCUTS,
  type KeyboardShortcutsOverlayProps,
  type ShortcutCategory,
} from "./keyboard-shortcuts-overlay";

// Density controls
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

// Offline support
export {
  OfflineIndicator,
  OfflineBadge,
  OfflineWrapper,
  OfflineContent,
  useOnlineStatus,
  type OfflineIndicatorProps,
} from "./offline-indicator";

// PWA install prompt
export {
  PWAInstallPrompt,
  useIsPWAInstalled,
} from "./pwa-install-prompt";

// Resizable sidebar
export {
  ResizableSidebar,
  useSidebarState,
} from "./resizable-sidebar";

// Pinned favorites
export {
  PinnedFavorites,
  FavoriteToggleButton,
  useFavorites,
  type FavoriteItem,
} from "./pinned-favorites";

// Recent items history
export {
  RecentItems,
  PageTracker,
  useRecentItems,
  type RecentItem,
} from "./recent-items";
