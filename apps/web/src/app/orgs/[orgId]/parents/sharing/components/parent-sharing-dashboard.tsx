"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
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
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";

type ParentSharingDashboardProps = {
  orgId: string;
};

export function ParentSharingDashboard({ orgId }: ParentSharingDashboardProps) {
  const router = useRouter();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: session } = authClient.useSession();

  // Get children from guardian identity system
  const {
    guardianIdentity,
    children: identityChildren,
    isLoading: identityLoading,
  } = useGuardianChildrenInOrg(orgId, session?.user?.email);

  // Get user's role details in this organization
  const roleDetails = useQuery(
    api.models.members.getMemberRoleDetails,
    session?.user?.email
      ? { organizationId: orgId, userEmail: session.user.email }
      : "skip"
  );

  // Check if user has parent functional role or is admin/owner
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

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    // TODO: Fetch actual consent data for each child
    // For now, return placeholder stats
    return {
      childrenCount: identityChildren.length,
      activeShares: 0,
      pendingRequests: 0,
      lastActivity: null as Date | null,
    };
  }, [identityChildren]);

  // Show loading state while checking roles
  if (roleDetails === undefined || identityLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Show access denied if user doesn't have parent role and no linked players
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
              onClick={() => router.push(`/orgs/${orgId}/parents`)}
              variant="outline"
            >
              Go to Parent Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold text-3xl">Passport Sharing</h1>
            <p className="mt-2 text-blue-100">
              Control how your{" "}
              {identityChildren.length === 1 ? "child's" : "children's"}{" "}
              development data is shared across organizations
            </p>
            {guardianIdentity && (
              <p className="mt-1 text-blue-200 text-sm">
                Managing {identityChildren.length}{" "}
                {identityChildren.length === 1 ? "child" : "children"} in{" "}
                {activeOrganization?.name || "this organization"}
              </p>
            )}
          </div>
          <Shield className="h-10 w-10 text-blue-200" />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Children</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {summaryStats.childrenCount}
            </div>
            <p className="text-muted-foreground text-xs">Managed by you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Active Shares</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-green-600">
              {summaryStats.activeShares}
            </div>
            <p className="text-muted-foreground text-xs">Currently shared</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Pending Requests
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-yellow-600">
              {summaryStats.pendingRequests}
            </div>
            <p className="text-muted-foreground text-xs">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Last Activity</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {summaryStats.lastActivity ? (
                summaryStats.lastActivity.toLocaleDateString()
              ) : (
                <span className="text-base text-muted-foreground">None</span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">Recent action</p>
          </CardContent>
        </Card>
      </div>

      {/* Children List */}
      {identityChildren.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-xl">Your Children</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {identityChildren.map((child) => (
              <Card key={child.player._id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {child.player.firstName} {child.player.lastName}
                    </span>
                    <Badge variant="outline">
                      {child.enrollment?.sport || "Unknown"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {child.enrollment?.ageGroup || "No age group"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Sharing status placeholder */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Active Shares:
                      </span>
                      <Badge variant="secondary">0</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Pending Requests:
                      </span>
                      <Badge variant="secondary">0</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Last Activity:
                      </span>
                      <span className="text-muted-foreground text-xs">
                        None
                      </span>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex flex-col gap-2">
                    <Button className="w-full" size="sm" variant="outline">
                      Enable Sharing
                    </Button>
                    <Button className="w-full" size="sm" variant="ghost">
                      View Audit Log
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Children Linked Message */}
      {identityChildren.length === 0 && hasParentRole && (
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
    </div>
  );
}
