"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Clock, Shield, UserCheck, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { OrgThemedButton } from "@/components/org-themed-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { StatCard, StatCardSkeleton } from "./stat-card";

export default function OrgAdminOverviewPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { theme } = useOrgTheme();

  const pendingRequests = useQuery(
    api.models.orgJoinRequests.getPendingRequestsForOrg,
    { organizationId: orgId }
  );
  const players = useQuery(api.models.players.getPlayersByOrganization, {
    organizationId: orgId,
  });
  const memberCounts = useQuery(api.models.members.getMemberCountsByRole, {
    organizationId: orgId,
  });

  const isLoading =
    pendingRequests === undefined ||
    players === undefined ||
    memberCounts === undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Admin Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Overview of your organization management
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              description="Membership requests waiting"
              href={`/orgs/${orgId}/admin/users/approvals` as Route}
              icon={Clock}
              title="Pending Requests"
              value={pendingRequests?.length || 0}
              variant={
                pendingRequests && pendingRequests.length > 0
                  ? "warning"
                  : "default"
              }
            />
            <StatCard
              description="Organization members"
              href={`/orgs/${orgId}/admin/users` as Route}
              icon={Users}
              title="Total Members"
              value={memberCounts?.total || 0}
              variant="default"
            />
            <StatCard
              description="Active teams"
              href={`/orgs/${orgId}/admin/teams` as Route}
              icon={Shield}
              title="Teams"
              value={0}
              variant="default"
            />
            <StatCard
              description="Registered players"
              icon={Users}
              title="Players"
              value={players?.length || 0}
            />
          </>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending Membership Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Membership Requests
            </CardTitle>
            <CardDescription>
              Users requesting to join your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <StatCardSkeleton />
                <StatCardSkeleton />
              </div>
            ) : pendingRequests && pendingRequests.length > 0 ? (
              <div className="space-y-3">
                {pendingRequests.slice(0, 5).map((request) => (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={request._id}
                    style={{
                      borderColor: "rgb(var(--org-primary-rgb) / 0.2)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: "rgb(var(--org-primary-rgb) / 0.1)",
                        }}
                      >
                        <Users
                          className="h-5 w-5"
                          style={{ color: theme.primary }}
                        />
                      </div>
                      <div>
                        <p className="font-medium">{request.userName}</p>
                        <p className="text-muted-foreground text-sm">
                          {request.userEmail}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className="capitalize"
                      style={{
                        backgroundColor: "rgb(var(--org-secondary-rgb) / 0.2)",
                        color: theme.secondary,
                      }}
                    >
                      {request.requestedRole}
                    </Badge>
                  </div>
                ))}
                {pendingRequests.length > 5 && (
                  <Link href={`/orgs/${orgId}/admin/users/approvals` as Route}>
                    <OrgThemedButton
                      className="w-full"
                      size="sm"
                      variant="outline"
                    >
                      View all {pendingRequests.length} pending requests
                    </OrgThemedButton>
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <UserCheck
                  className="mb-3 h-12 w-12"
                  style={{ color: theme.primary }}
                />
                <p className="font-medium">All caught up!</p>
                <p className="text-muted-foreground text-sm">
                  No pending membership requests
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Link to Join Page */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Grow Your Organization
            </CardTitle>
            <CardDescription>Share your organization join link</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground text-sm">
              Users can request to join your organization using the join page.
              You'll receive their requests here for approval.
            </p>
            <Link href={"/orgs/join"}>
              <Button className="w-full" variant="outline">
                View Join Page
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
