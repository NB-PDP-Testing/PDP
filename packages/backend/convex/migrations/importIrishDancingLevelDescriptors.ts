/**
 * Import Irish Dancing level descriptors (update existing skills)
 * Run with: npx convex run migrations/importIrishDancingLevelDescriptors:run --prod
 */

import descriptorsData from "../../scripts/irish-dancing-level-descriptors-UPDATE.json";
import { internalMutation } from "../_generated/server";

// Mapping from skill names in JSON to skill codes in database
const SKILL_NAME_TO_CODE: Record<string, string> = {
  "Upper Body Control": "upper_body_control",
  "Head Position": "head_position",
  "Arm Placement": "arm_placement",
  "Back Alignment": "back_alignment",
  "Shoulder Position": "shoulder_position",
  "Toe Point": "toe_point",
  Turnout: "turnout",
  "Elevation on Toes": "elevation_on_toes",
  "Weight Placement": "weight_placement",
  "Footwork Speed": "footwork_speed",
  "Precision & Clarity": "precision_clarity",
  "Crossing at Knees": "crossing_at_knees",
  "Lightness & Spring": "lightness_spring",
  "Jump Height": "jump_height",
  "Landing Control": "landing_control",
  "Rhythm & Timing": "rhythm_timing",
  Musicality: "musicality",
  "Flow & Continuity": "flow_continuity",
  "Stage Presence": "stage_presence",
  "Facial Expression": "facial_expression",
  "Performance Quality": "performance_quality",
  "Stamina & Endurance": "stamina_endurance",
  "Trebles/Toe Technique": "trebles_toe_technique",
  "Stamps & Heel Clicks": "stamps_heel_clicks",
  "Rhythmic Drumming": "rhythmic_drumming",
};

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    let updated = 0;
    let skipped = 0;
    const errors = [];

    console.log("Starting Irish Dancing level descriptors import...");

    // Get the sport
    const sport = descriptorsData.sports[0];
    if (sport.sportCode !== "irish_dancing") {
      return {
        updated: 0,
        skipped: 0,
        errors: ["Sport code mismatch - expected irish_dancing"],
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
              q.eq("sportCode", "irish_dancing").eq("code", skillCode)
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

          if (updated % 10 === 0) {
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
