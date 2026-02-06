# Architecture Reviewer Memory

## Project Structure
- Monorepo: `apps/web/` (Next.js 14) + `packages/backend/` (Convex)
- Auth: Better Auth with org plugin, user fields: `_id`, `name`, `email`
- Schema: `packages/backend/convex/schema.ts` (~3800+ lines, very large)
- Voice notes pipeline: `actions/whatsapp.ts`, `models/voiceNotes.ts`, `actions/voiceNotes.ts`

## Key Findings (2026-02-06)

### BLOCKING Issues
- `findSimilarPlayers` in `orgPlayerEnrollments.ts` is `internalQuery` -- cannot be called from public queries. Must extract to shared lib for Phase 2 microsite. See `ADR-VN2-004`.

### Known Anti-Patterns in Codebase
- `voiceNotes.ts` line 470: `.filter()` after `.withIndex()` (violates CLAUDE.md)
- `voiceNotes.ts` lines 345-354: Uses `coach.firstName`/`coach.lastName` (wrong, should use `coach.name`)
- Multiple `biome-ignore lint/suspicious/noExplicitAny` suppressions in whatsapp.ts and voiceNotes.ts

### Schema Notes
- `voiceNotes.insights` is an embedded array (not a separate table)
- `voiceNoteInsights` is a SEPARATE dedicated table for Phase 7 auto-apply (different from embedded array)
- Better Auth IDs stored as `v.string()` not `v.id()`
- `coachTasks.playerIdentityId` incorrectly uses `v.id("orgPlayerEnrollments")` (should be playerIdentities?)

### Cron Scheduling
- 2:00 AM UTC: review statuses, adjust-insight-thresholds
- 2:30 AM UTC: (available for expire-review-links)
- 3:00 AM UTC: archive-old-invitations (TAKEN)
- 3:15 AM UTC: (available for cleanup-expired-review-links)

### ADRs Written
- `docs/architecture/decisions/ADR-VN2-001` through `ADR-VN2-006` for Phase 2 Voice Gateways v2
- See `phase2-review.md` for detailed notes

## Files Reference
- See `phase2-review.md` for detailed Phase 2 architectural review notes
