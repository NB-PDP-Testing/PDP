/**
 * Import Irish Dancing benchmarks from JSON file
 * Run with: npx convex run migrations/importIrishDancingBenchmarks:run --prod
 */

import benchmarksData from "../../scripts/irish-dancing-benchmarks-IMPORT.json";
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
    let created = 0;
    let skipped = 0;
    const errors = [];
    const now = Date.now();

    console.log(
      `Starting import of ${benchmarksData.benchmarks.length} Irish Dancing benchmarks...`
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
              .eq("gender", benchmark.gender as "all" | "male" | "female")
              .eq(
                "level",
                benchmark.level as
                  | "development"
                  | "recreational"
                  | "competitive"
                  | "elite"
              )
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
          source: "Irish Dancing Research",
          sourceDocument: "Irish Dancing Skill Standards Research 2026",
          sourceYear: 2026,
          notes: benchmark.notes || undefined,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });

        created++;

        // Progress logging every 100 benchmarks
        if (created % 100 === 0) {
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
