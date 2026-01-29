# Phase 7.2 Ready to Execute

**Date**: 2026-01-26
**Status**: ✅ READY
**Branch**: Will create `ralph/coach-insights-auto-apply-p7-phase2`

---

## What's Been Set Up

### 1. Phase 7.2 PRD Created ✅

**File**: `scripts/ralph/prds/p7-phase2-supervised-auto-apply.prd.json`

**Content**:
- Project: P7 Phase 2 - Supervised Auto-Apply
- Branch: `ralph/coach-insights-auto-apply-p7-phase2`
- Stories: US-007, US-008, US-009 (3 stories)
- US-006 marked as prerequisite COMPLETE

**Stories**:
- **US-007**: Auto-apply logic for skill insights
- **US-008**: 1-hour undo window
- **US-009**: Auto-applied insights UI with undo functionality

### 2. Main PRD Updated ✅

**File**: `scripts/ralph/prd.json`

Copied Phase 7.2 PRD to main prd.json (Ralph reads this file).

### 3. Progress Tracking Reset ✅

**File**: `scripts/ralph/progress.txt`

Fresh progress file for Phase 7.2 with:
- Story status table (US-006 COMPLETE, US-007-009 TODO)
- Agent instructions for all 4 monitoring agents
- Prerequisites from Phase 7.1 documented
- Critical learnings from Phase 7.1
- Branch creation issue warning

### 4. Preflight Script Created ✅

**File**: `scripts/ralph/preflight.sh` (executable)

**Purpose**: Fixes the branch creation issue from Phase 7.1

**What it does**:
1. Reads `branchName` from prd.json
2. Checks if you're already on that branch
3. If not, checks if branch exists
4. Creates branch if needed OR switches to existing branch
5. Confirms ready to run Ralph

**Usage**:
```bash
./scripts/ralph/preflight.sh
```

### 5. Execution Guide Created ✅

**File**: `scripts/ralph/P7_PHASE2_EXECUTION_GUIDE.md`

Comprehensive guide with:
- Prerequisites verification
- Branch creation fix documentation
- Step-by-step execution workflow
- What Ralph will build (detailed)
- Testing checklist
- Success criteria
- Rollback plan

---

## Branch Creation Issue - FIXED

### What Went Wrong in Phase 7.1

Ralph's `ralph.sh` script **does not create branches**. During Phase 7.1:
- PRD specified: `ralph/coach-insights-auto-apply-p7-phase1`
- Ralph only recorded the name in `.last-branch` file
- Ralph never executed `git checkout -b` command
- All commits went to base branch: `phase7/prerequisites-insight-auto-apply`

**Root cause**: Lines 42-48 in ralph.sh only record branch name, no git commands

**Full analysis**: See `scripts/ralph/BRANCH_ISSUE_ANALYSIS.md`

### The Fix

Created `preflight.sh` script that handles branch creation/switching BEFORE Ralph runs.

**Workflow**:
```bash
# OLD (Phase 7.1) - Branch not created
npm run ralph  # ❌ Commits went to wrong branch

# NEW (Phase 7.2) - Preflight handles branch
./scripts/ralph/preflight.sh  # ✅ Creates/switches to correct branch
npm run ralph                  # ✅ Commits go to correct branch
```

---

## How to Execute Phase 7.2

### Quick Start

```bash
# Step 1: Run preflight check (creates branch)
./scripts/ralph/preflight.sh

# Step 2: Start monitoring agents
./scripts/ralph/agents/start-all.sh

# Step 3: Start Ralph (20 = max iterations)
./scripts/ralph/ralph.sh 20
```

### Detailed Steps

1. **Run Preflight** (REQUIRED):
   ```bash
   ./scripts/ralph/preflight.sh
   ```

   Expected output:
   ```
   ✅ PRD found
   📋 Target branch: ralph/coach-insights-auto-apply-p7-phase2
   🌿 Creating new branch...
   ✅ Created and switched to new branch
   Ready to run Ralph!
   ```

2. **Verify Branch**:
   ```bash
   git branch --show-current
   # Should output: ralph/coach-insights-auto-apply-p7-phase2
   ```

3. **Start Agents**:
   ```bash
   ./scripts/ralph/agents/start-all.sh
   ```

   Starts:
   - Documenter
   - PRD Auditor
   - Quality Monitor
   - Test Runner

4. **Start Ralph** (with max 20 iterations):
   ```bash
   ./scripts/ralph/ralph.sh 20
   ```

   Ralph will execute US-007, US-008, US-009

---

## What Ralph Will Build

### US-007: Auto-Apply Mutation

**File**: `packages/backend/convex/models/voiceNoteInsights.ts`

Creates `autoApplyInsight` mutation that:
- Validates trust level >= 2
- Validates confidence >= threshold
- Validates category === 'skill' (Phase 7.2 only)
- Updates player profile with new skill rating
- Creates audit record in autoAppliedInsights table
- Marks insight as applied

### US-008: Undo Mutation

**File**: `packages/backend/convex/models/voiceNoteInsights.ts`

Creates `undoAutoAppliedInsight` mutation that:
- Validates 1-hour window (3600000ms)
- Validates coach ownership
- Reverts player profile to previousValue
- Marks audit record as undone with reason
- Reverts insight status to pending

### US-009: Auto-Applied UI

**File**: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`

Adds:
- New query: `getAutoAppliedInsights`
- New tab: "Auto-Applied"
- Auto-applied insight cards with:
  - Green badge "✓ Auto-Applied"
  - Time applied "23 minutes ago"
  - Change display "Passing: 3 → 4"
  - Undo button (enabled if within 1 hour)
  - View Profile button
- Undo confirmation dialog
- Empty state for no auto-applied insights

---

## Prerequisites Verified

**Phase 7.1 Complete**:
- ✅ US-001: insightPreviewModeStats schema fields
- ✅ US-002: wouldAutoApply calculation
- ✅ US-003: Confidence visualization
- ✅ US-004: Preview mode badge
- ✅ US-005: Preview tracking

**Infrastructure Ready**:
- ✅ US-006: autoAppliedInsights audit trail table
- ✅ voiceNoteInsights table with 40 insights
- ✅ coachTrustLevels with insight fields
- ✅ AI confidence scoring (0.0-1.0)
- ✅ Trust level system operational

**Git Clean**:
- ✅ Current branch: `phase7/prerequisites-insight-auto-apply`
- ✅ Phase 7.1 commits: 210c5b0 through 32c741c
- ✅ No uncommitted changes
- ✅ Ready to create Phase 7.2 branch

---

## Testing After Completion

### Automated Checks

```bash
npm run check-types    # Type check
npx ultracite fix      # Lint
npx -w packages/backend convex codegen  # Codegen
```

### Manual Tests

1. Create high-confidence skill insight at Level 2+
2. Verify auto-apply happens automatically
3. Check audit record created
4. Check player profile updated
5. Navigate to Auto-Applied tab
6. Verify insight shows with green badge
7. Click Undo button
8. Verify player profile reverted
9. Verify insight back to pending

**Full testing guide**: Will be created after Ralph completes

---

## Success Criteria

**Branch**:
- ✅ All commits on `ralph/coach-insights-auto-apply-p7-phase2`
- ✅ No commits on base branch

**Code Quality**:
- ✅ Type check passes
- ✅ Lint passes
- ✅ Codegen succeeds
- ✅ No console errors
- ✅ No Convex errors

**Functionality**:
- ✅ Auto-apply only for Level 2+ coaches
- ✅ Auto-apply only for skills category
- ✅ Undo works within 1 hour
- ✅ Undo fails after 1 hour
- ✅ Audit trail complete

**Safety**:
- ✅ Injury/medical never auto-apply
- ✅ Low trust cannot auto-apply
- ✅ Low confidence does not auto-apply

---

## Files Created for Phase 7.2

1. ✅ `scripts/ralph/prds/p7-phase2-supervised-auto-apply.prd.json` - Phase 7.2 PRD
2. ✅ `scripts/ralph/prd.json` - Main PRD (copied from Phase 7.2 PRD)
3. ✅ `scripts/ralph/progress.txt` - Fresh progress tracking
4. ✅ `scripts/ralph/preflight.sh` - Branch creation fix (executable)
5. ✅ `scripts/ralph/P7_PHASE2_EXECUTION_GUIDE.md` - Detailed execution guide
6. ✅ `scripts/ralph/P7_PHASE2_READY.md` - This file (summary)

---

## Reference Documentation

**From Phase 7.1**:
- `scripts/ralph/BRANCH_ISSUE_ANALYSIS.md` - Why Ralph didn't create branch
- `scripts/ralph/P7_PHASE1_TESTING_GUIDE.md` - Testing patterns
- `scripts/ralph/P7_PHASE1_COMPLETION_REPORT.md` - What was built
- `scripts/ralph/P7_RALPH_CONTEXT.md` - P5/P6 patterns for Ralph

**For Phase 7.2**:
- `scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json` - Full Phase 7 PRD
- `scripts/ralph/prds/p7-phase2-supervised-auto-apply.prd.json` - Phase 7.2 specific
- `scripts/ralph/P7_PHASE2_EXECUTION_GUIDE.md` - How to execute

---

## Next Steps

1. **Review this summary** - Ensure everything looks correct
2. **Run preflight check** - `./scripts/ralph/preflight.sh` (already done!)
3. **Start agents** - `./scripts/ralph/agents/start-all.sh`
4. **Start Ralph** - `./scripts/ralph/ralph.sh 20`
5. **Monitor progress** - Watch agent logs and Ralph's output
6. **Test after completion** - Follow testing guide
7. **Document results** - Create completion report

---

## Questions?

- **How does preflight.sh work?** - See `scripts/ralph/P7_PHASE2_EXECUTION_GUIDE.md` section "Branch Creation Fix"
- **Why did Phase 7.1 use wrong branch?** - See `scripts/ralph/BRANCH_ISSUE_ANALYSIS.md`
- **What does Phase 7.2 build?** - See `scripts/ralph/P7_PHASE2_EXECUTION_GUIDE.md` section "What Ralph Will Build"
- **How to test after completion?** - Testing guide will be created after Ralph completes

---

**Status**: ✅ READY TO EXECUTE

**First Command**: `./scripts/ralph/preflight.sh`

---
