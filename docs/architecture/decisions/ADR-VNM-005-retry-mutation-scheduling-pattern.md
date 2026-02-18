# ADR-VNM-005: Retry Mutation Scheduling Pattern

**Status:** Accepted
**Date:** 2026-02-15
**Phase:** M3 - Retry Operations
**Author:** Architecture Reviewer (Pre-implementation)

---

## Context

Phase M3 adds 4 retry mutations (`retryTranscription`, `retryClaimsExtraction`, `retryEntityResolution`, `retryFullPipeline`) that must trigger existing pipeline actions (Whisper transcription, GPT-4o claims extraction, entity resolution, draft generation). The question is how these mutations should invoke the pipeline actions.

## Decision

**All retry mutations MUST use `ctx.scheduler.runAfter(0, ...)` (fire-and-forget) to schedule pipeline actions. Never use `ctx.runAction()`.**

## Rationale

### Why Not `ctx.runAction()`?

In Convex, mutations cannot call `ctx.runAction()` at all. Only actions can call other actions via `ctx.runAction()`. If retry functions were actions instead of mutations, `ctx.runAction()` would still be wrong because:

1. **Timeout risk**: Pipeline actions (especially transcription and claims extraction) make external API calls to OpenAI. These can take 5-30 seconds. A blocking call risks mutation timeout.
2. **User experience**: The retry mutation should return immediately with `{ success: true, message: "Retry initiated" }`. The user sees instant feedback in the UI rather than waiting for the entire pipeline action to complete.
3. **Error isolation**: If the pipeline action fails (e.g., Whisper API down), the retry mutation has already succeeded and logged its `retry_initiated` event. The pipeline's own error handling creates `retry_failed` events.

### Why Mutations (Not Actions)?

Retry mutations need `ctx.db` access to:
- Read the artifact document
- Read previous retry events (for retry attempt counting)
- Reset artifact status
- Delete derived data (for full pipeline retry)
- Log events via `ctx.scheduler.runAfter()`

Actions cannot access `ctx.db` directly. Making these actions would require wrapping every database operation in `ctx.runQuery`/`ctx.runMutation`, adding complexity without benefit.

### Why `runAfter(0, ...)` Specifically?

The delay of `0` means "schedule immediately in a new transaction." The pipeline action runs as a separate, independent execution. This matches the existing pattern used throughout M1 for event logging.

## Implementation Pattern

```typescript
export const retryTranscription = mutation({
  args: { artifactId: v.id("voiceNoteArtifacts") },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    // 1. Auth check (sync, in this transaction)
    // 2. Fetch artifact (sync, in this transaction)
    // 3. Log retry_initiated event (fire-and-forget)
    await ctx.scheduler.runAfter(0,
      internal.models.voicePipelineEvents.logEvent,
      { eventType: "retry_initiated", ... }
    );
    // 4. Reset status (sync, in this transaction)
    await ctx.db.patch(args.artifactId, { status: "transcribing", updatedAt: Date.now() });
    // 5. Schedule pipeline action (fire-and-forget)
    await ctx.scheduler.runAfter(0,
      internal.actions.voiceNotes.transcribeAudio,
      { noteId: artifact.voiceNoteId }
    );
    // 6. Return immediately
    return { success: true, message: "Transcription retry initiated" };
  },
});
```

## Action Signature Reference

Each retry targets a different pipeline action with different argument shapes:

| Retry Function | Pipeline Action | Args | Notes |
|---|---|---|---|
| `retryTranscription` | `internal.actions.voiceNotes.transcribeAudio` | `{ noteId: v.id("voiceNotes") }` | Uses artifact.voiceNoteId (v1 ID), NOT artifactId |
| `retryClaimsExtraction` | `internal.actions.claimsExtraction.extractClaims` | `{ artifactId: v.id("voiceNoteArtifacts") }` | Uses artifact._id directly |
| `retryEntityResolution` | `internal.actions.entityResolution.resolveEntities` | `{ artifactId: v.id("voiceNoteArtifacts") }` | Uses artifact._id directly |
| `retryFullPipeline` | `internal.actions.voiceNotes.transcribeAudio` | `{ noteId: v.id("voiceNotes") }` | Starts from beginning, same as retryTranscription |

**CRITICAL**: `transcribeAudio` takes `noteId` which is `v.id("voiceNotes")` -- the v1 voice note ID. This is accessed via `artifact.voiceNoteId`. Passing `artifactId` will cause a runtime type error.

## Consequences

- Retry mutations return instantly (< 50ms)
- Pipeline actions execute independently, with their own error handling
- If the scheduled action fails, `retry_failed` events are logged by the pipeline's existing error handling
- Users see "Retry initiated" immediately, then observe status changes via real-time subscriptions
- Event log provides full audit trail regardless of whether the retried action succeeds or fails

## Risks

1. **voiceNoteId may be undefined**: The `voiceNoteId` field on artifacts is `v.optional(v.id("voiceNotes"))`. If an artifact was created but not yet linked to a v1 voice note, `retryTranscription` and `retryFullPipeline` will fail. Must check for this and return an error message.
2. **No callback on completion**: Fire-and-forget means the retry mutation cannot know if the action succeeded. The existing pipeline logging handles this, but there is no explicit `retry_succeeded` event logged by the retry mutation itself -- it must come from the pipeline.

## Related

- ADR-VNM-003: Fire-and-forget event logging (M1 pattern)
- M1 Lessons Learned: Section 4 - Fire-and-Forget Event Logging
- M2 Lessons Learned: Section 2 - Cron Args Cannot Use Date.now()
