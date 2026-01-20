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
      if (redirect) {
        router.push(redirect as Route);
        return;
      }

      // Check if there's a stored intended URL (from direct navigation)
      const intendedUrl =
        typeof window !== "undefined"
          ? sessionStorage.getItem("intendedUrl")
          : null;

      if (intendedUrl) {
        sessionStorage.removeItem("intendedUrl");
        console.log("[Login] Redirecting to intended URL:", intendedUrl);
        router.push(intendedUrl as Route);
        return;
      }

      // Otherwise go to home page (which will redirect appropriately)
      router.push("/" as Route);
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
