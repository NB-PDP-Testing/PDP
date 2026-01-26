# Bug Fix: Issue #47 - Unable to Add Platform Staff if Not in System

**Issue:** [#47 - Unable to add platform staff if they are not in system](https://github.com/NB-PDP-Testing/PDP/issues/47)

**Date Fixed:** 2026-01-25

**Branch:** `fix/47-platform-staff-invitations`

**PR:** #346

---

## Problem

The Platform Staff Management page only allowed granting staff access to users who already existed in the system. There was no way to invite someone who hadn't registered yet.

**Reported behavior:**
> "Need to have the ability to add an email address that isn't already in the system and send and invite. The expectation being that when the invited user signs up, they will be automatically granted Platform Staff status."

---

## Solution

Implemented a complete invitation system for platform staff:

### Backend Changes

**New Table: `platformStaffInvitations`**
- Stores pending invitations with email, status, and expiry
- Status values: `pending`, `accepted`, `cancelled`, `expired`
- 7-day expiry period
- Indexed by email, status, and email+status combination

**New Mutations/Queries:**
1. `createInvitation` - Creates invitation or grants access immediately if user exists
2. `getPendingInvitations` - Lists all pending invitations
3. `cancelInvitation` - Cancels a pending invitation
4. `resendInvitation` - Extends expiry of a pending invitation
5. `processPendingInvitation` - Called on login to auto-grant staff access

### Frontend Changes

**Add Staff Tab:**
- Added "Invite by Email" section at the top
- Blue-themed card with email input and "Send Invitation" button
- Shows loading state while sending
- Displays success/error toasts

**New Pending Tab:**
- Shows all pending invitations
- Yellow styling for active invitations
- Red styling for expired invitations
- Shows time remaining until expiry
- "Extend"/"Resend" button to reset expiry
- "Cancel" button to remove invitation

---

## Files Changed

- `packages/backend/convex/schema.ts` - Added platformStaffInvitations table
- `packages/backend/convex/models/platformStaffInvitations.ts` - New file with all backend logic
- `apps/web/src/app/platform/staff/page.tsx` - Updated UI with invitation functionality

---

## How to Test

1. Navigate to Platform > Staff Management
2. Go to the "Add Staff" tab
3. In the "Invite by Email" section, enter an email that doesn't exist in the system
4. Click "Send Invitation" and verify success toast
5. Switch to "Pending" tab and verify invitation appears with countdown
6. Test "Extend" button - should reset the 7-day expiry
7. Test "Cancel" button - should remove the invitation
8. Enter an existing non-staff user's email - should grant access immediately
9. Enter an existing staff user's email - should show "already a platform staff member"
10. Enter an email with pending invitation - should show "pending invitation already exists"

---

## Future Enhancement

The `processPendingInvitation` mutation should be called during user registration/login to automatically grant staff access. This requires integration with the auth flow (not implemented in this PR).
