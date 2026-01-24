import { v } from "convex/values";
import { components } from "../_generated/api";
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
  allowGlobalPassportDiscovery: v.optional(v.boolean()),
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
 * Check if an email conflicts with an existing guardian identity
 * Used when editing a guardian to detect if the new email belongs to someone else
 * Returns the conflicting guardian's details for preview, or null if no conflict
 */
export const checkGuardianEmailConflict = query({
  args: {
    email: v.string(),
    excludeGuardianId: v.optional(v.id("guardianIdentities")),
  },
  returns: v.union(
    v.null(),
    v.object({
      guardianIdentityId: v.id("guardianIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      verificationStatus: v.string(),
      linkedPlayersCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Find guardian with this email
    const existingGuardian = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    // No guardian with this email
    if (!existingGuardian) {
      return null;
    }

    // If it's the same guardian we're editing, no conflict
    if (
      args.excludeGuardianId &&
      existingGuardian._id === args.excludeGuardianId
    ) {
      return null;
    }

    // Count how many players are linked to this guardian
    const linkedPlayers = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", existingGuardian._id)
      )
      .collect();

    return {
      guardianIdentityId: existingGuardian._id,
      firstName: existingGuardian.firstName,
      lastName: existingGuardian.lastName,
      email: existingGuardian.email || "",
      phone: existingGuardian.phone,
      verificationStatus: existingGuardian.verificationStatus,
      linkedPlayersCount: linkedPlayers.length,
    };
  },
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
      const lastName = args.lastName;
      const firstName = args.firstName;
      return await ctx.db
        .query("guardianIdentities")
        .withIndex("by_name", (q) =>
          q.eq("lastName", lastName).eq("firstName", firstName)
        )
        .take(limit);
    }

    // If we only have lastName, use the index and filter
    if (args.lastName) {
      const lastName = args.lastName;
      return await ctx.db
        .query("guardianIdentities")
        .withIndex("by_name", (q) => q.eq("lastName", lastName))
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

/**
 * Get all pending parent actions for a user across ALL organizations
 * Returns unclaimed identities, new child assignments, incomplete profiles, and missing consents
 *
 * This is the core query for the batched parent onboarding system (Bug #293 fix)
 * INTERNAL ONLY - Use getPendingParentActionsWithDismissCount for client calls
 */
// DEPRECATED: Use getPendingParentActionsWithDismissCount instead
// This function has TypeScript errors with Better Auth tables
/*
export const getPendingParentActions = query({
  args: {
    userId: v.string(),
  },
  returns: v.object({
    unclaimedIdentities: v.array(
      v.object({
        guardianIdentity: guardianIdentityValidator,
        linkedChildren: v.array(
          v.object({
            playerIdentityId: v.id("playerIdentities"),
            playerName: v.string(),
            organizationId: v.string(),
            organizationName: v.string(),
            relationship: v.union(
              v.literal("mother"),
              v.literal("father"),
              v.literal("guardian"),
              v.literal("grandparent"),
              v.literal("other")
            ),
            linkId: v.id("guardianPlayerLinks"),
          })
        ),
        organizations: v.array(
          v.object({
            organizationId: v.string(),
            organizationName: v.string(),
          })
        ),
      })
    ),
    newChildAssignments: v.array(
      v.object({
        guardianIdentityId: v.id("guardianIdentities"),
        linkId: v.id("guardianPlayerLinks"),
        playerIdentityId: v.id("playerIdentities"),
        playerName: v.string(),
        organizationId: v.string(),
        organizationName: v.string(),
        relationship: v.union(
          v.literal("mother"),
          v.literal("father"),
          v.literal("guardian"),
          v.literal("grandparent"),
          v.literal("other")
        ),
        assignedAt: v.number(),
      })
    ),
    incompleteProfiles: v.array(
      v.object({
        linkId: v.id("guardianPlayerLinks"),
        playerIdentityId: v.id("playerIdentities"),
        playerName: v.string(),
        organizationId: v.string(),
        organizationName: v.string(),
        requiredFields: v.array(v.string()),
      })
    ),
    missingConsents: v.array(
      v.object({
        linkId: v.id("guardianPlayerLinks"),
        playerIdentityId: v.id("playerIdentities"),
        playerName: v.string(),
        organizationId: v.string(),
        organizationName: v.string(),
        consentType: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Get user info to check lastChildrenCheckAt
    const user = await ctx.db
      .query("user")
      .filter((q) => q.eq(q.field("_id"), args.userId))
      .first();

    if (!(user && user.email)) {
      return {
        unclaimedIdentities: [],
        newChildAssignments: [],
        incompleteProfiles: [],
        missingConsents: [],
      };
    }

    const userEmail = user.email.toLowerCase().trim();
    const lastCheckedAt = user.lastChildrenCheckAt || 0;

    // 1. Get all guardian identities matching user's email
    const allGuardianIdentities = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", userEmail))
      .collect();

    // 2. Separate unclaimed and claimed identities
    const unclaimedIdentities = allGuardianIdentities.filter((g) => !g.userId);
    const claimedIdentities = allGuardianIdentities.filter(
      (g) => g.userId === args.userId
    );

    // 3. Process unclaimed identities
    const unclaimedIdentitiesData = [];
    for (const guardianIdentity of unclaimedIdentities) {
      // Get all player links for this guardian
      const links = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", guardianIdentity._id)
        )
        .filter((q) => q.eq(q.field("declinedByUserId"), undefined))
        .collect();

      const linkedChildren = [];
      const organizations = new Map<string, string>();

      for (const link of links) {
        // Get player identity
        const playerIdentity = await ctx.db.get(link.playerIdentityId);
        if (!playerIdentity) continue;

        // Get enrollment to find organization
        const enrollment = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q.eq("playerIdentityId", link.playerIdentityId)
          )
          .first();

        if (enrollment) {
          // Get organization name
          const org = await ctx.db
            .query("organization")
            .filter((q) => q.eq(q.field("_id"), enrollment.organizationId))
            .first();

          if (org) {
            organizations.set(enrollment.organizationId, org.name);

            linkedChildren.push({
              playerIdentityId: link.playerIdentityId,
              playerName: `${playerIdentity.firstName} ${playerIdentity.lastName}`,
              organizationId: enrollment.organizationId,
              organizationName: org.name,
              relationship: link.relationship,
              linkId: link._id,
            });
          }
        }
      }

      if (linkedChildren.length > 0) {
        unclaimedIdentitiesData.push({
          guardianIdentity,
          linkedChildren,
          organizations: Array.from(organizations.entries()).map(
            ([organizationId, organizationName]) => ({
              organizationId,
              organizationName,
            })
          ),
        });
      }
    }

    // 4. Process new child assignments (links created after lastCheckedAt)
    const newChildAssignments = [];
    for (const guardianIdentity of claimedIdentities) {
      const links = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", guardianIdentity._id)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("declinedByUserId"), undefined),
            q.eq(q.field("acknowledgedByParentAt"), undefined)
          )
        )
        .collect();

      // Filter for links created after last check
      const newLinks = links.filter((link) => link.createdAt > lastCheckedAt);

      for (const link of newLinks) {
        const playerIdentity = await ctx.db.get(link.playerIdentityId);
        if (!playerIdentity) continue;

        // Get enrollment to find organization
        const enrollment = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q.eq("playerIdentityId", link.playerIdentityId)
          )
          .first();

        if (enrollment) {
          const org = await ctx.db
            .query("organization")
            .filter((q) => q.eq(q.field("_id"), enrollment.organizationId))
            .first();

          if (org) {
            newChildAssignments.push({
              guardianIdentityId: guardianIdentity._id,
              linkId: link._id,
              playerIdentityId: link.playerIdentityId,
              playerName: `${playerIdentity.firstName} ${playerIdentity.lastName}`,
              organizationId: enrollment.organizationId,
              organizationName: org.name,
              relationship: link.relationship,
              assignedAt: link.createdAt,
            });
          }
        }
      }
    }

    // 5. Check for incomplete profiles
    const incompleteProfiles = [];
    for (const guardianIdentity of claimedIdentities) {
      const links = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", guardianIdentity._id)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("declinedByUserId"), undefined),
            q.eq(q.field("profileCompletionRequired"), true),
            q.eq(q.field("profileCompletedAt"), undefined)
          )
        )
        .collect();

      for (const link of links) {
        const playerIdentity = await ctx.db.get(link.playerIdentityId);
        if (!playerIdentity) continue;

        const enrollment = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q.eq("playerIdentityId", link.playerIdentityId)
          )
          .first();

        if (enrollment) {
          const org = await ctx.db
            .query("organization")
            .filter((q) => q.eq(q.field("_id"), enrollment.organizationId))
            .first();

          if (org) {
            incompleteProfiles.push({
              linkId: link._id,
              playerIdentityId: link.playerIdentityId,
              playerName: `${playerIdentity.firstName} ${playerIdentity.lastName}`,
              organizationId: enrollment.organizationId,
              organizationName: org.name,
              requiredFields: link.requiredProfileFields || [
                "emergencyContact",
                "medicalInfo",
              ],
            });
          }
        }
      }
    }

    // 6. Check for missing consents (not implemented yet, placeholder)
    const missingConsents = [];

    return {
      unclaimedIdentities: unclaimedIdentitiesData,
      newChildAssignments,
      incompleteProfiles,
      missingConsents,
    };
  },
});
*/

/**
 * Get pending parent actions WITH dismiss count
 * Client-friendly wrapper that includes user's dismiss count
 */
export const getPendingParentActionsWithDismissCount = query({
  args: {
    userId: v.string(),
  },
  returns: v.object({
    pendingActions: v.object({
      unclaimedIdentities: v.array(
        v.object({
          guardianIdentity: guardianIdentityValidator,
          linkedChildren: v.array(
            v.object({
              playerIdentityId: v.id("playerIdentities"),
              playerName: v.string(),
              organizationId: v.string(),
              organizationName: v.string(),
              relationship: v.union(
                v.literal("mother"),
                v.literal("father"),
                v.literal("guardian"),
                v.literal("grandparent"),
                v.literal("other")
              ),
              linkId: v.id("guardianPlayerLinks"),
            })
          ),
          organizations: v.array(
            v.object({
              organizationId: v.string(),
              organizationName: v.string(),
            })
          ),
        })
      ),
      newChildAssignments: v.array(
        v.object({
          guardianIdentityId: v.id("guardianIdentities"),
          linkId: v.id("guardianPlayerLinks"),
          playerIdentityId: v.id("playerIdentities"),
          playerName: v.string(),
          organizationId: v.string(),
          organizationName: v.string(),
          relationship: v.union(
            v.literal("mother"),
            v.literal("father"),
            v.literal("guardian"),
            v.literal("grandparent"),
            v.literal("other")
          ),
          assignedAt: v.number(),
        })
      ),
      incompleteProfiles: v.array(
        v.object({
          linkId: v.id("guardianPlayerLinks"),
          playerIdentityId: v.id("playerIdentities"),
          playerName: v.string(),
          organizationId: v.string(),
          organizationName: v.string(),
          requiredFields: v.array(v.string()),
        })
      ),
      missingConsents: v.array(
        v.object({
          linkId: v.id("guardianPlayerLinks"),
          playerIdentityId: v.id("playerIdentities"),
          playerName: v.string(),
          organizationId: v.string(),
          organizationName: v.string(),
          consentType: v.string(),
        })
      ),
    }),
    dismissCount: v.number(),
    lastDismissedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get user info via Better Auth to check lastChildrenCheckAt and get dismiss count
    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [
        {
          field: "_id",
          value: args.userId,
          operator: "eq",
        },
      ],
    });

    if (!(user && (user as any).email)) {
      return {
        pendingActions: {
          unclaimedIdentities: [],
          newChildAssignments: [],
          incompleteProfiles: [],
          missingConsents: [],
        },
        dismissCount: 0,
        lastDismissedAt: 0,
      };
    }

    const userEmail = (user as any).email.toLowerCase().trim();
    const lastCheckedAt = (user as any).lastChildrenCheckAt || 0;
    const dismissCount = (user as any).parentOnboardingDismissCount || 0;
    const lastDismissedAt = (user as any).parentOnboardingLastDismissedAt || 0;

    // 1. Get all guardian identities matching user's email
    const allGuardianIdentities = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", userEmail))
      .collect();

    // 2. Separate unclaimed and claimed identities
    const unclaimedIdentities = allGuardianIdentities.filter((g) => !g.userId);
    const claimedIdentities = allGuardianIdentities.filter(
      (g) => g.userId === args.userId
    );

    // 3. Process unclaimed identities
    const unclaimedIdentitiesData = [];
    for (const guardianIdentity of unclaimedIdentities) {
      // Get all player links for this guardian
      const links = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", guardianIdentity._id)
        )
        .filter((q) => q.eq(q.field("declinedByUserId"), undefined))
        .collect();

      const linkedChildren = [];
      const organizations = new Map<string, string>();

      for (const link of links) {
        // Get player identity
        const playerIdentity = await ctx.db.get(link.playerIdentityId);
        if (!playerIdentity) {
          continue;
        }

        // Get enrollment to find organization
        const enrollment = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q.eq("playerIdentityId", link.playerIdentityId)
          )
          .first();

        if (enrollment) {
          // Get organization name via Better Auth
          const org = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "organization",
              where: [
                {
                  field: "_id",
                  value: enrollment.organizationId,
                  operator: "eq",
                },
              ],
            }
          );

          if (org) {
            organizations.set(enrollment.organizationId, (org as any).name);

            linkedChildren.push({
              playerIdentityId: link.playerIdentityId,
              playerName: `${playerIdentity.firstName} ${playerIdentity.lastName}`,
              organizationId: enrollment.organizationId,
              organizationName: (org as any).name,
              relationship: link.relationship,
              linkId: link._id,
            });
          }
        }
      }

      if (linkedChildren.length > 0) {
        unclaimedIdentitiesData.push({
          guardianIdentity,
          linkedChildren,
          organizations: Array.from(organizations.entries()).map(
            ([organizationId, organizationName]) => ({
              organizationId,
              organizationName,
            })
          ),
        });
      }
    }

    // 4. Process new child assignments (links created after lastCheckedAt)
    const newChildAssignments = [];
    for (const guardianIdentity of claimedIdentities) {
      const links = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", guardianIdentity._id)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("declinedByUserId"), undefined),
            q.eq(q.field("acknowledgedByParentAt"), undefined)
          )
        )
        .collect();

      // Filter for links created after last check
      const newLinks = links.filter((link) => link.createdAt > lastCheckedAt);

      for (const link of newLinks) {
        const playerIdentity = await ctx.db.get(link.playerIdentityId);
        if (!playerIdentity) {
          continue;
        }

        // Get enrollment to find organization
        const enrollment = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q.eq("playerIdentityId", link.playerIdentityId)
          )
          .first();

        if (enrollment) {
          const org = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "organization",
              where: [
                {
                  field: "_id",
                  value: enrollment.organizationId,
                  operator: "eq",
                },
              ],
            }
          );

          if (org) {
            newChildAssignments.push({
              guardianIdentityId: guardianIdentity._id,
              linkId: link._id,
              playerIdentityId: link.playerIdentityId,
              playerName: `${playerIdentity.firstName} ${playerIdentity.lastName}`,
              organizationId: enrollment.organizationId,
              organizationName: (org as any).name,
              relationship: link.relationship,
              assignedAt: link.createdAt,
            });
          }
        }
      }
    }

    // 5. Check for incomplete profiles
    const incompleteProfiles = [];
    for (const guardianIdentity of claimedIdentities) {
      const links = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", guardianIdentity._id)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("declinedByUserId"), undefined),
            q.eq(q.field("profileCompletionRequired"), true),
            q.eq(q.field("profileCompletedAt"), undefined)
          )
        )
        .collect();

      for (const link of links) {
        const playerIdentity = await ctx.db.get(link.playerIdentityId);
        if (!playerIdentity) {
          continue;
        }

        const enrollment = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q.eq("playerIdentityId", link.playerIdentityId)
          )
          .first();

        if (enrollment) {
          const org = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "organization",
              where: [
                {
                  field: "_id",
                  value: enrollment.organizationId,
                  operator: "eq",
                },
              ],
            }
          );

          if (org) {
            incompleteProfiles.push({
              linkId: link._id,
              playerIdentityId: link.playerIdentityId,
              playerName: `${playerIdentity.firstName} ${playerIdentity.lastName}`,
              organizationId: enrollment.organizationId,
              organizationName: (org as any).name,
              requiredFields: link.requiredProfileFields || [
                "emergencyContact",
                "medicalInfo",
              ],
            });
          }
        }
      }
    }

    // 6. Check for missing consents (not implemented yet, placeholder)
    const missingConsents: Array<{
      linkId: any;
      playerIdentityId: any;
      playerName: string;
      organizationId: string;
      organizationName: string;
      consentType: string;
    }> = [];

    return {
      pendingActions: {
        unclaimedIdentities: unclaimedIdentitiesData,
        newChildAssignments,
        incompleteProfiles,
        missingConsents,
      },
      dismissCount,
      lastDismissedAt,
    };
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
 * Update guardian's global passport discovery preference
 * Allows/disallows coaches from any org to discover their children's passports
 */
export const updatePassportDiscoveryPreference = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    allowGlobalPassportDiscovery: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.guardianIdentityId);
    if (!existing) {
      throw new Error("Guardian identity not found");
    }

    await ctx.db.patch(args.guardianIdentityId, {
      allowGlobalPassportDiscovery: args.allowGlobalPassportDiscovery,
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
    // Optional: Current user info for auto-linking when admin adds themselves
    currentUserId: v.optional(v.string()),
    currentUserEmail: v.optional(v.string()),
  },
  returns: v.object({
    guardianIdentityId: v.id("guardianIdentities"),
    wasCreated: v.boolean(),
    matchConfidence: v.number(),
    autoLinked: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // REMOVED: All automatic linking disabled - everyone must acknowledge via modal
    // No self-assignment exception, no auto-linking whatsoever

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

      // REMOVED: No auto-linking - parent must always acknowledge via modal
      console.log(
        "[findOrCreateGuardian] Found existing guardian, NOT auto-linking:",
        existing._id,
        "- parent must claim via modal"
      );

      return {
        guardianIdentityId: existing._id,
        wasCreated: false,
        matchConfidence: confidence,
        autoLinked: false,
      };
    }

    // No match found, create new guardian
    const now = Date.now();
    const normalizedPhone = args.phone ? normalizePhone(args.phone) : undefined;

    // Build guardian data - NEVER auto-link
    const guardianData: any = {
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      address: args.address?.trim(),
      town: args.town?.trim(),
      postcode: args.postcode?.trim(),
      country: args.country?.trim(),
      verificationStatus: "unverified", // Always unverified - must claim via modal
      createdAt: now,
      updatedAt: now,
      createdFrom: args.createdFrom ?? "import",
      // REMOVED: userId NEVER auto-set - parent must claim via modal
    };

    const guardianIdentityId = await ctx.db.insert(
      "guardianIdentities",
      guardianData
    );

    console.log(
      "[findOrCreateGuardian] Created guardian, NOT auto-linking:",
      guardianIdentityId,
      "- parent must claim via modal"
    );

    return {
      guardianIdentityId,
      wasCreated: true,
      matchConfidence: 100, // New record, exact match to input
      autoLinked: false, // Never auto-linked
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

    const results: any[] = [];

    for (const guardian of allGuardians) {
      // Get linked children
      const links = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", guardian._id)
        )
        .collect();

      const children: any[] = [];
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
    const userId = identity.subject;
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

    const results: any[] = [];

    for (const guardian of matchingGuardians) {
      // Get all linked children (excluding links declined by current user)
      const allLinks = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", guardian._id)
        )
        .collect();

      // Filter out links that current user has declined
      const links = allLinks.filter((link) => link.declinedByUserId !== userId);

      const children: any[] = [];
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

      // Only include this guardian if they have non-declined children
      if (children.length > 0) {
        // Fetch organization names for each organization using Better Auth adapter
        const organizations = [];
        for (const orgId of Array.from(orgSet)) {
          const result = await ctx.runQuery(
            components.betterAuth.adapter.findMany,
            {
              model: "organization",
              paginationOpts: { cursor: null, numItems: 1 },
              where: [{ field: "_id", value: orgId, operator: "eq" }],
            }
          );

          const org = result.page[0];
          organizations.push({
            organizationId: orgId,
            organizationName: org?.name,
          });
        }

        // Email match = high confidence
        results.push({
          guardianIdentity: guardian,
          children,
          organizations,
          confidence: 100,
        });
      }
    }

    return results;
  },
});

/**
 * Find pending children for already-claimed guardian identities
 * Used when admin clicks "Resend" on a declined child - parent needs to re-acknowledge
 */
export const findPendingChildrenForClaimedGuardian = query({
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

    const userId = identity.subject;
    if (!userId) {
      return [];
    }

    // Find guardian identities that ARE claimed by this user (userId is set)
    const claimedGuardian = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!claimedGuardian) {
      return [];
    }

    // Find all links for this guardian
    const allLinks = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", claimedGuardian._id)
      )
      .collect();

    // Filter to only pending links (not acknowledged and not declined)
    const pendingLinks = allLinks.filter(
      (link) => !(link.acknowledgedByParentAt || link.declinedByUserId)
    );

    if (pendingLinks.length === 0) {
      return [];
    }

    // Build children array
    const children: any[] = [];
    const orgSet = new Set<string>();

    for (const link of pendingLinks) {
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

    // Fetch organization names
    const organizations = [];
    for (const orgId of Array.from(orgSet)) {
      const result = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "organization",
          paginationOpts: { cursor: null, numItems: 1 },
          where: [{ field: "_id", value: orgId, operator: "eq" }],
        }
      );

      const org = result.page[0];
      organizations.push({
        organizationId: orgId,
        organizationName: org?.name,
      });
    }

    return [
      {
        guardianIdentity: claimedGuardian,
        children,
        organizations,
        confidence: 100,
      },
    ];
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

    const children: any[] = [];
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

/**
 * Batch acknowledge parent actions - handle multiple actions in one transaction
 * Supports: claiming identities, acknowledging links, declining links, updating consents
 * This is the primary mutation for the batched parent onboarding system
 */
export const batchAcknowledgeParentActions = mutation({
  args: {
    userId: v.string(),
    claimIdentityIds: v.array(v.id("guardianIdentities")),
    acknowledgeLinkIds: v.array(v.id("guardianPlayerLinks")),
    declineLinkIds: v.array(v.id("guardianPlayerLinks")),
    declineReasons: v.optional(
      v.record(
        v.string(), // keys are link IDs
        v.object({
          reason: v.union(
            v.literal("not_my_child"),
            v.literal("wrong_person"),
            v.literal("none_are_mine"),
            v.literal("other")
          ),
          reasonText: v.optional(v.string()),
        })
      )
    ),
    consentLinkIds: v.array(v.id("guardianPlayerLinks")),
    profilePromises: v.array(
      v.object({
        linkId: v.id("guardianPlayerLinks"),
        fieldsToComplete: v.array(v.string()),
      })
    ),
  },
  returns: v.object({
    claimed: v.number(),
    acknowledged: v.number(),
    declined: v.number(),
    consented: v.number(),
    profilePromisesSet: v.number(),
  }),
  handler: async (ctx, args) => {
    let claimed = 0;
    let acknowledged = 0;
    let declined = 0;
    let consented = 0;
    let profilePromisesSet = 0;

    // 1. Claim all specified guardian identities
    for (const guardianIdentityId of args.claimIdentityIds) {
      const existing = await ctx.db.get(guardianIdentityId);
      if (!existing) {
        continue;
      }

      // Skip if already claimed by this user
      if (existing.userId === args.userId) {
        claimed += 1;
        continue;
      }

      // Check if this userId is already linked to another guardian with same email
      const existingUserLink = await ctx.db
        .query("guardianIdentities")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .first();

      // If user already has a guardian identity with same email, skip
      if (
        existingUserLink &&
        existingUserLink.email === existing.email &&
        existingUserLink._id !== guardianIdentityId
      ) {
        continue;
      }

      // Link guardian to user
      await ctx.db.patch(guardianIdentityId, {
        userId: args.userId,
        verificationStatus:
          existing.verificationStatus === "unverified"
            ? "email_verified"
            : existing.verificationStatus,
        updatedAt: Date.now(),
      });

      claimed += 1;
    }

    // 2. Mark acknowledgeLinkIds as acknowledged
    for (const linkId of args.acknowledgeLinkIds) {
      const link = await ctx.db.get(linkId);
      if (!link) {
        continue;
      }

      await ctx.db.patch(linkId, {
        acknowledgedByParentAt: Date.now(),
        updatedAt: Date.now(),
      });

      acknowledged += 1;
    }

    // 3. Process declines with reasons
    for (const linkId of args.declineLinkIds) {
      const link = await ctx.db.get(linkId);
      if (!link) {
        continue;
      }

      // Get decline reason from declineReasons map if provided
      const declineInfo = args.declineReasons
        ? (args.declineReasons as any)[linkId]
        : undefined;

      await ctx.db.patch(linkId, {
        declinedByUserId: args.userId,
        declineReason: declineInfo?.reason || "other",
        declineReasonText: declineInfo?.reasonText,
        updatedAt: Date.now(),
      });

      declined += 1;
    }

    // 4. Update consent flags for consentLinkIds
    for (const linkId of args.consentLinkIds) {
      const link = await ctx.db.get(linkId);
      if (!link) {
        continue;
      }

      await ctx.db.patch(linkId, {
        consentedToSharing: true,
        updatedAt: Date.now(),
      });

      consented += 1;
    }

    // 5. Mark profile completion promises
    for (const promise of args.profilePromises) {
      const link = await ctx.db.get(promise.linkId);
      if (!link) {
        continue;
      }

      await ctx.db.patch(promise.linkId, {
        profileCompletionRequired: true,
        requiredProfileFields: promise.fieldsToComplete,
        updatedAt: Date.now(),
      });

      profilePromisesSet += 1;
    }

    // 6. Update user's lastChildrenCheckAt and reset dismiss count
    // Note: Using Better Auth adapter for user table queries
    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [
        {
          field: "_id",
          value: args.userId,
          operator: "eq",
        },
      ],
    });

    if (user) {
      // Update user fields using Better Auth adapter
      // Cannot use ctx.db.patch on Better Auth tables - must use adapter
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "user",
          where: [{ field: "_id", value: args.userId, operator: "eq" }],
          update: {
            lastChildrenCheckAt: Date.now(),
            parentOnboardingDismissCount: 0,
            updatedAt: Date.now(),
          },
        },
      });
    }

    return {
      claimed,
      acknowledged,
      declined,
      consented,
      profilePromisesSet,
    };
  },
});

/**
 * Acknowledge a single child assignment
 */
export const acknowledgeSingleChild = mutation({
  args: {
    linkId: v.id("guardianPlayerLinks"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Link not found");
    }

    await ctx.db.patch(args.linkId, {
      acknowledgedByParentAt: Date.now(),
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Decline a single child assignment with reason
 */
export const declineSingleChild = mutation({
  args: {
    linkId: v.id("guardianPlayerLinks"),
    userId: v.string(),
    reason: v.union(
      v.literal("not_my_child"),
      v.literal("wrong_person"),
      v.literal("none_are_mine"),
      v.literal("other")
    ),
    reasonText: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Link not found");
    }

    await ctx.db.patch(args.linkId, {
      declinedByUserId: args.userId,
      declineReason: args.reason,
      declineReasonText: args.reasonText,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Update consent for a single link
 */
export const updateSingleConsent = mutation({
  args: {
    linkId: v.id("guardianPlayerLinks"),
    consentedToSharing: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Link not found");
    }

    await ctx.db.patch(args.linkId, {
      consentedToSharing: args.consentedToSharing,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Mark profile as complete for a link
 */
export const markProfileComplete = mutation({
  args: {
    linkId: v.id("guardianPlayerLinks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Link not found");
    }

    await ctx.db.patch(args.linkId, {
      profileCompletedAt: Date.now(),
      profileCompletionRequired: false,
      requiredProfileFields: [],
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Track parent onboarding modal dismissal
 * Increments dismiss count and tracks when last dismissed
 */
export const trackParentOnboardingDismissal = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.object({
    dismissCount: v.number(),
  }),
  handler: async (ctx, args) => {
    // Query user via Better Auth adapter
    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [
        {
          field: "_id",
          value: args.userId,
          operator: "eq",
        },
      ],
    });

    if (!user) {
      throw new Error("User not found");
    }

    const currentCount = (user as any).parentOnboardingDismissCount || 0;
    const newCount = currentCount + 1;

    // Update user fields using Better Auth adapter
    // Cannot use ctx.db.patch on Better Auth tables - must use adapter
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: args.userId, operator: "eq" }],
        update: {
          parentOnboardingDismissCount: newCount,
          parentOnboardingLastDismissedAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    });

    return {
      dismissCount: newCount,
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
