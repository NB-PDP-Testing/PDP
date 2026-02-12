"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  Share2,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SmartCoachDashboard } from "@/components/smart-coach-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";
import { CoachNotesSection } from "./coach-notes-section";
import { PlayerTeamBadges } from "./components/player-team-badges";

export function CoachDashboard() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  // Handler for navigating to assess page
  const handleAssessPlayers = () => {
    router.push(`/orgs/${orgId}/coach/assess`);
  };
  const currentUser = useCurrentUser();
  const { data: session } = authClient.useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>("all");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [_selectedTeamId, _setSelectedTeamId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<
    "name" | "team" | "ageGroup" | "lastReview"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Fallback: use session user ID if Convex user query returns null
  const userId = currentUser?._id || session?.user?.id;

  // Get coach assignments with enriched team data (Pattern B)
  // Uses getCoachAssignmentsWithTeams for single-query enriched data
  const coachAssignments = useQuery(
    api.models.coaches.getCoachAssignmentsWithTeams,
    userId && orgId
      ? {
          userId,
          organizationId: orgId,
        }
      : "skip"
  );

  // Get passport sharing counts
  const sharedPassports = useQuery(
    api.models.passportSharing.getSharedPassportsForCoach,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );

  const pendingShares = useQuery(
    api.models.passportSharing.getPendingSharesForCoach,
    userId && orgId ? { userId, organizationId: orgId } : "skip"
  );

  const activeCount = sharedPassports?.length ?? 0;
  const pendingCount = pendingShares?.length ?? 0;

  // Get all teams for the organization
  // Note: Dashboard needs ALL org teams (not just coach's assigned teams)
  // because players can be on multiple teams, and we need to look up any team
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // Get players for coach's assigned teams (server-side filtering)
  // Performance: Uses getPlayersForCoachTeams which only returns players on coach's teams
  // instead of fetching ALL org players and filtering client-side
  const enrolledPlayersData = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForCoachTeams,
    userId && orgId
      ? {
          organizationId: orgId,
          coachUserId: userId,
        }
      : "skip"
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
        sport: sportCode || "Not assigned", // From sport passport
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
    {
      organizationId: orgId,
      status: "active",
    }
  );

  // Get skill assessments for all players
  const playerSkillsData = useQuery(
    api.models.skillAssessments.getLatestSkillsForCoachPlayers,
    allPlayers && orgId
      ? {
          organizationId: orgId,
          playerIdentityIds: allPlayers.map((p) => p._id),
        }
      : "skip"
  );

  // Get coach's assigned team IDs (Pattern B - already resolved server-side)
  // getCoachAssignmentsWithTeams handles legacy data (names vs IDs) on the server
  // Filter out corrupted team IDs (e.g., player IDs)
  const coachTeamIds = useMemo(() => {
    if (!coachAssignments?.teams) {
      return [];
    }
    // Team IDs are already resolved and enriched by the server
    // Skip any corrupted IDs (e.g., player IDs mistakenly stored as team IDs)
    return coachAssignments.teams
      .filter((team) => {
        if (!team.teamId) {
          return false;
        }
        if (team.teamId.includes("players")) {
          console.warn(`[Dashboard] Skipping corrupted teamId: ${team.teamId}`);
          return false;
        }
        return true;
      })
      .map((team) => team.teamId);
  }, [coachAssignments?.teams]);

  // Filter team-player links to only those for coach's assigned teams
  const coachTeamPlayerLinks = useMemo(() => {
    if (!teamPlayerLinks || coachTeamIds.length === 0) {
      return [];
    }
    return teamPlayerLinks.filter((link: any) =>
      coachTeamIds.includes(link.teamId)
    );
  }, [teamPlayerLinks, coachTeamIds]);

  // Get unique player IDs from coach's team links
  // Note: new identity system uses playerIdentityId instead of playerId
  const coachPlayerIds = useMemo(
    () =>
      new Set(
        coachTeamPlayerLinks.map((link: any) =>
          link.playerIdentityId.toString()
        )
      ),
    [coachTeamPlayerLinks]
  );

  // Filter players to only those in coach's teams
  const coachPlayers = useMemo(() => {
    if (!allPlayers || coachPlayerIds.size === 0) {
      return [];
    }
    return allPlayers.filter((player) =>
      coachPlayerIds.has(player._id.toString())
    );
  }, [allPlayers, coachPlayerIds]);

  // Map players with team names and skills (similar to admin/coaches approach)
  const playersWithTeams = useMemo(() => {
    if (!(coachPlayers && teamPlayerLinks && teams)) {
      console.log("[coach-dashboard] playersWithTeams: missing data", {
        coachPlayers: coachPlayers?.length ?? "undefined",
        teamPlayerLinks: teamPlayerLinks?.length ?? "undefined",
        teams: teams?.length ?? "undefined",
      });
      return [];
    }

    console.log(
      `[coach-dashboard] Mapping ${coachPlayers.length} players with ${teamPlayerLinks.length} links and ${teams.length} teams`
    );

    // Create skills lookup map - use string keys for reliable lookups
    const skillsMap = new Map<string, Record<string, number>>();
    if (playerSkillsData) {
      for (const playerSkills of playerSkillsData) {
        // Convert ID to string for consistent map key lookup
        skillsMap.set(
          String(playerSkills.playerIdentityId),
          playerSkills.skills
        );
      }
    }

    const mapped = coachPlayers.map((player) => {
      // Find team links for this player (USE ALL TEAM LINKS, NOT JUST COACH'S TEAMS)
      // This ensures we show all teams the player is on, not just the coach's assigned teams
      const links = teamPlayerLinks.filter(
        (link: any) =>
          link.playerIdentityId.toString() === player._id.toString()
      );

      // Get ALL team details from links (not just first one!)
      const playerTeamDetails = links
        .map((link: any) => {
          const team = teams.find((t: any) => t._id === link.teamId);
          return team
            ? {
                teamId: team._id,
                teamName: team.name,
                ageGroup: team.ageGroup,
                sport: team.sport,
              }
            : null;
        })
        .filter(Boolean);

      // Calculate core team (team where team.ageGroup === player.ageGroup)
      const coreTeam = playerTeamDetails.find(
        (t: any) => t.ageGroup?.toLowerCase() === player.ageGroup?.toLowerCase()
      );

      // Get array of all team names
      const playerTeams = playerTeamDetails.map((t: any) => t.teamName);

      // Use first team name for compatibility (but we'll also pass playerTeams array)
      const teamName = playerTeams[0] || "";

      if (links.length > 0 && playerTeams.length === 0) {
        console.warn(
          `[coach-dashboard] Player ${player._id} has ${links.length} links but no team names found`,
          {
            links: links.map((l: any) => l.teamId),
            teams: teams.map((t: any) => ({ id: t._id, name: t.name })),
          }
        );
      }

      // Get skills for this player - use string key for lookup
      const skills = skillsMap.get(String(player._id)) || {};

      return {
        ...player,
        teamName, // First team for compatibility
        team: teamName, // For compatibility
        teams: playerTeams, // ALL teams the player is on
        teamDetails: playerTeamDetails, // Full team details including ageGroup
        coreTeamName: coreTeam?.teamName, // Core team name
        skills, // Add skills data for analytics
      };
    });

    console.log(
      `[coach-dashboard] Mapped ${mapped.length} players, ${mapped.filter((p) => p.teamName).length} with team names, ${mapped.filter((p) => Object.keys(p.skills || {}).length > 0).length} with skills`
    );

    return mapped;
  }, [coachPlayers, teams, playerSkillsData, teamPlayerLinks]);

  // Get unique values for filters from coach's players
  const _uniqueAgeGroups = useMemo(() => {
    const ageGroups = new Set(
      coachPlayers.map((p) => p.ageGroup).filter(Boolean)
    );
    return Array.from(ageGroups).sort();
  }, [coachPlayers]);

  const _uniqueSports = useMemo(() => {
    const sports = new Set(coachPlayers.map((p) => p.sport).filter(Boolean));
    return Array.from(sports).sort();
  }, [coachPlayers]);

  const _uniqueGenders = useMemo(() => {
    const genders = new Set(coachPlayers.map((p) => p.gender).filter(Boolean));
    return Array.from(genders).sort();
  }, [coachPlayers]);

  // Filter players based on all filters
  const filteredPlayers = useMemo(() => {
    let filtered = playersWithTeams;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((p) =>
        p.name?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by team - check if player is on the filtered team (supports multi-team)
    if (teamFilter) {
      filtered = filtered.filter((p) => {
        // Check if player's teams array includes the filter team
        if (p.teams && Array.isArray(p.teams)) {
          return p.teams.includes(teamFilter);
        }
        // Fallback for backwards compatibility (single team)
        return p.teamName === teamFilter || p.team === teamFilter;
      });
    }

    // Filter by age group
    if (ageGroupFilter !== "all") {
      filtered = filtered.filter(
        (p) => p.ageGroup?.toLowerCase() === ageGroupFilter?.toLowerCase()
      );
    }

    // Filter by sport
    if (sportFilter !== "all") {
      filtered = filtered.filter((p) => p.sport === sportFilter);
    }

    // Filter by gender
    if (genderFilter !== "all") {
      filtered = filtered.filter(
        (p) => p.gender?.toUpperCase() === genderFilter.toUpperCase()
      );
    }

    // Filter by review status
    if (reviewStatusFilter === "Completed") {
      // Show only completed reviews
      filtered = filtered.filter((p) => p.reviewStatus === "Completed");
    } else if (reviewStatusFilter === "Overdue") {
      // Show players who need review: overdue, no status, or never reviewed
      filtered = filtered.filter(
        (p) =>
          p.reviewStatus === "Overdue" || !p.reviewStatus || !p.lastReviewDate
      );
    }
    // "all" shows all players (no filter applied)

    return filtered;
  }, [
    playersWithTeams,
    searchTerm,
    teamFilter,
    ageGroupFilter,
    sportFilter,
    genderFilter,
    reviewStatusFilter,
  ]);

  // Sort filtered players for the roster table
  const sortedPlayers = useMemo(() => {
    const sorted = [...filteredPlayers];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sortColumn === "name") {
        comparison = (a.name || "").localeCompare(b.name || "");
      } else if (sortColumn === "team") {
        const aTeam = a.teams?.[0] || a.teamName || "";
        const bTeam = b.teams?.[0] || b.teamName || "";
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

  // Handle column sort toggle
  const handleSort = (column: "name" | "team" | "ageGroup" | "lastReview") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(
    () =>
      !!searchTerm ||
      !!teamFilter ||
      ageGroupFilter !== "all" ||
      sportFilter !== "all" ||
      genderFilter !== "all" ||
      reviewStatusFilter !== "all",
    [
      searchTerm,
      teamFilter,
      ageGroupFilter,
      sportFilter,
      genderFilter,
      reviewStatusFilter,
    ]
  );

  // Get selected team data (for team notes)
  const selectedTeamData = useMemo(() => {
    if (!(selectedTeam && teams)) {
      return null;
    }
    const team = teams.find((t: any) => t.name === selectedTeam);
    if (!team) {
      return null;
    }
    return {
      _id: team._id,
      name: team.name,
      coachNotes: team.coachNotes,
    };
  }, [selectedTeam, teams]);

  // Mutation for updating team notes
  const updateTeamNotes = useMutation(api.models.teams.updateTeamNotes);

  // Handler for saving team notes
  const handleSaveTeamNote = async (
    teamId: string,
    note: string
  ): Promise<boolean> => {
    try {
      const result = await updateTeamNotes({
        teamId,
        note,
        appendMode: true,
      });
      if (result.success) {
        toast.success("Team note saved!", {
          description: `Note added to ${result.teamName}`,
        });
        return true;
      }
      toast.error("Failed to save note");
      return false;
    } catch (error) {
      toast.error("Failed to save note", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  };

  // Get coach team names from team IDs
  // Coach assignments now store IDs directly, so just look up the names
  const coachTeamNames = useMemo(() => {
    if (!teams) {
      return [];
    }

    // Create a map of team ID to name for quick lookup
    const teamIdToName = new Map(teams.map((t: any) => [t._id, t.name]));

    // Convert valid team IDs to team names
    return coachTeamIds
      .map((teamId: string) => teamIdToName.get(teamId))
      .filter((name): name is string => !!name);
  }, [coachTeamIds, teams]);

  // Check if any query is still loading
  // Note: null means loaded but no data found, undefined means still loading
  // If userId is null, queries are skipped and we should show error
  const hasUser = userId !== null && userId !== undefined;
  const isLoading =
    // Wait for session to load if we don't have a user yet
    (!userId && session === undefined) ||
    // Wait for currentUser query if we have session but no user yet
    (session?.user?.id && currentUser === undefined) ||
    teams === undefined ||
    teamPlayerLinks === undefined ||
    allPlayers === undefined ||
    playerSkillsData === undefined ||
    sharedPassports === undefined ||
    pendingShares === undefined ||
    // Only check coachAssignments if we have a user
    (hasUser && coachAssignments === undefined);

  // Debug logging (remove in production)
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.log("Coach Dashboard Debug:", {
      currentUser: currentUser?._id || "null/undefined",
      sessionUserId: session?.user?.id || "null/undefined",
      userId: userId || "null/undefined",
      orgId,
      coachAssignments:
        coachAssignments === undefined
          ? "loading"
          : coachAssignments === null
            ? "null (no assignments)"
            : `loaded (${coachAssignments.teams.length} teams: ${JSON.stringify(coachAssignments.teams)})`,
      coachTeamNames:
        coachTeamNames.length > 0 ? JSON.stringify(coachTeamNames) : "empty",
      teams: teams
        ? `loaded (${teams.length}): ${teams.map((t: any) => `${t.name}(${t._id})`).join(", ")}`
        : "loading",
      allPlayers: allPlayers ? `loaded (${allPlayers.length})` : "loading",
      coachTeamIds: coachTeamIds.length,
      coachTeamPlayerLinks: coachTeamPlayerLinks.length,
      coachPlayers: coachPlayers.length,
      playersWithTeams: playersWithTeams.length,
      filteredPlayers: filteredPlayers.length,
      teamPlayerLinks: teamPlayerLinks
        ? `loaded (${teamPlayerLinks.length})`
        : "loading",
      isLoading,
    });
  }

  // Handle case where user is not authenticated
  if (!userId && session === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Brain className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="mb-2 font-semibold text-gray-700 text-lg">
            Authentication Required
          </h3>
          <p className="mb-4 text-gray-500">
            You need to be logged in to view the coach dashboard.
          </p>
          <button
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            onClick={() => router.push("/login")}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-green-600 border-b-2" />
          <p className="text-gray-600">Loading coach dashboard...</p>
        </div>
      </div>
    );
  }

  // Handle case where coach has no assignments
  if (!coachAssignments || coachAssignments.teams.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="mb-2 font-semibold text-gray-700 text-lg">
              No Teams Assigned
            </h3>
            <p className="mb-4 text-gray-500">
              You don't have any teams assigned yet. Contact your administrator
              to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle navigation callbacks
  const handleViewTeam = (teamName: string) => {
    // Toggle: if same team is clicked, clear selection; otherwise select it
    if (selectedTeam === teamName) {
      setSelectedTeam(null);
      setTeamFilter(null);
    } else {
      setSelectedTeam(teamName);
      setTeamFilter(teamName);
    }
    setReviewStatusFilter("all");
    // Scroll to top or navigate to players list
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearTeamSelection = () => {
    setSelectedTeam(null);
    setTeamFilter(null);
    setReviewStatusFilter("all");
  };

  const handleViewAnalytics = (teamName?: string) => {
    if (teamName) {
      setTeamFilter(teamName);
    }
    // Navigate to analytics page or show analytics modal
    // For now, just scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFilterOverdueReviews = () => {
    setReviewStatusFilter("Overdue");
    setTeamFilter(null);
    setSearchTerm("");
    setAgeGroupFilter("all");
    setSportFilter("all");
    setGenderFilter("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFilterAllPlayers = () => {
    setReviewStatusFilter("all");
    setTeamFilter(null);
    setSelectedTeam(null);
    setSearchTerm("");
    setAgeGroupFilter("all");
    setSportFilter("all");
    setGenderFilter("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFilterCompletedReviews = () => {
    setReviewStatusFilter("Completed");
    setTeamFilter(null);
    setSearchTerm("");
    setAgeGroupFilter("all");
    setSportFilter("all");
    setGenderFilter("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle player view/edit navigation
  const _handleViewPlayer = (player: any) => {
    // Navigate to player passport page
    router.push(`/orgs/${orgId}/players/${player._id}`);
  };

  const _handleEditPlayer = (player: any) => {
    // Navigate to player edit page
    router.push(`/orgs/${orgId}/players/${player._id}/edit`);
  };

  const handleViewVoiceNotes = () => {
    // Navigate to voice notes page
    router.push(`/orgs/${orgId}/coach/voice-notes`);
  };

  const handleViewInjuries = () => {
    // Navigate to injury tracking page
    router.push(`/orgs/${orgId}/coach/injuries`);
  };

  const handleViewGoals = () => {
    // Navigate to goals dashboard
    router.push(`/orgs/${orgId}/coach/goals`);
  };

  const handleViewMedical = () => {
    // Navigate to medical info page
    router.push(`/orgs/${orgId}/coach/medical`);
  };

  const handleViewMatchDay = () => {
    // Navigate to match day ICE contacts page
    router.push(`/orgs/${orgId}/coach/match-day`);
  };

  return (
    <div className="space-y-6">
      <SmartCoachDashboard
        allPlayers={playersWithTeams}
        coachTeams={coachTeamNames}
        isClubView={false}
        onAssessPlayers={handleAssessPlayers}
        onClearTeamSelection={handleClearTeamSelection}
        onFilterAllPlayers={handleFilterAllPlayers}
        onFilterCompletedReviews={handleFilterCompletedReviews}
        onFilterOverdueReviews={handleFilterOverdueReviews}
        onSaveTeamNote={handleSaveTeamNote}
        onViewAnalytics={handleViewAnalytics}
        onViewGoals={handleViewGoals}
        onViewInjuries={handleViewInjuries}
        onViewMatchDay={handleViewMatchDay}
        onViewMedical={handleViewMedical}
        onViewTeam={handleViewTeam}
        onViewVoiceNotes={handleViewVoiceNotes}
        players={filteredPlayers}
        selectedTeam={selectedTeam}
        selectedTeamData={selectedTeamData}
      />

      {/* Player Roster Table */}
      {sortedPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="text-green-600" size={20} />
              Players ({sortedPlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-gray-200 border-b">
                  <tr>
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
                      onClick={() =>
                        router.push(`/orgs/${orgId}/players/${player._id}`)
                      }
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
                            <p className="text-gray-500 text-xs md:hidden">
                              {player.ageGroup}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        <PlayerTeamBadges
                          coreTeamName={player.coreTeamName}
                          teams={player.teams || []}
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
                              if (days <= 60) {
                                return "bg-green-100 text-green-700";
                              }
                              if (days <= 90) {
                                return "bg-orange-100 text-orange-700";
                              }
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
                      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: stopPropagation needed */}
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            className="h-8 w-8 rounded-lg p-0 text-blue-600 transition-colors hover:bg-blue-50"
                            onClick={() =>
                              router.push(
                                `/orgs/${orgId}/players/${player._id}`
                              )
                            }
                            size="icon"
                            title="View Passport"
                            variant="ghost"
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            className="h-8 w-8 rounded-lg p-0 text-green-600 transition-colors hover:bg-green-50"
                            onClick={() =>
                              router.push(
                                `/orgs/${orgId}/players/${player._id}/edit`
                              )
                            }
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
            <div className="border-gray-200 border-t bg-gray-50 px-4 py-3 text-gray-600 text-sm">
              {sortedPlayers.length} player
              {sortedPlayers.length !== 1 ? "s" : ""} • Sorted by{" "}
              {
                {
                  name: "name",
                  team: "team",
                  ageGroup: "age group",
                  lastReview: "last review",
                }[sortColumn]
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coach Notes Section - shows all players with notes */}
      <CoachNotesSection players={playersWithTeams} />

      {/* Passport Sharing Summary */}
      {userId && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-600" />
              Shared Passports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm">
                  {pendingCount > 0
                    ? `${pendingCount} pending share${pendingCount === 1 ? "" : "s"} awaiting review`
                    : `${activeCount} active shared passport${activeCount === 1 ? "" : "s"}`}
                </p>
              </div>
              <Button
                onClick={() =>
                  router.push(`/orgs/${orgId}/coach/shared-passports` as any)
                }
              >
                {pendingCount > 0 ? "Review Pending" : "Manage Passports"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredPlayers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="mb-2 font-semibold text-gray-700 text-lg">
              {hasActiveFilters ? "No Players Match Filters" : "No Teams Found"}
            </h3>
            <p className="mb-4 text-gray-500">
              {hasActiveFilters
                ? "Try adjusting your filters to see more players."
                : "You don't have any teams assigned yet. Contact your administrator to get started."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
