"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Check,
  Clock,
  Loader2,
  Shield,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type FunctionalRole = "coach" | "parent" | "admin";

const ROLE_INFO: Record<
  FunctionalRole,
  {
    icon: React.ReactNode;
    label: string;
    description: string;
    color: string;
    bgColor: string;
  }
> = {
  coach: {
    icon: <Users className="h-6 w-6 text-green-600" />,
    label: "Coach",
    description:
      "Access to player passports, training plans, and development tracking for your assigned teams.",
    color: "border-green-200 bg-green-50",
    bgColor: "bg-green-100",
  },
  parent: {
    icon: <UserCircle className="h-6 w-6 text-blue-600" />,
    label: "Parent",
    description:
      "View your children's player passports, progress reports, and communication from coaches.",
    color: "border-blue-200 bg-blue-50",
    bgColor: "bg-blue-100",
  },
  admin: {
    icon: <Shield className="h-6 w-6 text-purple-600" />,
    label: "Admin",
    description:
      "Full access to organization settings, user management, and all player data.",
    color: "border-purple-200 bg-purple-50",
    bgColor: "bg-purple-100",
  },
};

export default function RequestRolePage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [selectedRole, setSelectedRole] = useState<FunctionalRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancellingRole, setCancellingRole] = useState<FunctionalRole | null>(
    null
  );

  const { data: activeOrganization } = authClient.useActiveOrganization();

  // Get membership data from Convex
  const allMemberships = useQuery(
    api.models.members.getMembersForAllOrganizations
  );
  const membership = allMemberships?.find((m) => m.organizationId === orgId);

  const requestFunctionalRole = useMutation(
    api.models.members.requestFunctionalRole
  );
  const cancelFunctionalRoleRequest = useMutation(
    api.models.members.cancelFunctionalRoleRequest
  );

  // Get current functional roles
  const currentRoles = useMemo(
    () => (membership?.functionalRoles || []) as FunctionalRole[],
    [membership]
  );

  // Get pending role requests
  const pendingRequests = useMemo(
    () =>
      (membership?.pendingRoleRequests || []) as Array<{
        role: FunctionalRole;
        requestedAt: string;
      }>,
    [membership]
  );

  // Roles the user can request (ones they don't have and haven't requested)
  const availableRoles = useMemo(() => {
    const allRoles: FunctionalRole[] = ["coach", "parent", "admin"];
    const pendingRoleNames = pendingRequests.map((r) => r.role);
    return allRoles.filter(
      (role) =>
        !(currentRoles.includes(role) || pendingRoleNames.includes(role))
    );
  }, [currentRoles, pendingRequests]);

  const handleSubmitRequest = async () => {
    if (!selectedRole) return;

    setIsSubmitting(true);
    try {
      await requestFunctionalRole({
        organizationId: orgId,
        role: selectedRole,
      });
      setSelectedRole(null);
    } catch (error) {
      console.error("Error requesting role:", error);
      alert(
        error instanceof Error ? error.message : "Failed to submit request"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (role: FunctionalRole) => {
    setCancellingRole(role);
    try {
      await cancelFunctionalRoleRequest({
        organizationId: orgId,
        role,
      });
    } catch (error) {
      console.error("Error canceling request:", error);
      alert(
        error instanceof Error ? error.message : "Failed to cancel request"
      );
    } finally {
      setCancellingRole(null);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Back button */}
      <Button className="mb-6" onClick={() => router.back()} variant="outline">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Request Additional Role</CardTitle>
          <CardDescription>
            Request additional capabilities in{" "}
            {activeOrganization?.name || "this organization"}. An admin will
            review your request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Roles */}
          {currentRoles.length > 0 && (
            <div>
              <h3 className="mb-3 font-medium text-muted-foreground text-sm">
                Your Current Roles
              </h3>
              <div className="flex flex-wrap gap-2">
                {currentRoles.map((role) => (
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${ROLE_INFO[role].color}`}
                    key={role}
                  >
                    {ROLE_INFO[role].icon}
                    <span className="font-medium">{ROLE_INFO[role].label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div>
              <h3 className="mb-3 font-medium text-muted-foreground text-sm">
                Pending Requests
              </h3>
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <div
                    className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-3"
                    key={request.role}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "rounded-lg p-2",
                          ROLE_INFO[request.role].bgColor
                        )}
                      >
                        {ROLE_INFO[request.role].icon}
                      </div>
                      <div>
                        <span className="font-medium">
                          {ROLE_INFO[request.role].label}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-yellow-600">
                          <Clock className="h-3 w-3" />
                          Awaiting admin approval
                        </div>
                      </div>
                    </div>
                    <Button
                      disabled={cancellingRole === request.role}
                      onClick={() => handleCancelRequest(request.role)}
                      size="sm"
                      variant="ghost"
                    >
                      {cancellingRole === request.role ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="mr-1 h-4 w-4" />
                          Cancel
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Roles to Request */}
          {availableRoles.length > 0 ? (
            <div>
              <h3 className="mb-3 font-medium text-muted-foreground text-sm">
                Request a Role
              </h3>
              <div className="space-y-3">
                {availableRoles.map((role) => (
                  <button
                    className={cn(
                      "flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors",
                      selectedRole === role
                        ? "border-primary bg-primary/5"
                        : "hover:border-gray-300 hover:bg-gray-50"
                    )}
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    type="button"
                  >
                    <div
                      className={cn(
                        "mt-0.5 rounded-lg p-2",
                        ROLE_INFO[role].bgColor
                      )}
                    >
                      {ROLE_INFO[role].icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{ROLE_INFO[role].label}</h4>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {ROLE_INFO[role].description}
                      </p>
                    </div>
                    {selectedRole === role && (
                      <Check className="mt-1 h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              {/* Submit Button */}
              <div className="mt-4 flex justify-end">
                <Button
                  disabled={!selectedRole || isSubmitting}
                  onClick={handleSubmitRequest}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </div>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-green-700">
                You already have all available roles in this organization.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
