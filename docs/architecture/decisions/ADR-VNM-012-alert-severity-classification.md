# ADR-VNM-012: Alert Severity Classification System

**Status:** Accepted
**Date:** 2026-02-16
**Phase:** M4 - Pipeline Alerts
**Author:** Architecture Reviewer (Pre-implementation)

---

## Context

The pipeline health check system generates 6 types of alerts. Each alert type must be assigned a severity level that communicates the urgency and operational impact to platform staff. The `platformCostAlerts` table uses a 2-level system (`warning`|`critical`), but M4 requires finer granularity to distinguish between a circuit breaker failure (service down) and a backlog accumulation (operational debt).

---

## Decision

**Use a 4-level severity system: `critical`, `high`, `medium`, `low`.** Assign severity based on the operational impact and urgency of the underlying condition.

---

## Severity Definitions

| Level | Meaning | Action Required | Example |
|-------|---------|----------------|---------|
| **critical** | Service is unavailable or data loss is imminent | Immediate investigation required | Circuit breaker open -- AI calls blocked |
| **high** | Significant degradation, pipeline reliability at risk | Investigate within 30 minutes | Failure rate > 10% -- one in ten voice notes failing |
| **medium** | Performance degradation, user-visible impact possible | Investigate within 2 hours | Latency spike or queue backup |
| **low** | Operational concern, no immediate user impact | Review at next convenience | Disambiguation backlog or inactivity |

---

## Alert Type to Severity Mapping

| Alert Type | Severity | Rationale |
|-----------|----------|-----------|
| `PIPELINE_CIRCUIT_BREAKER_OPEN` | **critical** | AI service unavailable. No voice notes can be processed. All pipelines blocked. |
| `PIPELINE_HIGH_FAILURE_RATE` | **high** | >10% failure rate means a meaningful portion of coach voice notes are not being processed. Data loss risk. |
| `PIPELINE_HIGH_LATENCY` | **medium** | Current latency > 2x historical average. User-visible delay but notes are still being processed. |
| `PIPELINE_HIGH_QUEUE_DEPTH` | **medium** | >50 artifacts queued. Pipeline is backed up, possibly due to slow processing or spike in volume. |
| `PIPELINE_DISAMBIGUATION_BACKLOG` | **low** | >100 entity resolutions awaiting manual review. Does not block pipeline execution -- notes still process, just some entities unresolved. |
| `PIPELINE_INACTIVITY` | **low** | No voice notes received in 60+ minutes. Could be normal (night hours, weekend) or could indicate ingestion failure. Informational. |

---

## Rationale

### 1. Why Not 2-Level Like platformCostAlerts

The existing `platformCostAlerts` uses `warning`|`critical` because cost alerts have a natural binary split: approaching budget (warning) vs. exceeded budget (critical). Pipeline health has more gradations:

- A circuit breaker open is not the same urgency as disambiguation backlog
- A 15% failure rate is more urgent than a 120ms latency spike
- Mapping `high` -> `critical` and `medium` -> `warning` loses the distinction between "AI service is down" and "failure rate is elevated"

### 2. Why Not 5+ Levels

More levels create decision paralysis. 4 levels map cleanly to common incident response frameworks (P1/P2/P3/P4 or SEV1-SEV4). Platform staff can quickly triage based on severity without reading the full message.

### 3. Sort Order for Dashboard

`getActiveAlerts` returns alerts sorted by severity (critical first) then by `createdAt` descending. The severity sort is done in-memory after collection because:

- Maximum 6 unacknowledged alerts (one per type, due to deduplication)
- In-memory sort of 6 items is trivial (< 1ms)
- No index needed for severity sort on such a small dataset

```typescript
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

alerts.sort((a, b) => {
  const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  if (severityDiff !== 0) return severityDiff;
  return b.createdAt - a.createdAt; // Newest first within same severity
});
```

### 4. Severity is Static Per Alert Type

Each alert type always maps to the same severity. There is no dynamic severity calculation based on the magnitude of the anomaly (e.g., "20% failure rate = critical, 11% = high"). This simplification is intentional:

- The threshold already encodes "when to alert" (e.g., >10%)
- Varying severity within one alert type adds complexity for minimal benefit
- If >10% is high, what threshold makes it critical? This is a separate policy decision deferred to future phases
- The `metadata` field preserves the actual values for staff to assess manually

---

## Future Enhancements (Not M4 Scope)

1. **Configurable thresholds**: Allow platform staff to adjust when each alert fires (e.g., failure rate threshold from 10% to 5%)
2. **Dynamic severity**: Escalate severity if condition persists across multiple health check cycles (e.g., high -> critical after 30 minutes)
3. **Auto-resolution**: Automatically close alerts when the triggering condition clears
4. **Notification channels**: Route critical alerts to Slack/email, low alerts to dashboard only

---

## Consequences

- 4-level severity provides clear triage guidance
- Each alert type has exactly one severity -- no ambiguity
- In-memory sort is safe due to deduplication bounding the result set
- `voicePipelineAlerts.severity` union: `v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low"))`
- Dashboard can color-code: critical=red, high=orange, medium=yellow, low=blue

---

## Related

- ADR-VNM-008: Alert storage strategy (table schema)
- ADR-VNM-010: Alert deduplication (bounds active alert count to max 6)
- ADR-VNM-009: Health check execution model (single mutation creates all alerts)
