# ADR-VNM-002: Counter-Based Metrics Architecture (Atomic Increment, Window Rotation)

## Status
Accepted

## Context

Real-time dashboard metrics (e.g., "artifacts received in last hour") must be fast -- under 50ms. Scanning `voicePipelineEvents` table for recent events is O(n) on event count, which degrades as event volume grows. We need an O(1) approach for real-time metrics.

Key constraints:
- Counter increment MUST be atomic with event insert (same Convex mutation transaction)
- Multiple events can arrive simultaneously, requiring race-safe window rotation
- Counters must self-reset when the 1-hour window expires -- no separate cron needed
- Platform-wide and per-org counters both needed

## Decision

### 1. Dedicated Counter Table

`voicePipelineCounters` stores one document per counter type per organization scope:

```typescript
{
  counterType: "artifacts_received_1h",  // String identifier
  organizationId: null,                  // null = platform-wide
  currentValue: 42,                      // Incremented atomically
  windowStart: 1739548800000,            // Start of current 1h window
  windowEnd: 1739552400000               // End of current 1h window
}
```

### 2. Seven Counter Types

| Event Type | Counter Type |
|-----------|-------------|
| artifact_received | artifacts_received_1h |
| artifact_completed | artifacts_completed_1h |
| artifact_failed | artifacts_failed_1h |
| transcription_completed | transcriptions_completed_1h |
| claims_extracted | claims_extracted_1h |
| entity_resolution_completed | entities_resolved_1h |
| drafts_generated | drafts_generated_1h |

Not all 27 event types increment counters -- only "milestone" events that represent completed pipeline stages.

### 3. Atomic Increment in logEvent Transaction

The `logEvent` internalMutation performs BOTH event insert AND counter increment in a single Convex transaction:

```typescript
// Step 1: Insert event
const eventId = await ctx.db.insert("voicePipelineEvents", {...});

// Step 2: Increment counter (same transaction)
const counterType = getCounterTypeForEvent(args.eventType);
if (counterType) {
  const counter = await ctx.db.query("voicePipelineCounters")
    .withIndex("by_counterType_and_org", q =>
      q.eq("counterType", counterType)
       .eq("organizationId", args.organizationId ?? null)
    )
    .first();

  const now = Date.now();
  if (counter && now < counter.windowEnd) {
    await ctx.db.patch(counter._id, {
      currentValue: counter.currentValue + 1
    });
  } else if (counter && now >= counter.windowEnd) {
    await ctx.db.patch(counter._id, {
      currentValue: 1,
      windowStart: now,
      windowEnd: now + 3600000
    });
  } else {
    await ctx.db.insert("voicePipelineCounters", {
      counterType,
      organizationId: args.organizationId ?? null,
      currentValue: 1,
      windowStart: now,
      windowEnd: now + 3600000
    });
  }
}
```

### 4. Window Rotation via Atomic Patch

When `Date.now() >= windowEnd`, the counter resets to 1 (not 0+1) via a single `ctx.db.patch()`. This is race-safe because:
- Convex transactions are serializable -- two concurrent logEvent calls cannot both see the expired window
- If two mutations race, one will succeed first, the other will retry with the new window state

### 5. Two Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| by_counterType | [counterType] | Platform-wide counter lookup |
| by_counterType_and_org | [counterType, organizationId] | Org-scoped counter lookup |

## Consequences

### Positive
- Real-time metrics read is O(1) -- query 7 counter documents, no event scanning
- Counter and event are always consistent (same transaction, atomicity guaranteed)
- Self-resetting windows eliminate the need for a separate cleanup cron
- Scales linearly with number of organizations, not event volume

### Negative
- Counter values are approximate -- they represent "events in current window" which may not align perfectly with "events in last 60 minutes" (window may be 45 min old)
- Each logEvent mutation does 2-3 database operations (event insert + counter query + counter patch/insert)
- Counter documents grow linearly with (counter_types x organizations) -- at 7 types x 100 orgs = 700 documents (manageable)

### Risks
- **organizationId null handling**: Convex index behavior with `null` values must be tested. The `by_counterType_and_org` index with `organizationId: null` for platform-wide counters should work but needs verification.
- **Window drift**: If no events arrive for >1 hour, the counter retains its stale value with an expired window. The `getRealTimeMetrics` query should check `windowEnd > Date.now()` and return 0 if the window is expired.
- **Counter cleanup**: Counters for organizations that stop sending voice notes will accumulate. Consider a cleanup job in Phase M2+ to remove counters with `windowEnd` older than 7 days.

## Implementation Notes
- `logEvent` returns the event `_id` as `v.string()` (the document ID, not the UUID eventId)
- Counter organizationId stores `null` (not `undefined`) for platform-wide counters
- The helper `getCounterTypeForEvent()` should return `null` for event types that don't need counters (e.g., `artifact_status_changed`)
- `getRealTimeMetrics` (Phase M2) must check `counter.windowEnd > Date.now()` -- expired counters should return 0

## Related
- [Architecture Doc](../voice-flow-monitoring-harness.md) Section 4.1.3
- [PERFORMANCE_PATTERNS.md](../../scripts/ralph/prds/voice-monitor-harness/context/PERFORMANCE_PATTERNS.md) Pattern 3
- Existing `rateLimits` table uses similar counter pattern
