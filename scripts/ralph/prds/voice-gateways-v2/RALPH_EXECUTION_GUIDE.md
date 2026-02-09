# Ralph Execution Guide - Voice Gateways v2

**Project**: Voice Gateways v2 (WhatsApp Quality Gates & v2 Pipeline)
**Total Duration**: 35-45 days (6 complete phases + Phase 7 in 4 sub-phases)
**Status**: Phase 7A READY FOR EXECUTION

---

## Quick Start

1. **Read Main Context**: `context/MAIN_CONTEXT.md`
2. **Start Phase 1**: Use `phases/PHASE1_PRD.json`
3. **Follow Checklist**: Complete all items in order
4. **Verify Success**: Check success criteria before moving to next phase

---

## Phase Execution Order

### Phase 1: Quality Gates & Fuzzy Matching (2.5 days) ✅ COMPLETE
**File**: `phases/PHASE1_PRD.json`
**Stories**: US-VN-001 to US-VN-006 (6 stories) — ALL COMPLETE
**Tests**: 349 passing across 86 files
**Integration gaps fixed**: VN-002 quality gate wired in, VN-006 fuzzy fallback wired in

---

### Phase 2: Coach Quick Review Microsite (7-9 days) ✅ COMPLETE
**File**: `phases/PHASE2_PRD.json`
**Stories**: US-VN-007 to US-VN-012 (6 stories) — ALL COMPLETE
**Dependencies**: Phase 1 complete ✅

---

### Phase 2.5: Review Microsite Polish ✅ COMPLETE
**Stories**: US-VN-012a (analytics), 012b (swipe), 012c (snooze), 012d (PWA)
**Key Learnings**: Never call public mutations from internalActions, never use v.any(), reuse existing components, bounds-check numeric inputs

---

### Phase 3: v2 Artifacts Foundation (3 days) ✅ COMPLETE
**File**: `phases/PHASE3_PRD.json`
**Stories**: US-VN-013 to US-VN-014 (2 stories) — ALL COMPLETE
**Dependencies**: Phase 2 + 2.5 complete ✅

**What was built:**
- `voiceNoteArtifacts` table + 5 CRUD functions (createArtifact, linkToVoiceNote, updateArtifactStatus, getArtifactByArtifactId, getArtifactsByVoiceNote)
- `voiceNoteTranscripts` table + 2 functions (createTranscript, getTranscriptByArtifact)
- `featureFlags` table + 3 functions (shouldUseV2Pipeline, getFeatureFlag, setFeatureFlag)
- Dual-path processing in whatsapp.ts (v2 creates artifact + v1 voiceNote, then links them)
- v2 transcript storage in voiceNotes.ts (after transcription completes, stores in voiceNoteTranscripts + sets artifact status to "transcribed")

---

### Phase 4: Claims Extraction (3 days) ✅ COMPLETE
**File**: `phases/PHASE4_PRD.json`
**Stories**: US-VN-015 to US-VN-016 (2 stories) — ALL COMPLETE
**Dependencies**: Phase 3 complete ✅

**What was built:**
- `voiceNoteClaims` table + 7 functions (storeClaims, getClaimsByArtifact, getClaimsByArtifactAndStatus, updateClaimStatus, getClaimByClaimId, getClaimsByOrgAndCoach, getRecentClaims)
- `coachContext.ts` shared helper (gatherCoachContext internalQuery — roster, teams, coaches)
- `claimsExtraction.ts` action (extractClaims with GPT-4 structured output, 15 topic categories, Zod schema)
- Deterministic + fuzzy player matching (0.85 threshold) populates resolvedPlayerIdentityId on claims
- Pipeline hook in voiceNotes.ts: `scheduler.runAfter(0, extractClaims)` after "transcribed"
- Platform debug viewer at `/platform/v2-claims` (auth-guarded, platform staff only)
- All public queries have auth guards (ctx.auth.getUserIdentity())
- crypto.randomUUID() for claim IDs

**Key Design Decisions:**
- Claims run ALONGSIDE v1 buildInsights (parallel, NOT replacing)
- Claims created with status "extracted" (NOT "resolving")
- Entity mentions preserved raw; resolved* fields are best-effort from Phase 4
- Denormalized org/coach on claims for efficient querying
- 15 topic categories (8 more than v1's 7)

---

### Phase 5: Entity Resolution & Disambiguation (4 days) ✅ COMPLETE
**File**: `phases/PHASE5_PRD.json`
**Stories**: US-VN-017 to US-VN-018 (2 stories) — ALL COMPLETE
**Dependencies**: Phase 4 complete ✅, Phase 1 fuzzy matching ✅

**What was built:**
- `voiceNoteEntityResolutions` table + 10 functions (4 internal + 6 public with ownership checks)
- `coachPlayerAliases` table + 3 functions (alias learning system)
- `entityResolution.ts` action (resolveEntities with trust-adaptive thresholds, alias lookup, batch grouping, rich matchReason)
- Disambiguation UI at `/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]` (552 lines)
- Navigation badge on voice notes list when disambiguation needed

**6 Enhancements delivered:**
- **E1**: Trust-Adaptive Threshold (personalized via coachTrustLevels)
- **E2**: Feature Flag Gating (entity_resolution_v2 flag cascade)
- **E3**: Disambiguation Analytics (disambiguate_accept/reject_all/skip events)
- **E4**: Rich matchReason badges (irish_alias, exact_first_name, fuzzy_full_name, etc.)
- **E5**: Coach Alias Learning (resolve once → auto-resolve forever)
- **E6**: Batch Same-Name Resolution (group by rawText, resolve all at once)

**Security hardening applied post-implementation:**
- Artifact ownership verification on all 6 public functions
- IDOR fix on getClaimsByOrgAndCoach (coachUserId verified against caller)
- Score bounds validation on resolveEntity and rejectResolution
- Type-safe claim updates by mentionType (player vs team)
- Dead code removal (batchUpdateResolutionsByRawText)
- Misleading team_context badge removed from computeMatchReason
- Auto-resolve threshold: **personalized** via coach trust level (E1), fallback 0.9

---

### Phase 6: Drafts & Confirmation Workflow (5 days) ✅ COMPLETE
**File**: `phases/PHASE6_PRD.json`
**Stories**: US-VN-019 to US-VN-021 (3 stories) — ALL COMPLETE
**Dependencies**: Phase 5 complete ✅

**What was built:**
- `insightDrafts` table + 11 functions (4 internal + 7 public with auth guards)
- `draftGeneration.ts` action (generateDrafts with confidence scoring, auto-confirm gate)
- `whatsappCommands.ts` parser + `whatsappCommandHandler.ts` handler (4 command types)
- `migration.ts` action (migrateVoiceNotesToV2 — batch, dry-run, idempotent)
- `getCompletedForMigration` internalQuery in voiceNotes.ts
- 26 unit tests for WhatsApp command parser

---

### Phase 7A: Wire In-App Notes to v2 Artifact Pipeline (2-3 days) ✅ COMPLETE
**File**: `phases/PHASE7A_PRD.json`
**Stories**: US-VN-022 to US-VN-023 (2 stories) — ALL COMPLETE
**Dependencies**: Phase 6 complete ✅

**What was built:**
- In-app typed notes (`createTypedNote`) now create v2 artifacts when feature flag enabled
- In-app recorded notes (`createRecordedNote`) now create v2 artifacts when feature flag enabled
- `buildInsights` (v1) skipped when v2 artifact exists — eliminates duplicate processing
- `shouldUseV2Pipeline` internalQuery called from public mutations via `ctx.runQuery`
- Both `sourceChannel: "app_typed"` and `sourceChannel: "app_recorded"` wired

---

### Phase 7B: Draft Confirmation UI (3-4 days) ✅ COMPLETE
**File**: `phases/PHASE7B_PRD.json`
**Stories**: US-VN-024 to US-VN-025 (2 stories) — ALL COMPLETE
**Dependencies**: Phase 7A complete ✅

**What was built:**
- New "Drafts" tab in voice notes dashboard with FileCheck icon and count badge
- `DraftsTab` component: grouped by artifact, confidence bars, evidence snippets, confirm/reject
- Batch operations: Confirm All / Reject All per artifact group with AlertDialog confirmation
- Auto-switch to Drafts tab when pending drafts exist (priority: parents > drafts > insights)
- Security hardened: organizationId added to batch mutations, composite index for expiry range query

---

### Phase 7C: Complete v2 → v1 Output Bridge (2-3 days) ✅ COMPLETE
**File**: `phases/PHASE7C_PRD.json`
**Stories**: US-VN-026 to US-VN-027 (2 stories) — ALL COMPLETE
**Dependencies**: Phase 7B complete ✅

**What was built:**
- `applyDraft` output bridge: creates voiceNoteInsights with back-links (sourceArtifactId, sourceClaimId, sourceDraftId)
- Updates voiceNotes.insights[] embedded array with appliedBy + appliedDate for v1 display compat
- Schedules processVoiceNoteInsight with parentSummariesEnabled check (coachOrgPreferences.by_coach_org)
- Creates autoAppliedInsights audit record for auto-confirmed drafts (playerId now optional)
- validateTextMessage quality gate added to createTypedNote (sync, no ctx needed)
- Auto-confirm logic verified (all 4 checkpoints pass, no changes needed to draftGeneration.ts)

---

### Phase 7D: Retire v1 Processing & Clean Up (2-3 days) 🟢 START HERE
**File**: `phases/PHASE7D_PRD.json` (PRIMARY — read this FIRST)
**Stories**: US-VN-028 to US-VN-029 (2 stories)
**Dependencies**: Phase 7A + 7B + 7C complete ✅

**Context Files**:
- `phases/PHASE7D_PRD.json` (PRIMARY — full implementation details, verified code locations, double-artifact analysis)
- `context/V2_MIGRATION_CONTEXT.md` (ESSENTIAL — v1 vs v2 architecture)
- `context/MAIN_CONTEXT.md` (REFERENCE — overall project context)

**US-VN-028: Remove Dual Processing Path** (4 changes):
1. createTypedNote: wrap buildInsights in `if (!useV2)` — reuse existing useV2 variable
2. transcribeAudio: wrap buildInsights in `if (artifacts.length === 0)` — reuse existing artifacts variable
3. Add `skipV2: v.optional(v.boolean())` to createTypedNote & createRecordedNote, pass from WhatsApp callers
4. Update defense-in-depth log in buildInsights to say 'Defense-in-depth'

**US-VN-029: Feature Flag Promotion Tooling** (4 scripts):
1. enableV2ForOrg.ts — mutation that enables both v2 flags for an org
2. disableV2ForOrg.ts — mutation that disables both flags (rollback)
3. v2MigrationStatus.ts — query reporting counts across all v2 tables for an org
4. runMigration.ts — public action wrapper around internal migrateVoiceNotesToV2

**CRITICAL**: Do NOT call shouldUseV2Pipeline twice — reuse existing useV2 variable from Phase 7A.
**PATTERNS**: Scripts use camelCase filenames, export query/mutation/action (NOT internal), for `convex run` compatibility.

---

## Execution Workflow (Per Phase)

```
1. Read Phase PRD File
   ↓
2. Read All Context Files Listed
   ↓
3. Review All Stories for Phase
   ↓
4. Execute Stories in Order (or parallel for Phase 1)
   ↓
5. Complete Checklist Items (if checklist exists)
   ↓
6. Run Tests (unit + manual UAT)
   ↓
7. Verify Success Criteria Met
   ↓
8. Commit Phase Changes
   ↓
9. Move to Next Phase
```

---

## Testing Requirements

### Phase 1 Testing
**Unit Tests**: 100% coverage required
- `__tests__/messageValidation.test.ts`
- `__tests__/duplicateDetection.test.ts`
- `__tests__/whatsappFeedback.test.ts`
- `__tests__/stringMatching.test.ts`
- `__tests__/playerMatching.test.ts`

**Manual UAT**: 18 test cases
- QG-001 to QG-008 (Quality Gates)
- FB-001 to FB-005 (Feedback Messages)
- FM-001 to FM-005 (Fuzzy Matching)

**Type Check**: `npm run check-types` (0 errors required)

---

## Success Criteria (Per Phase)

Each phase has specific success criteria in its PRD file. General criteria:
- ✅ All stories completed
- ✅ All tests passing
- ✅ Type check passes
- ✅ Manual UAT passes
- ✅ Documentation updated
- ✅ Code committed

---

## File Structure

```
voice-gateways-v2/
├── PRD.json                          # Master PRD (Phase 7A stories + references to phase PRDs)
├── RALPH_EXECUTION_GUIDE.md         # This file
├── context/
│   ├── MAIN_CONTEXT.md              # Project overview (read first)
│   ├── V2_MIGRATION_CONTEXT.md      # Phase 7+ verified function signatures & architecture
│   ├── PHASE1_QUALITY_GATES.md      # Phase 1 implementation guide
│   ├── PHASE2_MOBILE_REVIEW.md      # Phase 2 implementation guide
│   ├── PHASE3_V2_MIGRATION.md       # Phases 3-6 implementation guide
│   ├── PHASE4_CLAIMS_EXTRACTION.md  # Phase 4 detailed implementation guide
│   └── PHASE5_ENTITY_RESOLUTION.md  # Phase 5 entity resolution guide
├── phases/
│   ├── PHASE1_PRD.json             # Phase 1 stories (COMPLETE)
│   ├── PHASE2_PRD.json             # Phase 2 stories (COMPLETE)
│   ├── PHASE3_PRD.json             # Phase 3 stories (COMPLETE)
│   ├── PHASE4_PRD.json             # Phase 4 stories (COMPLETE)
│   ├── PHASE5_PRD.json             # Phase 5 stories (COMPLETE)
│   ├── PHASE6_PRD.json             # Phase 6 stories (COMPLETE)
│   ├── PHASE7A_PRD.json            # Phase 7A: Wire in-app notes to v2 (CURRENT)
│   ├── PHASE7B_PRD.json            # Phase 7B: Draft confirmation UI
│   ├── PHASE7C_PRD.json            # Phase 7C: v2 → v1 output bridge
│   └── PHASE7D_PRD.json            # Phase 7D: Retire v1 processing
└── validation/
    └── (historical validation reports)
```

---

## Important Notes

### ✅ What's Already Implemented (Don't Build)
- **Auto-Apply Preferences** (coachTrustLevels.insightAutoApplyPreferences)
- **Trust Level System** (coachTrustLevels table)
- **Parent Communication Preferences** (coachOrgPreferences table)
- **WhatsApp Integration Foundation** (processIncomingMessage, checkAndAutoApply)

### 🟢 What You're Building
- Quality gates for message validation
- Fuzzy matching for player names
- Mobile quick review UI
- Voice Notes Pipeline v2 (artifacts, claims, entity resolution, drafts)

### ⚠️ Common Pitfalls to Avoid
- Don't use `.filter()` after `.withIndex()` (use composite indexes)
- Don't process messages without quality checks
- Don't use exact string matching for player names (always fuzzy)
- Don't skip unit tests
- Don't use Better Auth IDs as `v.id()` (use `v.string()`)

---

## Progress Tracking

After completing each phase, update this checklist:

- [x] Phase 1: Quality Gates & Fuzzy Matching (2.5 days) ✅ COMPLETE
- [x] Phase 2: Coach Quick Review Microsite (7-9 days) ✅ COMPLETE
- [x] Phase 2.5: Review Microsite Polish ✅ COMPLETE
- [x] Phase 3: v2 Artifacts Foundation (3 days) ✅ COMPLETE
- [x] Phase 4: Claims Extraction (3 days) ✅ COMPLETE
- [x] Phase 5: Entity Resolution & Disambiguation (4 days) ✅ COMPLETE
- [x] Phase 6: Drafts & Confirmation Workflow (5 days) ✅ COMPLETE
- [x] Phase 7A: Wire In-App Notes to v2 (2-3 days) ✅ COMPLETE
- [x] Phase 7B: Draft Confirmation UI (3-4 days) ✅ COMPLETE
- [x] Phase 7C: v2 → v1 Output Bridge (2-3 days) ✅ COMPLETE
- [ ] Phase 7D: Retire v1 Processing (2-3 days) 🟢 START HERE

**Current Phase**: Phase 7D 🟢
**Overall Progress**: Phases 1-7C complete (27/29 stories, 93%). Phase 7D has 2 stories remaining.
**Phase 7C**: Complete (US-VN-026 + US-VN-027, applyDraft bridge + quality gates + auto-confirm verified)

---

## Questions or Issues?

Refer to:
1. **Main Context**: `context/MAIN_CONTEXT.md`
2. **Phase Guide**: `context/PHASE5_ENTITY_RESOLUTION.md` (Phase 5)
3. **Enhancements Catalog**: `context/PHASE5_ENHANCEMENTS_CATALOG.md` (E1-E12 assessment)
4. **Validation Reports**: `validation/` directory
5. **Master PRD**: `PRD.json` (complete reference)

---

**Ready to start Phase 7D!**

Read `phases/PHASE7D_PRD.json` (PRIMARY — full implementation details with verified code locations and double-artifact analysis) to begin. The master `PRD.json` has abbreviated summaries — always defer to the phase PRD for exact implementation instructions. Pay special attention to reusing existing variables (useV2, artifacts) — do NOT call shouldUseV2Pipeline twice.
