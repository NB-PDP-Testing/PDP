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
 * Generate a consent receipt following MyData/Kantara standards
 * @param params - Receipt generation parameters
 * @returns Consent receipt object
 */
function generateConsentReceipt(params: {
  consentId: string;
  consent: any;
  playerName: string;
  guardianName: string;
  receivingOrgName: string;
}) {
  const { consentId, consent, playerName, guardianName, receivingOrgName } =
    params;
  return {
    receiptId: `cr_${consentId}`,
    version: consent.consentVersion,
    timestamp: new Date(consent.consentedAt).toISOString(),

    dataSubject: {
      name: playerName,
      playerId: consent.playerIdentityId,
    },

    consentGiver: {
      name: guardianName,
      relationship: "Parent/Guardian",
      userId: consent.grantedBy,
    },

    dataController: {
      name: "PlayerARC",
      contact: "privacy@playerarc.com",
    },

    dataRecipient: {
      organizationId: consent.receivingOrgId,
      organizationName: receivingOrgName,
      purpose: "Player development coaching",
    },

    consentedElements: Object.entries(consent.sharedElements)
      .filter(([_, value]) => value === true)
      .map(([key]) => key),

    consentDuration: {
      from: new Date(consent.consentedAt).toISOString().split("T")[0],
      until: new Date(consent.expiresAt).toISOString().split("T")[0],
    },

    rights: {
      revocation: "Immediate via Sharing Dashboard",
      access: "Full audit log available",
      complaint: "privacy@playerarc.com",
    },
  };
}

/**
 * Internal helper to notify all guardians with parental responsibility
 * about a sharing change
 *
 * @param ctx - Mutation context
 * @param params - Notification parameters
 */
async function notifyGuardiansOfSharingChange(
  ctx: any,
  params: {
    playerIdentityId: Id<"playerIdentities">;
    eventType:
      | "share_enabled"
      | "share_revoked"
      | "share_expired"
      | "guardian_change";
    actorUserId: string;
    metadata: {
      receivingOrgName?: string;
      consentId?: string;
      consentReceipt?: any;
    };
  }
) {
  const { playerIdentityId, eventType, actorUserId, metadata } = params;
  // Get all guardians with parental responsibility
  const links = await ctx.db
    .query("guardianPlayerLinks")
    .withIndex("by_player", (q: any) =>
      q.eq("playerIdentityId", playerIdentityId)
    )
    .collect();

  const responsibleLinks = links.filter(
    (link: any) => link.hasParentalResponsibility
  );

  // Fetch guardian details for each link (except the actor)
  const guardiansToNotify = await Promise.all(
    responsibleLinks.map(async (link: any) => {
      const guardian = await ctx.db.get(link.guardianIdentityId);
      if (!guardian || guardian.userId === actorUserId) {
        return null; // Skip the guardian who made the change
      }

      return {
        guardianIdentityId: link.guardianIdentityId,
        userId: guardian.userId,
        email: guardian.email,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
      };
    })
  );

  const validGuardians = guardiansToNotify.filter(
    (g): g is NonNullable<typeof g> => g !== null
  );

  // TODO US-047: Create notification records for each guardian
  // TODO US-047: Schedule email notifications based on guardian preferences
  // For now, log the notification intent
  console.log(
    `[Passport Sharing] Would notify ${validGuardians.length} guardians about ${eventType}`,
    {
      playerIdentityId,
      eventType,
      guardians: validGuardians.map((g) => ({
        userId: g.userId,
        email: g.email,
      })),
      metadata,
    }
  );

  return validGuardians;
}

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

    // Fetch additional data for consent receipt and notifications
    const playerIdentity = await ctx.db.get(args.playerIdentityId);
    const receivingOrg = await ctx.db
      .query("organization")
      .filter((q) => q.eq(q.field("id"), args.receivingOrgId))
      .first();

    const playerName = playerIdentity
      ? `${playerIdentity.firstName} ${playerIdentity.lastName}`
      : "Unknown Player";
    const guardianName = `${guardianIdentity.firstName} ${guardianIdentity.lastName}`;
    const receivingOrgName = receivingOrg?.name || "Unknown Organization";

    // Generate consent receipt
    const consent = await ctx.db.get(consentId);
    const consentReceipt = generateConsentReceipt({
      consentId,
      consent,
      playerName,
      guardianName,
      receivingOrgName,
    });

    // Notify all guardians with parental responsibility
    // This logs the intent for now; actual notifications will be implemented in US-047
    await notifyGuardiansOfSharingChange(ctx, {
      playerIdentityId: args.playerIdentityId,
      eventType: "share_enabled",
      actorUserId: userId,
      metadata: {
        receivingOrgName,
        consentId,
        consentReceipt,
      },
    });

    return consentId;
  },
});

/**
 * Update an existing passport sharing consent
 * US-012: Allow guardians to modify consent settings
 *
 * @param consentId - The consent to update
 * @param sharedElements - Updated elements to share (optional)
 * @param expiresAt - Updated expiry date (optional)
 * @param sourceOrgMode - Updated source org mode (optional)
 * @param sourceOrgIds - Updated source org IDs (optional)
 * @returns Success boolean
 */
export const updatePassportShareConsent = mutation({
  args: {
    consentId: v.id("passportShareConsents"),
    sharedElements: v.optional(sharedElementsValidator),
    expiresAt: v.optional(v.number()),
    sourceOrgMode: v.optional(
      v.union(v.literal("all_enrolled"), v.literal("specific_orgs"))
    ),
    sourceOrgIds: v.optional(v.array(v.string())),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;

    // Get the existing consent
    const consent = await ctx.db.get(args.consentId);
    if (!consent) {
      throw new Error("Consent not found");
    }

    // Validate that the user has parental responsibility for this player
    const hasResponsibility = await validateGuardianHasResponsibility(
      ctx,
      userId,
      consent.playerIdentityId
    );

    if (!hasResponsibility) {
      throw new Error(
        "You do not have parental responsibility for this player"
      );
    }

    // Validate sourceOrgIds is provided if mode is being changed to specific_orgs
    if (
      args.sourceOrgMode === "specific_orgs" &&
      !args.sourceOrgIds &&
      !consent.sourceOrgIds
    ) {
      throw new Error(
        "sourceOrgIds must be provided when sourceOrgMode is specific_orgs"
      );
    }

    // Build update object with only provided fields
    const updates: any = {};
    if (args.sharedElements !== undefined) {
      updates.sharedElements = args.sharedElements;
    }
    if (args.expiresAt !== undefined) {
      updates.expiresAt = args.expiresAt;
    }
    if (args.sourceOrgMode !== undefined) {
      updates.sourceOrgMode = args.sourceOrgMode;
    }
    if (args.sourceOrgIds !== undefined) {
      updates.sourceOrgIds = args.sourceOrgIds;
    }

    // Update the consent
    await ctx.db.patch(args.consentId, updates);

    // Notify all guardians with parental responsibility about the change
    // Get receiving org name for notification
    const receivingOrg = await ctx.db
      .query("organization")
      .filter((q) => q.eq(q.field("id"), consent.receivingOrgId))
      .first();
    const receivingOrgName = receivingOrg?.name || "Unknown Organization";

    await notifyGuardiansOfSharingChange(ctx, {
      playerIdentityId: consent.playerIdentityId,
      eventType: "guardian_change",
      actorUserId: userId,
      metadata: {
        receivingOrgName,
        consentId: args.consentId,
      },
    });

    return true;
  },
});

/**
 * Revoke a passport sharing consent immediately
 * US-013: Immediate revocation (FR-P6)
 *
 * @param consentId - The consent to revoke
 * @param revokedReason - Optional reason for revocation
 * @returns Success boolean
 */
export const revokePassportShareConsent = mutation({
  args: {
    consentId: v.id("passportShareConsents"),
    revokedReason: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;

    // Get the existing consent
    const consent = await ctx.db.get(args.consentId);
    if (!consent) {
      throw new Error("Consent not found");
    }

    // Validate that the user has parental responsibility for this player
    const hasResponsibility = await validateGuardianHasResponsibility(
      ctx,
      userId,
      consent.playerIdentityId
    );

    if (!hasResponsibility) {
      throw new Error(
        "You do not have parental responsibility for this player"
      );
    }

    // Update consent status to revoked
    const now = Date.now();
    await ctx.db.patch(args.consentId, {
      status: "revoked",
      revokedAt: now,
      revokedReason: args.revokedReason,
    });

    // Notify all guardians and receiving org coaches
    // Get receiving org name for notification
    const receivingOrg = await ctx.db
      .query("organization")
      .filter((q) => q.eq(q.field("id"), consent.receivingOrgId))
      .first();
    const receivingOrgName = receivingOrg?.name || "Unknown Organization";

    // Notify guardians
    await notifyGuardiansOfSharingChange(ctx, {
      playerIdentityId: consent.playerIdentityId,
      eventType: "share_revoked",
      actorUserId: userId,
      metadata: {
        receivingOrgName,
        consentId: args.consentId,
      },
    });

    // TODO US-048: Notify coaches at receiving org that access has been revoked

    return true;
  },
});
