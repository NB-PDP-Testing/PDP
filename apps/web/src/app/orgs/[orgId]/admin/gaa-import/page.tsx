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
import type { Team } from "@/lib/types";

// Player type adapted for the new identity system
type IdentityPlayer = {
  _id: string;
  name: string;
  ageGroup: string;
  sport?: string;
  gender: string;
  teamId: string;
  organizationId: string;
  season: string;
  dateOfBirth?: string;
  parentFirstName?: string;
  parentSurname?: string;
  lastReviewDate?: string;
  playerIdentityId?: Id<"playerIdentities">;
  enrollmentId?: Id<"orgPlayerEnrollments">;
};

export default function GAAImportPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [showWizard, setShowWizard] = useState(false);

  // Get existing players for duplicate detection - using NEW identity system
  const existingPlayersRaw = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForOrg,
    {
      organizationId: orgId,
    }
  );

  // Get teams for the organization
  const teamsRaw = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // NEW identity system mutations
  const batchImportWithIdentityMutation = useMutation(
    api.models.playerImport.batchImportPlayersWithIdentity
  );
  const createTeamMutation = useMutation(api.models.teams.createTeam);
  const bulkAddToTeamMutation = useMutation(
    api.models.teamPlayerIdentities.bulkAddPlayersToTeam
  );
  const createPassportMutation = useMutation(
    api.models.sportPassports.createPassport
  );

  const isLoading = existingPlayersRaw === undefined || teamsRaw === undefined;

  // Transform raw player data to IdentityPlayer type (from new enrollment system)
  const existingPlayers: IdentityPlayer[] = (existingPlayersRaw ?? []).map(
    (p: {
      enrollment: {
        _id: Id<"orgPlayerEnrollments">;
        ageGroup: string;
        season: string;
        organizationId: string;
      };
      player: {
        _id: Id<"playerIdentities">;
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        gender: string;
      };
    }) => ({
      _id: p.player._id, // Use player identity ID as primary ID
      name: `${p.player.firstName} ${p.player.lastName}`,
      ageGroup: p.enrollment.ageGroup,
      sport: "GAA Football", // Default for GAA import
      gender: p.player.gender === "male" ? "MALE" : "FEMALE",
      teamId: "", // Will be looked up from teamPlayerIdentities if needed
      organizationId: p.enrollment.organizationId,
      season: p.enrollment.season,
      dateOfBirth: p.player.dateOfBirth,
      parentFirstName: undefined, // Would need to join guardian data
      parentSurname: undefined,
      lastReviewDate: undefined,
      playerIdentityId: p.player._id,
      enrollmentId: p.enrollment._id,
    })
  );

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

  // Batch import using NEW identity system
  const handleBatchImport = async (
    players: Array<{
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      gender: "male" | "female" | "other";
      ageGroup: string;
      season: string;
      address?: string;
      town?: string;
      postcode?: string;
      country?: string;
      parentFirstName?: string;
      parentLastName?: string;
      parentEmail?: string;
      parentPhone?: string;
      parentRelationship?:
        | "mother"
        | "father"
        | "guardian"
        | "grandparent"
        | "other";
      teamId?: string;
    }>
  ) => {
    // Step 1: Import player identities, guardians, and enrollments
    const importResult = await batchImportWithIdentityMutation({
      organizationId: orgId,
      players: players.map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        ageGroup: p.ageGroup,
        season: p.season,
        address: p.address,
        town: p.town,
        postcode: p.postcode,
        country: p.country,
        parentFirstName: p.parentFirstName,
        parentLastName: p.parentLastName,
        parentEmail: p.parentEmail,
        parentPhone: p.parentPhone,
        parentRelationship: p.parentRelationship,
      })),
    });

    return importResult;
  };

  // Add players to teams using new teamPlayerIdentities system
  const handleBulkAddToTeam = async (
    teamId: string,
    playerIdentityIds: Id<"playerIdentities">[]
  ) =>
    await bulkAddToTeamMutation({
      teamId,
      playerIdentityIds,
      organizationId: orgId,
      season: "2025",
    });

  // Create sport passport for a player
  const handleCreatePassport = async (
    playerIdentityId: Id<"playerIdentities">,
    sportCode: string
  ) =>
    await createPassportMutation({
      playerIdentityId,
      sportCode,
      organizationId: orgId,
      status: "active",
      currentSeason: "2025",
    });

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
          batchImportWithIdentity={handleBatchImport}
          bulkAddToTeam={handleBulkAddToTeam}
          createPassport={handleCreatePassport}
          createTeamMutation={handleCreateTeam}
          existingPlayers={existingPlayers}
          existingTeams={existingTeams}
          onClose={handleClose}
          onComplete={handleComplete}
          organizationId={orgId}
        />
      )}
    </div>
  );
}
