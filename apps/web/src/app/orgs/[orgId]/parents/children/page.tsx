import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/loading/page-skeleton";
import { ParentChildrenView } from "./components/parent-children-view";

export const metadata: Metadata = {
  title: "My Children | Parent Dashboard",
  description: "View and manage your children's profiles",
};

type ParentChildrenPageProps = {
  params: Promise<{ orgId: string }>;
};

export default async function ParentChildrenPage({
  params,
}: ParentChildrenPageProps) {
  const { orgId } = await params;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ParentChildrenView orgId={orgId} />
    </Suspense>
  );
}
