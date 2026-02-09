# Voice Gateways v2 - Phase PRD Files

This directory contains individual PRD files for each phase of the Voice Gateways v2 project.

## Phase Files

- **PHASE1_PRD.json** - Quality Gates & Fuzzy Matching (2.5 days, 6 stories)
- **PHASE2_PRD.json** - Mobile Quick Review UI (5-7 days, 6 stories)
- **PHASE3_PRD.json** - v2 Artifacts Foundation (3 days, 2 stories)
- **PHASE4_PRD.json** - Claims Extraction (4 days, 2 stories)
- **PHASE5_PRD.json** - Entity Resolution & Disambiguation (4 days, 2 stories)
- **PHASE6_PRD.json** - Drafts & Confirmation Workflow (5 days, 3 stories)

## How to Use

Each phase file contains:
- `stories` - User stories for that phase only
- `contextFiles` - Required reading before starting the phase
- `checklist` - Phase-specific checklist (Phase 1 only has this)
- `successCriteria` - What defines completion of the phase
- `executionGuidance` - How to execute the phase (Phase 1 has parallel streams)

### For Ralph:
1. Start with PHASE1_PRD.json
2. Read all contextFiles listed
3. Execute stories in order (or in parallel for Phase 1)
4. Complete checklist items
5. Verify success criteria met
6. Move to next phase

## Phase Dependencies

- Phase 1: No dependencies (start here)
- Phase 2: Requires Phase 1 complete (fuzzy matching integration)
- Phase 3: Requires Phase 2 complete (foundation for v2)
- Phase 4: Requires Phase 3 complete (artifacts/transcripts tables)
- Phase 5: Requires Phase 4 complete (claims for resolution)
- Phase 6: Requires Phase 5 complete (resolved entities for drafts)

## Master PRD

The complete PRD with all 21 stories is in:
- `../PRD.json` (master copy, 21 stories across all phases)

## Validation

All phase files have been validated:
- Story count: 21 total across all phases ✅
- No duplicate story IDs ✅
- All dependencies valid ✅
- Context files exist ✅
- Duration estimates accurate ✅

**Status**: Ready for execution
**Total Duration**: 25-30 days (6 phases)
