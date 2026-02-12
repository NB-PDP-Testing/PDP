# ADR-VN2-045: v2MigrationStatus Table Scan Strategy

**Date:** 2026-02-08
**Status:** Accepted
**Context:** Phase 7D, Story US-VN-029

## Context and Problem Statement

The `v2MigrationStatus` diagnostic script needs to count records across 6 v2 tables for a given organization. Several tables lack org-scoped indexes:

| Table | Has org index? | Org field |
|-------|---------------|-----------|
| voiceNotes | YES (`by_orgId`) | `orgId` |
| voiceNoteArtifacts | NO | `orgContextCandidates[].organizationId` (array) |
| voiceNoteTranscripts | NO (only `by_artifactId`) | None (linked via artifactId) |
| voiceNoteClaims | YES (`by_org_and_coach`) | `organizationId` |
| voiceNoteEntityResolutions | YES (`by_org_and_status`) | `organizationId` |
| insightDrafts | YES (`by_org_and_coach_and_status`) | `organizationId` |

The `voiceNoteArtifacts` table stores organizationId inside an array (`orgContextCandidates`) which cannot be indexed. The `voiceNoteTranscripts` table has no org field at all -- it links to an artifact.

## Decision Drivers

- This is a diagnostic script, not a production query path
- Accuracy is more important than speed for migration status
- Must not add unnecessary indexes (schema changes have deployment overhead)
- Should work for any org size (but 100-500 notes per org is typical)

## Considered Options

### Option 1: JavaScript array filter after collect (table scans)

**Approach:** For tables without org indexes, use `.collect()` then JavaScript `Array.prototype.filter()`. For tables WITH org indexes, use `.withIndex()`.

```typescript
// Tables WITH org index -- use index
const voiceNotes = await ctx.db.query("voiceNotes")
  .withIndex("by_orgId", q => q.eq("orgId", args.organizationId))
  .collect();

const claims = await ctx.db.query("voiceNoteClaims")
  .withIndex("by_org_and_coach", q => q.eq("organizationId", args.organizationId))
  .collect();

// Tables WITHOUT org index -- table scan + JS filter
const allArtifacts = await ctx.db.query("voiceNoteArtifacts").collect();
const orgArtifacts = allArtifacts.filter(a =>
  a.orgContextCandidates.some(c => c.organizationId === args.organizationId)
);

// Linked table -- filter by parent IDs
const orgArtifactIds = new Set(orgArtifacts.map(a => a._id));
const allTranscripts = await ctx.db.query("voiceNoteTranscripts").collect();
const orgTranscripts = allTranscripts.filter(t => orgArtifactIds.has(t.artifactId));
```

**Pros:**
- No schema changes needed
- Correct results for any data shape
- JavaScript `Array.filter()` is allowed per CLAUDE.md (only Convex query `.filter()` is banned)

**Cons:**
- Full table scans for artifacts and transcripts
- Could be slow if tables grow to 10k+ records
- Memory pressure for large datasets

**Complexity:** Low
**Performance:** O(N) where N is total table size. Acceptable for diagnostic use.

### Option 2: Add org-scoped indexes

**Approach:** Add `by_organizationId` indexes to voiceNoteArtifacts and voiceNoteTranscripts.

For voiceNoteArtifacts: Cannot index into array fields. Would need to add a top-level `organizationId` field (denormalized from `orgContextCandidates[0].organizationId`). This is a schema migration.

For voiceNoteTranscripts: Would need to add `organizationId` field (copied from artifact). Another schema migration.

**Pros:**
- Fast indexed queries
- Works at any scale

**Cons:**
- Schema changes required (deployment overhead)
- Data migration needed for existing records
- Denormalization introduces consistency risk
- Overkill for a diagnostic script

**Complexity:** High
**Performance:** O(1) for indexed queries

### Option 3: Indirect query via indexed tables

**Approach:** Use org-indexed tables to find related IDs, then batch-fetch from unindexed tables.

```typescript
// Get org voice notes (indexed)
const voiceNotes = await ctx.db.query("voiceNotes")
  .withIndex("by_orgId", q => q.eq("orgId", args.organizationId))
  .collect();

// Get artifacts for org's voice notes (index: by_voiceNoteId)
const voiceNoteIds = voiceNotes.map(vn => vn._id);
// Batch fetch artifacts by voiceNoteId
const orgArtifacts = [];
for (const vnId of voiceNoteIds) {
  const artifacts = await ctx.db.query("voiceNoteArtifacts")
    .withIndex("by_voiceNoteId", q => q.eq("voiceNoteId", vnId))
    .collect();
  orgArtifacts.push(...artifacts);
}
```

**Pros:**
- Uses indexes throughout
- No schema changes

**Cons:**
- N+1 query pattern for artifacts (one query per voice note)
- Even worse for transcripts (one query per artifact)
- Could hit Convex query limits for large orgs

**Complexity:** Medium
**Performance:** O(N) queries where N is voice note count -- worse than table scan for small tables

## Decision Outcome

**Chosen Option:** Option 1 -- JavaScript array filter after collect

**Rationale:**
For a diagnostic script that runs infrequently (manually by operators), table scan performance is acceptable. The typical org has 100-500 voice notes and a proportional number of artifacts/transcripts. A full table scan of a few thousand records is fast in Convex. The alternative of adding indexes would require schema migrations for a script that runs perhaps once per org rollout.

The PRD explicitly allows this pattern and notes the distinction between JavaScript `Array.filter()` (allowed) and Convex query `.filter()` (banned).

## Implementation Notes

### Query strategy per table

| Table | Strategy | Index Used |
|-------|----------|------------|
| voiceNotes | `.withIndex("by_orgId")` | `by_orgId` |
| voiceNoteArtifacts | `.collect()` + JS filter | None (table scan) |
| voiceNoteTranscripts | `.collect()` + JS filter on artifactId Set | None |
| voiceNoteClaims | `.withIndex("by_org_and_status")` | `by_org_and_status` |
| voiceNoteEntityResolutions | `.withIndex("by_org_and_status")` | `by_org_and_status` |
| insightDrafts | `.collect()` + JS filter (or partial index) | See note below |

### insightDrafts query optimization

insightDrafts has `by_org_and_coach_and_status` which requires both `organizationId` AND `coachUserId`. For an org-level count across all coaches, we cannot use this index effectively. However, `by_org_coach_status_createdAt` has `organizationId` as its first field, so a partial match works:

```typescript
// Use partial index match on org_coach_status_createdAt
// Convex allows querying on prefix fields of a composite index
const orgDrafts = await ctx.db.query("insightDrafts")
  .withIndex("by_org_coach_status_createdAt", q =>
    q.eq("organizationId", args.organizationId)
  )
  .collect();
```

This is efficient because `organizationId` is the first field in the composite index.

### Feature flag check

Do NOT use `shouldUseV2Pipeline` (requires userId). Instead, query the featureFlags table directly:

```typescript
const v2Flag = await ctx.db.query("featureFlags")
  .withIndex("by_featureKey_scope_org", q =>
    q.eq("featureKey", "voice_notes_v2")
     .eq("scope", "organization")
     .eq("organizationId", args.organizationId)
  )
  .first();
```

### Performance budget

Estimated query times for a typical org (200 voice notes, 150 artifacts, 100 transcripts, 300 claims):
- Indexed queries: ~10ms each
- Table scans (artifacts ~500 total, transcripts ~400 total): ~50ms each
- Total: < 200ms -- well within Convex query limits

### When to reconsider

If any v2 table exceeds 10,000 records across ALL orgs, consider adding indexes. Monitor via Convex dashboard.

## Consequences

**Positive:**
- No schema changes needed
- Correct counts for all tables
- Simple implementation

**Negative:**
- Table scans for 2-3 tables
- Will slow down as data grows (but this is a diagnostic tool, not production)

**Risks:**
- If voiceNoteArtifacts table grows very large (10k+), this script will be slow. Mitigation: add `by_senderUserId_and_createdAt` filtering or add org-scoped index at that point.

## References

- Phase 7D PRD: US-VN-029, Script 3 (v2MigrationStatus)
- CLAUDE.md: Performance & Query Optimization section (`.filter()` ban applies to Convex query builder, not JS Array)
