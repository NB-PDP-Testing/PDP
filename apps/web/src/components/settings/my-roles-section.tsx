"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Check, ChevronDown, ChevronUp, Star, UserPlus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
 * lets them set a primary role (the default dashboard after login),
 * and allows non-player members to self-register as a player (US-P6-003).
 */
export function MyRolesSection() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { getMembershipForOrg } = useMembershipContext();
  const membership = getMembershipForOrg(orgId);
  const [settingPrimary, setSettingPrimary] = useState<FunctionalRole | null>(
    null
  );

  // Register as player state
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [dob, setDob] = useState("");
  const [teamId, setTeamId] = useState<string>("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);

  const setPrimaryRole = useMutation(
    api.models.members.setPrimaryFunctionalRole
  );
  const selfRegister = useMutation(
    api.models.orgPlayerEnrollments.selfRegisterAsPlayer
  );

  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  if (!membership || membership.functionalRoles.length === 0) {
    return null;
  }

  const hasPlayerRole = membership.functionalRoles.includes("player");

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

  const handleRegisterAsPlayer = async () => {
    if (!dob) {
      toast.error("Date of birth is required");
      return;
    }
    setIsRegistering(true);
    try {
      const result = await selfRegister({
        organizationId: orgId,
        dateOfBirth: dob,
        teamId: teamId || undefined,
      });

      setRegistrationSubmitted(true);
      setShowRegisterForm(false);

      if (result.matchConfidence === "high") {
        toast.success("Registration submitted", {
          description:
            "A youth profile may match your record. An admin will review and link your history.",
        });
      } else {
        toast.success("Registration submitted", {
          description:
            "Your player registration is with the admin for review. You'll be notified when approved.",
        });
      }
    } catch (error) {
      toast.error("Registration failed", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsRegistering(false);
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

        {/* Add a role section — only visible when user doesn't have player role */}
        {!(hasPlayerRole || registrationSubmitted) && (
          <div className="border-t pt-3">
            <Button
              className="w-full justify-between"
              onClick={() => setShowRegisterForm((prev) => !prev)}
              size="sm"
              variant="ghost"
            >
              <span className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add a role
              </span>
              {showRegisterForm ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {showRegisterForm && (
              <div className="mt-3 space-y-3 rounded-lg border p-3">
                <p className="font-medium text-sm">Register as a player</p>
                <p className="text-muted-foreground text-xs">
                  Join as a player in this organisation. An admin will review
                  and approve your request.
                </p>

                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="reg-dob">
                    Date of birth <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="reg-dob"
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setDob(e.target.value)}
                    type="date"
                    value={dob}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="reg-team">
                    Team (optional)
                  </Label>
                  <Select onValueChange={setTeamId} value={teamId}>
                    <SelectTrigger id="reg-team">
                      <SelectValue placeholder="Select a team (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams?.map((team: { _id: string; name: string }) => (
                        <SelectItem key={team._id} value={team._id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={!dob || isRegistering}
                    onClick={handleRegisterAsPlayer}
                    size="sm"
                  >
                    {isRegistering ? "Submitting..." : "Submit registration"}
                  </Button>
                  <Button
                    onClick={() => setShowRegisterForm(false)}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submitted confirmation */}
        {registrationSubmitted && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 text-sm">
            <p className="font-medium">Registration submitted</p>
            <p className="mt-0.5 text-xs">
              Your player registration is with the admin for review. You&apos;ll
              be notified when approved.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
