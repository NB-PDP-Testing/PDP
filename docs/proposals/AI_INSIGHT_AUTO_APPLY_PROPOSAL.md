# AI Insight Auto-Apply - Trust System Proposal
**Date:** January 24, 2026
**Status:** PROPOSAL - For assessment post P5/P6
**Proposed By:** Neil (User feedback during P5 Phase 1 review)

---

## Executive Summary

While P5/P6 build trust for auto-sending parent summaries, there's a **parallel trust-building journey** needed for auto-applying AI insights to player records. Coaches currently manually apply insights to:
- Skill ratings
- Development goals
- Attendance records
- Injury logs
- Performance notes

**This proposal** extends the same trust system (preview → supervised → full automation) to player profile updates.

---

## Problem Statement

**Current State:**
1. AI extracts insights from voice notes (e.g., "Clodagh improved her tackling from 3/5 to 4/5")
2. Coach sees insight in "AI Insights" tab
3. **Coach manually clicks "Apply to Profile"** to update player record
4. No automation, no preview mode, no trust building

**The Gap:**
- We're building trust for parent summaries (P5)
- We're NOT building trust for player profile updates
- Same AI confidence scores apply
- Same trust levels should apply
- Same preview pattern should apply

**User Psychology:**
Coaches need to trust AI won't:
- Overwrite important manual notes
- Set wrong skill ratings
- Mess up player data
- Apply insights to wrong players

---

## Proposed Solution: Phase 7 - AI Insight Auto-Apply

### Architecture Mirrors P5 Parent Summary System

**Same trust levels (0-3):**
- Level 0: Manual - Review every insight, apply manually
- Level 1: Learning - See what AI would apply (preview)
- Level 2: Trusted - Auto-apply with 1-hour undo window
- Level 3: Expert - Auto-apply immediately

**Same confidence thresholds:**
- 70% default threshold
- Adjustable per coach
- Color coding: Red <60%, Amber 60-79%, Green 80%+

**Same preview mode:**
- Track 20 insights
- Measure agreement rate (coach applies what AI predicted)
- Build trust before automation

---

## Implementation Phases

### Phase 7.1: Preview Mode for Insights (Weeks 1-2)

**Mirrors P5 Phase 1**

**User Stories:**

**US-7.1.1:** Add preview mode fields for insights
- Extend `coachTrustLevels` with `insightPreviewModeStats`
- Track: wouldAutoApplyInsights, coachAppliedThose, agreementRate
- Same 20-insight learning period

**US-7.1.2:** Calculate `wouldAutoApply` for each insight
- Add to `getPendingInsights` query
- Logic: `category !== "injury" && trustLevel >= 2 && confidenceScore >= threshold`
- Return `wouldAutoApply: boolean` for each insight

**US-7.1.3:** Add confidence visualization to insight cards
- Show confidence score (currently hidden)
- Progress bar with color coding
- Position: Below insight description

**US-7.1.4:** Add "AI would auto-apply" badge
- Blue badge: "✨ AI would auto-apply this at Level 2+"
- Gray text: "Requires manual review"
- Show on each insight card

**US-7.1.5:** Track preview mode statistics
- When coach clicks "Apply", track if it was a wouldAutoApply insight
- When coach clicks "Dismiss", track rejection
- Calculate agreement rate over 20 insights

**Files to Modify:**
- `packages/backend/convex/schema.ts` - Add insightPreviewModeStats
- `packages/backend/convex/models/voiceNoteInsights.ts` - Add wouldAutoApply logic
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx` - Add confidence viz
- Insight card components - Add badges

---

### Phase 7.2: Supervised Auto-Apply (Weeks 3-4)

**Mirrors P5 Phase 2**

**US-7.2.1:** Add auto-apply logic to insight processing
- If `trustLevel >= 2` AND `confidenceScore >= threshold` AND `category === "skill"`
- Automatically apply skill rating update
- Log action with `autoAppliedAt`, `autoAppliedByAI: true`

**US-7.2.2:** Add 1-hour undo window
- Coach can revert auto-applied insights within 60 minutes
- Button: "Undo Auto-Apply" (grayed out after 1 hour)
- Reverts player profile to previous state

**US-7.2.3:** Add auto-apply notifications
- Toast: "✨ AI auto-applied 3 insights. Review in Player Profile."
- Summary at top of Insights tab: "2 auto-applied, 1 pending review"
- Email digest: Daily summary of auto-applied insights

**US-7.2.4:** Filter view for auto-applied insights
- Tab: "Auto-Applied" vs "Pending Review"
- Shows what AI did automatically
- Coach can review and undo if needed

**Categories to Auto-Apply:**
- ✅ Skill ratings (safe, numeric)
- ✅ Attendance records (safe, factual)
- ✅ Development goals (medium risk)
- ❌ Injury logs (always manual - sensitive)
- ❌ Medical info (always manual - sensitive)

---

### Phase 7.3: Full Automation & Learning Loop (Weeks 5-6)

**Mirrors P5 Phase 4**

**US-7.3.1:** Learn from coach overrides
- When coach undoes auto-apply, ask "Why?"
  - "Wrong player"
  - "Wrong skill level"
  - "Insight was incorrect"
  - "Other (explain)"
- Feed back to AI to improve confidence scoring

**US-7.3.2:** Adaptive thresholds per coach
- If coach never undoes auto-applies → Lower threshold to 60%
- If coach frequently undoes → Raise threshold to 80%
- Personalized per coach, not platform-wide

**US-7.3.3:** Insight similarity matching
- Before auto-applying, check similar past insights
- If coach has applied 5 similar insights → Higher confidence
- If coach has rejected similar insights → Lower confidence

**US-7.3.4:** Category-specific trust levels
- Some coaches may trust AI for skills but not goals
- Allow per-category trust preferences
- "I want auto-apply for: ☑ Skills ☑ Attendance ☐ Goals"

---

## Success Metrics

**Week 2 (Preview Mode):**
- 40%+ agreement rate (coaches apply what AI predicted)
- Coaches understand confidence scores
- >80% say "I understand what AI would do"

**Week 4 (Supervised):**
- 30%+ auto-apply rate
- <5% undo rate (coaches rarely revert auto-applies)
- 50%+ coaches enable Level 2+ for insights

**Week 6 (Full Automation):**
- 60%+ of insights auto-applied (no manual review)
- <2% undo rate (high trust)
- Time saved: 5-10 minutes per coach per week

---

## Data Model Changes

### Schema Extensions

```typescript
// Extend coachTrustLevels table
coachTrustLevels: defineTable({
  // ... existing fields ...

  // NEW: Insight auto-apply tracking
  insightPreviewModeStats: v.optional(
    v.object({
      wouldAutoApplyInsights: v.number(),      // Count of insights AI would auto-apply
      coachAppliedThose: v.number(),           // Of those, how many coach applied
      coachDismissedThose: v.number(),         // Of those, how many coach dismissed
      agreementRate: v.number(),                // coachAppliedThose / wouldAutoApplyInsights
      startedAt: v.number(),
      completedAt: v.optional(v.number()),     // After 20 insights
    })
  ),

  // NEW: Per-category preferences
  insightAutoApplyPreferences: v.optional(
    v.object({
      skills: v.boolean(),          // Auto-apply skill ratings
      attendance: v.boolean(),      // Auto-apply attendance
      goals: v.boolean(),           // Auto-apply development goals
      performance: v.boolean(),     // Auto-apply performance notes
    })
  ),
}).index("by_coach", ["coachId"]),

// NEW: Track auto-applied insights
autoAppliedInsights: defineTable({
  insightId: v.id("voiceNoteInsights"),
  playerId: v.id("orgPlayerEnrollments"),
  coachId: v.string(),
  organizationId: v.string(),
  category: v.string(),              // "skill", "attendance", etc.
  confidenceScore: v.number(),
  appliedAt: v.number(),
  undoneAt: v.optional(v.number()),
  undoReason: v.optional(v.string()),

  // What was changed
  changeType: v.string(),            // "skill_rating", "attendance", "goal"
  previousValue: v.optional(v.string()),
  newValue: v.string(),

}).index("by_coach_org", ["coachId", "organizationId"])
  .index("by_insight", ["insightId"])
  .index("by_player", ["playerId"]),
```

---

## UI Mockups

### Preview Mode Badge (Phase 7.1)

```
┌──────────────────────────────────────────────┐
│ Skill Improvement: Passing                  │
│ Clodagh improved from 3/5 to 4/5            │
│                                              │
│ AI Confidence: 85%                   ← NEW   │
│ ████████████████░░░░                         │
│ ✨ AI would auto-apply this at Level 2+      │
│                                              │
│ [Apply to Profile]  [Dismiss]               │
└──────────────────────────────────────────────┘
```

### Supervised Auto-Apply (Phase 7.2)

```
┌──────────────────────────────────────────────┐
│ ✓ Auto-Applied (1 hour ago)          ← NEW   │
│                                              │
│ Skill Improvement: Passing                  │
│ Clodagh improved from 3/5 to 4/5            │
│                                              │
│ AI Confidence: 85%                           │
│ ████████████████░░░░                         │
│                                              │
│ [Undo Auto-Apply]  [View Profile]     ← NEW  │
└──────────────────────────────────────────────┘
```

### Undo Prompt (Phase 7.2)

```
┌──────────────────────────────────────────────┐
│ Why are you undoing this auto-apply?   ← NEW │
│                                              │
│ ○ Wrong player                               │
│ ○ Wrong skill level                          │
│ ○ Insight was incorrect                      │
│ ○ Other (please explain)                     │
│                                              │
│ [Cancel]  [Undo & Submit Feedback]           │
└──────────────────────────────────────────────┘
```

---

## Risk Mitigation

### High-Risk Categories (Never Auto-Apply)
- ❌ Injury logs (medical/legal sensitivity)
- ❌ Medical profiles (HIPAA/GDPR concerns)
- ❌ Behavioral incidents (disciplinary sensitivity)
- ❌ Parent contact info (data accuracy critical)

### Medium-Risk Categories (Auto-Apply with Supervision)
- ⚠️ Development goals (can be changed easily)
- ⚠️ Performance notes (subjective, can be reviewed)
- ⚠️ Training attendance (factual but check for errors)

### Low-Risk Categories (Safe to Auto-Apply)
- ✅ Skill ratings (numeric, version-controlled)
- ✅ Attendance records (factual, easily corrected)
- ✅ Session participation (binary, low impact)

### Safeguards
1. **Version control:** All auto-applied changes are versioned
2. **Audit trail:** Track who/what/when for every change
3. **Undo window:** 1-hour grace period to revert
4. **Coach notification:** Never silent auto-apply
5. **Kill switch:** Platform staff can disable auto-apply globally

---

## Estimated Effort

**Phase 7.1 (Preview Mode):** 2 weeks
- 5 user stories
- Backend: Schema, queries, tracking
- Frontend: Confidence viz, badges
- Similar to P5 Phase 1 (already done)

**Phase 7.2 (Supervised Auto-Apply):** 2 weeks
- 4 user stories
- Auto-apply logic
- Undo mechanism
- Notifications

**Phase 7.3 (Learning Loop):** 2 weeks
- 4 user stories
- Feedback collection
- Adaptive thresholds
- Category preferences

**Total:** 6 weeks (1.5 months)

---

## Success Criteria

**Must Have (Phase 7.1):**
- ✅ Coaches see confidence scores on insights
- ✅ "AI would auto-apply" badges show correctly
- ✅ Preview mode tracks agreement rate
- ✅ No auto-application yet (safety first)

**Must Have (Phase 7.2):**
- ✅ Auto-apply works for skills & attendance
- ✅ 1-hour undo window functional
- ✅ Coaches notified of auto-applies
- ✅ <5% undo rate in first month

**Must Have (Phase 7.3):**
- ✅ Learning from coach feedback
- ✅ Adaptive thresholds working
- ✅ Category-specific preferences
- ✅ Time savings measured

---

## Dependencies

**Requires P5 Phase 1 Complete:**
- Trust level infrastructure exists
- Confidence score visualization pattern established
- Preview mode pattern proven

**Requires Schema Changes:**
- `insightPreviewModeStats` added to `coachTrustLevels`
- `autoAppliedInsights` table created
- Indexes for fast lookups

**Requires Frontend Components:**
- Insight card components support confidence viz
- Undo UI components built
- Notification system for auto-applies

---

## Questions for Discussion

1. **Which insight categories should we start with?**
   - Safest: Skills & Attendance only?
   - Or include Goals & Performance notes?

2. **Should trust levels be separate or unified?**
   - Option A: Same trust level for summaries AND insights
   - Option B: Separate trust levels (e.g., Level 2 summaries, Level 1 insights)

3. **What's the right undo window?**
   - 1 hour (matches P5 parent summaries)?
   - 24 hours (more time to review)?
   - Until next sync/session?

4. **Should we notify on every auto-apply?**
   - Toast for each one (could be annoying)?
   - Digest at end of session (less immediate)?
   - Email summary (delayed feedback)?

5. **What about bulk undo?**
   - "Undo all auto-applies from today"?
   - Or only individual undo?

---

## Next Steps

**Post P5/P6 Review:**
1. Validate this proposal with coaches
2. Survey: "Would you trust AI to auto-apply insights?"
3. Prioritize against other features
4. Decide on Phase 7 timeline

**If Approved:**
1. Create detailed PRD (like P5/P6)
2. Break into 13 user stories
3. Assign to Ralph for implementation
4. Run parallel to P5/P6 deployment monitoring

---

## Appendix: Comparison to P5

| Feature | P5 (Parent Summaries) | P7 (Insight Auto-Apply) |
|---------|----------------------|-------------------------|
| **What it automates** | Sending summaries to parents | Applying insights to player profiles |
| **Preview mode** | Show "would auto-send" badge | Show "would auto-apply" badge |
| **Confidence scores** | Already generated, make visible | Already generated, make visible |
| **Trust levels** | 0-3 (Manual → Expert) | Same 0-3 levels |
| **Undo window** | 1 hour to revoke sent message | 1 hour to undo profile change |
| **High-risk exclusions** | Injury/behavior summaries | Injury/medical insights |
| **Learning loop** | Track why coaches suppress | Track why coaches undo |
| **Success metric** | <5% revocation rate | <5% undo rate |

**Key Insight:** The systems are nearly identical! Same trust framework, same preview pattern, same progressive automation.

---

**Recommendation:** Implement Phase 7 after P5/P6 are stable and coaches demonstrate trust in parent summary automation. Use P5 as the proven blueprint.
