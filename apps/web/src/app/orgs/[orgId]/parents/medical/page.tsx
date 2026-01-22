"use client";

import { Heart } from "lucide-react";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import Loader from "@/components/loader";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";
import { MedicalInfo } from "../components/medical-info";

function MedicalPageContent() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { data: session } = authClient.useSession();

  const { children: identityChildren, isLoading } = useGuardianChildrenInOrg(
    orgId,
    session?.user?.email
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
        <div className="flex items-center gap-3">
          <Heart className="h-8 w-8" />
          <div>
            <h1 className="font-bold text-2xl">Medical Information</h1>
            <p className="mt-1 text-red-100">
              Manage medical profiles and emergency contacts for your children
            </p>
          </div>
        </div>
      </div>

      {/* Medical Info Component */}
      <MedicalInfo orgId={orgId} playerData={identityChildren} />
    </div>
  );
}

export default function MedicalPage() {
  return (
    <Suspense fallback={<Loader />}>
      <MedicalPageContent />
    </Suspense>
  );
}
