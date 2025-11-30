import type { Member } from "better-auth/plugins";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

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
