"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle,
  Download,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type ParsedPlayer = {
  firstName: string;
  lastName: string;
  ageGroup: string;
  sport: string;
  gender: "male" | "female" | "other";
  season: string;
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
  dateOfBirth: string;
  address?: string;
  town?: string;
  postcode?: string;
  country?: string;
  matchedTeamId?: string;
  matchedTeamName?: string;
  rowIndex: number;
  // Display name for backwards compatibility in UI
  displayName: string;
};

type MissingTeam = {
  sport: string;
  ageGroup: string;
  gender: string;
  season: string;
  count: number;
};

const SAMPLE_CSV = `FirstName,LastName,AgeGroup,Sport,Gender,Season,ParentFirstName,ParentLastName,ParentEmail,ParentPhone,ParentRelationship,DateOfBirth
John,Smith,U12,GAA Football,Male,2025,Mary,Smith,mary.smith@email.com,0871234567,mother,2013-05-15
Emma,Johnson,U10,GAA Football,Female,2025,Sarah,Johnson,sarah.johnson@email.com,0869876543,mother,2015-08-22
Liam,Murphy,U14,GAA Football,Male,2025,Tom,Murphy,tom.murphy@email.com,0851112223,father,2011-03-10
Sophie,Brown,U12,Hurling,Female,2025,Anne,Brown,anne.brown@email.com,0857654321,mother,2013-11-05`;

// Helper: Map sport name to sport code
const mapSportNameToCode = (sportName: string): string => {
  const normalized = sportName.trim().toLowerCase();

  // GAA Sports
  if (normalized.includes("gaa") && normalized.includes("football")) {
    return "gaa_football";
  }
  if (normalized.includes("hurling")) {
    return "hurling";
  }
  if (normalized.includes("camogie")) {
    return "camogie";
  }

  // Other sports
  if (normalized.includes("soccer") || normalized === "football") {
    return "soccer";
  }
  if (normalized.includes("rugby")) {
    return "rugby";
  }
  if (normalized.includes("basketball")) {
    return "basketball";
  }

  // Default: convert to lowercase with underscores
  return sportName.toLowerCase().replace(/\s+/g, "_");
};

export default function PlayerImportPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  // Get teams from backend
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // Mutations - Use identity-based import for new players
  const batchImportMutation = useMutation(
    api.models.playerImport.batchImportPlayersWithIdentity
  );
  const createTeamMutation = useMutation(api.models.teams.createTeam);
  const bulkAddToTeamMutation = useMutation(
    api.models.teamPlayerIdentities.bulkAddPlayersToTeam
  );
  const findOrCreatePassportMutation = useMutation(
    api.models.sportPassports.findOrCreatePassport
  );

  const [csvData, setCsvData] = useState("");
  const [parsedPlayers, setParsedPlayers] = useState<ParsedPlayer[]>([]);
  const [showMissingTeamsDialog, setShowMissingTeamsDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });

  const isLoading = teams === undefined;

  // Parse CSV and normalize gender - returns identity system format
  const normalizeGender = (gender: string): "male" | "female" | "other" => {
    const normalized = gender.trim().toUpperCase();
    if (
      normalized === "MALE" ||
      normalized === "M" ||
      normalized === "BOY" ||
      normalized === "BOYS" ||
      normalized === "MEN"
    ) {
      return "male";
    }
    if (
      normalized === "FEMALE" ||
      normalized === "F" ||
      normalized === "GIRL" ||
      normalized === "GIRLS" ||
      normalized === "WOMEN"
    ) {
      return "female";
    }
    if (normalized === "MIXED" || normalized === "ALL") {
      return "other"; // For players, "mixed" doesn't apply - use "other"
    }
    return "other";
  };

  // Convert gender from identity format to team format for matching
  const genderToTeamFormat = (
    gender: "male" | "female" | "other"
  ): "male" | "female" | "mixed" => {
    if (gender === "male") return "male";
    if (gender === "female") return "female";
    return "mixed";
  };

  // Parse relationship string to typed value
  const parseRelationship = (
    rel?: string
  ): "mother" | "father" | "guardian" | "grandparent" | "other" | undefined => {
    if (!rel) return;
    const normalized = rel.trim().toLowerCase();
    if (normalized === "mother" || normalized === "mum" || normalized === "mom")
      return "mother";
    if (normalized === "father" || normalized === "dad") return "father";
    if (normalized === "guardian") return "guardian";
    if (
      normalized === "grandparent" ||
      normalized === "grandmother" ||
      normalized === "grandfather"
    )
      return "grandparent";
    return "other";
  };

  // Split a name into first and last name
  const splitName = (name: string): { firstName: string; lastName: string } => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: "" };
    }
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ");
    return { firstName, lastName };
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSV = (text: string): ParsedPlayer[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      return [];
    }

    const headers = parseCsvLine(lines[0]);
    const players: ParsedPlayer[] = [];

    for (const line of lines.slice(1)) {
      const values = parseCsvLine(line);
      const row: Record<string, string> = {};

      for (const [index, header] of headers.entries()) {
        row[header] = values[index] || "";
      }

      // Support both new format (FirstName, LastName) and legacy format (Name)
      let firstName: string;
      let lastName: string;

      if (row.FirstName && row.LastName) {
        firstName = row.FirstName.trim();
        lastName = row.LastName.trim();
      } else if (row.Name) {
        const nameParts = splitName(row.Name);
        firstName = nameParts.firstName;
        lastName = nameParts.lastName;
      } else {
        // Skip rows without name
        continue;
      }

      // Skip rows with missing required fields
      if (
        !(
          firstName &&
          row.AgeGroup &&
          row.Sport &&
          row.Gender &&
          row.DateOfBirth
        )
      ) {
        continue;
      }

      const gender = normalizeGender(row.Gender);

      players.push({
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim(),
        ageGroup: row.AgeGroup,
        sport: row.Sport,
        gender,
        season: row.Season || new Date().getFullYear().toString(),
        parentFirstName: row.ParentFirstName,
        parentLastName: row.ParentLastName || row.ParentSurname, // Support both
        parentEmail: row.ParentEmail,
        parentPhone: row.ParentPhone,
        parentRelationship: parseRelationship(row.ParentRelationship),
        dateOfBirth: row.DateOfBirth,
        address: row.Address,
        town: row.Town,
        postcode: row.Postcode,
        country: row.Country,
        rowIndex: players.length,
      });
    }

    return players;
  };

  // Match players to teams
  const matchPlayersToTeams = (
    players: ParsedPlayer[],
    allTeams: Array<{
      _id: string;
      name: string;
      sport?: string;
      ageGroup?: string;
      gender?: string;
      season?: string;
    }>
  ): ParsedPlayer[] =>
    players.map((player) => {
      // Convert player gender to team format for matching
      const teamGender = genderToTeamFormat(player.gender);
      // Convert player sport to code format for matching (teams store sport codes)
      const playerSportCode = mapSportNameToCode(player.sport);
      
      const matchedTeam = allTeams.find(
        (team) =>
          team.sport === playerSportCode &&
          team.ageGroup === player.ageGroup &&
          team.gender === teamGender &&
          team.season === player.season
      );

      return {
        ...player,
        matchedTeamId: matchedTeam?._id,
        matchedTeamName: matchedTeam?.name,
      };
    });

  // Get missing teams
  const missingTeams = useMemo(() => {
    if (!parsedPlayers.length) {
      return [];
    }

    const unmatched = parsedPlayers.filter((p) => !p.matchedTeamId);
    const teamMap = new Map<string, MissingTeam>();

    for (const player of unmatched) {
      const key = `${player.sport}|${player.ageGroup}|${player.gender}|${player.season}`;
      if (teamMap.has(key)) {
        const existing = teamMap.get(key);
        if (existing) {
          existing.count += 1;
        }
      } else {
        teamMap.set(key, {
          sport: player.sport,
          ageGroup: player.ageGroup,
          gender: player.gender,
          season: player.season,
          count: 1,
        });
      }
    }

    return Array.from(teamMap.values());
  }, [parsedPlayers]);

  const unmatchedCount = parsedPlayers.filter((p) => !p.matchedTeamId).length;
  const matchedCount = parsedPlayers.filter((p) => p.matchedTeamId).length;

  const handleParse = () => {
    if (!csvData.trim()) {
      toast.error("Please enter CSV data");
      return;
    }

    if (!teams || teams.length === 0) {
      toast.error("No teams found in organization");
      return;
    }

    const parsed = parseCSV(csvData);
    if (parsed.length === 0) {
      toast.error("No valid players found in CSV");
      return;
    }

    const matched = matchPlayersToTeams(parsed, teams);
    setParsedPlayers(matched);
    toast.success(`Parsed ${parsed.length} players`);
  };

  const handleLoadSample = () => {
    setCsvData(SAMPLE_CSV);
    toast.success("Sample data loaded");
  };

  const downloadTemplate = () => {
    const template = `FirstName,LastName,AgeGroup,Sport,Gender,Season,ParentFirstName,ParentLastName,ParentEmail,ParentPhone,ParentRelationship,DateOfBirth,Address,Town,Postcode,Country
John,Smith,U12,GAA Football,Male,2025,Mary,Smith,mary.smith@email.com,0871234567,mother,2013-05-15,123 Main St,Dublin,D01 X123,Ireland
Emma,Johnson,U10,GAA Football,Female,2025,Sarah,Johnson,sarah.johnson@email.com,0869876543,mother,2015-08-22,456 Park Ave,Cork,T12 Y456,Ireland`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "player_import_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvData(text);
        toast.success("File loaded");
      };
      reader.readAsText(file);
    }
  };

  const handleCreateMissingTeams = async (teamsToCreate: MissingTeam[]) => {
    try {
      for (const team of teamsToCreate) {
        // Convert gender from identity format (male/female/other) to team format (male/female/mixed)
        const teamGender = genderToTeamFormat(team.gender as "male" | "female" | "other");
        const name = `${team.ageGroup} ${teamGender}`;
        await createTeamMutation({
          name,
          organizationId: orgId,
          sport: mapSportNameToCode(team.sport),
          ageGroup: team.ageGroup,
          gender: teamGender,
          season: team.season,
          isActive: true,
        });
      }
      toast.success(`Created ${teamsToCreate.length} teams`);
      setShowMissingTeamsDialog(false);

      // Re-match players after teams are created
      if (teams) {
        const matched = matchPlayersToTeams(parsedPlayers, teams);
        setParsedPlayers(matched);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create teams";
      console.error("Error creating teams:", error);
      toast.error(errorMessage);
    }
  };

  const handleUploadMatchedPlayers = async () => {
    const playersToImport = parsedPlayers.filter((p) => p.matchedTeamId);

    if (playersToImport.length === 0) {
      toast.error("No players with matching teams to import");
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: playersToImport.length });

    try {
      // ========== STEP 1: Create player identities, guardians, and enrollments ==========
      console.log("📋 Step 1: Creating player identities and enrollments...");

      const formattedPlayers = playersToImport.map((player) => ({
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth,
        gender: player.gender,
        ageGroup: player.ageGroup,
        season: player.season,
        address: player.address,
        town: player.town,
        postcode: player.postcode,
        country: player.country,
        parentFirstName: player.parentFirstName,
        parentLastName: player.parentLastName,
        parentEmail: player.parentEmail,
        parentPhone: player.parentPhone,
        parentRelationship: player.parentRelationship,
      }));

      const result = await batchImportMutation({
        organizationId: orgId,
        players: formattedPlayers,
      });

      console.log(
        `✅ Step 1 complete: ${result.playersCreated} players created, ${result.playersReused} reused`
      );

      // ========== STEP 2: Assign players to teams ==========
      console.log("👥 Step 2: Assigning players to teams...");

      const playersByTeam = new Map<
        string,
        Array<(typeof result.playerIdentities)[0]["playerIdentityId"]>
      >();

      for (const identity of result.playerIdentities) {
        const originalPlayer = playersToImport[identity.index];
        if (originalPlayer?.matchedTeamId) {
          const teamPlayers =
            playersByTeam.get(originalPlayer.matchedTeamId) || [];
          teamPlayers.push(identity.playerIdentityId);
          playersByTeam.set(originalPlayer.matchedTeamId, teamPlayers);
        }
      }

      let totalTeamAssignments = 0;
      for (const [teamId, playerIds] of playersByTeam) {
        try {
          const teamResult = await bulkAddToTeamMutation({
            teamId,
            playerIdentityIds: playerIds,
            organizationId: orgId,
            season: playersToImport[0]?.season || "2025",
          });
          totalTeamAssignments += teamResult.added;
          console.log(
            `   Team ${teamId}: ${teamResult.added} added, ${teamResult.skipped} already on team`
          );
        } catch (error) {
          console.error(`   ❌ Failed to add players to team ${teamId}:`, error);
        }
      }

      console.log(`✅ Step 2 complete: ${totalTeamAssignments} team assignments`);

      // ========== STEP 3: Create sport passports ==========
      console.log("📋 Step 3: Creating sport passports...");

      let passportsCreated = 0;
      let passportErrors = 0;

      for (const identity of result.playerIdentities) {
        try {
          const originalPlayer = playersToImport[identity.index];
          const sportCode = mapSportNameToCode(originalPlayer.sport);

          await findOrCreatePassportMutation({
            playerIdentityId: identity.playerIdentityId,
            sportCode,
            organizationId: orgId,
            currentSeason: originalPlayer.season,
          });
          passportsCreated++;
        } catch (error) {
          console.error(
            `   ❌ Failed to create passport for player ${identity.playerIdentityId}:`,
            error
          );
          passportErrors++;
        }
      }

      console.log(
        `✅ Step 3 complete: ${passportsCreated} passports processed, ${passportErrors} errors`
      );

      setImportProgress({
        current: result.totalProcessed,
        total: playersToImport.length,
      });

      // ========== Build comprehensive result message ==========
      const parts: string[] = [];
      parts.push(`${result.totalProcessed} processed`);
      if (result.playersCreated > 0) {
        parts.push(`${result.playersCreated} new players`);
      }
      if (result.playersReused > 0) {
        parts.push(`${result.playersReused} existing players`);
      }
      if (result.guardiansCreated > 0) {
        parts.push(`${result.guardiansCreated} new guardians`);
      }
      if (result.enrollmentsCreated > 0) {
        parts.push(`${result.enrollmentsCreated} new enrollments`);
      }
      if (totalTeamAssignments > 0) {
        parts.push(`${totalTeamAssignments} team assignments`);
      }
      if (passportsCreated > 0) {
        parts.push(`${passportsCreated} passports`);
      }
      if (result.errors.length > 0 || passportErrors > 0) {
        parts.push(
          `${result.errors.length + passportErrors} errors`
        );
      }

      toast.success(`Import complete: ${parts.join(", ")}`);

      // Log any errors
      if (result.errors.length > 0) {
        console.error("Import errors:", result.errors);
      }

      // Clear data after successful import
      if (result.totalProcessed > 0) {
        setCsvData("");
        setParsedPlayers([]);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to import players";
      console.error("Import error:", error);
      toast.error(errorMessage);
    }

    setImporting(false);
  };

  // Re-match when teams update (but not when parsedPlayers change to avoid infinite loop)
  useEffect(() => {
    if (parsedPlayers.length > 0 && teams) {
      const matched = matchPlayersToTeams(parsedPlayers, teams);
      setParsedPlayers(matched);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Player Import</h1>
        <p className="mt-2 text-muted-foreground">
          Bulk import players from CSV file
        </p>
      </div>

      {/* CSV Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Player Data</CardTitle>
          <CardDescription>
            Upload a CSV file or paste data directly. Required fields: Name,
            AgeGroup, Sport, Gender
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <Button asChild variant="outline">
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV File
                <input
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                  type="file"
                />
              </label>
            </Button>
            <Button onClick={handleLoadSample} variant="outline">
              Load Sample Data
            </Button>
          </div>

          {/* CSV Textarea */}
          <div className="space-y-2">
            <Label htmlFor="csv-data">CSV Data</Label>
            <Textarea
              className="font-mono text-xs"
              id="csv-data"
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="Name,AgeGroup,Sport,Gender,Season,ParentFirstName,ParentSurname,ParentEmail,ParentPhone,DateOfBirth
John Smith,U12,GAA Football,Male,2025,Mary,Smith,mary.smith@email.com,0871234567,2013-05-15"
              rows={10}
              value={csvData}
            />
          </div>

          {/* Parse Button */}
          <Button
            className="w-full"
            disabled={!csvData.trim() || isLoading}
            onClick={handleParse}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Parse and Match Players
          </Button>
        </CardContent>
      </Card>

      {/* Parsed Players Table */}
      {parsedPlayers.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">
                      Total Players
                    </p>
                    <p className="font-bold text-2xl">{parsedPlayers.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">
                      Matched to Teams
                    </p>
                    <p className="font-bold text-2xl text-green-600">
                      {matchedCount}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">
                      Missing Teams
                    </p>
                    <p className="font-bold text-2xl text-red-600">
                      {unmatchedCount}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warning Banner */}
          {unmatchedCount > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-yellow-900">
                      {unmatchedCount} player{unmatchedCount !== 1 ? "s" : ""}{" "}
                      cannot be matched to existing teams
                    </p>
                    <p className="mt-1 text-muted-foreground text-sm">
                      These players are highlighted in red. Create the missing
                      teams or only import matched players.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Players Table */}
          <Card>
            <CardHeader>
              <CardTitle>Parsed Players ({parsedPlayers.length})</CardTitle>
              <CardDescription>
                Review players and their team matches
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Age Group</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Season</TableHead>
                    <TableHead>Matched Team</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedPlayers.map((player) => (
                    <TableRow
                      className={
                        player.matchedTeamId ? undefined : "bg-red-500/30"
                      }
                      key={`${player.displayName}-${player.ageGroup}-${player.rowIndex}`}
                    >
                      <TableCell className="font-medium">
                        {player.displayName}
                      </TableCell>
                      <TableCell>{player.ageGroup}</TableCell>
                      <TableCell>{player.sport}</TableCell>
                      <TableCell className="capitalize">
                        {player.gender}
                      </TableCell>
                      <TableCell>{player.season}</TableCell>
                      <TableCell>
                        {player.matchedTeamId ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">
                              {player.matchedTeamName}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-muted-foreground text-sm">
                              No matching team
                            </span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Import Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {unmatchedCount > 0 && (
              <Button
                className="flex-1"
                onClick={() => setShowMissingTeamsDialog(true)}
                variant="outline"
              >
                <Users className="mr-2 h-4 w-4" />
                Add {missingTeams.length} Missing Team
                {missingTeams.length !== 1 ? "s" : ""}
              </Button>
            )}
            <Button
              className="flex-1"
              disabled={matchedCount === 0 || importing}
              onClick={handleUploadMatchedPlayers}
            >
              <Upload className="mr-2 h-4 w-4" />
              {importing
                ? `Importing ${importProgress.current}/${importProgress.total}...`
                : `Upload ${matchedCount} Player${matchedCount !== 1 ? "s" : ""} with Matching Teams`}
            </Button>
          </div>
        </>
      )}

      {/* Missing Teams Dialog */}
      <MissingTeamsDialog
        missingTeams={missingTeams}
        onClose={() => setShowMissingTeamsDialog(false)}
        onCreate={handleCreateMissingTeams}
        open={showMissingTeamsDialog}
        orgId={orgId}
      />
    </div>
  );
}

type MissingTeamsDialogProps = {
  missingTeams: MissingTeam[];
  open: boolean;
  onClose: () => void;
  onCreate: (teams: MissingTeam[]) => Promise<void>;
  orgId: string;
};

function MissingTeamsDialog({
  missingTeams,
  open,
  onClose,
  onCreate,
}: MissingTeamsDialogProps) {
  const [selectedTeams, setSelectedTeams] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);

  // Select all by default
  useEffect(() => {
    if (open) {
      setSelectedTeams(new Set(missingTeams.map((_, idx) => idx)));
    }
  }, [open, missingTeams]);

  const toggleTeam = (index: number) => {
    const newSelected = new Set(selectedTeams);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTeams(newSelected);
  };

  const handleCreate = async () => {
    const teamsToCreate = missingTeams.filter((_, idx) =>
      selectedTeams.has(idx)
    );

    if (teamsToCreate.length === 0) {
      toast.error("Please select at least one team to create");
      return;
    }

    setCreating(true);
    try {
      await onCreate(teamsToCreate);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Missing Teams</DialogTitle>
          <DialogDescription>
            The following teams need to be created to import all players. Select
            which teams to create.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {missingTeams.map((team, idx) => (
            <div
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
              key={`${team.sport}-${team.ageGroup}-${team.gender}-${team.season}`}
            >
              <div className="flex items-center gap-3">
                <input
                  checked={selectedTeams.has(idx)}
                  className="h-4 w-4 rounded border-gray-300"
                  onChange={() => {
                    toggleTeam(idx);
                  }}
                  type="checkbox"
                />
                <div>
                  <p className="font-medium">
                    {team.ageGroup} {team.gender}
                  </p>
                  <div className="flex flex-wrap gap-2 text-muted-foreground text-sm">
                    <span>{team.sport}</span>
                    <span>•</span>
                    <span>Season {team.season}</span>
                    <span>•</span>
                    <span>
                      {team.count} player{team.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button disabled={creating} onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={creating || selectedTeams.size === 0}
            onClick={handleCreate}
          >
            {creating
              ? "Creating..."
              : `Create ${selectedTeams.size} Team${selectedTeams.size !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
