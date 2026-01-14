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
  Building2,
  Check,
  ChevronRight,
  Globe,
  LayoutGrid,
  List,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { Route } from "next";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  // View mode and search state - load from localStorage
  const [yourOrgsView, setYourOrgsView] = useState<"cards" | "table">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("yourOrgsView");
      return (saved as "cards" | "table") || "cards";
    }
    return "cards";
  });
  const [platformOrgsView, setPlatformOrgsView] = useState<"cards" | "table">(
    () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("platformOrgsView");
        return (saved as "cards" | "table") || "cards";
      }
      return "cards";
    }
  );
  const [yourOrgsSearch, setYourOrgsSearch] = useState("");
  const [platformOrgsSearch, setPlatformOrgsSearch] = useState("");

  // Save view preferences to localStorage when they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("yourOrgsView", yourOrgsView);
    }
  }, [yourOrgsView]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("platformOrgsView", platformOrgsView);
    }
  }, [platformOrgsView]);

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

  // Get user memberships for role-based navigation
  const userMemberships = useQuery(
    api.models.members.getMembersForAllOrganizations
  );

  // Get pending deletion requests for platform staff
  const pendingDeletionRequests = useQuery(
    api.models.organizations.getPendingDeletionRequests,
    user?.isPlatformStaff ? {} : "skip"
  );

  // Filter your organizations based on search
  const filteredYourOrgs = yourOrgsSearch
    ? organizations?.filter(
        (org: Organization) =>
          org.name.toLowerCase().includes(yourOrgsSearch.toLowerCase()) ||
          org.slug.toLowerCase().includes(yourOrgsSearch.toLowerCase())
      )
    : organizations;

  // Filter platform organizations based on search
  const filteredPlatformOrgs = platformOrgsSearch
    ? allOrganizations?.filter(
        (org) =>
          org.name.toLowerCase().includes(platformOrgsSearch.toLowerCase()) ||
          org.slug.toLowerCase().includes(platformOrgsSearch.toLowerCase())
      )
    : allOrganizations;

  const approveDeletion = useMutation(
    api.models.organizations.approveDeletionRequest
  );
  const rejectDeletion = useMutation(
    api.models.organizations.rejectDeletionRequest
  );

  // Helper function to determine navigation path based on user's highest role
  const getOrgNavigationPath = (orgId: string): Route => {
    const membership = userMemberships?.find((m) => m.organizationId === orgId);

    if (!membership) {
      return `/orgs/${orgId}` as Route;
    }

    // Priority 1: Check Better Auth hierarchical role (owner/admin)
    if (
      membership.betterAuthRole === "owner" ||
      membership.betterAuthRole === "admin"
    ) {
      return `/orgs/${orgId}/admin` as Route;
    }

    // Priority 2: Check functional roles
    if (membership.functionalRoles.includes("admin")) {
      return `/orgs/${orgId}/admin` as Route;
    }

    if (membership.functionalRoles.includes("coach")) {
      return `/orgs/${orgId}/coach` as Route;
    }

    if (membership.functionalRoles.includes("parent")) {
      return `/orgs/${orgId}/parent` as Route;
    }

    // Default: org dashboard
    return `/orgs/${orgId}` as Route;
  };

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
      // biome-ignore lint/suspicious/noAlert: Critical confirmation for destructive action
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
            <div className="mb-6 text-center text-white sm:mb-12">
              <div className="mb-3 flex justify-center sm:mb-6">
                <div className="relative h-16 w-16 sm:h-24 sm:w-24">
                  <Image
                    alt="PlayerARC Logo"
                    className="object-contain drop-shadow-lg"
                    fill
                    priority
                    sizes="(max-width: 640px) 64px, 96px"
                    src="/logos-landing/PDP-Logo-OffWhiteOrbit_GreenHuman.png"
                  />
                </div>
              </div>
              <h1 className="mb-2 font-bold text-3xl tracking-tight sm:mb-4 sm:text-5xl">
                Welcome to PlayerARC
              </h1>
              <p className="mx-auto mb-4 max-w-2xl text-base text-white/90 sm:mb-8 sm:text-xl">
                <span className="hidden sm:block">
                  Your comprehensive platform for managing youth sports
                  development. Connect coaches, parents, and players in one
                  unified ecosystem.
                </span>
                <span className="block sm:hidden">
                  Manage your sports clubs, teams, and player development.
                </span>
              </p>
            </div>

            {/* Organizations Section */}
            <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
              {/* Header and Actions */}
              <div className="mb-6 flex flex-col gap-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-purple-100 p-2">
                      <Building2 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-2xl text-[#1E3A5F] tracking-tight">
                        Your Organisations
                      </h2>
                      <p className="mt-1 text-muted-foreground text-sm">
                        Manage your sports clubs and organisations
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <Link className="w-full sm:w-auto" href={"/orgs/join"}>
                      <Button className="w-full sm:w-auto" variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Join Organisation
                      </Button>
                    </Link>
                    {user?.isPlatformStaff && (
                      <Link className="w-full sm:w-auto" href="/orgs/create">
                        <Button className="w-full bg-[#22c55e] hover:bg-[#16a34a] sm:w-auto">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Organisation
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Search and View Toggle */}
              <div className="mb-4 flex items-center gap-3">
                <div className="relative max-w-sm flex-1">
                  <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    onChange={(e) => setYourOrgsSearch(e.target.value)}
                    placeholder="Search your organisations..."
                    type="search"
                    value={yourOrgsSearch}
                  />
                </div>
                <div className="inline-flex rounded-md border">
                  <Button
                    className="rounded-r-none"
                    onClick={() => setYourOrgsView("cards")}
                    size="sm"
                    variant={yourOrgsView === "cards" ? "default" : "ghost"}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    className="rounded-l-none"
                    onClick={() => setYourOrgsView("table")}
                    size="sm"
                    variant={yourOrgsView === "table" ? "default" : "ghost"}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Organizations Grid/Table */}
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
              ) : filteredYourOrgs && filteredYourOrgs.length > 0 ? (
                yourOrgsView === "cards" ? (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredYourOrgs.map((org: Organization) => (
                      <Card
                        className="group cursor-pointer transition-all hover:shadow-lg"
                        key={org.id}
                        onClick={() => {
                          router.push(getOrgNavigationPath(org.id));
                        }}
                      >
                        <CardHeader>
                          <div className="flex min-w-0 items-start justify-between">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
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
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <CardTitle className="truncate text-xl">
                                  {org.name}
                                </CardTitle>
                                <CardDescription className="mt-1 truncate">
                                  <span className="font-mono text-xs">
                                    {org.slug}
                                  </span>
                                </CardDescription>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent
                          className="space-y-4"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Organization</TableHead>
                          <TableHead className="hidden md:table-cell">
                            Slug
                          </TableHead>
                          <TableHead className="hidden lg:table-cell">
                            Created
                          </TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredYourOrgs.map((org: Organization) => (
                          <TableRow
                            className="cursor-pointer"
                            key={org.id}
                            onClick={() => {
                              router.push(getOrgNavigationPath(org.id));
                            }}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-10 sm:w-10">
                                  {org.logo ? (
                                    <img
                                      alt={org.name}
                                      className="h-8 w-8 rounded-lg object-cover sm:h-10 sm:w-10"
                                      src={org.logo}
                                    />
                                  ) : (
                                    <Building2 className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium text-sm">
                                    {org.name}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <code className="text-xs">{org.slug}</code>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {new Date(org.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {/* Desktop: side-by-side buttons */}
                              {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation container only */}
                              {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation container only */}
                              {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: stopPropagation container only */}
                              <div
                                className="hidden justify-end gap-2 sm:flex"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button asChild size="sm" variant="outline">
                                  <Link href={`/orgs/${org.id}/coach`}>
                                    Coach
                                  </Link>
                                </Button>
                                <Button asChild size="sm" variant="outline">
                                  <Link href={`/orgs/${org.id}/admin`}>
                                    Admin
                                  </Link>
                                </Button>
                              </div>
                              {/* Mobile: stacked buttons */}
                              {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation container only */}
                              {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation container only */}
                              {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: stopPropagation container only */}
                              <div
                                className="flex flex-col gap-1.5 sm:hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  asChild
                                  className="h-8 w-full"
                                  size="sm"
                                  variant="outline"
                                >
                                  <Link href={`/orgs/${org.id}/coach`}>
                                    <Users className="mr-1 h-3 w-3" />
                                    Coach
                                  </Link>
                                </Button>
                                <Button
                                  asChild
                                  className="h-8 w-full"
                                  size="sm"
                                  variant="outline"
                                >
                                  <Link href={`/orgs/${org.id}/admin`}>
                                    <Settings className="mr-1 h-3 w-3" />
                                    Admin
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 rounded-full bg-muted p-4">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="mb-2 font-semibold text-lg">
                      No Organisations Yet
                    </h3>
                    <p className="mb-6 max-w-sm text-muted-foreground">
                      {user?.isPlatformStaff
                        ? "Create your first organisation to start managing your sports club or team"
                        : "You don't have access to any organisations yet. Join an existing organisation or contact platform staff."}
                    </p>
                    <div className="flex gap-2">
                      <Link href="/orgs/join">
                        <Button variant="outline">
                          <Plus className="mr-2 h-4 w-4" />
                          Join Organisation
                        </Button>
                      </Link>
                      {user?.isPlatformStaff && (
                        <Link href="/orgs/create">
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Your First Organisation
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
                <div className="mb-6 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-blue-100 p-2">
                      <Globe className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-2xl text-[#1E3A5F] tracking-tight">
                            All Platform Organisations
                          </h2>
                          {allOrganizations && (
                            <Badge className="text-sm" variant="secondary">
                              {allOrganizations.length} Org
                              {allOrganizations.length !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-muted-foreground text-sm">
                          View and manage all organisations on the platform
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Search and View Toggle */}
                  <div className="flex items-center gap-3">
                    <div className="relative max-w-sm flex-1">
                      <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        onChange={(e) => setPlatformOrgsSearch(e.target.value)}
                        placeholder="Search organisations..."
                        type="search"
                        value={platformOrgsSearch}
                      />
                    </div>
                    <div className="inline-flex rounded-md border">
                      <Button
                        className="rounded-r-none"
                        onClick={() => setPlatformOrgsView("cards")}
                        size="sm"
                        variant={
                          platformOrgsView === "cards" ? "default" : "ghost"
                        }
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        className="rounded-l-none"
                        onClick={() => setPlatformOrgsView("table")}
                        size="sm"
                        variant={
                          platformOrgsView === "table" ? "default" : "ghost"
                        }
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
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
                ) : filteredPlatformOrgs && filteredPlatformOrgs.length > 0 ? (
                  platformOrgsView === "cards" ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredPlatformOrgs.map((org) => {
                        // Check if current user is a member
                        const isMember = organizations?.some(
                          (userOrg: Organization) => userOrg.id === org._id
                        );
                        return (
                          <Card
                            className={`transition-all hover:shadow-md ${
                              isMember
                                ? "cursor-pointer border-green-200 bg-green-50/30"
                                : "border-gray-200"
                            }`}
                            key={org._id}
                            onClick={() => {
                              if (isMember) {
                                router.push(getOrgNavigationPath(org._id));
                              }
                            }}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex min-w-0 items-start gap-3">
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
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  <CardTitle className="truncate text-base">
                                    {org.name}
                                  </CardTitle>
                                  <CardDescription className="mt-0.5 truncate font-mono text-xs">
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
                              {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation container only */}
                              {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation container only */}
                              {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: stopPropagation container only */}
                              <div
                                className="flex gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
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
                    <div className="space-y-3">
                      <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Organization</TableHead>
                              <TableHead className="hidden md:table-cell">
                                Slug
                              </TableHead>
                              <TableHead className="hidden sm:table-cell">
                                Members
                              </TableHead>
                              <TableHead className="hidden lg:table-cell">
                                Created
                              </TableHead>
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPlatformOrgs.map((org) => {
                              const isMember = organizations?.some(
                                (userOrg: Organization) =>
                                  userOrg.id === org._id
                              );
                              return (
                                <TableRow
                                  className={
                                    isMember
                                      ? "cursor-pointer bg-green-50/50"
                                      : undefined
                                  }
                                  key={org._id}
                                  onClick={() => {
                                    if (isMember) {
                                      router.push(
                                        getOrgNavigationPath(org._id)
                                      );
                                    }
                                  }}
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                        {org.logo ? (
                                          <img
                                            alt={org.name}
                                            className="h-8 w-8 rounded-lg object-cover"
                                            src={org.logo}
                                          />
                                        ) : (
                                          <Building2 className="h-4 w-4 text-primary" />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div>
                                          <div className="truncate font-medium text-sm">
                                            {org.name}
                                          </div>
                                          {isMember && (
                                            <Badge
                                              className="mt-0.5 border-green-300 bg-green-100 text-green-700 text-xs"
                                              variant="outline"
                                            >
                                              Member
                                            </Badge>
                                          )}
                                        </div>
                                        {/* Show meta info on mobile */}
                                        <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs sm:hidden">
                                          <span className="flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {org.memberCount}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    <code className="text-xs">{org.slug}</code>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    <span className="flex items-center gap-1 text-sm">
                                      <Users className="h-3 w-3" />
                                      {org.memberCount}
                                    </span>
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell">
                                    <span className="text-sm">
                                      {new Date(
                                        org.createdAt
                                      ).toLocaleDateString()}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {/* Desktop: side-by-side buttons */}
                                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation container only */}
                                    {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation container only */}
                                    {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: stopPropagation container only */}
                                    <div
                                      className="hidden justify-end gap-2 sm:flex"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Button
                                        asChild
                                        size="sm"
                                        variant="outline"
                                      >
                                        <Link href={`/orgs/${org._id}/coach`}>
                                          Coach
                                        </Link>
                                      </Button>
                                      <Button
                                        asChild
                                        size="sm"
                                        variant="outline"
                                      >
                                        <Link href={`/orgs/${org._id}/admin`}>
                                          Admin
                                        </Link>
                                      </Button>
                                    </div>
                                    {/* Mobile: stacked buttons */}
                                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation container only */}
                                    {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation container only */}
                                    {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: stopPropagation container only */}
                                    <div
                                      className="flex flex-col gap-1.5 sm:hidden"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Button
                                        asChild
                                        className="h-8 w-full"
                                        size="sm"
                                        variant="outline"
                                      >
                                        <Link href={`/orgs/${org._id}/coach`}>
                                          <Users className="mr-1 h-3 w-3" />
                                          Coach
                                        </Link>
                                      </Button>
                                      <Button
                                        asChild
                                        className="h-8 w-full"
                                        size="sm"
                                        variant="outline"
                                      >
                                        <Link href={`/orgs/${org._id}/admin`}>
                                          <Settings className="mr-1 h-3 w-3" />
                                          Admin
                                        </Link>
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      {/* Table Legend */}
                      <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50/30 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded bg-green-200" />
                          <span className="text-muted-foreground text-xs">
                            Green highlight indicates organisations you're a
                            member of
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 rounded-full bg-muted p-4">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="mb-2 font-semibold text-lg">
                        No Organisations Yet
                      </h3>
                      <p className="mb-4 text-muted-foreground">
                        No organisations have been created on the platform.
                      </p>
                      <Link href="/orgs/create">
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Create First Organisation
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
