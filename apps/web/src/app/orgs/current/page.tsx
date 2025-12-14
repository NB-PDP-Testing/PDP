"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/loader";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";
import type { OrgMemberRole } from "@/lib/types";

export default function CurrentOrgPage() {
  return (
    <>
      <Authenticated>
        <RedirectToActiveOrg />
      </Authenticated>
      <Unauthenticated>
        <RedirectToLogin />
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader />
        </div>
      </AuthLoading>
    </>
  );
}

/**
 * Determines the appropriate route based on user's roles
 * Priority:
 * 1. Coach (functional role "coach") → /coach (prioritized over admin for daily use)
 * 2. Admin (org role owner/admin OR functional role "admin") → /admin
 * 3. Parent (functional role "parent") → /parents
 * 4. Default → /orgs (organizations list)
 *
 * Note: Coach is prioritized over admin because coaches typically use the coach
 * dashboard more frequently than the admin dashboard, even when they have both roles.
 */
function getRedirectRoute(
  orgId: string,
  memberRole: OrgMemberRole | undefined,
  functionalRoles: string[]
): Route {
  // Check if user has org admin permissions (owner/admin roles)
  const hasOrgAdmin =
    memberRole &&
    authClient.organization.checkRolePermission({
      permissions: { organization: ["update"] },
      role: memberRole,
    });

  // Check functional roles
  const hasAdminFunctional = functionalRoles.includes("admin");
  const hasCoach = functionalRoles.includes("coach");
  const hasParent = functionalRoles.includes("parent");

  // Priority 1: Coach (prioritized over admin for daily use)
  // Users with both coach and admin roles will default to coach dashboard
  if (hasCoach) {
    return `/orgs/${orgId}/coach` as Route;
  }

  // Priority 2: Admin access (org role OR functional role)
  if (hasOrgAdmin || hasAdminFunctional) {
    return `/orgs/${orgId}/admin` as Route;
  }

  // Priority 3: Parent
  if (hasParent) {
    return `/orgs/${orgId}/parents` as Route;
  }

  // Default: Organizations list (user has no specific role)
  return "/orgs";
}

function RedirectToActiveOrg() {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: member } = authClient.useActiveMember();
  const user = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    // Platform staff should go directly to /orgs
    if (user?.isPlatformStaff) {
      router.push("/orgs");
      return;
    }

    if (!activeOrganization) {
      // For new users without organizations, redirect to join page
      // This allows them to browse and request to join organizations
      router.push("/orgs/join" as Route);
      return;
    }

    // Defensive check: if member data is missing, redirect to orgs list
    if (!member) {
      console.warn(
        "[orgs/current] Member data missing for active organization",
        activeOrganization.id
      );
      router.push("/orgs");
      return;
    }

    // Get functional roles from member (custom Convex field)
    const functionalRoles =
      ((member as any)?.functionalRoles as string[] | undefined) || [];

    // Get Better Auth org role
    const memberRole = member?.role as OrgMemberRole | undefined;

    // Determine redirect route based on roles
    const redirectRoute = getRedirectRoute(
      activeOrganization.id,
      memberRole,
      functionalRoles
    );

    // Development logging for debugging
    if (process.env.NODE_ENV === "development") {
      console.log("[orgs/current] Redirect decision:", {
        orgId: activeOrganization.id,
        memberRole,
        functionalRoles,
        redirectRoute,
      });
    }

    router.push(redirectRoute);
  }, [router, activeOrganization, member, user]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}

function RedirectToLogin() {
  const router = useRouter();

  useEffect(() => {
    router.push("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}
