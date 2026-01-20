"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Share2,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { GuardianIdentityClaimDialog } from "@/components/guardian-identity-claim-dialog";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";
import { AIPracticeAssistant } from "./components/ai-practice-assistant";
import { ChildCard } from "./components/child-card";
import { CoachFeedback } from "./components/coach-feedback";
import { GuardianSettings } from "./components/guardian-settings";
import { MedicalInfo } from "./components/medical-info";
import { WeeklySchedule } from "./components/weekly-schedule";

function ParentDashboardContent() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: session } = authClient.useSession();
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [currentClaimIndex, setCurrentClaimIndex] = useState(0);

  // Get user's role details in this organization
  const roleDetails = useQuery(
    api.models.members.getMemberRoleDetails,
    session?.user?.email
      ? { organizationId: orgId, userEmail: session.user.email }
      : "skip"
  );

  // Check for unclaimed guardian identities
  const claimableIdentities = useQuery(
    api.models.guardianIdentities.findAllClaimableForCurrentUser
  );

  // Get children from guardian identity system
  // Pass user email to enable fallback lookup for unclaimed guardian identities
  const {
    guardianIdentity,
    children: identityChildren,
    isLoading: identityLoading,
  } = useGuardianChildrenInOrg(orgId, session?.user?.email);

  // Show claim dialog if there are unclaimed identities
  // Note: Don't check !guardianIdentity because useGuardianIdentity returns
  // unclaimed identities too (via email lookup)
  useEffect(() => {
    console.log("Claimable identities check:", {
      claimableIdentities,
      count: claimableIdentities?.length,
      showClaimDialog,
    });
    if (
      claimableIdentities &&
      claimableIdentities.length > 0 &&
      !showClaimDialog
    ) {
      console.log(
        "Opening claim dialog for",
        claimableIdentities.length,
        "identities"
      );
      setShowClaimDialog(true);
    }
  }, [claimableIdentities, showClaimDialog]);

  // Handle successful claim
  const handleClaimComplete = () => {
    // Move to next claimable identity if there are more
    if (
      claimableIdentities &&
      currentClaimIndex < claimableIdentities.length - 1
    ) {
      setCurrentClaimIndex(currentClaimIndex + 1);
      setShowClaimDialog(true);
    } else {
      // All claims processed - refresh page to load new guardian data
      setShowClaimDialog(false);
      router.refresh();
    }
  };

  // Get current claimable identity to display
  const currentClaimable = claimableIdentities?.[currentClaimIndex];

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
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader />
      </div>
    );
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

      {/* Pending Guardian Claims Notification */}
      {claimableIdentities && claimableIdentities.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-blue-600" />
              <CardTitle className="text-blue-800">
                Pending Guardian Connection
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700">
              We found an existing guardian profile that matches your email
              address. Please review and claim your connection to access your
              children's information.
            </p>
            <div className="mt-4 space-y-2">
              <p className="font-medium text-blue-800 text-sm">
                Guardian Profile Found:
              </p>
              <ul className="list-inside list-disc space-y-1 text-blue-700 text-sm">
                <li>
                  {currentClaimable?.guardianIdentity.firstName}{" "}
                  {currentClaimable?.guardianIdentity.lastName}
                </li>
                <li>
                  {currentClaimable?.children.length}{" "}
                  {currentClaimable?.children.length === 1
                    ? "child"
                    : "children"}{" "}
                  linked
                </li>
              </ul>
            </div>
            <Button
              className="mt-4"
              onClick={() => setShowClaimDialog(true)}
              variant="default"
            >
              Review & Claim Connection
            </Button>
          </CardContent>
        </Card>
      )}

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

      {/* Passport Sharing Card */}
      {playerCount > 0 && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-blue-600" />
                  Passport Sharing
                </CardTitle>
                <CardDescription className="mt-2">
                  Control who can view your children's player development
                  passports across organizations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm">
                  Enable sharing to allow coaches from other clubs and teams to
                  view your child's development progress with your permission.
                </p>
                <ul className="ml-4 list-disc space-y-1 text-muted-foreground text-sm">
                  <li>Share with specific organizations</li>
                  <li>Control what information is shared</li>
                  <li>View access logs and analytics</li>
                  <li>Revoke access anytime</li>
                </ul>
              </div>
              <Link href={`/orgs/${orgId}/parents/sharing` as Route}>
                <Button className="shrink-0" size="lg">
                  <Share2 className="mr-2 h-4 w-4" />
                  Manage Sharing
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Children Cards */}
      {playerCount > 0 && (
        <div>
          <h2 className="mb-4 font-semibold text-xl">Your Children</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {identityChildren.map((child) => (
              <ChildCard child={child} key={child.player._id} orgId={orgId} />
            ))}
          </div>
        </div>
      )}

      {/* Weekly Schedule */}
      {playerCount > 0 && <WeeklySchedule playerData={identityChildren} />}

      {/* Coach Feedback Section */}
      {playerCount > 0 && (
        <CoachFeedback orgId={orgId} playerData={identityChildren} />
      )}

      {/* Medical Information Section */}
      {playerCount > 0 && (
        <MedicalInfo orgId={orgId} playerData={identityChildren} />
      )}

      {/* AI Practice Assistant */}
      {playerCount > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <AIPracticeAssistant orgId={orgId} playerData={identityChildren} />

          {/* Coming Soon Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Coming Soon
              </CardTitle>
              <CardDescription>More features are on the way</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Badge variant="outline">Planned</Badge>
                  <span className="text-sm">
                    Real-time schedule integration
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Badge variant="outline">Planned</Badge>
                  <span className="text-sm">
                    Push notifications for coach feedback
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Badge variant="outline">Planned</Badge>
                  <span className="text-sm">Progress reports PDF export</span>
                </li>
                <li className="flex items-center gap-3">
                  <Badge variant="outline">Planned</Badge>
                  <span className="text-sm">Multi-sport comparison views</span>
                </li>
                <li className="flex items-center gap-3">
                  <Badge variant="outline">Planned</Badge>
                  <span className="text-sm">Skill radar charts</span>
                </li>
              </ul>
            </CardContent>
          </Card>
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

      {/* Guardian Identity Claim Dialog */}
      {currentClaimable && session?.user?.id && (
        <GuardianIdentityClaimDialog
          childrenList={currentClaimable.children}
          guardianIdentityId={currentClaimable.guardianIdentity._id}
          guardianName={`${currentClaimable.guardianIdentity.firstName} ${currentClaimable.guardianIdentity.lastName}`}
          onClaimComplete={handleClaimComplete}
          onOpenChange={setShowClaimDialog}
          open={showClaimDialog}
          organizations={currentClaimable.organizations}
          userId={session.user.id}
        />
      )}
    </div>
  );
}

export default function ParentsPage() {
  return (
    <Suspense fallback={<Loader />}>
      <ParentDashboardContent />
    </Suspense>
  );
}
