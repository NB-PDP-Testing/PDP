"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Award,
  Check,
  ChevronRight,
  Loader2,
  Save,
  Target,
  User,
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
  const [assessmentType, setAssessmentType] =
    useState<AssessmentType>("training");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSkills, setSavedSkills] = useState<Set<string>>(new Set());

  // Queries
  const sports = useQuery(api.models.referenceData.getSports);
  const players = useQuery(api.models.orgPlayerEnrollments.getPlayersForOrg, {
    organizationId: orgId,
  });

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
    if (!(players && selectedPlayerId)) return null;
    const found = players.find(
      (p) => p.enrollment.playerIdentityId === selectedPlayerId
    );
    return found ?? null;
  }, [players, selectedPlayerId]);

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

  // Create lookup for existing assessments
  const existingRatings = useMemo(() => {
    if (!existingAssessments) return new Map<string, number>();
    return new Map(existingAssessments.map((a) => [a.skillCode, a.rating]));
  }, [existingAssessments]);

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
  const isLoading = sports === undefined || players === undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.back()} size="sm" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="font-bold text-2xl">Assess Player Skills</h1>
            <p className="text-muted-foreground text-sm">
              Record skill assessments with automatic benchmark comparison
            </p>
          </div>
        </div>
        {unsavedCount > 0 && (
          <Button disabled={isSaving} onClick={handleSaveAll}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save All ({unsavedCount})
          </Button>
        )}
      </div>

      {/* Player & Sport Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
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
                {players?.map(({ enrollment, player }) => (
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

      {/* Player Info Card */}
      {selectedPlayer && selectedSportCode && (
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
                Passport exists ({passport.assessmentCount} assessments)
              </Badge>
            )}
            {!passport && selectedPlayerId && selectedSportCode && (
              <Badge variant="secondary">New passport will be created</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Skills Assessment */}
      {selectedPlayerId && selectedSportCode && skills && skills.length > 0 ? (
        <div className="space-y-6">
          {Array.from(skillsByCategory.entries()).map(
            ([categoryName, categorySkills]) => (
              <Card key={categoryName}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
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
                        className={`rounded-lg border p-4 ${isSaved ? "border-green-200 bg-green-50/50" : ""}`}
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
