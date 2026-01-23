# Bug Analysis: Issue #307 - Edit Guardian Email to Existing Email Fails

**Issue:** [#307 - UAT testing for Guardian Linking](https://github.com/NB-PDP-Testing/PDP/issues/307)

**Date:** 2026-01-23

---

## Summary

When editing a guardian's email address (particularly a pending/unverified guardian) to an email that already exists in the system, the backend throws an error instead of handling the scenario gracefully.

**Error Message:**
```
[CONVEX M(models/guardianIdentities:updateGuardianIdentity)] Server Error
Uncaught Error: Guardian with email jkobrien@gmail.com already exists
    at handler (../../convex/models/guardianIdentities.ts:912:12)
```

---

## Root Cause

**File:** `packages/backend/convex/models/guardianIdentities.ts`
**Lines:** 906-916

```typescript
if (args.email !== undefined) {
  const normalizedEmail = args.email.toLowerCase().trim();
  // Check if new email conflicts with another guardian
  if (normalizedEmail !== existing.email) {
    const conflict = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
    if (conflict) {
      throw new Error(
        `Guardian with email ${normalizedEmail} already exists`
      );
    }
  }
  updates.email = normalizedEmail;
}
```

The `updateGuardianIdentity` mutation has a strict uniqueness check that prevents changing a guardian's email to one that already exists. While this makes sense for preventing duplicate records, it doesn't account for legitimate scenarios where:

1. A **pending guardian** (created during player onboarding) needs to be corrected to point to an existing user
2. An admin realizes they entered the wrong email and wants to correct it to the right (existing) person

---

## Use Case Scenario

1. During demo seeding, a pending guardian for "Niamh Doherty" was created with email `pending.guardian@demo.com`
2. Admin realizes this should actually be linked to the existing user `jkobrien@gmail.com`
3. Admin opens the edit modal, changes the email to `jkobrien@gmail.com`, clicks Save
4. System throws error: "Guardian with email jkobrien@gmail.com already exists"

**Expected behavior:** The system should either:
- Merge the pending guardian with the existing one
- Or update the email and handle the duplicate scenario appropriately

---

## Comparison to Issue #207

Issue #207 addressed the **creation** flow where adding a new guardian with an existing email failed. That was fixed by using `findOrCreateGuardian` which handles find-or-create atomically.

Issue #307 is about the **update/edit** flow which still has the strict validation.

---

## Complexity Factors

This fix is more complex than #207 because:

1. **Existing Links:** The guardian being edited may already have links to multiple players
2. **Data Conflicts:** The existing guardian with that email may have different name/phone/address
3. **Verification Status:** Merging unverified with verified guardian has implications
4. **User Association:** One guardian may have a `userId` (claimed) while the other doesn't

---

## Proposed Solutions

### Option 1: Merge Guardian Records (Recommended)

When editing a guardian's email to one that already exists:

1. Find the existing guardian with that email
2. Transfer all `guardianPlayerLinks` from the edited guardian to the existing one
3. Delete the old (edited) guardian record
4. Return the existing guardian's ID

**Pros:**
- Clean data model (no duplicate emails)
- Maintains referential integrity
- Links are preserved

**Cons:**
- Complex merge logic
- Need to handle conflicts (which name/phone to keep?)
- Audit trail considerations

### Option 2: Replace + Relink

1. Don't update the email at all
2. Instead, find/create guardian with the new email
3. Update all links to point to the new guardian
4. Optionally delete the orphaned old guardian

**Pros:**
- Uses existing `findOrCreateGuardian` logic
- Cleaner than in-place merge

**Cons:**
- Requires frontend changes to handle differently
- More mutation calls

### Option 3: Block with Helpful Message + Offer Alternative

1. Keep the validation but improve the error handling
2. Return structured error with the conflicting guardian's ID
3. Frontend offers: "A guardian with this email already exists. Would you like to link to the existing guardian instead?"
4. If user accepts, delete current guardian and create link to existing one

**Pros:**
- User makes explicit choice
- No data loss risk
- Clear UX flow

**Cons:**
- Requires frontend modal/confirmation flow
- Multiple steps for user

---

## Files Affected

### Backend
- `packages/backend/convex/models/guardianIdentities.ts` - `updateGuardianIdentity` mutation (lines 906-916)
- Possibly new mutation for merge/replace logic

### Frontend
- `apps/web/src/app/orgs/[orgId]/admin/guardians/page.tsx` - Edit guardian modal
- Handle merge confirmation or alternative linking flow

---

## Related Code

### Current Edit Modal Error Handler
**File:** Referenced in error as `edit-guardian-modal.tsx:117`

The frontend catches the error but doesn't have special handling for this specific case:
```typescript
} catch (error) {
  console.error("Failed to update guardian:", error);
  // Shows generic error toast
}
```

### Existing Find-or-Create Pattern
**File:** `packages/backend/convex/models/guardianIdentities.ts:375`

The `findOrCreateGuardian` mutation already handles the creation case. A similar `updateOrMergeGuardian` mutation could be created for the edit case.

---

## Testing Considerations

After fix, test these scenarios:

1. **Edit email to non-existent email** - Should work (current behavior)
2. **Edit email to existing guardian (no links)** - Should merge/replace
3. **Edit email to existing guardian (with links to same player)** - Handle duplicate link
4. **Edit email to existing guardian (with links to different players)** - Merge links
5. **Edit email to verified guardian** - Handle verification status
6. **Edit email to guardian with userId** - Handle user association

---

## Priority

**Medium** - Workaround exists (delete pending guardian, add new one with correct email), but this is a poor UX and the edit function should work as expected.

---

## Related Issues

- Issue #207: Guardian duplicate email error on creation (FIXED)
- This issue (#307): Guardian duplicate email error on edit (OPEN)
