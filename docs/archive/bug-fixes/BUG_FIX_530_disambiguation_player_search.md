# Bug Fix #530 — Disambiguation: "None of these" + Player Search

**Issue:** [#530 — Unable to resolve player name](https://github.com/NB-PDP-Testing/PDP/issues/530)

---

## Root Cause Analysis

Two separate problems on the Voice Notes disambiguation page (`/coach/voice-notes/disambiguation/[artifactId]`):

### Problem 1: "None of these" was a two-step UX that wasn't obvious

Clicking "None of these match" only selected a radio option — it did not dismiss the card. A "Mark as Unresolved" confirm button then appeared below all the candidates, which users did not notice or understand needed a second click. The underlying `rejectResolution` mutation was correct; it was purely a UX issue.

Additionally, the "Skip All Remaining" bottom-bar button called `skipResolution`, which only logs analytics and **does not change the status** of resolutions. Items remained in `needs_disambiguation` status and continued to appear in the banner and disambiguation queue after the user clicked it — making it appear as if nothing happened.

### Problem 2: No way to find the correct player when AI candidates were wrong

The AI entity resolution produces up to 3 fuzzy-match candidates. If none are correct (e.g. the voice-recognised name is garbled), there was no way to search the full org player roster to find the right player.

---

## What Was Changed

**File:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]/page.tsx`

### UX Changes

- **Removed** the "None of these match" radio button + hidden confirm flow.
- **Added** a visible "Dismiss" button (calls `rejectResolution` directly — single click, no confirm needed). This sets status to `"unresolved"`, removing the card from the queue immediately.
- **Added** a "Search all players" button that expands an inline search input. Typing ≥ 2 characters filters all org-enrolled players client-side and lists matches. Clicking a result immediately resolves the mention to that player via the existing `resolveEntity` mutation (with `score: 1.0` for a manual match).

### "Skip All Remaining" → "Dismiss All Remaining"

- **Changed** the bottom-bar button from `skipResolution` (analytics-only, no status change) to `rejectResolution` (sets status to `"unresolved"`).
- **Renamed** the button to "Dismiss All Remaining" to accurately describe what it does.
- This ensures all remaining items are actually removed from the disambiguation queue.

### Player Search Implementation

- Loaded `api.models.orgPlayerEnrollments.getPlayersForOrg` at the page level (existing public query, no backend changes).
- Passed the player list down to each `MentionGroupCard` as `orgPlayers`.
- Client-side filtering: `player.name.toLowerCase().includes(searchTerm)`, showing up to 8 results.
- Selecting a search result calls `onResolve` with `{ entityType: "player", entityId: player.playerIdentityId, entityName: player.name, score: 1.0, matchReason: "manual_search" }`.

---

## Files Modified

- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]/page.tsx`

No backend changes required. The existing `resolveEntity` and `rejectResolution` mutations already supported the needed operations.
