"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/loader";

/**
 * Redirect from /setup/create-org to /setup/organization
 * This ensures consistency with the setup wizard flow
 */
export default function CreateOrgRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/setup/organization");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader />
    </div>
  );
}
