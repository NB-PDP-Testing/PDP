import type { Member } from "better-auth/plugins";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";

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
      v.literal("admin")
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
    const currentRoles: ("coach" | "parent" | "admin")[] =
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
      v.union(v.literal("coach"), v.literal("parent"), v.literal("admin"))
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
        v.union(v.literal("coach"), v.literal("parent"), v.literal("admin"))
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
          updated++;
          details.push({
            email,
            betterAuthRole,
            functionalRolesSet: ["admin"],
          });
        } else {
          skipped++;
          details.push({
            email,
            betterAuthRole,
            functionalRolesSet: [],
          });
        }
      } else {
        skipped++;
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

        // Get linked players if they have parent functional role
        let linkedPlayers: any[] = [];
        if (functionalRoles.includes("parent") && userResult?.email) {
          const userEmail = userResult.email.toLowerCase().trim();
          linkedPlayers = await ctx.db
            .query("players")
            .withIndex("by_organizationId", (q) =>
              q.eq("organizationId", args.organizationId)
            )
            .filter((q) => {
              // Check if user email matches any parent email in the player record
              return q.or(
                q.eq(q.field("parentEmail"), userEmail),
                q.eq(q.field("inferredParentEmail"), userEmail)
              );
            })
            .take(50);
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

        migrated++;
        details.push({
          email,
          oldRole: betterAuthRole,
          newFunctionalRoles,
        });
      } else {
        skipped++;
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
      console.log(
        "[syncFunctionalRolesFromInvitation] Invitation not found:",
        args.invitationId
      );
      return {
        success: false,
        functionalRolesAssigned: [],
        coachTeamsAssigned: 0,
        playersLinked: 0,
      };
    }

    // Extract metadata
    const metadata = invitationResult.metadata as any;
    const suggestedRoles: ("coach" | "parent" | "admin")[] =
      metadata?.suggestedFunctionalRoles || [];
    const roleSpecificData = metadata?.roleSpecificData || {};
    const suggestedPlayerLinks: string[] = metadata?.suggestedPlayerLinks || [];

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
      console.log(
        "[syncFunctionalRolesFromInvitation] Member not found for user:",
        userId
      );
      return {
        success: false,
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
      const teams: string[] = roleSpecificData.teams;

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

      // 3a. First, link specific players from invitation metadata
      if (suggestedPlayerLinks.length > 0) {
        // Query players by ID from the players table
        const players = await ctx.db.query("players").collect();
        const playerMap = new Map(players.map((p) => [p._id, p]));

        for (const playerId of suggestedPlayerLinks) {
          try {
            const player = playerMap.get(playerId as any);
            if (
              player &&
              player.organizationId === args.organizationId &&
              !player.parentEmail
            ) {
              await ctx.db.patch(player._id, {
                parentEmail: normalizedEmail,
              });
              playersLinked++;
            }
          } catch (error) {
            console.error(
              "[syncFunctionalRolesFromInvitation] Error linking player:",
              playerId,
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

      // 3b. Then, auto-link based on email matching across all player records
      // This catches any players that have this parent's email in their
      // parentEmail, inferredParentEmail, parentEmails, or parents[] fields
      try {
        const autoLinkResult: { linked: number; playerNames: string[] } =
          await ctx.runMutation(
            internal.models.players.autoLinkParentToChildrenInternal,
            {
              parentEmail: normalizedEmail,
              organizationId: args.organizationId,
            }
          );

        if (autoLinkResult.linked > 0) {
          console.log(
            "[syncFunctionalRolesFromInvitation] Auto-linked",
            autoLinkResult.linked,
            "additional players via email match:",
            autoLinkResult.playerNames.join(", ")
          );
          // Add to total (avoid double counting - auto-link may have found same players)
          playersLinked = Math.max(playersLinked, autoLinkResult.linked);
        }
      } catch (error) {
        console.error(
          "[syncFunctionalRolesFromInvitation] Error in auto-link:",
          error
        );
      }
    }

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
      v.literal("admin")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!(identity && identity.email)) {
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
    const functionalRoles: ("coach" | "parent" | "admin")[] =
      (memberResult as any).functionalRoles || [];
    if (!functionalRoles.includes(args.functionalRole)) {
      throw new Error(
        `You don't have the ${args.functionalRole} role in this organization`
      );
    }

    // Update active functional role
    // Note: activeFunctionalRole is a custom field not in Better Auth schema, so we cast to any
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
        update: {
          activeFunctionalRole: args.functionalRole,
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
    if (!(identity && identity.email)) {
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
        v.union(v.literal("coach"), v.literal("parent"), v.literal("admin"))
      ),
      activeFunctionalRole: v.union(
        v.literal("coach"),
        v.literal("parent"),
        v.literal("admin"),
        v.null()
      ),
      pendingRoleRequests: v.array(
        v.object({
          role: v.union(
            v.literal("coach"),
            v.literal("parent"),
            v.literal("admin")
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
    if (!(identity && identity.email)) {
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
    role: v.union(v.literal("coach"), v.literal("parent"), v.literal("admin")),
    // Optional role-specific data
    message: v.optional(v.string()), // Why they need this role
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!(identity && identity.email)) {
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
    const functionalRoles: ("coach" | "parent" | "admin")[] =
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
    role: v.union(v.literal("coach"), v.literal("parent"), v.literal("admin")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!(identity && identity.email)) {
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
        v.literal("admin")
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
      requestedRole: "coach" | "parent" | "admin";
      requestedAt: string;
      message: string | null;
    }> = [];

    for (const member of membersResult.page as Member[]) {
      const requests: Array<{
        role: "coach" | "parent" | "admin";
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
            memberId: member.id,
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
    role: v.union(v.literal("coach"), v.literal("parent"), v.literal("admin")),
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
    const functionalRoles: ("coach" | "parent" | "admin")[] =
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

    // If parent role was approved, auto-link to children
    if (args.role === "parent") {
      // Get user email for auto-linking
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

      if (userResult?.email) {
        const normalizedEmail = (userResult.email as string)
          .toLowerCase()
          .trim();
        await ctx.runMutation(
          internal.models.players.autoLinkParentToChildrenInternal,
          {
            parentEmail: normalizedEmail,
            organizationId: args.organizationId,
          }
        );
      }
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
    role: v.union(v.literal("coach"), v.literal("parent"), v.literal("admin")),
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

    // Schedule action to resend email
    // Normalize SITE_URL to remove trailing slash
    const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(
      /\/+$/,
      ""
    );
    const inviteLink = `${siteUrl}/orgs/accept-invitation/${args.invitationId}`;

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
        role: invitationResult.role || undefined,
      });
    } else {
      console.warn(
        "⚠️ resendInvitationEmail action not found. Email will not be sent."
      );
    }

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
        v.union(v.literal("coach"), v.literal("parent"), v.literal("admin"))
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
    if (!(identity && identity.email)) {
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
