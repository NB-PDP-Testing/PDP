/**
 * Import Rugby level descriptors (update existing skills)
 * Run with: npx convex run migrations/importRugbyLevelDescriptors:run --prod
 */

import descriptorsData from "../../scripts/rugby-level-descriptors-UPDATE.json";
import { internalMutation } from "../_generated/server";

// Mapping from skill names in JSON to skill codes in database
const SKILL_NAME_TO_CODE: Record<string, string> = {
  "Pass Accuracy (Left)": "pass_accuracy_left",
  "Pass Accuracy (Right)": "pass_accuracy_right",
  "Pass Under Pressure": "pass_under_pressure",
  "Offload in Contact": "offload_in_contact",
  "Draw and Pass": "draw_and_pass",
  "Spiral / Long Pass": "spiral_long_pass",
  "Ball Security": "ball_security",
  "High Ball Catching": "high_ball_catching",
  "Chest / Body Catch": "chest_body_catch",
  "Low Ball Pickup": "low_ball_pickup",
  "Catching Under Pressure": "catching_under_pressure",
  "Hands Ready Position": "hands_ready_position",
  "Watch Ball Into Hands": "watch_ball_into_hands",
  "Running With Ball": "running_with_ball",
  "Evasion (Side Step)": "evasion_side_step",
  "Evasion (Swerve)": "evasion_swerve",
  "Dummy Pass": "dummy_pass",
  "Acceleration Into Space": "acceleration_into_space",
  "Ball Carry Into Contact": "ball_carry_into_contact",
  "Body Position / Balance": "body_position_balance",
  "Punt Kick (Left)": "punt_kick_left",
  "Punt Kick (Right)": "punt_kick_right",
  "Grubber Kick": "grubber_kick",
  "Drop Kick": "drop_kick",
  "Place Kicking": "place_kicking",
  "Kicking Distance": "kicking_distance",
  "Kick Accuracy": "kick_accuracy",
  "Tackle Technique": "tackle_technique",
  "Tackle Completion": "tackle_completion",
  "Rip / Tag Technique": "rip_tag_technique",
  "Body Position in Contact": "body_position_in_contact",
  "Leg Drive Through Contact": "leg_drive_through_contact",
  "Ball Presentation": "ball_presentation",
  "Ruck Entry / Cleanout": "ruck_entry_cleanout",
  "Jackaling / Turnovers": "jackaling_turnovers",
  "Decision Making": "decision_making",
  "Reading Defense": "reading_defense",
  "Positional Understanding": "positional_understanding",
  "Support Play (Attack)": "support_play_attack",
  "Support Play (Defense)": "support_play_defense",
  "Communication on Field": "communication_on_field",
  "Spatial Awareness": "spatial_awareness",
  "Game Sense / Instinct": "game_sense_instinct",
  "Following Game Plan": "following_game_plan",
};

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    let updated = 0;
    let skipped = 0;
    const errors = [];

    console.log("Starting Rugby level descriptors import...");

    // Get the sport
    const sport = descriptorsData.sports[0];
    if (sport.sportCode !== "rugby") {
      return {
        updated: 0,
        skipped: 0,
        errors: ["Sport code mismatch - expected rugby"],
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
              q.eq("sportCode", "rugby").eq("code", skillCode)
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
