import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalQuery, mutation, query } from "../_generated/server";

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

    // Filter to last N days in-memory, sorted newest first
    return records
      .filter((r) => r.checkDate >= cutoffStr)
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

    const result: {
      playerIdentityId: (typeof approved)[0]["playerIdentityId"];
      playerName: string;
      todayScore: number | null;
      trend7Days: { date: string; score: number }[];
      accessId: (typeof approved)[0]["_id"];
    }[] = [];

    for (const access of approved) {
      // Fetch player name
      const player = await ctx.db.get(access.playerIdentityId);
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
  },
  returns: v.id("dailyPlayerHealthChecks"),
  handler: async (ctx, args) => {
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
    });

    return newCheckId;
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
        link: "/player/settings",
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

// Internal query used by AI insight generation
export const _getRecentChecksInternal = internalQuery({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    days: v.number(),
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
      .sort((a, b) => b.checkDate.localeCompare(a.checkDate));
  },
});
