# ADR-VN2-011: Coach Context Helper Extraction

**Date:** 2026-02-06
**Status:** Accepted
**Context:** Phase 4, Story US-VN-015

## Context and Problem Statement

Both v1 `buildInsights` (voiceNotes.ts lines 340-471) and v2 `extractClaims` need the same coach context: player roster, team details, fellow coaches, and the recording coach's name. This context gathering logic is ~130 lines of code involving multiple database queries and Better Auth adapter calls. Duplicating it in `claimsExtraction.ts` would create a maintenance burden and divergence risk.

## Decision Drivers

- DRY principle: 130+ lines of identical logic should not be duplicated
- Actions (`internalAction`) cannot access `ctx.db` directly -- they must call queries via `ctx.runQuery`
- The helper must be callable from an action context
- v1 `buildInsights` should NOT be modified in Phase 4 (zero regression principle)

## Considered Options

### Option 1: Extract to `lib/coachContext.ts` as an `internalQuery`
**Pros:** Callable from any action via `ctx.runQuery`. Single source of truth. Clean separation. Can later refactor v1 to use it too.
**Cons:** Adds a new file. v1 still has its own inline copy until refactored.

### Option 2: Extract to `lib/coachContext.ts` as a plain function
**Pros:** Reusable function, can be imported directly.
**Cons:** Actions cannot use `ctx.db` -- a plain function would need a `QueryCtx` parameter, but actions only have `ActionCtx`. Would need to be wrapped in an internalQuery anyway.

### Option 3: Keep duplicated in both files
**Pros:** No new files. Each file is self-contained.
**Cons:** 130+ lines duplicated. Divergence risk when one side gets fixes the other doesn't.

### Option 4: Modify v1 `buildInsights` to call the shared helper
**Pros:** Eliminates duplication immediately.
**Cons:** Modifies the v1 pipeline in Phase 4, which the PRD explicitly prohibits. Risk of regression.

## Decision Outcome

**Chosen Option:** Option 1 -- Extract to `lib/coachContext.ts` as an `internalQuery`.

**Rationale:** This is the only option that satisfies all constraints: callable from actions, no v1 modification, no duplication. The `internalQuery` wrapper is necessary because actions call it via `ctx.runQuery(internal.lib.coachContext.gatherCoachContext, {...})`. v1 `buildInsights` can optionally be refactored to use it in a future phase.

## Implementation Notes

- File: `packages/backend/convex/lib/coachContext.ts`
- Function: `gatherCoachContext` (internalQuery)
- Args: `{ organizationId: v.string(), coachUserId: v.string() }`
- Returns: `{ players, teams, coaches, recordingCoachName, rosterJson, teamsJson, coachesJson }`
- Port logic from voiceNotes.ts lines 340-471 (player fetch, team resolution, coach roster, deduplication, JSON formatting)
- IMPORTANT: The helper calls `api.models.coaches.getCoachAssignments` (public query) and `api.models.coaches.getFellowCoachesForTeams` (public query) -- this is existing tech debt from v1 (public queries called from internalAction context). Do NOT fix in Phase 4.
- IMPORTANT: The recording coach name resolution uses `components.betterAuth.userFunctions.getUserByStringId` -- this returns an untyped object with `firstName`, `lastName`, `name`, `email` fields. The v1 code constructs the name as `firstName + lastName || name || email || "Unknown"`. Port this exact logic.

## Consequences

**Positive:** Single source of truth for coach context. v2 claims extraction reuses battle-tested v1 logic. Future v1 refactoring can adopt this helper.

**Negative:** Slight API overhead of an extra `ctx.runQuery` call vs inline code. Negligible given the context already makes 5+ database queries.

**Risks:** If v1's inline copy diverges from the shared helper (e.g., a bug fix applied only to v1), the two could produce different results. Mitigation: add a comment in v1 buildInsights noting the shared helper exists and should be refactored to use it.
