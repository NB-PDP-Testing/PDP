"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSW } from "./service-worker-provider";

/**
 * Props for PWAUpdatePrompt
 */
export interface PWAUpdatePromptProps {
  /** Custom class name */
  className?: string;
  /** Position of the prompt */
  position?: "top" | "bottom";
}

/**
 * PWAUpdatePrompt - Shows when a new version is available
 * 
 * Features:
 * - Shows banner when update is available
 * - Click to refresh and activate new version
 * - Can be dismissed temporarily
 */
export function PWAUpdatePrompt({
  className,
  position = "bottom",
}: PWAUpdatePromptProps) {
  const { hasUpdate, skipWaiting } = useSW();
  const [dismissed, setDismissed] = React.useState(false);

  if (!hasUpdate || dismissed) return null;

  return (
    <div
      className={cn(
        "fixed left-4 right-4 z-50 md:left-auto md:right-4 md:w-[360px]",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        position === "top" ? "top-4" : "bottom-20 md:bottom-4",
        className
      )}
    >
      <div className="rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
            <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Update Available</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              A new version of PlayerARC is available. Refresh to get the latest features.
            </p>

            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={skipWaiting} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed(true)}
              >
                Later
              </Button>
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mr-1 -mt-1 flex-shrink-0"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * PWAOfflineReadyPrompt - Shows when app is ready for offline use
 */
export function PWAOfflineReadyPrompt({
  className,
}: {
  className?: string;
}) {
  const { isOfflineReady } = useSW();
  const [show, setShow] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (isOfflineReady && !dismissed) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOfflineReady, dismissed]);

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 left-4 right-4 z-50 md:bottom-4 md:left-auto md:right-4 md:w-[300px]",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        className
      )}
    >
      <div className="rounded-xl border bg-card p-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <svg
              className="h-4 w-4 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Ready for offline use</p>
            <p className="text-xs text-muted-foreground">
              Content cached for offline access
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={() => {
              setShow(false);
              setDismissed(true);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}