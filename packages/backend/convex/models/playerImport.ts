import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { calculateAge } from "./playerIdentities";

// ============================================================
// PLAYER IMPORT WITH IDENTITY SYSTEM
// ============================================================
// This module provides import functionality that creates proper
// platform-level identities instead of org-scoped player records.
// ============================================================

const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("other")
);

/**
 * Import a single player using the identity system.
 *
 * This creates:
 * 1. A player identity (or finds existing by name + DOB)
 * 2. A guardian identity (if parent info provided)
 * 3. A guardian-player link (if guardian created)
 * 4. An org enrollment for the player
 *
 * Returns IDs of all created/found records.
 */
export const importPlayerWithIdentity = mutation({
  args: {
    // Player info (required)
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    gender: genderValidator,

    // Organization info (required)
    organizationId: v.string(),
    ageGroup: v.string(),
    season: v.string(),

    // Optional player info
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),

    // Optional guardian/parent info
    parentFirstName: v.optional(v.string()),
    parentLastName: v.optional(v.string()),
    parentEmail: v.optional(v.string()),
    parentPhone: v.optional(v.string()),
    parentRelationship: v.optional(
      v.union(
        v.literal("mother"),
        v.literal("father"),
        v.literal("guardian"),
        v.literal("grandparent"),
        v.literal("other")
      )
    ),
  },
  returns: v.object({
    playerIdentityId: v.id("playerIdentities"),
    playerWasCreated: v.boolean(),
    guardianIdentityId: v.optional(v.id("guardianIdentities")),
    guardianWasCreated: v.optional(v.boolean()),
    guardianLinkId: v.optional(v.id("guardianPlayerLinks")),
    enrollmentId: v.id("orgPlayerEnrollments"),
    enrollmentWasCreated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    // ========== 1. FIND OR CREATE PLAYER IDENTITY ==========

    // Try to find existing player by name + DOB
    const existingPlayer = await ctx.db
      .query("playerIdentities")
      .withIndex("by_name_dob", (q) =>
        q
          .eq("firstName", args.firstName.trim())
          .eq("lastName", args.lastName.trim())
          .eq("dateOfBirth", args.dateOfBirth)
      )
      .first();

    let playerIdentityId: typeof existingPlayer extends null
      ? never
      : NonNullable<typeof existingPlayer>["_id"];
    let playerWasCreated = false;

    if (existingPlayer) {
      playerIdentityId = existingPlayer._id;
    } else {
      // Create new player identity
      const playerType =
        calculateAge(args.dateOfBirth) >= 18 ? "adult" : "youth";

      playerIdentityId = await ctx.db.insert("playerIdentities", {
        firstName: args.firstName.trim(),
        lastName: args.lastName.trim(),
        dateOfBirth: args.dateOfBirth,
        gender: args.gender,
        playerType,
        address: args.address?.trim(),
        town: args.town?.trim(),
        postcode: args.postcode?.trim(),
        country: args.country?.trim(),
        verificationStatus: "unverified",
        createdAt: now,
        updatedAt: now,
        createdFrom: "import",
      });
      playerWasCreated = true;
    }

    // ========== 2. FIND OR CREATE GUARDIAN IDENTITY ==========

    let guardianIdentityId: Id<"guardianIdentities"> | undefined;
    let guardianWasCreated: boolean | undefined;
    let guardianLinkId: Id<"guardianPlayerLinks"> | undefined;

    // Only create guardian if we have at least name and email
    if (args.parentFirstName && args.parentLastName && args.parentEmail) {
      const normalizedEmail = args.parentEmail.toLowerCase().trim();

      // Try to find existing guardian by email
      const existingGuardian = await ctx.db
        .query("guardianIdentities")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .first();

      if (existingGuardian) {
        guardianIdentityId = existingGuardian._id;
        guardianWasCreated = false;
      } else {
        // Create new guardian identity
        guardianIdentityId = await ctx.db.insert("guardianIdentities", {
          firstName: args.parentFirstName.trim(),
          lastName: args.parentLastName.trim(),
          email: normalizedEmail,
          phone: args.parentPhone?.trim(),
          verificationStatus: "unverified",
          createdAt: now,
          updatedAt: now,
          createdFrom: "import",
        });
        guardianWasCreated = true;
      }

      // ========== 3. CREATE GUARDIAN-PLAYER LINK ==========

      // Check if link already exists
      const existingLink = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian_and_player", (q) =>
          q
            .eq("guardianIdentityId", guardianIdentityId!)
            .eq("playerIdentityId", playerIdentityId)
        )
        .first();

      if (existingLink) {
        guardianLinkId = existingLink._id;
      } else {
        // Check if this is the first guardian for this player
        const existingLinks = await ctx.db
          .query("guardianPlayerLinks")
          .withIndex("by_player", (q) =>
            q.eq("playerIdentityId", playerIdentityId)
          )
          .collect();

        const isPrimary = existingLinks.length === 0;

        guardianLinkId = await ctx.db.insert("guardianPlayerLinks", {
          guardianIdentityId: guardianIdentityId!,
          playerIdentityId,
          relationship: args.parentRelationship ?? "guardian",
          isPrimary,
          hasParentalResponsibility: true,
          canCollectFromTraining: true,
          consentedToSharing: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // ========== 4. FIND OR CREATE ORG ENROLLMENT ==========

    // Check if player is already enrolled in this org
    const existingEnrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    let enrollmentId: Id<"orgPlayerEnrollments">;
    let enrollmentWasCreated = false;

    if (existingEnrollment) {
      enrollmentId = existingEnrollment._id;
      // Optionally update the enrollment with new data
      await ctx.db.patch(existingEnrollment._id, {
        ageGroup: args.ageGroup,
        season: args.season,
        updatedAt: now,
      });
    } else {
      // Create new enrollment
      enrollmentId = await ctx.db.insert("orgPlayerEnrollments", {
        playerIdentityId,
        organizationId: args.organizationId,
        ageGroup: args.ageGroup,
        season: args.season,
        status: "active",
        enrolledAt: now,
        updatedAt: now,
      });
      enrollmentWasCreated = true;
    }

    return {
      playerIdentityId,
      playerWasCreated,
      guardianIdentityId,
      guardianWasCreated,
      guardianLinkId,
      enrollmentId,
      enrollmentWasCreated,
    };
  },
});

/**
 * Batch import multiple players using the identity system.
 *
 * More efficient than calling importPlayerWithIdentity multiple times.
 */
export const batchImportPlayersWithIdentity = mutation({
  args: {
    organizationId: v.string(),
    players: v.array(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        dateOfBirth: v.string(),
        gender: genderValidator,
        ageGroup: v.string(),
        season: v.string(),
        address: v.optional(v.string()),
        town: v.optional(v.string()),
        postcode: v.optional(v.string()),
        country: v.optional(v.string()),
        parentFirstName: v.optional(v.string()),
        parentLastName: v.optional(v.string()),
        parentEmail: v.optional(v.string()),
        parentPhone: v.optional(v.string()),
        parentRelationship: v.optional(
          v.union(
            v.literal("mother"),
            v.literal("father"),
            v.literal("guardian"),
            v.literal("grandparent"),
            v.literal("other")
          )
        ),
      })
    ),
  },
  returns: v.object({
    totalProcessed: v.number(),
    playersCreated: v.number(),
    playersReused: v.number(),
    guardiansCreated: v.number(),
    guardiansReused: v.number(),
    enrollmentsCreated: v.number(),
    enrollmentsReused: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const results = {
      totalProcessed: 0,
      playersCreated: 0,
      playersReused: 0,
      guardiansCreated: 0,
      guardiansReused: 0,
      enrollmentsCreated: 0,
      enrollmentsReused: 0,
      errors: [] as string[],
    };

    const now = Date.now();

    for (const playerData of args.players) {
      try {
        // ========== 1. FIND OR CREATE PLAYER IDENTITY ==========

        const existingPlayer = await ctx.db
          .query("playerIdentities")
          .withIndex("by_name_dob", (q) =>
            q
              .eq("firstName", playerData.firstName.trim())
              .eq("lastName", playerData.lastName.trim())
              .eq("dateOfBirth", playerData.dateOfBirth)
          )
          .first();

        let playerIdentityId: NonNullable<typeof existingPlayer>["_id"];

        if (existingPlayer) {
          playerIdentityId = existingPlayer._id;
          results.playersReused++;
        } else {
          const playerType =
            calculateAge(playerData.dateOfBirth) >= 18 ? "adult" : "youth";

          playerIdentityId = await ctx.db.insert("playerIdentities", {
            firstName: playerData.firstName.trim(),
            lastName: playerData.lastName.trim(),
            dateOfBirth: playerData.dateOfBirth,
            gender: playerData.gender,
            playerType,
            address: playerData.address?.trim(),
            town: playerData.town?.trim(),
            postcode: playerData.postcode?.trim(),
            country: playerData.country?.trim(),
            verificationStatus: "unverified",
            createdAt: now,
            updatedAt: now,
            createdFrom: "import",
          });
          results.playersCreated++;
        }

        // ========== 2. FIND OR CREATE GUARDIAN IDENTITY ==========

        if (
          playerData.parentFirstName &&
          playerData.parentLastName &&
          playerData.parentEmail
        ) {
          const normalizedEmail = playerData.parentEmail.toLowerCase().trim();

          const existingGuardian = await ctx.db
            .query("guardianIdentities")
            .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
            .first();

          let guardianIdentityId: NonNullable<typeof existingGuardian>["_id"];

          if (existingGuardian) {
            guardianIdentityId = existingGuardian._id;
            results.guardiansReused++;
          } else {
            guardianIdentityId = await ctx.db.insert("guardianIdentities", {
              firstName: playerData.parentFirstName.trim(),
              lastName: playerData.parentLastName.trim(),
              email: normalizedEmail,
              phone: playerData.parentPhone?.trim(),
              verificationStatus: "unverified",
              createdAt: now,
              updatedAt: now,
              createdFrom: "import",
            });
            results.guardiansCreated++;
          }

          // ========== 3. CREATE GUARDIAN-PLAYER LINK ==========

          const existingLink = await ctx.db
            .query("guardianPlayerLinks")
            .withIndex("by_guardian_and_player", (q) =>
              q
                .eq("guardianIdentityId", guardianIdentityId)
                .eq("playerIdentityId", playerIdentityId)
            )
            .first();

          if (!existingLink) {
            const existingLinks = await ctx.db
              .query("guardianPlayerLinks")
              .withIndex("by_player", (q) =>
                q.eq("playerIdentityId", playerIdentityId)
              )
              .collect();

            const isPrimary = existingLinks.length === 0;

            await ctx.db.insert("guardianPlayerLinks", {
              guardianIdentityId,
              playerIdentityId,
              relationship: playerData.parentRelationship ?? "guardian",
              isPrimary,
              hasParentalResponsibility: true,
              canCollectFromTraining: true,
              consentedToSharing: true,
              createdAt: now,
              updatedAt: now,
            });
          }
        }

        // ========== 4. FIND OR CREATE ORG ENROLLMENT ==========

        const existingEnrollment = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", playerIdentityId)
              .eq("organizationId", args.organizationId)
          )
          .first();

        if (existingEnrollment) {
          await ctx.db.patch(existingEnrollment._id, {
            ageGroup: playerData.ageGroup,
            season: playerData.season,
            updatedAt: now,
          });
          results.enrollmentsReused++;
        } else {
          await ctx.db.insert("orgPlayerEnrollments", {
            playerIdentityId,
            organizationId: args.organizationId,
            ageGroup: playerData.ageGroup,
            season: playerData.season,
            status: "active",
            enrolledAt: now,
            updatedAt: now,
          });
          results.enrollmentsCreated++;
        }

        results.totalProcessed++;
      } catch (error) {
        results.errors.push(
          `${playerData.firstName} ${playerData.lastName}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return results;
  },
});
