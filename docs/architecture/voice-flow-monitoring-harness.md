# Voice Flow Monitoring Harness - Architecture Plan

> **Status:** DRAFT - Awaiting User Approval
> **Author:** Claude (Architecture Session)
> **Date:** 2026-02-11
> **Branch:** `claude/voice-flow-monitoring-lu5iy`

---

## 1. Executive Summary

The Voice Flow Monitoring Harness is a **dedicated platform-staff admin section** for monitoring the voice note processing pipeline end-to-end. It provides:

- **Real-time** visibility into active pipeline processing
- **Historical** analytics and trend analysis
- **Flow graph** visualization of the pipeline stages
- **Grid view** for tabular artifact inspection
- **Manual retry** capability for failed stages
- **Pipeline event log** for granular debugging
- **Cost, latency, and quality metrics** across all dimensions

Per the user's decisions, it will:
- Be **platform-staff only** for MVP (org-level insights visible to staff)
- **Subsume the existing v2-claims page** into this new section
- Store metrics in **Convex tables** (not external)
- Provide **both expanded and collapsed** artifact views
- Track at **intermediate granularity** (per-artifact with stage breakdown)
- Support **manual retry buttons** for failed pipeline stages
- Use **in-app alerts + toast notifications** for operational issues
- **Defer** multi-provider/model routing (Open Router) to a future phase

---

## 2. User Decision Summary

| # | Question | Decision |
|---|----------|----------|
| 1 | Real-time vs Historical | **Both** from day one |
| 2 | Who can access | **Platform staff only** (MVP); org-level insights visible to staff |
| 3 | Visualization style | **Flow graph + Grid view** |
| 4 | Detail level | **Both expanded and collapsed** |
| 5 | Which metrics | **All** (latency, throughput, error rate, completion rate, quality, cost) |
| 6 | Alert mechanism | **In-app + notifications** (like Option B, with recommendations) |
| 7 | Retry/intervention | **Manual retry buttons** (Option A) |
| 8 | Monitoring granularity | **Intermediate** (per-artifact with stage breakdown) |
| 9 | Where it lives | **New dedicated section** (Option C); subsume v2-claims page |
| 10 | Metrics storage | **Convex tables** (Option B, to start) |
| 11 | Pipeline event log | **Yes, include it** |
| 12 | Open Router/multi-model | **Deferred** |

---

## 3. Existing Infrastructure Audit

### 3.1 Database Tables (Already Exist)

**v2 Pipeline Tables (8 tables):**
| Table | Records | Key Fields | Indexes |
|-------|---------|-----------|---------|
| `voiceNoteArtifacts` | Source-agnostic input records | artifactId, status, sourceChannel, senderUserId | by_artifactId, by_status_and_createdAt, by_senderUserId_and_createdAt |
| `voiceNoteTranscripts` | Whisper transcriptions with segments | artifactId, fullText, segments[], duration, modelUsed | by_artifactId |
| `voiceNoteClaims` | Atomic claims (15 topics) | claimId, artifactId, topic, status, extractionConfidence | by_artifactId, by_artifactId_and_status, by_org_and_status |
| `voiceNoteEntityResolutions` | Entity match candidates | claimId, artifactId, rawText, candidates[], status | by_artifactId_and_status, by_org_and_status |
| `coachPlayerAliases` | Learned name aliases | coachUserId, rawText, resolvedEntityId, useCount | by_coach_org_rawText |
| `insightDrafts` | Pending insights for confirmation | artifactId, claimId, aiConfidence, status | by_artifactId_and_status |
| `voiceNoteInsights` | Dedicated insight records | voiceNoteId, confidenceScore, status, category | by_coach_org_status, by_category_status |
| `autoAppliedInsights` | Auto-apply audit trail | insightId, appliedAt, undoneAt | by_org_and_appliedAt |

**Monitoring/AI Tables (6 tables):**
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `aiServiceHealth` | Circuit breaker singleton | status, circuitBreakerState, recentFailureCount |
| `aiUsageLog` | Per-API-call cost tracking | operation, model, cost, inputTokens, cacheHitRate |
| `aiUsageDailyAggregates` | Pre-computed daily rollups | date, organizationId, totalCost, totalCalls |
| `orgCostBudgets` | Per-org spending caps | dailyBudgetUsd, currentDailySpend |
| `platformCostAlerts` | Alert audit trail | alertType, severity, acknowledged |
| `rateLimits` | Rate limiting infrastructure | scope, limitType, currentCount |

**Settings:**
| Table | Purpose |
|-------|---------|
| `platformMessagingSettings` | Emergency mode, feature toggles |
| `featureFlags` | Cascade flags (env → platform → org → user) |

### 3.2 Pipeline Status Flows (Already Defined)

```
v2 Artifact:     received → transcribing → transcribed → processing → completed
                                                                    ↘ failed

v2 Claim:        extracted → resolving → resolved
                                       ↘ needs_disambiguation
                           ↘ merged | discarded | failed

Entity Resolution: auto_resolved | needs_disambiguation → user_resolved | unresolved

Insight Draft:    pending → confirmed → applied
                          ↘ rejected | expired
```

### 3.3 Existing Frontend Pages (Will Be Replaced/Subsumed)

| Page | Path | What It Does | Fate |
|------|------|-------------|------|
| v2 Claims Viewer | `/platform/v2-claims` | Artifact list + claim rows with stats | **Subsume** into monitoring harness |
| Messaging Dashboard | `/platform/messaging` | AI usage, costs, service health, settings | **Keep separate** (general AI dashboard) |
| Platform Hub | `/platform` | Landing page with links to admin sections | **Add link** to new monitoring section |

### 3.4 Backend Functions Available

**Artifact queries:** `getRecentArtifacts` (public), `getArtifactByArtifactId`, `getArtifactById`, `getArtifactsByVoiceNote` (internal)
**Claim queries:** `getRecentClaims`, `getClaimsByOrgAndCoach` (public), `getClaimsByArtifact`, `getClaimsByArtifactAndStatus` (internal)
**Resolution queries:** `getDisambiguationQueue`, `getDisambiguationForArtifact`, `getResolutionsByClaim` (public)
**Health/Cost:** `getPlatformServiceHealth`, `getPlatformUsage`, `getOrgUsage`
**Circuit breaker:** `shouldCallAPI`, `buildHealthUpdate`, `forceResetCircuitBreaker`

### 3.5 Cron Jobs (Already Running)

- `aggregate-daily-usage` - Daily at 1 AM UTC (AI usage rollups)
- `check-cost-alerts` - Every 10 minutes (budget threshold checks)
- `reset-rate-limit-windows` - Hourly (rate limit counters)
- `adjust-insight-thresholds` - Daily at 2 AM (confidence calibration)

---

## 4. Architecture Design

### 4.1 New Database Tables

#### 4.1.1 `voicePipelineEvents` — Pipeline Event Log

The core of the monitoring system. Records every meaningful state transition in the pipeline.

```typescript
voicePipelineEvents: defineTable({
  // Event identity
  eventId: v.string(),                    // UUID for deduplication

  // What happened
  eventType: v.union(
    // Artifact lifecycle
    v.literal("artifact_received"),        // New artifact created
    v.literal("artifact_status_changed"),   // Status transition
    v.literal("artifact_completed"),        // Successfully completed
    v.literal("artifact_failed"),           // Processing failed

    // Transcription stage
    v.literal("transcription_started"),     // Whisper call initiated
    v.literal("transcription_completed"),   // Transcript stored
    v.literal("transcription_failed"),      // Whisper error

    // Claims extraction stage
    v.literal("claims_extraction_started"), // GPT-4o call initiated
    v.literal("claims_extracted"),          // Claims stored
    v.literal("claims_extraction_failed"),  // Extraction error

    // Entity resolution stage
    v.literal("entity_resolution_started"), // Fuzzy matching started
    v.literal("entity_resolution_completed"), // All entities resolved
    v.literal("entity_needs_disambiguation"), // Manual review needed

    // Draft generation stage
    v.literal("draft_generation_started"),  // Insight drafts being created
    v.literal("drafts_generated"),          // Drafts ready for review
    v.literal("draft_confirmed"),           // Coach confirmed a draft
    v.literal("draft_rejected"),            // Coach rejected a draft

    // System events
    v.literal("circuit_breaker_opened"),    // AI service health degraded
    v.literal("circuit_breaker_closed"),    // AI service recovered
    v.literal("retry_initiated"),           // Manual retry triggered
    v.literal("retry_succeeded"),           // Retry was successful
    v.literal("retry_failed"),              // Retry also failed

    // Cost events
    v.literal("budget_threshold_reached"),  // Approaching budget limit
    v.literal("budget_exceeded"),           // Budget limit exceeded
    v.literal("rate_limit_hit")            // Rate limit triggered
  ),

  // Context
  artifactId: v.optional(v.id("voiceNoteArtifacts")),
  voiceNoteId: v.optional(v.id("voiceNotes")),
  organizationId: v.optional(v.string()),
  coachUserId: v.optional(v.string()),

  // Stage tracking (for stage-specific events)
  pipelineStage: v.optional(v.union(
    v.literal("ingestion"),
    v.literal("transcription"),
    v.literal("claims_extraction"),
    v.literal("entity_resolution"),
    v.literal("draft_generation"),
    v.literal("confirmation")
  )),

  // Timing (for latency calculation)
  stageStartedAt: v.optional(v.number()),  // When stage processing began
  stageCompletedAt: v.optional(v.number()), // When stage processing ended
  durationMs: v.optional(v.number()),       // Computed stage duration

  // Status transition
  previousStatus: v.optional(v.string()),
  newStatus: v.optional(v.string()),

  // Error context (for failures)
  errorMessage: v.optional(v.string()),
  errorCode: v.optional(v.string()),

  // Metrics snapshot (for the event)
  metadata: v.optional(v.object({
    claimCount: v.optional(v.number()),        // How many claims extracted
    entityCount: v.optional(v.number()),       // How many entities found
    disambiguationCount: v.optional(v.number()), // How many need disambiguation
    confidenceScore: v.optional(v.number()),   // Average confidence
    transcriptDuration: v.optional(v.number()), // Audio duration in seconds
    transcriptWordCount: v.optional(v.number()), // Word count
    aiModel: v.optional(v.string()),           // Which model was used
    aiCost: v.optional(v.number()),            // Cost of this AI call
    retryAttempt: v.optional(v.number()),       // Which retry attempt (0 = first try)
  })),

  // Timestamp
  timestamp: v.number(),
})
  .index("by_artifactId", ["artifactId"])
  .index("by_timestamp", ["timestamp"])
  .index("by_eventType", ["eventType"])
  .index("by_eventType_and_timestamp", ["eventType", "timestamp"])
  .index("by_org_and_timestamp", ["organizationId", "timestamp"])
  .index("by_pipelineStage", ["pipelineStage"])
  .index("by_pipelineStage_and_timestamp", ["pipelineStage", "timestamp"])
```

**Why this table:** This is the single source of truth for pipeline observability. Every query in the monitoring harness derives from this table + the existing artifact/claim tables. It enables:
- Stage-by-stage latency calculation
- Error rate trending
- Pipeline throughput measurement
- Event-level debugging

#### 4.1.2 `voicePipelineMetricsSnapshots` — Periodic Metrics Aggregation

Pre-computed metrics snapshots for dashboard performance. Similar pattern to `aiUsageDailyAggregates`.

```typescript
voicePipelineMetricsSnapshots: defineTable({
  // Time bucket
  periodStart: v.number(),               // Start of period (timestamp)
  periodEnd: v.number(),                 // End of period
  periodType: v.union(
    v.literal("hourly"),                  // 1-hour buckets (kept 7 days)
    v.literal("daily")                    // 1-day buckets (kept 90 days)
  ),

  // Scope
  organizationId: v.optional(v.string()), // null = platform-wide

  // Throughput metrics
  artifactsReceived: v.number(),
  artifactsCompleted: v.number(),
  artifactsFailed: v.number(),

  // Latency metrics (in milliseconds)
  avgTranscriptionLatency: v.number(),
  avgClaimsExtractionLatency: v.number(),
  avgEntityResolutionLatency: v.number(),
  avgDraftGenerationLatency: v.number(),
  avgEndToEndLatency: v.number(),
  p95EndToEndLatency: v.number(),

  // Quality metrics
  avgTranscriptConfidence: v.number(),    // Average Whisper confidence
  avgClaimConfidence: v.number(),         // Average extraction confidence
  autoResolutionRate: v.number(),         // % of entities auto-resolved
  disambiguationRate: v.number(),         // % needing manual review

  // Error metrics
  transcriptionFailureRate: v.number(),
  claimsExtractionFailureRate: v.number(),
  entityResolutionFailureRate: v.number(),
  overallFailureRate: v.number(),

  // Volume metrics
  totalClaimsExtracted: v.number(),
  totalEntitiesResolved: v.number(),
  totalDraftsGenerated: v.number(),

  // Cost metrics
  totalAICost: v.number(),
  avgCostPerArtifact: v.number(),

  // Metadata
  createdAt: v.number(),
})
  .index("by_periodType_and_start", ["periodType", "periodStart"])
  .index("by_org_periodType_start", ["organizationId", "periodType", "periodStart"])
```

**Why this table:** Real-time event queries would scan the entire `voicePipelineEvents` table for historical views. Pre-aggregated snapshots give O(n) on number of time buckets instead of O(n) on number of events.

### 4.2 New Backend Functions

#### 4.2.1 Pipeline Event Logging (Internal)

**File:** `packages/backend/convex/models/voicePipelineEvents.ts`

```
Functions:
- logEvent (internalMutation)          — Record a pipeline event
- getEventsByArtifact (internalQuery)  — Get all events for an artifact
- getRecentEvents (query)              — Platform staff: get recent events with filters
- getEventTimeline (query)             — Platform staff: artifact-specific event timeline
- getActiveArtifacts (query)           — Platform staff: currently-in-progress artifacts
- getFailedArtifacts (query)           — Platform staff: artifacts stuck in failed state
```

#### 4.2.2 Pipeline Metrics (Query + Cron)

**File:** `packages/backend/convex/models/voicePipelineMetrics.ts`

```
Functions:
- getRealTimeMetrics (query)           — Live metrics from last N minutes
- getHistoricalMetrics (query)         — Read from snapshots table
- getStageBreakdown (query)            — Per-stage latency/error breakdown
- getOrgBreakdown (query)              — Per-org volume/cost breakdown
- aggregateHourlyMetrics (internalMutation) — Cron: hourly aggregation
- aggregateDailyMetrics (internalMutation)  — Cron: daily aggregation
- cleanupOldSnapshots (internalMutation)    — Cron: remove hourly > 7d, daily > 90d
```

#### 4.2.3 Pipeline Retry Operations

**File:** `packages/backend/convex/models/voicePipelineRetry.ts`

```
Functions:
- retryTranscription (mutation)        — Re-trigger Whisper for a failed artifact
- retryClaimsExtraction (mutation)     — Re-trigger claims extraction
- retryEntityResolution (mutation)     — Re-trigger entity resolution
- retryFullPipeline (mutation)         — Re-process from beginning
- getRetryHistory (query)              — Get retry attempts for an artifact
```

All retry mutations:
- Verify platform staff authorization
- Log a `retry_initiated` event
- Reset artifact status to appropriate stage
- Use `ctx.scheduler.runAfter(0, ...)` to trigger the pipeline action
- Log `retry_succeeded` or `retry_failed` events on completion

#### 4.2.4 Pipeline Alerts

**File:** `packages/backend/convex/models/voicePipelineAlerts.ts`

```
Functions:
- checkPipelineHealth (internalMutation) — Cron: detect anomalies
- getActiveAlerts (query)               — Platform staff: unacknowledged alerts
- acknowledgeAlert (mutation)           — Platform staff: dismiss alert
- getAlertHistory (query)               — Platform staff: alert audit trail
```

Alert conditions (checked by cron every 5 minutes):
- Failure rate > 10% in last 30 minutes
- Average latency > 2x historical average
- Queue depth > 50 unprocessed artifacts
- Entity disambiguation backlog > 100
- Circuit breaker state changed
- No artifacts processed in last 60 minutes (if expected)

### 4.3 Instrumentation Points

Events must be emitted from **existing pipeline functions**. Here's where to add `logEvent` calls:

| Existing Function | File | Event(s) to Emit |
|---|---|---|
| `createArtifact` | `voiceNoteArtifacts.ts` | `artifact_received` |
| `updateArtifactStatus` | `voiceNoteArtifacts.ts` | `artifact_status_changed`, `artifact_completed`, `artifact_failed` |
| `createTranscript` | `voiceNoteTranscripts.ts` | `transcription_completed` |
| `storeClaims` | `voiceNoteClaims.ts` | `claims_extracted` (with claim count) |
| `storeResolutions` | `voiceNoteEntityResolutions.ts` | `entity_resolution_completed` or `entity_needs_disambiguation` |
| `resolveEntity` | `voiceNoteEntityResolutions.ts` | (user disambiguation - already logged via reviewAnalytics) |
| Transcription action start | `actions/voiceNotes.ts` | `transcription_started` |
| Claims extraction action start | `actions/claimsExtraction.ts` | `claims_extraction_started` |
| Entity resolution action start | `actions/entityResolution.ts` | `entity_resolution_started` |
| Draft generation action start | `actions/draftGeneration.ts` | `draft_generation_started` |
| `updateServiceHealth` | `aiServiceHealth.ts` | `circuit_breaker_opened` / `circuit_breaker_closed` |

**Implementation approach:** Add `ctx.scheduler.runAfter(0, internal.models.voicePipelineEvents.logEvent, {...})` calls in existing functions. This is fire-and-forget — monitoring never blocks the pipeline.

### 4.4 New Cron Jobs

Add to `packages/backend/convex/crons.ts`:

```typescript
// Voice Pipeline Monitoring: Aggregate hourly metrics (every hour at :30)
crons.hourly(
  "aggregate-pipeline-hourly-metrics",
  { minuteUTC: 30 },
  internal.models.voicePipelineMetrics.aggregateHourlyMetrics,
  {}
);

// Voice Pipeline Monitoring: Aggregate daily metrics (daily at 1:30 AM UTC)
crons.daily(
  "aggregate-pipeline-daily-metrics",
  { hourUTC: 1, minuteUTC: 30 },
  internal.models.voicePipelineMetrics.aggregateDailyMetrics,
  {}
);

// Voice Pipeline Monitoring: Check pipeline health (every 5 minutes)
crons.interval(
  "check-pipeline-health",
  { minutes: 5 },
  internal.models.voicePipelineAlerts.checkPipelineHealth,
  {}
);

// Voice Pipeline Monitoring: Cleanup old metric snapshots (weekly Sunday 4:30 AM)
crons.weekly(
  "cleanup-pipeline-snapshots",
  { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 30 },
  internal.models.voicePipelineMetrics.cleanupOldSnapshots,
  {}
);
```

---

## 5. Frontend Architecture

### 5.1 Route Structure

```
apps/web/src/app/platform/voice-monitoring/
├── page.tsx                          # Main monitoring dashboard
├── layout.tsx                        # Shared layout with nav tabs
├── pipeline/
│   └── page.tsx                      # Flow graph + active artifacts view
├── artifacts/
│   └── page.tsx                      # Grid view (subsumes v2-claims)
├── artifacts/[artifactId]/
│   └── page.tsx                      # Single artifact deep-dive
├── metrics/
│   └── page.tsx                      # Metrics & analytics dashboard
├── alerts/
│   └── page.tsx                      # Active alerts + alert history
└── events/
    └── page.tsx                      # Raw pipeline event log
```

### 5.2 Page Breakdown

#### 5.2.1 Dashboard Overview (`/platform/voice-monitoring`)

**Top Row — Real-Time Status Cards:**
- Active Artifacts (in-flight count)
- Completed Today (count + % change)
- Failed Today (count + failure rate)
- Avg End-to-End Latency
- AI Service Status (circuit breaker state)
- Total Cost Today

**Middle — Pipeline Flow Graph:**
A horizontal node-edge diagram showing the 5 pipeline stages:
```
[Ingestion] → [Transcription] → [Claims Extraction] → [Entity Resolution] → [Draft Generation]
```
Each node shows:
- Current queue depth (artifacts at this stage)
- Stage health indicator (green/yellow/red)
- Average stage latency
- Throughput (artifacts/hour)
- Click to drill into stage detail

**Bottom — Recent Activity Feed:**
- Last 20 pipeline events (real-time via `useQuery`)
- Color-coded by event type (success=green, failure=red, info=blue)
- Compact rows: timestamp | event type | artifact ID | details

#### 5.2.2 Pipeline View (`/platform/voice-monitoring/pipeline`)

**Expanded Flow Graph:**
- Larger version of the pipeline visualization
- Click any stage node to see:
  - All artifacts currently at this stage
  - Historical latency chart (last 24h)
  - Error breakdown for this stage
  - Retry queue for this stage

**Active Artifacts Panel:**
- Cards for each artifact currently being processed
- Shows current stage with animated progress indicator
- Time elapsed since stage entry
- Coach name + org name
- Source channel icon (WhatsApp, app, etc.)

#### 5.2.3 Artifacts Grid (`/platform/voice-monitoring/artifacts`)

**This replaces `/platform/v2-claims`.**

**Filters Bar:**
- Status filter (received, transcribing, transcribed, processing, completed, failed)
- Organization filter (dropdown)
- Date range picker
- Source channel filter
- Search by artifact ID

**Grid Table:**
| Artifact ID | Status | Source | Coach | Org | Claims | Disambig. | Latency | Cost | Created | Actions |
|---|---|---|---|---|---|---|---|---|---|---|
| abc123... | Completed | WhatsApp | J. Murphy | CLG | 5 | 0 | 12.3s | $0.02 | 2m ago | View |
| def456... | Failed | App | S. Walsh | CLG | - | - | - | - | 5m ago | Retry |

**Expandable Rows:**
Click any row to expand and see:
- Full claim list (migrated from v2-claims ClaimRow component)
- Entity resolution details
- Insight draft status
- Event timeline for this artifact
- Retry button (if failed)

**Collapsed View:**
Compact table showing only key columns (ID, status, org, timestamp)

#### 5.2.4 Artifact Detail (`/platform/voice-monitoring/artifacts/[artifactId]`)

**Header:**
- Artifact ID, status badge, source channel
- Coach name, organization name
- Created timestamp, total processing time

**Event Timeline:**
Vertical timeline showing every event for this artifact:
```
09:15:02 │ ● artifact_received (WhatsApp audio, 45s)
09:15:03 │ ● transcription_started
09:15:08 │ ● transcription_completed (5.2s, confidence: 0.94)
09:15:08 │ ● claims_extraction_started
09:15:12 │ ● claims_extracted (4 claims, avg confidence: 0.87)
09:15:12 │ ● entity_resolution_started
09:15:14 │ ● entity_resolution_completed (3 auto-resolved, 1 needs review)
09:15:14 │ ● draft_generation_started
09:15:17 │ ● drafts_generated (3 drafts, avg confidence: 0.82)
```

**Claims Section:**
- All claims from this artifact (same UI as current v2-claims but with more context)
- Entity resolution details per claim
- Insight draft status per claim

**Retry Panel:**
- Available retry options based on current failure state
- Retry history (previous attempts)

#### 5.2.5 Metrics Dashboard (`/platform/voice-monitoring/metrics`)

**Time Range Selector:** Last 1h, 6h, 24h, 7d, 30d

**Metrics Cards (Top):**
- Total Artifacts Processed
- Completion Rate (%)
- Average E2E Latency
- Total AI Cost
- Auto-Resolution Rate (%)
- Disambiguation Backlog

**Charts:**
- **Throughput Over Time:** Bar chart showing artifacts completed per hour/day
- **Latency by Stage:** Stacked bar chart showing avg latency per pipeline stage
- **Error Rate Trend:** Line chart showing failure rate over time
- **Quality Distribution:** Histogram of transcript confidence scores
- **Cost Trend:** Area chart showing daily AI cost
- **Org Breakdown:** Table showing per-org volume, latency, cost, error rate

Charts will be implemented using simple CSS-based visualizations (bar charts via `div` widths, like the existing daily cost chart in `/platform/messaging`). No external charting library needed for MVP.

#### 5.2.6 Alerts Page (`/platform/voice-monitoring/alerts`)

**Active Alerts:**
- Card per active alert with severity badge (warning/critical)
- Alert message + trigger details
- Acknowledge button + timestamp

**Alert History:**
- Table of past alerts with acknowledgment status
- Filterable by severity, type, date range

#### 5.2.7 Event Log (`/platform/voice-monitoring/events`)

**Raw Pipeline Event Log** (like a structured log viewer):

**Filters:**
- Event type (multi-select)
- Pipeline stage
- Organization
- Date range
- Artifact ID (search)
- Errors only toggle

**Table:**
| Timestamp | Event | Stage | Artifact | Org | Duration | Details |
|---|---|---|---|---|---|---|
| 09:15:02 | artifact_received | ingestion | abc123 | CLG | - | WhatsApp audio |
| 09:15:08 | transcription_completed | transcription | abc123 | CLG | 5.2s | conf: 0.94 |
| 09:15:12 | claims_extracted | extraction | abc123 | CLG | 3.8s | 4 claims |

- Newest events at top (real-time updates via `useQuery`)
- Click any event row to see full event payload
- Export to CSV for offline analysis (future)

### 5.3 Shared Components

**New components** (in feature folders alongside pages):

| Component | Location | Purpose |
|---|---|---|
| `PipelineFlowGraph` | `voice-monitoring/` | SVG-based pipeline stage visualization |
| `ArtifactStatusBadge` | `voice-monitoring/` | Color-coded status badge |
| `StageHealthIndicator` | `voice-monitoring/` | Green/yellow/red health dot per stage |
| `EventTimelineRow` | `voice-monitoring/` | Single event in vertical timeline |
| `MetricCard` | `voice-monitoring/` | Stat card with value, label, trend indicator |
| `SimpleBarChart` | `voice-monitoring/` | CSS-based horizontal bar chart (reuse messaging pattern) |
| `DateRangePicker` | `voice-monitoring/` | Time range selector for metrics |
| `RetryButton` | `voice-monitoring/` | Retry action with confirmation + loading state |
| `AlertCard` | `voice-monitoring/` | Alert display with severity + acknowledge |

**Migrated from v2-claims** (move, don't duplicate):
- `ClaimRow` → Reuse in artifact detail view
- `ArtifactCard` → Replace with enhanced version in grid view
- `TOPIC_CONFIG` / `STATUS_CONFIG` / `ARTIFACT_STATUS_CONFIG` → Extract to shared constants

### 5.4 Navigation Integration

**Platform Hub (`/platform/page.tsx`):**
Add new card link:
```
Voice Monitoring | icon: Activity | color: rose
"Monitor voice note pipeline processing, metrics, and alerts"
```

**Remove the separate v2-claims link** since it's now subsumed.

**Monitoring Layout (`layout.tsx`):**
Tab navigation within the monitoring section:
```
[Dashboard] [Pipeline] [Artifacts] [Metrics] [Alerts] [Events]
```

---

## 6. Data Flow Architecture

### 6.1 Real-Time Monitoring Path

```
Coach sends voice note (WhatsApp/App)
    ↓
processIncomingMessage (existing action)
    ↓ emits: artifact_received
createArtifact (existing mutation)
    ↓
Whisper transcription (existing action)
    ↓ emits: transcription_started, transcription_completed/failed
createTranscript (existing mutation)
    ↓
Claims extraction (existing action)
    ↓ emits: claims_extraction_started, claims_extracted/failed
storeClaims (existing mutation)
    ↓
Entity resolution (existing action)
    ↓ emits: entity_resolution_started, entity_resolution_completed
storeResolutions (existing mutation)
    ↓
Draft generation (existing action)
    ↓ emits: draft_generation_started, drafts_generated
storeDrafts (existing mutation)
    ↓
Coach reviews/confirms (existing UI)

                        ↓ All events land in ↓

              voicePipelineEvents table
                        ↓
              useQuery subscriptions
                        ↓
              Real-time dashboard updates
```

### 6.2 Historical Analytics Path

```
voicePipelineEvents table
    ↓ (hourly cron)
aggregateHourlyMetrics
    ↓
voicePipelineMetricsSnapshots (hourly buckets)
    ↓ (daily cron)
aggregateDailyMetrics
    ↓
voicePipelineMetricsSnapshots (daily buckets)
    ↓
Historical dashboard queries (fast reads from snapshots)
```

### 6.3 Alert Path

```
checkPipelineHealth (every 5 min cron)
    ↓ reads from:
    - voicePipelineEvents (recent failures, latency)
    - voiceNoteArtifacts (queue depth)
    - aiServiceHealth (circuit breaker)
    ↓ if anomaly detected:
    Insert into platformCostAlerts (reuse existing table + add new alertTypes)
    ↓
    getActiveAlerts query (real-time subscription)
    ↓
    Toast notification on dashboard
```

### 6.4 Retry Path

```
Platform staff clicks Retry on failed artifact
    ↓
retryTranscription/retryClaimsExtraction/retryFullPipeline (mutation)
    ↓
1. Verify platform staff auth
2. Log retry_initiated event
3. Reset artifact status to appropriate stage
4. Schedule pipeline action via ctx.scheduler.runAfter(0, ...)
    ↓
Pipeline action runs (existing code)
    ↓
On completion: log retry_succeeded or retry_failed event
```

---

## 7. Implementation Plan (Phased)

### Phase M1: Foundation (Backend Instrumentation)

**Goal:** Get events flowing into the pipeline event log

1. Add `voicePipelineEvents` table to schema
2. Add `voicePipelineMetricsSnapshots` table to schema
3. Create `voicePipelineEvents.ts` model file (logEvent + query functions)
4. Instrument existing pipeline functions with event emission
5. Run codegen and verify types

**New files:**
- `packages/backend/convex/models/voicePipelineEvents.ts`

**Modified files:**
- `packages/backend/convex/schema.ts` (add 2 tables)
- `packages/backend/convex/models/voiceNoteArtifacts.ts` (add event emissions)
- `packages/backend/convex/models/voiceNoteTranscripts.ts` (add event emission)
- `packages/backend/convex/models/voiceNoteClaims.ts` (add event emission)
- `packages/backend/convex/models/voiceNoteEntityResolutions.ts` (add event emission)
- `packages/backend/convex/actions/voiceNotes.ts` (add event emissions at action start/end)

### Phase M2: Metrics & Aggregation (Backend)

**Goal:** Pre-computed metrics for fast dashboard queries

1. Create `voicePipelineMetrics.ts` model file
2. Add aggregation cron jobs
3. Create snapshot cleanup cron

**New files:**
- `packages/backend/convex/models/voicePipelineMetrics.ts`

**Modified files:**
- `packages/backend/convex/crons.ts` (add 3 cron jobs)

### Phase M3: Retry Operations (Backend)

**Goal:** Manual retry capability for failed artifacts

1. Create `voicePipelineRetry.ts` model file
2. Wire retry mutations to existing pipeline actions

**New files:**
- `packages/backend/convex/models/voicePipelineRetry.ts`

### Phase M4: Alerts (Backend)

**Goal:** Automated anomaly detection

1. Create `voicePipelineAlerts.ts` model file
2. Add health check cron job
3. Extend `platformCostAlerts` table with pipeline-specific alert types (or create dedicated `voicePipelineAlerts` table)

**New files:**
- `packages/backend/convex/models/voicePipelineAlerts.ts`

**Modified files:**
- `packages/backend/convex/crons.ts` (add health check cron)

### Phase M5: Dashboard UI (Frontend)

**Goal:** Main monitoring dashboard with flow graph

1. Create route structure under `/platform/voice-monitoring/`
2. Build `page.tsx` (dashboard overview)
3. Build `layout.tsx` (tab navigation)
4. Build `PipelineFlowGraph` component
5. Build real-time status cards
6. Build recent activity feed
7. Add link to platform hub

**New files:**
- `apps/web/src/app/platform/voice-monitoring/page.tsx`
- `apps/web/src/app/platform/voice-monitoring/layout.tsx`

**Modified files:**
- `apps/web/src/app/platform/page.tsx` (add link, remove v2-claims link)

### Phase M6: Artifacts Grid + Detail (Frontend)

**Goal:** Subsume v2-claims into enhanced grid view

1. Build artifacts grid page with filters
2. Build artifact detail page with event timeline
3. Extract shared constants from v2-claims
4. Build expandable/collapsible row component
5. Wire up retry buttons

**New files:**
- `apps/web/src/app/platform/voice-monitoring/artifacts/page.tsx`
- `apps/web/src/app/platform/voice-monitoring/artifacts/[artifactId]/page.tsx`

### Phase M7: Metrics + Events Pages (Frontend)

**Goal:** Historical analytics and raw event log

1. Build metrics dashboard page
2. Build event log page with filters
3. Build CSS-based charts (reuse messaging dashboard pattern)

**New files:**
- `apps/web/src/app/platform/voice-monitoring/metrics/page.tsx`
- `apps/web/src/app/platform/voice-monitoring/events/page.tsx`

### Phase M8: Pipeline View + Alerts (Frontend)

**Goal:** Pipeline visualization and alert management

1. Build pipeline view page (expanded flow graph)
2. Build alerts page
3. Wire toast notifications for new alerts

**New files:**
- `apps/web/src/app/platform/voice-monitoring/pipeline/page.tsx`
- `apps/web/src/app/platform/voice-monitoring/alerts/page.tsx`

### Phase M9: Cleanup & Polish

**Goal:** Remove old page, polish UI

1. Remove `/platform/v2-claims` page (functionality now in monitoring harness)
2. Update platform hub links
3. Mobile-responsive adjustments (if applicable — this is admin tooling)
4. Performance optimization (query skip patterns, loading states)

---

## 8. Performance Considerations

### 8.1 Event Table Growth

The `voicePipelineEvents` table will grow with every pipeline execution (~5-10 events per artifact). Mitigation:

- **Cron cleanup:** Delete events older than 30 days (raw events)
- **Metrics snapshots:** Pre-aggregated data preserved longer (90 days daily, 7 days hourly)
- **Index strategy:** All queries use indexes (by_artifactId, by_timestamp, by_eventType_and_timestamp)
- **Pagination:** Event log and artifact grid use cursor-based pagination with `.take(limit)`

### 8.2 Query Optimization

- **Dashboard overview:** 4-5 real-time queries (active artifacts, recent events, metrics, alerts, service health)
- **Skip pattern:** All queries check `isPlatformStaff` and skip if not authorized
- **Batch fetching:** Artifact grid uses bulk queries with Map lookups (per CLAUDE.md patterns)
- **No N+1:** Event timeline fetches all events for an artifact in a single indexed query

### 8.3 Event Emission

- **Fire-and-forget:** All event emissions use `ctx.scheduler.runAfter(0, ...)` — never blocking the pipeline
- **Idempotent:** Events include `eventId` (UUID) for deduplication
- **Lightweight:** Events carry minimal data — just enough for monitoring, not full payloads

---

## 9. Security & Access Control

- All public queries verify `isPlatformStaff` via `authComponent.safeGetAuthUser(ctx)`
- All mutations verify platform staff authorization
- No org-scoped data leaks — staff see all orgs but access is gated at the platform level
- Retry operations are audit-logged (event trail)
- Alert acknowledgments are tracked (who + when)

---

## 10. Migration Plan

### 10.1 v2-Claims Page Transition

1. Build the new artifacts grid first (Phase M6)
2. Verify it has feature parity with v2-claims page
3. Remove v2-claims page and update platform hub links (Phase M9)
4. No data migration needed — both pages read from same Convex tables

### 10.2 Existing Dashboard Coexistence

The `/platform/messaging` dashboard stays as-is. It handles:
- General AI usage costs (all AI features, not just voice)
- Rate limits
- Service health (circuit breaker)
- Feature toggles + emergency mode

The new voice monitoring harness is **voice-pipeline-specific** and complements the general AI dashboard.

---

## 11. What's NOT In Scope (Deferred)

| Feature | Reason |
|---------|--------|
| Multi-provider routing (Open Router) | User decision: defer until learnings from built system |
| Org admin monitoring views | MVP is platform staff only |
| External metrics storage (DataDog, etc.) | Starting with Convex tables per user decision |
| Automated retry (auto-retry on failure) | User chose manual retry buttons |
| A/B testing of AI models | Part of deferred multi-provider story |
| Mobile-optimized monitoring | Admin tooling, desktop-primary |

---

## 12. File Impact Summary

### New Files (13)

**Backend (4):**
1. `packages/backend/convex/models/voicePipelineEvents.ts`
2. `packages/backend/convex/models/voicePipelineMetrics.ts`
3. `packages/backend/convex/models/voicePipelineRetry.ts`
4. `packages/backend/convex/models/voicePipelineAlerts.ts`

**Frontend (9):**
5. `apps/web/src/app/platform/voice-monitoring/page.tsx`
6. `apps/web/src/app/platform/voice-monitoring/layout.tsx`
7. `apps/web/src/app/platform/voice-monitoring/pipeline/page.tsx`
8. `apps/web/src/app/platform/voice-monitoring/artifacts/page.tsx`
9. `apps/web/src/app/platform/voice-monitoring/artifacts/[artifactId]/page.tsx`
10. `apps/web/src/app/platform/voice-monitoring/metrics/page.tsx`
11. `apps/web/src/app/platform/voice-monitoring/alerts/page.tsx`
12. `apps/web/src/app/platform/voice-monitoring/events/page.tsx`

### Modified Files (8)

**Backend (7):**
1. `packages/backend/convex/schema.ts` — Add 2 new tables
2. `packages/backend/convex/crons.ts` — Add 4 cron jobs
3. `packages/backend/convex/models/voiceNoteArtifacts.ts` — Add event emissions
4. `packages/backend/convex/models/voiceNoteTranscripts.ts` — Add event emission
5. `packages/backend/convex/models/voiceNoteClaims.ts` — Add event emission
6. `packages/backend/convex/models/voiceNoteEntityResolutions.ts` — Add event emission
7. `packages/backend/convex/actions/voiceNotes.ts` — Add event emissions

**Frontend (1):**
8. `apps/web/src/app/platform/page.tsx` — Update hub links

### Removed Files (1)
1. `apps/web/src/app/platform/v2-claims/page.tsx` — Subsumed into monitoring harness

---

## 13. Estimated Story Breakdown (for PRD)

If this were to be broken into Ralph stories:

| Story | Phase | Scope |
|-------|-------|-------|
| M1-001: Pipeline event log schema + backend | M1 | Schema + voicePipelineEvents.ts |
| M1-002: Instrument existing pipeline with events | M1 | Modify 6 existing files |
| M2-001: Metrics aggregation backend + crons | M2 | voicePipelineMetrics.ts + crons |
| M3-001: Retry operations backend | M3 | voicePipelineRetry.ts |
| M4-001: Pipeline alerts backend | M4 | voicePipelineAlerts.ts + cron |
| M5-001: Dashboard overview UI | M5 | page.tsx + layout.tsx + flow graph |
| M6-001: Artifacts grid UI (subsume v2-claims) | M6 | artifacts/page.tsx |
| M6-002: Artifact detail + event timeline UI | M6 | artifacts/[id]/page.tsx |
| M7-001: Metrics dashboard UI | M7 | metrics/page.tsx |
| M7-002: Event log viewer UI | M7 | events/page.tsx |
| M8-001: Pipeline view + alerts UI | M8 | pipeline/page.tsx + alerts/page.tsx |
| M9-001: Cleanup v2-claims + polish | M9 | Remove old page, update links |

---

## Appendix A: Terminology

| Term | Meaning |
|------|---------|
| Artifact | A v2 pipeline input record (voice note or text from any channel) |
| Claim | An atomic piece of information extracted from a transcript |
| Entity Resolution | Matching mentioned names to player/team/coach records |
| Insight Draft | A claim promoted to actionable insight awaiting coach confirmation |
| Pipeline Event | A logged state transition in the processing pipeline |
| Metrics Snapshot | Pre-computed aggregate metrics for a time bucket |
| Circuit Breaker | Pattern that stops calling failing AI APIs after threshold |
| Disambiguation | Manual review needed when entity matching is ambiguous |

## Appendix B: Configuration Constants

```typescript
// Event retention
const EVENT_RETENTION_DAYS = 30;
const HOURLY_SNAPSHOT_RETENTION_DAYS = 7;
const DAILY_SNAPSHOT_RETENTION_DAYS = 90;

// Alert thresholds
const FAILURE_RATE_WARNING_THRESHOLD = 0.10;  // 10%
const FAILURE_RATE_CRITICAL_THRESHOLD = 0.25; // 25%
const LATENCY_WARNING_MULTIPLIER = 2.0;       // 2x historical avg
const QUEUE_DEPTH_WARNING = 50;
const DISAMBIGUATION_BACKLOG_WARNING = 100;
const INACTIVITY_TIMEOUT_MINUTES = 60;

// Dashboard defaults
const DEFAULT_EVENTS_LIMIT = 50;
const DEFAULT_ARTIFACTS_LIMIT = 50;
const MAX_EVENTS_LIMIT = 500;
const MAX_ARTIFACTS_LIMIT = 200;
```
