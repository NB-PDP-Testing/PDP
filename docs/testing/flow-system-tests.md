# Flow System - User Acceptance Testing (UAT)

**Module:** Modular Wizard & Flow System
**Version:** 1.0
**Date:** January 5, 2026
**Status:** Ready for Testing
**Related Features:** Platform Flow Management, Organization Announcements, User Onboarding

---

## Table of Contents

1. [Overview](#1-overview)
2. [Test Environment Setup](#2-test-environment-setup)
3. [Platform Staff Flow Management Tests](#3-platform-staff-flow-management-tests)
4. [Organization Admin Announcement Tests](#4-organization-admin-announcement-tests)
5. [User Flow Experience Tests](#5-user-flow-experience-tests)
6. [First User Onboarding Tests](#6-first-user-onboarding-tests)
7. [Flow Interception & Display Tests](#7-flow-interception--display-tests)
8. [End-to-End Integration Tests](#8-end-to-end-integration-tests)

---

## 1. Overview

### 1.1 Purpose

This document provides comprehensive testing procedures for the newly implemented Flow System, which enables:
- Platform staff to create and manage platform-wide flows
- Organization admins to send announcements to members
- Automated user onboarding with guided wizards
- Dynamic content delivery through various display types (modals, banners, pages, toasts)

### 1.2 Key Features to Test

| Feature | Description | User Roles |
|---------|-------------|------------|
| Platform Flow Management | Create, edit, activate/deactivate platform-wide flows | Platform Staff |
| Organization Announcements | Create and send announcements to organization members | Org Admin, Org Owner |
| Flow Interception | Automatically display flows to users on login | All Users |
| Multi-step Wizards | Progress through guided multi-step flows | All Users |
| First User Onboarding | Automatic setup wizard for first platform user | First User |
| Flow Progress Tracking | Track completion, dismissal, and interaction analytics | Backend |

### 1.3 Key URLs

```
/platform/flows                        # Platform staff flow list
/platform/flows/create                 # Create new platform flow
/platform/flows/[flowId]/edit          # Edit existing flow
/orgs/[orgId]/admin/announcements      # Organization announcements
```

---

## 2. Test Environment Setup

### 2.1 Prerequisites

- [ ] Platform staff account created and verified
- [ ] Organization with admin user created
- [ ] Multiple test users in organization (coaches, parents, members)
- [ ] Clean database state (no existing flows)
- [ ] Browser DevTools available

### 2.2 Test User Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Platform Staff | `staff@test.playerarc.io` | `Test123!` | Can create platform flows |
| Org Admin | `admin@test.playerarc.io` | `Test123!` | Can create org announcements |
| Coach | `coach@test.playerarc.io` | `Test123!` | Regular org member |
| Parent | `parent@test.playerarc.io` | `Test123!` | Regular org member |
| New User | `newuser@test.playerarc.io` | `Test123!` | For flow testing |

---

## 3. Platform Staff Flow Management Tests

### 3.1 Flow List & Overview

#### TEST-FLOW-PLATFORM-001: View Platform Flows List

| Field | Value |
|-------|-------|
| **Objective** | Verify platform staff can access and view all platform flows |
| **Preconditions** | Logged in as platform staff |
| **Steps** | 1. Navigate to `/platform/flows`<br>2. Observe flow list page<br>3. Check stats cards<br>4. Verify table displays correctly |
| **Expected Result** | - Page loads successfully<br>- Stats show: Total Flows, Active Flows, Inactive Flows<br>- Table displays all flows with: Name, Type, Priority, Status, Steps<br>- Action buttons visible: Toggle Active, Edit, Delete |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-PLATFORM-002: Empty State Display

| Field | Value |
|-------|-------|
| **Objective** | Verify empty state shows when no flows exist |
| **Preconditions** | Platform staff logged in, zero flows in database |
| **Steps** | 1. Navigate to `/platform/flows`<br>2. Observe empty state |
| **Expected Result** | - "No flows created yet" message displayed<br>- "Create Your First Flow" button visible<br>- Stats show zeros |
| **Pass/Fail** | ☐ |

### 3.2 Creating Platform Flows

#### TEST-FLOW-PLATFORM-003: Create Simple Announcement Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify platform staff can create a basic single-step flow |
| **Preconditions** | Platform staff logged in |
| **Steps** | 1. Navigate to `/platform/flows`<br>2. Click "Create Flow"<br>3. Fill in:<br>   - Name: "System Maintenance Notice"<br>   - Type: "System Alert"<br>   - Priority: "High"<br>4. Configure step:<br>   - Type: "Modal"<br>   - Title: "Scheduled Maintenance"<br>   - Content: "Platform will be unavailable..."<br>   - CTA: "I Understand"<br>5. Set Active: true<br>6. Click "Create Flow" |
| **Expected Result** | - Success toast appears<br>- Redirected to `/platform/flows`<br>- New flow visible in list<br>- Status shows "Active" with green badge<br>- Priority shows "High" |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-PLATFORM-004: Create Multi-Step Onboarding Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify platform staff can create multi-step wizard |
| **Preconditions** | Platform staff logged in |
| **Steps** | 1. Click "Create Flow"<br>2. Set:<br>   - Name: "New Feature Tour"<br>   - Type: "Feature Tour"<br>   - Priority: "Medium"<br>3. Create Step 1:<br>   - Type: "Page"<br>   - Title: "Welcome to New Features"<br>   - Content: "We've added..."<br>4. Click "Add Another Step"<br>5. Create Step 2:<br>   - Type: "Page"<br>   - Title: "How to Use It"<br>   - Content: "Here's how..."<br>6. Create Step 3:<br>   - Type: "Modal"<br>   - Title: "Try It Now"<br>   - Content: "Click to start..."<br>7. Submit |
| **Expected Result** | - All 3 steps created successfully<br>- Steps numbered correctly (1, 2, 3)<br>- Each step shows correct type badge<br>- Flow saved with 3 steps<br>- Table shows "3 steps" |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-PLATFORM-005: Flow Validation - Missing Required Fields

| Field | Value |
|-------|-------|
| **Objective** | Verify validation prevents saving incomplete flows |
| **Preconditions** | On create flow page |
| **Steps** | 1. Leave Name empty<br>2. Try to submit<br>3. Fill Name, leave Step Title empty<br>4. Try to submit<br>5. Fill Step Title, leave Content empty<br>6. Try to submit |
| **Expected Result** | - Error toast: "Please enter a flow name"<br>- Error toast: "All steps must have a title and content"<br>- Form not submitted until all required fields filled<br>- Client-side validation prevents submission |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-PLATFORM-006: Create Blocking Priority Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify blocking priority flows can be created |
| **Preconditions** | Platform staff logged in |
| **Steps** | 1. Create new flow<br>2. Set Priority: "Blocking (Must complete)"<br>3. Set one step with dismissible: false<br>4. Activate flow<br>5. Save |
| **Expected Result** | - Flow created with blocking priority<br>- Badge shows "Blocking" in red/destructive color<br>- Step marked as non-dismissible<br>- Flow appears at top of list (sorted by priority) |
| **Pass/Fail** | ☐ |

### 3.3 Editing Platform Flows

#### TEST-FLOW-PLATFORM-007: Edit Existing Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify platform staff can edit existing flows |
| **Preconditions** | At least one flow exists |
| **Steps** | 1. From flows list, click Edit icon on a flow<br>2. Verify form pre-populated with existing data<br>3. Change name to "Updated Flow Name"<br>4. Change priority from "Medium" to "High"<br>5. Edit step 1 content<br>6. Click "Update Flow" |
| **Expected Result** | - Edit page loads with all existing data<br>- All fields editable<br>- Success toast on save<br>- Redirected to list<br>- Changes reflected in list view<br>- updatedAt timestamp updated |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-PLATFORM-008: Add/Remove Steps in Edit Mode

| Field | Value |
|-------|-------|
| **Objective** | Verify steps can be added/removed when editing |
| **Preconditions** | Editing a flow with 2 steps |
| **Steps** | 1. Click "Add Another Step"<br>2. Fill new step details<br>3. Save<br>4. Re-open for editing<br>5. Click trash icon on step 2<br>6. Confirm deletion<br>7. Try to delete last remaining step |
| **Expected Result** | - New step added successfully<br>- Flow saved with 3 steps<br>- Step 2 removed on re-edit<br>- Cannot delete last step (error: "Flow must have at least one step")<br>- Step numbering updates automatically |
| **Pass/Fail** | ☐ |

### 3.4 Flow Management Actions

#### TEST-FLOW-PLATFORM-009: Toggle Flow Active/Inactive

| Field | Value |
|-------|-------|
| **Objective** | Verify flows can be activated and deactivated |
| **Preconditions** | Active flow exists |
| **Steps** | 1. From flows list, locate an active flow<br>2. Click power-off icon<br>3. Confirm in toast<br>4. Observe status change<br>5. Click power-on icon to reactivate<br>6. Verify status |
| **Expected Result** | - On deactivate: Status badge changes to "Inactive" (gray)<br>- Success toast: "Flow status updated"<br>- Icon changes from power-off to power-on<br>- On reactivate: Status returns to "Active" (green)<br>- Changes reflected immediately without page refresh |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-PLATFORM-010: Delete Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify flows can be deleted with confirmation |
| **Preconditions** | Flow exists |
| **Steps** | 1. Click delete (trash) icon on a flow<br>2. Observe confirmation dialog<br>3. Click "Cancel"<br>4. Verify flow still exists<br>5. Click delete again<br>6. Click "OK/Confirm" |
| **Expected Result** | - Browser confirmation dialog: "Are you sure you want to delete this flow?"<br>- On cancel: Flow remains in list<br>- On confirm: Flow deleted, success toast appears<br>- Flow removed from list<br>- Stats updated (total count decremented) |
| **Pass/Fail** | ☐ |

### 3.5 Access Control

#### TEST-FLOW-PLATFORM-011: Non-Platform-Staff Cannot Access

| Field | Value |
|-------|-------|
| **Objective** | Verify only platform staff can access platform flow pages |
| **Preconditions** | Logged in as regular organization admin (not platform staff) |
| **Steps** | 1. Navigate directly to `/platform/flows`<br>2. Observe redirect/error |
| **Expected Result** | - Redirected to `/` (home)<br>- Error toast: "You must be platform staff to access this page"<br>- Platform flows UI not accessible |
| **Pass/Fail** | ☐ |

---

## 4. Organization Admin Announcement Tests

### 4.1 Announcement List & Overview

#### TEST-FLOW-ORG-001: View Announcements Dashboard

| Field | Value |
|-------|-------|
| **Objective** | Verify organization admin can access announcements page |
| **Preconditions** | Logged in as org admin |
| **Steps** | 1. Navigate to `/orgs/[orgId]/admin/announcements`<br>2. Observe page layout |
| **Expected Result** | - Page loads successfully<br>- Header: "Organization Announcements"<br>- Stats cards show: Active Announcements, Total Reach, Scheduled<br>- "New Announcement" button visible<br>- Announcement list displayed (or empty state) |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-ORG-002: Announcements Empty State

| Field | Value |
|-------|-------|
| **Objective** | Verify empty state when no announcements exist |
| **Preconditions** | Org admin logged in, no announcements in organization |
| **Steps** | 1. View announcements page<br>2. Observe empty state |
| **Expected Result** | - Message: "No announcements created yet"<br>- "Create Your First Announcement" button shown<br>- Stats show 0 for all metrics |
| **Pass/Fail** | ☐ |

### 4.2 Creating Announcements

#### TEST-FLOW-ORG-003: Create Announcement for All Members

| Field | Value |
|-------|-------|
| **Objective** | Verify admin can create announcement targeting all members |
| **Preconditions** | Org admin logged in |
| **Steps** | 1. Click "New Announcement"<br>2. Fill dialog:<br>   - Title: "Season Schedule Update"<br>   - Message: "New training times..."<br>   - Target: "All Organization Members"<br>   - Priority: "Medium"<br>3. Click "Create Announcement" |
| **Expected Result** | - Success toast appears<br>- Dialog closes<br>- New announcement visible in list<br>- Shows: Title, Target (all_members), Priority<br>- Content preview truncated if long |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-ORG-004: Create Coach-Only Announcement

| Field | Value |
|-------|-------|
| **Objective** | Verify admin can target specific audience |
| **Preconditions** | Org admin logged in |
| **Steps** | 1. Create announcement<br>2. Set Target: "Coaches Only"<br>3. Fill title and message<br>4. Submit |
| **Expected Result** | - Announcement created successfully<br>- Target shows "coaches" in metadata<br>- Only coaches will see this flow (verified in later tests) |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-ORG-005: Create Parent-Only Announcement

| Field | Value |
|-------|-------|
| **Objective** | Verify parent-specific announcements can be created |
| **Preconditions** | Org admin logged in, parents exist in org |
| **Steps** | 1. Create announcement:<br>   - Title: "Fee Payment Reminder"<br>   - Message: "Annual fees due..."<br>   - Target: "Parents Only"<br>   - Priority: "High" |
| **Expected Result** | - Announcement created with parent-only targeting<br>- High priority badge shown<br>- Only parents will receive |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-ORG-006: Announcement with Markdown Formatting

| Field | Value |
|-------|-------|
| **Objective** | Verify Markdown is supported in announcement content |
| **Preconditions** | Creating announcement |
| **Steps** | 1. In Message field, enter Markdown:<br>   ```<br>   **Important Update**<br>   - Training at 6 PM<br>   - Bring water bottle<br>   - [Schedule](https://example.com)<br>   ```<br>2. Submit |
| **Expected Result** | - Announcement saved with Markdown content<br>- When displayed to users, Markdown renders correctly:<br>  - Bold text<br>  - Bulleted list<br>  - Clickable link |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-ORG-007: Validation - Empty Title or Content

| Field | Value |
|-------|-------|
| **Objective** | Verify validation prevents empty announcements |
| **Preconditions** | Announcement creation dialog open |
| **Steps** | 1. Leave title empty, try to submit<br>2. Fill title, leave message empty, try to submit |
| **Expected Result** | - Error toast: "Please enter an announcement title"<br>- Error toast: "Please enter announcement content"<br>- Submit button disabled until both fields filled |
| **Pass/Fail** | ☐ |

### 4.3 Access Control

#### TEST-FLOW-ORG-008: Only Admins Can Create Announcements

| Field | Value |
|-------|-------|
| **Objective** | Verify regular members cannot access announcements page |
| **Preconditions** | Logged in as coach (not admin) |
| **Steps** | 1. Navigate to `/orgs/[orgId]/admin/announcements`<br>2. Observe result |
| **Expected Result** | - Access denied or redirect<br>- Error message shown<br>- Cannot create announcements |
| **Pass/Fail** | ☐ |

---

## 5. User Flow Experience Tests

### 5.1 Flow Interception

#### TEST-FLOW-USER-001: Flow Displays on Login

| Field | Value |
|-------|-------|
| **Objective** | Verify active flows automatically display to users on login |
| **Preconditions** | Active platform flow exists (priority: high) |
| **Steps** | 1. Logout completely<br>2. Login as regular user<br>3. Observe what happens after login |
| **Expected Result** | - After successful login, flow intercepts user<br>- Flow displayed based on type (modal/page/banner)<br>- User must interact with flow before accessing app |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-USER-002: Blocking Flow Prevents Access

| Field | Value |
|-------|-------|
| **Objective** | Verify blocking priority flows must be completed |
| **Preconditions** | Active blocking flow exists with dismissible: false |
| **Steps** | 1. Login as user who hasn't completed flow<br>2. Try to dismiss modal (X button)<br>3. Try to navigate away<br>4. Complete flow step<br>5. Verify access restored |
| **Expected Result** | - Flow modal has no close/dismiss button<br>- Cannot navigate to other pages<br>- Must click "Continue" or complete action<br>- After completion, normal app access restored |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-USER-003: Multiple Flows - Priority Ordering

| Field | Value |
|-------|-------|
| **Objective** | Verify flows display in priority order |
| **Preconditions** | 3 active flows: Blocking, High, Medium |
| **Steps** | 1. Login as new user<br>2. Observe first flow<br>3. Complete it<br>4. Observe second flow<br>5. Complete all |
| **Expected Result** | - Blocking flow shows first<br>- After completing, High priority shows<br>- Finally Medium priority shows<br>- Flows never shown simultaneously |
| **Pass/Fail** | ☐ |

### 5.2 Flow Display Types

#### TEST-FLOW-USER-004: Modal Display Type

| Field | Value |
|-------|-------|
| **Objective** | Verify modal display works correctly |
| **Preconditions** | Active flow with step type: "modal" |
| **Steps** | 1. Trigger flow<br>2. Observe modal display |
| **Expected Result** | - Modal overlay appears centered on screen<br>- Background dimmed/blurred<br>- Modal shows: Title, Content (Markdown rendered), CTA button<br>- If dismissible: X close button visible<br>- Modal responsive on mobile |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-USER-005: Full Page Display Type

| Field | Value |
|-------|-------|
| **Objective** | Verify full-page display type |
| **Preconditions** | Active flow with step type: "page" |
| **Steps** | 1. Trigger flow<br>2. Observe full-page takeover |
| **Expected Result** | - Entire page replaced with flow content<br>- PDP logo at top<br>- Title prominent and large<br>- Content in centered card/container<br>- Progress indicator if multi-step<br>- CTA button at bottom<br>- Clean, focused layout |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-USER-006: Banner Display Type

| Field | Value |
|-------|-------|
| **Objective** | Verify top banner display |
| **Preconditions** | Active flow with step type: "banner" |
| **Steps** | 1. Trigger flow<br>2. Observe banner |
| **Expected Result** | - Banner appears at top of page<br>- Dismissible (X button on right)<br>- Content shows in single line or compact format<br>- CTA button inline<br>- Does not block page content |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-USER-007: Toast Display Type

| Field | Value |
|-------|-------|
| **Objective** | Verify toast notification display |
| **Preconditions** | Active flow with step type: "toast" |
| **Steps** | 1. Trigger flow<br>2. Observe toast |
| **Expected Result** | - Toast appears in corner (bottom-right typically)<br>- Auto-dismisses after few seconds OR has close button<br>- Shows title and brief content<br>- Optional action button<br>- Multiple toasts stack correctly |
| **Pass/Fail** | ☐ |

### 5.3 Multi-Step Flow Navigation

#### TEST-FLOW-USER-008: Progress Through Multi-Step Wizard

| Field | Value |
|-------|-------|
| **Objective** | Verify users can navigate multi-step flows |
| **Preconditions** | Active 3-step flow |
| **Steps** | 1. Start flow<br>2. Observe step 1<br>3. Click "Continue"<br>4. Observe step 2<br>5. Click "Continue"<br>6. Observe step 3<br>7. Complete final step |
| **Expected Result** | - Step 1 displays: "Step 1 of 3"<br>- Progress bar shows 33%<br>- After continue: Step 2 shows "Step 2 of 3", 66%<br>- Step 3 shows "Step 3 of 3", 100%<br>- Each step's content displays correctly<br>- Final step completion closes flow |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-USER-009: Progress Indicator Visual States

| Field | Value |
|-------|-------|
| **Objective** | Verify progress indicator shows completed/current/upcoming steps |
| **Preconditions** | Multi-step flow active |
| **Steps** | 1. Start flow, observe step indicators<br>2. Complete step 1, observe change<br>3. View step 2 indicator<br>4. Complete all, observe final state |
| **Expected Result** | - Completed steps: Green checkmark/color<br>- Current step: Blue/primary color highlight<br>- Upcoming steps: Gray/muted<br>- Visual progression clear and intuitive |
| **Pass/Fail** | ☐ |

### 5.4 Flow Completion & Dismissal

#### TEST-FLOW-USER-010: Complete Flow Successfully

| Field | Value |
|-------|-------|
| **Objective** | Verify flow completion is tracked |
| **Preconditions** | Active flow, user has started it |
| **Steps** | 1. Complete all steps in flow<br>2. Click final CTA<br>3. Logout and login again |
| **Expected Result** | - Flow marked as completed in backend<br>- User not shown same flow on re-login<br>- Progress tracked in database<br>- Analytics event fired |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-USER-011: Dismiss Flow (If Dismissible)

| Field | Value |
|-------|-------|
| **Objective** | Verify dismissible flows can be dismissed |
| **Preconditions** | Active dismissible flow |
| **Steps** | 1. Trigger flow<br>2. Click X or "Dismiss" button<br>3. Verify flow closes<br>4. Logout and login<br>5. Verify flow not shown again |
| **Expected Result** | - Flow dismissed immediately<br>- Dismiss action tracked as "dismissed" status<br>- Flow not re-shown on subsequent logins |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-USER-012: Resume Partially Completed Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify users can resume incomplete flows |
| **Preconditions** | Multi-step flow, user completed step 1 only |
| **Steps** | 1. Start flow, complete step 1<br>2. Logout<br>3. Login again<br>4. Observe flow state |
| **Expected Result** | - Flow resumes at step 2 (where user left off)<br>- Progress saved: completedStepIds includes step 1<br>- User doesn't have to repeat completed steps |
| **Pass/Fail** | ☐ |

---

## 6. First User Onboarding Tests

### 6.1 First User Detection

#### TEST-FLOW-ONBOARD-001: First User Auto-Detection

| Field | Value |
|-------|-------|
| **Objective** | Verify first user is automatically detected and promoted |
| **Preconditions** | Fresh database (0 users) |
| **Steps** | 1. Sign up as first user<br>2. Complete registration<br>3. Check user role/permissions |
| **Expected Result** | - User account created<br>- `isPlatformStaff: true` automatically set<br>- First-user onboarding flow created<br>- No manual intervention required |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-ONBOARD-002: Second User NOT Platform Staff

| Field | Value |
|-------|-------|
| **Objective** | Verify only first user gets platform staff automatically |
| **Preconditions** | One user already exists |
| **Steps** | 1. Sign up as second user<br>2. Complete registration<br>3. Check permissions |
| **Expected Result** | - User created successfully<br>- `isPlatformStaff: false` or undefined<br>- Normal user permissions<br>- No platform staff access |
| **Pass/Fail** | ☐ |

### 6.2 First User Onboarding Flow

#### TEST-FLOW-ONBOARD-003: Onboarding Flow Displays on First Login

| Field | Value |
|-------|-------|
| **Objective** | Verify first user sees onboarding wizard immediately |
| **Preconditions** | First user just signed up |
| **Steps** | 1. Complete signup<br>2. Observe redirect<br>3. View onboarding flow |
| **Expected Result** | - Redirected to onboarding flow<br>- Welcome page shown: "Welcome to PlayerARC"<br>- Blocking priority (cannot skip)<br>- Clear call-to-action to proceed |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-ONBOARD-004: Onboarding Step 1 - Welcome

| Field | Value |
|-------|-------|
| **Objective** | Verify welcome step content and flow |
| **Preconditions** | First user in onboarding flow |
| **Steps** | 1. Read welcome message<br>2. Verify content mentions being first user<br>3. Click "Let's Go" |
| **Expected Result** | - Welcoming tone<br>- Explains what PlayerARC is<br>- Outlines setup steps<br>- Non-dismissible<br>- Proceeds to step 2 on click |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-ONBOARD-005: Onboarding Step 2 - Create Organization

| Field | Value |
|-------|-------|
| **Objective** | Verify organization creation step |
| **Preconditions** | Completed welcome step |
| **Steps** | 1. View step 2<br>2. Read instructions<br>3. Click "Create Organization" |
| **Expected Result** | - Instructions on what an organization is<br>- CTA button navigates to `/orgs/create`<br>- User can create first organization<br>- Progress saved after creation |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-ONBOARD-006: Onboarding Step 3 - Setup Complete

| Field | Value |
|-------|-------|
| **Objective** | Verify completion step and redirect |
| **Preconditions** | Organization created |
| **Steps** | 1. Return to flow<br>2. View completion step<br>3. Read next steps<br>4. Click "Go to Dashboard" |
| **Expected Result** | - Congratulations message<br>- Lists what user can do next<br>- Highlights platform staff privileges<br>- Redirects to `/orgs/current` dashboard<br>- Flow marked completed, won't show again |
| **Pass/Fail** | ☐ |

---

## 7. Flow Interception & Display Tests

### 7.1 Organization-Scoped Flows

#### TEST-FLOW-INTERCEPT-001: Organization Announcement Displays to Members

| Field | Value |
|-------|-------|
| **Objective** | Verify org announcements show only to org members |
| **Preconditions** | Org admin created announcement for "All Members" |
| **Steps** | 1. Login as member of that organization<br>2. Observe announcement<br>3. Login as member of different org<br>4. Verify announcement NOT shown |
| **Expected Result** | - Org members see announcement on login<br>- Members of other orgs do not see it<br>- Announcement scoped correctly to organization |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-INTERCEPT-002: Coach-Only Announcement to Coaches

| Field | Value |
|-------|-------|
| **Objective** | Verify coach-targeted announcements only show to coaches |
| **Preconditions** | Announcement created with target: "coaches" |
| **Steps** | 1. Login as coach<br>2. Verify announcement shown<br>3. Login as parent<br>4. Verify NOT shown<br>5. Login as admin<br>6. Verify NOT shown (unless admin is also coach) |
| **Expected Result** | - Only coaches see the announcement<br>- Accurate role-based targeting<br>- Parents and other roles excluded |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-INTERCEPT-003: Parent-Only Announcement to Parents

| Field | Value |
|-------|-------|
| **Objective** | Verify parent-specific announcements |
| **Preconditions** | Announcement with target: "parents" |
| **Steps** | 1. Login as parent<br>2. Verify shown<br>3. Login as coach<br>4. Verify NOT shown |
| **Expected Result** | - Parents receive announcement<br>- Coaches and non-parents don't<br>- Correct audience filtering |
| **Pass/Fail** | ☐ |

### 7.2 Flow Context and Data

#### TEST-FLOW-INTERCEPT-004: Flow Progress Persists Across Sessions

| Field | Value |
|-------|-------|
| **Objective** | Verify flow progress saved correctly |
| **Preconditions** | Multi-step flow, user completed 2 of 4 steps |
| **Steps** | 1. Complete steps 1 and 2<br>2. Logout<br>3. Wait 1 hour<br>4. Login again<br>5. Observe flow state |
| **Expected Result** | - Progress table has record with completedStepIds: ["step-1", "step-2"]<br>- currentStepId: "step-3"<br>- status: "in_progress"<br>- Flow resumes at step 3 |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-INTERCEPT-005: CTA Action Navigation

| Field | Value |
|-------|-------|
| **Objective** | Verify CTA actions navigate correctly |
| **Preconditions** | Flow step with ctaAction: "/orgs/[orgId]/teams" |
| **Steps** | 1. View flow step<br>2. Click CTA button<br>3. Observe navigation |
| **Expected Result** | - Clicking CTA navigates to specified route<br>- Step marked as completed<br>- If last step, flow completed<br>- If not last, proceeds to next step before redirect |
| **Pass/Fail** | ☐ |

---

## 8. End-to-End Integration Tests

### 8.1 Complete Flow Lifecycle

#### TEST-FLOW-E2E-001: Platform Flow Creation to User Completion

| Field | Value |
|-------|-------|
| **Objective** | Verify complete flow lifecycle from creation to completion |
| **Preconditions** | Platform staff and test user accounts |
| **Steps** | **Platform Staff:**<br>1. Create new flow "Feature Announcement"<br>2. Add 2 steps<br>3. Set priority: High<br>4. Activate flow<br><br>**Test User:**<br>5. Logout, login as test user<br>6. View flow automatically<br>7. Complete step 1<br>8. Complete step 2<br><br>**Verification:**<br>9. Check database for completion record<br>10. Login again, verify flow not re-shown |
| **Expected Result** | - End-to-end flow works seamlessly<br>- User sees flow immediately on login<br>- Progress tracked in real-time<br>- Completion persists<br>- No re-prompting after completion |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-E2E-002: Organization Announcement to Multiple Users

| Field | Value |
|-------|-------|
| **Objective** | Verify announcement reaches all targeted users |
| **Preconditions** | Organization with 5 members (2 coaches, 2 parents, 1 admin) |
| **Steps** | **Org Admin:**<br>1. Create announcement for "All Members"<br>2. Content: "Important Club Update"<br><br>**All Users:**<br>3. Login as coach1 - verify shown<br>4. Login as coach2 - verify shown<br>5. Login as parent1 - verify shown<br>6. Login as parent2 - verify shown<br>7. Each user dismisses<br><br>**Verification:**<br>8. Check progress table - 5 records with status "dismissed" |
| **Expected Result** | - All 5 members receive announcement<br>- Each can dismiss independently<br>- Progress tracked per user<br>- No cross-user interference |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-E2E-003: Concurrent Flows - Platform + Organization

| Field | Value |
|-------|-------|
| **Objective** | Verify users see both platform and org flows correctly |
| **Preconditions** | 1 platform flow (blocking), 1 org announcement (high) |
| **Steps** | 1. Login as org member<br>2. Observe first flow (should be platform/blocking)<br>3. Complete platform flow<br>4. Observe second flow (should be org announcement)<br>5. Complete org announcement<br>6. Verify access to app |
| **Expected Result** | - Platform blocking flow shows first (higher priority)<br>- Org announcement shows second<br>- Both flows tracked separately<br>- Correct priority ordering maintained |
| **Pass/Fail** | ☐ |

### 8.2 Performance & Reliability

#### TEST-FLOW-E2E-004: Flow System Performance with 10 Flows

| Field | Value |
|-------|-------|
| **Objective** | Verify system handles multiple flows efficiently |
| **Preconditions** | Create 10 different flows (mix of active/inactive) |
| **Steps** | 1. Login as test user<br>2. Measure time to first flow display<br>3. Complete all applicable flows<br>4. Measure total flow query time |
| **Expected Result** | - Flow query completes in <500ms<br>- Only active flows fetched<br>- Correct sorting by priority<br>- No performance degradation<br>- Smooth user experience |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-E2E-005: Rapid Login/Logout - Flow State Consistency

| Field | Value |
|-------|-------|
| **Objective** | Verify flow state remains consistent across rapid session changes |
| **Preconditions** | Active flow, test user |
| **Steps** | 1. Login, start flow, complete step 1<br>2. Logout immediately<br>3. Login again<br>4. Verify flow state<br>5. Repeat 3 times |
| **Expected Result** | - Progress always accurate<br>- No duplicate flow displays<br>- No lost progress<br>- State consistent across sessions |
| **Pass/Fail** | ☐ |

### 8.3 Error Handling

#### TEST-FLOW-E2E-006: Delete Active Flow - User Impact

| Field | Value |
|-------|-------|
| **Objective** | Verify graceful handling when active flow is deleted |
| **Preconditions** | User in middle of flow, platform staff deletes it |
| **Steps** | **User:** Start flow, complete step 1<br>**Platform Staff:** Delete the flow<br>**User:** Try to proceed to step 2 |
| **Expected Result** | - Error handled gracefully<br>- User not stuck<br>- Flow removed from queue<br>- No crash or infinite loading |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-E2E-007: Deactivate Flow Mid-Session

| Field | Value |
|-------|-------|
| **Objective** | Verify flow deactivation during user session |
| **Preconditions** | User viewing active flow |
| **Steps** | **User:** Flow displayed in modal<br>**Platform Staff:** Toggle flow to inactive<br>**User:** Click continue |
| **Expected Result** | - User can complete currently displayed flow<br>- On next login, deactivated flow not shown<br>- Graceful state management |
| **Pass/Fail** | ☐ |

---

## 9. Analytics & Reporting (Future)

*These tests are placeholders for when analytics features are added*

#### TEST-FLOW-ANALYTICS-001: Track Flow Views

| Field | Value |
|-------|-------|
| **Objective** | Verify flow view events are tracked |
| **Preconditions** | Analytics system enabled |
| **Expected Result** | - Each flow view logged with userId, flowId, timestamp<br>- View count aggregated per flow |
| **Pass/Fail** | ☐ |

#### TEST-FLOW-ANALYTICS-002: Track Completion Rate

| Field | Value |
|-------|-------|
| **Objective** | Verify completion rate calculated correctly |
| **Expected Result** | - Completion rate = completed / (completed + dismissed + in_progress)<br>- Displayed in flow list<br>- Accurate percentage |
| **Pass/Fail** | ☐ |

---

## 10. Test Completion Checklist

### 10.1 Platform Flow Management

- [ ] All platform flow list tests passed (001-002)
- [ ] All flow creation tests passed (003-006)
- [ ] All flow editing tests passed (007-008)
- [ ] All flow management tests passed (009-010)
- [ ] Access control verified (011)

### 10.2 Organization Announcements

- [ ] Announcement dashboard tests passed (001-002)
- [ ] Announcement creation tests passed (003-007)
- [ ] Access control verified (008)

### 10.3 User Flow Experience

- [ ] Flow interception tests passed (001-003)
- [ ] All display types verified (004-007)
- [ ] Multi-step navigation works (008-009)
- [ ] Completion and dismissal work (010-012)

### 10.4 First User Onboarding

- [ ] First user detection works (001-002)
- [ ] Onboarding flow displays (003)
- [ ] All onboarding steps work (004-006)

### 10.5 Flow Interception

- [ ] Organization-scoped flows work (001-003)
- [ ] Flow context and data accurate (004-005)

### 10.6 End-to-End Integration

- [ ] Complete lifecycle test passed (001)
- [ ] Multi-user announcement test passed (002)
- [ ] Concurrent flows test passed (003)
- [ ] Performance acceptable (004-005)
- [ ] Error handling works (006-007)

### 10.7 Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | | | |
| Product Owner | | | |
| Platform Staff | | | |

---

## 11. Known Issues / Limitations

*Document any known issues discovered during testing:*

1.
2.
3.

---

## 12. Testing Notes

*Add any additional observations or notes during testing:*

-
-
-

---

**End of Flow System UAT Document**
