import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";

/**
 * WhatsApp Messages Model
 *
 * Handles storage and retrieval of incoming WhatsApp messages
 * and coach phone number lookups.
 */

// ============================================================
// VALIDATORS
// ============================================================

const messageTypeValidator = v.union(
  v.literal("text"),
  v.literal("audio"),
  v.literal("image"),
  v.literal("video"),
  v.literal("document")
);

const statusValidator = v.union(
  v.literal("received"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("unmatched")
);

const processingResultsValidator = v.object({
  autoApplied: v.array(
    v.object({
      insightId: v.string(),
      playerName: v.optional(v.string()),
      teamName: v.optional(v.string()),
      category: v.string(),
      title: v.string(),
      parentSummaryQueued: v.boolean(),
    })
  ),
  needsReview: v.array(
    v.object({
      insightId: v.string(),
      playerName: v.optional(v.string()),
      category: v.string(),
      title: v.string(),
      reason: v.string(),
    })
  ),
  unmatched: v.array(
    v.object({
      insightId: v.string(),
      mentionedName: v.optional(v.string()),
      title: v.string(),
    })
  ),
});

// ============================================================
// INTERNAL MUTATIONS
// ============================================================

/**
 * Create a new WhatsApp message record
 */
export const createMessage = internalMutation({
  args: {
    messageSid: v.string(),
    accountSid: v.string(),
    fromNumber: v.string(),
    toNumber: v.string(),
    messageType: messageTypeValidator,
    body: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    mediaContentType: v.optional(v.string()),
  },
  returns: v.id("whatsappMessages"),
  handler: async (ctx, args) =>
    await ctx.db.insert("whatsappMessages", {
      messageSid: args.messageSid,
      accountSid: args.accountSid,
      fromNumber: args.fromNumber,
      toNumber: args.toNumber,
      messageType: args.messageType,
      body: args.body,
      mediaUrl: args.mediaUrl,
      mediaContentType: args.mediaContentType,
      status: "received",
      receivedAt: Date.now(),
    }),
});

/**
 * Update message status
 */
export const updateStatus = internalMutation({
  args: {
    messageId: v.id("whatsappMessages"),
    status: statusValidator,
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: any = { status: args.status };
    if (args.errorMessage) {
      updates.errorMessage = args.errorMessage;
    }
    if (args.status === "completed" || args.status === "failed") {
      updates.processedAt = Date.now();
    }
    await ctx.db.patch(args.messageId, updates);
    return null;
  },
});

/**
 * Update message with coach info after phone lookup
 */
export const updateCoachInfo = internalMutation({
  args: {
    messageId: v.id("whatsappMessages"),
    coachId: v.string(),
    coachName: v.string(),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      coachId: args.coachId,
      coachName: args.coachName,
      organizationId: args.organizationId,
      status: "processing",
    });
    return null;
  },
});

/**
 * Update message with media storage ID after download
 */
export const updateMediaStorage = internalMutation({
  args: {
    messageId: v.id("whatsappMessages"),
    mediaStorageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      mediaStorageId: args.mediaStorageId,
    });
    return null;
  },
});

/**
 * Link a voice note to the WhatsApp message
 */
export const linkVoiceNote = internalMutation({
  args: {
    messageId: v.id("whatsappMessages"),
    voiceNoteId: v.id("voiceNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      voiceNoteId: args.voiceNoteId,
    });
    return null;
  },
});

/**
 * Update message with processing results
 */
export const updateProcessingResults = internalMutation({
  args: {
    messageId: v.id("whatsappMessages"),
    processingResults: processingResultsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      processingResults: args.processingResults,
      status: "completed",
      processedAt: Date.now(),
    });
    return null;
  },
});

// ============================================================
// INTERNAL QUERIES
// ============================================================

/**
 * Find a coach by their phone number.
 * Returns coach info including their primary organization.
 */
export const findCoachByPhone = internalQuery({
  args: {
    phoneNumber: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      coachId: v.string(),
      coachName: v.string(),
      organizationId: v.string(),
      organizationName: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = normalizePhoneNumber(args.phoneNumber);

    console.log("[WhatsApp] Looking up coach by phone:", normalizedPhone);

    // Query users from the Better Auth component (user table is inside the component)
    // Using the adapter.findMany to access the component's user table
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { components: betterAuthComponents } = require("../_generated/api");
    const usersResult = await ctx.runQuery(
      betterAuthComponents.betterAuth.adapter.findMany,
      {
        model: "user",
        paginationOpts: {
          cursor: null,
          numItems: 1000, // Get up to 1000 users
        },
      }
    );
    const users = usersResult.page || [];

    // biome-ignore lint/suspicious/noExplicitAny: Dynamic user type from component
    const matchedUser = (users as any[]).find((user: any) => {
      if (!user.phone) {
        return false;
      }
      const userPhone = normalizePhoneNumber(user.phone);
      return userPhone === normalizedPhone;
    });

    if (!matchedUser) {
      console.log("[WhatsApp] No user found with phone:", normalizedPhone);
      return null;
    }

    console.log("[WhatsApp] Found user:", matchedUser.name, matchedUser._id);

    // Get the user's organization memberships from the component
    const membersResult = await ctx.runQuery(
      betterAuthComponents.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 100,
        },
        where: [
          {
            field: "userId",
            operator: "eq",
            value: matchedUser._id,
          },
        ],
      }
    );
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic type from component
    const members = (membersResult.page || []) as any[];

    console.log("[WhatsApp] User has", members.length, "memberships");

    // Find a membership where user has coach functional role
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic type from component
    let coachMembership = members.find((m: any) => {
      const roles = m.functionalRoles as string[] | undefined;
      return roles?.includes("coach");
    });

    // If no coach role found, use any membership (user might be admin who coaches)
    if (!coachMembership && members.length > 0) {
      // Prefer their current org if set
      if (matchedUser.currentOrgId) {
        coachMembership = members.find(
          // biome-ignore lint/suspicious/noExplicitAny: Dynamic type from component
          (m: any) => m.organizationId === matchedUser.currentOrgId
        );
      }
      // Fall back to first membership
      if (!coachMembership) {
        coachMembership = members[0];
      }
    }

    if (!coachMembership) {
      console.log("[WhatsApp] User has no organization membership");
      return null;
    }

    // Get organization from the component
    const orgsResult = await ctx.runQuery(
      betterAuthComponents.betterAuth.adapter.findMany,
      {
        model: "organization",
        paginationOpts: {
          cursor: null,
          numItems: 1,
        },
        where: [
          {
            field: "_id",
            operator: "eq",
            value: coachMembership.organizationId,
          },
        ],
      }
    );
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic type from component
    const org = (orgsResult.page || [])[0] as any;

    return {
      coachId: matchedUser._id,
      coachName:
        matchedUser.name ||
        `${matchedUser.firstName || ""} ${matchedUser.lastName || ""}`.trim() ||
        "Unknown Coach",
      organizationId: coachMembership.organizationId,
      organizationName: org?.name,
    };
  },
});

/**
 * Normalize a phone number for comparison.
 * Removes all non-digit characters except leading +
 */
function normalizePhoneNumber(phone: string): string {
  // Keep + at the start if present, remove everything else except digits
  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

// ============================================================
// PUBLIC QUERIES (for admin/debugging)
// ============================================================

/**
 * Get recent WhatsApp messages for an organization
 */
export const getRecentMessages = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("whatsappMessages"),
      _creationTime: v.number(),
      fromNumber: v.string(),
      messageType: messageTypeValidator,
      body: v.optional(v.string()),
      coachName: v.optional(v.string()),
      status: statusValidator,
      voiceNoteId: v.optional(v.id("voiceNotes")),
      receivedAt: v.number(),
      processedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const messages = await ctx.db
      .query("whatsappMessages")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);

    return messages.map((m) => ({
      _id: m._id,
      _creationTime: m._creationTime,
      fromNumber: m.fromNumber,
      messageType: m.messageType,
      body: m.body,
      coachName: m.coachName,
      status: m.status,
      voiceNoteId: m.voiceNoteId,
      receivedAt: m.receivedAt,
      processedAt: m.processedAt,
    }));
  },
});

/**
 * Get a specific WhatsApp message by ID
 */
export const getMessage = query({
  args: {
    messageId: v.id("whatsappMessages"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("whatsappMessages"),
      _creationTime: v.number(),
      messageSid: v.string(),
      fromNumber: v.string(),
      toNumber: v.string(),
      messageType: messageTypeValidator,
      body: v.optional(v.string()),
      mediaUrl: v.optional(v.string()),
      mediaContentType: v.optional(v.string()),
      coachId: v.optional(v.string()),
      coachName: v.optional(v.string()),
      organizationId: v.optional(v.string()),
      status: statusValidator,
      errorMessage: v.optional(v.string()),
      voiceNoteId: v.optional(v.id("voiceNotes")),
      processingResults: v.optional(processingResultsValidator),
      receivedAt: v.number(),
      processedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      return null;
    }

    return {
      _id: message._id,
      _creationTime: message._creationTime,
      messageSid: message.messageSid,
      fromNumber: message.fromNumber,
      toNumber: message.toNumber,
      messageType: message.messageType,
      body: message.body,
      mediaUrl: message.mediaUrl,
      mediaContentType: message.mediaContentType,
      coachId: message.coachId,
      coachName: message.coachName,
      organizationId: message.organizationId,
      status: message.status,
      errorMessage: message.errorMessage,
      voiceNoteId: message.voiceNoteId,
      processingResults: message.processingResults,
      receivedAt: message.receivedAt,
      processedAt: message.processedAt,
    };
  },
});
