# Bug Fix: #586 — Add Player: cannot assign player to a team at creation time

## Issue
https://github.com/NB-PDP-Testing/PDP/issues/586

**Title:** Add Player: cannot assign player to a team at creation time

## Root Cause

The Add Player dialog had no team assignment field. The `createPlayer` function performed:
- Step 1: Create/find player identity
- Step 1b: Store federation IDs
- Step 2: Enroll in organisation
- Step 3: Link guardian

There was no Step 4 for team assignment, requiring admins to navigate to the player record or team page afterwards to complete the assignment.

## What Was Changed

**File:** `apps/web/src/app/orgs/[orgId]/admin/players/page.tsx`

1. **`AddPlayerFormData` type** — added optional `teamId: string` field.
2. **`emptyFormData`** — added `teamId: ""` default.
3. **Mutations** — wired `api.models.teamPlayerIdentities.addPlayerToTeam` (already used in the teams page).
4. **`createPlayer` function** — added Step 4: if `teamId` is set, call `addPlayerToTeam` with the new `playerIdentityId`, `teamId`, `organizationId`, and current season.
5. **Form JSX** — added an "Assign to Team (Optional)" `<Select>` after the Sport field. The list is filtered to active teams matching the selected sport (if any), and falls back to all active teams when no sport is selected.
6. **Toast description** — extended to mention "Added to team." when a team was assigned.

## Why This Approach

- `addPlayerToTeam` is already battle-tested (used in the team management page).
- The team field is optional — no existing workflows are broken.
- Sport-based filtering reduces noise when a sport is selected, matching the issue's suggested behaviour.
- All changes are in a single file; no backend changes required.
