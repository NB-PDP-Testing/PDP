/**
 * User Preferences - Stub Implementation
 * TODO: Implement full userPreferences table and CRUD operations
 *
 * This is a minimal stub to allow Enhanced User Menu components to compile.
 * The feature flag is OFF by default, so this won't run in production until implemented.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Get usage insights for a user
 * TODO: Implement when userPreferences table is added to schema
 */
export const getUsageInsights = query({
  args: { userId: v.string() },
  returns: v.union(
    v.object({
      mostUsedOrgs: v.array(
        v.object({
          orgId: v.string(),
          orgName: v.string(),
          role: v.union(
            v.literal("admin"),
            v.literal("coach"),
            v.literal("parent"),
            v.literal("player")
          ),
          accessCount: v.number(),
          totalMinutesSpent: v.number(),
        })
      ),
      recentOrgs: v.array(
        v.object({
          orgId: v.string(),
          orgName: v.string(),
          lastAccessedAt: v.number(),
        })
      ),
    }),
    v.null()
  ),
  handler: (_ctx, _args) => {
    // Stub implementation - returns null
    // Real implementation will query userPreferences table
    return null;
  },
});

/**
 * Update user profile
 * TODO: Implement when users table updates are added
 */
export const updateProfile = mutation({
  args: {
    userId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: (_ctx, _args) => {
    // Stub implementation
    return { success: false };
  },
});

/**
 * Get user auth method
 * TODO: Implement to check if user has OAuth account
 */
export const getUserAuthMethod = query({
  args: { userId: v.string() },
  returns: v.union(
    v.object({
      hasOAuthAccount: v.boolean(),
      oauthProvider: v.optional(
        v.union(v.literal("google"), v.literal("microsoft"))
      ),
    }),
    v.null()
  ),
  handler: (_ctx, _args) => {
    // Stub implementation - returns null
    return null;
  },
});
