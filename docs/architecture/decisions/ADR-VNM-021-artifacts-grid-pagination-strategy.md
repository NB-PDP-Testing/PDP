# ADR-VNM-021: Artifacts Grid Pagination Strategy

**Date:** 2026-02-17
**Status:** Accepted
**Context:** Phase M6, Story US-VNM-009

## Context and Problem Statement

The artifacts grid (US-VNM-009) needs to display paginated artifact data with load-more capability. The PRD mandates cursor-based pagination via `usePaginatedQuery`, but this hook has **zero usage** across the entire codebase. The M5 dashboard already uses `useQuery` with manual `{ numItems, cursor }` args. Additionally, the existing `getRecentArtifacts` query uses `.take(limit)` (no cursor support) and is scoped to the current user via `senderUserId`, not platform-wide.

## Decision Drivers

- PRD mandates cursor-based pagination with `.paginate()` on backend
- `usePaginatedQuery` from `convex/react` is available but unused in codebase
- M5 established pattern: `useQuery` with `{ numItems, cursor: null }` pagination args
- Need platform-wide artifact listing (not user-scoped like `getRecentArtifacts`)
- Must support filter changes without breaking pagination cursors

## Considered Options

### Option 1: Use `usePaginatedQuery` (Convex native)

**Approach:** Import `usePaginatedQuery` from `convex/react`, use with `{ initialNumItems: 25 }`, call `loadMore(25)` for next page.

**Pros:**
- Built-in load-more with cursor management
- Convex-optimized reactive pagination
- Returns `{ results, status, loadMore }` -- clean API
- Accumulates results across pages automatically

**Cons:**
- Zero existing usage in codebase (new pattern)
- Filter changes may require resetting accumulated results
- Requires backend query to use `paginationOptsValidator` from `convex/server`

**Complexity:** Low
**Performance:** Optimal (native Convex pagination)

### Option 2: Manual pagination with `useQuery` (M5 pattern)

**Approach:** Continue M5 pattern with `useQuery` and `{ numItems, cursor }` args, manage cursor state in component.

**Pros:**
- Consistent with M5 codebase pattern
- Already proven working

**Cons:**
- Manual cursor state management
- Does not accumulate results (each page replaces previous)
- More boilerplate code

**Complexity:** Medium
**Performance:** Good

## Decision Outcome

**Chosen Option:** Option 1 -- Use `usePaginatedQuery`

**Rationale:**
- This is the correct Convex pattern for paginated lists
- The artifacts grid is the perfect use case (load-more / infinite scroll)
- Introducing this pattern now benefits M7 events page too
- M5 used `useQuery` for fixed-size recent data (20 items), which is appropriate for that use case. The artifacts grid is fundamentally different -- it needs unbounded browsing.

**CRITICAL: Requires a NEW backend query.** The existing `getRecentArtifacts` is user-scoped (`.withIndex("by_senderUserId_and_createdAt")`) and uses `.take()`. The new query must:
1. Accept `paginationOptsValidator` from `convex/server`
2. Be platform-staff-only
3. Support status filter via `.withIndex("by_status_and_createdAt")`
4. Support platform-wide listing via `.withIndex("by_status_and_createdAt")` or a new `by_createdAt` index
5. Return paginated results with `{ page, isDone, continueCursor }`

**New Query Signature:**
```typescript
// In voicePipelineEvents.ts or voiceNoteArtifacts.ts
export const getPlatformArtifacts = query({
  args: {
    paginationOpts: paginationOptsValidator,
    statusFilter: v.optional(v.string()),
  },
  returns: /* paginated result */,
  handler: async (ctx, args) => {
    await verifyPlatformStaff(ctx);

    if (args.statusFilter) {
      return ctx.db.query("voiceNoteArtifacts")
        .withIndex("by_status_and_createdAt", q => q.eq("status", args.statusFilter))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    // Need new index for unfiltered platform-wide query
    return ctx.db.query("voiceNoteArtifacts")
      .order("desc")
      .paginate(args.paginationOpts);
  }
});
```

**Frontend Pattern:**
```typescript
const { results, status, loadMore } = usePaginatedQuery(
  api.models.voiceNoteArtifacts.getPlatformArtifacts,
  isPlatformStaff ? { statusFilter: activeFilter || undefined } : "skip",
  { initialNumItems: 25 }
);
```

## Implementation Notes

1. Import `paginationOptsValidator` from `convex/server` in backend query
2. Import `usePaginatedQuery` from `convex/react` in frontend
3. When filters change, `usePaginatedQuery` will re-execute from scratch (reset cursor)
4. Add "Load More" button: `{status === "CanLoadMore" && <button onClick={() => loadMore(25)}>Load More</button>}`
5. Loading states: `status === "LoadingFirstPage"` for initial, `status === "LoadingMore"` for subsequent
