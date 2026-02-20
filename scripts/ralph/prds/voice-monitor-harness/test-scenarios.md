# Voice Flow Monitoring Harness - E2E Test Scenarios

**Test Framework:** Playwright
**Test Location:** `apps/web/uat/tests/voice-monitoring/`
**Test Account:** `neil.B@blablablak.com` / `lien1979` (platform staff)
**Coverage Target:** All 8 dashboard pages, all critical user flows

---

## Test File Structure

```
apps/web/uat/tests/voice-monitoring/
├── dashboard.spec.ts           # M5 - Dashboard overview
├── artifacts-grid.spec.ts      # M6 - Artifacts list view
├── artifact-detail.spec.ts     # M6 - Single artifact timeline
├── metrics.spec.ts             # M7 - Metrics dashboard
├── events.spec.ts              # M7 - Event log viewer
├── pipeline.spec.ts            # M8 - Pipeline view
├── alerts.spec.ts              # M8 - Alerts management
└── authorization.spec.ts       # All phases - Access control
```

---

## Phase M1 - Foundation (Backend)

### TC-M1-001: Event Logging Doesn't Block Pipeline
**Objective:** Verify event logging adds < 10ms overhead to pipeline execution

**Steps:**
1. Start timer before creating artifact via `createArtifact` mutation
2. Create artifact with `sourceChannel: "test"`
3. End timer after mutation completes
4. Query `voicePipelineEvents` to verify `artifact_received` event logged
5. Query `voicePipelineCounters` to verify `artifacts_received_1h` incremented

**Expected:**
- Mutation completes in < 50ms total (artifact insert ~40ms + logging ~10ms)
- Event exists in `voicePipelineEvents` table
- Counter incremented by 1

---

### TC-M1-002: Counter Increments Atomically with Event
**Objective:** Verify counter and event are inserted in same transaction

**Steps:**
1. Query initial counter value
2. Create 5 artifacts rapidly (within 1 second)
3. Query final counter value
4. Query event count for last 1 second

**Expected:**
- Counter value increased by exactly 5
- Event count equals 5
- No events without counter increment
- No counter increment without events

---

### TC-M1-003: timeWindow Format Validation
**Objective:** Verify timeWindow field uses correct format `YYYY-MM-DD-HH`

**Steps:**
1. Create artifact
2. Query `voicePipelineEvents` for latest event
3. Extract `timeWindow` field
4. Validate format with regex: `/^\d{4}-\d{2}-\d{2}-\d{2}$/`

**Expected:**
- timeWindow matches format (e.g., "2026-02-15-14")
- Hour matches current UTC hour

---

### TC-M1-004: organizationId Extraction from orgContextCandidates
**Objective:** Verify events extract org ID from artifact's orgContextCandidates array

**Steps:**
1. Create artifact with orgContextCandidates: `[{ organizationId: "org123", confidence: 0.95 }]`
2. Query event for this artifact
3. Verify event.organizationId === "org123"

**Expected:**
- Event has correct organizationId (highest confidence candidate)
- Not null, not undefined

---

## Phase M2 - Metrics & Aggregation

### TC-M2-001: Real-Time Metrics Query Performance
**Objective:** Verify `getRealTimeMetrics` completes in < 50ms

**Steps:**
1. Call `getRealTimeMetrics` mutation
2. Measure execution time
3. Verify returns current counter values

**Expected:**
- Query completes in < 50ms
- Returns object with all 7 counter values
- No event scanning (check Convex logs for query pattern)

---

### TC-M2-002: Hourly Aggregation Cron Creates Snapshots
**Objective:** Verify cron creates hourly snapshots from events

**Steps:**
1. Manually trigger `aggregate-pipeline-hourly-metrics` cron
2. Query `voicePipelineMetricsSnapshots` for latest snapshot
3. Verify snapshot.periodType === "hourly"
4. Verify metrics calculated correctly (compare to raw events)

**Expected:**
- Snapshot created with correct periodStart/periodEnd
- Metrics match aggregated events (±rounding)
- Snapshot created for platform-wide AND per-org

---

### TC-M2-003: Event Cleanup Deletes Old Events
**Objective:** Verify cleanup cron removes events older than 48 hours

**Steps:**
1. Seed test events with timestamps > 48h old
2. Manually trigger `cleanup-pipeline-events` cron
3. Query `voicePipelineEvents` for old events

**Expected:**
- Events older than 48h deleted
- Events within 48h retained
- Uses timeWindow index (check Convex logs)

---

## Phase M3 - Retry Operations

### TC-M3-001: Retry Transcription Schedules Action
**Objective:** Verify retry triggers transcribeAudio with correct noteId

**Steps:**
1. Create artifact with linked voiceNoteId
2. Manually set artifact status to "failed"
3. Call `retryTranscription` mutation
4. Query events for `retry_initiated`
5. Verify artifact status reset to "transcribing"

**Expected:**
- retry_initiated event logged
- Artifact status changed
- transcribeAudio action scheduled (check logs)

---

### TC-M3-002: Retry Attempt Counter Increments
**Objective:** Verify retry attempts are tracked

**Steps:**
1. Create failed artifact
2. Call `retryTranscription` first time
3. Query retry history
4. Call `retryTranscription` second time
5. Query retry history again

**Expected:**
- First retry: metadata.retryAttempt === 1
- Second retry: metadata.retryAttempt === 2
- Retry history shows both attempts chronologically

---

### TC-M3-003: Full Pipeline Retry Cleans Data
**Objective:** Verify full retry deletes all derived data

**Steps:**
1. Create artifact with transcript, claims, resolutions, drafts
2. Call `retryFullPipeline` mutation
3. Query all derived tables

**Expected:**
- voiceNoteTranscripts: no records for this artifact
- voiceNoteClaims: no records
- voiceNoteEntityResolutions: no records
- insightDrafts: no records
- Artifact status reset to "received"

---

## Phase M4 - Pipeline Alerts

### TC-M4-001: High Failure Rate Alert Triggers
**Objective:** Verify alert created when failure rate > 10%

**Steps:**
1. Seed 10 failed artifacts, 5 completed artifacts (15 total = 66% failure rate)
2. Manually trigger `check-pipeline-health` cron
3. Query `platformCostAlerts` for `PIPELINE_HIGH_FAILURE_RATE`

**Expected:**
- Alert created with severity "high"
- Alert message includes failure percentage
- Metadata contains failureRate, threshold

---

### TC-M4-002: Alert Deduplication Prevents Spam
**Objective:** Verify duplicate alerts not created within 15 min window

**Steps:**
1. Trigger high failure rate condition
2. Run health check cron → alert created
3. Wait 5 minutes
4. Run health check cron again → should NOT create duplicate

**Expected:**
- First run: 1 alert created
- Second run: 0 alerts created (deduplicated)
- Only 1 unacknowledged alert of this type exists

---

### TC-M4-003: Alert Acknowledgment Marks Resolved
**Objective:** Verify acknowledging alert updates acknowledged flag

**Steps:**
1. Create alert via health check
2. Call `acknowledgeAlert` mutation
3. Query alert by ID

**Expected:**
- acknowledged === true
- acknowledgedAt === timestamp of mutation
- acknowledgedBy === user._id

---

## Phase M5 - Dashboard UI

### TC-M5-001: Dashboard Page Loads < 2 Seconds
**Objective:** Verify performance target met

**Steps:**
1. Navigate to `/platform/voice-monitoring`
2. Measure time to first contentful paint
3. Verify all components rendered

**Expected:**
- Page loads in < 2 seconds
- Flow graph visible
- Status cards showing data
- Activity feed showing events

---

### TC-M5-002: Real-Time Updates Appear < 10 Seconds
**Objective:** Verify real-time Convex subscriptions work

**Steps:**
1. Open dashboard
2. In separate tab: create new voice note artifact
3. Observe dashboard for update

**Expected:**
- Activity feed shows new event within 10 seconds
- Status card counters increment
- Flow graph counts update

---

### TC-M5-003: Platform Staff Authorization
**Objective:** Verify non-staff users cannot access dashboard

**Steps:**
1. Login as non-platform-staff user
2. Navigate to `/platform/voice-monitoring`

**Expected:**
- Redirected to `/platform` (platform hub)
- Dashboard not accessible

---

### TC-M5-004: Tab Navigation Works
**Objective:** Verify all 8 tabs accessible

**Steps:**
1. Open dashboard (Overview tab)
2. Click each tab: Artifacts, Metrics, Events, Pipeline, Alerts
3. Verify URL updates and content changes

**Expected:**
- Each tab loads correct page
- URL matches tab (e.g., `/platform/voice-monitoring/metrics`)
- No broken links

---

### TC-M5-005: Mobile Responsive (375px Width)
**Objective:** Verify dashboard works on mobile

**Steps:**
1. Set viewport to 375px × 667px (iPhone SE)
2. Navigate to dashboard
3. Verify layout adapts

**Expected:**
- Status cards stack vertically (1 column)
- Flow graph uses vertical layout
- Tabs scroll horizontally
- No horizontal overflow

---

## Phase M6 - Artifacts Grid & Detail

### TC-M6-001: Cursor Pagination Loads More Artifacts
**Objective:** Verify infinite scroll / load more works

**Steps:**
1. Seed 100 test artifacts
2. Navigate to `/platform/voice-monitoring/artifacts`
3. Scroll to bottom → click "Load More"
4. Verify more artifacts loaded

**Expected:**
- Initial load: 50 artifacts
- After load more: 70 artifacts (20 more)
- Can continue loading until all 100 shown
- No duplicate artifacts

---

### TC-M6-002: Expandable Rows Show Claims Inline
**Objective:** Verify expanding row shows claims without re-query

**Steps:**
1. Navigate to artifacts grid
2. Click artifact row with claims
3. Observe claims displayed inline
4. Check network tab for queries

**Expected:**
- Row expands to show claims section
- Claims data already loaded (no new query)
- Can collapse row again

---

### TC-M6-003: Retry Button Triggers Pipeline Action
**Objective:** Verify retry button calls retry mutation

**Steps:**
1. Navigate to failed artifact in grid
2. Click "Retry Transcription" button
3. Observe artifact status change

**Expected:**
- Button triggers `retryTranscription` mutation
- Artifact status changes from "failed" to "transcribing"
- Toast notification shows "Retry initiated"

---

### TC-M6-004: Filters Work (Status, Org, Date Range)
**Objective:** Verify filtering narrows results

**Steps:**
1. Seed artifacts with various statuses and orgs
2. Apply filter: status = "failed"
3. Verify only failed artifacts shown
4. Clear filter, apply org filter
5. Verify only artifacts for selected org shown

**Expected:**
- Filters reduce visible artifacts
- Filter combinations work (AND logic)
- Clear filters button resets

---

### TC-M6-005: v2-Claims Feature Parity
**Objective:** Verify all v2-claims features present

**Checklist:**
- [ ] View all claims with status badges
- [ ] Filter by status
- [ ] Display claim confidence scores
- [ ] Show entity resolution candidates
- [ ] Manual resolution UI (for needs_disambiguation)
- [ ] Expandable claim details
- [ ] Display timestamps
- [ ] Sort by confidence, date
- [ ] Pagination

**Expected:** All features from v2-claims page available in artifacts grid

---

### TC-M6-006: Artifact Detail Event Timeline
**Objective:** Verify timeline shows all events chronologically

**Steps:**
1. Navigate to `/platform/voice-monitoring/artifacts/[artifactId]`
2. Verify timeline shows events in order
3. Check event metadata displayed

**Expected:**
- Timeline shows all events for artifact
- Chronological order (oldest at top or bottom, consistent)
- Event metadata visible (duration, cost, counts)

---

## Phase M7 - Metrics & Events Pages

### TC-M7-001: Time Range Selector Changes Data
**Objective:** Verify selecting time range updates metrics

**Steps:**
1. Navigate to `/platform/voice-monitoring/metrics`
2. Select "Last 7 days"
3. Observe charts update
4. Select "Last 30 days"
5. Observe charts update again

**Expected:**
- Charts query hourly snapshots for 7 days
- Charts query daily snapshots for 30 days
- Data range matches selection

---

### TC-M7-002: CSS Charts Render Without External Library
**Objective:** Verify charts use CSS-based visualization

**Steps:**
1. Navigate to metrics page
2. Inspect chart elements in dev tools
3. Verify no external chart library loaded

**Expected:**
- Charts rendered with div elements + CSS
- No Chart.js, Recharts, D3.js loaded
- Pattern matches /platform/messaging dashboard

---

### TC-M7-003: Org Breakdown Table Shows Per-Org Metrics
**Objective:** Verify org breakdown uses batch fetch (no N+1)

**Steps:**
1. Seed snapshots for 10 different orgs
2. Navigate to metrics page → org breakdown section
3. Check network tab for queries

**Expected:**
- Table shows all 10 orgs with metrics
- Only 1 query for snapshots + 1 query for org names
- No N+1 pattern (not 10 queries for 10 org names)

---

### TC-M7-004: Event Log Viewer Shows Paginated Events
**Objective:** Verify event log uses cursor pagination

**Steps:**
1. Navigate to `/platform/voice-monitoring/events`
2. Verify initial 50 events loaded
3. Click "Load More"
4. Verify next 50 events loaded

**Expected:**
- Cursor-based pagination used
- Newest events at top
- Can filter by event type, stage, org

---

### TC-M7-005: Event Detail Expansion Shows JSON
**Objective:** Verify clicking event row shows full payload

**Steps:**
1. Navigate to event log
2. Click event row
3. Observe expanded section

**Expected:**
- Event payload displayed as formatted JSON
- Includes all fields (eventId, metadata, timestamp, etc.)
- Can collapse again

---

## Phase M8 - Pipeline View & Alerts

### TC-M8-001: Stage Drill-Down Modal Opens
**Objective:** Verify clicking stage opens modal with artifacts

**Steps:**
1. Navigate to `/platform/voice-monitoring/pipeline`
2. Click "Transcription" stage in flow graph
3. Observe modal opens

**Expected:**
- Modal shows all artifacts with status "transcribing"
- Table includes: Artifact ID, Coach, Org, Time Elapsed
- Can close modal

---

### TC-M8-002: Active Artifacts Panel Shows In-Flight Items
**Objective:** Verify panel displays currently processing artifacts

**Steps:**
1. Create 3 artifacts in different stages (transcribing, processing, etc.)
2. Navigate to pipeline view
3. Observe active artifacts panel

**Expected:**
- Panel shows all 3 artifacts
- Each shows current stage, time elapsed, progress indicator
- Real-time updates as artifacts progress

---

### TC-M8-003: Toast Notification for New Critical Alert
**Objective:** Verify toast appears when critical alert created

**Steps:**
1. Open alerts page
2. In separate process: trigger circuit breaker open (critical alert)
3. Observe toast notification

**Expected:**
- Toast appears within 10 seconds
- Toast severity matches alert (error/critical)
- Toast message matches alert description
- Can dismiss toast

---

### TC-M8-004: Alert Acknowledge Button Works
**Objective:** Verify acknowledging alert removes from active list

**Steps:**
1. Navigate to `/platform/voice-monitoring/alerts`
2. Verify active alert exists
3. Click "Acknowledge" button
4. Observe alert moves to history

**Expected:**
- Alert removed from active panel
- Alert appears in history table with "Acknowledged" status
- acknowledgedAt timestamp populated

---

## Phase M9 - Cleanup & Polish

### TC-M9-001: v2-Claims Page Deleted
**Objective:** Verify old page removed after feature parity achieved

**Steps:**
1. Navigate to `/platform/v2-claims`

**Expected:**
- 404 Not Found OR redirects to `/platform/voice-monitoring/artifacts`
- Directory `apps/web/src/app/platform/v2-claims/` does not exist

---

### TC-M9-002: All 8 Pages Accessible via Tabs
**Objective:** Verify complete navigation

**Pages:**
1. Overview (`/platform/voice-monitoring`)
2. Artifacts (`/platform/voice-monitoring/artifacts`)
3. Artifact Detail (`/platform/voice-monitoring/artifacts/[id]`)
4. Metrics (`/platform/voice-monitoring/metrics`)
5. Events (`/platform/voice-monitoring/events`)
6. Pipeline (`/platform/voice-monitoring/pipeline`)
7. Alerts (`/platform/voice-monitoring/alerts`)

**Expected:** All pages load successfully, no 404s

---

### TC-M9-003: Dashboard Performance < 2 Seconds
**Objective:** Verify performance target met after all phases complete

**Steps:**
1. Clear browser cache
2. Navigate to `/platform/voice-monitoring`
3. Measure time to interactive

**Expected:**
- First contentful paint < 1 second
- Time to interactive < 2 seconds
- No slow queries (> 200ms)

---

### TC-M9-004: Loading States on All Pages
**Objective:** Verify skeleton loaders show while data loading

**Steps:**
1. Throttle network to "Slow 3G"
2. Navigate to each of 8 pages
3. Observe loading state before data appears

**Expected:**
- Each page shows skeleton loader or spinner
- No blank screens or flashing
- Skeleton matches final layout

---

## Authorization Tests (All Phases)

### TC-AUTH-001: Platform Staff Can Access All Pages
**Objective:** Verify platform staff user has full access

**Steps:**
1. Login as `neil.B@blablablak.com` (platform staff)
2. Navigate to all 8 monitoring pages

**Expected:** All pages accessible, no 403 errors

---

### TC-AUTH-002: Non-Staff Redirected from All Pages
**Objective:** Verify authorization enforced on all routes

**Steps:**
1. Login as non-platform-staff user
2. Attempt to navigate to each of 8 pages

**Expected:** All pages redirect to `/platform` (unauthorized)

---

### TC-AUTH-003: Unauthenticated User Redirected to Login
**Objective:** Verify authentication required

**Steps:**
1. Logout
2. Navigate to `/platform/voice-monitoring`

**Expected:** Redirected to login page

---

## Performance Benchmarks (All Phases)

| Operation | Target | Test Method |
|-----------|--------|-------------|
| Dashboard page load | < 2s | Lighthouse performance audit |
| Real-time metrics query | < 50ms | Convex function logs |
| Artifact list query | < 200ms | Network tab timing |
| Event timeline query | < 100ms | Network tab timing |
| Hourly aggregation cron | < 30s | Cron execution logs |
| Alert health check | < 10s | Cron execution logs |

---

## Coverage Summary

| Phase | Test Scenarios | Critical Flows |
|-------|----------------|----------------|
| M1 | 4 | Event logging, counter increment, timeWindow format |
| M2 | 3 | Real-time metrics, aggregation, cleanup |
| M3 | 3 | Retry operations, attempt tracking, cleanup |
| M4 | 3 | Alert triggers, deduplication, acknowledgment |
| M5 | 5 | Dashboard load, real-time updates, auth, tabs, mobile |
| M6 | 6 | Pagination, expandable rows, retry, filters, feature parity, timeline |
| M7 | 5 | Time range, CSS charts, org breakdown, event log, detail |
| M8 | 4 | Stage drill-down, active artifacts, toast, acknowledge |
| M9 | 4 | v2-claims removed, all pages accessible, performance, loading |
| Auth | 3 | Platform staff access, non-staff redirect, unauth redirect |
| Perf | 6 | All performance targets |

**Total Test Scenarios:** 46

---

**Test Execution:** Run with `npx -w apps/web playwright test --config=uat/playwright.config.ts voice-monitoring/`

**Coverage Target:** 100% of critical user flows, 80% of all features

**Last Updated:** February 15, 2026
