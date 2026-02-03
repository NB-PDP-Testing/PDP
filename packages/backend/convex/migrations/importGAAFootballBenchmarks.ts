/**
 * Import GAA Football benchmarks from JSON file
 * Run with: npx convex run migrations/importGAAFootballBenchmarks:run --prod
 */

import benchmarksData from "../../scripts/gaa-football-benchmarks-IMPORT.json";
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
    let created = 0;
    let skipped = 0;
    const errors = [];
    const now = Date.now();

    console.log(
      `Starting import of ${benchmarksData.benchmarks.length} GAA Football benchmarks...`
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
          source: "GAA Research",
          sourceDocument: "GAA Skill Standards Research 2026",
          sourceYear: 2026,
          notes: benchmark.notes || undefined,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });

        created++;

        // Progress logging
        if (created % 25 === 0) {
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
      console.log("\nError details:", JSON.stringify(errors, null, 2));
    }

    return { created, skipped, errors };
  },
});
