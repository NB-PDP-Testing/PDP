# Phase 7.3 Ready to Execute - Learning Loop + Automatic Triggering

**Date**: 2026-01-26
**Status**: ✅ READY
**Branch**: `ralph/coach-insights-auto-apply-p7-phase3` ✅ Created

---

## What's Been Set Up

### 1. Phase 7.3 PRD Created ✅

**File**: `scripts/ralph/prds/p7-phase3-learning-loop.prd.json`

**Content**:
- Project: P7 Phase 3 - Learning Loop with Automatic Triggering
- Branch: `ralph/coach-insights-auto-apply-p7-phase3`
- Stories: 5 total (US-009.5, US-010, US-011, US-012, US-013)

**Stories**:
1. **US-009.5**: Automatic triggering (CRITICAL FIRST) - Fixes Phase 7.2 gap
2. **US-010**: Category preferences mutation
3. **US-011**: Category preferences UI
4. **US-012**: Adaptive confidence thresholds (cron job)
5. **US-013**: Undo reason analytics

### 2. Main PRD Updated ✅

**File**: `scripts/ralph/prd.json`

Copied Phase 7.3 PRD to main prd.json (Ralph reads this file).

### 3. Progress Tracking Reset ✅

**File**: `scripts/ralph/progress.txt`

Fresh progress file for Phase 7.3 with:
- Story status table
- CRITICAL note: US-009.5 must be first
- Agent instructions for all 4 monitoring agents
- Prerequisites from Phase 7.1 & 7.2
- 3 implementation options for US-009.5
- Critical learnings documented

### 4. Agent Feedback Updated ✅

**File**: `scripts/ralph/agents/output/feedback.md`

Updated with Phase 7.3 context:
- CRITICAL warning about US-009.5 first
- wouldAutoApply calculation with category check
- Safety guardrails
- Agent-specific instructions

### 5. Branch Created ✅

**Preflight ran successfully**:
- Branch: `ralph/coach-insights-auto-apply-p7-phase3`
- Base: `ralph/coach-insights-auto-apply-p7-phase2`
- Status: Ready for Ralph execution

---

## Critical Information

### 🚨 Phase 7.2 Gap Discovery

**Problem**: Auto-apply requires manual "Apply All" button
- Mutation EXISTS and works ✅
- UI EXISTS and works ✅
- Automatic TRIGGERING missing ❌

**Solution**: US-009.5 (first story in Phase 7.3)
- Implements automatic triggering when insights created
- Three implementation options (A, B, or C)
- **MUST be done before other Phase 7.3 stories**

### Why US-009.5 is Critical

**Dependency Chain**:
1. US-010/011 (Category preferences) need auto-apply to happen automatically
2. US-012 (Adaptive thresholds) needs undo data from auto-applied insights
3. US-013 (Undo analytics) needs auto-apply generating data

**Without US-009.5**: Phase 7.3 features don't work properly

---

## Implementation Options for US-009.5

### Option A: AI Action Integration (RECOMMENDED)
**File**: `packages/backend/convex/actions/voiceNotes.ts`
- Modify `buildInsights` action
- After insights created, check eligibility and auto-apply
- **Pros**: Immediate triggering, most elegant
- **Cons**: Modifies existing action file

### Option B: Scheduler in Mutation
**File**: `packages/backend/convex/models/voiceNoteInsights.ts`
- Use `ctx.scheduler.runAfter(0, ...)` after insight created
- **Pros**: Cleaner separation of concerns
- **Cons**: Near-immediate (milliseconds delay)

### Option C: Scheduled Cron
**File**: `packages/backend/convex/crons.ts`
- Run every 5 minutes to scan pending insights
- **Pros**: Simplest implementation
- **Cons**: 5-minute delay (not immediate)

**Ralph will choose** based on code structure and PRD guidance

---

## How to Execute Phase 7.3

### Quick Start

```bash
# Preflight already ran - branch created ✅

# Step 1: Start monitoring agents
./scripts/ralph/agents/start-all.sh

# Step 2: Start Ralph (20 iterations)
./scripts/ralph/ralph.sh 20
```

### What Ralph Will Build

**US-009.5: Automatic Triggering** (Priority 1)
- Automatic call to `autoApplyInsight` when eligible insights created
- No manual "Apply All" button needed
- Logging for debugging
- Error handling without crashing

**US-010: Category Preferences Mutation**
- `setInsightAutoApplyPreferences` mutation
- Updates `insightAutoApplyPreferences` field in coachTrustLevels
- Default all to false (opt-in)

**US-011: Category Preferences UI**
- Settings tab with checkboxes
- Skills, Attendance, Goals, Performance options
- Toast notifications on change
- Persistence across page refresh

**US-012: Adaptive Thresholds**
- Daily cron job at 2am UTC
- Adjusts thresholds based on undo patterns
- < 3% undo rate → lower threshold (more aggressive)
- > 10% undo rate → raise threshold (more conservative)
- Bounded 0.6-0.9

**US-013: Undo Analytics**
- `getUndoReasonStats` query
- Aggregates undo reasons with percentages
- Optional CSV export
- Admin visibility

---

## Prerequisites Verified ✅

**Phase 7.1 Complete**:
- ✅ Preview mode (5 stories)
- ✅ wouldAutoApply calculation
- ✅ Confidence visualization
- ✅ Preview tracking

**Phase 7.2 Complete**:
- ✅ autoApplyInsight mutation
- ✅ undoAutoAppliedInsight mutation
- ✅ Auto-Applied tab UI
- ❌ **GAP**: Automatic triggering (will be US-009.5)

**Infrastructure Ready**:
- ✅ voiceNoteInsights table (40+ insights)
- ✅ autoAppliedInsights audit trail
- ✅ coachTrustLevels with insightAutoApplyPreferences field (schema ready)
- ✅ AI confidence scoring operational
- ✅ Trust level system at Level 2+

---

## Success Criteria

**All must pass**:
- ✅ US-009.5: Auto-apply happens WITHOUT manual action
- ✅ US-010/011: Category preferences control auto-apply
- ✅ US-012: Thresholds adapt based on undo patterns
- ✅ US-013: Undo reasons collected and analyzable
- ✅ Type checks pass
- ✅ Codegen succeeds
- ✅ No new lint errors
- ✅ All safety guardrails maintained
- ✅ Integration test: Voice note → Auto-apply → Undo → Stats

---

## Testing After Completion

### Critical Test for US-009.5
1. Create voice note about player skill
2. Wait for AI processing
3. **VERIFY**: Insight auto-applies WITHOUT clicking "Apply All"
4. **VERIFY**: Appears in Auto-Applied tab immediately
5. **VERIFY**: Audit trail created
6. **VERIFY**: Player profile updated

### Other Tests
- Toggle category preferences → Verify auto-apply respects settings
- Create high undo rate → Verify threshold increases
- Create low undo rate → Verify threshold decreases
- Undo insights → Verify analytics aggregate correctly

**Full testing guide**: Will be created after Ralph completes

---

## Files Created for Phase 7.3

1. ✅ `scripts/ralph/prds/p7-phase3-learning-loop.prd.json` - Phase 7.3 PRD
2. ✅ `scripts/ralph/prd.json` - Main PRD (copied from Phase 7.3 PRD)
3. ✅ `scripts/ralph/progress.txt` - Fresh progress tracking
4. ✅ `scripts/ralph/agents/output/feedback.md` - Updated with Phase 7.3 context
5. ✅ `scripts/ralph/P7_PHASE3_READY.md` - This file (summary)
6. ✅ Branch created: `ralph/coach-insights-auto-apply-p7-phase3`

---

## Reference Documentation

**From Phase 7.2**:
- `scripts/ralph/P7_PHASE2_COMPLETION_REPORT.md` - What was built
- `scripts/ralph/P7_PHASE2_GAP_ANALYSIS.md` - Why US-009.5 is needed
- `scripts/ralph/P7_PHASE2_TESTING_GUIDE.md` - Testing patterns

**From Phase 7.1**:
- `scripts/ralph/P7_PHASE1_TESTING_GUIDE.md` - Preview mode tests
- `scripts/ralph/P7_PHASE1_COMPLETION_REPORT.md` - What was built

**General**:
- `scripts/ralph/P7_RALPH_CONTEXT.md` - P5/P6 patterns (800+ lines)
- `scripts/ralph/BRANCH_ISSUE_ANALYSIS.md` - Branch creation fix

---

## Current Status

- ✅ Branch: `ralph/coach-insights-auto-apply-p7-phase3` (created and active)
- ✅ PRD: Configured for Phase 7.3 (5 stories)
- ✅ Progress: Reset and ready for Ralph
- ✅ Agents: Feedback updated with Phase 7.3 context
- ✅ Preflight: Tested and working

---

## Ready to Execute

**Commands**:
```bash
# Start agents
./scripts/ralph/agents/start-all.sh

# Start Ralph (20 iterations)
./scripts/ralph/ralph.sh 20
```

**Expected Duration**: 2-4 hours (5 stories, one is critical prerequisite)

**Expected Commits**: 5 commits (one per story)

**Story Order** (Ralph MUST do in this order):
1. US-009.5 (automatic triggering) ← **FIRST**
2. US-010 (category preferences mutation)
3. US-011 (category preferences UI)
4. US-012 (adaptive thresholds)
5. US-013 (undo analytics)

---

**Status**: ✅ READY TO EXECUTE

**First Command**: `./scripts/ralph/agents/start-all.sh`

**Critical Note**: US-009.5 must complete before other stories!

---
