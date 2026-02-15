# Phase 3.1 Manual Testing Guide: Confidence Indicators, Partial Undo & Analytics

**Testing Date**: _________________
**Tester**: _____________________
**Branch**: `ralph/phase-3.1-advanced-features` or `main`
**Environment**: Dev (localhost:3000)

---

## Overview

This guide provides step-by-step manual testing procedures for Phase 3.1: Confidence Indicators, Partial Undo & Analytics. Complete each test section and mark results.

**Phase 3.1 Features**:
- ✅ **Feature 1**: Confidence Indicators for Guardian Matching (US-P3.1-001 to 004)
- ✅ **Feature 2**: Partial Undo with Search & Filter (US-P3.1-005 to 008)
- ✅ **Feature 3**: Import Analytics Dashboard (US-P3.1-009 to 012)

**Test Duration**: ~45-60 minutes
**Prerequisites**:
- Dev server running on `localhost:3000`
- **Platform staff account** (for analytics testing)
- **Org admin account** (for import testing)
- Sample CSV files with duplicate guardian data (see [Test Data](#test-data) section)

---

## Testing Status (Updated 2026-02-15)

### Fixes Applied During Testing Session

✅ **Import History Stats Persistence** (Fixed)
- Issue: Import history showed 0 players and disabled buttons
- Fix: Added `recordSessionStats` mutation call to persist stats after import completes
- Status: Import history now displays correct player counts and button states work properly

✅ **History Page Filtering** (Fixed)
- Issue: Incomplete/in-progress imports were showing in history
- Fix: Filtered history query to only show completed/failed/cancelled/undone sessions
- Status: Discard button behavior now correct - incomplete imports hidden from view

✅ **Test Data for Confidence Testing** (Improved)
- Issue: Single CSV file couldn't test varied confidence levels (duplicate detection checks EXISTING guardians in DB)
- Fix: Created 2-step testing approach with separate files:
  - `step1-base-guardians.csv` - Creates guardians with specific patterns
  - `step2-duplicate-test.csv` - Matches those guardians with HIGH/MEDIUM/LOW confidence
- Documentation: `docs/testing/import/test-data/README-CONFIDENCE-TESTING.md`
- Status: Confidence testing now properly demonstrates all three confidence levels in one session

✅ **Database Cleanup** (Implemented)
- Cleared 11 test guardians, 88 players, 88 enrollments, 18 guardian-player links
- Clean database state for fresh UAT testing

### Known Issues

⚠️ **Placeholder Buttons in Import History**
- "Details" button uses console.log (Biome linter blocks alert())
- Needs proper implementation to show import details modal/page

### Ready for Testing

The following features are ready for manual UAT:
1. ✅ Confidence indicators with proper test data (2-step approach)
2. ✅ Import history with correct stats and filtering
3. ⏳ Partial undo functionality (needs testing)
4. ⏳ Analytics dashboard (needs testing with platform staff account)

---

## Test Data Preparation

### Test Accounts Required

1. **Platform Staff Account**:
   - Email: `neil.B@blablablak.com`
   - Password: `lien1979`
   - Purpose: Testing analytics dashboard

2. **Org Admin Account**:
   - Use any organization admin account
   - Purpose: Testing import and partial undo

### Sample CSV Files

**IMPORTANT**: Confidence level testing requires a **2-step import process** because duplicate detection checks uploaded players against EXISTING guardians in the database, NOT within the same CSV file.

See `docs/testing/import/test-data/README-CONFIDENCE-TESTING.md` for complete instructions.

#### 1. **step1-base-guardians.csv** (Create base guardians FIRST)

Located at: `docs/testing/import/test-data/step1-base-guardians.csv`

This file creates 4 guardians with specific data patterns for confidence testing:

```csv
First Name,Last Name,Date of Birth,Gender,Parent Email,Parent Phone,Parent First Name,Parent Last Name,Parent Address
TestPlayer1,Walsh,2015-01-10,Male,guardian.full@test.com,0871111111,Guardian,Full,10 Test Street Dublin
TestPlayer2,Murphy,2015-02-15,Female,guardian.emailname@test.com,,,Guardian,EmailName,
TestPlayer3,Ryan,2015-03-20,Male,,0872222222,Guardian,PhoneOnly,
TestPlayer4,McCarthy,2015-04-25,Female,guardian.emailonly@test.com,,,Different,Name,
```

**Instructions**:
1. Upload this file first
2. Complete the full import wizard
3. Verify 4 players imported successfully

#### 2. **step2-duplicate-test.csv** (Test duplicate confidence SECOND)

Located at: `docs/testing/import/test-data/step2-duplicate-test.csv`

This file will match against the guardians created in Step 1:

```csv
First Name,Last Name,Date of Birth,Gender,Parent Email,Parent Phone,Parent First Name,Parent Last Name,Parent Address
DupTest1,FullMatch,2015-05-10,Male,guardian.full@test.com,0871111111,Guardian,Full,10 Test Street Dublin
DupTest2,EmailNameMatch,2015-06-15,Female,guardian.emailname@test.com,,,Guardian,EmailName,
DupTest3,PhoneMatch,2015-07-20,Male,,0872222222,Guardian,PhoneOnly,
DupTest4,EmailDiffName,2015-08-25,Female,guardian.emailonly@test.com,,,Different,Name,
```

**Expected Duplicate Patterns**:
- **DupTest1 FullMatch**: HIGH confidence (100%) - Email + Phone + Name + Address all match
- **DupTest2 EmailNameMatch**: HIGH confidence (60%) - Email + Name match
- **DupTest3 PhoneMatch**: LOW confidence (30%) - Phone only
- **DupTest4 EmailDiffName**: MEDIUM confidence (40%) - Email only, different name

#### 3. **clean-players.csv** (For partial undo testing)

Located at: `docs/testing/import/test-data/` (create if not exists)

This file has no duplicate guardians - used for testing partial undo functionality:

```csv
First Name,Last Name,Date of Birth,Gender,Parent Email,Parent Phone
Ava,Byrne,2015-04-22,Female,ava.parent@example.com,0867778899
Sean,O'Brien,2014-10-15,Male,sean.parent@example.com,0850001122
Ella,Donnelly,2015-01-28,Female,ella.parent@example.com,0873334455
Ryan,Kavanagh,2014-07-08,Male,ryan.parent@example.com,0866667788
Grace,Lynch,2015-08-11,Female,grace.parent@example.com,0859991122
Dylan,Murray,2014-03-19,Male,dylan.parent@example.com,0872223344
Lucy,Quinn,2015-11-03,Female,lucy.parent@example.com,0865556677
Adam,Dunne,2014-09-27,Male,adam.parent@example.com,0858889900
Kate,Nolan,2015-05-16,Female,kate.parent@example.com,0871234321
James,Kennedy,2014-06-14,Male,james.parent@example.com,0864567890
```

**Instructions**:
1. Upload this file for testing partial undo features
2. Complete import wizard normally (no duplicates will be detected)
3. Use for testing selective player removal (Tests 3.1.5.x through 3.1.8.x)

---

## FEATURE 1: Confidence Indicators

### US-P3.1-001 & 002: Confidence Score Display & Color-Coded Indicators

**Goal**: Verify confidence scores are calculated and displayed with color coding

#### Test 3.1.1.1: High Confidence Match (Green Badge)

**Setup** (2-Step Process):

**STEP 1: Create Base Guardians**
1. Log in as org admin
2. Navigate to `/orgs/[orgId]/import`
3. Upload `step1-base-guardians.csv`
4. Complete mapping step (map ALL guardian columns)
5. Complete selection step (select all 4 players)
6. Complete import wizard - verify 4 players imported successfully

**STEP 2: Test Duplicate Confidence**
1. Navigate back to `/orgs/[orgId]/import`
2. Upload `step2-duplicate-test.csv`
3. Complete mapping step (map ALL guardian columns):
   - Parent Email → parentEmail
   - Parent Phone → parentPhone
   - **Parent First Name** → parentFirstName
   - **Parent Last Name** → parentLastName
   - Parent Address → parentAddress
4. Complete selection step (select all 4 players)

**Steps**:
1. On Review step, you should see **4 duplicate players detected**
2. Locate the duplicate for **DupTest1 FullMatch** (matching Guardian Full)
3. Observe the confidence indicator at top of duplicate card

**Expected Results**:
- [ ] **Green badge** displays with text **"High Confidence"**
- [ ] Badge shows checkmark icon (✓)
- [ ] Confidence score shows **100%** (all signals match)
- [ ] Progress bar below badge is **green**
- [ ] Badge is clearly visible and prominent at top of card

**Note**: There's also a second HIGH confidence match in this test: **DupTest2 EmailNameMatch** (60% - email + name match). You can verify both show green badges.

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.1.2: Medium Confidence Match (Yellow Badge)

**Steps**:
1. On same Review step, locate duplicate for **DupTest4 EmailDiffName** (matching Different Name)
2. Observe the confidence indicator

**Expected Results**:
- [ ] **Yellow/amber badge** displays with text **"Review Required"**
- [ ] Badge shows alert/warning icon (⚠)
- [ ] Confidence score shows **40%** (email only, no name match)
- [ ] Progress bar below badge is **yellow**
- [ ] Badge color contrasts clearly with green/red badges

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.1.3: Low Confidence Match (Red Badge)

**Steps**:
1. On same Review step, locate duplicate for **DupTest3 PhoneMatch** (matching Guardian PhoneOnly)
2. Observe the confidence indicator

**Expected Results**:
- [ ] **Red badge** displays with text **"Low Confidence"**
- [ ] Badge shows X icon (✗)
- [ ] Confidence score shows **30%** (phone only, no other signals)
- [ ] Progress bar below badge is **red**
- [ ] Badge clearly indicates manual review needed

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

### US-P3.1-003: Match Score Breakdown

**Goal**: Verify detailed breakdown of confidence calculation

#### Test 3.1.3.1: Expandable Match Details Section

**Steps**:
1. On Review step, find any duplicate guardian card
2. Look for **"Match Details"** or **"View Breakdown"** section/button
3. Click to expand the details

**Expected Results**:
- [ ] Match Details section expands (uses Collapsible component)
- [ ] Shows breakdown of contributing signals:
  - [ ] **Email match**: ✓ or ✗ with weight **(40%)**
  - [ ] **Phone match**: ✓ or ✗ with weight **(30%)**
  - [ ] **Name similarity**: Percentage score with weight **(20%)**
  - [ ] **Address match**: ✓ or ✗ with weight **(10%)**
- [ ] Calculated confidence score formula displayed or explained
- [ ] Section is touch-friendly and works on mobile (375px)
- [ ] Can collapse the section again

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.3.2: Verify Weighted Calculation

**Steps**:
1. Find duplicate **DupTest4 EmailDiffName** (email match only)
2. Expand Match Details
3. Verify calculation logic

**Expected Results**:
- [ ] Email match shows ✓ contributing **40%**
- [ ] Phone match shows ✗ (0%)
- [ ] Name similarity shows low percentage (0-10%)
- [ ] Address match shows ✗ (0%)
- [ ] Total confidence score = **40%** (email only)
- [ ] Calculation breakdown clearly explains how 40% was reached

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

### US-P3.1-004: Admin Override Controls

**Goal**: Verify admin can override confidence-based decisions

#### Test 3.1.4.1: Force Link Low Confidence Match

**Steps**:
1. Find a **low confidence match** (<40) on Review step
2. Look for **"Force Link"** button on the duplicate card
3. Verify button is visible (admin/owner role only)
4. Click **"Force Link"**
5. Observe the result

**Expected Results**:
- [ ] "Force Link" button appears on low confidence matches
- [ ] Button is disabled or hidden for non-admin users
- [ ] Clicking "Force Link" shows confirmation dialog or applies immediately
- [ ] Override badge appears: **"Admin Override: Force Linked"**
- [ ] Guardian is marked for linking despite low confidence
- [ ] Override is saved (check database has adminOverrides record)

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.4.2: Reject Link High Confidence Match

**Steps**:
1. Find a **high confidence match** (60+) on Review step
2. Look for **"Reject Link"** button
3. Click **"Reject Link"**
4. Observe the result

**Expected Results**:
- [ ] "Reject Link" button appears on high confidence matches
- [ ] Clicking shows confirmation (optional reason text field)
- [ ] Override badge appears: **"Admin Override: Rejected"**
- [ ] Guardian is marked as NOT linked despite high confidence
- [ ] Override is logged in database with timestamp and user ID

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.4.3: Verify Admin Override Audit Trail

**Steps**:
1. After creating overrides in previous tests
2. Open browser DevTools → Network tab
3. Check database or API responses for adminOverrides records

**Expected Results**:
- [ ] adminOverrides table contains entries for overrides
- [ ] Each override includes:
  - [ ] importSessionId
  - [ ] playerId
  - [ ] guardianId
  - [ ] action ('force_link' or 'reject_link')
  - [ ] overriddenBy (user ID)
  - [ ] timestamp
  - [ ] originalConfidenceScore (optional)
  - [ ] reason (if provided)

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

## FEATURE 2: Partial Undo

### US-P3.1-005: Selective Player Removal Dialog

**Goal**: Verify UI for selecting specific players to remove

#### Test 3.1.5.1: Open Partial Undo Dialog

**Setup**:
1. Complete an import using `clean-players.csv`
2. Verify import completes successfully (10 players imported)
3. Remain on Import Complete step

**Steps**:
1. Look for **"Remove Players"** or **"Partial Undo"** button on Complete step
2. Click the button
3. Observe the dialog that opens

**Expected Results**:
- [ ] Partial Undo Dialog opens (AlertDialog component)
- [ ] Dialog displays list of **all players** from this import (10 players)
- [ ] Each player row shows:
  - [ ] Checkbox (unchecked by default)
  - [ ] Player name (First + Last)
  - [ ] Date of birth
  - [ ] Enrollment status
  - [ ] Related records count (enrollments, passports, etc.)
- [ ] **"Select All"** checkbox at top of list
- [ ] Selected count badge: **"0 players selected"** initially
- [ ] **"Remove"** button is **disabled** (no selection)
- [ ] Dialog is scrollable on mobile (375px width)

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.5.2: Select and Deselect Players

**Steps**:
1. In Partial Undo Dialog, check **3 individual player checkboxes**
2. Observe selected count badge
3. Click **"Select All"** checkbox
4. Click **"Select All"** again to deselect
5. Select 2 players manually

**Expected Results**:
- [ ] Selected count updates dynamically: **"3 players selected"**
- [ ] Checkboxes are touch-friendly (44x44px minimum)
- [ ] "Select All" selects **all 10 players**
- [ ] Selected count shows **"10 players selected"**
- [ ] "Select All" again deselects all (count returns to 0)
- [ ] Manual selection updates count correctly
- [ ] **"Remove" button becomes enabled** when players selected

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

### US-P3.1-006: Search and Filter for Player Selection

**Goal**: Verify search and filter functionality in partial undo

#### Test 3.1.6.1: Search by Player Name

**Steps**:
1. In Partial Undo Dialog, locate **search input** at top
2. Type **"Sean"** in search box
3. Observe filtered results
4. Clear search and type **"o'br"**
5. Verify case-insensitive search

**Expected Results**:
- [ ] Search input appears at top of player list
- [ ] Typing **"Sean"** filters list to show only **Sean O'Brien**
- [ ] Result count shows: **"Showing 1 of 10 players"**
- [ ] Typing **"o'br"** (case-insensitive) shows **Sean O'Brien**
- [ ] Search is debounced (300ms - doesn't trigger on every keystroke)
- [ ] Clearing search shows all players again

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.6.2: Filter by Enrollment Status

**Steps**:
1. In Partial Undo Dialog, locate **status filter dropdown**
2. Select **"Active"** from dropdown
3. Observe filtered results
4. Select **"All"** to reset

**Expected Results**:
- [ ] Status filter dropdown appears (Select component)
- [ ] Options include: **"All Players"**, **"Active"**, **"Inactive"**
- [ ] Selecting "Active" filters to active enrollments only
- [ ] Result count updates accordingly
- [ ] Selecting "All" shows all players again
- [ ] Filter works together with search (AND logic)

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.6.3: Combined Search + Filter

**Steps**:
1. Type **"Ryan"** in search
2. Select **"Active"** from status filter
3. Verify results show players matching BOTH criteria

**Expected Results**:
- [ ] Search and filters work together (AND logic)
- [ ] Result count shows filtered + searched count
- [ ] Display shows: **"Showing X of Y players"**
- [ ] Clearing search keeps filter active
- [ ] Resetting filter keeps search active

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

### US-P3.1-007: Impact Preview Before Removal

**Goal**: Verify cascading deletion preview

#### Test 3.1.7.1: Preview Deletion Impact

**Steps**:
1. In Partial Undo Dialog, select **3 players**
2. Scroll down to **"Preview Impact"** section
3. Observe the impact summary

**Expected Results**:
- [ ] "Preview Impact" section appears below player list
- [ ] Shows cascading deletions for selected players:
  - [ ] **Player enrollments**: X records
  - [ ] **Guardian links**: X records
  - [ ] **Sport passports**: X records
  - [ ] **Team assignments**: X records
  - [ ] **Skill assessments**: X records
- [ ] Impact updates dynamically as selection changes
- [ ] Uses Alert component from shadcn/ui for warnings

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.7.2: Orphaned Guardian Warning

**Steps**:
1. Select players whose guardians will become orphaned
2. Observe warning badge in Preview Impact section

**Expected Results**:
- [ ] Warning badge displays if guardians will be orphaned
- [ ] Warning text: **"Warning: X guardians will have no linked players"**
- [ ] Warning is color-coded (amber/red Alert component)
- [ ] Warning prevents accidental data loss

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

### US-P3.1-008: Atomic Removal Transaction

**Goal**: Verify players and related data are removed atomically

#### Test 3.1.8.1: Execute Partial Removal

**Steps**:
1. In Partial Undo Dialog, select **3 players** (e.g., Ava, Sean, Ella)
2. Review impact preview
3. Click **"Remove Selected Players"** button
4. Confirm action (if confirmation dialog appears)
5. Wait for removal to complete

**Expected Results**:
- [ ] Confirmation dialog shows impact summary before proceeding
- [ ] Loading state displays during removal
- [ ] Success message appears after removal
- [ ] Dialog closes automatically or shows success state
- [ ] Returns to Import Complete step or refreshes

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.8.2: Verify Data Consistency After Removal

**Steps**:
1. After removal completes, navigate to Players page
2. Verify removed players are NO LONGER in the list
3. Check import session stats updated correctly
4. Verify related data was removed

**Expected Results**:
- [ ] Removed players (Ava, Sean, Ella) do NOT appear in players list
- [ ] Remaining players (Ryan, Grace, Dylan, Lucy, Adam, Kate, James) still exist
- [ ] Import session stats decreased by correct amounts
- [ ] No orphaned enrollments or passports remain
- [ ] Database remains consistent (no broken references)

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.8.3: Error Handling on Removal Failure

**Steps**:
1. (If possible) Simulate database error during removal
2. Verify rollback behavior

**Expected Results**:
- [ ] If removal fails, transaction rolls back (Convex atomic mutation)
- [ ] Error message displays to user
- [ ] No partial deletions occur
- [ ] Database remains in consistent state

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

## FEATURE 3: Import Analytics Dashboard

### US-P3.1-009 & 010: Platform Staff Analytics Backend & Dashboard

**Goal**: Verify analytics dashboard for platform staff

#### Test 3.1.10.1: Access Analytics Dashboard (Platform Staff)

**Setup**:
1. Log out from org admin account
2. Log in as **platform staff** (`neil.B@blablablak.com` / `lien1979`)

**Steps**:
1. Navigate to `/platform/analytics/import`
2. Observe the dashboard loads

**Expected Results**:
- [ ] Dashboard loads successfully (no redirect)
- [ ] Platform staff can access the page
- [ ] Page displays analytics metrics

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.10.2: Access Control (Non-Platform Staff Redirect)

**Steps**:
1. Log out from platform staff account
2. Log in as regular org admin
3. Try to navigate to `/platform/analytics/import`

**Expected Results**:
- [ ] Non-platform-staff user is **redirected** to `/orgs/[orgId]/dashboard`
- [ ] Or shows "Access Denied" message
- [ ] Platform analytics NOT accessible to regular users

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.10.3: Dashboard Metrics Display

**Steps** (as platform staff):
1. On `/platform/analytics/import` dashboard
2. Observe the key metrics cards at top

**Expected Results**:
- [ ] **4 metric cards** display at top in grid layout:
  - [ ] **Total Imports** with trend arrow (↑ or ↓)
  - [ ] **Success Rate** (percentage with colored badge):
    - [ ] Green badge if >90%
    - [ ] Yellow badge if 70-89%
    - [ ] Red badge if <70%
  - [ ] **Total Players Imported** with breakdown by time period
  - [ ] **Average Import Size** (players per import)
- [ ] Metrics use Card component from shadcn/ui
- [ ] Cards are responsive (stack vertically on mobile)

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.10.4: Time Period Selector

**Steps**:
1. Locate **time period selector** dropdown
2. Select **"Last 7 Days"**
3. Observe metrics update
4. Try other periods: **"Last 30 Days"**, **"Last 90 Days"**, **"All Time"**

**Expected Results**:
- [ ] Time period selector appears (Select component)
- [ ] Options: **Last 7 Days | Last 30 Days | Last 90 Days | All Time**
- [ ] Selecting a period updates all metrics on page
- [ ] Loading state displays during data fetch
- [ ] Metrics reflect selected time range accurately

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.10.5: Import Activity Chart

**Steps**:
1. Scroll to **Import Activity Chart** section
2. Observe the line chart visualization

**Expected Results**:
- [ ] Line chart displays showing imports over time
- [ ] Uses recharts library for visualization
- [ ] Chart has:
  - [ ] X-axis: Date/time labels
  - [ ] Y-axis: Number of imports
  - [ ] Grid lines for readability
  - [ ] Tooltip on hover showing exact values
- [ ] Chart is responsive (scrolls horizontally on mobile if needed)

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

### US-P3.1-012: Common Error Patterns Display

**Goal**: Verify error pattern analysis

#### Test 3.1.12.1: Common Errors Table

**Steps**:
1. On platform analytics dashboard, scroll to **"Common Errors"** section
2. Observe the errors table

**Expected Results**:
- [ ] Common Errors section displays below charts
- [ ] Table shows (Table component from shadcn/ui):
  - [ ] **Error message** (truncated with tooltip for full message)
  - [ ] **Occurrences** (count)
  - [ ] **Affected Orgs** (count of unique organizations)
  - [ ] **Percentage** of total errors
  - [ ] **Trend** (↑↓ compared to previous period)
- [ ] Sorted by occurrences descending (most common first)
- [ ] Shows top 10 errors by default
- [ ] **"Show More"** button to expand beyond top 10

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.12.2: Error Severity Color Coding

**Steps**:
1. In Common Errors table, observe color coding
2. Verify critical errors vs warnings

**Expected Results**:
- [ ] Critical errors highlighted in **red**
- [ ] Warnings highlighted in **yellow**
- [ ] Clear visual distinction between severity levels

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.12.3: Export Errors to CSV

**Steps**:
1. In Common Errors section, locate **"Export CSV"** button
2. Click the button
3. Verify CSV download

**Expected Results**:
- [ ] "Export CSV" button appears
- [ ] Clicking triggers browser download
- [ ] CSV file downloads with name like `import-errors-YYYY-MM-DD.csv`
- [ ] CSV contains all error data (not just visible rows)
- [ ] CSV format: Error Message, Occurrences, Affected Orgs, Percentage

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

### US-P3.1-011: Org-Level Import History

**Goal**: Verify org admins can view their import history

#### Test 3.1.11.1: Access Import History (Org Admin)

**Setup**:
1. Log out from platform staff account
2. Log in as **org admin**

**Steps**:
1. Navigate to `/orgs/[orgId]/import/history`
2. Observe the import history page loads

**Expected Results**:
- [ ] Import history page loads successfully
- [ ] Org admin can access their own org's history
- [ ] Page displays table of imports

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.11.2: Import History Table Display

**Steps**:
1. On import history page, observe the table contents
2. Verify table columns and data

**Expected Results**:
- [ ] Table displays all imports for this organization
- [ ] Columns include:
  - [ ] **Date/time** of import
  - [ ] **Imported by** (user name)
  - [ ] **Players imported** (count)
  - [ ] **Status** (Success | Partial | Failed)
  - [ ] **Template used** (if any)
  - [ ] **Actions** column with buttons:
    - [ ] "View Details"
    - [ ] "Undo" (or "Remove Players")
- [ ] Table uses Table component from shadcn/ui
- [ ] Sorted by date descending (most recent first)

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.11.3: Status Badge Color Coding

**Steps**:
1. In import history table, observe status badges
2. Verify color coding

**Expected Results**:
- [ ] **Success** status: Green badge
- [ ] **Partial** status: Yellow badge
- [ ] **Failed** status: Red badge
- [ ] Badges clearly distinguish import outcomes

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.11.4: Pagination

**Steps**:
1. If more than 20 imports exist, observe pagination
2. Click **"Next"** or page number
3. Verify pagination works

**Expected Results**:
- [ ] Shows 20 imports per page
- [ ] Pagination component appears at bottom (shadcn/ui Pagination)
- [ ] Page navigation works correctly
- [ ] Current page is highlighted

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.11.5: Filter by Status

**Steps**:
1. Locate **status filter** dropdown
2. Select **"Success"** filter
3. Verify only successful imports display
4. Try other filters: **"Partial"**, **"Failed"**, **"All"**

**Expected Results**:
- [ ] Status filter dropdown appears
- [ ] Options: **All | Success | Partial | Failed**
- [ ] Filtering updates table results
- [ ] Pagination resets to page 1 after filter change

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.11.6: Filter by Date Range

**Steps**:
1. Locate **date range filter**
2. Select **"Last 7 Days"**
3. Verify imports from last 7 days only
4. Try **"Last 30 Days"**, **"Custom Range"**

**Expected Results**:
- [ ] Date range filter appears
- [ ] Options: **Last 7 Days | Last 30 Days | Custom Range**
- [ ] Filtering works correctly
- [ ] Custom range shows date picker (if implemented)

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

#### Test 3.1.11.7: Mobile Responsive Table

**Steps**:
1. Resize browser to mobile width (375px) or use DevTools device emulation
2. Verify table layout on mobile

**Expected Results**:
- [ ] Table scrolls horizontally on mobile if needed
- [ ] OR table converts to card view on <640px
- [ ] All data remains accessible on mobile
- [ ] Touch-friendly buttons and controls

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

## Mobile Responsiveness Tests

### Test 3.1.M.1: Confidence Indicators Mobile (375px)

**Steps**:
1. Resize browser to 375px width (iPhone SE)
2. Navigate through import wizard to Review step with duplicates
3. Observe confidence badges on mobile

**Expected Results**:
- [ ] Confidence badges remain visible and readable at 375px
- [ ] Badge text doesn't truncate or overlap
- [ ] Progress bar stays full width
- [ ] Match Details section stacks vertically
- [ ] Touch-friendly expand/collapse controls

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 3.1.M.2: Partial Undo Dialog Mobile (375px)

**Steps**:
1. At 375px width, open Partial Undo Dialog
2. Verify all controls are accessible

**Expected Results**:
- [ ] Player list is scrollable
- [ ] Checkboxes are touch-friendly (44x44px)
- [ ] Search and filter inputs stack vertically
- [ ] Impact preview is readable
- [ ] Remove button is reachable without scrolling

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 3.1.M.3: Analytics Dashboard Mobile (375px)

**Steps**:
1. At 375px width, view platform analytics dashboard
2. Verify responsive layout

**Expected Results**:
- [ ] Metric cards stack vertically (1 column)
- [ ] Charts scroll horizontally if needed
- [ ] Time period selector is accessible
- [ ] Error table becomes accordion or cards view
- [ ] All controls are touch-friendly

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

## Performance Tests

### Test 3.1.P.1: Large Import with Duplicates

**Steps**:
1. Create CSV with 50+ players including 10+ duplicate guardians
2. Import the file
3. Observe confidence indicator performance on Review step

**Expected Results**:
- [ ] Review step loads without performance issues
- [ ] Confidence scores calculated for all duplicates
- [ ] No UI lag when scrolling through duplicates
- [ ] Match Details expand/collapse is smooth

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 3.1.P.2: Partial Undo with 50+ Players

**Steps**:
1. Complete import with 50+ players
2. Open Partial Undo Dialog
3. Test search/filter performance

**Expected Results**:
- [ ] Dialog loads quickly with 50+ players
- [ ] Search is debounced and responsive
- [ ] Filtering doesn't cause lag
- [ ] Impact preview updates smoothly

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

## Integration Tests

### Test 3.1.I.1: End-to-End Import with Confidence Override

**Steps**:
1. Upload `duplicate-guardians.csv`
2. Complete mapping and selection
3. On Review step:
   - Force link 1 low confidence match
   - Reject link 1 high confidence match
4. Complete import
5. Verify overrides were applied

**Expected Results**:
- [ ] Import completes successfully
- [ ] Low confidence match was linked (override applied)
- [ ] High confidence match was NOT linked (override applied)
- [ ] adminOverrides records created in database
- [ ] Import stats reflect correct guardian counts

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 3.1.I.2: Import → Partial Undo → History Verification

**Steps**:
1. Complete an import with 10 players
2. Use Partial Undo to remove 3 players
3. Navigate to Import History page
4. Verify import shows in history with correct stats

**Expected Results**:
- [ ] Import appears in history table
- [ ] Player count shows 7 (10 imported - 3 removed)
- [ ] Status shows "Success" or "Partial"
- [ ] Can click "Remove Players" again from history

**Actual Results**: _______________________________________________

**Status**: [ ] PASS [ ] FAIL

---

## Summary & Sign-off

### Test Results Summary

| Feature | Tests Passed | Tests Failed | Total Tests |
|---------|--------------|--------------|-------------|
| Confidence Indicators | ___ | ___ | 7 |
| Partial Undo | ___ | ___ | 10 |
| Analytics Dashboard | ___ | ___ | 14 |
| Mobile Responsiveness | ___ | ___ | 3 |
| Performance | ___ | ___ | 2 |
| Integration | ___ | ___ | 2 |
| **TOTAL** | ___ | ___ | **38** |

### Critical Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Non-Critical Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Overall Assessment

- [ ] **PASS** - All critical features working, ready for production
- [ ] **PASS WITH MINOR ISSUES** - Ready for production with known limitations
- [ ] **FAIL** - Critical issues found, needs fixes before production

### Tester Sign-off

**Name**: _____________________
**Date**: _____________________
**Signature**: _____________________

### Notes

_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
