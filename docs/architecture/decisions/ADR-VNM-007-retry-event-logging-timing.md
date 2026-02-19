# ADR-VNM-007: Retry Event Logging Timing

**Status:** Accepted
**Date:** 2026-02-15
**Phase:** M3 - Retry Operations
**Author:** Architecture Reviewer (Pre-implementation)

---

## Context

Each retry mutation must log a `retry_initiated` event in the `voicePipelineEvents` table. The question is when to log this event relative to other operations in the mutation: before or after the status reset and action scheduling.

## Decision

**ALWAYS log `retry_initiated` BEFORE resetting artifact status and BEFORE scheduling the retry action. The event log must be scheduled first in the mutation handler.**

## Rationale

### Ordering Within the Mutation

The correct operation order within each retry mutation is:

```
1. Auth check (verify isPlatformStaff)
2. Fetch artifact (verify exists, check status)
3. Count previous retries (query events for retryAttempt number)
4. Log retry_initiated event (ctx.scheduler.runAfter)      <-- FIRST
5. Reset artifact status (ctx.db.patch)                     <-- SECOND
6. Schedule pipeline action (ctx.scheduler.runAfter)        <-- THIRD
7. Return success
```

### Why Log First?

**Audit completeness**: The `retry_initiated` event must exist even if subsequent operations fail. Because `ctx.scheduler.runAfter()` schedules the logEvent to run in a separate transaction, it is NOT affected by whether the current mutation succeeds or fails. However, by scheduling it first, we ensure:

1. **If the mutation succeeds**: The event is logged, status is reset, action is scheduled. All three happen.
2. **If the status reset fails** (unlikely but possible): The event still records that a retry was attempted. The artifact status remains unchanged, and no action is scheduled.
3. **If the action scheduling fails** (unlikely): The event records the attempt, the status was reset. The pipeline can be retried again.

**Temporal accuracy**: The `retry_initiated` event should have a timestamp that reflects when the retry was requested, not when the action was scheduled. Logging first captures the user's intent at the earliest possible moment.

**Debugging**: When investigating failed retries, seeing `retry_initiated` without subsequent `artifact_status_changed` or pipeline events immediately tells the operator that the mutation failed after logging but before completing its work.

### Why Not Log After?

If we log after scheduling, two failure modes become invisible:

1. If the mutation fails between status reset and event logging, the artifact status changed but no audit record exists.
2. If the action scheduling fails, there is no record that a retry was ever attempted.

### Scheduled Functions and Transaction Rollback

Important Convex behavior: `ctx.scheduler.runAfter()` calls are committed when the mutation succeeds. If the mutation throws (unhandled), scheduled functions are NOT executed. This means:

- If the try/catch in `retryFullPipeline` catches an error and returns `{ success: false }`, the mutation SUCCEEDS (it returned a value). The scheduled `retry_initiated` event WILL execute.
- If an unhandled error propagates out of the mutation, the scheduled event will NOT execute, and no writes are committed.

This is the correct behavior: we only want audit logs for retries that actually began processing (even if they failed during cleanup).

## Retry Attempt Tracking

The `retryAttempt` field in event metadata must be calculated BEFORE logging:

```typescript
// Query previous retry_initiated events for this artifact
const previousEvents = await ctx.db
  .query("voicePipelineEvents")
  .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
  .collect();

// Count previous retry_initiated events (JavaScript array .filter(), NOT Convex .filter())
const retryCount = previousEvents.filter(
  (e) => e.eventType === "retry_initiated"
).length;
const retryAttempt = retryCount + 1;

// Log with attempt number
await ctx.scheduler.runAfter(0, internal.models.voicePipelineEvents.logEvent, {
  eventType: "retry_initiated",
  artifactId: args.artifactId,
  metadata: { retryAttempt },
});
```

**IMPORTANT**: The `.filter()` call above is JavaScript's `Array.prototype.filter()`, not Convex's query `.filter()`. This is acceptable because:
1. The data is already collected (`.collect()` was called)
2. We are filtering an in-memory array
3. Per-artifact event count is bounded (~20-50 events max)

This pattern is documented in the M3 monitoring guide and must not be flagged as a `.filter()` anti-pattern violation.

## getRetryHistory Query

The `getRetryHistory` query uses the same pattern -- query by artifact, then JavaScript-filter for retry event types:

```typescript
const events = await ctx.db
  .query("voicePipelineEvents")
  .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
  .collect();

// JavaScript array filter (NOT Convex filter)
const retryEvents = events.filter((e) =>
  ["retry_initiated", "retry_succeeded", "retry_failed"].includes(e.eventType)
);
```

This is acceptable because the per-artifact event count is bounded and small.

## Consequences

- Every retry attempt is audit-logged, even if the retry itself fails
- Retry attempt numbers are accurate and sequential
- The event log provides a complete timeline for debugging
- Platform staff can see retry history via `getRetryHistory` query
- JavaScript `.filter()` on collected arrays is acceptable (bounded data, in-memory)

## Related

- ADR-VNM-005: Retry mutation scheduling pattern
- ADR-VNM-006: Full pipeline retry cleanup strategy
- ADR-VNM-003: Fire-and-forget event logging (M1)
