"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Eye,
  Heart,
  HeartPulse,
  Loader2,
  Phone,
  Pill,
  Search,
  Shield,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";

// Privacy confirmation component for coaches
function CoachPrivacyConfirmation({
  onConfirm,
  onCancel,
  playerName,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  playerName: string;
}) {
  return (
    <Dialog onOpenChange={(open) => !open && onCancel()} open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Medical Information Access
          </DialogTitle>
          <DialogDescription>
            You are about to view medical information for{" "}
            <strong>{playerName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-amber-800 text-sm">
              <strong>Coach Access Notice:</strong> As a coach, you have
              read-only access to player medical information for safety purposes
              during training and matches.
            </p>
          </div>
          <div className="text-muted-foreground text-sm">
            <ul className="list-inside list-disc space-y-1">
              <li>This access is logged for audit purposes</li>
              <li>Use this information responsibly for player safety</li>
              <li>Contact admin to update medical information</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700"
            onClick={onConfirm}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Info
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Limited Medical Profile View for Coaches
function CoachMedicalView({
  profile,
  playerName,
  onClose,
}: {
  profile: any;
  playerName: string;
  onClose: () => void;
}) {
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            {playerName} - Medical Info
          </DialogTitle>
          <DialogDescription>
            View-only access for coaching purposes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Emergency Contacts - Always Show */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-red-800">
              <Phone className="h-4 w-4" />
              Emergency Contacts
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="font-medium">
                  {profile?.emergencyContact1Name || "Not set"}
                </p>
                <p className="font-mono text-red-700">
                  {profile?.emergencyContact1Phone || "No phone"}
                </p>
                <Badge className="mt-1 bg-red-600">Primary</Badge>
              </div>
              {profile?.emergencyContact2Name && (
                <div>
                  <p className="font-medium">{profile.emergencyContact2Name}</p>
                  <p className="font-mono text-red-700">
                    {profile.emergencyContact2Phone || "No phone"}
                  </p>
                  <Badge className="mt-1" variant="outline">
                    Secondary
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Critical Allergies */}
          {profile?.allergies?.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-orange-800">
                <AlertCircle className="h-4 w-4" />
                Allergies
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.allergies.map((allergy: string) => (
                  <Badge
                    className="bg-orange-200 text-orange-800"
                    key={allergy}
                  >
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Medical Conditions */}
          {profile?.conditions?.length > 0 && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-purple-800">
                <AlertTriangle className="h-4 w-4" />
                Medical Conditions
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.conditions.map((condition: string) => (
                  <Badge
                    className="bg-purple-200 text-purple-800"
                    key={condition}
                  >
                    {condition}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Current Medications */}
          {profile?.medications?.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-blue-800">
                <Pill className="h-4 w-4" />
                Current Medications
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.medications.map((med: string) => (
                  <Badge className="bg-blue-200 text-blue-800" key={med}>
                    {med}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* No Medical Info */}
          {!(
            profile?.allergies?.length ||
            profile?.conditions?.length ||
            profile?.medications?.length
          ) && (
            <div className="rounded-lg border p-4 text-center">
              <p className="text-muted-foreground">
                No allergies, conditions, or medications recorded.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Coach Medical Page
export default function CoachMedicalPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const currentUser = useCurrentUser();
  const userId = currentUser?._id;

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAlert, setFilterAlert] = useState<
    "all" | "allergies" | "conditions"
  >("all");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [teamsExpanded, setTeamsExpanded] = useState(true);

  // Privacy confirmation state
  const [pendingView, setPendingView] = useState<{
    playerName: string;
    profile: any;
  } | null>(null);

  // View modal state
  const [viewingProfile, setViewingProfile] = useState<{
    playerName: string;
    profile: any;
  } | null>(null);

  // Queries
  const allProfiles = useQuery(
    api.models.medicalProfiles.getAllForOrganization,
    { organizationId: orgId }
  );

  const coachAssignments = useQuery(
    api.models.coaches.getCoachAssignmentsWithTeams,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );

  const teamPlayerLinks = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    orgId ? { organizationId: orgId, status: "active" } : "skip"
  );

  // Deduplicated coach teams list
  const coachTeamsList = useMemo(() => {
    if (!coachAssignments?.teams) {
      return [];
    }
    const seen = new Set<string>();
    return coachAssignments.teams.filter((t) => {
      if (!t.teamId || t.teamId.includes("players")) {
        return false;
      }
      if (seen.has(t.teamId)) {
        return false;
      }
      seen.add(t.teamId);
      return true;
    });
  }, [coachAssignments?.teams]);

  // Player IDs grouped by team
  const playerIdsByTeam = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!teamPlayerLinks) {
      return map;
    }
    for (const link of teamPlayerLinks) {
      if (!map.has(link.teamId)) {
        map.set(link.teamId, new Set());
      }
      map.get(link.teamId)?.add(link.playerIdentityId.toString());
    }
    return map;
  }, [teamPlayerLinks]);

  // Player count per team
  const playerCountByTeam = useMemo(() => {
    const counts = new Map<string, number>();
    if (!teamPlayerLinks) {
      return counts;
    }
    for (const link of teamPlayerLinks) {
      counts.set(link.teamId, (counts.get(link.teamId) ?? 0) + 1);
    }
    return counts;
  }, [teamPlayerLinks]);

  // Medical alert counts per team
  const medicalCountsByTeam = useMemo(() => {
    const result = new Map<
      string,
      { allergies: number; conditions: number; medications: number }
    >();
    if (!allProfiles) {
      return result;
    }
    for (const [teamId, playerIds] of playerIdsByTeam) {
      let allergies = 0;
      let conditions = 0;
      let medications = 0;
      for (const item of allProfiles) {
        if (!item.hasProfile) {
          continue;
        }
        if (!playerIds.has(item.player._id.toString())) {
          continue;
        }
        if (item.hasAllergies) {
          allergies += 1;
        }
        if (item.hasConditions) {
          conditions += 1;
        }
        if (item.hasMedications) {
          medications += 1;
        }
      }
      result.set(teamId, { allergies, conditions, medications });
    }
    return result;
  }, [allProfiles, playerIdsByTeam]);

  // Filter players - apply team, search, and alert filters
  const filteredPlayers = useMemo(() => {
    if (!allProfiles) {
      return [];
    }

    return allProfiles.filter((item: NonNullable<typeof allProfiles>[0]) => {
      if (!item.hasProfile) {
        return false;
      }

      // Team filter
      if (selectedTeamId !== "all") {
        const teamPlayerIds = playerIdsByTeam.get(selectedTeamId);
        if (!teamPlayerIds?.has(item.player._id.toString())) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!item.player.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Alert filter
      if (filterAlert === "allergies" && !item.hasAllergies) {
        return false;
      }
      if (filterAlert === "conditions" && !item.hasConditions) {
        return false;
      }

      return true;
    });
  }, [allProfiles, searchQuery, filterAlert, selectedTeamId, playerIdsByTeam]);

  // Count players with alerts (across all / filtered scope)
  const alertCounts = useMemo(() => {
    if (!allProfiles) {
      return { allergies: 0, conditions: 0, medications: 0 };
    }
    return {
      allergies: allProfiles.filter(
        (p: NonNullable<typeof allProfiles>[0]) => p.hasAllergies
      ).length,
      conditions: allProfiles.filter(
        (p: NonNullable<typeof allProfiles>[0]) => p.hasConditions
      ).length,
      medications: allProfiles.filter(
        (p: NonNullable<typeof allProfiles>[0]) => p.hasMedications
      ).length,
    };
  }, [allProfiles]);

  // Handle view click
  const handleViewClick = (playerName: string, profile: any) => {
    setPendingView({ playerName, profile });
  };

  // Handle privacy confirmation
  const handlePrivacyConfirm = () => {
    if (pendingView) {
      setViewingProfile(pendingView);
      setPendingView(null);
      console.log(
        `[AUDIT] Coach viewed medical info for: ${pendingView.playerName}`
      );
    }
  };

  // Loading state
  if (allProfiles === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const playersWithProfiles = allProfiles.filter(
    (p: NonNullable<typeof allProfiles>[0]) => p.hasProfile
  ).length;

  const hasActiveFilters =
    selectedTeamId !== "all" || searchQuery || filterAlert !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 p-4 text-white shadow-md md:p-6">
        <div className="flex items-center gap-2 md:gap-3">
          <HeartPulse className="h-7 w-7 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-xl md:text-2xl">
              Medical Information
            </h1>
            <p className="text-sm opacity-90">
              Player health details and emergency contacts
            </p>
          </div>
        </div>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card className="border-green-200 bg-green-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Users className="text-green-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {playersWithProfiles}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Players with Profiles
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-green-100">
              <div
                className="h-1 rounded-full bg-green-600"
                style={{
                  width:
                    allProfiles.length > 0
                      ? `${(playersWithProfiles / allProfiles.length) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <AlertCircle className="text-orange-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {alertCounts.allergies}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              With Allergies
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-orange-100">
              <div
                className="h-1 rounded-full bg-orange-600"
                style={{
                  width:
                    playersWithProfiles > 0
                      ? `${(alertCounts.allergies / playersWithProfiles) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <AlertTriangle className="text-purple-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {alertCounts.conditions}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              With Conditions
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-purple-100">
              <div
                className="h-1 rounded-full bg-purple-600"
                style={{
                  width:
                    playersWithProfiles > 0
                      ? `${(alertCounts.conditions / playersWithProfiles) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Pill className="text-blue-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {alertCounts.medications}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              On Medication
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-blue-100">
              <div
                className="h-1 rounded-full bg-blue-600"
                style={{
                  width:
                    playersWithProfiles > 0
                      ? `${(alertCounts.medications / playersWithProfiles) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Filter */}
      {coachTeamsList.length > 0 && (
        <div className="space-y-3">
          <button
            className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-left shadow-sm transition-colors hover:bg-accent/50"
            onClick={() => setTeamsExpanded((v) => !v)}
            type="button"
          >
            <span className="font-medium text-sm">
              {selectedTeamId === "all"
                ? "All Teams"
                : `${coachTeamsList.find((t) => t.teamId === selectedTeamId)?.teamName ?? "All Teams"} · selected`}
            </span>
            <div className="flex items-center gap-2">
              <ChevronDown
                className={`text-gray-500 transition-transform ${teamsExpanded ? "rotate-180" : ""}`}
                size={18}
              />
              {hasActiveFilters && (
                <span
                  className="rounded border border-gray-300 px-2 py-0.5 text-gray-500 text-xs transition-colors hover:border-gray-400 hover:text-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTeamId("all");
                    setSearchQuery("");
                    setFilterAlert("all");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      setSelectedTeamId("all");
                      setSearchQuery("");
                      setFilterAlert("all");
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  Clear
                </span>
              )}
            </div>
          </button>
          {teamsExpanded && (
            <div
              className={`grid gap-3 md:gap-4 ${coachTeamsList.length === 1 ? "max-w-xs grid-cols-1" : "grid-cols-2 md:grid-cols-4"}`}
            >
              {coachTeamsList.length > 1 && (
                <Card
                  className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${selectedTeamId === "all" ? "ring-2 ring-green-500" : ""}`}
                  onClick={() => setSelectedTeamId("all")}
                  style={{
                    backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                    borderColor: "rgba(var(--org-primary-rgb), 0.25)",
                  }}
                >
                  <CardContent className="p-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm leading-tight">
                          All Teams
                        </p>
                        <p className="text-gray-500 text-xs">
                          {coachTeamsList.length} teams
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800 text-lg leading-tight">
                          {coachTeamsList.reduce(
                            (sum, t) =>
                              sum + (playerCountByTeam.get(t.teamId) ?? 0),
                            0
                          )}
                        </p>
                        <p className="text-gray-500 text-xs">players</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {coachTeamsList.map((team) => {
                const isSelected = selectedTeamId === team.teamId;
                const playerCount = playerCountByTeam.get(team.teamId) ?? 0;
                const medCounts = medicalCountsByTeam.get(team.teamId);
                const ageMeta = [team.ageGroup, team.gender]
                  .filter(Boolean)
                  .join(" • ");
                return (
                  <Card
                    className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${isSelected ? "ring-2 ring-green-500" : ""}`}
                    key={team.teamId}
                    onClick={() => setSelectedTeamId(team.teamId)}
                    style={{
                      backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                      borderColor: "rgba(var(--org-primary-rgb), 0.25)",
                    }}
                  >
                    <CardContent className="p-2.5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-semibold text-gray-800 text-sm leading-tight"
                            title={team.teamName}
                          >
                            {team.teamName}
                          </p>
                          {ageMeta && (
                            <p className="text-gray-500 text-xs">{ageMeta}</p>
                          )}
                        </div>
                        <div className="ml-2 shrink-0 text-right">
                          <p className="font-bold text-gray-800 text-sm leading-tight">
                            {playerCount}
                          </p>
                          <p className="text-gray-500 text-xs">players</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {medCounts && medCounts.allergies > 0 && (
                          <Badge
                            className="bg-orange-100 text-orange-700"
                            title="With Allergies"
                          >
                            <AlertCircle className="h-3 w-3" />
                            <span className="ml-0.5">
                              {medCounts.allergies}
                            </span>
                          </Badge>
                        )}
                        {medCounts && medCounts.conditions > 0 && (
                          <Badge
                            className="bg-purple-100 text-purple-700"
                            title="With Conditions"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            <span className="ml-0.5">
                              {medCounts.conditions}
                            </span>
                          </Badge>
                        )}
                        {medCounts && medCounts.medications > 0 && (
                          <Badge
                            className="bg-blue-100 text-blue-700"
                            title="On Medication"
                          >
                            <Pill className="h-3 w-3" />
                            <span className="ml-0.5">
                              {medCounts.medications}
                            </span>
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search players..."
                  value={searchQuery}
                />
              </div>
            </div>
            <Select
              onValueChange={(v) => setFilterAlert(v as typeof filterAlert)}
              value={filterAlert}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by Alert" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                <SelectItem value="allergies">Has Allergies</SelectItem>
                <SelectItem value="conditions">Has Conditions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Players Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Player Medical Overview</CardTitle>
          <CardDescription>
            {filteredPlayers.length} players with medical profiles
            {hasActiveFilters && (
              <span className="ml-2 text-orange-500 text-xs">— Filtered</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPlayers.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                No players with medical profiles found
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {filteredPlayers.map(
                (item: NonNullable<typeof allProfiles>[0]) => {
                  const sportCode = item.player.sport;
                  const SPORT_NAMES: Record<string, string> = {
                    gaa_gaelic_football: "GAA Football",
                    gaa_football: "GAA Football",
                    gaa_hurling: "Hurling",
                    soccer: "Soccer",
                    football: "Soccer",
                    rugby: "Rugby",
                    rugby_union: "Rugby Union",
                    rugby_league: "Rugby League",
                    basketball: "Basketball",
                    hockey: "Hockey",
                    field_hockey: "Field Hockey",
                    athletics: "Athletics",
                    cricket: "Cricket",
                    tennis: "Tennis",
                  };
                  const sportName = sportCode
                    ? (SPORT_NAMES[sportCode.toLowerCase()] ??
                      sportCode
                        .split("_")
                        .map(
                          (w: string) => w.charAt(0).toUpperCase() + w.slice(1)
                        )
                        .join(" "))
                    : null;
                  const icePhone = item.profile?.emergencyContact1Phone;
                  return (
                    <div
                      className="cursor-pointer rounded-lg border p-3 transition-all duration-200 hover:shadow-md"
                      key={item.player._id}
                      onClick={() =>
                        handleViewClick(item.player.name, item.profile)
                      }
                      style={{
                        backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                        borderColor: "rgba(var(--org-primary-rgb), 0.25)",
                      }}
                    >
                      {/* Name */}
                      <p
                        className="truncate font-semibold text-gray-900 text-sm"
                        title={item.player.name}
                      >
                        {item.player.name}
                      </p>

                      {/* Age group */}
                      {item.player.ageGroup && (
                        <p className="truncate text-gray-500 text-xs">
                          {item.player.ageGroup}
                        </p>
                      )}

                      {/* Sport name */}
                      {sportName && (
                        <p className="truncate text-gray-400 text-xs">
                          {sportName}
                        </p>
                      )}

                      {/* ICE contact */}
                      <div className="mt-2">
                        {icePhone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 font-bold text-[10px] text-red-600">
                              <HeartPulse className="h-3 w-3" />
                              ICE
                            </span>
                            <span className="truncate font-mono text-gray-600 text-xs">
                              {icePhone}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            No ICE contact
                          </span>
                        )}
                      </div>

                      {/* Alert badges */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.hasAllergies && (
                          <Badge
                            className="bg-orange-100 text-orange-700"
                            title="Has Allergies"
                          >
                            <AlertCircle className="h-3 w-3" />
                          </Badge>
                        )}
                        {item.hasMedications && (
                          <Badge
                            className="bg-blue-100 text-blue-700"
                            title="On Medications"
                          >
                            <Pill className="h-3 w-3" />
                          </Badge>
                        )}
                        {item.hasConditions && (
                          <Badge
                            className="bg-purple-100 text-purple-700"
                            title="Has Conditions"
                          >
                            <AlertTriangle className="h-3 w-3" />
                          </Badge>
                        )}
                        {!(
                          item.hasAllergies ||
                          item.hasMedications ||
                          item.hasConditions
                        ) && (
                          <Badge className="text-green-600" variant="outline">
                            Clear
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Confirmation Dialog */}
      {pendingView && (
        <CoachPrivacyConfirmation
          onCancel={() => setPendingView(null)}
          onConfirm={handlePrivacyConfirm}
          playerName={pendingView.playerName}
        />
      )}

      {/* View Profile Dialog */}
      {viewingProfile && (
        <CoachMedicalView
          onClose={() => setViewingProfile(null)}
          playerName={viewingProfile.playerName}
          profile={viewingProfile.profile}
        />
      )}
    </div>
  );
}
