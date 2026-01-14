"use client";

import { Download, Plus, Share, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

type PWAInstallPromptProps = {
  /** Custom class name */
  className?: string;
  /** Called when user dismisses the prompt */
  onDismiss?: () => void;
  /** Called when user installs the app */
  onInstall?: () => void;
  /** Force show the prompt (for testing/debugging) */
  forceShow?: boolean;
};

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
  forceShow = false,
}: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    // Check for debug param in URL: ?pwa-debug=true
    const urlParams = new URLSearchParams(window.location.search);
    const debugMode = urlParams.get("pwa-debug") === "true" || forceShow;

    // Check if already installed/standalone
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    if (standalone && !debugMode) {
      return;
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Force show immediately in debug mode
    if (debugMode) {
      setShowPrompt(true);
      return;
    }

    // Check if user has dismissed before
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    const dismissedTime = dismissed ? Number.parseInt(dismissed, 10) : 0;
    const daysSinceDismissed =
      (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Don't show if dismissed in last 7 days
    if (daysSinceDismissed < 7) {
      return;
    }

    // Track visits
    const visits =
      Number.parseInt(localStorage.getItem("pwa-visits") || "0", 10) + 1;
    localStorage.setItem("pwa-visits", visits.toString());

    // Show prompt after 3+ visits
    if (visits >= 3 && iOS) {
      setShowPrompt(true);
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
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, [forceShow]);

  const handleInstall = async () => {
    // If we have the deferred prompt, use native install
    if (deferredPrompt) {
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
      return;
    }

    // No native prompt available - show manual instructions
    const isChrome =
      /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);

    let instructions = "";
    if (isChrome || isEdge) {
      instructions =
        "To install:\n\n1. Click the install icon (⊕) in the address bar\n   OR\n2. Click ⋮ menu → 'Install PlayerARC'\n\nThe install icon appears on the right side of the address bar.";
    } else if (isFirefox) {
      instructions =
        "Firefox doesn't support PWA installation.\n\nTry using Chrome or Edge for the best experience.";
    } else {
      instructions =
        "To install:\n\n1. Look for an install icon in the address bar\n2. Or check your browser's menu for 'Install' option";
    }

    alert(instructions);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    onDismiss?.();
  };

  // Don't render if already standalone or no prompt to show (unless forceShow)
  if (isStandalone || !(showPrompt || forceShow)) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed right-4 bottom-20 left-4 z-50 md:right-4 md:bottom-4 md:left-auto md:w-[360px]",
        "slide-in-from-bottom-4 fade-in animate-in duration-300",
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
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm">Install PlayerARC</h3>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {isIOS
                ? "Add to your home screen for quick access"
                : "Install for a better experience"}
            </p>

            {isIOS ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Share className="h-4 w-4" />
                  <span>Tap Share</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Plus className="h-4 w-4" />
                  <span>Add to Home Screen</span>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button onClick={handleInstall} size="sm">
                  Install
                </Button>
                <Button onClick={handleDismiss} size="sm" variant="ghost">
                  Not now
                </Button>
              </div>
            )}
          </div>

          {/* Close button */}
          <Button
            className="-mr-1 -mt-1 h-6 w-6 flex-shrink-0"
            onClick={handleDismiss}
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
