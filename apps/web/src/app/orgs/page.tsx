"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import {
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  Globe,
  Plus,
  Settings,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type JoinRequest,
  JoinRequestSection,
} from "@/components/join-request-status";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";

// Type for organization from better-auth
interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const {
    data: organizations,
    isPending: loading,
    refetch: refetchOrganizations,
  } = authClient.useListOrganizations();

  // Use Convex query to get user with custom fields
  const user = useCurrentUser();

  // Debug logging for platform staff check
  useEffect(() => {
    console.log("[/orgs] User data:", user);
    console.log("[/orgs] isPlatformStaff:", user?.isPlatformStaff);
  }, [user]);

  // Redirect if not platform staff
  useEffect(() => {
    if (user !== undefined && !user?.isPlatformStaff) {
      console.log("[/orgs] Redirecting non-platform-staff to home");
      toast.error("Only platform staff can access this page");
      router.push("/");
    }
  }, [user, router]);

  // Get all user's join requests (pending and rejected)
  const allJoinRequests = useQuery(
    api.models.orgJoinRequests.getUserJoinRequests
  );
  const cancelRequest = useMutation(
    api.models.orgJoinRequests.cancelJoinRequest
  );

  // Filter requests by status
  const pendingRequests = allJoinRequests?.filter(
    (r) => r.status === "pending"
  );
  const rejectedRequests = allJoinRequests?.filter(
    (r) => r.status === "rejected"
  );

  // Get all organizations for platform staff
  const allOrganizations = useQuery(
    api.models.organizations.getAllOrganizations,
    user?.isPlatformStaff ? {} : "skip"
  );

  // Get pending deletion requests for platform staff
  const pendingDeletionRequests = useQuery(
    api.models.organizations.getPendingDeletionRequests,
    user?.isPlatformStaff ? {} : "skip"
  );

  const approveDeletion = useMutation(
    api.models.organizations.approveDeletionRequest
  );
  const rejectDeletion = useMutation(
    api.models.organizations.rejectDeletionRequest
  );

  const handleCancelRequest = async (requestId: Id<"orgJoinRequests">) => {
    try {
      await cancelRequest({ requestId });
      toast.success("Request cancelled");
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error("Failed to cancel request");
    }
  };

  // State for deletion request handling
  const [processingDeletionId, setProcessingDeletionId] = useState<
    string | null
  >(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);

  const handleApproveDeletion = async (
    requestId: Id<"orgDeletionRequests">,
    orgName: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to PERMANENTLY DELETE "${orgName}" and ALL associated data? This cannot be undone.`
      )
    ) {
      return;
    }

    setProcessingDeletionId(requestId);
    try {
      await approveDeletion({ requestId });
      toast.success(`Organization "${orgName}" has been deleted`);
      // Refetch the organizations list to update the UI
      refetchOrganizations();
    } catch (error: any) {
      console.error("Error approving deletion:", error);
      toast.error(error.message || "Failed to approve deletion");
    } finally {
      setProcessingDeletionId(null);
    }
  };

  const handleRejectDeletion = async (
    requestId: Id<"orgDeletionRequests">,
    orgName: string
  ) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessingDeletionId(requestId);
    try {
      await rejectDeletion({
        requestId,
        rejectionReason: rejectionReason.trim(),
      });
      toast.success(`Deletion request for "${orgName}" has been rejected`);
      setShowRejectDialog(null);
      setRejectionReason("");
    } catch (error: any) {
      console.error("Error rejecting deletion:", error);
      toast.error(error.message || "Failed to reject deletion");
    } finally {
      setProcessingDeletionId(null);
    }
  };

  // Don't render if user is not platform staff
  if (user !== undefined && !user?.isPlatformStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <h1 className="font-bold text-2xl">Access Denied</h1>
          <p className="text-muted-foreground">
            Only platform staff can access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Authenticated>
        <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* PlayerARC Welcome Section */}
            <div className="mb-12 text-center text-white">
              <div className="mb-6 flex justify-center">
                <div className="relative h-20 w-20 sm:h-24 sm:w-24">
                  <Image
                    alt="PlayerARC Logo"
                    className="object-contain drop-shadow-lg"
                    fill
                    priority
                    sizes="(max-width: 640px) 80px, 96px"
                    src="/logos-landing/PDP-Logo-OffWhiteOrbit_GreenHuman.png"
                  />
                </div>
              </div>
              <h1 className="mb-4 font-bold text-4xl tracking-tight sm:text-5xl">
                Welcome to PlayerARC
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90 sm:text-xl">
                Your comprehensive platform for managing youth sports
                development. Connect coaches, parents, and players in one
                unified ecosystem.
              </p>

              {/* Summary Cards */}
              <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
                <Card className="border-white/20 bg-white/10 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="mb-3 flex justify-center">
                      <div className="rounded-full bg-green-500/20 p-3">
                        <Users className="h-6 w-6 text-green-400" />
                      </div>
                    </div>
                    <h3 className="mb-2 font-semibold text-white">
                      Team Management
                    </h3>
                    <p className="text-sm text-white/80">
                      Organize teams, track players, and manage rosters with
                      ease
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-white/20 bg-white/10 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="mb-3 flex justify-center">
                      <div className="rounded-full bg-blue-500/20 p-3">
                        <Target className="h-6 w-6 text-blue-400" />
                      </div>
                    </div>
                    <h3 className="mb-2 font-semibold text-white">
                      Player Development
                    </h3>
                    <p className="text-sm text-white/80">
                      Track progress, set goals, and support athlete growth
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-white/20 bg-white/10 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="mb-3 flex justify-center">
                      <div className="rounded-full bg-purple-500/20 p-3">
                        <BarChart3 className="h-6 w-6 text-purple-400" />
                      </div>
                    </div>
                    <h3 className="mb-2 font-semibold text-white">
                      Analytics & Insights
                    </h3>
                    <p className="text-sm text-white/80">
                      Make data-driven decisions with comprehensive reporting
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Organizations Section */}
            <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-2xl text-[#1E3A5F] tracking-tight">
                    Your Organizations
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    Manage your sports clubs and organizations
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={"/orgs/join"}>
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Join Organization
                    </Button>
                  </Link>
                  {user?.isPlatformStaff && (
                    <Link href="/orgs/create">
                      <Button className="bg-[#22c55e] hover:bg-[#16a34a]">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Organization
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Organizations Grid */}
              {loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="mb-2 h-8 w-8 rounded-lg" />
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-10 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : organizations && organizations.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {organizations.map((org: Organization) => (
                    <Card
                      className="group transition-all hover:shadow-lg"
                      key={org.id}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                              {org.logo ? (
                                <img
                                  alt={org.name}
                                  className="h-12 w-12 rounded-lg object-cover"
                                  src={org.logo}
                                />
                              ) : (
                                <Building2 className="h-6 w-6 text-primary" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <CardTitle className="truncate text-xl">
                                {org.name}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                <span className="font-mono text-xs">
                                  {org.slug}
                                </span>
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Button
                          asChild
                          className="w-full justify-between"
                          variant="outline"
                        >
                          <Link href={`/orgs/${org.id}/coach`}>
                            <span className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Coach Panel
                            </span>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          className="w-full justify-between"
                          variant="outline"
                        >
                          <Link href={`/orgs/${org.id}/admin`}>
                            <span className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Admin Panel
                            </span>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                        <div className="flex items-center justify-between pt-2 text-muted-foreground text-xs">
                          <span>
                            Created{" "}
                            {new Date(org.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 rounded-full bg-muted p-4">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="mb-2 font-semibold text-lg">
                      No Organizations Yet
                    </h3>
                    <p className="mb-6 max-w-sm text-muted-foreground">
                      {user?.isPlatformStaff
                        ? "Create your first organization to start managing your sports club or team"
                        : "You don't have access to any organizations yet. Join an existing organization or contact platform staff."}
                    </p>
                    <div className="flex gap-2">
                      <Link href="/orgs/join">
                        <Button variant="outline">
                          <Plus className="mr-2 h-4 w-4" />
                          Join Organization
                        </Button>
                      </Link>
                      {user?.isPlatformStaff && (
                        <Link href="/orgs/create">
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Your First Organization
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Join Request Status Section */}
              <JoinRequestSection
                onCancelRequest={handleCancelRequest}
                pendingRequests={(pendingRequests ?? []) as JoinRequest[]}
                rejectedRequests={(rejectedRequests ?? []) as JoinRequest[]}
              />
            </div>

            {/* All Platform Organizations - Only visible to platform staff */}
            {user?.isPlatformStaff && (
              <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-blue-100 p-2">
                      <Globe className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="font-bold text-2xl text-[#1E3A5F] tracking-tight">
                        All Platform Organizations
                      </h2>
                      <p className="mt-1 text-muted-foreground">
                        View and manage all organizations on the platform
                      </p>
                    </div>
                  </div>
                  {allOrganizations && (
                    <Badge className="text-sm" variant="secondary">
                      {allOrganizations.length} organization
                      {allOrganizations.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                {allOrganizations === undefined ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i}>
                        <CardHeader>
                          <Skeleton className="mb-2 h-10 w-10 rounded-lg" />
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-9 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : allOrganizations.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {allOrganizations.map((org) => {
                      // Check if current user is a member
                      const isMember = organizations?.some(
                        (userOrg: Organization) => userOrg.id === org._id
                      );
                      return (
                        <Card
                          className={`transition-all hover:shadow-md ${
                            isMember
                              ? "border-green-200 bg-green-50/30"
                              : "border-gray-200"
                          }`}
                          key={org._id}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                {org.logo ? (
                                  <img
                                    alt={org.name}
                                    className="h-10 w-10 rounded-lg object-cover"
                                    src={org.logo}
                                  />
                                ) : (
                                  <Building2 className="h-5 w-5 text-primary" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <CardTitle className="truncate text-base">
                                  {org.name}
                                </CardTitle>
                                <CardDescription className="mt-0.5 font-mono text-xs">
                                  {org.slug}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="mb-3 flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {org.memberCount} member
                                {org.memberCount !== 1 ? "s" : ""}
                              </span>
                              {isMember && (
                                <Badge
                                  className="border-green-300 bg-green-100 text-green-700"
                                  variant="outline"
                                >
                                  Member
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                asChild
                                className="flex-1"
                                size="sm"
                                variant="outline"
                              >
                                <Link href={`/orgs/${org._id}/admin`}>
                                  <Settings className="mr-1 h-3 w-3" />
                                  Admin
                                </Link>
                              </Button>
                              <Button
                                asChild
                                className="flex-1"
                                size="sm"
                                variant="outline"
                              >
                                <Link href={`/orgs/${org._id}/coach`}>
                                  Coach
                                </Link>
                              </Button>
                            </div>
                            <p className="mt-2 text-muted-foreground text-xs">
                              Created{" "}
                              {new Date(org.createdAt).toLocaleDateString()}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 rounded-full bg-muted p-4">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="mb-2 font-semibold text-lg">
                        No Organizations Yet
                      </h3>
                      <p className="mb-4 text-muted-foreground">
                        No organizations have been created on the platform.
                      </p>
                      <Link href="/orgs/create">
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Create First Organization
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Organization Deletion Requests - Only visible to platform staff */}
            {user?.isPlatformStaff &&
              pendingDeletionRequests &&
              pendingDeletionRequests.length > 0 && (
                <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-red-100 p-2">
                        <Trash2 className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <h2 className="font-bold text-2xl text-[#1E3A5F] tracking-tight">
                          Organization Deletion Requests
                        </h2>
                        <p className="mt-1 text-muted-foreground">
                          Review and approve or reject deletion requests
                        </p>
                      </div>
                    </div>
                    <Badge className="text-sm" variant="destructive">
                      {pendingDeletionRequests.length} pending
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {pendingDeletionRequests.map((request) => (
                      <Card
                        className="border-red-200 bg-red-50/30"
                        key={request._id}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-100">
                                {request.organizationLogo ? (
                                  <img
                                    alt={request.organizationName}
                                    className="h-12 w-12 rounded-lg object-cover"
                                    src={request.organizationLogo}
                                  />
                                ) : (
                                  <Building2 className="h-6 w-6 text-red-600" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-lg">
                                  {request.organizationName}
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                  Requested by {request.requestedByName} (
                                  {request.requestedByEmail})
                                </p>
                                <p className="mt-1 text-muted-foreground text-xs">
                                  {new Date(
                                    request.requestedAt
                                  ).toLocaleDateString()}{" "}
                                  at{" "}
                                  {new Date(
                                    request.requestedAt
                                  ).toLocaleTimeString()}
                                </p>

                                {/* Reason */}
                                <div className="mt-3 rounded-md bg-white p-3">
                                  <p className="font-medium text-sm">
                                    Reason for deletion:
                                  </p>
                                  <p className="mt-1 text-muted-foreground text-sm">
                                    {request.reason}
                                  </p>
                                </div>

                                {/* Data Summary */}
                                {request.dataSummary && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Badge variant="secondary">
                                      {request.dataSummary.memberCount} members
                                    </Badge>
                                    <Badge variant="secondary">
                                      {request.dataSummary.playerCount} players
                                    </Badge>
                                    <Badge variant="secondary">
                                      {request.dataSummary.teamCount} teams
                                    </Badge>
                                    <Badge variant="secondary">
                                      {request.dataSummary.coachCount} coaches
                                    </Badge>
                                    <Badge variant="secondary">
                                      {request.dataSummary.parentCount} parents
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex shrink-0 flex-col gap-2">
                              {showRejectDialog === request._id ? (
                                <div className="w-64 space-y-2">
                                  <textarea
                                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    onChange={(e) =>
                                      setRejectionReason(e.target.value)
                                    }
                                    placeholder="Reason for rejection..."
                                    value={rejectionReason}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      className="flex-1"
                                      disabled={
                                        processingDeletionId === request._id
                                      }
                                      onClick={() =>
                                        handleRejectDeletion(
                                          request._id,
                                          request.organizationName
                                        )
                                      }
                                      size="sm"
                                      variant="destructive"
                                    >
                                      {processingDeletionId === request._id
                                        ? "..."
                                        : "Confirm"}
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        setShowRejectDialog(null);
                                        setRejectionReason("");
                                      }}
                                      size="sm"
                                      variant="outline"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <Button
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={
                                      processingDeletionId === request._id
                                    }
                                    onClick={() =>
                                      handleApproveDeletion(
                                        request._id,
                                        request.organizationName
                                      )
                                    }
                                    size="sm"
                                  >
                                    {processingDeletionId === request._id ? (
                                      "Deleting..."
                                    ) : (
                                      <>
                                        <Check className="mr-1 h-4 w-4" />
                                        Approve & Delete
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    disabled={
                                      processingDeletionId === request._id
                                    }
                                    onClick={() =>
                                      setShowRejectDialog(request._id)
                                    }
                                    size="sm"
                                    variant="outline"
                                  >
                                    <X className="mr-1 h-4 w-4" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      </Authenticated>

      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center">
          <div className="space-y-4 text-center">
            <h1 className="font-bold text-2xl">Authentication Required</h1>
            <p className="text-muted-foreground">
              Please sign in to view your organizations.
            </p>
            <Button
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Sign In
            </Button>
          </div>
        </div>
      </Unauthenticated>

      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader />
        </div>
      </AuthLoading>
    </>
  );
}
