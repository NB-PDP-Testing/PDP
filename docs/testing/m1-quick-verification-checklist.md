# M1 Quick Verification Checklist

## 🎯 5-Minute Quick Check

Use this checklist to quickly verify M1 Voice Monitor Harness is working.

### Prerequisites
- [ ] Convex dashboard access
- [ ] Platform staff account OR ability to view Convex data tables

---

## Step 1: Verify Schema Tables (1 min)

**Convex Dashboard → Data Tab**

- [ ] Navigate to https://dashboard.convex.dev
- [ ] Select your project
- [ ] Click "Data" in left sidebar
- [ ] Scroll down to find these tables:
  - [ ] `voicePipelineEvents` ✅
  - [ ] `voicePipelineCounters` ✅
  - [ ] `voicePipelineMetricsSnapshots` ✅

**If tables exist:** Schema creation SUCCESS ✅

---

## Step 2: Check voicePipelineEvents Structure (1 min)

**Click on `voicePipelineEvents` table**

Verify schema has these indexes:
- [ ] `by_artifactId`
- [ ] `by_timestamp`
- [ ] `by_eventType`
- [ ] `by_eventType_and_timestamp`
- [ ] `by_org_and_timestamp`
- [ ] `by_pipelineStage`
- [ ] `by_pipelineStage_and_timestamp`
- [ ] `by_timeWindow`
- [ ] `by_timeWindow_and_eventType`

**Count:** Should have 9 indexes total

**If all indexes present:** Event logging infrastructure SUCCESS ✅

---

## Step 3: Verify Functions Exist (1 min)

**Convex Dashboard → Functions Tab**

Search for `voicePipelineEvents`:

- [ ] `voicePipelineEvents:logEvent` (internal mutation)
- [ ] `voicePipelineEvents:getRecentEvents` (query)
- [ ] `voicePipelineEvents:getEventsByArtifact` (internal query)
- [ ] `voicePipelineEvents:getEventTimeline` (query)
- [ ] `voicePipelineEvents:getActiveArtifacts` (query)
- [ ] `voicePipelineEvents:getFailedArtifacts` (query)

**If all 6 functions exist:** Infrastructure deployment SUCCESS ✅

---

## Step 4: Check for Events (Optional - 2 min)

**Only if you have existing voice notes in the system:**

1. Click on `voicePipelineEvents` table
2. Sort by `timestamp` (descending - newest first)
3. Look for recent events

**Expected events if voice notes exist:**
- `artifact_received`
- `transcription_started`
- `transcription_completed`
- `claims_extraction_started`
- `claims_extracted`
- `entity_resolution_started`
- `entity_resolution_completed`
- `draft_generation_started`
- `drafts_generated`

**If you see these events:** Event emission SUCCESS ✅
**If no events:** Either no voice notes created yet, or instrumentation not active

---

## Step 5: Inspect an Event (Optional - 1 min)

**Click on any event in voicePipelineEvents**

Verify the event has:
- [ ] `eventId` - should be a UUID string
- [ ] `eventType` - should be one of the expected types
- [ ] `timeWindow` - should be format `YYYY-MM-DD-HH` (e.g., "2026-02-16-14")
- [ ] `timestamp` - should be a number (milliseconds)
- [ ] `artifactId` - should be an ID string (if applicable)
- [ ] `organizationId` - should be an org ID string (if applicable)
- [ ] `metadata` - should be an object with relevant data

**If structure matches:** Event data format SUCCESS ✅

---

## Step 6: Check Counters (Optional - 1 min)

**Click on `voicePipelineCounters` table**

Look for counters:
- `artifacts_received_1h`
- `artifacts_completed_1h`
- `artifacts_failed_1h`
- `transcriptions_completed_1h`
- `claims_extracted_1h`
- `entities_resolved_1h`
- `drafts_generated_1h`

For each counter, verify:
- [ ] `currentValue` - should be >= 0
- [ ] `windowStart` - should be a timestamp
- [ ] `windowEnd` - should be `windowStart + 3600000` (1 hour in ms)

**If counters exist and have valid data:** Counter system SUCCESS ✅

---

## Full Verification Status

- [ ] Schema tables created
- [ ] Indexes configured correctly
- [ ] Functions deployed
- [ ] Events are being logged (if voice notes exist)
- [ ] Event data structure is correct
- [ ] Counters are working

**Minimum for M1 Success:** First 3 checkboxes ✅
**Full M1 Success:** All 6 checkboxes ✅

---

## Next Steps

### If Schema/Functions OK but No Events:
1. Create a test voice note via the app
2. Wait 30 seconds
3. Refresh `voicePipelineEvents` table
4. Events should appear

### If Events Appearing but Wrong Format:
1. Check specific event type
2. Review instrumentation code for that event
3. Verify organizationId extraction logic

### If Counters Not Incrementing:
1. Check `logEvent` mutation logs
2. Verify counter type mapping
3. Check for transaction errors

---

## Troubleshooting Quick Checks

**No tables visible:**
- Run `npx -w packages/backend convex codegen`
- Check if on correct Convex project
- Verify schema.ts was deployed

**Functions not appearing:**
- Check Convex logs for deployment errors
- Verify voicePipelineEvents.ts was deployed
- Try re-deploying

**Events not logging:**
- Check if instrumentation was added to pipeline files
- Verify `internal.models.voicePipelineEvents.logEvent` import
- Check Convex function logs for errors

---

## Success Criteria Met?

If you can check off the first 3 items (schema, indexes, functions), then:

**✅ M1 VOICE MONITOR HARNESS IS SUCCESSFULLY DEPLOYED**

The instrumentation will start logging events as soon as voice notes are processed through the pipeline.
