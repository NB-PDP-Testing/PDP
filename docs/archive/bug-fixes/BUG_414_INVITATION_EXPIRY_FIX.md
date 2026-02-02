# Bug #414 Fix: Invitation Expiry Date Mismatch

## Problem

Invitations were expiring after **48 hours (2 days)** instead of the expected **7 days**.

Additionally, email templates had "7 days" hardcoded, which would have been incorrect if admins changed the expiration setting.

## Root Cause

1. **Better Auth default:** The `invitationExpiresIn` option defaults to 48 hours (172,800 seconds)
2. **No override configured:** `packages/backend/convex/auth.ts` did not set a custom expiration
3. **Email mismatch:** Email templates in `packages/backend/convex/utils/email.ts` had "7 days" hardcoded

## Fix Applied

### 1. Set 7-day expiration in Better Auth config

**File:** `packages/backend/convex/auth.ts`

```typescript
organization({
  // Invitation expiration: 7 days (default is 48 hours)
  invitationExpiresIn: 60 * 60 * 24 * 7,
  // ... rest of config
})
```

### 2. Made email templates dynamic

**File:** `packages/backend/convex/utils/email.ts`

- Added `expiresInDays?: number` to `InvitationEmailData` type
- Updated `sendOrganizationInvitation()` to use dynamic `${expiresInDays}` (default: 7)
- Updated `generateWhatsAppInvitationMessage()` to use dynamic `${expiresInDays}` (default: 7)

**Before:**
```
This invitation will expire in 7 days.
```

**After:**
```
This invitation will expire in ${expiresInDays} days.
```

## Files Changed

1. `packages/backend/convex/auth.ts` - Added `invitationExpiresIn: 60 * 60 * 24 * 7`
2. `packages/backend/convex/utils/email.ts` - Made expiration days dynamic in 3 email templates

## Branch

`jkobrien/FixExpirationDate`

## Note on Existing Invitations

This fix only affects **new invitations** created after deployment. Existing invitations already have their `expiresAt` timestamp stored in the database.

To fix existing invitations:
- Admins can use the "Re-invite" button on expired invitations
- Or a migration script can be run to extend `expiresAt` on pending invitations

## Testing

1. Create a new invitation
2. Verify the invitation record has `expiresAt` set to ~7 days from now
3. Verify the email shows the correct expiration message

---

*Fix by Claude Code - Feb 2, 2026*
