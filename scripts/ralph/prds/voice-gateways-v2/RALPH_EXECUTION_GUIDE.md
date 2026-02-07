# Ralph Execution Guide - Voice Gateways v2

**Project**: Voice Gateways v2 (WhatsApp Quality Gates & v2 Pipeline)
**Total Duration**: 25-30 days (6 phases)
**Status**: ✅ VALIDATED & READY FOR EXECUTION

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

### Phase 5: Entity Resolution & Disambiguation (4 days) 🟢 START HERE
**File**: `phases/PHASE5_PRD.json` (PRIMARY — updated with Phase 1-4 learnings + 6 enhancements)
**Stories**: US-VN-017 to US-VN-018 (2 stories)
**Dependencies**: Phase 4 complete ✅, Phase 1 fuzzy matching ✅

**CRITICAL — Read These First:**
1. `phases/PHASE5_PRD.json` — updated PRD with corrected acceptance criteria + 6 enhancements
2. `context/PHASE5_ENTITY_RESOLUTION.md` — **DETAILED implementation guide** with batch patterns, auth guards, threshold reference, enhancement integration
3. `context/PHASE5_ENHANCEMENTS_CATALOG.md` — Full catalog of ALL 12 assessed enhancements (6 included, 6 deferred for future)
4. `context/MAIN_CONTEXT.md` — project overview
5. `context/PHASE3_V2_MIGRATION.md` — v2 migration context

**6 ENHANCEMENTS INCLUDED (from Phases 1-4 infrastructure analysis):**
- **E1**: Trust-Adaptive Threshold — use coach's `insightConfidenceThreshold` instead of hardcoded 0.9 (~1h)
- **E2**: Feature Flag Gating — `entity_resolution_v2` flag controls entity resolution independently (~30m)
- **E3**: Disambiguation Analytics — log `disambiguate_accept/reject_all/skip` events via existing `reviewAnalytics.ts` (~1h)
- **E4**: Rich matchReason — show WHY a candidate matched (irish_alias, fuzzy_full_name, etc.) (~1h)
- **E5**: Coach Alias Learning — `coachPlayerAliases` table, resolve once → remember forever (~3h)
- **E6**: Batch Same-Name Resolution — group mentions by rawText, resolve all at once (~2h)

**CRITICAL LEARNINGS FROM PHASE 4 (MUST FOLLOW):**
- Phase 4 creates claims with status `"extracted"` — query for this status, NOT `"resolving"`
- Phase 4 already does player matching (0.85 threshold) — SKIP claims with resolvedPlayerIdentityId set
- `claimProcessing.ts` does NOT exist — the file is `claimsExtraction.ts`
- `findSimilarPlayers` is an internalQuery — use `ctx.runQuery(internal.models...)`
- ALL public queries/mutations MUST check `ctx.auth.getUserIdentity()`
- Use BATCH pattern: collect unique names → query once per name → Map for O(1) lookup
- Handle ALL entity types: player_name, team_name, group_reference, coach_name
- Auto-resolve threshold: **personalized** via coach trust level (E1), fallback 0.9

**Execution Order:**
1. US-VN-017 (schema for both tables + models + resolution action with E1/E4/E5/E6 + integration with E2) — backend only
2. US-VN-018 (disambiguation UI with E3 analytics + E4 matchReason badges + E6 batch display) — frontend + mutation

**Context Files**:
- `context/PHASE5_ENTITY_RESOLUTION.md` ← PRIMARY (detailed implementation guide with enhancements)
- `context/PHASE5_ENHANCEMENTS_CATALOG.md` ← Full enhancement catalog (included + deferred)
- `context/MAIN_CONTEXT.md`
- `context/PHASE3_V2_MIGRATION.md`

---

### Phase 6: Drafts & Confirmation Workflow (5 days)
**File**: `phases/PHASE6_PRD.json`
**Stories**: US-VN-019 to US-VN-021 (3 stories)
**Dependencies**: Phase 5 complete (needs resolved entities)

**Context Files**:
- `context/MAIN_CONTEXT.md`
- `context/PHASE3_V2_MIGRATION.md`
- `docs/architecture/voice-notes-pipeline-v2.md`

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
├── PRD.json                          # Master PRD (all 21 stories)
├── RALPH_EXECUTION_GUIDE.md         # This file
├── context/
│   ├── MAIN_CONTEXT.md              # Project overview (read first)
│   ├── PHASE1_QUALITY_GATES.md      # Phase 1 implementation guide
│   ├── PHASE2_MOBILE_REVIEW.md      # Phase 2 implementation guide
│   ├── PHASE3_V2_MIGRATION.md       # Phases 3-6 implementation guide
│   └── PHASE4_CLAIMS_EXTRACTION.md  # Phase 4 detailed implementation guide
├── phases/
│   ├── README.md                    # Phase files overview
│   ├── PHASE1_PRD.json             # Phase 1 stories only
│   ├── PHASE2_PRD.json             # Phase 2 stories only
│   ├── PHASE3_PRD.json             # Phase 3 stories only
│   ├── PHASE4_PRD.json             # Phase 4 stories only
│   ├── PHASE5_PRD.json             # Phase 5 stories only
│   └── PHASE6_PRD.json             # Phase 6 stories only
└── validation/
    ├── AUTO_APPLY_COMPREHENSIVE_ANALYSIS.md
    ├── VOICE_GATEWAYS_V2_PRD_VALIDATION.md
    ├── VALIDATION_SUMMARY.md
    └── CORRECTED_PRD_SUMMARY.md
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
- [ ] Phase 5: Entity Resolution & Disambiguation (4 days) 🟢 START HERE
- [ ] Phase 6: Drafts & Confirmation Workflow (5 days)

**Current Phase**: Phase 5 🟢
**Overall Progress**: 91% (19/21 stories complete)
**Phase 1**: Complete (US-VN-001 to US-VN-006, 349 tests passing)
**Phase 2**: Complete (US-VN-007 to US-VN-012, full mobile microsite)
**Phase 2.5**: Complete (012a-012d, analytics + swipe + snooze + PWA)
**Phase 3**: Complete (US-VN-013 + US-VN-014, v2 tables + feature flags + dual-path)
**Phase 4**: Complete (US-VN-015 + US-VN-016, claims table + extraction action + viewer)

---

## Questions or Issues?

Refer to:
1. **Main Context**: `context/MAIN_CONTEXT.md`
2. **Phase Guide**: `context/PHASE5_ENTITY_RESOLUTION.md` (Phase 5)
3. **Enhancements Catalog**: `context/PHASE5_ENHANCEMENTS_CATALOG.md` (E1-E12 assessment)
4. **Validation Reports**: `validation/` directory
5. **Master PRD**: `PRD.json` (complete reference)

---

**Ready to start Phase 5!**

Read `scripts/ralph/prd.json` (the working PRD) and `context/PHASE5_ENTITY_RESOLUTION.md` to begin. Also review `context/PHASE5_ENHANCEMENTS_CATALOG.md` for enhancement details.
