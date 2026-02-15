import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Enqueue a new sync job for an organization
 * Returns the job ID if successfully queued, null if a job is already running
 */
export const enqueueSyncJob = mutation({
  args: {
    organizationId: v.string(),
    connectorId: v.id("federationConnectors"),
    syncType: v.union(
      v.literal("scheduled"),
      v.literal("manual"),
      v.literal("webhook")
    ),
    importSessionId: v.optional(v.id("importSessions")),
  },
  returns: v.union(v.id("syncQueue"), v.null()),
  handler: async (ctx, args) => {
    // Check if there's already a running or pending job for this org+connector
    const existingJob = await ctx.db
      .query("syncQueue")
      .withIndex("by_org_and_connector", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("connectorId", args.connectorId)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "running"),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingJob) {
      console.warn(
        `Sync job already ${existingJob.status} for org ${args.organizationId}, connector ${args.connectorId}`
      );
      return null;
    }

    // Create new pending job
    const jobId = await ctx.db.insert("syncQueue", {
      organizationId: args.organizationId,
      connectorId: args.connectorId,
      status: "pending",
      syncType: args.syncType,
      importSessionId: args.importSessionId,
      queuedAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    });

    return jobId;
  },
});

/**
 * Atomically claim a pending sync job to start processing
 * Returns the job if successfully claimed, null if no pending jobs or already running
 */
export const claimSyncJob = mutation({
  args: {
    organizationId: v.string(),
    connectorId: v.id("federationConnectors"),
  },
  returns: v.union(
    v.object({
      _id: v.id("syncQueue"),
      _creationTime: v.number(),
      organizationId: v.string(),
      connectorId: v.id("federationConnectors"),
      status: v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed")
      ),
      syncType: v.union(
        v.literal("scheduled"),
        v.literal("manual"),
        v.literal("webhook")
      ),
      importSessionId: v.optional(v.id("importSessions")),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      queuedAt: v.number(),
      error: v.optional(v.string()),
      stats: v.optional(
        v.object({
          playersProcessed: v.number(),
          playersCreated: v.number(),
          playersUpdated: v.number(),
          conflictsDetected: v.number(),
          conflictsResolved: v.number(),
          duration: v.optional(v.number()),
        })
      ),
      retryCount: v.optional(v.number()),
      maxRetries: v.optional(v.number()),
      nextRetryAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Check if there's already a running job for this org+connector
    const runningJob = await ctx.db
      .query("syncQueue")
      .withIndex("by_org_and_connector", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("connectorId", args.connectorId)
      )
      .filter((q) => q.eq(q.field("status"), "running"))
      .first();

    if (runningJob) {
      console.warn(
        `Cannot claim sync job - already running for org ${args.organizationId}, connector ${args.connectorId}`
      );
      return null;
    }

    // Find pending job
    const pendingJob = await ctx.db
      .query("syncQueue")
      .withIndex("by_org_and_connector", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("connectorId", args.connectorId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (!pendingJob) {
      return null;
    }

    // Atomically mark as running
    await ctx.db.patch(pendingJob._id, {
      status: "running",
      startedAt: Date.now(),
    });

    // Return the claimed job
    return await ctx.db.get(pendingJob._id);
  },
});

/**
 * Mark a sync job as completed with stats
 */
export const completeSyncJob = mutation({
  args: {
    jobId: v.id("syncQueue"),
    stats: v.object({
      playersProcessed: v.number(),
      playersCreated: v.number(),
      playersUpdated: v.number(),
      conflictsDetected: v.number(),
      conflictsResolved: v.number(),
      duration: v.optional(v.number()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error(`Sync job not found: ${args.jobId}`);
    }

    const completedAt = Date.now();
    const duration = job.startedAt ? completedAt - job.startedAt : undefined;

    await ctx.db.patch(args.jobId, {
      status: "completed",
      completedAt,
      stats: {
        ...args.stats,
        duration,
      },
    });
  },
});

/**
 * Mark a sync job as failed with error message
 */
export const failSyncJob = mutation({
  args: {
    jobId: v.id("syncQueue"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error(`Sync job not found: ${args.jobId}`);
    }

    const retryCount = (job.retryCount ?? 0) + 1;
    const maxRetries = job.maxRetries ?? 3;

    // If we haven't exceeded max retries, calculate next retry time with exponential backoff
    if (retryCount < maxRetries) {
      const backoffMinutes = 2 ** retryCount; // 2, 4, 8 minutes
      const nextRetryAt = Date.now() + backoffMinutes * 60 * 1000;

      await ctx.db.patch(args.jobId, {
        status: "pending", // Reset to pending for retry
        error: args.error,
        retryCount,
        nextRetryAt,
        completedAt: undefined, // Clear completion time
        startedAt: undefined, // Clear start time for next attempt
      });

      console.log(
        `Sync job ${args.jobId} failed (attempt ${retryCount}/${maxRetries}). Retry scheduled for ${new Date(nextRetryAt).toISOString()}`
      );
    } else {
      // Max retries exhausted - mark as permanently failed
      await ctx.db.patch(args.jobId, {
        status: "failed",
        error: args.error,
        retryCount,
        completedAt: Date.now(),
      });

      console.error(
        `Sync job ${args.jobId} permanently failed after ${maxRetries} retries: ${args.error}`
      );
    }
  },
});

/**
 * Get sync queue status for an organization
 */
export const getSyncQueueStatus = query({
  args: {
    organizationId: v.string(),
    connectorId: v.optional(v.id("federationConnectors")),
  },
  returns: v.array(
    v.object({
      _id: v.id("syncQueue"),
      _creationTime: v.number(),
      organizationId: v.string(),
      connectorId: v.id("federationConnectors"),
      status: v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed")
      ),
      syncType: v.union(
        v.literal("scheduled"),
        v.literal("manual"),
        v.literal("webhook")
      ),
      importSessionId: v.optional(v.id("importSessions")),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      queuedAt: v.number(),
      error: v.optional(v.string()),
      stats: v.optional(
        v.object({
          playersProcessed: v.number(),
          playersCreated: v.number(),
          playersUpdated: v.number(),
          conflictsDetected: v.number(),
          conflictsResolved: v.number(),
          duration: v.optional(v.number()),
        })
      ),
      retryCount: v.optional(v.number()),
      maxRetries: v.optional(v.number()),
      nextRetryAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const syncQueueQuery = ctx.db
      .query("syncQueue")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      );

    // If specific connector requested, filter to that connector
    if (args.connectorId) {
      const allJobs = await syncQueueQuery.collect();
      return allJobs.filter((job) => job.connectorId === args.connectorId);
    }

    return await syncQueueQuery.collect();
  },
});

/**
 * Clean up old completed/failed sync jobs (for scheduled cleanup cron)
 */
export const cleanupOldSyncJobs = mutation({
  args: {
    olderThanDays: v.number(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000;

    const oldJobs = await ctx.db
      .query("syncQueue")
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("status"), "completed"),
            q.eq(q.field("status"), "failed")
          ),
          q.lt(q.field("completedAt"), cutoffTime)
        )
      )
      .collect();

    let deletedCount = 0;
    for (const job of oldJobs) {
      await ctx.db.delete(job._id);
      deletedCount += 1;
    }

    console.log(
      `Cleaned up ${deletedCount} sync jobs older than ${args.olderThanDays} days`
    );
    return deletedCount;
  },
});

/**
 * Mark stuck jobs as failed (jobs running for >30 minutes)
 */
export const failStuckJobs = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx, _args) => {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

    const stuckJobs = await ctx.db
      .query("syncQueue")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .filter((q) => q.lt(q.field("startedAt"), thirtyMinutesAgo))
      .collect();

    let failedCount = 0;
    for (const job of stuckJobs) {
      await ctx.db.patch(job._id, {
        status: "failed",
        error: "Job timed out after 30 minutes",
        completedAt: Date.now(),
      });
      failedCount += 1;
    }

    if (failedCount > 0) {
      console.warn(`Marked ${failedCount} stuck jobs as failed`);
    }

    return failedCount;
  },
});

/**
 * Get pending jobs ready for retry
 * Returns jobs with nextRetryAt < now and status=pending
 */
export const getJobsReadyForRetry = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("syncQueue"),
      organizationId: v.string(),
      connectorId: v.id("federationConnectors"),
      retryCount: v.optional(v.number()),
      maxRetries: v.optional(v.number()),
      nextRetryAt: v.optional(v.number()),
      error: v.optional(v.string()),
    })
  ),
  handler: async (ctx, _args) => {
    const now = Date.now();

    // Find pending jobs with nextRetryAt in the past
    const jobs = await ctx.db
      .query("syncQueue")
      .withIndex("by_nextRetryAt")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.neq(q.field("nextRetryAt"), undefined),
          q.lte(q.field("nextRetryAt"), now)
        )
      )
      .collect();

    return jobs.map((job) => ({
      _id: job._id,
      organizationId: job.organizationId,
      connectorId: job.connectorId,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      nextRetryAt: job.nextRetryAt,
      error: job.error,
    }));
  },
});
