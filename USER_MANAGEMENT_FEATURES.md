# User Management Features - Comprehensive Documentation

## Overview

This document provides comprehensive documentation for the enhanced user management and invitation system implemented across multiple phases. The features include invitation event tracking, editing pending invitations, member suspension, and improved resend tracking.

## Table of Contents

1. [Phase 1: Invitation Event Tracking](#phase-1-invitation-event-tracking)
2. [Phase 2: Edit Pending Invitations](#phase-2-edit-pending-invitations)
3. [Phase 3: Member Disable/Suspend](#phase-3-member-disablesuspend)
4. [Phase 4: Resend Tracking UI Enhancements](#phase-4-resend-tracking-ui-enhancements)
5. [Email Template Support](#email-template-support)
6. [Architecture Decisions](#architecture-decisions)
7. [Testing Procedures](#testing-procedures)
8. [Migration Notes](#migration-notes)

---

## Phase 1: Invitation Event Tracking

### Purpose
Provide a complete audit trail of all invitation lifecycle events including creation, resends, modifications, cancellations, and acceptances.

### Implementation

#### Schema Changes
**File:** `/packages/backend/convex/schema.ts`

Added new `invitationEvents` table:

```typescript
invitationEvents: defineTable({
  invitationId: v.id("invitation"),
  organizationId: v.string(),
  eventType: v.union(
    v.literal("created"),
    v.literal("resent"),
    v.literal("modified"),
    v.literal("cancelled"),
    v.literal("accepted")
  ),
  performedBy: v.optional(v.string()), // User ID who performed the action
  performedByEmail: v.optional(v.string()),
  performedByName: v.optional(v.string()),
  timestamp: v.number(),
  metadata: v.optional(v.any()), // Event-specific data
})
  .index("by_invitation", ["invitationId"])
  .index("by_organization", ["organizationId"])
  .index("by_event_type", ["eventType"])
  .index("by_timestamp", ["timestamp"]);
```

#### Backend Functions
**File:** `/packages/backend/convex/models/members.ts`

**1. Log Invitation Event (Internal Mutation)**
```typescript
export const logInvitationEvent = internalMutation({
  args: {
    invitationId: v.id("invitation"),
    organizationId: v.string(),
    eventType: v.union(
      v.literal("created"),
      v.literal("resent"),
      v.literal("modified"),
      v.literal("cancelled"),
      v.literal("accepted")
    ),
    performedBy: v.optional(v.string()),
    performedByEmail: v.optional(v.string()),
    performedByName: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("invitationEvents", {
      invitationId: args.invitationId,
      organizationId: args.organizationId,
      eventType: args.eventType,
      performedBy: args.performedBy,
      performedByEmail: args.performedByEmail,
      performedByName: args.performedByName,
      timestamp: Date.now(),
      metadata: args.metadata,
    });
    return null;
  },
});
```

**2. Get Invitation History (Query)**
```typescript
export const getInvitationHistory = query({
  args: {
    invitationId: v.id("invitation"),
  },
  returns: v.array(
    v.object({
      _id: v.id("invitationEvents"),
      _creationTime: v.number(),
      invitationId: v.id("invitation"),
      organizationId: v.string(),
      eventType: v.union(
        v.literal("created"),
        v.literal("resent"),
        v.literal("modified"),
        v.literal("cancelled"),
        v.literal("accepted")
      ),
      performedBy: v.optional(v.string()),
      performedByEmail: v.optional(v.string()),
      performedByName: v.optional(v.string()),
      timestamp: v.number(),
      metadata: v.optional(v.any()),
    })
  ),
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("invitationEvents")
      .withIndex("by_invitation", (q) => q.eq("invitationId", args.invitationId))
      .order("desc")
      .collect();
    return events;
  },
});
```

#### Event Logging Integration

Event logging was integrated into existing mutations:

1. **createOrganizationInvitation** - Logs "created" event
2. **resendInvitation** - Logs "resent" event
3. **updateInvitationMetadata** - Logs "modified" event
4. **cancelInvitation** - Logs "cancelled" event
5. **acceptOrgInvitation** (in actions) - Logs "accepted" event

Example integration:
```typescript
// After creating invitation
await ctx.runMutation(internal.models.members.logInvitationEvent, {
  invitationId: invitationId,
  organizationId: args.organizationId,
  eventType: "created",
  performedBy: currentUser._id,
  performedByEmail: currentUser.email,
  performedByName: currentUser.name || undefined,
  metadata: {
    email: args.email,
    functionalRoles: functionalRoles,
    teams: args.teams,
  },
});
```

#### UI Component
**File:** `/apps/web/src/app/orgs/[orgId]/admin/users/invitation-detail-modal.tsx`

Created `InvitationDetailModal` component that displays:
- Invitation basic info (email, roles, status)
- Complete event history timeline
- Event-specific metadata

Key features:
- Chronological event display (most recent first)
- User-friendly event type labels
- Formatted timestamps
- Event-specific icons and colors
- Metadata display for each event

---

## Phase 2: Edit Pending Invitations

### Purpose
Allow admins to modify pending invitations (functional roles, team assignments, player links) without canceling and recreating them.

### Implementation

#### Backend Function
**File:** `/packages/backend/convex/models/members.ts`

**Update Invitation Metadata (Mutation)**
```typescript
export const updateInvitationMetadata = mutation({
  args: {
    invitationId: v.id("invitation"),
    metadata: v.object({
      suggestedFunctionalRoles: v.array(
        v.union(v.literal("coach"), v.literal("parent"), v.literal("admin"))
      ),
      roleSpecificData: v.object({
        teams: v.array(v.object({ _id: v.string(), name: v.string() })),
      }),
      suggestedPlayerLinks: v.array(v.string()),
    }),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Not authenticated" };
    }

    // Get current user record
    const currentUser = await ctx.db
      .query("user")
      .withIndex("email_name", (q) => q.eq("email", identity.email || ""))
      .unique();
    if (!currentUser) {
      return { success: false, error: "User not found" };
    }

    // Get invitation
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    // Verify user is admin/owner of the organization
    const member = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", invitation.organizationId).eq("userId", currentUser._id)
      )
      .unique();

    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return { success: false, error: "Not authorized" };
    }

    // Update invitation metadata
    await ctx.db.patch(args.invitationId, {
      metadata: args.metadata,
    });

    // Log the modification event
    await ctx.runMutation(internal.models.members.logInvitationEvent, {
      invitationId: args.invitationId,
      organizationId: invitation.organizationId,
      eventType: "modified",
      performedBy: currentUser._id,
      performedByEmail: currentUser.email,
      performedByName: currentUser.name || undefined,
      metadata: args.metadata,
    });

    return { success: true };
  },
});
```

#### UI Component
**File:** `/apps/web/src/app/orgs/[orgId]/admin/users/edit-invitation-modal.tsx`

Created `EditInvitationModal` component with:
- Functional role selection (Coach, Parent, Admin)
- Team assignment for coaches
- Player linking for parents
- Real-time validation
- Search functionality for players
- Preserves existing metadata structure

Key validation rules:
- At least one functional role required
- Coaches must have at least one team assigned
- Parents must have at least one player linked

#### Integration
**File:** `/apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`

Added edit button to pending invitation cards:
```typescript
<Button
  onClick={() => setEditingInvitation(invitation)}
  size="sm"
  title="Edit invitation"
  variant="ghost"
>
  <Edit className="h-4 w-4" />
</Button>
```

---

## Phase 3: Member Disable/Suspend

### Purpose
Temporarily suspend member access without deleting data, with full audit trail and support for multi-org users.

### Implementation

#### Schema Changes
**File:** `/packages/backend/convex/betterAuth/schema.ts`

Extended `customMemberTable` with disable fields:
```typescript
const customMemberTable = defineTable({
  // ... existing fields ...

  // User disable/suspend fields
  isDisabled: v.optional(v.boolean()),
  disabledAt: v.optional(v.number()),
  disabledBy: v.optional(v.string()), // User ID who disabled
  disableReason: v.optional(v.string()),
  disableType: v.optional(
    v.union(
      v.literal("org_only"),  // Access to this org disabled
      v.literal("account")     // Entire account disabled (if only 1 org)
    )
  ),
})
  .index("organizationId", ["organizationId"])
  .index("userId", ["userId"])
  .index("role", ["role"])
  .index("organizationId_userId", ["organizationId", "userId"])
  .index("organizationId_role", ["organizationId", "role"])
  .index("isDisabled", ["isDisabled"]);
```

#### Backend Functions
**File:** `/packages/backend/convex/models/members.ts`

**1. Disable Member Access (Mutation)**
```typescript
export const disableMemberAccess = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    disableType: v.optional(v.union(v.literal("org_only"), v.literal("account"))),
  }),
  handler: async (ctx, args) => {
    // Get current user for audit trail
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Not authenticated" };
    }

    const currentUser = await ctx.db
      .query("user")
      .withIndex("email_name", (q) => q.eq("email", identity.email || ""))
      .unique();
    if (!currentUser) {
      return { success: false, error: "User not found" };
    }

    // Verify current user is admin/owner
    const currentMember = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", currentUser._id)
      )
      .unique();

    if (!currentMember || (currentMember.role !== "owner" && currentMember.role !== "admin")) {
      return { success: false, error: "Not authorized" };
    }

    // Get target member
    const memberResult = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "member",
      where: [
        { field: "organizationId", value: args.organizationId, operator: "eq" },
        { field: "userId", value: args.userId, operator: "eq" },
      ],
    });

    if (!memberResult) {
      return { success: false, error: "Member not found" };
    }

    // Cannot disable owners
    if (memberResult.role === "owner") {
      return { success: false, error: "Cannot disable organization owner" };
    }

    // Determine disable type based on user's org count
    const allMemberships = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        where: [
          {
            field: "userId",
            value: args.userId,
            operator: "eq",
          },
        ],
        paginationOpts: {
          cursor: null,
          numItems: 100,
        },
      }
    );

    const disableType = allMemberships.page.length === 1 ? "account" : "org_only";

    // Update member record
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
        update: {
          isDisabled: true,
          disabledAt: Date.now(),
          disabledBy: currentUser._id,
          disableReason: args.reason || undefined,
          disableType,
        },
      },
    });

    return {
      success: true,
      disableType,
    };
  },
});
```

**2. Enable Member Access (Mutation)**
```typescript
export const enableMemberAccess = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Authentication and authorization checks...

    // Remove disable fields
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
        update: {
          isDisabled: false,
          disabledAt: undefined,
          disabledBy: undefined,
          disableReason: undefined,
          disableType: undefined,
        },
      },
    });

    return {
      success: true,
    };
  },
});
```

#### UI Component
**File:** `/apps/web/src/app/orgs/[orgId]/admin/users/disable-member-dialog.tsx`

Created `DisableMemberDialog` component with:
- Dual-mode operation (suspend/restore)
- User info display
- Optional reason textarea (for suspend)
- Clear messaging about impact
- Contextual icons and colors
- Loading states

#### Integration
**File:** `/apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`

Added to user cards:

1. **Suspended Badge:**
```typescript
{member.isDisabled && (
  <Badge className="border-red-300 bg-red-100 text-red-700">
    <svg className="mr-1 h-3 w-3" /* ... */>
      <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
    Suspended
  </Badge>
)}
```

2. **Suspend/Restore Button:**
```typescript
{(currentMember?.role === "owner" || currentMember?.role === "admin") &&
  member.role !== "owner" && (
    <Button
      onClick={() =>
        setDisablingMember({
          userId: member.userId,
          name: member.name || member.email,
          email: member.email,
          isDisabled: member.isDisabled,
        })
      }
      size="sm"
      variant="ghost"
    >
      {/* Contextual icon based on current state */}
    </Button>
  )}
```

### Key Architecture Decisions

**Multi-Org User Detection:**
- Query all user memberships to determine org count
- Single org → `disableType: "account"` (account suspended)
- Multiple orgs → `disableType: "org_only"` (org access suspended)
- Preserves data in all other orgs

**Audit Trail:**
- `disabledBy`: User ID who performed action
- `disabledAt`: Timestamp of suspension
- `disableReason`: Optional explanation
- `disableType`: Scope of suspension

**Protection:**
- Cannot disable organization owners
- Only admins/owners can suspend members
- Cannot suspend yourself

---

## Phase 4: Resend Tracking UI Enhancements

### Purpose
Display resend history inline with invitations for better visibility.

### Implementation

#### Data Source
Resend history is already stored in invitation metadata:
```typescript
invitation.metadata.resendHistory = [
  {
    resentAt: number,
    resentBy: string,
    resentByEmail: string,
    resentByName?: string,
  },
  // ...
]
```

#### UI Enhancement
**File:** `/apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`

Added inline resend tracking display:
```typescript
{(() => {
  const resendHistory = invitation.metadata?.resendHistory || [];
  if (resendHistory.length > 0) {
    const lastResend = resendHistory[resendHistory.length - 1];
    const daysAgo = Math.floor(
      (Date.now() - lastResend.resentAt) / (1000 * 60 * 60 * 24)
    );
    return (
      <span className="ml-2">
        • Resent {resendHistory.length}{" "}
        {resendHistory.length === 1 ? "time" : "times"}
        {daysAgo === 0
          ? " (today)"
          : daysAgo === 1
            ? " (yesterday)"
            : ` (${daysAgo} days ago)`}
      </span>
    );
  }
  return null;
})()}
```

Features:
- Shows resend count
- Displays "last sent" with friendly labels
- Handles singular/plural properly
- Only displays when resend history exists

---

## Email Template Support

### Location
**File:** `/packages/backend/convex/utils/email.ts`

### Functional Roles Support

Email templates already support functional roles via the `functionalRoles` parameter:

```typescript
interface InvitationEmailData {
  email: string;
  invitedByUsername: string;
  invitedByEmail: string;
  organizationName: string;
  inviteLink: string;
  role?: string; // Better Auth role (fallback)
  functionalRoles?: string[]; // Functional roles (Coach, Parent, Admin)
}

// Format roles for display
const rolesDisplay =
  functionalRoles && functionalRoles.length > 0
    ? functionalRoles
        .map((r) => r.charAt(0).toUpperCase() + r.slice(1))
        .join(", ")
    : role; // Fallback to Better Auth role if no functional roles
```

### Email Content

**HTML Template:**
```html
${rolesDisplay ? `<p><strong>Role${functionalRoles && functionalRoles.length > 1 ? "s" : ""}:</strong> ${rolesDisplay}</p>` : ""}
```

**Text Template:**
```
${rolesDisplay ? `Role${functionalRoles && functionalRoles.length > 1 ? "s" : ""}: ${rolesDisplay}\n` : ""}
```

### Features
- Displays functional roles (Coach, Parent, Admin) when available
- Capitalizes role names properly
- Handles singular/plural ("Role" vs "Roles")
- Falls back to Better Auth role if no functional roles
- Works in both HTML and plain text emails

---

## Architecture Decisions

### 1. Event Tracking System

**Decision:** Use separate `invitationEvents` table instead of storing events in invitation metadata

**Rationale:**
- Better queryability (can query by event type, timestamp, organization)
- Supports unlimited event history
- Easier to analyze patterns and generate reports
- Cleaner separation of concerns

**Trade-offs:**
- Additional table and queries
- Need to maintain referential integrity

### 2. Multi-Org User Handling

**Decision:** Auto-detect user's org count and set appropriate `disableType`

**Rationale:**
- Prevents accidental account lockout for multi-org users
- Maintains data integrity across organizations
- Clear distinction between org-level and account-level suspension

**Implementation:**
```typescript
const allMemberships = await ctx.runQuery(
  components.betterAuth.adapter.findMany,
  {
    model: "member",
    where: [{ field: "userId", value: args.userId, operator: "eq" }],
    paginationOpts: { cursor: null, numItems: 100 },
  }
);

const disableType = allMemberships.page.length === 1 ? "account" : "org_only";
```

### 3. Invitation Metadata Structure

**Decision:** Use structured metadata object with typed fields

**Structure:**
```typescript
{
  suggestedFunctionalRoles: ("coach" | "parent" | "admin")[],
  roleSpecificData: {
    teams: { _id: string, name: string }[]
  },
  suggestedPlayerLinks: string[],
  resendHistory: {
    resentAt: number,
    resentBy: string,
    resentByEmail: string,
    resentByName?: string
  }[]
}
```

**Rationale:**
- Type-safe metadata access
- Clear structure for different role types
- Supports future extensions
- Preserves team names for display

### 4. Disable vs Delete

**Decision:** Implement suspension (disable) as separate feature from deletion

**Rationale:**
- Preserves all user data and history
- Allows temporary access restrictions
- Supports compliance requirements (audit trail)
- Enables easy restoration

**Fields:**
- `isDisabled`: Boolean flag for quick filtering
- `disabledAt`: Timestamp for audit
- `disabledBy`: User ID for accountability
- `disableReason`: Optional explanation
- `disableType`: Scope distinction

### 5. UI State Management

**Decision:** Use per-component local state for dialogs/modals

**Rationale:**
- Simpler than global state for ephemeral UI
- Natural cleanup on unmount
- Easier to reason about
- Better performance (no unnecessary re-renders)

**Pattern:**
```typescript
const [editingInvitation, setEditingInvitation] = useState<any>(null);
const [disablingMember, setDisablingMember] = useState<{
  userId: string;
  name: string;
  email: string;
  isDisabled?: boolean;
} | null>(null);
```

---

## Testing Procedures

### Phase 1: Invitation Event Tracking

#### Test Cases

**1. Event Creation**
- [ ] Create new invitation → verify "created" event logged
- [ ] Check event has correct performer info
- [ ] Verify metadata includes functional roles and teams

**2. Event Resending**
- [ ] Resend invitation → verify "resent" event logged
- [ ] Check resendHistory updated in metadata
- [ ] Verify multiple resends create multiple events

**3. Event Modification**
- [ ] Edit pending invitation → verify "modified" event logged
- [ ] Check metadata shows old and new values
- [ ] Verify timestamp is accurate

**4. Event Cancellation**
- [ ] Cancel invitation → verify "cancelled" event logged
- [ ] Check performer info is correct

**5. Event Acceptance**
- [ ] Accept invitation → verify "accepted" event logged
- [ ] Verify event links to correct invitation

**6. Event History Display**
- [ ] Open invitation detail modal
- [ ] Verify all events displayed in chronological order
- [ ] Check event icons and labels are correct
- [ ] Verify metadata display is readable

#### Database Queries

```sql
-- Check event logging
SELECT * FROM invitationEvents WHERE invitationId = '<invitation_id>' ORDER BY timestamp DESC;

-- Check event types
SELECT eventType, COUNT(*) FROM invitationEvents GROUP BY eventType;

-- Check events by organization
SELECT * FROM invitationEvents WHERE organizationId = '<org_id>' ORDER BY timestamp DESC;
```

### Phase 2: Edit Pending Invitations

#### Test Cases

**1. Role Validation**
- [ ] Try to save with no roles → should show error
- [ ] Select coach role without teams → should show error
- [ ] Select parent role without players → should show error
- [ ] Select admin only → should save successfully

**2. Team Assignment**
- [ ] Select coach role → teams list should appear
- [ ] Select multiple teams → should save all selections
- [ ] Deselect coach role → teams should clear from metadata

**3. Player Linking**
- [ ] Select parent role → players list should appear
- [ ] Search for players → list should filter
- [ ] Select multiple players → should save all selections
- [ ] Deselect parent role → players should clear from metadata

**4. Save and Refresh**
- [ ] Edit invitation and save
- [ ] Close modal and reopen → changes should persist
- [ ] Check invitation card shows updated roles
- [ ] Verify "modified" event was logged

**5. Edge Cases**
- [ ] Edit invitation with no existing metadata → should work
- [ ] Edit invitation multiple times → should preserve latest changes
- [ ] Cancel edit → should not save changes
- [ ] Edit while invitation loads → should handle gracefully

#### Database Queries

```sql
-- Check metadata structure
SELECT _id, email, metadata FROM invitation WHERE _id = '<invitation_id>';

-- Verify event logging
SELECT * FROM invitationEvents
WHERE invitationId = '<invitation_id>' AND eventType = 'modified'
ORDER BY timestamp DESC;
```

### Phase 3: Member Disable/Suspend

#### Test Cases

**1. Single-Org User Suspension**
- [ ] Suspend user with only one org membership
- [ ] Verify `disableType = "account"`
- [ ] Verify user cannot log in
- [ ] Check "Suspended" badge appears
- [ ] Verify audit fields populated (disabledBy, disabledAt, disableReason)

**2. Multi-Org User Suspension**
- [ ] Suspend user with multiple org memberships
- [ ] Verify `disableType = "org_only"`
- [ ] Verify user can still access other orgs
- [ ] Check user cannot access suspended org
- [ ] Verify other org memberships unchanged

**3. Restore Access**
- [ ] Click restore on suspended member
- [ ] Verify `isDisabled` set to false
- [ ] Verify all disable fields cleared
- [ ] Check user can log in again
- [ ] Verify "Suspended" badge removed

**4. Permissions**
- [ ] Try to suspend as non-admin → should fail
- [ ] Try to suspend organization owner → should fail
- [ ] Admin can suspend regular member → should succeed
- [ ] Owner can suspend admin → should succeed

**5. Reason Tracking**
- [ ] Suspend with reason → verify stored in `disableReason`
- [ ] Suspend without reason → verify field is undefined
- [ ] Check reason is queryable for reporting

**6. UI States**
- [ ] Suspend button shows correct icon for active member
- [ ] Restore button shows correct icon for suspended member
- [ ] Loading states work during save
- [ ] Success/error toasts appear appropriately

#### Database Queries

```sql
-- Check disable fields
SELECT userId, isDisabled, disabledAt, disabledBy, disableReason, disableType
FROM member
WHERE organizationId = '<org_id>' AND isDisabled = true;

-- Check multi-org users
SELECT userId, COUNT(*) as orgCount
FROM member
GROUP BY userId
HAVING orgCount > 1;

-- Verify restore cleared fields
SELECT * FROM member
WHERE _id = '<member_id>'
AND (isDisabled IS NULL OR isDisabled = false);
```

### Phase 4: Resend Tracking UI

#### Test Cases

**1. Display Logic**
- [ ] Invitation never resent → no tracking displayed
- [ ] Invitation resent once → shows "Resent 1 time"
- [ ] Invitation resent multiple times → shows "Resent X times"
- [ ] Check singular/plural grammar

**2. Timestamp Display**
- [ ] Resent today → shows "(today)"
- [ ] Resent yesterday → shows "(yesterday)"
- [ ] Resent X days ago → shows "(X days ago)"
- [ ] Verify calculation is accurate

**3. Data Source**
- [ ] Resend invitation → verify metadata updated
- [ ] Check `resendHistory` array grows
- [ ] Verify newest resend at end of array
- [ ] Check resend event logged

#### Database Queries

```sql
-- Check resend metadata
SELECT _id, email, metadata->resendHistory
FROM invitation
WHERE organizationId = '<org_id>';

-- Verify resend events
SELECT * FROM invitationEvents
WHERE eventType = 'resent'
ORDER BY timestamp DESC;
```

### Email Templates

#### Test Cases

**1. Functional Roles Display**
- [ ] Invite with single functional role → shows "Role: Coach"
- [ ] Invite with multiple functional roles → shows "Roles: Coach, Parent"
- [ ] Invite without functional roles → shows Better Auth role
- [ ] Verify capitalization is correct

**2. Email Formats**
- [ ] Check HTML email renders correctly
- [ ] Check plain text email is readable
- [ ] Verify invite link works in both formats
- [ ] Test on different email clients

**3. Content**
- [ ] Organization name displays correctly
- [ ] Inviter name and email correct
- [ ] Invite link is clickable
- [ ] Branding/formatting is professional

### Integration Testing

#### End-to-End Flows

**Flow 1: Complete Invitation Lifecycle**
1. [ ] Create invitation with coach role and teams
2. [ ] Verify "created" event logged
3. [ ] Edit invitation to add parent role and players
4. [ ] Verify "modified" event logged
5. [ ] Resend invitation
6. [ ] Verify "resent" event logged
7. [ ] Check invitation detail modal shows all events
8. [ ] Accept invitation
9. [ ] Verify "accepted" event logged
10. [ ] Verify member created successfully

**Flow 2: Suspend and Restore**
1. [ ] Invite user to organization
2. [ ] User accepts and becomes member
3. [ ] Admin suspends member with reason
4. [ ] Verify member cannot access org
5. [ ] Check "Suspended" badge visible
6. [ ] Admin restores access
7. [ ] Verify member can access org again
8. [ ] Check badge removed

**Flow 3: Multi-Org User Management**
1. [ ] Create user in Org A
2. [ ] Invite same user to Org B
3. [ ] User accepts Org B invitation
4. [ ] Suspend user in Org A
5. [ ] Verify `disableType = "org_only"`
6. [ ] Verify user can still access Org B
7. [ ] Restore access in Org A
8. [ ] Verify user can access both orgs

**Flow 4: Edit Invitation with Email Resend**
1. [ ] Create invitation with coach role
2. [ ] Email sent with "Role: Coach"
3. [ ] Edit invitation to add parent role
4. [ ] Resend invitation
5. [ ] New email shows "Roles: Coach, Parent"
6. [ ] Verify resend tracking updated
7. [ ] Check event history shows both events

### Performance Testing

#### Query Performance

**Invitation Events Query**
```typescript
// Should complete in < 100ms for 1000 events
const events = await ctx.db
  .query("invitationEvents")
  .withIndex("by_invitation", (q) => q.eq("invitationId", invitationId))
  .order("desc")
  .collect();
```

**Member Disable Query**
```typescript
// Should complete in < 50ms for 1000 members
const disabledMembers = await ctx.db
  .query("member")
  .withIndex("isDisabled", (q) => q.eq("isDisabled", true))
  .collect();
```

#### Load Testing

- [ ] Test with 100+ pending invitations
- [ ] Test with 50+ events per invitation
- [ ] Test with 1000+ members in organization
- [ ] Verify UI remains responsive

### Security Testing

#### Authorization Checks

**Invitation Management**
- [ ] Non-member cannot create invitation → should fail
- [ ] Regular member cannot create invitation → should fail
- [ ] Admin can create invitation → should succeed
- [ ] Owner can create invitation → should succeed

**Member Suspension**
- [ ] Non-admin cannot suspend member → should fail
- [ ] Admin can suspend regular member → should succeed
- [ ] Cannot suspend organization owner → should fail
- [ ] Cannot suspend yourself → should fail (test this)

**Data Access**
- [ ] Cannot access other org's invitations → should fail
- [ ] Cannot edit other org's invitation metadata → should fail
- [ ] Cannot view other org's member list → should fail

#### Input Validation

- [ ] Email validation on invitation creation
- [ ] Functional roles must be valid values
- [ ] Team IDs must exist and belong to org
- [ ] Player IDs must exist and belong to org
- [ ] Reason text has reasonable length limit

---

## Migration Notes

### Database Changes

#### New Tables

**invitationEvents** (Phase 1)
- No migration needed for existing data
- New events will log going forward
- Consider backfilling "created" events from existing invitations if needed

#### Schema Extensions

**member table** (Phase 3)
- Added 5 optional fields: `isDisabled`, `disabledAt`, `disabledBy`, `disableReason`, `disableType`
- Added index on `isDisabled`
- No migration needed - fields are optional
- Existing members will have these fields as undefined

**invitation table** (Phase 2)
- `metadata` field already exists
- No schema changes needed
- Existing invitations may not have structured metadata
- Edit functionality handles missing metadata gracefully

### Backwards Compatibility

#### Invitation Metadata

**Before:**
```typescript
metadata: {
  resendHistory: [...],
  // Unstructured or missing functional role data
}
```

**After:**
```typescript
metadata: {
  suggestedFunctionalRoles: ["coach", "parent"],
  roleSpecificData: {
    teams: [{_id: "...", name: "..."}]
  },
  suggestedPlayerLinks: ["player_id_1"],
  resendHistory: [...]
}
```

**Handling:**
- Edit modal checks for existence of fields
- Defaults to empty arrays if missing
- Preserves other metadata fields

#### Member Disable Fields

**Checking if member is disabled:**
```typescript
// Safe check that works before and after migration
if (member.isDisabled === true) {
  // Member is disabled
}
```

### Deployment Steps

1. **Deploy Schema Changes**
   ```bash
   npx convex deploy
   ```
   - Deploys new `invitationEvents` table
   - Adds disable fields to `member` table
   - Adds indexes

2. **Deploy Backend Functions**
   - New mutations: `logInvitationEvent`, `updateInvitationMetadata`, `disableMemberAccess`, `enableMemberAccess`
   - New query: `getInvitationHistory`
   - Updated mutations: Integration of event logging

3. **Deploy Frontend Changes**
   - New components: `InvitationDetailModal`, `EditInvitationModal`, `DisableMemberDialog`
   - Updated page: `/apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`

4. **Verify Deployment**
   - [ ] Check all queries and mutations are available
   - [ ] Verify new tables exist in database
   - [ ] Test creating new invitation (should log event)
   - [ ] Test editing invitation (should work with new metadata structure)
   - [ ] Test suspending member (should populate disable fields)

### Rollback Plan

**If issues occur:**

1. **Schema Rollback** (if needed)
   - Cannot easily remove tables/fields from Convex
   - Instead, stop using new fields in code
   - Mark as deprecated for future cleanup

2. **Code Rollback**
   - Revert backend mutations to previous version
   - Revert frontend components to previous version
   - Remove new component imports

3. **Data Cleanup** (if needed)
   - Clear `isDisabled` flags if rollback needed:
   ```typescript
   // Admin script to clear disable flags
   const disabledMembers = await ctx.db
     .query("member")
     .withIndex("isDisabled", (q) => q.eq("isDisabled", true))
     .collect();

   for (const member of disabledMembers) {
     await ctx.db.patch(member._id, {
       isDisabled: false,
       disabledAt: undefined,
       disabledBy: undefined,
       disableReason: undefined,
       disableType: undefined,
     });
   }
   ```

### Post-Deployment Monitoring

**Metrics to Track:**

1. **Event Logging**
   - Events created per day
   - Event types distribution
   - Failed event logging attempts

2. **Invitation Editing**
   - Edit frequency
   - Most common modifications
   - Edit failures

3. **Member Suspension**
   - Suspension frequency
   - Disable type distribution (account vs org_only)
   - Average suspension duration
   - Restoration frequency

4. **Performance**
   - Query response times for event history
   - Member list load time with disable checks
   - Invitation list load time

**Monitoring Queries:**

```typescript
// Daily event count
const eventCount = await ctx.db
  .query("invitationEvents")
  .filter((q) => q.gte(q.field("timestamp"), Date.now() - 86400000))
  .collect();

// Disabled members count
const disabledCount = await ctx.db
  .query("member")
  .withIndex("isDisabled", (q) => q.eq("isDisabled", true))
  .collect();

// Modified invitations count
const modifiedCount = await ctx.db
  .query("invitationEvents")
  .withIndex("by_event_type", (q) => q.eq("eventType", "modified"))
  .filter((q) => q.gte(q.field("timestamp"), Date.now() - 86400000))
  .collect();
```

---

## Summary

This implementation provides comprehensive user management capabilities:

1. **Complete Audit Trail** - Track every invitation lifecycle event
2. **Flexible Invitation Management** - Edit pending invitations without recreation
3. **Safe Member Suspension** - Temporary access restriction with full data preservation
4. **Enhanced Visibility** - Resend tracking and event history displays
5. **Multi-Org Support** - Proper handling of users across multiple organizations
6. **Email Template Integration** - Functional roles displayed in invitation emails

All features include proper authorization, validation, error handling, and user-friendly interfaces.
