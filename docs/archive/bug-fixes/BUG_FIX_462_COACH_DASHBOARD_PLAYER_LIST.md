# Bug Fix #462: Players Not Shown on Coach Dashboard Overview

## Issue
**GitHub:** [#462](https://github.com/NB-PDP-Testing/PDP/issues/462)
**Title:** UAT testing: Players are not being shown on coach's dashboard overview

## Root Cause

The coach dashboard (`coach-dashboard.tsx`) renders the `SmartCoachDashboard` component which shows team cards with aggregated stats (player count, avg skill, strengths/weaknesses). However, no player roster/table was rendered anywhere on the page.

The full data pipeline was functional:
- `getPlayersForCoachTeams` query fetches players correctly
- `playersWithTeams` useMemo enriches players with team names
- `filteredPlayers` useMemo applies team/search/age group filters
- Clicking a team card correctly sets `teamFilter` and `selectedTeam`

But the `SmartCoachDashboard` component only used the `players` prop for analytics calculations (team averages, insights, AI recommendations) -- it never rendered individual player rows.

The original MVP app (`mvp-app/src/PDPMicrosite.tsx`) included a player table directly on the dashboard page below the team cards, but this was not carried over when rebuilding the coach dashboard.

## What Was Changed

**File:** `apps/web/src/app/orgs/[orgId]/coach/coach-dashboard.tsx`

Added a sortable player roster table between the `SmartCoachDashboard` and `CoachNotesSection` components. The table:

- Shows all coach's players when no team is selected
- Filters to the selected team's players when a team card is clicked
- Displays columns: Name (with initials avatar), Team(s) (with badges), Age Group, Last Review (color-coded), Actions (View/Edit)
- Supports sortable columns (click column header to sort)
- Is responsive: Age Group hidden on mobile, Last Review hidden on tablet
- Clicking a player row navigates to their passport page

Uses the existing `PlayerTeamBadges` component for team display and reuses the already-computed `filteredPlayers` data (no new queries needed).

## Files Modified

- `apps/web/src/app/orgs/[orgId]/coach/coach-dashboard.tsx` - Added player roster table, sort state, and sorted players memo
