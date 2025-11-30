"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/loader";

export default function Home() {
  return (
    <>
      <Authenticated>
        <RedirectToOrgs />
      </Authenticated>
      <Unauthenticated>
        <RedirectToLogin />
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader />
        </div>
      </AuthLoading>
    </>
  );
}

function RedirectToOrgs() {
  // const { data: activeOrganization } = authClient.useActiveOrganization();
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;

  useEffect(() => {
    if (orgId) {
      router.push(`/orgs/${orgId}/coach` as Route);
    }
  }, [router, orgId]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}

function RedirectToLogin() {
  const router = useRouter();

  useEffect(() => {
    router.push("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}
