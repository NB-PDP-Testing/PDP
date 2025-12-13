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
  ChevronRight,
  Clock,
  Plus,
  Settings,
  Target,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
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

export default function OrganizationsPage() {
  const router = useRouter();
  const { data: organizations, isPending: loading } =
    authClient.useListOrganizations();

  // Use Convex query to get user with custom fields
  const user = useCurrentUser();

  // Redirect if not platform staff
  useEffect(() => {
    if (user !== undefined && !user?.isPlatformStaff) {
      toast.error("Only platform staff can access this page");
      router.push("/");
    }
  }, [user, router]);

  // Get pending join requests
  const pendingRequests = useQuery(
    api.models.orgJoinRequests.getUserPendingRequests
  );
  const cancelRequest = useMutation(
    api.models.orgJoinRequests.cancelJoinRequest
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
                  {organizations.map((org) => (
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

              {/* Pending Membership Requests */}
              {pendingRequests && pendingRequests.length > 0 && (
                <div className="mt-8">
                  <h2 className="mb-4 font-semibold text-[#1E3A5F] text-xl">
                    Pending Membership
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pendingRequests.map((request) => (
                      <Card key={request._id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                                <Clock className="h-5 w-5 text-yellow-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <CardTitle className="truncate text-base">
                                  {request.organizationName}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  <Badge
                                    className="capitalize"
                                    variant="secondary"
                                  >
                                    {request.requestedRole}
                                  </Badge>
                                </CardDescription>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleCancelRequest(request._id)}
                              size="icon"
                              variant="ghost"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-muted-foreground text-xs">
                            Requested{" "}
                            {new Date(request.requestedAt).toLocaleDateString()}
                          </div>
                          {request.message && (
                            <p className="mt-2 text-muted-foreground text-sm">
                              {request.message}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
