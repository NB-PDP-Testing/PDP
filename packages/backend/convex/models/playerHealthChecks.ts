import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { requireAuth, requireAuthAndOrg } from "../lib/authHelpers";

// Core dimensions that can never be individually disabled
const CORE_DIMENSIONS = [
  "sleepQuality",
  "energyLevel",
  "mood",
  "physicalFeeling",
  "motivation",
] as const;

const DEFAULT_ENABLED_DIMENSIONS = [...CORE_DIMENSIONS];

// Validator for individual wellness score
const dimensionValuesValidator = v.object({
  sleepQuality: v.optional(v.number()),
  energyLevel: v.optional(v.number()),
  mood: v.optional(v.number()),
  physicalFeeling: v.optional(v.number()),
  motivation: v.optional(v.number()),
  foodIntake: v.optional(v.number()),
  waterIntake: v.optional(v.number()),
  muscleRecovery: v.optional(v.number()),
});

const cyclePhaseValidator = v.union(
  v.literal("menstruation"),
  v.literal("early_follicular"),
  v.literal("ovulation"),
  v.literal("early_luteal"),
  v.literal("late_luteal")
);

// Phase 8: submission channel validator
const sourceValidator = v.optional(
  v.union(
    v.literal("app"),
    v.literal("whatsapp_flows"),
    v.literal("whatsapp_conversational"),
    v.literal("sms")
  )
);

// ============================================================
// QUERIES
// ============================================================

export const getTodayHealthCheck = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    checkDate: v.string(), // YYYY-MM-DD
  },
  returns: v.union(
    v.object({
      _id: v.id("dailyPlayerHealthChecks"),
      _creationTime: v.number(),
      playerIdentityId: v.id("playerIdentities"),
      organizationId: v.string(),
      checkDate: v.string(),
      sleepQuality: v.optional(v.number()),
      energyLevel: v.optional(v.number()),
      mood: v.optional(v.number()),
      physicalFeeling: v.optional(v.number()),
      motivation: v.optional(v.number()),
      foodIntake: v.optional(v.number()),
      waterIntake: v.optional(v.number()),
      muscleRecovery: v.optional(v.number()),
      enabledDimensions: v.array(v.string()),
      cyclePhase: v.optional(cyclePhaseValidator),
      notes: v.optional(v.string()),
      submittedAt: v.number(),
      updatedAt: v.number(),
      submittedOffline: v.optional(v.boolean()),
      deviceSubmittedAt: v.optional(v.number()),
      source: sourceValidator,
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_player_and_date", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("checkDate", args.checkDate)
      )
      .first();

    return record ?? null;
  },
});

export const getWellnessHistory = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    days: v.optional(v.number()), // default 30
  },
  returns: v.array(
    v.object({
      _id: v.id("dailyPlayerHealthChecks"),
      _creationTime: v.number(),
      playerIdentityId: v.id("playerIdentities"),
      organizationId: v.string(),
      checkDate: v.string(),
      sleepQuality: v.optional(v.number()),
      energyLevel: v.optional(v.number()),
      mood: v.optional(v.number()),
      physicalFeeling: v.optional(v.number()),
      motivation: v.optional(v.number()),
      foodIntake: v.optional(v.number()),
      waterIntake: v.optional(v.number()),
      muscleRecovery: v.optional(v.number()),
      enabledDimensions: v.array(v.string()),
      cyclePhase: v.optional(cyclePhaseValidator),
      notes: v.optional(v.string()),
      submittedAt: v.number(),
      updatedAt: v.number(),
      submittedOffline: v.optional(v.boolean()),
      deviceSubmittedAt: v.optional(v.number()),
      source: sourceValidator,
      retentionExpiresAt: v.optional(v.number()),
      retentionExpired: v.optional(v.boolean()),
      retentionExpiredAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const daysBack = args.days ?? 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const records = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    // Filter to last N days, exclude soft-deleted records, sorted newest first
    return records
      .filter((r) => r.checkDate >= cutoffStr && !r.retentionExpired)
      .sort((a, b) => b.checkDate.localeCompare(a.checkDate));
  },
});

export const getWellnessSettings = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.object({
    enabledDimensions: v.array(v.string()),
    hasRecord: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!settings) {
      return {
        enabledDimensions: [...DEFAULT_ENABLED_DIMENSIONS],
        hasRecord: false,
      };
    }

    return {
      enabledDimensions: settings.enabledDimensions,
      hasRecord: true,
    };
  },
});

export const getWellnessCoachAccessList = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.array(
    v.object({
      _id: v.id("wellnessCoachAccess"),
      _creationTime: v.number(),
      playerIdentityId: v.id("playerIdentities"),
      organizationId: v.string(),
      coachUserId: v.string(),
      coachName: v.string(),
      requestedAt: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("denied"),
        v.literal("revoked")
      ),
      approvedAt: v.optional(v.number()),
      revokedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) =>
    await ctx.db
      .query("wellnessCoachAccess")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect(),
});

export const getWellnessForCoach = query({
  args: {
    coachUserId: v.string(),
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      playerIdentityId: v.id("playerIdentities"),
      playerName: v.string(),
      todayScore: v.union(v.number(), v.null()),
      trend7Days: v.array(
        v.object({
          date: v.string(),
          score: v.number(),
        })
      ),
      accessId: v.id("wellnessCoachAccess"),
    })
  ),
  handler: async (ctx, args) => {
    // Get all approved access records for this coach in this org
    const approvedAccess = await ctx.db
      .query("wellnessCoachAccess")
      .withIndex("by_org_and_coach", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("coachUserId", args.coachUserId)
      )
      .collect();

    const approved = approvedAccess.filter((a) => a.status === "approved");

    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().split("T")[0];

    // Batch-fetch all player identities to avoid N+1
    const playerDocs = await Promise.all(
      approved.map((a) => ctx.db.get(a.playerIdentityId))
    );
    const playerMap = new Map(
      playerDocs
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p) => [String(p._id), p])
    );

    const result: {
      playerIdentityId: (typeof approved)[0]["playerIdentityId"];
      playerName: string;
      todayScore: number | null;
      trend7Days: { date: string; score: number }[];
      accessId: (typeof approved)[0]["_id"];
    }[] = [];

    for (const access of approved) {
      const player = playerMap.get(String(access.playerIdentityId));
      if (!player) {
        continue;
      }

      // Fetch last 7 days of check-ins
      const checks = await ctx.db
        .query("dailyPlayerHealthChecks")
        .withIndex("by_player", (q) =>
          q.eq("playerIdentityId", access.playerIdentityId)
        )
        .collect();

      const recent = checks.filter((c) => c.checkDate >= cutoff);

      // Compute aggregate score per day (average of all dimension values present)
      const computeAggregate = (check: (typeof checks)[0]): number => {
        const values: number[] = [];
        for (const dim of check.enabledDimensions) {
          const val = check[dim as keyof typeof check];
          if (typeof val === "number") {
            values.push(val);
          }
        }
        if (values.length === 0) {
          return 0;
        }
        const sum = values.reduce((a, b) => a + b, 0);
        return Math.round((sum / values.length) * 10) / 10;
      };

      const trend7Days = recent
        .map((c) => ({
          date: c.checkDate,
          score: computeAggregate(c),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const todayCheck = recent.find((c) => c.checkDate === today);
      const todayScore = todayCheck ? computeAggregate(todayCheck) : null;

      result.push({
        playerIdentityId: access.playerIdentityId,
        playerName: `${player.firstName} ${player.lastName}`,
        todayScore,
        trend7Days,
        accessId: access._id,
      });
    }

    return result;
  },
});

export const getCycleTrackingConsent = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.union(
    v.object({
      _id: v.id("playerHealthConsents"),
      _creationTime: v.number(),
      playerIdentityId: v.id("playerIdentities"),
      organizationId: v.string(),
      consentType: v.string(),
      givenAt: v.number(),
      withdrawnAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const consent = await ctx.db
      .query("playerHealthConsents")
      .withIndex("by_player_and_type", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("consentType", "cycle_tracking")
      )
      .first();

    return consent ?? null;
  },
});

// ============================================================
// MUTATIONS
// ============================================================

export const submitDailyHealthCheck = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    checkDate: v.string(),
    dimensionValues: dimensionValuesValidator,
    enabledDimensions: v.array(v.string()),
    cyclePhase: v.optional(cyclePhaseValidator),
    notes: v.optional(v.string()),
    submittedOffline: v.optional(v.boolean()),
    deviceSubmittedAt: v.optional(v.number()),
    source: sourceValidator,
  },
  returns: v.id("dailyPlayerHealthChecks"),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    // Check for existing record — caller must use updateDailyHealthCheck
    const existing = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_player_and_date", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("checkDate", args.checkDate)
      )
      .first();

    if (existing) {
      throw new Error(
        `A health check for ${args.checkDate} already exists. Use updateDailyHealthCheck to modify it.`
      );
    }

    const now = Date.now();

    // Stamp retention expiry from org config (GDPR Article 5 storage limitation)
    const retentionConfig = await ctx.db
      .query("orgRetentionConfig")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    const wellnessDays = retentionConfig?.wellnessDays ?? 730;
    const retentionExpiresAt = now + wellnessDays * 24 * 60 * 60 * 1000;

    const newCheckId = await ctx.db.insert("dailyPlayerHealthChecks", {
      playerIdentityId: args.playerIdentityId,
      organizationId: args.organizationId,
      checkDate: args.checkDate,
      sleepQuality: args.dimensionValues.sleepQuality,
      energyLevel: args.dimensionValues.energyLevel,
      mood: args.dimensionValues.mood,
      physicalFeeling: args.dimensionValues.physicalFeeling,
      motivation: args.dimensionValues.motivation,
      foodIntake: args.dimensionValues.foodIntake,
      waterIntake: args.dimensionValues.waterIntake,
      muscleRecovery: args.dimensionValues.muscleRecovery,
      enabledDimensions: args.enabledDimensions,
      cyclePhase: args.cyclePhase,
      notes: args.notes,
      submittedAt: now,
      updatedAt: now,
      submittedOffline: args.submittedOffline,
      deviceSubmittedAt: args.deviceSubmittedAt,
      source: args.source,
      retentionExpiresAt,
    });

    // Schedule AI insight generation (US-P4-010) — fire-and-forget
    await ctx.scheduler.runAfter(
      0,
      internal.actions.wellnessInsights.generateWellnessInsight,
      {
        playerIdentityId: args.playerIdentityId,
        organizationId: args.organizationId,
        triggerCheckId: newCheckId,
      }
    );

    return newCheckId;
  },
});

// Internal version for webhook use (no auth — called from Meta/Twilio webhooks)
export const submitDailyHealthCheckInternal = internalMutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    checkDate: v.string(),
    dimensionValues: dimensionValuesValidator,
    enabledDimensions: v.array(v.string()),
    source: sourceValidator,
    submittedAt: v.optional(v.number()),
  },
  returns: v.id("dailyPlayerHealthChecks"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_player_and_date", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("checkDate", args.checkDate)
      )
      .first();

    if (existing) {
      throw new Error(
        `A health check for ${args.checkDate} already exists (idempotency check).`
      );
    }

    const now = Date.now();

    // Stamp retention expiry from org config (GDPR Article 5 storage limitation)
    const retentionConfig = await ctx.db
      .query("orgRetentionConfig")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    const wellnessDays = retentionConfig?.wellnessDays ?? 730;
    const retentionExpiresAt = now + wellnessDays * 24 * 60 * 60 * 1000;

    const newCheckId = await ctx.db.insert("dailyPlayerHealthChecks", {
      playerIdentityId: args.playerIdentityId,
      organizationId: args.organizationId,
      checkDate: args.checkDate,
      sleepQuality: args.dimensionValues.sleepQuality,
      energyLevel: args.dimensionValues.energyLevel,
      mood: args.dimensionValues.mood,
      physicalFeeling: args.dimensionValues.physicalFeeling,
      motivation: args.dimensionValues.motivation,
      foodIntake: args.dimensionValues.foodIntake,
      waterIntake: args.dimensionValues.waterIntake,
      muscleRecovery: args.dimensionValues.muscleRecovery,
      enabledDimensions: args.enabledDimensions,
      submittedAt: args.submittedAt ?? now,
      updatedAt: now,
      source: args.source,
      retentionExpiresAt,
    });

    // Schedule AI insight generation — fire-and-forget
    await ctx.scheduler.runAfter(
      0,
      internal.actions.wellnessInsights.generateWellnessInsight,
      {
        playerIdentityId: args.playerIdentityId,
        organizationId: args.organizationId,
        triggerCheckId: newCheckId,
      }
    );

    return newCheckId;
  },
});

// Internal query for getTodayHealthCheck (used by internal actions/webhooks)
export const getTodayHealthCheckInternal = internalQuery({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    checkDate: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("dailyPlayerHealthChecks"),
      _creationTime: v.number(),
      playerIdentityId: v.id("playerIdentities"),
      organizationId: v.string(),
      checkDate: v.string(),
      sleepQuality: v.optional(v.number()),
      energyLevel: v.optional(v.number()),
      mood: v.optional(v.number()),
      physicalFeeling: v.optional(v.number()),
      motivation: v.optional(v.number()),
      foodIntake: v.optional(v.number()),
      waterIntake: v.optional(v.number()),
      muscleRecovery: v.optional(v.number()),
      enabledDimensions: v.array(v.string()),
      submittedAt: v.number(),
      updatedAt: v.number(),
      source: sourceValidator,
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_player_and_date", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("checkDate", args.checkDate)
      )
      .first();

    if (!record) {
      return null;
    }

    return {
      _id: record._id,
      _creationTime: record._creationTime,
      playerIdentityId: record.playerIdentityId,
      organizationId: record.organizationId,
      checkDate: record.checkDate,
      sleepQuality: record.sleepQuality,
      energyLevel: record.energyLevel,
      mood: record.mood,
      physicalFeeling: record.physicalFeeling,
      motivation: record.motivation,
      foodIntake: record.foodIntake,
      waterIntake: record.waterIntake,
      muscleRecovery: record.muscleRecovery,
      enabledDimensions: record.enabledDimensions,
      submittedAt: record.submittedAt,
      updatedAt: record.updatedAt,
      source: record.source,
    };
  },
});

export const updateDailyHealthCheck = mutation({
  args: {
    checkId: v.id("dailyPlayerHealthChecks"),
    dimensionValues: dimensionValuesValidator,
    cyclePhase: v.optional(cyclePhaseValidator),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.patch(args.checkId, {
      sleepQuality: args.dimensionValues.sleepQuality,
      energyLevel: args.dimensionValues.energyLevel,
      mood: args.dimensionValues.mood,
      physicalFeeling: args.dimensionValues.physicalFeeling,
      motivation: args.dimensionValues.motivation,
      foodIntake: args.dimensionValues.foodIntake,
      waterIntake: args.dimensionValues.waterIntake,
      muscleRecovery: args.dimensionValues.muscleRecovery,
      cyclePhase: args.cyclePhase,
      notes: args.notes,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const updateWellnessSettings = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    enabledDimensions: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    // Enforce that all 5 core dimensions are present
    for (const coreDim of CORE_DIMENSIONS) {
      if (!args.enabledDimensions.includes(coreDim)) {
        throw new Error(
          `Core dimension "${coreDim}" cannot be removed from enabledDimensions. Core dimensions are always active.`
        );
      }
    }

    const existing = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabledDimensions: args.enabledDimensions,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("playerWellnessSettings", {
        playerIdentityId: args.playerIdentityId,
        organizationId: args.organizationId,
        enabledDimensions: args.enabledDimensions,
        updatedAt: now,
      });
    }

    return null;
  },
});

export const requestWellnessAccess = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    coachUserId: v.string(),
    organizationId: v.string(),
    coachName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    // Check for existing pending request — no-op if one exists
    const existing = await ctx.db
      .query("wellnessCoachAccess")
      .withIndex("by_coach_and_player", (q) =>
        q
          .eq("coachUserId", args.coachUserId)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (existing && existing.status === "pending") {
      return null; // no-op
    }

    // Insert new access request
    await ctx.db.insert("wellnessCoachAccess", {
      playerIdentityId: args.playerIdentityId,
      organizationId: args.organizationId,
      coachUserId: args.coachUserId,
      coachName: args.coachName,
      requestedAt: Date.now(),
      status: "pending",
    });

    // Send in-app notification to player
    const player = await ctx.db.get(args.playerIdentityId);
    if (player?.userId) {
      await ctx.runMutation(internal.models.notifications.createNotification, {
        userId: player.userId,
        organizationId: args.organizationId,
        type: "wellness_access_request",
        title: "Wellness Access Request",
        message: `${args.coachName} has requested access to your wellness trends`,
        link: `/orgs/${args.organizationId}/player/settings`,
        targetRole: "player",
      });
    }

    return null;
  },
});

export const respondWellnessAccess = mutation({
  args: {
    accessId: v.id("wellnessCoachAccess"),
    decision: v.union(v.literal("approved"), v.literal("denied")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (args.decision === "approved") {
      await ctx.db.patch(args.accessId, {
        status: "approved",
        approvedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(args.accessId, {
        status: "denied",
      });
    }

    return null;
  },
});

export const revokeWellnessAccess = mutation({
  args: {
    accessId: v.id("wellnessCoachAccess"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.patch(args.accessId, {
      status: "revoked",
      revokedAt: Date.now(),
    });

    return null;
  },
});

export const giveCycleTrackingConsent = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const existing = await ctx.db
      .query("playerHealthConsents")
      .withIndex("by_player_and_type", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("consentType", "cycle_tracking")
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        givenAt: now,
        withdrawnAt: undefined,
      });
    } else {
      await ctx.db.insert("playerHealthConsents", {
        playerIdentityId: args.playerIdentityId,
        organizationId: args.organizationId,
        consentType: "cycle_tracking",
        givenAt: now,
      });
    }

    return null;
  },
});

export const withdrawCycleTrackingConsent = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    // Set withdrawnAt on consent record
    const consent = await ctx.db
      .query("playerHealthConsents")
      .withIndex("by_player_and_type", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("consentType", "cycle_tracking")
      )
      .first();

    if (consent) {
      await ctx.db.patch(consent._id, {
        withdrawnAt: Date.now(),
      });
    }

    // Null out cyclePhase on all past check-ins for this player
    const allChecks = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    for (const check of allChecks) {
      if (check.cyclePhase !== undefined) {
        await ctx.db.patch(check._id, {
          cyclePhase: undefined,
        });
      }
    }

    return null;
  },
});

// All access records for a coach in an org — used by coach wellness dashboard
export const getCoachAccessRequests = query({
  args: {
    coachUserId: v.string(),
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("wellnessCoachAccess"),
      _creationTime: v.number(),
      playerIdentityId: v.id("playerIdentities"),
      organizationId: v.string(),
      coachUserId: v.string(),
      coachName: v.string(),
      requestedAt: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("denied"),
        v.literal("revoked")
      ),
      approvedAt: v.optional(v.number()),
      revokedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) =>
    await ctx.db
      .query("wellnessCoachAccess")
      .withIndex("by_org_and_coach", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("coachUserId", args.coachUserId)
      )
      .collect(),
});

/**
 * Parent wellness view for a child player.
 *
 * Returns individual dimension values (parents are not coaches — full visibility).
 * Gated by parentChildAuthorizations.includeWellnessAccess (Phase 7).
 *
 * TODO: Phase 7 — when parentChildAuthorizations table is built, replace the
 * safe-default-deny below with a real check:
 *   const auth = await ctx.db
 *     .query("parentChildAuthorizations")
 *     .withIndex("by_player", q => q.eq("playerIdentityId", args.playerIdentityId))
 *     .first();
 *   if (!auth?.includeWellnessAccess) return { accessGranted: false, history: [] };
 */
export const getChildWellnessForParent = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    days: v.optional(v.number()),
  },
  returns: v.object({
    // TODO: Phase 7 — will be true when parentChildAuthorizations.includeWellnessAccess is true
    accessGranted: v.boolean(),
    history: v.array(
      v.object({
        checkDate: v.string(),
        aggregateScore: v.number(),
        sleepQuality: v.optional(v.number()),
        energyLevel: v.optional(v.number()),
        mood: v.optional(v.number()),
        physicalFeeling: v.optional(v.number()),
        motivation: v.optional(v.number()),
        foodIntake: v.optional(v.number()),
        waterIntake: v.optional(v.number()),
        muscleRecovery: v.optional(v.number()),
      })
    ),
  }),
  handler: (_ctx, _args) => {
    // TODO: Phase 7 — safe default: deny access until parentChildAuthorizations is implemented.
    // Do NOT create a parallel access system. Wait for Phase 7 schema.
    const history: Array<{
      checkDate: string;
      aggregateScore: number;
      sleepQuality?: number;
      energyLevel?: number;
      mood?: number;
      physicalFeeling?: number;
      motivation?: number;
      foodIntake?: number;
      waterIntake?: number;
      muscleRecovery?: number;
    }> = [];
    return { accessGranted: false as boolean, history };
  },
});

// ─── Admin: Org Config (US-P4-009) ──────────────────────────────────────────

/** Get org-level wellness reminder + alert configuration */
export const getWellnessOrgConfig = query({
  args: { organizationId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("wellnessOrgConfig"),
      organizationId: v.string(),
      remindersEnabled: v.boolean(),
      reminderFrequency: v.union(
        v.literal("daily"),
        v.literal("match_day_only"),
        v.literal("training_day_only")
      ),
      reminderType: v.union(
        v.literal("in_app"),
        v.literal("email"),
        v.literal("both")
      ),
      lowScoreAlertsEnabled: v.boolean(),
      lowScoreThreshold: v.number(),
      updatedAt: v.number(),
      updatedBy: v.string(),
      // WhatsApp/SMS dispatch fields (US-P8-006)
      whatsappEnabled: v.optional(v.boolean()),
      dispatchTime: v.optional(v.string()),
      dispatchTimezone: v.optional(v.string()),
      dispatchActiveDays: v.optional(v.array(v.string())),
      dispatchTargetTeamIds: v.optional(v.array(v.string())),
    }),
    v.null()
  ),
  handler: async (ctx, args) =>
    ctx.db
      .query("wellnessOrgConfig")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first(),
});

/** Upsert org-level wellness reminder + alert configuration */
export const updateWellnessOrgConfig = mutation({
  args: {
    organizationId: v.string(),
    updatedBy: v.string(),
    remindersEnabled: v.boolean(),
    reminderFrequency: v.union(
      v.literal("daily"),
      v.literal("match_day_only"),
      v.literal("training_day_only")
    ),
    reminderType: v.union(
      v.literal("in_app"),
      v.literal("email"),
      v.literal("both")
    ),
    lowScoreAlertsEnabled: v.boolean(),
    lowScoreThreshold: v.number(),
    // WhatsApp/SMS dispatch fields (US-P8-006) — optional for backwards compatibility
    whatsappEnabled: v.optional(v.boolean()),
    dispatchTime: v.optional(v.string()),
    dispatchTimezone: v.optional(v.string()),
    dispatchActiveDays: v.optional(v.array(v.string())),
    dispatchTargetTeamIds: v.optional(v.array(v.string())),
  },
  returns: v.id("wellnessOrgConfig"),
  handler: async (ctx, args) => {
    await requireAuthAndOrg(ctx, args.organizationId);
    const existing = await ctx.db
      .query("wellnessOrgConfig")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();
    const now = Date.now();
    const payload = {
      organizationId: args.organizationId,
      remindersEnabled: args.remindersEnabled,
      reminderFrequency: args.reminderFrequency,
      reminderType: args.reminderType,
      lowScoreAlertsEnabled: args.lowScoreAlertsEnabled,
      lowScoreThreshold: args.lowScoreThreshold,
      whatsappEnabled: args.whatsappEnabled,
      dispatchTime: args.dispatchTime,
      dispatchTimezone: args.dispatchTimezone,
      dispatchActiveDays: args.dispatchActiveDays,
      dispatchTargetTeamIds: args.dispatchTargetTeamIds,
      updatedAt: now,
      updatedBy: args.updatedBy,
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return ctx.db.insert("wellnessOrgConfig", payload);
  },
});

/**
 * Get WhatsApp dispatch status — whether the Meta integration is configured.
 * Returns true if META_FLOWS_WELLNESS_ID env var is set, plus channel counts.
 */
export const getWhatsappDispatchStatus = query({
  args: { organizationId: v.string() },
  returns: v.object({
    metaFlowsConfigured: v.boolean(),
    twilioConfigured: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAuthAndOrg(ctx, args.organizationId);
    const metaFlowsId = process.env.META_FLOWS_WELLNESS_ID;
    const twilioFrom =
      process.env.TWILIO_SMS_FROM ?? process.env.TWILIO_WHATSAPP_NUMBER;
    return {
      metaFlowsConfigured: Boolean(metaFlowsId),
      twilioConfigured: Boolean(twilioFrom),
    };
  },
});

// ─── Admin: Analytics (US-P4-009) ───────────────────────────────────────────

/**
 * Org-level daily wellness averages — for the analytics chart.
 * Returns one row per date that had at least one submission.
 */
export const getOrgWellnessAnalytics = query({
  args: {
    organizationId: v.string(),
    days: v.number(),
  },
  returns: v.array(
    v.object({
      checkDate: v.string(),
      avgScore: v.number(),
      submissionCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - args.days);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const records = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_org_and_date", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const byDate = new Map<string, { total: number; count: number }>();
    for (const r of records) {
      if (r.checkDate < cutoffStr) {
        continue;
      }
      const dims: number[] = [];
      if (r.sleepQuality !== undefined) {
        dims.push(r.sleepQuality);
      }
      if (r.energyLevel !== undefined) {
        dims.push(r.energyLevel);
      }
      if (r.mood !== undefined) {
        dims.push(r.mood);
      }
      if (r.physicalFeeling !== undefined) {
        dims.push(r.physicalFeeling);
      }
      if (r.motivation !== undefined) {
        dims.push(r.motivation);
      }
      if (r.foodIntake !== undefined) {
        dims.push(r.foodIntake);
      }
      if (r.waterIntake !== undefined) {
        dims.push(r.waterIntake);
      }
      if (r.muscleRecovery !== undefined) {
        dims.push(r.muscleRecovery);
      }
      if (dims.length === 0) {
        continue;
      }
      const score = dims.reduce((a, b) => a + b, 0) / dims.length;
      const existing = byDate.get(r.checkDate);
      if (existing) {
        existing.total += score;
        existing.count += 1;
      } else {
        byDate.set(r.checkDate, { total: score, count: 1 });
      }
    }

    return Array.from(byDate.entries())
      .map(([checkDate, { total, count }]) => ({
        checkDate,
        avgScore: Math.round((total / count) * 10) / 10,
        submissionCount: count,
      }))
      .sort((a, b) => a.checkDate.localeCompare(b.checkDate));
  },
});

/**
 * Individual player wellness history with full dimension values — admin only.
 */
export const getPlayerWellnessForAdmin = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    days: v.number(),
  },
  returns: v.array(
    v.object({
      checkDate: v.string(),
      aggregateScore: v.number(),
      sleepQuality: v.optional(v.number()),
      energyLevel: v.optional(v.number()),
      mood: v.optional(v.number()),
      physicalFeeling: v.optional(v.number()),
      motivation: v.optional(v.number()),
      foodIntake: v.optional(v.number()),
      waterIntake: v.optional(v.number()),
      muscleRecovery: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - args.days);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const records = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    return records
      .filter((r) => r.checkDate >= cutoffStr)
      .map((r) => {
        const dims: number[] = [];
        if (r.sleepQuality !== undefined) {
          dims.push(r.sleepQuality);
        }
        if (r.energyLevel !== undefined) {
          dims.push(r.energyLevel);
        }
        if (r.mood !== undefined) {
          dims.push(r.mood);
        }
        if (r.physicalFeeling !== undefined) {
          dims.push(r.physicalFeeling);
        }
        if (r.motivation !== undefined) {
          dims.push(r.motivation);
        }
        if (r.foodIntake !== undefined) {
          dims.push(r.foodIntake);
        }
        if (r.waterIntake !== undefined) {
          dims.push(r.waterIntake);
        }
        if (r.muscleRecovery !== undefined) {
          dims.push(r.muscleRecovery);
        }
        const aggregateScore =
          dims.length > 0
            ? Math.round((dims.reduce((a, b) => a + b, 0) / dims.length) * 10) /
              10
            : 0;
        return {
          checkDate: r.checkDate,
          aggregateScore,
          sleepQuality: r.sleepQuality,
          energyLevel: r.energyLevel,
          mood: r.mood,
          physicalFeeling: r.physicalFeeling,
          motivation: r.motivation,
          foodIntake: r.foodIntake,
          waterIntake: r.waterIntake,
          muscleRecovery: r.muscleRecovery,
        };
      })
      .sort((a, b) => b.checkDate.localeCompare(a.checkDate));
  },
});

/**
 * Players with 3+ consecutive low wellness check-ins (score <= threshold).
 * For the admin correlation panel.
 */
export const getConsecutiveLowWellnessPlayers = query({
  args: {
    organizationId: v.string(),
    threshold: v.number(),
    consecutiveCount: v.number(),
  },
  returns: v.array(
    v.object({
      playerIdentityId: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      consecutiveLowDays: v.number(),
      lastCheckDate: v.string(),
      lastScore: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const records = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_org_and_date", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const byPlayer = new Map<
      string,
      Array<{ checkDate: string; score: number }>
    >();
    for (const r of records) {
      if (r.checkDate < cutoffStr) {
        continue;
      }
      const dims: number[] = [];
      if (r.sleepQuality !== undefined) {
        dims.push(r.sleepQuality);
      }
      if (r.energyLevel !== undefined) {
        dims.push(r.energyLevel);
      }
      if (r.mood !== undefined) {
        dims.push(r.mood);
      }
      if (r.physicalFeeling !== undefined) {
        dims.push(r.physicalFeeling);
      }
      if (r.motivation !== undefined) {
        dims.push(r.motivation);
      }
      const score =
        dims.length > 0 ? dims.reduce((a, b) => a + b, 0) / dims.length : 0;
      const pid = r.playerIdentityId as string;
      if (!byPlayer.has(pid)) {
        byPlayer.set(pid, []);
      }
      byPlayer.get(pid)?.push({ checkDate: r.checkDate, score });
    }

    const lowPlayers: Array<{
      pid: string;
      consecutiveLowDays: number;
      lastCheckDate: string;
      lastScore: number;
    }> = [];

    for (const [pid, entries] of byPlayer.entries()) {
      const sorted = entries.sort((a, b) =>
        b.checkDate.localeCompare(a.checkDate)
      );
      let consecutive = 0;
      for (const entry of sorted) {
        if (entry.score <= args.threshold) {
          consecutive += 1;
        } else {
          break;
        }
      }
      if (consecutive >= args.consecutiveCount) {
        lowPlayers.push({
          pid,
          consecutiveLowDays: consecutive,
          lastCheckDate: sorted[0]?.checkDate ?? "",
          lastScore: sorted[0]?.score ?? 0,
        });
      }
    }

    // Batch-fetch all player identities to avoid N+1
    const playerDocs = await Promise.all(
      lowPlayers.map((r) =>
        ctx.db.get(r.pid as unknown as Id<"playerIdentities">)
      )
    );
    const playerMap = new Map(
      playerDocs
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p) => [String(p._id), p])
    );

    return lowPlayers
      .map((r) => {
        const player = playerMap.get(r.pid);
        if (!player) {
          return null;
        }
        return {
          playerIdentityId: r.pid as unknown as Id<"playerIdentities">,
          firstName: player.firstName,
          lastName: player.lastName,
          consecutiveLowDays: r.consecutiveLowDays,
          lastCheckDate: r.lastCheckDate,
          lastScore: Math.round(r.lastScore * 10) / 10,
        };
      })
      .filter(
        (
          r
        ): r is {
          playerIdentityId: Id<"playerIdentities">;
          firstName: string;
          lastName: string;
          consecutiveLowDays: number;
          lastCheckDate: string;
          lastScore: number;
        } => r !== null
      );
  },
});

// ─── Cycle Phase Injury Heatmap (US-P4-009, medical staff only) ─────────────

/**
 * Aggregate injury occurrences by menstrual cycle phase for female players.
 * Used by the admin analytics cycle heatmap (medical_staff/admin only).
 * Cross-references dailyPlayerHealthChecks.cyclePhase with playerInjuries.dateOccurred.
 */
export const getCyclePhaseInjuryHeatmap = query({
  args: { organizationId: v.string(), days: v.number() },
  returns: v.array(
    v.object({
      phase: v.string(),
      injuryCount: v.number(),
      checkInCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - args.days);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    // All health checks in the org within range that have a cycle phase recorded
    const checksWithPhase = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_org_and_date", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect()
      .then((recs) =>
        recs.filter((r) => r.checkDate >= cutoffStr && r.cyclePhase != null)
      );

    // All injuries for org players in the same date window
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const enrolledIds = new Set(
      enrollments.map((e) => String(e.playerIdentityId))
    );

    // Build a set of (playerId, date) pairs that had an injury start on that date
    const injuryDates = new Set<string>();
    for (const enrollment of enrollments) {
      const injuries = await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", enrollment.playerIdentityId)
        )
        .collect();
      for (const inj of injuries) {
        if (inj.dateOccurred >= cutoffStr) {
          injuryDates.add(
            `${String(enrollment.playerIdentityId)}::${inj.dateOccurred}`
          );
        }
      }
    }

    // Aggregate by cycle phase
    const phaseCounts = new Map<
      string,
      { injuryCount: number; checkInCount: number }
    >();

    for (const check of checksWithPhase) {
      if (!enrolledIds.has(String(check.playerIdentityId))) {
        continue;
      }
      const phase = check.cyclePhase as string;
      const entry = phaseCounts.get(phase) ?? {
        injuryCount: 0,
        checkInCount: 0,
      };
      entry.checkInCount += 1;
      if (
        injuryDates.has(`${String(check.playerIdentityId)}::${check.checkDate}`)
      ) {
        entry.injuryCount += 1;
      }
      phaseCounts.set(phase, entry);
    }

    return Array.from(phaseCounts.entries()).map(([phase, counts]) => ({
      phase,
      ...counts,
    }));
  },
});

// ─── Internal: Wellness Reminders Cron (US-P4-009) ──────────────────────────

/**
 * Send wellness reminders to players who haven't submitted today.
 * Called daily by cron. Checks remindersEnabled before sending.
 */
export const sendWellnessReminders = internalMutation({
  args: {},
  returns: v.object({ sent: v.number(), skipped: v.number() }),
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    let sent = 0;
    let skipped = 0;

    // Full-table scan is intentional here — cron processes ALL orgs
    const configs = await ctx.db.query("wellnessOrgConfig").collect();

    for (const config of configs) {
      if (!config.remindersEnabled) {
        skipped += 1;
        continue;
      }

      // Only "daily" frequency is supported without match/training schedule data.
      // match_day_only and training_day_only require Phase 5+ schedule data.
      if (config.reminderFrequency !== "daily") {
        skipped += 1;
        continue;
      }

      const enrollments = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", config.organizationId)
        )
        .collect();

      for (const enrollment of enrollments) {
        const existing = await ctx.db
          .query("dailyPlayerHealthChecks")
          .withIndex("by_player_and_date", (q) =>
            q
              .eq("playerIdentityId", enrollment.playerIdentityId)
              .eq("checkDate", today)
          )
          .first();

        if (existing) {
          skipped += 1;
          continue;
        }

        const player = await ctx.db.get(enrollment.playerIdentityId);
        if (!player?.userId) {
          skipped += 1;
          continue;
        }

        // email-only reminder: email delivery is not yet implemented — skip
        if (config.reminderType === "email") {
          skipped += 1;
          continue;
        }

        // in_app or both: send in-app notification
        await ctx.runMutation(
          internal.models.notifications.createNotification,
          {
            userId: player.userId,
            organizationId: config.organizationId,
            type: "wellness_reminder",
            title: "Daily Wellness Check-In",
            message:
              "Don't forget to complete your daily wellness check-in today.",
            relatedPlayerId: enrollment.playerIdentityId,
            targetRole: "player",
          }
        );

        sent += 1;
      }
    }

    return { sent, skipped };
  },
});

// ─── Internal helpers for AI Insight Generation (US-P4-010) ─────────────────

/**
 * Fetch last 14 days of health checks for a player (for insight generation).
 * Returns records sorted newest-first.
 */
export const getRecentChecksForInsight = internalQuery({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.array(
    v.object({
      checkDate: v.string(),
      sleepQuality: v.optional(v.number()),
      energyLevel: v.optional(v.number()),
      mood: v.optional(v.number()),
      physicalFeeling: v.optional(v.number()),
      motivation: v.optional(v.number()),
      foodIntake: v.optional(v.number()),
      waterIntake: v.optional(v.number()),
      muscleRecovery: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const records = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    return records
      .filter((r) => r.checkDate >= cutoffStr)
      .sort((a, b) => b.checkDate.localeCompare(a.checkDate))
      .map((r) => ({
        checkDate: r.checkDate,
        sleepQuality: r.sleepQuality,
        energyLevel: r.energyLevel,
        mood: r.mood,
        physicalFeeling: r.physicalFeeling,
        motivation: r.motivation,
        foodIntake: r.foodIntake,
        waterIntake: r.waterIntake,
        muscleRecovery: r.muscleRecovery,
      }));
  },
});

/** Check if an insight has already been generated today for this player. */
export const hasInsightGeneratedToday = internalQuery({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const record = await ctx.db
      .query("playerWellnessInsights")
      .withIndex("by_player_and_date", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .gte("generatedAt", todayStartMs)
      )
      .first();

    return record !== null;
  },
});

/** Insert a generated wellness insight record. */
export const insertWellnessInsight = internalMutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    insight: v.string(),
    generatedAt: v.number(),
    basedOnDays: v.number(),
    triggerCheckId: v.id("dailyPlayerHealthChecks"),
  },
  returns: v.id("playerWellnessInsights"),
  handler: async (ctx, args) =>
    ctx.db.insert("playerWellnessInsights", {
      playerIdentityId: args.playerIdentityId,
      organizationId: args.organizationId,
      insight: args.insight,
      generatedAt: args.generatedAt,
      basedOnDays: args.basedOnDays,
      triggerCheckId: args.triggerCheckId,
    }),
});

// ─── Player Wellness Insights (US-P4-010) ────────────────────────────────────

/**
 * Get the most recent wellness insight for a player.
 * Player-facing only — never expose to coaches or admins.
 */
export const getLatestWellnessInsight = query({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.union(
    v.object({
      _id: v.id("playerWellnessInsights"),
      insight: v.string(),
      generatedAt: v.number(),
      basedOnDays: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("playerWellnessInsights")
      .withIndex("by_player_and_date", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .order("desc")
      .first();

    if (!record) {
      return null;
    }
    return {
      _id: record._id,
      insight: record.insight,
      generatedAt: record.generatedAt,
      basedOnDays: record.basedOnDays,
    };
  },
});

/**
 * Count how many wellness check-ins a player has (for the nudge counter).
 */
export const getWellnessCheckInCount = query({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();
    return records.length;
  },
});
