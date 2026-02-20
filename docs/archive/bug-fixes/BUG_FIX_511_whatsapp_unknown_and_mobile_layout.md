# Bug Fix #511: WhatsApp Unknown Display, Mobile Layout, and Org Confirmation Prompt

## Issue
**GitHub:** [#511](https://github.com/NB-PDP-Testing/PDP/issues/511)
**Title:** WhatsApp message showing "Unknown", mobile layout inconsistency, repeated org confirmation prompts

## Three Problems Fixed

---

### Problem 1: "Unknown" in WhatsApp message text

**Root Cause:**
Two routing bugs in `applyInsightsWithTrust()` in `whatsapp.ts`:
1. Team-culture insights with no `teamId` were routed to the `unmatched` bucket → displayed as `'Unknown' not in roster`
2. Non-standard v2 pipeline categories (`tactical`, `performance`) with no player were routed to `needsReview` with `playerName: null` → displayed as `"Unknown: tactical"`

**Fix:**
- Route `isTeamCulture && !hasTeam` to `needsReview` (with `reason: "team_unassigned"`) instead of `unmatched`
- Change `needsReview` display fallback from `|| "Unknown"` to `|| "Team"`
- Add `"tactical"` to the `formatCategory()` map

**Files:** `packages/backend/convex/actions/whatsapp.ts`

---

### Problem 2: Microsite doesn't allow assigning team note to a specific team

**Root Cause:**
`saveTeamNoteFromReview` hardcoded `teamId: "unspecified"` and the review UI had no way for coaches to pick a team when multiple teams were available.

**Fix:**
- `getCoachPendingItems` now returns `teamId` for each team note
- `saveTeamNoteFromReview` accepts optional `teamId`/`teamName` args
- `/r/[code]` review microsite shows an inline team `<Select>` for team notes that lack a `teamId` when the coach has multiple teams

**Files:**
- `packages/backend/convex/models/whatsappReviewLinks.ts`
- `apps/web/src/app/r/[code]/review-queue.tsx`

---

### Problem 3: Multi-org coaches repeatedly prompted to "confirm org"

**Root Cause:**
`SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000` (2 hours) in `whatsappMessages.ts` — too short for a working day. After 2h without a WhatsApp message, multi-org coaches are asked "Which club is this for?" again even when context hasn't changed.

**Fix:**
Extended session timeout from 2h to 24h so coaches aren't repeatedly prompted throughout a working day.

**File:** `packages/backend/convex/models/whatsappMessages.ts` line 25

---

### Problem 4: Mobile team selector too small

**Root Cause:**
Inline team selector in review-queue used `h-8 text-xs` — very small tap target on mobile, no label explaining its purpose.

**Fix:**
- Added "Assign to team:" label above the selector
- Increased selector height `h-8` → `h-10` and text `text-xs` → `text-sm`

**File:** `apps/web/src/app/r/[code]/review-queue.tsx`

---

## Files Modified

- `packages/backend/convex/actions/whatsapp.ts`
- `packages/backend/convex/models/whatsappReviewLinks.ts`
- `packages/backend/convex/models/whatsappMessages.ts`
- `apps/web/src/app/r/[code]/review-queue.tsx`

## PR

[#524](https://github.com/NB-PDP-Testing/PDP/pull/524)
