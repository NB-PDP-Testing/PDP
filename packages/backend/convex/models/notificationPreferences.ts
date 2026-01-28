/**
 * Notification Preferences
 *
 * Manages user notification preferences for email, push, and in-app notifications.
 * Supports both global preferences and organization-specific overrides.
 */

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// Default notification preferences for new users
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailEnabled: true,
  emailTeamUpdates: true,
  emailPlayerUpdates: true,
  emailAnnouncements: true,
  emailAssessments: true,
  pushEnabled: false,
  pushSubscription: undefined,
  inAppEnabled: true,
  inAppSound: false,
  inAppBadge: true,
};

// Validator for notification preferences
const notificationPreferencesValidator = v.object({
  emailEnabled: v.boolean(),
  emailTeamUpdates: v.boolean(),
  emailPlayerUpdates: v.boolean(),
  emailAnnouncements: v.boolean(),
  emailAssessments: v.boolean(),
  pushEnabled: v.boolean(),
  pushSubscription: v.optional(v.string()),
  inAppEnabled: v.boolean(),
  inAppSound: v.boolean(),
  inAppBadge: v.boolean(),
});

// Return type for preferences (includes all fields)
const notificationPreferencesReturnValidator = v.object({
  _id: v.id("notificationPreferences"),
  userId: v.string(),
  organizationId: v.optional(v.string()),
  emailEnabled: v.boolean(),
  emailTeamUpdates: v.boolean(),
  emailPlayerUpdates: v.boolean(),
  emailAnnouncements: v.boolean(),
  emailAssessments: v.boolean(),
  pushEnabled: v.boolean(),
  pushSubscription: v.optional(v.string()),
  inAppEnabled: v.boolean(),
  inAppSound: v.boolean(),
  inAppBadge: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// ============ QUERIES ============

/**
 * Get notification preferences for the current user
 * Returns preferences for a specific org if orgId provided, otherwise global prefs
 */
export const getNotificationPreferences = query({
  args: {
    organizationId: v.optional(v.string()),
  },
  returns: v.union(notificationPreferencesReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return null;
    }

    // First try org-specific prefs if orgId provided
    if (args.organizationId) {
      const orgPrefs = await ctx.db
        .query("notificationPreferences")
        .withIndex("by_userId_orgId", (q) =>
          q.eq("userId", user._id).eq("organizationId", args.organizationId)
        )
        .first();

      if (orgPrefs) {
        return orgPrefs;
      }
    }

    // Fall back to global preferences (no org ID)
    const globalPrefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("organizationId"), undefined))
      .first();

    return globalPrefs;
  },
});

/**
 * Get default notification preferences
 * Returns the default values for new users
 */
export const getDefaultNotificationPreferences = query({
  args: {},
  returns: v.object({
    emailEnabled: v.boolean(),
    emailTeamUpdates: v.boolean(),
    emailPlayerUpdates: v.boolean(),
    emailAnnouncements: v.boolean(),
    emailAssessments: v.boolean(),
    pushEnabled: v.boolean(),
    pushSubscription: v.optional(v.string()),
    inAppEnabled: v.boolean(),
    inAppSound: v.boolean(),
    inAppBadge: v.boolean(),
  }),
  handler: async () => DEFAULT_NOTIFICATION_PREFERENCES,
});

// ============ MUTATIONS ============

/**
 * Update notification preferences for the current user
 * Creates preferences if they don't exist
 */
export const updateNotificationPreferences = mutation({
  args: {
    organizationId: v.optional(v.string()),
    preferences: notificationPreferencesValidator,
  },
  returns: v.id("notificationPreferences"),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Must be authenticated");
    }

    const now = Date.now();

    // Check for existing preferences
    let existingPrefs: Doc<"notificationPreferences"> | null = null;
    if (args.organizationId) {
      existingPrefs = await ctx.db
        .query("notificationPreferences")
        .withIndex("by_userId_orgId", (q) =>
          q.eq("userId", user._id).eq("organizationId", args.organizationId)
        )
        .first();
    } else {
      existingPrefs = await ctx.db
        .query("notificationPreferences")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("organizationId"), undefined))
        .first();
    }

    if (existingPrefs) {
      // Update existing preferences
      await ctx.db.patch(existingPrefs._id, {
        ...args.preferences,
        updatedAt: now,
      });
      return existingPrefs._id;
    }

    // Create new preferences
    const id = await ctx.db.insert("notificationPreferences", {
      userId: user._id,
      organizationId: args.organizationId,
      ...args.preferences,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

/**
 * Update push subscription for the current user
 * Called when user enables/disables push notifications
 */
export const updatePushSubscription = mutation({
  args: {
    organizationId: v.optional(v.string()),
    pushEnabled: v.boolean(),
    pushSubscription: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Must be authenticated");
    }

    const now = Date.now();

    // Check for existing preferences
    let existingPrefs: Doc<"notificationPreferences"> | null = null;
    if (args.organizationId) {
      existingPrefs = await ctx.db
        .query("notificationPreferences")
        .withIndex("by_userId_orgId", (q) =>
          q.eq("userId", user._id).eq("organizationId", args.organizationId)
        )
        .first();
    } else {
      existingPrefs = await ctx.db
        .query("notificationPreferences")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("organizationId"), undefined))
        .first();
    }

    if (existingPrefs) {
      await ctx.db.patch(existingPrefs._id, {
        pushEnabled: args.pushEnabled,
        pushSubscription: args.pushSubscription,
        updatedAt: now,
      });
    } else {
      // Create with defaults plus push settings
      await ctx.db.insert("notificationPreferences", {
        userId: user._id,
        organizationId: args.organizationId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        pushEnabled: args.pushEnabled,
        pushSubscription: args.pushSubscription,
        createdAt: now,
        updatedAt: now,
      });
    }

    return null;
  },
});

/**
 * Reset notification preferences to defaults
 * Optionally for a specific organization
 */
export const resetNotificationPreferences = mutation({
  args: {
    organizationId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Must be authenticated");
    }

    const now = Date.now();

    // Check for existing preferences
    let existingPrefs: Doc<"notificationPreferences"> | null = null;
    if (args.organizationId) {
      existingPrefs = await ctx.db
        .query("notificationPreferences")
        .withIndex("by_userId_orgId", (q) =>
          q.eq("userId", user._id).eq("organizationId", args.organizationId)
        )
        .first();
    } else {
      existingPrefs = await ctx.db
        .query("notificationPreferences")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("organizationId"), undefined))
        .first();
    }

    if (existingPrefs) {
      await ctx.db.patch(existingPrefs._id, {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        updatedAt: now,
      });
    }

    return null;
  },
});
