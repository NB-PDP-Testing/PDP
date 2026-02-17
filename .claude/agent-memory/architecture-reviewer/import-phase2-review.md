# Import Phase 2 "Enhanced UX & Data Quality" Review (2026-02-13)

## PRD Location
`scripts/ralph/prds/Importing Members/phase-2-enhanced-ux.md`

## Review Result: NEEDS ATTENTION -- 4 critical, 8 warnings, 6 suggestions

## Critical Issues

### C1: Missing importSessionId on 4 tables + missing indexes
- `guardianIdentities`, `guardianPlayerLinks`, `sportPassports`, `skillAssessments` receive import writes but don't track `importSessionId`
- `playerIdentities` and `orgPlayerEnrollments` HAVE `importSessionId` but NO indexes on it
- Undo cannot fully roll back without these
- Schema lines: playerIdentities:279, orgPlayerEnrollments:440

### C2: Simulation approach is infeasible
- PRD says "replace ctx.db.insert with preview ID generation" -- won't work in Convex
- Intra-batch dedup breaks (second sibling's guardian won't be found)
- Solution: query-only simulator in lib/import/simulator.ts
- Must be a `query` function (inherently read-only in Convex)

### C3: getTemplateUsageStats N+1 pattern
- importSessions.ts lines 290-313: Promise.all(templateIds.map(query))
- Fix: fetch all sessions for org once, group by templateId

### C4: listTemplates .filter() violations
- importTemplates.ts lines 262, 273, 280: `.filter((t) => t.isActive)`
- Need composite indexes: by_scope_and_isActive, by_organizationId_and_isActive, by_scope_sport_and_isActive

## Key Import System Facts
- Batch mutation: `models/playerImport.ts` line 530 (`batchImportPlayersWithIdentity`)
- 5-phase import: identities -> guardian matching -> explicit parents -> enrollments -> benchmarks
- Import session statuses: uploading|mapping|selecting|reviewing|importing|completed|failed|cancelled
- VALID_TRANSITIONS: `completed: []` -- must add "undone" as valid transition
- Wizard: 7 steps (Upload, Map, Select, Benchmark, Review, Import, Complete)
- Frontend: import page at `/orgs/[orgId]/import/`, wizard at `/orgs/[orgId]/import/wizard/`

## Existing lib/import/ Files
- parser.ts: CSV parsing, delimiter detection, header detection
- mapper.ts: 5-strategy field mapping (exact, alias, historical, fuzzy, content)
- validator.ts: Row validation, auto-fix suggestions, batch validation
- sportConfig.ts: Sport/age group config lookups
- benchmarkApplicator.ts: 5-strategy benchmark application

## Required Schema Changes Before Phase 2
1. Add by_importSessionId index on playerIdentities
2. Add by_importSessionId index on orgPlayerEnrollments
3. Add importSessionId field + index to guardianIdentities, guardianPlayerLinks, sportPassports
4. Pass importSessionId through applyBenchmarksToPassport to skillAssessments
5. Add "undone" to importSessions status union
6. Add undoneAt, undoneBy, undoReason fields to importSessions
7. Add composite indexes for isActive on importTemplates

## Sub-Phase Order
- 2.0: Prerequisites (schema, indexes, fix N+1 and .filter())
- 2.1: Data Quality Scoring (lib/import/dataQuality.ts + frontend)
- 2.2: Simulation/Dry Run (lib/import/simulator.ts as query + frontend)
- 2.3: Save & Resume (importSessionDrafts table + cron cleanup) -- parallel with 2.1
- 2.4: Granular Undo (highest risk, needs soft/hard delete decision)
- 2.5: Enhanced Progress & UX (polish, depends on 2.2)

## Warnings
- W1: PRD loadDraft should be query not mutation — ✅ NOTED: loadDraft does not exist yet (sub-phase 2.3). When implemented, MUST be a query function, not mutation.
- W5: listSessionsByOrg fetches all sessions, needs limit param — ✅ FIXED: Added limit param (default 50), frontend passes limit: 5
- W6: PRD wants unit tests but CLAUDE.md says E2E only — ✅ NOTED: Policy decision, E2E only per CLAUDE.md
- W7: Soft delete pattern doesn't exist in codebase -- significant cross-cutting change — ✅ ANALYZED: See "W7 Undo Strategy" section below
- W8: import-wizard.tsx line 244 uses session?.user?.id not ._id — ✅ FALSE POSITIVE: session.user.id is correct on client side (Better Auth useSession returns .id, not ._id)

## W7 Undo Strategy Analysis

The codebase uses hard deletes exclusively (20+ locations across models). No soft delete pattern exists.

### Option A: Hard Delete (RECOMMENDED)
- Query all records by `importSessionId` across 6 tables, delete them
- Simple, no schema changes, no query changes
- Irreversible once executed, but that matches user intent ("undo this import")
- Session marked as "undone" with undoneAt/undoneBy/undoReason (already in schema)
- Consistent with existing codebase patterns

### Option B: Soft Delete
- Add `deletedAt`/`deletedBy` to 6 import tables
- Every query on those tables must filter `deletedAt === undefined`
- Allows "re-do" of an undone import, but that's unlikely to be needed
- Adds complexity to ~30+ existing queries across the codebase
- Introduces a new cross-cutting pattern inconsistent with rest of app

### Recommendation
Use **Hard Delete** (Option A). The `importSessionId` indexes are already in place on all 6 tables. The undo mutation would:
1. Validate session status is "completed"
2. Query each table by `importSessionId`
3. Delete all matching records
4. Patch session status to "undone" with audit fields
5. Return counts of deleted records per table

This is safe because import-created records are clearly identified and the session audit trail preserves the history.
