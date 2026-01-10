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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";

interface ParentAchievementsViewProps {
  orgId: string;
}

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

  // Check if user has parent role
  const hasParentRole = useMemo(() => {
    if (!roleDetails) return false;
    return (
      roleDetails.functionalRoles.includes("parent") ||
      roleDetails.functionalRoles.includes("admin") ||
      roleDetails.betterAuthRole === "owner" ||
      roleDetails.betterAuthRole === "admin"
    );
  }, [roleDetails]);

  // Auto-select first child if none selected
  const selectedChild = useMemo(() => {
    if (identityChildren.length === 0) return null;
    if (!selectedChildId) {
      const firstChild = identityChildren[0];
      setSelectedChildId(firstChild.player._id);
      return firstChild;
    }
    return (
      identityChildren.find((c) => c.player._id === selectedChildId) ||
      identityChildren[0]
    );
  }, [identityChildren, selectedChildId]);

  // Get development goals for selected child
  const developmentGoals = useQuery(
    api.models.passportGoals.getGoalsForPlayer,
    selectedChild ? { playerIdentityId: selectedChild.player._id } : "skip"
  );

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

  const playerCount = identityChildren.length;
  const completedGoals =
    developmentGoals?.filter((g: any) => g.status === "completed") || [];

  // Calculate achievement statistics
  const achievementStats = useMemo(
    () => ({
      completedGoals: completedGoals.length,
      recentReviews: identityChildren.filter((c) => {
        if (!c.enrollment?.lastReviewDate) return false;
        const daysSince = Math.floor(
          (Date.now() - new Date(c.enrollment.lastReviewDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return daysSince <= 30;
      }).length,
      totalChildren: playerCount,
    }),
    [identityChildren, completedGoals, playerCount]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl text-gray-900">Achievements</h1>
        <p className="text-gray-600 text-sm">
          Celebrate milestones and accomplishments
        </p>
      </div>

      {/* Child Selector */}
      {playerCount > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="text-gray-400" size={20} />
              <select
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setSelectedChildId(e.target.value)}
                value={selectedChildId || ""}
              >
                {identityChildren.map((child) => (
                  <option key={child.player._id} value={child.player._id}>
                    {child.player.firstName} {child.player.lastName}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Trophy className="text-yellow-600" size={24} />
              <div>
                <p className="text-gray-600 text-sm">Goals Achieved</p>
                <p className="font-bold text-2xl">
                  {achievementStats.completedGoals}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Star className="text-purple-600" size={24} />
              <div>
                <p className="text-gray-600 text-sm">Recent Reviews</p>
                <p className="font-bold text-2xl">
                  {achievementStats.recentReviews}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-green-600" size={24} />
              <div>
                <p className="text-gray-600 text-sm">Active Players</p>
                <p className="font-bold text-2xl">
                  {achievementStats.totalChildren}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completed Goals / Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="text-yellow-600" size={20} />
            Completed Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedGoals.length === 0 ? (
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
          )}
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="text-purple-600" size={20} />
            Recent Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {identityChildren
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
            {identityChildren.filter((c) => c.enrollment?.lastReviewDate)
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
        </CardContent>
      </Card>
    </div>
  );
}
