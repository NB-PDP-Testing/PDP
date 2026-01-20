/**
 * Sports Model
 *
 * Platform-level sports management. These are the sports that organizations
 * can select when creating their org (e.g., GAA Football, Soccer, Swimming).
 */

import { v } from "convex/values";
import { internalQuery, mutation, query } from "../_generated/server";

/**
 * Get all sports
 *
 * Returns all active sports available on the platform.
 */
export const getAll = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("sports"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      governingBody: v.optional(v.string()),
      description: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const sports = await ctx.db
      .query("sports")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    return sports;
  },
});

/**
 * Get sport by code
 */
export const getByCode = query({
  args: {
    code: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("sports"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      governingBody: v.optional(v.string()),
      description: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const sport = await ctx.db
      .query("sports")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    return sport;
  },
});

/**
 * Create a new sport
 *
 * Platform staff only. Creates a new sport that orgs can use.
 */
export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    governingBody: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // TODO: Verify user is platform staff (will add in Phase 4 with auth context)

    // Check if sport code already exists
    const existing = await ctx.db
      .query("sports")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing) {
      throw new Error(`Sport with code "${args.code}" already exists`);
    }

    await ctx.db.insert("sports", {
      code: args.code,
      name: args.name,
      governingBody: args.governingBody,
      description: args.description,
      isActive: true,
      createdAt: Date.now(),
    });

    return args.code;
  },
});

/**
 * Update an existing sport
 *
 * Platform staff only. Updates sport details.
 */
export const update = mutation({
  args: {
    code: v.string(),
    name: v.optional(v.string()),
    governingBody: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // TODO: Verify user is platform staff (will add in Phase 4 with auth context)

    const sport = await ctx.db
      .query("sports")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!sport) {
      throw new Error(`Sport with code "${args.code}" not found`);
    }

    const updates: Record<string, string | undefined> = {};
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.governingBody !== undefined) {
      updates.governingBody = args.governingBody;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }

    await ctx.db.patch(sport._id, updates);

    return null;
  },
});

/**
 * Delete (soft delete) a sport
 *
 * Platform staff only. Marks a sport as inactive.
 */
export const remove = mutation({
  args: {
    code: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // TODO: Verify user is platform staff (will add in Phase 4 with auth context)

    const sport = await ctx.db
      .query("sports")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!sport) {
      throw new Error(`Sport with code "${args.code}" not found`);
    }

    // TODO: Check if any organizations are using this sport
    // May want to prevent deletion if in use, or cascade soft delete

    await ctx.db.patch(sport._id, {
      isActive: false,
    });

    return null;
  },
});

/**
 * Internal query to get sport by ID
 * Used by actions that cannot access ctx.db directly
 */
export const getById = internalQuery({
  args: { sportId: v.id("sports") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("sports"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      governingBody: v.optional(v.string()),
      description: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => await ctx.db.get(args.sportId),
});
