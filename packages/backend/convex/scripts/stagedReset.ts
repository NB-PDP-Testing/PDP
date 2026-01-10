import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";

/**
 * STAGED RESET: Breaks the full reset into smaller stages to avoid timeouts.
 * Run stages sequentially:
 * 
 * npx convex run scripts/stagedReset:stage1AppData '{"confirm": true}'
 * npx convex run scripts/stagedReset:stage2ReferenceData '{"confirm": true}'
 * npx convex run scripts/stagedReset:stage3BetterAuthBatch '{"model": "session", "confirm": true}'
 * npx convex run scripts/stagedReset:stage3BetterAuthBatch '{"model": "account", "confirm": true}'
 * npx convex run scripts/stagedReset:stage3BetterAuthBatch '{"model": "member", "confirm": true}'
 * npx convex run scripts/stagedReset:stage3BetterAuthBatch '{"model": "invitation", "confirm": true}'
 * npx convex run scripts/stagedReset:stage3BetterAuthBatch '{"model": "team", "confirm": true}'
 * npx convex run scripts/stagedReset:stage3BetterAuthBatch '{"model": "teamMember", "confirm": true}'
 * npx convex run scripts/stagedReset:stage3BetterAuthBatch '{"model": "organization", "confirm": true}'
 * npx convex run scripts/stagedReset:stage3BetterAuthBatch '{"model": "verification", "confirm": true}'
 * npx convex run scripts/stagedReset:stage3BetterAuthBatch '{"model": "user", "confirm": true}'
 */

const BATCH_SIZE = 100;

/**
 * Stage 1: Delete application data (voice notes, assessments, players, etc.)
 */
export const stage1AppData = mutation({
  args: {
    confirm: v.boolean(),
  },
  returns: v.object({
    deleted: v.record(v.string(), v.number()),
  }),
  handler: async (ctx, args) => {
    if (!args.confirm) {
      throw new Error("Set confirm: true to proceed");
    }

    console.log("🔄 Stage 1: Deleting application data...");
    const deleted: Record<string, number> = {};

    // Voice notes (with storage cleanup)
    const voiceNotes = await ctx.db.query("voiceNotes").collect();
    deleted.voiceNotes = 0;
    for (const record of voiceNotes) {
      if (record.audioStorageId) {
        try {
          await ctx.storage.delete(record.audioStorageId);
        } catch (e) { /* ignore */ }
      }
      await ctx.db.delete(record._id);
      deleted.voiceNotes++;
    }

    // Delete other application tables
    const tables = [
      "skillAssessments",
      "passportGoals",
      "playerInjuries",
      "medicalProfiles",
      "teamPlayerIdentities",
      "sportPassports",
      "orgPlayerEnrollments",
      "guardianPlayerLinks",
      "playerIdentities",
      "guardianIdentities",
      "coachAssignments",
      "orgJoinRequests",
    ] as const;

    for (const tableName of tables) {
      const records = await ctx.db.query(tableName).collect();
      deleted[tableName] = 0;
      for (const record of records) {
        await ctx.db.delete(record._id);
        deleted[tableName]++;
      }
    }

    console.log("✅ Stage 1 complete:", deleted);
    return { deleted };
  },
});

/**
 * Stage 2: Delete reference data (sports, skills, etc.)
 */
export const stage2ReferenceData = mutation({
  args: {
    confirm: v.boolean(),
  },
  returns: v.object({
    deleted: v.record(v.string(), v.number()),
  }),
  handler: async (ctx, args) => {
    if (!args.confirm) {
      throw new Error("Set confirm: true to proceed");
    }

    console.log("🔄 Stage 2: Deleting reference data...");
    const deleted: Record<string, number> = {};

    const tables = [
      "skillBenchmarks",
      "skillDefinitions",
      "skillCategories",
      "sports",
    ] as const;

    for (const tableName of tables) {
      const records = await ctx.db.query(tableName).collect();
      deleted[tableName] = 0;
      for (const record of records) {
        await ctx.db.delete(record._id);
        deleted[tableName]++;
      }
    }

    console.log("✅ Stage 2 complete:", deleted);
    return { deleted };
  },
});

/**
 * Stage 3: Delete Better Auth tables ONE TABLE AT A TIME with batching
 * Call this multiple times with different models
 */
export const stage3BetterAuthBatch = mutation({
  args: {
    model: v.union(
      v.literal("session"),
      v.literal("account"),
      v.literal("member"),
      v.literal("invitation"),
      v.literal("team"),
      v.literal("teamMember"),
      v.literal("organization"),
      v.literal("verification"),
      v.literal("user")
    ),
    confirm: v.boolean(),
  },
  returns: v.object({
    deleted: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    if (!args.confirm) {
      throw new Error("Set confirm: true to proceed");
    }

    console.log(`🔄 Stage 3: Deleting ${args.model} records...`);

    // Get records
    const result = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: args.model,
        paginationOpts: { cursor: null, numItems: BATCH_SIZE },
        where: [],
      }
    );

    const records = result?.page || [];
    let deleted = 0;

    // Delete each record
    for (const record of records) {
      try {
        await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
          input: {
            model: args.model,
            where: [{ field: "_id", value: record._id as string, operator: "eq" }],
          },
        });
        deleted++;
      } catch (e) {
        console.log(`Failed to delete ${args.model} record:`, e);
      }
    }

    const hasMore = records.length === BATCH_SIZE;
    console.log(`✅ Deleted ${deleted} ${args.model} records. Has more: ${hasMore}`);

    return { deleted, hasMore };
  },
});

/**
 * Check current record counts
 */
export const checkCounts = query({
  args: {},
  returns: v.record(v.string(), v.number()),
  handler: async (ctx) => {
    const counts: Record<string, number> = {};

    // Better Auth tables
    const betterAuthModels = [
      "session",
      "account",
      "member",
      "invitation",
      "team",
      "teamMember",
      "organization",
      "verification",
      "user",
    ] as const;

    for (const model of betterAuthModels) {
      const result = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model,
          paginationOpts: { cursor: null, numItems: 1 },
          where: [],
        }
      );
      // We can't get exact count easily, so just check if any exist
      counts[model] = result?.page?.length || 0;
    }

    return counts;
  },
});
