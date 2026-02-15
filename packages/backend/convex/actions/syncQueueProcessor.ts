"use node";

/**
 * Sync Queue Processor
 *
 * Processes pending sync jobs that are ready for retry.
 * Called by cron job every 5 minutes.
 */

import { v } from "convex/values";
import { api } from "../_generated/api";
import { internalAction } from "../_generated/server";

/**
 * Process Retry Queue
 *
 * Finds all pending sync jobs with nextRetryAt < now and retries them.
 * Called by cron job every 5 minutes.
 */
export const processRetryQueue = internalAction({
  args: {},
  returns: v.object({
    jobsProcessed: v.number(),
    successfulRetries: v.number(),
    failedRetries: v.number(),
  }),
  handler: async (ctx) => {
    console.log("[Retry Queue] Processing retry queue...");

    let jobsProcessed = 0;
    let successfulRetries = 0;
    let failedRetries = 0;

    try {
      // Get jobs ready for retry
      const jobs = await ctx.runQuery(
        api.models.syncQueue.getJobsReadyForRetry,
        {}
      );

      console.log(`[Retry Queue] Found ${jobs.length} jobs ready for retry`);

      // Process each job
      for (const job of jobs) {
        jobsProcessed += 1;

        console.log(
          `[Retry Queue] Retrying job ${job._id} (attempt ${(job.retryCount ?? 0) + 1}/${job.maxRetries ?? 3}) for org ${job.organizationId}`
        );

        try {
          // Retry the sync using syncWithQueue
          const result = await ctx.runAction(
            api.actions.federationSyncEngine.syncWithQueue,
            {
              organizationId: job.organizationId,
              connectorId: job.connectorId,
            }
          );

          if (result.success) {
            successfulRetries += 1;
            console.log(`[Retry Queue] Retry successful for job ${job._id}`, {
              stats: result.stats,
            });
          } else {
            failedRetries += 1;
            console.error(
              `[Retry Queue] Retry failed for job ${job._id}: ${result.error}`
            );
          }
        } catch (error) {
          failedRetries += 1;
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.error(
            `[Retry Queue] Exception during retry for job ${job._id}: ${errorMessage}`
          );
        }

        // Small delay between retries to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second
      }

      console.log("[Retry Queue] Processing complete", {
        jobsProcessed,
        successfulRetries,
        failedRetries,
      });

      return {
        jobsProcessed,
        successfulRetries,
        failedRetries,
      };
    } catch (error) {
      console.error("[Retry Queue] Fatal error processing retry queue", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  },
});
