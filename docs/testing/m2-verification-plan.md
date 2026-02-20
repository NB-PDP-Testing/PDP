# M2 Verification Plan - Step-by-Step Testing

**Date:** 2026-02-16
**Phase:** Voice Monitor Harness - M2 (Metrics & Aggregation)
**Purpose:** Verify Ralph's implementation works correctly

---

## Testing Overview

**4 Testing Levels:**
1. 🔵 **Quick Checks** (5 minutes) - Verify code compiles and loads
2. 🟢 **Function Testing** (15 minutes) - Test individual functions via Convex dashboard
3. 🟡 **Cron Testing** (10 minutes) - Verify crons and trigger manually
4. 🟠 **End-to-End Testing** (30 minutes) - Full workflow with real data

**Total Time:** ~1 hour

---

## Level 1: Quick Checks (5 minutes)

### ✅ Step 1.1: Verify Code Compiles
```bash
cd /Users/neil/Documents/GitHub/PDP

# Run codegen (should pass)
npx -w packages/backend convex codegen
```

**Expected Output:**
```
Running TypeScript...
✓ Code compiled successfully
```

**If fails:** Check error messages, fix TypeScript errors

---

### ✅ Step 1.2: Verify Functions Exported
```bash
# Check API exports
grep "voicePipelineMetrics" packages/backend/convex/_generated/api.d.ts
```

**Expected Output:**
```
voicePipelineMetrics: {
  getRealTimeMetrics: FunctionReference<"query", ...>
  getHistoricalMetrics: FunctionReference<"query", ...>
  getStageBreakdown: FunctionReference<"query", ...>
  getOrgBreakdown: FunctionReference<"query", ...>
  aggregateHourlyMetrics: FunctionReference<"mutation", ...>
  ...
}
```

**If missing:** Re-run codegen

---

### ✅ Step 1.3: Verify Schema Tables Exist
```bash
# Check schema for M1 tables
grep -E "voicePipelineEvents|voicePipelineCounters|voicePipelineMetricsSnapshots" packages/backend/convex/schema.ts | head -3
```

**Expected Output:**
```
voicePipelineEvents: defineTable({...}),
voicePipelineCounters: defineTable({...}),
voicePipelineMetricsSnapshots: defineTable({...}),
```

**If missing:** M1 prerequisites not met - review M1 completion

---

### ✅ Step 1.4: Verify Crons Added
```bash
# Check crons.ts for M2 crons
grep "aggregate-pipeline\|cleanup-pipeline" packages/backend/convex/crons.ts
```

**Expected Output:**
```
"aggregate-pipeline-hourly-metrics",
"aggregate-pipeline-daily-metrics",
"cleanup-pipeline-snapshots",
"cleanup-pipeline-events",
```

**If missing:** Check commit b19b0d76

---

## Level 2: Function Testing via Convex Dashboard (15 minutes)

### Prerequisites
1. **Convex Dashboard Access:** https://dashboard.convex.dev
2. **Project:** PlayerARC/PDP
3. **Deployment:** Dev environment
4. **Authentication:** Platform staff account (neil.B@blablablak.com)

---

### 🔵 Test 2.1: getRealTimeMetrics (Most Critical!)

**Purpose:** Verify reads counters (NOT events) and returns data

**Steps:**
1. Open Convex Dashboard → Navigate to your project
2. Go to **Functions** tab
3. Find `voicePipelineMetrics:getRealTimeMetrics`
4. Click to expand function

**Test Case 1: Platform-Wide Metrics**
```json
{
  "organizationId": null
}
```

**Click "Run"**

**Expected Result:**
```json
{
  "artifactsReceived1h": <number>,
  "artifactsCompleted1h": <number>,
  "artifactsFailed1h": <number>,
  "transcriptionsCompleted1h": <number>,
  "claimsExtracted1h": <number>,
  "entitiesResolved1h": <number>,
  "draftsGenerated1h": <number>,
  "failures1h": <number>,
  "windowStart": <timestamp>,
  "windowEnd": <timestamp>
}
```

**Values might be 0 if no M1 events have been logged yet - that's OK!**

**Test Case 2: Org-Specific Metrics**
```json
{
  "organizationId": "<your-org-id>"
}
```

**Expected Result:** Same structure, with org-specific counter values

**✅ Success Criteria:**
- Function executes without errors
- Returns object with all expected fields
- Values are numbers (not null/undefined)
- Execution time < 50ms (check in dashboard logs)

**❌ Failure Indicators:**
- Error: "Not authorized" → User not platform staff
- Error: "Cannot query voicePipelineEvents" → Wrong table queried
- Null/undefined values → Counter structure issue

---

### 🔵 Test 2.2: getHistoricalMetrics

**Purpose:** Verify queries snapshots by time range

**Steps:**
1. Functions tab → `voicePipelineMetrics:getHistoricalMetrics`

**Test Case: Last 24 Hours (Hourly)**
```json
{
  "periodType": "hourly",
  "startTime": <Date.now() - 86400000>,
  "endTime": <Date.now()>
}
```

**To calculate timestamps:**
- Open browser console
- Run: `Date.now() - 86400000` (24 hours ago)
- Run: `Date.now()` (now)

**Expected Result:**
```json
[
  // Array of snapshot objects (might be empty if no snapshots yet)
]
```

**Note:** Will be empty until aggregateHourlyMetrics runs!

**✅ Success Criteria:**
- Function executes without errors
- Returns array (even if empty)
- If snapshots exist, they have expected structure

**❌ Failure Indicators:**
- Error: "Cannot read property..." → Schema mismatch
- Wrong data types → Validator issue

---

### 🔵 Test 2.3: aggregateHourlyMetrics (Critical!)

**Purpose:** Manually trigger hourly aggregation to create snapshots

**Steps:**
1. Functions tab → `voicePipelineMetrics:aggregateHourlyMetrics`

**⚠️ IMPORTANT:** This is an `internalMutation` - you may need to use wrapper function or call via another method.

**Alternative: Use wrapper function**
1. Functions tab → `voicePipelineMetrics:aggregateHourlyMetricsWrapper`

**Test Case: Aggregate Previous Hour**
```json
{}
```
(Wrapper calculates timestamp automatically)

**Click "Run"**

**Expected Result:**
```json
null
```
(Functions returns null on success)

**Verify Snapshots Created:**
1. Go to **Data** tab in Convex dashboard
2. Select table: `voicePipelineMetricsSnapshots`
3. Look for new entries with:
   - `periodType: "hourly"`
   - Recent `periodStart` timestamp
   - Metrics populated

**✅ Success Criteria:**
- Function completes without error
- New snapshots appear in voicePipelineMetricsSnapshots table
- Both platform-wide (no organizationId) and org-specific snapshots created
- Execution time < 30s

**❌ Failure Indicators:**
- Error: "Cannot insert..." → Schema issue
- No snapshots created → No events in timeWindow
- Execution timeout → Performance issue

---

### 🔵 Test 2.4: getOrgBreakdown (N+1 Test!)

**Purpose:** Verify batch fetch pattern works (no N+1 queries)

**Steps:**
1. Functions tab → `voicePipelineMetrics:getOrgBreakdown`

**Test Case: Last 24 Hours**
```json
{
  "periodType": "hourly",
  "startTime": <Date.now() - 86400000>,
  "endTime": <Date.now()>
}
```

**Expected Result:**
```json
[
  {
    "organizationId": "org-id-1",
    "orgName": "Organization Name",
    "artifactsReceived": <number>,
    "artifactsCompleted": <number>,
    "artifactsFailed": <number>,
    "totalAICost": <number>,
    "avgLatency": <number>,
    "failureRate": <number>
  },
  ...
]
```

**Check Performance:**
1. After running, check **Logs** tab
2. Look for execution time
3. Should scale well with number of orgs (no N+1 slowdown)

**✅ Success Criteria:**
- Returns array of org breakdowns
- orgName is populated (not "Unknown")
- Numbers are valid (no NaN or Infinity)
- failureRate is between 0 and 1

**❌ Failure Indicators:**
- orgName all "Unknown" → Batch fetch failed
- NaN or Infinity in metrics → Safe division issue
- Slow execution → Possible N+1 (check logs for query count)

---

### 🔵 Test 2.5: aggregateDailyMetrics

**Purpose:** Verify daily aggregation from hourly snapshots

**Steps:**
1. Functions tab → `voicePipelineMetrics:aggregateDailyMetricsWrapper`

**Test Case:**
```json
{}
```
(Wrapper calculates timestamp for previous day)

**Expected Result:**
```json
null
```

**Verify:**
1. Data tab → `voicePipelineMetricsSnapshots`
2. Look for entries with:
   - `periodType: "daily"`
   - Yesterday's date in periodStart

**Note:** Won't work until you have 24 hourly snapshots for a day!

**✅ Success Criteria:**
- Function completes
- Daily snapshots created
- Metrics are aggregated from hourly (not recalculated from events)
- Execution time < 10s

---

### 🔵 Test 2.6: Cleanup Functions

**Purpose:** Verify cleanup works without deleting needed data

**⚠️ CAUTION:** These delete data! Test carefully.

**Test 2.6a: cleanupOldSnapshots**
1. Functions tab → `voicePipelineMetrics:cleanupOldSnapshots`

```json
{}
```

**Expected Result:**
```json
{
  "hourlyDeleted": <number>,
  "dailyDeleted": <number>
}
```

**Verify:** Only deletes snapshots older than retention (7d hourly, 90d daily)

**Test 2.6b: cleanupOldEvents**
1. Functions tab → `voicePipelineMetrics:cleanupOldEvents`

```json
{}
```

**Expected Result:**
```json
{
  "eventsDeleted": <number>
}
```

**Verify:** Only deletes events older than 48 hours

---

## Level 3: Cron Testing (10 minutes)

### 🟡 Step 3.1: Verify Crons Visible in Dashboard

**Steps:**
1. Convex Dashboard → **Crons** tab
2. Look for 4 new crons:
   - `aggregate-pipeline-hourly-metrics`
   - `aggregate-pipeline-daily-metrics`
   - `cleanup-pipeline-snapshots`
   - `cleanup-pipeline-events`

**Expected:** All 4 crons listed with correct schedules

**Schedule Verification:**
| Cron | Schedule | Should Show |
|------|----------|-------------|
| aggregate-pipeline-hourly-metrics | Hourly at :30 | "Every hour at minute 30" |
| aggregate-pipeline-daily-metrics | Daily at 1:30 AM UTC | "Every day at 01:30 UTC" |
| cleanup-pipeline-snapshots | Weekly Sunday 4:30 AM | "Every Sunday at 04:30 UTC" |
| cleanup-pipeline-events | Weekly Sunday 5:00 AM | "Every Sunday at 05:00 UTC" |

**✅ Success Criteria:**
- All 4 crons visible
- Schedules match expected timing
- Status: "Active" or "Enabled"

**❌ Failure Indicators:**
- Crons missing → Check crons.ts deployment
- Wrong schedule → Check timing in crons.ts

---

### 🟡 Step 3.2: Manually Trigger Crons

**Purpose:** Test crons execute successfully

**Steps for Each Cron:**
1. Crons tab → Find cron
2. Click **"Run Now"** or **"Trigger"** button
3. Wait for execution
4. Check logs for errors

**Test Each Cron:**

**Cron 1: aggregate-pipeline-hourly-metrics**
- Click "Run Now"
- Expected: Completes in < 30s
- Check Data tab → voicePipelineMetricsSnapshots for new hourly entries

**Cron 2: aggregate-pipeline-daily-metrics**
- Click "Run Now"
- Expected: Completes in < 10s
- Check Data tab → voicePipelineMetricsSnapshots for new daily entries

**Cron 3: cleanup-pipeline-snapshots**
- Click "Run Now"
- Expected: Completes quickly
- Check Logs for deleted count

**Cron 4: cleanup-pipeline-events**
- Click "Run Now"
- Expected: Completes quickly
- Check Logs for deleted count

**✅ Success Criteria:**
- All crons execute without errors
- Logs show completion messages
- Expected data changes occur

**❌ Failure Indicators:**
- Cron fails with error → Check function implementation
- Timeout → Performance issue
- No data changes → Logic issue

---

### 🟡 Step 3.3: Verify Cron Execution Logs

**Steps:**
1. Crons tab → Click on each cron
2. View **"Recent Executions"** or **"History"**
3. Check latest execution:
   - Status: Success/Failed
   - Duration
   - Error messages (if any)

**✅ Success Criteria:**
- Recent executions show "Success"
- Execution times within targets
- No error messages

---

## Level 4: End-to-End Testing (30 minutes)

### 🟠 Test 4.1: Full Aggregation Workflow

**Purpose:** Test complete flow from events → hourly → daily → cleanup

**Scenario:** Create test events, aggregate them, query results

**Step 1: Verify M1 Events Exist**
```bash
# Via Convex dashboard Data tab
# Table: voicePipelineEvents
# Should have events with recent timestamps
```

If no events: Create a test voice note to generate events via M1 instrumentation

**Step 2: Run Hourly Aggregation**
1. Functions → `aggregateHourlyMetricsWrapper`
2. Run with empty args `{}`
3. Wait for completion

**Step 3: Verify Snapshots Created**
1. Data tab → `voicePipelineMetricsSnapshots`
2. Filter: `periodType = "hourly"`
3. Should see new snapshots with:
   - Recent periodStart
   - Metrics populated from events
   - Both platform-wide and org-specific

**Step 4: Query Real-Time Metrics**
1. Functions → `getRealTimeMetrics`
2. Args: `{"organizationId": null}`
3. Should return counter values

**Step 5: Query Historical Metrics**
1. Functions → `getHistoricalMetrics`
2. Args:
```json
{
  "periodType": "hourly",
  "startTime": <24h ago>,
  "endTime": <now>
}
```
3. Should return array with snapshots

**Step 6: Query Org Breakdown**
1. Functions → `getOrgBreakdown`
2. Same args as step 5
3. Should return array with org names populated

**✅ Success Criteria:**
- Events → Snapshots pipeline works
- All queries return expected data
- Org names populated correctly
- No NaN or Infinity values

---

### 🟠 Test 4.2: Performance Validation

**Purpose:** Verify performance targets are met

**Test 4.2a: getRealTimeMetrics Performance**
1. Run `getRealTimeMetrics` multiple times
2. Check execution time in logs
3. **Target:** < 50ms

**Test 4.2b: Hourly Aggregation Performance**
1. Find an hour with substantial events (500-1000)
2. Run `aggregateHourlyMetrics` for that hour
3. Check execution time
4. **Target:** < 30s for 1000 events

**Test 4.2c: Daily Aggregation Performance**
1. Ensure you have 24 hourly snapshots
2. Run `aggregateDailyMetrics`
3. Check execution time
4. **Target:** < 10s

**✅ Success Criteria:**
- All targets met
- No timeouts
- Consistent performance across multiple runs

---

### 🟠 Test 4.3: Edge Case Testing

**Test Case 1: No Events in Timeframe**
- Run aggregateHourlyMetrics for hour with no events
- Expected: Returns null, no error

**Test Case 2: Empty Org Breakdown**
- Query getOrgBreakdown for time range with no snapshots
- Expected: Returns empty array []

**Test Case 3: Division by Zero**
- Create snapshots with artifactsReceived = 0
- Query getOrgBreakdown
- Expected: failureRate = 0 (not NaN)

**Test Case 4: Missing Org Names**
- If possible, create snapshot with invalid organizationId
- Query getOrgBreakdown
- Expected: orgName = "Unknown"

**✅ Success Criteria:**
- No crashes on edge cases
- Graceful handling of missing data
- No NaN/Infinity in results

---

## Level 5: Monitoring (Ongoing)

### 🔴 Step 5.1: Monitor Cron Execution (24 hours)

**Setup:**
1. Let system run normally for 24 hours
2. Check cron execution at these times:

**Hourly Check Points:**
- 00:30, 01:30, 02:30, ... (every hour)
- Verify `aggregate-pipeline-hourly-metrics` ran
- Check Data tab for new hourly snapshots

**Daily Check Point:**
- 01:30 AM UTC next day
- Verify `aggregate-pipeline-daily-metrics` ran
- Check Data tab for new daily snapshot

**Weekly Check Point:**
- Next Sunday 04:30 AM and 05:00 AM UTC
- Verify cleanup crons ran
- Check logs for deleted counts

**✅ Success Criteria:**
- Crons execute on schedule automatically
- No missed executions
- No errors in logs
- Data accumulates correctly

---

### 🔴 Step 5.2: Data Quality Monitoring

**Metrics to Monitor:**
1. **Snapshot Count Growth:**
   - Hourly snapshots: +1 per hour per org + 1 platform
   - Daily snapshots: +1 per day per org + 1 platform

2. **Counter Accuracy:**
   - Real-time counter values make sense
   - Match expected event volumes

3. **Cleanup Working:**
   - Hourly snapshots deleted after 7 days
   - Daily snapshots deleted after 90 days
   - Events deleted after 48 hours

**Query to Check:**
```sql
-- Via Convex dashboard Data tab
SELECT COUNT(*) FROM voicePipelineMetricsSnapshots
WHERE periodType = 'hourly'
-- Should stay relatively constant (orgs * 168 hours + 168 platform)
```

---

## Verification Checklist

### ✅ Quick Checks (5 min)
- [ ] Codegen passes
- [ ] Functions exported in API
- [ ] Schema tables exist
- [ ] Crons added to crons.ts

### ✅ Function Testing (15 min)
- [ ] getRealTimeMetrics works (< 50ms)
- [ ] getHistoricalMetrics returns snapshots
- [ ] aggregateHourlyMetrics creates snapshots
- [ ] getOrgBreakdown has org names populated
- [ ] aggregateDailyMetrics works
- [ ] Cleanup functions work

### ✅ Cron Testing (10 min)
- [ ] All 4 crons visible in dashboard
- [ ] Schedules correct (hourly :30, daily 1:30 AM)
- [ ] Manual trigger works for all crons
- [ ] Execution logs show success

### ✅ End-to-End Testing (30 min)
- [ ] Full workflow: events → snapshots → queries
- [ ] Performance targets met
- [ ] Edge cases handled gracefully
- [ ] No NaN or Infinity values

### ✅ Monitoring (24+ hours)
- [ ] Hourly cron runs every hour at :30
- [ ] Daily cron runs at 1:30 AM
- [ ] Cleanup crons run on Sunday
- [ ] Data quality maintained

---

## Common Issues & Solutions

### Issue 1: "Not authorized: platform staff only"
**Cause:** User not marked as platform staff
**Solution:**
```sql
-- Via Convex dashboard Data tab
UPDATE user SET isPlatformStaff = true WHERE email = 'your-email@example.com'
```

### Issue 2: getRealTimeMetrics returns all zeros
**Cause:** No counters exist yet (M1 events haven't been logged)
**Solution:** Create a test voice note to generate M1 events

### Issue 3: aggregateHourlyMetrics returns null immediately
**Cause:** No events in that hour's timeWindow
**Solution:** Normal behavior - try a different hour with events

### Issue 4: getOrgBreakdown shows "Unknown" for all orgs
**Cause:** Batch fetch failed or org IDs invalid
**Solution:** Check Better Auth organization table has valid data

### Issue 5: Crons not visible in dashboard
**Cause:** crons.ts not deployed
**Solution:** Run `npx convex deploy` or check deployment status

### Issue 6: NaN or Infinity in results
**Cause:** Safe division not working
**Solution:** Should not happen - report as bug if seen

---

## Success Criteria Summary

**M2 is verified when:**
- ✅ All functions execute without errors
- ✅ getRealTimeMetrics < 50ms
- ✅ Hourly aggregation < 30s
- ✅ Daily aggregation < 10s
- ✅ All 4 crons run on schedule
- ✅ Snapshots created correctly
- ✅ Org names populated (no "Unknown")
- ✅ No NaN or Infinity values
- ✅ Cleanup works without deleting needed data

**Ready for production when:**
- All above criteria met
- 24+ hours of stable cron execution
- Data quality maintained
- Performance consistent

---

## Next Steps After Verification

### If All Tests Pass ✅
1. Document any findings in progress.txt
2. Mark M2 as production-ready
3. Plan M3 (Retry Operations)
4. Consider deploying to production

### If Issues Found ❌
1. Document issues in feedback.md
2. Create bug tickets with details
3. Prioritize fixes
4. Re-test after fixes

---

**Testing Plan Created:** 2026-02-16
**Estimated Time:** 1 hour initial + 24h monitoring
**Confidence:** Testing plan covers all critical paths

