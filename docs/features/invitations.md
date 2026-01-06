# Organization Invitation Flow

## Overview

This document describes the complete flow of inviting a user to join an organization via email, including what tables are used and the user experience.

## Tables Used

### 1. `invitation` Table (Better Auth)
**Location**: `packages/backend/convex/betterAuth/generatedSchema.ts`

**Schema**:
```typescript
{
  organizationId: string,      // Organization being invited to
  email: string,                // Email address of invitee
  role: string | null,          // Role assigned (owner, admin, member, coach, parent)
  teamId: string | null,        // Optional team assignment
  status: string,               // Invitation status
  expiresAt: number,            // Expiration timestamp (7 days from creation)
  inviterId: string,           // User ID of person sending invitation
}
```

**Indexes**:
- `organizationId` - Get all invitations for an org
- `email` - Find invitations by email
- `role` - Filter by role
- `teamId` - Filter by team
- `status` - Filter by status
- `inviterId` - Get invitations sent by a user

### 2. `member` Table (Better Auth)
**Location**: `packages/backend/convex/betterAuth/generatedSchema.ts`

**Schema**:
```typescript
{
  organizationId: string,      // Organization ID
  userId: string,              // Better Auth user ID
  role: string,                // Role in organization
  createdAt: number,           // When membership was created
}
```

**Indexes**:
- `organizationId` - Get all members of an org
- `userId` - Get all orgs a user belongs to
- `role` - Filter by role

### 3. `user` Table (Better Auth - Extended)
**Location**: `packages/backend/convex/betterAuth/schema.ts`

Contains user account information. When a user accepts an invitation, they must have a user account (created via signup or social login).

## Invitation Flow

### Step 1: Admin Invites User

**Location**: `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`

**Action**:
```typescript
await authClient.organization.inviteMember({
  email: inviteEmail,
  organizationId: orgId,
  role: inviteRole as "member" | "admin",
});
```

**What Happens**:
1. Better Auth creates an `invitation` record in the database with:
   - `organizationId`: The organization being invited to
   - `email`: The invitee's email address
   - `role`: The assigned role (member, admin, coach, parent, etc.)
   - `status`: "pending"
   - `expiresAt`: 7 days from now
   - `inviterId`: The admin's user ID

2. Better Auth calls the `sendInvitationEmail` hook configured in `packages/backend/convex/auth.ts`

3. The hook:
   - Generates invitation link: `${siteUrl}/orgs/accept-invitation/${invitationId}`
   - Calls `sendOrganizationInvitation()` from `packages/backend/convex/utils/email.ts`
   - Sends email via Resend API with:
     - PlayerARC branded email template
     - Invitation link
     - Organization name
     - Inviter details
     - Assigned role

### Step 2: User Receives Email

**Email Contents**:
- Subject: "Invitation to join [Organization Name] on PlayerARC"
- From: `PlayerARC <team@notifications.playerarc.io>` (or `EMAIL_FROM_ADDRESS` env var)
- Includes:
  - PlayerARC logo and branding
  - Invitation message
  - "Accept Invitation" button
  - Plain text link as fallback
  - Expiration notice (7 days)

### Step 3: User Clicks Invitation Link

**URL**: `/orgs/accept-invitation/[invitationId]`

**Location**: `apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx`

**User Experience**:

#### Scenario A: User is NOT logged in
1. Page loads and checks for session
2. No session found → Redirects to `/login?redirect=/orgs/accept-invitation/[invitationId]`
3. User signs in/signs up
4. After authentication, redirects back to invitation page
5. Continues to Scenario B

#### Scenario B: User IS logged in
1. Page automatically calls `authClient.organization.acceptInvitation({ invitationId })`
2. Shows loading state: "Accepting Invitation..."
3. Better Auth processes the invitation:
   - Validates invitation exists and is not expired
   - Checks invitation status is "pending"
   - Creates a `member` record:
     - `organizationId`: From invitation
     - `userId`: Current user's ID
     - `role`: From invitation
     - `createdAt`: Current timestamp
   - Updates invitation `status` to "accepted" (or similar)
4. Shows success state: "Invitation Accepted!"
5. After 2 seconds, redirects to:
   - `/orgs/[organizationId]` if organization ID is available
   - `/orgs` (organizations list) as fallback

#### Scenario C: Error Occurs
**Possible Errors**:
- Invalid invitation ID
- Invitation expired (7 days)
- Invitation already accepted/rejected
- User account doesn't exist (shouldn't happen if logged in)
- Network/server error

**User Experience**:
- Shows error state with message
- Provides buttons to:
  - "Go to Organizations" (navigates to `/orgs`)
  - "Sign In" (navigates to `/login`)

## Database State Changes

### Before Invitation
- `invitation` table: No record
- `member` table: No membership record

### After Admin Sends Invitation
- `invitation` table: New record with `status: "pending"`
- `member` table: No change (user not yet a member)

### After User Accepts Invitation
- `invitation` table: Record updated with `status: "accepted"` (or removed)
- `member` table: New record created linking user to organization

## Key Points

1. **Invitations are email-based**: The invitation is tied to an email address, not a user account
2. **User must have account**: To accept, the user must sign up/sign in first
3. **7-day expiration**: Invitations expire after 7 days
4. **Role assignment**: Role is set at invitation time and applied when accepted
5. **No duplicate memberships**: Better Auth prevents duplicate memberships
6. **Email is sent immediately**: When admin clicks "Invite", email is sent via Resend

## Testing Checklist

- [ ] Admin can invite user via email
- [ ] Email is received with correct information
- [ ] Invitation link works
- [ ] Non-logged-in user is redirected to login
- [ ] After login, user is redirected back to invitation
- [ ] Invitation acceptance creates member record
- [ ] User is redirected to organization after acceptance
- [ ] Expired invitations show appropriate error
- [ ] Already-accepted invitations show appropriate error
- [ ] Invalid invitation IDs show appropriate error

## Related Files

- **Backend Auth Config**: `packages/backend/convex/auth.ts`
- **Email Template**: `packages/backend/convex/utils/email.ts`
- **Accept Page**: `apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx`
- **Invite UI**: `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`
- **Schema**: `packages/backend/convex/betterAuth/generatedSchema.ts`

