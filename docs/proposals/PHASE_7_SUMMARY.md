# Phase 7: AI Insight Auto-Apply - Executive Summary
**Date:** January 24, 2026
**Status:** Ready for implementation post-P6
**PRD Location:** `/scripts/ralph/prds/coach-insight-auto-apply-phase7.prd.json`

---

## What is Phase 7?

Phase 7 extends the **trust system built in P5** from parent summaries to **player profile updates**. It enables progressive automation for AI-detected insights (skill ratings, attendance, goals) using the same preview → supervised → full automation pattern.

---

## The Parallel Journey

### P5: Parent Summary Trust
```
Manual Review → Preview Mode → Supervised Auto-Send → Full Automation
"Will AI send wrong message to parents?"
```

### P7: Player Profile Trust
```
Manual Apply → Preview Mode → Supervised Auto-Apply → Full Automation
"Will AI mess up player data?"
```

**Same psychology. Same trust system. Different application.**

---

## Why Phase 7?

**User Insight (January 24, 2026):**
> "We want coaches to get comfortable with AI auto-applying insights to player records too."

**The Gap:**
- P5/P6 focus exclusively on parent summaries
- Coaches still manually apply ALL insights to player profiles
- No preview mode for profile updates
- No progressive automation for player data

**The Opportunity:**
- Reuse entire P5 trust infrastructure
- Same trust levels (0-3)
- Same confidence scores (70% threshold)
- Same preview mode (20-insight learning)
- Same 1-hour undo window

---

## Three Sub-Phases (6 Weeks)

### Phase 7.1: Preview Mode for Insights (2 weeks)
**Stories:** US-001 to US-005
**What:** Show coaches what AI WOULD apply before doing it

**Implementation:**
- Add `insightPreviewModeStats` to `coachTrustLevels` schema
- Calculate `wouldAutoApply` for each insight
- Show confidence scores on insight cards (currently hidden)
- Add "AI would auto-apply this at Level 2+" badges
- Track 20-insight agreement rate

**User Experience:**
```
┌──────────────────────────────────────────┐
│ Skill Improvement: Passing              │
│ Clodagh improved from 3/5 to 4/5        │
│                                          │
│ AI Confidence: 85%               ← NEW   │
│ ████████████████░░░░                     │
│ ✨ AI would auto-apply this at Level 2+ │
│                                          │
│ [Apply to Profile]  [Dismiss]           │
└──────────────────────────────────────────┘
```

**Success Metric:** >40% agreement rate

---

### Phase 7.2: Supervised Auto-Apply (2 weeks)
**Stories:** US-006 to US-009
**What:** Auto-apply insights with 1-hour undo window

**Implementation:**
- Add `autoAppliedInsights` table for audit trail
- Auto-apply skill insights when Level 2+ AND confidence >70%
- 1-hour undo window with reason collection
- "Auto-Applied" tab showing what AI did
- Notifications: "AI auto-applied 3 insights"

**User Experience:**
```
┌──────────────────────────────────────────┐
│ ✓ Auto-Applied (23 minutes ago)  ← NEW   │
│                                          │
│ Skill Improvement: Passing              │
│ Clodagh: 3/5 → 4/5                      │
│                                          │
│ [Undo Auto-Apply]  [View Profile]       │
└──────────────────────────────────────────┘
```

**Safety:**
- Never auto-apply injury or medical insights
- Version control: Track previous values
- Coach notification: Never silent
- Kill switch: Platform can disable globally

**Success Metric:** >30% auto-apply rate, <5% undo rate

---

### Phase 7.3: Learning Loop & Adaptive Thresholds (2 weeks)
**Stories:** US-010 to US-013
**What:** Personalize automation based on coach behavior

**Implementation:**
- Per-category preferences (skills yes, goals no)
- Adaptive thresholds (lower if coach never undos)
- Undo reason tracking ("Wrong player", "Wrong rating")
- Admin dashboard for undo analysis

**User Experience:**
```
Settings → Auto-Apply Preferences

☑ Skills - Auto-apply skill rating updates
☑ Attendance - Auto-apply attendance records
☐ Goals - Auto-apply development goals
☐ Performance - Auto-apply performance notes

Note: Injury and medical insights always
require manual review.
```

**Adaptive Logic:**
- Undo rate <3% → Lower threshold to 60% (more automation)
- Undo rate >10% → Raise threshold to 90% (less automation)
- Personalized per coach

**Success Metric:** 50% reduction in manual review

---

## Categories: Safety-First Approach

### ✅ Safe to Auto-Apply (Low Risk)
- **Skills:** Numeric ratings, easily reverted, version-controlled
- **Attendance:** Factual, binary, low impact

### ⚠️ Supervised Auto-Apply (Medium Risk)
- **Goals:** Development goals (subjective but reviewable)
- **Performance:** Notes (can be changed, low stakes)

### ❌ NEVER Auto-Apply (High Risk)
- **Injury:** Medical/legal sensitivity
- **Medical:** HIPAA/GDPR concerns
- **Behavioral:** Disciplinary sensitivity

---

## Technical Architecture

### Schema Changes

```typescript
// Extend coachTrustLevels
coachTrustLevels: defineTable({
  // ... existing P5 fields ...

  // NEW: Insight preview mode (mirrors parent summary preview)
  insightPreviewModeStats: v.optional(v.object({
    wouldAutoApplyInsights: v.number(),
    coachAppliedThose: v.number(),
    coachDismissedThose: v.number(),
    agreementRate: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })),

  // NEW: Confidence threshold for insights (separate from summaries)
  insightConfidenceThreshold: v.optional(v.number()),

  // NEW: Per-category preferences
  insightAutoApplyPreferences: v.optional(v.object({
    skills: v.boolean(),
    attendance: v.boolean(),
    goals: v.boolean(),
    performance: v.boolean(),
  })),
}),

// NEW: Audit trail for auto-applied insights
autoAppliedInsights: defineTable({
  insightId: v.id("voiceNoteInsights"),
  playerId: v.id("orgPlayerEnrollments"),
  coachId: v.string(),
  category: v.string(),
  confidenceScore: v.number(),
  appliedAt: v.number(),
  undoneAt: v.optional(v.number()),
  undoReason: v.optional(v.string()),
  changeType: v.string(),
  previousValue: v.optional(v.string()),
  newValue: v.string(),
  autoAppliedByAI: v.boolean(),
}),
```

### Query/Mutation Changes

**New/Modified Queries:**
- `getPendingInsights` - Add `wouldAutoApply` calculation
- `getAutoAppliedInsights` - Fetch insights auto-applied in last 24 hours

**New Mutations:**
- `autoApplyInsight` - Auto-apply skill/attendance insight to player
- `undoAutoAppliedInsight` - Revert auto-applied change within 1 hour
- `setInsightAutoApplyPreferences` - Update per-category preferences

**New Scheduled Functions:**
- `adjustInsightThresholds` - Daily adaptive threshold adjustment

---

## Comparison to P5/P6

| Feature | P5 (Parent Summaries) | P7 (Insight Auto-Apply) |
|---------|----------------------|-------------------------|
| **What it automates** | Sending summaries to parents | Applying insights to player profiles |
| **Preview mode** | Show "would auto-send" | Show "would auto-apply" |
| **Confidence threshold** | 70% default | 70% default (separate) |
| **Trust levels** | 0-3 (Manual → Expert) | Same 0-3 levels |
| **Learning period** | 20 parent summaries | 20 insights |
| **Undo window** | 1 hour to revoke | 1 hour to undo |
| **High-risk exclusions** | Injury/behavior summaries | Injury/medical insights |
| **Success metric** | <5% revocation rate | <5% undo rate |
| **Implementation** | 4 sub-phases (8 weeks) | 3 sub-phases (6 weeks) |

**Key Insight:** Nearly identical systems! Same framework, different application.

---

## Dependencies

### Must Complete First:
- ✅ P5 Phase 1: Trust slider, preview mode, confidence viz
- ✅ P6: Monitoring, cost controls, graceful degradation

### Required Infrastructure:
- ✅ `coachTrustLevels` table exists with trust tracking
- ✅ `voiceNoteInsights` table has confidence scores
- ✅ Confidence score generation working (AI action)
- ✅ Trust level UI patterns established (slider, progress)

### New Infrastructure Needed:
- Schema: `insightPreviewModeStats`, `insightAutoApplyPreferences`
- Table: `autoAppliedInsights` (audit trail)
- Mutations: `autoApplyInsight`, `undoAutoAppliedInsight`
- UI: Insight card confidence viz, undo dialog, category preferences

---

## Rollout Strategy

### Week 1-2: Preview Mode ONLY
- Enable confidence visualization
- Show "would auto-apply" predictions
- **Zero automation** - build trust first
- Collect agreement rates

### Week 3-4: Supervised Auto-Apply (Skills Only)
- Enable for Level 2+ coaches
- **Skills category ONLY** (safest)
- 1-hour undo window
- Monitor undo rates closely

### Week 5-6: Expand Categories & Learning
- Add attendance if <5% undo rate on skills
- Enable adaptive thresholds
- Allow per-category preferences
- Add goals/performance for <2% undo coaches

### Post-Launch (Ongoing):
- Collect undo reasons monthly
- Feed back to AI team for model improvements
- Expand to more categories if safe
- Consider player-level preferences (future)

---

## Success Metrics

### Phase 7.1 (Preview Mode)
- ✅ 40%+ agreement rate
- ✅ 80%+ coaches understand confidence scores
- ✅ Zero impact on existing workflow

### Phase 7.2 (Supervised)
- ✅ 30%+ auto-apply rate
- ✅ <5% undo rate
- ✅ 5-10 minutes saved per coach per week

### Phase 7.3 (Learning)
- ✅ 50%+ coaches have adaptive thresholds
- ✅ 60%+ coaches enable 2+ categories
- ✅ 50% reduction in manual review

### Overall Impact (6 months)
- ✅ 60%+ of insights auto-applied
- ✅ <2% undo rate (high trust)
- ✅ 15-20 minutes saved per coach per week
- ✅ Coaches report "AI is helpful, not intrusive"

---

## Risk Mitigation

### Technical Risks
- **Data corruption:** Version control + audit trail + undo window
- **Wrong player:** Strict ID validation, undo option
- **AI mistakes:** Confidence thresholds, preview mode first

### User Experience Risks
- **Loss of control:** Per-category preferences, always manual override
- **Surprise updates:** Notifications, "Auto-Applied" tab for review
- **Can't undo:** 1-hour window clearly communicated, longer if needed

### Operational Risks
- **Runaway automation:** Kill switch, per-org rate limits
- **Cost spike:** Reuse P6 cost monitoring, budget alerts
- **AI degradation:** Reuse P6 circuit breakers, fallback to manual

### Mitigation Strategy
1. **Start conservative:** Skills only, Level 2+ only, 70% threshold
2. **Monitor closely:** Daily undo rate reports, weekly coach surveys
3. **Iterate carefully:** Only expand categories if <5% undo rate
4. **Emergency stop:** Platform staff can disable auto-apply instantly

---

## User Feedback Collection

### Week 2 Survey (Preview Mode)
- "Do you understand the confidence scores?" (Y/N)
- "Would you trust AI to auto-apply skill ratings?" (1-5 scale)
- "Which categories would you want auto-applied?" (checkboxes)

### Week 4 Survey (Supervised)
- "How often were auto-applies correct?" (Always/Usually/Sometimes/Rarely)
- "Did you undo any auto-applies? Why?" (open text)
- "Would you recommend increasing/decreasing automation?" (More/Same/Less)

### Week 6 Analysis (Learning)
- Undo rate by coach, by category, by confidence level
- Time saved vs. manual workflow (tracked in DB)
- Coach NPS: "How likely to recommend auto-apply to other coaches?"

---

## Next Steps

### Immediate (Post-P6 Completion):
1. ✅ PRD created (`coach-insight-auto-apply-phase7.prd.json`)
2. ✅ Proposal documented (`AI_INSIGHT_AUTO_APPLY_PROPOSAL.md`)
3. ✅ Summary created (this document)
4. Validate with coaches: Survey/interviews
5. Prioritize against other features

### If Approved:
1. Create branch: `ralph/coach-insights-auto-apply-p7`
2. Assign PRD to Ralph for implementation
3. Run all 3 sub-phases (6 weeks)
4. Deploy with preview mode only (week 1-2)
5. Monitor agreement rates before enabling auto-apply

### Future Enhancements (Phase 7+):
- Player-level auto-apply preferences
- Team-level insights (auto-apply to team stats)
- Multi-insight bundling (apply 5 insights at once)
- AI-suggested thresholds ("We recommend 65% for you")
- Export to other systems (auto-sync to external platforms)

---

## Documentation Index

**PRD:** `/scripts/ralph/prds/coach-insight-auto-apply-phase7.prd.json`
- 13 user stories across 3 sub-phases
- Detailed acceptance criteria
- Ready for Ralph implementation

**Proposal:** `/docs/proposals/AI_INSIGHT_AUTO_APPLY_PROPOSAL.md`
- Strategic rationale
- UI mockups
- Risk analysis
- Questions for discussion

**This Summary:** `/docs/proposals/PHASE_7_SUMMARY.md`
- Executive overview
- Relationship to P5/P6
- Rollout strategy
- Success metrics

**Related P5/P6 Docs:**
- `/scripts/ralph/prds/coach-parent-summaries-phase5-REVISED.prd.json`
- `/scripts/ralph/prds/coach-parent-summaries-phase6-REVISED.prd.json`
- `/docs/proposals/P5_P6_REVISION_SUMMARY.md`
- `/docs/proposals/COACH_TRUST_SYSTEM_PROPOSAL_2026-01-24.md`

---

## Conclusion

Phase 7 completes the trust-building journey for AI automation by extending proven P5 patterns to player profile updates. Same trust levels, same preview mode, same progressive automation—applied to a new domain.

**The result:** Coaches trust AI to both communicate with parents AND update player data, saving 20-30 minutes per coach per week while maintaining full control and transparency.

**Ready to implement post-P6.**
