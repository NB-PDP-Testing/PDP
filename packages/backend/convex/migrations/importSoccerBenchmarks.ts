/**
 * Import Soccer benchmarks from JSON file
 * Run with: npx convex run migrations/importSoccerBenchmarks:run --prod
 */

import benchmarksData from "../../scripts/soccer-benchmarks-IMPORT.json";
import { internalMutation } from "../_generated/server";

// Mapping from skill names in JSON to skill codes in database
const SKILL_NAME_TO_CODE: Record<string, string> = {
  "Ball Control": "ball_control",
  "Ball Control Under Pressure": "ball_control_under_pressure",
  "Ball Protection": "ball_protection",
  Dribbling: "dribbling",
  "First Touch": "first_touch",
  Passing: "passing",
  "Passing Under Pressure": "passing_under_pressure",
  Crossing: "crossing",
  "Throw Ins": "throw_ins",
  "Shot Accuracy": "shot_accuracy",
  "Shot Power": "shot_power",
  "Finishing Ability": "finishing_ability",
  Heading: "heading",
  "Offensive Positioning": "offensive_positioning",
  "Defensive Positioning": "defensive_positioning",
  "Defensive Aggressiveness": "defensive_aggressiveness",
  "Transitional Play": "transitional_play",
  "Off Ball Movement": "off_ball_movement",
  Awareness: "awareness",
  "Decision Making": "decision_making",
  Speed: "speed",
  Agility: "agility",
  Strength: "strength",
  Endurance: "endurance",
  Communication: "communication",
  Coachability: "coachability",
  Leadership: "leadership",
  "Team Orientation": "team_orientation",
};

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    let created = 0;
    let skipped = 0;
    const errors = [];
    const now = Date.now();

    console.log(
      `Starting import of ${benchmarksData.benchmarks.length} Soccer benchmarks...`
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
          source: "Soccer Research",
          sourceDocument: "Soccer Skill Standards Research 2026",
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
