# ADR-VN2-013: Claims Table Index Strategy

**Date:** 2026-02-06
**Status:** Accepted
**Context:** Phase 4, Story US-VN-015

## Context and Problem Statement

The `voiceNoteClaims` table will be queried from multiple contexts: the claims extraction action (lookup by artifact), the claims viewer (browse by org/coach), future entity resolution (by player identity), and status management (by artifact + status). The table needs indexes that cover all planned query patterns without creating unnecessary indexes that slow down writes.

## Decision Drivers

- Convex mandates `.withIndex()` for all queries (`.filter()` is prohibited)
- Each index adds write overhead (Convex maintains B-tree for each)
- Query patterns are well-defined across Phase 4-6 stories
- Composite indexes must follow Convex's prefix matching rules

## Considered Options

### Option 1: Seven indexes (as specified in PRD)
Indexes: `by_artifactId`, `by_artifactId_and_status`, `by_claimId`, `by_topic`, `by_org_and_coach`, `by_org_and_status`, `by_resolvedPlayerIdentityId`

**Pros:** Covers all known query patterns. Composite indexes enable efficient filtering. `by_topic` enables future analytics queries.
**Cons:** Seven indexes on a single table is moderate overhead. `by_topic` may have limited utility without additional fields.

### Option 2: Five indexes (drop by_topic and by_org_and_status)
**Pros:** Fewer indexes, faster writes.
**Cons:** `by_org_and_status` is needed for Phase 5 (find all "needs_disambiguation" claims in an org). `by_topic` is useful for analytics dashboards.

### Option 3: Nine indexes (add by_org_and_topic and by_createdAt)
**Pros:** More query flexibility.
**Cons:** Diminishing returns. `by_org_and_topic` can be approximated by `by_org_and_coach` + client-side filter for small result sets.

## Decision Outcome

**Chosen Option:** Option 1 -- Seven indexes as specified.

**Rationale:** All seven indexes map to concrete query patterns:

| Index | Query Pattern | Used By |
|-------|--------------|---------|
| `by_artifactId` | Get all claims for an artifact | `getClaimsByArtifact`, claims extraction |
| `by_artifactId_and_status` | Get claims by artifact + status | `getClaimsByArtifactAndStatus`, Phase 5 |
| `by_claimId` | Lookup single claim by UUID | `getClaimByClaimId`, `updateClaimStatus` |
| `by_topic` | Filter claims by category | Future analytics, topic dashboards |
| `by_org_and_coach` | Coach's claims in an org | Claims viewer, coach history |
| `by_org_and_status` | Org-wide status filtering | Phase 5 disambiguation queue |
| `by_resolvedPlayerIdentityId` | Claims about a specific player | Player passport, Phase 6 drafts |

No index is speculative -- each serves at least one concrete use case in Phase 4-6.

## Implementation Notes

- `by_claimId` uses the string UUID, not the Convex `_id`. This is intentional because `claimId` is the external-facing identifier used in API responses and logs.
- `by_org_and_coach` uses `["organizationId", "coachUserId"]` -- both are denormalized fields (see ADR-VN2-010)
- `by_resolvedPlayerIdentityId` can have `undefined` values (unresolved claims). Convex indexes handle optional fields correctly -- unresolved claims simply won't appear in queries using this index.

## Consequences

**Positive:** Complete index coverage for all Phase 4-6 query patterns. No need to add indexes later (which would require backfill on production data).

**Negative:** Seven indexes create moderate write overhead. At expected volume (10-50 claims per voice note, ~100 voice notes/day), this is well within Convex's capacity.

**Risks:** If Phase 5-6 requirements change, some indexes may need adjustment. Adding a new index is straightforward in Convex (automatic backfill), so this risk is low.
