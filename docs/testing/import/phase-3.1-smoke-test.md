# Phase 3.1 Quick-Start Smoke Test

**Testing Date**: _________________
**Tester**: _____________________
**Branch**: `ralph/phase-3.1-advanced-features` or `main`
**Environment**: Dev (localhost:3000)

---

## Overview

**Fast verification of Phase 3.1 critical functionality**

**Test Duration**: ~15-20 minutes
**Test Count**: 12 critical tests (vs 38 in full suite)

**What This Covers**:
- ✅ Core confidence indicator functionality
- ✅ Basic partial undo workflow
- ✅ Analytics dashboard access and display
- ✅ Critical integration path

**What This Skips**:
- Edge cases and error handling
- Comprehensive filter/search variations
- Detailed mobile testing
- Performance testing with large datasets

---

## Prerequisites

- Dev server running on `localhost:3000`
- **Platform staff account**: `neil.B@blablablak.com` / `lien1979`
- **Org admin account**: Any admin account
- **Test files**: `duplicate-guardians.csv` and `clean-players.csv` from `docs/testing/import/test-data/`

---

## SMOKE TEST 1: High Confidence Indicator (Green Badge)

**Feature**: Confidence Indicators
**Time**: 2 min

**Steps**:
1. Log in as org admin
2. Navigate to `/orgs/[orgId]/import`
3. Upload `duplicate-guardians.csv`
4. Complete mapping step (map ALL columns: First Name, Last Name, DOB, Gender, Parent Email, Phone, Name, Address)
5. Select all players in selection step
6. On Review step, locate **Emma Walsh & Sophie O'Connor** duplicate

**Expected Results**:
- [ ] **Green "High Confidence" badge** appears
- [ ] Badge shows checkmark icon (✓)
- [ ] Confidence score displays **60+** (likely 70-90)
- [ ] Progress bar is green

**Status**: [ ] PASS [ ] FAIL

---

## SMOKE TEST 2: Low Confidence Indicator (Red Badge)

**Feature**: Confidence Indicators
**Time**: 1 min

**Steps**:
1. On same Review step, locate **Saoirse Doyle & Finn Gallagher** duplicate
2. Observe confidence badge

**Expected Results**:
- [ ] **Red "Low Confidence" badge** appears
- [ ] Badge shows X icon (✗)
- [ ] Confidence score is **<40** (likely 30-40)
- [ ] Progress bar is red

**Status**: [ ] PASS [ ] FAIL

---

## SMOKE TEST 3: Match Score Breakdown

**Feature**: Confidence Indicators
**Time**: 2 min

**Steps**:
1. On any duplicate card, find **"Match Details"** or expandable section
2. Click to expand
3. Review breakdown

**Expected Results**:
- [ ] Match Details section expands
- [ ] Shows 4 signals with weights:
  - [ ] Email match: ✓/✗ **(40%)**
  - [ ] Phone match: ✓/✗ **(30%)**
  - [ ] Name similarity: % **(20%)**
  - [ ] Address match: ✓/✗ **(10%)**
- [ ] Can collapse section again

**Status**: [ ] PASS [ ] FAIL

---

## SMOKE TEST 4: Admin Override - Force Link

**Feature**: Admin Override Controls
**Time**: 2 min

**Steps**:
1. Find low confidence match (Saoirse & Finn)
2. Click **"Force Link"** button
3. Observe result

**Expected Results**:
- [ ] "Force Link" button appears on low confidence matches
- [ ] Clicking applies override (may show confirmation)
- [ ] Override badge appears: **"Admin Override: Force Linked"**
- [ ] Guardian marked for linking despite low confidence

**Status**: [ ] PASS [ ] FAIL

**Notes**: If time limited, verify button exists and skip actual click

---

## SMOKE TEST 5: Open Partial Undo Dialog

**Feature**: Partial Undo
**Time**: 2 min

**Setup**: Complete import using `clean-players.csv` first

**Steps**:
1. After import completes, remain on Complete step
2. Click **"Remove Players"** or **"Partial Undo"** button
3. Observe dialog

**Expected Results**:
- [ ] Partial Undo Dialog opens
- [ ] Shows list of **10 players** from import
- [ ] Each row has: checkbox, name, DOB, status, related records
- [ ] **"Select All"** checkbox at top
- [ ] Selected count: **"0 players selected"**
- [ ] **"Remove" button is disabled**

**Status**: [ ] PASS [ ] FAIL

---

## SMOKE TEST 6: Search Functionality

**Feature**: Partial Undo Search
**Time**: 1 min

**Steps**:
1. In Partial Undo Dialog, type **"Sean"** in search box
2. Observe results

**Expected Results**:
- [ ] List filters to show only **Sean O'Brien**
- [ ] Result count: **"Showing 1 of 10 players"**
- [ ] Search is case-insensitive
- [ ] Clearing search shows all players

**Status**: [ ] PASS [ ] FAIL

---

## SMOKE TEST 7: Impact Preview

**Feature**: Partial Undo Impact Preview
**Time**: 1 min

**Steps**:
1. Select **3 players** (e.g., Ava, Sean, Ella)
2. Scroll to **"Preview Impact"** section
3. Review impact summary

**Expected Results**:
- [ ] Preview Impact section appears
- [ ] Shows deletion counts:
  - [ ] Player enrollments
  - [ ] Guardian links
  - [ ] Passports
  - [ ] Team assignments
  - [ ] Assessments
- [ ] Counts update as selection changes

**Status**: [ ] PASS [ ] FAIL

---

## SMOKE TEST 8: Execute Partial Removal

**Feature**: Atomic Removal Transaction
**Time**: 2 min

**Steps**:
1. With 3 players selected, click **"Remove Selected Players"**
2. Confirm action
3. Wait for completion
4. Navigate to Players page

**Expected Results**:
- [ ] Success message appears
- [ ] Dialog closes or shows success state
- [ ] Removed players (Ava, Sean, Ella) NOT in players list
- [ ] Remaining players (Ryan, Grace, Dylan, Lucy, Adam, Kate, James) still exist

**Status**: [ ] PASS [ ] FAIL

---

## SMOKE TEST 9: Platform Analytics Dashboard Access

**Feature**: Analytics Dashboard
**Time**: 2 min

**Setup**: Log out, log in as platform staff (`neil.B@blablablak.com`)

**Steps**:
1. Navigate to `/platform/analytics/import`
2. Observe page loads

**Expected Results**:
- [ ] Dashboard loads successfully
- [ ] No redirect (platform staff has access)
- [ ] Metrics displayed

**Status**: [ ] PASS [ ] FAIL

---

## SMOKE TEST 10: Analytics Metrics Display

**Feature**: Analytics Dashboard
**Time**: 2 min

**Steps**:
1. On analytics dashboard, observe top metrics
2. Check time period selector

**Expected Results**:
- [ ] **4 metric cards** display:
  - [ ] Total Imports
  - [ ] Success Rate (with colored badge)
  - [ ] Total Players Imported
  - [ ] Average Import Size
- [ ] Time period selector works (Last 7 Days, 30 Days, 90 Days, All Time)
- [ ] Metrics update when period changes

**Status**: [ ] PASS [ ] FAIL

---

## SMOKE TEST 11: Org-Level Import History

**Feature**: Import History
**Time**: 2 min

**Setup**: Log out from platform staff, log in as org admin

**Steps**:
1. Navigate to `/orgs/[orgId]/import/history`
2. Observe history table

**Expected Results**:
- [ ] Import history page loads
- [ ] Table shows imports for this org
- [ ] Columns: Date, Imported By, Players Count, Status, Template, Actions
- [ ] Status badges color-coded (green/yellow/red)
- [ ] Most recent imports appear first

**Status**: [ ] PASS [ ] FAIL

---

## SMOKE TEST 12: End-to-End Integration

**Feature**: Complete Workflow
**Time**: 3 min

**Critical Path Test**:
1. Upload `duplicate-guardians.csv`
2. Complete mapping (all columns)
3. Select all players
4. Review step: Verify at least one green and one red badge visible
5. Force link one low confidence match
6. Complete import
7. Verify import success

**Expected Results**:
- [ ] Import wizard completes without errors
- [ ] Confidence badges display correctly
- [ ] Admin override applies
- [ ] Import completes successfully
- [ ] Players created in database

**Status**: [ ] PASS [ ] FAIL

---

## Quick Summary

**Smoke Test Results**:

| Category | Tests | Pass | Fail |
|----------|-------|------|------|
| Confidence Indicators | 4 | ___ | ___ |
| Partial Undo | 4 | ___ | ___ |
| Analytics | 3 | ___ | ___ |
| Integration | 1 | ___ | ___ |
| **TOTAL** | **12** | ___ | ___ |

---

## Severity Assessment

**Critical Issues** (Must fix before merge):
- _______________________________________________

**Non-Critical Issues** (Can address later):
- _______________________________________________

---

## Next Steps

### If ALL Tests Pass ✅
- [ ] **Proceed with merge** to main branch
- [ ] Or run full test suite (`phase-3.1-manual-tests.md`) for comprehensive validation

### If Any Critical Test Fails ❌
- [ ] **Do NOT merge** - document issues
- [ ] Create GitHub issues for failures
- [ ] Retest after fixes

### If Minor Issues Found ⚠️
- [ ] Document in GitHub issues
- [ ] Assess if blocking merge
- [ ] Consider merge with known limitations

---

## Tester Sign-off

**Overall Assessment**: [ ] PASS [ ] FAIL

**Tester**: _____________________
**Date**: _____________________
**Time Spent**: _______ minutes

---

## Reference

- **Full Test Suite**: `phase-3.1-manual-tests.md` (38 tests, 45-60 min)
- **Test Data**: `test-data/duplicate-guardians.csv` & `test-data/clean-players.csv`
- **Test Data Docs**: `test-data/README.md`

---

## Testing Tips

**Speed Optimization**:
- Use browser autofill for faster form completion
- Keep both CSV files open in text editor for quick access
- Use browser back button instead of restarting wizard
- Test with DevTools open (Console tab) to catch errors early

**Common Issues**:
- If confidence badges don't appear, verify ALL guardian fields mapped (Email, Phone, Name, Address)
- If partial undo dialog doesn't open, verify import actually completed
- If analytics page redirects, ensure logged in as platform staff (`neil.B@blablablak.com`)

**Quick Verification Shortcuts**:
- Browser DevTools → Network tab: Check for API errors
- Browser DevTools → Console: Check for JavaScript errors
- Database: Use Convex dashboard to verify data created
