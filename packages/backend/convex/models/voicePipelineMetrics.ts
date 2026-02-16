/**
 * Voice Pipeline Metrics - Aggregation & Analytics
 *
 * Metrics aggregation system for voice pipeline monitoring.
 * Provides real-time metrics (from counters), historical metrics (from snapshots),
 * and automated aggregation functions called by cron jobs.
 *
 * Key patterns:
 * - Real-time metrics: O(1) counter reads, NEVER scan events
 * - Historical metrics: Query pre-computed snapshots, bounded by time range
 * - Aggregation: Hourly from events, daily from hourly snapshots
 * - UTC time handling: Always use getUTCHours(), getUTCMonth(), getUTCDate()
 * - Safe division: Check denominator > 0 to prevent NaN/Infinity
 * - N+1 prevention: Batch fetch org names using Map pattern
 */

import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalMutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Safe division to prevent NaN/Infinity
 */
function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Calculate P95 latency from array of durations
 */
function calculateP95(durations: number[]): number {
  if (durations.length === 0) {
    return 0;
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.95);

  return sorted[index] ?? 0;
}

/**
 * Compute time window string from timestamp (UTC)
 * Format: 'YYYY-MM-DD-HH'
 */
function computeTimeWindow(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");

  return `${year}-${month}-${day}-${hour}`;
}

// ============================================================
// REAL-TIME METRICS (O(1) COUNTER READS)
// ============================================================

/**
 * Get real-time metrics from counters (last 1 hour)
 * CRITICAL: Never scans events - only reads counter documents
 * Target latency: < 50ms
 */
export const getRealTimeMetrics = query({
  args: {
    organizationId: v.optional(v.string()),
  },
  returns: v.object({
    artifactsReceived1h: v.number(),
    artifactsCompleted1h: v.number(),
    artifactsFailed1h: v.number(),
    transcriptionsCompleted1h: v.number(),
    claimsExtracted1h: v.number(),
    entitiesResolved1h: v.number(),
    draftsGenerated1h: v.number(),
    failures1h: v.number(),
    windowStart: v.number(),
    windowEnd: v.number(),
  }),
  handler: async (ctx, args) => {
    // Verify platform staff authorization
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

    // Read counters (O(1) per counter type, ~8 queries total)
    const orgId = args.organizationId ?? undefined;

    const artifactsReceived = await ctx.db
      .query("voicePipelineCounters")
      .withIndex("by_counterType_and_org", (q) =>
        q.eq("counterType", "artifacts_received_1h").eq("organizationId", orgId)
      )
      .first();

    const artifactsCompleted = await ctx.db
      .query("voicePipelineCounters")
      .withIndex("by_counterType_and_org", (q) =>
        q
          .eq("counterType", "artifacts_completed_1h")
          .eq("organizationId", orgId)
      )
      .first();

    const artifactsFailed = await ctx.db
      .query("voicePipelineCounters")
      .withIndex("by_counterType_and_org", (q) =>
        q.eq("counterType", "artifacts_failed_1h").eq("organizationId", orgId)
      )
      .first();

    const transcriptionsCompleted = await ctx.db
      .query("voicePipelineCounters")
      .withIndex("by_counterType_and_org", (q) =>
        q
          .eq("counterType", "transcriptions_completed_1h")
          .eq("organizationId", orgId)
      )
      .first();

    const claimsExtracted = await ctx.db
      .query("voicePipelineCounters")
      .withIndex("by_counterType_and_org", (q) =>
        q.eq("counterType", "claims_extracted_1h").eq("organizationId", orgId)
      )
      .first();

    const entitiesResolved = await ctx.db
      .query("voicePipelineCounters")
      .withIndex("by_counterType_and_org", (q) =>
        q.eq("counterType", "entities_resolved_1h").eq("organizationId", orgId)
      )
      .first();

    const draftsGenerated = await ctx.db
      .query("voicePipelineCounters")
      .withIndex("by_counterType_and_org", (q) =>
        q.eq("counterType", "drafts_generated_1h").eq("organizationId", orgId)
      )
      .first();

    const failures = await ctx.db
      .query("voicePipelineCounters")
      .withIndex("by_counterType_and_org", (q) =>
        q.eq("counterType", "failures_1h").eq("organizationId", orgId)
      )
      .first();

    // Return counter values with window bounds
    return {
      artifactsReceived1h: artifactsReceived?.currentValue ?? 0,
      artifactsCompleted1h: artifactsCompleted?.currentValue ?? 0,
      artifactsFailed1h: artifactsFailed?.currentValue ?? 0,
      transcriptionsCompleted1h: transcriptionsCompleted?.currentValue ?? 0,
      claimsExtracted1h: claimsExtracted?.currentValue ?? 0,
      entitiesResolved1h: entitiesResolved?.currentValue ?? 0,
      draftsGenerated1h: draftsGenerated?.currentValue ?? 0,
      failures1h: failures?.currentValue ?? 0,
      windowStart: artifactsReceived?.windowStart ?? Date.now() - 3_600_000,
      windowEnd: artifactsReceived?.windowEnd ?? Date.now(),
    };
  },
});

// ============================================================
// HISTORICAL METRICS (SNAPSHOT QUERIES)
// ============================================================

/**
 * Get historical metrics from snapshots (bounded by time range)
 * Returns hourly or daily snapshots for specified period
 */
export const getHistoricalMetrics = query({
  args: {
    periodType: v.union(v.literal("hourly"), v.literal("daily")),
    startTime: v.number(),
    endTime: v.number(),
    organizationId: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("voicePipelineMetricsSnapshots"),
      periodStart: v.number(),
      periodEnd: v.number(),
      periodType: v.union(v.literal("hourly"), v.literal("daily")),
      organizationId: v.optional(v.string()),
      artifactsReceived: v.number(),
      artifactsCompleted: v.number(),
      artifactsFailed: v.number(),
      avgTranscriptionLatency: v.number(),
      avgClaimsExtractionLatency: v.number(),
      avgEntityResolutionLatency: v.number(),
      avgDraftGenerationLatency: v.number(),
      avgEndToEndLatency: v.number(),
      p95EndToEndLatency: v.number(),
      avgTranscriptConfidence: v.number(),
      avgClaimConfidence: v.number(),
      autoResolutionRate: v.number(),
      disambiguationRate: v.number(),
      transcriptionFailureRate: v.number(),
      claimsExtractionFailureRate: v.number(),
      entityResolutionFailureRate: v.number(),
      overallFailureRate: v.number(),
      totalClaimsExtracted: v.number(),
      totalEntitiesResolved: v.number(),
      totalDraftsGenerated: v.number(),
      totalAICost: v.number(),
      avgCostPerArtifact: v.number(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Verify platform staff authorization
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

    // Query snapshots by time range
    const snapshots = args.organizationId
      ? await ctx.db
          .query("voicePipelineMetricsSnapshots")
          .withIndex("by_org_periodType_start", (q) =>
            q
              .eq("organizationId", args.organizationId)
              .eq("periodType", args.periodType)
              .gte("periodStart", args.startTime)
              .lte("periodStart", args.endTime)
          )
          .order("asc")
          .collect()
      : await ctx.db
          .query("voicePipelineMetricsSnapshots")
          .withIndex("by_periodType_and_start", (q) =>
            q
              .eq("periodType", args.periodType)
              .gte("periodStart", args.startTime)
              .lte("periodStart", args.endTime)
          )
          .order("asc")
          .collect();

    return snapshots;
  },
});

/**
 * Get per-stage breakdown (latency, failure rates)
 * Returns aggregated metrics for each pipeline stage
 */
export const getStageBreakdown = query({
  args: {
    periodType: v.union(v.literal("hourly"), v.literal("daily")),
    startTime: v.number(),
    endTime: v.number(),
  },
  returns: v.object({
    stages: v.array(
      v.object({
        stage: v.string(),
        avgLatency: v.number(),
        failureRate: v.number(),
        count: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Verify platform staff authorization
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

    // Query snapshots for time range (platform-wide)
    const snapshots = await ctx.db
      .query("voicePipelineMetricsSnapshots")
      .withIndex("by_periodType_and_start", (q) =>
        q
          .eq("periodType", args.periodType)
          .gte("periodStart", args.startTime)
          .lte("periodStart", args.endTime)
      )
      .collect();

    if (snapshots.length === 0) {
      return { stages: [] };
    }

    // Extract per-stage metrics from snapshots
    const totalArtifacts = snapshots.reduce(
      (sum, s) => sum + s.artifactsReceived,
      0
    );

    const stages = [
      {
        stage: "Transcription",
        avgLatency: weightedAverage(
          snapshots,
          (s) => s.avgTranscriptionLatency,
          (s) => s.artifactsCompleted
        ),
        failureRate: weightedAverage(
          snapshots,
          (s) => s.transcriptionFailureRate,
          (s) => s.artifactsReceived
        ),
        count: totalArtifacts,
      },
      {
        stage: "Claims Extraction",
        avgLatency: weightedAverage(
          snapshots,
          (s) => s.avgClaimsExtractionLatency,
          (s) => s.artifactsCompleted
        ),
        failureRate: weightedAverage(
          snapshots,
          (s) => s.claimsExtractionFailureRate,
          (s) => s.artifactsReceived
        ),
        count: totalArtifacts,
      },
      {
        stage: "Entity Resolution",
        avgLatency: weightedAverage(
          snapshots,
          (s) => s.avgEntityResolutionLatency,
          (s) => s.artifactsCompleted
        ),
        failureRate: weightedAverage(
          snapshots,
          (s) => s.entityResolutionFailureRate,
          (s) => s.artifactsReceived
        ),
        count: totalArtifacts,
      },
      {
        stage: "Draft Generation",
        avgLatency: weightedAverage(
          snapshots,
          (s) => s.avgDraftGenerationLatency,
          (s) => s.artifactsCompleted
        ),
        failureRate: 0, // No dedicated failure event for drafts
        count: totalArtifacts,
      },
    ];

    return { stages };
  },
});

/**
 * Get per-organization breakdown
 * CRITICAL: Uses batch fetch + Map pattern to avoid N+1 queries
 */
export const getOrgBreakdown = query({
  args: {
    periodType: v.union(v.literal("hourly"), v.literal("daily")),
    startTime: v.number(),
    endTime: v.number(),
  },
  returns: v.array(
    v.object({
      organizationId: v.string(),
      orgName: v.string(),
      artifactsReceived: v.number(),
      artifactsCompleted: v.number(),
      artifactsFailed: v.number(),
      totalAICost: v.number(),
      avgLatency: v.number(),
      failureRate: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Verify platform staff authorization
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

    // Query all org-specific snapshots for time range
    const snapshots = await ctx.db
      .query("voicePipelineMetricsSnapshots")
      .withIndex("by_periodType_and_start", (q) =>
        q
          .eq("periodType", args.periodType)
          .gte("periodStart", args.startTime)
          .lte("periodStart", args.endTime)
      )
      .collect();

    // Filter to only org-specific snapshots (exclude platform-wide)
    const orgSnapshots = snapshots.filter((s) => s.organizationId != null);

    if (orgSnapshots.length === 0) {
      return [];
    }

    // Group snapshots by organizationId
    const orgMap = new Map<
      string,
      {
        artifactsReceived: number;
        artifactsCompleted: number;
        artifactsFailed: number;
        totalAICost: number;
        totalLatency: number;
        latencyCount: number;
      }
    >();

    for (const snapshot of orgSnapshots) {
      const orgId = snapshot.organizationId;
      if (!orgId) {
        continue;
      }
      const existing = orgMap.get(orgId);

      if (existing) {
        existing.artifactsReceived += snapshot.artifactsReceived;
        existing.artifactsCompleted += snapshot.artifactsCompleted;
        existing.artifactsFailed += snapshot.artifactsFailed;
        existing.totalAICost += snapshot.totalAICost;
        existing.totalLatency +=
          snapshot.avgEndToEndLatency * snapshot.artifactsCompleted;
        existing.latencyCount += snapshot.artifactsCompleted;
      } else {
        orgMap.set(orgId, {
          artifactsReceived: snapshot.artifactsReceived,
          artifactsCompleted: snapshot.artifactsCompleted,
          artifactsFailed: snapshot.artifactsFailed,
          totalAICost: snapshot.totalAICost,
          totalLatency:
            snapshot.avgEndToEndLatency * snapshot.artifactsCompleted,
          latencyCount: snapshot.artifactsCompleted,
        });
      }
    }

    // Batch fetch organization names (N+1 prevention)
    const uniqueOrgIds = Array.from(orgMap.keys());

    const orgs = await Promise.all(
      uniqueOrgIds.map((id) =>
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "organization",
          where: [{ field: "_id", value: id }],
        })
      )
    );

    // Create org name lookup map
    const orgNameMap = new Map<string, string>();
    for (const org of orgs) {
      if (org) {
        orgNameMap.set(org._id, org.name);
      }
    }

    // Build breakdown array
    const breakdown = Array.from(orgMap.entries()).map(([orgId, metrics]) => ({
      organizationId: orgId,
      orgName: orgNameMap.get(orgId) || "Unknown",
      artifactsReceived: metrics.artifactsReceived,
      artifactsCompleted: metrics.artifactsCompleted,
      artifactsFailed: metrics.artifactsFailed,
      totalAICost: metrics.totalAICost,
      avgLatency: safeDivide(metrics.totalLatency, metrics.latencyCount),
      failureRate: safeDivide(
        metrics.artifactsFailed,
        metrics.artifactsReceived
      ),
    }));

    // Sort by volume descending
    breakdown.sort((a, b) => b.artifactsReceived - a.artifactsReceived);

    return breakdown;
  },
});

// ============================================================
// AGGREGATION FUNCTIONS (INTERNAL MUTATIONS FOR CRONS)
// ============================================================

/**
 * Aggregate hourly metrics from events
 * Creates platform-wide and per-org snapshots
 * Target: < 30s for 1000 events
 */
export const aggregateHourlyMetrics = internalMutation({
  args: {
    hourTimestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const hourStart = args.hourTimestamp;
      const hourEnd = hourStart + 3_600_000; // 1 hour
      const timeWindow = computeTimeWindow(hourStart);

      // Query all events for this hour using timeWindow index (efficient)
      const events = await ctx.db
        .query("voicePipelineEvents")
        .withIndex("by_timeWindow", (q) => q.eq("timeWindow", timeWindow))
        .collect();

      if (events.length === 0) {
        // No events for this hour - skip aggregation
        return null;
      }

      // Aggregate metrics from events
      const metrics = {
        artifactsReceived: events.filter(
          (e) => e.eventType === "artifact_received"
        ).length,
        artifactsCompleted: events.filter(
          (e) => e.eventType === "artifact_completed"
        ).length,
        artifactsFailed: events.filter((e) => e.eventType === "artifact_failed")
          .length,

        // Latency calculations
        transcriptionLatencies: events
          .filter(
            (e) =>
              e.eventType === "transcription_completed" && e.durationMs != null
          )
          .map((e) => e.durationMs ?? 0),

        claimsExtractionLatencies: events
          .filter(
            (e) => e.eventType === "claims_extracted" && e.durationMs != null
          )
          .map((e) => e.durationMs ?? 0),

        entityResolutionLatencies: events
          .filter(
            (e) =>
              e.eventType === "entity_resolution_completed" &&
              e.durationMs != null
          )
          .map((e) => e.durationMs ?? 0),

        draftGenerationLatencies: events
          .filter(
            (e) => e.eventType === "drafts_generated" && e.durationMs != null
          )
          .map((e) => e.durationMs ?? 0),

        // Quality metrics
        transcriptConfidenceScores: events
          .filter(
            (e) =>
              e.eventType === "transcription_completed" &&
              e.metadata?.confidenceScore != null
          )
          .map((e) => e.metadata?.confidenceScore ?? 0),

        claimConfidenceScores: events
          .filter(
            (e) =>
              e.eventType === "claims_extracted" &&
              e.metadata?.confidenceScore != null
          )
          .map((e) => e.metadata?.confidenceScore ?? 0),

        // Entity resolution
        entityResolutionCompleted: events.filter(
          (e) => e.eventType === "entity_resolution_completed"
        ).length,
        needsDisambiguation: events.filter(
          (e) => e.eventType === "entity_needs_disambiguation"
        ).length,

        // Failures
        transcriptionFailed: events.filter(
          (e) => e.eventType === "transcription_failed"
        ).length,
        claimsExtractionFailed: events.filter(
          (e) => e.eventType === "claims_extraction_failed"
        ).length,
        entityResolutionFailed: events.filter(
          (e) => e.eventType === "entity_resolution_failed"
        ).length,

        // Volume
        totalClaimsExtracted: events
          .filter((e) => e.eventType === "claims_extracted")
          .reduce((sum, e) => sum + (e.metadata?.claimCount ?? 0), 0),

        totalEntitiesResolved: events
          .filter((e) => e.eventType === "entity_resolution_completed")
          .reduce((sum, e) => sum + (e.metadata?.entityCount ?? 0), 0),

        totalDraftsGenerated: events
          .filter((e) => e.eventType === "drafts_generated")
          .reduce((sum, e) => sum + (e.metadata?.draftCount ?? 0), 0),

        // Cost
        totalAICost: events.reduce(
          (sum, e) => sum + (e.metadata?.aiCost ?? 0),
          0
        ),
      };

      // Compute derived metrics
      const avgTranscriptionLatency =
        metrics.transcriptionLatencies.length > 0
          ? metrics.transcriptionLatencies.reduce((a, b) => a + b, 0) /
            metrics.transcriptionLatencies.length
          : 0;

      const avgClaimsExtractionLatency =
        metrics.claimsExtractionLatencies.length > 0
          ? metrics.claimsExtractionLatencies.reduce((a, b) => a + b, 0) /
            metrics.claimsExtractionLatencies.length
          : 0;

      const avgEntityResolutionLatency =
        metrics.entityResolutionLatencies.length > 0
          ? metrics.entityResolutionLatencies.reduce((a, b) => a + b, 0) /
            metrics.entityResolutionLatencies.length
          : 0;

      const avgDraftGenerationLatency =
        metrics.draftGenerationLatencies.length > 0
          ? metrics.draftGenerationLatencies.reduce((a, b) => a + b, 0) /
            metrics.draftGenerationLatencies.length
          : 0;

      const avgEndToEndLatency =
        avgTranscriptionLatency +
        avgClaimsExtractionLatency +
        avgEntityResolutionLatency +
        avgDraftGenerationLatency;

      const p95EndToEndLatency =
        calculateP95(metrics.transcriptionLatencies) +
        calculateP95(metrics.claimsExtractionLatencies) +
        calculateP95(metrics.entityResolutionLatencies) +
        calculateP95(metrics.draftGenerationLatencies);

      const avgTranscriptConfidence =
        metrics.transcriptConfidenceScores.length > 0
          ? metrics.transcriptConfidenceScores.reduce((a, b) => a + b, 0) /
            metrics.transcriptConfidenceScores.length
          : 0;

      const avgClaimConfidence =
        metrics.claimConfidenceScores.length > 0
          ? metrics.claimConfidenceScores.reduce((a, b) => a + b, 0) /
            metrics.claimConfidenceScores.length
          : 0;

      const autoResolutionRate = safeDivide(
        metrics.entityResolutionCompleted - metrics.needsDisambiguation,
        metrics.entityResolutionCompleted
      );

      const disambiguationRate = safeDivide(
        metrics.needsDisambiguation,
        metrics.entityResolutionCompleted
      );

      const transcriptionFailureRate = safeDivide(
        metrics.transcriptionFailed,
        metrics.transcriptionFailed + metrics.transcriptionLatencies.length
      );

      const claimsExtractionFailureRate = safeDivide(
        metrics.claimsExtractionFailed,
        metrics.claimsExtractionFailed +
          metrics.claimsExtractionLatencies.length
      );

      const entityResolutionFailureRate = safeDivide(
        metrics.entityResolutionFailed,
        metrics.entityResolutionCompleted + metrics.entityResolutionFailed
      );

      const overallFailureRate = safeDivide(
        metrics.artifactsFailed,
        metrics.artifactsReceived
      );

      const avgCostPerArtifact = safeDivide(
        metrics.totalAICost,
        metrics.artifactsReceived
      );

      // Create platform-wide snapshot (organizationId omitted)
      await ctx.db.insert("voicePipelineMetricsSnapshots", {
        periodStart: hourStart,
        periodEnd: hourEnd,
        periodType: "hourly",
        artifactsReceived: metrics.artifactsReceived,
        artifactsCompleted: metrics.artifactsCompleted,
        artifactsFailed: metrics.artifactsFailed,
        avgTranscriptionLatency,
        avgClaimsExtractionLatency,
        avgEntityResolutionLatency,
        avgDraftGenerationLatency,
        avgEndToEndLatency,
        p95EndToEndLatency,
        avgTranscriptConfidence,
        avgClaimConfidence,
        autoResolutionRate,
        disambiguationRate,
        transcriptionFailureRate,
        claimsExtractionFailureRate,
        entityResolutionFailureRate,
        overallFailureRate,
        totalClaimsExtracted: metrics.totalClaimsExtracted,
        totalEntitiesResolved: metrics.totalEntitiesResolved,
        totalDraftsGenerated: metrics.totalDraftsGenerated,
        totalAICost: metrics.totalAICost,
        avgCostPerArtifact,
        createdAt: Date.now(),
      });

      // Create per-org snapshots
      const uniqueOrgIds = [
        ...new Set(events.map((e) => e.organizationId).filter(Boolean)),
      ] as string[];

      for (const orgId of uniqueOrgIds) {
        const orgEvents = events.filter((e) => e.organizationId === orgId);

        // Recalculate metrics for this org
        const orgMetrics = {
          artifactsReceived: orgEvents.filter(
            (e) => e.eventType === "artifact_received"
          ).length,
          artifactsCompleted: orgEvents.filter(
            (e) => e.eventType === "artifact_completed"
          ).length,
          artifactsFailed: orgEvents.filter(
            (e) => e.eventType === "artifact_failed"
          ).length,

          transcriptionLatencies: orgEvents
            .filter(
              (e) =>
                e.eventType === "transcription_completed" &&
                e.durationMs != null
            )
            .map((e) => e.durationMs ?? 0),

          claimsExtractionLatencies: orgEvents
            .filter(
              (e) => e.eventType === "claims_extracted" && e.durationMs != null
            )
            .map((e) => e.durationMs ?? 0),

          entityResolutionLatencies: orgEvents
            .filter(
              (e) =>
                e.eventType === "entity_resolution_completed" &&
                e.durationMs != null
            )
            .map((e) => e.durationMs ?? 0),

          draftGenerationLatencies: orgEvents
            .filter(
              (e) => e.eventType === "drafts_generated" && e.durationMs != null
            )
            .map((e) => e.durationMs ?? 0),

          transcriptConfidenceScores: orgEvents
            .filter(
              (e) =>
                e.eventType === "transcription_completed" &&
                e.metadata?.confidenceScore != null
            )
            .map((e) => e.metadata?.confidenceScore ?? 0),

          claimConfidenceScores: orgEvents
            .filter(
              (e) =>
                e.eventType === "claims_extracted" &&
                e.metadata?.confidenceScore != null
            )
            .map((e) => e.metadata?.confidenceScore ?? 0),

          entityResolutionCompleted: orgEvents.filter(
            (e) => e.eventType === "entity_resolution_completed"
          ).length,
          needsDisambiguation: orgEvents.filter(
            (e) => e.eventType === "entity_needs_disambiguation"
          ).length,

          transcriptionFailed: orgEvents.filter(
            (e) => e.eventType === "transcription_failed"
          ).length,
          claimsExtractionFailed: orgEvents.filter(
            (e) => e.eventType === "claims_extraction_failed"
          ).length,
          entityResolutionFailed: orgEvents.filter(
            (e) => e.eventType === "entity_resolution_failed"
          ).length,

          totalClaimsExtracted: orgEvents
            .filter((e) => e.eventType === "claims_extracted")
            .reduce((sum, e) => sum + (e.metadata?.claimCount ?? 0), 0),

          totalEntitiesResolved: orgEvents
            .filter((e) => e.eventType === "entity_resolution_completed")
            .reduce((sum, e) => sum + (e.metadata?.entityCount ?? 0), 0),

          totalDraftsGenerated: orgEvents
            .filter((e) => e.eventType === "drafts_generated")
            .reduce((sum, e) => sum + (e.metadata?.draftCount ?? 0), 0),

          totalAICost: orgEvents.reduce(
            (sum, e) => sum + (e.metadata?.aiCost ?? 0),
            0
          ),
        };

        // Compute derived metrics for org
        const orgAvgTranscriptionLatency =
          orgMetrics.transcriptionLatencies.length > 0
            ? orgMetrics.transcriptionLatencies.reduce((a, b) => a + b, 0) /
              orgMetrics.transcriptionLatencies.length
            : 0;

        const orgAvgClaimsExtractionLatency =
          orgMetrics.claimsExtractionLatencies.length > 0
            ? orgMetrics.claimsExtractionLatencies.reduce((a, b) => a + b, 0) /
              orgMetrics.claimsExtractionLatencies.length
            : 0;

        const orgAvgEntityResolutionLatency =
          orgMetrics.entityResolutionLatencies.length > 0
            ? orgMetrics.entityResolutionLatencies.reduce((a, b) => a + b, 0) /
              orgMetrics.entityResolutionLatencies.length
            : 0;

        const orgAvgDraftGenerationLatency =
          orgMetrics.draftGenerationLatencies.length > 0
            ? orgMetrics.draftGenerationLatencies.reduce((a, b) => a + b, 0) /
              orgMetrics.draftGenerationLatencies.length
            : 0;

        const orgAvgEndToEndLatency =
          orgAvgTranscriptionLatency +
          orgAvgClaimsExtractionLatency +
          orgAvgEntityResolutionLatency +
          orgAvgDraftGenerationLatency;

        const orgP95EndToEndLatency =
          calculateP95(orgMetrics.transcriptionLatencies) +
          calculateP95(orgMetrics.claimsExtractionLatencies) +
          calculateP95(orgMetrics.entityResolutionLatencies) +
          calculateP95(orgMetrics.draftGenerationLatencies);

        const orgAvgTranscriptConfidence =
          orgMetrics.transcriptConfidenceScores.length > 0
            ? orgMetrics.transcriptConfidenceScores.reduce((a, b) => a + b, 0) /
              orgMetrics.transcriptConfidenceScores.length
            : 0;

        const orgAvgClaimConfidence =
          orgMetrics.claimConfidenceScores.length > 0
            ? orgMetrics.claimConfidenceScores.reduce((a, b) => a + b, 0) /
              orgMetrics.claimConfidenceScores.length
            : 0;

        const orgAutoResolutionRate = safeDivide(
          orgMetrics.entityResolutionCompleted - orgMetrics.needsDisambiguation,
          orgMetrics.entityResolutionCompleted
        );

        const orgDisambiguationRate = safeDivide(
          orgMetrics.needsDisambiguation,
          orgMetrics.entityResolutionCompleted
        );

        const orgTranscriptionFailureRate = safeDivide(
          orgMetrics.transcriptionFailed,
          orgMetrics.transcriptionFailed +
            orgMetrics.transcriptionLatencies.length
        );

        const orgClaimsExtractionFailureRate = safeDivide(
          orgMetrics.claimsExtractionFailed,
          orgMetrics.claimsExtractionFailed +
            orgMetrics.claimsExtractionLatencies.length
        );

        const orgEntityResolutionFailureRate = safeDivide(
          orgMetrics.entityResolutionFailed,
          orgMetrics.entityResolutionCompleted +
            orgMetrics.entityResolutionFailed
        );

        const orgOverallFailureRate = safeDivide(
          orgMetrics.artifactsFailed,
          orgMetrics.artifactsReceived
        );

        const orgAvgCostPerArtifact = safeDivide(
          orgMetrics.totalAICost,
          orgMetrics.artifactsReceived
        );

        await ctx.db.insert("voicePipelineMetricsSnapshots", {
          periodStart: hourStart,
          periodEnd: hourEnd,
          periodType: "hourly",
          organizationId: orgId,
          artifactsReceived: orgMetrics.artifactsReceived,
          artifactsCompleted: orgMetrics.artifactsCompleted,
          artifactsFailed: orgMetrics.artifactsFailed,
          avgTranscriptionLatency: orgAvgTranscriptionLatency,
          avgClaimsExtractionLatency: orgAvgClaimsExtractionLatency,
          avgEntityResolutionLatency: orgAvgEntityResolutionLatency,
          avgDraftGenerationLatency: orgAvgDraftGenerationLatency,
          avgEndToEndLatency: orgAvgEndToEndLatency,
          p95EndToEndLatency: orgP95EndToEndLatency,
          avgTranscriptConfidence: orgAvgTranscriptConfidence,
          avgClaimConfidence: orgAvgClaimConfidence,
          autoResolutionRate: orgAutoResolutionRate,
          disambiguationRate: orgDisambiguationRate,
          transcriptionFailureRate: orgTranscriptionFailureRate,
          claimsExtractionFailureRate: orgClaimsExtractionFailureRate,
          entityResolutionFailureRate: orgEntityResolutionFailureRate,
          overallFailureRate: orgOverallFailureRate,
          totalClaimsExtracted: orgMetrics.totalClaimsExtracted,
          totalEntitiesResolved: orgMetrics.totalEntitiesResolved,
          totalDraftsGenerated: orgMetrics.totalDraftsGenerated,
          totalAICost: orgMetrics.totalAICost,
          avgCostPerArtifact: orgAvgCostPerArtifact,
          createdAt: Date.now(),
        });
      }

      return null;
    } catch (error) {
      // Log error but don't throw - cron should succeed even with partial data
      console.error("[aggregateHourlyMetrics] Error:", error);
      return null;
    }
  },
});

/**
 * Aggregate daily metrics from hourly snapshots
 * Creates platform-wide and per-org daily snapshots
 * Target: < 10s (aggregates 24 hourly snapshots)
 */
export const aggregateDailyMetrics = internalMutation({
  args: {
    dayTimestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const dayStart = args.dayTimestamp;
      const dayEnd = dayStart + 86_400_000; // 24 hours

      // Query hourly snapshots for this day
      const hourlySnapshots = await ctx.db
        .query("voicePipelineMetricsSnapshots")
        .withIndex("by_periodType_and_start", (q) =>
          q
            .eq("periodType", "hourly")
            .gte("periodStart", dayStart)
            .lt("periodStart", dayEnd)
        )
        .collect();

      if (hourlySnapshots.length === 0) {
        // No hourly snapshots for this day - skip
        return null;
      }

      // Aggregate platform-wide snapshots
      const platformSnapshots = hourlySnapshots.filter(
        (s) => !s.organizationId
      );

      if (platformSnapshots.length > 0) {
        const platformMetrics = aggregateSnapshots(platformSnapshots);

        await ctx.db.insert("voicePipelineMetricsSnapshots", {
          periodStart: dayStart,
          periodEnd: dayEnd,
          periodType: "daily",
          ...platformMetrics,
          createdAt: Date.now(),
        });
      }

      // Aggregate per-org snapshots
      const uniqueOrgIds = [
        ...new Set(
          hourlySnapshots.map((s) => s.organizationId).filter(Boolean)
        ),
      ] as string[];

      for (const orgId of uniqueOrgIds) {
        const orgSnapshots = hourlySnapshots.filter(
          (s) => s.organizationId === orgId
        );
        const orgMetrics = aggregateSnapshots(orgSnapshots);

        await ctx.db.insert("voicePipelineMetricsSnapshots", {
          periodStart: dayStart,
          periodEnd: dayEnd,
          periodType: "daily",
          organizationId: orgId,
          ...orgMetrics,
          createdAt: Date.now(),
        });
      }

      return null;
    } catch (error) {
      console.error("[aggregateDailyMetrics] Error:", error);
      return null;
    }
  },
});

/**
 * Helper: Aggregate multiple snapshots into a single snapshot
 * Used for daily aggregation from hourly snapshots
 */
function aggregateSnapshots(
  snapshots: Array<{
    artifactsReceived: number;
    artifactsCompleted: number;
    artifactsFailed: number;
    avgTranscriptionLatency: number;
    avgClaimsExtractionLatency: number;
    avgEntityResolutionLatency: number;
    avgDraftGenerationLatency: number;
    avgEndToEndLatency: number;
    p95EndToEndLatency: number;
    avgTranscriptConfidence: number;
    avgClaimConfidence: number;
    autoResolutionRate: number;
    disambiguationRate: number;
    transcriptionFailureRate: number;
    claimsExtractionFailureRate: number;
    entityResolutionFailureRate: number;
    overallFailureRate: number;
    totalClaimsExtracted: number;
    totalEntitiesResolved: number;
    totalDraftsGenerated: number;
    totalAICost: number;
    avgCostPerArtifact: number;
  }>
) {
  // Sum throughput metrics
  const artifactsReceived = snapshots.reduce(
    (sum, s) => sum + s.artifactsReceived,
    0
  );
  const artifactsCompleted = snapshots.reduce(
    (sum, s) => sum + s.artifactsCompleted,
    0
  );
  const artifactsFailed = snapshots.reduce(
    (sum, s) => sum + s.artifactsFailed,
    0
  );
  const totalClaimsExtracted = snapshots.reduce(
    (sum, s) => sum + s.totalClaimsExtracted,
    0
  );
  const totalEntitiesResolved = snapshots.reduce(
    (sum, s) => sum + s.totalEntitiesResolved,
    0
  );
  const totalDraftsGenerated = snapshots.reduce(
    (sum, s) => sum + s.totalDraftsGenerated,
    0
  );
  const totalAICost = snapshots.reduce((sum, s) => sum + s.totalAICost, 0);

  // Weighted average latencies (weighted by artifactsCompleted)
  const avgTranscriptionLatency = weightedAverage(
    snapshots,
    (s) => s.avgTranscriptionLatency,
    (s) => s.artifactsCompleted
  );
  const avgClaimsExtractionLatency = weightedAverage(
    snapshots,
    (s) => s.avgClaimsExtractionLatency,
    (s) => s.artifactsCompleted
  );
  const avgEntityResolutionLatency = weightedAverage(
    snapshots,
    (s) => s.avgEntityResolutionLatency,
    (s) => s.artifactsCompleted
  );
  const avgDraftGenerationLatency = weightedAverage(
    snapshots,
    (s) => s.avgDraftGenerationLatency,
    (s) => s.artifactsCompleted
  );
  const avgEndToEndLatency = weightedAverage(
    snapshots,
    (s) => s.avgEndToEndLatency,
    (s) => s.artifactsCompleted
  );
  const p95EndToEndLatency = weightedAverage(
    snapshots,
    (s) => s.p95EndToEndLatency,
    (s) => s.artifactsCompleted
  );

  // Weighted average quality metrics
  const avgTranscriptConfidence = weightedAverage(
    snapshots,
    (s) => s.avgTranscriptConfidence,
    (s) => s.artifactsCompleted
  );
  const avgClaimConfidence = weightedAverage(
    snapshots,
    (s) => s.avgClaimConfidence,
    (s) => s.artifactsCompleted
  );

  // Weighted average rates
  const autoResolutionRate = weightedAverage(
    snapshots,
    (s) => s.autoResolutionRate,
    (s) => s.totalEntitiesResolved
  );
  const disambiguationRate = weightedAverage(
    snapshots,
    (s) => s.disambiguationRate,
    (s) => s.totalEntitiesResolved
  );
  const transcriptionFailureRate = weightedAverage(
    snapshots,
    (s) => s.transcriptionFailureRate,
    (s) => s.artifactsReceived
  );
  const claimsExtractionFailureRate = weightedAverage(
    snapshots,
    (s) => s.claimsExtractionFailureRate,
    (s) => s.artifactsReceived
  );
  const entityResolutionFailureRate = weightedAverage(
    snapshots,
    (s) => s.entityResolutionFailureRate,
    (s) => s.artifactsReceived
  );

  // Recompute overall failure rate from sums
  const overallFailureRate = safeDivide(artifactsFailed, artifactsReceived);
  const avgCostPerArtifact = safeDivide(totalAICost, artifactsReceived);

  return {
    artifactsReceived,
    artifactsCompleted,
    artifactsFailed,
    avgTranscriptionLatency,
    avgClaimsExtractionLatency,
    avgEntityResolutionLatency,
    avgDraftGenerationLatency,
    avgEndToEndLatency,
    p95EndToEndLatency,
    avgTranscriptConfidence,
    avgClaimConfidence,
    autoResolutionRate,
    disambiguationRate,
    transcriptionFailureRate,
    claimsExtractionFailureRate,
    entityResolutionFailureRate,
    overallFailureRate,
    totalClaimsExtracted,
    totalEntitiesResolved,
    totalDraftsGenerated,
    totalAICost,
    avgCostPerArtifact,
  };
}

/**
 * Helper: Weighted average calculation
 */
function weightedAverage<T>(
  items: T[],
  getValue: (item: T) => number,
  getWeight: (item: T) => number
): number {
  let sumWeighted = 0;
  let sumWeights = 0;

  for (const item of items) {
    const value = getValue(item);
    const weight = getWeight(item);
    sumWeighted += value * weight;
    sumWeights += weight;
  }

  return safeDivide(sumWeighted, sumWeights);
}

// ============================================================
// CLEANUP FUNCTIONS (RETENTION POLICY)
// ============================================================

/**
 * Cleanup old snapshots (7 days hourly, 90 days daily)
 */
export const cleanupOldSnapshots = internalMutation({
  args: {},
  returns: v.object({
    hourlyDeleted: v.number(),
    dailyDeleted: v.number(),
  }),
  handler: async (ctx) => {
    try {
      const now = Date.now();

      // 7 days ago for hourly snapshots
      const hourlyRetentionCutoff = now - 7 * 86_400_000;

      // 90 days ago for daily snapshots
      const dailyRetentionCutoff = now - 90 * 86_400_000;

      // Delete expired hourly snapshots
      const expiredHourly = await ctx.db
        .query("voicePipelineMetricsSnapshots")
        .withIndex("by_periodType_and_start", (q) =>
          q.eq("periodType", "hourly").lt("periodStart", hourlyRetentionCutoff)
        )
        .collect();

      for (const snapshot of expiredHourly) {
        await ctx.db.delete(snapshot._id);
      }

      // Delete expired daily snapshots
      const expiredDaily = await ctx.db
        .query("voicePipelineMetricsSnapshots")
        .withIndex("by_periodType_and_start", (q) =>
          q.eq("periodType", "daily").lt("periodStart", dailyRetentionCutoff)
        )
        .collect();

      for (const snapshot of expiredDaily) {
        await ctx.db.delete(snapshot._id);
      }

      return {
        hourlyDeleted: expiredHourly.length,
        dailyDeleted: expiredDaily.length,
      };
    } catch (error) {
      console.error("[cleanupOldSnapshots] Error:", error);
      return { hourlyDeleted: 0, dailyDeleted: 0 };
    }
  },
});

/**
 * Cleanup old events (48 hour retention)
 */
export const cleanupOldEvents = internalMutation({
  args: {},
  returns: v.object({
    eventsDeleted: v.number(),
  }),
  handler: async (ctx) => {
    try {
      const now = Date.now();
      const retentionCutoff = now - 48 * 3_600_000; // 48 hours

      // Compute expired timeWindows
      // We need to delete all events in windows before cutoff
      // timeWindow format: 'YYYY-MM-DD-HH'

      // Get all time windows before cutoff
      const _cutoffDate = new Date(retentionCutoff);
      const expiredWindows: string[] = [];

      // Generate all hourly windows from cutoff going back 72 hours (safety margin)
      for (let i = 0; i < 72; i++) {
        const windowTime = retentionCutoff - i * 3_600_000;
        const window = computeTimeWindow(windowTime);
        expiredWindows.push(window);
      }

      // Delete events in expired windows
      let totalDeleted = 0;

      for (const window of expiredWindows) {
        const eventsInWindow = await ctx.db
          .query("voicePipelineEvents")
          .withIndex("by_timeWindow", (q) => q.eq("timeWindow", window))
          .collect();

        for (const event of eventsInWindow) {
          // Double-check timestamp is before cutoff
          if (event.timestamp < retentionCutoff) {
            await ctx.db.delete(event._id);
            totalDeleted += 1;
          }
        }
      }

      return {
        eventsDeleted: totalDeleted,
      };
    } catch (error) {
      console.error("[cleanupOldEvents] Error:", error);
      return { eventsDeleted: 0 };
    }
  },
});

// ============================================================
// CRON WRAPPER FUNCTIONS (Calculate timestamps at runtime)
// ============================================================

/**
 * Wrapper for hourly aggregation cron
 * Calculates previous hour timestamp at runtime
 */
export const aggregateHourlyMetricsWrapper = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    // Calculate start of previous hour
    const currentHourStart = now - (now % 3_600_000);
    const previousHourStart = currentHourStart - 3_600_000;

    await ctx.runMutation(
      internal.models.voicePipelineMetrics.aggregateHourlyMetrics,
      {
        hourTimestamp: previousHourStart,
      }
    );

    return null;
  },
});

/**
 * Wrapper for daily aggregation cron
 * Calculates previous day timestamp at runtime (UTC day start)
 */
export const aggregateDailyMetricsWrapper = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    // Calculate start of today (UTC)
    const todayStart = now - (now % 86_400_000);
    // Previous day start
    const previousDayStart = todayStart - 86_400_000;

    await ctx.runMutation(
      internal.models.voicePipelineMetrics.aggregateDailyMetrics,
      {
        dayTimestamp: previousDayStart,
      }
    );

    return null;
  },
});
