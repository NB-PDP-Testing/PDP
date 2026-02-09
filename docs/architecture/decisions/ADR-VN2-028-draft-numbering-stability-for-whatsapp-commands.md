# ADR-VN2-028: Draft Numbering Stability for WhatsApp Commands

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 6 (Drafts & Confirmation Workflow)
**Story**: US-VN-020

## Context and Problem Statement

When the system sends a WhatsApp summary to a coach:

```
I captured 4 updates:
1. Ella - hamstring tightness
2. Aoife - felt anxious
3. Saoirse - missed training
4. 'The twins' - I'm not sure

Reply: CONFIRM 1,2,3 to save those
```

The coach replies "CONFIRM 1,2,3" referencing the numbered drafts. The system must resolve these numbers to the correct drafts. This requires a stable numbering scheme.

## Analysis

### The Numbering Problem

Drafts are stored in the `insightDrafts` table. When the summary message is sent, the drafts are numbered 1-N. Later, when the coach replies, we need to map those numbers back to specific draft records.

**Problem**: Between sending the summary and receiving the reply, the database could change:
- New drafts could be added (from a new voice note)
- Drafts could be confirmed by another channel (web UI)
- Drafts could expire

If the numbering is based on a dynamic query (e.g., "get all pending drafts ordered by createdAt"), the numbers could shift between send and reply.

### Option A: Query-Based Numbering (Dynamic)

When the summary is sent, query pending drafts sorted by `_creationTime`. Assign numbers 1-N. When CONFIRM is received, re-query and use the same sort order.

**Risk**: If a draft is confirmed via web UI between send and reply, the numbers shift. Draft #3 becomes draft #2.

### Option B: Artifact-Scoped Numbering

The summary message is always about drafts from a single artifact. The drafts for that artifact are numbered by `_creationTime` order within that artifact. Since all drafts for one artifact are created in a single batch, their order is stable.

**Risk**: If coach has pending drafts from MULTIPLE artifacts, the numbers in the latest summary only refer to the latest artifact's drafts. Old drafts from a previous voice note are not included in the numbering.

### Option C: Store Draft Position at Generation Time

When drafts are generated, assign a `displayOrder` field (1-indexed integer per artifact). The command handler looks up drafts by artifact + displayOrder.

**Risk**: Minimal. The `displayOrder` is stable because it's stored at creation time.

## Decision

### Option C: Stored displayOrder per Artifact

Add `displayOrder: v.number()` to the `insightDrafts` schema. Assigned sequentially (1-indexed) when drafts are created for an artifact.

```typescript
// In createDrafts (internalMutation):
for (let i = 0; i < drafts.length; i++) {
  await ctx.db.insert("insightDrafts", {
    ...drafts[i],
    displayOrder: i + 1, // 1-indexed
  });
}
```

### Command Handler Resolution

When "CONFIRM 1,2,3" is received:

1. Get the most recent artifact for this coach in this org
2. Get pending drafts for that artifact, ordered by displayOrder
3. Map draft numbers to drafts: `draftNumbers.map(n => drafts.find(d => d.displayOrder === n))`
4. Confirm matched drafts, skip unmatched numbers

```typescript
// In handleCommand:
if (command.type === "confirm_specific") {
  const recentArtifact = await getRecentArtifactForCoach(ctx, coachUserId, organizationId);
  if (!recentArtifact) return "No pending updates found.";

  const pendingDrafts = await getDraftsByArtifactAndStatus(ctx, recentArtifact._id, "pending");

  const toConfirm = command.draftNumbers
    .map(n => pendingDrafts.find(d => d.displayOrder === n))
    .filter(Boolean);

  if (toConfirm.length === 0) return "No matching draft numbers found.";

  // Confirm selected drafts
  for (const draft of toConfirm) {
    await confirmDraft(ctx, draft._id);
    await scheduleDraftApplication(ctx, draft._id);
  }

  return `Saved ${toConfirm.length} of ${pendingDrafts.length} updates.`;
}
```

### Multi-Artifact Scope

"CONFIRM" (without numbers) confirms ALL pending drafts across ALL artifacts for the coach in the current org. This is the "confirm everything" shortcut.

"CONFIRM 1,2,3" (with numbers) refers to the MOST RECENT artifact only. If the coach needs to address older artifacts, they use the web UI.

### Missing Number Handling

If coach sends "CONFIRM 1,5" but only drafts 1-4 exist:
- Draft 1 is confirmed
- Draft 5 is not found, silently skipped
- Response: "Saved 1 of 4 updates. Draft #5 was not found."

## Consequences

**Positive**: Stable numbering that survives intermediate state changes. Simple implementation. Clear scoping (numbers refer to most recent artifact).
**Negative**: Adds `displayOrder` field to the schema. Minor: coaches cannot use numbers to reference drafts from older artifacts (must use web UI or full CONFIRM).
