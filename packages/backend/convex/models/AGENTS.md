# Convex Models - Agent Guidelines

This directory contains domain-specific queries and mutations for the backend.

---

## CRITICAL: Better Auth Adapter Pattern (MANDATORY)

**Phase 8 established this pattern - ALL future code MUST follow it.**

### When to Use Better Auth Adapter

**ALWAYS use the adapter when querying Better Auth tables:**
- `user`
- `member`
- `organization`
- `team` (Better Auth extended table)

### Pattern Examples

**❌ NEVER do this (Direct database query):**
```typescript
// BAD - Direct query to Better Auth table
const user = await ctx.db.get(userId);
const members = await ctx.db
  .query("member")
  .withIndex("by_orgId", (q) => q.eq("organizationId", orgId))
  .collect();
```

**✅ ALWAYS do this (Better Auth adapter):**
```typescript
// GOOD - Better Auth adapter
const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  table: "user",
  where: { field: "id", value: userId }
});

const members = await ctx.runQuery(components.betterAuth.adapter.findMany, {
  table: "member",
  where: { field: "organizationId", value: orgId }
});
```

### Real Example from Codebase

See `packages/backend/convex/models/flows.ts:636`:
```typescript
membership = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  table: "member",
  where: { field: "id", value: membershipId }
});
```

---

## Index Usage (MANDATORY)

**NEVER use `.filter()` - ALWAYS use `.withIndex()`**

This is critical for performance. Phase 7 optimization reduced function calls from 3.2M to ~800K/month.

**❌ BAD:**
```typescript
const comments = await ctx.db
  .query("insightComments")
  .filter((q) => q.eq(q.field("insightId"), insightId))
  .collect();
```

**✅ GOOD:**
```typescript
const comments = await ctx.db
  .query("insightComments")
  .withIndex("by_insight", (q) => q.eq("insightId", insightId))
  .collect();
```

**Rule:** Every query must use an index. If the index doesn't exist, add it to schema.ts first.

---

## N+1 Query Prevention (MANDATORY)

**NEVER query in a loop.**

**❌ BAD (N+1 anti-pattern):**
```typescript
const enriched = await Promise.all(
  items.map(async (item) => {
    const related = await ctx.db.get(item.relatedId); // Query per item!
    return { ...item, related };
  })
);
```

**✅ GOOD (Batch fetch then Map lookup):**
```typescript
// 1. Collect all IDs
const relatedIds = items.map(item => item.relatedId);

// 2. Batch fetch
const relatedItems = await Promise.all(
  relatedIds.map(id => ctx.db.get(id))
);

// 3. Create Map for O(1) lookup
const relatedMap = new Map(
  relatedItems.map(item => [item._id, item])
);

// 4. Enrich with single map lookup per item
const enriched = items.map(item => ({
  ...item,
  related: relatedMap.get(item.relatedId)
}));
```

---

## Function Syntax (MANDATORY)

Always use the new function syntax with validators:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getPlayer = query({
  args: { playerId: v.id("orgPlayerEnrollments") },
  returns: v.union(v.object({ /* ... */ }), v.null()),
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

**Both `args` AND `returns` validators are required.**

---

## File Organization

- **Queries/mutations:** Domain-specific files (e.g., `teamCollaboration.ts`, `voiceNotes.ts`)
- **Actions (external APIs):** Go in `packages/backend/convex/actions/`
- **Internal helpers:** Go in `packages/backend/convex/lib/`

---

## Testing Pattern

**Test all queries/mutations in Convex dashboard before committing:**

1. Open Convex dashboard: https://dashboard.convex.dev/
2. Navigate to your deployment
3. Go to "Functions" tab
4. Select your query/mutation
5. Provide test arguments
6. Verify results match expected output

---

## Phase 8 Key Learnings

1. **Better Auth adapter is non-negotiable** - Direct queries to Better Auth tables will break
2. **Index all multi-field queries** - `by_orgId_and_status`, `by_team_and_priority`, etc.
3. **Use skeleton loaders** - 19 types available (PageSkeleton, ListSkeleton, CardSkeleton, etc.)
4. **Functional roles** - Extended member table has `functionalRoles[]` array (coach, parent, admin, player)

---

## Common Pitfalls

1. **Forgetting to run codegen** - Always run `npx -w packages/backend convex codegen` after backend changes
2. **Using `.filter()` instead of `.withIndex()`** - Performance killer
3. **Not including `returns` validator** - TypeScript errors in frontend
4. **Direct Better Auth table queries** - Use adapter pattern
5. **N+1 queries in loops** - Batch fetch instead

---

**Last Updated:** January 30, 2026 (Phase 9 Week 1)
**Updated By:** Claude Sonnet 4.5
