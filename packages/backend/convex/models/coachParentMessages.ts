import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get coach assignment for a user in an organization
 * Returns the coach assignment record if found, null otherwise
 * @internal - Helper function for use within this module
 */
export async function getCoachAssignmentForOrg(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  orgId: string
) {
  const assignment = await ctx.db
    .query("coachAssignments")
    .withIndex("by_user_and_org", (q) =>
      q.eq("userId", userId).eq("organizationId", orgId)
    )
    .first();

  return assignment || null;
}

/**
 * Get all guardians for a player
 * Returns array of guardian identities with their link details
 * @internal - Helper function for use within this module
 */
export async function getGuardiansForPlayer(
  ctx: QueryCtx | MutationCtx,
  playerIdentityId: Id<"playerIdentities">
) {
  // Get all guardian-player links for this player
  const links = await ctx.db
    .query("guardianPlayerLinks")
    .withIndex("by_player", (q) => q.eq("playerIdentityId", playerIdentityId))
    .collect();

  // Fetch full guardian identity for each link
  const guardians = await Promise.all(
    links.map(async (link) => {
      const guardian = await ctx.db.get(link.guardianIdentityId);
      return {
        link,
        guardian,
      };
    })
  );

  // Filter out any null guardians (should not happen, but be safe)
  return guardians.filter((g) => g.guardian !== null) as Array<{
    link: (typeof links)[0];
    guardian: NonNullable<Awaited<ReturnType<typeof ctx.db.get>>>;
  }>;
}

/**
 * Check if user is an admin or owner in the organization
 * Returns true if user has admin/owner permissions, false otherwise
 * @internal - Helper function for use within this module
 */
export async function isOrgAdmin(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  orgId: string
): Promise<boolean> {
  // Query the member record for this user in this org using Better Auth's adapter
  const memberResult = await ctx.runQuery(
    components.betterAuth.adapter.findOne,
    {
      model: "member",
      where: [
        {
          field: "userId",
          value: userId,
          operator: "eq",
        },
        {
          field: "organizationId",
          value: orgId,
          operator: "eq",
        },
      ],
    }
  );

  if (!memberResult) {
    return false;
  }

  // Check if user is owner, admin role, or has admin functional role
  // Type cast to access member fields from Better Auth
  const member = memberResult as any;
  return (
    member.role === "owner" ||
    member.role === "admin" ||
    member.functionalRoles?.includes("admin")
  );
}

/**
 * Log an audit event for message activity
 * Creates an entry in the messageAuditLog table
 * @internal - Helper function for use within this module
 */
export async function logAuditEvent(
  ctx: MutationCtx,
  data: {
    messageId: Id<"coachParentMessages">;
    organizationId: string;
    action:
      | "created"
      | "edited"
      | "sent"
      | "viewed"
      | "acknowledged"
      | "deleted"
      | "exported"
      | "flagged"
      | "reviewed";
    actorId: string;
    actorType: "coach" | "parent" | "admin" | "system";
    actorName: string;
    details?: {
      previousContent?: string;
      newContent?: string;
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
    };
  }
) {
  await ctx.db.insert("messageAuditLog", {
    messageId: data.messageId,
    organizationId: data.organizationId,
    action: data.action,
    actorId: data.actorId,
    actorType: data.actorType,
    actorName: data.actorName,
    details: data.details,
    timestamp: Date.now(),
  });
}

// ============================================================
// QUERIES
// ============================================================

/**
 * Get a single message by ID with recipient information
 * For parents: returns message if they are a recipient
 * For coaches: returns message if they are the sender
 */
export const getMessageById = query({
  args: {
    messageId: v.id("coachParentMessages"),
  },
  returns: v.union(
    v.object({
      message: v.any(),
      recipient: v.optional(v.any()),
      isUnread: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Get current user
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    // Fetch the message
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      return null;
    }

    // Check if user is the sender (coach)
    if (message.senderId === authUser.userId) {
      // Coach can view any message they sent
      return {
        message,
        recipient: undefined,
        isUnread: false,
      };
    }

    // Check if user is a recipient (parent)
    // Find guardian identity for this user
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", authUser.userId ?? ""))
      .first();

    if (!guardianIdentity) {
      return null; // User is not a guardian
    }

    // Find recipient record for this guardian and message
    const recipients = await ctx.db
      .query("messageRecipients")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    const recipient = recipients.find(
      (r) => r.guardianIdentityId === guardianIdentity._id
    );

    if (!recipient) {
      return null; // User is not a recipient of this message
    }

    return {
      message,
      recipient,
      isUnread: recipient.inAppViewedAt === undefined,
    };
  },
});

/**
 * Get messages sent by the current coach
 * Returns messages with recipient count and viewed count
 */
export const getMyMessages = query({
  args: {
    organizationId: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("coachParentMessages"),
      _creationTime: v.number(),
      messageType: v.union(v.literal("direct"), v.literal("insight")),
      organizationId: v.string(),
      teamId: v.optional(v.string()),
      senderId: v.string(),
      senderName: v.string(),
      playerIdentityId: v.id("playerIdentities"),
      playerName: v.string(),
      subject: v.string(),
      body: v.string(),
      context: v.optional(
        v.object({
          sessionType: v.optional(v.string()),
          sessionDate: v.optional(v.string()),
          developmentArea: v.optional(v.string()),
        })
      ),
      deliveryMethod: v.union(
        v.literal("in_app"),
        v.literal("email"),
        v.literal("both")
      ),
      priority: v.union(v.literal("normal"), v.literal("high")),
      status: v.union(
        v.literal("draft"),
        v.literal("pending_approval"),
        v.literal("sent"),
        v.literal("delivered"),
        v.literal("failed")
      ),
      createdAt: v.number(),
      sentAt: v.optional(v.number()),
      updatedAt: v.number(),
      // Additional computed fields
      recipientCount: v.number(),
      viewedCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get current user
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return [];
    }

    // Query messages by sender, ordered by creation date
    const allMessages = await ctx.db
      .query("coachParentMessages")
      .withIndex("by_sender_and_createdAt", (q) =>
        q.eq("senderId", authUser._id)
      )
      .order("desc")
      .collect();

    // Filter by org and status in memory
    let filteredMessages = allMessages.filter(
      (m) => m.organizationId === args.organizationId
    );

    if (args.status) {
      filteredMessages = filteredMessages.filter(
        (m) => m.status === args.status
      );
    }

    // Apply limit
    const limit = args.limit || 50;
    const limitedMessages = filteredMessages.slice(0, limit);

    // Get recipient stats for each message
    const messagesWithStats = await Promise.all(
      limitedMessages.map(async (message) => {
        const recipients = await ctx.db
          .query("messageRecipients")
          .withIndex("by_message", (q) => q.eq("messageId", message._id))
          .collect();

        const recipientCount = recipients.length;
        const viewedCount = recipients.filter(
          (r) => r.inAppViewedAt !== undefined
        ).length;

        return {
          ...message,
          recipientCount,
          viewedCount,
        };
      })
    );

    return messagesWithStats;
  },
});

/**
 * Get count of unread messages for the current parent
 * Used for badge display in navigation
 */
export const getUnreadCount = query({
  args: {
    organizationId: v.optional(v.string()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    // Get current user
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return 0;
    }

    // Find guardian identity for this user
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
      .first();

    if (!guardianIdentity) {
      // User is not a guardian
      return 0;
    }

    // Get all unread message recipients for this guardian
    const allRecipients = await ctx.db
      .query("messageRecipients")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", guardianIdentity._id)
      )
      .collect();

    // Filter where inAppViewedAt is undefined (unread)
    const unreadRecipients = allRecipients.filter(
      (r) => r.inAppViewedAt === undefined
    );

    // If organizationId provided, fetch each message and filter by org
    if (args.organizationId) {
      const messagesWithRecipients = await Promise.all(
        unreadRecipients.map(async (recipient) => {
          const message = await ctx.db.get(recipient.messageId);
          return {
            recipient,
            message,
          };
        })
      );

      // Filter by organization
      const orgFilteredMessages = messagesWithRecipients.filter(
        (item) =>
          item.message !== null &&
          item.message.organizationId === args.organizationId
      );

      return orgFilteredMessages.length;
    }

    // No org filter - return total unread count
    return unreadRecipients.length;
  },
});

/**
 * Get messages for the current parent about their children
 * Returns messages with recipient tracking and unread status
 */
export const getMessagesForParent = query({
  args: {
    organizationId: v.optional(v.string()),
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      message: v.object({
        _id: v.id("coachParentMessages"),
        _creationTime: v.number(),
        messageType: v.union(v.literal("direct"), v.literal("insight")),
        organizationId: v.string(),
        teamId: v.optional(v.string()),
        senderId: v.string(),
        senderName: v.string(),
        playerIdentityId: v.id("playerIdentities"),
        playerName: v.string(),
        subject: v.string(),
        body: v.string(),
        context: v.optional(
          v.object({
            sessionType: v.optional(v.string()),
            sessionDate: v.optional(v.string()),
            developmentArea: v.optional(v.string()),
          })
        ),
        discussionPrompts: v.optional(v.array(v.string())),
        actionItems: v.optional(v.array(v.string())),
        deliveryMethod: v.union(
          v.literal("in_app"),
          v.literal("email"),
          v.literal("both")
        ),
        priority: v.union(v.literal("normal"), v.literal("high")),
        status: v.union(
          v.literal("draft"),
          v.literal("pending_approval"),
          v.literal("sent"),
          v.literal("delivered"),
          v.literal("failed")
        ),
        createdAt: v.number(),
        sentAt: v.optional(v.number()),
        updatedAt: v.number(),
      }),
      recipient: v.object({
        _id: v.id("messageRecipients"),
        messageId: v.id("coachParentMessages"),
        guardianIdentityId: v.id("guardianIdentities"),
        guardianUserId: v.optional(v.string()),
        deliveryStatus: v.union(
          v.literal("pending"),
          v.literal("sent"),
          v.literal("delivered"),
          v.literal("failed"),
          v.literal("bounced")
        ),
        deliveryMethod: v.union(v.literal("in_app"), v.literal("email")),
        inAppViewedAt: v.optional(v.number()),
        acknowledgedAt: v.optional(v.number()),
        acknowledgmentNote: v.optional(v.string()),
      }),
      isUnread: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    // Get current user
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return [];
    }

    // Find guardian identity for this user
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
      .first();

    if (!guardianIdentity) {
      // User is not a guardian
      return [];
    }

    // Get all message recipients for this guardian
    const allRecipients = await ctx.db
      .query("messageRecipients")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", guardianIdentity._id)
      )
      .collect();

    // Filter by unread if requested
    let recipients = allRecipients;
    if (args.unreadOnly) {
      recipients = recipients.filter((r) => r.inAppViewedAt === undefined);
    }

    // Fetch messages for each recipient
    const messagesWithRecipients = await Promise.all(
      recipients.map(async (recipient) => {
        const message = await ctx.db.get(recipient.messageId);
        return {
          recipient,
          message,
        };
      })
    );

    // Filter out any null messages (shouldn't happen but be safe)
    type MessageDoc = NonNullable<
      Awaited<ReturnType<typeof ctx.db.get<"coachParentMessages">>>
    >;
    const validMessages = messagesWithRecipients.filter(
      (item) => item.message !== null
    ) as Array<{
      recipient: (typeof recipients)[0];
      message: MessageDoc;
    }>;

    // Filter by organization if provided
    let filteredMessages = validMessages;
    if (args.organizationId) {
      filteredMessages = validMessages.filter(
        (item) => item.message.organizationId === args.organizationId
      );
    }

    // Sort by message creation date descending
    filteredMessages.sort((a, b) => b.message.createdAt - a.message.createdAt);

    // Apply limit
    const limit = args.limit || 50;
    const limitedMessages = filteredMessages.slice(0, limit);

    // Return with isUnread flag
    return limitedMessages.map((item) => ({
      message: item.message,
      recipient: {
        _id: item.recipient._id,
        messageId: item.recipient.messageId,
        guardianIdentityId: item.recipient.guardianIdentityId,
        guardianUserId: item.recipient.guardianUserId,
        deliveryStatus: item.recipient.deliveryStatus,
        deliveryMethod: item.recipient.deliveryMethod,
        inAppViewedAt: item.recipient.inAppViewedAt,
        acknowledgedAt: item.recipient.acknowledgedAt,
        acknowledgmentNote: item.recipient.acknowledgmentNote,
      },
      isUnread: item.recipient.inAppViewedAt === undefined,
    }));
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Create a direct message from a coach to parent(s) about a player
 * Validates coach assignment and guardian-player relationships
 * Can be sent immediately or saved as draft
 */
export const createDirectMessage = mutation({
  args: {
    organizationId: v.string(),
    teamId: v.optional(v.string()),
    playerIdentityId: v.id("playerIdentities"),
    recipientGuardianIds: v.array(v.id("guardianIdentities")),
    subject: v.string(),
    body: v.string(),
    context: v.optional(
      v.object({
        sessionType: v.optional(v.string()),
        sessionDate: v.optional(v.string()),
        developmentArea: v.optional(v.string()),
      })
    ),
    deliveryMethod: v.union(
      v.literal("in_app"),
      v.literal("email"),
      v.literal("both")
    ),
    priority: v.optional(v.union(v.literal("normal"), v.literal("high"))),
    sendImmediately: v.optional(v.boolean()),
  },
  returns: v.id("coachParentMessages"),
  handler: async (ctx, args) => {
    // 1. Verify user is authenticated
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new Error("User must be authenticated to send messages");
    }

    // 2. Verify coach has assignment in this org
    const coachAssignment = await getCoachAssignmentForOrg(
      ctx,
      authUser._id,
      args.organizationId
    );
    if (!coachAssignment) {
      throw new Error(
        "You must be a coach in this organization to send messages"
      );
    }

    // 3. Get sender name from user
    const senderName =
      `${authUser.firstName || ""} ${authUser.lastName || ""}`.trim() ||
      authUser.name ||
      "Coach";

    // 4. Get player info
    const playerIdentity = await ctx.db.get(args.playerIdentityId);
    if (!playerIdentity) {
      throw new Error("Player not found");
    }
    const playerName = `${playerIdentity.firstName} ${playerIdentity.lastName}`;

    // 5. Validate each recipient is a guardian of this player
    const guardianLinks = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    const validGuardianIds = new Set(
      guardianLinks.map((link) => link.guardianIdentityId)
    );

    for (const guardianId of args.recipientGuardianIds) {
      if (!validGuardianIds.has(guardianId)) {
        throw new Error(
          `Guardian ${guardianId} is not linked to player ${playerName}`
        );
      }
    }

    // 6. Determine message status
    const status = args.sendImmediately ? "sent" : "draft";
    const sentAt = args.sendImmediately ? Date.now() : undefined;

    // 7. Insert the message
    const messageId = await ctx.db.insert("coachParentMessages", {
      messageType: "direct",
      organizationId: args.organizationId,
      teamId: args.teamId,
      senderId: authUser._id,
      senderName,
      recipientGuardianIds: args.recipientGuardianIds,
      playerIdentityId: args.playerIdentityId,
      playerName,
      subject: args.subject,
      body: args.body,
      context: args.context,
      deliveryMethod: args.deliveryMethod,
      priority: args.priority || "normal",
      status,
      createdAt: Date.now(),
      sentAt,
      updatedAt: Date.now(),
    });

    // 8. Create recipient records
    // Note: messageRecipients.deliveryMethod is "in_app" | "email", not "both"
    // For "both", we create a single record with deliveryMethod: "in_app" (primary channel)
    for (const guardianId of args.recipientGuardianIds) {
      // Get guardian user ID if linked
      const guardian = await ctx.db.get(guardianId);
      const guardianUserId = guardian?.userId;

      await ctx.db.insert("messageRecipients", {
        messageId,
        guardianIdentityId: guardianId,
        guardianUserId,
        deliveryStatus: "pending",
        deliveryMethod:
          args.deliveryMethod === "both" ? "in_app" : args.deliveryMethod,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // 9. Log audit event
    await logAuditEvent(ctx, {
      messageId,
      organizationId: args.organizationId,
      action: "created",
      actorId: authUser._id,
      actorType: "coach",
      actorName: senderName,
    });

    return messageId;
  },
});

/**
 * Send a drafted message
 * Updates message status to 'sent', marks recipients as pending, and schedules email delivery
 */
export const sendMessage = mutation({
  args: {
    messageId: v.id("coachParentMessages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Verify user is authenticated
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new Error("User must be authenticated to send messages");
    }

    // 2. Get the message
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // 3. Verify user is the sender
    if (message.senderId !== authUser._id) {
      throw new Error("You can only send messages you created");
    }

    // 4. Update message status
    await ctx.db.patch(args.messageId, {
      status: "sent",
      sentAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 5. Update all recipient records to pending and schedule email delivery
    const recipients = await ctx.db
      .query("messageRecipients")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    // Import internal from _generated/api
    const { internal } = await import("../_generated/api");

    for (const recipient of recipients) {
      await ctx.db.patch(recipient._id, {
        deliveryStatus: "pending",
        updatedAt: Date.now(),
      });

      // Schedule email delivery if deliveryMethod is 'email' or 'both'
      if (
        message.deliveryMethod === "email" ||
        message.deliveryMethod === "both"
      ) {
        await ctx.scheduler.runAfter(
          0,
          internal.actions.messaging.sendMessageEmail,
          {
            messageId: args.messageId,
            recipientId: recipient._id,
          }
        );
      }
    }

    // 6. Log audit event
    await logAuditEvent(ctx, {
      messageId: args.messageId,
      organizationId: message.organizationId,
      action: "sent",
      actorId: authUser._id,
      actorType: "coach",
      actorName: message.senderName,
    });

    return null;
  },
});

/**
 * Mark a message as viewed by the current parent
 * Updates the recipient record with view timestamp and logs audit event
 */
export const markMessageViewed = mutation({
  args: {
    messageId: v.id("coachParentMessages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Get current user
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new Error("User must be authenticated to view messages");
    }

    // 2. Find guardian identity
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
      .first();

    if (!guardianIdentity) {
      throw new Error("User is not a guardian");
    }

    // 3. Get message
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // 4. Find the recipient record for this guardian and message
    const allRecipients = await ctx.db
      .query("messageRecipients")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    const recipient = allRecipients.find(
      (r) => r.guardianIdentityId === guardianIdentity._id
    );

    if (!recipient) {
      throw new Error("You are not a recipient of this message");
    }

    // 5. If already viewed, return early (no double-logging)
    if (recipient.inAppViewedAt !== undefined) {
      return null;
    }

    // 6. Update recipient with view timestamp
    await ctx.db.patch(recipient._id, {
      inAppViewedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 7. Log audit event
    const guardianName = `${guardianIdentity.firstName} ${guardianIdentity.lastName}`;
    await logAuditEvent(ctx, {
      messageId: args.messageId,
      organizationId: message.organizationId,
      action: "viewed",
      actorId: authUser._id,
      actorType: "parent",
      actorName: guardianName,
    });

    return null;
  },
});

/**
 * Acknowledge a message from a coach
 * Parents can optionally add a note when acknowledging
 * Updates the recipient record with acknowledgment timestamp and logs audit event
 */
export const acknowledgeMessage = mutation({
  args: {
    messageId: v.id("coachParentMessages"),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Get current user
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new Error("User must be authenticated to acknowledge messages");
    }

    // 2. Find guardian identity
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
      .first();

    if (!guardianIdentity) {
      throw new Error("User is not a guardian");
    }

    // 3. Get message
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // 4. Find the recipient record for this guardian and message
    const allRecipients = await ctx.db
      .query("messageRecipients")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    const recipient = allRecipients.find(
      (r) => r.guardianIdentityId === guardianIdentity._id
    );

    if (!recipient) {
      throw new Error("You are not a recipient of this message");
    }

    // 5. Update recipient with acknowledgment timestamp and optional note
    await ctx.db.patch(recipient._id, {
      acknowledgedAt: Date.now(),
      acknowledgmentNote: args.note,
      updatedAt: Date.now(),
    });

    // 6. Log audit event
    const guardianName = `${guardianIdentity.firstName} ${guardianIdentity.lastName}`;
    await logAuditEvent(ctx, {
      messageId: args.messageId,
      organizationId: message.organizationId,
      action: "acknowledged",
      actorId: authUser._id,
      actorType: "parent",
      actorName: guardianName,
      details: args.note ? { reason: args.note } : undefined,
    });

    return null;
  },
});

// ============================================================
// ADMIN QUERIES
// ============================================================

/**
 * Get all messages in an organization (admin only)
 * Returns messages with sender and recipient summary info
 */
export const getOrganizationMessages = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("coachParentMessages"),
      subject: v.string(),
      senderName: v.string(),
      playerName: v.string(),
      createdAt: v.number(),
      sentAt: v.optional(v.number()),
      status: v.union(
        v.literal("draft"),
        v.literal("pending_approval"),
        v.literal("sent"),
        v.literal("delivered"),
        v.literal("failed")
      ),
      recipientCount: v.number(),
      viewedCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // 1. Verify user is authenticated
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new Error(
        "User must be authenticated to view organization messages"
      );
    }

    // 2. Verify user is org admin/owner
    const hasAdminAccess = await isOrgAdmin(
      ctx,
      authUser._id,
      args.organizationId
    );
    if (!hasAdminAccess) {
      throw new Error(
        "Only organization admins and owners can view all messages"
      );
    }

    // 3. Query messages by organization
    const limit = args.limit || 100;
    const messages = await ctx.db
      .query("coachParentMessages")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(limit);

    // 4. For each message, get recipient stats
    const messagesWithStats = await Promise.all(
      messages.map(async (message) => {
        // Get all recipients for this message
        const recipients = await ctx.db
          .query("messageRecipients")
          .withIndex("by_message", (q) => q.eq("messageId", message._id))
          .collect();

        // Count recipients and how many have viewed
        const recipientCount = recipients.length;
        const viewedCount = recipients.filter(
          (r) => r.inAppViewedAt !== undefined
        ).length;

        return {
          _id: message._id,
          subject: message.subject,
          senderName: message.senderName,
          playerName: message.playerName,
          createdAt: message.createdAt,
          sentAt: message.sentAt,
          status: message.status,
          recipientCount,
          viewedCount,
        };
      })
    );

    return messagesWithStats;
  },
});

/**
 * Get audit log entries for messages (Admin only)
 * Returns audit trail for compliance review
 *
 * @param organizationId - Organization ID to query logs for
 * @param messageId - Optional specific message ID to filter by
 * @param limit - Maximum number of entries to return (default 200)
 * @returns Array of audit log entries sorted by timestamp descending
 *
 * @security Admin/Owner access only
 */
export const getMessageAuditLog = query({
  args: {
    organizationId: v.string(),
    messageId: v.optional(v.id("coachParentMessages")),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("messageAuditLog"),
      messageId: v.id("coachParentMessages"),
      organizationId: v.string(),
      action: v.union(
        v.literal("created"),
        v.literal("edited"),
        v.literal("sent"),
        v.literal("viewed"),
        v.literal("acknowledged"),
        v.literal("deleted"),
        v.literal("exported"),
        v.literal("flagged"),
        v.literal("reviewed")
      ),
      actorId: v.string(),
      actorType: v.union(
        v.literal("coach"),
        v.literal("parent"),
        v.literal("admin"),
        v.literal("system")
      ),
      actorName: v.string(),
      details: v.optional(
        v.object({
          previousContent: v.optional(v.string()),
          newContent: v.optional(v.string()),
          reason: v.optional(v.string()),
          ipAddress: v.optional(v.string()),
          userAgent: v.optional(v.string()),
        })
      ),
      timestamp: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // 1. Verify user is authenticated
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new Error("Authentication required to view audit logs");
    }

    // 2. Verify user is org admin/owner
    const hasAdminAccess = await isOrgAdmin(
      ctx,
      authUser._id,
      args.organizationId
    );
    if (!hasAdminAccess) {
      throw new Error(
        "Only organization admins and owners can view audit logs"
      );
    }

    // 3. Query audit logs based on whether messageId is provided
    const limit = args.limit || 200;

    if (args.messageId !== undefined) {
      // Query by specific message
      const messageId = args.messageId; // Type narrowing
      return await ctx.db
        .query("messageAuditLog")
        .withIndex("by_message", (q) => q.eq("messageId", messageId))
        .order("desc")
        .take(limit);
    }

    // Query all org audit entries
    return await ctx.db
      .query("messageAuditLog")
      .withIndex("by_org_and_timestamp", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);
  },
});

// ============================================================
// INTERNAL HELPERS FOR EMAIL ACTIONS
// ============================================================

import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Internal query to fetch message data for email delivery
 * Used by the email action to get all necessary data
 */
export const getMessageForEmail = internalQuery({
  args: {
    messageId: v.id("coachParentMessages"),
    recipientId: v.id("messageRecipients"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // 1. Fetch message
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      return null;
    }

    // 2. Fetch recipient
    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) {
      return null;
    }

    // 3. Fetch guardian identity
    const guardian = await ctx.db.get(recipient.guardianIdentityId);
    if (!guardian) {
      return null;
    }

    // 4. Fetch organization to get name
    const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "id", value: message.organizationId }],
    });

    const organizationName = org?.name || "Your Organization";

    return {
      message,
      recipient,
      guardian,
      organizationName,
    };
  },
});

/**
 * Internal mutation to update recipient email status after delivery attempt
 * Used by the email action to record delivery results
 */
export const updateRecipientEmailStatus = internalMutation({
  args: {
    recipientId: v.id("messageRecipients"),
    status: v.union(v.literal("sent"), v.literal("failed")),
    bounceReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    if (args.status === "sent") {
      // Email sent successfully
      await ctx.db.patch(args.recipientId, {
        deliveryStatus: "sent",
        deliveryMethod: "email",
        emailSentAt: now,
        updatedAt: now,
      });
    } else {
      // Email failed
      await ctx.db.patch(args.recipientId, {
        deliveryStatus: "failed",
        emailBouncedAt: now,
        emailBounceReason: args.bounceReason,
        updatedAt: now,
      });
    }

    return null;
  },
});
