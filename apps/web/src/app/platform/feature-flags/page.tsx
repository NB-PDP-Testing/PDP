"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  Bot,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  MoreHorizontal,
  Search,
  Shield,
  ShieldAlert,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type SortField = "name" | "lastChanged" | "overrideCount";
type SortDirection = "asc" | "desc";

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
  isSelected,
  onToggleSelection,
  onToggleGates,
  onToggleAdminDelegation,
  onToggleCoachOverrides,
  onViewDetails,
  onResetToDefault,
}: {
  org: OrgStatus;
  isSelected: boolean;
  onToggleSelection: (orgId: string) => void;
  onToggleGates: (orgId: string, currentValue: boolean) => void;
  onToggleAdminDelegation: (orgId: string, currentValue: boolean) => void;
  onToggleCoachOverrides: (orgId: string, currentValue: boolean) => void;
  onViewDetails: (orgId: string) => void;
  onResetToDefault: (orgId: string) => void;
}) {
  const formatLastChanged = (
    lastChangedBy?: string,
    lastChangedAt?: number
  ) => {
    if (!(lastChangedBy && lastChangedAt)) {
      return (
        <span className="text-muted-foreground text-sm">Never changed</span>
      );
    }
    const date = new Date(lastChangedAt);
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return (
      <div className="text-sm">
        <div className="font-medium">{lastChangedBy}</div>
        <div className="text-muted-foreground text-xs">{formattedDate}</div>
      </div>
    );
  };

  return (
    <TableRow key={org.orgId}>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => {
            onToggleSelection(org.orgId);
          }}
        />
      </TableCell>
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
          <button
            className="cursor-pointer text-primary underline hover:text-primary/80"
            onClick={() => {
              onViewDetails(org.orgId);
            }}
            type="button"
          >
            {org.overridesCount}
          </button>
        ) : (
          <span className="text-muted-foreground text-sm">None</span>
        )}
      </TableCell>
      <TableCell>
        {org.pendingRequestsCount > 0 ? (
          <button
            className="cursor-pointer text-primary underline hover:text-primary/80"
            onClick={() => {
              onViewDetails(org.orgId);
            }}
            type="button"
          >
            {org.pendingRequestsCount}
          </button>
        ) : (
          <span className="text-muted-foreground text-sm">None</span>
        )}
      </TableCell>
      <TableCell>
        {formatLastChanged(org.lastChangedBy, org.lastChangedAt)}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                onViewDetails(org.orgId);
              }}
            >
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onResetToDefault(org.orgId);
              }}
            >
              Reset to Default
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

function applySorting(
  orgs: OrgStatus[],
  sortField: SortField,
  sortDirection: SortDirection
): OrgStatus[] {
  return [...orgs].sort((a, b) => {
    let compareValue = 0;

    if (sortField === "name") {
      compareValue = a.orgName.localeCompare(b.orgName);
    } else if (sortField === "lastChanged") {
      const aTime = a.lastChangedAt ?? 0;
      const bTime = b.lastChangedAt ?? 0;
      compareValue = aTime - bTime;
    } else if (sortField === "overrideCount") {
      compareValue = a.overridesCount - b.overridesCount;
    }

    return sortDirection === "asc" ? compareValue : -compareValue;
  });
}

export default function FeatureFlagsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());
  const [showBulkDisableDialog, setShowBulkDisableDialog] = useState(false);
  const itemsPerPage = 20;

  // Query all organizations' feature flag status
  const orgsStatus = useQuery(
    api.models.trustGatePermissions.getAllOrgsFeatureFlagStatus,
    {}
  );

  // Fetch platform AI accuracy metrics
  const aiAccuracy = useQuery(
    api.models.coachTrustLevels.getPlatformAIAccuracy,
    { timeWindowDays: 30 }
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

  // Filter, sort, and paginate organizations
  const displayedOrgs = useMemo(() => {
    if (!orgsStatus) {
      return [];
    }
    let filtered = applyOrgFilters(orgsStatus, filterType, searchQuery);
    filtered = applySorting(filtered, sortField, sortDirection);

    // Paginate
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }, [
    orgsStatus,
    filterType,
    searchQuery,
    sortField,
    sortDirection,
    currentPage,
  ]);

  const totalFilteredOrgs = useMemo(() => {
    if (!orgsStatus) {
      return 0;
    }
    return applyOrgFilters(orgsStatus, filterType, searchQuery).length;
  }, [orgsStatus, filterType, searchQuery]);

  const totalPages = Math.ceil(totalFilteredOrgs / itemsPerPage);

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

  const handleToggleSelection = useCallback((orgId: string) => {
    setSelectedOrgs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orgId)) {
        newSet.delete(orgId);
      } else {
        newSet.add(orgId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedOrgs.size === displayedOrgs.length) {
      setSelectedOrgs(new Set());
    } else {
      setSelectedOrgs(new Set(displayedOrgs.map((org) => org.orgId)));
    }
  }, [displayedOrgs, selectedOrgs]);

  const handleViewDetails = useCallback((orgId: string) => {
    toast.info(`View details for organization: ${orgId} (not yet implemented)`);
  }, []);

  const handleResetToDefault = useCallback(
    async (orgId: string) => {
      try {
        await Promise.all([
          setOrgTrustGatesEnabled({
            organizationId: orgId,
            enabled: true,
          }),
          setPlatformFeatureFlags({
            organizationId: orgId,
            allowAdminDelegation: false,
            allowCoachOverrides: false,
          }),
        ]);
        toast.success("Reset to default settings successfully");
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Error resetting to default:", error);
        toast.error(errorMessage || "Failed to reset to default");
      }
    },
    [setOrgTrustGatesEnabled, setPlatformFeatureFlags]
  );

  const handleBulkEnableAdminDelegation = useCallback(async () => {
    if (selectedOrgs.size === 0) {
      toast.error("No organizations selected");
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedOrgs).map((orgId) =>
          setPlatformFeatureFlags({
            organizationId: orgId,
            allowAdminDelegation: true,
          })
        )
      );
      toast.success(
        `Enabled admin delegation for ${selectedOrgs.size} organizations`
      );
      setSelectedOrgs(new Set());
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error enabling admin delegation:", error);
      toast.error(errorMessage || "Failed to enable admin delegation");
    }
  }, [selectedOrgs, setPlatformFeatureFlags]);

  const handleBulkEnableCoachOverrides = useCallback(async () => {
    if (selectedOrgs.size === 0) {
      toast.error("No organizations selected");
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedOrgs).map((orgId) =>
          setPlatformFeatureFlags({
            organizationId: orgId,
            allowCoachOverrides: true,
          })
        )
      );
      toast.success(
        `Enabled coach overrides for ${selectedOrgs.size} organizations`
      );
      setSelectedOrgs(new Set());
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error enabling coach overrides:", error);
      toast.error(errorMessage || "Failed to enable coach overrides");
    }
  }, [selectedOrgs, setPlatformFeatureFlags]);

  const handleBulkDisableGates = useCallback(async () => {
    if (selectedOrgs.size === 0) {
      toast.error("No organizations selected");
      return;
    }

    setShowBulkDisableDialog(true);
  }, [selectedOrgs]);

  const confirmBulkDisableGates = useCallback(async () => {
    try {
      await Promise.all(
        Array.from(selectedOrgs).map((orgId) =>
          setOrgTrustGatesEnabled({
            organizationId: orgId,
            enabled: false,
          })
        )
      );
      toast.success(`Disabled gates for ${selectedOrgs.size} organizations`);
      setSelectedOrgs(new Set());
      setShowBulkDisableDialog(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error disabling gates:", error);
      toast.error(errorMessage || "Failed to disable gates");
    }
  }, [selectedOrgs, setOrgTrustGatesEnabled]);

  const handleSort = useCallback(
    (field: SortField) => {
      setSortField(field);
      setSortDirection((prev) => {
        if (sortField !== field) {
          return "asc";
        }
        return prev === "asc" ? "desc" : "asc";
      });
      setCurrentPage(1);
    },
    [sortField]
  );

  const isLoading = orgsStatus === undefined;
  const isAllSelected =
    displayedOrgs.length > 0 && selectedOrgs.size === displayedOrgs.length;

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

        {/* AI Accuracy Metrics Section */}
        {aiAccuracy && aiAccuracy.totalInsights > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                AI Insight Accuracy (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Overview Stats */}
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-full bg-green-100 p-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-2xl text-green-700">
                        {aiAccuracy.accuracy.toFixed(1)}%
                      </p>
                      <p className="text-green-600 text-xs">AI Accuracy</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-full bg-blue-100 p-2">
                      <Bot className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-2xl text-blue-700">
                        {aiAccuracy.totalInsights}
                      </p>
                      <p className="text-blue-600 text-xs">Total Insights</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-full bg-purple-100 p-2">
                      <CheckCircle className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-2xl text-purple-700">
                        {aiAccuracy.aiGotItRight}
                      </p>
                      <p className="text-purple-600 text-xs">AI Correct</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-full bg-orange-100 p-2">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-bold text-2xl text-orange-700">
                        {aiAccuracy.manuallyCorrected}
                      </p>
                      <p className="text-orange-600 text-xs">
                        Coach Corrections
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Correction Breakdown */}
              <div className="mb-4">
                <h3 className="mb-3 font-semibold text-sm">
                  Corrections by Type
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        Player Assigned
                      </span>
                      <Badge variant="outline">
                        {aiAccuracy.correctionBreakdown.playerAssigned}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        Team Classified
                      </span>
                      <Badge variant="outline">
                        {aiAccuracy.correctionBreakdown.teamClassified}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        Todo Classified
                      </span>
                      <Badge variant="outline">
                        {aiAccuracy.correctionBreakdown.todoClassified}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        Content Edited
                      </span>
                      <Badge variant="outline">
                        {aiAccuracy.correctionBreakdown.contentEdited}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coaches Needing Help */}
              {aiAccuracy.byCoach.length > 0 && (
                <div>
                  <h3 className="mb-3 font-semibold text-sm">
                    Coaches with Lowest AI Accuracy (Top 5)
                  </h3>
                  <div className="space-y-2">
                    {aiAccuracy.byCoach.slice(0, 5).map((coach) => (
                      <div
                        className="flex items-center justify-between rounded-lg border bg-card p-3"
                        key={coach.coachId}
                      >
                        <div className="flex items-center gap-3">
                          <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                            {coach.coachId.slice(0, 8)}...
                          </code>
                          <span className="text-muted-foreground text-sm">
                            {coach.totalInsights} insights,{" "}
                            {coach.manuallyCorrected} corrected
                          </span>
                        </div>
                        <Badge
                          className={
                            coach.accuracy < 70
                              ? "bg-red-100 text-red-700"
                              : coach.accuracy < 85
                                ? "bg-orange-100 text-orange-700"
                                : "bg-green-100 text-green-700"
                          }
                        >
                          {coach.accuracy.toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bulk Actions */}
        {selectedOrgs.size > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-sm">
                  {selectedOrgs.size} selected
                </span>
                <Button
                  onClick={handleBulkEnableAdminDelegation}
                  size="sm"
                  variant="outline"
                >
                  Enable Admin Delegation
                </Button>
                <Button
                  onClick={handleBulkEnableCoachOverrides}
                  size="sm"
                  variant="outline"
                >
                  Enable Coach Overrides
                </Button>
                <Button
                  onClick={handleBulkDisableGates}
                  size="sm"
                  variant="destructive"
                >
                  Disable All Gates
                </Button>
                <Button
                  onClick={() => {
                    setSelectedOrgs(new Set());
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Clear Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setFilterType("all");
                    setCurrentPage(1);
                  }}
                  size="sm"
                  variant={filterType === "all" ? "default" : "outline"}
                >
                  Show All
                </Button>
                <Button
                  onClick={() => {
                    setFilterType("gates-disabled");
                    setCurrentPage(1);
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
                    setCurrentPage(1);
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
                    setCurrentPage(1);
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
                    setCurrentPage(1);
                  }}
                  size="sm"
                  variant={filterType === "has-issues" ? "default" : "outline"}
                >
                  Show Orgs with Issues
                </Button>
                <Button
                  onClick={() => {
                    setFilterType("recently-changed");
                    setCurrentPage(1);
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
                    setCurrentPage(1);
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
            <CardTitle>Organizations ({totalFilteredOrgs})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => {
                          handleSort("name");
                        }}
                        type="button"
                      >
                        Organization
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </TableHead>
                    <TableHead>Gates Enabled</TableHead>
                    <TableHead>Admin Delegation</TableHead>
                    <TableHead>Coach Overrides</TableHead>
                    <TableHead>Admin Override</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => {
                          handleSort("overrideCount");
                        }}
                        type="button"
                      >
                        Individual Overrides
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </TableHead>
                    <TableHead>Pending Requests</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => {
                          handleSort("lastChanged");
                        }}
                        type="button"
                      >
                        Last Changed
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={10}>
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <Skeleton className="mx-auto mb-2 h-8 w-32" />
                            <Skeleton className="mx-auto h-4 w-48" />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && displayedOrgs.length === 0 && (
                    <TableRow>
                      <TableCell className="h-24 text-center" colSpan={10}>
                        No organizations found
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading &&
                    displayedOrgs.length > 0 &&
                    displayedOrgs.map((org) => (
                      <OrganizationTableRow
                        isSelected={selectedOrgs.has(org.orgId)}
                        key={org.orgId}
                        onResetToDefault={handleResetToDefault}
                        onToggleAdminDelegation={handleToggleAdminDelegation}
                        onToggleCoachOverrides={handleToggleCoachOverrides}
                        onToggleGates={handleToggleGates}
                        onToggleSelection={handleToggleSelection}
                        onViewDetails={handleViewDetails}
                        org={org}
                      />
                    ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalFilteredOrgs)} of{" "}
                  {totalFilteredOrgs} organizations
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage((prev) => prev - 1);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage((prev) => prev + 1);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Disable Confirmation Dialog */}
        <AlertDialog
          onOpenChange={setShowBulkDisableDialog}
          open={showBulkDisableDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disable Trust Gates</AlertDialogTitle>
              <AlertDialogDescription>
                This will disable trust gates for {selectedOrgs.size}{" "}
                organizations. All coaches in these organizations will gain
                access to the Sent to Parents tab regardless of their trust
                level. This action can be reversed later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmBulkDisableGates}>
                Disable Gates
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
