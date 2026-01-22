# GAA Import Guardian Linking Investigation
**Date:** January 22, 2026
**Issue:** Verify that commit 1fe5032 (parent-guardian linking changes) has not impacted GAA import automatic linking

## Summary

✅ **RESULT: GAA import process is FULLY COMPATIBLE with the new acknowledgment system.**

The recent changes to manual guardian linking (commit 1fe5032) have **NOT** broken the GAA import process. In fact, the system is designed to work seamlessly with both manual and automated guardian-child linking.

## How It Works

### 1. GAA Import Process
**File:** `packages/backend/convex/models/playerImport.ts`

The `batchImportPlayersWithIdentity` mutation creates guardian-player links in three phases:

**Phase 2: Enhanced Guardian Matching (Lines 680-823)**
- Automatically matches youth players with adult members based on scoring system:
  - Email match: 50 points (highest confidence)
  - Surname + Postcode: 45 points
  - Phone match: 30 points
  - Surname + Town: 35 points
- Only auto-links **high confidence matches** (60+ points)
- Creates `guardianIdentities` records with `userId = undefined` (unclaimed)
- Creates `guardianPlayerLinks` records **WITHOUT** `acknowledgedByParentAt`

**Phase 3: Explicit Parent Info (Lines 825-952)**
- Processes explicit parent information from CSV
- Creates guardians for parents not in membership list
- Creates links **WITHOUT** `acknowledgedByParentAt`

### 2. Parent First Login Flow
**File:** `packages/backend/convex/models/guardianIdentities.ts`

When a parent logs in for the first time:

**Step 1:** `findAllClaimableForCurrentUser` query (Lines 1330-1449)
- Matches user's email to unclaimed guardian identities
- Retrieves all children linked to that guardian
- Shows claim dialog with pending children

**Step 2:** Parent Acknowledgment
- Parent reviews children and clicks "Yes, this is mine" or "No, this is not mine"
- `batchAcknowledgeParentActions` mutation (Lines 1692-1880) is called:
  - **Line 1763-1770:** Sets `userId` on guardian identity (claims it)
  - **Line 1782-1785:** Sets `acknowledgedByParentAt` on accepted links
  - **Line 1802-1807:** Sets `declinedByUserId` on declined links

### 3. Parent Dashboard Display
**File:** `packages/backend/convex/models/guardianPlayerLinks.ts`

**Query:** `getPlayersForGuardian` (Lines 98-136)
```typescript
for (const link of links) {
  // Only show children the parent has explicitly accepted
  if (link.declinedByUserId || !link.acknowledgedByParentAt) {
    continue; // Skip pending and declined children
  }
  // ... show accepted children
}
```

This ensures parents ONLY see children they have explicitly acknowledged.

### 4. Existing Parents (Admin Adds New Children)
**File:** `packages/backend/convex/models/guardianIdentities.ts`

For parents who already have a claimed guardian identity:

**Query:** `findPendingChildrenForClaimedGuardian` (Lines 1455-1576)
```typescript
const pendingLinks = allLinks.filter(
  (link) => !(link.acknowledgedByParentAt || link.declinedByUserId)
);
```

- Detects new guardian-player links without acknowledgment
- Shows claim dialog on next login
- Same acknowledgment flow applies

## Schema Verification

**File:** `packages/backend/convex/schema.ts` (Line 316)
```typescript
acknowledgedByParentAt: v.optional(v.number()), // Optional field
```

The field is **optional**, so GAA import can create links without it. No migration or data fixes required.

## Complete Flow Diagram

```
GAA Import
    ↓
Create Guardian (userId = undefined, email/phone set)
    ↓
Create Guardian-Player Link (acknowledgedByParentAt = undefined)
    ↓
Parent Logs In
    ↓
findAllClaimableForCurrentUser (matches by email)
    ↓
Claim Dialog Opens (shows pending children)
    ↓
Parent Acknowledges Children
    ↓
batchAcknowledgeParentActions
    ├─→ Set userId on guardian (claim it)
    ├─→ Set acknowledgedByParentAt on accepted links
    └─→ Set declinedByUserId on declined links
    ↓
Parent Dashboard
    ↓
getPlayersForGuardian (filters for acknowledgedByParentAt)
    ↓
Shows ONLY acknowledged children
```

## What Changed in Commit 1fe5032

### Removed Automatic Linking From:
1. `findOrCreateGuardian` - No longer automatically links guardian to user
2. `syncFunctionalRolesFromInvitation` - Invitation flow requires acknowledgment
3. `approveFunctionalRoleRequest` - Join request approval requires acknowledgment

### Added:
1. `acknowledgedByParentAt` field to track explicit parent acknowledgment
2. Filtering in `getPlayersForGuardian` to show only acknowledged children
3. Detection queries for both unclaimed guardians AND pending children on claimed guardians

## Impact on GAA Import

**None.** The GAA import:
- Does NOT call `findOrCreateGuardian`, `syncFunctionalRolesFromInvitation`, or `approveFunctionalRoleRequest`
- Creates records directly using `ctx.db.insert()`
- Is designed to create "pending" guardian-player relationships
- Works seamlessly with the new acknowledgment system

## Why This Design is Correct

The new system enforces **explicit parent acknowledgment for ALL child assignments**, regardless of source:
- ✅ Manual admin assignments → Requires acknowledgment
- ✅ Invitations with children → Requires acknowledgment
- ✅ Join requests with children → Requires acknowledgment
- ✅ GAA imports → Requires acknowledgment

This ensures:
1. No child appears in a parent dashboard without explicit consent
2. Parents can decline incorrect assignments (e.g., name collisions)
3. GDPR compliance - parents must actively acknowledge data access
4. Audit trail - `acknowledgedByParentAt` timestamp for compliance

## Testing Scenarios

### Scenario 1: New Parent (GAA Import)
1. GAA import creates guardian with email `john@example.com` + links to 2 children
2. Parent logs in with `john@example.com`
3. Claim dialog appears with 2 children
4. Parent accepts both children
5. Both children appear in parent dashboard
✅ **Expected behavior**

### Scenario 2: Existing Parent (Admin Adds New Child)
1. Parent has claimed guardian, sees 1 child in dashboard
2. Admin manually adds 2nd child to same guardian
3. Parent logs in
4. Claim dialog appears with 1 new pending child
5. Parent accepts new child
6. Both children now appear in dashboard
✅ **Expected behavior**

### Scenario 3: Partial Acceptance
1. GAA import creates guardian + links to 3 children
2. Parent logs in and reviews children
3. Parent accepts 2 children, declines 1
4. Parent dashboard shows 2 accepted children
5. Admin sees status badges: 2 "Accepted", 1 "Declined"
6. Admin can "Resend" the declined child
✅ **Expected behavior**

## Conclusion

The recent guardian linking changes (commit 1fe5032) are **fully compatible** with the GAA import process. The system is working as designed:

1. GAA import creates unclaimed guardian identities with pending links
2. Parents must explicitly acknowledge all children (via claim dialog)
3. Only acknowledged children appear in parent dashboard
4. System works for both new guardians and existing guardians with new children

**No code changes, migrations, or fixes are required.**

## Files Analyzed

1. `packages/backend/convex/models/playerImport.ts` - GAA import logic
2. `packages/backend/convex/models/guardianIdentities.ts` - Claim and acknowledgment flow
3. `packages/backend/convex/models/guardianPlayerLinks.ts` - Link filtering and display
4. `packages/backend/convex/schema.ts` - Schema definitions
5. `apps/web/src/app/orgs/[orgId]/admin/gaa-import/page.tsx` - Frontend integration

## Commit Reference

**Commit:** 1fe5032dc2be544cedaac8703e43147dd90a245e
**Date:** Wed Jan 21 23:33:30 2026
**Title:** feat: Implement comprehensive parent-guardian linking system with explicit acknowledgment
