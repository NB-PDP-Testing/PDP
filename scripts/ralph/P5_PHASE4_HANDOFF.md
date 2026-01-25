# P5 Phase 4 (Learning Loop) - Handoff to Ralph

## Phase 3 Completion Summary

Phase 3 (Cost Optimization) is complete with all features implemented:

**Completed User Stories:**
- US-012: Anthropic prompt caching (90% cost reduction capability)
- US-013: AI usage tracking schema (aiUsageLog table)
- US-014: Usage logging in generateParentSummary action
- US-015: Analytics dashboard query (getOrgUsage)

**Key Deliverables:**
- ✅ Prompt caching reduces AI costs by 90% on repeat summaries
- ✅ Every AI call logged with token counts and costs
- ✅ Analytics query ready for org admin dashboard
- ✅ All quality checks passing

---

## Phase 4 Overview

**Goal:** AI learns from coach behavior to personalize automation. Track when coaches override AI decisions, capture feedback, analyze patterns, and adapt confidence thresholds per coach.

**Key Concept:** Not all coaches are the same. Conservative coaches should get higher thresholds (fewer false positives), trusting coaches should get lower thresholds (more automation). AI adapts to each coach's actual approval patterns.

**Industry Pattern:** GitHub Copilot learns from rejection patterns, Netflix personalizes recommendations, Spotify adapts to skip behavior.

---

## Phase 4 User Stories

### US-016: Add override tracking fields to coachParentSummaries

**What it does:** Adds schema fields to track when coaches disagree with AI decisions.

**Override Types:**
- `coach_approved_low_confidence` - Coach approved summary with <70% confidence (AI was too conservative)
- `coach_rejected_high_confidence` - Coach suppressed summary with ≥70% confidence (AI was too confident)
- `coach_edited` - Coach edited before sending (AI content needed adjustment)
- `coach_revoked_auto` - Coach revoked auto-sent summary (AI made a mistake)

**Feedback Structure:**
```typescript
{
  wasInaccurate: boolean,      // Summary facts were wrong
  wasTooSensitive: boolean,    // Too sensitive for parent
  timingWasWrong: boolean,     // Wrong time to send
  otherReason?: string         // Freeform explanation
}
```

**Implementation:**
- Edit `packages/backend/convex/schema.ts`
- Add 3 optional fields to coachParentSummaries table
- Run codegen to verify types

**Testing:**
- Schema compiles without errors
- Types available in generated API

---

### US-017: Capture override data in suppressSummary

**What it does:** When coaches suppress summaries, capture override signals for AI learning.

**Logic:**
```typescript
// When coach suppresses a summary:
if (summary.confidenceScore >= 0.7) {
  overrideType = 'coach_rejected_high_confidence'; // AI thought it was good!
} else {
  overrideType = null; // Suppressing low confidence is normal
}
```

**Implementation:**
- Edit `suppressSummary` mutation in `coachParentSummaries.ts`
- Add optional `reason` and `feedback` args
- Store override data in summary record
- Make feedback optional (low friction)

**Testing:**
- Suppress high confidence summary → overrideType set
- Suppress low confidence summary → overrideType null
- Feedback optional, not required

---

### US-018: Add optional feedback UI for suppression

**What it does:** Shows a quick dialog when suppressing, allowing coaches to optionally explain WHY.

**UX Flow:**
1. Coach clicks "Suppress"
2. Dialog appears with quick checkboxes
3. Coach can click "Skip" (most common) or "Suppress & Send Feedback"
4. Dialog dismisses, summary suppressed

**Dialog Design:**
- **Checkboxes:** "Inaccurate", "Too sensitive", "Timing not right"
- **Textarea:** "Other reason" (optional)
- **Buttons:** "Skip" (default), "Suppress & Send Feedback"
- **Principle:** Make feedback easy, not mandatory

**Implementation:**
- Edit `summary-approval-card.tsx` (and injury/behavior variants)
- Use shadcn Dialog component
- Wire to `suppressSummary` mutation with optional feedback

**Testing:**
- Click suppress → dialog appears
- Click "Skip" → summary suppressed, no feedback
- Fill form + "Send Feedback" → feedback captured
- Dialog dismissible with ESC key

---

### US-019: Create getCoachOverridePatterns analytics query

**What it does:** Platform admins see analytics on coach override patterns to understand AI performance.

**Analytics Calculated:**
- **Total overrides** - How many times coaches disagreed with AI
- **By type** - Breakdown by override type
- **Avg confidence when rejected** - If coaches reject 80% confidence summaries, threshold too low
- **Common feedback reasons** - What categories appear most
- **Override rate by category** - Do coaches reject injury summaries more than normal?

**Use Cases:**
- Per-coach: "This coach rejects 40% of high confidence summaries"
- Per-org: "Injury summaries have 25% rejection rate even at high confidence"
- Platform-wide: "Overall rejection rate is 8% at 70% threshold"

**Implementation:**
- Create `packages/backend/convex/models/coachOverrideAnalytics.ts`
- Query coachParentSummaries where overrideType not null
- Calculate aggregates
- Support coachId and organizationId filters

**Testing:**
- Create test overrides (manually patch DB)
- Query per-coach → see that coach's patterns
- Query per-org → see org-level patterns
- Empty result if no overrides

---

### US-020: Implement adaptive confidence thresholds

**What it does:** AI learns each coach's approval style and adjusts their threshold automatically.

**Adaptive Logic:**
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
  adjustment = -0.05; // Lower by 5%
}

// Coach rejects many high confidence → raise threshold (coach is conservative)
if (highConfRejections / totalDecisions > 0.2) {
  adjustment = +0.05; // Raise by 5%
}

const personalizedThreshold = clamp(
  defaultThreshold + adjustment,
  0.6,  // min (don't go too aggressive)
  0.85  // max (don't go too conservative)
);
```

**Implementation:**
- Add `calculatePersonalizedThreshold` to `autoApprovalDecision.ts`
- Add `personalizedThreshold` field to coachTrustLevels schema
- Create scheduled function `adjustPersonalizedThresholds` in `crons.ts`
- Run weekly (Sunday 2 AM)
- Only adjust for coaches with >20 override decisions (need data)
- Use personalizedThreshold in auto-approval decision (fallback to confidenceThreshold or 0.7)

**Testing:**
- Create override history with patterns
- Run calculatePersonalizedThreshold manually
- Verify threshold adjusts correctly
- Test cron function (use Convex dashboard to trigger manually)
- Verify auto-approval uses personalized threshold

---

## Critical Patterns from Phase 3

### Authentication Pattern (CRITICAL)
Always use `user.userId || user._id` because Better Auth userId field is optional:

```typescript
const user = await authComponent.safeGetAuthUser(ctx);
if (!user) {
  throw new Error("Not authenticated");
}
const coachId = user.userId || user._id; // FALLBACK REQUIRED
```

### Convex Scheduled Functions
```typescript
import { cronJobs } from "convex/server";

const crons = cronJobs();

crons.weekly(
  "adjust-thresholds",
  { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 0 },
  internal.crons.adjustPersonalizedThresholds
);

export default crons;
```

### Query Pattern
```typescript
export const myQuery = query({
  args: { orgId: v.id("organization") },
  returns: v.object({ /* ... */ }),
  handler: async (ctx, args) => {
    // Always use indexes, NEVER .filter()
    const data = await ctx.db
      .query("tableName")
      .withIndex("by_orgId", q => q.eq("organizationId", args.orgId))
      .collect();

    return { data };
  },
});
```

---

## Testing Strategy

### US-016 Testing (Schema)
- Run `npx -w packages/backend convex codegen`
- Verify no errors
- Check types in `_generated/api.d.ts`

### US-017 Testing (Mutation)
- Suppress summary with 80% confidence → verify overrideType = 'coach_rejected_high_confidence'
- Suppress summary with 50% confidence → verify overrideType null
- Pass feedback → verify stored in DB
- Skip feedback → verify still works

### US-018 Testing (UI)
- Click suppress → dialog appears
- Click "Skip" → summary suppressed, no feedback
- Check boxes + "Send Feedback" → feedback captured
- ESC key closes dialog
- Works on mobile (responsive)

### US-019 Testing (Analytics)
- Create test overrides in DB
- Query by coachId → see that coach's patterns
- Query by organizationId → see org patterns
- Verify aggregates are correct
- Test with no overrides → empty result

### US-020 Testing (Adaptive Thresholds)
- Create coach with many low-confidence approvals → threshold should lower
- Create coach with many high-confidence rejections → threshold should raise
- Verify threshold clamped to [0.6, 0.85]
- Test cron manually via Convex dashboard
- Verify auto-approval uses personalized threshold

---

## Known Issues & Gotchas

1. **Better Auth userId** - Always use `user.userId || user._id` fallback
2. **Optional feedback** - Don't make it mandatory, that kills engagement
3. **Threshold bounds** - Don't let thresholds go below 0.6 or above 0.85 (safety)
4. **Minimum data** - Only adjust thresholds with >20 override decisions (need statistical significance)
5. **Scheduled functions** - Test manually before relying on cron timing
6. **Dialog UX** - Keep it quick, "Skip" should be default and obvious

---

## Success Criteria

Phase 4 is complete when:
- ✅ All 5 user stories implemented
- ✅ Override tracking captures coach disagreements
- ✅ Optional feedback UI works (low friction)
- ✅ Analytics query shows override patterns
- ✅ Adaptive thresholds adjust per coach
- ✅ All quality checks passing
- ✅ No regressions in Phases 1-3

---

## Ralph Execution Checklist

- [ ] Read this handoff document
- [ ] Review `scripts/ralph/prd.json` for Phase 4 stories (US-016 to US-020)
- [ ] Review `scripts/ralph/progress.txt` for Phase 3 learnings
- [ ] Implement US-016 (schema fields)
- [ ] Implement US-017 (capture in mutation)
- [ ] Implement US-018 (feedback UI)
- [ ] Implement US-019 (analytics query)
- [ ] Implement US-020 (adaptive thresholds + cron)
- [ ] Run tests for each story
- [ ] Update progress.txt with Phase 4 completion
- [ ] Mark all stories as passing in prd.json

Ready for Ralph to execute Phase 4!
