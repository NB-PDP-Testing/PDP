import type { Member } from "better-auth/plugins";
import { v } from "convex/values";
import { components } from "../_generated/api";
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
    await ctx.runMutation(components.betterAuth.adapter.update, {
      model: "member",
      documentId: memberResult._id,
      data: {
        functionalRoles: args.functionalRoles,
      },
    });

    return null;
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
