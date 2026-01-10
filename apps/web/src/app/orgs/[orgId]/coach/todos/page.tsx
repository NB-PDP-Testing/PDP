import type { Metadata } from "next";
import { Suspense } from "react";
import { CoachTodosView } from "./components/coach-todos-view";
import { PageSkeleton } from "@/components/loading/page-skeleton";

export const metadata: Metadata = {
  title: "Action Center | Coach Dashboard",
  description: "Your coaching tasks, action items, and insights",
};

interface CoachTodosPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function CoachTodosPage({ params }: CoachTodosPageProps) {
  const { orgId } = await params;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <CoachTodosView orgId={orgId} />
    </Suspense>
  );
}
