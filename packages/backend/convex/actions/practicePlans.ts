"use node";

/**
 * AI-powered Practice Plan Generation
 *
 * Generates personalized weekly home practice plans for players
 * based on their skill levels, development goals, and coach feedback.
 *
 * Inspired by MVP parent dashboard AI Practice Assistant feature
 */

import { v } from "convex/values";
import OpenAI from "openai";
import { api } from "../_generated/api";
import { action } from "../_generated/server";

// Regex for extracting JSON from markdown code blocks
const JSON_MARKDOWN_REGEX = /```(?:json)?\s*(\{[\s\S]*\})\s*```/;

// Practice plan structure
const practicePlanValidator = v.object({
  playerName: v.string(),
  sport: v.string(),
  ageGroup: v.string(),
  weeklyFocus: v.string(),
  targetSkills: v.array(
    v.object({
      name: v.string(),
      currentRating: v.number(),
      targetRating: v.number(),
    })
  ),
  primaryGoal: v.string(),
  drills: v.array(
    v.object({
      name: v.string(),
      duration: v.string(),
      skill: v.string(),
      instructions: v.array(v.string()),
      successMetric: v.string(),
      aiTip: v.string(),
    })
  ),
  schedule: v.array(
    v.object({
      day: v.string(),
      time: v.string(),
      duration: v.string(),
    })
  ),
  equipment: v.array(v.string()),
  weeklyGoal: v.string(),
  progressTracking: v.array(v.string()),
  parentTips: v.array(v.string()),
});

/**
 * Generate AI-powered practice plan for a player
 */
export const generatePracticePlan = action({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: practicePlanValidator,
  handler: async (ctx, args) => {
    // Get player passport data
    const passportData = await ctx.runQuery(
      api.models.sportPassports.getFullPlayerPassportView,
      {
        playerIdentityId: args.playerIdentityId,
        organizationId: args.organizationId,
      }
    );

    if (!passportData) {
      throw new Error("Player passport not found");
    }

    // Get player enrollment data
    const enrollment = await ctx.runQuery(
      api.models.orgPlayerEnrollments.getEnrollment,
      {
        playerIdentityId: args.playerIdentityId,
        organizationId: args.organizationId,
      }
    );

    if (!enrollment) {
      throw new Error("Player enrollment not found");
    }

    // Note: Development goals API not yet implemented
    // Will use coach feedback and skill analysis instead
    const goals = null;

    // Get recent coach summaries for context
    const summaries = await ctx.runQuery(
      api.models.coachParentSummaries.getParentSummariesByChildAndSport,
      {
        organizationId: args.organizationId,
      }
    );

    // Find summaries for this specific player
    const playerSummaries = summaries
      .find((child) => child.player._id === args.playerIdentityId)
      ?.sportGroups.flatMap((sg) => sg.summaries)
      .slice(0, 3); // Get most recent 3

    // Analyze skills to find areas for improvement
    const skills = passportData.skills as Record<string, number> | undefined;
    const skillEntries = skills
      ? Object.entries(skills)
          .filter(([_, value]) => typeof value === "number" && value > 0)
          .map(([name, rating]) => ({ name, rating: rating as number }))
          .sort((a, b) => a.rating - b.rating) // Sort by lowest rating first
      : [];

    const weakestSkills = skillEntries.slice(0, 3);
    const playerName = `${passportData.firstName} ${passportData.lastName}`;
    const ageGroup = enrollment.ageGroup || "Unknown";
    const sport = passportData.passports?.[0]?.sportName || "General Sports";

    // Build context for AI
    const coachFeedback =
      playerSummaries?.map((s) => s.publicSummary.content).join("\n- ") ||
      "No recent feedback";

    const developmentGoals =
      goals?.map((g) => `${g.title}: ${g.description}`).join("\n- ") ||
      "No specific goals set";

    const skillsList = weakestSkills
      .map((s) => `${s.name}: ${s.rating}/5`)
      .join(", ");

    // Initialize OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    const openai = new OpenAI({
      apiKey,
    });

    // Generate practice plan with GPT-4
    const prompt = `You are a youth sports development expert creating a personalized home practice plan for parents to use with their child.

PLAYER PROFILE:
- Name: ${playerName}
- Age Group: ${ageGroup}
- Sport: ${sport}
- Skill Levels (1-5 scale): ${skillsList || "Not assessed yet"}

RECENT COACH FEEDBACK:
- ${coachFeedback}

DEVELOPMENT GOALS:
- ${developmentGoals}

TASK: Create a comprehensive 15-minute weekly home practice plan with 3 sport-specific drills (5 minutes each).

Requirements:
1. Focus on the 2 weakest skills: ${weakestSkills.map((s) => s.name).join(" and ")}
2. Make drills FUN and age-appropriate for ${ageGroup}
3. Use minimal equipment (items found at home)
4. Include clear success metrics parents can track
5. Provide coaching tips for parents (how to encourage, what to watch for)

Return a JSON object with this EXACT structure:
{
  "weeklyFocus": "Primary skill to improve (one of the weakest skills)",
  "primaryGoal": "One sentence goal tied to coach feedback or development goals",
  "drills": [
    {
      "name": "Drill name",
      "duration": "5 minutes",
      "skill": "Which skill this develops",
      "instructions": ["Step 1", "Step 2", "Step 3", "Step 4"],
      "successMetric": "What success looks like (be specific and measurable)",
      "aiTip": "Coaching tip for parents - how to encourage or what to watch for"
    }
  ],
  "equipment": ["Ball", "Cones", "etc"],
  "weeklyGoal": "Measurable improvement target for the week",
  "progressTracking": [
    "Check off completed sessions",
    "Note improvements",
    "Share progress with coach",
    "Take a video"
  ],
  "parentTips": [
    "Tip 1 for parents",
    "Tip 2 for parents",
    "Tip 3 for parents"
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting or extra text.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a youth sports coach creating personalized practice plans. Always return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      // Parse AI response
      let aiPlan: {
        weeklyFocus: string;
        primaryGoal: string;
        drills: Array<{
          name: string;
          duration: string;
          skill: string;
          instructions: string[];
          successMetric: string;
          aiTip: string;
        }>;
        equipment: string[];
        weeklyGoal: string;
        progressTracking: string[];
        parentTips: string[];
      };

      try {
        aiPlan = JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(JSON_MARKDOWN_REGEX);
        if (jsonMatch) {
          aiPlan = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error(`Failed to parse AI response: ${parseError}`);
        }
      }

      // Build final practice plan
      const plan = {
        playerName,
        sport,
        ageGroup,
        weeklyFocus: aiPlan.weeklyFocus,
        targetSkills: weakestSkills.slice(0, 2).map((s) => ({
          name: s.name,
          currentRating: s.rating,
          targetRating: Math.min(5, s.rating + 1),
        })),
        primaryGoal: aiPlan.primaryGoal,
        drills: aiPlan.drills.slice(0, 3), // Ensure 3 drills
        schedule: [
          { day: "Monday", time: "After school", duration: "15 mins" },
          { day: "Wednesday", time: "After school", duration: "15 mins" },
          { day: "Friday", time: "After school", duration: "15 mins" },
        ],
        equipment: aiPlan.equipment,
        weeklyGoal: aiPlan.weeklyGoal,
        progressTracking: aiPlan.progressTracking,
        parentTips: aiPlan.parentTips,
      };

      return plan;
    } catch (error) {
      console.error("Error generating practice plan:", error);
      throw new Error(
        `Failed to generate practice plan: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});
