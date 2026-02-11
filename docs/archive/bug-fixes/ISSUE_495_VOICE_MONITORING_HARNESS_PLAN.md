# Issue #495 — Voice Notes Performance Harness / Monitoring Tooling

## Architecture Plan Complete

The full architecture plan for the Voice Flow Monitoring Harness has been designed, reviewed, and merged to `main`.

**Plan document:** [`docs/architecture/voice-flow-monitoring-harness.md`](https://github.com/NB-PDP-Testing/PDP/blob/main/docs/architecture/voice-flow-monitoring-harness.md)

---

## What Was Built (Architecture)

A comprehensive architecture plan covering a **dedicated platform-staff admin section** for monitoring the voice note processing pipeline end-to-end. The plan was developed through 12 architectural decisions and then hardened with 4 performance fixes + scale analysis.

### Scope

- **Real-time** visibility into active pipeline processing
- **Historical** analytics and trend analysis (hourly/daily snapshots)
- **Flow graph** visualization of the 5 pipeline stages
- **Grid view** for tabular artifact inspection (subsumes the existing `/platform/v2-claims` page)
- **Manual retry** capability for failed pipeline stages
- **Pipeline event log** for granular debugging
- **Cost, latency, and quality metrics** across all dimensions
- **Automated alerts** for anomaly detection (failure rate, latency spikes, queue depth)

### 12 Architectural Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Real-time vs Historical | **Both** from day one |
| 2 | Who can access | **Platform staff only** (MVP) |
| 3 | Visualization style | **Flow graph + Grid view** |
| 4 | Detail level | **Both expanded and collapsed** |
| 5 | Which metrics | **All** (latency, throughput, error rate, completion rate, quality, cost) |
| 6 | Alert mechanism | **In-app + notifications** |
| 7 | Retry/intervention | **Manual retry buttons** |
| 8 | Monitoring granularity | **Intermediate** (per-artifact with stage breakdown) |
| 9 | Where it lives | **New dedicated section** — subsumes v2-claims page |
| 10 | Metrics storage | **Convex tables** (to start) |
| 11 | Pipeline event log | **Yes, included** |
| 12 | Open Router/multi-model | **Deferred** to future phase |

---

## Database Architecture (3 New Tables)

### 1. `voicePipelineEvents` — Pipeline Event Log
The core observability table. Records every state transition in the pipeline (artifact received, transcription started/completed, claims extracted, entity resolution, draft generation, failures, retries, circuit breaker events, cost events).

Key design features:
- **`timeWindow` partition field** — Hourly buckets (e.g., `"2026-02-11-09"`) for efficient cleanup and bounded queries
- **48-hour retention** — Raw events are hot operational data only; snapshots handle historical analytics
- **9 indexes** including `by_timeWindow`, `by_org_and_timestamp`, `by_eventType_and_timestamp`

### 2. `voicePipelineMetricsSnapshots` — Pre-Computed Metrics
Periodic aggregations for dashboard performance:
- **Hourly buckets** (kept 7 days) — latency, throughput, error rates, quality scores, cost
- **Daily buckets** (kept 90 days) — same metrics at day granularity
- Per-stage breakdown (transcription, claims extraction, entity resolution, draft generation)
- Per-org breakdown

### 3. `voicePipelineCounters` — Rolling Real-Time Counters
Atomically-incremented counters for live dashboard metrics. Same pattern as the existing `rateLimits` table:
- Counter types: `artifacts_received_1h`, `failures_1h`, `transcriptions_completed_1h`, etc.
- `getRealTimeMetrics` reads counter documents directly — **O(1) reads, no event scanning**
- Window rotation happens inline in `logEvent` — no separate cron needed

---

## 4 Performance Fixes Applied

The initial plan was reviewed and hardened with four specific performance optimizations:

### Fix 1: Time-Window Partitioning
- Added `timeWindow` field to events (hourly bucket string)
- Cleanup deletes entire expired windows via `by_timeWindow` index — no full-table scan
- Changed event retention from 30 days → **48 hours** (snapshots handle history)

### Fix 2: Convex Cursor-Based Pagination
- All list queries use `.paginate(paginationOpts)` — NOT `.take(limit)`
- Returns `{ page, isDone, continueCursor }` for infinite scroll / load-more
- Frontend uses `usePaginatedQuery` hook (pattern from `teamCollaboration.ts`)

### Fix 3: Rolling Counters for Real-Time Metrics
- New `voicePipelineCounters` table — atomically incremented in `logEvent`
- `getRealTimeMetrics` reads counter documents (O(1)) instead of scanning events (O(n))
- Eliminates the most expensive dashboard query pattern

### Fix 4: Tight Time Bounds on Org-Scoped Queries
- All queries using `by_org_and_timestamp` MUST include `.gte("timestamp", bound)`
- Without time bounds, per-org query cost grows linearly with event history

---

## Scale Analysis

| Tier | Coaches | Voice Notes/Day | Events/Day | Status |
|------|---------|-----------------|------------|--------|
| **Small** | ~50 | ~100 | ~500-1,000 | Comfortable |
| **Medium** | ~500 | ~1,000 | ~5,000-10,000 | Comfortable — 48h retention keeps table small |
| **Large** | ~2,000 | ~5,000 | ~25,000-50,000 | Handled — counters + snapshots + partitioning |
| **Scale** | ~10,000 | ~25,000+ | ~125,000-250,000 | Requires architectural changes |

**At Scale tier (10,000+ coaches):**
- Move to external metrics storage (DataDog, Prometheus)
- More aggressive event retention (6h instead of 48h)
- Org-partitioned event tables

**Bottom line:** Convex-tables-only approach works comfortably through Large scale (~2,000 coaches, ~5,000 voice notes/day). Beyond that, evaluate external metrics infrastructure.

---

## Frontend Architecture

### Route Structure
```
/platform/voice-monitoring/           — Dashboard overview (status cards, flow graph, activity feed)
/platform/voice-monitoring/pipeline/  — Expanded flow graph with active artifacts
/platform/voice-monitoring/artifacts/ — Grid view (replaces v2-claims page)
/platform/voice-monitoring/artifacts/[id]/ — Single artifact deep-dive with event timeline
/platform/voice-monitoring/metrics/   — Historical metrics dashboard with charts
/platform/voice-monitoring/alerts/    — Active alerts + alert history
/platform/voice-monitoring/events/    — Raw pipeline event log (structured log viewer)
```

### Navigation
- Tab navigation within monitoring section: Dashboard | Pipeline | Artifacts | Metrics | Alerts | Events
- New card link on Platform Hub (`/platform`)
- v2-claims page removed (functionality subsumed)

---

## Backend Functions (4 New Model Files)

| File | Functions | Purpose |
|------|-----------|---------|
| `voicePipelineEvents.ts` | logEvent, getRecentEvents, getEventTimeline, getActiveArtifacts, getFailedArtifacts | Event logging + queries |
| `voicePipelineMetrics.ts` | getRealTimeMetrics, getHistoricalMetrics, getStageBreakdown, getOrgBreakdown, aggregateHourly/Daily, cleanup | Metrics + aggregation crons |
| `voicePipelineRetry.ts` | retryTranscription, retryClaimsExtraction, retryEntityResolution, retryFullPipeline | Manual retry for failed artifacts |
| `voicePipelineAlerts.ts` | checkPipelineHealth, getActiveAlerts, acknowledgeAlert, getAlertHistory | Automated anomaly detection |

### New Cron Jobs (4)
- Hourly metrics aggregation
- Daily metrics aggregation
- Pipeline health check (every 5 minutes)
- Weekly snapshot cleanup

### Instrumentation (6 Existing Files Modified)
Events emitted from existing pipeline functions via `ctx.scheduler.runAfter(0, ...)` — fire-and-forget, never blocking the pipeline.

---

## Implementation Plan (9 Phases)

| Phase | Name | Scope |
|-------|------|-------|
| M1 | Foundation | Schema (3 tables) + event logging + instrumentation |
| M2 | Metrics & Aggregation | Snapshot aggregation + cron jobs |
| M3 | Retry Operations | Manual retry mutations |
| M4 | Alerts | Automated anomaly detection + cron |
| M5 | Dashboard UI | Main dashboard + flow graph + layout |
| M6 | Artifacts Grid + Detail | Subsume v2-claims + artifact deep-dive |
| M7 | Metrics + Events Pages | Historical analytics + event log viewer |
| M8 | Pipeline View + Alerts | Expanded pipeline viz + alert management |
| M9 | Cleanup & Polish | Remove v2-claims page, update links |

---

## File Impact

- **New files:** 13 (4 backend model files + 9 frontend pages)
- **Modified files:** 8 (schema, crons, 5 existing pipeline files, platform hub)
- **Removed files:** 1 (v2-claims page — subsumed)

---

## What's Deferred

| Feature | Reason |
|---------|--------|
| Multi-provider routing (Open Router) | Defer until learnings from built system |
| Org admin monitoring views | MVP is platform staff only |
| External metrics storage | Starting with Convex tables |
| Automated retry | Manual retry buttons chosen |
| A/B testing of AI models | Part of deferred multi-provider story |

---

## References

- **Full plan:** [`docs/architecture/voice-flow-monitoring-harness.md`](https://github.com/NB-PDP-Testing/PDP/blob/main/docs/architecture/voice-flow-monitoring-harness.md)
- **PR #494:** Applied 4 performance fixes + scale analysis
- **Existing infrastructure audit:** 8 v2 pipeline tables, 6 monitoring/AI tables, 4 cron jobs already running
