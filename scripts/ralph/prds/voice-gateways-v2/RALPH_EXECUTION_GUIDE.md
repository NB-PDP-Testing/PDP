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

### Phase 2: Coach Quick Review Microsite (7-9 days) 🟢 START HERE
**File**: `phases/PHASE2_PRD.json` (REVISED v2 — aggregated no-auth microsite)
**Stories**: US-VN-007 to US-VN-012 (6 stories)
**Dependencies**: Phase 1 complete ✅

**CRITICAL — Read These First:**
1. `context/MAIN_CONTEXT.md` — project overview
2. `context/PHASE2_MOBILE_REVIEW.md` — REVISED implementation guide (v2 microsite approach)
3. `scripts/ralph/agents/output/feedback.md` — architectural review guidance
4. `scripts/ralph/prd.json` — working PRD with critical reminders

**Key Design Changes (v2 revision):**
- NO AUTH on /r/[code] — public route, code = token (magic link pattern)
- NO REDIRECT — /r/[code] renders the review UI directly
- ONE LINK PER COACH — reuse active link, don't generate per voice note
- AGGREGATED QUEUE — all pending items across all voice notes, grouped by priority
- WhatsApp "OK" quick-reply to batch-apply matched insights
- Inline edit on insight cards before applying
- Security: device fingerprint binding, access audit log, access count monitoring

**Execution Order:**
1. US-VN-007 (backend links) → US-VN-008 (microsite shell) → US-VN-009 (sections) → US-VN-010 (unmatched cards)
2. US-VN-011 (trust messages + WhatsApp quick actions) — can start after US-VN-007
3. US-VN-012 (link expiry) — can start after US-VN-008

**Context Files**:
- `context/MAIN_CONTEXT.md`
- `context/PHASE2_MOBILE_REVIEW.md`

---

### Phase 3: v2 Artifacts Foundation (3 days)
**File**: `phases/PHASE3_PRD.json`
**Stories**: US-VN-013 to US-VN-014 (2 stories)
**Dependencies**: Phase 2 complete

**Context Files**:
- `context/MAIN_CONTEXT.md`
- `context/PHASE3_V2_MIGRATION.md`
- `docs/architecture/voice-notes-pipeline-v2.md`

---

### Phase 4: Claims Extraction (4 days)
**File**: `phases/PHASE4_PRD.json`
**Stories**: US-VN-015 to US-VN-016 (2 stories)
**Dependencies**: Phase 3 complete (needs artifacts/transcripts tables)

**Context Files**:
- `context/MAIN_CONTEXT.md`
- `context/PHASE3_V2_MIGRATION.md`
- `docs/architecture/voice-notes-pipeline-v2.md`

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
│   └── PHASE3_V2_MIGRATION.md       # Phases 3-6 implementation guide
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
- [ ] Phase 2: Coach Quick Review Microsite (7-9 days) 🟢 IN PROGRESS
- [ ] Phase 3: v2 Artifacts Foundation (3 days)
- [ ] Phase 4: Claims Extraction (4 days)
- [ ] Phase 5: Entity Resolution & Disambiguation (4 days)
- [ ] Phase 6: Drafts & Confirmation Workflow (5 days)

**Current Phase**: Phase 2 🟢
**Overall Progress**: 29% (6/21 stories complete)
**Phase 1**: Complete (US-VN-001 to US-VN-006, 349 tests passing)

---

## Questions or Issues?

Refer to:
1. **Main Context**: `context/MAIN_CONTEXT.md`
2. **Phase Guide**: Specific phase context file
3. **Validation Reports**: `validation/` directory
4. **Master PRD**: `PRD.json` (complete reference)

---

**Ready to start? Begin with Phase 1! 🚀**

Read `phases/PHASE1_PRD.json` and `context/PHASE1_QUALITY_GATES.md` to begin.
