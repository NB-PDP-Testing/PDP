# Bias Detection & Coach Engagement System - AI-Driven Design

## Executive Summary

This design transforms the rule-based PRD into a **truly AI-agent-driven system** that:
- Uses LLMs to detect nuanced bias patterns (not just hard-coded rules)
- Adapts to individual coach personalities and responds intelligently
- Learns from coach behavior to improve over time
- Provides a seamless, non-intrusive coaching experience

---

## 1. AI AGENT ARCHITECTURE

### Core Philosophy: Multi-Agent System

Instead of hard-coded rules, we use **specialized AI agents** that collaborate:

```
┌─────────────────────────────────────────────────────────┐
│                   ORCHESTRATOR AGENT                    │
│  (Coordinates all agents, makes decisions about when    │
│   and how to engage coaches)                            │
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

### Agent 1: Pattern Detective Agent 🕵️

**Purpose**: Continuously analyzes insight patterns to detect unconscious bias

**How It Works**:
```typescript
// Instead of hard-coded thresholds, the agent uses Claude to analyze patterns
const patternAnalysis = await anthropic.messages.create({
  model: "claude-sonnet-4.5",
  system: `You are a sports psychology expert analyzing coach insight patterns.

  Analyze the following insight data for potential unconscious bias:
  - Frequency patterns (who gets more/fewer insights)
  - Sentiment patterns (consistently positive/negative toward certain players)
  - Depth patterns (detailed vs shallow insights)
  - Category patterns (limited insight types for certain players)

  Consider context like:
  - Player absences, injuries
  - Recent events (matches, tournaments)
  - Team dynamics
  - Sport-specific factors

  Return a structured analysis with:
  1. Detected patterns (with confidence scores)
  2. Potential biases (with severity)
  3. Contextual factors to consider
  4. Recommended actions`,

  messages: [{
    role: "user",
    content: JSON.stringify({
      coachId: "coach_123",
      timeWindow: "30 days",
      insights: [...], // All insights with metadata
      teamContext: {...}, // Team info, recent events
      playerContext: {...} // Player info, attendance, injuries
    })
  }]
});
```

**What Makes This Flexible**:
- ✅ Understands nuance (e.g., "player was injured for 2 weeks, so gap is justified")
- ✅ Detects subtle patterns humans might miss
- ✅ Adapts to different sports and team contexts
- ✅ Can explain its reasoning
- ✅ Improves with prompt engineering (no code changes needed)

**Output Example**:
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
    },
    {
      "type": "sentiment_skew",
      "severity": "medium",
      "confidence": 0.72,
      "description": "Insights about Sarah O'Brien are consistently focused on 'needs improvement' (8/10 insights), while other players receive more balanced feedback",
      "context": "Sarah recently joined the team (3 weeks ago), may still be in evaluation period",
      "recommendation": "Encourage coach to identify and record Sarah's strengths"
    }
  ],
  "overallBalance": {
    "score": 64,
    "assessment": "Moderate imbalance detected",
    "topConcerns": ["Emma Murphy", "Sarah O'Brien", "Niamh Doyle"]
  }
}
```

---

### Agent 2: Prompt Generator Agent 💬

**Purpose**: Creates personalized, contextual prompts for coaches

**How It Works**:
```typescript
// Agent learns coach's personality and adapts tone/style
const promptGeneration = await anthropic.messages.create({
  model: "claude-sonnet-4.5",
  system: `You are a coaching mentor who helps coaches improve their practice.

  Generate a personalized prompt for this coach based on:
  - Their personality profile (tone preferences, response patterns)
  - Current context (recent training session, time of day, workload)
  - The specific bias pattern detected
  - Past prompt effectiveness (what worked, what didn't)

  Principles:
  - Never shame or accuse
  - Focus on player development, not coach failure
  - Provide specific, actionable suggestions
  - Use positive framing
  - Match coach's communication style

  Return 3 prompt variations:
  1. Gentle nudge (low pressure)
  2. Data-driven (facts and metrics)
  3. Contextual story (recent event tie-in)`,

  messages: [{
    role: "user",
    content: JSON.stringify({
      coach: {
        id: "coach_123",
        name: "Michael O'Brien",
        personality: {
          preferredTone: "collaborative", // learned from past interactions
          respondsTo: "data", // responds well to metrics
          avoidsFormality: true,
          usesEmoji: false
        },
        recentActivity: {
          lastLogin: "2 hours ago",
          lastInsight: "4 days ago",
          currentWorkload: "moderate"
        }
      },
      pattern: {
        type: "frequency_imbalance",
        affectedPlayers: ["Emma Murphy"],
        daysSinceLastInsight: 18,
        context: "Training session tomorrow at 6pm"
      },
      promptHistory: {
        lastPromptDate: "12 days ago",
        lastPromptType: "gentle",
        responseTime: "6 hours",
        actionTaken: true
      }
    })
  }]
});
```

**Output Example**:
```json
{
  "variations": [
    {
      "type": "gentle",
      "deliveryTime": "after_next_training",
      "title": "Quick check-in on Emma",
      "message": "Haven't captured any notes on Emma Murphy's progress in a couple weeks. Noticed anything worth recording from recent sessions?",
      "cta": "Add quick note",
      "estimatedResponseRate": 0.75
    },
    {
      "type": "data_driven",
      "deliveryTime": "morning_digest",
      "title": "Team coverage update",
      "message": "You've documented 14/18 players this month (78%). Emma Murphy is one of 4 players without recent notes. Quick update would bring you to 83%.",
      "cta": "View coverage",
      "estimatedResponseRate": 0.68
    },
    {
      "type": "contextual",
      "deliveryTime": "post_training",
      "title": "Tomorrow's session",
      "message": "Tomorrow's training at 6pm - Emma Murphy has been attending consistently but hasn't had a recorded insight since Feb 1st. Keep an eye on her progress?",
      "cta": "Set reminder",
      "estimatedResponseRate": 0.82
    }
  ],
  "recommendation": "Use 'contextual' variant, deliver 30 minutes after tomorrow's training session"
}
```

---

### Agent 3: Learning Agent 🧠

**Purpose**: Learns from coach behavior and continuously improves the system

**How It Works**:
```typescript
// After each coach interaction, the agent analyzes what worked
const learningAnalysis = await anthropic.messages.create({
  model: "claude-sonnet-4.5",
  system: `You are a behavioral analyst studying coach engagement patterns.

  Analyze this coach interaction and extract learnings:
  - What prompt characteristics led to action?
  - What timing worked best?
  - What tone resonated?
  - What didn't work?
  - How can we improve next time?

  Update the coach's personality profile with new insights.
  Identify broader patterns that apply to other coaches.`,

  messages: [{
    role: "user",
    content: JSON.stringify({
      interaction: {
        promptShown: {...},
        coachResponse: {
          actionTaken: true,
          timeToAction: "45 minutes",
          insightCreated: {
            player: "Emma Murphy",
            wordCount: 87,
            sentiment: "encouraging",
            actionability: 0.82
          },
          feedbackProvided: "This was helpful, glad I didn't forget Emma"
        },
        context: {
          timeOfDay: "7:15pm",
          dayOfWeek: "Wednesday",
          promptType: "contextual"
        }
      },
      previousProfile: {
        preferredTone: "collaborative",
        respondsTo: "data",
        bestTimeToPrompt: "unknown"
      }
    })
  }]
});
```

**Output Example**:
```json
{
  "updatedProfile": {
    "preferredTone": "contextual", // Updated based on response
    "respondsTo": "event_driven", // Learned preference
    "bestTimeToPrompt": "post_training", // Identified pattern
    "optimalWindow": "30-60 minutes after training",
    "preferredDeliveryChannel": "in_app",
    "avoidancePatterns": ["early_morning", "monday_morning"]
  },
  "insights": [
    "Coach responds very well to prompts tied to upcoming events",
    "Post-training window (30-60min after) has 85% response rate vs 40% for other times",
    "Coach prefers action-focused language over reflection prompts"
  ],
  "recommendations": [
    "Always tie prompts to specific training sessions for this coach",
    "Avoid generic 'weekly digest' style prompts",
    "Use calendar integration to detect training schedule"
  ],
  "broaderPatterns": [
    "Coaches in this age group (35-45) respond 2x better to contextual prompts than data-driven",
    "GAA coaches show 30% higher engagement with post-training prompts vs pre-training"
  ]
}
```

---

### Agent 4: Orchestrator Agent 🎭

**Purpose**: Coordinates all agents and makes decisions about when/how to engage

**How It Works**:
```typescript
// Runs on a schedule (daily) or triggered by events (new insight created)
const orchestratorDecision = await anthropic.messages.create({
  model: "claude-sonnet-4.5",
  system: `You are a coaching engagement strategist.

  Given:
  - Pattern analysis from Detective Agent
  - Coach personality profile from Learning Agent
  - Current coach context (workload, recent activity, time zones)
  - Platform engagement rules (max 1 prompt/day, respect opt-outs)

  Decide:
  1. Should we prompt this coach now?
  2. If yes, which pattern should we address?
  3. What prompt type should we use?
  4. When should we deliver it?
  5. What delivery channel?

  Balance:
  - Urgency (severe bias vs minor imbalance)
  - Coach receptiveness (not overwhelm them)
  - Timing (right moment for maximum impact)
  - Frequency (avoid alert fatigue)`,

  messages: [{
    role: "user",
    content: JSON.stringify({
      patternAnalysis: {...}, // From Detective Agent
      coachProfile: {...}, // From Learning Agent
      currentContext: {
        coachId: "coach_123",
        lastPromptDate: "4 days ago",
        lastActionDate: "4 days ago",
        currentTime: "2024-02-10T14:30:00Z",
        upcomingEvents: [
          { type: "training", startTime: "2024-02-10T18:00:00Z" }
        ],
        recentActivity: {
          lastLogin: "2 hours ago",
          insightsThisWeek: 3,
          workloadIndicators: "moderate"
        }
      },
      platformRules: {
        maxPromptsPerDay: 1,
        minHoursBetweenPrompts: 24,
        respectQuietHours: true,
        coachOptedOut: false
      }
    })
  }]
});
```

**Output Example**:
```json
{
  "decision": "PROMPT",
  "reasoning": "High-severity pattern detected (Emma 18 days without insight) + coach hasn't been prompted in 4 days + training session in 3.5 hours provides perfect contextual opportunity",
  "promptDetails": {
    "pattern": "frequency_imbalance",
    "players": ["Emma Murphy"],
    "promptType": "contextual",
    "deliveryChannel": "in_app_banner",
    "deliveryTime": "2024-02-10T18:30:00Z", // 30min after training
    "fallbackChannel": "push_notification",
    "expiresAt": "2024-02-12T18:00:00Z"
  },
  "alternativeActions": [
    {
      "action": "WAIT",
      "condition": "If coach creates insight for Emma before training",
      "reasoning": "Pattern would be resolved naturally"
    },
    {
      "action": "ESCALATE",
      "condition": "If no action after 3 prompts",
      "reasoning": "May need different approach or admin notification"
    }
  ],
  "expectedOutcome": {
    "responseRate": 0.82,
    "timeToAction": "45 minutes",
    "insightQuality": "high"
  }
}
```

---

## 2. FRONTEND TOUCHPOINTS & UX FLOWS

### 2.1 Coach Dashboard - Coverage Card (Primary Touchpoint)

**Location**: `/orgs/[orgId]/coach` (main dashboard)

**Component**: `<CoverageCard />`

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
1. **Excellent Coverage** (90-100%) - Green, celebration emoji
2. **Good Coverage** (75-89%) - Blue, encouragement
3. **Needs Attention** (<75%) - Amber, actionable prompts
4. **Critical** (<50%) - Red, urgent prompts

**Interactions**:
- Click player name → Opens quick note modal
- Click [Add Note] → Opens voice/text note capture
- Click [View Heatmap] → Opens full team coverage visualization
- Hover over player → Shows last insight date, quick preview

**Data Source**: `getCoverageMetrics` query from `biasDetection.ts`

---

### 2.2 Coverage Heatmap Modal (Deep Dive)

**Trigger**: Click "View Heatmap" from coverage card

**Component**: `<CoverageHeatmapModal />`

```
┌──────────────────────────────────────────────────────────────┐
│ TEAM COVERAGE HEATMAP - U12 Girls GAA               [X]      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Filter: [All Players ▼] [Last 30 days ▼] [All Categories ▼] │
│                                                              │
│ Sort by: [Days Since Insight ▼]                             │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Player Name        Insights  Last Note   Status   Action│ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ ✅ Aoife Kelly         12    2 days ago   Active  [+]   │ │
│ │ ✅ Ciara Walsh         10    3 days ago   Active  [+]   │ │
│ │ ✅ Maeve Ryan           8    5 days ago   Active  [+]   │ │
│ │ ⚠️  Emma Murphy         2    18 days ago  ⚠️ Quiet [+]  │ │
│ │ ⚠️  Sarah O'Brien       1    19 days ago  ⚠️ Quiet [+]  │ │
│ │ 🚨 Niamh Doyle          0    Never        🚨 None  [+]   │ │
│ │ ...                                                      │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ 📊 Distribution:                                            │
│ Active (7 days): ████████████ 12 players (67%)              │
│ Quiet (7-14):    ████░░░░░░░░  5 players (28%)              │
│ Needs attention: ██░░░░░░░░░░  1 player  (5%)               │
│                                                              │
│ [Export CSV] [Email Report] [Close]                         │
└──────────────────────────────────────────────────────────────┘
```

**Features**:
- **Visual bars** showing insight count per player
- **Status indicators**: ✅ Active, ⚠️ Quiet, 🚨 Needs attention
- **Quick actions**: Click [+] to add note immediately
- **Filtering**: By player, date range, category
- **Sorting**: By name, insights count, last note date
- **Export**: CSV download for offline review

**Interactions**:
- Click player row → Expands to show insight preview
- Click [+] → Opens quick note modal for that player
- Hover over insight count → Shows breakdown by category

---

### 2.3 AI-Powered Prompts (Bottom Sheet)

**Trigger**:
- Orchestrator Agent decides to prompt
- Shown 30-60min after training session
- Or at optimal time based on coach profile

**Component**: `<BiasAlertPrompt />`

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
└─────────────────────────────────────────────────┘
```

**Prompt Types**:

1. **Single Player Prompt** (Gentle)
   - Focus on one player
   - Conversational tone
   - Low pressure

2. **Multiple Players Prompt** (Momentum)
   ```
   ┌─────────────────────────────────────────────────┐
   │ 💪 Almost There!                                │
   │                                                 │
   │ You're at 14/18 players (78%) this month.      │
   │                                                 │
   │ Just 4 quick notes would get you to 100%:      │
   │                                                 │
   │ • Emma Murphy (18 days)        [Add Note]      │
   │ • Sarah O'Brien (19 days)      [Add Note]      │
   │ • Niamh Doyle (22 days)        [Add Note]      │
   │ • Aoife Kelly (28 days)        [Add Note]      │
   │                                                 │
   │ [Add Notes Now] [Later]                        │
   └─────────────────────────────────────────────────┘
   ```

3. **Post-Action Momentum Prompt** (Celebration)
   ```
   ┌─────────────────────────────────────────────────┐
   │ ✅ Great work!                                  │
   │                                                 │
   │ "Emma's ankle fully healed" saved!             │
   │                                                 │
   │ 📊 Team coverage: 15/18 (83%) ↑ from 78%      │
   │                                                 │
   │ 💪 KEEP THE MOMENTUM!                          │
   │                                                 │
   │ 3 more players would get you to 100%:          │
   │ • Sarah O'Brien (19 days)                      │
   │ • Niamh Doyle (22 days)                        │
   │ • Aoife Kelly (28 days)                        │
   │                                                 │
   │ [Continue Adding Notes] [Done for Now]         │
   └─────────────────────────────────────────────────┘
   ```

**Delivery Channels**:
- **In-app banner** (top of dashboard)
- **Bottom sheet** (slides up from bottom)
- **Push notification** (mobile)
- **WhatsApp message** (if enabled)
- **Email digest** (weekly summary)

**Timing Strategy** (AI-Driven):
- Learning Agent determines optimal time per coach
- Default: 30-60min after training
- Respects quiet hours (10pm-8am coach's timezone)
- Max 1 prompt per day
- Min 24 hours between prompts

---

### 2.4 Insight Quality Feedback (Inline)

**Location**: Shown WHILE coach is creating an insight

**Trigger**: Real-time as coach types/speaks

**Component**: `<ActionabilityFeedback />`

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

**How It Works**:
1. Coach creates insight (voice or text)
2. Actionability Agent scores insight (0.0-1.0)
3. If score < 0.6, show inline feedback
4. Provide specific suggestions + examples
5. Coach can apply, edit, or ignore

**Actionability Scoring** (AI-Driven):
```typescript
const actionabilityAnalysis = await anthropic.messages.create({
  model: "claude-sonnet-4.5",
  system: `You are a sports development expert evaluating insight quality.

  Score this insight on:
  1. Specificity (0-1): Is the skill/behavior specific?
  2. Improvement Path (0-1): Clear action for player?
  3. Timeline (0-1): Timeline or urgency indicated?
  4. Success Criteria (0-1): Measurable outcome defined?
  5. Context (0-1): Enough context to understand?

  Calculate overall actionability score (average of 5 dimensions).

  If score < 0.6, provide:
  - What's missing
  - Specific suggestion
  - Example rewrite`,

  messages: [{
    role: "user",
    content: JSON.stringify({
      insight: {
        title: "Tackling improvement",
        description: "Emma did really well today in training. Her tackling has improved a lot.",
        category: "skill_progress",
        player: "Emma Murphy"
      },
      context: {
        sport: "GAA Football",
        ageGroup: "U12",
        previousInsights: [...] // For comparison
      }
    })
  }]
});
```

---

### 2.5 Achievement System (Gamification)

**Location**: Multiple touchpoints

**Component**: `<AchievementModal />`, `<BadgeGallery />`

#### Achievement Modal (Celebration)
```
┌─────────────────────────────────────────────────────┐
│                  🎉 ACHIEVEMENT UNLOCKED!           │
│                                                     │
│                      🏆                             │
│                                                     │
│               ALL-STAR COACH                        │
│                                                     │
│       100% team coverage for 4 weeks straight       │
│                                                     │
│                  +50 points                         │
│                                                     │
│ You're ensuring every player gets the attention    │
│ they deserve. Parents and players appreciate it!   │
│                                                     │
│ [View Badge Gallery] [Continue]                    │
└─────────────────────────────────────────────────────┘
```

#### Badge Gallery
```
┌─────────────────────────────────────────────────────┐
│ YOUR ACHIEVEMENTS                          [X]      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Unlocked (7/15):                                   │
│                                                     │
│ 🥇 ALL-STAR COACH       ✅                         │
│    100% coverage 4 weeks       +50 pts             │
│                                                     │
│ 🎯 TEAM PLAYER          ✅                         │
│    50% coverage first time     +20 pts             │
│                                                     │
│ 📊 DATA MASTER          ✅                         │
│    Used 8+ categories          +30 pts             │
│                                                     │
│ 🔥 CONSISTENT COACH     ✅                         │
│    4-week streak               +40 pts             │
│                                                     │
│ Locked (8/15):                                     │
│                                                     │
│ 🔒 NO ONE LEFT BEHIND                              │
│    Every player < 14 days      +60 pts             │
│    Progress: 14/18 players                         │
│                                                     │
│ 🔒 CENTURY CLUB                                    │
│    100 total insights          +100 pts            │
│    Progress: 67/100 insights                       │
│                                                     │
│ [Share Progress] [Close]                           │
└─────────────────────────────────────────────────────┘
```

**Achievement Triggers**:
- **First Steps**: Log first insight (+10 pts)
- **Team Player**: 50% team coverage (+20 pts)
- **Balanced Coach**: Use 8+ categories (+30 pts)
- **All-Star Coach**: 100% team coverage (+50 pts)
- **Consistent Coach**: 4-week streak (+40 pts)
- **No One Left Behind**: Every player < 14 days (+60 pts)
- **Century Club**: 100 total insights (+100 pts)
- **Quality Master**: Avg actionability > 0.8 (+75 pts)

**Social Features** (Opt-in):
- Leaderboard within organization
- Share achievements on social media
- Compare with org average (anonymized)

---

### 2.6 Weekly Email Digest

**Delivery**: Sunday 6pm (coach's timezone)

**Component**: Email template

```
Subject: Week in Review: U12 Girls GAA Team

───────────────────────────────────────────
📊 THIS WEEK'S STATS
───────────────────────────────────────────

• 8 new insights (↑ from 5 last week) 🔥
• 14/18 players covered (78%)
• Avg actionability: 7.2/10 (↑ from 6.8)
• Current streak: 12 days

───────────────────────────────────────────
🔔 ATTENTION NEEDED
───────────────────────────────────────────

4 players haven't had insights in 14+ days:

• Emma Murphy (18 days)
• Sarah O'Brien (19 days)
• Niamh Doyle (22 days)
• Aoife Kelly (28 days)

[Add Notes Now] →

───────────────────────────────────────────
💡 NEXT WEEK'S GOAL
───────────────────────────────────────────

Just 4 quick notes to hit 100% coverage!

You're 83% toward the "No One Left Behind"
achievement (+60 points)

[View Dashboard] →

───────────────────────────────────────────
🏆 YOUR PROGRESS
───────────────────────────────────────────

Total insights: 67/100 (67% to Century Club)
Team coverage: 78% (↑ 12% from last week)
Quality score: 7.2/10

[View Full Report] →

───────────────────────────────────────────

Prefer less email? [Adjust notification settings]

```

---

### 2.7 Admin Bias Detection Dashboard

**Location**: `/orgs/[orgId]/admin/insights-quality`

**Audience**: Organization admins and platform staff

**Component**: `<BiasDetectionAdminDashboard />`

```
┌────────────────────────────────────────────────────────┐
│ INSIGHTS QUALITY & BIAS DETECTION                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Organization: Grange GAA                              │
│ Period: Last 90 days                                   │
│                                                        │
│ ┌────────────────────────────────────────────────┐   │
│ │ OVERALL METRICS                                 │   │
│ │                                                 │   │
│ │ Total Insights: 1,247                          │   │
│ │ Avg Coverage: 72%                              │   │
│ │ Avg Actionability: 6.8/10                      │   │
│ │ Equity Score (Gini): 0.34 (Good)              │   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
│ ┌────────────────────────────────────────────────┐   │
│ │ COACH PERFORMANCE                               │   │
│ │                                                 │   │
│ │ Coach            Coverage  Balance  Quality     │   │
│ │ ───────────────────────────────────────────── │   │
│ │ Michael O'Brien     89%      92      8.2       │   │
│ │ Sarah Walsh         76%      78      7.1       │   │
│ │ Tom Murphy          45%      52      5.9  ⚠️   │   │
│ │ ...                                            │   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
│ ┌────────────────────────────────────────────────┐   │
│ │ BIAS FLAGS                                      │   │
│ │                                                 │   │
│ │ 🚨 High Severity (2)                           │   │
│ │ ⚠️  Medium Severity (5)                        │   │
│ │ ℹ️  Low Severity (12)                          │   │
│ │                                                 │   │
│ │ [View Details] →                               │   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
│ [Export Report] [Schedule Review]                     │
└────────────────────────────────────────────────────────┘
```

**Features**:
- **Organization-wide metrics**
- **Coach-by-coach breakdown**
- **Bias flag management** (review, dismiss, escalate)
- **Trend analysis** (improving/declining over time)
- **Comparative analytics** (anonymized benchmarking)
- **Export reports** (PDF, CSV)
- **Privacy controls** (admins see aggregates, not raw insights)

---

## 3. PHASED IMPLEMENTATION PLAN

### Phase 1: Foundation (Weeks 1-2) ✅
**Goal**: Basic coverage tracking without AI

**Backend**:
- ✅ Schema extensions (done)
- ✅ Basic queries for coverage metrics (done)
- ⬜ Simple rule-based detection (no LLM yet)
- ⬜ Coverage calculation cron job

**Frontend**:
- ⬜ Coverage card on coach dashboard
- ⬜ Basic heatmap modal
- ⬜ Player list with status indicators

**Success Metric**: Coaches can see their coverage percentage

---

### Phase 2: AI Pattern Detection (Weeks 3-4)
**Goal**: Pattern Detective Agent detects bias using Claude

**Backend**:
- ⬜ Pattern Detective Agent implementation
- ⬜ Anthropic API integration
- ⬜ Structured pattern analysis output
- ⬜ Daily analysis cron job

**Frontend**:
- ⬜ Pattern insights in coverage card
- ⬜ Visual bias indicators
- ⬜ "Why am I seeing this?" explanations

**Success Metric**: System correctly identifies 85%+ of underrepresented players

---

### Phase 3: AI Prompt Generation (Weeks 5-6)
**Goal**: Prompt Generator Agent creates personalized prompts

**Backend**:
- ⬜ Prompt Generator Agent implementation
- ⬜ Coach personality profiling
- ⬜ Multi-variant prompt generation
- ⬜ Delivery timing optimization

**Frontend**:
- ⬜ Bottom sheet prompts
- ⬜ In-app banner prompts
- ⬜ Push notification integration
- ⬜ Prompt dismissal tracking

**Success Metric**: 40%+ prompt response rate

---

### Phase 4: Learning & Adaptation (Weeks 7-8)
**Goal**: Learning Agent improves system over time

**Backend**:
- ⬜ Learning Agent implementation
- ⬜ Interaction tracking and analysis
- ⬜ Coach profile updates
- ⬜ A/B testing framework

**Frontend**:
- ⬜ Feedback capture ("Was this helpful?")
- ⬜ Preference settings
- ⬜ Opt-out controls
- ⬜ Transparency dashboard

**Success Metric**: Response rate improves by 20% over 4 weeks

---

### Phase 5: Quality & Actionability (Weeks 9-10)
**Goal**: Real-time insight quality feedback

**Backend**:
- ⬜ Actionability scoring agent
- ⬜ Sentiment analysis integration
- ⬜ Real-time feedback generation
- ⬜ Quality metrics tracking

**Frontend**:
- ⬜ Inline actionability feedback
- ⬜ Suggestion application
- ⬜ Quality score display
- ⬜ Improvement tips

**Success Metric**: Avg actionability score increases from 6.0 to 7.5+

---

### Phase 6: Gamification & Engagement (Weeks 11-12)
**Goal**: Achievement system and social features

**Backend**:
- ⬜ Achievement tracking
- ⬜ Points and badges system
- ⬜ Leaderboard calculations
- ⬜ Weekly digest generation

**Frontend**:
- ⬜ Achievement modals with animations
- ⬜ Badge gallery
- ⬜ Progress tracking
- ⬜ Weekly email template
- ⬜ Social sharing

**Success Metric**: 70%+ coaches actively use system after 8 weeks

---

### Phase 7: Admin Tools & Analytics (Weeks 13-14)
**Goal**: Organization-wide visibility and controls

**Backend**:
- ⬜ Organization-level aggregation
- ⬜ Bias flag management
- ⬜ Report generation
- ⬜ Privacy controls

**Frontend**:
- ⬜ Admin bias detection dashboard
- ⬜ Coach performance reports
- ⬜ Trend analysis charts
- ⬜ Export functionality

**Success Metric**: Admins can identify and address bias patterns

---

## 4. AI FLEXIBILITY & ADAPTABILITY

### Why This Approach is Flexible

#### 1. **No Hard-Coded Rules**
❌ **Old Way**: `if (daysSinceLastInsight > 14) { createAlert(); }`
✅ **New Way**: AI analyzes context and decides if 14 days is actually a problem

**Example**:
- Player A: 14 days, but was injured → AI understands, no alert
- Player B: 14 days, actively playing → AI flags for attention

#### 2. **Learns from Mistakes**
- If coach dismisses a prompt, Learning Agent analyzes why
- Updates coach profile to avoid similar prompts
- Identifies patterns: "This coach doesn't respond to data-driven prompts"

#### 3. **Adapts to Different Contexts**
- **Sport-specific**: GAA vs Soccer have different norms
- **Age-specific**: U8 vs U16 have different expectations
- **Season-specific**: Pre-season vs championship may have different patterns
- **Event-specific**: Post-tournament may naturally have gaps

#### 4. **Evolves with Feedback**
- Every interaction trains the system
- Prompt templates improve over time
- Detection becomes more nuanced
- False positive rate decreases

#### 5. **Personalizes Per Coach**
- Coach A: Responds to data (show metrics)
- Coach B: Responds to stories (show context)
- Coach C: Responds post-training (timing)
- Coach D: Prefers WhatsApp (channel)

---

## 5. TECHNICAL ARCHITECTURE

### API Flow

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js)                    │
│  - Coverage Card                                        │
│  - Heatmap Modal                                        │
│  - Prompt Bottom Sheets                                 │
│  - Achievement Modals                                   │
└─────────────────────────────────────────────────────────┘
                           │
                           │ useQuery / useMutation
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   CONVEX BACKEND                        │
│                                                         │
│  Queries:                                               │
│  - getCoverageMetrics(coachId, orgId, teamId)          │
│  - getPendingAlerts(coachId)                            │
│  - getPlayerMetrics(coachId)                            │
│                                                         │
│  Mutations:                                             │
│  - acknowledgeAlert(alertId)                            │
│  - dismissAlert(alertId)                                │
│  - createInsight(...)                                   │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Internal Actions
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   AI AGENT LAYER                        │
│                                                         │
│  /agents/patternDetective.ts                           │
│  - analyzePatterns() → Anthropic API                   │
│                                                         │
│  /agents/promptGenerator.ts                            │
│  - generatePrompts() → Anthropic API                   │
│                                                         │
│  /agents/learningAgent.ts                              │
│  - analyzeInteraction() → Anthropic API                │
│  - updateCoachProfile()                                 │
│                                                         │
│  /agents/orchestrator.ts                               │
│  - decideEngagement() → Anthropic API                  │
│  - schedulePrompt()                                     │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Cron Jobs
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   SCHEDULED JOBS                        │
│                                                         │
│  Daily 2 AM UTC:  runPatternDetection()                │
│  Daily 3 AM UTC:  runPromptGeneration()                │
│  Daily 4 AM UTC:  deliverScheduledPrompts()            │
│  Sunday 5 AM UTC: generateWeeklyDigests()              │
│  Sunday 6 AM UTC: updateLearningModels()               │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
Voice Note Created
       │
       ▼
Extract Insights + Sentiment + Actionability (Anthropic)
       │
       ▼
Store in voiceNotes.insights[]
       │
       ├─────────────────┬─────────────────┐
       ▼                 ▼                 ▼
Update Coverage    Trigger Real-Time   Update Quality
   Metrics           Balance Check        Metrics
       │                 │                 │
       └─────────────────┴─────────────────┘
                         │
                         ▼
          Pattern Detective Agent Runs
                         │
                         ▼
             Orchestrator Decides
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
    Prompt Now?                   Wait/Schedule?
           │                           │
           ▼                           ▼
    Prompt Generator            Store for Later
    Creates Variants
           │
           ▼
    Deliver to Coach
           │
           ▼
    Coach Interacts
           │
           ▼
    Learning Agent
    Analyzes Results
           │
           ▼
    Update Coach Profile
```

---

## 6. COST ESTIMATION

### Anthropic API Costs (Claude Sonnet 4.5)

**Per Agent Run**:
- Pattern Detective: ~2,000 tokens input, ~1,500 tokens output = $0.012
- Prompt Generator: ~1,500 tokens input, ~800 tokens output = $0.008
- Learning Agent: ~1,000 tokens input, ~500 tokens output = $0.005
- Orchestrator: ~1,200 tokens input, ~600 tokens output = $0.006

**Daily Cost Per Coach**:
- Pattern analysis: 1x/day = $0.012
- Prompt generation: 0.5x/day avg = $0.004
- Learning: 0.3x/day avg = $0.002
- Orchestrator: 1x/day = $0.006
- **Total: ~$0.024/coach/day**

**Monthly Cost**:
- 100 coaches = $72/month
- 500 coaches = $360/month
- 1,000 coaches = $720/month

**Plus Real-Time Features**:
- Actionability scoring: ~$0.005 per insight
- If 10 insights/coach/week = $0.20/coach/month
- 1,000 coaches = $200/month

**Total Estimated Cost**:
- 1,000 coaches = ~$920/month ($0.92/coach/month)

**Cost Optimization**:
- Use Claude Haiku for simple tasks (3x cheaper)
- Cache system prompts (50% reduction)
- Batch process where possible
- Use Sonnet only for complex analysis

---

## 7. SUCCESS METRICS

### North Star Metrics
1. **Coverage Rate**: % of players with insight in last 14 days
   - Target: 80%+ (from current ~50%)

2. **Insight Equity (Gini)**: Distribution fairness
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

## 8. PRIVACY & ETHICS

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

## 9. OPEN QUESTIONS FOR ITERATION

### 1. Prompt Frequency
**Question**: What's the right balance between engagement and annoyance?

**Options**:
- A) Conservative: Max 1 prompt per week
- B) Moderate: Max 1 prompt per day (current design)
- C) Aggressive: Up to 3 prompts per day

**Testing**: A/B test with 3 cohorts, measure dismissal rate

---

### 2. AI Model Selection
**Question**: Which LLM for which task?

**Options**:
- Pattern Detection: Claude Sonnet 4.5 vs Opus 4.6
- Prompt Generation: Claude Sonnet vs Haiku
- Actionability: Claude vs GPT-4o

**Testing**: Compare accuracy, cost, latency

---

### 3. Gamification Intensity
**Question**: How much gamification is too much?

**Options**:
- A) Subtle: Just coverage %, no badges
- B) Moderate: Achievements + badges (current design)
- C) Full: Achievements + leaderboards + competitions

**Testing**: Survey coaches, measure engagement vs burnout

---

### 4. Admin Escalation
**Question**: When should admins be notified about coach bias?

**Options**:
- A) Never (coach improvement is private)
- B) Only extreme cases (bias score > 0.8 AND persistent 4+ weeks)
- C) Moderate cases (bias score > 0.6)

**Testing**: Interview admins about preferred approach

---

### 5. Prompt Tone
**Question**: What tone works best for majority of coaches?

**Options**:
- A) Gentle peer: "Haven't heard about Emma lately..."
- B) Data-driven: "Emma is in bottom 10% for coverage..."
- C) Contextual storyteller: "After Tuesday's match, you noted 5 players but not Emma..."

**Testing**: A/B test tones, measure response rates

---

## 10. NEXT STEPS

### Immediate Actions (This Week)
1. **Design Review**: Review this document with Neil and Ralph
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
5. **Schema Review**: Finalize database schema
6. **Phase 1 Implementation**: Start with basic coverage tracking

### Medium-Term (Next 4 Weeks)
7. **AI Agent Development**: Build Pattern Detective + Prompt Generator
8. **Frontend Development**: Implement coverage card + heatmap
9. **Alpha Testing**: Deploy to Grange GAA (5 coaches)

---

## SUMMARY

This design creates a **truly AI-agent-driven system** that:

✅ **Flexible**: AI understands context, not rigid rules
✅ **Intelligent**: Learns from coach behavior over time
✅ **Non-Intrusive**: Respects coach preferences and workload
✅ **Effective**: Data-driven prompts at optimal times
✅ **Ethical**: Privacy-preserving, transparent, non-punitive
✅ **Engaging**: Gamification without overwhelming
✅ **Scalable**: Works for 10 coaches or 10,000 coaches

The system ensures **every player develops** and **every coach improves**, using AI to detect patterns, generate personalized prompts, and continuously learn from interactions.

---

**Questions? Concerns? Ideas?** Let's discuss and iterate!
