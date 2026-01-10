"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

// Type for organization from better-auth
interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

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
  X,
} from "lucide-react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ResponsiveDialog } from "@/components/interactions";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
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
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type FunctionalRole = "coach" | "parent" | "admin" | "player";

interface OrgRoleItem {
  org: Organization;
  // biome-ignore lint/suspicious/noExplicitAny: Membership type is complex
  membership: any;
  roles: FunctionalRole[];
  activeRole: FunctionalRole | null;
  pendingRequests: Array<{ role: FunctionalRole; requestedAt: string }>;
}

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
  }
}

interface OrgRoleSwitcherProps {
  className?: string;
}

export function OrgRoleSwitcher({ className }: OrgRoleSwitcherProps) {
  const router = useRouter();
  const params = useParams();
  const urlOrgId = params.orgId as string | undefined;
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Request role dialog state
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedOrgForRequest, setSelectedOrgForRequest] = useState<
    string | null
  >(null);
  const [selectedRoleToRequest, setSelectedRoleToRequest] =
    useState<FunctionalRole | null>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const { data: session } = authClient.useSession();
  const { data: organizations, isPending: isLoadingOrgs } =
    authClient.useListOrganizations();
  const user = useCurrentUser();

  // Get all memberships with roles for all organizations
  const allMemberships = useQuery(
    api.models.members.getMembersForAllOrganizations
  );

  const switchActiveRole = useMutation(
    api.models.members.switchActiveFunctionalRole
  );
  const requestFunctionalRole = useMutation(
    api.models.members.requestFunctionalRole
  );
  const cancelFunctionalRoleRequest = useMutation(
    api.models.members.cancelFunctionalRoleRequest
  );

  // Find current org and membership
  const currentOrg = organizations?.find(
    (org: Organization) => org.id === urlOrgId
  );
  const currentMembership = allMemberships?.find(
    (m) => m.organizationId === urlOrgId
  );

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

      // Redirect to appropriate dashboard
      router.push(getRoleDashboardRoute(orgId, role));
    } catch (error) {
      console.error("Error switching role:", error);
    } finally {
      setSwitching(false);
    }
  };

  const handleCancelPendingRequest = async (
    orgId: string,
    role: FunctionalRole
  ) => {
    setOpen(false);
    try {
      await cancelFunctionalRoleRequest({
        organizationId: orgId,
        role,
      });
    } catch (error) {
      console.error("Error canceling request:", error);
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
    if (!(selectedOrgForRequest && selectedRoleToRequest)) return;

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
      alert(
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
  const orgRoleStructure = organizations.map((org: Organization) => {
    const membership = allMemberships?.find((m) => m.organizationId === org.id);
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
  });

  const triggerButton = (
    <Button
      aria-expanded={open}
      className={cn("w-[220px] justify-between", className)}
      disabled={switching}
      variant="outline"
    >
      {switching ? (
        <span className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Switching...
        </span>
      ) : currentOrg && currentMembership?.activeFunctionalRole ? (
        <div className="flex items-center gap-2 truncate">
          {currentOrg.logo ? (
            <img alt="" className="h-4 w-4 rounded" src={currentOrg.logo} />
          ) : (
            <Building2 className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate">{currentOrg.name}</span>
          <span className="text-muted-foreground">•</span>
          {getRoleIcon(currentMembership.activeFunctionalRole)}
          <span className="truncate">
            {getRoleLabel(currentMembership.activeFunctionalRole)}
          </span>
        </div>
      ) : currentOrg ? (
        <div className="flex items-center gap-2 truncate">
          {currentOrg.logo ? (
            <img alt="" className="h-4 w-4 rounded" src={currentOrg.logo} />
          ) : (
            <Building2 className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate">{currentOrg.name}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span>Select organization...</span>
        </div>
      )}
      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  return (
    <>
      <ResponsiveDialog
        contentClassName="sm:w-[360px]"
        onOpenChange={setOpen}
        open={open}
        title="Switch Organization or Role"
        trigger={triggerButton}
      >
        <Command className="rounded-none border-none">
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>No organization found.</CommandEmpty>
            {orgRoleStructure.map(
              ({ org, roles, activeRole, pendingRequests }: OrgRoleItem) => (
                <CommandGroup
                  heading={
                    <div className="flex items-center gap-2">
                      {org.logo ? (
                        <img
                          alt=""
                          className="h-4 w-4 rounded object-cover"
                          src={org.logo}
                        />
                      ) : (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>{org.name}</span>
                    </div>
                  }
                  key={org.id}
                >
                  {roles.length === 0 && pendingRequests.length === 0 ? (
                    <CommandItem disabled>
                      <span className="text-muted-foreground text-sm">
                        No roles assigned
                      </span>
                    </CommandItem>
                  ) : (
                    <>
                      {/* Active roles */}
                      {roles.map((role) => {
                        const isActive =
                          urlOrgId === org.id && role === activeRole;
                        return (
                          <CommandItem
                            className={cn(
                              "min-h-[44px]",
                              isActive && "bg-green-50"
                            )}
                            key={`${org.id}-${role}`}
                            onSelect={() => handleSwitchRole(org.id, role)}
                            value={`${org.id}-${role}`}
                          >
                            <div className="flex w-full items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getRoleIcon(role)}
                                <span>{getRoleLabel(role)}</span>
                              </div>
                              {isActive && (
                                <span className="flex items-center gap-1 text-green-600 text-xs">
                                  <Check className="h-3 w-3" />
                                  Active
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                      {/* Pending role requests */}
                      {pendingRequests.map((request) => (
                        <CommandItem
                          className="min-h-[44px] bg-yellow-50"
                          key={`${org.id}-pending-${request.role}`}
                          onSelect={() =>
                            handleCancelPendingRequest(org.id, request.role)
                          }
                          value={`${org.id}-pending-${request.role}`}
                        >
                          <div className="flex w-full items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getRoleIcon(request.role)}
                              <span>{getRoleLabel(request.role)}</span>
                            </div>
                            <span className="flex items-center gap-1 text-xs text-yellow-600">
                              <Clock className="h-3 w-3" />
                              Pending
                              <X className="h-3 w-3 hover:text-red-500" />
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </>
                  )}
                </CommandGroup>
              )
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
                    value="manage-organizations"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    <span>Manage Organizations</span>
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
              <label className="font-medium text-sm">Organization</label>
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
                <label className="font-medium text-sm">Role to Request</label>
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
