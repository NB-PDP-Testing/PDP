"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
} from "convex/react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import SignInForm from "@/components/sign-in-form";
import { useCurrentUser } from "@/hooks/use-current-user";

function LoginContent() {
  const user = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [checkedInvitation, setCheckedInvitation] = useState(false);
  const processPendingInvitation = useMutation(
    api.models.platformStaffInvitations.processPendingInvitation
  );

  useEffect(() => {
    const handleRedirect = async () => {
      if (!user || checkedInvitation) {
        return;
      }

      // Check if user has a pending platform staff invitation
      if (user.email) {
        try {
          const inviteResult = await processPendingInvitation({
            email: user.email,
            userId: user._id,
          });
          setCheckedInvitation(true);

          if (inviteResult.grantedStaffAccess) {
            toast.success(
              "🎉 Welcome to the platform staff team! You now have platform admin access."
            );
            router.push("/platform" as Route);
            return;
          }
        } catch (error) {
          console.error("Error processing platform staff invitation:", error);
        }
      }

      setCheckedInvitation(true);

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
    };

    if (user) {
      handleRedirect();
    }
  }, [user, router, redirect, checkedInvitation, processPendingInvitation]);

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
