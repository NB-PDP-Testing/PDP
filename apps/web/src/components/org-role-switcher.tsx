"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
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
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type FunctionalRole = "coach" | "parent" | "admin";

function getRoleIcon(role: FunctionalRole) {
  switch (role) {
    case "coach":
      return <Users className="h-4 w-4 text-green-600" />;
    case "parent":
      return <UserCircle className="h-4 w-4 text-blue-600" />;
    case "admin":
      return <Shield className="h-4 w-4 text-purple-600" />;
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

  // Request role state
  const [requestingRoleForOrg, setRequestingRoleForOrg] = useState<
    string | null
  >(null);
  const [selectedRoleToRequest, setSelectedRoleToRequest] =
    useState<FunctionalRole | null>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const { data: session } = authClient.useSession();
  const { data: organizations, isPending: isLoadingOrgs } =
    authClient.useListOrganizations();

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
  const currentOrg = organizations?.find((org) => org.id === urlOrgId);
  const currentMembership = allMemberships?.find(
    (m) => m.organizationId === urlOrgId
  );

  const handleSwitchRole = async (orgId: string, role: FunctionalRole) => {
    const membership = allMemberships?.find((m) => m.organizationId === orgId);
    const isCurrentOrg = orgId === urlOrgId;
    const isSameRole = membership?.activeFunctionalRole === role;

    // If same org and same role, just close
    if (isCurrentOrg && isSameRole) {
      setOpen(false);
      return;
    }

    setSwitching(true);
    try {
      // If different org, switch org first
      if (!isCurrentOrg) {
        await authClient.organization.setActive({ organizationId: orgId });
      }

      // Switch the active role
      await switchActiveRole({
        organizationId: orgId,
        functionalRole: role,
      });

      // Redirect to appropriate dashboard
      router.push(getRoleDashboardRoute(orgId, role));
      setOpen(false);
    } catch (error) {
      console.error("Error switching role:", error);
    } finally {
      setSwitching(false);
    }
  };

  const handleStartRequestRole = (orgId: string) => {
    setRequestingRoleForOrg(orgId);
    setSelectedRoleToRequest(null);
  };

  const handleCancelRequest = () => {
    setRequestingRoleForOrg(null);
    setSelectedRoleToRequest(null);
  };

  const handleSubmitRoleRequest = async () => {
    if (!(requestingRoleForOrg && selectedRoleToRequest)) return;

    setIsSubmittingRequest(true);
    try {
      await requestFunctionalRole({
        organizationId: requestingRoleForOrg,
        role: selectedRoleToRequest,
      });
      // Reset state after successful submission
      setRequestingRoleForOrg(null);
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

  const handleCancelPendingRequest = async (
    orgId: string,
    role: FunctionalRole
  ) => {
    try {
      await cancelFunctionalRoleRequest({
        organizationId: orgId,
        role,
      });
    } catch (error) {
      console.error("Error canceling request:", error);
    }
  };

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
  const orgRoleStructure = organizations.map((org) => {
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

  // Determine if we should show search (hybrid approach: hide for ≤3 orgs)
  const showSearch = organizations.length > 3;

  // Get available roles to request for an org
  const getAvailableRolesToRequest = (
    orgId: string
  ): Array<{ role: FunctionalRole; isPending: boolean }> => {
    const membership = allMemberships?.find((m) => m.organizationId === orgId);
    const currentRoles = (membership?.functionalRoles ||
      []) as FunctionalRole[];
    const pendingRoles = (membership?.pendingRoleRequests || []).map(
      (r: { role: FunctionalRole; requestedAt: string }) => r.role
    );

    const allRoles: FunctionalRole[] = ["coach", "parent", "admin"];
    return allRoles
      .filter((role) => !currentRoles.includes(role))
      .map((role) => ({
        role,
        isPending: pendingRoles.includes(role),
      }));
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn("w-[220px] justify-between", className)}
          disabled={switching}
          variant="outline"
        >
          {switching ? (
            <span className="text-muted-foreground">Switching...</span>
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
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command>
          {showSearch && !requestingRoleForOrg && (
            <CommandInput placeholder="Search organizations..." />
          )}
          <CommandList>
            {/* Inline Role Request Form */}
            {requestingRoleForOrg && (
              <div className="border-b p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-sm">Request Role</span>
                  <button
                    className="rounded p-1 hover:bg-gray-100"
                    onClick={handleCancelRequest}
                    type="button"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>

                {selectedRoleToRequest ? (
                  <div className="space-y-3">
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3",
                        selectedRoleToRequest === "coach" &&
                          "border-green-200 bg-green-50",
                        selectedRoleToRequest === "parent" &&
                          "border-blue-200 bg-blue-50",
                        selectedRoleToRequest === "admin" &&
                          "border-purple-200 bg-purple-50"
                      )}
                    >
                      {getRoleIcon(selectedRoleToRequest)}
                      <div>
                        <div className="font-medium">
                          {getRoleLabel(selectedRoleToRequest)}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {getRoleDescription(selectedRoleToRequest)}
                        </div>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Your request will be sent to the organization admin for
                      approval.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        disabled={isSubmittingRequest}
                        onClick={handleSubmitRoleRequest}
                        size="sm"
                      >
                        {isSubmittingRequest ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Submit Request"
                        )}
                      </Button>
                      <Button
                        disabled={isSubmittingRequest}
                        onClick={() => setSelectedRoleToRequest(null)}
                        size="sm"
                        variant="outline"
                      >
                        Back
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getAvailableRolesToRequest(requestingRoleForOrg).map(
                      ({ role, isPending }) => (
                        <button
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                            isPending
                              ? "cursor-not-allowed border-yellow-200 bg-yellow-50"
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
                          ) : (
                            <Plus className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      )
                    )}
                    {getAvailableRolesToRequest(requestingRoleForOrg).length ===
                      0 && (
                      <p className="py-2 text-center text-muted-foreground text-sm">
                        You have all available roles
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Normal org/role list */}
            {!requestingRoleForOrg && (
              <>
                <CommandEmpty>No organization found.</CommandEmpty>
                {orgRoleStructure.map(
                  ({ org, roles, activeRole, pendingRequests }) => (
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
                                className={cn(isActive && "bg-green-50")}
                                key={`${org.id}-${role}`}
                                onSelect={() => handleSwitchRole(org.id, role)}
                                value={`${org.name}-${role}`}
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
                              className="bg-yellow-50"
                              key={`${org.id}-pending-${request.role}`}
                              onSelect={() =>
                                handleCancelPendingRequest(org.id, request.role)
                              }
                              value={`${org.name}-pending-${request.role}`}
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
                      {/* Request Role Option - only show if there are roles to request */}
                      {getAvailableRolesToRequest(org.id).some(
                        (r) => !r.isPending
                      ) && (
                        <CommandItem
                          className="text-muted-foreground"
                          onSelect={() => handleStartRequestRole(org.id)}
                          value={`${org.name}-request-role`}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          <span>Request Role</span>
                        </CommandItem>
                      )}
                    </CommandGroup>
                  )
                )}

                {/* Create Organization option for platform staff */}
                {session?.user &&
                  (session.user as { isPlatformStaff?: boolean })
                    .isPlatformStaff && (
                    <>
                      <CommandSeparator />
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setOpen(false);
                            router.push("/orgs/create" as Route);
                          }}
                          value="create-organization"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          <span>Create Organization</span>
                        </CommandItem>
                      </CommandGroup>
                    </>
                  )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
