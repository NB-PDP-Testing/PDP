# Bug Analysis: Multiple Primary Guardians

**Date:** 2026-01-23

---

## Summary

When adding multiple guardians to a player, both guardians are labeled as "Primary" when only one should have this designation. A player should have exactly one primary guardian with any number of secondary guardians.

---

## Root Cause Analysis

The issue stems from **inconsistent handling of the primary guardian constraint across multiple code paths** in the codebase.

### Finding 1: Frontend Always Sets isPrimary: true

**File:** `apps/web/src/app/orgs/[orgId]/admin/guardians/components/add-guardian-modal.tsx`
**Line:** 116

```typescript
const linkId = await createGuardianPlayerLink({
  guardianIdentityId: guardianResult.guardianIdentityId,
  playerIdentityId: playerId,
  relationship: formData.relationship,
  isPrimary: true, // <-- BUG: Always passes true for ALL guardians
  hasParentalResponsibility: true,
  canCollectFromTraining: true,
  consentedToSharing: false,
});
```

The add-guardian-modal hardcodes `isPrimary: true` for EVERY guardian added, regardless of whether the player already has a primary guardian.

**Note:** The backend mutation `createGuardianPlayerLink` DOES properly unset other primaries when this is called, so this alone wouldn't cause the bug. However, this is still incorrect frontend behavior.

---

### Finding 2: Multiple Code Paths Bypass Primary Handling

There are **10+ locations** in the codebase where guardian links are created, but only ONE has proper logic to unset existing primaries:

#### Proper Implementation (createGuardianPlayerLink)
**File:** `packages/backend/convex/models/guardianPlayerLinks.ts`
**Lines:** 307-320

```typescript
// If setting as primary, unset other primaries
if (isPrimary) {
  const existingLinks = await ctx.db
    .query("guardianPlayerLinks")
    .withIndex("by_player", (q) =>
      q.eq("playerIdentityId", args.playerIdentityId)
    )
    .collect();

  for (const link of existingLinks) {
    if (link.isPrimary) {
      await ctx.db.patch(link._id, { isPrimary: false });
    }
  }
}
```

#### Code Paths WITHOUT Primary Unsetting:

1. **guardianManagement.ts:527-538 (`addGuardianLink`)**
   ```typescript
   return await ctx.db.insert("guardianPlayerLinks", {
     ...
     isPrimary: args.isPrimary ?? false,  // No unset logic!
     ...
   });
   ```

2. **members.ts:2063-2073 (`syncFunctionalRolesFromInvitation`)**
   ```typescript
   await ctx.db.insert("guardianPlayerLinks", {
     ...
     isPrimary: true,  // Hardcoded true, no unset logic!
     ...
   });
   ```

3. **guardianPlayerLinks.ts:799-807 (`linkGuardianToPlayer`)**
   ```typescript
   await ctx.db.insert("guardianPlayerLinks", {
     ...
     isPrimary,  // Uses calculated value but doesn't unset others
     ...
   });
   ```

4. **guardianPlayerLinks.ts:1045-1055**
   ```typescript
   await ctx.db.insert("guardianPlayerLinks", {
     ...
     isPrimary: true,  // Hardcoded true, no unset logic!
     ...
   });
   ```

5. **playerImport.ts:449, 802, 930** - Multiple import paths with varying logic

6. **seedDemoClub.ts:1121, 1155** - Seed script inserts

7. **seed/orchestrator.ts:1187** - Seed orchestrator

---

### Finding 3: No Database Constraint

The `guardianPlayerLinks` table has no constraint to enforce single primary per player. The `isPrimary` field is just a boolean that can be set on multiple records.

**File:** `packages/backend/convex/schema.ts`

```typescript
guardianPlayerLinks: defineTable({
  guardianIdentityId: v.id("guardianIdentities"),
  playerIdentityId: v.id("playerIdentities"),
  relationship: relationshipValidator,
  isPrimary: v.boolean(),  // No uniqueness constraint
  ...
})
```

---

## Impact

1. **Data Integrity:** Players can have multiple guardians marked as primary
2. **UI Confusion:** "(Primary)" badge appears on all guardians instead of one
3. **Business Logic:** Any code that relies on `isPrimary` to find THE primary guardian may get inconsistent results

---

## Affected Flows

1. **Add Guardian Modal** - When adding multiple guardians through the admin UI
2. **Invitation Sync** - When syncing guardian links from invitations
3. **Player Import** - When importing players with parent data
4. **Direct API Calls** - Any code that directly calls `addGuardianLink` or inserts into the table

---

## Files Affected

### Backend (Primary Concern)
| File | Lines | Issue |
|------|-------|-------|
| `guardianPlayerLinks.ts` | 799-807 | `linkGuardianToPlayer` doesn't unset |
| `guardianPlayerLinks.ts` | 1045-1055 | Direct insert with `isPrimary: true` |
| `guardianManagement.ts` | 527-538 | `addGuardianLink` doesn't unset |
| `members.ts` | 2063-2073 | Invitation sync doesn't unset |
| `playerImport.ts` | 449, 802, 930 | Import paths don't unset |

### Frontend
| File | Lines | Issue |
|------|-------|-------|
| `add-guardian-modal.tsx` | 116 | Hardcoded `isPrimary: true` |

---

## Proposed Solutions

### Option 1: Centralize Primary Handling (Recommended)

Create a helper function that ALL guardian link creation must use:

```typescript
async function createGuardianLinkWithPrimaryHandling(
  ctx: MutationCtx,
  args: {
    guardianIdentityId: Id<"guardianIdentities">;
    playerIdentityId: Id<"playerIdentities">;
    relationship: string;
    isPrimary?: boolean;
    // ... other fields
  }
) {
  // Determine if should be primary
  const existingLinks = await ctx.db
    .query("guardianPlayerLinks")
    .withIndex("by_player", (q) =>
      q.eq("playerIdentityId", args.playerIdentityId)
    )
    .collect();

  const isPrimary = args.isPrimary ?? existingLinks.length === 0;

  // If setting as primary, unset others
  if (isPrimary) {
    for (const link of existingLinks) {
      if (link.isPrimary) {
        await ctx.db.patch(link._id, { isPrimary: false });
      }
    }
  }

  return await ctx.db.insert("guardianPlayerLinks", {
    ...args,
    isPrimary,
    // ... other fields
  });
}
```

Then update all 10+ insertion points to use this function.

### Option 2: Frontend Fix + Partial Backend

1. Fix frontend to not pass `isPrimary: true` always
2. Fix the main `addGuardianLink` mutation
3. Accept that seed scripts and imports may create inconsistent data (less critical)

### Option 3: Database Trigger/Validator (Advanced)

Add a Convex validator or trigger that enforces single primary per player at the database level.

---

## Testing Checklist

After fix, verify:

1. [ ] First guardian added to player is automatically primary
2. [ ] Second guardian added is NOT primary (first remains primary)
3. [ ] Manually setting second guardian as primary unsets first
4. [ ] Deleting primary guardian promotes another to primary
5. [ ] Player import creates correct primary designation
6. [ ] Invitation sync creates correct primary designation
7. [ ] No player ends up with zero primaries (edge case)
8. [ ] No player ends up with multiple primaries

---

## Priority

**Medium-High** - Affects data integrity and user experience, but has workaround (manually edit guardian to toggle primary status).

---

## Related Code References

- Primary display in UI: `apps/web/src/app/orgs/[orgId]/admin/guardians/page.tsx:1004`
- Primary query logic: `guardianPlayerLinks.ts:185` (`getPrimaryGuardian`)
- Set primary mutation: `guardianPlayerLinks.ts:397` (`setPrimaryGuardian`)
