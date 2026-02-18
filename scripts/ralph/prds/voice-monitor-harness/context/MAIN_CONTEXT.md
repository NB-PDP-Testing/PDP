# Voice Flow Monitoring Harness - Main Context

**Project:** Voice Flow Monitoring Harness
**Issue:** [#495](https://github.com/NB-PDP-Testing/PDP/issues/495)
**Branch:** `feat/voice-monitor-harness`
**Architecture:** [voice-flow-monitoring-harness.md](../../../docs/architecture/voice-flow-monitoring-harness.md)

---

## Executive Summary

The Voice Flow Monitoring Harness is a **platform-staff-only admin section** at `/platform/voice-monitoring` that provides comprehensive observability for the voice note processing pipeline (v2). It enables real-time monitoring, historical analytics, manual retry operations, and automated health alerts.

### Key Goals
- **Real-time visibility** into active pipeline processing
- **Historical analytics** with trends and breakdowns
- **Manual retry** capability for failed stages
- **Automated alerts** for anomalies (failure spikes, latency, circuit breaker)
- **Subsume v2-claims page** into unified monitoring interface

---

## Voice Notes v2 Pipeline Overview

The v2 pipeline processes voice notes through 6 stages:

```
1. INGESTION
   ↓ createArtifact (from WhatsApp, web, mobile)
   Status: received

2. TRANSCRIPTION
   ↓ transcribeAudio (Whisper API)
   Status: transcribing → transcribed

3. CLAIMS EXTRACTION
   ↓ extractClaims (GPT-4o)
   Status: processing

4. ENTITY RESOLUTION
   ↓ resolveEntities (fuzzy matching)
   Status: processing

5. DRAFT GENERATION
   ↓ generateDrafts (create insight drafts)
   Status: processing

6. CONFIRMATION
   ↓ confirmDraft / rejectDraft (coach review)
   Status: completed
```

**Failure Handling:** Any stage can fail → status becomes `failed`, pipeline halts

---

## Existing v2 Pipeline Tables

### Core Pipeline Tables (8 tables)

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `voiceNoteArtifacts` | Source-agnostic input records | artifactId (UUID), status, sourceChannel, orgContextCandidates[], createdAt |
| `voiceNoteTranscripts` | Whisper transcriptions | artifactId, fullText, segments[], duration, modelUsed |
| `voiceNoteClaims` | Atomic claims (15 topics) | claimId, artifactId, topic, status, extractionConfidence, organizationId |
| `voiceNoteEntityResolutions` | Entity match candidates | claimId, artifactId, rawText, candidates[], status, organizationId |
| `coachPlayerAliases` | Learned name aliases | coachUserId, rawText, resolvedEntityId, useCount |
| `insightDrafts` | Pending insights for confirmation | artifactId, claimId, aiConfidence, status, organizationId |
| `voiceNoteInsights` | Confirmed insights | voiceNoteId, confidenceScore, status, category, organizationId |
| `autoAppliedInsights` | Auto-apply audit trail | insightId, appliedAt, undoneAt |

### AI Monitoring Tables (Existing)

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `aiServiceHealth` | Circuit breaker state | status, circuitBreakerState, recentFailureCount |
| `aiUsageLog` | Per-API-call cost tracking | operation, model, cost, inputTokens, cacheHitRate |
| `aiUsageDailyAggregates` | Daily cost rollups | date, organizationId, totalCost, totalCalls |
| `orgCostBudgets` | Per-org spending caps | organizationId, dailyBudgetUsd, currentDailySpend |
| `platformCostAlerts` | Alert audit trail | alertType, severity, acknowledged, createdAt |

---

## New Monitoring Tables (3 tables to add)

### 1. `voicePipelineEvents` - Pipeline Event Log

**Purpose:** Single source of truth for all pipeline activity
**Retention:** 48 hours (raw events), then rely on snapshots

**Key Fields:**
- `eventId` (UUID) - Deduplication
- `eventType` (25+ types) - What happened
- `artifactId` - Link to artifact
- `organizationId` - For org-scoped queries
- `pipelineStage` - Which stage (ingestion, transcription, etc.)
- `metadata` - Stage-specific data (costs, counts, confidence, duration)
- `timestamp` - When it happened
- `timeWindow` - **CRITICAL:** Format `"YYYY-MM-DD-HH"` for efficient cleanup

**Event Types (25 total):**
- Lifecycle: artifact_received, artifact_completed, artifact_failed
- Transcription: transcription_started, transcription_completed, transcription_failed
- Claims: claims_extraction_started, claims_extracted, claims_extraction_failed
- Resolution: entity_resolution_started, entity_resolution_completed, entity_needs_disambiguation
- Drafts: draft_generation_started, drafts_generated, draft_confirmed, draft_rejected
- Retry: retry_initiated, retry_succeeded, retry_failed
- System: circuit_breaker_opened, circuit_breaker_closed, budget_exceeded, rate_limit_hit

### 2. `voicePipelineMetricsSnapshots` - Pre-Aggregated Metrics

**Purpose:** Fast historical queries without scanning raw events
**Retention:** Hourly snapshots (7 days), Daily snapshots (90 days)

**Key Metrics:**
- Throughput: artifactsReceived, artifactsCompleted, artifactsFailed
- Latency: avgTranscriptionLatency, avgClaimsExtractionLatency, avgEndToEndLatency, p95EndToEndLatency
- Quality: avgTranscriptConfidence, avgClaimConfidence, autoResolutionRate, disambiguationRate
- Errors: transcriptionFailureRate, claimsExtractionFailureRate, overallFailureRate
- Volume: totalClaimsExtracted, totalEntitiesResolved, totalDraftsGenerated
- Cost: totalAICost, avgCostPerArtifact

### 3. `voicePipelineCounters` - Real-Time Atomic Counters

**Purpose:** O(1) real-time metrics (no event scanning)
**Pattern:** Incremented atomically in same transaction as event insert

**Counter Types:**
- `artifacts_received_1h` - Rolling 1-hour window
- `artifacts_completed_1h`
- `artifacts_failed_1h`
- `transcriptions_completed_1h`
- `claims_extracted_1h`
- `entities_resolved_1h`
- `drafts_generated_1h`

**Lifecycle:**
1. Event inserted → increment counter
2. If `Date.now() > windowEnd` → reset counter to 1, set new window
3. Dashboard queries counters directly (< 50ms)

---

## Key Architectural Patterns

### 1. Time-Window Partitioning

**Problem:** Deleting old events by timestamp requires full table scan
**Solution:** Partition by hourly `timeWindow` field

```typescript
// Event insert time: Feb 15, 2026 14:30
const timeWindow = "2026-02-15-14"  // Hourly bucket

// Cleanup (efficient):
// Delete all events WHERE timeWindow IN (expired_windows)
// Uses by_timeWindow index - no full scan
```

### 2. Counter-Based Real-Time Metrics

**Problem:** Scanning events for real-time counts is slow (O(n))
**Solution:** Atomic counters updated with each event (O(1) read)

```typescript
// BAD: Scan events (slow)
const count = await ctx.db.query("voicePipelineEvents")
  .withIndex("by_eventType_and_timestamp", q =>
    q.eq("eventType", "artifact_received")
     .gte("timestamp", oneHourAgo)
  )
  .collect().length;  // O(n) on event count

// GOOD: Read counter (fast)
const counter = await ctx.db.query("voicePipelineCounters")
  .withIndex("by_counterType", q => q.eq("counterType", "artifacts_received_1h"))
  .first();
const count = counter?.currentValue || 0;  // O(1)
```

### 3. Snapshot-Based Historical Queries

**Problem:** Aggregating events for 30-day metrics is expensive
**Solution:** Pre-computed snapshots (hourly cron aggregates events into snapshots)

```typescript
// For last 7 days: query hourly snapshots (168 documents)
// For last 30 days: query daily snapshots (30 documents)
// For last 90 days: query daily snapshots (90 documents)
// NEVER aggregate raw events beyond current hour
```

### 4. Cursor-Based Pagination

**Problem:** `.take(limit)` has no continuation, loses data beyond limit
**Solution:** `.paginate(paginationOpts)` returns cursor for infinite scroll

```typescript
// NEVER do this:
.order("desc").take(50)  // ❌ No way to load more

// ALWAYS do this:
.order("desc").paginate(args.paginationOpts)  // ✅ Returns continueCursor
```

### 5. Fire-and-Forget Event Logging

**Problem:** Event logging should never block pipeline execution
**Solution:** Schedule event logging asynchronously

```typescript
// In mutations (voiceNoteArtifacts.ts, etc.):
await ctx.scheduler.runAfter(0,
  internal.models.voicePipelineEvents.logEvent,
  { eventType: "artifact_received", ... }
);
// Returns immediately, logEvent runs in background

// In actions (voiceNotes.ts, transcribeAudio, etc.):
await ctx.runMutation(internal.models.voicePipelineEvents.logEvent, {...});
// Must await (actions have no scheduler), but lightweight (< 10ms)
```

---

## Pipeline Status Flows

### Artifact Status Flow
```
received → transcribing → transcribed → processing → completed
                                                    ↘ failed
```

### Claim Status Flow
```
extracted → resolving → resolved
                      ↘ needs_disambiguation
          ↘ merged | discarded | failed
```

### Entity Resolution Status Flow
```
auto_resolved | needs_disambiguation → user_resolved | unresolved
```

### Draft Status Flow
```
pending → confirmed → applied
        ↘ rejected | expired
```

---

## Organization Data Isolation Pattern

**CRITICAL:** All v2 pipeline tables include `organizationId` field for data isolation.

**Artifact Exception:** `voiceNoteArtifacts` does NOT have a top-level `organizationId` field. Instead:
```typescript
// Artifact schema:
{
  artifactId: "uuid",
  orgContextCandidates: [
    { organizationId: "org1", confidence: 0.95 },
    { organizationId: "org2", confidence: 0.05 }
  ]
}

// To get org ID:
const organizationId = artifact.orgContextCandidates[0]?.organizationId;  // Highest confidence
```

**All other v2 tables** (claims, resolutions, drafts) have flat `organizationId: v.string()`.

---

## Feature Flag System

The v2 pipeline is gated by feature flags (used for gradual rollout):

```typescript
// Priority cascade:
1. platformConfig.voice_notes_v2_enabled (global kill switch)
2. organization.settings.voiceNotesVersion ("v2" or "v1")
3. member.betaFeatures[] includes "voice_notes_v2"
4. PostHog flag "voice-notes-v2-rollout" (A/B test)
Default: v1 (safe fallback)
```

For monitoring harness development, assume **v2 is enabled** (test data uses v2 artifacts).

---

## Circuit Breaker Pattern

The `aiServiceHealth` table tracks AI service health:

```typescript
{
  status: "healthy" | "degraded" | "unhealthy",
  circuitBreakerState: "closed" | "open" | "half_open",
  recentFailureCount: number,
  lastFailureAt: number,
  lastSuccessAt: number
}
```

**States:**
- **Closed:** Normal operation, all AI calls proceed
- **Open:** Too many failures, all AI calls blocked (immediate fail)
- **Half-Open:** Testing recovery, limited AI calls allowed

**Alert:** Pipeline alerts should emit `circuit_breaker_opened` / `circuit_breaker_closed` events on state transitions.

---

## Scale Targets

| Tier | Coaches | Voice Notes/Day | Events/Day | Status |
|------|---------|-----------------|------------|--------|
| Small | ~50 | ~100 | ~500-1,000 | Comfortable |
| Medium | ~500 | ~1,000 | ~5,000-10,000 | Comfortable |
| Large | ~2,000 | ~5,000 | ~25,000-50,000 | Supported (target for this architecture) |
| Scale | ~10,000 | ~25,000+ | ~125,000+ | Requires external metrics (deferred) |

**Design Constraint:** This architecture targets **Large tier** (~2,000 coaches, ~5,000 notes/day). Beyond that, migrate to external metrics storage (Datadog, Prometheus).

---

## Dashboard Structure (8 Pages)

1. **Overview** (`/platform/voice-monitoring`)
   - Flow graph (5 stages)
   - Real-time status cards (6 metrics)
   - Recent activity feed (last 20 events)

2. **Artifacts** (`/platform/voice-monitoring/artifacts`)
   - Grid view with filters (subsumes v2-claims)
   - Expandable rows (claims, resolutions, drafts inline)
   - Retry buttons for failed artifacts

3. **Artifact Detail** (`/platform/voice-monitoring/artifacts/[artifactId]`)
   - Vertical event timeline (chronological)
   - Claims section (reuse v2-claims components)
   - Retry panel (available options + history)

4. **Metrics** (`/platform/voice-monitoring/metrics`)
   - Time range selector (1h, 6h, 24h, 7d, 30d)
   - CSS-based charts (throughput, latency, errors, costs)
   - Org breakdown table

5. **Events** (`/platform/voice-monitoring/events`)
   - Raw event log with filters
   - Expandable rows (JSON payload)
   - Export to CSV

6. **Pipeline** (`/platform/voice-monitoring/pipeline`)
   - Expanded flow graph
   - Stage drill-down (artifacts at each stage)
   - Active artifacts panel

7. **Alerts** (`/platform/voice-monitoring/alerts`)
   - Active alerts (unacknowledged)
   - Alert history with filters
   - Acknowledge button

8. **Settings** (`/platform/voice-monitoring/settings`) - DEFERRED

---

## Performance Requirements

| Operation | Target | How to Achieve |
|-----------|--------|----------------|
| Dashboard page load | < 2 seconds | Cursor pagination, skip patterns, lift queries to parent |
| Real-time metrics query | < 50ms | Read counters only (7-8 documents), never scan events |
| Artifact list query | < 200ms | Cursor pagination (50 items), use indexes |
| Event timeline query | < 100ms | Single artifact, indexed by artifactId |
| Event logging | < 10ms | Fire-and-forget (non-blocking), atomic counter increment |
| Hourly aggregation cron | < 30 seconds | Query by timeWindow (efficient), aggregate ~1000 events |
| Alert health check | < 10 seconds | Read counters + last snapshot, 6 threshold checks |

---

## Testing Strategy

### Manual Testing (All Phases)
- Use test account: `neil.B@blablablak.com` / `lien1979`
- Platform staff role required for access
- Verify authorization redirects non-staff users

### E2E Testing (Phase M9)
- Playwright tests in `apps/web/uat/tests/voice-monitoring/`
- Test scenarios: dashboard load, tab navigation, filters, pagination, retry, alerts
- Coverage target: All 8 pages, all critical user flows

### Performance Testing
- Load test: 1000 events in 1 hour → verify aggregation < 30s
- Dashboard load test: Cold start < 2s
- Real-time metrics stress test: 100 concurrent queries < 50ms avg

---

## Common Pitfalls to Avoid

1. **Using `.take()` instead of `.paginate()`** → Data loss beyond limit
2. **Scanning events for real-time metrics** → Slow, use counters instead
3. **Forgetting platform staff auth** → Security vulnerability
4. **Unbounded org queries** → Must include time bounds (e.g., last 7 days)
5. **Blocking pipeline on event logging** → Use fire-and-forget pattern
6. **Not handling orgContextCandidates** → Artifact org ID is nested, not flat
7. **External charting libraries** → Use CSS-based visualizations only

---

## Reference Documents

- **Architecture:** [voice-flow-monitoring-harness.md](../../../docs/architecture/voice-flow-monitoring-harness.md)
- **v2 Technical Reference:** [voice-notes-v2-technical-reference.md](../../../docs/architecture/voice-notes-v2-technical-reference.md)
- **Performance Patterns:** [PERFORMANCE_PATTERNS.md](./PERFORMANCE_PATTERNS.md)
- **Issue #495:** [GitHub](https://github.com/NB-PDP-Testing/PDP/issues/495)
- **CLAUDE.md:** Project-wide patterns (N+1 prevention, Better Auth, Convex rules)

---

**Last Updated:** February 15, 2026
**For:** Ralph (Automated Project Management System)
