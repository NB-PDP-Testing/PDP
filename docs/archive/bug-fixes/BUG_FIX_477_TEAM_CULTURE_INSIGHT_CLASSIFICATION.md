# Bug Fix #477: Team Culture Insight Misclassification

## Issue
**GitHub:** #477 — UAT - Voice note bug surrounding team update rather than player update

When a coach records a voice note mentioning both individual player performance and team-level feedback, the team-based insights are incorrectly treated as player-specific and prompt the user to assign them to a player. There is no option to classify as a "team update."

## Root Cause

Two interacting issues:

### 1. Backend: No sanitization of AI output for team-level categories
In `packages/backend/convex/actions/voiceNotes.ts`, when building `resolvedInsights` from AI responses, the code passed through `playerName` and `playerIdentityId` even when the insight category was `team_culture` or `todo`. The AI prompt instructs the model to set `playerName` to null for these categories, but LLMs don't always follow instructions — especially when team-level commentary naturally references individual players by name.

### 2. Frontend: Classification logic checked player fields before category
In `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`, the insight classification filters used a precedence order that checked for `playerIdentityId` and `playerName` first. Any insight with a `playerName` was classified as an "unmatched player insight" regardless of its `category` field. Team-level filters additionally required `!(playerIdentityId || playerName)`, so `team_culture` insights with a stray `playerName` were never routed to the team classification bucket.

## Fix

### Backend (`packages/backend/convex/actions/voiceNotes.ts`)
Added sanitization when building `resolvedInsights`: if the category is `team_culture` or `todo`, force `playerIdentityId` and `playerName` to `undefined` before storing.

### Frontend (`apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`)
Reordered the insight classification filters so that team-level categories (`team_culture`, `todo`) are checked **first**, before player field checks. This ensures correct display even for pre-existing data that has the inconsistency.

## Files Modified
- `packages/backend/convex/actions/voiceNotes.ts` — sanitize player fields on team-level insights
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx` — reorder classification to check category before player fields
