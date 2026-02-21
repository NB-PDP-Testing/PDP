import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
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

// ============================================================
// QUERIES
// ============================================================

/**
 * Get comprehensive guardian-player relationship data for an organization
 * Includes guardian verification status, user account info, and player details
 */
export const getGuardianRelationshipsForOrg = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all players enrolled in this org
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const results = [];

    for (const enrollment of enrollments) {
      // Get player identity
      const player = await ctx.db.get(enrollment.playerIdentityId);
      if (!player) {
        continue;
      }

      // Get guardian links for this player
      const guardianLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) => q.eq("playerIdentityId", player._id))
        .collect();

      // Get guardian details for each link
      const guardians = [];
      for (const link of guardianLinks) {
        const guardian = await ctx.db.get(link.guardianIdentityId);
        if (!guardian) {
          continue;
        }

        // Check if guardian has a user account
        let userAccount = null;
        if (guardian.userId) {
          // Guardian has claimed their account
          userAccount = {
            userId: guardian.userId,
            hasAccount: true,
            claimedAt: guardian.updatedAt, // Approximate
          };
        }

        guardians.push({
          guardianId: guardian._id,
          linkId: link._id,
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          email: guardian.email,
          phone: guardian.phone,
          relationship: link.relationship,
          isPrimary: link.isPrimary,
          verificationStatus: guardian.verificationStatus,
          userAccount,
          declinedByUserId: link.declinedByUserId,
          createdAt: guardian.createdAt,
        });
      }

      results.push({
        playerId: player._id,
        playerName: `${player.firstName} ${player.lastName}`,
        playerFirstName: player.firstName,
        playerLastName: player.lastName,
        dateOfBirth: player.dateOfBirth,
        ageGroup: enrollment.ageGroup,
        guardians,
        guardianCount: guardians.length,
        claimedCount: guardians.filter((g) => g.userAccount?.hasAccount).length,
        declinedCount: guardians.filter((g) => g.declinedByUserId).length,
      });
    }

    return results;
  },
});

/**
 * Get guardian management statistics for an organization
 */
export const getGuardianStatsForOrg = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    totalPlayers: v.number(),
    totalGuardianLinks: v.number(),
    claimedAccounts: v.number(),
    pendingAccounts: v.number(),
    declinedAccounts: v.number(),
    playersWithoutGuardians: v.number(),
    guardiansWithMissingEmail: v.number(),
    guardiansWithMissingPhone: v.number(),
    duplicateEmails: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get all players in org
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const stats = {
      totalPlayers: enrollments.length,
      totalGuardianLinks: 0,
      claimedAccounts: 0,
      pendingAccounts: 0,
      declinedAccounts: 0,
      playersWithoutGuardians: 0,
      guardiansWithMissingEmail: 0,
      guardiansWithMissingPhone: 0,
      duplicateEmails: 0,
    };

    const emailCounts = new Map<string, number>();
    const processedGuardians = new Set<string>();

    for (const enrollment of enrollments) {
      const guardianLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) =>
          q.eq("playerIdentityId", enrollment.playerIdentityId)
        )
        .collect();

      if (guardianLinks.length === 0) {
        stats.playersWithoutGuardians += 1;
      }

      stats.totalGuardianLinks += guardianLinks.length;

      for (const link of guardianLinks) {
        // Count declined links
        if (link.declinedByUserId) {
          stats.declinedAccounts += 1;
        }

        const guardian = await ctx.db.get(link.guardianIdentityId);
        if (!guardian) {
          continue;
        }

        // Only count each unique guardian once for stats
        if (!processedGuardians.has(guardian._id)) {
          processedGuardians.add(guardian._id);

          if (guardian.userId) {
            stats.claimedAccounts += 1;
          } else {
            stats.pendingAccounts += 1;
          }

          if (guardian.email) {
            emailCounts.set(
              guardian.email,
              (emailCounts.get(guardian.email) || 0) + 1
            );
          } else {
            stats.guardiansWithMissingEmail += 1;
          }

          if (!guardian.phone) {
            stats.guardiansWithMissingPhone += 1;
          }
        }
      }
    }

    // Count duplicate emails
    for (const count of emailCounts.values()) {
      if (count > 1) {
        stats.duplicateEmails += 1;
      }
    }

    return stats;
  },
});

/**
 * Get all unique guardians in the organization (guardian-centric view)
 */
export const getGuardiansForOrg = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all players in org
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const guardianMap = new Map();

    for (const enrollment of enrollments) {
      const player = await ctx.db.get(enrollment.playerIdentityId);
      if (!player) {
        continue;
      }

      const guardianLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) => q.eq("playerIdentityId", player._id))
        .collect();

      for (const link of guardianLinks) {
        const guardian = await ctx.db.get(link.guardianIdentityId);
        if (!guardian) {
          continue;
        }

        if (!guardianMap.has(guardian._id)) {
          // For claimed guardians, merge Better Auth user profile data.
          // The user may have updated phone/postcode in their profile
          // which is stored in the Better Auth user table but not synced
          // back to guardianIdentities.
          let mergedPhone = guardian.phone;
          let mergedPostcode = guardian.postcode;
          if (guardian.userId) {
            const baUser = await ctx.runQuery(
              components.betterAuth.adapter.findOne,
              {
                model: "user",
                where: [
                  { field: "_id", value: guardian.userId, operator: "eq" },
                ],
              }
            );
            if (baUser) {
              mergedPhone = guardian.phone ?? (baUser as any).phone;
              mergedPostcode = guardian.postcode ?? (baUser as any).postcode;
            }
          }

          guardianMap.set(guardian._id, {
            guardianId: guardian._id,
            firstName: guardian.firstName,
            lastName: guardian.lastName,
            email: guardian.email,
            phone: mergedPhone,
            postcode: mergedPostcode,
            verificationStatus: guardian.verificationStatus,
            hasUserAccount: !!guardian.userId,
            userId: guardian.userId,
            players: [],
            createdAt: guardian.createdAt,
          });
        }

        const guardianData = guardianMap.get(guardian._id);
        guardianData.players.push({
          playerId: player._id,
          playerName: `${player.firstName} ${player.lastName}`,
          ageGroup: enrollment.ageGroup,
          relationship: link.relationship,
          isPrimary: link.isPrimary,
          linkId: link._id,
          declinedByUserId: link.declinedByUserId,
          acknowledgedByParentAt: link.acknowledgedByParentAt,
        });
      }
    }

    return Array.from(guardianMap.values());
  },
});

/**
 * Get players without any guardian links
 */
export const getPlayersWithoutGuardians = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const results = [];

    for (const enrollment of enrollments) {
      const player = await ctx.db.get(enrollment.playerIdentityId);
      if (!player) {
        continue;
      }

      const guardianLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) => q.eq("playerIdentityId", player._id))
        .collect();

      if (guardianLinks.length === 0) {
        results.push({
          playerId: player._id,
          playerName: `${player.firstName} ${player.lastName}`,
          firstName: player.firstName,
          lastName: player.lastName,
          dateOfBirth: player.dateOfBirth,
          ageGroup: enrollment.ageGroup,
        });
      }
    }

    return results;
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Update guardian information
 */
export const updateGuardianInfo = mutation({
  args: {
    guardianId: v.id("guardianIdentities"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const guardian = await ctx.db.get(args.guardianId);
    if (!guardian) {
      throw new Error("Guardian not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.firstName !== undefined) {
      updates.firstName = args.firstName;
    }
    if (args.lastName !== undefined) {
      updates.lastName = args.lastName;
    }
    if (args.email !== undefined) {
      updates.email = args.email.toLowerCase().trim();
    }
    if (args.phone !== undefined) {
      updates.phone = args.phone.trim();
    }

    await ctx.db.patch(args.guardianId, updates);
    return null;
  },
});

/**
 * Update guardian-player link (mark as primary, change relationship)
 */
export const updateGuardianLink = mutation({
  args: {
    linkId: v.id("guardianPlayerLinks"),
    isPrimary: v.optional(v.boolean()),
    relationship: v.optional(relationshipValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Guardian link not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.isPrimary !== undefined) {
      updates.isPrimary = args.isPrimary;

      // If setting as primary, unset other primary links for this player
      if (args.isPrimary) {
        const otherLinks = await ctx.db
          .query("guardianPlayerLinks")
          .withIndex("by_player", (q) =>
            q.eq("playerIdentityId", link.playerIdentityId)
          )
          .collect();

        for (const otherLink of otherLinks) {
          if (otherLink._id !== link._id && otherLink.isPrimary) {
            await ctx.db.patch(otherLink._id, {
              isPrimary: false,
              updatedAt: Date.now(),
            });
          }
        }
      }
    }

    if (args.relationship !== undefined) {
      updates.relationship = args.relationship;
    }

    await ctx.db.patch(args.linkId, updates);
    return null;
  },
});

/**
 * Remove guardian-player link
 * If this is the last link for the guardian, resets userId to force re-acknowledgment
 * Also revokes any active passport sharing consents for this guardian-player combination
 */
export const removeGuardianLink = mutation({
  args: {
    linkId: v.id("guardianPlayerLinks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Guardian link not found");
    }

    const guardianIdentityId = link.guardianIdentityId;
    const playerIdentityId = link.playerIdentityId;

    // Delete the link
    await ctx.db.delete(args.linkId);

    // Revoke any active passport sharing consents for this guardian-player combination
    // This ensures sharing permissions don't persist after guardian is unlinked
    const activeConsents = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", playerIdentityId))
      .filter((q) =>
        q.and(
          q.eq(q.field("guardianIdentityId"), guardianIdentityId),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    const now = Date.now();
    for (const consent of activeConsents) {
      await ctx.db.patch(consent._id, {
        status: "revoked",
        revokedAt: now,
        revokedReason: "Guardian-player link removed",
      });
      console.log(
        `[removeGuardianLink] Revoked sharing consent ${consent._id} for player ${playerIdentityId}`
      );
    }

    if (activeConsents.length > 0) {
      console.log(
        `[removeGuardianLink] Revoked ${activeConsents.length} passport sharing consent(s) for guardian ${guardianIdentityId} and player ${playerIdentityId}`
      );
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
        `[removeGuardianLink] Reset guardian identity ${guardianIdentityId} - last link deleted, parent must re-claim if re-linked`
      );
    }

    return null;
  },
});

/**
 * Add new guardian-player link
 */
export const addGuardianLink = mutation({
  args: {
    guardianId: v.id("guardianIdentities"),
    playerId: v.id("playerIdentities"),
    relationship: relationshipValidator,
    isPrimary: v.optional(v.boolean()),
  },
  returns: v.id("guardianPlayerLinks"),
  handler: async (ctx, args) => {
    // Check if link already exists
    const existing = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian_and_player", (q) =>
        q
          .eq("guardianIdentityId", args.guardianId)
          .eq("playerIdentityId", args.playerId)
      )
      .first();

    if (existing) {
      throw new Error("This guardian is already linked to this player");
    }

    const now = Date.now();

    return await ctx.db.insert("guardianPlayerLinks", {
      guardianIdentityId: args.guardianId,
      playerIdentityId: args.playerId,
      relationship: args.relationship,
      isPrimary: args.isPrimary ?? false,
      hasParentalResponsibility: true, // Default to true for manual links
      canCollectFromTraining: true, // Default to true
      consentedToSharing: false, // Default to false, guardian can change later
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Cleanup declined guardian-player links
 * Deletes all links where the user has clicked "This Isn't Me"
 * These are orphaned records that should be removed
 */
export const cleanupDeclinedLinks = mutation({
  args: {
    guardianIdentityId: v.optional(v.id("guardianIdentities")),
  },
  returns: v.object({
    deletedCount: v.number(),
    deletedIds: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    let declinedLinks: Doc<"guardianPlayerLinks">[];

    if (args.guardianIdentityId) {
      // Clean up for specific guardian
      const guardianId = args.guardianIdentityId;
      declinedLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) => q.eq("guardianIdentityId", guardianId))
        .filter((q) => q.neq(q.field("declinedByUserId"), undefined))
        .collect();
    } else {
      // Clean up all declined links (admin operation)
      declinedLinks = await ctx.db
        .query("guardianPlayerLinks")
        .filter((q) => q.neq(q.field("declinedByUserId"), undefined))
        .collect();
    }

    const deletedIds: string[] = [];

    for (const link of declinedLinks) {
      await ctx.db.delete(link._id);
      deletedIds.push(link._id);
      console.log(
        `[cleanupDeclinedLinks] Deleted declined link ${link._id} for player ${link.playerIdentityId}`
      );
    }

    console.log(
      `[cleanupDeclinedLinks] Cleaned up ${deletedIds.length} declined guardian-player links`
    );

    return {
      deletedCount: deletedIds.length,
      deletedIds,
    };
  },
});
