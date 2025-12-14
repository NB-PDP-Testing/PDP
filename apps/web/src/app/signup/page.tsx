"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/loader";
import SignUpForm from "@/components/sign-up-form";

export default function SignUpPage() {
  const router = useRouter();

  return (
    <>
      <Authenticated>
        <RedirectToOrgs router={router} />
      </Authenticated>
      <Unauthenticated>
        <SignUpForm />
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader />
        </div>
      </AuthLoading>
    </>
  );
}

function RedirectToOrgs({ router }: { router: ReturnType<typeof useRouter> }) {
  const user = useCurrentUser();

  useEffect(() => {
    // Platform staff should go directly to /orgs
    if (user?.isPlatformStaff) {
      router.push("/orgs" as Route);
    } else {
      router.push("/orgs/current" as Route);
    }
  }, [router, user]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}
