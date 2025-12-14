"use client";

import type { Route } from "next";
import { redirect, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/header";
import Loader from "@/components/loader";
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
    if (user === null && !isCheckingInvitation) {
      redirect("/login");
    }
  }, [user, isCheckingInvitation]);

  // Show loader while checking for pending invitations
  if (isCheckingInvitation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (user) {
    return (
      <>
        <Header />
        {children}
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}
