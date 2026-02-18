## Architecture Reviewer - M4 Pipeline Alerts COMPREHENSIVE Implementation Guide (2026-02-16)

### Overview

This is the definitive implementation guide for Phase M4 (US-VNM-007). It supersedes and expands the preliminary review from 2026-02-15. All corrections, updated findings, and complete code patterns are included below.

**ADRs for M4 (6 total):**
- **ADR-VNM-008**: Alert Storage Strategy -- NEW `voicePipelineAlerts` table (not `platformCostAlerts`)
- **ADR-VNM-009**: Health Check Execution Model -- Single `internalMutation`, per-check try/catch
- **ADR-VNM-010**: Alert Deduplication -- State-based (max 1 unacknowledged per type)
- **ADR-VNM-011**: Latency Baseline Calculation -- 168 hourly snapshots, min 6 valid
- **ADR-VNM-012**: Alert Severity Classification -- 4-level system with static type-to-severity mapping
- **ADR-VNM-013**: Cron Scheduling Strategy -- 5-minute interval, no wrapper needed

ADR files: `docs/architecture/decisions/ADR-VNM-008-*.md` through `ADR-VNM-013-*.md`

---

### CORRECTION: by_status Index Already Exists on voiceNoteEntityResolutions

The preliminary review (2026-02-15) stated that `voiceNoteEntityResolutions` was missing a `by_status` index. **This was incorrect.** The index already exists at schema.ts line 4407:

```
.index("by_status", ["status"]),
```

**NO schema change needed for the disambiguation backlog query.** The existing index fully supports:
```typescript
await ctx.db
  .query("voiceNoteEntityResolutions")
  .withIndex("by_status", (q) => q.eq("status", "needs_disambiguation"))
  .collect();
```

---

### SCHEMA CHANGE: Add voicePipelineAlerts Table

This is the ONLY schema change required for M4. Add this table definition to `packages/backend/convex/schema.ts` BEFORE the `platformStaffInvitations` section (after line 4631, after the `voicePipelineCounters` table):

```typescript
// ============================================================
// VOICE PIPELINE ALERTS (M4 - Automated Anomaly Detection)
// Health check alerts for pipeline monitoring dashboard
// ============================================================
voicePipelineAlerts: defineTable({
  alertType: v.union(
    v.literal("PIPELINE_HIGH_FAILURE_RATE"),
    v.literal("PIPELINE_HIGH_LATENCY"),
    v.literal("PIPELINE_HIGH_QUEUE_DEPTH"),
    v.literal("PIPELINE_DISAMBIGUATION_BACKLOG"),
    v.literal("PIPELINE_CIRCUIT_BREAKER_OPEN"),
    v.literal("PIPELINE_INACTIVITY")
  ),
  severity: v.union(
    v.literal("critical"),
    v.literal("high"),
    v.literal("medium"),
    v.literal("low")
  ),
  message: v.string(),
  metadata: v.object({
    failureRate: v.optional(v.number()),
    threshold: v.optional(v.number()),
    currentLatency: v.optional(v.number()),
    avgLatency: v.optional(v.number()),
    queueDepth: v.optional(v.number()),
    backlogCount: v.optional(v.number()),
    circuitBreakerState: v.optional(v.string()),
    recentFailureCount: v.optional(v.number()),
    minutesSinceLastArtifact: v.optional(v.number()),
  }),
  acknowledged: v.boolean(),
  acknowledgedBy: v.optional(v.string()),
  acknowledgedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_alertType_and_acknowledged", ["alertType", "acknowledged"])
  .index("by_acknowledged_and_createdAt", ["acknowledged", "createdAt"])
  .index("by_createdAt", ["createdAt"]),
```

**After adding, run:** `npx -w packages/backend convex codegen`

---

### Function Signatures (All 4 Functions)

#### Function 1: checkPipelineHealth (internalMutation)

```typescript
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const checkPipelineHealth = internalMutation({
  args: {},
  returns: v.object({
    alertsCreated: v.number(),
    checksPerformed: v.array(v.string()),
  }),
  handler: async (ctx) => {
    // NO auth check -- internalMutation, cron-only
    // All 6 checks with per-check try/catch
    // Uses maybeCreateAlert helper for deduplication
  },
});
```

#### Function 2: getActiveAlerts (query)

```typescript
import { query } from "../_generated/server";
import { v } from "convex/values";

export const getActiveAlerts = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("voicePipelineAlerts"),
      _creationTime: v.number(),
      alertType: v.string(),
      severity: v.string(),
      message: v.string(),
      metadata: v.object({
        failureRate: v.optional(v.number()),
        threshold: v.optional(v.number()),
        currentLatency: v.optional(v.number()),
        avgLatency: v.optional(v.number()),
        queueDepth: v.optional(v.number()),
        backlogCount: v.optional(v.number()),
        circuitBreakerState: v.optional(v.string()),
        recentFailureCount: v.optional(v.number()),
        minutesSinceLastArtifact: v.optional(v.number()),
      }),
      acknowledged: v.boolean(),
      acknowledgedBy: v.optional(v.string()),
      acknowledgedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    await verifyPlatformStaff(ctx);
    // Query by_acknowledged_and_createdAt with acknowledged=false
    // In-memory sort by severity then createdAt
  },
});
```

#### Function 3: acknowledgeAlert (mutation)

```typescript
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const acknowledgeAlert = mutation({
  args: {
    alertId: v.id("voicePipelineAlerts"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await verifyPlatformStaff(ctx);
    // Fetch alert, verify exists
    // Patch: acknowledged=true, acknowledgedAt=Date.now(), acknowledgedBy=user._id
  },
});
```

#### Function 4: getAlertHistory (query)

```typescript
import { query } from "../_generated/server";
import { v, paginationOptsValidator } from "convex/values";

export const getAlertHistory = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filters: v.optional(
      v.object({
        severity: v.optional(v.string()),
        alertType: v.optional(v.string()),
      })
    ),
  },
  // Returns paginated result
  handler: async (ctx, args) => {
    await verifyPlatformStaff(ctx);
    // Query by_createdAt, order desc, paginate
    // Apply in-memory filters if provided (bounded by page size)
  },
});
```

---

### Complete Health Check Implementations

#### CHECK 1: Failure Rate (severity: high)

```typescript
// CHECK 1: Failure Rate
try {
  const completedCounter = await ctx.db
    .query("voicePipelineCounters")
    .withIndex("by_counterType_and_org", (q) =>
      q.eq("counterType", "artifacts_completed_1h").eq("organizationId", undefined)
    )
    .first();
  const failedCounter = await ctx.db
    .query("voicePipelineCounters")
    .withIndex("by_counterType_and_org", (q) =>
      q.eq("counterType", "artifacts_failed_1h").eq("organizationId", undefined)
    )
    .first();

  const completed = completedCounter?.currentValue ?? 0;
  const failed = failedCounter?.currentValue ?? 0;
  const total = completed + failed;

  // SAFE DIVISION: check denominator > 0
  if (total > 0) {
    const failureRate = failed / total;
    if (failureRate > 0.10) {
      const created = await maybeCreateAlert(ctx, {
        alertType: "PIPELINE_HIGH_FAILURE_RATE" as const,
        severity: "high" as const,
        message: `Pipeline failure rate is ${(failureRate * 100).toFixed(1)}% (threshold: 10%)`,
        metadata: { failureRate, threshold: 0.10 },
      });
      if (created) alertsCreated += 1;
    }
  }
  checks.push("failure_rate");
} catch (error) {
  console.error("[checkPipelineHealth] Failure rate check failed:", error);
  checks.push("failure_rate:ERROR");
}
```

#### CHECK 2: Latency Spike (severity: medium)

```typescript
// CHECK 2: Latency Spike
try {
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const snapshots = await ctx.db
    .query("voicePipelineMetricsSnapshots")
    .withIndex("by_periodType_and_start", (q) =>
      q.eq("periodType", "hourly").gte("periodStart", sevenDaysAgo)
    )
    .collect();

  // JavaScript .filter() on collected array -- NOT Convex .filter()
  const validSnapshots = snapshots.filter(
    (s) => s.artifactsCompleted > 0 && s.avgEndToEndLatency > 0
  );

  if (validSnapshots.length >= 6) {
    const baselineAvg =
      validSnapshots.reduce((sum, s) => sum + s.avgEndToEndLatency, 0) /
      validSnapshots.length;

    const recentSnapshot = await ctx.db
      .query("voicePipelineMetricsSnapshots")
      .withIndex("by_periodType_and_start", (q) => q.eq("periodType", "hourly"))
      .order("desc")
      .first();

    if (recentSnapshot && recentSnapshot.artifactsCompleted > 0) {
      const currentLatency = recentSnapshot.avgEndToEndLatency;
      if (currentLatency > baselineAvg * 2) {
        const created = await maybeCreateAlert(ctx, {
          alertType: "PIPELINE_HIGH_LATENCY" as const,
          severity: "medium" as const,
          message: `End-to-end latency is ${Math.round(currentLatency)}ms (2x normal: ${Math.round(baselineAvg)}ms)`,
          metadata: { currentLatency, avgLatency: Math.round(baselineAvg), threshold: 2.0 },
        });
        if (created) alertsCreated += 1;
      }
    }
  }
  checks.push("latency");
} catch (error) {
  console.error("[checkPipelineHealth] Latency check failed:", error);
  checks.push("latency:ERROR");
}
```

#### CHECK 3: Queue Depth (severity: medium)

```typescript
// CHECK 3: Queue Depth
try {
  let queueDepth = 0;
  const activeStatuses = ["received", "transcribing", "transcribed", "processing"] as const;
  for (const status of activeStatuses) {
    const artifacts = await ctx.db
      .query("voiceNoteArtifacts")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", status))
      .collect();
    queueDepth += artifacts.length;
  }
  if (queueDepth > 50) {
    const created = await maybeCreateAlert(ctx, {
      alertType: "PIPELINE_HIGH_QUEUE_DEPTH" as const,
      severity: "medium" as const,
      message: `${queueDepth} artifacts queued (threshold: 50)`,
      metadata: { queueDepth, threshold: 50 },
    });
    if (created) alertsCreated += 1;
  }
  checks.push("queue_depth");
} catch (error) {
  console.error("[checkPipelineHealth] Queue depth check failed:", error);
  checks.push("queue_depth:ERROR");
}
```

#### CHECK 4: Disambiguation Backlog (severity: low)

```typescript
// CHECK 4: Disambiguation Backlog
try {
  const backlog = await ctx.db
    .query("voiceNoteEntityResolutions")
    .withIndex("by_status", (q) => q.eq("status", "needs_disambiguation"))
    .collect();
  if (backlog.length > 100) {
    const created = await maybeCreateAlert(ctx, {
      alertType: "PIPELINE_DISAMBIGUATION_BACKLOG" as const,
      severity: "low" as const,
      message: `${backlog.length} entities awaiting manual review (threshold: 100)`,
      metadata: { backlogCount: backlog.length, threshold: 100 },
    });
    if (created) alertsCreated += 1;
  }
  checks.push("disambiguation_backlog");
} catch (error) {
  console.error("[checkPipelineHealth] Disambiguation backlog check failed:", error);
  checks.push("disambiguation_backlog:ERROR");
}
```

#### CHECK 5: Circuit Breaker (severity: critical)

```typescript
// CHECK 5: Circuit Breaker
try {
  const health = await ctx.db.query("aiServiceHealth").first();
  if (health && (health.circuitBreakerState === "open" || health.circuitBreakerState === "half_open")) {
    const created = await maybeCreateAlert(ctx, {
      alertType: "PIPELINE_CIRCUIT_BREAKER_OPEN" as const,
      severity: "critical" as const,
      message: `AI service circuit breaker is ${health.circuitBreakerState}`,
      metadata: { circuitBreakerState: health.circuitBreakerState, recentFailureCount: health.recentFailureCount },
    });
    if (created) alertsCreated += 1;
  }
  checks.push("circuit_breaker");
} catch (error) {
  console.error("[checkPipelineHealth] Circuit breaker check failed:", error);
  checks.push("circuit_breaker:ERROR");
}
```

#### CHECK 6: Pipeline Inactivity (severity: low)

```typescript
// CHECK 6: Pipeline Inactivity
try {
  const lastReceived = await ctx.db
    .query("voicePipelineEvents")
    .withIndex("by_eventType_and_timestamp", (q) => q.eq("eventType", "artifact_received"))
    .order("desc")
    .first();
  if (lastReceived) {
    const minutesSince = Math.round((now - lastReceived.timestamp) / 60000);
    if (minutesSince > 60) {
      const created = await maybeCreateAlert(ctx, {
        alertType: "PIPELINE_INACTIVITY" as const,
        severity: "low" as const,
        message: `No voice notes received in ${minutesSince} minutes`,
        metadata: { minutesSinceLastArtifact: minutesSince, threshold: 60 },
      });
      if (created) alertsCreated += 1;
    }
  }
  checks.push("inactivity");
} catch (error) {
  console.error("[checkPipelineHealth] Inactivity check failed:", error);
  checks.push("inactivity:ERROR");
}
```

---

### Deduplication Helper (maybeCreateAlert)

```typescript
async function maybeCreateAlert(
  ctx: MutationCtx,
  params: {
    alertType:
      | "PIPELINE_HIGH_FAILURE_RATE"
      | "PIPELINE_HIGH_LATENCY"
      | "PIPELINE_HIGH_QUEUE_DEPTH"
      | "PIPELINE_DISAMBIGUATION_BACKLOG"
      | "PIPELINE_CIRCUIT_BREAKER_OPEN"
      | "PIPELINE_INACTIVITY";
    severity: "critical" | "high" | "medium" | "low";
    message: string;
    metadata: {
      failureRate?: number;
      threshold?: number;
      currentLatency?: number;
      avgLatency?: number;
      queueDepth?: number;
      backlogCount?: number;
      circuitBreakerState?: string;
      recentFailureCount?: number;
      minutesSinceLastArtifact?: number;
    };
  }
): Promise<boolean> {
  const existing = await ctx.db
    .query("voicePipelineAlerts")
    .withIndex("by_alertType_and_acknowledged", (q) =>
      q.eq("alertType", params.alertType).eq("acknowledged", false)
    )
    .first();
  if (existing) return false;
  await ctx.db.insert("voicePipelineAlerts", {
    alertType: params.alertType,
    severity: params.severity,
    message: params.message,
    metadata: params.metadata,
    acknowledged: false,
    createdAt: Date.now(),
  });
  return true;
}
```

---

### verifyPlatformStaff Helper

```typescript
async function verifyPlatformStaff(ctx: MutationCtx | QueryCtx): Promise<string> {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new Error("Not authenticated");
  const dbUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", value: user._id }],
  });
  if (!dbUser?.isPlatformStaff) throw new Error("Not authorized: platform staff only");
  return user._id;
}
```

---

### Cron Integration

Add to `crons.ts` after M2 crons, before `export default crons;`:

```typescript
// Voice Monitor Harness M4: Pipeline health check cron
crons.interval(
  "check-pipeline-health",
  { minutes: 5 },
  internal.models.voicePipelineAlerts.checkPipelineHealth
);
```

---

### Index Coverage (All Verified)

| Query | Index | Table | Status |
|-------|-------|-------|--------|
| Failure rate counters | `by_counterType_and_org` | voicePipelineCounters | EXISTS |
| Latency snapshots | `by_periodType_and_start` | voicePipelineMetricsSnapshots | EXISTS |
| Queue depth by status | `by_status_and_createdAt` | voiceNoteArtifacts | EXISTS |
| Disambiguation backlog | `by_status` | voiceNoteEntityResolutions | EXISTS |
| Circuit breaker | (singleton) | aiServiceHealth | N/A |
| Last received event | `by_eventType_and_timestamp` | voicePipelineEvents | EXISTS |
| Alert deduplication | `by_alertType_and_acknowledged` | voicePipelineAlerts | NEW |
| Active alerts | `by_acknowledged_and_createdAt` | voicePipelineAlerts | NEW |
| Alert history | `by_createdAt` | voicePipelineAlerts | NEW |

---

### Pre-Implementation Checklist

- [ ] Read ALL 6 ADRs: ADR-VNM-008 through ADR-VNM-013
- [ ] Read M1, M2, M3 LESSONS_LEARNED files
- [ ] **STEP 1**: Add `voicePipelineAlerts` table to `schema.ts`
- [ ] **STEP 1b**: Run `npx -w packages/backend convex codegen`
- [ ] ~~Add by_status index to voiceNoteEntityResolutions~~ **NOT NEEDED**
- [ ] **STEP 2**: Create `packages/backend/convex/models/voicePipelineAlerts.ts`
- [ ] **STEP 3**: Add cron to `crons.ts`
- [ ] **STEP 4**: `npx -w packages/backend convex codegen && npm run check-types`
- [ ] **STEP 5**: `npx ultracite fix`

### Critical Gotchas (15 Items)

1. DO NOT reuse `platformCostAlerts` -- create `voicePipelineAlerts`
2. Safe division -- guard with `if (total > 0)` before any `a / b`
3. Counter organizationId = `undefined` for platform-wide (NOT null)
4. JS `.filter()` after `.collect()` is OK -- add comment
5. getActiveAlerts sort -- in-memory, max 6 items
6. getAlertHistory -- use `.paginate()`, NOT `.take()`
7. by_status on voiceNoteEntityResolutions EXISTS -- do NOT add again
8. aiServiceHealth -- singleton, `.first()` OK
9. Cron -- `crons.interval`, `{ minutes: 5 }`, no wrapper
10. checkPipelineHealth -- `internalMutation`, no auth
11. Public functions -- ALL must verify isPlatformStaff
12. verifyPlatformStaff -- return `user._id` for `acknowledgedBy`
13. Queue depth -- 4 separate queries, one per status
14. Inactivity -- skip if no events exist
15. Latency -- skip if < 6 valid snapshots

### Files to Create/Modify

| File | Action |
|------|--------|
| `packages/backend/convex/schema.ts` | MODIFY -- add voicePipelineAlerts table |
| `packages/backend/convex/models/voicePipelineAlerts.ts` | CREATE -- 4 functions + 2 helpers |
| `packages/backend/convex/crons.ts` | MODIFY -- add check-pipeline-health cron |
