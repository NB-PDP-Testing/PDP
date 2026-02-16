/**
 * Voice Pipeline Alerts - Automated Health Monitoring (M4)
 *
 * Detects pipeline anomalies and creates alerts for platform staff.
 * Runs every 5 minutes via cron to check for:
 * - High failure rates (> 10%)
 * - Latency spikes (> 2x average)
 * - Queue depth issues (> 50 active artifacts)
 * - Disambiguation backlog (> 100 pending)
 * - Circuit breaker state (open/half-open)
 * - Pipeline inactivity (no artifacts in 60+ minutes)
 */

import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import {
  internalMutation,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "../_generated/server";
import { authComponent } from "../auth";

// ============================================================
// PLATFORM STAFF AUTHORIZATION (M3 Pattern)
// ============================================================

/**
 * Verify platform staff authorization for alert operations.
 * All alert queries and mutations MUST call this first.
 */
async function verifyPlatformStaff(ctx: MutationCtx | QueryCtx): Promise<void> {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }

  const dbUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", value: user._id }],
  });

  if (!dbUser?.isPlatformStaff) {
    throw new Error("Not authorized: platform staff only");
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Safe division to prevent NaN/Infinity (M2 Pattern)
 */
function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Check if unacknowledged alert of same type exists (deduplication)
 */
async function hasUnacknowledgedAlert(
  ctx: MutationCtx,
  alertType: string
): Promise<boolean> {
  const existingAlerts = await ctx.db
    .query("platformCostAlerts")
    .withIndex("by_acknowledged", (q) => q.eq("acknowledged", false))
    .collect();

  return existingAlerts.some((alert) => alert.alertType === alertType);
}

// ============================================================
// HEALTH CHECK (Internal Mutation - Called by Cron)
// ============================================================

/**
 * Check pipeline health and create alerts for detected anomalies.
 * Called every 5 minutes by cron job.
 *
 * Performs 6 health checks:
 * 1. Failure Rate: failures / (completed + failures) > 0.10
 * 2. Latency Spike: current latency > 2x 7-day average
 * 3. Queue Depth: active artifacts > 50
 * 4. Disambiguation Backlog: needs_disambiguation > 100
 * 5. Circuit Breaker: state='open' or 'half_open'
 * 6. Pipeline Inactivity: no artifacts received in 60+ minutes
 *
 * Deduplicates alerts: only creates new alert if previous alert of same type was acknowledged.
 */
export const checkPipelineHealth = internalMutation({
  args: {},
  returns: v.object({
    alertsCreated: v.number(),
    checksPerformed: v.array(v.string()),
  }),
  handler: async (ctx, _args) => {
    const checksPerformed: string[] = [];
    let alertsCreated = 0;

    try {
      // ============================================================
      // DATA COLLECTION
      // ============================================================

      // Query real-time metrics from voicePipelineCounters
      const completedCounter = await ctx.db
        .query("voicePipelineCounters")
        .withIndex("by_counterType_and_org", (q) =>
          q
            .eq("counterType", "artifacts_completed_1h")
            .eq("organizationId", undefined)
        )
        .first();

      const failedCounter = await ctx.db
        .query("voicePipelineCounters")
        .withIndex("by_counterType_and_org", (q) =>
          q
            .eq("counterType", "artifacts_failed_1h")
            .eq("organizationId", undefined)
        )
        .first();

      const totalCompleted = completedCounter?.currentValue ?? 0;
      const totalFailures = failedCounter?.currentValue ?? 0;

      // For latency, query most recent hourly snapshot
      const recentSnapshot = await ctx.db
        .query("voicePipelineMetricsSnapshots")
        .withIndex("by_periodType_and_start", (q) =>
          q.eq("periodType", "hourly")
        )
        .order("desc")
        .first();

      const currentLatency = recentSnapshot?.avgEndToEndLatency ?? 0;

      // Query historical snapshots for latency baseline (last 168 hourly snapshots = 7 days)
      const hourlySnapshots = await ctx.db
        .query("voicePipelineMetricsSnapshots")
        .withIndex("by_periodType_and_start", (q) =>
          q.eq("periodType", "hourly")
        )
        .order("desc")
        .collect();

      // Take last 168 snapshots
      const last168Snapshots = hourlySnapshots.slice(0, 168);

      // Calculate historical average latency
      let historicalLatencySum = 0;
      let historicalLatencyCount = 0;

      for (const snapshot of last168Snapshots) {
        if (snapshot.avgEndToEndLatency && snapshot.avgEndToEndLatency > 0) {
          historicalLatencySum += snapshot.avgEndToEndLatency;
          historicalLatencyCount += 1;
        }
      }

      const historicalAvgLatency =
        historicalLatencyCount > 0
          ? historicalLatencySum / historicalLatencyCount
          : 0;

      // Query active artifacts for queue depth
      const activeStatuses = [
        "received",
        "transcribing",
        "transcribed",
        "processing",
      ] as const;
      let queueDepth = 0;

      for (const status of activeStatuses) {
        const artifacts = await ctx.db
          .query("voiceNoteArtifacts")
          .withIndex("by_status_and_createdAt", (q) => q.eq("status", status))
          .collect();
        queueDepth += artifacts.length;
      }

      // Query disambiguation backlog
      const disambiguationResolutions = await ctx.db
        .query("voiceNoteEntityResolutions")
        .withIndex("by_status", (q) => q.eq("status", "needs_disambiguation"))
        .collect();

      const disambiguationBacklog = disambiguationResolutions.length;

      // Query circuit breaker state
      const aiServiceHealth = await ctx.db.query("aiServiceHealth").first();

      const circuitBreakerState =
        aiServiceHealth?.circuitBreakerState ?? "closed";

      // Query last artifact_received event timestamp
      const lastArtifactEvent = await ctx.db
        .query("voicePipelineEvents")
        .withIndex("by_eventType_and_timestamp", (q) =>
          q.eq("eventType", "artifact_received")
        )
        .order("desc")
        .first();

      const lastArtifactTimestamp = lastArtifactEvent?.timestamp ?? 0;
      const minutesSinceLastArtifact =
        (Date.now() - lastArtifactTimestamp) / (1000 * 60);

      // ============================================================
      // HEALTH CHECK 1: Failure Rate
      // ============================================================
      checksPerformed.push("failure_rate");

      const totalProcessed = totalCompleted + totalFailures;
      const failureRate = safeDivide(totalFailures, totalProcessed);

      if (failureRate > 0.1) {
        const hasDuplicate = await hasUnacknowledgedAlert(
          ctx,
          "PIPELINE_HIGH_FAILURE_RATE"
        );

        if (!hasDuplicate) {
          await ctx.db.insert("platformCostAlerts", {
            alertType: "PIPELINE_HIGH_FAILURE_RATE",
            severity: "high",
            message: `Pipeline failure rate is ${(failureRate * 100).toFixed(1)}% (threshold: 10%)`,
            metadata: {
              failureRate,
              threshold: 0.1,
              totalCompleted,
              totalFailures,
            },
            createdAt: Date.now(),
            acknowledged: false,
            organizationId: undefined,
          });
          alertsCreated += 1;
        }
      }

      // ============================================================
      // HEALTH CHECK 2: Latency Spike
      // ============================================================
      checksPerformed.push("latency");

      if (
        historicalAvgLatency > 0 &&
        currentLatency > historicalAvgLatency * 2
      ) {
        const hasDuplicate = await hasUnacknowledgedAlert(
          ctx,
          "PIPELINE_HIGH_LATENCY"
        );

        if (!hasDuplicate) {
          await ctx.db.insert("platformCostAlerts", {
            alertType: "PIPELINE_HIGH_LATENCY",
            severity: "medium",
            message: `End-to-end latency is ${currentLatency.toFixed(0)}ms (2x normal: ${historicalAvgLatency.toFixed(0)}ms)`,
            metadata: {
              currentLatency,
              historicalAvgLatency,
              threshold: 2.0,
            },
            createdAt: Date.now(),
            acknowledged: false,
            organizationId: undefined,
          });
          alertsCreated += 1;
        }
      }

      // ============================================================
      // HEALTH CHECK 3: Queue Depth
      // ============================================================
      checksPerformed.push("queue_depth");

      if (queueDepth > 50) {
        const hasDuplicate = await hasUnacknowledgedAlert(
          ctx,
          "PIPELINE_HIGH_QUEUE_DEPTH"
        );

        if (!hasDuplicate) {
          await ctx.db.insert("platformCostAlerts", {
            alertType: "PIPELINE_HIGH_QUEUE_DEPTH",
            severity: "medium",
            message: `${queueDepth} artifacts queued (threshold: 50)`,
            metadata: {
              queueDepth,
              threshold: 50,
            },
            createdAt: Date.now(),
            acknowledged: false,
            organizationId: undefined,
          });
          alertsCreated += 1;
        }
      }

      // ============================================================
      // HEALTH CHECK 4: Disambiguation Backlog
      // ============================================================
      checksPerformed.push("disambiguation_backlog");

      if (disambiguationBacklog > 100) {
        const hasDuplicate = await hasUnacknowledgedAlert(
          ctx,
          "PIPELINE_DISAMBIGUATION_BACKLOG"
        );

        if (!hasDuplicate) {
          await ctx.db.insert("platformCostAlerts", {
            alertType: "PIPELINE_DISAMBIGUATION_BACKLOG",
            severity: "low",
            message: `${disambiguationBacklog} entities awaiting manual review (threshold: 100)`,
            metadata: {
              backlogCount: disambiguationBacklog,
              threshold: 100,
            },
            createdAt: Date.now(),
            acknowledged: false,
            organizationId: undefined,
          });
          alertsCreated += 1;
        }
      }

      // ============================================================
      // HEALTH CHECK 5: Circuit Breaker
      // ============================================================
      checksPerformed.push("circuit_breaker");

      if (
        circuitBreakerState === "open" ||
        circuitBreakerState === "half_open"
      ) {
        const hasDuplicate = await hasUnacknowledgedAlert(
          ctx,
          "PIPELINE_CIRCUIT_BREAKER_OPEN"
        );

        if (!hasDuplicate) {
          await ctx.db.insert("platformCostAlerts", {
            alertType: "PIPELINE_CIRCUIT_BREAKER_OPEN",
            severity: "critical",
            message: "AI service circuit breaker is open - pipeline degraded",
            metadata: {
              state: circuitBreakerState,
              recentFailureCount: aiServiceHealth?.recentFailureCount ?? 0,
            },
            createdAt: Date.now(),
            acknowledged: false,
            organizationId: undefined,
          });
          alertsCreated += 1;
        }
      }

      // ============================================================
      // HEALTH CHECK 6: Pipeline Inactivity
      // ============================================================
      checksPerformed.push("inactivity");

      if (minutesSinceLastArtifact > 60) {
        const hasDuplicate = await hasUnacknowledgedAlert(
          ctx,
          "PIPELINE_INACTIVITY"
        );

        if (!hasDuplicate) {
          await ctx.db.insert("platformCostAlerts", {
            alertType: "PIPELINE_INACTIVITY",
            severity: "low",
            message: `No voice notes received in ${Math.floor(minutesSinceLastArtifact)} minutes (threshold: 60)`,
            metadata: {
              minutesSinceLastArtifact: Math.floor(minutesSinceLastArtifact),
              threshold: 60,
            },
            createdAt: Date.now(),
            acknowledged: false,
            organizationId: undefined,
          });
          alertsCreated += 1;
        }
      }

      return {
        alertsCreated,
        checksPerformed,
      };
    } catch (error) {
      console.error("Health check error:", error);
      // Don't throw - return successfully to prevent cron retries
      return {
        alertsCreated: 0,
        checksPerformed: ["error_occurred"],
      };
    }
  },
});

// ============================================================
// ALERT QUERIES & MUTATIONS (Platform Staff Only)
// ============================================================

/**
 * Get all active (unacknowledged) pipeline alerts.
 * Returns alerts ordered by severity (critical > high > medium > low),
 * then by creation time (newest first).
 *
 * Platform staff only.
 */
export const getActiveAlerts = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("platformCostAlerts"),
      alertType: v.string(),
      severity: v.string(),
      message: v.string(),
      metadata: v.optional(v.any()),
      createdAt: v.optional(v.number()),
      acknowledged: v.boolean(),
    })
  ),
  handler: async (ctx, _args) => {
    await verifyPlatformStaff(ctx);

    // Query unacknowledged alerts
    const alerts = await ctx.db
      .query("platformCostAlerts")
      .withIndex("by_acknowledged", (q) => q.eq("acknowledged", false))
      .collect();

    // Filter for PIPELINE_* alerts only
    const pipelineAlerts = alerts.filter((alert) =>
      alert.alertType.startsWith("PIPELINE_")
    );

    // Sort by severity, then by createdAt
    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    pipelineAlerts.sort((a, b) => {
      const severityDiff =
        severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }

      // Sort by createdAt desc (newest first)
      const aCreatedAt = a.createdAt ?? a.timestamp ?? 0;
      const bCreatedAt = b.createdAt ?? b.timestamp ?? 0;
      return bCreatedAt - aCreatedAt;
    });

    return pipelineAlerts.map((alert) => ({
      _id: alert._id,
      alertType: alert.alertType,
      severity: alert.severity,
      message: alert.message,
      metadata: alert.metadata,
      createdAt: alert.createdAt ?? alert.timestamp,
      acknowledged: alert.acknowledged,
    }));
  },
});

/**
 * Acknowledge a pipeline alert (mark as reviewed by platform staff).
 * Updates alert: acknowledged=true, acknowledgedAt=now, acknowledgedBy=user.
 *
 * Platform staff only.
 */
export const acknowledgeAlert = mutation({
  args: {
    alertId: v.id("platformCostAlerts"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await verifyPlatformStaff(ctx);

    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const alert = await ctx.db.get(args.alertId);
    if (!alert) {
      return { success: false };
    }

    await ctx.db.patch(args.alertId, {
      acknowledged: true,
      acknowledgedAt: Date.now(),
      acknowledgedBy: user._id,
    });

    return { success: true };
  },
});

/**
 * Get alert history with optional filters and pagination.
 * Returns all PIPELINE_* alerts (acknowledged and unacknowledged).
 *
 * Platform staff only.
 */
export const getAlertHistory = query({
  args: {
    filters: v.optional(
      v.object({
        severity: v.optional(v.string()),
        alertType: v.optional(v.string()),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
      })
    ),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("platformCostAlerts"),
        alertType: v.string(),
        severity: v.string(),
        message: v.string(),
        metadata: v.optional(v.any()),
        createdAt: v.optional(v.number()),
        acknowledged: v.boolean(),
        acknowledgedAt: v.optional(v.number()),
        acknowledgedBy: v.optional(v.string()),
      })
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    await verifyPlatformStaff(ctx);

    // Query all alerts, then filter in memory (pagination doesn't support complex filters)
    const allAlerts = await ctx.db
      .query("platformCostAlerts")
      .order("desc")
      .collect();

    // Filter for PIPELINE_* alerts
    let filteredAlerts = allAlerts.filter((alert) =>
      alert.alertType.startsWith("PIPELINE_")
    );

    // Apply optional filters
    if (args.filters) {
      const filters = args.filters;

      if (filters.severity) {
        filteredAlerts = filteredAlerts.filter(
          (alert) => alert.severity === filters.severity
        );
      }

      if (filters.alertType) {
        filteredAlerts = filteredAlerts.filter(
          (alert) => alert.alertType === filters.alertType
        );
      }

      if (filters.startDate) {
        const startDate = filters.startDate;
        filteredAlerts = filteredAlerts.filter((alert) => {
          const createdAt = alert.createdAt ?? alert.timestamp ?? 0;
          return createdAt >= startDate;
        });
      }

      if (filters.endDate) {
        const endDate = filters.endDate;
        filteredAlerts = filteredAlerts.filter((alert) => {
          const createdAt = alert.createdAt ?? alert.timestamp ?? 0;
          return createdAt <= endDate;
        });
      }
    }

    // Manual pagination (since we filtered in memory)
    const { numItems, cursor } = args.paginationOpts;
    const startIndex = cursor ? Number.parseInt(cursor, 10) : 0;
    const endIndex = startIndex + numItems;

    const page = filteredAlerts.slice(startIndex, endIndex);
    const isDone = endIndex >= filteredAlerts.length;
    const continueCursor = isDone ? "" : endIndex.toString();

    return {
      page: page.map((alert) => ({
        _id: alert._id,
        alertType: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        metadata: alert.metadata,
        createdAt: alert.createdAt ?? alert.timestamp,
        acknowledged: alert.acknowledged,
        acknowledgedAt: alert.acknowledgedAt,
        acknowledgedBy: alert.acknowledgedBy,
      })),
      isDone,
      continueCursor,
    };
  },
});
