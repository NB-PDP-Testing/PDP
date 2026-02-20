"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { Route } from "next";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/loading/page-skeleton";
import { authClient } from "@/lib/auth-client";

// Regex to detect if we're on a role-specific route (not the org root)
const ROLE_ROUTE_REGEX = /\/orgs\/[^/]+\/(admin|coach|parents|player)/;

export default function Home() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const orgId = params.orgId as string;
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we're actually on a role-specific route
  // This can happen during Next.js navigation when the OrgDashboard layout renders
  // before the nested route
  const isOnRoleRoute = pathname ? ROLE_ROUTE_REGEX.test(pathname) : false;

  // Use Better Auth session instead of Convex auth components
  const { data: session, isPending: isSessionLoading } =
    authClient.useSession();

  // Get member details to determine which dashboard to show
  const member = useQuery(
    api.models.members.getMemberByUserId,
    session?.user?.id && orgId
      ? {
          userId: session.user.id,
          organizationId: orgId,
        }
      : "skip"
  );

  useEffect(() => {
    console.log("[OrgDashboard] Session:", session);
    console.log("[OrgDashboard] Session loading:", isSessionLoading);
    console.log("[OrgDashboard] Member:", member);
    console.log("[OrgDashboard] OrgId:", orgId);

    // Wait for session and member to load
    if (isSessionLoading || !session) {
      console.log("[OrgDashboard] Waiting for session...");
      return;
    }

    // If not authenticated, redirect to login
    if (!session.user) {
      console.log("[OrgDashboard] No user in session, redirecting to login");
      router.push("/login");
      return;
    }

    // Wait for member query to complete
    if (member === undefined) {
      console.log("[OrgDashboard] Waiting for member data...");
      return;
    }

    // If member not found, user is not part of this org
    // Redirect to home which will route them appropriately:
    // - Platform staff → /orgs
    // - Users with other org memberships → their org
    // - Users with no memberships → /orgs/join
    if (member === null) {
      console.log(
        "[OrgDashboard] User is not a member of this org, redirecting to home for re-routing"
      );
      router.push("/");
      return;
    }

    // Prevent multiple redirects
    if (isRedirecting) {
      return;
    }

    // Don't redirect if user is already navigating to a role-specific route
    // This prevents the OrgDashboard from interfering with direct URL navigation
    // to routes like /parents or /admin
    if (isOnRoleRoute) {
      console.log(
        "[OrgDashboard] Already on role route, skipping redirect:",
        pathname
      );
      return;
    }

    // Determine which dashboard to show based on active functional role
    const activeFunctionalRole =
      member.activeFunctionalRole || member.functionalRoles?.[0];

    console.log("[OrgDashboard] Active functional role:", activeFunctionalRole);
    console.log("[OrgDashboard] All functional roles:", member.functionalRoles);

    let targetRoute: string;

    if (activeFunctionalRole === "coach") {
      targetRoute = `/orgs/${orgId}/coach`;
    } else if (activeFunctionalRole === "parent") {
      targetRoute = `/orgs/${orgId}/parents`;
    } else if (activeFunctionalRole === "admin") {
      targetRoute = `/orgs/${orgId}/admin`;
    } else if (activeFunctionalRole === "player") {
      targetRoute = `/orgs/${orgId}/player`;
    } else {
      // No functional role assigned - redirect to request role page
      console.log(
        "[OrgDashboard] No functional role found, redirecting to request-role"
      );
      targetRoute = `/orgs/${orgId}/request-role`;
    }

    console.log("[OrgDashboard] Redirecting to:", targetRoute);
    setIsRedirecting(true);
    router.push(targetRoute as Route);
  }, [
    router,
    orgId,
    session,
    isSessionLoading,
    member,
    isRedirecting,
    isOnRoleRoute,
    pathname,
  ]);

  // Timeout protection: if page is stuck loading for >10 seconds, show error
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (member === undefined && !isRedirecting && !error) {
        console.error(
          "[OrgDashboard] ❌ TIMEOUT: Page stuck loading for >10 seconds"
        );
        console.error("[OrgDashboard] Session state:", session);
        console.error("[OrgDashboard] Member state:", member);
        setError(
          "Unable to load your organization membership. This might be due to a slow network connection or a sync issue. Please try refreshing the page."
        );
      }
    }, 10_000); // 10 seconds

    return () => clearTimeout(timeout);
  }, [member, isRedirecting, error, session]);

  // Show error state if timeout occurred
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="mb-2 font-semibold text-lg text-red-900">
              Loading Error
            </h2>
            <p className="mb-4 text-red-700 text-sm">{error}</p>
            <div className="flex gap-2">
              <button
                className="rounded-md bg-red-600 px-4 py-2 font-medium text-sm text-white hover:bg-red-700"
                onClick={() => window.location.reload()}
                type="button"
              >
                Refresh Page
              </button>
              <button
                className="rounded-md border border-red-300 px-4 py-2 font-medium text-red-700 text-sm hover:bg-red-100"
                onClick={() => router.push("/")}
                type="button"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show skeleton loading state (matches UX mockup requirements)
  return <PageSkeleton showBreadcrumbs={false} variant="dashboard" />;
}
