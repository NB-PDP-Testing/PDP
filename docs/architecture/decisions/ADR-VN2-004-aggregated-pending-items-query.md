# ADR-VN2-004: Aggregated Pending Items Query Design

**Date:** 2026-02-06
**Status:** Accepted
**Context:** Phase 2 - Coach Quick Review Microsite, Stories US-VN-007, US-VN-009

## Context and Problem Statement

The core query for the microsite -- `getCoachPendingItems` -- must aggregate all pending insights across ALL voice notes linked to a coach's review link, categorize them by type (injuries, unmatched, needs review, todos, team notes, auto-applied), and return them in priority order. This query drives the entire review UI. How should it be designed for correctness and performance?

## Decision Drivers

- **Performance**: this query runs on every microsite page load AND subscribes for real-time updates
- **N+1 prevention**: MANDATORY per CLAUDE.md -- must use batch fetch + Map lookup
- **Data shape**: insights are embedded in the `voiceNotes.insights` array, not in a separate table
- **Scalability**: a coach may have 5-20 voice notes on one link, each with 3-10 insights = 15-200 items
- **findSimilarPlayers dependency**: unmatched items need fuzzy suggestions, but `findSimilarPlayers` is an `internalQuery`

## Considered Options

### Option 1: Single Aggregation Query (Recommended)

One query fetches all voice notes by ID, extracts insights, categorizes them, and returns the full structured result.

```typescript
export const getCoachPendingItems = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    // 1. Validate code
    // 2. Get voiceNoteIds from link
    // 3. Batch fetch all voice notes: Promise.all(ids.map(id => ctx.db.get(id)))
    // 4. Extract and flatten all insights
    // 5. Categorize by type/status
    // 6. Return structured result
  },
});
```

**Pros:**
- Single subscription for the entire UI
- Batch fetch by ID is efficient (direct `ctx.db.get` by `_id`, not a query)
- All categorization logic is in one place
- Real-time: when any voice note is mutated, the subscription updates

**Cons:**
- Complex query function (many lines of categorization logic)
- Returns a large payload (all items at once)
- Cannot include fuzzy match suggestions for unmatched items (requires separate query)

### Option 2: Multiple Queries Per Category

Separate queries for each section: `getInjuries`, `getUnmatched`, `getNeedsReview`, etc.

**Pros:**
- Simpler individual queries
- Can lazy-load sections

**Cons:**
- 6+ concurrent subscriptions per page load (violates CLAUDE.md guidance on query count)
- Redundant voice note fetching across queries
- More complex client-side coordination
- Harder to compute progress counter (needs data from all queries)

## Decision Outcome

**Chosen option: Option 1 (Single Aggregation Query)**, because:

1. One subscription is far more efficient than 6 subscriptions
2. The progress counter needs total/reviewed counts across all categories
3. Batch fetch by `_id` is the fastest possible Convex pattern (no index scan)
4. Categorization logic is straightforward -- just switch on `insight.category` and `insight.status`

## Implementation Notes

### Batch Fetch Pattern

```typescript
// Step 1: Get voice note IDs from link
const voiceNoteIds = link.voiceNoteIds;

// Step 2: Batch fetch (ctx.db.get is direct ID lookup, not N+1)
const voiceNotes = await Promise.all(
  voiceNoteIds.map(id => ctx.db.get(id))
);
const validNotes = voiceNotes.filter(Boolean);

// Step 3: Flatten all insights with source note context
const allInsights = validNotes.flatMap(note =>
  note.insights.map(insight => ({
    ...insight,
    voiceNoteId: note._id,
    noteDate: note.date,
    noteType: note.type,
  }))
);

// Step 4: Categorize
const injuries = allInsights.filter(i => i.category === "injury" && i.status === "pending");
const unmatched = allInsights.filter(i => !i.playerIdentityId && i.status === "pending" && i.category !== "team_culture");
const needsReview = allInsights.filter(i => i.status === "pending" && i.playerIdentityId && i.category !== "injury" && i.category !== "todo" && i.category !== "team_culture");
const todos = allInsights.filter(i => i.category === "todo" && i.status === "pending");
const teamNotes = allInsights.filter(i => i.category === "team_culture" && i.status === "pending");
const autoApplied = allInsights.filter(i => i.status === "auto_applied" || i.status === "applied");
```

**Note on `ctx.db.get` vs N+1**: Using `Promise.all(ids.map(id => ctx.db.get(id)))` is acceptable here because `ctx.db.get` is a direct document lookup by `_id`, which Convex optimizes internally. This is NOT the same as the N+1 anti-pattern where you run index queries inside a loop. The CLAUDE.md anti-pattern applies to `ctx.db.query(...).withIndex(...)` inside loops.

### findSimilarPlayers Refactoring

The `findSimilarPlayers` function is currently an `internalQuery` in `orgPlayerEnrollments.ts`. A public `query` cannot call `ctx.runQuery(internal.xxx)`.

**Solution**: Extract the matching logic into a shared utility function in `convex/lib/playerMatching.ts` that takes a `QueryCtx` and performs the database queries directly. Both the internal query and the public wrapper call this shared function.

```
convex/lib/playerMatching.ts:
  export async function findSimilarPlayersLogic(ctx: QueryCtx, args): Promise<Result[]> {
    // The actual matching logic, using ctx.db queries
  }

convex/models/orgPlayerEnrollments.ts:
  export const findSimilarPlayers = internalQuery({
    handler: (ctx, args) => findSimilarPlayersLogic(ctx, args)
  });

convex/models/whatsappReviewLinks.ts:
  export const findSimilarPlayersForReview = query({
    handler: (ctx, args) => {
      validateReviewCode(ctx, args.code);
      return findSimilarPlayersLogic(ctx, { organizationId: link.organizationId, ... });
    }
  });
```

### Pagination Consideration

For most coaches, 15-100 pending items fit easily in a single response. If a coach somehow accumulates 200+ items, client-side virtualization (e.g., collapsing sections) is sufficient. Server-side pagination is not needed for Phase 2.

### Return Type

```typescript
{
  injuries: InsightItem[],       // Priority 1
  unmatched: InsightItem[],      // Priority 2
  needsReview: InsightItem[],    // Priority 3
  todos: InsightItem[],          // Priority 4
  teamNotes: InsightItem[],      // Priority 5
  autoApplied: InsightItem[],    // Collapsed
  totalCount: number,            // All actionable items
  reviewedCount: number,         // Applied + dismissed count
  voiceNoteCount: number,        // Number of voice notes in link
}
```

## Consequences

**Positive:**
- Single, efficient subscription for the entire review UI
- Batch fetch by ID is the fastest Convex pattern
- Progress counter computed from the same data (no extra query)
- Real-time updates when any underlying voice note changes

**Negative:**
- Large return payload (acceptable for the expected data volume)
- Complex categorization logic in one function (mitigated by clear comments and tests)
- Requires refactoring `findSimilarPlayers` into shared utility

## References

- CLAUDE.md: N+1 Prevention section, Frontend Query Patterns section
- Existing pattern: `voiceNotes.ts` `getAllVoiceNotes` uses batch fetch for coach names
- Phase 2 PRD: US-VN-007 `getCoachPendingItems` acceptance criteria
