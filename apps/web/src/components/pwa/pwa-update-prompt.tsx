"use client";

import { Download, RefreshCw, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSW } from "./service-worker-provider";

/**
 * Props for PWAUpdatePrompt
 */
export type PWAUpdatePromptProps = {
  /** Custom class name */
  className?: string;
  /** Position of the prompt */
  position?: "top" | "bottom";
};

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

  if (!hasUpdate || dismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed right-4 left-4 z-50 md:right-4 md:left-auto md:w-[360px]",
        "slide-in-from-bottom-4 fade-in animate-in duration-300",
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
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm">Update Available</h3>
            <p className="mt-0.5 text-muted-foreground text-xs">
              A new version of PlayerARC is available. Refresh to get the latest
              features.
            </p>

            <div className="mt-3 flex gap-2">
              <Button className="gap-1.5" onClick={skipWaiting} size="sm">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Now
              </Button>
              <Button
                onClick={() => setDismissed(true)}
                size="sm"
                variant="ghost"
              >
                Later
              </Button>
            </div>
          </div>

          {/* Close button */}
          <Button
            className="-mr-1 -mt-1 h-6 w-6 flex-shrink-0"
            onClick={() => setDismissed(true)}
            size="icon"
            variant="ghost"
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
export function PWAOfflineReadyPrompt({ className }: { className?: string }) {
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

  if (!show) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed right-4 bottom-20 left-4 z-50 md:right-4 md:bottom-4 md:left-auto md:w-[300px]",
        "slide-in-from-bottom-4 fade-in animate-in duration-300",
        className
      )}
    >
      <div className="rounded-xl border bg-card p-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <svg
              className="h-4 w-4 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M5 13l4 4L19 7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm">Ready for offline use</p>
            <p className="text-muted-foreground text-xs">
              Content cached for offline access
            </p>
          </div>
          <Button
            className="h-6 w-6 flex-shrink-0"
            onClick={() => {
              setShow(false);
              setDismissed(true);
            }}
            size="icon"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
