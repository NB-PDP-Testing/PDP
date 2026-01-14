import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/loading/page-skeleton";
import { CoachPlayersView } from "./components/coach-players-view";

export const metadata: Metadata = {
  title: "My Players | Coach Dashboard",
  description: "View and manage your team players",
};

type CoachPlayersPageProps = {
  params: Promise<{ orgId: string }>;
};

export default async function CoachPlayersPage({
  params,
}: CoachPlayersPageProps) {
  const { orgId } = await params;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <CoachPlayersView orgId={orgId} />
    </Suspense>
  );
}
