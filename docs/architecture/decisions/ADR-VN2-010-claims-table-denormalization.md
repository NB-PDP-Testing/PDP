# ADR-VN2-010: Claims Table Denormalization Strategy

**Date:** 2026-02-06
**Status:** Accepted
**Context:** Phase 4, Story US-VN-015

## Context and Problem Statement

The `voiceNoteClaims` table stores atomic claims extracted from voice note transcripts. Each claim belongs to an artifact, which in turn belongs to a coach within an organization. The claims viewer and future Phase 5-6 workflows need to query claims by organization, coach, topic, and status. Without denormalization, every such query would require joining back through `voiceNoteArtifacts` to resolve `organizationId` and `coachUserId`.

## Decision Drivers

- Convex does not support cross-table joins natively; all filtering must use indexes on the queried table
- The claims viewer (US-VN-016) queries claims by org + coach, and future phases query by org + status
- Performance: avoiding N+1 lookups back to artifacts for every claim query
- Storage cost of duplicating two string fields per claim is negligible

## Considered Options

### Option 1: Denormalize organizationId + coachUserId onto claims
**Pros:** Direct indexed queries without joins. Simple query patterns. Aligns with existing patterns (voiceNotes table already stores orgId + coachId directly).
**Cons:** Data duplication. If artifact's org changes (unlikely), claims would be stale.

### Option 2: Always join back to artifact
**Pros:** Single source of truth. No duplication.
**Cons:** Every claim query requires fetching the artifact first. For list views (claims viewer), this creates N+1 patterns. Cannot create composite indexes spanning tables.

### Option 3: Denormalize only organizationId (not coachUserId)
**Pros:** Partial denormalization reduces duplication.
**Cons:** Still requires artifact lookup for coach-scoped queries. The `by_org_and_coach` index pattern (needed for claims viewer) would be impossible.

## Decision Outcome

**Chosen Option:** Option 1 -- Denormalize both `organizationId` and `coachUserId` onto every claim record.

**Rationale:** This is the standard Convex pattern for avoiding cross-table joins. The voiceNotes table already follows this pattern (stores orgId and coachId directly). The two string fields add minimal storage overhead compared to the performance benefit of direct indexed queries. Artifact org/coach never change after creation, so staleness is not a concern.

## Implementation Notes

- `organizationId` is `v.string()` (Better Auth ID, not Convex doc ID)
- `coachUserId` is `v.string()` (Better Auth ID, not Convex doc ID)
- Both are populated at claim creation time from the artifact's `orgContextCandidates[0].organizationId` and `senderUserId`
- Seven indexes are defined, including `by_org_and_coach` and `by_org_and_status` which both require these denormalized fields

## Consequences

**Positive:** Direct indexed queries for all planned access patterns. No N+1 joins in the claims viewer. Future phases (5, 6) can query claims efficiently by org scope.

**Negative:** Two extra string fields per claim. Approximately 50-100 bytes per claim, negligible at expected volume (hundreds to low thousands of claims per org per month).

**Risks:** If the artifact's organization context determination logic changes in the future, existing claims would retain the original org. This is acceptable since claims are historical records tied to the artifact's processing context.
