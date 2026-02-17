# ADR-VNM-010: Alert Deduplication Mechanism

**Status:** Accepted
**Date:** 2026-02-15
**Phase:** M4 - Pipeline Alerts
**Author:** Architecture Reviewer (Pre-implementation)

---

## Context

The `checkPipelineHealth` cron runs every 5 minutes. Without deduplication, a persistent issue (e.g., high failure rate lasting 30 minutes) would generate 6 duplicate alerts. The PRD specifies two possible approaches:

1. **Time-window deduplication**: Skip alert if same type was created within the last 15 minutes
2. **State-based deduplication**: Skip alert if same type has an unacknowledged alert (regardless of age)

---

## Decision

**Use state-based deduplication: do not create a new alert if an unacknowledged alert of the same type already exists.** No time window is applied.

---

## Rationale

### 1. State-Based is Simpler and More Correct

The purpose of an alert is to notify platform staff that an issue exists. If staff have not acknowledged the previous alert, creating another identical alert adds noise without value. The existing alert already communicates the problem.

With time-window deduplication (e.g., 15 minutes), after the window expires, a new alert is created even though the original alert is still unacknowledged. This means:
- An issue lasting 2 hours generates 8 alerts (one every 15 minutes)
- Staff must acknowledge all 8, not just 1
- The alert list fills with duplicates of the same ongoing issue

With state-based deduplication:
- An issue lasting 2 hours generates exactly 1 alert
- Staff acknowledge it once
- If the issue recurs after acknowledgment, a new alert is created

### 2. Acknowledgment Acts as the Reset

When staff acknowledge an alert, they signal "I am aware of this issue." If the issue persists at the next health check (5 minutes later), a new alert is created. This is the correct behavior: the staff was aware, the issue was not resolved, a new alert is warranted.

The lifecycle is:
```
Issue detected -> Alert created -> Staff acknowledges -> Issue persists -> New alert created
```

This is cleaner than:
```
Issue detected -> Alert created -> 15min -> Duplicate -> 15min -> Duplicate -> Staff acks all
```

### 3. Index-Based Implementation is Efficient

The deduplication query uses the `by_alertType_and_acknowledged` composite index:

```typescript
const existing = await ctx.db
  .query("voicePipelineAlerts")
  .withIndex("by_alertType_and_acknowledged", (q) =>
    q.eq("alertType", alertType).eq("acknowledged", false)
  )
  .first();

if (existing) {
  // Skip: unacknowledged alert of this type already exists
  return false;
}
```

This is a single indexed lookup returning at most 1 document. Cost: ~10ms per check, ~60ms total for all 6 checks. No timestamp comparison needed, no window calculation.

### 4. Convex `.filter()` is NOT Needed

Because `by_alertType_and_acknowledged` is a composite index on `["alertType", "acknowledged"]`, both conditions are served by the index. No post-query `.filter()` is required, which is critical per CLAUDE.md rules.

If we used time-window deduplication, we would need to add a timestamp comparison AFTER the index query:
```typescript
// This would require .filter() -- VIOLATES CLAUDE.md
.withIndex("by_alertType_and_acknowledged", q =>
  q.eq("alertType", alertType).eq("acknowledged", false)
)
.filter(q => q.gt(q.field("createdAt"), now - 900000))  // BAD
```

Or a 3-field composite index `["alertType", "acknowledged", "createdAt"]`, which adds schema complexity for marginal benefit.

State-based deduplication avoids this entirely.

---

## Edge Cases

### Multiple alerts of the same type, all acknowledged

If staff acknowledges an alert and the issue resolves, then recurs hours later, a new alert is correctly created. The old acknowledged alert remains in history for audit purposes.

### All 6 alert types firing simultaneously

Each alert type is deduplicated independently. If all 6 checks trigger alerts simultaneously, all 6 are created (they are different alert types). On the next run, if all 6 issues persist, none of the 6 are duplicated (all are unacknowledged).

### Issue resolves without acknowledgment

If the failure rate drops below 10% but the previous alert was never acknowledged, the old alert remains unacknowledged. On the next health check, no new alert is created (the old one is still unacknowledged). Staff should still acknowledge the historical alert.

**Future enhancement (not M4 scope)**: Auto-resolve alerts when the condition clears. This would require checking the inverse condition ("failure rate is now below 10%") and patching the existing alert. This adds complexity and is deferred to a later phase.

### Acknowledged alert from a different issue instance

Staff acknowledges a circuit breaker alert at 2:00 PM. The circuit breaker closes, then reopens at 3:00 PM. Because the 2:00 PM alert is acknowledged, the deduplication check finds no unacknowledged alert, and a new alert is correctly created.

---

## Implementation Pattern

```typescript
/**
 * Deduplicated alert creation helper.
 * Returns true if alert was created, false if deduplicated.
 */
async function maybeCreateAlert(
  ctx: MutationCtx,
  params: {
    alertType: PipelineAlertType;
    severity: PipelineSeverity;
    message: string;
    metadata: AlertMetadata;
  }
): Promise<boolean> {
  // Check for existing unacknowledged alert of same type
  const existing = await ctx.db
    .query("voicePipelineAlerts")
    .withIndex("by_alertType_and_acknowledged", (q) =>
      q.eq("alertType", params.alertType).eq("acknowledged", false)
    )
    .first();

  if (existing) {
    // Deduplicated: alert already exists and is unacknowledged
    return false;
  }

  // Create new alert
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

## Consequences

- Maximum 1 unacknowledged alert per type at any time
- No alert spam regardless of how long an issue persists
- Staff acknowledge once per issue, not per health check cycle
- Deduplication is O(1) per check (single indexed read)
- No `.filter()` required -- fully served by composite index
- Auto-resolution is not implemented (future enhancement)
- If staff never acknowledge old alerts, new occurrences of the same issue type will be suppressed

---

## Related

- ADR-VNM-008: Alert storage strategy (table schema with index)
- ADR-VNM-009: Health check execution model (single mutation)
- `platformCostAlerts.checkCostAlerts` uses time-window (60 min) -- different approach, different domain
