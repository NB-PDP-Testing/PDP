# Coaching Coverage & Calibration — Technical Architecture (V3.5)

> **Status:** Design Review
> **Author:** Claude Opus + Neil
> **Version:** V3.5 (V2 reintegration: inline feedback, nudge personalization, context awareness, hybrid orchestrator, WhatsApp delivery)
> **Related:** [V3.5 Plan](./coach-bias-detection-v3-updated-plan.md) | [GitHub Issue #454](https://github.com/NB-PDP-Testing/PDP/issues/454)
> **Frontend Mockups:** `/orgs/[orgId]/coach/coverage-calibration`

---

## 1. SYSTEM OVERVIEW

### Purpose
Measure and surface coaching attention distribution across a squad — both frequency and quality — so coaches can self-correct unconscious coverage gaps. The system is advisory-only, coach-private, and opt-out at every level. V3.5 adds **active coaching** (inline quality feedback), **context-aware analysis**, **personalized delivery**, and **WhatsApp channel**.

### High-Level Data Flow

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          EXISTING PIPELINE                                 │
│                                                                            │
│  Coach Voice Note ──→ Transcription ──→ Insight Extraction ──→ Storage    │
│                                                                            │
└──────────────────────────┬──────────────────────┬────────────────────────┘
                           │                      │
                    (post-save)              (during creation)
                           │                      │
                           ▼                      ▼
┌───────────────────────────────────┐  ┌──────────────────────────────────┐
│   COVERAGE PIPELINE               │  │   V3.5: INLINE QUALITY FEEDBACK   │
│   (Post-Processing)               │  │   (Real-Time)                    │
│                                    │  │                                  │
│  ┌──────────┐  ┌──────────┐       │  │  Insight text → Quality Scorer   │
│  │ Quality  │  │ Coverage │       │  │       │                          │
│  │ Scorer   │──│ Analyzer │       │  │       ▼                          │
│  │(per-note)│  │(+Context │       │  │  Score < 70? → Show suggestions  │
│  │          │  │ Aware)   │       │  │       │                          │
│  └──────────┘  └──────────┘       │  │  [Apply] [Edit] [Keep As-Is]    │
│       │              │             │  │                                  │
│       ▼              ▼             │  └──────────────────────────────────┘
│  qualityScores  coverageSnapshots  │
│       │                            │
│       ▼                            │
│  ┌──────────┐  ┌──────────┐       │
│  │ Learning │  │ Prompt   │       │
│  │  Agent   │  │Generator │       │
│  │(per-coach│  │(weekly   │       │
│  │ monthly) │  │ digest)  │       │
│  └──────────┘  └──────────┘       │
│       │              │             │
│       ▼              ▼             │
│  coachProfiles  personalizedDigest │
└──────────────────┬─────────────────┘
                   │
                   ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                   HYBRID ORCHESTRATOR (Rules + LLM Escalation)             │
│                                                                            │
│  Rules (90%): Max 1 push/week │ Task-boundary │ Ambient │ Digest          │
│  LLM (10%):  Edge cases (onboarding, inactive, conflicting signals)       │
│                                                                            │
└──────────────────────────────────────┬────────────────────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                        ▼
       ┌──────────┐            ┌──────────┐            ┌──────────┐
       │  Coach   │            │  Admin   │            │ WhatsApp │
       │Dashboard │            │Calibrate │            │ Digest   │
       │(Ambient) │            │(Aggreg.) │            │(Twilio)  │
       │+Inline   │            │          │            │          │
       │Feedback  │            │          │            │          │
       └──────────┘            └──────────┘            └──────────┘
```

---

## 2. CONVEX SCHEMA DESIGN

### New Tables

```typescript
// packages/backend/convex/schema.ts

// ── Quality Scores (per insight) ────────────────────────
insightQualityScores: defineTable({
  insightId: v.id("voiceNoteInsights"),        // FK to existing insights table
  organizationId: v.id("organization"),
  coachUserId: v.id("user"),
  playerId: v.id("orgPlayerEnrollments"),

  // 6 quality dimensions (1-5 scale)
  specificity: v.number(),
  actionability: v.number(),
  observationalDepth: v.number(),
  developmentalOrientation: v.number(),
  constructiveBalance: v.number(),
  playerCentricity: v.number(),

  // Composite scores
  compositeQuality: v.number(),               // 0-100 weighted composite
  scoringTier: v.union(
    v.literal("heuristic"),
    v.literal("nlp"),
    v.literal("llm")
  ),
  scoringModel: v.optional(v.string()),       // e.g. "claude-haiku-4-5" if LLM-scored

  // Metadata
  insightWordCount: v.number(),
  insightCategory: v.string(),
  scoredAt: v.number(),                       // timestamp
})
  .index("by_orgId", ["organizationId"])
  .index("by_coachUserId_and_orgId", ["coachUserId", "organizationId"])
  .index("by_playerId_and_orgId", ["playerId", "organizationId"])
  .index("by_insightId", ["insightId"]),

// ── Coverage Snapshots (weekly per coach per team) ──────
coverageSnapshots: defineTable({
  organizationId: v.id("organization"),
  coachUserId: v.id("user"),
  teamName: v.string(),                       // or teamId if we have teams table

  // Snapshot period
  periodStart: v.number(),                    // epoch ms (Monday 00:00)
  periodEnd: v.number(),                      // epoch ms (Sunday 23:59)

  // Coverage metrics
  totalPlayers: v.number(),
  playersWithInsight: v.number(),
  coverageRate: v.number(),                   // 0-100

  // Distribution metrics
  giniCoefficient: v.number(),                // 0-1
  hhi: v.number(),                            // Herfindahl-Hirschman Index
  normalizedHhi: v.number(),                  // 0-1 scale
  attentionBalance: v.number(),               // 0-100 composite

  // Quality metrics
  avgQwas: v.number(),                        // avg quality-weighted attention score
  qwasCoeffOfVariation: v.number(),           // disparity measure
  surfaceInsightPct: v.number(),              // % of insights scoring < 30

  // RAE metrics (optional)
  raeQ1Pct: v.optional(v.number()),           // % attention to Q1 players
  raeQ2Pct: v.optional(v.number()),
  raeQ3Pct: v.optional(v.number()),
  raeQ4Pct: v.optional(v.number()),
  raeCramersV: v.optional(v.number()),        // statistical significance

  // Per-player breakdown (denormalized for fast reads)
  playerBreakdown: v.array(v.object({
    playerId: v.id("orgPlayerEnrollments"),
    playerName: v.string(),
    insightCount: v.number(),
    avgQuality: v.number(),
    qwas: v.number(),
    daysSinceLastInsight: v.number(),
    birthQuarter: v.optional(v.string()),
    zScore: v.number(),                       // deviation from squad mean
    status: v.union(
      v.literal("active"),
      v.literal("quiet"),
      v.literal("none")
    ),
  })),

  createdAt: v.number(),
})
  .index("by_coachUserId_and_orgId", ["coachUserId", "organizationId"])
  .index("by_orgId_and_periodStart", ["organizationId", "periodStart"])
  .index("by_coachUserId_and_periodStart", ["coachUserId", "periodStart"]),

// ── Coach Coverage Profiles (learning agent data) ───────
coachCoverageProfiles: defineTable({
  organizationId: v.id("organization"),
  coachUserId: v.id("user"),

  // Nudge preferences (learned)
  preferredNudgeTiming: v.optional(v.string()),   // "post_training" | "morning" | "evening"
  nudgeResponseRate: v.number(),                  // 0-1
  dismissalCount: v.number(),
  consecutiveDismissals: v.number(),

  // Behavioral archetype (from k-means clustering)
  archetype: v.optional(v.union(
    v.literal("proactive"),
    v.literal("responsive"),
    v.literal("periodic"),
    v.literal("reactive"),
    v.literal("minimal")
  )),

  // Self-set goals
  goals: v.optional(v.array(v.object({
    text: v.string(),
    targetValue: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    createdAt: v.number(),
  }))),

  // Digest preferences
  digestDay: v.optional(v.string()),              // "sunday" | "monday" etc
  digestTime: v.optional(v.string()),             // "09:00"
  digestEnabled: v.boolean(),

  // Feature opt-outs (granular)
  optOuts: v.object({
    coverageTracking: v.boolean(),
    qualityScoring: v.boolean(),
    nudges: v.boolean(),
    weeklyDigest: v.boolean(),
    raeOverlay: v.boolean(),
    parentSurveys: v.boolean(),
  }),

  // Self-assessment history
  lastSelfAssessment: v.optional(v.object({
    date: v.number(),
    balanceRating: v.number(),                    // 1-5
  })),

  updatedAt: v.number(),
})
  .index("by_coachUserId_and_orgId", ["coachUserId", "organizationId"])
  .index("by_orgId", ["organizationId"]),

// ── Nudge Events (tracking) ─────────────────────────────
coverageNudgeEvents: defineTable({
  organizationId: v.id("organization"),
  coachUserId: v.id("user"),

  nudgeType: v.union(
    v.literal("post_insight"),
    v.literal("suggested_player"),
    v.literal("weekly_digest"),
    v.literal("ambient_indicator")
  ),

  // What was suggested
  suggestedPlayerIds: v.optional(v.array(v.id("orgPlayerEnrollments"))),
  suggestedPlayerNames: v.optional(v.array(v.string())),

  // Outcome
  outcome: v.union(
    v.literal("acted"),          // Coach created an insight
    v.literal("dismissed"),      // Coach dismissed
    v.literal("ignored"),        // No interaction within 24h
    v.literal("opted_out")       // Coach disabled nudges
  ),
  timeToAction: v.optional(v.number()),   // ms from nudge to action

  createdAt: v.number(),
})
  .index("by_coachUserId_and_orgId", ["coachUserId", "organizationId"])
  .index("by_coachUserId_and_createdAt", ["coachUserId", "createdAt"]),
```

// ── V3.5: Inline Quality Feedback Events ──────────────────
inlineQualityFeedbackEvents: defineTable({
  organizationId: v.id("organization"),
  coachUserId: v.id("user"),
  insightId: v.optional(v.id("voiceNoteInsights")),

  // What was suggested
  originalQualityScore: v.number(),            // Score before feedback
  weakDimensions: v.array(v.string()),         // e.g. ["specificity", "actionability"]
  suggestionType: v.union(
    v.literal("template"),                     // Template-based (free)
    v.literal("llm")                           // LLM-generated (paid)
  ),
  suggestionText: v.string(),

  // Coach response
  outcome: v.union(
    v.literal("applied"),                      // Coach accepted suggestion
    v.literal("edited"),                       // Coach edited manually
    v.literal("kept_as_is")                    // Coach declined
  ),
  resultingQualityScore: v.optional(v.number()), // Score after applying/editing

  createdAt: v.number(),
})
  .index("by_coachUserId_and_orgId", ["coachUserId", "organizationId"])
  .index("by_coachUserId_and_createdAt", ["coachUserId", "createdAt"]),

// ── V3.5: Digest Delivery Tracking ───────────────────────
coverageDigestDeliveries: defineTable({
  organizationId: v.id("organization"),
  coachUserId: v.id("user"),

  // Delivery details
  channel: v.union(
    v.literal("in_app"),
    v.literal("push"),
    v.literal("whatsapp"),
    v.literal("email")
  ),
  personalizedText: v.string(),
  whatsappShortText: v.optional(v.string()),   // < 160 chars for WhatsApp

  // Engagement tracking
  delivered: v.boolean(),
  opened: v.optional(v.boolean()),
  clickedThrough: v.optional(v.boolean()),
  deliveryError: v.optional(v.string()),

  weekOf: v.number(),                          // epoch ms (start of week)
  createdAt: v.number(),
})
  .index("by_coachUserId_and_orgId", ["coachUserId", "organizationId"])
  .index("by_coachUserId_and_weekOf", ["coachUserId", "weekOf"]),
```

### Existing Tables Modified

```typescript
// voiceNoteInsights — add optional quality score reference
// (NO schema change needed if we use a separate table with FK)

// orgPlayerEnrollments — already has dateOfBirth for RAE
// (NO schema change needed)

// coachCoverageProfiles — V3.5 additions:
// Add to existing schema:
//   preferredTone: v.optional(v.string()),       // "collaborative" | "data_driven" | "contextual"
//   whatsappOptIn: v.boolean(),                  // explicit opt-in for WhatsApp digest
//   digestChannels: v.object({                   // multi-channel preferences
//     inApp: v.boolean(),
//     push: v.boolean(),
//     whatsapp: v.boolean(),
//     email: v.boolean(),
//   }),
//   inlineQualityFeedbackEnabled: v.boolean(),   // can disable inline suggestions
```

---

## 3. AGENT PIPELINE ARCHITECTURE

### Agent 1: Quality Scorer

**Trigger:** Post-processing hook after insight extraction completes
**Location:** `packages/backend/convex/actions/qualityScoring.ts`

```
Insight Created
     │
     ▼
┌─────────────────────────────────────────────────┐
│              TIER 1: HEURISTIC RULES             │
│                                                   │
│  Word count < 15        → compositeQuality = 15   │
│  Category = "attendance" → skip (N/A)             │
│  Category = "todo"      → playerCentricity = 1    │
│  Contains numbers       → specificity += 1        │
│  Contains skill names   → specificity += 1        │
│  Contains drill refs    → observationalDepth += 1  │
│                                                   │
│  If ALL dimensions scored → DONE (Tier 1)         │
│  Else → escalate to Tier 2                        │
└─────────────────────┬───────────────────────────┘
                      │ ~35% complete here
                      ▼
┌─────────────────────────────────────────────────┐
│              TIER 2: LIGHTWEIGHT NLP             │
│                                                   │
│  Sports sentiment lexicon (custom VADER-style)    │
│  Fixed vs growth mindset patterns                 │
│    "she's a natural" → developmentalOrientation=1 │
│    "she's developing" → developmentalOrientation=4│
│  Structural depth (observation+analysis+evidence) │
│  Actionability verb detection ("focus on", "work  │
│    on", "practice", "improve")                    │
│                                                   │
│  If confidence > 0.7 → DONE (Tier 2)            │
│  Else → escalate to Tier 3                        │
└─────────────────────┬───────────────────────────┘
                      │ ~60% complete here
                      ▼
┌─────────────────────────────────────────────────┐
│              TIER 3: LLM SCORING                 │
│                                                   │
│  Model: Claude Haiku (budget) / Sonnet (standard) │
│  Input: insight text + player context              │
│  Output: structured 6-dimension scores             │
│  Uses tool_use for reliable structured output      │
│                                                   │
│  Async via Convex action + scheduler               │
└─────────────────────────────────────────────────┘
                      │ 100% complete here
                      ▼
               Store in insightQualityScores
```

**Implementation Pattern:**

```typescript
// packages/backend/convex/actions/qualityScoring.ts

export const scoreInsightQuality = internalAction({
  args: {
    insightId: v.id("voiceNoteInsights"),
  },
  handler: async (ctx, args) => {
    const insight = await ctx.runQuery(
      internal.models.voiceNoteInsights.getById,
      { insightId: args.insightId }
    );
    if (!insight) return;

    // Tier 1: Heuristic scoring
    const heuristicResult = applyHeuristicRules(insight);
    if (heuristicResult.confident) {
      await ctx.runMutation(internal.models.insightQualityScores.create, {
        ...heuristicResult.scores,
        insightId: args.insightId,
        scoringTier: "heuristic",
      });
      return;
    }

    // Tier 2: NLP scoring
    const nlpResult = applyNlpScoring(insight, heuristicResult.partial);
    if (nlpResult.confident) {
      await ctx.runMutation(internal.models.insightQualityScores.create, {
        ...nlpResult.scores,
        insightId: args.insightId,
        scoringTier: "nlp",
      });
      return;
    }

    // Tier 3: LLM scoring (async)
    const llmScores = await scorWithLlm(insight);
    await ctx.runMutation(internal.models.insightQualityScores.create, {
      ...llmScores,
      insightId: args.insightId,
      scoringTier: "llm",
      scoringModel: "claude-haiku-4-5",
    });
  },
});
```

### Agent 2: Coverage Analyzer

**Trigger:** Weekly cron job (configurable, default Sunday midnight)
**Location:** `packages/backend/convex/actions/coverageAnalyzer.ts`

```
Weekly Cron Trigger
     │
     ▼
┌─────────────────────────────────────────────────────┐
│           PER-COACH COVERAGE COMPUTATION             │
│                                                       │
│  1. Fetch all insights for coach in last 30 days     │
│  2. Fetch all enrolled players for coach's teams      │
│  3. Fetch quality scores for those insights           │
│  4. Fetch player DOBs for RAE computation             │
│                                                       │
│  COMPUTE (all deterministic, zero LLM cost):          │
│  ├── Per-player insight count + recency               │
│  ├── Per-player QWAS (quality × length × recency)     │
│  ├── Gini coefficient                                 │
│  ├── HHI and normalized HHI                           │
│  ├── Per-player z-scores                              │
│  ├── RAE correlation (chi-square + Cramer's V)        │
│  ├── Coverage rate (% players with any insight)        │
│  └── Composite Coaching Coverage Score                 │
│                                                       │
│  STORE → coverageSnapshots table                       │
└─────────────────────────────────────────────────────┘
```

**Key Computations:**

```typescript
// Gini Coefficient
function computeGini(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  if (mean === 0) return 0;

  let numerator = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      numerator += Math.abs(sorted[i] - sorted[j]);
    }
  }
  return numerator / (2 * n * n * mean);
}

// HHI (Herfindahl-Hirschman Index)
function computeHhi(shares: number[]): number {
  return shares.reduce((sum, share) => sum + share * share, 0);
}

// Normalized HHI (0-1 scale)
function normalizeHhi(hhi: number, n: number): number {
  if (n <= 1) return 0;
  return (hhi - 1 / n) / (1 - 1 / n);
}

// Per-player z-score
function computeZScores(values: number[]): number[] {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  );
  if (std === 0) return values.map(() => 0);
  return values.map((v) => (v - mean) / std);
}

// QWAS per player
function computeQwas(
  qualityScore: number,   // 0-100
  wordCount: number,
  daysSinceNote: number,
  category: string
): number {
  const lengthFactor = Math.min(wordCount / 200, 1) * 0.7 + 0.3;
  const recencyFactor = Math.max(1 - daysSinceNote / 30, 0) * 0.3 + 0.7;
  const categoryFactor = getCategoryWeight(category);
  return qualityScore * lengthFactor * recencyFactor * categoryFactor;
}
```

### Agent 3: Learning Agent

**Trigger:** After each nudge event outcome is recorded
**Location:** `packages/backend/convex/models/coachCoverageProfiles.ts`

```
Nudge Event (acted / dismissed / ignored)
     │
     ▼
┌─────────────────────────────────────────────────────┐
│               PROFILE UPDATE (Rule-Based)             │
│                                                       │
│  1. Update nudgeResponseRate (rolling 30-day average) │
│  2. Track dismissalCount / consecutiveDismissals      │
│  3. Update preferredNudgeTiming (mode of acted times) │
│  4. Apply progressive reduction rules:                │
│     - 3 consecutive dismissals → reduce by 50%        │
│     - 5+ dismissals → suggest opt-out                 │
│                                                       │
│  Monthly: Run k-means clustering for archetypes       │
│  (via Convex action with LLM, ~$5/month for 100)     │
└─────────────────────────────────────────────────────┘
```

---

## 4. HYBRID ORCHESTRATOR (V3.5 — Rules + LLM Escalation)

**Primarily rules-based (90%).** LLM handles edge cases only (10%).

```typescript
// packages/backend/convex/lib/coverageOrchestrator.ts

interface NudgeDecision {
  shouldNudge: boolean;
  nudgeType: "post_insight" | "suggested_player" | "weekly_digest";
  reason?: string;
}

function shouldNudgeCoach(
  profile: CoachCoverageProfile,
  lastNudgeEvent: NudgeEvent | null,
  context: { eventType: string; currentTime: number }
): NudgeDecision {
  // Rule 1: Respect opt-outs
  if (profile.optOuts.nudges) {
    return { shouldNudge: false };
  }

  // Rule 2: Max 1 push per week
  if (lastNudgeEvent) {
    const daysSinceLastNudge =
      (context.currentTime - lastNudgeEvent.createdAt) / (1000 * 60 * 60 * 24);
    if (daysSinceLastNudge < 7 && context.eventType !== "post_insight") {
      return { shouldNudge: false };
    }
  }

  // Rule 3: Progressive reduction
  if (profile.consecutiveDismissals >= 3) {
    // Only nudge every 2 weeks
    if (lastNudgeEvent) {
      const daysSince =
        (context.currentTime - lastNudgeEvent.createdAt) / (1000 * 60 * 60 * 24);
      if (daysSince < 14) {
        return { shouldNudge: false };
      }
    }
  }

  // Rule 4: Task-boundary nudges (post_insight) are always OK
  // within session limits (max 1 per session)
  if (context.eventType === "post_insight") {
    return {
      shouldNudge: true,
      nudgeType: "post_insight",
      reason: "task_boundary",
    };
  }

  // Rule 5: Weekly digest at configured time
  if (context.eventType === "weekly_cron") {
    if (profile.digestEnabled) {
      return {
        shouldNudge: true,
        nudgeType: "weekly_digest",
        reason: "scheduled_digest",
      };
    }
  }

  return { shouldNudge: false };
}

// V3.5: LLM Escalation for edge cases
async function handleEdgeCase(
  profile: CoachCoverageProfile,
  context: OrchestratorContext
): Promise<NudgeDecision> {
  // Only called when rules engine encounters ambiguity
  const shouldEscalate =
    // Coach inactive 14+ days but has valid reasons
    (context.daysSinceLastLogin > 14 && context.hasRecentInjuryEvents) ||
    // Coverage changed dramatically
    Math.abs(context.coverageChangePercent) > 30 ||
    // New coach (first 2 weeks — need careful calibration)
    context.daysOnPlatform < 14 ||
    // Multiple conflicting signals
    context.conflictingSignals.length > 2;

  if (!shouldEscalate) return { shouldNudge: false };

  // LLM decides (Claude Haiku for speed/cost)
  const decision = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    system: `Decide whether to nudge this coach given ambiguous context.
      Return JSON: { shouldNudge: boolean, reason: string, nudgeType: string }`,
    messages: [{ role: "user", content: JSON.stringify(context) }],
  });
  return parseDecision(decision);
}
```

### V3.5: Prompt Generator Agent

```typescript
// packages/backend/convex/actions/promptGenerator.ts

// Runs once per coach per week — personalizes weekly digest text
export const generatePersonalizedDigest = internalAction({
  args: {
    coachUserId: v.id("user"),
    organizationId: v.id("organization"),
    weeklyData: v.object({
      insightsThisWeek: v.number(),
      playersAssessed: v.number(),
      totalPlayers: v.number(),
      coverageRate: v.number(),
      suggestedPlayers: v.array(v.object({
        name: v.string(),
        daysSinceLastInsight: v.number(),
        contextNote: v.optional(v.string()), // "returned from injury"
      })),
    }),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.runQuery(
      internal.models.coachCoverageProfiles.getByCoachAndOrg,
      { coachUserId: args.coachUserId, organizationId: args.organizationId }
    );

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      system: `Personalize a weekly coaching coverage digest.
        Coach archetype: ${profile?.archetype ?? "responsive"}
        Preferred tone: ${profile?.preferredTone ?? "collaborative"}
        Generate two versions:
        1. "full": For in-app/email (2-3 sentences, warm, progress-focused)
        2. "whatsapp": For WhatsApp (< 160 chars, concise, include one suggested player)
        Return JSON: { full: string, whatsapp: string }`,
      messages: [{ role: "user", content: JSON.stringify(args.weeklyData) }],
    });

    return parseDigestResponse(response);
  },
});
```

### V3.5: Context-Aware Coverage Analysis

```typescript
// packages/backend/convex/lib/contextAwareCoverage.ts

interface ContextAdjustment {
  playerId: Id<"orgPlayerEnrollments">;
  reason: string;
  adjustedExpectedCoverage: number; // 0-1, where 1 = full expected coverage
}

export async function getContextAdjustments(
  ctx: QueryCtx,
  teamId: string,
  playerIds: Id<"orgPlayerEnrollments">[],
  windowDays: number
): Promise<Map<string, ContextAdjustment>> {
  const adjustments = new Map<string, ContextAdjustment>();
  const now = Date.now();
  const windowStart = now - windowDays * 24 * 60 * 60 * 1000;

  // 1. Check injury records
  const injuries = await ctx.db
    .query("injuryRecords")
    .withIndex("by_orgId_and_status", (q) =>
      q.eq("organizationId", orgId)
    )
    .collect();

  for (const injury of injuries) {
    if (playerIds.includes(injury.playerId)) {
      if (injury.status === "active") {
        adjustments.set(injury.playerId, {
          playerId: injury.playerId,
          reason: `Injured since ${formatDate(injury.startDate)}`,
          adjustedExpectedCoverage: 0, // Don't expect coverage for injured players
        });
      } else if (injury.status === "recovered" &&
        injury.recoveryDate && injury.recoveryDate > windowStart) {
        adjustments.set(injury.playerId, {
          playerId: injury.playerId,
          reason: `Returned from injury ${formatDate(injury.recoveryDate)}`,
          adjustedExpectedCoverage: 1.5, // Higher priority — check in on return
        });
      }
    }
  }

  // 2. Check enrollment dates (grace period for new players)
  for (const playerId of playerIds) {
    const enrollment = await ctx.db.get(playerId);
    if (enrollment && now - enrollment._creationTime < 7 * 24 * 60 * 60 * 1000) {
      adjustments.set(playerId, {
        playerId,
        reason: "New to team (< 7 days)",
        adjustedExpectedCoverage: 0,
      });
    }
  }

  return adjustments;
}
```

### V3.5: WhatsApp Digest Delivery

```typescript
// packages/backend/convex/actions/coverageDigest.ts
// Integrates with existing WhatsApp infrastructure

import { sendWhatsAppMessage } from "./whatsapp";

export const deliverWeeklyDigest = internalAction({
  handler: async (ctx) => {
    const coaches = await ctx.runQuery(
      internal.models.coachCoverageProfiles.getDigestEnabledCoaches
    );

    for (const coach of coaches) {
      const weeklyData = await computeWeeklyDigest(ctx, coach);
      const personalizedText = await ctx.runAction(
        internal.actions.promptGenerator.generatePersonalizedDigest,
        { coachUserId: coach.coachUserId, organizationId: coach.organizationId, weeklyData }
      );

      // Deliver to each opted-in channel
      const channels = coach.digestChannels ?? { inApp: true, push: true, whatsapp: false, email: false };

      if (channels.whatsapp && coach.phoneNumber) {
        try {
          await sendWhatsAppMessage(coach.phoneNumber, personalizedText.whatsapp);
          await ctx.runMutation(internal.models.coverageDigestDeliveries.create, {
            coachUserId: coach.coachUserId,
            organizationId: coach.organizationId,
            channel: "whatsapp",
            personalizedText: personalizedText.full,
            whatsappShortText: personalizedText.whatsapp,
            delivered: true,
            weekOf: getWeekStart(),
          });
        } catch (error) {
          await ctx.runMutation(internal.models.coverageDigestDeliveries.create, {
            // ... same as above but delivered: false, deliveryError: error.message
          });
        }
      }

      // ... similar for in_app, push, email channels
    }
  },
});
```

---

## 5. API CONTRACTS

### Queries (Frontend → Backend)

```typescript
// packages/backend/convex/models/coverageAnalytics.ts

// Get latest coverage snapshot for coach
export const getLatestCoverage = query({
  args: {
    organizationId: v.id("organization"),
    teamName: v.optional(v.string()),
  },
  returns: v.union(v.object({ /* CoverageSnapshot shape */ }), v.null()),
  handler: async (ctx, args) => {
    // Auth: only the coach themselves can see their data
    // Returns latest coverageSnapshot for this coach
  },
});

// Get coverage history (for trend charts)
export const getCoverageHistory = query({
  args: {
    organizationId: v.id("organization"),
    weeks: v.optional(v.number()),   // default 12
  },
  returns: v.array(v.object({ /* snapshot summary */ })),
  handler: async (ctx, args) => {
    // Returns array of weekly snapshots for trend visualization
  },
});

// Get coach coverage profile (goals, preferences)
export const getCoachProfile = query({
  args: {
    organizationId: v.id("organization"),
  },
  returns: v.union(v.object({ /* CoachCoverageProfile shape */ }), v.null()),
  handler: async (ctx, args) => {
    // Auth: coach-only
  },
});

// Admin: Get org-wide calibration data (aggregates only)
export const getOrgCalibration = query({
  args: {
    organizationId: v.id("organization"),
  },
  returns: v.object({
    teams: v.array(v.object({
      teamName: v.string(),
      coachName: v.string(),
      coverageRate: v.number(),
      avgQuality: v.number(),
      trend: v.string(),
    })),
    orgAvgCoverage: v.number(),
    orgAvgQuality: v.number(),
    playersWithZeroInsights: v.number(),
  }),
  handler: async (ctx, args) => {
    // Auth: admin/owner only
    // Individual insights are NOT exposed — only aggregate metrics
  },
});
```

### Mutations (Frontend → Backend)

```typescript
// Update coach goals
export const setCoachGoals = mutation({
  args: {
    organizationId: v.id("organization"),
    goals: v.array(v.object({
      text: v.string(),
      targetValue: v.optional(v.number()),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => { /* ... */ },
});

// Update digest preferences
export const setDigestPreferences = mutation({
  args: {
    organizationId: v.id("organization"),
    digestDay: v.string(),
    digestTime: v.string(),
    digestEnabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => { /* ... */ },
});

// Update feature opt-outs
export const setOptOuts = mutation({
  args: {
    organizationId: v.id("organization"),
    optOuts: v.object({
      coverageTracking: v.boolean(),
      qualityScoring: v.boolean(),
      nudges: v.boolean(),
      weeklyDigest: v.boolean(),
      raeOverlay: v.boolean(),
      parentSurveys: v.boolean(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => { /* ... */ },
});

// Record nudge outcome
export const recordNudgeOutcome = mutation({
  args: {
    organizationId: v.id("organization"),
    nudgeEventId: v.id("coverageNudgeEvents"),
    outcome: v.union(
      v.literal("acted"),
      v.literal("dismissed"),
      v.literal("ignored"),
      v.literal("opted_out")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => { /* ... */ },
});

// Coach self-assessment
export const submitSelfAssessment = mutation({
  args: {
    organizationId: v.id("organization"),
    balanceRating: v.number(),   // 1-5
  },
  returns: v.null(),
  handler: async (ctx, args) => { /* ... */ },
});

// V3.5: Score insight quality inline (for real-time feedback)
export const getInlineQualityFeedback = action({
  args: {
    organizationId: v.id("organization"),
    insightText: v.string(),
    category: v.string(),
    sport: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
  },
  returns: v.object({
    qualityScore: v.number(),
    weakDimensions: v.array(v.string()),
    suggestion: v.optional(v.string()),
    exampleRewrite: v.optional(v.string()),
    predictedScoreAfterApplying: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    // Tier 1 → 2 → 3 scoring, return feedback if score < 70
  },
});

// V3.5: Record inline feedback outcome
export const recordInlineQualityOutcome = mutation({
  args: {
    organizationId: v.id("organization"),
    insightId: v.optional(v.id("voiceNoteInsights")),
    originalQualityScore: v.number(),
    outcome: v.union(v.literal("applied"), v.literal("edited"), v.literal("kept_as_is")),
    resultingQualityScore: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => { /* ... */ },
});

// V3.5: Update digest channel preferences
export const setDigestChannels = mutation({
  args: {
    organizationId: v.id("organization"),
    channels: v.object({
      inApp: v.boolean(),
      push: v.boolean(),
      whatsapp: v.boolean(),
      email: v.boolean(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => { /* ... */ },
});
```

---

## 6. CRON JOB SCHEDULING

```typescript
// packages/backend/convex/crons.ts (additions)

// Weekly coverage analysis — Sunday midnight UTC
crons.weekly(
  "coverage-analyzer",
  { dayOfWeek: "sunday", hourUTC: 0, minuteUTC: 0 },
  internal.actions.coverageAnalyzer.runWeeklyAnalysis
);

// Monthly coach clustering — 1st of each month
crons.monthly(
  "coach-archetype-clustering",
  { day: 1, hourUTC: 2, minuteUTC: 0 },
  internal.actions.coverageAnalyzer.runCoachClustering
);
```

---

## 7. FEATURE FLAG DESIGN

```typescript
// Integration with existing featureFlags system

// Org-level flags (admin controls)
"coaching_coverage_enabled"        // Master toggle for the feature
"coaching_coverage_quality_scoring" // Enable QWAS quality scoring
"coaching_coverage_rae_overlay"     // Enable birth quarter overlay
"coaching_coverage_admin_calibration" // Enable admin calibration view
"coaching_coverage_parent_surveys"   // Enable parent micro-surveys
"coaching_coverage_nudges"          // Enable proactive nudging

// Coach-level preferences (stored in coachCoverageProfiles)
// Each coach can opt out of individual sub-features
```

---

## 8. INTEGRATION POINTS WITH EXISTING SYSTEMS

### Voice Notes Pipeline
- **Hook:** After `buildInsights` completes, schedule `scoreInsightQuality`
- **Location:** Add scheduler call in `packages/backend/convex/actions/draftGeneration.ts` (or wherever insight extraction finalizes)
- **No changes to existing insight extraction logic**

### Player Enrollments
- **Read-only:** Query `orgPlayerEnrollments` for squad list + `dateOfBirth` for RAE
- **No schema changes needed**

### Coach Dashboard (Frontend)
- **New card:** `<CoverageDashboardCard />` added to coach home page
- **Conditional:** Only shown if `coaching_coverage_enabled` feature flag is on
- **Route:** `/orgs/[orgId]/coach/coverage-calibration` for full view

### Parent Summaries (Phase 5 only)
- **Integration:** Attach quarterly micro-survey to existing parent summary delivery
- **2-3 questions only, aggregated results**

### Notifications
- **Uses existing notification infrastructure for weekly digest**
- **New:** In-app nudge system (component-level, not notification center)

---

## 9. COST MODEL (V3.5 Updated)

### Per 100 Coaches

| Component | Frequency | Model | Monthly Cost |
|-----------|-----------|-------|-------------|
| Quality scoring (40% of insights) | ~24 insights/coach/week | Haiku | $4.80 |
| Coverage context generation | 1/coach/week | Sonnet | $12.00 |
| Coach clustering | 1/month total | Sonnet | $5.00 |
| **V3.5: Inline quality feedback** | ~40% of insights, 40% need LLM | Haiku | $3.20 |
| **V3.5: Prompt Generator (digest)** | 1/coach/week | Haiku | $0.80 |
| **V3.5: Hybrid Orchestrator LLM** | ~10% of decisions | Haiku | $0.40 |
| V3.5: Context-aware analysis | 1/coach/week | Rule-based | $0 |
| V3.5: WhatsApp delivery | 1/coach/week | Twilio | ~$1.00 |
| **Total (Standard tier)** | | | **~$27/month** |
| **Per coach** | | | **$0.27** |

### V3 vs V3.5 Cost Comparison

| | V3 | V3.5 | Delta |
|--|-----|------|-------|
| Per 100 coaches/month | $22 | $27 | +$5 (+23%) |
| Per coach/month | $0.22 | $0.27 | +$0.05 |

The $5/month increase adds: inline quality feedback, personalized digests, hybrid orchestrator, context awareness, and WhatsApp delivery.

### Scaling

| Coaches | Monthly Cost | Per Coach |
|---------|-------------|-----------|
| 100 | $27 | $0.27 |
| 500 | $135 | $0.27 |
| 1,000 | $270 | $0.27 |
| 10,000 | $2,700 | $0.27 |

Cost scales linearly. No per-org fixed costs.

---

## 10. PRIVACY & SECURITY ARCHITECTURE

### Data Access Matrix

| Data | Coach (own) | Coach (other) | Admin | Parent |
|------|:-----------:|:-------------:|:-----:|:------:|
| Own coverage snapshot | Read | - | Aggregate only | - |
| Own quality scores | Read | - | Aggregate only | - |
| Own goals/preferences | Read/Write | - | - | - |
| Own nudge history | Read | - | - | - |
| Org calibration aggregates | - | - | Read | - |
| Parent survey responses | - | - | Aggregate only | Write (own) |
| Individual insight content | Read | - | - | Via parent summary |

### Security Rules

1. **Organization scoping:** All queries filter by `organizationId` at DB level
2. **Coach isolation:** Coverage data is scoped to `coachUserId` — no cross-coach access
3. **Admin aggregation:** Admin views use server-side aggregation; individual coach data never reaches the admin frontend
4. **Differential privacy:** Add Laplacian noise to aggregated metrics when team size < 5 coaches
5. **Data retention:** Coverage snapshots retained for 12 months, then auto-deleted
6. **Export/deletion:** Coach can export all their data as JSON, or request full deletion (GDPR Article 17)

---

## 11. FRONTEND COMPONENT ARCHITECTURE

```
apps/web/src/app/orgs/[orgId]/coach/
├── coverage-calibration/          (NEW - full feature page)
│   ├── page.tsx
│   └── components/
│       ├── coverage-dashboard.tsx  (main orchestrator component)
│       ├── attention-ring.tsx      (SVG ring visualization)
│       ├── coverage-heatmap.tsx    (per-player table with quality bars)
│       ├── birth-quarter-overlay.tsx (RAE distribution chart)
│       ├── post-insight-nudge.tsx  (task-boundary nudge card)
│       ├── suggested-player-prompt.tsx (new insight suggestion)
│       ├── weekly-digest.tsx       (notification preview)
│       ├── professional-growth-stack.tsx (goal setting + growth layers)
│       └── inline-quality-feedback.tsx  (V3.5 - real-time quality coaching)
│
├── components/
│   └── coverage-card.tsx          (NEW - dashboard card for home page)
│
├── voice-notes/components/
│   └── insight-quality-overlay.tsx (V3.5 - inline feedback shown during insight creation)
│
└── settings/
    └── coverage-preferences.tsx   (NEW - opt-out & digest settings, V3.5: channel preferences)

apps/web/src/app/orgs/[orgId]/admin/
└── calibration/                   (NEW - admin aggregate view)
    └── page.tsx
```

---

## 12. IMPLEMENTATION PHASES (Technical)

### Phase 1 (Weeks 1-3): Foundation

**Backend:**
- [ ] Create schema tables: `insightQualityScores`, `coverageSnapshots`, `coachCoverageProfiles`, `coverageNudgeEvents`
- [ ] Implement `getLatestCoverage` query
- [ ] Implement `getCoverageHistory` query
- [ ] Implement `computeGini`, `computeHhi`, `computeZScores` utility functions
- [ ] Implement weekly coverage analyzer cron job
- [ ] Add feature flag `coaching_coverage_enabled`

**Frontend:**
- [ ] Coverage dashboard card component (for coach home page)
- [ ] Full coverage page with heatmap
- [ ] Attention ring SVG component
- [ ] Connect to live Convex queries

### Phase 2 (Weeks 4-6): Quality Scoring & Inline Feedback (V3.5)

**Backend:**
- [ ] Implement tiered quality scoring action
- [ ] Build heuristic rules engine (Tier 1)
- [ ] Build NLP scoring (Tier 2)
- [ ] Integrate LLM scoring (Tier 3)
- [ ] Hook quality scorer into insight extraction pipeline
- [ ] QWAS computation in coverage analyzer
- [ ] RAE computation using `dateOfBirth`
- [ ] **V3.5:** `getInlineQualityFeedback` action (real-time scoring)
- [ ] **V3.5:** `recordInlineQualityOutcome` mutation
- [ ] **V3.5:** `inlineQualityFeedbackEvents` table
- [ ] **V3.5:** Sport/age-specific suggestion templates

**Frontend:**
- [ ] Quality bars on heatmap
- [ ] Birth quarter overlay toggle
- [ ] Quality trend visualization
- [ ] **V3.5:** Inline quality feedback overlay component
- [ ] **V3.5:** Live quality score indicator during insight editing

### Phase 3 (Weeks 7-9): Smart Nudging & Context Awareness (V3.5)

**Backend:**
- [ ] Orchestrator rules engine
- [ ] Post-insight nudge trigger (mutation hook)
- [ ] Suggested player algorithm
- [ ] Weekly digest generator
- [ ] Nudge event tracking mutations
- [ ] Progressive dismissal reduction logic
- [ ] **V3.5:** Context-aware gap analysis (injury/attendance cross-reference)
- [ ] **V3.5:** Context injection into nudge messages

**Frontend:**
- [ ] Post-insight nudge component
- [ ] Suggested player prompt
- [ ] Weekly digest notification
- [ ] Notification preferences UI

### Phase 4 (Weeks 10-12): Personalization, WhatsApp & Learning (V3.5)

**Backend:**
- [ ] Admin calibration query (aggregates only)
- [ ] Coach behavioral clustering action
- [ ] **V3.5:** Prompt Generator agent (weekly digest personalization)
- [ ] **V3.5:** WhatsApp digest delivery (Twilio integration)
- [ ] **V3.5:** Hybrid Orchestrator (rules + LLM escalation)
- [ ] **V3.5:** `coverageDigestDeliveries` table
- [ ] **V3.5:** `setDigestChannels` mutation
- [ ] "Why am I seeing this?" explainability data

**Frontend:**
- [ ] Admin calibration dashboard
- [ ] Explainability modals
- [ ] **V3.5:** Digest channel preferences UI (in-app, push, WhatsApp, email)
- [ ] Privacy settings page
- [ ] GDPR data export

### Phase 5 (Weeks 13-15): Bidirectional Measurement

**Backend:**
- [ ] Parent micro-survey system
- [ ] Coach self-assessment mutation
- [ ] Blind spot metric computation
- [ ] Experience gap metric computation

**Frontend:**
- [ ] Parent survey UI (via parent comms)
- [ ] Coach self-assessment prompt
- [ ] Gap visualization

### Phase 6 (Weeks 16-18): Advanced Analytics

**Backend:**
- [ ] Impact attribution queries
- [ ] Shannon entropy for feedback diversity
- [ ] Season retrospective report generator
- [ ] Composite Coaching Coverage Score

**Frontend:**
- [ ] Impact attribution dashboard
- [ ] Season retrospective view
- [ ] Feedback diversity visualization
- [ ] Descriptive norms display

---

## 13. TESTING STRATEGY

### Unit Tests (Vitest — if added)
- Gini coefficient computation
- HHI and normalized HHI
- Z-score calculation
- QWAS formula
- Heuristic quality scoring rules
- NLP pattern matching
- Orchestrator decision logic

### Integration Tests
- Quality scorer pipeline (heuristic → NLP → LLM escalation)
- Coverage analyzer with mock data
- Nudge event lifecycle

### E2E Tests (Playwright)
- Coverage dashboard renders with mock data
- Heatmap shows correct player ordering
- Birth quarter overlay toggles
- Post-insight nudge appears after note creation
- Suggested player prompt appears on new insight
- Goal setting saves and displays
- Admin calibration shows aggregate data only
- Opt-out settings disable features correctly

---

## 14. OPEN QUESTIONS

1. **Insight table FK:** Should we add `qualityScoreId` to `voiceNoteInsights` or keep it as a separate lookup? Separate table is cleaner but requires a join.

2. **Real-time vs snapshot:** Coverage analyzer runs weekly. Should the dashboard also show real-time counts (computed on-read) or only snapshot data? Recommendation: Show real-time counts + latest snapshot metrics.

3. **Multi-team coaches:** If a coach has multiple teams, should coverage be computed per-team or across all teams? Recommendation: Per-team, with an "All Teams" aggregate view.

4. **Insight ownership:** When a voice note mentions multiple players, each generated insight is per-player. Quality scoring should happen per-insight (which is per-player). Confirm this matches the existing data model.

5. **Cron timing:** Should coverage analyzer run weekly or daily? Weekly is sufficient for dashboard accuracy and keeps costs low. Daily would enable more responsive nudging but increases compute.

6. **V3.5: Inline feedback latency:** The inline quality feedback needs to return fast enough to not block the insight creation flow. Tier 1+2 are instant. Tier 3 (LLM) takes ~2-3 seconds. Should we show a loading indicator, or score async and show feedback after save? Recommendation: Show instant Tier 1/2 score, then async update if Tier 3 changes it.

7. **V3.5: WhatsApp template approval:** Twilio requires pre-approved message templates for WhatsApp Business API. Do we need a fixed template with variable slots, or can we use free-form session messages? Recommendation: Start with session messages (24-hour window after coach's last WhatsApp interaction), fall back to approved template.

8. **V3.5: Context data freshness:** Injury and attendance data may not be entered in real-time. Should context awareness use a 48-hour staleness window? Recommendation: Yes — only use context data updated within 48 hours.
