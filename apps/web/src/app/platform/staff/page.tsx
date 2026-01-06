"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Search,
  Shield,
  ShieldCheck,
  ShieldX,
  UserPlus,
  Users,
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

// Platform Staff User type
interface PlatformUser {
  _id: string;
  name: string | null;
  email: string;
  isPlatformStaff: boolean;
  createdAt: number;
}

export default function PlatformStaffManagementPage() {
  const user = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("current");

  // Get all users for platform staff management
  const allUsers = useQuery(api.models.users.getAllUsers, {});
  const updatePlatformStaffStatus = useMutation(
    api.models.users.updatePlatformStaffStatus
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
    if (!searchQuery.trim()) return nonStaffUsers;

    const query = searchQuery.toLowerCase();
    return nonStaffUsers.filter(
      (u: (typeof nonStaffUsers)[number]) =>
        u.name?.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    );
  }, [nonStaffUsers, searchQuery]);

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
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/platform">
                <Button size="icon" variant="ghost">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="font-bold text-2xl text-[#1E3A5F] tracking-tight">
                  Platform Staff Management
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Manage platform-wide administrator permissions
                </p>
              </div>
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

          {/* Tabs for Current Staff vs Add New */}
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
                                        <Badge
                                          className="mt-1 text-xs"
                                          variant="outline"
                                        >
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
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
