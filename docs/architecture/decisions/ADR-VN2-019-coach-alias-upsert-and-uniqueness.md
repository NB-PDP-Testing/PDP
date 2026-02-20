# ADR-VN2-019: Coach Alias Upsert and Uniqueness Strategy

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 5 (Entity Resolution & Disambiguation)
**Story**: US-VN-017 (Enhancement E5)

## Context and Problem Statement

The `coachPlayerAliases` table stores coach-specific name mappings (e.g., Coach Neil's "Tommy" always means "Thomas Murphy"). The table needs an upsert pattern: if an alias exists for (coachUserId, organizationId, rawText), increment useCount; otherwise, create a new record. Several concerns arise:

1. **Uniqueness**: Convex does not enforce unique constraints via indexes. Two concurrent voice notes could create duplicate alias records for the same (coach, org, rawText) triple.
2. **Case normalization**: "Tommy" and "tommy" and "TOMMY" should all map to the same alias.
3. **Alias override**: If a coach resolves "Tommy" to "Thomas Murphy" once, then later resolves "Tommy" to "Tommy O'Brien" (different person), which wins?

## Decision Drivers

- Convex mutations are serialized per document but concurrent inserts of different documents are possible
- The `by_coach_org_rawText` composite index ensures efficient lookup but does not enforce uniqueness
- Aliases should be deterministic -- same input should always resolve the same way
- Coach should be able to correct mistakes (re-resolve to a different player)

## Considered Options

### Option A: Check-then-insert in mutation (PRD proposal)

Query for existing alias, update if found, insert if not.

**Pros**: Simple. Works correctly under Convex's mutation serialization (mutations on the same data are automatically serialized via OCC).
**Cons**: Theoretically, two mutations could both see "no alias exists" and both insert. However, Convex's OCC (Optimistic Concurrency Control) will detect the conflict and retry one of them, at which point it will see the first insert and do an update instead.

### Option B: Always insert, deduplicate on read

Insert every resolution as a new alias. On lookup, take the most recently used one.

**Pros**: No race condition on insert. Simple write path.
**Cons**: Table grows unboundedly. Cleanup needed. Multiple records per (coach, org, rawText) complicate queries.

## Decision Outcome

**Option A** -- Check-then-insert with upsert semantics. This is safe in Convex because:

1. Convex mutations that read and write the same data are automatically conflict-detected via OCC
2. If two mutations both try to insert for the same (coach, org, rawText), the second will be retried and will find the first's insert, converting to an update

### Alias Override Behavior

When a coach resolves "Tommy" to a DIFFERENT player than the existing alias, the alias should be UPDATED (not a new record). This allows coaches to correct mistakes. The `storeAlias` mutation should:

1. Normalize rawText to lowercase + trim
2. Query by (coachUserId, organizationId, rawText)
3. If found: update resolvedEntityId, resolvedEntityName, increment useCount, update lastUsedAt
4. If not found: insert new record with useCount=1

### Case Normalization

All rawText values MUST be normalized to lowercase and trimmed before storage AND before lookup. The PRD correctly specifies this. The normalization should happen in the `storeAlias` and `lookupAlias` functions, not at the caller.

## Implementation Notes

```typescript
export const storeAlias = internalMutation({
  args: {
    coachUserId: v.string(),
    organizationId: v.string(),
    rawText: v.string(),
    resolvedEntityId: v.string(),
    resolvedEntityName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalizedRawText = args.rawText.toLowerCase().trim();

    const existing = await ctx.db
      .query("coachPlayerAliases")
      .withIndex("by_coach_org_rawText", (q) =>
        q.eq("coachUserId", args.coachUserId)
         .eq("organizationId", args.organizationId)
         .eq("rawText", normalizedRawText)
      )
      .first();

    const now = Date.now();
    if (existing) {
      // Upsert: update entity mapping + increment count
      await ctx.db.patch(existing._id, {
        resolvedEntityId: args.resolvedEntityId,
        resolvedEntityName: args.resolvedEntityName,
        useCount: existing.useCount + 1,
        lastUsedAt: now,
      });
    } else {
      await ctx.db.insert("coachPlayerAliases", {
        coachUserId: args.coachUserId,
        organizationId: args.organizationId,
        rawText: normalizedRawText,
        resolvedEntityId: args.resolvedEntityId,
        resolvedEntityName: args.resolvedEntityName,
        useCount: 1,
        lastUsedAt: now,
        createdAt: now,
      });
    }
    return null;
  },
});
```

## Consequences

**Positive**: Correct upsert behavior. Coach can override aliases. Case-insensitive matching. Safe under Convex's concurrency model.
**Negative**: If a player is removed from the organization, stale aliases could auto-resolve to a non-existent player. Mitigation: the entity resolution action should validate that the alias's resolvedEntityId still exists before auto-resolving. This is a Phase 6+ enhancement.
**Risk**: Stale aliases. Mitigation documented above.
