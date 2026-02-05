"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { Authenticated, useQuery } from "convex/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BlogSection } from "@/components/landing/blog-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { FinalCTASection } from "@/components/landing/final-cta-section";
import { FloatingHeader } from "@/components/landing/floating-header";
import { HeroSection } from "@/components/landing/hero-section";
import { InsightsSection } from "@/components/landing/insights-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ProblemSection } from "@/components/landing/problem-section";
import { SolutionSection } from "@/components/landing/solution-section";
import { SportsShowcase } from "@/components/landing/sports-showcase";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import Loader from "@/components/loader";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  return (
    <>
      <Authenticated>
        <RedirectToOrgs />
      </Authenticated>
      <LandingPage />
    </>
  );
}

function RedirectToOrgs() {
  const { data: activeOrganization, isPending: activeOrgPending } =
    authClient.useActiveOrganization();
  const { data: userOrganizations, isPending: orgsListPending } =
    authClient.useListOrganizations();
  const user = useCurrentUser();
  const router = useRouter();

  // Check if any organizations exist on the platform (for fresh deployment detection)
  const hasAnyOrgs = useQuery(api.models.setup.hasAnyOrganizations);

  useEffect(() => {
    // Only redirect if we're actually on the root path
    // This prevents interfering with direct URL navigation to other routes
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      return;
    }
    // Check for pending invitation FIRST (highest priority)
    // This handles OAuth redirects that might not preserve the invitation URL
    const pendingInvitationId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("pendingInvitationId")
        : null;

    if (pendingInvitationId) {
      console.log("[Home] Found pending invitation:", pendingInvitationId);
      // Clear it from sessionStorage
      sessionStorage.removeItem("pendingInvitationId");
      // Redirect to invitation acceptance page
      router.push(`/orgs/accept-invitation/${pendingInvitationId}` as Route);
      return;
    }

    // Wait for data to load before making routing decisions
    if (
      activeOrgPending ||
      orgsListPending ||
      user === undefined ||
      hasAnyOrgs === undefined
    ) {
      return;
    }

    // Platform staff who haven't completed setup should go to setup wizard
    // BUT only if NO organizations exist (fresh deployment)
    if (user?.isPlatformStaff && user?.setupComplete !== true && !hasAnyOrgs) {
      console.log(
        "[Home] Fresh deployment: Platform staff needs to complete setup, redirecting to /setup"
      );
      router.push("/setup" as Route);
      return;
    }

    // Platform staff who have completed setup go to /orgs (platform management page)
    // This takes priority over active organization redirect
    if (user?.isPlatformStaff) {
      console.log("[Home] Platform staff detected, redirecting to /orgs");
      router.push("/orgs" as Route);
      return;
    }

    // If user has an active organization, verify they're still a member before redirecting
    // This handles cases where a user's join request was rejected or they were removed
    if (activeOrganization) {
      const isStillMember = userOrganizations?.some(
        (org) => org.id === activeOrganization.id
      );

      if (isStillMember) {
        console.log(
          "[Home] Active organization found and verified:",
          activeOrganization.id
        );
        router.push(`/orgs/${activeOrganization.id}` as Route);
        return;
      }

      // User has a stale activeOrganization - they're no longer a member
      // Clear it and let the logic below handle routing
      console.log(
        "[Home] Active organization is stale (user no longer a member), clearing:",
        activeOrganization.id
      );
      authClient.organization.setActive({ organizationId: null }).catch(() => {
        // Ignore errors clearing stale org
      });
      // Don't return - fall through to check if they have other orgs
    }

    // If user has organization memberships but no active organization,
    // set the first one as active and redirect there
    if (userOrganizations && userOrganizations.length > 0) {
      const firstOrg = userOrganizations[0];
      console.log(
        "[Home] User has org memberships, setting first as active:",
        firstOrg.id
      );

      // Set as active organization and redirect
      authClient.organization
        .setActive({ organizationId: firstOrg.id })
        .then(() => {
          router.push(`/orgs/${firstOrg.id}` as Route);
        })
        .catch((error) => {
          console.error("[Home] Error setting active organization:", error);
          // Fallback: redirect to org anyway
          router.push(`/orgs/${firstOrg.id}` as Route);
        });
      return;
    }

    // No organization memberships - regular users go to join page
    // (Platform staff are already handled above and won't reach here)
    console.log("[Home] Regular user with no orgs, going to /orgs/join");
    router.push("/orgs/join" as Route);
  }, [
    router,
    activeOrganization,
    activeOrgPending,
    userOrganizations,
    orgsListPending,
    user,
    hasAnyOrgs,
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <FloatingHeader />
      <HeroSection />
      <div id="problem">
        <ProblemSection />
      </div>
      <div id="solution">
        <SolutionSection />
      </div>
      <div id="insights">
        <InsightsSection />
      </div>
      <div id="sports">
        <SportsShowcase />
      </div>
      <div id="features">
        <FeaturesSection />
      </div>
      <div id="testimonials">
        <TestimonialsSection />
      </div>
      <div id="blog">
        <BlogSection />
      </div>
      <FinalCTASection />
      <LandingFooter />
    </div>
  );
}
