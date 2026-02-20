# Voice Gateways v2 - PRD Package

**Project**: Voice Enhance Gating-WAPP v2
**Issue**: [#423 - WhatsApp Voice Notes Quality Gates](https://github.com/NB-PDP-Testing/PDP/issues/423)
**Branch**: `feat/voice-gateways-v2`
**Status**: Ready for Phase 1 Execution

---

## 📋 Quick Start (For Ralph)

1. **Read PRD**: Start with `PRD.json` for complete project structure
2. **Review Main Context**: Read `context/MAIN_CONTEXT.md` for concepts and architecture
3. **Phase 1 Details**: Read `context/PHASE1_QUALITY_GATES.md` for implementation guidance
4. **Check Patterns**: Review `.ruler/voice-notes-validation-patterns.md` for mandatory patterns
5. **Run Quick Actions**: Test scripts in `quick-actions/` directory
6. **Begin Execution**: Start with US-VN-001 (parallel with US-VN-005)

---

## 📁 File Structure

```
scripts/ralph/prds/voice-gateways-v2/
├── README.md                          # This file
├── PRD.json                           # Complete PRD with 18+ user stories
├── context/
│   ├── MAIN_CONTEXT.md               # Project overview, concepts, architecture
│   ├── PHASE1_QUALITY_GATES.md       # Phase 1 implementation guide
│   ├── PHASE2_MOBILE_REVIEW.md       # Phase 2 implementation guide
│   └── PHASE3_V2_MIGRATION.md        # Phases 3-6 implementation guide
├── quick-actions/
│   ├── test-quality-gates.sh        # Test validation functions
│   └── test-fuzzy-matching.sh       # Test Levenshtein algorithm
└── tests/
    └── (UAT test cases will go here)

.ruler/
└── voice-notes-validation-patterns.md  # Mandatory patterns for all phases
```

---

## 🎯 Project Goals

### Problem Statement (Issue #423)

**Current Issues**:
1. ❌ Gibberish messages processed (waste ~5-10% API calls, $50-100/month)
2. ❌ Generic error messages ("Still processing..." doesn't explain what failed)
3. ❌ Poor player matching ("Shawn" doesn't find "Seán", "Neeve" doesn't find "Niamh")
4. ❌ User confusion (coaches don't know if message worked or why it failed)

### Solution: 6-Phase Incremental Approach

| Phase | Name | Duration | Key Deliverables |
|-------|------|----------|------------------|
| **1** | Quality Gates & Fuzzy Matching | 2.5 days | Validation, Levenshtein, specific errors |
| **2** | Mobile Quick Review UI | 5-7 days | Deep links, fuzzy suggestions, mobile UX |
| **3** | v2 Artifacts Foundation | 3 days | New tables, dual-path processing |
| **4** | Claims Extraction | 4 days | Atomic units per player mention |
| **5** | Entity Resolution | 4 days | Disambiguation UI, candidate selection |
| **6** | Drafts & Confirmation | 5 days | WhatsApp commands (CONFIRM/CANCEL) |

**Total**: 25-30 days for complete pipeline v2

---

## 📖 Documentation Hierarchy

### Level 1: PRD & Overview
- **`PRD.json`** - Complete project definition, all user stories, dependencies
- **`context/MAIN_CONTEXT.md`** - Project overview, concepts, success criteria

### Level 2: Phase-Specific Implementation
- **`context/PHASE1_QUALITY_GATES.md`** - Detailed Phase 1 steps
- **`context/PHASE2_MOBILE_REVIEW.md`** - Phase 2 mobile UI (references `docs/features/MOBILE_QUICK_REVIEW_PLAN.md`)
- **`context/PHASE3_V2_MIGRATION.md`** - Phases 3-6 v2 architecture (references `docs/architecture/voice-notes-pipeline-v2.md`)

### Level 3: Patterns & Standards
- **`.ruler/voice-notes-validation-patterns.md`** - Mandatory patterns (MUST FOLLOW)
- **`docs/archive/bug-fixes/ISSUE_423_WHATSAPP_QUALITY_GATES_ANALYSIS.md`** - Detailed analysis

### Level 4: Reference Documentation
- **`docs/features/MOBILE_QUICK_REVIEW_PLAN.md`** - Complete mobile UI design
- **`docs/architecture/voice-notes-pipeline-v2.md`** - Full v2 architecture
- **`docs/architecture/whatsapp-integration-patterns.md`** - WhatsApp best practices
- **`docs/technical/VOICE_NOTES_TECHNICAL_OVERVIEW.md`** - Current implementation

---

## 🚀 Phase 1 Execution Guide

### Parallel Streams (Option C Approach)

**Stream A: Quality Gates** (US-VN-001 to US-VN-004)
- Day 1: Text validation + Transcript validation
- Day 2: Duplicate detection + Enhanced feedback

**Stream B: Fuzzy Matching** (US-VN-005 to US-VN-006)
- Day 1: Levenshtein algorithm + Normalization
- Day 2: findSimilarPlayers query + Context weighting

**Merge**: Day 3 (integration, testing, documentation)

### User Stories

| ID | Title | Effort | Stream |
|----|-------|--------|--------|
| US-VN-001 | Text Message Quality Gate | 0.5 day | A |
| US-VN-002 | Transcript Quality Validation | 0.5 day | A |
| US-VN-003 | Duplicate Message Detection | 0.5 day | A |
| US-VN-004 | Enhanced WhatsApp Feedback | 0.5 day | A |
| US-VN-005 | Levenshtein Fuzzy Matching | 1 day | B |
| US-VN-006 | Find Similar Players Query | 1 day | B |

### Success Criteria (Phase 1)

**Production Ready**:
- ✅ Quality gates reject gibberish
- ✅ Specific error messages (not generic)
- ✅ Duplicate detection (5-min window)
- ✅ Fuzzy matching returns top 5 candidates (similarity > 0.5)
- ✅ Irish names work (Seán, Niamh, O'Brien)
- ✅ All unit tests passing (100% coverage)
- ✅ Type check passes (0 errors)
- ✅ Manual UAT: 18 test cases passing
- ✅ Documentation complete

---

## 🧪 Testing Strategy

### Unit Tests (Mandatory)

**Files to Create**:
```
packages/backend/convex/__tests__/
├── messageValidation.test.ts     # US-VN-001, US-VN-002
├── duplicateDetection.test.ts    # US-VN-003
├── whatsappFeedback.test.ts      # US-VN-004
├── stringMatching.test.ts        # US-VN-005
└── playerMatching.test.ts        # US-VN-006
```

**Run Tests**:
```bash
npm test -- __tests__/messageValidation.test.ts
npm test -- __tests__/stringMatching.test.ts
npm test -- __tests__/playerMatching.test.ts
```

### Quick Actions

**Test Validation**:
```bash
./scripts/ralph/prds/voice-gateways-v2/quick-actions/test-quality-gates.sh
```

**Test Fuzzy Matching**:
```bash
./scripts/ralph/prds/voice-gateways-v2/quick-actions/test-fuzzy-matching.sh
```

### Manual UAT (18 Test Cases)

**Quality Gates (QG-001 to QG-008)**:
- Empty, short, gibberish, spam, duplicate, valid messages

**Feedback Messages (FB-001 to FB-005)**:
- Transcription failed, no players, success, unclear, multi-org

**Fuzzy Matching (FM-001 to FM-005)**:
- Irish names, typos, prefixes, exact matches, no matches

**Test Account**: `neil.B@blablablak.com` / `lien1979`

---

## ⚙️ Feature Flags

### Multi-Layered Control (Flexible)

```
Priority 1: platformConfig.voice_notes_v2_enabled (global)
         ↓
Priority 2: organization.settings.voiceNotesVersion (per-org)
         ↓
Priority 3: member.betaFeatures[] includes "voice_notes_v2" (per-coach)
         ↓
Priority 4: PostHog flag "voice-notes-v2-rollout" (A/B test)
         ↓
Default: v1 (safe fallback)
```

**Enable v2 for Testing**:
```typescript
// Option 1: Platform config (all users)
await ctx.db.insert("platformConfig", {
  key: "voice_notes_v2_enabled",
  value: true
});

// Option 2: Per-org (specific club)
await ctx.db.patch(orgId, {
  settings: { voiceNotesVersion: "v2" }
});

// Option 3: Per-coach (beta tester)
await ctx.db.patch(coachMemberId, {
  betaFeatures: ["voice_notes_v2"]
});
```

---

## 📊 Performance Targets

| Operation | Target | Current (v1) |
|-----------|--------|--------------|
| Text validation | < 1ms | N/A (not implemented) |
| Transcript validation | < 5ms | N/A (not implemented) |
| Duplicate check | < 10ms | N/A (not implemented) |
| Levenshtein calc | < 1ms per pair | N/A |
| Player fuzzy match | < 100ms for 1000 players | N/A |
| Quality gate rejection rate | 5-10% | N/A (all processed) |
| API cost savings | $40-80/month | $0 (no gates) |

---

## 🎨 Mandatory Patterns

**ALWAYS**:
- ✅ Validate early, reject fast (before expensive operations)
- ✅ Specific error messages with suggestions
- ✅ Fuzzy matching for player names (never exact)
- ✅ Normalize strings (lowercase, diacritics, prefixes)
- ✅ Unit test all validation logic (100% coverage)
- ✅ Use composite indexes (never `.filter()` after `.withIndex()`)
- ✅ Batch fetch + Map lookup (avoid N+1 queries)
- ✅ Early return on rejection
- ✅ Better Auth IDs as `v.string()` not `v.id()`

**NEVER**:
- ❌ Process without validation
- ❌ Generic error messages
- ❌ Exact string matching for names
- ❌ Query per item in loop (N+1)
- ❌ Skip unit tests
- ❌ Use `.filter()` after indexed query

**Full Patterns**: See `.ruler/voice-notes-validation-patterns.md`

---

## 🔗 Related Issues & PRs

- **Issue #423**: [GitHub](https://github.com/NB-PDP-Testing/PDP/issues/423)
- **Branch**: `feat/voice-gateways-v2` (to be created)
- **Previous Work**: Phase 9 Week 4 Team Hub (ralph/p9-week4-team-hub)

---

## 📞 Support & Questions

### Documentation Questions
- Check `MAIN_CONTEXT.md` for high-level concepts
- Check phase-specific context files for implementation details
- Check `.ruler/voice-notes-validation-patterns.md` for patterns

### Technical Questions
- Levenshtein algorithm: See US-VN-005 in `PHASE1_QUALITY_GATES.md`
- Fuzzy matching: See `MOBILE_QUICK_REVIEW_PLAN.md` lines 62-173
- v2 architecture: See `voice-notes-pipeline-v2.md`

### Testing Questions
- Unit tests: See `PHASE1_QUALITY_GATES.md` test sections
- UAT: See `ISSUE_423_WHATSAPP_QUALITY_GATES_ANALYSIS.md` test cases
- Quick actions: Run scripts in `quick-actions/` directory

---

## ✅ Checklist for Ralph

Before starting Phase 1:
- [ ] Read `PRD.json` completely
- [ ] Read `MAIN_CONTEXT.md` for concepts
- [ ] Read `PHASE1_QUALITY_GATES.md` for implementation steps
- [ ] Review `.ruler/voice-notes-validation-patterns.md` for patterns
- [ ] Understand parallel execution (Stream A + Stream B)
- [ ] Review existing WhatsApp integration (`actions/whatsapp.ts`)
- [ ] Understand feature flag system
- [ ] Set up test environment (WhatsApp test account)

During Phase 1:
- [ ] Follow mandatory patterns from `.ruler/`
- [ ] Write unit tests for all validation functions
- [ ] Test with Irish names (Seán, Niamh, O'Brien, etc.)
- [ ] Run quick action scripts to verify
- [ ] Manual UAT with WhatsApp
- [ ] Type check passes (`npm run check-types`)
- [ ] Document any deviations or issues

After Phase 1:
- [ ] All acceptance criteria met
- [ ] 18 UAT test cases passing
- [ ] Performance targets achieved
- [ ] Documentation updated
- [ ] Commit with proper message
- [ ] Ready for Phase 2

---

## 🎯 Next Steps

1. **Ralph**: Start Phase 1 execution
   - Stream A: US-VN-001 (Text validation)
   - Stream B: US-VN-005 (Levenshtein) - Parallel
2. **Human**: Review progress after Day 1
3. **Merge**: Day 3 - Integrate streams, test, document
4. **Deploy**: Phase 1 to production with feature flags
5. **Begin**: Phase 2 (Mobile Quick Review UI)

---

**Last Updated**: February 4, 2026
**Prepared By**: Claude Code
**For**: Ralph (Automated Project Management System)
