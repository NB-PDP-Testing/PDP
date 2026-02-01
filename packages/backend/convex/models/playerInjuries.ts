import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import * as injuryNotifications from "../lib/injuryNotifications";

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
  handler: async (ctx, args) => await ctx.db.get(args.injuryId),
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
    // Get all enrolled players in this org
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activeEnrollments = enrollments.filter((e) => e.status === "active");
    const results = [];

    for (const enrollment of activeEnrollments) {
      const injuries = await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", enrollment.playerIdentityId)
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

      if (activeInjuries.length > 0) {
        const player = await ctx.db.get(enrollment.playerIdentityId);
        for (const injury of activeInjuries) {
          results.push({
            ...injury,
            player: player
              ? {
                  _id: player._id,
                  firstName: player.firstName,
                  lastName: player.lastName,
                }
              : null,
          });
        }
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
    // Get all enrolled players in this org
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activeEnrollments = enrollments.filter((e) => e.status === "active");
    const results = [];

    for (const enrollment of activeEnrollments) {
      const injuries = await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", enrollment.playerIdentityId)
        )
        .collect();

      // Filter by status if provided, otherwise return all visible to this org
      const filteredInjuries = injuries.filter((injury) => {
        // Status filter
        if (args.status && injury.status !== args.status) {
          return false;
        }

        // Visibility filter
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

      if (filteredInjuries.length > 0) {
        const player = await ctx.db.get(enrollment.playerIdentityId);
        for (const injury of filteredInjuries) {
          results.push({
            ...injury,
            player: player
              ? {
                  _id: player._id,
                  firstName: player.firstName,
                  lastName: player.lastName,
                }
              : null,
            ageGroup: enrollment.ageGroup,
          });
        }
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
        await injuryNotifications.notifyInjuryReported(ctx, {
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
          await injuryNotifications.notifyStatusChanged(ctx, {
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

        await injuryNotifications.notifyStatusChanged(ctx, {
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
    const existing = await ctx.db.get(args.injuryId);
    if (!existing) {
      throw new Error("Injury not found");
    }

    await ctx.db.delete(args.injuryId);
    return null;
  },
});
