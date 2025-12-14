"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Building2, ChevronRight, Info, Search, Users } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

function OrganizationCard({
  org,
  hasPendingRequest,
}: {
  org: { _id: string; name: string; logo?: string | null };
  hasPendingRequest: boolean;
}) {
  const href = hasPendingRequest ? "#" : `/orgs/join/${org._id}`;

  return (
    <Link href={href as Route} key={org._id}>
      <Card
        className={
          hasPendingRequest
            ? "opacity-60"
            : "cursor-pointer transition-all hover:shadow-md"
        }
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                {org.logo ? (
                  <img
                    alt={org.name}
                    className="h-12 w-12 rounded-full object-cover"
                    src={org.logo}
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">{org.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  {hasPendingRequest ? (
                    <span className="text-yellow-600">Request Pending</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Click to request to join
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            {!hasPendingRequest && (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

export default function JoinOrganizationPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  // Check for pending invitation in sessionStorage (from OAuth flow)
  // This MUST run synchronously before any other logic
  useEffect(() => {
    const pendingInvitationId = sessionStorage.getItem("pendingInvitationId");
    if (pendingInvitationId) {
      console.log("[Join] Found pending invitation:", pendingInvitationId);
      // Clear it from sessionStorage immediately
      sessionStorage.removeItem("pendingInvitationId");
      // Redirect to invitation acceptance page immediately
      router.replace(`/orgs/accept-invitation/${pendingInvitationId}` as Route);
      return;
    }
  }, [router]);

  const organizations = useQuery(
    api.models.orgJoinRequests.getAllOrganizations
  );
  const userPendingRequests = useQuery(
    api.models.orgJoinRequests.getUserPendingRequests
  );
  const { data: userOrganizations } = authClient.useListOrganizations();

  const isLoading =
    organizations === undefined || userPendingRequests === undefined;

  // Get IDs of orgs user has pending requests for
  const pendingOrgIds = new Set(
    userPendingRequests?.map((req) => req.organizationId) || []
  );

  // Check if this is a first-time user (no orgs, no pending requests)
  const isFirstTimeUser =
    (!userOrganizations || userOrganizations.length === 0) &&
    (!userPendingRequests || userPendingRequests.length === 0);

  // Filter organizations
  const filteredOrgs = organizations?.filter((org: { name: string }) => {
    if (!searchTerm) {
      return true;
    }
    return org.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        {/* PlayerARC Welcome Section */}
        <div className="mb-8 text-center text-white">
          <div className="mb-4 flex justify-center">
            <div className="relative h-16 w-16 sm:h-20 sm:w-20">
              <Image
                alt="PlayerARC Logo"
                className="object-contain drop-shadow-lg"
                fill
                priority
                sizes="(max-width: 640px) 64px, 80px"
                src="/logos-landing/PDP-Logo-OffWhiteOrbit_GreenHuman.png"
              />
            </div>
          </div>
          <h1 className="mb-2 font-bold text-3xl tracking-tight sm:text-4xl">
            Join an Organization
          </h1>
          <p className="mx-auto max-w-2xl text-base text-white/90 sm:text-lg">
            Find and request to join a sports club or organization on PlayerARC
          </p>
        </div>

        {/* Back Link - Only show if user has organizations */}
        {userOrganizations && userOrganizations.length > 0 && (
          <div className="mb-6">
            <Link
              className="flex items-center gap-1 text-sm text-white/80 hover:text-white"
              href="/orgs"
            >
              ← Back to organizations
            </Link>
          </div>
        )}

        {/* Welcome Message for First-Time Users */}
        {isFirstTimeUser && !isLoading && (
          <Alert className="mb-6 border-[#22c55e]/30 bg-[#22c55e]/10">
            <Info className="h-4 w-4 text-[#22c55e]" />
            <AlertDescription className="text-[#1E3A5F]">
              <p className="font-semibold">Welcome to PlayerARC! 🎉</p>
              <p className="mt-1 text-sm">
                You're all set up. Browse the organizations below and request to
                join one to get started. Once approved, you'll have access to
                your organization's dashboard.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1E3A5F]/10">
                <Users className="h-6 w-6 text-[#1E3A5F]" />
              </div>
              <div>
                <CardTitle className="text-2xl text-[#1E3A5F]">
                  Available Organizations
                </CardTitle>
                <CardDescription>
                  Search and select an organization to request to join
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search organizations..."
                value={searchTerm}
              />
            </div>

            {/* Organizations List */}
            <div className="space-y-4">
              {isLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              ) : filteredOrgs && filteredOrgs.length > 0 ? (
                filteredOrgs.map(
                  (org: {
                    _id: string;
                    name: string;
                    logo?: string | null;
                  }) => (
                    <OrganizationCard
                      hasPendingRequest={pendingOrgIds.has(org._id)}
                      key={org._id}
                      org={org}
                    />
                  )
                )
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">
                      No Organizations Found
                    </h3>
                    <p className="mt-1 text-muted-foreground">
                      {searchTerm
                        ? "No organizations match your search"
                        : "There are no organizations available to join"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
