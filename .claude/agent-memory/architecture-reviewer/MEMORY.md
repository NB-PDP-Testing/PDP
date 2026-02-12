# Architecture Reviewer Memory

## Project Structure
- Monorepo: `apps/web/` (Next.js 14) + `packages/backend/` (Convex)
- Auth: Better Auth with org plugin, user fields: `_id`, `name`, `email`
- Schema: `packages/backend/convex/schema.ts` (~4400+ lines, very large)
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

## Phase 5 Post-Implementation Review (2026-02-07)

### Review Result: GOOD -- 1 critical, 6 warnings, 8 suggestions
### Pre-impl 3 critical API mismatches: ALL FIXED in implementation

### Key Issues
- C1: resolveEntity/rejectResolution/skipResolution lack org membership check (deferred Phase 5.5)
- W1: Unsafe `as Id<"playerIdentities">` cast for non-player entity types (lines 308, 341)
- W3: computeMatchReason "+team_context" always true (logic bug at line 436)

### Schema
- voiceNoteEntityResolutions: 4 indexes (by_claimId, by_artifactId, by_artifactId_and_status, by_org_and_status)
- coachPlayerAliases: 2 indexes (by_coach_org_rawText, by_coach_org)
- reviewAnalyticsEvents: linkCode now optional, 3 new disambiguate event types

### ADRs (Phase 5): VN2-015 through VN2-022
- 6/8 ALIGNED, 2 PARTIAL (015: not atomic writes, 021: org check deferred)

### Enhancement Coverage: All E1-E6 implemented

### Open Tech Debt (cumulative)
- coachContext.ts firstName/lastName pattern (Phase 4, still open)
- getCoachAssignments/getFellowCoachesForTeams public from internal context (Phase 4)
- whatsapp.ts public mutations from internalAction (Phase 3, still open)
- Stale aliases could resolve to removed players (Phase 5, defer to 5.5)
- resolveEntity backend org membership check deferred to Phase 5.5
- getRecentArtifacts/getRecentClaims no platform staff check (Phase 4, still open)
- batchUpdateResolutionsByRawText appears unused (dead code)

## Phase 6 Pre-Implementation Review (2026-02-07)

### Review Result: 4 critical PRD discrepancies, 5 warnings, 4 suggestions
### 10 ADRs generated (VN2-023 through VN2-032)

### Critical PRD Fixes Required
- C1: insightType must use 15 topics (not 8) to match voiceNoteClaims.topic
- C2: Remove bare `by_status` index (anti-pattern)
- C3: Use 5 statuses (include "expired")
- C4: handleCommand must be lib/ async helper (Convex can't ctx.runAction from action)

### Schema Corrections
- Add `displayOrder: v.number()` (stable CONFIRM numbering)
- Add `resolvedPlayerName: v.optional(v.string())` (avoid N+1 in WhatsApp summary)
- Add `by_artifactId_and_status` index (command handler query pattern)
- Total: 5 indexes on insightDrafts

### Key Architectural Decisions
- Confidence: `ai * resolution` with [0,1] clamping (ADR-VN2-023)
- Auto-confirm: personalized threshold + category prefs + never injury/wellbeing (ADR-VN2-024)
- Command routing: Between Priority 3 and 4 in processIncomingMessage (ADR-VN2-025)
- Draft apply target: voiceNoteInsights table (reuses Phase 7 pipeline) (ADR-VN2-026)
- Migration: batch 50, idempotent via by_voiceNoteId (ADR-VN2-027)
- Parser: lib/whatsappCommands.ts (pure), Handler: lib/whatsappCommandHandler.ts (async) (ADR-VN2-031)

### Integration Points
- entityResolution.ts ~line 187: scheduler for draftGeneration
- whatsapp.ts between line 373 and 375: v2 command check
- schema.ts after line 4384: insightDrafts table

## Phase 7A-7D Pre-Implementation Review (2026-02-08)

### Review Result: GOOD -- 3 critical, 8 warnings, 5 suggestions
### 6 ADRs generated (VN2-033 through VN2-038)

### Critical Issues
- C1: autoAppliedInsights.playerId is NOT optional but DEPRECATED + different table type
  - Also missing from PRD: changeType, targetTable, newValue (required fields)
  - Must fix schema or handle in Phase 7C US-VN-026
- C2: V2_MIGRATION_CONTEXT.md has 5+ WRONG function signatures for insightDrafts
  - getPendingDraftsForCoach, confirmAllDrafts, rejectAllDrafts all wrong
  - Phase PRDs have CORRECT signatures -- Ralph should use phase PRDs as authoritative
- C3: extractClaims scheduled before quality gates in transcribeAudio (pre-existing Phase 3)

### Key Verified Patterns
- createArtifact: does NOT accept voiceNoteId/status/createdAt (CONFIRMED)
- processVoiceNoteInsight: takes 7 args (CONFIRMED)
- shouldUseV2Pipeline: internalQuery, callable from mutation via ctx.runQuery (CONFIRMED)
- All .filter() in v2 files are JavaScript array .filter() after .collect() (audit clean)
- Feature flag cascade: env → platform → org → user → false (4-level, CONFIRMED correct)

### Double-Artifact Problem (Phase 7D)
- WhatsApp creates artifact in whatsapp.ts, then createTypedNote would create another
- Solution: skipV2: v.optional(v.boolean()) on public mutations (ADR-VN2-035)
- Harmless during Phase 7A-7C (duplicate artifacts don't corrupt data)

### Cross-Phase Dependencies (Verified No Circular)
- 7A → 7B (artifacts enable drafts for in-app notes)
- 7B → 7C (draft confirmation UI enables output bridge testing)
- 7C → 7D (output bridge enables safe scheduling gate + skipV2)

### voiceNotes.insights[] Embedded Array Schema (schema.ts:1525-1555)
- Required: id (string), title, description, status (4-literal union)
- Optional: playerIdentityId, playerId (DEPRECATED), playerName, category, recommendedUpdate, confidence, appliedDate, appliedAt, appliedBy, dismissedAt, dismissedBy, teamId, teamName, assigneeUserId, assigneeName, linkedTaskId

### ADRs (Phase 7A-7D)
- ADR-VN2-033: In-app artifact creation pattern
- ADR-VN2-034: Dual processing elimination strategy
- ADR-VN2-035: skipV2 parameter for WhatsApp callers
- ADR-VN2-036: Feature flag cascade for v2 rollout
- ADR-VN2-037: applyDraft output bridge architecture
- ADR-VN2-038: v2 migration status and rollout tooling
- ADR-VN2-039: Drafts tab data flow pattern
- ADR-VN2-040: Parent summary enablement check in applyDraft
- ADR-VN2-041: applyDraft mutation complexity and failure modes
- ADR-VN2-042: validateTextMessage quality gate placement

## Phase 7A Re-Validation (2026-02-08)
- Result: ALL PASS, 0 blocking concerns, READY for Ralph
- Key validation: ctx.runQuery(internal....) in public mutation is valid (Convex docs + codebase precedent in members.ts:268)
- Novel pattern: First time internal query called from public mutation in this codebase

## Phase 7B Pre-Implementation Review (2026-02-08)
- Result: GOOD -- 0 critical, 4 warnings, 5 suggestions
- 1 ADR: VN2-039 (data flow pattern -- lift query to parent)
- Key finding: ALL existing tabs query internally; DraftsTab is first to receive data as props
- DisambiguationBanner: verified works with in-app artifacts (no sourceChannel filter)
- .filter() false positive: insightDrafts.ts line 164 is JS Array.filter (not Convex)
- FileCheck icon: exists in lucide-react, first usage in codebase
- All shadcn components verified: Collapsible, Progress, AlertDialog
- Tab always visible (unconditional), empty state handles no-drafts
- Auto-switch priority: parents > drafts > insights (hasAutoSwitched guard correct)

## Phase 7C Pre-Implementation Review (2026-02-08)

### Review Result: 3 critical, 5 warnings, 4 suggestions
### 3 ADRs generated (VN2-040 through VN2-042)

### Critical Issues
- C1: PRD omits parentSummariesEnabled check (v1 checks at buildInsights:940-951, v2 must check too)
  - Fix: Query coachOrgPreferences.by_coach_org index in applyDraft before scheduling
- C2: voiceNotes.insights[] push object missing appliedBy and appliedDate fields
- C3: autoAppliedInsights.playerId is NOT optional -- schema change MUST be done FIRST (Step 3A before 0-3B)

### Auto-Confirm Verification: ALL 4 CHECKPOINTS PASS
- requiresConfirmation: sensitive types, trust < 2, confidence < threshold, category prefs
- checkAutoApplyAllowed: skills, attendance, goals, performance mapping correct
- Trust level fetch: coachId param correct
- Auto-confirmed scheduling: filters confirmed, schedules applyDraft

### Key Facts Verified
- processVoiceNoteInsight: 7 args, insightId is STRING, playerIdentityId REQUIRED
- autoAppliedInsights: 15 required fields (insightId is v.id, playerId needs schema change)
- `internal` already imported in insightDrafts.ts (line 11)
- applyDraft can schedule internalAction (precedent: voiceNotes.ts:631)
- voiceNotes.insights[] embedded array status: "pending"|"applied"|"dismissed"|"auto_applied"
- claim.recommendedAction is v.optional(v.string()) at schema.ts:4255

### Implementation Order
1. Schema change: make playerId optional in autoAppliedInsights
2. Schema change: add 3 backlink fields to voiceNoteInsights
3. Run codegen
4. Extend applyDraft (Steps 0-3B)
5. Add validateTextMessage to createTypedNote
6. Type check

## Files Reference
- See `phase2-review.md` through `phase6-review.md` for detailed notes
- Phase 7A-7D review in feedback.md (appended 2026-02-08)
- Phase 7A re-validation: `scripts/ralph/agents/output/phase7a-validation.md`
- Phase 7B review: feedback.md "Phase 7B Architecture Review" section
- Phase 7C review: feedback.md "Phase 7C Pre-Implementation Architecture Review" section
