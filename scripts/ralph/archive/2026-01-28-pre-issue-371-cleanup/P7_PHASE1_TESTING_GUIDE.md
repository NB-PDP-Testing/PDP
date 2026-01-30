# Phase 7.1 - Complete Testing Guide

**Date**: 2026-01-26
**Branch**: `phase7/prerequisites-insight-auto-apply`
**Status**: ✅ Fixed and Ready for Testing

---

## Fixes Applied

1. **Voice Note Confidence Validator** (commit 2acf345)
   - Added missing `confidence` field to `insightValidator`
   - Allows AI to save insights with confidence scores

2. **Preview Tracking Integration** (commit 210c5b0)
   - Added preview tracking to `updateInsightStatus` mutation
   - Works with embedded array insights (current architecture)
   - Tracks wouldAutoApply predictions and agreement rate

---

## What Phase 7.1 Built

### US-001: Schema Fields ✅
**Status**: Complete (prerequisite)
**What it does**: Schema extended with insight preview tracking fields
**Location**: `coachTrustLevels` table

**Fields added**:
- `insightPreviewModeStats` (wouldAutoApplyInsights, coachAppliedThose, coachDismissedThose, agreementRate)
- `insightConfidenceThreshold` (default 0.7)
- `insightAutoApplyPreferences` (skills, attendance, goals, performance)

### US-002: wouldAutoApply Calculation ✅
**Status**: Complete
**What it does**: Calculates which insights AI would auto-apply at current trust level
**Location**: `insights-tab.tsx` (lines 484-507)

**Logic**:
```typescript
wouldAutoApply =
  category !== "injury" &&
  category !== "medical" &&
  effectiveLevel >= 2 &&
  confidenceScore >= threshold (0.7)
```

### US-003: Confidence Visualization ✅
**Status**: Complete
**What it does**: Shows AI confidence score with color-coded progress bar
**Location**: `insights-tab.tsx` (lines 692-713)

**Display**:
- Progress bar (0-100%)
- Percentage text: "AI Confidence: 85%"
- Color coding:
  - Red: <60% (risky)
  - Amber: 60-79% (moderate)
  - Green: 80%+ (safe)

### US-004: Preview Mode Badge ✅
**Status**: Complete
**What it does**: Shows what AI would do with each insight
**Location**: `insights-tab.tsx` (lines 714-728)

**Display**:
- Blue badge with Sparkles icon: "AI would auto-apply this at Level 2+"
  - Shows for `wouldAutoApply = true`
- Text: "Requires manual review"
  - Shows for `wouldAutoApply = false`
  - Always shows for injury/medical (safety)

### US-005: Preview Tracking ✅
**Status**: Complete
**What it does**: Tracks coach agreement with AI predictions
**Location**: `voiceNotes.ts` `updateInsightStatus` mutation (lines 1057-1110)

**Tracking logic**:
- When coach applies/dismisses insight:
  - Check if `wouldAutoApply` was true
  - If yes, increment `wouldAutoApplyInsights` counter
  - If applied: increment `coachAppliedThose`
  - If dismissed: increment `coachDismissedThose`
  - Calculate `agreementRate = coachAppliedThose / wouldAutoApplyInsights`
  - After 20 insights: set `completedAt` timestamp

---

## Manual Testing Checklist

### Test 1: Visual Verification (5 min)
**URL**: `http://localhost:3000/orgs/{orgId}/coach/voice-notes`
**Login**: `neil.B@blablablak.com` / `lien1979`

**Steps**:
- [ ] Click "Insights" tab
- [ ] Verify insights are visible
- [ ] Check confidence bars appear on insights
- [ ] Verify percentages display (e.g., "AI Confidence: 85%")

**Verify color coding**:
- [ ] Find insight with <60% confidence → Should have RED bar
- [ ] Find insight with 60-79% confidence → Should have AMBER bar
- [ ] Find insight with 80%+ confidence → Should have GREEN bar

**Screenshot**: Take screenshot of insights with confidence bars

---

### Test 2: Preview Badge Display (3 min)
On the same Insights tab:

**Check high-confidence skills**:
- [ ] High-confidence skill insights show blue badge
- [ ] Badge text: "AI would auto-apply this at Level 2+"
- [ ] Badge has Sparkles icon (✨)

**Check special categories**:
- [ ] Injury insights show "Requires manual review" (NO badge)
- [ ] Medical insights show "Requires manual review" (NO badge)
- [ ] Low-confidence insights show "Requires manual review"

**Expected**: Only non-injury/medical insights with confidence >= 70% get the blue badge

---

### Test 3: Preview Tracking - Apply Insights (5 min)

**Step 1: Initial State**
- [ ] Open Convex dashboard: https://dashboard.convex.dev
- [ ] Navigate to Data → `coachTrustLevels` table
- [ ] Find your coach record (search by user ID or filter)
- [ ] Note current `insightPreviewModeStats` values (or null if not started)

**Step 2: Apply 5 Insights**
- [ ] Return to voice notes Insights tab
- [ ] Find 5 insights with "AI would auto-apply" blue badge
- [ ] Click "Apply" on each one
- [ ] Verify each shows success message

**Step 3: Verify Tracking**
- [ ] Return to Convex dashboard → `coachTrustLevels`
- [ ] Refresh the table
- [ ] Check `insightPreviewModeStats`:
  ```json
  {
    "wouldAutoApplyInsights": 5,
    "coachAppliedThose": 5,
    "coachDismissedThose": 0,
    "agreementRate": 1.0,  // 100% agreement
    "startedAt": <timestamp>,
    "completedAt": undefined  // Not done yet (need 20)
  }
  ```

**Screenshot**: Take screenshot of coachTrustLevels record

---

### Test 4: Preview Tracking - Dismiss Insights (3 min)

**Step 1: Dismiss 2 Insights**
- [ ] Return to voice notes Insights tab
- [ ] Find 2 more insights with "AI would auto-apply" badge
- [ ] Click "Dismiss" on each one

**Step 2: Verify Tracking**
- [ ] Return to Convex dashboard → `coachTrustLevels`
- [ ] Refresh the table
- [ ] Check `insightPreviewModeStats`:
  ```json
  {
    "wouldAutoApplyInsights": 7,  // 5 + 2
    "coachAppliedThose": 5,
    "coachDismissedThose": 2,
    "agreementRate": 0.71  // 5/7 = 71% agreement
  }
  ```

**Expected**: Agreement rate drops because coach dismissed predictions

---

### Test 5: 20-Insight Preview Period (10 min)

**Step 1: Continue Applying/Dismissing**
- [ ] Apply/dismiss 13 more insights with "would auto-apply" badge
- [ ] Mix of applies and dismisses (simulate realistic use)
- [ ] Total count should reach 20

**Step 2: Verify Completion**
- [ ] Return to Convex dashboard → `coachTrustLevels`
- [ ] Check `insightPreviewModeStats`:
  ```json
  {
    "wouldAutoApplyInsights": 20,  // Should be exactly 20
    "coachAppliedThose": <your count>,
    "coachDismissedThose": <your count>,
    "agreementRate": <applied / 20>,
    "completedAt": <timestamp>  // ← Should now be set!
  }
  ```

**Expected**: After 20 insights, `completedAt` timestamp is set

---

### Test 6: No Tracking After Completion (2 min)

**Step 1: Try Applying More**
- [ ] Return to voice notes Insights tab
- [ ] Apply 2 more insights with "would auto-apply" badge

**Step 2: Verify No Change**
- [ ] Return to Convex dashboard → `coachTrustLevels`
- [ ] Check `insightPreviewModeStats`
- [ ] Counts should still be 20 (no increment)
- [ ] `completedAt` should be unchanged

**Expected**: Once preview mode completes, tracking stops

---

### Test 7: Trust Level Scenarios (Optional - 5 min)

**Scenario A: Level 0/1 Coach**
- [ ] Check a coach with trust level 0 or 1
- [ ] ALL insights should show "Requires manual review"
- [ ] NO blue badges (wouldAutoApply always false)

**Scenario B: Level 2+ Coach**
- [ ] Check a coach with trust level 2 or higher
- [ ] High-confidence skills should show "would auto-apply" badge
- [ ] Injury/medical always show "manual review" (safety)

**Scenario C: Custom Threshold**
- [ ] Update `insightConfidenceThreshold` to 0.9 (90%)
- [ ] Refresh insights page
- [ ] Only insights with 90%+ confidence should get badge
- [ ] Insights with 70-89% confidence should show "manual review"

---

### Test 8: New Voice Note Creation (3 min)

**Step 1: Create Voice Note**
- [ ] Navigate to Voice Notes tab
- [ ] Create new voice note (record or upload audio)
- [ ] Wait for AI processing

**Step 2: Verify Confidence**
- [ ] Click Insights tab
- [ ] Find the newly created insights
- [ ] Verify confidence bars appear
- [ ] Verify confidence values (should be AI-generated, not default 0.7)

**Expected**: New insights have AI-generated confidence scores

---

## Expected Results Summary

### Visual Elements ✅
- ✅ Confidence progress bars on all insight cards
- ✅ Color coding: Red <60%, Amber 60-79%, Green 80%+
- ✅ Percentage text displays
- ✅ Blue badge for high-confidence predictions
- ✅ "Manual review" text for exclusions

### Data Tracking ✅
- ✅ Preview stats increment when applying/dismissing predictions
- ✅ Agreement rate calculated correctly
- ✅ After 20 insights, completedAt timestamp set
- ✅ Tracking stops after completion

### Safety Guardrails ✅
- ✅ Injury/medical NEVER show "would auto-apply" badge
- ✅ Level 0/1 coaches see NO auto-apply predictions
- ✅ Low-confidence insights require manual review

---

## Known Issues

### 1. Ralph's Table-Based Mutations Not Used
**Status**: Not a blocker
**Details**: Ralph created `applyInsight`/`dismissInsight` mutations that work with the `voiceNoteInsights` table, but UI uses `updateInsightStatus` which works with embedded array. Preview tracking was added to the embedded-array mutation.

**Impact**: None - Phase 7.1 works correctly with embedded array
**Future**: Phase 7.2 will migrate to table-based architecture

### 2. Better Auth User Table Index Warnings
**Status**: Pre-existing, documented
**Details**: ~40 warnings about missing index on `user.id` field
**Impact**: Minor performance issue, non-blocking
**Reference**: `docs/archive/bug-fixes/BETTER_AUTH_USER_TABLE_INDEX_WARNING.md`

---

## Success Criteria

**All must pass**:
- [x] Voice notes create successfully with confidence scores
- [ ] Confidence bars visible on insights
- [ ] Color coding correct
- [ ] Preview badges show for high-confidence insights
- [ ] Preview tracking increments correctly
- [ ] Agreement rate calculates correctly
- [ ] CompletedAt set after 20 insights
- [ ] Tracking stops after completion
- [ ] Injury/medical always excluded
- [ ] No console errors
- [ ] No Convex errors

---

## Rollback Plan

If Phase 7.1 needs to be rolled back:

```bash
# Revert commits
git revert HEAD~2..HEAD  # Revert last 2 commits (tracking + validator)

# Or reset to before Phase 7.1
git reset --hard afcb5bf  # Before Ralph's work
```

**Impact**: Safe to rollback - only adds UI and tracking, no destructive changes

---

## Next Steps

### After Testing Complete
1. ✅ All tests pass
2. 📸 Screenshots collected
3. 📝 Test results documented
4. ✅ No blocking issues
5. → Ready to merge or continue to Phase 7.2

### Phase 7.2 Preparation
Once Phase 7.1 is verified:
- Update PRD for Phase 7.2 (Supervised Auto-Apply)
- Plan architecture for actual auto-apply (not just preview)
- Consider migrating to table-based architecture
- Plan 1-hour undo window implementation

---

**Testing Account**: `neil.B@blablablak.com` / `lien1979`
**Convex Dashboard**: https://dashboard.convex.dev
**Dev Server**: http://localhost:3000

**Ready to test!** 🚀
