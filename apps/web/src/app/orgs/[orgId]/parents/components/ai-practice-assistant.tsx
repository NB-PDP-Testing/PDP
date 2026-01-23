"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  CheckCircle2,
  Clock,
  Dumbbell,
  Lightbulb,
  Share2,
  Sparkles,
  Target,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AIPracticeAssistantProps = {
  playerData: Array<{
    player: {
      _id: Id<"playerIdentities">;
      firstName: string;
      lastName: string;
    };
    enrollment?: {
      ageGroup?: string;
      sport?: string;
    };
  }>;
  orgId: string;
};

// Sport emoji mapping
const SPORT_EMOJIS: Record<string, string> = {
  gaa: "🏐",
  soccer: "⚽",
  football: "🏈",
  rugby: "🏉",
  basketball: "🏀",
  tennis: "🎾",
  hockey: "🏒",
  swimming: "🏊",
  athletics: "🏃",
  golf: "⛳",
};

// Sport-specific drill database
const DRILL_DATABASE: Record<
  string,
  Array<{
    skill: string;
    name: string;
    duration: string;
    equipment: string[];
    instructions: string[];
    successMetrics: string;
  }>
> = {
  soccer: [
    {
      skill: "passing",
      name: "Wall Pass Practice",
      duration: "5 mins",
      equipment: ["Ball", "Wall or rebounder"],
      instructions: [
        "Stand 3-5 meters from wall",
        "Pass ball against wall with inside of foot",
        "Control return and repeat",
        "Alternate feet every 10 passes",
      ],
      successMetrics: "Complete 20 passes per foot with good control",
    },
    {
      skill: "dribbling",
      name: "Cone Weave",
      duration: "5 mins",
      equipment: ["Ball", "5 cones or markers"],
      instructions: [
        "Set up cones in a line 1 meter apart",
        "Dribble through cones using close touches",
        "Use both feet to control ball",
        "Increase speed as confidence grows",
      ],
      successMetrics: "Complete course in under 15 seconds",
    },
    {
      skill: "shooting",
      name: "Target Practice",
      duration: "5 mins",
      equipment: ["Ball", "Target (cone or marker)"],
      instructions: [
        "Set target 5 meters away",
        "Strike ball with laces, aim for target",
        "Focus on technique over power",
        "Retrieve ball quickly, repeat",
      ],
      successMetrics: "Hit target 7 out of 10 attempts",
    },
    {
      skill: "first_touch",
      name: "Throw and Control",
      duration: "5 mins",
      equipment: ["Ball"],
      instructions: [
        "Throw ball in the air",
        "Control with different body parts",
        "Try thigh, chest, then foot",
        "Ball should stay within reach after control",
      ],
      successMetrics: "Control ball within 1 meter 8 out of 10 times",
    },
  ],
  gaa: [
    {
      skill: "hand_passing",
      name: "Wall Hand Pass",
      duration: "5 mins",
      equipment: ["Ball", "Wall"],
      instructions: [
        "Stand 3 meters from wall",
        "Hand pass ball against wall",
        "Catch and repeat quickly",
        "Alternate hands every 10 passes",
      ],
      successMetrics: "Complete 30 passes without dropping",
    },
    {
      skill: "kicking",
      name: "Kick Pass Targets",
      duration: "5 mins",
      equipment: ["Ball", "Target markers"],
      instructions: [
        "Set up 3 targets at different distances",
        "Kick pass to each target",
        "Focus on accuracy over distance",
        "Use both feet",
      ],
      successMetrics: "Hit each target twice in a row",
    },
    {
      skill: "catching",
      name: "High Catch Practice",
      duration: "5 mins",
      equipment: ["Ball"],
      instructions: [
        "Throw ball high in the air",
        "Jump and catch at highest point",
        "Land with ball secure",
        "Increase throw height progressively",
      ],
      successMetrics: "10 successful high catches in a row",
    },
  ],
  rugby: [
    {
      skill: "passing",
      name: "Spiral Pass Practice",
      duration: "5 mins",
      equipment: ["Ball", "Target"],
      instructions: [
        "Hold ball with fingers spread",
        "Practice spiral motion on release",
        "Pass to target 5 meters away",
        "Focus on spin and accuracy",
      ],
      successMetrics: "5 spiral passes hit target",
    },
    {
      skill: "catching",
      name: "High Ball Catching",
      duration: "5 mins",
      equipment: ["Ball"],
      instructions: [
        "Throw ball high",
        "Position body under ball",
        "Call 'mine' before catching",
        "Secure ball to chest on catch",
      ],
      successMetrics: "8 successful catches out of 10",
    },
  ],
  generic: [
    {
      skill: "agility",
      name: "Quick Feet Drill",
      duration: "5 mins",
      equipment: ["None"],
      instructions: [
        "Mark a small square on ground",
        "Step in and out of square quickly",
        "Keep knees high, arms moving",
        "30 seconds on, 30 seconds rest x 5",
      ],
      successMetrics: "Complete all 5 sets without stopping",
    },
    {
      skill: "balance",
      name: "Single Leg Balance",
      duration: "5 mins",
      equipment: ["None"],
      instructions: [
        "Stand on one leg",
        "Close eyes for challenge",
        "Hold for 30 seconds",
        "Switch legs and repeat",
      ],
      successMetrics: "Hold each leg for 30 seconds with eyes closed",
    },
  ],
};

type PracticePlan = {
  childName: string;
  sport: string;
  focusSkill: string;
  drills: (typeof DRILL_DATABASE.soccer)[number][];
  weeklyGoal: string;
  schedule: string[];
  aiTip: string;
};

type ChildSportEnrollment = {
  playerId: Id<"playerIdentities">;
  firstName: string;
  lastName: string;
  sport: string;
  sportCode: string;
  ageGroup: string;
};

export function AIPracticeAssistant({
  playerData,
  orgId,
}: AIPracticeAssistantProps) {
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<ChildSportEnrollment | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<PracticePlan | null>(null);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Get player identity IDs
  const playerIds = useMemo(
    () => playerData.map((c) => c.player._id),
    [playerData]
  );

  // Bulk fetch sport passports for all children
  const sportPassports = useQuery(
    api.models.sportPassports.getBulkPassportsForPlayers,
    playerIds.length > 0 ? { playerIdentityIds: playerIds } : "skip"
  );

  // Build list of child-sport enrollments (multi-sport children appear multiple times)
  const childSportEnrollments = useMemo(() => {
    const enrollments: ChildSportEnrollment[] = [];

    for (const child of playerData) {
      const passportData = sportPassports?.find(
        (p) => p.playerIdentityId === child.player._id
      );

      if (passportData?.passports && passportData.passports.length > 0) {
        // Add an entry for each sport passport
        for (const passport of passportData.passports) {
          // Format sport code as display name (e.g., "gaa" -> "GAA", "soccer" -> "Soccer")
          const sportDisplay = passport.sportCode
            ? passport.sportCode.length <= 3
              ? passport.sportCode.toUpperCase() // Short codes like "gaa" -> "GAA"
              : passport.sportCode.charAt(0).toUpperCase() +
                passport.sportCode.slice(1) // Longer names capitalize first letter
            : "Sport";
          enrollments.push({
            playerId: child.player._id,
            firstName: child.player.firstName,
            lastName: child.player.lastName,
            sport: sportDisplay,
            sportCode: passport.sportCode || "generic",
            ageGroup: child.enrollment?.ageGroup || "Youth",
          });
        }
      } else {
        // Fallback to enrollment data if no passports
        enrollments.push({
          playerId: child.player._id,
          firstName: child.player.firstName,
          lastName: child.player.lastName,
          sport: child.enrollment?.sport || "Sport",
          sportCode: child.enrollment?.sport?.toLowerCase() || "generic",
          ageGroup: child.enrollment?.ageGroup || "Youth",
        });
      }
    }

    return enrollments;
  }, [playerData, sportPassports]);

  // Get passport data for selected child
  const passportData = useQuery(
    api.models.sportPassports.getFullPlayerPassportView,
    selectedEnrollment
      ? {
          playerIdentityId: selectedEnrollment.playerId,
          organizationId: orgId,
        }
      : "skip"
  );

  // Handle clicking on a child card to generate plan
  const handleGeneratePlan = useCallback(
    (enrollment: ChildSportEnrollment) => {
      setSelectedEnrollment(enrollment);
      setIsGenerating(true);

      // Simulate AI processing delay
      setTimeout(() => {
        const skills = passportData?.skills as
          | Record<string, number>
          | undefined;
        const sportCode = enrollment.sportCode || "generic";

        // Find weakest skill
        let weakestSkill = "agility";
        let lowestRating = 5;

        if (skills) {
          for (const [skill, rating] of Object.entries(skills)) {
            if (typeof rating === "number" && rating < lowestRating) {
              lowestRating = rating;
              weakestSkill = skill;
            }
          }
        }

        // Get drills for this sport
        const sportDrills = DRILL_DATABASE[sportCode] || DRILL_DATABASE.generic;
        const focusDrill =
          sportDrills.find((d) => d.skill === weakestSkill) || sportDrills[0];
        const additionalDrills = sportDrills
          .filter((d) => d !== focusDrill)
          .slice(0, 2);

        const plan: PracticePlan = {
          childName: `${enrollment.firstName} ${enrollment.lastName}`,
          sport: enrollment.sport.toUpperCase(),
          focusSkill: weakestSkill
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          drills: focusDrill ? [focusDrill, ...additionalDrills] : [],
          weeklyGoal: `Improve ${weakestSkill.replace(/_/g, " ")} rating from ${lowestRating} to ${Math.min(5, lowestRating + 1)}`,
          schedule: [
            "Tuesday after school",
            "Thursday after school",
            "Saturday morning",
          ],
          aiTip: `Focus on quality over quantity. ${enrollment.firstName} should aim for 3 short sessions (15 mins each) rather than one long session. Celebrate small improvements!`,
        };

        setGeneratedPlan(plan);
        setShowPlanDialog(true);
        setIsGenerating(false);
      }, 1500);
    },
    [passportData]
  );

  const getSportEmoji = (sportCode: string): string =>
    SPORT_EMOJIS[sportCode.toLowerCase()] || "🏃";

  return (
    <>
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-purple-600 to-purple-700">
        <CardHeader className="pb-0 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/20 p-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-white text-xl">
                AI Practice Assistant
              </CardTitle>
              <CardDescription className="text-purple-100">
                Personalized home training plans powered by AI
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-4 text-white">
          <p className="mb-4 text-sm text-white/90">
            Click a child to generate their personalized weekly practice plan:
          </p>

          {/* Children Cards Grid - One Click (No Dropdown) */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {childSportEnrollments.map((enrollment, idx) => (
              <button
                className="rounded-lg border border-white/30 bg-white/10 p-4 text-left transition-all hover:scale-105 hover:bg-white/20 disabled:cursor-wait disabled:opacity-50"
                disabled={isGenerating}
                key={`${enrollment.playerId}-${enrollment.sportCode}-${idx}`}
                onClick={() => handleGeneratePlan(enrollment)}
              >
                <p className="mb-1 font-semibold text-white">
                  {enrollment.firstName} {enrollment.lastName}
                </p>
                <p className="text-purple-100 text-sm">
                  {getSportEmoji(enrollment.sportCode)} {enrollment.sport} •{" "}
                  {enrollment.ageGroup}
                </p>
                <div className="mt-2 flex items-center gap-2 text-purple-200 text-xs">
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {isGenerating &&
                    selectedEnrollment?.playerId === enrollment.playerId &&
                    selectedEnrollment?.sportCode === enrollment.sportCode
                      ? "Generating..."
                      : "Generate Plan"}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* How it works explanation */}
          <div className="mt-4 rounded-lg bg-white/10 p-3">
            <p className="text-purple-100 text-sm">
              <Lightbulb className="mr-1 inline h-4 w-4" />
              <strong>How it works:</strong> Analyzes your child's skill ratings
              → Identifies areas for improvement → Creates sport-specific drills
              (3 × 5-minute sessions = 15 mins total)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Practice Plan Dialog */}
      <Dialog onOpenChange={setShowPlanDialog} open={showPlanDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Weekly Practice Plan
            </DialogTitle>
            <DialogDescription>
              {generatedPlan?.childName} - {generatedPlan?.sport}
            </DialogDescription>
          </DialogHeader>

          {generatedPlan && (
            <div className="space-y-6">
              {/* Focus Area */}
              <div className="rounded-lg bg-purple-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold">Weekly Focus</span>
                </div>
                <p className="font-medium text-lg text-purple-800">
                  {generatedPlan.focusSkill}
                </p>
                <p className="text-purple-700 text-sm">
                  {generatedPlan.weeklyGoal}
                </p>
              </div>

              {/* Schedule */}
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-semibold">
                  <Clock className="h-4 w-4" />
                  Recommended Schedule
                </h4>
                <div className="flex flex-wrap gap-2">
                  {generatedPlan.schedule.map((time) => (
                    <Badge className="bg-green-100 text-green-700" key={time}>
                      {time}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Drills */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                  <Dumbbell className="h-4 w-4" />
                  Practice Drills (3 × 5 minutes)
                </h4>
                <div className="space-y-4">
                  {generatedPlan.drills.map((drill) => (
                    <div className="rounded-lg border p-4" key={drill.name}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">{drill.name}</span>
                        <Badge variant="outline">{drill.duration}</Badge>
                      </div>

                      <div className="mb-2">
                        <span className="text-muted-foreground text-xs">
                          Equipment:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {drill.equipment.map((eq) => (
                            <Badge
                              className="text-xs"
                              key={eq}
                              variant="secondary"
                            >
                              {eq}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <ol className="mb-2 list-inside list-decimal space-y-1 text-sm">
                        {drill.instructions.map((inst) => (
                          <li key={inst}>{inst}</li>
                        ))}
                      </ol>

                      <div className="flex items-center gap-2 rounded bg-green-50 p-2 text-green-700 text-xs">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Success: {drill.successMetrics}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Tip */}
              <div className="rounded-lg border-l-4 border-l-purple-500 bg-purple-50 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-800">
                    AI Coaching Tip
                  </span>
                </div>
                <p className="text-purple-700 text-sm">{generatedPlan.aiTip}</p>
              </div>

              {/* Progress Checklist */}
              <div>
                <h4 className="mb-2 font-semibold">
                  Weekly Progress Checklist
                </h4>
                <div className="space-y-2">
                  {[
                    "Session 1 completed",
                    "Session 2 completed",
                    "Session 3 completed",
                    "Weekly goal achieved",
                  ].map((item) => (
                    <div className="flex items-center gap-2" key={item}>
                      <div className="h-5 w-5 rounded border" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Share Button */}
              <Button className="w-full" variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                Share Practice Plan
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
