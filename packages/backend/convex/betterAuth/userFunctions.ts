import { v } from "convex/values";
import { normalizePhoneNumber } from "../lib/phoneUtils";
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
 * Update user profile fields (firstName, lastName, phone)
 * This function is accessible from outside the component.
 */
export const updateUserProfile = mutation({
  args: {
    userId: v.string(), // Accept string to match frontend usage
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    try {
      // Cast string to Id<"user"> for ctx.db operations
      const userId = args.userId as unknown as v.Id<"user">;
      const user = await ctx.db.get(userId);

      if (!user) {
        console.error("[updateUserProfile] User not found:", args.userId);
        return { success: false };
      }

      // Build update object with only provided fields
      const updates: Record<string, string | undefined> = {};

      if (args.firstName !== undefined) {
        updates.firstName = args.firstName;
      }
      if (args.lastName !== undefined) {
        updates.lastName = args.lastName;
      }
      if (args.phone !== undefined) {
        // Normalize phone to E.164 format for WhatsApp compatibility
        updates.phone = normalizePhoneNumber(args.phone);
      }

      // Also update the combined name field if first/last name changed
      if (args.firstName !== undefined || args.lastName !== undefined) {
        const newFirstName = args.firstName ?? (user as any).firstName ?? "";
        const newLastName = args.lastName ?? (user as any).lastName ?? "";
        updates.name = `${newFirstName} ${newLastName}`.trim();
      }

      // Update the user record
      await ctx.db.patch(userId, updates);

      return { success: true };
    } catch (error) {
      console.error("[updateUserProfile] Error:", error);
      return { success: false };
    }
  },
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
    try {
      // Cast string to Id<"user"> for ctx.db.get
      const user = await ctx.db.get(args.userId as v.Id<"user">);

      if (user) {
        return user;
      }

      console.error(
        `[betterAuth.getUserByStringId] ❌ User not found for ID: ${args.userId}`
      );

      // Debug: Show sample IDs
      const _sampleUsers = await ctx.db.query("user").take(3);

      return null;
    } catch (error) {
      console.error(
        `[betterAuth.getUserByStringId] ERROR: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  },
});
