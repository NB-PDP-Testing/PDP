# ADR-VN2-018: Feature Flag Cascade for Entity Resolution

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 5 (Entity Resolution & Disambiguation)
**Story**: US-VN-017 (Enhancement E2)

## Context and Problem Statement

Enhancement E2 gates entity resolution behind a `entity_resolution_v2` feature flag. The PRD shows calling `getFeatureFlag` with `{ featureKey, scope: "user", userId, organizationId }`, which would look up ONLY the user-scope flag. However, the v2 pipeline uses a cascade pattern (`shouldUseV2Pipeline`) that checks env var -> platform -> org -> user in priority order.

Entity resolution should use the same cascade pattern, not a single-scope lookup.

## Decision Drivers

- The `getFeatureFlag` function returns a flag object (or null) at ONE specific scope -- it does NOT cascade
- `shouldUseV2Pipeline` does full cascade but is hardcoded to the `voice_notes_v2` feature key
- Platform staff need the ability to enable/disable entity resolution at platform, org, or user level independently of the v2 pipeline
- Entity resolution should only run when BOTH the v2 pipeline AND entity resolution are enabled

## Considered Options

### Option A: Use `getFeatureFlag` with scope="user" only (PRD proposal)

Single scope lookup. Simple but misses platform and org level overrides.

**Pros**: Simple.
**Cons**: Platform staff cannot disable entity resolution globally without updating each user's flag. Org admins cannot disable it for their org. Does not match the established cascade pattern.

### Option B: Create `shouldUseEntityResolution` (like `shouldUseV2Pipeline`)

New dedicated cascade function for the entity_resolution_v2 flag.

**Pros**: Full cascade. Consistent with existing pattern. Independent control at each level.
**Cons**: Duplicates the cascade logic from `shouldUseV2Pipeline`. Code smell.

### Option C: Make `shouldUseV2Pipeline` generic (refactor to accept featureKey)

Refactor to accept a `featureKey` parameter, making the cascade reusable.

**Pros**: DRY. One function handles all cascading flag evaluations.
**Cons**: Modifies existing function (regression risk). The env var check in `shouldUseV2Pipeline` is specific to `VOICE_NOTES_V2_GLOBAL`.

## Decision Outcome

**Option B** -- Create a dedicated `shouldUseEntityResolution` function in `lib/featureFlags.ts`. This mirrors the existing `shouldUseV2Pipeline` pattern with the feature key set to `entity_resolution_v2`.

### Rationale

1. Entity resolution is a distinct capability from the v2 pipeline -- it should be independently controllable.
2. The cascade pattern (env -> platform -> org -> user -> default false) is the established standard.
3. The env var for entity resolution should be `ENTITY_RESOLUTION_V2_GLOBAL` (matching the naming convention).
4. Refactoring `shouldUseV2Pipeline` to be generic (Option C) is a good future cleanup but introduces regression risk in Phase 5. Better to do in a separate cleanup PR.

## Implementation Notes

```typescript
// In claimsExtraction.ts integration point:
const entityResolutionEnabled = await ctx.runQuery(
  internal.lib.featureFlags.shouldUseEntityResolution,
  { organizationId, userId: coachUserId }
);

if (entityResolutionEnabled) {
  await ctx.scheduler.runAfter(0, internal.actions.entityResolution.resolveEntities, { artifactId: args.artifactId });
}
```

The entity resolution action itself should NOT re-check the flag. The flag is checked at the scheduling point (claimsExtraction.ts). If the action is scheduled, it runs.

## Consequences

**Positive**: Full cascade control. Independent of v2 pipeline flag. Platform staff can disable globally.
**Negative**: Minor code duplication (cascade logic repeated). Mitigated by documenting the pattern for future DRY refactoring.
