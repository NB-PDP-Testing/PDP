# M1 Voice Monitor Harness - Manual Testing Guide

## Overview
This guide walks through manual testing of the Voice Monitor Harness Phase M1 implementation using the Convex dashboard and app UI.

## Prerequisites
- Convex dashboard access
- Platform staff account credentials
- Test organization with voice notes enabled
- Test audio file or WhatsApp integration

---

## Test 1: Schema Validation ✅

**What to check:**
- All 3 new tables exist in Convex schema
- Indexes are properly configured

**Steps:**
1. Open Convex dashboard: https://dashboard.convex.dev
2. Navigate to "Data" tab
3. Verify tables exist:
   - ✅ `voicePipelineEvents`
   - ✅ `voicePipelineCounters`
   - ✅ `voicePipelineMetricsSnapshots`

4. Click on `voicePipelineEvents` and verify indexes:
   - `by_artifactId`
   - `by_timestamp`
   - `by_eventType`
   - `by_eventType_and_timestamp`
   - `by_org_and_timestamp`
   - `by_pipelineStage`
   - `by_pipelineStage_and_timestamp`
   - `by_timeWindow`
   - `by_timeWindow_and_eventType`

**Expected Result:** All tables and indexes present

---

## Test 2: Event Logging - Create Voice Note

**What to test:**
- Events are logged when voice note is created
- Counter increments atomically
- timeWindow format is correct
- organizationId is populated

**Steps:**
1. **Create a test voice note** (via app or WhatsApp)
   - Log in as a coach
   - Navigate to voice notes
   - Record a new voice note OR send via WhatsApp

2. **Check voicePipelineEvents table:**
   - Open Convex dashboard → Data → `voicePipelineEvents`
   - Sort by `timestamp` (newest first)
   - Look for recent events:
     - `artifact_received` - Should appear immediately
     - `transcription_started` - Should appear within seconds
     - `transcription_completed` - Should appear after transcription
     - `claims_extraction_started` - After transcription
     - `claims_extracted` - After claims processing

3. **Verify event data:**
   - Click on an event to inspect
   - Check fields:
     - ✅ `eventId` is a UUID string
     - ✅ `timeWindow` format is `YYYY-MM-DD-HH` (e.g., "2026-02-16-14")
     - ✅ `organizationId` matches the coach's organization
     - ✅ `artifactId` points to the voice note artifact
     - ✅ `metadata` contains relevant data (duration, confidence, etc.)

4. **Check voicePipelineCounters table:**
   - Navigate to Data → `voicePipelineCounters`
   - Find counter: `artifacts_received_1h`
   - Verify:
     - ✅ `currentValue` incremented by 1
     - ✅ `windowStart` and `windowEnd` are timestamps
     - ✅ Window is 1 hour (3,600,000 ms)

**Expected Result:**
- 5+ events logged for a complete pipeline run
- Counters incremented atomically
- All metadata populated correctly

---

## Test 3: Authorization Check

**What to test:**
- Only platform staff can query monitoring data
- Regular users get "Unauthorized" error

**Steps:**
1. **Test as Platform Staff:**
   - Open Convex dashboard → Functions
   - Run query: `voicePipelineEvents:getRecentEvents`
   - Args:
     ```json
     {
       "paginationOpts": {
         "numItems": 10,
         "cursor": null
       }
     }
     ```
   - ✅ Should return event data

2. **Test as Regular User:**
   - Try the same query with a non-platform-staff user context
   - ✅ Should throw error: "Unauthorized: Platform staff only"

**Expected Result:** Authorization working correctly

---

## Test 4: Counter Window Rotation

**What to test:**
- Counters reset when window expires
- Window rotation is atomic

**Steps:**
1. **View current counter:**
   - Data → `voicePipelineCounters`
   - Find `artifacts_received_1h`
   - Note: `currentValue`, `windowEnd`

2. **Wait for window to expire OR manually update:**
   - Option A: Wait 1 hour (slow)
   - Option B: Manually set `windowEnd` to past timestamp:
     - Click counter → Edit
     - Set `windowEnd` to `Date.now() - 1000`
     - Save

3. **Create another voice note:**
   - Record a new voice note
   - Check counter again

4. **Verify rotation:**
   - ✅ `currentValue` should be 1 (reset)
   - ✅ `windowStart` updated to current time
   - ✅ `windowEnd` updated to +1 hour

**Expected Result:** Counter rotates atomically without errors

---

## Test 5: Query Performance

**What to test:**
- All queries use indexes (not .filter())
- Pagination works correctly
- Event logging doesn't slow down pipeline

**Steps:**
1. **Test pagination:**
   - Functions → `voicePipelineEvents:getRecentEvents`
   - Args:
     ```json
     {
       "paginationOpts": {
         "numItems": 5,
         "cursor": null
       }
     }
     ```
   - Check response:
     - ✅ Returns max 5 events
     - ✅ `isDone` is boolean
     - ✅ `continueCursor` provided if more data exists

2. **Test filtering by eventType:**
   - Args:
     ```json
     {
       "paginationOpts": {
         "numItems": 10,
         "cursor": null
       },
       "filters": {
         "eventType": "artifact_received"
       }
     }
     ```
   - ✅ Should return only `artifact_received` events

3. **Check pipeline performance:**
   - Create multiple voice notes (5-10)
   - Compare total processing time before/after M1
   - ✅ Overhead should be < 10ms per voice note

**Expected Result:** All queries performant, pagination working

---

## Test 6: Failed Artifact Tracking

**What to test:**
- Failed artifacts are logged
- `getFailedArtifacts` query works

**Steps:**
1. **Trigger a failure (simulate):**
   - Try sending invalid audio file
   - OR manually update artifact status to "failed"

2. **Check event logged:**
   - Data → `voicePipelineEvents`
   - Look for `artifact_failed` event
   - Verify `errorMessage` and `errorCode` populated

3. **Query failed artifacts:**
   - Functions → `voicePipelineEvents:getFailedArtifacts`
   - Args:
     ```json
     {
       "paginationOpts": {
         "numItems": 10,
         "cursor": null
       }
     }
     ```
   - ✅ Should return failed artifacts

**Expected Result:** Failures tracked correctly

---

## Test 7: End-to-End Pipeline Flow

**What to test:**
- All 9 instrumentation points emit events
- Complete pipeline generates expected event sequence

**Steps:**
1. **Create voice note with full processing:**
   - Record voice note as coach
   - Wait for complete processing

2. **Check event sequence:**
   - Data → `voicePipelineEvents`
   - Filter by `artifactId` (your voice note)
   - Verify event sequence:
     1. ✅ `artifact_received`
     2. ✅ `transcription_started`
     3. ✅ `transcription_completed`
     4. ✅ `claims_extraction_started`
     5. ✅ `claims_extracted`
     6. ✅ `entity_resolution_started`
     7. ✅ `entity_resolution_completed` OR `entity_needs_disambiguation`
     8. ✅ `draft_generation_started`
     9. ✅ `drafts_generated`
     10. ✅ `draft_confirmed` OR `draft_rejected` (if user action)

3. **Verify metadata across events:**
   - Each event should have:
     - ✅ Correct `pipelineStage`
     - ✅ Duration fields when applicable
     - ✅ Counts (claimCount, entityCount, draftCount)
     - ✅ Confidence scores where relevant

**Expected Result:** Complete event timeline for voice note lifecycle

---

## Test 8: Organization Isolation

**What to test:**
- Events are scoped to correct organization
- Counters can be org-specific or platform-wide

**Steps:**
1. **Create voice notes in different orgs:**
   - Create voice note in Org A
   - Create voice note in Org B

2. **Check event isolation:**
   - Query events filtered by organizationId
   - ✅ Org A events have correct orgId
   - ✅ Org B events have correct orgId

3. **Check counter behavior:**
   - Platform-wide counter should count both
   - Org-specific counters should be separate

**Expected Result:** Proper organization data isolation

---

## Success Criteria Checklist

After completing all tests, verify:

- [ ] All 3 tables created with correct schema
- [ ] 9 indexes on voicePipelineEvents working
- [ ] Counter increments are atomic (same transaction)
- [ ] timeWindow format is 'YYYY-MM-DD-HH'
- [ ] All 9 pipeline files emit events
- [ ] Event metadata populated correctly
- [ ] Platform staff authorization enforced
- [ ] Pagination works (no .take() usage)
- [ ] Pipeline performance not impacted (< 10ms overhead)
- [ ] Failed artifacts tracked
- [ ] Organization isolation maintained

---

## Troubleshooting

### Events not appearing
- Check Convex logs for errors
- Verify `internal.models.voicePipelineEvents` import is correct
- Check that scheduler is working (mutations)
- Check that runMutation succeeded (actions)

### Counter not incrementing
- Check event type mapping in `getCounterTypeForEvent()`
- Verify transaction succeeded
- Check for race conditions in window rotation

### Authorization errors
- Verify user has `isPlatformStaff: true`
- Check Better Auth adapter is working
- Confirm auth context is passed correctly

---

## Notes

- **No E2E tests exist** - All testing is manual via Convex dashboard and app
- **Future improvement**: Create Playwright tests for voice note creation
- **Performance monitoring**: Track event logging overhead in production
