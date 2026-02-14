# Phase 2 Manual Testing Guide: Enhanced UX & Data Quality

**Testing Date**: _________________
**Tester**: _____________________
**Branch**: `ralph/phase-2.4-granular-undo` or `main`
**Environment**: Dev (localhost:3000)

---

## Overview

This guide provides step-by-step manual testing procedures for all Phase 2 import features (2.1-2.4 complete, 2.5 partial). Complete each test section and mark results.

**Phase 2 Features**:
- ✅ Phase 2.1: Data Quality Scoring
- ✅ Phase 2.2: Import Simulation (Dry Run)
- ✅ Phase 2.3: Save & Resume
- ✅ Phase 2.4: Granular Undo
- ⚠️ Phase 2.5: What's Next Workflow (progress animations basic)

**Test Duration**: ~45-60 minutes
**Prerequisites**:
- Dev server running on `localhost:3000`
- Test account with admin role
- Sample CSV file with player data (see [Test Data](#test-data) section)

---

## Test Data Preparation

### Sample CSV Files

Create these 3 test files before starting:

#### 1. **clean-data.csv** (High quality - should score >95)
```csv
First Name,Last Name,Date of Birth,Gender,Parent Email,Parent Phone
Emma,Walsh,2015-03-15,Female,emma.parent@example.com,0871234567
Jack,Murphy,2014-07-22,Male,jack.parent@example.com,0869876543
Sophie,O'Connor,2015-11-08,Female,sophie.parent@example.com,0857654321
```

#### 2. **messy-data.csv** (Low quality - should score <60)
```csv
First Name,Last Name,Date of Birth,Gender,Parent Email,Parent Phone
,Walsh,invalid-date,Female,not-an-email,phone
Jack,,2014-07-22,M,jack@test,087
Sophie,O'Connor,2015-11-08,,sophie.parent@example.com,0857654321
Emma,Walsh,2015-03-15,Female,emma.parent@example.com,0871234567
```
*Note: Row 4 is duplicate of Emma Walsh*

#### 3. **large-data.csv** (For save & resume testing - 50+ rows)
Use the clean-data.csv format and duplicate rows with different names to create 50+ entries.

---

## Phase 2.1: Data Quality Scoring

**Goal**: Verify 5-dimension quality scoring and issue detection

### Test 2.1.1: High Quality Data

**Steps**:
1. Navigate to `/orgs/[orgId]/import`
2. Click "Import Wizard"
3. Upload `clean-data.csv`
4. Proceed to Mapping step → map columns
5. Proceed to Selection step → select all players
6. Proceed to Review step → **observe data quality report**

**Expected Results**:
- [ ] Quality score displays (should be **90-100**)
- [ ] Grade badge shows "Excellent" (5 stars) or "Good" (4 stars)
- [ ] All 5 dimensions displayed:
  - [ ] Completeness: ~100%
  - [ ] Consistency: ~100%
  - [ ] Accuracy: ~100%
  - [ ] Uniqueness: ~100%
  - [ ] Timeliness: ~95%+ (depends on DOBs)
- [ ] Issues section shows minimal or no critical issues
- [ ] UI displays congratulatory message for high score

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.1.2: Low Quality Data with Issues

**Steps**:
1. Start new import wizard
2. Upload `messy-data.csv`
3. Map columns
4. Proceed to Review step

**Expected Results**:
- [ ] Quality score displays (should be **<60**)
- [ ] Grade badge shows "Poor" or "Critical" (1-2 stars)
- [ ] Dimension scores show problems:
  - [ ] Completeness: Low (missing first name, DOB)
  - [ ] Accuracy: Low (invalid email, phone formats)
  - [ ] Uniqueness: Lower (duplicate Emma Walsh detected)
- [ ] Issues categorized by severity:
  - [ ] **Critical issues** displayed (missing required fields, invalid date)
  - [ ] **Warnings** displayed (phone format inconsistencies)
  - [ ] **Suggestions** displayed (if applicable)
- [ ] Each issue shows:
  - [ ] Row number
  - [ ] Field name
  - [ ] Problem description
  - [ ] Severity badge (red/amber/blue)

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.1.3: Quality Report Integration

**Steps**:
1. With low-quality data still in review step
2. Scroll through quality report sections

**Expected Results**:
- [ ] Quality report card displays above preview section
- [ ] Can toggle between "Overview" and "Issues" tabs
- [ ] Overview shows radar chart or dimension bars
- [ ] Issues section is paginated or scrollable
- [ ] Can filter issues by severity (critical/warning/suggestion)
- [ ] Mobile responsive (test at 375px width if possible)

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

## Phase 2.2: Import Simulation (Dry Run)

**Goal**: Verify simulation previews accurate counts without database writes

### Test 2.2.1: Run Simulation on Clean Data

**Steps**:
1. Start new import wizard with `clean-data.csv`
2. Complete mapping and selection steps
3. On Review step, locate **"Run Simulation"** button
4. Click "Run Simulation"
5. Wait for simulation to complete

**Expected Results**:
- [ ] Simulation button is visible and labeled clearly
- [ ] Loading state shows during simulation
- [ ] Simulation results display:
  - [ ] **Summary section**:
    - [ ] Players to create: 3
    - [ ] Guardians to create: 3
    - [ ] Enrollments to create: 3
    - [ ] Duplicates found: 0
  - [ ] **Sample player cards** (up to 5):
    - [ ] Player name
    - [ ] Age/DOB
    - [ ] Guardian info
    - [ ] Sport/Age Group
  - [ ] **Warnings/Errors section** (if any):
    - [ ] Clear messaging
    - [ ] Row numbers for issues
- [ ] Can collapse/expand simulation results
- [ ] "Proceed to Import" button appears after simulation

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.2.2: Verify No Database Writes

**Steps**:
1. Before simulation, check player count: Navigate to Players page, note count
2. Run simulation as in Test 2.2.1
3. After simulation completes, navigate back to Players page

**Expected Results**:
- [ ] Player count **unchanged** after simulation
- [ ] No new players appear in player list
- [ ] Simulation is truly a "dry run" (no data written)

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.2.3: Simulation with Duplicates

**Steps**:
1. Start new import with `messy-data.csv` (contains duplicate Emma Walsh)
2. Run simulation in Review step

**Expected Results**:
- [ ] Simulation detects duplicate Emma Walsh
- [ ] Duplicates count shows **1**
- [ ] Duplicate handling options displayed (skip/merge/replace)
- [ ] Sample cards show duplicate player with warning badge

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

## Phase 2.3: Save & Resume

**Goal**: Verify wizard state persists across sessions

### Test 2.3.1: Auto-Save During Wizard

**Steps**:
1. Start new import wizard with `large-data.csv`
2. Complete **Upload step** (file parsed)
3. **DO NOT navigate away** - observe UI for save indicator
4. Complete **Mapping step** (map all columns)
5. Again, observe for save indicator
6. Complete **Selection step** (select all players)
7. Observe for save indicator

**Expected Results**:
- [ ] Auto-save indicator appears after each step completion
  - [ ] Shows "Saving..." or checkmark icon
  - [ ] Confirms "Draft saved" or similar message
- [ ] No manual "Save Draft" button required (auto-save is automatic)
- [ ] Save happens within 1-2 seconds of step completion

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.3.2: Resume from Import Entry Page

**Steps**:
1. With wizard draft saved (from Test 2.3.1), **close browser tab**
2. Re-open browser and navigate to `/orgs/[orgId]/import`
3. Observe entry page

**Expected Results**:
- [ ] **Resume Draft Card** appears at top of page
- [ ] Card shows:
  - [ ] File name (`large-data.csv`)
  - [ ] Last saved timestamp
  - [ ] Current step indicator (e.g., "Step 3 of 6: Selection")
  - [ ] Row count (50+ rows)
- [ ] Card has two buttons:
  - [ ] "Resume Import" (primary button)
  - [ ] "Discard Draft" (secondary/destructive button)

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.3.3: Resume Wizard with State Intact

**Steps**:
1. Click "Resume Import" button from Test 2.3.2
2. Wizard should re-open

**Expected Results**:
- [ ] Wizard opens at **last completed step + 1**
  - If you completed Selection, should open at Review step
- [ ] All previous state restored:
  - [ ] File data intact (50+ rows visible in preview)
  - [ ] Column mappings preserved (check Mapping step)
  - [ ] Player selections preserved (check Selection step)
  - [ ] Benchmark settings preserved (if configured)
- [ ] Can navigate backward to previous steps
- [ ] Can proceed forward to next steps
- [ ] No data loss

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.3.4: Discard Draft

**Steps**:
1. Navigate back to `/orgs/[orgId]/import` entry page
2. Resume Draft Card should still be visible
3. Click **"Discard Draft"** button
4. Confirm discard in confirmation dialog

**Expected Results**:
- [ ] Confirmation dialog appears
  - [ ] Warns about losing progress
  - [ ] Shows what will be discarded (file name, step)
- [ ] After confirm:
  - [ ] Resume Draft Card disappears
  - [ ] Entry page shows "Start New Import" button
  - [ ] Draft is deleted from backend (refresh page to verify)

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.3.5: Cross-Device Resume (Optional)

**Steps**:
1. On Device A (e.g., desktop): Start import, save draft at Mapping step
2. On Device B (e.g., phone): Login as same user, navigate to `/orgs/[orgId]/import`

**Expected Results**:
- [ ] Resume Draft Card appears on Device B
- [ ] Can resume wizard on Device B
- [ ] State syncs correctly (file, mappings intact)

**Pass/Fail**: ______ (Optional)
**Notes**: _______________________________________________

---

## Phase 2.4: Granular Undo

**Goal**: Verify 24-hour undo window with eligibility checks

### Test 2.4.1: Complete an Import (Setup)

**Steps**:
1. Start new import wizard with `clean-data.csv`
2. Complete all steps (Upload → Mapping → Selection → Review → Import)
3. Wait for import to complete successfully
4. Note the **import session ID** or timestamp

**Expected Results**:
- [ ] Import completes successfully
- [ ] Complete step shows success message
- [ ] 3 players created
- [ ] 3 guardians created
- [ ] **Undo Import button** appears on Complete step

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.4.2: Undo from Complete Step

**Steps**:
1. On Complete step (from Test 2.4.1), locate **"Undo Import"** button
2. Click "Undo Import"

**Expected Results**:
- [ ] **UndoImportDialog** opens
- [ ] Dialog shows:
  - [ ] Session details (date, file name, rows imported)
  - [ ] **Impact preview**: "This will permanently delete:"
    - [ ] 3 players
    - [ ] 3 guardians
    - [ ] 3 enrollments
    - [ ] 3 passports
    - [ ] 0 assessments (if no assessments created)
    - [ ] 3 guardian links
  - [ ] **Warning text**: "This action cannot be undone. All records created by this import will be permanently removed."
  - [ ] **Countdown timer**: Shows time remaining in 24-hour window (e.g., "23h 59m")
  - [ ] **Reason input field**: Required, min 10 characters
  - [ ] **Undo button**: Destructive styling (red)

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.4.3: Execute Undo with Reason

**Steps**:
1. In UndoImportDialog (from Test 2.4.2)
2. Type a reason (e.g., "Imported wrong file - testing undo feature")
3. Click **"Undo Import"** button
4. Wait for mutation to complete

**Expected Results**:
- [ ] Reason input validation:
  - [ ] Button disabled if reason < 10 chars
  - [ ] Button enabled when reason ≥ 10 chars
- [ ] Loading state shows during mutation
- [ ] After undo completes:
  - [ ] **Success toast** appears with rollback stats:
    - "Undo successful: Removed 3 players, 3 guardians, 3 enrollments, 3 passports, 3 guardian links, 0 assessments"
  - [ ] Dialog closes
  - [ ] Navigate to Players page → verify 3 players removed
  - [ ] Navigate to Guardians page → verify 3 guardians removed

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.4.4: Import History Page

**Steps**:
1. Navigate to `/orgs/[orgId]/import/history`
   - Or use sidebar link: "Import History" in Data & Import section

**Expected Results**:
- [ ] Import History page loads
- [ ] **Desktop view** (if screen > 768px):
  - [ ] Table with columns:
    - [ ] Date
    - [ ] Source (file name)
    - [ ] Status badge (completed/failed/cancelled/undone/importing)
    - [ ] Rows Imported
    - [ ] Players Created
    - [ ] Guardians Created
    - [ ] Actions (Undo button / View Details link)
  - [ ] Most recent import shows **"undone"** status (amber badge) if you just undid it
  - [ ] Can expand row to see full stats breakdown
- [ ] **Mobile view** (if screen ≤ 768px):
  - [ ] Card layout instead of table
  - [ ] Each card shows same info as table row
  - [ ] Responsive design (cards stack vertically)

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.4.5: Undo Eligibility - 24-Hour Window

**Steps**:
1. On Import History page
2. Locate a **completed** import that is **<24 hours old**
3. Observe the "Actions" column

**Expected Results**:
- [ ] **Undo button** appears for completed imports within 24h
- [ ] Countdown timer shows time remaining (e.g., "23h 15m")
- [ ] Hover over Undo button → tooltip shows eligibility status
- [ ] Click Undo → UndoImportDialog opens with eligibility checks

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.4.6: Undo Ineligibility - Expired Window

**Steps**:
1. On Import History page
2. Locate a **completed** import that is **>24 hours old**
   - If none exist, you can manually change `completedAt` timestamp in Convex dashboard to simulate old import

**Expected Results**:
- [ ] **Undo button disabled** or not shown
- [ ] Tooltip explains: "24-hour undo window has expired"
- [ ] If dialog opens, shows ineligibility reason:
  - "24-hour undo window has expired (undo only available within 24 hours of import completion)"
- [ ] Undo button disabled in dialog

**Pass/Fail**: ______ (Manual timestamp manipulation may be required)
**Notes**: _______________________________________________

---

### Test 2.4.7: Undo Ineligibility - Dependent Data

**Steps**:
1. Complete a new import (create 3 players)
2. Navigate to one of the imported players
3. **Create a skill assessment** for that player (not imported, manually created)
4. Navigate back to Import History page
5. Try to undo the import

**Expected Results**:
- [ ] Undo button shows warning tooltip
- [ ] Click Undo → UndoImportDialog opens
- [ ] Dialog shows **ineligibility reason**:
  - "Players have assessments created after import (cannot undo if players have been assessed)"
- [ ] **Undo button disabled** (grayed out)
- [ ] Impact preview still shows counts (for transparency)

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.4.8: Recent Import Notification on Entry Page

**Steps**:
1. Complete a fresh import (any CSV)
2. Immediately navigate to `/orgs/[orgId]/import` entry page

**Expected Results**:
- [ ] **Recent import notification** appears (amber alert)
- [ ] Notification shows:
  - [ ] Title: "Last import can be undone"
  - [ ] Description: "Your most recent import can be undone within the next Xh Ym."
  - [ ] Link: "View Import History" (underlined)
- [ ] Notification only appears if last import is **completed** AND **<24h old**
- [ ] Clicking link navigates to `/orgs/[orgId]/import/history`

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.4.9: Sidebar Link - Import History

**Steps**:
1. Navigate to any admin page
2. Open sidebar (if collapsed)
3. Locate "Data & Import" section

**Expected Results**:
- [ ] "Import History" link appears in sidebar
- [ ] Icon: History icon (clock arrow)
- [ ] Positioned after "Import Wizard" link
- [ ] Click link → navigates to `/orgs/[orgId]/import/history`

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

## Phase 2.5: What's Next Workflow

**Goal**: Verify post-import workflow guides user to next steps

### Test 2.5.1: What's Next Cards on Complete Step

**Steps**:
1. Complete an import (any CSV)
2. On Complete step, scroll to **"What's Next?"** section

**Expected Results**:
- [ ] "What's Next?" section appears below success message
- [ ] **4 action cards** displayed in grid:
  1. [ ] **View Teams** - Navigate to team management
  2. [ ] **Import More Players** - Start new import
  3. [ ] **Set Up Assessments** - Go to assessment configuration
  4. [ ] **Review Players** - Navigate to player list
- [ ] Each card shows:
  - [ ] Icon
  - [ ] Title
  - [ ] Description (1-2 sentences)
  - [ ] Click-through link/button
- [ ] Cards are responsive (grid adapts to screen size)
- [ ] Clicking each card navigates to correct destination

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

## Phase 2.5: Progress Animations (Basic Implementation)

**Goal**: Verify basic progress indicators during import

### Test 2.5.2: Import Progress Indicator

**Steps**:
1. Start new import wizard
2. Proceed to final "Import" step
3. Click "Start Import" button
4. **Observe progress indicator** during import

**Expected Results**:
- [ ] Progress indicator appears
- [ ] Shows current phase:
  - [ ] "Preparing..." or "Importing..." or "Complete"
- [ ] Basic progress bar displays (percentage-based)
- [ ] Phase transitions visible (preparing → importing → complete)
- [ ] On completion, shows success message

**Known Limitations** (from PRD spec):
- ⚠️ **Not implemented** (basic version only):
  - Live stats counter (players created: X/Y)
  - Current operation display ("Creating identity for Emma Walsh")
  - Smooth progress bar animation
  - Enhanced error collection UI

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

## Cross-Feature Integration Tests

### Integration Test 1: Full Workflow - Quality → Simulation → Save → Import → Undo

**Steps**:
1. Start wizard with `messy-data.csv`
2. **Phase 2.1**: Check quality report → low score, critical issues
3. Cancel, fix CSV data, re-upload
4. **Phase 2.1**: Check quality report → high score now
5. **Phase 2.2**: Run simulation → verify counts accurate
6. **Phase 2.3**: Complete mapping, verify auto-save
7. Close browser, re-open, resume wizard
8. Complete import
9. **Phase 2.4**: Undo import from Complete step
10. **Phase 2.4**: Verify import shows as "undone" in history

**Expected Results**:
- [ ] All 4 phases work seamlessly together
- [ ] No errors during workflow
- [ ] Data persists correctly (save & resume)
- [ ] Undo successfully removes all imported data

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Integration Test 2: Mobile Responsiveness (All Phase 2 Features)

**Steps**:
1. Open browser DevTools, set viewport to **375px width** (iPhone SE)
2. Navigate through import wizard on mobile viewport
3. Test each Phase 2 feature:
   - Quality report on Review step
   - Simulation results display
   - Resume draft card on entry page
   - Import history page (should show card view)
   - UndoImportDialog

**Expected Results**:
- [ ] All Phase 2 UI components render correctly at 375px
- [ ] No horizontal scroll
- [ ] Text readable (no overflow)
- [ ] Buttons reachable (no off-screen buttons)
- [ ] Cards/dialogs fit viewport
- [ ] Import history switches to mobile card layout

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

## Error Handling & Edge Cases

### Edge Case 1: Empty File Upload

**Steps**:
1. Create `empty.csv` with headers only, no data rows
2. Upload to wizard

**Expected Results**:
- [ ] Error message: "File contains no data rows"
- [ ] Cannot proceed to Mapping step
- [ ] Graceful error handling (no crash)

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Edge Case 2: Undo When Session Not Found

**Steps**:
1. Manually trigger undo with invalid session ID (via browser console or API)

**Expected Results**:
- [ ] Error toast: "Session not found" or similar
- [ ] No data deleted
- [ ] Graceful error handling

**Pass/Fail**: ______ (Developer-only test)
**Notes**: _______________________________________________

---

### Edge Case 3: Resume Draft Expired (>7 days old)

**Steps**:
1. Manually set draft `expiresAt` to past date in Convex dashboard
2. Navigate to import entry page

**Expected Results**:
- [ ] Resume Draft Card does NOT appear
- [ ] Draft auto-deleted by cleanup cron or query logic
- [ ] No stale drafts shown

**Pass/Fail**: ______ (Manual timestamp manipulation required)
**Notes**: _______________________________________________

---

## Performance Validation

### Performance Test 1: Large Import Simulation

**Steps**:
1. Create `very-large-data.csv` with **500+ rows**
2. Upload to wizard
3. Run simulation in Review step

**Expected Results**:
- [ ] Simulation completes within **5 seconds**
- [ ] No UI freeze or hang
- [ ] Results display correctly (sample cards show up to 5 players)
- [ ] Counts accurate (500+ players, guardians)

**Pass/Fail**: ______
**Actual Time**: _______ seconds
**Notes**: _______________________________________________

---

### Performance Test 2: Quality Scoring on Large File

**Steps**:
1. Use `very-large-data.csv` from Performance Test 1
2. Proceed to Review step
3. Observe quality report generation time

**Expected Results**:
- [ ] Quality report generates within **3 seconds**
- [ ] No UI freeze
- [ ] All 5 dimensions calculated correctly
- [ ] Issues list loads (may be paginated for large file)

**Pass/Fail**: ______
**Actual Time**: _______ seconds
**Notes**: _______________________________________________

---

## Test Summary

### Phase 2.1: Data Quality Scoring
- Tests Passed: ______ / 3
- Overall: [ ] PASS [ ] FAIL

### Phase 2.2: Import Simulation
- Tests Passed: ______ / 3
- Overall: [ ] PASS [ ] FAIL

### Phase 2.3: Save & Resume
- Tests Passed: ______ / 5
- Overall: [ ] PASS [ ] FAIL

### Phase 2.4: Granular Undo
- Tests Passed: ______ / 9
- Overall: [ ] PASS [ ] FAIL

### Phase 2.5: What's Next & Progress
- Tests Passed: ______ / 2
- Overall: [ ] PASS [ ] FAIL

### Integration & Edge Cases
- Tests Passed: ______ / 5
- Overall: [ ] PASS [ ] FAIL

### Performance Tests
- Tests Passed: ______ / 2
- Overall: [ ] PASS [ ] FAIL

---

## Overall Phase 2 Test Result

**Total Tests Passed**: ______ / 29
**Success Rate**: ______%

**Final Verdict**: [ ] ✅ PASS (≥90%) [ ] ⚠️ PARTIAL (70-89%) [ ] ❌ FAIL (<70%)

---

## Known Issues & Observations

### Bugs Found:
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

### UX Feedback:
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

### Performance Issues:
1. _____________________________________________
2. _____________________________________________

---

## Recommendations for Phase 2.5 Completion

Based on PRD spec (lines 392-401), the following progress animation features are **missing**:

- [ ] Live stats counter during import ("Creating 45/120 players...")
- [ ] Current operation display ("Creating identity for Emma Walsh")
- [ ] Smooth progress bar animation (not just percentage jumps)
- [ ] Enhanced error collection UI (show errors as they occur during import)

**Recommendation**: Create follow-up story/task to implement advanced progress animations if desired, or accept current basic implementation.

---

**Tester Signature**: _____________________
**Date Completed**: _____________________
**Sign-off**: [ ] Approved [ ] Rejected (with follow-up required)
