# User Management Enhancements - Comprehensive Plan

## Overview

This document provides a complete plan for enhancing the user management features in the admin panel, focusing on:
1. **Invitation Management Improvements** - Better visibility and control
2. **User Deletion** - Complete account removal with impact analysis
3. **User Suspension/Disable** - Org-specific and account-wide suspension

---

## Current State Assessment

### ✅ What We Already Have

**Invitation Management:**
- Basic invitation sending with functional roles
- Invitation detail modal showing:
  - Sent date, inviter, expiry
  - Functional roles
  - Team assignments (for coaches)
  - Player links (for parents)
  - Resend history
- Resend and Cancel invitation functionality

**User Management:**
- View all members with functional roles
- Edit user roles and assignments
- Coach team assignment
- Parent-player linking
- Remove from organization dialog (basic)

**Backend Functions:**
- `getPendingInvitationsWithAssignments` - Get enriched invitation data
- `resendInvitation` - Resend with history tracking
- `cancelInvitation` - Cancel pending invitation
- `getRemovalPreview` - Preview impact of removing user
- `removeFromOrganization` - Remove user from org (org-scoped only)

### ⚠️ What Needs Improvement

1. **Invitation Management** - Functional but could be more robust
2. **User Deletion** - Only has org removal, no full account deletion
3. **User Suspension** - Not implemented at all
4. **Better Auth Role Display** - Should hide internal roles, show only functional roles
5. **Impact Analysis** - Not comprehensive enough before deletion

---

## Feature 1: Enhanced Invitation Management

### Requirements

**Better Lineage Display:**
- Show clear timeline from initial send to all resends
- Display who performed each action (send, resend, cancel)
- Show email delivery status (if available)
- Highlight expired vs active invitations

**Better Presentation:**
- Use timeline component for invitation lifecycle
- Group invitations by status (pending, expired)
- Add filters (by role, by expiry date, by inviter)
- Add bulk actions (resend multiple, cancel multiple)

**Better Role Display:**
- **Primary Display**: Functional roles (coach, parent, admin, player)
- **Secondary/Hidden**: Better Auth role (only show in detail view)
- Clear indication when invitation has no functional roles

### Implementation Plan

#### 1.1 Backend Enhancements

**File**: `packages/backend/convex/models/members.ts`

**New/Updated Functions:**

```typescript
// Already exists, but enhance return type
export const getPendingInvitationsWithAssignments = query({
  // ... existing implementation
  // Ensure it returns:
  // - All resend history with user details
  // - Creation time
  // - Better Auth role (for reference only)
  // - Functional roles (primary display)
  // - Email delivery status (if tracking)
});

// New: Get invitation statistics
export const getInvitationStats = query({
  args: { organizationId: v.string() },
  returns: v.object({
    total: v.number(),
    pending: v.number(),
    expired: v.number(),
    acceptedLast30Days: v.number(),
    averageAcceptanceTime: v.number(), // in hours
  }),
  handler: async (ctx, args) => {
    // Query invitations and calculate stats
    // ...
  },
});

// Enhance resendInvitation to include more metadata
export const resendInvitation = mutation({
  // ... existing args
  // Add metadata tracking:
  // - resendReason (optional string)
  // - currentUser details
});
```

#### 1.2 Frontend Enhancements

**File**: `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`

**Improvements:**

1. **Better Invitation Card**:
   ```tsx
   // Replace current pending invitations section
   // Add:
   - Status badge (pending/expired) with color coding
   - Days until expiry prominently displayed
   - Functional roles as primary info (bigger, color-coded)
   - Better Auth role in smaller text (if needed for admin reference)
   - Timeline preview (sent date, last resent)
   - Quick action buttons (view, resend, cancel)
   ```

2. **Enhanced Detail Modal**:
   ```tsx
   // File: invitation-detail-modal.tsx
   // Add:
   - Full timeline view with visual timeline component
   - All resend events with timestamps and user who resent
   - Copy invitation link button
   - Revoke/Cancel with confirmation dialog
   - Show delivery status if available
   ```

3. **Invitation Filters**:
   ```tsx
   // Add filter controls:
   - Filter by status (active/expired)
   - Filter by functional role
   - Filter by expiry (< 7 days, < 30 days, > 30 days)
   - Sort by sent date, expiry date
   ```

#### 1.3 UI/UX Improvements

**Invitation List Card:**
- Use Timeline component for history
- Color-code by urgency:
  - Red: Expired
  - Orange: Expiring soon (< 7 days)
  - Green: Active
- Show assignment preview (e.g., "Coach: Team A, Team B")

**Detail Modal:**
- Add visual timeline
- Show assignment details in expandable sections
- Add "Copy Link" button
- Show invitation email preview

---

## Feature 2: User Deletion (Platform Staff Only)

### Requirements

**Comprehensive Impact Analysis:**
Before deletion, show admin:
- All organizations user belongs to
- User's role in each organization
- If user is the only owner of any organization (blocker)
- All data owned/created by user:
  - Voice notes
  - Skill assessments
  - Invitations sent
  - Coach assignments
  - Guardian-player links
  - Any other user-owned data
- Clear warning: "This action cannot be undone"
- Confirmation dialog requiring typing user's email

**Two-Phase Deletion:**
1. **Soft Delete** (Default):
   - Mark as deleted
   - Hide from UI
   - Preserve data for 30 days
   - Can be restored by platform staff

2. **Hard Delete** (Platform Staff Only):
   - Permanently delete all data
   - Cannot be restored
   - Cascade delete related records

### Implementation Plan

#### 2.1 Backend Functions

**File**: `packages/backend/convex/models/users.ts`

**Enhance Existing:**

```typescript
// Already exists, enhance to show MORE detail
export const getUserDeletionPreview = query({
  args: { email: v.string() },
  returns: v.object({
    canDelete: v.boolean(),
    user: v.object({
      _id: v.string(),
      email: v.string(),
      name: v.union(v.string(), v.null()),
      image: v.union(v.string(), v.null()),
      createdAt: v.number(),
      lastActiveAt: v.union(v.number(), v.null()),
    }),
    blockers: v.array(v.object({
      type: v.string(),
      organizationId: v.string(),
      organizationName: v.string(),
      message: v.string(),
    })),
    organizationMemberships: v.array(v.object({
      organizationId: v.string(),
      organizationName: v.string(),
      role: v.string(),
      functionalRoles: v.array(v.string()),
      memberSince: v.number(),
      isOnlyOwner: v.boolean(),
    })),
    dataImpact: v.object({
      // Auth data
      sessions: v.number(),
      accounts: v.number(),

      // Organization data
      members: v.number(),
      teamMembers: v.number(),

      // User-created content
      voiceNotes: v.number(),
      skillAssessments: v.number(),
      coachAssignments: v.number(),
      invitationsSent: v.number(),

      // Parent/Guardian data
      guardianIdentities: v.number(),
      guardianPlayerLinks: v.number(),

      // Player data (if user is also a player)
      playerIdentities: v.number(),

      // Summary
      totalRecords: v.number(),
      estimatedSize: v.string(), // "~1.5 MB"
    }),
    warnings: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    // Comprehensive impact analysis
    // ...
  },
});

// New: Soft delete (mark as deleted, preserve data)
export const softDeleteUser = mutation({
  args: {
    email: v.string(),
    emailConfirmation: v.string(),
    reason: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    restorable: v.boolean(),
    restorableUntil: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    // 1. Verify platform staff
    // 2. Verify email confirmation matches
    // 3. Check blockers
    // 4. Mark user as deleted (add deletedAt, deletedBy, deletionReason)
    // 5. Disable all sessions
    // 6. Remove from all organizations
    // 7. Set restoration deadline (30 days)
    // 8. Log to audit trail
    // ...
  },
});

// New: Hard delete (permanent)
export const hardDeleteUser = mutation({
  args: {
    email: v.string(),
    emailConfirmation: v.string(),
    permanentDeleteConfirmation: v.literal("DELETE PERMANENTLY"),
    reason: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    deletedRecords: v.object({
      user: v.number(),
      sessions: v.number(),
      accounts: v.number(),
      members: v.number(),
      voiceNotes: v.number(),
      skillAssessments: v.number(),
      guardianIdentities: v.number(),
      guardianPlayerLinks: v.number(),
      playerIdentities: v.number(),
      total: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    // 1. Verify platform staff
    // 2. Verify all confirmations
    // 3. Delete in order (cascade):
    //    - Sessions
    //    - Accounts
    //    - Members (from all orgs)
    //    - Voice notes
    //    - Skill assessments
    //    - Guardian identities and links
    //    - Player identities
    //    - User record
    // 4. Log to audit trail
    // ...
  },
});

// New: Restore soft-deleted user
export const restoreDeletedUser = mutation({
  args: {
    email: v.string(),
    reason: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // 1. Verify platform staff
    // 2. Check if user is soft-deleted
    // 3. Check if restoration window is still open
    // 4. Restore user (remove deletedAt, deletedBy, deletionReason)
    // 5. Re-enable user
    // 6. Log to audit trail
    // ...
  },
});
```

**File**: `packages/backend/convex/models/members.ts`

**Enhance Existing:**

```typescript
// Already exists, enhance to show more detail
export const getRemovalPreview = query({
  // ... enhance to show MORE detail
  // Add:
  // - When user joined org
  // - User's contributions (voice notes, assessments)
  // - Impact on teams if coach is removed
  // - Impact on players if parent is removed
});

// Already exists, but ensure it's comprehensive
export const removeFromOrganization = mutation({
  // Ensure all related data is cleaned up:
  // - Member record
  // - Coach assignments
  // - Team memberships
  // - Voice notes
  // - Skill assessments
  // - Guardian-player links (if this is the only org)
  // - Pending invitations sent by this user
});
```

#### 2.2 Frontend Components

**New File**: `apps/web/src/app/platform-admin/users/delete-user-dialog.tsx`

```typescript
interface DeleteUserDialogProps {
  user: {
    email: string;
    name: string;
    _id: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteUserDialog({ user, onClose, onSuccess }: DeleteUserDialogProps) {
  // Phases:
  // 1. Load deletion preview
  // 2. Show comprehensive impact analysis
  // 3. Show blockers (if any)
  // 4. Choose deletion type (soft vs hard)
  // 5. Confirmation dialog with email typing
  // 6. Execute deletion
  // 7. Show success/error

  const [phase, setPhase] = useState<'loading' | 'preview' | 'confirm' | 'deleting' | 'complete'>('loading');
  const [deletionType, setDeletionType] = useState<'soft' | 'hard'>('soft');
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [reason, setReason] = useState('');

  // ... implementation
}
```

**Component Structure:**
```tsx
<Dialog>
  {/* Phase 1: Loading */}
  <DialogContent>
    <Loader /> Analyzing user data...
  </DialogContent>

  {/* Phase 2: Impact Preview */}
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>Delete User Account</DialogTitle>
      <DialogDescription>
        Review the impact of deleting this user account
      </DialogDescription>
    </DialogHeader>

    {/* User Info Card */}
    <Card>
      <Avatar, Name, Email, Created Date, Last Active />
    </Card>

    {/* Blockers (if any) */}
    {blockers.length > 0 && (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Cannot Delete User</AlertTitle>
        <AlertDescription>
          {blockers.map(blocker => <li>{blocker.message}</li>)}
        </AlertDescription>
      </Alert>
    )}

    {/* Organization Memberships */}
    <Card>
      <CardHeader>
        <CardTitle>Organizations ({memberships.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {memberships.map(org => (
          <div>
            <OrgName, Role, Functional Roles, Member Since />
            {org.isOnlyOwner && <Badge variant="destructive">Only Owner</Badge>}
          </div>
        ))}
      </CardContent>
    </Card>

    {/* Data Impact */}
    <Card>
      <CardHeader>
        <CardTitle>Data to be Deleted</CardTitle>
        <CardDescription>
          Total: {dataImpact.totalRecords} records (~{dataImpact.estimatedSize})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableRow>
            <TableCell>Voice Notes</TableCell>
            <TableCell>{dataImpact.voiceNotes}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Skill Assessments</TableCell>
            <TableCell>{dataImpact.skillAssessments}</TableCell>
          </TableRow>
          {/* ... all data types ... */}
        </Table>
      </CardContent>
    </Card>

    {/* Deletion Type Selection */}
    <Card>
      <CardHeader>
        <CardTitle>Deletion Type</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={deletionType} onValueChange={setDeletionType}>
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="soft" />
            <div>
              <Label>Soft Delete (Recommended)</Label>
              <p className="text-sm text-muted-foreground">
                Mark user as deleted and hide from UI. Data preserved for 30 days and can be restored.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="hard" />
            <div>
              <Label>Hard Delete (Permanent)</Label>
              <p className="text-sm text-muted-foreground">
                Permanently delete all user data. Cannot be undone or restored.
              </p>
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>

    {/* Warnings */}
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>
        <ul>
          <li>User will be removed from all organizations</li>
          <li>All data will be {deletionType === 'soft' ? 'hidden' : 'permanently deleted'}</li>
          {deletionType === 'soft' && <li>Can be restored within 30 days</li>}
          {deletionType === 'hard' && <li>THIS CANNOT BE UNDONE</li>}
        </ul>
      </AlertDescription>
    </Alert>

    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button variant="destructive" onClick={() => setPhase('confirm')}>
        Proceed to Confirmation
      </Button>
    </DialogFooter>
  </DialogContent>

  {/* Phase 3: Confirmation */}
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Deletion</DialogTitle>
      <DialogDescription>
        This action requires additional confirmation
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      <div>
        <Label>Type the user's email to confirm:</Label>
        <Input
          value={emailConfirmation}
          onChange={(e) => setEmailConfirmation(e.target.value)}
          placeholder={user.email}
        />
        {emailConfirmation !== user.email && (
          <p className="text-sm text-destructive">Email doesn't match</p>
        )}
      </div>

      {deletionType === 'hard' && (
        <div>
          <Label>Type "DELETE PERMANENTLY" to confirm:</Label>
          <Input
            value={permanentConfirmation}
            onChange={(e) => setPermanentConfirmation(e.target.value)}
            placeholder="DELETE PERMANENTLY"
          />
        </div>
      )}

      <div>
        <Label>Reason for deletion:</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for audit log..."
          required
        />
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setPhase('preview')}>Back</Button>
      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={
          emailConfirmation !== user.email ||
          (deletionType === 'hard' && permanentConfirmation !== 'DELETE PERMANENTLY') ||
          !reason
        }
      >
        {deletionType === 'soft' ? 'Soft Delete User' : 'Permanently Delete User'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 2.3 Access Control

**Platform Staff Only:**
- User deletion available ONLY to platform staff (isPlatformStaff flag)
- New route: `/platform-admin/users/manage`
- Separate from org admin panel
- Comprehensive audit logging

---

## Feature 3: User Suspension/Disable

### Requirements

**Two Types of Suspension:**

1. **Org-Level Suspension** (Admin/Owner can perform):
   - User is suspended from ONE organization only
   - Keeps access to other organizations
   - Can be restored by org admin
   - User receives email notification
   - Temporary or permanent suspension

2. **Account-Level Suspension** (Platform Staff only):
   - User suspended from ALL organizations
   - Cannot login to platform
   - Can be restored by platform staff
   - User receives email notification
   - Usually temporary (e.g., Terms of Service violation)

**Suspension Features:**
- Reason required
- Optional expiry date (auto-restore after date)
- Notification to user
- Audit trail
- Can be lifted by admin/staff

### Implementation Plan

#### 3.1 Database Schema Updates

**File**: `packages/backend/convex/betterAuth/schema.ts`

```typescript
// Add to user table schema:
const userSchema = table({
  // ... existing fields

  // Account-level suspension
  suspended: v.optional(v.boolean()),
  suspendedAt: v.optional(v.number()),
  suspendedBy: v.optional(v.id("users")),
  suspensionReason: v.optional(v.string()),
  suspensionExpiresAt: v.optional(v.number()),
  suspensionType: v.optional(v.union(v.literal("temporary"), v.literal("permanent"))),
});

// Add to member table schema:
const memberSchema = table({
  // ... existing fields

  // Org-level suspension
  suspendedInOrg: v.optional(v.boolean()),
  orgSuspendedAt: v.optional(v.number()),
  orgSuspendedBy: v.optional(v.id("users")),
  orgSuspensionReason: v.optional(v.string()),
  orgSuspensionExpiresAt: v.optional(v.number()),
  orgSuspensionType: v.optional(v.union(v.literal("temporary"), v.literal("permanent"))),
});
```

#### 3.2 Backend Functions

**File**: `packages/backend/convex/models/members.ts`

```typescript
/**
 * Suspend user from organization (org-scoped)
 */
export const suspendMemberFromOrg = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    reason: v.string(),
    suspensionType: v.union(v.literal("temporary"), v.literal("permanent")),
    expiresAt: v.optional(v.number()), // Required for temporary suspensions
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // 1. Permission check: must be owner or admin
    // 2. Cannot suspend owner
    // 3. If temporary, expiresAt is required
    // 4. Update member record with suspension fields
    // 5. Terminate all active sessions for this org
    // 6. Send notification email to user
    // 7. Log to audit trail
    // ...
  },
});

/**
 * Restore suspended member in organization
 */
export const restoreMemberInOrg = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    reason: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // 1. Permission check
    // 2. Update member record (clear suspension fields)
    // 3. Send notification email
    // 4. Log to audit trail
    // ...
  },
});

/**
 * Get suspended members in organization
 */
export const getSuspendedMembers = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.object({
    userId: v.string(),
    userName: v.union(v.string(), v.null()),
    userEmail: v.string(),
    suspendedAt: v.number(),
    suspendedBy: v.string(),
    suspensionReason: v.string(),
    suspensionType: v.string(),
    expiresAt: v.union(v.number(), v.null()),
    daysRemaining: v.union(v.number(), v.null()),
  })),
  handler: async (ctx, args) => {
    // Query members where suspendedInOrg = true
    // ...
  },
});
```

**File**: `packages/backend/convex/models/users.ts`

```typescript
/**
 * Suspend user account (platform-wide)
 * Platform staff only
 */
export const suspendUserAccount = mutation({
  args: {
    email: v.string(),
    reason: v.string(),
    suspensionType: v.union(v.literal("temporary"), v.literal("permanent")),
    expiresAt: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // 1. Verify platform staff
    // 2. Find user
    // 3. Update user with suspension fields
    // 4. Terminate all sessions
    // 5. Send notification email
    // 6. Log to audit trail
    // ...
  },
});

/**
 * Restore suspended user account
 * Platform staff only
 */
export const restoreUserAccount = mutation({
  args: {
    email: v.string(),
    reason: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // 1. Verify platform staff
    // 2. Update user (clear suspension fields)
    // 3. Send notification email
    // 4. Log to audit trail
    // ...
  },
});

/**
 * Check if user is suspended (used in auth middleware)
 */
export const checkUserSuspension = query({
  args: {
    userId: v.string(),
    organizationId: v.optional(v.string()),
  },
  returns: v.object({
    isSuspended: v.boolean(),
    suspensionLevel: v.optional(v.union(v.literal("account"), v.literal("organization"))),
    reason: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    // 1. Check account-level suspension
    // 2. If organizationId provided, check org-level suspension
    // 3. Return suspension status
    // ...
  },
});
```

#### 3.3 Frontend Components

**New File**: `apps/web/src/app/orgs/[orgId]/admin/users/suspend-member-dialog.tsx`

```tsx
interface SuspendMemberDialogProps {
  member: {
    userId: string;
    name: string;
    email: string;
  };
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function SuspendMemberDialog({
  member,
  organizationId,
  onClose,
  onSuccess,
}: SuspendMemberDialogProps) {
  const [suspensionType, setSuspensionType] = useState<'temporary' | 'permanent'>('temporary');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend Member from Organization</DialogTitle>
          <DialogDescription>
            Temporarily or permanently suspend {member.name} from this organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Member Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suspension Type */}
          <div className="space-y-2">
            <Label>Suspension Type</Label>
            <RadioGroup value={suspensionType} onValueChange={setSuspensionType}>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="temporary" />
                <div>
                  <Label>Temporary Suspension</Label>
                  <p className="text-sm text-muted-foreground">
                    Suspend for a specific period. Auto-restores after expiry.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="permanent" />
                <div>
                  <Label>Permanent Suspension</Label>
                  <p className="text-sm text-muted-foreground">
                    Suspend indefinitely. Must be manually restored.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Expiry Date (for temporary) */}
          {suspensionType === 'temporary' && (
            <div className="space-y-2">
              <Label>Expires On</Label>
              <DatePicker
                value={expiresAt}
                onChange={setExpiresAt}
                minDate={new Date()}
              />
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for Suspension</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason (will be shown to user)..."
              required
            />
          </div>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Effects of Suspension</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside">
                <li>User will lose access to this organization</li>
                <li>User can still access other organizations</li>
                <li>User will receive an email notification</li>
                <li>All active sessions for this org will be terminated</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleSuspend}
            disabled={!reason || (suspensionType === 'temporary' && !expiresAt)}
          >
            Suspend Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Update**: `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`

```tsx
// Add suspended members section
{suspendedMembers && suspendedMembers.length > 0 && (
  <Card className="border-orange-200">
    <CardHeader>
      <CardTitle>Suspended Members ({suspendedMembers.length})</CardTitle>
      <CardDescription>
        Members currently suspended from this organization
      </CardDescription>
    </CardHeader>
    <CardContent>
      {suspendedMembers.map(member => (
        <div key={member.userId} className="flex items-center justify-between p-3 border rounded">
          <div>
            <p className="font-medium">{member.userName}</p>
            <p className="text-sm text-muted-foreground">{member.userEmail}</p>
            <p className="text-xs text-muted-foreground">
              Suspended: {new Date(member.suspendedAt).toLocaleDateString()}
            </p>
            {member.expiresAt && (
              <Badge variant="outline">
                Expires in {member.daysRemaining} days
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => showSuspensionDetails(member)}
            >
              View Details
            </Button>
            <Button
              size="sm"
              onClick={() => handleRestore(member.userId)}
            >
              Restore Access
            </Button>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
)}

// Add suspend button to each member card
<Button
  size="sm"
  variant="ghost"
  onClick={() => setSuspendingMember(member)}
>
  <Ban className="h-4 w-4" />
  Suspend
</Button>
```

#### 3.4 Email Notifications

**File**: `packages/backend/convex/utils/email.ts`

```typescript
export async function sendSuspensionNotification({
  email,
  userName,
  organizationName,
  suspensionType,
  reason,
  expiresAt,
  level, // 'account' | 'organization'
}: {
  email: string;
  userName: string;
  organizationName?: string;
  suspensionType: 'temporary' | 'permanent';
  reason: string;
  expiresAt?: number;
  level: 'account' | 'organization';
}) {
  const isAccountLevel = level === 'account';
  const isTemporary = suspensionType === 'temporary';

  const subject = isAccountLevel
    ? 'Your PDP Account Has Been Suspended'
    : `Access to ${organizationName} Has Been Suspended`;

  const expiryText = isTemporary && expiresAt
    ? `This suspension will automatically expire on ${new Date(expiresAt).toLocaleDateString()}.`
    : 'This is a permanent suspension and requires manual restoration.';

  const accessText = isAccountLevel
    ? 'You no longer have access to any organizations on PDP.'
    : `You no longer have access to ${organizationName}, but can still access other organizations.`;

  const htmlContent = `
    <h2>Account Suspension Notice</h2>
    <p>Hello ${userName},</p>
    <p>${accessText}</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p>${expiryText}</p>
    ${!isTemporary ? '<p>To appeal this suspension, please contact support.</p>' : ''}
  `;

  // Send email...
}

export async function sendRestorationNotification({
  email,
  userName,
  organizationName,
  level,
}: {
  email: string;
  userName: string;
  organizationName?: string;
  level: 'account' | 'organization';
}) {
  // Send restoration email...
}
```

#### 3.5 Auth Middleware

**File**: `apps/web/src/middleware.ts` (or auth provider)

```typescript
// Check suspension status before allowing access
async function checkSuspension(userId: string, organizationId?: string) {
  const suspensionStatus = await api.models.users.checkUserSuspension({
    userId,
    organizationId,
  });

  if (suspensionStatus.isSuspended) {
    if (suspensionStatus.suspensionLevel === 'account') {
      // Redirect to account suspended page
      return redirect('/suspended');
    } else if (suspensionStatus.suspensionLevel === 'organization') {
      // Redirect to org suspended page
      return redirect('/orgs/suspended');
    }
  }

  return null; // No suspension, continue
}
```

---

## Implementation Timeline

### Phase 1: Invitation Management Enhancements (3-4 days)
1. Backend: Enhance getPendingInvitationsWithAssignments
2. Backend: Add getInvitationStats
3. Frontend: Improve invitation cards with timeline
4. Frontend: Enhance detail modal
5. Frontend: Add filters and sorting
6. Testing: End-to-end invitation flow

### Phase 2: User Deletion (4-5 days)
1. Backend: Enhance getUserDeletionPreview
2. Backend: Implement softDeleteUser
3. Backend: Implement hardDeleteUser
4. Backend: Implement restoreDeletedUser
5. Frontend: Create delete user dialog with phases
6. Frontend: Platform admin route
7. Testing: Deletion and restoration flows

### Phase 3: User Suspension (4-5 days)
1. Backend: Schema updates for suspension fields
2. Backend: Org-level suspension functions
3. Backend: Account-level suspension functions (platform staff)
4. Backend: Auto-expiry check (scheduled job)
5. Frontend: Suspend member dialog
6. Frontend: Suspended members list
7. Frontend: Account suspended page
8. Email: Suspension and restoration notifications
9. Middleware: Suspension checking
10. Testing: Suspension and restoration flows

### Phase 4: Testing & Documentation (2-3 days)
1. End-to-end testing of all features
2. Edge case testing
3. Performance testing
4. Documentation updates
5. User guide creation

**Total Estimate**: 13-17 days

---

## Testing Checklist

### Invitation Management
- [ ] Send invitation with all role types
- [ ] View invitation details
- [ ] Resend invitation (check history)
- [ ] Cancel invitation
- [ ] Filter invitations by status
- [ ] Filter invitations by role
- [ ] Sort invitations by date
- [ ] Verify expired invitations shown correctly
- [ ] Copy invitation link

### User Deletion
- [ ] View deletion preview for regular user
- [ ] View deletion preview for org owner
- [ ] Attempt to delete only org owner (should be blocked)
- [ ] Soft delete user
- [ ] Verify user hidden from UI after soft delete
- [ ] Restore soft-deleted user
- [ ] Hard delete user (platform staff only)
- [ ] Verify all data deleted after hard delete
- [ ] Verify audit log entries

### User Suspension
#### Org-Level Suspension
- [ ] Suspend member temporarily (org admin)
- [ ] Suspend member permanently (org admin)
- [ ] Attempt to suspend owner (should be blocked)
- [ ] Verify suspended member cannot access org
- [ ] Verify suspended member can access other orgs
- [ ] View suspended members list
- [ ] Restore suspended member
- [ ] Verify auto-expiry for temporary suspensions
- [ ] Verify suspension email sent
- [ ] Verify restoration email sent

#### Account-Level Suspension
- [ ] Suspend user account (platform staff)
- [ ] Verify user cannot login
- [ ] Verify all sessions terminated
- [ ] Restore suspended account
- [ ] Verify account-level suspension email sent

---

## Security Considerations

1. **Access Control:**
   - Only platform staff can delete users
   - Only org owners/admins can suspend members
   - Only platform staff can suspend accounts
   - Audit all destructive actions

2. **Data Protection:**
   - Soft delete as default
   - 30-day retention for soft deletes
   - Comprehensive warnings before deletion
   - Email confirmation required

3. **Audit Logging:**
   - Log all deletion attempts
   - Log all suspension/restoration actions
   - Include admin who performed action
   - Include reason for action
   - Timestamp all events

4. **User Notifications:**
   - Email on suspension
   - Email on restoration
   - Email on deletion
   - Clear explanation in emails

---

## Success Metrics

1. **Invitation Management:**
   - Invitation acceptance rate improves
   - Fewer expired invitations
   - Faster admin response to pending invitations

2. **User Deletion:**
   - Zero accidental deletions
   - All deletions properly logged
   - Soft delete used 90%+ of the time

3. **User Suspension:**
   - Clear communication to suspended users
   - Proper restoration process
   - Audit trail compliance

---

## Future Enhancements

1. **Bulk Operations:**
   - Bulk invite
   - Bulk suspend
   - Bulk restore

2. **Advanced Analytics:**
   - Invitation acceptance metrics
   - Average time to accept
   - Suspension trends

3. **Self-Service:**
   - User can appeal suspension
   - User can request account deletion
   - User can download their data before deletion

4. **Automation:**
   - Auto-suspend inactive users
   - Auto-delete soft-deleted accounts after 30 days
   - Auto-restore temporary suspensions

---

## Notes

- This plan is comprehensive and production-ready
- All features have proper error handling
- All destructive actions require confirmation
- All actions are audited
- User experience is prioritized (clear communication)
- Platform staff have ultimate control
- Org admins have org-scoped control
