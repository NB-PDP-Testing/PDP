/**
 * AI Mapping Analytics - Track usage, costs, and performance
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Track AI mapping usage for analytics
 */
export const trackAIMappingUsage = mutation({
  args: {
    columnName: v.string(),
    cached: v.boolean(),
    confidence: v.number(),
    accepted: v.boolean(), // true if user accepted, false if rejected
    correctedTo: v.optional(v.string()), // If rejected, what field user manually selected
  },
  returns: v.id("aiMappingAnalytics"),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("aiMappingAnalytics", {
      timestamp: Date.now(),
      columnName: args.columnName,
      cached: args.cached,
      confidence: args.confidence,
      accepted: args.accepted,
      correctedTo: args.correctedTo,
    });
    return id;
  },
});

/**
 * Get AI mapping stats for a date range
 */
export const getAIMappingStats = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    totalMappings: v.number(),
    cacheHitRate: v.number(),
    avgConfidence: v.number(),
    acceptanceRate: v.number(),
    topCorrectedMappings: v.array(
      v.object({
        columnName: v.string(),
        rejectionCount: v.number(),
        commonCorrection: v.union(v.string(), v.null()),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const analytics = await ctx.db
      .query("aiMappingAnalytics")
      .withIndex("by_timestamp")
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), args.startDate),
          q.lte(q.field("timestamp"), args.endDate)
        )
      )
      .collect();

    if (analytics.length === 0) {
      return {
        totalMappings: 0,
        cacheHitRate: 0,
        avgConfidence: 0,
        acceptanceRate: 0,
        topCorrectedMappings: [],
      };
    }

    const totalMappings = analytics.length;
    const cachedMappings = analytics.filter((a) => a.cached).length;
    const cacheHitRate = (cachedMappings / totalMappings) * 100;

    const totalConfidence = analytics.reduce((sum, a) => sum + a.confidence, 0);
    const avgConfidence = totalConfidence / totalMappings;

    const acceptedMappings = analytics.filter((a) => a.accepted).length;
    const acceptanceRate = (acceptedMappings / totalMappings) * 100;

    // Find top corrected mappings (most rejected)
    const rejectionsByColumn = new Map<
      string,
      { count: number; corrections: string[] }
    >();
    for (const a of analytics) {
      if (!a.accepted && a.correctedTo) {
        const existing = rejectionsByColumn.get(a.columnName) || {
          count: 0,
          corrections: [],
        };
        existing.count += 1;
        existing.corrections.push(a.correctedTo);
        rejectionsByColumn.set(a.columnName, existing);
      }
    }

    const topCorrectedMappings = Array.from(rejectionsByColumn.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([columnName, data]) => {
        // Find most common correction
        const correctionCounts = new Map<string, number>();
        for (const correction of data.corrections) {
          correctionCounts.set(
            correction,
            (correctionCounts.get(correction) || 0) + 1
          );
        }
        const commonCorrection =
          Array.from(correctionCounts.entries()).sort(
            ([, a], [, b]) => b - a
          )[0]?.[0] || null;

        return {
          columnName,
          rejectionCount: data.count,
          commonCorrection,
        };
      });

    return {
      totalMappings,
      cacheHitRate,
      avgConfidence,
      acceptanceRate,
      topCorrectedMappings,
    };
  },
});

/**
 * Estimate AI costs based on usage
 */
export const getAICostEstimate = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    totalMappings: v.number(),
    cachedMappings: v.number(),
    uncachedMappings: v.number(),
    estimatedCost: v.number(),
    savings: v.number(),
  }),
  handler: async (ctx, args) => {
    const analytics = await ctx.db
      .query("aiMappingAnalytics")
      .withIndex("by_timestamp")
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), args.startDate),
          q.lte(q.field("timestamp"), args.endDate)
        )
      )
      .collect();

    const totalMappings = analytics.length;
    const cachedMappings = analytics.filter((a) => a.cached).length;
    const uncachedMappings = totalMappings - cachedMappings;

    // Claude 3.5 Sonnet pricing: ~$0.003 per request
    const COST_PER_REQUEST = 0.003;
    const estimatedCost = uncachedMappings * COST_PER_REQUEST;
    const savings = cachedMappings * COST_PER_REQUEST;

    return {
      totalMappings,
      cachedMappings,
      uncachedMappings,
      estimatedCost,
      savings,
    };
  },
});
