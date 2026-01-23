import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Update the onboarding complete status for a user.
 * This function is accessible from outside the component.
 */
export const updateOnboardingComplete = mutation({
  args: {
    userId: v.id("user"),
    onboardingComplete: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      onboardingComplete: args.onboardingComplete,
    });
    return null;
  },
});

/**
 * Get a user by their ID.
 * This function is accessible from outside the component.
 */
export const getUserById = query({
  args: {
    userId: v.id("user"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("user"),
      _creationTime: v.number(),
      name: v.string(),
      email: v.string(),
      emailVerified: v.boolean(),
      image: v.optional(v.union(v.null(), v.string())),
      createdAt: v.number(),
      updatedAt: v.number(),
      userId: v.optional(v.union(v.null(), v.string())),
      onboardingComplete: v.optional(v.boolean()),

      // Staff
      isPlatformStaff: v.optional(v.boolean()),

      // Custom profile fields
      phone: v.optional(v.string()),

      // Current organization tracking
      currentOrgId: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => await ctx.db.get(args.userId),
});

/**
 * Get a user by their string ID (for voice notes coachId lookups)
 * This function is accessible from outside the component.
 */
export const getUserByStringId = query({
  args: {
    userId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    console.log(
      `[betterAuth.getUserByStringId] Looking up user with ID: ${args.userId}`
    );

    try {
      // Cast string to Id<"user"> for ctx.db.get
      const user = await ctx.db.get(args.userId as v.Id<"user">);

      if (user) {
        console.log(
          `[betterAuth.getUserByStringId] ✅ FOUND user: ${(user as any).email}`
        );
        return user;
      }

      console.error(
        `[betterAuth.getUserByStringId] ❌ User not found for ID: ${args.userId}`
      );

      // Debug: Show sample IDs
      const sampleUsers = await ctx.db.query("user").take(3);
      console.log(
        `[betterAuth.getUserByStringId] Sample user IDs: ${sampleUsers.map((u) => u._id).join(", ")}`
      );

      return null;
    } catch (error) {
      console.error(
        `[betterAuth.getUserByStringId] ERROR: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  },
});
