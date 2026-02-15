import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalQuery, query } from "../../_generated/server";

// ============================================================
// GAA MEMBERSHIP NUMBER VALIDATION AND DEDUPLICATION
// ============================================================

/**
 * GAA membership number format: XXX-XXXXX-XXX
 * (3 digits - 5 digits - 3 digits)
 *
 * Example: 123-45678-901
 */
const GAA_MEMBERSHIP_NUMBER_REGEX = /^\d{3}-\d{5}-\d{3}$/;

/**
 * Validate GAA membership number format
 *
 * @param membershipNumber - GAA membership number to validate
 * @returns true if valid format, false otherwise
 */
export function validateGAAMembershipNumber(membershipNumber: string): boolean {
  return GAA_MEMBERSHIP_NUMBER_REGEX.test(membershipNumber.trim());
}

/**
 * Find player identity by GAA membership number (externalIds.foireann)
 *
 * Uses full table scan since Convex doesn't support indexes on object fields.
 * Performance: O(n) where n = total player identities
 *
 * For better performance, consider:
 * - Caching results
 * - Limiting query to specific organizationId if available
 * - Using a separate lookup table for external IDs
 *
 * @param membershipNumber - GAA membership number (format: XXX-XXXXX-XXX)
 * @returns Player identity if found, null otherwise
 */
export const checkGAAMembershipNumber = internalQuery({
  args: {
    membershipNumber: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      gender: v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("other")
      ),
      playerType: v.union(v.literal("youth"), v.literal("adult")),
      externalIds: v.optional(v.record(v.string(), v.string())),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const { membershipNumber } = args;

    // Validate format first
    if (!validateGAAMembershipNumber(membershipNumber)) {
      return null;
    }

    // Full table scan to find matching externalIds.foireann
    // NOTE: This is not ideal for performance but Convex doesn't support
    // indexes on nested object fields. Consider adding a separate
    // externalPlayerIds table if this becomes a bottleneck.
    const allPlayers = await ctx.db.query("playerIdentities").collect();

    for (const player of allPlayers) {
      if (
        player.externalIds?.foireann &&
        player.externalIds.foireann === membershipNumber
      ) {
        return player;
      }
    }

    return null;
  },
});

/**
 * Batch check multiple GAA membership numbers for existing players
 *
 * More efficient than calling checkGAAMembershipNumber multiple times
 * as it only scans the playerIdentities table once.
 *
 * @param membershipNumbers - Array of GAA membership numbers
 * @returns Map of membership number -> player identity (only for found players)
 */
export const batchCheckGAAMembershipNumbers = internalQuery({
  args: {
    membershipNumbers: v.array(v.string()),
  },
  returns: v.record(
    v.string(),
    v.object({
      _id: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      gender: v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("other")
      ),
      playerType: v.union(v.literal("youth"), v.literal("adult")),
      externalIds: v.optional(v.record(v.string(), v.string())),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const { membershipNumbers } = args;

    // Filter valid membership numbers
    const validMembershipNumbers = membershipNumbers.filter((num) =>
      validateGAAMembershipNumber(num)
    );

    if (validMembershipNumbers.length === 0) {
      return {};
    }

    // Create a Set for O(1) lookup
    const membershipSet = new Set(validMembershipNumbers);

    // Single table scan
    const allPlayers = await ctx.db.query("playerIdentities").collect();

    // Build result map
    const result: Record<
      string,
      {
        _id: Id<"playerIdentities">;
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        gender: "male" | "female" | "other";
        playerType: "youth" | "adult";
        externalIds?: Record<string, string>;
        createdAt: number;
        updatedAt: number;
      }
    > = {};

    for (const player of allPlayers) {
      const foireannId = player.externalIds?.foireann;
      if (foireannId && membershipSet.has(foireannId)) {
        result[foireannId] = player;
      }
    }

    return result;
  },
});

/**
 * Public query for external use (e.g., admin UI to check if membership number exists)
 */
export const findPlayerByGAAMembershipNumber = query({
  args: {
    membershipNumber: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      found: v.literal(true),
    }),
    v.object({
      found: v.literal(false),
    })
  ),
  handler: async (
    ctx,
    args
  ): Promise<
    | {
        _id: Id<"playerIdentities">;
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        found: true;
      }
    | { found: false }
  > => {
    const { membershipNumber } = args;

    // Validate format
    if (!validateGAAMembershipNumber(membershipNumber)) {
      return { found: false };
    }

    // Search for player
    const allPlayers = await ctx.db.query("playerIdentities").collect();

    for (const player of allPlayers) {
      if (
        player.externalIds?.foireann &&
        player.externalIds.foireann === membershipNumber
      ) {
        return {
          _id: player._id,
          firstName: player.firstName,
          lastName: player.lastName,
          dateOfBirth: player.dateOfBirth,
          found: true as const,
        };
      }
    }

    return { found: false as const };
  },
});
