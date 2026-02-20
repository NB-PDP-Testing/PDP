/**
 * User Profile Mutations for Profile Completion
 *
 * This module provides backend mutations for saving user profile data
 * used in multi-signal guardian matching. Part of Phase 0: Onboarding Sync.
 *
 * Functions:
 * - updateProfile: Save phone, altEmail, postcode, etc. and mark profile as completed
 * - updateProfileWithSync: Save profile data and sync to guardianIdentities (Phase 0.7)
 * - skipProfileCompletion: Track skips (max 3) and allow proceeding without completion
 * - getProfileStatus: Get current profile completion status and data
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";
import { normalizePostcode } from "../lib/matching/guardianMatcher";
import { normalizePhoneNumber } from "../lib/phoneUtils";

const MAX_SKIPS = 3;

/**
 * Update user profile with matching-relevant fields.
 *
 * This mutation:
 * 1. Normalizes phone and postcode for consistent matching
 * 2. Saves the profile data to the user record via component function
 * 3. Marks profile as completed with timestamp
 */
export const updateProfile = mutation({
  args: {
    phone: v.optional(v.string()),
    altEmail: v.optional(v.string()),
    postcode: v.optional(v.string()),
    address: v.optional(v.string()),
    address2: v.optional(v.string()), // Phase 0.6: Address line 2
    town: v.optional(v.string()),
    county: v.optional(v.string()), // Phase 0.6: County/State/Province
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

    // Normalize phone number to E.164 format (with '+' prefix) for WhatsApp compatibility
    const normalizedPhone = args.phone
      ? normalizePhoneNumber(args.phone)
      : undefined;

    // Normalize postcode if provided
    const normalizedPostcode = args.postcode
      ? normalizePostcode(args.postcode)
      : undefined;

    // Normalize email to lowercase
    const normalizedAltEmail = args.altEmail
      ? args.altEmail.toLowerCase().trim()
      : undefined;

    // Update the user record via component function
    const result = await ctx.runMutation(
      components.betterAuth.userFunctions.updateProfileCompletion,
      {
        userId: user._id,
        phone: normalizedPhone,
        altEmail: normalizedAltEmail,
        postcode: normalizedPostcode,
        address: args.address,
        address2: args.address2,
        town: args.town,
        county: args.county,
        country: args.country,
      }
    );

    return result;
  },
});

/**
 * Update user profile with sync to guardianIdentities.
 * Phase 0.7: User Profile Address Management & Data Sync
 *
 * This mutation:
 * 1. Updates the user record with all provided fields (firstName, lastName, phone, address fields)
 * 2. Finds linked guardianIdentity by userId using withIndex
 * 3. If guardianIdentity found, syncs name and address fields to it
 * 4. User table is the single source of truth - changes flow TO guardianIdentities
 */
export const updateProfileWithSync = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    address2: v.optional(v.string()),
    town: v.optional(v.string()),
    county: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Normalize phone to E.164 format (with '+' prefix) and postcode if provided
    const normalizedPhone = args.phone
      ? normalizePhoneNumber(args.phone)
      : undefined;
    const normalizedPostcode = args.postcode
      ? normalizePostcode(args.postcode)
      : undefined;

    // Build update object for user table
    const userUpdates: Record<string, string | number | undefined> = {
      updatedAt: Date.now(),
    };

    // Add firstName and lastName if provided
    if (args.firstName !== undefined) {
      userUpdates.firstName = args.firstName.trim();
    }
    if (args.lastName !== undefined) {
      userUpdates.lastName = args.lastName.trim();
    }

    // Update the combined name field if first/last name changed
    if (args.firstName !== undefined || args.lastName !== undefined) {
      const newFirstName =
        args.firstName?.trim() ?? (user as any).firstName ?? "";
      const newLastName = args.lastName?.trim() ?? (user as any).lastName ?? "";
      userUpdates.name = `${newFirstName} ${newLastName}`.trim();
    }

    // Add phone if provided
    if (normalizedPhone !== undefined) {
      userUpdates.phone = normalizedPhone;
    }

    // Add address fields if provided
    if (args.address !== undefined) {
      userUpdates.address = args.address.trim();
    }
    if (args.address2 !== undefined) {
      userUpdates.address2 = args.address2.trim();
    }
    if (args.town !== undefined) {
      userUpdates.town = args.town.trim();
    }
    if (args.county !== undefined) {
      userUpdates.county = args.county.trim();
    }
    if (normalizedPostcode !== undefined) {
      userUpdates.postcode = normalizedPostcode;
    }
    if (args.country !== undefined) {
      userUpdates.country = args.country.trim();
    }

    // Update user table via Better Auth adapter
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: user._id, operator: "eq" }],
        update: userUpdates,
      },
    });

    // Find linked guardianIdentity by userId
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    // If guardianIdentity found, sync name and address fields to it
    if (guardianIdentity) {
      const guardianUpdates: Record<string, string | number | undefined> = {
        updatedAt: Date.now(),
      };

      // Sync name fields
      if (args.firstName !== undefined) {
        guardianUpdates.firstName = args.firstName.trim();
      }
      if (args.lastName !== undefined) {
        guardianUpdates.lastName = args.lastName.trim();
      }

      // Sync phone if provided
      if (normalizedPhone !== undefined) {
        guardianUpdates.phone = normalizedPhone;
      }

      // Sync address fields
      if (args.address !== undefined) {
        guardianUpdates.address = args.address.trim();
      }
      if (args.address2 !== undefined) {
        guardianUpdates.address2 = args.address2.trim();
      }
      if (args.town !== undefined) {
        guardianUpdates.town = args.town.trim();
      }
      if (args.county !== undefined) {
        guardianUpdates.county = args.county.trim();
      }
      if (normalizedPostcode !== undefined) {
        guardianUpdates.postcode = normalizedPostcode;
      }
      if (args.country !== undefined) {
        guardianUpdates.country = args.country.trim();
      }

      // Update guardianIdentity
      await ctx.db.patch(guardianIdentity._id, guardianUpdates);
    }

    return { success: true };
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

    // Update the user record via component function
    const result = await ctx.runMutation(
      components.betterAuth.userFunctions.skipProfileCompletionStep,
      {
        userId: user._id,
        currentSkipCount,
      }
    );

    return result;
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
      address2: v.optional(v.string()), // Phase 0.6: Address line 2
      town: v.optional(v.string()),
      county: v.optional(v.string()), // Phase 0.6: County/State/Province
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
      address2: user.address2,
      town: user.town,
      county: user.county,
      country: user.country,
      skipCount,
      canSkip: skipCount < MAX_SKIPS,
    };
  },
});
