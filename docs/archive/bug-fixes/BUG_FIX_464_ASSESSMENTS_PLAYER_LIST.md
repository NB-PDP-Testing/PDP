# Bug Fix #464: Players Not Shown on Assessments Page

## Issue
**GitHub:** [#464](https://github.com/NB-PDP-Testing/PDP/issues/464)
**Title:** UAT bug on assessments page

## Root Cause

The assessments page (`coach/assess/page.tsx`) showed a search/filter bar displaying "Showing 19 players", but no players were actually visible on the page. The only way to select a player was through a small dropdown in the "Select Player & Sport" card. When no player was selected, the page showed a placeholder saying "Select Player & Sport - Choose a player and sport above to begin recording assessments."

This made it appear as though there was a broken filter preventing players from being displayed, when in reality the page simply lacked a visible player list.

## What Was Changed

**File:** `apps/web/src/app/orgs/[orgId]/coach/assess/page.tsx`

Replaced the empty state placeholder card with a clickable player card grid that displays all filtered players. Each card shows:

- Player initials avatar
- Full name
- Age group
- Chevron indicating the card is clickable

Clicking a player card selects them for assessment (same behavior as the dropdown). The dropdown remains available as an alternative selection method.

When no players match the current filters, a "No Players Found" empty state is shown instead.

## Files Modified

- `apps/web/src/app/orgs/[orgId]/coach/assess/page.tsx` - Replaced empty state with player card grid
