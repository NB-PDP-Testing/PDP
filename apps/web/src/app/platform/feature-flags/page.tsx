"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CheckCircle2,
  Flag,
  Search,
  Shield,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FilterType =
  | "all"
  | "gates-disabled"
  | "admin-override"
  | "has-requests"
  | "has-issues"
  | "recently-changed";

type OrgStatus = {
  orgId: string;
  orgName: string;
  gatesEnabled: boolean;
  allowAdminDelegation: boolean;
  allowCoachOverrides: boolean;
  adminOverride?: boolean;
  overridesCount: number;
  pendingRequestsCount: number;
  lastChangedBy?: string;
  lastChangedAt?: number;
};

function OrganizationTableRow({
  org,
  onToggleGates,
  onToggleAdminDelegation,
  onToggleCoachOverrides,
}: {
  org: OrgStatus;
  onToggleGates: (orgId: string, currentValue: boolean) => void;
  onToggleAdminDelegation: (orgId: string, currentValue: boolean) => void;
  onToggleCoachOverrides: (orgId: string, currentValue: boolean) => void;
}) {
  return (
    <TableRow key={org.orgId}>
      <TableCell className="font-medium">{org.orgName}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch
            checked={org.gatesEnabled}
            onCheckedChange={() => {
              onToggleGates(org.orgId, org.gatesEnabled);
            }}
          />
          <Badge variant={org.gatesEnabled ? "default" : "destructive"}>
            {org.gatesEnabled ? (
              <CheckCircle2 className="mr-1 h-3 w-3" />
            ) : (
              <XCircle className="mr-1 h-3 w-3" />
            )}
            {org.gatesEnabled ? "ON" : "OFF"}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <Switch
          checked={org.allowAdminDelegation}
          onCheckedChange={() => {
            onToggleAdminDelegation(org.orgId, org.allowAdminDelegation);
          }}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={org.allowCoachOverrides}
          onCheckedChange={() => {
            onToggleCoachOverrides(org.orgId, org.allowCoachOverrides);
          }}
        />
      </TableCell>
      <TableCell>
        {org.adminOverride !== undefined ? (
          <Badge variant="secondary">{org.adminOverride ? "ON" : "OFF"}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">None</span>
        )}
      </TableCell>
      <TableCell>
        {org.overridesCount > 0 ? (
          <Badge variant="outline">{org.overridesCount}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">None</span>
        )}
      </TableCell>
      <TableCell>
        {org.pendingRequestsCount > 0 ? (
          <Badge variant="outline">{org.pendingRequestsCount}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">None</span>
        )}
      </TableCell>
    </TableRow>
  );
}

function applyOrgFilters(
  orgs: OrgStatus[],
  filterType: FilterType,
  searchQuery: string
): OrgStatus[] {
  let filtered = orgs;

  // Apply filter
  if (filterType === "gates-disabled") {
    filtered = filtered.filter((org) => !org.gatesEnabled);
  } else if (filterType === "admin-override") {
    filtered = filtered.filter((org) => org.adminOverride !== undefined);
  } else if (filterType === "has-requests") {
    filtered = filtered.filter((org) => org.pendingRequestsCount > 0);
  } else if (filterType === "has-issues") {
    filtered = filtered.filter(
      (org) =>
        !org.gatesEnabled ||
        org.adminOverride !== undefined ||
        org.pendingRequestsCount > 0
    );
  } else if (filterType === "recently-changed") {
    filtered = [...filtered].sort((a, b) => {
      const aTime = a.lastChangedAt ?? 0;
      const bTime = b.lastChangedAt ?? 0;
      return bTime - aTime;
    });
  }

  // Apply search
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((org) =>
      org.orgName.toLowerCase().includes(query)
    );
  }

  return filtered;
}

export default function FeatureFlagsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Query all organizations' feature flag status
  const orgsStatus = useQuery(
    api.models.trustGatePermissions.getAllOrgsFeatureFlagStatus,
    {}
  );

  // Mutations
  const setPlatformFeatureFlags = useMutation(
    api.models.trustGatePermissions.setPlatformFeatureFlags
  );
  const setOrgTrustGatesEnabled = useMutation(
    api.models.trustGatePermissions.setOrgTrustGatesEnabled
  );

  // Calculate overview metrics
  const metrics = useMemo(() => {
    if (!orgsStatus) {
      return {
        totalOrgs: 0,
        gatesDisabled: 0,
        adminOverrides: 0,
        pendingRequests: 0,
      };
    }

    return {
      totalOrgs: orgsStatus.length,
      gatesDisabled: orgsStatus.filter((org) => !org.gatesEnabled).length,
      adminOverrides: orgsStatus.filter(
        (org) => org.adminOverride !== undefined
      ).length,
      pendingRequests: orgsStatus.reduce(
        (sum, org) => sum + org.pendingRequestsCount,
        0
      ),
    };
  }, [orgsStatus]);

  // Filter and search organizations
  const filteredOrgs = useMemo(() => {
    if (!orgsStatus) {
      return [];
    }
    return applyOrgFilters(orgsStatus, filterType, searchQuery);
  }, [orgsStatus, filterType, searchQuery]);

  const handleToggleGates = useCallback(
    async (orgId: string, currentValue: boolean) => {
      try {
        await setOrgTrustGatesEnabled({
          organizationId: orgId,
          enabled: !currentValue,
        });
        toast.success(
          `Trust gates ${currentValue ? "disabled" : "enabled"} successfully`
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Error toggling trust gates:", error);
        toast.error(errorMessage || "Failed to toggle trust gates");
      }
    },
    [setOrgTrustGatesEnabled]
  );

  const handleToggleAdminDelegation = useCallback(
    async (orgId: string, currentValue: boolean) => {
      try {
        await setPlatformFeatureFlags({
          organizationId: orgId,
          allowAdminDelegation: !currentValue,
        });
        toast.success(
          `Admin delegation ${currentValue ? "disabled" : "enabled"} successfully`
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Error toggling admin delegation:", error);
        toast.error(errorMessage || "Failed to toggle admin delegation");
      }
    },
    [setPlatformFeatureFlags]
  );

  const handleToggleCoachOverrides = useCallback(
    async (orgId: string, currentValue: boolean) => {
      try {
        await setPlatformFeatureFlags({
          organizationId: orgId,
          allowCoachOverrides: !currentValue,
        });
        toast.success(
          `Coach overrides ${currentValue ? "disabled" : "enabled"} successfully`
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Error toggling coach overrides:", error);
        toast.error(errorMessage || "Failed to toggle coach overrides");
      }
    },
    [setPlatformFeatureFlags]
  );

  const isLoading = orgsStatus === undefined;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Link href="/platform">
            <Button className="mb-4" size="sm" variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Platform
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-3">
              <Flag className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <h1 className="font-bold text-3xl tracking-tight">
                Voice Notes Feature Flags
              </h1>
              <p className="text-muted-foreground">
                Manage trust gate settings across all organizations
              </p>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Total Organizations
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="font-bold text-2xl">{metrics.totalOrgs}</div>
                  <p className="text-muted-foreground text-xs">
                    Active organizations
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Gates Disabled
              </CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-2xl">
                      {metrics.gatesDisabled}
                    </div>
                    {metrics.totalOrgs > 0 &&
                      (metrics.gatesDisabled / metrics.totalOrgs) * 100 >
                        20 && (
                        <Badge
                          className="bg-red-100 text-red-700"
                          variant="outline"
                        >
                          High
                        </Badge>
                      )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {metrics.totalOrgs > 0
                      ? `${Math.round((metrics.gatesDisabled / metrics.totalOrgs) * 100)}% of orgs`
                      : "No organizations"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Admin Overrides Active
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="font-bold text-2xl">
                    {metrics.adminOverrides}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {metrics.totalOrgs > 0
                      ? `${Math.round((metrics.adminOverrides / metrics.totalOrgs) * 100)}% of orgs`
                      : "No organizations"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Pending Requests
              </CardTitle>
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-2xl">
                      {metrics.pendingRequests}
                    </div>
                    {metrics.pendingRequests > 0 && (
                      <Badge
                        className="bg-orange-100 text-orange-700"
                        variant="outline"
                      >
                        Action Needed
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {metrics.pendingRequests > 0 ? (
                      <button
                        className="cursor-pointer text-primary underline hover:text-primary/80"
                        onClick={() => {
                          setFilterType("has-requests");
                        }}
                        type="button"
                      >
                        Review Requests
                      </button>
                    ) : (
                      "No pending requests"
                    )}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setFilterType("all");
                  }}
                  size="sm"
                  variant={filterType === "all" ? "default" : "outline"}
                >
                  Show All
                </Button>
                <Button
                  onClick={() => {
                    setFilterType("gates-disabled");
                  }}
                  size="sm"
                  variant={
                    filterType === "gates-disabled" ? "default" : "outline"
                  }
                >
                  Gates Disabled
                </Button>
                <Button
                  onClick={() => {
                    setFilterType("admin-override");
                  }}
                  size="sm"
                  variant={
                    filterType === "admin-override" ? "default" : "outline"
                  }
                >
                  Admin Override
                </Button>
                <Button
                  onClick={() => {
                    setFilterType("has-requests");
                  }}
                  size="sm"
                  variant={
                    filterType === "has-requests" ? "default" : "outline"
                  }
                >
                  Has Requests
                </Button>
                <Button
                  onClick={() => {
                    setFilterType("has-issues");
                  }}
                  size="sm"
                  variant={filterType === "has-issues" ? "default" : "outline"}
                >
                  Show Orgs with Issues
                </Button>
                <Button
                  onClick={() => {
                    setFilterType("recently-changed");
                  }}
                  size="sm"
                  variant={
                    filterType === "recently-changed" ? "default" : "outline"
                  }
                >
                  Show Recently Changed
                </Button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  placeholder="Search organizations..."
                  type="search"
                  value={searchQuery}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organizations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Organizations ({filteredOrgs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Gates Enabled</TableHead>
                    <TableHead>Admin Delegation</TableHead>
                    <TableHead>Coach Overrides</TableHead>
                    <TableHead>Admin Override</TableHead>
                    <TableHead>Individual Overrides</TableHead>
                    <TableHead>Pending Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <Skeleton className="mx-auto mb-2 h-8 w-32" />
                            <Skeleton className="mx-auto h-4 w-48" />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && filteredOrgs.length === 0 && (
                    <TableRow>
                      <TableCell className="h-24 text-center" colSpan={7}>
                        No organizations found
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading &&
                    filteredOrgs.length > 0 &&
                    filteredOrgs.map((org) => (
                      <OrganizationTableRow
                        key={org.orgId}
                        onToggleAdminDelegation={handleToggleAdminDelegation}
                        onToggleCoachOverrides={handleToggleCoachOverrides}
                        onToggleGates={handleToggleGates}
                        org={org}
                      />
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
