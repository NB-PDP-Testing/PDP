# ADR-VN2-033: In-App Artifact Creation Pattern

**Status**: Accepted
**Date**: 2026-02-08
**Phase**: 7A
**Story**: US-VN-022

## Context

The v2 pipeline currently creates artifacts only for WhatsApp notes (in `actions/whatsapp.ts`). In-app notes (`createTypedNote` and `createRecordedNote` in `models/voiceNotes.ts`) bypass the v2 pipeline entirely. Phase 7A must wire in-app notes to also create v2 artifacts when the feature flag is enabled.

Two architectural patterns are possible:

1. **External creation** (WhatsApp pattern): Create artifact BEFORE the v1 note, then link.
2. **Internal creation** (proposed in-app pattern): Create v1 note FIRST, then create artifact inside the same mutation and link.

## Decision

Use **internal creation** within the existing `createTypedNote` and `createRecordedNote` mutations:

```
createTypedNote handler:
  1. Insert voiceNotes (v1 note) → noteId
  2. Check shouldUseV2Pipeline
  3. If v2: createArtifact → artifactConvexId
  4. If v2: linkToVoiceNote(artifactIdStr, noteId)
  5. If v2 (typed only): createTranscript (fullText = noteText)
  6. If v2 (typed only): updateArtifactStatus → 'transcribed'
  7. If v2 (typed only): schedule extractClaims
  8. Schedule buildInsights (v1, gated later in Phase 7D)
```

This differs from the WhatsApp pattern where artifact creation happens in the calling action. The reason is that `createTypedNote` and `createRecordedNote` are public mutations called from both the frontend AND from WhatsApp. Adding v2 logic inside these mutations means in-app callers get v2 automatically.

## Multi-Step Mutation Pattern

The implementation uses `ctx.runMutation` for each v2 step (createArtifact, linkToVoiceNote, createTranscript, updateArtifactStatus). This is valid because:

- All run within the same transaction context (Convex mutation)
- Each `ctx.runMutation` is a separate write operation but happens sequentially
- The artifact is guaranteed to exist before linkToVoiceNote is called
- The Convex _id returned by createArtifact is passed to createTranscript

## Key ID Types

| Variable | Type | Used By |
|----------|------|---------|
| `artifactIdStr` | `string` (UUID) | linkToVoiceNote, updateArtifactStatus |
| `artifactConvexId` | `Id<"voiceNoteArtifacts">` | createTranscript, extractClaims |
| `noteId` | `Id<"voiceNotes">` | linkToVoiceNote |

## Typed vs Recorded Difference

- **Typed notes**: Transcript is instant (text = transcript), so createTranscript + updateArtifactStatus + schedule extractClaims all happen in the mutation.
- **Recorded notes**: Transcript comes from `transcribeAudio` action (Whisper). transcribeAudio already detects artifacts via `getArtifactsByVoiceNote` and handles transcript creation + extractClaims scheduling. No additional v2 work needed in createRecordedNote beyond artifact creation + linking.

## Consequences

- In-app notes follow the same v2 pipeline as WhatsApp notes
- Feature flag controls activation (v1 fallback preserved)
- Creates a double-artifact problem for WhatsApp callers (resolved by ADR-VN2-035)
- Adds 4 sequential `ctx.runMutation` calls to createTypedNote when v2 is on (acceptable for mutation context)
