# Bug Fix #492: Team-Level Voice Notes Routed to Unmatched Players on Review Microsite

## Issue
**GitHub:** [#492](https://github.com/NB-PDP-Testing/PDP/issues/492)
**Title:** BUG: Review microsite displays team-level voice notes under Unmatched Players with player search dropdown

## Root Cause

`getCoachPendingItems` in `whatsappReviewLinks.ts` had two problems:

1. **`unmatched` filter too broad:** Caught any insight with `!playerIdentityId` that wasn't `team_culture` or `todo`. This included team-level insights where the AI never identified any specific player — notes that should go to Team Notes, not Unmatched Players.

2. **`teamNotes` filter too narrow:** Only caught `category === "team_culture"`. A team performance note classified as `"performance"` (or any other category) with no player fell through to `unmatched` instead.

**Key distinction:**
- *Truly unmatched*: AI mentioned a specific player by name (`playerName` is set) but couldn't match them to a DB record → needs player assignment.
- *Team-level*: No `playerName`, no `playerIdentityId` — the note is about the team, not any individual → should display in Team Notes.

## What Was Changed

**File:** `packages/backend/convex/models/whatsappReviewLinks.ts`

### `unmatched` filter — added `!!i.playerName` condition
```ts
// Before
!i.playerIdentityId &&
i.status === "pending" &&
i.category !== "team_culture" &&
i.category !== "todo"

// After
!i.playerIdentityId &&
!!i.playerName &&          // Only unmatched if AI found a player name
i.status === "pending" &&
i.category !== "team_culture" &&
i.category !== "todo"
```

### `teamNotes` filter — expanded to catch all playerless, nameless insights
```ts
// Before
i.category === "team_culture" && i.status === "pending"

// After
i.status === "pending" &&
(i.category === "team_culture" ||
  (!(i.playerIdentityId || i.playerName) &&
    i.category !== "injury" &&
    i.category !== "todo"))
```

The frontend `teamNotes` section and `variant="team"` rendering already existed and handles these items correctly — no frontend changes required.

## Files Modified

- `packages/backend/convex/models/whatsappReviewLinks.ts`
