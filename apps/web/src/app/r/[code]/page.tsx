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
import { use, useEffect, useRef } from "react";
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
        <ExpiredLinkView />
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
        <ExpiredLinkView />
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
 * max-w-lg centered, safe area padding, min 16px font.
 */
function QuickReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-lg px-4 pt-4 pb-[env(safe-area-inset-bottom)]">
        {children}
      </div>
    </div>
  );
}
