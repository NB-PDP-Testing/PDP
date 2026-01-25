/**
 * Sport Age Group Configuration
 *
 * Manages sport-specific age group rules and eligibility configuration.
 * Allows admins to customize age ranges and eligibility rules per sport.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Get age group configuration for a specific sport
 *
 * Returns all age group configs for the sport, showing custom min/max ages
 * if configured, otherwise inheriting from global age group defaults.
 */
export const getSportAgeGroupConfig = query({
  args: {
    sportCode: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("sportAgeGroupConfig"),
      _creationTime: v.number(),
      sportCode: v.string(),
      ageGroupCode: v.string(),
      minAge: v.optional(v.number()),
      maxAge: v.optional(v.number()),
      description: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query("sportAgeGroupConfig")
      .withIndex("by_sport", (q) => q.eq("sportCode", args.sportCode))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return configs;
  },
});

/**
 * Get eligibility rules for a specific sport
 *
 * Returns rules defining which age groups can play up/down in this sport.
 */
export const getSportEligibilityRules = query({
  args: {
    sportCode: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("sportAgeGroupEligibilityRules"),
      _creationTime: v.number(),
      sportCode: v.string(),
      fromAgeGroupCode: v.string(),
      toAgeGroupCode: v.string(),
      isAllowed: v.boolean(),
      requiresApproval: v.boolean(),
      description: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const rules = await ctx.db
      .query("sportAgeGroupEligibilityRules")
      .withIndex("by_sport", (q) => q.eq("sportCode", args.sportCode))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return rules;
  },
});

/**
 * Get a specific eligibility rule
 *
 * Used to check if a specific age group combination has a configured rule.
 */
export const getSportEligibilityRule = query({
  args: {
    sportCode: v.string(),
    fromAgeGroupCode: v.string(),
    toAgeGroupCode: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("sportAgeGroupEligibilityRules"),
      _creationTime: v.number(),
      sportCode: v.string(),
      fromAgeGroupCode: v.string(),
      toAgeGroupCode: v.string(),
      isAllowed: v.boolean(),
      requiresApproval: v.boolean(),
      description: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const rule = await ctx.db
      .query("sportAgeGroupEligibilityRules")
      .withIndex("by_sport_and_ages", (q) =>
        q
          .eq("sportCode", args.sportCode)
          .eq("fromAgeGroupCode", args.fromAgeGroupCode)
          .eq("toAgeGroupCode", args.toAgeGroupCode)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return rule;
  },
});

/**
 * Create or update sport age group configuration
 *
 * Admin only. Sets custom min/max ages for an age group within a specific sport.
 */
export const upsertSportAgeGroupConfig = mutation({
  args: {
    sportCode: v.string(),
    ageGroupCode: v.string(),
    minAge: v.optional(v.number()),
    maxAge: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  returns: v.id("sportAgeGroupConfig"),
  handler: async (ctx, args) => {
    // TODO: Verify user is admin (will add in Phase 4 with auth context)

    const now = Date.now();

    // Check if config already exists
    const existing = await ctx.db
      .query("sportAgeGroupConfig")
      .withIndex("by_sport_and_ageGroup", (q) =>
        q.eq("sportCode", args.sportCode).eq("ageGroupCode", args.ageGroupCode)
      )
      .first();

    if (existing) {
      // Update existing config
      await ctx.db.patch(existing._id, {
        minAge: args.minAge,
        maxAge: args.maxAge,
        description: args.description,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new config
    const configId = await ctx.db.insert("sportAgeGroupConfig", {
      sportCode: args.sportCode,
      ageGroupCode: args.ageGroupCode,
      minAge: args.minAge,
      maxAge: args.maxAge,
      description: args.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return configId;
  },
});

/**
 * Create or update sport eligibility rule
 *
 * Admin only. Defines whether players from one age group can join teams
 * in another age group for a specific sport.
 */
export const upsertSportEligibilityRule = mutation({
  args: {
    sportCode: v.string(),
    fromAgeGroupCode: v.string(),
    toAgeGroupCode: v.string(),
    isAllowed: v.boolean(),
    requiresApproval: v.boolean(),
    description: v.optional(v.string()),
  },
  returns: v.id("sportAgeGroupEligibilityRules"),
  handler: async (ctx, args) => {
    // TODO: Verify user is admin (will add in Phase 4 with auth context)

    const now = Date.now();

    // Check if rule already exists
    const existing = await ctx.db
      .query("sportAgeGroupEligibilityRules")
      .withIndex("by_sport_and_ages", (q) =>
        q
          .eq("sportCode", args.sportCode)
          .eq("fromAgeGroupCode", args.fromAgeGroupCode)
          .eq("toAgeGroupCode", args.toAgeGroupCode)
      )
      .first();

    if (existing) {
      // Update existing rule
      await ctx.db.patch(existing._id, {
        isAllowed: args.isAllowed,
        requiresApproval: args.requiresApproval,
        description: args.description,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new rule
    const ruleId = await ctx.db.insert("sportAgeGroupEligibilityRules", {
      sportCode: args.sportCode,
      fromAgeGroupCode: args.fromAgeGroupCode,
      toAgeGroupCode: args.toAgeGroupCode,
      isAllowed: args.isAllowed,
      requiresApproval: args.requiresApproval,
      description: args.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return ruleId;
  },
});

/**
 * Delete sport age group configuration
 *
 * Admin only. Soft deletes a custom age group config (reverts to defaults).
 */
export const deleteSportAgeGroupConfig = mutation({
  args: {
    configId: v.id("sportAgeGroupConfig"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // TODO: Verify user is admin (will add in Phase 4 with auth context)

    await ctx.db.patch(args.configId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Delete sport eligibility rule
 *
 * Admin only. Soft deletes an eligibility rule (reverts to default behavior).
 */
export const deleteSportEligibilityRule = mutation({
  args: {
    ruleId: v.id("sportAgeGroupEligibilityRules"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // TODO: Verify user is admin (will add in Phase 4 with auth context)

    await ctx.db.patch(args.ruleId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return null;
  },
});
