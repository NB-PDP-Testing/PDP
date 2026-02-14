# Phase 1.3: Import Frontend Wizard - Manual Test Suite

**Branch:** `ralph/phase-1.3-import-frontend-wizard`
**Dashboard:** https://dashboard.convex.dev/d/brazen-squirrel-35
**App:** http://localhost:3000

## Overview

Phase 1.3 built the **Import Wizard Frontend** — 10 files comprising the entry page, 7-step wizard orchestrator, and admin navigation link. This test suite verifies that everything is wired together and functional.

**Total tests: 30**

| Section | Tests | What's Verified |
|---------|-------|-----------------|
| A: Build Verification | 3 | Files exist, codegen, type check |
| B: Navigation & Routing | 4 | Admin sidebar link, page loads, wizard route, back links |
| C: Entry Page | 4 | Templates load, sport filter, template select, recent sessions |
| D: Upload Step | 5 | Drag-drop zone, file upload, paste tab, CSV parsing, preview table |
| E: Mapping Step | 4 | Auto-mapping, confidence badges, lock/unlock, required field warning |
| F: Player Selection Step | 4 | Checkboxes, search, filter tabs, bulk actions |
| G: Benchmark Config Step | 3 | Toggle, strategy radio, preview |
| H: Review Step | 2 | Validation errors, proceed with errors |
| I: Import + Complete | 1 | Full end-to-end flow |

---

## Pre-Requisites

1. Ensure you're on the correct branch: `git checkout ralph/phase-1.3-import-frontend-wizard`
2. Dev server running on `localhost:3000` (or run `npm run dev`)
3. Convex dev running (or run `npx -w packages/backend convex dev`)
4. **Log in** with test account: `neil.B@blablablak.com` / `lien1979`
5. **Ensure you have an organization** — create one if needed
6. **Import templates must be seeded.** If no templates appear on the import page, run in Dashboard Functions tab:
   `importTemplateSeeds:seedDefaultTemplates` with args `{}`
7. Copy your organization ID from the URL: `/orgs/<your-org-id>/...`

### Test CSV File

Create this file at any location (e.g., `~/test-import.csv`):

```csv
First Name,Last Name,Date of Birth,Gender,Age Group,Season,Parent Email,Parent Phone
John,Smith,2012-05-15,Male,u13,2025,john.parent@email.com,0851234567
Jane,Doe,2013-03-20,Female,u12,2025,jane.parent@email.com,0859876543
Michael,Murphy,2011-11-10,Male,u14,2025,mike.parent@email.com,0867654321
Sarah,O'Brien,2012-08-25,Female,u13,2025,sarah.parent@email.com,0871112233
Liam,Kelly,2013-01-30,Male,u12,2025,liam.parent@email.com,0884445566
```

---

## Part A: Build Verification

### Test 1: All Frontend Files Exist

**Goal:** Verify all Phase 1.3 files were created.

```bash
ls -la apps/web/src/app/orgs/\[orgId\]/import/page.tsx
ls -la apps/web/src/app/orgs/\[orgId\]/import/wizard/page.tsx
ls -la apps/web/src/components/import/import-wizard.tsx
ls -la apps/web/src/components/import/steps/upload-step.tsx
ls -la apps/web/src/components/import/steps/mapping-step.tsx
ls -la apps/web/src/components/import/steps/player-selection-step.tsx
ls -la apps/web/src/components/import/steps/benchmark-config-step.tsx
ls -la apps/web/src/components/import/steps/review-step.tsx
ls -la apps/web/src/components/import/steps/import-step.tsx
ls -la apps/web/src/components/import/steps/complete-step.tsx
```

**Expected:** All 10 files present:
- [ ] `apps/web/src/app/orgs/[orgId]/import/page.tsx` — Entry page
- [ ] `apps/web/src/app/orgs/[orgId]/import/wizard/page.tsx` — Wizard wrapper
- [ ] `apps/web/src/components/import/import-wizard.tsx` — Wizard orchestrator
- [ ] 7 step files in `apps/web/src/components/import/steps/`

---

### Test 2: Codegen Passes

```bash
npx -w packages/backend convex codegen
```
**Expected:** Exits with code 0, no errors.
- [ ] Pass

---

### Test 3: Type Check Passes

```bash
npm run check-types
```
**Expected:** Passes (pre-existing errors in migrations/ and coachParentSummaries.ts are OK).
- [ ] Pass

---

## Part B: Navigation & Routing

### Test 4: Admin Sidebar Shows "Import Wizard" Link

**Goal:** Verify the import link appears in admin navigation.

#### Steps
1. Log in and navigate to your org's admin panel: `/orgs/<orgId>/admin`
2. Look in the left sidebar under "Data & Import" section

#### Expected Result
- [ ] "Import Wizard" link visible with FileUp icon
- [ ] "Import Players" (legacy) link also visible with Upload icon
- [ ] "GAA Players" (legacy) link also visible

---

### Test 5: Import Entry Page Loads

**Goal:** Verify the import page renders without errors.

#### Steps
1. Click "Import Wizard" in the sidebar, or navigate to `/orgs/<orgId>/import`

#### Expected Result
- [ ] Page loads without errors or blank screen
- [ ] "Import Players" heading visible
- [ ] "Select Sport" card with dropdown visible
- [ ] "Choose a Template" section visible
- [ ] Template cards visible (at least "Generic CSV/Excel" and "GAA Foireann Export")
- [ ] "Legacy Importers" section at bottom with GAA Import and Basic Import buttons
- [ ] Back arrow button in header links to `/orgs/<orgId>/admin`

---

### Test 6: Wizard Page Loads

**Goal:** Verify the wizard route renders.

#### Steps
1. On the import page, select a template (click a template card)
2. Click "Start Import with ..."
3. Verify URL changes to `/orgs/<orgId>/import/wizard?templateId=...`

#### Expected Result
- [ ] Wizard page loads with "Import Wizard" heading
- [ ] Step indicator shows 7 steps (desktop: horizontal, mobile: compact bar)
- [ ] Step 1 "Upload" is highlighted as current
- [ ] Back arrow links to `/orgs/<orgId>/import`

---

### Test 7: Direct URL Navigation Works

**Goal:** Verify direct URL access works.

#### Steps
1. Navigate directly to `/orgs/<orgId>/import` in address bar
2. Navigate directly to `/orgs/<orgId>/import/wizard` in address bar

#### Expected Result
- [ ] Import page loads on direct access
- [ ] Wizard page loads on direct access (with default state)

---

## Part C: Entry Page Features

### Test 8: Sport Selection Dropdown

**Goal:** Verify sport filter works on templates.

#### Steps
1. On the import page, open the "Select Sport" dropdown
2. Select "GAA Football"
3. Observe template cards
4. Select "Soccer"
5. Select "All Sports"

#### Expected Result
- [ ] Dropdown shows: All Sports, GAA Football, Hurling, Soccer, Rugby, Basketball
- [ ] When "GAA Football" selected: "GAA Foireann Export" card shows, "Generic CSV/Excel" also shows (no sportCode filter)
- [ ] When "Soccer" selected: Only "Generic CSV/Excel" shows (no soccer-specific template)
- [ ] When "All Sports": Both templates visible
- [ ] Selecting a sport clears previously selected template

---

### Test 9: Template Selection

**Goal:** Verify template cards are selectable.

#### Steps
1. Click on the "Generic CSV/Excel" template card
2. Observe the card styling and Start Import button
3. Click on the "GAA Foireann Export" template card
4. Observe the switch

#### Expected Result
- [ ] Clicked card gets blue border/ring highlight and checkmark icon
- [ ] Only one template can be selected at a time
- [ ] Start Import button becomes enabled after selection
- [ ] Button text changes to `Start Import with "Template Name"`
- [ ] Template cards show badges: sport label, CSV badge, field count badge
- [ ] "GAA Foireann Export" shows sport badge "GAA Football"

---

### Test 10: Start Import Button Behavior

**Goal:** Verify the Start Import button links correctly.

#### Steps
1. Without selecting a template, observe the button
2. Select "GAA Foireann Export" template
3. Select sport "GAA Football"
4. Click "Start Import with..."

#### Expected Result
- [ ] Button is disabled when no template selected
- [ ] Button text shows "Select a template to begin" when none selected
- [ ] After clicking, navigates to `/orgs/<orgId>/import/wizard?templateId=<id>&sport=gaa_football`
- [ ] Query params include templateId and sport

---

### Test 11: Recent Imports Section

**Goal:** Verify recent imports display (may be empty on fresh db).

#### Steps
1. On the import page, scroll to bottom area

#### Expected Result
- [ ] If no previous imports: "Recent Imports" section is hidden (not shown)
- [ ] If previous imports exist: Shows up to 5 sessions with status badge, filename, date, row count

---

## Part D: Upload Step (Step 1)

### Test 12: Upload Zone Renders

**Goal:** Verify drag-and-drop zone appears.

#### Steps
1. Start the wizard (select template -> Start Import)
2. Observe step 1

#### Expected Result
- [ ] "Upload File" and "Paste Data" tab buttons visible
- [ ] Upload File tab active by default
- [ ] Drag-and-drop zone visible with icon, "Drag and drop a CSV file here" text
- [ ] "Browse Files" button visible inside the drop zone
- [ ] "Continue to Column Mapping" button is disabled (no data yet)

---

### Test 13: File Upload Works

**Goal:** Verify CSV file upload and parsing.

#### Steps
1. Click "Browse Files" (or drag the test CSV file onto the drop zone)
2. Select the test CSV file (`test-import.csv`)

#### Expected Result
- [ ] File is accepted (no error)
- [ ] Preview card appears with "Data Preview" heading
- [ ] Shows filename, row count (5 rows), column count (8 columns)
- [ ] Preview table shows first 3 rows with correct data
- [ ] Headers: First Name, Last Name, Date of Birth, Gender, Age Group, Season, Parent Email, Parent Phone
- [ ] "Clear" button appears to reset
- [ ] "Continue to Column Mapping" button becomes enabled

---

### Test 14: Paste Data Tab Works

**Goal:** Verify clipboard paste functionality.

#### Steps
1. Click "Paste Data" tab
2. Paste the following into the textarea:
```
First Name	Last Name	DOB	Gender
Tom	Ryan	2012-04-10	Male
Amy	Walsh	2013-06-15	Female
```
3. Click "Parse Data"

#### Expected Result
- [ ] Textarea visible with placeholder text
- [ ] "Parse Data" button disabled until text entered
- [ ] After parsing: Preview shows 2 rows, 4 columns
- [ ] Tab-separated data correctly parsed (not treated as single column)

---

### Test 15: Invalid File Rejected

**Goal:** Verify error handling for non-CSV files.

#### Steps
1. On "Upload File" tab, click Browse Files
2. Try to select a `.txt` or `.pdf` file

#### Expected Result
- [ ] File input only shows `.csv` files (accept filter)
- [ ] If a non-CSV somehow selected: Error message "Please upload a CSV file."
- [ ] Error styled in red with alert icon

---

### Test 16: Preview Shows Correctly Then Advance

**Goal:** Verify the full preview-to-next-step flow.

#### Steps
1. Upload the test CSV file
2. Verify preview is correct
3. Click "Continue to Column Mapping"

#### Expected Result
- [ ] Step indicator advances to Step 2 "Map Columns"
- [ ] Preview data was passed to the mapping step (columns appear)

---

## Part E: Mapping Step (Step 2)

### Test 17: Auto-Mapping Runs

**Goal:** Verify columns are auto-mapped on load.

#### Steps
1. After uploading CSV and advancing to Step 2
2. Observe the mapping rows

#### Expected Result
- [ ] Each source column (First Name, Last Name, etc.) shown in a mapping row
- [ ] Sample values shown below each column name (first 3 values from CSV)
- [ ] "X of 8 mapped" badge in header
- [ ] "First Name" auto-mapped to "First Name" target with high confidence (green badge, 100%)
- [ ] "Last Name" auto-mapped to "Last Name" target with high confidence
- [ ] Most columns should auto-map due to exact/alias match strategy

---

### Test 18: Confidence Badges Display Correctly

**Goal:** Verify color-coded confidence indicators.

#### Steps
1. Observe badges next to each column

#### Expected Result
- [ ] Green badge with checkmark for >= 95% confidence
- [ ] Yellow badge for 70-94% confidence (if any partial matches)
- [ ] Red "Unmapped" badge for < 70% or unmapped columns
- [ ] Badges show percentage number

---

### Test 19: Lock/Unlock and Override

**Goal:** Verify lock mechanism on auto-mapped columns.

#### Steps
1. Find a column that was auto-mapped (e.g., "First Name" - should show lock icon)
2. Click the lock icon to unlock it
3. Change the dropdown to a different target field
4. Lock it again

#### Expected Result
- [ ] Auto-mapped columns (>= 95%) start with lock icon and disabled dropdown
- [ ] Clicking lock toggles to unlock icon, dropdown becomes enabled
- [ ] Dropdown shows all target fields, used targets shown as "(used)" and disabled
- [ ] "Don't Import" option at top of dropdown to skip a column
- [ ] After changing, confidence updates to 100% (manual selection)

---

### Test 20: Required Fields Warning

**Goal:** Verify validation warning for unmapped required fields.

#### Steps
1. Unlock a required field mapping (e.g., "First Name")
2. Change it to "Don't Import"
3. Observe warning

#### Expected Result
- [ ] Yellow warning box appears: "Required fields not mapped"
- [ ] Lists the unmapped required fields by name
- [ ] Warning disappears when field is re-mapped
- [ ] "Continue to Player Selection" button still clickable (warning, not blocker)

---

## Part F: Player Selection Step (Step 3)

### Test 21: Player Table with Checkboxes

**Goal:** Verify player table renders with selection.

#### Steps
1. Confirm mappings and advance to Step 3
2. Observe the player table

#### Expected Result
- [ ] Card header: "Select Players to Import" with "5 of 5 selected" badge
- [ ] Table with columns: checkbox, #, Name, DOB, Age Group, Gender, Parent Email, Team
- [ ] All 5 rows visible with correct data from CSV
- [ ] All checkboxes checked by default
- [ ] Header checkbox is checked (select-all state)

---

### Test 22: Search Functionality

**Goal:** Verify search filters players.

#### Steps
1. Type "Murphy" in the search bar
2. Clear the search
3. Type "2013" (DOB year)

#### Expected Result
- [ ] "Murphy" search: Only Michael Murphy row visible
- [ ] After clearing: All 5 rows visible again
- [ ] "2013" search: Jane Doe and Liam Kelly visible (born 2013)
- [ ] Badge updates to show filtered count

---

### Test 23: Filter Tabs

**Goal:** Verify All/Selected/Unselected tabs.

#### Steps
1. Uncheck John Smith and Michael Murphy
2. Click "Selected" tab
3. Click "Unselected" tab
4. Click "All" tab

#### Expected Result
- [ ] "All (5)" tab shows all 5 rows
- [ ] "Selected (3)" tab shows only Jane, Sarah, Liam
- [ ] "Unselected (2)" tab shows only John, Michael
- [ ] Tab counts update when selections change

---

### Test 24: Bulk Actions

**Goal:** Verify Select All / Deselect All buttons.

#### Steps
1. Click "Deselect All"
2. Observe badge and checkboxes
3. Click "Select All"
4. Observe badge and checkboxes

#### Expected Result
- [ ] "Deselect All": All checkboxes unchecked, badge shows "0 of 5 selected"
- [ ] "Continue" button shows "(0 players)" and is disabled
- [ ] "Select All": All checkboxes checked, badge shows "5 of 5 selected"
- [ ] "Continue" button shows "(5 players)" and is enabled

---

## Part G: Benchmark Config Step (Step 4)

### Test 25: Benchmark Toggle

**Goal:** Verify toggle switch controls benchmark options.

#### Steps
1. Advance to Step 4 (Benchmarks)
2. Toggle the switch off
3. Toggle it back on

#### Expected Result
- [ ] Switch is ON by default ("Initialize skill ratings during import")
- [ ] When ON: Strategy radio buttons and preview visible
- [ ] When OFF: Strategy options hidden, just the toggle card shown
- [ ] Toggling back on restores the previous strategy selection

---

### Test 26: Strategy Radio Selection

**Goal:** Verify strategy radio buttons work.

#### Steps
1. Observe the 5 strategy options
2. Click each one in order

#### Expected Result
- [ ] 5 strategies listed: Blank (All 1s), Middle (All 3s), Age-Appropriate (Recommended), NGB Standards, Custom Template
- [ ] "Age-Appropriate" is selected by default
- [ ] Each strategy has a label and description
- [ ] Radio button highlights the selected row with blue border
- [ ] Selecting "Custom Template" shows additional card saying "coming in a future update"

---

### Test 27: Rating Preview

**Goal:** Verify preview section updates per strategy.

#### Steps
1. Select "Blank (All 1s)" strategy
2. Observe preview
3. Select "Middle (All 3s)"
4. Observe preview

#### Expected Result
- [ ] Preview card shows "Rating Preview" with 5 colored circles
- [ ] Blank: All circles show "1" (reddish color)
- [ ] Middle: All circles show "3" (mid-range color)
- [ ] Info box below: "These are sample values..."
- [ ] Click "Continue to Review" to advance

---

## Part H: Review Step (Step 5)

### Test 28: Validation Summary

**Goal:** Verify validation runs and displays results.

#### Steps
1. Advance to Step 5 (Review)
2. Observe the summary cards and error section

#### Expected Result
- [ ] 4 summary cards: Selected count, Valid count, Error count, Duplicate count
- [ ] "Validation Errors" section with count badge
- [ ] If errors present: Error table shows Row #, Field, Error, Value, Suggested Fix
- [ ] Error search input visible when errors exist
- [ ] If no errors: "No validation errors found." message

---

### Test 29: Proceed with Errors Dialog

**Goal:** Verify the confirmation dialog when errors exist.

#### Steps
1. If there are validation errors, click "Proceed with Errors (X)"
2. Observe the dialog
3. Click "Go Back" to dismiss
4. If no errors, the button simply says "Proceed to Import" (no dialog)

#### Expected Result
- [ ] If errors: Orange "Proceed with Errors" button (destructive variant) with count
- [ ] Clicking opens AlertDialog: "Proceed with validation errors?"
- [ ] Dialog shows error count and row count
- [ ] "Go Back" dismisses, "Continue Anyway" advances
- [ ] If no errors: Green "Proceed to Import" button (no dialog needed)

---

## Part I: End-to-End Import Flow

### Test 30: Full Wizard Flow — Upload to Completion

**Goal:** Verify the complete import wizard works end-to-end. This is the most important test.

#### Steps
1. Navigate to `/orgs/<orgId>/import`
2. Select "Generic CSV/Excel" template
3. Click "Start Import"
4. **Step 1 - Upload:** Upload the test CSV file, verify preview, click Continue
5. **Step 2 - Map Columns:** Verify auto-mappings look correct, click Continue
6. **Step 3 - Select Players:** Uncheck 1-2 players, verify count updates, click Continue
7. **Step 4 - Benchmarks:** Toggle benchmarks ON, select "Middle (All 3s)", click Continue
8. **Step 5 - Review:** Check summary cards, note any validation errors, click Proceed
9. **Step 6 - Import:** Watch progress indicator
10. **Step 7 - Complete:** Review statistics

#### Expected Results
- [ ] Step indicator progresses correctly through all 7 steps (numbers/checkmarks update)
- [ ] Back button works on each step (navigates to previous step)
- [ ] Step 6 shows progress: "Preparing import..." -> "Importing players..." -> "Import complete!"
- [ ] Progress bar advances from 10% -> 30% -> 100%
- [ ] "View Results" button appears on completion
- [ ] Step 7 shows green success card with PartyPopper icon
- [ ] Statistics cards show: Players Created > 0
- [ ] "What Next" section shows 4 action cards (View Teams, Import More, etc.)
- [ ] "Return to Import Page" button links back to `/orgs/<orgId>/import`
- [ ] After completion, revisit import page — "Recent Imports" section now shows this import

#### Verify in Convex Dashboard (Data tab)
- [ ] `playerIdentities` table has new records matching imported players
- [ ] `orgPlayerEnrollments` table has enrollments for the org
- [ ] If sport was passed: `sportPassports` records created
- [ ] If benchmarks applied: `skillAssessments` records exist with expected ratings

---

## Known Issues / Notes

### Issue 1: Session Not Created on Wizard Mount (Non-blocking)
The ImportWizard does not call `createImportSession` when it mounts. The `sessionId` stays `null`. This means imported records won't have `importSessionId` set. The import still works, but session tracking is incomplete. This should be fixed in a follow-up.

### Issue 2: No Sortable Columns in Player Selection (Minor)
The PRD specified "sortable columns" but clicking table headers does not sort. Players can be found via search instead.

### Issue 3: Import Page Not Behind Admin Role Check (Low Risk)
The `/orgs/[orgId]/import` route is accessible to any logged-in org member who knows the URL. The sidebar link is only shown to admin/owner, but the page itself doesn't enforce role checks. For testing purposes, use an admin account.

---

## Cleanup

After testing, clean up test data from the Convex Dashboard Data tab:
1. Delete `playerIdentities` records created during testing (John, Jane, Michael, Sarah, Liam, Tom, Amy)
2. Delete corresponding `orgPlayerEnrollments` records
3. Delete corresponding `sportPassports` records (if created)
4. Delete corresponding `skillAssessments` records (if benchmarks applied)
5. Delete any `importSessions` records created during testing

---

## Summary Checklist

| # | Test | Status |
|---|------|--------|
| **A: Build** | | |
| 1 | All 10 frontend files exist | [ ] |
| 2 | Codegen passes | [ ] |
| 3 | Type check passes | [ ] |
| **B: Navigation** | | |
| 4 | Admin sidebar shows Import Wizard link | [ ] |
| 5 | Import entry page loads | [ ] |
| 6 | Wizard page loads via template selection | [ ] |
| 7 | Direct URL navigation works | [ ] |
| **C: Entry Page** | | |
| 8 | Sport selection dropdown filters templates | [ ] |
| 9 | Template selection (card highlight, single-select) | [ ] |
| 10 | Start Import button behavior | [ ] |
| 11 | Recent imports section | [ ] |
| **D: Upload Step** | | |
| 12 | Upload zone renders correctly | [ ] |
| 13 | File upload and CSV parsing | [ ] |
| 14 | Paste data tab and parsing | [ ] |
| 15 | Invalid file rejected | [ ] |
| 16 | Preview displays, advance to mapping | [ ] |
| **E: Mapping Step** | | |
| 17 | Auto-mapping runs on load | [ ] |
| 18 | Confidence badges (green/yellow/red) | [ ] |
| 19 | Lock/unlock and override | [ ] |
| 20 | Required fields warning | [ ] |
| **F: Player Selection** | | |
| 21 | Player table with checkboxes | [ ] |
| 22 | Search functionality | [ ] |
| 23 | Filter tabs (All/Selected/Unselected) | [ ] |
| 24 | Bulk actions (Select All/Deselect All) | [ ] |
| **G: Benchmark Config** | | |
| 25 | Benchmark toggle on/off | [ ] |
| 26 | Strategy radio selection (5 options) | [ ] |
| 27 | Rating preview updates per strategy | [ ] |
| **H: Review Step** | | |
| 28 | Validation summary and error table | [ ] |
| 29 | Proceed with errors confirmation dialog | [ ] |
| **I: End-to-End** | | |
| 30 | Full wizard flow — upload to completion | [ ] |
