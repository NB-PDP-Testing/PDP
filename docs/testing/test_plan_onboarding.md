# Universal Onboarding System - Manual Test Plan

**Issue:** #371
**PR:** #373
**Date:** 2026-01-28
**Branch:** `ralph/onboarding-phase-7`

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Test Environment Setup](#test-environment-setup)
3. [Phase 1: Foundation & Bug Fixes](#phase-1-foundation--bug-fixes)
4. [Phase 1B: Invitation Lifecycle](#phase-1b-invitation-lifecycle)
5. [Phase 2: GDPR Consent](#phase-2-gdpr-consent)
6. [Phase 3: Child Linking](#phase-3-child-linking)
7. [Phase 4: Toast Notifications](#phase-4-toast-notifications)
8. [Phase 5: First User Onboarding](#phase-5-first-user-onboarding)
9. [Phase 6: Polish & Error Handling](#phase-6-polish--error-handling)
10. [Phase 7: Player Dashboard & Graduation](#phase-7-player-dashboard--graduation)
11. [Regression Tests](#regression-tests)
12. [Accessibility Tests](#accessibility-tests)
13. [Mobile Responsiveness Tests](#mobile-responsiveness-tests)

---

## Prerequisites

### Required Test Accounts

| Account Type | Email | Purpose |
|--------------|-------|---------|
| Platform Staff | `platformstaff@test.com` | First user / admin testing |
| Org Owner | `owner@test.com` | Organization management |
| Org Admin | `admin@test.com` | Admin functions |
| Coach | `coach@test.com` | Coach role testing |
| Parent 1 | `parent1@test.com` | Guardian testing |
| Parent 2 | `parent2@test.com` | Second guardian testing |
| New User | `newuser@test.com` | Fresh signup testing |

### Required Test Data

- [ ] At least one organization created
- [ ] At least one team created
- [ ] At least 2-3 player records (children)
- [ ] At least one player with DOB 18+ years ago (for graduation testing)

### Browser Requirements

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Test Environment Setup

### Before Starting Tests

1. [ ] Ensure dev server is running (`npm run dev`)
2. [ ] Ensure Convex backend is running (`npx convex dev`)
3. [ ] Clear browser cache and cookies
4. [ ] Open browser developer tools (Console tab for errors)
5. [ ] Have Convex dashboard open for data verification

### Database Verification Commands

```bash
# Check notifications table
npx convex data notifications

# Check GDPR consents
npx convex data gdprConsents

# Check invitations
npx convex data invitation

# Check guardian player links
npx convex data guardianPlayerLinks

# Check player graduations
npx convex data playerGraduations
```

---

## Phase 1: Foundation & Bug Fixes

### P1-001: OnboardingOrchestrator Renders Without Errors

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as any user with org access | Dashboard loads | |
| 2 | Open browser console | No errors related to OnboardingOrchestrator | |
| 3 | Navigate between org pages | No console errors | |

### P1-002: Bug #297 - Parent Child Links Persist After Invitation Acceptance

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as Org Admin | Dashboard loads | |
| 2 | Navigate to Invitations page | Page loads | |
| 3 | Create new parent invitation with email `testparent@test.com` | Invitation form opens | |
| 4 | Add 2 children (John, Jane) to the invitation | Children appear in list | |
| 5 | Send the invitation | Success message shown | |
| 6 | Log out | Logged out | |
| 7 | Sign up as `testparent@test.com` | Account created | |
| 8 | Accept the invitation | Invitation accepted | |
| 9 | Navigate to Parent Dashboard | Dashboard loads | |
| 10 | Verify John and Jane are visible | Both children listed | |
| 11 | Open Convex dashboard | Dashboard opens | |
| 12 | Query `guardianPlayerLinks` table | 2 records exist for this guardian | |

**Verification Query:**
```javascript
// In Convex dashboard, check guardianPlayerLinks
db.query("guardianPlayerLinks")
  .filter(q => q.eq(q.field("guardianIdentityId"), "<guardian-id>"))
  .collect()
```

### P1-003: Bug #327 - Single Dialog Appears (Not Two)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create new invitation for `newparent@test.com` with children | Invitation sent | |
| 2 | Log out | Logged out | |
| 3 | Open invitation link in new browser/incognito | Invitation page loads | |
| 4 | Sign up as `newparent@test.com` | Account created | |
| 5 | Accept invitation | **ONLY ONE** dialog appears | |
| 6 | Count visible modals/dialogs on screen | Exactly 1 dialog | |
| 7 | Complete the dialog | Redirected to dashboard | |

### P1-004: BulkClaimProvider Removed

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Search codebase for "BulkClaimProvider" | No results (file deleted) | |
| 2 | Search for imports of BulkClaimProvider | No import statements found | |

**Verification:**
```bash
grep -r "BulkClaimProvider" apps/web/src/
# Should return no results
```

### P1-005: Guardian Claim Through Orchestrator

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create guardian identity with email matching existing user | Record created | |
| 2 | Log in as that user | Dashboard loads | |
| 3 | Verify claim dialog appears | BulkGuardianClaimDialog shown via orchestrator | |
| 4 | Complete the claim | Dialog closes, guardian claimed | |

---

## Phase 1B: Invitation Lifecycle

### P1B-001: Expired Invitation Detection

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | In Convex dashboard, find or create an invitation | Invitation exists | |
| 2 | Manually set `expiresAt` to past date | Record updated | |
| 3 | Try to access invitation link | Expired message shown | |
| 4 | Verify "Resend Invitation" option appears | Button visible | |

### P1B-002: Resend Invitation Functionality

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as Org Admin | Dashboard loads | |
| 2 | Navigate to Invitations page | Page loads | |
| 3 | Find an expired invitation | Invitation shown with expired status | |
| 4 | Click "Resend" button | Confirmation dialog appears | |
| 5 | Confirm resend | New invitation sent | |
| 6 | Verify new expiration date | Date is in the future | |

### P1B-003: Invitation Status Indicators

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as Org Admin | Dashboard loads | |
| 2 | Navigate to Invitations page | Page loads | |
| 3 | Verify pending invitations show "Pending" badge | Badge visible | |
| 4 | Verify accepted invitations show "Accepted" badge | Badge visible | |
| 5 | Verify expired invitations show "Expired" badge | Badge visible with warning color | |

### P1B-004: Grace Period Handling

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Set invitation expiry to 1 day in the future | Record updated | |
| 2 | Access invitation link | Warning about expiring soon shown | |
| 3 | Verify invitation still works | Can accept invitation | |

---

## Phase 2: GDPR Consent

### P2-001: GDPR Consent Modal Appears for New Users

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create new user account | Account created | |
| 2 | Accept organization invitation | Invitation flow starts | |
| 3 | Verify GDPR consent modal appears | Modal visible | |
| 4 | Verify privacy policy text is shown | Policy text visible | |
| 5 | Verify "Accept" and "Decline" buttons | Both buttons present | |

### P2-002: GDPR Consent Recording

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | As new user, see GDPR modal | Modal visible | |
| 2 | Click "Accept" button | Modal closes | |
| 3 | Open Convex dashboard | Dashboard opens | |
| 4 | Query `gdprConsents` table | Record exists for user | |
| 5 | Verify `consentedAt` timestamp | Timestamp is current | |
| 6 | Verify `version` field | Matches current GDPR version | |

**Verification Query:**
```javascript
db.query("gdprConsents")
  .filter(q => q.eq(q.field("userId"), "<user-id>"))
  .first()
```

### P2-003: GDPR Consent Blocks Progress Until Accepted

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | As new user, see GDPR modal | Modal visible | |
| 2 | Try to click outside modal | Modal stays open | |
| 3 | Try to navigate away | Navigation blocked | |
| 4 | Click "Decline" | Warning message shown | |
| 5 | Verify user cannot proceed without accepting | Access blocked | |

### P2-004: Re-consent Flow for Updated Policies

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | User has existing GDPR consent (version 1) | Consent exists | |
| 2 | Update GDPR version in system to version 2 | Version updated | |
| 3 | User logs in | GDPR modal appears again | |
| 4 | Modal shows "Updated Privacy Policy" message | Message visible | |
| 5 | User accepts new version | New consent recorded | |
| 6 | Verify both consent records exist | Version 1 and 2 in database | |

### P2-005: GDPR Version Tracking

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Query current GDPR version | Version returned | |
| 2 | Create new consent | Consent has current version | |
| 3 | Verify version field in consent record | Matches system version | |

---

## Phase 3: Child Linking

### P3-001: Child Linking Modal for Guardians

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as parent with pending child links | Dashboard loads | |
| 2 | Verify child linking modal appears | Modal visible | |
| 3 | Modal shows list of children to acknowledge | Children listed | |
| 4 | Each child has "Confirm" button | Buttons present | |

### P3-002: Acknowledge Child Link

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | In child linking modal, click "Confirm" for a child | Button clicked | |
| 2 | Verify confirmation feedback | Success indicator shown | |
| 3 | Query `guardianPlayerLinks` table | `acknowledgedByParentAt` is set | |
| 4 | Verify child appears in parent dashboard | Child visible | |

### P3-003: Decline Child Link

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | In child linking modal, click "Decline" for a child | Button clicked | |
| 2 | Verify confirmation dialog | "Are you sure?" prompt | |
| 3 | Confirm decline | Link declined | |
| 4 | Query `guardianPlayerLinks` table | Status is "declined" | |
| 5 | Verify child does NOT appear in parent dashboard | Child not visible | |

### P3-004: Admin View of Guardian-Child Relationships

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as Org Admin | Dashboard loads | |
| 2 | Navigate to player detail page | Page loads | |
| 3 | Find "Guardians" section | Section visible | |
| 4 | Verify linked guardians are shown | Guardian names listed | |
| 5 | Verify link status shown (pending/confirmed) | Status badges visible | |

### P3-005: Admin Add Guardian to Player

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as Org Admin | Dashboard loads | |
| 2 | Navigate to player detail page | Page loads | |
| 3 | Click "Add Guardian" button | Dialog opens | |
| 4 | Enter guardian email | Email entered | |
| 5 | Select relationship (Parent/Guardian/Other) | Relationship selected | |
| 6 | Check "Send email notification" checkbox | Checkbox checked | |
| 7 | Click "Add" | Guardian added | |
| 8 | Verify guardian appears in list | Guardian visible | |
| 9 | If email sent, verify notification option worked | Email sent (check logs) | |

### P3-006: Admin Remove Guardian from Player

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as Org Admin | Dashboard loads | |
| 2 | Navigate to player with guardian | Page loads | |
| 3 | Click "Remove" on guardian | Confirmation dialog | |
| 4 | Confirm removal | Guardian removed | |
| 5 | Verify guardian no longer in list | Guardian not visible | |

### P3-007: Invitation Request Approve Flow

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create pending invitation request | Request created | |
| 2 | Log in as Org Admin | Dashboard loads | |
| 3 | Navigate to invitation requests page | Page loads | |
| 4 | Find pending request | Request visible | |
| 5 | Click "Approve" button | Approval dialog opens | |
| 6 | Confirm approval | Request approved | |
| 7 | Verify invitation is sent | Invitation in invitations list | |

### P3-008: Invitation Request Deny Flow

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create pending invitation request | Request created | |
| 2 | Log in as Org Admin | Dashboard loads | |
| 3 | Navigate to invitation requests page | Page loads | |
| 4 | Find pending request | Request visible | |
| 5 | Click "Deny" button | Denial dialog opens | |
| 6 | Enter optional reason | Reason entered | |
| 7 | Confirm denial | Request denied | |
| 8 | Verify request marked as denied | Status updated | |
| 9 | Verify admin notification created | Notification in database | |

### P3-009: Email Notification Checkbox

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | In add guardian dialog, check email checkbox | Checkbox checked | |
| 2 | Add guardian | Guardian added | |
| 3 | Verify email was sent (check logs/email service) | Email sent | |
| 4 | Repeat with checkbox unchecked | Guardian added | |
| 5 | Verify NO email was sent | No email sent | |

### P3-010: Admin Notifications for Declined Links

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | As parent, decline a child link | Link declined | |
| 2 | Log in as Org Admin | Dashboard loads | |
| 3 | Check admin notifications | Notification about declined link | |
| 4 | Notification shows parent name and child name | Details visible | |

---

## Phase 4: Toast Notifications

### P4-001: Notifications Table Created

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open Convex dashboard | Dashboard opens | |
| 2 | Check for `notifications` table | Table exists | |
| 3 | Verify table schema has required fields | userId, type, message, read, etc. | |

### P4-002: Toast Appears on Role Grant

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as user without coach role | Dashboard loads | |
| 2 | In another tab, as admin, grant coach role to user | Role granted | |
| 3 | Return to user's tab | Toast notification appears | |
| 4 | Toast shows "You've been granted Coach role" | Message visible | |
| 5 | Toast auto-dismisses after timeout | Toast disappears | |

### P4-003: Multiple Notifications Staggered Display

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create 3 notifications for a user rapidly | Notifications created | |
| 2 | User logs in or refreshes | Toasts appear | |
| 3 | Verify toasts appear one at a time (staggered) | Not all at once | |
| 4 | Verify toasts stack properly | No overlap issues | |

### P4-004: Mark Notification as Read

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | User has unread notification | Notification exists | |
| 2 | Toast appears | Toast visible | |
| 3 | Click "Dismiss" or let it auto-dismiss | Toast dismissed | |
| 4 | Query notification in database | `read` field is true | |

### P4-005: Notification Preferences (if implemented)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Navigate to user settings | Settings page loads | |
| 2 | Find notification preferences | Preferences section visible | |
| 3 | Toggle off role notifications | Setting saved | |
| 4 | Grant user a role | No toast appears | |
| 5 | Toggle back on | Setting saved | |
| 6 | Grant user another role | Toast appears | |

### P4-006: Real-time Notification Subscription

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | User logged in with dashboard open | Dashboard visible | |
| 2 | Create notification for user via Convex dashboard | Notification created | |
| 3 | Verify toast appears WITHOUT page refresh | Real-time update | |

---

## Phase 5: First User Onboarding

### P5-001: First User Detection

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Start with fresh database (no users) | Database empty | |
| 2 | Sign up as first user | Account created | |
| 3 | Verify `isPlatformStaff` is true | Field set in database | |
| 4 | Verify redirected to `/setup` | Setup wizard loads | |

**Note:** This test requires a fresh database. Consider using a test environment.

### P5-002: Platform Staff Auto-Assignment

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | First user signs up | Account created | |
| 2 | Query user in Convex dashboard | User record found | |
| 3 | Verify `isPlatformStaff: true` | Field is true | |
| 4 | Verify `setupComplete: false` | Field is false | |
| 5 | Verify `setupStep: 'gdpr'` | Starting step correct | |

### P5-003: Setup Wizard Step 1 - GDPR

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | First user on `/setup` | GDPR step shown | |
| 2 | Verify privacy policy displayed | Policy text visible | |
| 3 | Verify "Accept" button | Button present | |
| 4 | Click "Accept" | Proceeds to step 2 | |
| 5 | Verify progress indicator shows step 1 complete | Checkmark on step 1 | |

### P5-004: Setup Wizard Step 2 - Welcome

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | After GDPR, on welcome step | Welcome page shown | |
| 2 | Verify welcome message | "Welcome to PlayerARC" visible | |
| 3 | Verify Platform Staff explanation | Explanation cards visible | |
| 4 | Click "Continue" | Proceeds to step 3 | |

### P5-005: Setup Wizard Step 3 - Create Organization

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | On create org step | Form visible | |
| 2 | Enter organization name | Name entered | |
| 3 | Verify slug auto-generates | Slug populated | |
| 4 | Select primary sport | Sport selected | |
| 5 | (Optional) Upload logo | Logo uploaded | |
| 6 | Select colors | Colors selected | |
| 7 | Click "Create Organization" | Org created | |
| 8 | Verify organization in database | Record exists | |
| 9 | Verify user is Owner | Member record with owner role | |

### P5-006: Setup Wizard Step 4 - Invite Team

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | On invite step | Invite form visible | |
| 2 | Enter colleague email | Email entered | |
| 3 | Select role (Admin/Coach) | Role selected | |
| 4 | Click "Add Another" | New row appears | |
| 5 | Enter second colleague | Details entered | |
| 6 | Click "Send Invitations" | Invitations sent | |
| 7 | Verify invitations in database | Records exist | |

### P5-007: Setup Wizard Step 4 - Skip Option

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | On invite step | Invite form visible | |
| 2 | Click "Skip for Now" | Proceeds without sending | |
| 3 | Verify NO invitations created | No new invitation records | |
| 4 | Arrives at step 5 | Completion page shown | |

### P5-008: Setup Wizard Step 5 - Complete

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | On completion step | Success message shown | |
| 2 | Verify checkmark/success icon | Icon visible | |
| 3 | Verify "Go to Dashboard" button | Button present | |
| 4 | Wait 5 seconds OR click button | Redirected to org dashboard | |
| 5 | Verify `setupComplete: true` in database | Field updated | |

### P5-009: Setup Protection - Non-Staff Cannot Access

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as regular user (not platform staff) | Dashboard loads | |
| 2 | Manually navigate to `/setup` | Access denied | |
| 3 | Verify redirected to home or orgs page | Correct redirect | |

### P5-010: Setup Protection - Completed Staff Cannot Re-access

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as platform staff who completed setup | Dashboard loads | |
| 2 | Manually navigate to `/setup` | Access denied | |
| 3 | Verify redirected to orgs page | Correct redirect | |

### P5-011: Setup Resume After Abandonment

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | First user starts setup, completes step 2 | On step 3 | |
| 2 | Close browser | Session ended | |
| 3 | Log back in | Redirected to `/setup` | |
| 4 | Verify resumes at step 3 (not step 1) | Correct step shown | |

### P5-012: Second User Gets Normal Flow

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | First user completes setup | Setup done | |
| 2 | Second user signs up | Account created | |
| 3 | Verify `isPlatformStaff: false` | Not platform staff | |
| 4 | Verify NOT redirected to `/setup` | Normal flow | |

---

## Phase 6: Polish & Error Handling

### P6-001: Error Boundary Catches Errors

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Intentionally cause an error in onboarding component | Error thrown | |
| 2 | Verify error boundary catches it | Friendly error message shown | |
| 3 | Verify "Try Again" or "Go Back" option | Recovery options present | |
| 4 | Verify app doesn't crash entirely | Other parts still work | |

### P6-002: Loading Skeletons Display

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Throttle network in DevTools (slow 3G) | Network throttled | |
| 2 | Navigate to onboarding step | Page loading | |
| 3 | Verify skeleton/loading state shown | Skeleton visible | |
| 4 | Verify content replaces skeleton when loaded | Smooth transition | |

### P6-003: Help/Support Footer

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open any onboarding modal | Modal visible | |
| 2 | Scroll to bottom of modal | Footer visible | |
| 3 | Verify help/support link or text | Help option present | |

### P6-004: Keyboard Navigation

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open onboarding modal | Modal visible | |
| 2 | Press Tab key | Focus moves to first interactive element | |
| 3 | Continue tabbing | Focus cycles through all elements | |
| 4 | Press Escape | Modal closes (if dismissible) | |
| 5 | Press Enter on button | Button activates | |

### P6-005: Mobile Responsive - Modal

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open DevTools, set mobile viewport (375px) | Mobile view | |
| 2 | Trigger onboarding modal | Modal appears | |
| 3 | Verify modal fits screen | No horizontal scroll | |
| 4 | Verify text is readable | Font size appropriate | |
| 5 | Verify buttons are tappable | Adequate touch targets | |

### P6-006: Analytics Events Fired

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open browser DevTools Network tab | Network visible | |
| 2 | Filter for analytics requests | Filter applied | |
| 3 | Complete onboarding step | Step completed | |
| 4 | Verify analytics event sent | Request in network tab | |
| 5 | Verify event contains step name | Payload correct | |

### P6-007: Expired Invitations Archived (Scheduled Job)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create invitation with past expiry date | Invitation created | |
| 2 | Trigger `cleanupExpiredInvitations` job manually or wait | Job runs | |
| 3 | Query `invitation` table | Expired invitation removed | |
| 4 | Query `archivedInvitations` table | Invitation archived here | |

**Manual Trigger:**
```bash
npx convex run jobs/invitations:cleanupExpiredInvitations
```

### P6-008: Old Notifications Cleaned Up (Scheduled Job)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create old read notification (30+ days ago) | Notification created | |
| 2 | Trigger `cleanupOldNotifications` job | Job runs | |
| 3 | Query `notifications` table | Old notification removed | |

### P6-009: Retry Mechanism for Failed Mutations

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Throttle network or simulate failure | Network issues | |
| 2 | Attempt onboarding action | Action fails | |
| 3 | Verify retry option shown | "Try Again" button | |
| 4 | Restore network | Network working | |
| 5 | Click retry | Action succeeds | |

### P6-010: Invitation Link Copy-to-Clipboard

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as admin | Dashboard loads | |
| 2 | Navigate to invitations | Page loads | |
| 3 | Find invitation with copy link button | Button visible | |
| 4 | Click copy button | Link copied | |
| 5 | Paste in new tab | Invitation page loads | |

### P6-011: Invitation Expiration Warnings

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create invitation expiring in 2 days | Invitation created | |
| 2 | Access invitation link | Invitation page loads | |
| 3 | Verify expiration warning shown | "Expires in 2 days" message | |

### P6-012: Deleted Organization Edge Case

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create invitation for an org | Invitation created | |
| 2 | Delete the organization | Org deleted | |
| 3 | Try to access invitation link | Error page shown | |
| 4 | Verify friendly message | "Organization no longer exists" | |
| 5 | Verify no crash | App stable | |

### P6-013: Debug Panel (Dev Only)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Set `NODE_ENV=development` | Dev mode | |
| 2 | Navigate to onboarding flow | Flow visible | |
| 3 | Look for debug panel toggle | Toggle visible (dev only) | |
| 4 | Open debug panel | Panel shows onboarding state | |
| 5 | Verify shows current step, tasks, etc. | Debug info visible | |

---

## Phase 7: Player Dashboard & Graduation

### P7-001: Birthday Detection Job Creates Graduation Records

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create player with DOB 18+ years ago | Player created | |
| 2 | Ensure no graduation record exists | No record | |
| 3 | Trigger `detectPlayerGraduations` job | Job runs | |
| 4 | Query `playerGraduations` table | Record created | |
| 5 | Verify status is "pending" | Status correct | |

**Manual Trigger:**
```bash
npx convex run jobs/graduations:detectPlayerGraduations
```

### P7-002: Guardian Prompt for 18-Year-Old

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create graduation record with status "pending" | Record exists | |
| 2 | Log in as guardian of that player | Dashboard loads | |
| 3 | Verify graduation prompt appears | Modal/prompt visible | |
| 4 | Prompt shows player name | Name visible | |
| 5 | Prompt explains they turned 18 | Explanation visible | |

### P7-003: Send Graduation Invitation

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | In graduation prompt, enter player's email | Email entered | |
| 2 | Click "Send Invitation" | Button clicked | |
| 3 | Verify success message | Message shown | |
| 4 | Query `playerClaimTokens` table | Token created | |
| 5 | Query `playerGraduations` table | Status is "invitation_sent" | |
| 6 | Verify email sent (check logs) | Email sent | |

### P7-004: Dismiss Graduation Prompt - "Not Now"

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | In graduation prompt, click "Not Now" | Button clicked | |
| 2 | Prompt closes | Prompt dismissed | |
| 3 | Log out and back in | Session refreshed | |
| 4 | Verify prompt appears again | Prompt shown again | |

### P7-005: Dismiss Graduation Prompt - Permanent

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | In graduation prompt, click "Don't Ask Again" | Button clicked | |
| 2 | Confirm if prompted | Confirmed | |
| 3 | Query `playerGraduations` table | Status is "dismissed" | |
| 4 | Log out and back in | Session refreshed | |
| 5 | Verify prompt does NOT appear | No prompt | |

### P7-006: Claim Account Page - Valid Token

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Get claim token from `playerClaimTokens` | Token obtained | |
| 2 | Navigate to `/claim-account/[token]` | Page loads | |
| 3 | Verify welcome message with player name | Name shown | |
| 4 | Verify claim wizard steps shown | Steps visible | |

### P7-007: Claim Account Page - Expired Token

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Set token's `expiresAt` to past date | Token expired | |
| 2 | Navigate to `/claim-account/[token]` | Page loads | |
| 3 | Verify "Token Expired" message | Error message shown | |
| 4 | Verify option to request new invitation | Option available | |

### P7-008: Claim Account Page - Used Token

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Set token's `usedAt` to a timestamp | Token used | |
| 2 | Navigate to `/claim-account/[token]` | Page loads | |
| 3 | Verify "Already Claimed" message | Error message shown | |

### P7-009: Claim Wizard - Complete Flow

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | On claim page with valid token | Wizard visible | |
| 2 | Step 1: Welcome - click Continue | Proceeds | |
| 3 | Step 2: Sign up or sign in | Account linked | |
| 4 | Step 3: GDPR consent | Consent accepted | |
| 5 | Step 4: Review and confirm | Confirmation shown | |
| 6 | Click "Claim Account" | Account claimed | |
| 7 | Verify redirected to player dashboard | Dashboard loads | |

### P7-010: Player Account Linked After Claiming

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Complete claim wizard | Claim complete | |
| 2 | Query `playerIdentities` table | Record found | |
| 3 | Verify `userId` is set | User ID present | |
| 4 | Verify `claimedAt` timestamp | Timestamp set | |
| 5 | Query `playerGraduations` table | Status is "claimed" | |
| 6 | Query `playerClaimTokens` table | Token has `usedAt` set | |

### P7-011: Guardian Notified When Player Claims

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Player claims account | Claim complete | |
| 2 | Log in as guardian | Dashboard loads | |
| 3 | Check notifications | Notification present | |
| 4 | Notification says "[Player] claimed their account" | Message correct | |

### P7-012: Player Dashboard Accessible

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as player who claimed account | Dashboard loads | |
| 2 | Navigate to `/orgs/[orgId]/player` | Player dashboard loads | |
| 3 | Verify player name shown | Name visible | |
| 4 | Verify profile card | Photo, position, age group | |
| 5 | Verify teams list | Team assignments shown | |

### P7-013: Player Dashboard Link in Navigation

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as player who claimed account | Dashboard loads | |
| 2 | Check navigation/header | "My Dashboard" link visible | |
| 3 | Click link | Navigates to player dashboard | |

### P7-014: Player Dashboard Link Hidden for Non-Players

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as coach (not a claimed player) | Dashboard loads | |
| 2 | Check navigation/header | "My Dashboard" link NOT visible | |

---

## Regression Tests

### R-001: Existing User Invitation Flow Still Works

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create invitation for existing user | Invitation sent | |
| 2 | User logs in | Dashboard loads | |
| 3 | User can accept invitation | Invitation accepted | |
| 4 | User added to organization | Member record created | |

### R-002: Coach Invitation Flow

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create coach invitation | Invitation sent | |
| 2 | Recipient signs up/logs in | Account ready | |
| 3 | Accepts invitation | Invitation accepted | |
| 4 | Has coach role in org | Role assigned | |
| 5 | Can access coach features | Features work | |

### R-003: Admin Invitation Flow

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create admin invitation | Invitation sent | |
| 2 | Recipient accepts | Invitation accepted | |
| 3 | Has admin role in org | Role assigned | |
| 4 | Can access admin features | Features work | |

### R-004: Join Request Flow

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | User submits join request | Request created | |
| 2 | Admin sees request | Request visible | |
| 3 | Admin approves | User added to org | |
| 4 | User can access org | Access granted | |

### R-005: Multi-Org User Flow

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | User is member of Org A | Has access | |
| 2 | User invited to Org B | Invitation received | |
| 3 | User accepts Org B invitation | Now in both orgs | |
| 4 | User can switch between orgs | Switching works | |

### R-006: Team Assignment Still Works

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Admin assigns player to team | Assignment works | |
| 2 | Player appears in team roster | Player visible | |
| 3 | Coach can see player | Access correct | |

---

## Accessibility Tests

### A-001: Screen Reader Compatibility

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Enable screen reader (VoiceOver/NVDA) | Screen reader active | |
| 2 | Navigate to onboarding modal | Modal announced | |
| 3 | All buttons have accessible labels | Labels read correctly | |
| 4 | Form inputs have labels | Labels announced | |
| 5 | Error messages announced | Errors read | |

### A-002: Focus Management

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open onboarding modal | Modal opens | |
| 2 | Verify focus moves to modal | Focus inside modal | |
| 3 | Tab through modal | Focus stays in modal | |
| 4 | Close modal | Focus returns to trigger | |

### A-003: Color Contrast

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Run automated contrast checker | Tool runs | |
| 2 | Check all onboarding text | Contrast ratio >= 4.5:1 | |
| 3 | Check button text | Contrast ratio >= 4.5:1 | |
| 4 | Check error messages | Clearly visible | |

### A-004: ARIA Attributes

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Inspect modal in DevTools | Element visible | |
| 2 | Verify `role="dialog"` | Attribute present | |
| 3 | Verify `aria-modal="true"` | Attribute present | |
| 4 | Verify `aria-labelledby` on dialog | Points to title | |

---

## Mobile Responsiveness Tests

### M-001: iPhone SE (375px)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Set viewport to 375x667 | Mobile view | |
| 2 | Complete full onboarding flow | All steps work | |
| 3 | No horizontal scrolling | Layout fits | |
| 4 | All buttons tappable | Touch targets adequate | |
| 5 | Text readable | Font size appropriate | |

### M-002: iPad (768px)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Set viewport to 768x1024 | Tablet view | |
| 2 | Complete full onboarding flow | All steps work | |
| 3 | Layout uses available space | Good use of width | |
| 4 | Modals centered properly | Proper positioning | |

### M-003: Large Desktop (1920px)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Set viewport to 1920x1080 | Large desktop | |
| 2 | Complete full onboarding flow | All steps work | |
| 3 | Content not stretched | Max-width applied | |
| 4 | Modal sized appropriately | Not too wide | |

### M-004: Touch Interactions

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | On real mobile device | Device ready | |
| 2 | Tap buttons | Buttons respond | |
| 3 | Swipe (if applicable) | Gestures work | |
| 4 | Pinch zoom disabled on forms | Zoom behaves correctly | |

---

## Test Results Summary

| Phase | Total Tests | Passed | Failed | Blocked |
|-------|-------------|--------|--------|---------|
| Phase 1 | 5 | | | |
| Phase 1B | 4 | | | |
| Phase 2 | 5 | | | |
| Phase 3 | 10 | | | |
| Phase 4 | 6 | | | |
| Phase 5 | 12 | | | |
| Phase 6 | 13 | | | |
| Phase 7 | 14 | | | |
| Regression | 6 | | | |
| Accessibility | 4 | | | |
| Mobile | 4 | | | |
| **TOTAL** | **83** | | | |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Tester | | | |
| Developer | | | |
| Product Owner | | | |

---

## Notes & Issues Found

_Document any issues discovered during testing below:_

| Test ID | Issue Description | Severity | Ticket Created |
|---------|-------------------|----------|----------------|
| | | | |
| | | | |
| | | | |
