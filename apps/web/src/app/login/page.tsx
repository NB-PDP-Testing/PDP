"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
} from "convex/react";
import type { Route } from "next";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { CenteredSkeleton } from "@/components/loading";
import { OfflineIndicator } from "@/components/polish/offline-indicator";
import SignInForm from "@/components/sign-in-form";
import { useCurrentUser } from "@/hooks/use-current-user";

type CurrentUser = NonNullable<ReturnType<typeof useCurrentUser>>;

type ProcessPendingInvitationFn = (args: {
  email: string;
  userId: string;
}) => Promise<{ grantedStaffAccess: boolean }>;

/**
 * Process platform staff invitation and redirect to platform if access was granted
 * @returns true if redirected to platform, false otherwise
 */
async function processPlatformStaffInvitation(
  user: CurrentUser,
  processPendingInvitation: ProcessPendingInvitationFn,
  router: AppRouterInstance
): Promise<boolean> {
  if (!user.email) {
    return false;
  }

  try {
    const inviteResult = await processPendingInvitation({
      email: user.email,
      userId: user._id,
    });

    if (inviteResult.grantedStaffAccess) {
      toast.success(
        "🎉 Welcome to the platform staff team! You now have platform admin access."
      );
      router.push("/platform" as Route);
      return true;
    }
  } catch (error) {
    console.error("Error processing platform staff invitation:", error);
  }

  return false;
}

/**
 * Get the redirect URL from various sources (URL param, session storage, or default)
 */
function getRedirectUrl(urlRedirect: string | null): string {
  // If there's a redirect parameter (e.g., from invitation link), use it
  if (urlRedirect) {
    return urlRedirect;
  }

  // Check if there's a stored intended URL (from direct navigation)
  if (typeof window !== "undefined") {
    const intendedUrl = sessionStorage.getItem("intendedUrl");
    if (intendedUrl) {
      sessionStorage.removeItem("intendedUrl");
      console.log("[Login] Redirecting to intended URL:", intendedUrl);
      return intendedUrl;
    }
  }

  // Otherwise go to home page (which will redirect appropriately)
  return "/";
}

function LoginContent() {
  const user = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const reason = searchParams.get("reason");
  const sessionTimedOut = reason === "session_timeout";
  const [checkedInvitation, setCheckedInvitation] = useState(false);
  const processPendingInvitation = useMutation(
    api.models.platformStaffInvitations.processPendingInvitation
  );

  useEffect(() => {
    const handleRedirect = async () => {
      if (!user || checkedInvitation) {
        return;
      }

      // Check and process platform staff invitation
      const redirectedToPlatform = await processPlatformStaffInvitation(
        user,
        processPendingInvitation,
        router
      );
      setCheckedInvitation(true);

      if (redirectedToPlatform) {
        return;
      }

      // Redirect to the appropriate URL
      const redirectUrl = getRedirectUrl(redirect);
      router.push(redirectUrl as Route);
    };

    if (user) {
      handleRedirect();
    }
  }, [user, router, redirect, checkedInvitation, processPendingInvitation]);

  return (
    <>
      <Authenticated>
        <CenteredSkeleton />
      </Authenticated>
      <Unauthenticated>
        {sessionTimedOut && (
          <div
            aria-live="polite"
            className="mx-auto mb-4 max-w-md rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 text-sm"
            role="alert"
          >
            You were signed out due to inactivity. Please sign in again.
          </div>
        )}
        <SignInForm />
      </Unauthenticated>
      <AuthLoading>
        <CenteredSkeleton />
      </AuthLoading>
    </>
  );
}

export default function DashboardPage() {
  return (
    <>
      <OfflineIndicator position="top" />
      <Suspense fallback={<CenteredSkeleton />}>
        <LoginContent />
      </Suspense>
    </>
  );
}
