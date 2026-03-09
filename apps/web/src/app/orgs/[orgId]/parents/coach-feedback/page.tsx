import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/loading/page-skeleton";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { CoachFeedbackEnhanced } from "../components/coach-feedback-enhanced";

export const metadata: Metadata = {
  title: "Coach Feedback | Parent Dashboard",
  description: "View AI-generated summaries from your coach's voice notes",
};

type CoachFeedbackPageProps = {
  params: Promise<{ orgId: string }>;
};

export default async function CoachFeedbackPage({
  params,
}: CoachFeedbackPageProps) {
  const { orgId } = await params;

  return (
    <div className="space-y-4 sm:space-y-6">
      <OrgThemedGradient
        className="rounded-lg p-4 shadow-md md:p-6"
        gradientTo="secondary"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <Sparkles className="h-7 w-7 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-xl md:text-2xl">Coach Feedback</h1>
            <p className="text-sm opacity-90">
              AI-generated summaries from your coach&apos;s voice notes and
              observations
            </p>
          </div>
        </div>
      </OrgThemedGradient>

      <Suspense fallback={<PageSkeleton />}>
        <CoachFeedbackEnhanced orgId={orgId} />
      </Suspense>
    </div>
  );
}
