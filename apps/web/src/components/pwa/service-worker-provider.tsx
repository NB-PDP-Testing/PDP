"use client";

import * as React from "react";
import { useServiceWorker } from "@/hooks/use-service-worker";
import type { ServiceWorkerState } from "@/hooks/use-service-worker";
import { toast } from "sonner";

/**
 * Service Worker Context
 */
interface ServiceWorkerContextValue extends ServiceWorkerState {
  register: () => Promise<ServiceWorkerRegistration | undefined>;
  unregister: () => Promise<boolean>;
  update: () => Promise<void>;
  skipWaiting: () => void;
}

const ServiceWorkerContext = React.createContext<ServiceWorkerContextValue | null>(null);

/**
 * Hook to access service worker context
 */
export function useSW() {
  const context = React.useContext(ServiceWorkerContext);
  if (!context) {
    throw new Error("useSW must be used within a ServiceWorkerProvider");
  }
  return context;
}

/**
 * Props for ServiceWorkerProvider
 */
export interface ServiceWorkerProviderProps {
  children: React.ReactNode;
  /** Whether to show toast notifications */
  showToasts?: boolean;
  /** Whether to auto-register the service worker */
  autoRegister?: boolean;
}

/**
 * ServiceWorkerProvider - Manages service worker lifecycle
 * 
 * Features:
 * - Auto-registers service worker
 * - Shows toast when update is available
 * - Shows toast when offline-ready
 * - Provides context for child components
 */
export function ServiceWorkerProvider({
  children,
  showToasts = true,
  autoRegister = true,
}: ServiceWorkerProviderProps) {
  const sw = useServiceWorker({
    autoRegister,
    onOfflineReady: () => {
      if (showToasts) {
        toast.success("App is ready for offline use", {
          description: "Content has been cached for offline access.",
          duration: 4000,
        });
      }
    },
    onUpdateFound: () => {
      if (showToasts) {
        toast("Update available", {
          description: "A new version is available. Refresh to update.",
          action: {
            label: "Refresh",
            onClick: () => sw.skipWaiting(),
          },
          duration: 0, // Don't auto-dismiss
        });
      }
    },
    onError: (error) => {
      console.error("[SW] Registration error:", error);
    },
  });

  return (
    <ServiceWorkerContext.Provider value={sw}>
      {children}
    </ServiceWorkerContext.Provider>
  );
}