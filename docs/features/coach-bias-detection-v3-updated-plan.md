# Coach Development Calibration System - Comprehensive Plan (V3.5)

> **GitHub Issue:** [#454](https://github.com/NB-PDP-Testing/PDP/issues/454)
> **Previous Planning:** `scripts/ralph/prds/Coaches Unconscious Bias Detection/`
> **Status:** Research Complete, V3.5 Integrates Best of V2 + V3
> **Last Updated:** 2026-02-25
> **Research Sources:** 80+ academic papers, 15+ product deep dives, 5 parallel research streams
> **Version History:** V1 (PRD) → V2 (AI Agent Design) → V3 (Research Rewrite) → V3.5 (V2 Reintegration)

---

## WHAT CHANGED IN V3.5 (V2 REINTEGRATION)

After reviewing V2 and V3 side-by-side, we identified 5 high-value V2 features that were lost during the V3 rewrite. V3.5 brings them back, adapted to V3's research-backed framework:

| # | Reintegrated Feature | From V2 | V3.5 Adaptation |
|---|---------------------|---------|-----------------|
| 1 | **Inline Quality Feedback** | Section 2.4 (real-time coaching while writing) | Integrated with V3's 6-dimension QWAS scoring instead of V2's 5-dimension actionability |
| 2 | **Nudge Personalization (Prompt Generator Agent)** | Agent 2 (LLM-generated prompt variants) | Scoped to weekly digest only (not per-nudge), respects V3's 1/week max |
| 3 | **Context Awareness** | Pattern Detective context injection | Cross-reference coverage gaps with injury/attendance data to eliminate false positives |
| 4 | **Hybrid Orchestrator** | Agent 4 (LLM decision-making) | Rules engine for 90% of decisions + LLM escalation for edge cases only |
| 5 | **WhatsApp Delivery Channel** | Section 2.3 delivery channels | Leverages existing Twilio infrastructure for weekly digest delivery |

**What stays removed from V2:**

| Feature | Still Removed | Why |
|---------|--------------|-----|
| Gamification (badges, streaks, leaderboards, points) | Yes | SDT research: 128 studies confirm extrinsic rewards crowd out intrinsic coaching motivation |
| Daily push notifications | Yes | 40% opt-out at 3-6/week (MobileLoud 2025) |
| Per-coach bias flags for admins | Yes | "Surveillance test" failure — coaches are primary beneficiaries, not admin oversight targets |
| Competitive leaderboards | Yes | Demotivates bottom 50%; competitive framing damages coaching quality (Hamari 2014) |
| Rich personality profiling | Yes | Privacy concern; simple behavioral archetype clustering achieves 80% of the value |
| Estimated response rates on prompts | Yes | Over-engineering; A/B testing reveals actual rates better than LLM predictions |

---

## WHAT CHANGED IN V3 (FROM V2)

This V3 update incorporates deep-dive research across 5 domains that produced **10 significant revisions** to the original plan:

| # | Change | Impact | Evidence Base |
|---|--------|--------|---------------|
| 1 | **Renamed feature** from "Bias Detection" to "Coaching Coverage & Calibration" | High | Every HR platform (Textio, Culture Amp, Workday) avoids "bias" in UI |
| 2 | **Added quality-weighted attention scoring** | Very High | Textio 2024: quality disparity > frequency disparity |
| 3 | **Removed gamification** (badges, streaks, leaderboards) | High | SDT research: extrinsic rewards crowd out intrinsic coaching motivation |
| 4 | **Added "Professional Growth Stack"** replacement | High | Goal-setting theory, habit formation science, ambient feedback |
| 5 | **Reduced notification frequency** from 1/day to 1/week max | High | 40% opt-out at 3-6 push/week; Apple HIG passive tier |
| 6 | **Added birth quarter (RAE) overlay** | Medium | 38-bias framework; Q1 players 5x more likely selected than Q4 |
| 7 | **Added bidirectional measurement** (parent surveys) | High | Panorama Education model; 1.5B responses dataset |
| 8 | **Added "Suggested Player" prompt** | Medium | ClassDojo random picker; KNVB cueing intervention (5.8/9 viability) |
| 9 | **Added task-boundary timing** | High | CHI 2025: 53-73% engagement at task boundaries |
| 10 | **Added "Calibration" framing** (vs org norms) | High | Culture Amp: 1.5B data points; calibration not accusation |

---

## TABLE OF CONTENTS

1. [Reframing: Why "Coaching Coverage" Not "Bias Detection"](#1-reframing)
2. [The Science: What We Know About Coaching Bias](#2-the-science)
3. [Quality-Weighted Attention Scoring](#3-quality-weighted-attention-scoring)
4. [Inline Quality Feedback (V3.5 — Reintegrated from V2)](#4-inline-quality-feedback)
5. [The Professional Growth Stack (Replaces Gamification)](#5-professional-growth-stack)
6. [Proactive AI Design: Nudging Without Annoying](#6-proactive-ai-design)
7. [Birth Quarter (RAE) Overlay](#7-birth-quarter-overlay)
8. [Bidirectional Measurement](#8-bidirectional-measurement)
9. [Quantitative Bias Metrics](#9-quantitative-bias-metrics)
10. [Updated Agent Architecture (V3.5 — 4 Agents + Hybrid Orchestrator)](#10-updated-agent-architecture)
11. [Context Awareness (V3.5 — Reintegrated from V2)](#11-context-awareness)
12. [WhatsApp Delivery Channel (V3.5 — Reintegrated from V2)](#12-whatsapp-delivery)
13. [Updated Frontend UX](#13-updated-frontend-ux)
14. [Revised Phased Implementation Plan](#14-revised-implementation-plan)
15. [Updated Cost Analysis](#15-cost-analysis)
16. [Privacy & Ethics (Enhanced)](#16-privacy-and-ethics)
17. [Success Metrics (Revised)](#17-success-metrics)
18. [Research Sources](#18-sources)

---

## 1. REFRAMING: WHY "COACHING COVERAGE" NOT "BIAS DETECTION" {#1-reframing}

### The Evidence

Every successful HR platform that deals with feedback equity has converged on the same lesson: **never use the word "bias" in the user-facing interface**.

| Platform | Internal Name | User-Facing Name | Reason |
|----------|--------------|------------------|--------|
| Textio | Bias Detection | "Feedback Quality" | Constructive framing drives adoption |
| Culture Amp | Bias Calibration | "Performance Calibration" | Technical, non-threatening |
| Workday | Bias Mitigation | "Manager Coaching" | Supportive, not accusatory |
| Deloitte | Bias Analytics | "Self-improvement Analytics" | Explicitly avoids punishment framing |

**The word "bias" triggers defensiveness.** Ramanayaka et al. (2025) found coaches showed a "lack of awareness" about cognitive biases, often interpreting them narrowly as only racial or gender biases. The "bias blind spot" -- believing others are biased but not oneself -- is one of the 38 documented coaching biases.

### Our Reframing

| Old Term | New Term |
|----------|----------|
| Bias Detection System | **Coaching Coverage & Calibration** |
| Bias Detection Dashboard | **Coaching Coverage Dashboard** |
| Bias Alert | **Coverage Check-In** |
| Bias Score | **Attention Balance** |
| Bias Pattern | **Coverage Pattern** |
| Admin Bias Dashboard | **Team Development Calibration** |

### The Creepiness Line (from GDPR 2025 Research)

- **Acceptable:** "You haven't documented Emma lately" (obvious observation)
- **Creepy:** "You seem to favor players with Irish surnames" (implies hidden analysis)
- **Rule:** Show coaches WHAT we're prompting about, not WHY we detected the pattern

---

## 2. THE SCIENCE: WHAT WE KNOW ABOUT COACHING BIAS {#2-the-science}

### The 38-Bias Framework (Mann, Fortin-Guichard & Muller, 2025)

A landmark study reviewed ~200 cognitive biases and identified **38 with high likelihood of affecting coaching decisions**, organized into 5 clusters:

**Cluster 1: Sequential Effects** -- Order of information matters
- Anchoring bias, primacy/recency effects, status quo bias

**Cluster 2: Presentation Effects** -- How information is framed
- Framing effects, **Relative Age Effect (RAE)**, mode bias

**Cluster 3: Cognitive Models** -- Mental frameworks coaches bring
- **Confirmation bias**, desire bias, hot-hand effect

**Cluster 4: Association Effects** -- Pattern-seeking (including false patterns)
- Availability heuristic, representativeness heuristic, survivorship bias

**Cluster 5: Egocentric Effects** -- Self-perception biases
- Overconfidence, **bias blind spot**, in-group favoritism, Dunning-Kruger

### Which Biases Are Measurable via Technology?

| Bias | Measurability | How PlayerARC Can Detect |
|------|--------------|--------------------------|
| **Feedback distribution inequality** | Very High | Per-player voice note counts + quality scores |
| **Relative Age Effect** | Very High | Birth date data vs attention distribution |
| **Confirmation bias** | High | Sentiment trajectory analysis over time |
| **Halo effect** | Medium | Cross-dimension rating correlation |
| **Pygmalion/self-fulfilling prophecy** | High | Quality/quantity against initial expectations |
| **Mere exposure effect** | Medium | Attendance correlation with feedback frequency |
| **Sunk cost / Commitment escalation** | Medium | Attention patterns for previously selected players |

### The Pygmalion Effect: The Core Mechanism to Disrupt

Horn, Lox & Labrador (2015) documented the 4-step self-fulfilling prophecy in coaching:

1. Coach forms expectations based on personal/performance/psychological cues
2. Expectations influence coaching behavior -- **high-expectancy athletes receive more and higher-quality feedback**
3. Athletes become aware of differential treatment
4. Athletes perform in ways that confirm the original expectations

**Key data points:**
- Elite coaches can only recall **38.8%** of critical events in a match
- High-expectancy athletes receive more specific technical feedback
- Low-expectancy athletes receive generic praise ("Good enough")
- In controlled experiments with **false expectations**, coaches allocated more practice opportunities to "high expectancy" players, who then performed better -- confirming the coach's false beliefs

### Why Awareness Training Alone Doesn't Work

The UK Government Equalities Office reviewed **492 studies (87,000+ participants)**:
- "Little evidence that unconscious bias training leads to meaningful changes in behavior"
- Awareness can **backfire**: "Sending the message that bias is involuntary and widespread may make it seem unavoidable"
- Mandatory training triggers **reactance** -- participants resist the message

**What DOES work (Intervention Hierarchy):**
1. **Structural/environmental changes** (modifying the decision environment)
2. **Data-driven feedback loops** (showing coaches their own patterns)
3. **Cueing/nudging** (making relevant information salient at decision points)
4. **Skill-building with tools** (structured frameworks + practice)
5. ~~Awareness training alone~~ (least effective)

**PNAS meta-analysis of 200+ nudge studies:** Nudge interventions increase desired behavior by **8.7 percentage points** (33.5% over control). This directly validates PlayerARC's approach of surfacing data dashboards rather than lecturing coaches.

---

## 3. QUALITY-WEIGHTED ATTENTION SCORING (NEW) {#3-quality-weighted-attention-scoring}

### Why This Matters More Than Counting

The existing plan counts insight **frequency** per player. Textio's 2024 analysis of 23,000 performance reviews revealed the real bias is in **quality**:

- High performers receive **1.5x MORE feedback** but the **LOWEST quality** (vague, cliche-filled)
- High performers get **2.6x more fixed-mindset language** ("she's a natural")
- People receiving low-quality feedback are **63% more likely to leave within 12 months**

**Coaching parallel:** A coach might mention all 20 players but give Player A a 200-word tactical breakdown and Player B "good session today." Same count. Massive quality gap.

### The 6 Quality Dimensions (Adapted from Textio)

| Dimension | Weight | Score 1 (Surface) | Score 5 (Exceptional) |
|-----------|--------|-------------------|----------------------|
| **Specificity** | 25% | "She's doing well" | "Her hand passing accuracy in the 3v2 went from ~60% to ~85%" |
| **Actionability** | 20% | "She needs to improve" | "Focus next 2 sessions on low tackle technique, body position on approach" |
| **Observational Depth** | 20% | "Good session" | Analysis connecting observation to pattern, root cause, development arc |
| **Developmental Orientation** | 15% | "She's just not a tackler" (fixed) | "Her tackling is developing -- effort in practice is paying off" (growth) |
| **Constructive Balance** | 10% | Pure criticism or empty praise | Integrates strengths as foundation for development areas |
| **Player-Centricity** | 10% | Generic, could apply to anyone | Tailored to this player's journey and learning style |

### Tiered Scoring Architecture (Cost-Optimized)

**~60% of insights scored with zero LLM cost:**

```
Tier 1: Rule-Based Heuristics (FREE) - 35% of insights
├── Word count < 15 → automatic "surface" classification
├── Category = "attendance" → score as N/A
├── Category = "todo" → score as low player-centricity
└── Clear signals: numbers, skill names, drill references, comparisons

Tier 2: Lightweight NLP (FREE) - 25% of insights
├── Sports-specific sentiment lexicon (VADER-style, custom)
├── Fixed vs growth mindset pattern matching
├── Structural depth analysis (observation + analysis + evidence)
└── Actionability verb detection

Tier 3: LLM Scoring (PAID) - 40% of insights
├── Medium-length insights with mixed signals
├── Injury/medical/skill_progress categories
├── Longer insights where nuance matters
└── Uses Claude Sonnet with structured tool_use output
```

### The Quality-Weighted Attention Score (QWAS)

Instead of: "Player X has 3 insights this month" (count only)
We compute: "Player X has a QWAS of 72" (quality * weight * recency * category)

```
QWAS = SUM(quality_score_i * length_factor_i * recency_factor_i * category_factor_i)
       ────────────────────────────────────────────────────────────────────────────
                                    max_possible
```

Where:
- **quality_score**: 0-100 composite from 6 dimensions
- **length_factor**: 0.3-1.0 (capped at 200 words)
- **recency_factor**: 0.7-1.0 (more recent = higher weight)
- **category_factor**: 0.5-1.5 (injury > skill_rating > attendance > todo)

### The Killer Feature: Quality Disparity Detection

**Flag coaches who give high-frequency but low-quality feedback to certain players.** This is the Textio finding applied to coaching: star players may get mentioned a lot but with vague praise, while developing players get fewer but more actionable insights, or vice versa.

---

## 4. INLINE QUALITY FEEDBACK (V3.5 — REINTEGRATED FROM V2) {#4-inline-quality-feedback}

### Why This Was the Most Valuable V2 Feature We Lost

V2's section 2.4 ("Insight Quality Feedback — Inline") was the single feature that turns quality scoring from **passive measurement** into **active coaching of the coach**. Without it, we score quality but never help coaches improve in the moment that matters most — while they're creating the insight.

**The core insight:** Quality scoring without real-time feedback is like grading essays but never showing the student their grade. Inline feedback closes the loop.

### How It Works (V3.5 Adaptation)

V2 used a 5-dimension "actionability" score. V3.5 uses the 6-dimension QWAS scoring framework (specificity, actionability, observational depth, developmental orientation, constructive balance, player-centricity) for richer, more nuanced feedback.

**Flow:**

```
Coach creates insight (voice or text)
        │
        ▼
Tier 1: Rule-based heuristic check (instant, free)
├── Word count < 15 → "Surface" flag, suggest elaboration
├── No specific skill/behavior named → "Low specificity" flag
├── Fixed-mindset language detected → "Developmental orientation" flag
└── Score ≥ 70 → No feedback needed (pass through)
        │
        ▼ (if score 40-69)
Tier 2: Lightweight NLP analysis (instant, free)
├── Pattern match against quality templates
├── Identify which of 6 dimensions are weakest
└── Generate dimension-specific suggestion from templates
        │
        ▼ (if score < 40 OR mixed signals)
Tier 3: LLM-powered suggestion (async, ~2-3 seconds)
├── Full QWAS analysis with Claude Haiku
├── Sport/age-appropriate example rewrite
└── Specific improvement suggestions
```

### UX Design

```
┌─────────────────────────────────────────────────────┐
│ Voice Note for Emma Murphy                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Transcription:                                      │
│ "Emma did really well today in training. Her        │
│  tackling has improved a lot."                      │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 💡 Make this more impactful                     │ │
│ │                                                 │ │
│ │ Your note captures the improvement but could    │ │
│ │ help Emma (and parents) understand more:        │ │
│ │                                                 │ │
│ │ ○ Specificity: What tackling technique?         │ │
│ │ ○ Actionability: What should she focus on next? │ │
│ │                                                 │ │
│ │ Example:                                        │ │
│ │ "Emma's shoulder positioning in tackles has     │ │
│ │  improved—she's now winning 7/10 duels vs 4/10 │ │
│ │  last month. Next: timing in 1v1 situations."  │ │
│ │                                                 │ │
│ │ [Apply Suggestion] [Edit Myself] [Keep As-Is]  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Quality: ████░░░░░░ 42/100                          │
│ Applying suggestion would improve to: ~78/100       │
│                                                     │
│ [Save Insight]                                      │
└─────────────────────────────────────────────────────┘
```

### Key Design Decisions (V3.5 vs V2)

| Decision | V2 | V3.5 | Reasoning |
|----------|-----|------|-----------|
| Scoring framework | 5 dimensions (actionability-focused) | 6 dimensions (QWAS) | Richer, research-backed quality model |
| When to show | Always when score < 0.6 | Only when score < 70 AND coach hasn't dismissed 3x | Respects coach autonomy, prevents nagging |
| Suggestion source | Always LLM (Sonnet) | Tiered: templates for common patterns, LLM for complex | 60% cheaper, faster response time |
| Quality score shown | No | Yes — shows current score AND predicted score after applying | Transparency + motivation to improve |
| Framing | "AI SUGGESTION" with ⚠️ | "Make this more impactful" with 💡 | Less alarming, more collaborative |
| Sport/age context | Basic | Full sport + age group + category context injected | Better examples (GAA U12 vs Rugby U16) |
| "Keep As-Is" option | "Continue As-Is" | "Keep As-Is" (validated as less judgmental in Textio research) | Respects coach judgment without implying they're wrong |

### Dismissal & Learning

- Coach selects "Keep As-Is" → recorded, no penalty, insight saves as-is
- After 3 consecutive "Keep As-Is" on similar suggestions → reduce suggestion frequency for that dimension
- Coach selects "Apply Suggestion" → quality score updated, tracked as engagement signal for Learning Agent
- Coach selects "Edit Myself" → shows quality score updating live as they edit (gamifies improvement naturally)

### Cost Impact

| Trigger Rate | Template Suggestions | LLM Suggestions | Monthly Cost (100 coaches) |
|-------------|---------------------|-----------------|---------------------------|
| ~40% of insights need feedback | 60% handled by templates | 40% need LLM (Haiku) | ~$3.20/mo |
| Per-insight LLM cost | $0 | ~$0.0003 | Negligible |

**This is the single highest-ROI feature in the entire system** — it directly improves insight quality at the moment of creation, which cascades into better QWAS scores, better parent summaries, and better player development.

---

## 5. THE PROFESSIONAL GROWTH STACK (REPLACES GAMIFICATION) {#5-professional-growth-stack}

### Why Gamification Is Wrong for This Feature

**The research is unambiguous:**

| Finding | Source | Implication |
|---------|--------|-------------|
| Extrinsic rewards crowd out intrinsic motivation | Deci, Koestner & Ryan (1999), 128 studies | Badges for "fair coaching" will make coaches do it for the badge, not the players |
| Gamification effects peak at 2-4 weeks, decay to baseline by 8-12 weeks | Koivisto & Hamari (2019) | Streaks will lose effectiveness quickly |
| Leaderboards demotivate the bottom 50% | Hamari et al. (2014) | "Coach Fairness Leaderboard" would demoralize most coaches |
| Competitive framing between coaches damages coaching quality | Ntoumanis & Mallet (2014) | Coaches who feel ranked become MORE controlling with athletes |
| Workplace gamification causes stress, unhealthy competition | ResearchGate 2020 | Directly counterproductive |
| Samsung Health leaderboards increased 90-day dropout by 22% | JMIR 2023 | Competitive framing doesn't sustain engagement |
| Duolingo streak pressure created "Duolingo guilt" and app avoidance | Multiple 2024 studies | Streaks become anxiety, displacing learning |
| Mandatory gamification decreases performance AND satisfaction | Mollick & Rothbard, Wharton | Only works when employees consent and view it positively |

**The critical insight from SDT research:** Coaches are primarily motivated by:
1. Seeing players improve (intrinsic)
2. Mastering their craft (intrinsic)
3. Strong relationships with players/parents (relational)

External rewards (badges, points, leaderboards) convert "I assess broadly because I care" into "I assess broadly because the app gives me points." When the points lose novelty, the behavior drops **below baseline**.

### The Replacement: Professional Growth Stack

```
Layer 1: VISIBILITY (Ambient Feedback)
  └─ Coaching Coverage dashboard (attention distribution ring)
  └─ Per-player coverage heatmap
  └─ Personal trend lines (your own history, never vs peers)

Layer 2: AGENCY (Self-Directed Goals)
  └─ Coach-set goals with suggested ranges
  └─ Private progress tracking (only you see this)
  └─ Revision without penalty ("adjust my goals")

Layer 3: IMPACT (Natural Rewards)
  └─ Player improvement attribution ("Players you assessed regularly showed X% improvement")
  └─ Season-end reflective review
  └─ Parent engagement correlation

Layer 4: GROWTH (Reflective Practice)
  └─ Optional weekly reflection prompt
  └─ Contextual micro-prompts at task boundaries (Tiny Habits model)
  └─ Season retrospective

Layer 5: CONNECTION (Social Without Competition)
  └─ Descriptive norms ("Most coaches in your sport assess each player monthly")
  └─ Shared coaching tips (anonymous/opt-in)
  └─ Community benchmarks (not individual ranking)
```

### Specific UX Patterns

**1. Self-Set Goals (Goal-Setting Theory: Locke & Latham)**

```
┌─────────────────────────────────────────┐
│  My Coaching Goals                      │
│                                         │
│  ○ Assess each player at least once     │
│    per month                            │
│  ○ Provide written feedback to all      │
│    players by mid-season                │
│  ○ Focus extra attention on [custom]    │
│                                         │
│  [+ Add your own goal]                  │
│                                         │
│  These goals are private to you.        │
│  Only you can see your progress.        │
└─────────────────────────────────────────┘
```

Research: Specific goals outperform "do your best" by 20-25%. Self-set goals produce equal or greater commitment than assigned goals.

**2. Impact Attribution (Natural Rewards)**

```
┌─────────────────────────────────────────┐
│  Player Development Insights            │
│                                         │
│  Players you assessed regularly this    │
│  season showed:                         │
│  • 23% more self-assessment engagement  │
│  • Higher parent satisfaction ratings   │
│                                         │
│  "When coaches assess broadly, players  │
│   feel seen." — Research finding        │
└─────────────────────────────────────────┘
```

**3. Reflection Prompts (Weekly, Optional, Opt-In)**

```
Weekly Coaching Reflection (optional)

This week you worked most closely with:
  Sarah M., James O., Conor D.

Players you haven't connected with recently:
  Ava L., Finn B., Roisin K.

Would you like to:
  ○ Note any observations about these players
  ○ Add them to next week's focus
  ○ Dismiss (they're fine for now)
```

The third option ("they're fine for now") is critical -- it validates the coach's judgment and prevents nagging.

---

## 6. PROACTIVE AI DESIGN: NUDGING WITHOUT ANNOYING {#6-proactive-ai-design}

### Notification Research: Hard Numbers

| Frequency | Opt-Out Rate | Source |
|-----------|-------------|--------|
| 1/week | 10% | MobileLoud 2025 |
| 3-6/week | **40%** | MobileLoud 2025 |
| 6-10/week | 32% | PushWoosh 2025 |
| Once lost, permission is | **rarely regained** | Apple HIG |

**Previous plan:** Max 1 prompt/day (= 7/week potential)
**Updated plan:** Max 1 push notification/week, supplemented by ambient in-app indicators

### Apple's Interruption Taxonomy (Applied to PlayerARC)

| Apple Level | PlayerARC Use Case |
|-------------|-------------------|
| **Passive** (Notification Center only) | Weekly coverage digest |
| **Active** (default, sound + banner) | New insight confirmation |
| **Time Sensitive** (breaks Focus mode) | None -- coverage is never urgent |
| **Critical** (even in DND) | Never appropriate |

### Task-Boundary Timing (CHI 2025 Codellaborator Study)

The most rigorous 2025 study on proactive AI found:
- **53-73% engagement** when suggestions appear at task boundaries
- **High disruption** when suggestions appear during focused work
- **Presence indicators** reduced disruption by 18%

**PlayerARC application -- nudge at these moments only:**

| Moment | Nudge Type | Example |
|--------|-----------|---------|
| After submitting a voice note | Post-action momentum | "15 of 18 players covered this month" |
| When opening the dashboard | Ambient coverage indicator | Coverage ring visualization |
| Weekly digest (configurable day/time) | Summary | "3 players you might want to check in on" |
| When starting a new insight | Suggested player | "You haven't recorded insights about Emma in 14 days" |

**Never nudge during:** Voice recording, mid-note editing, settings pages

### The "Suggested Player" Prompt (ClassDojo Model)

When a coach opens "New Insight," show a subtle suggestion:

```
┌──────────────────────────────────────┐
│  While you're here...                │
│  You haven't noted anything about    │
│  Ava L. since Jan 12.               │
│  [Quick note?]          [Not now]    │
└──────────────────────────────────────┘
```

This follows BJ Fogg's Tiny Habits model exactly:
- **Prompt:** At the moment of relevant action (already creating an insight)
- **Ability:** Extremely easy (one-tap quick note)
- **Motivation:** Minimal required (already in assessment mode)

The KNVB (Dutch FA) rated "cueing differences" as the **highest overall viability** intervention (5.8/9) for reducing coaching bias.

### Dismissal Handling

| Dismissal Count | System Response |
|----------------|-----------------|
| 1st dismissal | Normal -- show again next eligible moment |
| 2nd dismissal (same player) | Reduce frequency for this player |
| 3rd dismissal (same player) | Stop suggesting this player for 30 days |
| 3 consecutive dismissals (any) | Reduce nudge frequency by 50% |
| Coach opts out | Respect immediately, show ambient indicators only |

### Presence Indicators (CHI 2025)

When the system generates coverage insights, show transparency:

```
Analyzing 47 voice notes from the last 30 days...
```

This builds trust and reduces the "surveillance" feeling by 18% (CHI 2025 study).

---

## 7. BIRTH QUARTER (RAE) OVERLAY {#7-birth-quarter-overlay}

### The Data

The Relative Age Effect is the **most quantified and measurable** coaching bias:

| Sport | Q1 Selected | Q4 Selected | Ratio |
|-------|------------|------------|-------|
| Soccer (International Youth Elite) | >40% | <8% | 5:1 |
| Soccer (Youth Academy U13-U15) | 38.4% | 13.9% | 2.8:1 |
| Rugby (English Premiership Academy) | 48% | 8% | 6:1 |
| GAA (Talent Academy) | 30.4% | 17.6% | 1.7:1 |
| Athletics (U18 Top 10%) | 35.8% | 13.3% | 2.7:1 |
| Expected (population) | ~25% | ~25% | 1:1 |

**Critical finding:** 76.2% of Q4 players who made academy were contracted as senior professionals, vs only 46.6% of Q1 players. Late-born players who survive selection develop greater resilience -- **the "underdog hypothesis."**

### The Feature

An optional overlay on the Coaching Coverage heatmap that shows attention distribution correlated with player birth quarter:

```
┌──────────────────────────────────────────────────┐
│  Coaching Coverage by Birth Quarter              │
│  [Toggle: Show Birth Quarter ○]                  │
│                                                  │
│  Q1 (Jan-Mar): ████████████████ 42% of insights  │
│  Q2 (Apr-Jun): ████████████░░░░ 28% of insights  │
│  Q3 (Jul-Sep): ████████░░░░░░░░ 18% of insights  │
│  Q4 (Oct-Dec): ████░░░░░░░░░░░░ 12% of insights  │
│                                                  │
│  Expected distribution: ~25% each                │
│                                                  │
│  ℹ️  Research shows coaches naturally give more   │
│  attention to earlier-born players, who are       │
│  often physically bigger at youth level.          │
│  [Learn more about the Relative Age Effect]       │
└──────────────────────────────────────────────────┘
```

### Why This Works

The KNVB study showed that simply making birth month visible (cueing) was the **most viable intervention** for reducing RAE bias. PlayerARC already collects player date of birth. The analysis is straightforward. The "aha moment" of seeing 42% of your feedback goes to Q1 players is powerful and self-correcting.

### Implementation

- Feature-flagged, opt-in per organization
- Uses existing `dateOfBirth` from `orgPlayerEnrollments`
- Chi-square test for statistical significance
- Only shown when squad has enough players (10+) for meaningful analysis
- Framed as educational/informational, never judgmental

---

## 8. BIDIRECTIONAL MEASUREMENT {#8-bidirectional-measurement}

### The Gap Between What Coaches Think and What Players Experience

Research consistently shows:
- Coaches overestimate the quality of their own feedback (Mason et al. 2020)
- Up to **90%** of some coaches' feedback was negative, contrary to their self-perception
- Teachers acknowledge they might cause attention problems only **35%** of the time

### The Panorama Education Model

Panorama (15M students, 25K schools, 1.5B survey responses) developed with Harvard GSE a methodology that measures attention equity from the **recipient's** perspective.

### PlayerARC's Bidirectional Approach

**Signal 1: Objective Data (from voice notes)**
- Which players are mentioned, how often, with what quality
- Already collected -- no new data capture needed

**Signal 2: Coach Self-Assessment**
- Brief optional prompt: "How balanced do you feel your coaching attention was this week?" (1-5)
- The gap between this and Signal 1 = the **"blind spot" metric**

**Signal 3: Parent/Player Perception**
- Via existing parent-facing features (parent summaries, passport sharing)
- Quarterly micro-survey (2-3 questions):
  - "How well does the coach know [child]'s strengths?" (1-5)
  - "Does [child] feel they get enough individual attention at training?" (1-5)
- The gap between Signal 1 and Signal 3 = the **"experience gap" metric**

### Privacy Design

- Parent survey responses are aggregated, never attributed to individual parents
- Coaches see aggregate trends, not individual parent feedback
- Minimum response threshold (5+) before showing aggregate data
- Parents can decline the survey without consequence

---

## 9. QUANTITATIVE BIAS METRICS {#9-quantitative-bias-metrics}

### Gini Coefficient for Attention Distribution

Measures inequality on a 0-1 scale (0 = perfect equality, 1 = maximum inequality).

| Gini Score | Interpretation | Action |
|-----------|----------------|--------|
| 0.0 - 0.15 | Very equitable | Green indicator |
| 0.15 - 0.30 | Acceptable variation | Blue indicator |
| 0.30 - 0.45 | Moderate imbalance | Amber indicator, surface nudges |
| 0.45+ | Significant imbalance | Active intervention |

### Herfindahl-Hirschman Index (HHI)

Measures **concentration** -- is attention focused on a few players? Complementary to Gini.

- **HHI = SUM(share_i^2)** for each player's share of total attention
- For a squad of 20: minimum = 0.05 (5% each), maximum = 1.0 (all on one player)
- Normalized: (HHI - 1/N) / (1 - 1/N) gives 0-1 scale

### Per-Player Z-Score

- z = (player_mentions - mean) / std_dev
- z < -1.5: significantly less attention than average
- z > 1.5: significantly more attention than average
- Cross-reference with birth quarter, join date, ability tier

### Shannon Entropy for Feedback Diversity

Track the **types** of feedback per player (technical, praise, corrective, encouragement).
- Higher entropy = more diverse feedback types
- Players receiving only "generic praise" vs. rich technical instruction = measurable gap

### Composite "Coaching Coverage Score"

```
Coverage Score = w1 * (1 - Gini) + w2 * (1 - nHHI) + w3 * QWAS_equity + w4 * RAE_balance
```

Where:
- **(1 - Gini)** converts inequality to equity (higher = better)
- **(1 - nHHI)** converts concentration to distribution
- **QWAS_equity** = coefficient of variation of quality-weighted attention across players
- **RAE_balance** = 1 - Cramer's V for birth quarter distribution

---

## 10. UPDATED AGENT ARCHITECTURE (V3.5 — 4 AGENTS + HYBRID ORCHESTRATOR) {#10-updated-agent-architecture}

### Evolution: V2 → V3 → V3.5

| Aspect | V2 (4 agents) | V3 (3 agents) | V3.5 (4 agents) |
|--------|---------------|---------------|-----------------|
| Quality Scorer | ❌ | ✅ Tiered (Rule→NLP→LLM) | ✅ Same + inline feedback |
| Coverage Analyzer | Pattern Detective (full LLM) | ✅ Deterministic + LLM interpretation | ✅ Same + context awareness |
| **Prompt Generator** | ✅ LLM prompt variants | ❌ Removed | ✅ **Returned** — weekly digest personalization only |
| Learning Agent | ✅ Full personality profiling | ✅ Simplified archetype clustering | ✅ Same as V3 |
| Orchestrator | Full LLM decision engine | Rules-only | **Hybrid** — rules for 90%, LLM for edge cases |
| LLM calls/coach/week | ~25 | ~4 | ~6 (still 75% reduction from V2) |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                 COACHING COVERAGE SYSTEM (V3.5)          │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
 ┌──────────┐       ┌──────────┐       ┌──────────┐
 │ Quality  │       │ Coverage │       │ Learning │
 │ Scorer   │       │ Analyzer │       │  Agent   │
 │          │       │          │       │          │
 │ Tiered:  │       │ Gini,HHI │       │ Coach    │
 │ Rule→NLP │       │ RAE,Z-Sc │       │ profiles │
 │ →LLM     │       │ QWAS     │       │ Timing   │
 │          │       │ +Context │       │ Archetype│
 │ +Inline  │       │  Aware   │       │          │
 │ Feedback │       │          │       │          │
 └──────────┘       └──────────┘       └──────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
              ┌────────────────────┐
              │ Hybrid Orchestrator│
              │                    │
              │ Rules: 90% of     │
              │   decisions       │
              │ LLM: edge cases   │
              │   + digest text   │
              │ Max 1 push/week   │
              └────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
 ┌──────────┐       ┌──────────┐       ┌──────────┐
 │ Prompt   │       │ Coach    │       │ Admin    │
 │Generator │       │Dashboard │       │Calibrate │
 │ (V3.5)   │       │(Ambient) │       │(Aggreg.) │
 │          │       │          │       │          │
 │ Digest   │       │ +Inline  │       │          │
 │ personal.│       │ Quality  │       │          │
 │ WhatsApp │       │ Feedback │       │          │
 └──────────┘       └──────────┘       └──────────┘
```

### Agent 1: Quality Scorer (Enhanced in V3.5)

Runs as a post-processing step after voice note insight extraction:

1. Every insight gets heuristic scoring (free, instant)
2. Medium-complexity insights escalated to LLM scoring (async)
3. Scores stored on `voiceNoteInsights` table
4. Aggregated per-player QWAS updated in rolling 30-day windows
5. **V3.5: Inline feedback** — when score < 70, generates dimension-specific improvement suggestions shown to coach in real-time (see Section 4)

### Agent 2: Coverage Analyzer (Enhanced with Context Awareness)

Previously "Pattern Detective Agent." Now computes:
- Gini coefficient for attention distribution
- HHI for concentration
- Per-player z-scores for attention deviation
- RAE correlation (birth quarter overlay data)
- QWAS disparity analysis (quality gaps, not just frequency)
- Sentiment equity index
- **V3.5: Context-aware gap analysis** — cross-references coverage gaps with injury records, attendance data, and team events to eliminate false positives (see Section 11)

Uses Claude Sonnet for **interpretation only** — the metrics are computed deterministically. The LLM provides natural-language context (e.g., "Emma's low coverage may be related to her 2-week injury absence").

### Agent 3: Prompt Generator (V3.5 — RETURNED FROM V2)

**What it was in V2:** Full personalized prompt generation for every nudge interaction, creating 3 variants (gentle, data-driven, contextual) with estimated response rates. Required LLM call per nudge.

**What it is in V3.5:** Scoped to **weekly digest personalization only**. Instead of generating prompt variants for every nudge (expensive, over-engineered), it personalizes:

1. **Weekly digest text** — adapts tone based on coach archetype (from Learning Agent)
2. **WhatsApp digest message** — concise, mobile-optimized version
3. **Suggested player rationale** — context-aware explanation for why specific players are suggested

```typescript
// V3.5 Prompt Generator — runs once per coach per week
const digestPrompt = await anthropic.messages.create({
  model: "claude-haiku-4-5-20251001",
  system: `You personalize weekly coaching coverage digests.

    Coach archetype: ${coachProfile.archetype}
    Preferred tone: ${coachProfile.preferredTone}

    Generate a warm, brief digest message that:
    - Highlights coverage progress (not gaps)
    - Suggests 1-3 players naturally (not as failures)
    - Matches the coach's communication style
    - Is appropriate for WhatsApp (< 160 chars for SMS-like delivery)`,
  messages: [{ role: "user", content: JSON.stringify(weeklyData) }]
});
```

**Cost:** ~$0.0002 per coach per week = $0.80/month for 100 coaches

### Agent 4: Learning Agent (Same as V3)

Tracks:
- Which prompt types the coach responds to (contextual > data-driven > gentle)
- Optimal nudge timing (post-training, morning, evening)
- Dismissal patterns (reduce frequency when appropriate)
- Coach behavioral archetype (5 archetypes via k-means clustering)

### Hybrid Orchestrator (V3.5 — RULES + LLM)

**V2:** Full LLM orchestrator making every delivery decision (~25 LLM calls/coach/week)
**V3:** Pure rules engine (0 LLM calls for orchestration)
**V3.5:** Rules handle 90% of decisions; LLM handles edge cases

**Rules Engine (handles 90% of decisions):**
- Max 1 push notification per week
- Max 1 in-app micro-nudge per session (at task boundary only)
- Ambient dashboard indicators always available (pull, not push)
- Weekly digest at coach-configured day/time
- Respect 3-dismissal progressive reduction
- Inline quality feedback on insights scoring < 70

**LLM Escalation (handles 10% — edge cases):**

```typescript
// Only called when rules engine encounters ambiguity
const shouldEscalate = (context: OrchestratorContext): boolean => {
  // Coach has been inactive 14+ days but has valid reasons
  if (context.daysSinceLastLogin > 14 && context.hasRecentInjuryEvents) return true;
  // Coverage pattern changed dramatically (positive or negative)
  if (Math.abs(context.coverageChangePercent) > 30) return true;
  // Coach is in first 2 weeks (onboarding — need careful calibration)
  if (context.daysOnPlatform < 14) return true;
  // Multiple conflicting signals
  if (context.conflictingSignals.length > 2) return true;
  return false;
};
```

When escalated, the LLM decides:
- Should we nudge or wait? (considering the ambiguous context)
- What tone/framing is appropriate? (new coach vs experienced)
- Should we reduce/increase nudge frequency? (adapting to unusual patterns)

---

## 11. CONTEXT AWARENESS (V3.5 — REINTEGRATED FROM V2) {#11-context-awareness}

### The Problem Without Context

V3's Coverage Analyzer computes coverage gaps purely from insight frequency/quality data. This creates **false positives**:

| Scenario | Without Context | With Context |
|----------|----------------|-------------|
| Player injured for 3 weeks | "You haven't noted anything about Emma in 21 days" ⚠️ | "Emma returned from injury 2 days ago — time to check in?" ✅ |
| Player missed 4 training sessions | "Roisin has no insights this month" ⚠️ | Roisin missed 4 of 5 sessions — gap is expected ✅ |
| Tournament week (all focus on match players) | "3 players with no insights" ⚠️ | County tournament week — coverage gap is normal ✅ |
| Player just enrolled | "Zero insights for Aoife" 🚨 | "Aoife joined 3 days ago — still settling in" ✅ |

### Data Sources for Context

PlayerARC already captures the data needed — we just need to cross-reference it:

| Context Signal | Source Table | How It's Used |
|---------------|-------------|---------------|
| **Injury status** | `injuryRecords` | Suppress nudges for injured players; suggest check-in on return |
| **Attendance** | `sessionAttendance` | Weight coverage gaps by actual attendance (miss 50% of sessions → 50% less expected coverage) |
| **Enrollment date** | `orgPlayerEnrollments.createdAt` | Don't flag new players in first 7 days |
| **Team events** | `teamEvents` / `sessionPlans` | Suppress nudges during tournaments/breaks |
| **Parent sharing status** | `passportSharingConsents` | Insights for shared players are higher priority (parents actively viewing) |

### Implementation

```typescript
// Coverage Analyzer with context injection
async function analyzeWithContext(
  coachId: Id<"user">,
  teamId: Id<"teams">,
  window: number // days
) {
  // 1. Get raw coverage metrics (deterministic)
  const rawMetrics = await computeCoverageMetrics(coachId, teamId, window);

  // 2. Get context data
  const injuries = await getActiveInjuries(teamId);
  const attendance = await getAttendanceRates(teamId, window);
  const newEnrollments = await getRecentEnrollments(teamId, 7); // last 7 days
  const teamEvents = await getTeamEvents(teamId, window);

  // 3. Adjust expected coverage per player
  for (const player of rawMetrics.players) {
    const adjustments: string[] = [];

    // Injured players: suppress gap flagging
    const injury = injuries.find(i => i.playerId === player.id);
    if (injury && injury.status === "active") {
      player.expectedCoverage = 0;
      adjustments.push(`Injured since ${injury.startDate}`);
    } else if (injury && injury.status === "recovered") {
      player.priority = "high"; // Flag for check-in on return
      adjustments.push(`Returned from injury ${injury.recoveryDate}`);
    }

    // Attendance-weighted coverage
    const attendanceRate = attendance.get(player.id) ?? 1.0;
    if (attendanceRate < 0.5) {
      player.expectedCoverage *= attendanceRate;
      adjustments.push(`Attended ${Math.round(attendanceRate * 100)}% of sessions`);
    }

    // New enrollments: grace period
    if (newEnrollments.has(player.id)) {
      player.expectedCoverage = 0;
      adjustments.push("New to team (< 7 days)");
    }

    player.contextAdjustments = adjustments;
  }

  // 4. Recalculate Gini/HHI with adjusted expectations
  return recalculateMetrics(rawMetrics);
}
```

### Context in Nudge Messages

When context is available, nudge messages incorporate it:

**Without context:** "You haven't noted anything about Emma in 21 days."
**With context:** "Emma returned from her ankle injury 3 days ago — a quick check-in on how she's readjusting could be valuable."

This makes nudges feel **helpful** rather than **nagging**, because the system demonstrates it understands the coach's situation.

---

## 12. WHATSAPP DELIVERY CHANNEL (V3.5 — REINTEGRATED FROM V2) {#12-whatsapp-delivery}

### Why WhatsApp

PlayerARC already has WhatsApp integration via Twilio for voice note processing and review links. Coaches are already accustomed to interacting with the system via WhatsApp. Adding coverage digest delivery to this existing channel is low-effort, high-impact.

**Existing infrastructure we leverage:**
- `sendWhatsAppMessage(to, body)` in `packages/backend/convex/actions/whatsapp.ts`
- `findCoachByPhone(phoneNumber)` in `packages/backend/convex/models/whatsappMessages.ts`
- Template system in `packages/backend/convex/lib/feedbackMessages.ts`
- E.164 phone normalization already handled

### What Gets Delivered via WhatsApp

Only the **weekly digest** — not individual nudges. This respects V3's "max 1 push/week" principle while meeting coaches where they already are.

```
┌─────────────────────────────────────┐
│ PlayerARC Weekly Coverage           │
│                                     │
│ Hi Michael 👋                       │
│                                     │
│ This week: 7 insights across 5      │
│ players. Coverage: 16/18 (89%) ↑    │
│                                     │
│ Emma returned from injury 3 days    │
│ ago — might be worth a quick        │
│ check-in.                           │
│                                     │
│ 📊 Full dashboard:                  │
│ https://app.playerarc.com/c/abc123  │
│                                     │
│ Reply STOP to opt out               │
└─────────────────────────────────────┘
```

### Delivery Preferences

Coaches choose their weekly digest channel:

| Channel | Default | Opt-in Required |
|---------|---------|----------------|
| In-app notification | ✅ Yes | No |
| Push notification | ✅ Yes | No |
| WhatsApp | ❌ No | Yes — requires phone number + explicit opt-in |
| Email | ❌ No | Yes |

### Implementation

```typescript
// Weekly digest cron — adds WhatsApp delivery option
export const sendWeeklyDigest = internalAction({
  handler: async (ctx) => {
    const coaches = await getCoachesWithDigestPreferences(ctx);

    for (const coach of coaches) {
      const digestData = await computeWeeklyDigest(ctx, coach.id);
      const personalizedText = await generatePersonalizedDigest(
        ctx, coach, digestData
      ); // Prompt Generator Agent

      // Deliver via preferred channels
      if (coach.digestPreferences.inApp) {
        await createInAppNotification(ctx, coach.id, personalizedText.full);
      }
      if (coach.digestPreferences.whatsapp && coach.phoneNumber) {
        await sendWhatsAppMessage(
          coach.phoneNumber,
          personalizedText.whatsapp // Short version, < 160 chars
        );
      }
      if (coach.digestPreferences.email && coach.email) {
        await sendDigestEmail(ctx, coach.email, personalizedText.full);
      }
    }
  },
});
```

### WhatsApp-Specific Constraints

- Max message length: 1,024 chars (WhatsApp API limit for template messages)
- Must include opt-out mechanism: "Reply STOP to opt out"
- No images/rich media in initial version (text only)
- Link to dashboard uses capability URL pattern (existing `whatsappReviewLinks` model)
- Rate limit: 1 message per coach per week (enforced at orchestrator level)

---

## 13. UPDATED FRONTEND UX {#13-updated-frontend-ux}

### 10.1 Coaching Coverage Dashboard Card (Primary)

```
┌─────────────────────────────────────────────────────┐
│  Your Coaching Coverage                              │
│  U12 Girls GAA  •  This Month                       │
│                                                      │
│  ████████████████░░░░ 15/18 players assessed        │
│                                                      │
│  ▸ 3 players you might want to check in on:         │
│    Ava L.  (14 days)   Finn B.  (18 days)           │
│    Roisin K. (21 days)                               │
│                                                      │
│  Coverage trend: ↑ improving vs last month           │
│                                                      │
│  [View Details]  [Set My Goals]                      │
└─────────────────────────────────────────────────────┘
```

**Key design decisions:**
- Amber/gold for gaps, never red (red implies error)
- "You might want to check in on" not "you forgot" -- informational, not accusatory
- Coverage trend compares to **your own past**, never to other coaches
- "Set My Goals" is optional and coach-initiated
- Private -- only this coach sees this card

### 10.2 Coverage Heatmap (with RAE Overlay)

```
┌──────────────────────────────────────────────────────────┐
│ COACHING COVERAGE - U12 Girls GAA                   [X]  │
├──────────────────────────────────────────────────────────┤
│ Filter: [All ▼] [Last 30 days ▼]  [☐ Show Birth Quarter]│
│                                                          │
│ Player Name     Insights Quality  Last Note    Status    │
│ ────────────────────────────────────────────────────────  │
│ Aoife Kelly         12    ██████  2 days ago   ✅        │
│ Ciara Walsh         10    █████░  3 days ago   ✅        │
│ Maeve Ryan           8    ████░░  5 days ago   ✅        │
│ Ava Lawlor           2    ██░░░░  14 days ago  ⚠️       │
│ Finn Brady           1    █░░░░░  18 days ago  ⚠️       │
│ Roisin Kelly         0    ░░░░░░  Never        ⚠️       │
│                                                          │
│ Quality: ██████ = exceptional ░░░░░░ = surface          │
│                                                          │
│ Your Attention Balance: 72/100 (↑ from 65 last month)   │
└──────────────────────────────────────────────────────────┘
```

### 10.3 Post-Insight Nudge (Task Boundary)

Shown **only** after a coach submits a voice note:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│ ✅ Saved! 16 of 18 players assessed this month  │
│                                                 │
│ You haven't recorded insights about:            │
│ • Finn Brady (18 days)    [Quick note?]         │
│ • Roisin Kelly (21 days)  [Quick note?]         │
│                                                 │
│                          [Done for now]          │
└─────────────────────────────────────────────────┘
```

### 10.4 Weekly Digest (Push Notification)

One notification per week, at coach-configured time:

```
Your Weekly Coaching Summary

This week: 7 insights across 5 players
Monthly coverage: 16/18 (89%)

2 players due for a check-in:
• Finn B. (18 days)
• Roisin K. (21 days)

[Open Dashboard]    [Dismiss]
```

### 10.5 Admin Calibration View (Feature-Flagged)

```
┌──────────────────────────────────────────────────────────┐
│ TEAM DEVELOPMENT CALIBRATION                             │
│ Organization: Grange GAA  •  All Teams                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Team                Coach       Coverage  Quality  Trend │
│ ────────────────────────────────────────────────────────  │
│ U12 Girls GAA       M. O'Brien    89%      72      ↑    │
│ U14 Boys GAA        S. Walsh      76%      68      →    │
│ U16 Girls GAA       T. Murphy     62%      55      ↓    │
│                                                          │
│ Org Average Coverage: 76%                                │
│ Org Average Quality: 65                                  │
│                                                          │
│ Players with zero insights (30+ days): 4                 │
│ [View Details]                                           │
│                                                          │
│ Note: Data is aggregate only. Individual insights are    │
│ private to each coach.                                   │
└──────────────────────────────────────────────────────────┘
```

---

## 14. REVISED PHASED IMPLEMENTATION PLAN {#14-revised-implementation-plan}

### Phase 1: Foundation & Ambient Dashboard (Weeks 1-3)

**Backend:**
- Coverage aggregation queries (per-player insight counts, recency)
- Gini coefficient and HHI computation
- Per-player z-score calculation
- Feature flag for Coaching Coverage feature

**Frontend:**
- Coaching Coverage dashboard card (ambient, non-intrusive)
- Coverage heatmap modal with player-level detail
- "Set My Goals" self-directed goal setting UI

**Success Metric:** 80% of coaches view coverage dashboard within first week

---

### Phase 2: Quality Scoring & Inline Feedback (Weeks 4-6) — V3.5 ENHANCED

**Backend:**
- Heuristic quality scoring engine (6 dimensions, rule-based)
- LLM quality scoring action (Claude Haiku, async)
- Quality-Weighted Attention Score (QWAS) computation
- `insightQualityScores` table
- Birth quarter RAE analysis
- **V3.5: Inline quality feedback pipeline** — template-based suggestions for common patterns, LLM for complex insights
- **V3.5: Sport/age-specific suggestion templates** — different examples for GAA U12 vs Rugby U16

**Frontend:**
- Quality indicators on coverage heatmap
- Birth quarter overlay toggle
- Quality trend visualization
- **V3.5: Inline quality feedback component** — shown during insight creation when quality < 70
- **V3.5: Live quality score indicator** — updates as coach edits their insight

**Success Metric:** Quality scores computed for 100% of insights; 30%+ coaches apply inline suggestions; RAE data surfaced

---

### Phase 3: Smart Nudging & Context Awareness (Weeks 7-9) — V3.5 ENHANCED

**Backend:**
- Task-boundary nudge engine (post-insight trigger)
- "Suggested Player" algorithm (weighted by recency + quality gap)
- Weekly digest generator
- Dismissal tracking and progressive reduction
- Coach timing preferences (Learning Agent)
- **V3.5: Context-aware gap analysis** — cross-reference with injury records, attendance, enrollment dates
- **V3.5: Context injection into nudge messages** — "Emma returned from injury" instead of "Emma has no insights"

**Frontend:**
- Post-insight coverage summary nudge
- "Suggested Player" prompt on new insight creation
- Weekly digest notification (configurable day/time)
- Notification preferences UI

**Success Metric:** 40%+ suggested player response rate; <10% opt-out rate; zero false-positive nudges for injured/absent players

---

### Phase 4: Personalization, WhatsApp & Learning (Weeks 10-12) — V3.5 NEW

**Backend:**
- **V3.5: Prompt Generator Agent** — weekly digest personalization based on coach archetype
- **V3.5: WhatsApp digest delivery** — leverage existing Twilio infrastructure
- **V3.5: Hybrid Orchestrator** — rules engine + LLM escalation for edge cases
- Coverage Analyzer agent (natural-language context for patterns)
- Organization-level aggregation with differential privacy
- Coach behavioral clustering (5 archetypes via k-means)
- Calibration queries (coach vs org norms)

**Frontend:**
- Admin calibration dashboard (feature-flagged)
- "Why am I seeing this?" explainability on all nudges
- **V3.5: Digest channel preferences** (in-app, push, WhatsApp, email)
- Consent and privacy settings UI
- Data export/deletion tools (GDPR)

**Success Metric:** Admins can identify org-wide coverage patterns; WhatsApp digest open rate 60%+; coach clustering working

---

### Phase 5: Bidirectional Measurement (Weeks 13-15)

**Backend:**
- Parent micro-survey system (2-3 questions, quarterly)
- Bidirectional gap computation ("blind spot" + "experience gap")
- Coach self-assessment optional prompt
- Aggregated survey response analytics

**Frontend:**
- Parent survey integration (via existing parent comms)
- Coach self-assessment prompt (optional, weekly)
- Gap visualization (objective data vs perception)

**Success Metric:** 30%+ parent survey response rate; gap metrics computed

---

### Phase 6: Advanced Analytics & Impact (Weeks 16-18)

**Backend:**
- Impact attribution (player improvement correlated with coach attention)
- Sentiment equity analysis across players
- Shannon entropy for feedback diversity scoring
- Composite Coaching Coverage Score
- Season retrospective report generator
- A/B testing infrastructure for nudge/suggestion optimization

**Frontend:**
- Impact attribution dashboard ("Your coaching made a difference")
- Season retrospective view
- Feedback diversity visualization
- Descriptive norms ("Most coaches in your sport...")

**Success Metric:** Coverage rate increases 20%+ from baseline; insight quality increases 30%+ from baseline

---

### REMOVED FROM PLAN

| Feature | Why Removed |
|---------|------------|
| Streak tracking | Creates anxiety; SDT research shows undermines intrinsic motivation |
| Achievement/badge system | Overjustification effect; decays to baseline by 8-12 weeks |
| Leaderboards (all types) | Demotivates bottom 50%; competitive framing damages coaching quality |
| Points/XP system | Reduces professional practice to game metric |
| Social sharing of achievements | Inappropriate for this context |
| Daily push notifications | 40% opt-out at 3-6/week; max 1/week instead |

---

## 15. UPDATED COST ANALYSIS {#15-cost-analysis}

### Quality Scoring Costs

| Approach | Insights/Week/Coach | Cost/Insight | Monthly Cost (100 coaches) |
|----------|-------------------|--------------|---------------------------|
| All Sonnet | 60 | ~$0.004 | ~$96 |
| All Haiku | 60 | ~$0.0004 | ~$9.60 |
| Tiered (60% heuristic, 40% Haiku) | 60 | ~$0.0002 avg | ~$4.80 |
| Tiered (60% heuristic, 40% Sonnet) | 60 | ~$0.0016 avg | ~$38.40 |

### V3.5 Additional Costs

| Component | Frequency | Model | Monthly Cost (100 coaches) |
|-----------|-----------|-------|---------------------------|
| **Inline quality feedback** | ~40% of insights | Haiku (40% of those) | ~$3.20 |
| **Prompt Generator (digest)** | Weekly | Haiku | ~$0.80 |
| **Hybrid Orchestrator (LLM)** | ~10% of decisions | Haiku | ~$0.40 |
| Context-aware analysis | Weekly | Rule-based | $0 |

### Coverage Analysis Costs

| Component | Frequency | Model | Monthly Cost (100 coaches) |
|-----------|-----------|-------|---------------------------|
| Gini/HHI/Z-scores | Real-time | Rule-based | $0 |
| Context generation | Weekly | Sonnet | ~$12 |
| Nudge text generation | Weekly | Haiku | ~$2 |
| Coach clustering | Monthly | Sonnet | ~$5 |

### Total Monthly Cost (100 coaches)

| Tier | Quality | Analysis | V3.5 Additions | Total | Per Coach |
|------|---------|----------|----------------|-------|-----------|
| Budget | $4.80 | $7 | $4.40 | ~$16/mo | $0.16 |
| Standard | $38.40 | $19 | $4.40 | ~$62/mo | $0.62 |
| Premium | $96 | $19 | $4.40 | ~$119/mo | $1.19 |

**V2:** $170/mo for 1,000 coaches ($0.17/coach)
**V3:** $57/mo for 100 coaches ($0.57/coach) — quality scoring drove increase
**V3.5:** $62/mo for 100 coaches ($0.62/coach) — only $5/mo more than V3 for inline feedback + personalization + WhatsApp + hybrid orchestrator

The V3.5 additions add just **$4.40/month** for 100 coaches — negligible cost for significant capability gain. The inline quality feedback alone (highest-ROI feature) costs only $3.20/month.

---

## 16. PRIVACY & ETHICS (ENHANCED) {#16-privacy-and-ethics}

### Core Principles

1. **Advisory only, never automated decisions.** The system surfaces data; coaches decide what to do. (Lesson from Workday lawsuit: automated people-decisions face legal scrutiny)

2. **Coach data is private by default.** Attention distribution data is visible only to the coach. Admins see aggregates only. No "Coach X is biased" reports.

3. **Framing matters.** All UI language is informational and constructive. "You might want to check in on 3 players" not "You neglected 3 players."

4. **Opt-out everywhere.** Coaches can disable: coverage tracking, quality scoring, nudges, benchmarking, RAE overlay, parent surveys. Each independently controllable.

5. **GDPR 2025 compliance.**
   - Granular per-feature consent (not all-or-nothing)
   - Right to data export and deletion
   - Differential privacy on all aggregated metrics
   - Explainability ("Why am I seeing this?") on every nudge

### The "Surveillance" Test

Before shipping any feature, apply this test:
- Would a coach feel **empowered** or **surveilled** by this feature?
- Is the coach the **primary beneficiary** or is the admin?
- Does the coach have **full control** over their data visibility?

If the answer to any of these favors surveillance: redesign.

---

## 17. SUCCESS METRICS (REVISED) {#17-success-metrics}

### North Star Metrics

| Metric | Baseline (est.) | Target | Measurement |
|--------|-----------------|--------|-------------|
| **Coverage Rate** (% players with insight in 30 days) | ~50% | 80%+ | Per-coach, per-team |
| **Attention Equity (1-Gini)** | ~0.4 | 0.7+ | Lower inequality |
| **Coach Retention** (still active after 8 weeks) | ~60% | 80%+ | Feature usage |

### Quality Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| **Avg QWAS** across all players | ~40 | 65+ |
| **QWAS Coefficient of Variation** across squad | >0.6 | <0.3 |
| **Avg Composite Quality Score** | ~45/100 | 60/100+ |
| **% "Surface" tier insights** | ~35% | <15% |

### Engagement Metrics

| Metric | Target |
|--------|--------|
| **Dashboard view rate** (weekly) | 70%+ |
| **Suggested player response rate** | 40%+ |
| **Weekly digest open rate** | 50%+ |
| **Nudge opt-out rate** | <10% |
| **Goal-setting adoption** | 30%+ |
| **Parent survey response rate** | 30%+ |

### V3.5 Metrics

| Metric | Target |
|--------|--------|
| **Inline feedback "Apply Suggestion" rate** | 30%+ |
| **Quality improvement after applying suggestion** | +25 QWAS points avg |
| **Context-aware false positive reduction** | 80%+ reduction vs raw gaps |
| **WhatsApp digest opt-in rate** (where phone available) | 40%+ |
| **WhatsApp digest click-through rate** | 25%+ |
| **Hybrid orchestrator LLM escalation rate** | <15% of decisions |

### Anti-Metrics (Things We DON'T Want)

| Anti-Metric | Threshold | Action |
|-------------|-----------|--------|
| Notification dismissal rate | >50% | Reduce frequency |
| Feature disable rate | >15% | Redesign |
| Coach-reported surveillance feeling | Any reports | Investigate and redesign |
| "Gaming" behavior (bulk low-quality notes) | Detected | Adjust quality scoring |

---

## 18. RESEARCH SOURCES {#18-sources}

### Academic Studies

- Mann, Fortin-Guichard & Muller (2025). Framework of 38 cognitive biases in talent identification. *International Review of Sport and Exercise Psychology*
- Ramanayaka et al. (2025). Susceptibility to cognitive biases in athlete selection. *International Journal of Sports Science & Coaching*
- Corbett et al. (2024). Systematic review of coach verbal feedback in team sports. *IJSSC*
- Mason et al. (2020). Sports coaches' knowledge about feedback quality. *PMC*
- Deci, Koestner & Ryan (1999). Meta-analysis of extrinsic rewards on intrinsic motivation. *Psychological Bulletin* (128 studies)
- Koivisto & Hamari (2019). Rise of motivational information systems. *Int J Information Management*
- Locke & Latham (2002). Goal-setting theory. *American Psychologist*
- UK Government Equalities Office. Unconscious bias training evidence. (492 studies, 87K participants)
- PNAS nudge meta-analysis (200+ studies, 440 effect sizes). Cohen's d = 0.43
- Mollick & Rothbard (2014). Mandatory Fun: Gamification at Work. *Wharton School*
- CHI 2025 Codellaborator. Proactive AI design (18 participants, 3 proactivity levels)
- KNVB (2025). Relative age solutions project. *Frontiers in Sports and Active Living*
- Textio (2024). Language Bias in Performance Feedback. 23,000 reviews, 253 organizations
- Horn, Lox & Labrador (2015). Self-fulfilling prophecy in coaching

### Product Research

- Textio Lift (feedback quality scoring, bias interrupt UX)
- Culture Amp Perform 2025 (calibration analytics, AI Suggest Improvements)
- Workday AI (manager coaching, bias language flagging)
- BetterUp (AI + human coaching hybrid, 4M+ sessions)
- ClassDojo (random student selector, 50M users)
- Panorama Education (surveys, 15M students, 1.5B responses, Solara AI)
- Duolingo (gamification lessons: 23.5-hour rule, streak freeze, notification tone backlash)
- GitHub Copilot (70% rejection rate, quality > quantity for suggestions)

### Industry Reports

- Aspen Institute State of Play 2025
- Sport Ireland Diversity and Inclusion Policy (2022)
- UEFA 2025 Coaching Convention
- KNVB Relative Age Solutions Project (185 submissions)
- Apple Human Interface Guidelines (notification interruption levels)
- MobileLoud Push Notification Statistics 2025

---

## SUMMARY: WHAT'S DIFFERENT IN V3.5

The V3.5 plan combines V3's research-backed framework with V2's best practical features:

### 1. From "Detecting Bias" to "Supporting Coaching Coverage" (V3)

Every HR platform that's tried to detect bias learned: the framing determines adoption. We renamed, reframed, and repositioned. The feature helps coaches develop all their players, not catches them being unfair.

### 2. From "Counting Mentions" to "Measuring AND Improving Quality" (V3 + V3.5)

The Textio research proves that counting how often a player is mentioned misses the real signal. Quality-weighted attention scoring is the core innovation — and V3.5's **inline quality feedback** closes the loop by coaching coaches in real-time, not just scoring them passively.

### 3. From "Gamifying Coaching" to "Supporting Professional Growth" (V3)

The SDT research, gamification fatigue studies, and sports coaching motivation literature all converge: badges, streaks, and leaderboards are wrong for this context. The Professional Growth Stack is more effective, more sustainable, and more ethical.

### 4. From "One-Size-Fits-All" to "Context-Aware & Personalized" (V3.5)

V3.5 reintegrates V2's best ideas — context awareness (injury/attendance cross-referencing), nudge personalization (weekly digest variants), hybrid orchestrator (rules + LLM for edge cases), and WhatsApp delivery — all adapted to V3's research-backed constraints (1/week max, task-boundary timing, no gamification).

### The V3.5 Cost of Reintegration

Adding 5 features from V2 costs only **$4.40/month** for 100 coaches. The inline quality feedback alone ($3.20/mo) is the single highest-ROI feature in the entire system.

**The single most important design principle:** The system should help coaches see the **impact** of their balanced attention, not **reward** them for performing it — and help them **improve** their insight quality in the moment it matters most.

---

**Ready for Phase 1 implementation with research-validated, evidence-based, best-of-V2+V3 approach.**
