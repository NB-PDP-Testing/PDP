# ADR-VN2-030: Draft Generation Scheduling and Integration Point

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 6 (Drafts & Confirmation Workflow)
**Story**: US-VN-019

## Context and Problem Statement

Draft generation must be scheduled after entity resolution completes. The PRD says to hook into `entityResolution.ts` after resolutions are stored. We need to determine the exact integration point and whether this should be inside the entity resolution action or as a separate scheduler step.

## Current Pipeline Flow

```
claimsExtraction.ts (line 571)
  -> ctx.scheduler.runAfter(0, entityResolution.resolveEntities)
       -> resolveEntities stores resolutions (line 174)
       -> resolveEntities updates claim statuses (line 180)
       -> resolveEntities returns null
```

## Analysis

### Option A: Schedule from inside entityResolution.ts

Add `ctx.scheduler.runAfter(0, draftGeneration.generateDrafts)` at the end of `resolveEntities`, after storing resolutions and updating claim statuses.

**Pros**: Simple. Mirrors how claimsExtraction schedules entityResolution.
**Cons**: entityResolution already does a lot. Adding another scheduling concern increases coupling.

### Option B: Schedule from claimsExtraction.ts (after entity resolution)

Cannot work -- claimsExtraction has already finished when entityResolution runs (it was scheduled async).

### Option C: Self-chaining -- entityResolution schedules draftGeneration

Same as Option A, just explicitly acknowledging the chain pattern:
```
claimsExtraction -> schedules -> entityResolution -> schedules -> draftGeneration
```

This is a natural pipeline chain. Each stage schedules the next.

## Decision

### Option A/C: Schedule from entityResolution.ts

Add the scheduling call at the end of `resolveEntities`, after line 187 (the info log):

```typescript
// entityResolution.ts, after logging summary

// Phase 6: Schedule draft generation (feature-flag gated)
await ctx.scheduler.runAfter(
  0,
  internal.actions.draftGeneration.generateDrafts,
  { artifactId: args.artifactId }
);
```

### Feature Flag Gating

The entity resolution action is already behind a feature flag (`shouldUseEntityResolution`). Draft generation should inherit this gate -- if entity resolution runs, draft generation runs. No separate feature flag needed for drafts.

However, we should add a guard inside `generateDrafts` itself:

```typescript
// draftGeneration.ts
export const generateDrafts = internalAction({
  handler: async (ctx, args) => {
    // Guard: only process if there are resolved claims
    const resolvedClaims = await ctx.runQuery(
      internal.models.voiceNoteClaims.getClaimsByArtifactAndStatus,
      { artifactId: args.artifactId, status: "resolved" }
    );

    if (resolvedClaims.length === 0) {
      console.info("[draftGeneration] No resolved claims, skipping");
      return null;
    }

    // ... generate drafts ...
  }
});
```

### Error Isolation

If draft generation fails, it must NOT affect the entity resolution results (which are already committed). Since it runs as a separately scheduled action, this is naturally isolated -- a failure in draftGeneration does not roll back entityResolution.

### Edge Case: Entity Resolution Has No Results

If all entity mentions are unresolved, the resolution action still runs `storeResolutions` (with unresolved status). Draft generation would be scheduled but find no resolved claims and exit early. This is harmless.

### Edge Case: Partial Resolution

Some claims resolved, some not. Draft generation creates drafts only for resolved claims. Unresolved claims remain untouched -- they can be resolved later via the web disambiguation UI, which could then trigger draft generation for those specific claims.

**For Phase 6**: Draft generation only runs once (after initial entity resolution). Re-running after user disambiguation is deferred to a future phase.

## Consequences

**Positive**: Clean pipeline chain. Error isolation. No separate feature flag needed. Natural extension of the existing scheduling pattern.
**Negative**: Draft generation runs even when no resolved claims exist (early exit is cheap but adds one scheduler invocation). User-resolved entities from disambiguation UI do NOT trigger draft regeneration -- this must be added in a future phase.
