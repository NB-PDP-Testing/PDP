# Phase 1.4 — Import Template Management UI — Manual Test Plan

**Phase:** 1.4 - Template Management UI
**Branch:** `ralph/phase-1.4-template-management`
**Date:** 2026-02-13

---

## Pre-requisites

- Dev server running on `localhost:3000`
- Logged in as an admin/owner user
- At least one organization exists

---

## TEST 1: Admin Sidebar Navigation

| # | Step | Expected Result | Pass? |
|---|------|----------------|-------|
| 1 | Go to any admin page (e.g. `/orgs/[orgId]/admin`) | Admin sidebar visible | |
| 2 | Look at the sidebar under "Data & Import" section | "Manage Templates" link visible with spreadsheet icon | |
| 3 | Click "Manage Templates" | Navigates to `/orgs/[orgId]/admin/templates` | |

---

## TEST 2: Template List Page — Initial Load

| # | Step | Expected Result | Pass? |
|---|------|----------------|-------|
| 1 | Navigate to `/orgs/[orgId]/admin/templates` | Page loads without errors | |
| 2 | Check page header | Title "Import Templates" with description text visible | |
| 3 | Check action buttons | "Upload Sample" and "Create Template" buttons visible at top | |
| 4 | Check filter controls | Search bar and sport filter dropdown visible | |
| 5 | If templates exist: check table | Table shows columns: Name, Sport, Scope, Source, Mappings, Last Used, Actions | |
| 6 | If no templates exist: check empty state | "No templates found" message with icon displayed | |

---

## TEST 3: Template List — Search & Filter

| # | Step | Expected Result | Pass? |
|---|------|----------------|-------|
| 1 | Type part of a template name in the search bar | List filters to matching templates only | |
| 2 | Clear search text | Full list returns | |
| 3 | Select a specific sport from the filter dropdown | List shows only templates for that sport (plus "Any Sport" templates) | |
| 4 | Select "All Sports" from dropdown | Full list returns | |
| 5 | Combine: type search text AND select a sport | List filters by both criteria | |

---

## TEST 4: Create Template Manually

| # | Step | Expected Result | Pass? |
|---|------|----------------|-------|
| 1 | Click "Create Template" button | Dialog opens with title "Create Template" | |
| 2 | Check form structure | Accordion sections visible: Basic Information, Column Mappings, Age Group Mappings, Skill Initialization, Default Behaviors | |
| 3 | Fill in Name: "Test Manual Template" | Field accepts input | |
| 4 | Fill in Description: "Created for testing" | Field accepts input | |
| 5 | Select Sport: GAA Football | Dropdown selects correctly | |
| 6 | Select Source Type: CSV | Radio button selects | |
| 7 | Open "Column Mappings" section | One empty mapping row visible | |
| 8 | Type "First Name" in source pattern input | Field accepts input | |
| 9 | Select "firstName" from target field dropdown | Dropdown selects correctly | |
| 10 | Toggle "Req" switch on | Switch toggles to required | |
| 11 | Click "Add Column Mapping" | Second empty row appears | |
| 12 | Fill second row: "Surname" source, "lastName" target | Both fields accept input | |
| 13 | Click "Create Template" | Success toast appears, dialog closes | |
| 14 | Check template list | New "Test Manual Template" appears with sport "GAA Football", scope "Organization" | |

---

## TEST 5: Edit Template

| # | Step | Expected Result | Pass? |
|---|------|----------------|-------|
| 1 | Find "Test Manual Template" in the list | Template visible | |
| 2 | Click the edit (pencil) icon | Edit dialog opens | |
| 3 | Check form fields | All fields pre-filled: name, description, sport, source type, column mappings | |
| 4 | Change name to "Test Manual Template (Edited)" | Field updates | |
| 5 | Click "Update Template" | Success toast appears, dialog closes | |
| 6 | Check template list | Template name updated to "Test Manual Template (Edited)" | |

---

## TEST 6: Upload Sample CSV — Auto-detect Mappings

| # | Step | Expected Result | Pass? |
|---|------|----------------|-------|
| 1 | Click "Upload Sample" button at the top | Dialog opens with title "Create Template from Sample" | |
| 2 | Check dialog tabs | Two tabs visible: "Upload File" and "Paste Data" | |
| 3 | Click "Paste Data" tab | Paste textarea visible with "Parse Data" button | |
| 4 | Paste the following CSV data (see below) | Text appears in textarea | |
| 5 | Click "Parse Data" | Mapping preview appears | |
| 6 | Check detected mappings | Column mappings shown (e.g. "Forename -> firstName", "Surname -> lastName") | |
| 7 | Check confidence badges | Each mapping shows a colored badge (green/yellow/red) | |
| 8 | Check unmapped columns | Any unrecognised columns listed separately with "assign manually" note | |
| 9 | Click "Use These Mappings" | Dialog closes, Create Template form opens with column mappings pre-filled | |
| 10 | Fill in template name: "Auto-detected Template" | Field accepts input | |
| 11 | Click "Create Template" | Success toast appears | |
| 12 | Check template list | "Auto-detected Template" appears in the list | |

**Sample CSV data for step 4:**
```
Forename,Surname,Date of Birth,Gender,Email,Phone,Address
John,Smith,2015-03-15,Male,john@example.com,0871234567,123 Main St
Jane,Doe,2014-06-20,Female,jane@example.com,0879876543,456 Oak Ave
```

---

## TEST 7: Clone Template

| # | Step | Expected Result | Pass? |
|---|------|----------------|-------|
| 1 | Find any org-scoped template in the list | Template visible | |
| 2 | Click the clone (copy) icon | Clone dialog opens | |
| 3 | Check name field | Pre-filled with "Copy of [original name]" | |
| 4 | Change name to "My Cloned Template" | Field updates | |
| 5 | Click "Clone Template" | Success toast appears, dialog closes | |
| 6 | Check template list | "My Cloned Template" appears as a separate entry | |

---

## TEST 8: Clone Platform Template

> **Note:** This test requires platform-scoped templates to exist. If none are present, skip this test.

| # | Step | Expected Result | Pass? |
|---|------|----------------|-------|
| 1 | Find a template with "Platform" scope badge | Template visible in list | |
| 2 | Check action buttons for platform template | No edit (pencil) or delete (trash) buttons visible | |
| 3 | Hover over the clone button | Tooltip shows "Clone to My Org" | |
| 4 | Click clone button | Dialog opens with title "Clone to My Organization" | |
| 5 | Enter a name and click "Clone Template" | Success toast appears | |
| 6 | Check cloned template in list | New template has "Organization" scope badge (not "Platform") | |

---

## TEST 9: Delete Template

| # | Step | Expected Result | Pass? |
|---|------|----------------|-------|
| 1 | Find an org-scoped test template you created | Template visible | |
| 2 | Click the delete (trash) icon | Confirmation dialog appears | |
| 3 | Check dialog content | Shows template name and warning about deactivation | |
| 4 | Click "Delete Template" | Success toast appears, dialog closes | |
| 5 | Check template list | Deleted template no longer appears | |

---

## TEST 10: Integration — Template Appears in Import Wizard

| # | Step | Expected Result | Pass? |
|---|------|----------------|-------|
| 1 | Navigate to the import page: `/orgs/[orgId]/import` | Import page loads | |
| 2 | Check template cards | Templates created in the management page appear as selectable cards | |
| 3 | Select one of your custom templates | Card highlights as selected | |
| 4 | Check import button | "Start Import" button becomes enabled with the template name | |

---

## TEST 11: Mobile Responsive

| # | Step | Expected Result | Pass? |
|---|------|----------------|-------|
| 1 | Resize browser to ~375px width (or use dev tools mobile view) | Layout adapts | |
| 2 | Navigate to `/orgs/[orgId]/admin/templates` | Page loads without horizontal overflow | |
| 3 | Check template display | Templates shown as cards (not table) | |
| 4 | Check card content | Each card shows name, description, sport badge, scope badge, action buttons | |
| 5 | Check action buttons on cards | Edit, Clone, and Delete buttons visible and tappable | |
| 6 | Check header buttons | "Upload Sample" and "Create Template" stack properly | |
| 7 | Check search and filter | Inputs are full-width and usable | |

---

## TEST 12: Form Validation

| # | Step | Expected Result | Pass? |
|---|------|----------------|-------|
| 1 | Click "Create Template" | Create dialog opens | |
| 2 | Clear the name field (leave it empty) | Name field is blank | |
| 3 | Remove all column mapping rows (click trash on each) | No mapping rows remain | |
| 4 | Click "Create Template" (submit button) | Error messages appear: name required, at least one mapping required | |
| 5 | Fill in name: "Validation Test" | Error clears on name field | |
| 6 | Click "Create Template" again | Still shows column mapping error | |
| 7 | Click "Add Column Mapping" and fill in source + target | Valid mapping row exists | |
| 8 | Click "Create Template" | Template creates successfully with success toast | |

---

## Results Summary

| Test | Description | Result |
|------|-------------|--------|
| 1 | Admin sidebar navigation | |
| 2 | Template list page — initial load | |
| 3 | Template list — search & filter | |
| 4 | Create template manually | |
| 5 | Edit template | |
| 6 | Upload sample CSV — auto-detect mappings | |
| 7 | Clone template | |
| 8 | Clone platform template | |
| 9 | Delete template | |
| 10 | Integration — template in import wizard | |
| 11 | Mobile responsive | |
| 12 | Form validation | |

**Pass Criteria:** Tests 1-10 and 12 must pass. Test 11 (mobile) is recommended but optional. Test 8 can be skipped if no platform templates exist.

---

**Tester:** _______________
**Date:** _______________
**Overall Result:** PASS / FAIL
