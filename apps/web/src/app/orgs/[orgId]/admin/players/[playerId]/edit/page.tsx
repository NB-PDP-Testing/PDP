"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Save,
  Shield,
  User,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";

export default function EditPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const playerId = params.playerId as string;

  const { data: session } = authClient.useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    gender: "male" as "male" | "female" | "other",
    ageGroup: "",
    coachNotes: "",
    adminNotes: "",
  });

  // Query player identity data
  const playerIdentity = useQuery(api.models.playerIdentities.getPlayerById, {
    playerIdentityId: playerId as Id<"playerIdentities">,
  });

  // Query enrollment data
  const enrollment = useQuery(api.models.orgPlayerEnrollments.getEnrollment, {
    playerIdentityId: playerId as Id<"playerIdentities">,
    organizationId: orgId,
  });

  // Query eligible teams
  const eligibleTeams = useQuery(
    api.models.teamPlayerIdentities.getEligibleTeamsForPlayer,
    {
      playerIdentityId: playerId as Id<"playerIdentities">,
      organizationId: orgId,
    }
  );

  // Mutations
  const updatePlayerIdentity = useMutation(
    api.models.playerIdentities.updatePlayerIdentity
  );
  const updateEnrollment = useMutation(
    api.models.orgPlayerEnrollments.updateEnrollment
  );
  const updatePlayerTeams = useMutation(
    api.models.teamPlayerIdentities.updatePlayerTeams
  );

  // Helper to format date for date input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | undefined) => {
    if (!dateString) {
      return "";
    }
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  };

  // Populate form when data loads
  useEffect(() => {
    if (playerIdentity && enrollment) {
      setFormData({
        firstName: playerIdentity.firstName || "",
        lastName: playerIdentity.lastName || "",
        email: playerIdentity.email || "",
        dateOfBirth: formatDateForInput(playerIdentity.dateOfBirth),
        gender: playerIdentity.gender || "male",
        ageGroup: enrollment.ageGroup || "",
        coachNotes: enrollment.coachNotes || "",
        adminNotes: enrollment.adminNotes || "",
      });
    }
  }, [playerIdentity, enrollment, formatDateForInput]);

  // Initialize selected teams
  useEffect(() => {
    if (eligibleTeams) {
      const currentTeams = eligibleTeams
        .filter((t) => t.isCurrentlyOn)
        .map((t) => t.teamId);
      setSelectedTeamIds(currentTeams);
    }
  }, [eligibleTeams]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update player identity
      await updatePlayerIdentity({
        playerIdentityId: playerId as Id<"playerIdentities">,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
      });

      // Update enrollment if exists
      if (enrollment) {
        await updateEnrollment({
          enrollmentId: enrollment._id,
          ageGroup: formData.ageGroup || undefined,
          coachNotes: formData.coachNotes || undefined,
          adminNotes: formData.adminNotes || undefined,
        });
      }

      // Update teams
      if (session?.user?.email) {
        const result = await updatePlayerTeams({
          playerIdentityId: playerId as Id<"playerIdentities">,
          organizationId: orgId,
          teamIds: selectedTeamIds,
          userEmail: session.user.email,
        });

        if (result.errors.length > 0) {
          toast.error("Some team changes failed", {
            description: result.errors.join(", "),
          });
        }
      }

      toast.success("Player updated successfully");
      router.push(`/orgs/${orgId}/admin/players`);
    } catch (error) {
      toast.error("Failed to update player", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (playerIdentity === undefined || enrollment === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found state
  if (playerIdentity === null) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <User className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 font-semibold text-lg">Player Not Found</h2>
        <p className="mb-4 text-muted-foreground">
          The player you're looking for doesn't exist.
        </p>
        <Button onClick={() => router.push(`/orgs/${orgId}/admin/players`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Players
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => router.push(`/orgs/${orgId}/admin/players`)}
          size="sm"
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-2xl">Edit Player</h1>
          <p className="text-muted-foreground text-sm">
            Update player information and enrollment details
          </p>
        </div>
        <Button disabled={isSaving} onClick={handleSave}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Player Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <User className="h-7 w-7 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg">
              {playerIdentity.firstName} {playerIdentity.lastName}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{playerIdentity.playerType}</Badge>
              {enrollment && (
                <Badge
                  variant={
                    enrollment.status === "active" ? "default" : "secondary"
                  }
                >
                  {enrollment.status}
                </Badge>
              )}
              {playerIdentity.dateOfBirth && (
                <span className="text-muted-foreground text-sm">
                  • DOB:{" "}
                  {new Date(playerIdentity.dateOfBirth).toLocaleDateString()}
                </span>
              )}
              {enrollment?.ageGroup && (
                <span className="text-muted-foreground text-sm">
                  • {enrollment.ageGroup}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Player identity details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  placeholder="First name"
                  value={formData.firstName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  placeholder="Last name"
                  value={formData.lastName}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="player@example.com"
                type="email"
                value={formData.email}
              />
              <p className="text-muted-foreground text-xs">
                For adult players, this must match their login email to link
                their account to this player profile.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfBirth: e.target.value })
                  }
                  type="date"
                  value={formData.dateOfBirth}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      gender: value as "male" | "female" | "other",
                    })
                  }
                  value={formData.gender}
                >
                  <SelectTrigger id="gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrollment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Details</CardTitle>
            <CardDescription>Organization-specific information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ageGroup">Age Group</Label>
              <Input
                id="ageGroup"
                onChange={(e) =>
                  setFormData({ ...formData, ageGroup: e.target.value })
                }
                placeholder="e.g., U12, U14, Senior"
                value={formData.ageGroup}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coachNotes">Coach Notes</Label>
              <Textarea
                id="coachNotes"
                onChange={(e) =>
                  setFormData({ ...formData, coachNotes: e.target.value })
                }
                placeholder="Notes from coaches..."
                rows={3}
                value={formData.coachNotes}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminNotes">Admin Notes</Label>
              <Textarea
                id="adminNotes"
                onChange={(e) =>
                  setFormData({ ...formData, adminNotes: e.target.value })
                }
                placeholder="Administrative notes..."
                rows={3}
                value={formData.adminNotes}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Assignments - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>Team Assignments</CardTitle>
          <CardDescription>
            Select which teams this player is on. Core teams are automatically
            assigned based on age group and sport.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eligibleTeams && eligibleTeams.length > 0 ? (
            <div className="space-y-4">
              {/* Current Teams */}
              {eligibleTeams.filter((t) => t.isCurrentlyOn).length > 0 && (
                <div>
                  <h3 className="mb-2 font-medium text-sm">
                    Current Teams (
                    {eligibleTeams.filter((t) => t.isCurrentlyOn).length})
                  </h3>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {eligibleTeams
                      .filter((team) => team.isCurrentlyOn)
                      .map((team) => {
                        const isSelected = selectedTeamIds.includes(
                          team.teamId
                        );
                        const isDisabled =
                          team.isCoreTeam ||
                          team.eligibilityStatus === "ineligible";

                        return (
                          <div
                            className="flex items-start gap-3 rounded-lg border p-3"
                            key={team.teamId}
                          >
                            <Checkbox
                              checked={isSelected}
                              className="mt-0.5"
                              disabled={isDisabled}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTeamIds([
                                    ...selectedTeamIds,
                                    team.teamId,
                                  ]);
                                } else {
                                  setSelectedTeamIds(
                                    selectedTeamIds.filter(
                                      (id) => id !== team.teamId
                                    )
                                  );
                                }
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-medium text-sm">
                                  {team.teamName}
                                </span>
                                {team.isCoreTeam && (
                                  <Badge
                                    className="gap-1 text-xs"
                                    variant="default"
                                  >
                                    <Shield className="h-2.5 w-2.5" />
                                    Core
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground text-xs">
                                {team.ageGroup} • {team.sportCode}
                              </p>
                              {team.eligibilityStatus === "hasOverride" && (
                                <Badge
                                  className="mt-1 gap-1 text-xs"
                                  variant="secondary"
                                >
                                  <Shield className="h-2.5 w-2.5" />
                                  Override
                                </Badge>
                              )}
                              {team.eligibilityStatus ===
                                "requiresOverride" && (
                                <Badge
                                  className="mt-1 gap-1 border-yellow-500 text-xs text-yellow-700"
                                  variant="outline"
                                >
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  Needs Approval
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Available Teams (Eligible only) */}
              {eligibleTeams.filter(
                (t) => !t.isCurrentlyOn && t.eligibilityStatus === "eligible"
              ).length > 0 && (
                <div>
                  <h3 className="mb-2 font-medium text-sm">
                    Available Teams (
                    {
                      eligibleTeams.filter(
                        (t) =>
                          !t.isCurrentlyOn && t.eligibilityStatus === "eligible"
                      ).length
                    }
                    )
                  </h3>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {eligibleTeams
                      .filter(
                        (team) =>
                          !team.isCurrentlyOn &&
                          team.eligibilityStatus === "eligible"
                      )
                      .map((team) => {
                        const isSelected = selectedTeamIds.includes(
                          team.teamId
                        );

                        return (
                          <div
                            className="flex items-start gap-3 rounded-lg border border-dashed p-3"
                            key={team.teamId}
                          >
                            <Checkbox
                              checked={isSelected}
                              className="mt-0.5"
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTeamIds([
                                    ...selectedTeamIds,
                                    team.teamId,
                                  ]);
                                } else {
                                  setSelectedTeamIds(
                                    selectedTeamIds.filter(
                                      (id) => id !== team.teamId
                                    )
                                  );
                                }
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-sm">
                                {team.teamName}
                              </span>
                              <p className="text-muted-foreground text-xs">
                                {team.ageGroup} • {team.sportCode}
                              </p>
                              <Badge
                                className="mt-1 gap-1 border-green-500 text-green-700 text-xs"
                                variant="outline"
                              >
                                <CheckCircle className="h-2.5 w-2.5" />
                                Eligible
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Teams Requiring Approval */}
              {eligibleTeams.filter(
                (t) =>
                  !t.isCurrentlyOn && t.eligibilityStatus === "requiresOverride"
              ).length > 0 && (
                <div>
                  <h3 className="mb-2 font-medium text-sm">
                    Needs Approval (
                    {
                      eligibleTeams.filter(
                        (t) =>
                          !t.isCurrentlyOn &&
                          t.eligibilityStatus === "requiresOverride"
                      ).length
                    }
                    )
                  </h3>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {eligibleTeams
                      .filter(
                        (team) =>
                          !team.isCurrentlyOn &&
                          team.eligibilityStatus === "requiresOverride"
                      )
                      .map((team) => {
                        const isSelected = selectedTeamIds.includes(
                          team.teamId
                        );

                        return (
                          <div
                            className="flex items-start gap-3 rounded-lg border border-yellow-300 border-dashed bg-yellow-50/50 p-3"
                            key={team.teamId}
                          >
                            <Checkbox
                              checked={isSelected}
                              className="mt-0.5"
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTeamIds([
                                    ...selectedTeamIds,
                                    team.teamId,
                                  ]);
                                } else {
                                  setSelectedTeamIds(
                                    selectedTeamIds.filter(
                                      (id) => id !== team.teamId
                                    )
                                  );
                                }
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-sm">
                                {team.teamName}
                              </span>
                              <p className="text-muted-foreground text-xs">
                                {team.ageGroup} • {team.sportCode}
                              </p>
                              <Badge
                                className="mt-1 gap-1 border-yellow-500 text-xs text-yellow-700"
                                variant="outline"
                              >
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Needs Approval
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Ineligible Teams */}
              {eligibleTeams.filter((t) => t.eligibilityStatus === "ineligible")
                .length > 0 && (
                <details className="group">
                  <summary className="flex cursor-pointer items-center gap-2 font-medium text-muted-foreground text-sm">
                    <span>
                      Ineligible Teams (
                      {
                        eligibleTeams.filter(
                          (t) => t.eligibilityStatus === "ineligible"
                        ).length
                      }
                      )
                    </span>
                  </summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {eligibleTeams
                      .filter((team) => team.eligibilityStatus === "ineligible")
                      .map((team) => (
                        <div
                          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 opacity-60"
                          key={team.teamId}
                        >
                          <Checkbox
                            checked={false}
                            className="mt-0.5"
                            disabled
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-sm">
                              {team.teamName}
                            </span>
                            <p className="text-muted-foreground text-xs">
                              {team.ageGroup} • {team.sportCode}
                            </p>
                            <Badge
                              className="mt-1 gap-1 text-xs"
                              variant="destructive"
                            >
                              Ineligible
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </details>
              )}

              {eligibleTeams.some((t) => t.isCoreTeam) && (
                <p className="text-muted-foreground text-xs">
                  * Core teams are automatically assigned and cannot be removed
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Loading teams...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
