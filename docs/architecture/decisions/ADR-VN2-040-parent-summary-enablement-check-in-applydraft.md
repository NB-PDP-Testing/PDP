# ADR-VN2-040: Parent Summary Enablement Check in applyDraft

**Status**: Accepted
**Date**: 2026-02-08
**Phase**: 7C
**Story**: US-VN-026

## Context

The v1 pipeline (`buildInsights` in `actions/voiceNotes.ts:940-977`) checks `isParentSummariesEnabled` for the coach + organization BEFORE scheduling `processVoiceNoteInsight`. This respects the coach's per-org preference to opt out of parent summary generation.

The Phase 7C PRD (US-VN-026) omits this check. The PRD instructs applyDraft to schedule `processVoiceNoteInsight` whenever `draft.playerIdentityId` exists, without checking whether the coach has enabled parent summaries.

## Decision

**Add a `parentSummariesEnabled` check before scheduling `processVoiceNoteInsight` in `applyDraft`.**

However, `applyDraft` is an `internalMutation` and cannot call `ctx.runQuery` for an internalQuery in the same transaction. It CAN use `ctx.db` directly since it's a mutation.

### Implementation Options

**Option A (Recommended): Direct DB query in mutation**

```typescript
// Before scheduling processVoiceNoteInsight:
const coachOrgPrefs = await ctx.db
  .query("coachOrgPreferences")
  .withIndex("by_coach_org", (q) =>
    q.eq("coachId", draft.coachUserId).eq("organizationId", draft.organizationId)
  )
  .first();

const parentSummariesEnabled = coachOrgPrefs?.parentSummariesEnabled ?? true;

if (draft.playerIdentityId && parentSummariesEnabled) {
  // schedule processVoiceNoteInsight
}
```

**Option B: Check inside processVoiceNoteInsight itself**

The `processVoiceNoteInsight` action already has `coachId` and `organizationId` args. It could check the preference internally and bail out early. However, this wastes a scheduler invocation.

**Option C: Skip the check (PRD as-is)**

Accept the behavior difference from v1. The `processVoiceNoteInsight` action has rate limiting and budget checks that would catch runaway generation. But this violates the PRD's own goal of "identical downstream effects to v1."

## Rationale for Option A

- Maintains parity with v1 behavior (PRD goal: "identical downstream effects")
- Avoids unnecessary scheduler invocations (performance)
- `applyDraft` is already an `internalMutation` with `ctx.db` access
- The `coachOrgPreferences` table has the `by_coach_org` index (verified)
- Simple single-line addition to the guard condition

## Impact

- Ralph must add the `parentSummariesEnabled` check when implementing US-VN-026 Step 2
- Guard condition changes from `if (draft.playerIdentityId)` to `if (draft.playerIdentityId && parentSummariesEnabled)`
- Requires reading from `coachOrgPreferences` table (already has index)

## Consequences

- v2 pipeline respects coach's parent summary opt-out preference
- Consistent behavior between v1 and v2 for parent summary generation
- One additional DB read per applyDraft call (lightweight, indexed)
