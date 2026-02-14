# ADR: Phase 2.4 Undo Hard-Delete Strategy

**Status:** Accepted
**Date:** 2026-02-13
**Context:** Import Undo -- Granular rollback of completed imports

## Decision

Import undo uses **hard delete** (permanent removal) of all records created by an import session. Deletion proceeds in reverse dependency order within a single atomic Convex mutation for imports under the safety threshold, with a chunked internal mutation approach for larger imports.

## Context

When an admin completes an import and realizes the data is wrong (wrong file, wrong sport, wrong age group), they need to cleanly reverse it. The platform tracks which records were created by each import via the `importSessionId` field on `playerIdentities` and `orgPlayerEnrollments`.

### Why Hard Delete Over Soft Delete

1. **Clean data model.** Soft-deleted records still appear in indexes, slow down queries, and require every query in the system to filter on `deletedAt`. The identity system (playerIdentities, guardianIdentities, guardianPlayerLinks) is queried from many places -- assessments, voice notes, parent portals, team management. Adding `deletedAt` filters everywhere would be error-prone and a performance regression.

2. **Import data is reconstructable.** The admin still has the original CSV. Re-importing is trivial. There is no user-generated content attached to newly imported records within the 24-hour undo window (the undo eligibility check verifies this).

3. **Platform-level identity tables are shared.** `playerIdentities` and `guardianIdentities` exist across organizations. A soft-delete in one org's import would create a phantom record visible to platform-level queries. Hard delete avoids this complexity entirely.

4. **24-hour window limits blast radius.** The time constraint ensures undo only applies when records are fresh and unlikely to have downstream dependencies.

### Alternatives Considered

**A: Soft delete with `deletedAt` timestamp**
- Pros: Recoverable. Audit trail preserved in-place.
- Cons: Every query touching 6+ tables needs `.filter(q => !q.deletedAt)`. Massive cross-cutting change. Performance regression. Phantom records in platform-level tables.
- **Rejected.**

**B: Export-then-delete (backup to file storage before deleting)**
- Pros: Full recovery possible. Clean deletion.
- Cons: Adds external storage dependency. Complex restore logic. Over-engineered for a 24-hour window feature.
- **Rejected.**

**C: Hard delete with audit log entry (CHOSEN)**
- Pros: Clean data model. No query changes needed. Audit trail via session status (`undone`) and metadata fields (`undoneAt`, `undoneBy`, `undoReason`).
- Cons: Non-reversible after execution. Mitigated by 24-hour window and dependent-data check.
- **Accepted.**

## Delete Ordering Strategy

Records must be deleted in reverse dependency order to avoid foreign key violations in application logic:

1. **skillAssessments** -- references `passportId` and `playerIdentityId`
2. **sportPassports** -- references `playerIdentityId` and `organizationId`
3. **orgPlayerEnrollments** -- references `playerIdentityId` and `organizationId`
4. **guardianPlayerLinks** -- references `guardianIdentityId` and `playerIdentityId`
5. **guardianIdentities** -- standalone, referenced by links
6. **playerIdentities** -- standalone, referenced by everything above

This order ensures no record is deleted while something still references it.

## Transaction Safety for Large Imports

Convex mutations have hard limits: **16,000 documents written** and **32,000 documents scanned** per transaction.

For a 200-player import with guardians and benchmarks, a single undo could involve:
- ~200 playerIdentities
- ~200 orgPlayerEnrollments
- ~100 guardianIdentities
- ~100 guardianPlayerLinks
- ~200 sportPassports
- ~3,000 skillAssessments (200 players x ~15 skills)
- **Total: ~3,800 deletes + ~3,800 reads = ~7,600 operations**

This is well within the 16,000 write limit for typical imports. However, for safety:

1. **The `checkUndoEligibility` query returns record counts per table.** The frontend can warn if counts are high.
2. **For imports exceeding 5,000 total records**, the mutation should be split into chunked internal mutations scheduled sequentially via `ctx.scheduler`, with the session marked as `undoing` during the process.
3. **The 24-hour window naturally limits import size** -- admins rarely do massive imports and immediately realize they are wrong.

## 24-Hour Window Rationale

- **Sufficient for "oops" corrections.** Admin imports wrong file, notices within hours.
- **Short enough to prevent dependent data accumulation.** Coaches are unlikely to have created manual assessments within 24 hours of an import.
- **Matches industry norms.** Google Workspace, Salesforce, and similar platforms use 24-48 hour undo windows for bulk operations.
- **Configurable via constant.** The `UNDO_WINDOW_MS` constant can be adjusted if needed without schema changes.

## Consequences

- All 6 target tables need `importSessionId` field and `by_importSessionId` index (see pre-conditions in implementation guidance).
- The `importSessions` status union needs a new `"undone"` literal.
- The `importSessions` table needs `undoneAt`, `undoneBy`, and `undoReason` fields.
- The `VALID_TRANSITIONS` map needs `completed: ["undone"]`.
- The `batchImportPlayersWithIdentity` mutation needs to set `importSessionId` on all 6 tables (currently only sets it on `playerIdentities` and `orgPlayerEnrollments`).
