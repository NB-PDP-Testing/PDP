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
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  variant = "default",
}: {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  variant?: "default" | "warning" | "success" | "danger";
}) {
  const variantStyles = {
    default: "bg-primary/10 text-primary",
    warning: "bg-yellow-500/10 text-yellow-600",
    success: "bg-green-500/10 text-green-600",
    danger: "bg-red-500/10 text-red-600",
  };

  const content = (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-medium text-muted-foreground text-sm">
          {title}
        </CardTitle>
        <div className={`rounded-lg p-2 ${variantStyles[variant]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="font-bold text-2xl">{value}</div>
        {description && (
          <p className="mt-1 text-muted-foreground text-xs">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href as Route}>{content}</Link>;
  }

  return content;
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="mt-2 h-3 w-32" />
      </CardContent>
    </Card>
  );
}

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
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : pendingUsers && pendingUsers.length > 0 ? (
              <div className="space-y-3">
                {pendingUsers.slice(0, 5).map((user) => (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={user._id}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.firstName || user.name} {user.lastName || ""}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-yellow-500/10 px-2 py-1 font-medium text-xs text-yellow-600">
                      Pending
                    </span>
                  </div>
                ))}
                {pendingUsers.length > 5 && (
                  <Link href={`/orgs/${orgId}/admin/users/approvals` as Route}>
                    <Button className="w-full" size="sm" variant="ghost">
                      View all {pendingUsers.length} pending users
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <UserCheck className="mb-3 h-12 w-12 text-green-500" />
                <p className="font-medium">All caught up!</p>
                <p className="text-muted-foreground text-sm">
                  No pending approvals at the moment
                </p>
              </div>
            )}
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
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : rejectedUsers && rejectedUsers.length > 0 ? (
              <div className="space-y-3">
                {rejectedUsers.slice(0, 5).map((user) => (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={user._id}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                        <UserX className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.firstName || user.name} {user.lastName || ""}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-red-500/10 px-2 py-1 font-medium text-red-600 text-xs">
                      Rejected
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <UserCheck className="mb-3 h-12 w-12 text-muted-foreground/50" />
                <p className="font-medium text-muted-foreground">
                  No rejected users
                </p>
                <p className="text-muted-foreground text-sm">
                  All users have been processed appropriately
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
