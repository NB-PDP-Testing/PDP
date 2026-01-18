import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/loading/page-skeleton";
import { ParentSharingDashboard } from "./components/parent-sharing-dashboard";

export const metadata: Metadata = {
  title: "Passport Sharing | Parent Dashboard",
  description: "Manage your children's passport sharing settings",
};

type ParentSharingPageProps = {
  params: Promise<{ orgId: string }>;
};

export default async function ParentSharingPage({
  params,
}: ParentSharingPageProps) {
  const { orgId } = await params;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ParentSharingDashboard orgId={orgId} />
    </Suspense>
  );
}
