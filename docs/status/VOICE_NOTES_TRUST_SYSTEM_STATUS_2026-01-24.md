# Voice Notes & Trust System - Complete Implementation Status
**Date:** January 24, 2026
**Review Type:** Full codebase audit (no assumptions)
**Status:** Post-Phase 4, Pre-Phase 5

---

## Executive Summary

### ✅ Fully Implemented (Phases 1-4)
- **Phase 1**: AI parent summary generation with manual approval
- **Phase 2**: Trust level tracking and progression system
- **Phase 3**: Sensitive topic workflows (injury/behavior)
- **Phase 4**: Enhanced parent experience (tab notifications, shareable images, passport links)

### ❌ Not Implemented (Phases 5-6)
- **Phase 5**: Auto-approval based on trust levels
- **Phase 6**: Cost monitoring, rate limiting, admin controls

### 🎯 Key Gap
**NO AUTO-APPROVAL LOGIC EXISTS** - Trust levels are earned and tracked, but they don't actually automate anything yet. All summaries still require manual coach approval regardless of trust level.

---

## Detailed Implementation Status

### PHASE 1: AI Summary Generation ✅ COMPLETE

#### Backend (100%)
**Schema Tables:**
- ✅ `coachParentSummaries` - Full implementation with all fields
  - voiceNoteId, insightId, coachId, playerIdentityId, organizationId, sportId
  - privateInsight (title, description, category, sentiment)
  - publicSummary (content, confidenceScore, generatedAt)
  - sensitivityCategory (normal/injury/behavior)
  - sensitivityReason, sensitivityConfidence
  - status (pending_review/approved/suppressed/auto_approved/delivered/viewed)
  - Timestamps: createdAt, approvedAt, approvedBy, deliveredAt, viewedAt, acknowledgedAt
  - 7 indexes: by_voiceNote, by_player, by_coach, by_org_status, by_org_player_sport, by_coach_org_status, by_player_org_status

- ✅ `parentSummaryViews` - View tracking
  - summaryId, guardianIdentityId, viewedAt, viewSource
  - 2 indexes: by_summary, by_guardian

**Models (packages/backend/convex/models/coachParentSummaries.ts - 1,307 lines):**
- ✅ `createParentSummary` (internalMutation) - Creates summary record
- ✅ `approveSummary` (mutation) - Coach approves normal summary
- ✅ `suppressSummary` (mutation) - Coach suppresses summary
- ✅ `editSummaryContent` (mutation) - Coach edits pending summary
- ✅ `getCoachPendingSummaries` (query) - Coach's pending approval queue
- ✅ `getParentUnreadCount` (query) - Parent's unread count for badge
- ✅ `getParentSummariesByChildAndSport` (query) - Parent dashboard grouped data
- ✅ `markSummaryViewed` (mutation) - Parent marks summary as viewed
- ✅ `acknowledgeParentSummary` (mutation) - Parent acknowledges summary
- ✅ `acknowledgeAllForPlayer` (mutation) - Bulk acknowledge

**Actions (packages/backend/convex/actions/coachParentSummaries.ts - 477 lines):**
- ✅ `classifyInsightSensitivity` (internalAction) - AI classifies as normal/injury/behavior
- ✅ `generateParentSummary` (internalAction) - AI generates parent-friendly text
- ✅ `processVoiceNoteInsight` (internalAction) - Orchestrates full pipeline
  - Checks `shouldSkipSensitiveInsights` setting (Phase 2 integration)
  - Always creates summaries with status `pending_review`
  - **NO auto-approval logic present**

#### Frontend (100%)
**Approval Cards (coach view):**
- ✅ `summary-approval-card.tsx` - Normal summary approval
- ✅ `injury-approval-card.tsx` - Injury with safety checklist
- ✅ `behavior-approval-card.tsx` - Behavior observations

**Parent Display:**
- ✅ `parent-summary-card.tsx` - Individual summary card
- ✅ `coach-feedback.tsx` - Grouped by child and sport
- ✅ `child-summary-card.tsx` - Child summary overview

**Voice Notes Tabs:**
- ✅ `parents-tab.tsx` - Pending summaries approval queue
  - Fetches `getCoachPendingSummaries`
  - Routes to correct card based on `sensitivityCategory`
  - Calls `approveSummary`, `suppressSummary`, or `approveInjurySummary`

---

### PHASE 2: Trust Level System ✅ COMPLETE

#### Backend (100%)
**Schema Tables:**
- ✅ `coachTrustLevels` - Platform-wide trust (660 lines in model)
  - coachId (Better Auth user ID)
  - currentLevel (0-3), preferredLevel
  - totalApprovals, totalSuppressed, consecutiveApprovals
  - levelHistory array
  - lastActivityAt, createdAt, updatedAt
  - 1 index: by_coach

- ✅ `coachOrgPreferences` - Per-org settings
  - coachId, organizationId
  - parentSummariesEnabled (default true)
  - skipSensitiveInsights (default false)
  - 3 indexes: by_coach_org, by_coach, by_org

**Trust Calculator (packages/backend/convex/lib/trustLevelCalculator.ts - 143 lines):**
- ✅ `TRUST_LEVEL_THRESHOLDS` - Exported constants
  - Level 1: 10+ approvals
  - Level 2: 50+ approvals, <10% suppression rate
  - Level 3: 200+ approvals, requires opt-in
- ✅ `calculateTrustLevel()` - Pure function to calculate earned level
- ✅ `calculateProgressToNextLevel()` - Shows progress with percentage

**Models (packages/backend/convex/models/coachTrustLevels.ts - 660 lines):**
- ✅ `getOrCreateTrustLevel` (internalMutation) - Creates record on first use
- ✅ `updateTrustMetrics` (internalMutation) - Updates counters after coach actions
  - Called from `approveSummary`, `suppressSummary`, `approveInjurySummary`
  - Recalculates trust level after each action
  - Respects `preferredLevel` cap (won't auto-upgrade past preference)
- ✅ `setCoachPreferredLevel` (mutation) - Coach sets max automation level
- ✅ `setParentSummariesEnabled` (mutation) - Toggle summaries on/off per org
- ✅ `setSkipSensitiveInsights` (mutation) - Toggle skipping injury/behavior per org
- ✅ `getCoachTrustLevel` (query) - Get trust level with progress data
- ✅ `getCoachPlatformTrustLevel` (query) - Platform-wide trust level
- ✅ `getCoachAllOrgPreferences` (query) - All org preferences for coach
- ✅ `isParentSummariesEnabled` (internalQuery) - Check if enabled for org
- ✅ `shouldSkipSensitiveInsights` (internalQuery) - Check if skipping sensitive

#### Frontend (100%)
**Components:**
- ✅ `trust-level-icon.tsx` - Clickable icon showing current level
- ✅ `trust-level-indicator.tsx` - Full indicator with progress bar
- ✅ `trust-nudge-banner.tsx` - Encouragement when close to next level
- ✅ `trust-preference-settings.tsx` - Radio group to select preferred level
  - Shows 4 levels (0-3) with descriptions
  - Disables levels not yet earned
  - Shows warning for Level 3 (full automation)
  - Note about earning higher levels

**Integration:**
- ✅ `voice-notes-dashboard.tsx` - Queries `getCoachTrustLevel`
  - Shows trust level icon (clickable to open settings)
  - Shows trust nudge banner (localStorage dismissed state)
  - Auto-dismisses nudge when level changes

- ✅ `settings-tab.tsx` - Full settings UI
  - Trust preference settings (radio group)
  - Parent summaries toggle (per-org)
  - Skip sensitive insights toggle (per-org)
  - All mutations wired with toast feedback

---

### PHASE 3: Sensitive Topics ✅ COMPLETE

#### Backend (100%)
**Schema:**
- ✅ `injuryApprovalChecklist` - Audit trail for injury approvals
  - summaryId, coachId
  - personallyObserved, severityAccurate, noMedicalAdvice (all boolean)
  - completedAt
  - 1 index: by_summary

**Models:**
- ✅ `approveInjurySummary` (mutation) - Special injury approval with checklist
  - Validates all 3 checkboxes are true
  - Creates `injuryApprovalChecklist` record
  - Updates summary status to approved
  - Calls `updateTrustMetrics`

**Actions:**
- ✅ `classifyInsightSensitivity` - Enhanced with examples (few-shot prompting)
- ✅ `processVoiceNoteInsight` - Checks `shouldSkipSensitiveInsights`
  - If coach has skipSensitiveInsights enabled, returns null for injury/behavior
  - Otherwise creates summary with appropriate sensitivityCategory

#### Frontend (100%)
**Approval Cards:**
- ✅ `injury-approval-card.tsx` - Injury-specific card
  - Prominent warning banner: "⚠️ INJURY-RELATED INSIGHT"
  - 3 required checkboxes (personallyObserved, severityAccurate, noMedicalAdvice)
  - Approve button disabled until all checked
  - Calls `approveInjurySummary` mutation
  - Amber/warning styling

- ✅ `behavior-approval-card.tsx` - Behavior-specific card
  - Info banner with Lock icon: "Behavioral observations require manual review"
  - Blue info styling
  - No checklist - uses standard `approveSummary` mutation
  - Manual review requirement enforced

**Tab Integration:**
- ✅ `parents-tab.tsx` - Routes to correct card based on sensitivityCategory
  - `if (category === 'injury')` → InjuryApprovalCard
  - `if (category === 'behavior')` → BehaviorApprovalCard
  - `else` → SummaryApprovalCard
  - Sorts: injury > behavior > normal (by priority)

---

### PHASE 4: Enhanced Parent Experience ✅ COMPLETE

#### Backend (100%)
**Schema:**
- ✅ `summaryShares` - Track when parents share
  - summaryId, guardianIdentityId, sharedAt
  - shareDestination (download/native_share/copy_link)
  - 2 indexes: by_summary, by_guardian

**Queries/Mutations:**
- ✅ `trackShareEvent` (mutation) - Tracks share events for analytics
- ✅ `getPassportLinkForSummary` (query) - Maps category to passport section
  - skill_rating → 'skills'
  - skill_progress → 'goals'
  - injury → 'medical'
  - behavior/default → 'overview'
  - Returns { section, url }

- ✅ `getSummaryForImage` (internalQuery) - Fetches summary data for image generation
- ✅ `getSummaryForPDF` (query) - Fetches summary data for PDF generation

**Actions:**
- ✅ `generateShareableImage` (action) - Creates branded 1200x630 PNG
  - Uses satori (JSX to SVG) and resvg (SVG to PNG)
  - PlayerARC branding with gradient background
  - Uploads to Convex storage
  - Returns URL

#### Frontend (100%)
**Hooks:**
- ✅ `use-tab-notification.ts` - Updates document.title with unread count
  - Format: `(count) Messages | PlayerARC`
  - Stores and restores original title

**Providers:**
- ✅ `tab-notification-provider.tsx` - Wraps app with notification logic
  - Checks if activeFunctionalRole === 'parent'
  - Queries `getParentUnreadCount`
  - Passes count to useTabNotification hook

**Components:**
- ✅ `message-passport-link.tsx` - "View in Passport" link
  - Uses `getPassportLinkForSummary` query
  - Shows loading state
  - Uses router.push() for navigation

- ✅ `share-modal.tsx` - Modal for sharing images
  - Generates image on open using `generateShareableImage` action
  - Shows preview
  - Download button (tracks with shareDestination: 'download')
  - Native share button if available (tracks with shareDestination: 'native_share')

**Integration:**
- ✅ `parent-summary-card.tsx` - Enhanced with:
  - MessagePassportLink in footer
  - Share button opening ShareModal
  - Tracks share events

- ✅ `coach-feedback.tsx` - Enhanced with:
  - Sport icons per section
  - Unread badge per sport (from query data)

- ✅ `apps/web/src/app/orgs/[orgId]/layout.tsx` - TabNotificationProvider added

---

## WHAT'S NOT IMPLEMENTED

### PHASE 5: Auto-Approval ❌ NOT STARTED

**Critical Gap:** Trust levels are earned and displayed, but they don't actually DO anything yet.

#### Missing Backend Components:
- ❌ `lib/autoApprovalDecision.ts` - Decision logic
- ❌ `shouldAutoApprove()` function
- ❌ Auto-approval integration in `createParentSummary`
- ❌ `getAutoApprovedSummaries` query
- ❌ `revokeAutoApproval` mutation
- ❌ `getNudgeStatus` query
- ❌ `adjustConfidenceThreshold` mutation
- ❌ `confidenceThreshold` field in schema

#### Missing Frontend Components:
- ❌ `auto-approved-review-dashboard.tsx` - Review dashboard for auto-sent messages
- ❌ `automation-nudge-banner.tsx` - Contextual automation nudges
- ❌ `confidence-threshold-slider.tsx` - Adjust confidence threshold
- ❌ `auto-approval-badge.tsx` - Shows auto-approval prediction

**Current Behavior:**
- All summaries go to `pending_review` status regardless of trust level
- Coaches with Level 2 or Level 3 trust still manually approve everything
- Trust level UI says "Auto-approve normal, review sensitive" but this is FALSE
- No auto-approval logic exists in the codebase at all

---

### PHASE 6: Monitoring & Scale ❌ NOT STARTED

#### Missing Backend Components:
- ❌ `messagingCosts` table - Track AI costs per org
- ❌ `messagingRateLimits` table - Rate limits per org
- ❌ `platformMessagingSettings` table - Global settings
- ❌ `lib/costTracking.ts` - Cost calculation functions
- ❌ `trackAICost` mutation - Record costs after AI calls
- ❌ `checkRateLimit` query - Check before generating
- ❌ `getMessagingAnalytics` query - Platform analytics
- ❌ `updatePlatformMessagingSettings` mutation

#### Missing Frontend Components:
- ❌ `messaging-cost-dashboard.tsx` - Platform staff cost view
- ❌ `rate-limit-settings.tsx` - Configure limits
- ❌ `messaging-feature-toggle.tsx` - Master on/off control
- ❌ `throttled-banner.tsx` - Show throttle status to coaches
- ❌ `org-messaging-analytics.tsx` - Org admin analytics

**Current State:**
- No cost tracking - AI calls are unmonitored
- No rate limiting - Unlimited message generation
- No platform controls - Can't pause/throttle the system
- No graceful degradation - System runs or doesn't run

---

## KEY INSIGHTS

### What Works Well ✅

1. **Trust level progression is smooth**
   - Metrics update automatically after approve/suppress
   - Progress bar shows path to next level
   - Can cap automation at preferred level

2. **Sensitive topics workflow is robust**
   - Injury requires checklist (audit trail)
   - Behavior requires manual review
   - Can skip both via setting (skipSensitiveInsights)

3. **Parent experience is polished**
   - Tab notifications work
   - Shareable images look professional
   - Passport deep links are smart

4. **Architecture is solid**
   - Platform-wide trust + per-org preferences (clean separation)
   - Clear separation of concerns (models vs actions)
   - Good use of indexes (no .filter() calls)

### Critical Gaps ❌

1. **Trust levels don't automate anything**
   - UI promises auto-approval but it doesn't exist
   - Level 2/3 coaches get no benefit from their earned trust
   - System says "Auto-approve normal" but this is NOT implemented

2. **No visibility into AI decisions**
   - Confidence scores exist but not shown to coaches
   - No "why did AI classify this as injury?" explanation
   - No review dashboard for auto-approved (because auto-approval doesn't exist)

3. **No cost controls**
   - Unlimited AI API calls
   - No monitoring of spend
   - No rate limiting

4. **Trust escalation is one-way up**
   - Trust level can increase automatically
   - But there's no mechanism to DECREASE trust if AI starts making mistakes
   - No feedback loop from parent complaints or coach overrides

---

## WHAT NEEDS TO HAPPEN FOR PHASE 5

### Minimum Viable Auto-Approval

**Week 1-2: Core Logic**
1. Create `lib/autoApprovalDecision.ts`
2. Implement `shouldAutoApprove(trustLevel, confidenceScore, sensitivityCategory)`
   - Level 0-1: Never auto-approve
   - Level 2: Auto-approve if normal + confidence >80%
   - Level 3: Auto-approve if normal (any confidence)
   - Injury/behavior: NEVER auto-approve

3. Modify `createParentSummary` to:
   - Fetch coach trust level
   - Call `shouldAutoApprove()`
   - Set status to `auto_approved` if eligible
   - Set status to `pending_review` if not

**Week 3-4: Review Dashboard**
4. Create `getAutoApprovedSummaries` query
5. Build review dashboard showing recent auto-sent messages
6. Add `revokeAutoApproval` mutation (if not viewed yet)

**Week 5-6: Refinements**
7. Add confidence threshold slider (adjustable 50-100%)
8. Show confidence scores in approval cards
9. Add automation nudges ("You could auto-approve 80% of these")
10. Track override patterns (when coaches reject AI decisions)

---

## RECOMMENDATIONS

### Priority 1: Truth in Advertising ⚠️
**Problem:** UI says Level 2 = "Auto-approve normal, review sensitive" but this is FALSE.

**Solution:** Either:
- A) Implement auto-approval (Phase 5)
- B) Change UI to say "Coming soon: Auto-approval at Level 2" (temporary)
- C) Remove trust levels entirely until auto-approval is ready

**Recommendation:** Option B - Update `trust-preference-settings.tsx` to say:
- Level 2: "Auto-approval (coming soon) - Manual review for now"
- Level 3: "Full automation (coming soon) - Manual review for now"

### Priority 2: Show Confidence Scores
**Problem:** AI generates confidence scores but coaches never see them.

**Current:** AI creates publicSummary.confidenceScore (0-1) but it's hidden.

**Solution:** Add confidence to approval cards:
```tsx
<div className="text-sm text-muted-foreground">
  AI Confidence: {Math.round(summary.publicSummary.confidenceScore * 100)}%
  {summary.publicSummary.confidenceScore > 0.8 ? " (High)" :
   summary.publicSummary.confidenceScore > 0.6 ? " (Medium)" : " (Low)"}
</div>
```

### Priority 3: Add Basic Transparency
**Problem:** Coaches don't know WHY AI classified something as injury/behavior.

**Current:** `sensitivityReason` is stored but not displayed.

**Solution:** Show sensitivityReason in approval cards:
```tsx
{summary.sensitivityCategory !== "normal" && (
  <div className="mt-2 text-sm italic">
    Why flagged: {summary.sensitivityReason}
  </div>
)}
```

### Priority 4: Feedback Loop
**Problem:** No way to tell if AI is making good decisions.

**Missing:**
- When coaches override (suppress or edit), capture why
- Track which categories get overridden most
- Show coaches their override patterns

**Implementation:** Add optional reason to suppressSummary:
```typescript
suppressSummary({ summaryId, reason?: string })
// Reasons: "Too sensitive", "Inaccurate", "Not relevant", "Parent wouldn't understand"
```

---

## TECHNICAL DEBT

### 1. autoApprovalDecision Logic Needs Work
The PRD assumes confidence threshold of 80%, but research shows:
- Industry standard: 50-70% is practical threshold
- 80% is too conservative (very little automation)
- 95%+ misses the point (AI never that confident)

**Recommendation:** Start at 70% for Level 2, adjustable 50-90%.

### 2. No Downgrade Path
Trust level can only go up, never down. If AI starts making mistakes:
- Coach suppresses more → suppression rate increases
- Trust level drops (already implemented)
- BUT there's no alert/notification to coach about downgrade

**Missing:** `levelHistory` stores changes but coach never sees them.

### 3. Phase 4 Shareable Images Use Old Branding
The `generateShareableImage` action hard-codes "PlayerARC" branding but org might want custom branding.

**Future:** Add org logo to generated images (from organization table).

---

## QUESTIONS FOR YOU

Based on this review, I have questions about your vision:

### 1. **Trust vs. Control**
You mentioned coaches should "always feel in full control" but also want "AI to auto-process their insights."

These can conflict:
- **High control** = Manual approval for everything (current state)
- **High automation** = AI decides, coach reviews exceptions

**Question:** Which matters more:
- A) Coach explicitly approves each message (high control, low automation)
- B) AI sends most messages, coach reviews dashboard (low control, high automation)
- C) Coach sets rules, AI follows them (declarative control, high automation)

### 2. **When Should Auto-Approval Happen?**
Research shows users trust AI more when they can:
- See it work manually first (build familiarity)
- Gradually increase automation
- Override anytime

**Question:** Should auto-approval:
- A) Start immediately for Level 2+ coaches? (Aggressive)
- B) Require explicit opt-in even at Level 2? (Conservative)
- C) Start with "preview mode" where AI shows what it WOULD approve, coach clicks once to confirm batch? (Middle ground)

### 3. **What Happens When AI is Wrong?**
Currently, if AI auto-approves a bad summary:
- Parent sees it immediately
- Coach might not notice until complaint
- No undo mechanism (summary already delivered)

**Question:** Do you want:
- A) 24-hour revoke window? (Can pull back within 24hrs)
- B) Acknowledgment required? (Parent must click "got it" before it's permanent)
- C) Accept that auto-approved = immediate delivery, coach reviews dashboard daily?

### 4. **Confidence Threshold Philosophy**
Research shows:
- High threshold (>90%) = Very little automation
- Medium threshold (70-80%) = Balanced automation
- Low threshold (50-60%) = Aggressive automation

**Question:** What's your comfort level:
- A) Conservative: Start high (85%), coaches can lower if they want more automation
- B) Balanced: Start medium (70%), adjustable 60-85%
- C) Aggressive: Start low (60%), coaches can raise if uncomfortable

### 5. **Transparency vs. Simplicity**
You can show:
- **Everything**: Confidence score, reasoning, data sources, alternatives considered
- **Something**: Confidence score + one-line reason
- **Nothing**: Just the decision

**Question:** How much transparency do coaches want?
- A) Maximum (show all AI reasoning - might be overwhelming)
- B) Medium (show confidence + brief reason - balanced)
- C) Minimal (just show decision - trust the AI)

---

## NEXT STEPS

### If You Want Auto-Approval (Phase 5):

1. **Answer the 5 questions above** so I know your philosophy
2. **Review auto-approval decision rules** - do thresholds make sense?
3. **Decide on MVP scope** - What's minimum for launch?

### If You Want to Improve Current System First:

1. **Show confidence scores** in approval cards (30 min change)
2. **Show sensitivity reasons** so coaches know why flagged (30 min change)
3. **Add override feedback** - capture why coaches suppress (2 hour change)
4. **Update trust level UI** to say "coming soon" for auto-approval (15 min change)

### Research Integration:

I can help you design:
- **Trust escalation UX** based on Gmail, GitHub Copilot patterns
- **Transparency dashboard** showing AI decisions like Anthropic/OpenAI
- **Progressive automation** following industry best practices
- **Control mechanisms** that make coaches comfortable increasing automation

**What would you like to focus on first?**
