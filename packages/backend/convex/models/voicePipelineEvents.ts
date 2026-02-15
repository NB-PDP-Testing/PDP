/**
 * Voice Pipeline Events - Monitoring & Analytics
 *
 * Event logging infrastructure for the v2 voice note processing pipeline.
 * Provides event log, metrics queries, and real-time counters for monitoring.
 *
 * Key patterns:
 * - logEvent is INTERNAL mutation (fire-and-forget from pipeline functions)
 * - All public queries verify platform staff authorization
 * - Cursor-based pagination (.paginate()) for all list queries
 * - Counter increment is atomic (same transaction as event insert)
 * - timeWindow format: 'YYYY-MM-DD-HH' for efficient cleanup
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalMutation, internalQuery, query } from "../_generated/server";

const authComponent = components.betterAuth;

// ============================================================
// EVENT TYPE VALIDATORS
// ============================================================

const eventTypeValidator = v.union(
  v.literal("artifact_received"),
  v.literal("artifact_status_changed"),
  v.literal("artifact_completed"),
  v.literal("artifact_failed"),
  v.literal("transcription_started"),
  v.literal("transcription_completed"),
  v.literal("transcription_failed"),
  v.literal("claims_extraction_started"),
  v.literal("claims_extracted"),
  v.literal("claims_extraction_failed"),
  v.literal("entity_resolution_started"),
  v.literal("entity_resolution_completed"),
  v.literal("entity_resolution_failed"),
  v.literal("entity_needs_disambiguation"),
  v.literal("draft_generation_started"),
  v.literal("drafts_generated"),
  v.literal("draft_generation_failed"),
  v.literal("draft_confirmed"),
  v.literal("draft_rejected"),
  v.literal("circuit_breaker_opened"),
  v.literal("circuit_breaker_closed"),
  v.literal("retry_initiated"),
  v.literal("retry_succeeded"),
  v.literal("retry_failed"),
  v.literal("budget_threshold_reached"),
  v.literal("budget_exceeded"),
  v.literal("rate_limit_hit")
);

const pipelineStageValidator = v.optional(
  v.union(
    v.literal("ingestion"),
    v.literal("transcription"),
    v.literal("claims_extraction"),
    v.literal("entity_resolution"),
    v.literal("draft_generation"),
    v.literal("confirmation")
  )
);

const eventMetadataValidator = v.optional(
  v.object({
    claimCount: v.optional(v.number()),
    entityCount: v.optional(v.number()),
    disambiguationCount: v.optional(v.number()),
    confidenceScore: v.optional(v.number()),
    transcriptDuration: v.optional(v.number()),
    transcriptWordCount: v.optional(v.number()),
    aiModel: v.optional(v.string()),
    aiCost: v.optional(v.number()),
    retryAttempt: v.optional(v.number()),
    sourceChannel: v.optional(v.string()),
  })
);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Compute timeWindow string from timestamp
 * Format: 'YYYY-MM-DD-HH' for hourly partitioning
 * Example: '2026-02-15-14' for Feb 15, 2026 at 2pm
 */
function computeTimeWindow(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hour = date.getHours().toString().padStart(2, "0");

  return `${year}-${month}-${day}-${hour}`;
}

/**
 * Map event types to counter types
 * Returns counter type string or null if event doesn't increment a counter
 */
function getCounterTypeForEvent(eventType: string): string | null {
  const mapping: Record<string, string> = {
    artifact_received: "artifacts_received_1h",
    artifact_completed: "artifacts_completed_1h",
    artifact_failed: "artifacts_failed_1h",
    transcription_completed: "transcriptions_completed_1h",
    claims_extracted: "claims_extracted_1h",
    entity_resolution_completed: "entities_resolved_1h",
    drafts_generated: "drafts_generated_1h",
  };

  return mapping[eventType] || null;
}

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Log a pipeline event with atomic counter increment
 *
 * This is an INTERNAL mutation - only called by pipeline functions.
 * Implements fire-and-forget pattern: catches errors internally, never throws.
 *
 * Counter increment happens in same transaction as event insert.
 * If window expired, atomically resets counter to 1.
 */
export const logEvent = internalMutation({
  args: {
    eventType: eventTypeValidator,
    artifactId: v.optional(v.id("voiceNoteArtifacts")),
    voiceNoteId: v.optional(v.id("voiceNotes")),
    organizationId: v.optional(v.string()),
    coachUserId: v.optional(v.string()),
    pipelineStage: pipelineStageValidator,
    stageStartedAt: v.optional(v.number()),
    stageCompletedAt: v.optional(v.number()),
    previousStatus: v.optional(v.string()),
    newStatus: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    metadata: eventMetadataValidator,
  },
  returns: v.string(), // Returns event _id on success, empty string on error
  handler: async (ctx, args) => {
    try {
      const now = Date.now();
      const eventId = crypto.randomUUID();
      const timeWindow = computeTimeWindow(now);

      // Compute duration if both start and end provided
      let durationMs: number | undefined;
      if (
        args.stageStartedAt !== undefined &&
        args.stageCompletedAt !== undefined
      ) {
        durationMs = args.stageCompletedAt - args.stageStartedAt;
      }

      // Insert event
      const insertedId = await ctx.db.insert("voicePipelineEvents", {
        eventId,
        eventType: args.eventType,
        artifactId: args.artifactId,
        voiceNoteId: args.voiceNoteId,
        organizationId: args.organizationId,
        coachUserId: args.coachUserId,
        pipelineStage: args.pipelineStage,
        stageStartedAt: args.stageStartedAt,
        stageCompletedAt: args.stageCompletedAt,
        durationMs,
        previousStatus: args.previousStatus,
        newStatus: args.newStatus,
        errorMessage: args.errorMessage,
        errorCode: args.errorCode,
        metadata: args.metadata,
        timestamp: now,
        timeWindow,
      });

      // ATOMIC COUNTER INCREMENT (same transaction)
      const counterType = getCounterTypeForEvent(args.eventType);
      if (counterType) {
        const counter = await ctx.db
          .query("voicePipelineCounters")
          .withIndex("by_counterType_and_org", (q) =>
            q
              .eq("counterType", counterType)
              .eq("organizationId", args.organizationId ?? null)
          )
          .first();

        if (counter && now < counter.windowEnd) {
          // Window still valid - increment counter
          await ctx.db.patch(counter._id, {
            currentValue: counter.currentValue + 1,
          });
        } else if (counter && now >= counter.windowEnd) {
          // Window expired - reset counter to 1 (atomic operation)
          await ctx.db.patch(counter._id, {
            currentValue: 1,
            windowStart: now,
            windowEnd: now + 3_600_000, // 1 hour in ms
          });
        } else {
          // Counter doesn't exist - create new one
          await ctx.db.insert("voicePipelineCounters", {
            counterType,
            organizationId: args.organizationId ?? null,
            currentValue: 1,
            windowStart: now,
            windowEnd: now + 3_600_000,
          });
        }
      }

      return insertedId;
    } catch (error) {
      // Fire-and-forget pattern: log error but don't throw
      console.error("[voicePipelineEvents.logEvent] Failed:", error);
      return "";
    }
  },
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get recent events with optional filters
 *
 * Platform staff only. Returns paginated results ordered by timestamp (newest first).
 */
export const getRecentEvents = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.optional(v.string()),
    }),
    filters: v.optional(
      v.object({
        eventType: v.optional(eventTypeValidator),
        pipelineStage: pipelineStageValidator,
        organizationId: v.optional(v.string()),
        startTime: v.optional(v.number()),
        endTime: v.optional(v.number()),
      })
    ),
  },
  returns: v.object({
    page: v.array(v.any()), // Full event objects
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    // Platform staff authorization
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.isPlatformStaff) {
      throw new Error("Unauthorized: Platform staff only");
    }

    // Build query based on filters
    let eventsQuery = ctx.db.query("voicePipelineEvents");

    const eventType = args.filters?.eventType;
    const pipelineStage = args.filters?.pipelineStage;
    const organizationId = args.filters?.organizationId;
    const startTime = args.filters?.startTime;

    if (eventType) {
      eventsQuery = eventsQuery.withIndex("by_eventType_and_timestamp", (q) =>
        q.eq("eventType", eventType)
      );
    } else if (pipelineStage) {
      eventsQuery = eventsQuery.withIndex(
        "by_pipelineStage_and_timestamp",
        (q) => q.eq("pipelineStage", pipelineStage)
      );
    } else if (organizationId && startTime) {
      eventsQuery = eventsQuery.withIndex("by_org_and_timestamp", (q) =>
        q.eq("organizationId", organizationId).gte("timestamp", startTime)
      );
    } else {
      eventsQuery = eventsQuery.withIndex("by_timestamp");
    }

    // Order by timestamp descending (newest first)
    const result = await eventsQuery
      .order("desc")
      .paginate(args.paginationOpts);

    return result;
  },
});

/**
 * Get all events for a specific artifact
 *
 * Internal query (no auth) - used by getEventTimeline public query.
 * Returns chronologically ordered events (oldest first).
 */
export const getEventsByArtifact = internalQuery({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("voicePipelineEvents")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
      .order("asc") // Chronological order
      .collect();
  },
});

/**
 * Get event timeline for an artifact (public query)
 *
 * Platform staff only. Returns chronological event timeline for artifact detail page.
 */
export const getEventTimeline = query({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Platform staff authorization
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.isPlatformStaff) {
      throw new Error("Unauthorized: Platform staff only");
    }

    // Call internal query
    const internal = (await import("../_generated/server")).internal;
    return await ctx.runQuery(
      internal.models.voicePipelineEvents.getEventsByArtifact,
      { artifactId: args.artifactId }
    );
  },
});

/**
 * Get active artifacts (in-progress status)
 *
 * Platform staff only. Queries voiceNoteArtifacts table (not events).
 * Returns paginated list of artifacts that are not completed or failed.
 */
export const getActiveArtifacts = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.optional(v.string()),
    }),
  },
  returns: v.object({
    page: v.array(v.any()),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    // Platform staff authorization
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.isPlatformStaff) {
      throw new Error("Unauthorized: Platform staff only");
    }

    // Query artifacts with in-progress statuses
    // Use by_status_and_createdAt index
    const receivedArtifacts = await ctx.db
      .query("voiceNoteArtifacts")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "received"))
      .order("desc")
      .take(args.paginationOpts.numItems);

    const transcribingArtifacts = await ctx.db
      .query("voiceNoteArtifacts")
      .withIndex("by_status_and_createdAt", (q) =>
        q.eq("status", "transcribing")
      )
      .order("desc")
      .take(args.paginationOpts.numItems);

    const transcribedArtifacts = await ctx.db
      .query("voiceNoteArtifacts")
      .withIndex("by_status_and_createdAt", (q) =>
        q.eq("status", "transcribed")
      )
      .order("desc")
      .take(args.paginationOpts.numItems);

    const processingArtifacts = await ctx.db
      .query("voiceNoteArtifacts")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "processing"))
      .order("desc")
      .take(args.paginationOpts.numItems);

    // Combine and sort by createdAt
    const allActive = [
      ...receivedArtifacts,
      ...transcribingArtifacts,
      ...transcribedArtifacts,
      ...processingArtifacts,
    ].sort((a, b) => b.createdAt - a.createdAt);

    // Manual pagination (since combining multiple queries)
    const page = allActive.slice(0, args.paginationOpts.numItems);
    const isDone = page.length < args.paginationOpts.numItems;

    return {
      page,
      isDone,
      continueCursor: "", // Manual pagination doesn't use cursor
    };
  },
});

/**
 * Get failed artifacts
 *
 * Platform staff only. Returns paginated list of failed artifacts.
 * Optional sinceTimestamp filter for recent failures.
 */
export const getFailedArtifacts = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.optional(v.string()),
    }),
    sinceTimestamp: v.optional(v.number()),
  },
  returns: v.object({
    page: v.array(v.any()),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    // Platform staff authorization
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.isPlatformStaff) {
      throw new Error("Unauthorized: Platform staff only");
    }

    // Query failed artifacts
    let failedQuery = ctx.db
      .query("voiceNoteArtifacts")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "failed"));

    // Apply time filter if provided
    if (args.sinceTimestamp) {
      failedQuery = failedQuery.filter((q) =>
        q.gte(q.field("createdAt"), args.sinceTimestamp)
      );
    }

    // Paginate results
    const result = await failedQuery
      .order("desc")
      .paginate(args.paginationOpts);

    return result;
  },
});
