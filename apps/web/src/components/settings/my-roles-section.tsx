"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Check, Star } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMembershipContext } from "@/providers/membership-provider";

type FunctionalRole = "coach" | "parent" | "admin" | "player";

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
      return role;
  }
}

function getRoleDashboardPath(orgId: string, role: FunctionalRole): string {
  switch (role) {
    case "coach":
      return `/orgs/${orgId}/coach`;
    case "parent":
      return `/orgs/${orgId}/parents`;
    case "admin":
      return `/orgs/${orgId}/admin`;
    case "player":
      return `/orgs/${orgId}/player`;
    default:
      return `/orgs/${orgId}`;
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
      return "";
  }
}

/**
 * MyRolesSection — shows the user's functional roles for the current org,
 * lets them set a primary role (the default dashboard after login).
 * Accessible from any role's settings page.
 */
export function MyRolesSection() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { getMembershipForOrg } = useMembershipContext();
  const membership = getMembershipForOrg(orgId);
  const [settingPrimary, setSettingPrimary] = useState<FunctionalRole | null>(
    null
  );

  const setPrimaryRole = useMutation(
    api.models.members.setPrimaryFunctionalRole
  );

  if (!membership || membership.functionalRoles.length === 0) {
    return null;
  }

  const handleSetPrimary = async (role: FunctionalRole) => {
    if (settingPrimary) {
      return;
    }
    setSettingPrimary(role);
    try {
      await setPrimaryRole({ organizationId: orgId, functionalRole: role });
      toast.success(`${getRoleLabel(role)} is now your primary role`, {
        description: "You'll land on this dashboard the next time you log in.",
      });
    } catch (error) {
      toast.error("Failed to set primary role", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setSettingPrimary(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          My Roles
        </CardTitle>
        <CardDescription>
          Set your primary role to choose which dashboard you land on after
          logging in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {membership.functionalRoles.map((role) => {
          const isPrimary = membership.primaryFunctionalRole === role;
          const isSettingThis = settingPrimary === role;
          return (
            <div
              className="flex items-center justify-between rounded-lg border p-3"
              key={role}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {getRoleLabel(role)}
                  </span>
                  {isPrimary && (
                    <Badge className="gap-1 text-xs" variant="secondary">
                      <Check className="h-3 w-3" />
                      Primary
                    </Badge>
                  )}
                </div>
                <div className="text-muted-foreground text-xs">
                  {getRoleDescription(role)}
                </div>
                <div className="text-muted-foreground text-xs">
                  Dashboard:{" "}
                  <span className="font-mono">
                    {getRoleDashboardPath(orgId, role)}
                  </span>
                </div>
              </div>
              {!isPrimary && (
                <Button
                  disabled={isSettingThis || settingPrimary !== null}
                  onClick={() => handleSetPrimary(role)}
                  size="sm"
                  variant="outline"
                >
                  {isSettingThis ? "Setting..." : "Set as primary"}
                </Button>
              )}
            </div>
          );
        })}
        {!membership.primaryFunctionalRole && (
          <p className="text-muted-foreground text-xs">
            No primary role set — your most recently used role will be selected
            on login.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
