import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/loading/page-skeleton";
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
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl">Coach Feedback</h1>
        <p className="mt-2 text-muted-foreground">
          AI-generated summaries from your coach's voice notes and observations
        </p>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <CoachFeedbackEnhanced orgId={orgId} />
      </Suspense>
    </div>
  );
}
