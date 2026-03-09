"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Loader from "@/components/loader";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";

type ParentProgressViewProps = {
  orgId: string;
};

export function ParentProgressView({ orgId }: ParentProgressViewProps) {
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

  // Collect all child player IDs for batch goal fetch
  const allChildIds = useMemo(
    () => identityChildren.map((c) => c.player._id),
    [identityChildren]
  );

  // Fetch goals for all children in one query
  const allGoals = useQuery(
    api.models.passportGoals.getGoalsForPlayers,
    allChildIds.length > 0 ? { playerIdentityIds: allChildIds } : "skip"
  );

  // Fetch teams and team memberships for the org
  const orgTeams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });
  const teamMemberships = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    { organizationId: orgId, status: "active" }
  );

  // Map teamId → team name
  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of orgTeams ?? []) {
      map.set(t._id, t.name);
    }
    return map;
  }, [orgTeams]);

  // Map playerIdentityId → team names
  const teamNamesByPlayer = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of teamMemberships ?? []) {
      const name = teamNameById.get(m.teamId);
      if (!name) {
        continue;
      }
      const existing = map.get(m.playerIdentityId) ?? [];
      map.set(m.playerIdentityId, [...existing, name]);
    }
    return map;
  }, [teamMemberships, teamNameById]);

  // Helper: calculate age from ISO date string
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

  // Per-child goal stats
  const goalsByChild = useMemo(() => {
    const map = new Map<
      string,
      { active: number; completed: number; total: number }
    >();
    for (const child of identityChildren) {
      map.set(child.player._id, { active: 0, completed: 0, total: 0 });
    }
    for (const goal of allGoals ?? []) {
      const id = goal.playerIdentityId;
      const entry = map.get(id);
      if (!entry) {
        continue;
      }
      entry.total += 1;
      if (goal.status === "in_progress" || goal.status === "not_started") {
        entry.active += 1;
      }
      if (goal.status === "completed") {
        entry.completed += 1;
      }
    }
    return map;
  }, [allGoals, identityChildren]);

  // Goals scoped to selected child (for detail section)
  const childGoals = useMemo(() => {
    if (!(selectedChildId && allGoals)) {
      return [];
    }
    return allGoals.filter((g) => g.playerIdentityId === selectedChildId);
  }, [allGoals, selectedChildId]);

  const activeGoals = childGoals.filter(
    (g) => g.status === "in_progress" || g.status === "not_started"
  );
  const completedGoals = childGoals.filter((g) => g.status === "completed");

  // Aggregate stats across all children (for "all" view in top stat cards)
  const aggregateStats = useMemo(() => {
    if (!allGoals) {
      return {
        active: 0,
        completed: 0,
        total: 0,
        lastReview: null as string | null,
      };
    }
    const active = allGoals.filter(
      (g) => g.status === "in_progress" || g.status === "not_started"
    ).length;
    const completed = allGoals.filter((g) => g.status === "completed").length;
    const total = allGoals.length;
    const lastReview = identityChildren.reduce(
      (latest, c) => {
        const d = c.enrollment?.lastReviewDate;
        if (!d) {
          return latest;
        }
        return !latest || d > latest ? d : latest;
      },
      null as string | null
    );
    return { active, completed, total, lastReview };
  }, [allGoals, identityChildren]);

  // Stats shown in top cards — scoped to selected child or aggregate
  const displayStats = useMemo(() => {
    if (!selectedChildId) {
      return aggregateStats;
    }
    const child = identityChildren.find(
      (c) => c.player._id === selectedChildId
    );
    const goalStats = goalsByChild.get(selectedChildId) ?? {
      active: 0,
      completed: 0,
      total: 0,
    };
    return {
      active: goalStats.active,
      completed: goalStats.completed,
      total: goalStats.total,
      lastReview: child?.enrollment?.lastReviewDate ?? null,
    };
  }, [selectedChildId, aggregateStats, identityChildren, goalsByChild]);

  // Loading state
  if (roleDetails === undefined || identityLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Access denied
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
              You don&apos;t have access to progress tracking. Contact your
              organization&apos;s administrator.
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

  // No children
  if (identityChildren.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-2xl text-gray-900">
            Progress Tracking
          </h1>
          <p className="text-gray-600 text-sm">
            View your children&apos;s development goals and progress
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

  const selectedChild = identityChildren.find(
    (c) => c.player._id === selectedChildId
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <OrgThemedGradient
        className="rounded-lg p-4 shadow-md md:p-6"
        gradientTo="secondary"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <TrendingUp className="h-7 w-7 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-xl md:text-2xl">Progress Tracking</h1>
            <p className="text-sm opacity-90">
              Track development goals and skill progression
            </p>
          </div>
        </div>
      </OrgThemedGradient>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card className="border-blue-200 bg-blue-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Target className="text-blue-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {displayStats.active}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Active Goals
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-blue-100">
              <div
                className="h-1 rounded-full bg-blue-600"
                style={{
                  width:
                    displayStats.total > 0
                      ? `${(displayStats.active / displayStats.total) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <CheckCircle2 className="text-green-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {displayStats.completed}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Completed
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-green-100">
              <div
                className="h-1 rounded-full bg-green-600"
                style={{
                  width:
                    displayStats.total > 0
                      ? `${(displayStats.completed / displayStats.total) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <TrendingUp className="text-purple-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {displayStats.total}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Total Goals
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-purple-100">
              <div className="h-1 w-full rounded-full bg-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Calendar className="text-orange-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {displayStats.lastReview
                  ? new Date(displayStats.lastReview).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short" }
                    )
                  : "—"}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Last Review
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-orange-100">
              <div
                className="h-1 rounded-full bg-orange-600"
                style={{
                  width: displayStats.lastReview ? "100%" : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Child Selector Cards */}
      <div
        className={`grid gap-3 ${
          identityChildren.length === 1
            ? "max-w-xs grid-cols-1"
            : identityChildren.length === 2
              ? "grid-cols-2"
              : "grid-cols-2 md:grid-cols-3"
        }`}
      >
        {identityChildren.map((child) => {
          const isSelected = selectedChildId === child.player._id;
          const stats = goalsByChild.get(child.player._id) ?? {
            active: 0,
            completed: 0,
            total: 0,
          };
          const lastReview = child.enrollment?.lastReviewDate
            ? new Date(child.enrollment.lastReviewDate).toLocaleDateString(
                "en-GB",
                { day: "numeric", month: "short" }
              )
            : null;

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

              {/* Date of birth + age */}
              {child.player.dateOfBirth && (
                <p className="text-gray-500 text-xs">
                  {new Date(child.player.dateOfBirth).toLocaleDateString(
                    "en-GB",
                    { day: "numeric", month: "short", year: "numeric" }
                  )}{" "}
                  · Age {calcAge(child.player.dateOfBirth)}
                </p>
              )}

              {/* Teams */}
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
                  className="flex items-center gap-1 text-blue-600 text-xs"
                  title="Active Goals"
                >
                  <Target size={13} />
                  <span className="font-medium">{stats.active}</span>
                </span>
                <span
                  className="flex items-center gap-1 text-green-600 text-xs"
                  title="Completed Goals"
                >
                  <CheckCircle2 size={13} />
                  <span className="font-medium">{stats.completed}</span>
                </span>
                <span
                  className="flex items-center gap-1 text-purple-600 text-xs"
                  title="Total Goals"
                >
                  <TrendingUp size={13} />
                  <span className="font-medium">{stats.total}</span>
                </span>
                <span
                  className="flex items-center gap-1 text-orange-500 text-xs"
                  title="Last Review"
                >
                  <Calendar size={13} />
                  <span className="font-medium">{lastReview ?? "—"}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Goals detail — only shown when a child is selected */}
      {selectedChildId ? (
        <>
          {/* Development Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="text-blue-600" size={20} />
                Development Goals
                {selectedChild && (
                  <span className="ml-1 font-normal text-gray-500 text-sm">
                    — {selectedChild.player.firstName}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeGoals.length === 0 ? (
                <div className="py-8 text-center">
                  <Target className="mx-auto mb-3 text-gray-300" size={48} />
                  <p className="text-gray-500">No active development goals</p>
                  <p className="mt-1 text-gray-400 text-sm">
                    Goals will appear here when set by coaches
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeGoals.map((goal) => (
                    <div className="rounded-lg border p-4" key={goal._id}>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium">{goal.title}</h3>
                          {goal.description && (
                            <p className="mt-1 text-gray-600 text-sm">
                              {goal.description}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 text-xs capitalize">
                          {goal.status.replace("_", " ")}
                        </span>
                      </div>
                      {goal.targetDate && (
                        <p className="text-gray-500 text-sm">
                          Target:{" "}
                          {new Date(goal.targetDate).toLocaleDateString()}
                        </p>
                      )}
                      {goal.progress !== undefined && (
                        <div className="mt-3">
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">
                              {goal.progress}%
                            </span>
                          </div>
                          <Progress value={goal.progress} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="text-green-600" size={20} />
                  Completed Goals ({completedGoals.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {completedGoals.map((goal) => (
                    <div
                      className="flex items-center justify-between rounded-lg border bg-green-50 p-3"
                      key={goal._id}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2
                          className="shrink-0 text-green-600"
                          size={20}
                        />
                        <div>
                          <p className="font-medium">{goal.title}</p>
                          {goal.completedDate && (
                            <p className="text-gray-600 text-sm">
                              Completed{" "}
                              {new Date(
                                goal.completedDate
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <Users className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="text-gray-500 text-sm">
              Select a child above to view their development goals
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
