/**
 * Import GAA Football level descriptors (update existing skills)
 * Run with: npx convex run migrations/importGAAFootballLevelDescriptors:run --prod
 */

import descriptorsData from "../../scripts/gaa-football-level-descriptors-UPDATE.json";
import { internalMutation } from "../_generated/server";

// Mapping from skill names in JSON to skill codes in database
const SKILL_NAME_TO_CODE: Record<string, string> = {
  Soloing: "soloing",
  "Ball Handling": "ball_handling",
  "Pickup/Toe Lift": "pickup_toe_lift",
  "Kicking - Long": "kicking_long",
  "Kicking - Short": "kicking_short",
  "High Catching": "high_catching",
  "Free Taking - Ground": "free_taking_ground",
  "Free Taking - Hand": "free_taking_hand",
  "Hand Passing": "hand_passing",
  "Positional Sense": "positional_sense",
  Tracking: "tracking",
  "Decision Making": "decision_making",
  "Decision Speed": "decision_speed",
  Tackling: "tackling",
  "Left Side": "left_side",
  "Right Side": "right_side",
};

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    let updated = 0;
    let skipped = 0;
    const errors = [];

    console.log("Starting GAA Football level descriptors import...");

    // Get the sport
    const sport = descriptorsData.sports[0];
    if (sport.sportCode !== "gaa_football") {
      return {
        updated: 0,
        skipped: 0,
        errors: ["Sport code mismatch - expected gaa_football"],
      };
    }

    // Process each category and skill
    for (const category of sport.categories) {
      console.log(`Processing category: ${category.name}`);

      for (const skill of category.skills) {
        try {
          // Map skill name to code
          const skillCode = SKILL_NAME_TO_CODE[skill.name];
          if (!skillCode) {
            errors.push({
              skill: skill.name,
              error: `Unknown skill name: ${skill.name}`,
            });
            continue;
          }

          // Find existing skill
          const existingSkill = await ctx.db
            .query("skillDefinitions")
            .withIndex("by_sportCode_and_code", (q) =>
              q.eq("sportCode", "gaa_football").eq("code", skillCode)
            )
            .first();

          if (!existingSkill) {
            errors.push({
              skill: skill.name,
              error: `Skill not found with code: ${skillCode}`,
            });
            continue;
          }

          // Check if already has descriptors
          if (
            existingSkill.level1Descriptor &&
            existingSkill.level5Descriptor
          ) {
            skipped++;
            continue;
          }

          // Update skill with level descriptors
          await ctx.db.patch(existingSkill._id, {
            level1Descriptor: skill.level1Descriptor,
            level2Descriptor: skill.level2Descriptor,
            level3Descriptor: skill.level3Descriptor,
            level4Descriptor: skill.level4Descriptor,
            level5Descriptor: skill.level5Descriptor,
          });

          updated++;

          if (updated % 5 === 0) {
            console.log(`Progress: ${updated} skills updated...`);
          }
        } catch (error) {
          errors.push({
            skill: skill.name,
            error: String(error),
          });
        }
      }
    }

    console.log("\nImport complete!");
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already have descriptors): ${skipped}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log(
        "\nError details:",
        JSON.stringify(errors.slice(0, 5), null, 2)
      );
      if (errors.length > 5) {
        console.log(`... and ${errors.length - 5} more errors`);
      }
    }

    return { updated, skipped, errors };
  },
});
