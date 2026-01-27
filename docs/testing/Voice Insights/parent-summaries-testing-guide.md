# Coach-Parent AI Summaries - Comprehensive Testing Guide

**Feature**: AI-Generated Parent Summaries from Voice Notes
**Phases**: 1-6 (Core Infrastructure, Trust System, Sensitive Topics, Enhanced UX, Preview Mode, Supervised Auto-Approval)
**Version**: 1.0
**Last Updated**: January 27, 2026

---

## Overview

This guide covers comprehensive UAT testing for the Coach-Parent AI Summaries system, which transforms coach voice note insights into parent-friendly summaries with AI assistance, progressive trust-based automation, and safety guardrails.

**Key Features**:
- AI-generated parent summaries from voice note insights
- Coach approval workflow (approve/suppress/edit)
- Sensitivity classification (normal/injury/behavior)
- Trust level system with progressive automation
- Preview mode (show what AI would do)
- Supervised auto-approval with 1-hour revoke window
- Parent notification and viewing

---

## Prerequisites

### Test Accounts

| Role | Email | Password | Organization | Notes |
|------|-------|----------|--------------|-------|
| **Coach (L2)** | `neil.B@blablablak.com` | `lien1979` | Test Org | Trust Level 2+ for auto-approval |
| **Coach (L0)** | (create test user) | varies | Test Org | Trust Level 0 for manual testing |
| **Parent** | `neilparent@skfjkadsfdgsjdgsj.com` | `lien1979` | Test Org | Has linked children |

### Required Setup

1. Dev server running on http://localhost:3000
2. Convex backend deployed
3. Anthropic API key configured (`ANTHROPIC_API_KEY` in Convex environment)
4. At least 1 coach with voice notes containing player insights
5. At least 1 parent with linked child (guardianPlayerLinks)
6. Test org with players on teams

### Test Data
- Players: At least 3 players with different names
- Voice notes: At least 5 voice notes with various insight types
- Trust levels: Coaches at Level 0, Level 2, and Level 3

---

## Phase 1: Core Infrastructure

### Purpose
Verify AI summary generation, coach approval workflow, and parent viewing.

### TC-PS1-001: Schema Tables Exist
**Test**: Check Convex dashboard for tables
**Expected**:
- ✅ coachParentSummaries table exists
- ✅ Fields: voiceNoteId, insightId, coachId, playerIdentityId, organizationId, sportId
- ✅ Fields: status (pending_review/approved/suppressed/auto_approved/delivered/viewed)
- ✅ Fields: privateInsight (title, description, category, sentiment)
- ✅ Fields: publicSummary (content, confidenceScore, generatedAt)
- ✅ Fields: sensitivityCategory (normal/injury/behavior)
- ✅ Indexes: by_voiceNote, by_player, by_coach, by_org_status

### TC-PS1-002: parentSummaryViews Table
**Test**: Check view tracking table
**Expected**:
- ✅ parentSummaryViews table exists
- ✅ Fields: summaryId, guardianIdentityId, viewedAt, viewSource
- ✅ Indexes: by_summary, by_guardian

### TC-PS1-003: AI Summary Generation - Normal Insight
**Test**: Create voice note with skill insight
**Steps**:
1. Login as coach
2. Create voice note mentioning player skill improvement
3. Wait for AI processing (insights extraction)
4. Check that summary is generated

**Expected**:
- ✅ coachParentSummaries record created
- ✅ privateInsight contains original insight
- ✅ publicSummary contains parent-friendly version
- ✅ confidenceScore between 0.0 and 1.0
- ✅ status = "pending_review"
- ✅ sensitivityCategory = "normal"

### TC-PS1-004: AI Summary Generation - Injury Insight
**Test**: Voice note with injury mention
**Steps**:
1. Create voice note: "John was limping after practice, might have twisted his ankle"
2. Wait for processing

**Expected**:
- ✅ Summary created
- ✅ sensitivityCategory = "injury"
- ✅ status = "pending_review" (NEVER auto-approved)

### TC-PS1-005: AI Summary Generation - Behavior Insight
**Test**: Voice note with behavioral observation
**Steps**:
1. Create voice note: "Sarah had an argument with teammate during drills"
2. Wait for processing

**Expected**:
- ✅ Summary created
- ✅ sensitivityCategory = "behavior"
- ✅ status = "pending_review" (NEVER auto-approved)

### TC-PS1-006: Coach Pending Summaries Query
**Test**: Coach sees pending summaries
**Steps**:
1. Navigate to `/orgs/[orgId]/coach/voice-notes`
2. Click "Parents" tab or "Pending Parent Summaries" section

**Expected**:
- ✅ getCoachPendingSummaries query called
- ✅ Displays summaries with status = "pending_review"
- ✅ Shows player name
- ✅ Shows AI-generated summary content
- ✅ Shows confidence score

### TC-PS1-007: Approve Summary
**Test**: Coach approves a summary
**Steps**:
1. View pending summary card
2. Click "Approve" button
3. Wait for response

**Expected**:
- ✅ approveSummary mutation called
- ✅ status changes to "approved"
- ✅ approvedAt timestamp set
- ✅ approvedBy = coach userId
- ✅ Toast notification: "Summary approved"
- ✅ Card removed from pending list

### TC-PS1-008: Suppress Summary
**Test**: Coach suppresses (doesn't send)
**Steps**:
1. View pending summary card
2. Click "Don't Share" or "Suppress" button
3. Confirm action

**Expected**:
- ✅ suppressSummary mutation called
- ✅ status changes to "suppressed"
- ✅ Summary never reaches parent
- ✅ Toast notification confirms
- ✅ Card removed from pending list

### TC-PS1-009: Parent Unread Count
**Test**: Parent sees unread badge
**Steps**:
1. Login as parent
2. Check navigation/sidebar

**Expected**:
- ✅ getParentUnreadCount query returns correct count
- ✅ Badge shows number of unread summaries
- ✅ Badge only shows if count > 0
- ✅ Format: "9+" if count > 9

### TC-PS1-010: Parent View Summaries
**Test**: Parent sees their summaries grouped by child/sport
**Steps**:
1. Login as parent
2. Navigate to Coach Feedback or Messages section
3. Look for summaries

**Expected**:
- ✅ getParentSummariesByChildAndSport query called
- ✅ Summaries grouped by child first
- ✅ Then grouped by sport within each child
- ✅ Unread count per sport displayed
- ✅ NEW badge on unread summaries

### TC-PS1-011: Parent Mark Summary as Viewed
**Test**: Viewing summary marks it as read
**Steps**:
1. As parent, click to expand/view a summary
2. Check database

**Expected**:
- ✅ markSummaryViewed mutation called
- ✅ viewedAt timestamp set
- ✅ status changes to "viewed"
- ✅ parentSummaryViews record created
- ✅ viewSource recorded (dashboard/notification_click/direct_link)
- ✅ Unread count decreases

---

## Phase 2: Trust Level System

### Purpose
Test trust level tracking, progression, and UI components.

### TC-PS2-001: coachTrustLevels Table
**Test**: Verify trust level schema
**Expected**:
- ✅ Table exists with fields: coachId, organizationId, currentLevel, preferredLevel
- ✅ Fields: totalApprovals, totalSuppressed, consecutiveApprovals
- ✅ Fields: lastActivityAt, createdAt, updatedAt, levelHistory
- ✅ Index: by_coach_org

### TC-PS2-002: Trust Level Creation on First Activity
**Test**: First approval creates trust record
**Steps**:
1. Use coach with no trust level record
2. Approve a summary
3. Check database

**Expected**:
- ✅ coachTrustLevels record created (via getOrCreateTrustLevel)
- ✅ currentLevel = 0 initially
- ✅ totalApprovals = 1
- ✅ consecutiveApprovals = 1

### TC-PS2-003: Trust Metrics Update on Approval
**Test**: Approving increments counters
**Steps**:
1. Coach approves summary
2. Check trust level record

**Expected**:
- ✅ totalApprovals increments
- ✅ consecutiveApprovals increments
- ✅ lastActivityAt updated

### TC-PS2-004: Trust Metrics Update on Suppress
**Test**: Suppressing resets consecutive
**Steps**:
1. Coach suppresses summary
2. Check trust level

**Expected**:
- ✅ totalSuppressed increments
- ✅ consecutiveApprovals reset to 0
- ✅ lastActivityAt updated

### TC-PS2-005: Trust Level Progression - Level 1
**Test**: Reach Level 1 (10 approvals)
**Steps**:
1. Coach approves 10 summaries
2. Check trust level

**Expected**:
- ✅ currentLevel changes to 1
- ✅ levelHistory array has entry: { level: 1, changedAt, reason: "Reached 10 approvals" }

### TC-PS2-006: Trust Level Progression - Level 2
**Test**: Reach Level 2 (50 approvals, <10% suppress rate)
**Steps**:
1. Coach reaches 50 approvals
2. Suppress rate < 10%
3. Check level

**Expected**:
- ✅ currentLevel = 2
- ✅ levelHistory updated

### TC-PS2-007: Trust Level Display
**Test**: Coach sees their trust level
**Steps**:
1. Navigate to voice notes dashboard
2. Look for trust level indicator

**Expected**:
- ✅ TrustLevelIndicator component renders
- ✅ Shows level name: New/Learning/Trusted/Expert
- ✅ Badge with appropriate color
- ✅ Progress bar to next level
- ✅ Text shows approvals count and threshold

### TC-PS2-008: Preferred Level Setting
**Test**: Coach can cap automation level
**Steps**:
1. Click settings icon on trust indicator
2. Dialog opens with preference options
3. Select Level 1 (even if earned Level 2)
4. Save

**Expected**:
- ✅ setCoachPreferredLevel mutation called
- ✅ preferredLevel field updated
- ✅ currentLevel does NOT downgrade if > preferredLevel (yet)
- ✅ Future auto-approval respects cap

### TC-PS2-009: Trust Nudge Banner
**Test**: Encouragement when close to next level
**Steps**:
1. Coach has 8 approvals (2 away from Level 1)
2. View dashboard

**Expected**:
- ✅ TrustNudgeBanner appears
- ✅ Message: "Just 2 more approvals to reach Learning level!"
- ✅ Dismiss button works
- ✅ Dismissal persists in localStorage

---

## Phase 3: Sensitive Topics

### Purpose
Test injury and behavior workflows with special handling.

### TC-PS3-001: Injury Classification
**Test**: AI classifies injury insights
**Steps**:
1. Create voice note with injury keywords: "twisted ankle", "limping", "collision"
2. Wait for processing

**Expected**:
- ✅ classifyInsightSensitivity action called
- ✅ Returns category: "injury"
- ✅ confidence > 0.7
- ✅ reason explains why (e.g., "mentions injury keywords")

### TC-PS3-002: Behavior Classification
**Test**: AI classifies behavior insights
**Steps**:
1. Create voice note: "argument with teammate", "not listening", "attitude problem"
2. Wait for processing

**Expected**:
- ✅ category: "behavior"
- ✅ confidence > 0.7
- ✅ reason provided

### TC-PS3-003: Normal Classification
**Test**: Skill improvement classified as normal
**Steps**:
1. Create voice note: "great passing today", "improved shooting technique"

**Expected**:
- ✅ category: "normal"
- ✅ No special handling needed

### TC-PS3-004: Injury Summary Card
**Test**: Special card for injury summaries
**Steps**:
1. Create injury-related summary
2. View in coach pending list

**Expected**:
- ✅ InjuryApprovalCard component renders (not standard card)
- ✅ Amber/warning border
- ✅ "⚠️ INJURY-RELATED INSIGHT" banner
- ✅ Checklist displayed:
  - "I personally observed this injury"
  - "The severity description is accurate"
  - "This contains no medical advice"
- ✅ Approve button disabled until all 3 checked

### TC-PS3-005: Injury Checklist Enforcement
**Test**: Cannot approve without checklist
**Steps**:
1. View injury summary card
2. Try to click Approve without checking boxes

**Expected**:
- ✅ Button disabled
- ✅ Tooltip or disabled state clear

**Steps**:
1. Check all 3 boxes
2. Click Approve

**Expected**:
- ✅ Button enabled
- ✅ approveInjurySummary mutation called (not standard approveSummary)
- ✅ Checklist responses stored in injuryApprovalChecklist table
- ✅ Summary approved

### TC-PS3-006: Behavior Summary Card
**Test**: Special card for behavior summaries
**Steps**:
1. Create behavior-related summary
2. View in pending list

**Expected**:
- ✅ BehaviorApprovalCard renders
- ✅ Blue info styling
- ✅ Banner: "Behavioral observations require manual review"
- ✅ No checklist (simpler than injury)
- ✅ Standard approve/suppress buttons

### TC-PS3-007: Sensitivity Badge
**Test**: Visual indicator on cards
**Steps**:
1. View summaries of different categories

**Expected**:
- ✅ SensitivityBadge component on each card
- ✅ Injury: amber/yellow with AlertTriangle icon
- ✅ Behavior: blue with Shield icon
- ✅ Normal: no badge (returns null)

### TC-PS3-008: Auto-Approval Block - Injury
**Test**: Injury never auto-approves
**Steps**:
1. Coach at Level 3 (full automation)
2. Create injury summary
3. Check status

**Expected**:
- ✅ status = "pending_review" (NOT "auto_approved")
- ✅ ALWAYS requires manual review
- ✅ Console log: "Auto-approval blocked: injury sensitivity requires manual review"

### TC-PS3-009: Auto-Approval Block - Behavior
**Test**: Behavior never auto-approves
**Steps**:
1. Coach at Level 3
2. Create behavior summary

**Expected**:
- ✅ status = "pending_review"
- ✅ Manual review required
- ✅ Log message explains why

---

## Phase 4: Enhanced Parent Experience

### Purpose
Test browser notifications, shareable images, and passport deep links.

### TC-PS4-001: Browser Tab Notification
**Test**: Tab title shows unread count
**Steps**:
1. Login as parent
2. Have unread summaries
3. Check browser tab title

**Expected**:
- ✅ Title: "(N) Messages | PlayerARC"
- ✅ N = unread count
- ✅ Updates in real-time when summaries are read
- ✅ Only works for parent role (not coaches)

### TC-PS4-002: Passport Deep Link
**Test**: "View in Passport" button navigation
**Steps**:
1. Login as parent
2. Find summary card
3. Click "View in Passport" button

**Expected**:
- ✅ Button visible with arrow icon
- ✅ getPassportLinkForSummary query called
- ✅ Navigates to `/orgs/[orgId]/parents/children/[playerId]/passport?section=skills`
- ✅ Section mapping:
  - skill_rating → "skills"
  - skill_progress → "goals"
  - injury → "medical"
  - behavior → "overview"

### TC-PS4-003: Shareable Image Generation
**Test**: Generate share card image
**Steps**:
1. As parent, click share button (Share2 icon) on summary card
2. Modal opens

**Expected**:
- ✅ ShareModal opens
- ✅ Loading spinner shows
- ✅ generateShareableImage action called
- ✅ Image generates (1200x630 OG format)
- ✅ Image shows:
  - PlayerARC branding
  - Player name
  - Summary content
  - Coach name + organization
  - Date
  - Gradient background (blue to purple)

### TC-PS4-004: Download Image
**Test**: Download generated image
**Steps**:
1. Open share modal (image generated)
2. Click "Download Image" button

**Expected**:
- ✅ trackShareEvent mutation called with destination: "download"
- ✅ File downloads as PNG
- ✅ Filename: `playerarc-feedback-YYYY-MM-DD.png`
- ✅ Toast notification on success

### TC-PS4-005: Native Share (Mobile)
**Test**: Web Share API
**Steps**:
1. On mobile device (iOS Safari or Android Chrome)
2. Open share modal
3. Click "Share" button

**Expected**:
- ✅ Share button only shows if `navigator.share` available
- ✅ Native share sheet opens
- ✅ Can share to apps (WhatsApp, Messages, etc.)
- ✅ trackShareEvent called with destination: "native_share"

### TC-PS4-006: Sport Icons
**Test**: Visual icons on parent dashboard
**Steps**:
1. As parent, view coach feedback section
2. Check sport section headers

**Expected**:
- ✅ Icons next to sport names
- ✅ Football/Soccer → Football icon
- ✅ GAA → Trophy icon
- ✅ Basketball → Basketball icon
- ✅ Unknown sports → Activity icon (fallback)

### TC-PS4-007: Unread Badges per Sport
**Test**: Per-sport unread counts
**Steps**:
1. As parent with unread summaries in multiple sports
2. View coach feedback

**Expected**:
- ✅ Badge next to each sport header
- ✅ Shows unread count for that sport only
- ✅ Badge uses destructive variant (red)
- ✅ Only appears if count > 0

---

## Phase 5: Preview Mode & Trust Slider

### Purpose
Test transparency features showing what AI would do without actually doing it.

### TC-PS5-001: wouldAutoApprove Calculation
**Test**: Backend predicts auto-approval
**Steps**:
1. Coach at Level 2, confidence threshold 0.7
2. Query pending summaries

**Expected**:
- ✅ getCoachPendingSummaries returns wouldAutoApprove field
- ✅ wouldAutoApprove = true if:
  - sensitivityCategory === "normal"
  - currentLevel >= 2
  - confidenceScore >= threshold (0.7)
- ✅ wouldAutoApprove = false otherwise

### TC-PS5-002: Confidence Visualization
**Test**: Confidence score displayed
**Steps**:
1. View pending summary card
2. Check for confidence section

**Expected**:
- ✅ Progress bar shows confidenceScore as percentage
- ✅ Text: "AI Confidence: 75%"
- ✅ Color coding:
  - Red: < 60%
  - Amber: 60-79%
  - Green: 80%+

### TC-PS5-003: Preview Mode Badge
**Test**: Shows what AI would do
**Steps**:
1. View high-confidence normal summary (Level 2+ coach)
2. Look for prediction badge

**Expected**:
- ✅ Badge visible: "AI would auto-send this"
- ✅ Sparkles icon
- ✅ Blue/purple color (secondary variant)
- ✅ Only shows if wouldAutoApprove = true

**Steps** (Low Confidence or Sensitive):
- ✅ Shows text: "Requires manual review" if wouldAutoApprove = false

### TC-PS5-004: Trust Slider UI
**Test**: Coach adjusts confidence threshold
**Steps**:
1. Open trust settings (Settings icon on trust indicator)
2. Find confidence threshold slider

**Expected**:
- ✅ Slider control visible
- ✅ Range: 60% to 90%
- ✅ Default: 70%
- ✅ Current value displayed
- ✅ Helper text explains: "Higher = fewer auto-approvals but more accuracy"

### TC-PS5-005: Preview Mode Statistics Tracking
**Test**: System learns agreement rate
**Steps**:
1. Coach in preview mode (not yet automated)
2. Approve summary that shows "AI would auto-send"
3. Check trust level record

**Expected**:
- ✅ insightPreviewModeStats.wouldAutoApplyInsights increments
- ✅ insightPreviewModeStats.coachApprovedThose increments
- ✅ agreementRate calculated: approved / total
- ✅ After 20 insights, completedAt set (preview complete)

### TC-PS5-006: Preview Mode Completion
**Test**: Transition out of preview after 20 insights
**Steps**:
1. Coach approves 20 insights (mix of would/wouldn't auto-send)
2. Check trust level

**Expected**:
- ✅ previewModeStats.completedAt timestamp set
- ✅ agreementRate > 70% suggests coach trusts AI
- ✅ Coach ready for supervised auto-approval (Phase 6)

---

## Phase 6: Supervised Auto-Approval

### Purpose
Test actual automation with 1-hour safety window.

### TC-PS6-001: Auto-Approval Decision Logic
**Test**: Verify autoApprovalDecision lib
**Steps**:
1. Test decideAutoApproval function with various scenarios

**Expected**:
- ✅ Returns { shouldAutoApprove, reason, tier }
- ✅ NEVER auto-approve if sensitivityCategory !== "normal"
- ✅ Require effectiveLevel >= 2
- ✅ Require confidenceScore >= threshold
- ✅ Level 3 auto-approves all normal (full automation)

### TC-PS6-002: Summary Created with Auto-Approval
**Test**: New summary auto-approves for eligible coach
**Steps**:
1. Coach at Level 2, threshold 0.7
2. Create voice note with high-confidence skill insight
3. Wait for processing

**Expected**:
- ✅ Summary created
- ✅ status = "auto_approved" (not "pending_review")
- ✅ approvedAt = Date.now()
- ✅ approvedBy = "system:auto"
- ✅ scheduledDeliveryAt = approvedAt + 1 hour
- ✅ autoApprovalDecision field populated

### TC-PS6-003: Auto-Approval Blocked - Low Trust
**Test**: Level 0 coach, no auto-approval
**Steps**:
1. Coach at Level 0
2. Create high-confidence summary

**Expected**:
- ✅ status = "pending_review"
- ✅ autoApprovalDecision.shouldAutoApprove = false
- ✅ reason: "Requires trust level 2 or higher"

### TC-PS6-004: Auto-Approval Blocked - Low Confidence
**Test**: Confidence below threshold
**Steps**:
1. Level 2 coach, threshold 0.7
2. Summary with confidence 0.65

**Expected**:
- ✅ status = "pending_review"
- ✅ shouldAutoApprove = false
- ✅ reason: "Confidence 65% below 70% threshold"

### TC-PS6-005: Auto-Approved Tab
**Test**: New tab shows auto-sent summaries
**Steps**:
1. Navigate to voice notes dashboard
2. Click "Auto-Sent" tab (only visible if Level 2+)

**Expected**:
- ✅ Tab visible for Level 2+ coaches only
- ✅ Shows count badge: "Auto-Sent (N)" where N = pending delivery count
- ✅ getAutoApprovedSummaries query called
- ✅ Displays last 7 days of auto-approved summaries

### TC-PS6-006: Auto-Approved Card Display
**Test**: Card shows auto-sent summary details
**Steps**:
1. View auto-sent tab
2. Check card content

**Expected**:
- ✅ Green badge: "✓ Auto-Applied"
- ✅ Time applied: "Applied 23 minutes ago" (relative time)
- ✅ What changed shown (if applicable)
- ✅ Player name and summary content
- ✅ Confidence score with progress bar
- ✅ Undo button visible

### TC-PS6-007: Revoke Within 1 Hour
**Test**: Coach can undo auto-approved summary
**Steps**:
1. Find auto-approved summary < 1 hour old
2. Click "Undo" button
3. Dialog opens with reason checkboxes:
   - Wrong player
   - Wrong rating/content
   - Insight incorrect
   - Other (text field)
4. Select reason, submit

**Expected**:
- ✅ revokeSummary mutation called
- ✅ Reason required
- ✅ status changes to "suppressed"
- ✅ revokedAt, revokedBy, revocationReason set
- ✅ viewedAt must be null (can't revoke if parent already viewed)
- ✅ Toast: "Auto-apply undone. Summary suppressed."
- ✅ Trust metrics updated (counts as suppression)

### TC-PS6-008: Revoke After 1 Hour - Blocked
**Test**: Undo window expired
**Steps**:
1. Find auto-approved summary > 1 hour old
2. Check undo button state

**Expected**:
- ✅ Undo button disabled
- ✅ Tooltip: "Undo window expired (must undo within 1 hour)"
- ✅ revokeSummary mutation rejects with error

### TC-PS6-009: Revoke After Parent Viewed - Blocked
**Test**: Cannot revoke if parent saw it
**Steps**:
1. Parent views auto-approved summary (viewedAt set)
2. Coach tries to revoke

**Expected**:
- ✅ Undo button disabled
- ✅ Text: "Viewed by parent" or similar
- ✅ Mutation returns: { success: false, error: "Summary already viewed by parent" }

### TC-PS6-010: Scheduled Delivery
**Test**: Verify delivery timing
**Steps**:
1. Summary auto-approved
2. scheduledDeliveryAt set to 1 hour future
3. Wait or check database

**Expected**:
- ✅ Summary not immediately delivered to parent
- ✅ Parent cannot see it yet (status checks exclude auto_approved?)
- ✅ After 1 hour (or manual trigger), status → "delivered"
- ✅ Parent can now view

---

## Integration Tests

### End-to-End Workflows

### Workflow 1: New Coach → Trust Progression → Automation
**Steps**:
1. New coach (Level 0) creates voice note
2. Summary generated, status = "pending_review"
3. Coach approves 10 summaries → Level 1
4. Coach approves 50 summaries (with < 10% suppress) → Level 2
5. Next summary auto-approves
6. Coach sees "Auto-Sent" tab
7. Coach can revoke within 1 hour

**Expected**:
- ✅ Full progression from manual to automated
- ✅ Trust levels update correctly
- ✅ Auto-approval kicks in at Level 2
- ✅ Safety window maintained

### Workflow 2: Injury Handling
**Steps**:
1. Level 3 coach (full automation) creates voice note with injury
2. AI classifies as injury
3. Summary created with sensitivityCategory = "injury"
4. Check status

**Expected**:
- ✅ status = "pending_review" (auto-approval blocked)
- ✅ InjuryApprovalCard shown to coach
- ✅ Checklist required for approval
- ✅ Never auto-approves regardless of trust level

### Workflow 3: Parent Experience
**Steps**:
1. Coach approves summary
2. Parent logs in
3. Parent sees unread badge
4. Parent navigates to Messages
5. Parent views summary (grouped by child/sport)
6. Parent clicks "View in Passport"
7. Parent shares image

**Expected**:
- ✅ Notification appears
- ✅ Summary grouped correctly
- ✅ Passport navigation works
- ✅ Image generation works
- ✅ View tracked, unread count updates

### Workflow 4: Preview Mode → Automation
**Steps**:
1. Coach in preview mode (no automation yet)
2. Coach sees "AI would auto-send" badges
3. Coach approves 20 insights
4. agreementRate > 70%
5. Trust level increases to 2
6. Next insights auto-approve

**Expected**:
- ✅ Transparency before automation
- ✅ Coach understands AI behavior
- ✅ Smooth transition to automation
- ✅ Revoke window provides safety net

---

## Regression Tests

### After Any Code Changes

- [ ] AI summary generation works for all insight types
- [ ] Coach approval/suppress workflow functional
- [ ] Parent viewing and marking as read works
- [ ] Trust levels calculate and progress correctly
- [ ] Injury/behavior summaries never auto-approve
- [ ] Confidence visualization displays accurately
- [ ] Auto-approval respects trust level and threshold
- [ ] Revoke window enforced (1 hour)
- [ ] Parent notifications and badges update

---

## Performance Tests

### AI Generation Time
**Test**: Summary generation speed
**Expected**: < 3 seconds per summary (with API calls)

### Query Response Times
- getCoachPendingSummaries: < 500ms
- getParentSummariesByChildAndSport: < 1 second
- getCoachTrustLevel: < 200ms

### Image Generation
**Test**: Shareable image creation
**Expected**: < 2 seconds first time, cached thereafter

---

## Known Issues & Limitations

### Current Behavior
- Auto-approval only for "normal" category (injury/behavior always manual)
- 1-hour revoke window not configurable
- Parent sees summaries immediately after approval (no batching)
- Confidence threshold applies globally (not per-category)

### Expected Edge Cases
- If coach deletes voice note, summaries remain (by design)
- If player removed from team, old summaries still visible
- Multi-sport players get separate summary streams per sport

---

## Troubleshooting

### Summaries not generating
- Check ANTHROPIC_API_KEY configured in Convex
- Verify voice note has insights extracted
- Check console for AI action errors
- Verify classifyInsightSensitivity and generateParentSummary actions exist

### Auto-approval not working
- Verify coach trust level >= 2
- Check confidenceScore >= threshold (default 0.7)
- Ensure sensitivityCategory === "normal"
- Check autoApprovalDecision field in summary

### Revoke failing
- Check elapsed time < 1 hour
- Verify viewedAt is null (parent hasn't viewed)
- Check coach owns the summary (coachId matches)

### Parent not seeing summaries
- Verify guardianPlayerLinks exist
- Check summary status = "approved" or "delivered"
- Verify organizationId matches parent's org

---

## Success Criteria

✅ **All 6 phases implemented and tested**
✅ **AI generates accurate parent-friendly summaries**
✅ **Coach approval workflow smooth**
✅ **Sensitive topics handled safely**
✅ **Trust progression works correctly**
✅ **Preview mode provides transparency**
✅ **Auto-approval with safety window functional**
✅ **Parent experience polished**

**Total Test Cases**: 60+
**Estimated Test Time**: 6-8 hours (full suite)
**Quick Smoke Test**: 45 minutes (core workflows)

---

**Tested By**: _______________
**Date**: _______________
**Environment**: _______________
**Result**: _______________

---

*Generated by Claude Code - January 27, 2026*
