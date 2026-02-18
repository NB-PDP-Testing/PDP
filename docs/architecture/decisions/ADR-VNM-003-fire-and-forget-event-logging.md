# ADR-VNM-003: Fire-and-Forget Event Logging Pattern (Non-Blocking Instrumentation)

## Status
Accepted

## Context

Event logging must be added to 9 existing v2 pipeline files without impacting pipeline execution time. The target overhead is <10ms per event emission. Pipeline processing (transcription, claims extraction, entity resolution, draft generation) is the critical path -- monitoring must never block or crash it.

Key constraints:
- Mutations have access to `ctx.scheduler.runAfter()` (true fire-and-forget)
- Actions do NOT have `ctx.scheduler` -- they must use `await ctx.runMutation()` instead
- Event logging failures must never crash the pipeline
- The `logEvent` function itself is an `internalMutation` (only callable from server-side code)

## Decision

### 1. Two Distinct Patterns Based on Caller Type

**From mutations** (voiceNoteArtifacts.ts, voiceNoteTranscripts.ts, voiceNoteClaims.ts, voiceNoteEntityResolutions.ts, insightDrafts.ts):
```typescript
// TRUE fire-and-forget: returns immediately, logEvent runs in background
await ctx.scheduler.runAfter(0,
  internal.models.voicePipelineEvents.logEvent,
  { eventType: "artifact_received", artifactId, ... }
);
```

**From actions** (actions/voiceNotes.ts, actions/claimsExtraction.ts, actions/entityResolution.ts, actions/draftGeneration.ts):
```typescript
// MUST await (no scheduler in actions), wrapped in try/catch
try {
  await ctx.runMutation(
    internal.models.voicePipelineEvents.logEvent,
    { eventType: "transcription_started", artifactId, ... }
  );
} catch (logError) {
  console.error("Event logging failed:", logError);
  // Don't throw - continue pipeline execution
}
```

### 2. logEvent Internal Error Handling

The `logEvent` mutation itself wraps its body in try/catch:
```typescript
export const logEvent = internalMutation({
  handler: async (ctx, args) => {
    try {
      // Insert event + increment counter
      // ...
      return eventId;
    } catch (error) {
      console.error("[voicePipelineEvents.logEvent] Failed:", error);
      return "";  // Return empty string, never throw
    }
  }
});
```

This provides defense-in-depth: even if the try/catch in the calling action misses an edge case, `logEvent` itself won't propagate errors.

### 3. organizationId Extraction Pattern

`voiceNoteArtifacts` does NOT have a flat `organizationId` field. The correct extraction is:
```typescript
const organizationId = artifact.orgContextCandidates[0]?.organizationId;
```

For `createArtifact` specifically, the newly-inserted artifact is not yet fetched by ID -- Ralph must use the args:
```typescript
organizationId: args.orgContextCandidates[0]?.organizationId
```

For other pipeline files (transcripts, claims, etc.), the artifact must be fetched first to extract `organizationId`.

### 4. Atomic Imports Rule

When adding instrumentation, the import statement and usage MUST be in the same edit operation:
```typescript
// In a SINGLE edit, add both:
import { internal } from "../_generated/api";  // (if not already imported)
// AND the usage:
await ctx.scheduler.runAfter(0, internal.models.voicePipelineEvents.logEvent, {...});
```

The Biome linter removes unused imports between edits, which would break the build.

### 5. Instrumentation Points Map

| File | Function | Event Type(s) | Pattern |
|------|----------|---------------|---------|
| voiceNoteArtifacts.ts | createArtifact | artifact_received | scheduler.runAfter |
| voiceNoteArtifacts.ts | updateArtifactStatus | artifact_status_changed/completed/failed | scheduler.runAfter |
| voiceNoteTranscripts.ts | createTranscript | transcription_completed | scheduler.runAfter |
| voiceNoteClaims.ts | storeClaims | claims_extracted | scheduler.runAfter |
| voiceNoteEntityResolutions.ts | storeResolutions | entity_resolution_completed/needs_disambiguation | scheduler.runAfter |
| insightDrafts.ts | createDrafts | drafts_generated | scheduler.runAfter |
| insightDrafts.ts | confirmDraft | draft_confirmed | scheduler.runAfter |
| insightDrafts.ts | rejectDraft | draft_rejected | scheduler.runAfter |
| actions/voiceNotes.ts | transcribeAudio | transcription_started, transcription_failed | ctx.runMutation + try/catch |
| actions/claimsExtraction.ts | extractClaims | claims_extraction_started, claims_extraction_failed | ctx.runMutation + try/catch |
| actions/entityResolution.ts | resolveEntities | entity_resolution_started | ctx.runMutation + try/catch |
| actions/draftGeneration.ts | generateDrafts | draft_generation_started | ctx.runMutation + try/catch |

## Consequences

### Positive
- Mutation-based logging is truly non-blocking (scheduler fires immediately, returns)
- Action-based logging adds <10ms overhead (lightweight internalMutation call)
- Double error handling (caller try/catch + logEvent internal catch) prevents any monitoring failure from crashing pipeline
- The `internal` import is already present in most action files (they already call `internal.models.*`)

### Negative
- Action-based logging is not truly fire-and-forget -- `await ctx.runMutation()` blocks briefly
- `logEvent` returning empty string on failure silences errors that might indicate systemic issues
- Additional scheduler calls from mutations add to Convex function call count

### Risks
- **Import conflicts**: Some files (e.g., `voiceNoteTranscripts.ts`) only import `internalMutation`/`internalQuery` -- they may not have `internal` from `"../_generated/api"`. Ralph must check each file's imports.
- **Scheduler overhead at scale**: Each event emission from a mutation is a separate scheduled function. At 50,000 events/day, that is 50,000 additional scheduled functions. Monitor Convex function call usage.
- **Action error masking**: The try/catch around action logging could mask legitimate database errors. Ensure `logEvent` logs errors with `console.error` for debugging.

## Implementation Notes
- `voiceNoteArtifacts.ts` uses `internalMutation` -- already has mutation context, use `ctx.scheduler.runAfter`
- `voiceNoteTranscripts.ts` is all internal -- needs `internal` import from `"../_generated/api"`
- `insightDrafts.ts` already imports `internal` (used for `applyDraft` scheduling)
- `voiceNoteEntityResolutions.ts` already imports `internal` (used for `reviewAnalytics`)
- Actions already import `internal` (all four action files use it)
- Instrument functions one file at a time, test after each, commit incrementally

## Related
- [Architecture Doc](../voice-flow-monitoring-harness.md) Section 4.3
- [PERFORMANCE_PATTERNS.md](../../scripts/ralph/prds/voice-monitor-harness/context/PERFORMANCE_PATTERNS.md) Pattern 7
- PHASE_M1.json US-VNM-003 for exact instrumentation code
