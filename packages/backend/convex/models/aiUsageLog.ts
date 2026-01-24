/**
 * AI Usage Logging (Phase 5.3 - Cost Optimization)
 *
 * Tracks every AI API call for:
 * - Cost visibility and analytics
 * - Chargeback to organizations
 * - Identifying heavy users
 * - Cache effectiveness monitoring
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Log AI API usage with token counts and costs
 * Called by actions after successful AI API calls
 *
 * IMPORTANT: This is an internal mutation - only callable from actions
 * Error handling: If logging fails, the action should log to console but not fail
 */
export const logUsage = internalMutation({
  args: {
    timestamp: v.number(),
    organizationId: v.id("organization"),
    coachId: v.string(),
    playerId: v.optional(v.id("orgPlayerEnrollments")),
    operation: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    cachedTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),
    cacheHitRate: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    logId: v.optional(v.id("aiUsageLog")),
  }),
  handler: async (ctx, args) => {
    try {
      const logId = await ctx.db.insert("aiUsageLog", {
        timestamp: args.timestamp,
        organizationId: args.organizationId,
        coachId: args.coachId,
        playerId: args.playerId,
        operation: args.operation,
        model: args.model,
        inputTokens: args.inputTokens,
        cachedTokens: args.cachedTokens,
        outputTokens: args.outputTokens,
        cost: args.cost,
        cacheHitRate: args.cacheHitRate,
      });

      return {
        success: true,
        logId,
      };
    } catch (error) {
      console.error("❌ Failed to log AI usage:", error);
      return {
        success: false,
      };
    }
  },
});
