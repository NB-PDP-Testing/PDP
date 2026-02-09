"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Check,
  CheckCircle,
  ChevronRight,
  History,
  Loader2,
  Save,
  Search,
  Target,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import {
  getRatingConfig,
  type Rating,
  RatingSlider,
} from "@/components/rating-slider";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";

type AssessmentType = "training" | "match" | "formal_review" | "trial";
type AssessmentMode = "individual" | "batch";

// Batch assessment state for multiple players
type BatchRatings = Record<string, Record<string, number>>; // playerId -> skillCode -> rating
type BatchNotes = Record<string, Record<string, string>>; // playerId -> skillCode -> notes

export default function AssessPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const currentUser = useCurrentUser();
  const { data: session } = authClient.useSession();

  // Fallback: use session user ID if Convex user query returns null
  const userId = currentUser?._id || session?.user?.id;

  // State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedSportCode, setSelectedSportCode] = useState<string | null>(
    "all" // Default to "All Sports"
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [assessmentType, setAssessmentType] =
    useState<AssessmentType>("training");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSkills, setSavedSkills] = useState<Set<string>>(new Set());

  // Batch assessment mode state
  const [assessmentMode, setAssessmentMode] =
    useState<AssessmentMode>("individual");
  const [selectedBatchPlayers, setSelectedBatchPlayers] = useState<Set<string>>(
    new Set()
  );
  const [batchSelectedSkills, setBatchSelectedSkills] = useState<Set<string>>(
    new Set()
  );
  const [_batchRatings, setBatchRatings] = useState<BatchRatings>({});
  const [_batchNotes, setBatchNotes] = useState<BatchNotes>({});
  const [_batchSavedCount, setBatchSavedCount] = useState(0);

  // Queries - Performance: Uses getPlayersForCoachTeams for server-side filtering
  const sports = useQuery(api.models.referenceData.getSports);
  const allPlayers = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForCoachTeams,
    userId && orgId ? { organizationId: orgId, coachUserId: userId } : "skip"
  );

  // Helper: Sport code to display name mapping
  const sportCodeToName = useMemo(() => {
    const map = new Map<string, string>();
    if (sports) {
      for (const sport of sports) {
        map.set(sport.code, sport.name);
      }
    }
    return map;
  }, [sports]);

  const getSportDisplayName = (sportCode: string | undefined) => {
    if (!sportCode) {
      return "";
    }
    return sportCodeToName.get(sportCode) || sportCode;
  };

  // Get coach's assigned teams with enriched team details
  const coachAssignments = useQuery(
    api.models.coaches.getCoachAssignmentsWithTeams,
    currentUser?._id
      ? {
          userId: currentUser._id,
          organizationId: orgId,
        }
      : "skip"
  );

  // DEBUG: Check coach data
  const debugData = useQuery(
    api.models.coaches.debugCoachData,
    currentUser?._id
      ? {
          userId: currentUser._id,
          organizationId: orgId,
        }
      : "skip"
  );

  // Log debug data
  if (debugData) {
    console.log("🐛 DEBUG DATA:", debugData);
    console.log("🐛 ASSIGNED TEAM IDS:", debugData.assignedTeamIds ?? []);
    console.log("🐛 ALL TEAMS:", debugData.allTeams ?? []);

    // Show unique team IDs from memberships
    const uniqueTeamIds = new Set(
      debugData.teamMemberships?.map((tm: any) => tm.teamId) ?? []
    );
    console.log(
      "🐛 UNIQUE TEAM IDS IN MEMBERSHIPS:",
      Array.from(uniqueTeamIds)
    );

    // Check if assigned team exists
    const assignedTeamId = debugData.assignedTeamIds?.[0];
    const teamExists = debugData.allTeams?.find(
      (t: any) => t._id === assignedTeamId
    );
    console.log(
      "🐛 ASSIGNED TEAM EXISTS?",
      teamExists ? `Yes: ${teamExists.name}` : "NO - TEAM NOT FOUND!"
    );
  }

  // DEBUG: Check coach assignments and team sport data
  if (coachAssignments) {
    console.log("🏀 COACH ASSIGNMENTS:", coachAssignments);
    console.log("🏀 ASSIGNED TEAMS:", coachAssignments.teams);
    console.log(
      "🏀 TEAMS WITH SPORT CODES:",
      coachAssignments.teams.map((t) => ({
        teamId: t.teamId,
        teamName: t.teamName,
        sportCode: t.sportCode,
        hasSportCode: !!t.sportCode,
      }))
    );
  }

  // Get ALL players from coach's assigned teams
  const allCoachTeamPlayers = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    coachAssignments
      ? {
          organizationId: orgId,
          status: "active",
        }
      : "skip"
  );

  // Get players for selected team (if team filter is active)
  const selectedTeamPlayers = useQuery(
    api.models.teamPlayerIdentities.getPlayersForTeam,
    selectedTeamId
      ? {
          teamId: selectedTeamId,
          status: "active",
        }
      : "skip"
  );

  const skills = useQuery(
    api.models.referenceData.getSkillDefinitionsBySport,
    selectedSportCode ? { sportCode: selectedSportCode } : "skip"
  );

  const skillCategories = useQuery(
    api.models.referenceData.getSkillCategoriesBySport,
    selectedSportCode ? { sportCode: selectedSportCode } : "skip"
  );

  // Get player's passport (or create one)
  const selectedPlayer = useMemo(() => {
    if (!(allPlayers && selectedPlayerId)) {
      return null;
    }
    const found = allPlayers.find(
      (p) => p.enrollment.playerIdentityId === selectedPlayerId
    );
    return found ?? null;
  }, [allPlayers, selectedPlayerId]);

  const passport = useQuery(
    api.models.sportPassports.getPassportForPlayerAndSport,
    selectedPlayerId && selectedSportCode
      ? {
          playerIdentityId: selectedPlayerId as Id<"playerIdentities">,
          sportCode: selectedSportCode,
        }
      : "skip"
  );

  // Get existing assessments for this player/sport
  const existingAssessments = useQuery(
    api.models.skillAssessments.getLatestAssessmentsForPassport,
    passport?._id ? { passportId: passport._id } : "skip"
  );

  // Get assessment history for stats
  const assessmentHistory = useQuery(
    selectedSportCode === "all"
      ? api.models.skillAssessments.getAssessmentHistoryAllSports
      : api.models.skillAssessments.getAssessmentHistory,
    selectedPlayerId && selectedSportCode
      ? selectedSportCode === "all"
        ? {
            playerIdentityId: selectedPlayerId as Id<"playerIdentities">,
            organizationId: orgId,
          }
        : {
            playerIdentityId: selectedPlayerId as Id<"playerIdentities">,
            sportCode: selectedSportCode,
            organizationId: orgId,
          }
      : "skip"
  );

  // Create lookup for existing assessments
  const existingRatings = useMemo(() => {
    if (!existingAssessments) {
      return new Map<string, number>();
    }
    return new Map(existingAssessments.map((a) => [a.skillCode, a.rating]));
  }, [existingAssessments]);

  // Filter players to only show coach's team members
  const coachTeamIds = useMemo(
    () => new Set(coachAssignments?.teams.map((t) => t.teamId) ?? []),
    [coachAssignments]
  );

  // Filter and search players
  const filteredPlayers = useMemo(() => {
    if (!allPlayers) {
      return [];
    }

    let filtered = allPlayers;

    // FIRST: Filter to only players in coach's assigned teams
    if (coachAssignments && allCoachTeamPlayers) {
      console.log("🔍 DEBUG: Coach Assignments:", coachAssignments);
      console.log("🔍 DEBUG: Coach Team IDs:", Array.from(coachTeamIds));
      console.log("🔍 DEBUG: All Coach Team Players:", allCoachTeamPlayers);

      // Get player IDs that are in coach's teams
      const coachPlayerIds = new Set(
        allCoachTeamPlayers
          .filter((member) => {
            const isInCoachTeam = coachTeamIds.has(member.teamId);
            console.log(
              `🔍 DEBUG: Member ${member.playerIdentityId} in team ${member.teamId}: ${isInCoachTeam}`
            );
            return isInCoachTeam;
          })
          .map((member) => member.playerIdentityId)
      );

      console.log("🔍 DEBUG: Coach Player IDs:", Array.from(coachPlayerIds));
      console.log("🔍 DEBUG: Total org players:", allPlayers.length);

      // Filter to only these players
      filtered = filtered.filter((p) =>
        coachPlayerIds.has(p.enrollment.playerIdentityId)
      );

      console.log("🔍 DEBUG: Filtered players count:", filtered.length);
    }

    // THEN: Further filter by selected team if one is chosen
    if (selectedTeamId && selectedTeamPlayers) {
      const teamPlayerIds = new Set(
        selectedTeamPlayers.map((tp) => tp.playerIdentityId)
      );
      filtered = filtered.filter((p) =>
        teamPlayerIds.has(p.enrollment.playerIdentityId)
      );
    }

    // FINALLY: Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => {
        const fullName =
          `${p.player.firstName} ${p.player.lastName}`.toLowerCase();
        return fullName.includes(query);
      });
    }

    // DEDUPLICATE: Same player can appear on multiple teams, keep only first occurrence
    const seenPlayerIds = new Set<string>();
    filtered = filtered.filter((p) => {
      if (seenPlayerIds.has(p.enrollment.playerIdentityId)) {
        return false;
      }
      seenPlayerIds.add(p.enrollment.playerIdentityId);
      return true;
    });

    return filtered;
  }, [
    allPlayers,
    coachAssignments,
    allCoachTeamPlayers,
    coachTeamIds,
    selectedTeamId,
    selectedTeamPlayers,
    searchQuery,
  ]);

  // Calculate player stats
  const playerStats = useMemo(() => {
    if (!assessmentHistory) {
      return null;
    }

    const totalAssessments = assessmentHistory.length;
    const skillsAssessed = new Set(assessmentHistory.map((a) => a.skillCode))
      .size;

    // Calculate average rating
    const avgRating =
      totalAssessments > 0
        ? assessmentHistory.reduce((sum, a) => sum + a.rating, 0) /
          totalAssessments
        : 0;

    // Find recent improvements (skills that improved in last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentAssessments = assessmentHistory.filter(
      (a) => new Date(a.assessmentDate).getTime() > thirtyDaysAgo
    );

    return {
      totalAssessments,
      skillsAssessed,
      avgRating: avgRating.toFixed(1),
      recentAssessments: recentAssessments.length,
      lastAssessmentDate:
        assessmentHistory.length > 0
          ? assessmentHistory[0].assessmentDate
          : null,
    };
  }, [assessmentHistory]);

  // Auto-select sport from team (only when team is explicitly selected)
  useMemo(() => {
    if (!coachAssignments?.teams) {
      console.log("⚽ AUTO-SELECT: No coach assignments teams");
      return;
    }

    console.log("⚽ AUTO-SELECT: Running auto-selection logic");
    console.log("⚽ selectedTeamId:", selectedTeamId);
    console.log("⚽ selectedSportCode:", selectedSportCode);
    console.log("⚽ coachAssignments.teams:", coachAssignments.teams);

    // If team is selected, use that team's sport (override any selection including "all")
    if (selectedTeamId) {
      const team = coachAssignments.teams.find(
        (t) => t.teamId === selectedTeamId
      );
      console.log("⚽ AUTO-SELECT: Found team for selectedTeamId:", team);
      if (team?.sportCode && team.sportCode !== selectedSportCode) {
        console.log(
          "⚽ AUTO-SELECT: Setting sport from selected team:",
          team.sportCode
        );
        setSelectedSportCode(team.sportCode);
      }
      return;
    }

    // When no team is selected, keep "all" as default (don't auto-select first team's sport)
  }, [selectedTeamId, coachAssignments, selectedSportCode]);

  // Mutations
  const findOrCreatePassport = useMutation(
    api.models.sportPassports.findOrCreatePassport
  );
  const recordAssessment = useMutation(
    api.models.skillAssessments.recordAssessmentWithBenchmark
  );
  const markReviewComplete = useMutation(
    api.models.orgPlayerEnrollments.markReviewComplete
  );
  const updatePassportNotes = useMutation(
    api.models.sportPassports.updateNotes
  );

  // Group skills by category
  type SkillDefinition = NonNullable<typeof skills>[number];
  const skillsByCategory = useMemo(() => {
    if (!(skills && skillCategories)) {
      return new Map<string, SkillDefinition[]>();
    }

    const map = new Map<string, SkillDefinition[]>();
    for (const category of skillCategories) {
      const categorySkills = skills.filter(
        (s) => s.categoryId === category._id
      );
      if (categorySkills.length > 0) {
        map.set(category.name, categorySkills);
      }
    }

    // Add uncategorized skills
    const categorizedIds = new Set(skillCategories.map((c) => c._id));
    const uncategorized = skills.filter(
      (s) => !categorizedIds.has(s.categoryId)
    );
    if (uncategorized.length > 0) {
      map.set("Other Skills", uncategorized);
    }

    return map;
  }, [skills, skillCategories]);

  // Handle rating change
  const handleRatingChange = useCallback((skillCode: string, value: number) => {
    setRatings((prev) => ({ ...prev, [skillCode]: value }));
    // Remove from saved when changed
    setSavedSkills((prev) => {
      const next = new Set(prev);
      next.delete(skillCode);
      return next;
    });
  }, []);

  // Handle note change
  const handleNoteChange = useCallback((skillCode: string, value: string) => {
    setNotes((prev) => ({ ...prev, [skillCode]: value }));
  }, []);

  // Save individual skill assessment
  const handleSaveSkill = useCallback(
    async (skillCode: string) => {
      if (!(selectedPlayerId && selectedSportCode && ratings[skillCode])) {
        toast.error("Cannot save", {
          description: "Please select a rating first",
        });
        return;
      }

      setIsSaving(true);
      try {
        // Ensure passport exists
        let passportId = passport?._id;
        if (!passportId) {
          const result = await findOrCreatePassport({
            playerIdentityId: selectedPlayerId as Id<"playerIdentities">,
            sportCode: selectedSportCode,
            organizationId: orgId,
          });
          passportId = result.passportId;
        }

        // Record assessment with auto-benchmark
        const result = await recordAssessment({
          passportId,
          skillCode,
          rating: ratings[skillCode],
          assessmentDate: new Date().toISOString().split("T")[0],
          assessmentType,
          assessedBy: currentUser?._id,
          assessedByName: currentUser?.name ?? currentUser?.email ?? "Coach",
          assessorRole: "coach",
          notes: notes[skillCode],
        });

        setSavedSkills((prev) => new Set(prev).add(skillCode));

        toast.success("Assessment saved", {
          description: result.benchmarkFound
            ? `Rating: ${ratings[skillCode]} | Status: ${result.benchmarkStatus?.replace("_", " ")}`
            : `Rating: ${ratings[skillCode]} saved`,
        });
      } catch (error) {
        toast.error("Failed to save", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [
      selectedPlayerId,
      selectedSportCode,
      ratings,
      notes,
      passport,
      findOrCreatePassport,
      recordAssessment,
      orgId,
      assessmentType,
      currentUser,
    ]
  );

  // Save all assessments
  const handleSaveAll = useCallback(async () => {
    const skillsToSave = Object.entries(ratings).filter(
      ([code]) => !savedSkills.has(code)
    );

    if (skillsToSave.length === 0) {
      toast.info("Nothing to save", {
        description: "All ratings have already been saved",
      });
      return;
    }

    setIsSaving(true);
    let saved = 0;
    let errors = 0;

    for (const [skillCode] of skillsToSave) {
      try {
        await handleSaveSkill(skillCode);
        saved += 1;
      } catch {
        errors += 1;
      }
    }

    setIsSaving(false);
    toast.success("Batch save complete", {
      description: `Saved ${saved} assessments${errors > 0 ? `, ${errors} failed` : ""}`,
    });
  }, [ratings, savedSkills, handleSaveSkill]);

  // Count unsaved changes
  const unsavedCount = useMemo(
    () => Object.keys(ratings).filter((code) => !savedSkills.has(code)).length,
    [ratings, savedSkills]
  );

  // Handle marking review as complete
  const handleCompleteReview = useCallback(async () => {
    if (!selectedPlayerId) {
      toast.error("No player selected");
      return;
    }

    try {
      const result = await markReviewComplete({
        playerIdentityId: selectedPlayerId as Id<"playerIdentities">,
        organizationId: orgId,
        reviewPeriodDays: 90, // Default to 90 days
      });

      toast.success("Review marked as complete!", {
        description: `Next review due: ${new Date(result.nextReviewDue).toLocaleDateString()}`,
      });
    } catch (error) {
      toast.error("Failed to complete review", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [selectedPlayerId, markReviewComplete, orgId]);

  // Loading state
  const isLoading = sports === undefined || allPlayers === undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with gradient background - matching coach dashboard */}
      <OrgThemedGradient
        className="rounded-lg p-6 shadow-lg"
        style={{ filter: "brightness(0.95)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              className="border-current/20 bg-current/10 hover:bg-current/20"
              onClick={() => router.back()}
              size="sm"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="font-bold text-2xl">
                {assessmentMode === "batch"
                  ? "Team Session Assessment"
                  : "Assess Player Skills"}
              </h1>
              <p className="text-sm opacity-80">
                {assessmentMode === "batch"
                  ? "Record the same assessment for multiple players at once"
                  : "Record skill assessments with automatic benchmark comparison"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode Toggle */}
            <div className="flex rounded-lg border border-current/30 bg-current/10 p-1">
              <Button
                className={`text-sm ${
                  assessmentMode === "individual"
                    ? "bg-white text-gray-800"
                    : "bg-transparent hover:bg-current/20"
                }`}
                onClick={() => {
                  setAssessmentMode("individual");
                  setSelectedBatchPlayers(new Set());
                  setBatchSelectedSkills(new Set());
                  setBatchRatings({});
                  setBatchNotes({});
                }}
                size="sm"
                variant="ghost"
              >
                <User className="mr-1 h-4 w-4" />
                Individual
              </Button>
              <Button
                className={`text-sm ${
                  assessmentMode === "batch"
                    ? "bg-white text-gray-800"
                    : "bg-transparent hover:bg-current/20"
                }`}
                onClick={() => {
                  setAssessmentMode("batch");
                  setSelectedPlayerId(null);
                  setRatings({});
                  setSavedSkills(new Set());
                }}
                size="sm"
                variant="ghost"
              >
                <Users className="mr-1 h-4 w-4" />
                Team Session
              </Button>
            </div>

            {assessmentMode === "individual" && unsavedCount > 0 && (
              <Button
                className="bg-white hover:bg-white/90"
                disabled={isSaving}
                onClick={handleSaveAll}
                style={{ color: "var(--org-primary)" }}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save All ({unsavedCount})
              </Button>
            )}
          </div>
        </div>
      </OrgThemedGradient>

      {/* Search and Filter Bar */}
      <Card
        style={{
          borderColor: "rgb(var(--org-primary-rgb) / 0.2)",
          backgroundColor: "rgb(var(--org-primary-rgb) / 0.05)",
        }}
      >
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Search Input */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Players
              </Label>
              <Input
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                value={searchQuery}
              />
            </div>

            {/* Team Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Filter by Team
              </Label>
              <Select
                onValueChange={(value) => {
                  setSelectedTeamId(value === "all" ? null : value);
                  // Reset to "All Sports" when "All Teams" is selected
                  if (value === "all") {
                    setSelectedSportCode("all");
                  }
                }}
                value={selectedTeamId ?? "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {(() => {
                    const uniqueTeams =
                      coachAssignments?.teams.filter(
                        (team, index, self) =>
                          index ===
                          self.findIndex((t) => t.teamId === team.teamId)
                      ) ?? [];
                    return uniqueTeams.map((team, index) => (
                      <SelectItem
                        key={`${team.teamId}-${index}`}
                        value={team.teamId}
                      >
                        {team.teamName}
                        {team.sportCode && (
                          <span className="ml-2 text-muted-foreground text-xs">
                            ({getSportDisplayName(team.sportCode)})
                          </span>
                        )}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-muted-foreground text-sm">
            Showing {filteredPlayers.length} player
            {filteredPlayers.length !== 1 ? "s" : ""}
            {selectedTeamId && " in selected team"}
            {searchQuery && " matching search"}
          </div>
        </CardContent>
      </Card>

      {/* Player & Sport Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-600" />
            Select Player & Sport
          </CardTitle>
          <CardDescription>
            Choose a player and sport to begin the assessment
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {/* Player Select */}
          <div className="space-y-2">
            <Label>Player</Label>
            <Select
              onValueChange={(value) => {
                setSelectedPlayerId(value);
                setRatings({});
                setSavedSkills(new Set());
              }}
              value={selectedPlayerId ?? ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a player" />
              </SelectTrigger>
              <SelectContent>
                {filteredPlayers.map(({ enrollment, player }, index) => (
                  <SelectItem
                    key={`${enrollment.playerIdentityId}-${index}`}
                    value={enrollment.playerIdentityId}
                  >
                    {player.firstName} {player.lastName}
                    {enrollment.ageGroup && (
                      <span className="ml-2 text-muted-foreground">
                        ({enrollment.ageGroup.toUpperCase()})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sport Select */}
          <div className="space-y-2">
            <Label>Sport</Label>
            <Select
              onValueChange={(value) => {
                setSelectedSportCode(value);
                setRatings({});
                setSavedSkills(new Set());
              }}
              value={selectedSportCode ?? ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                {sports?.map((sport) => (
                  <SelectItem key={sport._id} value={sport.code}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTeamId &&
              coachAssignments &&
              selectedSportCode !== "all" && (
                <p className="text-muted-foreground text-xs">
                  Auto-selected from team
                </p>
              )}
            {selectedSportCode === "all" && (
              <p className="text-muted-foreground text-xs">
                Viewing all assessments across all sports
              </p>
            )}
          </div>

          {/* Assessment Type */}
          <div className="space-y-2">
            <Label>Assessment Type</Label>
            <Select
              onValueChange={(value) =>
                setAssessmentType(value as AssessmentType)
              }
              value={assessmentType}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="training">Training Session</SelectItem>
                <SelectItem value="match">Match Observation</SelectItem>
                <SelectItem value="formal_review">Formal Review</SelectItem>
                <SelectItem value="trial">Trial/Tryout</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Player Stats & Info */}
      {selectedPlayer && selectedSportCode && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Player Info Card */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">
                  {selectedPlayer.player.firstName}{" "}
                  {selectedPlayer.player.lastName}
                </p>
                <p className="text-muted-foreground text-sm">
                  {selectedPlayer.enrollment.ageGroup?.toUpperCase()} | DOB:{" "}
                  {selectedPlayer.player.dateOfBirth ?? "Not set"}
                </p>
              </div>
              {passport && (
                <Badge className="bg-white" variant="outline">
                  <Target className="mr-1 h-3 w-3" />
                  {passport.assessmentCount} assessments
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Player Stats Card */}
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  {playerStats && playerStats.totalAssessments > 0 ? (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Total Assessments
                        </p>
                        <p className="font-semibold">
                          {playerStats.totalAssessments}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Skills Assessed
                        </p>
                        <p className="font-semibold">
                          {playerStats.skillsAssessed}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Avg Rating
                        </p>
                        <p className="font-semibold">
                          {playerStats.avgRating}/5
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Last Assessment
                        </p>
                        <p className="font-semibold text-xs">
                          {playerStats.lastAssessmentDate
                            ? new Date(
                                playerStats.lastAssessmentDate
                              ).toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                    </div>
                  ) : playerStats ? (
                    <Empty>
                      <EmptyContent>
                        <EmptyMedia variant="icon">
                          <BarChart3 className="h-6 w-6" />
                        </EmptyMedia>
                        <EmptyTitle>No assessments yet</EmptyTitle>
                        <EmptyDescription>
                          Start recording skill ratings below to track this
                          player's progress
                        </EmptyDescription>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Loading stats...
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Complete Review Card */}
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Mark Review Complete</p>
                <p className="text-muted-foreground text-xs">
                  Formal assessment done
                </p>
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleCompleteReview}
                size="sm"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Review
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Assessments History */}
      {selectedPlayer && assessmentHistory && assessmentHistory.length > 0 && (
        <>
          <Card className="border-indigo-200 bg-indigo-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-indigo-600" />
                Recent Assessment History
              </CardTitle>
              <CardDescription>
                Last {Math.min(5, assessmentHistory.length)} assessments for{" "}
                {selectedPlayer.player.firstName}{" "}
                {selectedPlayer.player.lastName}
                {selectedSportCode === "all" && " (all sports)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assessmentHistory.slice(0, 5).map((assessment) => {
                  const ratingChange = assessment.previousRating
                    ? assessment.rating - assessment.previousRating
                    : null;
                  const ratingConfig = getRatingConfig(assessment.rating);

                  return (
                    <div
                      className="flex items-center justify-between rounded border bg-white p-3 text-sm"
                      key={assessment._id}
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={`${ratingConfig.bgColor} text-white`}>
                          {assessment.rating} - {ratingConfig.label}
                        </Badge>
                        <div>
                          <p className="font-medium">{assessment.skillName}</p>
                          {assessment.notes && (
                            <p className="text-muted-foreground text-xs">
                              {assessment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {ratingChange !== null && ratingChange !== 0 && (
                          <Badge
                            className="text-xs"
                            variant={
                              ratingChange > 0 ? "default" : "destructive"
                            }
                          >
                            <TrendingUp className="mr-1 h-3 w-3" />
                            {ratingChange > 0 ? "+" : ""}
                            {ratingChange}
                          </Badge>
                        )}
                        {assessment.benchmarkStatus && (
                          <Badge className="text-xs" variant="outline">
                            {assessment.benchmarkStatus
                              .replace("_", " ")
                              .toUpperCase()}
                          </Badge>
                        )}
                        <div className="text-right text-muted-foreground text-xs">
                          <p>
                            {new Date(
                              assessment.assessmentDate
                            ).toLocaleDateString()}
                          </p>
                          <p className="text-[10px]">
                            {assessment.assessmentType.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {assessmentHistory.length > 5 && (
                <p className="mt-3 text-center text-muted-foreground text-xs">
                  Showing 5 of {assessmentHistory.length} assessments
                </p>
              )}
            </CardContent>
          </Card>

          {/* Assessment Progress Insights */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                Progress Insights
              </CardTitle>
              <CardDescription>
                Skill development trends and comparisons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Skills grouped by improvement */}
                {(() => {
                  const skillChanges = new Map<
                    string,
                    { latest: number; previous: number; name: string }
                  >();

                  for (const assessment of assessmentHistory) {
                    if (
                      assessment.previousRating &&
                      !skillChanges.has(assessment.skillCode)
                    ) {
                      skillChanges.set(assessment.skillCode, {
                        latest: assessment.rating,
                        previous: assessment.previousRating,
                        name: assessment.skillName,
                      });
                    }
                  }

                  const improving = Array.from(skillChanges.entries())
                    .filter(([_, data]) => data.latest > data.previous)
                    .sort(
                      ([_, a], [__, b]) =>
                        b.latest - b.previous - (a.latest - a.previous)
                    );

                  const declining = Array.from(skillChanges.entries())
                    .filter(([_, data]) => data.latest < data.previous)
                    .sort(
                      ([_, a], [__, b]) =>
                        a.latest - a.previous - (b.latest - b.previous)
                    );

                  return (
                    <>
                      {/* Improving Skills */}
                      <div className="rounded-lg border border-green-200 bg-white p-4">
                        <h4 className="mb-3 flex items-center gap-2 font-semibold text-green-700 text-sm">
                          <TrendingUp className="h-4 w-4" />
                          Improving ({improving.length})
                        </h4>
                        {improving.length > 0 ? (
                          <div className="space-y-2">
                            {improving.slice(0, 5).map(([code, data]) => (
                              <div
                                className="flex items-center justify-between text-sm"
                                key={code}
                              >
                                <span className="text-gray-700">
                                  {data.name}
                                </span>
                                <Badge className="bg-green-100 text-green-700">
                                  {data.previous} → {data.latest} (+
                                  {data.latest - data.previous})
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-xs">
                            No improvements tracked yet
                          </p>
                        )}
                      </div>

                      {/* Skills Needing Attention */}
                      <div className="rounded-lg border border-orange-200 bg-white p-4">
                        <h4 className="mb-3 flex items-center gap-2 font-semibold text-orange-700 text-sm">
                          <Target className="h-4 w-4" />
                          Needs Attention ({declining.length})
                        </h4>
                        {declining.length > 0 ? (
                          <div className="space-y-2">
                            {declining.slice(0, 5).map(([code, data]) => (
                              <div
                                className="flex items-center justify-between text-sm"
                                key={code}
                              >
                                <span className="text-gray-700">
                                  {data.name}
                                </span>
                                <Badge className="bg-orange-100 text-orange-700">
                                  {data.previous} → {data.latest} (
                                  {data.latest - data.previous})
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-xs">
                            No declining skills
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Benchmark Performance Summary */}
              {assessmentHistory.some((a) => a.benchmarkStatus) && (
                <div className="mt-4 rounded-lg border bg-white p-4">
                  <h4 className="mb-3 font-semibold text-sm">
                    Benchmark Performance
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {["above_benchmark", "at_benchmark", "below_benchmark"].map(
                      (status) => {
                        const count = assessmentHistory.filter(
                          (a) => a.benchmarkStatus === status
                        ).length;
                        const percentage = assessmentHistory.length
                          ? Math.round((count / assessmentHistory.length) * 100)
                          : 0;

                        return (
                          <div className="rounded border p-2" key={status}>
                            <p className="font-bold text-lg">{count}</p>
                            <p className="text-muted-foreground text-xs">
                              {status.replace("_", " ")}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              ({percentage}%)
                            </p>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* BATCH MODE: Team Session Assessment */}
      {assessmentMode === "batch" &&
        selectedSportCode &&
        skills &&
        skills.length > 0 && (
          <BatchAssessmentSection
            assessmentType={assessmentType}
            batchSelectedSkills={batchSelectedSkills}
            currentUser={currentUser}
            filteredPlayers={filteredPlayers}
            findOrCreatePassport={findOrCreatePassport}
            isSaving={isSaving}
            orgId={orgId}
            recordAssessment={recordAssessment}
            selectedBatchPlayers={selectedBatchPlayers}
            selectedSportCode={selectedSportCode}
            setBatchSavedCount={setBatchSavedCount}
            setBatchSelectedSkills={setBatchSelectedSkills}
            setIsSaving={setIsSaving}
            setSelectedBatchPlayers={setSelectedBatchPlayers}
            skills={skills}
            skillsByCategory={skillsByCategory}
          />
        )}

      {/* INDIVIDUAL MODE: All Sports View (History Only) */}
      {assessmentMode === "individual" &&
      selectedPlayerId &&
      selectedSportCode === "all" ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold text-lg">Viewing All Sports</h3>
            <p className="mb-4 text-muted-foreground">
              Assessment history is shown above for all sports. To record new
              assessments, please select a specific sport.
            </p>
            <Button
              onClick={() => {
                // Auto-select first available sport
                if (sports && sports.length > 0) {
                  setSelectedSportCode(sports[0].code);
                }
              }}
              variant="outline"
            >
              Select a Sport to Assess
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* INDIVIDUAL MODE: Skills Assessment */}
      {assessmentMode === "individual" &&
      selectedPlayerId &&
      selectedSportCode &&
      selectedSportCode !== "all" &&
      skills &&
      skills.length > 0 ? (
        <div className="space-y-6">
          {Array.from(skillsByCategory.entries()).map(
            ([categoryName, categorySkills]) => (
              <Card key={categoryName}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-emerald-600" />
                    {categoryName}
                  </CardTitle>
                  <CardDescription>
                    {categorySkills.length} skills in this category
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {categorySkills.map((skill) => {
                    const currentRating =
                      ratings[skill.code] ??
                      existingRatings.get(skill.code) ??
                      0;
                    const isSaved = savedSkills.has(skill.code);
                    const hasExisting = existingRatings.has(skill.code);

                    return (
                      <div
                        className={`rounded-lg border p-4 transition-colors ${
                          isSaved
                            ? "border-green-200 bg-green-50/50"
                            : "border-gray-200 hover:border-emerald-200"
                        }`}
                        key={skill.code}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{skill.name}</p>
                            {skill.description && (
                              <p className="text-muted-foreground text-sm">
                                {skill.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {hasExisting && !ratings[skill.code] && (
                              <Badge className="text-xs" variant="outline">
                                <TrendingUp className="mr-1 h-3 w-3" />
                                Previous: {existingRatings.get(skill.code)}
                              </Badge>
                            )}
                            {isSaved && (
                              <Badge className="bg-green-100 text-green-700">
                                <Check className="mr-1 h-3 w-3" />
                                Saved
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Rating Slider */}
                        <div className="space-y-3">
                          <RatingSlider
                            compact={true}
                            isSaved={isSaved}
                            label=""
                            onChange={(value) =>
                              handleRatingChange(skill.code, value)
                            }
                            previousValue={existingRatings.get(skill.code)}
                            showLabels={true}
                            value={(currentRating || 1) as Rating}
                          />

                          {/* Notes */}
                          <div className="flex items-start gap-2">
                            <Textarea
                              className="min-h-[60px] flex-1 text-sm"
                              onChange={(e) =>
                                handleNoteChange(skill.code, e.target.value)
                              }
                              placeholder="Add notes for this skill (optional)"
                              value={notes[skill.code] ?? ""}
                            />
                            <Button
                              disabled={!currentRating || isSaving}
                              onClick={() => handleSaveSkill(skill.code)}
                              size="sm"
                              variant={isSaved ? "outline" : "default"}
                            >
                              {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isSaved ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )
          )}

          {/* General Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Development Notes</CardTitle>
              <CardDescription>
                Add overall observations - these will be saved to the player's
                profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                className="min-h-[100px]"
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Overall observations, areas for improvement, notable strengths..."
                value={generalNotes}
              />
              <div className="flex justify-end">
                <Button
                  disabled={!(generalNotes.trim() && passport) || isSaving}
                  onClick={async () => {
                    if (!passport) {
                      toast.error("No passport found for this player");
                      return;
                    }
                    setIsSaving(true);
                    try {
                      // Append to existing notes with timestamp
                      const timestamp = new Date().toLocaleDateString();
                      const newNote = `[${timestamp}] ${generalNotes.trim()}`;
                      await updatePassportNotes({
                        passportId: passport._id,
                        coachNotes: passport.coachNotes
                          ? `${passport.coachNotes}\n\n${newNote}`
                          : newNote,
                      });
                      toast.success("Development notes saved!", {
                        description: "Notes added to player profile",
                      });
                      setGeneralNotes("");
                    } catch (error) {
                      toast.error("Failed to save notes", {
                        description:
                          error instanceof Error
                            ? error.message
                            : "Unknown error",
                      });
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  variant="outline"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save to Player Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : assessmentMode === "individual" &&
        selectedPlayerId &&
        selectedSportCode &&
        selectedSportCode !== "all" ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Award className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold text-lg">No Skills Defined</h3>
            <p className="text-muted-foreground">
              No skill definitions found for this sport. Contact your
              administrator.
            </p>
          </CardContent>
        </Card>
      ) : assessmentMode === "individual" && filteredPlayers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Players ({filteredPlayers.length})
            </CardTitle>
            <CardDescription>
              Select a player to begin recording assessments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPlayers.map(({ enrollment, player }, index) => (
                <button
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/50"
                  key={`${enrollment.playerIdentityId}-${index}`}
                  onClick={() => {
                    setSelectedPlayerId(enrollment.playerIdentityId);
                    setRatings({});
                    setSavedSkills(new Set());
                  }}
                  type="button"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700 text-sm">
                    {player.firstName?.[0]}
                    {player.lastName?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {player.firstName} {player.lastName}
                    </p>
                    {enrollment.ageGroup && (
                      <p className="text-muted-foreground text-xs">
                        {enrollment.ageGroup.toUpperCase()}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : assessmentMode === "individual" ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold text-lg">No Players Found</h3>
            <p className="text-muted-foreground">
              No players match your current filters
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// Batch Assessment Section Component
function BatchAssessmentSection({
  filteredPlayers,
  selectedBatchPlayers,
  setSelectedBatchPlayers,
  batchSelectedSkills,
  setBatchSelectedSkills,
  skills,
  skillsByCategory,
  assessmentType,
  orgId,
  selectedSportCode,
  currentUser,
  findOrCreatePassport,
  recordAssessment,
  isSaving,
  setIsSaving,
  setBatchSavedCount,
}: {
  filteredPlayers: Array<{
    enrollment: { playerIdentityId: string; ageGroup?: string | null };
    player: { firstName: string; lastName: string };
  }>;
  selectedBatchPlayers: Set<string>;
  setSelectedBatchPlayers: React.Dispatch<React.SetStateAction<Set<string>>>;
  batchSelectedSkills: Set<string>;
  setBatchSelectedSkills: React.Dispatch<React.SetStateAction<Set<string>>>;
  skills: Array<{
    code: string;
    name: string;
    description?: string;
    categoryId: Id<"skillCategories">;
  }>;
  skillsByCategory: Map<
    string,
    Array<{
      code: string;
      name: string;
      description?: string;
      categoryId: Id<"skillCategories">;
    }>
  >;
  assessmentType: AssessmentType;
  orgId: string;
  selectedSportCode: string;
  // biome-ignore lint/suspicious/noExplicitAny: User type from auth
  currentUser: any;
  // biome-ignore lint/suspicious/noExplicitAny: Convex mutation type
  findOrCreatePassport: any;
  // biome-ignore lint/suspicious/noExplicitAny: Convex mutation type
  recordAssessment: any;
  isSaving: boolean;
  setIsSaving: (value: boolean) => void;
  setBatchSavedCount: (value: number) => void;
}) {
  const [batchStep, setBatchStep] = useState<"players" | "skills" | "rate">(
    "players"
  );
  const [batchSkillRating, setBatchSkillRating] = useState<
    Record<string, number>
  >({});
  const [batchNotes, setBatchNotes] = useState<string>("");

  const totalAssessments = selectedBatchPlayers.size * batchSelectedSkills.size;

  // Handle select all players
  const handleSelectAllPlayers = () => {
    if (selectedBatchPlayers.size === filteredPlayers.length) {
      setSelectedBatchPlayers(new Set());
    } else {
      setSelectedBatchPlayers(
        new Set(filteredPlayers.map((p) => p.enrollment.playerIdentityId))
      );
    }
  };

  // Handle select all skills in a category
  const handleSelectCategorySkills = (
    categorySkills: Array<{ code: string }>
  ) => {
    const codes = categorySkills.map((s) => s.code);
    const allSelected = codes.every((code) => batchSelectedSkills.has(code));

    if (allSelected) {
      setBatchSelectedSkills((prev) => {
        const next = new Set(prev);
        for (const code of codes) {
          next.delete(code);
        }
        return next;
      });
    } else {
      setBatchSelectedSkills((prev) => {
        const next = new Set(prev);
        for (const code of codes) {
          next.add(code);
        }
        return next;
      });
    }
  };

  // Handle batch save
  const handleBatchSave = async () => {
    if (selectedBatchPlayers.size === 0 || batchSelectedSkills.size === 0) {
      toast.error("Please select players and skills first");
      return;
    }

    const unratedSkills = Array.from(batchSelectedSkills).filter(
      (code) => !batchSkillRating[code]
    );
    if (unratedSkills.length > 0) {
      toast.error("Please rate all selected skills", {
        description: `${unratedSkills.length} skills need ratings`,
      });
      return;
    }

    setIsSaving(true);
    let saved = 0;
    let errors = 0;

    for (const playerId of selectedBatchPlayers) {
      try {
        // Ensure passport exists for each player
        const { passportId } = await findOrCreatePassport({
          playerIdentityId: playerId as Id<"playerIdentities">,
          sportCode: selectedSportCode,
          organizationId: orgId,
        });

        // Save each skill assessment
        for (const skillCode of batchSelectedSkills) {
          try {
            await recordAssessment({
              passportId,
              skillCode,
              rating: batchSkillRating[skillCode],
              assessmentDate: new Date().toISOString().split("T")[0],
              assessmentType,
              assessedBy: currentUser?._id,
              assessedByName:
                currentUser?.name ?? currentUser?.email ?? "Coach",
              assessorRole: "coach",
              notes: batchNotes || undefined,
            });
            saved += 1;
          } catch {
            errors += 1;
          }
        }
      } catch {
        errors += batchSelectedSkills.size;
      }
    }

    setIsSaving(false);
    setBatchSavedCount(saved);

    if (errors === 0) {
      toast.success("Team assessment complete!", {
        description: `${saved} assessments saved for ${selectedBatchPlayers.size} players`,
      });
      // Reset batch mode
      setSelectedBatchPlayers(new Set());
      setBatchSelectedSkills(new Set());
      setBatchSkillRating({});
      setBatchNotes("");
      setBatchStep("players");
    } else {
      toast.warning("Batch save completed with some errors", {
        description: `${saved} saved, ${errors} failed`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 md:gap-8">
              {/* Step 1: Players */}
              <button
                className={`flex items-center gap-1 sm:gap-2 ${
                  batchStep === "players"
                    ? "font-bold text-blue-700"
                    : selectedBatchPlayers.size > 0
                      ? "text-green-600"
                      : "text-gray-400"
                }`}
                onClick={() => setBatchStep("players")}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    batchStep === "players"
                      ? "bg-blue-600 text-white"
                      : selectedBatchPlayers.size > 0
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {selectedBatchPlayers.size > 0 ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    "1"
                  )}
                </div>
                <span className="hidden text-sm sm:inline">
                  Select Players ({selectedBatchPlayers.size})
                </span>
              </button>

              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 sm:h-5 sm:w-5" />

              {/* Step 2: Skills */}
              <button
                className={`flex items-center gap-1 sm:gap-2 ${
                  batchStep === "skills"
                    ? "font-bold text-blue-700"
                    : batchSelectedSkills.size > 0
                      ? "text-green-600"
                      : "text-gray-400"
                }`}
                disabled={selectedBatchPlayers.size === 0}
                onClick={() =>
                  selectedBatchPlayers.size > 0 && setBatchStep("skills")
                }
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    batchStep === "skills"
                      ? "bg-blue-600 text-white"
                      : batchSelectedSkills.size > 0
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {batchSelectedSkills.size > 0 ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    "2"
                  )}
                </div>
                <span className="hidden text-sm sm:inline">
                  Select Skills ({batchSelectedSkills.size})
                </span>
              </button>

              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 sm:h-5 sm:w-5" />

              {/* Step 3: Rate */}
              <button
                className={`flex items-center gap-1 sm:gap-2 ${
                  batchStep === "rate"
                    ? "font-bold text-blue-700"
                    : "text-gray-400"
                }`}
                disabled={
                  selectedBatchPlayers.size === 0 ||
                  batchSelectedSkills.size === 0
                }
                onClick={() =>
                  selectedBatchPlayers.size > 0 &&
                  batchSelectedSkills.size > 0 &&
                  setBatchStep("rate")
                }
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    batchStep === "rate"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  3
                </div>
                <span className="hidden text-sm sm:inline">Rate & Save</span>
              </button>
            </div>

            {/* Total count */}
            <Badge className="px-4 py-2 text-lg" variant="outline">
              {totalAssessments} total assessments
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Player Selection */}
      {batchStep === "players" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Select Players for Session
              </span>
              <Button
                onClick={handleSelectAllPlayers}
                size="sm"
                variant="outline"
              >
                {selectedBatchPlayers.size === filteredPlayers.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </CardTitle>
            <CardDescription>
              Choose players who participated in this training session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPlayers.map(({ enrollment, player }, index) => {
                const isSelected = selectedBatchPlayers.has(
                  enrollment.playerIdentityId
                );
                return (
                  <button
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                    key={`${enrollment.playerIdentityId}-${index}`}
                    onClick={() => {
                      setSelectedBatchPlayers((prev) => {
                        const next = new Set(prev);
                        if (next.has(enrollment.playerIdentityId)) {
                          next.delete(enrollment.playerIdentityId);
                        } else {
                          next.add(enrollment.playerIdentityId);
                        }
                        return next;
                      });
                    }}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isSelected ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    >
                      {isSelected ? (
                        <Check className="h-4 w-4 text-white" />
                      ) : (
                        <User className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {player.firstName} {player.lastName}
                      </p>
                      {enrollment.ageGroup && (
                        <p className="text-muted-foreground text-xs">
                          {enrollment.ageGroup.toUpperCase()}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedBatchPlayers.size > 0 && (
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setBatchStep("skills")}>
                  Next: Select Skills
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Skill Selection */}
      {batchStep === "skills" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              Select Skills to Assess
            </CardTitle>
            <CardDescription>
              Choose skills that were focused on during this session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.from(skillsByCategory.entries()).map(
              ([categoryName, categorySkills]) => {
                const allSelected = categorySkills.every((s) =>
                  batchSelectedSkills.has(s.code)
                );
                const _someSelected = categorySkills.some((s) =>
                  batchSelectedSkills.has(s.code)
                );

                return (
                  <div className="space-y-3" key={categoryName}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-700">
                        {categoryName}
                      </h3>
                      <Button
                        onClick={() =>
                          handleSelectCategorySkills(categorySkills)
                        }
                        size="sm"
                        variant="ghost"
                      >
                        {allSelected ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categorySkills.map((skill) => {
                        const isSelected = batchSelectedSkills.has(skill.code);
                        return (
                          <Badge
                            className={`cursor-pointer px-3 py-1.5 text-sm transition-colors ${
                              isSelected
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                            key={skill.code}
                            onClick={() => {
                              setBatchSelectedSkills((prev) => {
                                const next = new Set(prev);
                                if (next.has(skill.code)) {
                                  next.delete(skill.code);
                                } else {
                                  next.add(skill.code);
                                }
                                return next;
                              });
                            }}
                          >
                            {isSelected && <Check className="mr-1 h-3 w-3" />}
                            {skill.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                );
              }
            )}

            <div className="flex justify-between pt-4">
              <Button onClick={() => setBatchStep("players")} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              {batchSelectedSkills.size > 0 && (
                <Button onClick={() => setBatchStep("rate")}>
                  Next: Rate Skills
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Rating */}
      {batchStep === "rate" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Rate Selected Skills
            </CardTitle>
            <CardDescription>
              Set ratings for {selectedBatchPlayers.size} players ×{" "}
              {batchSelectedSkills.size} skills = {totalAssessments} assessments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Player Preview */}
            <div className="rounded-lg border bg-blue-50 p-4">
              <p className="mb-2 font-medium text-blue-900 text-sm">
                Applying to {selectedBatchPlayers.size} players:
              </p>
              <div className="flex flex-wrap gap-1">
                {Array.from(selectedBatchPlayers)
                  .slice(0, 10)
                  .map((playerId) => {
                    const player = filteredPlayers.find(
                      (p) => p.enrollment.playerIdentityId === playerId
                    );
                    return (
                      <Badge
                        className="text-xs"
                        key={playerId}
                        variant="secondary"
                      >
                        {player?.player.firstName} {player?.player.lastName}
                      </Badge>
                    );
                  })}
                {selectedBatchPlayers.size > 10 && (
                  <Badge className="text-xs" variant="secondary">
                    +{selectedBatchPlayers.size - 10} more
                  </Badge>
                )}
              </div>
            </div>

            {/* Skills to Rate */}
            <div className="space-y-4">
              {Array.from(batchSelectedSkills).map((skillCode) => {
                const skill = skills.find((s) => s.code === skillCode);
                if (!skill) {
                  return null;
                }

                return (
                  <div className="rounded-lg border p-4" key={skillCode}>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{skill.name}</p>
                        {skill.description && (
                          <p className="text-muted-foreground text-sm">
                            {skill.description}
                          </p>
                        )}
                      </div>
                      {batchSkillRating[skillCode] && (
                        <Badge className="bg-green-100 text-green-700">
                          <Check className="mr-1 h-3 w-3" />
                          {batchSkillRating[skillCode]}
                        </Badge>
                      )}
                    </div>

                    <RatingSlider
                      compact={true}
                      label=""
                      onChange={(value) =>
                        setBatchSkillRating((prev) => ({
                          ...prev,
                          [skillCode]: value,
                        }))
                      }
                      showLabels={true}
                      value={(batchSkillRating[skillCode] || 1) as Rating}
                    />
                  </div>
                );
              })}
            </div>

            {/* Session Notes */}
            <div className="space-y-2">
              <Label>Session Notes (Optional)</Label>
              <Textarea
                onChange={(e) => setBatchNotes(e.target.value)}
                placeholder="Add any notes about this training session..."
                rows={3}
                value={batchNotes}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button onClick={() => setBatchStep("skills")} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={isSaving}
                onClick={handleBatchSave}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save All {totalAssessments} Assessments
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
