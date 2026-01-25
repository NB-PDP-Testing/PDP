"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Clock,
  Mail,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  ShieldX,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function PlatformStaffManagementPage() {
  const user = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("current");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // Get all users for platform staff management
  const allUsers = useQuery(api.models.users.getAllUsers, {});
  const updatePlatformStaffStatus = useMutation(
    api.models.users.updatePlatformStaffStatus
  );

  // Invitation mutations and queries
  const pendingInvitations = useQuery(
    api.models.platformStaffInvitations.getPendingInvitations,
    {}
  );
  const createInvitation = useMutation(
    api.models.platformStaffInvitations.createInvitation
  );
  const cancelInvitation = useMutation(
    api.models.platformStaffInvitations.cancelInvitation
  );
  const resendInvitation = useMutation(
    api.models.platformStaffInvitations.resendInvitation
  );

  // Separate staff and non-staff users
  const { staffUsers, nonStaffUsers, stats } = useMemo(() => {
    if (!allUsers) {
      return {
        staffUsers: [],
        nonStaffUsers: [],
        stats: { total: 0, staff: 0 },
      };
    }

    const staff = allUsers.filter(
      (u: (typeof allUsers)[number]) => u.isPlatformStaff
    );
    const nonStaff = allUsers.filter(
      (u: (typeof allUsers)[number]) => !u.isPlatformStaff
    );

    return {
      staffUsers: staff,
      nonStaffUsers: nonStaff,
      stats: { total: allUsers.length, staff: staff.length },
    };
  }, [allUsers]);

  // Filter users based on search query
  const filteredNonStaffUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return nonStaffUsers;
    }

    const query = searchQuery.toLowerCase();
    return nonStaffUsers.filter(
      (u: (typeof nonStaffUsers)[number]) =>
        u.name?.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    );
  }, [nonStaffUsers, searchQuery]);

  // Count non-expired pending invitations
  const activePendingCount = useMemo(() => {
    if (!pendingInvitations) {
      return 0;
    }
    return pendingInvitations.filter(
      (inv: (typeof pendingInvitations)[number]) => !inv.isExpired
    ).length;
  }, [pendingInvitations]);

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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error updating platform staff status:", error);
      toast.error(errorMessage || "Failed to update platform staff status");
    }
  };

  const handleInviteByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(inviteEmail.trim() && user)) {
      return;
    }

    setIsInviting(true);
    try {
      const result = await createInvitation({
        email: inviteEmail.trim(),
        invitedByUserId: user._id,
        invitedByName: user.name ?? undefined,
        invitedByEmail: user.email ?? undefined,
      });

      if (result.success) {
        toast.success(result.message);
        setInviteEmail("");
      } else {
        toast.error(result.message);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error creating invitation:", error);
      toast.error(errorMessage || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!user) {
      return;
    }
    try {
      const result = await cancelInvitation({
        invitationId: invitationId as Parameters<
          typeof cancelInvitation
        >[0]["invitationId"],
        cancelledBy: user._id,
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error cancelling invitation:", error);
      toast.error(errorMessage || "Failed to cancel invitation");
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const result = await resendInvitation({
        invitationId: invitationId as Parameters<
          typeof resendInvitation
        >[0]["invitationId"],
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error resending invitation:", error);
      toast.error(errorMessage || "Failed to resend invitation");
    }
  };

  const formatTimeRemaining = (expiresAt: number) => {
    const now = Date.now();
    const diff = expiresAt - now;
    if (diff <= 0) {
      return "Expired";
    }

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    }
    return `${hours}h remaining`;
  };

  if (allUsers === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
          {/* Header with Stats */}
          <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/platform">
                <Button size="icon" variant="ghost">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-2xl text-[#1E3A5F] tracking-tight">
                  Platform Staff Management
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Manage platform-wide administrator permissions
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:shrink-0">
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

          {/* Tabs for Current Staff vs Add New vs Pending */}
          <Card>
            <CardContent className="p-6">
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
                  <TabsTrigger className="gap-2" value="pending">
                    <Clock className="h-4 w-4" />
                    Pending ({activePendingCount})
                  </TabsTrigger>
                </TabsList>

                {/* Current Staff Tab */}
                <TabsContent value="current">
                  {staffUsers.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {staffUsers.map(
                        (staffUser: (typeof staffUsers)[number]) => {
                          const isCurrentUser = staffUser.email === user?.email;
                          return (
                            <Card
                              className="border-purple-200 bg-gradient-to-br from-purple-50 to-white"
                              key={staffUser._id}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100">
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
                                      <Badge
                                        className="mt-1 text-xs"
                                        variant="outline"
                                      >
                                        You
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                                  <Badge className="bg-purple-100 text-purple-700">
                                    Platform Staff
                                  </Badge>
                                  <Button
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                    disabled={isCurrentUser}
                                    onClick={() =>
                                      handleTogglePlatformStaff(
                                        staffUser.email,
                                        true
                                      )
                                    }
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
                        }
                      )}
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
                          Add users as platform staff to give them
                          administrative access across the platform.
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
                  {/* Invite by Email Section */}
                  <Card className="mb-6 border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-900">
                          Invite by Email
                        </h3>
                      </div>
                      <p className="mb-4 text-blue-700 text-sm">
                        Invite someone who doesn't have an account yet. They'll
                        automatically become platform staff when they register.
                      </p>
                      <form
                        className="flex flex-col gap-3 sm:flex-row"
                        onSubmit={handleInviteByEmail}
                      >
                        <Input
                          className="flex-1 border-blue-200 bg-white"
                          disabled={isInviting}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="Enter email address..."
                          type="email"
                          value={inviteEmail}
                        />
                        <Button
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={!inviteEmail.trim() || isInviting}
                          type="submit"
                        >
                          {isInviting ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Invitation
                            </>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Search Existing Users */}
                  <div className="mb-4">
                    <h3 className="mb-2 font-semibold text-gray-700">
                      Or grant access to existing users
                    </h3>
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
                        {filteredNonStaffUsers.length !== 1 ? "s" : ""} matching
                        "{searchQuery}"
                      </p>
                    )}
                  </div>

                  {/* User List */}
                  {filteredNonStaffUsers.length > 0 ? (
                    <div className="space-y-2">
                      {filteredNonStaffUsers.map(
                        (
                          nonStaffUser: (typeof filteredNonStaffUsers)[number]
                        ) => (
                          <Card
                            className="hover:bg-gray-50"
                            key={nonStaffUser._id}
                          >
                            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                                  <Users className="h-5 w-5 text-gray-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium">
                                    {nonStaffUser.name || "Unknown"}
                                  </p>
                                  <p className="truncate text-muted-foreground text-sm">
                                    {nonStaffUser.email}
                                  </p>
                                </div>
                              </div>
                              <Button
                                className="w-full bg-purple-600 hover:bg-purple-700 sm:w-auto"
                                onClick={() =>
                                  handleTogglePlatformStaff(
                                    nonStaffUser.email,
                                    false
                                  )
                                }
                                size="sm"
                              >
                                <ShieldCheck className="mr-1 h-4 w-4" />
                                Grant Staff
                              </Button>
                            </CardContent>
                          </Card>
                        )
                      )}
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
                          Every registered user already has platform staff
                          permissions.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-4 rounded-full bg-muted p-4">
                          <Search className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="mb-2 font-semibold text-lg">
                          No Results Found
                        </h3>
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

                {/* Pending Invitations Tab */}
                <TabsContent value="pending">
                  {pendingInvitations === undefined ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : pendingInvitations.length > 0 ? (
                    <div className="space-y-2">
                      {pendingInvitations.map(
                        (invitation: (typeof pendingInvitations)[number]) => (
                          <Card
                            className={
                              invitation.isExpired
                                ? "border-red-200 bg-red-50"
                                : "border-yellow-200 bg-yellow-50"
                            }
                            key={invitation._id}
                          >
                            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                    invitation.isExpired
                                      ? "bg-red-100"
                                      : "bg-yellow-100"
                                  }`}
                                >
                                  <Mail
                                    className={`h-5 w-5 ${
                                      invitation.isExpired
                                        ? "text-red-600"
                                        : "text-yellow-600"
                                    }`}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium">
                                    {invitation.email}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 text-sm">
                                    {invitation.isExpired ? (
                                      <Badge
                                        className="bg-red-100 text-red-700"
                                        variant="outline"
                                      >
                                        Expired
                                      </Badge>
                                    ) : (
                                      <Badge
                                        className="bg-yellow-100 text-yellow-700"
                                        variant="outline"
                                      >
                                        <Clock className="mr-1 h-3 w-3" />
                                        {formatTimeRemaining(
                                          invitation.expiresAt
                                        )}
                                      </Badge>
                                    )}
                                    {invitation.invitedByName && (
                                      <span className="text-muted-foreground">
                                        Invited by {invitation.invitedByName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() =>
                                    handleResendInvitation(invitation._id)
                                  }
                                  size="sm"
                                  variant="outline"
                                >
                                  <RefreshCw className="mr-1 h-4 w-4" />
                                  {invitation.isExpired ? "Resend" : "Extend"}
                                </Button>
                                <Button
                                  className="text-red-600 hover:bg-red-100 hover:text-red-700"
                                  onClick={() =>
                                    handleCancelInvitation(invitation._id)
                                  }
                                  size="sm"
                                  variant="ghost"
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Cancel
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      )}
                    </div>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-4 rounded-full bg-muted p-4">
                          <Clock className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="mb-2 font-semibold text-lg">
                          No Pending Invitations
                        </h3>
                        <p className="mb-4 max-w-sm text-muted-foreground">
                          When you invite someone by email, their pending
                          invitation will appear here.
                        </p>
                        <Button onClick={() => setActiveTab("add")}>
                          <Mail className="mr-2 h-4 w-4" />
                          Send an Invitation
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
