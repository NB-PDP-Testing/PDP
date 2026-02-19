# M4 Lessons Learned - Pipeline Alerts & Health Monitoring

**Phase:** M4 - Automated Anomaly Detection
**Completed:** 2026-02-16
**Files Created:** voicePipelineAlerts.ts, cron job
**Commit:** 11de6a7a86665b96032dbca2bf2ff26aa6d64cdb

---

## ✅ What Worked Well

### 1. **Schema Extension Strategy**
Instead of creating a new `voicePipelineAlerts` table, Ralph successfully extended the existing `platformCostAlerts` table by:
- Adding 6 new PIPELINE_* alert types to the alertType union
- Adding 3 new severity levels (high, medium, low) to the severity union
- Adding optional `metadata` field (v.optional(v.any())) for alert-specific data
- Making existing fields optional for backward compatibility

**Result:** Reused existing infrastructure without breaking existing cost alerts.

### 2. **Counter-Based Metrics (Not Event Scans)**
All real-time health checks read from `voicePipelineCounters` instead of scanning events:
- O(1) performance regardless of event volume
- Query specific counterType values: `artifacts_completed_1h`, `artifacts_failed_1h`
- Access via `currentValue` field, NOT individual named fields

### 3. **State-Based Alert Deduplication**
Deduplication checks for existing **unacknowledged** alerts of the same type:
```typescript
const existingAlerts = await ctx.db
  .query("platformCostAlerts")
  .withIndex("by_acknowledged", q => q.eq("acknowledged", false))
  .collect();

const hasDuplicate = existingAlerts.some(
  alert => alert.alertType === "PIPELINE_HIGH_FAILURE_RATE"
);
```
**Result:** No alert spam - maximum 1 unacknowledged alert per type at any time.

### 4. **7-Day Latency Baseline**
Historical average calculated from 168 hourly snapshots:
```typescript
const hourlySnapshots = await ctx.db
  .query("voicePipelineMetricsSnapshots")
  .withIndex("by_periodType_and_start", q => q.eq("periodType", "hourly"))
  .order("desc")
  .collect();

const last168Snapshots = hourlySnapshots.slice(0, 168);
// Calculate average from snapshots with completions > 0
```
**Result:** Accurate baseline even with data gaps.

### 5. **Cron Job Simplicity**
No wrapper function needed (unlike M2) because health check takes no args:
```typescript
crons.interval(
  "check-pipeline-health",
  { minutes: 5 },
  internal.models.voicePipelineAlerts.checkPipelineHealth,
  {}
);
```

---

## 🚨 Critical Patterns Learned

### 1. **voicePipelineCounters Schema Structure**

**WRONG (initial attempt):**
```typescript
totalCompleted += counter.completed ?? 0;
totalFailures += counter.failures ?? 0;
```

**CORRECT:**
```typescript
const completedCounter = await ctx.db
  .query("voicePipelineCounters")
  .withIndex("by_counterType_and_org", q =>
    q.eq("counterType", "artifacts_completed_1h")
     .eq("organizationId", undefined)  // Platform-wide
  )
  .first();

const totalCompleted = completedCounter?.currentValue ?? 0;
```

**Why:** voicePipelineCounters uses generic structure:
- `counterType: string` (e.g., "artifacts_completed_1h", "failures_1h")
- `currentValue: number` (the actual count)
- Query by counterType, read currentValue

---

### 2. **Index Names Must Match Schema Exactly**

**Common Index Name Errors (FIXED):**

| Wrong (Assumed) | Correct (Actual) | Table |
|-----------------|------------------|-------|
| `by_periodType_and_windowEnd` | `by_periodType_and_start` | voicePipelineMetricsSnapshots |
| `by_status` | `by_status_and_createdAt` | voiceNoteArtifacts |
| `by_status` | `by_status_and_createdAt` | voiceNoteEntityResolutions |

**Lesson:** Always grep schema.ts to verify index names before using them.

---

### 3. **Safe Division Pattern (MANDATORY)**

**Problem:** Divide-by-zero when no artifacts processed yet
```typescript
// ❌ WRONG: Can produce NaN or Infinity
const failureRate = totalFailures / (totalCompleted + totalFailures);
```

**Solution:**
```typescript
// ✅ CORRECT: Guard against zero denominator
const totalProcessed = totalCompleted + totalFailures;
const failureRate = totalProcessed > 0
  ? totalFailures / totalProcessed
  : 0;
```

**Use everywhere:** Failure rates, success rates, averages, any division.

---

### 4. **TypeScript Literal Type Narrowing**

**Problem:** Status array loses literal types in loop
```typescript
// ❌ Type widened to string[]
const statuses = ["received", "transcribing", "transcribed"];

for (const status of statuses) {
  // TypeScript error: status is 'string', not literal type
  .withIndex("by_status_and_createdAt", q => q.eq("status", status))
}
```

**Solution:**
```typescript
// ✅ Use 'as const' to preserve literal types
const statuses = ["received", "transcribing", "transcribed"] as const;
```

---

### 5. **Alert Severity Ordering**

**In-Memory Sort Safe (Max 6 Active Alerts):**
```typescript
const severityOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

alerts.sort((a, b) => {
  const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
  if (severityDiff !== 0) return severityDiff;
  return b.createdAt - a.createdAt;  // Newest first
});
```

**Why safe:** Maximum 6 unacknowledged alerts (one per type), sorting in memory is fine.

---

### 6. **Queue Depth Calculation**

**Multi-Status Count Pattern:**
```typescript
const activeStatuses = ["received", "transcribing", "transcribed", "processing"] as const;

let queueDepth = 0;
for (const status of activeStatuses) {
  const artifacts = await ctx.db
    .query("voiceNoteArtifacts")
    .withIndex("by_status_and_createdAt", q => q.eq("status", status))
    .collect();
  queueDepth += artifacts.length;
}
```

**Why:** Can't query multiple statuses in one index query, so count separately and sum.

---

### 7. **Cron Error Handling**

**DON'T throw in cron mutations:**
```typescript
try {
  // Health checks...
  return { alertsCreated, checksPerformed };
} catch (error) {
  console.error("Health check error:", error);
  // Don't throw - return successfully to prevent infinite cron retries
  return {
    alertsCreated: 0,
    checksPerformed: ["error_occurred"]
  };
}
```

**Why:** Throwing causes Convex to retry the cron indefinitely.

---

## ⚠️ Gotchas Encountered

### 1. **Import Path Variations**
- Some files use `import { authComponent } from "../auth"`
- Others use `import { authComponent } from "../lib/authComponent"`
- **Solution:** Check existing files in same directory for correct import pattern

### 2. **Optional Fields in Schema**
When extending existing tables:
- Make new fields `v.optional()` for backward compatibility
- Make previously required fields optional if needed: `triggerValue: v.optional(v.number())`
- Use fallback values when reading: `alert.createdAt ?? alert.timestamp ?? 0`

### 3. **JavaScript .filter() vs Convex .filter()**
The linter flags ALL `.filter()` usage, but JavaScript array `.filter()` is CORRECT:
```typescript
// ✅ CORRECT: JavaScript array filter (NOT a Convex query)
const retryEvents = prevRetries.filter(
  event => event.eventType === "retry_initiated"
);
```

Add comment to clarify:
```typescript
// Filter collected array (JavaScript .filter(), not Convex query .filter())
```

---

## 📊 M4 Metrics

**Files Created:**
- `voicePipelineAlerts.ts` (610 lines)

**Files Modified:**
- `schema.ts` (+21 lines - extended platformCostAlerts)
- `crons.ts` (+7 lines - added health check cron)

**Functions Implemented:**
- `checkPipelineHealth` (internalMutation, 6 health checks)
- `getActiveAlerts` (query, platform staff only)
- `acknowledgeAlert` (mutation, platform staff only)
- `getAlertHistory` (query, paginated with filters)

**Indexes Used:**
- `by_counterType_and_org` (voicePipelineCounters)
- `by_periodType_and_start` (voicePipelineMetricsSnapshots)
- `by_status_and_createdAt` (voiceNoteArtifacts)
- `by_status_and_createdAt` (voiceNoteEntityResolutions)
- `by_eventType_and_timestamp` (voicePipelineEvents)
- `by_acknowledged` (platformCostAlerts)

**Alert Types Created:**
1. `PIPELINE_HIGH_FAILURE_RATE` (severity: high)
2. `PIPELINE_HIGH_LATENCY` (severity: medium)
3. `PIPELINE_HIGH_QUEUE_DEPTH` (severity: medium)
4. `PIPELINE_DISAMBIGUATION_BACKLOG` (severity: low)
5. `PIPELINE_CIRCUIT_BREAKER_OPEN` (severity: critical)
6. `PIPELINE_INACTIVITY` (severity: low)

---

## 🎯 Key Takeaways for M5 (Dashboard UI)

### Backend Queries Available for Dashboard:

**Real-Time Metrics:**
```typescript
api.models.voicePipelineMetrics.getRealTimeMetrics()
// Returns: { completed, failures, latency, etc. }
```

**Historical Metrics:**
```typescript
api.models.voicePipelineMetrics.getHistoricalMetrics({
  periodType: "hourly",
  limit: 168
})
```

**Recent Events:**
```typescript
api.models.voicePipelineEvents.getRecentEvents({
  filters: {},
  paginationOpts: { numItems: 20 }
})
```

**Active Alerts:**
```typescript
api.models.voicePipelineAlerts.getActiveAlerts()
// Returns unacknowledged PIPELINE_* alerts sorted by severity
```

### Counter Schema for Dashboard Cards:
Query counters by type, access `.currentValue`:
- `artifacts_received_1h` - Total received
- `artifacts_completed_1h` - Completed count
- `artifacts_failed_1h` - Failed count
- `transcriptions_completed_1h` - Transcription count
- `claims_extracted_1h` - Claims count
- `entities_resolved_1h` - Resolution count
- `drafts_generated_1h` - Draft count

### Platform Staff Auth Pattern:
```typescript
// Server component (layout.tsx):
const session = await authClient.getSession();
if (!session?.user?.isPlatformStaff) {
  redirect('/platform');
}
```

---

## 📝 Documentation Generated

**ADRs Created (M4 only):**
- ADR-VNM-008: Alert Storage Strategy
- ADR-VNM-009: Health Check Execution Model
- ADR-VNM-010: Alert Deduplication Mechanism
- ADR-VNM-011: Latency Baseline Calculation
- ADR-VNM-012: Alert Severity Classification
- ADR-VNM-013: Cron Scheduling Strategy

**Total ADRs (M1-M4):** 13

---

## ✅ M4 Success Criteria Met

- [x] voicePipelineAlerts.ts created with 4 functions
- [x] checkPipelineHealth runs successfully (6 health checks)
- [x] All 6 alert types can be triggered
- [x] Alert deduplication works (no duplicates)
- [x] getActiveAlerts returns unacknowledged PIPELINE_* alerts only
- [x] acknowledgeAlert marks alerts as acknowledged
- [x] getAlertHistory returns paginated results
- [x] Cron job added (every 5 minutes)
- [x] Safe division implemented
- [x] Latency baseline from 168 snapshots
- [x] Platform staff auth on all functions
- [x] Codegen passes
- [x] Type checks pass

---

## 🚀 Ready for M5

**Backend Complete:**
- All metrics queries implemented (M2)
- All event logging working (M1)
- All retry operations working (M3)
- All alert operations working (M4)

**Frontend Next:**
- Dashboard UI with flow graph (M5)
- Artifacts grid & detail (M6)
- Metrics & events pages (M7, M8)
- Alerts UI (M9)

**No blockers for M5 frontend work.**
