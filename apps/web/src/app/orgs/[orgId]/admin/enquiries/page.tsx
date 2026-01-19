import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EnquiryQueueView } from "./enquiry-queue-view";

export const metadata = {
  title: "Passport Enquiries",
  description: "Manage passport enquiries from other organizations",
};

export default async function EnquiriesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="container mx-auto p-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EnquiryQueueView organizationId={orgId} />
      </Suspense>
    </div>
  );
}
