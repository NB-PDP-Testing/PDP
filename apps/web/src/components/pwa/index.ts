/**
 * PWA Components
 *
 * Phase 11 UX improvements: Progressive Web App features
 *
 * Components:
 * - ServiceWorkerProvider: Manages service worker lifecycle
 * - PWAUpdatePrompt: Shows when update is available
 * - PWAOfflineReadyPrompt: Shows when app is ready for offline use
 *
 * Related components (in polish/):
 * - PWAInstallPrompt: Prompts users to install the app
 * - OfflineIndicator: Shows when user is offline
 */

export {
  OfflineBadge,
  OfflineContent,
  OfflineIndicator,
  type OfflineIndicatorProps,
  OfflineWrapper,
  useOnlineStatus,
} from "../polish/offline-indicator";
// Re-export related components from polish
export {
  PWAInstallPrompt,
  useIsPWAInstalled,
} from "../polish/pwa-install-prompt";
export {
  PWAOfflineReadyPrompt,
  PWAUpdatePrompt,
  type PWAUpdatePromptProps,
} from "./pwa-update-prompt";
export {
  ServiceWorkerProvider,
  type ServiceWorkerProviderProps,
  useSW,
} from "./service-worker-provider";
