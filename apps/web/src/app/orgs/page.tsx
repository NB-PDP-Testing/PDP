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
  Badge,
  Building2,
  ChevronRight,
  Clock,
  Plus,
  Settings,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";

type Organization = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: string | null;
  createdAt: number | Date;
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // Use Convex query to get user with custom fields
  const user = useCurrentUser();

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

  useEffect(() => {
    // Only load organizations if user is authenticated
    if (!user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        // Load organizations
        const { data, error } = await authClient.organization.list();
        if (error) {
          console.error("Error loading organizations:", error);
          toast.error("Failed to load organizations");
        } else {
          setOrganizations(data || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load organizations");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  return (
    <>
      <Authenticated>
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-bold text-3xl tracking-tight">
                    Your Organizations
                  </h1>
                  <p className="mt-2 text-muted-foreground">
                    Manage your sports clubs and organizations
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={"/orgs/join" as Route}>
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Join Organization
                    </Button>
                  </Link>
                  {user?.isPlatformStaff && (
                    <Link href="/orgs/create">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Organization
                      </Button>
                    </Link>
                  )}
                </div>
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
            ) : organizations.length > 0 ? (
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
                      <Link href={`/orgs/${org.id}/coach` as Route}>
                        <Button
                          className="w-full justify-between"
                          variant="outline"
                        >
                          <span className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Coach Dashboard
                          </span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/orgs/${org.id}/admin`}>
                        <Button
                          className="w-full justify-between"
                          variant="outline"
                        >
                          <span className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Admin Panel
                          </span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <div className="flex items-center justify-between pt-2 text-muted-foreground text-xs">
                        <span>
                          Created {new Date(org.createdAt).toLocaleDateString()}
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
                <h2 className="mb-4 font-semibold text-xl">
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
