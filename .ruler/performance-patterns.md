# Performance & Query Optimization (MANDATORY)

> These optimizations reduced Convex function calls from 3.2M to ~800K/month (75% reduction).
> Violating these patterns will cause billing overages and performance issues.
> Reference: GitHub Issue #330 (Performance Crisis), January 2026.

## N+1 Query Prevention

**NEVER do this (N+1 anti-pattern):**
```typescript
// BAD: Query in a loop - makes N database calls
const enriched = await Promise.all(
  items.map(async (item) => {
    const related = await ctx.db.get(item.relatedId); // Query per item!
    return { ...item, related };
  })
);
```

**ALWAYS do this (Batch pattern):**
```typescript
// GOOD: Batch fetch with Map lookup
// 1. Collect unique IDs
const uniqueIds = [...new Set(items.map(item => item.relatedId))];

// 2. Batch fetch all at once
const results = await Promise.all(
  uniqueIds.map(id => ctx.db.get(id))
);

// 3. Create Map for O(1) lookup
const dataMap = new Map();
for (const result of results) {
  if (result) dataMap.set(result._id, result);
}

// 4. Synchronous map using pre-fetched data (no await needed)
const enriched = items.map(item => ({
  ...item,
  related: dataMap.get(item.relatedId)
}));
```

## Index Usage

**NEVER use `.filter()` - always use `.withIndex()`:**
```typescript
// BAD: filter() scans entire table
const players = await ctx.db
  .query("players")
  .filter(q => q.eq(q.field("status"), "active"))
  .collect();

// GOOD: withIndex() uses database index
const players = await ctx.db
  .query("players")
  .withIndex("by_status", q => q.eq("status", "active"))
  .collect();
```

**Use composite indexes for multi-field filters:**
```typescript
const players = await ctx.db
  .query("players")
  .withIndex("by_org_and_status", q =>
    q.eq("organizationId", orgId).eq("status", "active")
  )
  .collect();
```

## Frontend Query Patterns

**Lift queries to parent components:**
```typescript
// BAD: Each ChildCard makes its own queries
function ChildCard({ childId }) {
  const passport = useQuery(api.getPassport, { childId });
  const injuries = useQuery(api.getInjuries, { childId });
  // 5 queries per child x 10 children = 50 queries!
}

// GOOD: Parent fetches all data, passes as props
function ParentDashboard({ children }) {
  const bulkData = useQuery(api.getBulkChildData, {
    childIds: children.map(c => c.id)
  });
  return children.map(child => (
    <ChildCard key={child.id} bulkData={bulkData[child.id]} />
  ));
}
```

**Use query skipping when data not needed:**
```typescript
const data = useQuery(api.getData, userId ? { userId } : "skip");
```

**Cache shared data in React Context:**
```typescript
// Fetch once at app level, share via context
// See: CurrentUserProvider, MembershipProvider
const { user } = useCurrentUser(); // Reads from context, no query
```

## Common Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| `Promise.all(items.map(async => query))` | N+1 queries | Batch fetch + Map lookup |
| `.withIndex().filter()` | Post-query filtering | Use composite index |
| `useQuery` in list item components | Query per item | Lift to parent, pass props |
| Multiple components calling same query | Duplicate subscriptions | Use shared context/provider |
| Query without checking auth state | Wasted calls | Add skip condition |

## Performance Checklist (Before Every PR)

- [ ] No `Promise.all` with queries inside the map callback
- [ ] No `.filter()` after `.withIndex()` - use composite index instead
- [ ] No `useQuery` in list item components - lift to parent
- [ ] Shared data (user, memberships) read from context, not queried
- [ ] Queries skip when data not needed (auth check, visibility)
- [ ] New indexes added for any new query patterns
