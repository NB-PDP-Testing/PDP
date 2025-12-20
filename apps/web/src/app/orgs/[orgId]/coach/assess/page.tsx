"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Check,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";

// Rating level descriptions
const RATING_LABELS: Record<
  number,
  { label: string; description: string; color: string }
> = {
  1: {
    label: "Beginning",
    description: "Just starting to learn this skill",
    color: "bg-red-500",
  },
  2: {
    label: "Developing",
    description: "Shows basic understanding, needs practice",
    color: "bg-orange-500",
  },
  3: {
    label: "Competent",
    description: "Consistent at age-appropriate level",
    color: "bg-yellow-500",
  },
  4: {
    label: "Proficient",
    description: "Above average for age group",
    color: "bg-green-500",
  },
  5: {
    label: "Expert",
    description: "Exceptional skill for age group",
    color: "bg-emerald-500",
  },
};

type AssessmentType = "training" | "match" | "formal_review" | "trial";

export default function AssessPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const currentUser = useCurrentUser();

  // State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedSportCode, setSelectedSportCode] = useState<string | null>(
    null
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

  // Queries
  const sports = useQuery(api.models.referenceData.getSports);
  const allPlayers = useQuery(api.models.orgPlayerEnrollments.getPlayersForOrg, {
    organizationId: orgId,
  });

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
    console.log("🐛 ASSIGNED TEAM IDS:", debugData.assignedTeamIds);
    console.log("🐛 ALL TEAMS:", debugData.allTeams);

    // Show unique team IDs from memberships
    const uniqueTeamIds = new Set(debugData.teamMemberships.map((tm: any) => tm.teamId));
    console.log("🐛 UNIQUE TEAM IDS IN MEMBERSHIPS:", Array.from(uniqueTeamIds));

    // Check if assigned team exists
    const assignedTeamId = debugData.assignedTeamIds[0];
    const teamExists = debugData.allTeams.find((t: any) => t._id === assignedTeamId);
    console.log("🐛 ASSIGNED TEAM EXISTS?", teamExists ? `Yes: ${teamExists.name}` : "NO - TEAM NOT FOUND!");
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
    if (!(allPlayers && selectedPlayerId)) return null;
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
    api.models.skillAssessments.getAssessmentHistory,
    selectedPlayerId && selectedSportCode
      ? {
          playerIdentityId: selectedPlayerId as Id<"playerIdentities">,
          sportCode: selectedSportCode,
          organizationId: orgId,
        }
      : "skip"
  );

  // Create lookup for existing assessments
  const existingRatings = useMemo(() => {
    if (!existingAssessments) return new Map<string, number>();
    return new Map(existingAssessments.map((a) => [a.skillCode, a.rating]));
  }, [existingAssessments]);

  // Filter players to only show coach's team members
  const coachTeamIds = useMemo(() => {
    return new Set(coachAssignments?.teams.map((t) => t.teamId) ?? []);
  }, [coachAssignments]);

  // Filter and search players
  const filteredPlayers = useMemo(() => {
    if (!allPlayers) return [];

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
            console.log(`🔍 DEBUG: Member ${member.playerIdentityId} in team ${member.teamId}: ${isInCoachTeam}`);
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
    if (!assessmentHistory) return null;

    const totalAssessments = assessmentHistory.length;
    const skillsAssessed = new Set(
      assessmentHistory.map((a) => a.skillCode)
    ).size;

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

  // Auto-select sport from team or default to first team's sport
  useMemo(() => {
    if (!coachAssignments?.teams) return;

    // If team is selected, use that team's sport
    if (selectedTeamId) {
      const team = coachAssignments.teams.find((t) => t.teamId === selectedTeamId);
      if (team?.sportCode && team.sportCode !== selectedSportCode) {
        setSelectedSportCode(team.sportCode);
      }
      return;
    }

    // Otherwise, default to the first team's sport (if not already set)
    if (!selectedSportCode && coachAssignments.teams.length > 0) {
      const firstTeamSport = coachAssignments.teams[0]?.sportCode;
      if (firstTeamSport) {
        setSelectedSportCode(firstTeamSport);
      }
    }
  }, [selectedTeamId, coachAssignments, selectedSportCode]);

  // Mutations
  const findOrCreatePassport = useMutation(
    api.models.sportPassports.findOrCreatePassport
  );
  const recordAssessment = useMutation(
    api.models.skillAssessments.recordAssessmentWithBenchmark
  );

  // Group skills by category
  type SkillDefinition = NonNullable<typeof skills>[number];
  const skillsByCategory = useMemo(() => {
    if (!(skills && skillCategories))
      return new Map<string, SkillDefinition[]>();

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
        saved++;
      } catch {
        errors++;
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
      <div className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              onClick={() => router.back()}
              size="sm"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="font-bold text-2xl">Assess Player Skills</h1>
              <p className="text-emerald-100 text-sm">
                Record skill assessments with automatic benchmark comparison
              </p>
            </div>
          </div>
          {unsavedCount > 0 && (
            <Button
              className="bg-white text-emerald-600 hover:bg-emerald-50"
              disabled={isSaving}
              onClick={handleSaveAll}
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

      {/* Search and Filter Bar */}
      <Card className="border-emerald-200 bg-emerald-50/50">
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
                }}
                value={selectedTeamId ?? "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {coachAssignments?.teams.map((team) => (
                    <SelectItem key={team.teamId} value={team.teamId}>
                      {team.teamName}
                      {team.sportCode && (
                        <span className="ml-2 text-muted-foreground text-xs">
                          ({team.sportCode.toUpperCase()})
                        </span>
                      )}
                    </SelectItem>
                  ))}
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
                {filteredPlayers.map(({ enrollment, player }) => (
                  <SelectItem
                    key={enrollment.playerIdentityId}
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
                {sports?.map((sport) => (
                  <SelectItem key={sport._id} value={sport.code}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTeamId && coachAssignments && (
              <p className="text-muted-foreground text-xs">
                Auto-selected from team
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
        <div className="grid gap-4 md:grid-cols-2">
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
                  {playerStats ? (
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
                          {playerStats.avgRating}
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
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Loading stats...
                    </p>
                  )}
                </div>
              </div>
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
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assessmentHistory.slice(0, 5).map((assessment) => {
                  const ratingChange = assessment.previousRating
                    ? assessment.rating - assessment.previousRating
                    : null;

                  return (
                    <div
                      className="flex items-center justify-between rounded border bg-white p-3 text-sm"
                      key={assessment._id}
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          className={`${RATING_LABELS[assessment.rating]?.color} text-white`}
                        >
                          {assessment.rating}
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
                    .sort(([_, a], [__, b]) => b.latest - b.previous - (a.latest - a.previous));

                  const declining = Array.from(skillChanges.entries())
                    .filter(([_, data]) => data.latest < data.previous)
                    .sort(([_, a], [__, b]) => a.latest - a.previous - (b.latest - b.previous));

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
                          ? Math.round(
                              (count / assessmentHistory.length) * 100
                            )
                          : 0;

                        return (
                          <div className="rounded border p-2" key={status}>
                            <p className="font-bold text-lg">{count}</p>
                            <p className="text-muted-foreground text-xs">
                              {status.replace("_", " ")}
                            </p>
                            <p className="text-muted-foreground text-[10px]">
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

      {/* Skills Assessment */}
      {selectedPlayerId && selectedSportCode && skills && skills.length > 0 ? (
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
                          <div className="flex items-center gap-4">
                            <Slider
                              className="flex-1"
                              max={5}
                              min={0}
                              onValueChange={([value]) =>
                                handleRatingChange(skill.code, value)
                              }
                              step={1}
                              value={[currentRating]}
                            />
                            <div className="w-32 text-right">
                              {currentRating > 0 ? (
                                <Badge
                                  className={`${RATING_LABELS[currentRating]?.color} text-white`}
                                >
                                  {currentRating} -{" "}
                                  {RATING_LABELS[currentRating]?.label}
                                </Badge>
                              ) : (
                                <Badge variant="outline">Not rated</Badge>
                              )}
                            </div>
                          </div>

                          {/* Rating description */}
                          {currentRating > 0 && (
                            <p className="text-muted-foreground text-xs">
                              {RATING_LABELS[currentRating]?.description}
                            </p>
                          )}

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
              <CardTitle>General Notes</CardTitle>
              <CardDescription>
                Add any overall observations about the player's performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-[100px]"
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Overall observations, areas for improvement, notable strengths..."
                value={generalNotes}
              />
            </CardContent>
          </Card>
        </div>
      ) : selectedPlayerId && selectedSportCode ? (
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
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold text-lg">
              Select Player & Sport
            </h3>
            <p className="text-muted-foreground">
              Choose a player and sport above to begin recording assessments
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
