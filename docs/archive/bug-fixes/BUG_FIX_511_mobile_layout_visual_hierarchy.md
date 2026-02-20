# Bug Fix #511: Mobile Layout Visual Hierarchy on /r/ Review Microsite

## Issue
**GitHub:** [#511](https://github.com/NB-PDP-Testing/PDP/issues/511)
**Title:** FIX: Review and align the /r/ mobile layout to be consistent with main site and improve WhatsApp messages

## Root Cause

The `InsightCard` component in `review-queue.tsx` used a plain white `<Card className="shadow-sm">` for every insight variant (injury, review, todo, team). On mobile, all cards looked identical regardless of urgency — coaches could not distinguish at a glance which items needed action from which could simply be accepted.

The main site (`insights-tab.tsx`) uses `border-2` with coloured card backgrounds to signal urgency: amber/orange for items needing attention, blue/green for ready-to-apply items. The microsite only had coloured left borders at the *section* level, which is too subtle when scrolling through a list of cards on mobile.

The card title also lacked `font-semibold`, reducing visual weight compared to the main site.

## What Was Changed

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

## Previously Fixed (PR #524)

- WhatsApp message showing "Unknown" for team-level insights
- Microsite team selector for team notes without an assigned team

## Files Modified

- `apps/web/src/app/r/[code]/review-queue.tsx`
