/**
 * Benchmark Applicator - Applies initial skill ratings to sport passports
 * during import based on one of 5 strategies.
 *
 * Strategies:
 * 1. blank - All skills set to rating 1
 * 2. middle - All skills set to rating 3
 * 3. age-appropriate - Query skillBenchmarks for sport+ageGroup
 * 4. ngb-benchmarks - Same as age-appropriate but filtered by NGB source
 * 5. custom - Query benchmarkTemplates by templateId
 */

import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

// ============================================================
// Types
// ============================================================

export type BenchmarkStrategy =
  | "blank"
  | "middle"
  | "age-appropriate"
  | "ngb-benchmarks"
  | "custom";

export type BenchmarkSettings = {
  strategy: BenchmarkStrategy;
  templateId?: Id<"benchmarkTemplates">;
  ageGroup: string;
  sportCode: string;
  importSessionId?: Id<"importSessions">;
};

export type BenchmarkResult = {
  benchmarksApplied: number;
};

// ============================================================
// Strategy Implementations
// ============================================================

async function getSkillsForSport(
  ctx: MutationCtx,
  sportCode: string
): Promise<Array<{ code: string; sportCode: string }>> {
  const skills = await ctx.db
    .query("skillDefinitions")
    .withIndex("by_sportCode", (q) => q.eq("sportCode", sportCode))
    .collect();

  return skills
    .filter((s) => s.isActive)
    .map((s) => ({ code: s.code, sportCode: s.sportCode }));
}

async function getAgeAppropriateBenchmarks(
  ctx: MutationCtx,
  sportCode: string,
  ageGroup: string
): Promise<Map<string, number>> {
  const benchmarks = await ctx.db
    .query("skillBenchmarks")
    .withIndex("by_sportCode", (q) => q.eq("sportCode", sportCode))
    .collect();

  const ratingMap = new Map<string, number>();
  const ageGroupLower = ageGroup.toLowerCase();

  for (const b of benchmarks) {
    if (b.ageGroup.toLowerCase() === ageGroupLower && b.isActive) {
      ratingMap.set(b.skillCode, b.expectedRating);
    }
  }

  return ratingMap;
}

async function getNgbBenchmarks(
  ctx: MutationCtx,
  sportCode: string,
  ageGroup: string
): Promise<Map<string, number>> {
  const benchmarks = await ctx.db
    .query("skillBenchmarks")
    .withIndex("by_sportCode", (q) => q.eq("sportCode", sportCode))
    .collect();

  const ratingMap = new Map<string, number>();
  const ageGroupLower = ageGroup.toLowerCase();
  // NGB sources: official governing body sources
  const ngbSources = new Set(["FAI", "IRFU", "GAA", "World Rugby", "FIFA"]);

  for (const b of benchmarks) {
    const isMatch =
      b.ageGroup.toLowerCase() === ageGroupLower &&
      b.isActive &&
      ngbSources.has(b.source);
    if (isMatch) {
      ratingMap.set(b.skillCode, b.expectedRating);
    }
  }

  return ratingMap;
}

async function getCustomBenchmarks(
  ctx: MutationCtx,
  templateId: Id<"benchmarkTemplates">,
  ageGroup: string
): Promise<Map<string, number>> {
  const template = await ctx.db.get(templateId);
  if (!template?.isActive) {
    return new Map();
  }

  const ratingMap = new Map<string, number>();
  const ageGroupLower = ageGroup.toLowerCase();

  for (const b of template.benchmarks) {
    if (b.ageGroup.toLowerCase() === ageGroupLower) {
      ratingMap.set(b.skillCode, b.expectedRating);
    }
  }

  return ratingMap;
}

// ============================================================
// Main Function
// ============================================================

/**
 * Apply benchmark ratings to a sport passport during import.
 *
 * Creates skillAssessment records with assessmentType 'import'
 * for each skill in the sport.
 */
export async function applyBenchmarksToPassport(
  ctx: MutationCtx,
  passportId: Id<"sportPassports">,
  settings: BenchmarkSettings
): Promise<BenchmarkResult> {
  const passport = await ctx.db.get(passportId);
  if (!passport) {
    return { benchmarksApplied: 0 };
  }

  // Get all skills for the sport
  const skills = await getSkillsForSport(ctx, settings.sportCode);
  if (skills.length === 0) {
    return { benchmarksApplied: 0 };
  }

  // Build rating map based on strategy
  const ratingMap = await buildRatingMap(ctx, settings);

  // Create skill assessment records
  const now = Date.now();
  const today = new Date().toISOString().split("T")[0];
  let count = 0;

  for (const skill of skills) {
    const rating =
      ratingMap.get(skill.code) ?? getDefaultRating(settings.strategy);

    await ctx.db.insert("skillAssessments", {
      passportId,
      playerIdentityId: passport.playerIdentityId,
      sportCode: settings.sportCode,
      skillCode: skill.code,
      organizationId: passport.organizationId,
      rating,
      assessmentDate: today,
      assessmentType: "import",
      assessorRole: "system",
      source: "manual",
      confidence: "medium",
      createdAt: now,
      importSessionId: settings.importSessionId,
    });

    count += 1;
  }

  return { benchmarksApplied: count };
}

async function buildRatingMap(
  ctx: MutationCtx,
  settings: BenchmarkSettings
): Promise<Map<string, number>> {
  switch (settings.strategy) {
    case "blank":
    case "middle":
      return new Map();

    case "age-appropriate":
      return await getAgeAppropriateBenchmarks(
        ctx,
        settings.sportCode,
        settings.ageGroup
      );

    case "ngb-benchmarks":
      return await getNgbBenchmarks(ctx, settings.sportCode, settings.ageGroup);

    case "custom":
      if (!settings.templateId) {
        return new Map();
      }
      return await getCustomBenchmarks(
        ctx,
        settings.templateId,
        settings.ageGroup
      );

    default:
      return new Map();
  }
}

function getDefaultRating(strategy: BenchmarkStrategy): number {
  if (strategy === "middle") {
    return 3;
  }
  return 1; // Default for blank and when no benchmark found
}
