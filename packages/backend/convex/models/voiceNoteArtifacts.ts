/**
 * Voice Note Artifacts - v2 Pipeline Foundation
 *
 * Source-agnostic records for voice/text input processing.
 * Each artifact links back to a v1 voiceNote for backward compatibility.
 *
 * Internal functions for pipeline use + public query for claims viewer.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";

const MAX_RECENT_ARTIFACTS = 200;
const DEFAULT_RECENT_ARTIFACTS = 50;

const sourceChannelValidator = v.union(
  v.literal("whatsapp_audio"),
  v.literal("whatsapp_text"),
  v.literal("app_recorded"),
  v.literal("app_typed")
);

const statusValidator = v.union(
  v.literal("received"),
  v.literal("transcribing"),
  v.literal("transcribed"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed")
);

const artifactObjectValidator = v.object({
  _id: v.id("voiceNoteArtifacts"),
  _creationTime: v.number(),
  artifactId: v.string(),
  sourceChannel: sourceChannelValidator,
  senderUserId: v.string(),
  orgContextCandidates: v.array(
    v.object({
      organizationId: v.string(),
      confidence: v.number(),
    })
  ),
  status: statusValidator,
  voiceNoteId: v.optional(v.id("voiceNotes")),
  rawMediaStorageId: v.optional(v.id("_storage")),
  metadata: v.optional(
    v.object({
      mimeType: v.optional(v.string()),
      fileSize: v.optional(v.number()),
      whatsappMessageId: v.optional(v.string()),
    })
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/**
 * Create a new artifact record when a voice/text input is received.
 * Called from processIncomingMessage when v2 pipeline is enabled.
 */
export const createArtifact = internalMutation({
  args: {
    artifactId: v.string(),
    sourceChannel: sourceChannelValidator,
    senderUserId: v.string(),
    orgContextCandidates: v.array(
      v.object({
        organizationId: v.string(),
        confidence: v.number(),
      })
    ),
    rawMediaStorageId: v.optional(v.id("_storage")),
    metadata: v.optional(
      v.object({
        mimeType: v.optional(v.string()),
        fileSize: v.optional(v.number()),
        whatsappMessageId: v.optional(v.string()),
      })
    ),
  },
  returns: v.id("voiceNoteArtifacts"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("voiceNoteArtifacts", {
      artifactId: args.artifactId,
      sourceChannel: args.sourceChannel,
      senderUserId: args.senderUserId,
      orgContextCandidates: args.orgContextCandidates,
      status: "received",
      rawMediaStorageId: args.rawMediaStorageId,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Link an artifact to its corresponding v1 voiceNote.
 * Called after the v1 voiceNote is created for backward compat.
 */
export const linkToVoiceNote = internalMutation({
  args: {
    artifactId: v.string(),
    voiceNoteId: v.id("voiceNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const artifact = await ctx.db
      .query("voiceNoteArtifacts")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .first();

    if (!artifact) {
      throw new Error(`Artifact not found: ${args.artifactId}`);
    }

    await ctx.db.patch(artifact._id, {
      voiceNoteId: args.voiceNoteId,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Update the processing status of an artifact.
 * Called as the artifact moves through the pipeline stages.
 */
export const updateArtifactStatus = internalMutation({
  args: {
    artifactId: v.string(),
    status: statusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const artifact = await ctx.db
      .query("voiceNoteArtifacts")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .first();

    if (!artifact) {
      throw new Error(`Artifact not found: ${args.artifactId}`);
    }

    await ctx.db.patch(artifact._id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Look up an artifact by its unique artifactId string.
 */
export const getArtifactByArtifactId = internalQuery({
  args: {
    artifactId: v.string(),
  },
  returns: v.union(artifactObjectValidator, v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("voiceNoteArtifacts")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .first(),
});

/**
 * Get artifact by Convex document _id.
 * Used by claimsExtraction action which receives the _id from scheduler.
 */
export const getArtifactById = internalQuery({
  args: {
    _id: v.id("voiceNoteArtifacts"),
  },
  returns: v.union(artifactObjectValidator, v.null()),
  handler: async (ctx, args) => ctx.db.get(args._id),
});

/**
 * Get all artifacts linked to a specific v1 voiceNote.
 */
export const getArtifactsByVoiceNote = internalQuery({
  args: {
    voiceNoteId: v.id("voiceNotes"),
  },
  returns: v.array(artifactObjectValidator),
  handler: async (ctx, args) =>
    await ctx.db
      .query("voiceNoteArtifacts")
      .withIndex("by_voiceNoteId", (q) => q.eq("voiceNoteId", args.voiceNoteId))
      .collect(),
});

/**
 * Get recent artifacts ordered by creation time (most recent first).
 * Used by the platform claims viewer to list artifacts with their claims.
 */
export const getRecentArtifacts = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(artifactObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const limit = Math.min(
      args.limit ?? DEFAULT_RECENT_ARTIFACTS,
      MAX_RECENT_ARTIFACTS
    );
    return await ctx.db.query("voiceNoteArtifacts").order("desc").take(limit);
  },
});
