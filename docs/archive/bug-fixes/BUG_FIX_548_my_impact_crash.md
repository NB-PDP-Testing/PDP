# BUG FIX #548 — Voice Notes: My Impact Crash

## Issue
**GitHub Issue:** #548
**Title:** UAT - voice Note: My Impact Bug
**Symptom:** Visiting the My Impact tab in Voice Notes caused an immediate crash: "Something went wrong / An error occurred while loading this page."

## Root Cause

The `getCoachImpactSummary` Convex query (in `packages/backend/convex/models/voiceNotes.ts`) builds an `injuriesRecorded` array from `voiceNoteInsights` with category `"injury"` or `"medical"`. The return validator declares `playerIdentityId: v.id("playerIdentities")` as **non-optional**.

However, the `voiceNoteInsights` schema declares `playerIdentityId` as `v.optional(v.id("playerIdentities"))`. An injury insight existed in the database with `playerName: "Alex"` but no `playerIdentityId` (the AI identified a player name but couldn't match them to a player identity record). When Convex validated the query's return value, it found `undefined` where a required ID was expected, threw a server-side validation error, and the frontend received an error response — causing the crash.

## What Was Changed

**File:** `packages/backend/convex/models/voiceNotes.ts` (line 2541)

Added `&& !!insight.playerIdentityId` to the `injuryInsights` filter so unmatched injury insights (those without a resolved player) are excluded from the returned array.

**Before:**
```typescript
const injuryInsights = insightsInRange.filter(
  (insight) =>
    insight.category === "injury" || insight.category === "medical"
);
```

**After:**
```typescript
const injuryInsights = insightsInRange.filter(
  (insight) =>
    (insight.category === "injury" || insight.category === "medical") &&
    !!insight.playerIdentityId
);
```

## Why This Fix Is Correct

Injury insights without a `playerIdentityId` cannot be meaningfully displayed in the My Impact tab — the frontend uses `playerIdentityId` to link directly to the player's health passport. Excluding unmatched injuries is the correct behaviour; they will still appear in the coach's History tab where the full insight can be reviewed and manually matched.

## Files Modified

- `packages/backend/convex/models/voiceNotes.ts` — 1-line filter change in `getCoachImpactSummary`
