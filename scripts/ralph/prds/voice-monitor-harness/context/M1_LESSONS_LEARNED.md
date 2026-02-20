# M1 Lessons Learned - Critical for M2 Success

**Date:** 2026-02-16
**Phase:** M1 → M2 Transition
**Purpose:** Capture all M1 lessons to prevent repeated mistakes in M2

---

## 🎯 Executive Summary

M1 (Backend Instrumentation) completed successfully with **100% acceptance criteria met**. However, several critical patterns and gotchas emerged that MUST be incorporated into M2 (Metrics & Aggregation).

**Key Success Factors:**
- Atomic operations (counter increment + event insert in same transaction)
- Fire-and-forget pattern (non-blocking pipeline)
- UTC time handling (critical for timeWindow consistency)
- Batch fetching (N+1 prevention)

**Key Risks for M2:**
- Aggregation performance (30-second target for 1000 events)
- Division by zero in failure rate calculations
- N+1 queries when fetching org names
- Incorrect retention cutoff math (off-by-one errors)

---

## 🔴 CRITICAL PATTERNS (Must Follow in M2)

### 1. UTC Time Handling ✅

**Issue:** PRD examples used local time methods (`getHours()`, `getMonth()`), but this causes inconsistencies across timezones.

**Solution:**
```typescript
// ❌ BAD: Local time (varies by timezone)
const hour = new Date().getHours();
const month = new Date().getMonth();

// ✅ GOOD: UTC methods (consistent globally)
const hour = new Date().getUTCHours();
const month = new Date().getUTCMonth();
const day = new Date().getUTCDate();
const year = new Date().getUTCFullYear();
```

**M1 Implementation:**
```typescript
function computeTimeWindow(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");

  return `${year}-${month}-${day}-${hour}`;
}
```

**M2 Requirement:** All time calculations in aggregation functions MUST use UTC methods.

---

### 2. Atomic Operations (Transaction Integrity) ✅

**Issue:** Counter increment and event insert must happen in same transaction to prevent inconsistencies.

**Solution:**
```typescript
export const logEvent = internalMutation({
  handler: async (ctx, args) => {
    // ✅ GOOD: Both operations in same transaction

    // Step 1: Insert event
    const eventId = await ctx.db.insert("voicePipelineEvents", { ... });

    // Step 2: Increment counter (SAME transaction)
    await ctx.db.patch(counter._id, {
      currentValue: counter.currentValue + 1
    });

    return eventId;
  }
});
```

**M2 Requirement:** Snapshot insertion and cleanup operations should be atomic where possible.

---

### 3. N+1 Query Prevention (Batch Fetching) ⚠️ CRITICAL FOR M2

**Issue:** Querying organization names one-by-one in M2's `getOrgBreakdown` would cause N+1 performance problem.

**M1 Experience:** This pattern was documented but not yet needed in M1. M2 MUST implement it.

**Solution (from PHASE_M2.json):**
```typescript
// ✅ GOOD: Batch fetch + Map lookup pattern
// Step 1: Collect unique org IDs from snapshots
const uniqueOrgIds = [...new Set(snapshots.map(s => s.organizationId).filter(Boolean))];

// Step 2: Batch fetch all orgs at once using Better Auth adapter
const orgs = await Promise.all(
  uniqueOrgIds.map(id =>
    adapter.findOne({
      model: 'organization',
      where: { field: '_id', value: id }
    })
  )
);

// Step 3: Create Map for O(1) lookup
const orgMap = new Map();
for (const org of orgs) {
  if (org) orgMap.set(org._id, org.name);
}

// Step 4: Synchronous map using pre-fetched data (no await)
const enrichedBreakdown = orgBreakdown.map(item => ({
  ...item,
  orgName: orgMap.get(item.organizationId) || 'Unknown'
}));

// ❌ BAD: Query per org in loop (N+1 anti-pattern)
// const enriched = await Promise.all(
//   orgBreakdown.map(async (item) => {
//     const org = await adapter.findOne({ ... });  // Query per item!
//     return { ...item, orgName: org.name };
//   })
// );
```

**M2 Requirement:** `getOrgBreakdown` function MUST use batch fetch pattern.

---

### 4. Fire-and-Forget Event Logging ✅

**Issue:** Event logging must not block pipeline execution.

**M1 Solution:**

**For Mutations:**
```typescript
// ✅ GOOD: Scheduler (fire-and-forget)
await ctx.scheduler.runAfter(
  0,
  internal.models.voicePipelineEvents.logEvent,
  { ... }
);
```

**For Actions:**
```typescript
// ✅ GOOD: runMutation with try/catch
try {
  await ctx.runMutation(
    internal.models.voicePipelineEvents.logEvent,
    { ... }
  );
} catch (error) {
  // Log but don't throw - event logging failures shouldn't break pipeline
  console.error("Event logging failed:", error);
}
```

**M2 Requirement:** Not directly applicable (M2 doesn't add pipeline logging), but aggregation functions should handle errors gracefully.

---

### 5. Error Handling in logEvent ✅

**Issue:** Event logging errors shouldn't crash the pipeline.

**M1 Solution:**
```typescript
export const logEvent = internalMutation({
  handler: async (ctx, args) => {
    try {
      // ... event insertion logic ...
      return insertedId;
    } catch (error) {
      // Fire-and-forget pattern: log error but don't throw
      console.error("[voicePipelineEvents.logEvent] Failed:", error);
      return "";  // Return empty string on error
    }
  }
});
```

**M2 Requirement:** Aggregation functions should log errors but complete successfully even with partial data.

---

### 6. Division by Zero Prevention ⚠️ CRITICAL FOR M2

**Issue:** Aggregation functions calculate rates (failures / total). If total is 0, this causes NaN or Infinity.

**Solution:**
```typescript
// ❌ BAD: Can cause NaN
const failureRate = artifactsFailed / artifactsReceived;

// ✅ GOOD: Handle zero case
const failureRate = artifactsReceived > 0
  ? artifactsFailed / artifactsReceived
  : 0;

// ✅ GOOD: Safe division helper
function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

const failureRate = safeDivide(artifactsFailed, artifactsReceived);
```

**M2 Requirement:** ALL rate calculations must handle zero denominators.

---

### 7. Atomic Imports (Linter Compliance) ✅

**Issue:** Adding import in one edit and usage in another causes linter to remove "unused" import.

**M1 Solution:** Always add import + usage in SAME edit operation.

```typescript
// ✅ GOOD: Import and usage in same edit
import { internal } from "./_generated/api";

// Immediately use it
await ctx.scheduler.runAfter(
  0,
  internal.models.voicePipelineEvents.logEvent,
  { ... }
);

// ❌ BAD: Import in one edit, usage in next edit
// Edit 1: import { internal } from "./_generated/api";
// Edit 2: await ctx.scheduler.runAfter(...)  // Import removed by linter!
```

**M2 Requirement:** When creating voicePipelineMetrics.ts, add all imports atomically with first usage.

---

## 🟡 GOTCHAS ENCOUNTERED IN M1

### 1. timeWindow is v.string() not v.number()

**Issue:** Using v.number() for timeWindow field breaks cleanup logic.

**Reason:** String format 'YYYY-MM-DD-HH' allows efficient index-based cleanup by hour.

**Correct Schema:**
```typescript
timeWindow: v.string(), // Format: 'YYYY-MM-DD-HH'
```

**M2 Implication:** Aggregation functions must parse timeWindow strings correctly.

---

### 2. eventId is v.string() (UUID) not v.id()

**Issue:** Using v.id() causes Convex to generate IDs, but we need UUIDs for deduplication.

**Reason:** Events may be re-emitted on retry. UUID allows idempotent insertion.

**Correct Schema:**
```typescript
eventId: v.string(), // UUID for deduplication
```

**M2 Implication:** Not directly applicable (snapshots use Convex IDs).

---

### 3. Platform-Wide Counter organizationId

**Issue:** For platform-wide counters, must OMIT organizationId (not set to null).

**Reason:** Convex optional fields: `undefined` !== `null`.

**Correct Usage:**
```typescript
// ✅ GOOD: Platform-wide counter (omit field)
await ctx.db.insert("voicePipelineCounters", {
  counterType: "artifacts_received_1h",
  // organizationId NOT included
  currentValue: 1,
  windowStart: now,
  windowEnd: now + 3600000
});

// ✅ GOOD: Org-specific counter (include field)
await ctx.db.insert("voicePipelineCounters", {
  counterType: "artifacts_received_1h",
  organizationId: "org_abc123",  // Explicitly set
  currentValue: 1,
  windowStart: now,
  windowEnd: now + 3600000
});

// ✅ GOOD: Query platform-wide counter
const counter = await ctx.db
  .query("voicePipelineCounters")
  .withIndex("by_counterType_and_org", q =>
    q.eq("counterType", "artifacts_received_1h")
     .eq("organizationId", undefined)  // Match undefined, not null
  )
  .first();
```

**M2 Requirement:** Snapshot creation for platform-wide metrics must omit organizationId.

---

### 4. Metadata Fields Must Use v.optional()

**Issue:** Metadata object fields without v.optional() cause validation errors when missing.

**Correct Schema:**
```typescript
metadata: v.optional(
  v.object({
    claimCount: v.optional(v.number()),
    entityCount: v.optional(v.number()),
    // All fields optional
  })
),
```

**M2 Implication:** Snapshot schema already uses v.optional() correctly. Aggregation must handle missing metadata.

---

### 5. Better Auth Adapter Fields

**Issue:** Better Auth user/org objects have specific field names.

**Correct Usage:**
```typescript
// ✅ GOOD: Better Auth organization fields
const org = await adapter.findOne({
  model: 'organization',
  where: { field: '_id', value: orgId }
});
const orgName = org.name;  // NOT org.orgName or org.displayName

// ✅ GOOD: Better Auth user fields
const user = await authComponent.safeGetAuthUser(ctx);
const userId = user._id;  // NOT user.id or user.userId
const userName = user.name;  // NOT user.firstName + user.lastName
```

**M2 Requirement:** When fetching org names in `getOrgBreakdown`, use `org.name`.

---

## 📊 PERFORMANCE PATTERNS

### 1. Real-Time Metrics Must Not Scan Events ⚠️ CRITICAL FOR M2

**M1 Lesson:** Counters were created specifically to avoid scanning voicePipelineEvents for real-time metrics.

**M2 Requirement:**
```typescript
// ✅ GOOD: O(1) - Read from counters
export const getRealTimeMetrics = query({
  handler: async (ctx, args) => {
    // Query 7-8 counter documents (O(1))
    const artifactsReceived = await ctx.db
      .query("voicePipelineCounters")
      .withIndex("by_counterType_and_org", q =>
        q.eq("counterType", "artifacts_received_1h")
         .eq("organizationId", args.organizationId ?? undefined)
      )
      .first();

    return {
      artifactsReceived1h: artifactsReceived?.currentValue ?? 0,
      // ... other counters ...
    };
  }
});

// ❌ BAD: O(n) - Scanning events (FORBIDDEN)
// const events = await ctx.db
//   .query("voicePipelineEvents")
//   .withIndex("by_timestamp", q =>
//     q.gte("timestamp", Date.now() - 3600000)
//   )
//   .collect();  // Could be thousands of events!
```

**Performance Target:** getRealTimeMetrics < 50ms

---

### 2. Historical Queries Use Snapshots, Not Events

**M1 Lesson:** voicePipelineMetricsSnapshots table was created to pre-compute metrics.

**M2 Requirement:**
```typescript
// ✅ GOOD: Query snapshots (bounded by time range)
const snapshots = await ctx.db
  .query("voicePipelineMetricsSnapshots")
  .withIndex("by_periodType_and_start", q =>
    q.eq("periodType", "hourly")
     .gte("periodStart", startTime)
     .lte("periodStart", endTime)
  )
  .collect();

// ❌ BAD: Scanning raw events (FORBIDDEN for historical queries)
// const events = await ctx.db
//   .query("voicePipelineEvents")
//   .withIndex("by_timestamp", ...)
//   .collect();  // Unbounded query!
```

---

### 3. Aggregation Performance Targets

**M2 Targets (from PHASE_M2.json):**
- Hourly aggregation: < 30 seconds for 1000 events
- Daily aggregation: < 10 seconds (aggregates 24 hourly snapshots)
- Real-time metrics: < 50ms
- Historical metrics: O(n) where n = number of snapshots in time range

**Strategies:**
- Use timeWindow index for efficient hourly aggregation
- Aggregate daily from hourly snapshots (not raw events)
- Batch insert snapshots when possible
- Handle missing data gracefully (don't throw errors)

---

### 4. Pagination vs. Bounded Queries

**M1 Lesson:** Some queries are naturally bounded and don't need pagination.

**M1 Examples:**
```typescript
// ✅ Needs pagination: unbounded list
export const getRecentEvents = query({
  handler: async (ctx, args) => {
    return await ctx.db
      .query("voicePipelineEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .paginate(args.paginationOpts);  // REQUIRED
  }
});

// ✅ No pagination needed: bounded by artifact
export const getEventsByArtifact = internalQuery({
  handler: async (ctx, args) => {
    return await ctx.db
      .query("voicePipelineEvents")
      .withIndex("by_artifactId", q => q.eq("artifactId", args.artifactId))
      .collect();  // Safe - max ~20 events per artifact
  }
});
```

**M2 Guidance:**
- Historical metrics: bounded by time range, pagination not needed
- Org breakdown: bounded by number of orgs (~10-100), no pagination
- Cleanup queries: Use .collect() since deleting all expired items

---

## 🧪 TESTING LESSONS

### 1. Manual Testing via Convex Dashboard Works Best

**M1 Experience:** E2E tests were created but required extensive setup. Manual testing via Convex dashboard was faster and more effective.

**M2 Strategy:**
1. Create test events spanning 2 hours
2. Manually call aggregateHourlyMetrics via dashboard
3. Query voicePipelineMetricsSnapshots to verify snapshots
4. Test all query functions via dashboard Functions tab
5. Manually trigger crons to verify execution

**Tools:**
- Convex Dashboard → Data tab (inspect tables)
- Convex Dashboard → Functions tab (test queries/mutations)
- Convex Dashboard → Crons tab (manual trigger, view logs)
- Convex Dashboard → Logs (check execution times)

---

### 2. Schema Validation via Codegen

**M1 Experience:** Running codegen immediately catches schema errors.

**M2 Requirement:** Run `npx -w packages/backend convex codegen` after every schema change.

---

### 3. Type Checking Catches Edge Cases

**M1 Experience:** TypeScript caught missing return types, incorrect validators.

**M2 Requirement:** Run `npm run check-types` before completing each story.

---

## 🚀 M2-SPECIFIC GUIDANCE

### Aggregation Logic Implementation

**P95 Latency Calculation:**
```typescript
// ✅ GOOD: Correct P95 calculation
function calculateP95(durations: number[]): number {
  if (durations.length === 0) return 0;

  const sorted = [...durations].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.95);

  return sorted[index] ?? 0;
}
```

**Weighted Average (for daily aggregation from hourly):**
```typescript
// ✅ GOOD: Weighted average
function weightedAverage(hourlySnapshots: Snapshot[]): number {
  let sumWeighted = 0;
  let sumCounts = 0;

  for (const snapshot of hourlySnapshots) {
    sumWeighted += snapshot.avgLatency * snapshot.artifactsCompleted;
    sumCounts += snapshot.artifactsCompleted;
  }

  return sumCounts > 0 ? sumWeighted / sumCounts : 0;  // Safe division
}
```

**Failure Rate:**
```typescript
// ✅ GOOD: Safe failure rate
const failureRate = safeDivide(artifactsFailed, artifactsReceived);
```

---

### Retention Cutoff Calculation

**Critical Math:**
```typescript
// ✅ GOOD: Correct retention cutoffs
const now = Date.now();

// 7 days ago
const hourlyRetentionCutoff = now - (7 * 24 * 60 * 60 * 1000);
// OR: now - (7 * 86400000)

// 90 days ago
const dailyRetentionCutoff = now - (90 * 24 * 60 * 60 * 1000);
// OR: now - (90 * 86400000)

// 48 hours ago
const eventRetentionCutoff = now - (48 * 60 * 60 * 1000);
// OR: now - (48 * 3600000)
```

**Off-by-One Prevention:**
- Use `.lt("periodStart", cutoff)` (less than) for "older than X days"
- NOT `.lte()` (would delete snapshots from exactly 7 days ago)

---

### Cron Timing

**Critical Timings:**
```typescript
// ✅ GOOD: Hourly at :30 (after full hour completes)
crons.hourly("aggregate-pipeline-hourly-metrics", { minuteUTC: 30 }, ...);

// ✅ GOOD: Daily at 1:30 AM (after all hourly snapshots exist)
crons.daily("aggregate-pipeline-daily-metrics", { hourUTC: 1, minuteUTC: 30 }, ...);

// ✅ GOOD: Weekly on Sunday at 4:30 AM (off-peak)
crons.weekly("cleanup-pipeline-snapshots", { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 30 }, ...);
```

**Why :30 not :00?**
- Hour completes at :00:00
- Counter rotates at :00:00
- Need buffer time to ensure all events logged
- :30 provides 30-minute safety margin

---

## 📋 M2 PRE-FLIGHT CHECKLIST

Before Ralph starts M2, verify:

- [ ] M1 fully deployed (schema, functions, instrumentation)
- [ ] voicePipelineEvents has data (events being logged)
- [ ] voicePipelineCounters has data (counters incrementing)
- [ ] Platform staff auth working
- [ ] UTC time handling verified
- [ ] All M1 acceptance criteria met (100%)
- [ ] This lessons document reviewed by Ralph
- [ ] M2 PRD updated with all lessons

---

## 🎓 KEY TAKEAWAYS FOR RALPH

1. **USE UTC TIME EVERYWHERE** - getUTCHours(), getUTCMonth(), getUTCDate()
2. **PREVENT N+1 QUERIES** - Batch fetch org names using Map pattern
3. **SAFE DIVISION** - Always check denominator > 0 before dividing
4. **NO EVENT SCANNING** - Real-time metrics read counters, not events
5. **BOUNDED QUERIES** - Historical metrics bounded by time range
6. **ATOMIC IMPORTS** - Add import + usage in same edit
7. **ERROR HANDLING** - Log errors but complete successfully with partial data
8. **CRON TIMING** - :30 for hourly, 1:30 AM for daily
9. **TESTING** - Use Convex dashboard for manual verification
10. **PERFORMANCE** - Targets: getRealTimeMetrics < 50ms, hourly aggregation < 30s

---

*This document should be read by Ralph before starting M2 and referenced during implementation.*
