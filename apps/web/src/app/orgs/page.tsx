"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";

// Type for organization from better-auth
interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

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
  Search,
  Settings,
  Shield,
  ShieldCheck,
  ShieldX,
  Target,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";
import { SportsManagement } from "./sports-management";

// Platform Staff User type
interface PlatformUser {
  _id: string;
  name: string | null;
  email: string;
  isPlatformStaff: boolean;
  createdAt: number;
}

// Platform Staff Management Component
function PlatformStaffManagement({
  allUsers,
  currentUserEmail,
  onToggleStaff,
}: {
  allUsers: PlatformUser[] | undefined;
  currentUserEmail: string;
  onToggleStaff: (email: string, currentStatus: boolean) => Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("current");

  // Separate staff and non-staff users
  const { staffUsers, nonStaffUsers, stats } = useMemo(() => {
    if (!allUsers) {
      return {
        staffUsers: [],
        nonStaffUsers: [],
        stats: { total: 0, staff: 0 },
      };
    }

    const staff = allUsers.filter((u) => u.isPlatformStaff);
    const nonStaff = allUsers.filter((u) => !u.isPlatformStaff);

    return {
      staffUsers: staff,
      nonStaffUsers: nonStaff,
      stats: { total: allUsers.length, staff: staff.length },
    };
  }, [allUsers]);

  // Filter users based on search query
  const filteredNonStaffUsers = useMemo(() => {
    if (!searchQuery.trim()) return nonStaffUsers;

    const query = searchQuery.toLowerCase();
    return nonStaffUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    );
  }, [nonStaffUsers, searchQuery]);

  if (allUsers === undefined) {
    return (
      <div className="mt-8 rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-6">
          <Skeleton className="mb-2 h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-lg bg-white p-6 shadow-lg">
      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-2xl text-[#1E3A5F] tracking-tight">
              Platform Staff Management
            </h2>
            <p className="mt-2 text-muted-foreground">
              Manage platform-wide administrator permissions
            </p>
          </div>
          <div className="flex gap-4">
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full bg-purple-100 p-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-2xl text-purple-700">
                    {stats.staff}
                  </p>
                  <p className="text-purple-600 text-xs">Platform Staff</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-200 bg-gray-50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full bg-gray-100 p-2">
                  <Users className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-bold text-2xl text-gray-700">
                    {stats.total}
                  </p>
                  <p className="text-gray-600 text-xs">Total Users</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Tabs for Current Staff vs Add New */}
      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="mb-4">
          <TabsTrigger className="gap-2" value="current">
            <Shield className="h-4 w-4" />
            Current Staff ({staffUsers.length})
          </TabsTrigger>
          <TabsTrigger className="gap-2" value="add">
            <UserPlus className="h-4 w-4" />
            Add Staff
          </TabsTrigger>
        </TabsList>

        {/* Current Staff Tab */}
        <TabsContent value="current">
          {staffUsers.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {staffUsers.map((staffUser) => {
                const isCurrentUser = staffUser.email === currentUserEmail;
                return (
                  <Card
                    className="border-purple-200 bg-gradient-to-br from-purple-50 to-white"
                    key={staffUser._id}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                            <Shield className="h-6 w-6 text-purple-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">
                              {staffUser.name || "Unknown"}
                            </p>
                            <p className="truncate text-muted-foreground text-sm">
                              {staffUser.email}
                            </p>
                            {isCurrentUser && (
                              <Badge className="mt-1 text-xs" variant="outline">
                                You
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <Badge className="bg-purple-100 text-purple-700">
                          Platform Staff
                        </Badge>
                        <Button
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={isCurrentUser}
                          onClick={() => onToggleStaff(staffUser.email, true)}
                          size="sm"
                          title={
                            isCurrentUser
                              ? "You cannot remove your own staff access"
                              : "Remove staff access"
                          }
                          variant="ghost"
                        >
                          <ShieldX className="mr-1 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-purple-100 p-4">
                  <Shield className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">
                  No Platform Staff Yet
                </h3>
                <p className="mb-4 max-w-sm text-muted-foreground">
                  Add users as platform staff to give them administrative access
                  across the platform.
                </p>
                <Button onClick={() => setActiveTab("add")}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add First Staff Member
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Add Staff Tab */}
        <TabsContent value="add">
          {/* Search Input */}
          <div className="mb-4">
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name or email..."
                value={searchQuery}
              />
            </div>
            {searchQuery && (
              <p className="mt-2 text-muted-foreground text-sm">
                Found {filteredNonStaffUsers.length} user
                {filteredNonStaffUsers.length !== 1 ? "s" : ""} matching "
                {searchQuery}"
              </p>
            )}
          </div>

          {/* User List */}
          {filteredNonStaffUsers.length > 0 ? (
            <div className="space-y-2">
              {filteredNonStaffUsers.map((nonStaffUser) => (
                <Card className="hover:bg-gray-50" key={nonStaffUser._id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <Users className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {nonStaffUser.name || "Unknown"}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {nonStaffUser.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => onToggleStaff(nonStaffUser.email, false)}
                      size="sm"
                    >
                      <ShieldCheck className="mr-1 h-4 w-4" />
                      Grant Staff
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : nonStaffUsers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-green-100 p-4">
                  <ShieldCheck className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">
                  All Users Are Staff
                </h3>
                <p className="text-muted-foreground">
                  Every registered user already has platform staff permissions.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">No Results Found</h3>
                <p className="text-muted-foreground">
                  No users match your search "{searchQuery}"
                </p>
                <Button
                  className="mt-2"
                  onClick={() => setSearchQuery("")}
                  variant="ghost"
                >
                  Clear Search
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
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

  // Redirect if not platform staff
  useEffect(() => {
    if (user !== undefined && !user?.isPlatformStaff) {
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

  // Get all users for platform staff management (only if platform staff)
  const allUsers = useQuery(
    api.models.users.getAllUsers,
    user?.isPlatformStaff ? {} : "skip"
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

  const updatePlatformStaffStatus = useMutation(
    api.models.users.updatePlatformStaffStatus
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

  const handleTogglePlatformStaff = async (
    email: string,
    currentStatus: boolean
  ) => {
    try {
      await updatePlatformStaffStatus({
        email,
        isPlatformStaff: !currentStatus,
      });
      toast.success(
        `Platform staff status ${currentStatus ? "revoked" : "granted"}`
      );
    } catch (error: any) {
      console.error("Error updating platform staff status:", error);
      toast.error(error.message || "Failed to update platform staff status");
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

            {/* Platform Staff Management - Only visible to platform staff */}
            {user?.isPlatformStaff && (
              <PlatformStaffManagement
                allUsers={allUsers}
                currentUserEmail={user.email}
                onToggleStaff={handleTogglePlatformStaff}
              />
            )}

            {/* Sports & Skills Management - Only visible to platform staff */}
            {user?.isPlatformStaff && <SportsManagement />}
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
