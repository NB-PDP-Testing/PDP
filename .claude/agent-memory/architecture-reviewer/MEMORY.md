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
- `ADR-VN2-007`: Feature flag storage design (new featureFlags table)
- `ADR-VN2-008`: Artifact ID generation (crypto.randomUUID())
- `ADR-VN2-009`: Dual-path processing order (v1 first, then v2 artifact)
- See `phase2-review.md` and `phase3-review.md` for detailed notes

## Phase 3 Findings (2026-02-06)

### Integration Points Mapped
- `processAudioMessage` (whatsapp.ts:669): v2 branch goes AFTER createRecordedNote (line 728)
- `processTextMessage` (whatsapp.ts:761): v2 branch goes AFTER createTypedNote (line 810)
- `transcribeAudio` (actions/voiceNotes.ts:146): v2 transcript creation goes AFTER updateTranscription (line 216)
- v1 pipeline is untouched in all cases

### Tech Debt Flagged
- whatsapp.ts calls public mutations (`api.models.voiceNotes.createRecordedNote/createTypedNote`) from internalAction -- violates PRD rule. Do NOT fix in Phase 3 (regression risk). Phase 4+.
- `segments` field in voiceNoteTranscripts will be empty array in Phase 3 (Whisper basic doesn't return segments)
- `language` and `duration` in voiceNoteTranscripts will be defaults ("en", 0) until Whisper verbose_json is enabled

### Key Design Decisions
- featureFlags in `lib/` not `models/` (cross-cutting utility)
- All Phase 3 new functions are internalMutation/internalQuery (no public)
- artifactId generated in action context, passed to mutations
- voiceNoteTranscripts.artifactId is v.id("voiceNoteArtifacts") (Convex _id reference, not string artifactId)

## Phase 4 Post-Implementation Review (2026-02-06)

### Review Result: GOOD -- 0 critical, 5 warnings, 6 suggestions

### Schema
- voiceNoteClaims at schema.ts lines 4227-4316 (15 topics, 7 indexes, 7 statuses)
- All 7 indexes from ADR-VN2-013 implemented correctly

### Files Created/Modified
- NEW: `models/voiceNoteClaims.ts` (7 functions: 5 internal + 2 public)
- NEW: `lib/coachContext.ts` (gatherCoachContext internalQuery)
- NEW: `actions/claimsExtraction.ts` (extractClaims internalAction)
- NEW: `apps/web/src/app/platform/v2-claims/page.tsx` (claims viewer)
- MODIFIED: `actions/voiceNotes.ts` line 258-263 (scheduler hook)
- MODIFIED: `models/voiceNoteArtifacts.ts` (getArtifactById + getRecentArtifacts)

### Open Issues Found
- W1: claimId uses Math.random() not crypto.randomUUID() (deviates from ADR-VN2-008)
- W2: coachContext.ts line 144 uses firstName/lastName (intentional v1 port, tech debt)
- W3: resolveClaimPlayer has loop-based ctx.runQuery (acceptable in action context)
- W4: getRecentClaims/getRecentArtifacts no server-side auth (ADR-VN2-014 accepted)
- W5: getClaimsByOrgAndCoach no org membership check (needs fix in Phase 5+)
- S1: Claims viewer missing useCurrentUser() (ADR-VN2-014 specifies it)

### ADRs (Phase 4)
- ADR-VN2-010: Claims table denormalization -- ALIGNED
- ADR-VN2-011: Coach context helper extraction -- ALIGNED
- ADR-VN2-012: Claims extraction parallel scheduling -- ALIGNED
- ADR-VN2-013: Claims index strategy (7 indexes) -- ALIGNED
- ADR-VN2-014: Claims viewer access control -- PARTIAL (missing useCurrentUser)

### Tech Debt Tracker
- coachContext.ts firstName/lastName pattern (port from v1, fix when v1 refactored)
- getCoachAssignments/getFellowCoachesForTeams called as public from internal context
- 7 biome-ignore suppressions in coachContext.ts (Better Auth untyped returns)
- whatsapp.ts calls public mutations from internalAction (Phase 3 flagged, still open)

## Files Reference
- See `phase2-review.md` for detailed Phase 2 architectural review notes
- See `phase3-review.md` for detailed Phase 3 architectural review notes
- See `phase4-review.md` for detailed Phase 4 architectural review notes
