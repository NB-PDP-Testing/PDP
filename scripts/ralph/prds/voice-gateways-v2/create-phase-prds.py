#!/usr/bin/env python3
"""
Create individual phase PRD files from the main PRD.json
Each phase file contains only the stories, checklist, and context for that phase
"""

import json
import sys
from pathlib import Path

prd_path = Path(__file__).parent / "PRD.json"
output_dir = Path(__file__).parent / "phases"

# Create phases directory
output_dir.mkdir(exist_ok=True)

# Load main PRD
try:
    with open(prd_path) as f:
        prd = json.load(f)
    print(f"✅ Loaded PRD.json ({len(prd['userStories'])} stories)")
except Exception as e:
    print(f"❌ Error loading PRD.json: {e}")
    sys.exit(1)

# Phase configurations
phases = [
    {
        "number": 1,
        "name": "Quality Gates & Fuzzy Matching",
        "duration": "2.5 days",
        "story_range": (1, 6),  # US-VN-001 to US-VN-006
        "checklist_key": "phase1Checklist",
        "context_files": [
            "context/MAIN_CONTEXT.md",
            "context/PHASE1_QUALITY_GATES.md",
            ".ruler/voice-notes-validation-patterns.md"
        ]
    },
    {
        "number": 2,
        "name": "Mobile Quick Review UI",
        "duration": "5-7 days",
        "story_range": (7, 12),  # US-VN-007 to US-VN-012
        "checklist_key": None,
        "context_files": [
            "context/MAIN_CONTEXT.md",
            "context/PHASE2_MOBILE_REVIEW.md"
        ]
    },
    {
        "number": 3,
        "name": "v2 Artifacts Foundation",
        "duration": "3 days",
        "story_range": (13, 14),  # US-VN-013 to US-VN-014
        "checklist_key": None,
        "context_files": [
            "context/MAIN_CONTEXT.md",
            "context/PHASE3_V2_MIGRATION.md",
            "docs/architecture/voice-notes-pipeline-v2.md"
        ]
    },
    {
        "number": 4,
        "name": "Claims Extraction",
        "duration": "4 days",
        "story_range": (15, 16),  # US-VN-015 to US-VN-016
        "checklist_key": None,
        "context_files": [
            "context/MAIN_CONTEXT.md",
            "context/PHASE3_V2_MIGRATION.md",
            "docs/architecture/voice-notes-pipeline-v2.md"
        ]
    },
    {
        "number": 5,
        "name": "Entity Resolution & Disambiguation",
        "duration": "4 days",
        "story_range": (17, 18),  # US-VN-017 to US-VN-018
        "checklist_key": None,
        "context_files": [
            "context/MAIN_CONTEXT.md",
            "context/PHASE3_V2_MIGRATION.md",
            "context/PHASE1_QUALITY_GATES.md",  # For fuzzy matching integration
            "docs/architecture/voice-notes-pipeline-v2.md"
        ]
    },
    {
        "number": 6,
        "name": "Drafts & Confirmation Workflow",
        "duration": "5 days",
        "story_range": (19, 21),  # US-VN-019 to US-VN-021
        "checklist_key": None,
        "context_files": [
            "context/MAIN_CONTEXT.md",
            "context/PHASE3_V2_MIGRATION.md",
            "docs/architecture/voice-notes-pipeline-v2.md"
        ]
    }
]

# Create phase PRD files
for phase_config in phases:
    phase_num = phase_config["number"]
    start_num, end_num = phase_config["story_range"]

    # Filter stories for this phase
    phase_stories = [
        s for s in prd['userStories']
        if s['phase'] == phase_num
    ]

    # Verify we got the expected stories
    expected_ids = [f"US-VN-{str(i).zfill(3)}" for i in range(start_num, end_num + 1)]
    actual_ids = [s['id'] for s in phase_stories]

    if actual_ids != expected_ids:
        print(f"⚠️  Phase {phase_num} story mismatch:")
        print(f"   Expected: {expected_ids}")
        print(f"   Actual: {actual_ids}")

    # Build phase PRD
    phase_prd = {
        "phaseNumber": phase_num,
        "phaseName": phase_config["name"],
        "duration": phase_config["duration"],
        "storyCount": len(phase_stories),
        "contextFiles": phase_config["context_files"],
        "stories": phase_stories,
        "successCriteria": prd.get(f"phase{phase_num}SuccessCriteria", {}),
    }

    # Add checklist if exists
    if phase_config["checklist_key"] and phase_config["checklist_key"] in prd:
        phase_prd["checklist"] = prd[phase_config["checklist_key"]]

    # Add phase-specific guidance
    if phase_num == 1:
        phase_prd["executionGuidance"] = {
            "parallelStreams": prd.get("phase1ParallelStreams", {}),
            "streamA": {
                "name": "Quality Gates",
                "duration": "2 days",
                "stories": ["US-VN-001", "US-VN-002", "US-VN-003", "US-VN-004"]
            },
            "streamB": {
                "name": "Fuzzy Matching",
                "duration": "2 days",
                "stories": ["US-VN-005", "US-VN-006"]
            },
            "mergeAndTest": "0.5 day",
            "notes": [
                "Execute Stream A and Stream B in parallel",
                "Both streams can run independently until merge",
                "Final 0.5 day for integration testing and merge"
            ]
        }

    # Save phase PRD
    output_file = output_dir / f"PHASE{phase_num}_PRD.json"
    with open(output_file, 'w') as f:
        json.dump(phase_prd, f, indent=2)

    print(f"✅ Created {output_file.name} ({len(phase_stories)} stories, {phase_config['duration']})")

print(f"\n✅ Created {len(phases)} phase PRD files in {output_dir}/")

# Create README for phases directory
readme_content = """# Voice Gateways v2 - Phase PRD Files

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
"""

readme_file = output_dir / "README.md"
with open(readme_file, 'w') as f:
    f.write(readme_content)

print(f"✅ Created {readme_file.name}")

# Create execution guide for Ralph
execution_guide = """# Ralph Execution Guide - Voice Gateways v2

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

### Phase 1: Quality Gates & Fuzzy Matching (2.5 days) 🟢 START HERE
**File**: `phases/PHASE1_PRD.json`
**Stories**: US-VN-001 to US-VN-006 (6 stories)

**Special Instructions**:
- Execute in PARALLEL:
  - Stream A: US-VN-001, US-VN-002, US-VN-003, US-VN-004 (Quality Gates)
  - Stream B: US-VN-005, US-VN-006 (Fuzzy Matching)
- Final 0.5 day: Merge + Integration Testing

**Context Files**:
- `context/MAIN_CONTEXT.md`
- `context/PHASE1_QUALITY_GATES.md`
- `.ruler/voice-notes-validation-patterns.md`

**Checklist**: 43 items (detailed in PHASE1_PRD.json)

---

### Phase 2: Mobile Quick Review UI (5-7 days)
**File**: `phases/PHASE2_PRD.json`
**Stories**: US-VN-007 to US-VN-012 (6 stories)
**Dependencies**: Phase 1 complete (needs fuzzy matching integration)

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

- [ ] Phase 1: Quality Gates & Fuzzy Matching (2.5 days)
- [ ] Phase 2: Mobile Quick Review UI (5-7 days)
- [ ] Phase 3: v2 Artifacts Foundation (3 days)
- [ ] Phase 4: Claims Extraction (4 days)
- [ ] Phase 5: Entity Resolution & Disambiguation (4 days)
- [ ] Phase 6: Drafts & Confirmation Workflow (5 days)

**Current Phase**: Phase 1 🟢
**Overall Progress**: 0% (0/21 stories complete)
**Estimated Completion**: [Start Date] + 25-30 days

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
"""

guide_file = Path(__file__).parent / "RALPH_EXECUTION_GUIDE.md"
with open(guide_file, 'w') as f:
    f.write(execution_guide)

print(f"✅ Created {guide_file.name}")

print("\n🎉 All phase files created successfully!")
print("\nRalph can now:")
print("1. Read RALPH_EXECUTION_GUIDE.md for overview")
print("2. Start with phases/PHASE1_PRD.json")
print("3. Progress through phases sequentially")
