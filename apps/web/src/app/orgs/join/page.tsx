"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Building2, ChevronRight, Search, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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
  // const { user } = useCurrentUser();
  const [searchTerm, setSearchTerm] = useState("");

  const organizations = useQuery(
    api.models.orgJoinRequests.getAllOrganizations
  );
  const userPendingRequests = useQuery(
    api.models.orgJoinRequests.getUserPendingRequests
  );

  const isLoading =
    organizations === undefined || userPendingRequests === undefined;

  // Get IDs of orgs user has pending requests for
  const pendingOrgIds = new Set(
    userPendingRequests?.map((req) => req.organizationId) || []
  );

  // Filter organizations
  const filteredOrgs = organizations?.filter((org: { name: string }) => {
    if (!searchTerm) {
      return true;
    }
    return org.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl tracking-tight">
          Join an Organization
        </h1>
        <p className="mt-2 text-muted-foreground">
          Select an organization to request to join
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
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
            (org: { _id: string; name: string; logo?: string | null }) => (
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
              <h3 className="font-semibold text-lg">No Organizations Found</h3>
              <p className="mt-1 text-muted-foreground">
                {searchTerm
                  ? "No organizations match your search"
                  : "There are no organizations available to join"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Back Link */}
      <div className="pt-4">
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href="/orgs"
        >
          ← Back to organizations
        </Link>
      </div>
    </div>
  );
}
