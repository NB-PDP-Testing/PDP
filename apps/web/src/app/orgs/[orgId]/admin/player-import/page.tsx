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
  name: string;
  ageGroup: string;
  sport: string;
  gender: string;
  season: string;
  parentFirstName?: string;
  parentSurname?: string;
  parentEmail?: string;
  parentPhone?: string;
  dateOfBirth?: string;
  address?: string;
  town?: string;
  postcode?: string;
  matchedTeamId?: string;
  matchedTeamName?: string;
  rowIndex: number;
};

type MissingTeam = {
  sport: string;
  ageGroup: string;
  gender: string;
  season: string;
  count: number;
};

const SAMPLE_CSV = `Name,AgeGroup,Sport,Gender,Season,ParentFirstName,ParentSurname,ParentEmail,ParentPhone,DateOfBirth
John Smith,U12,GAA Football,Male,2025,Mary,Smith,mary.smith@email.com,0871234567,2013-05-15
Emma Johnson,U10,GAA Football,Female,2025,Sarah,Johnson,sarah.johnson@email.com,0869876543,2015-08-22
Liam Murphy,U14,GAA Football,Male,2025,Tom,Murphy,tom.murphy@email.com,0851112223,2011-03-10
Sophie Brown,U12,Hurling,Female,2025,Anne,Brown,anne.brown@email.com,0857654321,2013-11-05`;

export default function PlayerImportPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  // Get teams from backend
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // Mutations
  const createPlayerMutation = useMutation(api.models.players.createPlayer);
  const createTeamMutation = useMutation(api.models.teams.createTeam);

  const [csvData, setCsvData] = useState("");
  const [parsedPlayers, setParsedPlayers] = useState<ParsedPlayer[]>([]);
  const [showMissingTeamsDialog, setShowMissingTeamsDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });

  const isLoading = teams === undefined;

  // Parse CSV and normalize gender
  const normalizeGender = (gender: string): string => {
    const normalized = gender.trim().toUpperCase();
    if (normalized === "MALE" || normalized === "M" || normalized === "BOY") {
      return "Boys";
    }
    if (
      normalized === "FEMALE" ||
      normalized === "F" ||
      normalized === "GIRL"
    ) {
      return "Girls";
    }
    return "Mixed";
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

      // Skip rows with missing required fields
      if (!(row.Name && row.AgeGroup && row.Sport && row.Gender)) {
        continue;
      }

      players.push({
        name: row.Name,
        ageGroup: row.AgeGroup,
        sport: row.Sport,
        gender: normalizeGender(row.Gender),
        season: row.Season || new Date().getFullYear().toString(),
        parentFirstName: row.ParentFirstName,
        parentSurname: row.ParentSurname,
        parentEmail: row.ParentEmail,
        parentPhone: row.ParentPhone,
        dateOfBirth: row.DateOfBirth,
        address: row.Address,
        town: row.Town,
        postcode: row.Postcode,
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
      const matchedTeam = allTeams.find(
        (team) =>
          team.sport === player.sport &&
          team.ageGroup === player.ageGroup &&
          team.gender === player.gender &&
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
    const template = `Name,AgeGroup,Sport,Gender,Season,ParentFirstName,ParentSurname,ParentEmail,ParentPhone,DateOfBirth,Address,Town,Postcode
John Smith,U12,GAA Football,Male,2025,Mary,Smith,mary.smith@email.com,0871234567,2013-05-15,123 Main St,Dublin,D01 X123
Emma Johnson,U10,GAA Football,Female,2025,Sarah,Johnson,sarah.johnson@email.com,0869876543,2015-08-22,456 Park Ave,Cork,T12 Y456`;

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
        const name = `${team.ageGroup} ${team.gender}`;
        await createTeamMutation({
          name,
          organizationId: orgId,
          sport: team.sport,
          ageGroup: team.ageGroup,
          gender: team.gender as "Boys" | "Girls" | "Mixed",
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

    let successCount = 0;
    let failedCount = 0;

    for (const [index, playerData] of playersToImport.entries()) {
      if (!playerData.matchedTeamId) {
        continue;
      }

      try {
        await createPlayerMutation({
          name: playerData.name,
          ageGroup: playerData.ageGroup,
          sport: playerData.sport,
          gender: playerData.gender,
          teamId: playerData.matchedTeamId,
          organizationId: orgId,
          season: playerData.season,
          dateOfBirth: playerData.dateOfBirth,
          address: playerData.address,
          town: playerData.town,
          postcode: playerData.postcode,
          parentFirstName: playerData.parentFirstName,
          parentSurname: playerData.parentSurname,
          parentEmail: playerData.parentEmail,
          parentPhone: playerData.parentPhone,
        });
        successCount += 1;
      } catch (error) {
        console.error("Failed to import player:", playerData.name, error);
        failedCount += 1;
      }
      setImportProgress({ current: index + 1, total: playersToImport.length });
    }

    setImporting(false);
    toast.success(
      `Import complete: ${successCount} players imported${failedCount > 0 ? `, ${failedCount} failed` : ""}`
    );

    // Clear data after successful import
    if (successCount > 0) {
      setCsvData("");
      setParsedPlayers([]);
    }
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
                      key={`${player.name}-${player.ageGroup}-${player.rowIndex}`}
                    >
                      <TableCell className="font-medium">
                        {player.name}
                      </TableCell>
                      <TableCell>{player.ageGroup}</TableCell>
                      <TableCell>{player.sport}</TableCell>
                      <TableCell>{player.gender}</TableCell>
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
