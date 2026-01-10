import type { Metadata } from "next";
import { Suspense } from "react";
import { ParentProgressView } from "./components/parent-progress-view";
import { PageSkeleton } from "@/components/loading/page-skeleton";

export const metadata: Metadata = {
  title: "Progress | Parent Dashboard",
  description: "Track your children's development and progress",
};

interface ParentProgressPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function ParentProgressPage({ params }: ParentProgressPageProps) {
  const { orgId } = await params;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ParentProgressView orgId={orgId} />
    </Suspense>
  );
}
