"use client";

import { Download, Plus, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";
import { useAnalytics } from "@/lib/analytics";
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

/** Minimum number of visits before showing the install prompt */
const VISIT_THRESHOLD = 5;

/** Number of days to wait before showing prompt again after dismissal */
const DISMISSAL_COOLDOWN_DAYS = 7;

// Top-level regex patterns for performance (Issue #274)
const IOS_REGEX = /iPad|iPhone|iPod/;
const ANDROID_REGEX = /Android/;
const CHROME_REGEX = /Chrome/;
const GOOGLE_VENDOR_REGEX = /Google Inc/;
const EDGE_REGEX = /Edg/;
const SAFARI_REGEX = /Safari/;
const FIREFOX_REGEX = /Firefox/;

/**
 * Helper to detect platform/browser for analytics
 */
function getPlatformInfo() {
  const userAgent = navigator.userAgent;
  const isIOS = IOS_REGEX.test(userAgent);
  const isAndroid = ANDROID_REGEX.test(userAgent);
  const isChrome =
    CHROME_REGEX.test(userAgent) && GOOGLE_VENDOR_REGEX.test(navigator.vendor);
  const isEdge = EDGE_REGEX.test(userAgent);
  const isSafari =
    SAFARI_REGEX.test(userAgent) && !CHROME_REGEX.test(userAgent);
  const isFirefox = FIREFOX_REGEX.test(userAgent);

  let platform = "desktop";
  if (isIOS) {
    platform = "ios";
  } else if (isAndroid) {
    platform = "android";
  }

  let browser = "other";
  if (isChrome) {
    browser = "chrome";
  } else if (isEdge) {
    browser = "edge";
  } else if (isSafari) {
    browser = "safari";
  } else if (isFirefox) {
    browser = "firefox";
  }

  return { platform, browser, isIOS, isAndroid };
}

/**
 * PWAInstallPrompt - Prompt users to install the app on their device
 *
 * Features:
 * - Controlled by PostHog feature flag (ux_pwa_install_prompt)
 * - Detects when PWA installation is available
 * - Shows platform-specific instructions (iOS vs Android/Desktop)
 * - Remembers if user has dismissed the prompt
 * - Only shows after user has visited 5+ times
 * - Tracks install conversion rate via PostHog analytics
 */
export function PWAInstallPrompt({
  className,
  onDismiss,
  onInstall,
  forceShow = false,
}: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasTrackedShow, setHasTrackedShow] = useState(false);

  const { usePWAInstallPrompt: featureFlagEnabled } = useUXFeatureFlags();
  const { track } = useAnalytics();

  // Track when prompt is shown (only once per mount)
  useEffect(() => {
    if (showPrompt && !hasTrackedShow) {
      const { platform, browser } = getPlatformInfo();
      const visits = Number.parseInt(
        localStorage.getItem("pwa-visits") || "0",
        10
      );

      track("pwa_install_prompt_shown", {
        platform,
        browser,
        visit_count: visits,
      });
      setHasTrackedShow(true);
    }
  }, [showPrompt, hasTrackedShow, track]);

  useEffect(() => {
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
    const iOS = IOS_REGEX.test(navigator.userAgent);
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

    // Don't show if dismissed within cooldown period
    if (daysSinceDismissed < DISMISSAL_COOLDOWN_DAYS) {
      return;
    }

    // Track visits
    const visits =
      Number.parseInt(localStorage.getItem("pwa-visits") || "0", 10) + 1;
    localStorage.setItem("pwa-visits", visits.toString());

    // Show prompt after threshold visits (Issue #274: changed from 3 to 5)
    if (visits >= VISIT_THRESHOLD && iOS) {
      setShowPrompt(true);
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (visits >= VISIT_THRESHOLD) {
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
    const { platform, browser } = getPlatformInfo();

    // Track install button click
    track("pwa_install_clicked", {
      platform,
      browser,
    });

    // If we have the deferred prompt, use native install
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
          // Track successful install
          track("pwa_install_accepted", {
            platform,
            browser,
          });
          onInstall?.();
          setShowPrompt(false);
          localStorage.setItem("pwa-installed", "true");
        } else {
          // Track declined install
          track("pwa_install_declined", {
            platform,
            browser,
          });
        }
      } catch (error) {
        console.error("PWA install error:", error);
      }
      setDeferredPrompt(null);
      return;
    }

    // No native prompt available - show manual instructions
    const userAgent = navigator.userAgent;
    const isChrome =
      CHROME_REGEX.test(userAgent) &&
      GOOGLE_VENDOR_REGEX.test(navigator.vendor);
    const isEdge = EDGE_REGEX.test(userAgent);
    const isFirefox = FIREFOX_REGEX.test(userAgent);

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

    // biome-ignore lint/suspicious/noAlert: Legacy fallback for browsers without native install prompt
    alert(instructions);
  };

  const handleDismiss = () => {
    const { platform, browser } = getPlatformInfo();
    const visits = Number.parseInt(
      localStorage.getItem("pwa-visits") || "0",
      10
    );

    // Track dismissal
    track("pwa_install_prompt_dismissed", {
      platform,
      browser,
      visit_count: visits,
    });

    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    onDismiss?.();
  };

  // Don't render if feature flag is disabled (unless forceShow/debug mode)
  if (!(featureFlagEnabled || forceShow)) {
    return null;
  }

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
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const installed = localStorage.getItem("pwa-installed") === "true";
    setIsInstalled(standalone || installed);
  }, []);

  return isInstalled;
}
