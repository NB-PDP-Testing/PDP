/**
 * Parent-Child Authorization — Phase 7: Child Player Passport Authorization
 *
 * Manages the consent and access system allowing parents to grant under-18
 * children controlled access to their player development data.
 *
 * GDPR/COPPA compliance:
 * - grantedAt + grantedBy timestamps serve as the consent record (GDPR Art. 8)
 * - All changes logged to parentChildAuthorizationLogs (GDPR Art. 5 accountability)
 * - Ireland: digital age of consent is 16. Parental consent mandatory under 16.
 * - COPPA: absolute minimum age 13.
 * - NO profiling: child accounts must have zero analytics tracking.
 */

import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { authComponent } from "../auth";

// ============================================================
// VALIDATORS
// ============================================================

const accessLevelValidator = v.union(
  v.literal("none"),
  v.literal("view_only"),
  v.literal("view_interact")
);

const granularTogglesValidator = v.object({
  includeCoachFeedback: v.boolean(),
  includeVoiceNotes: v.boolean(),
  includeDevelopmentGoals: v.boolean(),
  includeAssessments: v.boolean(),
  includeWellnessAccess: v.boolean(),
});

const authorizationValidator = v.object({
  _id: v.id("parentChildAuthorizations"),
  _creationTime: v.number(),
  parentUserId: v.string(),
  childPlayerId: v.id("orgPlayerEnrollments"),
  organizationId: v.string(),
  accessLevel: accessLevelValidator,
  grantedAt: v.number(),
  grantedBy: v.string(),
  revokedAt: v.optional(v.number()),
  revokedBy: v.optional(v.string()),
  includeCoachFeedback: v.boolean(),
  includeVoiceNotes: v.boolean(),
  includeDevelopmentGoals: v.boolean(),
  includeAssessments: v.boolean(),
  includeWellnessAccess: v.boolean(),
});

// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * Calculate age in years from a dateOfBirth string (ISO format: YYYY-MM-DD).
 */
function calculateAgeFromDob(dateOfBirth: string): number {
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

// ============================================================
// QUERIES
// ============================================================

/**
 * Get the authorization record for a specific child player.
 * Used on every player portal page load for child users.
 */
export const getChildAuthorization = query({
  args: {
    childPlayerId: v.id("orgPlayerEnrollments"),
  },
  returns: v.union(authorizationValidator, v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("parentChildAuthorizations")
      .withIndex("by_child", (q) => q.eq("childPlayerId", args.childPlayerId))
      .first(),
});

/**
 * Get all authorization records for a parent user in a specific org.
 * Used by the parent portal to show all children's access settings.
 */
export const getChildrenForParent = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(authorizationValidator),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }
    const userId = user._id as string;

    const allForParent = await ctx.db
      .query("parentChildAuthorizations")
      .withIndex("by_parent_and_child", (q) => q.eq("parentUserId", userId))
      .collect();

    return allForParent.filter((a) => a.organizationId === args.organizationId);
  },
});

/**
 * Internal: get authorization by child player ID (used in crons, actions).
 */
export const getChildAuthorizationInternal = internalQuery({
  args: {
    childPlayerId: v.id("orgPlayerEnrollments"),
  },
  returns: v.union(authorizationValidator, v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("parentChildAuthorizations")
      .withIndex("by_child", (q) => q.eq("childPlayerId", args.childPlayerId))
      .first(),
});

/**
 * Get coach-parent summaries for a child that are visible to the child.
 * Filters out:
 * - Records where restrictChildView is true
 * - Records with privateInsight only (publicSummary is always present on this table)
 * - Records not in approved/delivered/viewed status
 * Returns only publicSummary content.
 */
export const getRestrictedNotes = query({
  args: {
    childPlayerId: v.id("orgPlayerEnrollments"),
  },
  returns: v.array(
    v.object({
      _id: v.id("coachParentSummaries"),
      _creationTime: v.number(),
      publicSummary: v.object({
        content: v.string(),
        confidenceScore: v.number(),
        generatedAt: v.number(),
      }),
      status: v.union(
        v.literal("approved"),
        v.literal("delivered"),
        v.literal("viewed")
      ),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Resolve the playerIdentityId from the enrollment
    const enrollment = await ctx.db.get(args.childPlayerId);
    if (!enrollment) {
      return [];
    }

    const summaries = await ctx.db
      .query("coachParentSummaries")
      .withIndex("by_player_status_created", (q) =>
        q.eq("playerIdentityId", enrollment.playerIdentityId)
      )
      .collect();

    return summaries
      .filter(
        (s) =>
          (s.status === "approved" ||
            s.status === "delivered" ||
            s.status === "viewed") &&
          s.restrictChildView !== true
      )
      .map((s) => ({
        _id: s._id,
        _creationTime: s._creationTime,
        publicSummary: s.publicSummary,
        status: s.status as "approved" | "delivered" | "viewed",
        createdAt: s.createdAt,
      }));
  },
});

/**
 * Get the authorization record for the currently logged-in child player.
 * Looks up the enrollment via playerIdentityId + organizationId, then returns the authorization.
 * Used by the player portal to gate access for youth accounts.
 */
export const getChildAuthorizationByPlayerIdentity = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.union(authorizationValidator, v.null()),
  handler: async (ctx, args) => {
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();
    if (!enrollment) {
      return null;
    }
    return await ctx.db
      .query("parentChildAuthorizations")
      .withIndex("by_child", (q) => q.eq("childPlayerId", enrollment._id))
      .first();
  },
});

/**
 * Validate a child account setup token.
 * Used by the /child-account-setup page to validate the URL token.
 */
export const getChildAccountSetupStatus = query({
  args: {
    token: v.string(),
  },
  returns: v.object({
    valid: v.boolean(),
    expired: v.boolean(),
    used: v.boolean(),
    playerName: v.optional(v.string()),
    organizationName: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    playerIdentityId: v.optional(v.id("playerIdentities")),
    email: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const claimToken = await ctx.db
      .query("playerClaimTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!claimToken || claimToken.tokenType !== "child_account_setup") {
      return { valid: false, expired: false, used: false };
    }

    if (claimToken.usedAt) {
      return { valid: false, expired: false, used: true };
    }

    const now = Date.now();
    if (claimToken.expiresAt < now) {
      return { valid: false, expired: true, used: false };
    }

    const player = await ctx.db.get(claimToken.playerIdentityId);
    if (!player) {
      return { valid: false, expired: false, used: false };
    }

    // Get organization name from enrollment
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", claimToken.playerIdentityId)
      )
      .first();

    let organizationName = "Unknown Organization";
    if (enrollment) {
      const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "organization",
        where: [
          { field: "_id", value: enrollment.organizationId, operator: "eq" },
        ],
      });
      organizationName =
        (org as { name?: string } | null)?.name ?? "Unknown Organization";
    }

    return {
      valid: true,
      expired: false,
      used: false,
      playerName: `${player.firstName} ${player.lastName}`,
      organizationName,
      organizationId: enrollment?.organizationId,
      playerIdentityId: claimToken.playerIdentityId,
      email: claimToken.email,
    };
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Grant or update child platform access.
 * - Creates a new parentChildAuthorizations record if none exists.
 * - Updates the existing record if one exists (unified access level).
 * - Logs the change to parentChildAuthorizationLogs (WRITE-ONCE audit).
 * - Throws if child age < 13 (COPPA minimum).
 * - On first grant with childEmail: creates a 7-day setup token and schedules invite email.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Grant flow handles new vs update, invite token creation, email scheduling, and audit logging
export const grantChildAccess = mutation({
  args: {
    childPlayerId: v.id("orgPlayerEnrollments"),
    organizationId: v.string(),
    accessLevel: accessLevelValidator,
    toggles: granularTogglesValidator,
    // Child's email — required on first grant to create invite token and send email
    childEmail: v.optional(v.string()),
  },
  returns: v.object({
    authId: v.id("parentChildAuthorizations"),
    isNewGrant: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }
    const userId = user._id as string;
    const now = Date.now();

    // Resolve enrollment → playerIdentity to check age
    const enrollment = await ctx.db.get(args.childPlayerId);
    if (!enrollment) {
      throw new Error("Player enrollment not found");
    }
    const playerIdentity = await ctx.db.get(enrollment.playerIdentityId);
    if (!playerIdentity) {
      throw new Error("Player identity not found");
    }
    if (playerIdentity.dateOfBirth) {
      const age = calculateAgeFromDob(playerIdentity.dateOfBirth);
      if (age < 13) {
        throw new Error(
          "Child must be at least 13 years old to have a platform account."
        );
      }
    }

    const existing = await ctx.db
      .query("parentChildAuthorizations")
      .withIndex("by_child", (q) => q.eq("childPlayerId", args.childPlayerId))
      .first();

    if (existing) {
      // Update existing record
      const fromAccessLevel = existing.accessLevel;
      await ctx.db.patch(existing._id, {
        accessLevel: args.accessLevel,
        includeCoachFeedback: args.toggles.includeCoachFeedback,
        includeVoiceNotes: args.toggles.includeVoiceNotes,
        includeDevelopmentGoals: args.toggles.includeDevelopmentGoals,
        includeAssessments: args.toggles.includeAssessments,
        includeWellnessAccess: args.toggles.includeWellnessAccess,
        // Clear any previous revocation if re-granting
        revokedAt: undefined,
        revokedBy: undefined,
      });
      // Write audit log
      await ctx.db.insert("parentChildAuthorizationLogs", {
        authorizationId: existing._id,
        childPlayerId: args.childPlayerId,
        changedAt: now,
        changedBy: userId,
        action: "updated",
        fromAccessLevel,
        toAccessLevel: args.accessLevel,
      });
      return { authId: existing._id, isNewGrant: false };
    }

    // Create new record
    const authId = await ctx.db.insert("parentChildAuthorizations", {
      parentUserId: userId,
      childPlayerId: args.childPlayerId,
      organizationId: args.organizationId,
      accessLevel: args.accessLevel,
      grantedAt: now,
      grantedBy: userId,
      includeCoachFeedback: args.toggles.includeCoachFeedback,
      includeVoiceNotes: args.toggles.includeVoiceNotes,
      includeDevelopmentGoals: args.toggles.includeDevelopmentGoals,
      includeAssessments: args.toggles.includeAssessments,
      includeWellnessAccess: args.toggles.includeWellnessAccess,
    });
    // Write audit log
    await ctx.db.insert("parentChildAuthorizationLogs", {
      authorizationId: authId,
      childPlayerId: args.childPlayerId,
      changedAt: now,
      changedBy: userId,
      action: "granted",
      toAccessLevel: args.accessLevel,
    });

    // On new grant with child email: create setup token and schedule invite email
    if (args.childEmail) {
      const normalizedEmail = args.childEmail.toLowerCase().trim();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      // Invalidate any existing unused child_account_setup tokens for this player
      const existingTokens = await ctx.db
        .query("playerClaimTokens")
        .withIndex("by_player", (q) =>
          q.eq("playerIdentityId", enrollment.playerIdentityId)
        )
        .collect();
      for (const t of existingTokens) {
        if (!t.usedAt && t.tokenType === "child_account_setup") {
          await ctx.db.patch(t._id, { usedAt: now });
        }
      }

      const setupToken = crypto.randomUUID();
      await ctx.db.insert("playerClaimTokens", {
        playerIdentityId: enrollment.playerIdentityId,
        token: setupToken,
        email: normalizedEmail,
        tokenType: "child_account_setup",
        createdAt: now,
        expiresAt: now + sevenDaysMs,
      });

      // Fetch org and parent names for the email
      const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "organization",
        where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
      });
      const organizationName =
        (org as { name?: string } | null)?.name ?? "Your Club";

      const parentUser = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "user",
          where: [{ field: "_id", value: userId, operator: "eq" }],
        }
      );
      const parentName =
        (parentUser as { name?: string } | null)?.name ?? "Your parent";

      await ctx.scheduler.runAfter(
        0,
        internal.actions.childAuthorizations.sendChildAccountInviteEmailAction,
        {
          email: normalizedEmail,
          playerFirstName: playerIdentity.firstName,
          parentName,
          organizationName,
          setupToken,
        }
      );
    }

    return { authId, isNewGrant: true };
  },
});

/**
 * Revoke child platform access.
 * Sets accessLevel to 'none', records revokedAt/revokedBy.
 * Writes a 'revoked' log entry.
 */
export const revokeChildAccess = mutation({
  args: {
    childPlayerId: v.id("orgPlayerEnrollments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }
    const userId = user._id as string;
    const now = Date.now();

    const existing = await ctx.db
      .query("parentChildAuthorizations")
      .withIndex("by_child", (q) => q.eq("childPlayerId", args.childPlayerId))
      .first();

    if (!existing) {
      throw new Error("No authorization record found for this child");
    }

    const fromAccessLevel = existing.accessLevel;
    await ctx.db.patch(existing._id, {
      accessLevel: "none",
      revokedAt: now,
      revokedBy: userId,
    });

    await ctx.db.insert("parentChildAuthorizationLogs", {
      authorizationId: existing._id,
      childPlayerId: args.childPlayerId,
      changedAt: now,
      changedBy: userId,
      action: "revoked",
      fromAccessLevel,
      toAccessLevel: "none",
    });

    return null;
  },
});

/**
 * Update individual granular content toggles without changing the access level.
 * Writes a 'toggle_changed' log entry listing each changed field.
 */
export const updateChildAccessToggles = mutation({
  args: {
    childPlayerId: v.id("orgPlayerEnrollments"),
    includeCoachFeedback: v.optional(v.boolean()),
    includeVoiceNotes: v.optional(v.boolean()),
    includeDevelopmentGoals: v.optional(v.boolean()),
    includeAssessments: v.optional(v.boolean()),
    includeWellnessAccess: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }
    const userId = user._id as string;
    const now = Date.now();

    const existing = await ctx.db
      .query("parentChildAuthorizations")
      .withIndex("by_child", (q) => q.eq("childPlayerId", args.childPlayerId))
      .first();

    if (!existing) {
      throw new Error("No authorization record found for this child");
    }

    // Compute changed toggles for audit log
    const toggleFields = [
      "includeCoachFeedback",
      "includeVoiceNotes",
      "includeDevelopmentGoals",
      "includeAssessments",
      "includeWellnessAccess",
    ] as const;

    const togglesChanged: Array<{ field: string; from: boolean; to: boolean }> =
      [];
    const patch: Record<string, boolean> = {};

    for (const field of toggleFields) {
      const newVal = args[field];
      if (newVal !== undefined && newVal !== existing[field]) {
        togglesChanged.push({ field, from: existing[field], to: newVal });
        patch[field] = newVal;
      }
    }

    if (togglesChanged.length > 0) {
      await ctx.db.patch(existing._id, patch);
      await ctx.db.insert("parentChildAuthorizationLogs", {
        authorizationId: existing._id,
        childPlayerId: args.childPlayerId,
        changedAt: now,
        changedBy: userId,
        action: "toggle_changed",
        togglesChanged,
      });
    }

    return null;
  },
});

/**
 * Set the restrictChildView flag on a coachParentSummary record.
 * Used by coaches to mark notes as parent-only.
 */
export const setNoteChildRestriction = mutation({
  args: {
    noteId: v.id("coachParentSummaries"),
    restrictChildView: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }
    await ctx.db.patch(args.noteId, {
      restrictChildView: args.restrictChildView,
    });
    return null;
  },
});

/**
 * Resend the child account setup invite email.
 * Invalidates the previous setup token and creates a new 7-day token.
 * Called from the parent portal "Re-send invite" button.
 */
export const resendChildAccountInvite = mutation({
  args: {
    childPlayerId: v.id("orgPlayerEnrollments"),
    childEmail: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }
    const userId = user._id as string;
    const now = Date.now();

    // Verify caller has an authorization record for this child
    const auth = await ctx.db
      .query("parentChildAuthorizations")
      .withIndex("by_child", (q) => q.eq("childPlayerId", args.childPlayerId))
      .first();
    if (!auth) {
      throw new Error("No authorization found for this child");
    }

    const enrollment = await ctx.db.get(args.childPlayerId);
    if (!enrollment) {
      throw new Error("Player enrollment not found");
    }
    const playerIdentity = await ctx.db.get(enrollment.playerIdentityId);
    if (!playerIdentity) {
      throw new Error("Player identity not found");
    }

    const normalizedEmail = args.childEmail.toLowerCase().trim();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // Invalidate previous unused child_account_setup tokens
    const existingTokens = await ctx.db
      .query("playerClaimTokens")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", enrollment.playerIdentityId)
      )
      .collect();
    for (const t of existingTokens) {
      if (!t.usedAt && t.tokenType === "child_account_setup") {
        await ctx.db.patch(t._id, { usedAt: now });
      }
    }

    const setupToken = crypto.randomUUID();
    await ctx.db.insert("playerClaimTokens", {
      playerIdentityId: enrollment.playerIdentityId,
      token: setupToken,
      email: normalizedEmail,
      tokenType: "child_account_setup",
      createdAt: now,
      expiresAt: now + sevenDaysMs,
    });

    const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: auth.organizationId, operator: "eq" }],
    });
    const organizationName =
      (org as { name?: string } | null)?.name ?? "Your Club";

    const parentUser = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [{ field: "_id", value: userId, operator: "eq" }],
      }
    );
    const parentName =
      (parentUser as { name?: string } | null)?.name ?? "Your parent";

    await ctx.scheduler.runAfter(
      0,
      internal.actions.childAuthorizations.sendChildAccountInviteEmailAction,
      {
        email: normalizedEmail,
        playerFirstName: playerIdentity.firstName,
        parentName,
        organizationName,
        setupToken,
      }
    );

    return { success: true };
  },
});

/**
 * Claim a child account using a valid child_account_setup token.
 * Sets userId on the playerIdentity, marks the token as used.
 * Called after the child signs up/signs in on the /child-account-setup page.
 */
export const claimChildAccount = mutation({
  args: {
    token: v.string(),
    userId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    playerIdentityId: v.optional(v.id("playerIdentities")),
    organizationId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Not authenticated" };
    }

    // Find and validate the token
    const claimToken = await ctx.db
      .query("playerClaimTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!claimToken || claimToken.tokenType !== "child_account_setup") {
      return { success: false, error: "Invalid token" };
    }
    if (claimToken.usedAt) {
      return { success: false, error: "Token already used" };
    }
    const now = Date.now();
    if (claimToken.expiresAt < now) {
      return { success: false, error: "Token expired" };
    }

    // Get the enrollment to find organizationId
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", claimToken.playerIdentityId)
      )
      .first();

    // Link the player identity to the user account
    await ctx.db.patch(claimToken.playerIdentityId, {
      userId: args.userId,
      email: claimToken.email,
      updatedAt: now,
    });

    // Mark the token as used
    await ctx.db.patch(claimToken._id, { usedAt: now });

    return {
      success: true,
      playerIdentityId: claimToken.playerIdentityId,
      organizationId: enrollment?.organizationId,
    };
  },
});

/**
 * Internal mutation: grant child access (used by actions/crons that cannot
 * authenticate as a user).
 */
export const grantChildAccessInternal = internalMutation({
  args: {
    parentUserId: v.string(),
    childPlayerId: v.id("orgPlayerEnrollments"),
    organizationId: v.string(),
    accessLevel: accessLevelValidator,
    toggles: granularTogglesValidator,
  },
  returns: v.id("parentChildAuthorizations"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("parentChildAuthorizations")
      .withIndex("by_child", (q) => q.eq("childPlayerId", args.childPlayerId))
      .first();

    if (existing) {
      const fromAccessLevel = existing.accessLevel;
      await ctx.db.patch(existing._id, {
        accessLevel: args.accessLevel,
        includeCoachFeedback: args.toggles.includeCoachFeedback,
        includeVoiceNotes: args.toggles.includeVoiceNotes,
        includeDevelopmentGoals: args.toggles.includeDevelopmentGoals,
        includeAssessments: args.toggles.includeAssessments,
        includeWellnessAccess: args.toggles.includeWellnessAccess,
        revokedAt: undefined,
        revokedBy: undefined,
      });
      await ctx.db.insert("parentChildAuthorizationLogs", {
        authorizationId: existing._id,
        childPlayerId: args.childPlayerId,
        changedAt: now,
        changedBy: args.parentUserId,
        action: "updated",
        fromAccessLevel,
        toAccessLevel: args.accessLevel,
      });
      return existing._id;
    }

    const authId = await ctx.db.insert("parentChildAuthorizations", {
      parentUserId: args.parentUserId,
      childPlayerId: args.childPlayerId,
      organizationId: args.organizationId,
      accessLevel: args.accessLevel,
      grantedAt: now,
      grantedBy: args.parentUserId,
      includeCoachFeedback: args.toggles.includeCoachFeedback,
      includeVoiceNotes: args.toggles.includeVoiceNotes,
      includeDevelopmentGoals: args.toggles.includeDevelopmentGoals,
      includeAssessments: args.toggles.includeAssessments,
      includeWellnessAccess: args.toggles.includeWellnessAccess,
    });
    await ctx.db.insert("parentChildAuthorizationLogs", {
      authorizationId: authId,
      childPlayerId: args.childPlayerId,
      changedAt: now,
      changedBy: args.parentUserId,
      action: "granted",
      toAccessLevel: args.accessLevel,
    });
    return authId;
  },
});
