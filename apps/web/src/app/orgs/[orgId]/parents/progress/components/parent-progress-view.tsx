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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";

interface ParentProgressViewProps {
  orgId: string;
}

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
  const {
    children: identityChildren,
    isLoading: identityLoading,
  } = useGuardianChildrenInOrg(orgId, session?.user?.email);

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
    return identityChildren.find((c) => c.player._id === selectedChildId) || identityChildren[0];
  }, [identityChildren, selectedChildId]);

  // Get development goals for selected child
  const developmentGoals = useQuery(
    api.models.passportGoals.getGoalsForPlayer,
    selectedChild
      ? { playerIdentityId: selectedChild.player._id }
      : "skip"
  );

  // For now, we don't query skill assessments (would require passport ID)
  const latestSkills = null;

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
              You don't have access to progress tracking. Contact your
              organization's administrator.
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
          <h1 className="font-bold text-2xl text-gray-900">Progress Tracking</h1>
          <p className="text-gray-600 text-sm">
            View your children's development goals and progress
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
  const activeGoals = developmentGoals?.filter((g: any) => g.status === "active") || [];
  const completedGoals = developmentGoals?.filter((g: any) => g.status === "completed") || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl text-gray-900">Progress Tracking</h1>
        <p className="text-gray-600 text-sm">
          Track development goals and skill progression
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Target className="text-blue-600" size={24} />
              <div>
                <p className="text-gray-600 text-sm">Active Goals</p>
                <p className="font-bold text-2xl">{activeGoals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-green-600" size={24} />
              <div>
                <p className="text-gray-600 text-sm">Completed</p>
                <p className="font-bold text-2xl">{completedGoals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-purple-600" size={24} />
              <div>
                <p className="text-gray-600 text-sm">Skills Tracked</p>
                <p className="font-bold text-2xl">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="text-orange-600" size={24} />
              <div>
                <p className="text-gray-600 text-sm">Last Review</p>
                <p className="font-medium text-sm">
                  {selectedChild?.enrollment?.lastReviewDate
                    ? new Date(selectedChild.enrollment.lastReviewDate).toLocaleDateString()
                    : "Not reviewed"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Development Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="text-blue-600" size={20} />
            Development Goals
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
              {activeGoals.map((goal: any) => (
                <div
                  className="rounded-lg border p-4"
                  key={goal._id}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{goal.title}</h3>
                      {goal.description && (
                        <p className="mt-1 text-gray-600 text-sm">
                          {goal.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={goal.status === "completed" ? "default" : "secondary"}>
                      {goal.status}
                    </Badge>
                  </div>
                  {goal.targetDate && (
                    <p className="text-gray-500 text-sm">
                      Target: {new Date(goal.targetDate).toLocaleDateString()}
                    </p>
                  )}
                  {goal.progress !== undefined && (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{goal.progress}%</span>
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
              {completedGoals.map((goal: any) => (
                <div
                  className="flex items-center justify-between rounded-lg border bg-green-50 p-3"
                  key={goal._id}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-green-600" size={20} />
                    <div>
                      <p className="font-medium">{goal.title}</p>
                      {goal.completedDate && (
                        <p className="text-gray-600 text-sm">
                          Completed {new Date(goal.completedDate).toLocaleDateString()}
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
    </div>
  );
}
