"use node";

/**
 * Federation Sync Scheduler
 *
 * Handles scheduled federation syncs triggered by cron jobs.
 * Orchestrates sync jobs across multiple organizations with rate limiting.
 */

import { v } from "convex/values";
import { api } from "../_generated/api";
import { internalAction } from "../_generated/server";

/**
 * Scheduled Federation Sync (triggered by cron)
 *
 * Runs nightly to sync all enabled federation connectors.
 * - Queries all active connectors with syncConfig.enabled = true
 * - For each connector, syncs all connected organizations
 * - Rate limits to 5 concurrent syncs to avoid overwhelming APIs
 * - Waits 1 minute between each org sync to spread load
 *
 * Called by cron job at 2 AM UTC daily.
 */
export const scheduledFederationSync = internalAction({
  args: {},
  returns: v.object({
    connectorsProcessed: v.number(),
    organizationsSynced: v.number(),
    successfulSyncs: v.number(),
    failedSyncs: v.number(),
  }),
  handler: async (ctx) => {
    const startTime = Date.now();

    console.log("[Scheduled Sync] Starting nightly federation sync", {
      timestamp: new Date(startTime).toISOString(),
    });

    let connectorsProcessed = 0;
    let organizationsSynced = 0;
    let successfulSyncs = 0;
    let failedSyncs = 0;

    try {
      // ===== STEP 1: Get all active connectors with sync enabled =====

      const activeConnectors = await ctx.runQuery(
        api.models.federationConnectors.listConnectors,
        { status: "active" }
      );

      console.log(
        `[Scheduled Sync] Found ${activeConnectors.length} active connectors`
      );

      // Filter to only those with sync enabled
      const enabledConnectors = activeConnectors.filter(
        (connector) => connector.syncConfig.enabled === true
      );

      console.log(
        `[Scheduled Sync] ${enabledConnectors.length} connectors have sync enabled`
      );

      // ===== STEP 2: Process each enabled connector =====

      for (const connector of enabledConnectors) {
        connectorsProcessed += 1;

        console.log(
          `[Scheduled Sync] Processing connector: ${connector.name} (${connector._id})`
        );

        // Get all connected organizations for this connector
        const connectedOrgs = connector.connectedOrganizations;

        console.log(
          `[Scheduled Sync] Connector ${connector.name} has ${connectedOrgs.length} connected organizations`
        );

        // ===== STEP 3: Sync each organization (with rate limiting) =====

        for (const org of connectedOrgs) {
          organizationsSynced += 1;

          console.log(
            `[Scheduled Sync] Syncing organization ${org.organizationId} via connector ${connector.name}`
          );

          try {
            // Call the GAA sync action
            // TODO: This assumes all connectors use GAA sync - in future, make this dynamic based on connectorType
            const syncResult = await ctx.runAction(
              api.actions.gaaFoireann.syncGAAMembers,
              {
                connectorId: connector._id,
                organizationId: org.organizationId,
              }
            );

            if (syncResult.status === "completed") {
              successfulSyncs += 1;

              console.log(
                `[Scheduled Sync] SUCCESS - Org ${org.organizationId}`,
                {
                  stats: syncResult.stats,
                  sessionId: syncResult.sessionId,
                }
              );

              // Update connector's lastSyncAt timestamp for this org
              await ctx.runMutation(
                api.models.federationConnectors.updateLastSyncTime,
                {
                  connectorId: connector._id,
                  organizationId: org.organizationId,
                  lastSyncAt: Date.now(),
                }
              );

              // Record connector success
              await ctx.runMutation(
                api.models.federationConnectors.recordConnectorSuccess,
                { connectorId: connector._id }
              );
            } else {
              failedSyncs += 1;

              console.error(
                `[Scheduled Sync] FAILED - Org ${org.organizationId}`,
                { status: syncResult.status }
              );

              // Record connector error
              await ctx.runMutation(
                api.models.federationConnectors.recordConnectorError,
                {
                  connectorId: connector._id,
                  errorMessage: "Sync failed with status: failed",
                }
              );

              // TODO: Send notification to org admins about failed sync
            }
          } catch (error) {
            failedSyncs += 1;

            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";

            console.error(
              `[Scheduled Sync] ERROR - Org ${org.organizationId}`,
              {
                error: errorMessage,
              }
            );

            // Record connector error
            await ctx.runMutation(
              api.models.federationConnectors.recordConnectorError,
              {
                connectorId: connector._id,
                errorMessage,
              }
            );

            // TODO: Send notification to org admins about failed sync
          }

          // ===== RATE LIMITING: Wait 1 minute between org syncs =====

          // Skip wait on last organization
          const isLastOrg =
            connectedOrgs.indexOf(org) === connectedOrgs.length - 1;
          if (!isLastOrg) {
            console.log(
              "[Scheduled Sync] Waiting 60 seconds before next organization..."
            );
            await new Promise((resolve) => setTimeout(resolve, 60_000)); // 60 seconds
          }
        }
      }

      // ===== STEP 4: Log final results =====

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // seconds

      console.log("[Scheduled Sync] Nightly sync completed", {
        connectorsProcessed,
        organizationsSynced,
        successfulSyncs,
        failedSyncs,
        durationSeconds: duration,
        timestamp: new Date(endTime).toISOString(),
      });

      return {
        connectorsProcessed,
        organizationsSynced,
        successfulSyncs,
        failedSyncs,
      };
    } catch (error) {
      console.error("[Scheduled Sync] Fatal error during nightly sync", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  },
});
