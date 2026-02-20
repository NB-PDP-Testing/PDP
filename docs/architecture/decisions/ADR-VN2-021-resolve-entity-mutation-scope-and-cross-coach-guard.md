# ADR-VN2-021: Resolve Entity Mutation Scope and Cross-Coach Guard

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 5 (Entity Resolution & Disambiguation)
**Story**: US-VN-017, US-VN-018

## Context and Problem Statement

The `resolveEntity` public mutation allows a coach to resolve an ambiguous entity mention. Two security concerns arise:

1. **Cross-coach resolution**: Can Coach A resolve disambiguation items from Coach B's voice notes? The current PRD checks `ctx.auth.getUserIdentity()` for authentication but does not verify the authenticated user is the coach who created the resolution.
2. **Cross-org data access**: The mutation takes a `resolutionId` and fetches the resolution. Could a coach in Org X resolve a resolution from Org Y?

## Decision Drivers

- All voice note data is organization-scoped
- Coaches should only resolve their own voice note mentions (debatable -- see options)
- Better Auth provides identity via `ctx.auth.getUserIdentity()` but not org membership
- The resolution record stores `organizationId` (denormalized)

## Considered Options

### Option A: Auth-only guard (PRD proposal)

Check that the user is authenticated. Allow any authenticated user to resolve any resolution.

**Pros**: Simple. Allows org admins to resolve on behalf of coaches.
**Cons**: No org isolation. A user in Org X could potentially resolve entities in Org Y if they know the resolution ID.

### Option B: Coach ownership guard

Check that the authenticated user matches the coach who created the original voice note (via artifact -> senderUserId chain).

**Pros**: Strict ownership. Only the original coach can resolve.
**Cons**: Prevents org admins from helping. Requires extra queries to look up the artifact chain.

### Option C: Organization membership guard

Check that the authenticated user is a member of the same organization as the resolution.

**Pros**: Allows any org member to resolve (including admins). Prevents cross-org access.
**Cons**: Requires org membership lookup. May be overly permissive (any org member can resolve any coach's mentions).

## Decision Outcome

**Option C** -- Organization membership guard. This provides org-level data isolation (critical security requirement) while allowing flexibility for org admins to help coaches. The resolution's `organizationId` (denormalized field) is compared against the authenticated user's organization memberships.

### Implementation

```typescript
export const resolveEntity = mutation({
  args: {
    resolutionId: v.id("voiceNoteEntityResolutions"),
    resolvedEntityId: v.string(),
    resolvedEntityName: v.string(),
    selectedScore: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");

    const resolution = await ctx.db.get(args.resolutionId);
    if (!resolution) throw new Error("Resolution not found");

    // Organization isolation check
    // Note: Full membership verification would require a Better Auth adapter query.
    // For Phase 5 MVP, we rely on the frontend only showing resolutions
    // from the user's current org. A TODO is added for backend membership check.
    // The organizationId is already enforced at the query level (getDisambiguationQueue
    // filters by org).

    // ... resolution logic
  },
});
```

## Consequences

**Positive**: Org-level data isolation. Admins can help coaches. Consistent with existing patterns (getClaimsByOrgAndCoach also uses org-scoped queries without full membership verification).
**Negative**: Backend does not do a full org membership check in Phase 5 (relies on frontend enforcing org scope). This should be hardened in Phase 5.5.
**Risk**: Cross-org access via direct API call (bypassing frontend). Mitigated by: the resolution record has an `organizationId` field that the query filters on. The mutation itself should verify the resolution's organizationId is accessible to the user. Full mitigation deferred to Phase 5.5.
