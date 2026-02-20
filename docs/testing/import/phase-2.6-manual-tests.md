# Phase 2.6 Manual Testing Guide: Professional Progress Animations

**Testing Date**: _________________
**Tester**: _____________________
**Branch**: `ralph/phase-2.6-progress-animations` or `main`
**Environment**: Dev (localhost:3000)

---

## Overview

This guide provides step-by-step manual testing procedures for Phase 2.6: Professional Progress Animations. Complete each test section and mark results.

**Phase 2.6 Features**:
- ✅ US-P2.6-001: Live stats counter during import
- ✅ US-P2.6-002: Current operation display
- ✅ US-P2.6-003: Smooth progress bar animations
- ✅ US-P2.6-004: Enhanced error collection UI (success state only)
- ✅ US-P2.6-005: Progress tracker cleanup & integration

**Test Duration**: ~20-30 minutes
**Prerequisites**:
- Dev server running on `localhost:3000`
- Test account with admin role
- Sample CSV file with player data (see [Test Data](#test-data) section)

---

## Important Note: Import Upsert Behavior

The import system uses an **upsert pattern** (update-or-insert):
- **Existing players** (same name + DOB) → Updates enrollment
- **New players** → Creates player identity and enrollment
- **No errors for duplicates** - they update existing records

This allows users to update player data by re-importing CSV files.

**What this means for testing**:
- Import errors only occur from system failures (database errors, constraint violations)
- Error collection UI exists and works correctly, but cannot be tested in manual UAT with normal CSV data
- Tests focus on success path: stats counter, current operation, progress animations, and "no errors" state

---

## Test Data Preparation

### Sample CSV Files

Create these 2 test files before starting:

#### 1. **clean-data.csv** (20 rows for animation testing)
```csv
First Name,Last Name,Date of Birth,Gender,Parent Email,Parent Phone
Emma,Walsh,2015-03-15,Female,emma.parent@example.com,0871234567
Jack,Murphy,2014-07-22,Male,jack.parent@example.com,0869876543
Sophie,O'Connor,2015-11-08,Female,sophie.parent@example.com,0857654321
Liam,Kelly,2014-05-20,Male,liam.parent@example.com,0871112222
Aoife,Ryan,2015-09-12,Female,aoife.parent@example.com,0863334444
Conor,Brennan,2014-11-30,Male,conor.parent@example.com,0855556666
Niamh,McCarthy,2015-02-14,Female,niamh.parent@example.com,0877778888
Cian,O'Sullivan,2014-08-25,Male,cian.parent@example.com,0869990000
Saoirse,Doyle,2015-06-18,Female,saoirse.parent@example.com,0851112233
Finn,Gallagher,2014-12-05,Male,finn.parent@example.com,0874445566
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

#### 2. **large-data.csv** (50+ rows for performance testing)
Use the clean-data.csv format and duplicate/modify names to create 50+ entries.

---

## US-P2.6-001: Live Stats Counter

**Goal**: Verify real-time statistics display during import

### Test 2.6.1.1: Stats Card Appears and Updates

**Steps**:
1. Navigate to `/orgs/[orgId]/import`
2. Start Import Wizard
3. Upload `clean-data.csv` (20 rows)
4. Complete Mapping step (map all columns)
5. Complete Selection step (select all players)
6. Complete Review step
7. Click **"Start Import"** on Import step
8. **Observe the import progress UI**

**Expected Results**:
- [ ] **Stats card appears** above or near progress bar
- [ ] Stats card shows **4 metrics** in grid layout:
  - [ ] Players: 0/20 (initially)
  - [ ] Guardians: 0/20 (initially)
  - [ ] Enrollments: 0/20 (initially)
  - [ ] Passports: 0/20 (initially)
- [ ] Stats **update in real-time** as import progresses
- [ ] Numbers increment smoothly (e.g., 5/20 → 10/20 → 15/20)
- [ ] Updates occur approximately every 1-2 seconds (polling interval)
- [ ] No flickering or visual glitches
- [ ] Final stats show: 20/20 for all metrics when import completes

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.6.1.2: Stats Accuracy

**Steps**:
1. After import from Test 2.6.1.1 completes
2. Verify final displayed stats
3. Navigate to Players page
4. Count actual players created

**Expected Results**:
- [ ] Stats card shows: **20 Players, 20 Guardians, 20 Enrollments, 20 Passports**
- [ ] Actual player count in database matches displayed stats
- [ ] No discrepancy between displayed and actual counts
- [ ] Stats persist until page refresh or navigation away

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

## US-P2.6-002: Current Operation Display

**Goal**: Verify current player being processed is displayed

### Test 2.6.2.1: Operation Text Updates

**Steps**:
1. Start new import with `clean-data.csv`
2. Proceed to Import step
3. Click "Start Import"
4. **Watch for current operation text** below stats card

**Expected Results**:
- [ ] **Current operation display appears** (separate component from stats)
- [ ] Shows format: **"Creating identity for [FirstName LastName]"**
- [ ] Examples:
  - "Creating identity for Emma Walsh"
  - "Creating identity for Jack Murphy"
  - "Creating identity for Sophie O'Connor"
- [ ] Text **updates smoothly** with fade transitions (framer-motion)
- [ ] No jarring text jumps or flickering
- [ ] Each player name appears briefly (~1-2 seconds based on import speed)
- [ ] Can read player names without text being too fast

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.6.2.2: Completion State

**Steps**:
1. Let import complete successfully (from Test 2.6.2.1)
2. Observe final operation text

**Expected Results**:
- [ ] **On successful completion**:
  - Current operation shows: **"Import complete!"**
  - Success styling (green text or checkmark icon)

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.6.2.3: Mobile Responsiveness - Operation Text

**Steps**:
1. Open browser DevTools
2. Set viewport to **375px width** (iPhone SE)
3. Start import with `clean-data.csv`
4. Observe current operation display

**Expected Results**:
- [ ] Operation text **truncates long names** with ellipsis on mobile
- [ ] Example: "Creating identity for Saoirse Do..." (if name too long)
- [ ] No horizontal scroll
- [ ] Text remains readable (font size appropriate)
- [ ] Component stacks vertically below stats card

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

## US-P2.6-003: Smooth Progress Bar Animations

**Goal**: Verify progress bar animates smoothly without jumps

### Test 2.6.3.1: Smooth Width Transitions

**Steps**:
1. Start new import with `clean-data.csv` (20 rows)
2. Proceed to Import step
3. Click "Start Import"
4. **Watch the progress bar closely**

**Expected Results**:
- [ ] Progress bar **animates smoothly** between percentage updates
- [ ] No jarring jumps (e.g., 10% → 50% should animate over ~0.5s, not jump instantly)
- [ ] Width transition uses **easeInOut** timing (smooth acceleration/deceleration)
- [ ] Animation feels natural (not too slow, not instant)
- [ ] Bar fills gradually from left to right
- [ ] Animation runs at **60fps** (no stuttering or lag)

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.6.3.2: Shimmer Effect

**Steps**:
1. During active import (from Test 2.6.3.1)
2. Observe progress bar background

**Expected Results**:
- [ ] Progress bar has **subtle shimmer/gradient animation**
- [ ] Shimmer moves across the bar (indicates active loading)
- [ ] Not too distracting (subtle, professional)
- [ ] Shimmer stops when import completes
- [ ] CSS animation uses GPU acceleration (transform/opacity, not background-position)

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.6.3.3: Color Transitions

**Steps**:
1. Start new import
2. Watch progress bar color as percentage increases

**Expected Results**:
- [ ] **0-50% progress**: Progress bar is **blue** (primary color)
- [ ] **50-100% progress**: Progress bar transitions to **green** (success color)
- [ ] Color transition is smooth (gradient blend, not instant switch)
- [ ] Final state (100%): Bar is fully green

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.6.3.4: Success Pulse Animation

**Steps**:
1. Let import complete successfully
2. Observe progress bar at 100%

**Expected Results**:
- [ ] Progress bar shows **pulse animation** on completion
- [ ] Pulse effect: Scale 1 → 1.05 → 1 (subtle grow/shrink)
- [ ] Animation repeats (infinite loop) or plays once
- [ ] Green color remains
- [ ] Pulse draws attention to completion without being jarring

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.6.3.5: Performance - 60fps Animations

**Steps**:
1. Start import with `large-data.csv` (50+ rows)
2. Open browser DevTools → Performance tab
3. Start recording
4. Let import run for 10-15 seconds
5. Stop recording
6. Analyze frame rate

**Expected Results**:
- [ ] Progress bar animations run at **60fps** (no dropped frames)
- [ ] Frame timeline shows consistent ~16.67ms frame time
- [ ] No jank or stuttering visible
- [ ] Animations use CSS transforms (GPU accelerated, not CPU-bound width changes)
- [ ] Page remains responsive during import

**Pass/Fail**: ______ (Optional - requires DevTools profiling)
**Actual FPS**: ______
**Notes**: _______________________________________________

---

## US-P2.6-004: Enhanced Error Collection UI

**Goal**: Verify error section displays correctly in success state

### Test 2.6.4.1: Error Section in Success State

**Steps**:
1. Start import with `clean-data.csv` (all valid data)
2. Proceed to Import step
3. Observe error section during import

**Expected Results**:
- [ ] **"Errors" section** appears below current operation
- [ ] Shows: **"No errors (0)"** with **green checkmark** icon
- [ ] Badge color: Green (success state)
- [ ] Section is visible but shows positive feedback
- [ ] Remains at "No errors (0)" throughout import
- [ ] Final state shows "No errors (0)" after completion

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

## US-P2.6-005: Progress Tracker Cleanup & Integration

**Goal**: Verify progress tracker lifecycle and integration

### Test 2.6.5.1: Polling During Active Import

**Steps**:
1. Open browser DevTools → Network tab
2. Start import with `clean-data.csv`
3. Filter network requests for "getProgressTracker" or similar query
4. Observe polling frequency

**Expected Results**:
- [ ] Frontend **polls** progress tracker query **every ~500ms**
- [ ] Network requests show consistent interval
- [ ] Polling starts when import begins
- [ ] Polling continues throughout import duration
- [ ] No excessive polling (not faster than 500ms)

**Pass/Fail**: ______ (Developer-only test)
**Actual Polling Interval**: ______ ms
**Notes**: _______________________________________________

---

### Test 2.6.5.2: Polling Stops on Completion

**Steps**:
1. Continue from Test 2.6.5.1 (Network tab open)
2. Let import complete successfully
3. Observe polling behavior after completion

**Expected Results**:
- [ ] Polling **stops** when import completes (phase = 'completed')
- [ ] Network requests to getProgressTracker cease
- [ ] No ongoing polling after import done
- [ ] UI remains responsive (no unnecessary queries)

**Pass/Fail**: ______ (Developer-only test)
**Notes**: _______________________________________________

---

### Test 2.6.5.3: Progress Tracker Cleanup on Success

**Steps**:
1. Complete an import successfully
2. Open Convex Dashboard → importProgressTrackers table
3. Check for tracker record with the sessionId

**Expected Results**:
- [ ] Progress tracker record is **deleted** after successful import
- [ ] cleanupProgressTracker mutation called automatically
- [ ] No stale trackers remain in database
- [ ] Cleanup occurs within a few seconds of completion

**Pass/Fail**: ______ (Developer-only test - requires Convex Dashboard access)
**Notes**: _______________________________________________

---

### Test 2.6.5.4: Loading Skeleton Until First Update

**Steps**:
1. Start import with `large-data.csv` (50+ rows for slower import)
2. Click "Start Import"
3. Observe UI **immediately** after clicking (first 500ms)

**Expected Results**:
- [ ] **Loading skeleton** or placeholder shown until first progress update
- [ ] Stats card shows loading state (skeleton/shimmer)
- [ ] Current operation shows loading placeholder
- [ ] No blank/empty UI (graceful loading state)
- [ ] First real data appears within 500-1000ms

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Test 2.6.5.5: Mobile Layout - All Components

**Steps**:
1. Set viewport to **375px width**
2. Start import with `clean-data.csv`
3. Observe full import UI layout

**Expected Results**:
- [ ] All progress UI components **stack vertically**:
  1. Progress bar (top)
  2. Stats card (below progress bar)
  3. Current operation (below stats)
  4. Errors section (below operation)
- [ ] No horizontal scroll
- [ ] No component overlap
- [ ] All text readable (no truncation except operation names)
- [ ] Touch-friendly spacing between components
- [ ] Mobile-optimized stats grid (2x2 instead of 4x1)

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

## Cross-Feature Integration Tests

### Integration Test 1: Full Import Workflow with All Animations

**Steps**:
1. Start fresh import with `clean-data.csv` (20 rows)
2. Complete all wizard steps quickly
3. On Import step, click "Start Import"
4. **Observe all Phase 2.6 features together**:
   - Live stats counter
   - Current operation display
   - Smooth progress bar animation
   - No errors (clean data)
   - Progress tracker polling
5. Let import complete

**Expected Results**:
- [ ] **All features work harmoniously**:
  - [ ] Stats update smoothly
  - [ ] Current operation cycles through names
  - [ ] Progress bar animates from 0% → 100% smoothly
  - [ ] Blue → green color transition occurs around 50%
  - [ ] Success pulse animation plays at 100%
  - [ ] "Import complete!" shows in operation text
  - [ ] "No errors (0)" shows with green checkmark
- [ ] **No conflicts or visual glitches** between components
- [ ] **Professional feel** - import feels fast and informative
- [ ] Import completes successfully (20 players created)

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Integration Test 2: Large Import Performance

**Steps**:
1. Create `very-large-data.csv` with **100+ rows**
2. Start import
3. Click "Start Import"
4. Monitor performance during import

**Expected Results**:
- [ ] **Stats update every 10-20 records** (not every single record)
- [ ] Polling remains at 500ms (doesn't slow down with large data)
- [ ] Progress bar animates smoothly throughout (no stuttering)
- [ ] Current operation text updates remain readable (not too fast)
- [ ] No browser freeze or lag
- [ ] Import completes in reasonable time (~30-60s for 100 rows)
- [ ] Final stats accurate (100/100)

**Pass/Fail**: ______
**Actual Import Time**: ______ seconds
**Notes**: _______________________________________________

---

## Edge Cases & Error Handling

### Edge Case 1: Cancel Import Mid-Progress

**Steps**:
1. Start import with `large-data.csv` (50+ rows)
2. Let import reach ~30% progress
3. Navigate away from page (close tab or click back button)
4. Return to import page

**Expected Results**:
- [ ] Import stops (backend mutation terminated or handled gracefully)
- [ ] Progress tracker cleaned up (no orphaned record)
- [ ] Can start new import without issues
- [ ] No error messages on return

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

### Edge Case 2: Network Interruption During Polling

**Steps**:
1. Start import
2. Open DevTools → Network tab
3. Throttle network to "Slow 3G" mid-import
4. Observe UI behavior

**Expected Results**:
- [ ] Import continues (backend mutation not affected by frontend polling)
- [ ] UI may show stale data briefly (last successful poll)
- [ ] No crash or error message
- [ ] Once network recovers, polling resumes and UI updates
- [ ] Import completes successfully

**Pass/Fail**: ______ (Optional edge case)
**Notes**: _______________________________________________

---

### Edge Case 3: Zero Rows Selected

**Steps**:
1. Start import with `clean-data.csv`
2. In Selection step, **deselect all rows**
3. Proceed to Import step
4. Click "Start Import"

**Expected Results**:
- [ ] Import button disabled OR validation prevents proceeding
- [ ] If import somehow starts:
  - [ ] Stats show 0/0 for all metrics
  - [ ] Progress bar goes to 100% immediately
  - [ ] No errors
  - [ ] "Import complete!" shows
  - [ ] No database changes

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

## Mobile Responsiveness Summary

### Mobile Test: Full Import Flow at 375px

**Steps**:
1. Set viewport to **375px × 667px** (iPhone SE)
2. Run complete import workflow from start to finish
3. Test all Phase 2.6 features on mobile

**Expected Results**:
- [ ] **Stats card**: 2x2 grid layout (not 4x1)
- [ ] **Current operation**: Text truncates with ellipsis if too long
- [ ] **Progress bar**: Full width, smooth animation
- [ ] **Errors section**: Shows "No errors (0)", no overflow
- [ ] **Buttons**: Tappable (min 44px touch target)
- [ ] **No horizontal scroll** at any point
- [ ] **Vertical spacing** appropriate (not too cramped)
- [ ] **All text readable** (font sizes appropriate)

**Pass/Fail**: ______
**Notes**: _______________________________________________

---

## Performance Validation

### Performance Test: Query Cost Analysis

**Steps**:
1. Open Convex Dashboard → Functions page
2. Note current function call count
3. Run import with 50 rows (~60s duration)
4. Check function call count after import

**Expected Results**:
- [ ] **getProgressTracker** query called ~120 times (60s ÷ 0.5s polling)
- [ ] **updateProgressTracker** mutation called ~5 times (50 rows ÷ 10 per update)
- [ ] Total query cost acceptable (within Convex free tier if applicable)
- [ ] No runaway polling (infinite loops)

**Pass/Fail**: ______ (Developer-only test)
**Actual Query Count**: ______
**Notes**: _______________________________________________

---

## Test Summary

### US-P2.6-001: Live Stats Counter
- Tests Passed: ______ / 2
- Overall: [ ] PASS [ ] FAIL

### US-P2.6-002: Current Operation Display
- Tests Passed: ______ / 3
- Overall: [ ] PASS [ ] FAIL

### US-P2.6-003: Smooth Progress Bar Animations
- Tests Passed: ______ / 5
- Overall: [ ] PASS [ ] FAIL

### US-P2.6-004: Enhanced Error Collection UI
- Tests Passed: ______ / 1
- Overall: [ ] PASS [ ] FAIL

### US-P2.6-005: Progress Tracker Cleanup & Integration
- Tests Passed: ______ / 5
- Overall: [ ] PASS [ ] FAIL

### Integration Tests
- Tests Passed: ______ / 2
- Overall: [ ] PASS [ ] FAIL

### Edge Cases
- Tests Passed: ______ / 3
- Overall: [ ] PASS [ ] FAIL

### Mobile & Performance
- Tests Passed: ______ / 2
- Overall: [ ] PASS [ ] FAIL

---

## Overall Phase 2.6 Test Result

**Total Tests Passed**: ______ / 23
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

## Recommendations

### Animation Tuning:
- [ ] Progress bar animation speed appropriate? (0.5s duration)
- [ ] Shimmer effect too subtle or too prominent?
- [ ] Color transitions smooth at 50% mark?

### Polling Optimization:
- [ ] 500ms polling interval good balance? (Could be 300ms or 700ms?)
- [ ] Stats update frequency (every 10-20 records) appropriate?
- [ ] Loading skeleton duration acceptable?

---

**Tester Signature**: _____________________
**Date Completed**: _____________________
**Sign-off**: [ ] Approved [ ] Rejected (with follow-up required)
