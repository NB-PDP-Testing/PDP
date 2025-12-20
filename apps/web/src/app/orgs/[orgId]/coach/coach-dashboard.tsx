"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Brain } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SmartCoachDashboard } from "@/components/smart-coach-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";

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
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // NEW: Get all players from identity system
  const enrolledPlayersData = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForOrg,
    {
      organizationId: orgId,
    }
  );

  // Transform identity-based players to legacy format for compatibility
  const allPlayers = useMemo(() => {
    if (!enrolledPlayersData) return;
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

  // Get coach's assigned team IDs (convert names to IDs if needed)
  const coachTeamIds = useMemo(() => {
    if (!(coachAssignments && teams)) return [];
    const assignmentTeams = coachAssignments.teams || [];

    // Convert team names/IDs to team IDs
    return assignmentTeams
      .map((teamValue: string) => {
        // Check if it's already a team ID (exists in teams array by _id)
        const teamById = teams.find((t: any) => t._id === teamValue);
        if (teamById) {
          return teamValue; // It's already an ID
        }

        // Check if it's a team name (exists in teams array by name)
        const teamByName = teams.find((t: any) => t.name === teamValue);
        if (teamByName) {
          return teamByName._id; // Convert name to ID
        }

        // Fallback: return as-is (might be an ID that doesn't match)
        return teamValue;
      })
      .filter(Boolean);
  }, [coachAssignments, teams]);

  // Filter team-player links to only those for coach's assigned teams
  const coachTeamPlayerLinks = useMemo(() => {
    if (!teamPlayerLinks || coachTeamIds.length === 0) return [];
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
    if (!allPlayers || coachPlayerIds.size === 0) return [];
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

    // Create skills lookup map
    const skillsMap = new Map<string, Record<string, number>>();
    if (playerSkillsData) {
      for (const playerSkills of playerSkillsData) {
        skillsMap.set(playerSkills.playerIdentityId, playerSkills.skills);
      }
    }

    const mapped = coachPlayers.map((player) => {
      // Find team links for this player (only from coach's assigned teams)
      // Note: new identity system uses playerIdentityId instead of playerId
      const links = coachTeamPlayerLinks.filter(
        (link: any) =>
          link.playerIdentityId.toString() === player._id.toString()
      );

      // Get team names from links
      const playerTeams = links
        .map((link: any) => {
          const team = teams.find((t: any) => t._id === link.teamId);
          return team?.name;
        })
        .filter(Boolean) as string[];

      // Use first team name or empty string
      const teamName = playerTeams[0] || "";

      if (links.length > 0 && !teamName) {
        console.warn(
          `[coach-dashboard] Player ${player._id} has ${links.length} links but no team name found`,
          {
            links: links.map((l: any) => l.teamId),
            teams: teams.map((t: any) => ({ id: t._id, name: t.name })),
          }
        );
      }

      // Get skills for this player
      const skills = skillsMap.get(player._id) || {};

      return {
        ...player,
        teamName,
        team: teamName, // For compatibility
        skills, // Add skills data for analytics
      };
    });

    console.log(
      `[coach-dashboard] Mapped ${mapped.length} players, ${mapped.filter((p) => p.teamName).length} with team names, ${mapped.filter((p) => Object.keys(p.skills || {}).length > 0).length} with skills`
    );

    return mapped;
  }, [coachPlayers, coachTeamPlayerLinks, teams, playerSkillsData]);

  // Get unique values for filters from coach's players
  const uniqueAgeGroups = useMemo(() => {
    const ageGroups = new Set(
      coachPlayers.map((p) => p.ageGroup).filter(Boolean)
    );
    return Array.from(ageGroups).sort();
  }, [coachPlayers]);

  const uniqueSports = useMemo(() => {
    const sports = new Set(coachPlayers.map((p) => p.sport).filter(Boolean));
    return Array.from(sports).sort();
  }, [coachPlayers]);

  const uniqueGenders = useMemo(() => {
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

    // Filter by team
    if (teamFilter) {
      filtered = filtered.filter(
        (p) => p.teamName === teamFilter || p.team === teamFilter
      );
    }

    // Filter by age group
    if (ageGroupFilter !== "all") {
      filtered = filtered.filter((p) => p.ageGroup === ageGroupFilter);
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
    if (reviewStatusFilter !== "all") {
      filtered = filtered.filter((p) => p.reviewStatus === reviewStatusFilter);
    }

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

  // Get coach team names from assignments
  // Convert team IDs to team names if needed
  const coachTeamNames = useMemo(() => {
    if (!(coachAssignments && teams)) return [];
    const assignmentTeams = coachAssignments.teams || [];

    // Convert team IDs to team names
    return assignmentTeams.map((teamValue: string) => {
      // Check if it's already a team name (exists in teams array)
      const teamByName = teams.find((t: any) => t.name === teamValue);
      if (teamByName) {
        return teamValue; // It's already a name
      }

      // Check if it's a team ID
      const teamById = teams.find((t: any) => t._id === teamValue);
      if (teamById) {
        return teamById.name; // Convert ID to name
      }

      // Fallback: return as-is (might be a name that doesn't match exactly)
      return teamValue;
    });
  }, [coachAssignments, teams]);

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
  const handleViewPlayer = (player: any) => {
    // Navigate to player passport page
    router.push(`/orgs/${orgId}/players/${player._id}`);
  };

  const handleEditPlayer = (player: any) => {
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

  return (
    <div className="space-y-6">
      <SmartCoachDashboard
        ageGroupFilter={ageGroupFilter}
        coachTeams={coachTeamNames}
        genderFilter={genderFilter}
        isClubView={false}
        onAgeGroupFilterChange={setAgeGroupFilter}
        onAssessPlayers={handleAssessPlayers}
        onClearTeamSelection={handleClearTeamSelection}
        onEditPlayer={handleEditPlayer}
        onFilterAllPlayers={handleFilterAllPlayers}
        onFilterCompletedReviews={handleFilterCompletedReviews}
        onFilterOverdueReviews={handleFilterOverdueReviews}
        onGenderFilterChange={setGenderFilter}
        onSearchChange={setSearchTerm}
        onSportFilterChange={setSportFilter}
        onTeamFilterChange={setTeamFilter}
        onViewAnalytics={handleViewAnalytics}
        onViewInjuries={handleViewInjuries}
        onViewPlayer={handleViewPlayer}
        onViewTeam={handleViewTeam}
        onViewVoiceNotes={handleViewVoiceNotes}
        players={filteredPlayers}
        searchTerm={searchTerm}
        selectedTeam={selectedTeam}
        sportFilter={sportFilter}
        teamFilter={teamFilter}
        uniqueAgeGroups={uniqueAgeGroups}
        uniqueGenders={uniqueGenders}
        uniqueSports={uniqueSports}
      />

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
