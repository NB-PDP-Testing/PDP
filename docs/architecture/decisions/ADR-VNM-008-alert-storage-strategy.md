# ADR-VNM-008: Alert Storage Strategy -- New Table vs. Reuse platformCostAlerts

**Status:** Accepted
**Date:** 2026-02-15
**Phase:** M4 - Pipeline Alerts
**Author:** Architecture Reviewer (Pre-implementation)

---

## Context

M4 requires storing pipeline health alerts (6 types with 4 severity levels). The PRD suggests reusing the existing `platformCostAlerts` table, but also acknowledges the schema mismatch. Two options exist:

**Option A: Reuse `platformCostAlerts`** -- extend the existing table's closed union validators.

**Option B: Create `voicePipelineAlerts`** -- a new dedicated table with pipeline-specific fields.

### Current `platformCostAlerts` Schema (schema.ts lines 2407-2436)

```typescript
platformCostAlerts: defineTable({
  alertType: v.union(
    v.literal("org_daily_threshold"),
    v.literal("org_daily_exceeded"),
    v.literal("org_monthly_threshold"),
    v.literal("org_monthly_exceeded"),
    v.literal("platform_spike")
  ),
  organizationId: v.optional(v.string()),
  severity: v.union(v.literal("warning"), v.literal("critical")),
  message: v.string(),
  triggerValue: v.number(),
  thresholdValue: v.number(),
  timestamp: v.number(),
  acknowledged: v.boolean(),
  acknowledgedBy: v.optional(v.string()),
  acknowledgedAt: v.optional(v.number()),
})
  .index("by_timestamp", ["timestamp"])
  .index("by_org", ["organizationId"])
  .index("by_severity_ack", ["severity", "acknowledged"]),
```

### What M4 Needs

- **6 new alert types**: `PIPELINE_HIGH_FAILURE_RATE`, `PIPELINE_HIGH_LATENCY`, `PIPELINE_HIGH_QUEUE_DEPTH`, `PIPELINE_DISAMBIGUATION_BACKLOG`, `PIPELINE_CIRCUIT_BREAKER_OPEN`, `PIPELINE_INACTIVITY`
- **4-level severity**: `critical`, `high`, `medium`, `low`
- **Metadata field**: JSON object for check-specific data (failureRate, threshold, currentLatency, etc.)
- **No organizationId**: Pipeline alerts are platform-wide
- **No triggerValue/thresholdValue**: M4 uses metadata object instead

---

## Decision

**Create a new `voicePipelineAlerts` table.** Do NOT extend `platformCostAlerts`.

---

## Rationale

### 1. Schema Incompatibility is Severe

Reusing `platformCostAlerts` requires expanding TWO closed union validators:

- `alertType`: Add 6 new `PIPELINE_*` literals to the existing 5 cost literals
- `severity`: Change from 2-value (`warning`|`critical`) to 4-value (`critical`|`high`|`medium`|`low`)

This is a **breaking schema change** for the existing cost alerting system. Every existing cost alert function that writes to this table would need to be verified against the new union. The `checkCostAlerts` function (lines 23-188 of `platformCostAlerts.ts`) uses hardcoded severity values -- these would still be valid, but the expanded union creates a wider surface area for bugs.

### 2. Field Mismatch

| Field | Cost Alerts | Pipeline Alerts |
|-------|------------|-----------------|
| `organizationId` | Required (per-org budgets) | Not applicable (platform-wide) |
| `triggerValue` | Required (spend amount) | Not applicable |
| `thresholdValue` | Required (budget threshold) | Not applicable |
| `metadata` | Does not exist | Required (check-specific data) |

To make `platformCostAlerts` work for both, all cost-specific fields would need to become `v.optional()`, which weakens the schema for existing cost alerts.

### 3. Separation of Concerns

Cost alerts and pipeline health alerts serve fundamentally different purposes:
- **Cost alerts**: Per-organization budget monitoring, triggered by spend patterns
- **Pipeline alerts**: Platform-wide health monitoring, triggered by operational metrics

Mixing them in one table conflates two unrelated domains. Queries for pipeline alerts would need to filter by `alertType` prefix (`PIPELINE_*`), which is fragile and cannot use an index efficiently.

### 4. Independent Lifecycle

Pipeline alerts may evolve independently (add new check types, change severity mappings, add auto-resolution). A separate table allows this evolution without risk to cost alerting.

### 5. Index Optimization

A dedicated table allows indexes tailored to pipeline alert queries:
- `by_alertType_and_acknowledged`: For deduplication check (fast lookup of unacknowledged alerts by type)
- `by_acknowledged_and_severity`: For getActiveAlerts (all unacknowledged, ordered by severity)
- `by_createdAt`: For getAlertHistory pagination

The existing `platformCostAlerts` indexes (`by_timestamp`, `by_org`, `by_severity_ack`) do not match M4 query patterns.

---

## New Table Schema

```typescript
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
    // Check-specific data, varies by alertType
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

### Index Justification

1. **`by_alertType_and_acknowledged`**: Used by deduplication check in `checkPipelineHealth`. Query: "Is there an unacknowledged alert of type X?" -- `.withIndex("by_alertType_and_acknowledged", q => q.eq("alertType", type).eq("acknowledged", false))`.

2. **`by_acknowledged_and_createdAt`**: Used by `getActiveAlerts`. Query: "All unacknowledged alerts, ordered by creation time" -- `.withIndex("by_acknowledged_and_createdAt", q => q.eq("acknowledged", false))`.

3. **`by_createdAt`**: Used by `getAlertHistory` for pagination. Query: "All alerts ordered by time" -- `.withIndex("by_createdAt").order("desc").paginate(opts)`.

---

## Consequences

- **New table in schema.ts**: One additional table definition (~30 lines)
- **No migration needed**: Cost alerts remain untouched
- **Clean domain boundary**: Pipeline monitoring is fully self-contained
- **All M4 functions reference `voicePipelineAlerts`**, not `platformCostAlerts`
- **acknowledgeAlert uses `v.id("voicePipelineAlerts")`**, not `v.id("platformCostAlerts")`
- **getActiveAlerts does NOT need prefix filtering** -- all rows in the table are pipeline alerts

---

## Rejected Alternative: Severity Mapping (4 to 2)

The PRD mentions mapping 4 severities to 2 (`low`/`medium` -> `warning`, `high`/`critical` -> `critical`) to fit the existing schema. This was rejected because:

1. Information loss -- a `high` failure rate alert appears identical in severity to a `critical` circuit breaker alert
2. Dashboard cannot differentiate priority within the same severity bucket
3. The mapping is confusing and would require documentation in every alert function

---

## Related

- ADR-VNM-001: Event log schema design (M1)
- ADR-VNM-002: Counter-based metrics architecture (M1)
- ADR-VNM-004: Snapshot-based analytics (M2)
- Phase 6.1 platformCostAlerts (cost monitoring domain, separate)
