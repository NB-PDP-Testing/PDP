# Bug Fix: Voice Insights — Unknown Coach Name, Missing Edit & Delete

**Issue:** #538
**Title:** UAT Unable to Update or delete a note made about a player
**Branch:** `jkobrien/538_Add_UpdateandDelete`

---

## Problems

Three issues reported in UAT:

1. **"Unknown Coach"** shown on applied insights instead of the actual coach's name
2. **No edit functionality** for applied insights on the player profile page
3. **No delete functionality** for applied insights on the player profile page

---

## Root Causes

### 1. Coach name lookup uses wrong field

In `getVoiceNotesForPlayer`, the code resolved coach names from Better Auth user records using `coach.firstName` and `coach.lastName`:

```ts
// BROKEN — Better Auth stores the display name in `name`, not firstName/lastName
if (coach.firstName || coach.lastName) {
  coachMap.set(
    uniqueCoachIds[i],
    `${coach.firstName || ""} ${coach.lastName || ""}`.trim()
  );
}
```

Better Auth stores the display name in the `name` field. The guard always evaluated to `false`, so no entry was added to `coachMap`, causing every coach to fall back to "Unknown Coach".

### 2. No edit/delete UI on InsightCard

`InsightCard` had no `onEdit` or `onDelete` props. There was no way for a coach to edit or delete an applied insight from the player profile page.

### 3. No removeInsight mutation

A `updateInsightContent` mutation already existed, but there was no `removeInsight` mutation to delete an insight. Without this backend mutation, delete functionality could not be implemented.

---

## Fix

### 1. `packages/backend/convex/models/voiceNotes.ts`

**Coach name fix** — Changed the coach name lookup to use `coach.name`:
```ts
const coachName = coach.name || coach.email || "Coach";
coachMap.set(uniqueCoachIds[i], coachName);
```

**New `removeInsight` mutation** — Added a public mutation that:
- Authenticates the user and verifies they authored the voice note
- Removes the insight from the `voiceNotes.insights` embedded array
- Updates the corresponding `voiceNoteInsights` record status to `dismissed`

### 2. `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/insight-card.tsx`

Added optional `onEdit` and `onDelete` props:
- **Edit**: Opens a Dialog with title and description fields pre-populated. Coach can save changes.
- **Delete**: Shows an inline confirmation ("Delete insight? Confirm / Cancel") before calling `onDelete`.
- Both actions only render when the corresponding prop is provided (non-coach roles don't get them).

### 3. `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/voice-insights-section-improved.tsx`

Added `useMutation` hooks for `updateInsightContent` and `removeInsight`. Created `handleEditInsight` and `handleDeleteInsight` handlers that call the mutations and display `toast` feedback. Passed `onEdit`/`onDelete` to `InsightCard` when `isCoach === true` (in both compact expanded view and detailed view).

---

## Files Modified

| File | Change |
|---|---|
| `packages/backend/convex/models/voiceNotes.ts` | Fix coach name lookup (`name` not `firstName`/`lastName`); add `removeInsight` mutation |
| `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/insight-card.tsx` | Add `onEdit` and `onDelete` props with dialog and inline confirmation UI |
| `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/voice-insights-section-improved.tsx` | Wire `updateInsightContent` and `removeInsight` mutations; pass handlers to `InsightCard` when coach |

---

## Testing

1. Navigate to a player profile as a coach
2. Open the Voice Insights section — coach names should now display correctly (not "Unknown Coach")
3. Expand an insight in compact view (or switch to detailed view)
4. Click **Edit** → a dialog opens with the current title and description pre-filled → update and save → insight updates in-place
5. Click **Delete** → inline confirmation appears → click **Confirm** → insight is removed from the list
6. As a parent, verify that Edit and Delete buttons are NOT shown
