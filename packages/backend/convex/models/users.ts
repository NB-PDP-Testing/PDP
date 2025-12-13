import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

/**
 * Get current authenticated user using Better Auth
 * Returns full user record with all custom fields (isPlatformStaff, etc)
 * Returns undefined if not authenticated (does not throw)
 */
export const getCurrentUser = query({
  args: {},
  returns: v.nullable(
    v.object({
      _id: v.string(),
      _creationTime: v.number(),
      name: v.string(),
      email: v.string(),
      emailVerified: v.boolean(),
      image: v.optional(v.union(v.null(), v.string())),
      createdAt: v.number(),
      updatedAt: v.number(),
      userId: v.optional(v.union(v.null(), v.string())),

      // Staff
      isPlatformStaff: v.optional(v.boolean()),

      // Custom profile fields
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      phone: v.optional(v.string()),

      // onboarding
      onboardingComplete: v.optional(v.boolean()),

      // Current organization tracking
      currentOrgId: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const result = await authComponent.safeGetAuthUser(ctx);

    return result ?? null;
  },
});

/**
 * Find a user by email address
 * Useful for admin operations to find users
 */
export const getUserByEmail = query({
  args: {
    email: v.string(),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const result = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [
        {
          field: "email",
          value: args.email,
          operator: "eq",
        },
      ],
    });

    return result;
  },
});

/**
 * Update a user's isPlatformStaff status
 * This allows granting/revoking platform staff privileges
 */
export const updatePlatformStaffStatus = mutation({
  args: {
    email: v.string(),
    isPlatformStaff: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find the user by email
    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [
        {
          field: "email",
          value: args.email,
          operator: "eq",
        },
      ],
    });

    if (!user) {
      throw new Error(`User with email ${args.email} not found`);
    }

    // Update the isPlatformStaff field
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: user._id, operator: "eq" }],
        update: {
          isPlatformStaff: args.isPlatformStaff,
        },
      },
    });

    return null;
  },
});
