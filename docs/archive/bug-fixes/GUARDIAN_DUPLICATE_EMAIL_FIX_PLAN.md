# Guardian Duplicate Email Error - Fix Plan

**Issue:** When an admin adds guardian information for a player and the email address already exists in the system, an error is thrown instead of linking to the existing guardian.

**Error Message:**
```
[CONVEX M(models/guardianIdentities:createGuardianIdentity)] [Request ID: f8e00d7fe0f34686] Server Error
Uncaught Error: Guardian with email jkobrien@gmail.com already exists
    at handler (../../convex/models/guardianIdentities.ts:206:16)
```

---

## Root Cause Analysis

### Current Flow

**Frontend** (`apps/web/src/app/orgs/[orgId]/admin/guardians/components/add-guardian-modal.tsx`):

1. Lines 59-64: Uses `useQuery` to check if guardian exists with the email
```typescript
const existingGuardian = useQuery(
  api.models.guardianIdentities.findGuardianByEmail,
  formData.email.trim() && EMAIL_REGEX.test(formData.email.trim())
    ? { email: formData.email.trim() }
    : "skip"
);
```

2. Lines 103-116: On form submit, conditionally creates or uses existing guardian
```typescript
if (existingGuardian) {
  guardianId = existingGuardian._id;  // Use existing
  isExistingGuardian = true;
} else {
  // Create new guardian - THIS IS WHERE THE ERROR OCCURS
  guardianId = await createGuardianIdentity({...});
}
```

3. Lines 119-127: Links guardian to player

**Backend** (`packages/backend/convex/models/guardianIdentities.ts`):

Lines 203-205 in `createGuardianIdentity`:
```typescript
if (existing) {
  throw new Error(`Guardian with email ${normalizedEmail} already exists`);
}
```

### The Problem

**Race Condition:** The `useQuery` is asynchronous and reactive. When the user clicks submit, one of these scenarios occurs:

1. **Query not loaded yet:** User types email and immediately clicks submit before Convex query completes
2. **Query result is stale:** User modifies email quickly and submits before the new query result arrives
3. **Timing mismatch:** The condition `existingGuardian` evaluates to `undefined` when it should have data

In all cases, the frontend thinks no guardian exists, tries to create one, and the backend correctly rejects it because a guardian with that email already exists.

### Why Current Code Doesn't Work

The frontend code **assumes** the query will always complete before submission, but:
- There's no loading state check
- No debouncing on email input
- No synchronization between query state and form submission

---

## Solution Options

### Option 1: Use Existing `findOrCreateGuardian` Mutation ✅ RECOMMENDED

**Location:** Backend already has this at `packages/backend/convex/models/guardianIdentities.ts:375`

**Why this is best:**
- ✅ Backend handles the find-or-create logic atomically
- ✅ No race conditions (single mutation, not query + mutation)
- ✅ Returns `wasCreated` flag so frontend knows if guardian existed
- ✅ Already implemented and tested
- ✅ Minimal frontend changes required

**Changes Required:**

1. **Frontend** (`add-guardian-modal.tsx`):
   - Remove `useQuery` for `findGuardianByEmail` (lines 59-64)
   - Replace `createGuardianIdentity` mutation with `findOrCreateGuardian`
   - Update submit handler to use the new mutation
   - Update success message based on `wasCreated` flag

2. **No backend changes needed** - function already exists!

---

### Option 2: Check Query Loading State

**Changes Required:**

1. **Frontend** (`add-guardian-modal.tsx`):
   - Add loading state check from `useQuery`
   - Disable submit button while query is loading
   - Add visual indicator that email is being checked

**Code:**
```typescript
const existingGuardian = useQuery(
  api.models.guardianIdentities.findGuardianByEmail,
  formData.email.trim() && EMAIL_REGEX.test(formData.email.trim())
    ? { email: formData.email.trim() }
    : "skip"
);

// Add this check
if (existingGuardian === undefined && formData.email.trim()) {
  // Query is still loading - don't allow submission
  return;
}
```

**Pros:**
- ✅ Prevents race condition
- ✅ Maintains current architecture

**Cons:**
- ❌ Still has timing window (user could submit during query)
- ❌ More complex UX (need to handle loading states)
- ❌ Doesn't solve the fundamental issue (separate query + mutation)

---

### Option 3: Create Combined Backend Mutation

Create a new mutation `addGuardianToPlayer` that handles everything:

**New mutation** (`packages/backend/convex/models/guardianIdentities.ts` or `guardianPlayerLinks.ts`):

```typescript
export const addGuardianToPlayer = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    playerIdentityId: v.id("playerIdentities"),
    relationship: relationshipValidator,
    isPrimary: v.optional(v.boolean()),
  },
  returns: v.object({
    guardianIdentityId: v.id("guardianIdentities"),
    linkId: v.id("guardianPlayerLinks"),
    wasNewGuardian: v.boolean(),
    wasNewLink: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // 1. Find or create guardian (atomic)
    const normalizedEmail = args.email.toLowerCase().trim();
    let guardian = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    let wasNewGuardian = false;
    if (!guardian) {
      const guardianId = await ctx.db.insert("guardianIdentities", {
        firstName: args.firstName.trim(),
        lastName: args.lastName.trim(),
        email: normalizedEmail,
        phone: args.phone ? normalizePhone(args.phone) : undefined,
        verificationStatus: "unverified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdFrom: "admin_guardians_page",
      });
      guardian = await ctx.db.get(guardianId);
      wasNewGuardian = true;
    }

    if (!guardian) {
      throw new Error("Failed to create/find guardian");
    }

    // 2. Check if link already exists
    const existingLink = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian_and_player", (q) =>
        q
          .eq("guardianIdentityId", guardian._id)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (existingLink) {
      // Link already exists - return it
      return {
        guardianIdentityId: guardian._id,
        linkId: existingLink._id,
        wasNewGuardian,
        wasNewLink: false,
      };
    }

    // 3. Create the link
    const linkId = await ctx.db.insert("guardianPlayerLinks", {
      guardianIdentityId: guardian._id,
      playerIdentityId: args.playerIdentityId,
      relationship: args.relationship,
      isPrimary: args.isPrimary ?? true,
      hasParentalResponsibility: true,
      canCollectFromTraining: true,
      consentedToSharing: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      guardianIdentityId: guardian._id,
      linkId,
      wasNewGuardian,
      wasNewLink: true,
    };
  },
});
```

**Pros:**
- ✅ Completely atomic operation
- ✅ No race conditions possible
- ✅ Handles all edge cases (existing guardian, existing link, both)
- ✅ Single mutation call from frontend
- ✅ Clear return values for user messaging

**Cons:**
- ❌ New backend code to write and test
- ❌ Duplicates some logic from existing mutations
- ❌ More complex than Option 1

---

## Recommended Solution: Option 1

### Implementation Steps

#### Step 1: Update Frontend Component

**File:** `apps/web/src/app/orgs/[orgId]/admin/guardians/components/add-guardian-modal.tsx`

**Changes:**

```typescript
// REMOVE these lines (59-64):
const existingGuardian = useQuery(
  api.models.guardianIdentities.findGuardianByEmail,
  formData.email.trim() && EMAIL_REGEX.test(formData.email.trim())
    ? { email: formData.email.trim() }
    : "skip"
);

// REMOVE this mutation (66-68):
const createGuardianIdentity = useMutation(
  api.models.guardianIdentities.createGuardianIdentity
);

// ADD this mutation instead:
const findOrCreateGuardian = useMutation(
  api.models.guardianIdentities.findOrCreateGuardian
);

// UPDATE handleSubmit (lines 98-149):
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validation (keep existing)
  if (!formData.firstName.trim()) {
    toast.error("Please enter first name");
    return;
  }
  if (!formData.lastName.trim()) {
    toast.error("Please enter last name");
    return;
  }
  if (!formData.email.trim()) {
    toast.error("Please enter email address");
    return;
  }
  if (!EMAIL_REGEX.test(formData.email)) {
    toast.error("Please enter a valid email address");
    return;
  }

  setIsSaving(true);

  try {
    // Step 1: Find or create guardian (atomic operation)
    const guardianResult = await findOrCreateGuardian({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined,
      createdFrom: "admin_guardians_page",
    });

    // Step 2: Link guardian to player
    await createGuardianPlayerLink({
      guardianIdentityId: guardianResult.guardianIdentityId,
      playerIdentityId: playerId,
      relationship: formData.relationship,
      isPrimary: true,
      hasParentalResponsibility: true,
      canCollectFromTraining: true,
      consentedToSharing: false,
    });

    // Success message depends on whether guardian was created or found
    if (guardianResult.wasCreated) {
      toast.success("Guardian added successfully", {
        description: `${formData.firstName} ${formData.lastName} has been created and linked to ${playerName}`,
      });
    } else {
      toast.success("Existing guardian linked successfully", {
        description: `${formData.firstName} ${formData.lastName} has been linked to ${playerName}`,
      });
    }

    // Reset form and close modal
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      relationship: "guardian",
    });
    onOpenChange(false);
  } catch (error) {
    console.error("Failed to add guardian:", error);

    // Provide user-friendly error messages
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        errorMessage = "This guardian is already linked to this player";
      } else if (error.message.includes("not found")) {
        errorMessage = "Player or guardian not found";
      } else {
        errorMessage = error.message;
      }
    }

    toast.error("Failed to link guardian", {
      description: errorMessage,
    });
  } finally {
    setIsSaving(false);
  }
};

// UPDATE the email input section (lines 216-237):
// REMOVE the warning message about existing guardian since we no longer have that query
<div className="grid gap-2">
  <Label htmlFor="email">
    Email <span className="text-red-500">*</span>
  </Label>
  <Input
    id="email"
    onChange={(e) =>
      setFormData({ ...formData, email: e.target.value })
    }
    placeholder="guardian@example.com"
    required
    type="email"
    value={formData.email}
  />
  {/* REMOVE the existingGuardian warning - no longer needed */}
</div>

// UPDATE the submit button text (line 292):
<Button disabled={isSaving} type="submit">
  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Add Guardian {/* Always say "Add Guardian" - backend handles find/create */}
</Button>
```

#### Step 2: Handle Link Already Exists Error

The `createGuardianPlayerLink` mutation (lines 266-268 in `guardianPlayerLinks.ts`) throws an error if the link already exists:

```typescript
if (existing) {
  throw new Error("Guardian-player link already exists");
}
```

**Options:**
1. **Keep the error** - frontend catches it and shows appropriate message ✅ RECOMMENDED
2. **Change backend to return existing link ID** instead of throwing

**Recommended:** Keep the backend error. The frontend already handles this at line 155:
```typescript
if (error.message.includes("already exists")) {
  errorMessage = "This guardian is already linked to this player";
}
```

This gives the admin clear feedback that the relationship already exists.

---

## Testing Plan

### Test Case 1: New Guardian + New Link
**Steps:**
1. Log in as admin
2. Navigate to player detail page
3. Click "Add Guardian"
4. Enter NEW email address (doesn't exist in system)
5. Fill in other fields
6. Submit

**Expected:**
- ✅ Guardian created
- ✅ Link created
- ✅ Success message: "Guardian added successfully"
- ✅ Guardian appears in player's guardian list

### Test Case 2: Existing Guardian + New Link
**Steps:**
1. Log in as admin
2. Navigate to player detail page
3. Click "Add Guardian"
4. Enter EXISTING email address (guardian exists but not linked to this player)
5. Fill in other fields
6. Submit

**Expected:**
- ✅ Existing guardian found (not created)
- ✅ Link created
- ✅ Success message: "Existing guardian linked successfully"
- ✅ Guardian appears in player's guardian list

### Test Case 3: Existing Guardian + Existing Link
**Steps:**
1. Log in as admin
2. Navigate to player detail page
3. Click "Add Guardian"
4. Enter email of guardian ALREADY linked to this player
5. Fill in other fields
6. Submit

**Expected:**
- ✅ Error caught by frontend
- ✅ Error message: "This guardian is already linked to this player"
- ✅ No duplicate link created
- ✅ Modal remains open for user to correct

### Test Case 4: Rapid Submission (Race Condition Test)
**Steps:**
1. Log in as admin
2. Navigate to player detail page
3. Click "Add Guardian"
4. Type email very quickly
5. Immediately click submit (before any delay)

**Expected:**
- ✅ No race condition error
- ✅ Backend handles find/create atomically
- ✅ Appropriate success message shown

---

## Rollback Plan

If issues arise after deployment:

1. **Revert frontend changes** to use original `createGuardianIdentity` + `useQuery` pattern
2. **Add loading state check** as temporary fix (Option 2)
3. **Investigate** why `findOrCreateGuardian` isn't working as expected

---

## Files to Modify

### Frontend
- ✅ `apps/web/src/app/orgs/[orgId]/admin/guardians/components/add-guardian-modal.tsx`

### Backend
- ❌ No changes needed (using existing `findOrCreateGuardian` mutation)

---

## Summary

**Problem:** Race condition between frontend query and mutation causes error when adding existing guardian to player.

**Root Cause:** Frontend uses separate query (check if exists) + mutation (create) which are not atomic.

**Solution:** Use existing backend `findOrCreateGuardian` mutation which handles find-or-create atomically.

**Benefits:**
- ✅ Eliminates race condition
- ✅ Simpler frontend code (one mutation instead of query + mutation)
- ✅ Better user experience (no loading states to manage)
- ✅ Uses existing, tested backend code
- ✅ Clear success messages for both scenarios

**Risk Level:** Low - minimal changes, using existing backend function

**Estimated Effort:** ~30 minutes to implement + 15 minutes to test
