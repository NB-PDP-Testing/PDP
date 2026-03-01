"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import type { Route } from "next";
import { redirect, usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Header from "@/components/header";
import Loader from "@/components/loader";
import { NotificationProvider } from "@/components/notification-provider";
import { OnboardingOrchestrator } from "@/components/onboarding/onboarding-orchestrator";
import { OfflineIndicator } from "@/components/polish/offline-indicator";
import { EmailVerificationBanner } from "@/components/verification-banner";
import { useCurrentUser } from "@/hooks/use-current-user";

// todo generateMetadata

export default function OrgLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingInvitation, setIsCheckingInvitation] = useState(true);

  // OAuth auto-verify: if user signed in via OAuth but emailVerified is false,
  // call mutation to set it true (handles future OAuth signups + migration gaps)
  const autoVerifyOAuth = useMutation(api.models.users.autoVerifyOAuthUser);
  const hasTriedAutoVerify = useRef(false);

  useEffect(() => {
    if (user && !user.emailVerified && !hasTriedAutoVerify.current) {
      hasTriedAutoVerify.current = true;
      autoVerifyOAuth().catch(() => {
        // Silent failure — user will just see the banner
      });
    }
  }, [user, autoVerifyOAuth]);

  // Check for pending invitation FIRST (before any other logic)
  // This ensures users are redirected to invitation page after OAuth
  useEffect(() => {
    // Skip if we're already on the invitation page
    if (pathname?.includes("/orgs/accept-invitation/")) {
      setIsCheckingInvitation(false);
      return;
    }

    const pendingInvitationId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("pendingInvitationId")
        : null;

    if (pendingInvitationId) {
      console.log(
        "[OrgLayout] Found pending invitation, redirecting:",
        pendingInvitationId
      );
      // Clear it from sessionStorage
      sessionStorage.removeItem("pendingInvitationId");
      // Redirect to invitation acceptance page IMMEDIATELY
      router.replace(`/orgs/accept-invitation/${pendingInvitationId}` as Route);
      return;
    }

    setIsCheckingInvitation(false);
  }, [router, pathname]);

  useEffect(() => {
    // Don't require authentication for invitation pages - they handle their own auth flow
    if (pathname?.includes("/orgs/accept-invitation/")) {
      return;
    }

    if (user === null && !isCheckingInvitation) {
      // Save the intended URL so we can return here after login
      if (typeof window !== "undefined" && pathname && pathname !== "/login") {
        sessionStorage.setItem("intendedUrl", pathname);
        console.log(
          "[OrgLayout] Saving intended URL before login redirect:",
          pathname
        );
      }
      redirect("/login");
    }
  }, [user, isCheckingInvitation, pathname]);

  // Show loader while checking for pending invitations
  if (isCheckingInvitation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Don't require authentication or show header for invitation pages
  // They handle their own authentication and UI
  if (pathname?.includes("/orgs/accept-invitation/")) {
    return <>{children}</>;
  }

  if (user) {
    return (
      <>
        <OfflineIndicator position="top" />
        {!user.emailVerified && <EmailVerificationBanner email={user.email} />}
        <Header />
        <OnboardingOrchestrator>
          <NotificationProvider>{children}</NotificationProvider>
        </OnboardingOrchestrator>
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}
