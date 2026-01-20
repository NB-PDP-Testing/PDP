# Coach-to-Parent AI-Mediated Messaging Pipeline

## Product Requirements Document (PRD)

**Version:** 1.0
**Created:** January 19, 2026
**Status:** Ready for Implementation
**Author:** AI-Assisted (Claude Opus 4.5)

---

## Executive Summary

This PRD defines an AI-mediated coach-to-parent communication pipeline that transforms coach voice note insights into positive, constructive parent-facing summaries. The system protects coach psychological safety (enabling candid internal observations) while ensuring parents receive actionable, encouraging feedback about their child's development.

### Core Philosophy

> "If we do not get the flow of information right between the coach and the parent in a non-destructive, non-negative manner, we could force ourselves to have coaches who don't want to leave their real thoughts."

The system treats coach observations as **private internal notes** that are **optionally transformed** into parent-friendly communications. This mirrors the distinction between a doctor's clinical notes and patient-facing summaries.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [User Stories](#user-stories)
4. [Functional Requirements](#functional-requirements)
5. [Non-Functional Requirements](#non-functional-requirements)
6. [Data Architecture](#data-architecture)
7. [AI Agent Architecture](#ai-agent-architecture)
8. [Trust Curve System](#trust-curve-system)
9. [Sensitive Topic Handling](#sensitive-topic-handling)
10. [Parent Experience](#parent-experience)
11. [Integration Points](#integration-points)
12. [Feature Flags & Controls](#feature-flags--controls)
13. [Success Metrics](#success-metrics)
14. [Phase Breakdown](#phase-breakdown)
15. [Risk Assessment](#risk-assessment)
16. [Appendices](#appendices)

---

## 1. Problem Statement

### Current State

Coaches using PlayerARC can record voice notes that are AI-transcribed and analyzed for insights. These insights can be:
- Applied to player passports (injuries, goals, skill ratings, notes)
- Dismissed if not relevant

**What's Missing:**
1. **No parent notification** when insights are applied
2. **No AI transformation** of coach language into parent-appropriate communication
3. **No trust curve** allowing progressive automation
4. **No distinction** between private coach observations and public parent-facing summaries
5. **Coaches may self-censor** knowing observations could be seen directly by parents

### The Psychology Problem

Research shows that private thoughts shared with others create anxiety about judgment. When coaches know their candid observations might be seen by parents:
- They sanitize language, reducing observational value
- They avoid documenting areas of concern
- They lose the authentic "stream of consciousness" that voice notes enable

**The Solution:** AI-mediated transformation that allows coaches to be candid internally while presenting constructive, actionable summaries to parents.

---

## 2. Solution Overview

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COACH VOICE NOTE PIPELINE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │ Coach   │────▶│ Voice    │────▶│ AI Insight   │────▶│ Private      │   │
│  │ Records │     │ Note     │     │ Extraction   │     │ Coach Note   │   │
│  └─────────┘     └──────────┘     └──────────────┘     └──────┬───────┘   │
│                                                                │           │
│                                                                ▼           │
│                                                        ┌──────────────┐   │
│                                                        │ AI Summary   │   │
│                                                        │ Generation   │   │
│                                                        │ (Positive    │   │
│                                                        │ Reframing)   │   │
│                                                        └──────┬───────┘   │
│                                                                │           │
│                                        Trust Level ◄───────────┤           │
│                                        Determines              │           │
│                                        Auto-Approve            │           │
│                                                                ▼           │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │                     COACH APPROVAL DECISION                        │    │
│  ├───────────────────────────────────────────────────────────────────┤    │
│  │                                                                    │    │
│  │   Trust Level 0-1:           Trust Level 2-3:                     │    │
│  │   ┌─────────────┐            ┌─────────────────────┐              │    │
│  │   │ ✅ Approve  │            │ Auto-Approved       │              │    │
│  │   │ 🚫 Don't    │            │ (Coach can review   │              │    │
│  │   │    Share    │            │  & adjust score)    │              │    │
│  │   └─────────────┘            └─────────────────────┘              │    │
│  │                                                                    │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│                                          │                                 │
│                                          ▼                                 │
│                                   ┌──────────────┐                        │
│                                   │ Public       │                        │
│                                   │ Parent       │                        │
│                                   │ Message      │                        │
│                                   └──────┬───────┘                        │
│                                          │                                 │
└──────────────────────────────────────────┼─────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PARENT NOTIFICATION LAYER                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐     │
│  │ Real-time    │    │ Browser Tab  │    │ Parent Dashboard         │     │
│  │ Badge        │    │ Notification │    │ Card Display             │     │
│  │ (Dot)        │    │ (Optional)   │    │ (Coach Notes Section)    │     │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘     │
│                                                                             │
│                           ┌──────────────────────────────────────┐         │
│                           │ Future: Web Push Notifications       │         │
│                           │ (Post-MVP, iOS limitations noted)    │         │
│                           └──────────────────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Private by Default** - Coach insights remain private until explicitly approved
2. **Transformation Required** - AI always generates a positive parent summary
3. **One-Way Communication** - MVP is coach → parent only (no replies)
4. **Trust Curve** - Progressive automation based on coach behavior
5. **Sensitive Topic Guards** - Injury and behavior always require human review
6. **Platform Control** - Feature toggle at platform level for throttling/disabling

---

## 3. User Stories

### Coach Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| C-1 | As a coach, I want to record voice notes without worrying about parents seeing my raw thoughts | Private notes never shown to parents; only AI-transformed summaries |
| C-2 | As a coach, I want to quickly approve or suppress AI-generated parent summaries | One-click approve, one-click "Don't Share" on inline cards |
| C-3 | As a coach, I want to build trust with the system over time | Trust level visible, activity nudges toward automation |
| C-4 | As a coach, I want full control over injury-related communications | Injury topics always require explicit approval |
| C-5 | As a coach, I want behavior observations to never auto-share | Behavior category always requires human review |
| C-6 | As a coach at high trust, I want messages to auto-send unless I intervene | Trust level 3 enables full automation with review capability |

### Parent Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P-1 | As a parent, I want to receive positive updates about my child's development | Messages use constructive, actionable language |
| P-2 | As a parent, I want to be notified when my coach shares feedback | Real-time badge on Parents navigation item |
| P-3 | As a parent, I want to see all coach messages in one place | Messages displayed in Coach Notes section of dashboard |
| P-4 | As a parent with multiple children, I want aggregated notifications | Badge shows count, messages grouped by child |
| P-5 | As a parent, I want to share a snapshot of positive feedback | Shareable image card for social/family sharing |
| P-6 | As a parent, I want to see how feedback relates to my child's passport | Messages linked to relevant passport sections |

### Admin Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| A-1 | As a platform admin, I want to enable/disable the feature | Platform-level toggle in settings |
| A-2 | As a platform admin, I want to throttle message volume | Rate limiting configuration available |
| A-3 | As a platform admin, I want to monitor AI costs | Cost dashboard with per-org breakdown |
| A-4 | As an org admin, I want to see messaging analytics | Org-level metrics: messages sent, approval rates, etc. |

### System Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| S-1 | As the system, I want to process voice notes asynchronously | Convex scheduler handles background processing |
| S-2 | As the system, I want to degrade gracefully under load | Silent degradation with user-facing banner |
| S-3 | As the system, I want to track all message audit trails | Full logging: creation, approval, delivery, views |
| S-4 | As the system, I want to link private and public notes | Bidirectional reference between source and transformed |

---

## 4. Functional Requirements

### 4.1 Voice Note Processing Pipeline

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-001 | System SHALL extract insights from transcribed voice notes using AI | P0 |
| FR-002 | System SHALL generate a parent-friendly summary for each shareable insight | P0 |
| FR-003 | System SHALL store private coach insight and public parent summary as linked records | P0 |
| FR-004 | System SHALL present summary to coach for approval (trust levels 0-1) | P0 |
| FR-005 | System SHALL auto-approve summaries for coaches at trust level 2-3 | P1 |
| FR-006 | Coach SHALL be able to suppress any summary with "Don't Share" action | P0 |
| FR-007 | "Don't Share" action SHALL mark insight as suppressed, not delete | P0 |

### 4.2 AI Transformation Engine

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-010 | AI SHALL transform negative language into constructive framing | P0 |
| FR-011 | AI SHALL preserve factual content while changing tone | P0 |
| FR-012 | AI SHALL generate specific, actionable feedback | P0 |
| FR-013 | AI SHALL maintain appropriate length (2-4 sentences typical) | P1 |
| FR-014 | AI SHALL include confidence score (0-100) for each summary | P1 |
| FR-015 | AI SHALL flag low-confidence summaries for explicit review | P1 |

**Transformation Examples:**

| Coach Says | Parent Sees |
|------------|-------------|
| "Jack was struggling with ball control today, seemed distracted" | "Jack is developing his ball control skills - we're working on focus exercises that will help him improve. Great effort today!" |
| "Sarah had a tough session, wasn't listening to instructions" | "Sarah is working through some important listening skills. We're using new techniques to help her engage with coaching. She's making progress!" |
| "Tom's fitness is poor, he couldn't keep up with the drills" | "Tom is building his stamina through our conditioning drills. We're seeing gradual improvement in his endurance - keep encouraging him at home!" |

### 4.3 Coach Approval Interface

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-020 | System SHALL display parent summaries as inline cards in voice notes dashboard | P0 |
| FR-021 | Each card SHALL show: original insight, transformed summary, player name, confidence score | P0 |
| FR-022 | Card SHALL have prominent "Approve" and "Don't Share" actions | P0 |
| FR-023 | Approved messages SHALL immediately queue for parent notification | P0 |
| FR-024 | Coach SHALL be able to edit summary before approval (stretch goal) | P2 |

### 4.4 Parent Notification System

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-030 | System SHALL display real-time badge on Parents nav item when new messages exist | P0 |
| FR-031 | Badge SHALL show count of unread messages | P0 |
| FR-032 | System SHALL update browser tab title with notification indicator | P1 |
| FR-033 | Messages SHALL appear in existing Coach Feedback section of parent dashboard | P0 |
| FR-034 | Messages SHALL be grouped by child AND sport for multi-child/multi-sport parents | P0 |
| FR-034a | Each sport SHALL have separate summaries for 1:1 connection | P0 |
| FR-034b | Future: Aggregated single-pane-of-view across sports (post-MVP) | P3 |
| FR-035 | System SHALL NOT send email notifications (explicit requirement) | P0 |
| FR-036 | System MAY implement web push notifications post-MVP | P3 |

### 4.5 Trust Curve System

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-040 | System SHALL track trust level per coach (0-3 scale) | P1 |
| FR-041 | New coaches SHALL start at trust level 0 | P1 |
| FR-042 | Trust level SHALL increase based on approval activity | P1 |
| FR-043 | Coach SHALL be able to manually adjust their trust preference | P1 |
| FR-044 | Trust level 0-1: All summaries require explicit approval | P1 |
| FR-045 | Trust level 2: High-confidence summaries auto-approve, low-confidence require review | P1 |
| FR-046 | Trust level 3: All summaries auto-approve, coach can review/adjust | P1 |

### 4.6 Sensitive Topic Handling

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-050 | Injury-related insights SHALL always require explicit approval regardless of trust level | P0 |
| FR-051 | Injury communications SHALL trigger separate workflow with due diligence checklist | P1 |
| FR-052 | Behavior-related insights SHALL always require human review | P0 |
| FR-053 | Behavior insights SHALL never auto-approve regardless of trust level | P0 |
| FR-054 | System SHALL classify insights into sensitivity categories: Normal, Injury, Behavior | P0 |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Req ID | Requirement | Target |
|--------|-------------|--------|
| NFR-001 | AI summary generation latency | < 5 seconds |
| NFR-002 | Parent notification delivery | < 2 seconds after approval |
| NFR-003 | Dashboard load time with messages | < 3 seconds |
| NFR-004 | Badge update latency | < 1 second (real-time) |

### 5.2 Scalability

| Req ID | Requirement | Target |
|--------|-------------|--------|
| NFR-010 | Concurrent voice note processing | 100/minute |
| NFR-011 | Messages per organization | 10,000+ |
| NFR-012 | Parents per organization | 5,000+ |

### 5.3 Reliability

| Req ID | Requirement | Target |
|--------|-------------|--------|
| NFR-020 | Message delivery success rate | 99.9% |
| NFR-021 | AI transformation success rate | 99% |
| NFR-022 | System availability | 99.9% |

### 5.4 Security & Privacy

| Req ID | Requirement |
|--------|-------------|
| NFR-030 | Private coach notes SHALL never be exposed to parents |
| NFR-031 | All messages SHALL be scoped to organization |
| NFR-032 | Audit trail SHALL be maintained for all message lifecycle events |
| NFR-033 | Parent access SHALL be verified against guardian identity |

---

## 6. Data Architecture

### 6.1 Schema Changes

#### New Table: `coachParentSummaries`

```typescript
coachParentSummaries: defineTable({
  // Source Reference
  voiceNoteId: v.id("voiceNotes"),
  insightId: v.string(),  // References insight within voiceNote

  // Content
  privateInsight: v.object({
    title: v.string(),
    description: v.string(),
    category: v.string(),
    sentiment: v.optional(v.string()),
  }),
  publicSummary: v.object({
    content: v.string(),
    confidenceScore: v.number(),  // 0-100
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

  // Sensitivity Classification
  sensitivityCategory: v.union(
    v.literal("normal"),
    v.literal("injury"),
    v.literal("behavior")
  ),

  // Actors
  coachId: v.string(),  // Better Auth user ID
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),

  // Timestamps
  createdAt: v.number(),
  approvedAt: v.optional(v.number()),
  approvedBy: v.optional(v.string()),  // For manual approvals
  deliveredAt: v.optional(v.number()),
  viewedAt: v.optional(v.number()),

  // Trust Context
  autoApproved: v.boolean(),
  trustLevelAtCreation: v.number(),
})
  .index("by_voiceNote", ["voiceNoteId"])
  .index("by_player", ["playerIdentityId"])
  .index("by_org_status", ["organizationId", "status"])
  .index("by_coach", ["coachId"])
  .index("by_org_player_status", ["organizationId", "playerIdentityId", "status"])
```

#### New Table: `coachTrustLevels`

```typescript
coachTrustLevels: defineTable({
  coachId: v.string(),
  organizationId: v.string(),

  // Trust Configuration
  currentLevel: v.number(),  // 0-3
  preferredLevel: v.optional(v.number()),  // Coach can set preferred max

  // Activity Metrics
  totalApprovals: v.number(),
  totalSuppressed: v.number(),
  totalEdits: v.number(),
  consecutiveApprovals: v.number(),
  lastActivityAt: v.number(),

  // Auto-progression
  levelHistory: v.array(v.object({
    level: v.number(),
    changedAt: v.number(),
    reason: v.string(),
  })),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_coach_org", ["coachId", "organizationId"])
```

#### New Table: `parentMessageViews`

```typescript
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
  .index("by_guardian", ["guardianIdentityId"])
```

### 6.2 Data Flow

```
Voice Note Created
       │
       ▼
AI Insight Extraction (existing)
       │
       ▼
For Each Shareable Insight:
       │
       ├──▶ Generate Parent Summary (AI)
       │           │
       │           ▼
       │    Create coachParentSummaries record
       │           │
       │           ▼
       │    Classify Sensitivity
       │           │
       │           ├──▶ Injury → status: pending_review (always)
       │           │
       │           ├──▶ Behavior → status: pending_review (always)
       │           │
       │           └──▶ Normal → Check Trust Level
       │                       │
       │                       ├──▶ Level 0-1 → pending_review
       │                       │
       │                       └──▶ Level 2-3 → auto_approved
       │
       ▼
Coach Reviews (if pending_review)
       │
       ├──▶ Approve → status: approved → Queue Notification
       │
       └──▶ Don't Share → status: suppressed → End

       │
       ▼
Parent Notification
       │
       ├──▶ Update unread count (real-time badge)
       │
       ├──▶ Update browser tab (if enabled)
       │
       └──▶ Mark status: delivered

       │
       ▼
Parent Views Message
       │
       ├──▶ Create parentMessageViews record
       │
       └──▶ Mark status: viewed
```

---

## 7. AI Agent Architecture

### 7.1 Multi-Agent Design (Claude SDK)

The system uses a hierarchical multi-agent architecture for scalability:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (Claude Opus)                    │
│                                                                  │
│  Responsibilities:                                               │
│  - Route insights to appropriate worker agents                   │
│  - Handle complex edge cases                                     │
│  - Quality control on worker outputs                             │
│  - Cost optimization decisions                                   │
│                                                                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ SUMMARY WORKER   │ │ CLASSIFICATION   │ │ QUALITY WORKER   │
│ (Claude Haiku)   │ │ WORKER (Haiku)   │ │ (Claude Sonnet)  │
│                  │ │                  │ │                  │
│ - Transform      │ │ - Categorize     │ │ - Review low-    │
│   coach language │ │   sensitivity    │ │   confidence     │
│ - Generate       │ │ - Detect injury  │ │ - Ensure tone    │
│   positive       │ │ - Detect         │ │ - Flag issues    │
│   summaries      │ │   behavior       │ │                  │
│                  │ │                  │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

### 7.2 Agent Specifications

#### Summary Worker Agent

```yaml
name: parent-summary-worker
model: claude-3-haiku
temperature: 0.3
max_tokens: 500

system_prompt: |
  You are a positive communication specialist for youth sports development.

  Your task is to transform coach observations into parent-friendly summaries that:
  1. Maintain factual accuracy while changing tone
  2. Use constructive, encouraging language
  3. Focus on development and progress
  4. Provide actionable insights when possible
  5. Never minimize concerns but frame them positively

  Transformation guidelines:
  - "struggling with" → "working on", "developing"
  - "poor" → "an area we're focusing on"
  - "can't" → "learning to", "building towards"
  - "lazy" → "learning to maintain energy"
  - "distracted" → "working on focus"

  Output format:
  {
    "summary": "2-4 sentence parent-friendly message",
    "confidence": 0-100,
    "flags": ["any concerns to note"]
  }
```

#### Classification Worker Agent

```yaml
name: sensitivity-classifier
model: claude-3-haiku
temperature: 0
max_tokens: 100

system_prompt: |
  Classify the following coach insight into a sensitivity category.

  Categories:
  - NORMAL: General skill, effort, progress observations
  - INJURY: Any physical health concern, pain, injury mention
  - BEHAVIOR: Attitude, discipline, social interaction issues

  Output only the category and brief reason:
  {
    "category": "NORMAL|INJURY|BEHAVIOR",
    "reason": "brief explanation"
  }
```

### 7.3 Cost Modeling

| Agent | Model | Est. Tokens/Call | Cost/1K Calls | Daily Est. (100 orgs) |
|-------|-------|-----------------|---------------|----------------------|
| Summary Worker | Haiku | 800 | $0.20 | $2.00 |
| Classifier | Haiku | 200 | $0.05 | $0.50 |
| Quality (10% sample) | Sonnet | 1000 | $0.30 | $0.30 |
| Orchestrator (5%) | Opus | 1500 | $1.50 | $0.75 |
| **Total** | | | | **$3.55/day** |

### 7.4 Fallback Strategy

```
Primary: Claude SDK Multi-Agent
       │
       ├──▶ If rate limited → Exponential backoff (max 3 retries)
       │
       ├──▶ If timeout → Queue for background processing
       │
       └──▶ If API unavailable:
               │
               ├──▶ Feature flag: disable new summaries
               │
               ├──▶ Show banner: "AI summaries temporarily unavailable"
               │
               └──▶ Allow manual message creation (stretch goal)
```

---

## 8. Trust Curve System

### 8.1 Trust Level Definitions

| Level | Name | Behavior | Unlock Criteria |
|-------|------|----------|-----------------|
| 0 | New | All summaries require approval | Default for new coaches |
| 1 | Learning | All summaries require approval, nudges shown | 10+ approvals |
| 2 | Trusted | High confidence (80+) auto-approve, low confidence require review | 50+ approvals, <10% suppression rate |
| 3 | Expert | All auto-approve, review dashboard available | 200+ approvals, coach opts in |

### 8.2 Progression Algorithm

```typescript
function calculateTrustLevel(metrics: CoachMetrics): number {
  const { totalApprovals, totalSuppressed, consecutiveApprovals, preferredLevel } = metrics;

  const suppressionRate = totalSuppressed / (totalApprovals + totalSuppressed);

  // Level 0 → 1: Basic activity
  if (totalApprovals < 10) return 0;

  // Level 1 → 2: Consistent approval behavior
  if (totalApprovals < 50 || suppressionRate > 0.1) return 1;

  // Level 2 → 3: High volume + coach opt-in
  if (totalApprovals < 200 || !preferredLevel || preferredLevel < 3) return 2;

  return Math.min(preferredLevel, 3);
}
```

### 8.3 UI Nudges

At trust level 1, coaches see periodic nudges:

> "You've approved 47 messages. After 50, high-confidence summaries can auto-send. Would you like to enable this?"

At trust level 2, coaches see:

> "38 messages auto-sent this month. Want to review any? [View Recent]"

---

## 9. Sensitive Topic Handling

### 9.1 Injury Workflow

When an insight is classified as injury-related:

```
Injury Insight Detected
       │
       ▼
Generate Summary (with caution language)
       │
       ▼
Display to Coach with Warning Banner:
┌────────────────────────────────────────────────────┐
│ ⚠️ INJURY-RELATED INSIGHT                          │
│                                                    │
│ This insight mentions a potential injury.          │
│ Please review carefully before sharing.            │
│                                                    │
│ Checklist:                                         │
│ □ I have personally observed this situation        │
│ □ The severity description is accurate             │
│ □ No medical advice is implied                     │
│                                                    │
│ [Approve & Send] [Edit First] [Don't Share]        │
└────────────────────────────────────────────────────┘
```

### 9.2 Behavior Workflow

Behavior-related insights NEVER auto-approve:

```
Behavior Insight Detected
       │
       ▼
Generate Summary (with constructive framing)
       │
       ▼
Display to Coach with Review Requirement:
┌────────────────────────────────────────────────────┐
│ 🔒 BEHAVIOR-RELATED INSIGHT                        │
│                                                    │
│ Behavioral observations require manual review.     │
│ Auto-approval is disabled for this category.       │
│                                                    │
│ Preview:                                           │
│ "[AI-generated positive summary]"                  │
│                                                    │
│ [Approve & Send] [Don't Share]                     │
└────────────────────────────────────────────────────┘
```

---

## 10. Parent Experience

### 10.1 Notification Badge

Location: Parents navigation item in sidebar/header

```
┌──────────────────────────────────┐
│ 🏠 Home                          │
│ 👨‍👩‍👧 Parents         ●  3          │
│ 📊 Progress                      │
└──────────────────────────────────┘
```

### 10.2 Dashboard Integration

Messages appear in existing Coach Feedback section:

```
┌────────────────────────────────────────────────────────────────┐
│ 💬 Latest Coach Feedback                                       │
│ Recent notes from your children's coaches                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ 🔵 NEW                                 Today, 3:45 PM   │   │
│ ├─────────────────────────────────────────────────────────┤   │
│ │ 👤 Emma Johnson                                         │   │
│ │                                                         │   │
│ │ Emma is developing her passing accuracy beautifully!    │   │
│ │ We're working on vision exercises that will help her    │   │
│ │ spot teammates earlier. She showed great determination  │   │
│ │ in training today.                                      │   │
│ │                                                         │   │
│ │ [📸 Share] [View Passport →]                           │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │                                        Yesterday        │   │
│ ├─────────────────────────────────────────────────────────┤   │
│ │ 👤 Jack Johnson                                         │   │
│ │                                                         │   │
│ │ Jack is building his stamina through our conditioning   │   │
│ │ drills. We're seeing gradual improvement in his         │   │
│ │ endurance - keep encouraging him at home!               │   │
│ │                                                         │   │
│ │ [📸 Share] [View Passport →]                           │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 10.3 Shareable Image Card

When parent clicks "Share":

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                    ⚽ PlayerARC                                │
│                                                                │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━              │
│                                                                │
│        "Emma is developing her passing                         │
│         accuracy beautifully!"                                 │
│                                                                │
│                    — Coach Williams                            │
│                       Riverside FC                             │
│                                                                │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━              │
│                                                                │
│              #ProudParent #YouthSports                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 11. Integration Points

### 11.1 Player Passport Integration

Messages link to relevant passport sections:

| Message Category | Passport Link |
|-----------------|---------------|
| Skill observation | Skills & Ratings section |
| Goal mention | Development Goals section |
| General progress | Overview section |
| Injury (if shared) | Medical section |

### 11.2 Existing Voice Notes Integration

- Messages originate from voice note insights
- Link maintained between `voiceNotes.insights[]` and `coachParentSummaries`
- Coach can navigate: Voice Note → Insight → Parent Summary

### 11.3 Future: Knowledge Graph

Post-MVP, messages contribute to player knowledge graph:

```
Player Node
    │
    ├── Skill Nodes (from assessments)
    │
    ├── Goal Nodes (from passport)
    │
    └── Observation Nodes (from parent summaries)
            │
            ├── Timestamp
            ├── Category
            ├── Sentiment trajectory
            └── Related skill/goal edges
```

---

## 12. Feature Flags & Controls

### 12.1 Platform-Level Controls

```typescript
// Platform settings
{
  "coachParentMessaging": {
    "enabled": true,
    "maxMessagesPerDay": 1000,
    "maxMessagesPerCoach": 50,
    "aiProvider": "claude",
    "fallbackEnabled": true,
    "costAlertThreshold": 100  // USD
  }
}
```

### 12.2 Organization-Level Controls

```typescript
// Per-org settings
{
  "messagingEnabled": true,
  "autoApprovalEnabled": true,
  "maxTrustLevel": 3,
  "sensitiveTopicOverride": false  // If true, injury/behavior can auto-approve
}
```

### 12.3 Degradation Behavior

When system throttled or disabled:

1. **New summaries paused** - Voice notes still process, summaries queued
2. **Banner displayed** - "Coach-to-parent summaries are temporarily paused"
3. **Existing messages remain** - Parents can still view delivered messages
4. **Queue resumes** - When re-enabled, queued summaries process

---

## 13. Success Metrics

### 13.1 Engagement Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Coach adoption rate | 60% | Coaches with 1+ approved messages / Total coaches |
| Message approval rate | 85% | Approved / (Approved + Suppressed) |
| Parent view rate | 70% | Viewed messages / Delivered messages |
| Share rate | 10% | Shared images / Viewed messages |

### 13.2 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| AI confidence average | 85+ | Mean confidence score of generated summaries |
| Trust level progression | 30% at L2+ after 3 months | Coaches at trust level 2+ / Active coaches |
| Sensitive topic catch rate | 99% | Correctly classified injury/behavior |

### 13.3 Operational Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Processing latency | < 5s | Time from voice note to summary available |
| Delivery success | 99.9% | Successfully delivered / Approved |
| AI cost per message | < $0.01 | Total AI cost / Messages generated |

---

## 14. Phase Breakdown

### Phase 1: Core Pipeline (MVP)
*Duration: 2 sprints*

- Voice note → AI summary generation
- Basic coach approval UI (inline cards)
- Summary storage with linking
- Basic parent notification (badge only)
- Display in existing Coach Feedback section

### Phase 2: Trust Curve Foundation
*Duration: 1 sprint*

- Trust level tracking
- Basic progression algorithm
- Coach preference settings
- UI indicators for trust level

### Phase 3: Sensitive Topic Handling
*Duration: 1 sprint*

- Classification worker integration
- Injury workflow with checklist
- Behavior workflow with manual requirement
- Category-specific UI treatments

### Phase 4: Enhanced Parent Experience
*Duration: 1 sprint*

- Browser tab notifications
- Shareable image cards
- Passport deep links
- Multi-child aggregation

### Phase 5: Advanced Trust & Automation
*Duration: 1 sprint*

- Auto-approval for high trust levels
- Activity-based nudging
- Trust level analytics
- Coach review dashboard for auto-approved

### Phase 6: Monitoring & Scale
*Duration: 1 sprint*

- Cost monitoring dashboard
- Rate limiting implementation
- Platform admin controls
- Degradation handling

---

## 15. Risk Assessment

### 15.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI generates inappropriate content | Low | High | Quality worker review, human approval default |
| High AI costs at scale | Medium | Medium | Cost monitoring, rate limiting, model tiering |
| Real-time notification latency | Medium | Low | Convex scheduler, background processing |
| Data model complexity | Low | Medium | Clear schema design, comprehensive indexes |

### 15.2 User Experience Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Coaches don't trust AI transformation | Medium | High | Show transformation, allow editing, build trust curve |
| Parents expect two-way communication | High | Medium | Clear messaging: "This is one-way feedback" |
| Notification fatigue | Medium | Medium | Rate limiting, aggregation, preference settings |

### 15.3 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Feature underutilized | Medium | Medium | Onboarding flow, coach training materials |
| Negative feedback about AI involvement | Low | Medium | Transparency about AI use, coach control emphasis |

---

## 16. Appendices

### Appendix A: API Specifications

See `/docs/features/prd/api/COACH_PARENT_MESSAGING_API.md`

### Appendix B: UI Mockups

See `/docs/features/prd/mockups/COACH_PARENT_MESSAGING_MOCKUPS.md`

### Appendix C: Testing Plan

See `/docs/features/prd/testing/COACH_PARENT_MESSAGING_TESTS.md`

### Appendix D: Implementation JSON Files

See `/docs/features/prd/phases/` directory:
- `phase-1-core-pipeline.json`
- `phase-2-trust-curve.json`
- `phase-3-sensitive-topics.json`
- `phase-4-parent-experience.json`
- `phase-5-advanced-automation.json`
- `phase-6-monitoring-scale.json`

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-19 | AI-Assisted | Initial PRD based on comprehensive discovery |

---

*End of PRD*
