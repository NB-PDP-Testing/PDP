"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  useEffect(() => {
    router.push("/orgs/current" as Route);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}

function RedirectToLogin() {
  const router = useRouter();

  useEffect(() => {
    router.push("/login" as Route);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}
