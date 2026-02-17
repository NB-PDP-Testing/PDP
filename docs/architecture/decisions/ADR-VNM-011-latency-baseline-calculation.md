# ADR-VNM-011: Latency Baseline Calculation Pattern

**Status:** Accepted
**Date:** 2026-02-15
**Phase:** M4 - Pipeline Alerts
**Author:** Architecture Reviewer (Pre-implementation)

---

## Context

Health Check 2 (Latency Spike) must compare the current end-to-end latency against a 7-day historical baseline. The PRD specifies:

- **Baseline**: Average of `avgEndToEndLatency` from the last 168 hourly snapshots (7 days x 24 hours)
- **Current value**: The most recent snapshot's `avgEndToEndLatency` (or counter-derived value)
- **Threshold**: Alert if current > 2x baseline

The question is how to efficiently query and compute this baseline within a mutation that must complete in under 10 seconds.

---

## Decision

**Query hourly snapshots using the `by_periodType_and_start` index with a time-bounded range. Collect all results and compute the average in-memory. Use `.collect()` on a bounded query, NOT `.take(168)`.** Handle edge cases where insufficient snapshots exist.

---

## Rationale

### 1. `.collect()` on a Bounded Query is Correct

The query uses `by_periodType_and_start` with `periodType = "hourly"` and `periodStart >= sevenDaysAgo`. This is a bounded index range query:

```typescript
const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

const snapshots = await ctx.db
  .query("voicePipelineMetricsSnapshots")
  .withIndex("by_periodType_and_start", (q) =>
    q.eq("periodType", "hourly").gte("periodStart", sevenDaysAgo)
  )
  .collect();
```

This returns at most ~168 documents (one per hour for 7 days). The result set is naturally bounded by the time range, so `.collect()` is safe. There is no risk of unbounded collection.

### 2. Why NOT `.take(168)`

`.take(168)` has two problems:
1. **No continuation**: If we ever need to change the window size, `.take()` silently truncates
2. **Order dependency**: `.take()` without `.order()` returns in insertion order, which may not align with time order. The index `by_periodType_and_start` orders by `periodStart` ascending, but if snapshots were created out of order (e.g., backfill), `.take(168)` could return the wrong 168 rows.

The bounded `.collect()` is explicit and correct: "give me all hourly snapshots in the last 7 days."

### 3. Why NOT Reading Counters for Current Value

The PRD mentions reading `voicePipelineCounters` for real-time metrics (Pattern 3 from PERFORMANCE_PATTERNS.md). However, counters track **counts** (artifacts received, completed, failed), not **latency values**. Latency is only available in snapshots (pre-computed by the hourly aggregation cron).

The current latency value comes from the **most recent hourly snapshot**, not from a counter. This is correct because:
- Counters are O(1) but only store counts
- Latency requires aggregation across completed events (duration calculations)
- The hourly cron already computes `avgEndToEndLatency` and `p95EndToEndLatency`

### 4. Baseline Computation

```typescript
// Collect all hourly snapshots in the last 7 days
const snapshots = await ctx.db
  .query("voicePipelineMetricsSnapshots")
  .withIndex("by_periodType_and_start", (q) =>
    q.eq("periodType", "hourly").gte("periodStart", sevenDaysAgo)
  )
  .collect();

// Filter out snapshots with zero completions (no meaningful latency data)
const validSnapshots = snapshots.filter(
  (s) => s.artifactsCompleted > 0 && s.avgEndToEndLatency > 0
);

// Calculate baseline average
// Note: filter() here is JavaScript Array.prototype.filter(), NOT Convex query .filter()
if (validSnapshots.length < 6) {
  // Insufficient data for meaningful baseline -- skip this check
  // 6 hourly snapshots = minimum 6 hours of data
  checks.push("latency:SKIPPED_INSUFFICIENT_DATA");
  return;
}

const baselineAvg =
  validSnapshots.reduce((sum, s) => sum + s.avgEndToEndLatency, 0) /
  validSnapshots.length;
```

### 5. Current Value: Most Recent Snapshot

```typescript
// Get the most recent hourly snapshot
const recentSnapshot = await ctx.db
  .query("voicePipelineMetricsSnapshots")
  .withIndex("by_periodType_and_start", (q) =>
    q.eq("periodType", "hourly")
  )
  .order("desc")
  .first();

if (!recentSnapshot || recentSnapshot.artifactsCompleted === 0) {
  checks.push("latency:SKIPPED_NO_RECENT_DATA");
  return;
}

const currentLatency = recentSnapshot.avgEndToEndLatency;
```

### 6. Threshold Comparison

```typescript
// Alert if current latency > 2x baseline
if (currentLatency > baselineAvg * 2) {
  const created = await maybeCreateAlert(ctx, {
    alertType: "PIPELINE_HIGH_LATENCY",
    severity: "medium",
    message: `End-to-end latency is ${Math.round(currentLatency)}ms (2x normal: ${Math.round(baselineAvg)}ms)`,
    metadata: {
      currentLatency,
      avgLatency: Math.round(baselineAvg),
      threshold: 2.0,
    },
  });
  if (created) alertsCreated++;
}
```

---

## Edge Cases

### Insufficient Historical Data

If the pipeline is newly deployed, there may be fewer than 168 snapshots. The minimum threshold is **6 hourly snapshots** (6 hours of data). Below this, the latency check is skipped entirely with a logged reason.

**Why 6?** A baseline calculated from fewer than 6 data points is statistically unreliable and could trigger false positives from normal variance.

### All Snapshots Have Zero Completions

If the pipeline has been inactive (no artifacts completed), all snapshots will have `avgEndToEndLatency = 0`. The filter `s.artifactsCompleted > 0` removes these, and the minimum-data check prevents false alerts.

### Snapshot Aggregation Not Running

If the M2 hourly cron (`aggregate-pipeline-hourly-metrics`) fails, no new snapshots are created. The latency check will continue using the most recent available snapshot. If all snapshots age beyond 7 days, the check will be skipped (insufficient data).

### Organization-Scoped vs. Platform-Wide

Snapshots have an optional `organizationId` field. For M4, the health check uses **platform-wide** snapshots only (where `organizationId` is `undefined`/`null`). The query does NOT filter by organization -- it uses the `by_periodType_and_start` index which does not include `organizationId`.

If platform-wide snapshots are not generated by the M2 cron, this check will return no results and be skipped.

**Implementation note**: Verify that the M2 `aggregateHourlyMetricsWrapper` creates platform-wide snapshots (without `organizationId`). If it only creates per-org snapshots, the latency check will need to aggregate across orgs or the M2 cron needs modification.

---

## Performance

| Operation | Cost |
|-----------|------|
| Query 168 hourly snapshots | 168 document reads, ~300ms |
| Query most recent snapshot | 1 document read, ~10ms |
| In-memory average calculation | O(168), ~1ms |
| **Total** | **~310ms** |

This is the most expensive individual check in `checkPipelineHealth`, but well within the 10-second budget.

---

## JavaScript `.filter()` Clarification

The code uses `snapshots.filter(s => s.artifactsCompleted > 0)` to remove zero-completion snapshots. This is **JavaScript's `Array.prototype.filter()`**, not Convex's query `.filter()`. Per ADR-VNM-007 and M3 lessons learned, this is acceptable because:

1. Data is already collected (`.collect()` was called)
2. We are filtering an in-memory array
3. The array is bounded (~168 elements maximum)

Automated scanners may flag this as a `.filter()` violation -- it is a false positive.

---

## Consequences

- Latency check queries up to 168 snapshot documents per health check cycle
- Minimum 6 valid snapshots required for baseline calculation
- Zero-completion snapshots are excluded from baseline
- Check is skipped gracefully when insufficient data exists
- Platform-wide snapshots (no organizationId) are used for baseline
- Most recent snapshot provides "current" latency value
- 2x multiplier threshold is hardcoded (could be configurable in future)
- JavaScript `.filter()` on collected array is acceptable (bounded data)

---

## Related

- ADR-VNM-004: Snapshot-based analytics (M2)
- ADR-VNM-009: Health check execution model (single mutation, per-check try/catch)
- PERFORMANCE_PATTERNS.md: Pattern 4 (snapshot-based historical queries)
- Schema: `voicePipelineMetricsSnapshots` (schema.ts lines 4585-4619)
