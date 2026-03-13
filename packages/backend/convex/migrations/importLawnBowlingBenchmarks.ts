/**
 * Import Lawn Bowling benchmarks from JSON file
 * Run with: npx convex run migrations/importLawnBowlingBenchmarks:run --prod
 */

import benchmarksData from "../../scripts/lawn-bowling-benchmarks-IMPORT.json";
import { internalMutation } from "../_generated/server";

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    let created = 0;
    let skipped = 0;
    const errors: Array<{ benchmark: string; error: string }> = [];
    const now = Date.now();

    console.log(
      `Starting import of ${benchmarksData.benchmarks.length} Lawn Bowling benchmarks...`
    );

    for (const benchmark of benchmarksData.benchmarks) {
      try {
        // Check if benchmark already exists
        const existing = await ctx.db
          .query("skillBenchmarks")
          .withIndex("by_context", (q) =>
            q
              .eq("sportCode", benchmark.sportCode)
              .eq("skillCode", benchmark.skillCode)
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
          skipped += 1;
          continue;
        }

        // Insert benchmark
        await ctx.db.insert("skillBenchmarks", {
          sportCode: benchmark.sportCode,
          skillCode: benchmark.skillCode,
          ageGroup: benchmark.ageGroup,
          gender: benchmark.gender as "male" | "female" | "all",
          level: benchmark.level as "recreational" | "competitive" | "elite",
          expectedRating: benchmark.expectedRating,
          minAcceptable: benchmark.minAcceptable,
          developingThreshold: benchmark.developingThreshold,
          excellentThreshold: benchmark.excellentThreshold,
          source: benchmarksData.source,
          sourceDocument: benchmarksData.sourceDocument,
          sourceUrl: benchmarksData.sourceUrl,
          sourceYear: benchmarksData.sourceYear,
          notes: benchmark.notes || undefined,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });

        created += 1;

        // Progress logging every 20 benchmarks
        if (created % 20 === 0) {
          console.log(`Progress: ${created} benchmarks created...`);
        }
      } catch (error) {
        errors.push({
          benchmark: `${benchmark.skillCode} - ${benchmark.ageGroup} ${benchmark.level}`,
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
