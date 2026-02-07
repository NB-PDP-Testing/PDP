/**
 * Coach Player Aliases - Phase 5, Enhancement E5
 *
 * Stores coach-specific name aliases for auto-resolution.
 * When a coach disambiguates "Shawn" → "Sean O'Brien",
 * subsequent voice notes auto-resolve "Shawn" via this alias.
 *
 * 2 internal functions (pipeline use) + 1 public query (future admin view).
 */

import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";

// ── Shared validators ────────────────────────────────────────

const aliasObjectValidator = v.object({
  _id: v.id("coachPlayerAliases"),
  _creationTime: v.number(),
  coachUserId: v.string(),
  organizationId: v.string(),
  rawText: v.string(),
  resolvedEntityId: v.string(),
  resolvedEntityName: v.string(),
  useCount: v.number(),
  lastUsedAt: v.number(),
  createdAt: v.number(),
});

// ── 1. lookupAlias (internalQuery) ───────────────────────────

export const lookupAlias = internalQuery({
  args: {
    coachUserId: v.string(),
    organizationId: v.string(),
    rawText: v.string(),
  },
  returns: v.union(aliasObjectValidator, v.null()),
  handler: async (ctx, args) => {
    const normalized = args.rawText.toLowerCase().trim();
    return await ctx.db
      .query("coachPlayerAliases")
      .withIndex("by_coach_org_rawText", (q) =>
        q
          .eq("coachUserId", args.coachUserId)
          .eq("organizationId", args.organizationId)
          .eq("rawText", normalized)
      )
      .first();
  },
});

// ── 2. storeAlias (internalMutation) ─────────────────────────

export const storeAlias = internalMutation({
  args: {
    coachUserId: v.string(),
    organizationId: v.string(),
    rawText: v.string(),
    resolvedEntityId: v.string(),
    resolvedEntityName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalized = args.rawText.toLowerCase().trim();
    const now = Date.now();

    const existing = await ctx.db
      .query("coachPlayerAliases")
      .withIndex("by_coach_org_rawText", (q) =>
        q
          .eq("coachUserId", args.coachUserId)
          .eq("organizationId", args.organizationId)
          .eq("rawText", normalized)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        resolvedEntityId: args.resolvedEntityId,
        resolvedEntityName: args.resolvedEntityName,
        useCount: existing.useCount + 1,
        lastUsedAt: now,
      });
    } else {
      await ctx.db.insert("coachPlayerAliases", {
        coachUserId: args.coachUserId,
        organizationId: args.organizationId,
        rawText: normalized,
        resolvedEntityId: args.resolvedEntityId,
        resolvedEntityName: args.resolvedEntityName,
        useCount: 1,
        lastUsedAt: now,
        createdAt: now,
      });
    }

    return null;
  },
});

// ── 3. getCoachAliases (PUBLIC query) ────────────────────────

export const getCoachAliases = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(aliasObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("coachPlayerAliases")
      .withIndex("by_coach_org", (q) =>
        q
          .eq("coachUserId", identity.subject)
          .eq("organizationId", args.organizationId)
      )
      .collect();
  },
});
