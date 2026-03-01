import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { requireAuthAndOrg } from "../lib/authHelpers";

// Max PIN verification attempts before lockout
const MAX_PIN_ATTEMPTS = 3;

// Session expiry: 8 hours in milliseconds
const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000;

// ============================================================
// WELLNESS SESSION QUERIES
// ============================================================

/**
 * Get the active wellness session for a phone number today.
 * Only applies to sms_conversational channel — Flows channel is stateless.
 */
export const getActiveWellnessSession = internalQuery({
  args: {
    phoneNumber: v.string(), // E.164 format
  },
  returns: v.union(
    v.object({
      _id: v.id("whatsappWellnessSessions"),
      _creationTime: v.number(),
      playerIdentityId: v.id("playerIdentities"),
      organizationId: v.string(),
      sessionDate: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("abandoned")
      ),
      enabledDimensions: v.array(v.string()),
      currentDimensionIndex: v.number(),
      collectedResponses: v.any(),
      phoneNumber: v.string(),
      channel: v.literal("sms_conversational"),
      sentAt: v.number(),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      expiresAt: v.number(),
      dailyHealthCheckId: v.optional(v.id("dailyPlayerHealthChecks")),
      invalidReplyCount: v.number(),
      // Phase 9: GDPR soft-delete fields
      retentionExpired: v.optional(v.boolean()),
      retentionExpiredAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];
    const now = Date.now();

    // Collect (at most a handful per phone+date) and filter in JS — no .filter() on DB
    const sessions = await ctx.db
      .query("whatsappWellnessSessions")
      .withIndex("by_phone_and_date", (q) =>
        q.eq("phoneNumber", args.phoneNumber).eq("sessionDate", today)
      )
      .collect();

    const session = sessions.find(
      (s) => s.status === "pending" || s.status === "in_progress"
    );

    if (!session) {
      return null;
    }

    // Check if session has expired
    if (session.expiresAt < now) {
      return null;
    }

    return session;
  },
});

/**
 * Check if there's an expired wellness session for a phone number today.
 * Used to send the "session expired" message instead of routing to coach processing.
 */
export const getExpiredWellnessSession = internalQuery({
  args: {
    phoneNumber: v.string(),
  },
  returns: v.union(
    v.object({ _id: v.id("whatsappWellnessSessions") }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];
    const now = Date.now();

    const sessions = await ctx.db
      .query("whatsappWellnessSessions")
      .withIndex("by_phone_and_date", (q) =>
        q.eq("phoneNumber", args.phoneNumber).eq("sessionDate", today)
      )
      .collect();

    const expired = sessions.find(
      (s) =>
        (s.status === "pending" || s.status === "in_progress") &&
        s.expiresAt < now
    );

    return expired ? { _id: expired._id } : null;
  },
});

/**
 * Get wellness settings for a player by their registered WhatsApp number.
 * Used to resolve wa_id → playerIdentityId (GDPR pseudonymization).
 */
export const getSettingsByWhatsappNumber = internalQuery({
  args: {
    whatsappNumber: v.string(), // E.164 format
  },
  returns: v.union(
    v.object({
      _id: v.id("playerWellnessSettings"),
      playerIdentityId: v.id("playerIdentities"),
      organizationId: v.string(),
      enabledDimensions: v.array(v.string()),
      wellnessChannel: v.optional(
        v.union(v.literal("whatsapp_flows"), v.literal("sms_conversational"))
      ),
      whatsappNumber: v.optional(v.string()),
      whatsappOptIn: v.optional(v.boolean()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_whatsapp_number", (q) =>
        q.eq("whatsappNumber", args.whatsappNumber)
      )
      .first();

    if (!settings) {
      return null;
    }

    return {
      _id: settings._id,
      playerIdentityId: settings.playerIdentityId,
      organizationId: settings.organizationId,
      enabledDimensions: settings.enabledDimensions,
      wellnessChannel: settings.wellnessChannel,
      whatsappNumber: settings.whatsappNumber,
      whatsappOptIn: settings.whatsappOptIn,
    };
  },
});

/**
 * Get wellness settings for a player by playerIdentityId.
 * Returns null if no settings record exists.
 */
export const getWellnessSettings = internalQuery({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.union(
    v.object({
      _id: v.id("playerWellnessSettings"),
      playerIdentityId: v.id("playerIdentities"),
      organizationId: v.string(),
      enabledDimensions: v.array(v.string()),
      wellnessChannel: v.optional(
        v.union(v.literal("whatsapp_flows"), v.literal("sms_conversational"))
      ),
      whatsappNumber: v.optional(v.string()),
      whatsappOptIn: v.optional(v.boolean()),
      whatsappOptedInAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!settings) {
      return null;
    }

    return {
      _id: settings._id,
      playerIdentityId: settings.playerIdentityId,
      organizationId: settings.organizationId,
      enabledDimensions: settings.enabledDimensions,
      wellnessChannel: settings.wellnessChannel,
      whatsappNumber: settings.whatsappNumber,
      whatsappOptIn: settings.whatsappOptIn,
      whatsappOptedInAt: settings.whatsappOptedInAt,
    };
  },
});

// ============================================================
// PUBLIC QUERIES (for player settings UI)
// ============================================================

/**
 * Get current player's wellness channel settings.
 */
export const getMyWellnessChannelSettings = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.union(
    v.object({
      wellnessChannel: v.optional(
        v.union(v.literal("whatsapp_flows"), v.literal("sms_conversational"))
      ),
      whatsappNumber: v.optional(v.string()),
      whatsappOptIn: v.optional(v.boolean()),
      whatsappOptedInAt: v.optional(v.number()),
      enabledDimensions: v.array(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!settings) {
      return null;
    }

    return {
      wellnessChannel: settings.wellnessChannel,
      whatsappNumber: settings.whatsappNumber,
      whatsappOptIn: settings.whatsappOptIn,
      whatsappOptedInAt: settings.whatsappOptedInAt,
      enabledDimensions: settings.enabledDimensions,
    };
  },
});

// ============================================================
// WELLNESS SESSION MUTATIONS
// ============================================================

/**
 * Create a new wellness session for the conversational/SMS channel.
 */
export const createWellnessSession = internalMutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    phoneNumber: v.string(),
    enabledDimensions: v.array(v.string()),
  },
  returns: v.id("whatsappWellnessSessions"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    return await ctx.db.insert("whatsappWellnessSessions", {
      playerIdentityId: args.playerIdentityId,
      organizationId: args.organizationId,
      sessionDate: today,
      status: "pending",
      enabledDimensions: args.enabledDimensions,
      currentDimensionIndex: 0,
      collectedResponses: {},
      phoneNumber: args.phoneNumber,
      channel: "sms_conversational",
      sentAt: now,
      expiresAt: now + SESSION_EXPIRY_MS,
      invalidReplyCount: 0,
    });
  },
});

/**
 * Record a wellness answer and advance to next question.
 */
export const recordWellnessAnswer = internalMutation({
  args: {
    sessionId: v.id("whatsappWellnessSessions"),
    dimensionKey: v.string(),
    value: v.number(), // 1-5
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const now = Date.now();
    const newResponses = {
      ...(session.collectedResponses as Record<string, number>),
      [args.dimensionKey]: args.value,
    };

    await ctx.db.patch(args.sessionId, {
      collectedResponses: newResponses,
      currentDimensionIndex: session.currentDimensionIndex + 1,
      status: "in_progress",
      startedAt: session.startedAt ?? now,
    });

    return null;
  },
});

/**
 * Mark a wellness session as completed and link to the health check record.
 */
export const completeWellnessSession = internalMutation({
  args: {
    sessionId: v.id("whatsappWellnessSessions"),
    dailyHealthCheckId: v.id("dailyPlayerHealthChecks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "completed",
      completedAt: Date.now(),
      dailyHealthCheckId: args.dailyHealthCheckId,
    });
    return null;
  },
});

/**
 * Abandon a wellness session (expired, too many invalid replies, or SKIP command).
 */
export const abandonWellnessSession = internalMutation({
  args: {
    sessionId: v.id("whatsappWellnessSessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "abandoned",
    });
    return null;
  },
});

/**
 * Increment invalid reply count for a session.
 */
export const incrementInvalidReply = internalMutation({
  args: {
    sessionId: v.id("whatsappWellnessSessions"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const newCount = session.invalidReplyCount + 1;
    await ctx.db.patch(args.sessionId, { invalidReplyCount: newCount });
    return newCount;
  },
});

// ============================================================
// CHANNEL REGISTRATION MUTATIONS
// ============================================================

/**
 * Register or update a player's WhatsApp/SMS wellness channel.
 * Called after phone verification completes.
 */
export const registerPlayerChannel = internalMutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    phoneNumber: v.string(), // E.164 format
    wellnessChannel: v.union(
      v.literal("whatsapp_flows"),
      v.literal("sms_conversational")
    ),
    whatsappOptIn: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        whatsappNumber: args.phoneNumber,
        wellnessChannel: args.wellnessChannel,
        whatsappOptIn: args.whatsappOptIn,
        whatsappOptedInAt: args.whatsappOptIn
          ? now
          : existing.whatsappOptedInAt,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("playerWellnessSettings", {
        playerIdentityId: args.playerIdentityId,
        organizationId: args.organizationId,
        enabledDimensions: [
          "sleepQuality",
          "energyLevel",
          "mood",
          "physicalFeeling",
          "motivation",
        ],
        whatsappNumber: args.phoneNumber,
        wellnessChannel: args.wellnessChannel,
        whatsappOptIn: args.whatsappOptIn,
        whatsappOptedInAt: args.whatsappOptIn ? now : undefined,
        updatedAt: now,
      });
    }

    return null;
  },
});

/**
 * Update just the opt-in status (e.g. from WELLNESSSTOP command or toggle).
 */
export const updateWellnessOptIn = internalMutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    whatsappOptIn: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      whatsappOptIn: args.whatsappOptIn,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Deregister a player from wellness channel (clears phone number and opt-in).
 * Called from WELLNESSSTOP command.
 */
export const deregisterPlayerChannel = internalMutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      whatsappOptIn: false,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Update a player's preferred wellness channel.
 */
export const updateWellnessChannel = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    wellnessChannel: v.union(
      v.literal("whatsapp_flows"),
      v.literal("sms_conversational")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuthAndOrg(ctx, args.organizationId);

    const existing = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      wellnessChannel: args.wellnessChannel,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ============================================================
// ADMIN QUERIES
// ============================================================

/**
 * Get channel registration counts for an organization.
 * Used in admin wellness scheduling UI.
 */
export const getChannelCounts = query({
  args: {
    organizationId: v.string(),
    targetTeamIds: v.optional(v.array(v.string())),
  },
  returns: v.object({
    whatsappFlows: v.number(),
    smsConversational: v.number(),
    notRegistered: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAuthAndOrg(ctx, args.organizationId);

    // Use by_org index — no .filter()
    const allSettings = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const optedIn = allSettings.filter((s) => s.whatsappOptIn === true);

    let whatsappFlows = 0;
    let smsConversational = 0;

    for (const s of optedIn) {
      if (s.wellnessChannel === "whatsapp_flows") {
        whatsappFlows += 1;
      } else if (s.wellnessChannel === "sms_conversational") {
        smsConversational += 1;
      }
    }

    // Compute notRegistered: active adult enrolled players not opted in to wellness
    const activeEnrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    // Batch-fetch playerIdentities to filter by playerType === "adult"
    const identities = await Promise.all(
      activeEnrollments.map((e) => ctx.db.get(e.playerIdentityId))
    );

    const adultCount = identities.filter(
      (identity) => identity?.playerType === "adult"
    ).length;

    const notRegistered = Math.max(0, adultCount - optedIn.length);

    return {
      whatsappFlows,
      smsConversational,
      notRegistered,
    };
  },
});

// ============================================================
// PHONE VERIFICATION — US-P8-005
// ============================================================

/**
 * Store a verification PIN for a player (replaces any existing unused PIN).
 * Called from the phoneVerification action after generating the PIN.
 */
export const storeVerificationPin = internalMutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    pin: v.string(),
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Remove ALL existing PINs for this player (handles any race-condition duplicates)
    const existing = await ctx.db
      .query("verificationPins")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    for (const pin of existing) {
      await ctx.db.delete(pin._id);
    }

    await ctx.db.insert("verificationPins", {
      playerIdentityId: args.playerIdentityId,
      pin: args.pin,
      expiresAt: args.expiresAt,
      attemptCount: 0,
      channel: "sms",
    });

    return null;
  },
});

/**
 * Claim (verify) a PIN. Returns success or an error reason.
 * Increments attempt count and locks out after MAX_PIN_ATTEMPTS.
 */
export const claimVerificationPin = internalMutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    pin: v.string(),
  },
  returns: v.union(
    v.object({ valid: v.literal(true) }),
    v.object({ valid: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("verificationPins")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!record) {
      return {
        valid: false,
        error: "No pending verification found. Request a new code.",
      };
    }

    if (record.usedAt) {
      return {
        valid: false,
        error: "This code has already been used. Request a new one.",
      };
    }

    if (record.expiresAt < Date.now()) {
      return {
        valid: false,
        error: "Verification code has expired. Request a new one.",
      };
    }

    if (record.attemptCount >= MAX_PIN_ATTEMPTS) {
      return {
        valid: false,
        error: "Too many failed attempts. Request a new code.",
      };
    }

    if (record.pin !== args.pin) {
      await ctx.db.patch(record._id, {
        attemptCount: record.attemptCount + 1,
      });
      const remaining = MAX_PIN_ATTEMPTS - record.attemptCount - 1;
      return {
        valid: false,
        error:
          remaining > 0
            ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
            : "Too many failed attempts. Request a new code.",
      };
    }

    // Mark as used
    await ctx.db.patch(record._id, { usedAt: Date.now() });
    return { valid: true as const };
  },
});

/**
 * Set wellness opt-in status. Public mutation called from player settings UI.
 */
export const setWellnessOptIn = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    whatsappOptIn: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuthAndOrg(ctx, args.organizationId);

    const existing = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      whatsappOptIn: args.whatsappOptIn,
      whatsappOptedInAt: args.whatsappOptIn
        ? Date.now()
        : existing.whatsappOptedInAt,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Clear registered phone number and opt-in. Used when player clicks "Change number".
 */
export const clearWellnessPhone = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuthAndOrg(ctx, args.organizationId);

    const existing = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      whatsappNumber: undefined,
      wellnessChannel: undefined,
      whatsappOptIn: false,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Get all opted-in players for dispatch.
 * Used by the daily dispatch cron job.
 */
export const getOptedInPlayers = internalQuery({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("playerWellnessSettings"),
      playerIdentityId: v.id("playerIdentities"),
      organizationId: v.string(),
      enabledDimensions: v.array(v.string()),
      wellnessChannel: v.optional(
        v.union(v.literal("whatsapp_flows"), v.literal("sms_conversational"))
      ),
      whatsappNumber: v.optional(v.string()),
      lastFlowSentDate: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    return settings
      .filter(
        (s) =>
          s.whatsappOptIn === true &&
          s.wellnessChannel !== undefined &&
          s.whatsappNumber
      )
      .map((s) => ({
        _id: s._id,
        playerIdentityId: s.playerIdentityId,
        organizationId: s.organizationId,
        enabledDimensions: s.enabledDimensions,
        wellnessChannel: s.wellnessChannel,
        whatsappNumber: s.whatsappNumber,
        lastFlowSentDate: s.lastFlowSentDate,
      }));
  },
});

/**
 * Get per-player wellness status for the admin monitoring table.
 * Returns all players with wellness settings for the org, including name,
 * channel, opt-in status, and today's check-in score.
 */
export const getPlayerWellnessStatuses = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      playerIdentityId: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      wellnessChannel: v.optional(
        v.union(v.literal("whatsapp_flows"), v.literal("sms_conversational"))
      ),
      whatsappOptIn: v.optional(v.boolean()),
      lastCheckDate: v.optional(v.string()),
      lastCheckScore: v.optional(v.number()),
      lastCheckSource: v.optional(
        v.union(
          v.literal("app"),
          v.literal("whatsapp_flows"),
          v.literal("whatsapp_conversational"),
          v.literal("sms")
        )
      ),
    })
  ),
  handler: async (ctx, args) => {
    await requireAuthAndOrg(ctx, args.organizationId);

    const allSettings = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    if (allSettings.length === 0) {
      return [];
    }

    // Batch-fetch playerIdentities
    const identities = await Promise.all(
      allSettings.map((s) => ctx.db.get(s.playerIdentityId))
    );

    // Get today's health checks for the org in one query, build a map
    const today = new Date().toISOString().split("T")[0];
    const todayChecks = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_org_and_date", (q) =>
        q.eq("organizationId", args.organizationId).eq("checkDate", today)
      )
      .collect();

    const checkMap = new Map<string, (typeof todayChecks)[0]>();
    for (const check of todayChecks) {
      checkMap.set(check.playerIdentityId, check);
    }

    return allSettings.map((s, i) => {
      const identity = identities[i];
      const check = checkMap.get(s.playerIdentityId);

      // Compute average score from today's check
      let lastCheckScore: number | undefined;
      if (check) {
        const scores = check.enabledDimensions
          .map(
            (d) => (check as Record<string, unknown>)[d] as number | undefined
          )
          .filter((val): val is number => typeof val === "number");
        if (scores.length > 0) {
          lastCheckScore =
            Math.round(
              (scores.reduce((a, b) => a + b, 0) / scores.length) * 10
            ) / 10;
        }
      }

      return {
        playerIdentityId: s.playerIdentityId,
        firstName: identity?.firstName ?? "Unknown",
        lastName: identity?.lastName ?? "",
        wellnessChannel: s.wellnessChannel,
        whatsappOptIn: s.whatsappOptIn,
        lastCheckDate: check?.checkDate,
        lastCheckScore,
        lastCheckSource: check?.source,
      };
    });
  },
});

/**
 * Get the userId linked to a playerIdentity.
 * Used by phoneVerification actions to verify the caller owns the player profile.
 */
export const getPlayerUserId = internalQuery({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.union(v.object({ userId: v.optional(v.string()) }), v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.db.get(args.playerIdentityId);
    if (!identity) {
      return null;
    }
    return { userId: identity.userId };
  },
});

/**
 * Send in-app wellness registration nudge notifications to opted-out adult players.
 * Finds active adult enrollments without wellness opt-in and notifies them
 * (only if they have a linked userId / claimed account).
 */
export const sendWellnessRegistrationNudges = mutation({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({ sent: v.number() }),
  handler: async (ctx, args) => {
    await requireAuthAndOrg(ctx, args.organizationId);

    // Build set of opted-in playerIdentityIds
    const optedInSettings = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const optedInIds = new Set(
      optedInSettings
        .filter((s) => s.whatsappOptIn === true)
        .map((s) => s.playerIdentityId)
    );

    // Get active enrollments for the org
    const activeEnrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    // Batch-fetch playerIdentities
    const identities = await Promise.all(
      activeEnrollments.map((e) => ctx.db.get(e.playerIdentityId))
    );

    // Find adult players who are not opted in and have a claimed account
    const unregistered = identities.filter(
      (identity) =>
        identity !== null &&
        identity.playerType === "adult" &&
        identity.userId &&
        !optedInIds.has(identity._id)
    ) as NonNullable<(typeof identities)[0]>[];

    const now = Date.now();
    let sent = 0;

    for (const identity of unregistered) {
      if (!identity.userId) {
        continue;
      }

      // Check if a recent nudge was already sent (avoid spamming)
      const recentNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_created", (q) =>
          q
            .eq("userId", identity.userId as string)
            .gte("createdAt", now - 7 * 24 * 60 * 60 * 1000)
        )
        .collect();

      const recentNudge = recentNotifications.find(
        (n) =>
          n.organizationId === args.organizationId &&
          n.type === "wellness_reminder"
      );

      // Skip if a nudge was sent in the last 7 days
      if (recentNudge) {
        continue;
      }

      await ctx.db.insert("notifications", {
        userId: identity.userId as string,
        organizationId: args.organizationId,
        type: "wellness_reminder",
        title: "Set up Wellness Check-Ins",
        message:
          "Register your phone number to receive daily wellness check-ins via WhatsApp or SMS.",
        link: `/orgs/${args.organizationId}/player/settings`,
        targetRole: "player",
        createdAt: now,
      });

      sent += 1;
    }

    return { sent };
  },
});

// ============================================================
// DISPATCH EVENT LOGGING — US-P8-009
// ============================================================

/**
 * Log a dispatch event (sent / failed / fallback) for admin monitoring.
 */
export const logDispatchEvent = internalMutation({
  args: {
    organizationId: v.string(),
    logDate: v.string(),
    playerIdentityId: v.id("playerIdentities"),
    channel: v.union(
      v.literal("whatsapp_flows"),
      v.literal("sms_conversational"),
      v.literal("sms")
    ),
    eventType: v.union(
      v.literal("sent"),
      v.literal("failed"),
      v.literal("fallback")
    ),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("wellnessDispatchLog", {
      organizationId: args.organizationId,
      logDate: args.logDate,
      playerIdentityId: args.playerIdentityId,
      channel: args.channel,
      eventType: args.eventType,
      error: args.error,
      timestamp: Date.now(),
    });
    return null;
  },
});

/**
 * Get dispatch errors and fallbacks for admin monitoring.
 * Returns last 7 days of failed and fallback events.
 */
export const getDispatchErrors = query({
  args: {
    organizationId: v.string(),
    days: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("wellnessDispatchLog"),
      logDate: v.string(),
      playerIdentityId: v.id("playerIdentities"),
      channel: v.union(
        v.literal("whatsapp_flows"),
        v.literal("sms_conversational"),
        v.literal("sms")
      ),
      eventType: v.union(
        v.literal("sent"),
        v.literal("failed"),
        v.literal("fallback")
      ),
      error: v.optional(v.string()),
      timestamp: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await requireAuthAndOrg(ctx, args.organizationId);

    const daysBack = args.days ?? 7;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    const cutoffDate = cutoff.toISOString().split("T")[0];

    const logs = await ctx.db
      .query("wellnessDispatchLog")
      .withIndex("by_org_and_date", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return logs
      .filter(
        (l) =>
          l.logDate >= cutoffDate &&
          (l.eventType === "failed" || l.eventType === "fallback")
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100)
      .map((l) => ({
        _id: l._id,
        logDate: l.logDate,
        playerIdentityId: l.playerIdentityId,
        channel: l.channel,
        eventType: l.eventType,
        error: l.error,
        timestamp: l.timestamp,
      }));
  },
});

/**
 * Get 30-day channel breakdown for admin monitoring dashboard.
 * Returns daily counts by source from dailyPlayerHealthChecks.
 */
export const get30DayChannelBreakdown = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      app: v.number(),
      whatsapp_flows: v.number(),
      whatsapp_conversational: v.number(),
      sms: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await requireAuthAndOrg(ctx, args.organizationId);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffDate = cutoff.toISOString().split("T")[0];

    const filtered = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_org_and_date", (q) =>
        q.eq("organizationId", args.organizationId).gte("checkDate", cutoffDate)
      )
      .collect();

    // Build date → counts map
    const byDate = new Map<
      string,
      {
        app: number;
        whatsapp_flows: number;
        whatsapp_conversational: number;
        sms: number;
      }
    >();

    for (const r of filtered) {
      const existing = byDate.get(r.checkDate) ?? {
        app: 0,
        whatsapp_flows: 0,
        whatsapp_conversational: 0,
        sms: 0,
      };
      const src = r.source ?? "app";
      if (src === "whatsapp_flows") {
        existing.whatsapp_flows += 1;
      } else if (src === "whatsapp_conversational") {
        existing.whatsapp_conversational += 1;
      } else if (src === "sms") {
        existing.sms += 1;
      } else {
        existing.app += 1;
      }
      byDate.set(r.checkDate, existing);
    }

    // Build full 30-day range (oldest first)
    const result: Array<{
      date: string;
      app: number;
      whatsapp_flows: number;
      whatsapp_conversational: number;
      sms: number;
    }> = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const counts = byDate.get(dateStr) ?? {
        app: 0,
        whatsapp_flows: 0,
        whatsapp_conversational: 0,
        sms: 0,
      };
      result.push({ date: dateStr, ...counts });
    }

    return result;
  },
});

/**
 * Get today's dispatch summary for admin monitoring.
 * Returns counts of sent/completed per channel and skipped (app check-in).
 */
export const getTodayDispatchSummary = query({
  args: {
    organizationId: v.string(),
    today: v.string(), // YYYY-MM-DD
  },
  returns: v.object({
    flowsSent: v.number(),
    flowsCompleted: v.number(),
    smsSent: v.number(),
    smsCompleted: v.number(),
    skippedAppCheckin: v.number(),
    totalOptedIn: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAuthAndOrg(ctx, args.organizationId);

    // Opted-in settings
    const allSettings = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const optedIn = allSettings.filter(
      (s) => s.whatsappOptIn === true && s.wellnessChannel
    );

    const flowsSent = optedIn.filter(
      (s) =>
        s.wellnessChannel === "whatsapp_flows" &&
        s.lastFlowSentDate === args.today
    ).length;

    // Today's health checks
    const todayFiltered = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_org_and_date", (q) =>
        q.eq("organizationId", args.organizationId).eq("checkDate", args.today)
      )
      .collect();

    const flowsCompleted = todayFiltered.filter(
      (c) => c.source === "whatsapp_flows"
    ).length;

    // SMS sessions today
    const smsSessions = await ctx.db
      .query("whatsappWellnessSessions")
      .withIndex("by_org_and_date", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("sessionDate", args.today)
      )
      .collect();

    const smsSent = smsSessions.length;
    const smsCompleted = todayFiltered.filter(
      (c) => c.source === "whatsapp_conversational" || c.source === "sms"
    ).length;

    const skippedAppCheckin = todayFiltered.filter(
      (c) => !c.source || c.source === "app"
    ).length;

    return {
      flowsSent,
      flowsCompleted,
      smsSent,
      smsCompleted,
      skippedAppCheckin,
      totalOptedIn: optedIn.length,
    };
  },
});

/**
 * Update the lastFlowSentDate for a player's wellness settings.
 * Called after successfully dispatching a WhatsApp Flows message.
 * Used by the cron to prevent double-sending on the same day.
 */
export const updateFlowSentDate = internalMutation({
  args: {
    settingsId: v.id("playerWellnessSettings"),
    sentDate: v.string(), // YYYY-MM-DD
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.settingsId, {
      lastFlowSentDate: args.sentDate,
    });
    return null;
  },
});
