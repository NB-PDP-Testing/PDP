import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SharedPassportsView } from "./shared-passports-view";

export const metadata = {
  title: "Shared Passports",
  description: "Manage player passport sharing",
};

export default async function SharedPassportsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="container mx-auto p-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <SharedPassportsView orgId={orgId} />
      </Suspense>
    </div>
  );
}
