/**
 * Import Rugby benchmarks from JSON file
 * Run with: npx convex run migrations/importRugbyBenchmarks:run --prod
 */

import benchmarksData from "../../scripts/rugby-benchmarks-IMPORT.json";
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
    let created = 0;
    let skipped = 0;
    const errors = [];
    const now = Date.now();

    console.log(
      `Starting import of ${benchmarksData.benchmarks.length} Rugby benchmarks...`
    );

    for (const benchmark of benchmarksData.benchmarks) {
      try {
        // Map skill name to code
        const skillCode = SKILL_NAME_TO_CODE[benchmark.skillName];
        if (!skillCode) {
          errors.push({
            benchmark: `${benchmark.skillName} - ${benchmark.ageGroup} ${benchmark.level}`,
            error: `Unknown skill name: ${benchmark.skillName}`,
          });
          continue;
        }

        // Check if benchmark already exists
        const existing = await ctx.db
          .query("skillBenchmarks")
          .withIndex("by_context", (q) =>
            q
              .eq("sportCode", benchmark.sportCode)
              .eq("skillCode", skillCode)
              .eq("ageGroup", benchmark.ageGroup)
              .eq("gender", benchmark.gender)
              .eq("level", benchmark.level)
          )
          .first();

        if (existing?.isActive) {
          skipped++;
          continue;
        }

        // Insert benchmark
        await ctx.db.insert("skillBenchmarks", {
          sportCode: benchmark.sportCode,
          skillCode,
          ageGroup: benchmark.ageGroup,
          gender: benchmark.gender as "male" | "female" | "all",
          level: benchmark.level as "recreational" | "competitive" | "elite",
          expectedRating: benchmark.expectedRating,
          minAcceptable: benchmark.minAcceptable,
          developingThreshold: benchmark.developingThreshold,
          excellentThreshold: benchmark.excellentThreshold,
          source: "Rugby Research",
          sourceDocument: "Rugby Skill Standards Research 2026",
          sourceYear: 2026,
          notes: benchmark.notes || undefined,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });

        created++;

        // Progress logging every 50 benchmarks
        if (created % 50 === 0) {
          console.log(`Progress: ${created} benchmarks created...`);
        }
      } catch (error) {
        errors.push({
          benchmark: `${benchmark.skillName} - ${benchmark.ageGroup} ${benchmark.level}`,
          error: String(error),
        });
      }
    }

    console.log("\nImport complete!");
    console.log(`Created: ${created}`);
    console.log(`Skipped (already exist): ${skipped}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log(
        "\nError details:",
        JSON.stringify(errors.slice(0, 10), null, 2)
      );
      if (errors.length > 10) {
        console.log(`... and ${errors.length - 10} more errors`);
      }
    }

    return { created, skipped, errors };
  },
});
