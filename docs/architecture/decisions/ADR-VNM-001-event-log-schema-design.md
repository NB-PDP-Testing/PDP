# ADR-VNM-001: Event Log Schema Design (Time-Window Partitioning and Retention)

## Status
Accepted

## Context

The Voice Flow Monitoring Harness needs a pipeline event log table (`voicePipelineEvents`) to record every meaningful state transition in the v2 voice notes pipeline. This table serves as the single source of truth for pipeline observability.

Key constraints:
- The table will grow with every pipeline execution (~5-10 events per artifact)
- At target scale (~5,000 voice notes/day = ~25,000-50,000 events/day), raw event storage becomes expensive
- Events older than 48 hours lose operational value -- historical analytics use pre-aggregated snapshots instead
- Cleanup (deleting old events) must be efficient; scanning by timestamp requires a full table scan in Convex
- Event deduplication is needed for idempotent retries

## Decision

### 1. Time-Window Partitioning via String Field

Use a computed `timeWindow: v.string()` field with format `"YYYY-MM-DD-HH"` (e.g., `"2026-02-15-14"`) that acts as a logical partition key. This field is:
- Computed at event insert time in `logEvent` mutation
- Indexed via `by_timeWindow` for efficient bucket-based cleanup
- Used with `by_timeWindow_and_eventType` for time-bounded analytical queries

```typescript
function computeTimeWindow(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCHours()).padStart(2, '0')}`;
}
```

### 2. 27 Event Types as Closed Union

All event types are defined as a `v.union()` of `v.literal()` values, covering:
- **Artifact lifecycle** (4): received, status_changed, completed, failed
- **Transcription** (3): started, completed, failed
- **Claims extraction** (3): started, extracted, failed
- **Entity resolution** (4): started, completed, failed, needs_disambiguation
- **Draft generation** (3): started, generated, failed
- **Confirmation** (2): confirmed, rejected
- **System** (5): circuit_breaker_opened/closed, retry_initiated/succeeded/failed
- **Cost** (3): budget_threshold_reached, budget_exceeded, rate_limit_hit

### 3. UUID-Based Event Deduplication

`eventId` is `v.string()` (not `v.id()`) containing a `crypto.randomUUID()`. This supports:
- Idempotent event logging (query by eventId before insert if needed)
- External reference without Convex ID coupling

### 4. 48-Hour Raw Event Retention

Raw events are kept for 48 hours only. Historical analytics use `voicePipelineMetricsSnapshots` (7-day hourly, 90-day daily).

### 5. Nine Indexes

| Index | Fields | Query Pattern |
|-------|--------|---------------|
| by_artifactId | [artifactId] | Event timeline for single artifact |
| by_timestamp | [timestamp] | Default chronological listing |
| by_eventType | [eventType] | Filter by event type |
| by_eventType_and_timestamp | [eventType, timestamp] | Type + time range queries |
| by_org_and_timestamp | [organizationId, timestamp] | Org-scoped time-bounded queries |
| by_pipelineStage | [pipelineStage] | Filter by stage |
| by_pipelineStage_and_timestamp | [pipelineStage, timestamp] | Stage + time range queries |
| by_timeWindow | [timeWindow] | Efficient bulk cleanup |
| by_timeWindow_and_eventType | [timeWindow, eventType] | Hourly aggregation by type |

## Consequences

### Positive
- Cleanup deletes entire hourly buckets via index, not full-table scans
- 48-hour retention keeps event table small (~50K-100K documents max at target scale)
- Closed union prevents typos in event types at compile time
- Nine indexes cover all planned query patterns across M1-M9

### Negative
- Nine indexes add storage overhead (~9x the index-to-document ratio)
- `by_pipelineStage` alone (without timestamp) may have limited use -- could be removed if only `by_pipelineStage_and_timestamp` is needed in practice
- String-based timeWindow requires UTC consistency -- `new Date()` behavior varies by runtime timezone

### Risks
- **UTC consistency**: `computeTimeWindow` MUST use `getUTCHours()` (not `getHours()`) to ensure consistent time windows across server instances. The PRD examples use `getHours()` which is local time -- Ralph must use UTC.
- **Index count**: 9 indexes is near the practical upper bound for a high-write table. Monitor write latency after deployment.

## Implementation Notes
- timeWindow MUST use UTC methods: `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`, `getUTCHours()`
- All optional fields use `v.optional()` wrapper
- metadata is a nested `v.object()` with all-optional fields (not `v.any()`)
- eventId uses `crypto.randomUUID()` -- available in Convex runtime natively

## Related
- [Architecture Doc](../voice-flow-monitoring-harness.md) Section 4.1.1
- [PERFORMANCE_PATTERNS.md](../../scripts/ralph/prds/voice-monitor-harness/context/PERFORMANCE_PATTERNS.md) Pattern 5
- ADR-VN2-013 (Claims index strategy -- similar composite index approach)
