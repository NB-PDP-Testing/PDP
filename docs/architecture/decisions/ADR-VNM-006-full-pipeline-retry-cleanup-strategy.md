# ADR-VNM-006: Full Pipeline Retry Cleanup Strategy

**Status:** Accepted
**Date:** 2026-02-15
**Phase:** M3 - Retry Operations
**Author:** Architecture Reviewer (Pre-implementation)

---

## Context

`retryFullPipeline` is a destructive operation that deletes ALL derived data for an artifact (transcripts, claims, entity resolutions, insight drafts) before restarting the pipeline from scratch. The question is how to handle the deletion sequence and what happens on partial failure.

## Decision

**Use sequential deletion with try/catch abort. Leverage Convex's built-in transaction atomicity -- if the mutation throws, ALL writes in that transaction roll back automatically.**

## Rationale

### Convex Mutation Atomicity

In Convex, mutations are fully atomic. If any operation within a mutation handler throws an unhandled error, ALL database writes in that handler are rolled back. This means:

- If delete of claims fails (throws), the transcript delete is also rolled back
- The artifact status is NOT changed
- No partial state exists

This is a stronger guarantee than manual try/catch. However, we still need try/catch for two reasons:

1. **User-friendly error messages**: Without try/catch, the raw Convex error propagates to the frontend. With try/catch, we return `{ success: false, message: "Cleanup failed: ..." }`.
2. **Event logging before cleanup**: The `retry_initiated` event is logged via `ctx.scheduler.runAfter()` BEFORE cleanup starts. Scheduled functions are NOT rolled back by transaction failure (they execute independently). This means the audit log records that a retry was attempted even if cleanup fails.

### Deletion Order

The deletion order matters for clarity and debugging, though Convex atomicity makes the order irrelevant for data integrity:

```
1. voiceNoteTranscripts   (by_artifactId index) -- usually 1 document
2. voiceNoteClaims        (by_artifactId index) -- typically 1-15 documents
3. voiceNoteEntityResolutions (by_artifactId index) -- typically 1-15 documents
4. insightDrafts          (by_artifactId index) -- typically 1-15 documents
```

This follows the pipeline order (transcripts created first, drafts created last). On retry, we delete in the same order.

### Why Not Delete in Reverse Order?

Reverse order (drafts first, then resolutions, then claims, then transcripts) would match a "cascade delete" pattern. However, since Convex mutations are atomic, order does not affect correctness. Pipeline order is chosen for readability and debugging clarity.

## Implementation Pattern

```typescript
export const retryFullPipeline = mutation({
  args: { artifactId: v.id("voiceNoteArtifacts") },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    // 1. Auth check
    // 2. Fetch artifact, verify exists

    // 3. Log retry_initiated BEFORE cleanup (survives rollback)
    await ctx.scheduler.runAfter(0,
      internal.models.voicePipelineEvents.logEvent,
      {
        eventType: "retry_initiated",
        artifactId: args.artifactId,
        metadata: { retryAttempt, retryType: "full_pipeline" },
      }
    );

    // 4. Sequential cleanup with try/catch for user-friendly errors
    try {
      // Delete transcripts
      const transcripts = await ctx.db
        .query("voiceNoteTranscripts")
        .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
        .collect();
      for (const t of transcripts) {
        await ctx.db.delete(t._id);
      }

      // Delete claims
      const claims = await ctx.db
        .query("voiceNoteClaims")
        .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
        .collect();
      for (const c of claims) {
        await ctx.db.delete(c._id);
      }

      // Delete entity resolutions
      const resolutions = await ctx.db
        .query("voiceNoteEntityResolutions")
        .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
        .collect();
      for (const r of resolutions) {
        await ctx.db.delete(r._id);
      }

      // Delete insight drafts
      const drafts = await ctx.db
        .query("insightDrafts")
        .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
        .collect();
      for (const d of drafts) {
        await ctx.db.delete(d._id);
      }
    } catch (error) {
      // Convex rolls back ALL writes on throw, so no partial state
      // But we catch to return a clean error message
      const message = error instanceof Error ? error.message : String(error);
      console.error("[retryFullPipeline] Cleanup failed:", message);
      return {
        success: false,
        message: `Cleanup failed: ${message}`,
      };
    }

    // 5. Reset artifact status (only reached if all deletes succeeded)
    await ctx.db.patch(args.artifactId, {
      status: "received",
      updatedAt: Date.now(),
    });

    // 6. Schedule pipeline restart
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact?.voiceNoteId) {
      return {
        success: false,
        message: "Artifact has no linked voice note. Cannot retry transcription.",
      };
    }
    await ctx.scheduler.runAfter(0,
      internal.actions.voiceNotes.transcribeAudio,
      { noteId: artifact.voiceNoteId }
    );

    return { success: true, message: "Full pipeline retry initiated" };
  },
});
```

## Scale Considerations

For a single artifact, the maximum document count across all 4 tables is approximately:
- 1 transcript + 15 claims + 15 resolutions + 15 drafts = ~46 deletes

This is well within Convex's single-mutation limits. No batching or pagination needed.

## Edge Cases

### 1. Artifact Has No Derived Data
If the artifact failed at ingestion (status "received"), there may be no transcripts, claims, resolutions, or drafts. The cleanup loop simply finds 0 documents and proceeds. This is safe.

### 2. Artifact Has Partial Derived Data
If the artifact failed mid-pipeline (e.g., transcription succeeded but claims extraction failed), only transcripts exist. Cleanup deletes what exists and skips empty tables. This is safe.

### 3. voiceNoteId Is Undefined
The artifact may not have been linked to a v1 voice note yet. In this case, `retryTranscription` and `retryFullPipeline` cannot schedule `transcribeAudio`. Must return `{ success: false, message: "..." }`.

### 4. Concurrent Retry Requests
If two platform staff members click retry simultaneously, both mutations will attempt cleanup. Convex's OCC (Optimistic Concurrency Control) will detect the conflict and retry one of them. Since cleanup is idempotent (deleting an already-deleted document fails gracefully), this is safe.

## Consequences

- Full pipeline retry is a single atomic transaction (Convex guarantees)
- No partial state possible -- either all data is cleaned up and pipeline restarted, or nothing changes
- Audit log (`retry_initiated` event) is recorded even if cleanup fails (scheduled functions survive rollback)
- Maximum ~46 delete operations per retry -- well within Convex limits
- User receives immediate, clear feedback on success or failure

## Alternatives Considered

### A. Two-Phase Cleanup (Delete in Action, Retry in Separate Mutation)
Rejected: Adds complexity without benefit. Actions cannot delete via `ctx.db`. Would require scheduling a cleanup mutation then a retry action, introducing race conditions.

### B. Soft Delete (Mark as "deleted" Instead of Hard Delete)
Rejected: Derived data has no business value after retry -- the new pipeline run creates fresh data. Soft delete adds query complexity (must exclude deleted records everywhere) for no gain.

### C. Delete All Tables in Parallel (Promise.all)
Not applicable: Convex mutations are single-threaded. `await ctx.db.delete()` is sequential by design. No parallelism possible within a mutation.

## Related

- ADR-VNM-005: Retry mutation scheduling pattern
- ADR-VNM-007: Retry event logging timing
- M1 Lessons Learned: Section 2 - Atomic Operations
