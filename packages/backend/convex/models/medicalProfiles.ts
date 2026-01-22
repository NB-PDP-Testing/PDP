import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============ VALIDATORS ============

// Note: medicalProfiles.playerId still references old "players" table
// This is a compatibility layer - we query playerIdentities but store with players FK
const medicalProfileValidator = v.object({
  _id: v.id("medicalProfiles"),
  _creationTime: v.number(),
  playerId: v.optional(v.id("players")), // Made optional for legacy data compatibility
  playerIdentityId: v.optional(v.string()), // Legacy field - will be removed after prod cleanup
  bloodType: v.optional(v.string()),
  allergies: v.array(v.string()),
  medications: v.array(v.string()),
  conditions: v.array(v.string()),
  doctorName: v.optional(v.string()),
  doctorPhone: v.optional(v.string()),
  emergencyContact1Name: v.string(),
  emergencyContact1Phone: v.string(),
  emergencyContact2Name: v.optional(v.string()),
  emergencyContact2Phone: v.optional(v.string()),
  lastMedicalCheck: v.optional(v.string()),
  insuranceCovered: v.boolean(),
  notes: v.optional(v.string()),
  createdAt: v.optional(v.number()), // Legacy field - will be removed after prod cleanup
  updatedAt: v.optional(v.number()), // Legacy field - will be removed after prod cleanup
});

// ============ QUERIES ============

/**
 * Get medical profile by player ID (legacy players table)
 */
export const getByPlayerId = query({
  args: { playerId: v.id("players") },
  returns: v.union(medicalProfileValidator, v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("medicalProfiles")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first(),
});

/**
 * Get medical profile by player identity ID (NEW system)
 * Finds the legacy player record and returns its medical profile
 */
export const getByPlayerIdentityId = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.union(medicalProfileValidator, v.null()),
  handler: async (ctx, args) => {
    // Get player identity
    const playerIdentity = await ctx.db.get(args.playerIdentityId);
    if (!playerIdentity) {
      return null;
    }

    // Find legacy player record by matching name in the same org
    const fullName = `${playerIdentity.firstName} ${playerIdentity.lastName}`;
    const legacyPlayer = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("name"), fullName))
      .first();

    if (!legacyPlayer) {
      return null;
    }

    // Get medical profile for legacy player
    return await ctx.db
      .query("medicalProfiles")
      .withIndex("by_playerId", (q) => q.eq("playerId", legacyPlayer._id))
      .first();
  },
});

/**
 * Get all players for an organization using the NEW identity system
 * Returns players from playerIdentities + orgPlayerEnrollments
 */
export const getAllForOrganization = query({
  args: { organizationId: v.string() },
  returns: v.array(
    v.object({
      profile: v.union(medicalProfileValidator, v.null()),
      player: v.object({
        _id: v.id("playerIdentities"),
        name: v.string(),
        ageGroup: v.string(),
        sport: v.string(),
        dateOfBirth: v.optional(v.string()),
      }),
      hasProfile: v.boolean(),
      hasAllergies: v.boolean(),
      hasMedications: v.boolean(),
      hasConditions: v.boolean(),
      // Legacy player ID for medical profile linking
      legacyPlayerId: v.union(v.id("players"), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    // Get all enrollments for this organization (NEW identity system)
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Get player details for each enrollment
    const results = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Get player identity
        const playerIdentity = await ctx.db.get(enrollment.playerIdentityId);
        if (!playerIdentity) {
          return null;
        }

        // Get sport passport for sport info
        const passport = await ctx.db
          .query("sportPassports")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", enrollment.playerIdentityId)
          )
          .first();

        // Try to find a legacy player record (for medical profile linking)
        // Look for a player with matching name in the same org
        const fullName = `${playerIdentity.firstName} ${playerIdentity.lastName}`;
        const legacyPlayer = await ctx.db
          .query("players")
          .withIndex("by_organizationId", (q) =>
            q.eq("organizationId", args.organizationId)
          )
          .filter((q) => q.eq(q.field("name"), fullName))
          .first();

        // Get medical profile if legacy player exists
        let profile = null;
        if (legacyPlayer) {
          profile = await ctx.db
            .query("medicalProfiles")
            .withIndex("by_playerId", (q) => q.eq("playerId", legacyPlayer._id))
            .first();
        }

        return {
          profile,
          player: {
            _id: playerIdentity._id,
            name: fullName,
            ageGroup: enrollment.ageGroup,
            sport: passport?.sportCode || "Not assigned",
            dateOfBirth: playerIdentity.dateOfBirth,
          },
          hasProfile: !!profile,
          hasAllergies: (profile?.allergies?.length ?? 0) > 0,
          hasMedications: (profile?.medications?.length ?? 0) > 0,
          hasConditions: (profile?.conditions?.length ?? 0) > 0,
          legacyPlayerId: legacyPlayer?._id ?? null,
        };
      })
    );

    // Filter out nulls (players that don't exist)
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

/**
 * Get medical profile statistics for dashboard
 */
export const getOrganizationStats = query({
  args: { organizationId: v.string() },
  returns: v.object({
    totalPlayers: v.number(),
    playersWithProfiles: v.number(),
    playersWithAllergies: v.number(),
    playersWithMedications: v.number(),
    playersWithConditions: v.number(),
    playersWithoutEmergencyContacts: v.number(),
    profileCompletionRate: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get all enrollments for this organization (NEW identity system)
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    let playersWithProfiles = 0;
    let playersWithAllergies = 0;
    let playersWithMedications = 0;
    let playersWithConditions = 0;
    let playersWithoutEmergencyContacts = 0;

    for (const enrollment of enrollments) {
      const playerIdentity = await ctx.db.get(enrollment.playerIdentityId);
      if (!playerIdentity) {
        continue;
      }

      // Try to find legacy player for medical profile
      const fullName = `${playerIdentity.firstName} ${playerIdentity.lastName}`;
      const legacyPlayer = await ctx.db
        .query("players")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .filter((q) => q.eq(q.field("name"), fullName))
        .first();

      let profile = null;
      if (legacyPlayer) {
        profile = await ctx.db
          .query("medicalProfiles")
          .withIndex("by_playerId", (q) => q.eq("playerId", legacyPlayer._id))
          .first();
      }

      if (profile) {
        playersWithProfiles += 1;
        if (profile.allergies.length > 0) {
          playersWithAllergies += 1;
        }
        if (profile.medications.length > 0) {
          playersWithMedications += 1;
        }
        if (profile.conditions.length > 0) {
          playersWithConditions += 1;
        }
        if (!profile.emergencyContact1Name) {
          playersWithoutEmergencyContacts += 1;
        }
      } else {
        playersWithoutEmergencyContacts += 1;
      }
    }

    const totalPlayers = enrollments.length;

    return {
      totalPlayers,
      playersWithProfiles,
      playersWithAllergies,
      playersWithMedications,
      playersWithConditions,
      playersWithoutEmergencyContacts,
      profileCompletionRate:
        totalPlayers > 0
          ? Math.round((playersWithProfiles / totalPlayers) * 100)
          : 0,
    };
  },
});

// ============ MUTATIONS ============

/**
 * Create or get a legacy player record for medical profile linking
 * This is needed because medicalProfiles references the old players table
 */
export const ensureLegacyPlayer = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    ageGroup: v.string(),
    sport: v.string(),
  },
  returns: v.id("players"),
  handler: async (ctx, args) => {
    // Get player identity
    const playerIdentity = await ctx.db.get(args.playerIdentityId);
    if (!playerIdentity) {
      throw new Error("Player identity not found");
    }

    const fullName = `${playerIdentity.firstName} ${playerIdentity.lastName}`;

    // Check if legacy player exists
    const existing = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("name"), fullName))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create legacy player record
    const playerId = await ctx.db.insert("players", {
      name: fullName,
      ageGroup: args.ageGroup,
      sport: args.sport,
      gender: playerIdentity.gender,
      organizationId: args.organizationId,
      season: new Date().getFullYear().toString(),
      skills: {},
      createdFrom: "identity_system",
      dateOfBirth: playerIdentity.dateOfBirth,
    });

    return playerId;
  },
});

/**
 * Create a new medical profile
 */
export const create = mutation({
  args: {
    playerId: v.id("players"),
    bloodType: v.optional(v.string()),
    allergies: v.array(v.string()),
    medications: v.array(v.string()),
    conditions: v.array(v.string()),
    doctorName: v.optional(v.string()),
    doctorPhone: v.optional(v.string()),
    emergencyContact1Name: v.string(),
    emergencyContact1Phone: v.string(),
    emergencyContact2Name: v.optional(v.string()),
    emergencyContact2Phone: v.optional(v.string()),
    lastMedicalCheck: v.optional(v.string()),
    insuranceCovered: v.boolean(),
    notes: v.optional(v.string()),
  },
  returns: v.id("medicalProfiles"),
  handler: async (ctx, args) => {
    // Check if profile already exists
    const existing = await ctx.db
      .query("medicalProfiles")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();

    if (existing) {
      throw new Error("Medical profile already exists for this player");
    }

    return await ctx.db.insert("medicalProfiles", args);
  },
});

/**
 * Update an existing medical profile
 */
export const update = mutation({
  args: {
    profileId: v.id("medicalProfiles"),
    bloodType: v.optional(v.string()),
    allergies: v.optional(v.array(v.string())),
    medications: v.optional(v.array(v.string())),
    conditions: v.optional(v.array(v.string())),
    doctorName: v.optional(v.string()),
    doctorPhone: v.optional(v.string()),
    emergencyContact1Name: v.optional(v.string()),
    emergencyContact1Phone: v.optional(v.string()),
    emergencyContact2Name: v.optional(v.string()),
    emergencyContact2Phone: v.optional(v.string()),
    lastMedicalCheck: v.optional(v.string()),
    insuranceCovered: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profileId, ...updates } = args;

    const existing = await ctx.db.get(profileId);
    if (!existing) {
      throw new Error("Medical profile not found");
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    await ctx.db.patch(profileId, updateData);
    return null;
  },
});

/**
 * Delete a medical profile
 */
export const remove = mutation({
  args: { profileId: v.id("medicalProfiles") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.profileId);
    if (!existing) {
      throw new Error("Medical profile not found");
    }

    await ctx.db.delete(args.profileId);
    return null;
  },
});

/**
 * Upsert medical profile using playerIdentityId (NEW system)
 * Automatically creates/finds legacy player record for FK
 */
export const upsertForIdentity = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    ageGroup: v.string(),
    sport: v.string(),
    bloodType: v.optional(v.string()),
    allergies: v.array(v.string()),
    medications: v.array(v.string()),
    conditions: v.array(v.string()),
    doctorName: v.optional(v.string()),
    doctorPhone: v.optional(v.string()),
    emergencyContact1Name: v.string(),
    emergencyContact1Phone: v.string(),
    emergencyContact2Name: v.optional(v.string()),
    emergencyContact2Phone: v.optional(v.string()),
    lastMedicalCheck: v.optional(v.string()),
    insuranceCovered: v.boolean(),
    notes: v.optional(v.string()),
  },
  returns: v.object({
    profileId: v.id("medicalProfiles"),
    wasCreated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const {
      playerIdentityId,
      organizationId,
      ageGroup,
      sport,
      ...profileData
    } = args;

    // Get player identity
    const playerIdentity = await ctx.db.get(playerIdentityId);
    if (!playerIdentity) {
      throw new Error("Player identity not found");
    }

    const fullName = `${playerIdentity.firstName} ${playerIdentity.lastName}`;

    // Find or create legacy player record
    let legacyPlayer = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .filter((q) => q.eq(q.field("name"), fullName))
      .first();

    if (!legacyPlayer) {
      // Create legacy player record
      const playerId = await ctx.db.insert("players", {
        name: fullName,
        ageGroup,
        sport,
        gender: playerIdentity.gender,
        organizationId,
        season: new Date().getFullYear().toString(),
        skills: {},
        createdFrom: "identity_system",
        dateOfBirth: playerIdentity.dateOfBirth,
      });
      legacyPlayer = await ctx.db.get(playerId);
    }

    if (!legacyPlayer) {
      throw new Error("Failed to create legacy player record");
    }

    // Check if profile exists
    const existing = await ctx.db
      .query("medicalProfiles")
      .withIndex("by_playerId", (q) => q.eq("playerId", legacyPlayer._id))
      .first();

    if (existing) {
      // Update existing profile
      await ctx.db.patch(existing._id, profileData);
      return { profileId: existing._id, wasCreated: false };
    }

    // Create new profile
    const profileId = await ctx.db.insert("medicalProfiles", {
      playerId: legacyPlayer._id,
      ...profileData,
    });
    return { profileId, wasCreated: true };
  },
});

/**
 * Legacy upsert using players table ID
 */
export const upsert = mutation({
  args: {
    playerId: v.id("players"),
    bloodType: v.optional(v.string()),
    allergies: v.array(v.string()),
    medications: v.array(v.string()),
    conditions: v.array(v.string()),
    doctorName: v.optional(v.string()),
    doctorPhone: v.optional(v.string()),
    emergencyContact1Name: v.string(),
    emergencyContact1Phone: v.string(),
    emergencyContact2Name: v.optional(v.string()),
    emergencyContact2Phone: v.optional(v.string()),
    lastMedicalCheck: v.optional(v.string()),
    insuranceCovered: v.boolean(),
    notes: v.optional(v.string()),
  },
  returns: v.object({
    profileId: v.id("medicalProfiles"),
    wasCreated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Check if profile exists
    const existing = await ctx.db
      .query("medicalProfiles")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();

    if (existing) {
      // Update existing profile
      const { playerId: _playerId, ...updates } = args;
      await ctx.db.patch(existing._id, updates);
      return { profileId: existing._id, wasCreated: false };
    }

    // Create new profile
    const profileId = await ctx.db.insert("medicalProfiles", args);
    return { profileId, wasCreated: true };
  },
});
