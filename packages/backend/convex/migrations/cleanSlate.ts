import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

// ============================================================
// CLEAN SLATE MIGRATION
// ============================================================
// This migration clears legacy player data and test data from
// identity tables to prepare for fresh data entry.
//
// Legacy tables to clean:
// - players (old org-scoped player data)
// - teamPlayers (team-player links)
// - injuries (old injury records)
// - developmentGoals (old development goals)
//
// New identity tables to clean (test data only):
// - playerIdentities
// - guardianIdentities
// - guardianPlayerLinks
// - orgPlayerEnrollments
// - orgGuardianProfiles
// - playerEmergencyContacts
// ============================================================

/**
 * Get counts of all data before migration
 */
export const getPreMigrationCounts = internalQuery({
  args: {},
  returns: v.object({
    legacy: v.object({
      players: v.number(),
      teamPlayers: v.number(),
      injuries: v.number(),
      developmentGoals: v.number(),
    }),
    identity: v.object({
      playerIdentities: v.number(),
      guardianIdentities: v.number(),
      guardianPlayerLinks: v.number(),
      orgPlayerEnrollments: v.number(),
      orgGuardianProfiles: v.number(),
      playerEmergencyContacts: v.number(),
    }),
    reference: v.object({
      sports: v.number(),
      ageGroups: v.number(),
      skillCategories: v.number(),
      skillDefinitions: v.number(),
    }),
  }),
  handler: async (ctx) => {
    // Count legacy tables
    const players = await ctx.db.query("players").collect();
    const teamPlayers = await ctx.db.query("teamPlayers").collect();
    const injuries = await ctx.db.query("injuries").collect();
    const developmentGoals = await ctx.db.query("developmentGoals").collect();

    // Count identity tables
    const playerIdentities = await ctx.db.query("playerIdentities").collect();
    const guardianIdentities = await ctx.db
      .query("guardianIdentities")
      .collect();
    const guardianPlayerLinks = await ctx.db
      .query("guardianPlayerLinks")
      .collect();
    const orgPlayerEnrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .collect();
    const orgGuardianProfiles = await ctx.db
      .query("orgGuardianProfiles")
      .collect();
    const playerEmergencyContacts = await ctx.db
      .query("playerEmergencyContacts")
      .collect();

    // Count reference tables (should be preserved)
    const sports = await ctx.db.query("sports").collect();
    const ageGroups = await ctx.db.query("ageGroups").collect();
    const skillCategories = await ctx.db.query("skillCategories").collect();
    const skillDefinitions = await ctx.db.query("skillDefinitions").collect();

    return {
      legacy: {
        players: players.length,
        teamPlayers: teamPlayers.length,
        injuries: injuries.length,
        developmentGoals: developmentGoals.length,
      },
      identity: {
        playerIdentities: playerIdentities.length,
        guardianIdentities: guardianIdentities.length,
        guardianPlayerLinks: guardianPlayerLinks.length,
        orgPlayerEnrollments: orgPlayerEnrollments.length,
        orgGuardianProfiles: orgGuardianProfiles.length,
        playerEmergencyContacts: playerEmergencyContacts.length,
      },
      reference: {
        sports: sports.length,
        ageGroups: ageGroups.length,
        skillCategories: skillCategories.length,
        skillDefinitions: skillDefinitions.length,
      },
    };
  },
});

/**
 * Clean all legacy player data
 */
export const cleanLegacyData = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  returns: v.object({
    dryRun: v.boolean(),
    deleted: v.object({
      players: v.number(),
      teamPlayers: v.number(),
      injuries: v.number(),
      developmentGoals: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const deleted = {
      players: 0,
      teamPlayers: 0,
      injuries: 0,
      developmentGoals: 0,
    };

    // Delete teamPlayers first (references players)
    const teamPlayers = await ctx.db.query("teamPlayers").collect();
    for (const tp of teamPlayers) {
      if (!dryRun) {
        await ctx.db.delete(tp._id);
      }
      deleted.teamPlayers++;
    }

    // Delete injuries (references players)
    const injuries = await ctx.db.query("injuries").collect();
    for (const injury of injuries) {
      if (!dryRun) {
        await ctx.db.delete(injury._id);
      }
      deleted.injuries++;
    }

    // Delete developmentGoals (references players)
    const goals = await ctx.db.query("developmentGoals").collect();
    for (const goal of goals) {
      if (!dryRun) {
        await ctx.db.delete(goal._id);
      }
      deleted.developmentGoals++;
    }

    // Delete players
    const players = await ctx.db.query("players").collect();
    for (const player of players) {
      if (!dryRun) {
        await ctx.db.delete(player._id);
      }
      deleted.players++;
    }

    return { dryRun, deleted };
  },
});

/**
 * Clean all identity test data (preserves reference data)
 */
export const cleanIdentityTestData = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  returns: v.object({
    dryRun: v.boolean(),
    deleted: v.object({
      playerEmergencyContacts: v.number(),
      orgPlayerEnrollments: v.number(),
      guardianPlayerLinks: v.number(),
      orgGuardianProfiles: v.number(),
      playerIdentities: v.number(),
      guardianIdentities: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const deleted = {
      playerEmergencyContacts: 0,
      orgPlayerEnrollments: 0,
      guardianPlayerLinks: 0,
      orgGuardianProfiles: 0,
      playerIdentities: 0,
      guardianIdentities: 0,
    };

    // Delete in order of dependencies (children first)

    // 1. Player emergency contacts
    const emergencyContacts = await ctx.db
      .query("playerEmergencyContacts")
      .collect();
    for (const contact of emergencyContacts) {
      if (!dryRun) {
        await ctx.db.delete(contact._id);
      }
      deleted.playerEmergencyContacts++;
    }

    // 2. Org player enrollments
    const enrollments = await ctx.db.query("orgPlayerEnrollments").collect();
    for (const enrollment of enrollments) {
      if (!dryRun) {
        await ctx.db.delete(enrollment._id);
      }
      deleted.orgPlayerEnrollments++;
    }

    // 3. Guardian-player links
    const links = await ctx.db.query("guardianPlayerLinks").collect();
    for (const link of links) {
      if (!dryRun) {
        await ctx.db.delete(link._id);
      }
      deleted.guardianPlayerLinks++;
    }

    // 4. Org guardian profiles
    const profiles = await ctx.db.query("orgGuardianProfiles").collect();
    for (const profile of profiles) {
      if (!dryRun) {
        await ctx.db.delete(profile._id);
      }
      deleted.orgGuardianProfiles++;
    }

    // 5. Player identities
    const players = await ctx.db.query("playerIdentities").collect();
    for (const player of players) {
      if (!dryRun) {
        await ctx.db.delete(player._id);
      }
      deleted.playerIdentities++;
    }

    // 6. Guardian identities
    const guardians = await ctx.db.query("guardianIdentities").collect();
    for (const guardian of guardians) {
      if (!dryRun) {
        await ctx.db.delete(guardian._id);
      }
      deleted.guardianIdentities++;
    }

    return { dryRun, deleted };
  },
});

/**
 * Full clean slate migration - clears both legacy and identity test data
 */
export const runCleanSlateMigration = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  returns: v.object({
    dryRun: v.boolean(),
    legacy: v.object({
      players: v.number(),
      teamPlayers: v.number(),
      injuries: v.number(),
      developmentGoals: v.number(),
    }),
    identity: v.object({
      playerEmergencyContacts: v.number(),
      orgPlayerEnrollments: v.number(),
      guardianPlayerLinks: v.number(),
      orgGuardianProfiles: v.number(),
      playerIdentities: v.number(),
      guardianIdentities: v.number(),
    }),
    referenceDataPreserved: v.object({
      sports: v.number(),
      ageGroups: v.number(),
      skillCategories: v.number(),
      skillDefinitions: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;

    // Track deletions
    const legacy = {
      players: 0,
      teamPlayers: 0,
      injuries: 0,
      developmentGoals: 0,
    };
    const identity = {
      playerEmergencyContacts: 0,
      orgPlayerEnrollments: 0,
      guardianPlayerLinks: 0,
      orgGuardianProfiles: 0,
      playerIdentities: 0,
      guardianIdentities: 0,
    };

    // ========== CLEAN LEGACY DATA ==========

    // Delete teamPlayers first (references players)
    const teamPlayers = await ctx.db.query("teamPlayers").collect();
    for (const tp of teamPlayers) {
      if (!dryRun) {
        await ctx.db.delete(tp._id);
      }
      legacy.teamPlayers++;
    }

    // Delete injuries (references players)
    const injuries = await ctx.db.query("injuries").collect();
    for (const injury of injuries) {
      if (!dryRun) {
        await ctx.db.delete(injury._id);
      }
      legacy.injuries++;
    }

    // Delete developmentGoals (references players)
    const goals = await ctx.db.query("developmentGoals").collect();
    for (const goal of goals) {
      if (!dryRun) {
        await ctx.db.delete(goal._id);
      }
      legacy.developmentGoals++;
    }

    // Delete players
    const players = await ctx.db.query("players").collect();
    for (const player of players) {
      if (!dryRun) {
        await ctx.db.delete(player._id);
      }
      legacy.players++;
    }

    // ========== CLEAN IDENTITY TEST DATA ==========

    // 1. Player emergency contacts
    const emergencyContacts = await ctx.db
      .query("playerEmergencyContacts")
      .collect();
    for (const contact of emergencyContacts) {
      if (!dryRun) {
        await ctx.db.delete(contact._id);
      }
      identity.playerEmergencyContacts++;
    }

    // 2. Org player enrollments
    const enrollments = await ctx.db.query("orgPlayerEnrollments").collect();
    for (const enrollment of enrollments) {
      if (!dryRun) {
        await ctx.db.delete(enrollment._id);
      }
      identity.orgPlayerEnrollments++;
    }

    // 3. Guardian-player links
    const links = await ctx.db.query("guardianPlayerLinks").collect();
    for (const link of links) {
      if (!dryRun) {
        await ctx.db.delete(link._id);
      }
      identity.guardianPlayerLinks++;
    }

    // 4. Org guardian profiles
    const profiles = await ctx.db.query("orgGuardianProfiles").collect();
    for (const profile of profiles) {
      if (!dryRun) {
        await ctx.db.delete(profile._id);
      }
      identity.orgGuardianProfiles++;
    }

    // 5. Player identities
    const playerIdentities = await ctx.db.query("playerIdentities").collect();
    for (const player of playerIdentities) {
      if (!dryRun) {
        await ctx.db.delete(player._id);
      }
      identity.playerIdentities++;
    }

    // 6. Guardian identities
    const guardians = await ctx.db.query("guardianIdentities").collect();
    for (const guardian of guardians) {
      if (!dryRun) {
        await ctx.db.delete(guardian._id);
      }
      identity.guardianIdentities++;
    }

    // ========== VERIFY REFERENCE DATA PRESERVED ==========

    const sports = await ctx.db.query("sports").collect();
    const ageGroups = await ctx.db.query("ageGroups").collect();
    const skillCategories = await ctx.db.query("skillCategories").collect();
    const skillDefinitions = await ctx.db.query("skillDefinitions").collect();

    return {
      dryRun,
      legacy,
      identity,
      referenceDataPreserved: {
        sports: sports.length,
        ageGroups: ageGroups.length,
        skillCategories: skillCategories.length,
        skillDefinitions: skillDefinitions.length,
      },
    };
  },
});

/**
 * Verify clean slate - ensure all data is cleared except reference data
 */
export const verifyCleanSlate = internalQuery({
  args: {},
  returns: v.object({
    isClean: v.boolean(),
    legacy: v.object({
      players: v.number(),
      teamPlayers: v.number(),
      injuries: v.number(),
      developmentGoals: v.number(),
    }),
    identity: v.object({
      playerIdentities: v.number(),
      guardianIdentities: v.number(),
      guardianPlayerLinks: v.number(),
      orgPlayerEnrollments: v.number(),
      orgGuardianProfiles: v.number(),
      playerEmergencyContacts: v.number(),
    }),
    referenceDataIntact: v.boolean(),
  }),
  handler: async (ctx) => {
    // Check legacy tables are empty
    const players = await ctx.db.query("players").collect();
    const teamPlayers = await ctx.db.query("teamPlayers").collect();
    const injuries = await ctx.db.query("injuries").collect();
    const developmentGoals = await ctx.db.query("developmentGoals").collect();

    // Check identity tables are empty
    const playerIdentities = await ctx.db.query("playerIdentities").collect();
    const guardianIdentities = await ctx.db
      .query("guardianIdentities")
      .collect();
    const guardianPlayerLinks = await ctx.db
      .query("guardianPlayerLinks")
      .collect();
    const orgPlayerEnrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .collect();
    const orgGuardianProfiles = await ctx.db
      .query("orgGuardianProfiles")
      .collect();
    const playerEmergencyContacts = await ctx.db
      .query("playerEmergencyContacts")
      .collect();

    // Check reference data is intact
    const sports = await ctx.db.query("sports").collect();
    const ageGroups = await ctx.db.query("ageGroups").collect();
    const skillCategories = await ctx.db.query("skillCategories").collect();
    const skillDefinitions = await ctx.db.query("skillDefinitions").collect();

    const legacyClean =
      players.length === 0 &&
      teamPlayers.length === 0 &&
      injuries.length === 0 &&
      developmentGoals.length === 0;

    const identityClean =
      playerIdentities.length === 0 &&
      guardianIdentities.length === 0 &&
      guardianPlayerLinks.length === 0 &&
      orgPlayerEnrollments.length === 0 &&
      orgGuardianProfiles.length === 0 &&
      playerEmergencyContacts.length === 0;

    const referenceDataIntact =
      sports.length > 0 &&
      ageGroups.length > 0 &&
      skillCategories.length > 0 &&
      skillDefinitions.length > 0;

    return {
      isClean: legacyClean && identityClean,
      legacy: {
        players: players.length,
        teamPlayers: teamPlayers.length,
        injuries: injuries.length,
        developmentGoals: developmentGoals.length,
      },
      identity: {
        playerIdentities: playerIdentities.length,
        guardianIdentities: guardianIdentities.length,
        guardianPlayerLinks: guardianPlayerLinks.length,
        orgPlayerEnrollments: orgPlayerEnrollments.length,
        orgGuardianProfiles: orgGuardianProfiles.length,
        playerEmergencyContacts: playerEmergencyContacts.length,
      },
      referenceDataIntact,
    };
  },
});
