# Phase 7.3 Run 2 Ready - Complete Remaining Stories

**Date**: 2026-01-26 12:15
**Status**: ✅ READY
**Branch**: `ralph/coach-insights-auto-apply-p7-phase3`

---

## Summary: 3 of 5 Stories Complete

### ✅ Completed in Run 1 (11:41-12:05)

**US-009.5: Automatic Triggering** (commit c1fccbd)
- **Lines**: 166 added across 3 files
- **Implementation**: Automatic auto-apply in buildInsights AI action
- **Result**: Insights auto-apply WITHOUT manual "Apply All" button ✅
- **Verified**: Real working code

**US-010: Category Preferences Mutation** (commit 00c4595)
- **Lines**: 41 added to coachTrustLevels.ts
- **Implementation**: setInsightAutoApplyPreferences mutation
- **Result**: Backend complete for per-category control ✅
- **Verified**: Real working code

**US-012: Adaptive Thresholds** (commit aadd40c)
- **Lines**: 106 added (cron + mutation)
- **Implementation**: Daily threshold adjustment based on undo patterns
- **Result**: AI adapts to each coach's accuracy ✅
- **Verified**: Real working code

### ⏳ Remaining Work (2 stories)

**US-011: Category Preferences UI**
- **Status**: FAILED in Run 1 - needs complete rewrite
- **Problem**: Ralph hit linter conflicts, only committed API changes (df9c2c2)
- **Reverted**: Broken commit reverted in d3d4f1a
- **What's needed**: Settings tab in insights-tab.tsx with 4 category checkboxes

**US-013: Undo Analytics**
- **Status**: NOT STARTED
- **What's needed**: getUndoReasonStats query to analyze undo patterns

---

## What Was Done to Prepare Run 2

### 1. Archived Run 1 Progress ✅
- Location: `scripts/ralph/archive/2026-01-26-p7-phase3-run1/`
- Saved: progress.txt, prd.json, commits.txt

### 2. Updated PRD ✅
- File: `scripts/ralph/prd.json`
- Marked complete: US-009.5, US-010, US-012 (passes: true)
- Still pending: US-011, US-013 (passes: false)

### 3. Reset progress.txt ✅
- File: `scripts/ralph/progress.txt`
- Documents Run 1 completion
- Provides detailed guidance for US-011 and US-013
- Includes learnings from US-011 failure (linter conflicts)

### 4. Cleaned Working Directory ✅
- All uncommitted agent tracking files removed
- Clean git status (only untracked files)
- Ready for fresh Ralph run

### 5. Reverted Broken Commit ✅
- Commit df9c2c2 (US-011 broken) reverted in d3d4f1a
- Only had generated API changes, no UI code

---

## US-011: What Ralph Needs to Build

### File to Edit
`apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`

### Requirements
1. **Add third tab**: "Settings" (alongside "Pending Review" and "Auto-Applied")
2. **Settings tab content**:
   - Section header: "Auto-Apply Category Preferences"
   - 4 checkboxes: skills, attendance, goals, performance
   - Each checkbox calls setInsightAutoApplyPreferences mutation
   - Toast notification on successful update
   - Safety note: "Injury and medical insights always require manual review"
   - Load current preferences from getCoachTrustLevel query
3. **Use shadcn/ui components**: Checkbox, Tabs

### Critical Learnings from Run 1
- **Problem**: Ralph made 19 Edit attempts, linter kept modifying file
- **Recommendation**: Use Write tool to replace entire file OR very small atomic edits
- **File size**: 1934 lines (large file)

---

## US-013: What Ralph Needs to Build

### File to Create
New query in `packages/backend/convex/models/voiceNoteInsights.ts`

### Requirements
1. **Query name**: getUndoReasonStats
2. **Args**:
   - organizationId (optional)
   - timeframeDays (optional, default 30)
3. **Returns**:
   - total count
   - breakdown by reason (with percentages)
   - top 10 most recent undone insights
4. **Logic**:
   - Query autoAppliedInsights where undoneAt exists
   - Group by undoReason
   - Calculate percentages

---

## How to Execute Run 2

### Commands
```bash
# Start agents (if not running)
./scripts/ralph/agents/start-all.sh

# Start Ralph (10 iterations should be enough for 2 stories)
./scripts/ralph/ralph.sh 10
```

### What Ralph Will Do
1. Read progress.txt (has all context from Run 1)
2. Pick US-011 first (UI for category preferences)
3. Implement Settings tab with checkboxes
4. Commit US-011 when passing
5. Move to US-013 (undo analytics query)
6. Commit US-013 when passing
7. Report COMPLETE when both done

---

## Success Criteria

### US-011 Complete When
- ✅ Settings tab exists in insights-tab.tsx
- ✅ 4 category checkboxes render correctly
- ✅ Checkboxes call setInsightAutoApplyPreferences mutation
- ✅ Current preferences load from getCoachTrustLevel
- ✅ Toast notifications work
- ✅ Type check passes
- ✅ Browser verification passes

### US-013 Complete When
- ✅ getUndoReasonStats query exists
- ✅ Returns correct structure (total, byReason, topInsights)
- ✅ Calculates percentages correctly
- ✅ Type check passes
- ✅ Codegen succeeds

---

## Commit History After Run 1

```
0d5b9ba docs: Setup Phase 7.3 Run 2 - US-011 and US-013 remaining
d3d4f1a revert: US-011 broken commit - only had API changes, no UI
aadd40c feat: US-012 - Implement adaptive confidence threshold (✅ COMPLETE)
df9c2c2 feat: US-011 - Add category preference controls (❌ BROKEN - reverted)
00c4595 feat: US-010 - Add setInsightAutoApplyPreferences mutation (✅ COMPLETE)
c1fccbd feat: US-009.5 - Implement automatic triggering (✅ COMPLETE)
```

---

## Files Ralph Will Modify

### For US-011
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`

### For US-013
- `packages/backend/convex/models/voiceNoteInsights.ts`

---

## Current State

- ✅ Branch: ralph/coach-insights-auto-apply-p7-phase3
- ✅ PRD: Updated with 3 stories complete
- ✅ Progress: Reset for remaining work
- ✅ Working directory: Clean
- ✅ No work lost: All completed stories safely committed

**Ready to execute!**

---

## Quick Start

```bash
# Start agents
./scripts/ralph/agents/start-all.sh

# Start Ralph
./scripts/ralph/ralph.sh 10
```

Ralph will pick up from progress.txt and complete the remaining 2 stories.
