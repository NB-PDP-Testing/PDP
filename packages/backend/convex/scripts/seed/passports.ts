/**
 * Passport Seeding - Generate realistic passport data based on player stage
 *
 * Creates sport passports with assessments, goals, and progress tracking
 * tailored to beginner, developing, or advanced player stages.
 */

import { v } from "convex/values";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";
import {
  generateAssessmentDates,
  generateProgressiveRatings,
  getGoalTemplatesForAgeGroup,
  type PlayerStage,
  randomFloat,
  randomInt,
  randomPick,
  randomSample,
  SKILL_CATEGORIES,
  STAGE_CONFIGS,
} from "./helpers/playerStages";

/**
 * Seed complete passport data for a player based on their development stage
 */
export const seedPassportForPlayer = mutation({
  args: {
    playerIdentityId: v.string(),
    organizationId: v.string(),
    sportCode: v.string(),
    stage: v.union(
      v.literal("beginner"),
      v.literal("developing"),
      v.literal("advanced")
    ),
    playerName: v.string(),
    ageGroup: v.string(),
    coachId: v.optional(v.string()),
    coachName: v.optional(v.string()),
  },
  returns: v.object({
    passportId: v.string(),
    assessmentCount: v.number(),
    goalCount: v.number(),
    milestoneCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const stage = args.stage as PlayerStage;
    const config = STAGE_CONFIGS[stage];

    // 1. Create or get sport passport
    const passportResult = await ctx.runMutation(
      api.models.sportPassports.findOrCreatePassport,
      {
        playerIdentityId: args.playerIdentityId as Id<"playerIdentities">,
        sportCode: args.sportCode,
        organizationId: args.organizationId,
      }
    );

    const passportId = passportResult.passportId;

    // 2. Add coach notes based on stage
    const coachNotes = randomPick(config.passport.coachNotesTemplates);
    await ctx.runMutation(api.models.sportPassports.updateNotes, {
      passportId,
      coachNotes,
    });

    // 3. Generate and record assessments
    const assessmentCount = await generateAssessments(
      ctx,
      passportId,
      args.sportCode,
      stage,
      config,
      args.coachId,
      args.coachName
    );

    // 4. Update overall rating if stage has one
    if (config.passport.overallRating) {
      const overallRating = randomFloat(
        config.passport.overallRating.min,
        config.passport.overallRating.max
      );

      await ctx.runMutation(api.models.sportPassports.updateRatings, {
        passportId,
        currentOverallRating: overallRating,
        incrementAssessmentCount: false, // We've already counted assessments
      });
    }

    // 5. Generate development goals
    const { goalCount, milestoneCount } = await generateGoals(
      ctx,
      passportId,
      args.playerIdentityId as Id<"playerIdentities">,
      args.organizationId,
      args.ageGroup,
      stage,
      config,
      args.coachId
    );

    return {
      passportId: passportId as string,
      assessmentCount,
      goalCount,
      milestoneCount,
    };
  },
});

/**
 * Generate skill assessments for a player based on stage
 */
// biome-ignore lint/nursery/useMaxParams: Seed script utility function with many contextual parameters
async function generateAssessments(
  ctx: any,
  passportId: Id<"sportPassports">,
  sportCode: string,
  _stage: PlayerStage,
  config: typeof STAGE_CONFIGS.beginner,
  coachId?: string,
  coachName?: string
): Promise<number> {
  const assessmentConfig = config.assessments;
  const count = randomInt(
    assessmentConfig.count.min,
    assessmentConfig.count.max
  );

  if (count === 0) {
    return 0;
  }

  // Get skill definitions for this sport
  const skillCategories = await ctx.db
    .query("skillCategories")
    .withIndex("by_sportCode", (q: any) => q.eq("sportCode", sportCode))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .collect();

  if (skillCategories.length === 0) {
    console.warn(`No skill categories found for sport: ${sportCode}`);
    return 0;
  }

  // Get skill definitions
  const allSkills = await ctx.db
    .query("skillDefinitions")
    .withIndex("by_sportCode", (q: any) => q.eq("sportCode", sportCode))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .collect();

  if (allSkills.length === 0) {
    console.warn(`No skill definitions found for sport: ${sportCode}`);
    return 0;
  }

  // Generate assessment dates
  const assessmentDates = generateAssessmentDates(count);
  const assessmentTypes = [
    "training",
    "formal_review",
    "match",
    "training",
    "training",
  ] as const;

  let totalAssessments = 0;

  // For each assessment date, assess multiple skills
  for (let i = 0; i < count; i++) {
    const date = assessmentDates[i];
    const assessmentType =
      i === 0 && count === 1 ? "initial" : randomPick(assessmentTypes as any);

    // Select 3-7 random skills to assess
    const skillsToAssess = randomSample(allSkills, randomInt(3, 7));

    // Generate progressive ratings for these skills
    const ratings = generateProgressiveRatings(
      skillsToAssess.length,
      assessmentConfig.ratingsRange.min,
      assessmentConfig.ratingsRange.max
    );

    // Record batch assessment
    const assessmentData = skillsToAssess.map((skill: any, idx: number) => ({
      skillCode: skill.code,
      rating: ratings[idx],
      notes: i === count - 1 && idx === 0 ? "Latest assessment" : undefined,
    }));

    await ctx.runMutation(api.models.skillAssessments.recordBatchAssessments, {
      passportId,
      assessmentDate: date,
      assessmentType,
      assessedBy: coachId,
      assessedByName: coachName || "Coach",
      assessorRole: "coach" as const,
      ratings: assessmentData,
    });

    totalAssessments += assessmentData.length;
  }

  return totalAssessments;
}

/**
 * Generate development goals for a player based on stage
 */
// biome-ignore lint/nursery/useMaxParams: Seed script utility function with many contextual parameters
async function generateGoals(
  ctx: any,
  passportId: Id<"sportPassports">,
  _playerIdentityId: Id<"playerIdentities">,
  _organizationId: string,
  ageGroup: string,
  stage: PlayerStage,
  config: typeof STAGE_CONFIGS.beginner,
  coachId?: string
): Promise<{ goalCount: number; milestoneCount: number }> {
  const goalConfig = config.goals;
  const count = randomInt(goalConfig.count.min, goalConfig.count.max);

  const templates = getGoalTemplatesForAgeGroup(ageGroup);
  const categories = Object.keys(templates);

  let totalGoals = 0;
  let totalMilestones = 0;

  // Determine how many goals should be completed (for advanced players)
  const completedCount = Math.floor(count * (goalConfig.completedRatio || 0));

  for (let i = 0; i < count; i++) {
    // Pick a category and goal from templates
    const category = randomPick(categories);
    const goalTemplates = templates[category];

    if (!goalTemplates || goalTemplates.length === 0) {
      continue;
    }

    const title = randomPick(goalTemplates);

    // Determine status based on stage config
    let status: "not_started" | "in_progress" | "completed";
    let progress: number;

    if (stage === "advanced" && i < completedCount) {
      status = "completed";
      progress = 100;
    } else {
      status = randomPick(goalConfig.statuses);
      progress = randomInt(
        goalConfig.progressRange.min,
        goalConfig.progressRange.max
      );

      // Ensure completed goals have 100% progress
      if (status === "completed") {
        progress = 100;
      }
    }

    // Create the goal
    const goalId = await ctx.runMutation(api.models.passportGoals.createGoal, {
      passportId,
      title,
      description: `Work on improving ${title.toLowerCase()} through focused practice and application in training sessions.`,
      category: mapCategoryToValidator(category),
      priority: determinePriority(stage, status),
      targetDate: generateTargetDate(status, progress),
      linkedSkills: getLinkedSkills(category),
      parentCanView: true,
      createdBy: coachId,
    });

    // Update progress if not default 0
    if (progress > 0) {
      await ctx.runMutation(api.models.passportGoals.updateGoalProgress, {
        goalId,
        progress,
      });
    }

    // Add milestones for developing/advanced players
    if (stage !== "beginner") {
      const milestoneCount =
        stage === "advanced" ? randomInt(2, 4) : randomInt(1, 3);

      for (let m = 0; m < milestoneCount; m++) {
        const milestoneDesc = generateMilestoneDescription(title, m);
        await ctx.runMutation(api.models.passportGoals.addMilestone, {
          goalId,
          description: milestoneDesc,
        });

        // Complete some milestones for in-progress or completed goals
        if (
          (status === "completed" && progress === 100) ||
          (status === "in_progress" && m < milestoneCount - 1 && progress > 50)
        ) {
          // Need to get the milestone ID to complete it
          const goal = await ctx.db.get(goalId);
          if (goal?.milestones && goal.milestones.length > m) {
            const milestoneId = goal.milestones[m].id;
            await ctx.runMutation(api.models.passportGoals.completeMilestone, {
              goalId,
              milestoneId,
            });
          }
        }

        totalMilestones += 1;
      }
    }

    // Mark as completed if status is completed
    if (status === "completed") {
      await ctx.runMutation(api.models.passportGoals.updateGoal, {
        goalId,
        status: "completed",
      });
    }

    totalGoals += 1;
  }

  return {
    goalCount: totalGoals,
    milestoneCount: totalMilestones,
  };
}

/**
 * Helper: Map template category to goal category validator
 */
function mapCategoryToValidator(
  category: string
): "technical" | "tactical" | "physical" | "mental" | "social" {
  const categoryMap: Record<
    string,
    "technical" | "tactical" | "physical" | "mental" | "social"
  > = {
    technical: "technical",
    tactical: "tactical",
    physical: "physical",
    mental: "mental",
    social: "social",
  };

  return categoryMap[category] || "technical";
}

/**
 * Helper: Determine goal priority based on stage and status
 */
function determinePriority(
  stage: PlayerStage,
  status: string
): "high" | "medium" | "low" {
  if (stage === "beginner") {
    return "high"; // All beginner goals are high priority
  }
  if (stage === "advanced" && status === "in_progress") {
    return "high";
  }
  if (status === "completed") {
    return "low";
  }
  return "medium";
}

/**
 * Helper: Generate target date based on status and progress
 */
function generateTargetDate(status: string, progress: number): string {
  const now = new Date();

  if (status === "completed") {
    // Completed goals had target dates in the past
    const daysAgo = randomInt(7, 60);
    now.setDate(now.getDate() - daysAgo);
  } else if (status === "in_progress") {
    // In-progress goals have near-term targets
    const daysAhead = progress > 50 ? randomInt(14, 45) : randomInt(30, 90);
    now.setDate(now.getDate() + daysAhead);
  } else {
    // Not started goals have longer-term targets
    const daysAhead = randomInt(60, 120);
    now.setDate(now.getDate() + daysAhead);
  }

  return now.toISOString().split("T")[0];
}

/**
 * Helper: Get linked skill codes for a goal category
 */
function getLinkedSkills(category: string): string[] {
  const skills = SKILL_CATEGORIES[category as keyof typeof SKILL_CATEGORIES];
  if (!skills) {
    return [];
  }

  // Return 1-3 random skills from the category
  return randomSample(skills, randomInt(1, Math.min(3, skills.length)));
}

/**
 * Helper: Generate milestone description
 */
function generateMilestoneDescription(
  goalTitle: string,
  index: number
): string {
  const milestoneTemplates = [
    `Complete initial assessment for ${goalTitle.toLowerCase()}`,
    `Practice ${goalTitle.toLowerCase()} in 5 consecutive training sessions`,
    `Demonstrate ${goalTitle.toLowerCase()} successfully in match situation`,
    `Receive positive feedback from coach on ${goalTitle.toLowerCase()}`,
    `Show consistent improvement in ${goalTitle.toLowerCase()}`,
    `Apply ${goalTitle.toLowerCase()} under pressure`,
  ];

  return milestoneTemplates[index % milestoneTemplates.length];
}
