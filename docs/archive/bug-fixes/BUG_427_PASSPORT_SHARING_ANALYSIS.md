# Bug #427: Passport Sharing Discovery Failure - Investigation & Analysis

## Problem Summary

Players with passport sharing enabled are not appearing in search results for coaches, even when:
1. Guardian has enabled `allowGlobalPassportDiscovery = true`
2. Guardian-player links exist in `guardianPlayerLinks` table
3. Player has active enrollment

## Investigation Findings

### Root Cause

The `searchDiscoverablePlayers` query in `packages/backend/convex/models/playerIdentities.ts` (lines 424-432) contains logic that **requires players to have enrollments at multiple organizations** to be discoverable:

```typescript
// Filter out enrollments from requesting org
const otherOrgEnrollments = enrollments.filter(
  (e) => e.organizationId !== args.requestingOrgId
);

// Skip if no enrollments in other orgs
if (otherOrgEnrollments.length === 0) {
  return null;  // Player excluded from results!
}
```

### Data Evidence

Queried the database for players linked to the guardian with `allowGlobalPassportDiscovery: true`:

| Player | Enrollments | Organizations |
|--------|-------------|---------------|
| Aoife Kelly_Demo | 1 | jh7dq789ettp8gns6esw188q8h7zxq5r only |
| Cian Murphy_Demo | 1 | jh7dq789ettp8gns6esw188q8h7zxq5r only |
| Noah O'Brien | 1 | jh7fc03thdh2hrzjvp0a6fh2tn7z1c36 only |
| Liam Murphy | 1 | jh7fc03thdh2hrzjvp0a6fh2tn7z1c36 only |

**All players only have enrollment at ONE organization**, which means:
- Coach from Org A searching → filters out Org A enrollments → 0 remaining → player excluded
- Coach from Org B searching → filters out Org B enrollments → 0 remaining (player not at Org B) → player excluded

### The Chicken-and-Egg Problem

The current design assumes players are already enrolled at multiple organizations before being discoverable. This creates a fundamental problem:

1. Parent enables sharing for child at Club A
2. Coach at Club B wants to recruit/discover the child
3. Coach searches → Player NOT found (because child has no enrollment at Club B yet)
4. Coach can't discover player to even initiate contact
5. Player can never be discovered by new organizations

## Proposed Fixes

### Option 1: Remove the "other org" filter entirely (Recommended)

**Change:** Allow players to be discoverable by ANY organization when sharing is enabled.

**Logic:**
- If guardian enabled `allowGlobalPassportDiscovery`, player should be findable by coaches at ANY org
- The requesting coach's own org players can be filtered out in the UI if desired
- This enables the intended use case: talent discovery across organizations

**Code change:**
```typescript
// Instead of filtering to OTHER orgs only:
// const otherOrgEnrollments = enrollments.filter(
//   (e) => e.organizationId !== args.requestingOrgId
// );

// Allow all enrollments (player is discoverable if sharing enabled)
const allEnrollments = enrollments;

// Skip only if player has NO enrollments at all
if (allEnrollments.length === 0) {
  return null;
}
```

**Pros:**
- Fixes the discovery problem completely
- Enables cross-org talent scouting as intended
- Simple implementation

**Cons:**
- Coaches might see their own org's players in search (can filter in UI)

### Option 2: Filter out requesting org's players in UI only

**Change:** Backend returns all discoverable players; frontend filters out same-org players.

**Logic:**
- Backend: Return any player with sharing enabled
- Frontend: Optionally hide players already at the coach's organization

**Pros:**
- More flexible - UI can choose to show/hide same-org players
- Coach could see "Players at my club who are also at other clubs"

**Cons:**
- More data transferred
- Requires UI changes

### Option 3: Add "discovery mode" parameter

**Change:** Add parameter to control discovery scope.

```typescript
args: {
  searchTerm: v.string(),
  requestingOrgId: v.string(),
  discoveryMode: v.optional(v.union(
    v.literal("cross_org_only"),  // Current behavior
    v.literal("all_shared")        // Any player with sharing enabled
  )),
  limit: v.optional(v.number()),
}
```

**Pros:**
- Backward compatible
- Flexible for different use cases

**Cons:**
- More complexity

## Recommendation

**Implement Option 1** - Remove the "other org" filter for discovery.

The purpose of passport sharing is to enable cross-organization talent discovery. A player enrolled only at Club A should absolutely be discoverable by coaches at Club B - that's the entire point of the feature.

The current logic prevents the primary use case from working.

## Files to Modify

1. `packages/backend/convex/models/playerIdentities.ts`
   - Function: `searchDiscoverablePlayers` (line 377-495)
   - Remove or modify the `otherOrgEnrollments` filter logic

2. Optional UI enhancement:
   - `apps/web/src/app/orgs/[orgId]/coach/shared-passports/components/browse-players-tab.tsx`
   - Add toggle to show/hide players from own organization

## Test Plan

1. Enable sharing for a player enrolled at only ONE organization
2. Log in as coach at a DIFFERENT organization
3. Search for the player by name
4. Verify player appears in search results
5. Verify contact/request access buttons work

---

*Investigation by Claude Code - Feb 2, 2026*
