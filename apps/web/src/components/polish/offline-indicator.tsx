"use client";

import { useConvex } from "convex/react";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Hook to track online/offline status using Convex's official connection state API
 *
 * Simple logic:
 * - Start assuming online (don't show anything during initial load)
 * - Wait for WebSocket to be confirmed connected
 * - Only THEN start tracking offline/online transitions
 */
export function useOnlineStatus() {
  const convex = useConvex();
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  // Track the previous connection state to detect transitions
  const previouslyConnectedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!convex) {
      return;
    }

    const unsubscribe = convex.subscribeToConnectionState((state) => {
      const connected = state.isWebSocketConnected;
      const previouslyConnected = previouslyConnectedRef.current;

      console.log("[OfflineIndicator]", {
        connected,
        previouslyConnected,
        isFirstState: previouslyConnected === null,
      });

      // First time we get a state - just record it, don't react
      if (previouslyConnected === null) {
        previouslyConnectedRef.current = connected;
        // Always start as online to avoid flashing on page load
        setIsOnline(true);
        console.log("[OfflineIndicator] First state recorded, not reacting");
        return;
      }

      // Now we can track actual transitions
      const wentOffline = previouslyConnected && !connected;
      const cameBackOnline = !previouslyConnected && connected;

      console.log("[OfflineIndicator] Checking transitions:", {
        wentOffline,
        cameBackOnline,
      });

      if (wentOffline) {
        // Actually went offline - show offline banner
        console.log("[OfflineIndicator] Went offline!");
        setIsOnline(false);
      } else if (cameBackOnline) {
        // Came back online - show reconnected banner
        console.log("[OfflineIndicator] Came back online!");
        setIsOnline(true);
        setWasOffline(true);
        setTimeout(() => setWasOffline(false), 3000);
      }

      // Update ref for next comparison
      previouslyConnectedRef.current = connected;
    });

    return () => unsubscribe();
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
