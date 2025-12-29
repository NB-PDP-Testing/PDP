/**
 * Age Group Eligibility Overrides
 *
 * Manages individual player exceptions for age group eligibility.
 * Allows admins to grant specific players permission to join teams
 * they wouldn't normally be eligible for.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";

/**
 * Get active overrides for a specific player
 *
 * Returns all active, non-expired overrides for the player in an organization.
 */
export const getPlayerOverrides = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("ageGroupEligibilityOverrides"),
      playerIdentityId: v.id("playerIdentities"),
      teamId: v.string(),
      organizationId: v.string(),
      reason: v.string(),
      grantedBy: v.string(),
      grantedAt: v.number(),
      expiresAt: v.optional(v.number()),
      isActive: v.boolean(),
      revokedBy: v.optional(v.string()),
      revokedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const now = Date.now();

    const overrides = await ctx.db
      .query("ageGroupEligibilityOverrides")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();

    // Filter out expired overrides
    return overrides.filter(
      (override) => !override.expiresAt || override.expiresAt > now
    );
  },
});

/**
 * Get all overrides for an organization
 *
 * Admin only. Returns all overrides (active, expired, revoked) for audit purposes.
 */
export const getOrganizationOverrides = query({
  args: {
    organizationId: v.string(),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("ageGroupEligibilityOverrides"),
      playerIdentityId: v.id("playerIdentities"),
      teamId: v.string(),
      organizationId: v.string(),
      reason: v.string(),
      grantedBy: v.string(),
      grantedAt: v.number(),
      expiresAt: v.optional(v.number()),
      isActive: v.boolean(),
      revokedBy: v.optional(v.string()),
      revokedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // TODO: Verify user is admin (will add in Phase 4 with auth context)

    let query = ctx.db
      .query("ageGroupEligibilityOverrides")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId));

    if (!args.includeInactive) {
      query = query.filter((q) => q.eq(q.field("isActive"), true));
    }

    const overrides = await query.collect();

    // Sort by grantedAt descending (most recent first)
    return overrides.sort((a, b) => b.grantedAt - a.grantedAt);
  },
});

/**
 * Get overrides for a specific team
 *
 * Returns all active overrides for players on this team.
 */
export const getTeamOverrides = query({
  args: {
    teamId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("ageGroupEligibilityOverrides"),
      playerIdentityId: v.id("playerIdentities"),
      teamId: v.string(),
      organizationId: v.string(),
      reason: v.string(),
      grantedBy: v.string(),
      grantedAt: v.number(),
      expiresAt: v.optional(v.number()),
      isActive: v.boolean(),
      revokedBy: v.optional(v.string()),
      revokedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const now = Date.now();

    const overrides = await ctx.db
      .query("ageGroupEligibilityOverrides")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter out expired overrides
    return overrides.filter(
      (override) => !override.expiresAt || override.expiresAt > now
    );
  },
});

/**
 * Grant eligibility override
 *
 * Admin only. Grants a specific player permission to join a team
 * they wouldn't normally be eligible for.
 */
export const grantEligibilityOverride = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    teamId: v.string(),
    organizationId: v.string(),
    reason: v.string(),
    expiresAt: v.optional(v.number()),
    grantedBy: v.string(), // User ID of admin granting override
  },
  returns: v.id("ageGroupEligibilityOverrides"),
  handler: async (ctx, args) => {
    // TODO: Verify user is admin (will add in Phase 4 with auth context)

    const now = Date.now();

    // Check if there's already an active override for this player-team combination
    const existing = await ctx.db
      .query("ageGroupEligibilityOverrides")
      .withIndex("by_player_and_team", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("teamId", args.teamId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existing) {
      // Update existing override (extend expiration or change reason)
      await ctx.db.patch(existing._id, {
        reason: args.reason,
        expiresAt: args.expiresAt,
        grantedBy: args.grantedBy,
        grantedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new override
    const overrideId = await ctx.db.insert("ageGroupEligibilityOverrides", {
      playerIdentityId: args.playerIdentityId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      reason: args.reason,
      grantedBy: args.grantedBy,
      grantedAt: now,
      expiresAt: args.expiresAt,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return overrideId;
  },
});

/**
 * Revoke eligibility override
 *
 * Admin only. Revokes an active override, removing the player's
 * special permission to join the team.
 */
export const revokeEligibilityOverride = mutation({
  args: {
    overrideId: v.id("ageGroupEligibilityOverrides"),
    revokedBy: v.string(), // User ID of admin revoking override
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // TODO: Verify user is admin (will add in Phase 4 with auth context)

    const now = Date.now();

    await ctx.db.patch(args.overrideId, {
      isActive: false,
      revokedBy: args.revokedBy,
      revokedAt: now,
      updatedAt: now,
    });

    return null;
  },
});

/**
 * Extend override expiration
 *
 * Admin only. Extends the expiration date of an existing override
 * or makes it permanent.
 */
export const extendOverrideExpiration = mutation({
  args: {
    overrideId: v.id("ageGroupEligibilityOverrides"),
    newExpiresAt: v.optional(v.number()), // null = permanent
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // TODO: Verify user is admin (will add in Phase 4 with auth context)

    await ctx.db.patch(args.overrideId, {
      expiresAt: args.newExpiresAt,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Bulk grant overrides
 *
 * Admin only. Grants overrides for multiple players to the same team.
 * Useful for bulk operations in admin UI.
 */
export const bulkGrantOverrides = mutation({
  args: {
    playerIdentityIds: v.array(v.id("playerIdentities")),
    teamId: v.string(),
    organizationId: v.string(),
    reason: v.string(),
    expiresAt: v.optional(v.number()),
    grantedBy: v.string(),
  },
  returns: v.object({
    granted: v.array(v.id("ageGroupEligibilityOverrides")),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    // TODO: Verify user is admin (will add in Phase 4 with auth context)

    const granted: Array<Id<"ageGroupEligibilityOverrides">> = [];
    const errors: string[] = [];

    for (const playerIdentityId of args.playerIdentityIds) {
      try {
        const overrideId = await ctx.runMutation(
          // Use internal reference to avoid circular dependency
          // Will be updated when we have proper internal function references
          null as any, // Placeholder
          {
            playerIdentityId,
            teamId: args.teamId,
            organizationId: args.organizationId,
            reason: args.reason,
            expiresAt: args.expiresAt,
            grantedBy: args.grantedBy,
          }
        );

        if (overrideId) {
          granted.push(overrideId);
        }
      } catch (error) {
        errors.push(
          `Failed to grant override for player ${playerIdentityId}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    return { granted, errors };
  },
});
