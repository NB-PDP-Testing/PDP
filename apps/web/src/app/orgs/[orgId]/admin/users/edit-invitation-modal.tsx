"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

type EditInvitationModalProps = {
  invitation: any;
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function EditInvitationModal({
  invitation,
  organizationId,
  onClose,
  onSuccess,
}: EditInvitationModalProps) {
  const [functionalRoles, setFunctionalRoles] = useState<
    ("coach" | "parent" | "admin")[]
  >([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const updateMetadata = useMutation(
    api.models.members.updateInvitationMetadata
  );

  // Load existing teams and players
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId,
  });
  const players = useQuery(api.models.orgPlayerEnrollments.getPlayersForOrg, {
    organizationId,
  });

  // Initialize state from invitation metadata
  useEffect(() => {
    if (invitation?.metadata) {
      const metadata = invitation.metadata;
      setFunctionalRoles(metadata.suggestedFunctionalRoles || []);
      setSelectedTeams(
        metadata.roleSpecificData?.teams?.map(
          (t: { _id?: string } & Record<string, unknown>) =>
            t._id || (t as unknown as string)
        ) || []
      );
      setSelectedPlayerIds(metadata.suggestedPlayerLinks || []);
    }
  }, [invitation]);

  const handleRoleToggle = (role: "coach" | "parent" | "admin") => {
    setFunctionalRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleSave = async () => {
    if (functionalRoles.length === 0) {
      toast.error("Please select at least one role");
      return;
    }

    if (
      functionalRoles.includes("coach") &&
      (!selectedTeams || selectedTeams.length === 0)
    ) {
      toast.error("Please select at least one team for the coach role");
      return;
    }

    if (
      functionalRoles.includes("parent") &&
      (!selectedPlayerIds || selectedPlayerIds.length === 0)
    ) {
      toast.error("Please select at least one player for the parent role");
      return;
    }

    setSaving(true);
    try {
      // Prepare team metadata
      const teamMetadata = selectedTeams.map((teamId) => {
        const team = teams?.find((t: { _id: string }) => t._id === teamId);
        return {
          _id: teamId,
          name: team?.name || "Unknown Team",
        };
      });

      // Build metadata
      const metadata = {
        suggestedFunctionalRoles: functionalRoles,
        roleSpecificData: {
          teams: functionalRoles.includes("coach") ? teamMetadata : [],
        },
        suggestedPlayerLinks: functionalRoles.includes("parent")
          ? selectedPlayerIds
          : [],
      };

      const result = await updateMetadata({
        invitationId: invitation._id,
        metadata,
      });

      if (result.success) {
        toast.success("Invitation updated successfully");
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || "Failed to update invitation");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update invitation");
    } finally {
      setSaving(false);
    }
  };

  const filteredPlayers = players?.filter((player) =>
    `${player.firstName} ${player.lastName}`
      .toLowerCase()
      .includes(playerSearch.toLowerCase())
  );

  return (
    <Dialog onOpenChange={onClose} open>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Invitation</DialogTitle>
          <p className="text-muted-foreground text-sm">
            Updating invitation for {invitation.email}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-6">
            {/* Functional Roles */}
            <div>
              <Label className="mb-2 block">Functional Roles *</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={functionalRoles.includes("coach")}
                    id="role-coach"
                    onCheckedChange={() => handleRoleToggle("coach")}
                  />
                  <label
                    className="cursor-pointer font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    htmlFor="role-coach"
                  >
                    Coach
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={functionalRoles.includes("parent")}
                    id="role-parent"
                    onCheckedChange={() => handleRoleToggle("parent")}
                  />
                  <label
                    className="cursor-pointer font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    htmlFor="role-parent"
                  >
                    Parent/Guardian
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={functionalRoles.includes("admin")}
                    id="role-admin"
                    onCheckedChange={() => handleRoleToggle("admin")}
                  />
                  <label
                    className="cursor-pointer font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    htmlFor="role-admin"
                  >
                    Admin
                  </label>
                </div>
              </div>
            </div>

            {/* Team Assignment (for coaches) */}
            {functionalRoles.includes("coach") && (
              <div>
                <Label className="mb-2 block">Assign to Teams *</Label>
                {teams ? (
                  teams.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No teams available
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {teams.map(
                        (team: {
                          _id: string;
                          name?: string;
                          ageGroup?: string;
                        }) => (
                          <div
                            className="flex items-center space-x-2"
                            key={team._id}
                          >
                            <Checkbox
                              checked={selectedTeams.includes(team._id)}
                              id={`team-${team._id}`}
                              onCheckedChange={() => handleTeamToggle(team._id)}
                            />
                            <label
                              className="cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              htmlFor={`team-${team._id}`}
                            >
                              {team.name}
                              {team.ageGroup && (
                                <Badge className="ml-2" variant="outline">
                                  {team.ageGroup}
                                </Badge>
                              )}
                            </label>
                          </div>
                        )
                      )}
                    </div>
                  )
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Loading teams...
                  </p>
                )}
              </div>
            )}

            {/* Player Links (for parents) */}
            {functionalRoles.includes("parent") && (
              <div>
                <Label className="mb-2 block">Link to Players *</Label>
                <Input
                  className="mb-2"
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  placeholder="Search players..."
                  value={playerSearch}
                />
                {players ? (
                  filteredPlayers && filteredPlayers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No players found
                    </p>
                  ) : (
                    <div className="max-h-[200px] space-y-2 overflow-y-auto">
                      {filteredPlayers?.map((player) => (
                        <div
                          className="flex items-center space-x-2"
                          key={player.playerIdentityId}
                        >
                          <Checkbox
                            checked={selectedPlayerIds.includes(
                              player.playerIdentityId
                            )}
                            id={`player-${player.playerIdentityId}`}
                            onCheckedChange={() =>
                              handlePlayerToggle(player.playerIdentityId)
                            }
                          />
                          <label
                            className="cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            htmlFor={`player-${player.playerIdentityId}`}
                          >
                            {player.firstName} {player.lastName}
                            {player.ageGroup && (
                              <Badge className="ml-2" variant="outline">
                                {player.ageGroup}
                              </Badge>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Loading players...
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button disabled={saving} onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={saving} onClick={handleSave}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
