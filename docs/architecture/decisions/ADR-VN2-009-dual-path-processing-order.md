# ADR-VN2-009: Dual-Path Processing Order

**Date:** 2026-02-06
**Status:** Accepted
**Context:** Phase 3 - v2 Artifacts Foundation, Story US-VN-014

## Context and Problem Statement

When v2 is enabled for a coach, the system must create BOTH a v2 artifact AND a v1 voiceNote (for backward compatibility). The critical question is: in what order should these be created, and how should the transcription flow handle the dual write?

There are two integration points:
1. **Message arrival** (processAudioMessage / processTextMessage in whatsapp.ts): Creates the initial records
2. **Transcription completion** (transcribeAudio in actions/voiceNotes.ts): Stores transcription results

## Decision Drivers

- **Zero regression**: v1 pipeline MUST continue working exactly as before for non-v2 coaches
- **Backward compatibility**: v2 artifacts MUST link back to v1 voiceNote via `voiceNoteId`
- **Existing pipeline**: `createRecordedNote` triggers transcription via `ctx.scheduler.runAfter`; this chain must not break
- **Data integrity**: If artifact creation fails, the v1 voiceNote must still be created
- **Simplicity**: Minimize changes to existing functions
- **PRD mandate**: "v2 artifacts ALWAYS create a v1 voiceNote for backward compat"

## Considered Options

### Option 1: v1 voiceNote First, Then Artifact (Recommended)

1. Create v1 voiceNote (existing `createRecordedNote` / `createTypedNote` call -- unchanged)
2. Create v2 artifact
3. Link artifact to voiceNote via `linkToVoiceNote`

**Pros:**
- v1 pipeline is completely untouched (zero regression risk)
- If artifact creation fails, voiceNote still exists (graceful degradation)
- Existing transcription pipeline (`transcribeAudio -> buildInsights`) fires from `createRecordedNote` as before
- The voiceNoteId is known before artifact creation, so `linkToVoiceNote` is straightforward
- Minimal changes to `processAudioMessage` / `processTextMessage`

**Cons:**
- Artifact is created after voiceNote, so there's a brief moment where voiceNote exists without an artifact (acceptable; artifact lookup is by artifactId, not voiceNoteId)

### Option 2: Artifact First, Then v1 voiceNote

1. Create v2 artifact
2. Create v1 voiceNote
3. Link them

**Rejected because:**
- If voiceNote creation fails, we have an orphaned artifact
- The existing transcription pipeline is triggered by `createRecordedNote`; changing the order could introduce timing issues
- No benefit over Option 1 (the artifact doesn't need to exist before the voiceNote)

### Option 3: Create Both in a Single Mutation

Create a new `createRecordedNoteV2` mutation that inserts both records atomically.

**Rejected because:**
- Violates the "minimal changes" principle
- Duplicates logic from `createRecordedNote`
- The v2 path is temporary (once migration is complete, v1 creation is removed)
- Harder to roll back if issues arise

## Decision Outcome

**Chosen option: Option 1 (v1 voiceNote first, then artifact)**

This approach has the lowest risk to the existing v1 pipeline and follows the PRD's design principle of zero regression.

### Integration Point 1: Message Arrival

```
processAudioMessage (whatsapp.ts)
  |
  |- [existing] Download audio, store to Convex storage
  |
  |- Check shouldUseV2Pipeline
  |
  |- [existing, unchanged] Create v1 voiceNote via createRecordedNote
  |   (this schedules transcription automatically)
  |
  |- IF v2 enabled:
  |   |- Generate artifactId (crypto.randomUUID())
  |   |- Create artifact via internal.models.voiceNoteArtifacts.createArtifact
  |   |- Link artifact to voiceNote via internal.models.voiceNoteArtifacts.linkToVoiceNote
  |   |- Store artifactId on the WhatsApp message (for downstream correlation)
  |
  |- [existing, unchanged] Link voiceNote to WhatsApp message
  |- [existing, unchanged] Schedule auto-apply check
```

### Integration Point 2: Transcription Completion

The transcription flow is:
1. `createRecordedNote` schedules `transcribeAudio` (existing, no change)
2. `transcribeAudio` calls OpenAI, stores result via `updateTranscription` (existing, no change)
3. **NEW**: After transcription completes, if v2 artifact exists for this voiceNote, also create a `voiceNoteTranscript` record

**Where to add the v2 transcript creation:**

Two sub-options were evaluated:

**Sub-option A: In `transcribeAudio` action** (Recommended)
After the existing `updateTranscription` call at line ~216 in `actions/voiceNotes.ts`, add:
```typescript
// Check if this voiceNote has a v2 artifact
const artifacts = await ctx.runQuery(
  internal.models.voiceNoteArtifacts.getArtifactsByVoiceNote,
  { voiceNoteId: args.noteId }
);
if (artifacts.length > 0) {
  // Create v2 transcript record
  await ctx.runMutation(
    internal.models.voiceNoteTranscripts.createTranscript,
    {
      artifactId: artifacts[0]._id,
      fullText: transcription.text,
      segments: [], // Whisper basic doesn't return segments; populate in future
      modelUsed: config.modelId,
      language: "en", // Default; enhance when Whisper returns language
      duration: 0, // Populate when Whisper returns duration
    }
  );
  // Update artifact status
  await ctx.runMutation(
    internal.models.voiceNoteArtifacts.updateArtifactStatus,
    { artifactId: artifacts[0].artifactId, status: "transcribed" }
  );
}
```

**Sub-option B: In `updateTranscription` mutation**
Add v2 logic inside the existing mutation.

Rejected because: mutations should be single-responsibility. `updateTranscription` updates a voiceNote; it should not be aware of the v2 artifact system.

## Implementation Notes

### Critical: `createRecordedNote` is a PUBLIC Mutation

The current code calls `createRecordedNote` and `createTypedNote` as `api.models.voiceNotes.createRecordedNote` from `processIncomingMessage` (an internalAction). The PRD criticalReminders state: "NEVER call public mutations from internalActions."

**Recommendation for Phase 3**: Do NOT refactor this in Phase 3. The existing public mutation calls work and changing them risks v1 regression. Flag this as tech debt for Phase 4+. The new v2 functions (createArtifact, linkToVoiceNote, etc.) MUST all be `internalMutation` / `internalQuery`.

### Error Handling

If v2 artifact creation fails after v1 voiceNote succeeds:
- Log the error
- Continue processing (v1 pipeline is unaffected)
- The voiceNote will work as a normal v1 note
- No user-facing error (graceful degradation)

### Transcript Segments

The `voiceNoteTranscripts.segments` field will initially be an empty array. OpenAI's basic `audio.transcriptions.create` endpoint does not return per-segment timestamps. To get segments:
- Use `verbose_json` response format (returns segments with timestamps)
- Or upgrade to Whisper API with `timestamp_granularities` parameter

This is a Phase 4+ enhancement. Phase 3 stores `fullText` and empty `segments: []`.

## Consequences

### Positive
- Zero changes to v1 pipeline flow
- Graceful degradation if v2 components fail
- Clear separation: v1 creates voiceNote, v2 creates artifact that links to it
- Existing transcription pipeline untouched

### Negative
- v2 transcript may briefly lag behind v1 voiceNote (artifact lookup adds one query)
- `segments` field will be empty in Phase 3 (known limitation)
- Tech debt: public mutation calls from internalAction remain

### Risks
- **Race condition**: If `transcribeAudio` runs before `linkToVoiceNote` completes, `getArtifactsByVoiceNote` may return empty. Mitigation: `createRecordedNote` schedules transcription via `ctx.scheduler.runAfter(0, ...)` which is a new transaction; by the time it runs, the `linkToVoiceNote` mutation (called immediately after `createRecordedNote`) should have completed. If not, the v2 transcript simply won't be created and the v1 transcript still works.
- **Orphaned artifacts**: If the link step fails, artifact exists but isn't linked. Mitigation: Artifact has status tracking; a cleanup cron can find unlinked artifacts.
