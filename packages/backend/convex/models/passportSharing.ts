import { v } from "convex/values";
import { api, components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, mutation, query } from "../_generated/server";

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
 * Get user data from Better Auth adapter
 * Internal query to fetch user name from Better Auth user table
 * @param userId - Better Auth user ID
 * @returns User name or default
 */
export const _getBetterAuthUserName = query({
  args: { userId: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const userResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "user",
        paginationOpts: { cursor: null, numItems: 1 },
        where: [{ field: "_id", value: args.userId, operator: "eq" }],
      }
    );

    const user = userResult.page?.[0];
    if (!user) {
      return "Unknown User";
    }

    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || user.name || "Unknown User";
  },
});

/**
 * Lookup Better Auth organization by ID
 * Helper function for future use - prefixed with _ to indicate intentionally unused
 * @param ctx - Query context
 * @param orgId - Organization ID
 * @returns Organization data or null
 */
// biome-ignore lint/suspicious/noExplicitAny: Matches existing pattern in this file for context parameter
async function _lookupOrganization(
  ctx: any,
  orgId: string
): Promise<{
  _id: string;
  name?: string;
  slug?: string;
  logo?: string;
} | null> {
  try {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "organization",
      paginationOpts: { cursor: null, numItems: 1 },
      where: [{ field: "_id", value: orgId, operator: "eq" }],
    });

    if (result.page[0]) {
      // biome-ignore lint/suspicious/noExplicitAny: Better Auth adapter returns untyped objects
      return result.page[0] as any;
    }
    return null;
  } catch (error) {
    console.warn(`Failed to lookup organization ${orgId}:`, error);
    return null;
  }
}

/**
 * Lookup Better Auth user by ID
 * Helper function for future use - prefixed with _ to indicate intentionally unused
 * @param ctx - Query context
 * @param userId - User ID
 * @returns User data or null
 */
// biome-ignore lint/suspicious/noExplicitAny: Matches existing pattern in this file for context parameter
async function _lookupUser(
  ctx: any,
  userId: string
): Promise<{
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  name?: string;
} | null> {
  try {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { cursor: null, numItems: 1 },
      where: [{ field: "_id", value: userId, operator: "eq" }],
    });

    if (result.page[0]) {
      // biome-ignore lint/suspicious/noExplicitAny: Better Auth adapter returns untyped objects
      return result.page[0] as any;
    }
    return null;
  } catch (error) {
    console.warn(`Failed to lookup user ${userId}:`, error);
    return null;
  }
}

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
      | "share_expiring"
      | "guardian_change"
      | "access_requested";
    actorUserId: string;
    actorName?: string;
    metadata: {
      receivingOrgName?: string;
      receivingOrgId?: string;
      consentId?: string;
      consentReceipt?: any;
      requestId?: Id<"passportShareRequests">;
      requestingOrgId?: string;
      requestingOrgName?: string;
      reason?: string;
      expiresAt?: number;
      daysUntilExpiry?: number;
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

  // Create notification records for each guardian
  const notificationIds = await Promise.all(
    validGuardians.map(async (guardian) => {
      // Generate notification content based on event type
      let title = "";
      let message = "";
      let actionUrl: string | undefined;

      switch (eventType) {
        case "share_enabled":
          title = "Sharing Enabled";
          message = `Passport sharing has been enabled for your child with ${metadata.receivingOrgName || "an organization"}.`;
          actionUrl = "/parents/sharing";
          break;
        case "share_revoked":
          title = "Sharing Revoked";
          message = `Passport sharing with ${metadata.receivingOrgName || "an organization"} has been revoked.`;
          actionUrl = "/parents/sharing";
          break;
        case "share_expired":
          title = "Sharing Expired";
          message = `Passport sharing with ${metadata.receivingOrgName || "an organization"} has expired.`;
          actionUrl = "/parents/sharing";
          break;
        case "share_expiring":
          title = "Sharing Expiring Soon";
          message = `Passport sharing with ${metadata.receivingOrgName || "an organization"} will expire in 14 days. Please review and renew if needed.`;
          actionUrl = "/parents/sharing";
          break;
        case "guardian_change":
          title = "Sharing Settings Changed";
          message = `Another guardian has modified passport sharing settings for your child with ${metadata.receivingOrgName || "an organization"}.`;
          actionUrl = "/parents/sharing";
          break;
        case "access_requested":
          title = "Access Request";
          message = `${metadata.receivingOrgName || "An organization"} has requested access to your child's passport.`;
          actionUrl = "/parents/sharing";
          break;
        default:
          title = "Sharing Update";
          message = "There has been an update to passport sharing.";
          actionUrl = "/parents/sharing";
      }

      // Create notification record
      const notificationId = await ctx.db.insert("passportShareNotifications", {
        userId: guardian.userId,
        notificationType: eventType,
        consentId: metadata.consentId,
        playerIdentityId,
        requestId: undefined,
        title,
        message,
        actionUrl,
        createdAt: Date.now(),
      });

      return notificationId;
    })
  );

  console.log(
    `[Passport Sharing] Created ${notificationIds.length} notifications for ${eventType}`,
    {
      playerIdentityId,
      eventType,
      notificationIds,
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
    initiationType: v.optional(
      v.union(v.literal("parent_initiated"), v.literal("coach_requested"))
    ),
    sourceRequestId: v.optional(v.id("passportShareRequests")),
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
      initiationType: args.initiationType || "parent_initiated",
      sourceRequestId: args.sourceRequestId,
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
    const receivingOrg = await ctx.runQuery(
      api.models.organizations.getOrganization,
      { organizationId: args.receivingOrgId }
    );

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
    const receivingOrg = await ctx.runQuery(
      api.models.organizations.getOrganization,
      { organizationId: consent.receivingOrgId }
    );
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
    const receivingOrg = await ctx.runQuery(
      api.models.organizations.getOrganization,
      { organizationId: consent.receivingOrgId }
    );
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

// ============================================================
// CROSS-ORG PASSPORT DATA QUERIES
// US-011: Query shared passport data with consent validation
// ============================================================

/**
 * Get shared passport data for a player from another organization
 * US-011: Cross-org passport query with consent gateway
 *
 * This query MUST be called by coaches/staff at the receiving organization.
 * It validates consent via the consent gateway before returning any data.
 *
 * @param consentId - The consent record authorizing access
 * @param playerIdentityId - The player whose data is being accessed
 * @returns Shared passport data filtered by consent permissions, or null if access denied
 */
export const getSharedPassportData = query({
  args: {
    consentId: v.id("passportShareConsents"),
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.union(
    v.object({
      playerIdentity: v.object({
        firstName: v.string(),
        lastName: v.string(),
        dateOfBirth: v.optional(v.string()),
        gender: v.optional(v.string()),
      }),
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
      sourceOrgs: v.array(
        v.object({
          organizationId: v.string(),
          organizationName: v.string(),
        })
      ),
      orgSharingContacts: v.array(
        v.object({
          organizationId: v.string(),
          organizationName: v.string(),
          sharingContactMode: v.union(v.literal("direct"), v.literal("form")),
          sharingContactName: v.optional(v.string()),
          sharingContactEmail: v.optional(v.string()),
          sharingContactPhone: v.optional(v.string()),
          sharingEnquiriesUrl: v.optional(v.string()),
        })
      ),
      // Data sections (only populated if shared)
      enrollments: v.optional(
        v.array(
          v.object({
            organizationId: v.string(),
            organizationName: v.string(),
            sport: v.string(),
            ageGroup: v.string(),
            status: v.string(),
            lastUpdated: v.number(),
          })
        )
      ),
      goals: v.optional(
        v.array(
          v.object({
            goalId: v.id("passportGoals"),
            title: v.string(),
            description: v.optional(v.string()),
            status: v.string(),
            organizationId: v.string(),
            organizationName: v.string(),
            createdAt: v.number(),
            updatedAt: v.number(),
            isShareable: v.boolean(),
          })
        )
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Get the consent record to determine receiving org
    const consent = await ctx.db.get(args.consentId);
    if (!consent) {
      return null;
    }

    // Call consent gateway to validate access
    // Import from consentGateway would create circular dependency, so we inline validation
    // Validation 1: Consent is active
    if (consent.status !== "active") {
      return null;
    }

    // Validation 2: Consent has not expired
    const now = Date.now();
    if (consent.expiresAt < now) {
      return null;
    }

    // Validation 3: Coach acceptance is 'accepted'
    if (consent.coachAcceptanceStatus !== "accepted") {
      return null;
    }

    // Validation 4: Player matches
    if (consent.playerIdentityId !== args.playerIdentityId) {
      return null;
    }

    // Get player identity for basic profile
    const playerIdentity = await ctx.db.get(args.playerIdentityId);
    if (!playerIdentity) {
      return null;
    }

    // Determine source organizations based on sourceOrgMode
    let sourceOrgIds: string[] = [];
    if (consent.sourceOrgMode === "all_enrolled") {
      // Get all organizations where player is enrolled
      const enrollments = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", args.playerIdentityId)
        )
        .collect();
      sourceOrgIds = enrollments.map((e) => e.organizationId);
    } else {
      // Use specific org IDs from consent
      sourceOrgIds = consent.sourceOrgIds || [];
    }

    // Fetch org names for source orgs
    const sourceOrgs = await Promise.all(
      sourceOrgIds.map(async (orgId) => {
        const org = await ctx.runQuery(
          api.models.organizations.getOrganization,
          { organizationId: orgId }
        );
        return {
          organizationId: orgId,
          organizationName: org?.name || "Unknown Organization",
        };
      })
    );

    // Fetch sharing contact info for all source orgs
    const orgSharingContacts = await Promise.all(
      sourceOrgIds.map(async (orgId) => {
        const org = await ctx.runQuery(
          api.models.organizations.getOrganization,
          { organizationId: orgId }
        );

        // Only include orgs that have configured sharing contact
        if (!org?.sharingContactMode) {
          return null;
        }

        return {
          organizationId: orgId,
          organizationName: org.name || "Unknown Organization",
          sharingContactMode: org.sharingContactMode,
          sharingContactName: org.sharingContactName,
          sharingContactEmail: org.sharingContactEmail,
          sharingContactPhone: org.sharingContactPhone,
          sharingEnquiriesUrl: org.sharingEnquiriesUrl,
        };
      })
    );

    // Filter out null values (orgs without sharing contact)
    const validOrgContacts = orgSharingContacts.filter(
      (contact): contact is NonNullable<typeof contact> => contact !== null
    );

    // Build response object with only authorized elements
    const response: any = {
      playerIdentity: {
        firstName: playerIdentity.firstName,
        lastName: playerIdentity.lastName,
        dateOfBirth: playerIdentity.dateOfBirth,
        gender: playerIdentity.gender,
      },
      sharedElements: consent.sharedElements,
      sourceOrgs,
      orgSharingContacts: validOrgContacts,
    };

    // Fetch enrollments if basicProfile is shared
    if (consent.sharedElements.basicProfile && sourceOrgIds.length > 0) {
      const enrollments = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", args.playerIdentityId)
        )
        .collect();

      const filteredEnrollments = enrollments.filter((e) =>
        sourceOrgIds.includes(e.organizationId)
      );

      response.enrollments = await Promise.all(
        filteredEnrollments.map(async (enrollment) => {
          const org = await ctx.runQuery(
            api.models.organizations.getOrganization,
            { organizationId: enrollment.organizationId }
          );

          return {
            organizationId: enrollment.organizationId,
            organizationName: org?.name || "Unknown Organization",
            sport: enrollment.sport,
            ageGroup: enrollment.ageGroup || "Unknown",
            status: enrollment.status,
            lastUpdated: enrollment.updatedAt,
          };
        })
      );
    }

    // Fetch development goals if developmentGoals is shared
    if (consent.sharedElements.developmentGoals && sourceOrgIds.length > 0) {
      const allGoals = await ctx.db
        .query("passportGoals")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", args.playerIdentityId)
        )
        .collect();

      // Filter by source orgs and isShareable flag (for coach notes)
      const shareableGoals = allGoals.filter(
        (goal) =>
          sourceOrgIds.includes(goal.organizationId) &&
          (consent.sharedElements.coachNotes
            ? true
            : goal.isShareable !== false) // Only show if explicitly shareable or coachNotes is enabled
      );

      response.goals = await Promise.all(
        shareableGoals.map(async (goal) => {
          const org = await ctx.runQuery(
            api.models.organizations.getOrganization,
            { organizationId: goal.organizationId }
          );

          return {
            goalId: goal._id,
            title: goal.title,
            description: goal.description,
            status: goal.status,
            organizationId: goal.organizationId,
            organizationName: org?.name || "Unknown Organization",
            createdAt: goal.createdAt,
            updatedAt: goal.updatedAt,
            isShareable: goal.isShareable,
          };
        })
      );
    }

    // TODO US-011 (future iterations): Add remaining data elements:
    // - skillRatings: Query skillAssessments for latest ratings
    // - skillHistory: Query skillAssessments for historical data
    // - benchmarkData: Query benchmark comparisons
    // - attendanceRecords: Query attendance tables
    // - injuryHistory: Query injuries table (org-scoped via players)
    // - medicalSummary: Query medicalProfiles (requires guardian consent, highly sensitive)
    // - contactInfo: Query guardianIdentities for contact details

    return response;
  },
});

// ============================================================
// COACH ACCEPTANCE/DECLINE MUTATIONS
// US-012, US-013: Coach share acceptance and decline
// ============================================================

/**
 * Accept a shared passport offer from a parent/guardian
 * US-012: Coach Share Acceptance (FR-C6)
 *
 * When a parent shares their child's passport with an organization,
 * a coach at that organization must accept the share before data becomes visible.
 *
 * @param consentId - The consent record to accept
 * @returns Success boolean
 */
export const acceptPassportShare = mutation({
  args: {
    consentId: v.id("passportShareConsents"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;

    // Get the consent record
    const consent = await ctx.db.get(args.consentId);
    if (!consent) {
      throw new Error("Consent not found");
    }

    // Verify consent is still active
    if (consent.status !== "active") {
      throw new Error("Consent is not active");
    }

    // Verify consent has not expired
    const now = Date.now();
    if (consent.expiresAt < now) {
      throw new Error("Consent has expired");
    }

    // Verify coach acceptance is still pending
    if (consent.coachAcceptanceStatus !== "pending") {
      throw new Error(
        `Consent has already been ${consent.coachAcceptanceStatus}`
      );
    }

    // TODO: Validate coach belongs to receiving organization
    // This requires checking Better Auth member table or team assignments
    // For now, we trust that the coach has the correct receivingOrgId

    // Update consent to accepted
    await ctx.db.patch(args.consentId, {
      coachAcceptanceStatus: "accepted",
      acceptedByCoachId: userId,
      acceptedAt: now,
    });

    // Notify parent(s) that share was accepted
    // Get coach name and org name for notification
    const coachName = await ctx.runQuery(
      api.models.passportSharing._getBetterAuthUserName,
      {
        userId,
      }
    );

    const receivingOrg = await ctx.runQuery(
      api.models.organizations.getOrganization,
      { organizationId: consent.receivingOrgId }
    );
    const receivingOrgName = receivingOrg?.name || "an organization";

    // Get all guardians with parental responsibility
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", consent.playerIdentityId)
      )
      .collect();

    const responsibleLinks = links.filter(
      (link) => link.hasParentalResponsibility
    );

    // Create notifications for all guardians
    await Promise.all(
      responsibleLinks.map(async (link) => {
        const guardian = await ctx.db.get(link.guardianIdentityId);
        if (!guardian?.userId) {
          return;
        }

        await ctx.db.insert("passportShareNotifications", {
          userId: guardian.userId,
          notificationType: "coach_accepted",
          consentId: args.consentId,
          playerIdentityId: consent.playerIdentityId,
          requestId: undefined,
          title: "Share Accepted",
          message: `${coachName} at ${receivingOrgName} has accepted your passport share.`,
          actionUrl: "/parents/sharing",
          createdAt: Date.now(),
        });
      })
    );

    console.log(
      `[Passport Sharing] Coach ${userId} accepted share for consent ${args.consentId}, notified ${responsibleLinks.length} guardians`
    );

    return true;
  },
});

/**
 * Decline a shared passport offer from a parent/guardian
 * US-013: Coach can decline share (FR-C6)
 *
 * Coaches can decline passport shares they don't need.
 * After 3 declines, a 30-day cooling-off period is enforced.
 *
 * @param consentId - The consent record to decline
 * @param declineReason - Optional reason for declining
 * @returns Success boolean
 */
export const declinePassportShare = mutation({
  args: {
    consentId: v.id("passportShareConsents"),
    declineReason: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;

    // Get the consent record
    const consent = await ctx.db.get(args.consentId);
    if (!consent) {
      throw new Error("Consent not found");
    }

    // Verify consent is still active
    if (consent.status !== "active") {
      throw new Error("Consent is not active");
    }

    // Verify coach acceptance is still pending
    if (consent.coachAcceptanceStatus !== "pending") {
      throw new Error(
        `Consent has already been ${consent.coachAcceptanceStatus}`
      );
    }

    // Increment decline count
    const newDeclineCount = (consent.declineCount || 0) + 1;

    // Update consent to declined
    const now = Date.now();
    await ctx.db.patch(args.consentId, {
      coachAcceptanceStatus: "declined",
      declinedAt: now,
      declineReason: args.declineReason,
      declineCount: newDeclineCount,
    });

    // Log cooling-off period enforcement if applicable
    if (newDeclineCount >= 3) {
      console.log(
        `[Passport Sharing] Consent ${args.consentId} declined ${newDeclineCount} times. 30-day cooling-off period should be enforced.`
      );
      // TODO US-049: Implement cooling-off period logic
      // Prevent re-sharing to same org for 30 days after 3 declines
    }

    // Notify parent(s) that share was declined
    // Get coach name and org name for notification
    const coachName = await ctx.runQuery(
      api.models.passportSharing._getBetterAuthUserName,
      {
        userId,
      }
    );

    const receivingOrg = await ctx.runQuery(
      api.models.organizations.getOrganization,
      { organizationId: consent.receivingOrgId }
    );
    const receivingOrgName = receivingOrg?.name || "an organization";

    // Get all guardians with parental responsibility
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", consent.playerIdentityId)
      )
      .collect();

    const responsibleLinks = links.filter(
      (link) => link.hasParentalResponsibility
    );

    // Create notifications for all guardians
    await Promise.all(
      responsibleLinks.map(async (link) => {
        const guardian = await ctx.db.get(link.guardianIdentityId);
        if (!guardian?.userId) {
          return;
        }

        const message = args.declineReason
          ? `${coachName} at ${receivingOrgName} declined your passport share. Reason: ${args.declineReason}`
          : `${coachName} at ${receivingOrgName} declined your passport share.`;

        await ctx.db.insert("passportShareNotifications", {
          userId: guardian.userId,
          notificationType: "coach_declined",
          consentId: args.consentId,
          playerIdentityId: consent.playerIdentityId,
          requestId: undefined,
          title: "Share Declined",
          message,
          actionUrl: "/parents/sharing",
          createdAt: Date.now(),
        });
      })
    );

    console.log(
      `[Passport Sharing] Coach ${userId} declined share for consent ${args.consentId}, notified ${responsibleLinks.length} guardians`,
      { reason: args.declineReason, declineCount: newDeclineCount }
    );

    return true;
  },
});

// ============================================================
// COACH REQUEST WORKFLOW
// ============================================================

/**
 * Request access to a player's passport
 *
 * Coaches can request access when no active share exists.
 * Request expires after 14 days if not responded to.
 *
 * @param playerIdentityId - The player to request access for
 * @param requestingOrgId - The organization requesting access
 * @param reason - Optional reason for the request
 * @returns Request ID
 */
export const requestPassportAccess = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    requestingOrgId: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.id("passportShareRequests"),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;

    // TODO: Validate coach belongs to requestingOrgId organization
    // This requires Better Auth member table integration

    // Check if there's already an active/pending request
    const existingRequest = await ctx.db
      .query("passportShareRequests")
      .withIndex("by_player_and_status", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId).eq("status", "pending")
      )
      .filter((q) => q.eq(q.field("requestingOrgId"), args.requestingOrgId))
      .first();

    if (existingRequest) {
      throw new Error(
        "A pending request already exists for this player and organization"
      );
    }

    // Check if there's already an active consent
    const existingConsent = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_player_and_status", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId).eq("status", "active")
      )
      .filter((q) => q.eq(q.field("receivingOrgId"), args.requestingOrgId))
      .first();

    if (existingConsent) {
      throw new Error(
        "An active consent already exists for this player and organization"
      );
    }

    // Get requesting coach name for notification
    const coachName: string = await ctx.runQuery(
      api.models.passportSharing._getBetterAuthUserName,
      {
        userId,
      }
    );

    // Get requesting org name for notification
    const org = await ctx.runQuery(api.models.organizations.getOrganization, {
      organizationId: args.requestingOrgId,
    });

    const orgName: string = org?.name || args.requestingOrgId;

    // Create the request with 14-day expiry
    const now = Date.now();
    const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
    const expiresAt = now + fourteenDaysInMs;

    const requestId: Id<"passportShareRequests"> = await ctx.db.insert(
      "passportShareRequests",
      {
        playerIdentityId: args.playerIdentityId,
        requestedBy: userId,
        requestedByName: coachName,
        requestedByRole: "Coach", // TODO: Get actual role from member table
        requestingOrgId: args.requestingOrgId,
        requestingOrgName: orgName,
        reason: args.reason,
        status: "pending",
        requestedAt: now,
        expiresAt,
      }
    );

    // Notify all guardians with parental responsibility
    await notifyGuardiansOfSharingChange(ctx, {
      playerIdentityId: args.playerIdentityId,
      eventType: "access_requested",
      actorUserId: userId,
      actorName: coachName,
      metadata: {
        requestId,
        requestingOrgId: args.requestingOrgId,
        requestingOrgName: orgName,
        reason: args.reason,
      },
    });

    console.log(
      `[Passport Sharing] Coach ${userId} requested access to player ${args.playerIdentityId} for org ${orgName}`,
      { requestId, reason: args.reason }
    );

    return requestId;
  },
});

/**
 * Respond to a passport access request
 *
 * Parents can approve or decline coach requests.
 * Approval transitions to the sharing wizard.
 *
 * @param requestId - The request to respond to
 * @param response - 'approved' or 'declined'
 * @returns Success boolean
 */
export const respondToAccessRequest = mutation({
  args: {
    requestId: v.id("passportShareRequests"),
    response: v.union(v.literal("approved"), v.literal("declined")),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;

    // Get the request
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    // Check if request is still pending
    if (request.status !== "pending") {
      throw new Error(`Request has already been ${request.status}`);
    }

    // Check if request has expired
    if (request.expiresAt < Date.now()) {
      // Auto-expire the request
      await ctx.db.patch(args.requestId, {
        status: "expired",
      });
      throw new Error("Request has expired");
    }

    // Validate guardian has parental responsibility
    await validateGuardianHasResponsibility(
      ctx,
      userId,
      request.playerIdentityId
    );

    const now = Date.now();

    if (args.response === "approved") {
      // Update request status to approved
      await ctx.db.patch(args.requestId, {
        status: "approved",
        respondedAt: now,
        respondedBy: userId,
      });

      // Note: The actual consent creation happens in the frontend
      // when the parent completes the sharing wizard
      // The wizard will reference this approved request ID

      console.log(
        `[Passport Sharing] Guardian ${userId} approved access request ${args.requestId}`
      );

      // TODO US-048: Notify coach that request was approved
    } else {
      // Decline the request
      await ctx.db.patch(args.requestId, {
        status: "declined",
        respondedAt: now,
        respondedBy: userId,
      });

      console.log(
        `[Passport Sharing] Guardian ${userId} declined access request ${args.requestId}`
      );

      // TODO US-048: Notify coach that request was declined
    }

    return true;
  },
});

// ============================================================
// ACCESS AUDIT LOGGING
// ============================================================

/**
 * Log access to shared passport data
 *
 * Creates immutable audit trail of all data access for compliance.
 * Must be called by frontend after viewing shared passport data.
 *
 * @param consentId - The consent authorizing this access
 * @param accessType - What was accessed (view_summary, view_skills, etc.)
 * @param ipAddress - Optional IP address of accessor
 * @param userAgent - Optional user agent string
 * @returns Log ID
 */
export const logPassportAccess = mutation({
  args: {
    consentId: v.id("passportShareConsents"),
    accessType: v.union(
      v.literal("view_summary"),
      v.literal("view_skills"),
      v.literal("view_goals"),
      v.literal("view_notes"),
      v.literal("view_medical"),
      v.literal("view_contact"),
      v.literal("export_pdf"),
      v.literal("view_insights")
    ),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.id("passportShareAccessLogs"),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;

    // Get the consent to validate and fetch context
    const consent = await ctx.db.get(args.consentId);
    if (!consent) {
      throw new Error("Consent not found");
    }

    // Get accessor details
    const accessedByName: string = await ctx.runQuery(
      api.models.passportSharing._getBetterAuthUserName,
      {
        userId,
      }
    );

    // Get accessor's current role/org context
    // For now, we'll use the receiving org from consent
    // TODO: Get actual role from Better Auth member table
    const accessedByRole = "Coach"; // Default - should be fetched from member table

    // Get receiving org name
    const receivingOrg = await ctx.runQuery(
      api.models.organizations.getOrganization,
      { organizationId: consent.receivingOrgId }
    );

    const accessedByOrgName: string =
      receivingOrg?.name || consent.receivingOrgId;

    // Create immutable audit log entry
    const logId: Id<"passportShareAccessLogs"> = await ctx.db.insert(
      "passportShareAccessLogs",
      {
        consentId: args.consentId,
        playerIdentityId: consent.playerIdentityId,
        accessedBy: userId,
        accessedByName,
        accessedByRole,
        accessedByOrgId: consent.receivingOrgId,
        accessedByOrgName,
        sourceOrgId: consent.receivingOrgId, // TODO: Track which source org was viewed
        accessType: args.accessType,
        accessedAt: Date.now(),
        ipAddress: args.ipAddress,
        userAgent: args.userAgent,
      }
    );

    console.log(
      `[Passport Sharing] Access logged: ${userId} (${accessedByRole} at ${accessedByOrgName}) accessed ${args.accessType} for player ${consent.playerIdentityId}`,
      { consentId: args.consentId, logId }
    );

    return logId;
  },
});

// ============================================================
// SCHEDULED JOBS
// ============================================================

/**
 * Process consent expiry and renewal reminders
 *
 * Runs daily to:
 * 1. Find consents expiring in 14 days and send renewal reminders
 * 2. Find expired consents and set status to 'expired'
 *
 * This is an internal mutation called by cron job.
 */
export const processConsentExpiry = internalMutation({
  args: {},
  returns: v.object({
    renewalRemindersSent: v.number(),
    consentsExpired: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
    const fourteenDaysFromNow = now + fourteenDaysInMs;

    let renewalRemindersSent = 0;
    let consentsExpired = 0;

    // 1. Find consents expiring in 14 days that need renewal reminders
    const consentsNearExpiry = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_expiry")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          // Expires between now and 14 days from now
          q.gte(q.field("expiresAt"), now),
          q.lte(q.field("expiresAt"), fourteenDaysFromNow),
          // Hasn't already sent renewal reminder
          q.eq(q.field("renewalReminderSent"), false)
        )
      )
      .collect();

    // Send renewal reminders
    for (const consent of consentsNearExpiry) {
      // Mark reminder as sent
      await ctx.db.patch(consent._id, {
        renewalReminderSent: true,
      });

      // Notify guardians
      await notifyGuardiansOfSharingChange(ctx, {
        playerIdentityId: consent.playerIdentityId,
        eventType: "share_expiring",
        actorUserId: "system",
        actorName: "System",
        metadata: {
          consentId: consent._id,
          receivingOrgId: consent.receivingOrgId,
          expiresAt: consent.expiresAt,
          daysUntilExpiry: Math.ceil(
            (consent.expiresAt - now) / (24 * 60 * 60 * 1000)
          ),
        },
      });

      renewalRemindersSent += 1;
    }

    // 2. Find expired consents
    const expiredConsents = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_expiry")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.lt(q.field("expiresAt"), now)
        )
      )
      .collect();

    // Set status to expired
    for (const consent of expiredConsents) {
      await ctx.db.patch(consent._id, {
        status: "expired",
      });

      // Notify guardians
      await notifyGuardiansOfSharingChange(ctx, {
        playerIdentityId: consent.playerIdentityId,
        eventType: "share_expired",
        actorUserId: "system",
        actorName: "System",
        metadata: {
          consentId: consent._id,
          receivingOrgId: consent.receivingOrgId,
        },
      });

      consentsExpired += 1;
    }

    console.log(
      `[Passport Sharing] Consent expiry job completed: ${renewalRemindersSent} renewal reminders sent, ${consentsExpired} consents expired`
    );

    return { renewalRemindersSent, consentsExpired };
  },
});

// ============================================================
// US-024: QUERY HELPERS FOR PARENT DASHBOARD
// ============================================================

/**
 * Get pending access requests for a player (for parent dashboard)
 * Shows all pending requests awaiting parent response
 *
 * @param playerIdentityId - Player identity ID
 * @returns Array of pending requests for this player
 */
export const getPendingRequestsForPlayer = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.array(
    v.object({
      requestId: v.id("passportShareRequests"),
      requestedBy: v.string(),
      requestedByName: v.string(),
      requestingOrgId: v.string(),
      requestingOrgName: v.string(),
      reason: v.optional(v.string()),
      requestedAt: v.number(),
      expiresAt: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("declined"),
        v.literal("expired")
      ),
    })
  ),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Get all pending requests for this player
    const requests = await ctx.db
      .query("passportShareRequests")
      .withIndex("by_player_and_status", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId).eq("status", "pending")
      )
      .collect();

    // Filter for unexpired requests
    const now = Date.now();
    const validRequests = requests.filter((req) => req.expiresAt > now);

    // Map to return format
    return validRequests.map((request) => ({
      requestId: request._id,
      requestedBy: request.requestedBy,
      requestedByName: request.requestedByName,
      requestingOrgId: request.requestingOrgId,
      requestingOrgName: request.requestingOrgName,
      reason: request.reason,
      requestedAt: request.requestedAt,
      expiresAt: request.expiresAt,
      status: request.status,
    }));
  },
});

/**
 * US-030: Get last consent settings for Quick Share feature
 *
 * Returns the most recent consent settings for a player so parents can
 * quickly re-enable sharing with the same configuration.
 *
 * @param playerIdentityId - Player identity ID
 * @returns Last consent settings or null if no previous consent
 */
export const getLastConsentSettings = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.union(
    v.object({
      receivingOrgId: v.string(),
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
      sourceOrgMode: v.union(
        v.literal("all_enrolled"),
        v.literal("specific_orgs")
      ),
      sourceOrgIds: v.optional(v.array(v.string())),
      expiresAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Get all consents for this player, ordered by creation date (most recent first)
    const consents = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .order("desc")
      .collect();

    // Filter for consents that were successfully created (ignore ones that were never accepted)
    // We want to use settings from consents that actually worked before
    const successfulConsents = consents.filter(
      (c) =>
        c.status === "active" ||
        c.status === "expired" ||
        c.status === "revoked"
    );

    // Return null if no previous consent exists
    if (successfulConsents.length === 0) {
      return null;
    }

    // Get the most recent consent
    const lastConsent = successfulConsents[0];

    // Return settings suitable for creating a new consent
    // Note: We calculate a new expiresAt date (same duration as before)
    const originalDuration = lastConsent.expiresAt - lastConsent.consentedAt;
    const newExpiresAt = Date.now() + originalDuration;

    return {
      receivingOrgId: lastConsent.receivingOrgId,
      sharedElements: lastConsent.sharedElements,
      sourceOrgMode: lastConsent.sourceOrgMode,
      sourceOrgIds: lastConsent.sourceOrgIds,
      expiresAt: newExpiresAt,
    };
  },
});

// ============================================================
// ACCESS AUDIT LOG QUERIES
// US-032: Access audit log viewer
// ============================================================

/**
 * Get access logs for a player
 * Returns paginated audit trail of all data access for a player
 *
 * @param playerIdentityId - The player whose access logs to fetch
 * @param limit - Number of logs to return (default 50)
 * @param offset - Number of logs to skip for pagination (default 0)
 * @returns Array of access log entries
 */
export const getAccessLogsForPlayer = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  returns: v.object({
    logs: v.array(
      v.object({
        _id: v.id("passportShareAccessLogs"),
        consentId: v.id("passportShareConsents"),
        accessedByName: v.string(),
        accessedByRole: v.string(),
        accessedByOrgName: v.string(),
        accessType: v.string(),
        accessedAt: v.number(),
        sourceOrgId: v.optional(v.string()),
      })
    ),
    total: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Authentication check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Set pagination defaults
    const limit = args.limit || 50;
    const offset = args.offset || 0;

    // Fetch all access logs for this player
    const allLogs = await ctx.db
      .query("passportShareAccessLogs")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .order("desc") // Most recent first
      .collect();

    // Calculate pagination
    const total = allLogs.length;
    const paginatedLogs = allLogs.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    // Map to return format
    const logs = paginatedLogs.map((log) => ({
      _id: log._id,
      consentId: log.consentId,
      accessedByName: log.accessedByName,
      accessedByRole: log.accessedByRole,
      accessedByOrgName: log.accessedByOrgName,
      accessType: log.accessType,
      accessedAt: log.accessedAt,
      sourceOrgId: log.sourceOrgId,
    }));

    return {
      logs,
      total,
      hasMore,
    };
  },
});

// ============================================================
// NOTIFICATION PREFERENCES
// ============================================================

/**
 * Get notification preferences for a guardian
 * Returns preferences for a specific player or global defaults
 *
 * @param guardianIdentityId - The guardian to get preferences for
 * @param playerIdentityId - Optional player ID for player-specific preferences
 * @returns Notification preferences or defaults if not set
 */
export const getNotificationPreferences = query({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    playerIdentityId: v.optional(v.id("playerIdentities")),
  },
  returns: v.union(
    v.object({
      _id: v.id("parentNotificationPreferences"),
      guardianIdentityId: v.id("guardianIdentities"),
      playerIdentityId: v.optional(v.id("playerIdentities")),
      accessNotificationFrequency: v.union(
        v.literal("realtime"),
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("none")
      ),
      notifyOnCoachRequest: v.optional(v.boolean()),
      notifyOnShareExpiring: v.optional(v.boolean()),
      notifyOnGuardianChange: v.optional(v.boolean()),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Authentication check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Query for preferences using by_guardian index
    const allPreferences = await ctx.db
      .query("parentNotificationPreferences")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", args.guardianIdentityId)
      )
      .collect();

    // Filter by playerIdentityId if provided
    const preferences = allPreferences.find((pref) =>
      args.playerIdentityId
        ? pref.playerIdentityId === args.playerIdentityId
        : pref.playerIdentityId === undefined
    );

    return preferences || null;
  },
});

/**
 * Update notification preferences for a guardian
 * Creates or updates preferences for a specific player or globally
 *
 * @param guardianIdentityId - The guardian updating preferences
 * @param playerIdentityId - Optional player ID for player-specific preferences
 * @param accessNotificationFrequency - How often to notify on data access
 * @param notifyOnCoachRequest - Whether to notify on coach access requests
 * @param notifyOnShareExpiring - Whether to notify when shares are expiring
 * @param notifyOnGuardianChange - Whether to notify when other guardians make changes
 * @returns The updated preferences ID
 */
export const updateNotificationPreferences = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    playerIdentityId: v.optional(v.id("playerIdentities")),
    accessNotificationFrequency: v.union(
      v.literal("realtime"),
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("none")
    ),
    notifyOnCoachRequest: v.optional(v.boolean()),
    notifyOnShareExpiring: v.optional(v.boolean()),
    notifyOnGuardianChange: v.optional(v.boolean()),
  },
  returns: v.id("parentNotificationPreferences"),
  handler: async (ctx, args) => {
    // Authentication check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Check if preferences already exist using by_guardian index
    const allPreferences = await ctx.db
      .query("parentNotificationPreferences")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", args.guardianIdentityId)
      )
      .collect();

    // Filter by playerIdentityId if provided
    const existing = allPreferences.find((pref) =>
      args.playerIdentityId
        ? pref.playerIdentityId === args.playerIdentityId
        : pref.playerIdentityId === undefined
    );

    const now = Date.now();

    if (existing) {
      // Update existing preferences
      await ctx.db.patch(existing._id, {
        accessNotificationFrequency: args.accessNotificationFrequency,
        notifyOnCoachRequest: args.notifyOnCoachRequest,
        notifyOnShareExpiring: args.notifyOnShareExpiring,
        notifyOnGuardianChange: args.notifyOnGuardianChange,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new preferences
    const preferencesId = await ctx.db.insert("parentNotificationPreferences", {
      guardianIdentityId: args.guardianIdentityId,
      playerIdentityId: args.playerIdentityId,
      accessNotificationFrequency: args.accessNotificationFrequency,
      notifyOnCoachRequest: args.notifyOnCoachRequest,
      notifyOnShareExpiring: args.notifyOnShareExpiring,
      notifyOnGuardianChange: args.notifyOnGuardianChange,
      updatedAt: now,
    });

    return preferencesId;
  },
});

// ============================================================
// COACH QUERIES
// ============================================================

/**
 * Get shared passports visible to a coach
 * Filters to players on teams the coach is assigned to
 * Shows only accepted consents for the coach's organization
 *
 * @param userId - The coach's user ID
 * @param organizationId - The coach's organization ID
 * @returns Array of shared passport records with player and source org info
 */
export const getSharedPassportsForCoach = query({
  args: {
    userId: v.string(),
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      consentId: v.id("passportShareConsents"),
      playerIdentityId: v.id("playerIdentities"),
      playerName: v.string(),
      sourceOrgIds: v.array(v.string()),
      sourceOrgMode: v.union(
        v.literal("all_enrolled"),
        v.literal("specific_orgs")
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
      lastUpdated: v.number(),
      acceptedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get coach assignments
    const coachAssignment = await ctx.db
      .query("coachAssignments")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    // If coach has no assignments, return empty array
    if (!coachAssignment?.teams.length) {
      return [];
    }

    // Get team player links for assigned teams
    const teamPlayerLinks = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    // Filter to players on coach's assigned teams
    const coachPlayerIds = new Set(
      teamPlayerLinks
        .filter((link) => coachAssignment.teams.includes(link.teamId))
        .map((link) => link.playerIdentityId)
    );

    // If coach has no players, return empty array
    if (coachPlayerIds.size === 0) {
      return [];
    }

    // Get accepted consents for this organization
    const consents = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_coach_acceptance", (q) =>
        q
          .eq("receivingOrgId", args.organizationId)
          .eq("coachAcceptanceStatus", "accepted")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .collect();

    // Filter to only players on coach's teams
    const coachConsents = consents.filter((consent) =>
      coachPlayerIds.has(consent.playerIdentityId)
    );

    // Enrich with player info
    const enriched = await Promise.all(
      coachConsents.map(async (consent) => {
        // Get player identity
        const player = await ctx.db.get(consent.playerIdentityId);
        if (!player) {
          return null;
        }

        // Get source org IDs based on mode
        let sourceOrgIds: string[] = [];
        if (consent.sourceOrgMode === "all_enrolled") {
          // Get all active enrollments for this player
          const enrollments = await ctx.db
            .query("orgPlayerEnrollments")
            .withIndex("by_playerIdentityId", (q) =>
              q.eq("playerIdentityId", consent.playerIdentityId)
            )
            .filter((q) => q.eq(q.field("status"), "active"))
            .collect();

          sourceOrgIds = enrollments.map((e) => e.organizationId);
        } else if (
          consent.sourceOrgMode === "specific_orgs" &&
          consent.sourceOrgIds
        ) {
          sourceOrgIds = consent.sourceOrgIds;
        }

        return {
          consentId: consent._id,
          playerIdentityId: consent.playerIdentityId,
          playerName: `${player.firstName} ${player.lastName}`,
          sourceOrgIds,
          sourceOrgMode: consent.sourceOrgMode,
          sharedElements: consent.sharedElements,
          lastUpdated: consent.consentedAt, // Use consentedAt as lastUpdated for now
          acceptedAt: consent.acceptedAt || consent.consentedAt,
        };
      })
    );

    // Filter out any null results and return
    return enriched.filter(
      (item): item is NonNullable<typeof item> => item !== null
    );
  },
});

/**
 * US-037: Get pending passport shares for a coach to accept/decline
 *
 * Returns all pending shares (coachAcceptanceStatus = "pending") for players
 * on teams the coach is assigned to in their organization.
 *
 * @param userId - Coach's user ID
 * @param organizationId - Coach's organization ID
 * @returns Array of pending shares with player and source org details
 */
export const getPendingSharesForCoach = query({
  args: {
    userId: v.string(),
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      consentId: v.id("passportShareConsents"),
      playerIdentityId: v.id("playerIdentities"),
      playerName: v.string(),
      sourceOrgIds: v.array(v.string()),
      sourceOrgMode: v.union(
        v.literal("all_enrolled"),
        v.literal("specific_orgs")
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
    })
  ),
  handler: async (ctx, args) => {
    // Get coach assignments
    const coachAssignment = await ctx.db
      .query("coachAssignments")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    // If coach has no assignments, return empty array
    if (!coachAssignment?.teams.length) {
      return [];
    }

    // Get team player links for assigned teams
    const teamPlayerLinks = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    // Filter to players on coach's assigned teams
    const coachPlayerIds = new Set(
      teamPlayerLinks
        .filter((link) => coachAssignment.teams.includes(link.teamId))
        .map((link) => link.playerIdentityId)
    );

    // If coach has no players, return empty array
    if (coachPlayerIds.size === 0) {
      return [];
    }

    // Get pending consents for this organization
    const consents = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_coach_acceptance", (q) =>
        q
          .eq("receivingOrgId", args.organizationId)
          .eq("coachAcceptanceStatus", "pending")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .collect();

    // Filter to only players on coach's teams
    const coachConsents = consents.filter((consent) =>
      coachPlayerIds.has(consent.playerIdentityId)
    );

    // Enrich with player info
    const enriched = await Promise.all(
      coachConsents.map(async (consent) => {
        // Get player identity
        const player = await ctx.db.get(consent.playerIdentityId);
        if (!player) {
          return null;
        }

        // Get source org IDs based on mode
        let sourceOrgIds: string[] = [];
        if (consent.sourceOrgMode === "all_enrolled") {
          // Get all active enrollments for this player
          const enrollments = await ctx.db
            .query("orgPlayerEnrollments")
            .withIndex("by_playerIdentityId", (q) =>
              q.eq("playerIdentityId", consent.playerIdentityId)
            )
            .filter((q) => q.eq(q.field("status"), "active"))
            .collect();
          sourceOrgIds = enrollments.map((e) => e.organizationId);
        } else {
          // Use specific org IDs from consent
          sourceOrgIds = consent.sourceOrgIds || [];
        }

        return {
          consentId: consent._id,
          playerIdentityId: consent.playerIdentityId,
          playerName: `${player.firstName} ${player.lastName}`,
          sourceOrgIds,
          sourceOrgMode: consent.sourceOrgMode,
          sharedElements: consent.sharedElements,
          consentedAt: consent.consentedAt,
          expiresAt: consent.expiresAt,
        };
      })
    );

    // Filter out any null results and return
    return enriched.filter(
      (item): item is NonNullable<typeof item> => item !== null
    );
  },
});

/**
 * Bulk check passport sharing availability for multiple players
 * Used by coaches to efficiently check passport status for all their players at once
 * Avoids N+1 query problem when displaying badges in player lists
 *
 * @param playerIdentityIds - Array of player IDs to check
 * @param organizationId - The organization (coach's org) checking access
 * @param userId - The coach's user ID
 * @returns Array of availability status for each player
 */
export const checkPassportAvailabilityBulk = query({
  args: {
    playerIdentityIds: v.array(v.id("playerIdentities")),
    organizationId: v.string(),
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      playerIdentityId: v.id("playerIdentities"),
      hasActiveSharesToView: v.boolean(),
      hasPendingSharesToAccept: v.boolean(),
      pendingShareCount: v.number(),
      activeShareCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const results = [];

    for (const playerIdentityId of args.playerIdentityIds) {
      // Check for active shares the coach can view
      const activeShares = await ctx.db
        .query("passportShareConsents")
        .withIndex("by_player_and_status", (q) =>
          q.eq("playerIdentityId", playerIdentityId).eq("status", "active")
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("receivingOrgId"), args.organizationId),
            q.eq(q.field("coachAcceptanceStatus"), "accepted"),
            q.eq(q.field("acceptedByCoachId"), args.userId)
          )
        )
        .collect();

      // Check for pending shares awaiting this coach's acceptance
      const pendingShares = await ctx.db
        .query("passportShareConsents")
        .withIndex("by_player_and_status", (q) =>
          q.eq("playerIdentityId", playerIdentityId).eq("status", "active")
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("receivingOrgId"), args.organizationId),
            q.eq(q.field("coachAcceptanceStatus"), "pending")
          )
        )
        .collect();

      // Pending shares are all available for this coach (no decline tracking per coach)
      const pendingSharesForCoach = pendingShares;

      results.push({
        playerIdentityId,
        hasActiveSharesToView: activeShares.length > 0,
        hasPendingSharesToAccept: pendingSharesForCoach.length > 0,
        pendingShareCount: pendingSharesForCoach.length,
        activeShareCount: activeShares.length,
      });
    }

    return results;
  },
});

/**
 * Check if a player has an active share or pending request with an organization
 * Used to determine whether to show "Request Access" button on player profile
 *
 * @param playerIdentityId - The player to check
 * @param organizationId - The organization requesting access
 * @returns Status object with hasActiveShare and hasPendingRequest flags
 */
export const checkPlayerShareStatus = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.object({
    hasActiveShare: v.boolean(),
    hasPendingRequest: v.boolean(),
    consentId: v.optional(v.id("passportShareConsents")),
    canRequestAccess: v.boolean(),
    hasOtherEnrollments: v.boolean(),
    enrollmentVisibilityAllowed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Check for active consent
    const activeConsent = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_player_and_status", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId).eq("status", "active")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("receivingOrgId"), args.organizationId),
          q.gt(q.field("expiresAt"), Date.now()),
          q.eq(q.field("coachAcceptanceStatus"), "accepted")
        )
      )
      .first();

    // Check for pending request
    const pendingRequest = await ctx.db
      .query("passportShareRequests")
      .withIndex("by_player_and_status", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId).eq("status", "pending")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("requestingOrgId"), args.organizationId),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .first();

    // Check if player has enrollments in OTHER organizations (not the requesting org)
    const playerEnrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    const hasOtherEnrollments = playerEnrollments.length > 0;

    // Check if parent has allowed enrollment visibility
    // Find the player's guardian
    const playerIdentity = await ctx.db.get(args.playerIdentityId);
    if (!playerIdentity) {
      return {
        hasActiveShare: false,
        hasPendingRequest: false,
        consentId: undefined,
        canRequestAccess: false,
        hasOtherEnrollments: false,
        enrollmentVisibilityAllowed: false,
      };
    }

    // Get guardian-player link
    const guardianLink = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .filter((q) => q.eq(q.field("isPrimary"), true))
      .first();

    let enrollmentVisibilityAllowed = true; // Default to true

    if (guardianLink) {
      // Check notification preferences for enrollment visibility setting
      const preferences = await ctx.db
        .query("parentNotificationPreferences")
        .withIndex("by_guardian_and_player", (q) =>
          q
            .eq("guardianIdentityId", guardianLink.guardianIdentityId)
            .eq("playerIdentityId", args.playerIdentityId)
        )
        .first();

      // If preferences exist and explicitly set to false, use that setting
      if (preferences && preferences.allowEnrollmentVisibility === false) {
        enrollmentVisibilityAllowed = false;
      }
    }

    // Can request access ONLY if:
    // 1. Player has enrollments in other organizations
    // 2. Parent has allowed enrollment visibility
    // 3. No active share exists
    // 4. No pending request exists
    const canRequestAccess =
      hasOtherEnrollments &&
      enrollmentVisibilityAllowed &&
      !activeConsent &&
      !pendingRequest;

    return {
      hasActiveShare: !!activeConsent,
      hasPendingRequest: !!pendingRequest,
      consentId: activeConsent?._id,
      canRequestAccess,
      hasOtherEnrollments,
      enrollmentVisibilityAllowed,
    };
  },
});

// ============================================================
// ADMIN QUERIES
// ============================================================

/**
 * Get aggregate sharing statistics for an organization
 * For FR-AD1: Sharing Overview Dashboard
 */
export const getOrgSharingStats = query({
  args: { organizationId: v.string() },
  returns: v.object({
    playersWithSharing: v.number(),
    incomingShares: v.number(),
    outgoingShares: v.number(),
  }),
  handler: async (ctx, args) => {
    // Players with active outgoing shares (where this org is a source org)
    // Count unique players who have granted consent where this org is in their sourceOrgIds
    const outgoingConsents = await ctx.db
      .query("passportShareConsents")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Filter for consents where this org is a source
    const outgoingPlayerIds = new Set<Id<"playerIdentities">>();
    for (const consent of outgoingConsents) {
      // Check if this org is in the sourceOrgIds
      if (consent.sourceOrgIds?.includes(args.organizationId)) {
        outgoingPlayerIds.add(consent.playerIdentityId);
      }
    }

    // Incoming shares: consents where this org is the receiving org and coachAcceptanceStatus is 'accepted'
    const incomingConsents = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_receiving_org", (q) =>
        q.eq("receivingOrgId", args.organizationId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("coachAcceptanceStatus"), "accepted")
        )
      )
      .collect();

    return {
      playersWithSharing: outgoingPlayerIds.size,
      incomingShares: incomingConsents.length,
      outgoingShares: outgoingConsents.filter((c) =>
        c.sourceOrgIds?.includes(args.organizationId)
      ).length,
    };
  },
});

/**
 * Get outgoing shares report for an organization
 * For FR-AD2: Outgoing Shares Report
 */
export const getOrgOutgoingShares = query({
  args: { organizationId: v.string() },
  returns: v.array(
    v.object({
      consentId: v.id("passportShareConsents"),
      playerIdentityId: v.id("playerIdentities"),
      playerName: v.string(),
      receivingOrgId: v.string(),
      receivingOrgName: v.string(),
      elementsShared: v.array(v.string()),
      sharedSince: v.number(),
      status: v.string(),
      coachAcceptanceStatus: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    // Get all consents and filter for active ones
    const allConsents = await ctx.db
      .query("passportShareConsents")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Filter for consents where this org is a source
    const outgoingConsents = allConsents.filter((c) =>
      c.sourceOrgIds?.includes(args.organizationId)
    );

    // Enrich with player and org names
    const enrichedConsents: Array<{
      consentId: Id<"passportShareConsents">;
      playerIdentityId: Id<"playerIdentities">;
      playerName: string;
      receivingOrgId: string;
      receivingOrgName: string;
      elementsShared: string[];
      sharedSince: number;
      status: string;
      coachAcceptanceStatus: string;
    }> = await Promise.all(
      outgoingConsents.map(async (consent) => {
        // Get player identity
        const playerIdentity = await ctx.db.get(consent.playerIdentityId);
        const playerName: string = playerIdentity
          ? `${playerIdentity.firstName} ${playerIdentity.lastName}`
          : "Unknown Player";

        // Get receiving organization name
        const receivingOrg: any = await ctx.runQuery(
          api.models.organizations.getOrganization,
          { organizationId: consent.receivingOrgId }
        );
        const receivingOrgName: string =
          receivingOrg?.name || "Unknown Organization";

        // Build list of shared elements
        const elementsShared: string[] = [];
        if (consent.sharedElements.basicProfile) {
          elementsShared.push("Basic Profile");
        }
        if (consent.sharedElements.skillRatings) {
          elementsShared.push("Skills");
        }
        if (consent.sharedElements.developmentGoals) {
          elementsShared.push("Goals");
        }
        if (consent.sharedElements.coachNotes) {
          elementsShared.push("Coach Notes");
        }
        if (consent.sharedElements.benchmarkData) {
          elementsShared.push("Benchmarks");
        }
        if (consent.sharedElements.attendanceRecords) {
          elementsShared.push("Attendance");
        }
        if (consent.sharedElements.injuryHistory) {
          elementsShared.push("Injuries");
        }
        if (consent.sharedElements.medicalSummary) {
          elementsShared.push("Medical Info");
        }
        if (consent.sharedElements.contactInfo) {
          elementsShared.push("Contact Info");
        }

        return {
          consentId: consent._id,
          playerIdentityId: consent.playerIdentityId,
          playerName,
          receivingOrgId: consent.receivingOrgId,
          receivingOrgName,
          elementsShared,
          sharedSince: consent.consentedAt,
          status: consent.status,
          coachAcceptanceStatus: consent.coachAcceptanceStatus,
        };
      })
    );

    return enrichedConsents;
  },
});

/**
 * Get incoming shares report for an organization
 * For FR-AD3: Incoming Shares Report
 */
export const getOrgIncomingShares = query({
  args: { organizationId: v.string() },
  returns: v.array(
    v.object({
      consentId: v.id("passportShareConsents"),
      playerIdentityId: v.id("playerIdentities"),
      playerName: v.string(),
      sourceOrgIds: v.array(v.string()),
      sourceOrgNames: v.array(v.string()),
      elementsReceived: v.array(v.string()),
      sharedSince: v.number(),
      lastAccessedAt: v.optional(v.number()),
      accessCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get all active, accepted consents where this org is receiving
    const incomingConsents = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_receiving_org", (q) =>
        q.eq("receivingOrgId", args.organizationId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("coachAcceptanceStatus"), "accepted")
        )
      )
      .collect();

    // Enrich with player names, source org names, and access stats
    const enrichedConsents: Array<{
      consentId: Id<"passportShareConsents">;
      playerIdentityId: Id<"playerIdentities">;
      playerName: string;
      sourceOrgIds: string[];
      sourceOrgNames: string[];
      elementsReceived: string[];
      sharedSince: number;
      lastAccessedAt?: number;
      accessCount: number;
    }> = await Promise.all(
      incomingConsents.map(
        async (
          consent
        ): Promise<{
          consentId: Id<"passportShareConsents">;
          playerIdentityId: Id<"playerIdentities">;
          playerName: string;
          sourceOrgIds: string[];
          sourceOrgNames: string[];
          elementsReceived: string[];
          sharedSince: number;
          lastAccessedAt?: number;
          accessCount: number;
        }> => {
          // Get player identity
          const playerIdentity = await ctx.db.get(consent.playerIdentityId);
          const playerName: string = playerIdentity
            ? `${playerIdentity.firstName} ${playerIdentity.lastName}`
            : "Unknown Player";

          // Get source organization names
          const sourceOrgNames: string[] = await Promise.all(
            (consent.sourceOrgIds || []).map(
              async (orgId: string): Promise<string> => {
                const org: any = await ctx.runQuery(
                  api.models.organizations.getOrganization,
                  { organizationId: orgId }
                );
                return org?.name || "Unknown Organization";
              }
            )
          );

          // Build list of received elements
          const elementsReceived: string[] = [];
          if (consent.sharedElements.basicProfile) {
            elementsReceived.push("Basic Profile");
          }
          if (consent.sharedElements.skillRatings) {
            elementsReceived.push("Skills");
          }
          if (consent.sharedElements.developmentGoals) {
            elementsReceived.push("Goals");
          }
          if (consent.sharedElements.coachNotes) {
            elementsReceived.push("Coach Notes");
          }
          if (consent.sharedElements.benchmarkData) {
            elementsReceived.push("Benchmarks");
          }
          if (consent.sharedElements.attendanceRecords) {
            elementsReceived.push("Attendance");
          }
          if (consent.sharedElements.injuryHistory) {
            elementsReceived.push("Injuries");
          }
          if (consent.sharedElements.medicalSummary) {
            elementsReceived.push("Medical Info");
          }
          if (consent.sharedElements.contactInfo) {
            elementsReceived.push("Contact Info");
          }

          // Get access logs for this consent
          const accessLogs = await ctx.db
            .query("passportShareAccessLogs")
            .withIndex("by_consent", (q) => q.eq("consentId", consent._id))
            .collect();

          const lastAccessedAt =
            accessLogs.length > 0
              ? Math.max(...accessLogs.map((log) => log.accessedAt))
              : undefined;

          return {
            consentId: consent._id,
            playerIdentityId: consent.playerIdentityId,
            playerName,
            sourceOrgIds: consent.sourceOrgIds || [],
            sourceOrgNames,
            elementsReceived,
            sharedSince: consent.consentedAt,
            lastAccessedAt,
            accessCount: accessLogs.length,
          };
        }
      )
    );

    return enrichedConsents;
  },
});

/**
 * Get recent sharing activity for an organization (both incoming and outgoing)
 * For FR-AD2/AD3: Recent activity feed
 */
export const getOrgRecentSharingActivity = query({
  args: { organizationId: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      activityType: v.union(
        v.literal("consent_created"),
        v.literal("consent_accepted"),
        v.literal("consent_declined"),
        v.literal("consent_revoked"),
        v.literal("data_accessed")
      ),
      timestamp: v.number(),
      playerName: v.string(),
      orgName: v.string(),
      details: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const activities: Array<{
      activityType:
        | "consent_created"
        | "consent_accepted"
        | "consent_declined"
        | "consent_revoked"
        | "data_accessed";
      timestamp: number;
      playerName: string;
      orgName: string;
      details?: string;
    }> = [];

    // Get recent consents involving this org
    const recentConsents = await ctx.db
      .query("passportShareConsents")
      .order("desc")
      .take(50);

    for (const consent of recentConsents) {
      // Check if this org is involved (as source or receiver)
      const isSourceOrg = consent.sourceOrgIds?.includes(args.organizationId);
      const isReceivingOrg = consent.receivingOrgId === args.organizationId;

      if (!(isSourceOrg || isReceivingOrg)) {
        continue;
      }

      // Get player name
      const playerIdentity = await ctx.db.get(consent.playerIdentityId);
      const playerName = playerIdentity
        ? `${playerIdentity.firstName} ${playerIdentity.lastName}`
        : "Unknown Player";

      // Get other org name
      const otherOrgId = isSourceOrg
        ? consent.receivingOrgId
        : consent.sourceOrgIds?.[0] || "";
      const otherOrg = await ctx.runQuery(
        api.models.organizations.getOrganization,
        { organizationId: otherOrgId }
      );
      const orgName = otherOrg?.name || "Unknown Organization";

      // Add activity based on consent lifecycle
      if (consent.coachAcceptanceStatus === "accepted" && consent.acceptedAt) {
        activities.push({
          activityType: "consent_accepted",
          timestamp: consent.acceptedAt,
          playerName,
          orgName,
          details: isReceivingOrg
            ? "Accepted incoming share"
            : "Share accepted by receiving org",
        });
      }

      if (consent.coachAcceptanceStatus === "declined" && consent.declinedAt) {
        activities.push({
          activityType: "consent_declined",
          timestamp: consent.declinedAt,
          playerName,
          orgName,
          details: consent.declineReason || undefined,
        });
      }

      if (consent.status === "revoked" && consent.revokedAt) {
        activities.push({
          activityType: "consent_revoked",
          timestamp: consent.revokedAt,
          playerName,
          orgName,
          details: consent.revokedReason || undefined,
        });
      }

      if (consent.status === "active") {
        activities.push({
          activityType: "consent_created",
          timestamp: consent.consentedAt,
          playerName,
          orgName,
        });
      }
    }

    // Sort by timestamp descending and limit
    activities.sort((a, b) => b.timestamp - a.timestamp);
    return activities.slice(0, limit);
  },
});

/**
 * Get pending coach acceptances for an organization
 * For FR-AD2/AD3: Pending acceptances list
 */
export const getOrgPendingAcceptances = query({
  args: { organizationId: v.string() },
  returns: v.array(
    v.object({
      consentId: v.id("passportShareConsents"),
      playerName: v.string(),
      sourceOrgNames: v.array(v.string()),
      consentedAt: v.number(),
      daysPending: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get consents where this org is receiving and status is pending
    const pendingConsents = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_receiving_org", (q) =>
        q.eq("receivingOrgId", args.organizationId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("coachAcceptanceStatus"), "pending")
        )
      )
      .collect();

    // Enrich with player and org names
    const enrichedConsents: Array<{
      consentId: Id<"passportShareConsents">;
      playerName: string;
      sourceOrgNames: string[];
      consentedAt: number;
      daysPending: number;
    }> = await Promise.all(
      pendingConsents.map(
        async (
          consent
        ): Promise<{
          consentId: Id<"passportShareConsents">;
          playerName: string;
          sourceOrgNames: string[];
          consentedAt: number;
          daysPending: number;
        }> => {
          // Get player identity
          const playerIdentity = await ctx.db.get(consent.playerIdentityId);
          const playerName: string = playerIdentity
            ? `${playerIdentity.firstName} ${playerIdentity.lastName}`
            : "Unknown Player";

          // Get source organization names
          const sourceOrgNames: string[] = await Promise.all(
            (consent.sourceOrgIds || []).map(
              async (orgId: string): Promise<string> => {
                const org: any = await ctx.runQuery(
                  api.models.organizations.getOrganization,
                  { organizationId: orgId }
                );
                return org?.name || "Unknown Organization";
              }
            )
          );

          // Calculate days pending
          const daysPending = Math.floor(
            (Date.now() - consent.consentedAt) / (1000 * 60 * 60 * 24)
          );

          return {
            consentId: consent._id,
            playerName,
            sourceOrgNames,
            consentedAt: consent.consentedAt,
            daysPending,
          };
        }
      )
    );

    return enrichedConsents;
  },
});

// ============================================================
// NOTIFICATION QUERIES & MUTATIONS
// ============================================================

/**
 * Get all notifications for a user
 * @param userId - User ID to fetch notifications for
 * @param includeRead - Whether to include read notifications (default: false)
 * @returns List of notifications sorted by creation date (newest first)
 */
export const getUserNotifications = query({
  args: {
    userId: v.string(),
    includeRead: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("passportShareNotifications"),
      notificationType: v.string(),
      title: v.string(),
      message: v.string(),
      actionUrl: v.optional(v.string()),
      createdAt: v.number(),
      readAt: v.optional(v.number()),
      dismissedAt: v.optional(v.number()),
      consentId: v.optional(v.id("passportShareConsents")),
      playerIdentityId: v.optional(v.id("playerIdentities")),
      requestId: v.optional(v.id("passportShareRequests")),
    })
  ),
  handler: async (ctx, args) => {
    const { userId, includeRead = false } = args;

    // Query notifications for this user
    let notifications = await ctx.db
      .query("passportShareNotifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter out read notifications if includeRead is false
    if (!includeRead) {
      notifications = notifications.filter((n) => !n.readAt);
    }

    // Sort by creation date (newest first)
    notifications.sort((a, b) => b.createdAt - a.createdAt);

    return notifications;
  },
});

/**
 * Get unread notification count for a user
 * @param userId - User ID to count notifications for
 * @returns Count of unread notifications
 */
export const getUnreadNotificationCount = query({
  args: {
    userId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("passportShareNotifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Count unread notifications (readAt is undefined)
    return notifications.filter((n) => !n.readAt).length;
  },
});

/**
 * Mark a notification as read
 * @param notificationId - Notification ID to mark as read
 * @returns Success boolean
 */
export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("passportShareNotifications"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    // Only update if not already read
    if (!notification.readAt) {
      await ctx.db.patch(args.notificationId, {
        readAt: Date.now(),
      });
    }

    return true;
  },
});

/**
 * Mark all notifications as read for a user
 * @param userId - User ID to mark all notifications as read
 * @returns Count of notifications marked as read
 */
export const markAllNotificationsAsRead = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("passportShareNotifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const unreadNotifications = notifications.filter((n) => !n.readAt);

    const now = Date.now();
    await Promise.all(
      unreadNotifications.map((n) => ctx.db.patch(n._id, { readAt: now }))
    );

    return unreadNotifications.length;
  },
});

/**
 * Dismiss a notification (soft delete)
 * @param notificationId - Notification ID to dismiss
 * @returns Success boolean
 */
export const dismissNotification = mutation({
  args: {
    notificationId: v.id("passportShareNotifications"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.notificationId, {
      dismissedAt: Date.now(),
    });

    return true;
  },
});
