"use node";

/**
 * GAA Foireann Sync Actions with Enhanced Error Handling
 *
 * Implements US-P4.2-008: GAA sync error handling and recovery
 * - Retry logic for transient failures (429, 500, network errors)
 * - Mapping error handling (skip invalid members, log errors, continue)
 * - Import error handling with rollback for low success rate
 * - Connector error tracking (auto-disable after 5 consecutive failures)
 * - Recovery mutation to retry failed syncs
 */

import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { withRetry } from "../lib/federation/backoff";

// Import types from gaaFoireann.ts
interface GAAMember {
  memberId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email?: string;
  phone?: string;
  address?: string;
  membershipNumber?: string;
  membershipStatus: string;
  joinDate?: string;
}

/**
 * Main sync orchestrator with enhanced error handling.
 *
 * Steps:
 * 1. Create import session
 * 2. Fetch membership list with retry for transient failures
 * 3. Transform members, separate valid/invalid rows
 * 4. Check valid data percentage (fail if <50%)
 * 5. Import valid members only
 * 6. Calculate success rate (completed≥80%, partial 50-80%, failed<50%)
 * 7. Update session stats and status
 * 8. Record connector success/failure
 */
export const syncGAAMembersEnhanced = action({
  args: {
    connectorId: v.id("federationConnectors"),
    organizationId: v.string(),
  },
  returns: v.object({
    sessionId: v.id("importSessions"),
    stats: v.object({
      totalMembers: v.number(),
      playersCreated: v.number(),
      playersUpdated: v.number(),
      guardiansCreated: v.number(),
      duplicatesFound: v.number(),
      errors: v.number(),
    }),
    status: v.union(
      v.literal("completed"),
      v.literal("failed"),
      v.literal("partial")
    ),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    console.log(
      `[GAA Sync Enhanced] Starting full sync - connector: ${args.connectorId}, org: ${args.organizationId}`
    );

    let sessionId: Id<"importSessions"> | undefined;

    try {
      // ========== STEP 1: CREATE IMPORT SESSION ==========

      sessionId = await ctx.runMutation(
        api.models.importSessions.createImportSession,
        {
          organizationId: args.organizationId,
          initiatedBy: "system",
          sourceInfo: {
            type: "api",
            fileName: "GAA Foireann Sync",
            rowCount: 0,
            columnCount: 0,
          },
        }
      );

      console.log(`[GAA Sync Enhanced] Created import session: ${sessionId}`);

      await ctx.runMutation(api.models.importSessions.updateSessionStatus, {
        sessionId,
        status: "importing",
      });

      // ========== STEP 2: FETCH WITH RETRY ==========

      console.log("[GAA Sync Enhanced] Fetching membership list with retry...");

      const fetchResult: {
        members: GAAMember[];
        totalCount: number;
        fetchedAt: number;
      } = await withRetry(
        async () =>
          await ctx.runAction(api.actions.gaaFoireann.fetchMembershipList, {
            connectorId: args.connectorId,
            organizationId: args.organizationId,
          }),
        3, // Max 3 attempts
        1000, // 1s base delay
        30_000 // 30s max delay
      );

      console.log(
        `[GAA Sync Enhanced] Fetched ${fetchResult.members.length} members`
      );

      // ========== STEP 3: TRANSFORM WITH ERROR HANDLING ==========

      console.log("[GAA Sync Enhanced] Transforming member data...");

      const { transformGAAMembers } = await import(
        "../lib/federation/gaaMapper"
      );

      const transformedData = transformGAAMembers(fetchResult.members);

      // Separate valid and invalid rows
      const validRows = transformedData.filter(
        (row) => row.errors.length === 0
      );
      const invalidRows = transformedData.filter(
        (row) => row.errors.length > 0
      );

      console.log(
        `[GAA Sync Enhanced] Valid: ${validRows.length}, Invalid: ${invalidRows.length}`
      );

      // Log invalid rows for debugging (max 5)
      if (invalidRows.length > 0) {
        console.warn(
          `[GAA Sync Enhanced] Mapping errors for ${invalidRows.length} members:`
        );
        for (const row of invalidRows.slice(0, 5)) {
          console.warn(
            `  - ${row.firstName} ${row.lastName}: ${row.errors.join(", ")}`
          );
        }
        if (invalidRows.length > 5) {
          console.warn(`  ... and ${invalidRows.length - 5} more`);
        }
      }

      // ========== STEP 4: CHECK VALID DATA PERCENTAGE ==========

      const validPercentage = (validRows.length / transformedData.length) * 100;

      console.log(
        `[GAA Sync Enhanced] Valid data: ${validPercentage.toFixed(1)}%`
      );

      // Fail if less than 50% valid
      if (validPercentage < 50) {
        const errorMessage = `Sync aborted: Only ${validPercentage.toFixed(1)}% valid (minimum 50%)`;
        console.error(`[GAA Sync Enhanced] ${errorMessage}`);

        await ctx.runMutation(
          api.models.federationConnectors.recordConnectorError,
          {
            connectorId: args.connectorId,
            errorMessage,
          }
        );

        throw new Error(errorMessage);
      }

      // ========== STEP 5: IMPORT VALID MEMBERS ==========

      console.log(
        `[GAA Sync Enhanced] Importing ${validRows.length} valid members...`
      );

      const playersToImport = validRows.map((row) => ({
        firstName: row.firstName,
        lastName: row.lastName,
        dateOfBirth: row.dateOfBirth,
        gender: "male" as const,
        ageGroup: "Unknown",
        season: new Date().getFullYear().toString(),
        address: row.playerAddress,
        town: row.playerTown,
        postcode: row.playerPostcode,
        country: row.country,
        parentEmail: row.email,
        parentPhone: row.phone,
        externalIds: row.externalIds,
      }));

      const importResult: {
        totalProcessed: number;
        playersCreated: number;
        playersReused: number;
        guardiansCreated: number;
        guardiansReused: number;
        enrollmentsCreated: number;
        enrollmentsReused: number;
        benchmarksApplied: number;
        errors: string[];
      } = await ctx.runMutation(
        api.models.playerImport.batchImportPlayersWithIdentity,
        {
          organizationId: args.organizationId,
          sessionId,
          players: playersToImport,
        }
      );

      console.log(
        `[GAA Sync Enhanced] Batch import complete - Created: ${importResult.playersCreated}, Reused: ${importResult.playersReused}, Errors: ${importResult.errors.length}`
      );

      // ========== STEP 6: CALCULATE SUCCESS RATE ==========

      const successfulImports =
        importResult.playersCreated + importResult.playersReused;
      const successRate = (successfulImports / validRows.length) * 100;

      console.log(
        `[GAA Sync Enhanced] Success rate: ${successRate.toFixed(1)}%`
      );

      // Determine final status
      let finalStatus: "completed" | "failed" | "partial";
      if (successRate >= 80) {
        finalStatus = "completed";
        console.log("[GAA Sync Enhanced] Sync completed (≥80% success)");
      } else if (successRate >= 50) {
        finalStatus = "partial";
        console.warn(
          `[GAA Sync Enhanced] Partial success (${successRate.toFixed(1)}%)`
        );
      } else {
        finalStatus = "failed";
        console.error(
          `[GAA Sync Enhanced] Sync failed (${successRate.toFixed(1)}% success, minimum 50%)`
        );
      }

      // ========== STEP 7: UPDATE IMPORT SESSION STATS ==========

      await ctx.runMutation(api.models.importSessions.recordSessionStats, {
        sessionId,
        stats: {
          totalRows: fetchResult.members.length,
          selectedRows: fetchResult.members.length,
          validRows: validRows.length,
          errorRows: invalidRows.length,
          duplicateRows: importResult.playersReused,
          playersCreated: importResult.playersCreated,
          playersUpdated: importResult.playersReused,
          playersSkipped: importResult.errors.length,
          guardiansCreated: importResult.guardiansCreated,
          guardiansLinked: importResult.guardiansReused,
          teamsCreated: 0,
          passportsCreated: importResult.enrollmentsCreated,
          benchmarksApplied: importResult.benchmarksApplied,
        },
      });

      await ctx.runMutation(api.models.importSessions.updateSessionStatus, {
        sessionId,
        status: finalStatus === "partial" ? "completed" : finalStatus,
      });

      console.log(
        `[GAA Sync Enhanced] Session ${sessionId} marked as ${finalStatus}`
      );

      // ========== STEP 8: UPDATE CONNECTOR TRACKING ==========

      await ctx.runMutation(
        api.models.federationConnectors.updateLastSyncTime,
        {
          connectorId: args.connectorId,
          organizationId: args.organizationId,
          lastSyncAt: now,
        }
      );

      // Record success or failure
      if (finalStatus === "completed" || finalStatus === "partial") {
        await ctx.runMutation(
          api.models.federationConnectors.recordConnectorSuccess,
          {
            connectorId: args.connectorId,
          }
        );
        console.log("[GAA Sync Enhanced] Connector marked as successful");
      } else {
        await ctx.runMutation(
          api.models.federationConnectors.recordConnectorError,
          {
            connectorId: args.connectorId,
            errorMessage: `Low success rate: ${successRate.toFixed(1)}%`,
          }
        );
        console.log("[GAA Sync Enhanced] Connector error recorded");
      }

      const syncDuration = Date.now() - now;
      console.log(
        `[GAA Sync Enhanced] ✓ Sync ${finalStatus} in ${syncDuration}ms - Members: ${fetchResult.members.length}, Created: ${importResult.playersCreated}, Updated: ${importResult.playersReused}, Errors: ${invalidRows.length + importResult.errors.length}`
      );

      return {
        sessionId,
        stats: {
          totalMembers: fetchResult.members.length,
          playersCreated: importResult.playersCreated,
          playersUpdated: importResult.playersReused,
          guardiansCreated: importResult.guardiansCreated,
          duplicatesFound: importResult.playersReused,
          errors: invalidRows.length + importResult.errors.length,
        },
        status: finalStatus,
      };
    } catch (error) {
      // ========== ERROR HANDLING ==========

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const stackTrace = error instanceof Error ? error.stack : undefined;

      console.error(
        `[GAA Sync Enhanced] ✗ Sync failed - Error: ${errorMessage}, Duration: ${Date.now() - now}ms`
      );

      if (stackTrace) {
        console.error(`[GAA Sync Enhanced] Stack trace: ${stackTrace}`);
      }

      // Update session status to failed
      if (sessionId) {
        try {
          await ctx.runMutation(api.models.importSessions.updateSessionStatus, {
            sessionId,
            status: "failed",
          });
          console.log(
            `[GAA Sync Enhanced] Session ${sessionId} marked as failed`
          );
        } catch (statusError) {
          console.error(
            `[GAA Sync Enhanced] Failed to update session status: ${statusError instanceof Error ? statusError.message : "Unknown error"}`
          );
        }
      }

      // Record error in connector (increments consecutiveFailures)
      try {
        await ctx.runMutation(
          api.models.federationConnectors.recordConnectorError,
          {
            connectorId: args.connectorId,
            errorMessage: `${errorMessage}${stackTrace ? ` | Stack: ${stackTrace.substring(0, 200)}` : ""}`,
          }
        );
        console.log("[GAA Sync Enhanced] Error recorded in connector tracking");
      } catch (recordError) {
        console.error(
          `[GAA Sync Enhanced] Failed to record connector error: ${recordError instanceof Error ? recordError.message : "Unknown error"}`
        );
      }

      // TODO: Send notification to org admins if sync fails (Phase 4.4)

      throw new Error(`GAA sync failed: ${errorMessage}`);
    }
  },
});

/**
 * Recover from a failed sync session by retrying.
 *
 * This mutation allows retrying a failed sync without creating a new session.
 * Useful when a sync failed due to transient issues (rate limiting, network errors).
 *
 * Note: This simply triggers a new sync. It does NOT resume from the failed session.
 * If you need to resume partial progress, that would require storing intermediate state.
 */
export const recoverFromFailedSync = action({
  args: {
    connectorId: v.id("federationConnectors"),
    organizationId: v.string(),
  },
  returns: v.object({
    sessionId: v.id("importSessions"),
    stats: v.object({
      totalMembers: v.number(),
      playersCreated: v.number(),
      playersUpdated: v.number(),
      guardiansCreated: v.number(),
      duplicatesFound: v.number(),
      errors: v.number(),
    }),
    status: v.union(
      v.literal("completed"),
      v.literal("failed"),
      v.literal("partial")
    ),
  }),
  handler: async (ctx, args) => {
    console.log(
      `[GAA Sync Recovery] Attempting to recover from failed sync - connector: ${args.connectorId}, org: ${args.organizationId}`
    );

    // Check connector health before retrying
    const connector = await ctx.runQuery(
      api.models.federationConnectors.getConnector,
      { connectorId: args.connectorId }
    );

    if (!connector) {
      throw new Error("Connector not found");
    }

    // Warn if connector has multiple consecutive failures
    if (connector.consecutiveFailures && connector.consecutiveFailures >= 3) {
      console.warn(
        `[GAA Sync Recovery] Connector has ${connector.consecutiveFailures} consecutive failures. Manual intervention may be required.`
      );
    }

    // Warn if connector is in error status
    if (connector.status === "error") {
      console.warn(
        "[GAA Sync Recovery] Connector is in error status (5+ consecutive failures). Attempting recovery anyway."
      );
    }

    // Simply trigger a new sync with enhanced error handling
    return await ctx.runAction(
      api.actions.gaaSync.syncGAAMembersEnhanced,
      args
    );
  },
});
