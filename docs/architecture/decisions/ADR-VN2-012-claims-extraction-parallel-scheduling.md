# ADR-VN2-012: Claims Extraction Parallel Scheduling

**Date:** 2026-02-06
**Status:** Accepted
**Context:** Phase 4, Story US-VN-016

## Context and Problem Statement

When a v2-enabled coach's voice note is transcribed, both v1 insights and v2 claims need to be generated. The v1 `buildInsights` is scheduled after a quality check passes (voiceNotes.ts line 280). The v2 `extractClaims` needs to be scheduled somewhere in the pipeline. The key question: where exactly should claims extraction be triggered, and should it depend on the quality check result?

## Decision Drivers

- v1 pipeline must remain completely unchanged (zero regression)
- Claims extraction should not block or be blocked by v1 insights
- Claims extraction does its own quality assessment via the AI prompt
- Even low-quality transcripts may contain extractable claims
- Non-v2 coaches must be completely unaffected

## Considered Options

### Option 1: Schedule claims after "transcribed" status, BEFORE quality check
**Pros:** Claims extraction is independent of v1 quality gate. Even rejected transcripts may yield claims. Simpler -- just needs artifact existence check. Runs truly in parallel with the quality check + buildInsights chain.
**Cons:** May process transcripts that v1 would reject. Slightly more AI calls for low-quality transcripts.

### Option 2: Schedule claims after quality check passes (same location as buildInsights)
**Pros:** Only processes quality-approved transcripts. Consistent with v1 threshold.
**Cons:** Ties v2 to v1's quality decision. If v1 rejects, v2 gets nothing. Modifies the code path around buildInsights scheduling (higher regression risk).

### Option 3: Schedule claims inside buildInsights action
**Pros:** Guaranteed to run after insights are generated.
**Cons:** Tightly couples v1 and v2. If buildInsights fails, claims are lost. Modifies buildInsights code (violates zero regression principle).

## Decision Outcome

**Chosen Option:** Option 1 -- Schedule claims after "transcribed" status, before quality check.

**Rationale:** This provides the cleanest separation between v1 and v2 pipelines. Claims extraction runs independently -- it does not depend on v1's quality gate and cannot interfere with it. The scheduler call is a simple 3-line addition inside the existing `if (artifacts.length > 0)` block, after the transcript is stored and artifact status is set to "transcribed". This is the lowest-risk integration point.

## Implementation Notes

- Location: voiceNotes.ts, inside `if (artifacts.length > 0)` block (line ~233), after line 256 (artifact status set to "transcribed")
- Code: `await ctx.scheduler.runAfter(0, internal.actions.claimsExtraction.extractClaims, { artifactId: artifact._id })`
- This is BEFORE the quality check branching at line 260
- The `artifacts.length > 0` guard ensures only v2 coaches trigger claims extraction
- v1 `buildInsights` scheduling at line 280 remains completely untouched
- If claims extraction fails, it sets artifact status to "failed" but does NOT affect the v1 voiceNote or its insights
- The scheduler runs the action asynchronously -- it does not block the transcribeAudio action

## Consequences

**Positive:** Complete isolation between v1 and v2. Claims extraction failure cannot affect v1. Non-v2 coaches unaffected. Minimal code change (3 lines).

**Negative:** Claims may be extracted from transcripts that v1 considers too low quality. This is acceptable because Phase 5 entity resolution will filter out low-confidence claims anyway.

**Risks:** If both buildInsights and extractClaims run simultaneously on the same transcript, they may compete for API rate limits on OpenAI. Mitigation: both use the same `getAIConfig` pattern, and OpenAI rate limits are per-organization, not per-request. At current volume (~100 voice notes/day across all orgs), this is not a concern.
