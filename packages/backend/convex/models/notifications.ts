import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// ============================================================
// NOTIFICATION TYPES AND VALIDATORS
// ============================================================

const notificationTypeValidator = v.union(
  // Role & Team notifications
  v.literal("role_granted"),
  v.literal("team_assigned"),
  v.literal("team_removed"),
  v.literal("child_declined"),
  v.literal("invitation_request"),
  // Injury notifications (Phase 1 - Issue #261)
  v.literal("injury_reported"),
  v.literal("injury_status_changed"),
  v.literal("severe_injury_alert"),
  v.literal("injury_cleared"),
  // Injury notifications (Phase 2 - Recovery Management)
  v.literal("milestone_completed"),
  v.literal("clearance_received"),
  // Org invitation notifications (Issue #437)
  v.literal("org_invitation_received"),
  // Graduation notifications (Phase 2 - Adult Player Graduation Flow)
  v.literal("age_transition_available"), // Guardian notified player turned 18
  v.literal("age_transition_claimed"), // Admins notified player claimed their account
  // Wellness access notifications (Phase 4)
  v.literal("wellness_access_request"), // Player notified a coach requested access
  v.literal("wellness_reminder"), // Daily wellness check-in reminder (US-P4-009)
  // Player role notifications (Phase 6)
  v.literal("player_role_approved") // Player self-registration approved by admin
);

const targetRoleValidator = v.optional(
  v.union(
    v.literal("coach"),
    v.literal("admin"),
    v.literal("parent"),
    v.literal("player")
  )
);

const notificationValidator = v.object({
  _id: v.id("notifications"),
  _creationTime: v.number(),
  userId: v.string(),
  organizationId: v.string(),
  type: notificationTypeValidator,
  title: v.string(),
  message: v.string(),
  link: v.optional(v.string()),
  targetRole: targetRoleValidator,
  // Injury context (optional - only set for injury notifications)
  relatedInjuryId: v.optional(v.id("playerInjuries")),
  relatedPlayerId: v.optional(v.id("playerIdentities")),
  createdAt: v.number(),
  seenAt: v.optional(v.number()),
  dismissedAt: v.optional(v.number()),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get unseen notifications for the authenticated user
 * Used by NotificationProvider for real-time toast display
 *
 * When activeRole is provided: only returns notifications where
 *   targetRole === activeRole OR targetRole is not set (global notifications).
 * When activeRole is omitted: returns all unseen notifications (backward compatible).
 */
export const getUnseenNotifications = query({
  args: {
    activeRole: v.optional(
      v.union(
        v.literal("coach"),
        v.literal("admin"),
        v.literal("parent"),
        v.literal("player")
      )
    ),
  },
  returns: v.array(
    v.object({
      _id: v.id("notifications"),
      type: notificationTypeValidator,
      title: v.string(),
      message: v.string(),
      link: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    // Query notifications where seenAt is undefined (unseen)
    // Note: Convex doesn't support querying for undefined directly in index,
    // so we query by user and filter in memory
    const userId = user._id as string;
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Filter to only unseen notifications
    let unseen = notifications.filter((n) => n.seenAt === undefined);

    // When activeRole is provided, filter to role-scoped notifications:
    // - notifications for this role
    // - notifications with no targetRole (global — shown regardless of active role)
    if (args.activeRole) {
      const role = args.activeRole;
      unseen = unseen.filter(
        (n) => n.targetRole === undefined || n.targetRole === role
      );
    }

    return unseen.map((n) => ({
      _id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      createdAt: n.createdAt,
    }));
  },
});

/**
 * Get recent notifications for the authenticated user
 * Includes both seen and unseen notifications
 *
 * When activeRole is provided: only returns notifications where
 *   targetRole === activeRole OR targetRole is not set (global notifications).
 * When activeRole is omitted: returns all recent notifications (backward compatible).
 */
export const getRecentNotifications = query({
  args: {
    limit: v.optional(v.number()),
    activeRole: v.optional(
      v.union(
        v.literal("coach"),
        v.literal("admin"),
        v.literal("parent"),
        v.literal("player")
      )
    ),
  },
  returns: v.array(notificationValidator),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const limit = args.limit ?? 20;
    const userId = user._id as string;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    let filtered = notifications;

    // When activeRole is provided, apply role-scoped filter
    if (args.activeRole) {
      const role = args.activeRole;
      filtered = filtered.filter(
        (n) => n.targetRole === undefined || n.targetRole === role
      );
    }

    return filtered.slice(0, limit);
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Mark a single notification as seen
 */
export const markNotificationSeen = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    const userId = user._id as string;

    // Verify the notification belongs to this user
    if (notification.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Only update if not already seen
    if (notification.seenAt === undefined) {
      await ctx.db.patch(args.notificationId, {
        seenAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Mark all notifications as seen for the authenticated user
 */
export const markAllNotificationsSeen = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const userId = user._id as string;

    // Get all unseen notifications for this user
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .collect();

    // Update all unseen notifications
    for (const notification of notifications) {
      if (notification.seenAt === undefined) {
        await ctx.db.patch(notification._id, {
          seenAt: now,
        });
      }
    }

    return null;
  },
});

/**
 * Dismiss a notification (hides from UI)
 */
export const dismissNotification = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    const userId = user._id as string;

    // Verify the notification belongs to this user
    if (notification.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.notificationId, {
      dismissedAt: Date.now(),
    });

    return null;
  },
});

// ============================================================
// INTERNAL MUTATIONS (called by other backend code)
// ============================================================

/**
 * Create a new notification (internal only)
 * Called by other mutations when events occur (role grants, team assignments, injuries, etc.)
 *
 * targetRole: when set, notification only appears when user is acting in that role.
 * Omit targetRole for global notifications (shown regardless of active role).
 */
export const createNotification = internalMutation({
  args: {
    userId: v.string(),
    organizationId: v.string(),
    type: notificationTypeValidator,
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    targetRole: targetRoleValidator,
    // Injury context (optional)
    relatedInjuryId: v.optional(v.id("playerInjuries")),
    relatedPlayerId: v.optional(v.id("playerIdentities")),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      organizationId: args.organizationId,
      type: args.type,
      title: args.title,
      message: args.message,
      link: args.link,
      targetRole: args.targetRole,
      relatedInjuryId: args.relatedInjuryId,
      relatedPlayerId: args.relatedPlayerId,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});
