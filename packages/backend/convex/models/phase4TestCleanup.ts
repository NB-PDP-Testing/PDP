// @ts-nocheck
/**
 * Phase 4 Test Data Cleanup Script
 *
 * Safely removes all test data created by phase4TestSeed.ts
 *
 * Identifies test data by:
 * - Connectors with "[TEST]" prefix in name
 * - Connectors with "test_" prefix in federationCode
 * - Associated sync history, webhook logs, and AI cache entries
 *
 * Safe to run multiple times (idempotent)
 *
 * Usage:
 * await ctx.runMutation(api.models.phase4TestCleanup.cleanupPhase4TestData)
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const cleanupPhase4TestData = mutation({
  args: {},
  returns: v.object({
    connectorsDeleted: v.number(),
    syncHistoryDeleted: v.number(),
    aiCacheDeleted: v.number(),
    webhookLogsDeleted: v.number(),
    templatesDeleted: v.number(),
    message: v.string(),
  }),
  handler: async (ctx) => {
    console.log("🧹 Starting Phase 4 test data cleanup...");

    let connectorsDeleted = 0;
    let syncHistoryDeleted = 0;
    let aiCacheDeleted = 0;
    let webhookLogsDeleted = 0;
    let templatesDeleted = 0;

    // Step 1: Find and delete test connectors
    const testConnectors = await ctx.db.query("federationConnectors").collect();

    for (const connector of testConnectors) {
      // Identify test connectors by name or federation code
      if (
        connector.name.startsWith("[TEST]") ||
        connector.federationCode.startsWith("test_")
      ) {
        // Delete sync history for this connector
        const syncHistory = await ctx.db
          .query("syncHistory")
          .withIndex("by_connectorId", (q) =>
            q.eq("connectorId", connector._id)
          )
          .collect();

        for (const sync of syncHistory) {
          await ctx.db.delete(sync._id);
          syncHistoryDeleted += 1;
        }

        // Delete webhook logs for this connector
        const webhookLogs = await ctx.db
          .query("webhookLogs")
          .withIndex("by_connectorId", (q) =>
            q.eq("connectorId", connector._id)
          )
          .collect();

        for (const log of webhookLogs) {
          await ctx.db.delete(log._id);
          webhookLogsDeleted += 1;
        }

        // Delete the connector itself
        await ctx.db.delete(connector._id);
        connectorsDeleted += 1;

        console.log(`  Deleted connector: ${connector.name}`);
      }
    }

    // Step 2: Delete test AI mapping cache entries
    const aiCache = await ctx.db.query("aiMappingCache").collect();

    for (const entry of aiCache) {
      // Delete expired entries or test-specific patterns
      if (
        entry.expiresAt < Date.now() ||
        entry.columnPattern.startsWith("expired_") ||
        entry.columnPattern.startsWith("test_")
      ) {
        await ctx.db.delete(entry._id);
        aiCacheDeleted += 1;
      }
    }

    // Step 3: Delete test import template
    const allTemplates = await ctx.db.query("importTemplates").collect();
    const testTemplates = allTemplates.filter(
      (t) => t.name === "[TEST] Phase 4 Template"
    );

    for (const template of testTemplates) {
      await ctx.db.delete(template._id);
      templatesDeleted += 1;
      console.log(`  Deleted template: ${template.name}`);
    }

    console.log("✅ Phase 4 test data cleanup complete!");
    console.log(`  Connectors deleted: ${connectorsDeleted}`);
    console.log(`  Sync history deleted: ${syncHistoryDeleted}`);
    console.log(`  AI cache deleted: ${aiCacheDeleted}`);
    console.log(`  Webhook logs deleted: ${webhookLogsDeleted}`);
    console.log(`  Templates deleted: ${templatesDeleted}`);

    return {
      connectorsDeleted,
      syncHistoryDeleted,
      aiCacheDeleted,
      webhookLogsDeleted,
      templatesDeleted,
      message: `Successfully deleted ${connectorsDeleted} connectors and all associated data`,
    };
  },
});
