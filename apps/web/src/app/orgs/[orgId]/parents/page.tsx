"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AlertCircle, CheckCircle, Clock, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useMemo, useRef } from "react";
import { PageSkeleton } from "@/components/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";
import { ActionItemsPanel } from "./components/action-items-panel";
import { AIPracticeAssistant } from "./components/ai-practice-assistant";
import { ChildCard } from "./components/child-card";
import { CoachFeedbackSnapshot } from "./components/coach-feedback-snapshot";
import { GuardianSettings } from "./components/guardian-settings";
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
      <div className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold text-3xl">Your Family's Journey</h1>
            <p className="mt-2 text-blue-100">
              Tracking {playerCount} {playerCount === 1 ? "child" : "children"}{" "}
              in {activeOrganization?.name || "this organization"}
            </p>
            {guardianIdentity && (
              <p className="mt-1 text-blue-200 text-sm">
                Welcome back, {guardianIdentity.firstName}!
              </p>
            )}
          </div>
          {guardianIdentity && (
            <GuardianSettings guardianIdentity={guardianIdentity} />
          )}
        </div>
      </div>

      {/* Guardian Claims Notification REMOVED
          The OnboardingOrchestrator now handles guardian claims via UnifiedGuardianClaimStep */}

      {/* Weekly Schedule - Moved to top */}
      {playerCount > 0 && <WeeklySchedule playerData={identityChildren} />}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Children Tracked
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{playerCount}</div>
            <p className="text-muted-foreground text-xs">
              Active in {activeOrganization?.name || "this org"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Reviews Complete
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-green-600">
              {summaryStats.completedReviews}
            </div>
            <p className="text-muted-foreground text-xs">Up to date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Due Soon</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-yellow-600">
              {summaryStats.dueSoon}
            </div>
            <p className="text-muted-foreground text-xs">Reviews pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-red-600">
              {summaryStats.overdue}
            </div>
            <p className="text-muted-foreground text-xs">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Coach Feedback Snapshot */}
      {playerCount > 0 && <CoachFeedbackSnapshot orgId={orgId} />}

      {/* AI Practice Assistant - Full width */}
      {playerCount > 0 && (
        <AIPracticeAssistant orgId={orgId} playerData={identityChildren} />
      )}

      {/* Action Items Panel (US-013) */}
      {playerCount > 0 && totalUnreadCount > 0 && (
        <ActionItemsPanel
          onReviewClick={handleReviewClick}
          unreadCount={totalUnreadCount}
        />
      )}

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
