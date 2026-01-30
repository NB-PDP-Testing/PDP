"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { CenteredSkeleton } from "@/components/loading";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";
import type { OrgMemberRole } from "@/lib/types";
import { useMembershipContext } from "@/providers/membership-provider";

export default function CurrentOrgPage() {
  return (
    <>
      <Authenticated>
        <Suspense fallback={<CenteredSkeleton />}>
          <RedirectToActiveOrg />
        </Suspense>
      </Authenticated>
      <Unauthenticated>
        <RedirectToLogin />
      </Unauthenticated>
      <AuthLoading>
        <CenteredSkeleton />
      </AuthLoading>
    </>
  );
}

/**
 * Determines the appropriate route based on user's roles
 *
 * NEW: Uses activeFunctionalRole if set, otherwise falls back to priority logic:
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
  functionalRoles: string[],
  activeFunctionalRole?: string | null
): Route {
  // NEW: If user has an active functional role set, use it directly
  if (activeFunctionalRole && functionalRoles.includes(activeFunctionalRole)) {
    switch (activeFunctionalRole) {
      case "coach":
        return `/orgs/${orgId}/coach` as Route;
      case "admin":
        return `/orgs/${orgId}/admin` as Route;
      case "parent":
        return `/orgs/${orgId}/parents` as Route;
      case "player":
        return `/orgs/${orgId}/player` as Route;
      default:
        // Fall through to priority logic below
        break;
    }
  }

  // Fallback to priority logic if no active role set
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
  const hasPlayer = functionalRoles.includes("player");

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

  // Priority 4: Player (adult players)
  if (hasPlayer) {
    return `/orgs/${orgId}/player` as Route;
  }

  // Default: Organizations list (user has no specific role)
  return "/orgs";
}

function RedirectToActiveOrg() {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: member } = authClient.useActiveMember();
  const { data: organizations } = authClient.useListOrganizations();
  // Also query memberships directly from Convex as a fallback (from shared context)
  const { memberships: convexMemberships } = useMembershipContext();
  const user = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  useEffect(() => {
    // Check for pending invitation in sessionStorage (from OAuth flow)
    // This MUST be checked FIRST before any other redirects
    const pendingInvitationId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("pendingInvitationId")
        : null;

    if (pendingInvitationId) {
      console.log(
        "[orgs/current] Found pending invitation:",
        pendingInvitationId
      );
      // Clear it from sessionStorage
      sessionStorage.removeItem("pendingInvitationId");
      // Redirect to invitation acceptance page IMMEDIATELY
      // Use replace to avoid adding to history
      router.replace(`/orgs/accept-invitation/${pendingInvitationId}` as Route);
      return;
    }

    // If there's a redirect parameter (e.g., from invitation link), use it
    // This takes priority over all other redirects
    if (redirect) {
      router.push(redirect as Route);
      return;
    }

    // Platform staff should go directly to /orgs
    if (user?.isPlatformStaff) {
      router.push("/orgs");
      return;
    }

    if (!activeOrganization) {
      // Check if user has any organization memberships but no active one set
      // This can happen if the active org was never set after joining
      console.log(
        "[orgs/current] No active organization found, checking memberships..."
      );
      console.log("[orgs/current] Better Auth organizations:", organizations);
      console.log("[orgs/current] Convex memberships:", convexMemberships);

      // Wait for data to load before making a decision
      if (organizations === undefined && convexMemberships === undefined) {
        console.log("[orgs/current] Data still loading, waiting...");
        return;
      }

      // Try Better Auth organizations first
      if (organizations && organizations.length > 0) {
        console.log(
          "[orgs/current] User has orgs but no active one, setting first org:",
          organizations[0].id
        );
        authClient.organization.setActive({
          organizationId: organizations[0].id,
        });
        return;
      }

      // Fallback: Try Convex memberships (more reliable when SDK has issues)
      if (convexMemberships && convexMemberships.length > 0) {
        console.log(
          "[orgs/current] Found Convex memberships, setting first org:",
          convexMemberships[0].organizationId
        );
        authClient.organization.setActive({
          organizationId: convexMemberships[0].organizationId,
        });
        return;
      }

      // If Convex still loading but Better Auth returned null, wait for Convex
      if (convexMemberships === undefined) {
        console.log("[orgs/current] Waiting for Convex membership data...");
        return;
      }

      // No organizations at all, redirect to join page
      console.log(
        "[orgs/current] User has no organization memberships, redirecting to join page"
      );
      router.push("/orgs/join" as Route);
      return;
    }

    // Wait for member data to load (it may take a moment after setting active org)
    if (!member) {
      // Check if we have membership data from Convex we can use instead
      const convexMember = convexMemberships?.find(
        (m) => m.organizationId === activeOrganization.id
      );

      if (convexMember) {
        console.log(
          "[orgs/current] Using Convex membership data while SDK member loads:",
          convexMember
        );
        // Use Convex data to determine route
        const functionalRoles = convexMember.functionalRoles || [];
        const activeFunctionalRole = convexMember.activeFunctionalRole;
        const memberRole = convexMember.betterAuthRole as
          | OrgMemberRole
          | undefined;

        const redirectRoute = getRedirectRoute(
          activeOrganization.id,
          memberRole,
          functionalRoles,
          activeFunctionalRole
        );

        console.log("[orgs/current] Redirect decision (from Convex):", {
          orgId: activeOrganization.id,
          memberRole,
          functionalRoles,
          activeFunctionalRole,
          redirectRoute,
        });

        router.push(redirectRoute);
        return;
      }

      console.log("[orgs/current] Waiting for member data to load...");
      return;
    }

    // Get functional roles from member (custom Convex field)
    const functionalRoles =
      ((member as any)?.functionalRoles as string[] | undefined) || [];

    // Get active functional role (NEW: respects user's role preference)
    const activeFunctionalRole = (member as any)?.activeFunctionalRole as
      | string
      | undefined;

    // Get Better Auth org role
    const memberRole = member?.role as OrgMemberRole | undefined;

    // Determine redirect route based on roles (now respects activeFunctionalRole)
    const redirectRoute = getRedirectRoute(
      activeOrganization.id,
      memberRole,
      functionalRoles,
      activeFunctionalRole
    );

    // Development logging for debugging
    if (process.env.NODE_ENV === "development") {
      console.log("[orgs/current] Redirect decision:", {
        orgId: activeOrganization.id,
        memberRole,
        functionalRoles,
        activeFunctionalRole,
        redirectRoute,
      });
    }

    router.push(redirectRoute);
  }, [
    router,
    activeOrganization,
    member,
    user,
    redirect,
    organizations,
    convexMemberships,
  ]);

  return <CenteredSkeleton />;
}

function RedirectToLogin() {
  const router = useRouter();

  useEffect(() => {
    router.push("/login");
  }, [router]);

  return <CenteredSkeleton />;
}
