# P7 Insight Auto-Apply - Comprehensive Testing Guide

**Feature**: Automatic Application of AI-Generated Voice Note Insights
**Phases**: P7 Phase 1-3 (Preview Mode, Supervised Auto-Apply, Learning Loop with Auto-Triggering)
**Version**: 1.0
**Last Updated**: January 27, 2026

---

## Overview

This guide covers comprehensive UAT testing for the P7 insight auto-apply system, which automatically applies high-confidence skill insights to player profiles with coach oversight, learning capabilities, and full transparency.

**Key Features**:
- Preview mode for insights (show what AI would auto-apply)
- Supervised auto-apply for skill ratings with 1-hour undo window
- Automatic triggering (no manual action required)
- Per-category preferences (skills, attendance, goals, performance)
- Adaptive confidence thresholds based on undo patterns
- Undo reason collection for AI improvement
- Complete audit trail

---

## Prerequisites

### Test Accounts

| Role | Email | Password | Trust Level | Purpose |
|------|-------|----------|-------------|---------|
| **Coach L0** | (create new) | `lien1979` | Level 0 | Manual review testing |
| **Coach L2** | `neil.B@blablablak.com` | `lien1979` | Level 2+ | Auto-apply testing |
| **Coach L3** | (promote existing) | varies | Level 3 | Full automation testing |

### Required Setup

1. Convex backend with P7 schema tables
2. voiceNoteInsights table populated (migrated from embedded insights)
3. Players with sport passports and skill ratings
4. Voice notes with various insight types and confidence scores
5. Trust levels at different stages (Level 0, 2, 3)

### Test Data Requirements
- At least 5 players per coach with skill ratings
- Voice notes containing skill insights (e.g., "Passing improved to 4/5")
- Players across multiple sports (GAA, soccer, basketball)
- Historical insights for learning loop testing

---

## P7 Phase 1: Preview Mode for Insights

### Purpose
Show coaches which insights AI would auto-apply WITHOUT actually doing it.

### TC-P7-001: Insight Schema Verification
**Test**: voiceNoteInsights table structure
**Steps**:
1. Check Convex dashboard → voiceNoteInsights table
2. View a record

**Expected**:
- ✅ Table exists (NOT embedded array)
- ✅ Fields: voiceNoteId, coachId, playerIdentityId, category, confidenceScore
- ✅ Fields: status (pending/applied/dismissed), appliedAt, appliedBy
- ✅ Fields: recommendedUpdate (e.g., "Passing: 4")
- ✅ Indexes: by_coach_org_status, by_player, by_voiceNote

### TC-P7-002: Trust Level Insight Fields
**Test**: coachTrustLevels has insight-specific fields
**Steps**:
1. Check coachTrustLevels table schema

**Expected**:
- ✅ insightPreviewModeStats field exists (optional object)
- ✅ Fields: wouldAutoApplyInsights, coachAppliedThose, coachDismissedThose, agreementRate
- ✅ insightConfidenceThreshold field (default 0.7)
- ✅ insightAutoApplyPreferences field (object with skills, attendance, goals, performance booleans)

### TC-P7-003: wouldAutoApply Calculation
**Test**: Backend predicts which insights would auto-apply
**Steps**:
1. Coach at Level 2, threshold 0.7
2. Call getPendingInsights query
3. Examine response

**Expected**:
- ✅ Each insight has wouldAutoApply boolean
- ✅ wouldAutoApply = true if:
  - category === "skill" (Phase 7.2 limitation)
  - category !== "injury" AND !== "medical"
  - effectiveLevel >= 2
  - confidenceScore >= (insightConfidenceThreshold ?? 0.7)
- ✅ wouldAutoApply = false otherwise

### TC-P7-004: Confidence Visualization on Cards
**Test**: Progress bar shows AI confidence
**Steps**:
1. Navigate to voice notes → AI Insights tab
2. View insight cards

**Expected**:
- ✅ Progress bar displays confidenceScore * 100
- ✅ Text: "AI Confidence: 82%"
- ✅ Color coding:
  - Red: < 60% (text-red-600)
  - Amber: 60-79% (text-amber-600)
  - Green: 80%+ (text-green-600)
- ✅ Progress bar height: h-2
- ✅ Positioned after insight description, before action buttons

### TC-P7-005: Preview Mode Prediction Badge
**Test**: Shows what AI would do
**Steps**:
1. View insight card where wouldAutoApply = true

**Expected**:
- ✅ Badge visible: "AI would auto-apply this at Level 2+"
- ✅ Sparkles icon from lucide-react
- ✅ Badge variant='secondary' with blue background (bg-blue-100 text-blue-700)
- ✅ Positioned after confidence bar

**Steps** (wouldAutoApply = false):
- ✅ Shows text: "Requires manual review"
- ✅ text-muted-foreground styling

### TC-P7-006: Preview Mode Tracking - Apply
**Test**: Track when coach agrees with AI
**Steps**:
1. Coach in preview mode (completedAt is null)
2. Apply insight where wouldAutoApply = true
3. Check trust level record

**Expected**:
- ✅ insightPreviewModeStats.wouldAutoApplyInsights increments
- ✅ insightPreviewModeStats.coachAppliedThose increments
- ✅ agreementRate = coachAppliedThose / wouldAutoApplyInsights
- ✅ If total >= 20: completedAt timestamp set

### TC-P7-007: Preview Mode Tracking - Dismiss
**Test**: Track when coach disagrees with AI
**Steps**:
1. Dismiss insight where wouldAutoApply = true
2. Check trust level

**Expected**:
- ✅ wouldAutoApplyInsights increments
- ✅ coachDismissedThose increments
- ✅ coachAppliedThose unchanged
- ✅ agreementRate decreases

### TC-P7-008: Preview Mode Completion
**Test**: Exit preview after 20 insights
**Steps**:
1. Coach processes 20 insights
2. Check preview mode stats

**Expected**:
- ✅ completedAt timestamp set after 20th insight
- ✅ agreementRate calculated (e.g., 16/20 = 80%)
- ✅ Ready for supervised auto-apply

---

## P7 Phase 2: Supervised Auto-Apply

### Purpose
Enable actual auto-application of skill insights with 1-hour undo window.

### TC-P7-009: autoAppliedInsights Table
**Test**: Audit trail schema
**Steps**:
1. Check Convex dashboard → autoAppliedInsights table

**Expected**:
- ✅ Table exists
- ✅ Fields: insightId, playerId, coachId, organizationId, category
- ✅ Fields: confidenceScore, appliedAt, undoneAt, undoReason
- ✅ Fields: changeType (skill_rating), fieldChanged (skill name), previousValue, newValue
- ✅ Fields: autoAppliedByAI (boolean)
- ✅ Indexes: by_insight, by_player, by_coach_org

### TC-P7-010: Auto-Apply Mutation - Success
**Test**: Apply skill insight to player profile
**Steps**:
1. Coach at Level 2, threshold 0.7
2. Insight: "Passing: 4" for player with current rating 3
3. Call autoApplyInsight mutation

**Expected**:
- ✅ Validation passes:
  - Coach authenticated
  - effectiveLevel >= 2
  - confidenceScore >= 0.7
  - category === "skill"
  - status === "pending"
- ✅ Player fetched from orgPlayerEnrollments
- ✅ Skill name extracted: "Passing"
- ✅ New rating extracted: 4
- ✅ Current rating retrieved: 3
- ✅ Player.skillRatings updated: { Passing: 4 }
- ✅ autoAppliedInsights record created:
  - previousValue: "3"
  - newValue: "4"
  - fieldChanged: "Passing"
  - autoAppliedByAI: true
- ✅ Insight status → "applied"
- ✅ appliedAt, appliedBy set
- ✅ Returns { success: true, appliedInsightId }

### TC-P7-011: Auto-Apply Blocked - Low Trust
**Test**: Level 0 coach cannot auto-apply
**Steps**:
1. Coach at Level 0
2. Try autoApplyInsight

**Expected**:
- ✅ Returns { success: false, message: "Requires trust level 2 or higher" }
- ✅ Status remains "pending"
- ✅ No changes to player profile

### TC-P7-012: Auto-Apply Blocked - Low Confidence
**Test**: Below threshold
**Steps**:
1. Level 2 coach, threshold 0.7
2. Insight with confidence 0.65
3. Try autoApplyInsight

**Expected**:
- ✅ Returns { success: false, message: "Confidence 65% below 70% threshold" }
- ✅ Manual review required

### TC-P7-013: Auto-Apply Blocked - Injury Category
**Test**: Safety guardrail
**Steps**:
1. Level 3 coach (full automation)
2. Insight category: "injury"
3. Try autoApplyInsight

**Expected**:
- ✅ Returns { success: false, message: "Cannot auto-apply injury insights" }
- ✅ NEVER auto-applies regardless of trust

### TC-P7-014: Undo Within 1 Hour
**Test**: Revert auto-applied insight
**Steps**:
1. Auto-apply insight < 1 hour ago
2. Call undoAutoAppliedInsight mutation
3. Args: { autoAppliedInsightId, undoReason: "Wrong rating" }

**Expected**:
- ✅ Validation passes:
  - Coach owns insight
  - elapsed < 3600000 ms (1 hour)
  - undoneAt === undefined (not already undone)
- ✅ Player profile reverted:
  - skillRatings["Passing"] = previousValue (e.g., 3)
- ✅ autoAppliedInsights record updated:
  - undoneAt = Date.now()
  - undoReason = "Wrong rating"
- ✅ Original insight status → "pending" (revert to pending)
- ✅ appliedAt, appliedBy, autoAppliedByAI cleared
- ✅ Returns { success: true, message: "Reverted Passing back to 3" }

### TC-P7-015: Undo After 1 Hour - Blocked
**Test**: Window expired
**Steps**:
1. Auto-applied insight > 1 hour old
2. Try to undo

**Expected**:
- ✅ Returns { success: false, message: "Undo window expired (must undo within 1 hour)" }
- ✅ No changes made

### TC-P7-016: Undo Already Undone - Blocked
**Test**: Cannot undo twice
**Steps**:
1. Insight already undone (undoneAt set)
2. Try to undo again

**Expected**:
- ✅ Returns { success: false, message: "Already undone" }

### TC-P7-017: Auto-Applied Tab UI
**Test**: View auto-applied insights
**Steps**:
1. Navigate to voice notes dashboard → AI Insights tab
2. Look for "Auto-Applied" sub-tab

**Expected**:
- ✅ Two tabs visible:
  - "Pending Review" (status='pending')
  - "Auto-Applied" (autoAppliedByAI=true)
- ✅ getAutoAppliedInsights query called
- ✅ Args: { organizationId, coachId }
- ✅ Returns insights with status='applied' and autoAppliedByAI=true
- ✅ Sorted by appliedAt descending (most recent first)

### TC-P7-018: Auto-Applied Card Display
**Test**: Card shows details and actions
**Steps**:
1. View auto-applied tab
2. Check card content

**Expected**:
- ✅ Green badge: "✓ Auto-Applied"
- ✅ Time applied: "Applied 23 minutes ago" (relative time, use formatDistanceToNow)
- ✅ What changed: "Passing: 3 → 4"
- ✅ Player name
- ✅ Insight description
- ✅ Confidence score with progress bar
- ✅ Action buttons:
  - [Undo] button
  - [View Profile] button (links to player profile)

### TC-P7-019: Undo Button States
**Test**: UI reflects eligibility
**Steps**:
1. View various auto-applied insights
2. Check undo button state

**Expected**:
- ✅ Enabled if:
  - elapsed < 1 hour: (Date.now() - appliedAt) < 3600000
  - undoneAt === undefined
- ✅ Disabled if:
  - elapsed >= 1 hour (tooltip: "Undo window expired")
  - undoneAt !== undefined (text: "Undone")
- ✅ Button variant changes based on state

### TC-P7-020: Undo Confirmation Dialog
**Test**: Reason collection
**Steps**:
1. Click Undo button on eligible insight
2. Dialog opens

**Expected**:
- ✅ Dialog title: "Undo Auto-Applied Insight"
- ✅ Message: "This will revert the player's rating back to {previousValue}. Why are you undoing this?"
- ✅ Radio button options:
  - "Wrong player - AI applied to incorrect player"
  - "Wrong rating - The suggested rating was incorrect"
  - "Insight incorrect - The insight itself was wrong"
  - "Other (please explain)"
- ✅ If "Other" selected: text area appears
- ✅ Buttons: [Cancel] and [Undo]
- ✅ On undo:
  - Calls undoAutoAppliedInsight with reason
  - Toast on success: "Auto-apply undone. Skill rating reverted to {previousValue}."
  - Refreshes auto-applied list
  - On error: Toast with error message

### TC-P7-021: Empty State
**Test**: No auto-applied insights yet
**Steps**:
1. Coach at Level 0 or 1 (no automation)
2. View auto-applied tab

**Expected**:
- ✅ Empty state displayed
- ✅ Icon and message: "No auto-applied insights yet"
- ✅ Subtitle: "When you reach Level 2, high-confidence skill insights will auto-apply here"

---

## P7 Phase 3: Learning Loop with Auto-Triggering

### Purpose
Complete automation with automatic triggering, category preferences, and adaptive learning.

### TC-P7-022: Automatic Triggering Integration
**Test**: Insights auto-apply WITHOUT manual action
**Steps**:
1. Coach at Level 2, skills preference enabled
2. Create voice note with skill insight
3. Wait for AI processing
4. DO NOT manually click apply

**Expected**:
- ✅ After buildInsights action completes:
  - Insight created in voiceNoteInsights table
  - Eligibility checked automatically
  - autoApplyInsight mutation called internally
  - Insight status → "applied" (not "pending")
  - Player profile updated
  - autoAppliedInsights record created
- ✅ Appears in "Auto-Applied" tab automatically
- ✅ Console log: "Auto-applied insight {id} for coach {coachId}"

### TC-P7-023: Auto-Trigger Blocked - Low Trust
**Test**: Level 0 coach, insights remain pending
**Steps**:
1. Level 0 coach creates voice note
2. Wait for processing

**Expected**:
- ✅ Insight created with status="pending"
- ✅ NOT auto-applied
- ✅ Appears in "Pending Review" tab
- ✅ Console log: "Skipped auto-apply: coach trust level 0 (requires 2+)"

### TC-P7-024: Auto-Trigger Blocked - Disabled Preference
**Test**: Skills preference OFF
**Steps**:
1. Level 2 coach with insightAutoApplyPreferences.skills = false
2. Create voice note with skill insight

**Expected**:
- ✅ Insight remains pending
- ✅ NOT auto-applied
- ✅ Manual review required

### TC-P7-025: Category Preferences Schema
**Test**: Verify preference fields exist
**Steps**:
1. Check coachTrustLevels.insightAutoApplyPreferences

**Expected**:
- ✅ Object with boolean fields:
  - skills
  - attendance
  - goals
  - performance
- ✅ injury and medical NOT included (always manual)

### TC-P7-026: Set Category Preferences Mutation
**Test**: Coach controls which categories auto-apply
**Steps**:
1. Call setInsightAutoApplyPreferences mutation
2. Args: { preferences: { skills: true, attendance: false, goals: false, performance: false } }

**Expected**:
- ✅ Authenticated coach userId retrieved
- ✅ coachTrustLevels record updated
- ✅ insightAutoApplyPreferences field set
- ✅ If trust level doesn't exist, create with defaults
- ✅ Returns v.null()
- ✅ Type check passes

### TC-P7-027: Category Preferences UI
**Test**: Settings tab controls
**Steps**:
1. Navigate to voice notes → Settings tab
2. Find "Auto-Apply Preferences" section

**Expected**:
- ✅ Section heading: "Auto-Apply Preferences"
- ✅ Description: "Choose which types of insights can be automatically applied to player profiles"
- ✅ 4 checkboxes:
  - ☑ Skills - "Auto-apply skill rating updates"
  - ☐ Attendance - "Auto-apply attendance records"
  - ☐ Goals - "Auto-apply development goal updates"
  - ☐ Performance - "Auto-apply performance notes"
- ✅ Disabled text below: "Injury and medical insights always require manual review for safety"
- ✅ Checkboxes reflect current preferences from query
- ✅ On toggle:
  - Local state updates
  - setInsightAutoApplyPreferences mutation called
  - Toast notification:
    - If enabled: toast.success("Skill auto-apply enabled")
    - If disabled: toast.success("Skill auto-apply disabled")

### TC-P7-028: Adaptive Threshold Schema
**Test**: Verify adaptive fields
**Steps**:
1. Check coachTrustLevels schema

**Expected**:
- ✅ personalizedThreshold field exists (optional number)
- ✅ Separate from user-set insightConfidenceThreshold
- ✅ Used by auto-apply logic if present

### TC-P7-029: Adaptive Threshold Calculation
**Test**: System adjusts threshold based on undo patterns
**Steps**:
1. Coach with 30 days of auto-applied insights
2. Undo rate < 3% (high accuracy)
3. Run adjustInsightThresholds cron (manually trigger)

**Expected**:
- ✅ Fetch recent autoAppliedInsights (last 30 days)
- ✅ Require minimum 10 insights for significance
- ✅ Calculate undoRate = undoCount / totalInsights
- ✅ Logic:
  - If undoRate < 0.03 (3%): lower threshold by 0.05 (0.7 → 0.65)
  - If undoRate > 0.1 (10%): raise threshold by 0.05 (0.7 → 0.75)
  - Bounds: 0.6 minimum, 0.9 maximum
- ✅ Update personalizedThreshold if changed
- ✅ Console log: "Coach {id} threshold adjusted: 0.7 → 0.65 (undo rate: 2%)"

### TC-P7-030: Adaptive Threshold Used in Decision
**Test**: Auto-apply uses personalized threshold
**Steps**:
1. Coach has personalizedThreshold = 0.65
2. Insight with confidence 0.67
3. Check auto-apply decision

**Expected**:
- ✅ Eligibility check uses personalizedThreshold (not default 0.7)
- ✅ shouldAutoApply = true (0.67 >= 0.65)
- ✅ Without personalization: would be false (0.67 < 0.7)
- ✅ Coach gets more auto-applies due to high accuracy history

### TC-P7-031: Weekly Threshold Adjustment
**Test**: Scheduled cron job
**Steps**:
1. Create cron: adjustInsightThresholds
2. Schedule: weekly (Sunday 2am UTC)
3. Run manually or wait for schedule

**Expected**:
- ✅ Runs weekly
- ✅ Processes all coaches with insightAutoApplyPreferences set
- ✅ For each coach:
  - Fetch last 30 days of auto-applied insights
  - Calculate undo rate
  - Adjust threshold if needed
  - Log adjustment
- ✅ Performance: < 5 seconds for 100 coaches

### TC-P7-032: Undo Reason Analytics
**Test**: Query undo statistics
**Steps**:
1. Call getUndoReasonStats query
2. Args: { organizationId: optional, timeframeDays: 30 }

**Expected**:
- ✅ Returns aggregate data:
  - total (count of undone insights)
  - byReason (array of { reason, count, percentage })
  - topInsights (array of recent undos with details)
- ✅ Filters by organizationId if provided
- ✅ Filters by timeframe (default 30 days)
- ✅ Groups by undoReason
- ✅ Calculates percentage for each reason

### TC-P7-033: Undo Reason Analysis (Admin View)
**Test**: Platform staff can view patterns
**Steps**:
1. Navigate to admin page (if exists): /admin/ai-insights/undo-analysis
2. View statistics

**Expected**:
- ✅ Card with title: "Undo Reason Analysis"
- ✅ Stats displayed:
  - Total undone insights count
  - Breakdown by reason with percentages
  - Simple bar chart or list
- ✅ Button: "Export to CSV" (downloads undo data)
- ✅ Insights for AI improvement:
  - If "wrong player" common → improve player matching
  - If "wrong rating" common → improve confidence scoring
  - If "insight incorrect" common → improve AI prompt

---

## Integration Tests

### End-to-End Workflows

### Workflow 1: Full Automation Journey
**Steps**:
1. New coach (Level 0) creates voice note with skill insight
2. Insight appears in "Pending Review" tab
3. Coach manually applies 20 insights (preview mode)
4. Trust level increases to 2
5. Next skill insight auto-applies automatically
6. Appears in "Auto-Applied" tab
7. Coach can undo within 1 hour
8. After 30 days, threshold adjusts based on undo patterns

**Expected**:
- ✅ Smooth progression from manual to automated
- ✅ No manual triggering required (automatic)
- ✅ Safety window maintained
- ✅ Learning loop improves accuracy over time

### Workflow 2: Category Preference Control
**Steps**:
1. Level 2 coach enables only skills preference
2. Create voice note with:
   - Skill insight (Passing: 4)
   - Goal insight (Work on left foot)
3. Wait for processing

**Expected**:
- ✅ Skill insight auto-applies
- ✅ Goal insight remains pending (preference disabled)
- ✅ Coach maintains granular control

### Workflow 3: Undo and Learning
**Steps**:
1. Insight auto-applies (Passing: 3 → 4)
2. Coach notices error (should be 3 → 3.5)
3. Coach undos within 30 minutes
4. Selects reason: "Wrong rating"
5. Manually applies correct update
6. System logs override pattern
7. After 30 days, threshold adjusts

**Expected**:
- ✅ Undo successful, rating reverted
- ✅ Reason captured for learning
- ✅ Override pattern tracked
- ✅ AI improves over time

---

## Regression Tests

### After Any Changes

- [ ] Automatic triggering works for eligible insights
- [ ] Manual review required for non-eligible
- [ ] Category preferences enforced
- [ ] Undo window respected (1 hour)
- [ ] Adaptive thresholds calculate correctly
- [ ] Undo reasons collected and analyzed
- [ ] Player profiles update and revert correctly
- [ ] Audit trail complete

---

## Performance Tests

### Auto-Apply Decision Speed
**Test**: Eligibility check latency
**Expected**: < 50ms (includes DB queries)

### Automatic Trigger Latency
**Test**: Time from insight creation to auto-apply
**Expected**: < 1 second (immediate after buildInsights)

### Undo Mutation
**Test**: undoAutoAppliedInsight response time
**Expected**: < 200ms (single DB patch + revert)

### Threshold Adjustment Cron
**Test**: Weekly job runtime
**Expected**: < 10 seconds for 100 coaches

---

## Safety & Security Tests

### Authorization Checks
- [ ] Only coach can undo their own insights
- [ ] Level 0-1 coaches cannot auto-apply
- [ ] Injury/medical never auto-apply regardless of trust
- [ ] Undo window enforced strictly
- [ ] Cannot undo after window expires

### Data Integrity
- [ ] Player profile reverts correctly on undo
- [ ] Previous rating restored exactly
- [ ] Audit trail captures all changes
- [ ] Override patterns tracked accurately

---

## Known Issues & Limitations

### Phase 7.2 Limitations
- Only skill category auto-applies (attendance, goals, performance in future)
- 1-hour undo window not configurable
- Automatic triggering via buildInsights action (Option A)
- Adaptive thresholds require 10+ insights (cold start)

### Expected Behavior
- If coach deletes voice note, insights remain (by design)
- Multi-category preferences only affect future insights
- Personalized thresholds adjust weekly (not real-time)
- Undo reason is optional but valuable

---

## Troubleshooting

### Insights not auto-applying
- Check trust level >= 2
- Verify category preference enabled (skills)
- Check confidenceScore >= threshold
- Ensure category === "skill" (not injury/medical)
- Check automatic triggering integrated in buildInsights action

### Automatic triggering not working
- Verify buildInsights action modified correctly
- Check console logs for auto-apply attempts
- Ensure insightAutoApplyPreferences.skills = true
- Check for errors in action execution

### Undo failing
- Check elapsed time < 1 hour
- Verify undoneAt is undefined (not already undone)
- Confirm coach owns insight (coachId matches)
- Check player profile exists

### Threshold not adjusting
- Verify coach has 10+ auto-applied insights
- Check undo patterns exist
- Ensure weekly cron is scheduled
- Manually trigger adjustInsightThresholds to test

### Player profile not updating
- Check sportPassport exists for player
- Verify skill name matches passport skillRatings keys
- Check rating is valid (1-5 range typically)
- Review audit trail for errors

---

## Success Criteria

✅ **All 3 P7 phases implemented**
✅ **Preview mode provides transparency**
✅ **Auto-apply works with automatic triggering**
✅ **1-hour undo window functional**
✅ **Category preferences give coach control**
✅ **Adaptive thresholds personalize per coach**
✅ **Undo reasons collected for improvement**
✅ **Complete audit trail maintained**

**Total Test Cases**: 33
**Estimated Test Time**: 4-6 hours (full suite)
**Quick Smoke Test**: 45 minutes (critical paths)

---

**Tested By**: _______________
**Date**: _______________
**Environment**: _______________
**Result**: _______________

---

*Generated by Claude Code - January 27, 2026*
