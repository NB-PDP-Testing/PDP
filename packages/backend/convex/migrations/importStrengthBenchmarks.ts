import { internalMutation } from "../_generated/server";

export const importStrengthBenchmarks = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Import the benchmark data
    const benchmarksData = {
      source: "Hyrox/GAA Standards",
      sourceDocument: "Hyrox & GAA Fitness Benchmark System v1.0",
      sourceYear: 2026,
      benchmarks: [
        // Aerobic Capacity benchmarks
        {
          sportCode: "strength&conditioning",
          skillCode: "aerobic_capacity",
          ageGroup: "u14",
          gender: "male",
          level: "recreational",
          expectedRating: 2.5,
          minAcceptable: 1.5,
          developingThreshold: 2.0,
          excellentThreshold: 3.5,
          notes: "U14 male recreational - building aerobic base",
        },
        {
          sportCode: "strength&conditioning",
          skillCode: "aerobic_capacity",
          ageGroup: "u14",
          gender: "male",
          level: "competitive",
          expectedRating: 3.0,
          minAcceptable: 2.0,
          developingThreshold: 2.5,
          excellentThreshold: 4.0,
          notes: "U14 male competitive - club development standard",
        },
        {
          sportCode: "strength&conditioning",
          skillCode: "aerobic_capacity",
          ageGroup: "u14",
          gender: "female",
          level: "recreational",
          expectedRating: 2.5,
          minAcceptable: 1.5,
          developingThreshold: 2.0,
          excellentThreshold: 3.5,
          notes: "U14 female recreational - building aerobic base",
        },
        {
          sportCode: "strength&conditioning",
          skillCode: "aerobic_capacity",
          ageGroup: "u14",
          gender: "female",
          level: "competitive",
          expectedRating: 3.0,
          minAcceptable: 2.0,
          developingThreshold: 2.5,
          excellentThreshold: 4.0,
          notes: "U14 female competitive - club development standard",
        },
        // Add more benchmarks here - this is just a starter
        // See the full JSON file for all 150+ benchmarks
      ],
    };

    // Call the bulk import function
    let imported = 0;
    const errors: Array<{ benchmark: string; error: string }> = [];

    for (const benchmark of benchmarksData.benchmarks) {
      try {
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
          source: benchmarksData.source,
          sourceDocument: benchmarksData.sourceDocument,
          sourceYear: benchmarksData.sourceYear,
          notes: benchmark.notes,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        imported++;
      } catch (error) {
        errors.push({
          benchmark: `${benchmark.skillCode}-${benchmark.ageGroup}-${benchmark.gender}-${benchmark.level}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: errors.length === 0,
      imported,
      errors,
    };
  },
});
