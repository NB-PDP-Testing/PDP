# ADR-VNM-013: Health Check Cron Scheduling Strategy

**Status:** Accepted
**Date:** 2026-02-16
**Phase:** M4 - Pipeline Alerts
**Author:** Architecture Reviewer (Pre-implementation)

---

## Context

M4 adds a `checkPipelineHealth` function that must run periodically to detect pipeline anomalies. Key questions:

1. What frequency? (1 minute, 5 minutes, 15 minutes, hourly?)
2. `crons.interval` or `crons.cron`?
3. Does the function need a wrapper (like M2's `aggregateHourlyMetricsWrapper`)?
4. Where in `crons.ts` should it be placed?
5. What happens if a health check takes longer than the interval?

---

## Decision

**Use `crons.interval("check-pipeline-health", { minutes: 5 }, ...)` with no wrapper function.** Place it after the M2 cron entries at the bottom of `crons.ts`.

---

## Rationale

### 1. Why 5-Minute Interval

| Interval | Pros | Cons |
|----------|------|------|
| 1 minute | Fast detection | 288 runs/day. Excessive for MVP. Each run reads ~190 documents. 54,720 reads/day from health checks alone. |
| **5 minutes** | **Good balance: 288 runs/day, ~55K reads.** Detects most issues within 5 minutes. | 5-minute detection gap acceptable for operational monitoring. |
| 15 minutes | Low overhead, 96 runs/day | Slow detection. A circuit breaker opening goes unnoticed for up to 15 minutes. |
| Hourly | Minimal overhead | Unacceptable detection latency for critical issues. |

**5 minutes provides a 5-minute worst-case detection window** which is acceptable for all 6 alert types:
- Circuit breaker: 5 minutes is short enough -- the circuit breaker prevents further damage during the gap
- Failure rate: A 5-minute accumulation period gives a more stable measurement than 1-minute
- Latency: Latency spikes sustained over 5 minutes are genuine, not transient
- Inactivity: The 60-minute threshold means a 5-minute check granularity is fine

### 2. `crons.interval` Not `crons.cron`

`crons.interval` with `{ minutes: 5 }` creates a simple repeating timer. `crons.cron` with `"*/5 * * * *"` achieves the same thing but with cron syntax.

For Convex, `crons.interval` is the idiomatic choice for fixed-frequency jobs. `crons.cron` is better for wall-clock scheduling (e.g., "every day at 2 AM").

The PRD's `cronExpression` field shows `*/5 * * * *` but this is for documentation -- the implementation uses `crons.interval`.

### 3. No Wrapper Function Needed

M2 needed wrapper functions (`aggregateHourlyMetricsWrapper`) because the underlying function takes a `targetTimestamp` parameter that must be computed at runtime. Cron args are evaluated once at deployment, so `Date.now()` in cron args freezes.

`checkPipelineHealth` takes **no arguments** (`args: {}`). It reads `Date.now()` inside its handler, which is evaluated at execution time. No wrapper is needed.

```typescript
// M2 needed a wrapper (function takes args):
crons.hourly("aggregate-hourly", { minuteUTC: 30 },
  internal.models.voicePipelineMetrics.aggregateHourlyMetricsWrapper // No args
);

// M4 does NOT need a wrapper (function takes no args):
crons.interval("check-pipeline-health", { minutes: 5 },
  internal.models.voicePipelineAlerts.checkPipelineHealth // No args
);
```

### 4. Placement in crons.ts

The cron should go after the M2 Voice Monitor Harness entries (after line 215, before `export default crons;`). Group it with the other voice monitor crons under a clear comment:

```typescript
// Voice Monitor Harness M4: Pipeline health check cron
// Runs every 5 minutes to detect anomalies and create alerts
crons.interval(
  "check-pipeline-health",
  { minutes: 5 },
  internal.models.voicePipelineAlerts.checkPipelineHealth
);
```

### 5. Overlapping Execution

If `checkPipelineHealth` takes longer than 5 minutes (extremely unlikely given the <1 second performance budget from ADR-VNM-009), Convex handles this by queuing the next execution. The function is an `internalMutation`, so Convex serializes access -- two instances cannot run concurrently against the same data.

In practice, this is not a concern:
- Estimated execution time: < 1 second
- Worst case (all 6 checks + 6 alert inserts): < 2 seconds
- The 5-minute interval provides a 4-minute 58-second buffer

---

## Cron Timing Summary (All Voice Monitor Crons)

| Cron Name | Schedule | Phase | Purpose |
|-----------|----------|-------|---------|
| `aggregate-pipeline-hourly-metrics` | Hourly at :30 | M2 | Aggregate events into hourly snapshots |
| `aggregate-pipeline-daily-metrics` | Daily at 1:30 AM UTC | M2 | Aggregate hourly snapshots into daily |
| `cleanup-pipeline-snapshots` | Weekly Sunday 4:30 AM UTC | M2 | Delete old snapshots (7d hourly, 90d daily) |
| `cleanup-pipeline-events` | Weekly Sunday 5:00 AM UTC | M2 | Delete old events (48h retention) |
| **`check-pipeline-health`** | **Every 5 minutes** | **M4** | **Detect anomalies, create alerts** |

No timing conflicts with any existing cron.

---

## Consequences

- One additional cron entry in `crons.ts` (~5 lines)
- 288 health check runs per day
- ~55,000 document reads per day from health checks (190 reads x 288 runs)
- Worst-case 5-minute detection latency for anomalies
- No wrapper function needed (simplifies code)
- No risk of concurrent execution (Convex serialization)

---

## Related

- ADR-VNM-009: Health check execution model (single mutation, per-check try/catch)
- ADR-VNM-004: Snapshot-based analytics (M2 cron timing rationale)
- M2 Lessons Learned: Cron args cannot use Date.now() (not applicable here -- no args)
