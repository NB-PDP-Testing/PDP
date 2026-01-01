"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;
  const [isRedirecting, setIsRedirecting] = useState(false);

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

    // If member not found, user might not be part of this org
    if (member === null) {
      console.log("[OrgDashboard] User is not a member, redirecting to orgs");
      router.push("/orgs");
      return;
    }

    // Prevent multiple redirects
    if (isRedirecting) {
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
  }, [router, orgId, session, isSessionLoading, member, isRedirecting]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}
