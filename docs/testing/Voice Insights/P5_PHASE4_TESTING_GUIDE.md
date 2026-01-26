# P5 Phase 4 (Learning Loop) - Testing Guide

## What Was Implemented

Phase 4 adds **AI learning from coach behavior** to personalize automation. The system tracks when coaches override AI decisions, captures optional feedback, analyzes patterns, and adapts confidence thresholds per coach.

### Five User Stories Completed:

1. **US-016**: Override tracking fields (schema)
2. **US-017**: Capture override data in mutations
3. **US-018**: Optional feedback UI dialog
4. **US-019**: Override analytics query
5. **US-020**: Adaptive confidence thresholds + weekly cron job

---

## Feature Breakdown

### 1. Override Tracking Fields (US-016)
**What it does**: Adds schema fields to track when coaches disagree with AI decisions.

**Schema changes** (`coachParentSummaries` table):
```typescript
{
  overrideType?: string,       // Type of override (see below)
  overrideReason?: string,     // Optional text explanation
  overrideFeedback?: {         // Optional structured feedback
    wasInaccurate?: boolean,      // Summary facts were wrong
    wasTooSensitive?: boolean,    // Too sensitive for parent
    timingWasWrong?: boolean,     // Wrong time to send
    otherReason?: string          // Freeform explanation
  }
}
```

**Override types**:
- `coach_approved_low_confidence` - Coach approved when AI said it was borderline (60-70%)
- `coach_rejected_high_confidence` - Coach suppressed when AI was confident (≥70%)
- `coach_edited` - Coach modified before sending
- `coach_revoked_auto` - Coach revoked auto-sent summary

**Files modified**:
- `packages/backend/convex/schema.ts`

---

### 2. Capture Override Data (US-017)
**What it does**: When coaches suppress summaries, detect and log override signals.

**Logic**:
```typescript
// When coach suppresses:
if (summary.confidenceScore >= 0.7) {
  overrideType = 'coach_rejected_high_confidence';  // AI thought it was good!
} else {
  overrideType = null;  // Suppressing low confidence is normal
}
```

**Mutation updates**:
- `suppressSummary` now accepts optional `reason` and `feedback` args
- Stores override data in summary record
- Feedback is optional (low friction)

**Files modified**:
- `packages/backend/convex/models/coachParentSummaries.ts`

---

### 3. Optional Feedback UI (US-018)
**What it does**: Shows quick dialog when suppressing, allowing coaches to optionally explain WHY.

**UX Flow**:
1. Coach clicks "Don't Share" button
2. Dialog appears with quick checkboxes
3. Coach can click "Skip" (most common) or "Suppress & Send Feedback"
4. Dialog dismisses, summary suppressed

**Dialog design**:
- **Checkboxes**: "Summary was inaccurate", "Too sensitive for parent", "Timing not right"
- **Textarea**: "Other reason" (optional)
- **Buttons**: "Skip" (default focus), "Suppress & Send Feedback"
- **Principle**: Make feedback easy, not mandatory

**Files modified**:
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/summary-approval-card.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/review-tab.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/parents-tab.tsx`

---

### 4. Override Analytics Query (US-019)
**What it does**: Platform admins see analytics on coach override patterns to understand AI performance.

**Query**: `getCoachOverridePatterns`

**Args**:
- `coachId` (optional) - Filter to specific coach
- `organizationId` (optional) - Filter to specific org
- At least one must be provided

**Returns**:
```typescript
{
  totalOverrides: number,

  byType: {
    coach_approved_low_confidence: number,
    coach_rejected_high_confidence: number,
    coach_edited: number,
    coach_revoked_auto: number
  },

  avgConfidenceWhenRejected: number | null,  // Avg confidence when rejecting high-confidence

  feedbackReasons: {
    wasInaccurate: number,       // Count of "inaccurate" feedback
    wasTooSensitive: number,     // Count of "too sensitive"
    timingWasWrong: number,      // Count of "timing wrong"
    hasOtherReason: number       // Count of custom reasons
  },

  bySensitivityCategory: {
    normal: { total: number, overridden: number },
    injury: { total: number, overridden: number },
    behavior: { total: number, overridden: number }
  }
}
```

**Use cases**:
- Per-coach: "This coach rejects 40% of high confidence summaries"
- Per-org: "Injury summaries have 25% rejection rate even at high confidence"
- Platform-wide: "Overall rejection rate is 8% at 70% threshold"

**Files created**:
- `packages/backend/convex/models/coachOverrideAnalytics.ts`

---

### 5. Adaptive Confidence Thresholds (US-020)
**What it does**: AI learns each coach's approval style and adjusts their threshold automatically.

**Schema changes** (`coachTrustLevels` table):
```typescript
{
  personalizedThreshold?: number  // AI-learned threshold (0.6-0.85)
}
```

**Adaptive logic**:
```typescript
// Analyze last 30 days of override history
const lowConfApprovals = overrides.filter(o =>
  o.type === 'coach_approved_low_confidence' &&
  o.confidenceScore >= 0.6 && o.confidenceScore < 0.7
).length;

const highConfRejections = overrides.filter(o =>
  o.type === 'coach_rejected_high_confidence' &&
  o.confidenceScore >= 0.8
).length;

let adjustment = 0;

// Coach approves many low confidence → lower threshold (coach is trusting)
if (lowConfApprovals / totalDecisions > 0.5) {
  adjustment = -0.05;  // Lower by 5%
}

// Coach rejects many high confidence → raise threshold (coach is conservative)
if (highConfRejections / totalDecisions > 0.2) {
  adjustment = +0.05;  // Raise by 5%
}

const personalizedThreshold = clamp(
  defaultThreshold + adjustment,
  0.6,   // min (don't go too aggressive)
  0.85   // max (don't go too conservative)
);
```

**Integration**:
- Updated `decideAutoApproval` to prioritize `personalizedThreshold` over `confidenceThreshold`
- Weekly cron job (Sundays 2 AM UTC) processes all coaches
- Only adjusts for coaches with >20 override decisions (statistical significance)

**Files modified**:
- `packages/backend/convex/schema.ts`
- `packages/backend/convex/lib/autoApprovalDecision.ts`
- `packages/backend/convex/models/coachTrustLevels.ts`
- `packages/backend/convex/crons.ts` (NEW)

---

## How to Test

### Prerequisites
✅ You're on `ralph/coach-parent-summaries-p5-phase4` branch
✅ Dev server running on `localhost:3000`
✅ Test account: `neil.B@blablablak.com` / `lien1979`
✅ Browser testing tool available

---

### Test 1: Verify Schema Fields Exist

**Goal**: Confirm override tracking fields were added to database.

**Steps**:
1. Open Convex dashboard → Data → `coachParentSummaries` table
2. Check schema for new fields:
   - `overrideType` (string, optional)
   - `overrideReason` (string, optional)
   - `overrideFeedback` (object, optional)
3. Open `coachTrustLevels` table
4. Check schema for:
   - `personalizedThreshold` (number, optional)

**Success criteria**:
✅ All fields present in schema
✅ Types match specification

---

### Test 2: Suppress High Confidence Summary (Backend)

**Goal**: Verify override tracking captures coach rejecting high-confidence summaries.

**Steps**:
1. Create a voice note with AI insights (coach dashboard)
2. Generate a parent summary (should have high confidence ≥70%)
3. Note the summary ID and confidence score
4. Click "Don't Share" → "Skip" (no feedback)
5. Open Convex dashboard → `coachParentSummaries` table
6. Find the summary by ID

**Expected results**:
```json
{
  "status": "coach_suppressed",
  "overrideType": "coach_rejected_high_confidence",
  "overrideReason": null,
  "overrideFeedback": null
}
```

**Success criteria**:
✅ `overrideType` = "coach_rejected_high_confidence"
✅ Override only tracked when confidence ≥70%

---

### Test 3: Suppress Low Confidence Summary

**Goal**: Verify NO override tracked for low confidence suppressions.

**Steps**:
1. Find or create a summary with confidence <70%
2. Suppress it
3. Check database

**Expected results**:
```json
{
  "status": "coach_suppressed",
  "overrideType": null,     // No override tracked
  "overrideReason": null,
  "overrideFeedback": null
}
```

**Success criteria**:
✅ `overrideType` remains null (suppressing low confidence is normal)

---

### Test 4: Feedback Dialog UI (Frontend)

**Goal**: Verify the feedback dialog appears and works correctly.

**Setup**: Use dev-browser or manual testing

**Steps**:
1. Navigate to coach voice notes dashboard
2. Go to "Review" tab
3. Find a summary to suppress
4. Click "Don't Share" button

**Expected - Dialog appears with**:
- Title: "Why suppress this summary?" (or similar)
- 3 checkboxes:
  - ☐ Summary was inaccurate
  - ☐ Too sensitive for parent
  - ☐ Timing not right
- Textarea: "Other reason" (optional)
- 2 buttons:
  - "Skip" (default, should have focus)
  - "Suppress & Send Feedback"

**Test scenarios**:

**Scenario A: Skip feedback**
1. Click "Skip" button
2. Dialog closes
3. Summary suppressed
4. Check DB → `overrideFeedback` is null

**Scenario B: Send feedback (checkboxes only)**
1. Check "Summary was inaccurate"
2. Check "Too sensitive for parent"
3. Click "Suppress & Send Feedback"
4. Dialog closes
5. Check DB:
```json
{
  "overrideFeedback": {
    "wasInaccurate": true,
    "wasTooSensitive": true,
    "timingWasWrong": false,
    "otherReason": null
  }
}
```

**Scenario C: Send feedback (with custom text)**
1. Type in textarea: "Player wasn't at training that day"
2. Click "Suppress & Send Feedback"
3. Check DB:
```json
{
  "overrideFeedback": {
    "wasInaccurate": false,
    "wasTooSensitive": false,
    "timingWasWrong": false,
    "otherReason": "Player wasn't at training that day"
  }
}
```

**Scenario D: ESC key dismisses**
1. Press ESC key
2. Dialog closes (same as "Skip")

**Success criteria**:
✅ Dialog appears on suppress
✅ "Skip" works (no feedback saved)
✅ "Send Feedback" saves structured data
✅ ESC key closes dialog
✅ Responsive on mobile

---

### Test 5: Override Analytics Query (Backend)

**Goal**: Verify analytics query returns correct data.

**Setup**: Create test data with known override patterns

**Steps**:
1. Create 5+ parent summaries with varying confidence
2. Suppress 2-3 high confidence summaries (≥70%)
   - On one, provide feedback: "Too sensitive"
   - On another, provide feedback: "Inaccurate"
3. Suppress 1-2 low confidence summaries (<70%)
4. Open Convex dashboard → Functions → `coachOverrideAnalytics:getCoachOverridePatterns`
5. Run query with your `coachId`:
   ```json
   {
     "coachId": "your_coach_id"
   }
   ```

**Expected results**:
```json
{
  "totalOverrides": 2,  // Only high-confidence rejections count

  "byType": {
    "coach_approved_low_confidence": 0,
    "coach_rejected_high_confidence": 2,
    "coach_edited": 0,
    "coach_revoked_auto": 0
  },

  "avgConfidenceWhenRejected": 0.78,  // Average of rejected high-confidence

  "feedbackReasons": {
    "wasInaccurate": 1,
    "wasTooSensitive": 1,
    "timingWasWrong": 0,
    "hasOtherReason": 0
  },

  "bySensitivityCategory": {
    "normal": { "total": 5, "overridden": 2 },
    "injury": { "total": 0, "overridden": 0 },
    "behavior": { "total": 0, "overridden": 0 }
  }
}
```

**Success criteria**:
✅ `totalOverrides` matches actual overrides
✅ `avgConfidenceWhenRejected` calculates correctly
✅ Feedback reasons aggregated properly
✅ Category stats accurate

---

### Test 6: Adaptive Threshold Calculation (Unit Test)

**Goal**: Verify the threshold calculation logic works correctly.

**Steps**:
1. Open Convex dashboard → Functions → `coachTrustLevels:adjustPersonalizedThresholds`
2. Test with mock data (or manually trigger cron):

**Test Case A: Trusting Coach**
- Create override history:
  - 10 `coach_approved_low_confidence` (60-70% range)
  - 2 `coach_rejected_high_confidence` (80%+ range)
  - Total: 12 overrides (>20 minimum)
- Run threshold calculation
- Expected: Threshold lowered to 0.65 (from 0.7)

**Test Case B: Conservative Coach**
- Create override history:
  - 1 `coach_approved_low_confidence`
  - 8 `coach_rejected_high_confidence` (80%+ range)
  - Total: 9... wait, need >20
- Create 15 more neutral summaries
  - Total: 24 overrides
- Run threshold calculation
- Expected: Threshold raised to 0.75 (from 0.7)

**Test Case C: Insufficient Data**
- Create override history:
  - 5 total overrides (<20 minimum)
- Run threshold calculation
- Expected: `personalizedThreshold` remains null (not enough data)

**Success criteria**:
✅ Trusting coach → threshold lowered by 5%
✅ Conservative coach → threshold raised by 5%
✅ Insufficient data → no adjustment
✅ Thresholds clamped to [0.6, 0.85]

---

### Test 7: Weekly Cron Job (Scheduled Function)

**Goal**: Verify the cron job runs and adjusts thresholds.

**Steps**:
1. Open Convex dashboard → Scheduled Functions
2. Find "adjust-thresholds" cron
3. Verify schedule: "Weekly on Sunday at 2:00 AM UTC"
4. **Manually trigger** (don't wait for Sunday!):
   - Click "Run Now" or use dashboard trigger
5. Check logs for output:
   ```
   Processed 12 coaches
   Adjusted 5 coaches
   ```
6. Open `coachTrustLevels` table
7. Check for coaches with `personalizedThreshold` set

**Success criteria**:
✅ Cron job scheduled correctly
✅ Manual trigger works
✅ Processes all coaches
✅ Only adjusts coaches with >20 overrides
✅ Updates `personalizedThreshold` field

---

### Test 8: Auto-Approval Uses Personalized Threshold

**Goal**: Verify auto-approval decision uses personalized threshold when available.

**Setup**:
1. Manually set a coach's `personalizedThreshold` to 0.65 in DB
2. Set their trust level to 2 (Trusted)

**Steps**:
1. Generate parent summary with 68% confidence
2. Check auto-approval decision

**Expected**:
- With personalized threshold (0.65): **AUTO-APPROVED** ✅
- Without personalized threshold (0.7 default): Manual review ❌

**Success criteria**:
✅ Auto-approval uses `personalizedThreshold` if present
✅ Falls back to `confidenceThreshold` if not
✅ Threshold priority: personalized > preference > default (0.7)

---

## Integration Test: Full Learning Loop

**Goal**: End-to-end test of AI learning from coach behavior.

**Day 1: Initial State**
1. Coach A (new): No overrides, `personalizedThreshold` = null
2. Trust level = 2, `confidenceThreshold` = 0.7
3. Create 25 parent summaries with varying confidence

**Day 2-30: Coach Behavior**
4. Coach A approves 12 summaries with 60-65% confidence (trusting behavior)
5. Coach A rejects 2 summaries with 85% confidence (conservative on specific topics)
6. Total overrides: 14 (not enough yet, <20)

**Week 5: Trigger Cron**
7. Still only 14 overrides → No adjustment yet
8. Create 10 more summaries, coach approves 6 more low-confidence
9. Total overrides: 20 (minimum met!)
10. Trigger weekly cron job manually

**Expected Result**:
```json
{
  "personalizedThreshold": 0.65  // Lowered from 0.7 (coach is trusting)
}
```

**Day 31+: Adjusted Automation**
11. New summary generated with 66% confidence
12. Auto-approval decision checks personalizedThreshold (0.65)
13. Summary **AUTO-APPROVED** ✅ (before: would be manual review)

**Success criteria**:
✅ System detects trusting pattern
✅ Threshold lowered appropriately
✅ Future summaries use new threshold
✅ More automation for this coach

---

## Manual Testing Checklist

**Schema (US-016)**:
- [ ] `overrideType` field exists in `coachParentSummaries`
- [ ] `overrideReason` field exists
- [ ] `overrideFeedback` field exists
- [ ] `personalizedThreshold` field exists in `coachTrustLevels`

**Backend (US-017)**:
- [ ] Suppressing high confidence (≥70%) sets `overrideType`
- [ ] Suppressing low confidence (<70%) does NOT set `overrideType`
- [ ] Optional feedback saved correctly
- [ ] Feedback is truly optional (can skip)

**Frontend (US-018)**:
- [ ] Feedback dialog appears on suppress
- [ ] "Skip" button works (no feedback saved)
- [ ] Checkboxes save structured data
- [ ] Textarea saves custom reason
- [ ] ESC key closes dialog
- [ ] Responsive on mobile

**Analytics (US-019)**:
- [ ] Query works per-coach
- [ ] Query works per-org
- [ ] Total overrides accurate
- [ ] Average confidence calculated correctly
- [ ] Feedback reasons aggregated
- [ ] Category stats accurate

**Adaptive Thresholds (US-020)**:
- [ ] Calculation logic correct (trusting → lower, conservative → higher)
- [ ] Thresholds clamped to [0.6, 0.85]
- [ ] Minimum 20 overrides required
- [ ] Weekly cron job scheduled
- [ ] Manual trigger works
- [ ] Auto-approval uses personalized threshold

---

## Known Limitations

1. **Minimum data requirement**: Needs 20+ overrides for personalization
2. **Cron timing**: Weekly adjustment (may be slow to adapt)
3. **No UI for coaches**: Coaches can't see their personalized threshold
4. **No platform admin UI**: Analytics query exists but no dashboard yet (Phase 6)
5. **Simple logic**: Only 2 patterns detected (trusting/conservative), could be more nuanced

---

## Next Steps (Not in Phase 4)

- [ ] Platform admin UI to view override analytics (Phase 6)
- [ ] Coach-facing "Your AI Settings" page showing personalized threshold
- [ ] More sophisticated learning (category-specific thresholds, time-based patterns)
- [ ] A/B testing framework for threshold optimization
- [ ] Export override data for external analysis

---

## Files Changed Summary

| File | Changes | Stories |
|------|---------|---------|
| `packages/backend/convex/schema.ts` | Added override fields, personalizedThreshold | US-016, US-020 |
| `packages/backend/convex/models/coachParentSummaries.ts` | Capture override data in suppressSummary | US-017 |
| `apps/web/.../summary-approval-card.tsx` | Feedback dialog UI | US-018 |
| `apps/web/.../review-tab.tsx` | Wire feedback to mutation | US-018 |
| `apps/web/.../parents-tab.tsx` | Wire feedback to mutation | US-018 |
| `packages/backend/convex/models/coachOverrideAnalytics.ts` | NEW - Analytics query | US-019 |
| `packages/backend/convex/lib/autoApprovalDecision.ts` | Personalized threshold logic | US-020 |
| `packages/backend/convex/models/coachTrustLevels.ts` | Adjustment mutation | US-020 |
| `packages/backend/convex/crons.ts` | NEW - Weekly threshold adjustment | US-020 |

---

## Quality Status

✅ **TypeScript**: All checks passing (after fixes)
✅ **Linting**: No new errors introduced
✅ **Commits**: 6 atomic commits (5 stories + 1 fix), well-documented
✅ **Impact**: AI learns from real coach behavior, personalizes automation

---

## Industry Pattern Reference

This implementation follows the **learning from rejection patterns** approach used by:

- **GitHub Copilot**: Learns from code rejection to improve suggestions
- **Netflix**: Personalizes recommendations based on viewing behavior
- **Spotify**: Adapts playlists based on skip patterns
- **Zendesk**: Confidence thresholds tuned per support agent based on approval history

The key insight: **Don't assume all users want the same level of automation. Learn from their actual behavior.**
