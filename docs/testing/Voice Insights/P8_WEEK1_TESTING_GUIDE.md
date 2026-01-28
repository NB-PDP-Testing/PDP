# Phase 8 Week 1 Testing Guide - My Impact Dashboard Foundation

**Date**: 2026-01-27
**Branch**: `ralph/coach-parent-summaries-p5-phase2`
**Status**: ✅ Ready for Testing (3 Stories Complete)

---

## What's New in Phase 8 Week 1

This phase creates the foundation for the "My Impact" dashboard, allowing coaches to see comprehensive metrics about their coaching activity and parent engagement.

1. **US-P8-001**: Backend query `getCoachImpactSummary` - Aggregates coach activity across 6 tables
2. **US-P8-003**: "My Impact" tab component structure with date range picker
3. **US-P8-004**: Navigation - adds "My Impact" tab to voice notes dashboard

**Note**: US-P8-002 (trust gate check) was part of Week 1 but was fixed in Week 1.5 - see P8_WEEK1.5_TESTING_GUIDE.md

**Key Features**:
- New "My Impact" tab in voice notes dashboard
- Date range filtering (This Week, This Month, All Time)
- Aggregated metrics from 6 database tables
- Placeholder sections for Week 2 components
- Loading, error, and empty states

---

## Prerequisites

### Test Account

**Coach Account**:
- **Email**: `neil.B@blablablak.com` (or any coach account)
- **Password**: `lien1979`
- **Role**: Coach (functional role "Coach")
- **Access**: `/orgs/{orgId}/coach/voice-notes`

### Required Setup

**1. Verify Coach Role**
- Convex Dashboard → Data → `member` table (via Better Auth adapter)
- Find your membership record for the organization
- Verify: `functionalRoles` includes "coach"

**2. Create Test Data** (for meaningful metrics)

**Voice Notes**:
- Create 5-10 voice notes with insights
- Convex → `voiceNotes` table
- Should have: coachId, organizationId, createdAt

**Parent Summaries**:
- Create some sent summaries
- Convex → `coachParentSummaries` table
- Mix of: viewedAt set (viewed) and not set (unviewed)
- Mix of: acknowledgedAt set (acknowledged) and not set

**Auto-Applied Insights**:
- Create auto-applied skill changes
- Convex → `autoAppliedInsights` table
- With: changeType "skill_rating", previous/newValue

**Date Range Coverage**:
- Ensure data spans multiple weeks for weekly trends
- At least some data in last 7 days, last 30 days, and older

**3. Browser DevTools Open**
- Monitor Network tab for query calls
- Monitor Console for errors

---

## Test Scenario 1: Backend Query Verification (US-P8-001)

**Goal**: Verify `getCoachImpactSummary` query returns correct aggregated data

### Prerequisites
- Convex Dashboard access
- Test data created (voice notes, summaries, insights)

### Step 1: Call Query via Convex Dashboard

**Execute Query**:
1. Convex Dashboard → Functions
2. Find: `models/voiceNotes:getCoachImpactSummary`
3. Args:
```json
{
  "coachId": "<your user _id>",
  "organizationId": "<your org id>",
  "dateRange": {
    "start": 0,
    "end": 9999999999999
  }
}
```
(start: 0 and end: far future = all time)

4. Click "Run query"

**Expected Response Structure**:
```json
{
  "voiceNotesCreated": 8,
  "insightsApplied": 12,
  "insightsDismissed": 3,
  "summariesSent": 15,
  "summariesViewed": 10,
  "summariesAcknowledged": 5,
  "parentViewRate": 66.67,
  "skillChanges": [
    {
      "playerName": "Emma",
      "skill": "Passing",
      "previousValue": 3,
      "newValue": 4,
      "appliedAt": 1706400000000
    }
    // ... more skill changes
  ],
  "injuriesRecorded": [
    {
      "playerName": "Jack",
      "injuryType": "Ankle Sprain",
      "severity": "moderate",
      "recordedAt": 1706400000000
    }
    // ... if any injuries from voice notes
  ],
  "recentSummaries": [
    {
      "id": "...",
      "playerName": "Emma",
      "sentAt": 1706400000000,
      "viewedAt": 1706410000000,
      "acknowledgedAt": null
    }
    // ... up to 10 most recent
  ],
  "teamObservations": [
    {
      "topic": "Team Passing",
      "description": "Passing has improved",
      "createdAt": 1706400000000
    }
    // ... if any team-level insights
  ],
  "parentEngagement": [
    {
      "parentName": "Emma's Mum",
      "playerName": "Emma",
      "summariesSent": 5,
      "summariesViewed": 4,
      "summariesAcknowledged": 2,
      "viewRate": 80.0,
      "acknowledgeRate": 40.0
    }
    // ... per-parent stats
  ],
  "weeklyTrends": [
    {
      "weekStart": 1706400000000,
      "summariesSent": 4,
      "summariesViewed": 3
    }
    // ... last 4 weeks
  ]
}
```

**✅ PASS**: Query returns all fields with correct data
**❌ FAIL**: Missing fields, incorrect counts, or error

---

### Step 2: Verify Aggregation Accuracy

**Manual Verification**:

**Voice Notes Count**:
1. Convex → `voiceNotes` table
2. Filter: `coachId` = your ID, `organizationId` = your org
3. Count manually
4. **VERIFY**: Matches `voiceNotesCreated` in response

**Summaries Sent Count**:
1. Convex → `coachParentSummaries` table
2. Filter: `coachId` = your ID, `organizationId` = your org, `status: "sent"`
3. Count manually
4. **VERIFY**: Matches `summariesSent`

**Summaries Viewed Count**:
1. Same table
2. Filter: records with `viewedAt !== null`
3. Count manually
4. **VERIFY**: Matches `summariesViewed`

**Parent View Rate**:
1. Calculate: (summariesViewed / summariesSent) * 100
2. **VERIFY**: Matches `parentViewRate` (allow ±0.1 for rounding)

**Skill Changes**:
1. Convex → `autoAppliedInsights` table
2. Filter: `coachId` = your ID, `changeType: "skill_rating"`
3. Check `skillChanges` array includes recent changes
4. **VERIFY**: Sorted by most recent first

**✅ PASS**: All counts and calculations match manual verification
**❌ FAIL**: Discrepancies in counts or calculations

---

### Step 3: Test Date Range Filtering

**Test Last Week**:
```json
{
  "coachId": "<your user _id>",
  "organizationId": "<your org id>",
  "dateRange": {
    "start": <Date.now() - 7 days in ms>,
    "end": <Date.now()>
  }
}
```

**EXPECTED**:
- Only counts data from last 7 days
- `voiceNotesCreated` <= "All Time" count
- `weeklyTrends` shows 1 week

**Test Last Month**:
```json
{
  "dateRange": {
    "start": <Date.now() - 30 days>,
    "end": <Date.now()>
  }
}
```

**EXPECTED**:
- Only counts data from last 30 days
- `weeklyTrends` shows 4 weeks

**Test Empty Range** (future dates):
```json
{
  "dateRange": {
    "start": <far future>,
    "end": <even farther future>
  }
}
```

**EXPECTED**:
- All counts return 0
- Arrays return empty []
- No errors

**✅ PASS**: Date filtering works correctly
**❌ FAIL**: Includes data outside range or errors

---

### Step 4: Test Edge Cases

**No Data Coach**:
1. Create a new coach with no voice notes
2. Call query with their coachId
3. **EXPECTED**:
   - All counts: 0
   - All arrays: []
   - `parentViewRate`: 0 (not NaN or error)
   - No crashes

**Invalid Coach ID**:
1. Call query with fake coachId
2. **EXPECTED**:
   - Returns null OR all zeros
   - No crashes

**Invalid Organization ID**:
1. Call query with wrong organizationId
2. **EXPECTED**:
   - Returns data only for that org (likely empty)
   - No data leakage from other orgs

**✅ PASS**: All edge cases handled gracefully
**❌ FAIL**: Errors, NaN values, or crashes

---

### Step 5: Verify Performance

**Check Query Uses Indexes**:
1. Convex Dashboard → Logs
2. Find query execution log
3. **VERIFY**: No "slow query" warnings
4. **VERIFY**: All sub-queries use `.withIndex()`

**Large Dataset Test** (if possible):
1. Create 100+ voice notes for a coach
2. Call query
3. **EXPECTED**:
   - Completes in < 2 seconds
   - No timeout errors

**✅ PASS**: Query performs well
**❌ FAIL**: Slow or times out

---

## Test Scenario 2: My Impact Tab Component (US-P8-003)

**Goal**: Verify "My Impact" tab renders correctly with date range picker and proper states

### Prerequisites
- Logged in as coach
- Test data exists (for populated state)

### Step 1: Access My Impact Tab

1. Navigate to: `/orgs/{orgId}/coach/voice-notes`
2. **EXPECTED**: Dashboard loads with tabs
3. Look for "My Impact" tab
4. **EXPECTED**:
   - Tab visible in navigation
   - Icon: BarChart3 (📊 chart icon)
   - Label: "My Impact"
   - Positioned after "History" tab

**✅ PASS**: Tab visible with correct icon/label
**❌ FAIL**: Tab missing or misplaced

---

### Step 2: Click My Impact Tab

1. Click "My Impact" tab
2. **EXPECTED**:
   - Tab becomes active (highlighted)
   - Component renders below tabs
   - URL updates (if using URL state)
   - No console errors

**✅ PASS**: Tab activates and renders
**❌ FAIL**: Nothing happens or errors

---

### Step 3: Verify Date Range Picker

**Check Dropdown Visible**:
1. Look at top of My Impact tab content
2. **EXPECTED**:
   - Dropdown/select control visible
   - Label: "Date Range" or similar
   - Default selection: "This Month"

**Test Dropdown Options**:
1. Click dropdown
2. **EXPECTED**: 3 options visible:
   - "This Week"
   - "This Month"
   - "All Time"

**Change Selection**:
1. Select "This Week"
2. **EXPECTED**:
   - Dropdown shows "This Week"
   - Component re-fetches data (loading state)
   - Network tab shows new query with updated date range
   - Data refreshes to show only this week's metrics

**Test Persistence**:
1. Select "All Time"
2. Refresh page (F5)
3. Navigate away then back to My Impact tab
4. **EXPECTED**:
   - Selection persists (localStorage)
   - Still shows "All Time" after refresh

**✅ PASS**: Date range picker works and persists
**❌ FAIL**: Options missing or selection doesn't trigger data refresh

---

### Step 4: Verify Loading State

**Trigger Loading**:
1. Clear browser cache
2. Navigate to My Impact tab (or refresh)
3. **EXPECTED** (briefly):
   - Skeleton loaders visible
   - 4 card placeholders
   - Shimmer/pulse animation
   - No error messages

**✅ PASS**: Loading state renders correctly
**❌ FAIL**: Shows error or blank screen

---

### Step 5: Verify Error State

**Simulate Error** (Convex Dashboard):
1. Rename `getCoachImpactSummary` query temporarily
2. Refresh My Impact tab
3. **EXPECTED**:
   - Error message visible
   - User-friendly text: "Failed to load impact data" or similar
   - No raw error stack shown to user
   - Option to retry (if implemented)

**Restore Query**:
1. Rename query back to `getCoachImpactSummary`
2. Refresh page
3. **EXPECTED**: Data loads normally

**✅ PASS**: Error state is user-friendly
**❌ FAIL**: Shows stack trace or crashes page

---

### Step 6: Verify Empty State

**Test with No Data**:
1. Create a new coach with no voice notes
2. Log in as that coach
3. Navigate to My Impact tab
4. **EXPECTED**:
   - Empty state component visible
   - Message: "No activity yet" or similar
   - Icon or illustration (optional)
   - Call-to-action: "Create your first voice note" (optional)

**✅ PASS**: Empty state renders
**❌ FAIL**: Shows errors or broken layout

---

### Step 7: Verify Placeholder Sections

**Check Component Structure**:
1. Open browser DevTools → Elements
2. Inspect My Impact tab content
3. **EXPECTED**: HTML comments for placeholders:
   - `{/* Summary cards - placeholder for US-P8-005 */}`
   - `{/* Sent summaries - placeholder for US-P8-006 */}`
   - `{/* Applied insights - placeholder for US-P8-007 */}`
   - `{/* Team observations - placeholder for US-P8-009 */}`

**OR** if placeholders are visible:
- Empty sections with "Coming soon" or similar text

**✅ PASS**: Placeholders exist for Week 2 work
**❌ FAIL**: Missing structure for future components

---

## Test Scenario 3: Navigation Integration (US-P8-004)

**Goal**: Verify "My Impact" tab appears for coaches only and navigation works correctly

### Prerequisites
- Multiple test accounts (coach, admin, parent, platform staff)

### Step 1: Test Coach Access

1. Log in as coach
2. Navigate to voice notes dashboard
3. **EXPECTED**:
   - "My Impact" tab visible
   - Positioned after "History", before "Settings" icon
   - Clickable

**✅ PASS**: Coach sees tab
**❌ FAIL**: Tab hidden for coach

---

### Step 2: Test Platform Staff Access

1. Log in as platform staff
2. Navigate to coach voice notes dashboard (if accessible)
3. **EXPECTED**: "My Impact" tab visible
4. Click tab
5. **EXPECTED**: Can view any coach's impact data

**✅ PASS**: Platform staff sees tab
**❌ FAIL**: Tab hidden for platform staff

---

### Step 3: Test Non-Coach Roles

**Test as Org Admin** (without coach role):
1. Log in as admin who is NOT a coach
2. Navigate to voice notes (if allowed)
3. **EXPECTED**:
   - "My Impact" tab HIDDEN
   - No BarChart3 icon visible

**Test as Parent**:
1. Log in as parent
2. Navigate to voice notes (if they have access)
3. **EXPECTED**: "My Impact" tab HIDDEN

**✅ PASS**: Tab hidden for non-coaches
**❌ FAIL**: Tab visible to parents/admins

---

### Step 4: Test Tab Order

**Verify Order**:
1. Log in as coach
2. Navigate to voice notes
3. **EXPECTED** tab order:
   1. New
   2. Parents (if pending summaries)
   3. Insights
   4. Team (if pending team insights)
   5. Sent to Parents (if Level 2+)
   6. History
   7. **My Impact** ← NEW
   8. Settings (icon in header)

**✅ PASS**: Tab order correct
**❌ FAIL**: Tab in wrong position

---

### Step 5: Test Navigation State

**Tab Activation**:
1. Click "My Impact" tab
2. **EXPECTED**: Tab highlighted/active
3. Click "History" tab
4. **EXPECTED**: "My Impact" no longer highlighted
5. Click "My Impact" again
6. **EXPECTED**: Re-activates, shows same data

**URL State** (if implemented):
1. Click "My Impact" tab
2. **EXPECTED**: URL changes to `?tab=my-impact` or similar
3. Refresh page
4. **EXPECTED**: "My Impact" tab still active

**✅ PASS**: Navigation state works
**❌ FAIL**: Tab doesn't activate or URL doesn't update

---

## Integration Test: Full Workflow

**Goal**: Test complete flow from data creation to viewing impact metrics

### Step 1: Create Test Data

1. Log in as coach
2. Navigate to "New" tab
3. Create 3 voice notes with different content
4. Wait for AI processing

---

### Step 2: Apply Insights

1. Navigate to "Insights" tab
2. Apply 2-3 insights manually
3. If Level 2+, let some auto-apply

---

### Step 3: Send Parent Summaries

1. Navigate to "Parents" tab
2. Send summaries to 2-3 parents
3. Note the count sent

---

### Step 4: View as Parent (simulate viewed)

1. Log in as parent (use different browser/incognito)
2. View the parent summary
3. **OPTIONAL**: Acknowledge one summary

---

### Step 5: Check My Impact Data

1. Log back in as coach
2. Navigate to "My Impact" tab
3. **VERIFY**:
   - voiceNotesCreated count includes new notes
   - insightsApplied count updated
   - summariesSent count updated
   - summariesViewed count includes parent view
   - summariesAcknowledged count includes acknowledgment (if done)
   - parentViewRate calculated correctly

**Expected Calculations**:
- If sent 3, viewed 2, acknowledged 1:
  - summariesSent: 3
  - summariesViewed: 2
  - summariesAcknowledged: 1
  - parentViewRate: 66.67%

**✅ INTEGRATION PASS**: All data flows correctly from creation to My Impact display
**❌ INTEGRATION FAIL**: Counts don't match or data missing

---

## Expected Behaviors Summary

### Data Aggregation

**Query Aggregates From 6 Tables**:
1. ✅ `voiceNotes` - total created
2. ✅ `voiceNoteInsights` - applied/dismissed counts
3. ✅ `coachParentSummaries` - sent/viewed/acknowledged counts
4. ✅ `autoAppliedInsights` - skill changes, trends
5. ✅ `playerInjuries` - injuries from voice notes
6. ✅ `teamObservations` - team-level insights

**Calculations**:
- `parentViewRate` = (summariesViewed / summariesSent) * 100
- All percentages rounded to 2 decimal places
- Empty data returns 0, not NaN

### UI States

**My Impact Tab**:
- **Loading**: Skeleton with 4 card placeholders
- **Error**: User-friendly message, no stack trace
- **Empty**: "No activity yet" with optional CTA
- **Populated**: Date picker + placeholder sections

**Date Range Picker**:
- Default: "This Month"
- Options: This Week, This Month, All Time
- Persists via localStorage
- Triggers data refresh on change

### Role Access

**Tab Visible To**:
- ✅ Coaches (functional role "coach")
- ✅ Platform staff (`isPlatformStaff: true`)

**Tab Hidden From**:
- ❌ Parents
- ❌ Org admins (without coach role)
- ❌ Members (basic role)

---

## Troubleshooting

### "My Impact" Tab Not Visible

**Symptom**: Tab missing from navigation

**Checks**:
1. Are you logged in as a coach?
   - Convex → `member` table
   - Verify: `functionalRoles` includes "coach"

2. Is tab render conditional correct?
   - Check `voice-notes-dashboard.tsx`
   - Should check: `hasCoachRole || isPlatformStaff`

3. Hard refresh browser (Cmd+Shift+R)

**Fix**:
- If not a coach: Add "coach" to functionalRoles
- If conditional wrong: Update dashboard component
- If still missing: Check console for errors

---

### Query Returns Empty Data

**Symptom**: All counts are 0 despite having data

**Checks**:
1. Correct coachId passed?
   - Open Network tab
   - Inspect query args
   - Verify coachId matches your user ID

2. Correct organizationId?
   - Query only returns data for specified org
   - Verify orgId in args

3. Date range too narrow?
   - Check dateRange.start and dateRange.end
   - Verify data exists in that range

4. Indexes working?
   - Convex logs for slow query warnings
   - Verify all queries use `.withIndex()`

**Fix**:
- If wrong IDs: Check how component passes props
- If date range: Select "All Time" to test
- If no indexes: Add indexes to schema

---

### Date Range Picker Not Persisting

**Symptom**: Selection resets to "This Month" on refresh

**Checks**:
1. localStorage working?
   - DevTools → Application → Local Storage
   - Check for key: `impact-date-range`

2. Browser in incognito mode?
   - localStorage doesn't persist in incognito
   - Use normal browser window

**Fix**:
- If localStorage disabled: Check browser settings
- If key missing: Check component uses localStorage.setItem
- If different key name: Update localStorage key

---

### Loading State Stuck

**Symptom**: Shows skeleton indefinitely, never loads data

**Checks**:
1. Query executing?
   - Convex Dashboard → Logs
   - Should see query calls

2. Query returning data?
   - Check query result in logs
   - Verify not returning undefined

3. Network issues?
   - DevTools → Network
   - Check for failed requests

**Fix**:
- If query not executing: Check query name/path
- If returning undefined: Debug query logic
- If network fails: Check Convex deployment

---

### Parent View Rate Shows NaN

**Symptom**: `parentViewRate` displays "NaN%" or crashes

**Checks**:
1. Division by zero?
   - If summariesSent = 0, calculation fails
   - Should handle: `summariesSent === 0 ? 0 : (viewed/sent) * 100`

2. Data types wrong?
   - Ensure counts are numbers, not strings

**Fix**:
- Add zero-check in query
- Cast values to numbers if needed

---

### Skill Changes Not Showing

**Symptom**: `skillChanges` array is empty despite having auto-applied insights

**Checks**:
1. Auto-applied insights exist?
   - Convex → `autoAppliedInsights`
   - Filter: `changeType: "skill_rating"`

2. Date range includes them?
   - Check `appliedAt` timestamp
   - Verify within selected date range

3. Query limiting results?
   - Check if query limits to last N changes
   - Verify limit is reasonable (e.g., 20)

**Fix**:
- If no data: Create auto-applied insights
- If date range: Select "All Time"
- If limit too low: Increase in query

---

## Success Criteria Summary

**Phase 8 Week 1 is COMPLETE when**:

### US-P8-001: Backend Query
- ✅ Query exists: `models/voiceNotes:getCoachImpactSummary`
- ✅ Accepts: coachId, organizationId, dateRange
- ✅ Returns: 13 fields (counts, arrays, metrics)
- ✅ Aggregates from 6 tables correctly
- ✅ Date range filtering works
- ✅ Uses indexes (no .filter())
- ✅ Edge cases handled (no data, invalid IDs)
- ✅ parentViewRate calculated correctly

### US-P8-003: My Impact Tab Component
- ✅ Component exists: `my-impact-tab.tsx`
- ✅ Renders with correct structure
- ✅ Date range picker works (3 options)
- ✅ Selection persists (localStorage)
- ✅ Loading state: Skeleton with placeholders
- ✅ Error state: User-friendly message
- ✅ Empty state: "No activity yet"
- ✅ Placeholder sections for Week 2

### US-P8-004: Navigation Integration
- ✅ "My Impact" tab visible to coaches
- ✅ Tab visible to platform staff
- ✅ Tab hidden from non-coaches (parents, admins)
- ✅ BarChart3 icon displays
- ✅ Tab positioned after "History"
- ✅ Clicking tab renders MyImpactTab
- ✅ Tab activation state works
- ✅ No console errors

### Integration
- ✅ Full workflow: Create data → view metrics
- ✅ Counts update in real-time
- ✅ Date range affects all metrics
- ✅ Parent view/acknowledge reflected
- ✅ All calculations accurate

---

## Test Coverage Checklist

**Before marking P8 Week 1 complete**:

### Backend Query (US-P8-001)
- [ ] Query returns all 13 fields
- [ ] voiceNotesCreated count accurate
- [ ] summariesSent/Viewed/Acknowledged counts accurate
- [ ] parentViewRate calculated correctly (no NaN)
- [ ] skillChanges array populated
- [ ] recentSummaries limited to 10
- [ ] parentEngagement stats per-parent
- [ ] weeklyTrends shows 4 weeks
- [ ] Date range filtering works (week, month, all)
- [ ] No data returns zeros/empty arrays
- [ ] Invalid IDs handled gracefully
- [ ] Performance good (uses indexes)

### Component Structure (US-P8-003)
- [ ] Component renders without errors
- [ ] Date range picker displays
- [ ] 3 options: This Week, This Month, All Time
- [ ] Selection triggers data refresh
- [ ] Selection persists via localStorage
- [ ] Loading state: Skeleton visible
- [ ] Error state: User-friendly message
- [ ] Empty state: "No activity yet"
- [ ] Placeholder sections visible/documented

### Navigation (US-P8-004)
- [ ] Tab visible to coaches
- [ ] Tab visible to platform staff
- [ ] Tab hidden from parents
- [ ] Tab hidden from non-coach admins
- [ ] BarChart3 icon displays
- [ ] Tab after "History"
- [ ] Clicking activates tab
- [ ] Navigation state works
- [ ] No console errors

### Integration
- [ ] Create voice note → count updates
- [ ] Apply insight → count updates
- [ ] Send summary → count updates
- [ ] Parent views → viewRate updates
- [ ] Date range affects all metrics
- [ ] All calculations accurate

---

**Testing Duration Estimate**: 1.5-2 hours for full coverage

**Quick Smoke Test**: 20 minutes (Access tab + Date picker + Basic counts)

**Critical Path**: Backend query accuracy + Tab visibility + Date range filtering

---

## Notes for Future Testing

### Week 2 Components (Not Yet Implemented)
- Summary cards (US-P8-005)
- Sent summaries section (US-P8-006)
- Applied insights section (US-P8-007)
- Search functionality (US-P8-008)
- Team observations (US-P8-009)
- Parent engagement metrics (US-P8-010)
- Filters (US-P8-011)

### Known Limitations
- No visual components yet (just placeholders)
- No search/filter functionality
- No detailed breakdowns (coming in Week 2)

### Related Features
- Trust levels (Phase 5-7)
- Parent summaries (Phase 5)
- Auto-applied insights (Phase 7)
- Voice notes AI (Phase 4-7)

---

**Last Updated**: 2026-01-27
**Foundation Complete**: ✅ Ready for Week 2 components
