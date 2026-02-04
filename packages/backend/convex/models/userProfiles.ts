/**
 * User Profile Mutations for Profile Completion
 *
 * This module provides backend mutations for saving user profile data
 * used in multi-signal guardian matching. Part of Phase 0: Onboarding Sync.
 *
 * Functions:
 * - updateProfile: Save phone, altEmail, postcode, etc. and mark profile as completed
 * - skipProfileCompletion: Track skips (max 3) and allow proceeding without completion
 * - getProfileStatus: Get current profile completion status and data
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";
import {
  normalizePhone,
  normalizePostcode,
} from "../lib/matching/guardianMatcher";

const MAX_SKIPS = 3;

/**
 * Update user profile with matching-relevant fields.
 *
 * This mutation:
 * 1. Normalizes phone and postcode for consistent matching
 * 2. Saves the profile data to the user record
 * 3. Marks profile as completed with timestamp
 */
export const updateProfile = mutation({
  args: {
    phone: v.optional(v.string()),
    altEmail: v.optional(v.string()),
    postcode: v.optional(v.string()),
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    profileCompletedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Normalize phone number if provided
    const normalizedPhone = args.phone ? normalizePhone(args.phone) : undefined;

    // Normalize postcode if provided
    const normalizedPostcode = args.postcode
      ? normalizePostcode(args.postcode)
      : undefined;

    // Normalize email to lowercase
    const normalizedAltEmail = args.altEmail
      ? args.altEmail.toLowerCase().trim()
      : undefined;

    const now = Date.now();

    // Update the user record
    await ctx.db.patch(user._id, {
      phone: normalizedPhone,
      altEmail: normalizedAltEmail,
      postcode: normalizedPostcode,
      address: args.address,
      town: args.town,
      country: args.country,
      profileCompletionStatus: "completed" as const,
      profileCompletedAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      profileCompletedAt: now,
    };
  },
});

/**
 * Skip profile completion (with tracking).
 *
 * This mutation:
 * 1. Increments the skip count
 * 2. Sets status to 'skipped'
 * 3. Returns whether user can skip again (max 3 skips)
 */
export const skipProfileCompletion = mutation({
  args: {},
  returns: v.object({
    skipCount: v.number(),
    canSkipAgain: v.boolean(),
  }),
  handler: async (ctx) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const currentSkipCount = user.profileSkipCount ?? 0;
    const newSkipCount = currentSkipCount + 1;
    const now = Date.now();

    // Update the user record
    await ctx.db.patch(user._id, {
      profileSkipCount: newSkipCount,
      profileCompletionStatus: "skipped" as const,
      updatedAt: now,
    });

    return {
      skipCount: newSkipCount,
      canSkipAgain: newSkipCount < MAX_SKIPS,
    };
  },
});

/**
 * Get user profile status for profile completion step.
 *
 * Returns the current status, any existing profile data,
 * and whether the user can skip.
 */
export const getProfileStatus = query({
  args: {},
  returns: v.union(
    v.object({
      status: v.union(
        v.literal("pending"),
        v.literal("completed"),
        v.literal("skipped")
      ),
      phone: v.optional(v.string()),
      altEmail: v.optional(v.string()),
      postcode: v.optional(v.string()),
      address: v.optional(v.string()),
      town: v.optional(v.string()),
      country: v.optional(v.string()),
      skipCount: v.number(),
      canSkip: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Get authenticated user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const skipCount = user.profileSkipCount ?? 0;

    return {
      status: user.profileCompletionStatus ?? "pending",
      phone: user.phone,
      altEmail: user.altEmail,
      postcode: user.postcode,
      address: user.address,
      town: user.town,
      country: user.country,
      skipCount,
      canSkip: skipCount < MAX_SKIPS,
    };
  },
});
