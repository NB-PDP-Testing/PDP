/**
 * Voice Note Artifacts - v2 Pipeline Foundation
 *
 * Source-agnostic records for voice/text input processing.
 * Each artifact links back to a v1 voiceNote for backward compatibility.
 *
 * Internal functions for pipeline use + public query for claims viewer.
 */

import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery, query } from "../_generated/server";
import { authComponent } from "../auth";

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
    const newArtifactId = await ctx.db.insert("voiceNoteArtifacts", {
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

    // Log artifact_received event (fire-and-forget)
    ctx.scheduler.runAfter(0, internal.models.voicePipelineEvents.logEvent, {
      eventType: "artifact_received",
      artifactId: newArtifactId,
      organizationId: args.orgContextCandidates[0]?.organizationId,
      coachUserId: args.senderUserId,
      pipelineStage: "ingestion",
      metadata: {
        sourceChannel: args.sourceChannel,
      },
    });

    return newArtifactId;
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
    errorMessage: v.optional(v.string()),
    errorCode: v.optional(v.string()),
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

    const previousStatus = artifact.status;

    await ctx.db.patch(artifact._id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    // Log status change event (fire-and-forget)
    let eventType:
      | "artifact_completed"
      | "artifact_failed"
      | "artifact_status_changed";
    if (args.status === "completed") {
      eventType = "artifact_completed";
    } else if (args.status === "failed") {
      eventType = "artifact_failed";
    } else {
      eventType = "artifact_status_changed";
    }

    ctx.scheduler.runAfter(0, internal.models.voicePipelineEvents.logEvent, {
      eventType,
      artifactId: artifact._id,
      organizationId: artifact.orgContextCandidates[0]?.organizationId,
      coachUserId: artifact.senderUserId,
      previousStatus,
      newStatus: args.status,
      errorMessage: args.errorMessage,
      errorCode: args.errorCode,
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
 * Get artifact by Convex document _id (INTERNAL).
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
    return await ctx.db
      .query("voiceNoteArtifacts")
      .withIndex("by_senderUserId_and_createdAt", (q) =>
        q.eq("senderUserId", identity.subject)
      )
      .order("desc")
      .take(limit);
  },
});

// ============================================================
// PLATFORM STAFF QUERIES (M6 blocking pre-work)
// ============================================================

/**
 * Get paginated artifacts with filters for platform staff monitoring.
 * Platform staff only. Supports org, status, date range, and source filters.
 */
export const getPlatformArtifacts = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filters: v.optional(
      v.object({
        status: v.optional(statusValidator),
        startTime: v.optional(v.number()),
      })
    ),
  },
  returns: v.object({
    page: v.array(
      v.object({
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
        // Enriched fields
        coachName: v.optional(v.string()),
        orgName: v.optional(v.string()),
      })
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
    pageStatus: v.optional(
      v.union(
        v.literal("SplitRecommended"),
        v.literal("SplitRequired"),
        v.null()
      )
    ),
    splitCursor: v.optional(v.union(v.string(), v.null())),
  }),
  handler: async (ctx, args) => {
    // Platform staff authorization
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.isPlatformStaff) {
      throw new Error("Unauthorized: Platform staff only");
    }

    // Build query based on filters - use by_status_and_createdAt index
    const status = args.filters?.status;
    const startTime = args.filters?.startTime;

    // biome-ignore lint/suspicious/noImplicitAnyLet: Result type varies by branch
    let result: any;
    if (status) {
      // Use by_status_and_createdAt index
      result = await ctx.db
        .query("voiceNoteArtifacts")
        .withIndex("by_status_and_createdAt", (q) => {
          const baseQuery = q.eq("status", status);
          return startTime ? baseQuery.gte("createdAt", startTime) : baseQuery;
        })
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      // No status filter - use collect and manual pagination
      // Note: No global createdAt index exists, use status index with all statuses
      const allStatuses = [
        "received",
        "transcribing",
        "transcribed",
        "processing",
        "completed",
        "failed",
      ] as const;

      // Fetch artifacts for all statuses
      const artifactsByStatus = await Promise.all(
        allStatuses.map((s) =>
          ctx.db
            .query("voiceNoteArtifacts")
            .withIndex("by_status_and_createdAt", (q) => {
              const baseQuery = q.eq("status", s);
              return startTime
                ? baseQuery.gte("createdAt", startTime)
                : baseQuery;
            })
            .order("desc")
            .collect()
        )
      );

      // Merge and sort by createdAt
      const allArtifacts = artifactsByStatus
        .flat()
        .sort((a, b) => b.createdAt - a.createdAt);

      // Manual pagination
      const numItems = args.paginationOpts.numItems;
      const cursor = args.paginationOpts.cursor;
      const startIdx = cursor ? Number.parseInt(cursor, 10) : 0;
      const page = allArtifacts.slice(startIdx, startIdx + numItems);

      result = {
        page,
        isDone: startIdx + numItems >= allArtifacts.length,
        continueCursor: (startIdx + numItems).toString(),
      };
    }

    // Enrich artifacts with coach and org names
    const { components: betterAuthComponents } = require("../_generated/api");

    // Batch fetch unique users
    const uniqueUserIds = [...new Set(result.page.map((a) => a.senderUserId))];
    const usersResult = await ctx.runQuery(
      betterAuthComponents.betterAuth.adapter.findMany,
      {
        model: "user",
        paginationOpts: { cursor: null, numItems: 1000 },
      }
    );
    const userMap = new Map();
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic Better Auth user type
    for (const userData of (usersResult.page || []) as any[]) {
      if (uniqueUserIds.includes(userData._id)) {
        userMap.set(userData._id, userData.name || userData.email || "Unknown");
      }
    }

    // Batch fetch unique orgs
    const uniqueOrgIds = [
      ...new Set(
        result.page.flatMap((a) =>
          a.orgContextCandidates.map((c) => c.organizationId)
        )
      ),
    ];
    const orgsResult = await ctx.runQuery(
      betterAuthComponents.betterAuth.adapter.findMany,
      {
        model: "organization",
        paginationOpts: { cursor: null, numItems: 1000 },
      }
    );
    const orgMap = new Map();
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic Better Auth org type
    for (const org of (orgsResult.page || []) as any[]) {
      if (uniqueOrgIds.includes(org._id)) {
        orgMap.set(org._id, org.name || "Unknown");
      }
    }

    // Return enriched artifacts
    return {
      ...result,
      page: result.page.map((artifact) => ({
        ...artifact,
        coachName: userMap.get(artifact.senderUserId),
        orgName: orgMap.get(artifact.orgContextCandidates[0]?.organizationId),
      })),
    };
  },
});

/**
 * Get single artifact by _id for platform staff (PUBLIC).
 * Platform staff only. Used by artifact detail page.
 */
export const getPlatformArtifactById = query({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.union(artifactObjectValidator, v.null()),
  handler: async (ctx, args) => {
    // Platform staff authorization
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.isPlatformStaff) {
      throw new Error("Unauthorized: Platform staff only");
    }

    return await ctx.db.get(args.artifactId);
  },
});
