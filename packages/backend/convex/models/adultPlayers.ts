import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { calculateAge } from "./playerIdentities";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("other")
);

const verificationStatusValidator = v.union(
  v.literal("unverified"),
  v.literal("guardian_verified"),
  v.literal("self_verified"),
  v.literal("document_verified")
);

// Player identity validator for return types
const playerIdentityValidator = v.object({
  _id: v.id("playerIdentities"),
  _creationTime: v.number(),
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.string(),
  gender: genderValidator,
  playerType: v.union(v.literal("youth"), v.literal("adult")),
  userId: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  town: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),
  verificationStatus: verificationStatusValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  createdFrom: v.optional(v.string()),
});

// Emergency contact validator
const emergencyContactValidator = v.object({
  _id: v.id("playerEmergencyContacts"),
  _creationTime: v.number(),
  playerIdentityId: v.id("playerIdentities"),
  firstName: v.string(),
  lastName: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),
  relationship: v.string(),
  priority: v.number(),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get the player profile for the current logged-in adult user
 */
export const getMyPlayerProfile = query({
  args: {},
  returns: v.union(
    v.object({
      player: playerIdentityValidator,
      emergencyContacts: v.array(emergencyContactValidator),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userId = identity.subject;

    // Find player by userId
    const player = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!player) {
      return null;
    }

    // Get emergency contacts
    const emergencyContacts = await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_priority", (q) => q.eq("playerIdentityId", player._id))
      .collect();

    return { player, emergencyContacts };
  },
});

/**
 * Find adult player by user ID
 */
export const findAdultPlayerByUserId = query({
  args: { userId: v.string() },
  returns: v.union(playerIdentityValidator, v.null()),
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (player && player.playerType === "adult") {
      return player;
    }

    return null;
  },
});

/**
 * Check if user has an adult player profile
 */
export const hasAdultPlayerProfile = query({
  args: { userId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return player !== null && player.playerType === "adult";
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Register a new adult player linked to their user account
 */
export const registerAdultPlayer = mutation({
  args: {
    userId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    gender: genderValidator,
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  returns: v.id("playerIdentities"),
  handler: async (ctx, args) => {
    // Check if user already has a player identity
    const existingPlayer = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingPlayer) {
      throw new Error("User already has a player identity");
    }

    // Validate age is 18+
    const age = calculateAge(args.dateOfBirth);
    if (age < 18) {
      throw new Error("Adult registration requires age 18 or older");
    }

    const now = Date.now();

    return await ctx.db.insert("playerIdentities", {
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      dateOfBirth: args.dateOfBirth,
      gender: args.gender,
      playerType: "adult",
      userId: args.userId,
      email: args.email?.toLowerCase().trim(),
      phone: args.phone?.trim(),
      address: args.address?.trim(),
      town: args.town?.trim(),
      postcode: args.postcode?.trim(),
      country: args.country?.trim(),
      verificationStatus: "self_verified",
      createdAt: now,
      updatedAt: now,
      createdFrom: "registration",
    });
  },
});

/**
 * Transition a youth player to adult status
 * Called when player turns 18 or manually by admin
 */
export const transitionToAdult = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    userId: v.optional(v.string()), // Link to their own account if registered
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    emergencyContactsCreated: v.number(),
  }),
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      throw new Error("Player not found");
    }
    if (player.playerType === "adult") {
      throw new Error("Player is already an adult");
    }

    // Optionally verify age
    const age = calculateAge(player.dateOfBirth);
    if (age < 18) {
      throw new Error("Player must be 18 or older to transition to adult");
    }

    // 1. Update player to adult type
    await ctx.db.patch(args.playerIdentityId, {
      playerType: "adult",
      userId: args.userId,
      email: args.email?.toLowerCase().trim(),
      phone: args.phone?.trim(),
      verificationStatus: args.userId ? "self_verified" : "unverified",
      updatedAt: Date.now(),
    });

    // 2. Convert guardians to emergency contacts
    const guardianLinks = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    let priority = 1;
    const now = Date.now();

    for (const link of guardianLinks) {
      const guardian = await ctx.db.get(link.guardianIdentityId);
      if (!guardian) {
        continue;
      }

      // Create emergency contact from guardian
      await ctx.db.insert("playerEmergencyContacts", {
        playerIdentityId: args.playerIdentityId,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        phone: guardian.phone || "",
        email: guardian.email,
        relationship: mapRelationshipToEmergency(link.relationship),
        priority: priority++,
        notes: link.isPrimary ? "Former primary guardian" : undefined,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 3. Guardian links are kept for historical reference
    // They won't be used for youth-specific features anymore

    return {
      success: true,
      emergencyContactsCreated: guardianLinks.length,
    };
  },
});

/**
 * Update adult player's own profile
 */
export const updateMyProfile = mutation({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const player = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!player) {
      throw new Error("Player profile not found");
    }

    if (player.playerType !== "adult") {
      throw new Error("Only adult players can update their own profile");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.email !== undefined) {
      updates.email = args.email.toLowerCase().trim();
    }
    if (args.phone !== undefined) {
      updates.phone = args.phone.trim();
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

    await ctx.db.patch(player._id, updates);
    return null;
  },
});

/**
 * Link an existing youth player to their user account when they turn 18
 * This is used when a youth player creates an account
 */
export const claimYouthProfile = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    userId: v.string(),
    email: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    transitioned: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Check if user already has a player identity
    const existingPlayer = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingPlayer) {
      throw new Error("User already has a player identity");
    }

    const age = calculateAge(player.dateOfBirth);

    if (age >= 18) {
      // Automatically transition to adult
      await ctx.db.patch(args.playerIdentityId, {
        playerType: "adult",
        userId: args.userId,
        email: args.email?.toLowerCase().trim(),
        verificationStatus: "self_verified",
        updatedAt: Date.now(),
      });

      // Convert guardians to emergency contacts
      const guardianLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) =>
          q.eq("playerIdentityId", args.playerIdentityId)
        )
        .collect();

      let priority = 1;
      const now = Date.now();

      for (const link of guardianLinks) {
        const guardian = await ctx.db.get(link.guardianIdentityId);
        if (!guardian) {
          continue;
        }

        await ctx.db.insert("playerEmergencyContacts", {
          playerIdentityId: args.playerIdentityId,
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          phone: guardian.phone || "",
          email: guardian.email,
          relationship: mapRelationshipToEmergency(link.relationship),
          priority: priority++,
          notes: link.isPrimary ? "Former primary guardian" : undefined,
          createdAt: now,
          updatedAt: now,
        });
      }

      return { success: true, transitioned: true };
    }
    // Just link the user ID but keep as youth
    await ctx.db.patch(args.playerIdentityId, {
      userId: args.userId,
      email: args.email?.toLowerCase().trim(),
      updatedAt: Date.now(),
    });

    return { success: true, transitioned: false };
  },
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Map guardian relationship to emergency contact relationship
 */
function mapRelationshipToEmergency(
  guardianRelationship:
    | "mother"
    | "father"
    | "guardian"
    | "grandparent"
    | "other"
): string {
  switch (guardianRelationship) {
    case "mother":
      return "Mother";
    case "father":
      return "Father";
    case "guardian":
      return "Guardian";
    case "grandparent":
      return "Grandparent";
    case "other":
      return "Family";
  }
}
