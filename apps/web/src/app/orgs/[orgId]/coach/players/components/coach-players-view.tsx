"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  FileText,
  Search,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PlayerTeamBadges } from "@/app/orgs/[orgId]/coach/components/player-team-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";

interface CoachPlayersViewProps {
  orgId: string;
}

export function CoachPlayersView({ orgId }: CoachPlayersViewProps) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { data: session } = authClient.useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>("all");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<
    "name" | "team" | "ageGroup" | "lastReview"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Fallback: use session user ID if Convex user query returns null
  const userId = currentUser?._id || session?.user?.id;

  // Get coach assignments for current user
  const coachAssignments = useQuery(
    api.models.coaches.getCoachAssignments,
    userId && orgId
      ? {
          userId,
          organizationId: orgId,
        }
      : "skip"
  );

  // Get all teams for the organization
  const teams = useQuery(
    api.models.teams.getTeamsByOrganization,
    orgId ? { organizationId: orgId } : "skip"
  );

  // Get all players from identity system
  const enrolledPlayersData = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForOrg,
    orgId ? { organizationId: orgId } : "skip"
  );

  // Transform identity-based players to legacy format for compatibility
  const allPlayers = useMemo(() => {
    if (!enrolledPlayersData) {
      return;
    }
    return enrolledPlayersData.map(
      ({ enrollment, player, sportCode }: any) => ({
        _id: player._id, // playerIdentityId for navigation
        name: `${player.firstName} ${player.lastName}`,
        firstName: player.firstName,
        lastName: player.lastName,
        ageGroup: enrollment.ageGroup,
        gender: player.gender,
        sport: sportCode || "Not assigned",
        dateOfBirth: player.dateOfBirth,
        lastReviewDate: enrollment.lastReviewDate,
        reviewStatus: enrollment.reviewStatus,
        coachNotes: enrollment.coachNotes,
        enrollmentId: enrollment._id,
        enrollmentStatus: enrollment.status,
      })
    );
  }, [enrolledPlayersData]);

  // Get team-player links from new identity system
  const teamPlayerLinks = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    orgId
      ? {
          organizationId: orgId,
          status: "active",
        }
      : "skip"
  );

  // Get coach's assigned team IDs
  const coachTeamIds = useMemo(() => {
    if (!(coachAssignments && teams)) {
      return [];
    }
    const assignmentTeams = coachAssignments.teams || [];

    // Create maps for both ID and name lookup
    const teamIdSet = new Set(teams.map((t: any) => t._id));
    const teamNameToId = new Map(teams.map((t: any) => [t.name, t._id]));

    // Convert assignment values to team IDs
    const resolvedIds = assignmentTeams
      .map((value: string) => {
        if (teamIdSet.has(value)) {
          return value;
        }
        const idFromName = teamNameToId.get(value);
        if (idFromName) {
          return idFromName;
        }
        return null;
      })
      .filter((id: string | null): id is string => id !== null);

    // Deduplicate
    return Array.from(new Set(resolvedIds));
  }, [coachAssignments, teams]);

  // Filter team-player links to only those for coach's assigned teams
  const coachTeamPlayerLinks = useMemo(() => {
    if (!teamPlayerLinks || coachTeamIds.length === 0) {
      return [];
    }
    return teamPlayerLinks.filter((link: any) =>
      coachTeamIds.includes(link.teamId)
    );
  }, [teamPlayerLinks, coachTeamIds]);

  // Get unique player IDs that belong to coach's teams
  const coachPlayerIds = useMemo(() => {
    return new Set(
      coachTeamPlayerLinks.map((link: any) => link.playerIdentityId.toString())
    );
  }, [coachTeamPlayerLinks]);

  // Filter to only coach's players
  const coachPlayers = useMemo(() => {
    if (!allPlayers || coachPlayerIds.size === 0) {
      return [];
    }
    return allPlayers.filter((player) =>
      coachPlayerIds.has(player._id.toString())
    );
  }, [allPlayers, coachPlayerIds]);

  // Get team names for each player
  const getPlayerTeams = (player: any): string[] => {
    if (!teamPlayerLinks) {
      return [];
    }
    const playerLinks = teamPlayerLinks.filter(
      (link: any) => link.playerIdentityId.toString() === player._id.toString()
    );
    const teamNames = playerLinks
      .map((link: any) => {
        const team = teams?.find((t: any) => t._id === link.teamId);
        return team?.name;
      })
      .filter((name): name is string => Boolean(name)); // Type guard to ensure only strings
    return [...new Set(teamNames)]; // Deduplicate
  };

  // Get core team name (team matching player's sport + ageGroup)
  const getCoreTeamName = (player: any) => {
    if (!teamPlayerLinks || !teams) {
      return undefined;
    }
    const playerLinks = teamPlayerLinks.filter(
      (link: any) => link.playerIdentityId.toString() === player._id.toString()
    );
    for (const link of playerLinks) {
      const team = teams.find((t: any) => t._id === link.teamId);
      if (
        team &&
        team.sport === player.sport &&
        team.ageGroup === player.ageGroup
      ) {
        return team.name;
      }
    }
    return undefined;
  };

  // Get unique filter values
  const uniqueAgeGroups = useMemo(() => {
    const ageGroups = coachPlayers.map((p) => p.ageGroup).filter(Boolean);
    return Array.from(new Set(ageGroups)).sort();
  }, [coachPlayers]);

  const uniqueSports = useMemo(() => {
    const sports = coachPlayers.map((p) => p.sport).filter(Boolean);
    return Array.from(new Set(sports)).sort();
  }, [coachPlayers]);

  const uniqueGenders = useMemo(() => {
    const genders = coachPlayers.map((p) => p.gender).filter(Boolean);
    return Array.from(new Set(genders)).sort();
  }, [coachPlayers]);

  const coachTeamNames = useMemo(() => {
    if (!teams || coachTeamIds.length === 0) {
      return [];
    }
    return teams
      .filter((t: any) => coachTeamIds.includes(t._id))
      .map((t: any) => t.name);
  }, [teams, coachTeamIds]);

  // Apply filters
  const filteredPlayers = useMemo(() => {
    return coachPlayers.filter((player) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!player.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Team filter
      if (teamFilter) {
        const playerTeams = getPlayerTeams(player);
        if (!playerTeams.includes(teamFilter)) {
          return false;
        }
      }

      // Age group filter
      if (ageGroupFilter !== "all" && player.ageGroup !== ageGroupFilter) {
        return false;
      }

      // Sport filter
      if (sportFilter !== "all" && player.sport !== sportFilter) {
        return false;
      }

      // Gender filter
      if (genderFilter !== "all" && player.gender !== genderFilter) {
        return false;
      }

      // Review status filter (standardized logic)
      if (reviewStatusFilter === "overdue") {
        // Overdue: reviewStatus is "Overdue" OR no reviewStatus OR no lastReviewDate
        const isOverdue =
          player.reviewStatus === "Overdue" ||
          !player.reviewStatus ||
          !player.lastReviewDate;
        if (!isOverdue) {
          return false;
        }
      } else if (reviewStatusFilter === "completed") {
        // Completed: reviewStatus is "Completed"
        if (player.reviewStatus !== "Completed") {
          return false;
        }
      }

      return true;
    });
  }, [
    coachPlayers,
    searchTerm,
    teamFilter,
    ageGroupFilter,
    sportFilter,
    genderFilter,
    reviewStatusFilter,
  ]);

  // Sort players
  const sortedPlayers = useMemo(() => {
    const sorted = [...filteredPlayers].sort((a, b) => {
      let comparison = 0;

      if (sortColumn === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortColumn === "team") {
        const aTeams = getPlayerTeams(a);
        const bTeams = getPlayerTeams(b);
        const aTeam = aTeams[0] || "";
        const bTeam = bTeams[0] || "";
        comparison = aTeam.localeCompare(bTeam);
      } else if (sortColumn === "ageGroup") {
        comparison = (a.ageGroup || "").localeCompare(b.ageGroup || "");
      } else if (sortColumn === "lastReview") {
        const aDate = a.lastReviewDate
          ? new Date(a.lastReviewDate).getTime()
          : 0;
        const bDate = b.lastReviewDate
          ? new Date(b.lastReviewDate).getTime()
          : 0;
        comparison = aDate - bDate;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredPlayers, sortColumn, sortDirection]);

  // Handle column sort
  const handleSort = (column: "name" | "team" | "ageGroup" | "lastReview") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleViewPlayer = (player: any) => {
    router.push(`/orgs/${orgId}/players/${player._id}`);
  };

  const handleEditPlayer = (player: any) => {
    router.push(`/orgs/${orgId}/players/${player._id}/edit`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl text-gray-900">My Players</h1>
        <p className="text-gray-600 text-sm">
          View and manage your team players
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            {/* Primary filters: Search and Team */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="-translate-y-1/2 absolute top-1/2 left-3 text-gray-400"
                  size={20}
                />
                <input
                  className="w-full rounded-lg border-2 border-gray-300 py-3 pr-10 pl-10 text-lg focus:border-green-500 focus:ring-2 focus:ring-green-500"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by player name..."
                  type="text"
                  value={searchTerm}
                />
                {searchTerm && (
                  <button
                    className="-translate-y-1/2 absolute top-1/2 right-3 text-gray-400 transition-colors hover:text-gray-600"
                    onClick={() => setSearchTerm("")}
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
              {coachTeamNames.length > 0 && (
                <div className="relative sm:w-64">
                  <select
                    className={`w-full rounded-lg border-2 px-4 py-3 font-medium text-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500 ${
                      teamFilter
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-gray-300"
                    }`}
                    onChange={(e) =>
                      setTeamFilter(e.target.value === "all" ? null : e.target.value)
                    }
                    value={teamFilter || "all"}
                  >
                    <option value="all">🏆 All Teams</option>
                    {coachTeamNames.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                  {teamFilter && (
                    <button
                      className="-translate-y-1/2 absolute top-1/2 right-10 text-purple-600 transition-colors hover:text-purple-800"
                      onClick={() => setTeamFilter(null)}
                      title="Clear team filter"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Secondary filters */}
            <div className="flex flex-wrap gap-3">
              {uniqueAgeGroups.length > 0 && (
                <select
                  className="rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
                  onChange={(e) => setAgeGroupFilter(e.target.value)}
                  value={ageGroupFilter}
                >
                  <option value="all">All Ages</option>
                  {uniqueAgeGroups.map((ag) => (
                    <option key={ag} value={ag}>
                      {ag}
                    </option>
                  ))}
                </select>
              )}
              {uniqueSports.length > 0 && (
                <select
                  className="rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
                  onChange={(e) => setSportFilter(e.target.value)}
                  value={sportFilter}
                >
                  <option value="all">All Sports</option>
                  {uniqueSports.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
              {uniqueGenders.length > 0 && (
                <select
                  className="rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
                  onChange={(e) => setGenderFilter(e.target.value)}
                  value={genderFilter}
                >
                  <option value="all">All Genders</option>
                  {uniqueGenders.map((g) => (
                    <option key={g} value={g}>
                      {g.charAt(0) + g.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              )}
              <select
                className="rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
                onChange={(e) => setReviewStatusFilter(e.target.value)}
                value={reviewStatusFilter}
              >
                <option value="all">All Reviews</option>
                <option value="overdue">Overdue (90+ days)</option>
                <option value="completed">Recently Reviewed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="text-green-600" size={20} />
            Players ({sortedPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedPlayers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-4 text-gray-300" size={48} />
              <p className="mb-2 font-medium text-gray-600 text-lg">
                No Players Found
              </p>
              <p className="mx-auto mb-4 max-w-md text-gray-500 text-sm">
                {coachPlayers.length === 0
                  ? "You don't have any players assigned to your teams yet. Contact your admin to be assigned to teams and have players added."
                  : "No players match your current filters. Try adjusting your search or filter criteria."}
              </p>
              <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                {(searchTerm ||
                  teamFilter ||
                  ageGroupFilter !== "all" ||
                  sportFilter !== "all" ||
                  genderFilter !== "all" ||
                  reviewStatusFilter !== "all") && (
                  <Button
                    onClick={() => {
                      setSearchTerm("");
                      setTeamFilter(null);
                      setAgeGroupFilter("all");
                      setSportFilter("all");
                      setGenderFilter("all");
                      setReviewStatusFilter("all");
                    }}
                    variant="outline"
                  >
                    Clear All Filters
                  </Button>
                )}
                <Button
                  onClick={() => router.push(`/orgs/${orgId}/coach`)}
                  variant="default"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-gray-200 border-b">
                    <th
                      className="cursor-pointer px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider transition-colors hover:bg-gray-100"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {sortColumn === "name" &&
                          (sortDirection === "asc" ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider transition-colors hover:bg-gray-100"
                      onClick={() => handleSort("team")}
                    >
                      <div className="flex items-center gap-1">
                        Team(s)
                        {sortColumn === "team" &&
                          (sortDirection === "asc" ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="hidden cursor-pointer px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider transition-colors hover:bg-gray-100 md:table-cell"
                      onClick={() => handleSort("ageGroup")}
                    >
                      <div className="flex items-center gap-1">
                        Age Group
                        {sortColumn === "ageGroup" &&
                          (sortDirection === "asc" ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th
                      className="hidden cursor-pointer px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider transition-colors hover:bg-gray-100 lg:table-cell"
                      onClick={() => handleSort("lastReview")}
                    >
                      <div className="flex items-center gap-1">
                        Last Review
                        {sortColumn === "lastReview" &&
                          (sortDirection === "asc" ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          ))}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedPlayers.map((player) => (
                    <tr
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      key={player._id}
                      onClick={() => handleViewPlayer(player)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                            <span className="font-medium text-green-600 text-xs">
                              {(player.name || "U")
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {player.name || "Unnamed"}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-gray-500 text-xs md:hidden">
                                {player.ageGroup}
                              </p>
                              {player.coachNotes && (
                                <span
                                  className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700"
                                  title={player.coachNotes}
                                >
                                  <FileText size={10} />
                                  Notes
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        <PlayerTeamBadges
                          teams={getPlayerTeams(player)}
                          coreTeamName={getCoreTeamName(player)}
                        />
                      </td>
                      <td className="hidden px-4 py-3 text-gray-600 text-sm md:table-cell">
                        {player.ageGroup}
                      </td>
                      <td className="hidden px-4 py-3 text-sm lg:table-cell">
                        {player.lastReviewDate ? (
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 font-medium text-xs ${(() => {
                              const days = Math.floor(
                                (Date.now() -
                                  new Date(player.lastReviewDate).getTime()) /
                                  (1000 * 60 * 60 * 24)
                              );
                              if (days <= 60)
                                return "bg-green-100 text-green-700";
                              if (days <= 90)
                                return "bg-orange-100 text-orange-700";
                              return "bg-red-100 text-red-700";
                            })()}`}
                          >
                            {new Date(
                              player.lastReviewDate
                            ).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            Not reviewed
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            className="h-8 w-8 rounded-lg p-0 text-blue-600 transition-colors hover:bg-blue-50"
                            onClick={() => handleViewPlayer(player)}
                            size="icon"
                            title="View Passport"
                            variant="ghost"
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            className="h-8 w-8 rounded-lg p-0 text-green-600 transition-colors hover:bg-green-50"
                            onClick={() => handleEditPlayer(player)}
                            size="icon"
                            title="Edit Passport"
                            variant="ghost"
                          >
                            <Edit size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sortedPlayers.length > 0 && (
            <div className="border-gray-200 border-t bg-gray-50 px-4 py-3 text-gray-600 text-sm">
              {sortedPlayers.length} player
              {sortedPlayers.length !== 1 ? "s" : ""} • Sorted by{" "}
              {sortColumn === "name"
                ? "name"
                : sortColumn === "team"
                  ? "team"
                  : sortColumn === "ageGroup"
                    ? "age group"
                    : "last review"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
