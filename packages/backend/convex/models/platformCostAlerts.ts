/**
 * Platform Cost Alerts (Phase 6.1)
 * Monitors org budgets and creates alerts when thresholds are exceeded
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Check all org budgets and create alerts when thresholds exceeded (US-006)
 *
 * USAGE: Called by cron job every 10 minutes
 *
 * For each enabled org budget:
 * - Check if daily spend >= alertThresholdPercent (default 80%)
 * - Check if daily spend >= 100%
 * - Check if monthly spend >= alertThresholdPercent
 * - Check if monthly spend >= 100%
 *
 * Creates platformCostAlerts records for violations
 * Deduplicates: won't create alert if same type/severity already exists in last 60 minutes
 */
export const checkCostAlerts = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const ONE_HOUR_MS = 60 * 60 * 1000;

    // Query all enabled budgets
    const budgets = await ctx.db
      .query("orgCostBudgets")
      .filter((q) => q.eq(q.field("isEnabled"), true))
      .collect();

    let alertsCreated = 0;

    for (const budget of budgets) {
      // Calculate daily percent used
      const dailyPercentUsed =
        (budget.currentDailySpend / budget.dailyBudgetUsd) * 100;

      // Check daily threshold (warning at alertThresholdPercent, default 80%)
      if (
        dailyPercentUsed >= budget.alertThresholdPercent &&
        dailyPercentUsed < 100
      ) {
        // Check if we already alerted recently (within 60 minutes)
        const recentAlert = await ctx.db
          .query("platformCostAlerts")
          .withIndex("by_org", (q) =>
            q.eq("organizationId", budget.organizationId)
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("alertType"), "org_daily_threshold"),
              q.eq(q.field("severity"), "warning"),
              q.gt(q.field("timestamp"), now - ONE_HOUR_MS)
            )
          )
          .first();

        if (!recentAlert) {
          // Create warning alert
          await ctx.db.insert("platformCostAlerts", {
            alertType: "org_daily_threshold",
            organizationId: budget.organizationId,
            severity: "warning",
            message: `Organization ${budget.organizationId} has used ${dailyPercentUsed.toFixed(1)}% of daily budget ($${budget.currentDailySpend.toFixed(2)} / $${budget.dailyBudgetUsd})`,
            triggerValue: budget.currentDailySpend,
            thresholdValue:
              budget.dailyBudgetUsd * (budget.alertThresholdPercent / 100),
            timestamp: now,
            acknowledged: false,
          });
          alertsCreated += 1;
        }
      }

      // Check daily exceeded (critical at 100%)
      if (dailyPercentUsed >= 100) {
        const recentAlert = await ctx.db
          .query("platformCostAlerts")
          .withIndex("by_org", (q) =>
            q.eq("organizationId", budget.organizationId)
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("alertType"), "org_daily_exceeded"),
              q.eq(q.field("severity"), "critical"),
              q.gt(q.field("timestamp"), now - ONE_HOUR_MS)
            )
          )
          .first();

        if (!recentAlert) {
          await ctx.db.insert("platformCostAlerts", {
            alertType: "org_daily_exceeded",
            organizationId: budget.organizationId,
            severity: "critical",
            message: `Organization ${budget.organizationId} has EXCEEDED daily budget ($${budget.currentDailySpend.toFixed(2)} / $${budget.dailyBudgetUsd})`,
            triggerValue: budget.currentDailySpend,
            thresholdValue: budget.dailyBudgetUsd,
            timestamp: now,
            acknowledged: false,
          });
          alertsCreated += 1;
        }
      }

      // Calculate monthly percent used
      const monthlyPercentUsed =
        (budget.currentMonthlySpend / budget.monthlyBudgetUsd) * 100;

      // Check monthly threshold (warning)
      if (
        monthlyPercentUsed >= budget.alertThresholdPercent &&
        monthlyPercentUsed < 100
      ) {
        const recentAlert = await ctx.db
          .query("platformCostAlerts")
          .withIndex("by_org", (q) =>
            q.eq("organizationId", budget.organizationId)
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("alertType"), "org_monthly_threshold"),
              q.eq(q.field("severity"), "warning"),
              q.gt(q.field("timestamp"), now - ONE_HOUR_MS)
            )
          )
          .first();

        if (!recentAlert) {
          await ctx.db.insert("platformCostAlerts", {
            alertType: "org_monthly_threshold",
            organizationId: budget.organizationId,
            severity: "warning",
            message: `Organization ${budget.organizationId} has used ${monthlyPercentUsed.toFixed(1)}% of monthly budget ($${budget.currentMonthlySpend.toFixed(2)} / $${budget.monthlyBudgetUsd})`,
            triggerValue: budget.currentMonthlySpend,
            thresholdValue:
              budget.monthlyBudgetUsd * (budget.alertThresholdPercent / 100),
            timestamp: now,
            acknowledged: false,
          });
          alertsCreated += 1;
        }
      }

      // Check monthly exceeded (critical)
      if (monthlyPercentUsed >= 100) {
        const recentAlert = await ctx.db
          .query("platformCostAlerts")
          .withIndex("by_org", (q) =>
            q.eq("organizationId", budget.organizationId)
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("alertType"), "org_monthly_exceeded"),
              q.eq(q.field("severity"), "critical"),
              q.gt(q.field("timestamp"), now - ONE_HOUR_MS)
            )
          )
          .first();

        if (!recentAlert) {
          await ctx.db.insert("platformCostAlerts", {
            alertType: "org_monthly_exceeded",
            organizationId: budget.organizationId,
            severity: "critical",
            message: `Organization ${budget.organizationId} has EXCEEDED monthly budget ($${budget.currentMonthlySpend.toFixed(2)} / $${budget.monthlyBudgetUsd})`,
            triggerValue: budget.currentMonthlySpend,
            thresholdValue: budget.monthlyBudgetUsd,
            timestamp: now,
            acknowledged: false,
          });
          alertsCreated += 1;
        }
      }
    }

    if (alertsCreated > 0) {
      console.log(`⚠️ Created ${alertsCreated} cost alerts`);
    }

    return null;
  },
});
