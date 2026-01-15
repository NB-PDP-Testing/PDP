import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

// Guardian with responsibility validator
const guardianWithResponsibilityValidator = v.object({
  guardianIdentityId: v.id("guardianIdentities"),
  userId: v.optional(v.string()),
  firstName: v.string(),
  lastName: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  relationship: v.union(
    v.literal("mother"),
    v.literal("father"),
    v.literal("guardian"),
    v.literal("grandparent"),
    v.literal("other")
  ),
  isPrimary: v.boolean(),
});

// ============================================================
// HELPER FUNCTIONS (Internal)
// ============================================================

/**
 * Internal helper to validate if a user has parental responsibility for a player
 * @param ctx - Query/Mutation context
 * @param userId - Better Auth user ID
 * @param playerIdentityId - Player identity ID
 * @returns true if user has parental responsibility, false otherwise
 */
export async function validateGuardianHasResponsibility(
  ctx: {
    db: {
      query: (tableName: string) => {
        withIndex: (
          indexName: string,
          indexFn: (q: any) => any
        ) => {
          first: () => Promise<any>;
          collect: () => Promise<any[]>;
        };
      };
    };
  },
  userId: string,
  playerIdentityId: Id<"playerIdentities">
): Promise<boolean> {
  // Find guardian identity for this user
  const guardianIdentity = await ctx.db
    .query("guardianIdentities")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();

  if (!guardianIdentity) {
    return false;
  }

  // Check if guardian has parental responsibility for this player
  const link = await ctx.db
    .query("guardianPlayerLinks")
    .withIndex("by_guardian_and_player", (q: any) =>
      q
        .eq("guardianIdentityId", guardianIdentity._id)
        .eq("playerIdentityId", playerIdentityId)
    )
    .first();

  return link?.hasParentalResponsibility === true;
}

// ============================================================
// QUERIES
// ============================================================

/**
 * Get all guardians with parental responsibility for a player
 * Used for multi-guardian notifications and consent management
 */
export const getGuardiansWithResponsibility = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.array(guardianWithResponsibilityValidator),
  handler: async (ctx, args) => {
    // Get all guardian-player links for this player with parental responsibility
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    // Filter for those with parental responsibility
    const responsibleLinks = links.filter(
      (link) => link.hasParentalResponsibility
    );

    // Fetch guardian details for each link
    const guardians = await Promise.all(
      responsibleLinks.map(async (link) => {
        const guardian = await ctx.db.get(link.guardianIdentityId);
        if (!guardian) {
          return null;
        }

        return {
          guardianIdentityId: link.guardianIdentityId,
          userId: guardian.userId,
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          email: guardian.email,
          phone: guardian.phone,
          relationship: link.relationship,
          isPrimary: link.isPrimary,
        };
      })
    );

    // Filter out nulls and return
    return guardians.filter((g): g is NonNullable<typeof g> => g !== null);
  },
});

/**
 * Check if the current user has parental responsibility for a player
 * Used for authorization checks in frontend
 */
export const checkParentalResponsibility = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const userId = identity.subject;
    return await validateGuardianHasResponsibility(
      ctx,
      userId,
      args.playerIdentityId
    );
  },
});
