# P5 Trust Levels & Auto-Approval - Comprehensive Testing Guide

**Feature**: Progressive Trust System with Auto-Approval
**Phases**: P5 Phase 1-4 (Preview Mode, Supervised Auto-Approval, Cost Optimization, Learning Loop)
**Version**: 1.0
**Last Updated**: January 27, 2026

---

## Overview

This guide covers comprehensive UAT testing for the P5 trust system that enables progressive automation of parent summaries with transparency, safety nets, cost optimization, and continuous learning.

**Key Features**:
- Preview mode (show what AI would do without doing it)
- Supervised auto-approval with 1-hour revoke window
- Prompt caching for 90% cost savings
- AI usage tracking and analytics
- Adaptive confidence thresholds per coach
- Override feedback collection
- Learning loop for continuous improvement

---

## Prerequisites

### Test Accounts

| Role | Email | Password | Trust Level | Purpose |
|------|-------|----------|-------------|---------|
| **Coach L0** | (create new) | `lien1979` | Level 0 | Manual review testing |
| **Coach L2** | `neil.B@blablablak.com` | `lien1979` | Level 2+ | Auto-approval testing |
| **Coach L3** | (promote existing) | varies | Level 3 | Full automation testing |
| **Parent** | `neilparent@skfjkadsfdgsjdgsj.com` | `lien1979` | N/A | View summaries |

### Required Setup

1. Convex backend with all P5 schema tables
2. Anthropic API key with prompt caching enabled
3. At least 3 coaches at different trust levels
4. Voice notes with various insight types and confidence scores
5. Historical approval/suppression data for learning loop

### Environment Variables
- `ANTHROPIC_API_KEY` - For AI generation
- API key must support prompt caching beta (header: `anthropic-beta: prompt-caching-2024-07-31`)

---

## P5 Phase 1: Preview Mode & Trust Slider

### Purpose
Transparency before automation. Show coaches what AI would do WITHOUT actually doing it.

### TC-P5-001: Preview Mode Stats Schema
**Test**: Verify coachTrustLevels has preview fields
**Steps**:
1. Check Convex dashboard → coachTrustLevels table
2. View a coach record

**Expected**:
- ✅ insightPreviewModeStats field exists (optional object)
- ✅ Fields: wouldAutoApproveSuggestions, coachApprovedThose, coachRejectedThose, agreementRate
- ✅ Fields: startedAt, completedAt (optional)
- ✅ confidenceThreshold field exists (default 0.7)

### TC-P5-002: wouldAutoApprove Calculation
**Test**: Backend predicts auto-approval
**Steps**:
1. Coach at Level 2, threshold 0.7
2. Call getCoachPendingSummaries
3. Examine response

**Expected**:
- ✅ Each summary has wouldAutoApprove boolean
- ✅ wouldAutoApprove = true if:
  - sensitivityCategory === "normal"
  - effectiveLevel >= 2 (respects preferredLevel)
  - confidenceScore >= threshold (0.7)
- ✅ wouldAutoApprove = false otherwise
- ✅ Formula: Math.min(currentLevel, preferredLevel ?? currentLevel)

### TC-P5-003: Confidence Visualization
**Test**: Progress bar shows AI confidence
**Steps**:
1. View SummaryApprovalCard
2. Check confidence section

**Expected**:
- ✅ Progress bar displays confidenceScore * 100
- ✅ Text: "AI Confidence: 75%"
- ✅ Color coding:
  - Red: < 60% (text-red-600)
  - Amber: 60-79% (text-amber-600)
  - Green: 80%+ (text-green-600)
- ✅ Progress component height: h-2

### TC-P5-004: Preview Mode Indicator Badge
**Test**: Shows what AI would do
**Steps**:
1. View pending summary with wouldAutoApprove = true
2. Check for badge

**Expected**:
- ✅ Badge visible: "AI would auto-send this"
- ✅ Sparkles icon from lucide-react
- ✅ Badge variant='secondary' with blue/purple accent
- ✅ Positioned near confidence score

**Steps** (wouldAutoApprove = false):
- ✅ Shows text: "Requires manual review"
- ✅ text-muted-foreground styling

### TC-P5-005: Trust Slider UI
**Test**: Coach adjusts confidence threshold
**Steps**:
1. Open Settings tab on voice notes dashboard
2. Find "Auto-Approval Confidence Threshold" section
3. Adjust slider

**Expected**:
- ✅ Slider range: 60% (0.6) to 90% (0.9)
- ✅ Default: 70% (0.7)
- ✅ Current value displayed
- ✅ Helper text: "Higher threshold = fewer auto-approvals but more accuracy"
- ✅ Slider updates confidenceThreshold in coachTrustLevels

### TC-P5-006: Preview Mode Tracking - Approve
**Test**: Track when coach agrees with AI
**Steps**:
1. Coach in preview mode (completedAt is null)
2. Approve summary where wouldAutoApprove = true
3. Check trust level record

**Expected**:
- ✅ previewModeStats.wouldAutoApproveSuggestions increments
- ✅ previewModeStats.coachApprovedThose increments
- ✅ agreementRate = coachApprovedThose / wouldAutoApproveSuggestions
- ✅ If total >= 20: completedAt timestamp set

### TC-P5-007: Preview Mode Tracking - Suppress
**Test**: Track when coach disagrees with AI
**Steps**:
1. Suppress summary where wouldAutoApprove = true
2. Check trust level

**Expected**:
- ✅ wouldAutoApproveSuggestions increments
- ✅ coachRejectedThose increments
- ✅ coachApprovedThose unchanged
- ✅ agreementRate decreases

### TC-P5-008: Preview Mode Completion
**Test**: Exit preview after 20 insights
**Steps**:
1. Coach processes 20 insights (mix of approve/suppress)
2. Check preview mode stats

**Expected**:
- ✅ completedAt timestamp set after 20th insight
- ✅ agreementRate calculated (e.g., 15/20 = 75%)
- ✅ No longer in preview mode
- ✅ Ready for supervised auto-approval (Phase 2)

---

## P5 Phase 2: Supervised Auto-Approval

### Purpose
Enable actual automation with 1-hour safety window for coach oversight.

### TC-P5-009: Auto-Approval Schema Fields
**Test**: Verify summary has auto-approval fields
**Steps**:
1. Check coachParentSummaries schema
2. View an auto-approved record

**Expected**:
- ✅ autoApprovalDecision field exists (optional object)
- ✅ Fields: shouldAutoApprove, reason, tier, decidedAt
- ✅ scheduledDeliveryAt field exists (optional number)
- ✅ revokedAt, revokedBy, revocationReason fields exist

### TC-P5-010: Auto-Approval Decision Logic
**Test**: decideAutoApproval function
**Steps**:
1. Test with various inputs in Convex dashboard or unit test
2. Call internal function with mock data

**Expected**:
- ✅ Returns { shouldAutoApprove, reason, tier }
- ✅ NEVER auto-approve if sensitivityCategory !== "normal"
  - reason: "injury requires manual review"
- ✅ Require effectiveLevel >= 2
  - reason: "Requires trust level 2 or higher"
- ✅ Level 2: requires confidenceScore >= threshold
  - reason: "confidence 65% below 70% threshold"
- ✅ Level 3: auto-approves all normal (full automation)
  - reason: "Level 3 full automation"

### TC-P5-011: Summary Auto-Approved on Creation
**Test**: Eligible summaries auto-approve automatically
**Steps**:
1. Coach at Level 2, threshold 0.7
2. Create voice note with high-confidence skill insight
3. Wait for AI processing

**Expected**:
- ✅ Summary created via createParentSummary
- ✅ Coach trust level fetched
- ✅ decideAutoApproval called
- ✅ If shouldAutoApprove = true:
  - status = "auto_approved"
  - approvedAt = Date.now()
  - approvedBy = "system:auto"
  - scheduledDeliveryAt = Date.now() + 3600000 (1 hour)
  - autoApprovalDecision field populated
- ✅ If shouldAutoApprove = false:
  - status = "pending_review" (existing behavior)

### TC-P5-012: Auto-Approval Blocked - Low Trust
**Test**: Level 0 coach, no automation
**Steps**:
1. Coach at Level 0
2. Create high-confidence summary

**Expected**:
- ✅ status = "pending_review"
- ✅ autoApprovalDecision.shouldAutoApprove = false
- ✅ reason: "Requires trust level 2 or higher"

### TC-P5-013: Auto-Approval Blocked - Low Confidence
**Test**: Below threshold
**Steps**:
1. Level 2 coach, threshold 0.7
2. Summary with confidence 0.65

**Expected**:
- ✅ status = "pending_review"
- ✅ shouldAutoApprove = false
- ✅ reason: "confidence 65% below 70% threshold"

### TC-P5-014: Auto-Approval Blocked - Injury
**Test**: Safety guardrail
**Steps**:
1. Level 3 coach (full automation)
2. Injury insight

**Expected**:
- ✅ status = "pending_review"
- ✅ reason: "injury requires manual review"
- ✅ NEVER auto-approves regardless of trust/confidence

### TC-P5-015: AutoApprovedTab Component
**Test**: New dashboard tab
**Steps**:
1. Login as Level 2+ coach
2. Navigate to voice notes dashboard
3. Look for tabs

**Expected**:
- ✅ "Auto-Sent" tab visible (after "Parents" tab)
- ✅ Tab label shows count: "Auto-Sent (N)"
- ✅ N = count of auto_approved summaries from last 7 days
- ✅ Only visible if trustLevel.currentLevel >= 2
- ✅ Level 0-1 coaches: tab hidden

### TC-P5-016: Auto-Approved Tab Content
**Test**: Display auto-sent summaries
**Steps**:
1. Click "Auto-Sent" tab
2. View content

**Expected**:
- ✅ getAutoApprovedSummaries query called
- ✅ Args: { organizationId, timeframeDays: 7 }
- ✅ Returns summaries with status = "auto_approved" or "viewed"
- ✅ Filters: autoApprovalDecision.shouldAutoApprove === true
- ✅ Table shows:
  - Player name
  - Summary content (truncated)
  - Confidence score
  - Sent at (relative time)
  - Status: "Pending Delivery" / "Delivered" / "Viewed"
  - Revoke button

### TC-P5-017: Revoke Summary - Within 1 Hour
**Test**: Undo auto-approved summary
**Steps**:
1. Find auto-approved summary < 1 hour old
2. Click "Revoke" button
3. Dialog opens asking for reason
4. Enter reason (optional), submit

**Expected**:
- ✅ revokeSummary mutation called
- ✅ Args: { summaryId, reason }
- ✅ Validation checks:
  - Coach owns summary (coachId matches)
  - status === "auto_approved"
  - viewedAt === null (parent hasn't viewed)
  - elapsed time < 3600000 ms (1 hour)
- ✅ If valid:
  - status → "suppressed"
  - revokedAt = Date.now()
  - revokedBy = coach userId
  - revocationReason = reason
  - Trust metrics updated (counts as suppression)
- ✅ Returns { success: true }
- ✅ Toast: "Summary revoked. Will not be sent to parent."

### TC-P5-018: Revoke After 1 Hour - Blocked
**Test**: Undo window expired
**Steps**:
1. Auto-approved summary > 1 hour old
2. Try to revoke

**Expected**:
- ✅ Revoke button disabled
- ✅ Tooltip: "Undo window expired (must undo within 1 hour)"
- ✅ Mutation returns: { success: false, error: "Undo window expired" }

### TC-P5-019: Revoke After Parent Viewed - Blocked
**Test**: Cannot undo after delivery
**Steps**:
1. Parent views auto-approved summary (viewedAt set)
2. Coach tries to revoke

**Expected**:
- ✅ Revoke button disabled
- ✅ Text: "Viewed by parent" or status badge
- ✅ Mutation returns: { success: false, error: "Summary already viewed by parent" }

### TC-P5-020: Revoke Button States
**Test**: UI reflects eligibility
**Steps**:
1. View auto-approved tab
2. Check various summaries

**Expected**:
- ✅ Enabled if:
  - elapsed < 1 hour
  - viewedAt === null
- ✅ Disabled if:
  - elapsed >= 1 hour (tooltip: "Expired")
  - viewedAt !== null (text: "Viewed")
  - Already revoked (text: "Revoked")

---

## P5 Phase 3: Cost Optimization

### Purpose
90% cost savings via prompt caching and comprehensive usage tracking.

### TC-P5-021: aiUsageLog Table
**Test**: Schema for cost tracking
**Steps**:
1. Check Convex dashboard → aiUsageLog table

**Expected**:
- ✅ Table exists
- ✅ Fields: organizationId, actionType (generate_summary/classify_sensitivity)
- ✅ Fields: tokensInput, tokensOutput, tokensCached, costUsd, model, timestamp
- ✅ Indexes: by_org, by_org_date (organizationId, timestamp)

### TC-P5-022: Prompt Caching Implementation
**Test**: Anthropic API calls use caching
**Steps**:
1. Check generateParentSummary action code
2. Verify Anthropic client call structure

**Expected**:
- ✅ Header: `anthropic-beta: prompt-caching-2024-07-31`
- ✅ Messages array structure:
  ```typescript
  {
    role: 'user',
    content: [
      { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `Player: ${playerName}\nSport: ${sport}` },
      { type: 'text', text: `Insight: ${insight}` }
    ]
  }
  ```
- ✅ System prompt cached (static, reused)
- ✅ Player/sport context cached (static per player)
- ✅ Only insight is dynamic (not cached)

### TC-P5-023: Cache Hit Rate
**Test**: Verify caching effectiveness
**Steps**:
1. Generate 5 summaries for same player
2. Check response.usage fields

**Expected**:
- ✅ First call: cache_read_input_tokens = 0 (cold start)
- ✅ Subsequent calls: cache_read_input_tokens > 0 (cache hit)
- ✅ Cache hit rate target: 80%+ for production
- ✅ Cost reduction: ~90% (cached tokens $0.50/M vs $5/M)

### TC-P5-024: AI Usage Logging - Generate Summary
**Test**: Every AI call logged
**Steps**:
1. Call generateParentSummary action
2. Check aiUsageLog table

**Expected**:
- ✅ New record created
- ✅ organizationId matches
- ✅ actionType = "generate_summary"
- ✅ tokensInput = usage.input_tokens - cache_read_input_tokens
- ✅ tokensCached = usage.cache_read_input_tokens ?? 0
- ✅ tokensOutput = usage.output_tokens
- ✅ model = "claude-3-haiku-20240307"
- ✅ costUsd calculated:
  - (tokensInput * $0.000005) + (tokensCached * $0.0000005) + (tokensOutput * $0.000015)

### TC-P5-025: AI Usage Logging - Classify Sensitivity
**Test**: Classification also logged
**Steps**:
1. Insight extraction triggers classifyInsightSensitivity
2. Check logs

**Expected**:
- ✅ Record created with actionType = "classify_sensitivity"
- ✅ Token counts and costs tracked
- ✅ Both actions logged per insight (2 records)

### TC-P5-026: Usage Summary Query
**Test**: Aggregate analytics
**Steps**:
1. Call getAIUsageSummary query
2. Args: { organizationId, dateRange: 30 }

**Expected**:
- ✅ Returns aggregated data:
  - totalCalls (count)
  - totalCostUsd (sum)
  - cacheHitRate (tokensCached / totalTokensInput)
  - costPerMessage (totalCost / totalCalls)
  - dailyBreakdown (array of { date, cost, calls })
- ✅ dateRange filters last N days
- ✅ Group by day for sparkline chart

### TC-P5-027: Cost Per Message Target
**Test**: Verify cost reduction
**Steps**:
1. Generate 100 summaries
2. Calculate average cost

**Expected**:
- ✅ WITHOUT caching: ~$0.10-0.15 per message
- ✅ WITH caching: ~$0.01 per message (90% savings)
- ✅ At 1000 msgs/month: $25 → $2.50

---

## P5 Phase 4: Learning Loop

### Purpose
AI learns from coach behavior and adapts thresholds per coach.

### TC-P5-028: Override Tracking Schema
**Test**: Summary tracks overrides
**Steps**:
1. Check coachParentSummaries schema

**Expected**:
- ✅ overrideType field (optional union):
  - "coach_approved_low_confidence"
  - "coach_rejected_high_confidence"
  - "coach_edited"
  - "coach_revoked_auto"
- ✅ overrideReason (optional string)
- ✅ overrideFeedback (optional object):
  - wasInaccurate (boolean)
  - wasTooSensitive (boolean)
  - timingWasWrong (boolean)
  - otherReason (optional string)

### TC-P5-029: Override Captured - Suppress High Confidence
**Test**: Coach rejects AI suggestion
**Steps**:
1. Level 2 coach
2. Summary with confidence 0.8 (high)
3. Coach suppresses it

**Expected**:
- ✅ overrideType = "coach_rejected_high_confidence"
- ✅ Optional: Feedback dialog appears
- ✅ If coach provides feedback: overrideFeedback populated
- ✅ Pattern tracked for learning

### TC-P5-030: Override Captured - Approve Low Confidence
**Test**: Coach approves what AI wouldn't
**Steps**:
1. Summary with confidence 0.6 (below threshold 0.7)
2. Coach manually approves

**Expected**:
- ✅ overrideType = "coach_approved_low_confidence"
- ✅ Signals coach trusts lower confidence than AI
- ✅ May trigger threshold adjustment

### TC-P5-031: Override Captured - Revoke Auto-Sent
**Test**: Undo auto-approved summary
**Steps**:
1. Auto-approved summary
2. Coach revokes within 1 hour

**Expected**:
- ✅ overrideType = "coach_revoked_auto"
- ✅ revocationReason captures why
- ✅ Indicates AI made error

### TC-P5-032: Feedback Dialog on Suppress
**Test**: Optional feedback collection
**Steps**:
1. Click "Suppress" on high-confidence summary
2. Dialog appears

**Expected**:
- ✅ Dialog title: "Why are you suppressing this?"
- ✅ Checkboxes:
  - "Inaccurate"
  - "Too sensitive"
  - "Timing not right"
  - "Other" (text field)
- ✅ Buttons: "Skip" (no feedback), "Suppress & Send Feedback"
- ✅ Skip is default/prominent (low friction)
- ✅ Feedback is optional but valuable

### TC-P5-033: Override Pattern Analytics
**Test**: Query override stats
**Steps**:
1. Call getCoachOverridePatterns query
2. Args: { coachId: optional, organizationId: optional }

**Expected**:
- ✅ Returns aggregated data:
  - totalOverrides
  - byType (count per overrideType)
  - avgConfidenceWhenRejected
  - commonFeedbackReasons (frequency)
  - overrideRateByCategory (skill/injury/behavior)
- ✅ Platform-wide if no coachId
- ✅ Per-coach if coachId provided

### TC-P5-034: Adaptive Threshold Calculation
**Test**: calculatePersonalizedThreshold function
**Steps**:
1. Test with mock override history
2. Coach frequently approves 60-70% confidence

**Expected**:
- ✅ Input: coach override history, default 0.7
- ✅ Logic:
  - If >50% approve rate for 60-70% confidence: lower threshold by 5% (0.7 → 0.65)
  - If >20% reject rate for 80%+ confidence: raise threshold by 5% (0.7 → 0.75)
- ✅ Bounds: 0.6 min, 0.85 max
- ✅ Result stored in personalizedThreshold field

### TC-P5-035: Weekly Threshold Adjustment
**Test**: Scheduled job adjusts thresholds
**Steps**:
1. Create adjustPersonalizedThresholds scheduled function
2. Run manually or wait for weekly schedule

**Expected**:
- ✅ Runs weekly (cron: Sunday 2am UTC)
- ✅ For each coach:
  - Analyze last 30 days of overrides
  - Calculate new threshold
  - Update if changed
  - Log adjustment with reason
- ✅ Console log: "Coach X threshold adjusted: 0.7 → 0.65 (frequently approves lower confidence)"

### TC-P5-036: Personalized Threshold Used
**Test**: Auto-approval uses personalized threshold
**Steps**:
1. Coach has personalizedThreshold = 0.65
2. Summary with confidence 0.67
3. Check auto-approval decision

**Expected**:
- ✅ decideAutoApproval uses personalizedThreshold if exists
- ✅ Falls back to confidenceThreshold if personalizedThreshold null
- ✅ shouldAutoApprove = true (0.67 >= 0.65)
- ✅ Without personalization: would be false (0.67 < 0.7)

---

## Integration Tests

### End-to-End Workflows

### Workflow 1: Preview → Automation → Learning
**Steps**:
1. New coach creates 20 insights in preview mode
2. 75% agreement rate → ready for automation
3. Trust level increases to 2
4. Next insight auto-approves
5. Coach occasionally revokes or suppresses
6. System adjusts threshold based on patterns
7. After 30 days, threshold personalizes to coach's behavior

**Expected**:
- ✅ Smooth transition through all phases
- ✅ Coach feels in control at every step
- ✅ AI adapts to individual coaching style

### Workflow 2: Cost Monitoring
**Steps**:
1. Generate 50 summaries over 1 week
2. Check AI usage logs
3. Calculate costs with/without caching
4. View usage dashboard

**Expected**:
- ✅ All AI calls logged
- ✅ Cache hit rate > 80%
- ✅ Cost reduced by ~90%
- ✅ Dashboard shows daily breakdown

### Workflow 3: Revoke Flow
**Steps**:
1. Summary auto-approves
2. Coach notices error within 30 minutes
3. Coach revokes with reason
4. Summary suppressed, parent never sees
5. Override logged for learning

**Expected**:
- ✅ Safety net catches error
- ✅ No parent impact
- ✅ System learns from mistake

---

## Regression Tests

### After Any Changes

- [ ] Preview mode badges show correctly
- [ ] Auto-approval respects all conditions
- [ ] Revoke window enforced (1 hour)
- [ ] AI usage logged for every call
- [ ] Cache hit rate tracked
- [ ] Override feedback collected
- [ ] Thresholds adjust based on patterns
- [ ] Personalized thresholds used in decisions

---

## Performance Tests

### Auto-Approval Decision
**Test**: decideAutoApproval speed
**Expected**: < 10ms (pure function, no DB)

### Revoke Mutation
**Test**: revokeSummary latency
**Expected**: < 200ms (single DB patch)

### Usage Summary Query
**Test**: getAIUsageSummary for 30 days
**Expected**: < 500ms (with indexes)

### Threshold Adjustment Cron
**Test**: adjustPersonalizedThresholds runtime
**Expected**: < 5 seconds for 100 coaches

---

## Cost Analysis

### Baseline (No Optimization)
- 1000 summaries/month
- 2 AI calls per summary (classify + generate)
- 2000 tokens average per call
- Cost: 2000 calls * 2000 tokens * $5/M = $20
- **Total: ~$40/month**

### With Prompt Caching
- Same 1000 summaries
- 80% cache hit rate
- Cached tokens: 1600 tokens at $0.50/M
- New tokens: 400 tokens at $5/M
- Cost per call: (1600 * 0.0000005) + (400 * 0.000005) = $0.0028
- **Total: ~$5.60/month (86% savings)**

### Target Metrics
- Cache hit rate: > 80%
- Cost per message: < $0.01
- Monthly cost at 1000 msgs: < $10

---

## Known Issues & Limitations

### Current Behavior
- Revoke window fixed at 1 hour (not configurable)
- Personalized thresholds adjust weekly (not real-time)
- Override feedback optional (not enforced)
- Adaptive thresholds require 30-day history (cold start)

### Expected Edge Cases
- First-time cache miss increases latency
- Threshold adjustments bounded (0.6 to 0.85)
- Override patterns need minimum 10 samples for significance

---

## Troubleshooting

### Preview badges not showing
- Check wouldAutoApprove calculation
- Verify effectiveLevel >= 2
- Check confidenceScore field exists

### Auto-approval not working
- Verify sensitivityCategory === "normal"
- Check trust level >= 2
- Verify confidenceScore >= threshold
- Check autoApprovalDecision field populated

### Revoke failing
- Check elapsed time < 1 hour
- Verify viewedAt is null
- Confirm coach owns summary

### Cache not working
- Verify Anthropic API key supports caching
- Check beta header in requests
- Verify response includes cache_read_input_tokens

### Costs not reducing
- Check cache hit rate (should be 80%+)
- Verify prompt structure (static parts marked for caching)
- Review aiUsageLog for tokensCached values

---

## Success Criteria

✅ **All 4 P5 phases implemented**
✅ **Preview mode provides transparency**
✅ **Auto-approval respects all safety guardrails**
✅ **1-hour revoke window functional**
✅ **90%+ cost reduction via caching**
✅ **All AI usage tracked and analyzable**
✅ **Override feedback collected**
✅ **Adaptive thresholds personalize per coach**

**Total Test Cases**: 36
**Estimated Test Time**: 5-7 hours (full suite)
**Quick Smoke Test**: 1 hour (critical paths)

---

**Tested By**: _______________
**Date**: _______________
**Environment**: _______________
**Result**: _______________

---

*Generated by Claude Code - January 27, 2026*
