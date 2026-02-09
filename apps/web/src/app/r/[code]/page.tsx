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
import { LogIn, Mic } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useRef } from "react";
import { OfflineIndicator } from "@/components/polish/offline-indicator";
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
 * Mobile-first layout wrapper for the review microsite.
 * Navy header bar matching playerarc.io brand, minimal footer with login link.
 * Offline detection via shared OfflineIndicator (US-VN-012d).
 * SW registration handled by ServiceWorkerProvider in root layout.
 */
function QuickReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <OfflineIndicator
        offlineMessage="You're offline. Data will refresh when you reconnect."
        position="top"
      />

      {/* Navy header bar */}
      <header className="bg-[#1E3A5F]">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link className="flex items-center gap-2.5" href="/">
            <div className="relative h-8 w-8">
              <Image
                alt="PlayerARC"
                className="object-contain"
                fill
                priority
                sizes="32px"
                src="/logos-landing/PDP-Logo-OffWhiteOrbit_GreenHuman.png"
              />
            </div>
            <span className="font-bold text-sm text-white">PlayerARC</span>
          </Link>
          <div className="flex items-center gap-1.5 text-white/90">
            <Mic className="h-4 w-4" />
            <span className="font-medium text-sm">Voice Note Review</span>
          </div>
        </div>
      </header>

      {/* Content area */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-6">
        {children}
      </main>

      {/* Minimal footer */}
      <footer className="bg-[#1E3A5F] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <span className="text-white/60 text-xs">
            &copy; {new Date().getFullYear()} PlayerARC
          </span>
          <Link
            className="flex items-center gap-1.5 text-white/80 text-xs transition-colors hover:text-white"
            href="/login"
          >
            <LogIn className="h-3.5 w-3.5" />
            Log in to PlayerARC
          </Link>
        </div>
      </footer>
    </div>
  );
}
