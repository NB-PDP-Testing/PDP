/**
 * User Preferences - Stub Implementation
 * TODO: Implement full userPreferences table and CRUD operations
 *
 * This is a minimal stub to allow Enhanced User Menu components to compile.
 * The feature flag is OFF by default, so this won't run in production until implemented.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";

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
          accessCount: v.number(),
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
export const updateProfile = query({
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
