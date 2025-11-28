# Organization Join Request System - Refactoring Summary

## What Was Changed

### 1. Schema Changes

#### Better Auth Schema (`packages/backend/convex/betterAuth/schema.ts`)
**Removed:**
- `onboardingCompleted` field
- `approvalStatus` field and index
- `approvedBy` field
- `approvedAt` field
- `rejectionReason` field

Users are now clean Better Auth users without approval workflow fields.

#### Main Schema (`packages/backend/convex/schema.ts`)
**Added:**
- New `orgJoinRequests` table with full request lifecycle tracking
- Indexes for efficient querying by user, organization, and status

### 2. Backend Functions

#### New File: `packages/backend/convex/models/orgJoinRequests.ts`
**Queries:**
- `getAllOrganizations()` - List all organizations
- `getUserJoinRequests()` - Get user's request history
- `getUserPendingRequests()` - Get user's pending requests
- `getPendingRequestsForOrg(organizationId)` - Get org's pending requests

**Mutations:**
- `createJoinRequest()` - Submit join request with role selection
- `approveJoinRequest()` - Approve and add user to org
- `rejectJoinRequest()` - Reject with reason
- `cancelJoinRequest()` - User cancels their own request

#### Updated: `packages/backend/convex/models/users.ts`
**Removed:**
- `getPendingUsers()`
- `getApprovedUsers()`
- `getRejectedUsers()`
- `approveUser()`
- `rejectUser()`
- `unrejectUser()`

These are no longer needed as membership is handled via orgJoinRequests.

### 3. New Pages

#### `/orgs/join` (`apps/web/src/app/orgs/join/page.tsx`)
**Features:**
- Lists all available organizations
- Search functionality
- Shows which orgs user has pending requests for
- Prevents duplicate requests with visual feedback

#### `/orgs/join/[orgId]` (`apps/web/src/app/orgs/join/[orgId]/page.tsx`)
**Features:**
- Role selection (member, coach, parent)
- Dynamic role descriptions
- Optional message to admins
- Form validation
- Success/error handling with toast notifications

### 4. Updated Pages

#### `/orgs` (`apps/web/src/app/orgs/page.tsx`)
**Added:**
- "Join Organization" button in header
- "Pending Membership" section showing user's pending requests
- Cancel request functionality with toast feedback
- Updated empty state messaging

#### `/orgs/[orgId]/admin` (`apps/web/src/app/orgs/[orgId]/admin/page.tsx`)
**Changed:**
- "Pending Approvals" → "Pending Requests" (now shows join requests)
- "Active Users" → "Total Members" (shows actual member count)
- Pending users preview → Pending requests preview (shows role badges)
- Removed rejected users section
- Added "Grow Your Organization" card with link to join page

**Cleaned up:**
- Extracted components to separate files
- Removed unused component functions
- Simplified imports

#### `/orgs/[orgId]/admin/users/approvals` (`apps/web/src/app/orgs/[orgId]/admin/users/approvals/page.tsx`)
**Completely replaced:**
- Now shows `orgJoinRequests` instead of user approvals
- Removed tabs (no rejected tab)
- Request cards show:
  - User name and email
  - Requested role badge
  - Request date
  - Optional user message
- Approve button now reads "Approve & Add to Org"
- Rejection dialog still requires reason

#### `/orgs/[orgId]/admin/users` (`apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`)
**Updated:**
- Stats now include coach and parent counts (6 total cards)
- Invite dialog includes coach and parent role options
- Role badges include coach (green) and parent (pink)
- Updated help text for role descriptions

### 5. Component Extraction

Created reusable component files as siblings to pages:

**`apps/web/src/app/orgs/[orgId]/admin/stat-card.tsx`**
- `StatCard` - Reusable stat display component
- `StatCardSkeleton` - Loading state

**Removed obsolete components:**
- `pending-users-section.tsx` (no longer needed)
- `rejected-users-section.tsx` (no longer needed)

## Key Differences from Old System

| Aspect | Old System | New System |
|--------|-----------|------------|
| **Scope** | Global user approval | Per-organization requests |
| **Storage** | User table fields | Dedicated orgJoinRequests table |
| **Roles** | N/A | User selects role when joining |
| **Multiple Orgs** | Single approval status | Multiple pending requests |
| **User Control** | None | Can cancel pending requests |
| **Audit Trail** | Basic | Full (requester, reviewer, timestamps) |
| **Flexibility** | Low | High (different roles per org) |

## Custom Roles Integration

The join request system integrates perfectly with the custom roles system:

**Roles Available:**
- `member` - Basic viewing access
- `coach` - Team, player, and training management
- `parent` - View access + report creation

**Where Roles Are Set:**
1. User requests role in join form (`/orgs/join/[orgId]`)
2. Request stores `requestedRole`
3. On approval, user is added to org with that role
4. Role determines permissions via access control system

## Migration Path

### For Existing Deployments

If you have existing users with `approvalStatus` fields:

1. **Export existing pending users:**
   ```typescript
   // Query users with approvalStatus: "pending"
   // Convert to orgJoinRequests
   ```

2. **Run schema migration:**
   ```bash
   npx -w packages/backend convex codegen
   ```

3. **Clean up old data** (optional):
   - Remove approvalStatus fields from existing users
   - Or leave them (they're now unused)

### For New Deployments

Just deploy and the schema will be created automatically. No migration needed.

## Testing the System

### As a Regular User:

1. Navigate to `/orgs/join`
2. Select an organization
3. Choose a role and submit
4. Verify request appears in `/orgs` under "Pending Membership"
5. Try cancelling the request
6. Try submitting duplicate request (should fail)

### As Admin/Owner:

1. Navigate to `/orgs/[orgId]/admin`
2. Verify pending requests count
3. Click through to approvals page
4. Review a request
5. Approve it and verify user becomes member
6. Check user appears in member list with correct role

## API Examples

### Creating a Join Request

```typescript
const requestId = await createJoinRequest({
  organizationId: "org_123",
  requestedRole: "coach",
  message: "I have 5 years of coaching experience",
});
```

### Approving a Request

```typescript
await approveJoinRequest({
  requestId: "request_456",
});
// User is now a member with their requested role
```

### Checking Pending Requests

```typescript
const pendingRequests = await getUserPendingRequests();
// Returns array of pending requests for current user

const orgRequests = await getPendingRequestsForOrg({
  organizationId: "org_123"
});
// Returns array of pending requests for organization (admin only)
```

## Benefits

1. **Cleaner User Model** - Users are just users, not tied to approval state
2. **Organization-Specific** - Users can request to join multiple orgs
3. **Role Selection** - Users declare their intended role upfront
4. **Better UX** - Users can see and manage their requests
5. **Audit Trail** - Complete history of who requested what and when
6. **Scalable** - Easy to add new roles or request types
7. **Flexible** - Each org manages its own approvals independently

## Notes

- All linting passes ✅
- Type-safe throughout ✅
- Components properly extracted ✅
- Documentation complete ✅
- Ready for testing 🚀

