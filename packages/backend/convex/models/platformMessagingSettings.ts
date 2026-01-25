/**
 * Platform Messaging Settings Queries and Mutations (Phase 6.3)
 *
 * Manages the platformMessagingSettings singleton table for platform-wide controls.
 * Allows platform staff to enable/disable AI features and activate emergency mode.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

/**
 * Get platform messaging settings (PLATFORM STAFF ONLY)
 * Returns current feature toggles and emergency mode status
 * Returns null if no settings exist (all features enabled by default)
 */
export const getPlatformMessagingSettings = query({
  args: {},
  returns: v.union(
    v.object({
      aiGenerationEnabled: v.boolean(),
      autoApprovalEnabled: v.boolean(),
      parentNotificationsEnabled: v.boolean(),
      emergencyMode: v.boolean(),
      emergencyMessage: v.optional(v.string()),
      lastUpdatedAt: v.number(),
      lastUpdatedBy: v.optional(v.id("user")),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Check authorization
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser?.isPlatformStaff) {
      throw new Error("Unauthorized: Platform staff access required");
    }

    // Get the singleton settings record
    const settings = await ctx.db.query("platformMessagingSettings").first();

    if (!settings) {
      return null; // No settings record = all features enabled by default
    }

    return {
      aiGenerationEnabled: settings.aiGenerationEnabled,
      autoApprovalEnabled: settings.autoApprovalEnabled,
      parentNotificationsEnabled: settings.parentNotificationsEnabled,
      emergencyMode: settings.emergencyMode,
      emergencyMessage: settings.emergencyMessage,
      lastUpdatedAt: settings.lastUpdatedAt,
      lastUpdatedBy: settings.lastUpdatedBy,
    };
  },
});

/**
 * Update individual feature toggle (PLATFORM STAFF ONLY)
 * Allows enabling/disabling specific AI features
 */
export const updateFeatureToggle = mutation({
  args: {
    feature: v.union(
      v.literal("aiGenerationEnabled"),
      v.literal("autoApprovalEnabled"),
      v.literal("parentNotificationsEnabled")
    ),
    enabled: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Check authorization
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser?.isPlatformStaff) {
      throw new Error("Unauthorized: Platform staff access required");
    }

    // Get or create the singleton settings record
    const settings = await ctx.db.query("platformMessagingSettings").first();

    if (!settings) {
      // Create initial settings record with all features enabled
      await ctx.db.insert("platformMessagingSettings", {
        settingId: "global",
        aiGenerationEnabled:
          args.feature === "aiGenerationEnabled" ? args.enabled : true,
        autoApprovalEnabled:
          args.feature === "autoApprovalEnabled" ? args.enabled : true,
        parentNotificationsEnabled:
          args.feature === "parentNotificationsEnabled" ? args.enabled : true,
        emergencyMode: false,
        lastUpdatedAt: Date.now(),
        lastUpdatedBy: currentUser._id,
      });

      return {
        success: true,
        message: `Settings initialized with ${args.feature} = ${args.enabled}`,
      };
    }

    // Update the specific feature toggle
    await ctx.db.patch(settings._id, {
      [args.feature]: args.enabled,
      lastUpdatedAt: Date.now(),
      lastUpdatedBy: currentUser._id,
    });

    return {
      success: true,
      message: `${args.feature} set to ${args.enabled}`,
    };
  },
});

/**
 * Activate emergency mode (PLATFORM STAFF ONLY)
 * Disables ALL AI features and optionally shows a message to users
 */
export const activateEmergencyMode = mutation({
  args: {
    enabled: v.boolean(),
    message: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Check authorization
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser?.isPlatformStaff) {
      throw new Error("Unauthorized: Platform staff access required");
    }

    // Get or create the singleton settings record
    const settings = await ctx.db.query("platformMessagingSettings").first();

    if (!settings) {
      // Create initial settings record with emergency mode
      await ctx.db.insert("platformMessagingSettings", {
        settingId: "global",
        aiGenerationEnabled: !args.enabled, // Disabled if emergency mode on
        autoApprovalEnabled: !args.enabled,
        parentNotificationsEnabled: !args.enabled,
        emergencyMode: args.enabled,
        emergencyMessage: args.message,
        lastUpdatedAt: Date.now(),
        lastUpdatedBy: currentUser._id,
      });

      return {
        success: true,
        message: args.enabled
          ? "Emergency mode activated - all AI features disabled"
          : "Emergency mode deactivated",
      };
    }

    // Update emergency mode and disable all features if activating
    if (args.enabled) {
      await ctx.db.patch(settings._id, {
        emergencyMode: true,
        emergencyMessage: args.message,
        aiGenerationEnabled: false,
        autoApprovalEnabled: false,
        parentNotificationsEnabled: false,
        lastUpdatedAt: Date.now(),
        lastUpdatedBy: currentUser._id,
      });

      return {
        success: true,
        message: "Emergency mode activated - all AI features disabled",
      };
    }

    // Deactivate emergency mode (leave features disabled, admin can re-enable individually)
    await ctx.db.patch(settings._id, {
      emergencyMode: false,
      emergencyMessage: undefined,
      lastUpdatedAt: Date.now(),
      lastUpdatedBy: currentUser._id,
    });

    return {
      success: true,
      message: "Emergency mode deactivated",
    };
  },
});
