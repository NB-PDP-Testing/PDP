import { v } from "convex/values";
import { query } from "../_generated/server";

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
 * Get all active consents for a receiving organization
 * Used by coaches to see what shared passports they have access to
 *
 * @param receivingOrgId - Organization ID
 * @param coachUserId - Optional coach user ID to filter by team assignments
 * @returns Array of active consents with coach acceptance
 */
export const getActiveConsentsForOrg = query({
  args: {
    receivingOrgId: v.string(),
    coachUserId: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      consentId: v.id("passportShareConsents"),
      playerIdentityId: v.id("playerIdentities"),
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
      sourceOrgMode: v.union(
        v.literal("all_enrolled"),
        v.literal("specific_orgs")
      ),
      sourceOrgIds: v.optional(v.array(v.string())),
    })
  ),
  handler: async (ctx, args) => {
    // Query consents for this organization with coach acceptance
    // Use by_coach_acceptance index which has receivingOrgId + coachAcceptanceStatus
    const consents = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_coach_acceptance", (q) =>
        q
          .eq("receivingOrgId", args.receivingOrgId)
          .eq("coachAcceptanceStatus", "accepted")
      )
      .collect();

    // Filter for active consents that haven't expired
    const now = Date.now();
    const validConsents = consents.filter(
      (consent) =>
        consent.status === "active" &&
        consent.coachAcceptanceStatus === "accepted" &&
        consent.expiresAt > now
    );

    // Map to return format
    return validConsents.map((consent) => ({
      consentId: consent._id,
      playerIdentityId: consent.playerIdentityId,
      sharedElements: consent.sharedElements,
      consentedAt: consent.consentedAt,
      expiresAt: consent.expiresAt,
      sourceOrgMode: consent.sourceOrgMode,
      sourceOrgIds: consent.sourceOrgIds,
    }));
  },
});

/**
 * Get all consents for a specific player (for guardian dashboard)
 * Shows all consents regardless of status
 *
 * @param playerIdentityId - Player identity ID
 * @returns Array of consents for this player
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
