# Bug Fix #437 — Existing User Invite Detection

## Issue
**Title:** Confirm how a user already in system can be added back to an org and given a role? is there an auto find for the admin and does system alert them when added

**Reporter:** ardmhacha24
**Assignee:** jkobrien

## Root Cause

Two related features were missing from the "Invite Member" admin flow:

**Feature A — No existing-user detection in invite dialog**
When an admin typed an email into the "Invite Member" dialog, the UI made no attempt to check whether that email already belonged to a registered user. Admins had no way to know the invited person already had an account.

**Feature B — No in-app notification for existing users**
When an existing user was invited (e.g. re-added after removal), the system only sent an email. If the user was already logged into the platform, they received no in-app alert and had to find and click the invitation email to rejoin.

The backend query `getUserByEmail` (`packages/backend/convex/models/users.ts:216`) already existed but was never called from the invite dialog. The in-app notification system was fully functional but had no `org_invitation_received` type defined.

## What Was Changed

### `packages/backend/convex/schema.ts`
- Added `org_invitation_received` to the `notifications` table `type` union.

### `packages/backend/convex/models/notifications.ts`
- Added `v.literal("org_invitation_received")` to `notificationTypeValidator`.

### `apps/web/src/components/notification-toast.tsx`
- Added `"org_invitation_received"` to the `NotificationType` union so the notification provider renders it correctly.

### `packages/backend/convex/models/invitations.ts`
- Added new `notifyExistingUserOfInvitation` mutation.
  Looks up the invited email via Better Auth adapter, fetches org name, and inserts an `org_invitation_received` notification for the user if an account is found. Returns `{ notified: boolean }`.

### `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`
- **Feature A**: Added 500ms debounced email state + `useQuery` on `getUserByEmail`. When a valid email is entered in the invite dialog and the email matches an existing account, a green `UserCheck` badge appears below the input: *"[Name] already has an account — they'll receive an in-app notification when invited."*
- **Feature B**: After `authClient.organization.inviteMember()` succeeds and the invitation ID is extracted, `notifyExistingUserOfInvitation` is called. No error is surfaced to the admin if the user doesn't exist — the notification is silently skipped.

## Files Modified

- `packages/backend/convex/schema.ts`
- `packages/backend/convex/models/notifications.ts`
- `apps/web/src/components/notification-toast.tsx`
- `packages/backend/convex/models/invitations.ts`
- `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`
