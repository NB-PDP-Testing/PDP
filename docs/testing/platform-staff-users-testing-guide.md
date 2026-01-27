# Platform Staff User Management - Comprehensive Testing Guide

**Feature**: Platform Staff User Management Dashboard
**Phases**: 1-5 (Schema, Backend, Dashboard UI, User Detail UI, Advanced Features)
**Version**: 1.0
**Last Updated**: January 27, 2026

---

## Overview

This guide covers comprehensive UAT testing for the Platform Staff User Management system, which enables platform administrators to view, manage, troubleshoot, and audit all users across all organizations.

**Key Features**:
- Dashboard with health metrics and analytics
- User search with multi-criteria filtering
- Comprehensive user detail pages with multiple tabs
- Impersonation capability for support
- Approval workflow for sensitive actions
- Bulk operations and data export
- Error log monitoring

---

## Prerequisites

### Test Accounts

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Platform Staff** | `neil.B@blablablak.com` | `lien1979` | Full platform access |
| **Org Admin** | (any org admin) | varies | No platform access |
| **Coach** | (any coach) | varies | No platform access |

### Required Setup

1. Dev server running on http://localhost:3000
2. At least 2 organizations with users
3. Multiple user types (coaches, parents, players)
4. Some users with activity history
5. Convex dashboard access for backend verification

---

## Phase 1: Schema Foundation

### Purpose
Verify all schema tables exist with correct fields and indexes.

### TC-PS-001: Verify userSessions Table
**Test**: Check Convex dashboard → Data → userSessions table
**Expected**:
- ✅ Table exists
- ✅ Fields: userId, sessionId, deviceType, browser, os, ipAddress, location, isActive, createdAt, lastActiveAt
- ✅ Indexes: by_userId, by_userId_and_active, by_lastActive, by_sessionId

### TC-PS-002: Verify userActivityLog Table
**Test**: Check Convex dashboard → Data → userActivityLog
**Expected**:
- ✅ Table exists
- ✅ Fields: userId, organizationId, activityType, resourceType, resourceId, metadata, timestamp
- ✅ Indexes: by_userId, by_userId_and_type, by_userId_and_timestamp, by_orgId, by_timestamp
- ✅ activityType includes: login, logout, page_view, voice_note_created, assessment_created, etc.

### TC-PS-003: Verify impersonationSessions Table
**Test**: Check Convex dashboard → Data → impersonationSessions
**Expected**:
- ✅ Table exists
- ✅ Fields: staffUserId, targetUserId, startedAt, expiresAt, endedAt, status, reason
- ✅ Indexes: by_staffUser, by_targetUser, by_status, by_expiresAt

### TC-PS-004: Verify platformStaffApprovalRequests Table
**Test**: Check Convex dashboard → Data → platformStaffApprovalRequests
**Expected**:
- ✅ Table exists
- ✅ Fields: requestedBy, actionType, targetUserId, status, reviewedBy, executedAt
- ✅ Indexes: by_status, by_requestedBy, by_targetUser, by_actionType

### TC-PS-005: Verify platformStaffAuditLog Table
**Test**: Check Convex dashboard → Data → platformStaffAuditLog
**Expected**:
- ✅ Table exists
- ✅ Fields: performedBy, targetUserId, action, beforeSnapshot, afterSnapshot, timestamp
- ✅ Indexes: by_performedBy, by_targetUserId, by_action, by_timestamp

### TC-PS-006: Verify platformErrorLog and platformUserNotifications
**Test**: Check Convex dashboard for both tables
**Expected**:
- ✅ platformErrorLog exists with severity levels
- ✅ platformUserNotifications exists with notificationType field

---

## Phase 2: Core Backend Queries

### Purpose
Verify all backend queries return correct data.

### TC-PS-010: Platform Health Metrics Query
**Test**: Call getPlatformHealthMetrics in Convex dashboard
**Steps**:
1. Open Convex dashboard → Functions
2. Call `models/platformStaff:getPlatformHealthMetrics` with args: `{}`
3. Examine response

**Expected**:
- ✅ totalUsers count returned
- ✅ platformStaffCount returned
- ✅ verifiedUsersCount returned
- ✅ newUsersLast30Days calculated
- ✅ totalOrganizations count
- ✅ signupsOverTime array (30 days)
- ✅ usersByOrganization array sorted by count

### TC-PS-011: Search Users Query - Basic
**Test**: Search for users by email/name
**Steps**:
1. Call `models/platformStaff:searchPlatformUsers`
2. Args: `{ searchQuery: "neil", cursor: null, limit: 20 }`

**Expected**:
- ✅ Returns users matching "neil" in name or email
- ✅ Returns array with user objects
- ✅ Includes nextCursor if more results exist
- ✅ Case-insensitive search works

### TC-PS-012: Search Users Query - Filters
**Test**: Apply multiple filters
**Steps**:
1. Search with organizationId filter
2. Search with isPlatformStaff filter
3. Search with functionalRole filter (coach/parent)
4. Search with accountStatus filter (suspended)

**Expected**:
- ✅ Each filter correctly narrows results
- ✅ Multiple filters can combine (AND logic)
- ✅ No results when filters impossible to satisfy

### TC-PS-013: Search Users Query - Child Name
**Test**: Search parents by child name
**Steps**:
1. Call with args: `{ childName: "John" }`
2. Should return parent accounts linked to players named John

**Expected**:
- ✅ Only returns users with guardian identities
- ✅ Matches children's firstName or lastName
- ✅ Case-insensitive matching

### TC-PS-014: Get User Details Query
**Test**: Fetch comprehensive user details
**Steps**:
1. Get a test userId from users table
2. Call `models/platformStaff:getPlatformUserDetails`
3. Args: `{ userId: "<test-user-id>" }`

**Expected**:
- ✅ Returns user auth record
- ✅ Returns all organization memberships with roles
- ✅ Returns player identities if user is player
- ✅ Returns guardian identities if user is parent
- ✅ Returns coach assignments if user is coach
- ✅ Calculates activity stats
- ✅ Logs view action to audit trail

---

## Phase 3: Dashboard & User List UI

### Purpose
Test the platform users dashboard and search interface.

### TC-PS-020: Dashboard Access Control
**Test**: Verify only platform staff can access
**Steps**:
1. Logout
2. Login as regular user (coach/parent)
3. Try to navigate to `/platform/users`

**Expected**:
- ✅ Redirected or shown unauthorized message
- ✅ No platform users link in navigation

**Steps** (Platform Staff):
1. Login as `neil.B@blablablak.com`
2. Navigate to `/platform/users`

**Expected**:
- ✅ Dashboard loads successfully
- ✅ Gradient background (blue theme)
- ✅ Back button to /platform visible

### TC-PS-021: Dashboard Stats Cards
**Test**: Health metrics display correctly
**Steps**:
1. View dashboard stats cards (first row)
2. Check values make sense

**Expected**:
- ✅ Total Users count > 0
- ✅ Active (7d) count ≤ Total Users
- ✅ New (30d) count shown
- ✅ Platform Staff count shown
- ✅ Cards have appropriate colors (blue, green, purple, amber)

**Steps** (Second Row):
1. Check Verified, Suspended, Dormant, Total Orgs cards

**Expected**:
- ✅ All counts ≥ 0
- ✅ Suspended count uses red/amber color

### TC-PS-022: Signups Chart
**Test**: Visual chart displays
**Steps**:
1. Scroll to charts section
2. Find signups over time chart

**Expected**:
- ✅ Line chart renders
- ✅ Shows last 30 days of data
- ✅ X-axis shows dates
- ✅ Y-axis shows signup counts
- ✅ Hover shows specific values

### TC-PS-023: Organization Distribution Chart
**Test**: Users by organization chart
**Steps**:
1. Find org distribution chart
2. Check it shows top organizations

**Expected**:
- ✅ Bar or pie chart renders
- ✅ Shows top 10 organizations
- ✅ Shows member counts
- ✅ Sorted by count (descending)

### TC-PS-024: Quick Links
**Test**: Navigation cards work
**Steps**:
1. Find quick links section
2. Click "User List"
3. Should navigate to `/platform/users/list`

**Expected**:
- ✅ User List link works
- ✅ Pending Approvals link shows badge if approvals pending
- ✅ Error Logs link works
- ✅ Icons display correctly

### TC-PS-025: User List Page - Basic Search
**Test**: Search functionality
**Steps**:
1. Navigate to `/platform/users/list`
2. Type "neil" in search box
3. Wait for results

**Expected**:
- ✅ Search input works
- ✅ Results update as you type (debounced)
- ✅ Loading skeleton shows while fetching
- ✅ Results table displays matching users

### TC-PS-026: User List - Results Table
**Test**: Table columns and data
**Steps**:
1. Perform a search that returns results
2. Examine table

**Expected**:
- ✅ Columns: Name, Email, Status badges, Created date
- ✅ Status badges show:
  - Green "Verified" if email verified
  - Purple "Staff" if platform staff
  - Red "Suspended" if suspended
- ✅ Empty state message if no results

### TC-PS-027: User List - Filters
**Test**: Filter dropdowns work
**Steps**:
1. Open organization filter dropdown
2. Select an organization
3. Results should filter

**Expected**:
- ✅ Organization dropdown populated with all orgs
- ✅ Functional role filter works (coach, parent, admin, player)
- ✅ Account status filter works (active, suspended, dormant)
- ✅ Platform staff toggle works

### TC-PS-028: User List - Child Name Search
**Test**: Search parents by child name
**Steps**:
1. Find "Search by child name" input
2. Type a child's name
3. Wait for results

**Expected**:
- ✅ Secondary search input visible
- ✅ Only returns parent accounts
- ✅ Helper text explains this feature
- ✅ Loading indicator during search

### TC-PS-029: User List - Row Actions
**Test**: Actions on each user row
**Steps**:
1. Find a user row
2. Click actions menu (three dots or dropdown)

**Expected**:
- ✅ "View Details" action navigates to `/platform/users/[userId]`
- ✅ "View as User" action present (opens impersonation dialog in Phase 5)
- ✅ Icons show for each action

---

## Phase 4: User Detail UI

### Purpose
Test comprehensive user detail page with all tabs.

### TC-PS-030: User Detail Page Layout
**Test**: Page loads and header displays
**Steps**:
1. Click "View Details" on any user from list
2. Should navigate to `/platform/users/[userId]`

**Expected**:
- ✅ Page loads without error
- ✅ Header shows user name and email
- ✅ Back button to user list works
- ✅ Action buttons: Edit Profile, Suspend, View as User
- ✅ Stats cards display

### TC-PS-031: User Detail Stats Cards
**Test**: Quick stats at top
**Steps**:
1. View stats cards on user detail page

**Expected**:
- ✅ Organizations count shown
- ✅ Teams coached count (if coach)
- ✅ Account age in days
- ✅ Children linked count (if parent)
- ✅ Last login (days ago)
- ✅ Verification badge visible
- ✅ Platform Staff badge if applicable

### TC-PS-032: Overview Tab
**Test**: Default tab content
**Steps**:
1. User detail page loads with Overview tab active
2. Check displayed information

**Expected**:
- ✅ Profile fields: firstName, lastName, email, phone
- ✅ Account dates: createdAt, updatedAt
- ✅ Verification status shown
- ✅ Onboarding status shown

### TC-PS-033: Organizations Tab
**Test**: User's organization memberships
**Steps**:
1. Click Organizations tab
2. Tab label shows count: "Organizations (N)"

**Expected**:
- ✅ Lists all organization memberships in cards
- ✅ Each card shows:
  - Organization name
  - Role (owner/admin/member)
  - Functional roles as badges (coach, parent, admin)
  - Suspended badge if member.isDisabled
- ✅ Per-org action buttons placeholder visible

### TC-PS-034: Player Identity Tab (Conditional)
**Test**: Only shows if user is a player
**Steps**:
1. View user who is a player (adult or youth with account)
2. Player Identity tab should be visible

**Expected**:
- ✅ Tab only appears if playerIdentities.length > 0
- ✅ Displays player identity details: name, DOB, playerType
- ✅ Lists organization enrollments with status
- ✅ Lists team assignments with team names

**Steps** (Non-Player):
1. View user who is NOT a player
2. Player Identity tab should NOT appear

### TC-PS-035: Guardian Identity Tab (Conditional)
**Test**: Only shows if user is a parent
**Steps**:
1. View parent user
2. Guardian Identity tab should appear

**Expected**:
- ✅ Tab only if guardianIdentities.length > 0
- ✅ Displays guardian identity details
- ✅ Lists linked children with:
  - Name
  - Relationship (mother/father/guardian)
  - isPrimary badge
  - Each child's organization enrollments

### TC-PS-036: Coach Identity Tab (Conditional)
**Test**: Only shows if user is a coach
**Steps**:
1. View coach user
2. Coach Identity tab should appear

**Expected**:
- ✅ Tab only if coachAssignments.length > 0
- ✅ Lists coach assignments grouped by organization
- ✅ Shows teams coached with names
- ✅ Shows age groups and sports

### TC-PS-037: Sessions Tab
**Test**: Active and historical sessions
**Steps**:
1. Click Sessions tab
2. View session information

**Expected**:
- ✅ Active sessions count and list displayed
- ✅ Each session shows:
  - Device type
  - Browser and version
  - OS and version
  - IP address
  - Location
  - Login time
- ✅ Login history (last 20 sessions) shown
- ✅ Force Logout button placeholder for active sessions

### TC-PS-038: Activity Tab
**Test**: User activity timeline
**Steps**:
1. Click Activity tab
2. View recent activity

**Expected**:
- ✅ Timeline displays recent activity
- ✅ Each item shows:
  - Activity type icon
  - Description
  - Timestamp
  - Organization context (if applicable)
- ✅ Activity type filter works
- ✅ Types include: login, page_view, voice_note_created, assessment_created, etc.

### TC-PS-039: Audit Log Tab
**Test**: Platform staff actions on this user
**Steps**:
1. Click Audit Log tab
2. View platform staff actions

**Expected**:
- ✅ Displays actions from platformStaffAuditLog
- ✅ Shows action type, performer name/email, timestamp
- ✅ Shows reason for each action
- ✅ Expandable to show before/after snapshots
- ✅ Links to performer's user detail if staff

### TC-PS-040: Edit Profile Dialog
**Test**: Edit user profile
**Steps**:
1. Click "Edit Profile" button
2. Dialog should open

**Expected**:
- ✅ ResponsiveDialog opens
- ✅ Form fields: firstName, lastName, phone (editable)
- ✅ Required reason field (minimum 10 characters)
- ✅ Email field disabled (cannot change)
- ✅ Submit button calls mutation
- ✅ Toast on success/error
- ✅ Dialog closes on success

---

## Phase 5: Advanced Features

### Purpose
Test impersonation, approval workflow, bulk operations, and error logs.

### TC-PS-050: Suspend User Dialog
**Test**: Request suspension approval
**Steps**:
1. On user detail page, click "Suspend" button
2. Dialog opens

**Expected**:
- ✅ ResponsiveDialog opens
- ✅ Organization selector visible (per-org or platform-wide)
- ✅ Required reason field (minimum 10 characters)
- ✅ Message explains this requires approval
- ✅ Submit creates approval request (not immediate suspend)
- ✅ Toast confirms request submitted

### TC-PS-051: Pending Approvals Page
**Test**: View pending approval requests
**Steps**:
1. Navigate to `/platform/users/pending-approvals`
2. Should show pending requests

**Expected**:
- ✅ Requests displayed in cards
- ✅ Each card shows:
  - Action type badge (suspend_user, delete_user, etc.)
  - Requester info
  - Target user info
  - Request reason
  - Created timestamp
- ✅ Empty state if no pending requests

### TC-PS-052: Approve/Reject Actions
**Test**: Review approval request
**Steps**:
1. Find a pending request
2. Try to approve if you're the requester

**Expected**:
- ✅ Approve button disabled with tooltip: "Cannot approve own request"

**Steps** (Different Staff Member):
1. Login as different platform staff user
2. View same pending request

**Expected**:
- ✅ Approve button enabled
- ✅ Reject button always enabled
- ✅ Clicking Approve opens confirmation dialog
- ✅ Clicking Reject opens dialog for notes
- ✅ Mutation called, list refreshes on success

### TC-PS-053: Impersonation - Start Dialog
**Test**: Begin impersonation session
**Steps**:
1. On user detail page, click "View as User"
2. ImpersonationDialog opens

**Expected**:
- ✅ Dialog shows target user info (name, email)
- ✅ Required reason field (minimum 10 characters)
- ✅ Warning text about view-only mode
- ✅ Submit calls startImpersonation mutation
- ✅ On success, session created (30-minute expiry)

### TC-PS-054: Impersonation Banner
**Test**: Banner shows during impersonation
**Steps**:
1. Start impersonation (from TC-PS-053)
2. Page should show banner at top

**Expected**:
- ✅ Fixed position banner at top
- ✅ Warning color (yellow/orange background)
- ✅ Text: "Viewing as [email]"
- ✅ Time remaining countdown (mm:ss)
- ✅ "End Session" button visible
- ✅ Banner stays visible across page navigation

### TC-PS-055: Impersonation - End Session
**Test**: Manually end impersonation
**Steps**:
1. While impersonating, click "End Session" button in banner
2. Session should end

**Expected**:
- ✅ endImpersonation mutation called
- ✅ Banner disappears
- ✅ Returned to normal staff view
- ✅ Audit log records session end

### TC-PS-056: Impersonation - Auto-Expire
**Test**: Session expires after 30 minutes
**Steps**:
1. Start impersonation
2. Wait 30 minutes (or manually update expiresAt in DB to past time)
3. Refresh page

**Expected**:
- ✅ Banner disappears
- ✅ Session marked as expired in DB
- ✅ Cannot perform actions (read-only enforced)

### TC-PS-057: Bulk Selection
**Test**: Select multiple users
**Steps**:
1. On user list page, check some checkboxes
2. Bulk action bar should appear

**Expected**:
- ✅ Checkbox column in table
- ✅ Select all checkbox in header
- ✅ Bulk action bar shows when rows selected
- ✅ Selected count displayed: "N users selected"

### TC-PS-058: Bulk Export
**Test**: Export selected users
**Steps**:
1. Select some users (TC-PS-057)
2. Click bulk action dropdown
3. Click "Export Selected"

**Expected**:
- ✅ bulkExportUsers mutation called with selected IDs
- ✅ JSON file generates
- ✅ File downloads automatically
- ✅ Filename includes timestamp
- ✅ File contains user data with:
  - Auth record
  - Memberships
  - Optional: identities and activity

### TC-PS-059: Bulk Suspend (Approval Workflow)
**Test**: Request bulk suspension
**Steps**:
1. Select multiple users
2. Click "Suspend Selected" from dropdown
3. Dialog opens

**Expected**:
- ✅ Dialog shows count of selected users
- ✅ Required reason field
- ✅ Submit creates approval request for bulk action
- ✅ Toast confirms request submitted
- ✅ Request appears in pending approvals

### TC-PS-060: Error Logs Page
**Test**: View platform errors
**Steps**:
1. Navigate to `/platform/users/error-logs`
2. Should show error log table

**Expected**:
- ✅ Table displays with columns:
  - Error type
  - Message (truncated)
  - Severity badge (info/warning/error/critical)
  - User email (clickable link to user detail)
  - Timestamp
- ✅ Filters work:
  - Severity dropdown
  - Resolved toggle
  - User email search

### TC-PS-061: Error Log Details
**Test**: View error details
**Steps**:
1. Click on an error row to expand
2. Full details should show

**Expected**:
- ✅ Full error message displayed
- ✅ Stack trace (if available)
- ✅ Request payload
- ✅ Browser/OS/device info
- ✅ Route and action that caused error
- ✅ Mark as Resolved button (if unresolved)

---

## Integration Tests

### End-to-End Workflows

### Workflow 1: Search → View → Edit
**Steps**:
1. Search for user by email
2. Click "View Details"
3. Click "Edit Profile"
4. Change phone number
5. Enter reason
6. Submit

**Expected**:
- ✅ All steps flow smoothly
- ✅ Changes saved
- ✅ Audit log records edit
- ✅ Toast notifications appear

### Workflow 2: Suspend User Flow
**Steps**:
1. Find user to suspend
2. Click Suspend button
3. Select organization
4. Enter reason
5. Submit (creates approval request)
6. Logout, login as different staff
7. Go to pending approvals
8. Approve request

**Expected**:
- ✅ Request created correctly
- ✅ Cannot approve own request
- ✅ Different staff can approve
- ✅ User actually gets suspended (member.isDisabled = true)
- ✅ Notification sent to user

### Workflow 3: Impersonation Session
**Steps**:
1. Search for a coach user
2. Click "View as User"
3. Enter reason, submit
4. Navigate to coach dashboard
5. View coach's data
6. End session

**Expected**:
- ✅ Banner always visible during session
- ✅ Can see user's data (read-only)
- ✅ Pages viewed tracked in impersonationSessions.pagesViewed
- ✅ Session ends cleanly
- ✅ Full audit trail recorded

### Workflow 4: Bulk Operations
**Steps**:
1. Search for users in specific org
2. Select 5 users
3. Export to JSON
4. Check exported file
5. Select 3 users
6. Request bulk suspend
7. Go to pending approvals
8. Approve bulk request

**Expected**:
- ✅ Export contains all selected users
- ✅ Bulk approval request shows all target users
- ✅ All 3 users get suspended after approval

---

## Regression Tests

### After Any Code Changes

- [ ] Dashboard loads without errors
- [ ] Search returns results
- [ ] User detail page displays all tabs
- [ ] Impersonation session works end-to-end
- [ ] Approval workflow prevents self-approval
- [ ] Bulk export generates valid JSON
- [ ] Error logs display correctly
- [ ] Audit trail records all actions

---

## Performance Tests

### Dashboard Load Time
**Test**: Measure initial page load
**Expected**: < 2 seconds for full dashboard with all cards and charts

### Search Response Time
**Test**: Type in search, measure response
**Expected**: < 500ms for search results (with debounce)

### User Detail Load
**Test**: Navigate to user detail page
**Expected**: < 1 second to load all tabs (lazy load OK)

### Bulk Export
**Test**: Export 100 users
**Expected**: < 5 seconds to generate and download

---

## Security Tests

### Authorization Checks

- [ ] Non-platform-staff cannot access `/platform/users`
- [ ] Regular users see 403/unauthorized
- [ ] Platform staff can only impersonate with reason
- [ ] Impersonation sessions expire after 30 minutes
- [ ] Cannot approve own suspension requests
- [ ] Audit log captures all sensitive actions

---

## Known Issues & Limitations

### Current Limitations
- Sport configuration admin UI not yet implemented (backend ready)
- Bulk operations limited to suspend (delete requires additional approval)
- Error log resolution doesn't trigger notifications
- Impersonation pagesViewed tracking may miss single-page app navigation

### Expected Behavior
- User detail page may show empty tabs if user has no data for that identity type
- Session tab shows only Better Auth sessions (not real-time app sessions)
- Activity log shows actions logged by app (may not capture all user activity)

---

## Troubleshooting

### Dashboard not loading
- Check isPlatformStaff is true in user record
- Verify Convex functions deployed
- Check browser console for errors

### Search returns no results
- Verify users exist in database
- Check search is case-insensitive
- Try exact email match

### Impersonation banner not showing
- Check getCurrentImpersonation query returns active session
- Verify expiresAt is in future
- Check header/layout renders banner component

### Bulk export fails
- Check user selection is not empty
- Verify bulkExportUsers mutation exists
- Check browser allows downloads

---

## Success Criteria

✅ **All 5 phases implemented and tested**
✅ **Platform staff can search and view all users**
✅ **Impersonation works with audit trail**
✅ **Approval workflow prevents abuse**
✅ **Bulk operations functional**
✅ **Error monitoring operational**
✅ **No unauthorized access possible**

**Total Test Cases**: 61
**Estimated Test Time**: 4-6 hours (full suite)
**Quick Smoke Test**: 30 minutes (TC-PS-020 to TC-PS-029, TC-PS-050 to TC-PS-055)

---

**Tested By**: _______________
**Date**: _______________
**Environment**: _______________
**Result**: _______________

---

*Generated by Claude Code - January 27, 2026*
