import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";
import type { Doc as BetterAuthDoc } from "../betterAuth/_generated/dataModel";
import {
  notifyInjuryReported,
  notifyMedicalClearance,
  notifyMilestoneCompleted,
  notifyStatusChanged,
} from "../lib/injuryNotifications";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

const severityValidator = v.union(
  v.literal("minor"),
  v.literal("moderate"),
  v.literal("severe"),
  v.literal("long_term")
);

const injuryStatusValidator = v.union(
  v.literal("active"),
  v.literal("recovering"),
  v.literal("cleared"),
  v.literal("healed")
);

const sideValidator = v.union(
  v.literal("left"),
  v.literal("right"),
  v.literal("both")
);

const occurredDuringValidator = v.union(
  v.literal("training"),
  v.literal("match"),
  v.literal("other_sport"),
  v.literal("non_sport"),
  v.literal("unknown")
);

const reportedByRoleValidator = v.union(
  v.literal("guardian"),
  v.literal("player"),
  v.literal("coach"),
  v.literal("admin")
);

const returnToPlayStepValidator = v.object({
  id: v.string(),
  step: v.number(),
  description: v.string(),
  completed: v.boolean(),
  completedDate: v.optional(v.string()),
  clearedBy: v.optional(v.string()),
});

// Injury validator for return types
// Milestone validator for Phase 2 recovery tracking
const milestoneValidator = v.object({
  id: v.string(),
  description: v.string(),
  targetDate: v.optional(v.string()),
  completedDate: v.optional(v.string()),
  completedBy: v.optional(v.string()),
  notes: v.optional(v.string()),
  order: v.number(),
});

const injuryValidator = v.object({
  _id: v.id("playerInjuries"),
  _creationTime: v.number(),
  playerIdentityId: v.id("playerIdentities"),
  injuryType: v.string(),
  bodyPart: v.string(),
  side: v.optional(sideValidator),
  dateOccurred: v.string(),
  dateReported: v.string(),
  severity: severityValidator,
  status: injuryStatusValidator,
  description: v.string(),
  mechanism: v.optional(v.string()),
  treatment: v.optional(v.string()),
  medicalProvider: v.optional(v.string()),
  medicalNotes: v.optional(v.string()),
  expectedReturn: v.optional(v.string()),
  actualReturn: v.optional(v.string()),
  daysOut: v.optional(v.number()),
  returnToPlayProtocol: v.optional(v.array(returnToPlayStepValidator)),
  occurredDuring: v.optional(occurredDuringValidator),
  occurredAtOrgId: v.optional(v.string()),
  sportCode: v.optional(v.string()),
  isVisibleToAllOrgs: v.boolean(),
  restrictedToOrgIds: v.optional(v.array(v.string())),
  reportedBy: v.optional(v.string()),
  reportedByRole: v.optional(reportedByRoleValidator),
  source: v.optional(v.union(v.literal("manual"), v.literal("voice_note"))),
  voiceNoteId: v.optional(v.id("voiceNotes")),
  // Phase 2 - Recovery plan (Issue #261)
  estimatedRecoveryDays: v.optional(v.number()),
  recoveryPlanNotes: v.optional(v.string()),
  milestones: v.optional(v.array(milestoneValidator)),
  // Phase 2 - Medical clearance (Issue #261)
  medicalClearanceRequired: v.optional(v.boolean()),
  medicalClearanceReceived: v.optional(v.boolean()),
  medicalClearanceDate: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get injury by ID
 */
export const getInjuryById = query({
  args: { injuryId: v.id("playerInjuries") },
  returns: v.union(injuryValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }
    return await ctx.db.get(args.injuryId);
  },
});

/**
 * Get all injuries for a player
 */
export const getInjuriesForPlayer = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    status: v.optional(injuryStatusValidator),
    includeHealed: v.optional(v.boolean()),
  },
  returns: v.array(injuryValidator),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    let injuries: Doc<"playerInjuries">[];

    if (args.status) {
      const status = args.status;
      injuries = await ctx.db
        .query("playerInjuries")
        .withIndex("by_status", (q) =>
          q.eq("playerIdentityId", args.playerIdentityId).eq("status", status)
        )
        .order("desc")
        .collect();
    } else {
      injuries = await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", args.playerIdentityId)
        )
        .order("desc")
        .collect();
    }

    // Filter out healed if not requested
    if (!(args.includeHealed || args.status)) {
      injuries = injuries.filter((i) => i.status !== "healed");
    }

    return injuries;
  },
});

/**
 * Get injuries for multiple players at once
 * Used by parent dashboard to fetch injuries for all children
 */
export const getInjuriesForMultiplePlayers = query({
  args: {
    playerIdentityIds: v.array(v.id("playerIdentities")),
    includeHealed: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("playerInjuries"),
      _creationTime: v.number(),
      playerIdentityId: v.id("playerIdentities"),
      injuryType: v.string(),
      bodyPart: v.string(),
      side: v.optional(sideValidator),
      status: injuryStatusValidator,
      severity: severityValidator,
      dateOccurred: v.string(),
      expectedReturn: v.optional(v.string()),
      actualReturn: v.optional(v.string()),
      description: v.string(),
      treatment: v.optional(v.string()),
      daysOut: v.optional(v.number()),
      occurredDuring: v.optional(occurredDuringValidator),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    if (args.playerIdentityIds.length === 0) {
      return [];
    }

    const allInjuries = [];

    for (const playerId of args.playerIdentityIds) {
      const injuries = await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .order("desc")
        .collect();

      for (const injury of injuries) {
        // Filter out healed/cleared if not requested
        if (
          !args.includeHealed &&
          (injury.status === "healed" || injury.status === "cleared")
        ) {
          continue;
        }

        allInjuries.push({
          _id: injury._id,
          _creationTime: injury._creationTime,
          playerIdentityId: injury.playerIdentityId,
          injuryType: injury.injuryType,
          bodyPart: injury.bodyPart,
          side: injury.side,
          status: injury.status,
          severity: injury.severity,
          dateOccurred: injury.dateOccurred,
          expectedReturn: injury.expectedReturn,
          actualReturn: injury.actualReturn,
          description: injury.description,
          treatment: injury.treatment,
          daysOut: injury.daysOut,
          occurredDuring: injury.occurredDuring,
        });
      }
    }

    return allInjuries;
  },
});

/**
 * Get active injuries for a player (visible to an organization)
 */
export const getActiveInjuriesForOrg = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.array(injuryValidator),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const injuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    // Filter to active/recovering and visible to this org
    // NOTE: JS filtering is intentionally used here because:
    // 1. Visibility logic requires OR of: isVisibleToAllOrgs, restrictedToOrgIds.includes(), occurredAtOrgId match
    // 2. These conditions cannot be expressed in a single Convex index
    // 3. Status exclusion (exclude "healed") would require querying 3 separate statuses
    // Performance impact: This queries all injuries for a player (typically <10 records)
    // and filters in-memory, which is acceptable for this use case.
    return injuries.filter((injury) => {
      // Only show non-healed injuries
      if (injury.status === "healed") {
        return false;
      }

      // Check visibility
      if (injury.isVisibleToAllOrgs) {
        return true;
      }

      // Check if this org is in the restricted list
      if (injury.restrictedToOrgIds?.includes(args.organizationId)) {
        return true;
      }

      // Check if this org is where it occurred
      if (injury.occurredAtOrgId === args.organizationId) {
        return true;
      }

      return false;
    });
  },
});

/**
 * Get all active injuries across all players in an organization
 * Returns injuries with player details for dashboard display
 */
export const getAllActiveInjuriesForOrg = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get all active enrollments using composite index (no JS filter)
    const activeEnrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    // Deduplicate playerIdentityIds (same player can have multiple enrollments)
    const uniquePlayerIds = [
      ...new Set(activeEnrollments.map((e) => e.playerIdentityId)),
    ];

    // Batch fetch all player identities
    const players = await Promise.all(
      uniquePlayerIds.map((id) => ctx.db.get(id))
    );
    const playerMap = new Map<
      string,
      { _id: string; firstName: string; lastName: string }
    >();
    for (const p of players) {
      if (p) {
        playerMap.set(p._id, {
          _id: p._id,
          firstName: p.firstName,
          lastName: p.lastName,
        });
      }
    }

    // Fetch injuries for each unique player
    const results = [];
    for (const playerId of uniquePlayerIds) {
      const injuries = await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .collect();

      // Filter to active/recovering injuries visible to this org
      const activeInjuries = injuries.filter((injury) => {
        if (injury.status === "healed" || injury.status === "cleared") {
          return false;
        }
        return isInjuryVisibleToOrg(injury, args.organizationId);
      });

      const player = playerMap.get(playerId);
      for (const injury of activeInjuries) {
        results.push({
          ...injury,
          player: player ?? null,
        });
      }
    }

    return results;
  },
});

/**
 * Get ALL injuries across all players in an organization (including healed)
 * Returns injuries with player details for dashboard display
 */
export const getAllInjuriesForOrg = query({
  args: {
    organizationId: v.string(),
    status: v.optional(injuryStatusValidator),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get all active enrollments using composite index (no JS filter)
    const activeEnrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    // Deduplicate playerIdentityIds and build enrollment lookup for ageGroup
    const uniquePlayerIds = [
      ...new Set(activeEnrollments.map((e) => e.playerIdentityId)),
    ];
    const enrollmentMap = new Map<string, { ageGroup: string }>();
    for (const e of activeEnrollments) {
      enrollmentMap.set(e.playerIdentityId, { ageGroup: e.ageGroup });
    }

    // Batch fetch all player identities
    const players = await Promise.all(
      uniquePlayerIds.map((id) => ctx.db.get(id))
    );
    const playerMap = new Map<
      string,
      { _id: string; firstName: string; lastName: string }
    >();
    for (const p of players) {
      if (p) {
        playerMap.set(p._id, {
          _id: p._id,
          firstName: p.firstName,
          lastName: p.lastName,
        });
      }
    }

    // Fetch injuries for each unique player
    const results = [];
    for (const playerId of uniquePlayerIds) {
      const injuries = await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .collect();

      // Filter by status and visibility
      const filteredInjuries = injuries.filter((injury) => {
        if (args.status && injury.status !== args.status) {
          return false;
        }
        return isInjuryVisibleToOrg(injury, args.organizationId);
      });

      const player = playerMap.get(playerId);
      const enrollment = enrollmentMap.get(playerId);
      for (const injury of filteredInjuries) {
        results.push({
          ...injury,
          player: player ?? null,
          ageGroup: enrollment?.ageGroup,
        });
      }
    }

    // Sort by date occurred descending
    results.sort(
      (a, b) =>
        new Date(b.dateOccurred).getTime() - new Date(a.dateOccurred).getTime()
    );

    return results;
  },
});

/**
 * Get injury history for a specific body part
 */
export const getInjuryHistoryByBodyPart = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    bodyPart: v.string(),
  },
  returns: v.array(injuryValidator),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const injuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    return injuries
      .filter((i) => i.bodyPart === args.bodyPart)
      .sort(
        (a, b) =>
          new Date(b.dateOccurred).getTime() -
          new Date(a.dateOccurred).getTime()
      );
  },
});

/**
 * Get injury statistics for a player
 */
export const getInjuryStats = query({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.object({
    totalInjuries: v.number(),
    activeInjuries: v.number(),
    recoveringInjuries: v.number(),
    healedInjuries: v.number(),
    totalDaysOut: v.number(),
    injuriesByBodyPart: v.array(
      v.object({
        bodyPart: v.string(),
        count: v.number(),
      })
    ),
    injuriesBySeverity: v.array(
      v.object({
        severity: v.string(),
        count: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const injuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    const stats = {
      totalInjuries: injuries.length,
      activeInjuries: injuries.filter((i) => i.status === "active").length,
      recoveringInjuries: injuries.filter((i) => i.status === "recovering")
        .length,
      healedInjuries: injuries.filter((i) => i.status === "healed").length,
      totalDaysOut: injuries.reduce((sum, i) => sum + (i.daysOut || 0), 0),
      injuriesByBodyPart: [] as Array<{ bodyPart: string; count: number }>,
      injuriesBySeverity: [] as Array<{ severity: string; count: number }>,
    };

    // Count by body part
    const bodyPartCounts = new Map<string, number>();
    for (const injury of injuries) {
      bodyPartCounts.set(
        injury.bodyPart,
        (bodyPartCounts.get(injury.bodyPart) || 0) + 1
      );
    }
    stats.injuriesByBodyPart = Array.from(bodyPartCounts.entries())
      .map(([bodyPart, count]) => ({ bodyPart, count }))
      .sort((a, b) => b.count - a.count);

    // Count by severity
    const severityCounts = new Map<string, number>();
    for (const injury of injuries) {
      severityCounts.set(
        injury.severity,
        (severityCounts.get(injury.severity) || 0) + 1
      );
    }
    stats.injuriesBySeverity = Array.from(severityCounts.entries())
      .map(([severity, count]) => ({ severity, count }))
      .sort((a, b) => b.count - a.count);

    return stats;
  },
});

// ============================================================
// PHASE 3: ANALYTICS QUERIES (Issue #261)
// ============================================================

/**
 * Check if an injury is visible to a given organization.
 */
function isInjuryVisibleToOrg(
  injury: Doc<"playerInjuries">,
  organizationId: string
): boolean {
  if (injury.isVisibleToAllOrgs) {
    return true;
  }
  if (injury.restrictedToOrgIds?.includes(organizationId)) {
    return true;
  }
  return injury.occurredAtOrgId === organizationId;
}

/**
 * Apply date range filtering to injuries.
 */
function filterByDateRange(
  injuries: Doc<"playerInjuries">[],
  startDate?: string,
  endDate?: string
): Doc<"playerInjuries">[] {
  let result = injuries;
  if (startDate) {
    result = result.filter((i) => i.dateOccurred >= startDate);
  }
  if (endDate) {
    result = result.filter((i) => i.dateOccurred <= endDate);
  }
  return result;
}

/** Count injuries by a string field, returning sorted array. */
function countByField(
  injuries: Doc<"playerInjuries">[],
  getKey: (injury: Doc<"playerInjuries">) => string
): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const injury of injuries) {
    const k = getKey(injury);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

/** Compute injury counts by month for the last 12 months. */
function computeByMonth(
  injuries: Doc<"playerInjuries">[]
): Array<{ month: string; count: number }> {
  const monthMap = new Map<string, number>();
  const now = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, 0);
  }
  for (const injury of injuries) {
    const d = new Date(injury.dateOccurred);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap.has(key)) {
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    }
  }
  return Array.from(monthMap.entries()).map(([month, count]) => ({
    month,
    count,
  }));
}

/** Compute average recovery days from healed injuries. */
function computeAvgRecoveryDays(injuries: Doc<"playerInjuries">[]): number {
  const healedWithDays = injuries.filter(
    (i) => i.status === "healed" && i.daysOut != null
  );
  if (healedWithDays.length === 0) {
    return 0;
  }
  const totalDays = healedWithDays.reduce(
    (sum, i) => sum + (i.daysOut || 0),
    0
  );
  return Math.round((totalDays / healedWithDays.length) * 10) / 10;
}

/** Compute recurrence rate: players with 2+ injuries / total injured players. */
function computeRecurrenceRate(injuries: Doc<"playerInjuries">[]): number {
  const playerCounts = new Map<string, number>();
  for (const injury of injuries) {
    const pid = injury.playerIdentityId;
    playerCounts.set(pid, (playerCounts.get(pid) || 0) + 1);
  }
  const totalInjuredPlayers = playerCounts.size;
  if (totalInjuredPlayers === 0) {
    return 0;
  }
  let playersWithRecurrence = 0;
  for (const count of playerCounts.values()) {
    if (count >= 2) {
      playersWithRecurrence += 1;
    }
  }
  return Math.round((playersWithRecurrence / totalInjuredPlayers) * 1000) / 10;
}

/**
 * Aggregate injury data into analytics summaries.
 */
function computeInjuryAggregations(injuries: Doc<"playerInjuries">[]) {
  // Status counts
  const statusCounts = { active: 0, recovering: 0, cleared: 0, healed: 0 };
  for (const injury of injuries) {
    if (injury.status in statusCounts) {
      statusCounts[injury.status as keyof typeof statusCounts] += 1;
    }
  }

  const byBodyPart = countByField(injuries, (i) => i.bodyPart).map(
    ({ key, count }) => ({ bodyPart: key, count })
  );
  const bySeverity = countByField(injuries, (i) => i.severity).map(
    ({ key, count }) => ({ severity: key, count })
  );
  const byOccurredDuring = countByField(
    injuries,
    (i) => i.occurredDuring || "unknown"
  ).map(({ key, count }) => ({ context: key, count }));

  return {
    totalInjuries: injuries.length,
    activeCount: statusCounts.active,
    recoveringCount: statusCounts.recovering,
    clearedCount: statusCounts.cleared,
    healedCount: statusCounts.healed,
    byBodyPart,
    bySeverity,
    byMonth: computeByMonth(injuries),
    byOccurredDuring,
    avgRecoveryDays: computeAvgRecoveryDays(injuries),
    recurrenceRate: computeRecurrenceRate(injuries),
  };
}

/** Return type for analytics aggregations */
const analyticsReturnValidator = v.object({
  totalInjuries: v.number(),
  activeCount: v.number(),
  recoveringCount: v.number(),
  clearedCount: v.number(),
  healedCount: v.number(),
  byBodyPart: v.array(v.object({ bodyPart: v.string(), count: v.number() })),
  bySeverity: v.array(v.object({ severity: v.string(), count: v.number() })),
  byMonth: v.array(v.object({ month: v.string(), count: v.number() })),
  byOccurredDuring: v.array(
    v.object({ context: v.string(), count: v.number() })
  ),
  avgRecoveryDays: v.number(),
  recurrenceRate: v.number(),
});

/**
 * Get comprehensive injury analytics for an organization.
 * Fetches all injuries via enrollments, aggregates in-memory.
 * No N+1: batch fetch pattern with Map lookups.
 */
export const getOrgInjuryAnalytics = query({
  args: {
    organizationId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  returns: analyticsReturnValidator,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // 1. Get all active enrollments for the org
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    // 2. Collect unique playerIdentityIds
    const uniquePlayerIds = [
      ...new Set(enrollments.map((e) => e.playerIdentityId)),
    ];

    // 3. Batch fetch all injuries for all players, filtered by org visibility
    const allInjuries: Doc<"playerInjuries">[] = [];
    for (const playerId of uniquePlayerIds) {
      const injuries = await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .collect();

      for (const injury of injuries) {
        if (isInjuryVisibleToOrg(injury, args.organizationId)) {
          allInjuries.push(injury);
        }
      }
    }

    // 4. Apply date range filtering and compute aggregations
    const filteredInjuries = filterByDateRange(
      allInjuries,
      args.startDate,
      args.endDate
    );

    return computeInjuryAggregations(filteredInjuries);
  },
});

/** Compute summary stats for a set of injuries belonging to a team. */
function computeTeamInjuryStats(injuries: Doc<"playerInjuries">[]) {
  if (injuries.length === 0) {
    return {
      totalInjuries: 0,
      activeCount: 0,
      avgSeverity: "minor",
      mostCommonBodyPart: "N/A",
      mostCommonType: "N/A",
    };
  }

  const severityOrder: Record<string, number> = {
    minor: 1,
    moderate: 2,
    severe: 3,
    long_term: 4,
  };
  const severityLabels = ["minor", "moderate", "severe", "long_term"];

  let activeCount = 0;
  let severitySum = 0;
  for (const inj of injuries) {
    if (inj.status === "active" || inj.status === "recovering") {
      activeCount += 1;
    }
    severitySum += severityOrder[inj.severity] || 1;
  }
  const avgSeverityIdx = Math.round(severitySum / injuries.length) - 1;
  const avgSeverity =
    severityLabels[Math.max(0, Math.min(3, avgSeverityIdx))] || "minor";

  const bodyPartCounts = countByField(injuries, (i) => i.bodyPart);
  const mostCommonBodyPart =
    bodyPartCounts.length > 0 ? bodyPartCounts[0].key : "N/A";

  const typeCounts = countByField(injuries, (i) => i.injuryType);
  const mostCommonType = typeCounts.length > 0 ? typeCounts[0].key : "N/A";

  return {
    totalInjuries: injuries.length,
    activeCount,
    avgSeverity,
    mostCommonBodyPart,
    mostCommonType,
  };
}

/** Collect injuries for a set of player IDs from a pre-built map. */
function gatherTeamInjuries(
  playerIds: Set<string>,
  playerInjuryMap: Map<string, Doc<"playerInjuries">[]>
): Doc<"playerInjuries">[] {
  const teamInjuries: Doc<"playerInjuries">[] = [];
  for (const pid of playerIds) {
    const pInjuries = playerInjuryMap.get(pid);
    if (pInjuries) {
      for (const inj of pInjuries) {
        teamInjuries.push(inj);
      }
    }
  }
  return teamInjuries;
}

/**
 * Get injury statistics broken down by team.
 * Uses Better Auth adapter for team data, batch fetches injuries.
 */
export const getInjuriesByTeam = query({
  args: {
    organizationId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      teamId: v.string(),
      teamName: v.string(),
      totalInjuries: v.number(),
      activeCount: v.number(),
      avgSeverity: v.string(),
      mostCommonBodyPart: v.string(),
      mostCommonType: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // 1. Fetch all teams for the org via Better Auth adapter
    const teamsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: { cursor: null, numItems: 500 },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );
    const teams = (teamsResult?.page || []) as BetterAuthDoc<"team">[];

    if (teams.length === 0) {
      return [];
    }

    // 2. Build team map for O(1) lookup
    const teamMap = new Map<string, BetterAuthDoc<"team">>();
    for (const team of teams) {
      teamMap.set(team._id, team);
    }

    // 3. Fetch all teamPlayerIdentities for the org
    const teamPlayerIdentities = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    // 4. Build playerIds-by-team map
    const teamPlayerMap = new Map<string, Set<string>>();
    for (const tpi of teamPlayerIdentities) {
      if (!teamMap.has(tpi.teamId)) {
        continue;
      }
      const existing = teamPlayerMap.get(tpi.teamId);
      if (existing) {
        existing.add(tpi.playerIdentityId);
      } else {
        teamPlayerMap.set(tpi.teamId, new Set([tpi.playerIdentityId]));
      }
    }

    // 5. Collect all unique player IDs across all teams
    const allPlayerIds = new Set<string>();
    for (const playerSet of teamPlayerMap.values()) {
      for (const pid of playerSet) {
        allPlayerIds.add(pid);
      }
    }

    // 6. Batch fetch all injuries for all players
    const playerInjuryMap = new Map<string, Doc<"playerInjuries">[]>();
    for (const playerId of allPlayerIds) {
      const injuries = await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq(
            "playerIdentityId",
            playerId as Doc<"playerInjuries">["playerIdentityId"]
          )
        )
        .collect();

      // Filter by visibility and date range
      const visible = injuries.filter((i) =>
        isInjuryVisibleToOrg(i, args.organizationId)
      );
      const filtered = filterByDateRange(visible, args.startDate, args.endDate);

      if (filtered.length > 0) {
        playerInjuryMap.set(playerId, filtered);
      }
    }

    // 7. Compute per-team stats using helpers
    const results = [];

    for (const [teamId, playerIds] of teamPlayerMap.entries()) {
      const team = teamMap.get(teamId);
      if (!team) {
        continue;
      }

      const teamInjuries = gatherTeamInjuries(playerIds, playerInjuryMap);
      if (teamInjuries.length === 0) {
        continue;
      }

      const stats = computeTeamInjuryStats(teamInjuries);
      results.push({
        teamId,
        teamName: team.name,
        ...stats,
      });
    }

    // Sort by totalInjuries descending
    results.sort((a, b) => b.totalInjuries - a.totalInjuries);

    return results;
  },
});

/** Compute percentage change between two values. Returns 0 if previous is 0. */
function percentChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Period stats shape for trend comparison. */
const periodStatsValidator = v.object({
  totalInjuries: v.number(),
  bySeverity: v.array(v.object({ severity: v.string(), count: v.number() })),
  byBodyPart: v.array(v.object({ bodyPart: v.string(), count: v.number() })),
  avgRecoveryDays: v.number(),
});

/**
 * Compare injury stats between current and previous periods.
 * Useful for trend indicators on summary cards.
 */
export const getInjuryTrends = query({
  args: {
    organizationId: v.string(),
    periodDays: v.optional(v.number()),
  },
  returns: v.object({
    currentPeriod: periodStatsValidator,
    previousPeriod: periodStatsValidator,
    changes: v.object({
      totalChange: v.number(),
      totalChangePercent: v.number(),
      avgRecoveryChange: v.number(),
      avgRecoveryChangePercent: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const days = args.periodDays ?? 30;
    const now = new Date();

    // Current period: last N days
    const currentEnd = now.toISOString().split("T")[0];
    const currentStart = new Date(now.getTime() - days * 86_400_000)
      .toISOString()
      .split("T")[0];

    // Previous period: the N days before that
    const previousEnd = currentStart;
    const previousStart = new Date(now.getTime() - days * 2 * 86_400_000)
      .toISOString()
      .split("T")[0];

    // Fetch all active enrollments for the org
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    const uniquePlayerIds = [
      ...new Set(enrollments.map((e) => e.playerIdentityId)),
    ];

    // Batch fetch all injuries for all players
    const allInjuries: Doc<"playerInjuries">[] = [];
    for (const playerId of uniquePlayerIds) {
      const injuries = await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .collect();

      for (const injury of injuries) {
        if (isInjuryVisibleToOrg(injury, args.organizationId)) {
          allInjuries.push(injury);
        }
      }
    }

    // Split into current and previous period
    const currentInjuries = filterByDateRange(
      allInjuries,
      currentStart,
      currentEnd
    );
    const previousInjuries = filterByDateRange(
      allInjuries,
      previousStart,
      previousEnd
    );

    // Compute stats for each period
    const computePeriodStats = (injuries: Doc<"playerInjuries">[]) => {
      const bySeverity = countByField(injuries, (i) => i.severity).map(
        ({ key, count }) => ({ severity: key, count })
      );
      const byBodyPart = countByField(injuries, (i) => i.bodyPart).map(
        ({ key, count }) => ({ bodyPart: key, count })
      );

      return {
        totalInjuries: injuries.length,
        bySeverity,
        byBodyPart,
        avgRecoveryDays: computeAvgRecoveryDays(injuries),
      };
    };

    const currentPeriod = computePeriodStats(currentInjuries);
    const previousPeriod = computePeriodStats(previousInjuries);

    return {
      currentPeriod,
      previousPeriod,
      changes: {
        totalChange: currentPeriod.totalInjuries - previousPeriod.totalInjuries,
        totalChangePercent: percentChange(
          currentPeriod.totalInjuries,
          previousPeriod.totalInjuries
        ),
        avgRecoveryChange:
          Math.round(
            (currentPeriod.avgRecoveryDays - previousPeriod.avgRecoveryDays) *
              10
          ) / 10,
        avgRecoveryChangePercent: percentChange(
          currentPeriod.avgRecoveryDays,
          previousPeriod.avgRecoveryDays
        ),
      },
    };
  },
});

/**
 * Get enriched recent injuries for admin dashboard table.
 * Batch fetches player names, team names, and age groups.
 */
export const getRecentInjuriesForAdmin = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
    status: v.optional(injuryStatusValidator),
  },
  returns: v.array(
    v.object({
      injuryId: v.id("playerInjuries"),
      playerName: v.string(),
      teamNames: v.array(v.string()),
      ageGroup: v.string(),
      bodyPart: v.string(),
      injuryType: v.string(),
      severity: v.string(),
      status: v.string(),
      dateOccurred: v.string(),
      daysOut: v.optional(v.number()),
      expectedReturn: v.optional(v.string()),
      treatment: v.optional(v.string()),
      medicalProvider: v.optional(v.string()),
      occurredDuring: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const maxResults = args.limit ?? 50;

    // 1. Get all active enrollments
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    // Build enrollment map: playerIdentityId → enrollment (for ageGroup)
    const enrollmentMap = new Map<string, { ageGroup: string }>();
    for (const e of enrollments) {
      enrollmentMap.set(e.playerIdentityId, { ageGroup: e.ageGroup });
    }

    // Collect unique playerIdentityIds (preserving Id type)
    const uniquePlayerIds = [
      ...new Set(enrollments.map((e) => e.playerIdentityId)),
    ];

    // 2. Batch fetch all injuries for all players
    const allInjuries: Doc<"playerInjuries">[] = [];
    for (const playerId of uniquePlayerIds) {
      const injuries = await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .collect();

      for (const injury of injuries) {
        if (isInjuryVisibleToOrg(injury, args.organizationId)) {
          // Apply status filter if provided
          if (args.status && injury.status !== args.status) {
            continue;
          }
          allInjuries.push(injury);
        }
      }
    }

    // 3. Sort by dateOccurred descending and limit
    allInjuries.sort(
      (a, b) =>
        new Date(b.dateOccurred).getTime() - new Date(a.dateOccurred).getTime()
    );
    const limitedInjuries = allInjuries.slice(0, maxResults);

    // 4. Batch fetch player identities for enrichment
    const playerIdsToFetch = [
      ...new Set(limitedInjuries.map((i) => i.playerIdentityId)),
    ];
    const playerMap = new Map<
      string,
      { firstName: string; lastName: string }
    >();
    const players = await Promise.all(
      playerIdsToFetch.map((id) => ctx.db.get(id))
    );
    for (const player of players) {
      if (player) {
        playerMap.set(player._id, {
          firstName: player.firstName,
          lastName: player.lastName,
        });
      }
    }

    // 5. Batch fetch team assignments for these players
    const teamPlayerIdentities = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    // Build player → teamIds map
    const playerTeamIds = new Map<string, string[]>();
    for (const tpi of teamPlayerIdentities) {
      const existing = playerTeamIds.get(tpi.playerIdentityId);
      if (existing) {
        existing.push(tpi.teamId);
      } else {
        playerTeamIds.set(tpi.playerIdentityId, [tpi.teamId]);
      }
    }

    // 6. Batch fetch team names
    const allTeamIds = new Set<string>();
    for (const teamIds of playerTeamIds.values()) {
      for (const tid of teamIds) {
        allTeamIds.add(tid);
      }
    }

    const teamNameMap = new Map<string, string>();
    if (allTeamIds.size > 0) {
      const teamsResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "team",
          paginationOpts: { cursor: null, numItems: 500 },
          where: [
            {
              field: "organizationId",
              value: args.organizationId,
              operator: "eq",
            },
          ],
        }
      );
      const teams = (teamsResult?.page || []) as BetterAuthDoc<"team">[];
      for (const team of teams) {
        teamNameMap.set(team._id, team.name);
      }
    }

    // 7. Assemble enriched results
    return limitedInjuries.map((injury) => {
      const player = playerMap.get(injury.playerIdentityId);
      const enrollment = enrollmentMap.get(injury.playerIdentityId);
      const teamIds = playerTeamIds.get(injury.playerIdentityId) || [];
      const teamNames = teamIds
        .map((tid) => teamNameMap.get(tid))
        .filter((name): name is string => name != null);

      return {
        injuryId: injury._id,
        playerName: player
          ? `${player.firstName} ${player.lastName}`
          : "Unknown",
        teamNames,
        ageGroup: enrollment?.ageGroup || "Unknown",
        bodyPart: injury.bodyPart,
        injuryType: injury.injuryType,
        severity: injury.severity,
        status: injury.status,
        dateOccurred: injury.dateOccurred,
        daysOut: injury.daysOut,
        expectedReturn: injury.expectedReturn,
        treatment: injury.treatment,
        medicalProvider: injury.medicalProvider,
        occurredDuring: injury.occurredDuring,
      };
    });
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Report a new injury
 */
export const reportInjury = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    injuryType: v.string(),
    bodyPart: v.string(),
    side: v.optional(sideValidator),
    dateOccurred: v.string(),
    severity: severityValidator,
    description: v.string(),
    mechanism: v.optional(v.string()),
    treatment: v.optional(v.string()),
    medicalProvider: v.optional(v.string()),
    expectedReturn: v.optional(v.string()),
    occurredDuring: v.optional(occurredDuringValidator),
    occurredAtOrgId: v.optional(v.string()),
    sportCode: v.optional(v.string()),
    isVisibleToAllOrgs: v.optional(v.boolean()),
    restrictedToOrgIds: v.optional(v.array(v.string())),
    reportedBy: v.optional(v.string()),
    reportedByRole: v.optional(reportedByRoleValidator),
  },
  returns: v.id("playerInjuries"),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Verify player exists
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      throw new Error("Player identity not found");
    }

    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    const injuryId = await ctx.db.insert("playerInjuries", {
      playerIdentityId: args.playerIdentityId,
      injuryType: args.injuryType,
      bodyPart: args.bodyPart,
      side: args.side,
      dateOccurred: args.dateOccurred,
      dateReported: today,
      severity: args.severity,
      status: "active",
      description: args.description,
      mechanism: args.mechanism,
      treatment: args.treatment,
      medicalProvider: args.medicalProvider,
      expectedReturn: args.expectedReturn,
      occurredDuring: args.occurredDuring,
      occurredAtOrgId: args.occurredAtOrgId,
      sportCode: args.sportCode,
      isVisibleToAllOrgs: args.isVisibleToAllOrgs ?? true, // Default to visible
      restrictedToOrgIds: args.restrictedToOrgIds,
      reportedBy: args.reportedBy,
      reportedByRole: args.reportedByRole,
      createdAt: now,
      updatedAt: now,
    });

    // Send notifications to relevant stakeholders (Phase 1 - Issue #261)
    // Only send if we have an organization context
    if (args.occurredAtOrgId) {
      try {
        await notifyInjuryReported(ctx, {
          injuryId,
          playerIdentityId: args.playerIdentityId,
          organizationId: args.occurredAtOrgId,
          reportedByUserId: args.reportedBy,
          reportedByRole: args.reportedByRole,
          severity: args.severity,
          playerName: `${player.firstName} ${player.lastName}`,
          bodyPart: args.bodyPart,
          injuryType: args.injuryType,
        });
      } catch (error) {
        // Log but don't fail the injury creation if notifications fail
        console.error("[reportInjury] Failed to send notifications:", error);
      }
    }

    return injuryId;
  },
});

/**
 * Update injury status
 */
export const updateInjuryStatus = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    status: injuryStatusValidator,
    actualReturn: v.optional(v.string()),
    updatedBy: v.optional(v.string()), // User ID of who made the update
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db.get(args.injuryId);
    if (!existing) {
      throw new Error("Injury not found");
    }

    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    // If marking as cleared/healed, record actual return date
    if (
      (args.status === "cleared" || args.status === "healed") &&
      args.actualReturn
    ) {
      updates.actualReturn = args.actualReturn;

      // Calculate days out
      const occurred = new Date(existing.dateOccurred);
      const returned = new Date(args.actualReturn);
      updates.daysOut = Math.ceil(
        (returned.getTime() - occurred.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    await ctx.db.patch(args.injuryId, updates);

    // Send notifications for significant status changes (Phase 1 - Issue #261)
    // Only notify for cleared/healed status changes
    if (
      (args.status === "cleared" || args.status === "healed") &&
      existing.occurredAtOrgId
    ) {
      try {
        // Get player info for notification
        const player = await ctx.db.get(existing.playerIdentityId);
        if (player) {
          await notifyStatusChanged(ctx, {
            injuryId: args.injuryId,
            playerIdentityId: existing.playerIdentityId,
            organizationId: existing.occurredAtOrgId,
            updatedByUserId: args.updatedBy,
            newStatus: args.status,
            playerName: `${player.firstName} ${player.lastName}`,
            bodyPart: existing.bodyPart,
          });
        }
      } catch (error) {
        // Log but don't fail the status update if notifications fail
        console.error(
          "[updateInjuryStatus] Failed to send notifications:",
          error
        );
      }
    }

    return null;
  },
});

/**
 * Update injury details
 */
export const updateInjuryDetails = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    treatment: v.optional(v.string()),
    medicalProvider: v.optional(v.string()),
    medicalNotes: v.optional(v.string()),
    expectedReturn: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db.get(args.injuryId);
    if (!existing) {
      throw new Error("Injury not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.treatment !== undefined) {
      updates.treatment = args.treatment;
    }
    if (args.medicalProvider !== undefined) {
      updates.medicalProvider = args.medicalProvider;
    }
    if (args.medicalNotes !== undefined) {
      updates.medicalNotes = args.medicalNotes;
    }
    if (args.expectedReturn !== undefined) {
      updates.expectedReturn = args.expectedReturn;
    }

    await ctx.db.patch(args.injuryId, updates);
    return null;
  },
});

/**
 * Comprehensive injury update - allows editing all core injury fields
 * Used by the Edit Injury dialog for coaches
 */
export const updateInjury = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    injuryType: v.optional(v.string()),
    bodyPart: v.optional(v.string()),
    side: v.optional(v.union(sideValidator, v.null())),
    dateOccurred: v.optional(v.string()),
    severity: v.optional(severityValidator),
    status: v.optional(injuryStatusValidator),
    description: v.optional(v.string()),
    treatment: v.optional(v.string()),
    expectedReturn: v.optional(v.string()),
    actualReturn: v.optional(v.string()),
    occurredDuring: v.optional(occurredDuringValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db.get(args.injuryId);
    if (!existing) {
      throw new Error("Injury not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    // Only include fields that were provided
    if (args.injuryType !== undefined) {
      updates.injuryType = args.injuryType;
    }
    if (args.bodyPart !== undefined) {
      updates.bodyPart = args.bodyPart;
    }
    if (args.side !== undefined) {
      updates.side = args.side ?? undefined;
    }
    if (args.dateOccurred !== undefined) {
      updates.dateOccurred = args.dateOccurred;
    }
    if (args.severity !== undefined) {
      updates.severity = args.severity;
    }
    if (args.status !== undefined) {
      updates.status = args.status;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }
    if (args.treatment !== undefined) {
      updates.treatment = args.treatment;
    }
    if (args.expectedReturn !== undefined) {
      updates.expectedReturn = args.expectedReturn;
    }
    if (args.actualReturn !== undefined) {
      updates.actualReturn = args.actualReturn;
    }
    if (args.occurredDuring !== undefined) {
      updates.occurredDuring = args.occurredDuring;
    }

    // Calculate days out if status changed to cleared/healed and actualReturn provided
    if (
      (args.status === "cleared" || args.status === "healed") &&
      args.actualReturn
    ) {
      const occurred = new Date(args.dateOccurred ?? existing.dateOccurred);
      const returned = new Date(args.actualReturn);
      updates.daysOut = Math.ceil(
        (returned.getTime() - occurred.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    await ctx.db.patch(args.injuryId, updates);

    // Send notifications for significant status changes
    if (
      args.status &&
      args.status !== existing.status &&
      (args.status === "cleared" || args.status === "healed") &&
      existing.occurredAtOrgId
    ) {
      try {
        const playerIdentity = await ctx.db.get(existing.playerIdentityId);
        const playerName = playerIdentity
          ? `${playerIdentity.firstName} ${playerIdentity.lastName}`
          : "Player";

        await notifyStatusChanged(ctx, {
          injuryId: args.injuryId,
          playerIdentityId: existing.playerIdentityId,
          organizationId: existing.occurredAtOrgId,
          updatedByUserId: undefined,
          newStatus: args.status,
          playerName,
          bodyPart: args.bodyPart ?? existing.bodyPart,
        });
      } catch (error) {
        console.error("[updateInjury] Failed to send notifications:", error);
      }
    }

    return null;
  },
});

/**
 * Update visibility settings
 */
export const updateInjuryVisibility = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    isVisibleToAllOrgs: v.boolean(),
    restrictedToOrgIds: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db.get(args.injuryId);
    if (!existing) {
      throw new Error("Injury not found");
    }

    await ctx.db.patch(args.injuryId, {
      isVisibleToAllOrgs: args.isVisibleToAllOrgs,
      restrictedToOrgIds: args.restrictedToOrgIds,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Set return to play protocol
 */
export const setReturnToPlayProtocol = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    protocol: v.array(returnToPlayStepValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db.get(args.injuryId);
    if (!existing) {
      throw new Error("Injury not found");
    }

    await ctx.db.patch(args.injuryId, {
      returnToPlayProtocol: args.protocol,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Complete a return to play step
 */
export const completeProtocolStep = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    stepId: v.string(),
    clearedBy: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db.get(args.injuryId);
    if (!existing) {
      throw new Error("Injury not found");
    }

    if (!existing.returnToPlayProtocol) {
      throw new Error("No return to play protocol set");
    }

    const today = new Date().toISOString().split("T")[0];
    const updatedProtocol = existing.returnToPlayProtocol.map((step) => {
      if (step.id === args.stepId) {
        return {
          ...step,
          completed: true,
          completedDate: today,
          clearedBy: args.clearedBy,
        };
      }
      return step;
    });

    await ctx.db.patch(args.injuryId, {
      returnToPlayProtocol: updatedProtocol,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Delete an injury (hard delete)
 */
export const deleteInjury = mutation({
  args: { injuryId: v.id("playerInjuries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db.get(args.injuryId);
    if (!existing) {
      throw new Error("Injury not found");
    }

    await ctx.db.delete(args.injuryId);
    return null;
  },
});

// ============================================================
// PHASE 2: RECOVERY MANAGEMENT (Issue #261)
// ============================================================

/**
 * Progress update type validator
 * Note: Reserved for future use when updateType becomes a parameter
 */
const _progressUpdateTypeValidator = v.union(
  v.literal("progress_note"),
  v.literal("milestone_completed"),
  v.literal("status_change"),
  v.literal("document_uploaded"),
  v.literal("clearance_received"),
  v.literal("recovery_plan_created"),
  v.literal("recovery_plan_updated")
);

/**
 * Role validator for progress updates
 */
const updaterRoleValidator = v.union(
  v.literal("guardian"),
  v.literal("coach"),
  v.literal("admin")
);

/**
 * Set or update recovery plan for an injury
 */
export const setRecoveryPlan = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    estimatedRecoveryDays: v.optional(v.number()),
    recoveryPlanNotes: v.optional(v.string()),
    milestones: v.optional(
      v.array(
        v.object({
          description: v.string(),
          targetDate: v.optional(v.string()),
          order: v.number(),
        })
      )
    ),
    medicalClearanceRequired: v.optional(v.boolean()),
    // User context
    updatedBy: v.string(),
    updatedByName: v.string(),
    updatedByRole: updaterRoleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db.get(args.injuryId);
    if (!existing) {
      throw new Error("Injury not found");
    }

    const isNewPlan = !(existing.milestones || existing.recoveryPlanNotes);

    // Convert milestones to include IDs
    const milestonesWithIds = args.milestones?.map((m, index) => ({
      id: `milestone_${Date.now()}_${index}`,
      description: m.description,
      targetDate: m.targetDate,
      order: m.order,
      completedDate: undefined,
      completedBy: undefined,
      notes: undefined,
    }));

    await ctx.db.patch(args.injuryId, {
      estimatedRecoveryDays: args.estimatedRecoveryDays,
      recoveryPlanNotes: args.recoveryPlanNotes,
      milestones: milestonesWithIds,
      medicalClearanceRequired: args.medicalClearanceRequired,
      updatedAt: Date.now(),
    });

    // Log progress update
    await ctx.db.insert("injuryProgressUpdates", {
      injuryId: args.injuryId,
      updatedBy: args.updatedBy,
      updatedByName: args.updatedByName,
      updatedByRole: args.updatedByRole,
      updateType: isNewPlan ? "recovery_plan_created" : "recovery_plan_updated",
      notes: args.recoveryPlanNotes,
      createdAt: Date.now(),
    });

    return null;
  },
});

/**
 * Add a milestone to an existing recovery plan
 */
export const addMilestone = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    description: v.string(),
    targetDate: v.optional(v.string()),
    updatedBy: v.string(),
    updatedByName: v.string(),
    updatedByRole: updaterRoleValidator,
  },
  returns: v.string(), // Returns the new milestone ID
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db.get(args.injuryId);
    if (!existing) {
      throw new Error("Injury not found");
    }

    const currentMilestones = existing.milestones || [];
    const newMilestoneId = `milestone_${Date.now()}`;
    const newMilestone = {
      id: newMilestoneId,
      description: args.description,
      targetDate: args.targetDate,
      order: currentMilestones.length,
      completedDate: undefined,
      completedBy: undefined,
      notes: undefined,
    };

    await ctx.db.patch(args.injuryId, {
      milestones: [...currentMilestones, newMilestone],
      updatedAt: Date.now(),
    });

    // Log progress update
    await ctx.db.insert("injuryProgressUpdates", {
      injuryId: args.injuryId,
      updatedBy: args.updatedBy,
      updatedByName: args.updatedByName,
      updatedByRole: args.updatedByRole,
      updateType: "recovery_plan_updated",
      notes: `Added milestone: ${args.description}`,
      milestoneId: newMilestoneId,
      milestoneDescription: args.description,
      createdAt: Date.now(),
    });

    return newMilestoneId;
  },
});

/**
 * Update a milestone (mark complete, add notes, change target date)
 */
export const updateMilestone = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    milestoneId: v.string(),
    completedDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    targetDate: v.optional(v.string()),
    updatedBy: v.string(),
    updatedByName: v.string(),
    updatedByRole: updaterRoleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db.get(args.injuryId);
    if (!existing) {
      throw new Error("Injury not found");
    }

    if (!existing.milestones) {
      throw new Error("No milestones exist for this injury");
    }

    const milestoneIndex = existing.milestones.findIndex(
      (m) => m.id === args.milestoneId
    );
    if (milestoneIndex === -1) {
      throw new Error("Milestone not found");
    }

    const milestone = existing.milestones[milestoneIndex];
    const wasCompleted = !!milestone.completedDate;
    const isNowCompleted = !!args.completedDate;

    const updatedMilestones = existing.milestones.map((m) => {
      if (m.id === args.milestoneId) {
        return {
          ...m,
          completedDate: args.completedDate ?? m.completedDate,
          completedBy: args.completedDate ? args.updatedBy : m.completedBy,
          notes: args.notes ?? m.notes,
          targetDate: args.targetDate ?? m.targetDate,
        };
      }
      return m;
    });

    await ctx.db.patch(args.injuryId, {
      milestones: updatedMilestones,
      updatedAt: Date.now(),
    });

    // Log progress update if milestone was just completed
    if (!wasCompleted && isNowCompleted) {
      await ctx.db.insert("injuryProgressUpdates", {
        injuryId: args.injuryId,
        updatedBy: args.updatedBy,
        updatedByName: args.updatedByName,
        updatedByRole: args.updatedByRole,
        updateType: "milestone_completed",
        notes: args.notes,
        milestoneId: args.milestoneId,
        milestoneDescription: milestone.description,
        createdAt: Date.now(),
      });

      // Send milestone completion notifications (Phase 2 - Issue #261)
      if (existing.occurredAtOrgId) {
        try {
          const player = await ctx.db.get(existing.playerIdentityId);
          if (player) {
            await notifyMilestoneCompleted(ctx, {
              injuryId: args.injuryId,
              playerIdentityId: existing.playerIdentityId,
              organizationId: existing.occurredAtOrgId,
              completedByUserId: args.updatedBy,
              completedByRole: args.updatedByRole,
              playerName: `${player.firstName} ${player.lastName}`,
              milestoneDescription: milestone.description,
            });
          }
        } catch (error) {
          console.error(
            "[updateMilestone] Failed to send notifications:",
            error
          );
        }
      }
    }

    return null;
  },
});

/**
 * Remove a milestone from recovery plan
 */
export const removeMilestone = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    milestoneId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db.get(args.injuryId);
    if (!existing) {
      throw new Error("Injury not found");
    }

    if (!existing.milestones) {
      throw new Error("No milestones exist for this injury");
    }

    const updatedMilestones = existing.milestones
      .filter((m) => m.id !== args.milestoneId)
      .map((m, index) => ({ ...m, order: index }));

    await ctx.db.patch(args.injuryId, {
      milestones: updatedMilestones,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Add a progress update note
 */
export const addProgressUpdate = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    notes: v.string(),
    updatedBy: v.string(),
    updatedByName: v.string(),
    updatedByRole: updaterRoleValidator,
  },
  returns: v.id("injuryProgressUpdates"),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db.get(args.injuryId);
    if (!existing) {
      throw new Error("Injury not found");
    }

    const updateId = await ctx.db.insert("injuryProgressUpdates", {
      injuryId: args.injuryId,
      updatedBy: args.updatedBy,
      updatedByName: args.updatedByName,
      updatedByRole: args.updatedByRole,
      updateType: "progress_note",
      notes: args.notes,
      createdAt: Date.now(),
    });

    // Update injury's updatedAt
    await ctx.db.patch(args.injuryId, {
      updatedAt: Date.now(),
    });

    return updateId;
  },
});

/**
 * Get progress updates for an injury
 */
export const getProgressUpdates = query({
  args: {
    injuryId: v.id("playerInjuries"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("injuryProgressUpdates"),
      _creationTime: v.number(),
      injuryId: v.id("playerInjuries"),
      updatedBy: v.string(),
      updatedByName: v.string(),
      updatedByRole: v.string(),
      updateType: v.string(),
      notes: v.optional(v.string()),
      previousStatus: v.optional(v.string()),
      newStatus: v.optional(v.string()),
      milestoneId: v.optional(v.string()),
      milestoneDescription: v.optional(v.string()),
      documentId: v.optional(v.id("injuryDocuments")),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const limit = args.limit ?? 50;

    const updates = await ctx.db
      .query("injuryProgressUpdates")
      .withIndex("by_injury_created", (q) => q.eq("injuryId", args.injuryId))
      .order("desc")
      .take(limit);

    return updates;
  },
});

/**
 * Record medical clearance received
 */
export const recordMedicalClearance = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    clearanceDate: v.string(),
    documentId: v.optional(v.id("injuryDocuments")),
    updatedBy: v.string(),
    updatedByName: v.string(),
    updatedByRole: updaterRoleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db.get(args.injuryId);
    if (!existing) {
      throw new Error("Injury not found");
    }

    await ctx.db.patch(args.injuryId, {
      medicalClearanceReceived: true,
      medicalClearanceDate: args.clearanceDate,
      updatedAt: Date.now(),
    });

    // Log progress update
    await ctx.db.insert("injuryProgressUpdates", {
      injuryId: args.injuryId,
      updatedBy: args.updatedBy,
      updatedByName: args.updatedByName,
      updatedByRole: args.updatedByRole,
      updateType: "clearance_received",
      notes: `Medical clearance received on ${args.clearanceDate}`,
      documentId: args.documentId,
      createdAt: Date.now(),
    });

    // Send medical clearance notifications (Phase 2 - Issue #261)
    if (existing.occurredAtOrgId) {
      try {
        const player = await ctx.db.get(existing.playerIdentityId);
        if (player) {
          await notifyMedicalClearance(ctx, {
            injuryId: args.injuryId,
            playerIdentityId: existing.playerIdentityId,
            organizationId: existing.occurredAtOrgId,
            submittedByUserId: args.updatedBy,
            playerName: `${player.firstName} ${player.lastName}`,
            bodyPart: existing.bodyPart,
          });
        }
      } catch (error) {
        console.error(
          "[recordMedicalClearance] Failed to send notifications:",
          error
        );
      }
    }

    return null;
  },
});
/**
 * Get team health summary for Health & Safety Widget
 * Returns active injuries (max 5), allergy count, medication count
 * Uses batch fetch pattern to avoid N+1 queries
 */
export const getTeamHealthSummary = query({
  args: {
    teamId: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
    activeInjuries: v.array(
      v.object({
        injuryId: v.id("playerInjuries"),
        playerId: v.id("playerIdentities"),
        playerName: v.string(),
        injuryType: v.string(),
        bodyPart: v.string(),
        severity: severityValidator,
        daysSinceInjury: v.number(),
        status: injuryStatusValidator,
        dateOccurred: v.string(),
      })
    ),
    totalActiveInjuries: v.number(),
    allergyAlertsCount: v.number(),
    medicationAlertsCount: v.number(),
  }),
  handler: async (ctx, args) => {
    // Step 1: Get all active players on the team
    const teamMembers = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    const activeMembers = teamMembers.filter((m) => m.status === "active");
    const playerIds = activeMembers.map((m) => m.playerIdentityId);

    if (playerIds.length === 0) {
      return {
        activeInjuries: [],
        totalActiveInjuries: 0,
        allergyAlertsCount: 0,
        medicationAlertsCount: 0,
      };
    }

    // Step 2: Batch fetch all player identities (avoid N+1)
    const uniquePlayerIds = [...new Set(playerIds)];
    const playerResults = await Promise.all(
      uniquePlayerIds.map((id) => ctx.db.get(id))
    );

    const playerMap = new Map();
    for (const player of playerResults) {
      if (player) {
        playerMap.set(player._id, player);
      }
    }

    // Step 3: Get all injuries for these players
    const allInjuries = [];
    for (const playerId of uniquePlayerIds) {
      const injuries = await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .collect();

      // Filter to active/recovering injuries visible to this org
      const activeInjuries = injuries.filter((injury) => {
        if (injury.status === "healed" || injury.status === "cleared") {
          return false;
        }
        if (injury.isVisibleToAllOrgs) {
          return true;
        }
        if (injury.restrictedToOrgIds?.includes(args.organizationId)) {
          return true;
        }
        if (injury.occurredAtOrgId === args.organizationId) {
          return true;
        }
        return false;
      });

      allInjuries.push(...activeInjuries);
    }

    // Step 4: Sort by severity (severe > moderate > minor) then by date (recent first)
    const severityOrder = { severe: 1, moderate: 2, minor: 3, long_term: 4 };
    allInjuries.sort((a, b) => {
      const severityDiff =
        severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      return (
        new Date(b.dateOccurred).getTime() - new Date(a.dateOccurred).getTime()
      );
    });

    // Step 5: Calculate days since injury and map to return format
    const now = Date.now();
    const injuryData = allInjuries.slice(0, 5).map((injury) => {
      const player = playerMap.get(injury.playerIdentityId);
      const playerName = player
        ? `${player.firstName} ${player.lastName}`
        : "Unknown Player";

      const dateOccurred = new Date(injury.dateOccurred);
      const daysSinceInjury = Math.floor(
        (now - dateOccurred.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        injuryId: injury._id,
        playerId: injury.playerIdentityId,
        playerName,
        injuryType: injury.injuryType,
        bodyPart: injury.bodyPart,
        severity: injury.severity,
        daysSinceInjury,
        status: injury.status,
        dateOccurred: injury.dateOccurred,
      };
    });

    // Step 6: Get medical alert counts
    // Medical profiles are linked via legacy players table, need to match by name
    let allergyCount = 0;
    let medicationCount = 0;

    for (const playerId of uniquePlayerIds) {
      const player = playerMap.get(playerId);
      if (!player) {
        continue;
      }

      const fullName = `${player.firstName} ${player.lastName}`;
      const legacyPlayer = await ctx.db
        .query("players")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .filter((q) => q.eq(q.field("name"), fullName))
        .first();

      if (legacyPlayer) {
        const medicalProfile = await ctx.db
          .query("medicalProfiles")
          .withIndex("by_playerId", (q) => q.eq("playerId", legacyPlayer._id))
          .first();

        if (medicalProfile) {
          if (medicalProfile.allergies && medicalProfile.allergies.length > 0) {
            allergyCount += 1;
          }
          if (
            medicalProfile.medications &&
            medicalProfile.medications.length > 0
          ) {
            medicationCount += 1;
          }
        }
      }
    }

    return {
      activeInjuries: injuryData,
      totalActiveInjuries: allInjuries.length,
      allergyAlertsCount: allergyCount,
      medicationAlertsCount: medicationCount,
    };
  },
});
