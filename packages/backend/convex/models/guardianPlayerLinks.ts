import { v } from "convex/values";
import { components } from "../_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

// ============================================================
// CONSTANTS
// ============================================================

// Regex for splitting names by whitespace
const NAME_SPLIT_REGEX = /\s+/;

// ============================================================
// TYPE DEFINITIONS
// ============================================================

const relationshipValidator = v.union(
  v.literal("mother"),
  v.literal("father"),
  v.literal("guardian"),
  v.literal("grandparent"),
  v.literal("other")
);

// Guardian-player link validator for return types
const guardianPlayerLinkValidator = v.object({
  _id: v.id("guardianPlayerLinks"),
  _creationTime: v.number(),
  guardianIdentityId: v.id("guardianIdentities"),
  playerIdentityId: v.id("playerIdentities"),
  relationship: relationshipValidator,
  isPrimary: v.boolean(),
  hasParentalResponsibility: v.boolean(),
  canCollectFromTraining: v.boolean(),
  consentedToSharing: v.boolean(),
  declinedByUserId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  verifiedAt: v.optional(v.number()),
  verifiedBy: v.optional(v.string()),
});

// Guardian identity validator (for joined queries)
const _guardianIdentityValidator = v.object({
  _id: v.id("guardianIdentities"),
  _creationTime: v.number(),
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  town: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),
  userId: v.optional(v.string()),
  verificationStatus: v.union(
    v.literal("unverified"),
    v.literal("email_verified"),
    v.literal("id_verified")
  ),
  preferredContactMethod: v.optional(
    v.union(v.literal("email"), v.literal("phone"), v.literal("both"))
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdFrom: v.optional(v.string()),
});

// Player identity validator (for joined queries)
const _playerIdentityValidator = v.object({
  _id: v.id("playerIdentities"),
  _creationTime: v.number(),
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.string(),
  gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
  playerType: v.union(v.literal("youth"), v.literal("adult")),
  userId: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  town: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),
  verificationStatus: v.union(
    v.literal("unverified"),
    v.literal("guardian_verified"),
    v.literal("self_verified"),
    v.literal("document_verified")
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdFrom: v.optional(v.string()),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get all players for a guardian (with player details)
 * ONLY returns children the parent has explicitly ACCEPTED (acknowledged)
 * Pending children (not yet acknowledged) appear in the claim dialog instead
 */
export const getPlayersForGuardian = query({
  args: { guardianIdentityId: v.id("guardianIdentities") },
  // Using v.any() for joined query results - schema validation happens at document level
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", args.guardianIdentityId)
      )
      .collect();

    const results = [];

    for (const link of links) {
      // Only show children the parent has explicitly accepted
      // Filter out:
      // 1. Declined links (declinedByUserId is set)
      // 2. Pending links (acknowledgedByParentAt is not set)
      if (link.declinedByUserId || !link.acknowledgedByParentAt) {
        continue;
      }

      const player = await ctx.db.get(link.playerIdentityId);
      if (player) {
        results.push({ link, player });
      }
    }

    return results;
  },
});

/**
 * Get all guardians for a player (with guardian details)
 */
export const getGuardiansForPlayer = query({
  args: { playerIdentityId: v.id("playerIdentities") },
  // Using v.any() for joined query results - schema validation happens at document level
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    const results = [];

    for (const link of links) {
      const guardian = await ctx.db.get(link.guardianIdentityId);
      if (guardian) {
        results.push({ link, guardian });
      }
    }

    return results;
  },
});

/**
 * Get the primary guardian for a player
 */
export const getPrimaryGuardianForPlayer = query({
  args: { playerIdentityId: v.id("playerIdentities") },
  // Using v.any() for joined query results - schema validation happens at document level
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    const primaryLink = links.find((l) => l.isPrimary);
    if (!primaryLink) {
      // Return first link if no primary set
      const firstLink = links[0];
      if (!firstLink) {
        return null;
      }
      const guardian = await ctx.db.get(firstLink.guardianIdentityId);
      if (!guardian) {
        return null;
      }
      return { link: firstLink, guardian };
    }

    const guardian = await ctx.db.get(primaryLink.guardianIdentityId);
    if (!guardian) {
      return null;
    }
    return { link: primaryLink, guardian };
  },
});

/**
 * Check if a guardian-player link exists
 */
export const hasGuardianPlayerLink = query({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian_and_player", (q) =>
        q
          .eq("guardianIdentityId", args.guardianIdentityId)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();
    return link !== null;
  },
});

/**
 * Get a specific guardian-player link
 */
export const getGuardianPlayerLink = query({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.union(guardianPlayerLinkValidator, v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian_and_player", (q) =>
        q
          .eq("guardianIdentityId", args.guardianIdentityId)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first(),
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Create a guardian-player link
 */
export const createGuardianPlayerLink = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    playerIdentityId: v.id("playerIdentities"),
    relationship: relationshipValidator,
    isPrimary: v.optional(v.boolean()),
    hasParentalResponsibility: v.optional(v.boolean()),
    canCollectFromTraining: v.optional(v.boolean()),
    consentedToSharing: v.optional(v.boolean()),
  },
  returns: v.id("guardianPlayerLinks"),
  handler: async (ctx, args) => {
    // Verify guardian exists
    const guardian = await ctx.db.get(args.guardianIdentityId);
    if (!guardian) {
      throw new Error("Guardian identity not found");
    }

    // Verify player exists
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      throw new Error("Player identity not found");
    }

    // Check if link already exists
    const existing = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian_and_player", (q) =>
        q
          .eq("guardianIdentityId", args.guardianIdentityId)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (existing) {
      throw new Error("Guardian-player link already exists");
    }

    // Check if this should be primary (first guardian for this player)
    let isPrimary = args.isPrimary ?? false;
    if (!isPrimary) {
      const existingLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) =>
          q.eq("playerIdentityId", args.playerIdentityId)
        )
        .collect();
      isPrimary = existingLinks.length === 0; // First guardian is primary by default
    }

    // If setting as primary, unset other primaries
    if (isPrimary) {
      const existingLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) =>
          q.eq("playerIdentityId", args.playerIdentityId)
        )
        .collect();

      for (const link of existingLinks) {
        if (link.isPrimary) {
          await ctx.db.patch(link._id, { isPrimary: false });
        }
      }
    }

    const now = Date.now();

    return await ctx.db.insert("guardianPlayerLinks", {
      guardianIdentityId: args.guardianIdentityId,
      playerIdentityId: args.playerIdentityId,
      relationship: args.relationship,
      isPrimary,
      hasParentalResponsibility: args.hasParentalResponsibility ?? true,
      canCollectFromTraining: args.canCollectFromTraining ?? true,
      consentedToSharing: args.consentedToSharing ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a guardian-player link
 */
export const updateGuardianPlayerLink = mutation({
  args: {
    linkId: v.id("guardianPlayerLinks"),
    relationship: v.optional(relationshipValidator),
    hasParentalResponsibility: v.optional(v.boolean()),
    canCollectFromTraining: v.optional(v.boolean()),
    consentedToSharing: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.linkId);
    if (!existing) {
      throw new Error("Guardian-player link not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.relationship !== undefined) {
      updates.relationship = args.relationship;
    }
    if (args.hasParentalResponsibility !== undefined) {
      updates.hasParentalResponsibility = args.hasParentalResponsibility;
    }
    if (args.canCollectFromTraining !== undefined) {
      updates.canCollectFromTraining = args.canCollectFromTraining;
    }
    if (args.consentedToSharing !== undefined) {
      updates.consentedToSharing = args.consentedToSharing;
    }

    await ctx.db.patch(args.linkId, updates);
    return null;
  },
});

/**
 * Set a guardian as primary for a player
 */
export const setPrimaryGuardian = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get all links for this player
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    let foundTarget = false;

    for (const link of links) {
      if (link.guardianIdentityId === args.guardianIdentityId) {
        // Set this one as primary
        await ctx.db.patch(link._id, {
          isPrimary: true,
          updatedAt: Date.now(),
        });
        foundTarget = true;
      } else if (link.isPrimary) {
        // Unset previous primary
        await ctx.db.patch(link._id, {
          isPrimary: false,
          updatedAt: Date.now(),
        });
      }
    }

    if (!foundTarget) {
      throw new Error("Guardian-player link not found");
    }

    return null;
  },
});

/**
 * Update sharing consent for a link
 */
export const updateLinkConsent = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    playerIdentityId: v.id("playerIdentities"),
    consentedToSharing: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian_and_player", (q) =>
        q
          .eq("guardianIdentityId", args.guardianIdentityId)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!link) {
      throw new Error("Guardian-player link not found");
    }

    await ctx.db.patch(link._id, {
      consentedToSharing: args.consentedToSharing,
      acknowledgedByParentAt: Date.now(), // Track when parent acknowledged this link
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Decline a guardian-player link (user clicked "This Isn't Me")
 */
export const declineGuardianPlayerLink = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    playerIdentityId: v.id("playerIdentities"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian_and_player", (q) =>
        q
          .eq("guardianIdentityId", args.guardianIdentityId)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!link) {
      throw new Error("Guardian-player link not found");
    }

    await ctx.db.patch(link._id, {
      declinedByUserId: args.userId,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Reset a declined guardian-player link (clear declined status)
 */
export const resetDeclinedLink = mutation({
  args: {
    linkId: v.id("guardianPlayerLinks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Guardian-player link not found");
    }

    await ctx.db.patch(args.linkId, {
      declinedByUserId: undefined,
      acknowledgedByParentAt: undefined, // Clear acknowledgment - parent must re-acknowledge
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Verify a guardian-player link
 */
export const verifyLink = mutation({
  args: {
    linkId: v.id("guardianPlayerLinks"),
    verifiedBy: v.string(), // "guardian" | "admin" | "system"
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.linkId);
    if (!existing) {
      throw new Error("Guardian-player link not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.linkId, {
      verifiedAt: now,
      verifiedBy: args.verifiedBy,
      updatedAt: now,
    });

    return null;
  },
});

/**
 * Delete a guardian-player link
 * If this is the last link for the guardian, resets userId to force re-acknowledgment
 */
export const deleteGuardianPlayerLink = mutation({
  args: { linkId: v.id("guardianPlayerLinks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.linkId);
    if (!existing) {
      throw new Error("Guardian-player link not found");
    }

    const guardianIdentityId = existing.guardianIdentityId;

    // Delete the link
    await ctx.db.delete(args.linkId);

    // If this was primary, set another guardian as primary for this player
    if (existing.isPrimary) {
      const remainingLinksForPlayer = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) =>
          q.eq("playerIdentityId", existing.playerIdentityId)
        )
        .first();

      if (remainingLinksForPlayer) {
        await ctx.db.patch(remainingLinksForPlayer._id, {
          isPrimary: true,
          updatedAt: Date.now(),
        });
      }
    }

    // Check if this was the last link for this guardian (across all players)
    const remainingLinksForGuardian = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", guardianIdentityId)
      )
      .first();

    // If no remaining links, reset the guardian identity
    // This ensures parent must re-acknowledge if re-linked later
    if (!remainingLinksForGuardian) {
      await ctx.db.patch(guardianIdentityId, {
        userId: undefined,
        verificationStatus: "unverified",
        updatedAt: Date.now(),
      });
      console.log(
        `[deleteGuardianPlayerLink] Reset guardian identity ${guardianIdentityId} - last link deleted, parent must re-claim if re-linked`
      );
    }

    return null;
  },
});

// ============================================================
// ADMIN LINKING FUNCTIONS
// These replace the legacy players.linkPlayersToParent functions
// ============================================================

/**
 * Link multiple players to a parent/guardian by email
 * Creates guardian identity if needed, then creates links
 *
 * Replaces: api.models.players.linkPlayersToParent
 */
export const linkPlayersToGuardian = mutation({
  args: {
    playerIdentityIds: v.array(v.id("playerIdentities")),
    guardianEmail: v.string(),
    organizationId: v.string(),
    relationship: v.optional(relationshipValidator),
    // Optional: Current user info for self-assignment detection
    currentUserId: v.optional(v.string()),
    currentUserEmail: v.optional(v.string()),
  },
  returns: v.object({
    linked: v.number(),
    guardianIdentityId: v.id("guardianIdentities"),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const normalizedEmail = args.guardianEmail.toLowerCase().trim();
    const normalizedCurrentUserEmail = args.currentUserEmail
      ?.toLowerCase()
      .trim();
    const errors: string[] = [];
    let linked = 0;

    // Find or create guardian identity
    let guardian = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!guardian) {
      // Create guardian identity
      const guardianId = await ctx.db.insert("guardianIdentities", {
        firstName: "",
        lastName: "",
        email: normalizedEmail,
        verificationStatus: "unverified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdFrom: "admin_link",
      });
      guardian = await ctx.db.get(guardianId);
    }

    if (!guardian) {
      throw new Error("Failed to create guardian identity");
    }

    // Auto-create org membership if user exists (Fix for parent access denied issue)
    try {
      // Check if user exists with this email
      const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [
          {
            field: "email",
            value: normalizedEmail,
            operator: "eq",
          },
        ],
      });

      if (user) {
        const userId = (user as any)._id;

        // Check if already a member of this organization
        const existingMember = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "member",
            where: [
              { field: "userId", value: userId, operator: "eq" },
              {
                field: "organizationId",
                value: args.organizationId,
                operator: "eq",
              },
            ],
          }
        );

        if (!existingMember) {
          // Create org membership with "parent" functional role
          await ctx.runMutation(components.betterAuth.adapter.create, {
            input: {
              model: "member",
              data: {
                userId,
                organizationId: args.organizationId,
                role: "member", // Better Auth base role
                functionalRoles: ["parent"], // Our functional role
                activeFunctionalRole: "parent",
                createdAt: Date.now(),
              },
            },
          });
          console.log(
            `[linkPlayersToGuardian] Auto-created org membership for parent: ${normalizedEmail}`
          );
        }

        // Check if this is a self-assignment (admin assigning to their own email)
        const isSelfAssignment =
          args.currentUserId &&
          normalizedCurrentUserEmail &&
          normalizedEmail === normalizedCurrentUserEmail;

        // Only auto-link guardian identity if it's a self-assignment
        // Otherwise, parent must explicitly accept via batched modal
        if (!guardian.userId && isSelfAssignment) {
          await ctx.db.patch(guardian._id, {
            userId,
            verificationStatus: "email_verified",
            updatedAt: Date.now(),
          });
          console.log(
            `[linkPlayersToGuardian] Auto-linked guardian identity (self-assignment): ${normalizedEmail}`
          );
        } else if (!guardian.userId) {
          console.log(
            `[linkPlayersToGuardian] Guardian identity created but not linked - parent must accept: ${normalizedEmail}`
          );
        }
      } else {
        console.log(
          `[linkPlayersToGuardian] No user account found for email: ${normalizedEmail}. Guardian identity created but not linked.`
        );
      }
    } catch (error) {
      console.error(
        "[linkPlayersToGuardian] Failed to auto-create membership or link guardian:",
        error
      );
      // Don't throw - allow guardian creation to succeed even if auto-membership fails
    }

    // Link each player
    for (const playerIdentityId of args.playerIdentityIds) {
      // Verify player exists
      const player = await ctx.db.get(playerIdentityId);
      if (!player) {
        errors.push(`Player ${playerIdentityId} not found`);
        continue;
      }

      // Verify player is enrolled in this org
      const enrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_player_and_org", (q) =>
          q
            .eq("playerIdentityId", playerIdentityId)
            .eq("organizationId", args.organizationId)
        )
        .first();

      if (!enrollment) {
        errors.push(
          `Player ${player.firstName} ${player.lastName} not enrolled in this organization`
        );
        continue;
      }

      // Check if link already exists
      const existing = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian_and_player", (q) =>
          q
            .eq("guardianIdentityId", guardian?._id)
            .eq("playerIdentityId", playerIdentityId)
        )
        .first();

      if (existing) {
        // Already linked, skip
        continue;
      }

      // Check if this is the first guardian for this player
      const existingLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) =>
          q.eq("playerIdentityId", playerIdentityId)
        )
        .collect();

      const isPrimary = existingLinks.length === 0;

      // Create link
      await ctx.db.insert("guardianPlayerLinks", {
        guardianIdentityId: guardian._id,
        playerIdentityId,
        relationship: args.relationship ?? "guardian",
        isPrimary,
        hasParentalResponsibility: true,
        canCollectFromTraining: true,
        consentedToSharing: true,
        // Bug #293 fix: Set defaults for new notification fields
        profileCompletionRequired: true, // Parent needs to complete profile
        requiredProfileFields: ["emergencyContact", "medicalInfo"], // Required fields
        // acknowledgedByParentAt: undefined (not set - parent hasn't seen this yet)
        // notificationSentAt: undefined (will be set when notification is sent)
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      linked += 1;
    }

    return {
      linked,
      guardianIdentityId: guardian._id,
      errors,
    };
  },
});

/**
 * Unlink players from a guardian
 *
 * Replaces: api.models.players.unlinkPlayersFromParent
 */
export const unlinkPlayersFromGuardian = mutation({
  args: {
    playerIdentityIds: v.array(v.id("playerIdentities")),
    guardianEmail: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
    unlinked: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const normalizedEmail = args.guardianEmail.toLowerCase().trim();
    const errors: string[] = [];
    let unlinked = 0;

    // Find guardian identity
    const guardian = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!guardian) {
      return { unlinked: 0, errors: ["Guardian not found"] };
    }

    // Unlink each player
    for (const playerIdentityId of args.playerIdentityIds) {
      const link = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian_and_player", (q) =>
          q
            .eq("guardianIdentityId", guardian._id)
            .eq("playerIdentityId", playerIdentityId)
        )
        .first();

      if (!link) {
        continue; // Not linked, skip
      }

      await ctx.db.delete(link._id);

      // If this was primary, set another guardian as primary
      if (link.isPrimary) {
        const remainingLink = await ctx.db
          .query("guardianPlayerLinks")
          .withIndex("by_player", (q) =>
            q.eq("playerIdentityId", playerIdentityId)
          )
          .first();

        if (remainingLink) {
          await ctx.db.patch(remainingLink._id, {
            isPrimary: true,
            updatedAt: Date.now(),
          });
        }
      }

      unlinked += 1;
    }

    return { unlinked, errors };
  },
});

/**
 * Get linked children for a guardian in a specific organization
 * Used by parent dashboard and admin pages
 */
export const getLinkedChildrenInOrg = query({
  args: {
    guardianEmail: v.string(),
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const normalizedEmail = args.guardianEmail.toLowerCase().trim();

    // Find guardian identity
    const guardian = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!guardian) {
      return [];
    }

    // Get all links for this guardian
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian", (q) => q.eq("guardianIdentityId", guardian._id))
      .collect();

    const results = [];

    for (const link of links) {
      // Get player identity
      const player = await ctx.db.get(link.playerIdentityId);
      if (!player) {
        continue;
      }

      // Check if player is enrolled in this org
      const enrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_player_and_org", (q) =>
          q
            .eq("playerIdentityId", link.playerIdentityId)
            .eq("organizationId", args.organizationId)
        )
        .first();

      if (enrollment && enrollment.status === "active") {
        // Get sport passport if exists
        const passport = await ctx.db
          .query("sportPassports")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", link.playerIdentityId)
          )
          .first();

        results.push({
          link,
          player,
          enrollment,
          passport,
        });
      }
    }

    return results;
  },
});

// ============================================================
// SMART MATCHING FUNCTIONS
// These replace the legacy players.getSmartMatchesForParent
// ============================================================

/**
 * Internal mutation to auto-link guardian to players by email match
 * Used by members.ts when a parent role is approved/granted
 */
export const autoLinkGuardianToPlayersInternal = internalMutation({
  args: {
    guardianEmail: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
    linked: v.number(),
    playerNames: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const normalizedEmail = args.guardianEmail.toLowerCase().trim();
    const linkedPlayerNames: string[] = [];

    // Find or create guardian identity
    let guardian = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!guardian) {
      // Create guardian identity
      const guardianId = await ctx.db.insert("guardianIdentities", {
        firstName: "",
        lastName: "",
        email: normalizedEmail,
        verificationStatus: "unverified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdFrom: "auto_link",
      });
      guardian = await ctx.db.get(guardianId);
    }

    if (!guardian) {
      return { linked: 0, playerNames: [] };
    }

    // Get all players enrolled in this organization
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    for (const enrollment of enrollments) {
      const player = await ctx.db.get(enrollment.playerIdentityId);
      if (!player) {
        continue;
      }

      // Check if link already exists
      const existingLink = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian_and_player", (q) =>
          q
            .eq("guardianIdentityId", guardian?._id)
            .eq("playerIdentityId", enrollment.playerIdentityId)
        )
        .first();

      if (existingLink) {
        continue;
      }

      // Check if player email matches guardian email (self-guardian)
      if (player.email?.toLowerCase().trim() === normalizedEmail) {
        // Create link
        await ctx.db.insert("guardianPlayerLinks", {
          guardianIdentityId: guardian._id,
          playerIdentityId: enrollment.playerIdentityId,
          relationship: "guardian",
          isPrimary: true,
          hasParentalResponsibility: true,
          canCollectFromTraining: true,
          consentedToSharing: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        linkedPlayerNames.push(`${player.firstName} ${player.lastName}`);
        continue;
      }

      // Check existing guardian links for email match
      const playerLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) =>
          q.eq("playerIdentityId", enrollment.playerIdentityId)
        )
        .collect();

      for (const link of playerLinks) {
        const existingGuardian = await ctx.db.get(link.guardianIdentityId);
        if (existingGuardian?.email?.toLowerCase().trim() === normalizedEmail) {
          // Already has this guardian linked via different identity - skip
          break;
        }
      }
    }

    return {
      linked: linkedPlayerNames.length,
      playerNames: linkedPlayerNames,
    };
  },
});

/**
 * Get smart matches for a guardian joining an organization
 * Uses identity-based matching instead of legacy players table
 *
 * Replaces: api.models.players.getSmartMatchesForParent
 *
 * Matching criteria:
 * - Guardian email match: 50 points
 * - Child name match: 25-40 points
 * - Surname match: 25 points
 * - Phone match: 15 points
 * - Address match: 5-20 points
 */
export const getSmartMatchesForGuardian = query({
  args: {
    organizationId: v.string(),
    email: v.string(),
    surname: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    children: v.optional(v.string()), // JSON string of [{name, age?, team?}]
  },
  returns: v.array(
    v.object({
      playerIdentityId: v.id("playerIdentities"),
      name: v.string(),
      ageGroup: v.string(),
      dateOfBirth: v.union(v.string(), v.null()),
      matchScore: v.number(),
      matchReasons: v.array(v.string()),
      confidence: v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
        v.literal("none")
      ),
      existingGuardianEmail: v.union(v.string(), v.null()),
      isAlreadyLinked: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();
    const normalizedSurname = args.surname?.toLowerCase().trim() || "";
    const normalizedPhone = (args.phone || "").replace(/\D/g, "").slice(-10);

    // Parse children if provided
    let childrenData: Array<{ name: string; age?: number; team?: string }> = [];
    if (args.children) {
      try {
        childrenData = JSON.parse(args.children);
      } catch (_e) {
        console.warn(
          "[getSmartMatchesForGuardian] Failed to parse children JSON"
        );
      }
    }

    // Get all players enrolled in this organization
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    // Check if this guardian already exists
    const existingGuardian = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    // Get existing links for this guardian
    const existingLinks = new Set<string>();
    if (existingGuardian) {
      const links = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", existingGuardian._id)
        )
        .collect();
      for (const link of links) {
        existingLinks.add(link.playerIdentityId);
      }
    }

    const results = [];

    for (const enrollment of enrollments) {
      const player = await ctx.db.get(enrollment.playerIdentityId);
      if (!player) {
        continue;
      }

      let score = 0;
      const matchReasons: string[] = [];

      // 1. Check if there's already a guardian with matching email linked to this player
      const playerGuardianLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) =>
          q.eq("playerIdentityId", enrollment.playerIdentityId)
        )
        .collect();

      let existingGuardianEmail: string | null = null;
      for (const link of playerGuardianLinks) {
        const guardian = await ctx.db.get(link.guardianIdentityId);
        if (guardian?.email?.toLowerCase().trim() === normalizedEmail) {
          score += 50;
          matchReasons.push("Email match");
          existingGuardianEmail = guardian.email;
          break;
        }
        if (guardian?.email) {
          existingGuardianEmail = guardian.email;
        }
      }

      // 2. Child name matching
      if (childrenData.length > 0) {
        const playerFirstName = player.firstName.toLowerCase();
        const playerLastName = player.lastName.toLowerCase();

        for (const child of childrenData) {
          const nameParts = child.name
            .trim()
            .toLowerCase()
            .split(NAME_SPLIT_REGEX);
          const childFirstName = nameParts[0] || "";
          const childLastName = nameParts.length > 1 ? nameParts.at(-1) : "";

          // Exact first + last name match
          if (
            playerFirstName === childFirstName &&
            playerLastName === childLastName
          ) {
            if (!matchReasons.some((r) => r.includes("Child name"))) {
              score += 40;
              matchReasons.push(`Child name exact match: ${child.name}`);

              // Age bonus
              if (child.age && player.dateOfBirth) {
                try {
                  const birthYear = new Date(player.dateOfBirth).getFullYear();
                  const currentYear = new Date().getFullYear();
                  const playerAge = currentYear - birthYear;
                  if (Math.abs(playerAge - child.age) <= 1) {
                    score += 20;
                    matchReasons.push(`Age confirmed: ~${playerAge} years`);
                  }
                } catch (_e) {
                  // Invalid date
                }
              }
            }
          }
          // First name only match
          else if (
            playerFirstName === childFirstName &&
            playerFirstName.length > 2 &&
            !matchReasons.some((r) => r.includes("Child"))
          ) {
            score += 25;
            matchReasons.push(`Child first name match: ${childFirstName}`);
          }
        }
      }

      // 3. Surname match
      if (
        normalizedSurname &&
        player.lastName.toLowerCase() === normalizedSurname
      ) {
        score += 25;
        matchReasons.push("Surname match");
      }

      // 4. Phone match (check guardian phone)
      if (normalizedPhone.length >= 10) {
        for (const link of playerGuardianLinks) {
          const guardian = await ctx.db.get(link.guardianIdentityId);
          if (guardian?.phone) {
            const guardianPhone = guardian.phone.replace(/\D/g, "").slice(-10);
            if (guardianPhone === normalizedPhone) {
              score += 15;
              matchReasons.push("Phone match");
              break;
            }
          }
        }
      }

      // 5. Address matching
      if (args.address && player.postcode) {
        const inputPostcode = args.address.toUpperCase().replace(/\s/g, "");
        const playerPostcode = player.postcode.toUpperCase().replace(/\s/g, "");
        if (
          inputPostcode.includes(playerPostcode) ||
          playerPostcode.includes(inputPostcode)
        ) {
          score += 20;
          matchReasons.push("Postcode match");
        }
      }

      // Determine confidence tier
      let confidence: "high" | "medium" | "low" | "none";
      if (score >= 60) {
        confidence = "high";
      } else if (score >= 30) {
        confidence = "medium";
      } else if (score >= 10) {
        confidence = "low";
      } else {
        confidence = "none";
      }

      // Only include matches with score > 0
      if (score > 0) {
        results.push({
          playerIdentityId: enrollment.playerIdentityId,
          name: `${player.firstName} ${player.lastName}`,
          ageGroup: enrollment.ageGroup,
          dateOfBirth: player.dateOfBirth,
          matchScore: score,
          matchReasons,
          confidence,
          existingGuardianEmail,
          isAlreadyLinked: existingLinks.has(enrollment.playerIdentityId),
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.matchScore - a.matchScore);

    return results;
  },
});

/**
 * Update notificationSentAt timestamp on a guardian-player link
 * Called after sending email notification to guardian
 */
export const updateNotificationSentAt = internalMutation({
  args: {
    linkId: v.id("guardianPlayerLinks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Guardian-player link not found");
    }

    await ctx.db.patch(args.linkId, {
      notificationSentAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log(
      `[updateNotificationSentAt] Updated notification timestamp for link ${args.linkId}`
    );

    return null;
  },
});

/**
 * Get all guardian-player links for a guardian (internal use)
 * Used for counting pending children when sending notifications
 */
export const getLinksForGuardian = internalQuery({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
  },
  returns: v.array(
    v.object({
      _id: v.id("guardianPlayerLinks"),
      guardianIdentityId: v.id("guardianIdentities"),
      playerIdentityId: v.id("playerIdentities"),
      relationship: relationshipValidator,
      isPrimary: v.boolean(),
      hasParentalResponsibility: v.boolean(),
      canCollectFromTraining: v.boolean(),
      consentedToSharing: v.boolean(),
      acknowledgedByParentAt: v.optional(v.number()),
      declinedByUserId: v.optional(v.string()),
      notificationSentAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", args.guardianIdentityId)
      )
      .collect();

    return links.map((link) => ({
      _id: link._id,
      guardianIdentityId: link.guardianIdentityId,
      playerIdentityId: link.playerIdentityId,
      relationship: link.relationship,
      isPrimary: link.isPrimary,
      hasParentalResponsibility: link.hasParentalResponsibility,
      canCollectFromTraining: link.canCollectFromTraining,
      consentedToSharing: link.consentedToSharing,
      acknowledgedByParentAt: link.acknowledgedByParentAt,
      declinedByUserId: link.declinedByUserId,
      notificationSentAt: link.notificationSentAt,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    }));
  },
});

/**
 * Clean up old test guardian-player links for a specific guardian
 * Keeps only links for a specific organization, deletes all others
 * ONE-TIME USE for cleaning up test data
 */
export const cleanupTestLinksForGuardian = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    keepOrganizationId: v.string(),
  },
  returns: v.object({
    totalLinks: v.number(),
    keptLinks: v.number(),
    deletedLinks: v.number(),
    deletedLinkIds: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    // Get all links for this guardian
    const allLinks = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", args.guardianIdentityId)
      )
      .collect();

    console.log(
      `[cleanupTestLinksForGuardian] Found ${allLinks.length} total links for guardian ${args.guardianIdentityId}`
    );

    const deletedLinkIds: string[] = [];
    let keptCount = 0;

    for (const link of allLinks) {
      // Get the player to find their organization
      const player = await ctx.db.get(link.playerIdentityId);
      if (!player) {
        console.log(
          `[cleanupTestLinksForGuardian] Player not found: ${link.playerIdentityId}, deleting link`
        );
        await ctx.db.delete(link._id);
        deletedLinkIds.push(link._id);
        continue;
      }

      // Get the enrollment to find the organization
      const enrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_player_and_org", (q) =>
          q.eq("playerIdentityId", link.playerIdentityId)
        )
        .first();

      if (!enrollment) {
        console.log(
          `[cleanupTestLinksForGuardian] No enrollment found for player ${player.firstName} ${player.lastName}, deleting link`
        );
        await ctx.db.delete(link._id);
        deletedLinkIds.push(link._id);
        continue;
      }

      // Keep links for the specified organization, delete all others
      if (enrollment.organizationId === args.keepOrganizationId) {
        console.log(
          `[cleanupTestLinksForGuardian] Keeping link for player ${player.firstName} ${player.lastName} in org ${enrollment.organizationId}`
        );
        keptCount += 1;
      } else {
        console.log(
          `[cleanupTestLinksForGuardian] Deleting link for player ${player.firstName} ${player.lastName} in org ${enrollment.organizationId}`
        );
        await ctx.db.delete(link._id);
        deletedLinkIds.push(link._id);
      }
    }

    return {
      totalLinks: allLinks.length,
      keptLinks: keptCount,
      deletedLinks: deletedLinkIds.length,
      deletedLinkIds,
    };
  },
});

/**
 * Get pending children count by guardian email (internal use)
 * Used for email notifications to show how many pending children need acknowledgment
 */
export const getPendingChildrenCountByEmail = internalQuery({
  args: { guardianEmail: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const normalizedEmail = args.guardianEmail.toLowerCase().trim();

    // Find ALL guardian identities with this email (there might be multiple)
    const guardians = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect();

    console.log(
      `[getPendingChildrenCountByEmail] Found ${guardians.length} guardian identities for ${normalizedEmail}`
    );

    if (guardians.length === 0) {
      return 0;
    }

    let totalPendingCount = 0;

    // Count pending links across ALL guardian identities with this email
    for (const guardian of guardians) {
      const links = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", guardian._id)
        )
        .collect();

      console.log(
        `[getPendingChildrenCountByEmail] Guardian ${guardian._id}: ${links.length} total links`
      );

      // Count only pending links (not acknowledged and not declined)
      const pendingLinks = links.filter(
        (link) => !(link.acknowledgedByParentAt || link.declinedByUserId)
      );

      console.log(
        `[getPendingChildrenCountByEmail] Guardian ${guardian._id}: ${pendingLinks.length} pending links`
      );

      totalPendingCount += pendingLinks.length;
    }

    console.log(
      `[getPendingChildrenCountByEmail] Total pending count: ${totalPendingCount}`
    );

    return totalPendingCount;
  },
});
