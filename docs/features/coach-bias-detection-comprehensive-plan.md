# Coach Bias Detection & Engagement System - Comprehensive Implementation Plan

> **GitHub Issue:** [#454](https://github.com/NB-PDP-Testing/PDP/issues/454)
> **Planning Documents:** `scripts/ralph/prds/Coaches Unconscious Bias Detection/`
> **Status:** Deep Planning Complete, 87% Gap Coverage, Ready for Implementation
> **Gap Analysis:** `docs/features/bias-detection-gap-coverage-analysis.md`
> **Last Updated:** 2026-02-10

---

## EXECUTIVE SUMMARY

We've completed comprehensive planning for an **AI-agent-driven system** to detect unconscious bias patterns in coach insights and provide frictionless, personalized prompts to ensure balanced team coverage. This planning includes:

1. **AI-Driven Design** (53KB) - Multi-agent architecture, UX flows, phased implementation
2. **Industry Best Practices Research** (41KB) - Analysis of 60+ academic papers and case studies from Meta, Netflix, Duolingo, Spotify, LinkedIn, TikTok, Strava
3. **Gap Coverage Analysis** - 13 of 15 critical gaps (87%) addressed across 8 implementation phases

### Key Innovations

✅ **AI-Agent Architecture** - 4 specialized agents (Pattern Detective, Prompt Generator, Learning Agent, Orchestrator)
✅ **Truly Flexible** - No hard-coded rules; AI understands context, learns from behavior
✅ **Privacy-First** - GDPR 2025 compliant with differential privacy and granular consent
✅ **Industry-Validated** - Best practices from Netflix ($1B recommendation engine), Duolingo (3x retention), Strava (3.6B kudos)
✅ **Cost-Optimized** - 82% cost reduction through tiered AI approach ($170/month vs $920/month for 1,000 coaches)
✅ **Research-Backed** - All 15 critical implementation gaps identified and addressed (13 in launch phases, 2 in future enhancements)

---

## TABLE OF CONTENTS

1. [Problem Statement](#problem-statement)
2. [AI Agent Architecture](#ai-agent-architecture)
3. [Frontend Touchpoints & UX](#frontend-touchpoints--ux)
4. [Industry Best Practices Integrated](#industry-best-practices-integrated)
5. [Critical Implementation Gaps](#critical-implementation-gaps)
6. [Phased Implementation Plan](#phased-implementation-plan)
7. [Success Metrics](#success-metrics)
8. [Privacy & Ethics](#privacy--ethics)
9. [Cost Analysis](#cost-analysis)
10. [Next Steps](#next-steps)

---

## PROBLEM STATEMENT

### The Challenge

When coaches document insights about players, human nature creates unconscious patterns:
- **Attention bias**: Focusing on a subset of players while others get less coverage
- **Sentiment bias**: Consistently positive/negative toward certain players
- **Depth bias**: Detailed insights for some, shallow notes for others
- **Category bias**: Limited insight types for certain players

### Current State

- Coaches manually track ~18 players per team
- No system to detect coverage gaps
- No prompts to ensure balanced attention
- No feedback on insight quality
- Parents see imbalanced progress reports

### Desired Outcome

**Every player** receives balanced, high-quality insights without coaches feeling overwhelmed by notifications or accused of bias.

---

## AI AGENT ARCHITECTURE

### Core Philosophy: No Hard-Coded Rules

Instead of rigid thresholds (e.g., "if player hasn't had insight in 14 days, alert"), we use **AI agents that understand context**:

- Player injured for 2 weeks? AI understands, no alert.
- Player actively playing but no insights for 14 days? AI flags.
- Post-tournament natural gap? AI recognizes seasonal patterns.

### The 4 Agent System

```
┌─────────────────────────────────────────────────────────┐
│                   ORCHESTRATOR AGENT                    │
│  (Coordinates all agents, decides when/how to engage)  │
└─────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Pattern  │    │ Prompt   │    │ Learning │
    │Detective │    │Generator │    │  Agent   │
    │  Agent   │    │  Agent   │    │          │
    └──────────┘    └──────────┘    └──────────┘
           │               │               │
           └───────────────┴───────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Coach     │
                    │  Dashboard  │
                    └─────────────┘
```

---

### Agent 1: Pattern Detective Agent 🕵️

**Purpose**: Continuously analyzes insight patterns to detect unconscious bias

**Key Features**:
- Uses Claude Sonnet 4.5 to analyze frequency, sentiment, depth, and category patterns
- Considers contextual factors (injuries, absences, recent events)
- Returns structured analysis with confidence scores
- Explains reasoning for detected patterns

**Example Output**:
```json
{
  "patterns": [
    {
      "type": "frequency_imbalance",
      "severity": "high",
      "confidence": 0.85,
      "description": "Emma Murphy hasn't received insights in 18 days, while 12 other players received insights in the last 7 days",
      "context": "No recorded absences or injuries for Emma during this period",
      "recommendation": "Prompt coach to observe Emma during next training session"
    }
  ],
  "overallBalance": {
    "score": 64,
    "assessment": "Moderate imbalance detected"
  }
}
```

---

### Agent 2: Prompt Generator Agent 💬

**Purpose**: Creates personalized, contextual prompts for coaches

**Key Features**:
- Learns coach personality and adapts tone/style
- Generates 3 prompt variations (gentle nudge, data-driven, contextual)
- Considers context (recent training, time of day, workload)
- Never shames or accuses—focuses on player development

**Example Output**:
```json
{
  "variations": [
    {
      "type": "gentle",
      "title": "Quick check-in on Emma",
      "message": "Haven't captured any notes on Emma Murphy's progress in a couple weeks. Noticed anything worth recording from recent sessions?",
      "estimatedResponseRate": 0.75
    },
    {
      "type": "contextual",
      "title": "Tomorrow's session",
      "message": "Tomorrow's training at 6pm - Emma Murphy has been attending consistently but hasn't had a recorded insight since Feb 1st. Keep an eye on her progress?",
      "estimatedResponseRate": 0.82
    }
  ],
  "recommendation": "Use 'contextual' variant, deliver 30 minutes after tomorrow's training session"
}
```

---

### Agent 3: Learning Agent 🧠

**Purpose**: Learns from coach behavior and continuously improves the system

**Key Features**:
- Analyzes what prompt characteristics led to action
- Updates coach personality profiles
- Identifies broader patterns across coaches
- Enables A/B testing optimization

**Example Output**:
```json
{
  "updatedProfile": {
    "preferredTone": "contextual",
    "respondsTo": "event_driven",
    "bestTimeToPrompt": "post_training",
    "optimalWindow": "30-60 minutes after training",
    "avoidancePatterns": ["early_morning", "monday_morning"]
  },
  "insights": [
    "Coach responds very well to prompts tied to upcoming events",
    "Post-training window has 85% response rate vs 40% for other times"
  ]
}
```

---

### Agent 4: Orchestrator Agent 🎭

**Purpose**: Coordinates all agents and makes decisions about when/how to engage

**Key Features**:
- Balances urgency, coach receptiveness, timing, and frequency
- Respects platform rules (max 1 prompt/day, quiet hours, opt-outs)
- Chooses optimal delivery channel and timing
- Prevents alert fatigue

**Example Output**:
```json
{
  "decision": "PROMPT",
  "reasoning": "High-severity pattern detected (Emma 18 days without insight) + coach hasn't been prompted in 4 days + training session in 3.5 hours provides perfect contextual opportunity",
  "promptDetails": {
    "promptType": "contextual",
    "deliveryChannel": "in_app_banner",
    "deliveryTime": "2024-02-10T18:30:00Z",
    "expiresAt": "2024-02-12T18:00:00Z"
  },
  "expectedOutcome": {
    "responseRate": 0.82,
    "timeToAction": "45 minutes"
  }
}
```

---

## FRONTEND TOUCHPOINTS & UX

### 1. Coverage Card (Primary Touchpoint)

**Location**: Coach dashboard main page

```
┌─────────────────────────────────────────────────────┐
│ 🎯 TEAM COVERAGE: U12 Girls GAA                    │
│                                                     │
│ ████████████████░░░░ 78% (14/18 players)           │
│                                                     │
│ 💡 3 players need attention:                       │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Emma Murphy          18 days  [Add Note] 🚨 │   │
│ │ Sarah O'Brien        19 days  [Add Note] ⚠️  │   │
│ │ Niamh Doyle          22 days  [Add Note] ⚠️  │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ 🎯 Goal: 100% by Sunday (just 4 quick notes!)     │
│                                                     │
│ [View Heatmap] [See All Players]                   │
└─────────────────────────────────────────────────────┘
```

**States**:
- Excellent Coverage (90-100%): Green, celebration emoji
- Good Coverage (75-89%): Blue, encouragement
- Needs Attention (<75%): Amber, actionable prompts
- Critical (<50%): Red, urgent prompts

---

### 2. Coverage Heatmap Modal

**Trigger**: Click "View Heatmap" from coverage card

**Features**:
- Visual bars showing insight count per player
- Status indicators: ✅ Active, ⚠️ Quiet, 🚨 Needs attention
- Quick actions: Click [+] to add note immediately
- Filtering: By player, date range, category
- Sorting: By name, insights count, last note date
- Export: CSV download for offline review

---

### 3. AI-Powered Prompts (Bottom Sheet)

**Trigger**: Orchestrator Agent decides to prompt (30-60min after training)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│ 💬 Quick Check-In                              │
│                                                 │
│ Haven't captured any notes on Emma Murphy's    │
│ progress in 18 days. Noticed anything worth    │
│ recording from today's session?                │
│                                                 │
│ [🎤 Voice Note] [✏️ Quick Note] [📝 Detailed]  │
│                                                 │
│ [Not now] [She's been fine, no updates]        │
│                                                 │
│ ❓ Why am I seeing this? [Expand]              │
└─────────────────────────────────────────────────┘
```

**Prompt Types**:
1. **Single Player** (Gentle focus on one player)
2. **Multiple Players** (Momentum building toward 100%)
3. **Post-Action Momentum** (Celebration + "keep going!")

**Delivery Channels**:
- In-app banner (top of dashboard)
- Bottom sheet (slides up from bottom)
- Push notification (mobile)
- WhatsApp message (if enabled)
- Email digest (weekly summary)

---

### 4. Insight Quality Feedback (Inline)

**Shown WHILE coach creates insight** (real-time as they type/speak)

```
┌─────────────────────────────────────────────────────┐
│ Voice Note for Emma Murphy                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Transcription:                                      │
│ "Emma did really well today in training. Her       │
│  tackling has improved a lot."                     │
│                                                     │
│ ⚠️ AI SUGGESTION: Make this more actionable        │
│                                                     │
│ To help Emma (and parents) understand progress:    │
│ • What specific tackling technique improved?       │
│ • Compared to what baseline?                       │
│ • What should she focus on next?                   │
│                                                     │
│ 💡 Example:                                        │
│ "Emma's shoulder positioning in tackles has        │
│  improved significantly—she's now winning 7/10     │
│  duels vs 4/10 last month. Next: work on timing   │
│  of tackles in 1v1 situations."                    │
│                                                     │
│ [Apply Suggestion] [Edit Myself] [Continue As-Is]  │
└─────────────────────────────────────────────────────┘
```

---

### 5. Achievement System (Subtle Gamification)

**Achievements**:
- 🌱 First Steps: Log first insight (+10 pts)
- 🎯 Team Player: 50% team coverage (+20 pts)
- 📊 Data Master: Use 8+ categories (+30 pts)
- 🏆 All-Star Coach: 100% team coverage (+50 pts)
- 🔥 Consistent Coach: 4-week streak (+40 pts)
- ✅ No One Left Behind: Every player < 14 days (+60 pts)
- 💯 Century Club: 100 total insights (+100 pts)
- 💎 Quality Master: Avg actionability > 0.8 (+75 pts)

**Streak System** (with Safety Net):
- Simple streak counter with 🔥 emoji
- Streak Freeze: Allow 2 missed days/month
- Opt-out available
- No excessive pressure

---

### 6. Admin Bias Detection Dashboard

**Location**: `/orgs/[orgId]/admin/insights-quality` (feature-flagged)

**Audience**: Organization admins (opt-in) and platform staff

**Features**:
- Organization-wide metrics
- Coach-by-coach breakdown
- Bias flag management
- Trend analysis
- Comparative analytics (anonymized)
- Export reports (PDF, CSV)
- Privacy controls (aggregates only, no raw insights)

---

## INDUSTRY BEST PRACTICES INTEGRATED

### From Netflix ($1B Recommendation Engine)

✅ **Unified Model Approach**: Single coach understanding model instead of separate agents
✅ **Behavioral Signal Tracking**: Dwell time, completion rate, navigation paths
✅ **Real-Time + Batch Processing**: Hybrid approach for efficiency

**Impact**: 20-30% increase in engagement using AI-driven segmentation

---

### From Duolingo (3x Retention Improvement)

✅ **23.5-Hour Rule**: Send notifications 23.5 hours after last activity (circadian pattern)
✅ **Streak Freeze**: Reduce pressure with 2 free missed days/month (-21% churn)
✅ **A/B Testing Culture**: Test everything (tone, timing, frequency)

**Impact**: Retention increased from 12% to 55%, users with streaks 3x more likely to return

---

### From Strava (3.6B Kudos/Year)

✅ **Multiple Leaderboards**: Coverage, Quality, Most Improved, Consistency
✅ **Segment Competition**: Multiple ways to "win"
✅ **Social Validation**: Opt-in kudos system

**Impact**: Social features drive daily engagement without toxicity

---

### From Privacy Research (GDPR 2025)

✅ **Differential Privacy**: Apply noise to all aggregated metrics
✅ **Granular Consent**: Per-feature opt-in, not all-or-nothing
✅ **Explainable AI**: "Why am I seeing this?" for every prompt
✅ **Right to Deletion**: GDPR-compliant data export/deletion

**Impact**: Comply with regulations while maintaining 80% personalization effectiveness

---

## CRITICAL IMPLEMENTATION GAPS

Based on industry research, we identified **15 gaps** between our initial design and best practices.

**Gap Coverage Status**: 13 of 15 gaps (87%) are explicitly addressed in the phased implementation plan below.

| # | Gap | Severity | Status | Phase |
|---|-----|----------|--------|-------|
| 1 | No behavioral signal tracking | 🔴 High | ✅ **COVERED** | Phase 1 |
| 2 | Generic timing (not circadian) | 🔴 High | ✅ **COVERED** | Phase 3 |
| 3 | No weekly frequency cap | 🔴 High | ✅ **COVERED** | Phase 3 |
| 4 | No differential privacy | 🔴 High | ✅ **COVERED** | Phase 2, 7 |
| 5 | No granular consent | 🔴 High | ✅ **COVERED** | Phase 2 |
| 6 | No explainability | 🟡 Medium | ✅ **COVERED** | Phase 2 |
| 7 | Only one leaderboard type | 🟢 Low | ✅ **COVERED** | Phase 6 |
| 8 | Streaks without forgiveness | 🟡 Medium | ✅ **COVERED** | Phase 6 |
| 9 | Basic sentiment analysis | 🟡 Medium | ✅ **COVERED** | Phase 5 |
| 10 | No cold start onboarding | 🟡 Medium | ✅ **COVERED** | Phase 4 |
| 11 | Unified ML model (Netflix) | 🔴 High | ✅ **COVERED** | Phase 4 |
| 12 | No A/B testing framework | 🔴 High | ✅ **COVERED** | Phase 4 |
| 13 | Multi-dimensional attribution | 🟢 Low | ✅ **COVERED** | Phase 5 |
| 14 | No causal inference | 🟢 Low | ⚠️ **DEFERRED** | Phase 8 (Future) |
| 15 | No filter bubble prevention | 🟡 Medium | ✅ **COVERED** | Phase 3 |

**Key Updates** (based on gap coverage analysis):
- **Phase 3** now includes prompt diversity engine to prevent habituation (Gap #15)
- **Phase 4** explicitly includes unified coach embedding model following Netflix Hydra pattern (Gap #11)
- **Phase 6** clarifies multi-tier leaderboard types: Coverage, Quality, Improvement, Consistency (Gap #7)
- **Phase 8** added for future enhancements including causal inference (Gap #14 - low priority, post-launch)

For detailed gap-to-phase mapping, see: `docs/features/bias-detection-gap-coverage-analysis.md`

---

## PHASED IMPLEMENTATION PLAN

### Phase 1: Foundation with Behavioral Tracking (Weeks 1-3)

**Backend**:
- ✅ Schema extensions (completed in PRD)
- ⬜ Basic coverage metrics calculation
- ⬜ Feature flag system for frequency tiers
- ⬜ Admin visibility controls
- ⬜ Behavioral signal tracking (dwell time, completion, navigation)

**Frontend**:
- ⬜ Coverage card (simple version)
- ⬜ Heatmap modal
- ⬜ Behavioral tracking hooks (usePageView, useEventTracking)
- ⬜ Admin settings for frequency tier and tone distribution

**Success Metric**: Track 100% of coach behavioral signals

---

### Phase 2: AI Pattern Detection + Privacy (Weeks 4-6)

**Backend**:
- ⬜ Pattern Detective Agent (Claude Sonnet 4.5)
- ⬜ Differential privacy layer for aggregates
- ⬜ Granular consent management
- ⬜ Explainability metadata generation

**Frontend**:
- ⬜ Granular privacy settings UI
- ⬜ Explainable prompts ("Why am I seeing this?")
- ⬜ Consent flow during onboarding
- ⬜ Data export/deletion tools

**Success Metric**: 85%+ detection accuracy, <5% false positives, 100% GDPR compliance

---

### Phase 3: Intelligent Prompting with Timing (Weeks 7-9)

**Backend**:
- ⬜ Prompt Generator Agent (3 tone variants)
- ⬜ Circadian timing calculator (23.5-hour patterns)
- ⬜ Weekly frequency cap enforcement
- ⬜ Multi-channel delivery strategy
- ⬜ **Prompt diversity engine (vary type/tone to prevent habituation)**

**Frontend**:
- ⬜ Bottom sheet prompts with tone variations
- ⬜ In-app banner prompts
- ⬜ Push notification integration
- ⬜ Prompt dismissal tracking
- ⬜ **Prompt variety tracking (max 2 same-type prompts in a row)**

**Success Metric**: 40%+ prompt response rate, <10% opt-out rate

**Filter Bubble Prevention**: Track recent prompt types per coach and force variety to prevent habituation. Max 2 consecutive prompts of same type/tone.

---

### Phase 4: Learning & A/B Testing (Weeks 10-12)

**Backend**:
- ⬜ Learning Agent with coach clustering
- ⬜ **Unified coach embedding model (shared across all agents)**
- ⬜ A/B testing framework (Statsig integration)
- ⬜ Behavioral archetype detection
- ⬜ Cold start onboarding preference elicitation

**Frontend**:
- ⬜ Onboarding questionnaire (5-7 questions)
- ⬜ Feedback capture ("Was this helpful?")
- ⬜ Preference adjustment UI
- ⬜ A/B test variant assignment

**Success Metric**: Response rate improves 20% over baseline

**Unified Model Approach**: Following Netflix's Hydra pattern, create a single coach understanding model that all agents share. This embedding includes insight history, behavioral signals, response patterns, and quality metrics. Research shows 20-30% better performance vs separate models per agent.

---

### Phase 5: Actionability & Sentiment (Weeks 13-15)

**Backend**:
- ⬜ Two-tier sentiment analysis (lexicon + LLM)
- ⬜ Contextual embeddings (BERT/Hugging Face)
- ⬜ Multi-dimensional sentiment (8 dimensions)
- ⬜ Actionability scorer with real-time feedback

**Frontend**:
- ⬜ Inline actionability feedback
- ⬜ Suggestion application flow
- ⬜ Quality score display
- ⬜ Improvement tips modal

**Success Metric**: Avg actionability increases from 6.2 to 7.5+

---

### Phase 6: Subtle Gamification (Weeks 16-17)

**Backend**:
- ⬜ Streak tracking with freeze mechanism
- ⬜ Achievement system (3-4 achievements only)
- ⬜ **Multi-tier leaderboard calculations (Coverage/Quality/Improvement/Consistency)**
- ⬜ Opt-in benchmarking with DP
- ⬜ Progress tracking

**Frontend**:
- ⬜ Subtle streak counter
- ⬜ Progress toward goals
- ⬜ Achievement unlock modals (minimal)
- ⬜ **Leaderboard tabs with 4 types (opt-in, anonymized)**
- ⬜ Opt-in benchmarking toggle

**Success Metric**: 70%+ coaches still active after 8 weeks

**Multi-Tier Leaderboards**: Following Strava's pattern, implement 4 leaderboard types so every coach can "win" in their category: (1) Coverage Leaders - best player coverage this week, (2) Quality Leaders - highest actionability scores, (3) Most Improved - biggest improvement vs last month, (4) Consistency Leaders - longest streaks. All opt-in and anonymized.

---

### Phase 7: Admin Tools (Weeks 18-19)

**Backend**:
- ⬜ Organization-level aggregation with DP
- ⬜ Bias flag management
- ⬜ Report generation
- ⬜ Platform staff override tools

**Frontend**:
- ⬜ Admin bias dashboard (feature-flagged)
- ⬜ Platform staff settings panel
- ⬜ Org-level reports with privacy
- ⬜ Trend analysis charts

**Success Metric**: Admins can identify org-wide patterns

---

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

**Note**: This phase addresses low-priority Gap #14 (Causal Inference). Deferred to post-launch as it's not blocking for initial rollout. Uses techniques like propensity score matching and difference-in-differences to understand "why" patterns occur, not just correlation.

---

## SUCCESS METRICS

### North Star Metrics

1. **Coverage Rate**: % of players with insight in last 14 days
   - Target: 80%+ (from current ~50%)

2. **Insight Equity (Gini)**: Distribution fairness coefficient
   - Target: < 0.4 (from current ~0.6)

3. **Coach Retention**: % still active after 8 weeks
   - Target: 80%+ (from current ~60%)

### Engagement Metrics

4. **Prompt Response Rate**: % of prompts acted on within 48hrs
   - Target: 40%+ (baseline: 15%)

5. **Weekly Active Coaches**: % logging at least 1 insight/week
   - Target: 70%+ (from current ~45%)

6. **Time to Action**: Avg time from prompt to insight creation
   - Target: < 2 hours (from current ~24 hours)

### Quality Metrics

7. **Actionability Score**: Avg across all insights
   - Target: 7.5+/10 (from current ~6.2)

8. **Sentiment Balance**: Std dev of player confidence scores
   - Target: < 0.3 (balanced feedback)

9. **False Positive Rate**: % of alerts dismissed as "not relevant"
   - Target: < 15%

### Outcome Metrics

10. **Parent Engagement**: % summaries opened
    - Target: 70%+ (from current ~52%)

11. **Player Trust Level**: % reaching Level 2 in 12 weeks
    - Target: 60%+ (from current ~35%)

---

## PRIVACY & ETHICS

### Privacy Safeguards

1. **Never expose raw bias metrics to coaches**
   - Show actionable prompts, not "you're biased" accusations

2. **Fully anonymized benchmarking**
   - "You're at 72% vs org average 75%", not "vs Coach John 89%"

3. **Opt-in for comparisons**
   - Coaches can disable leaderboard/sharing features

4. **GDPR compliance**
   - Right to opt out of pattern analysis
   - Right to data deletion
   - Transparency reports

### Ethical Guidelines

1. **No punitive measures**
   - System is for improvement, not discipline
   - Admins see trends, not "bad coach" lists

2. **Transparent**
   - Coaches understand why they see prompts
   - "Why am I seeing this?" explanations

3. **False positive mitigation**
   - Account for player absences, injuries, transfers
   - AI understands context before flagging

4. **Human oversight**
   - Admins review high-severity bias flags before action
   - Platform staff can audit AI decisions

---

## COST ANALYSIS

### Original Estimate (All Claude Sonnet 4.5)
- $920/month for 1,000 coaches
- $0.92/coach/month

### Optimized Tiered Approach

**Tier 1: Rule-Based (Free)** - 40% of cases
- Coverage calculation, basic frequency detection, simple pattern matching

**Tier 2: Lexicon-Based NLP (Free)** - 30% of cases
- Sentiment scoring using VADER/AFINN, keyword extraction

**Tier 3: Small Fine-Tuned Models (Low Cost)** - 20% of cases
- Hugging Face Transformers (self-hosted), BERT embeddings
- Cost: $0.001 per inference

**Tier 4: Claude Haiku (Medium Cost)** - 9% of cases
- Ambiguous sentiment, standard prompt generation
- Cost: $0.005 per call (3x cheaper than Sonnet)

**Tier 5: Claude Sonnet/Opus (High Cost)** - 1% of cases
- Complex edge cases, nuanced explanations, high-stakes decisions

### Revised Monthly Cost for 1,000 Coaches

- Tier 1-2: $0 (70% of operations)
- Tier 3: $20/month (20% of operations)
- Tier 4: $100/month (9% of operations)
- Tier 5: $50/month (1% of operations)

**Total: ~$170/month** (was $920)
**Savings: 82%**
**Per Coach: $0.17/month**

---

## NEXT STEPS

### Immediate Actions (This Week)

1. **Design Review**: Review planning documents with team
2. **Frontend Mockups**: Create high-fidelity Figma mockups for:
   - Coverage Card
   - Heatmap Modal
   - Bottom Sheet Prompts
   - Achievement Modals
3. **User Interviews**: Talk to 3-5 coaches about:
   - Current pain points
   - Prompt preferences (tone, timing, channel)
   - Privacy concerns

### Short-Term (Next 2 Weeks)

4. **Technical Spike**: Prototype Pattern Detective Agent
   - Test Anthropic API integration
   - Validate structured output format
   - Measure latency and cost
5. **Schema Review**: Finalize database schema extensions
6. **Phase 1 Implementation**: Start with basic coverage tracking

### Medium-Term (Next 4 Weeks)

7. **AI Agent Development**: Build Pattern Detective + Prompt Generator
8. **Frontend Development**: Implement coverage card + heatmap
9. **Alpha Testing**: Deploy to Grange GAA (5 coaches)

---

## RESEARCH SOURCES

Planning based on analysis of **60+ academic papers, industry reports, and case studies** from:

### Companies
- Netflix (Recommendation System & Hydra Model)
- Duolingo (Gamification & 23.5-Hour Rule)
- Strava (Social Features & Leaderboards)
- Meta (User Profiling)
- Spotify (Personalization)
- LinkedIn (Behavioral Analytics)
- TikTok (Engagement Optimization)
- YouTube (Recommendation Algorithms)

### Academic Sources
- User Modeling Survey (arXiv 2024)
- Sentiment Analysis with LLMs (NAACL 2024)
- Differential Privacy with Federated Learning (arXiv 2024)
- XAI Market Analysis (2024-2029)
- GDPR Developments 2024-2025

### Key Papers
- McKinsey: AI-Driven Segmentation (71% enterprise adoption, 20-30% engagement increase)
- Gartner: Over-Personalization (80% consumers nervous, 75% will refuse by 2026)
- Caldwell Law: GDPR 2025 Requirements (granular consent mandatory)

---

## SUMMARY

This comprehensive plan transforms bias detection from a **rule-based alert system** into a **truly AI-driven coaching assistant** that:

✅ **Understands Context** - No rigid rules; AI considers injuries, absences, team events
✅ **Personalizes Engagement** - Learns each coach's patterns and preferences
✅ **Respects Privacy** - GDPR 2025 compliant with differential privacy
✅ **Improves Over Time** - Learning Agent continuously optimizes
✅ **Prevents Alert Fatigue** - Frequency caps, timing optimization, respectful tone
✅ **Drives Outcomes** - Every player gets balanced attention, parents see progress
✅ **Research-Validated** - 87% of critical gaps addressed in launch phases (13/15)

**Ready for implementation with clear phases, success metrics, and industry-validated approach.**

### Implementation Phases

- **Phases 1-7** (19 weeks): Core system with 13 of 15 gaps addressed
- **Phase 8** (Future): Advanced analytics including causal inference (2 deferred low-priority gaps)

See `docs/features/bias-detection-gap-coverage-analysis.md` for detailed gap-to-phase mapping.

---

**Planning Documents Location:**
`/Users/neil/Documents/GitHub/PDP/scripts/ralph/prds/Coaches Unconscious Bias Detection/`
- `BIAS_DETECTION_DESIGN_V2.md` (53KB) - Full design document
- `TECH_INDUSTRY_BEST_PRACTICES_RESEARCH.md` (41KB) - Research synthesis

**Related Issues:**
- [#454](https://github.com/NB-PDP-Testing/PDP/issues/454) - Original feature request
