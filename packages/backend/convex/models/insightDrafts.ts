/**
 * Insight Drafts - Phase 6
 *
 * Pending insights awaiting coach confirmation before applying to player profiles.
 * Each draft has confidence scoring and supports auto-confirm for trusted coaches.
 *
 * 11 functions: 4 internal (pipeline + command handler) + 7 public (UI).
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

const insightTypeValidator = v.union(
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
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("rejected"),
  v.literal("applied"),
  v.literal("expired")
);

const draftObjectValidator = v.object({
  _id: v.id("insightDrafts"),
  _creationTime: v.number(),
  draftId: v.string(),
  artifactId: v.id("voiceNoteArtifacts"),
  claimId: v.id("voiceNoteClaims"),
  playerIdentityId: v.optional(v.id("playerIdentities")),
  resolvedPlayerName: v.optional(v.string()),
  insightType: insightTypeValidator,
  title: v.string(),
  description: v.string(),
  evidence: v.object({
    transcriptSnippet: v.string(),
    timestampStart: v.optional(v.number()),
  }),
  displayOrder: v.number(),
  aiConfidence: v.number(),
  resolutionConfidence: v.number(),
  overallConfidence: v.number(),
  requiresConfirmation: v.boolean(),
  status: statusValidator,
  organizationId: v.string(),
  coachUserId: v.string(),
  confirmedAt: v.optional(v.number()),
  appliedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// ── 1. createDrafts (internalMutation) ───────────────────────

export const createDrafts = internalMutation({
  args: {
    drafts: v.array(
      v.object({
        draftId: v.string(),
        artifactId: v.id("voiceNoteArtifacts"),
        claimId: v.id("voiceNoteClaims"),
        playerIdentityId: v.optional(v.id("playerIdentities")),
        resolvedPlayerName: v.optional(v.string()),
        insightType: insightTypeValidator,
        title: v.string(),
        description: v.string(),
        evidence: v.object({
          transcriptSnippet: v.string(),
          timestampStart: v.optional(v.number()),
        }),
        displayOrder: v.number(),
        aiConfidence: v.number(),
        resolutionConfidence: v.number(),
        overallConfidence: v.number(),
        requiresConfirmation: v.boolean(),
        status: statusValidator,
        organizationId: v.string(),
        coachUserId: v.string(),
        confirmedAt: v.optional(v.number()),
        appliedAt: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
  },
  returns: v.array(v.id("insightDrafts")),
  handler: async (ctx, args) => {
    const ids: Id<"insightDrafts">[] = [];
    for (const draft of args.drafts) {
      const id = await ctx.db.insert("insightDrafts", draft);
      ids.push(id);
    }
    return ids;
  },
});

// ── 2. getDraftsByArtifact (internalQuery) ───────────────────

export const getDraftsByArtifact = internalQuery({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.array(draftObjectValidator),
  handler: async (ctx, args) =>
    await ctx.db
      .query("insightDrafts")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .collect(),
});

// ── 3. getPendingDraftsForCoach (PUBLIC query) ───────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const getPendingDraftsForCoach = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(draftObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const now = Date.now();
    const expiryThreshold = now - SEVEN_DAYS_MS;

    const drafts = await ctx.db
      .query("insightDrafts")
      .withIndex("by_org_coach_status_createdAt", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("coachUserId", identity.subject)
          .eq("status", "pending")
          .gte("createdAt", expiryThreshold)
      )
      .collect();

    return drafts;
  },
});

// ── 4. confirmDraft (PUBLIC mutation) ─────────────────────────

export const confirmDraft = mutation({
  args: {
    draftId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Look up draft
    const draft = await ctx.db
      .query("insightDrafts")
      .withIndex("by_draftId", (q) => q.eq("draftId", args.draftId))
      .first();

    if (!draft) {
      throw new Error("Draft not found");
    }

    // Status guard: only pending drafts can be confirmed
    if (draft.status !== "pending") {
      throw new Error(`Draft cannot be confirmed (status: ${draft.status})`);
    }

    // Verify ownership: get artifact and check senderUserId
    const artifact = await ctx.db.get(draft.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }
    if (artifact.senderUserId !== identity.subject) {
      throw new Error("Access denied: Draft does not belong to you");
    }

    const now = Date.now();

    // Update status
    await ctx.db.patch(draft._id, {
      status: "confirmed",
      confirmedAt: now,
      updatedAt: now,
    });

    // Schedule apply so the confirmed draft gets applied to player records
    await ctx.scheduler.runAfter(0, internal.models.insightDrafts.applyDraft, {
      draftId: args.draftId,
    });

    return null;
  },
});

// ── 5. confirmAllDrafts (PUBLIC mutation) ─────────────────────

export const confirmAllDrafts = mutation({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Verify ownership
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }
    if (artifact.senderUserId !== identity.subject) {
      throw new Error("Access denied: Artifact does not belong to you");
    }

    // Get all pending drafts for this artifact
    const drafts = await ctx.db
      .query("insightDrafts")
      .withIndex("by_artifactId_and_status", (q) =>
        q.eq("artifactId", args.artifactId).eq("status", "pending")
      )
      .collect();

    const now = Date.now();

    // Confirm all and schedule apply for each
    for (const draft of drafts) {
      if (draft.organizationId !== args.organizationId) {
        continue;
      }
      await ctx.db.patch(draft._id, {
        status: "confirmed",
        confirmedAt: now,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(
        0,
        internal.models.insightDrafts.applyDraft,
        { draftId: draft.draftId }
      );
    }

    return null;
  },
});

// ── 6. rejectDraft (PUBLIC mutation) ──────────────────────────

export const rejectDraft = mutation({
  args: {
    draftId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Look up draft
    const draft = await ctx.db
      .query("insightDrafts")
      .withIndex("by_draftId", (q) => q.eq("draftId", args.draftId))
      .first();

    if (!draft) {
      throw new Error("Draft not found");
    }

    // Status guard: only pending drafts can be rejected
    if (draft.status !== "pending") {
      throw new Error(`Draft cannot be rejected (status: ${draft.status})`);
    }

    // Verify ownership
    const artifact = await ctx.db.get(draft.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }
    if (artifact.senderUserId !== identity.subject) {
      throw new Error("Access denied: Draft does not belong to you");
    }

    // Update status
    await ctx.db.patch(draft._id, {
      status: "rejected",
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ── 7. rejectAllDrafts (PUBLIC mutation) ──────────────────────

export const rejectAllDrafts = mutation({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Verify ownership
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }
    if (artifact.senderUserId !== identity.subject) {
      throw new Error("Access denied: Artifact does not belong to you");
    }

    // Get all pending drafts for this artifact
    const drafts = await ctx.db
      .query("insightDrafts")
      .withIndex("by_artifactId_and_status", (q) =>
        q.eq("artifactId", args.artifactId).eq("status", "pending")
      )
      .collect();

    const now = Date.now();

    // Reject all
    for (const draft of drafts) {
      if (draft.organizationId !== args.organizationId) {
        continue;
      }
      await ctx.db.patch(draft._id, {
        status: "rejected",
        updatedAt: now,
      });
    }

    return null;
  },
});

// ── 8. getPendingDraftsInternal (internalQuery) ───────────────
// Used by command handler (no auth check — caller verifies identity)

export const getPendingDraftsInternal = internalQuery({
  args: {
    organizationId: v.string(),
    coachUserId: v.string(),
  },
  returns: v.array(draftObjectValidator),
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiryThreshold = now - SEVEN_DAYS_MS;

    return await ctx.db
      .query("insightDrafts")
      .withIndex("by_org_coach_status_createdAt", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("coachUserId", args.coachUserId)
          .eq("status", "pending")
          .gte("createdAt", expiryThreshold)
      )
      .collect();
  },
});

// ── 9. confirmDraftInternal (internalMutation) ────────────────
// Used by command handler (no auth check — caller verifies identity)

export const confirmDraftInternal = internalMutation({
  args: {
    draftId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db
      .query("insightDrafts")
      .withIndex("by_draftId", (q) => q.eq("draftId", args.draftId))
      .first();

    if (!draft) {
      throw new Error(`Draft not found: ${args.draftId}`);
    }

    if (draft.status !== "pending") {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(draft._id, {
      status: "confirmed",
      confirmedAt: now,
      updatedAt: now,
    });

    return null;
  },
});

// ── 10. rejectDraftInternal (internalMutation) ────────────────
// Used by command handler (no auth check — caller verifies identity)

export const rejectDraftInternal = internalMutation({
  args: {
    draftId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db
      .query("insightDrafts")
      .withIndex("by_draftId", (q) => q.eq("draftId", args.draftId))
      .first();

    if (!draft) {
      throw new Error(`Draft not found: ${args.draftId}`);
    }

    if (draft.status !== "pending") {
      return null;
    }

    await ctx.db.patch(draft._id, {
      status: "rejected",
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ── 11. applyDraft (internalMutation) ─────────────────────────

export const applyDraft = internalMutation({
  args: {
    draftId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Look up draft
    const draft = await ctx.db
      .query("insightDrafts")
      .withIndex("by_draftId", (q) => q.eq("draftId", args.draftId))
      .first();

    if (!draft) {
      throw new Error(`Draft not found: ${args.draftId}`);
    }

    // Check status is confirmed
    if (draft.status !== "confirmed") {
      throw new Error(
        `Draft ${args.draftId} cannot be applied (status: ${draft.status})`
      );
    }

    // Get the claim to extract additional details
    const claim = await ctx.db.get(draft.claimId);
    if (!claim) {
      throw new Error(`Claim not found for draft ${args.draftId}`);
    }

    // Get the artifact to link back to voiceNoteId
    const artifact = await ctx.db.get(draft.artifactId);
    if (!artifact?.voiceNoteId) {
      throw new Error(
        `Artifact or voiceNoteId not found for draft ${args.draftId}`
      );
    }

    const now = Date.now();

    // Create a voiceNoteInsight record
    // Use the draft's data mapped to voiceNoteInsights schema
    await ctx.db.insert("voiceNoteInsights", {
      voiceNoteId: artifact.voiceNoteId,
      insightId: draft.draftId, // Use draftId as insightId for traceability
      title: draft.title,
      description: draft.description,
      category: draft.insightType, // insightType maps to category
      recommendedUpdate: claim.recommendedAction, // Map from claim if available
      playerIdentityId: draft.playerIdentityId,
      playerName: draft.resolvedPlayerName,
      teamId: claim.resolvedTeamId,
      teamName: claim.resolvedTeamName,
      assigneeUserId: claim.resolvedAssigneeUserId,
      assigneeName: claim.resolvedAssigneeName,
      confidenceScore: draft.overallConfidence,
      wouldAutoApply: !draft.requiresConfirmation, // If didn't require confirmation, it would have auto-applied
      status: "applied",
      organizationId: draft.organizationId,
      coachId: draft.coachUserId,
      createdAt: now,
      updatedAt: now,
    });

    // Update draft status to applied
    await ctx.db.patch(draft._id, {
      status: "applied",
      appliedAt: now,
      updatedAt: now,
    });

    return null;
  },
});
