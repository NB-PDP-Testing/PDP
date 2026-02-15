"use node";

/**
 * Federation Sync Engine with Conflict Resolution
 *
 * Orchestrates the complete sync process including:
 * - Fetching federation data
 * - Finding local player matches
 * - Detecting changes and conflicts
 * - Resolving conflicts using configured strategy
 * - Applying atomic updates to local data
 * - Recording sync history for audit trail
 */

import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type ActionCtx, action } from "../_generated/server";
import {
  type ChangeSummary,
  type ConflictResolutionStrategy,
  conflictResolutionStrategyValidator,
  detectChanges,
  type ResolvedData,
  resolveConflicts,
} from "../lib/federation/changeDetector";

// ===== TypeScript Types =====

/**
 * GAA member data from federation API
 */
type GAAMember = {
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
};

/**
 * Local player data from orgPlayerEnrollments + playerIdentities
 */
type LocalPlayer = {
  enrollmentId: Id<"orgPlayerEnrollments">;
  identityId: Id<"playerIdentities">;
  externalIds?: Record<string, string>;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  address?: string;
  lastSyncedAt?: number;
  lastSyncedData?: Record<string, string | undefined>;
};

/**
 * Sync stats tracked during sync process
 */
type SyncStats = {
  playersProcessed: number;
  playersCreated: number;
  playersUpdated: number;
  conflictsDetected: number;
  conflictsResolved: number;
  errors: number;
};

// ===== Main Sync Action =====

/**
 * Sync federation data with conflict resolution
 *
 * Main sync orchestrator that:
 * 1. Fetches federation data using connector's sync action
 * 2. For each member, finds matching local player by externalIds
 * 3. If no match, creates new player (no conflict)
 * 4. If match found, detects changes and conflicts
 * 5. Resolves conflicts using configured strategy
 * 6. Applies resolved changes atomically
 * 7. Records sync history with conflict details
 */
export const syncWithConflictResolution = action({
  args: {
    connectorId: v.id("federationConnectors"),
    organizationId: v.string(),
    strategy: v.optional(conflictResolutionStrategyValidator),
  },
  returns: v.object({
    sessionId: v.id("importSessions"),
    stats: v.object({
      playersProcessed: v.number(),
      playersCreated: v.number(),
      playersUpdated: v.number(),
      conflictsDetected: v.number(),
      conflictsResolved: v.number(),
      errors: v.number(),
    }),
    status: v.union(v.literal("completed"), v.literal("failed")),
    conflictDetails: v.array(
      v.object({
        playerId: v.string(),
        playerName: v.string(),
        conflicts: v.array(
          v.object({
            field: v.string(),
            federationValue: v.optional(v.string()),
            localValue: v.optional(v.string()),
            resolvedValue: v.optional(v.string()),
            strategy: v.string(),
          })
        ),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const strategy: ConflictResolutionStrategy =
      args.strategy || "federation_wins";

    console.log(
      `[Sync Engine] Starting sync with conflict resolution - connector: ${args.connectorId}, org: ${args.organizationId}, strategy: ${strategy}, timestamp: ${now}`
    );

    // Initialize stats
    const stats: SyncStats = {
      playersProcessed: 0,
      playersCreated: 0,
      playersUpdated: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      errors: 0,
    };

    // Track conflict details for audit trail
    const conflictDetails: Array<{
      playerId: string;
      playerName: string;
      conflicts: Array<{
        field: string;
        federationValue: string | undefined;
        localValue: string | undefined;
        resolvedValue: string | undefined;
        strategy: string;
      }>;
    }> = [];

    let sessionId: Id<"importSessions"> | undefined;

    try {
      // ========== STEP 1: CREATE IMPORT SESSION ==========

      console.log("[Sync Engine] Creating import session...");

      sessionId = await ctx.runMutation(
        api.models.importSessions.createImportSession,
        {
          organizationId: args.organizationId,
          initiatedBy: "system", // Automated sync
          sourceInfo: {
            type: "api",
            fileName: `Federation Sync (${strategy})`,
            rowCount: 0, // Will be updated
            columnCount: 0,
          },
        }
      );

      if (!sessionId) {
        throw new Error("Failed to create import session");
      }

      await ctx.runMutation(api.models.importSessions.updateSessionStatus, {
        sessionId,
        status: "importing",
      });

      console.log(`[Sync Engine] Created import session: ${sessionId}`);

      // ========== STEP 2: FETCH FEDERATION DATA ==========

      console.log("[Sync Engine] Fetching federation data...");

      // Use existing GAA sync action to fetch members
      const fetchResult: {
        members: GAAMember[];
        totalCount: number;
        fetchedAt: number;
      } = await ctx.runAction(api.actions.gaaFoireann.fetchMembershipList, {
        connectorId: args.connectorId,
        organizationId: args.organizationId,
      });

      console.log(
        `[Sync Engine] Fetched ${fetchResult.members.length} members from federation`
      );

      // ========== STEP 3: PROCESS EACH FEDERATION MEMBER ==========

      console.log("[Sync Engine] Processing members...");

      for (const member of fetchResult.members) {
        stats.playersProcessed += 1;

        try {
          // Find matching local player by externalIds.foireann
          const localPlayer = await findLocalPlayerByExternalId(
            ctx,
            args.organizationId,
            member.memberId
          );

          if (localPlayer) {
            // Match found - detect changes and conflicts
            console.log(
              `[Sync Engine] Checking for changes: ${member.firstName} ${member.lastName} (${member.memberId})`
            );

            const changeSummary = await processExistingPlayer(ctx, {
              member,
              localPlayer,
              strategy,
              stats,
              conflictDetails,
            });

            if (changeSummary.hasChanges) {
              stats.playersUpdated += 1;
            }
          } else {
            // No match found - create new player (no conflict)
            console.log(
              `[Sync Engine] Creating new player: ${member.firstName} ${member.lastName} (${member.memberId})`
            );

            await createNewPlayer(ctx, args.organizationId, sessionId, member);

            stats.playersCreated += 1;
          }
        } catch (error) {
          console.error(
            `[Sync Engine] Error processing member ${member.memberId}:`,
            error
          );
          stats.errors += 1;
        }
      }

      // ========== STEP 4: UPDATE SESSION STATS ==========

      console.log("[Sync Engine] Updating session stats...");

      await ctx.runMutation(api.models.importSessions.recordSessionStats, {
        sessionId,
        stats: {
          totalRows: fetchResult.members.length,
          selectedRows: fetchResult.members.length,
          validRows: fetchResult.members.length - stats.errors,
          errorRows: stats.errors,
          duplicateRows: stats.playersUpdated,
          playersCreated: stats.playersCreated,
          playersUpdated: stats.playersUpdated,
          playersSkipped: stats.errors,
          guardiansCreated: 0,
          guardiansLinked: 0,
          teamsCreated: 0,
          passportsCreated: stats.playersCreated,
          benchmarksApplied: 0,
        },
      });

      // ========== STEP 5: MARK SESSION COMPLETE ==========

      await ctx.runMutation(api.models.importSessions.updateSessionStatus, {
        sessionId,
        status: "completed",
      });

      // ========== STEP 6: UPDATE CONNECTOR LAST SYNC ==========

      await ctx.runMutation(
        api.models.federationConnectors.updateLastSyncTime,
        {
          connectorId: args.connectorId,
          organizationId: args.organizationId,
          lastSyncAt: now,
        }
      );

      const syncDuration = Date.now() - now;
      console.log(
        `[Sync Engine] ✓ Sync completed successfully in ${syncDuration}ms - Processed: ${stats.playersProcessed}, Created: ${stats.playersCreated}, Updated: ${stats.playersUpdated}, Conflicts: ${stats.conflictsDetected}`
      );

      return {
        sessionId,
        stats,
        status: "completed" as const,
        conflictDetails,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error(
        `[Sync Engine] ✗ Sync failed - Error: ${errorMessage}, Duration: ${Date.now() - now}ms`
      );

      // Update session status to failed if session was created
      if (sessionId) {
        try {
          await ctx.runMutation(api.models.importSessions.updateSessionStatus, {
            sessionId,
            status: "failed",
          });
        } catch (statusError) {
          console.error(
            `[Sync Engine] Failed to update session status: ${statusError instanceof Error ? statusError.message : "Unknown error"}`
          );
        }
      }

      throw new Error(`Sync with conflict resolution failed: ${errorMessage}`);
    }
  },
});

// ===== Helper Functions =====

/**
 * Find local player by external ID (foireann membership ID)
 */
async function findLocalPlayerByExternalId(
  ctx: ActionCtx,
  organizationId: string,
  membershipId: string
): Promise<LocalPlayer | null> {
  // Query all enrollments for this organization
  const enrollments = (await ctx.runQuery(
    api.models.orgPlayerEnrollments.listEnrollmentsByOrganization,
    { organizationId }
  )) as Array<{
    _id: Id<"orgPlayerEnrollments">;
    playerIdentityId: Id<"playerIdentities">;
  }>;

  // For each enrollment, check if playerIdentity has matching externalId
  for (const enrollment of enrollments) {
    const identity = (await ctx.runQuery(
      api.models.playerIdentities.getPlayerIdentity,
      { identityId: enrollment.playerIdentityId }
    )) as {
      _id: Id<"playerIdentities">;
      externalIds?: Record<string, string>;
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      email?: string;
      phone?: string;
      address?: string;
      lastSyncedAt?: number;
      lastSyncedData?: Record<string, string | undefined>;
    } | null;

    if (!identity) {
      continue;
    }

    // Check if externalIds.foireann matches
    if (identity.externalIds?.foireann === membershipId) {
      return {
        enrollmentId: enrollment._id,
        identityId: identity._id,
        externalIds: identity.externalIds,
        firstName: identity.firstName,
        lastName: identity.lastName,
        dateOfBirth: identity.dateOfBirth,
        email: identity.email,
        phone: identity.phone,
        address: identity.address,
        lastSyncedAt: identity.lastSyncedAt,
        lastSyncedData: identity.lastSyncedData,
      };
    }
  }

  return null;
}

/**
 * Create new player from federation data (no conflict)
 */
async function createNewPlayer(
  ctx: ActionCtx,
  organizationId: string,
  sessionId: Id<"importSessions">,
  member: GAAMember
): Promise<void> {
  // Use existing batch import to create player
  await ctx.runMutation(
    api.models.playerImport.batchImportPlayersWithIdentity,
    {
      organizationId,
      sessionId,
      players: [
        {
          firstName: member.firstName,
          lastName: member.lastName,
          dateOfBirth: member.dateOfBirth,
          gender: "male" as const, // GAA doesn't provide gender
          ageGroup: "Unknown", // Will be calculated
          season: new Date().getFullYear().toString(),
          address: member.address,
          town: undefined,
          postcode: undefined,
          country: undefined,
          parentEmail: member.email,
          parentPhone: member.phone,
          externalIds: {
            foireann: member.memberId,
          },
        },
      ],
    }
  );
}

/**
 * Process existing player - detect changes, resolve conflicts, update
 */
async function processExistingPlayer(
  ctx: ActionCtx,
  options: {
    member: GAAMember;
    localPlayer: LocalPlayer;
    strategy: ConflictResolutionStrategy;
    stats: SyncStats;
    conflictDetails: Array<{
      playerId: string;
      playerName: string;
      conflicts: Array<{
        field: string;
        federationValue: string | undefined;
        localValue: string | undefined;
        resolvedValue: string | undefined;
        strategy: string;
      }>;
    }>;
  }
): Promise<ChangeSummary> {
  const { member, localPlayer, strategy, stats, conflictDetails } = options;
  // Build federation data object
  const federationData: Record<string, string | undefined> = {
    firstName: member.firstName,
    lastName: member.lastName,
    dateOfBirth: member.dateOfBirth,
    email: member.email,
    phone: member.phone,
    address: member.address,
  };

  // Build local data object
  const localData: Record<string, string | undefined> = {
    firstName: localPlayer.firstName,
    lastName: localPlayer.lastName,
    dateOfBirth: localPlayer.dateOfBirth,
    email: localPlayer.email,
    phone: localPlayer.phone,
    address: localPlayer.address,
  };

  // Detect changes and conflicts
  const changeSummary = detectChanges(
    federationData,
    localData,
    localPlayer.lastSyncedData
  );

  if (!changeSummary.hasChanges) {
    console.log(
      `[Sync Engine] No changes detected for player ${localPlayer.identityId}`
    );
    return changeSummary;
  }

  // If conflicts exist, resolve them
  let finalData: Record<string, string | undefined> = { ...federationData };
  let resolutionNotes: ResolvedData["resolutionNotes"] = [];

  if (changeSummary.conflicts.length > 0) {
    console.log(
      `[Sync Engine] Detected ${changeSummary.conflicts.length} conflicts for player ${localPlayer.identityId}`
    );

    stats.conflictsDetected += changeSummary.conflicts.length;

    const resolved = resolveConflicts(
      changeSummary.conflicts,
      federationData,
      localData,
      strategy
    );

    finalData = resolved.data;
    resolutionNotes = resolved.resolutionNotes;

    stats.conflictsResolved += changeSummary.conflicts.length;

    // Record conflict details for audit trail
    conflictDetails.push({
      playerId: localPlayer.identityId,
      playerName: `${member.firstName} ${member.lastName}`,
      conflicts: resolutionNotes.map((note) => ({
        field: note.field,
        federationValue: note.federationValue,
        localValue: note.localValue,
        resolvedValue: note.resolvedValue,
        strategy: note.strategy,
      })),
    });

    console.log(`[Sync Engine] Resolved conflicts using strategy: ${strategy}`);
  }

  // Apply updates atomically
  await ctx.runMutation(api.models.playerIdentities.updatePlayerIdentity, {
    playerIdentityId: localPlayer.identityId,
    firstName: finalData.firstName,
    lastName: finalData.lastName,
    dateOfBirth: finalData.dateOfBirth,
    email: finalData.email,
    phone: finalData.phone,
    address: finalData.address,
    lastSyncedAt: Date.now(),
    lastSyncedData: federationData, // Store current federation data
  });

  console.log(
    `[Sync Engine] Updated player ${localPlayer.identityId} - Changed fields: ${changeSummary.changedFields.join(", ")}, Conflicts: ${changeSummary.conflicts.length}`
  );

  return changeSummary;
}
