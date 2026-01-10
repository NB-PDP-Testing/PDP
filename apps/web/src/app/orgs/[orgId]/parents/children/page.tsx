import type { Metadata } from "next";
import { Suspense } from "react";
import { ParentChildrenView } from "./components/parent-children-view";
import { PageSkeleton } from "@/components/loading/page-skeleton";

export const metadata: Metadata = {
  title: "My Children | Parent Dashboard",
  description: "View and manage your children's profiles",
};

interface ParentChildrenPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function ParentChildrenPage({ params }: ParentChildrenPageProps) {
  const { orgId } = await params;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ParentChildrenView orgId={orgId} />
    </Suspense>
  );
}
