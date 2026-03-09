"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  Award,
  Calendar,
  Star,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Loader from "@/components/loader";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";

type ParentAchievementsViewProps = {
  orgId: string;
};

export function ParentAchievementsView({ orgId }: ParentAchievementsViewProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Get user's role details
  const roleDetails = useQuery(
    api.models.members.getMemberRoleDetails,
    session?.user?.email
      ? { organizationId: orgId, userEmail: session.user.email }
      : "skip"
  );

  // Get children from guardian identity system
  const { children: identityChildren, isLoading: identityLoading } =
    useGuardianChildrenInOrg(orgId, session?.user?.email);

  // Fetch teams and memberships for child cards
  const orgTeams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });
  const teamMemberships = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    { organizationId: orgId, status: "active" }
  );

  // teamId → name
  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of orgTeams ?? []) {
      map.set(t._id, t.name);
    }
    return map;
  }, [orgTeams]);

  // playerIdentityId → team names
  const teamNamesByPlayer = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of teamMemberships ?? []) {
      const name = teamNameById.get(m.teamId);
      if (!name) {
        continue;
      }
      map.set(m.playerIdentityId, [
        ...(map.get(m.playerIdentityId) ?? []),
        name,
      ]);
    }
    return map;
  }, [teamMemberships, teamNameById]);

  // Age helper
  const calcAge = (dob: string) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  };

  // Check if user has parent role
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

  // Fetch all goals for all children at once
  const allChildrenIds = useMemo(
    () => identityChildren.map((c) => c.player._id),
    [identityChildren]
  );
  const allGoals = useQuery(
    api.models.passportGoals.getGoalsForPlayers,
    allChildrenIds.length > 0 ? { playerIdentityIds: allChildrenIds } : "skip"
  );

  // Per-child goal stats
  const childGoalStats = useMemo(() => {
    const map = new Map<string, { completed: number; total: number }>();
    for (const goal of allGoals ?? []) {
      const current = map.get(goal.playerIdentityId) ?? {
        completed: 0,
        total: 0,
      };
      map.set(goal.playerIdentityId, {
        total: current.total + 1,
        completed: current.completed + (goal.status === "completed" ? 1 : 0),
      });
    }
    return map;
  }, [allGoals]);

  // Aggregate stats across all children
  const achievementStats = useMemo(() => {
    const totalCompleted = (allGoals ?? []).filter(
      (g: any) => g.status === "completed"
    ).length;
    const recentReviews = identityChildren.filter((c) => {
      if (!c.enrollment?.lastReviewDate) {
        return false;
      }
      const daysSince = Math.floor(
        (Date.now() - new Date(c.enrollment.lastReviewDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return daysSince <= 30;
    }).length;
    return {
      completedGoals: totalCompleted,
      recentReviews,
      totalChildren: identityChildren.length,
    };
  }, [allGoals, identityChildren]);

  // Goals for the selected child
  const completedGoals = useMemo(() => {
    if (!(selectedChildId && allGoals)) {
      return [];
    }
    return allGoals.filter(
      (g: any) =>
        g.playerIdentityId === selectedChildId && g.status === "completed"
    );
  }, [allGoals, selectedChildId]);

  // Recent milestones filtered to selected child (or all if none selected)
  const milestonesSource = useMemo(() => {
    if (!selectedChildId) {
      return identityChildren;
    }
    return identityChildren.filter((c) => c.player._id === selectedChildId);
  }, [identityChildren, selectedChildId]);

  // Show loading state
  if (roleDetails === undefined || identityLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Show access denied if no parent role and no children
  if (!hasParentRole && identityChildren.length === 0) {
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
              You don't have access to achievements. Contact your organization's
              administrator.
            </p>
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

  // No children case
  if (identityChildren.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-2xl text-gray-900">Achievements</h1>
          <p className="text-gray-600 text-sm">
            Celebrate your children's accomplishments and milestones
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No children linked to your account</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const childCount = identityChildren.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <OrgThemedGradient
        className="rounded-lg p-4 shadow-md md:p-6"
        gradientTo="secondary"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <Award className="h-7 w-7 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-xl md:text-2xl">Achievements</h1>
            <p className="text-sm opacity-90">
              Celebrate milestones and accomplishments
            </p>
          </div>
        </div>
      </OrgThemedGradient>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card className="border-yellow-200 bg-yellow-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Trophy className="text-yellow-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {achievementStats.completedGoals}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Goals Achieved
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-yellow-100">
              <div className="h-1 w-full rounded-full bg-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Star className="text-purple-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {achievementStats.recentReviews}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Recent Reviews
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-purple-100">
              <div className="h-1 w-full rounded-full bg-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <TrendingUp className="text-green-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {achievementStats.totalChildren}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Active Players
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-green-100">
              <div className="h-1 w-full rounded-full bg-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Child Filter Cards */}
      <div
        className={`grid gap-3 ${
          childCount === 1
            ? "max-w-xs grid-cols-1"
            : childCount === 2
              ? "grid-cols-2"
              : "grid-cols-2 md:grid-cols-3"
        }`}
      >
        {identityChildren.map((child) => {
          const isSelected = selectedChildId === child.player._id;
          const gs = childGoalStats.get(child.player._id) ?? {
            completed: 0,
            total: 0,
          };

          return (
            <button
              className={`cursor-pointer rounded-lg border p-3 text-left transition-all duration-200 hover:shadow-md ${
                isSelected ? "ring-2 ring-blue-500" : ""
              }`}
              key={child.player._id}
              onClick={() =>
                setSelectedChildId(isSelected ? null : child.player._id)
              }
              style={{
                backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                borderColor: isSelected
                  ? undefined
                  : "rgba(var(--org-primary-rgb), 0.25)",
              }}
              type="button"
            >
              {/* Name */}
              <p
                className="truncate font-semibold text-gray-900 text-sm"
                title={`${child.player.firstName} ${child.player.lastName}`}
              >
                {child.player.firstName} {child.player.lastName}
              </p>

              {/* DOB + age */}
              {child.player.dateOfBirth && (
                <p className="text-gray-500 text-xs">
                  {new Date(child.player.dateOfBirth).toLocaleDateString(
                    "en-GB",
                    { day: "numeric", month: "short", year: "numeric" }
                  )}{" "}
                  · Age {calcAge(child.player.dateOfBirth)}
                </p>
              )}

              {/* Team badges */}
              {(teamNamesByPlayer.get(child.player._id) ?? []).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {(teamNamesByPlayer.get(child.player._id) ?? []).map(
                    (name) => (
                      <span
                        className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 text-xs"
                        key={name}
                      >
                        {name}
                      </span>
                    )
                  )}
                </div>
              )}

              {/* Stat icons */}
              <div className="mt-2.5 flex flex-wrap gap-2">
                <span
                  className="flex items-center gap-1 text-xs text-yellow-600"
                  title="Goals achieved"
                >
                  <Trophy size={13} />
                  <span className="font-medium">{gs.completed}</span>
                </span>
                <span
                  className={`flex items-center gap-1 text-xs ${gs.total > 0 ? "text-blue-600" : "text-gray-400"}`}
                  title="Total goals"
                >
                  <TrendingUp size={13} />
                  <span className="font-medium">{gs.total}</span>
                </span>
                {child.enrollment?.lastReviewDate && (
                  <span
                    className="flex items-center gap-1 text-purple-600 text-xs"
                    title="Has recent review"
                  >
                    <Star size={13} />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Completed Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="text-yellow-600" size={20} />
            Completed Goals
            {selectedChildId && (
              <span className="font-normal text-muted-foreground text-sm">
                {" "}
                — {(() => {
                  const child = identityChildren.find(
                    (c) => c.player._id === selectedChildId
                  );
                  return child
                    ? `${child.player.firstName} ${child.player.lastName}`
                    : "";
                })()}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedChildId ? (
            completedGoals.length === 0 ? (
              <div className="py-8 text-center">
                <Trophy className="mx-auto mb-3 text-gray-300" size={48} />
                <p className="text-gray-500">No completed goals yet</p>
                <p className="mt-1 text-gray-400 text-sm">
                  Achievements will appear here as goals are completed
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedGoals.map((goal: any) => (
                  <div
                    className="flex items-start gap-4 rounded-lg border bg-gradient-to-r from-yellow-50 to-orange-50 p-4"
                    key={goal._id}
                  >
                    <Trophy
                      className="mt-1 flex-shrink-0 text-yellow-600"
                      size={24}
                    />
                    <div className="flex-1">
                      <div className="mb-1 flex items-start justify-between">
                        <h3 className="font-medium">{goal.title}</h3>
                        <Badge className="bg-green-100 text-green-700">
                          Completed
                        </Badge>
                      </div>
                      {goal.description && (
                        <p className="mt-1 text-gray-600 text-sm">
                          {goal.description}
                        </p>
                      )}
                      {goal.completedDate && (
                        <div className="mt-2 flex items-center gap-2 text-gray-500 text-sm">
                          <Calendar size={14} />
                          <span>
                            Completed{" "}
                            {new Date(goal.completedDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="py-8 text-center">
              <Trophy className="mx-auto mb-3 text-gray-300" size={48} />
              <p className="text-gray-500">
                Select a child above to view their completed goals
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="text-purple-600" size={20} />
            Recent Milestones
            {selectedChildId && (
              <span className="font-normal text-muted-foreground text-sm">
                {" "}
                — {(() => {
                  const child = identityChildren.find(
                    (c) => c.player._id === selectedChildId
                  );
                  return child
                    ? `${child.player.firstName} ${child.player.lastName}`
                    : "";
                })()}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedChildId ? (
            <div className="space-y-3">
              {milestonesSource
                .filter((c) => c.enrollment?.lastReviewDate)
                .sort((a, b) => {
                  const aDate = a.enrollment?.lastReviewDate
                    ? new Date(a.enrollment.lastReviewDate).getTime()
                    : 0;
                  const bDate = b.enrollment?.lastReviewDate
                    ? new Date(b.enrollment.lastReviewDate).getTime()
                    : 0;
                  return bDate - aDate;
                })
                .slice(0, 5)
                .map((child) => (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={child.player._id}
                  >
                    <div className="flex items-center gap-3">
                      <Star className="text-purple-600" size={20} />
                      <div>
                        <p className="font-medium">
                          {child.player.firstName} {child.player.lastName}
                        </p>
                        <p className="text-gray-600 text-sm">
                          Latest assessment completed
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {child.enrollment?.lastReviewDate
                        ? new Date(
                            child.enrollment.lastReviewDate
                          ).toLocaleDateString()
                        : "N/A"}
                    </Badge>
                  </div>
                ))}
              {milestonesSource.filter((c) => c.enrollment?.lastReviewDate)
                .length === 0 && (
                <div className="py-8 text-center">
                  <Star className="mx-auto mb-3 text-gray-300" size={48} />
                  <p className="text-gray-500">No milestones yet</p>
                  <p className="mt-1 text-gray-400 text-sm">
                    Recent assessments and progress will appear here
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Star className="mx-auto mb-3 text-gray-300" size={48} />
              <p className="text-gray-500">
                Select a child above to view their milestones
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
