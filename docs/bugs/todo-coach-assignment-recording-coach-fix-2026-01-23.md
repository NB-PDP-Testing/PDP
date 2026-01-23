# TODO Coach Assignment - Recording Coach Fix
**Date:** 2026-01-23
**Issue:** Assign Coach modal showing wrong default coach for TODO insights
**Status:** ✅ FIXED

## Problem Summary

When clicking "Assign Coach" on an unassigned TODO insight, the modal was showing the **currently logged-in coach** as the default assignee, rather than the **coach who recorded the voice note**.

### Example Scenario
1. Coach A records a voice note saying "need to order new cones"
2. AI extracts TODO insight but can't auto-assign (ambiguous phrasing)
3. Coach B (different coach) opens the insights tab
4. Coach B clicks "Assign Coach" on the TODO
5. **BUG:** Modal shows "You (Coach B)" as suggested assignee
6. **EXPECTED:** Modal should show "Coach A" (who recorded the note) as suggested

## Root Cause Analysis

### Data Flow Investigation

**1. Voice Note Schema** ✅ Correctly stores recording coach
```typescript
// schema.ts
voiceNotes: defineTable({
  coachId: v.optional(v.string()), // Recording coach ID - STORED CORRECTLY
  // ... other fields
})
```

**2. AI Auto-Assignment Logic** ✅ Uses recording coach correctly
```typescript
// voiceNotes.ts - buildInsights action (lines 322-410)
const coachesRoster: Array<{ id: string; name: string }> = [];

// ALWAYS add the recording coach first
if (note.coachId) {
  const recordingCoachUser = await ctx.runQuery(
    components.betterAuth.userFunctions.getUserByStringId,
    { userId: note.coachId }
  );
  if (recordingCoachUser) {
    coachesRoster.push({
      id: note.coachId,
      name: coachName,
    });
  }
}
```

**3. Frontend Data Mapping** ❌ PROBLEM: Not passing coachId through
```typescript
// insights-tab.tsx (BEFORE FIX)
const pendingInsights = voiceNotes?.flatMap((note) =>
  note.insights
    .filter((i) => i.status === "pending")
    .map((i) => ({
      ...i,
      noteId: note._id,
      noteDate: note.date
      // MISSING: note.coachId <- Not passed through!
    }))
)
```

**4. Modal State** ❌ PROBLEM: Not tracking recording coach
```typescript
// insights-tab.tsx (BEFORE FIX)
type AssigningCoachInsight = {
  noteId: Id<"voiceNotes">;
  insightId: string;
  title: string;
  coachName?: string; // This was not used correctly
} | null;
```

**5. Modal Display** ❌ PROBLEM: Showing session user instead of recording coach
```typescript
// insights-tab.tsx (BEFORE FIX)
<button onClick={() => coachUserId && handleAssignCoach(coachUserId, coachName)}>
  <div>You ({coachName})</div> {/* coachName from session, not recording coach! */}
  <span>Suggested</span>
</button>
```

## The Fix

### Change 1: Pass Recording Coach ID Through Data Mapping

**File:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`

```typescript
// BEFORE
const pendingInsights = voiceNotes?.flatMap((note) =>
  note.insights
    .filter((i) => i.status === "pending")
    .map((i) => ({ ...i, noteId: note._id, noteDate: note.date }))
)

// AFTER
const pendingInsights = voiceNotes?.flatMap((note) =>
  note.insights
    .filter((i) => i.status === "pending")
    .map((i) => ({
      ...i,
      noteId: note._id,
      noteDate: note.date,
      noteCoachId: note.coachId, // ✅ Pass through recording coach ID
    }))
)
```

### Change 2: Update Modal State Type

```typescript
// BEFORE
type AssigningCoachInsight = {
  noteId: Id<"voiceNotes">;
  insightId: string;
  title: string;
  coachName?: string; // Not used correctly
} | null;

// AFTER
type AssigningCoachInsight = {
  noteId: Id<"voiceNotes">;
  insightId: string;
  title: string;
  recordingCoachId?: string; // ✅ Track the recording coach
} | null;
```

### Change 3: Pass Recording Coach When Opening Modal

```typescript
// BEFORE
setAssigningCoachInsight({
  noteId: insight.noteId,
  insightId: insight.id,
  title: insight.title,
  coachName: undefined,
})

// AFTER
setAssigningCoachInsight({
  noteId: insight.noteId,
  insightId: insight.id,
  title: insight.title,
  recordingCoachId: (insight as any).noteCoachId, // ✅ Pass recording coach ID
})
```

### Change 4: Display Recording Coach as Default Assignee

```typescript
// Modal now shows:
{assigningCoachInsight.recordingCoachId && (
  <>
    {(() => {
      // ✅ Find recording coach in fellow coaches list or use current coach
      const isCurrentUser =
        assigningCoachInsight.recordingCoachId === coachUserId;
      const recordingCoach = fellowCoaches?.find(
        (c) => c.userId === assigningCoachInsight.recordingCoachId
      );

      const displayName = isCurrentUser
        ? coachName
        : recordingCoach?.userName || "Recording Coach";

      return (
        <button onClick={() => handleAssignCoach(displayId, displayName)}>
          <div className="font-medium">
            {isCurrentUser ? `You (${displayName})` : displayName}
          </div>
          <div className="text-gray-500 text-xs">
            {isCurrentUser
              ? "You recorded this voice note"
              : "Recorded this voice note"}
          </div>
          <span>Suggested</span>
        </button>
      );
    })()}
  </>
)}
```

### Change 5: Filter Out Recording Coach from "Other Coaches" List

```typescript
// Don't show recording coach twice
{fellowCoaches
  .filter((coach) => coach.userId !== assigningCoachInsight.recordingCoachId)
  .map((coach) => (
    // ... render other coaches
  ))}
```

### Bonus Fix: Fellow Coaches Query

Also fixed the `getFellowCoachesForTeams` query which wasn't properly fetching coach details:

**File:** `packages/backend/convex/models/coaches.ts`

```typescript
// BEFORE (line 364-369)
const userResult = await ctx.runQuery(
  components.betterAuth.adapter.findOne,
  {
    model: "user",
    where: [{ field: "id", value: coach.userId, operator: "eq" }],
  }
);

// AFTER
const userResult = await ctx.runQuery(
  components.betterAuth.userFunctions.getUserByStringId,
  {
    userId: coach.userId,
  }
);
```

This ensures the fellow coaches list is properly populated with all coaches who share teams.

## New Behavior

### When Recording Coach Views Their Own TODO
```
┌─────────────────────────────────────────┐
│ Assign to Coach                         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────┐    │
│ │ ✅ You (Neil Barlow)            │    │
│ │    You recorded this voice note │    │
│ │                        Suggested│    │
│ └─────────────────────────────────┘    │
│                                         │
│ Or assign to another coach:             │
│ ┌─────────────────────────────────┐    │
│ │ Aoife Murphy                    │    │
│ │ aoife@club.ie        2 teams    │    │
│ └─────────────────────────────────┘    │
│ ┌─────────────────────────────────┐    │
│ │ John Smith                      │    │
│ │ john@club.ie         1 team     │    │
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### When Another Coach Views Someone Else's TODO
```
┌─────────────────────────────────────────┐
│ Assign to Coach                         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────┐    │
│ │ ✅ Neil Barlow                  │    │
│ │    Recorded this voice note     │    │
│ │                        Suggested│    │
│ └─────────────────────────────────┘    │
│                                         │
│ Or assign to another coach:             │
│ ┌─────────────────────────────────┐    │
│ │ Aoife Murphy                    │    │
│ │ aoife@club.ie        2 teams    │    │
│ └─────────────────────────────────┘    │
│ ┌─────────────────────────────────┐    │
│ │ John Smith                      │    │
│ │ john@club.ie         1 team     │    │
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## Complete TODO Assignment Flow

### 1. Voice Note Creation
```typescript
// Coach records: "need to order new cones"
createRecordedNote({
  orgId,
  coachId: recordingCoachUserId, // ✅ STORED
  audioStorageId,
  noteType: "general",
})
```

### 2. AI Transcription & Insight Extraction
```typescript
// Action: transcribeAudio -> buildInsights
// Builds coaches roster with recording coach FIRST
const coachesRoster = [
  { id: note.coachId, name: "Recording Coach" }, // ✅ Recording coach first
  // ... fellow coaches
];

// AI detects TODO but can't auto-assign (ambiguous phrasing)
// Returns: { category: "todo", assigneeUserId: null }
```

### 3. Frontend Display
```typescript
// insights-tab.tsx
// Shows TODO insight with "Assign Coach" button
// ✅ Passes recordingCoachId through data mapping
const pendingInsights = voiceNotes?.flatMap((note) =>
  note.insights.map((i) => ({
    ...i,
    noteCoachId: note.coachId // ✅ Available for modal
  }))
)
```

### 4. User Clicks "Assign Coach"
```typescript
// Opens modal with recording coach ID
setAssigningCoachInsight({
  noteId: insight.noteId,
  insightId: insight.id,
  title: insight.title,
  recordingCoachId: insight.noteCoachId, // ✅ Recording coach tracked
})
```

### 5. Modal Displays Recording Coach as Default
```typescript
// Modal logic:
// 1. If recordingCoachId === currentUserId -> "You (Name)"
// 2. If recordingCoachId !== currentUserId -> Find in fellowCoaches list
// 3. Show as green "Suggested" option
// 4. Fellow coaches list excludes recording coach (no duplicates)
```

### 6. Assignment & Task Creation
```typescript
// handleAssignCoach -> classifyInsight
await classifyInsight({
  noteId: assigningCoachInsight.noteId,
  insightId: assigningCoachInsight.insightId,
  category: "todo",
  assigneeUserId: selectedCoachId, // Could be recording coach or another
  assigneeName: selectedCoachName,
  createdByUserId: session?.user?.id, // Who clicked "assign"
  createdByName: session?.user?.name,
});

// Result: Task created and assigned to correct coach
```

## Why This Matters

### Scenario 1: Coach Records Voice Note for Themselves
- Coach A: "I need to order new cones tomorrow"
- AI detects first-person pronoun → auto-assigns to Coach A ✅
- No manual assignment needed

### Scenario 2: Coach Records Ambiguous TODO
- Coach A: "cones need ordering" (no "I")
- AI can't determine who → leaves unassigned
- **BEFORE FIX:** Any coach viewing it would see themselves as default ❌
- **AFTER FIX:** All coaches see Coach A (recording coach) as default ✅

### Scenario 3: Cross-Team Visibility
- Coach A records TODO about shared team
- Coach B (on same team) can view and assign
- **BEFORE FIX:** Coach B would see "You (Coach B)" as default ❌
- **AFTER FIX:** Coach B sees "Coach A - Recorded this voice note" as default ✅

## Testing Checklist

- [x] Recording coach sees "You" with correct name when viewing own TODO
- [x] Other coaches see recording coach's name (not their own)
- [x] Fellow coaches list populates correctly (fixed getUserByStringId)
- [x] Recording coach doesn't appear twice in the list
- [x] Modal shows "Suggested" badge on recording coach
- [x] Can assign to recording coach from modal
- [x] Can assign to fellow coaches from modal
- [x] Fallback works if no recording coach ID (old voice notes)

## Related Code References

### Backend
- `packages/backend/convex/schema.ts` - voiceNotes table (line 1350-1400)
- `packages/backend/convex/actions/voiceNotes.ts` - buildInsights (line 322-410)
- `packages/backend/convex/models/coaches.ts` - getFellowCoachesForTeams (line 302-386)
- `packages/backend/convex/betterAuth/userFunctions.ts` - getUserByStringId (line 116-155)

### Frontend
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`
  - AssigningCoachInsight type (line 78-83)
  - pendingInsights mapping (line 455-470)
  - "Assign Coach" button (line 733-750)
  - Assign Coach Dialog (line 1195-1335)

## Commit Summary

**Fixes:**
1. Pass recording coach ID through pending insights mapping
2. Update AssigningCoachInsight type to track recordingCoachId
3. Pass recordingCoachId when opening "Assign Coach" modal
4. Display recording coach as default assignee with context
5. Filter recording coach from "other coaches" list
6. Fix getFellowCoachesForTeams to use correct user lookup method

**Result:** TODO insights now correctly suggest the coach who recorded the voice note as the default assignee, with proper fallback to fellow coaches on shared teams.
