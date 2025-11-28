"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Clock,
  Shield,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PendingUsersSection } from "./pending-users-section";
import { RejectedUsersSection } from "./rejected-users-section";
import { StatCard, StatCardSkeleton } from "./stat-card";

export default function OrgAdminOverviewPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const pendingUsers = useQuery(api.models.users.getPendingUsers);
  const approvedUsers = useQuery(api.models.users.getApprovedUsers);
  const rejectedUsers = useQuery(api.models.users.getRejectedUsers);
  const players = useQuery(api.models.players.getPlayersByOrganization, {
    organizationId: orgId,
  });

  const isLoading =
    pendingUsers === undefined ||
    approvedUsers === undefined ||
    rejectedUsers === undefined ||
    players === undefined;

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
              description="Users waiting for review"
              href={`/orgs/${orgId}/admin/users/approvals`}
              icon={Clock}
              title="Pending Approvals"
              value={pendingUsers?.length || 0}
              variant={
                pendingUsers && pendingUsers.length > 0 ? "warning" : "default"
              }
            />
            <StatCard
              description="Approved and active"
              href={`/orgs/${orgId}/admin/users`}
              icon={UserCheck}
              title="Active Users"
              value={approvedUsers?.length || 0}
              variant="success"
            />
            <StatCard
              description="Active teams"
              href={`/orgs/${orgId}/admin/teams`}
              icon={Shield}
              title="Teams"
              value={0}
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href={`/orgs/${orgId}/admin/users/approvals` as Route}>
            <Button className="w-full justify-start gap-2" variant="outline">
              <UserCheck className="h-4 w-4" />
              Review Pending Users
              {pendingUsers && pendingUsers.length > 0 && (
                <span className="ml-auto rounded-full bg-yellow-500/10 px-2 py-0.5 font-medium text-xs text-yellow-600">
                  {pendingUsers.length}
                </span>
              )}
            </Button>
          </Link>
          <Link href={`/orgs/${orgId}/admin/users` as Route}>
            <Button className="w-full justify-start gap-2" variant="outline">
              <Users className="h-4 w-4" />
              Manage Users
            </Button>
          </Link>
          <Link href={`/orgs/${orgId}/admin/teams` as Route}>
            <Button className="w-full justify-start gap-2" variant="outline">
              <Shield className="h-4 w-4" />
              Manage Teams
            </Button>
          </Link>
          <Button
            className="w-full justify-start gap-2"
            disabled
            variant="outline"
          >
            <TrendingUp className="h-4 w-4" />
            View Reports
            <span className="ml-auto text-muted-foreground text-xs">
              Coming Soon
            </span>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending Users Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
            <CardDescription>Users waiting for your review</CardDescription>
          </CardHeader>
          <CardContent>
            <PendingUsersSection
              isLoading={isLoading}
              orgId={orgId}
              pendingUsers={pendingUsers}
            />
          </CardContent>
        </Card>

        {/* Rejected Users Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              Recently Rejected
            </CardTitle>
            <CardDescription>Users that were not approved</CardDescription>
          </CardHeader>
          <CardContent>
            <RejectedUsersSection
              isLoading={isLoading}
              rejectedUsers={rejectedUsers}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
