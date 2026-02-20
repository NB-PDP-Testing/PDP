# ADR-VNM-009: Health Check Execution Model

**Status:** Accepted
**Date:** 2026-02-15
**Phase:** M4 - Pipeline Alerts
**Author:** Architecture Reviewer (Pre-implementation)

---

## Context

The `checkPipelineHealth` function runs every 5 minutes via cron. It must perform 6 independent health checks, each querying different data sources:

1. **Failure Rate** -- reads `voicePipelineCounters` (2 counter reads)
2. **Latency Spike** -- reads `voicePipelineMetricsSnapshots` (up to 168 rows) + `voicePipelineCounters`
3. **Queue Depth** -- queries `voiceNoteArtifacts` (4 status queries)
4. **Disambiguation Backlog** -- queries `voiceNoteEntityResolutions` (1 index query)
5. **Circuit Breaker** -- queries `aiServiceHealth` (singleton read)
6. **Pipeline Inactivity** -- queries `voicePipelineEvents` (1 ordered query with `.first()`)

The question is whether to run all 6 checks in a single mutation or to split them into separate functions.

---

## Decision

**Run all 6 checks in a single `internalMutation`.** Use try/catch around each individual check to isolate failures. If one check fails, the others still execute.

---

## Rationale

### 1. Single Transaction is Simpler and Sufficient

The total data reads across all 6 checks are bounded:
- ~8 counter reads (O(1) each)
- ~168 snapshot reads (bounded, from index)
- ~4 artifact status queries (index reads, bounded by `.first()` or small result sets)
- ~1 entity resolution query (index read)
- ~1 singleton read
- ~1 event query (`.first()`)

**Estimated total: ~185 document reads.** This is well within Convex's single-mutation limits. The 10-second target is easily achievable.

### 2. Atomic Alert Creation

All alerts from a single health check cycle should be created atomically. If we split into 6 separate mutations:
- A partial failure could create some alerts but not others
- The 5-minute cron would re-check, potentially creating duplicates for the checks that succeeded
- Deduplication logic would become more complex

With a single mutation, either all alerts are created or none are (Convex transaction guarantees).

### 3. Deduplication is Simpler in One Transaction

The deduplication check ("does an unacknowledged alert of this type already exist?") requires reading the alerts table. In a single mutation, all deduplication checks happen against a consistent snapshot of the alerts table. Split mutations could race with each other.

### 4. Isolated Failure Handling Per Check

Each check is wrapped in its own try/catch. A failing check (e.g., no snapshots available for latency baseline) does not prevent other checks from running:

```typescript
const results: string[] = [];
let alertsCreated = 0;

// CHECK 1: Failure Rate
try {
  // ... check logic ...
  results.push("failure_rate");
} catch (error) {
  console.error("[checkPipelineHealth] Failure rate check failed:", error);
  results.push("failure_rate:ERROR");
}

// CHECK 2: Latency Spike
try {
  // ... check logic ...
  results.push("latency");
} catch (error) {
  console.error("[checkPipelineHealth] Latency check failed:", error);
  results.push("latency:ERROR");
}

// ... remaining checks ...

return { alertsCreated, checksPerformed: results };
```

This gives the benefits of a single transaction (atomicity, consistency) while isolating individual check failures.

---

## Rejected Alternative: Separate Mutations Per Check

**Option B: 6 separate `internalMutation` functions, each called by the cron.**

Advantages:
- Smaller, easier-to-test functions
- Individual function failure does not affect others

Disadvantages:
- **6 cron jobs instead of 1** -- clutters cron.ts, harder to manage
- **OR** a coordinator mutation that schedules 6 sub-mutations via `ctx.scheduler.runAfter(0, ...)` -- adds complexity and loses atomicity
- **Deduplication races**: Two checks running concurrently could both pass deduplication and create duplicate alerts
- **Inconsistent alert sets**: Some checks might succeed, others fail, creating a confusing partial alert state
- **More schema boilerplate**: 6 function definitions instead of 1

The single-mutation approach with per-check try/catch achieves the same fault isolation with less complexity.

---

## Rejected Alternative: internalAction Instead of internalMutation

An `internalAction` cannot directly read or write `ctx.db`. It would need to call `ctx.runQuery` and `ctx.runMutation` for each data access, adding overhead and losing transactional guarantees. Since all health check data sources are in the database, `internalMutation` is the correct choice.

---

## Implementation Structure

```typescript
export const checkPipelineHealth = internalMutation({
  args: {},
  returns: v.object({
    alertsCreated: v.number(),
    checksPerformed: v.array(v.string()),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const checks: string[] = [];
    let alertsCreated = 0;

    // Helper: check deduplication before creating alert
    async function maybeCreateAlert(
      alertType: string,
      severity: string,
      message: string,
      metadata: Record<string, unknown>
    ): Promise<boolean> {
      const existing = await ctx.db
        .query("voicePipelineAlerts")
        .withIndex("by_alertType_and_acknowledged", (q) =>
          q.eq("alertType", alertType).eq("acknowledged", false)
        )
        .first();

      if (existing) return false; // Deduplicated

      await ctx.db.insert("voicePipelineAlerts", {
        alertType, severity, message, metadata,
        acknowledged: false,
        createdAt: now,
      });
      return true;
    }

    // CHECK 1: Failure Rate
    try { /* ... */ checks.push("failure_rate"); } catch (e) { /* log */ }

    // CHECK 2: Latency Spike
    try { /* ... */ checks.push("latency"); } catch (e) { /* log */ }

    // CHECK 3: Queue Depth
    try { /* ... */ checks.push("queue_depth"); } catch (e) { /* log */ }

    // CHECK 4: Disambiguation Backlog
    try { /* ... */ checks.push("disambiguation_backlog"); } catch (e) { /* log */ }

    // CHECK 5: Circuit Breaker
    try { /* ... */ checks.push("circuit_breaker"); } catch (e) { /* log */ }

    // CHECK 6: Pipeline Inactivity
    try { /* ... */ checks.push("inactivity"); } catch (e) { /* log */ }

    return { alertsCreated, checksPerformed: checks };
  },
});
```

---

## Performance Budget

| Check | Reads | Estimated Time |
|-------|-------|---------------|
| Failure Rate | 2 counter reads | < 20ms |
| Latency Spike | 168 snapshot reads + 1 counter | < 500ms |
| Queue Depth | 4 index queries with `.first()` | < 100ms |
| Disambiguation Backlog | 1 index query | < 50ms |
| Circuit Breaker | 1 singleton read | < 10ms |
| Inactivity | 1 ordered query with `.first()` | < 50ms |
| Deduplication (6 checks) | 6 index reads | < 120ms |
| Alert inserts (worst case 6) | 6 inserts | < 60ms |
| **Total** | **~190 reads + 6 writes** | **< 1 second** |

This is well under the 10-second target and well within Convex mutation limits.

---

## Consequences

- Single `checkPipelineHealth` function handles all 6 checks
- Per-check try/catch ensures isolated failures
- One cron job, one function call, one transaction
- All alerts from a single cycle are atomic
- Deduplication is race-free within the transaction
- Return value reports which checks ran and how many alerts were created
- Check errors are logged to console (visible in Convex dashboard logs)

---

## Related

- ADR-VNM-008: Alert storage strategy (new table decision)
- ADR-VNM-010: Alert deduplication mechanism
- ADR-VNM-003: Fire-and-forget event logging (M1)
- Performance Patterns doc: Pattern 3 (counter-based reads), Pattern 4 (snapshot queries)
