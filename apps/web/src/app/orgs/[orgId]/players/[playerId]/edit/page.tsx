"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Loader2, Save, User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";

export default function EditPlayerPassportPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const playerId = params.playerId as string;

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
    playerNotes: "",
  });

  // Get current user session for permission checks
  const { data: session } = authClient.useSession();
  const { data: member } = authClient.useActiveMember();
  const currentUserRoles = (member as any)?.functionalRoles || [];
  const isAdmin = currentUserRoles.includes("admin");

  // Query player identity data
  const playerIdentity = useQuery(api.models.playerIdentities.getPlayerById, {
    playerIdentityId: playerId as Id<"playerIdentities">,
  });

  // Query enrollment data
  const enrollment = useQuery(api.models.orgPlayerEnrollments.getEnrollment, {
    playerIdentityId: playerId as Id<"playerIdentities">,
    organizationId: orgId,
  });

  // Query sports reference data
  const sports = useQuery(api.models.referenceData.getSports);

  // Helper: Sport code to display name mapping
  const sportCodeToName = useMemo(() => {
    const map = new Map<string, string>();
    sports?.forEach((sport) => {
      map.set(sport.code, sport.name);
    });
    return map;
  }, [sports]);

  const getSportDisplayName = (sportCode: string | undefined) => {
    if (!sportCode) return "Unknown";
    return sportCodeToName.get(sportCode) || sportCode;
  };

  // Query current teams for player (Phase 1 immediate fix)
  const currentTeams = useQuery(
    api.models.teamPlayerIdentities.getCurrentTeamsForPlayer,
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
  const addPlayerToTeam = useMutation(
    api.models.teamPlayerIdentities.addPlayerToTeam
  );
  const removePlayerFromTeam = useMutation(
    api.models.teamPlayerIdentities.removePlayerFromTeam
  );

  // Populate form when data loads
  useEffect(() => {
    if (playerIdentity) {
      setFormData((prev) => ({
        ...prev,
        firstName: playerIdentity.firstName || "",
        lastName: playerIdentity.lastName || "",
        email: playerIdentity.email || "",
        dateOfBirth: playerIdentity.dateOfBirth || "",
        gender: playerIdentity.gender || "male",
      }));
    }
    if (enrollment) {
      setFormData((prev) => ({
        ...prev,
        ageGroup: enrollment.ageGroup || "",
        coachNotes: enrollment.coachNotes || "",
      }));
    }
  }, [playerIdentity, enrollment]);

  // Initialize selected teams from current teams data
  useEffect(() => {
    if (currentTeams) {
      const currentTeamIds = currentTeams
        .filter((t) => t.isCurrentlyOn)
        .map((t) => t.teamId);
      setSelectedTeamIds(currentTeamIds);
    }
  }, [currentTeams]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update player identity (DOB is read-only and not updated)
      await updatePlayerIdentity({
        playerIdentityId: playerId as Id<"playerIdentities">,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        gender: formData.gender,
      });

      // Update enrollment if exists
      if (enrollment) {
        await updateEnrollment({
          enrollmentId: enrollment._id,
          ageGroup: formData.ageGroup || undefined,
          coachNotes: formData.coachNotes || undefined,
        });
      }

      // Update team assignments
      if (currentTeams && session?.user?.email) {
        const currentTeamIds = currentTeams
          .filter((t) => t.isCurrentlyOn)
          .map((t) => t.teamId);

        // Teams to add (in selected but not in current)
        const teamsToAdd = selectedTeamIds.filter(
          (id) => !currentTeamIds.includes(id)
        );

        // Teams to remove (in current but not in selected)
        const teamsToRemove = currentTeamIds.filter(
          (id) => !selectedTeamIds.includes(id)
        );

        // Add to new teams
        for (const teamId of teamsToAdd) {
          try {
            await addPlayerToTeam({
              teamId,
              playerIdentityId: playerId as Id<"playerIdentities">,
              organizationId: orgId,
            });
          } catch (error) {
            console.error(`Failed to add to team ${teamId}:`, error);
            toast.error("Failed to add to one or more teams", {
              description:
                error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        // Remove from old teams
        for (const teamId of teamsToRemove) {
          try {
            await removePlayerFromTeam({
              teamId,
              playerIdentityId: playerId as Id<"playerIdentities">,
              organizationId: orgId,
              userEmail: session.user.email,
            });
          } catch (error) {
            console.error(`Failed to remove from team ${teamId}:`, error);
            // Show specific error for core team protection
            if (error instanceof Error && error.message.includes("core team")) {
              toast.error("Cannot remove from core team", {
                description: error.message,
              });
            } else {
              toast.error("Failed to remove from one or more teams", {
                description:
                  error instanceof Error ? error.message : "Unknown error",
              });
            }
          }
        }
      }

      toast.success("Player updated successfully");
      router.push(`/orgs/${orgId}/players/${playerId}`);
    } catch (error) {
      toast.error("Failed to update player", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (playerIdentity === undefined) {
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
        <Button onClick={() => router.push(`/orgs/${orgId}/players` as any)}>
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
          onClick={() => router.push(`/orgs/${orgId}/players/${playerId}`)}
          size="sm"
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Passport
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-2xl">Edit Player Profile</h1>
          <p className="text-muted-foreground text-sm">
            Update player information and notes
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
                their account.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  disabled
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                />
                <p className="text-muted-foreground text-xs">
                  Date of birth cannot be edited after registration
                </p>
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

        {/* Enrollment & Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollment & Notes</CardTitle>
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
                placeholder="Notes from coaches about this player..."
                rows={4}
                value={formData.coachNotes}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="playerNotes">Player Notes</Label>
              <Textarea
                id="playerNotes"
                onChange={(e) =>
                  setFormData({ ...formData, playerNotes: e.target.value })
                }
                placeholder="Notes from the player..."
                rows={4}
                value={formData.playerNotes}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Assignment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Team Assignments</CardTitle>
          <CardDescription>
            Select which teams this player is assigned to
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentTeams === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : currentTeams.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No teams found for this player.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentTeams.map((team: any) => {
                const isSelected = selectedTeamIds.includes(team.teamId);
                // Core teams should always be disabled for non-admins (cannot be checked or unchecked)
                const isDisabled = team.isCoreTeam && !isAdmin;

                return (
                  <div
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                    key={team.teamId}
                  >
                    <input
                      checked={isSelected}
                      className="h-4 w-4 cursor-pointer"
                      disabled={isDisabled}
                      id={`team-${team.teamId}`}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTeamIds([...selectedTeamIds, team.teamId]);
                        } else {
                          setSelectedTeamIds(
                            selectedTeamIds.filter((id) => id !== team.teamId)
                          );
                        }
                      }}
                      type="checkbox"
                    />
                    <label
                      className="flex flex-1 cursor-pointer items-center gap-2"
                      htmlFor={`team-${team.teamId}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{team.teamName}</span>
                          {team.isCoreTeam && (
                            <Badge className="gap-1" variant="secondary">
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              Core Team
                            </Badge>
                          )}
                          {isDisabled && (
                            <svg
                              className="h-3 w-3 text-muted-foreground"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <span>{team.ageGroup}</span>
                          <span>•</span>
                          <span>{getSportDisplayName(team.sportCode)}</span>
                        </div>
                      </div>

                      {/* Eligibility Status Badge */}
                      <div className="flex items-center gap-1">
                        {team.eligibilityStatus === "eligible" && (
                          <Badge className="gap-1" variant="outline">
                            <svg
                              className="h-3 w-3 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Eligible
                          </Badge>
                        )}
                        {team.eligibilityStatus === "requiresOverride" && (
                          <Badge className="gap-1" variant="outline">
                            <svg
                              className="h-3 w-3 text-yellow-500"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Requires Override
                          </Badge>
                        )}
                        {team.eligibilityStatus === "hasOverride" && (
                          <Badge className="gap-1" variant="outline">
                            <svg
                              className="h-3 w-3 text-blue-500"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Override Active
                          </Badge>
                        )}
                        {team.eligibilityStatus === "ineligible" && (
                          <Badge className="gap-1" variant="destructive">
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Ineligible
                          </Badge>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}

              {/* Help Text */}
              {!isAdmin && currentTeams.some((t) => t.isCoreTeam) && (
                <div className="rounded-lg border-blue-200 bg-blue-50 p-3 text-blue-900 text-sm">
                  <p className="font-medium">Core Team Protection</p>
                  <p className="mt-1 text-xs">
                    Core teams are locked and cannot be changed. Contact an
                    admin if you need to modify core team assignments.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
