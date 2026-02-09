# ADR-VN2-003: Public Queries with Per-Call Code Validation

**Date:** 2026-02-06
**Status:** Accepted
**Context:** Phase 2 - Coach Quick Review Microsite, Stories US-VN-007, US-VN-008, US-VN-009, US-VN-010

## Context and Problem Statement

The microsite at `/r/[code]` has no authentication. All data fetching for the review queue must work without a user session. In Convex, queries and mutations can be `query`/`mutation` (public, callable from any client) or `internalQuery`/`internalMutation` (only callable from other backend functions). How should microsite data access be structured?

## Decision Drivers

- **No user session**: the microsite has no Better Auth session; standard auth middleware cannot be used
- **Code = auth**: the 8-char code is the sole authentication mechanism
- **Real-time updates**: Convex `useQuery` subscriptions provide real-time UI updates as items are actioned
- **Security**: every data access must validate the code's existence, status, and expiry
- **Performance**: validation overhead must be minimal (single index lookup)

## Considered Options

### Option 1: Public Queries with Per-Call Code Validation

All microsite queries are standard Convex `query` functions (public, subscribable). Every query takes `code: v.string()` as its first argument and validates the code before returning data.

```typescript
export const getCoachPendingItems = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("whatsappReviewLinks")
      .withIndex("by_code", q => q.eq("code", args.code))
      .unique();
    if (!link || link.status !== "active" || Date.now() > link.expiresAt) {
      return null;
    }
    // Fetch and return data scoped to this coach/org
  },
});
```

**Pros:**
- Works with `useQuery` subscriptions (real-time updates)
- Simple pattern -- each query is self-contained
- Code validation is a single index lookup (fast)
- Follows existing Convex patterns in the codebase

**Cons:**
- Code validation is duplicated in every query (can be extracted to a helper)
- Public queries are callable by anyone who knows the function name (but code validation prevents data access)

### Option 2: HTTP Actions

Use Convex HTTP routes (like the existing `/whatsapp/incoming` webhook) to serve microsite data as REST endpoints.

**Pros:**
- Explicit HTTP endpoints with full control over headers, status codes
- Can set security headers (CORS, CSP)
- Familiar REST pattern

**Cons:**
- No real-time subscriptions (must poll or use SSE)
- Loses Convex's automatic reactive updates
- More boilerplate (HTTP routing, response formatting)
- Goes against the codebase's existing pattern of using `useQuery`

### Option 3: Convex Middleware / Auth Hook

Create a custom middleware that validates the code before any query runs.

**Pros:**
- DRY -- validation in one place

**Cons:**
- Convex does not natively support middleware on queries
- Would require wrapping every query in a custom function
- Adds architectural complexity

## Decision Outcome

**Chosen option: Option 1 (Public Queries with Per-Call Code Validation)**, because:

1. Real-time subscriptions via `useQuery` are critical for the review UX (items disappear as they're actioned)
2. The code validation is a single index lookup (`by_code`) which is O(1) and adds negligible overhead
3. The pattern is consistent with how the rest of the Convex backend works
4. A shared `validateReviewCode` helper can DRY up the validation logic

## Implementation Notes

### Shared Validation Helper

Create a reusable helper to avoid code duplication:

```typescript
// In packages/backend/convex/models/whatsappReviewLinks.ts

async function validateReviewCode(
  ctx: QueryCtx,
  code: string
): Promise<{ link: Doc<"whatsappReviewLinks">; isExpired: boolean } | null> {
  const link = await ctx.db
    .query("whatsappReviewLinks")
    .withIndex("by_code", q => q.eq("code", code))
    .unique();

  if (!link) return null;

  const isExpired = link.status !== "active" || Date.now() > link.expiresAt;
  return { link, isExpired };
}
```

Every public query/mutation calls this first. If null or expired, return null or an appropriate error state.

### Public Mutations

Mutations (apply, dismiss, edit, batch-apply) also need code validation. Use the same pattern:

```typescript
export const applyInsightFromReview = mutation({
  args: { code: v.string(), noteId: v.id("voiceNotes"), insightId: v.string() },
  handler: async (ctx, args) => {
    const result = await validateReviewCode(ctx, args.code);
    if (!result || result.isExpired) throw new Error("Invalid or expired link");
    // Verify noteId is in link.voiceNoteIds
    // Apply the insight
  },
});
```

### findSimilarPlayers Wrapper

Phase 1's `findSimilarPlayers` is an `internalQuery`. The microsite needs a public wrapper:

```typescript
export const findSimilarPlayersForReview = query({
  args: { code: v.string(), searchName: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const result = await validateReviewCode(ctx, args.code);
    if (!result || result.isExpired) return null;
    // Cannot call internalQuery from a query -- must inline the logic
    // or restructure findSimilarPlayers as a shared utility function
  },
});
```

**IMPORTANT**: A public `query` cannot call `ctx.runQuery(internal.xxx)`. The `findSimilarPlayers` logic must be extracted into a shared function that both the internal query and the public wrapper can call. See ADR-VN2-004 for details.

## Consequences

**Positive:**
- Real-time UI updates via Convex subscriptions
- Consistent with existing codebase patterns
- Simple, well-understood security model

**Negative:**
- Every public function must remember to validate the code (mitigated by shared helper and code review)
- Public function names are discoverable (mitigated by code validation on every call)
- Cannot use `internalQuery` directly from public queries (requires refactoring `findSimilarPlayers`)

## References

- Convex docs on public vs internal functions
- Existing HTTP handler: `packages/backend/convex/http.ts`
- Phase 2 PRD: US-VN-007, US-VN-010
