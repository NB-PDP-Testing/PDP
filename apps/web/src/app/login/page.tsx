"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import Loader from "@/components/loader";
import SignInForm from "@/components/sign-in-form";
import { useCurrentUser } from "@/hooks/use-current-user";

function LoginContent() {
  const user = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  useEffect(() => {
    if (user) {
      // If there's a redirect parameter (e.g., from invitation link), use it
      // Otherwise go to home page (which will redirect appropriately)
      if (redirect) {
        router.push(redirect as Route);
      } else {
        router.push("/" as Route);
      }
    }
  }, [user, router, redirect]);

  return (
    <>
      <Authenticated>
        <div className="flex min-h-screen items-center justify-center">
          <Loader />
        </div>
      </Authenticated>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader />
        </div>
      </AuthLoading>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loader />}>
      <LoginContent />
    </Suspense>
  );
}
