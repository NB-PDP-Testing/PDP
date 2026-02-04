# Bug Fix #319: Voice Notes Admin - Coach Name Display

**Issue**: [#319](https://github.com/NB-PDP-Testing/PDP/issues/319)
**Fixed**: 2026-02-04
**Status**: ✅ Complete

## Problem

The admin voice notes page (`/orgs/[orgId]/admin/voice-notes`) was displaying coach IDs instead of coach names, making it difficult for admins to understand who created each voice note.

**Before**:
```
Coach ID: k17aqe55...
```

**After**:
```
John Smith
```

Additionally, insight status information was not detailed enough - admins couldn't quickly see which insights were pending vs applied vs dismissed.

## Root Cause

The backend query `getAllVoiceNotes` was returning raw voice note data without enriching it with coach names. This was an N+1 query waiting to happen if we fetched names on the frontend.

## Solution

### Backend Changes

**File**: `packages/backend/convex/models/voiceNotes.ts`

Updated `getAllVoiceNotes` query to:
1. Batch fetch unique coach IDs to avoid N+1 queries
2. Use Better Auth adapter with correct `_id` field (NOT `id`)
3. Build a `coachNameMap` using `user.name` field (per CLAUDE.md standards)
4. Enrich each note with `coachName` before returning

**Pattern Used**: Followed existing pattern from `getVoiceNotesForCoachTeams` query (lines 277-314)

**Key Code**:
```typescript
// Batch fetch coach names to avoid N+1 queries
const uniqueCoachIds = Array.from(
  new Set(notes.map((note) => note.coachId).filter((id): id is string => !!id))
);

const coachNameMap = new Map<string, string>();
await Promise.all(
  uniqueCoachIds.map(async (coachId) => {
    const coachResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [{ field: "_id", value: coachId, operator: "eq" }],
      }
    );

    if (coachResult) {
      const coach = coachResult as { name?: string; email?: string };
      const coachName = coach.name || coach.email || "Coach";
      coachNameMap.set(coachId, coachName);
    }
  })
);

// Enrich notes with coach names
return notes.map((note) => ({
  ...note,
  coachName: note.coachId
    ? coachNameMap.get(note.coachId) || "Unknown Coach"
    : "Unknown Coach",
}));
```

### Frontend Changes

**File**: `apps/web/src/app/orgs/[orgId]/admin/voice-notes/page.tsx`

1. **Coach Name Display** (line 332-340):
   - Changed from `Coach ID: {note.coachId.slice(0, 8)}...`
   - To `{note.coachName}`

2. **Insight Status Indicators** (line 379-430):
   - Added granular status badges: pending, applied, dismissed, auto-applied
   - Each status has distinct styling:
     - Pending: outline badge
     - Applied: default (blue) badge
     - Dismissed: secondary (gray) badge
     - Auto-applied: green badge

3. **Individual Insight Display** (line 443-474):
   - Added status prefixes: ✓ Applied, ✓ Auto, ✗ Dismissed, ⏳ Pending
   - Makes it immediately clear what action was taken on each insight

## Better Auth User Data Pattern

This fix follows the critical patterns documented in CLAUDE.md:

✅ Use `user._id` for user ID (NOT `user.id`)
✅ Use `user.name` for display name (NOT `user.firstName`/`user.lastName`)
✅ Use `user.email` as fallback when name is missing
✅ Query users with `field: "_id"` (NOT `field: "userId"`)

## Performance Impact

- **Before**: Potential for N+1 queries if coach names were fetched per-note
- **After**: Single batch fetch using `Promise.all` with Map lookup (O(1))
- **Pattern**: Follows performance optimization guidelines in CLAUDE.md

## Testing

1. ✅ TypeScript compilation passes
2. ✅ Backend query returns `coachName` field
3. ✅ Frontend displays coach names instead of IDs
4. ✅ Insight status indicators show pending/applied/dismissed counts
5. ✅ Individual insights show status prefixes

## Additional Improvements

Beyond the original bug report, this fix also:
- Shows metadata about each voice note (source: WhatsApp, App, etc.)
- Displays insight status breakdown (pending, applied, dismissed, auto-applied)
- Makes it easier for admins to track system adoption and coach activity

## Files Changed

- `packages/backend/convex/models/voiceNotes.ts` - Added coach name enrichment
- `apps/web/src/app/orgs/[orgId]/admin/voice-notes/page.tsx` - Updated UI to show coach names and detailed status

## References

- GitHub Issue: #319
- Existing Pattern: `getVoiceNotesForCoachTeams` query (voiceNotes.ts:197-347)
- Documentation: CLAUDE.md "Better Auth User Data Patterns" section
