# ADR-VN2-027: Migration Batch Size and Timeout Strategy

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 6 (Drafts & Confirmation Workflow)
**Story**: US-VN-021

## Context and Problem Statement

The v1-to-v2 migration script runs as a Convex `internalAction`. Convex actions have:
- **10-minute timeout** (maximum execution time)
- **No direct `ctx.db` access** -- must use `ctx.runMutation` and `ctx.runQuery`
- **Each `ctx.runMutation` is a separate transaction** -- no atomicity across batches

We need to determine the right batch size and handle large datasets that might exceed the action timeout.

## Analysis

### Data Volume Estimates

For a typical organization:
- 50-200 voice notes over 3-6 months
- Each voice note produces: 1 artifact + 1 transcript + 0-5 claims (estimated 2 average)

For the entire platform:
- 5-20 organizations * 200 voice notes = 1,000-4,000 voice notes total
- Producing ~4,000-16,000 new records

### Per-Record Processing Cost

For each v1 voiceNote, the migration must:
1. `ctx.runQuery` to check if already migrated (1 query)
2. `ctx.runMutation` to create artifact (1 mutation)
3. `ctx.runMutation` to link artifact to voiceNote (1 mutation)
4. `ctx.runMutation` to create transcript (1 mutation, if transcript exists)
5. `ctx.runMutation` to create claims (1 mutation per insight, if insights exist)

That's 3-7 transactions per voice note. At ~50ms per transaction, that's 150-350ms per voice note.

### Batch Size Calculation

With a 10-minute (600s) timeout and ~250ms per voice note:
- Maximum theoretical: 600,000ms / 250ms = 2,400 voice notes
- With safety margin (50%): ~1,200 voice notes per action invocation
- With logging overhead: ~800-1,000 voice notes per action invocation

**But**: The action fetches all voiceNotes first. For a large org, `.collect()` on a table without limits is risky.

### Strategies

**Option A: Single action, process all at once**
- Simple but risky for large datasets
- If timeout occurs at record 900, records 1-899 are committed but the action reports failure
- Idempotency protects against re-processing

**Option B: Self-chaining actions**
- Action processes N records, then schedules itself for the next batch
- Each batch is a new action with a fresh 10-minute timeout
- Progress is tracked via a cursor (last processed voiceNote ID)

**Option C: Single action with internal batch size**
- Process records in chunks within the action
- Log progress after each chunk
- If timeout occurs, the idempotency check handles re-runs

## Decision

### Option C: Single action with internal batching + idempotency

```typescript
export const migrateVoiceNotesToV2 = internalAction({
  args: {
    organizationId: v.optional(v.string()),
    dryRun: v.boolean(),
    batchSize: v.optional(v.number()), // default 50
  },
  returns: v.object({
    processed: v.number(),
    artifacts: v.number(),
    transcripts: v.number(),
    claims: v.number(),
    errors: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    const batchSize = Math.min(args.batchSize ?? 50, 200);
    // Process in internal batches of `batchSize`
    // Log progress every batch
    // Idempotency: skip if artifact already exists for this voiceNote
  }
});
```

### Default Batch Size: 50

Rationale:
- 50 voice notes * ~300ms = 15 seconds per batch -- well within limits
- Progress logging after each batch of 50 gives visibility
- Total of 50 * 200 = 10,000 voice notes can be processed in ~200 batches = ~60 seconds
- Leaves ample headroom for the 10-minute timeout

### Maximum Batch Size: 200

Hard cap to prevent accidentally requesting a massive batch that might time out.

### Idempotency Check

Before processing each voiceNote:
```typescript
// Check if artifact already exists for this voiceNote
const existingArtifacts = await ctx.runQuery(
  internal.models.voiceNoteArtifacts.getArtifactsByVoiceNote,
  { voiceNoteId: voiceNote._id }
);
if (existingArtifacts.length > 0) {
  // Already migrated
  skipped++;
  continue;
}
```

This uses the existing `by_voiceNoteId` index on `voiceNoteArtifacts`, which is efficient.

### For Very Large Datasets: Self-Chaining

If an organization has 1000+ voice notes, the caller should run the migration with `organizationId` set to process one org at a time. If the entire platform needs migration, run it org-by-org from the Convex dashboard.

For a future enhancement, Option B (self-chaining) can be added:
```typescript
if (processedInThisRun >= maxPerRun) {
  // Schedule continuation
  await ctx.scheduler.runAfter(0, internal.actions.migration.migrateVoiceNotesToV2, {
    ...args,
    cursor: lastProcessedId,
  });
}
```

This is NOT needed for Phase 6 given expected data volumes but documented here for future reference.

## Consequences

**Positive**: Simple implementation. Idempotent. Progress visibility. Safe within Convex timeout limits for expected data volumes.
**Negative**: Single-action approach means progress is only reported at completion. If the action times out, partial results are committed but the summary is lost. The caller must re-run and the idempotency check ensures no duplicates.
**Negative**: The query `voiceNotes.by_orgId` may return a large result set. For organizations with 500+ voice notes, this is acceptable but should be monitored.
