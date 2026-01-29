# P8 Week 1.5 - Self-Service Access Control - Comprehensive Testing Guide

**Feature**: Coach Self-Service Access Control & Admin Management
**Phase**: P8 Week 1.5
**Version**: 1.0
**Last Updated**: January 28, 2026

---

## Overview

This guide covers comprehensive UAT testing for the self-service access control system that enables:
- **Platform Staff**: Control org admin and coach capabilities
- **Org Admins**: Bulk and individual coach access management
- **Coaches**: Self-service toggle for parent communication access

**Key Features**:
- 8-priority access logic (admin block > self-disable > trust level > override)
- Coach self-service toggle (hide/show "Sent to Parents" tab)
- Coach request access workflow
- Admin bulk enable/disable all coaches
- Admin block/unblock individual coaches
- Comprehensive coach status visibility for admins

---

## Prerequisites

### Test Accounts

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| **Platform Staff** | (create with `isPlatformStaff: true`) | `lien1979` | Configure org-level flags |
| **Org Admin** | Create via invite with role="admin" | `lien1979` | Manage coach access |
| **Coach Level 2+** | `neil.B@blablablak.com` | `lien1979` | Test self-service toggle |
| **Coach Level 0** | (create new) | `lien1979` | Test request access flow |
| **Coach Level 1** | (create new) | `lien1979` | Test request access flow |

### Required Setup

1. Organization with `voiceNotesTrustGatesEnabled: true` (default)
2. At least 3 coaches at different trust levels (0, 1, 2)
3. Platform Staff user with access to Admin Settings
4. Org Admin user with delegation permissions
5. Test voice notes with parent summaries

### Database Tables to Verify

**Better Auth Organization Table**:
- `voiceNotesTrustGatesEnabled` (boolean, default true)
- `allowAdminDelegation` (boolean, default false)
- `allowCoachOverrides` (boolean, default false)
- `adminOverrideTrustGates` (boolean) - Grant all coaches access
- `adminBlanketBlock` (boolean) - Block all coaches
- `adminBlanketBlockSetBy`, `adminBlanketBlockSetAt`

**coachOrgPreferences Table**:
- `trustGateOverride` (boolean) - Individual override granted
- `parentAccessEnabled` (boolean) - Coach self-service toggle
- `adminBlocked` (boolean) - Admin blocked individual coach
- `blockReason`, `blockedBy`, `blockedAt`

---

## 8-Priority Access Logic Reference

The system uses a waterfall priority to determine if a coach has access:

| Priority | Condition | Result | Can Coach Toggle? |
|----------|-----------|--------|-------------------|
| **1** | Admin blanket block enabled | ❌ No Access | No |
| **2** | Individual admin block | ❌ No Access | No |
| **3** | Coach self-disabled | ❌ No Access | Yes (can toggle back on) |
| **4** | Gates disabled via flags | ✅ Access | N/A |
| **5** | Admin blanket override | ✅ Access | Yes |
| **6** | Trust Level 2+ | ✅ Access | Yes |
| **7** | Individual override granted | ✅ Access | Yes |
| **8** | Default | ❌ No Access | Request if overrides enabled |

---

## Test Cases

### Section A: Platform Staff Controls

#### TC-P8-001: Platform Staff Feature Flag Configuration
**Test**: Platform staff can configure org-level trust gate settings
**Steps**:
1. Login as platform staff user
2. Navigate to `/orgs/{orgId}/admin/settings/features`
3. Scroll to "Trust Gate Access Control" section

**Expected**:
- ✅ "Enable Trust Gates" toggle visible (default: ON)
- ✅ "Allow Admin Delegation" toggle visible (default: OFF)
- ✅ "Allow Coach Override Requests" toggle visible (default: OFF)
- ✅ All toggles functional and save immediately
- ✅ Toast confirmation on each toggle

**Notes**: Only platform staff see this section. Regular admins see "Contact platform staff" message.

---

#### TC-P8-002: Disable Trust Gates Entirely
**Test**: Disabling gates gives all coaches access regardless of level
**Steps**:
1. As platform staff, disable "Enable Trust Gates"
2. Switch to Coach Level 0 account
3. Navigate to Voice Notes dashboard

**Expected**:
- ✅ "Sent to Parents" tab visible immediately
- ✅ No "Request Access" button (access is automatic)
- ✅ All coaches see tab regardless of trust level

**Cleanup**: Re-enable "Enable Trust Gates" for remaining tests

---

#### TC-P8-003: Enable Admin Delegation
**Test**: Admins can only manage coaches if delegation is enabled
**Steps**:
1. As platform staff, disable "Allow Admin Delegation"
2. Login as org admin
3. Navigate to `/orgs/{orgId}/admin/settings/features`
4. Scroll to Trust Gate section

**Expected**:
- ✅ No bulk controls visible
- ✅ No individual coach table visible
- ✅ Message: "Admin delegation is not enabled for this organization"

**Then**:
5. As platform staff, enable "Allow Admin Delegation"
6. Refresh admin page

**Expected**:
- ✅ "Bulk Access Control" card appears
- ✅ "Individual Coach Access Control" table appears
- ✅ "Active Override Details" table appears (if overrides exist)

---

#### TC-P8-004: Enable Coach Override Requests
**Test**: Coaches can only request access if overrides are enabled
**Steps**:
1. As platform staff, disable "Allow Coach Override Requests"
2. Login as Coach Level 0
3. Navigate to Voice Notes dashboard

**Expected**:
- ✅ "Sent to Parents" tab shows locked icon
- ✅ No "Request Access" button visible
- ✅ Tooltip shows: "Available at Trust Level 2+"

**Then**:
4. As platform staff, enable "Allow Coach Override Requests"
5. Refresh coach dashboard

**Expected**:
- ✅ "Request Access" button appears (green highlight)
- ✅ Locked icon replaced with clickable button

---

### Section B: Org Admin Controls

#### TC-P8-005: View All Coaches Status Table
**Test**: Admin sees comprehensive status for all coaches
**Prerequisites**: Enable admin delegation
**Steps**:
1. Login as org admin
2. Navigate to `/orgs/{orgId}/admin/settings/features`
3. Scroll to "Individual Coach Access Control" table

**Expected**:
- ✅ Table shows all coaches in organization
- ✅ Columns: Coach Name, Trust Level, Status, Access Reason, Actions
- ✅ Trust Level shows "Level 0", "Level 1", "Level 2", "Level 3"
- ✅ Status badges:
  - 🚫 "Blocked" (red) - Admin blocked
  - 👤 "Self-Off" (gray) - Coach disabled
  - ✓ "Active" (green) - Has access
  - "No Access" (outline) - No access
- ✅ Access Reason shows specific explanation (e.g., "Trust Level 2", "Admin blocked: reason text")
- ✅ Actions column shows "Block" or "Unblock" button

---

#### TC-P8-006: Admin Bulk Grant Access (Override)
**Test**: Admin can grant access to all coaches at once
**Prerequisites**: Admin delegation enabled, Coach Level 0 exists
**Steps**:
1. As org admin, find "Bulk Access Control" card
2. Enable "Grant All Coaches Access" toggle
3. Switch to Coach Level 0 account
4. Check Voice Notes dashboard

**Expected**:
- ✅ Toast: "Blanket override enabled"
- ✅ Coach Level 0 now sees "Sent to Parents" tab
- ✅ Tab appears for ALL coaches regardless of level
- ✅ Individual coach table shows all coaches with "✓ Active" status
- ✅ Access Reason: "Admin granted access to all coaches"

**Then**:
5. As org admin, disable "Grant All Coaches Access"
6. Refresh Coach Level 0 dashboard

**Expected**:
- ✅ "Sent to Parents" tab disappears (coach loses access)
- ✅ Toast: "Blanket override disabled"

---

#### TC-P8-007: Admin Bulk Block All Coaches
**Test**: Admin can block ALL coaches including Level 2+
**Prerequisites**: Admin delegation enabled, Coach Level 2+ exists with access
**Steps**:
1. Verify Coach Level 2+ has "Sent to Parents" tab visible
2. As org admin, enable "Block All Coaches" toggle
3. Refresh Coach Level 2+ dashboard

**Expected**:
- ✅ Toast: "All coaches blocked from parent access"
- ✅ Coach Level 2+ loses "Sent to Parents" tab immediately
- ✅ If coach was on that tab, switches to "New" tab
- ✅ Individual coach table shows all coaches with "🚫 Blocked" status
- ✅ Access Reason: "Admin has disabled parent access for all coaches"

**Then**:
4. As org admin, disable "Block All Coaches"
5. Refresh Coach Level 2+ dashboard

**Expected**:
- ✅ "Sent to Parents" tab reappears
- ✅ Toast: "All coaches unblocked"

---

#### TC-P8-008: Admin Block Individual Coach
**Test**: Admin blocks specific coach with reason
**Prerequisites**: Coach Level 2+ with access
**Steps**:
1. As org admin, find coach in "Individual Coach Access Control" table
2. Click "Block" button for Coach Level 2+
3. In dialog, enter reason: "Testing individual block"
4. Click "Block Access"

**Expected**:
- ✅ Dialog appears: "Block Coach Access?"
- ✅ Dialog has textarea for reason
- ✅ Toast: "Coach access blocked"
- ✅ Dialog closes automatically
- ✅ Table updates: coach now shows "🚫 Blocked" badge
- ✅ Access Reason: "Testing individual block"
- ✅ Button changes from "Block" to "Unblock"

**Then**:
5. Switch to blocked coach account
6. Navigate to Voice Notes dashboard

**Expected**:
- ✅ "Sent to Parents" tab NOT visible
- ✅ Locked tab shows tooltip: "Testing individual block"
- ✅ No "Request Access" button (cannot override admin block)

---

#### TC-P8-009: Admin Unblock Individual Coach
**Test**: Admin restores access to blocked coach
**Prerequisites**: Coach blocked in TC-P8-008
**Steps**:
1. As org admin, find blocked coach in table
2. Click "Unblock" button
3. Confirm in dialog

**Expected**:
- ✅ Dialog: "Unblock Coach Access?"
- ✅ Toast: "Coach access unblocked"
- ✅ Table updates: coach shows "✓ Active" if Level 2+, or "No Access" if Level 0/1
- ✅ Button changes from "Unblock" to "Block"

**Then**:
4. Switch to coach account
5. Refresh Voice Notes dashboard

**Expected**:
- ✅ If Level 2+: "Sent to Parents" tab reappears
- ✅ If Level 0/1: "Request Access" button appears (if overrides enabled)

---

#### TC-P8-010: Admin Cannot Block Self-Disabled Coach
**Test**: Block button disabled for coaches who disabled themselves
**Prerequisites**: Coach with `parentAccessEnabled: false` (self-disabled)
**Steps**:
1. As org admin, find self-disabled coach in table
2. Check "Block" button state

**Expected**:
- ✅ Status badge: "👤 Self-Off"
- ✅ Access Reason: "You disabled this feature. Use the tab dropdown to re-enable."
- ✅ "Block" button is disabled
- ✅ Coach must re-enable first before admin can block

---

#### TC-P8-011: Admin Reviews Pending Override Requests
**Test**: Admin sees and can approve/deny coach requests
**Prerequisites**: Coach override requests enabled, coach submitted request
**Steps**:
1. As org admin, scroll to "Pending Override Requests" table
2. Find coach request

**Expected**:
- ✅ Table shows: Coach Name, Requested At, Reason, Actions
- ✅ Coach's reason visible (or "No reason provided")
- ✅ "Grant Override" button (green)
- ✅ "Deny" button (red)

**Then** (covered in existing tests - not changed by P8 Week 1.5):
3. Click "Grant Override"
4. Check coach gets access

---

### Section C: Coach Self-Service Controls

#### TC-P8-012: Coach Level 2+ Sees Dropdown on Tab
**Test**: Coaches with access can hide tab via dropdown
**Prerequisites**: Coach Level 2+ with access
**Steps**:
1. Login as Coach Level 2+
2. Navigate to Voice Notes dashboard
3. Find "Sent to Parents" tab
4. Look for chevron/dropdown icon next to tab label

**Expected**:
- ✅ "Sent to Parents" tab visible
- ✅ Small chevron-down icon (▼) visible next to tab label
- ✅ Clicking chevron opens dropdown menu
- ✅ Dropdown shows "Hide this tab" option with eye-off icon

**Note**: If admin blocked or blanket block enabled, dropdown NOT visible.

---

#### TC-P8-013: Coach Hides Tab (Self-Disable)
**Test**: Coach can hide "Sent to Parents" tab
**Prerequisites**: Coach Level 2+ with dropdown visible
**Steps**:
1. Click chevron next to "Sent to Parents" tab
2. Click "Hide this tab" option
3. In confirmation dialog, click "Hide Tab"

**Expected**:
- ✅ Dialog appears: "Hide Parent Communication Tab?"
- ✅ Dialog text: "You can turn it back on anytime by clicking the 'Request Access' button"
- ✅ Toast: "Parent communication access disabled"
- ✅ Dialog closes
- ✅ "Sent to Parents" tab disappears immediately
- ✅ Dashboard switches to "New" tab
- ✅ "Request Access" button appears in its place (green highlight)

**Database Verification**:
- ✅ coachOrgPreferences record: `parentAccessEnabled: false`
- ✅ `adminBlocked` still false (admin did not block, coach chose to hide)

---

#### TC-P8-014: Coach Re-Enables Tab (Self-Enable)
**Test**: Coach can restore tab after hiding it
**Prerequisites**: Coach self-disabled in TC-P8-013
**Steps**:
1. Verify "Sent to Parents" tab NOT visible
2. Click green "Request Access" button
3. In dialog, click "Submit Request" (even though already approved)

**Expected**:
- ✅ Dialog: "Request Parent Communication Access"
- ✅ Toast: "Parent communication access enabled" (immediate, no admin approval needed)
- ✅ "Sent to Parents" tab reappears immediately
- ✅ Chevron dropdown visible again

**Database Verification**:
- ✅ coachOrgPreferences: `parentAccessEnabled: true`

**Note**: Because coach already had override/trust level, no admin approval needed. This is self-service toggle.

---

#### TC-P8-015: Coach Level 0/1 Sees Request Access Button
**Test**: Coaches without access can request if overrides enabled
**Prerequisites**: Coach Level 0 or 1, coach overrides enabled
**Steps**:
1. Login as Coach Level 0
2. Navigate to Voice Notes dashboard
3. Look at tabs

**Expected**:
- ✅ "Sent to Parents" tab NOT visible
- ✅ Green "Request Access" button visible instead of locked icon
- ✅ Button text: "Request Access"
- ✅ Clicking button opens dialog

---

#### TC-P8-016: Coach Submits Override Request
**Test**: Coach requests access with optional reason
**Prerequisites**: Coach Level 0, overrides enabled
**Steps**:
1. Click "Request Access" button
2. In dialog, enter reason: "Need to communicate with parents about new training schedule"
3. Click "Submit Request"

**Expected**:
- ✅ Dialog: "Request Parent Communication Access"
- ✅ Dialog text: "Your administrator will review your request and grant access if approved..."
- ✅ Textarea for reason (optional)
- ✅ Placeholder: "Why do you need access to parent communication features?"
- ✅ Toast: "Access request submitted. Your admin will review it shortly."
- ✅ Dialog closes

**Database Verification**:
- ✅ coachOrgPreferences: `overrideRequested: true`
- ✅ Request appears in admin "Pending Override Requests" table

**Note**: Tab does NOT appear yet. Coach must wait for admin approval.

---

#### TC-P8-017: Coach Cannot Request if Overrides Disabled
**Test**: Request button hidden when platform staff disabled overrides
**Prerequisites**: Coach Level 0, overrides disabled by platform staff
**Steps**:
1. As platform staff, disable "Allow Coach Override Requests"
2. Login as Coach Level 0
3. Check Voice Notes dashboard

**Expected**:
- ✅ NO "Request Access" button visible
- ✅ Locked icon with tooltip only
- ✅ Tooltip: "Available at Trust Level 2+"

---

#### TC-P8-018: Coach Cannot Toggle if Admin Blocked
**Test**: Admin block overrides coach self-service
**Prerequisites**: Coach Level 2+ blocked by admin
**Steps**:
1. As org admin, block Coach Level 2+ (TC-P8-008)
2. Login as blocked coach
3. Check Voice Notes dashboard

**Expected**:
- ✅ "Sent to Parents" tab NOT visible
- ✅ NO dropdown/chevron visible
- ✅ NO "Request Access" button
- ✅ Locked icon with tooltip: "Admin blocked: [reason]"
- ✅ Coach cannot override admin block in any way

**Access Check Result**:
- `hasAccess: false`
- `canRequest: false`
- `canToggle: false`
- `reason: "Admin blocked: Testing individual block"`

---

#### TC-P8-019: Coach Cannot Toggle if Blanket Block Active
**Test**: Admin blanket block overrides all coach controls
**Prerequisites**: Coach Level 2+ with access, admin blanket block enabled
**Steps**:
1. Verify Coach Level 2+ has "Sent to Parents" tab with dropdown
2. As org admin, enable "Block All Coaches"
3. Refresh coach dashboard

**Expected**:
- ✅ "Sent to Parents" tab disappears immediately
- ✅ NO "Request Access" button
- ✅ Locked icon with tooltip: "Admin has disabled parent access for all coaches"
- ✅ If coach was on that tab, switches to "New" tab

**Access Check Result**:
- `hasAccess: false`
- `canRequest: false`
- `canToggle: false`
- `reason: "Admin has disabled parent access for all coaches"`

---

### Section D: Complex Scenarios

#### TC-P8-020: Priority Order - Admin Block Beats Trust Level
**Test**: Admin block takes precedence over Trust Level 2+
**Prerequisites**: Coach Level 2+ (normally has access)
**Steps**:
1. Verify coach has access via Trust Level 2
2. Admin blocks individual coach
3. Check coach access

**Expected**:
- ✅ Coach loses access immediately (Priority 2 beats Priority 6)
- ✅ No "Request Access" button
- ✅ Cannot override admin block

**Access Check Priority Hit**: #2 (Individual admin block)

---

#### TC-P8-021: Priority Order - Self-Disable Beats Trust Level
**Test**: Coach self-disable takes precedence over their own trust level
**Prerequisites**: Coach Level 2+ with access
**Steps**:
1. Coach hides tab via dropdown
2. Check access status

**Expected**:
- ✅ Coach loses access (Priority 3 beats Priority 6)
- ✅ Coach CAN re-enable via "Request Access" button
- ✅ `canToggle: true` in access check

**Access Check Priority Hit**: #3 (Coach self-disabled)

---

#### TC-P8-022: Priority Order - Blanket Override Beats Trust Level
**Test**: Admin blanket override grants access to Level 0
**Prerequisites**: Coach Level 0 (no trust), gates enabled
**Steps**:
1. Verify Coach Level 0 has no access
2. Admin enables "Grant All Coaches Access"
3. Check coach access

**Expected**:
- ✅ Coach Level 0 gets access immediately (Priority 5 beats Priority 8)
- ✅ "Sent to Parents" tab appears
- ✅ Chevron dropdown visible
- ✅ Coach can toggle off if desired

**Access Check Priority Hit**: #5 (Admin blanket override)

---

#### TC-P8-023: Priority Order - Individual Override Beats Default
**Test**: Individual override grants access to Level 0
**Prerequisites**: Coach Level 0, admin granted individual override
**Steps**:
1. Coach Level 0 requests access
2. Admin grants override
3. Check coach access

**Expected**:
- ✅ Coach Level 0 gets access (Priority 7 beats Priority 8)
- ✅ "Sent to Parents" tab appears
- ✅ Coach can toggle off/on as desired

**Access Check Priority Hit**: #7 (Individual override)

---

#### TC-P8-024: State Transition - Coach Disables Then Admin Blocks
**Test**: What happens if coach self-disabled, then admin blocks them?
**Steps**:
1. Coach Level 2+ self-disables (hides tab)
2. Admin blocks same coach
3. Coach tries to re-enable

**Expected**:
- ✅ Coach self-disabled: `parentAccessEnabled: false`
- ✅ Admin blocks: `adminBlocked: true`
- ✅ "Request Access" button does NOT appear
- ✅ Locked icon with admin's block reason
- ✅ `canToggle: false` (admin block prevents self-service)

**Access Check Priority Hit**: #2 (Admin block beats self-disable)

---

#### TC-P8-025: State Transition - Admin Unblocks Self-Disabled Coach
**Test**: After admin unblocks, does coach's self-disable persist?
**Steps**:
1. Coach Level 2+ self-disabled
2. Admin blocks coach
3. Admin unblocks coach

**Expected**:
- ✅ After unblock, coach is STILL self-disabled
- ✅ Access check hits Priority #3 (self-disabled)
- ✅ "Request Access" button appears
- ✅ Coach must re-enable themselves
- ✅ `canToggle: true`

**Database State**:
- ✅ `adminBlocked: false` (admin unblocked)
- ✅ `parentAccessEnabled: false` (coach choice persists)

---

#### TC-P8-026: State Transition - Blanket Override Then Blanket Block
**Test**: Admin changes from grant all to block all
**Steps**:
1. Admin enables "Grant All Coaches Access"
2. Verify all coaches have access
3. Admin disables "Grant All", enables "Block All"

**Expected**:
- ✅ Step 1: All coaches get access (Level 0, 1, 2, 3)
- ✅ Step 3: All coaches lose access immediately (even Level 2+)
- ✅ Access check now hits Priority #1 (blanket block)
- ✅ No coaches can request or toggle

---

#### TC-P8-027: Admin Table Reflects Real-Time Changes
**Test**: Admin table updates when coach toggles access
**Steps**:
1. As org admin, keep "Individual Coach Access Control" table open
2. In different browser/tab, login as Coach Level 2+
3. Coach hides tab via dropdown
4. Refresh admin table

**Expected**:
- ✅ Coach status changes from "✓ Active" to "👤 Self-Off"
- ✅ Access Reason: "You disabled this feature. Use the tab dropdown to re-enable."
- ✅ hasAccess: false
- ✅ parentAccessEnabled: false

**Then**:
5. Coach re-enables access
6. Refresh admin table

**Expected**:
- ✅ Status changes back to "✓ Active"
- ✅ hasAccess: true
- ✅ parentAccessEnabled: true

---

### Section E: Edge Cases & Error Handling

#### TC-P8-028: Coach Rapid Toggle (On/Off/On)
**Test**: System handles rapid state changes
**Steps**:
1. Coach Level 2+ with access
2. Hide tab (off)
3. Immediately click "Request Access" (on)
4. Immediately click dropdown → hide tab (off again)

**Expected**:
- ✅ Each action completes successfully
- ✅ Final state matches last action
- ✅ No race conditions
- ✅ Database state consistent
- ✅ UI reflects current state accurately

---

#### TC-P8-029: Admin Blocks During Coach Toggle
**Test**: Race condition handling
**Steps**:
1. Coach Level 2+ opens dropdown menu
2. Admin blocks coach at exact same moment
3. Coach clicks "Hide this tab"

**Expected**:
- ✅ One of these occurs:
  - Admin block takes precedence (coach gets error toast)
  - Coach self-disable succeeds but tab stays hidden (admin block then applies)
- ✅ No inconsistent state
- ✅ Refresh resolves any UI inconsistency

---

#### TC-P8-030: Multiple Admins Manage Same Coach
**Test**: Two admins block/unblock same coach
**Steps**:
1. Admin A opens control table
2. Admin B opens control table
3. Admin A blocks Coach X
4. Admin B tries to block Coach X (should now show "Unblock")

**Expected**:
- ✅ Refresh after Admin A's action shows updated state
- ✅ Admin B sees "Unblock" button
- ✅ Last action wins (optimistic locking not required)

---

#### TC-P8-031: Non-Existent Coach ID in Preferences
**Test**: System handles missing coachOrgPreferences record
**Steps**:
1. New coach joins organization
2. Coach tries to access Voice Notes
3. Check access determination

**Expected**:
- ✅ checkCoachParentAccess creates default preferences record if missing
- ✅ Access determination based on trust level + flags
- ✅ No errors logged
- ✅ parentAccessEnabled defaults to true (not blocked by default)

---

#### TC-P8-032: Coach Deleted But Preferences Remain
**Test**: Orphaned preferences don't cause issues
**Steps**:
1. Coach has preferences record
2. Coach removed from organization (deleted member record)
3. Admin views coach table

**Expected**:
- ✅ Deleted coach does NOT appear in admin table
- ✅ getAllCoachesWithAccessStatus only returns current members
- ✅ Orphaned preferences ignored (cleanup can happen later)

---

#### TC-P8-033: Platform Staff Sees Admin Controls (Should Not)
**Test**: Platform staff cannot manage individual coaches
**Steps**:
1. Login as platform staff
2. Navigate to `/orgs/{orgId}/admin/settings/features`

**Expected**:
- ✅ Platform staff ONLY sees feature flag toggles
- ✅ Does NOT see "Bulk Access Control" card
- ✅ Does NOT see "Individual Coach Access Control" table
- ✅ Admin sections require `role === "admin" or "owner"` + `allowAdminDelegation`

---

### Section F: Integration with Existing Features

#### TC-P8-034: Self-Disabled Coach Still Progresses Trust Level
**Test**: Hiding tab doesn't affect trust level calculation
**Prerequisites**: Coach Level 1 with 9 approvals (1 away from Level 2)
**Steps**:
1. Coach hides tab (self-disables)
2. Coach creates voice note with insights
3. Coach approves insight (10th approval)
4. Check trust level

**Expected**:
- ✅ Trust level progresses to Level 2
- ✅ Coach still has no access (self-disabled)
- ✅ "Request Access" button visible (can re-enable)
- ✅ Access check shows: `canToggle: true`

---

#### TC-P8-035: Admin Block Doesn't Reset Trust Level
**Test**: Blocking coach doesn't affect their trust level
**Prerequisites**: Coach Level 2+
**Steps**:
1. Admin blocks coach
2. Check coach trust level record

**Expected**:
- ✅ Trust level remains Level 2
- ✅ totalApprovals unchanged
- ✅ Only access is blocked, not trust level
- ✅ When unblocked, coach gets access back immediately (trust level still valid)

---

#### TC-P8-036: Blanket Override + Auto-Approval Interaction
**Test**: Auto-approval works when blanket override active
**Prerequisites**: Admin blanket override enabled, Coach Level 0 with auto-approval settings
**Steps**:
1. Admin enables "Grant All Coaches Access"
2. Coach Level 0 has auto-approval preferences set
3. Voice note generates parent summary

**Expected**:
- ✅ Auto-approval still respects coach preferences (if enabled)
- ✅ Summary appears in "Sent to Parents" tab
- ✅ Coach can view auto-sent summaries
- ✅ No errors due to low trust level

---

#### TC-P8-037: Voice Notes Dashboard Loads Without Access Check
**Test**: Dashboard doesn't break if access check fails
**Steps**:
1. Temporarily break checkCoachParentAccess (e.g., invalid coachId)
2. Load Voice Notes dashboard

**Expected**:
- ✅ Dashboard loads successfully
- ✅ "Sent to Parents" tab hidden (safe default)
- ✅ Locked icon shown
- ✅ No JavaScript errors
- ✅ Error logged to console for debugging

---

### Section G: Performance & Scalability

#### TC-P8-038: Admin Table with 50+ Coaches
**Test**: Table performs well with many coaches
**Steps**:
1. Create organization with 50+ coaches at various trust levels
2. Login as org admin
3. Load "Individual Coach Access Control" table

**Expected**:
- ✅ Table loads in < 3 seconds
- ✅ All coaches displayed
- ✅ Scrollable if needed
- ✅ Search/filter functionality works (if implemented)

---

#### TC-P8-039: Bulk Block 100 Coaches
**Test**: Blanket block affects all coaches quickly
**Steps**:
1. Organization with 100 coaches
2. Admin enables "Block All Coaches"
3. Measure time to propagation

**Expected**:
- ✅ Single database write (organization record update)
- ✅ All coach dashboards update on next load/refresh
- ✅ < 1 second to toggle switch
- ✅ No per-coach mutations (efficient)

---

#### TC-P8-040: Access Check Query Performance
**Test**: checkCoachParentAccess executes quickly
**Steps**:
1. Call checkCoachParentAccess for coach
2. Measure query time

**Expected**:
- ✅ Query completes in < 100ms
- ✅ Uses indexes:
  - organization by _id
  - coachOrgPreferences by organizationId_coachId
  - coachTrustLevels by organizationId_coachId
- ✅ No full table scans

---

## Test Execution Checklist

### Quick Smoke Test (15 minutes)
- [ ] TC-P8-001: Platform staff can configure flags
- [ ] TC-P8-003: Enable admin delegation
- [ ] TC-P8-005: Admin sees coach table
- [ ] TC-P8-012: Coach Level 2+ sees dropdown
- [ ] TC-P8-013: Coach hides tab
- [ ] TC-P8-014: Coach re-enables tab
- [ ] TC-P8-008: Admin blocks coach
- [ ] TC-P8-009: Admin unblocks coach

### Full Regression (60 minutes)
Run all test cases in order A → G

### Critical Path (30 minutes)
- [ ] Section A: Platform Staff Controls (TC-P8-001 to TC-P8-004)
- [ ] Section B: Org Admin Controls (TC-P8-005 to TC-P8-011)
- [ ] Section C: Coach Self-Service (TC-P8-012 to TC-P8-019)
- [ ] Section D: Priority Logic (TC-P8-020 to TC-P8-027)

---

## Known Issues & Limitations

### Current Known Issues
- None identified (initial implementation)

### Future Enhancements
- Search/filter in admin coach table (org with 100+ coaches)
- Batch operations (block multiple coaches at once)
- Audit log for admin actions (who blocked/unblocked whom)
- Email notifications to coaches when blocked/unblocked
- Coach self-service history (how many times toggled on/off)

---

## Appendix A: Access Check API Reference

### Query: `checkCoachParentAccess`

**Args**:
- `coachId: string` - Coach user ID
- `organizationId: string` - Organization ID

**Returns**:
```typescript
{
  hasAccess: boolean,        // Can coach access parent features?
  reason: string,             // Human-readable explanation
  canRequest: boolean,        // Can coach request override?
  canToggle: boolean,         // Can coach toggle on/off themselves?
}
```

**Example Responses**:

```javascript
// Priority #1: Admin blanket block
{
  hasAccess: false,
  reason: "Admin has disabled parent access for all coaches",
  canRequest: false,
  canToggle: false
}

// Priority #3: Coach self-disabled
{
  hasAccess: false,
  reason: "You disabled this feature. Use the tab dropdown to re-enable.",
  canRequest: false,
  canToggle: true
}

// Priority #6: Trust Level 2+
{
  hasAccess: true,
  reason: "Trust Level 2",
  canRequest: false,
  canToggle: true
}

// Priority #8: Default (no access)
{
  hasAccess: false,
  reason: "Available at Trust Level 2",
  canRequest: true,  // if allowCoachOverrides enabled
  canToggle: false
}
```

---

## Appendix B: Database Schema Reference

### Organization Table Extensions
```typescript
{
  // Trust Gate Master Switches (Platform Staff)
  voiceNotesTrustGatesEnabled?: boolean,      // Default: true
  allowAdminDelegation?: boolean,             // Default: false
  allowCoachOverrides?: boolean,              // Default: false

  // Admin Bulk Controls
  adminOverrideTrustGates?: boolean,          // Grant all
  adminOverrideSetBy?: string,
  adminOverrideSetAt?: number,

  adminBlanketBlock?: boolean,                // Block all (NEW)
  adminBlanketBlockSetBy?: string,
  adminBlanketBlockSetAt?: number,
}
```

### coachOrgPreferences Table Extensions
```typescript
{
  coachId: string,
  organizationId: string,

  // Individual Override (Existing)
  trustGateOverride?: boolean,
  overrideGrantedBy?: string,
  overrideGrantedAt?: number,
  overrideReason?: string,

  // Coach Self-Service (NEW)
  parentAccessEnabled?: boolean,              // Default: true

  // Admin Block Individual Coach (NEW)
  adminBlocked?: boolean,
  blockReason?: string,
  blockedBy?: string,
  blockedAt?: number,
}
```

---

## Appendix C: Manual Testing Environment Setup

### Option 1: Local Development
```bash
# Start dev server (usually already running on port 3000)
npm run dev

# In separate terminal, monitor Convex logs
npx -w packages/backend convex dev

# Test URLs
http://localhost:3000/orgs/{orgId}/admin/settings/features  # Admin
http://localhost:3000/orgs/{orgId}/coach/voice-notes        # Coach
```

### Option 2: Preview Branch
```bash
# Push branch to GitHub
git push origin ralph/coach-impact-visibility-p8-week1

# Vercel will auto-deploy preview
# Check GitHub PR for preview URL
```

### Creating Test Accounts

**Platform Staff User**:
```javascript
// In Convex dashboard → user table → Edit record
{
  email: "staff@test.com",
  isPlatformStaff: true  // Add this field
}
```

**Org Admin User**:
```bash
# Invite as admin via Better Auth client
await authClient.organization.inviteMember({
  email: "admin@test.com",
  role: "admin",
  organizationId: "..."
})
```

**Coach at Different Levels**:
```javascript
// In Convex dashboard → coachTrustLevels table → Create
{
  organizationId: "...",
  coachId: "...",
  currentLevel: 0,  // or 1, 2, 3
  totalApprovals: 0
}
```

---

## Appendix D: Quick Reference - What Changed from P8 Week 1

### New Backend Queries/Mutations
- ✅ `checkCoachParentAccess` - Comprehensive 8-priority access check
- ✅ `getAllCoachesWithAccessStatus` - Admin view of all coaches
- ✅ `setAdminBlanketBlock` - Bulk block/unblock all coaches
- ✅ `blockIndividualCoach` - Admin blocks specific coach
- ✅ `unblockIndividualCoach` - Admin unblocks specific coach
- ✅ `toggleCoachParentAccess` - Coach self-service toggle

### New Database Fields
**Organization**:
- `adminBlanketBlock`, `adminBlanketBlockSetBy`, `adminBlanketBlockSetAt`

**coachOrgPreferences**:
- `parentAccessEnabled` (coach toggle)
- `adminBlocked`, `blockReason`, `blockedBy`, `blockedAt`

### New UI Components
**Admin Page**:
- Bulk Access Control card (grant all + block all toggles)
- Individual Coach Access Control table
- Block/Unblock confirmation dialogs

**Coach Dashboard**:
- Dropdown menu on "Sent to Parents" tab
- "Request Access" button (green highlight)
- Toggle off confirmation dialog
- Request access dialog

### Breaking Changes
- ❌ None - fully backwards compatible
- Old `areTrustGatesActive` query still works
- New `checkCoachParentAccess` recommended going forward

---

**End of Testing Guide**
