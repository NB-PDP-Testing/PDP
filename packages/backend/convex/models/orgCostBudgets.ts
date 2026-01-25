/**
 * Organization Cost Budgets (Phase 6.1)
 * Per-org budget tracking and enforcement to prevent runaway AI costs
 */

import { v } from "convex/values";
import { query } from "../_generated/server";

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
export const checkOrgCostBudget = query({
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
