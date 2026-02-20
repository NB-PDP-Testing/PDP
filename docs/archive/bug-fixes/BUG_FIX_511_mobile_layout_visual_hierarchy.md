# Bug Fix #511: Mobile Layout Visual Hierarchy on /r/ Review Microsite

## Issue
**GitHub:** [#511](https://github.com/NB-PDP-Testing/PDP/issues/511)
**Title:** FIX: Review and align the /r/ mobile layout to be consistent with main site and improve WhatsApp messages

---

## Part 1: Mobile Card Visual Hierarchy (PR #525)

### Root Cause

The `InsightCard` component in `review-queue.tsx` used a plain white `<Card className="shadow-sm">` for every insight variant (injury, review, todo, team). On mobile, all cards looked identical regardless of urgency — coaches could not distinguish at a glance which items needed action from which could simply be accepted.

The main site (`insights-tab.tsx`) uses `border-2` with coloured card backgrounds to signal urgency: amber/orange for items needing attention, blue/green for ready-to-apply items. The microsite only had coloured left borders at the *section* level, which is too subtle when scrolling through a list of cards on mobile.

The card title also lacked `font-semibold`, reducing visual weight compared to the main site.

### What Was Changed

**File:** `apps/web/src/app/r/[code]/review-queue.tsx`

Added variant-based background and border colour to `InsightCard`, matching the main site's urgency convention:

| Variant | Background |
|---------|-----------|
| `injury` | `bg-red-50 border-red-200` |
| `unmatched` | `bg-amber-50 border-amber-200` |
| `review` | `bg-yellow-50 border-yellow-200` |
| `todo` | `bg-blue-50 border-blue-200` |
| `team` | `bg-green-50 border-green-200` |

Also added `font-semibold` to the insight title for stronger visual weight.

The `UnmatchedPlayerCard` already had `border-amber-200` and was not changed.

---

## Part 2: Player vs Team Insight Routing Fix (this PR)

### Root Cause

Three layers of the pipeline used different — and mutually inconsistent — definitions of "team-level" for the same insight data, causing player-specific insights to be routed to the Team Notes section and vice versa.

**Layer 1 — AI prompt (`voiceNotes.ts`):**
- `tactical` was not listed as a valid category despite the v2 pipeline emitting it.
- `performance` was declared PLAYER-SPECIFIC but coaches say things like "the team's performance was poor" — a valid team-wide observation with no appropriate category. The AI was forced to use `performance` with no `playerName`, which then hit the wrong routing logic downstream.

**Layer 2 — WhatsApp routing (`whatsapp.ts`):**
- `isTeamLevel` was defined as `isTeamCulture || !(playerIdentityId || playerName)` — any insight without a player was treated as team-level, including `performance` insights where the AI failed to extract a player name from genuinely player-specific speech.

**Layer 3 — Microsite routing (`whatsappReviewLinks.ts`):**
- The `teamNotes` filter (expanded in PR #492) caught all insights with neither `playerIdentityId` nor `playerName` (excluding injury and todo). This swept `performance` and `tactical` insights with no player into Team Notes.
- The `unmatched` filter required `!!playerName`, so insights with no player name could never reach the Unmatched Players section even if they were genuinely player-specific.

### Design Principle

Route based on **what IS SET**, not the absence of player data:
- `playerName` or `playerIdentityId` set → player path
- `teamName` or `teamId` set (and no player) → team path
- Neither set → ambiguous, goes to Unmatched for coach review

### What Was Changed

**`packages/backend/convex/actions/voiceNotes.ts` — AI prompt:**
- Added `tactical` as a valid category (can be player-specific with `playerName`, OR team-wide with `teamName` and no `playerName`)
- Clarified that `performance` is player-specific; team-wide performance observations must use `team_culture`
- Added rule: if a single voice note mentions both a player AND a team observation, create **two separate insights**

**`packages/backend/convex/models/whatsappReviewLinks.ts` — microsite routing:**
- `teamNotes` filter narrowed: now matches `team_culture` OR (`teamName` set AND no `playerName`). No longer captures all playerless, nameless insights.
- `unmatched` filter widened: removed `!!playerName` requirement; added `!teamName` exclusion. Nameless player-specific insights now correctly reach the Unmatched Players section.

**`packages/backend/convex/actions/whatsapp.ts` — WhatsApp routing:**
- `isTeamLevel` narrowed to: `isTeamCulture || (!!teamName && !playerName)`. Insights with no player AND no team are no longer silently treated as team-level.
- Team-unassigned check widened from `isTeamCulture && !hasTeam` to `isTeamLevel && !hasTeam`, so non-`team_culture` team-level insights (e.g. `tactical` with a `teamName` but no matched `teamId`) also prompt the coach to assign a team.

---

## Previously Fixed (PR #524)

- WhatsApp message showing "Unknown" for team-level insights
- Microsite team selector for team notes without an assigned team

---

## Files Modified

- `apps/web/src/app/r/[code]/review-queue.tsx`
- `packages/backend/convex/actions/voiceNotes.ts`
- `packages/backend/convex/models/whatsappReviewLinks.ts`
- `packages/backend/convex/actions/whatsapp.ts`
