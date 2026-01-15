import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

// Guardian with responsibility validator
const guardianWithResponsibilityValidator = v.object({
  guardianIdentityId: v.id("guardianIdentities"),
  userId: v.optional(v.string()),
  firstName: v.string(),
  lastName: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  relationship: v.union(
    v.literal("mother"),
    v.literal("father"),
    v.literal("guardian"),
    v.literal("grandparent"),
    v.literal("other")
  ),
  isPrimary: v.boolean(),
});

// ============================================================
// HELPER FUNCTIONS (Internal)
// ============================================================

/**
 * Internal helper to validate if a user has parental responsibility for a player
 * @param ctx - Query/Mutation context with db access
 * @param userId - Better Auth user ID
 * @param playerIdentityId - Player identity ID
 * @returns true if user has parental responsibility, false otherwise
 */
export async function validateGuardianHasResponsibility(
  ctx: any, // Using any to support both query and mutation contexts
  userId: string,
  playerIdentityId: Id<"playerIdentities">
): Promise<boolean> {
  // Find guardian identity for this user
  const guardianIdentity = await ctx.db
    .query("guardianIdentities")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();

  if (!guardianIdentity) {
    return false;
  }

  // Check if guardian has parental responsibility for this player
  const link = await ctx.db
    .query("guardianPlayerLinks")
    .withIndex("by_guardian_and_player", (q: any) =>
      q
        .eq("guardianIdentityId", guardianIdentity._id)
        .eq("playerIdentityId", playerIdentityId)
    )
    .first();

  return link?.hasParentalResponsibility === true;
}

// ============================================================
// QUERIES
// ============================================================

/**
 * Get all guardians with parental responsibility for a player
 * Used for multi-guardian notifications and consent management
 */
export const getGuardiansWithResponsibility = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.array(guardianWithResponsibilityValidator),
  handler: async (ctx, args) => {
    // Get all guardian-player links for this player with parental responsibility
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    // Filter for those with parental responsibility
    const responsibleLinks = links.filter(
      (link) => link.hasParentalResponsibility
    );

    // Fetch guardian details for each link
    const guardians = await Promise.all(
      responsibleLinks.map(async (link) => {
        const guardian = await ctx.db.get(link.guardianIdentityId);
        if (!guardian) {
          return null;
        }

        return {
          guardianIdentityId: link.guardianIdentityId,
          userId: guardian.userId,
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          email: guardian.email,
          phone: guardian.phone,
          relationship: link.relationship,
          isPrimary: link.isPrimary,
        };
      })
    );

    // Filter out nulls and return
    return guardians.filter((g): g is NonNullable<typeof g> => g !== null);
  },
});

/**
 * Check if the current user has parental responsibility for a player
 * Used for authorization checks in frontend
 */
export const checkParentalResponsibility = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const userId = identity.subject;
    return await validateGuardianHasResponsibility(
      ctx,
      userId,
      args.playerIdentityId
    );
  },
});

// ============================================================
// MUTATIONS
// ============================================================

// Shared elements validator for mutation args
const sharedElementsValidator = v.object({
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
});

/**
 * Create a new passport sharing consent
 * US-010: Core logic for enabling passport sharing
 *
 * @param playerIdentityId - The player whose passport is being shared
 * @param receivingOrgId - The organization that will receive access
 * @param sharedElements - Which passport elements to share
 * @param sourceOrgMode - Whether to share from all enrolled orgs or specific ones
 * @param sourceOrgIds - If specific_orgs mode, which org IDs to share from
 * @param expiresAt - When the consent expires (Unix timestamp)
 * @param ipAddress - IP address of the consent giver (for audit)
 * @returns The created consent ID
 */
export const createPassportShareConsent = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    receivingOrgId: v.string(),
    sharedElements: sharedElementsValidator,
    sourceOrgMode: v.union(
      v.literal("all_enrolled"),
      v.literal("specific_orgs")
    ),
    sourceOrgIds: v.optional(v.array(v.string())),
    expiresAt: v.number(),
    ipAddress: v.optional(v.string()),
  },
  returns: v.id("passportShareConsents"),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;

    // Validate that the user has parental responsibility for this player
    const hasResponsibility = await validateGuardianHasResponsibility(
      ctx,
      userId,
      args.playerIdentityId
    );

    if (!hasResponsibility) {
      throw new Error(
        "You do not have parental responsibility for this player"
      );
    }

    // Get the guardian identity
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!guardianIdentity) {
      throw new Error("Guardian identity not found");
    }

    // Validate sourceOrgIds is provided if mode is specific_orgs
    if (args.sourceOrgMode === "specific_orgs" && !args.sourceOrgIds) {
      throw new Error(
        "sourceOrgIds must be provided when sourceOrgMode is specific_orgs"
      );
    }

    // Check if an active consent already exists for this player-org combination
    const existingConsent = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_player_and_status", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId).eq("status", "active")
      )
      .filter((q) => q.eq(q.field("receivingOrgId"), args.receivingOrgId))
      .first();

    if (existingConsent) {
      throw new Error(
        "An active sharing consent already exists for this player and organization"
      );
    }

    // Create the consent record
    const now = Date.now();
    const consentId = await ctx.db.insert("passportShareConsents", {
      playerIdentityId: args.playerIdentityId,
      grantedBy: userId,
      grantedByType: "guardian",
      guardianIdentityId: guardianIdentity._id,
      sourceOrgMode: args.sourceOrgMode,
      sourceOrgIds: args.sourceOrgIds,
      receivingOrgId: args.receivingOrgId,
      sharedElements: args.sharedElements,
      consentedAt: now,
      expiresAt: args.expiresAt,
      renewalReminderSent: false,
      status: "active",
      renewalCount: 0,
      coachAcceptanceStatus: "pending",
      consentVersion: "1.0", // Initial version
      ipAddress: args.ipAddress,
    });

    // TODO US-011: Notify all guardians with parental responsibility
    // TODO US-011: Generate consent receipt

    return consentId;
  },
});
