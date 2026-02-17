# Architecture Reviewer Memory

## Project Structure
- Monorepo: `apps/web/` (Next.js 14) + `packages/backend/` (Convex)
- Auth: Better Auth with org plugin, user fields: `_id`, `name`, `email`
- Schema: `packages/backend/convex/schema.ts` (~4700+ lines, very large)
- Voice notes pipeline: `actions/whatsapp.ts`, `models/voiceNotes.ts`, `actions/voiceNotes.ts`

## Known Anti-Patterns (Cumulative Tech Debt)
- `voiceNotes.ts` line 470: `.filter()` after `.withIndex()` (violates CLAUDE.md)
- `voiceNotes.ts` lines 345-354: `coach.firstName`/`coach.lastName` (should use `coach.name`)
- `coachContext.ts` firstName/lastName pattern (Phase 4 port from v1)
- whatsapp.ts calls public mutations from internalAction (Phase 3, still open)
- resolveEntity backend org membership check deferred to Phase 5.5
- batchUpdateResolutionsByRawText appears unused (dead code)
- `coachTasks.playerIdentityId` uses `v.id("orgPlayerEnrollments")` (should be playerIdentities?)
- `listExpiredDrafts` in importSessionDrafts.ts is dead code (defined but never called)

## Schema Notes
- Better Auth IDs stored as `v.string()` not `v.id()`
- `voiceNotes.insights` is embedded array; `voiceNoteInsights` is SEPARATE table (Phase 7)
- `findSimilarPlayers` in `orgPlayerEnrollments.ts` is `internalQuery` (blocking for public access)

## Topic Files (Detailed Notes)
- `import-phases.md` -- Import framework architecture, Phase 2.3 review, cron scheduling
- `phase2-review.md` through `phase6-review.md` -- Voice Gateways v2 reviews

## ADRs Written
- `ADR-VN2-001` through `ADR-VN2-047`: Voice Gateways v2 (Phases 2-7)
- `ADR-phase-2.3-draft-storage-strategy.md`: Import wizard save/resume
- `ADR-phase-2.4-undo-hard-delete-strategy.md`: Hard delete vs soft delete for undo

## Phase Reviews Summary

### Voice Gateways v2 (Phases 2-7, 2026-02-06 to 2026-02-08)
- Phase 3: featureFlags in lib/, dual-path processing, artifact IDs
- Phase 4: 0 critical, claims table with 15 topics/7 indexes/7 statuses
- Phase 5: 1 critical (org membership deferred), entity resolution + aliases
- Phase 6: 4 critical PRD discrepancies, insightDrafts table design
- Phase 7A-7D: 3 critical (autoAppliedInsights schema, wrong signatures in context doc)
- Phase 7B: 0 critical, DraftsTab receives data as props (novel pattern)
- Phase 7C: 3 critical (parentSummaries check, appliedBy/appliedDate, schema change order)

### Import Framework (Phase 2.3, 2026-02-13)
- POST-IMPLEMENTATION review: 0 critical, 3 warnings, 4 suggestions
- See `import-phases.md` for details
- Key: Raw CSV not stored, header matching on resume, cron at 4 AM UTC

### Import Undo (Phase 2.4, 2026-02-13) -- PRE-IMPLEMENTATION
- **NO-GO**: 4 critical blockers (C1-C4), 3 warnings
- C1: 4 tables missing `importSessionId` field (guardianIdentities, guardianPlayerLinks, sportPassports, skillAssessments)
- C2: ALL 6 tables missing `by_importSessionId` index
- C3: `batchImportPlayersWithIdentity` only sets importSessionId on 2/6 tables
- C4: importSessions missing "undone" status + undo fields
- Critical risk: shared identity records across imports (platform-level tables)
- Convex limits: 16K writes/mutation, 32K scans/mutation -- safe for <1000 player imports
- ADR: `ADR-phase-2.4-undo-hard-delete-strategy.md`
- importSessions.ts has ZERO auth checks on any mutation (W1)

## Cron Time Slots
See `import-phases.md` for complete cron schedule (updated 2026-02-13).

## Key Patterns Confirmed
- `ctx.runQuery(internal....)` in public mutation is VALID (precedent: members.ts:268)
- Feature flag cascade: env -> platform -> org -> user -> false (4-level)
- authClient.useSession().data.user.id = Better Auth client ID (string)
- authComponent.getAuthUser(ctx)._id = Convex user ID (string)
- Both are v.string() in schema, they refer to the SAME user but from different contexts
