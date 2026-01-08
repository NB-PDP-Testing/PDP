"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, Download, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallPromptProps {
  /** Custom class name */
  className?: string;
  /** Called when user dismisses the prompt */
  onDismiss?: () => void;
  /** Called when user installs the app */
  onInstall?: () => void;
}

/**
 * PWAInstallPrompt - Prompt users to install the app on their device
 * 
 * Features:
 * - Detects when PWA installation is available
 * - Shows platform-specific instructions (iOS vs Android/Desktop)
 * - Remembers if user has dismissed the prompt
 * - Only shows after user has visited multiple times
 */
export function PWAInstallPrompt({
  className,
  onDismiss,
  onInstall,
}: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    // Check if already installed/standalone
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    if (standalone) return;

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if user has dismissed before
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Don't show if dismissed in last 7 days
    if (daysSinceDismissed < 7) return;

    // Track visits
    const visits = parseInt(localStorage.getItem("pwa-visits") || "0") + 1;
    localStorage.setItem("pwa-visits", visits.toString());

    // Show prompt after 3+ visits
    if (visits >= 3) {
      if (iOS) {
        setShowPrompt(true);
      }
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (visits >= 3) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        onInstall?.();
        setShowPrompt(false);
        localStorage.setItem("pwa-installed", "true");
      }
    } catch (error) {
      console.error("PWA install error:", error);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    onDismiss?.();
  };

  // Don't render if already standalone or no prompt to show
  if (isStandalone || !showPrompt) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 left-4 right-4 z-50 md:bottom-4 md:left-auto md:right-4 md:w-[360px]",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        className
      )}
    >
      <div className="rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          {/* App Icon */}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Download className="h-6 w-6 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Install PlayerARC</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isIOS
                ? "Add to your home screen for quick access"
                : "Install for a better experience"}
            </p>

            {isIOS ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Share className="h-4 w-4" />
                  <span>Tap Share</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Plus className="h-4 w-4" />
                  <span>Add to Home Screen</span>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={handleInstall}>
                  Install
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  Not now
                </Button>
              </div>
            )}
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mr-1 -mt-1 flex-shrink-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check if the app is installed as PWA
 */
export function useIsPWAInstalled(): boolean {
  const [isInstalled, setIsInstalled] = React.useState(false);

  React.useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const installed = localStorage.getItem("pwa-installed") === "true";
    setIsInstalled(standalone || installed);
  }, []);

  return isInstalled;
}