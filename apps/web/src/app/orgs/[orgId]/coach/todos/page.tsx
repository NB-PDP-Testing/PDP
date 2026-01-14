import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/loading/page-skeleton";
import { CoachTodosView } from "./components/coach-todos-view";

export const metadata: Metadata = {
  title: "Action Center | Coach Dashboard",
  description: "Your coaching tasks, action items, and insights",
};

type CoachTodosPageProps = {
  params: Promise<{ orgId: string }>;
};

export default async function CoachTodosPage({ params }: CoachTodosPageProps) {
  const { orgId } = await params;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <CoachTodosView orgId={orgId} />
    </Suspense>
  );
}
