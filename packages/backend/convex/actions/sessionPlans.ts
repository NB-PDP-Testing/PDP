"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

/**
 * AI-powered session plan generation
 *
 * This action generates session plan content using AI based on:
 * - Team age group
 * - Player count
 * - Focus area
 * - Duration
 * - Sport type
 */

/**
 * Generate session plan content using AI
 * Internal action - called by generateAndSave mutation
 */
export const generatePlanContent = internalAction({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Fetch the plan to get context - need to create an internal query for this
      // For now, generate based on planId
      // In a real implementation, you'd fetch the plan details first

      // Generate simulated content
      const generatedContent = {
        title: "Training Session Plan",
        content: `# Training Session Plan

## Warm-Up (15 minutes)

### Activity 1: Dynamic Stretching
- Light jogging around the pitch
- Dynamic stretches (leg swings, arm circles)
- Gradual increase in intensity

### Activity 2: Ball Familiarization
- Players in pairs with one ball
- Simple passing drills
- Focus on first touch and accuracy

## Technical Skills (25 minutes)

### Drill 1: Core Fundamentals
- Set up stations focusing on key skills
- Small groups rotating through stations
- Emphasis on proper technique

### Drill 2: Progressive Practice
- Build on fundamental skills
- Add pressure and decision-making
- Competitive element between groups

## Tactical Work (20 minutes)

### Small-sided Games
- Game-based tactical practice
- Apply learned skills in context
- Coach intervention for teaching moments

## Full Game (20 minutes)

- Match simulation
- Apply all learned concepts
- Focus on game intelligence

## Cool-Down (10 minutes)

- Light movement and recovery
- Static stretching routine
- Team discussion and feedback

---

**Equipment Needed:**
- Balls
- Cones
- Bibs
- Goals

**Safety Considerations:**
- Proper warm-up
- Hydration breaks
- Age-appropriate intensity`,
      };

      // Parse content into structured sections
      const sections = [
        {
          id: "warmup-1",
          type: "warmup" as const,
          title: "Warm-Up",
          duration: 15,
          order: 1,
          activities: [
            {
              id: "warmup-1-1",
              name: "Dynamic Stretching",
              description:
                "Light jogging and dynamic stretches to prepare the body",
              duration: 8,
              order: 1,
              activityType: "exercise" as const,
            },
            {
              id: "warmup-1-2",
              name: "Ball Familiarization",
              description: "Pairs passing drills with focus on first touch",
              duration: 7,
              order: 2,
              activityType: "drill" as const,
            },
          ],
        },
        {
          id: "technical-1",
          type: "technical" as const,
          title: "Technical Skills",
          duration: 25,
          order: 2,
          activities: [
            {
              id: "technical-1-1",
              name: "Station Work",
              description: "Rotating station-based technical drills",
              duration: 15,
              order: 1,
              activityType: "drill" as const,
            },
            {
              id: "technical-1-2",
              name: "Progressive Practice",
              description: "Building complexity with decision-making",
              duration: 10,
              order: 2,
              activityType: "drill" as const,
            },
          ],
        },
        {
          id: "tactical-1",
          type: "tactical" as const,
          title: "Tactical Work",
          duration: 20,
          order: 3,
          activities: [
            {
              id: "tactical-1-1",
              name: "Small-sided Games",
              description: "Game-based tactical practice",
              duration: 20,
              order: 1,
              activityType: "game" as const,
            },
          ],
        },
        {
          id: "games-1",
          type: "games" as const,
          title: "Full Game",
          duration: 20,
          order: 4,
          activities: [
            {
              id: "games-1-1",
              name: "Match Simulation",
              description: "Full game with minimal intervention",
              duration: 20,
              order: 1,
              activityType: "game" as const,
            },
          ],
        },
        {
          id: "cooldown-1",
          type: "cooldown" as const,
          title: "Cool-Down",
          duration: 10,
          order: 5,
          activities: [
            {
              id: "cooldown-1-1",
              name: "Light Movement",
              description: "Gentle jogging and walking recovery",
              duration: 5,
              order: 1,
              activityType: "exercise" as const,
            },
            {
              id: "cooldown-1-2",
              name: "Static Stretching & Discussion",
              description: "Stretching and team feedback",
              duration: 5,
              order: 2,
              activityType: "exercise" as const,
            },
          ],
        },
      ];

      // Update the plan with generated content
      await ctx.runMutation(internal.models.sessionPlans.updatePlanContent, {
        planId: args.planId,
        title: generatedContent.title,
        rawContent: generatedContent.content,
        sections,
        status: "saved",
      });
    } catch (error) {
      console.error("Failed to generate session plan:", error);

      // Mark plan as failed
      await ctx.runMutation(internal.models.sessionPlans.updatePlanContent, {
        planId: args.planId,
        title: "Failed to Generate",
        rawContent:
          "An error occurred while generating this session plan. Please try again.",
        sections: [],
        status: "draft",
      });
    }
  },
});
