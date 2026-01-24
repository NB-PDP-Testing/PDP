# Bug Analysis Update: Issue #308 - Multiple Primary Guardians

## Investigation Summary

I've reviewed the code comprehensively and have some corrections and additions to the original analysis.

---

## Clarification: What Actually Happens

### The Add Guardian Modal Flow

The original analysis states that `createGuardianPlayerLink` properly unsets other primaries. This is **correct**. However, the actual behavior needs clarification:

**File:** `apps/web/src/app/orgs/[orgId]/admin/guardians/components/add-guardian-modal.tsx` (Line 116)
```typescript
isPrimary: true, // First guardian added is primary
```

**File:** `packages/backend/convex/models/guardianPlayerLinks.ts` (Lines 306-320)
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

**Actual Result:** When using the Add Guardian modal:
- First guardian added → becomes Primary
- Second guardian added → first guardian is DEMOTED, second becomes Primary
- Third guardian added → second guardian is DEMOTED, third becomes Primary

This is the **opposite** of the bug title ("Multiple guardians labeled as Primary"). Via this flow, only the MOST RECENT guardian is primary.

---

## When Multiple Primaries CAN Occur

Multiple primaries can occur through **other code paths** that bypass the primary unset logic:

### 1. `addGuardianLink` mutation (guardianManagement.ts:527-538)
```typescript
return await ctx.db.insert("guardianPlayerLinks", {
  ...
  isPrimary: args.isPrimary ?? false,  // No unset logic!
  ...
});
```
**Risk:** If called with `isPrimary: true`, doesn't unset others.

### 2. Invitation Sync (members.ts:2063-2073)
```typescript
await ctx.db.insert("guardianPlayerLinks", {
  ...
  isPrimary: true,  // Hardcoded, no unset logic!
  ...
});
```
**Risk:** When parent accepts invitation, can create duplicate primary.

### 3. Self-Guardian Match (guardianPlayerLinks.ts:1045-1055)
```typescript
await ctx.db.insert("guardianPlayerLinks", {
  ...
  isPrimary: true,  // Hardcoded, no unset logic!
  ...
});
```
**Risk:** Email-based matching can create duplicate primary.

### 4. Seed Scripts
Multiple locations hardcode `isPrimary: true` without checking existing links.

---

## Missing UI Functionality

### No Way to Add Secondary Guardian
The Add Guardian modal always passes `isPrimary: true`. There is no UI option to:
- Add a guardian as "secondary" (non-primary)
- Choose whether the new guardian should be primary

### No Way to Change Primary Status
The `setPrimaryGuardian` mutation exists in the backend but has **no frontend UI**:
```typescript
// Backend: packages/backend/convex/models/guardianPlayerLinks.ts:397
export const setPrimaryGuardian = mutation({...})
```

Frontend usage: **None found**

---

## How to Add a Secondary Guardian for Testing

Currently, there is **NO direct way through the UI** to add a secondary guardian. Options:

### Option 1: Use Convex Dashboard
1. Go to Convex Dashboard → Functions
2. Call `models/guardianManagement:addGuardianLink` directly with:
   - `guardianId`: ID of existing guardian
   - `playerId`: ID of player
   - `relationship`: "guardian" or other
   - `isPrimary`: `false`

### Option 2: Through Invitation Flow
1. As admin, invite a user with "Parent" role
2. Link them to a player during invitation setup
3. When they accept, the `syncFunctionalRolesFromInvitation` creates a link with `isPrimary: true`
4. If the player already has a primary guardian, you'll get multiple primaries (demonstrating the bug)

### Option 3: Temporary Code Change
Modify `add-guardian-modal.tsx` line 116 to:
```typescript
isPrimary: false, // Add as secondary
```

---

## Confirmed Issues

| Issue | Status | Impact |
|-------|--------|--------|
| Frontend always passes `isPrimary: true` | ✅ Confirmed | Newest guardian always becomes primary |
| `addGuardianLink` lacks unset logic | ✅ Confirmed | Can create multiple primaries |
| Invitation sync lacks unset logic | ✅ Confirmed | Can create multiple primaries |
| Self-guardian match lacks unset logic | ✅ Confirmed | Can create multiple primaries |
| No UI to add secondary guardian | ✅ Confirmed | Cannot test easily |
| No UI to change primary status | ✅ Confirmed | No way to fix bad data via UI |

---

## Recommended Testing Approach

1. **Test via Convex Dashboard:**
   - Find a player with an existing guardian
   - Use `addGuardianLink` mutation with `isPrimary: true`
   - Check player's guardians in UI - both should show "(Primary)"

2. **Test via Invitation:**
   - Add guardian via modal (becomes primary)
   - Invite a second parent with that player linked
   - Have them accept invitation
   - Both should show "(Primary)"

---

## Questions for Clarification

1. **Expected Behavior for Add Guardian Modal:**
   - Should adding a second guardian automatically be secondary?
   - Or should there be a toggle to choose primary/secondary?

2. **Should there be a UI to change primary status?**
   - The backend supports `setPrimaryGuardian`
   - Should admins be able to toggle this in the guardian management page?

3. **What should happen when deleting the primary guardian?**
   - Should another guardian be auto-promoted to primary?
   - Or should it be a manual selection?
