# Architecture Reviewer Memory

## Project Structure
- Monorepo: `apps/web/` (Next.js 14) + `packages/backend/` (Convex)
- Auth: Better Auth with org plugin, user fields: `_id`, `name`, `email`
- Schema: `packages/backend/convex/schema.ts` (~4900+ lines, very large)
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
- `ADR-VN2-001` through `ADR-VN2-006`: Phase 2 Voice Gateways v2
- `ADR-VN2-007` through `ADR-VN2-009`: Phase 3 (feature flags, artifact IDs, dual-path)
- `ADR-VN2-010` through `ADR-VN2-014`: Phase 4 (claims extraction)
- `ADR-VN2-015` through `ADR-VN2-022`: Phase 5 (entity resolution)
- `ADR-VN2-023` through `ADR-VN2-032`: Phase 6 (drafts & confirmation)
- See phase-specific review files for details

## VN2 Pipeline Reviews (Phases 3-7C) -- See Separate Files
- Phase 3: `phase3-review.md` -- integration points, featureFlags in lib/
- Phase 4: `phase4-review.md` -- 0 critical, 5 warnings; coachContext.ts tech debt
- Phase 5: `phase5-review.md` -- 1 critical (org check deferred); all E1-E6 implemented
- Phase 6: `phase6-review.md` -- 4 critical PRD fixes; 10 ADRs (VN2-023-032)
- Phase 7A-7D: feedback.md sections -- 3 critical; skipV2 pattern; double-artifact problem
- Phase 7B: feedback.md -- 0 critical; DraftsTab data-as-props pattern
- Phase 7C: feedback.md -- 3 critical; applyDraft output bridge; schema changes needed first

### Open Tech Debt (Cumulative, Still Active)
- coachContext.ts firstName/lastName pattern (Phase 4)
- whatsapp.ts public mutations from internalAction (Phase 3)
- resolveEntity backend org membership check (Phase 5, deferred)
- getRecentArtifacts/getRecentClaims no platform staff check (Phase 4)
- batchUpdateResolutionsByRawText appears unused (dead code)

## Voice Monitor Harness Reviews -- See `voice-monitor-harness-review.md`
- PRD Review (2026-02-15): 6 critical issues (transcribeAudio signature, missing orgId, schema gaps)
- M3 Pre-Impl (2026-02-15): 3 ADRs (VNM-005/006/007), 4 critical findings
  - C1: voiceNoteId optional on artifacts -- MUST guard
  - C2: Auth inconsistency M1 vs M2 -- use M2 two-step pattern
  - C3: JS .filter() on arrays is OK (quality hook will false-positive)
  - C4: Use ctx.db.patch() directly, not updateArtifactStatus
- No schema changes needed for M3 (all indexes exist)
- M4 Comprehensive Review (2026-02-16): 6 ADRs (VNM-008 through VNM-013)
  - ADR-VNM-008: NEW `voicePipelineAlerts` table (do NOT reuse platformCostAlerts)
  - ADR-VNM-009: Single internalMutation with per-check try/catch
  - ADR-VNM-010: State-based dedup (not time-window) -- max 1 unacked alert/type
  - ADR-VNM-011: Latency baseline from 168 hourly snapshots, min 6 valid required
  - ADR-VNM-012: 4-level severity classification (critical/high/medium/low)
  - ADR-VNM-013: 5-minute cron interval, no wrapper needed
  - SCHEMA CHANGE: Add voicePipelineAlerts table ONLY
  - CORRECTION: by_status index on voiceNoteEntityResolutions ALREADY EXISTS (line 4407)
  - VERIFIED: Counter organizationId = undefined for platform-wide (M1/M2 pattern)
  - Implementation guide: scripts/ralph/agents/output/m4-implementation-guide.md

## M5 Dashboard UI Review (2026-02-17) -- See `m5-review.md`
- 7 ADRs (VNM-014 through VNM-020): Route structure, data fetching, components, responsive, SVG, tabs, loading
- CRITICAL FINDING: `/platform/layout.tsx` is CLIENT component (not server) -- M5 layout MUST also be client
- CRITICAL FINDING: Do NOT use shadcn/ui Tabs for URL routing -- use Link + usePathname
- CRITICAL FINDING: `getRecentEvents` returns `v.any()` page items -- need local TS interface
- CRITICAL FINDING: Custom pagination args (not Convex native) -- `cursor: null` not `undefined`
- No `usePaginatedQuery` exists in codebase yet (getRecentEvents uses manual pagination)
- All shadcn/ui components needed are installed (Tabs, ScrollArea, Skeleton, Breadcrumb, Card, Badge)
- v2-claims page pattern: useCurrentUser + skip pattern + Skeleton loaders = good reference
- Implementation guide: scripts/ralph/agents/output/m5-implementation-guide.md

### M5 Platform Auth Pattern (Confirmed)
- Parent `/platform/layout.tsx` uses: Authenticated/Unauthenticated/AuthLoading guards + useCurrentUser hook
- Voice-monitoring layout adds defense-in-depth check only (parent already enforces)
- Queries skip via: `isPlatformStaff ? {} : "skip"` pattern
- useCurrentUser reads from context (zero queries) -- CurrentUserProvider at app level

## Files Reference
- See `phase2-review.md` through `phase6-review.md` for detailed notes
- Phase 7A-7D review in feedback.md (appended 2026-02-08)
- Phase 7A re-validation: `scripts/ralph/agents/output/phase7a-validation.md`
- Phase 7B review: feedback.md "Phase 7B Architecture Review" section
- Phase 7C review: feedback.md "Phase 7C Pre-Implementation Architecture Review" section
- M5 review: `m5-review.md` and `scripts/ralph/agents/output/m5-implementation-guide.md`
