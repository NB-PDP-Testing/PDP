# Coach-to-Parent Messaging - Technical Architecture

**Version:** 1.0
**Created:** January 19, 2026
**Related PRD:** COACH_PARENT_MESSAGING_PRD.md

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PLAYERARC PLATFORM                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              FRONTEND (Next.js 14)                               │   │
│  ├─────────────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                                  │   │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │   │
│  │  │    Coach     │   │   Parent     │   │   Platform   │   │     Org      │     │   │
│  │  │  Dashboard   │   │  Dashboard   │   │    Admin     │   │    Admin     │     │   │
│  │  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘     │   │
│  │         │                  │                  │                  │              │   │
│  │         │    Real-time Subscriptions (Convex useQuery)          │              │   │
│  │         │                  │                  │                  │              │   │
│  └─────────┴──────────────────┴──────────────────┴──────────────────┴──────────────┘   │
│                                         │                                               │
│                                         ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              BACKEND (Convex)                                    │   │
│  ├─────────────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │                        MESSAGING PIPELINE                               │    │   │
│  │  ├────────────────────────────────────────────────────────────────────────┤    │   │
│  │  │                                                                         │    │   │
│  │  │   Voice Note        AI Processing         Approval         Delivery    │    │   │
│  │  │   ──────────►      ───────────────►      ──────────►     ───────────►  │    │   │
│  │  │                                                                         │    │   │
│  │  │   ┌─────────┐     ┌─────────────────┐   ┌──────────┐   ┌────────────┐  │    │   │
│  │  │   │ Voice   │────▶│ Summary Worker  │──▶│ Trust    │──▶│ Notifier   │  │    │   │
│  │  │   │ Notes   │     │ (Haiku)         │   │ Decision │   │            │  │    │   │
│  │  │   │ Model   │     ├─────────────────┤   │ Engine   │   └────────────┘  │    │   │
│  │  │   └─────────┘     │ Classifier      │   └──────────┘                   │    │   │
│  │  │                   │ (Haiku)         │                                   │    │   │
│  │  │                   ├─────────────────┤                                   │    │   │
│  │  │                   │ Quality Worker  │                                   │    │   │
│  │  │                   │ (Sonnet, 10%)   │                                   │    │   │
│  │  │                   └─────────────────┘                                   │    │   │
│  │  │                                                                         │    │   │
│  │  └────────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │                          DATA LAYER                                     │    │   │
│  │  ├────────────────────────────────────────────────────────────────────────┤    │   │
│  │  │                                                                         │    │   │
│  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │    │   │
│  │  │  │ coachParent     │  │ coachTrust      │  │ messagingCosts  │        │    │   │
│  │  │  │ Summaries       │  │ Levels          │  │                 │        │    │   │
│  │  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │    │   │
│  │  │                                                                         │    │   │
│  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │    │   │
│  │  │  │ parentMessage   │  │ messagingRate   │  │ voiceNotes      │        │    │   │
│  │  │  │ Views           │  │ Limits          │  │ (existing)      │        │    │   │
│  │  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │    │   │
│  │  │                                                                         │    │   │
│  │  └────────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                                  │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                               │
│                                         ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           EXTERNAL SERVICES                                      │   │
│  ├─────────────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                                  │   │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                        │   │
│  │  │   Anthropic  │   │   OpenAI     │   │   Convex     │                        │   │
│  │  │   Claude API │   │   Whisper    │   │   Storage    │                        │   │
│  │  │              │   │   (existing) │   │   (images)   │                        │   │
│  │  └──────────────┘   └──────────────┘   └──────────────┘                        │   │
│  │                                                                                  │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Voice Note to Parent Summary Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           VOICE NOTE → PARENT SUMMARY FLOW                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

     COACH                CONVEX BACKEND                AI SERVICES              PARENT
       │                        │                           │                       │
       │   1. Record Audio      │                           │                       │
       │───────────────────────▶│                           │                       │
       │                        │                           │                       │
       │                        │  2. Store Voice Note      │                       │
       │                        │─────────────────────────▶ │                       │
       │                        │                           │                       │
       │                        │  3. Transcribe (Whisper)  │                       │
       │                        │◀───────────────────────── │                       │
       │                        │                           │                       │
       │                        │  4. Extract Insights      │                       │
       │                        │  (GPT-4o, existing)       │                       │
       │                        │◀───────────────────────── │                       │
       │                        │                           │                       │
       │                        │ ┌─────────────────────────────────────────────┐   │
       │                        │ │  FOR EACH SHAREABLE INSIGHT:                 │   │
       │                        │ │                                              │   │
       │                        │ │  5a. Classify Sensitivity                    │   │
       │                        │ │      (Claude Haiku)                          │   │
       │                        │ │  ◄──────────────────────────────────────────▶│   │
       │                        │ │                                              │   │
       │                        │ │  5b. Generate Parent Summary                 │   │
       │                        │ │      (Claude Haiku)                          │   │
       │                        │ │  ◄──────────────────────────────────────────▶│   │
       │                        │ │                                              │   │
       │                        │ │  5c. Quality Review (10% sample)             │   │
       │                        │ │      (Claude Sonnet)                         │   │
       │                        │ │  ◄──────────────────────────────────────────▶│   │
       │                        │ │                                              │   │
       │                        │ │  5d. Store Summary Record                    │   │
       │                        │ │      status: pending_review | auto_approved  │   │
       │                        │ └─────────────────────────────────────────────┘   │
       │                        │                           │                       │
       │  6. Real-time Update   │                           │                       │
       │◀───────────────────────│                           │                       │
       │   (pending summaries)  │                           │                       │
       │                        │                           │                       │
       │  7. Approve / Suppress │                           │                       │
       │───────────────────────▶│                           │                       │
       │                        │                           │                       │
       │                        │  8. Update Status         │                       │
       │                        │  (approved/suppressed)    │                       │
       │                        │                           │                       │
       │                        │  9. Update Trust Metrics  │                       │
       │                        │                           │                       │
       │                        │────────────────────────────────────────────────────▶
       │                        │  10. Real-time Badge Update                       │
       │                        │                           │                       │
       │                        │                           │   11. View Message    │
       │                        │◀──────────────────────────────────────────────────│
       │                        │                           │                       │
       │                        │  12. Mark Viewed          │                       │
       │                        │  Create parentMessageViews│                       │
       │                        │                           │                       │
```

### 2. Trust Level Progression Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           TRUST LEVEL PROGRESSION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

    NEW COACH                    ACTIVITY                         TRUST LEVEL
        │                           │                                  │
        │  Start                    │                                  │
        │──────────────────────────▶│ Level 0 (New)                   │
        │                           │◀─────────────────────────────────│
        │                           │                                  │
        │                           │                                  │
        │  10+ approvals            │                                  │
        │──────────────────────────▶│ Level 1 (Learning)              │
        │                           │◀─────────────────────────────────│
        │                           │  Nudges appear                   │
        │                           │                                  │
        │  50+ approvals            │                                  │
        │  < 10% suppression        │                                  │
        │──────────────────────────▶│ Level 2 (Trusted)               │
        │                           │◀─────────────────────────────────│
        │                           │  High confidence auto-approves   │
        │                           │                                  │
        │  200+ approvals           │                                  │
        │  Coach opts in            │                                  │
        │──────────────────────────▶│ Level 3 (Expert)                │
        │                           │◀─────────────────────────────────│
        │                           │  All NORMAL auto-approves        │
        │                           │                                  │
```

### 3. Sensitive Topic Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         SENSITIVE TOPIC HANDLING FLOW                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

     INSIGHT                  CLASSIFIER                    WORKFLOW
        │                        │                              │
        │  "Jack's knee hurts"   │                              │
        │───────────────────────▶│  → INJURY                    │
        │                        │──────────────────────────────▶
        │                        │                              │
        │                        │  ┌────────────────────────┐  │
        │                        │  │ INJURY WORKFLOW        │  │
        │                        │  ├────────────────────────┤  │
        │                        │  │ • Warning banner       │  │
        │                        │  │ • Due diligence list   │  │
        │                        │  │ • NEVER auto-approve   │  │
        │                        │  └────────────────────────┘  │
        │                        │                              │
        │  "Emma wasn't focused" │                              │
        │───────────────────────▶│  → BEHAVIOR                  │
        │                        │──────────────────────────────▶
        │                        │                              │
        │                        │  ┌────────────────────────┐  │
        │                        │  │ BEHAVIOR WORKFLOW      │  │
        │                        │  ├────────────────────────┤  │
        │                        │  │ • Lock icon indicator  │  │
        │                        │  │ • Constructive framing │  │
        │                        │  │ • NEVER auto-approve   │  │
        │                        │  └────────────────────────┘  │
        │                        │                              │
        │  "Great passing today" │                              │
        │───────────────────────▶│  → NORMAL                    │
        │                        │──────────────────────────────▶
        │                        │                              │
        │                        │  ┌────────────────────────┐  │
        │                        │  │ NORMAL WORKFLOW        │  │
        │                        │  ├────────────────────────┤  │
        │                        │  │ • Standard card        │  │
        │                        │  │ • Trust-based auto     │  │
        │                        │  └────────────────────────┘  │
        │                        │                              │
```

---

## Database Schema

### New Tables

```typescript
// packages/backend/convex/schema.ts

// Coach-to-Parent Summaries
coachParentSummaries: defineTable({
  // Source reference
  voiceNoteId: v.id("voiceNotes"),
  insightId: v.string(),

  // Content
  privateInsight: v.object({
    title: v.string(),
    description: v.string(),
    category: v.string(),
    sentiment: v.optional(v.string()),
  }),
  publicSummary: v.object({
    content: v.string(),
    confidenceScore: v.number(),
    generatedAt: v.number(),
  }),

  // Status
  status: v.union(
    v.literal("pending_review"),
    v.literal("approved"),
    v.literal("suppressed"),
    v.literal("auto_approved"),
    v.literal("delivered"),
    v.literal("viewed")
  ),

  // Sensitivity
  sensitivityCategory: v.union(
    v.literal("normal"),
    v.literal("injury"),
    v.literal("behavior")
  ),
  sensitivityReason: v.optional(v.string()),

  // Relations
  coachId: v.string(),
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  sportId: v.optional(v.string()),

  // Timestamps
  createdAt: v.number(),
  approvedAt: v.optional(v.number()),
  approvedBy: v.optional(v.string()),
  deliveredAt: v.optional(v.number()),
  viewedAt: v.optional(v.number()),

  // Trust context
  autoApproved: v.boolean(),
  trustLevelAtCreation: v.number(),

  // Audit
  auditLog: v.array(v.object({
    event: v.string(),
    timestamp: v.number(),
    actorId: v.optional(v.string()),
    details: v.optional(v.any()),
  })),

  // Cost tracking
  costAllocation: v.optional(v.object({
    summaryGeneration: v.number(),
    classification: v.number(),
    qualityReview: v.optional(v.number()),
    totalUsd: v.number(),
  })),
})
  .index("by_voiceNote", ["voiceNoteId"])
  .index("by_player", ["playerIdentityId"])
  .index("by_org_status", ["organizationId", "status"])
  .index("by_coach", ["coachId"])
  .index("by_org_player_sport_status", ["organizationId", "playerIdentityId", "sportId", "status"])
  .index("by_created", ["createdAt"]),

// Coach Trust Levels
coachTrustLevels: defineTable({
  coachId: v.string(),
  organizationId: v.string(),

  // Trust configuration
  currentLevel: v.number(),
  preferredLevel: v.optional(v.number()),
  confidenceThreshold: v.optional(v.number()),

  // Activity metrics
  totalApprovals: v.number(),
  totalSuppressed: v.number(),
  totalEdits: v.number(),
  consecutiveApprovals: v.number(),
  lastActivityAt: v.number(),

  // History
  levelHistory: v.array(v.object({
    level: v.number(),
    changedAt: v.number(),
    reason: v.string(),
  })),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_coach_org", ["coachId", "organizationId"]),

// Parent Message Views
parentMessageViews: defineTable({
  summaryId: v.id("coachParentSummaries"),
  guardianIdentityId: v.id("guardianIdentities"),
  viewedAt: v.number(),
  viewSource: v.union(
    v.literal("dashboard"),
    v.literal("notification_click"),
    v.literal("direct_link")
  ),
})
  .index("by_summary", ["summaryId"])
  .index("by_guardian", ["guardianIdentityId"]),

// Messaging Costs
messagingCosts: defineTable({
  organizationId: v.string(),
  date: v.string(),

  // Counts
  summaryGenerations: v.number(),
  classifications: v.number(),
  qualityReviews: v.number(),

  // Tokens
  totalTokensInput: v.number(),
  totalTokensOutput: v.number(),

  // Cost
  estimatedCostUsd: v.number(),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org_date", ["organizationId", "date"]),

// Messaging Rate Limits
messagingRateLimits: defineTable({
  organizationId: v.string(),

  // Limits
  maxMessagesPerDay: v.number(),
  maxMessagesPerCoach: v.number(),
  maxCostPerDayUsd: v.number(),

  // Current state
  currentDayCount: v.number(),
  currentDayDate: v.string(),
  isThrottled: v.boolean(),
  throttledReason: v.optional(v.string()),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org", ["organizationId"]),
```

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              ENTITY RELATIONSHIPS                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────┐         ┌─────────────────────┐         ┌────────────────────┐
│   voiceNotes   │─────────│ coachParentSummaries│─────────│ parentMessageViews │
│                │  1:N    │                     │   1:N   │                    │
│ • _id          │         │ • _id               │         │ • _id              │
│ • insights[]   │─────────│ • voiceNoteId       │         │ • summaryId        │
│ • coachId      │         │ • insightId         │         │ • guardianIdentityId│
│ • playerId     │         │ • privateInsight    │         │ • viewedAt         │
│ • ...          │         │ • publicSummary     │         │ • viewSource       │
└────────────────┘         │ • status            │         └────────────────────┘
                           │ • sensitivityCategory│
                           │ • coachId           │
                           │ • playerIdentityId  │─────────┐
                           │ • organizationId    │         │
                           │ • sportId           │         │
                           │ • ...               │         │
                           └─────────────────────┘         │
                                      │                    │
                                      │                    │
                           ┌──────────┴──────────┐         │
                           │                     │         │
                           ▼                     ▼         ▼
                  ┌────────────────┐    ┌────────────────────┐
                  │ coachTrustLevels│    │ playerIdentities   │
                  │                │    │                    │
                  │ • coachId      │    │ • _id              │
                  │ • organizationId│    │ • firstName        │
                  │ • currentLevel │    │ • lastName         │
                  │ • preferredLevel│    │ • ...              │
                  │ • totalApprovals│    └────────────────────┘
                  │ • ...          │              │
                  └────────────────┘              │
                                                 │
                                    ┌────────────┴────────────┐
                                    │                         │
                                    ▼                         ▼
                           ┌────────────────┐        ┌────────────────────┐
                           │guardianIdentities│        │guardianPlayerLinks │
                           │                │        │                    │
                           │ • _id          │◀───────│ • guardianId       │
                           │ • firstName    │   N:1  │ • playerIdentityId │
                           │ • email        │        │ • relationship     │
                           │ • ...          │        └────────────────────┘
                           └────────────────┘
```

---

## AI Agent Architecture

### Multi-Agent Design (Claude SDK)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          MULTI-AGENT ORCHESTRATION                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────────────┐
                              │     ORCHESTRATOR        │
                              │     (Claude Opus)       │
                              │                         │
                              │  • Route complex cases  │
                              │  • Handle edge cases    │
                              │  • Quality oversight    │
                              │  • Cost decisions       │
                              └───────────┬─────────────┘
                                          │
                          Used only for   │   5% of cases
                          complex routing │   or quality issues
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
              ▼                           ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│    SUMMARY WORKER       │ │   CLASSIFICATION        │ │    QUALITY WORKER       │
│    (Claude Haiku)       │ │   WORKER (Haiku)        │ │    (Claude Sonnet)      │
│                         │ │                         │ │                         │
│  Input:                 │ │  Input:                 │ │  Input:                 │
│  • Insight title/desc   │ │  • Insight content      │ │  • Generated summary    │
│  • Player first name    │ │                         │ │  • Original insight     │
│  • Sport name           │ │  Output:                │ │                         │
│                         │ │  • Category             │ │  Output:                │
│  Output:                │ │  • Confidence           │ │  • Quality score        │
│  • Parent summary       │ │  • Reason               │ │  • Issues found         │
│  • Confidence score     │ │                         │ │  • Suggestions          │
│  • Flags                │ │  Categories:            │ │                         │
│                         │ │  • NORMAL               │ │  Triggers:              │
│  Transformation:        │ │  • INJURY               │ │  • 10% random sample    │
│  • Positive reframing   │ │  • BEHAVIOR             │ │  • Low confidence (<70) │
│  • Actionable language  │ │                         │ │  • Flagged summaries    │
│  • Sport-appropriate    │ └─────────────────────────┘ │                         │
│                         │                             └─────────────────────────┘
└─────────────────────────┘

                              COST OPTIMIZATION:
                              ─────────────────
                              • Haiku for 95% of work
                              • Sonnet for quality (10%)
                              • Opus rarely (5% edge cases)

                              Est. cost: $0.01/summary
```

### Agent Prompts

#### Summary Worker (Haiku)

```yaml
model: claude-3-haiku-20240307
temperature: 0.3
max_tokens: 500

system: |
  You are a positive communication specialist for youth sports development.

  Transform coach observations into parent-friendly summaries that:
  1. Maintain factual accuracy while using positive tone
  2. Use constructive, encouraging language
  3. Focus on development and progress
  4. Provide actionable insights when possible
  5. Never minimize concerns - reframe them positively

  Guidelines:
  - "struggling with" → "working on", "developing"
  - "poor" → "an area we're focusing on"
  - "can't" → "learning to", "building towards"
  - "lazy" → "learning to maintain energy"
  - "distracted" → "working on focus"
  - "weak" → "developing strength in"

  Keep summaries 2-4 sentences. Include the player's first name.

  Output JSON:
  {
    "summary": "2-4 sentence parent-friendly message",
    "confidence": 0-100,
    "flags": ["any concerns to note"]
  }

user: |
  Player: {playerFirstName}
  Sport: {sportName}
  Coach Observation: {insightTitle} - {insightDescription}
```

#### Classification Worker (Haiku)

```yaml
model: claude-3-haiku-20240307
temperature: 0
max_tokens: 100

system: |
  Classify sports coaching insights into sensitivity categories.

  Categories:
  - NORMAL: Skill, effort, progress, technique observations
  - INJURY: Any physical health concern, pain, injury, limitation
  - BEHAVIOR: Attitude, discipline, focus, social, conduct issues

  Output JSON only:
  {
    "category": "NORMAL|INJURY|BEHAVIOR",
    "confidence": 0-100,
    "reason": "brief explanation"
  }

user: |
  {insightContent}
```

#### Quality Worker (Sonnet)

```yaml
model: claude-3-5-sonnet-20241022
temperature: 0.2
max_tokens: 500

system: |
  Review AI-generated parent summaries for quality and appropriateness.

  Check for:
  1. Accuracy - Does summary reflect original insight?
  2. Tone - Is language positive and constructive?
  3. Appropriateness - Suitable for parent communication?
  4. Completeness - Key information preserved?
  5. Safety - No inappropriate content slipped through?

  Output JSON:
  {
    "qualityScore": 0-100,
    "issues": ["list of issues found"],
    "suggestions": ["improvements if needed"],
    "approved": true/false
  }

user: |
  Original: {originalInsight}
  Summary: {generatedSummary}
  Category: {sensitivityCategory}
```

---

## API Specifications

### Backend Mutations

```typescript
// packages/backend/convex/models/coachParentMessages.ts

// Create summary (called by pipeline)
export const createParentSummary = mutation({
  args: {
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(),
    privateInsight: v.object({
      title: v.string(),
      description: v.string(),
      category: v.string(),
      sentiment: v.optional(v.string()),
    }),
    publicSummary: v.object({
      content: v.string(),
      confidenceScore: v.number(),
    }),
    sensitivityCategory: v.union(
      v.literal("normal"),
      v.literal("injury"),
      v.literal("behavior")
    ),
    sensitivityReason: v.optional(v.string()),
    sportId: v.optional(v.string()),
  },
  returns: v.id("coachParentSummaries"),
  handler: async (ctx, args) => {
    // Implementation
  },
});

// Coach approves summary
export const approveSummary = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
  },
  returns: v.object({
    success: v.boolean(),
    deliveredAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    // Implementation
  },
});

// Coach suppresses summary
export const suppressSummary = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Implementation
  },
});

// Approve injury summary with checklist
export const approveInjurySummary = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
    checklist: v.object({
      personallyObserved: v.boolean(),
      severityAccurate: v.boolean(),
      noMedicalAdvice: v.boolean(),
    }),
    additionalNotes: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Validate all checklist items are true
    // Implementation
  },
});

// Mark summary as viewed
export const markSummaryViewed = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
    viewSource: v.union(
      v.literal("dashboard"),
      v.literal("notification_click"),
      v.literal("direct_link")
    ),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

### Backend Queries

```typescript
// packages/backend/convex/models/coachParentMessages.ts

// Get pending summaries for coach
export const getCoachPendingSummaries = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.object({
    summary: v.object({ /* ... */ }),
    player: v.object({ /* ... */ }),
    sport: v.optional(v.object({ /* ... */ })),
  })),
  handler: async (ctx, args) => {
    // Implementation
  },
});

// Get summaries for parent by child and sport
export const getParentSummariesByChildAndSport = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.object({
    child: v.object({
      _id: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
    }),
    sports: v.array(v.object({
      sportId: v.optional(v.string()),
      sportName: v.string(),
      summaries: v.array(v.object({ /* ... */ })),
      unreadCount: v.number(),
    })),
  })),
  handler: async (ctx, args) => {
    // Implementation
  },
});

// Get unread count for parent notification badge
export const getParentUnreadCount = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

### Backend Actions

```typescript
// packages/backend/convex/actions/coachParentMessaging.ts

// Generate parent summary using Claude
export const generateParentSummary = action({
  args: {
    insightTitle: v.string(),
    insightDescription: v.string(),
    insightCategory: v.string(),
    playerFirstName: v.string(),
    sportName: v.string(),
  },
  returns: v.object({
    summary: v.string(),
    confidenceScore: v.number(),
    flags: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    // Claude API call
  },
});

// Classify insight sensitivity
export const classifyInsightSensitivity = action({
  args: {
    insightTitle: v.string(),
    insightDescription: v.string(),
  },
  returns: v.object({
    category: v.union(
      v.literal("normal"),
      v.literal("injury"),
      v.literal("behavior")
    ),
    confidence: v.number(),
    reason: v.string(),
  }),
  handler: async (ctx, args) => {
    // Claude API call
  },
});

// Generate shareable image
export const generateShareableImage = action({
  args: {
    summaryId: v.id("coachParentSummaries"),
  },
  returns: v.object({
    imageUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    // Satori/resvg image generation
  },
});
```

---

## Frontend Components

### Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           COMPONENT HIERARCHY                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

Coach Dashboard (voice-notes-dashboard.tsx)
├── TrustLevelIndicator
├── AutomationNudgeBanner (conditional)
├── PendingSummariesSection
│   ├── CoachSummaryApprovalCard (normal)
│   ├── InjurySummaryApprovalCard (injury)
│   └── BehaviorSummaryApprovalCard (behavior)
└── ReviewAutoApprovedButton (trust level 2+)

Auto-Approved Review (auto-approved-review.tsx)
├── FilterControls
├── AutoApprovedSummaryCard
│   ├── RevokeButton
│   └── ViewStatusBadge
└── ReviewStats

Parent Dashboard (parents/page.tsx)
├── ParentNavBadge (in sidebar)
├── CoachFeedback (enhanced)
│   ├── ChildSection
│   │   ├── SportSection
│   │   │   ├── MessageCard
│   │   │   │   ├── ShareButton → ShareModal
│   │   │   │   └── PassportLink
│   │   │   └── ...more messages
│   │   └── ...more sports
│   └── ...more children
└── TabNotificationProvider (wrapper)

Platform Admin (platform/messaging/page.tsx)
├── MessagingFeatureToggle
├── MessagingCostDashboard
├── RateLimitSettings
└── AnalyticsOverview
```

### Key Component Specifications

#### CoachSummaryApprovalCard

```tsx
// apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/summary-approval-card.tsx

interface SummaryApprovalCardProps {
  summary: {
    _id: Id<"coachParentSummaries">;
    privateInsight: {
      title: string;
      description: string;
    };
    publicSummary: {
      content: string;
      confidenceScore: number;
    };
    sensitivityCategory: "normal" | "injury" | "behavior";
  };
  player: {
    firstName: string;
    lastName: string;
  };
  sport?: {
    name: string;
  };
  onApprove: (summaryId: Id<"coachParentSummaries">) => Promise<void>;
  onSuppress: (summaryId: Id<"coachParentSummaries">) => Promise<void>;
}

// Card displays:
// - Player name + sport (header)
// - Collapsible original insight
// - AI-generated summary (prominent)
// - Confidence score bar
// - Approve (primary) + Don't Share (secondary) buttons
```

#### ParentNavBadge

```tsx
// apps/web/src/components/layout/parent-nav-badge.tsx

interface ParentNavBadgeProps {
  orgId: string;
}

// Uses real-time subscription to unread count
// Displays red dot with count when > 0
// Animates on increment
```

---

## Cost Modeling

### Per-Operation Costs

| Operation | Model | Input Tokens | Output Tokens | Est. Cost |
|-----------|-------|--------------|---------------|-----------|
| Summary Generation | Haiku | 500 | 300 | $0.0005 |
| Classification | Haiku | 200 | 50 | $0.0001 |
| Quality Review (10%) | Sonnet | 800 | 300 | $0.007 |
| Orchestration (5%) | Opus | 1000 | 500 | $0.05 |

### Monthly Projections

| Scale | Messages/Day | Daily Cost | Monthly Cost |
|-------|--------------|------------|--------------|
| Small (10 orgs) | 100 | $0.10 | $3 |
| Medium (50 orgs) | 500 | $0.50 | $15 |
| Large (200 orgs) | 2,000 | $2.00 | $60 |
| Enterprise (1000 orgs) | 10,000 | $10.00 | $300 |

### Cost Optimization Strategies

1. **Model Tiering**: Use Haiku for 95% of operations
2. **Caching**: Cache classification results for similar phrases
3. **Batching**: Process multiple insights in single API calls
4. **Quality Sampling**: Only quality-review 10% of summaries
5. **Rate Limiting**: Prevent runaway costs with daily limits

---

## Security Considerations

### Data Isolation

- All queries filter by `organizationId`
- Parent access verified against `guardianIdentities`
- Coach access verified against `coachAssignments`
- Summaries only visible to authorized parents

### Private Note Protection

- `privateInsight` field NEVER exposed to parent queries
- Parent queries only return `publicSummary`
- Audit log tracks all access attempts

### Input Validation

- All mutations validate actor permissions
- Checklist validation for injury approvals
- Rate limiting prevents abuse

---

## Monitoring & Observability

### Key Metrics

```typescript
// Metric definitions

// Volume
"messaging.summaries.generated" // Count
"messaging.summaries.approved"  // Count
"messaging.summaries.suppressed" // Count
"messaging.summaries.auto_approved" // Count

// Quality
"messaging.ai.confidence_score" // Histogram
"messaging.ai.classification_accuracy" // Gauge

// Performance
"messaging.ai.latency_ms" // Histogram
"messaging.delivery.latency_ms" // Histogram

// Cost
"messaging.ai.cost_usd" // Counter
"messaging.ai.tokens_input" // Counter
"messaging.ai.tokens_output" // Counter

// Engagement
"messaging.parent.view_rate" // Gauge
"messaging.parent.time_to_view_minutes" // Histogram
"messaging.share.rate" // Gauge
```

### Alerting Rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| High AI Latency | p95 > 10s | Warning |
| Low Approval Rate | < 50% over 24h | Warning |
| Cost Spike | > 2x daily average | Critical |
| API Errors | > 5% error rate | Critical |
| Rate Limit Hit | Any org throttled | Info |

---

## Migration Plan

### Phase 1: Schema

1. Add new tables to schema
2. Deploy schema migration
3. Verify indexes created

### Phase 2: Backend

1. Deploy AI action functions
2. Deploy mutation functions
3. Deploy query functions
4. Enable pipeline hook (feature flagged)

### Phase 3: Frontend

1. Deploy coach dashboard components
2. Deploy parent dashboard components
3. Enable feature flag for beta orgs

### Phase 4: General Availability

1. Enable feature flag globally
2. Monitor metrics
3. Iterate based on feedback

---

## Future Considerations

### Knowledge Graph Integration

Post-MVP, summaries can contribute to a player knowledge graph:

```
Player Node
├── Skill Nodes (from assessments)
├── Goal Nodes (from passport)
└── Observation Nodes (from summaries)
    ├── Timestamp
    ├── Category
    ├── Sentiment trajectory
    └── Related skill/goal edges
```

### Two-Way Communication

Future enhancement to allow parent replies:
- Reply stored separately from coach notes
- Coach can view parent acknowledgments
- Optional structured responses ("Got it!", "Thank you!")

### Web Push Notifications

Explore web push for real-time alerts:
- Service worker registration
- Push subscription management
- iOS limitations (PWA only)

---

*End of Technical Architecture Document*
