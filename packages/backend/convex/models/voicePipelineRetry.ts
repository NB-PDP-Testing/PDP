/**
 * Voice Pipeline Retry Operations - M3
 *
 * Manual retry capability for failed pipeline stages. Platform staff can:
 * - Retry transcription failures
 * - Retry claims extraction failures
 * - Retry entity resolution failures
 * - Retry full pipeline (DESTRUCTIVE - deletes all derived data)
 *
 * Critical patterns:
 * - ALL retry mutations verify isPlatformStaff authorization
 * - ALWAYS log retry_initiated BEFORE scheduling action
 * - Use ctx.scheduler.runAfter(0, ...) for fire-and-forget scheduling
 * - Reset artifact status BEFORE scheduling action
 * - Increment metadata.retryAttempt with each retry
 * - Full pipeline retry deletes ALL derived data in try/catch
 * - transcribeAudio takes noteId (artifact.voiceNoteId), NOT artifactId
 */

import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Verify platform staff authorization
 * Throws if not authenticated or not platform staff
 */
async function verifyPlatformStaff(ctx: MutationCtx | QueryCtx): Promise<void> {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }

  const dbUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", value: user._id }],
  });

  if (!dbUser?.isPlatformStaff) {
    throw new Error("Not authorized: platform staff only");
  }
}

/**
 * Count previous retry attempts for an artifact
 * Queries voicePipelineEvents for retry_initiated events
 */
async function countPreviousRetries(
  ctx: MutationCtx,
  artifactId: Id<"voiceNoteArtifacts">
): Promise<number> {
  const prevRetries = await ctx.db
    .query("voicePipelineEvents")
    .withIndex("by_artifactId", (q) => q.eq("artifactId", artifactId))
    .collect();

  // Filter for retry_initiated events
  const retryEvents = prevRetries.filter(
    (event) => event.eventType === "retry_initiated"
  );

  return retryEvents.length;
}

// ============================================================
// RETRY MUTATIONS
// ============================================================

/**
 * Retry transcription for a failed artifact
 *
 * Flow:
 * 1. Verify platform staff auth
 * 2. Fetch artifact, verify it exists
 * 3. Count previous retry attempts
 * 4. Log retry_initiated event with retryAttempt
 * 5. Reset artifact status to 'transcribing'
 * 6. Schedule transcribeAudio action (CRITICAL: uses noteId, not artifactId!)
 * 7. Return success
 */
export const retryTranscription = mutation({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // 1. Verify platform staff authorization
    await verifyPlatformStaff(ctx);

    // 2. Fetch artifact, verify it exists
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) {
      return {
        success: false,
        message: "Artifact not found",
      };
    }

    // 3. Count previous retry attempts
    const retryAttempt = (await countPreviousRetries(ctx, args.artifactId)) + 1;

    // 4. Log retry_initiated event BEFORE scheduling action
    const organizationId =
      artifact.orgContextCandidates.length > 0
        ? artifact.orgContextCandidates[0].organizationId
        : undefined;

    await ctx.scheduler.runAfter(
      0,
      internal.models.voicePipelineEvents.logEvent,
      {
        eventType: "retry_initiated",
        artifactId: args.artifactId,
        voiceNoteId: artifact.voiceNoteId,
        organizationId,
        coachUserId: artifact.senderUserId,
        pipelineStage: "transcription",
        metadata: {
          retryAttempt,
        },
      }
    );

    // 5. Reset artifact status to 'transcribing'
    await ctx.db.patch(args.artifactId, {
      status: "transcribing",
    });

    // 6. Schedule transcribeAudio action
    // CRITICAL: transcribeAudio takes noteId (v1), not artifactId (v2)
    if (!artifact.voiceNoteId) {
      return {
        success: false,
        message: "Artifact missing voiceNoteId - cannot retry transcription",
      };
    }

    await ctx.scheduler.runAfter(
      0,
      internal.actions.voiceNotes.transcribeAudio,
      {
        noteId: artifact.voiceNoteId,
      }
    );

    // 7. Return success
    return {
      success: true,
      message: "Transcription retry initiated",
    };
  },
});

/**
 * Retry claims extraction for a failed artifact
 *
 * Flow:
 * 1. Verify platform staff auth
 * 2. Fetch artifact, verify it exists
 * 3. Count previous retry attempts
 * 4. Log retry_initiated event
 * 5. Reset artifact status to 'transcribed' (ready for claims extraction)
 * 6. Schedule extractClaims action
 * 7. Return success
 */
export const retryClaimsExtraction = mutation({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // 1. Verify platform staff authorization
    await verifyPlatformStaff(ctx);

    // 2. Fetch artifact, verify it exists
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) {
      return {
        success: false,
        message: "Artifact not found",
      };
    }

    // 3. Count previous retry attempts
    const retryAttempt = (await countPreviousRetries(ctx, args.artifactId)) + 1;

    // 4. Log retry_initiated event BEFORE scheduling action
    const organizationId =
      artifact.orgContextCandidates.length > 0
        ? artifact.orgContextCandidates[0].organizationId
        : undefined;

    await ctx.scheduler.runAfter(
      0,
      internal.models.voicePipelineEvents.logEvent,
      {
        eventType: "retry_initiated",
        artifactId: args.artifactId,
        voiceNoteId: artifact.voiceNoteId,
        organizationId,
        coachUserId: artifact.senderUserId,
        pipelineStage: "claims_extraction",
        metadata: {
          retryAttempt,
        },
      }
    );

    // 5. Reset artifact status to 'transcribed' (ready for claims)
    await ctx.db.patch(args.artifactId, {
      status: "transcribed",
    });

    // 6. Schedule extractClaims action
    await ctx.scheduler.runAfter(
      0,
      internal.actions.claimsExtraction.extractClaims,
      {
        artifactId: args.artifactId,
      }
    );

    // 7. Return success
    return {
      success: true,
      message: "Claims extraction retry initiated",
    };
  },
});

/**
 * Retry entity resolution for a failed artifact
 *
 * Flow:
 * 1. Verify platform staff auth
 * 2. Fetch artifact, verify it exists
 * 3. Count previous retry attempts
 * 4. Log retry_initiated event
 * 5. Delete existing voiceNoteEntityResolutions for this artifact (clean slate)
 * 6. Schedule resolveEntities action
 * 7. Return success
 */
export const retryEntityResolution = mutation({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // 1. Verify platform staff authorization
    await verifyPlatformStaff(ctx);

    // 2. Fetch artifact, verify it exists
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) {
      return {
        success: false,
        message: "Artifact not found",
      };
    }

    // 3. Count previous retry attempts
    const retryAttempt = (await countPreviousRetries(ctx, args.artifactId)) + 1;

    // 4. Log retry_initiated event BEFORE scheduling action
    const organizationId =
      artifact.orgContextCandidates.length > 0
        ? artifact.orgContextCandidates[0].organizationId
        : undefined;

    await ctx.scheduler.runAfter(
      0,
      internal.models.voicePipelineEvents.logEvent,
      {
        eventType: "retry_initiated",
        artifactId: args.artifactId,
        voiceNoteId: artifact.voiceNoteId,
        organizationId,
        coachUserId: artifact.senderUserId,
        pipelineStage: "entity_resolution",
        metadata: {
          retryAttempt,
        },
      }
    );

    // 5. Delete existing entity resolutions (clean slate)
    const existingResolutions = await ctx.db
      .query("voiceNoteEntityResolutions")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .collect();

    for (const resolution of existingResolutions) {
      await ctx.db.delete(resolution._id);
    }

    // 6. Schedule resolveEntities action
    await ctx.scheduler.runAfter(
      0,
      internal.actions.entityResolution.resolveEntities,
      {
        artifactId: args.artifactId,
      }
    );

    // 7. Return success
    return {
      success: true,
      message: "Entity resolution retry initiated",
    };
  },
});

/**
 * Retry full pipeline from beginning (DESTRUCTIVE)
 *
 * Deletes ALL derived data and starts pipeline fresh.
 * Use for complete failures or data corruption.
 *
 * Flow:
 * 1. Verify platform staff auth
 * 2. Fetch artifact, verify it exists
 * 3. Count previous retry attempts
 * 4. Log retry_initiated event with retryType: 'full_pipeline'
 * 5. Delete ALL derived data in order (wrap in try/catch, abort if any fail):
 *    a. Delete voiceNoteTranscripts
 *    b. Delete voiceNoteClaims
 *    c. Delete voiceNoteEntityResolutions
 *    d. Delete insightDrafts
 * 6. Only if ALL deletes succeed: reset artifact status to 'received'
 * 7. Schedule transcribeAudio action (with noteId, not artifactId)
 * 8. Return success
 */
export const retryFullPipeline = mutation({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // 1. Verify platform staff authorization
    await verifyPlatformStaff(ctx);

    // 2. Fetch artifact, verify it exists
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) {
      return {
        success: false,
        message: "Artifact not found",
      };
    }

    // 3. Count previous retry attempts
    const retryAttempt = (await countPreviousRetries(ctx, args.artifactId)) + 1;

    // 4. Log retry_initiated event with full_pipeline type
    const organizationId =
      artifact.orgContextCandidates.length > 0
        ? artifact.orgContextCandidates[0].organizationId
        : undefined;

    await ctx.scheduler.runAfter(
      0,
      internal.models.voicePipelineEvents.logEvent,
      {
        eventType: "retry_initiated",
        artifactId: args.artifactId,
        voiceNoteId: artifact.voiceNoteId,
        organizationId,
        coachUserId: artifact.senderUserId,
        pipelineStage: "ingestion",
        metadata: {
          retryAttempt,
        },
      }
    );

    // 5. Delete ALL derived data (DESTRUCTIVE)
    // Wrap in try/catch - if ANY delete fails, abort entire operation
    try {
      // a. Delete voiceNoteTranscripts
      const transcripts = await ctx.db
        .query("voiceNoteTranscripts")
        .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
        .collect();

      for (const transcript of transcripts) {
        await ctx.db.delete(transcript._id);
      }

      // b. Delete voiceNoteClaims
      const claims = await ctx.db
        .query("voiceNoteClaims")
        .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
        .collect();

      for (const claim of claims) {
        await ctx.db.delete(claim._id);
      }

      // c. Delete voiceNoteEntityResolutions
      const resolutions = await ctx.db
        .query("voiceNoteEntityResolutions")
        .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
        .collect();

      for (const resolution of resolutions) {
        await ctx.db.delete(resolution._id);
      }

      // d. Delete insightDrafts
      const drafts = await ctx.db
        .query("insightDrafts")
        .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
        .collect();

      for (const draft of drafts) {
        await ctx.db.delete(draft._id);
      }
    } catch (error) {
      console.error("Full pipeline retry cleanup failed:", error);
      return {
        success: false,
        message: "Cleanup failed - aborted to prevent partial state",
      };
    }

    // 6. Reset artifact status to 'received' (only if all deletes succeeded)
    await ctx.db.patch(args.artifactId, {
      status: "received",
    });

    // 7. Schedule transcribeAudio action
    // CRITICAL: transcribeAudio takes noteId (v1), not artifactId (v2)
    if (!artifact.voiceNoteId) {
      return {
        success: false,
        message: "Artifact missing voiceNoteId - cannot retry full pipeline",
      };
    }

    await ctx.scheduler.runAfter(
      0,
      internal.actions.voiceNotes.transcribeAudio,
      {
        noteId: artifact.voiceNoteId,
      }
    );

    // 8. Return success
    return {
      success: true,
      message: "Full pipeline retry initiated - all derived data cleared",
    };
  },
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get retry history for an artifact
 *
 * Returns chronological list of all retry attempts (retry_initiated,
 * retry_succeeded, retry_failed events) for an artifact.
 *
 * Platform staff only.
 */
export const getRetryHistory = query({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.array(
    v.object({
      timestamp: v.number(),
      eventType: v.string(),
      retryAttempt: v.optional(v.number()),
      succeeded: v.optional(v.boolean()),
      errorMessage: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // 1. Verify platform staff authorization
    await verifyPlatformStaff(ctx);

    // 2. Query voicePipelineEvents by_artifactId index
    const events = await ctx.db
      .query("voicePipelineEvents")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .collect();

    // 3. Filter for retry events
    const retryEvents = events.filter(
      (event) =>
        event.eventType === "retry_initiated" ||
        event.eventType === "retry_succeeded" ||
        event.eventType === "retry_failed"
    );

    // 4. Order by timestamp ascending (chronological)
    retryEvents.sort((a, b) => a.timestamp - b.timestamp);

    // 5. Map to simplified format
    const history = retryEvents.map((event) => ({
      timestamp: event.timestamp,
      eventType: event.eventType,
      retryAttempt: event.metadata?.retryAttempt,
      succeeded: event.eventType === "retry_succeeded" ? true : undefined,
      errorMessage: event.errorMessage,
    }));

    // 6. Return array
    return history;
  },
});
