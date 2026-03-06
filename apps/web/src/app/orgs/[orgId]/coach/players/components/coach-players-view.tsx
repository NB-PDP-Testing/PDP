"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronUp,
  Edit,
  FileText,
  Mic,
  Search,
  Target,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PlayerTeamBadges } from "@/app/orgs/[orgId]/coach/components/player-team-badges";
import { PassportAvailabilityBadges } from "@/app/orgs/[orgId]/coach/players/components/passport-availability-badges";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";

type CoachPlayersViewProps = {
  orgId: string;
};

const formatSportName = (code: string) =>
  code
    .split("_")
    .map((w: string) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");

export function CoachPlayersView({ orgId }: CoachPlayersViewProps) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { data: session } = authClient.useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [teamsExpanded, setTeamsExpanded] = useState(true);
  const [minAgeFilter, setMinAgeFilter] = useState<string>("");
  const [maxAgeFilter, setMaxAgeFilter] = useState<string>("");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [sortColumn, setSortColumn] = useState<
    "name" | "team" | "ageGroup" | "lastReview"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const userId = currentUser?._id || session?.user?.id;

  const coachAssignments = useQuery(
    api.models.coaches.getCoachAssignmentsWithTeams,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );

  const teams = useQuery(
    api.models.teams.getTeamsByOrganization,
    orgId ? { organizationId: orgId } : "skip"
  );

  const enrolledPlayersData = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForCoachTeams,
    userId && orgId ? { organizationId: orgId, coachUserId: userId } : "skip"
  );

  const allPlayers = useMemo(() => {
    if (!enrolledPlayersData) {
      return;
    }
    return enrolledPlayersData.map(
      ({ enrollment, player, sportCode }: any) => ({
        _id: player._id,
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

  const teamPlayerLinks = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    orgId ? { organizationId: orgId, status: "active" } : "skip"
  );

  const coachTeamIds = useMemo(() => {
    if (!coachAssignments?.teams) {
      return [];
    }
    return coachAssignments.teams
      .filter((t) => t.teamId && !t.teamId.includes("players"))
      .map((t) => t.teamId);
  }, [coachAssignments?.teams]);

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

  const coachTeamPlayerLinks = useMemo(() => {
    if (!teamPlayerLinks || coachTeamIds.length === 0) {
      return [];
    }
    return teamPlayerLinks.filter((link: any) =>
      coachTeamIds.includes(link.teamId)
    );
  }, [teamPlayerLinks, coachTeamIds]);

  const coachPlayerIds = useMemo(
    () =>
      new Set(
        coachTeamPlayerLinks.map((link: any) =>
          link.playerIdentityId.toString()
        )
      ),
    [coachTeamPlayerLinks]
  );

  const coachPlayers = useMemo(() => {
    if (!allPlayers || coachPlayerIds.size === 0) {
      return [];
    }
    return allPlayers.filter((p) => coachPlayerIds.has(p._id.toString()));
  }, [allPlayers, coachPlayerIds]);

  const passportAvailability = useQuery(
    api.models.passportSharing.checkPassportAvailabilityBulk,
    userId && coachPlayers.length > 0
      ? {
          playerIdentityIds: coachPlayers.map((p) => p._id),
          organizationId: orgId,
          userId,
        }
      : "skip"
  );

  // Applied voice insights for coach's players (org-scoped, aggregated client-side)
  const appliedInsights = useQuery(
    api.models.voiceNoteInsights.getPendingInsights,
    userId && orgId ? { organizationId: orgId, status: "applied" } : "skip"
  );

  // Active development goals for org (aggregated client-side by player)
  const activeGoals = useQuery(
    api.models.passportGoals.getGoalsForOrg,
    orgId ? { organizationId: orgId, status: "in_progress" } : "skip"
  );

  // Map of playerIdentityId -> applied insight count
  const insightCountByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    if (!appliedInsights) {
      return map;
    }
    for (const insight of appliedInsights) {
      if (!insight.playerIdentityId) {
        continue;
      }
      const pid = insight.playerIdentityId.toString();
      map.set(pid, (map.get(pid) ?? 0) + 1);
    }
    return map;
  }, [appliedInsights]);

  // Map of playerIdentityId -> active goal count
  const goalCountByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    if (!activeGoals) {
      return map;
    }
    for (const goal of activeGoals) {
      const pid = goal.playerIdentityId.toString();
      map.set(pid, (map.get(pid) ?? 0) + 1);
    }
    return map;
  }, [activeGoals]);

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
      .filter((name): name is string => Boolean(name));
    return [...new Set(teamNames)];
  };

  const getCoreTeamName = (player: any) => {
    if (!(teamPlayerLinks && teams)) {
      return;
    }
    const playerLinks = teamPlayerLinks.filter(
      (link: any) => link.playerIdentityId.toString() === player._id.toString()
    );
    for (const link of playerLinks) {
      const team = teams.find((t: any) => t._id === link.teamId);
      if (
        team &&
        team.sport === player.sport &&
        team.ageGroup?.toLowerCase() === player.ageGroup?.toLowerCase()
      ) {
        return team.name;
      }
    }
  };

  const getPassportAvailability = (player: any) => {
    if (!passportAvailability) {
      return null;
    }
    return passportAvailability.find(
      (pa) => pa.playerIdentityId.toString() === player._id.toString()
    );
  };

  const uniqueSports = useMemo(
    () =>
      Array.from(
        new Set(coachPlayers.map((p) => p.sport).filter(Boolean))
      ).sort(),
    [coachPlayers]
  );

  const uniqueGenders = useMemo(
    () =>
      Array.from(
        new Set(coachPlayers.map((p) => p.gender).filter(Boolean))
      ).sort(),
    [coachPlayers]
  );

  const calcAge = (dob: string) =>
    Math.floor(
      (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    );

  const filteredPlayers = useMemo(
    () =>
      coachPlayers.filter((player) => {
        if (selectedTeamId !== "all") {
          const playerTeamIds =
            teamPlayerLinks
              ?.filter(
                (link: any) =>
                  link.playerIdentityId.toString() === player._id.toString()
              )
              .map((link: any) => link.teamId) ?? [];
          if (!playerTeamIds.includes(selectedTeamId)) {
            return false;
          }
        }

        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          if (!player.name.toLowerCase().includes(q)) {
            return false;
          }
        }

        if (minAgeFilter || maxAgeFilter) {
          if (!player.dateOfBirth) {
            return false;
          }
          const age = calcAge(player.dateOfBirth);
          if (minAgeFilter && age < Number(minAgeFilter)) {
            return false;
          }
          if (maxAgeFilter && age > Number(maxAgeFilter)) {
            return false;
          }
        }

        if (sportFilter !== "all" && player.sport !== sportFilter) {
          return false;
        }

        if (genderFilter !== "all" && player.gender !== genderFilter) {
          return false;
        }

        return true;
      }),
    [
      coachPlayers,
      selectedTeamId,
      searchTerm,
      minAgeFilter,
      maxAgeFilter,
      sportFilter,
      genderFilter,
      teamPlayerLinks,
      calcAge,
    ]
  );

  const sortedPlayers = useMemo(
    () =>
      [...filteredPlayers].sort((a, b) => {
        let comparison = 0;
        if (sortColumn === "name") {
          comparison = a.name.localeCompare(b.name);
        } else if (sortColumn === "team") {
          const aTeam = getPlayerTeams(a)[0] || "";
          const bTeam = getPlayerTeams(b)[0] || "";
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
      }),
    [filteredPlayers, sortColumn, sortDirection, getPlayerTeams]
  );

  const handleSort = (col: "name" | "team" | "ageGroup" | "lastReview") => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const selectedTeamName = useMemo(() => {
    if (selectedTeamId === "all") {
      return "All Teams";
    }
    return (
      coachTeamsList.find((t) => t.teamId === selectedTeamId)?.teamName ??
      "All Teams"
    );
  }, [selectedTeamId, coachTeamsList]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setMinAgeFilter("");
    setMaxAgeFilter("");
    setSportFilter("all");
    setGenderFilter("all");
  };

  const hasActiveFilters =
    searchTerm ||
    minAgeFilter ||
    maxAgeFilter ||
    sportFilter !== "all" ||
    genderFilter !== "all";

  return (
    <div className="space-y-6">
      <OrgThemedGradient
        className="rounded-lg p-4 shadow-md md:p-6"
        style={{ filter: "brightness(0.95)" }}
      >
        <div className="flex items-center gap-2 md:gap-3">
          <Users className="h-7 w-7 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-xl md:text-2xl">My Players</h1>
            <p className="text-xs opacity-80 md:text-sm">
              View and manage your team players
            </p>
          </div>
        </div>
      </OrgThemedGradient>

      {/* Team Selector */}
      {coachTeamsList.length > 0 && (
        <div>
          <button
            className="mb-3 flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-gray-50"
            onClick={() => setTeamsExpanded((prev) => !prev)}
            type="button"
          >
            <span className="font-semibold text-gray-700 text-sm">
              {selectedTeamId === "all"
                ? "All Teams"
                : `${selectedTeamName} · selected`}
            </span>
            {teamsExpanded ? (
              <ChevronUp className="text-gray-500" size={18} />
            ) : (
              <ChevronDown className="text-gray-500" size={18} />
            )}
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
                        <p className="font-bold text-gray-800 text-sm leading-tight">
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
                      <div className="flex items-center justify-between">
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
        <CardHeader>
          <button
            className="flex w-full items-center justify-between"
            onClick={() => setFiltersExpanded((prev) => !prev)}
            type="button"
          >
            <CardTitle className="text-base">Filters</CardTitle>
            {filtersExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {filtersExpanded && (
          <CardContent className="pt-0">
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search
                  className="-translate-y-1/2 absolute top-1/2 left-3 text-gray-400"
                  size={16}
                />
                <input
                  className="w-full rounded-lg border border-gray-300 py-2 pr-10 pl-9 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by player name..."
                  type="text"
                  value={searchTerm}
                />
                {searchTerm && (
                  <button
                    className="-translate-y-1/2 absolute top-1/2 right-3 text-gray-400 transition-colors hover:text-gray-600"
                    onClick={() => setSearchTerm("")}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500"
                  max="100"
                  min="0"
                  onChange={(e) => setMinAgeFilter(e.target.value)}
                  placeholder="Min age"
                  type="number"
                  value={minAgeFilter}
                />
                <input
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500"
                  max="100"
                  min="0"
                  onChange={(e) => setMaxAgeFilter(e.target.value)}
                  placeholder="Max age"
                  type="number"
                  value={maxAgeFilter}
                />
                {uniqueSports.length > 0 && (
                  <select
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500"
                    onChange={(e) => setSportFilter(e.target.value)}
                    value={sportFilter}
                  >
                    <option value="all">All Sports</option>
                    {uniqueSports.map((s) => (
                      <option key={s} value={s}>
                        {formatSportName(s)}
                      </option>
                    ))}
                  </select>
                )}
                {uniqueGenders.length > 0 && (
                  <select
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500"
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
                {hasActiveFilters && (
                  <button
                    className="rounded-lg border border-gray-300 px-3 py-2 text-gray-500 text-sm transition-colors hover:border-gray-400 hover:text-gray-700"
                    onClick={clearAllFilters}
                    type="button"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Players Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="text-green-600" size={20} />
                Players ({sortedPlayers.length})
              </CardTitle>
              {hasActiveFilters && (
                <p className="mt-0.5 text-orange-500 text-xs">
                  Filtered — not showing all players
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              Sort by:
              {(
                [
                  ["name", "Name"],
                  ["team", "Team"],
                  ["ageGroup", "Age"],
                  ["lastReview", "Review"],
                ] as const
              ).map(([col, label]) => (
                <button
                  className={`flex items-center gap-0.5 rounded px-2 py-1 transition-colors hover:bg-gray-100 ${sortColumn === col ? "font-semibold text-green-600" : ""}`}
                  key={col}
                  onClick={() => handleSort(col)}
                  type="button"
                >
                  {label}
                  {sortColumn === col &&
                    (sortDirection === "asc" ? (
                      <ChevronUp size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    ))}
                </button>
              ))}
            </div>
          </div>
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
                {(selectedTeamId !== "all" || hasActiveFilters) && (
                  <Button onClick={clearAllFilters} variant="outline">
                    Clear Filters
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
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {sortedPlayers.map((player) => {
                const reviewDays = player.lastReviewDate
                  ? Math.floor(
                      (Date.now() - new Date(player.lastReviewDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : null;
                const reviewBadge =
                  reviewDays !== null
                    ? reviewDays <= 60
                      ? {
                          label: `${reviewDays}d ago`,
                          cls: "bg-green-100 text-green-700",
                        }
                      : reviewDays <= 90
                        ? {
                            label: `${reviewDays}d ago`,
                            cls: "bg-orange-100 text-orange-700",
                          }
                        : {
                            label: `${reviewDays}d ago`,
                            cls: "bg-red-100 text-red-700",
                          }
                    : null;
                const availability = getPassportAvailability(player);
                const insightCount =
                  insightCountByPlayer.get(player._id.toString()) ?? 0;
                const goalCount =
                  goalCountByPlayer.get(player._id.toString()) ?? 0;
                const hasNotes = Boolean(player.coachNotes?.trim());
                // biome-ignore lint/a11y/useSemanticElements: card layout uses div for complex nested content
                return (
                  <div
                    className="group relative cursor-pointer rounded-lg border p-3 transition-all duration-200 hover:shadow-md"
                    key={player._id}
                    onClick={() =>
                      router.push(`/orgs/${orgId}/players/${player._id}`)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        router.push(`/orgs/${orgId}/players/${player._id}`);
                      }
                    }}
                    role="button"
                    style={{
                      backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                      borderColor: "rgba(var(--org-primary-rgb), 0.25)",
                    }}
                    tabIndex={0}
                  >
                    {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: stopPropagation needed */}
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation needed */}
                    <div
                      className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Button
                        className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                        onClick={() =>
                          router.push(
                            `/orgs/${orgId}/players/${player._id}/edit`
                          )
                        }
                        size="icon"
                        title="Edit Profile"
                        variant="ghost"
                      >
                        <Edit size={12} />
                      </Button>
                    </div>

                    <p
                      className="truncate font-semibold text-gray-900 text-sm"
                      title={player.name || "Unnamed"}
                    >
                      {player.name || "Unnamed"}
                    </p>

                    {player.dateOfBirth ? (
                      <p className="truncate text-gray-500 text-xs">
                        {calcAge(player.dateOfBirth) >= 18
                          ? "Adult"
                          : `Age ${calcAge(player.dateOfBirth)}`}
                      </p>
                    ) : player.ageGroup ? (
                      <p className="truncate text-gray-500 text-xs">
                        {player.ageGroup}
                      </p>
                    ) : null}

                    <div className="mt-1.5">
                      <PlayerTeamBadges
                        coreTeamName={getCoreTeamName(player)}
                        teams={getPlayerTeams(player)}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {reviewBadge && (
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${reviewBadge.cls}`}
                        >
                          {reviewBadge.label}
                        </span>
                      )}
                      {insightCount > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700"
                          title="Voice insights applied"
                        >
                          <Mic size={10} />
                          {insightCount}
                        </span>
                      )}
                      {goalCount > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700"
                          title="Active development goals"
                        >
                          <Target size={10} />
                          {goalCount}
                        </span>
                      )}
                      {hasNotes && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700"
                          title="Has development notes"
                        >
                          <FileText size={10} />1
                        </span>
                      )}
                      {availability && (
                        <PassportAvailabilityBadges
                          activeCount={availability.activeShareCount}
                          hasActiveSharesToView={
                            availability.hasActiveSharesToView
                          }
                          hasPendingSharesToAccept={
                            availability.hasPendingSharesToAccept
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/orgs/${orgId}/coach/shared-passports` as any
                            );
                          }}
                          pendingCount={availability.pendingShareCount}
                          variant="compact"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {sortedPlayers.length > 0 && (
            <div className="mt-4 border-gray-200 border-t pt-3 text-gray-500 text-xs">
              {sortedPlayers.length} player
              {sortedPlayers.length !== 1 ? "s" : ""}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
