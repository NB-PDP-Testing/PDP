import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

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
  createdAt: v.number(),
  updatedAt: v.number(),
  verifiedAt: v.optional(v.number()),
  verifiedBy: v.optional(v.string()),
});

// Guardian identity validator (for joined queries)
const guardianIdentityValidator = v.object({
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
const playerIdentityValidator = v.object({
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
      if (!firstLink) return null;
      const guardian = await ctx.db.get(firstLink.guardianIdentityId);
      if (!guardian) return null;
      return { link: firstLink, guardian };
    }

    const guardian = await ctx.db.get(primaryLink.guardianIdentityId);
    if (!guardian) return null;
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
 */
export const deleteGuardianPlayerLink = mutation({
  args: { linkId: v.id("guardianPlayerLinks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.linkId);
    if (!existing) {
      throw new Error("Guardian-player link not found");
    }

    await ctx.db.delete(args.linkId);

    // If this was primary, set another guardian as primary
    if (existing.isPrimary) {
      const remainingLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) =>
          q.eq("playerIdentityId", existing.playerIdentityId)
        )
        .first();

      if (remainingLinks) {
        await ctx.db.patch(remainingLinks._id, {
          isPrimary: true,
          updatedAt: Date.now(),
        });
      }
    }

    return null;
  },
});
