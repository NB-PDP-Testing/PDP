# CODE REVIEW FEEDBACK - US-P9-054

**Date**: 2026-02-02 14:45
**Reviewer**: Main Agent
**Status**: CRITICAL - MUST FIX BEFORE COMMIT

## CRITICAL: Performance Issue in sessionPlans.ts

### Problem
In `packages/backend/convex/models/sessionPlans.ts`, the new `listByTeam` query uses **incorrect index pattern**:

```typescript
// ❌ WRONG - Uses wrong index then filters teamId
const allPlans = await ctx.db
  .query("sessionPlans")
  .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
  .filter((q) =>
    q.and(
      q.eq(q.field("teamId"), args.teamId),
      q.neq(q.field("status"), "deleted")
    )
  )
  .collect();
```

**Why this is wrong:**
- Using `.withIndex("by_org")` fetches ALL session plans in the organization
- Then `.filter()` narrows to just one team - scans entire org's data unnecessarily
- Violates MANDATORY pattern: "Use withIndex(), NEVER use filter() except after withIndex"
- This is a performance anti-pattern we JUST fixed in other queries

### Solution
Use the existing **composite index** `by_org_and_team`:

```typescript
// ✅ CORRECT - Uses composite index for efficient lookup
const allPlans = await ctx.db
  .query("sessionPlans")
  .withIndex("by_org_and_team", (q) =>
    q
      .eq("organizationId", args.organizationId)
      .eq("teamId", args.teamId)
  )
  .filter((q) => q.neq(q.field("status"), "deleted"))
  .collect();
```

**Why this is correct:**
- Composite index narrows to just this team's sessions FIRST
- Filter only runs on that team's small result set (not entire org)
- Acceptable pattern: narrow with index, then filter small result set
- Available index confirmed in schema.ts line 3225

### Required Action
1. **STOP** current work on US-P9-054
2. **FIX** the listByTeam query to use `by_org_and_team` index
3. **VERIFY** type check still passes
4. **CONTINUE** with Planning Tab frontend work

## Other Issues

### Better Auth Adapter Usage
The query correctly uses `ctx.runQuery(components.betterAuth.adapter.findOne, ...)` for user lookup. This is CORRECT - no changes needed.

## Agent Notes
- False positives from auto quality check can be ignored for other parts of teams.ts (lines 415, 579, 829)
- Those are pre-existing code, not Ralph's new changes
- US-P9-053 (Players Tab) is correctly implemented and can remain as-is

---

**DO NOT COMMIT** US-P9-054 until this performance issue is fixed.
