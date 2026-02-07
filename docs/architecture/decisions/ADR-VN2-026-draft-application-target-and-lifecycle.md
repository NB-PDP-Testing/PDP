# ADR-VN2-026: Draft Application Target and Lifecycle

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 6 (Drafts & Confirmation Workflow)
**Story**: US-VN-019

## Context and Problem Statement

When a draft is "applied", what exactly happens? The PRD mentions "apply confirmed draft to player records" but does not specify the target. The codebase has multiple possible targets:

1. **voiceNoteInsights table** (Phase 7) -- dedicated table for insights with confidence scores
2. **voiceNotes.insights embedded array** (v1) -- the original embedded insights array
3. **Direct player record updates** -- injuries table, development goals, etc.

We also need to define the full draft lifecycle and expiry behavior.

## Analysis

### Existing voiceNoteInsights Table

The `voiceNoteInsights` table (schema.ts lines 1595-1658) already provides:
- `voiceNoteId`, `insightId` -- source tracking
- `title`, `description`, `category` -- content
- `playerIdentityId`, `playerName` -- player association
- `confidenceScore`, `wouldAutoApply` -- trust scoring
- `status`: pending/applied/dismissed/auto_applied
- `appliedAt`, `appliedBy` -- tracking
- Indexes for efficient querying

This is the natural landing zone for v2 drafts. It bridges the gap between v2 claims and the existing insight-driven UI.

### Direct Player Record Updates

The existing v1 flow applies insights to actual player records (injuries table, developmentGoals, etc.) via the auto-apply system. Phase 6 should NOT duplicate that logic. Instead:

1. Draft confirmed -> create voiceNoteInsight record
2. voiceNoteInsight feeds into the existing auto-apply pipeline (Phase 7)
3. The auto-apply pipeline handles writing to injuries, developmentGoals, etc.

This respects the single-responsibility principle and reuses tested code.

### Migration from v2 Claim to voiceNoteInsight

The `applyDraft` mutation needs to translate:

| insightDrafts field | voiceNoteInsights field |
|-------|---------|
| title | title |
| description | description |
| insightType | category |
| evidence.transcriptSnippet | recommendedUpdate (or description) |
| playerIdentityId | playerIdentityId |
| (from claim) resolvedPlayerName | playerName |
| overallConfidence | confidenceScore |
| (auto-confirmed?) | wouldAutoApply = true |
| artifactId -> voiceNoteId link | voiceNoteId (via artifact.voiceNoteId) |
| draftId | insightId |
| organizationId | organizationId |
| coachUserId | coachId |

### voiceNoteId Requirement

`voiceNoteInsights` requires `voiceNoteId: v.id("voiceNotes")`. Since v2 artifacts always link back to a v1 voiceNote (`voiceNoteArtifacts.voiceNoteId`), this is available. However, if the backward-compat link is ever removed, this would break. For now, it works.

## Decision

### Apply Target: voiceNoteInsights Table

When a draft is confirmed and applied:

```typescript
// applyDraft (internalMutation)
async function applyDraft(ctx, { draftId }) {
  const draft = await getDraftByDraftId(ctx, draftId);
  if (!draft || draft.status !== "confirmed") return;

  // Get artifact to find voiceNoteId
  const artifact = await ctx.db.get(draft.artifactId);
  if (!artifact?.voiceNoteId) {
    // Cannot apply without v1 link -- mark as error
    await ctx.db.patch(draft._id, { status: "rejected" });
    return;
  }

  // Create voiceNoteInsight record
  await ctx.db.insert("voiceNoteInsights", {
    voiceNoteId: artifact.voiceNoteId,
    insightId: draft.draftId,
    title: draft.title,
    description: draft.description,
    category: mapInsightTypeToCategory(draft.insightType),
    playerIdentityId: draft.playerIdentityId,
    playerName: draft.resolvedPlayerName, // Need to denormalize this on draft
    confidenceScore: draft.overallConfidence,
    wouldAutoApply: !draft.requiresConfirmation,
    status: "pending", // Applied to insights table but not yet to player records
    organizationId: draft.organizationId,
    coachId: draft.coachUserId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Mark draft as applied
  await ctx.db.patch(draft._id, {
    status: "applied",
    appliedAt: Date.now(),
    updatedAt: Date.now(),
  });
}
```

### Draft Lifecycle

```
[generated] -> pending
                |
    +-----------+-----------+
    |           |           |
 confirmed   rejected    expired
    |
 applied (voiceNoteInsight created)
```

Statuses:
- `pending`: Awaiting coach confirmation
- `confirmed`: Coach approved, ready to apply
- `rejected`: Coach rejected (CANCEL or individual reject)
- `applied`: voiceNoteInsight record created
- `expired`: Draft exceeded TTL without action

### Draft Expiry

**Mechanism**: On-demand check, NOT a cron job.

Rationale:
- Drafts are only accessed via `getPendingDraftsForCoach` or the command handler
- When querying, filter by `createdAt > (now - TTL)` in the application layer
- If a draft is found to be expired during access, update its status to "expired"
- No cron needed because stale drafts have no side effects -- they just sit in the table

**TTL**: 7 days (configurable). After 7 days without action, drafts are considered expired.

```typescript
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isDraftExpired(draft: { createdAt: number }): boolean {
  return Date.now() - draft.createdAt > DRAFT_TTL_MS;
}
```

Expired drafts are lazily marked when accessed, not proactively cleaned up. This avoids unnecessary cron scheduling overhead for what is fundamentally a low-volume, non-critical cleanup task.

### insightType to Category Mapping

```typescript
const INSIGHT_TYPE_TO_CATEGORY: Record<string, string> = {
  injury: "injury",
  wellbeing: "medical", // medical category encompasses wellbeing
  performance: "performance",
  attendance: "attendance",
  behavior: "performance", // closest existing category
  skill_rating: "skill",
  development_milestone: "goal",
  note: "performance", // generic fallback
};
```

## Consequences

**Positive**: Reuses the entire existing voiceNoteInsights + auto-apply pipeline. No new UI needed for viewing applied drafts (they appear in the existing insights UI). Draft expiry is zero-cost (no cron).
**Negative**: Dependency on `artifact.voiceNoteId` backward-compat link. If this link is removed in a future "pure v2" mode, the apply mechanism needs updating. This is acceptable for Phase 6 since we are in coexistence mode.
**Negative**: The category mapping is imperfect (some v2 topics do not map cleanly to v1 categories). This is acceptable -- the v2 claims have richer topic taxonomy which can be surfaced in a future v2-native UI.
