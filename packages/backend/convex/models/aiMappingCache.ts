/**
 * AI Mapping Cache - Stores Claude API column mapping suggestions
 * 30-day TTL to balance cost savings with data freshness
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Get a cached mapping by column pattern and sample values
 */
export const getCachedMapping = query({
  args: {
    columnPattern: v.string(),
    sampleValues: v.array(v.string()),
  },
  returns: v.union(
    v.object({
      _id: v.id("aiMappingCache"),
      columnPattern: v.string(),
      sampleValues: v.array(v.string()),
      suggestedField: v.string(),
      confidence: v.number(),
      reasoning: v.string(),
      createdAt: v.number(),
      expiresAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Look up by column pattern first (indexed)
    const results = await ctx.db
      .query("aiMappingCache")
      .withIndex("by_columnPattern", (q) =>
        q.eq("columnPattern", args.columnPattern)
      )
      .collect();

    // Filter by sample values (array comparison)
    // We compare the first 3 sample values
    for (const result of results) {
      const resultSamples = result.sampleValues.slice(0, 3).join("|");
      const argSamples = args.sampleValues.slice(0, 3).join("|");

      if (resultSamples === argSamples) {
        return result;
      }
    }

    return null;
  },
});

/**
 * Store a new cached mapping
 */
export const storeCachedMapping = mutation({
  args: {
    columnPattern: v.string(),
    sampleValues: v.array(v.string()),
    suggestedField: v.string(),
    confidence: v.number(),
    reasoning: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  returns: v.id("aiMappingCache"),
  handler: async (ctx, args) => {
    // Check if entry already exists (avoid duplicates)
    const existing = await getCachedMapping(ctx, {
      columnPattern: args.columnPattern,
      sampleValues: args.sampleValues,
    });

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        suggestedField: args.suggestedField,
        confidence: args.confidence,
        reasoning: args.reasoning,
        createdAt: args.createdAt,
        expiresAt: args.expiresAt,
      });
      return existing._id;
    }

    // Create new entry
    const id = await ctx.db.insert("aiMappingCache", {
      columnPattern: args.columnPattern,
      sampleValues: args.sampleValues,
      suggestedField: args.suggestedField,
      confidence: args.confidence,
      reasoning: args.reasoning,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
    });

    return id;
  },
});

/**
 * Delete expired cache entries (called by cron job)
 */
export const cleanupExpiredCache = mutation({
  args: {},
  returns: v.number(), // Number of entries deleted
  handler: async (ctx) => {
    const now = Date.now();

    // Find expired entries
    const expired = await ctx.db
      .query("aiMappingCache")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    // Delete expired entries
    for (const entry of expired) {
      await ctx.db.delete(entry._id);
    }

    return expired.length;
  },
});
