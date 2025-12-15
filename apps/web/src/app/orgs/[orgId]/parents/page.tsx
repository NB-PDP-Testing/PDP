"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  FileText,
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
import { authClient } from "@/lib/auth-client";

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

  // Get players linked to this parent by email
  const linkedPlayers = useQuery(
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

  const playerCount = linkedPlayers?.length ?? 0;

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

      {/* Linked Children Section */}
      {playerCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Children</CardTitle>
            <CardDescription>
              Click on a child to view their player passport
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {linkedPlayers?.map((player: any) => (
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
