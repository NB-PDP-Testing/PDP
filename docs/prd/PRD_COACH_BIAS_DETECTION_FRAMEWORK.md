# PRD: Coach Bias Detection & Insight Enrichment Framework

**Issue Reference:** [#454 — Catching Unconscious Bias from Coaches](https://github.com/NB-PDP-Testing/PDP/issues/454)
**Related Issues:** [#250 — Knowledge Graph Data Ecosystem](https://github.com/NB-PDP-Testing/PDP/issues/250), [#444 — WhatsApp Group Monitoring](https://github.com/NB-PDP-Testing/PDP/issues/444)
**Status:** Deep Plan / Fully Ideated
**Date:** February 2026
**Authors:** AI-assisted analysis with stakeholder input

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Current System Analysis](#3-current-system-analysis)
4. [Voice Notes v2 Foundation](#4-voice-notes-v2-foundation)
5. [Proposed Architecture: Agentic Bias Detection Framework](#5-proposed-architecture-agentic-bias-detection-framework)
6. [Coverage Score & Bias Metrics](#6-coverage-score--bias-metrics)
7. [Sentiment Analysis Pipeline](#7-sentiment-analysis-pipeline)
8. [Ad-Tech Inspired Engagement & Nudging System](#8-ad-tech-inspired-engagement--nudging-system)
9. [Conversational AI for Richer Insights](#9-conversational-ai-for-richer-insights)
10. [Knowledge Graph Integration](#10-knowledge-graph-integration)
11. [WhatsApp as a Bias-Aware Channel](#11-whatsapp-as-a-bias-aware-channel)
12. [Ethical Considerations & Compliance](#12-ethical-considerations--compliance)
13. [Implementation Phases](#13-implementation-phases)
14. [Technical Specifications](#14-technical-specifications)
15. [Success Metrics](#15-success-metrics)
16. [Risks & Mitigations](#16-risks--mitigations)
17. [Appendices](#17-appendices)

---

## 1. Executive Summary

Coaches are human. They naturally gravitate toward players who stand out — the star striker, the struggling midfielder, the kid who reminds them of themselves. This is not malice; it's unconscious bias. The result is that 20-30% of a squad receives 70-80% of a coach's documented attention, while the remaining players — often the "steady middle" — become invisible in development records.

This PRD describes a comprehensive **Coach Bias Detection & Insight Enrichment Framework** that:

1. **Detects** coverage imbalances across a coach's squad using a composite Coverage Score
2. **Analyzes** the quality and sentiment of insights to identify emotional favoritism and shallow observations
3. **Nudges** coaches toward under-documented players using ad-tech-inspired engagement techniques
4. **Enriches** insights through conversational AI that draws out richer, more actionable observations
5. **Learns** over time via a knowledge graph that surfaces patterns invisible to individual coaches
6. **Operates ethically** within EU AI Act boundaries, using text-based sentiment analysis (not voice emotion recognition)

The system is designed as an **agentic AI framework** — a supervisor agent coordinating specialized sub-agents that continuously monitor, analyze, and act on coach behavior patterns. It integrates deeply with the existing voice notes pipeline (v1 and v2), the WhatsApp channel (issue #444), and the planned knowledge graph initiative (issue #250).

### Key Outcomes

| Outcome | Metric | Target |
|---------|--------|--------|
| Coverage equity | % of players with ≥1 insight/month | 90% (from ~60%) |
| Insight depth | Avg words per player insight | 2x increase |
| Bias detection | Time to flag coverage gap | <7 days |
| Coach engagement | Weekly insight submissions | 30% increase |
| Insight actionability | % of insights with concrete recommendations | 60% (from ~25%) |

---

## 2. Problem Statement

### 2.1 The Unconscious Bias Challenge

From issue #454:

> *"Coaches naturally focus their insights on a subset of players — typically the standout performers and struggling players. The 'steady middle' of the squad receives minimal documented attention, creating blind spots in player development."*

This manifests in several ways:

- **Mention Frequency Bias**: Some players are mentioned 10x more than others in voice notes
- **Assessment Depth Bias**: Favorite players get detailed, multi-dimensional assessments; others get one-line observations
- **Temporal Bias**: Some players haven't been mentioned in months
- **Sentiment Bias**: Coaches use richer, more emotionally engaged language for certain players
- **Dimension Bias**: Some players are only assessed on physical attributes while others get full tactical/mental analysis

### 2.2 The Insight Quality Challenge

Beyond bias, many coach insights are **shallow and unactionable**:

- "He played well today" — no specifics, no development recommendations
- "She needs to work on her fitness" — vague, no measurable goals
- Repetitive observations that don't build on previous assessments

### 2.3 Why This Matters

- **Player welfare**: Every player deserves documented development attention
- **Parent trust**: Parents paying for a development program expect their child is being observed
- **Legal exposure**: If an injury or safeguarding issue arises with an under-documented player, lack of records is a liability
- **Platform value**: The quality of player development data is PlayerARC's core value proposition

### 2.4 Current Gap

The existing system has **no mechanism** to:
- Track which players are being neglected
- Alert coaches to coverage imbalances
- Detect sentiment differences across players
- Prompt coaches for information about specific under-documented players
- Analyze whether coach insights are actually actionable

---

## 3. Current System Analysis

### 3.1 Voice Notes Pipeline v1 (Production)

**Flow:** Record → Transcribe (Whisper) → Extract Insights (GPT-4o) → Route & Apply

Key files:
- `packages/backend/convex/models/voiceNotes.ts` — Core CRUD, insight routing
- `packages/backend/convex/actions/voiceNotes.ts` — Transcription + extraction
- `packages/backend/convex/models/voiceNoteInsights.ts` — Insight lifecycle

**What v1 captures today:**
- 8 insight categories: skill_rating, development_goal, coach_note, injury_report, attendance, player_comparison, team_tactic, general_observation
- Player name matching (exact → fuzzy → partial)
- Confidence score (0.0–1.0) per insight
- Status tracking: pending → applied/dismissed/auto_applied

**What v1 does NOT capture:**
- No per-player coverage tracking
- No temporal analysis (when was a player last mentioned?)
- No sentiment analysis on insights
- No insight quality/depth scoring
- No bias detection or alerting

### 3.2 Skill Assessments (Production)

- `packages/backend/convex/models/skillAssessments.ts`
- 1–5 rating scale with benchmark comparison
- `previousRating` field provides rudimentary temporal tracking
- Indexed by passportId, skill, assessor
- No aggregate coverage reports per coach

### 3.3 Coach Override Analytics (Production)

- `packages/backend/convex/models/coachOverrideAnalytics.ts`
- Tracks when coaches disagree with AI suggestions (approve low confidence, reject high confidence, edit, revoke)
- Override rates by sensitivity category
- **This is valuable foundation** — it already tracks coach decision patterns that correlate with bias

### 3.4 Trust Level System (Production)

- Levels 0–5 gating auto-apply behavior
- Trust earned through consistent agreement with AI suggestions
- **Relevant to bias framework** — coaches with high trust who suddenly disagree may indicate bias-driven overrides

### 3.5 Coach Assignments (Production)

- `packages/backend/convex/models/coaches.ts`
- Links coaches to teams, age groups, sports, roles
- Provides the roster context needed to calculate coverage

---

## 4. Voice Notes v2 Foundation

The `feat/voice-gateways-v2` branch (217 files, ~50K lines) provides critical infrastructure that the bias detection framework will build upon.

### 4.1 Claims-Based Architecture (Phase 4)

**This is the single most important v2 feature for bias detection.**

Instead of monolithic insights, v2 decomposes voice notes into **atomic claims**:

```
voiceNoteClaims table:
- voiceNoteId, artifactId
- claimText (the atomic observation)
- topicCategory (15 categories: technique, tactical, physical, mental, attitude,
  social, leadership, improvement, concern, injury, attendance, comparison,
  goal_related, match_performance, training_performance)
- entityMentions[] (player names referenced)
- sentiment: positive | neutral | negative | concerned
- severity: low | medium | high | critical
- confidence: number
```

**Why this matters for bias:** Each claim is tagged with sentiment and entity mentions. By aggregating claims per player, we can compute:
- How many claims reference each player (frequency)
- Sentiment distribution per player (emotional bias)
- Topic coverage per player (dimension bias)
- Claim depth/specificity per player (quality bias)

### 4.2 Entity Resolution (Phase 5)

- `packages/backend/convex/actions/entityResolution.ts` — Fuzzy matching with Irish name aliases
- `coachPlayerAliases` table — "resolve once, remember forever"
- Multi-candidate resolution with confidence scores

**Why this matters:** Accurate player identification is prerequisite for coverage tracking. A coach saying "young Seamus" and "Séamus Ó Murchú" must resolve to the same player.

### 4.3 Quality Gates (Phase 1)

- Message validation (empty, minimum length, gibberish, spam detection)
- Duplicate detection (5-min text dedup, 2-min audio dedup)

**Why this matters:** Quality gates ensure we're counting meaningful interactions, not noise.

### 4.4 Feature Flags (Phase 3)

- Cascading evaluation: env → platform → org → user → default
- `shouldUseV2Pipeline`, `shouldUseEntityResolution`

**Why this matters:** Bias detection features can be rolled out incrementally using the same feature flag infrastructure.

### 4.5 Draft Confirmation Flow (Phase 6)

- Auto-confirm gate based on trust level + confidence
- Sensitive categories always require confirmation
- WhatsApp quick-reply for confirmation

**Why this matters:** Bias nudges and prompts can use the same confirmation UX patterns.

---

## 5. Proposed Architecture: Agentic Bias Detection Framework

### 5.1 Architecture Overview

The framework uses a **Supervisor-Agent pattern** inspired by LangGraph, adapted for Convex's serverless architecture.

```
┌─────────────────────────────────────────────────────────────┐
│                    BIAS SUPERVISOR AGENT                     │
│  Orchestrates sub-agents, manages state, triggers actions   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  COVERAGE    │  │  SENTIMENT   │  │  QUALITY     │     │
│  │  MONITOR     │  │  ANALYZER    │  │  ASSESSOR    │     │
│  │  AGENT       │  │  AGENT       │  │  AGENT       │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │               │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐     │
│  │  NUDGE       │  │  KNOWLEDGE   │  │  CONVERSATION│     │
│  │  ENGINE      │  │  GRAPH       │  │  AGENT       │     │
│  │  AGENT       │  │  AGENT       │  │  (WhatsApp)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐  │
│  │Claims   │ │Voice    │ │Skill    │ │Knowledge Graph  │  │
│  │(v2)     │ │Notes    │ │Assess.  │ │(Neo4j/FalkorDB) │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Supervisor Agent

**Runs as:** Convex scheduled function (cron), every 24 hours per organization

**Responsibilities:**
1. Trigger Coverage Monitor to compute current state
2. Trigger Sentiment Analyzer on new claims since last run
3. Trigger Quality Assessor on new insights since last run
4. Collect results and decide which Nudge actions to take
5. Route nudges to appropriate channels (in-app, WhatsApp, email)
6. Log all decisions for auditability

**State Management:**
```typescript
// New table: biasAnalysisRuns
{
  organizationId: Id<"organization">,
  coachUserId: string,
  runTimestamp: number,
  coverageScores: Map<playerId, CoverageScore>,
  sentimentAnalysis: Map<playerId, SentimentProfile>,
  qualityScores: Map<playerId, QualityScore>,
  flaggedPlayers: string[],        // players below threshold
  nudgesGenerated: NudgeAction[],  // what the system decided to do
  nudgesDelivered: NudgeAction[],  // what was actually sent
  status: "running" | "completed" | "failed"
}
```

### 5.3 Sub-Agent Definitions

#### Coverage Monitor Agent

**Purpose:** Compute and track how evenly a coach distributes attention across their roster.

**Inputs:** All claims, voice notes, assessments, and interactions for a coach's assigned players over a rolling window (default: 30 days).

**Outputs:** Per-player Coverage Score (see Section 6).

**Trigger:** Daily cron + on-demand after each voice note processing.

#### Sentiment Analyzer Agent

**Purpose:** Detect emotional bias — does the coach use consistently different tones for different players?

**Inputs:** Claim text, transcript text, topic categories, and sentiment tags from v2 claims pipeline.

**Outputs:** Per-player Sentiment Profile (see Section 7).

**Trigger:** After each batch of claims is extracted.

#### Quality Assessor Agent

**Purpose:** Score the depth and actionability of insights per player.

**Inputs:** Claims, insights, assessment data per player.

**Outputs:** Per-player Quality Score measuring specificity, actionability, dimension coverage.

**Trigger:** After each voice note is processed.

#### Nudge Engine Agent

**Purpose:** Decide what nudges to send, when, and via which channel. Uses ad-tech behavioral science (see Section 8).

**Inputs:** Coverage Scores, Sentiment Profiles, Quality Scores, coach communication preferences, nudge history.

**Outputs:** Nudge actions (in-app prompt, WhatsApp message, dashboard highlight).

**Trigger:** Invoked by Supervisor after analysis is complete.

#### Knowledge Graph Agent

**Purpose:** Maintain and query the knowledge graph for cross-coach, cross-team, and temporal patterns (see Section 10).

**Inputs:** All structured data from other agents.

**Outputs:** Graph queries, pattern alerts, longitudinal trends.

**Trigger:** Batch update after each analysis run; real-time queries for specific patterns.

#### Conversation Agent (WhatsApp)

**Purpose:** Conduct multi-turn conversations with coaches via WhatsApp to draw out richer insights about specific players (see Section 9).

**Inputs:** Under-documented players, conversation history, coach communication profile.

**Outputs:** Structured insights extracted from conversation, fed back into claims pipeline.

**Trigger:** Invoked by Nudge Engine when a WhatsApp-based nudge is selected.

---

## 6. Coverage Score & Bias Metrics

### 6.1 Composite Coverage Score

Each coach-player pair gets a **Coverage Score** (0–100) computed from five weighted dimensions:

```
CoverageScore = (
  w1 × MentionFrequency +    // How often is this player mentioned?
  w2 × AssessmentCount +      // How many formal assessments exist?
  w3 × WordCount +            // How much total text about this player?
  w4 × DimensionCoverage +    // How many skill dimensions are covered?
  w5 × Recency                // How recently was this player mentioned?
)
```

**Default weights:** w1=0.20, w2=0.20, w3=0.15, w4=0.25, w5=0.20

Weights are configurable per organization to reflect different coaching philosophies.

### 6.2 Dimension Definitions

| Dimension | Calculation | Range |
|-----------|-------------|-------|
| **Mention Frequency** | Count of claims mentioning player / max mentions for any player on team | 0–1 |
| **Assessment Count** | Formal assessments for player / max assessments for any player on team | 0–1 |
| **Word Count** | Total words in claims about player / max word count for any player | 0–1 |
| **Dimension Coverage** | Unique topic categories covered / 15 total categories | 0–1 |
| **Recency** | Decay function: 1.0 if mentioned today, decaying by 0.1 per day of silence, floor 0 | 0–1 |

### 6.3 The Four-Fifths Rule (Adapted)

Borrowed from employment discrimination law (EEOC Uniform Guidelines), adapted for coaching:

> **Any player whose Coverage Score falls below 60% of the team average Coverage Score is flagged as "under-documented."**

Example: If team average Coverage Score is 65, any player below 39 is flagged.

**Alert Levels:**

| Level | Threshold | Action |
|-------|-----------|--------|
| **Watch** | Below 80% of team average | Soft dashboard indicator |
| **Alert** | Below 60% of team average | Nudge sent to coach |
| **Critical** | Below 40% of team average OR zero mentions in 21+ days | Escalation to admin + persistent nudge |

### 6.4 Bias Pattern Detection

Beyond individual coverage scores, the system detects **patterns**:

- **Cluster Bias**: Coach consistently documents the same 5-6 players (top cluster) while ignoring others
- **Positional Bias**: Attackers get more coverage than defenders
- **Recency Bias**: Only documenting players from the most recent match, never training-only observations
- **Gender Bias**: In mixed-gender setups, one gender receives more detailed insights (tracked but flagged sensitively)
- **Newcomer Neglect**: New squad members receive less coverage than established players

### 6.5 Database Schema

```typescript
// New table: playerCoverageScores
defineTable({
  organizationId: v.string(),
  coachUserId: v.string(),
  playerId: v.id("orgPlayerEnrollments"),
  teamId: v.optional(v.id("team")),

  // Composite score
  coverageScore: v.number(),          // 0-100

  // Dimension scores
  mentionFrequency: v.number(),       // 0-1
  assessmentCount: v.number(),        // 0-1
  wordCount: v.number(),              // 0-1
  dimensionCoverage: v.number(),      // 0-1
  recency: v.number(),                // 0-1

  // Bias flags
  alertLevel: v.union(
    v.literal("none"),
    v.literal("watch"),
    v.literal("alert"),
    v.literal("critical")
  ),
  daysSinceLastMention: v.number(),
  lastMentionTimestamp: v.optional(v.number()),

  // Rolling window
  windowStartDate: v.number(),
  windowEndDate: v.number(),

  // Metadata
  computedAt: v.number(),
})
.index("by_org_and_coach", ["organizationId", "coachUserId"])
.index("by_org_and_player", ["organizationId", "playerId"])
.index("by_coach_and_alertLevel", ["coachUserId", "alertLevel"])
.index("by_org_and_alertLevel", ["organizationId", "alertLevel"])
```

---

## 7. Sentiment Analysis Pipeline

### 7.1 Approach: Text-Based Only (EU AI Act Compliant)

**Critical regulatory constraint:** The EU AI Act (Article 5(1)(f)) prohibits emotion recognition systems in workplaces and educational institutions. While coaches are not employees of the platform, the precautionary principle applies.

**Our approach:** Analyze sentiment from **transcribed text and claim text only** — never from voice prosody, tone, or acoustic features directly.

This is legally safe because:
- Text sentiment analysis is standard NLP, not "emotion recognition" under the Act
- We analyze what coaches **say**, not how they **sound**
- The v2 claims pipeline already tags sentiment (positive/neutral/negative/concerned)

### 7.2 Sentiment Analysis Dimensions

For each player, we build a **Sentiment Profile**:

```typescript
interface PlayerSentimentProfile {
  playerId: string;
  coachUserId: string;

  // Aggregate sentiment distribution
  sentimentDistribution: {
    positive: number;    // % of claims with positive sentiment
    neutral: number;
    negative: number;
    concerned: number;
  };

  // Comparative metrics
  sentimentScore: number;           // -1.0 to +1.0 weighted average
  sentimentVariance: number;        // How much sentiment varies (low = one-note)
  teamAverageSentiment: number;     // For comparison
  sentimentDifferential: number;    // This player vs team average

  // Linguistic depth indicators
  averageClaimLength: number;       // Words per claim about this player
  specificityScore: number;         // Ratio of specific vs vague language
  actionabilityScore: number;       // % of claims with actionable recommendations

  // Topic sentiment matrix
  topicSentiments: Map<TopicCategory, SentimentDistribution>;

  // Temporal trend
  sentimentTrend: "improving" | "stable" | "declining" | "insufficient_data";
}
```

### 7.3 Bias Detection Through Sentiment Differentials

The key insight: **it's not that a coach is negative about a player that indicates bias — it's when sentiment patterns differ systematically across the squad.**

**Detection rules:**

1. **Favorite Player Signal**: One player consistently receives more positive sentiment AND more detailed claims than the team average → indicates potential favoritism
2. **Neglect Signal**: Player receives only neutral, short, generic claims → indicates disengagement, not hostility
3. **Frustration Signal**: Player receives disproportionately negative sentiment → may indicate personality friction rather than performance assessment
4. **One-Dimensional Signal**: Player's claims cluster in only 1-2 topic categories while others span 5+ → coach has a fixed view of this player

### 7.4 Sentiment Analysis Implementation

The v2 claims pipeline already extracts sentiment per claim. The Sentiment Analyzer Agent adds a **secondary analysis pass**:

```typescript
// Convex action: analyzeSentimentBias
// Runs after claims extraction, uses GPT-4o for deeper analysis

const sentimentAnalysisPrompt = `
You are analyzing coach observations about youth sports players.
For each claim, assess:

1. SPECIFICITY (1-5): How specific is the observation?
   1 = "played well" / 5 = "improved first-touch control under pressure from the left side"

2. ACTIONABILITY (1-5): Does this suggest a concrete development action?
   1 = "needs to improve" / 5 = "should practice 1v1 defending drills focusing on jockeying position"

3. EMOTIONAL_ENGAGEMENT (1-5): How emotionally invested does the coach sound?
   1 = rote/checkbox observation / 5 = deeply engaged, detailed, shows genuine interest

4. COMPARATIVE_LANGUAGE: Does the coach compare this player to others?
   (Often reveals implicit bias — "not as good as X" or "reminds me of Y")

Return structured JSON for each claim.
`;
```

### 7.5 Sentiment Database Schema

```typescript
// New table: playerSentimentProfiles
defineTable({
  organizationId: v.string(),
  coachUserId: v.string(),
  playerId: v.id("orgPlayerEnrollments"),

  sentimentScore: v.number(),             // -1.0 to +1.0
  sentimentVariance: v.number(),
  sentimentDifferential: v.number(),      // vs team average

  positiveRatio: v.number(),
  neutralRatio: v.number(),
  negativeRatio: v.number(),
  concernedRatio: v.number(),

  averageSpecificity: v.number(),         // 1-5
  averageActionability: v.number(),       // 1-5
  averageEmotionalEngagement: v.number(), // 1-5

  claimCount: v.number(),
  sentimentTrend: v.string(),

  computedAt: v.number(),
  windowDays: v.number(),
})
.index("by_org_and_coach", ["organizationId", "coachUserId"])
.index("by_org_and_player", ["organizationId", "playerId"])
```

---

## 8. Ad-Tech Inspired Engagement & Nudging System

### 8.1 Core Philosophy

The advertising industry has spent billions learning how to get people to take small, incremental actions. We apply these techniques ethically to encourage coaches to provide richer, more equitable coverage.

**Key principle: Make the desired behavior (documenting all players) easier and more rewarding than the default behavior (only documenting favorites).**

### 8.2 Technique: RFM Scoring for Coach Engagement

Borrowed from e-commerce customer segmentation (Recency, Frequency, Monetary → Recency, Frequency, Depth):

| Dimension | Coach Equivalent | Scoring |
|-----------|-----------------|---------|
| **Recency** | Days since last voice note | Score 5 (today) to 1 (>14 days) |
| **Frequency** | Voice notes per week | Score 5 (>5/week) to 1 (<1/week) |
| **Depth** | Average words per insight | Score 5 (>100 words) to 1 (<20 words) |

**Coach segments:**

| Segment | RFM Profile | Strategy |
|---------|-------------|----------|
| **Champions** | 5-5-5 | Reward, ask for mentorship content |
| **Loyal** | 4-4-3 | Encourage dimension coverage |
| **At Risk** | 2-3-2 | Re-engagement campaign |
| **Hibernating** | 1-1-1 | Win-back with minimal friction prompts |

### 8.3 Technique: Progressive Profiling

**Never ask for everything at once.** Build player profiles incrementally:

```
Week 1: "How did [Player] perform in Saturday's match?" (single binary prompt)
Week 2: "You mentioned [Player]'s passing — how about their defensive work?"
Week 3: "Any development goals you'd set for [Player] this month?"
Week 4: "How does [Player] compare to where they were 3 months ago?"
```

Each prompt is designed to:
- Reference previous responses (shows the system remembers)
- Ask about ONE thing (reduces cognitive load)
- Be answerable in under 30 seconds
- Build on prior context naturally

### 8.4 Technique: Loss Aversion Framing

People are more motivated by avoiding loss than achieving gain.

**Instead of:** "3 players haven't been assessed this month"
**Use:** "You're about to lose your complete coverage streak — just 3 players need a quick note"

**Instead of:** "Add more detail to your assessments"
**Use:** "[Player]'s development profile is missing tactical insights — parents can see these gaps"

### 8.5 Technique: Variable Ratio Reinforcement

The most addictive reinforcement schedule (slot machines, social media notifications):

- After some voice notes: instant positive feedback ("Great insight! Applied to 3 player profiles")
- After others: delayed milestone ("You've now covered 85% of your squad this month!")
- Occasionally: surprise social proof ("You're in the top 10% of coaches for assessment depth")
- Random: streaks and near-misses ("Just 1 more player for full squad coverage!")

### 8.6 Technique: Mere Exposure Effect

The more a coach sees a player's name in their interface, the more likely they are to think about that player:

- **Dashboard reordering**: Under-documented players appear at the top of coach dashboards
- **Pre-filled prompts**: "Quick note about [under-documented player]?" appears in the voice note recording screen
- **WhatsApp nudges**: Weekly message highlighting players who haven't been mentioned

### 8.7 Technique: Attention Budget Management

Coaches have limited cognitive bandwidth. The system manages a daily "attention budget":

- **Maximum 3 nudges per day** (across all channels)
- **Never interrupt a coach mid-session** (detect when they're actively recording)
- **Respect quiet hours** (no nudges before 8am or after 9pm, configurable)
- **Backoff on dismissal** (if a coach dismisses a nudge, wait 48 hours before similar nudge)
- **Channel preference learning** (if coach responds to WhatsApp but ignores in-app, shift to WhatsApp)

### 8.8 The Five-Level Prompt System

Nudges escalate in intensity based on the severity of the coverage gap:

| Level | Trigger | Format | Example |
|-------|---------|--------|---------|
| **1 — Ambient** | Watch threshold | Dashboard reorder | Under-documented player appears at top of list |
| **2 — Gentle** | Alert threshold, first time | In-app tooltip | "It's been 10 days since you noted anything about Ciarán" |
| **3 — Direct** | Alert threshold, 7+ days | WhatsApp message | "Quick thought on how Ciarán is getting on at training?" |
| **4 — Guided** | Critical threshold | Structured prompt | "Can you rate Ciarán on: Passing / Movement / Attitude?" |
| **5 — Escalation** | Critical, 21+ days | Admin notification | Coach's manager receives a coverage report |

### 8.9 Nudge Database Schema

```typescript
// New table: coachNudges
defineTable({
  organizationId: v.string(),
  coachUserId: v.string(),
  playerId: v.id("orgPlayerEnrollments"),

  nudgeLevel: v.number(),               // 1-5
  nudgeType: v.union(
    v.literal("ambient"),
    v.literal("gentle"),
    v.literal("direct"),
    v.literal("guided"),
    v.literal("escalation")
  ),
  channel: v.union(
    v.literal("in_app"),
    v.literal("whatsapp"),
    v.literal("email"),
    v.literal("admin_report")
  ),

  promptText: v.string(),
  context: v.optional(v.string()),       // Why this nudge was triggered

  status: v.union(
    v.literal("pending"),
    v.literal("delivered"),
    v.literal("seen"),
    v.literal("responded"),
    v.literal("dismissed"),
    v.literal("expired")
  ),

  // Response tracking
  responseTimestamp: v.optional(v.number()),
  responseType: v.optional(v.string()),  // voice_note, text, quick_reply, dismissed
  resultingClaimIds: v.optional(v.array(v.string())), // Claims generated from response

  // Scheduling
  scheduledFor: v.number(),
  deliveredAt: v.optional(v.number()),
  expiresAt: v.number(),

  createdAt: v.number(),
})
.index("by_org_and_coach", ["organizationId", "coachUserId"])
.index("by_coach_and_status", ["coachUserId", "status"])
.index("by_coach_and_player", ["coachUserId", "playerId"])
.index("by_scheduledFor", ["scheduledFor"])
```

---

## 9. Conversational AI for Richer Insights

### 9.1 The Problem with One-Shot Voice Notes

Current voice notes are monologues. The coach talks, the AI transcribes, insights are extracted. There's no back-and-forth. This means:

- Coaches default to surface-level observations
- No follow-up questions to dig deeper
- No prompting for under-covered dimensions
- No connection to previous observations

### 9.2 Multi-Turn Conversation Model

The Conversation Agent conducts structured dialogues with coaches, primarily via WhatsApp (leveraging issue #444's WhatsApp infrastructure).

**Conversation Flow:**

```
SYSTEM: Hi Coach Niall 👋 Quick check-in about Saturday's U14 match.
        How did Seán get on? [Good] [Mixed] [Struggled]

COACH:  [Good]

SYSTEM: Great to hear! You mentioned his passing was improving last week.
        Did you notice that continue? [Yes, much better] [About the same] [Didn't notice]

COACH:  Yes, much better

SYSTEM: Brilliant. Any other area you'd highlight for Seán?
        [Movement off the ball] [Defending] [Attitude/effort] [Something else]

COACH:  Movement off the ball

SYSTEM: How would you rate his movement off the ball? [1⭐] [2⭐] [3⭐] [4⭐] [5⭐]

COACH:  4

SYSTEM: Nice. Seán now has fresh ratings for passing and movement.
        Want to add a quick note about anyone else from Saturday? [Yes] [No, I'm done]
```

### 9.3 Conversation Design Principles

1. **One question at a time** — never compound questions
2. **Binary/multiple choice first** — reduce cognitive load, free-text as option not default
3. **Anchor to previous observations** — "Last time you mentioned X..." builds continuity
4. **Session-based grouping** — conversations are about a match/training session, not abstract
5. **Natural exit points** — always offer "I'm done" without guilt
6. **Time-bounded** — conversations auto-close after 30 minutes of inactivity
7. **Player-rotating** — system ensures each conversation covers different under-documented players

### 9.4 Coach Communication Profiles

The system learns each coach's communication style and adapts:

```typescript
interface CoachCommunicationProfile {
  coachUserId: string;

  // Engagement patterns
  preferredChannel: "whatsapp" | "in_app" | "both";
  averageResponseTime: number;        // seconds
  preferredTimeOfDay: string;         // "morning" | "afternoon" | "evening"
  activeDaysOfWeek: number[];         // [1, 3, 5] = Mon, Wed, Fri

  // Communication style
  averageMessageLength: number;       // words
  prefersQuickReply: boolean;         // uses buttons vs types
  prefersVoice: boolean;              // sends voice notes vs text

  // Engagement metrics
  nudgeResponseRate: number;          // % of nudges that get a response
  conversationCompletionRate: number; // % of conversations completed
  averageTurnsPerConversation: number;

  // Adaptation
  optimalNudgeFrequency: number;      // nudges per week that maximizes response
  burnoutThreshold: number;           // after N ignored nudges, back off
}
```

### 9.5 Slot-Filling Architecture

Each conversation has a goal: fill information slots for a target player.

```typescript
interface ConversationGoal {
  targetPlayerId: string;

  // Slots to fill (prioritized by gap analysis)
  requiredSlots: [
    { dimension: "match_performance", priority: 1, filled: false },
    { dimension: "technique", priority: 2, filled: false },
    { dimension: "attitude", priority: 3, filled: false },
  ];

  // Conversation constraints
  maxTurns: 6;                        // Don't overstay welcome
  maxMinutes: 5;                      // Quick check-ins only

  // Extracted data flows back into claims pipeline
  extractedClaims: VoiceNoteClaim[];
}
```

---

## 10. Knowledge Graph Integration

### 10.1 Relationship to Issue #250

Issue #250 outlines a 3-phase knowledge graph initiative evaluating Neo4j, Amazon Neptune, Dgraph, and TypeDB. The bias detection framework is a **primary consumer** of this knowledge graph.

**Recommendation:** Neo4j (or FalkorDB for cost-sensitive deployments) with the **Graphiti temporal knowledge graph framework**.

### 10.2 Why a Knowledge Graph?

Relational databases (Convex) excel at storing individual records. But bias detection requires understanding **relationships and patterns across time**:

- "Coach A has mentioned Player X 15 times but Player Y only twice" → relationship query
- "Players on Team B who play the same position as the coach played" → multi-hop relationship
- "How has coverage for this player changed after they moved from U12 to U14?" → temporal query
- "Which coaches across the organization show similar coverage patterns?" → cross-entity pattern

### 10.3 Graph Schema

```
NODES:
  (:Coach {userId, name, sport, activeSince})
  (:Player {enrollmentId, name, ageGroup, position, sport})
  (:Team {teamId, name, ageGroup, sport, season})
  (:Claim {claimId, text, sentiment, topic, timestamp})
  (:Assessment {assessmentId, skill, rating, timestamp})
  (:Session {date, type: match|training, teamId})
  (:Insight {insightId, category, confidence})
  (:NudgeEvent {nudgeId, level, channel, response})

RELATIONSHIPS:
  (:Coach)-[:COACHES]->(:Team)
  (:Player)-[:PLAYS_FOR]->(:Team)
  (:Coach)-[:MENTIONED {timestamp, sentiment}]->(:Player)
  (:Coach)-[:ASSESSED {timestamp, rating}]->(:Player)
  (:Coach)-[:OBSERVED_IN]->(:Session)
  (:Claim)-[:ABOUT]->(:Player)
  (:Claim)-[:EXTRACTED_FROM]->(:VoiceNote)
  (:Coach)-[:NUDGED_ABOUT {level, response}]->(:Player)
  (:Player)-[:PLAYS_POSITION]->(:Position)
  (:Player)-[:IN_AGE_GROUP]->(:AgeGroup)
```

### 10.4 Key Graph Queries for Bias Detection

**Query 1: Coverage Heatmap**
```cypher
MATCH (c:Coach {userId: $coachId})-[:COACHES]->(t:Team)-[:HAS_PLAYER]->(p:Player)
OPTIONAL MATCH (c)-[m:MENTIONED]->(p)
WHERE m.timestamp > $windowStart
RETURN p.name, COUNT(m) AS mentions,
       COLLECT(DISTINCT m.sentiment) AS sentiments
ORDER BY mentions ASC
```

**Query 2: Cross-Coach Bias Pattern**
```cypher
MATCH (c:Coach)-[:COACHES]->(t:Team)-[:HAS_PLAYER]->(p:Player)
WITH p, COLLECT(c) AS coaches,
     [c IN COLLECT(c) | SIZE((c)-[:MENTIONED]->(p))] AS mentionCounts
WHERE SIZE(coaches) > 1
RETURN p.name, coaches, mentionCounts
// Reveals: if multiple coaches all under-document the same player,
// it's probably not bias — the player may genuinely be less visible.
// If only ONE coach under-documents them, it's likely bias.
```

**Query 3: Temporal Coverage Drift**
```cypher
MATCH (c:Coach {userId: $coachId})-[m:MENTIONED]->(p:Player)
WITH p,
     [m IN COLLECT(m) WHERE m.timestamp > $recent | m] AS recentMentions,
     [m IN COLLECT(m) WHERE m.timestamp < $recent | m] AS olderMentions
RETURN p.name,
       SIZE(recentMentions) AS recent,
       SIZE(olderMentions) AS older,
       SIZE(recentMentions) - SIZE(olderMentions) AS drift
ORDER BY drift ASC
// Negative drift = declining attention
```

**Query 4: Position-Based Bias**
```cypher
MATCH (c:Coach {userId: $coachId})-[m:MENTIONED]->(p:Player)-[:PLAYS_POSITION]->(pos:Position)
WITH pos.name AS position, AVG(SIZE(COLLECT(m))) AS avgMentions
RETURN position, avgMentions
ORDER BY avgMentions DESC
// Reveals: Does this coach over-index on forwards and ignore defenders?
```

### 10.5 Graphiti Temporal Framework

Graphiti (by Zep) provides temporal knowledge graph capabilities built on Neo4j:

- **Episodic memory**: Each coach interaction becomes a timestamped episode
- **Entity extraction**: Automatic extraction of entities and relationships from unstructured text
- **Temporal queries**: "How has this relationship changed over time?"
- **Contradiction detection**: If a coach says "Seán is improving" this week and "Seán hasn't improved" next week, Graphiti flags the contradiction

**Integration point:** Graphiti processes the same claims that the v2 pipeline extracts, building a parallel knowledge representation that enables queries impossible in Convex alone.

### 10.6 GraphRAG for Enhanced Extraction

Microsoft's GraphRAG approach can enhance insight extraction:

1. Claims are extracted from voice notes (existing v2 pipeline)
2. GraphRAG builds a community-aware graph from these claims
3. When a coach records a new voice note, GraphRAG provides context from the graph
4. This context enriches the GPT-4o extraction prompt, producing deeper insights

**Example:** Coach says "Seán played well." Without context, this produces a shallow claim. With GraphRAG context ("Seán has been working on his left foot, scored 2/5 on last assessment, coach previously noted improvement"), the extraction prompt can ask GPT-4o to specifically check: "Did the coach mention left foot progress? Rating change? Comparison to previous assessment?"

---

## 11. WhatsApp as a Bias-Aware Channel

### 11.1 Relationship to Issue #444

Issue #444 extends WhatsApp support to coach group monitoring and parent communication. The bias detection framework adds a **third WhatsApp use case**: proactive bias-aware outreach.

### 11.2 WhatsApp Nudge Types

| Nudge Type | WhatsApp Format | Example |
|------------|----------------|---------|
| **Quick Check-In** | Quick Reply buttons | "How did Ciarán get on Saturday?" [Good] [Mixed] [Struggled] |
| **Rating Request** | List message | "Rate Ciarán's passing this week:" [1-5 scale] |
| **Open Prompt** | Text message with context | "You haven't mentioned Aoife since Jan 15th. Any update on her progress?" |
| **Session Debrief** | Interactive template | "Saturday's U14 match: Tell me about 1 player who stood out and 1 who needs attention" |
| **Weekly Digest** | Rich media message | Coverage summary card showing squad heatmap |

### 11.3 WhatsApp Conversation State Machine

```
                    ┌─────────────┐
                    │   IDLE      │
                    └──────┬──────┘
                           │ Nudge triggered
                    ┌──────▼──────┐
                    │  GREETING   │──── No response (24h) ──→ IDLE (backoff)
                    └──────┬──────┘
                           │ Coach responds
                    ┌──────▼──────┐
                    │  SLOT_FILL  │──── "I'm done" ──→ WRAP_UP
                    └──────┬──────┘
                           │ Slot filled / max turns
                    ┌──────▼──────┐
                    │  PIVOT      │──── Offer next player or exit
                    └──────┬──────┘
                           │ "Yes, more" / "No, done"
                    ┌──────▼──────┐
                    │  WRAP_UP    │──── Summary + thank you
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  COMPLETE   │──── Claims extracted, stored
                    └─────────────┘
```

### 11.4 WhatsApp Group Monitoring for Bias Data

From issue #444: WhatsApp coach group chats contain organic, unstructured observations. The bias framework monitors these for:

- Which players are mentioned in group discussions
- Sentiment patterns in group context (more casual, potentially more revealing)
- Cross-coach agreement/disagreement on players
- Spontaneous vs prompted observations (spontaneous mentions may indicate stronger opinions)

---

## 12. Ethical Considerations & Compliance

### 12.1 EU AI Act Compliance

| Requirement | Our Approach | Status |
|-------------|-------------|--------|
| No workplace emotion recognition from biometrics | Text-only sentiment analysis, never voice prosody | Compliant |
| Transparency about AI involvement | Coaches informed their insights are analyzed for coverage | Required |
| Right to explanation | Coverage scores are decomposable into 5 clear dimensions | Built-in |
| Human oversight | Admin reviews flagged patterns before action | Built-in |
| Data minimization | Rolling 90-day window, older data aggregated not stored raw | Planned |

### 12.2 Coach Experience Principles

1. **Never accusatory**: The system says "Ciarán hasn't been documented recently" not "You're ignoring Ciarán"
2. **Supportive framing**: "Here's how to improve your coverage" not "Your coverage is bad"
3. **Coach autonomy**: Nudges can always be dismissed; the system adapts, doesn't punish
4. **Transparency**: Coaches can see their own coverage dashboard (opt-in)
5. **Privacy**: Individual coverage data is visible only to the coach and their admin, not to parents or other coaches

### 12.3 Bias in Bias Detection

The system itself can introduce biases:

- **Name bias**: Entity resolution may fail more often for non-English names → undercounting mentions
- **Cultural bias**: NLP sentiment analysis performs worse on dialectal English and code-switching
- **Position bias**: Some positions genuinely require less documentation (substitute goalkeeper vs starting striker)

**Mitigations:**
- Entity resolution confidence thresholds tuned per language profile
- Sentiment analysis calibrated against ground truth per organization
- Position-aware coverage expectations (configurable weights per position)
- Regular bias audits of the bias detection system itself

### 12.4 Data Governance

- Coverage scores are **derived analytics**, not personal data
- Sentiment analysis results are stored as aggregates, not raw judgments
- All bias alerts include an explanation chain (why was this flagged?)
- 90-day rolling window — no permanent "coach bias record"
- Right to contest: coaches can flag false positives, which trains the system

---

## 13. Implementation Phases

### Phase 1: Coverage Monitoring Foundation (4-6 weeks)

**Prerequisites:** Voice Notes v2 claims pipeline (Phase 4) deployed to production.

**Deliverables:**
1. `playerCoverageScores` table and scheduled computation function
2. Coverage Score calculation from existing v1 data (voice notes, assessments)
3. Coach dashboard: coverage heatmap showing all assigned players
4. Alert level computation (Watch / Alert / Critical thresholds)
5. Admin dashboard: organization-wide coverage report
6. Basic nudge: "Players you haven't mentioned recently" list on dashboard

**Backend files:**
- `packages/backend/convex/models/coverageScores.ts`
- `packages/backend/convex/lib/coverageCalculation.ts`
- Scheduled function in `packages/backend/convex/crons.ts`

**Frontend files:**
- `apps/web/src/app/orgs/[orgId]/coach/coverage/` — new coverage dashboard
- Updates to `apps/web/src/app/orgs/[orgId]/coach/coach-dashboard.tsx`

### Phase 2: Sentiment Analysis Layer (3-4 weeks)

**Prerequisites:** Phase 1 complete, v2 claims pipeline with sentiment tags.

**Deliverables:**
1. `playerSentimentProfiles` table
2. Secondary sentiment analysis pass (specificity, actionability, emotional engagement scoring)
3. Sentiment differential computation (per player vs team average)
4. Bias pattern detection rules (cluster bias, positional bias, newcomer neglect)
5. Integration with Coverage Score dashboard (sentiment overlay)
6. Alert rules for sentiment-based bias flags

**Backend files:**
- `packages/backend/convex/models/sentimentProfiles.ts`
- `packages/backend/convex/actions/sentimentAnalysis.ts`
- `packages/backend/convex/lib/biasPatterns.ts`

### Phase 3: Nudge Engine (4-5 weeks)

**Prerequisites:** Phase 2 complete, WhatsApp integration (issue #444) in progress.

**Deliverables:**
1. `coachNudges` table and nudge scheduling system
2. Five-level nudge escalation system
3. Coach communication profile learning
4. Attention budget management (3 nudges/day max, quiet hours, backoff)
5. In-app nudge UI (tooltips, dashboard highlights, recording screen prompts)
6. WhatsApp nudge delivery (quick replies, list messages)
7. Progressive profiling prompt generation
8. Nudge effectiveness tracking and optimization

**Backend files:**
- `packages/backend/convex/models/coachNudges.ts`
- `packages/backend/convex/lib/nudgeEngine.ts`
- `packages/backend/convex/lib/promptGeneration.ts`
- `packages/backend/convex/actions/nudgeDelivery.ts`

**Frontend files:**
- `apps/web/src/components/nudge-tooltip.tsx`
- Updates to coach dashboard and voice note recording screens

### Phase 4: Conversational AI (5-6 weeks)

**Prerequisites:** Phase 3 complete, WhatsApp Business API integration stable.

**Deliverables:**
1. Conversation state machine (WhatsApp multi-turn dialogue)
2. Slot-filling architecture for structured data collection
3. Coach communication profile adaptation
4. Conversation-to-claims pipeline (extracted insights flow into v2 pipeline)
5. Session debrief flows (post-match, post-training templates)
6. Conversation analytics (completion rates, insight quality from conversations)

**Backend files:**
- `packages/backend/convex/models/coachConversations.ts`
- `packages/backend/convex/actions/conversationEngine.ts`
- `packages/backend/convex/lib/slotFilling.ts`
- `packages/backend/convex/lib/conversationStateMachine.ts`

### Phase 5: Knowledge Graph Integration (6-8 weeks)

**Prerequisites:** Phase 2+ complete, issue #250 knowledge graph POC complete.

**Deliverables:**
1. Neo4j/FalkorDB instance provisioned and connected
2. Data sync pipeline: Convex → Knowledge Graph (claims, assessments, coverage scores)
3. Graphiti temporal framework integration
4. Cross-coach bias pattern queries
5. Temporal drift detection
6. Position-aware coverage normalization
7. GraphRAG-enhanced insight extraction (enriched context for GPT-4o prompts)
8. Knowledge graph-powered weekly digest for coaches

**Infrastructure:**
- Neo4j Aura or FalkorDB Cloud instance
- Sync service (Convex action → Neo4j writes)
- Query service (Neo4j reads → Convex consumption)

### Phase 6: Supervisor Agent & Orchestration (3-4 weeks)

**Prerequisites:** Phases 1-4 complete, Phase 5 in progress.

**Deliverables:**
1. `biasAnalysisRuns` table for audit trail
2. Supervisor agent orchestration (daily cron per org)
3. Dynamic weight adjustment based on nudge effectiveness
4. Cross-agent coordination (coverage + sentiment + quality → nudge decision)
5. Admin reporting: bias trends over time, nudge effectiveness
6. Coach self-service: opt-in coverage dashboard, personal bias report

**Backend files:**
- `packages/backend/convex/models/biasAnalysis.ts`
- `packages/backend/convex/actions/biasSupervisor.ts`
- `packages/backend/convex/lib/agentOrchestration.ts`

### Total Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|-------------|
| Phase 1: Coverage Monitoring | 4-6 weeks | v2 claims pipeline |
| Phase 2: Sentiment Analysis | 3-4 weeks | Phase 1 |
| Phase 3: Nudge Engine | 4-5 weeks | Phase 2 + WhatsApp (#444) |
| Phase 4: Conversational AI | 5-6 weeks | Phase 3 |
| Phase 5: Knowledge Graph | 6-8 weeks | Phase 2 + KG POC (#250) |
| Phase 6: Supervisor Agent | 3-4 weeks | Phases 1-4 |

Phases 1-2 can begin immediately after v2 deployment.
Phases 3-4 depend on WhatsApp infrastructure.
Phase 5 runs in parallel with Phases 3-4, depending on issue #250 progress.
Phase 6 ties everything together.

**Estimated total: 6-9 months** (with parallelization of Phases 3-5).

---

## 14. Technical Specifications

### 14.1 New Convex Tables Summary

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `playerCoverageScores` | Per coach-player coverage metrics | by_org_and_coach, by_org_and_player, by_coach_and_alertLevel |
| `playerSentimentProfiles` | Per coach-player sentiment analysis | by_org_and_coach, by_org_and_player |
| `coachNudges` | Nudge scheduling and tracking | by_org_and_coach, by_coach_and_status, by_scheduledFor |
| `coachCommunicationProfiles` | Coach engagement preferences | by_coachUserId |
| `coachConversations` | Multi-turn conversation state | by_coachUserId_and_status, by_org_and_status |
| `biasAnalysisRuns` | Supervisor agent audit trail | by_org_and_timestamp, by_coachUserId |
| `biasAlerts` | Flagged bias patterns for admin review | by_org_and_status, by_coachUserId |

### 14.2 New Convex Scheduled Functions

| Function | Schedule | Purpose |
|----------|----------|---------|
| `computeCoverageScores` | Daily 2am UTC per org | Recalculate all coverage scores |
| `runBiasAnalysis` | Daily 3am UTC per org | Supervisor agent orchestration |
| `processNudgeQueue` | Every 15 minutes | Deliver scheduled nudges |
| `syncKnowledgeGraph` | Hourly | Sync new data to Neo4j |
| `expireConversations` | Every 30 minutes | Close inactive conversations |

### 14.3 External Service Dependencies

| Service | Purpose | Phase | Cost Estimate |
|---------|---------|-------|---------------|
| **GPT-4o** (existing) | Sentiment analysis secondary pass, conversation generation | 2+ | ~$50-100/mo additional |
| **Neo4j Aura** or **FalkorDB Cloud** | Knowledge graph | 5 | $50-200/mo depending on tier |
| **WhatsApp Business API** (existing via #444) | Nudge delivery, conversations | 3+ | Per-message costs (existing) |
| **Graphiti** (open source) | Temporal KG framework | 5 | Self-hosted, no license cost |

### 14.4 Feature Flag Rollout

Using the v2 feature flag infrastructure:

| Flag | Default | Controls |
|------|---------|----------|
| `bias.coverageMonitoring` | false | Enable coverage score computation |
| `bias.sentimentAnalysis` | false | Enable sentiment secondary pass |
| `bias.nudgeEngine` | false | Enable nudge delivery |
| `bias.nudgeWhatsapp` | false | Enable WhatsApp nudge channel |
| `bias.conversationalAI` | false | Enable multi-turn conversations |
| `bias.knowledgeGraph` | false | Enable KG sync and queries |
| `bias.coachDashboard` | false | Show coverage dashboard to coaches |
| `bias.adminReports` | false | Show bias reports to admins |

---

## 15. Success Metrics

### 15.1 Primary Metrics

| Metric | Baseline (estimated) | Phase 1 Target | Phase 6 Target |
|--------|---------------------|----------------|----------------|
| **Squad coverage rate** (% players with ≥1 insight/month) | ~60% | 80% | 95% |
| **Coverage Gini coefficient** (0=equal, 1=all attention on one player) | ~0.55 | 0.40 | 0.25 |
| **Days-to-detect** coverage gap | Never detected | 7 days | 3 days |
| **Insight depth** (avg words per player per month) | ~45 words | 70 words | 120 words |
| **Dimension coverage** (avg topic categories per player) | ~2.1 | 3.5 | 5.0 |

### 15.2 Engagement Metrics

| Metric | Target |
|--------|--------|
| Nudge response rate | >40% |
| Conversation completion rate | >60% |
| Coach-initiated coverage checks | >25% of coaches weekly |
| Nudge-to-insight conversion | >30% of nudges result in new insight within 48h |

### 15.3 Quality Metrics

| Metric | Target |
|--------|--------|
| Avg specificity score (1-5) | >3.0 (from ~2.2) |
| Avg actionability score (1-5) | >2.8 (from ~1.8) |
| False positive bias alert rate | <15% |
| Coach satisfaction (survey) | No decrease from baseline |

---

## 16. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Coach backlash** — feeling surveilled or judged | High | Medium | Supportive framing; coach-controlled dashboard; no punitive actions; thorough UX research before launch |
| **Alert fatigue** — too many nudges cause coaches to disengage | High | Medium | Attention budget management; adaptive frequency; backoff on dismissal |
| **False positives** — system flags bias where none exists | Medium | High | Conservative thresholds; human review for escalation; position-aware normalization; contest mechanism |
| **Entity resolution failures** — player not matched correctly | Medium | Medium | v2 entity resolution with alias learning; manual correction feeds back; confidence thresholds |
| **Cost overrun** — GPT-4o calls for sentiment analysis add up | Medium | Low | Batch processing; cache results; only re-analyze on new data; use cheaper models for simple classification |
| **Knowledge graph complexity** — Neo4j adds operational burden | Medium | Medium | Start with FalkorDB (simpler); evaluate after POC; graph queries are read-heavy, can be eventually consistent |
| **EU AI Act changes** — regulation tightens | Low | Low | Text-only approach is conservative; no voice emotion analysis; regular legal review |
| **Coach gaming** — coaches submit superficial notes to clear nudges | Medium | Medium | Quality Assessor scores depth; shallow responses don't improve Coverage Score significantly |

---

## 17. Appendices

### Appendix A: Existing System Files Reference

| File | Path | Relevance |
|------|------|-----------|
| Voice Notes (models) | `packages/backend/convex/models/voiceNotes.ts` | Core voice note CRUD and insight routing |
| Voice Notes (actions) | `packages/backend/convex/actions/voiceNotes.ts` | Transcription and extraction pipeline |
| Voice Note Insights | `packages/backend/convex/models/voiceNoteInsights.ts` | Insight lifecycle management |
| Skill Assessments | `packages/backend/convex/models/skillAssessments.ts` | Assessment data for coverage calculation |
| Sport Passports | `packages/backend/convex/models/sportPassports.ts` | Player development profiles |
| Coach Assignments | `packages/backend/convex/models/coaches.ts` | Coach-team mapping |
| Override Analytics | `packages/backend/convex/models/coachOverrideAnalytics.ts` | Coach decision patterns |
| Schema | `packages/backend/convex/schema.ts` | Table definitions |
| Coach Dashboard | `apps/web/src/app/orgs/[orgId]/coach/coach-dashboard.tsx` | Frontend entry point |
| Voice Notes Dashboard | `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx` | Voice notes UI |

### Appendix B: Voice Notes v2 Branch Files Reference

| Component | Path (on feat/voice-gateways-v2) | Relevance |
|-----------|------|-----------|
| Claims Extraction | `packages/backend/convex/actions/claimsExtraction.ts` | Atomic claims with sentiment — foundation for bias analysis |
| Entity Resolution | `packages/backend/convex/actions/entityResolution.ts` | Player identification — prerequisite for coverage tracking |
| Coach Context | `packages/backend/convex/lib/coachContext.ts` | Shared context gathering — reusable for bias agents |
| String Matching | `packages/backend/convex/lib/stringMatching.ts` | Fuzzy matching — used in entity resolution |
| Player Matching | `packages/backend/convex/lib/playerMatching.ts` | Player lookup — used in coverage calculation |
| Feature Flags | `packages/backend/convex/lib/featureFlags.ts` | Flag infrastructure — used for bias feature rollout |
| Draft Generation | `packages/backend/convex/actions/draftGeneration.ts` | Auto-confirm gates — pattern for nudge confirmation |
| Quality Gates | `packages/backend/convex/lib/messageValidation.ts` | Input validation — ensures quality data for bias analysis |
| Review Links | `packages/backend/convex/models/whatsappReviewLinks.ts` | Quick review UX — pattern for nudge response UI |

### Appendix C: Research Sources

1. **Ad-Tech Profiling**: RFM analysis (e-commerce), TikTok interest graph, Google/Meta engagement optimization, variable ratio reinforcement schedules, loss aversion (Kahneman & Tversky)
2. **Agentic AI**: LangGraph Supervisor pattern, ReAct agents, multi-agent orchestration frameworks
3. **Knowledge Graphs**: Neo4j, FalkorDB, Graphiti temporal KG (Zep), Microsoft GraphRAG, property graph vs RDF analysis
4. **Conversational AI**: Task-oriented dialogue systems, slot-filling architectures, mixed-initiative dialogue, WhatsApp Business API interactive messages
5. **Sentiment Analysis**: Aspect-based sentiment analysis, sentiment differential detection, EU AI Act Articles 5(1)(f) and 52, text-based vs biometric emotion recognition legal distinction
6. **Employment Bias Detection**: EEOC Four-Fifths Rule (Uniform Guidelines on Employee Selection Procedures), adverse impact analysis methodology

### Appendix D: Glossary

| Term | Definition |
|------|------------|
| **Coverage Score** | Composite 0-100 metric measuring how well a coach documents a specific player |
| **Four-Fifths Rule** | Alert threshold: flag any player below 60% of team average coverage |
| **Claim** | Atomic observation extracted from a voice note (v2 pipeline) |
| **Sentiment Differential** | Difference between a player's sentiment score and the team average |
| **Nudge** | A system-initiated prompt encouraging a coach to document an under-covered player |
| **Attention Budget** | Maximum number of nudges a coach receives per day (default: 3) |
| **Slot Filling** | Conversational technique to collect specific missing information about a player |
| **Coverage Gini** | Statistical measure of coverage inequality across a squad (0=perfect equality, 1=all attention on one player) |
| **Graphiti** | Open-source temporal knowledge graph framework built on Neo4j |
| **GraphRAG** | Technique using knowledge graphs to enhance LLM retrieval and generation |

---

*This PRD represents a fully ideated deep plan. Implementation should begin with Phase 1 (Coverage Monitoring) once the Voice Notes v2 claims pipeline is deployed to production. Each subsequent phase builds on the previous, with Phases 3-5 offering parallelization opportunities.*
