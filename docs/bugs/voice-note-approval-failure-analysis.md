# Voice Note Approval Failure - Root Cause Analysis

**Discovered**: January 21, 2026
**Severity**: CRITICAL (Blocking coach workflow)
**Component**: Voice Notes → Parent Summaries approval flow

---

## Symptoms

Coach tries to approve a pending parent summary:
- Clicks "Approve & Share" button
- Gets error: **"Failed to approve summary. Please try again."**
- Summary remains in pending state

**Screenshot**: `/Users/neil/Desktop/Screenshots/WhatsApp Image 2026-01-20 at 22.56.48.jpeg`

---

## Root Cause Analysis

### The Bug

**File**: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/new-note-tab.tsx`
**Lines**: 103-107 (createRecordedNote) and 124-128 (createTypedNote)

**Issue**: `coachId` parameter is **NOT being passed** when creating voice notes.

```typescript
// CURRENT (BROKEN)
await createTypedNote({
  orgId,
  noteType,
  noteText: noteText.trim(),
  // ❌ coachId MISSING!
});

await createRecordedNote({
  orgId,
  noteType,
  audioStorageId: storageId,
  // ❌ coachId MISSING!
});
```

### The Chain of Failure

1. **Voice Note Creation** (new-note-tab.tsx:124-128)
   - Coach creates voice note
   - `coachId` parameter NOT passed to mutation
   - Voice note stored with `coachId: undefined`

2. **AI Generates Parent Summary** (coachParentSummaries.ts:200-206)
   ```typescript
   coachId: voiceNote.coachId || "",  // ← undefined becomes ""
   ```
   - Parent summary created with `coachId: ""`

3. **Coach Attempts Approval** (coachParentSummaries.ts:247-249)
   ```typescript
   if (summary.coachId !== user.userId) {
     throw new Error("Only the coach can approve this summary");
   }
   ```
   - `summary.coachId` is `""`
   - `user.userId` is actual user ID (e.g., "jh7f6k14...")
   - They don't match → **THROWS ERROR**

### Why This Wasn't Caught Earlier

1. **No user authentication in voice note creation**: The mutations accept `coachId` as optional parameter
2. **Silent failure**: Voice notes are created successfully, but with missing coachId
3. **Delayed error**: Bug only surfaces when coach tries to approve summaries
4. **No validation**: No backend validation that coachId must exist

---

## Impact

**Severity**: CRITICAL - Completely blocks coach-parent messaging pipeline

**Affected Workflows**:
- ❌ Coach cannot approve summaries
- ❌ Coach cannot suppress summaries
- ❌ Coach cannot edit summaries
- ❌ Parents never receive messages
- ❌ Entire Phase 1-3 pipeline broken

**Data Corruption**:
- All existing voice notes have `coachId: undefined` or `""`
- All pending summaries have `coachId: ""`
- Approval permanently broken until data fixed

---

## The Fix

### Option 1: Frontend Fix (Quick - RECOMMENDED)

**File**: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/new-note-tab.tsx`

**Add coachId parameter when creating voice notes**:

```typescript
// Get current user
const user = useCurrentUser(); // or authClient.useSession()

// Pass coachId to mutations
await createTypedNote({
  orgId,
  coachId: user?._id || user?.userId, // ← ADD THIS
  noteType,
  noteText: noteText.trim(),
});

await createRecordedNote({
  orgId,
  coachId: user?._id || user?.userId, // ← ADD THIS
  noteType,
  audioStorageId: storageId,
});
```

**Pros**:
- ✅ Simple one-line fix per mutation
- ✅ Fixes future voice notes immediately
- ✅ No schema changes needed

**Cons**:
- ❌ Doesn't fix existing broken data
- ❌ Need to verify user._id vs user.userId field

### Option 2: Backend Fix (More Robust)

**File**: `packages/backend/convex/models/voiceNotes.ts`

**Auto-populate coachId from authenticated user**:

```typescript
export const createTypedNote = mutation({
  args: {
    orgId: v.string(),
    // Remove coachId from args - auto-populate from auth
    noteText: v.string(),
    noteType: noteTypeValidator,
  },
  returns: v.id("voiceNotes"),
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const noteId = await ctx.db.insert("voiceNotes", {
      orgId: args.orgId,
      coachId: user.userId || user._id, // ← Auto-populate from auth
      date: new Date().toISOString(),
      type: args.noteType,
      transcription: args.noteText,
      transcriptionStatus: "completed",
      insights: [],
      insightsStatus: "pending",
    });

    // ... rest of handler
  },
});
```

**Pros**:
- ✅ More secure (can't spoof coachId)
- ✅ Simpler frontend code
- ✅ Consistent with auth best practices
- ✅ Future-proof

**Cons**:
- ❌ More changes required
- ❌ Need to update both mutations
- ❌ Still doesn't fix existing data

---

## Data Migration Needed

**Problem**: Existing voice notes and summaries have missing coachId

**Query to find affected records**:
```typescript
// In Convex dashboard
ctx.db.query("voiceNotes")
  .filter((note) => !note.coachId || note.coachId === "")
  .collect()

ctx.db.query("coachParentSummaries")
  .filter((summary) => !summary.coachId || summary.coachId === "")
  .collect()
```

**Migration Script Needed**:
1. Find all voice notes with missing coachId
2. Look up orgId from voice note
3. Find coach membership in that org (might be ambiguous if multiple coaches!)
4. Update voice note with correct coachId
5. Update all child summaries with same coachId

**Challenge**: If org has multiple coaches, which one created the note?
- Could use creation timestamp + coach activity patterns
- Could mark as "unknown" and require manual review
- Could infer from players mentioned in transcription

---

## User ID Field Verification Needed

**CRITICAL**: Need to verify which field to use from auth:
- `user._id`?
- `user.userId`?
- Something else?

**Check**:
1. What does `safeGetAuthUser` return?
2. What field is used in other mutations for user identification?
3. What's stored in Better Auth user table?

**Files to check**:
- `packages/backend/convex/models/members.ts` - see how userId is used
- `packages/backend/convex/models/users.ts` - see user object structure
- Other working mutations that set userId

---

## Recommended Path Forward

### Immediate (30 minutes)

1. ✅ **Verify user ID field**:
   - Check existing mutations for pattern
   - Determine: `user._id` vs `user.userId`

2. ✅ **Apply Frontend Fix**:
   - Update new-note-tab.tsx
   - Add coachId parameter to both mutations
   - Test voice note creation

3. ✅ **Test approval flow**:
   - Create new voice note with fix
   - Wait for AI processing
   - Verify approval works

### Short-term (2-3 hours)

4. ✅ **Backend Migration Script**:
   - Create mutation to fix existing data
   - Run on dev environment first
   - Identify any orphaned records

5. ✅ **Apply Backend Fix** (optional but recommended):
   - Move coachId to be auto-populated
   - Remove from frontend calls
   - More secure long-term

### Long-term (Next Sprint)

6. ✅ **Add Validation**:
   - Require coachId in schema
   - Add backend validation
   - Add E2E tests for approval flow

7. ✅ **Monitoring**:
   - Add alerts for missing coachId
   - Track approval success/failure rates
   - Log coachId mismatches

---

## Testing After Fix

### Manual Test
1. Login as coach
2. Create new voice note (typed or recorded)
3. Wait for AI processing
4. Navigate to Parents tab
5. Verify summary appears
6. Click "Approve & Share"
7. ✅ Should succeed without error
8. Check parent account - message should appear

### Automated Test
```typescript
test("coach can approve summary they created", async () => {
  // Create voice note as coach
  // Wait for summary generation
  // Approve summary
  // Verify status = "approved"
  // Verify no errors
});
```

---

## Related Files

**Frontend**:
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/new-note-tab.tsx` (fix here)
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/parents-tab.tsx` (error shown here)

**Backend**:
- `packages/backend/convex/models/voiceNotes.ts` (createTypedNote, createRecordedNote)
- `packages/backend/convex/models/coachParentSummaries.ts` (approveSummary, createParentSummary)

---

## Questions to Answer

1. **What's the correct user ID field?** `user._id` or `user.userId`?
2. **How many records are affected?** Run count query in Convex
3. **Can we identify original coach for orphaned notes?** Check metadata
4. **Should we prevent broken summaries from showing?** Filter by coachId exists

---

*Analysis created: January 21, 2026*
