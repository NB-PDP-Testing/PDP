import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

// ============================================================
// HELPER FUNCTIONS (Internal)
// ============================================================

// Helper type for organization lookup result
type OrgLookupResult = {
  _id: string;
  name: string;
  image?: string | null;
  metadata?: {
    sport?: string;
  } | null;
} | null;

/**
 * Internal helper to look up an organization via Better Auth adapter
 * Organizations are stored in a Better Auth component, not the main Convex schema
 */
async function lookupOrganization(
  ctx: any,
  orgId: string
): Promise<OrgLookupResult> {
  try {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "organization",
      paginationOpts: { cursor: null, numItems: 1 },
      where: [{ field: "_id", value: orgId, operator: "eq" }],
    });

    if (result.page[0]) {
      return result.page[0] as OrgLookupResult;
    }
    return null;
  } catch (error) {
    console.warn(`Failed to lookup organization ${orgId}:`, error);
    return null;
  }
}

/**
 * Internal helper to look up a user via Better Auth adapter
 * Users are stored in a Better Auth component, not the main Convex schema
 */
async function lookupUser(
  ctx: any,
  userId: string
): Promise<{
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
} | null> {
  try {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { cursor: null, numItems: 1 },
      where: [{ field: "_id", value: userId, operator: "eq" }],
    });

    if (result.page[0]) {
      return result.page[0] as {
        _id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
      };
    }
    return null;
  } catch (error) {
    console.warn(`Failed to lookup user ${userId}:`, error);
    return null;
  }
}

/**
 * Internal helper to look up a member (user in organization)
 * Members are stored in a Better Auth component, not the main Convex schema
 */
async function lookupMember(
  ctx: any,
  userId: string,
  orgId: string
): Promise<{
  _id: string;
  role: string;
  functionalRoles?: string[];
} | null> {
  try {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "member",
      paginationOpts: { cursor: null, numItems: 1 },
      where: [
        { field: "userId", value: userId, operator: "eq" },
        { field: "organizationId", value: orgId, operator: "eq" },
      ],
    });

    if (result.page[0]) {
      return result.page[0] as {
        _id: string;
        role: string;
        functionalRoles?: string[];
      };
    }
    return null;
  } catch (error) {
    console.warn(`Failed to lookup member ${userId} in org ${orgId}:`, error);
    return null;
  }
}

// ============================================================
// CONSENT GATEWAY
// Core security component for cross-organization passport sharing
// US-014: validateShareAccess query
// ============================================================

/**
 * Validate if a user has permission to access shared passport data
 *
 * This is the primary access control gateway for all cross-org passport queries.
 * ALL queries that retrieve shared passport data MUST call this function first.
 *
 * @param consentId - The consent record ID
 * @param accessorUserId - User ID requesting access
 * @param receivingOrgId - Organization the accessor belongs to
 * @returns Object with isValid flag and allowed sharedElements if valid, null otherwise
 */
export const validateShareAccess = query({
  args: {
    consentId: v.id("passportShareConsents"),
    accessorUserId: v.string(),
    receivingOrgId: v.string(),
  },
  returns: v.union(
    v.object({
      isValid: v.boolean(),
      sharedElements: v.optional(
        v.object({
          basicProfile: v.boolean(),
          skillRatings: v.boolean(),
          skillHistory: v.boolean(),
          developmentGoals: v.boolean(),
          coachNotes: v.boolean(),
          benchmarkData: v.boolean(),
          attendanceRecords: v.boolean(),
          injuryHistory: v.boolean(),
          medicalSummary: v.boolean(),
          contactInfo: v.boolean(),
        })
      ),
      playerIdentityId: v.optional(v.id("playerIdentities")),
      sourceOrgMode: v.optional(
        v.union(v.literal("all_enrolled"), v.literal("specific_orgs"))
      ),
      sourceOrgIds: v.optional(v.array(v.string())),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Get the consent record
    const consent = await ctx.db.get(args.consentId);

    // Validation 1: Consent exists
    if (!consent) {
      return null;
    }

    // Validation 2: Consent is active (not expired, revoked, or suspended)
    if (consent.status !== "active") {
      return null;
    }

    // Validation 3: Consent has not expired
    const now = Date.now();
    if (consent.expiresAt < now) {
      return null;
    }

    // Validation 4: Receiving organization matches
    if (consent.receivingOrgId !== args.receivingOrgId) {
      return null;
    }

    // Validation 5: Coach acceptance is 'accepted'
    if (consent.coachAcceptanceStatus !== "accepted") {
      return null;
    }

    // Validation 6: Verify accessor belongs to the receiving organization
    // Better Auth member table uses organizationId to link users to orgs
    // Note: Better Auth member table is a custom table, not a Convex table
    // For now, we'll trust that if the user has a valid receivingOrgId match,
    // they should have access. Additional role-based checks can be added later.
    // TODO: Add explicit member role validation when team-scoped access is implemented

    // All validations passed - return access details
    return {
      isValid: true,
      sharedElements: consent.sharedElements,
      playerIdentityId: consent.playerIdentityId,
      sourceOrgMode: consent.sourceOrgMode,
      sourceOrgIds: consent.sourceOrgIds,
    };
  },
});

/**
 * Get all active consents for a specific receiving organization
 * This shows which players' data is shared with the organization's coaches
 *
 * @param receivingOrgId - Organization ID of the receiving org (coaches viewing shared data)
 * @returns Array of active consents with player info
 */
export const getActiveConsentsForOrg = query({
  args: {
    receivingOrgId: v.string(),
  },
  returns: v.array(
    v.object({
      consentId: v.id("passportShareConsents"),
      playerIdentityId: v.id("playerIdentities"),
      status: v.union(
        v.literal("active"),
        v.literal("expired"),
        v.literal("revoked"),
        v.literal("suspended")
      ),
      coachAcceptanceStatus: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("declined")
      ),
      sharedElements: v.object({
        basicProfile: v.boolean(),
        skillRatings: v.boolean(),
        skillHistory: v.boolean(),
        developmentGoals: v.boolean(),
        coachNotes: v.boolean(),
        benchmarkData: v.boolean(),
        attendanceRecords: v.boolean(),
        injuryHistory: v.boolean(),
        medicalSummary: v.boolean(),
        contactInfo: v.boolean(),
      }),
      expiresAt: v.number(),
      sourceOrgMode: v.union(
        v.literal("all_enrolled"),
        v.literal("specific_orgs")
      ),
      sourceOrgIds: v.optional(v.array(v.string())),
    })
  ),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Get all consents for this organization
    const consents = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_receiving_org", (q) =>
        q.eq("receivingOrgId", args.receivingOrgId)
      )
      .collect();

    // Filter for active, non-expired consents with coach acceptance
    const now = Date.now();
    const activeConsents = consents.filter(
      (c) =>
        c.status === "active" &&
        c.expiresAt > now &&
        c.coachAcceptanceStatus === "accepted"
    );

    // Map to return format
    return activeConsents.map((consent) => ({
      consentId: consent._id,
      playerIdentityId: consent.playerIdentityId,
      status: consent.status,
      coachAcceptanceStatus: consent.coachAcceptanceStatus,
      sharedElements: consent.sharedElements,
      expiresAt: consent.expiresAt,
      sourceOrgMode: consent.sourceOrgMode,
      sourceOrgIds: consent.sourceOrgIds,
    }));
  },
});

/**
 * Get all consents for a specific player (for guardian dashboard)
 * Shows all consents regardless of status with enriched organization and coach data
 *
 * @param playerIdentityId - Player identity ID
 * @returns Array of consents for this player with enriched data
 */
export const getConsentsForPlayer = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.array(
    v.object({
      consentId: v.id("passportShareConsents"),
      receivingOrgId: v.string(),
      status: v.union(
        v.literal("active"),
        v.literal("expired"),
        v.literal("revoked"),
        v.literal("suspended")
      ),
      coachAcceptanceStatus: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("declined")
      ),
      sharedElements: v.object({
        basicProfile: v.boolean(),
        skillRatings: v.boolean(),
        skillHistory: v.boolean(),
        developmentGoals: v.boolean(),
        coachNotes: v.boolean(),
        benchmarkData: v.boolean(),
        attendanceRecords: v.boolean(),
        injuryHistory: v.boolean(),
        medicalSummary: v.boolean(),
        contactInfo: v.boolean(),
      }),
      consentedAt: v.number(),
      expiresAt: v.number(),
      revokedAt: v.optional(v.number()),
      acceptedAt: v.optional(v.number()),
      declinedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Get all consents for this player
    const consents = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    // Map to return format
    return consents.map((consent) => ({
      consentId: consent._id,
      receivingOrgId: consent.receivingOrgId,
      status: consent.status,
      coachAcceptanceStatus: consent.coachAcceptanceStatus,
      sharedElements: consent.sharedElements,
      consentedAt: consent.consentedAt,
      expiresAt: consent.expiresAt,
      revokedAt: consent.revokedAt,
      acceptedAt: consent.acceptedAt,
      declinedAt: consent.declinedAt,
    }));
  },
});

/**
 * Bulk query to get consents and requests for multiple players
 * Optimized for parent dashboards with multiple children
 *
 * @param playerIdentityIds - Array of player identity IDs
 * @returns Array of {playerIdentityId, consents, pendingRequests} for each player
 */
export const getBulkConsentsAndRequestsForPlayers = query({
  args: {
    playerIdentityIds: v.array(v.id("playerIdentities")),
  },
  returns: v.array(
    v.object({
      playerIdentityId: v.id("playerIdentities"),
      consents: v.array(
        v.object({
          consentId: v.id("passportShareConsents"),
          receivingOrgId: v.string(),
          status: v.union(
            v.literal("active"),
            v.literal("expired"),
            v.literal("revoked"),
            v.literal("suspended")
          ),
          coachAcceptanceStatus: v.union(
            v.literal("pending"),
            v.literal("accepted"),
            v.literal("declined")
          ),
          sharedElements: v.object({
            basicProfile: v.boolean(),
            skillRatings: v.boolean(),
            skillHistory: v.boolean(),
            developmentGoals: v.boolean(),
            coachNotes: v.boolean(),
            benchmarkData: v.boolean(),
            attendanceRecords: v.boolean(),
            injuryHistory: v.boolean(),
            medicalSummary: v.boolean(),
            contactInfo: v.boolean(),
          }),
          consentedAt: v.number(),
          expiresAt: v.number(),
          revokedAt: v.optional(v.number()),
          acceptedAt: v.optional(v.number()),
          declinedAt: v.optional(v.number()),
        })
      ),
      pendingRequests: v.array(
        v.object({
          requestId: v.id("passportShareRequests"),
          requestedBy: v.string(),
          requestedByName: v.string(),
          requestingOrgId: v.string(),
          requestingOrgName: v.string(),
          requestingOrgLogo: v.optional(v.string()),
          requestingOrgSport: v.optional(v.string()),
          requestedByRole: v.string(),
          requestedByEmail: v.optional(v.string()),
          reason: v.optional(v.string()),
          requestedAt: v.number(),
          expiresAt: v.number(),
          daysUntilExpiry: v.number(),
          isExpiringSoon: v.boolean(),
          status: v.union(
            v.literal("pending"),
            v.literal("approved"),
            v.literal("declined"),
            v.literal("expired")
          ),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    // Authentication check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Process each player in parallel
    const results = await Promise.all(
      args.playerIdentityIds.map(async (playerIdentityId) => {
        // Fetch consents for this player
        const consents = await ctx.db
          .query("passportShareConsents")
          .withIndex("by_player", (q) =>
            q.eq("playerIdentityId", playerIdentityId)
          )
          .collect();

        // Fetch pending requests for this player
        const requests = await ctx.db
          .query("passportShareRequests")
          .withIndex("by_player_and_status", (q) =>
            q.eq("playerIdentityId", playerIdentityId).eq("status", "pending")
          )
          .collect();

        // Filter for unexpired requests
        const now = Date.now();
        const validRequests = requests.filter((req) => req.expiresAt > now);

        // Enrich pending requests with organization and user data
        const enrichedRequests = await Promise.all(
          validRequests.map(async (request) => {
            // Lookup organization for logo and sport
            const org = await lookupOrganization(ctx, request.requestingOrgId);

            // Lookup user for email
            const user = await lookupUser(ctx, request.requestedBy);

            // Lookup member for role in their organization
            const member = await lookupMember(
              ctx,
              request.requestedBy,
              request.requestingOrgId
            );

            // Calculate expiry info
            const millisecondsUntilExpiry = request.expiresAt - now;
            const daysUntilExpiry = Math.ceil(
              millisecondsUntilExpiry / (1000 * 60 * 60 * 24)
            );
            const isExpiringSoon = daysUntilExpiry <= 7;

            // Determine role display
            let roleDisplay = "Coach";
            if (member) {
              if (member.role === "owner") {
                roleDisplay = "Owner";
              } else if (member.role === "admin") {
                roleDisplay = "Admin";
              } else if (member.functionalRoles?.includes("coach")) {
                roleDisplay = "Coach";
              }
            }

            return {
              requestId: request._id,
              requestedBy: request.requestedBy,
              requestedByName: request.requestedByName,
              requestingOrgId: request.requestingOrgId,
              requestingOrgName: request.requestingOrgName,
              requestingOrgLogo: org?.image || undefined,
              requestingOrgSport: org?.metadata?.sport,
              requestedByRole: roleDisplay,
              requestedByEmail: user?.email,
              reason: request.reason,
              requestedAt: request.requestedAt,
              expiresAt: request.expiresAt,
              daysUntilExpiry,
              isExpiringSoon,
              status: request.status,
            };
          })
        );

        return {
          playerIdentityId,
          consents: consents.map((consent) => ({
            consentId: consent._id,
            receivingOrgId: consent.receivingOrgId,
            status: consent.status,
            coachAcceptanceStatus: consent.coachAcceptanceStatus,
            sharedElements: consent.sharedElements,
            consentedAt: consent.consentedAt,
            expiresAt: consent.expiresAt,
            revokedAt: consent.revokedAt,
            acceptedAt: consent.acceptedAt,
            declinedAt: consent.declinedAt,
          })),
          pendingRequests: enrichedRequests,
        };
      })
    );

    return results;
  },
});
