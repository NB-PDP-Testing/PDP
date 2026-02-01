"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Edit2,
  FileText,
  Loader2,
  Save,
  User,
  Users,
  X,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";

type PlayerWithNotes = {
  enrollmentId: Id<"orgPlayerEnrollments">;
  playerIdentityId: Id<"playerIdentities">;
  playerName: string;
  ageGroup: string;
  teams: string[];
  coachNotes: string;
  lastUpdated?: number;
};

export default function CoachNotesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;
  const currentUser = useCurrentUser();
  const userId = currentUser?._id;
  const highlightedPlayerId = searchParams.get("player");
  const initializedRef = useRef(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Get coach's players
  const enrolledPlayersData = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForCoachTeams,
    userId && orgId
      ? {
          organizationId: orgId,
          coachUserId: userId,
        }
      : "skip"
  );

  // Get team data for display
  const teamPlayerLinks = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    { organizationId: orgId, status: "active" }
  );

  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // Get all passports for org - needed because voice notes write to sportPassports.coachNotes
  // while the enrollment may not have coachNotes set (same logic as getFullPlayerPassportView)
  const orgPassports = useQuery(api.models.sportPassports.getPassportsForOrg, {
    organizationId: orgId,
  });

  // Build a map of playerIdentityId -> passport for quick lookup
  // Players can have multiple sport passports - we need to find the one with coachNotes
  const passportByPlayerId = useMemo(() => {
    if (!orgPassports) {
      return new Map<string, { coachNotes?: string; updatedAt?: number }>();
    }
    const map = new Map<string, { coachNotes?: string; updatedAt?: number }>();
    for (const passport of orgPassports) {
      const existing = map.get(passport.playerIdentityId);
      // Prefer passport with coachNotes over one without
      // If neither has notes, prefer the one with latest updatedAt
      const hasNotes = Boolean(passport.coachNotes?.trim());
      const existingHasNotes = Boolean(existing?.coachNotes?.trim());

      if (!existing || (hasNotes && !existingHasNotes)) {
        map.set(passport.playerIdentityId, {
          coachNotes: passport.coachNotes,
          updatedAt: passport.updatedAt,
        });
      } else if (hasNotes && existingHasNotes) {
        // Both have notes - merge them (use most recent updatedAt)
        const mergedNotes = [existing.coachNotes, passport.coachNotes]
          .filter(Boolean)
          .join("\n\n---\n\n");
        map.set(passport.playerIdentityId, {
          coachNotes: mergedNotes,
          updatedAt: Math.max(existing.updatedAt || 0, passport.updatedAt || 0),
        });
      }
    }
    return map;
  }, [orgPassports]);

  // Mutation for updating notes
  const updateEnrollment = useMutation(
    api.models.orgPlayerEnrollments.updateEnrollment
  );

  // Transform data to get players with notes
  // Uses same logic as getFullPlayerPassportView: enrollment.coachNotes ?? passport.coachNotes
  const playersWithNotes = useMemo(() => {
    if (!enrolledPlayersData) {
      return [];
    }

    const result: PlayerWithNotes[] = [];

    for (const { enrollment, player } of enrolledPlayersData) {
      // Get notes from enrollment first, fallback to passport (matches player passport view)
      const passportData = passportByPlayerId.get(player._id);
      const coachNotes =
        enrollment.coachNotes?.trim() || passportData?.coachNotes?.trim();

      if (!coachNotes) {
        continue;
      }

      // Get teams for this player
      const playerTeams: string[] = [];
      if (teamPlayerLinks && teams) {
        const links = teamPlayerLinks.filter(
          (link: any) => link.playerIdentityId === player._id
        );
        for (const link of links) {
          const team = teams.find((t: any) => t._id === link.teamId);
          if (team) {
            playerTeams.push(team.name);
          }
        }
      }

      // Use most recent update time from either source
      const lastUpdated =
        Math.max(enrollment.updatedAt || 0, passportData?.updatedAt || 0) ||
        undefined;

      result.push({
        enrollmentId: enrollment._id,
        playerIdentityId: player._id,
        playerName: `${player.firstName} ${player.lastName}`,
        ageGroup: enrollment.ageGroup,
        teams: playerTeams,
        coachNotes,
        lastUpdated,
      });
    }

    // Sort by last updated (most recent first)
    return result.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
  }, [enrolledPlayersData, teamPlayerLinks, teams, passportByPlayerId]);

  // All players (for adding notes to new players)
  // Uses combined notes logic: enrollment.coachNotes ?? passport.coachNotes
  const allPlayers = useMemo(() => {
    if (!enrolledPlayersData) {
      return [];
    }
    return enrolledPlayersData.map(({ enrollment, player }: any) => {
      const passportData = passportByPlayerId.get(player._id);
      const coachNotes =
        enrollment.coachNotes || passportData?.coachNotes || "";
      return {
        enrollmentId: enrollment._id,
        playerIdentityId: player._id,
        playerName: `${player.firstName} ${player.lastName}`,
        ageGroup: enrollment.ageGroup,
        coachNotes,
      };
    });
  }, [enrolledPlayersData, passportByPlayerId]);

  const playersWithoutNotes = useMemo(
    () => allPlayers.filter((p) => !p.coachNotes?.trim()),
    [allPlayers]
  );

  // Auto-open edit mode for highlighted player from URL
  useEffect(() => {
    if (initializedRef.current || !highlightedPlayerId || !allPlayers.length) {
      return;
    }

    // Find the player by identity ID
    const player = allPlayers.find(
      (p) => p.playerIdentityId === highlightedPlayerId
    );

    if (player) {
      setEditingId(player.enrollmentId);
      setEditingNotes(player.coachNotes || "");
      initializedRef.current = true;
    }
  }, [highlightedPlayerId, allPlayers]);

  const handleStartEdit = (player: PlayerWithNotes) => {
    setEditingId(player.enrollmentId);
    setEditingNotes(player.coachNotes);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingNotes("");
  };

  const handleSaveNotes = async (enrollmentId: Id<"orgPlayerEnrollments">) => {
    setIsSaving(true);
    try {
      await updateEnrollment({
        enrollmentId,
        coachNotes: editingNotes || undefined,
      });
      toast.success("Notes saved successfully");
      setEditingId(null);
      setEditingNotes("");
    } catch (error) {
      toast.error("Failed to save notes", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearNotes = async (enrollmentId: Id<"orgPlayerEnrollments">) => {
    // biome-ignore lint/suspicious/noAlert: Simple confirmation is appropriate for destructive action
    const confirmed = confirm(
      "Are you sure you want to delete all notes for this player?"
    );
    if (!confirmed) {
      return;
    }
    setIsSaving(true);
    try {
      await updateEnrollment({
        enrollmentId,
        coachNotes: "",
      });
      toast.success("Notes cleared");
    } catch (_error) {
      toast.error("Failed to clear notes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewPlayer = (playerIdentityId: string) => {
    router.push(`/orgs/${orgId}/players/${playerIdentityId}`);
  };

  const isLoading =
    enrolledPlayersData === undefined ||
    teamPlayerLinks === undefined ||
    teams === undefined ||
    orgPassports === undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => router.push(`/orgs/${orgId}/coach`)}
          size="sm"
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-2xl">Development Notes</h1>
          <p className="text-muted-foreground text-sm">
            View and edit coach notes for your players
          </p>
        </div>
        <Badge className="text-sm" variant="secondary">
          {playersWithNotes.length} player
          {playersWithNotes.length !== 1 ? "s" : ""} with notes
        </Badge>
      </div>

      {/* Notes List */}
      {playersWithNotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold text-lg">
              No Development Notes Yet
            </h3>
            <p className="mb-4 text-muted-foreground">
              You haven't added any development notes to your players.
            </p>
            <p className="text-muted-foreground text-sm">
              Use Voice Notes to record observations, or click on a player below
              to add notes directly.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {playersWithNotes.map((player) => (
            <Card className="overflow-hidden" key={player.enrollmentId}>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {player.playerName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge className="text-xs" variant="outline">
                          {player.ageGroup}
                        </Badge>
                        {player.teams.length > 0 && (
                          <span className="flex items-center gap-1 text-xs">
                            <Users className="h-3 w-3" />
                            {player.teams.length === 1
                              ? player.teams[0]
                              : `${player.teams.length} teams`}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleViewPlayer(player.playerIdentityId)}
                      size="sm"
                      variant="outline"
                    >
                      View Player
                    </Button>
                    {editingId !== player.enrollmentId && (
                      <Button
                        onClick={() => handleStartEdit(player)}
                        size="sm"
                        variant="default"
                      >
                        <Edit2 className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {editingId === player.enrollmentId ? (
                  <div className="space-y-3">
                    <Textarea
                      className="font-mono text-sm"
                      onChange={(e) => setEditingNotes(e.target.value)}
                      placeholder="Enter development notes..."
                      rows={6}
                      value={editingNotes}
                    />
                    <div className="flex justify-between">
                      <Button
                        disabled={isSaving}
                        onClick={() => handleClearNotes(player.enrollmentId)}
                        size="sm"
                        variant="destructive"
                      >
                        <X className="mr-1 h-4 w-4" />
                        Delete All
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          disabled={isSaving}
                          onClick={handleCancelEdit}
                          size="sm"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={isSaving}
                          onClick={() => handleSaveNotes(player.enrollmentId)}
                          size="sm"
                        >
                          {isSaving ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-1 h-4 w-4" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-line text-gray-700 text-sm">
                    {player.coachNotes}
                  </div>
                )}
                {player.lastUpdated && editingId !== player.enrollmentId && (
                  <p className="mt-3 text-muted-foreground text-xs">
                    Last updated:{" "}
                    {new Date(player.lastUpdated).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Players Without Notes */}
      {playersWithoutNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Add Notes to Other Players
            </CardTitle>
            <CardDescription>
              Click on a player to view their profile and add notes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {playersWithoutNotes.map((player) => (
                <Button
                  key={player.enrollmentId}
                  onClick={() => handleViewPlayer(player.playerIdentityId)}
                  size="sm"
                  variant="outline"
                >
                  {player.playerName}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
