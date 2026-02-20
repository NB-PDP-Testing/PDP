# Bias Detection: Gap Coverage Analysis

## Executive Summary

**Status**: 12 of 15 gaps (80%) are explicitly addressed in the phased implementation plan
**Missing**: 3 gaps need explicit integration

---

## Complete Gap-to-Phase Mapping

| # | Gap | Severity | Phase | Status | Implementation Details |
|---|-----|----------|-------|--------|----------------------|
| **1** | No behavioral signal tracking | 🔴 High | **Phase 1** | ✅ **COVERED** | "Behavioral signal tracking (dwell time, completion, navigation)" + "Behavioral tracking hooks (usePageView, useEventTracking)" |
| **2** | Generic timing (not circadian) | 🔴 High | **Phase 3** | ✅ **COVERED** | "Circadian timing calculator (23.5-hour patterns)" |
| **3** | No weekly frequency cap | 🔴 High | **Phase 3** | ✅ **COVERED** | "Weekly frequency cap enforcement" |
| **4** | No differential privacy | 🔴 High | **Phase 2** | ✅ **COVERED** | "Differential privacy layer for aggregates" + "Organization-level aggregation with DP" (Phase 7) |
| **5** | No granular consent | 🔴 High | **Phase 2** | ✅ **COVERED** | "Granular consent management" + "Granular privacy settings UI" + "Consent flow during onboarding" |
| **6** | No explainability | 🟡 Medium | **Phase 2** | ✅ **COVERED** | "Explainability metadata generation" + "Explainable prompts ('Why am I seeing this?')" |
| **7** | Only one leaderboard type | 🟢 Low | **Phase 6** | ⚠️ **PARTIAL** | "Achievement system (3-4 achievements only)" mentioned, but multi-tier leaderboards not explicit |
| **8** | Streaks without forgiveness | 🟡 Medium | **Phase 6** | ✅ **COVERED** | "Streak tracking with freeze mechanism" |
| **9** | Basic sentiment analysis | 🟡 Medium | **Phase 5** | ✅ **COVERED** | "Two-tier sentiment analysis (lexicon + LLM)" + "Contextual embeddings (BERT/Hugging Face)" |
| **10** | No cold start onboarding | 🟡 Medium | **Phase 4** | ✅ **COVERED** | "Cold start onboarding preference elicitation" + "Onboarding questionnaire (5-7 questions)" |
| **11** | Unified ML model (Netflix) | 🔴 High | **Phase 4** | ⚠️ **PARTIAL** | "Learning Agent with coach clustering" + "Behavioral archetype detection" - but NOT full unified model like Netflix Hydra |
| **12** | No A/B testing framework | 🔴 High | **Phase 4** | ✅ **COVERED** | "A/B testing framework (Statsig integration)" + "A/B test variant assignment" |
| **13** | Multi-dimensional attribution | 🟢 Low | **Phase 5** | ✅ **COVERED** | "Multi-dimensional sentiment (8 dimensions)" |
| **14** | No causal inference | 🟢 Low | ❌ **MISSING** | ❌ **NOT COVERED** | Research marked as "Low priority" but not in any phase |
| **15** | No filter bubble prevention | 🟡 Medium | ❌ **MISSING** | ❌ **NOT COVERED** | Prompt diversity not explicitly addressed |

---

## Detailed Gap Analysis

### ✅ Fully Covered Gaps (10/15)

These gaps are explicitly addressed in the implementation plan:

1. **Gap #1 - Behavioral Signal Tracking** → Phase 1
   - Backend: Track dwell time, completion rate, navigation paths
   - Frontend: usePageView, useEventTracking hooks
   - Success metric: "Track 100% of coach behavioral signals"

2. **Gap #2 - Circadian Timing** → Phase 3
   - Backend: "Circadian timing calculator (23.5-hour patterns)"
   - Implementation: Learn personal timing patterns per coach
   - Based on Duolingo research (85% response rate)

3. **Gap #3 - Weekly Frequency Caps** → Phase 3
   - Backend: "Weekly frequency cap enforcement"
   - Prevents 46% opt-out rate seen at 2-5+ messages/week

4. **Gap #4 - Differential Privacy** → Phase 2 + Phase 7
   - Phase 2: "Differential privacy layer for aggregates"
   - Phase 7: "Organization-level aggregation with DP"
   - GDPR 2025 compliance requirement

5. **Gap #5 - Granular Consent** → Phase 2
   - Backend: "Granular consent management"
   - Frontend: "Granular privacy settings UI" + "Consent flow during onboarding"
   - Per-feature opt-in (not all-or-nothing)

6. **Gap #6 - Explainability** → Phase 2
   - Backend: "Explainability metadata generation"
   - Frontend: "Explainable prompts ('Why am I seeing this?')"
   - XAI market growing 20.7% CAGR

7. **Gap #8 - Streak Freeze** → Phase 6
   - Backend: "Streak tracking with freeze mechanism"
   - Allow 2 missed days/month (Duolingo: -21% churn)

8. **Gap #9 - Contextual Sentiment** → Phase 5
   - Backend: "Two-tier sentiment analysis" + "Contextual embeddings (BERT/Hugging Face)"
   - Cost optimization: Lexicon (70%) + BERT (20%) + LLM (10%)

9. **Gap #10 - Cold Start Onboarding** → Phase 4
   - Backend: "Cold start onboarding preference elicitation"
   - Frontend: "Onboarding questionnaire (5-7 questions)"
   - Learn preferences before first prompt

10. **Gap #12 - A/B Testing** → Phase 4
    - Backend: "A/B testing framework (Statsig integration)"
    - Frontend: "A/B test variant assignment"
    - Duolingo runs 200+ experiments

11. **Gap #13 - Multi-dimensional Attribution** → Phase 5
    - Backend: "Multi-dimensional sentiment (8 dimensions)"
    - Includes effort/ability attribution detection

---

### ⚠️ Partially Covered Gaps (2/15)

These gaps are addressed but not fully implemented as described in research:

#### **Gap #7 - Multi-Tier Leaderboards** → Phase 6 (PARTIAL)

**In Plan**:
- "Achievement system (3-4 achievements only)"
- "Opt-in benchmarking toggle"

**Missing**:
- Explicit mention of 4 leaderboard types (Coverage, Quality, Most Improved, Consistency)
- Strava-style segment competition

**Research Recommendation**:
```typescript
leaderboards: {
  weeklyCoverage: [...],     // Who has best coverage this week
  mostImproved: [...],        // Biggest improvement vs last month
  qualityLeaders: [...],      // Highest actionability scores
  consistencyLeaders: [...]   // Longest streaks
}
```

**Recommendation**: Add explicit line item to Phase 6:
- Backend: "Multi-tier leaderboard calculations (4 types)"
- Frontend: "Leaderboard tabs with filters (Coverage/Quality/Improvement/Consistency)"

---

#### **Gap #11 - Unified ML Model (Netflix Hydra)** → Phase 4 (PARTIAL)

**In Plan**:
- "Learning Agent with coach clustering"
- "Behavioral archetype detection"

**Missing**:
- Full unified model approach (single embedding for all decisions)
- Shared coach understanding across Pattern Detection, Prompt Generation, and Timing

**Research Recommendation**:
```typescript
// Unified coach understanding model
const coachEmbedding = await generateCoachEmbedding({
  insightHistory: [...],
  behavioralSignals: {...},
  responseHistory: [...],
  qualityMetrics: {...},
});

// Use embedding for ALL decisions
const patternAnalysis = analyzePatterns(coachEmbedding);
const optimalPrompt = generatePrompt(coachEmbedding);
const bestTiming = calculateTiming(coachEmbedding);
```

**Current Plan**: Separate agents (Pattern Detective, Prompt Generator, Learning, Orchestrator)

**Recommendation**: Update Phase 4 to include:
- Backend: "Unified coach embedding model (shared across all agents)"
- Research shows 20-30% better performance with unified models

---

### ❌ Missing Gaps (3/15)

These gaps are not explicitly addressed in any phase:

#### **Gap #14 - Causal Inference** (🟢 Low Priority)

**Status**: Not included in any phase

**Research Notes**:
- "Add causal analysis in later phase"
- Marked as "Low" severity
- Would help understand "why" patterns occur, not just correlation

**Recommendation**:
- **Option 1**: Add to Phase 8 (Future Enhancements)
- **Option 2**: Defer to post-launch iteration
- **Justification**: Low priority; focus on proven patterns first

**If Added (Phase 8)**:
- Backend: "Causal inference layer (identify root causes of bias patterns)"
- Use techniques like propensity score matching, difference-in-differences

---

#### **Gap #15 - Filter Bubble Prevention** (🟡 Medium Priority)

**Status**: Not included in any phase

**Research Notes**:
- "Vary prompt types, avoid repetition"
- Marked as "Medium" severity
- Prevents "prompt fatigue" echo chamber

**Recommendation**: **ADD TO PHASE 3** (Intelligent Prompting)

**Why It Matters**:
- If coach only sees one prompt type, they may tune out
- Variety prevents habituation
- Industry standard: Rotate prompt styles

**Proposed Addition to Phase 3**:
```markdown
**Backend**:
- ⬜ Prompt Generator Agent (3 tone variants)
- ⬜ Circadian timing calculator (23.5-hour patterns)
- ⬜ Weekly frequency cap enforcement
- ⬜ Multi-channel delivery strategy
- ⬜ **Prompt diversity engine (vary type/tone to prevent habituation)**  <-- NEW

**Frontend**:
- ⬜ Bottom sheet prompts with tone variations
- ⬜ In-app banner prompts
- ⬜ Push notification integration
- ⬜ Prompt dismissal tracking
- ⬜ **Prompt variety tracking (max 2 same-type prompts in a row)** <-- NEW
```

**Implementation**:
```typescript
// Track recent prompt types per coach
coachPromptHistory: defineTable({
  coachId: v.string(),
  recentPromptTypes: v.array(v.string()), // Last 5 prompt types
  lastPromptTone: v.string(),              // gentle/data/contextual
  consecutiveSameType: v.number(),         // Counter
})

// In Orchestrator Agent decision logic
if (coach.consecutiveSameType >= 2) {
  // Force different prompt type
  excludeTypes = [coach.lastPromptTone];
}
```

---

### **Gap #7 - Multi-Tier Leaderboards** (🟢 Low Priority)

**Status**: Partially in Phase 6, but not explicit

**Research Notes**:
- Strava pattern: Multiple leaderboards so everyone can "win"
- 4 types: Coverage, Quality, Most Improved, Consistency

**Recommendation**: **CLARIFY IN PHASE 6**

**Proposed Update to Phase 6**:
```markdown
**Backend**:
- ⬜ Streak tracking with freeze mechanism
- ⬜ Achievement system (3-4 achievements only)
- ⬜ **Multi-tier leaderboard calculations (Coverage/Quality/Improvement/Consistency)** <-- CLARIFY
- ⬜ Opt-in benchmarking with DP
- ⬜ Progress tracking

**Frontend**:
- ⬜ Subtle streak counter
- ⬜ Progress toward goals
- ⬜ Achievement unlock modals (minimal)
- ⬜ **Leaderboard tabs with 4 types (opt-in)** <-- ADD
- ⬜ Opt-in benchmarking toggle
```

---

## Summary: What Needs to Be Added

### High Priority (Add Now)

1. **Gap #15 - Filter Bubble Prevention** (Medium severity)
   - **Add to Phase 3**
   - Backend: Prompt diversity engine
   - Frontend: Prompt variety tracking
   - Prevents habituation and prompt fatigue

2. **Gap #11 - Unified ML Model** (High severity, but partial coverage)
   - **Update Phase 4** to explicitly include unified embeddings
   - Backend: "Unified coach embedding model (shared across all agents)"
   - Research-backed 20-30% improvement

### Medium Priority (Clarify Now)

3. **Gap #7 - Multi-Tier Leaderboards** (Low severity, but already planned)
   - **Clarify in Phase 6**
   - Make explicit the 4 leaderboard types
   - Add UI tab navigation

### Low Priority (Defer)

4. **Gap #14 - Causal Inference** (Low severity)
   - **Add to Phase 8 (Future Enhancements)** or defer to post-launch
   - Not blocking for launch
   - Nice-to-have for advanced analytics

---

## Recommended Updates to Implementation Plan

### Update 1: Phase 3 - Add Filter Bubble Prevention

```diff
### Phase 3: Intelligent Prompting with Timing (Weeks 7-9)

**Backend**:
- ⬜ Prompt Generator Agent (3 tone variants)
- ⬜ Circadian timing calculator (23.5-hour patterns)
- ⬜ Weekly frequency cap enforcement
- ⬜ Multi-channel delivery strategy
+ ⬜ Prompt diversity engine (vary type/tone to prevent habituation)

**Frontend**:
- ⬜ Bottom sheet prompts with tone variations
- ⬜ In-app banner prompts
- ⬜ Push notification integration
- ⬜ Prompt dismissal tracking
+ ⬜ Prompt variety tracking (max 2 same-type prompts in a row)
```

### Update 2: Phase 4 - Clarify Unified Model

```diff
### Phase 4: Learning & A/B Testing (Weeks 10-12)

**Backend**:
- ⬜ Learning Agent with coach clustering
+ ⬜ Unified coach embedding model (shared across all agents)
- ⬜ A/B testing framework (Statsig integration)
- ⬜ Behavioral archetype detection
- ⬜ Cold start onboarding preference elicitation
```

### Update 3: Phase 6 - Clarify Multi-Tier Leaderboards

```diff
### Phase 6: Subtle Gamification (Weeks 16-17)

**Backend**:
- ⬜ Streak tracking with freeze mechanism
- ⬜ Achievement system (3-4 achievements only)
+ ⬜ Multi-tier leaderboard calculations (Coverage/Quality/Improvement/Consistency)
- ⬜ Opt-in benchmarking with DP
- ⬜ Progress tracking

**Frontend**:
- ⬜ Subtle streak counter
- ⬜ Progress toward goals
- ⬜ Achievement unlock modals (minimal)
+ ⬜ Leaderboard tabs with 4 types (opt-in, anonymized)
- ⬜ Opt-in benchmarking toggle
```

### Update 4: Add Phase 8 - Future Enhancements (Optional)

```markdown
### Phase 8: Advanced Analytics (Future - Post-Launch)

**Backend**:
- ⬜ Causal inference layer (identify root causes of patterns)
- ⬜ Advanced predictive modeling
- ⬜ Cross-organization benchmarking (with DP)
- ⬜ Long-term impact tracking

**Frontend**:
- ⬜ Advanced analytics dashboard
- ⬜ Causal insights visualization
- ⬜ Predictive alerts

**Success Metric**: Identify causal factors in bias patterns with 80%+ accuracy
```

---

## Final Gap Coverage Score

| Status | Count | Percentage | Gaps |
|--------|-------|------------|------|
| ✅ Fully Covered | 10 | 67% | #1, #2, #3, #4, #5, #6, #8, #9, #10, #12, #13 |
| ⚠️ Partially Covered | 2 | 13% | #7, #11 |
| ❌ Not Covered | 3 | 20% | #14 (Low), #15 (Medium) |
| **TOTAL** | **15** | **100%** | |

### After Recommended Updates

| Status | Count | Percentage | Gaps |
|--------|-------|------------|------|
| ✅ Fully Covered | 13 | 87% | All high + medium priority |
| ⚠️ Deferred | 1 | 7% | #14 (Low - causal inference) |
| ❌ Not Covered | 1 | 7% | None (all addressed) |

---

## Recommendation

**Action Required**: Update the implementation plan document with 3 changes:
1. **Add to Phase 3**: Filter bubble prevention (Gap #15)
2. **Clarify Phase 4**: Unified model approach (Gap #11)
3. **Clarify Phase 6**: Multi-tier leaderboards (Gap #7)
4. **Optional**: Add Phase 8 for causal inference (Gap #14)

This will bring gap coverage from **80% → 93%** (deferred low-priority item).

**Next Step**: Should I update the comprehensive plan document with these additions?
