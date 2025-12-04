"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, FileSpreadsheet, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import GAAMembershipWizard from "@/components/gaa-import";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Player, Team } from "@/lib/types";

export default function GAAImportPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [showWizard, setShowWizard] = useState(false);

  // Get existing players for duplicate detection
  const existingPlayersRaw = useQuery(
    api.models.players.getPlayersByOrganization,
    {
      organizationId: orgId,
    }
  );

  // Get teams for the organization
  const teamsRaw = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // Mutations
  const createPlayerMutation = useMutation(
    api.models.players.createPlayerForImport
  );
  const deletePlayerMutation = useMutation(api.models.players.deletePlayer);
  const createTeamMutation = useMutation(api.models.teams.createTeam);
  const addPlayerToTeamMutation = useMutation(
    api.models.players.addPlayerToTeam
  );

  const isLoading = existingPlayersRaw === undefined || teamsRaw === undefined;

  // Transform raw player data to Player type
  const existingPlayers: Player[] = (existingPlayersRaw ?? []).map((p) => ({
    _id: p._id,
    name: p.name,
    ageGroup: p.ageGroup,
    sport: p.sport,
    gender: p.gender,
    teamId: "", // No longer on player directly
    organizationId: p.organizationId,
    season: p.season,
    dateOfBirth: p.dateOfBirth,
    parentFirstName: p.parentFirstName,
    parentSurname: p.parentSurname,
    lastReviewDate: p.lastReviewDate,
  }));

  // Transform teams to proper type
  const existingTeams: Team[] = (teamsRaw ?? []).map((t) => ({
    _id: t._id,
    name: t.name,
    organizationId: t.organizationId,
    createdAt: t.createdAt,
    sport: t.sport,
    ageGroup: t.ageGroup,
    gender: t.gender,
    season: t.season,
    isActive: t.isActive,
  }));

  // Create team wrapper
  const handleCreateTeam = async (teamData: {
    name: string;
    sport: string;
    ageGroup: string;
    gender: "Boys" | "Girls" | "Mixed";
    season: string;
  }) => {
    const teamId = await createTeamMutation({
      name: teamData.name,
      organizationId: orgId,
      sport: teamData.sport,
      ageGroup: teamData.ageGroup,
      gender: teamData.gender,
      season: teamData.season,
      isActive: true,
    });
    return teamId;
  };

  // Create player wrapper - now creates player and adds to team separately
  const handleCreatePlayer = async (playerData: {
    name: string;
    ageGroup: string;
    sport: string;
    gender: string;
    teamId: string; // Now required - team must be created/selected first
    completionDate?: string;
    season: string;
    reviewedWith?: {
      coach: boolean;
      parent: boolean;
      player: boolean;
      forum: boolean;
    };
    attendance?: { training: string; matches: string };
    injuryNotes?: string;
    reviewStatus?: string;
    lastReviewDate?: string | null;
    nextReviewDue?: string | null;
    skills: Record<string, number>;
    positions?: {
      favourite: string;
      leastFavourite: string;
      coachesPref: string;
      dominantSide: string;
      goalkeeper: string;
    };
    fitness?: {
      pushPull: string;
      core: string;
      endurance: string;
      speed: string;
      broncoBeep: string;
    };
    otherInterests?: string;
    communications?: string;
    actions?: string;
    coachNotes?: string;
    parentNotes?: string;
    playerNotes?: string;
    seasonReviews?: unknown[];
    createdFrom?: string;
    familyId?: string;
    inferredParentFirstName?: string;
    inferredParentSurname?: string;
    inferredParentEmail?: string;
    inferredParentPhone?: string;
    inferredFromSource?: string;
    parentFirstName?: string;
    parentSurname?: string;
    parentEmail?: string;
    parentPhone?: string;
    dateOfBirth?: string;
    address?: string;
    town?: string;
    postcode?: string;
  }) => {
    // Create player (without team reference - that's now in teamPlayers)
    const playerId = await createPlayerMutation({
      name: playerData.name,
      ageGroup: playerData.ageGroup,
      sport: playerData.sport,
      gender: playerData.gender,
      organizationId: orgId,
      season: playerData.season,
      completionDate: playerData.completionDate,
      dateOfBirth: playerData.dateOfBirth,
      address: playerData.address,
      town: playerData.town,
      postcode: playerData.postcode,
      parentFirstName: playerData.parentFirstName,
      parentSurname: playerData.parentSurname,
      parentEmail: playerData.parentEmail,
      parentPhone: playerData.parentPhone,
      skills: playerData.skills,
      familyId: playerData.familyId,
      inferredParentFirstName: playerData.inferredParentFirstName,
      inferredParentSurname: playerData.inferredParentSurname,
      inferredParentEmail: playerData.inferredParentEmail,
      inferredParentPhone: playerData.inferredParentPhone,
      inferredFromSource: playerData.inferredFromSource,
      createdFrom: playerData.createdFrom,
      coachNotes: playerData.coachNotes,
      reviewedWith: playerData.reviewedWith,
      attendance: playerData.attendance,
      positions: playerData.positions,
      fitness: playerData.fitness,
      injuryNotes: playerData.injuryNotes,
      otherInterests: playerData.otherInterests,
      communications: playerData.communications,
      actions: playerData.actions,
      parentNotes: playerData.parentNotes,
      playerNotes: playerData.playerNotes,
    });

    // Add player to team (many-to-many relationship)
    await addPlayerToTeamMutation({
      playerId,
      teamId: playerData.teamId,
    });

    return playerId;
  };

  // Delete player wrapper
  const handleDeletePlayer = async ({ id }: { id: string }) => {
    await deletePlayerMutation({
      playerId: id as Id<"players">,
    });
  };

  const handleComplete = async () => {
    toast.success("Import completed successfully!");
  };

  const handleClose = () => {
    setShowWizard(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/orgs/${orgId}/admin`}>
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-bold text-3xl tracking-tight">
            GAA Membership Import
          </h1>
          <p className="mt-1 text-muted-foreground">
            Bulk import players from Foireann/GAA membership exports
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">
                  Existing Players
                </p>
                <p className="font-bold text-3xl">{existingPlayers.length}</p>
              </div>
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Teams</p>
                <p className="font-bold text-3xl">{existingTeams.length}</p>
              </div>
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Card */}
      <Card>
        <CardHeader>
          <CardTitle>GAA Membership Onboarding Wizard</CardTitle>
          <CardDescription>
            Import players directly from your Foireann membership export. This
            intelligent wizard will:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
            <li>Parse your GAA membership CSV export</li>
            <li>Automatically detect age groups and assign teams</li>
            <li>Identify family relationships from shared addresses</li>
            <li>
              Set age-appropriate skill baselines based on GAA development
              standards
            </li>
            <li>Detect and handle duplicate players</li>
            <li>Create player passports with contact information</li>
          </ul>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
            <h4 className="mb-2 font-medium text-blue-900 dark:text-blue-100">
              Supported Fields
            </h4>
            <p className="text-blue-800 text-sm dark:text-blue-200">
              Forename, Surname, DOB, Gender, Membership Type, Email, Mobile
              Number, Address, Town, Postcode, Player flag (for senior members)
            </p>
          </div>

          <Button
            className="w-full"
            onClick={() => setShowWizard(true)}
            size="lg"
          >
            <FileSpreadsheet className="mr-2 h-5 w-5" />
            Start GAA Import Wizard
          </Button>
        </CardContent>
      </Card>

      {/* Link to v1 importer */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Looking for the basic importer?</p>
              <p className="text-muted-foreground text-sm">
                Use the simple CSV importer for generic player data
              </p>
            </div>
            <Link href={`/orgs/${orgId}/admin/player-import`}>
              <Button variant="outline">Basic Import</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Wizard Modal */}
      {showWizard && (
        <GAAMembershipWizard
          createPlayerMutation={handleCreatePlayer}
          createTeamMutation={handleCreateTeam}
          deletePlayerMutation={handleDeletePlayer}
          existingPlayers={existingPlayers}
          existingTeams={existingTeams}
          onClose={handleClose}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
