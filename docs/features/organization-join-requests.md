# Organization Join Request System

This document describes the new organization membership request system that replaces the old user approval workflow.

## Overview

Instead of storing approval status directly on user accounts, we now use a dedicated `orgJoinRequests` table. This allows:
- Users to request membership in specific organizations
- Different roles per organization (coach, parent, member)
- Multiple pending requests for different organizations
- Clear audit trail of requests and approvals

## Architecture

### Database Schema

#### orgJoinRequests Table
Location: `packages/backend/convex/schema.ts`

```typescript
{
  userId: string,              // Better Auth user ID
  userEmail: string,           // For display
  userName: string,            // For display
  organizationId: string,      // Target organization
  organizationName: string,    // For display
  requestedRole: "member" | "coach" | "parent",
  status: "pending" | "approved" | "rejected",
  message?: string,            // Optional message from user
  rejectionReason?: string,    // If rejected
  requestedAt: number,         // Timestamp
  reviewedAt?: number,         // When reviewed
  reviewedBy?: string,         // Reviewer user ID
  reviewerName?: string,       // Reviewer name
}
```

**Indexes:**
- `by_userId` - Get all requests for a user
- `by_organizationId` - Get all requests for an organization
- `by_status` - Filter by status
- `by_userId_and_organizationId` - Check for duplicates
- `by_organizationId_and_status` - Get pending requests per org

### User Schema Changes
Location: `packages/backend/convex/betterAuth/schema.ts`

**Removed fields:**
- `approvalStatus`
- `approvedBy`
- `approvedAt`
- `rejectionReason`
- `onboardingCompleted`

Users are now clean Better Auth users without approval state.

## Backend API

### Queries

**`getAllOrganizations()`**
- Returns all organizations available to join
- Public access
- Used on `/orgs/join` page

**`getUserJoinRequests()`**
- Returns all join requests for the current user
- Shows history across all organizations

**`getUserPendingRequests()`**
- Returns only pending requests for current user
- Used on `/orgs` page to show pending memberships

**`getPendingRequestsForOrg(organizationId)`**
- Returns pending requests for a specific organization
- Requires admin or owner role
- Used on admin approvals page

### Mutations

**`createJoinRequest(organizationId, requestedRole, message?)`**
- Creates a new join request
- Validates: no duplicate pending requests, not already a member
- Returns the request ID

**`approveJoinRequest(requestId)`**
- Approves request and adds user to organization
- Requires admin or owner role
- Creates Better Auth member record with requested role

**`rejectJoinRequest(requestId, rejectionReason)`**
- Rejects the request with a reason
- Requires admin or owner role
- Updates request status to rejected

**`cancelJoinRequest(requestId)`**
- Cancels a pending request
- Only requester can cancel
- Deletes the request

## User Flow

### Requesting to Join

1. User navigates to `/orgs/join`
2. Sees list of all organizations
3. Clicks on an organization
4. Goes to `/orgs/join/[orgId]`
5. Selects role (member, coach, or parent)
6. Optionally adds a message
7. Submits request
8. Redirected back to `/orgs`
9. Can see their pending request in "Pending Membership" section

### Admin Approval Flow

1. Admin navigates to `/orgs/[orgId]/admin`
2. Sees "Pending Requests" count in stats
3. Clicks on "Pending Requests" or navigates to `/orgs/[orgId]/admin/users/approvals`
4. Reviews each request with:
   - User name and email
   - Requested role (displayed as badge)
   - Request date
   - Optional message from user
5. Can approve (adds to org with requested role) or reject (with reason)

## UI Components

### `/orgs/join` Page
- Lists all available organizations
- Shows which orgs user has pending requests for
- Search functionality
- Link back to `/orgs`

### `/orgs/join/[orgId]` Page
- Role selection dropdown (member, coach, parent)
- Optional message textarea
- Role descriptions
- Submit creates request and redirects to `/orgs`

### `/orgs` Page (Updated)
- Shows user's organizations at top
- New "Pending Membership" section at bottom
- Each pending request shows:
  - Organization name
  - Requested role badge
  - Request date
  - Cancel button (X icon)
- "Join Organization" button in header

### `/orgs/[orgId]/admin` Page (Updated)
- "Pending Requests" stat card (replaces "Pending Approvals")
- "Total Members" stat card (shows actual count)
- "Pending Membership Requests" preview section
- Shows up to 5 requests with role badges
- Link to view all requests

### `/orgs/[orgId]/admin/users/approvals` Page (Replaced)
- Now shows `orgJoinRequests` instead of user approvals
- Search by name or email
- Request cards show:
  - User info
  - Requested role badge
  - Request date
  - Optional message
  - Approve/Reject buttons
- Rejection requires a reason (dialog)

### `/orgs/[orgId]/admin/users` Page (Updated)
- Stats now include coach and parent role counts
- 6 stat cards: Total, Coach, Parent, Member, Admin, Owner
- Coach role badge: green
- Parent role badge: pink
- Invite dialog includes coach and parent options

## Role Descriptions

Shown to users when selecting a role:

- **Member**: "Members have basic viewing access to organization data"
- **Coach**: "Coaches can manage teams, players, and training sessions"
- **Parent**: "Parents can view information and create reports about their players"

## Permissions

Based on access control defined in `accessControl.ts`:

| Resource | Member | Coach | Parent |
|----------|--------|-------|--------|
| team | view | view, manage | view |
| player | view | view, create, update | view |
| training | view | view, create, update | view |
| report | view | view, create | view, create |

## Migration Notes

### What Changed
- ✅ Removed approval status from user table
- ✅ Created dedicated orgJoinRequests table
- ✅ Users can now request specific roles
- ✅ Requests are org-specific (not global user approval)
- ✅ Better audit trail with reviewer information

### What Stayed the Same
- Admin/owner approval still required
- Same UI locations for approvals
- Rejection still requires a reason
- User search and filtering still works

### Backward Compatibility
- Existing members are unaffected
- New users register normally
- Join request is separate from user registration

## File Structure

```
packages/backend/convex/
├── models/
│   ├── orgJoinRequests.ts      # NEW - Join request functions
│   ├── members.ts              # NEW - Member queries with roles
│   └── users.ts                # UPDATED - Removed approval functions
├── betterAuth/
│   ├── schema.ts               # UPDATED - Removed approval fields
│   └── accessControl.ts        # Defines coach & parent roles
└── schema.ts                   # UPDATED - Added orgJoinRequests table

apps/web/src/app/
├── orgs/
│   ├── page.tsx                # UPDATED - Shows pending requests
│   └── join/
│       ├── page.tsx            # NEW - List organizations
│       └── [orgId]/
│           └── page.tsx        # NEW - Submit join request
└── orgs/[orgId]/admin/
    ├── page.tsx                # UPDATED - Uses join requests
    └── users/
        ├── page.tsx            # UPDATED - Added coach/parent stats
        └── approvals/
            └── page.tsx        # REPLACED - Now shows join requests
```

## Testing Checklist

- [ ] User can navigate to `/orgs/join`
- [ ] User can see list of organizations
- [ ] User can select an organization and go to join form
- [ ] User can select role (member/coach/parent)
- [ ] User can submit join request
- [ ] User is redirected to `/orgs`
- [ ] Pending request appears in "Pending Membership" section
- [ ] User can cancel their own request
- [ ] Admin can see pending requests in dashboard
- [ ] Admin can navigate to approvals page
- [ ] Admin can approve request (user becomes member)
- [ ] Admin can reject request with reason
- [ ] User stats show correct member counts by role
- [ ] Duplicate requests are prevented
- [ ] Already-member check works

## Future Enhancements

Potential improvements to consider:
- Email notifications for request status changes
- Request expiration after N days
- Bulk approve/reject
- Request templates or pre-defined messages
- Organization discovery/search
- Public organization profiles
- Invitation codes for private organizations

