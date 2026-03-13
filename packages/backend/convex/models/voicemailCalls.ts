import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Check if a user has the "coach" functional role in any of their memberships.
 * Used by the voice webhook to distinguish coaches from non-coaches.
 */
export const isUserCoach = internalQuery({
  args: { userId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { components: betterAuthComponents } = require("../_generated/api");
    const membersResult = await ctx.runQuery(
      betterAuthComponents.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: { cursor: null, numItems: 100 },
        where: [{ field: "userId", operator: "eq", value: args.userId }],
      }
    );
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic type from component
    const members = (membersResult.page || []) as any[];
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic type from component
    return members.some((m: any) => {
      const roles = m.functionalRoles as string[] | undefined;
      return roles?.includes("coach");
    });
  },
});

/**
 * Create a voicemail call record when a coach dials in.
 * Stores CallSid → coach mapping so the recording callback can look up context.
 */
export const createCall = internalMutation({
  args: {
    callSid: v.string(),
    from: v.string(),
    coachId: v.string(),
    coachName: v.string(),
    organizationId: v.string(),
    orgName: v.string(),
  },
  returns: v.id("voicemailCalls"),
  handler: async (ctx, args) =>
    await ctx.db.insert("voicemailCalls", {
      callSid: args.callSid,
      from: args.from,
      coachId: args.coachId,
      coachName: args.coachName,
      organizationId: args.organizationId,
      orgName: args.orgName,
      status: "recording",
      createdAt: Date.now(),
    }),
});

/**
 * Look up a voicemail call by Twilio CallSid.
 */
export const getCallByCallSid = internalQuery({
  args: { callSid: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("voicemailCalls"),
      callSid: v.string(),
      from: v.string(),
      coachId: v.string(),
      coachName: v.string(),
      organizationId: v.string(),
      orgName: v.string(),
      status: v.union(
        v.literal("recording"),
        v.literal("processed"),
        v.literal("failed")
      ),
      recordingSid: v.optional(v.string()),
      voiceNoteId: v.optional(v.id("voiceNotes")),
      error: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const call = await ctx.db
      .query("voicemailCalls")
      .withIndex("by_callSid", (q) => q.eq("callSid", args.callSid))
      .first();
    if (!call) {
      return null;
    }
    return {
      _id: call._id,
      callSid: call.callSid,
      from: call.from,
      coachId: call.coachId,
      coachName: call.coachName,
      organizationId: call.organizationId,
      orgName: call.orgName,
      status: call.status,
      recordingSid: call.recordingSid,
      voiceNoteId: call.voiceNoteId,
      error: call.error,
      createdAt: call.createdAt,
    };
  },
});

/**
 * Mark a voicemail call as successfully processed and link the voice note.
 */
export const markProcessed = internalMutation({
  args: {
    callId: v.id("voicemailCalls"),
    recordingSid: v.string(),
    voiceNoteId: v.id("voiceNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.callId, {
      status: "processed",
      recordingSid: args.recordingSid,
      voiceNoteId: args.voiceNoteId,
    });
    return null;
  },
});

/**
 * Mark a voicemail call as failed with an error message.
 */
export const markFailed = internalMutation({
  args: {
    callId: v.id("voicemailCalls"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.callId, {
      status: "failed",
      error: args.error,
    });
    return null;
  },
});
