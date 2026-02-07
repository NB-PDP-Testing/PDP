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

### Phase 4: Claims Extraction (3 days) 🟢 START HERE
**File**: `scripts/ralph/prd.json` (PRIMARY — updated for Phase 4)
**Stories**: US-VN-015 to US-VN-016 (2 stories)
**Dependencies**: Phase 3 complete ✅

**CRITICAL — Read These First:**
1. `scripts/ralph/prd.json` — working PRD with Phase 4 stories + critical reminders
2. `context/PHASE4_CLAIMS_EXTRACTION.md` — **DETAILED implementation guide** with code snippets, schema, prompt template
3. `context/MAIN_CONTEXT.md` — project overview
4. `context/PHASE3_V2_MIGRATION.md` — v2 migration context (Phase 3 decisions)

**Key Design Decisions:**
- Claims run ALONGSIDE v1 buildInsights (parallel, NOT replacing)
- Separate action file `claimsExtraction.ts` (voiceNotes.ts is 1300+ lines)
- Shared `coachContext.ts` helper (avoids duplicating 130+ lines from buildInsights)
- 15 topic categories (8 more than v1's 7)
- Denormalized org/coach on claims for efficient querying
- Entity mentions preserved raw; resolved* fields are best-effort
- Platform debug viewer at `/platform/v2-claims`

**Execution Order:**
1. US-VN-015 (schema + model + helper + extraction action) — backend only
2. US-VN-016 (pipeline hook + claims viewer) — 3 lines in voiceNotes.ts + frontend page

**Context Files**:
- `context/PHASE4_CLAIMS_EXTRACTION.md` ← PRIMARY (detailed implementation guide)
- `context/MAIN_CONTEXT.md`
- `context/PHASE3_V2_MIGRATION.md`

---

### Phase 5: Entity Resolution & Disambiguation (4 days)
**File**: `phases/PHASE5_PRD.json`
**Stories**: US-VN-017 to US-VN-018 (2 stories)
**Dependencies**: Phase 4 complete (needs claims), Phase 1 (fuzzy matching)

**Context Files**:
- `context/MAIN_CONTEXT.md`
- `context/PHASE3_V2_MIGRATION.md`
- `context/PHASE1_QUALITY_GATES.md` (fuzzy matching integration)
- `docs/architecture/voice-notes-pipeline-v2.md`

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
- [ ] Phase 4: Claims Extraction (3 days) 🟢 START HERE
- [ ] Phase 5: Entity Resolution & Disambiguation (4 days)
- [ ] Phase 6: Drafts & Confirmation Workflow (5 days)

**Current Phase**: Phase 4 🟢
**Overall Progress**: 82% (18/22 stories complete)
**Phase 1**: Complete (US-VN-001 to US-VN-006, 349 tests passing)
**Phase 2**: Complete (US-VN-007 to US-VN-012, full mobile microsite)
**Phase 2.5**: Complete (012a-012d, analytics + swipe + snooze + PWA)
**Phase 3**: Complete (US-VN-013 + US-VN-014, v2 tables + feature flags + dual-path)

---

## Questions or Issues?

Refer to:
1. **Main Context**: `context/MAIN_CONTEXT.md`
2. **Phase Guide**: `context/PHASE4_CLAIMS_EXTRACTION.md` (Phase 4)
3. **Validation Reports**: `validation/` directory
4. **Master PRD**: `PRD.json` (complete reference)

---

**Ready to start Phase 4!**

Read `scripts/ralph/prd.json` (the working PRD, updated for Phase 4) and `context/PHASE4_CLAIMS_EXTRACTION.md` to begin.
