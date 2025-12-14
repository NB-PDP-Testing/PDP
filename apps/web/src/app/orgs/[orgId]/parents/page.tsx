"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Calendar, FileText, TrendingUp, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

function ParentDashboardPlaceholder() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: member } = authClient.useActiveMember();

  // Get linked players for the parent (if any)
  const linkedPlayers = useQuery(
    api.models.members.getMembersWithDetails,
    orgId ? { organizationId: orgId } : "skip"
  );

  // Filter to find current user's linked players
  const currentUserPlayers =
    linkedPlayers?.filter(
      (m) => m.userId === member?.userId && (m as any).linkedPlayers?.length > 0
    ) || [];

  const playerCount = currentUserPlayers.reduce(
    (acc, m) => acc + ((m as any).linkedPlayers?.length || 0),
    0
  );

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

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Family's Journey</CardTitle>
          <CardDescription>
            The parent dashboard will provide comprehensive insights into your
            children's sports development, including:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
                  <li>✅ Parent role identification</li>
                  <li>✅ Player linking system</li>
                  <li>✅ Basic player passport view</li>
                  <li>🔄 Dashboard components (in progress)</li>
                  <li>⏳ Schedule integration (planned)</li>
                  <li>⏳ AI practice assistant (planned)</li>
                </ul>
              </div>
            </div>

            {playerCount > 0 && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-blue-900 text-sm">
                  <strong>Good news!</strong> We've found {playerCount}{" "}
                  {playerCount === 1 ? "child" : "children"} linked to your
                  account. The full dashboard will be available soon.
                </p>
              </div>
            )}

            {playerCount === 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-amber-900 text-sm">
                  <strong>No children linked yet.</strong> Contact your
                  organization's administrator to link your children's player
                  profiles to your account.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <a
              className="rounded-lg border p-3 transition-colors hover:bg-accent"
              href={`/orgs/${orgId}/players`}
            >
              <div className="font-medium">View All Players</div>
              <div className="text-muted-foreground text-sm">
                Browse all players in the organization
              </div>
            </a>
            <a
              className="rounded-lg border p-3 transition-colors hover:bg-accent"
              href={`/orgs/${orgId}/admin`}
            >
              <div className="font-medium">Organization Settings</div>
              <div className="text-muted-foreground text-sm">
                Manage organization settings (admin only)
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ParentsPage() {
  return (
    <Suspense fallback={<Loader />}>
      <ParentDashboardPlaceholder />
    </Suspense>
  );
}
