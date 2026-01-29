"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useMembershipContext } from "@/providers/membership-provider";

// Type for organization from better-auth
type Organization = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
};

import {
  Building2,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Plus,
  Shield,
  UserCircle,
  Users,
} from "lucide-react";
import type { Route } from "next";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Regex for extracting role from pathname (Issue #226)
// Must have / or end-of-string after role to avoid matching "players" as "player"
const ROLE_PATHNAME_REGEX =
  /\/orgs\/[^/]+\/(admin|coach|parents|player)(?:\/|$)/;

import { ResponsiveDialog } from "@/components/interactions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type FunctionalRole = "coach" | "parent" | "admin" | "player";

type OrgRoleItem = {
  org: Organization;
  // biome-ignore lint/suspicious/noExplicitAny: Membership type is complex
  membership: any;
  roles: FunctionalRole[];
  activeRole: FunctionalRole | null;
  pendingRequests: Array<{ role: FunctionalRole; requestedAt: string }>;
};

function getRoleIcon(role: FunctionalRole) {
  switch (role) {
    case "coach":
      return <Users className="h-4 w-4 text-green-600" />;
    case "parent":
      return <UserCircle className="h-4 w-4 text-blue-600" />;
    case "admin":
      return <Shield className="h-4 w-4 text-purple-600" />;
    case "player":
      return <UserCircle className="h-4 w-4 text-orange-600" />;
    default:
      return <UserCircle className="h-4 w-4" />;
  }
}

function getRoleLabel(role: FunctionalRole): string {
  switch (role) {
    case "coach":
      return "Coach";
    case "parent":
      return "Parent";
    case "admin":
      return "Admin";
    case "player":
      return "Player";
    default:
      return "Member";
  }
}

function getRoleDescription(role: FunctionalRole): string {
  switch (role) {
    case "coach":
      return "Manage teams and player development";
    case "parent":
      return "View your children's progress";
    case "admin":
      return "Full club administration access";
    case "player":
      return "Access your player passport";
    default:
      return "Member access";
  }
}

function getRoleDashboardRoute(orgId: string, role: FunctionalRole): Route {
  switch (role) {
    case "coach":
      return `/orgs/${orgId}/coach` as Route;
    case "parent":
      return `/orgs/${orgId}/parents` as Route;
    case "admin":
      return `/orgs/${orgId}/admin` as Route;
    case "player":
      return `/orgs/${orgId}/player` as Route;
    default:
      return `/orgs/${orgId}` as Route;
  }
}

type OrgRoleSwitcherProps = {
  className?: string;
};

export function OrgRoleSwitcher({ className }: OrgRoleSwitcherProps) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const urlOrgId = params.orgId as string | undefined;
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [showAllOrgs, setShowAllOrgs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Most Used section collapsed by default, persisted in localStorage
  const [showMostUsed, setShowMostUsed] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("orgSwitcher.showMostUsed");
      return stored === "true"; // false by default
    }
    return false;
  });

  // Request role dialog state
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedOrgForRequest, setSelectedOrgForRequest] = useState<
    string | null
  >(null);
  const [selectedRoleToRequest, setSelectedRoleToRequest] =
    useState<FunctionalRole | null>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const { data: _session } = authClient.useSession();
  const { data: organizations, isPending: isLoadingOrgs } =
    authClient.useListOrganizations();
  const user = useCurrentUser();
  const { useOrgUsageTracking } = useUXFeatureFlags();

  // Get all memberships from context (shared across header components)
  // Performance: Uses MembershipProvider to avoid duplicate queries
  const { memberships: allMemberships } = useMembershipContext();

  const switchActiveRole = useMutation(
    api.models.members.switchActiveFunctionalRole
  );
  const requestFunctionalRole = useMutation(
    api.models.members.requestFunctionalRole
  );
  const trackOrgAccess = useMutation(api.models.userPreferences.trackOrgAccess);

  // Get usage insights for smart org sorting (Phase 2B)
  const usageInsights = useQuery(
    api.models.userPreferences.getUsageInsights,
    useOrgUsageTracking && user?._id ? { userId: user._id } : "skip"
  );

  // Find current membership
  const currentMembership = allMemberships?.find(
    (m) => m.organizationId === urlOrgId
  );

  // Track previous pathname to detect actual navigation events
  // This prevents syncing when membership changes from manual role switch
  const prevPathnameRef = useRef(pathname);

  // Fix for Issue #226: Sync activeFunctionalRole with URL pathname
  // When user navigates to a role page via links/back/forward/URL,
  // automatically update the database to match the current page
  //
  // IMPORTANT: Only sync when PATHNAME CHANGES, not when membership changes.
  // This prevents a race condition where:
  // 1. User clicks to switch role (parent → admin)
  // 2. Mutation updates membership to admin
  // 3. This useEffect fires because membership changed
  // 4. But pathname is still /parents (navigation pending)
  // 5. useEffect tries to sync BACK to parent → infinite loop!
  useEffect(() => {
    const syncRoleFromURL = async () => {
      // Only sync when pathname actually changed (user navigated)
      // Don't sync when membership changed from manual role switch
      const pathnameChanged = pathname !== prevPathnameRef.current;
      prevPathnameRef.current = pathname;

      if (!pathnameChanged) {
        return; // Membership changed but pathname didn't - skip sync
      }

      if (!(urlOrgId && currentMembership && pathname)) {
        return;
      }

      // Extract role from URL pathname
      const roleMatch = pathname.match(ROLE_PATHNAME_REGEX);
      if (!roleMatch) {
        return; // Not on a role page
      }

      const urlRole = (
        roleMatch[1] === "parents" ? "parent" : roleMatch[1]
      ) as FunctionalRole;
      const currentRole = currentMembership.activeFunctionalRole;

      // Check if user has this role
      const hasRole = currentMembership.functionalRoles?.includes(urlRole);

      // ONLY sync when role actually changes - this prevents write conflicts
      const needsSync = urlRole !== currentRole;

      if (hasRole && needsSync) {
        console.log(
          `[Role Sync] Syncing role from URL: ${urlRole} (was: ${currentRole})`
        );
        try {
          await switchActiveRole({
            organizationId: urlOrgId,
            functionalRole: urlRole,
          });
          console.log("[Role Sync] ✅ Successfully synced role");
        } catch (error) {
          console.error("[Role Sync] ❌ Failed to sync role:", error);
        }
      }
    };

    syncRoleFromURL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    urlOrgId,
    pathname,
    currentMembership?.activeFunctionalRole,
    currentMembership?.functionalRoles,
    switchActiveRole,
    // Note: currentMembership deliberately omitted - we already depend on
    // the specific fields we check (activeFunctionalRole, functionalRoles).
    // Including the entire object causes infinite loops as every Convex update
    // creates a new object reference. See: docs/bugs/role-switcher-infinite-loop.md
  ]);

  // Set default org for request dialog when it opens
  useEffect(() => {
    if (requestDialogOpen && !selectedOrgForRequest) {
      // Default to current org if available
      if (urlOrgId) {
        setSelectedOrgForRequest(urlOrgId);
      } else if (organizations && organizations.length > 0) {
        setSelectedOrgForRequest(organizations[0].id);
      }
    }
  }, [requestDialogOpen, selectedOrgForRequest, urlOrgId, organizations]);

  const toggleMostUsed = () => {
    const newValue = !showMostUsed;
    setShowMostUsed(newValue);
    if (typeof window !== "undefined") {
      localStorage.setItem("orgSwitcher.showMostUsed", String(newValue));
    }
  };

  const handleSwitchRole = async (orgId: string, role: FunctionalRole) => {
    const membership = allMemberships?.find((m) => m.organizationId === orgId);
    const isCurrentOrg = orgId === urlOrgId;
    const isSameRole = membership?.activeFunctionalRole === role;

    // If same org and same role, just close
    if (isCurrentOrg && isSameRole) {
      setOpen(false);
      return;
    }

    setOpen(false);
    setSwitching(true);

    try {
      // If different org, switch org first
      if (!isCurrentOrg) {
        await authClient.organization.setActive({
          organizationId: orgId,
        });
      }

      // Switch the active role
      await switchActiveRole({
        organizationId: orgId,
        functionalRole: role,
      });

      // Track org access for usage insights (only if feature flag is enabled)
      if (useOrgUsageTracking && user?._id) {
        const org = organizations?.find((o) => o.id === orgId);
        await trackOrgAccess({
          userId: user._id,
          orgId,
          orgName: org?.name || "Unknown Organization",
          role,
        });
      }

      // Redirect to appropriate dashboard
      router.push(getRoleDashboardRoute(orgId, role));
    } catch (error) {
      console.error("Error switching role:", error);
      toast.error("Failed to switch role", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again or contact support",
      });
    } finally {
      setSwitching(false);
    }
  };

  const handleOpenRequestDialog = () => {
    setOpen(false);
    setSelectedRoleToRequest(null);
    // Keep the current org as default
    if (urlOrgId) {
      setSelectedOrgForRequest(urlOrgId);
    }
    setRequestDialogOpen(true);
  };

  const handleSubmitRoleRequest = async () => {
    if (!(selectedOrgForRequest && selectedRoleToRequest)) {
      return;
    }

    setIsSubmittingRequest(true);
    try {
      await requestFunctionalRole({
        organizationId: selectedOrgForRequest,
        role: selectedRoleToRequest,
      });
      // Reset state after successful submission
      setRequestDialogOpen(false);
      setSelectedOrgForRequest(null);
      setSelectedRoleToRequest(null);
    } catch (error) {
      console.error("Error requesting role:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to submit request"
      );
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Get available roles to request for an org (excludes roles already held or pending)
  const getAvailableRolesToRequest = (
    orgId: string
  ): Array<{ role: FunctionalRole; isPending: boolean }> => {
    const membership = allMemberships?.find((m) => m.organizationId === orgId);
    const currentRoles = (membership?.functionalRoles ||
      []) as FunctionalRole[];
    const pendingRoles = (membership?.pendingRoleRequests || []).map(
      (r: { role: FunctionalRole; requestedAt: string }) => r.role
    );

    const allRoles: FunctionalRole[] = ["coach", "parent", "admin", "player"];
    return allRoles
      .filter((role) => !currentRoles.includes(role))
      .map((role) => ({
        role,
        isPending: pendingRoles.includes(role),
      }));
  };

  // Check if any org has roles available to request
  const hasAnyRolesToRequest = organizations?.some((org: Organization) =>
    getAvailableRolesToRequest(org.id).some((r) => !r.isPending)
  );

  // Loading state
  if (isLoadingOrgs || allMemberships === undefined) {
    return (
      <Button
        className={cn("w-[200px] justify-between", className)}
        disabled
        variant="outline"
      >
        <span className="text-muted-foreground">Loading...</span>
      </Button>
    );
  }

  // No organizations
  if (!organizations || organizations.length === 0) {
    return null;
  }

  // Build org-role structure for display
  // Fix for Issue #224: Filter out organizations with no roles
  // Only show orgs where user has at least one role OR pending role request
  const orgRoleStructure = organizations
    .map((org: Organization) => {
      const membership = allMemberships?.find(
        (m) => m.organizationId === org.id
      );
      return {
        org,
        membership,
        roles: (membership?.functionalRoles || []) as FunctionalRole[],
        activeRole: membership?.activeFunctionalRole || null,
        pendingRequests: (membership?.pendingRoleRequests || []) as Array<{
          role: FunctionalRole;
          requestedAt: string;
        }>,
      };
    })
    .filter(
      ({ roles, pendingRequests }) =>
        roles.length > 0 || pendingRequests.length > 0
    )
    .map((item) => {
      // Get last accessed timestamp for this org from membership data
      // biome-ignore lint/suspicious/noExplicitAny: membership type from Better Auth has complex shape
      const lastAccessedOrgs = (item.membership as any)?.lastAccessedOrgs || [];
      const orgAccessRecord = lastAccessedOrgs.find(
        (record: { orgId: string; timestamp: number }) =>
          record.orgId === item.org.id
      );
      return {
        ...item,
        lastAccessedTimestamp: orgAccessRecord?.timestamp || 0,
      };
    })
    .sort((a, b) => {
      // Always put active org at the top
      const aIsActive = a.org.id === urlOrgId;
      const bIsActive = b.org.id === urlOrgId;

      if (aIsActive && !bIsActive) {
        return -1; // a is active, move to top
      }
      if (!aIsActive && bIsActive) {
        return 1; // b is active, move to top
      }

      // Sort by last accessed timestamp (most recent first)
      // If no timestamp, put at end
      if (a.lastAccessedTimestamp === 0 && b.lastAccessedTimestamp === 0) {
        return a.org.name.localeCompare(b.org.name); // Alphabetical if neither accessed
      }
      if (a.lastAccessedTimestamp === 0) {
        return 1; // a to end
      }
      if (b.lastAccessedTimestamp === 0) {
        return -1; // b to end
      }
      return b.lastAccessedTimestamp - a.lastAccessedTimestamp; // Most recent first
    });

  // Filter organizations based on search query
  const filteredOrgRoleStructure = orgRoleStructure.filter(({ org, roles }) => {
    if (!searchQuery) {
      return true;
    }

    const query = searchQuery.toLowerCase();
    const orgNameMatches = org.name.toLowerCase().includes(query);
    const roleMatches = roles.some((role) =>
      getRoleLabel(role).toLowerCase().includes(query)
    );

    return orgNameMatches || roleMatches;
  });

  // Process most used orgs from usage insights (Phase 2B)
  const mostUsedOrgItems: OrgRoleItem[] = [];
  if (useOrgUsageTracking && usageInsights?.mostUsedOrgs) {
    const seenOrgIds = new Set<string>();
    for (const mostUsed of usageInsights.mostUsedOrgs) {
      // Skip if we've already added this org (same org can have multiple roles in top list)
      if (seenOrgIds.has(mostUsed.orgId)) {
        continue;
      }

      // Find corresponding org in orgRoleStructure
      const orgItem = orgRoleStructure.find(
        (item) => item.org.id === mostUsed.orgId
      );
      if (orgItem) {
        mostUsedOrgItems.push(orgItem);
        seenOrgIds.add(mostUsed.orgId);

        // Stop at 3 unique orgs
        if (mostUsedOrgItems.length >= 3) {
          break;
        }
      }
    }
  }

  const triggerButton = (
    <Button
      aria-expanded={open}
      className={cn("h-10 justify-between", className)}
      disabled={switching}
      variant="outline"
    >
      {switching ? (
        <span className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Switching...
        </span>
      ) : currentMembership?.activeFunctionalRole ? (
        <div className="flex items-center gap-2">
          {getRoleIcon(currentMembership.activeFunctionalRole)}
          <span>{getRoleLabel(currentMembership.activeFunctionalRole)}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span>Select role...</span>
        </div>
      )}
      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  return (
    <>
      <ResponsiveDialog
        contentClassName="sm:w-[440px]"
        onOpenChange={setOpen}
        open={open}
        title="Switch Organization or Role"
        trigger={triggerButton}
      >
        <Command className="rounded-none border-none" shouldFilter={false}>
          <CommandInput
            onValueChange={setSearchQuery}
            placeholder="Search organizations..."
            value={searchQuery}
          />
          <CommandList className="max-h-[70vh]">
            {filteredOrgRoleStructure.length === 0 ? (
              <CommandEmpty>No organization found.</CommandEmpty>
            ) : (
              <div className="space-y-0.5 p-1">
                {/* Recently Accessed Section - PRIMARY */}
                <div className="flex items-center gap-1 px-1.5 pb-0 font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
                  <Clock className="h-2.5 w-2.5" />
                  Recently Accessed
                </div>
                {(showAllOrgs
                  ? filteredOrgRoleStructure
                  : filteredOrgRoleStructure.slice(0, 2)
                ).map(({ org, roles, activeRole }: OrgRoleItem) => {
                  const isActiveOrg = urlOrgId === org.id;
                  return (
                    <Card
                      className={cn(
                        "relative px-2 py-1.5 shadow-sm transition-all hover:shadow-md",
                        isActiveOrg && "border-2 border-green-500"
                      )}
                      key={org.id}
                    >
                      {/* Active org indicator */}
                      {isActiveOrg && (
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 font-medium text-[9px] text-green-600">
                          <Check className="h-2 w-2" />
                          Active
                        </div>
                      )}

                      {/* Org header */}
                      <div className="flex items-center gap-1">
                        {org.logo ? (
                          <img
                            alt=""
                            className="h-5 w-5 flex-shrink-0 rounded object-cover"
                            src={org.logo}
                          />
                        ) : (
                          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-muted">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-bold text-[11px] uppercase leading-none tracking-tight">
                            {org.name}
                          </div>
                        </div>
                      </div>

                      {/* Horizontal role badges */}
                      {roles.length > 0 ? (
                        <div className="-mt-1.5 flex flex-wrap gap-1">
                          {roles.map((role) => {
                            const isActiveRole =
                              isActiveOrg && role === activeRole;
                            return (
                              <Button
                                className={cn(
                                  "h-5 gap-0.5 px-1.5 py-0 text-[11px]",
                                  isActiveRole
                                    ? "border-green-300 bg-green-100 text-green-700 hover:bg-green-200"
                                    : "variant-outline"
                                )}
                                key={`${org.id}-${role}`}
                                onClick={() => handleSwitchRole(org.id, role)}
                                size="sm"
                                variant={isActiveRole ? "default" : "outline"}
                              >
                                {getRoleIcon(role)}
                                <span>{getRoleLabel(role)}</span>
                                {isActiveRole && <Check className="h-2 w-2" />}
                              </Button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-xs">
                          No roles assigned
                        </div>
                      )}
                    </Card>
                  );
                })}

                {/* Show more/less button */}
                {filteredOrgRoleStructure.length > 2 && (
                  <Button
                    className="w-full"
                    onClick={() => setShowAllOrgs(!showAllOrgs)}
                    variant="ghost"
                  >
                    {showAllOrgs ? (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4 rotate-180" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Show {filteredOrgRoleStructure.length - 2} more
                        organization
                        {filteredOrgRoleStructure.length - 2 !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Most Used Section (Phase 2B) - Collapsible at bottom */}
            {mostUsedOrgItems.length > 0 && (
              <>
                <CommandSeparator />
                <div className="p-1">
                  {/* Toggle button */}
                  <Button
                    className="w-full justify-between"
                    onClick={toggleMostUsed}
                    variant="ghost"
                  >
                    <div className="flex items-center gap-1">
                      <span>⚡</span>
                      <span className="font-semibold text-xs uppercase tracking-wide">
                        Most Used ({mostUsedOrgItems.length})
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        showMostUsed && "rotate-180"
                      )}
                    />
                  </Button>

                  {/* Expandable content */}
                  {showMostUsed && (
                    <div className="space-y-0.5 pt-1">
                      {mostUsedOrgItems.map(
                        ({ org, roles, activeRole }: OrgRoleItem) => {
                          const isActiveOrg = urlOrgId === org.id;
                          return (
                            <Card
                              className={cn(
                                "relative px-2 py-1.5 shadow-sm transition-all hover:shadow-md",
                                isActiveOrg && "border-2 border-green-500"
                              )}
                              key={`most-used-${org.id}`}
                            >
                              {/* Active org indicator */}
                              {isActiveOrg && (
                                <div className="absolute top-1 right-1 flex items-center gap-0.5 font-medium text-[9px] text-green-600">
                                  <Check className="h-2 w-2" />
                                  Active
                                </div>
                              )}

                              {/* Org header */}
                              <div className="flex items-center gap-1">
                                {org.logo ? (
                                  <img
                                    alt=""
                                    className="h-5 w-5 flex-shrink-0 rounded object-cover"
                                    src={org.logo}
                                  />
                                ) : (
                                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-muted">
                                    <Building2 className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-bold text-[11px] uppercase leading-none tracking-tight">
                                    {org.name}
                                  </div>
                                </div>
                              </div>

                              {/* Horizontal role badges */}
                              {roles.length > 0 ? (
                                <div className="-mt-1.5 flex flex-wrap gap-1">
                                  {roles.map((role) => {
                                    const isActiveRole =
                                      isActiveOrg && role === activeRole;
                                    return (
                                      <Button
                                        className={cn(
                                          "h-5 gap-0.5 px-1.5 py-0 text-[11px]",
                                          isActiveRole
                                            ? "border-green-300 bg-green-100 text-green-700 hover:bg-green-200"
                                            : "variant-outline"
                                        )}
                                        key={`${org.id}-${role}`}
                                        onClick={() =>
                                          handleSwitchRole(org.id, role)
                                        }
                                        size="sm"
                                        variant={
                                          isActiveRole ? "default" : "outline"
                                        }
                                      >
                                        {getRoleIcon(role)}
                                        <span>{getRoleLabel(role)}</span>
                                        {isActiveRole && (
                                          <Check className="h-2 w-2" />
                                        )}
                                      </Button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-muted-foreground text-xs">
                                  No roles assigned
                                </div>
                              )}
                            </Card>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Single consolidated Request Role option */}
            {hasAnyRolesToRequest && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    className="min-h-[44px] text-muted-foreground"
                    onSelect={handleOpenRequestDialog}
                    value="request-new-role"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Request a Role</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}

            {/* Platform Staff options */}
            {user?.isPlatformStaff && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Platform">
                  <CommandItem
                    className="min-h-[44px]"
                    onSelect={() => {
                      setOpen(false);
                      router.push("/orgs" as Route);
                    }}
                    value="manage-organisations"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    <span>Manage Organisations</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </ResponsiveDialog>

      {/* Request Role Dialog */}
      <Dialog onOpenChange={setRequestDialogOpen} open={requestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request a Role</DialogTitle>
            <DialogDescription>
              Select an organization and the role you'd like to request. An
              admin will review your request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Organization selector */}
            <div className="space-y-2">
              <div className="font-medium text-sm">Organization</div>
              <Select
                onValueChange={(value) => {
                  setSelectedOrgForRequest(value);
                  setSelectedRoleToRequest(null); // Reset role when org changes
                }}
                value={selectedOrgForRequest || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org: Organization) => (
                    <SelectItem key={org.id} value={org.id}>
                      <div className="flex items-center gap-2">
                        {org.logo ? (
                          <img
                            alt=""
                            className="h-4 w-4 rounded"
                            src={org.logo}
                          />
                        ) : (
                          <Building2 className="h-4 w-4" />
                        )}
                        {org.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role selector */}
            {selectedOrgForRequest && (
              <div className="space-y-2">
                <div className="font-medium text-sm">Role to Request</div>
                <div className="space-y-2">
                  {getAvailableRolesToRequest(selectedOrgForRequest).length ===
                  0 ? (
                    <p className="py-2 text-muted-foreground text-sm">
                      You already have all available roles in this organization.
                    </p>
                  ) : (
                    getAvailableRolesToRequest(selectedOrgForRequest).map(
                      ({ role, isPending }) => (
                        <button
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                            isPending
                              ? "cursor-not-allowed border-yellow-200 bg-yellow-50"
                              : selectedRoleToRequest === role
                                ? "border-primary bg-primary/5"
                                : "hover:border-gray-300 hover:bg-gray-50"
                          )}
                          disabled={isPending}
                          key={role}
                          onClick={() =>
                            !isPending && setSelectedRoleToRequest(role)
                          }
                          type="button"
                        >
                          <div
                            className={cn(
                              "rounded-lg p-2",
                              role === "coach" && "bg-green-100",
                              role === "parent" && "bg-blue-100",
                              role === "admin" && "bg-purple-100"
                            )}
                          >
                            {getRoleIcon(role)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {getRoleLabel(role)}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {getRoleDescription(role)}
                            </div>
                          </div>
                          {isPending ? (
                            <div className="flex items-center gap-1 text-xs text-yellow-600">
                              <Clock className="h-3 w-3" />
                              Pending
                            </div>
                          ) : selectedRoleToRequest === role ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : null}
                        </button>
                      )
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              disabled={isSubmittingRequest}
              onClick={() => setRequestDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                !(selectedOrgForRequest && selectedRoleToRequest) ||
                isSubmittingRequest
              }
              onClick={handleSubmitRoleRequest}
            >
              {isSubmittingRequest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
