# ADR-VN2-034: Dual Processing Elimination Strategy

**Status**: Accepted
**Date**: 2026-02-08
**Phase**: 7A (defense-in-depth) + 7D (scheduling gate)

## Context

After Phase 7A, both v1 (`buildInsights`) and v2 (`extractClaims`) pipelines will run simultaneously for the same note when v2 is enabled. This wastes Convex function calls and creates duplicate insights.

Three elimination strategies were considered:

1. **Defense-in-depth only** (Phase 7A, US-VN-023): Add artifact-exists check at the TOP of `buildInsights`. If an artifact exists, skip v1 processing. buildInsights is still scheduled but exits early.

2. **Scheduling gate** (Phase 7D, US-VN-028): Prevent `buildInsights` from being scheduled at all when v2 is active. Gate the `ctx.scheduler.runAfter` calls with `if (!useV2)` or `if (artifacts.length === 0)`.

3. **Combined approach** (chosen): Phase 7A adds defense-in-depth, Phase 7D adds scheduling gate. Defense-in-depth remains as safety net.

## Decision

Use the **combined approach** across two phases:

### Phase 7A (US-VN-023) -- Defense-in-Depth
```typescript
// At top of buildInsights handler:
const artifacts = await ctx.runQuery(
  internal.models.voiceNoteArtifacts.getArtifactsByVoiceNote,
  { voiceNoteId: args.noteId }
);
if (artifacts.length > 0) {
  console.log('[buildInsights] Skipping v1 -- v2 artifact exists');
  return null;
}
```

This is safe because artifacts are created BEFORE `buildInsights` is scheduled (same mutation context in createTypedNote, or prior action steps in whatsapp.ts).

### Phase 7D (US-VN-028) -- Scheduling Gate
```typescript
// In createTypedNote (already has useV2 from Phase 7A):
if (!useV2) {
  await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.buildInsights, { noteId });
}

// In transcribeAudio (already has artifacts check):
if (artifacts.length === 0) {
  await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.buildInsights, { noteId: args.noteId });
}
```

## Race Condition Analysis

### createTypedNote (Safe)
1. `ctx.db.insert("voiceNotes")` -- creates v1 note
2. `ctx.runQuery(shouldUseV2Pipeline)` -- checks flag
3. `ctx.runMutation(createArtifact)` -- creates artifact
4. `ctx.runMutation(linkToVoiceNote)` -- links
5. `ctx.scheduler.runAfter(buildInsights)` -- scheduled AFTER artifact creation

buildInsights runs after the scheduler fires (async). By that time, the artifact already exists. The defense-in-depth check will correctly detect it.

### transcribeAudio (Safe with caveat)
1. `ctx.runQuery(getArtifactsByVoiceNote)` -- checks for artifact (line 229)
2. If artifact: create transcript + schedule extractClaims (lines 233-263)
3. Quality gates (lines 266-284) -- may return null
4. `ctx.scheduler.runAfter(buildInsights)` -- currently UNCONDITIONAL (line 287)

**Caveat**: In the current code (pre-Phase 7D), the v2 extractClaims is scheduled at line 259 AND buildInsights is scheduled at line 287. Both run. Phase 7A's defense-in-depth inside buildInsights catches this. Phase 7D's gate at line 287 fixes it at the source.

### Quality Gate Interaction
If quality rejects the transcript (line 267-274), `return null` happens BEFORE buildInsights scheduling (line 287). But extractClaims was already scheduled at line 259. This means v2 extractClaims will process a quality-rejected transcript. This is a pre-existing issue (since Phase 3) and is out of scope for Phase 7A/7D. The v2 pipeline has its own quality handling inside claimsExtraction.

## Consequences

- Phase 7A: buildInsights still fires but exits early (1 extra function call per note with v2)
- Phase 7D: buildInsights never fires when v2 is active (0 extra calls)
- Defense-in-depth remains permanently as safety net for edge cases
- No modification to WhatsApp code needed (WhatsApp's buildInsights comes from createTypedNote/transcribeAudio internally)
