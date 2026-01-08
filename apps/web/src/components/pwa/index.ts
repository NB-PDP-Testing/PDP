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
  ServiceWorkerProvider,
  useSW,
  type ServiceWorkerProviderProps,
} from "./service-worker-provider";

export {
  PWAUpdatePrompt,
  PWAOfflineReadyPrompt,
  type PWAUpdatePromptProps,
} from "./pwa-update-prompt";

// Re-export related components from polish
export {
  PWAInstallPrompt,
  useIsPWAInstalled,
} from "../polish/pwa-install-prompt";

export {
  OfflineIndicator,
  OfflineBadge,
  OfflineWrapper,
  OfflineContent,
  useOnlineStatus,
  type OfflineIndicatorProps,
} from "../polish/offline-indicator";