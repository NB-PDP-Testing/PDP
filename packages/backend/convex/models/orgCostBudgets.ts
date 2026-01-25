/**
 * Organization Cost Budgets (Phase 6.1)
 * Per-org budget tracking and enforcement to prevent runaway AI costs
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Check if organization is within budget before making AI calls
 *
 * USAGE: Call this FIRST in processVoiceNoteInsight action before any AI calls
 *
 * Returns:
 * - withinBudget: true if org can make AI calls, false if budget exceeded
 * - reason: why budget check passed/failed
 * - dailyRemaining: USD remaining in daily budget (if within budget)
 * - monthlyRemaining: USD remaining in monthly budget (if within budget)
 */
export const checkOrgCostBudget = internalQuery({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    withinBudget: v.boolean(),
    reason: v.string(),
    dailyRemaining: v.optional(v.number()),
    monthlyRemaining: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const { organizationId } = args;

    // Fetch budget record via index
    const budget = await ctx.db
      .query("orgCostBudgets")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .first();

    // No budget set = unlimited (graceful default)
    if (!budget) {
      return {
        withinBudget: true,
        reason: "no_budget_set",
      };
    }

    // Budget disabled = unlimited
    if (!budget.isEnabled) {
      return {
        withinBudget: true,
        reason: "budget_disabled",
      };
    }

    // Check daily budget
    if (budget.currentDailySpend >= budget.dailyBudgetUsd) {
      return {
        withinBudget: false,
        reason: "daily_exceeded",
        dailyRemaining: 0,
        monthlyRemaining: Math.max(
          0,
          budget.monthlyBudgetUsd - budget.currentMonthlySpend
        ),
      };
    }

    // Check monthly budget
    if (budget.currentMonthlySpend >= budget.monthlyBudgetUsd) {
      return {
        withinBudget: false,
        reason: "monthly_exceeded",
        dailyRemaining: Math.max(
          0,
          budget.dailyBudgetUsd - budget.currentDailySpend
        ),
        monthlyRemaining: 0,
      };
    }

    // Within budget - return remaining amounts
    return {
      withinBudget: true,
      reason: "within_budget",
      dailyRemaining: budget.dailyBudgetUsd - budget.currentDailySpend,
      monthlyRemaining: budget.monthlyBudgetUsd - budget.currentMonthlySpend,
    };
  },
});

/**
 * Log budget exceeded event for analytics
 *
 * USAGE: Called from processVoiceNoteInsight when budget check fails
 *
 * This is NOT an alert - it's just analytics tracking.
 * Helps us understand how often budgets are hit.
 */
export const logBudgetExceededEvent = internalMutation({
  args: {
    organizationId: v.string(),
    reason: v.string(), // "daily_exceeded" or "monthly_exceeded"
  },
  returns: v.null(),
  handler: (_ctx, args) => {
    // For now, just log to console
    // In the future, we could track these events in a separate table
    console.log(
      `⚠️ Budget exceeded for org ${args.organizationId}: ${args.reason}`
    );

    // TODO: Could insert into a budgetExceededEvents table for analytics
    // For now, platform staff can see these in platformCostAlerts

    return null;
  },
});

/**
 * Reset daily spend counters at midnight UTC (US-005)
 *
 * USAGE: Called by cron job daily at 00:00 UTC
 *
 * Resets currentDailySpend to 0 for all orgs if lastResetDate !== today
 */
export const updateOrgDailySpend = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Get today's date in YYYY-MM-DD format (UTC)
    const today = new Date().toISOString().split("T")[0];

    // Query all budget records
    const budgets = await ctx.db.query("orgCostBudgets").collect();

    let resetCount = 0;
    for (const budget of budgets) {
      // Reset if lastResetDate is not today
      if (budget.lastResetDate !== today) {
        await ctx.db.patch(budget._id, {
          currentDailySpend: 0,
          lastResetDate: today,
        });
        resetCount += 1;
      }
    }

    console.log(
      `✅ Daily spend reset complete: ${resetCount} orgs reset on ${today}`
    );

    return null;
  },
});
