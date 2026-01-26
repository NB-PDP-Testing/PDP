import type { Member } from "better-auth/plugins";
import type { GenericDatabaseReader } from "convex/server";
import { v } from "convex/values";
import { api, components, internal } from "../_generated/api";
import type { DataModel, Id } from "../_generated/dataModel";
import { internalMutation, mutation, query } from "../_generated/server";

/**
 * Type helper for Better Auth teamMember table (not in Convex schema)
 * This table is managed by the Better Auth component
 */
type BetterAuthDb = GenericDatabaseReader<DataModel> & {
  query(tableName: "teamMember"): any;
};

/** Regex for removing trailing slashes from URLs */
const TRAILING_SLASH_REGEX = /\/+$/;

/**
 * Organization member management functions
 * These functions query the Better Auth member table to get organization members with their roles
 */

/**
 * Get all members for an organization with their user details
 */
export const getMembersByOrganization = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all members for the organization
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    const members = membersResult.page;

    // Fetch user details for each member
    const membersWithUsers = await Promise.all(
      members.map(async (member: Member) => {
        const userResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [
              {
                field: "_id",
                value: member.userId,
                operator: "eq",
              },
            ],
          }
        );
        return {
          ...member,
          user: userResult,
        };
      })
    );

    return membersWithUsers;
  },
});

/**
 * Get a specific member by user ID and organization ID
 */
export const getMemberByUserId = query({
  args: {
    userId: v.string(),
    organizationId: v.string(),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    // Find the member record for this user in this organization
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "userId",
            value: args.userId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!memberResult) {
      return null;
    }

    // Fetch user details
    const userResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "_id",
            value: memberResult.userId,
            operator: "eq",
          },
        ],
      }
    );

    return {
      ...memberResult,
      user: userResult,
    };
  },
});

/**
 * Get members count by role for an organization
 */
export const getMemberCountsByRole = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    total: v.number(),
    owner: v.number(),
    admin: v.number(),
    member: v.number(),
    coach: v.number(),
    parent: v.number(),
  }),
  handler: async (ctx, args) => {
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    const members = membersResult.page;
    const counts = {
      total: members.length,
      owner: 0,
      admin: 0,
      member: 0,
      coach: 0,
      parent: 0,
    };

    for (const member of members) {
      const role = member.role.toLowerCase();
      if (role === "owner") {
        counts.owner += 1;
      } else if (role === "admin") {
        counts.admin += 1;
      } else if (role === "coach") {
        counts.coach += 1;
      } else if (role === "parent") {
        counts.parent += 1;
      } else if (role === "member") {
        counts.member += 1;
      }
    }

    return counts;
  },
});

/**
 * Get members by specific role
 */
export const getMembersByRole = query({
  args: {
    organizationId: v.string(),
    role: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "role",
            value: args.role,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    const members = membersResult.page;

    // Fetch user details for each member
    const membersWithUsers = await Promise.all(
      members.map(async (member: Member) => {
        const userResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [
              {
                field: "_id",
                value: member.userId,
                operator: "eq",
              },
            ],
          }
        );
        return {
          ...member,
          user: userResult,
        };
      })
    );

    return membersWithUsers;
  },
});

/**
 * Add a single functional role to a member
 * Used by the onMemberAdded hook for automatic role assignment
 */
export const addFunctionalRole = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    functionalRole: v.union(
      v.literal("coach"),
      v.literal("parent"),
      v.literal("admin"),
      v.literal("player")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find the member record
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "userId",
            value: args.userId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!memberResult) {
      console.warn(
        `[addFunctionalRole] Member not found for userId=${args.userId}, orgId=${args.organizationId}`
      );
      return null;
    }

    // Get current functional roles and add new one if not already present
    const currentRoles: ("coach" | "parent" | "admin" | "player")[] =
      (memberResult as any).functionalRoles || [];
    if (currentRoles.includes(args.functionalRole)) {
      console.log(
        `[addFunctionalRole] User already has ${args.functionalRole} role`
      );
      return null;
    }

    const updatedRoles = [...currentRoles, args.functionalRole];

    // Update functional roles using the adapter
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
        update: {
          functionalRoles: updatedRoles,
        },
      },
    });

    console.log(
      `[addFunctionalRole] Added ${args.functionalRole} role to user ${args.userId}`
    );
    return null;
  },
});

/**
 * Update a member's functional roles (coach, parent, admin capabilities)
 * This is separate from their Better Auth org role (owner/admin/member)
 */
export const updateMemberFunctionalRoles = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    functionalRoles: v.array(
      v.union(
        v.literal("coach"),
        v.literal("parent"),
        v.literal("admin"),
        v.literal("player")
      )
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find the member record
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "userId",
            value: args.userId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!memberResult) {
      throw new Error("Member not found");
    }

    // Update functional roles using the adapter
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
        update: {
          functionalRoles: args.functionalRoles,
        },
      },
    });

    return null;
  },
});

/**
 * Get member details including Better Auth role and functional roles
 * Useful for debugging role assignment issues
 */
export const getMemberRoleDetails = query({
  args: {
    organizationId: v.string(),
    userEmail: v.string(),
  },
  returns: v.union(
    v.object({
      userId: v.string(),
      email: v.string(),
      name: v.union(v.string(), v.null()),
      betterAuthRole: v.string(),
      functionalRoles: v.array(
        v.union(
          v.literal("coach"),
          v.literal("parent"),
          v.literal("admin"),
          v.literal("player")
        )
      ),
      hasFunctionalRoles: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Find user by email
    const userResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "email",
            value: args.userEmail,
            operator: "eq",
          },
        ],
      }
    );

    if (!userResult) {
      return null;
    }

    // Find member record
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "userId",
            value: userResult._id,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!memberResult) {
      return null;
    }

    const functionalRoles = (memberResult as any).functionalRoles || [];

    return {
      userId: userResult._id,
      email: userResult.email,
      name: userResult.name || null,
      betterAuthRole: memberResult.role,
      functionalRoles,
      hasFunctionalRoles: functionalRoles.length > 0,
    };
  },
});

/**
 * Sync functional roles for members based on their Better Auth role
 * This is useful for retroactively fixing members who were invited before
 * the automatic functional role assignment was implemented
 *
 * Maps Better Auth roles to functional roles:
 * - "admin" or "owner" → ["admin"]
 * - "member" → [] (no functional roles, admin can assign later)
 */
export const syncFunctionalRolesFromBetterAuthRole = mutation({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    updated: v.number(),
    skipped: v.number(),
    details: v.array(
      v.object({
        email: v.string(),
        betterAuthRole: v.string(),
        functionalRolesSet: v.array(
          v.union(v.literal("coach"), v.literal("parent"), v.literal("admin"))
        ),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Get all members for the organization
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    let updated = 0;
    let skipped = 0;
    const details: Array<{
      email: string;
      betterAuthRole: string;
      functionalRolesSet: ("coach" | "parent" | "admin")[];
    }> = [];

    for (const member of membersResult.page) {
      const betterAuthRole = member.role;
      const currentFunctionalRoles = (member as any).functionalRoles || [];

      // Get user email for details
      const userResult = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "user",
          where: [
            {
              field: "_id",
              value: member.userId,
              operator: "eq",
            },
          ],
        }
      );

      const email = userResult?.email || "unknown";

      // Only update if member doesn't already have functional roles
      // and has an admin/owner Better Auth role
      if (currentFunctionalRoles.length === 0) {
        if (betterAuthRole === "admin" || betterAuthRole === "owner") {
          // Set admin functional role
          await ctx.runMutation(components.betterAuth.adapter.updateOne, {
            input: {
              model: "member",
              where: [{ field: "_id", value: member._id, operator: "eq" }],
              update: {
                functionalRoles: ["admin"],
              },
            },
          });
          updated += 1;
          details.push({
            email,
            betterAuthRole,
            functionalRolesSet: ["admin"],
          });
        } else {
          skipped += 1;
          details.push({
            email,
            betterAuthRole,
            functionalRolesSet: [],
          });
        }
      } else {
        skipped += 1;
        details.push({
          email,
          betterAuthRole,
          functionalRolesSet: currentFunctionalRoles,
        });
      }
    }

    return { updated, skipped, details };
  },
});

/**
 * Get members with their coach assignments and player links
 * This provides all data needed for the user management dashboard
 */
export const getMembersWithDetails = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all members with user details
    const members = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "member",
      paginationOpts: {
        cursor: null,
        numItems: 1000,
      },
      where: [
        {
          field: "organizationId",
          value: args.organizationId,
          operator: "eq",
        },
      ],
    });

    // Fetch additional details for each member
    const membersWithDetails = await Promise.all(
      members.page.map(async (member: Member) => {
        // Get user details
        const userResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [
              {
                field: "_id",
                value: member.userId,
                operator: "eq",
              },
            ],
          }
        );

        // Get functional roles (default to empty array if not set)
        const functionalRoles = (member as any).functionalRoles || [];

        // Get coach assignments if they have coach functional role
        let coachAssignments = null;
        if (functionalRoles.includes("coach")) {
          coachAssignments = await ctx.db
            .query("coachAssignments")
            .withIndex("by_user_and_org", (q) =>
              q
                .eq("userId", member.userId)
                .eq("organizationId", args.organizationId)
            )
            .first();
        }

        // Get linked players if they have parent functional role (using identity system)
        const linkedPlayers: any[] = [];
        if (functionalRoles.includes("parent") && userResult?.email) {
          const userEmail = userResult.email.toLowerCase().trim();

          // Find guardian identity by email
          const guardian = await ctx.db
            .query("guardianIdentities")
            .withIndex("by_email", (q) => q.eq("email", userEmail))
            .first();

          if (guardian) {
            // Get guardian-player links
            const links = await ctx.db
              .query("guardianPlayerLinks")
              .withIndex("by_guardian", (q) =>
                q.eq("guardianIdentityId", guardian._id)
              )
              .collect();

            // Get player details for each link
            for (const link of links) {
              const player = await ctx.db.get(link.playerIdentityId);
              if (!player) {
                continue;
              }

              // Check if player is enrolled in this org
              const enrollment = await ctx.db
                .query("orgPlayerEnrollments")
                .withIndex("by_player_and_org", (q) =>
                  q
                    .eq("playerIdentityId", link.playerIdentityId)
                    .eq("organizationId", args.organizationId)
                )
                .first();

              if (enrollment && enrollment.status === "active") {
                linkedPlayers.push({
                  _id: player._id,
                  name: `${player.firstName} ${player.lastName}`,
                  ageGroup: enrollment.ageGroup,
                  playerIdentityId: player._id,
                  relationship: link.relationship,
                  isPrimary: link.isPrimary,
                });
              }
            }
          }
        }

        return {
          ...member,
          functionalRoles,
          user: userResult,
          coachAssignments,
          linkedPlayers,
        };
      })
    );

    return membersWithDetails;
  },
});

/**
 * Get all pending invitations for an organization
 * Returns invitations with inviter user details
 */
export const getPendingInvitations = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all pending invitations for the organization
    const invitationsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "invitation",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "status",
            value: "pending",
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    const invitations = invitationsResult.page;

    // Fetch inviter details for each invitation
    const invitationsWithInviter = await Promise.all(
      invitations.map(async (invitation: any) => {
        const inviterResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [
              {
                field: "_id",
                value: invitation.inviterId,
                operator: "eq",
              },
            ],
          }
        );

        // Check if invitation is expired
        const now = Date.now();
        const isExpired = invitation.expiresAt < now;

        return {
          ...invitation,
          inviter: inviterResult,
          isExpired,
        };
      })
    );

    return invitationsWithInviter;
  },
});

/**
 * Update invitation metadata after Better Auth creates it
 * This is a workaround because Better Auth client doesn't support custom metadata
 */
export const updateInvitationMetadata = mutation({
  args: {
    invitationId: v.string(),
    metadata: v.any(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Find the invitation
      const invitationResult = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "invitation",
          where: [
            {
              field: "_id",
              value: args.invitationId,
              operator: "eq",
            },
          ],
        }
      );

      if (!invitationResult) {
        return {
          success: false,
          error: "Invitation not found",
        };
      }

      // Check if this is initial creation or modification
      const oldMetadata = invitationResult.metadata;
      const isInitialCreation =
        !oldMetadata || Object.keys(oldMetadata).length === 0;

      // Get current user for audit trail
      const identity = await ctx.auth.getUserIdentity();
      let currentUser = null;
      if (identity?.email) {
        currentUser = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [
              {
                field: "email",
                value: identity.email,
                operator: "eq",
              },
            ],
          }
        );
      }

      // Update invitation with metadata
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "invitation",
          where: [{ field: "_id", value: args.invitationId, operator: "eq" }],
          update: {
            metadata: args.metadata,
          },
        },
      });

      console.log(
        "[updateInvitationMetadata] Updated invitation",
        args.invitationId,
        "with metadata:",
        args.metadata
      );

      // Log the appropriate event
      if (isInitialCreation) {
        // This is the initial creation with metadata
        await ctx.runMutation(internal.models.members.logInvitationEvent, {
          invitationId: args.invitationId,
          organizationId: invitationResult.organizationId,
          eventType: "created",
          performedBy:
            currentUser?._id || invitationResult.inviterId || "unknown",
          performedByName: currentUser?.name,
          performedByEmail: currentUser?.email,
          metadata: args.metadata,
        });

        // Send invitation email now that metadata is ready
        console.log(
          "[updateInvitationMetadata] Scheduling invitation email for:",
          invitationResult.email
        );

        // Get organization and inviter details
        const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "organization",
          where: [{ field: "_id", value: invitationResult.organizationId }],
        });

        const inviter = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [{ field: "_id", value: invitationResult.inviterId }],
          }
        );

        if (org && inviter) {
          const siteUrl = (
            process.env.SITE_URL ?? "http://localhost:3000"
          ).replace(TRAILING_SLASH_REGEX, "");
          const inviteLink = `${siteUrl}/orgs/accept-invitation/${args.invitationId}`;

          const functionalRoles = args.metadata?.suggestedFunctionalRoles || [];
          const rawTeams = args.metadata?.roleSpecificData?.teams || [];
          const rawPlayers = args.metadata?.suggestedPlayerLinks || [];

          // Fetch team details - metadata may store teams as IDs (strings) or full objects
          const teams = await Promise.all(
            rawTeams.map(async (team: any) => {
              // If team is a string (ID), fetch the full team details
              if (typeof team === "string") {
                const teamData = await ctx.runQuery(
                  components.betterAuth.adapter.findOne,
                  {
                    model: "team",
                    where: [{ field: "_id", value: team, operator: "eq" }],
                  }
                );
                if (teamData) {
                  const cleaned: any = {
                    id: teamData._id,
                    name: teamData.name,
                  };
                  if (teamData.sport) {
                    cleaned.sport = teamData.sport;
                  }
                  if (teamData.ageGroup) {
                    cleaned.ageGroup = teamData.ageGroup;
                  }
                  return cleaned;
                }
                return null;
              }
              // Team is already an object with details
              const cleaned: any = {
                id: team.id,
                name: team.name,
              };
              if (team.sport !== undefined) {
                cleaned.sport = team.sport;
              }
              if (team.ageGroup !== undefined) {
                cleaned.ageGroup = team.ageGroup;
              }
              return cleaned;
            })
          ).then((results) => results.filter(Boolean));

          // Fetch player details - metadata may store players as IDs (strings) or full objects
          const players = await Promise.all(
            rawPlayers.map(async (player: any) => {
              // If player is a string (ID), fetch the full player details
              if (typeof player === "string") {
                const playerData = await ctx.db.get(player as any);
                if (playerData) {
                  const cleaned: any = {
                    id: playerData._id,
                    name: `${(playerData as any).firstName} ${(playerData as any).lastName}`,
                  };
                  if ((playerData as any).ageGroup) {
                    cleaned.ageGroup = (playerData as any).ageGroup;
                  }
                  return cleaned;
                }
                return null;
              }
              // Player is already an object with details
              const cleaned: any = {
                id: player.id,
                name: player.name,
              };
              if (player.ageGroup !== undefined) {
                cleaned.ageGroup = player.ageGroup;
              }
              return cleaned;
            })
          ).then((results) => results.filter(Boolean));

          // Schedule action to send email
          const actionRef = (internal.actions as any).invitations
            ?.resendInvitationEmail;
          if (actionRef) {
            await ctx.scheduler.runAfter(0, actionRef, {
              email: invitationResult.email,
              invitedByUsername: inviter.name || "Someone",
              invitedByEmail: inviter.email,
              organizationName: org.name,
              inviteLink,
              functionalRoles,
              teams,
              players,
            });
            console.log("[updateInvitationMetadata] Email action scheduled");
          }
        }
      } else {
        // This is a modification of existing invitation
        await ctx.runMutation(internal.models.members.logInvitationEvent, {
          invitationId: args.invitationId,
          organizationId: invitationResult.organizationId,
          eventType: "modified",
          performedBy: currentUser?._id || "unknown",
          performedByName: currentUser?.name,
          performedByEmail: currentUser?.email,
          changes: {
            field: "metadata",
            oldValue: oldMetadata,
            newValue: args.metadata,
          },
        });
      }

      return {
        success: true,
      };
    } catch (error: any) {
      console.error("[updateInvitationMetadata] Error:", error);
      return {
        success: false,
        error: error.message || "Failed to update invitation metadata",
      };
    }
  },
});

/**
 * Helper: Log an invitation event to the audit trail
 * This creates a record in invitationEvents table for tracking invitation lifecycle
 */
export const logInvitationEvent = internalMutation({
  args: {
    invitationId: v.string(),
    organizationId: v.string(),
    eventType: v.union(
      v.literal("created"),
      v.literal("resent"),
      v.literal("modified"),
      v.literal("cancelled"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("expired")
    ),
    performedBy: v.string(), // User ID
    performedByName: v.optional(v.string()),
    performedByEmail: v.optional(v.string()),
    changes: v.optional(
      v.object({
        field: v.string(),
        oldValue: v.any(),
        newValue: v.any(),
      })
    ),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("invitationEvents", {
      invitationId: args.invitationId,
      organizationId: args.organizationId,
      eventType: args.eventType,
      performedBy: args.performedBy,
      performedByName: args.performedByName,
      performedByEmail: args.performedByEmail,
      timestamp: Date.now(),
      changes: args.changes,
      metadata: args.metadata,
    });
    return null;
  },
});

/**
 * Get invitation events history (audit trail)
 * Returns all events for a given invitation in chronological order
 */
export const getInvitationEvents = query({
  args: {
    invitationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("invitationEvents"),
      _creationTime: v.number(),
      invitationId: v.string(),
      organizationId: v.string(),
      eventType: v.union(
        v.literal("created"),
        v.literal("resent"),
        v.literal("modified"),
        v.literal("cancelled"),
        v.literal("accepted"),
        v.literal("rejected"),
        v.literal("expired")
      ),
      performedBy: v.string(),
      performedByName: v.optional(v.string()),
      performedByEmail: v.optional(v.string()),
      timestamp: v.number(),
      changes: v.optional(
        v.object({
          field: v.string(),
          oldValue: v.any(),
          newValue: v.any(),
        })
      ),
      metadata: v.optional(v.any()),
    })
  ),
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("invitationEvents")
      .withIndex("by_invitationId", (q) =>
        q.eq("invitationId", args.invitationId)
      )
      .collect();

    // Sort by timestamp ascending (chronological order)
    return events.sort((a, b) => a.timestamp - b.timestamp);
  },
});

/**
 * Cancel a pending invitation
 */
export const cancelInvitation = mutation({
  args: {
    invitationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find the invitation
    const invitationResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "invitation",
        where: [
          {
            field: "_id",
            value: args.invitationId,
            operator: "eq",
          },
        ],
      }
    );

    if (!invitationResult) {
      throw new Error("Invitation not found");
    }

    if (invitationResult.status !== "pending") {
      throw new Error("Only pending invitations can be cancelled");
    }

    // Get current user for audit trail
    const identity = await ctx.auth.getUserIdentity();
    let currentUser = null;
    if (identity?.email) {
      currentUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [
          {
            field: "email",
            value: identity.email,
            operator: "eq",
          },
        ],
      });
    }

    // Update invitation status to cancelled
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "invitation",
        where: [{ field: "_id", value: args.invitationId, operator: "eq" }],
        update: {
          status: "cancelled",
        },
      },
    });

    // Log the cancellation event
    await ctx.runMutation(internal.models.members.logInvitationEvent, {
      invitationId: args.invitationId,
      organizationId: invitationResult.organizationId,
      eventType: "cancelled",
      performedBy: currentUser?._id || "unknown",
      performedByName: currentUser?.name,
      performedByEmail: currentUser?.email,
    });

    return null;
  },
});

/**
 * Get invitation details by invitation ID
 * Returns invitation with organization and inviter details
 */
export const getInvitationById = query({
  args: {
    invitationId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.string(),
      email: v.string(),
      role: v.union(v.string(), v.null()),
      organizationId: v.string(),
      organizationName: v.union(v.string(), v.null()),
      inviterName: v.union(v.string(), v.null()),
      status: v.string(),
      expiresAt: v.number(),
      isExpired: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Find the invitation
    const invitationResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "invitation",
        where: [
          {
            field: "_id",
            value: args.invitationId,
            operator: "eq",
          },
        ],
      }
    );

    if (!invitationResult) {
      return null;
    }

    // Get organization details
    const orgResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "organization",
        where: [
          {
            field: "_id",
            value: invitationResult.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    // Get inviter details
    const inviterResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "_id",
            value: invitationResult.inviterId,
            operator: "eq",
          },
        ],
      }
    );

    // Check if invitation is expired
    const now = Date.now();
    const isExpired = invitationResult.expiresAt < now;

    return {
      _id: invitationResult._id,
      email: invitationResult.email,
      role: invitationResult.role || null,
      organizationId: invitationResult.organizationId,
      organizationName: orgResult?.name || null,
      inviterName: inviterResult?.name || null,
      status: invitationResult.status,
      expiresAt: invitationResult.expiresAt,
      isExpired,
    };
  },
});

/**
 * Get all pending invitations for the current user by email
 * Used for auto-detecting invitations on login/signup
 * Returns invitations with organization details and functional roles
 */
export const getPendingInvitationsByEmail = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.string(),
      organizationId: v.string(),
      organizationName: v.string(),
      email: v.string(),
      role: v.union(v.string(), v.null()),
      functionalRoles: v.array(v.string()),
      teams: v.array(
        v.object({
          _id: v.string(),
          name: v.string(),
          ageGroup: v.union(v.string(), v.null()),
        })
      ),
      players: v.array(
        v.object({
          _id: v.string(),
          firstName: v.string(),
          lastName: v.string(),
        })
      ),
      expiresAt: v.number(),
      isExpired: v.boolean(),
    })
  ),
  handler: async (ctx, _args) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return [];
    }

    // Find all pending invitations for this email
    const invitationsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "invitation",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "email",
            value: identity.email.toLowerCase(),
            operator: "eq",
          },
          {
            field: "status",
            value: "pending",
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    // Enrich with organization details and assignments
    const enriched = await Promise.all(
      invitationsResult.page.map(async (inv: any) => {
        const orgResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "organization",
            where: [
              {
                field: "_id",
                value: inv.organizationId,
                operator: "eq",
              },
            ],
          }
        );

        const metadata = inv.metadata || {};
        const functionalRoles = metadata.suggestedFunctionalRoles || [];

        // Fetch team details for coaches
        let teams = [];
        const teamData = metadata.roleSpecificData?.teams || [];
        if (teamData.length > 0) {
          teams = await Promise.all(
            teamData.map(async (team: any) => {
              // Extract ID from team object (Phase 1 stores full objects now)
              // Handle both 'id' and '_id' properties (edit modal uses '_id', invite form uses 'id')
              const teamId =
                typeof team === "string" ? team : team.id || team._id;
              const teamResult = await ctx.runQuery(
                components.betterAuth.adapter.findOne,
                {
                  model: "team",
                  where: [
                    {
                      field: "_id",
                      value: teamId,
                      operator: "eq",
                    },
                  ],
                }
              );

              if (teamResult) {
                return {
                  _id: teamResult._id,
                  name: teamResult.name,
                  ageGroup: teamResult.ageGroup || null,
                };
              }
              return null;
            })
          ).then((results) => results.filter(Boolean));
        }

        // Fetch player details for parents
        let players = [];
        const playerData = metadata.suggestedPlayerLinks || [];
        if (playerData.length > 0) {
          players = await Promise.all(
            playerData.map(async (player: any) => {
              // Extract ID from player object (Phase 1 stores full objects now)
              const playerId = typeof player === "string" ? player : player.id;
              const playerRecord = await ctx.db.get(playerId as any);
              if (playerRecord) {
                return {
                  _id: playerRecord._id,
                  firstName: (playerRecord as any).firstName,
                  lastName: (playerRecord as any).lastName,
                };
              }
              return null;
            })
          ).then((results) => results.filter(Boolean));
        }

        return {
          _id: inv._id,
          organizationId: inv.organizationId,
          organizationName: orgResult?.name || "Unknown",
          email: inv.email,
          role: inv.role || null,
          functionalRoles,
          teams,
          players,
          expiresAt: inv.expiresAt,
          isExpired: inv.expiresAt < Date.now(),
        };
      })
    );

    // Filter out expired invitations
    return enriched.filter((i) => !i.isExpired);
  },
});

/**
 * Get pending invitations with detailed assignments for admin UI
 * Enriches invitations with team assignments (for coaches) and player links (for parents)
 * Also includes resend history and functional roles
 */
export const getPendingInvitationsWithAssignments = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      email: v.string(),
      role: v.union(v.string(), v.null()),
      functionalRoles: v.array(v.string()),
      teams: v.array(
        v.object({
          _id: v.string(),
          name: v.string(),
          ageGroup: v.union(v.string(), v.null()),
        })
      ),
      players: v.array(
        v.object({
          _id: v.string(),
          firstName: v.string(),
          lastName: v.string(),
        })
      ),
      inviter: v.object({ name: v.union(v.string(), v.null()) }),
      sentAt: v.number(),
      expiresAt: v.number(),
      isExpired: v.boolean(),
      resendCount: v.number(),
      resendHistory: v.array(
        v.object({
          resentAt: v.number(),
          resentByName: v.string(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    // Get all pending invitations for the organization
    const invitations: any[] = await ctx.runQuery(
      api.models.members.getPendingInvitations,
      args
    );

    // Enrich with assignments
    const enriched: any[] = await Promise.all(
      invitations.map(async (inv: any) => {
        const metadata = inv.metadata || {};

        // Debug logging
        console.log(
          "[getPendingInvitationsWithAssignments] Processing invitation:",
          {
            invitationId: inv._id,
            email: inv.email,
            hasMetadata: !!inv.metadata,
            metadata,
          }
        );

        // Extract functional roles
        const functionalRoles = metadata.suggestedFunctionalRoles || [];

        console.log(
          "[getPendingInvitationsWithAssignments] Extracted functionalRoles:",
          functionalRoles
        );

        // Fetch team details for coaches
        let teams = [];
        const teamData = metadata.roleSpecificData?.teams || [];
        if (teamData.length > 0) {
          teams = await Promise.all(
            teamData.map(async (team: any) => {
              // Extract ID from team object (Phase 1 stores full objects now)
              // Handle both 'id' and '_id' properties (edit modal uses '_id', invite form uses 'id')
              const teamId =
                typeof team === "string" ? team : team.id || team._id;
              const teamResult = await ctx.runQuery(
                components.betterAuth.adapter.findOne,
                {
                  model: "team",
                  where: [
                    {
                      field: "_id",
                      value: teamId,
                      operator: "eq",
                    },
                  ],
                }
              );

              if (teamResult) {
                return {
                  _id: teamResult._id,
                  name: teamResult.name,
                  ageGroup: teamResult.ageGroup || null,
                };
              }
              return null;
            })
          ).then((results) => results.filter(Boolean));
        }

        // Fetch player details for parents
        let players = [];
        const playerData = metadata.suggestedPlayerLinks || [];
        if (playerData.length > 0) {
          players = await Promise.all(
            playerData.map(async (player: any) => {
              // Extract ID from player object (Phase 1 stores full objects now)
              const playerId = typeof player === "string" ? player : player.id;
              const playerRecord = await ctx.db.get(playerId as any);
              if (playerRecord) {
                return {
                  _id: playerRecord._id,
                  firstName: (playerRecord as any).firstName,
                  lastName: (playerRecord as any).lastName,
                };
              }
              return null;
            })
          ).then((results) => results.filter(Boolean));
        }

        // Extract resend history
        const resendHistory = (metadata.resendHistory || []).map(
          (resend: any) => ({
            resentAt: resend.resentAt,
            resentByName: resend.resentByName,
          })
        );

        return {
          _id: inv._id,
          email: inv.email,
          role: inv.role || null,
          functionalRoles,
          teams,
          players,
          inviter: { name: inv.inviter?.name || null },
          sentAt: inv._creationTime || Date.now(),
          expiresAt: inv.expiresAt,
          isExpired: inv.isExpired,
          resendCount: resendHistory.length,
          resendHistory,
        };
      })
    );

    return enriched;
  },
});

/**
 * Migration: Convert legacy Better Auth roles to new architecture
 *
 * This migration:
 * - Converts members with role "coach" or "parent" to role "member"
 * - Preserves their capabilities in the functionalRoles array
 *
 * Run this once per organization after deploying the new role architecture.
 * See: docs/COMPREHENSIVE_AUTH_PLAN.md
 */
export const migrateCoachParentRolesToMember = mutation({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    migrated: v.number(),
    skipped: v.number(),
    details: v.array(
      v.object({
        email: v.string(),
        oldRole: v.string(),
        newFunctionalRoles: v.array(v.string()),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Get all members for the organization
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    let migrated = 0;
    let skipped = 0;
    const details: Array<{
      email: string;
      oldRole: string;
      newFunctionalRoles: string[];
    }> = [];

    for (const member of membersResult.page) {
      const betterAuthRole = member.role;
      const currentFunctionalRoles = (member as any).functionalRoles || [];

      // Get user email for logging
      const userResult = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "user",
          where: [
            {
              field: "_id",
              value: member.userId,
              operator: "eq",
            },
          ],
        }
      );
      const email = userResult?.email || "unknown";

      // Only migrate members with role "coach" or "parent"
      if (betterAuthRole === "coach" || betterAuthRole === "parent") {
        // Determine new functional roles
        const newFunctionalRoles: ("coach" | "parent" | "admin")[] = [
          ...currentFunctionalRoles,
        ];
        if (
          !newFunctionalRoles.includes(betterAuthRole as "coach" | "parent")
        ) {
          newFunctionalRoles.push(betterAuthRole as "coach" | "parent");
        }

        // Update member: change role to "member" and set functional roles
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "member",
            where: [{ field: "_id", value: member._id, operator: "eq" }],
            update: {
              role: "member",
              functionalRoles: newFunctionalRoles,
            },
          },
        });

        migrated += 1;
        details.push({
          email,
          oldRole: betterAuthRole,
          newFunctionalRoles,
        });
      } else {
        skipped += 1;
      }
    }

    return { migrated, skipped, details };
  },
});

/**
 * Sync functional roles from invitation metadata after accepting an invitation
 *
 * This is called by the invitation acceptance page after the user accepts.
 * It reads the invitation metadata and:
 * 1. Assigns the suggested functional roles to the member
 * 2. Creates coach assignments if teams were specified
 * 3. Links parent to players if player IDs were specified
 *
 * Note: This exists because Better Auth hooks run in read-only context,
 * so we can't modify member data directly in afterAcceptInvitation.
 */
export const syncFunctionalRolesFromInvitation = mutation({
  args: {
    invitationId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    userEmail: v.string(), // Needed for parent-player linking
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    functionalRolesAssigned: v.array(
      v.union(v.literal("coach"), v.literal("parent"), v.literal("admin"))
    ),
    coachTeamsAssigned: v.number(),
    playersLinked: v.number(),
  }),
  handler: async (ctx, args) => {
    const { userId, userEmail } = args;

    // Find the invitation to get metadata
    const invitationResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "invitation",
        where: [
          {
            field: "_id",
            value: args.invitationId,
            operator: "eq",
          },
        ],
      }
    );

    if (!invitationResult) {
      console.error(
        "[syncFunctionalRolesFromInvitation] ERROR: Invitation not found:",
        args.invitationId
      );
      return {
        success: false,
        error: "Invitation not found in database",
        functionalRolesAssigned: [],
        coachTeamsAssigned: 0,
        playersLinked: 0,
      };
    }

    // Extract metadata
    const metadata = invitationResult.metadata as any;
    console.log(
      "[syncFunctionalRolesFromInvitation] Invitation metadata:",
      JSON.stringify(metadata, null, 2)
    );

    const suggestedRoles: ("coach" | "parent" | "admin")[] =
      metadata?.suggestedFunctionalRoles || [];
    const roleSpecificData = metadata?.roleSpecificData || {};
    // suggestedPlayerLinks can be either string[] (legacy) or object[] with {id, name, relationship}
    const rawPlayerLinks = metadata?.suggestedPlayerLinks || [];
    const suggestedPlayerLinks: Array<{
      id: string;
      name?: string;
      relationship?: string;
    }> = rawPlayerLinks.map(
      (link: string | { id: string; name?: string; relationship?: string }) =>
        typeof link === "string" ? { id: link } : link
    );

    console.log(
      "[syncFunctionalRolesFromInvitation] Extracted data:",
      `suggestedRoles: ${JSON.stringify(suggestedRoles)}`,
      `teams: ${JSON.stringify(roleSpecificData.teams)}`,
      `playerLinks: ${JSON.stringify(suggestedPlayerLinks)}`
    );

    // Check if there's actually any data to sync
    if (
      suggestedRoles.length === 0 &&
      (!roleSpecificData.teams || roleSpecificData.teams.length === 0) &&
      suggestedPlayerLinks.length === 0
    ) {
      console.warn(
        "[syncFunctionalRolesFromInvitation] WARNING: No metadata found in invitation. User will have no roles assigned."
      );
      return {
        success: true, // Not an error - invitation just had no metadata
        error: "No roles or assignments specified in invitation",
        functionalRolesAssigned: [],
        coachTeamsAssigned: 0,
        playersLinked: 0,
      };
    }

    let coachTeamsAssigned = 0;
    let playersLinked = 0;

    // Find the member record for this user in this organization
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "userId",
            value: userId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!memberResult) {
      console.error(
        "[syncFunctionalRolesFromInvitation] ERROR: Member not found for user:",
        userId,
        "in organization:",
        args.organizationId
      );
      return {
        success: false,
        error:
          "Member record not found. Please ensure the invitation was accepted properly.",
        functionalRolesAssigned: [],
        coachTeamsAssigned: 0,
        playersLinked: 0,
      };
    }

    // 1. Update member with functional roles
    if (suggestedRoles.length > 0) {
      const currentRoles: ("coach" | "parent" | "admin")[] =
        (memberResult as any).functionalRoles || [];
      const newRoles = [...new Set([...currentRoles, ...suggestedRoles])] as (
        | "coach"
        | "parent"
        | "admin"
      )[];

      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "member",
          where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
          update: {
            functionalRoles: newRoles,
          },
        },
      });

      console.log(
        "[syncFunctionalRolesFromInvitation] Assigned functional roles:",
        suggestedRoles,
        "to user:",
        userId
      );
    }

    // 2. Create coach assignments if coach role with teams
    if (
      suggestedRoles.includes("coach") &&
      roleSpecificData.teams?.length > 0
    ) {
      // Extract team IDs from team objects (roleSpecificData.teams contains objects with id, name, etc.)
      // Handle both 'id' and '_id' properties (edit modal uses '_id', invite form uses 'id')
      // biome-ignore lint/suspicious/noExplicitAny: Team metadata structure varies
      const teams: string[] = roleSpecificData.teams.map((t: any) =>
        typeof t === "string" ? t : t.id || t._id
      );

      // Check if coach assignment already exists
      const existingAssignment = await ctx.db
        .query("coachAssignments")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", userId).eq("organizationId", args.organizationId)
        )
        .first();

      if (existingAssignment) {
        // Merge teams
        const mergedTeams = [
          ...new Set([...existingAssignment.teams, ...teams]),
        ];
        await ctx.db.patch(existingAssignment._id, {
          teams: mergedTeams,
          updatedAt: Date.now(),
        });
        coachTeamsAssigned = teams.length;
      } else {
        // Create new assignment
        await ctx.db.insert("coachAssignments", {
          userId,
          organizationId: args.organizationId,
          teams,
          ageGroups: [], // Will be populated based on teams later
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        coachTeamsAssigned = teams.length;
      }

      console.log(
        "[syncFunctionalRolesFromInvitation] Created coach assignment with teams:",
        teams
      );
    }

    // 3. Link parent to players if parent role
    if (suggestedRoles.includes("parent") && userEmail) {
      const normalizedEmail = userEmail.toLowerCase().trim();

      // 3a. Find or create guardian identity for this parent
      let guardian = await ctx.db
        .query("guardianIdentities")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .first();

      if (!guardian) {
        // Create guardian identity - get user info if available via Better Auth
        const userResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [
              {
                field: "email",
                value: normalizedEmail,
                operator: "eq",
              },
            ],
          }
        );

        const guardianId = await ctx.db.insert("guardianIdentities", {
          firstName: userResult?.name?.split(" ")[0] || "",
          lastName: userResult?.name?.split(" ").slice(1).join(" ") || "",
          email: normalizedEmail,
          phone: undefined, // Phone not reliably available from Better Auth user
          verificationStatus: "unverified", // Changed from email_verified - parent must claim
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdFrom: "invitation",
          // userId NOT set - parent must claim via modal (Option B)
        });
        guardian = await ctx.db.get(guardianId);
        console.log(
          "[syncFunctionalRolesFromInvitation] Created guardian identity:",
          guardianId,
          "- parent must claim via modal (Option B)"
        );
      }

      // Option B behavior: Don't auto-link guardian identity
      // Parent must explicitly claim via batched modal
      // Only exception: Self-assignment in Add Guardian flow (handled separately)
      if (guardian && !guardian.userId) {
        console.log(
          "[syncFunctionalRolesFromInvitation] Guardian identity exists but not auto-linked (Option B):",
          guardian._id,
          "- parent must claim to access children"
        );
      }

      if (guardian) {
        // 3b. Link specific players from invitation metadata using new identity system
        if (suggestedPlayerLinks.length > 0) {
          console.log(
            "[syncFunctionalRolesFromInvitation] Linking specific players:",
            suggestedPlayerLinks
          );

          for (const playerLink of suggestedPlayerLinks) {
            const playerIdentityId = playerLink.id;
            // Validate relationship is one of the allowed values
            const validRelationships = [
              "mother",
              "father",
              "guardian",
              "grandparent",
              "other",
            ] as const;
            type RelationshipType = (typeof validRelationships)[number];
            const rawRelationship = playerLink.relationship || "guardian";
            const relationship: RelationshipType = validRelationships.includes(
              rawRelationship as RelationshipType
            )
              ? (rawRelationship as RelationshipType)
              : "guardian";

            try {
              // Verify the player identity exists
              const playerIdentity = await ctx.db.get(
                playerIdentityId as Id<"playerIdentities">
              );
              if (!playerIdentity) {
                console.warn(
                  "[syncFunctionalRolesFromInvitation] Player identity not found:",
                  playerIdentityId
                );
                continue;
              }

              // Check player is enrolled in this organization
              const enrollment = await ctx.db
                .query("orgPlayerEnrollments")
                .withIndex("by_player_and_org", (q) =>
                  q
                    .eq(
                      "playerIdentityId",
                      playerIdentityId as Id<"playerIdentities">
                    )
                    .eq("organizationId", args.organizationId)
                )
                .first();

              if (!enrollment || enrollment.status !== "active") {
                console.warn(
                  "[syncFunctionalRolesFromInvitation] Player not actively enrolled in org:",
                  playerIdentityId,
                  "enrollment:",
                  enrollment?.status
                );
                continue;
              }

              // Check if link already exists
              const existingLink = await ctx.db
                .query("guardianPlayerLinks")
                .withIndex("by_guardian_and_player", (q) =>
                  q
                    .eq("guardianIdentityId", guardian?._id)
                    .eq(
                      "playerIdentityId",
                      playerIdentityId as Id<"playerIdentities">
                    )
                )
                .first();

              if (existingLink) {
                console.log(
                  "[syncFunctionalRolesFromInvitation] Link already exists for player:",
                  playerIdentityId
                );
                playersLinked += 1;
                continue;
              }

              // Determine if this should be primary (first guardian for player)
              const existingGuardians = await ctx.db
                .query("guardianPlayerLinks")
                .withIndex("by_player", (q) =>
                  q.eq(
                    "playerIdentityId",
                    playerIdentityId as Id<"playerIdentities">
                  )
                )
                .collect();
              const shouldBePrimary = existingGuardians.length === 0;

              // Create the guardian-player link
              await ctx.db.insert("guardianPlayerLinks", {
                guardianIdentityId: guardian._id,
                playerIdentityId: playerIdentityId as Id<"playerIdentities">,
                relationship,
                isPrimary: shouldBePrimary,
                hasParentalResponsibility: true,
                canCollectFromTraining: true,
                consentedToSharing: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });

              playersLinked += 1;
              console.log(
                "[syncFunctionalRolesFromInvitation] Created guardian-player link:",
                guardian._id,
                "->",
                playerIdentityId,
                `(${playerIdentity.firstName} ${playerIdentity.lastName})`,
                `relationship: ${relationship}`,
                `isPrimary: ${shouldBePrimary}`
              );
            } catch (error) {
              console.error(
                "[syncFunctionalRolesFromInvitation] Error linking player:",
                playerIdentityId,
                error
              );
            }
          }

          console.log(
            "[syncFunctionalRolesFromInvitation] Linked",
            playersLinked,
            "specific players to parent:",
            userEmail
          );
        }

        // 3c. Also run auto-link to catch any additional matches by email
        try {
          const autoLinkResult = await ctx.runMutation(
            internal.models.guardianPlayerLinks
              .autoLinkGuardianToPlayersInternal,
            {
              guardianEmail: normalizedEmail,
              organizationId: args.organizationId,
            }
          );

          if (autoLinkResult.linked > 0) {
            console.log(
              "[syncFunctionalRolesFromInvitation] Auto-linked",
              autoLinkResult.linked,
              "additional players via email matching:",
              autoLinkResult.playerNames.join(", ")
            );
          }
        } catch (error) {
          console.error(
            "[syncFunctionalRolesFromInvitation] Error in auto-link:",
            error
          );
        }
      } else {
        console.error(
          "[syncFunctionalRolesFromInvitation] Failed to create guardian identity for:",
          normalizedEmail
        );
      }
    }

    // Log the acceptance event
    await ctx.runMutation(internal.models.members.logInvitationEvent, {
      invitationId: args.invitationId,
      organizationId: args.organizationId,
      eventType: "accepted",
      performedBy: args.userId,
      performedByEmail: args.userEmail,
      metadata: {
        functionalRolesAssigned: suggestedRoles,
        coachTeamsAssigned,
        playersLinked,
      },
    });

    return {
      success: true,
      functionalRolesAssigned: suggestedRoles,
      coachTeamsAssigned,
      playersLinked,
    };
  },
});

/**
 * Switch active functional role for a member in an organization
 * Used by the OrgRoleSwitcher component to change which role the user is "using"
 */
export const switchActiveFunctionalRole = mutation({
  args: {
    organizationId: v.string(),
    functionalRole: v.union(
      v.literal("coach"),
      v.literal("parent"),
      v.literal("admin"),
      v.literal("player")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Not authenticated");
    }

    // Find user by email
    const userResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "email",
            value: identity.email,
            operator: "eq",
          },
        ],
      }
    );

    if (!userResult) {
      throw new Error("User not found");
    }

    // Find the member record
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "userId",
            value: userResult._id,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!memberResult) {
      throw new Error("Member not found in this organization");
    }

    // Verify user has this functional role
    const functionalRoles: ("coach" | "parent" | "admin" | "player")[] =
      (memberResult as any).functionalRoles || [];
    if (!functionalRoles.includes(args.functionalRole)) {
      throw new Error(
        `You don't have the ${args.functionalRole} role in this organization`
      );
    }

    // Update lastAccessedOrgs to track recently accessed organizations
    // This enables "recently accessed" sorting in the role switcher UI
    const currentLastAccessed = (memberResult as any).lastAccessedOrgs || [];
    const now = Date.now();

    // Remove old record for this org if it exists, then add new record with current timestamp
    const updatedLastAccessed = [
      ...currentLastAccessed.filter(
        (record: { orgId: string; timestamp: number; role: string }) =>
          record.orgId !== args.organizationId
      ),
      {
        orgId: args.organizationId,
        timestamp: now,
        role: args.functionalRole,
      },
    ];

    // Update active functional role and lastAccessedOrgs
    // Note: These are custom fields not in Better Auth schema, so we cast to any
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
        update: {
          activeFunctionalRole: args.functionalRole,
          lastAccessedOrgs: updatedLastAccessed,
        } as any,
      },
    });

    console.log(
      `[switchActiveFunctionalRole] Switched to ${args.functionalRole} for user ${userResult._id} in org ${args.organizationId}`
    );
    return null;
  },
});

/**
 * Get member's active functional role for an organization
 * Returns the active role if set, otherwise returns first role by priority (coach > admin > parent)
 */
export const getActiveFunctionalRole = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.union(
    v.literal("coach"),
    v.literal("parent"),
    v.literal("admin"),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return null;
    }

    // Find user by email
    const userResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "email",
            value: identity.email,
            operator: "eq",
          },
        ],
      }
    );

    if (!userResult) {
      return null;
    }

    // Find member record
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "userId",
            value: userResult._id,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!memberResult) {
      return null;
    }

    const functionalRoles: ("coach" | "parent" | "admin")[] =
      (memberResult as any).functionalRoles || [];
    if (functionalRoles.length === 0) {
      return null;
    }

    // Return active role if set and still valid
    const activeRole = (memberResult as any).activeFunctionalRole as
      | "coach"
      | "parent"
      | "admin"
      | undefined;
    if (activeRole && functionalRoles.includes(activeRole)) {
      return activeRole;
    }

    // Fallback: return first role by priority (coach > admin > parent)
    const priority: ("coach" | "admin" | "parent")[] = [
      "coach",
      "admin",
      "parent",
    ];
    for (const role of priority) {
      if (functionalRoles.includes(role)) {
        return role;
      }
    }

    return functionalRoles[0];
  },
});

/**
 * Get all memberships for the current user across all organizations
 * Used by OrgRoleSwitcher to show all orgs and roles in one dropdown
 */
export const getMembersForAllOrganizations = query({
  args: {},
  returns: v.array(
    v.object({
      organizationId: v.string(),
      organizationName: v.union(v.string(), v.null()),
      organizationLogo: v.union(v.string(), v.null()),
      functionalRoles: v.array(
        v.union(
          v.literal("coach"),
          v.literal("parent"),
          v.literal("admin"),
          v.literal("player")
        )
      ),
      activeFunctionalRole: v.union(
        v.literal("coach"),
        v.literal("parent"),
        v.literal("admin"),
        v.literal("player"),
        v.null()
      ),
      pendingRoleRequests: v.array(
        v.object({
          role: v.union(
            v.literal("coach"),
            v.literal("parent"),
            v.literal("admin"),
            v.literal("player")
          ),
          requestedAt: v.string(),
        })
      ),
      betterAuthRole: v.string(),
    })
  ),
  handler: async (ctx) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return [];
    }

    // Find user by email
    const userResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "email",
            value: identity.email,
            operator: "eq",
          },
        ],
      }
    );

    if (!userResult) {
      return [];
    }

    // Get all memberships for this user
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "userId",
            value: userResult._id,
            operator: "eq",
          },
        ],
      }
    );

    // Get organization details for each membership
    const memberships = await Promise.all(
      membersResult.page.map(async (member: Member) => {
        const orgResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "organization",
            where: [
              {
                field: "_id",
                value: member.organizationId,
                operator: "eq",
              },
            ],
          }
        );

        const functionalRoles: ("coach" | "parent" | "admin")[] =
          (member as any).functionalRoles || [];
        const activeRole = (member as any).activeFunctionalRole as
          | "coach"
          | "parent"
          | "admin"
          | undefined;
        const pendingRequests: Array<{
          role: "coach" | "parent" | "admin";
          requestedAt: string;
        }> = ((member as any).pendingFunctionalRoleRequests || []).map(
          (req: { role: string; requestedAt: string }) => ({
            role: req.role as "coach" | "parent" | "admin",
            requestedAt: req.requestedAt,
          })
        );

        // Determine effective active role (set or fallback to priority)
        let effectiveActiveRole: "coach" | "parent" | "admin" | null = null;
        if (activeRole && functionalRoles.includes(activeRole)) {
          effectiveActiveRole = activeRole;
        } else if (functionalRoles.length > 0) {
          // Fallback to priority
          const priority: ("coach" | "admin" | "parent")[] = [
            "coach",
            "admin",
            "parent",
          ];
          for (const role of priority) {
            if (functionalRoles.includes(role)) {
              effectiveActiveRole = role;
              break;
            }
          }
          if (!effectiveActiveRole) {
            effectiveActiveRole = functionalRoles[0];
          }
        }

        return {
          organizationId: member.organizationId,
          organizationName: (orgResult?.name as string) || null,
          organizationLogo: (orgResult?.logo as string) || null,
          functionalRoles,
          activeFunctionalRole: effectiveActiveRole,
          pendingRoleRequests: pendingRequests,
          betterAuthRole: member.role,
        };
      })
    );

    return memberships;
  },
});

// ============ ROLE REQUEST SYSTEM ============

/**
 * Request an additional functional role within an organization
 * The request is stored on the member record for admin review
 */
export const requestFunctionalRole = mutation({
  args: {
    organizationId: v.string(),
    role: v.union(
      v.literal("coach"),
      v.literal("parent"),
      v.literal("admin"),
      v.literal("player")
    ),
    // Optional role-specific data
    message: v.optional(v.string()), // Why they need this role
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Not authenticated");
    }

    // Find user by email
    const userResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "email",
            value: identity.email,
            operator: "eq",
          },
        ],
      }
    );

    if (!userResult) {
      throw new Error("User not found");
    }

    // Find member record
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "userId",
            value: userResult._id,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!memberResult) {
      throw new Error("You are not a member of this organization");
    }

    // Check if user already has this role
    const functionalRoles: ("coach" | "parent" | "admin" | "player")[] =
      (memberResult as any).functionalRoles || [];
    if (functionalRoles.includes(args.role)) {
      throw new Error(`You already have the ${args.role} role`);
    }

    // Check if user already has a pending request for this role
    const pendingRequests: Array<{
      role: string;
      requestedAt: string;
      message?: string;
    }> = (memberResult as any).pendingFunctionalRoleRequests || [];

    if (pendingRequests.some((req) => req.role === args.role)) {
      throw new Error(
        `You already have a pending request for the ${args.role} role`
      );
    }

    // Add the new request
    const newRequest = {
      role: args.role,
      requestedAt: new Date().toISOString(),
      message: args.message,
    };

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
        update: {
          pendingFunctionalRoleRequests: [...pendingRequests, newRequest],
        } as any,
      },
    });

    console.log(
      `[requestFunctionalRole] User ${userResult._id} requested ${args.role} role in org ${args.organizationId}`
    );
    return null;
  },
});

/**
 * Cancel a pending functional role request
 */
export const cancelFunctionalRoleRequest = mutation({
  args: {
    organizationId: v.string(),
    role: v.union(
      v.literal("coach"),
      v.literal("parent"),
      v.literal("admin"),
      v.literal("player")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Not authenticated");
    }

    // Find user by email
    const userResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "email",
            value: identity.email,
            operator: "eq",
          },
        ],
      }
    );

    if (!userResult) {
      throw new Error("User not found");
    }

    // Find member record
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "userId",
            value: userResult._id,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!memberResult) {
      throw new Error("Member not found");
    }

    // Remove the pending request
    const pendingRequests: Array<{ role: string }> =
      (memberResult as any).pendingFunctionalRoleRequests || [];
    const updatedRequests = pendingRequests.filter(
      (req) => req.role !== args.role
    );

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
        update: {
          pendingFunctionalRoleRequests: updatedRequests,
        } as any,
      },
    });

    return null;
  },
});

/**
 * Get all pending functional role requests for an organization (admin only)
 */
export const getPendingFunctionalRoleRequests = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      memberId: v.string(),
      userId: v.string(),
      userName: v.union(v.string(), v.null()),
      userEmail: v.union(v.string(), v.null()),
      userImage: v.union(v.string(), v.null()),
      currentRoles: v.array(
        v.union(v.literal("coach"), v.literal("parent"), v.literal("admin"))
      ),
      requestedRole: v.union(
        v.literal("coach"),
        v.literal("parent"),
        v.literal("admin"),
        v.literal("player")
      ),
      requestedAt: v.string(),
      message: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    // Get all members of the organization
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    const pendingRequests: Array<{
      memberId: string;
      userId: string;
      userName: string | null;
      userEmail: string | null;
      userImage: string | null;
      currentRoles: ("coach" | "parent" | "admin")[];
      requestedRole: "coach" | "parent" | "admin" | "player";
      requestedAt: string;
      message: string | null;
    }> = [];

    for (const member of membersResult.page as Member[]) {
      const requests: Array<{
        role: "coach" | "parent" | "admin" | "player";
        requestedAt: string;
        message?: string;
      }> = (member as any).pendingFunctionalRoleRequests || [];

      if (requests.length > 0) {
        // Get user details
        const userResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [
              {
                field: "_id",
                value: member.userId,
                operator: "eq",
              },
            ],
          }
        );

        const functionalRoles: ("coach" | "parent" | "admin")[] =
          (member as any).functionalRoles || [];

        for (const request of requests) {
          pendingRequests.push({
            memberId: (member as any)._id,
            userId: member.userId,
            userName: (userResult?.name as string) || null,
            userEmail: (userResult?.email as string) || null,
            userImage: (userResult?.image as string) || null,
            currentRoles: functionalRoles,
            requestedRole: request.role,
            requestedAt: request.requestedAt,
            message: request.message || null,
          });
        }
      }
    }

    return pendingRequests;
  },
});

/**
 * Approve a functional role request (admin only)
 */
export const approveFunctionalRoleRequest = mutation({
  args: {
    organizationId: v.string(),
    memberId: v.string(),
    role: v.union(
      v.literal("coach"),
      v.literal("parent"),
      v.literal("admin"),
      v.literal("player")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get member record
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "_id",
            value: args.memberId,
            operator: "eq",
          },
        ],
      }
    );

    if (!memberResult) {
      throw new Error("Member not found");
    }

    // Verify member is in the correct organization
    if (memberResult.organizationId !== args.organizationId) {
      throw new Error("Member is not in this organization");
    }

    // Get current roles and pending requests
    const functionalRoles: ("coach" | "parent" | "admin" | "player")[] =
      (memberResult as any).functionalRoles || [];
    const pendingRequests: Array<{ role: string }> =
      (memberResult as any).pendingFunctionalRoleRequests || [];

    // Remove the request from pending
    const updatedPendingRequests = pendingRequests.filter(
      (req) => req.role !== args.role
    );

    // Add role if not already present
    const updatedRoles = functionalRoles.includes(args.role)
      ? functionalRoles
      : [...functionalRoles, args.role];

    // Update member
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: args.memberId, operator: "eq" }],
        update: {
          functionalRoles: updatedRoles,
          pendingFunctionalRoleRequests: updatedPendingRequests,
        } as any,
      },
    });

    // Option B: Don't auto-link children when parent role is approved
    // Parent must explicitly claim guardian identity and acknowledge children via modal
    if (args.role === "parent") {
      console.log(
        `[approveFunctionalRoleRequest] Parent role approved for member ${args.memberId} - parent must claim guardian identity via modal (Option B)`
      );
      // Note: autoLinkGuardianToPlayersInternal has been disabled to enforce Option B behavior
      // Children will appear in batched modal for parent to acknowledge
    }

    console.log(
      `[approveFunctionalRoleRequest] Approved ${args.role} for member ${args.memberId}`
    );
    return null;
  },
});

/**
 * Reject a functional role request (admin only)
 */
export const rejectFunctionalRoleRequest = mutation({
  args: {
    organizationId: v.string(),
    memberId: v.string(),
    role: v.union(
      v.literal("coach"),
      v.literal("parent"),
      v.literal("admin"),
      v.literal("player")
    ),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get member record
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "_id",
            value: args.memberId,
            operator: "eq",
          },
        ],
      }
    );

    if (!memberResult) {
      throw new Error("Member not found");
    }

    // Verify member is in the correct organization
    if (memberResult.organizationId !== args.organizationId) {
      throw new Error("Member is not in this organization");
    }

    // Remove the request from pending
    const pendingRequests: Array<{ role: string }> =
      (memberResult as any).pendingFunctionalRoleRequests || [];
    const updatedPendingRequests = pendingRequests.filter(
      (req) => req.role !== args.role
    );

    // Update member
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: args.memberId, operator: "eq" }],
        update: {
          pendingFunctionalRoleRequests: updatedPendingRequests,
        } as any,
      },
    });

    console.log(
      `[rejectFunctionalRoleRequest] Rejected ${args.role} for member ${args.memberId}. Reason: ${args.reason || "none"}`
    );
    return null;
  },
});

/**
 * Resend an invitation email
 * This schedules an action to resend the email
 */
export const resendInvitation = mutation({
  args: {
    invitationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find the invitation
    const invitationResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "invitation",
        where: [
          {
            field: "_id",
            value: args.invitationId,
            operator: "eq",
          },
        ],
      }
    );

    if (!invitationResult) {
      throw new Error("Invitation not found");
    }

    if (invitationResult.status !== "pending") {
      throw new Error("Only pending invitations can be resent");
    }

    // Check if invitation is expired
    const now = Date.now();
    if (invitationResult.expiresAt < now) {
      throw new Error(
        "Cannot resend expired invitation. Please send a new invitation."
      );
    }

    // Get organization details
    const orgResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "organization",
        where: [
          {
            field: "_id",
            value: invitationResult.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    // Get inviter details
    const inviterResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "_id",
            value: invitationResult.inviterId,
            operator: "eq",
          },
        ],
      }
    );

    // Get current user for resend tracking
    const identity = await ctx.auth.getUserIdentity();
    let currentUser = null;
    if (identity?.email) {
      currentUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [
          {
            field: "email",
            value: identity.email,
            operator: "eq",
          },
        ],
      });
    }

    // Track resend history in invitation metadata
    const currentMetadata = invitationResult.metadata || {};
    const resendHistory = currentMetadata.resendHistory || [];

    const updatedMetadata = {
      ...currentMetadata,
      resendHistory: [
        ...resendHistory,
        {
          resentAt: Date.now(),
          resentBy: currentUser?._id || "unknown",
          resentByName: currentUser?.name || currentUser?.email || "Unknown",
        },
      ],
    };

    // Update invitation with new metadata
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "invitation",
        where: [{ field: "_id", value: args.invitationId, operator: "eq" }],
        update: { metadata: updatedMetadata } as any,
      },
    });

    // Schedule action to resend email
    // Normalize SITE_URL to remove trailing slash
    const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(
      TRAILING_SLASH_REGEX,
      ""
    );
    const inviteLink = `${siteUrl}/orgs/accept-invitation/${args.invitationId}`;

    // Extract metadata for email context (teams, players, functional roles)
    const metadata = invitationResult.metadata || {};
    const functionalRoles = metadata.suggestedFunctionalRoles || [];
    const rawTeams = metadata.roleSpecificData?.teams || [];
    const rawPlayers = metadata.suggestedPlayerLinks || [];

    // Fetch team details - metadata may store teams as IDs (strings) or full objects
    const teams = await Promise.all(
      rawTeams.map(async (team: any) => {
        // If team is a string (ID), fetch the full team details
        if (typeof team === "string") {
          const teamData = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "team",
              where: [{ field: "_id", value: team, operator: "eq" }],
            }
          );
          if (teamData) {
            const cleaned: any = {
              id: teamData._id,
              name: teamData.name,
            };
            if (teamData.sport) {
              cleaned.sport = teamData.sport;
            }
            if (teamData.ageGroup) {
              cleaned.ageGroup = teamData.ageGroup;
            }
            return cleaned;
          }
          return null;
        }
        // Team is already an object with details
        const cleaned: any = {
          id: team.id,
          name: team.name,
        };
        if (team.sport !== undefined) {
          cleaned.sport = team.sport;
        }
        if (team.ageGroup !== undefined) {
          cleaned.ageGroup = team.ageGroup;
        }
        return cleaned;
      })
    ).then((results) => results.filter(Boolean));

    // Fetch player details - metadata may store players as IDs (strings) or full objects
    const players = await Promise.all(
      rawPlayers.map(async (player: any) => {
        // If player is a string (ID), fetch the full player details
        if (typeof player === "string") {
          const playerData = await ctx.db.get(player as any);
          if (playerData) {
            const cleaned: any = {
              id: playerData._id,
              name: `${(playerData as any).firstName} ${(playerData as any).lastName}`,
            };
            if ((playerData as any).ageGroup) {
              cleaned.ageGroup = (playerData as any).ageGroup;
            }
            return cleaned;
          }
          return null;
        }
        // Player is already an object with details
        const cleaned: any = {
          id: player.id,
          name: player.name,
        };
        if (player.ageGroup !== undefined) {
          cleaned.ageGroup = player.ageGroup;
        }
        return cleaned;
      })
    ).then((results) => results.filter(Boolean));

    // Schedule the action to resend email
    const actionRef = (internal.actions as any).invitations
      ?.resendInvitationEmail;

    if (actionRef) {
      await ctx.scheduler.runAfter(0, actionRef, {
        email: invitationResult.email,
        invitedByUsername: inviterResult?.name || "Someone",
        invitedByEmail: inviterResult?.email || "",
        organizationName: orgResult?.name || "Organization",
        inviteLink,
        functionalRoles,
        teams,
        players,
      });
    } else {
      console.warn(
        "⚠️ resendInvitationEmail action not found. Email will not be sent."
      );
    }

    // Log the resend event
    await ctx.runMutation(internal.models.members.logInvitationEvent, {
      invitationId: args.invitationId,
      organizationId: invitationResult.organizationId,
      eventType: "resent",
      performedBy: currentUser?._id || "unknown",
      performedByName: currentUser?.name,
      performedByEmail: currentUser?.email,
    });

    return null;
  },
});

// ============ OWNER ROLE MANAGEMENT (Section 18) ============

/**
 * Get the current owner of an organization
 * Returns the owner member with their user details
 */
export const getCurrentOwner = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.union(
    v.object({
      memberId: v.string(),
      userId: v.string(),
      userName: v.union(v.string(), v.null()),
      userEmail: v.union(v.string(), v.null()),
      userImage: v.union(v.string(), v.null()),
      role: v.literal("owner"),
      functionalRoles: v.array(
        v.union(
          v.literal("coach"),
          v.literal("parent"),
          v.literal("admin"),
          v.literal("player")
        )
      ),
      createdAt: v.union(v.number(), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Find the member with owner role
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "role",
            value: "owner",
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    const ownerMember = membersResult.page[0];
    if (!ownerMember) {
      return null;
    }

    // Get user details
    const userResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "_id",
            value: ownerMember.userId,
            operator: "eq",
          },
        ],
      }
    );

    const functionalRoles: ("coach" | "parent" | "admin")[] =
      (ownerMember as any).functionalRoles || [];

    return {
      memberId: ownerMember._id,
      userId: ownerMember.userId,
      userName: (userResult?.name as string) || null,
      userEmail: (userResult?.email as string) || null,
      userImage: (userResult?.image as string) || null,
      role: "owner" as const,
      functionalRoles,
      createdAt: (ownerMember as any).createdAt || null,
    };
  },
});

/**
 * Transfer organization ownership to another member
 *
 * Rules:
 * - Only the current owner can transfer ownership
 * - The new owner must be an existing member of the organization
 * - The previous owner becomes an admin after transfer
 * - The new owner gets the "owner" role
 */
export const transferOwnership = mutation({
  args: {
    organizationId: v.string(),
    newOwnerUserId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    previousOwnerEmail: v.union(v.string(), v.null()),
    newOwnerEmail: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Not authenticated");
    }

    // Find current user
    const currentUserResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "email",
            value: identity.email,
            operator: "eq",
          },
        ],
      }
    );

    if (!currentUserResult) {
      throw new Error("User not found");
    }

    // Verify current user is the owner
    const currentUserMember = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "userId",
            value: currentUserResult._id,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!currentUserMember || currentUserMember.role !== "owner") {
      throw new Error("Only the organization owner can transfer ownership");
    }

    // Check that new owner is not the same as current owner
    if (currentUserResult._id === args.newOwnerUserId) {
      throw new Error("Cannot transfer ownership to yourself");
    }

    // Find the new owner's member record
    const newOwnerMember = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "userId",
            value: args.newOwnerUserId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!newOwnerMember) {
      throw new Error("The selected user is not a member of this organization");
    }

    // Get new owner user details for logging
    const newOwnerUser = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "_id",
            value: args.newOwnerUserId,
            operator: "eq",
          },
        ],
      }
    );

    // Demote current owner to admin
    const currentOwnerFunctionalRoles: ("coach" | "parent" | "admin")[] =
      (currentUserMember as any).functionalRoles || [];
    // Ensure admin is in functional roles after demotion
    const updatedCurrentOwnerFunctionalRoles: ("coach" | "parent" | "admin")[] =
      currentOwnerFunctionalRoles.includes("admin")
        ? currentOwnerFunctionalRoles
        : [...currentOwnerFunctionalRoles, "admin" as const];

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: currentUserMember._id, operator: "eq" }],
        update: {
          role: "admin",
          functionalRoles: updatedCurrentOwnerFunctionalRoles,
        },
      },
    });

    // Promote new owner
    const newOwnerFunctionalRoles: ("coach" | "parent" | "admin")[] =
      (newOwnerMember as any).functionalRoles || [];
    // Ensure admin is in functional roles for owner
    const updatedNewOwnerFunctionalRoles: ("coach" | "parent" | "admin")[] =
      newOwnerFunctionalRoles.includes("admin")
        ? newOwnerFunctionalRoles
        : [...newOwnerFunctionalRoles, "admin" as const];

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: newOwnerMember._id, operator: "eq" }],
        update: {
          role: "owner",
          functionalRoles: updatedNewOwnerFunctionalRoles,
        },
      },
    });

    console.log(
      `[transferOwnership] Ownership transferred from ${currentUserResult.email} to ${newOwnerUser?.email} in org ${args.organizationId}`
    );

    return {
      success: true,
      previousOwnerEmail: (currentUserResult.email as string) || null,
      newOwnerEmail: (newOwnerUser?.email as string) || null,
    };
  },
});

// ============ ORGANIZATION-LEVEL MEMBER REMOVAL (Section 19) ============

/**
 * Preview the impact of removing a member from an organization
 * Shows blockers (e.g., is only owner) and data relationships
 * Used by org owners/admins before removing a member
 */
export const getRemovalPreview = query({
  args: {
    organizationId: v.string(),
    userId: v.string(),
  },
  returns: v.object({
    canRemove: v.boolean(),
    blockers: v.array(
      v.object({
        type: v.string(),
        message: v.string(),
      })
    ),
    impacts: v.object({
      teamsCoached: v.number(),
      playersManaged: v.number(),
      invitationsSent: v.number(),
      voiceNotes: v.number(),
      guardianProfiles: v.number(),
      playerEnrollments: v.number(),
      sportPassports: v.number(),
      pendingInvitations: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const blockers = [];

    // Find the member record
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "userId",
            value: args.userId,
            operator: "eq",
          },
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!memberResult) {
      return {
        canRemove: false,
        blockers: [
          { type: "not_found", message: "Member not found in organization" },
        ],
        impacts: {
          teamsCoached: 0,
          playersManaged: 0,
          invitationsSent: 0,
          voiceNotes: 0,
          guardianProfiles: 0,
          playerEnrollments: 0,
          sportPassports: 0,
          pendingInvitations: 0,
        },
      };
    }

    // BLOCKER: Check if user is the only owner
    if (memberResult.role === "owner") {
      const allMembersResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "member",
          paginationOpts: {
            cursor: null,
            numItems: 1000,
          },
          where: [
            {
              field: "organizationId",
              value: args.organizationId,
              operator: "eq",
            },
          ],
        }
      );

      const allOwners = allMembersResult.page.filter(
        (m: any) => m.role === "owner"
      );

      if (allOwners.length === 1) {
        blockers.push({
          type: "is_only_owner",
          message:
            "User is the only owner. Transfer ownership before removing.",
        });
      }
    }

    // Count impact: coach assignments
    const coachAssignments = await ctx.db.query("coachAssignments").collect();
    const userCoachAssignments = coachAssignments.filter(
      (ca) =>
        ca.userId === args.userId && ca.organizationId === args.organizationId
    );

    // Count impact: guardian identities (players managed)
    const guardianIdentities = await ctx.db
      .query("guardianIdentities")
      .collect();
    const userGuardianIdentities = guardianIdentities.filter(
      (gi) => gi.userId === args.userId
    );

    // Get player links for those guardians
    const guardianIdentityIds = userGuardianIdentities.map((gi) => gi._id);
    const guardianPlayerLinks = await ctx.db
      .query("guardianPlayerLinks")
      .collect();
    const userPlayerLinks = guardianPlayerLinks.filter((gpl) =>
      guardianIdentityIds.includes(gpl.guardianIdentityId)
    );

    // Count impact: voice notes
    const voiceNotes = await ctx.db.query("voiceNotes").collect();
    const userVoiceNotes = voiceNotes.filter(
      (vn: any) =>
        vn.coachId === args.userId && vn.organizationId === args.organizationId
    );

    // Count impact: invitations sent (all statuses)
    const invitationsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "invitation",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "inviterId",
            value: args.userId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    // Count impact: pending invitations that will be cancelled
    const pendingInvitationsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "invitation",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "inviterId",
            value: args.userId,
            operator: "eq",
            connector: "AND",
          },
          {
            field: "status",
            value: "pending",
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    // Count impact: guardian org profiles
    let guardianProfileCount = 0;
    for (const guardianIdentity of userGuardianIdentities) {
      const orgProfiles = await ctx.db
        .query("orgGuardianProfiles")
        .withIndex("by_guardian_and_org", (q) =>
          q
            .eq("guardianIdentityId", guardianIdentity._id)
            .eq("organizationId", args.organizationId)
        )
        .collect();
      guardianProfileCount += orgProfiles.length;
    }

    // Count impact: player enrollments (if user is adult player)
    const playerIdentities = await ctx.db.query("playerIdentities").collect();
    const userPlayerIdentities = playerIdentities.filter(
      (pi) => pi.userId === args.userId && pi.playerType === "adult"
    );

    let playerEnrollmentCount = 0;
    let sportPassportCount = 0;

    for (const playerIdentity of userPlayerIdentities) {
      const enrollments = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_player_and_org", (q) =>
          q
            .eq("playerIdentityId", playerIdentity._id)
            .eq("organizationId", args.organizationId)
        )
        .collect();
      playerEnrollmentCount += enrollments.length;

      const passports = await ctx.db
        .query("sportPassports")
        .withIndex("by_player_and_org", (q) =>
          q
            .eq("playerIdentityId", playerIdentity._id)
            .eq("organizationId", args.organizationId)
        )
        .collect();
      sportPassportCount += passports.length;
    }

    return {
      canRemove: blockers.length === 0,
      blockers,
      impacts: {
        teamsCoached: userCoachAssignments.length,
        playersManaged: userPlayerLinks.length,
        invitationsSent: invitationsResult.page.length,
        voiceNotes: userVoiceNotes.length,
        guardianProfiles: guardianProfileCount,
        playerEnrollments: playerEnrollmentCount,
        sportPassports: sportPassportCount,
        pendingInvitations: pendingInvitationsResult.page.length,
      },
    };
  },
});

/**
 * Disable a member's access to an organization
 * Temporarily suspends access without removing data
 * Can be reactivated later with enableMemberAccess
 */
export const disableMemberAccess = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    disableType: v.optional(
      v.union(v.literal("org_only"), v.literal("account"))
    ),
  }),
  handler: async (ctx, args) => {
    // Get current user for audit trail
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const currentUser = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "email",
            value: identity.email,
            operator: "eq",
          },
        ],
      }
    );

    if (!currentUser) {
      return {
        success: false,
        error: "Current user not found",
      };
    }

    // Find the member to disable
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "userId",
            value: args.userId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!memberResult) {
      return {
        success: false,
        error: "Member not found",
      };
    }

    // Check if member is already disabled
    if ((memberResult as any).isDisabled) {
      return {
        success: false,
        error: "Member is already disabled",
      };
    }

    // Determine disable type: check how many orgs the user belongs to
    const allMemberships = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        where: [
          {
            field: "userId",
            value: args.userId,
            operator: "eq",
          },
        ],
        paginationOpts: {
          cursor: null,
          numItems: 100,
        },
      }
    );

    const disableType: "account" | "org_only" =
      allMemberships.page.length === 1 ? "account" : "org_only";

    // Update member record with disable fields
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
        update: {
          isDisabled: true,
          disabledAt: Date.now(),
          disabledBy: currentUser._id,
          disableReason: args.reason || undefined,
          disableType,
        },
      },
    });

    console.log(
      `[disableMemberAccess] Disabled user ${args.userId} in org ${args.organizationId}`,
      `Type: ${disableType}, Reason: ${args.reason || "None provided"}`
    );

    return {
      success: true,
      disableType,
    };
  },
});

/**
 * Re-enable a disabled member's access to an organization
 * Removes the suspension and restores access
 */
export const enableMemberAccess = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Find the member to enable
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "userId",
            value: args.userId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!memberResult) {
      return {
        success: false,
        error: "Member not found",
      };
    }

    // Check if member is actually disabled
    if (!(memberResult as any).isDisabled) {
      return {
        success: false,
        error: "Member is not disabled",
      };
    }

    // Remove disable fields
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
        update: {
          isDisabled: false,
          disabledAt: undefined,
          disabledBy: undefined,
          disableReason: undefined,
          disableType: undefined,
        },
      },
    });

    console.log(
      `[enableMemberAccess] Re-enabled user ${args.userId} in org ${args.organizationId}`
    );

    return {
      success: true,
    };
  },
});

/**
 * Remove a member from an organization (org-level deletion)
 * Only removes org-specific data, preserves user account and data in other orgs
 * Used by org owners/admins
 */
export const removeFromOrganization = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Permission check: must be owner or admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return { success: false, error: "Not authenticated" };
    }

    // Find current user by email
    const currentUser = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "email",
            value: identity.email,
            operator: "eq",
          },
        ],
      }
    );

    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const callerMemberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "userId",
            value: currentUser._id,
            operator: "eq",
          },
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (
      !(
        callerMemberResult &&
        ["owner", "admin"].includes(callerMemberResult.role)
      )
    ) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Check if removal is allowed
    const preview: any = await ctx.runQuery(
      api.models.members.getRemovalPreview,
      {
        organizationId: args.organizationId,
        userId: args.userId,
      }
    );

    if (!preview.canRemove) {
      return {
        success: false,
        error: preview.blockers[0]?.message || "Cannot remove member",
      };
    }

    try {
      // 1. Delete member record
      const memberResult = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "member",
          where: [
            {
              field: "userId",
              value: args.userId,
              operator: "eq",
            },
            {
              field: "organizationId",
              value: args.organizationId,
              operator: "eq",
              connector: "AND",
            },
          ],
        }
      );

      if (memberResult) {
        await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
          input: {
            model: "member",
            where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
          },
        });
      }

      // 2. Delete coach assignments
      const coachAssignments = await ctx.db.query("coachAssignments").collect();
      const userCoachAssignments = coachAssignments.filter(
        (ca) =>
          ca.userId === args.userId && ca.organizationId === args.organizationId
      );
      for (const ca of userCoachAssignments) {
        await ctx.db.delete(ca._id);
      }

      // 3. Delete team memberships (if teamMember table exists)
      try {
        const teamMembers = await (ctx.db as BetterAuthDb)
          .query("teamMember")
          .collect();
        for (const tm of teamMembers as any[]) {
          // Get team to check if it belongs to this organization
          const teamResult = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "team",
              where: [
                {
                  field: "_id",
                  value: tm.teamId,
                  operator: "eq",
                },
              ],
            }
          );

          if (
            teamResult &&
            teamResult.organizationId === args.organizationId &&
            tm.userId === args.userId
          ) {
            await ctx.db.delete(tm._id);
          }
        }
      } catch (error) {
        console.log(`[removeFromOrganization] No teamMember table: ${error}`);
      }

      // 4. Delete voice notes
      const voiceNotes = await ctx.db.query("voiceNotes").collect();
      const userVoiceNotes = voiceNotes.filter(
        (vn: any) =>
          vn.coachId === args.userId &&
          vn.organizationId === args.organizationId
      );
      for (const vn of userVoiceNotes) {
        await ctx.db.delete(vn._id);
      }

      // 5. Delete guardian org profiles (if user is a parent)
      try {
        const guardianIdentities = await ctx.db
          .query("guardianIdentities")
          .withIndex("by_userId", (q) => q.eq("userId", args.userId))
          .collect();

        for (const guardianIdentity of guardianIdentities) {
          const orgProfiles = await ctx.db
            .query("orgGuardianProfiles")
            .withIndex("by_guardian_and_org", (q) =>
              q
                .eq("guardianIdentityId", guardianIdentity._id)
                .eq("organizationId", args.organizationId)
            )
            .collect();

          for (const profile of orgProfiles) {
            await ctx.db.delete(profile._id);
          }
        }
      } catch (error) {
        console.log(
          `[removeFromOrganization] Error deleting guardian profiles: ${error}`
        );
      }

      // 6. Delete player enrollments (if user is an adult player)
      try {
        const playerIdentities = await ctx.db
          .query("playerIdentities")
          .collect();
        const userPlayerIdentities = playerIdentities.filter(
          (pi) => pi.userId === args.userId && pi.playerType === "adult"
        );

        for (const playerIdentity of userPlayerIdentities) {
          const enrollments = await ctx.db
            .query("orgPlayerEnrollments")
            .withIndex("by_player_and_org", (q) =>
              q
                .eq("playerIdentityId", playerIdentity._id)
                .eq("organizationId", args.organizationId)
            )
            .collect();

          for (const enrollment of enrollments) {
            await ctx.db.delete(enrollment._id);
          }
        }
      } catch (error) {
        console.log(
          `[removeFromOrganization] Error deleting player enrollments: ${error}`
        );
      }

      // 7. Delete sport passports (if user is an adult player)
      try {
        const playerIdentities = await ctx.db
          .query("playerIdentities")
          .collect();
        const userPlayerIdentities = playerIdentities.filter(
          (pi) => pi.userId === args.userId && pi.playerType === "adult"
        );

        for (const playerIdentity of userPlayerIdentities) {
          const passports = await ctx.db
            .query("sportPassports")
            .withIndex("by_player_and_org", (q) =>
              q
                .eq("playerIdentityId", playerIdentity._id)
                .eq("organizationId", args.organizationId)
            )
            .collect();

          for (const passport of passports) {
            await ctx.db.delete(passport._id);
          }
        }
      } catch (error) {
        console.log(
          `[removeFromOrganization] Error deleting sport passports: ${error}`
        );
      }

      // 8. Cancel pending invitations sent by this user
      try {
        const pendingInvitationsResult = await ctx.runQuery(
          components.betterAuth.adapter.findMany,
          {
            model: "invitation",
            paginationOpts: {
              cursor: null,
              numItems: 1000,
            },
            where: [
              {
                field: "inviterId",
                value: args.userId,
                operator: "eq",
              },
              {
                field: "organizationId",
                value: args.organizationId,
                operator: "eq",
                connector: "AND",
              },
              {
                field: "status",
                value: "pending",
                operator: "eq",
                connector: "AND",
              },
            ],
          }
        );

        for (const invitation of pendingInvitationsResult.page) {
          await ctx.runMutation(components.betterAuth.adapter.updateOne, {
            input: {
              model: "invitation",
              where: [{ field: "_id", value: invitation._id, operator: "eq" }],
              update: {
                status: "cancelled",
              },
            },
          });
        }
      } catch (error) {
        console.log(
          `[removeFromOrganization] Error canceling invitations: ${error}`
        );
      }

      // 9. Log to audit trail (if approvalActions table exists)
      try {
        await ctx.db.insert("approvalActions", {
          userId: args.userId,
          adminId: currentUser._id,
          action: "removed_from_org" as any,
          organizationId: args.organizationId,
          timestamp: Date.now(),
          reason: args.reason,
        } as any);
      } catch (error) {
        console.log(
          `[removeFromOrganization] Could not log to audit: ${error}`
        );
      }

      console.log(
        `[removeFromOrganization] Successfully removed user ${args.userId} from org ${args.organizationId}`
      );

      return { success: true };
    } catch (error) {
      console.error("[removeFromOrganization] Error:", error);
      return {
        success: false,
        error: `Failed to remove member: ${error}`,
      };
    }
  },
});

/**
 * Get all memberships for a user across all organizations
 * Used for filtering role dropdowns in preferences to show only roles user has
 */
export const getMembersByUserId = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      userId: v.string(),
      organizationId: v.string(),
      role: v.string(),
      functionalRoles: v.optional(v.array(v.string())),
      organizationName: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // Get all memberships for this user
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "userId",
            value: args.userId,
            operator: "eq",
          },
        ],
      }
    );

    // Fetch organization names for each membership
    const membershipsWithOrgNames = await Promise.all(
      membersResult.page.map(async (member: any) => {
        const orgResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "organization",
            where: [
              {
                field: "_id",
                value: member.organizationId,
                operator: "eq",
              },
            ],
          }
        );

        return {
          _id: member._id,
          userId: member.userId,
          organizationId: member.organizationId,
          role: member.role,
          functionalRoles: member.functionalRoles || undefined,
          organizationName: orgResult?.name || undefined,
        };
      })
    );

    return membershipsWithOrgNames;
  },
});

/**
 * Check if a user exists and if they are a member of a specific organization.
 * Used by the Add Guardian modal to determine whether to send invitation or link directly.
 */
export const checkUserAndMembership = query({
  args: {
    email: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
    exists: v.boolean(),
    isMember: v.boolean(),
    userId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Check if user exists
    const userResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "email",
            value: normalizedEmail,
            operator: "eq",
          },
        ],
      }
    );

    if (!userResult) {
      return { exists: false, isMember: false };
    }

    const userId = (userResult as any)._id;

    // Check if user is a member of this organization
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "userId",
            value: userId,
            operator: "eq",
          },
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    return {
      exists: true,
      isMember: !!memberResult,
      userId,
    };
  },
});
