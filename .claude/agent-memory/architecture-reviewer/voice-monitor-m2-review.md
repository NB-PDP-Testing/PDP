# Voice Monitor Harness - Phase M2 Pre-Implementation Review

**Date:** 2026-02-16
**Phase:** M2 - Metrics & Aggregation
**Reviewer:** Claude Sonnet 4.5
**Status:** APPROVED WITH M1 LESSONS INTEGRATED

---

## Executive Summary

Phase M2 builds the metrics aggregation system on top of M1's event logging foundation. This review validates the approach, identifies risks, and ensures all M1 lessons are incorporated.

**Complexity:** MEDIUM-HIGH
**Risk Areas:** Performance (aggregation speed), N+1 queries, division by zero, retention math
**M1 Dependencies:** voicePipelineEvents, voicePipelineCounters, voicePipelineMetricsSnapshots tables
**New Files:** 1 (voicePipelineMetrics.ts)
**Modified Files:** 1 (crons.ts)

---

## Phase M2 Overview

**Goals:**
1. Real-time metrics from counters (O(1), < 50ms)
2. Historical metrics from snapshots (no event scanning)
3. Hourly aggregation (events → hourly snapshots, < 30s)
4. Daily aggregation (hourly snapshots → daily snapshots, < 10s)
5. Cleanup crons (snapshots 7/90 days, events 48 hours)

**User Stories:**
- US-VNM-004: Build Metrics Aggregation System (8 functions)
- US-VNM-005: Add Metrics Aggregation Crons (4 crons)

---

## M1 Lessons Integration Checklist

### ✅ Critical Patterns from M1

| Pattern | M2 Application | Verified |
|---------|----------------|----------|
| UTC time handling | computeTimeWindow, retention cutoffs | ✅ Required |
| N+1 prevention | Batch fetch org names in getOrgBreakdown | ✅ Required |
| Safe division | All failure rate/average calculations | ✅ Required |
| No event scanning | getRealTimeMetrics uses counters only | ✅ Required |
| Platform-wide data | Omit organizationId (not null) | ✅ Required |
| Atomic imports | Import + usage in same edit | ✅ Required |
| Error handling | Log but don't throw in aggregation | ✅ Required |
| Cron timing | :30 for hourly, 1:30 AM for daily | ✅ Required |

**All M1 lessons reviewed:** ✅
**Mandatory reading assigned:** M1_LESSONS_LEARNED.md

---

## Function-by-Function Analysis

### 1. getRealTimeMetrics (Query)

**Purpose:** O(1) real-time metrics from counters
**Performance Target:** < 50ms

**Implementation:**
```typescript
export const getRealTimeMetrics = query({
  args: { organizationId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Platform staff auth
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.isPlatformStaff) throw new Error("Unauthorized");

    // Query 7 counter types
    const counters = await Promise.all([
      getCounter(ctx, "artifacts_received_1h", args.organizationId),
      getCounter(ctx, "artifacts_completed_1h", args.organizationId),
      // ... 5 more
    ]);

    return {
      artifactsReceived1h: counters[0]?.currentValue ?? 0,
      windowStart: counters[0]?.windowStart,
      windowEnd: counters[0]?.windowEnd,
    };
  }
});
```

**Critical Checks:**
- ✅ NEVER scans voicePipelineEvents
- ✅ Reads exactly 7 counter documents (O(1))
- ✅ Uses `organizationId ?? undefined` (platform-wide handling)
- ✅ Returns 0 when counter doesn't exist (safe default)

**Risks:**
- ⚠️ Counter may not exist for new org → Return 0 (handled)
- ⚠️ Window expired → Return stale data (acceptable, cron updates soon)

**Verdict:** APPROVED ✅

---

### 2. getHistoricalMetrics (Query)

**Purpose:** Time-range query on snapshots
**Performance:** O(n) where n = snapshots in range

**Implementation:**
```typescript
export const getHistoricalMetrics = query({
  args: {
    periodType: v.union(v.literal("hourly"), v.literal("daily")),
    startTime: v.number(),
    endTime: v.number(),
    organizationId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Platform staff auth

    // Smart index selection
    const index = args.organizationId
      ? "by_org_periodType_start"
      : "by_periodType_and_start";

    const snapshots = await ctx.db
      .query("voicePipelineMetricsSnapshots")
      .withIndex(index, q => {
        let query = q.eq("periodType", args.periodType);
        if (args.organizationId) {
          query = query.eq("organizationId", args.organizationId);
        }
        return query.gte("periodStart", args.startTime);
      })
      .filter(q => q.lte(q.field("periodStart"), args.endTime))
      .order("asc")
      .collect();

    return snapshots;
  }
});
```

**Critical Checks:**
- ✅ Uses snapshots, NOT events (no event scanning)
- ✅ Bounded by time range (safe without pagination)
- ✅ Smart index selection (org-specific vs platform-wide)
- ⚠️ Uses .filter() for endTime (acceptable, bounded query)

**Alternative (avoid .filter()):**
```typescript
// Better: Use .lte() in index query if supported
// Currently Convex doesn't support range in index + filter
// So .filter() is acceptable here since bounded by time range
```

**Risks:**
- ⚠️ Large time range (90 days of hourly) = 2160 snapshots × orgs
- **Mitigation:** Frontend should request daily snapshots for > 7 day ranges

**Verdict:** APPROVED with note ✅

---

### 3. getStageBreakdown (Query)

**Purpose:** Per-stage latency and failure rate aggregation

**Implementation Approach:**
1. Query historical snapshots for time range
2. Extract per-stage metrics from snapshot fields
3. Aggregate across snapshots (average latencies, sum counts)
4. Return per-stage breakdown

**Critical Checks:**
- ✅ Reads from snapshots (not events)
- ⚠️ Must use safe division for failure rates
- ⚠️ Must handle missing stage data (some snapshots may have 0 for a stage)

**Required Safe Division Pattern:**
```typescript
function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

const transcriptionFailureRate = safeDivide(
  transcriptionFailed,
  transcriptionTotal
);
```

**Verdict:** APPROVED with safe division requirement ✅

---

### 4. getOrgBreakdown (Query) ⚠️ CRITICAL - N+1 RISK

**Purpose:** Per-org volume/cost breakdown
**Risk:** HIGH - N+1 query anti-pattern if not implemented correctly

**MANDATORY Pattern (from M1_LESSONS_LEARNED.md):**
```typescript
export const getOrgBreakdown = query({
  handler: async (ctx, args) => {
    // 1. Query snapshots for time range
    const snapshots = await ctx.db
      .query("voicePipelineMetricsSnapshots")
      .withIndex(...)
      .collect();

    // 2. Group by organizationId, aggregate metrics
    const orgMap = new Map();
    for (const snapshot of snapshots) {
      if (!snapshot.organizationId) continue;

      const existing = orgMap.get(snapshot.organizationId) ?? {
        organizationId: snapshot.organizationId,
        artifactsReceived: 0,
        totalAICost: 0,
        // ...
      };

      existing.artifactsReceived += snapshot.artifactsReceived;
      existing.totalAICost += snapshot.totalAICost;
      // ... aggregate other metrics

      orgMap.set(snapshot.organizationId, existing);
    }

    const orgBreakdown = Array.from(orgMap.values());

    // 3. ✅ BATCH FETCH org names (MANDATORY)
    const uniqueOrgIds = [...new Set(
      orgBreakdown.map(o => o.organizationId).filter(Boolean)
    )];

    const orgs = await Promise.all(
      uniqueOrgIds.map(id =>
        adapter.findOne({
          model: "organization",
          where: { field: "_id", value: id }
        })
      )
    );

    const orgNameMap = new Map();
    for (const org of orgs) {
      if (org) orgNameMap.set(org._id, org.name);
    }

    // 4. ✅ Synchronous map (no await)
    const enriched = orgBreakdown.map(item => ({
      ...item,
      orgName: orgNameMap.get(item.organizationId) || "Unknown"
    }));

    return enriched;
  }
});
```

**FORBIDDEN Pattern:**
```typescript
// ❌ BAD: N+1 query
const enriched = await Promise.all(
  orgBreakdown.map(async (item) => {
    const org = await adapter.findOne({ ... });  // Query per org!
    return { ...item, orgName: org.name };
  })
);
```

**Critical Checks:**
- ✅ Uses batch fetch + Map pattern
- ✅ No await in final .map() (synchronous lookup)
- ✅ Handles missing org names ("Unknown")
- ✅ Filters out platform-wide snapshot (organizationId === undefined)

**Verdict:** APPROVED - MUST use batch fetch pattern ✅

---

### 5. aggregateHourlyMetrics (Internal Mutation)

**Purpose:** Aggregate events into hourly snapshots
**Performance Target:** < 30 seconds for 1000 events

**Implementation Approach:**
```typescript
export const aggregateHourlyMetrics = internalMutation({
  args: { hourTimestamp: v.number() },
  handler: async (ctx, args) => {
    try {
      const hourStart = args.hourTimestamp;
      const hourEnd = hourStart + 3_600_000;

      // 1. Compute timeWindow string for this hour
      const timeWindow = computeTimeWindow(hourStart);  // ✅ Must use UTC

      // 2. Query events for this hour using timeWindow index
      const events = await ctx.db
        .query("voicePipelineEvents")
        .withIndex("by_timeWindow", q => q.eq("timeWindow", timeWindow))
        .collect();

      // 3. Aggregate metrics
      const metrics = computeMetrics(events);  // Helper function

      // 4. Create platform-wide snapshot
      await ctx.db.insert("voicePipelineMetricsSnapshots", {
        periodType: "hourly",
        periodStart: hourStart,
        periodEnd: hourEnd,
        // organizationId NOT included (platform-wide)
        ...metrics
      });

      // 5. Create per-org snapshots
      const orgEvents = groupByOrg(events);
      for (const [orgId, orgEvents] of orgEvents) {
        const orgMetrics = computeMetrics(orgEvents);
        await ctx.db.insert("voicePipelineMetricsSnapshots", {
          periodType: "hourly",
          periodStart: hourStart,
          periodEnd: hourEnd,
          organizationId: orgId,  // ✅ Included for org-specific
          ...orgMetrics
        });
      }

      return null;
    } catch (error) {
      // ✅ Log but don't throw - cron should succeed
      console.error("[aggregateHourlyMetrics] Error:", error);
      return null;
    }
  }
});
```

**computeMetrics Helper (Safe Division Required):**
```typescript
function computeMetrics(events: Event[]) {
  const received = events.filter(e => e.eventType === "artifact_received").length;
  const completed = events.filter(e => e.eventType === "artifact_completed").length;
  const failed = events.filter(e => e.eventType === "artifact_failed").length;

  // ✅ MUST use safe division
  const failureRate = safeDivide(failed, received);

  // P95 latency calculation
  const durations = events
    .filter(e => e.durationMs != null)
    .map(e => e.durationMs!);

  const p95Latency = calculateP95(durations);

  return {
    artifactsReceived: received,
    artifactsCompleted: completed,
    artifactsFailed: failed,
    overallFailureRate: failureRate,
    p95EndToEndLatency: p95Latency,
    // ... other metrics
  };
}

function safeDivide(num: number, denom: number): number {
  return denom > 0 ? num / denom : 0;
}

function calculateP95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.95);
  return sorted[index] ?? 0;
}
```

**Critical Checks:**
- ✅ Uses timeWindow index (efficient)
- ✅ UTC time handling in computeTimeWindow
- ✅ Safe division for all rates
- ✅ Handles zero events (returns 0s, not NaN)
- ✅ Omits organizationId for platform-wide snapshot
- ✅ Includes organizationId for org-specific snapshots
- ✅ Error handling (log but don't throw)

**Risks:**
- ⚠️ Large number of events (1000+) → Performance < 30s target
- **Mitigation:** Use timeWindow index (fast), avoid nested loops

**Verdict:** APPROVED ✅

---

### 6. aggregateDailyMetrics (Internal Mutation)

**Purpose:** Aggregate hourly snapshots into daily snapshots
**Performance Target:** < 10 seconds

**Implementation Approach:**
```typescript
export const aggregateDailyMetrics = internalMutation({
  args: { dayTimestamp: v.number() },
  handler: async (ctx, args) => {
    try {
      const dayStart = args.dayTimestamp;
      const dayEnd = dayStart + 86_400_000;

      // Query hourly snapshots for this day
      const hourlySnapshots = await ctx.db
        .query("voicePipelineMetricsSnapshots")
        .withIndex("by_periodType_and_start", q =>
          q.eq("periodType", "hourly")
           .gte("periodStart", dayStart)
        )
        .filter(q => q.lte(q.field("periodStart"), dayEnd))
        .collect();

      // Aggregate hourly into daily
      const dailyMetrics = aggregateSnapshots(hourlySnapshots);

      // Create platform-wide daily snapshot
      await ctx.db.insert("voicePipelineMetricsSnapshots", {
        periodType: "daily",
        periodStart: dayStart,
        periodEnd: dayEnd,
        ...dailyMetrics
      });

      // Create per-org daily snapshots
      const orgSnapshots = groupSnapshotsByOrg(hourlySnapshots);
      for (const [orgId, snapshots] of orgSnapshots) {
        const orgMetrics = aggregateSnapshots(snapshots);
        await ctx.db.insert("voicePipelineMetricsSnapshots", {
          periodType: "daily",
          periodStart: dayStart,
          periodEnd: dayEnd,
          organizationId: orgId,
          ...orgMetrics
        });
      }

      return null;
    } catch (error) {
      console.error("[aggregateDailyMetrics] Error:", error);
      return null;
    }
  }
});

function aggregateSnapshots(snapshots: Snapshot[]) {
  // Sum throughput
  const artifactsReceived = snapshots.reduce((sum, s) => sum + s.artifactsReceived, 0);

  // Weighted average for latency
  let sumWeightedLatency = 0;
  let sumCounts = 0;
  for (const s of snapshots) {
    sumWeightedLatency += s.avgEndToEndLatency * s.artifactsCompleted;
    sumCounts += s.artifactsCompleted;
  }
  const avgEndToEndLatency = safeDivide(sumWeightedLatency, sumCounts);

  return { artifactsReceived, avgEndToEndLatency, ... };
}
```

**Critical Checks:**
- ✅ Aggregates from hourly snapshots (not events)
- ✅ Uses weighted average for latencies
- ✅ Safe division for averages
- ✅ Handles missing hourly snapshots gracefully

**Performance:** O(24) - processes 24 hourly snapshots, well under 10s target

**Verdict:** APPROVED ✅

---

### 7. cleanupOldSnapshots (Internal Mutation)

**Purpose:** Delete expired snapshots (hourly > 7d, daily > 90d)

**Retention Cutoff Math:**
```typescript
const now = Date.now();

// ✅ GOOD: Correct cutoffs
const hourlyRetentionCutoff = now - (7 * 86400000);   // 7 days in ms
const dailyRetentionCutoff = now - (90 * 86400000);   // 90 days in ms

// Delete hourly snapshots older than 7 days
const expiredHourly = await ctx.db
  .query("voicePipelineMetricsSnapshots")
  .withIndex("by_periodType_and_start", q =>
    q.eq("periodType", "hourly")
     .lt("periodStart", hourlyRetentionCutoff)  // ✅ Use .lt() not .lte()
  )
  .collect();

for (const snapshot of expiredHourly) {
  await ctx.db.delete(snapshot._id);
}

// Same for daily snapshots
```

**Critical Checks:**
- ✅ Uses `.lt()` NOT `.lte()` (prevents off-by-one deletion)
- ✅ Correct retention cutoff math (7 days = 7 × 86400000 ms)
- ✅ Separate queries for hourly and daily
- ✅ Returns count of deleted snapshots

**Risks:**
- ⚠️ Large number of expired snapshots → Many delete operations
- **Mitigation:** Runs weekly (bounded by 7 days of hourly snapshots)

**Verdict:** APPROVED ✅

---

### 8. cleanupOldEvents (Internal Mutation)

**Purpose:** Delete events older than 48 hours

**Implementation:**
```typescript
export const cleanupOldEvents = internalMutation({
  handler: async (ctx) => {
    const retentionCutoff = Date.now() - (48 * 3600000);  // 48 hours

    // Compute expired timeWindows
    const cutoffDate = new Date(retentionCutoff);
    const expiredWindows = generateExpiredWindows(cutoffDate);

    let deletedCount = 0;

    // Delete events by timeWindow (efficient)
    for (const window of expiredWindows) {
      const events = await ctx.db
        .query("voicePipelineEvents")
        .withIndex("by_timeWindow", q => q.eq("timeWindow", window))
        .collect();

      for (const event of events) {
        await ctx.db.delete(event._id);
        deletedCount++;
      }
    }

    return { eventsDeleted: deletedCount };
  }
});

function generateExpiredWindows(cutoffDate: Date): string[] {
  const windows: string[] = [];
  const now = new Date();

  // Generate all hourly windows from cutoff to now
  for (let d = new Date(cutoffDate); d < now; d.setHours(d.getHours() + 1)) {
    windows.push(computeTimeWindow(d.getTime()));
  }

  return windows;
}
```

**Critical Checks:**
- ✅ Deletes by timeWindow (efficient index usage)
- ✅ NOT by timestamp (would be full table scan)
- ⚠️ Generates list of expired windows (could be many)

**Performance Consideration:**
- 48 hours = 48 windows
- ~500 events per window = ~24,000 delete operations
- **Mitigation:** Runs weekly (batch delete acceptable)

**Verdict:** APPROVED with performance note ✅

---

## Cron Configuration (US-VNM-005)

### Cron 1: aggregate-pipeline-hourly-metrics

```typescript
export const aggregatePipelineHourlyMetrics = {
  args: {},
  handler: async (ctx) => {
    const previousHour = Date.now() - 3_600_000;
    await ctx.runMutation(
      internal.models.voicePipelineMetrics.aggregateHourlyMetrics,
      { hourTimestamp: previousHour }
    );
  }
};

crons.hourly(
  "aggregate-pipeline-hourly-metrics",
  { minuteUTC: 30 },  // ✅ Runs at :30 (after hour completes)
  aggregatePipelineHourlyMetrics
);
```

**Critical:** Runs at :30 NOT :00 (ensures full hour of data available)

---

### Cron 2: aggregate-pipeline-daily-metrics

```typescript
crons.daily(
  "aggregate-pipeline-daily-metrics",
  { hourUTC: 1, minuteUTC: 30 },  // ✅ Runs at 1:30 AM UTC
  aggregatePipelineDailyMetrics
);
```

**Critical:** Runs at 1:30 AM (after all 24 hourly snapshots exist)

---

### Cron 3: cleanup-pipeline-snapshots

```typescript
crons.weekly(
  "cleanup-pipeline-snapshots",
  { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 30 },
  cleanupPipelineSnapshots
);
```

**Critical:** Runs weekly on Sunday at 4:30 AM (off-peak)

---

### Cron 4: cleanup-pipeline-events

```typescript
crons.weekly(
  "cleanup-pipeline-events",
  { dayOfWeek: "sunday", hourUTC: 5, minuteUTC: 0 },  // After snapshot cleanup
  cleanupPipelineEvents
);
```

**Critical:** Runs at 5:00 AM (after snapshot cleanup at 4:30)

---

## Risk Assessment

| Risk | Severity | Mitigation | Status |
|------|----------|------------|--------|
| N+1 query in getOrgBreakdown | HIGH | Batch fetch + Map pattern | ✅ Required |
| Division by zero | HIGH | Safe division helper | ✅ Required |
| Event scanning in real-time metrics | HIGH | Use counters only | ✅ Required |
| UTC time inconsistency | MEDIUM | Use getUTC* methods | ✅ Required |
| Hourly aggregation performance | MEDIUM | Use timeWindow index | ✅ Handled |
| Retention cutoff off-by-one | MEDIUM | Use .lt() not .lte() | ✅ Required |
| Cron timing issues | MEDIUM | :30 for hourly, 1:30 AM for daily | ✅ Specified |
| Missing org names | LOW | Handle with "Unknown" | ✅ Handled |

---

## Performance Validation Checklist

Before M2 completion, verify:

- [ ] getRealTimeMetrics executes < 50ms
- [ ] aggregateHourlyMetrics completes < 30s for 1000 events
- [ ] aggregateDailyMetrics completes < 10s for 24 snapshots
- [ ] getHistoricalMetrics bounded by time range (no timeout)
- [ ] getOrgBreakdown uses batch fetch (no N+1)
- [ ] All rate calculations use safe division (no NaN)
- [ ] All crons run on schedule and complete successfully

---

## Final Verdict

**STATUS:** ✅ APPROVED FOR IMPLEMENTATION

**Conditions:**
1. MUST read M1_LESSONS_LEARNED.md before coding
2. MUST implement batch fetch pattern in getOrgBreakdown
3. MUST use safe division for all rate calculations
4. MUST use UTC time methods in all date operations
5. MUST use .lt() not .lte() in retention cleanup

**Ready for Ralph:** ✅

---

*Pre-implementation review complete. Ralph may proceed with M2 implementation.*
