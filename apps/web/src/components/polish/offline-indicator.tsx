"use client";

import { useConvex } from "convex/react";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import type * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Hook to track online/offline status using hybrid approach:
 * - navigator.onLine for device-level network status
 * - Convex connection state for backend connectivity
 */
export function useOnlineStatus() {
  const convex = useConvex();
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    let checkInterval: NodeJS.Timeout;
    let previousState = true;

    const checkConnection = () => {
      const browserOnline = navigator.onLine;

      // Convex client has a connectionState that we can check
      // @ts-expect-error - connectionState is not in public types but exists
      const connectionState = convex?.sync?.connectionState?.()?.state;

      // Priority logic:
      // 1. If Convex is "Connected" → definitely online (ignore browser)
      // 2. If Convex is "Disconnected"/error → definitely offline (app won't work)
      // 3. If Convex is undefined (initial load) → fallback to browser status
      let connected: boolean;
      if (connectionState === "Connected") {
        connected = true; // Convex connected = definitely online
      } else if (connectionState === undefined) {
        connected = browserOnline; // Unknown, use browser as fallback
      } else {
        connected = false; // Convex disconnected/error = definitely offline
      }

      // Debug logging
      if (process.env.NODE_ENV === "development") {
        console.log("[Offline Indicator Debug]", {
          browserOnline,
          connectionState,
          finalConnected: connected,
        });
      }

      if (connected !== previousState) {
        if (connected) {
          setIsOnline(true);
          setWasOffline(true);
          // Clear "was offline" after a few seconds
          setTimeout(() => setWasOffline(false), 5000);
        } else {
          setIsOnline(false);
        }
        previousState = connected;
      }
    };

    // Listen to browser online/offline events
    const handleBrowserOnline = () => checkConnection();
    const handleBrowserOffline = () => {
      setIsOnline(false);
      previousState = false;
    };

    window.addEventListener("online", handleBrowserOnline);
    window.addEventListener("offline", handleBrowserOffline);

    // Check immediately and then every 3 seconds for Convex state
    checkConnection();
    checkInterval = setInterval(checkConnection, 3000);

    return () => {
      window.removeEventListener("online", handleBrowserOnline);
      window.removeEventListener("offline", handleBrowserOffline);
      clearInterval(checkInterval);
    };
  }, [convex]);

  return { isOnline, wasOffline };
}

/**
 * Props for OfflineIndicator
 */
export type OfflineIndicatorProps = {
  /** Position of the indicator */
  position?: "top" | "bottom";
  /** Additional class name */
  className?: string;
  /** Whether to show reconnected message */
  showReconnected?: boolean;
  /** Custom offline message */
  offlineMessage?: string;
  /** Custom reconnected message */
  reconnectedMessage?: string;
};

/**
 * OfflineIndicator - Shows when the user is offline
 *
 * Displays a banner when the connection is lost
 * Shows "reconnected" briefly when connection is restored
 */
export function OfflineIndicator({
  position = "top",
  className,
  showReconnected = true,
  offlineMessage = "You're offline. Some features may not be available.",
  reconnectedMessage = "You're back online!",
}: OfflineIndicatorProps) {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showBanner, setShowBanner] = useState(false);

  // Show banner when offline
  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
    } else if (showReconnected && wasOffline) {
      // Keep showing for reconnected message
      setShowBanner(true);
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowBanner(false);
    }
  }, [isOnline, wasOffline, showReconnected]);

  if (!showBanner) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={cn(
        "fixed right-0 left-0 z-50 flex items-center justify-center gap-2 px-4 py-2 font-medium text-sm transition-all duration-300",
        position === "top" ? "top-0" : "bottom-0",
        isOnline ? "bg-green-500 text-white" : "bg-yellow-500 text-yellow-950",
        className
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>{reconnectedMessage}</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>{offlineMessage}</span>
          <Button
            className="ml-2 h-7 px-2 hover:bg-yellow-600/20"
            onClick={() => window.location.reload()}
            size="sm"
            variant="ghost"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * OfflineBadge - Small indicator for headers/nav
 */
export function OfflineBadge({ className }: { className?: string }) {
  const { isOnline } = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 font-medium text-xs text-yellow-800",
        className
      )}
      title="You're offline"
    >
      <WifiOff className="h-3 w-3" />
      <span className="hidden sm:inline">Offline</span>
    </div>
  );
}

/**
 * OfflineWrapper - Wrapper that shows offline state for specific content
 */
export function OfflineWrapper({
  children,
  offlineContent,
  className,
}: {
  children: React.ReactNode;
  offlineContent?: React.ReactNode;
  className?: string;
}) {
  const { isOnline } = useOnlineStatus();

  if (!isOnline && offlineContent) {
    return <>{offlineContent}</>;
  }

  return (
    <div
      className={cn(className, !isOnline && "pointer-events-none opacity-50")}
    >
      {children}
    </div>
  );
}

/**
 * Default offline content component
 */
export function OfflineContent({
  title = "You're offline",
  description = "Please check your internet connection and try again.",
  showRetry = true,
  onRetry,
}: {
  title?: string;
  description?: string;
  showRetry?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 rounded-full bg-yellow-100 p-4">
        <WifiOff className="h-8 w-8 text-yellow-600" />
      </div>
      <h3 className="mb-2 font-semibold text-lg">{title}</h3>
      <p className="mb-4 max-w-sm text-muted-foreground text-sm">
        {description}
      </p>
      {showRetry && (
        <Button
          onClick={onRetry ?? (() => window.location.reload())}
          variant="outline"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}
