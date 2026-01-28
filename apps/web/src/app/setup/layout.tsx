"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/loader";
import { SetupProgress } from "@/components/setup/setup-progress";
import { useCurrentUser } from "@/hooks/use-current-user";

/**
 * Setup wizard layout
 * Protects /setup routes from:
 * - Unauthenticated users
 * - Non-platform staff users
 * - Users who have already completed setup
 */
export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useCurrentUser();

  // Handle redirects based on user state
  useEffect(() => {
    // Still loading
    if (user === undefined) {
      return;
    }

    // Not logged in - redirect to login
    if (user === null) {
      router.push("/login");
      return;
    }

    // Not platform staff - redirect to home
    if (!user.isPlatformStaff) {
      router.push("/");
      return;
    }

    // Setup already complete - redirect to orgs
    if (user.setupComplete) {
      router.push("/orgs");
      return;
    }
  }, [user, router]);

  // Loading state
  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Not authorized (will redirect)
  if (user === null || !user.isPlatformStaff || user.setupComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SetupProgress currentStep={user.setupStep ?? "gdpr"} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
