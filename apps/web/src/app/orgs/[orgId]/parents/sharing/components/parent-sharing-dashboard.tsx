"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";
import { ChildSharingCard } from "./child-sharing-card";
import {
  type ChildForSharing,
  EnableSharingWizard,
} from "./enable-sharing-wizard";
import { NotificationPreferences } from "./notification-preferences";
import { PrivacySettingsCard } from "./privacy-settings-card";

type ParentSharingDashboardProps = {
  orgId: string;
};

export function ParentSharingDashboard({ orgId }: ParentSharingDashboardProps) {
  const router = useRouter();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: session } = authClient.useSession();

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [selectedChildForWizard, setSelectedChildForWizard] = useState<
    string | null
  >(null);
  const [sourceRequestId, setSourceRequestId] = useState<
    Id<"passportShareRequests"> | undefined
  >(undefined);

  // Preferences modal state
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Get children from guardian identity system
  const {
    guardianIdentity,
    children: identityChildren,
    isLoading: identityLoading,
  } = useGuardianChildrenInOrg(orgId, session?.user?.email);

  // Global findability preference mutation
  const updateDiscoveryPreference = useMutation(
    api.models.guardianIdentities.updatePassportDiscoveryPreference
  );

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

  // Get all player identity IDs for batch query
  const playerIdentityIds = useMemo(
    () => identityChildren.map((child) => child.player._id),
    [identityChildren]
  );

  // Fetch consent and request data for all children in a single bulk query
  const bulkData = useQuery(
    api.lib.consentGateway.getBulkConsentsAndRequestsForPlayers,
    playerIdentityIds.length > 0 ? { playerIdentityIds } : "skip"
  );

  // Fetch sport passports for all children in a single bulk query
  // Note: enrollment.sport is DEPRECATED - sportPassports is the source of truth
  const sportPassportsBulk = useQuery(
    api.models.sportPassports.getBulkPassportsForPlayers,
    playerIdentityIds.length > 0 ? { playerIdentityIds } : "skip"
  );

  // Calculate summary stats from bulk data
  const summaryStats = useMemo(() => {
    if (!bulkData) {
      return {
        childrenCount: identityChildren.length,
        activeShares: 0,
        pendingRequests: 0,
        lastActivity: null as Date | null,
      };
    }

    // Aggregate across all children
    let totalActiveShares = 0;
    let totalPendingRequests = 0;
    let mostRecentActivity: Date | null = null;

    const now = Date.now();
    for (const childData of bulkData) {
      // Count active shares
      const activeShares = childData.consents.filter(
        (c) =>
          c.status === "active" &&
          c.coachAcceptanceStatus === "accepted" &&
          c.expiresAt > now
      );
      totalActiveShares += activeShares.length;

      // Count pending requests
      totalPendingRequests += childData.pendingRequests.length;

      // Track most recent activity
      for (const consent of childData.consents) {
        const consentDate = new Date(consent.consentedAt);
        if (!mostRecentActivity || consentDate > mostRecentActivity) {
          mostRecentActivity = consentDate;
        }
      }
    }

    return {
      childrenCount: identityChildren.length,
      activeShares: totalActiveShares,
      pendingRequests: totalPendingRequests,
      lastActivity: mostRecentActivity,
    };
  }, [identityChildren.length, bulkData]);

  // Handle global findability toggle
  const handleDiscoveryToggle = async (enabled: boolean) => {
    if (!guardianIdentity?._id) {
      toast.error("Guardian identity not found");
      return;
    }

    try {
      await updateDiscoveryPreference({
        guardianIdentityId: guardianIdentity._id,
        allowGlobalPassportDiscovery: enabled,
      });

      toast.success(
        enabled
          ? "Global passport discovery enabled - coaches can now find your children's passports"
          : "Global passport discovery disabled"
      );
    } catch (error) {
      toast.error("Failed to update preference. Please try again.");
      console.error(error);
    }
  };

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

      {/* Global Actions */}
      {identityChildren.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>
              Manage sharing and preferences for all your children
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setShowWizard(true)}
                size="default"
                variant="default"
              >
                Enable Sharing
              </Button>
              <Button
                disabled={!guardianIdentity?._id}
                onClick={() => setPreferencesOpen(true)}
                size="default"
                variant="outline"
              >
                Manage Notification Preferences
              </Button>
            </div>

            {/* Global Findability Toggle */}
            <div className="flex items-start gap-3 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <Eye className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label
                      className="font-medium text-blue-900 text-sm"
                      htmlFor="global-discovery"
                    >
                      Allow Global Passport Discovery
                    </Label>
                    <p className="text-blue-700 text-xs">
                      Enable coaches at any organization to discover your
                      children's passports and request access. You'll receive a
                      notification for each request and can approve or decline.
                    </p>
                  </div>
                  <Switch
                    checked={
                      guardianIdentity?.allowGlobalPassportDiscovery ?? false
                    }
                    disabled={!guardianIdentity?._id}
                    id="global-discovery"
                    onCheckedChange={handleDiscoveryToggle}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Settings */}
      {identityChildren.length > 0 && guardianIdentity?._id && (
        <PrivacySettingsCard guardianIdentityId={guardianIdentity._id} />
      )}

      {/* Children List */}
      {identityChildren.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-xl">Your Children</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {identityChildren.map((child) => {
              // Find this child's data from bulk query
              const childBulkData = bulkData?.find(
                (data) => data.playerIdentityId === child.player._id
              );

              return (
                <ChildSharingCard
                  child={child}
                  consentsData={childBulkData?.consents}
                  guardianIdentityId={guardianIdentity?._id}
                  key={child.player._id}
                  onEnableSharing={(childId, requestId) => {
                    setSelectedChildForWizard(childId);
                    setSourceRequestId(requestId);
                    setShowWizard(true);
                  }}
                  pendingRequestsData={childBulkData?.pendingRequests}
                />
              );
            })}
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

      {/* Enable Sharing Wizard */}
      <EnableSharingWizard
        childrenList={prepareChildrenForWizard()}
        onOpenChange={(open) => {
          setShowWizard(open);
          if (!open) {
            setSelectedChildForWizard(null);
            setSourceRequestId(undefined);
          }
        }}
        open={showWizard}
        orgId={orgId}
        preSelectedChildId={selectedChildForWizard || undefined}
        sourceRequestId={sourceRequestId}
      />

      {/* Notification Preferences Dialog */}
      <Dialog onOpenChange={setPreferencesOpen} open={preferencesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
          </DialogHeader>
          {guardianIdentity?._id && (
            <NotificationPreferences
              guardianIdentityId={guardianIdentity._id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  // Helper function to prepare children data for wizard
  function prepareChildrenForWizard(): ChildForSharing[] {
    return identityChildren.map((child) => {
      // Find sport passport data for this child
      const sportData = sportPassportsBulk?.find(
        (data) => data.playerIdentityId === child.player._id
      );

      return {
        _id: child.player._id,
        firstName: child.player.firstName,
        lastName: child.player.lastName,
        sport: sportData?.primarySportCode || child.enrollment?.sport, // Fallback to deprecated field if no passport
        ageGroup: child.enrollment?.ageGroup,
      };
    });
  }
}
