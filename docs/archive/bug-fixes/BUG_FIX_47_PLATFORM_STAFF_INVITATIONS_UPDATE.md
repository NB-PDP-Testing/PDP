## Issue Analysis & Fix Details

### Issue Summary
Platform Staff Management only allowed granting staff access to users who already had an account in the system. There was no mechanism to pre-authorize someone as platform staff before they registered.

### Root Cause
The original implementation used a simple "search existing users → grant access" flow. The `updatePlatformStaffStatus` mutation required an existing user record to update. There was no concept of pending invitations or deferred access grants.

### Fix Implemented

**PR #346** implements a complete invitation system:

#### 1. New Database Table: `platformStaffInvitations`
```
Fields:
- email: string (normalized to lowercase)
- invitedBy: string (user ID of inviter)
- invitedByName, invitedByEmail: optional metadata
- status: "pending" | "accepted" | "cancelled" | "expired"
- createdAt, expiresAt: timestamps
- acceptedAt, acceptedByUserId: set when invitation is used
- cancelledAt, cancelledBy: set when cancelled
```

#### 2. Backend Functions
- `createInvitation` - Creates invitation OR grants access immediately if user exists
- `getPendingInvitations` - Lists pending invitations for the UI
- `cancelInvitation` - Marks invitation as cancelled
- `resendInvitation` - Extends expiry by 7 days
- `processPendingInvitation` - For auth integration (grants access on registration)

#### 3. Frontend Changes
- **Add Staff tab**: New "Invite by Email" card at top with email input
- **Pending tab**: New tab showing all pending invitations with:
  - Time remaining badge (or "Expired" badge)
  - Invited by name
  - Extend/Resend button
  - Cancel button

---

## Testing Steps

After merging PR #346, follow these steps to verify the fix:

### Prerequisites
1. Ensure `npx convex dev` is running (or deployed to Convex)
2. Log in as a platform staff user
3. Navigate to **Platform > Staff Management**

### Test 1: Invite a New Email
1. Go to the **"Add Staff"** tab
2. You should see a blue **"Invite by Email"** card at the top
3. Enter an email address that does NOT exist in the system (e.g., `test-invite@example.com`)
4. Click **"Send Invitation"**
5. ✅ Verify: Success toast "Invitation sent to test-invite@example.com"

### Test 2: View Pending Invitations
1. Click the **"Pending"** tab
2. ✅ Verify: The invitation you just created appears
3. ✅ Verify: Shows "Xd Xh remaining" badge in yellow
4. ✅ Verify: Shows "Invited by [your name]"

### Test 3: Extend an Invitation
1. In the Pending tab, click **"Extend"** on the invitation
2. ✅ Verify: Success toast "Invitation resent with extended expiry"
3. ✅ Verify: Time remaining resets to ~7 days

### Test 4: Cancel an Invitation
1. Click **"Cancel"** on the invitation
2. ✅ Verify: Success toast "Invitation cancelled"
3. ✅ Verify: Invitation disappears from the list

### Test 5: Invite Existing Non-Staff User
1. Go back to **"Add Staff"** tab
2. Enter an email of an existing user who is NOT platform staff
3. Click **"Send Invitation"**
4. ✅ Verify: Success toast "Platform staff access granted to [name]"
5. ✅ Verify: User appears in **"Current Staff"** tab immediately

### Test 6: Invite Existing Staff User (Error Case)
1. In **"Add Staff"** tab, enter the email of an existing platform staff member
2. Click **"Send Invitation"**
3. ✅ Verify: Error toast "This user is already a platform staff member"

### Test 7: Duplicate Invitation (Error Case)
1. Create a new invitation for a fresh email
2. Try to create another invitation for the same email
3. ✅ Verify: Error toast "A pending invitation already exists for this email"

### Test 8: Pending Count Badge
1. Create 2-3 pending invitations
2. ✅ Verify: The "Pending (X)" tab shows correct count
3. Cancel one invitation
4. ✅ Verify: Count decreases

---

## Note on Auto-Grant on Registration

The `processPendingInvitation` mutation is ready for integration with the auth flow. When integrated, it will:
1. Check if registering user has a pending invitation
2. If yes and not expired, grant platform staff access automatically
3. Mark invitation as "accepted"

This integration would be done in the auth callback/registration flow.
