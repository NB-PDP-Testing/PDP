/**
 * Import Strength & Conditioning Benchmarks
 *
 * Run with: npx convex run migrations/importBenchmarksCLI:run
 */

import benchmarksData from "../../scripts/strength-conditioning-benchmarks-IMPORT.json";
import { internalMutation } from "../_generated/server";

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Use the existing bulkImportBenchmarks logic
    const now = Date.now();
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    console.log("Starting benchmark import...");
    console.log(`Source: ${benchmarksData.source}`);
    console.log(
      `Total benchmarks to import: ${benchmarksData.benchmarks.length}`
    );

    for (const benchmark of benchmarksData.benchmarks) {
      try {
        // Check if exists
        const existing = await ctx.db
          .query("skillBenchmarks")
          .withIndex("by_context", (q) =>
            q
              .eq("sportCode", benchmark.sportCode)
              .eq("skillCode", benchmark.skillCode)
              .eq("ageGroup", benchmark.ageGroup)
              .eq("gender", benchmark.gender as "male" | "female" | "all")
              .eq(
                "level",
                benchmark.level as
                  | "recreational"
                  | "competitive"
                  | "development"
                  | "elite"
              )
          )
          .first();

        if (existing?.isActive) {
          skipped++;
          continue;
        }

        await ctx.db.insert("skillBenchmarks", {
          sportCode: benchmark.sportCode,
          skillCode: benchmark.skillCode,
          ageGroup: benchmark.ageGroup,
          gender: benchmark.gender as "male" | "female" | "all",
          level: benchmark.level as
            | "recreational"
            | "competitive"
            | "development"
            | "elite",
          expectedRating: benchmark.expectedRating,
          minAcceptable: benchmark.minAcceptable,
          developingThreshold: benchmark.developingThreshold,
          excellentThreshold: benchmark.excellentThreshold,
          percentile25: benchmark.percentile25,
          percentile50: benchmark.percentile50,
          percentile75: benchmark.percentile75,
          percentile90: benchmark.percentile90,
          source: benchmarksData.source,
          sourceDocument: benchmarksData.sourceDocument,
          sourceYear: benchmarksData.sourceYear,
          notes: benchmark.notes,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        created++;

        // Log progress every 20 benchmarks
        if (created % 20 === 0) {
          console.log(`Progress: ${created} created, ${skipped} skipped`);
        }
      } catch (error) {
        const errorMsg = `${benchmark.sportCode}/${benchmark.skillCode}/${benchmark.ageGroup}/${benchmark.gender}/${benchmark.level}: ${error instanceof Error ? error.message : "Unknown error"}`;
        errors.push(errorMsg);
        console.error(`Error: ${errorMsg}`);
      }
    }

    console.log("\n=== Import Complete ===");
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log("\nError details:");
      errors.forEach((err) => console.log(`  - ${err}`));
    }

    return { created, skipped, errors };
  },
});
