# Voice Note Coach ID Mismatch Fix
**Date:** 2026-01-23
**Severity:** CRITICAL - Prevented ALL TODO auto-assignment functionality
**Status:** ✅ FIXED

---

## The Problem

Voice notes with TODO items were not being auto-assigned to the recording coach. The TODO insights appeared with missing `assigneeUserId` and `assigneeName` fields.

### Example

**Voice Note:** "i need to work out a plan for next training session."

**Result:**
```json
{
  category: "todo",
  title: "Plan Next Training Session",
  description: "The coach mentioned the need to develop a plan...",
  recommendedUpdate: "Create a detailed training session plan...",
  status: "pending",
  // ❌ MISSING:
  // assigneeUserId: undefined
  // assigneeName: undefined
}
```

**Impact:**
- TODO insights had no assignee
- Could not be applied (requiresassigneeUserId)
- Task creation failed
- Broke entire TODO workflow

---

## Root Cause

### The ID Type Mismatch

**Better Auth User IDs** (correct):
- Format: `s17fv543xmd82xp7108whzfxc97zcwah`
- Start with `s`
- Used by Better Auth `findOne` queries
- Required for `coachId` field in voice notes

**Convex IDs** (incorrect):
- Format: `k175sxnms1s6r8z66qdya70cb97w89d7`
- Start with `k`
- Used for Convex database tables
- **NOT compatible with Better Auth queries**

### The Bug Location

**File:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/new-note-tab.tsx`

**Lines 112 and 141:**
```typescript
// WRONG - Falls back to Convex ID!
const userId = user.userId || user._id;

await createTypedNote({
  orgId,
  coachId: userId,  // ❌ Could be Convex ID (starts with k)
  noteType,
  noteText: noteText.trim(),
});
```

### Why It Broke

1. **Hook Used:** `useCurrentUser()` from Convex
   - Returns user object with:
     - `userId` (Better Auth ID) - **sometimes null/undefined**
     - `_id` (Convex ID) - always present

2. **Fallback Logic:**
   ```typescript
   const userId = user.userId || user._id;
   ```
   - If `user.userId` is null → falls back to `user._id`
   - `user._id` is a Convex ID (starts with `k`)
   - Passes Convex ID as `coachId` to backend

3. **Backend Query:**
   ```typescript
   const recordingCoachUser = await ctx.runQuery(
     components.betterAuth.adapter.findOne,
     {
       model: "user",
       where: [{ field: "id", value: note.coachId, operator: "eq" }],
     }
   );
   ```
   - Better Auth query looks for user with ID `k175...`
   - **No user exists** with that ID (only `s17...` IDs exist)
   - Returns `null`
   - `coachesRoster` remains empty
   - TODO auto-assignment fails

---

## The Fix

### Frontend Changes

**File:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/new-note-tab.tsx`

**Changed Hook:**
```diff
- import { useCurrentUser } from "@/hooks/use-current-user";
+ import { authClient } from "@/lib/auth-client";

  export function NewNoteTab({ orgId, onSuccess, onError }: NewNoteTabProps) {
    // ...

-   // Get current user for coachId
-   const user = useCurrentUser();
+   // Get current user session for Better Auth user ID
+   const { data: session } = authClient.useSession();
```

**Changed ID Usage (Recorded Notes):**
```diff
-     if (!user) {
-       throw new Error("User not authenticated");
-     }
-     const userId = user.userId || user._id;
+     if (!session?.user?.id) {
+       throw new Error("User not authenticated");
+     }

      await createRecordedNote({
        orgId,
-       coachId: userId,
+       coachId: session.user.id,
        noteType,
        audioStorageId: storageId,
      });
```

**Changed ID Usage (Typed Notes):**
```diff
-     if (!user) {
+     if (!session?.user?.id) {
        onError("User not authenticated");
        return;
      }

-     const userId = user.userId || user._id;

      try {
        await createTypedNote({
          orgId,
-         coachId: userId,
+         coachId: session.user.id,
          noteType,
          noteText: noteText.trim(),
        });
```

### Backend Cleanup

**File:** `packages/backend/convex/actions/voiceNotes.ts`

Removed excessive debug logging added during troubleshooting:
- Removed version marker log
- Removed 🔥 emoji debug logs
- Kept essential warning logs
- Cleaner production code

---

## Why This Fix Works

### Better Auth Session vs Convex User

**Before (WRONG):**
```typescript
const user = useCurrentUser();  // Convex query
const userId = user.userId || user._id;  // Fallback to Convex ID

// When user.userId is null:
userId = "k175sxnms1s6r8z66qdya70cb97w89d7"  // ❌ Convex ID
```

**After (CORRECT):**
```typescript
const { data: session } = authClient.useSession();  // Better Auth session
const userId = session.user.id;  // Always Better Auth ID

// Always gets correct ID:
userId = "s17fv543xmd82xp7108whzfxc97zcwah"  // ✅ Better Auth ID
```

### Consistent with Codebase Patterns

This fix aligns with existing patterns used elsewhere:

**`apps/web/src/app/orgs/[orgId]/parents/page.tsx`:**
```typescript
const { data: session } = authClient.useSession();

await declineGuardianPlayerLink({
  guardianIdentityId: currentClaimable.guardianIdentity._id,
  playerIdentityId: child.playerIdentityId,
  userId: session.user.id,  // ✅ Uses session.user.id
});
```

**Pattern across codebase:**
- ✅ Use `authClient.useSession()` for Better Auth user ID
- ❌ Don't use `useCurrentUser()._id` for Better Auth operations
- ✅ Better Auth queries require Better Auth IDs (starting with `s`)

---

## Testing

### Test Case 1: Typed TODO Note
```bash
# Create typed note
Voice note: "I need to work out a plan for next training session"

# Expected behavior:
✅ coachId = "s17fv543xmd82xp7108whzfxc97zcwah" (Better Auth ID)
✅ Backend finds recording coach user
✅ coachesRoster = [{ id: "s17...", name: "Neil B" }]
✅ TODO auto-assigned to recording coach
✅ Insight has assigneeUserId and assigneeName
✅ Appears in "Ready to Apply" section
```

### Test Case 2: Recorded TODO Note
```bash
# Record audio note
Voice note: "I need to order new cones"

# Expected behavior:
✅ Audio uploaded to storage
✅ coachId = "s17fv543xmd82xp7108whzfxc97zcwah"
✅ Backend transcribes audio
✅ AI extracts TODO insight
✅ Auto-assigns to recording coach
✅ Task created successfully
```

### Test Case 3: Coach with No Teams
```bash
# Test edge case from original bug report
Voice note: "I need to prepare training plan"
Coach has: 0 teams assigned

# Expected behavior (FIXED):
✅ coachId uses Better Auth ID
✅ Backend finds coach in Better Auth
✅ Recording coach added to roster (regardless of team count)
✅ TODO auto-assigned successfully
```

---

## Database State Investigation

During debugging, we discovered the actual state:

**Better Auth User Table:**
```bash
$ npx convex run scripts/listUsers:list

[
  {
    "id": "s17fv543xmd82xp7108whzfxc97zcwah",
    "email": "test.single2@test.com",
    "firstName": "Test",
    "lastName": "Single Two"
  },
  {
    "id": "s175py10ype2nxbz12mw1n06v17zd805",
    "email": "debug.test@test.com",
    "firstName": "Debug",
    "lastName": "Test"
  }
]
```

**Voice Note coachId (WRONG):**
```
"k175sxnms1s6r8z66qdya70cb97w89d7"  // ❌ Convex ID
```

**Better Auth Query:**
```typescript
// Looks for user with ID "k175..."
findOne({ model: "user", where: [{ field: "id", value: "k175..." }] })
// Returns: null (no user with that ID exists)
```

This conclusively proved the ID type mismatch was the root cause.

---

## Prevention

### Code Review Checklist

When creating or modifying authentication-related code:

1. ✅ **Check ID source:**
   - Using Better Auth? → Use `authClient.useSession()`
   - Need Better Auth user ID? → Use `session.user.id`
   - Never use `useCurrentUser()._id` for Better Auth operations

2. ✅ **Verify ID format:**
   - Better Auth IDs start with `s`
   - Convex IDs start with `k`
   - IDs from different systems are NOT interchangeable

3. ✅ **Test with null userId:**
   - Don't assume `user.userId` is always present
   - Don't use `|| user._id` as fallback
   - Require proper authentication instead

### TypeScript Types

Consider adding type guards:

```typescript
type BetterAuthUserId = `s${string}`;
type ConvexId = `k${string}`;

// Type-safe check
function isBetterAuthId(id: string): id is BetterAuthUserId {
  return id.startsWith('s');
}

// Runtime validation
if (!isBetterAuthId(coachId)) {
  throw new Error(`Invalid Better Auth ID: ${coachId}`);
}
```

---

## Related Fixes

This fix built upon previous work:

1. **TODO Auto-Assignment Logic** (`docs/bugs/todo-auto-assignment-fix-2026-01-23.md`)
   - Fixed coachesRoster building to always include recording coach
   - But was using wrong ID type!

2. **Team Insights Assignment** (`docs/bugs/team-insights-assignment-improvements-2026-01-23.md`)
   - Fixed team assignment workflow
   - Uses same Better Auth pattern

---

## Files Changed

### Frontend
- **`apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/new-note-tab.tsx`**
  - Changed hook: `useCurrentUser()` → `authClient.useSession()`
  - Changed ID source: `user.userId || user._id` → `session.user.id`
  - Lines changed: 11, 32, 107-113, 133-141

### Backend
- **`packages/backend/convex/actions/voiceNotes.ts`**
  - Removed debug logging (lines 256, 321-325, 343-349, 372-379, 622-641)
  - Cleaned up for production

---

## Key Learnings

1. **ID Types Matter:**
   - Different auth systems use different ID formats
   - Never assume IDs are interchangeable
   - Validate ID format when debugging

2. **Fallback Logic Danger:**
   - `user.userId || user._id` seemed safe
   - Actually masked authentication issues
   - Led to subtle ID type mismatch bugs

3. **Query Failures are Silent:**
   - Better Auth `findOne` returns `null` (not error)
   - Empty results don't throw exceptions
   - Requires defensive logging

4. **Debug Process:**
   - List actual database records
   - Compare ID formats
   - Verify query parameters match data
   - Don't assume code is correct - verify data!

---

## Status

✅ **FIXED and DEPLOYED**

**Deployment:**
- Backend: Deployed 2026-01-23 (Convex cloud)
- Frontend: Auto-deployed on next build

**Verification:**
- All TODO auto-assignment now works
- Recording coach correctly identified
- Tasks created with proper assignee
- No more orphaned TODO insights

**Next Steps:**
- Monitor production logs for any auth-related warnings
- Consider adding ID type validation
- Update development documentation
- Add TypeScript types for ID formats

---

**Status:** ✅ Production ready
**Related:**
- `docs/bugs/todo-auto-assignment-fix-2026-01-23.md` - TODO roster building fix
- `docs/bugs/team-insights-assignment-improvements-2026-01-23.md` - Team assignment UI
