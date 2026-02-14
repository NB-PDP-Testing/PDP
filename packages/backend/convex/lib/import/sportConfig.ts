/**
 * Sport Configuration Helper - Lookup sport-specific configurations
 * for the import system.
 *
 * Queries sportAgeGroupConfig and skillDefinitions tables
 * using indexes (never .filter()).
 */

import type { QueryCtx } from "../../_generated/server";

// ============================================================
// Types
// ============================================================

export type SportConfig = {
  sportCode: string;
  ageGroups: AgeGroupConfig[];
  skillCount: number;
};

export type AgeGroupConfig = {
  ageGroupCode: string;
  minAge?: number;
  maxAge?: number;
  description?: string;
  isActive: boolean;
};

export type SkillInfo = {
  code: string;
  name: string;
  sportCode: string;
  categoryId: string;
  sortOrder: number;
};

// ============================================================
// Query Functions
// ============================================================

/**
 * Get the full sport configuration including age groups and skill count.
 */
export async function getSportConfig(
  ctx: QueryCtx,
  sportCode: string
): Promise<SportConfig> {
  const ageGroups = await getAgeGroupsForSport(ctx, sportCode);
  const skills = await getSkillsForSport(ctx, sportCode);

  return {
    sportCode,
    ageGroups,
    skillCount: skills.length,
  };
}

/**
 * Get all age group configurations for a sport.
 */
export async function getAgeGroupsForSport(
  ctx: QueryCtx,
  sportCode: string
): Promise<AgeGroupConfig[]> {
  const configs = await ctx.db
    .query("sportAgeGroupConfig")
    .withIndex("by_sport", (q) => q.eq("sportCode", sportCode))
    .collect();

  return configs.map((c) => ({
    ageGroupCode: c.ageGroupCode,
    minAge: c.minAge,
    maxAge: c.maxAge,
    description: c.description,
    isActive: c.isActive,
  }));
}

/**
 * Get all active skills for a sport.
 */
export async function getSkillsForSport(
  ctx: QueryCtx,
  sportCode: string
): Promise<SkillInfo[]> {
  const skills = await ctx.db
    .query("skillDefinitions")
    .withIndex("by_sportCode", (q) => q.eq("sportCode", sportCode))
    .collect();

  const active: SkillInfo[] = [];
  for (const s of skills) {
    if (s.isActive) {
      active.push({
        code: s.code,
        name: s.name,
        sportCode: s.sportCode,
        categoryId: s.categoryId as string,
        sortOrder: s.sortOrder,
      });
    }
  }
  return active;
}

/**
 * Validate whether a given age falls within a sport's age group range.
 * Returns true if the age group exists and the age is within bounds.
 * Returns true if no min/max bounds are defined (open-ended group).
 */
export async function validateAgeForGroup(
  ctx: QueryCtx,
  sportCode: string,
  ageGroupCode: string,
  age: number
): Promise<boolean> {
  const configs = await ctx.db
    .query("sportAgeGroupConfig")
    .withIndex("by_sport_and_ageGroup", (q) =>
      q.eq("sportCode", sportCode).eq("ageGroupCode", ageGroupCode)
    )
    .collect();

  if (configs.length === 0) {
    return false;
  }

  const config = configs[0];
  if (!config.isActive) {
    return false;
  }

  // If no bounds defined, any age is valid for this group
  if (config.minAge === undefined && config.maxAge === undefined) {
    return true;
  }

  if (config.minAge !== undefined && age < config.minAge) {
    return false;
  }
  if (config.maxAge !== undefined && age > config.maxAge) {
    return false;
  }

  return true;
}
