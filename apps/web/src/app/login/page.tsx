"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/loader";
import SignInForm from "@/components/sign-in-form";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function DashboardPage() {
  const user = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

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
