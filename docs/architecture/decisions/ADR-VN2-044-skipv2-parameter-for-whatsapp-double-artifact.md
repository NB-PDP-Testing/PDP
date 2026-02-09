# ADR-VN2-044: skipV2 Parameter for WhatsApp Double-Artifact Prevention

**Date:** 2026-02-08
**Status:** Accepted
**Context:** Phase 7D, Story US-VN-028

## Context and Problem Statement

When v2 is enabled, WhatsApp message handlers create artifacts BEFORE calling `createTypedNote`/`createRecordedNote`. However, those public mutations also check `shouldUseV2Pipeline` and create their OWN artifacts when v2 is enabled. This results in **two artifacts per WhatsApp note**:

### WhatsApp TEXT path (double-artifact trace):

1. `processTextMessage` (whatsapp.ts:875) -- checks useV2, creates artifact A1 (line 876-884)
2. `processTextMessage` calls `api.models.voiceNotes.createTypedNote` (line 889)
3. `createTypedNote` (voiceNotes.ts:586) -- checks shouldUseV2Pipeline, returns true, creates artifact A2 (line 592-634) AND links A2 to noteId
4. `processTextMessage` links A1 to noteId (line 898-903)
5. Result: **TWO artifacts** (A1 and A2) both linked to the same voiceNoteId

### WhatsApp AUDIO path (double-artifact trace):

1. `processAudioMessage` (whatsapp.ts:761) -- checks useV2, creates artifact A1 (line 762-772)
2. `processAudioMessage` calls `api.models.voiceNotes.createRecordedNote` (line 777)
3. `createRecordedNote` (voiceNotes.ts:675) -- checks shouldUseV2Pipeline, returns true, creates artifact A2 (line 680-694) AND links A2 to noteId
4. `processAudioMessage` links A1 to noteId (line 789-793)
5. `transcribeAudio` runs, queries `getArtifactsByVoiceNote` -- finds A2 (and A1), processes v2 path
6. Result: **TWO artifacts**, `transcribeAudio` processes the first one found, second is orphaned

### Why this matters:
- Duplicate artifacts pollute v2MigrationStatus counts
- Claims extraction runs twice (once per artifact)
- Entity resolution processes duplicate claims
- Draft generation produces duplicate drafts
- `getArtifactsByVoiceNote` returns array -- code uses `artifacts[0]` which may not be deterministic

## Decision Drivers

- Must not break the in-app path (frontend callers of createTypedNote/createRecordedNote)
- Must not require WhatsApp to switch from `api` (public) to `internal` calls
- Must be backward compatible (v2 OFF = no change in behavior)
- Must be simple for Ralph to implement

## Considered Options

### Option 1: Add `skipV2` optional arg to public mutations

**Approach:** Add `skipV2: v.optional(v.boolean())` to `createTypedNote` and `createRecordedNote`. When `skipV2` is true, skip the v2 artifact creation block entirely. WhatsApp callers pass `skipV2: true` because they handle artifact creation externally.

```typescript
// In createTypedNote handler:
const useV2 = args.skipV2 ? false : await ctx.runQuery(
  internal.lib.featureFlags.shouldUseV2Pipeline,
  { organizationId: args.orgId, userId: args.coachId }
);
```

**Pros:**
- Simple, single boolean flag
- No API surface change for existing callers (optional, defaults to undefined/false)
- WhatsApp keeps using `api` (public) -- no need for internal variants
- Self-documenting: `skipV2: true` clearly states intent
- Also skips the `shouldUseV2Pipeline` query when true (saves 1 DB query per WhatsApp note)

**Cons:**
- Exposes `skipV2` on the public API (any client could send it)
- Slightly breaks separation of concerns (mutation knows about its callers)

**Complexity:** Low
**Performance:** Saves 1 shouldUseV2Pipeline query per WhatsApp note

### Option 2: Create internal variants of createTypedNote/createRecordedNote

**Approach:** Create `createTypedNoteInternal` and `createRecordedNoteInternal` as `internalMutation` that skip v2 logic. WhatsApp calls internal variants.

**Pros:**
- Clean separation: public API never sees skipV2
- Internal variants are more secure

**Cons:**
- Code duplication (entire mutation bodies copied)
- Maintenance burden: changes to note creation logic must be applied in two places
- WhatsApp already calls `api` variants throughout -- switching to `internal` is a larger change

**Complexity:** Medium
**Performance:** Same savings

### Option 3: Check if artifact already exists before creating

**Approach:** In createTypedNote/createRecordedNote, before creating an artifact, check `getArtifactsByVoiceNote`. If one exists, skip creation.

**Pros:**
- No API changes needed

**Cons:**
- DOES NOT WORK: The note was just created in the same mutation. The WhatsApp artifact link (`linkToVoiceNote`) happens AFTER `createTypedNote` returns. So at the point of the check, no artifact is linked to the note yet.
- Even if it did work, still wastes the `shouldUseV2Pipeline` query

**Complexity:** N/A (infeasible)

## Decision Outcome

**Chosen Option:** Option 1 -- Add `skipV2` optional arg to public mutations

**Rationale:**
The simplest approach with the least code change. The `skipV2` parameter being on the public API is acceptable because:
1. It only SKIPS artifact creation -- it does not bypass any security check
2. Passing `skipV2: true` from a rogue client would simply disable v2 for that note, falling back to v1 processing (which is the default anyway)
3. There is no privilege escalation -- the worst case is a note gets v1 processing instead of v2

## Implementation Notes

### Modify createTypedNote args (voiceNotes.ts)

```typescript
args: {
  orgId: v.string(),
  coachId: v.string(),
  noteText: v.string(),
  noteType: noteTypeValidator,
  source: v.optional(v.union(v.literal("app_typed"), v.literal("whatsapp_text"))),
  skipV2: v.optional(v.boolean()),  // NEW: Skip v2 artifact creation (WhatsApp callers)
},
```

### Modify createTypedNote handler

```typescript
const useV2 = args.skipV2
  ? false
  : await ctx.runQuery(
      internal.lib.featureFlags.shouldUseV2Pipeline,
      { organizationId: args.orgId, userId: args.coachId }
    );
```

### Modify createRecordedNote -- same pattern

Add `skipV2: v.optional(v.boolean())` to args. Same handler change.

### Modify WhatsApp callers

```typescript
// processTextMessage (whatsapp.ts:889)
const noteId = await ctx.runMutation(api.models.voiceNotes.createTypedNote, {
  orgId: args.organizationId,
  coachId: args.coachId,
  noteText: args.text,
  noteType: "general",
  source: "whatsapp_text",
  skipV2: true,  // NEW: WhatsApp handles v2 artifact externally
});

// processAudioMessage (whatsapp.ts:778)
const noteId = await ctx.runMutation(api.models.voiceNotes.createRecordedNote, {
  orgId: args.organizationId,
  coachId: args.coachId,
  audioStorageId: storageId,
  noteType: "general",
  source: "whatsapp_audio",
  skipV2: true,  // NEW: WhatsApp handles v2 artifact externally
});
```

### createRecordedNote: No buildInsights gating needed

`createRecordedNote` does NOT schedule buildInsights directly. It schedules `transcribeAudio`, which handles the gating (ADR-VN2-043). The `skipV2` parameter only prevents duplicate artifact creation.

### Interaction with buildInsights gating (ADR-VN2-043)

For WhatsApp TEXT path with skipV2:
- `createTypedNote` sees `skipV2: true`, sets `useV2 = false`
- v2 block is skipped (no duplicate artifact)
- buildInsights gating: `if (!useV2)` is true, so buildInsights IS scheduled
- But wait -- WhatsApp already created a v2 artifact externally
- buildInsights defense-in-depth check finds the artifact and exits
- This is ONE unnecessary invocation (defense-in-depth catches it)

ALTERNATIVE: WhatsApp TEXT path should also not schedule buildInsights. Since `useV2 = false` due to skipV2, the buildInsights gating will let it through. But the external artifact means v2 is active.

RESOLUTION: This is acceptable for Phase 7D. The defense-in-depth in buildInsights catches this edge case. The wasted invocation is 1 per WhatsApp text note (not per-item). A future optimization could make `skipV2` also skip buildInsights, but the current PRD explicitly keeps this as defense-in-depth behavior.

## Consequences

**Positive:**
- Eliminates duplicate artifacts for WhatsApp notes
- Clean, simple implementation
- No code duplication
- Backward compatible

**Negative:**
- One wasted buildInsights invocation per WhatsApp TEXT note (caught by defense-in-depth)
- `skipV2` is visible on public API (low risk, as analyzed above)

**Risks:**
- If `skipV2` is passed by a frontend client, v2 processing would be skipped for that note. Mitigation: frontend code does not pass this arg; code review enforces this.

## References

- Phase 7D PRD: US-VN-028, "CHANGE 3" and "RESOLUTION" sections
- ADR-VN2-035: skipV2 parameter for WhatsApp callers (Phase 7A-7D planning -- this supersedes with implementation details)
- ADR-VN2-043: buildInsights gating strategy
