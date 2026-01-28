# Phase 8 Week 1.5 Testing Guide - Trust Gate Feature Flags

**Date**: 2026-01-27
**Branch**: `ralph/coach-parent-summaries-p5-phase2`
**Status**: ✅ Ready for Testing (All 5 Stories Complete + Auth Fix)

---

## What's New in Phase 8 Week 1.5

This phase implements a 3-tier permission system for controlling access to the "Sent to Parents" tab in Voice Notes:

1. **US-P8-021**: Backend Trust Gate Permission System - Complete backend API for feature flags
2. **US-P8-002-FIX**: Fix Trust Gate Check in Voice Notes Dashboard - Corrects trust level gating
3. **US-P8-022**: Platform Staff Feature Flags Admin UI - Master control panel with bulk actions
4. **US-P8-022B**: Platform Staff Overview Dashboard - Summary cards showing system status
5. **US-P8-023**: Org Admin Trust Gate Status Dashboard - Per-org control for admins

**Key Features**:
- Platform staff can enable/disable trust gates globally per organization
- Platform staff can delegate control to org admins (Admin Delegation)
- Platform staff can enable org admins to grant individual coach overrides (Coach Overrides)
- Org admins can set blanket overrides (all coaches get access)
- Org admins can grant/revoke individual coach overrides with expiration dates
- Org admins can approve/deny coach access requests
- Coaches see appropriate messaging based on their access level

**Auth Bug Fixed**: All 8 backend queries now use correct Better Auth pattern (`authComponent.safeGetAuthUser(ctx)`)

---

## Prerequisites

### Test Accounts

**Platform Staff Account** (for US-P8-022/022B testing):
- **Email**: `neil.barlow@gmail.com`
- **Password**: [your password]
- **Role**: Platform Staff (`isPlatformStaff: true`)
- **Access**: `/platform/feature-flags`

**Org Admin Account** (for US-P8-023 testing):
- **Email**: `neil.B@blablablak.com` or your org admin account
- **Password**: `lien1979`
- **Role**: Organization Admin
- **Access**: `/orgs/{orgId}/admin/settings/features`

**Coach Account** (for US-P8-002-FIX testing):
- **Email**: Any coach account with trust level data
- **Role**: Coach
- **Trust Level**: Test at Level 0/1 and Level 2+ scenarios

### Required Setup

**1. Verify Platform Staff Flag**
- Convex Dashboard → Data → `user` table (via Better Auth adapter)
- Find `neil.barlow@gmail.com`
- Verify: `isPlatformStaff: true`

**2. Verify Organization Data**
- At least 2-3 organizations in the system
- Each org should have coaches with various trust levels
- Some coaches at Level 0/1, some at Level 2+

**3. Create Test Coach Overrides** (Optional - for testing display):
```
Convex Dashboard → Data → trustGateCoachOverrides
Insert test records if needed for testing revoke/expire functionality
```

**4. Browser DevTools Open**
- Monitor Network tab for API calls
- Monitor Console for errors
- Useful for verifying mutations execute correctly

---

## Test Scenario 1: Platform Staff Feature Flags UI (US-P8-022)

**Goal**: Verify platform staff can manage feature flags for all organizations with full CRUD operations

### Prerequisites
- Logged in as platform staff (`neil.barlow@gmail.com`)
- At least 3 organizations exist in system

### Step 1: Access Feature Flags Page

1. Navigate to: `/platform/feature-flags`
2. **EXPECTED**:
   - Page loads without "Unauthorized" error
   - No console errors
   - Loading state appears briefly
   - Table renders with data

**✅ PASS**: Page loads successfully
**❌ FAIL**: "Unauthorized: Platform staff only" error → Auth bug not fixed

---

### Step 2: Verify Overview Cards (US-P8-022B)

At top of page, verify 4 metric cards:

**Card 1: Total Organizations**
- **EXPECTED**: Shows correct count of organizations
- **Verify**: Matches count in Convex `organization` table

**Card 2: Gates Disabled**
- **EXPECTED**: Shows percentage of orgs with gates disabled
- **Verify**: Calculate manually and compare

**Card 3: Admin Overrides**
- **EXPECTED**: Shows count of orgs with admin delegation enabled
- **Verify**: Matches count in `trustGateOrgPermissions` where `allowAdminControl: true`

**Card 4: Pending Requests**
- **EXPECTED**: Shows count of pending coach access requests
- **Verify**: Matches count in `trustGateAccessRequests` with status "pending"

**✅ PASS**: All cards show correct data
**❌ FAIL**: Incorrect counts or missing cards

---

### Step 3: Verify Feature Flags Table Structure

**Expected Columns**:
1. **Name** (Organization name) - sortable
2. **Gates** - Toggle switch
3. **Admin Delegation** - Toggle switch
4. **Coach Overrides** - Toggle switch
5. **Individual Overrides** - Clickable count badge
6. **Pending Requests** - Clickable count badge
7. **Last Changed** - User name + date - sortable
8. **Actions** - Dropdown menu

**Verify Table Headers**:
- [ ] All 8 columns visible
- [ ] Sort icons visible on Name, Last Changed, Override Count
- [ ] Headers properly labeled
- [ ] No horizontal scroll (responsive layout)

**✅ PASS**: All columns present and properly labeled
**❌ FAIL**: Missing columns or incorrect layout

---

### Step 4: Test Toggle Switches

**Test Gates Toggle**:
1. Find any organization row
2. Note current Gates toggle state (ON/OFF)
3. Click the Gates toggle
4. **EXPECTED**:
   - Toggle animates to opposite state
   - Toast notification appears: "Trust gates updated for [Org Name]"
   - Last Changed column updates with your name + "just now"
   - No page reload
   - Change persists on page refresh

**Test Admin Delegation Toggle**:
1. Click Admin Delegation toggle
2. **EXPECTED**:
   - Toggle changes state
   - Toast: "Admin delegation updated for [Org Name]"
   - Last Changed updates

**Test Coach Overrides Toggle**:
1. Click Coach Overrides toggle
2. **EXPECTED**:
   - Toggle changes state
   - Toast: "Coach override permissions updated for [Org Name]"
   - Last Changed updates

**Verify Backend Updates**:
1. Convex Dashboard → Data → `trustGateOrgPermissions`
2. Find the organization record
3. **EXPECTED**:
   - `trustGatesActive` matches Gates toggle
   - `allowAdminControl` matches Admin Delegation toggle
   - `allowCoachOverrides` matches Coach Overrides toggle
   - `lastChangedBy` = your user ID
   - `lastChangedAt` = recent timestamp

**✅ PASS**: All toggles work and persist
**❌ FAIL**: Toggles don't update or don't persist

---

### Step 5: Test Last Changed Column

**Verify Display Format**:
1. Find a row where you just toggled something
2. **EXPECTED**: Shows "Changed by [Your Name] on [Date]"
3. Example: "Changed by Neil Barlow on 2026-01-27"

**Verify Updates on Toggle**:
1. Toggle any switch
2. **EXPECTED**: Last Changed column updates immediately
3. Shows your name and current date

**Test Sorting**:
1. Click "Last Changed" header
2. **EXPECTED**: Table sorts by most recent changes first
3. Click again: sorts by oldest changes first

**✅ PASS**: Column displays correctly and sorts work
**❌ FAIL**: Shows "Unknown" or doesn't update

---

### Step 6: Test Actions Dropdown

**Access Dropdown**:
1. Click "Actions" dropdown in any row (⋮ icon or button)
2. **EXPECTED**: Dropdown menu appears with 2 options:
   - "View Details"
   - "Reset to Default"

**Test View Details**:
1. Click "View Details"
2. **EXPECTED**:
   - Dialog/modal appears
   - Shows organization name
   - Shows current settings (gates, delegation, overrides)
   - Shows override count and request count
   - Has [Close] button

**Test Reset to Default**:
1. First, modify an org's settings (toggle some switches)
2. Click "Reset to Default"
3. **EXPECTED**:
   - Confirmation dialog appears: "Reset [Org Name] to default settings?"
   - Shows what will be reset
   - Has [Cancel] and [Confirm] buttons
4. Click [Confirm]
5. **EXPECTED**:
   - All toggles reset to default (Gates ON, Delegation OFF, Overrides OFF)
   - Toast: "Settings reset to default for [Org Name]"
   - Last Changed updates

**✅ PASS**: Both actions work correctly
**❌ FAIL**: Actions missing or don't execute

---

### Step 7: Test Sort Controls

**Sort by Name**:
1. Click "Name" column header
2. **EXPECTED**: Organizations sorted alphabetically A→Z
3. Click again: Z→A
4. Sort icon changes direction

**Sort by Last Changed**:
1. Click "Last Changed" header
2. **EXPECTED**: Sorted by most recent first
3. Click again: oldest first

**Sort by Override Count**:
1. Click "Individual Overrides" header
2. **EXPECTED**: Sorted by count descending
3. Click again: ascending

**✅ PASS**: All sort controls work
**❌ FAIL**: Sorting doesn't work or crashes

---

### Step 8: Test Pagination

**Verify Pagination Controls**:
- **EXPECTED**: Shows "Page 1 of X" or similar
- Previous/Next buttons visible
- Items per page: 20

**Test with Small Dataset** (< 20 orgs):
1. **EXPECTED**: All orgs visible on page 1
2. Next button disabled
3. No pagination needed

**Test with Large Dataset** (> 20 orgs):
1. **EXPECTED**: Only 20 orgs shown per page
2. Page controls active
3. Click "Next"
4. **EXPECTED**: Page 2 loads with next 20 orgs
5. Click "Previous"
6. **EXPECTED**: Returns to page 1

**Note**: If you don't have 20+ orgs, skip large dataset test or create test orgs in Convex

**✅ PASS**: Pagination works correctly
**❌ FAIL**: Shows all orgs on one page or pagination broken

---

### Step 9: Test Clickable Override Counts

**Test Individual Overrides Count**:
1. Find org with override count > 0
2. Click the badge showing count (e.g., "3 overrides")
3. **EXPECTED**:
   - Dialog/modal opens
   - Shows list of coaches with overrides
   - Each shows: Coach name, granted date, granted by, expires date
   - Has [Close] button

**Test Pending Requests Count**:
1. Find org with pending requests > 0
2. Click the badge showing count (e.g., "2 pending")
3. **EXPECTED**:
   - Dialog/modal opens
   - Shows list of pending requests
   - Each shows: Coach name, requested date, reason (if provided)
   - Has [Close] button

**Test Zero Counts**:
1. Find org with 0 overrides
2. **EXPECTED**: Badge shows "0" or is grayed out
3. Click should do nothing or show "No overrides" message

**✅ PASS**: Counts are clickable and show details
**❌ FAIL**: Not clickable or modals don't open

---

### Step 10: Test Bulk Actions

**Access Bulk Actions**:
1. **EXPECTED**: Checkboxes visible in leftmost column
2. Bulk action toolbar visible at top or bottom

**Select Individual Rows**:
1. Click checkbox on 2-3 organization rows
2. **EXPECTED**:
   - Checkboxes show selected state
   - Bulk action toolbar updates: "X selected"

**Select All**:
1. Click "Select All" checkbox in header
2. **EXPECTED**:
   - All visible rows checked
   - Toolbar shows total count

**Test Bulk Actions Available**:
1. With rows selected, verify these buttons visible:
   - **Enable Admin Delegation for Selected**
   - **Enable Coach Overrides for Selected**
   - **Disable All Gates** (dangerous action)
   - **Clear Selection**

**Test: Enable Admin Delegation for Selected**:
1. Select 2 orgs
2. Click "Enable Admin Delegation for Selected"
3. **EXPECTED**:
   - Confirmation dialog: "Enable admin delegation for X organizations?"
   - Lists org names
   - [Cancel] and [Confirm] buttons
4. Click [Confirm]
5. **EXPECTED**:
   - Toast: "Updated X organizations"
   - Admin Delegation toggles turn ON for selected orgs
   - Selection clears

**Test: Enable Coach Overrides for Selected**:
1. Select 2 orgs
2. Click "Enable Coach Overrides for Selected"
3. **EXPECTED**:
   - Confirmation dialog
   - Toggles update on confirm
   - Toast notification

**Test: Disable All Gates**:
1. Select 1 org
2. Click "Disable All Gates"
3. **EXPECTED**:
   - **Strong warning dialog**: "⚠️ WARNING: This will disable trust gates..."
   - Explains impact
   - Requires typing "CONFIRM" or similar
   - [Cancel] and [Disable] buttons (red, destructive)
4. Click [Disable]
5. **EXPECTED**:
   - Gates toggle turns OFF for selected orgs
   - Toast with warning tone

**Test: Clear Selection**:
1. Select multiple rows
2. Click "Clear Selection"
3. **EXPECTED**: All checkboxes unchecked

**✅ PASS**: All bulk actions work correctly
**❌ FAIL**: Bulk actions missing or don't execute

---

### Step 11: Test Search & Filters

**Test Search**:
1. Type organization name in search box
2. **EXPECTED**:
   - Table filters to show matching orgs
   - Updates in real-time as you type
   - Shows "No results" if no match
3. Clear search
4. **EXPECTED**: All orgs return

**Test Filters** (dropdown or tabs):

**Filter: All**
- **EXPECTED**: Shows all organizations

**Filter: Gates Disabled**
- **EXPECTED**: Only shows orgs with gates OFF
- Count should match those with `trustGatesActive: false`

**Filter: Admin Override Active**
- **EXPECTED**: Only shows orgs with admin delegation enabled
- Count matches those with `allowAdminControl: true`

**Filter: Has Requests**
- **EXPECTED**: Only shows orgs with pending access requests
- Count matches orgs with request count > 0

**Filter: Has Issues**
- **EXPECTED**: Shows orgs with configuration issues
- Example: Coach overrides enabled but admin delegation disabled (invalid state)

**Filter: Recently Changed**
- **EXPECTED**: Shows orgs changed in last 24-48 hours
- Based on `lastChangedAt` timestamp

**Combine Search + Filter**:
1. Apply filter: "Gates Disabled"
2. Type search term
3. **EXPECTED**: Results match BOTH search AND filter

**✅ PASS**: Search and all filters work
**❌ FAIL**: Filters don't work or show wrong results

---

### Step 12: Test Responsive Layout

**Desktop (1920x1080)**:
- [ ] All columns visible without scroll
- [ ] Toggles and buttons clearly clickable
- [ ] Bulk action toolbar fits

**Laptop (1366x768)**:
- [ ] Table adjusts gracefully
- [ ] No content cutoff
- [ ] Modals fit on screen

**Tablet (iPad - 768x1024)**:
- [ ] Table scrolls horizontally if needed
- [ ] Touch-friendly toggle sizes
- [ ] Modals responsive

**Mobile (375x667)** (if supported):
- [ ] Table layout adapts (stacked cards?)
- [ ] Bulk actions accessible
- [ ] Modals full-screen

**✅ PASS**: Layout works on all tested sizes
**❌ FAIL**: Content cut off or unusable

---

## Test Scenario 2: Org Admin Feature Flags Dashboard (US-P8-023)

**Goal**: Verify org admins can view status and manage overrides (if delegated)

### Prerequisites
- Logged in as org admin (`neil.B@blablablak.com`)
- Organization exists with `allowAdminControl` enabled (set via platform staff)

### Step 1: Access Org Admin Features Page

1. Navigate to: `/orgs/{orgId}/admin/settings/features`
2. **EXPECTED**:
   - Page loads without error
   - Current status card visible
   - Controls visible (if delegation enabled)

**✅ PASS**: Page loads
**❌ FAIL**: 404 or access denied

---

### Step 2: Verify Current Status Card

**Card Should Display**:
1. **Trust Gates Status**:
   - Badge: "ON" (green) or "OFF" (gray/red)
   - Text: "Trust gates are currently active" or "Trust gates are disabled"

2. **Admin Control Status**:
   - Text: "Admin control: Enabled" or "Disabled"
   - If disabled: "Contact platform staff to request admin control"

3. **Coach Overrides Status**:
   - Text: "Coach overrides: Enabled" or "Disabled"
   - If disabled: "Contact platform staff to enable override permissions"

**Test Scenario: Gates OFF**:
1. As platform staff, disable gates for this org
2. As org admin, refresh page
3. **EXPECTED**:
   - Badge shows "OFF"
   - Warning message: "Trust gates are disabled by platform staff"
   - No override controls visible

**Test Scenario: Admin Control Disabled**:
1. As platform staff, disable admin delegation for this org
2. As org admin, refresh page
3. **EXPECTED**:
   - Message: "Contact platform staff to request admin control"
   - No blanket override toggle visible
   - No individual override controls visible

**Test Scenario: Full Access** (Gates ON + Admin Control ON):
1. As platform staff, enable gates + admin delegation
2. As org admin, refresh page
3. **EXPECTED**:
   - Badge shows "ON"
   - All override controls visible

**✅ PASS**: Status card reflects actual settings
**❌ FAIL**: Shows incorrect status

---

### Step 3: Test Admin Blanket Override Toggle

**Prerequisites**: Admin delegation enabled

**Access Toggle**:
1. Locate "Admin Blanket Override" section
2. **EXPECTED**:
   - Toggle switch visible
   - Description: "Grant access to ALL coaches in your organization"
   - Warning: "Overrides individual trust levels"

**Test Enable Blanket Override**:
1. Click toggle to enable
2. **EXPECTED**:
   - Confirmation dialog: "Grant blanket access?"
   - Explains: All coaches (even Level 0/1) will see "Sent to Parents" tab
   - [Cancel] and [Confirm] buttons
3. Click [Confirm]
4. **EXPECTED**:
   - Toggle turns ON
   - Toast: "Blanket override enabled for all coaches"
   - Shows metadata: "Set by [Your Name] on [Date]"

**Verify Effect on Coaches**:
1. Log in as Level 0/1 coach in this org
2. Navigate to Voice Notes dashboard
3. **EXPECTED**: "Sent to Parents" tab now visible (was hidden before)

**Test Disable Blanket Override**:
1. As org admin, click toggle to disable
2. **EXPECTED**:
   - Confirmation: "Remove blanket access?"
   - Warning: "Coaches below Level 2 will lose access"
3. Click [Confirm]
4. **EXPECTED**:
   - Toggle turns OFF
   - Toast: "Blanket override removed"

**Verify Coaches Lose Access**:
1. As Level 0/1 coach, refresh Voice Notes
2. **EXPECTED**: "Sent to Parents" tab hidden again

**✅ PASS**: Blanket override works correctly
**❌ FAIL**: Toggle doesn't work or coaches don't gain/lose access

---

### Step 4: Verify Overview Stats

**Expected Metrics** (displayed in cards or list):

1. **Total Coaches**: Count of all coaches in org
2. **Coaches with Access**: Count of coaches who can access "Sent to Parents"
   - Level 2+ coaches + individual overrides + blanket override
3. **Individual Overrides**: Count of active individual coach overrides
4. **Pending Requests**: Count of pending access requests from coaches

**Verify Calculations**:
- Create a coach override → Individual Overrides count increments
- Enable blanket override → Coaches with Access = Total Coaches
- Disable blanket override → Coaches with Access = Level 2+ coaches only

**✅ PASS**: All metrics accurate
**❌ FAIL**: Counts incorrect

---

### Step 5: Test Individual Coach Overrides Table

**Prerequisites**: Coach overrides enabled by platform staff

**Table Structure**:
**Expected Columns**:
1. Coach Name
2. Granted Date
3. Granted By (admin name)
4. Expires Date
5. Reason/Notes
6. Actions (Revoke button)

**Test Display**:
1. If no overrides exist:
   - **EXPECTED**: Empty state message: "No individual overrides"
2. If overrides exist:
   - **EXPECTED**: Table shows all active overrides

**Test Grant New Override**:
1. Click "Grant Override" button
2. **EXPECTED**:
   - Dialog opens: "Grant Individual Coach Override"
   - Dropdown: Select coach (shows all coaches in org)
   - Date picker: Expiration date (default 30 days)
   - Text area: Reason/notes (optional)
   - [Cancel] and [Grant] buttons
3. Select a Level 0/1 coach
4. Set expiration: 7 days from now
5. Enter reason: "Test override for UAT"
6. Click [Grant]
7. **EXPECTED**:
   - Dialog closes
   - Toast: "Override granted for [Coach Name]"
   - Coach appears in table
   - Shows your name in "Granted By"
   - Shows expiration date

**Verify Coach Access**:
1. Log in as the coach who received override
2. Navigate to Voice Notes
3. **EXPECTED**: "Sent to Parents" tab visible

**Test Revoke Override**:
1. As org admin, find the override in table
2. Click "Revoke" button
3. **EXPECTED**:
   - Confirmation dialog: "Revoke access for [Coach Name]?"
   - Warning: "They will immediately lose access"
   - [Cancel] and [Revoke] buttons
4. Click [Revoke]
5. **EXPECTED**:
   - Override removed from table
   - Toast: "Override revoked"

**Verify Coach Loses Access**:
1. As coach, refresh Voice Notes
2. **EXPECTED**: "Sent to Parents" tab hidden again

**Test Expired Overrides**:
1. Convex Dashboard → `trustGateCoachOverrides`
2. Manually set `expiresAt` to past date
3. Refresh org admin page
4. **EXPECTED**:
   - Expired override shows in separate section OR
   - Auto-removed from active table
   - Badge: "Expired"

**✅ PASS**: Individual overrides work correctly
**❌ FAIL**: Can't grant/revoke or coach access not affected

---

### Step 6: Test Pending Requests Section

**Prerequisites**: Coach has submitted access request

**Create Test Request**:
1. As Level 0/1 coach, navigate to Voice Notes
2. See "Sent to Parents" tab locked with tooltip
3. Click "Request Access" button (if implemented)
4. Enter reason: "Need access for parent communication"
5. Submit request

**View as Org Admin**:
1. Navigate to `/orgs/{orgId}/admin/settings/features`
2. Scroll to "Pending Requests" section
3. **EXPECTED**:
   - Table shows pending request
   - Columns: Coach Name, Requested Date, Reason, Actions

**Test Approve Request**:
1. Click "Approve" button
2. **EXPECTED**:
   - Dialog: "Approve access request for [Coach Name]?"
   - Date picker: Set expiration (default 30 days)
   - Text area: Admin notes
   - [Cancel] and [Approve] buttons
3. Set expiration: 14 days
4. Enter note: "Approved for parent communication"
5. Click [Approve]
6. **EXPECTED**:
   - Request removed from pending
   - Coach override created (appears in overrides table)
   - Toast: "Request approved for [Coach Name]"
   - Coach receives notification (if implemented)

**Verify Coach Access**:
1. As coach, refresh Voice Notes
2. **EXPECTED**: "Sent to Parents" tab now visible

**Test Deny Request**:
1. Create another request
2. As org admin, click "Deny" button
3. **EXPECTED**:
   - Dialog: "Deny access request for [Coach Name]?"
   - Text area: Reason for denial (required)
   - [Cancel] and [Deny] buttons
4. Enter reason: "Need to reach Level 2 first"
5. Click [Deny]
6. **EXPECTED**:
   - Request removed from pending
   - Toast: "Request denied"
   - Coach receives notification with reason (if implemented)

**Verify No Access**:
1. As coach, refresh Voice Notes
2. **EXPECTED**: "Sent to Parents" tab still hidden

**✅ PASS**: Approve/deny works correctly
**❌ FAIL**: Requests don't update or coach access not affected

---

## Test Scenario 3: Voice Notes Trust Gate Check (US-P8-002-FIX)

**Goal**: Verify "Sent to Parents" tab visibility based on trust level and overrides

### Prerequisites
- Test with coaches at different trust levels
- Test with and without overrides

### Step 1: Test Trust Level 0/1 - No Access (Base Case)

**Setup**:
1. Log in as coach with trust level 0 or 1
2. Ensure:
   - No blanket override
   - No individual override
   - Gates are ON

**Test**:
1. Navigate to `/orgs/{orgId}/coach/voice-notes`
2. **EXPECTED**:
   - "Sent to Parents" tab HIDDEN
   - Lock icon visible (if implemented)
   - Tooltip: "Requires Trust Level 2 or admin override"

**✅ PASS**: Tab hidden for low trust level
**❌ FAIL**: Tab visible when it shouldn't be

---

### Step 2: Test Trust Level 2+ - Access Granted (Base Case)

**Setup**:
1. Log in as coach with trust level 2+
2. Gates ON, no overrides needed

**Test**:
1. Navigate to Voice Notes dashboard
2. **EXPECTED**:
   - "Sent to Parents" tab VISIBLE
   - No lock icon
   - Can click and view sent summaries

**Click Tab**:
1. Click "Sent to Parents" tab
2. **EXPECTED**:
   - Tab content loads
   - Shows summaries sent in last 30 days
   - Search and filter controls available

**✅ PASS**: Tab visible and functional for Level 2+
**❌ FAIL**: Tab hidden for Level 2+ coach

---

### Step 3: Test Individual Override - Access Granted

**Setup**:
1. Log in as Level 0/1 coach
2. As org admin, grant individual override to this coach

**Test**:
1. Navigate to Voice Notes
2. **EXPECTED**:
   - "Sent to Parents" tab VISIBLE
   - Badge: "Override granted" or similar indicator (if implemented)
   - Tooltip: "Access granted by admin until [expiration]"

**Verify Access**:
1. Click tab
2. **EXPECTED**: Full access to sent summaries

**Test Override Expiration**:
1. As org admin, set override to expire in 1 minute
2. Wait 1 minute
3. As coach, refresh Voice Notes
4. **EXPECTED**:
   - Tab becomes HIDDEN
   - Lock icon returns
   - Tooltip: "Override has expired"

**✅ PASS**: Override grants access and expiration removes it
**❌ FAIL**: Override doesn't grant access or doesn't expire

---

### Step 4: Test Blanket Override - All Coaches Access

**Setup**:
1. As org admin, enable blanket override
2. Ensure gates are ON

**Test with Level 0/1 Coach**:
1. Log in as Level 0/1 coach
2. Navigate to Voice Notes
3. **EXPECTED**:
   - "Sent to Parents" tab VISIBLE
   - Badge: "Admin override active" (if implemented)

**Test with Level 2+ Coach**:
1. Log in as Level 2+ coach
2. **EXPECTED**: Tab visible (already had access)

**Disable Blanket Override**:
1. As org admin, disable blanket override
2. As Level 0/1 coach, refresh
3. **EXPECTED**: Tab becomes HIDDEN

**✅ PASS**: Blanket override works for all coaches
**❌ FAIL**: Some coaches don't gain access

---

### Step 5: Test Gates Disabled - All Coaches Access

**Setup**:
1. As platform staff, disable gates for org
2. No overrides needed

**Test with Level 0 Coach**:
1. Log in as Level 0 coach
2. Navigate to Voice Notes
3. **EXPECTED**:
   - "Sent to Parents" tab VISIBLE
   - Message: "Trust gates disabled by platform staff" (if implemented)

**Test with All Trust Levels**:
- Level 0: Tab visible ✅
- Level 1: Tab visible ✅
- Level 2+: Tab visible ✅

**Re-enable Gates**:
1. As platform staff, enable gates
2. As Level 0/1 coach, refresh
3. **EXPECTED**: Tab becomes HIDDEN (back to normal gating)

**✅ PASS**: Disabling gates opens access to everyone
**❌ FAIL**: Low trust coaches still don't see tab

---

### Step 6: Test Priority Logic (Multiple Conditions)

**Test Case: Override + Gates Disabled**
- Setup: Gates OFF + Individual override exists
- **EXPECTED**: Tab visible (gates disabled takes precedence)

**Test Case: Override + Blanket Override**
- Setup: Individual override + blanket override both active
- **EXPECTED**: Tab visible (doesn't matter which granted access)

**Test Case: Level 2 + Override**
- Setup: Coach is Level 2 + has individual override
- **EXPECTED**: Tab visible (already had access from Level 2)

**Test Case: Override Expires but Becomes Level 2**
- Setup: Coach has override, then reaches Level 2, then override expires
- **EXPECTED**: Tab still visible (now has access via Level 2)

**✅ PASS**: All priority cases work correctly
**❌ FAIL**: Conflicts cause unexpected behavior

---

## Test Scenario 4: Backend API Verification (US-P8-021)

**Goal**: Verify all backend queries work correctly with Better Auth pattern

### Prerequisites
- Convex Dashboard access
- Platform staff account

### Step 1: Test getAllOrgsFeatureFlagStatus Query

**Execute Query**:
1. Convex Dashboard → Functions
2. Find: `models/trustGatePermissions:getAllOrgsFeatureFlagStatus`
3. Args: `{}` (no args)
4. Click "Run query"

**Expected Response**:
```json
[
  {
    "organizationId": "...",
    "organizationName": "Test Club",
    "trustGatesActive": true,
    "allowAdminControl": false,
    "allowCoachOverrides": false,
    "individualOverridesCount": 2,
    "pendingRequestsCount": 1,
    "lastChangedBy": "user_id",
    "lastChangedAt": 1706400000000,
    "lastChangedByName": "Neil Barlow"
  },
  // ... more orgs
]
```

**Verify**:
- [ ] Returns all organizations
- [ ] Counts are accurate
- [ ] lastChangedByName resolves correctly
- [ ] No "Unauthorized" error

**✅ PASS**: Query returns correct data
**❌ FAIL**: Unauthorized or incorrect data

---

### Step 2: Test updateOrgFeatureFlags Mutation

**Execute Mutation**:
1. Convex Dashboard → Functions
2. Find: `models/trustGatePermissions:updateOrgFeatureFlags`
3. Args:
```json
{
  "organizationId": "...",
  "trustGatesActive": false,
  "allowAdminControl": true,
  "allowCoachOverrides": true
}
```
4. Click "Run mutation"

**Expected Response**:
```json
{
  "success": true,
  "organizationId": "..."
}
```

**Verify in Database**:
1. Data → `trustGateOrgPermissions`
2. Find organization record
3. **EXPECTED**:
   - `trustGatesActive: false`
   - `allowAdminControl: true`
   - `allowCoachOverrides: true`
   - `lastChangedBy` = your user ID
   - `lastChangedAt` = recent timestamp

**✅ PASS**: Mutation updates record
**❌ FAIL**: Record not updated or error

---

### Step 3: Test All 8 Queries for Auth Bug

**Verify No "Unauthorized" Errors**:

Run each query as platform staff:
1. ✅ `getAllOrgsFeatureFlagStatus`
2. ✅ `updateOrgFeatureFlags`
3. ✅ `getOrgFeatureFlagStatus`
4. ✅ `setOrgAdminBlanketOverride`
5. ✅ `getCoachOverridesForOrg`
6. ✅ `grantCoachOverride`
7. ✅ `revokeCoachOverride`
8. ✅ `getPendingAccessRequests`

**Expected for All**:
- No "Unauthorized: Platform staff only" error
- No "User not found" error
- All return valid data

**✅ PASS**: All 8 queries work
**❌ FAIL**: Any query throws auth error

---

## Integration Test: Full Workflow

**Goal**: Test complete flow from platform staff to org admin to coach

### Step 1: Platform Staff Enables Delegation

1. Log in as platform staff
2. Navigate to `/platform/feature-flags`
3. Find test organization
4. Enable:
   - ✅ Gates (ON)
   - ✅ Admin Delegation (ON)
   - ✅ Coach Overrides (ON)
5. **VERIFY**: All toggles ON, Last Changed updates

---

### Step 2: Org Admin Grants Individual Override

1. Log in as org admin for that org
2. Navigate to `/orgs/{orgId}/admin/settings/features`
3. Verify status card shows all permissions enabled
4. Click "Grant Override" button
5. Select Level 0/1 coach
6. Set expiration: 7 days
7. Enter reason: "Integration test override"
8. Click [Grant]
9. **VERIFY**: Override appears in table

---

### Step 3: Coach Accesses "Sent to Parents" Tab

1. Log in as the Level 0/1 coach
2. Navigate to Voice Notes dashboard
3. **VERIFY**: "Sent to Parents" tab visible
4. Click tab
5. **VERIFY**: Can view sent summaries
6. **VERIFY**: Search and filter work

---

### Step 4: Org Admin Revokes Override

1. Log back in as org admin
2. Navigate to feature flags page
3. Find the override in table
4. Click "Revoke"
5. Confirm
6. **VERIFY**: Override removed from table

---

### Step 5: Coach Loses Access

1. Log back in as coach
2. Refresh Voice Notes dashboard
3. **VERIFY**: "Sent to Parents" tab now HIDDEN
4. **VERIFY**: Lock icon/tooltip visible

---

### Step 6: Org Admin Enables Blanket Override

1. Log in as org admin
2. Enable blanket override toggle
3. Confirm
4. **VERIFY**: Toggle ON, metadata shows

---

### Step 7: All Coaches Gain Access

1. Log in as Level 0 coach
2. **VERIFY**: Tab visible
3. Log in as Level 1 coach
4. **VERIFY**: Tab visible
5. Log in as Level 2+ coach
6. **VERIFY**: Tab visible (still has access)

---

### Step 8: Platform Staff Disables Gates

1. Log in as platform staff
2. Navigate to feature flags
3. Find the org
4. Disable Gates toggle
5. **VERIFY**: Gates OFF

---

### Step 9: Verify Status Updates

1. As org admin, refresh feature flags page
2. **VERIFY**: Status card shows "Gates OFF"
3. **VERIFY**: Warning message visible
4. As coach, verify tab still visible (gates disabled)

---

**✅ INTEGRATION PASS**: Full workflow works end-to-end
**❌ INTEGRATION FAIL**: Any step fails

---

## Expected Behaviors Summary

### Access Rules (in priority order)

**Access GRANTED if ANY of**:
1. ✅ Trust gates disabled by platform staff (ALL coaches get access)
2. ✅ Blanket override enabled by org admin (ALL coaches get access)
3. ✅ Individual override granted and not expired (specific coach)
4. ✅ Coach trust level 2 or higher (default rule)

**Access DENIED if**:
- ❌ Trust gates ON
- ❌ No blanket override
- ❌ No individual override
- ❌ Coach trust level < 2

### UI States

**Platform Staff Table Row**:
- 3 toggle switches (Gates, Admin Delegation, Coach Overrides)
- 2 count badges (Individual Overrides, Pending Requests)
- Last Changed column (user + date)
- Actions dropdown (View Details, Reset)

**Org Admin Dashboard**:
- Status card (Gates ON/OFF, Delegation status, Override permissions)
- Blanket override toggle (if delegation enabled)
- Overview stats (coaches, access, overrides, requests)
- Individual overrides table (if coach overrides enabled)
- Pending requests section

**Coach Voice Notes Tab**:
- Tab visible: Level 2+ OR override granted OR blanket override OR gates disabled
- Tab hidden: Level 0/1 AND no override AND gates ON
- Lock icon/tooltip when hidden

---

## Troubleshooting

### "Unauthorized: Platform staff only" Error

**Symptom**: Can't access `/platform/feature-flags` even as platform staff

**Cause**: Auth pattern bug in `trustGatePermissions.ts`

**Fix Applied**: All queries now use `authComponent.safeGetAuthUser(ctx)`

**Verify Fix**:
1. Check `packages/backend/convex/models/trustGatePermissions.ts`
2. Line 1: Should have `import { authComponent } from "../auth";`
3. Each handler should use:
```typescript
const currentUser = await authComponent.safeGetAuthUser(ctx);
if (!currentUser?.isPlatformStaff) {
  throw new Error("Unauthorized: Platform staff only");
}
```

**If Still Failing**:
- Clear browser cookies/cache
- Log out and back in (refresh session token)
- Verify `isPlatformStaff: true` in database
- Check Convex logs for actual error

---

### Toggles Don't Update

**Symptom**: Click toggle, but it reverts or doesn't change

**Checks**:
1. Console errors? (Network tab)
2. Mutation executing? (Convex dashboard logs)
3. Permission denied error?
4. Database record exists in `trustGateOrgPermissions`?

**Fix**:
- If no record: Create one via Convex dashboard
- If permission error: Verify platform staff role
- If network error: Check Convex deployment status

---

### Coach Tab Not Hiding/Showing

**Symptom**: Tab visibility incorrect for trust level

**Debug Steps**:
1. Check coach trust level in `coachTrustLevels` table
2. Check for individual override in `trustGateCoachOverrides`
3. Check blanket override in `trustGateOrgPermissions`
4. Check gates status: `trustGatesActive`

**Verify Logic File**:
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx`
- Should check all 4 conditions (gates, blanket, override, level)

---

### Counts Incorrect (Overrides, Requests)

**Symptom**: Badge shows wrong count or 0 when data exists

**Checks**:
1. Convex → `trustGateCoachOverrides`: Count active overrides
2. Convex → `trustGateAccessRequests`: Count pending requests
3. Filter by `organizationId`
4. Check for expired overrides (expiresAt < now)

**Fix**:
- If query filtering wrong: Check backend query logic
- If counts don't update: Refresh data or check real-time subscription

---

### Pagination Not Working

**Symptom**: Shows all orgs on one page or pagination broken

**Checks**:
1. Are there 20+ organizations?
2. Console errors?
3. Pagination component rendering?

**Fix**:
- If < 20 orgs: Expected behavior (no pagination needed)
- If error: Check pagination component props
- Test by creating more test orgs in Convex

---

### Bulk Actions Fail

**Symptom**: Select multiple orgs, bulk action doesn't execute

**Checks**:
1. Are rows actually selected? (checkboxes checked)
2. Confirmation dialog appearing?
3. Mutation executing? (Convex logs)
4. Any console errors?

**Fix**:
- If selections lost: Check selection state management
- If mutation fails: Verify mutation accepts array of org IDs
- If confirmation doesn't appear: Check dialog component

---

## Success Criteria Summary

**Phase 8 Week 1.5 is COMPLETE when**:

### US-P8-021: Backend Trust Gate Permission System
- ✅ All 8 queries work without "Unauthorized" errors
- ✅ Uses correct Better Auth pattern (`authComponent.safeGetAuthUser`)
- ✅ findMany results use `.page` property

### US-P8-002-FIX: Fix Trust Gate Check in Voice Notes Dashboard
- ✅ Level 0/1 coaches: Tab hidden (base case)
- ✅ Level 2+ coaches: Tab visible (base case)
- ✅ Individual override: Tab visible for overridden coach
- ✅ Blanket override: Tab visible for all coaches
- ✅ Gates disabled: Tab visible for all coaches

### US-P8-022: Platform Staff Feature Flags Admin UI
- ✅ Page loads at `/platform/feature-flags`
- ✅ Table shows all organizations
- ✅ 3 toggles work (Gates, Admin Delegation, Coach Overrides)
- ✅ Last Changed column shows user + date
- ✅ Actions dropdown (View Details, Reset to Default)
- ✅ Sort controls work (Name, Last Changed, Override Count)
- ✅ Pagination (20 per page)
- ✅ Clickable counts (Overrides, Requests)
- ✅ Bulk actions (4 actions, with confirmations)
- ✅ Search and filters work

### US-P8-022B: Platform Staff Overview Dashboard
- ✅ 4 overview cards render
- ✅ Counts accurate (Total Orgs, Gates Disabled, Admin Overrides, Pending Requests)

### US-P8-023: Org Admin Trust Gate Status Dashboard
- ✅ Page loads at `/orgs/{orgId}/admin/settings/features`
- ✅ Current status card shows correct state
- ✅ Admin blanket override toggle works
- ✅ Overview stats accurate
- ✅ Individual overrides table displays
- ✅ Grant/revoke override functionality
- ✅ Pending requests section (approve/deny)

### Integration
- ✅ Full workflow: Platform staff → Org admin → Coach access
- ✅ Access rules enforced correctly
- ✅ All permission changes reflected in UI immediately
- ✅ Database records update correctly
- ✅ No console errors

---

## Test Coverage Checklist

**Before marking P8 Week 1.5 complete**:

### Platform Staff Features
- [ ] Feature flags page loads without auth error
- [ ] Overview cards show correct counts
- [ ] All 3 toggles work and persist
- [ ] Last Changed column displays correctly
- [ ] Actions dropdown (View Details, Reset)
- [ ] Sort controls work (3 sortable columns)
- [ ] Pagination works (if 20+ orgs)
- [ ] Override counts clickable
- [ ] Request counts clickable
- [ ] Bulk action: Enable Admin Delegation
- [ ] Bulk action: Enable Coach Overrides
- [ ] Bulk action: Disable All Gates (with confirmation)
- [ ] Bulk action: Clear Selection
- [ ] Search filters organizations
- [ ] All 6 filters work correctly
- [ ] Combine search + filter works

### Org Admin Features
- [ ] Feature flags page loads
- [ ] Status card shows correct state
- [ ] Blanket override toggle works
- [ ] Overview stats accurate
- [ ] Individual overrides table displays
- [ ] Grant override creates access
- [ ] Revoke override removes access
- [ ] Pending requests show
- [ ] Approve request grants override
- [ ] Deny request rejects with reason

### Coach Voice Notes
- [ ] Level 0/1: Tab hidden (no access)
- [ ] Level 2+: Tab visible (default access)
- [ ] Individual override: Tab visible
- [ ] Blanket override: Tab visible for all
- [ ] Gates disabled: Tab visible for all
- [ ] Override expiration: Tab hides

### Backend Verification
- [ ] All 8 queries work without auth errors
- [ ] getAllOrgsFeatureFlagStatus returns correct data
- [ ] updateOrgFeatureFlags mutation works
- [ ] Toggle changes update database
- [ ] Last Changed metadata updates
- [ ] Counts calculated correctly

### Integration Testing
- [ ] Full workflow: Platform → Admin → Coach
- [ ] Access granted correctly
- [ ] Access revoked correctly
- [ ] All permission types work
- [ ] Priority logic correct

---

**Testing Duration Estimate**: 2-3 hours for full coverage

**Quick Smoke Test**: 30 minutes (Platform staff page + Org admin page + Coach access)

**Critical Path**: Platform staff toggles + Org admin blanket override + Coach tab visibility

---

## Notes for Future Testing

### Known Limitations
- Platform-level player identity not implemented (future phase)
- No coach-initiated access request flow yet (UI placeholder only)
- No notification system for approved/denied requests (future enhancement)

### Future Enhancements to Test
- Coach self-service access requests
- Email notifications for approvals/denials
- Audit log for all permission changes
- Bulk approval/denial of requests
- Override templates (common expiration periods)
- Analytics on override usage

### Related Features
- Trust level advancement (Phase 5-7)
- Parent summary auto-approval (Phase 5)
- Voice notes AI insights (Phase 7)

---

**Last Updated**: 2026-01-27
**Auth Bug Fixed**: All Better Auth patterns corrected
**Ready for UAT**: ✅ Yes
