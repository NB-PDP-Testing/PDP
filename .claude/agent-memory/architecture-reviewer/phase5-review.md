# Phase 5 Post-Implementation Review (2026-02-07)

## Commits Reviewed
- `6b07231e` feat: US-VN-017 - Entity Resolution Table, Aliases & Action
- `71bc8088` feat: US-VN-018 - Disambiguation UI with Analytics & Batch Resolution
- Diff range: `4b4a4f27..71bc8088`

## Review Result: GOOD -- 1 critical, 6 warnings, 8 suggestions

## Files Created/Modified

### NEW Files
- `packages/backend/convex/models/voiceNoteEntityResolutions.ts` (477 lines, 10 functions: 5 internal + 5 public)
- `packages/backend/convex/models/coachPlayerAliases.ts` (123 lines, 3 functions: 2 internal + 1 public)
- `packages/backend/convex/actions/entityResolution.ts` (728 lines, 1 internalAction + helpers)
- `packages/backend/convex/actions/claimsExtraction.ts` (594 lines, Phase 4 but in diff)
- `packages/backend/convex/models/voiceNoteClaims.ts` (273 lines, Phase 4 but in diff)
- `packages/backend/convex/lib/coachContext.ts` (228 lines, Phase 4)
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]/page.tsx` (551 lines)
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/disambiguation-banner.tsx` (59 lines)

### MODIFIED Files
- `packages/backend/convex/schema.ts` -- +167 lines (3 new tables + schema changes)
- `packages/backend/convex/models/reviewAnalytics.ts` -- linkCode optional, 3 new event types
- `packages/backend/convex/models/voiceNoteArtifacts.ts` -- shared validator, getArtifactById, getRecentArtifacts
- `packages/backend/convex/actions/voiceNotes.ts` -- schedule extractClaims hook (line 258)
- `packages/backend/convex/lib/featureFlags.ts` -- shouldUseEntityResolution cascade
- `packages/backend/convex/lib/stringMatching.ts` -- export ALIAS_TO_CANONICAL
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx` -- banner import
- `packages/backend/convex/models/users.ts` -- 11 profile completion fields in return validator

## Schema (voiceNoteEntityResolutions)
- 4 indexes: by_claimId, by_artifactId, by_artifactId_and_status, by_org_and_status
- Correctly dropped by_status (per ADR-VN2-022)
- candidates array embedded (not separate table)
- resolvedEntityId is v.string() (correct for multi-entity-type)

## Schema (coachPlayerAliases)
- 2 indexes: by_coach_org_rawText, by_coach_org
- rawText stored normalized (lowercase, trimmed)

## Critical Issues
- C1: resolveEntity/rejectResolution/skipResolution lack org membership check. Cross-org data manipulation possible. ADR-VN2-021 defers to Phase 5.5.

## Warnings
- W1: Unsafe `as Id<"playerIdentities">` cast at lines 308, 341 -- writes player ID even for team/coach resolutions
- W2: ADR-VN2-015 specifies atomic write but uses separate storeResolutions + updateClaimStatuses
- W3: computeMatchReason "+team_context" always true when coach has any team (line 436)
- W4: Sequential mutations in loop for reject/skip-all in disambiguation UI (lines 165, 183)
- W5: getRecentArtifacts/getRecentClaims still lack platform staff check (repeat from Phase 4)
- W6: E6 batch update reads claims in loop in resolveEntity (small N, acceptable)

## Suggestions
- S1: resolveEntity handler too long (~120 lines), extract helpers
- S2: batchUpdateResolutionsByRawText appears unused (dead code)
- S3: Alias lookups in action could be parallelized with Promise.all
- S4: Alias useCount double-incremented (auto-resolve + manual re-resolve)
- S5: v2-claims page now imports useCurrentUser (Phase 4 S1 addressed)
- S6: Entity resolution action silently swallows errors, no artifact status update on failure
- S7: users.ts profile completion fields unrelated to Phase 5, should be separate commit
- S8: Disambiguation banner fetches full objects but only needs counts

## ADR Alignment
- ADR-VN2-015: PARTIAL (not fully atomic writes)
- ADR-VN2-016: ALIGNED
- ADR-VN2-017: ALIGNED (correct { coachId } arg)
- ADR-VN2-018: ALIGNED (full cascade)
- ADR-VN2-019: ALIGNED (upsert in both paths)
- ADR-VN2-020: ALIGNED (artifact-scoped route, query lifting)
- ADR-VN2-021: PARTIAL (auth only, org check deferred)
- ADR-VN2-022: ALIGNED (4 + 2 indexes)

## Enhancement Coverage (E1-E6): All 6 implemented

## Pre-Implementation vs Post-Implementation
The pre-implementation review identified 3 critical API mismatches. All 3 were fixed:
- C1 (getCoachTrustLevelInternal arg): FIXED -- correctly uses { coachId: coachUserId }
- C2 (logReviewEvent schema): FIXED -- linkCode optional, 3 new event types
- C3 (getFeatureFlag vs boolean): FIXED -- created shouldUseEntityResolution cascade
