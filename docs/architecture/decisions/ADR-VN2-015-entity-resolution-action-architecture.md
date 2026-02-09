# ADR-VN2-015: Entity Resolution Action Architecture

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 5 (Entity Resolution & Disambiguation)
**Story**: US-VN-017

## Context and Problem Statement

Phase 5 introduces entity resolution -- mapping raw text mentions ("Shawn", "Tommy") to actual database entities (players, teams, coaches). The PRD proposes a single `resolveEntities` internalAction with a 14-step sequential pipeline. We need to decide whether this monolithic action is appropriate or should be decomposed, and how to manage the sequential `ctx.runQuery` calls within Convex's action constraints.

## Decision Drivers

- Convex actions have no hard time limit but should complete reasonably fast
- Actions CAN call `ctx.runQuery`/`ctx.runMutation` but each is a separate transaction
- The 14 steps include: artifact lookup, feature flag check, claims retrieval, trust level fetch, alias lookups (per unique name), fuzzy matching (per unique name), resolution storage, and claim status updates
- Worst case: a voice note with 15 unique unresolved player names = ~20+ sequential `ctx.runQuery` calls

## Considered Options

### Option A: Single monolithic internalAction (PRD proposal)

All 14 steps in one `resolveEntities` function. Sequential `ctx.runQuery`/`ctx.runMutation` calls for each step.

**Pros**: Simple, easy to understand, single retry boundary, matches Phase 4 pattern (extractClaims).
**Cons**: Many sequential database round-trips. If it fails partway, partial state is possible (some resolutions stored, others not).

### Option B: Split into action + mutation pair

Action handles read-only computation (alias lookups, fuzzy matching, candidate scoring). Then calls a single `internalMutation` to batch-write all resolutions and update claim statuses atomically.

**Pros**: Atomic write path (all resolutions stored or none). Cleaner separation of read vs write. Mutation handles all state changes in one transaction.
**Cons**: More complex. Mutation has bandwidth/time limits -- with many resolutions + claim updates, could hit limits.

### Option C: Granular action chain (one per unique name)

First action gathers context, then schedules one sub-action per unique name group. Each sub-action resolves one name and writes its results.

**Pros**: Maximum parallelism. Failure of one name doesn't block others.
**Cons**: Over-engineered for typical workload (3-5 unique names per voice note). Scheduler overhead. Harder to aggregate final claim status updates.

## Decision Outcome

**Option B** -- Split into action (read) + mutation (write). The resolveEntities action gathers all data, computes candidates and statuses, then calls a single `storeResolutionsAndUpdateClaims` internalMutation to write everything atomically.

### Rationale

1. Phase 4's `extractClaims` action already demonstrates the pattern of "action does computation, then calls a single mutation to store." This is the established project pattern.
2. Atomic writes prevent partial-resolution states where some claims are updated but others are not.
3. Typical voice notes have 3-8 claims with 2-5 unique player names. The sequential alias+fuzzy queries (5-10 `ctx.runQuery` calls) are acceptable for action context.
4. The write mutation receives a pre-computed array of resolutions plus claim status updates, making it simple and fast.

## Implementation Notes

```
resolveEntities (internalAction):
  1. Read: artifact, claims, trust level, coach context
  2. Compute: alias lookups, fuzzy matching, candidate scoring
  3. Write: ctx.runMutation(storeResolutionsAndUpdateClaims, { resolutions, claimUpdates })

storeResolutionsAndUpdateClaims (internalMutation):
  1. Insert all resolution records
  2. Update all claim statuses
  3. Return resolution IDs
```

## Consequences

**Positive**: Atomic writes, matches existing patterns, reasonable performance for typical workloads.
**Negative**: If a voice note has 20+ unique names, the action's sequential fuzzy matching queries could be slow (but still within acceptable bounds).
**Risk**: Large batch mutations could hit Convex bandwidth limits. Mitigation: cap resolution count per artifact (e.g., 100 max).
