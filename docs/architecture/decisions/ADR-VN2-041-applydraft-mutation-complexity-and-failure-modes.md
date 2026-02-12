# ADR-VN2-041: applyDraft Mutation Complexity and Failure Modes

**Status**: Accepted
**Date**: 2026-02-08
**Phase**: 7C
**Story**: US-VN-026

## Context

After Phase 7C, `applyDraft` will perform 5 database operations in a single mutation:

1. Read draft (already exists: line 471-474)
2. Read claim (already exists: line 488)
3. Read artifact (already exists: line 494)
4. **INSERT** voiceNoteInsights (already exists: line 505)
5. **READ** voiceNote (new: Step 1)
6. **PATCH** voiceNote insights[] array (new: Step 1)
7. **READ** coachOrgPreferences (new: per ADR-VN2-040)
8. **SCHEDULE** processVoiceNoteInsight (new: Step 2)
9. **INSERT** autoAppliedInsights (new: Step 3, conditional)
10. **PATCH** draft status to "applied" (already exists: line 528)

That is 10 operations (4 reads, 3 writes, 2 conditional writes, 1 schedule).

## Risk Assessment

### Convex Mutation Limits
- Convex mutations have a **32KB document size limit** and a **8-second execution timeout**
- The voiceNotes.insights[] embedded array grows with each applied insight
- For a single voice note with many claims, multiple applyDraft calls could run concurrently

### Concurrent applyDraft Calls
When `generateDrafts` auto-confirms multiple drafts, it schedules multiple `applyDraft` calls at `runAfter(0)`. These may execute concurrently. The critical concern is **voiceNotes.insights[] array contention**:

- Draft A reads insights[] = [existing1]
- Draft B reads insights[] = [existing1]
- Draft A writes insights[] = [existing1, draftA_insight]
- Draft B writes insights[] = [existing1, draftB_insight]  <-- OVERWRITES draftA_insight!

**Convex handles this**: Convex mutations are serialized by document. If two mutations modify the same document, one will retry automatically via Optimistic Concurrency Control (OCC). This is safe but could cause retries under high concurrency.

## Decision

**Accept the current design with the following mitigations:**

1. **OCC retries are acceptable** -- Convex auto-retries conflicting mutations. For typical use (1-5 drafts per voice note), this is negligible.

2. **No batching needed** -- Batching all draft applications into a single mutation would reduce the concurrent write risk but would complicate error handling (one bad draft fails all). The per-draft isolation is preferable.

3. **Document size monitoring** -- The voiceNotes.insights[] array should be monitored. A voice note with 50+ insights could approach Convex's document size limit. This is an edge case (typical is 3-8 insights per note).

4. **Failure isolation** -- If the autoAppliedInsights insert fails (e.g., missing required field), it should NOT prevent the core insight application. Wrap in try/catch.

## Implementation Guidance

```typescript
// Wrap the optional audit record in try/catch
try {
  if (draft.requiresConfirmation === false && draft.playerIdentityId) {
    await ctx.db.insert('autoAppliedInsights', { ... });
  }
} catch (error) {
  console.error(`[applyDraft] Failed to create audit record for draft ${args.draftId}:`, error);
  // Continue -- the core insight was already applied
}
```

## Consequences

- Each applyDraft call is self-contained (good isolation)
- Concurrent writes to voiceNotes.insights[] are safe via Convex OCC
- Audit record failures don't block core functionality
- Document size should be monitored for voice notes with many insights
