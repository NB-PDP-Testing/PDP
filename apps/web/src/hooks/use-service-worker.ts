"use client";

import * as React from "react";

/**
 * Service Worker registration state
 */
export type ServiceWorkerState = {
  /** Whether the service worker is supported */
  isSupported: boolean;
  /** Whether the service worker is registered */
  isRegistered: boolean;
  /** Whether an update is available */
  hasUpdate: boolean;
  /** Whether the app is offline-ready */
  isOfflineReady: boolean;
  /** Registration object */
  registration: ServiceWorkerRegistration | null;
  /** Error if registration failed */
  error: Error | null;
};

/**
 * Service Worker registration options
 */
export type UseServiceWorkerOptions = {
  /** Path to the service worker file */
  path?: string;
  /** Scope of the service worker */
  scope?: string;
  /** Auto-register on mount */
  autoRegister?: boolean;
  /** Callback when service worker is registered */
  onRegistered?: (registration: ServiceWorkerRegistration) => void;
  /** Callback when update is available */
  onUpdateFound?: (registration: ServiceWorkerRegistration) => void;
  /** Callback when offline ready */
  onOfflineReady?: () => void;
  /** Callback on registration error */
  onError?: (error: Error) => void;
};

/**
 * Hook to manage service worker registration
 */
export function useServiceWorker(
  options: UseServiceWorkerOptions = {}
): ServiceWorkerState & {
  register: () => Promise<ServiceWorkerRegistration | undefined>;
  unregister: () => Promise<boolean>;
  update: () => Promise<void>;
  skipWaiting: () => void;
} {
  const {
    path = "/sw.js",
    scope = "/",
    autoRegister = true,
    onRegistered,
    onUpdateFound,
    onOfflineReady,
    onError,
  } = options;

  const [state, setState] = React.useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    hasUpdate: false,
    isOfflineReady: false,
    registration: null,
    error: null,
  });

  const registrationRef = React.useRef<ServiceWorkerRegistration | null>(null);

  // Check for service worker support
  React.useEffect(() => {
    const isSupported = "serviceWorker" in navigator;
    setState((prev) => ({ ...prev, isSupported }));
  }, []);

  // Register service worker
  const register = React.useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      const error = new Error("Service workers are not supported");
      setState((prev) => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register(path, {
        scope,
      });
      registrationRef.current = registration;

      setState((prev) => ({
        ...prev,
        isRegistered: true,
        registration,
        error: null,
      }));

      onRegistered?.(registration);

      // Listen for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) {
          return;
        }

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              // New update available
              setState((prev) => ({ ...prev, hasUpdate: true }));
              onUpdateFound?.(registration);
            } else {
              // Freshly installed, offline ready
              setState((prev) => ({ ...prev, isOfflineReady: true }));
              onOfflineReady?.();
            }
          }
        });
      });

      // Check if already controlling
      if (registration.active) {
        setState((prev) => ({ ...prev, isOfflineReady: true }));
      }

      return registration;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Registration failed");
      setState((prev) => ({ ...prev, error }));
      onError?.(error);
      return;
    }
  }, [path, scope, onRegistered, onUpdateFound, onOfflineReady, onError]);

  // Unregister service worker
  const unregister = React.useCallback(async () => {
    const registration = registrationRef.current;
    if (!registration) {
      return false;
    }

    try {
      const success = await registration.unregister();
      if (success) {
        setState((prev) => ({
          ...prev,
          isRegistered: false,
          registration: null,
          hasUpdate: false,
          isOfflineReady: false,
        }));
        registrationRef.current = null;
      }
      return success;
    } catch {
      return false;
    }
  }, []);

  // Check for updates
  const update = React.useCallback(async () => {
    const registration = registrationRef.current;
    if (!registration) {
      return;
    }

    try {
      await registration.update();
    } catch (err) {
      console.error("[SW] Update check failed:", err);
    }
  }, []);

  // Skip waiting and activate new service worker
  const skipWaiting = React.useCallback(() => {
    const registration = registrationRef.current;
    if (!registration?.waiting) {
      return;
    }

    registration.waiting.postMessage({ type: "SKIP_WAITING" });

    // Reload to use new service worker
    window.location.reload();
  }, []);

  // Auto-register on mount
  React.useEffect(() => {
    if (autoRegister && state.isSupported && !state.isRegistered) {
      register();
    }
  }, [autoRegister, state.isSupported, state.isRegistered, register]);

  // Listen for controller changes (new service worker took over)
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
    };
  }, []);

  return {
    ...state,
    register,
    unregister,
    update,
    skipWaiting,
  };
}

/**
 * Check if the app is running as a PWA (installed)
 */
export function useIsPWA(): boolean {
  const [isPWA, setIsPWA] = React.useState(false);

  React.useEffect(() => {
    // Check display-mode media query
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    setIsPWA(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsPWA(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isPWA;
}

/**
 * Check if the app can be installed as PWA
 */
export function useCanInstallPWA(): {
  canInstall: boolean;
  promptInstall: () => Promise<void>;
} {
  const [canInstall, setCanInstall] = React.useState(false);
  const deferredPromptRef = React.useRef<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    const deferredPrompt = deferredPromptRef.current;
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setCanInstall(false);
      deferredPromptRef.current = null;
    }
  }, []);

  return { canInstall, promptInstall };
}

// Type declaration for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}
