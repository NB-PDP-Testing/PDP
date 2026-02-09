# ADR-VN2-047: WhatsApp Text buildInsights Edge Case

**Date:** 2026-02-08
**Status:** Accepted
**Context:** Phase 7D, Story US-VN-028

## Context and Problem Statement

When `skipV2: true` is passed from WhatsApp to `createTypedNote`, the handler sets `useV2 = false`. This means:

1. The v2 artifact creation block is skipped (correct -- WhatsApp handles it externally)
2. The buildInsights gating (`if (!useV2)`) evaluates to `true`, so **buildInsights IS scheduled**
3. But WhatsApp already created a v2 artifact for this note externally

The result: buildInsights is scheduled, runs, queries artifacts, finds the WhatsApp-created artifact, and exits via defense-in-depth. This is ONE unnecessary function invocation per WhatsApp text note when v2 is enabled.

## Analysis

### Impact quantification

- WhatsApp text notes are a fraction of total voice notes (most are audio)
- Each unnecessary invocation: ~1 scheduler call + 1 action invocation + 2 DB queries (getNote + getArtifactsByVoiceNote)
- Estimated volume: 50-200 WhatsApp text notes per month across all orgs
- Cost: negligible (200 extra function calls vs 800K total)

### Why this edge case exists

The `skipV2` parameter operates at the artifact creation level, not the pipeline routing level. It answers "should this mutation create a v2 artifact?" not "is v2 active for this note?" The buildInsights gating uses `useV2` which is derived from `skipV2`, creating a semantic mismatch.

### WhatsApp AUDIO path: No edge case

For audio, `createRecordedNote` with `skipV2: true` skips artifact creation but still schedules `transcribeAudio`. When `transcribeAudio` runs, it queries artifacts (line 229) and FINDS the WhatsApp-created artifact (linked via `linkToVoiceNote` at whatsapp.ts:790). So `transcribeAudio` takes the v2 path (line 233) and the buildInsights gating (`if (artifacts.length === 0)`) correctly skips buildInsights.

The audio path works correctly because `transcribeAudio` uses artifact presence (not a boolean flag) to determine the path.

## Considered Options

### Option A: Accept the edge case (defense-in-depth catches it)

Keep the current design. buildInsights runs for WhatsApp text notes, finds the artifact, exits immediately.

**Pros:**
- Simplest implementation
- No additional complexity
- Defense-in-depth serves its intended purpose

**Cons:**
- ~200 wasted function calls per month

### Option B: Add `skipBuildInsights` parameter

Add a second parameter to control buildInsights scheduling independently.

**Pros:**
- Zero wasted calls

**Cons:**
- More complex API (two skip flags)
- Confusing for future developers
- Over-engineering for ~200 calls/month

### Option C: Check artifact existence before scheduling buildInsights

After the skipV2 path, query artifacts to decide whether to schedule buildInsights.

**Pros:**
- Correct routing without new params

**Cons:**
- Extra DB query on EVERY createTypedNote call (both app and WhatsApp)
- Costs more than it saves (1 query per call vs 200 wasted invocations/month)
- createTypedNote is a mutation -- adding an extra query increases transaction time

## Decision Outcome

**Chosen Option:** Option A -- Accept the edge case

**Rationale:**
The defense-in-depth check was designed precisely for this scenario. The impact is negligible (~200 extra function calls per month out of 800K+). Options B and C add complexity that is not justified by the savings. This decision can be revisited if WhatsApp text volume increases significantly.

## Consequences

**Positive:**
- Simple implementation
- No additional parameters or queries
- Defense-in-depth log message provides visibility

**Negative:**
- ~200 wasted function calls per month (0.025% of total)

**Monitoring:**
If the defense-in-depth log message appears frequently in production logs, reconsider Option C.

## References

- ADR-VN2-043: buildInsights gating strategy
- ADR-VN2-044: skipV2 parameter design
