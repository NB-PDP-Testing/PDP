import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../_generated/server";

/**
 * Bootstrap the first platform staff user
 *
 * This script sets a user as platform staff WITHOUT requiring existing platform staff.
 * Should only be used for initial setup of a fresh environment.
 *
 * Safety check: Only works if there are currently NO platform staff users.
 *
 * Usage:
 * npx convex run scripts/bootstrapPlatformStaff:setFirstPlatformStaff '{"email": "user@example.com"}'
 */
export const setFirstPlatformStaff = mutation({
  args: {
    email: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get all users
    const usersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "user",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [],
      }
    );

    const allUsers = usersResult.page || [];

    // Safety check: Only allow if no platform staff exists
    const existingPlatformStaff = allUsers.filter(
      (u: any) => u.isPlatformStaff === true
    );

    if (existingPlatformStaff.length > 0) {
      return {
        success: false,
        message: `Platform staff already exists: ${existingPlatformStaff.map((u: any) => u.email).join(", ")}. Use updatePlatformStaffStatus instead.`,
      };
    }

    // Find the user by email
    const user = allUsers.find(
      (u: any) => u.email.toLowerCase() === args.email.toLowerCase()
    );

    if (!user) {
      return {
        success: false,
        message: `User with email ${args.email} not found. Available users: ${allUsers.map((u: any) => u.email).join(", ")}`,
      };
    }

    // Update the user to be platform staff
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: user._id, operator: "eq" }],
        update: {
          isPlatformStaff: true,
        },
      },
    });

    console.log(`✅ Set ${args.email} as platform staff`);

    return {
      success: true,
      message: `Successfully set ${args.email} as platform staff`,
    };
  },
});

/**
 * Check who the current platform staff are
 *
 * Usage:
 * npx convex run scripts/bootstrapPlatformStaff:listPlatformStaff
 */
export const listPlatformStaff = mutation({
  args: {},
  returns: v.object({
    platformStaff: v.array(
      v.object({
        email: v.string(),
        name: v.union(v.string(), v.null()),
      })
    ),
    totalUsers: v.number(),
  }),
  handler: async (ctx) => {
    const usersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "user",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [],
      }
    );

    const allUsers = usersResult.page || [];
    const platformStaff = allUsers
      .filter((u: any) => u.isPlatformStaff === true)
      .map((u: any) => ({
        email: u.email,
        name: u.name || null,
      }));

    return {
      platformStaff,
      totalUsers: allUsers.length,
    };
  },
});
