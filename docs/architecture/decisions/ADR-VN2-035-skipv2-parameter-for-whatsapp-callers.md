# ADR-VN2-035: skipV2 Parameter for Preventing Double Artifacts

**Status**: Accepted
**Date**: 2026-02-08
**Phase**: 7D
**Story**: US-VN-028

## Context

After Phase 7A, `createTypedNote` and `createRecordedNote` will check `shouldUseV2Pipeline` and create artifacts when v2 is enabled. However, these mutations are called from two contexts:

1. **In-app** (frontend): No external artifact -- mutation should create one.
2. **WhatsApp** (`actions/whatsapp.ts`): Artifact is ALREADY created externally in whatsapp.ts (lines 762-772 for audio, 876-884 for text), then createTypedNote/createRecordedNote is called.

Without intervention, the WhatsApp path creates TWO artifacts per note:
- Artifact 1: Created in `processAudioMessage`/`processTextMessage` (whatsapp.ts)
- Artifact 2: Created inside `createTypedNote`/`createRecordedNote` (Phase 7A code)

## Alternatives Considered

### A. Artifact-exists check inside mutation
Check `getArtifactsByVoiceNote` before creating. Problem: the note was JUST created, and `linkToVoiceNote` hasn't been called yet. The check would return empty.

### B. Separate internal functions
Create `createTypedNoteInternal` variants that skip v2. Problem: code duplication, two sets of mutations to maintain.

### C. skipV2 optional argument (chosen)
Add `skipV2: v.optional(v.boolean())` to the existing mutations. WhatsApp callers pass `skipV2: true`. Frontend callers don't pass it (defaults to undefined/false).

### D. Remove v2 from WhatsApp callers
Move artifact creation from whatsapp.ts into createTypedNote/createRecordedNote. Problem: WhatsApp needs to create artifacts early for different metadata (whatsappMessageId in metadata), and the timing differs (artifact before note for the linking pattern).

## Decision

Use **Option C**: Add `skipV2: v.optional(v.boolean())` to both mutations.

```typescript
// In createTypedNote handler:
const useV2 = args.skipV2 ? false : await ctx.runQuery(
  internal.lib.featureFlags.shouldUseV2Pipeline,
  { organizationId: args.orgId, userId: args.coachId }
);
```

WhatsApp callers (`whatsapp.ts`) must be updated:
```typescript
// Option 1: Add skipV2 to public API args validator
const noteId = await ctx.runMutation(api.models.voiceNotes.createTypedNote, {
  orgId: args.organizationId,
  coachId: args.coachId,
  noteText: args.text,
  noteType: "general",
  source: "whatsapp_text",
  skipV2: true,  // WhatsApp handles its own artifact
});
```

## Security Note

`skipV2` is added to the **public** args validator. A malicious frontend caller could pass `skipV2: true` to prevent v2 processing. This is acceptable because:
- It only skips artifact creation, not the v1 pipeline
- The note is still created regardless
- There's no security benefit to forcing v2 processing
- This is equivalent to the v2 feature flag being disabled

## Timing

This change is in Phase 7D, NOT Phase 7A. During Phase 7A, the double-artifact issue exists for WhatsApp notes but is harmless because:
- Both artifacts link to the same voiceNote eventually
- extractClaims handles duplicate artifacts gracefully (processes the first one)
- Phase 7D fixes it before production rollout

## Consequences

- Clean single-artifact-per-note guarantee when v2 is active
- WhatsApp retains its external artifact creation pattern (metadata differs)
- In-app notes get transparent v2 activation
- Public API gets one additional optional parameter (skipV2)
- `api.models.voiceNotes.createTypedNote` continues to work for WhatsApp callers (no switch to internal needed)
