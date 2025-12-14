"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import Loader from "@/components/loader";
import SignUpForm from "@/components/sign-up-form";
import { useCurrentUser } from "@/hooks/use-current-user";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  return (
    <>
      <Authenticated>
        <RedirectToOrgs redirect={redirect} router={router} />
      </Authenticated>
      <Unauthenticated>
        <SignUpForm redirect={redirect} />
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader />
        </div>
      </AuthLoading>
    </>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<Loader />}>
      <SignUpContent />
    </Suspense>
  );
}

function RedirectToOrgs({
  router,
  redirect,
}: {
  router: ReturnType<typeof useRouter>;
  redirect: string | null;
}) {
  const user = useCurrentUser();

  useEffect(() => {
    // If there's a redirect parameter, use it (e.g., from invitation link)
    if (redirect) {
      router.push(redirect as Route);
    } else if (user?.isPlatformStaff) {
      router.push("/orgs" as Route);
    } else {
      router.push("/orgs/current" as Route);
    }
  }, [router, user, redirect]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}
