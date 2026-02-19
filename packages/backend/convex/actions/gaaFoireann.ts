"use node";

/**
 * GAA Foireann API Integration Actions
 *
 * Handles fetching membership data from the GAA Foireann API including:
 * - Membership list with pagination
 * - Individual member details
 * - Full sync orchestration
 *
 * Uses FederationApiClient for authenticated requests with retry logic.
 */

import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { createFederationApiClient } from "../lib/federation/apiClient";

// ===== TypeScript Types =====

/**
 * GAA member data from membership list endpoint
 */
interface GAAMember {
  memberId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date string (YYYY-MM-DD)
  email?: string;
  phone?: string;
  address?: string;
  membershipNumber?: string; // Format: XXX-XXXXX-XXX
  membershipStatus: string; // "Active", "Lapsed", etc.
  joinDate?: string; // ISO date string
}

/**
 * Response from membership list endpoint
 */
interface MembershipListResponse {
  members: GAAMember[];
  page: number;
  perPage: number;
  totalCount: number;
  hasMore: boolean;
}

/**
 * Detailed GAA member data from member detail endpoint
 * Includes additional fields not in membership list
 */
interface GAAMemberDetail extends GAAMember {
  // Additional fields from detail endpoint
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalConditions?: string;
  allergies?: string;
  playerPositions?: string[]; // e.g., ["Full Forward", "Midfielder"]
  teams?: Array<{
    teamId: string;
    teamName: string;
    ageGroup: string;
  }>;
}

/**
 * Response from member detail endpoint
 */
interface MemberDetailResponse {
  member: GAAMemberDetail;
}

// ===== Fetch Membership List =====

/**
 * Fetch full membership list from GAA Foireann API with pagination support.
 *
 * Fetches all pages automatically to get complete member list.
 * Handles pagination (100 members per page).
 */
export const fetchMembershipList = action({
  args: {
    connectorId: v.id("federationConnectors"),
    organizationId: v.string(),
  },
  returns: v.object({
    members: v.array(
      v.object({
        memberId: v.string(),
        firstName: v.string(),
        lastName: v.string(),
        dateOfBirth: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        membershipNumber: v.optional(v.string()),
        membershipStatus: v.string(),
        joinDate: v.optional(v.string()),
      })
    ),
    totalCount: v.number(),
    fetchedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    console.log(
      `[GAA Foireann] Starting membership fetch - connector: ${args.connectorId}, org: ${args.organizationId}, timestamp: ${now}`
    );

    try {
      // Load connector configuration
      const connector = await ctx.runQuery(
        api.models.federationConnectors.getConnector,
        { connectorId: args.connectorId }
      );

      if (!connector) {
        console.error("[GAA Foireann] Connector not found");
        throw new Error("Connector not found");
      }

      // Find organization's federation club ID
      const orgConnection = connector.connectedOrganizations.find(
        (org: {
          organizationId: string;
          federationOrgId: string;
          enabledAt: number;
          lastSyncAt?: number;
        }) => org.organizationId === args.organizationId
      );

      if (!orgConnection) {
        console.error(
          `[GAA Foireann] Organization ${args.organizationId} not connected to connector`
        );
        throw new Error(
          "Organization not connected to this federation connector"
        );
      }

      const clubId = orgConnection.federationOrgId;

      // Create API client
      const apiClient = createFederationApiClient(ctx, args.connectorId);

      // Fetch all pages of members
      const allMembers: GAAMember[] = [];
      let page = 1;
      let hasMore = true;
      const perPage = 100;

      console.log(
        `[GAA Foireann] Starting membership fetch for club ${clubId}`
      );

      while (hasMore) {
        console.log(`[GAA Foireann] Fetching page ${page}...`);

        try {
          // Build endpoint URL with pagination
          // Replace {clubId} placeholder with actual club ID
          const endpoint = `/clubs/${clubId}/members?page=${page}&limit=${perPage}`;

          // Make API request
          const response =
            await apiClient.request<MembershipListResponse>(endpoint);

          // Add members from this page
          allMembers.push(...response.members);

          console.log(
            `[GAA Foireann] Page ${page}: fetched ${response.members.length} members`
          );

          // Check if there are more pages
          hasMore = response.hasMore;
          page += 1;

          // Safety check: prevent infinite loops
          if (page > 100) {
            console.warn(
              "[GAA Foireann] Reached page limit (100 pages), stopping pagination"
            );
            break;
          }
        } catch (error) {
          console.error(`[GAA Foireann] Error fetching page ${page}:`, error);

          // Handle specific error cases as per acceptance criteria
          if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase();

            // 401 Unauthorized - authentication failed
            if (
              errorMessage.includes("401") ||
              errorMessage.includes("unauthorized")
            ) {
              throw new Error(
                "Authentication failed: Invalid or expired credentials. Please reconnect to GAA Foireann."
              );
            }

            // 404 Not Found - club not found
            if (
              errorMessage.includes("404") ||
              errorMessage.includes("not found")
            ) {
              throw new Error(
                `Club not found: The club ID ${clubId} does not exist in GAA Foireann system.`
              );
            }

            // 429 Rate Limit - too many requests
            if (
              errorMessage.includes("429") ||
              errorMessage.includes("rate limit")
            ) {
              throw new Error(
                "Rate limit exceeded: Too many requests to GAA Foireann API. Please try again later."
              );
            }

            // 500 Server Error - Foireann API issue
            if (
              errorMessage.includes("500") ||
              errorMessage.includes("server error")
            ) {
              throw new Error(
                "GAA Foireann API server error: The Foireann service is experiencing issues. Please try again later."
              );
            }
          }

          throw new Error(
            `Failed to fetch membership list (page ${page}): ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      const fetchDuration = Date.now() - now;
      console.log(
        `[GAA Foireann] Fetch complete: ${allMembers.length} total members in ${fetchDuration}ms`
      );

      // Log successful sync attempt
      console.log(
        `[GAA Foireann] Sync successful - Members: ${allMembers.length}, Duration: ${fetchDuration}ms, Timestamp: ${now}`
      );

      return {
        members: allMembers,
        totalCount: allMembers.length,
        fetchedAt: now,
      };
    } catch (error) {
      // Log failed sync attempt
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `[GAA Foireann] Sync failed - Error: ${errorMessage}, Timestamp: ${now}`
      );

      throw error;
    }
  },
});

// ===== Fetch Member Detail =====

/**
 * Fetch detailed information for a specific member from GAA Foireann API.
 *
 * Returns richer data than membership list including emergency contacts,
 * medical info, player positions, and team assignments.
 */
export const fetchMemberDetail = action({
  args: {
    connectorId: v.id("federationConnectors"),
    memberId: v.string(),
  },
  returns: v.object({
    member: v.object({
      memberId: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      address: v.optional(v.string()),
      membershipNumber: v.optional(v.string()),
      membershipStatus: v.string(),
      joinDate: v.optional(v.string()),
      // Additional detail fields
      emergencyContactName: v.optional(v.string()),
      emergencyContactPhone: v.optional(v.string()),
      medicalConditions: v.optional(v.string()),
      allergies: v.optional(v.string()),
      playerPositions: v.optional(v.array(v.string())),
      teams: v.optional(
        v.array(
          v.object({
            teamId: v.string(),
            teamName: v.string(),
            ageGroup: v.string(),
          })
        )
      ),
    }),
    fetchedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    console.log(
      `[GAA Foireann] Fetching member detail - connector: ${args.connectorId}, member: ${args.memberId}, timestamp: ${now}`
    );

    try {
      // Load connector configuration
      const connector = await ctx.runQuery(
        api.models.federationConnectors.getConnector,
        { connectorId: args.connectorId }
      );

      if (!connector) {
        console.error("[GAA Foireann] Connector not found");
        throw new Error("Connector not found");
      }

      // Create API client
      const apiClient = createFederationApiClient(ctx, args.connectorId);

      // Build endpoint URL
      const endpoint = `/members/${args.memberId}`;

      console.log(
        `[GAA Foireann] Requesting member detail for ${args.memberId}`
      );

      try {
        // Make API request
        const response =
          await apiClient.request<MemberDetailResponse>(endpoint);

        const fetchDuration = Date.now() - now;
        console.log(
          `[GAA Foireann] Member detail fetched successfully in ${fetchDuration}ms`
        );

        return {
          member: response.member,
          fetchedAt: now,
        };
      } catch (error) {
        console.error("[GAA Foireann] Error fetching member detail:", error);

        // Handle specific error cases
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();

          // 404 Not Found - member not found
          if (
            errorMessage.includes("404") ||
            errorMessage.includes("not found")
          ) {
            throw new Error(
              `Member not found: The member ID ${args.memberId} does not exist in GAA Foireann system.`
            );
          }

          // 403 Forbidden - no access to this member
          if (
            errorMessage.includes("403") ||
            errorMessage.includes("forbidden")
          ) {
            throw new Error(
              `Access denied: You do not have permission to view details for member ${args.memberId}.`
            );
          }

          // 401 Unauthorized - authentication failed
          if (
            errorMessage.includes("401") ||
            errorMessage.includes("unauthorized")
          ) {
            throw new Error(
              "Authentication failed: Invalid or expired credentials. Please reconnect to GAA Foireann."
            );
          }
        }

        throw new Error(
          `Failed to fetch member detail: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    } catch (error) {
      // Log failed fetch attempt
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `[GAA Foireann] Member detail fetch failed - Error: ${errorMessage}, Timestamp: ${now}`
      );

      throw error;
    }
  },
});

// ===== Sync GAA Members (Full Orchestrator) =====

/**
 * Main sync orchestrator: fetch membership list, transform data, create import session, and import members.
 *
 * This is the primary entry point for syncing GAA members from Foireann to PlayerARC.
 * Creates an import session and reuses existing import pipeline logic.
 *
 * Steps:
 * 1. Create import session with status 'importing'
 * 2. Fetch membership list using fetchMembershipList
 * 3. Transform members using transformGAAMembers from gaaMapper
 * 4. Call batchImportPlayersWithIdentity to create/update players
 * 5. Update import session stats and status
 * 6. Update connector's lastSyncAt timestamp
 * 7. On error, set session status to 'failed' and log error details
 */
export const syncGAAMembers = action({
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
    status: v.union(v.literal("completed"), v.literal("failed")),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    sessionId: Id<"importSessions">;
    stats: {
      totalMembers: number;
      playersCreated: number;
      playersUpdated: number;
      guardiansCreated: number;
      duplicatesFound: number;
      errors: number;
    };
    status: "completed" | "failed";
  }> => {
    const now = Date.now();

    console.log(
      `[GAA Sync] Starting full sync - connector: ${args.connectorId}, org: ${args.organizationId}, timestamp: ${now}`
    );

    let sessionId: Id<"importSessions"> | undefined;

    try {
      // ========== STEP 1: CREATE IMPORT SESSION ==========

      // Create import session with 'importing' status
      // Source type is 'federation_sync' to distinguish from file uploads
      sessionId = await ctx.runMutation(
        api.models.importSessions.createImportSession,
        {
          organizationId: args.organizationId,
          initiatedBy: "system", // Federation sync is system-initiated
          sourceInfo: {
            type: "api",
            fileName: "GAA Foireann Sync",
            rowCount: 0, // Will be updated after fetch
            columnCount: 0, // N/A for API sync
          },
        }
      );

      console.log(`[GAA Sync] Created import session: ${sessionId}`);

      // Transition to 'importing' status
      await ctx.runMutation(api.models.importSessions.updateSessionStatus, {
        sessionId,
        status: "importing",
      });

      // ========== STEP 2: FETCH MEMBERSHIP LIST ==========

      console.log("[GAA Sync] Fetching membership list...");

      const fetchResult: {
        members: GAAMember[];
        totalCount: number;
        fetchedAt: number;
      } = await ctx.runAction(api.actions.gaaFoireann.fetchMembershipList, {
        connectorId: args.connectorId,
        organizationId: args.organizationId,
      });

      console.log(
        `[GAA Sync] Fetched ${fetchResult.members.length} members from Foireann API`
      );

      // ========== STEP 3: TRANSFORM MEMBERS ==========

      console.log("[GAA Sync] Transforming member data...");

      // Import transformer dynamically (actions can import from lib/)
      const { transformGAAMembers } = await import(
        "../lib/federation/gaaMapper"
      );

      const transformedData = transformGAAMembers(fetchResult.members);

      console.log(`[GAA Sync] Transformed ${transformedData.length} members`);

      // Count validation errors
      const rowsWithErrors = transformedData.filter(
        (row) => row.errors.length > 0
      );

      console.log(
        `[GAA Sync] ${rowsWithErrors.length} rows have validation errors`
      );

      // ========== STEP 4: IMPORT MEMBERS ==========

      console.log("[GAA Sync] Starting batch import...");

      // Convert transformed data to player import format
      const playersToImport = transformedData.map((row) => ({
        firstName: row.firstName,
        lastName: row.lastName,
        dateOfBirth: row.dateOfBirth,
        gender: "male" as const, // TODO: GAA API doesn't provide gender, default to male for now
        ageGroup: "Unknown", // TODO: Calculate age group from DOB
        season: new Date().getFullYear().toString(), // Current year
        address: row.playerAddress,
        town: row.playerTown,
        postcode: row.playerPostcode,
        country: row.country,
        parentEmail: row.email, // GAA member email becomes parent email
        parentPhone: row.phone,
        externalIds: row.externalIds, // GAA membership number stored in externalIds.foireann
      }));

      // Call existing batch import mutation
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
        `[GAA Sync] Batch import complete - Created: ${importResult.playersCreated}, Reused: ${importResult.playersReused}`
      );

      // ========== STEP 5: UPDATE IMPORT SESSION STATS ==========

      await ctx.runMutation(api.models.importSessions.recordSessionStats, {
        sessionId,
        stats: {
          totalRows: fetchResult.members.length,
          selectedRows: fetchResult.members.length,
          validRows: fetchResult.members.length - rowsWithErrors.length,
          errorRows: rowsWithErrors.length,
          duplicateRows: importResult.playersReused,
          playersCreated: importResult.playersCreated,
          playersUpdated: importResult.playersReused, // Reused = updated existing
          playersSkipped: importResult.errors.length,
          guardiansCreated: importResult.guardiansCreated,
          guardiansLinked: importResult.guardiansReused,
          teamsCreated: 0, // N/A for federation sync
          passportsCreated: importResult.enrollmentsCreated,
          benchmarksApplied: importResult.benchmarksApplied,
        },
      });

      // ========== STEP 6: UPDATE SESSION STATUS ==========

      await ctx.runMutation(api.models.importSessions.updateSessionStatus, {
        sessionId,
        status: "completed",
      });

      console.log(`[GAA Sync] Session ${sessionId} marked as completed`);

      // ========== STEP 7: UPDATE CONNECTOR LAST SYNC ==========

      await ctx.runMutation(
        api.models.federationConnectors.updateLastSyncTime,
        {
          connectorId: args.connectorId,
          organizationId: args.organizationId,
          lastSyncAt: now,
        }
      );

      console.log("[GAA Sync] Updated connector lastSyncAt timestamp");

      const syncDuration = Date.now() - now;
      console.log(
        `[GAA Sync] ✓ Sync completed successfully in ${syncDuration}ms - Members: ${fetchResult.members.length}, Created: ${importResult.playersCreated}, Updated: ${importResult.playersReused}`
      );

      return {
        sessionId,
        stats: {
          totalMembers: fetchResult.members.length,
          playersCreated: importResult.playersCreated,
          playersUpdated: importResult.playersReused,
          guardiansCreated: importResult.guardiansCreated,
          duplicatesFound: importResult.playersReused,
          errors: importResult.errors.length,
        },
        status: "completed" as const,
      };
    } catch (error) {
      // ========== ERROR HANDLING ==========

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error(
        `[GAA Sync] ✗ Sync failed - Error: ${errorMessage}, Duration: ${Date.now() - now}ms`
      );

      // Update session status to failed if session was created
      if (sessionId) {
        try {
          await ctx.runMutation(api.models.importSessions.updateSessionStatus, {
            sessionId,
            status: "failed",
          });

          console.log(`[GAA Sync] Session ${sessionId} marked as failed`);
        } catch (statusError) {
          console.error(
            `[GAA Sync] Failed to update session status: ${statusError instanceof Error ? statusError.message : "Unknown error"}`
          );
        }
      }

      // Rethrow error to caller
      throw new Error(`GAA sync failed: ${errorMessage}`);
    }
  },
});
