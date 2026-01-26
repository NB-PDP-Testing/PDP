# Phase 7.2 Execution Guide - Supervised Auto-Apply

**Date**: 2026-01-26
**Phase**: 7.2 - Supervised Auto-Apply for Insight Automation
**Branch**: `ralph/coach-insights-auto-apply-p7-phase2`
**Stories**: US-007, US-008, US-009 (3 stories)

---

## Overview

Phase 7.2 implements actual auto-apply for skill insights with 1-hour undo window and full audit trail. This mirrors P5 Phase 2 (supervised auto-approve for parent summaries) but for player profile updates.

### What Gets Built

1. **US-007: Auto-Apply Logic** - Mutation that automatically applies high-confidence skill insights to player profiles
2. **US-008: Undo Window** - 1-hour rollback capability if AI makes a mistake
3. **US-009: Auto-Applied UI** - Tab showing all auto-applied insights with undo buttons

### Safety Guardrails

- ✅ Level 2+ trust required
- ✅ Confidence >= 0.7 threshold
- ✅ Skills only (safest category)
- ✅ NEVER auto-apply injury/medical
- ✅ 1-hour undo window
- ✅ Full audit trail in autoAppliedInsights table

---

## Prerequisites Verified ✅

**Phase 7.1 (Preview Mode)** - ALL COMPLETE:
- ✅ US-001: insightPreviewModeStats schema fields
- ✅ US-002: wouldAutoApply calculation query
- ✅ US-003: Confidence visualization
- ✅ US-004: Preview mode badge
- ✅ US-005: Preview tracking

**Phase 7 Infrastructure** - ALL COMPLETE:
- ✅ US-006: autoAppliedInsights audit trail table
- ✅ voiceNoteInsights table (40 insights migrated)
- ✅ coachTrustLevels with insight fields
- ✅ AI confidence scoring (0.0-1.0 scale)
- ✅ Trust level system operational

**Git Status**:
- ✅ Current branch: `phase7/prerequisites-insight-auto-apply`
- ✅ Phase 7.1 commits: 210c5b0 through 32c741c (5 commits)
- ✅ All changes committed, no uncommitted work
- ✅ Ready to create Phase 7.2 branch

---

## CRITICAL: Branch Creation Fix

### Issue from Phase 7.1

During Phase 7.1, Ralph did NOT create the target branch (`ralph/coach-insights-auto-apply-p7-phase1`). All commits went to the base branch (`phase7/prerequisites-insight-auto-apply`) instead.

**Root cause**: `ralph.sh` only records branch name in `.last-branch` file but never executes `git checkout -b` command.

**Documentation**: See `scripts/ralph/BRANCH_ISSUE_ANALYSIS.md` for full analysis.

### Solution Implemented

Created `scripts/ralph/preflight.sh` script that:
1. Reads `branchName` from `prd.json`
2. Checks if branch exists
3. Creates branch if needed OR switches to existing branch
4. Confirms ready to run Ralph

### Execution Workflow

**NEW WORKFLOW** (with preflight fix):
```bash
# Step 1: Run preflight check (REQUIRED)
./scripts/ralph/preflight.sh

# Step 2: Start monitoring agents
./scripts/ralph/agents/start-all.sh

# Step 3: Start Ralph
./scripts/ralph/ralph.sh 20
```

**OLD WORKFLOW** (manual branch creation):
```bash
# Alternative if preflight.sh doesn't work
git checkout -b ralph/coach-insights-auto-apply-p7-phase2
./scripts/ralph/agents/start-all.sh
./scripts/ralph/ralph.sh 20
```

---

## Pre-Execution Checklist

### 1. Verify PRD Configuration

```bash
# Check PRD is Phase 7.2
jq '.project, .branchName, .userStories | length' scripts/ralph/prd.json

# Expected output:
# "P7 Phase 2 - Supervised Auto-Apply for Insight Automation"
# "ralph/coach-insights-auto-apply-p7-phase2"
# 4
```

### 2. Verify Branch Status

```bash
# Check current branch and status
git branch --show-current
git status

# Expected:
# - On branch: phase7/prerequisites-insight-auto-apply
# - No uncommitted changes
```

### 3. Run Preflight Check

```bash
./scripts/ralph/preflight.sh

# Should output:
# ✅ PRD found
# 📋 Target branch: ralph/coach-insights-auto-apply-p7-phase2
# 🌿 Creating new branch...
# ✅ Created and switched to new branch
# Ready to run Ralph!
```

### 4. Verify New Branch Created

```bash
git branch --show-current

# Expected output:
# ralph/coach-insights-auto-apply-p7-phase2
```

---

## Execution Steps

### Step 1: Run Preflight (REQUIRED)

```bash
./scripts/ralph/preflight.sh
```

**Expected output**:
```
======================================
Ralph Preflight Check
======================================

✅ PRD found: /path/to/scripts/ralph/prd.json
📋 Target branch: ralph/coach-insights-auto-apply-p7-phase2

Current branch: phase7/prerequisites-insight-auto-apply
Need to switch to: ralph/coach-insights-auto-apply-p7-phase2

🌿 Branch doesn't exist, creating...
✅ Created and switched to new branch: ralph/coach-insights-auto-apply-p7-phase2

======================================
Preflight check PASSED
Ready to run Ralph!
======================================

Next steps:
  1. Start monitoring agents: ./scripts/ralph/agents/start-all.sh
  2. Start Ralph: ./scripts/ralph/ralph.sh 20
```

### Step 2: Start Monitoring Agents

```bash
./scripts/ralph/agents/start-all.sh
```

**Agents started**:
- Documenter (docs agent)
- PRD Auditor (compliance agent)
- Quality Monitor (code quality agent)
- Test Runner (validation agent)

### Step 3: Start Ralph

```bash
./scripts/ralph/ralph.sh 20  # 20 = max iterations
```

Ralph will execute stories US-007, US-008, US-009 on the new branch.

**Note**: The `20` parameter sets the maximum number of iterations Ralph will run. Adjust this number if needed based on complexity.

---

## What Ralph Will Build

### US-007: Auto-Apply Logic

**File**: `packages/backend/convex/models/voiceNoteInsights.ts`

**Mutation**: `autoApplyInsight`
- Args: `{ insightId: v.id('voiceNoteInsights') }`
- Validates trust level >= 2, confidence >= threshold, skills only
- Updates player profile with new skill rating
- Creates audit record in autoAppliedInsights table
- Marks insight as applied

**Key logic**:
```typescript
// Validate trust requirements
const effectiveLevel = Math.min(currentLevel, preferredLevel ?? currentLevel);
if (effectiveLevel < 2) return { success: false, message: "Level 2+ required" };
if (confidenceScore < threshold) return { success: false, message: "Low confidence" };
if (category !== 'skill') return { success: false, message: "Skills only" };

// Update player profile
await ctx.db.patch(playerId, {
  skillRatings: { ...skillRatings, [skillName]: newRating }
});

// Create audit trail
const auditId = await ctx.db.insert("autoAppliedInsights", {
  insightId, playerId, coachId, confidenceScore,
  appliedAt: Date.now(),
  changeType: 'skill_rating',
  fieldChanged: skillName,
  previousValue: currentRating.toString(),
  newValue: newRating.toString(),
  autoAppliedByAI: true
});
```

### US-008: Undo Window

**File**: `packages/backend/convex/models/voiceNoteInsights.ts`

**Mutation**: `undoAutoAppliedInsight`
- Args: `{ autoAppliedInsightId: v.id('autoAppliedInsights'), undoReason: v.string() }`
- Validates 1-hour window: `(Date.now() - appliedAt) < 3600000`
- Reverts player profile to previousValue
- Marks audit record as undone with reason
- Reverts insight status to pending

**Key logic**:
```typescript
// Validate undo window
const elapsed = Date.now() - appliedAt;
if (elapsed >= 3600000) {
  return { success: false, message: "Undo window expired (must undo within 1 hour)" };
}

// Revert player profile
await ctx.db.patch(playerId, {
  skillRatings: { ...skillRatings, [fieldChanged]: parseInt(previousValue) }
});

// Mark as undone
await ctx.db.patch(autoAppliedInsightId, {
  undoneAt: Date.now(),
  undoReason
});
```

### US-009: Auto-Applied UI

**File**: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`

**New query**: `getAutoAppliedInsights`
- Returns insights with status='applied' and autoAppliedByAI=true
- Includes audit details (appliedAt, previousValue, newValue, undoneAt)
- Sorted by appliedAt descending

**UI components**:
1. **New tab**: "Auto-Applied" (next to "Pending Review")
2. **Auto-applied insight cards**:
   - Green badge: "✓ Auto-Applied"
   - Time: "Applied 23 minutes ago"
   - Change: "Passing: 3 → 4"
   - Undo button (enabled if within 1 hour)
   - View Profile button
3. **Undo dialog**:
   - Radio options for undo reason
   - Text area for "Other" explanation
   - Calls undoAutoAppliedInsight mutation

---

## Testing After Ralph Completes

### Automated Checks

```bash
# Type check
npm run check-types

# Lint
npx ultracite fix

# Codegen
npx -w packages/backend convex codegen
```

All should pass with no errors.

### Manual Testing

**Test account**: `neil.B@blablablak.com` / `lien1979`

**Test scenarios**:
1. Create high-confidence skill insight at Level 2+
2. Verify insight auto-applies automatically
3. Check autoAppliedInsights audit record created
4. Check player profile updated correctly
5. Navigate to Auto-Applied tab
6. Verify insight appears with green badge
7. Click Undo button
8. Confirm undo with reason
9. Verify player profile reverted
10. Verify insight back in Pending Review tab

**Testing guide**: See `scripts/ralph/P7_PHASE2_TESTING_GUIDE.md` (to be created after Ralph completes)

---

## Expected Commits

Ralph should create these commits:

1. `feat: US-007 - Implement autoApplyInsight mutation with trust validation`
2. `feat: US-008 - Add undoAutoAppliedInsight mutation with 1-hour window`
3. `feat: US-009 - Add Auto-Applied tab and undo UI to insights tab`
4. `chore: Mark all Phase 7.2 stories as complete`

**Branch**: All commits should be on `ralph/coach-insights-auto-apply-p7-phase2`

---

## Known Issues to Watch For

### From Phase 7.1 Experience

1. **Linter auto-removing imports** - Ralph may need to re-add imports multiple times
2. **Wrong query parameters** - Watch for coachId vs organizationId confusion
3. **Missing validators** - Ensure all mutations have proper returns validators
4. **Type imports** - May need to import `Id<"tableName">` types explicitly

### Architecture Considerations

- Phase 7.2 should use voiceNoteInsights TABLE (not embedded array)
- Player profile updates need proper skill rating structure
- Audit trail must capture previousValue before applying newValue
- Undo must properly revert all changes atomically

---

## Success Criteria

**Code quality**:
- ✅ All type checks pass
- ✅ All lints pass
- ✅ Codegen succeeds
- ✅ No console errors
- ✅ No Convex errors

**Functionality**:
- ✅ Auto-apply only works for Level 2+ coaches
- ✅ Auto-apply only works for skills category
- ✅ Auto-apply respects confidence threshold
- ✅ Undo works within 1 hour
- ✅ Undo fails after 1 hour
- ✅ Audit trail captures all fields
- ✅ Player profiles update correctly
- ✅ Player profiles revert correctly on undo

**Safety**:
- ✅ Injury/medical insights NEVER auto-apply
- ✅ Low trust coaches (Level 0/1) cannot auto-apply
- ✅ Low confidence insights do not auto-apply
- ✅ Undo requires coach ownership
- ✅ All changes have audit trail

---

## Rollback Plan

If Phase 7.2 needs to be rolled back:

```bash
# Revert commits (if on wrong branch)
git revert HEAD~3..HEAD

# Or reset to before Phase 7.2
git reset --hard phase7/prerequisites-insight-auto-apply
```

Phase 7.1 will still work - it only displays preview badges, doesn't perform auto-apply.

---

## Post-Execution Tasks

1. ✅ Run automated checks (type, lint, codegen)
2. ✅ Create Phase 7.2 testing guide
3. ✅ Execute manual tests
4. ✅ Collect screenshots
5. ✅ Document any bugs found
6. ✅ Create Phase 7.2 completion report
7. ✅ Setup Phase 7.3 (if continuing)

---

## References

- **Full Phase 7 PRD**: `scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json`
- **Phase 7.2 PRD**: `scripts/ralph/prds/p7-phase2-supervised-auto-apply.prd.json`
- **Branch Issue Analysis**: `scripts/ralph/BRANCH_ISSUE_ANALYSIS.md`
- **Phase 7.1 Testing Guide**: `scripts/ralph/P7_PHASE1_TESTING_GUIDE.md`
- **Phase 7.1 Completion Report**: `scripts/ralph/P7_PHASE1_COMPLETION_REPORT.md`
- **P5 Phase 2 Reference**: Similar supervised auto-approve for parent summaries
- **Ralph Context**: `scripts/ralph/P7_RALPH_CONTEXT.md`

---

**Status**: READY TO EXECUTE

**Preflight Script**: `./scripts/ralph/preflight.sh` ✅ Created and tested

**Next Command**: `./scripts/ralph/preflight.sh`

---
