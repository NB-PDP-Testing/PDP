# Phase 3 Complete UAT Test Plan
## Comprehensive Testing: Import System with Advanced Features

**Document Version**: 1.0
**Testing Date**: _________________
**Tester**: _____________________
**Branch**: `ralph/phase-3.2-import-history-completion` or `main`
**Environment**: Dev (localhost:3000)

---

## Overview

This comprehensive test plan covers the complete Phase 3 import system including all enhancements from Phase 3.1 (Confidence Indicators & Partial Undo) and Phase 3.2 (Import History Completion).

**Complete Feature Coverage**:
- ✅ Base Import Flow (CSV upload, validation, mapping, execution)
- ✅ Guardian Matching with Confidence Indicators (Phase 3.1)
- ✅ Admin Override Controls (Force Link / Reject Link) (Phase 3.2)
- ✅ Partial Undo with Search & Filter (Phase 3.1)
- ✅ Import History with Details & Players Tab (Phase 3.2)
- ✅ Import Analytics Dashboard (Phase 3.1)

**Estimated Test Duration**: 90-120 minutes
**Prerequisites**:
- Dev server running on `localhost:3000`
- Platform staff account (for analytics testing)
- Org admin account (for import testing)
- Sample CSV files (see [Test Data](#test-data) section)

---

## Test Accounts

### 1. Platform Staff Account
- **Email**: `neil.B@blablablak.com`
- **Password**: `lien1979`
- **Purpose**: Testing analytics dashboard (platform-wide metrics)

### 2. Organization Admin Account
- **Email**: _(use your org admin account)_
- **Password**: _(your password)_
- **Purpose**: Testing import, partial undo, and import history

---

## Test Data Files

All test CSV files are located in `docs/testing/import/test-data/`

### Required Files

1. **`step1-base-guardians.csv`**
   Creates 4 base guardians with specific data patterns for confidence testing.

2. **`step2-duplicate-test.csv`**
   Matches guardians from step 1 to test HIGH, MEDIUM, and LOW confidence levels.

3. **`step3-additional-players.csv`**
   Additional players for testing partial undo with larger datasets.

**IMPORTANT**: Confidence testing requires a 2-step import process because duplicate detection compares uploaded players against EXISTING guardians in the database, NOT within the same CSV file.

For detailed test data documentation, see:
`docs/testing/import/test-data/README-CONFIDENCE-TESTING.md`

---

## Test Sections

- [Section 1: Base Import Flow](#section-1-base-import-flow)
- [Section 2: Guardian Matching with Confidence Indicators](#section-2-guardian-matching-with-confidence-indicators)
- [Section 3: Admin Override Controls](#section-3-admin-override-controls)
- [Section 4: Import History](#section-4-import-history)
- [Section 5: Import Details View](#section-5-import-details-view)
- [Section 6: Partial Undo](#section-6-partial-undo)
- [Section 7: Platform Analytics Dashboard](#section-7-platform-analytics-dashboard)

---

## Section 1: Base Import Flow

**Purpose**: Verify core CSV import functionality works end-to-end.
**Duration**: ~15 minutes

### Test 1.1: Access Import Wizard

**Steps**:
1. Log in as org admin
2. Navigate to `/orgs/[orgId]/import`
3. Verify import wizard loads

**Expected Results**:
- [ ] Import wizard page loads without errors
- [ ] "Upload CSV" button visible
- [ ] Progress stepper shows: Upload → Map → Review → Complete

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 1.2: CSV Upload Validation

**Steps**:
1. Click "Upload CSV" or drag-drop area
2. Attempt to upload invalid file (non-CSV, e.g., .txt or .xlsx)
3. Upload valid CSV file: `step1-base-guardians.csv`

**Expected Results**:
- [ ] Invalid file rejected with error message
- [ ] Valid CSV accepted
- [ ] File name displayed: "step1-base-guardians.csv"
- [ ] Preview shows first 3-5 rows
- [ ] "Next" button enabled

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 1.3: Field Mapping

**Steps**:
1. Click "Next" to proceed to mapping step
2. Verify auto-mapping detected columns
3. Review dropdown options for each field
4. Map required fields if not auto-mapped:
   - First Name → firstName
   - Last Name → lastName
   - Date of Birth → dateOfBirth
   - Gender → gender
   - Parent Email → guardian.email
   - Parent Phone → guardian.phone
   - Parent First Name → guardian.firstName
   - Parent Last Name → guardian.lastName

**Expected Results**:
- [ ] Mapping step loads with column headers
- [ ] Auto-mapping correctly identifies standard fields
- [ ] Required fields marked with red asterisk (*)
- [ ] Dropdown shows available field mappings
- [ ] Unmapped columns show "Ignore this column"
- [ ] "Next" button disabled until all required fields mapped
- [ ] "Next" button enabled after mapping complete

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 1.4: Review and Execute Import

**Steps**:
1. Click "Next" to proceed to review step
2. Review import summary:
   - Total rows to import
   - Players to create
   - Guardians to create or link
3. Click "Start Import" button
4. Observe progress indicator
5. Wait for import to complete

**Expected Results**:
- [ ] Review step shows accurate summary
- [ ] No duplicate conflicts (first import)
- [ ] Progress spinner/bar displays during import
- [ ] Import completes successfully
- [ ] Success message: "Import completed successfully"
- [ ] Summary stats displayed:
  - Players created: 4
  - Guardians created: 4
  - Enrollments created: 4

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

## Section 2: Guardian Matching with Confidence Indicators

**Purpose**: Verify guardian matching displays confidence scores with color-coded indicators.
**Duration**: ~20 minutes
**Prerequisites**: Completed Section 1 (base guardians imported)

### Test 2.1: Import CSV with Duplicate Guardians

**Steps**:
1. Return to import page: `/orgs/[orgId]/import`
2. Upload `step2-duplicate-test.csv`
3. Map fields (should auto-map if using same structure)
4. Click "Next" to proceed to review step

**Expected Results**:
- [ ] Upload successful
- [ ] Mapping auto-detected
- [ ] Review step shows duplicate guardian conflicts
- [ ] Duplicate section visible with 3-4 duplicate matches

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 2.2: Verify Confidence Score Display

**Steps**:
1. On review step, locate duplicate guardian cards
2. Observe confidence badges for each duplicate
3. Check for three confidence levels:
   - **HIGH** (60-100): Green badge with checkmark icon
   - **MEDIUM** (40-59): Yellow badge with alert icon
   - **LOW** (0-39): Red badge with X icon

**Expected Results**:
- [ ] Each duplicate shows confidence badge at top of card
- [ ] **High Confidence** match visible (green, 60+)
  - Example: Full match (email, phone, name, address)
- [ ] **Medium Confidence** match visible (yellow, 40-59)
  - Example: Email + name match, but different phone
- [ ] **Low Confidence** match visible (red, <40)
  - Example: Name similarity only
- [ ] Badge color matches confidence level
- [ ] Progress bar below badge shows percentage (0-100%)
- [ ] Progress bar color matches badge color

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 2.3: Verify Match Score Breakdown

**Steps**:
1. Click "Match Details" or expand arrow on a duplicate card
2. Review breakdown of contributing signals:
   - Email match: ✓ or ✗ (40% weight)
   - Phone match: ✓ or ✗ (30% weight)
   - Name similarity: percentage (20% weight)
   - Address match: ✓ or ✗ (10% weight)
3. Verify calculated confidence score displayed

**Expected Results**:
- [ ] Match details section expands/collapses
- [ ] All 4 signal types displayed
- [ ] Checkmarks (✓) for matched signals
- [ ] X marks (✗) for non-matched signals
- [ ] Name similarity shows percentage score
- [ ] Weight percentages shown for each signal
- [ ] Final confidence score calculation visible
- [ ] Mobile: Details stack vertically (test at 375px width)

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

## Section 3: Admin Override Controls

**Purpose**: Verify admin can override confidence-based auto-linking decisions.
**Duration**: ~15 minutes
**Prerequisites**: Section 2 complete (duplicate matches visible)

### Test 3.1: Force Link (Low Confidence Override)

**Steps**:
1. On review step, find a **LOW confidence** duplicate match (red badge, <40)
2. Verify "Force Link" button visible (admin/owner only)
3. Click "Force Link" button
4. Observe confirmation dialog

**Expected Results**:
- [ ] "Force Link" button visible on low confidence matches
- [ ] Button NOT visible to non-admin users (test with coach/parent account)
- [ ] Confirmation dialog opens with title: "Force Link Guardian?"
- [ ] Dialog shows guardian details (name, email, phone, address)
- [ ] Dialog shows match signals and current confidence score
- [ ] Optional "Reason" text field visible
- [ ] "Confirm" and "Cancel" buttons present

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 3.2: Apply Force Link Override

**Steps**:
1. In Force Link confirmation dialog, enter reason: "Manual verification confirmed match"
2. Click "Confirm" button
3. Observe duplicate card update

**Expected Results**:
- [ ] Dialog closes after confirmation
- [ ] Duplicate card shows override badge: "Admin Override: Force Linked"
- [ ] Badge color: blue (override indicator)
- [ ] Original confidence score still visible
- [ ] Override recorded in import session duplicates array

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 3.3: Reject Link (High Confidence Override)

**Steps**:
1. Find a **HIGH confidence** duplicate match (green badge, 60+)
2. Verify "Reject Link" button visible
3. Click "Reject Link" button
4. In confirmation dialog, enter reason: "Different person with same name"
5. Click "Confirm"

**Expected Results**:
- [ ] "Reject Link" button visible on high confidence matches
- [ ] Confirmation dialog opens with title: "Reject Guardian Match?"
- [ ] Dialog shows match details and warning about creating new guardian
- [ ] Optional "Reason" text field visible
- [ ] After confirmation, duplicate card shows: "Admin Override: Rejected"
- [ ] Badge color: red (rejection indicator)
- [ ] Player will create NEW guardian instead of linking

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 3.4: Complete Import with Overrides

**Steps**:
1. After applying overrides, click "Start Import" button
2. Wait for import to complete
3. Verify import respects admin overrides

**Expected Results**:
- [ ] Import executes successfully
- [ ] Force-linked player links to existing guardian (despite low confidence)
- [ ] Rejected player creates new guardian (despite high confidence)
- [ ] Import summary shows correct stats
- [ ] Override audit trail preserved in import session

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

## Section 4: Import History

**Purpose**: Verify import history page displays all completed imports with accurate stats.
**Duration**: ~10 minutes
**Prerequisites**: Completed at least 2 imports (Section 1 + Section 3)

### Test 4.1: Access Import History

**Steps**:
1. Navigate to `/orgs/[orgId]/import/history`
2. Verify import history page loads

**Expected Results**:
- [ ] Import history page loads without errors
- [ ] Page title: "Import History"
- [ ] Table/list of completed imports visible
- [ ] Minimum 2 imports visible (from previous tests)

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 4.2: Verify Import History Display

**Steps**:
1. Review each import entry in the list
2. Check displayed information for each import

**Expected Results**:
- [ ] Each import shows:
  - Import date/time
  - Status badge (Completed / Failed / Undone)
  - Players created count
  - Guardians created/linked count
  - Source file name
- [ ] Most recent import at top (descending order)
- [ ] Action buttons visible: "Details" and "Undo"
- [ ] Desktop: Table layout with columns
- [ ] Mobile (<768px): Card layout stacked vertically

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 4.3: Filter and Search

**Steps**:
1. If available, test status filter dropdown (All / Completed / Failed / Undone)
2. If available, test date range filter
3. If available, test search by file name

**Expected Results**:
- [ ] Status filter works correctly
- [ ] Only selected statuses display
- [ ] Date range filters correctly
- [ ] Search filters by source file name
- [ ] Result count updates dynamically

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

## Section 5: Import Details View

**Purpose**: Verify import details dialog shows comprehensive session information.
**Duration**: ~20 minutes
**Prerequisites**: Section 4 complete (import history visible)

### Test 5.1: Open Import Details Dialog

**Steps**:
1. On import history page, click "Details" button for most recent import
2. Verify import details dialog opens

**Expected Results**:
- [ ] Dialog opens with title: "Import Details - [Date/Time]"
- [ ] Dialog contains Tabs: "Overview" and "Players"
- [ ] "Overview" tab selected by default
- [ ] Close button (X) visible in dialog header

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 5.2: Verify Overview Tab - Metadata Section

**Steps**:
1. Review import metadata section in Overview tab

**Expected Results**:
- [ ] Metadata section displays:
  - Import ID (for support reference)
  - Started by: [User Name]
  - Started at: [Date/Time]
  - Completed at: [Date/Time]
  - Duration: [X minutes Y seconds]
  - Template used: [Template Name] or "Custom"
  - Source file: [filename.csv]
- [ ] All timestamps formatted correctly
- [ ] Duration calculation accurate

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 5.3: Verify Overview Tab - Stats Section

**Steps**:
1. Review statistics breakdown section

**Expected Results**:
- [ ] Stats section displays:
  - Total rows processed
  - Players created
  - Players updated (if any)
  - Players skipped (if any)
  - Guardians created
  - Guardians linked
  - Enrollments created
  - Sport passports created (if applicable)
  - Benchmarks applied (if applicable)
- [ ] Stats match import summary from completion step
- [ ] Numbers accurate and non-negative

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 5.4: Verify Overview Tab - Errors Section

**Steps**:
1. If import had errors, review errors section
2. If no errors, verify section shows "No errors" message

**Expected Results**:
- [ ] Errors section visible
- [ ] If errors exist:
  - Error count badge displayed
  - Each error shows: Row number, Player name, Error message
  - Errors are scrollable if many
  - Errors can expand/collapse for details
- [ ] If no errors: "No errors encountered" message

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 5.5: Verify Overview Tab - Duplicates Section

**Steps**:
1. If import had duplicates, review duplicates section
2. Check for admin overrides (if applied in Section 3)

**Expected Results**:
- [ ] Duplicates section visible
- [ ] Each duplicate shows:
  - Player name
  - Guardian name
  - Confidence score and level
  - Resolution applied (Merged / Skipped / Force Linked / Rejected)
- [ ] Admin overrides indicated with badge
- [ ] Override reason visible (if provided)
- [ ] Match signals shown (email, phone, name, address)

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 5.6: Verify Export Details Functionality

**Steps**:
1. Click "Export Details" button at bottom of dialog
2. Verify JSON file download

**Expected Results**:
- [ ] "Export Details" button visible
- [ ] Clicking button triggers file download
- [ ] Downloaded file name: `import-[sessionId]-details.json`
- [ ] JSON file contains:
  - importId
  - startedAt, completedAt
  - status
  - sourceInfo
  - stats object
  - errors array
  - duplicates array
  - initiatedBy (user ID)
- [ ] JSON properly formatted (valid syntax)
- [ ] Success toast notification: "Import details exported"

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 5.7: Verify Players Tab

**Steps**:
1. Click "Players" tab in import details dialog
2. Verify player list displays

**Expected Results**:
- [ ] Players tab loads without errors
- [ ] Player count badge on tab: "Players (X)"
- [ ] Table displays with columns:
  - Name
  - DOB (Date of Birth)
  - Gender
  - Guardian
  - Status (Active/Inactive)
  - Teams (team count or names)
- [ ] All players from this import session shown

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 5.8: Players Tab - Search Functionality

**Steps**:
1. On Players tab, locate search input: "Search players..."
2. Type partial player name (e.g., "Test")
3. Verify filtering works
4. Clear search input

**Expected Results**:
- [ ] Search input visible above player table
- [ ] Typing filters player list in real-time
- [ ] Case-insensitive search works
- [ ] Searches player first name, last name, and full name
- [ ] Searches guardian name as well
- [ ] Result count updates: "Showing X of Y players"
- [ ] Clear button (X) appears in search input when text entered
- [ ] Clearing search shows all players again

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 5.9: Players Tab - Sorting

**Steps**:
1. Click column header "Name"
2. Verify sort order changes (A→Z, then Z→A)
3. Click column header "DOB"
4. Verify sort by date of birth works
5. Click column header "Status"

**Expected Results**:
- [ ] Clicking column header sorts table
- [ ] First click: ascending order
- [ ] Second click: descending order
- [ ] Sort indicator (arrow ↑ or ↓) shows current sort direction
- [ ] Name sorts alphabetically
- [ ] DOB sorts chronologically (oldest to newest, then newest to oldest)
- [ ] Status sorts: Active before Inactive (or vice versa)

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 5.10: Players Tab - Pagination

**Steps**:
1. If import has >50 players, verify pagination controls
2. If <50 players, skip this test (mark N/A)
3. Navigate to page 2

**Expected Results**:
- [ ] Pagination controls visible at bottom of table (if >50 players)
- [ ] Shows "Page 1 of X" or similar indicator
- [ ] "Next" button enabled (if more pages)
- [ ] "Previous" button disabled on page 1
- [ ] Clicking "Next" loads next 50 players
- [ ] Page indicator updates correctly
- [ ] "Previous" button now enabled
- [ ] If ≤50 players: "Showing all X players" message

**Status**: ⬜ Pass ⬜ Fail ⬜ N/A
**Notes**: _______________________________________________

---

### Test 5.11: Players Tab - Player Navigation

**Steps**:
1. Click on any player row in the table
2. Verify navigation to player passport

**Expected Results**:
- [ ] Clicking player row navigates to player passport
- [ ] URL changes to: `/orgs/[orgId]/players/[playerId]`
- [ ] Player passport page loads
- [ ] Player details shown correctly
- [ ] Browser back button returns to import details dialog

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 5.12: Players Tab - Mobile Responsive

**Steps**:
1. Resize browser to mobile width (375px) or use DevTools device emulation
2. Verify Players tab layout adapts

**Expected Results**:
- [ ] At <768px width, table becomes card list
- [ ] Each player shown as individual card
- [ ] Card displays: Name, DOB, Gender, Guardian, Status, Teams
- [ ] Cards stack vertically
- [ ] Search and filter controls stack vertically
- [ ] Pagination controls remain visible and usable
- [ ] Touch-friendly tap targets (44x44px minimum)

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

## Section 6: Partial Undo

**Purpose**: Verify selective player removal from completed imports.
**Duration**: ~20 minutes
**Prerequisites**: Completed Section 1 (at least one import with 4+ players)

### Test 6.1: Open Partial Undo Dialog

**Steps**:
1. Navigate to import history: `/orgs/[orgId]/import/history`
2. Find completed import from Section 1 or 3
3. Click "Undo" button for that import

**Expected Results**:
- [ ] "Undo" button visible for completed imports
- [ ] "Undo" button disabled for failed/undone imports
- [ ] Clicking "Undo" opens AlertDialog
- [ ] Dialog title: "Remove Players from Import"
- [ ] Dialog shows list of all players from that import

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 6.2: Player Selection List

**Steps**:
1. Review player list in partial undo dialog
2. Observe displayed information for each player

**Expected Results**:
- [ ] Each player row displays:
  - Checkbox (unchecked by default)
  - Full Name
  - Date of Birth
  - Status (Active/Inactive)
  - Related Records Count (e.g., "2 enrollments, 1 passport, 0 assessments")
- [ ] "Select All" checkbox at top of list
- [ ] Selected count badge: "0 players selected" initially
- [ ] List scrollable if many players
- [ ] Mobile: Checkboxes touch-friendly (44x44px minimum)

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 6.3: Player Selection

**Steps**:
1. Click checkbox for 2 players
2. Observe selected count update
3. Click "Select All" checkbox
4. Observe all players selected
5. Click "Select All" again to deselect all

**Expected Results**:
- [ ] Clicking player checkbox toggles selection
- [ ] Selected count badge updates dynamically: "2 players selected"
- [ ] "Select All" selects all players in current filtered list
- [ ] Selected count shows total: "4 players selected" (or total count)
- [ ] "Select All" again deselects all players
- [ ] Selected count resets to "0 players selected"
- [ ] Checkboxes visually indicate selected state (checked/unchecked)

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 6.4: Search Functionality

**Steps**:
1. In search input, type partial player name
2. Verify player list filters
3. Select a filtered player
4. Clear search
5. Verify selected player remains selected

**Expected Results**:
- [ ] Search input visible: "Search players..."
- [ ] Typing filters player list in real-time
- [ ] Case-insensitive search
- [ ] Searches first name, last name, full name
- [ ] Result count updates: "Showing X of Y players"
- [ ] Selected players remain selected when filtering
- [ ] Clear button (X) visible when text entered
- [ ] Clearing search shows all players again
- [ ] Search debounced (300ms delay)

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 6.5: Status Filter

**Steps**:
1. Locate status filter dropdown
2. Change filter to "Active" only
3. Verify only active players shown
4. Change filter to "Inactive"
5. Reset filter to "All Players"

**Expected Results**:
- [ ] Status filter dropdown visible
- [ ] Options: "All Players", "Active", "Inactive"
- [ ] Selecting "Active" filters to active enrollments only
- [ ] Selecting "Inactive" filters to inactive enrollments only
- [ ] "All Players" shows all players again
- [ ] Filter persists during selection (selected players remain selected)
- [ ] Result count updates correctly

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 6.6: Impact Preview - Selection

**Steps**:
1. Select 2 players using checkboxes
2. Scroll to "Preview Impact" section below player list
3. Review impact preview

**Expected Results**:
- [ ] "Preview Impact" section visible below player list
- [ ] Uses Alert component (warning variant - yellow/orange)
- [ ] Shows cascading deletions for selected players:
  - Player identities: 2 records
  - Player enrollments: 2 records
  - Guardian links: X records
  - Sport passports: X records
  - Team assignments: X records (if any)
  - Skill assessments: X records (if any)
  - Development goals: X records (if any)
  - Voice notes: X records (if any)
- [ ] Impact updates dynamically as selection changes
- [ ] Numbers are accurate (query actual records)

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 6.7: Impact Preview - Orphaned Guardians Warning

**Steps**:
1. Select player(s) that will orphan a guardian (guardian with only this player)
2. Observe orphan warning in impact preview

**Expected Results**:
- [ ] If selecting will orphan guardians, warning shows:
  - "⚠️ Warning: X guardians will have no linked players"
- [ ] Warning uses destructive/alert styling
- [ ] Orphan count accurate
- [ ] Guardians will NOT be deleted (just unlinked)

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 6.8: Total Impact Summary

**Steps**:
1. Review bottom of impact preview section
2. Verify total summary displayed

**Expected Results**:
- [ ] Total impact summary at bottom: "Total: X records will be deleted"
- [ ] Total count includes all cascading deletions
- [ ] Number accurate and updates with selection

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 6.9: Remove Button State

**Steps**:
1. With no players selected, observe "Remove" button state
2. Select 1 player
3. Observe "Remove" button state change

**Expected Results**:
- [ ] "Remove" button disabled when no players selected
- [ ] "Remove" button enabled when ≥1 player selected
- [ ] Button text: "Remove X Players" (dynamic count)

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 6.10: Execute Partial Undo

**Steps**:
1. Select 2 players for removal
2. Click "Remove 2 Players" button
3. Observe loading spinner
4. Wait for operation to complete
5. Verify success notification

**Expected Results**:
- [ ] Clicking "Remove" button triggers deletion
- [ ] Loading spinner displays: "Removing 2 players..."
- [ ] Button disabled during deletion
- [ ] Deletion completes successfully
- [ ] Success toast notification: "Successfully removed 2 players"
- [ ] Dialog closes automatically
- [ ] Import history page refreshes

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 6.11: Verify Updated Import History

**Steps**:
1. After partial undo completes, verify import history updated
2. Locate the import that was partially undone
3. Check updated stats

**Expected Results**:
- [ ] Import stats updated correctly:
  - Players created count decreased by 2
  - Total players shown accurately reflects removal
- [ ] If all players removed, import status changes to "Undone"
- [ ] Import entry remains in history (not deleted)

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 6.12: Verify Cascading Deletion

**Steps**:
1. Navigate to Players page or Guardians page
2. Verify removed players no longer appear
3. Verify related records deleted:
   - Enrollments removed
   - Passports removed
   - Team assignments removed (if any)
   - Assessments removed (if any)

**Expected Results**:
- [ ] Removed players not in players list
- [ ] Player passports inaccessible (404 or not found)
- [ ] Enrollments removed from database
- [ ] Passports removed from database
- [ ] Team rosters updated (players removed)
- [ ] Orphaned guardians remain but have no linked players
- [ ] Non-orphaned guardians retain links to other players

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 6.13: Atomic Transaction (Error Handling)

**Steps**:
1. This test verifies rollback behavior on failure
2. *Advanced test - may require simulating failure condition*
3. If not testable manually, mark as N/A

**Expected Results**:
- [ ] If any deletion fails, entire transaction rolls back
- [ ] No partial deletions (all or nothing)
- [ ] Error toast notification displays with error message
- [ ] Database remains in consistent state

**Status**: ⬜ Pass ⬜ Fail ⬜ N/A
**Notes**: _______________________________________________

---

## Section 7: Platform Analytics Dashboard

**Purpose**: Verify platform staff can view cross-org import analytics.
**Duration**: ~15 minutes
**Prerequisites**: Multiple imports completed, platform staff account

### Test 7.1: Access Analytics Dashboard

**Steps**:
1. Log out of org admin account
2. Log in as platform staff: `neil.B@blablablak.com` / `lien1979`
3. Navigate to `/platform/analytics/import`
4. Verify analytics dashboard loads

**Expected Results**:
- [ ] Platform staff can access analytics page
- [ ] Non-platform-staff users redirected to org dashboard
- [ ] Analytics dashboard loads without errors
- [ ] Page title: "Import Analytics" or similar

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 7.2: Key Metrics Cards

**Steps**:
1. Review key metrics cards at top of dashboard
2. Verify all metrics display

**Expected Results**:
- [ ] **Total Imports** card visible
  - Shows count of all imports platform-wide
  - Trend indicator (↑ or ↓) if applicable
- [ ] **Success Rate** card visible
  - Shows percentage: (successful / total) × 100
  - Color-coded badge:
    - Green: >90% success rate
    - Yellow: 70-89% success rate
    - Red: <70% success rate
- [ ] **Total Players Imported** card visible
  - Shows total players across all orgs
  - Breakdown by time period (if available)
- [ ] **Average Import Size** card visible
  - Shows average players per import
- [ ] All cards use shadcn/ui Card component
- [ ] Cards responsive on mobile (stack vertically)

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 7.3: Time Period Selector

**Steps**:
1. Locate time period selector (tabs or dropdown)
2. Change time period:
   - Last 7 Days
   - Last 30 Days
   - Last 90 Days
   - All Time
3. Verify metrics update

**Expected Results**:
- [ ] Time period selector visible
- [ ] Options: Last 7 Days | Last 30 Days | Last 90 Days | All Time
- [ ] Selecting period updates all metrics
- [ ] Data filters correctly by date range
- [ ] Loading indicator shows during data fetch

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 7.4: Import Activity Chart

**Steps**:
1. Scroll to import activity chart
2. Review chart display

**Expected Results**:
- [ ] Chart displays import activity over time
- [ ] X-axis: Date/time
- [ ] Y-axis: Number of imports
- [ ] Line chart or bar chart format
- [ ] Uses recharts library (smooth rendering)
- [ ] Hover shows data point details (date, count)
- [ ] Mobile: Chart scrolls horizontally if needed or adapts responsively

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 7.5: Common Errors Table

**Steps**:
1. Scroll to common errors section
2. Review error table

**Expected Results**:
- [ ] Common errors table visible
- [ ] Table columns:
  - Error message
  - Count (number of occurrences)
  - Percentage (of total errors)
- [ ] Sorted by count (most common first)
- [ ] Shows top 10 errors
- [ ] If no errors: "No errors recorded" message
- [ ] Mobile: Table adapts or becomes scrollable

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test 7.6: Org-Level Import History

**Steps**:
1. If available, locate org-level import history section
2. Review organization breakdown

**Expected Results**:
- [ ] Org-level section shows import stats per organization
- [ ] Lists organizations with import activity
- [ ] For each org shows:
  - Organization name
  - Total imports
  - Success/failure counts
  - Success rate percentage
- [ ] Sortable by org name or stats
- [ ] Filterable by org (if many orgs)

**Status**: ⬜ Pass ⬜ Fail ⬜ N/A
**Notes**: _______________________________________________

---

### Test 7.7: Analytics Performance

**Steps**:
1. Refresh analytics page
2. Observe load time
3. Change time period and observe query speed

**Expected Results**:
- [ ] Analytics page loads in <3 seconds
- [ ] Metrics queries complete in <2 seconds
- [ ] No performance issues with large datasets
- [ ] Loading indicators show during data fetch
- [ ] No console errors

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

## Mobile Responsiveness Testing

**Purpose**: Verify all import features work correctly on mobile devices.
**Duration**: ~15 minutes

### Test M.1: Import Wizard Mobile Layout

**Steps**:
1. Resize browser to 375px width or use DevTools device emulation (iPhone SE)
2. Navigate through import wizard (upload → map → review → complete)

**Expected Results**:
- [ ] All wizard steps accessible on mobile
- [ ] Buttons remain visible without horizontal scrolling
- [ ] Progress stepper adapts (stacks or simplifies)
- [ ] Upload area touch-friendly
- [ ] Field mapping dropdowns usable
- [ ] Review step scrollable
- [ ] "Start Import" button accessible

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test M.2: Duplicate Resolution Mobile

**Steps**:
1. At 375px width, review duplicate resolution cards
2. Test confidence indicators and match details

**Expected Results**:
- [ ] Duplicate cards stack vertically
- [ ] Confidence badges visible
- [ ] Match details expand/collapse smoothly
- [ ] Force Link / Reject Link buttons accessible
- [ ] No horizontal overflow
- [ ] Touch targets ≥44x44px

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test M.3: Partial Undo Dialog Mobile

**Steps**:
1. At 375px width, open partial undo dialog
2. Test player selection and search

**Expected Results**:
- [ ] Dialog fits viewport (max height respects 375px)
- [ ] Player list scrollable
- [ ] Checkboxes touch-friendly (44x44px)
- [ ] Search input full width
- [ ] Status filter dropdown usable
- [ ] Impact preview sticky at bottom or scrollable
- [ ] Remove button always accessible

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Test M.4: Import Details Dialog Mobile

**Steps**:
1. At 375px width, open import details dialog
2. Test both Overview and Players tabs

**Expected Results**:
- [ ] Dialog responsive on mobile
- [ ] Tabs accessible and switchable
- [ ] Overview content scrollable
- [ ] Players tab becomes card list (not table)
- [ ] Search and filter controls stack vertically
- [ ] Pagination controls accessible
- [ ] Export button accessible
- [ ] Close button visible

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

## Final Verification

### Quality Checks

Run the following commands to verify code quality:

```bash
# 1. Convex codegen
npx -w packages/backend convex codegen

# 2. TypeScript check
npm run check-types

# 3. Linting
npx ultracite fix
npm run check
```

**Expected Results**:
- [ ] Convex codegen passes without errors
- [ ] TypeScript check passes (ignore pre-existing errors in migrations/)
- [ ] Biome linting passes with no new errors

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

### Browser Console Errors

**Steps**:
1. Open browser DevTools console
2. Navigate through import flow and all features tested
3. Check for JavaScript errors

**Expected Results**:
- [ ] No console errors during import flow
- [ ] No console errors in import history
- [ ] No console errors in partial undo
- [ ] No console errors in import details
- [ ] No console errors in analytics dashboard
- [ ] Warnings acceptable (not errors)

**Status**: ⬜ Pass ⬜ Fail
**Notes**: _______________________________________________

---

## Test Summary

**Tester Name**: _____________________
**Date Completed**: _____________________
**Total Duration**: _________ minutes

### Test Results Overview

| Section | Pass | Fail | N/A | Notes |
|---------|------|------|-----|-------|
| 1. Base Import Flow | ⬜ | ⬜ | ⬜ | |
| 2. Confidence Indicators | ⬜ | ⬜ | ⬜ | |
| 3. Admin Override Controls | ⬜ | ⬜ | ⬜ | |
| 4. Import History | ⬜ | ⬜ | ⬜ | |
| 5. Import Details View | ⬜ | ⬜ | ⬜ | |
| 6. Partial Undo | ⬜ | ⬜ | ⬜ | |
| 7. Analytics Dashboard | ⬜ | ⬜ | ⬜ | |
| Mobile Responsiveness | ⬜ | ⬜ | ⬜ | |
| Quality Checks | ⬜ | ⬜ | ⬜ | |

### Critical Issues Found

_List any blocking issues that prevent features from working:_

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Minor Issues / Enhancements

_List any non-blocking issues or suggested improvements:_

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Sign-Off

**Tester Signature**: _____________________
**Approval Status**: ⬜ Approved ⬜ Approved with Conditions ⬜ Rejected

**Reviewer Signature**: _____________________
**Date**: _____________________

---

## Appendix: Test Data Reference

### step1-base-guardians.csv

Located at: `docs/testing/import/test-data/step1-base-guardians.csv`

Creates 4 players with distinct guardian patterns for confidence testing:
1. Guardian Full - Complete data (email, phone, name, address)
2. Guardian EmailName - Email and name only
3. Guardian PhoneOnly - Phone and name only
4. Different Name - Email only with different name

### step2-duplicate-test.csv

Located at: `docs/testing/import/test-data/step2-duplicate-test.csv`

Creates 4 players matching guardians from step 1:
1. HIGH confidence match - All signals match (email, phone, name, address)
2. MEDIUM confidence match - Email + name match (no phone)
3. LOW confidence match - Name similarity only
4. NO match - Different email with name match

### Expected Confidence Scores

Based on weighting (Email 40%, Phone 30%, Name 20%, Address 10%):

- **HIGH**: 90-100% (all signals match)
- **MEDIUM**: 50-60% (email + name, or phone + name)
- **LOW**: 20-30% (name similarity only)

---

**End of Test Plan**
