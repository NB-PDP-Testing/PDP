# Phase 2: Coach Quick Review Microsite - Architecture Review Notes

**Date:** 2026-02-06
**Status:** Review complete, 6 ADRs written, implementation guidance in feedback.md

## Key Architecture Decisions

1. **Capability URL** (code = token, no login) - accepted
2. **One rolling link per coach** (reuse active, voiceNoteIds array grows) - accepted
3. **Public queries** with per-call code validation (not HTTP actions) - accepted
4. **Single aggregation query** (getCoachPendingItems, batch fetch by ID) - accepted
5. **Exact match WhatsApp commands** (OK/R, not NLP, not prefix) - accepted
6. **In-place insight edits** (modify embedded array, not copy) - accepted

## Critical Implementation Notes

- `/r/[code]` is a standalone public route, NOT under `/orgs/[orgId]/`
- Client component (uses `useQuery` for real-time)
- No auth provider wrapping
- All mutations in `whatsappReviewLinks.ts` (not voiceNotes.ts)
- `validateReviewCode()` helper called in every public function
- `ctx.db.get(id)` in Promise.all is OK (direct ID lookup, not N+1)
- findSimilarPlayers logic must be extracted to shared lib before US-VN-010
- Cron: expire at 2:30 AM, cleanup at 3:15 AM (avoid 3:00 AM collision)

## Risks Identified
1. BLOCKING: findSimilarPlayers is internalQuery (must refactor for public wrapper)
2. WARNING: Existing .filter() usage in voiceNotes.ts line 470
3. WARNING: firstName/lastName bug in getVoiceNotesForCoachTeams
4. LOW: accessLog unbounded growth (cap at 100)
5. LOW: Cron collision at 3 AM (use 3:15)
6. LOW: "OK" false positive (mitigated by exact match + pending check)
