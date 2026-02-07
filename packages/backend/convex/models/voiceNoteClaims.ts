/**
 * Voice Note Claims - v2 Pipeline
 *
 * Atomic claims extracted from transcripts, one per entity mention.
 * 15 topic categories with best-effort entity resolution.
 *
 * 5 internal functions (pipeline use) + 1 public query (claims viewer).
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery, query } from "../_generated/server";

// ── Shared validators (reused in args + returns) ──────────────

const topicValidator = v.union(
  v.literal("injury"),
  v.literal("skill_rating"),
  v.literal("skill_progress"),
  v.literal("behavior"),
  v.literal("performance"),
  v.literal("attendance"),
  v.literal("wellbeing"),
  v.literal("recovery"),
  v.literal("development_milestone"),
  v.literal("physical_development"),
  v.literal("parent_communication"),
  v.literal("tactical"),
  v.literal("team_culture"),
  v.literal("todo"),
  v.literal("session_plan")
);

const statusValidator = v.union(
  v.literal("extracted"),
  v.literal("resolving"),
  v.literal("resolved"),
  v.literal("needs_disambiguation"),
  v.literal("merged"),
  v.literal("discarded"),
  v.literal("failed")
);

const severityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical")
);

const sentimentValidator = v.union(
  v.literal("positive"),
  v.literal("neutral"),
  v.literal("negative"),
  v.literal("concerned")
);

const entityMentionValidator = v.object({
  mentionType: v.union(
    v.literal("player_name"),
    v.literal("team_name"),
    v.literal("group_reference"),
    v.literal("coach_name")
  ),
  rawText: v.string(),
  position: v.number(),
});

const claimObjectValidator = v.object({
  _id: v.id("voiceNoteClaims"),
  _creationTime: v.number(),
  claimId: v.string(),
  artifactId: v.id("voiceNoteArtifacts"),
  sourceText: v.string(),
  timestampStart: v.optional(v.number()),
  timestampEnd: v.optional(v.number()),
  topic: topicValidator,
  title: v.string(),
  description: v.string(),
  recommendedAction: v.optional(v.string()),
  timeReference: v.optional(v.string()),
  entityMentions: v.array(entityMentionValidator),
  resolvedPlayerIdentityId: v.optional(v.id("playerIdentities")),
  resolvedPlayerName: v.optional(v.string()),
  resolvedTeamId: v.optional(v.string()),
  resolvedTeamName: v.optional(v.string()),
  resolvedAssigneeUserId: v.optional(v.string()),
  resolvedAssigneeName: v.optional(v.string()),
  severity: v.optional(severityValidator),
  sentiment: v.optional(sentimentValidator),
  skillName: v.optional(v.string()),
  skillRating: v.optional(v.number()),
  extractionConfidence: v.number(),
  organizationId: v.string(),
  coachUserId: v.string(),
  status: statusValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

// ── 1. storeClaims (internalMutation) ─────────────────────────

export const storeClaims = internalMutation({
  args: {
    claims: v.array(
      v.object({
        claimId: v.string(),
        artifactId: v.id("voiceNoteArtifacts"),
        sourceText: v.string(),
        timestampStart: v.optional(v.number()),
        timestampEnd: v.optional(v.number()),
        topic: topicValidator,
        title: v.string(),
        description: v.string(),
        recommendedAction: v.optional(v.string()),
        timeReference: v.optional(v.string()),
        entityMentions: v.array(entityMentionValidator),
        resolvedPlayerIdentityId: v.optional(v.id("playerIdentities")),
        resolvedPlayerName: v.optional(v.string()),
        resolvedTeamId: v.optional(v.string()),
        resolvedTeamName: v.optional(v.string()),
        resolvedAssigneeUserId: v.optional(v.string()),
        resolvedAssigneeName: v.optional(v.string()),
        severity: v.optional(severityValidator),
        sentiment: v.optional(sentimentValidator),
        skillName: v.optional(v.string()),
        skillRating: v.optional(v.number()),
        extractionConfidence: v.number(),
        organizationId: v.string(),
        coachUserId: v.string(),
        status: statusValidator,
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
  },
  returns: v.array(v.id("voiceNoteClaims")),
  handler: async (ctx, args) => {
    const ids: Id<"voiceNoteClaims">[] = [];
    for (const claim of args.claims) {
      const id = await ctx.db.insert("voiceNoteClaims", claim);
      ids.push(id);
    }
    return ids;
  },
});

// ── 2. getClaimsByArtifact (internalQuery) ────────────────────

export const getClaimsByArtifact = internalQuery({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.array(claimObjectValidator),
  handler: async (ctx, args) =>
    await ctx.db
      .query("voiceNoteClaims")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .collect(),
});

// ── 3. getClaimsByArtifactAndStatus (internalQuery) ───────────

export const getClaimsByArtifactAndStatus = internalQuery({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
    status: statusValidator,
  },
  returns: v.array(claimObjectValidator),
  handler: async (ctx, args) =>
    await ctx.db
      .query("voiceNoteClaims")
      .withIndex("by_artifactId_and_status", (q) =>
        q.eq("artifactId", args.artifactId).eq("status", args.status)
      )
      .collect(),
});

// ── 4. updateClaimStatus (internalMutation) ───────────────────

export const updateClaimStatus = internalMutation({
  args: {
    claimId: v.string(),
    status: statusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claim = await ctx.db
      .query("voiceNoteClaims")
      .withIndex("by_claimId", (q) => q.eq("claimId", args.claimId))
      .first();

    if (!claim) {
      throw new Error(`Claim not found: ${args.claimId}`);
    }

    await ctx.db.patch(claim._id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ── 5. getClaimByClaimId (internalQuery) ──────────────────────

export const getClaimByClaimId = internalQuery({
  args: {
    claimId: v.string(),
  },
  returns: v.union(claimObjectValidator, v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("voiceNoteClaims")
      .withIndex("by_claimId", (q) => q.eq("claimId", args.claimId))
      .first(),
});

// ── 6. getClaimsByOrgAndCoach (PUBLIC query) ──────────────────

const MAX_CLAIMS_LIMIT = 200;
const DEFAULT_CLAIMS_LIMIT = 50;
const MAX_RECENT_CLAIMS = 500;
const DEFAULT_RECENT_CLAIMS = 100;

export const getClaimsByOrgAndCoach = query({
  args: {
    organizationId: v.string(),
    coachUserId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(claimObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    // Verify caller can only access their own claims
    if (args.coachUserId !== identity.subject) {
      return [];
    }
    const limit = Math.min(
      args.limit ?? DEFAULT_CLAIMS_LIMIT,
      MAX_CLAIMS_LIMIT
    );
    return await ctx.db
      .query("voiceNoteClaims")
      .withIndex("by_org_and_coach", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("coachUserId", args.coachUserId)
      )
      .order("desc")
      .take(limit);
  },
});

// ── 7. getRecentClaims (PUBLIC query — platform staff debug) ──

export const getRecentClaims = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(claimObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const limit = Math.min(
      args.limit ?? DEFAULT_RECENT_CLAIMS,
      MAX_RECENT_CLAIMS
    );
    // Fetch recent claims then filter to current user's only.
    // Platform staff debug: use an internal query if cross-org access is needed.
    const allRecent = await ctx.db
      .query("voiceNoteClaims")
      .order("desc")
      .take(MAX_RECENT_CLAIMS);
    return allRecent
      .filter((c) => c.coachUserId === identity.subject)
      .slice(0, limit);
  },
});
