import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

// Org guardian profile validator for return types
const orgGuardianProfileValidator = v.object({
  _id: v.id("orgGuardianProfiles"),
  _creationTime: v.number(),
  guardianIdentityId: v.id("guardianIdentities"),
  organizationId: v.string(),
  emergencyPriority: v.optional(v.number()),
  receiveMatchUpdates: v.optional(v.boolean()),
  receiveTrainingUpdates: v.optional(v.boolean()),
  receiveNewsletters: v.optional(v.boolean()),
  preferredLanguage: v.optional(v.string()),
  clubNotes: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
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

// ============================================================
// QUERIES
// ============================================================

/**
 * Get a guardian's profile for a specific organization
 */
export const getOrgGuardianProfile = query({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    organizationId: v.string(),
  },
  returns: v.union(orgGuardianProfileValidator, v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("orgGuardianProfiles")
      .withIndex("by_guardian_and_org", (q) =>
        q
          .eq("guardianIdentityId", args.guardianIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first(),
});

/**
 * Get all org profiles for a guardian (across all organizations)
 */
export const getOrgProfilesForGuardian = query({
  args: { guardianIdentityId: v.id("guardianIdentities") },
  returns: v.array(orgGuardianProfileValidator),
  handler: async (ctx, args) =>
    await ctx.db
      .query("orgGuardianProfiles")
      .withIndex("by_guardianIdentityId", (q) =>
        q.eq("guardianIdentityId", args.guardianIdentityId)
      )
      .collect(),
});

/**
 * Get all guardians for an organization (with their identity details)
 */
export const getGuardiansForOrganization = query({
  args: {
    organizationId: v.string(),
    activeOnly: v.optional(v.boolean()),
  },
  // Using v.any() for joined query results - schema validation happens at document level
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const profiles = await ctx.db
      .query("orgGuardianProfiles")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activeOnly = args.activeOnly ?? true;
    const filteredProfiles = activeOnly
      ? profiles.filter((p) => p.isActive)
      : profiles;

    const results = [];

    for (const profile of filteredProfiles) {
      const guardian = await ctx.db.get(profile.guardianIdentityId);
      if (guardian) {
        results.push({ profile, guardian });
      }
    }

    return results;
  },
});

/**
 * Check if a guardian has a profile in an organization
 */
export const hasOrgProfile = query({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    organizationId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("orgGuardianProfiles")
      .withIndex("by_guardian_and_org", (q) =>
        q
          .eq("guardianIdentityId", args.guardianIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();
    return profile !== null;
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Create an organization-specific guardian profile
 */
export const createOrgGuardianProfile = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    organizationId: v.string(),
    emergencyPriority: v.optional(v.number()),
    receiveMatchUpdates: v.optional(v.boolean()),
    receiveTrainingUpdates: v.optional(v.boolean()),
    receiveNewsletters: v.optional(v.boolean()),
    preferredLanguage: v.optional(v.string()),
    clubNotes: v.optional(v.string()),
  },
  returns: v.id("orgGuardianProfiles"),
  handler: async (ctx, args) => {
    // Verify guardian exists
    const guardian = await ctx.db.get(args.guardianIdentityId);
    if (!guardian) {
      throw new Error("Guardian identity not found");
    }

    // Check if profile already exists
    const existing = await ctx.db
      .query("orgGuardianProfiles")
      .withIndex("by_guardian_and_org", (q) =>
        q
          .eq("guardianIdentityId", args.guardianIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (existing) {
      throw new Error("Guardian already has a profile in this organization");
    }

    const now = Date.now();

    return await ctx.db.insert("orgGuardianProfiles", {
      guardianIdentityId: args.guardianIdentityId,
      organizationId: args.organizationId,
      emergencyPriority: args.emergencyPriority,
      receiveMatchUpdates: args.receiveMatchUpdates ?? true,
      receiveTrainingUpdates: args.receiveTrainingUpdates ?? true,
      receiveNewsletters: args.receiveNewsletters ?? false,
      preferredLanguage: args.preferredLanguage,
      clubNotes: args.clubNotes,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an organization-specific guardian profile
 */
export const updateOrgGuardianProfile = mutation({
  args: {
    profileId: v.id("orgGuardianProfiles"),
    emergencyPriority: v.optional(v.number()),
    receiveMatchUpdates: v.optional(v.boolean()),
    receiveTrainingUpdates: v.optional(v.boolean()),
    receiveNewsletters: v.optional(v.boolean()),
    preferredLanguage: v.optional(v.string()),
    clubNotes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.profileId);
    if (!existing) {
      throw new Error("Organization guardian profile not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.emergencyPriority !== undefined) {
      updates.emergencyPriority = args.emergencyPriority;
    }
    if (args.receiveMatchUpdates !== undefined) {
      updates.receiveMatchUpdates = args.receiveMatchUpdates;
    }
    if (args.receiveTrainingUpdates !== undefined) {
      updates.receiveTrainingUpdates = args.receiveTrainingUpdates;
    }
    if (args.receiveNewsletters !== undefined) {
      updates.receiveNewsletters = args.receiveNewsletters;
    }
    if (args.preferredLanguage !== undefined) {
      updates.preferredLanguage = args.preferredLanguage;
    }
    if (args.clubNotes !== undefined) {
      updates.clubNotes = args.clubNotes;
    }
    if (args.isActive !== undefined) {
      updates.isActive = args.isActive;
    }

    await ctx.db.patch(args.profileId, updates);
    return null;
  },
});

/**
 * Find or create an org guardian profile (upsert pattern)
 * Used when linking guardian to an organization
 */
export const findOrCreateOrgProfile = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    organizationId: v.string(),
    emergencyPriority: v.optional(v.number()),
  },
  returns: v.object({
    profileId: v.id("orgGuardianProfiles"),
    wasCreated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify guardian exists
    const guardian = await ctx.db.get(args.guardianIdentityId);
    if (!guardian) {
      throw new Error("Guardian identity not found");
    }

    // Check if profile already exists
    const existing = await ctx.db
      .query("orgGuardianProfiles")
      .withIndex("by_guardian_and_org", (q) =>
        q
          .eq("guardianIdentityId", args.guardianIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (existing) {
      return {
        profileId: existing._id,
        wasCreated: false,
      };
    }

    const now = Date.now();

    const profileId = await ctx.db.insert("orgGuardianProfiles", {
      guardianIdentityId: args.guardianIdentityId,
      organizationId: args.organizationId,
      emergencyPriority: args.emergencyPriority,
      receiveMatchUpdates: true,
      receiveTrainingUpdates: true,
      receiveNewsletters: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return {
      profileId,
      wasCreated: true,
    };
  },
});

/**
 * Deactivate a guardian's profile in an organization
 * (Soft delete - keeps history)
 */
export const deactivateOrgProfile = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("orgGuardianProfiles")
      .withIndex("by_guardian_and_org", (q) =>
        q
          .eq("guardianIdentityId", args.guardianIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!profile) {
      throw new Error("Guardian profile not found in this organization");
    }

    await ctx.db.patch(profile._id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Reactivate a guardian's profile in an organization
 */
export const reactivateOrgProfile = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("orgGuardianProfiles")
      .withIndex("by_guardian_and_org", (q) =>
        q
          .eq("guardianIdentityId", args.guardianIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!profile) {
      throw new Error("Guardian profile not found in this organization");
    }

    await ctx.db.patch(profile._id, {
      isActive: true,
      updatedAt: Date.now(),
    });

    return null;
  },
});
