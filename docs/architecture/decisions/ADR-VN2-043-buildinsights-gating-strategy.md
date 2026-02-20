# ADR-VN2-043: buildInsights Gating Strategy

**Date:** 2026-02-08
**Status:** Accepted
**Context:** Phase 7D, Story US-VN-028

## Context and Problem Statement

The v2 pipeline (claims extraction, entity resolution, draft generation) is now complete through Phase 7C. However, the v1 `buildInsights` action is still being scheduled unconditionally in two places:

1. `createTypedNote` (voiceNotes.ts:638) -- schedules buildInsights regardless of whether the v2 artifact path was taken
2. `transcribeAudio` (actions/voiceNotes.ts:287) -- schedules buildInsights regardless of whether v2 artifacts exist

This means when v2 is enabled, BOTH pipelines run for every note. The defense-in-depth check inside buildInsights (line 328-338) catches this and short-circuits, but the function is still scheduled, invoked, and makes a database query to check for artifacts. This wastes Convex function calls.

## Decision Drivers

- Convex function calls have a direct billing impact (reduced from 3.2M to 800K in January 2026 optimization)
- Each unnecessary buildInsights invocation costs: 1 scheduler call + 1 function invocation + 1-2 DB queries
- Race condition risk: if buildInsights runs before the v2 artifact is linked, it might not find the artifact and proceed with v1 extraction
- Must not break the v1 fallback path for orgs where v2 is disabled

## Considered Options

### Option 1: Gate at scheduling sites (source gating)

**Approach:** Wrap the `ctx.scheduler.runAfter(buildInsights)` calls with v2 checks, so buildInsights is never scheduled when v2 is active.

In `createTypedNote`: use the existing `useV2` variable (already in scope from Phase 7A) to conditionally skip the buildInsights scheduling.

In `transcribeAudio`: use the existing `artifacts.length > 0` check (already in scope from Phase 3) to conditionally skip the buildInsights scheduling.

**Pros:**
- Zero wasted function calls when v2 is active
- No new database queries needed -- reuses existing variables
- Defense-in-depth check in buildInsights remains as a safety net
- Clear, readable logic: "if v2, do v2 things; if not, do v1 things"

**Cons:**
- Two sites to modify (but both are small, obvious changes)
- If a new scheduling site is added in the future, developer must remember to gate it

**Complexity:** Low
**Performance:** Eliminates 1 function call per note when v2 active
**Scalability:** Scales perfectly -- fewer calls = lower cost at any volume

### Option 2: Only gate inside buildInsights (status quo + log update)

**Approach:** Keep the current pattern where buildInsights is always scheduled but exits early when artifacts exist.

**Pros:**
- No changes to scheduling sites
- Single place for the decision

**Cons:**
- Still wastes 1 function invocation + 2 DB queries per note
- Scheduler overhead remains
- At 1000 notes/month, that is 1000+ wasted invocations

**Complexity:** None (no change)
**Performance:** No improvement

## Decision Outcome

**Chosen Option:** Option 1 -- Gate at scheduling sites

**Rationale:**
The existing variables are already in scope at both scheduling sites. The changes are minimal (wrapping an existing call in `if (!useV2)` or `if (artifacts.length === 0)`). This eliminates unnecessary function calls while keeping the defense-in-depth check as a safety net for edge cases.

## Implementation Notes

### createTypedNote (voiceNotes.ts)

The `useV2` boolean is already computed at line 586. Currently, buildInsights scheduling at line 638 is unconditional. Wrap it:

```typescript
// Only schedule v1 if v2 is NOT enabled
if (!useV2) {
  await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.buildInsights, {
    noteId,
  });
}
```

CRITICAL: Do NOT use if/else with the v2 block. Use a separate `if (!useV2)` for clarity.

### transcribeAudio (actions/voiceNotes.ts)

The `artifacts` array is already fetched at line 229. Currently buildInsights scheduling at line 287 is unconditional (after quality gates). Wrap it:

```typescript
// Only schedule v1 if no v2 artifact exists
if (artifacts.length === 0) {
  await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.buildInsights, {
    noteId: args.noteId,
  });
}
```

CRITICAL: Quality gate checks (reject/ask_user at lines 267-284) MUST remain before this gate. They apply to both pipelines and return null early.

### buildInsights defense-in-depth (unchanged logic, updated log)

The artifact check at lines 328-338 stays. Update the log message:

```typescript
console.warn(
  '[buildInsights] Defense-in-depth: v2 artifact found, skipping v1 extraction for note:',
  args.noteId
);
```

### Race Condition Analysis

**createTypedNote path:** No race condition. The `useV2` variable is evaluated synchronously within the same mutation transaction as the artifact creation. By the time the scheduler decision is made, the artifact already exists.

**transcribeAudio path:** No race condition. The artifacts are fetched at line 229 before the v2 transcript/claims creation (lines 233-263). The buildInsights gating at line 287 uses the same `artifacts` variable. Since `transcribeAudio` is a single action execution, there is no interleaving.

**WhatsApp audio path:** Potential timing concern. WhatsApp creates the artifact BEFORE calling `createRecordedNote`, then links the artifact AFTER. Since `createRecordedNote` creates its own artifact and link (lines 680-694), the `transcribeAudio` that runs after will find the artifact from `createRecordedNote` (which is linked immediately). The WhatsApp artifact becomes a duplicate. This is addressed by ADR-VN2-044 (skipV2).

## Consequences

**Positive:**
- Eliminates wasted function calls -- direct billing savings
- Cleaner logs -- no more "skipping" messages in normal operation
- Defense-in-depth remains for edge cases

**Negative:**
- Two sites to maintain (acceptable -- both are well-documented)

**Risks:**
- If a new entry point to buildInsights is added without gating, it would still be caught by defense-in-depth
- Mitigation: defense-in-depth check remains permanently

## References

- Phase 7D PRD: `scripts/ralph/prds/voice-gateways-v2/phases/PHASE7D_PRD.json`
- ADR-VN2-034: Dual processing elimination strategy (Phase 7A-7D planning)
- GitHub Issue #330: Performance optimization project
