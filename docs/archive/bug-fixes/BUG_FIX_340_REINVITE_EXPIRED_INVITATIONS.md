# Bug Fix: Re-invite Expired Invitations (#340)

## Issue Summary

**Reported Issue**: Admin cannot resend/re-enable an expired invitation. The "Resend Invitation" button is greyed out for expired invitations, leaving admins with no way to easily re-invite users whose invitations have expired.

**User Impact**: At scale, organizations accumulate expired invitations that require manual effort to handle - admins must cancel and recreate each invitation from scratch, losing the original role/team/player assignments.

## Root Cause Analysis

### Intentional Design (Not a Bug)
The "Resend Invitation" button being disabled for expired invitations was **intentional behavior**, not a bug:

1. **Frontend** (`apps/web/src/app/orgs/[orgId]/admin/users/page.tsx:1059`):
   ```tsx
   {!isExpired && (
     <Button onClick={() => handleResendInvitation(...)}>Resend</Button>
   )}
   ```
   The button only renders when `!isExpired`.

2. **Backend** (`packages/backend/convex/models/members.ts:3067`):
   ```typescript
   if (invitationResult.expiresAt < now) {
     throw new Error("Cannot resend expired invitation. Please send a new invitation.");
   }
   ```
   The backend explicitly prevents resending expired invitations.

### Why This Design Existed
- Security: Expired tokens should not be reused
- However, the UX was poor - no easy path to re-invite with the same settings

### Industry Standard Gap
Most platforms (Slack, Google Workspace, GitHub) allow "re-inviting" expired invitations by creating a **new invitation** with the same settings while invalidating the old one.

## Solution Implemented

### New Features Added

#### 1. Re-invite Single Expired Invitation
- **Backend**: `reInviteExpired` mutation
- **Frontend**: "Re-invite" button shown on expired invitations

**Flow**:
1. Validates invitation is expired
2. Checks rate limit (max 3 invitations per email per 24 hours)
3. Cancels the old expired invitation
4. Creates new invitation with same settings (roles, teams, players)
5. Sends fresh invitation email
6. Logs both events to audit trail

#### 2. Bulk Re-invite All Expired
- **Backend**: `bulkReInviteExpired` mutation
- **Frontend**: "Re-invite All Expired (N)" button in card header

**Flow**:
1. Finds all expired pending invitations for the organization
2. Processes each one through `reInviteExpired`
3. Returns summary: succeeded, failed, rate-limited counts

#### 3. Rate Limiting (Security Best Practice)
- **Backend**: `checkInvitationRateLimit` query
- **Limit**: Maximum 3 invitations per email per 24 hours
- **Purpose**: Prevents invitation spam

### Files Modified

| File | Changes |
|------|---------|
| `packages/backend/convex/models/members.ts` | Added `checkInvitationRateLimit`, `reInviteExpired`, `bulkReInviteExpired` |
| `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx` | Added Re-invite button, bulk action button, handler functions |

## Manual Verification Steps

### Prerequisites
- Access to an organization as Admin or Owner
- At least one pending invitation that has expired (or create one and wait for expiry, or manually adjust expiry in database)

### Test 1: Verify Re-invite Button Appears on Expired Invitations

1. Navigate to `/orgs/[orgId]/admin/users`
2. Scroll to "Pending Invitations" section
3. Find an expired invitation (shown with red "Expired" badge)
4. **Expected**: "Re-invite" button is visible (not "Resend")
5. **Expected**: Non-expired invitations still show "Resend" button

### Test 2: Test Single Re-invite

1. Click "Re-invite" on an expired invitation
2. **Expected**:
   - Toast notification: "New invitation sent successfully"
   - Old invitation disappears from list
   - New invitation appears with fresh expiry date
   - Same roles/teams/players are preserved
3. Check recipient's email for new invitation

### Test 3: Test Rate Limiting

1. Re-invite the same email 3 times (may need to manually expire invitations)
2. On the 4th attempt:
   - **Expected**: Toast error showing rate limit message
   - **Expected**: Message includes next allowed time

### Test 4: Test Bulk Re-invite

1. Ensure multiple expired invitations exist
2. Click "Re-invite All Expired (N)" button in card header
3. **Expected**:
   - Progress indicator while processing
   - Toast notification with summary (e.g., "Successfully re-invited 3 users")
   - All expired invitations replaced with fresh ones

### Test 5: Verify Audit Trail

1. After re-inviting, click "History" on the new invitation
2. **Expected**:
   - "Created" event showing "Re-invited from expired invitation [old-id]"
3. (Optional) Check old invitation history shows "Cancelled" event with reason

### Test 6: Verify Email Content

1. Perform a re-invite
2. Check recipient's email inbox
3. **Expected**:
   - New invitation email received
   - Contains correct organization name
   - Contains correct roles/teams/players mentioned
   - Invitation link works and leads to valid accept page

## Technical Notes

### Rate Limit Configuration
```typescript
const INVITATION_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const INVITATION_RATE_LIMIT_MAX = 3; // Max 3 invitations per email per 24 hours
```

### Invitation Metadata Tracking
New invitations created via re-invite include metadata:
```typescript
metadata: {
  ...originalMetadata,
  reInvitedFrom: "original-invitation-id",
  reInvitedAt: timestamp,
  reInvitedBy: "user-id"
}
```

### Audit Events Logged
1. Old invitation: `eventType: "cancelled"` with `metadata: { reason: "Cancelled for re-invite" }`
2. New invitation: `eventType: "created"` with `metadata: { reInvitedFrom: "old-id" }`

## PR Reference

**Pull Request**: #356
**Branch**: `feat/340-reinvite-expired-invitations`
