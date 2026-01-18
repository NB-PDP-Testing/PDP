/**
 * User Preferences - Full Implementation
 * Handles user preferences, default org/role settings, and usage tracking for smart defaults
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Get user preferences
 * Returns preferences or null if not set
 */
export const getUserPreferences = query({
  args: { userId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("userPreferences"),
      userId: v.string(),
      defaultOrganizationId: v.optional(v.string()),
      defaultRole: v.optional(
        v.union(
          v.literal("admin"),
          v.literal("coach"),
          v.literal("parent"),
          v.literal("player")
        )
      ),
      defaultPage: v.optional(v.string()),
      orgAccessHistory: v.optional(
        v.array(
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
            lastAccessedAt: v.number(),
          })
        )
      ),
      themePreference: v.optional(
        v.union(v.literal("light"), v.literal("dark"), v.literal("system"))
      ),
      densityPreference: v.optional(
        v.union(
          v.literal("compact"),
          v.literal("comfortable"),
          v.literal("spacious")
        )
      ),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return prefs || null;
  },
});

/**
 * Track organization access for usage insights
 * Called whenever user switches to a different org/role
 */
export const trackOrgAccess = mutation({
  args: {
    userId: v.string(),
    orgId: v.string(),
    orgName: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("coach"),
      v.literal("parent"),
      v.literal("player")
    ),
    minutesSpent: v.optional(v.number()), // Optional: time spent in session
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find or create user preferences
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();
    const minutesSpent = args.minutesSpent || 0;

    if (!prefs) {
      // Create new preferences with first access
      await ctx.db.insert("userPreferences", {
        userId: args.userId,
        orgAccessHistory: [
          {
            orgId: args.orgId,
            orgName: args.orgName,
            role: args.role,
            accessCount: 1,
            totalMinutesSpent: minutesSpent,
            lastAccessedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      });
      return null;
    }

    // Update existing preferences
    const history = prefs.orgAccessHistory || [];

    // Find existing entry for this org/role combo
    const existingIndex = history.findIndex(
      (h) => h.orgId === args.orgId && h.role === args.role
    );

    let updatedHistory: typeof history;

    if (existingIndex >= 0) {
      // Update existing entry
      updatedHistory = [...history];
      updatedHistory[existingIndex] = {
        ...updatedHistory[existingIndex],
        orgName: args.orgName, // Update org name in case it changed
        accessCount: updatedHistory[existingIndex].accessCount + 1,
        totalMinutesSpent:
          updatedHistory[existingIndex].totalMinutesSpent + minutesSpent,
        lastAccessedAt: now,
      };
    } else {
      // Add new entry
      updatedHistory = [
        ...history,
        {
          orgId: args.orgId,
          orgName: args.orgName,
          role: args.role,
          accessCount: 1,
          totalMinutesSpent: minutesSpent,
          lastAccessedAt: now,
        },
      ];
    }

    // Update preferences
    await ctx.db.patch(prefs._id, {
      orgAccessHistory: updatedHistory,
      updatedAt: now,
    });

    return null;
  },
});

/**
 * Get usage insights for a user
 * Returns most used orgs and recent orgs with scoring
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
          score: v.number(), // Calculated score for sorting
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
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!prefs?.orgAccessHistory || prefs.orgAccessHistory.length === 0) {
      return null;
    }

    const now = Date.now();
    const msPerDay = 1000 * 60 * 60 * 24;

    // Calculate scores for each org/role
    // Formula: (accessCount * 2) - daysSinceLastAccess + (totalMinutesSpent * 0.5)
    const scored = prefs.orgAccessHistory.map((h) => {
      const daysSinceLastAccess = (now - h.lastAccessedAt) / msPerDay;
      const score =
        h.accessCount * 2 - daysSinceLastAccess + h.totalMinutesSpent * 0.5;

      return {
        orgId: h.orgId,
        orgName: h.orgName,
        role: h.role,
        accessCount: h.accessCount,
        totalMinutesSpent: h.totalMinutesSpent,
        lastAccessedAt: h.lastAccessedAt,
        score,
      };
    });

    // Sort by score (highest first) and take top 5
    const mostUsed = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ lastAccessedAt, ...rest }) => rest); // Remove lastAccessedAt for mostUsed

    // Sort by lastAccessedAt (most recent first) and take top 5
    const recent = scored
      .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
      .slice(0, 5)
      .map((h) => ({
        orgId: h.orgId,
        orgName: h.orgName,
        lastAccessedAt: h.lastAccessedAt,
      }));

    return {
      mostUsedOrgs: mostUsed,
      recentOrgs: recent,
    };
  },
});

/**
 * Update user preferences (default org/role, theme, density)
 */
export const updateUserPreferences = mutation({
  args: {
    userId: v.string(),
    defaultOrganizationId: v.optional(v.string()),
    defaultRole: v.optional(
      v.union(
        v.literal("admin"),
        v.literal("coach"),
        v.literal("parent"),
        v.literal("player")
      )
    ),
    defaultPage: v.optional(v.string()),
    themePreference: v.optional(
      v.union(v.literal("light"), v.literal("dark"), v.literal("system"))
    ),
    densityPreference: v.optional(
      v.union(
        v.literal("compact"),
        v.literal("comfortable"),
        v.literal("spacious")
      )
    ),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Find or create user preferences
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    // Build update object (only include provided fields)
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic update object for flexible field updates
    const updates: Record<string, any> = {
      updatedAt: now,
    };

    if (args.defaultOrganizationId !== undefined) {
      updates.defaultOrganizationId = args.defaultOrganizationId;
    }
    if (args.defaultRole !== undefined) {
      updates.defaultRole = args.defaultRole;
    }
    if (args.defaultPage !== undefined) {
      updates.defaultPage = args.defaultPage;
    }
    if (args.themePreference !== undefined) {
      updates.themePreference = args.themePreference;
    }
    if (args.densityPreference !== undefined) {
      updates.densityPreference = args.densityPreference;
    }

    if (prefs) {
      // Update existing preferences
      await ctx.db.patch(prefs._id, updates);
    } else {
      // Create new preferences
      await ctx.db.insert("userPreferences", {
        userId: args.userId,
        ...updates,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Clear default org/role preference (revert to smart defaults)
 */
export const clearDefaultPreference = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!prefs) {
      return { success: true }; // Nothing to clear
    }

    // Clear default org/role/page
    await ctx.db.patch(prefs._id, {
      defaultOrganizationId: undefined,
      defaultRole: undefined,
      defaultPage: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update user profile information
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
    // TODO: This would update the Better Auth user table
    // For now, profile updates are handled by Better Auth client SDK
    // This is a placeholder for future server-side profile updates
    return { success: false };
  },
});

/**
 * Get user auth method (OAuth vs email/password)
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
    // TODO: Query Better Auth account table to check for OAuth providers
    // For now, return null (not implemented)
    return null;
  },
});
