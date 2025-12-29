import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("all")
);

const levelValidator = v.union(
  v.literal("recreational"),
  v.literal("competitive"),
  v.literal("development"),
  v.literal("elite")
);

// Benchmark validator for return types
const benchmarkValidator = v.object({
  _id: v.id("skillBenchmarks"),
  _creationTime: v.number(),
  sportCode: v.string(),
  skillCode: v.string(),
  ageGroup: v.string(),
  gender: genderValidator,
  level: levelValidator,
  expectedRating: v.number(),
  minAcceptable: v.number(),
  developingThreshold: v.number(),
  excellentThreshold: v.number(),
  percentile25: v.optional(v.number()),
  percentile50: v.optional(v.number()),
  percentile75: v.optional(v.number()),
  percentile90: v.optional(v.number()),
  source: v.string(),
  sourceDocument: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  sourceYear: v.number(),
  validFrom: v.optional(v.string()),
  validTo: v.optional(v.string()),
  notes: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get benchmark by ID
 */
export const getBenchmarkById = query({
  args: { benchmarkId: v.id("skillBenchmarks") },
  returns: v.union(benchmarkValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.benchmarkId),
});

/**
 * Get all benchmarks for a sport
 */
export const getBenchmarksForSport = query({
  args: {
    sportCode: v.string(),
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.array(benchmarkValidator),
  handler: async (ctx, args) => {
    const benchmarks = await ctx.db
      .query("skillBenchmarks")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", args.sportCode))
      .collect();

    if (args.activeOnly !== false) {
      return benchmarks.filter((b) => b.isActive);
    }

    return benchmarks;
  },
});

/**
 * Get benchmarks for a specific skill
 */
export const getBenchmarksForSkill = query({
  args: {
    sportCode: v.string(),
    skillCode: v.string(),
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.array(benchmarkValidator),
  handler: async (ctx, args) => {
    const benchmarks = await ctx.db
      .query("skillBenchmarks")
      .withIndex("by_skill", (q) =>
        q.eq("sportCode", args.sportCode).eq("skillCode", args.skillCode)
      )
      .collect();

    if (args.activeOnly !== false) {
      return benchmarks.filter((b) => b.isActive);
    }

    return benchmarks;
  },
});

/**
 * Get benchmark for specific context (age, gender, level)
 */
export const getBenchmarkForContext = query({
  args: {
    sportCode: v.string(),
    skillCode: v.string(),
    ageGroup: v.string(),
    gender: genderValidator,
    level: levelValidator,
  },
  returns: v.union(benchmarkValidator, v.null()),
  handler: async (ctx, args) => {
    // Try exact match first
    let benchmark = await ctx.db
      .query("skillBenchmarks")
      .withIndex("by_context", (q) =>
        q
          .eq("sportCode", args.sportCode)
          .eq("skillCode", args.skillCode)
          .eq("ageGroup", args.ageGroup)
          .eq("gender", args.gender)
          .eq("level", args.level)
      )
      .first();

    if (benchmark && benchmark.isActive) {
      return benchmark;
    }

    // Try with gender = "all" as fallback
    if (args.gender !== "all") {
      benchmark = await ctx.db
        .query("skillBenchmarks")
        .withIndex("by_context", (q) =>
          q
            .eq("sportCode", args.sportCode)
            .eq("skillCode", args.skillCode)
            .eq("ageGroup", args.ageGroup)
            .eq("gender", "all")
            .eq("level", args.level)
        )
        .first();

      if (benchmark && benchmark.isActive) {
        return benchmark;
      }
    }

    return null;
  },
});

/**
 * Get all benchmarks for a context (all skills)
 */
export const getBenchmarksForAgeGroup = query({
  args: {
    sportCode: v.string(),
    ageGroup: v.string(),
    gender: v.optional(genderValidator),
    level: v.optional(levelValidator),
  },
  returns: v.array(benchmarkValidator),
  handler: async (ctx, args) => {
    let benchmarks = await ctx.db
      .query("skillBenchmarks")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", args.sportCode))
      .collect();

    // Filter by age group
    benchmarks = benchmarks.filter(
      (b) => b.ageGroup === args.ageGroup && b.isActive
    );

    // Filter by gender if provided
    if (args.gender) {
      benchmarks = benchmarks.filter(
        (b) => b.gender === args.gender || b.gender === "all"
      );
    }

    // Filter by level if provided
    if (args.level) {
      benchmarks = benchmarks.filter((b) => b.level === args.level);
    }

    return benchmarks;
  },
});

/**
 * Get benchmarks by source
 */
export const getBenchmarksBySource = query({
  args: {
    source: v.string(),
    sourceYear: v.optional(v.number()),
  },
  returns: v.array(benchmarkValidator),
  handler: async (ctx, args) => {
    if (args.sourceYear) {
      return await ctx.db
        .query("skillBenchmarks")
        .withIndex("by_source", (q) =>
          q.eq("source", args.source).eq("sourceYear", args.sourceYear!)
        )
        .collect();
    }

    return await ctx.db
      .query("skillBenchmarks")
      .withIndex("by_source", (q) => q.eq("source", args.source))
      .collect();
  },
});

/**
 * Compare rating to benchmark
 */
export const compareRatingToBenchmark = query({
  args: {
    sportCode: v.string(),
    skillCode: v.string(),
    ageGroup: v.string(),
    gender: genderValidator,
    level: levelValidator,
    rating: v.number(),
  },
  returns: v.union(
    v.object({
      benchmark: benchmarkValidator,
      rating: v.number(),
      delta: v.number(),
      status: v.union(
        v.literal("below"),
        v.literal("developing"),
        v.literal("on_track"),
        v.literal("exceeding"),
        v.literal("exceptional")
      ),
      percentileEstimate: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Get the benchmark
    let benchmark = await ctx.db
      .query("skillBenchmarks")
      .withIndex("by_context", (q) =>
        q
          .eq("sportCode", args.sportCode)
          .eq("skillCode", args.skillCode)
          .eq("ageGroup", args.ageGroup)
          .eq("gender", args.gender)
          .eq("level", args.level)
      )
      .first();

    // Fallback to gender = "all"
    if (!(benchmark && benchmark.isActive)) {
      benchmark = await ctx.db
        .query("skillBenchmarks")
        .withIndex("by_context", (q) =>
          q
            .eq("sportCode", args.sportCode)
            .eq("skillCode", args.skillCode)
            .eq("ageGroup", args.ageGroup)
            .eq("gender", "all")
            .eq("level", args.level)
        )
        .first();
    }

    if (!(benchmark && benchmark.isActive)) {
      return null;
    }

    const delta = args.rating - benchmark.expectedRating;

    // Determine status
    let status:
      | "below"
      | "developing"
      | "on_track"
      | "exceeding"
      | "exceptional";
    if (args.rating < benchmark.minAcceptable) {
      status = "below";
    } else if (args.rating < benchmark.developingThreshold) {
      status = "developing";
    } else if (args.rating < benchmark.excellentThreshold) {
      status = "on_track";
    } else if (args.rating < 5) {
      status = "exceeding";
    } else {
      status = "exceptional";
    }

    // Estimate percentile if data available
    let percentileEstimate: number | undefined;
    if (
      benchmark.percentile25 &&
      benchmark.percentile50 &&
      benchmark.percentile75
    ) {
      if (args.rating <= benchmark.percentile25) {
        percentileEstimate = 25 * (args.rating / benchmark.percentile25);
      } else if (args.rating <= benchmark.percentile50) {
        percentileEstimate =
          25 +
          25 *
            ((args.rating - benchmark.percentile25) /
              (benchmark.percentile50 - benchmark.percentile25));
      } else if (args.rating <= benchmark.percentile75) {
        percentileEstimate =
          50 +
          25 *
            ((args.rating - benchmark.percentile50) /
              (benchmark.percentile75 - benchmark.percentile50));
      } else if (
        benchmark.percentile90 &&
        args.rating <= benchmark.percentile90
      ) {
        percentileEstimate =
          75 +
          15 *
            ((args.rating - benchmark.percentile75) /
              (benchmark.percentile90 - benchmark.percentile75));
      } else {
        percentileEstimate =
          90 +
          10 *
            ((args.rating -
              (benchmark.percentile90 || benchmark.percentile75)) /
              (5 - (benchmark.percentile90 || benchmark.percentile75)));
      }
      percentileEstimate = Math.min(
        99,
        Math.max(1, Math.round(percentileEstimate))
      );
    }

    return {
      benchmark,
      rating: args.rating,
      delta,
      status,
      percentileEstimate,
    };
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Create a skill benchmark
 */
export const createBenchmark = mutation({
  args: {
    sportCode: v.string(),
    skillCode: v.string(),
    ageGroup: v.string(),
    gender: genderValidator,
    level: levelValidator,
    expectedRating: v.number(),
    minAcceptable: v.number(),
    developingThreshold: v.number(),
    excellentThreshold: v.number(),
    percentile25: v.optional(v.number()),
    percentile50: v.optional(v.number()),
    percentile75: v.optional(v.number()),
    percentile90: v.optional(v.number()),
    source: v.string(),
    sourceDocument: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    sourceYear: v.number(),
    validFrom: v.optional(v.string()),
    validTo: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("skillBenchmarks"),
  handler: async (ctx, args) => {
    // Check if benchmark already exists for this context
    const existing = await ctx.db
      .query("skillBenchmarks")
      .withIndex("by_context", (q) =>
        q
          .eq("sportCode", args.sportCode)
          .eq("skillCode", args.skillCode)
          .eq("ageGroup", args.ageGroup)
          .eq("gender", args.gender)
          .eq("level", args.level)
      )
      .first();

    if (existing && existing.isActive) {
      throw new Error("Active benchmark already exists for this context");
    }

    // Validate thresholds
    if (args.minAcceptable > args.developingThreshold) {
      throw new Error("minAcceptable must be <= developingThreshold");
    }
    if (args.developingThreshold > args.excellentThreshold) {
      throw new Error("developingThreshold must be <= excellentThreshold");
    }

    const now = Date.now();

    return await ctx.db.insert("skillBenchmarks", {
      sportCode: args.sportCode,
      skillCode: args.skillCode,
      ageGroup: args.ageGroup,
      gender: args.gender,
      level: args.level,
      expectedRating: args.expectedRating,
      minAcceptable: args.minAcceptable,
      developingThreshold: args.developingThreshold,
      excellentThreshold: args.excellentThreshold,
      percentile25: args.percentile25,
      percentile50: args.percentile50,
      percentile75: args.percentile75,
      percentile90: args.percentile90,
      source: args.source,
      sourceDocument: args.sourceDocument,
      sourceUrl: args.sourceUrl,
      sourceYear: args.sourceYear,
      validFrom: args.validFrom,
      validTo: args.validTo,
      notes: args.notes,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update benchmark values
 */
export const updateBenchmark = mutation({
  args: {
    benchmarkId: v.id("skillBenchmarks"),
    expectedRating: v.optional(v.number()),
    minAcceptable: v.optional(v.number()),
    developingThreshold: v.optional(v.number()),
    excellentThreshold: v.optional(v.number()),
    percentile25: v.optional(v.number()),
    percentile50: v.optional(v.number()),
    percentile75: v.optional(v.number()),
    percentile90: v.optional(v.number()),
    notes: v.optional(v.string()),
    validTo: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.benchmarkId);
    if (!existing) {
      throw new Error("Benchmark not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.expectedRating !== undefined) {
      updates.expectedRating = args.expectedRating;
    }
    if (args.minAcceptable !== undefined) {
      updates.minAcceptable = args.minAcceptable;
    }
    if (args.developingThreshold !== undefined) {
      updates.developingThreshold = args.developingThreshold;
    }
    if (args.excellentThreshold !== undefined) {
      updates.excellentThreshold = args.excellentThreshold;
    }
    if (args.percentile25 !== undefined) {
      updates.percentile25 = args.percentile25;
    }
    if (args.percentile50 !== undefined) {
      updates.percentile50 = args.percentile50;
    }
    if (args.percentile75 !== undefined) {
      updates.percentile75 = args.percentile75;
    }
    if (args.percentile90 !== undefined) {
      updates.percentile90 = args.percentile90;
    }
    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }
    if (args.validTo !== undefined) {
      updates.validTo = args.validTo;
    }

    await ctx.db.patch(args.benchmarkId, updates);
    return null;
  },
});

/**
 * Deactivate a benchmark
 */
export const deactivateBenchmark = mutation({
  args: { benchmarkId: v.id("skillBenchmarks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.benchmarkId);
    if (!existing) {
      throw new Error("Benchmark not found");
    }

    await ctx.db.patch(args.benchmarkId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Bulk import benchmarks
 */
export const bulkImportBenchmarks = mutation({
  args: {
    source: v.string(),
    sourceDocument: v.optional(v.string()),
    sourceYear: v.number(),
    benchmarks: v.array(
      v.object({
        sportCode: v.string(),
        skillCode: v.string(),
        ageGroup: v.string(),
        gender: genderValidator,
        level: levelValidator,
        expectedRating: v.number(),
        minAcceptable: v.number(),
        developingThreshold: v.number(),
        excellentThreshold: v.number(),
        percentile25: v.optional(v.number()),
        percentile50: v.optional(v.number()),
        percentile75: v.optional(v.number()),
        percentile90: v.optional(v.number()),
        notes: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({
    created: v.number(),
    skipped: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const benchmark of args.benchmarks) {
      try {
        // Check if exists
        const existing = await ctx.db
          .query("skillBenchmarks")
          .withIndex("by_context", (q) =>
            q
              .eq("sportCode", benchmark.sportCode)
              .eq("skillCode", benchmark.skillCode)
              .eq("ageGroup", benchmark.ageGroup)
              .eq("gender", benchmark.gender)
              .eq("level", benchmark.level)
          )
          .first();

        if (existing && existing.isActive) {
          skipped++;
          continue;
        }

        await ctx.db.insert("skillBenchmarks", {
          ...benchmark,
          source: args.source,
          sourceDocument: args.sourceDocument,
          sourceYear: args.sourceYear,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      } catch (error) {
        errors.push(
          `${benchmark.sportCode}/${benchmark.skillCode}/${benchmark.ageGroup}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return { created, skipped, errors };
  },
});

/**
 * Delete a benchmark (hard delete)
 */
export const deleteBenchmark = mutation({
  args: { benchmarkId: v.id("skillBenchmarks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.benchmarkId);
    if (!existing) {
      throw new Error("Benchmark not found");
    }

    await ctx.db.delete(args.benchmarkId);
    return null;
  },
});
