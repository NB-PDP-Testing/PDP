"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Building2, ChevronRight, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: string | null;
  createdAt: number | Date;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // Use Convex query to get user with custom fields
  const user = useCurrentUser();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load organizations
        const { data, error } = await authClient.organization.list();
        if (error) {
          console.error("Error loading organizations:", error);
        } else {
          setOrganizations(data || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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
                    <CardContent className="space-y-2">
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
                      : "You don't have access to any organizations yet. Contact platform staff to get started."}
                  </p>
                  {user?.isPlatformStaff && (
                    <Link href="/orgs/create">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Organization
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
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
