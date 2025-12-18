"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  ChevronRight,
  FileText,
  Heart,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useMemo } from "react";
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

// Severity config for injuries
const SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  minor: { label: "Minor", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  moderate: {
    label: "Moderate",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  severe: { label: "Severe", color: "text-red-700", bgColor: "bg-red-100" },
  long_term: {
    label: "Long Term",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
};

function ParentDashboardContent() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: session } = authClient.useSession();

  // Get user's role details in this organization
  const roleDetails = useQuery(
    api.models.members.getMemberRoleDetails,
    session?.user?.email
      ? { organizationId: orgId, userEmail: session.user.email }
      : "skip"
  );

  // NEW: Get children from guardian identity system
  const {
    guardianIdentity,
    children: identityChildren,
    isLoading: identityLoading,
    hasIdentity,
  } = useGuardianChildrenInOrg(orgId);

  // LEGACY: Fall back to old email-based lookup for backward compatibility
  const legacyLinkedPlayers = useQuery(
    api.models.players.getPlayersForParent,
    session?.user?.email
      ? { organizationId: orgId, parentEmail: session.user.email }
      : "skip"
  );

  // Check if user has parent functional role or is admin/owner
  const hasParentRole = useMemo(() => {
    if (!roleDetails) return false;
    return (
      roleDetails.functionalRoles.includes("parent") ||
      roleDetails.functionalRoles.includes("admin") ||
      roleDetails.betterAuthRole === "owner" ||
      roleDetails.betterAuthRole === "admin"
    );
  }, [roleDetails]);

  // Get the first child's player identity ID for queries
  const firstChildId = useMemo(() => {
    if (identityChildren.length > 0) {
      return identityChildren[0].player._id as Id<"playerIdentities">;
    }
    return null;
  }, [identityChildren]);

  // Get all children's IDs for aggregated queries
  const allChildrenIds = useMemo(
    () =>
      identityChildren.map(
        (child) => child.player._id as Id<"playerIdentities">
      ),
    [identityChildren]
  );

  // Query injuries for all children
  const childrenInjuries = useQuery(
    api.models.playerInjuries.getInjuriesForPlayer,
    firstChildId ? { playerIdentityId: firstChildId } : "skip"
  );

  // Get active injuries (not healed/cleared) for display
  const activeInjuries = useMemo(() => {
    if (!childrenInjuries) return [];
    return childrenInjuries.filter(
      (injury: any) =>
        injury.status === "active" || injury.status === "recovering"
    );
  }, [childrenInjuries]);

  // Query goals for first child (we'll show a summary)
  const childGoals = useQuery(
    api.models.passportGoals.getGoalsForPlayer,
    firstChildId ? { playerIdentityId: firstChildId } : "skip"
  );

  // Get visible goals for parents
  const visibleGoals = useMemo(() => {
    if (!childGoals) return [];
    return childGoals.filter((goal: any) => goal.isVisibleToParent !== false);
  }, [childGoals]);

  // Use identity-based children if available, otherwise fall back to legacy
  const useIdentitySystem = hasIdentity && identityChildren.length > 0;
  const playerCount = useIdentitySystem
    ? identityChildren.length
    : (legacyLinkedPlayers?.length ?? 0);

  // Show loading state while checking roles
  if (roleDetails === undefined) {
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
      <div>
        <h1 className="font-bold text-3xl text-foreground">Parent Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Track your children's development and progress
        </p>
      </div>

      {/* Coming Soon Badge */}
      <div className="flex items-center gap-2">
        <Badge
          className="border-blue-200 bg-blue-50 text-blue-700"
          variant="outline"
        >
          <TrendingUp className="mr-1 h-3 w-3" />
          Coming Soon
        </Badge>
        <span className="text-muted-foreground text-sm">
          Full parent dashboard is under development
        </span>
      </div>

      {/* Stats Cards */}
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
              {playerCount === 1 ? "child" : "children"} in{" "}
              {activeOrganization?.name || "this organization"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Weekly Schedule
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">-</div>
            <p className="text-muted-foreground text-xs">Coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Coach Feedback
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">-</div>
            <p className="text-muted-foreground text-xs">Coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Progress Insights
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">-</div>
            <p className="text-muted-foreground text-xs">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Injuries Alert */}
      {activeInjuries.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Active Injuries ({activeInjuries.length})
            </CardTitle>
            <CardDescription>
              Current injuries that require attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeInjuries.map((injury: any) => (
                <div
                  className="flex items-center justify-between rounded-lg border border-red-200 bg-white p-3"
                  key={injury._id}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                      <Heart className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {injury.bodyPart}
                        {injury.side && ` (${injury.side})`} -{" "}
                        {injury.injuryType}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {injury.description}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Occurred: {injury.dateOccurred}
                        {injury.expectedReturn &&
                          ` | Expected return: ${injury.expectedReturn}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      className={`${SEVERITY_CONFIG[injury.severity]?.bgColor || "bg-gray-100"} ${SEVERITY_CONFIG[injury.severity]?.color || "text-gray-700"}`}
                    >
                      {SEVERITY_CONFIG[injury.severity]?.label ||
                        injury.severity}
                    </Badge>
                    <Badge
                      variant={
                        injury.status === "active" ? "destructive" : "secondary"
                      }
                    >
                      {injury.status === "active" ? "Active" : "Recovering"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Development Goals */}
      {visibleGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Development Goals
            </CardTitle>
            <CardDescription>
              Current goals and progress for your child
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visibleGoals.slice(0, 5).map((goal: any) => (
                <div className="rounded-lg border p-4" key={goal._id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{goal.title}</p>
                      {goal.description && (
                        <p className="mt-1 text-muted-foreground text-sm">
                          {goal.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline">{goal.category}</Badge>
                        <Badge
                          variant={
                            goal.status === "completed"
                              ? "default"
                              : goal.status === "in_progress"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {goal.status === "in_progress"
                            ? "In Progress"
                            : goal.status === "completed"
                              ? "Completed"
                              : goal.status === "not_started"
                                ? "Not Started"
                                : goal.status}
                        </Badge>
                      </div>
                    </div>
                    {goal.progressPercentage !== undefined && (
                      <div className="ml-4 text-right">
                        <div className="font-bold text-2xl text-primary">
                          {goal.progressPercentage}%
                        </div>
                        <p className="text-muted-foreground text-xs">
                          Progress
                        </p>
                      </div>
                    )}
                  </div>
                  {goal.targetDate && (
                    <p className="mt-2 text-muted-foreground text-xs">
                      Target: {goal.targetDate}
                    </p>
                  )}
                </div>
              ))}
              {visibleGoals.length > 5 && (
                <p className="text-center text-muted-foreground text-sm">
                  And {visibleGoals.length - 5} more goals...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Children Section - Identity System */}
      {useIdentitySystem && playerCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Children</CardTitle>
            <CardDescription>
              Click on a child to view their player passport
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {identityChildren.map(
                (child: (typeof identityChildren)[number]) => (
                  <Link
                    className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                    href={`/orgs/${orgId}/players/${child.player._id}`}
                    key={child.player._id}
                  >
                    <div>
                      <div className="font-medium">
                        {child.player.firstName} {child.player.lastName}
                      </div>
                      <div className="flex gap-2 text-muted-foreground text-sm">
                        {child.enrollment && (
                          <>
                            <span>{child.enrollment.ageGroup}</span>
                            <span>• {child.enrollment.status}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </Link>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Children Section - Legacy System (fallback) */}
      {!useIdentitySystem && playerCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Children</CardTitle>
            <CardDescription>
              Click on a child to view their player passport
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {legacyLinkedPlayers?.map((player: any) => (
                <Link
                  className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                  href={`/orgs/${orgId}/players/${player._id}`}
                  key={player._id}
                >
                  <div>
                    <div className="font-medium">{player.name}</div>
                    <div className="flex gap-2 text-muted-foreground text-sm">
                      <span>{player.ageGroup}</span>
                      {player.sport && <span>• {player.sport}</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
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

      {/* Features Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Family's Journey</CardTitle>
          <CardDescription>
            The parent dashboard will provide comprehensive insights into your
            children's sports development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Planned Features:</h3>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
                <li>Weekly schedule calendar</li>
                <li>Coach feedback and notes</li>
                <li>Performance metrics and skills tracking</li>
                <li>Attendance tracking</li>
                <li>Goal progress and milestones</li>
                <li>Injury and medical information</li>
                <li>AI-powered practice plans</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Current Status:</h3>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
                <li>Parent role identification</li>
                <li>Player linking system</li>
                <li>Basic player passport view</li>
                <li>Dashboard components (in progress)</li>
                <li>Schedule integration (planned)</li>
                <li>AI practice assistant (planned)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
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
