# Parent-Guardian Linking System

## Overview

The Parent-Guardian Linking System enables parents to claim their children's accounts within the PlayerARC platform. The system enforces **explicit parent acknowledgment** for all child assignments, preventing automatic linking and ensuring parents have full control over which children they accept or decline.

## Key Principles

1. **No Automatic Linking**: Parents must explicitly acknowledge all child assignments via modal dialog
2. **Individual Child Control**: Parents can accept some children and decline others
3. **Decline Recovery**: Admins can resend declined connections, giving parents a second chance
4. **Clean Reset**: Deleting all guardian-player links resets the guardian identity completely
5. **Link-Level Tracking**: Status tracking occurs at the individual child level, not the guardian account level

## System Architecture

### Two-Table Design

The system uses two interconnected tables:

1. **`guardianIdentities`** - Person records representing parents/guardians
   - Contains personal information (name, email, phone, address)
   - `userId` field links guardian to user account (when claimed)
   - `verificationStatus` tracks email/phone verification
   - One guardian identity can link to multiple children

2. **`guardianPlayerLinks`** - Relationship records between guardians and players
   - Links a guardian identity to a specific player
   - `acknowledgedByParentAt` timestamp when parent accepted this specific child
   - `declinedByUserId` ID of user who declined this specific child
   - `consentedToSharing` whether parent consented to data sharing for this child
   - Supports partial acceptance (accept some children, decline others)

### State Tracking

#### Guardian Identity States:
- **Unclaimed**: `userId` is null/undefined - Guardian exists but no user account linked
- **Claimed**: `userId` is set - Guardian linked to user account

#### Guardian-Player Link States:
- **Pending**: Neither `acknowledgedByParentAt` nor `declinedByUserId` is set
- **Accepted**: `acknowledgedByParentAt` is set, `declinedByUserId` is null
- **Declined**: `declinedByUserId` is set

## User Flows

### Flow 1: Invitation with Pre-Linked Children

**Scenario**: Admin invites a new parent who already has children assigned in the system.

1. Admin creates guardian identity with email `parent@example.com`
2. Admin links 3 children to this guardian identity
3. Admin sends invitation to `parent@example.com` with "Parent" role
4. Parent receives invitation email and accepts
5. Parent creates account and logs in
6. **Guardian Identity Claim Dialog appears** showing 3 children
7. Parent reviews each child individually:
   - Clicks "Yes, this is mine" for 2 children (accepted)
   - Clicks "No, this is not mine" for 1 child (declined)
8. System updates:
   - Sets `userId` on guardian identity (claims account)
   - Sets `acknowledgedByParentAt` on accepted links
   - Sets `declinedByUserId` on declined link
9. Parent redirected to parent dashboard showing only 2 accepted children

**Key Behavior**: Guardian identity is created WITHOUT userId. Parent must claim via modal.

### Flow 2: Existing Parent, New Children Assigned

**Scenario**: Admin assigns new children to a parent who already has an account.

1. Parent already has account with 2 children claimed
2. Admin links 2 new children to parent's guardian identity
3. Parent logs in (next session)
4. **Guardian Identity Claim Dialog appears** showing 2 new children
5. Parent accepts both new children
6. Parent dashboard now shows all 4 children (2 original + 2 new)

**Key Behavior**: System detects pending children on claimed guardian identities.

### Flow 3: Resend After Decline

**Scenario**: Parent accidentally declines correct child, admin needs to resend.

1. Parent declines Child A (wrong child selected by mistake)
2. Admin sees Child A in "Declined" tab with parent's name
3. Admin clicks "Resend" button next to Child A
4. System clears both `declinedByUserId` AND `acknowledgedByParentAt`
5. Child A status changes from "Declined" to "Pending"
6. Parent logs in (next session)
7. **Guardian Identity Claim Dialog appears** showing Child A again
8. Parent accepts Child A this time
9. Child A appears in parent dashboard

**Key Behavior**: Resend performs full reset of link status, re-prompting parent.

### Flow 4: Delete and Re-Add Guardian Link

**Scenario**: Admin removes all children from a guardian, then re-adds them later.

1. Parent has 2 children claimed
2. Admin deletes both guardian-player links
3. **System automatically resets guardian identity**:
   - Clears `userId` (unclaims account)
   - Sets `verificationStatus` back to "unverified"
4. Later, admin re-adds same 2 children to guardian
5. Parent logs in
6. **Guardian Identity Claim Dialog appears** - Parent must acknowledge again
7. Parent re-accepts children

**Key Behavior**: Deleting last link triggers complete guardian identity reset.

## Key Features

### 1. Individual Child Acceptance/Decline

Parents can review each child individually and make separate decisions:

- **Visual Selection**: Each child has individual "Yes, this is mine" / "No, this is not mine" buttons
- **Visual Feedback**: Selected choices show with green (mine) or red (not mine) borders
- **Partial Acceptance**: Parent can accept 2 children and decline 1 in the same session
- **Validation**: Must select at least one child or click "This Isn't Me" to dismiss

### 2. Decline Tracking

When parent declines a child:
- `declinedByUserId` field set to current user's ID
- Child does NOT appear in parent dashboard
- Admin sees child in "Declined" tab with parent's name
- Admin can click "Resend" to give parent another chance

### 3. Acknowledgment Tracking

When parent accepts a child:
- `acknowledgedByParentAt` field set to current timestamp
- Child appears in parent dashboard
- Admin sees child in "Accepted" tab with "Accepted" badge
- Provides audit trail of when parent explicitly acknowledged each child

### 4. Admin Resend Capability

Admins can reset declined connections:
- "Resend" button visible next to declined children
- Clears both `declinedByUserId` AND `acknowledgedByParentAt`
- Sets child back to "Pending" state
- Parent sees claim dialog again on next login
- Full reset allows fresh acknowledgment

### 5. Guardian Identity Reset

When admin deletes guardian-player links:
- System checks if this was the last link for this guardian
- If yes, automatically resets guardian identity:
  - `userId` set to undefined (unclaimed)
  - `verificationStatus` set to "unverified"
- Prevents "remnants" that could cause auto-claiming on re-add
- Forces parent to re-acknowledge if guardian re-added later

### 6. Multi-Organization Support

System works across multiple organizations:
- Same parent email can have guardian identities in multiple organizations
- Dialog shows organization name for each child
- Parent can claim children from multiple clubs in one session
- Organization names displayed (not IDs)

## Admin UI Features

### Guardian Management Page

Located at `/orgs/[orgId]/admin/guardians`

#### Tab Structure:
- **All**: Shows all guardian-player links across all states
- **Accepted**: Shows only children where parent clicked "Yes, this is mine"
- **Pending**: Shows only children awaiting parent acknowledgment
- **Declined**: Shows only children where parent clicked "No, this is not mine"
- **Missing**: Shows players without any guardian assigned
- **Contact**: Guardian contact management

#### Filtering Logic:
- Tabs filter on **individual player link status**, not guardian account status
- A single guardian can have children in multiple tabs (e.g., 2 accepted, 1 declined)
- Empty guardians (all children filtered out) are hidden from the tab

#### Per-Child Status Badges:
- ✅ **Accepted** (green badge): `acknowledgedByParentAt` is set
- ⏳ **Pending** (yellow badge): Not acknowledged and not declined
- ❌ **Declined** (red badge): `declinedByUserId` is set

#### View Modes:
1. **Grouped by Family**: Shows guardians with nested children list
2. **Individual Links**: Shows one row per guardian-player link

#### Actions:
- **Delete Link**: Removes guardian-player connection (resets guardian if last link)
- **Resend**: Resets declined link to pending state

### Parent Dashboard

Located at `/orgs/[orgId]/parents`

#### Detection System:
Uses dual query system to detect all pending actions:

1. **Unclaimed Guardian Identities**: `findAllClaimableForCurrentUser`
   - Finds guardians where email matches user's email but `userId` is null
   - Handles new parent invitations

2. **Pending Children for Claimed Guardians**: `findPendingChildrenForClaimedGuardian`
   - Finds guardians where `userId` matches current user
   - Returns children where `acknowledgedByParentAt` is null
   - Handles resend scenarios and new assignments to existing parents

#### Guardian Identity Claim Dialog:
- Shows all pending children across both detection sources
- Displays organization names (fetched via Better Auth adapter)
- Individual accept/decline buttons per child
- Visual selection state (green/red borders)
- "This Isn't Me" button to dismiss entirely
- "Claim Children" button processes all selections

#### Children Display:
- **Only shows accepted children** - Filters by `acknowledgedByParentAt` is set AND `declinedByUserId` is null
- Declined children do NOT appear in dashboard
- Pending children do NOT appear in dashboard (show in claim dialog instead)

## Technical Implementation

### Backend Functions

#### Queries:

**`findAllClaimableForCurrentUser()`** - `/packages/backend/convex/models/guardianIdentities.ts`
- Finds unclaimed guardian identities matching user's email
- Returns guardian + linked children + organizations
- Used for new parent invitations

**`findPendingChildrenForClaimedGuardian()`** - `/packages/backend/convex/models/guardianIdentities.ts`
- Finds claimed guardians with pending children
- Returns pending children in same format as unclaimed identities
- Used for resend and new assignments to existing parents

**`getPlayersForGuardian()`** - `/packages/backend/convex/models/guardianPlayerLinks.ts`
- Returns children for parent dashboard
- Filters out declined (`declinedByUserId` is set)
- Filters out pending (`acknowledgedByParentAt` is null)
- Only returns accepted children

**`getLinksForOrganization()`** - `/packages/backend/convex/models/guardianManagement.ts`
- Returns all guardian-player links for admin view
- Includes `acknowledgedByParentAt` field for status badges
- Supports grouped and ungrouped views

#### Mutations:

**`linkGuardianToUser()`** - `/packages/backend/convex/models/guardianIdentities.ts`
- Claims guardian identity for user account
- Sets `userId` field on guardian identity
- Called when parent clicks "Claim Children" in dialog

**`updateLinkConsent()`** - `/packages/backend/convex/models/guardianPlayerLinks.ts`
- Updates consent flag for individual child
- **Sets `acknowledgedByParentAt` timestamp** when parent accepts
- Called for each accepted child in claim dialog

**`declineGuardianPlayerLink()`** - `/packages/backend/convex/models/guardianPlayerLinks.ts`
- Marks link as declined by setting `declinedByUserId`
- Called for each declined child in claim dialog

**`resetDeclinedLink()`** - `/packages/backend/convex/models/guardianPlayerLinks.ts`
- Clears both `declinedByUserId` AND `acknowledgedByParentAt`
- Sets child back to "Pending" state
- Called when admin clicks "Resend" button

**`deleteGuardianPlayerLink()`** - `/packages/backend/convex/models/guardianPlayerLinks.ts`
- Deletes guardian-player link
- **Checks if last link** for this guardian
- If yes, resets guardian identity (`userId` = undefined)
- Prevents remnants affecting future linking

**`removeGuardianLink()`** - `/packages/backend/convex/models/guardianManagement.ts`
- Admin version of delete with same reset logic
- Used in admin guardian management UI

### Frontend Components

**`guardian-identity-claim-dialog.tsx`** - `/apps/web/src/components/`
- Modal dialog showing pending children
- Individual selection state management with `useState`
- Toggle function for child selection (mine/not mine/unselected)
- Visual feedback with border colors
- Batch processing of all selections on "Claim Children" click
- Organization name display via Better Auth adapter lookup

**`page.tsx`** - `/apps/web/src/app/orgs/[orgId]/parents/`
- Parent dashboard page
- Combines both detection queries (`useMemo` for efficiency)
- Opens claim dialog when pending actions detected
- Displays only accepted children in main view

**`page.tsx`** - `/apps/web/src/app/orgs/[orgId]/admin/guardians/`
- Admin guardian management page
- Tab filtering by link status
- Per-child status badges
- Resend button for declined links
- Grouped and ungrouped view modes

### Schema Fields

#### `guardianIdentities` table:
```typescript
{
  userId: v.optional(v.string()),          // User account linked to this guardian
  email: v.string(),                       // Guardian email
  firstName: v.string(),
  lastName: v.string(),
  phone: v.optional(v.string()),
  verificationStatus: v.union(
    v.literal("unverified"),
    v.literal("email_verified"),
    v.literal("phone_verified")
  ),
  createdFrom: v.optional(v.union(
    v.literal("manual"),
    v.literal("smart_match"),
    v.literal("invitation")
  )),
  createdAt: v.number(),
  updatedAt: v.number(),
}
```

#### `guardianPlayerLinks` table:
```typescript
{
  guardianIdentityId: v.id("guardianIdentities"),  // Parent guardian
  playerId: v.id("orgPlayerEnrollments"),           // Child player
  organizationId: v.string(),                       // Organization scope
  relationship: v.union(
    v.literal("parent"),
    v.literal("legal_guardian"),
    v.literal("emergency_contact")
  ),
  isPrimaryContact: v.boolean(),
  consentedToSharing: v.boolean(),                  // Data sharing consent
  acknowledgedByParentAt: v.optional(v.number()),   // When parent accepted THIS child
  declinedByUserId: v.optional(v.string()),         // User who declined THIS child
  createdAt: v.number(),
  updatedAt: v.number(),
}
```

## Testing Scenarios

### Scenario 1: New Parent Invitation
1. Admin invites `parent@example.com` with 3 children pre-linked
2. Parent accepts invitation and creates account
3. Parent logs in → Claim dialog appears with 3 children
4. Parent accepts all 3
5. ✅ All 3 children appear in parent dashboard
6. ✅ Admin sees all 3 in "Accepted" tab

### Scenario 2: Partial Acceptance
1. Admin assigns 4 children to existing parent
2. Parent logs in → Claim dialog appears with 4 children
3. Parent accepts 3, declines 1
4. ✅ Only 3 accepted children appear in parent dashboard
5. ✅ Admin sees 3 in "Accepted" tab, 1 in "Declined" tab

### Scenario 3: Resend After Decline
1. Parent declines Child A
2. Admin sees Child A in "Declined" tab
3. Admin clicks "Resend" → Status changes to "Pending"
4. Parent logs in → Claim dialog appears with Child A
5. Parent accepts Child A
6. ✅ Child A appears in parent dashboard
7. ✅ Admin sees Child A in "Accepted" tab

### Scenario 4: Delete and Re-Add
1. Admin deletes last guardian-player link
2. ✅ Guardian identity resets (`userId` cleared)
3. Admin re-adds same guardian
4. Parent logs in → Must acknowledge again via claim dialog
5. Parent accepts
6. ✅ Child appears in parent dashboard

### Scenario 5: Multiple Organizations
1. Parent has email in 2 different clubs
2. Club A assigns 2 children, Club B assigns 1 child
3. Parent logs in → Claim dialog shows all 3 children with org names
4. Parent accepts all 3
5. ✅ Parent dashboard shows children from both organizations

## Key Implementation Decisions

### Why No Automatic Linking?

**Problem**: Automatic linking caused several issues:
- Parents saw children they didn't recognize
- No audit trail of explicit parent acknowledgment
- Admin couldn't tell if parent actively accepted or was auto-linked
- Accidental linkages hard to detect

**Solution**: Enforce explicit acknowledgment for ALL scenarios:
- Invitation flow: Guardian created WITHOUT userId, parent must claim
- Join request approval: No auto-linking even for parent role
- Self-assignment: No exception, even when admin assigns themselves

### Why Reset Guardian on Delete?

**Problem**: Deleting guardian-player links left remnants:
- Guardian identity persisted with `userId` set
- Re-adding guardian showed as "Claimed" without parent acknowledgment
- No way to force re-acknowledgment

**Solution**: Reset guardian identity when last link deleted:
- Clears `userId` field (unclaims account)
- Sets `verificationStatus` back to "unverified"
- Forces parent to re-acknowledge if guardian re-added
- Clean slate prevents confusion

### Why Link-Level Status Tracking?

**Problem**: Original design tracked status at guardian account level:
- "Guardian is claimed" didn't tell you which children were accepted
- Couldn't support partial acceptance (accept some, decline others)
- Resend required new guardian identity creation

**Solution**: Track status at individual link level:
- Each guardian-player link has own `acknowledgedByParentAt` timestamp
- Each link can be independently declined
- One guardian can have mix of accepted, pending, and declined children
- Admin sees per-child status badges
- Parent dashboard filters at link level

### Why Dual Detection System?

**Problem**: Single detection query didn't catch all scenarios:
- `findAllClaimableForCurrentUser` only found unclaimed guardians
- Missed pending children when guardian already claimed (resend scenario)
- Parent didn't see claim dialog after admin clicked "Resend"

**Solution**: Two separate queries combined:
1. `findAllClaimableForCurrentUser` - For new parents (userId null)
2. `findPendingChildrenForClaimedGuardian` - For existing parents (userId set, pending children)
- Combined in parent dashboard with `useMemo`
- Catches all scenarios: new invitations, new assignments, resends

## Future Enhancements

### Planned Improvements:
- Email notifications when children assigned
- SMS notifications for urgent guardian actions
- Decline reason tracking (why parent declined specific child)
- Bulk acceptance UI for parents with many children
- Admin bulk linking tools
- Guardian self-service: Request to link additional children
- Cross-organization guardian identity consolidation

### Architectural Considerations:
- **Platform-level identity system**: Currently each club has separate player records for same child. Future: Single platform-level player identity with organization-scoped enrollments.
- **Guardian matching confidence**: Smart matching currently creates guardian identities. Could add confidence scores and manual admin review for low-confidence matches.
- **Consent management**: Expand beyond simple boolean to detailed consent types (photo consent, medical data sharing, cross-org sharing, etc.)

## Related Documentation

- `/docs/features/functional-roles.md` - Parent functional role system
- `/docs/features/user-management.md` - User and member management
- `/docs/architecture/system-overview.md` - Overall system architecture
- `/docs/testing/master-test-plan.md` - Full UAT test plan including guardian flows

## Bug Fixes Implemented

This system addresses the following production bugs:

- **Bug #293**: Existing parents not notified when admin assigns new children
  - Fixed by implementing `findPendingChildrenForClaimedGuardian` query
  - Combined detection in parent dashboard

- **Bug #297**: Children lost after parent accepts invitation
  - Fixed by removing automatic linking in `syncFunctionalRolesFromInvitation`
  - Parent must claim via modal, ensuring proper userId linkage

See GitHub issues for full technical details:
- https://github.com/NB-PDP-Testing/PDP/issues/293
- https://github.com/NB-PDP-Testing/PDP/issues/297
