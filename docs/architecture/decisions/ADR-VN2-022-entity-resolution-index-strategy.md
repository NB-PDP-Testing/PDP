# ADR-VN2-022: Entity Resolution Index Strategy

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 5 (Entity Resolution & Disambiguation)
**Story**: US-VN-017

## Context and Problem Statement

The `voiceNoteEntityResolutions` table needs indexes for efficient querying. The PRD proposes 5 indexes. We need to validate each is necessary and check for missing indexes that the actual query patterns will need.

## Analysis of Proposed Indexes

| Index | Fields | Used By | Verdict |
|-------|--------|---------|---------|
| `by_claimId` | `[claimId]` | `getResolutionsByClaim` (public query) | KEEP |
| `by_artifactId` | `[artifactId]` | Batch update in `resolveEntity` mutation (find same-name resolutions) | KEEP |
| `by_artifactId_and_status` | `[artifactId, status]` | `getDisambiguationForArtifact` (artifact-scoped disambiguation page) | KEEP |
| `by_status` | `[status]` | Not used by any identified query pattern | REMOVE - global status query without org scoping is dangerous (table scan on large tables) |
| `by_org_and_status` | `[organizationId, status]` | `getDisambiguationQueue` (org-scoped badge count) | KEEP |

### Missing Indexes

| Proposed Index | Fields | Needed By |
|----------------|--------|-----------|
| `by_artifactId_and_rawText` | `[artifactId, rawText]` | Batch same-name resolution in `resolveEntity` mutation -- currently uses `by_artifactId` and then JS filter on rawText. A composite index would be more efficient. |

## Decision Outcome

**4 indexes** (remove `by_status`, evaluate `by_artifactId_and_rawText`):

```typescript
.index("by_claimId", ["claimId"])
.index("by_artifactId", ["artifactId"])
.index("by_artifactId_and_status", ["artifactId", "status"])
.index("by_org_and_status", ["organizationId", "status"])
```

### Regarding `by_artifactId_and_rawText`

The `resolveEntity` mutation needs to find all resolutions in the same artifact with the same rawText. Currently it would use `by_artifactId` and then filter by rawText in JS. Given that:
- A single artifact typically has < 30 resolutions
- JS filtering on a small in-memory set is acceptable
- Adding more indexes increases write costs

**Decision**: Do NOT add `by_artifactId_and_rawText` for Phase 5. The `by_artifactId` index with JS filtering is sufficient for the expected data volume. Revisit if artifacts with 100+ resolutions become common.

### Regarding `by_status`

A bare `by_status` index without org scoping would scan all resolutions across all organizations. This is a performance anti-pattern (unbounded table scan) and has no identified query that needs it. Remove it.

## `coachPlayerAliases` Indexes

The PRD proposes 2 indexes:

| Index | Fields | Used By | Verdict |
|-------|--------|---------|---------|
| `by_coach_org_rawText` | `[coachUserId, organizationId, rawText]` | `lookupAlias` (exact match lookup) | KEEP |
| `by_coach_org` | `[coachUserId, organizationId]` | `getCoachAliases` (list all aliases for a coach in an org) | KEEP |

Both are correct and sufficient. The composite `by_coach_org_rawText` index supports exact lookups efficiently.

## Consequences

**Positive**: Efficient queries for all identified access patterns. No unnecessary indexes.
**Negative**: The `by_artifactId` + JS filter pattern for batch same-name resolution is O(n) on artifact resolutions, but n is small (< 30).
