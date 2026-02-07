/**
 * Voice Note Entity Resolutions - Phase 5
 *
 * Detailed resolution records for entity mentions in claims.
 * Captures multiple candidates with match reasons for disambiguation.
 *
 * 4 internal functions (pipeline use) + 5 public functions (UI).
 * All public functions verify artifact ownership (senderUserId === identity.subject).
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

// ── Shared validators ────────────────────────────────────────

const mentionTypeValidator = v.union(
  v.literal("player_name"),
  v.literal("team_name"),
  v.literal("group_reference"),
  v.literal("coach_name")
);

const resolutionStatusValidator = v.union(
  v.literal("auto_resolved"),
  v.literal("needs_disambiguation"),
  v.literal("user_resolved"),
  v.literal("unresolved")
);

const candidateValidator = v.object({
  entityType: v.union(
    v.literal("player"),
    v.literal("team"),
    v.literal("coach")
  ),
  entityId: v.string(),
  entityName: v.string(),
  score: v.number(),
  matchReason: v.string(),
});

const resolutionObjectValidator = v.object({
  _id: v.id("voiceNoteEntityResolutions"),
  _creationTime: v.number(),
  claimId: v.id("voiceNoteClaims"),
  artifactId: v.id("voiceNoteArtifacts"),
  mentionIndex: v.number(),
  mentionType: mentionTypeValidator,
  rawText: v.string(),
  candidates: v.array(candidateValidator),
  status: resolutionStatusValidator,
  resolvedEntityId: v.optional(v.string()),
  resolvedEntityName: v.optional(v.string()),
  resolvedAt: v.optional(v.number()),
  organizationId: v.string(),
  createdAt: v.number(),
});

// ── Max limits ───────────────────────────────────────────────

const MAX_DISAMBIGUATION_LIMIT = 200;
const DEFAULT_DISAMBIGUATION_LIMIT = 50;

// ── 1. storeResolutions (internalMutation) ───────────────────

export const storeResolutions = internalMutation({
  args: {
    resolutions: v.array(
      v.object({
        claimId: v.id("voiceNoteClaims"),
        artifactId: v.id("voiceNoteArtifacts"),
        mentionIndex: v.number(),
        mentionType: mentionTypeValidator,
        rawText: v.string(),
        candidates: v.array(candidateValidator),
        status: resolutionStatusValidator,
        resolvedEntityId: v.optional(v.string()),
        resolvedEntityName: v.optional(v.string()),
        resolvedAt: v.optional(v.number()),
        organizationId: v.string(),
        createdAt: v.number(),
      })
    ),
  },
  returns: v.array(v.id("voiceNoteEntityResolutions")),
  handler: async (ctx, args) => {
    const ids: Id<"voiceNoteEntityResolutions">[] = [];
    for (const resolution of args.resolutions) {
      const id = await ctx.db.insert("voiceNoteEntityResolutions", resolution);
      ids.push(id);
    }
    return ids;
  },
});

// ── 2. getResolutionsByArtifact (internalQuery) ──────────────

export const getResolutionsByArtifact = internalQuery({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.array(resolutionObjectValidator),
  handler: async (ctx, args) =>
    await ctx.db
      .query("voiceNoteEntityResolutions")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .collect(),
});

// ── 3. getResolutionsByArtifactAndStatus (internalQuery) ─────

export const getResolutionsByArtifactAndStatus = internalQuery({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
    status: resolutionStatusValidator,
  },
  returns: v.array(resolutionObjectValidator),
  handler: async (ctx, args) =>
    await ctx.db
      .query("voiceNoteEntityResolutions")
      .withIndex("by_artifactId_and_status", (q) =>
        q.eq("artifactId", args.artifactId).eq("status", args.status)
      )
      .collect(),
});

// ── 4. updateResolutionStatus (internalMutation) ─────────────

export const updateResolutionStatus = internalMutation({
  args: {
    resolutionId: v.id("voiceNoteEntityResolutions"),
    status: resolutionStatusValidator,
    resolvedEntityId: v.optional(v.string()),
    resolvedEntityName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const patch: Record<string, unknown> = {
      status: args.status,
    };

    if (args.resolvedEntityId !== undefined) {
      patch.resolvedEntityId = args.resolvedEntityId;
      patch.resolvedEntityName = args.resolvedEntityName;
      patch.resolvedAt = now;
    }

    await ctx.db.patch(args.resolutionId, patch);
    return null;
  },
});

// ── 5. getResolutionsByClaim (PUBLIC query) ──────────────────

export const getResolutionsByClaim = query({
  args: {
    claimId: v.id("voiceNoteClaims"),
  },
  returns: v.array(resolutionObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify ownership: claim → artifact → senderUserId
    const claim = await ctx.db.get(args.claimId);
    if (!claim) {
      return [];
    }
    const artifact = await ctx.db.get(claim.artifactId);
    if (!artifact || artifact.senderUserId !== identity.subject) {
      return [];
    }

    return await ctx.db
      .query("voiceNoteEntityResolutions")
      .withIndex("by_claimId", (q) => q.eq("claimId", args.claimId))
      .collect();
  },
});

// ── 6. getDisambiguationForArtifact (PUBLIC query) ───────────

export const getDisambiguationForArtifact = query({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.array(resolutionObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify artifact ownership
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact || artifact.senderUserId !== identity.subject) {
      return [];
    }

    return await ctx.db
      .query("voiceNoteEntityResolutions")
      .withIndex("by_artifactId_and_status", (q) =>
        q.eq("artifactId", args.artifactId).eq("status", "needs_disambiguation")
      )
      .collect();
  },
});

// ── 7. getDisambiguationQueue (PUBLIC query) ─────────────────

export const getDisambiguationQueue = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(resolutionObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const limit = Math.min(
      args.limit ?? DEFAULT_DISAMBIGUATION_LIMIT,
      MAX_DISAMBIGUATION_LIMIT
    );

    // Fetch resolutions then filter to current user's artifacts
    const resolutions = await ctx.db
      .query("voiceNoteEntityResolutions")
      .withIndex("by_org_and_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("status", "needs_disambiguation")
      )
      .order("desc")
      .take(MAX_DISAMBIGUATION_LIMIT);

    // Batch-fetch artifacts for ownership check
    const uniqueArtifactIds = [
      ...new Set(resolutions.map((r) => r.artifactId)),
    ];
    const artifacts = await Promise.all(
      uniqueArtifactIds.map((id) => ctx.db.get(id))
    );
    const ownedArtifactIds = new Set(
      artifacts
        .filter(
          (a): a is NonNullable<typeof a> =>
            a !== null && a.senderUserId === identity.subject
        )
        .map((a) => a._id)
    );

    return resolutions
      .filter((r) => ownedArtifactIds.has(r.artifactId))
      .slice(0, limit);
  },
});

// ── 8. resolveEntity (PUBLIC mutation) ───────────────────────
// Handles: user_resolved status, parent claim update, E5 alias,
// E6 batch same-name, E3 analytics logging

export const resolveEntity = mutation({
  args: {
    resolutionId: v.id("voiceNoteEntityResolutions"),
    resolvedEntityId: v.string(),
    resolvedEntityName: v.string(),
    selectedScore: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Auth guard
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // 2. Validate score bounds
    if (args.selectedScore < 0 || args.selectedScore > 1) {
      throw new Error("selectedScore must be between 0 and 1");
    }

    // 3. Get the resolution record
    const resolution = await ctx.db.get(args.resolutionId);
    if (!resolution) {
      throw new Error("Resolution not found");
    }

    // 4. Verify artifact ownership
    const artifact = await ctx.db.get(resolution.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }
    if (artifact.senderUserId !== identity.subject) {
      throw new Error("Access denied: Resolution does not belong to you");
    }

    const now = Date.now();

    // 5. Update THIS resolution: user_resolved
    await ctx.db.patch(args.resolutionId, {
      status: "user_resolved",
      resolvedEntityId: args.resolvedEntityId,
      resolvedEntityName: args.resolvedEntityName,
      resolvedAt: now,
    });

    // 6. Update parent claim resolved fields (type-safe by mention type)
    const claim = await ctx.db.get(resolution.claimId);
    if (claim) {
      const claimPatch: Record<string, unknown> = {
        status: "resolved",
        updatedAt: now,
      };
      if (resolution.mentionType === "player_name") {
        claimPatch.resolvedPlayerIdentityId =
          args.resolvedEntityId as Id<"playerIdentities">;
        claimPatch.resolvedPlayerName = args.resolvedEntityName;
      } else if (resolution.mentionType === "team_name") {
        claimPatch.resolvedTeamId = args.resolvedEntityId;
        claimPatch.resolvedTeamName = args.resolvedEntityName;
      }
      await ctx.db.patch(resolution.claimId, claimPatch);
    }

    // 7. [E6] Batch: update all other resolutions with same rawText
    const normalizedRawText = resolution.rawText.toLowerCase().trim();
    const sameArtifactResolutions = await ctx.db
      .query("voiceNoteEntityResolutions")
      .withIndex("by_artifactId", (q) =>
        q.eq("artifactId", resolution.artifactId)
      )
      .collect();

    for (const r of sameArtifactResolutions) {
      if (
        r._id !== args.resolutionId &&
        r.rawText.toLowerCase().trim() === normalizedRawText &&
        r.status === "needs_disambiguation"
      ) {
        await ctx.db.patch(r._id, {
          status: "user_resolved",
          resolvedEntityId: args.resolvedEntityId,
          resolvedEntityName: args.resolvedEntityName,
          resolvedAt: now,
        });

        const batchClaim = await ctx.db.get(r.claimId);
        if (batchClaim) {
          const batchPatch: Record<string, unknown> = {
            status: "resolved",
            updatedAt: now,
          };
          if (r.mentionType === "player_name") {
            batchPatch.resolvedPlayerIdentityId =
              args.resolvedEntityId as Id<"playerIdentities">;
            batchPatch.resolvedPlayerName = args.resolvedEntityName;
          } else if (r.mentionType === "team_name") {
            batchPatch.resolvedTeamId = args.resolvedEntityId;
            batchPatch.resolvedTeamName = args.resolvedEntityName;
          }
          await ctx.db.patch(r.claimId, batchPatch);
        }
      }
    }

    // 8. [E5] Store coach alias (inline upsert)
    const existingAlias = await ctx.db
      .query("coachPlayerAliases")
      .withIndex("by_coach_org_rawText", (q) =>
        q
          .eq("coachUserId", identity.subject)
          .eq("organizationId", resolution.organizationId)
          .eq("rawText", normalizedRawText)
      )
      .first();

    if (existingAlias) {
      await ctx.db.patch(existingAlias._id, {
        resolvedEntityId: args.resolvedEntityId,
        resolvedEntityName: args.resolvedEntityName,
        useCount: existingAlias.useCount + 1,
        lastUsedAt: now,
      });
    } else {
      await ctx.db.insert("coachPlayerAliases", {
        coachUserId: identity.subject,
        organizationId: resolution.organizationId,
        rawText: normalizedRawText,
        resolvedEntityId: args.resolvedEntityId,
        resolvedEntityName: args.resolvedEntityName,
        useCount: 1,
        lastUsedAt: now,
        createdAt: now,
      });
    }

    // 9. [E3] Log analytics event (fire-and-forget)
    await ctx.scheduler.runAfter(
      0,
      internal.models.reviewAnalytics.logReviewEvent,
      {
        coachUserId: identity.subject,
        organizationId: resolution.organizationId,
        eventType: "disambiguate_accept" as const,
        confidenceScore: args.selectedScore,
        category: claim?.topic ?? "unknown",
      }
    );

    return null;
  },
});

// ── 9. rejectResolution (PUBLIC mutation) ────────────────────
// Marks resolution as unresolved (none of the candidates match)

export const rejectResolution = mutation({
  args: {
    resolutionId: v.id("voiceNoteEntityResolutions"),
    topCandidateScore: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Validate score bounds
    if (args.topCandidateScore < 0 || args.topCandidateScore > 1) {
      throw new Error("topCandidateScore must be between 0 and 1");
    }

    const resolution = await ctx.db.get(args.resolutionId);
    if (!resolution) {
      throw new Error("Resolution not found");
    }

    // Verify artifact ownership
    const artifact = await ctx.db.get(resolution.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }
    if (artifact.senderUserId !== identity.subject) {
      throw new Error("Access denied: Resolution does not belong to you");
    }

    await ctx.db.patch(args.resolutionId, {
      status: "unresolved",
      resolvedAt: Date.now(),
    });

    // [E3] Log analytics
    const claim = await ctx.db.get(resolution.claimId);
    await ctx.scheduler.runAfter(
      0,
      internal.models.reviewAnalytics.logReviewEvent,
      {
        coachUserId: identity.subject,
        organizationId: resolution.organizationId,
        eventType: "disambiguate_reject_all" as const,
        confidenceScore: args.topCandidateScore,
        category: claim?.topic ?? "unknown",
      }
    );

    return null;
  },
});

// ── 10. skipResolution (PUBLIC mutation) ─────────────────────
// Logs analytics for skipped resolutions without changing status

export const skipResolution = mutation({
  args: {
    resolutionId: v.id("voiceNoteEntityResolutions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const resolution = await ctx.db.get(args.resolutionId);
    if (!resolution) {
      throw new Error("Resolution not found");
    }

    // Verify artifact ownership
    const artifact = await ctx.db.get(resolution.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }
    if (artifact.senderUserId !== identity.subject) {
      throw new Error("Access denied: Resolution does not belong to you");
    }

    // [E3] Log skip analytics
    const claim = await ctx.db.get(resolution.claimId);
    await ctx.scheduler.runAfter(
      0,
      internal.models.reviewAnalytics.logReviewEvent,
      {
        coachUserId: identity.subject,
        organizationId: resolution.organizationId,
        eventType: "disambiguate_skip" as const,
        confidenceScore:
          resolution.candidates.length > 0 ? resolution.candidates[0].score : 0,
        category: claim?.topic ?? "unknown",
      }
    );

    return null;
  },
});
