"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/loader";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function CurrentOrgRedirectPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const isLoading = user === undefined;

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // Not authenticated, redirect to login
      router.push("/login");
      return;
    }

    if (user.currentOrgId) {
      // User has a current org, redirect to it
      router.push(`/orgs/${user.currentOrgId}/admin`);
    } else {
      // No current org, go to org selection
      router.push("/orgs");
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}
