"use client";

/**
 * Quick Review Microsite - /r/[code]
 *
 * No-auth public route for coaches to review voice note insights.
 * The 8-char code in the URL IS the authentication token.
 * No redirect, no login — renders review UI directly.
 *
 * US-VN-008 (Phase 2)
 */

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Mic, WifiOff } from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import { PDPLogo } from "@/components/pdp-logo";
import { ExpiredLinkView } from "./expired-link-view";
import { InvalidLinkView } from "./invalid-link-view";
import { LoadingSkeleton } from "./loading-skeleton";
import { QuickReviewHeader } from "./quick-review-header";
import { ReviewQueue } from "./review-queue";

type QuickReviewPageProps = {
  params: Promise<{ code: string }>;
};

export default function QuickReviewPage({ params }: QuickReviewPageProps) {
  const { code } = use(params);

  const linkData = useQuery(
    api.models.whatsappReviewLinks.getReviewLinkByCode,
    { code }
  );
  const pendingItems = useQuery(
    api.models.whatsappReviewLinks.getCoachPendingItems,
    linkData?.found && !linkData.isExpired ? { code } : "skip"
  );
  const markAccessed = useMutation(
    api.models.whatsappReviewLinks.markLinkAccessed
  );

  // Log access on first load (once)
  const hasLoggedAccess = useRef(false);
  useEffect(() => {
    if (linkData?.found && !linkData.isExpired && !hasLoggedAccess.current) {
      hasLoggedAccess.current = true;
      markAccessed({
        code,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      });
    }
  }, [linkData, code, markAccessed]);

  // Loading state
  if (linkData === undefined) {
    return (
      <QuickReviewLayout>
        <LoadingSkeleton />
      </QuickReviewLayout>
    );
  }

  // Invalid code
  if (!linkData.found) {
    return (
      <QuickReviewLayout>
        <InvalidLinkView />
      </QuickReviewLayout>
    );
  }

  // Expired link
  if (linkData.isExpired) {
    return (
      <QuickReviewLayout>
        <ExpiredLinkView
          expiresAt={linkData.expiresAt}
          voiceNoteCount={linkData.voiceNoteCount}
        />
      </QuickReviewLayout>
    );
  }

  // Valid link, loading pending items
  if (pendingItems === undefined) {
    return (
      <QuickReviewLayout>
        <QuickReviewHeader
          expiresAt={linkData.expiresAt}
          reviewedCount={0}
          totalCount={0}
          voiceNoteCount={linkData.voiceNoteCount}
        />
        <LoadingSkeleton />
      </QuickReviewLayout>
    );
  }

  // Pending items returned null (shouldn't happen if linkData.found && !isExpired, but handle gracefully)
  if (pendingItems === null) {
    return (
      <QuickReviewLayout>
        <ExpiredLinkView
          expiresAt={linkData.expiresAt}
          voiceNoteCount={linkData.voiceNoteCount}
        />
      </QuickReviewLayout>
    );
  }

  return (
    <QuickReviewLayout>
      <QuickReviewHeader
        expiresAt={linkData.expiresAt}
        reviewedCount={pendingItems.reviewedCount}
        totalCount={pendingItems.totalCount}
        voiceNoteCount={pendingItems.voiceNoteCount}
      />
      <ReviewQueue
        autoApplied={pendingItems.autoApplied}
        code={code}
        injuries={pendingItems.injuries}
        needsReview={pendingItems.needsReview}
        recentlyReviewed={pendingItems.recentlyReviewed}
        reviewedCount={pendingItems.reviewedCount}
        teamNotes={pendingItems.teamNotes}
        todos={pendingItems.todos}
        totalCount={pendingItems.totalCount}
        unmatched={pendingItems.unmatched}
      />
    </QuickReviewLayout>
  );
}

/**
 * Online/offline status hook (US-VN-012d)
 */
function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  return online;
}

/**
 * Mobile-first layout wrapper for the review microsite.
 * max-w-lg centered, safe area padding, min 16px font.
 * Includes SW registration and offline detection (US-VN-012d).
 */
function QuickReviewLayout({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();

  // Register service worker for offline support
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-lg px-4 pt-4 pb-[env(safe-area-inset-bottom)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-lg">Voice Note Review</h1>
          </div>
          <a href="/login" title="Open PlayerARC">
            <PDPLogo size="sm" />
          </a>
        </div>
        {!isOnline && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-2 text-sm text-yellow-800">
            <WifiOff className="h-4 w-4 shrink-0" />
            You're offline. Data will refresh when you reconnect.
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
