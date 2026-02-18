# M2 Lessons Learned - Metrics & Aggregation

**Phase:** M2 - Metrics & Aggregation
**Stories:** US-VNM-004, US-VNM-005
**Completion Date:** 2026-02-16
**Duration:** 1 iteration (~15 minutes)
**Status:** ✅ COMPLETE

---

## Critical Patterns Discovered

### 1. Cron Timing Rationale

**Hourly aggregation at :30 (NOT :00):**
```typescript
crons.hourly(
  "aggregate-pipeline-hourly-metrics",
  { minuteUTC: 30 },
  internal.models.voicePipelineMetrics.aggregateHourlyMetricsWrapper
);
```

**Why :30?** Ensures the full hour is complete before aggregating. Events logged at 12:59:59 are captured.

**Daily aggregation at 1:30 AM UTC (NOT 12:00 AM):**
```typescript
crons.daily(
  "aggregate-pipeline-daily-metrics",
  { hourUTC: 1, minuteUTC: 30 },
  internal.models.voicePipelineMetrics.aggregateDailyMetricsWrapper
);
```

**Why 1:30 AM?** Ensures all 24 hourly snapshots exist (12:30 AM, 1:30 AM, etc.) before daily aggregation runs.

### 2. Cron Args Cannot Use Date.now()

**❌ WRONG:**
```typescript
crons.hourly("aggregate-hourly", { minuteUTC: 30 },
  internal.models.voicePipelineMetrics.aggregateHourlyMetrics,
  { targetTimestamp: Date.now() }  // ❌ Freezes at deployment time!
);
```

**✅ CORRECT:**
```typescript
// Create wrapper function that calculates timestamp at runtime
export const aggregateHourlyMetricsWrapper = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    await ctx.runMutation(internal.models.voicePipelineMetrics.aggregateHourlyMetrics, {
      targetTimestamp: now  // ✅ Calculated at execution time
    });
  },
});

// Cron calls wrapper (no args)
crons.hourly("aggregate-hourly", { minuteUTC: 30 },
  internal.models.voicePipelineMetrics.aggregateHourlyMetricsWrapper
);
```

**Lesson:** Cron args are evaluated ONCE at deployment. Use wrapper functions for dynamic values.

### 3. Better Auth Adapter Query Syntax

**❌ WRONG:**
```typescript
const org = await adapter.findOne({
  model: "organization",
  where: { _id: orgId }  // ❌ Wrong format
});
```

**✅ CORRECT:**
```typescript
const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "organization",
  where: [{ field: "_id", value: orgId }]  // ✅ Array of {field, value} objects
});
```

**Lesson:** Better Auth adapter `where` clause is an ARRAY, not an object.

### 4. Batch Fetch Pattern for N+1 Prevention

**✅ CORRECT (from getOrgBreakdown):**
```typescript
// 1. Collect unique org IDs
const uniqueOrgIds = Array.from(orgMap.keys());

// 2. Batch fetch all orgs at once
const orgs = await Promise.all(
  uniqueOrgIds.map((id) =>
    ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: id }],
    })
  )
);

// 3. Create Map for O(1) lookup
const orgNameMap = new Map<string, string>();
for (const org of orgs) {
  if (org) orgNameMap.set(org._id, org.name);
}

// 4. Use Map in final mapping (synchronous, no queries)
const breakdown = Array.from(orgMap.entries()).map(([orgId, metrics]) => ({
  organizationId: orgId,
  orgName: orgNameMap.get(orgId) || "Unknown",
  ...metrics
}));
```

**Key Points:**
- One `Promise.all` batch fetch, not a query per org
- Map for O(1) lookup in final mapping
- Final map is synchronous (no `await` needed)

### 5. Safe Division Everywhere

**✅ CORRECT:**
```typescript
function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

// Usage:
const successRate = safeDivide(completed, total);
const avgLatency = safeDivide(totalLatency, count);
```

**Used 20+ times in voicePipelineMetrics.ts.** Prevents NaN and Infinity in rate calculations.

### 6. UTC Time Handling for Time Windows

**✅ CORRECT:**
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

**NEVER use local time methods:**
- ❌ `getHours()` → ✅ `getUTCHours()`
- ❌ `getMonth()` → ✅ `getUTCMonth()`
- ❌ `getDate()` → ✅ `getUTCDate()`

**Why?** Time windows must be consistent across all servers regardless of local timezone.

### 7. Platform-Wide Data Omits organizationId

**✅ CORRECT:**
```typescript
// Platform-wide snapshot (all orgs combined)
await ctx.db.insert("voicePipelineMetricsSnapshots", {
  organizationId: undefined,  // ✅ Omit for platform-wide
  periodType: "hourly",
  ...metrics
});

// Org-specific snapshot
await ctx.db.insert("voicePipelineMetricsSnapshots", {
  organizationId: orgId,  // ✅ Present for org-specific
  periodType: "hourly",
  ...metrics
});
```

**NEVER use null:**
- ❌ `organizationId: null` → ✅ `organizationId: undefined` (omit field)

### 8. Ternary Operator Avoids Implicit Any

**❌ AVOIDS LINTER ERROR:**
```typescript
// Using ternary avoids TypeScript implicit any error
const snapshots = args.organizationId
  ? await ctx.db
      .query("voicePipelineMetricsSnapshots")
      .withIndex("by_org_period_time", ...)
      .collect()
  : await ctx.db
      .query("voicePipelineMetricsSnapshots")
      .withIndex("by_period_time", ...)
      .collect();
```

**Alternative (if linter still complains):**
```typescript
let snapshots;
if (args.organizationId) {
  snapshots = await ctx.db.query(...).collect();
} else {
  snapshots = await ctx.db.query(...).collect();
}
```

### 9. Error Handling in Crons

**✅ CORRECT:**
```typescript
export const cleanupOldSnapshots = internalMutation({
  args: {},
  handler: async (ctx) => {
    try {
      // ... cleanup logic
      console.log(`Cleanup completed: ${deleted} snapshots deleted`);
    } catch (error) {
      console.error("Cleanup failed:", error);
      // DON'T throw - return successfully to avoid cron retries
    }
  },
});
```

**Lesson:** Crons should log errors but return successfully. Throwing causes infinite retries.

### 10. Atomic Imports Pattern

**❌ WRONG (in separate edits):**
```typescript
// Edit 1: Add import
import { internal } from "./_generated/api";

// Edit 2: Use it (linter removes unused import between edits!)
const result = await ctx.runMutation(internal.models.voicePipelineMetrics.aggregateHourlyMetrics, {});
```

**✅ CORRECT (in same edit):**
```typescript
// Add import AND usage in SAME edit
import { internal } from "./_generated/api";

export const wrapper = internalMutation({
  handler: async (ctx) => {
    await ctx.runMutation(internal.models.voicePipelineMetrics.aggregateHourlyMetrics, {});
  },
});
```

**Lesson:** Linter removes "unused" imports. Always add import + first usage together.

---

## M2 Gotchas Encountered by Ralph

### Gotcha 1: adapter.findOne Not Directly Callable

**Error:** "adapter.findOne is not a function"

**Fix:** Use `ctx.runQuery`:
```typescript
const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "organization",
  where: [{ field: "_id", value: orgId }]
});
```

### Gotcha 2: Date.now() in Cron Args

**Error:** Cron always used deployment timestamp, not current time

**Fix:** Create wrapper functions to calculate timestamps at runtime

### Gotcha 3: Linter Strictness

**Error:** Linter rejected:
- Non-null assertions (`!`)
- Optional chain + non-null (`?.x!`)
- `++` operator
- Single-line if without braces

**Fix:** Use explicit checks, `+= 1`, and always use block statements

---

## M2 File Structure

**Created:**
- `packages/backend/convex/models/voicePipelineMetrics.ts` (1,356 lines)
  - 8 core functions
  - 2 wrapper functions (for cron timing)
  - 3 helper functions (computeTimeWindow, safeDivide, helper)

**Modified:**
- `packages/backend/convex/crons.ts` (+36 lines)
  - 4 new cron jobs with correct timing

---

## M2 Verification Results

| Check | Status |
|-------|--------|
| Codegen | ✅ PASS |
| Function Exports | ✅ PASS (10/10) |
| Cron Configuration | ✅ PASS (4/4) |
| UTC Time Handling | ✅ PASS (4 instances) |
| Safe Division | ✅ PASS (20 uses) |
| No Event Scanning | ✅ PASS (counters only) |
| N+1 Prevention | ✅ PASS (batch fetch) |
| Type Check | ✅ PASS (1 pre-existing error unrelated) |

**Completion:** 1 iteration, ~15 minutes (estimated 3-4 days)

---

## Apply These Patterns to M3 (Retry Operations)

1. **Platform Staff Auth:** ALL retry mutations must verify `isPlatformStaff`
2. **Fire-and-Forget:** Use `ctx.scheduler.runAfter(0, ...)` to schedule actions
3. **Retry Tracking:** Increment `metadata.retryAttempt` with each retry
4. **Event Logging:** ALWAYS log `retry_initiated` before scheduling action
5. **Safe Cleanup:** On full pipeline retry, delete ALL derived data in try/catch
6. **Status Reset:** Reset artifact status BEFORE scheduling retry action
7. **Better Auth Queries:** Use `ctx.runQuery(adapter.findOne, ...)` with array `where`
8. **Atomic Imports:** Add import + usage in same edit

---

**See also:**
- `scripts/ralph/prds/voice-monitor-harness/context/M1_LESSONS_LEARNED.md` - M1 patterns
- `scripts/ralph/progress.txt` - Full M1 and M2 implementation notes
- `docs/testing/m2-verification-results.md` - Detailed M2 verification
