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
      | "share_expiring"
      | "guardian_change"
      | "access_requested";
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
        const org = await ctx.db
          .query("organization")
          .filter((q) => q.eq(q.field("id"), orgId))
          .first();
        return {
          organizationId: orgId,
          organizationName: org?.name || "Unknown Organization",
        };
      })
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
          const org = await ctx.db
            .query("organization")
            .filter((q) => q.eq(q.field("id"), enrollment.organizationId))
            .first();

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
          const org = await ctx.db
            .query("organization")
            .filter((q) => q.eq(q.field("id"), goal.organizationId))
            .first();

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

    // TODO US-048: Notify parent that share was accepted
    // This will use the notification system once implemented
    console.log(
      `[Passport Sharing] Coach ${userId} accepted share for consent ${args.consentId}`
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

    // TODO US-048: Notify parent that share was declined
    // Include reason if provided
    console.log(
      `[Passport Sharing] Coach ${userId} declined share for consent ${args.consentId}`,
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
    const user = await ctx.db
      .query("user")
      .filter((q) => q.eq(q.field("id"), userId))
      .first();

    const coachName = user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
      : "Unknown Coach";

    // Get requesting org name for notification
    const org = await ctx.db
      .query("organization")
      .filter((q) => q.eq(q.field("id"), args.requestingOrgId))
      .first();

    const orgName = org?.name || args.requestingOrgId;

    // Create the request with 14-day expiry
    const now = Date.now();
    const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
    const expiresAt = now + fourteenDaysInMs;

    const requestId = await ctx.db.insert("passportShareRequests", {
      playerIdentityId: args.playerIdentityId,
      requestingCoachId: userId,
      requestingCoachName: coachName,
      requestingOrgId: args.requestingOrgId,
      requestingOrgName: orgName,
      reason: args.reason,
      status: "pending",
      requestedAt: now,
      expiresAt,
    });

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
    const user = await ctx.db
      .query("user")
      .filter((q) => q.eq(q.field("id"), userId))
      .first();

    const accessorName = user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
      : "Unknown User";

    // Get accessor's current role/org context
    // For now, we'll use the receiving org from consent
    // TODO: Get actual role from Better Auth member table
    const accessorRole = "Coach"; // Default - should be fetched from member table

    // Get receiving org name
    const receivingOrg = await ctx.db
      .query("organization")
      .filter((q) => q.eq(q.field("id"), consent.receivingOrgId))
      .first();

    const accessorOrgName = receivingOrg?.name || consent.receivingOrgId;

    // Create immutable audit log entry
    const logId = await ctx.db.insert("passportShareAccessLogs", {
      consentId: args.consentId,
      playerIdentityId: consent.playerIdentityId,
      accessedBy: userId,
      accessorName,
      accessorRole,
      accessorOrgId: consent.receivingOrgId,
      accessorOrgName,
      sourceOrgId: consent.receivingOrgId, // TODO: Track which source org was viewed
      accessType: args.accessType,
      accessedAt: Date.now(),
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });

    console.log(
      `[Passport Sharing] Access logged: ${userId} (${accessorRole} at ${accessorOrgName}) accessed ${args.accessType} for player ${consent.playerIdentityId}`,
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
export const processConsentExpiry = mutation({
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
