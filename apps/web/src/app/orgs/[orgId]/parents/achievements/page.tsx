import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/loading/page-skeleton";
import { ParentAchievementsView } from "./components/parent-achievements-view";

export const metadata: Metadata = {
  title: "Achievements | Parent Dashboard",
  description: "View your children's achievements and milestones",
};

interface ParentAchievementsPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function ParentAchievementsPage({
  params,
}: ParentAchievementsPageProps) {
  const { orgId } = await params;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ParentAchievementsView orgId={orgId} />
    </Suspense>
  );
}
