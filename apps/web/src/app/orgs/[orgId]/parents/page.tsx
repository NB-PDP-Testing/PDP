"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AlertCircle, CheckCircle, Clock, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useMemo, useRef } from "react";
import { PageSkeleton } from "@/components/loading";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";
import { ActionItemsPanel } from "./components/action-items-panel";
import { ChildCard } from "./components/child-card";
import { CoachFeedbackSnapshot } from "./components/coach-feedback-snapshot";
import { GraduationAlerts } from "./components/graduation-alert";
import { WeeklySchedule } from "./components/weekly-schedule";

function ParentDashboardContent() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: session } = authClient.useSession();
  // Guardian claim dialog state REMOVED - OnboardingOrchestrator now handles claims

  // Get user's role details in this organization
  const roleDetails = useQuery(
    api.models.members.getMemberRoleDetails,
    session?.user?.email
      ? { organizationId: orgId, userEmail: session.user.email }
      : "skip"
  );

  // Guardian claim queries REMOVED - OnboardingOrchestrator now handles claims

  // Get children from guardian identity system
  // Pass user email to enable fallback lookup for unclaimed guardian identities
  const {
    guardianIdentity,
    children: identityChildren,
    isLoading: identityLoading,
  } = useGuardianChildrenInOrg(orgId, session?.user?.email);

  // US-PERF-014/015: Collect player IDs for bulk data fetch
  const playerIdentityIds = useMemo(
    () =>
      identityChildren.map(
        (child) => child.player._id as Id<"playerIdentities">
      ),
    [identityChildren]
  );

  // US-PERF-014/015: Bulk fetch all child data (passports, injuries, goals, medical profiles)
  // This eliminates 5 useQuery calls per child in ChildCard component
  const bulkChildData = useQuery(
    api.models.orgPlayerEnrollments.getBulkChildData,
    playerIdentityIds.length > 0
      ? { playerIdentityIds, organizationId: orgId }
      : "skip"
  );

  // Get summaries data for child summary cards (US-009)
  const summariesData = useQuery(
    api.models.coachParentSummaries.getParentSummariesByChildAndSport,
    { organizationId: orgId }
  );

  // Guardian claim dialog REMOVED
  // The OnboardingOrchestrator now handles guardian claims via UnifiedGuardianClaimStep
  // This prevents duplicate popups during onboarding

  // US-013: Messages ref for smooth scroll behavior
  const messagesRef = useRef<HTMLDivElement>(null);

  // US-013: Calculate total unread count across all children and sports
  const totalUnreadCount = useMemo(() => {
    if (!summariesData) {
      return 0;
    }
    return summariesData.reduce(
      (total: any, childData: any) =>
        total +
        childData.sportGroups.reduce(
          (childTotal: any, sportGroup: any) =>
            childTotal + sportGroup.unreadCount,
          0
        ),
      0
    );
  }, [summariesData]);

  // US-013: Scroll to messages handler
  const handleReviewClick = () => {
    messagesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Check if user has parent functional role or is admin/owner
  const hasParentRole = useMemo(() => {
    if (!roleDetails) {
      return false;
    }
    return (
      roleDetails.functionalRoles.includes("parent") ||
      roleDetails.functionalRoles.includes("admin") ||
      roleDetails.betterAuthRole === "owner" ||
      roleDetails.betterAuthRole === "admin"
    );
  }, [roleDetails]);

  // Use identity-based children count
  const playerCount = identityChildren.length;

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    let completedReviews = 0;
    let dueSoon = 0;
    let overdue = 0;

    for (const child of identityChildren) {
      const status = child.enrollment?.reviewStatus?.toLowerCase();
      if (status === "completed") {
        completedReviews += 1;
      } else if (status === "due soon" || status === "due_soon") {
        dueSoon += 1;
      } else if (status === "overdue") {
        overdue += 1;
      }
    }

    return { completedReviews, dueSoon, overdue };
  }, [identityChildren]);

  // Show loading state while checking roles
  if (roleDetails === undefined || identityLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  // Show access denied if user doesn't have parent role and no linked players
  if (!hasParentRole && playerCount === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-amber-600" />
              <CardTitle className="text-amber-800">
                Parent Access Required
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700">
              You don't have the parent role assigned to your account, and no
              children are linked to your email address. Contact your
              organization's administrator to:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-amber-700">
              <li>Assign you the "Parent" role</li>
              <li>Link your children's player profiles to your email</li>
            </ul>
            <Button
              className="mt-4"
              onClick={() => router.push(`/orgs/${orgId}`)}
              variant="outline"
            >
              Go to Organization Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <OrgThemedGradient
        className="rounded-lg p-6 shadow-md"
        gradientTo="secondary"
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold text-3xl">Your Family&apos;s Journey</h1>
            <p className="mt-2 opacity-90">
              Tracking {playerCount} {playerCount === 1 ? "child" : "children"}{" "}
              in {activeOrganization?.name || "this organization"}
            </p>
            {guardianIdentity && (
              <p className="mt-1 text-sm opacity-75">
                Welcome back, {guardianIdentity.firstName}!
              </p>
            )}
          </div>
        </div>
      </OrgThemedGradient>

      {/* Action Items Panel - shown immediately below header when there are unread updates */}
      {playerCount > 0 && totalUnreadCount > 0 && (
        <ActionItemsPanel
          onReviewClick={handleReviewClick}
          unreadCount={totalUnreadCount}
        />
      )}

      {/* Graduation Alerts - shown above all other content */}
      <GraduationAlerts orgId={orgId} />

      {/* Coach Feedback Snapshot */}
      {playerCount > 0 && <CoachFeedbackSnapshot orgId={orgId} />}

      {/* Weekly Schedule */}
      {playerCount > 0 && <WeeklySchedule playerData={identityChildren} />}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card className="border-blue-200 bg-blue-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Users className="text-blue-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {playerCount}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Children Tracked
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-blue-100">
              <div className="h-1 w-full rounded-full bg-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <CheckCircle className="text-green-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {summaryStats.completedReviews}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Reviews Complete
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-green-100">
              <div className="h-1 w-full rounded-full bg-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Clock className="text-yellow-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {summaryStats.dueSoon}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Due Soon
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-yellow-100">
              <div className="h-1 w-full rounded-full bg-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <AlertCircle className="text-red-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {summaryStats.overdue}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Overdue
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-red-100">
              <div className="h-1 w-full rounded-full bg-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Children Cards - US-PERF-015: Pass bulk data to avoid N+1 queries */}
      {playerCount > 0 && bulkChildData && (
        <div>
          <h2 className="mb-4 font-semibold text-xl">Your Children</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {identityChildren.map((child) => (
              <ChildCard
                bulkData={bulkChildData?.[child.player._id as string]}
                child={child}
                key={child.player._id}
                orgId={orgId}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Children Linked Message */}
      {playerCount === 0 && hasParentRole && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">
                  No children linked yet
                </p>
                <p className="mt-1 text-amber-700 text-sm">
                  Your parent role is active, but no children are linked to your
                  email address ({session?.user?.email}). Contact your
                  organization's administrator to link your children's player
                  profiles.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guardian Identity Claim Dialog REMOVED
          The OnboardingOrchestrator now handles guardian claims via UnifiedGuardianClaimStep
          This prevents duplicate popups during onboarding */}
    </div>
  );
}

export default function ParentsPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="dashboard" />}>
      <ParentDashboardContent />
    </Suspense>
  );
}
