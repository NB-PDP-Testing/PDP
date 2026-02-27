import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalMutation, mutation, query } from "../_generated/server";
import { authComponent } from "../auth";
import { requireAuth } from "../lib/authHelpers";
import { normalizePostcode } from "../lib/matching/guardianMatcher";
import { normalizePhoneNumber } from "../lib/phoneUtils";
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
  address2: v.optional(v.string()),
  town: v.optional(v.string()),
  county: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),
  verificationStatus: verificationStatusValidator,
  claimedAt: v.optional(v.number()),
  claimInvitedBy: v.optional(v.string()),
  playerWelcomedAt: v.optional(v.number()),
  importSessionId: v.optional(v.id("importSessions")),
  externalIds: v.optional(v.record(v.string(), v.string())),
  federationIds: v.optional(
    v.object({
      fai: v.optional(v.string()),
      irfu: v.optional(v.string()),
      gaa: v.optional(v.string()),
      other: v.optional(v.string()),
    })
  ),
  lastSyncedAt: v.optional(v.number()),
  lastSyncedData: v.optional(v.any()),
  isActive: v.optional(v.boolean()),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdFrom: v.optional(v.string()),
  normalizedFirstName: v.optional(v.string()),
  normalizedLastName: v.optional(v.string()),
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
 * Check if the current authenticated user has a player dashboard
 * (i.e., an adult player identity linked to their account)
 * Used for portal gating in the player layout
 */
export const hasPlayerDashboard = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const player = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();

    return player !== null && player.playerType === "adult";
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
    await requireAuth(ctx);
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
    await requireAuth(ctx);

    // Fetch the full Better Auth user so we can sync their profile to the player record
    const authUser = await authComponent.getAuthUser(ctx);

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

    // When the user self-upgrades, their Better Auth account is the source of truth
    // for userId and email. Explicit args override, then auth user, then existing record.
    const resolvedUserId = args.userId ?? authUser?._id ?? player.userId;
    const resolvedEmail =
      args.email?.toLowerCase().trim() ??
      authUser?.email?.toLowerCase().trim() ??
      player.email;
    const resolvedPhone =
      args.phone?.trim() ?? authUser?.phone?.trim() ?? player.phone;

    // 1. Update player to adult type, writing current user profile data
    await ctx.db.patch(args.playerIdentityId, {
      playerType: "adult",
      userId: resolvedUserId,
      email: resolvedEmail,
      phone: resolvedPhone,
      verificationStatus: resolvedUserId ? "self_verified" : "unverified",
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
        priority,
        notes: link.isPrimary ? "Former primary guardian" : undefined,
        createdAt: now,
        updatedAt: now,
      });
      priority += 1;
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
 * Update adult player's own profile — bidirectional sync with Better Auth user record
 */
export const updateMyProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    address2: v.optional(v.string()),
    town: v.optional(v.string()),
    county: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const player = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!player) {
      throw new Error("Player profile not found");
    }

    if (player.playerType !== "adult") {
      throw new Error("Only adult players can update their own profile");
    }

    const normalizedPhone = args.phone
      ? normalizePhoneNumber(args.phone)
      : undefined;
    const normalizedPostcode = args.postcode
      ? normalizePostcode(args.postcode)
      : undefined;

    // Build playerIdentity updates
    const playerUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.firstName !== undefined) {
      playerUpdates.firstName = args.firstName.trim();
    }
    if (args.lastName !== undefined) {
      playerUpdates.lastName = args.lastName.trim();
    }
    if (normalizedPhone !== undefined) {
      playerUpdates.phone = normalizedPhone;
    }
    if (args.address !== undefined) {
      playerUpdates.address = args.address.trim();
    }
    if (args.address2 !== undefined) {
      playerUpdates.address2 = args.address2.trim();
    }
    if (args.town !== undefined) {
      playerUpdates.town = args.town.trim();
    }
    if (args.county !== undefined) {
      playerUpdates.county = args.county.trim();
    }
    if (normalizedPostcode !== undefined) {
      playerUpdates.postcode = normalizedPostcode;
    }
    if (args.country !== undefined) {
      playerUpdates.country = args.country.trim();
    }

    await ctx.db.patch(player._id, playerUpdates);

    // Sync to Better Auth user record
    const userUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.firstName !== undefined) {
      userUpdates.firstName = args.firstName.trim();
    }
    if (args.lastName !== undefined) {
      userUpdates.lastName = args.lastName.trim();
    }
    if (args.firstName !== undefined || args.lastName !== undefined) {
      const newFirst =
        args.firstName?.trim() ??
        (user as Record<string, unknown>).firstName ??
        "";
      const newLast =
        args.lastName?.trim() ??
        (user as Record<string, unknown>).lastName ??
        "";
      userUpdates.name = `${newFirst} ${newLast}`.trim();
    }
    if (normalizedPhone !== undefined) {
      userUpdates.phone = normalizedPhone;
    }
    if (args.address !== undefined) {
      userUpdates.address = args.address.trim();
    }
    if (args.address2 !== undefined) {
      userUpdates.address2 = args.address2.trim();
    }
    if (args.town !== undefined) {
      userUpdates.town = args.town.trim();
    }
    if (args.county !== undefined) {
      userUpdates.county = args.county.trim();
    }
    if (normalizedPostcode !== undefined) {
      userUpdates.postcode = normalizedPostcode;
    }
    if (args.country !== undefined) {
      userUpdates.country = args.country.trim();
    }

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: user._id, operator: "eq" }],
        update: userUpdates,
      },
    });

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
    await requireAuth(ctx);
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
          priority,
          notes: link.isPrimary ? "Former primary guardian" : undefined,
          createdAt: now,
          updatedAt: now,
        });
        priority += 1;
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

/**
 * Internal version of claimYouthProfile — for use by other mutations (e.g. approveJoinRequest)
 */
export const claimYouthProfileInternal = internalMutation({
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

    const existingPlayer = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingPlayer) {
      throw new Error("User already has a player identity");
    }

    const age = calculateAge(player.dateOfBirth);

    if (age >= 18) {
      await ctx.db.patch(args.playerIdentityId, {
        playerType: "adult",
        userId: args.userId,
        email: args.email?.toLowerCase().trim(),
        verificationStatus: "self_verified",
        updatedAt: Date.now(),
      });

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
          priority,
          notes: link.isPrimary ? "Former primary guardian" : undefined,
          createdAt: now,
          updatedAt: now,
        });
        priority += 1;
      }

      return { success: true, transitioned: true };
    }

    await ctx.db.patch(args.playerIdentityId, {
      userId: args.userId,
      email: args.email?.toLowerCase().trim(),
      updatedAt: Date.now(),
    });

    return { success: true, transitioned: false };
  },
});

/**
 * Get today's health/wellness check for the current player
 * Stub returning null until Phase 3 creates the wellness table.
 * Returns object with wellnessScore (0–5) when implemented.
 */
export const getTodayHealthCheck = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.union(v.object({ wellnessScore: v.number() }), v.null()),
  handler: async (_ctx, _args) => null,
});

/**
 * Get today's priority data for the player dashboard Today section
 * Returns active injury count and first affected body part
 */
export const getTodayPriorityData = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.object({
    activeInjuryCount: v.number(),
    activeInjuryBodyPart: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const activeInjuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_status", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId).eq("status", "active")
      )
      .collect();

    const recoveringInjuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_status", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("status", "recovering")
      )
      .collect();

    // Apply org-level visibility rules: show injury if visible to all orgs,
    // or if this org is in the explicit allowlist
    const isVisibleToOrg = (injury: (typeof activeInjuries)[number]) =>
      injury.isVisibleToAllOrgs ||
      (injury.restrictedToOrgIds?.includes(args.organizationId) ?? false);

    const allActive = [...activeInjuries, ...recoveringInjuries].filter(
      isVisibleToOrg
    );

    return {
      activeInjuryCount: allActive.length,
      activeInjuryBodyPart: allActive[0]?.bodyPart ?? null,
    };
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
    default:
      return "Family";
  }
}
