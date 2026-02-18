# ADR-VNM-004: Snapshot-Based Analytics (Hourly/Daily Aggregation Strategy)

## Status
Accepted

## Context

Historical pipeline analytics (latency trends, error rates over 7/30/90 days) cannot scan raw events -- it would require aggregating thousands to tens of thousands of documents per query. A pre-aggregation approach is needed where periodic cron jobs compute metrics snapshots from raw events.

Key constraints:
- Raw events are retained for 48 hours only (ADR-VNM-001)
- Hourly snapshots must be retained for 7 days, daily snapshots for 90 days
- Dashboard queries must be fast: <200ms for any historical time range
- Both platform-wide and per-organization breakdowns are needed
- Aggregation cron must complete in <30 seconds

## Decision

### 1. Dual-Period Snapshot Table

`voicePipelineMetricsSnapshots` stores both hourly and daily aggregations in a single table, differentiated by `periodType`:

```typescript
{
  periodType: "hourly",        // or "daily"
  periodStart: 1739548800000,  // Start of period
  periodEnd: 1739552400000,    // End of period
  organizationId: null,        // null = platform-wide
  // ... 22 metric fields
}
```

### 2. 22 Pre-Computed Metrics

Grouped into 6 categories:
- **Throughput** (3): artifactsReceived, artifactsCompleted, artifactsFailed
- **Latency** (6): avgTranscriptionLatency, avgClaimsExtractionLatency, avgEntityResolutionLatency, avgDraftGenerationLatency, avgEndToEndLatency, p95EndToEndLatency
- **Quality** (4): avgTranscriptConfidence, avgClaimConfidence, autoResolutionRate, disambiguationRate
- **Errors** (4): transcriptionFailureRate, claimsExtractionFailureRate, entityResolutionFailureRate, overallFailureRate
- **Volume** (3): totalClaimsExtracted, totalEntitiesResolved, totalDraftsGenerated
- **Cost** (2): totalAICost, avgCostPerArtifact

### 3. Time Range to Period Type Mapping

```
Last 1h:  Query raw counters (Phase M2 getRealTimeMetrics)
Last 6h:  Query 6 hourly snapshots
Last 24h: Query 24 hourly snapshots
Last 7d:  Query 168 hourly snapshots
Last 30d: Query 30 daily snapshots
Last 90d: Query 90 daily snapshots
```

Maximum documents per query: 168 (7-day hourly view) -- well within Convex limits.

### 4. Two Composite Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| by_periodType_and_start | [periodType, periodStart] | Platform-wide time range queries |
| by_org_periodType_start | [organizationId, periodType, periodStart] | Org-scoped time range queries |

### 5. Aggregation Cron Strategy (Phase M2)

- **Hourly cron** (every hour at :30): Query events by `timeWindow` for the just-completed hour, compute 22 metrics, insert one platform-wide snapshot + one per active organization
- **Daily cron** (daily at 1:30 AM UTC): Aggregate the last 24 hourly snapshots into one daily snapshot (weighted averages for latency/rates, sums for volumes/costs)
- **Cleanup cron** (weekly Sunday 4:30 AM UTC): Delete hourly snapshots older than 7 days, daily snapshots older than 90 days

### 6. Weighted Average Formula for Daily Rollups

```typescript
// Daily avg latency = weighted average of hourly values
const dailyAvgLatency = hourlySnapshots.reduce(
  (sum, s) => sum + s.avgTranscriptionLatency * s.artifactsCompleted, 0
) / hourlySnapshots.reduce(
  (sum, s) => sum + s.artifactsCompleted, 0
);
```

P95 latency for daily snapshots uses the maximum p95 across hourly snapshots (conservative upper bound).

## Consequences

### Positive
- Historical queries read 30-168 small documents instead of scanning 50,000+ raw events
- Single table with periodType discriminator simplifies schema and queries
- Platform-wide and org-scoped views use different indexes efficiently
- Aggregation operates on bounded data (1 hour of events via timeWindow index)

### Negative
- 22 numeric fields per snapshot adds storage cost (~168-2,700 snapshots in steady state per org)
- Daily p95 is an approximation (max of hourly p95s, not true p95 of all events)
- Hourly cron must complete before the next hour's events start accumulating
- If the aggregation cron fails, that hour's metrics are lost (events are deleted after 48h)

### Risks
- **Cron failure**: If the hourly aggregation cron fails for multiple hours, those metrics are lost when events are cleaned up. Mitigation: the cleanup cron runs weekly, giving time to detect and remediate failures.
- **Org explosion**: If many organizations are active, each hourly snapshot creates one document per org. At 100 active orgs, that is 100 documents per hour = 2,400/day. Manageable but should be monitored.
- **Clock skew**: Aggregation at :30 processes events from :00-:59 of the previous hour. If events arrive late (via scheduler delays), they may be counted in the wrong hour. This is acceptable for monitoring purposes.

## Implementation Notes
- This table is CREATED in Phase M1 (schema only) but POPULATED starting in Phase M2 (cron jobs)
- Phase M1 creates the schema with all fields -- all numeric fields default to 0 when no data exists
- The `createdAt` field records when the snapshot was computed (not the period start)
- Queries MUST use the composite indexes, never scan the full table
- For "last 1h" queries, use counters (ADR-VNM-002), not snapshots

## Related
- [Architecture Doc](../voice-flow-monitoring-harness.md) Section 4.1.2
- [PERFORMANCE_PATTERNS.md](../../scripts/ralph/prds/voice-monitor-harness/context/PERFORMANCE_PATTERNS.md) Pattern 4
- ADR-VNM-001 (Event retention defines what data is available for aggregation)
- ADR-VNM-002 (Counters handle real-time; snapshots handle historical)
