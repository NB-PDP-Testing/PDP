# ADR-VN2-037: applyDraft Output Bridge Architecture

**Status**: Accepted
**Date**: 2026-02-08
**Phase**: 7C
**Story**: US-VN-026

## Context

The current `applyDraft` (insightDrafts.ts:457-529) only creates a `voiceNoteInsights` record. It does NOT:
1. Update the `voiceNotes.insights[]` embedded array (backward compatibility)
2. Schedule `processVoiceNoteInsight` (parent summary generation)
3. Create `autoAppliedInsights` audit records (for auto-confirmed drafts)

The v1 pipeline (`buildInsights`) does all three. For v2 to be a complete replacement, `applyDraft` must produce identical downstream effects.

## Decision

Extend `applyDraft` with three additional steps after the existing `voiceNoteInsights` insert:

### Step 1: Update voiceNotes.insights[] Embedded Array
```typescript
const note = await ctx.db.get(artifact.voiceNoteId);
if (note) {
  const currentInsights = note.insights || [];
  currentInsights.push({
    id: draft.draftId,
    playerIdentityId: draft.playerIdentityId,
    playerName: draft.resolvedPlayerName,
    title: draft.title,
    description: draft.description,
    category: draft.insightType,
    recommendedUpdate: claim.recommendedAction || '',
    confidence: draft.overallConfidence,
    status: 'applied',
    appliedAt: Date.now(),
  });
  await ctx.db.patch(artifact.voiceNoteId, {
    insights: currentInsights,
    insightsStatus: 'completed',
  });
}
```

### Step 2: Schedule Parent Summary (Guarded)
```typescript
if (draft.playerIdentityId) {
  await ctx.scheduler.runAfter(0,
    internal.actions.coachParentSummaries.processVoiceNoteInsight,
    {
      voiceNoteId: artifact.voiceNoteId,
      insightId: draft.draftId,         // STRING, not Convex _id
      insightTitle: draft.title,
      insightDescription: draft.description,
      playerIdentityId: draft.playerIdentityId,
      organizationId: draft.organizationId,
      coachId: artifact.senderUserId,
    }
  );
}
```

### Step 3: Create Audit Record (Auto-Confirmed Only)
```typescript
if (draft.requiresConfirmation === false && draft.playerIdentityId) {
  await ctx.db.insert('autoAppliedInsights', {
    insightId: insightRecordId,    // v.id("voiceNoteInsights") -- Convex _id!
    voiceNoteId: artifact.voiceNoteId,
    playerIdentityId: draft.playerIdentityId,
    coachId: artifact.senderUserId,
    organizationId: draft.organizationId,
    category: draft.insightType,
    confidenceScore: draft.overallConfidence,
    insightTitle: draft.title,
    insightDescription: draft.description,
    appliedAt: Date.now(),
    autoAppliedByAI: true,
    // Required fields from schema (see critical findings):
    playerId: draft.playerIdentityId as any,  // DEPRECATED but required
    changeType: draft.insightType,
    targetTable: 'voiceNoteInsights',
    newValue: JSON.stringify({ title: draft.title, description: draft.description }),
  });
}
```

## Critical Type Findings

### autoAppliedInsights.insightId
- Type: `v.id("voiceNoteInsights")` -- This is a Convex _id, NOT a string UUID
- Source: Must use the return value from `ctx.db.insert("voiceNoteInsights", ...)` (captured as `insightRecordId`)
- PRD correctly identifies this at Phase 7C

### autoAppliedInsights.playerId (DEPRECATED but REQUIRED)
- Schema (line 1669): `playerId: v.id("orgPlayerEnrollments")` -- NOT optional!
- This field is DEPRECATED per the comment but is NOT wrapped in `v.optional()`
- The draft has `playerIdentityId` which is `v.id("playerIdentities")` -- different table!
- **This is a blocking schema issue**: either make `playerId` optional, or pass a dummy/matching value
- Recommended: Add `v.optional()` wrapper to `playerId` in schema.ts

### autoAppliedInsights Required Fields
The schema also requires these non-optional fields:
- `changeType: v.string()` -- can use `draft.insightType`
- `targetTable: v.string()` -- use `"voiceNoteInsights"`
- `newValue: v.string()` -- JSON serialized change

The PRD Phase 7C (US-VN-026) acceptance criteria do NOT mention these required fields. Ralph must handle them.

## Schema Addition: Back-Link Fields

Add to voiceNoteInsights table definition:
```typescript
sourceArtifactId: v.optional(v.id('voiceNoteArtifacts')),
sourceClaimId: v.optional(v.id('voiceNoteClaims')),
sourceDraftId: v.optional(v.string()),
```

These enable traceability from applied insights back to their v2 source.

## Consequences

- Applied v2 drafts are indistinguishable from v1 insights in the frontend
- Parent summaries generate for v2 insights (when player is resolved)
- Auto-confirmed drafts create audit trail for compliance
- voiceNotes.insights[] stays consistent for any code reading the embedded array
- Schema change needed for autoAppliedInsights.playerId (make optional)
