# ADR-VN2-020: Disambiguation UI Query Strategy and Route Design

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 5 (Entity Resolution & Disambiguation)
**Story**: US-VN-018

## Context and Problem Statement

The disambiguation UI needs to show a coach their unresolved entity mentions and let them select the correct candidate. Two design decisions are needed:

1. **Route structure**: Should the page be scoped per-artifact (`/disambiguation/[artifactId]`) or show all unresolved mentions across artifacts?
2. **Query strategy**: How to fetch disambiguation data without N+1 queries?

## Decision Drivers

- Coaches process voice notes one at a time -- an artifact-scoped view is more natural
- The voice notes list page should show a badge linking to disambiguation when needed
- Must not use `useQuery` in list item components (CLAUDE.md performance rule)
- The `getDisambiguationQueue` query needs org-level data for the voice notes list badge count, but artifact-level data for the disambiguation page

## Considered Options

### Option A: Artifact-scoped route with two queries

Route: `/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]`
Queries: One for the page (resolutions by artifact), one for the badge (count by org).

**Pros**: Focused view. Natural flow from voice note -> disambiguation. Artifact-scoped query returns small result set.
**Cons**: Two separate queries needed (page + badge count).

### Option B: Org-scoped route showing all unresolved

Route: `/orgs/[orgId]/coach/voice-notes/disambiguation`
Query: One query returning all needs_disambiguation resolutions for the org.

**Pros**: Single page for all disambiguation. Coach sees everything at once.
**Cons**: Could return large result set across many artifacts. Harder to group by artifact context. Pagination needed.

## Decision Outcome

**Option A** -- Artifact-scoped route. This matches the PRD and the natural voice note workflow. Two queries are acceptable because they serve different purposes (page data vs. badge count).

### Query Design

**For the disambiguation page** (`/disambiguation/[artifactId]`):
```typescript
// Single query at page level -- NO useQuery in child components
const resolutions = useQuery(
  api.models.voiceNoteEntityResolutions.getResolutionsByArtifactAndStatus,
  { artifactId, status: "needs_disambiguation" }
);
```

Wait -- `getResolutionsByArtifactAndStatus` is defined as an internalQuery in the PRD. For the frontend to call it, we need a PUBLIC query variant. We should create:
- `getDisambiguationForArtifact` (PUBLIC query with auth guard)

**For the voice notes list badge**:
```typescript
// At the voice notes list page level, fetch count
const disambiguationCount = useQuery(
  api.models.voiceNoteEntityResolutions.getDisambiguationQueue,
  orgId ? { organizationId: orgId } : "skip"
);
```

### Data Flow

```
Voice Notes List                     Disambiguation Page
+----------------------------+       +----------------------------+
| VN1 - 3 players to ID [>] | ----> | Resolve: "Tommy" (3 claims)|
| VN2 - completed            |       |   O Thomas Murphy (87%)    |
| VN3 - processing            |       |   O Tommy O'Brien (82%)    |
+----------------------------+       |   [Confirm]                 |
                                     +----------------------------+
```

## Implementation Notes

The `getDisambiguationQueue` query should:
1. Accept `organizationId` (for the badge count across all artifacts)
2. Filter by status = "needs_disambiguation"
3. Use the `by_org_and_status` composite index
4. Return limited results (default 50, max 200)
5. Include auth guard

The `getDisambiguationForArtifact` query should:
1. Accept `artifactId` (for the page)
2. Use `by_artifactId_and_status` index
3. Include auth guard
4. Return all needs_disambiguation resolutions for that artifact

## Consequences

**Positive**: Focused UI. Small query result sets. Clear navigation path. Matches CLAUDE.md query lifting pattern.
**Negative**: Coach must navigate artifact-by-artifact. Acceptable for MVP -- an org-wide disambiguation dashboard can be added in Phase 5.5 (Enhancement E10).
