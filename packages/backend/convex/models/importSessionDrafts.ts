import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { authComponent } from "../auth";

// ============================================================
// IMPORT SESSION DRAFTS
// ============================================================
// Save & resume for the import wizard. Stores wizard state
// (step, mappings, selections, settings) so users can pick up
// where they left off — even from a different device.
//
// Raw CSV data is NOT stored (too large). On resume the user
// re-uploads the file; mappings and selections are restored.
// ============================================================

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const playerSelectionValidator = v.object({
  rowIndex: v.number(),
  selected: v.boolean(),
  reason: v.optional(v.string()),
});

const benchmarkSettingsValidator = v.object({
  applyBenchmarks: v.boolean(),
  strategy: v.string(),
  customTemplateId: v.optional(v.id("benchmarkTemplates")),
  passportStatuses: v.array(v.string()),
});

const draftReturnValidator = v.object({
  _id: v.id("importSessionDrafts"),
  _creationTime: v.number(),
  userId: v.string(),
  organizationId: v.string(),
  step: v.number(),
  parsedHeaders: v.optional(v.array(v.string())),
  parsedRowCount: v.optional(v.number()),
  mappings: v.optional(v.record(v.string(), v.string())),
  playerSelections: v.optional(v.array(playerSelectionValidator)),
  benchmarkSettings: v.optional(benchmarkSettingsValidator),
  templateId: v.optional(v.id("importTemplates")),
  sourceFileName: v.optional(v.string()),
  expiresAt: v.number(),
  lastSavedAt: v.number(),
});

/**
 * Save (upsert) a draft — deletes any existing draft for this
 * user + org, then inserts a new one.
 */
export const saveDraft = mutation({
  args: {
    organizationId: v.string(),
    step: v.number(),
    parsedHeaders: v.optional(v.array(v.string())),
    parsedRowCount: v.optional(v.number()),
    mappings: v.optional(v.record(v.string(), v.string())),
    playerSelections: v.optional(v.array(playerSelectionValidator)),
    benchmarkSettings: v.optional(benchmarkSettingsValidator),
    templateId: v.optional(v.id("importTemplates")),
    sourceFileName: v.optional(v.string()),
  },
  returns: v.id("importSessionDrafts"),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }
    const userId = user._id;

    // Delete any existing draft for this user + org
    const existing = await ctx.db
      .query("importSessionDrafts")
      .withIndex("by_userId_and_orgId", (q) =>
        q.eq("userId", userId).eq("organizationId", args.organizationId)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    const now = Date.now();
    const id = await ctx.db.insert("importSessionDrafts", {
      userId,
      organizationId: args.organizationId,
      step: args.step,
      parsedHeaders: args.parsedHeaders,
      parsedRowCount: args.parsedRowCount,
      mappings: args.mappings,
      playerSelections: args.playerSelections,
      benchmarkSettings: args.benchmarkSettings,
      templateId: args.templateId,
      sourceFileName: args.sourceFileName,
      expiresAt: now + SEVEN_DAYS_MS,
      lastSavedAt: now,
    });
    return id;
  },
});

/**
 * Load the most recent non-expired draft for a user + org.
 * This is a QUERY (read-only) — not a mutation.
 */
export const loadDraft = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.union(draftReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return null;
    }

    const draft = await ctx.db
      .query("importSessionDrafts")
      .withIndex("by_userId_and_orgId", (q) =>
        q.eq("userId", user._id).eq("organizationId", args.organizationId)
      )
      .first();

    if (!draft) {
      return null;
    }

    // Skip expired drafts
    if (draft.expiresAt < Date.now()) {
      return null;
    }

    return draft;
  },
});

/**
 * Delete a draft by ID. Requires auth.
 */
export const deleteDraft = mutation({
  args: {
    draftId: v.id("importSessionDrafts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const draft = await ctx.db.get(args.draftId);
    if (draft && draft.userId === user._id) {
      await ctx.db.delete(args.draftId);
    }

    return null;
  },
});

/**
 * List expired drafts (internal — used by the cron cleanup job).
 * Returns up to 100 expired drafts at a time.
 */
export const listExpiredDrafts = internalQuery({
  args: {},
  returns: v.array(v.id("importSessionDrafts")),
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("importSessionDrafts")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .take(100);
    return expired.map((d) => d._id);
  },
});

/**
 * Delete expired drafts in batch (internal — called by cron).
 */
export const cleanupExpiredDrafts = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("importSessionDrafts")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .take(100);
    for (const draft of expired) {
      await ctx.db.delete(draft._id);
    }
    return null;
  },
});
