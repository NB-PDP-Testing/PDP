import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

// Verification status type
const verificationStatusValidator = v.union(
  v.literal("unverified"),
  v.literal("email_verified"),
  v.literal("id_verified")
);

// Contact method preference
const contactMethodValidator = v.union(
  v.literal("email"),
  v.literal("phone"),
  v.literal("both")
);

// Guardian identity validator for return types
const guardianIdentityValidator = v.object({
  _id: v.id("guardianIdentities"),
  _creationTime: v.number(),
  firstName: v.string(),
  lastName: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  town: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),
  userId: v.optional(v.string()),
  verificationStatus: verificationStatusValidator,
  preferredContactMethod: v.optional(contactMethodValidator),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdFrom: v.optional(v.string()),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Find a guardian identity by email (case-insensitive)
 */
export const findGuardianByEmail = query({
  args: { email: v.string() },
  returns: v.union(guardianIdentityValidator, v.null()),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();
    return await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
  },
});

/**
 * Find a guardian identity by Better Auth user ID
 */
export const findGuardianByUserId = query({
  args: { userId: v.string() },
  returns: v.union(guardianIdentityValidator, v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first(),
});

/**
 * Find a guardian identity by phone (normalized)
 */
export const findGuardianByPhone = query({
  args: { phone: v.string() },
  returns: v.union(guardianIdentityValidator, v.null()),
  handler: async (ctx, args) => {
    const normalizedPhone = normalizePhone(args.phone);
    return await ctx.db
      .query("guardianIdentities")
      .withIndex("by_phone", (q) => q.eq("phone", normalizedPhone))
      .first();
  },
});

/**
 * Get guardian identity for the current logged-in user
 * Returns null if no guardian identity is linked to this user
 */
export const getGuardianForCurrentUser = query({
  args: {},
  returns: v.union(guardianIdentityValidator, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Better Auth stores the user ID in the subject claim
    const userId = identity.subject;
    return await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

/**
 * Get a guardian identity by ID
 */
export const getGuardianById = query({
  args: { guardianIdentityId: v.id("guardianIdentities") },
  returns: v.union(guardianIdentityValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.guardianIdentityId),
});

/**
 * Search guardians by name
 */
export const searchGuardiansByName = query({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(guardianIdentityValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // If we have both names, use the composite index
    if (args.lastName && args.firstName) {
      return await ctx.db
        .query("guardianIdentities")
        .withIndex("by_name", (q) =>
          q.eq("lastName", args.lastName!).eq("firstName", args.firstName!)
        )
        .take(limit);
    }

    // If we only have lastName, use the index and filter
    if (args.lastName) {
      return await ctx.db
        .query("guardianIdentities")
        .withIndex("by_name", (q) => q.eq("lastName", args.lastName!))
        .take(limit);
    }

    // Otherwise, we need to scan (not ideal but works for small datasets)
    const all = await ctx.db.query("guardianIdentities").take(limit * 10);

    if (args.firstName) {
      return all
        .filter(
          (g) => g.firstName.toLowerCase() === args.firstName?.toLowerCase()
        )
        .slice(0, limit);
    }

    return all.slice(0, limit);
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Create a new guardian identity
 * Throws error if email already exists
 */
export const createGuardianIdentity = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),
    userId: v.optional(v.string()),
    verificationStatus: v.optional(verificationStatusValidator),
    preferredContactMethod: v.optional(contactMethodValidator),
    createdFrom: v.optional(v.string()),
  },
  returns: v.id("guardianIdentities"),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Check for existing guardian with same email
    const existing = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) {
      throw new Error(`Guardian with email ${normalizedEmail} already exists`);
    }

    const now = Date.now();
    const normalizedPhone = args.phone ? normalizePhone(args.phone) : undefined;

    return await ctx.db.insert("guardianIdentities", {
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      address: args.address?.trim(),
      town: args.town?.trim(),
      postcode: args.postcode?.trim(),
      country: args.country?.trim(),
      userId: args.userId,
      verificationStatus: args.verificationStatus ?? "unverified",
      preferredContactMethod: args.preferredContactMethod,
      createdAt: now,
      updatedAt: now,
      createdFrom: args.createdFrom ?? "manual",
    });
  },
});

/**
 * Update an existing guardian identity
 */
export const updateGuardianIdentity = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),
    verificationStatus: v.optional(verificationStatusValidator),
    preferredContactMethod: v.optional(contactMethodValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.guardianIdentityId);
    if (!existing) {
      throw new Error("Guardian identity not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.firstName !== undefined) {
      updates.firstName = args.firstName.trim();
    }
    if (args.lastName !== undefined) {
      updates.lastName = args.lastName.trim();
    }
    if (args.email !== undefined) {
      const normalizedEmail = args.email.toLowerCase().trim();
      // Check if new email conflicts with another guardian
      if (normalizedEmail !== existing.email) {
        const conflict = await ctx.db
          .query("guardianIdentities")
          .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
          .first();
        if (conflict) {
          throw new Error(
            `Guardian with email ${normalizedEmail} already exists`
          );
        }
      }
      updates.email = normalizedEmail;
    }
    if (args.phone !== undefined) {
      updates.phone = normalizePhone(args.phone);
    }
    if (args.address !== undefined) {
      updates.address = args.address.trim();
    }
    if (args.town !== undefined) {
      updates.town = args.town.trim();
    }
    if (args.postcode !== undefined) {
      updates.postcode = args.postcode.trim();
    }
    if (args.country !== undefined) {
      updates.country = args.country.trim();
    }
    if (args.verificationStatus !== undefined) {
      updates.verificationStatus = args.verificationStatus;
    }
    if (args.preferredContactMethod !== undefined) {
      updates.preferredContactMethod = args.preferredContactMethod;
    }

    await ctx.db.patch(args.guardianIdentityId, updates);
    return null;
  },
});

/**
 * Link a guardian identity to a Better Auth user
 */
export const linkGuardianToUser = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.guardianIdentityId);
    if (!existing) {
      throw new Error("Guardian identity not found");
    }

    // Check if this userId is already linked to another guardian
    const existingUserLink = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingUserLink && existingUserLink._id !== args.guardianIdentityId) {
      throw new Error(
        "This user is already linked to another guardian identity"
      );
    }

    await ctx.db.patch(args.guardianIdentityId, {
      userId: args.userId,
      verificationStatus:
        existing.verificationStatus === "unverified"
          ? "email_verified"
          : existing.verificationStatus,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Find or create a guardian identity (upsert pattern)
 * Used primarily for imports - finds by email match or creates new
 */
export const findOrCreateGuardian = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),
    createdFrom: v.optional(v.string()),
  },
  returns: v.object({
    guardianIdentityId: v.id("guardianIdentities"),
    wasCreated: v.boolean(),
    matchConfidence: v.number(),
  }),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Try to find existing guardian by email
    const existing = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) {
      // Calculate match confidence
      let confidence = 80; // Base for email match
      if (
        args.firstName.toLowerCase().trim() === existing.firstName.toLowerCase()
      ) {
        confidence += 10;
      }
      if (
        args.lastName.toLowerCase().trim() === existing.lastName.toLowerCase()
      ) {
        confidence += 10;
      }

      return {
        guardianIdentityId: existing._id,
        wasCreated: false,
        matchConfidence: confidence,
      };
    }

    // No match found, create new guardian
    const now = Date.now();
    const normalizedPhone = args.phone ? normalizePhone(args.phone) : undefined;

    const guardianIdentityId = await ctx.db.insert("guardianIdentities", {
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      address: args.address?.trim(),
      town: args.town?.trim(),
      postcode: args.postcode?.trim(),
      country: args.country?.trim(),
      verificationStatus: "unverified",
      createdAt: now,
      updatedAt: now,
      createdFrom: args.createdFrom ?? "import",
    });

    return {
      guardianIdentityId,
      wasCreated: true,
      matchConfidence: 100, // New record, exact match to input
    };
  },
});

/**
 * Find matching guardian with confidence scoring
 * Used for intelligent matching during imports
 */
export const findMatchingGuardian = query({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      guardian: guardianIdentityValidator,
      confidence: v.number(),
      matchType: v.union(
        v.literal("email"),
        v.literal("phone"),
        v.literal("name")
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // 1. Exact email match (highest confidence)
    const byEmail = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (byEmail) {
      let confidence = 80; // Base for email match
      if (
        args.firstName &&
        byEmail.firstName.toLowerCase() === args.firstName.toLowerCase().trim()
      ) {
        confidence += 10;
      }
      if (
        args.lastName &&
        byEmail.lastName.toLowerCase() === args.lastName.toLowerCase().trim()
      ) {
        confidence += 10;
      }
      return { guardian: byEmail, confidence, matchType: "email" as const };
    }

    // 2. Phone match (if no email match)
    if (args.phone) {
      const normalizedPhone = normalizePhone(args.phone);
      const byPhone = await ctx.db
        .query("guardianIdentities")
        .withIndex("by_phone", (q) => q.eq("phone", normalizedPhone))
        .first();

      if (byPhone) {
        let confidence = 60; // Lower than email
        if (
          args.firstName &&
          byPhone.firstName.toLowerCase() ===
            args.firstName.toLowerCase().trim()
        ) {
          confidence += 15;
        }
        if (
          args.lastName &&
          byPhone.lastName.toLowerCase() === args.lastName.toLowerCase().trim()
        ) {
          confidence += 15;
        }
        return {
          guardian: byPhone,
          confidence: Math.min(confidence, 90),
          matchType: "phone" as const,
        };
      }
    }

    // 3. Name match only (lowest confidence - requires admin review)
    if (args.firstName && args.lastName) {
      const firstName = args.firstName.trim();
      const lastName = args.lastName.trim();
      const byName = await ctx.db
        .query("guardianIdentities")
        .withIndex("by_name", (q) =>
          q.eq("lastName", lastName).eq("firstName", firstName)
        )
        .first();

      if (byName) {
        return {
          guardian: byName,
          confidence: 40, // Low - needs review
          matchType: "name" as const,
        };
      }
    }

    return null;
  },
});

/**
 * Get all unclaimed guardian identities for admin dashboard
 * Only for platform staff or org admins
 */
export const getUnclaimedGuardians = query({
  args: {
    organizationId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      guardian: guardianIdentityValidator,
      childrenCount: v.number(),
      children: v.array(
        v.object({
          firstName: v.string(),
          lastName: v.string(),
          dateOfBirth: v.string(),
        })
      ),
      organizationIds: v.array(v.string()),
      daysSinceCreated: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get all guardians without userId (unclaimed)
    const allGuardians = await ctx.db
      .query("guardianIdentities")
      .filter((q) => q.eq(q.field("userId"), undefined))
      .collect();

    const results = [];

    for (const guardian of allGuardians) {
      // Get linked children
      const links = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", guardian._id)
        )
        .collect();

      const children = [];
      const orgSet = new Set<string>();

      for (const link of links) {
        const player = await ctx.db.get(link.playerIdentityId);
        if (player) {
          children.push({
            firstName: player.firstName,
            lastName: player.lastName,
            dateOfBirth: player.dateOfBirth,
          });

          // Get enrollments to find organizations
          const enrollments = await ctx.db
            .query("orgPlayerEnrollments")
            .withIndex("by_playerIdentityId", (q) =>
              q.eq("playerIdentityId", player._id)
            )
            .collect();

          for (const enrollment of enrollments) {
            orgSet.add(enrollment.organizationId);
          }
        }
      }

      const organizationIds = Array.from(orgSet);

      // Filter by organization if specified
      if (
        args.organizationId &&
        !organizationIds.includes(args.organizationId)
      ) {
        continue;
      }

      // Calculate days since created
      const daysSinceCreated = Math.floor(
        (Date.now() - guardian.createdAt) / (1000 * 60 * 60 * 24)
      );

      results.push({
        guardian,
        childrenCount: children.length,
        children,
        organizationIds,
        daysSinceCreated,
      });
    }

    // Sort by most recent first
    results.sort((a, b) => b.guardian.createdAt - a.guardian.createdAt);

    // Apply limit if specified
    if (args.limit && args.limit > 0) {
      return results.slice(0, args.limit);
    }

    return results;
  },
});

/**
 * Find all claimable identities for the current logged-in user
 * Used for bulk claiming when a user logs in and has multiple unclaimed profiles
 */
export const findAllClaimableForCurrentUser = query({
  args: {},
  returns: v.array(
    v.object({
      guardianIdentity: guardianIdentityValidator,
      children: v.array(
        v.object({
          playerIdentityId: v.id("playerIdentities"),
          firstName: v.string(),
          lastName: v.string(),
          dateOfBirth: v.string(),
          relationship: v.string(),
        })
      ),
      organizations: v.array(
        v.object({
          organizationId: v.string(),
          organizationName: v.optional(v.string()),
        })
      ),
      confidence: v.number(),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userEmail = identity.email;
    if (!userEmail) {
      return [];
    }

    const normalizedEmail = userEmail.toLowerCase().trim();

    // Find all guardians with this email that don't have a userId
    const matchingGuardians = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .filter((q) => q.eq(q.field("userId"), undefined))
      .collect();

    const results = [];

    for (const guardian of matchingGuardians) {
      // Get all linked children
      const links = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", guardian._id)
        )
        .collect();

      const children = [];
      const orgSet = new Set<string>();

      for (const link of links) {
        const player = await ctx.db.get(link.playerIdentityId);
        if (player) {
          children.push({
            playerIdentityId: player._id,
            firstName: player.firstName,
            lastName: player.lastName,
            dateOfBirth: player.dateOfBirth,
            relationship: link.relationship,
          });

          // Collect organizations
          const enrollments = await ctx.db
            .query("orgPlayerEnrollments")
            .withIndex("by_playerIdentityId", (q) =>
              q.eq("playerIdentityId", player._id)
            )
            .collect();

          for (const enrollment of enrollments) {
            orgSet.add(enrollment.organizationId);
          }
        }
      }

      const organizations = Array.from(orgSet).map((orgId) => ({
        organizationId: orgId,
        organizationName: undefined,
      }));

      // Email match = high confidence
      results.push({
        guardianIdentity: guardian,
        children,
        organizations,
        confidence: 100,
      });
    }

    return results;
  },
});

/**
 * Check if guardian identity exists for signup claiming flow
 * Returns guardian with linked children and organizations for claiming UI
 */
export const checkForClaimableIdentity = query({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      guardianIdentity: guardianIdentityValidator,
      children: v.array(
        v.object({
          playerIdentityId: v.id("playerIdentities"),
          firstName: v.string(),
          lastName: v.string(),
          dateOfBirth: v.string(),
          relationship: v.string(),
        })
      ),
      organizations: v.array(
        v.object({
          organizationId: v.string(),
          organizationName: v.optional(v.string()),
        })
      ),
      confidence: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Find guardian by email
    const guardian = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!guardian) {
      return null;
    }

    // Only show claiming flow for unverified guardians (no userId yet)
    if (guardian.userId) {
      return null;
    }

    // Calculate confidence based on name match
    let confidence = 80; // Base for email match
    if (args.name) {
      const fullName = `${guardian.firstName} ${guardian.lastName}`
        .toLowerCase()
        .trim();
      const providedName = args.name.toLowerCase().trim();

      // Check if provided name matches (could be in any order)
      if (fullName.includes(providedName) || providedName.includes(fullName)) {
        confidence = 100;
      }
    }

    // Get all linked children
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian", (q) => q.eq("guardianIdentityId", guardian._id))
      .collect();

    const children = [];
    const orgSet = new Set<string>();

    for (const link of links) {
      const player = await ctx.db.get(link.playerIdentityId);
      if (player) {
        children.push({
          playerIdentityId: player._id,
          firstName: player.firstName,
          lastName: player.lastName,
          dateOfBirth: player.dateOfBirth,
          relationship: link.relationship,
        });

        // Collect organizations where this player is enrolled
        const enrollments = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", player._id)
          )
          .collect();

        for (const enrollment of enrollments) {
          orgSet.add(enrollment.organizationId);
        }
      }
    }

    // Get organization names (from Better Auth organizations)
    const organizations = Array.from(orgSet).map((orgId) => ({
      organizationId: orgId,
      organizationName: undefined, // Will be fetched from Better Auth on frontend
    }));

    return {
      guardianIdentity: guardian,
      children,
      organizations,
      confidence,
    };
  },
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Normalize a phone number for consistent storage and matching
 * Removes spaces, dashes, and common formatting characters
 */
function normalizePhone(phone: string): string {
  // Remove all non-digit characters except leading +
  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");

  // Add back the + if it was there
  return hasPlus ? `+${digits}` : digits;
}
