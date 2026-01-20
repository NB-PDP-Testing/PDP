## Bug Investigation Complete

### 🔍 Root Cause Analysis

The error occurs due to a **race condition** between a frontend query and mutation:

**Current Flow:**
1. Admin enters guardian email in modal
2. Frontend uses `useQuery` to check if guardian exists (line 59-64 in `add-guardian-modal.tsx`)
3. User clicks submit before query completes
4. Frontend evaluates `existingGuardian` as `undefined` (query still loading)
5. Frontend attempts to create new guardian via `createGuardianIdentity`
6. Backend correctly rejects because guardian with that email already exists
7. **Error thrown at line 204** in `guardianIdentities.ts`:
```typescript
if (existing) {
  throw new Error(`Guardian with email ${normalizedEmail} already exists`);
}
```

**The Problem:** Separate query + mutation are not atomic, creating a timing window where the check passes but creation fails.

---

### ✅ Recommended Solution

Use the **existing backend mutation** `findOrCreateGuardian` which handles this atomically:

**Benefits:**
- ✅ Single atomic operation (no race condition possible)
- ✅ Already implemented at `packages/backend/convex/models/guardianIdentities.ts:375`
- ✅ Returns `wasCreated: boolean` flag for proper user messaging
- ✅ Minimal code changes required (one file)

**Changes Required:**

**File:** `apps/web/src/app/orgs/[orgId]/admin/guardians/components/add-guardian-modal.tsx`

1. **Remove** `useQuery` checking for existing guardian (lines 59-64)
2. **Replace** mutation from `createGuardianIdentity` to `findOrCreateGuardian`
3. **Update** submit handler to use new mutation
4. **Remove** the "existing guardian" warning message (no longer needed)
5. **Update** success messages based on `wasCreated` flag

---

### 📋 Implementation Summary

**Before:**
```typescript
// Separate query and mutation (race condition)
const existingGuardian = useQuery(api.models.guardianIdentities.findGuardianByEmail, ...);
const createGuardianIdentity = useMutation(api.models.guardianIdentities.createGuardianIdentity);

// Submit handler
if (existingGuardian) {
  guardianId = existingGuardian._id;
} else {
  guardianId = await createGuardianIdentity({...}); // ERROR HERE
}
```

**After:**
```typescript
// Single atomic mutation (no race condition)
const findOrCreateGuardian = useMutation(api.models.guardianIdentities.findOrCreateGuardian);

// Submit handler
const result = await findOrCreateGuardian({
  firstName: formData.firstName.trim(),
  lastName: formData.lastName.trim(),
  email: formData.email.trim(),
  phone: formData.phone.trim() || undefined,
  createdFrom: "admin_guardians_page",
});

// result.wasCreated tells us if guardian was new or existing
// result.guardianIdentityId is the ID to use
```

---

### 🧪 Test Cases

1. **New guardian + new link** → Should create and link successfully
2. **Existing guardian + new link** → Should find existing and link successfully
3. **Existing guardian + existing link** → Should show "already linked" error
4. **Rapid submission** → Should handle without race condition error

---

### 📄 Detailed Documentation

Full implementation plan with code examples: `docs/archive/bug-fixes/GUARDIAN_DUPLICATE_EMAIL_FIX_PLAN.md`

---

### ⏱️ Estimated Effort

- Implementation: ~30 minutes
- Testing: ~15 minutes
- **Total: ~45 minutes**

---

### 🎯 Files Modified

- ✅ `apps/web/src/app/orgs/[orgId]/admin/guardians/components/add-guardian-modal.tsx` (frontend only)
- ❌ No backend changes needed (using existing mutation)

---

**Risk Level:** Low - minimal changes, using existing tested backend code

**Ready to implement upon approval.**
