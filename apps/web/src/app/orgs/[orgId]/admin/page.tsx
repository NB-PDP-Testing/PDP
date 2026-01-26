"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Clock,
  Crown,
  Heart,
  Mail,
  MessageSquare,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getRoleColor } from "@/components/functional-role-indicator";
import { OrgThemedButton } from "@/components/org-themed-button";
import { Badge } from "@/components/ui/badge";
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
  const pendingInvitations = useQuery(
    api.models.members.getPendingInvitations,
    { organizationId: orgId }
  );
  // Use NEW identity system to get player enrollments
  const playerEnrollments = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForOrg,
    { organizationId: orgId }
  );
  // Get teams count
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });
  const memberCounts = useQuery(api.models.members.getMemberCountsByRole, {
    organizationId: orgId,
  });
  const currentOwner = useQuery(api.models.members.getCurrentOwner, {
    organizationId: orgId,
  });
  const enquiryCount = useQuery(api.models.passportEnquiries.getEnquiryCount, {
    organizationId: orgId,
  });
  // Pending functional role requests from existing members
  const pendingRoleRequests = useQuery(
    api.models.members.getPendingFunctionalRoleRequests,
    { organizationId: orgId }
  );

  const isLoading =
    pendingRequests === undefined ||
    pendingInvitations === undefined ||
    playerEnrollments === undefined ||
    teams === undefined ||
    memberCounts === undefined ||
    enquiryCount === undefined ||
    pendingRoleRequests === undefined;

  return (
    <div className="w-full max-w-full space-y-6 overflow-hidden sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Admin Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Overview of your organization management
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid auto-rows-min grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            {/* Pending Approvals - Combined membership + role requests */}
            <StatCard
              description="Membership and role requests"
              href={`/orgs/${orgId}/admin/users/approvals` as Route}
              icon={Clock}
              title="Pending Approvals"
              value={
                (pendingRequests?.length || 0) +
                (pendingRoleRequests?.length || 0)
              }
              variant={
                (pendingRequests?.length || 0) +
                  (pendingRoleRequests?.length || 0) >
                0
                  ? "warning"
                  : "primary"
              }
            />
            {pendingInvitations && pendingInvitations.length > 0 && (
              <StatCard
                description="Invitations sent but not accepted"
                href={`/orgs/${orgId}/admin/users` as Route}
                icon={Mail}
                title="Pending Invites"
                value={pendingInvitations.length}
                variant="warning"
              />
            )}
            {enquiryCount !== undefined && enquiryCount > 0 && (
              <StatCard
                description="Passport enquiries from other orgs"
                href={`/orgs/${orgId}/admin/enquiries` as Route}
                icon={MessageSquare}
                title="Open Enquiries"
                value={enquiryCount}
                variant="warning"
              />
            )}
            {/* Core Metrics - Always shown */}
            <StatCard
              description="Organization members"
              href={`/orgs/${orgId}/admin/users` as Route}
              icon={Users}
              title="Total Members"
              value={
                (memberCounts?.total || 0) + (pendingInvitations?.length || 0)
              }
              variant="primary"
            />
            <StatCard
              description="Active teams"
              href={`/orgs/${orgId}/admin/teams` as Route}
              icon={Shield}
              title="Teams"
              value={teams?.length || 0}
              variant="secondary"
            />
            <StatCard
              description="Registered players"
              href={`/orgs/${orgId}/admin/players` as Route}
              icon={Users}
              title="Players"
              value={playerEnrollments?.length || 0}
              variant="tertiary"
            />
            <StatCard
              description="Emergency contacts & allergies"
              href={`/orgs/${orgId}/admin/medical` as Route}
              icon={Heart}
              title="Medical Profiles"
              value="View"
              variant="secondary"
            />
          </>
        )}
      </div>

      {/* Owner Info Card */}
      {currentOwner && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Crown className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-900">Organization Owner</p>
              <p className="text-amber-700 text-sm">
                {currentOwner.userName || "Unknown"}{" "}
                <span className="text-amber-600">
                  ({currentOwner.userEmail})
                </span>
              </p>
            </div>
            <Link href={`/orgs/${orgId}/admin/settings` as Route}>
              <OrgThemedButton className="h-11" size="sm" variant="outline">
                Manage Ownership
              </OrgThemedButton>
            </Link>
          </CardContent>
        </Card>
      )}

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
                  <Link
                    href={`/orgs/${orgId}/admin/users/approvals` as Route}
                    key={request._id}
                  >
                    <div
                      className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      style={{
                        borderColor: "rgb(var(--org-primary-rgb) / 0.2)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full"
                          style={{
                            backgroundColor:
                              "rgb(var(--org-primary-rgb) / 0.1)",
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
                        className={`border capitalize ${getRoleColor(request.requestedRole)}`}
                        variant="outline"
                      >
                        {request.requestedRole}
                      </Badge>
                    </div>
                  </Link>
                ))}
                <Link href={`/orgs/${orgId}/admin/users/approvals` as Route}>
                  <OrgThemedButton
                    className="w-full"
                    size="sm"
                    variant="outline"
                  >
                    {pendingRequests.length > 5
                      ? `View all ${pendingRequests.length} pending requests`
                      : "Manage Requests"}
                  </OrgThemedButton>
                </Link>
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
        <Card
          style={{
            backgroundColor: "rgb(var(--org-secondary-rgb) / 0.05)",
            borderColor: "rgb(var(--org-secondary-rgb) / 0.2)",
          }}
        >
          <CardHeader>
            <CardTitle
              className="flex items-center gap-2"
              style={{ color: theme.secondary }}
            >
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
            <Link href={`/orgs/join/${orgId}`}>
              <OrgThemedButton className="w-full" variant="secondary">
                View Join Page
              </OrgThemedButton>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
