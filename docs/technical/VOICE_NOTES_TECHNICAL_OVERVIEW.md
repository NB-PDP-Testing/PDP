# Voice Notes Technical Overview

**Last Updated:** January 26, 2026
**Version:** P7 (Phase 7 Complete)
**Authors:** Engineering Team

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [Backend Implementation](#4-backend-implementation)
5. [Frontend Implementation](#5-frontend-implementation)
6. [AI Processing Pipeline](#6-ai-processing-pipeline)
7. [Trust Level System (Phase 7)](#7-trust-level-system-phase-7)
8. [Parent Communication Flow](#8-parent-communication-flow)
9. [Coach Notes Privacy Architecture](#9-coach-notes-privacy-architecture)
10. [Data Flow Diagrams](#10-data-flow-diagrams)
11. [AI Prompts & Insight Processing Deep Dive](#11-ai-prompts--insight-processing-deep-dive)
12. [Limitations & Improvement Opportunities](#12-limitations--improvement-opportunities)
13. [Key Files Reference](#13-key-files-reference)
14. [Troubleshooting Guide](#14-troubleshooting-guide)
15. [Admin Observability & Platform Analytics](#15-admin-observability--platform-analytics)
16. [Audio Storage Architecture](#16-audio-storage-architecture)
17. [Coach Learning & Feedback Loop](#17-coach-learning--feedback-loop)
18. [Prompt Flexibility & Tone Controls](#18-prompt-flexibility--tone-controls)
19. [Team Insights Collaboration Hub](#19-team-insights-collaboration-hub)
20. [Coach Impact Visibility Gap](#20-coach-impact-visibility-gap)

---

## 1. System Overview

The Voice Notes system enables coaches to capture observations about players during training sessions and matches. These notes are processed by AI to extract actionable insights that can be:

- Applied to player profiles (skill ratings, injuries, goals)
- Shared with parents as summaries
- Tracked as team-level observations
- Converted to coach task items

### Key Features

| Feature | Description |
|---------|-------------|
| Audio Recording | Record voice notes via app microphone |
| Typed Notes | Enter text notes directly |
| WhatsApp Integration | Receive voice notes via WhatsApp |
| AI Transcription | OpenAI Whisper for speech-to-text |
| AI Insight Extraction | GPT-4o extracts structured insights |
| Trust-Based Auto-Apply | Automated insight application based on coach trust level |
| Parent Summaries | AI-generated parent-friendly summaries |
| Admin Audit | Organization-wide voice notes oversight |

### User Roles

| Role | Capabilities |
|------|-------------|
| **Coach** | Create, view own notes; review/apply insights; configure settings |
| **Admin** | View all organization voice notes for audit purposes |
| **Parent** | View summaries shared by coaches (approved/auto-approved) |

---

## 2. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  New Note   │  │   Insights  │  │  History    │  │  Settings   │     │
│  │    Tab      │  │    Tab      │  │    Tab      │  │    Tab      │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           CONVEX BACKEND                                 │
│  ┌──────────────────────┐    ┌──────────────────────┐                   │
│  │     Models Layer     │    │     Actions Layer    │                   │
│  │  ─────────────────   │    │  ─────────────────   │                   │
│  │  voiceNotes.ts       │    │  voiceNotes.ts       │                   │
│  │  voiceNoteInsights.ts│    │  (AI Processing)     │                   │
│  │  coachTrustLevels.ts │    │                      │                   │
│  │  coachParentSummaries│    │  coachParentSummaries│                   │
│  └──────────────────────┘    └──────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                              │
│  ┌─────────────┐  ┌─────────────┐                                       │
│  │   OpenAI    │  │   Convex    │                                       │
│  │  Whisper +  │  │   Storage   │                                       │
│  │   GPT-4o    │  │  (Audio)    │                                       │
│  └─────────────┘  └─────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Module Dependencies

```
voiceNotes (Core) ──► orgPlayerEnrollments (Player roster)
        │
        ├──► voiceNoteInsights (Extracted insights table)
        │
        ├──► coachTrustLevels (Trust & auto-apply settings)
        │
        ├──► coachParentSummaries (Parent-facing summaries)
        │
        ├──► autoAppliedInsights (Audit trail)
        │
        ├──► teamObservations (Team-level insights)
        │
        └──► coachTasks (TODO insights)
```

---

## 3. Database Schema

### Core Tables

#### `voiceNotes`
Main storage for voice notes with embedded insights array.

```typescript
voiceNotes: defineTable({
  orgId: v.string(),                    // Organization ID
  coachId: v.optional(v.string()),      // Coach user ID
  date: v.string(),                     // ISO date string
  type: v.union(                        // Session type
    v.literal("training"),
    v.literal("match"),
    v.literal("general")
  ),
  source: v.optional(v.union(           // Input channel
    v.literal("app_recorded"),
    v.literal("app_typed"),
    v.literal("whatsapp_audio"),
    v.literal("whatsapp_text")
  )),
  audioStorageId: v.optional(v.id("_storage")),  // Audio file reference
  transcription: v.optional(v.string()),
  transcriptionStatus: v.optional(v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed")
  )),
  transcriptionError: v.optional(v.string()),
  summary: v.optional(v.string()),
  insights: v.array(InsightSchema),     // Embedded insights array
  insightsStatus: v.optional(v.union(...)),
  insightsError: v.optional(v.string()),
})
.index("by_orgId", ["orgId"])
.index("by_orgId_and_coachId", ["orgId", "coachId"])
```

#### Embedded Insight Schema (within `voiceNotes.insights`)

```typescript
{
  id: v.string(),                       // Unique insight ID
  playerIdentityId: v.optional(v.id("playerIdentities")),
  playerId: v.optional(v.string()),     // LEGACY: deprecated
  playerName: v.optional(v.string()),
  title: v.string(),
  description: v.string(),
  category: v.optional(v.string()),     // injury, skill_rating, etc.
  recommendedUpdate: v.optional(v.string()),
  confidence: v.optional(v.number()),   // 0.0-1.0 AI confidence
  status: v.union(
    v.literal("pending"),
    v.literal("applied"),
    v.literal("dismissed"),
    v.literal("auto_applied")
  ),
  appliedDate: v.optional(v.string()),
  appliedAt: v.optional(v.number()),
  appliedBy: v.optional(v.string()),
  dismissedAt: v.optional(v.number()),
  dismissedBy: v.optional(v.string()),
  teamId: v.optional(v.string()),       // For team_culture
  teamName: v.optional(v.string()),
  assigneeUserId: v.optional(v.string()), // For TODO
  assigneeName: v.optional(v.string()),
  linkedTaskId: v.optional(v.id("coachTasks")),
}
```

#### `voiceNoteInsights`
Extracted insights table for Phase 7 auto-apply tracking (mirrors embedded insights).

```typescript
voiceNoteInsights: defineTable({
  voiceNoteId: v.id("voiceNotes"),
  insightId: v.string(),              // Maps to embedded insight.id
  title: v.string(),
  description: v.string(),
  category: v.string(),
  recommendedUpdate: v.optional(v.string()),
  playerIdentityId: v.optional(v.id("playerIdentities")),
  playerName: v.optional(v.string()),
  teamId: v.optional(v.string()),
  teamName: v.optional(v.string()),
  assigneeUserId: v.optional(v.string()),
  assigneeName: v.optional(v.string()),
  confidenceScore: v.number(),        // AI confidence 0.0-1.0
  wouldAutoApply: v.boolean(),        // Preview mode prediction
  status: v.union(...),
  appliedAt: v.optional(v.number()),
  appliedBy: v.optional(v.string()),
  dismissedAt: v.optional(v.number()),
  dismissedBy: v.optional(v.string()),
  organizationId: v.string(),
  coachId: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_coach_org_status", ["coachId", "organizationId", "status"])
.index("by_player_status", ["playerIdentityId", "status"])
.index("by_confidence", ["confidenceScore"])
.index("by_category_status", ["category", "status"])
.index("by_voice_note", ["voiceNoteId"])
.index("by_voice_note_and_insight", ["voiceNoteId", "insightId"])
```

#### `coachTrustLevels`
Platform-wide trust level tracking for AI automation.

```typescript
coachTrustLevels: defineTable({
  coachId: v.string(),
  currentLevel: v.number(),           // 0-3 earned level
  preferredLevel: v.optional(v.number()), // User-set cap
  totalApprovals: v.number(),
  totalSuppressed: v.number(),
  consecutiveApprovals: v.number(),
  levelHistory: v.array(v.object({
    level: v.number(),
    changedAt: v.number(),
    reason: v.string(),
  })),
  lastActivityAt: v.optional(v.number()),
  insightConfidenceThreshold: v.optional(v.number()), // AI-learned
  insightAutoApplyPreferences: v.optional(v.object({
    skills: v.boolean(),
    attendance: v.boolean(),
    goals: v.boolean(),
    performance: v.boolean(),
  })),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_coach", ["coachId"])
```

#### `coachOrgPreferences`
Per-organization preferences for coaches.

```typescript
coachOrgPreferences: defineTable({
  coachId: v.string(),
  organizationId: v.string(),
  parentSummariesEnabled: v.optional(v.boolean()),  // Generate summaries?
  skipSensitiveInsights: v.optional(v.boolean()),   // Skip injury/behavior?
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_coach_org", ["coachId", "organizationId"])
.index("by_coach", ["coachId"])
```

#### `autoAppliedInsights`
Audit trail for automated insight applications.

```typescript
autoAppliedInsights: defineTable({
  insightId: v.id("voiceNoteInsights"),
  voiceNoteId: v.id("voiceNotes"),
  playerId: v.id("orgPlayerEnrollments"),  // DEPRECATED
  playerIdentityId: v.id("playerIdentities"),
  coachId: v.string(),
  organizationId: v.string(),
  category: v.string(),
  confidenceScore: v.number(),
  insightTitle: v.string(),
  insightDescription: v.string(),
  appliedAt: v.number(),
  autoAppliedByAI: v.boolean(),
  undoneAt: v.optional(v.number()),        // 1-hour undo window
  undoReason: v.optional(v.union(...)),
  undoReasonDetail: v.optional(v.string()),
  changeType: v.string(),                   // e.g., "skill_rating"
  targetTable: v.string(),                  // e.g., "skillAssessments"
  targetRecordId: v.optional(v.string()),
  fieldChanged: v.optional(v.string()),
  previousValue: v.optional(v.string()),    // For rollback
  newValue: v.string(),
})
.index("by_coach_org", ["coachId", "organizationId"])
.index("by_insight", ["insightId"])
.index("by_player_identity", ["playerIdentityId"])
.index("by_applied_at", ["appliedAt"])
.index("by_undo_status", ["undoneAt"])
```

#### `coachParentSummaries`
AI-generated summaries for parent communication.

```typescript
coachParentSummaries: defineTable({
  voiceNoteId: v.id("voiceNotes"),
  insightId: v.string(),
  coachId: v.string(),
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  sportId: v.id("sports"),
  privateInsight: v.object({              // Coach-only view
    title: v.string(),
    description: v.string(),
    category: v.string(),
    sentiment: v.union("positive", "neutral", "concern"),
  }),
  publicSummary: v.object({               // Parent-facing
    content: v.string(),
    confidenceScore: v.number(),
    generatedAt: v.number(),
  }),
  sensitivityCategory: v.union("normal", "injury", "behavior"),
  sensitivityConfidence: v.optional(v.number()),
  sensitivityReason: v.optional(v.string()),
  status: v.union(
    "pending_review",
    "approved",
    "suppressed",
    "auto_approved",
    "delivered",
    "viewed"
  ),
  createdAt: v.number(),
  approvedAt: v.optional(v.number()),
  approvedBy: v.optional(v.string()),
  scheduledDeliveryAt: v.optional(v.number()),  // 1-hour revoke window
  deliveredAt: v.optional(v.number()),
  viewedAt: v.optional(v.number()),
  acknowledgedAt: v.optional(v.number()),
  acknowledgedBy: v.optional(v.string()),
  wouldAutoApprove: v.optional(v.boolean()),
  autoApprovalDecision: v.optional(v.object({...})),
  revokedAt: v.optional(v.number()),
  revokedBy: v.optional(v.string()),
})
.index("by_coach_org_status", ["coachId", "organizationId", "status"])
.index("by_player_org_status", ["playerIdentityId", "organizationId", "status"])
```

---

## 4. Backend Implementation

### Models Layer (`packages/backend/convex/models/`)

#### `voiceNotes.ts` - Core Queries & Mutations (21 functions, 2,143 lines)

| Function | Type | Line | Description |
|----------|------|------|-------------|
| `getAllVoiceNotes` | Query | 84 | Admin: Get all org notes |
| `getVoiceNoteById` | Query | 121 | Get single note by ID |
| `getVoiceNotesByCoach` | Query | 155 | Get all notes for a coach in an org |
| `getVoiceNotesForCoachTeams` | Query | 197 | Get notes for coach's assigned teams |
| `getPendingInsights` | Query | 358 | Get pending insights (embedded version) |
| `getVoiceNotesForPlayer` | Query | 400 | Get notes mentioning specific player |
| `createTypedNote` | Mutation | 498 | Create text-based note |
| `createRecordedNote` | Mutation | 535 | Create audio note + trigger transcription |
| `generateUploadUrl` | Action | 573 | Get Convex storage upload URL |
| `updateInsightStatus` | Mutation | 587 | Apply/dismiss individual insight |
| `bulkApplyInsights` | Mutation | 1167 | Apply multiple insights at once |
| `updateInsightContent` | Mutation | 1364 | Update insight title/description |
| `updateInsightContentInternal` | Internal | 1435 | Internal version for AI corrections |
| `classifyInsight` | Mutation | 1507 | Manually set insight category |
| `assignPlayerToInsight` | Mutation | 1722 | Manually assign player to insight |
| `deleteVoiceNote` | Mutation | 1885 | Delete note and all related data |
| `getNote` | Internal Query | 1905 | Get note for internal use (actions) |
| `getInsightsForNote` | Internal Query | 1936 | Get insight records for a note |
| `getInsightById` | Internal Query | 1987 | Get single insight by ID |
| `updateTranscription` | Internal | 2034 | Update transcription status/content |
| `updateInsights` | Internal | 2063 | Update insights after AI processing |

**Key Implementation Details:**

1. **Coach Scoping**: All queries filter by `coachId` to ensure coaches only see their own notes
2. **Dual Update Pattern**: When updating insights, both the embedded array (`voiceNotes.insights`) and the separate table (`voiceNoteInsights`) are updated to maintain consistency
3. **Player Identity System**: Uses `playerIdentityId` (platform-level) rather than org-scoped player IDs

#### `voiceNoteInsights.ts` - Insight Management (8 functions, 1,299 lines)

| Function | Type | Line | Description |
|----------|------|------|-------------|
| `getPendingInsights` | Query | 138 | Get pending insights with wouldAutoApply calculation |
| `getAutoAppliedInsights` | Query | 218 | Get auto-applied insights with audit data |
| `applyInsight` | Mutation | 332 | Manually apply insight to player profile |
| `dismissInsight` | Mutation | 437 | Manually dismiss insight |
| `autoApplyInsight` | Mutation | 550 | Trigger auto-apply (requires auth) |
| `autoApplyInsightInternal` | Internal | 804 | Auto-apply from actions (no auth check) |
| `undoAutoAppliedInsight` | Mutation | 1035 | Undo within 1-hour window |
| `getUndoReasonStats` | Query | 1211 | Analytics on undo reasons for AI tuning |

**Auto-Apply Logic (Phase 7.2):**

```typescript
// Eligibility checks
const isEligible =
  insight.status === "pending" &&
  insight.category !== "injury" &&      // Safety: never auto-apply
  insight.category !== "medical" &&     // Safety: never auto-apply
  effectiveLevel >= 2 &&                // Trust Level 2+ required
  insight.confidenceScore >= threshold &&  // Meet confidence threshold
  categoryEnabled;                      // Enabled in preferences
```

#### `coachTrustLevels.ts` - Trust System (15 functions, 981 lines)

| Function | Type | Line | Description |
|----------|------|------|-------------|
| `getOrCreateTrustLevel` | Internal | 159 | Initialize trust level for new coach |
| `updateTrustMetrics` | Internal | 172 | Update counts after approve/suppress |
| `setCoachPreferredLevel` | Mutation | 254 | Set automation cap (0-3) |
| `setInsightAutoApplyPreferences` | Mutation | 307 | Enable/disable by category |
| `setParentSummariesEnabled` | Mutation | 347 | Toggle parent summaries per-org |
| `setSkipSensitiveInsights` | Mutation | 387 | Skip injury/behavior from summaries |
| `getCoachTrustLevel` | Query | 431 | Get trust level + org preferences |
| `getCoachPlatformTrustLevel` | Query | 532 | Get platform-wide trust (no org) |
| `getCoachAllOrgPreferences` | Query | 613 | Get preferences across all orgs |
| `getCoachTrustLevelInternal` | Internal Query | 644 | Get trust for internal actions |
| `getCoachTrustLevelWithInsightFields` | Query | 695 | Get trust with insight threshold data |
| `isParentSummariesEnabled` | Internal Query | 764 | Check if summaries enabled for coach/org |
| `shouldSkipSensitiveInsights` | Internal Query | 788 | Check if sensitive skipping enabled |
| `adjustPersonalizedThresholds` | Internal | 812 | Cron: tune confidence thresholds |
| `adjustInsightThresholds` | Internal | 902 | Cron: daily threshold adjustment |

**Trust Level Calculation:**

```typescript
// Thresholds
const TRUST_LEVEL_THRESHOLDS = {
  level1: 10,   // 10+ approvals
  level2: 50,   // 50+ approvals
  level3: 200,  // 200+ approvals
};

// Suppression rate guard (Level 2+)
const suppressionRate = totalSuppressed / (totalApprovals + totalSuppressed);
if (suppressionRate > 0.1) {
  // Block advancement if >10% suppression
}
```

#### `coachParentSummaries.ts` - Parent Communication (19 functions, 1,926 lines)

| Function | Type | Line | Description |
|----------|------|------|-------------|
| `createParentSummary` | Internal | 158 | Create summary after AI generation |
| `approveSummary` | Mutation | 284 | Coach approves normal summary for delivery |
| `approveInjurySummary` | Mutation | 378 | Injury approval with safety checklist |
| `suppressSummary` | Mutation | 458 | Coach blocks delivery permanently |
| `revokeSummary` | Mutation | 571 | Revoke auto-approved (1-hour window) |
| `editSummaryContent` | Mutation | 656 | Edit summary text before approval |
| `getCoachPendingSummaries` | Query | 711 | Get summaries awaiting coach review |
| `getAutoApprovedSummaries` | Query | 793 | Get sent summaries (last 30 days) |
| `getParentUnreadCount` | Query | 987 | Get unread count for parent badge |
| `getParentSummariesByChildAndSport` | Query | 1058 | Get summaries for parent dashboard |
| `markSummaryViewed` | Mutation | 1243 | Mark summary as viewed by parent |
| `trackShareEvent` | Mutation | 1318 | Track social sharing analytics |
| `acknowledgeParentSummary` | Mutation | 1388 | Parent acknowledges receipt |
| `acknowledgeAllForPlayer` | Mutation | 1450 | Acknowledge all for a player |
| `getPassportLinkForSummary` | Query | 1536 | Get link to player passport |
| `getSummaryForImage` | Internal Query | 1581 | Get data for shareable image |
| `getSummaryForPDF` | Query | 1710 | Get data for PDF export |
| `processScheduledDeliveries` | Internal | 1785 | Cron: deliver auto-approved after delay |
| `debugAutoApprovedTab` | Query | 1849 | Debug query for troubleshooting |

### Actions Layer (`packages/backend/convex/actions/`)

#### `voiceNotes.ts` - AI Processing (4 functions, 1,160 lines)

| Function | Type | Line | Description |
|----------|------|------|-------------|
| `transcribeAudio` | Internal Action | 142 | OpenAI Whisper audio-to-text |
| `buildInsights` | Internal Action | 237 | GPT-4o insight extraction with roster context |
| `correctInsightPlayerName` | Internal Action | 935 | AI-powered name correction in insight text |
| `recheckAutoApply` | Internal Action | 1012 | Re-evaluate auto-apply after manual edit |

#### `coachParentSummaries.ts` - Summary Generation (4 functions, 1,088 lines)

| Function | Type | Line | Description |
|----------|------|------|-------------|
| `classifyInsightSensitivity` | Internal Action | 102 | Claude Haiku: classify injury/behavior/normal |
| `generateParentSummary` | Internal Action | 294 | Claude Haiku: generate parent-friendly text |
| `processVoiceNoteInsight` | Internal Action | 531 | Orchestrate full summary generation pipeline |
| `generateShareableImage` | Action | 732 | Generate social media shareable image |

### Function Summary

| File | Location | Functions | Lines |
|------|----------|-----------|-------|
| `models/voiceNotes.ts` | Core CRUD | 21 | 2,143 |
| `models/voiceNoteInsights.ts` | Phase 7 Auto-Apply | 8 | 1,299 |
| `models/coachTrustLevels.ts` | Trust System | 15 | 981 |
| `models/coachParentSummaries.ts` | Parent Communication | 19 | 1,926 |
| `actions/voiceNotes.ts` | AI Processing | 4 | 1,160 |
| `actions/coachParentSummaries.ts` | Summary AI | 4 | 1,088 |
| **Total** | | **71** | **8,597** |

---

## 5. Frontend Implementation

### Page Structure

```
/orgs/[orgId]/coach/voice-notes/
├── page.tsx                    # Entry point with Suspense
├── voice-notes-dashboard.tsx   # Main dashboard with tabs
├── loading.tsx                 # Loading skeleton
└── components/
    ├── new-note-tab.tsx        # Recording/typing interface
    ├── insights-tab.tsx        # Pending insights review
    ├── auto-approved-tab.tsx   # Sent to parents view
    ├── review-tab.tsx          # Parent summaries review
    ├── history-tab.tsx         # Voice note history
    ├── team-insights-tab.tsx   # Team-level observations
    ├── parents-tab.tsx         # Parent communication
    ├── settings-tab.tsx        # Trust level & preferences
    ├── injury-approval-card.tsx
    ├── behavior-approval-card.tsx
    ├── summary-approval-card.tsx
    └── date-utils.ts
```

### Tab Structure

| Tab | Purpose | Key Components |
|-----|---------|----------------|
| **New Note** | Create voice notes | MediaRecorder API, audio waveform |
| **Insights** | Review AI-extracted insights | Insight cards, apply/dismiss buttons |
| **Sent** | View auto-approved summaries | Revoke button, delivery status |
| **Review** | Approve parent summaries | Approval cards with checklist |
| **History** | Browse past notes | Search, filter by type |
| **Team** | Team-level observations | Team grouping |
| **Parents** | Parent communication | Summary generation |
| **Settings** | Configure automation | Trust slider, toggles |

### Key Component: `new-note-tab.tsx`

**Audio Recording Flow:**

```typescript
// 1. Start recording with MediaRecorder
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

// 2. Collect audio chunks
mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

// 3. On stop, upload to Convex storage
mediaRecorder.onstop = async () => {
  const blob = new Blob(audioChunks, { type: 'audio/webm' });
  const uploadUrl = await generateUploadUrl();
  await fetch(uploadUrl, { method: 'POST', body: blob });
  const { storageId } = await response.json();

  // 4. Create voice note record
  await createRecordedNote({
    orgId,
    type: selectedType,
    audioStorageId: storageId,
    date: new Date().toISOString(),
  });
};
```

### Key Component: `settings-tab.tsx`

**Trust Level Slider:**

```typescript
<TrustLevelSlider
  currentLevel={trustLevel.currentLevel}      // Earned level (0-3)
  earnedLevel={trustLevel.currentLevel}       // Same as current
  preferredLevel={trustLevel.preferredLevel}  // User-set cap
  onLevelChange={handleTrustPreferenceUpdate}
  progressToNext={{
    percentage,    // Progress to next level
    threshold,     // Approvals needed
    currentCount,  // Current approvals
  }}
/>
```

### Data Fetching Pattern

```typescript
// Real-time subscriptions via Convex useQuery
const voiceNotes = useQuery(
  api.models.voiceNotes.getVoiceNotesByCoach,
  coachId ? { orgId, coachId } : "skip"
);

const trustLevel = useQuery(
  api.models.coachTrustLevels.getCoachTrustLevel,
  { organizationId: orgId }
);

// Mutations for user actions
const updateInsightStatus = useMutation(
  api.models.voiceNotes.updateInsightStatus
);
```

---

## 6. AI Processing Pipeline

### Flow Diagram

```
┌─────────────────┐
│  Voice Note     │
│  Created        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Audio Note?    │─YES─► transcribeAudio │
└────────┬────────┘     │  (Whisper)      │
         │NO            └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Typed Note     │────►│  buildInsights  │
│  (has text)     │     │  (GPT-4o)       │
└─────────────────┘     └────────┬────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Update         │     │  Extract to     │     │  Check Auto-    │
│  voiceNotes     │     │  voiceNote-     │     │  Apply          │
│  .insights[]    │     │  Insights table │     │  Eligibility    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                              ┌───────────────┬──────────┴──────────┬───────────────┐
                              │               │                     │               │
                              ▼               ▼                     ▼               ▼
                    ┌─────────────┐  ┌─────────────┐      ┌─────────────┐  ┌─────────────┐
                    │  Generate   │  │  Create     │      │  Create     │  │  UPDATE     │
                    │  Parent     │  │  Coach Task │      │  Team       │  │  PLAYER     │
                    │  Summary    │  │  (TODO)     │      │ Observation │  │  PROFILE    │
                    └─────────────┘  └─────────────┘      └─────────────┘  └──────┬──────┘
                                                                                  │
                              ┌───────────────────────────────────────────────────┤
                              │                     │                             │
                              ▼                     ▼                             ▼
                    ┌─────────────────┐   ┌─────────────────┐          ┌─────────────────┐
                    │ skillAssessments│   │ playerInjuries  │          │  passportGoals  │
                    │ (skill_rating)  │   │ (injury)        │          │ (skill_progress)│
                    └─────────────────┘   └─────────────────┘          └─────────────────┘
```

### Player Profile Update Detail

When an insight is applied (auto or manual), the system updates the appropriate player profile table:

| Insight Category | Target Table | Fields Updated |
|------------------|--------------|----------------|
| `skill_rating` | `skillAssessments` | skillName, rating, notes, assessedBy |
| `injury` | `playerInjuries` | type, severity, description, reportedBy |
| `skill_progress` | `passportGoals` | title, description, status |
| `attendance` | `attendanceRecords` | status, notes |
| `performance` | `performanceNotes` | content, category |
| `behavior` | `behaviorNotes` | content, sentiment |

### `transcribeAudio` Action

**Location:** `packages/backend/convex/actions/voiceNotes.ts:142`

```typescript
export const transcribeAudio = internalAction({
  args: { noteId: v.id("voiceNotes") },
  handler: async (ctx, args) => {
    // 1. Get voice note and audio URL
    const note = await ctx.runQuery(internal.models.voiceNotes.getNote, { noteId });
    const audioUrl = await ctx.storage.getUrl(note.audioStorageId);

    // 2. Download audio
    const audioResponse = await fetch(audioUrl);
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

    // 3. Get model config (database or env fallback)
    const config = await getAIConfig(ctx, "voice_transcription", note.orgId);

    // 4. Transcribe with OpenAI Whisper
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const file = await OpenAI.toFile(audioBuffer, "voice-note.webm");
    const transcription = await client.audio.transcriptions.create({
      model: config.modelId,  // Default: whisper-1
      file,
    });

    // 5. Update note and schedule insight extraction
    await ctx.runMutation(internal.models.voiceNotes.updateTranscription, {
      noteId, transcription: transcription.text, status: "completed"
    });
    await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.buildInsights, { noteId });
  },
});
```

### `buildInsights` Action

**Location:** `packages/backend/convex/actions/voiceNotes.ts:237`

**Key Steps:**

1. **Get roster context** - Fetch players from coach's assigned teams
2. **Get team context** - Fetch coach's team list
3. **Get coach context** - For TODO assignment
4. **Build AI prompt** - Structured prompt with roster JSON
5. **Call GPT-4o** - Extract insights using Zod schema
6. **Resolve players** - Match AI names to roster IDs
7. **Update database** - Store insights in both tables
8. **Auto-apply check** - Apply eligible insights (Phase 7.3)
9. **Schedule summaries** - Generate parent summaries

**AI Insight Schema:**

```typescript
const insightSchema = z.object({
  summary: z.string(),
  insights: z.array(z.object({
    title: z.string(),
    description: z.string(),
    playerName: z.string().nullable(),
    playerId: z.string().nullable(),      // From roster
    category: z.string().nullable(),      // injury, skill_rating, etc.
    recommendedUpdate: z.string().nullable(),
    confidence: z.number().min(0).max(1), // AI confidence score
    teamId: z.string().nullable().optional(),
    teamName: z.string().nullable().optional(),
    assigneeUserId: z.string().nullable().optional(),
    assigneeName: z.string().nullable().optional(),
  })).min(0),
});
```

**Insight Categories:**

| Category | Description | Auto-Apply Eligible |
|----------|-------------|---------------------|
| `injury` | Physical injuries | ❌ Never (safety) |
| `medical` | Medical conditions | ❌ Never (safety) |
| `skill_rating` | Numeric skill rating | ✅ Yes |
| `skill_progress` | General skill improvement | ✅ Yes |
| `behavior` | Attitude/teamwork | ✅ Yes (maps to performance) |
| `performance` | Match/training performance | ✅ Yes |
| `attendance` | Presence/absence | ✅ Yes |
| `team_culture` | Team-wide observations | ❌ No (team-level) |
| `todo` | Coach action items | ❌ No (task, not player) |

### Player Matching Logic

**Location:** `packages/backend/convex/actions/voiceNotes.ts:847`

```typescript
function findMatchingPlayer(insight, players) {
  const searchName = insight.playerName;

  // 1. Match by AI-provided ID
  if (insight.playerId) {
    const matchById = players.find(p => p.playerIdentityId === insight.playerId);
    if (matchById) return matchById;
  }

  // 2. Exact full name match
  const exactMatch = players.find(p =>
    p.name.toLowerCase() === searchName.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // 3. First name only (if unique)
  const firstNameMatches = players.filter(p =>
    p.firstName.toLowerCase() === searchName.toLowerCase()
  );
  if (firstNameMatches.length === 1) return firstNameMatches[0];

  // 4. Partial match (if unique)
  const partialMatches = players.filter(p =>
    p.name.toLowerCase().includes(searchName.toLowerCase())
  );
  if (partialMatches.length === 1) return partialMatches[0];

  return undefined; // No match
}
```

---

## 7. Trust Level System (Phase 7)

### Trust Levels

| Level | Name | Approvals Required | Capabilities |
|-------|------|-------------------|--------------|
| 0 | Manual | 0 | All insights require manual review |
| 1 | Learning | 10+ | Quick review with AI suggestions |
| 2 | Trusted | 50+ | Auto-approve normal summaries |
| 3 | Expert | 200+ | Full automation (coach opt-in) |

### Upgrade Requirements

```typescript
// Level 1: 10+ approvals
if (totalApprovals >= 10) level = 1;

// Level 2: 50+ approvals AND <10% suppression rate
if (totalApprovals >= 50 && suppressionRate < 0.1) level = 2;

// Level 3: 200+ approvals AND explicit opt-in
if (totalApprovals >= 200 && hasOptedInToLevel3) level = 3;
```

### Effective Level Calculation

```typescript
// Effective level is the LOWER of earned and preferred
const effectiveLevel = Math.min(
  trustLevel.currentLevel,
  trustLevel.preferredLevel ?? trustLevel.currentLevel
);
```

### Auto-Apply Decision Flow

```
┌─────────────────┐
│  New Insight    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Is Pending?    │─NO──► Skip            │
└────────┬────────┘     └─────────────────┘
         │YES
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Is Injury/     │─YES─► Skip (safety)   │
│  Medical?       │     └─────────────────┘
└────────┬────────┘
         │NO
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Trust Level    │─NO──► Skip            │
│  >= 2?          │     └─────────────────┘
└────────┬────────┘
         │YES
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Confidence >=  │─NO──► Skip            │
│  Threshold?     │     └─────────────────┘
└────────┬────────┘
         │YES
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Category       │─NO──► Skip            │
│  Enabled?       │     └─────────────────┘
└────────┬────────┘
         │YES
         ▼
┌─────────────────┐
│  AUTO-APPLY     │
└─────────────────┘
```

### Undo Mechanism

- **Window:** 1 hour from auto-apply
- **Reasons:** wrong_player, wrong_rating, insight_incorrect, changed_mind, duplicate, other
- **Rollback:** Reverts player profile changes using `previousValue` from audit trail
- **Analytics:** `getUndoReasonStats` tracks patterns for AI improvement

---

## 8. Parent Communication Flow

### Dual Storage Model: Coach Private vs Parent Public

When insights are extracted from voice notes and involve a player, the system creates a **dual representation** in the `coachParentSummaries` table:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        coachParentSummaries Record                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────────┐  │
│  │       PRIVATE INSIGHT           │   │       PUBLIC SUMMARY            │  │
│  │       (Coach Only)              │   │       (Parent Facing)           │  │
│  │  ───────────────────────────    │   │  ───────────────────────────    │  │
│  │  title: "Knee injury during     │   │  content: "During today's       │  │
│  │          tackle drill"          │   │   session, Sarah took a small   │  │
│  │  description: "Sarah went down  │   │   knock to her knee. Coach has  │  │
│  │   hard in the tackle drill,     │   │   noted she's resting it and    │  │
│  │   limping, possible ligament    │   │   will monitor her progress."   │  │
│  │   concern. Needs physio eval."  │   │                                 │  │
│  │  category: "injury"             │   │  confidenceScore: 0.85          │  │
│  │  sentiment: "concern"           │   │  generatedAt: timestamp         │  │
│  └─────────────────────────────────┘   └─────────────────────────────────┘  │
│                                                                             │
│  sensitivityCategory: "injury"                                              │
│  status: "pending_review"  (injuries always need manual review)             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Private Insight (Coach Only)

Stored in `privateInsight` field - **never shown to parents**:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Short technical title from AI extraction |
| `description` | string | Full coaching details, may include sensitive info |
| `category` | string | injury, skill_rating, behavior, etc. |
| `sentiment` | enum | "positive", "neutral", "concern" |

**Use Cases:**
- Coach review queue
- Admin audit dashboard
- Internal reporting
- Historical coaching record

#### Public Summary (Parent Facing)

Stored in `publicSummary` field - **shown to parents after approval**:

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | AI-rewritten parent-friendly message |
| `confidenceScore` | number | AI confidence in the summary (0.0-1.0) |
| `generatedAt` | number | Timestamp when generated |

**AI Rewriting Rules:**
- Remove technical/medical jargon
- Use encouraging, constructive tone
- Never include severity assessments for injuries
- Focus on what parents can do to help
- Omit coach-specific action items

#### Why Dual Storage?

1. **Privacy Protection:** Coaches can document sensitive observations without exposing them to parents
2. **Tone Adaptation:** AI generates appropriate messaging for different audiences
3. **Audit Trail:** Original coach insight is preserved for accountability
4. **Review Control:** Coach sees full context when deciding to approve/suppress

#### Access Control

| User Role | Can See Private Insight | Can See Public Summary |
|-----------|------------------------|------------------------|
| Coach (owner) | ✅ Yes | ✅ Yes |
| Admin (org) | ✅ Yes (audit) | ✅ Yes |
| Parent | ❌ Never | ✅ Only if approved/delivered |

### Summary Generation Pipeline

```
┌─────────────────┐
│  Insight with   │
│  Player Match   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  processVoiceNoteInsight (Action)           │
│  ─────────────────────────────────────────  │
│  1. Check parent summaries enabled          │
│  2. Check skip sensitive (injury/behavior)  │
│  3. Get player's sport passport             │
│  4. Classify sensitivity (AI)               │
│  5. Generate parent-friendly summary (AI)   │
│  6. Create coachParentSummaries record      │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Auto-Approve   │
│  Decision       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────────┐
│ Manual │  │ Auto-      │
│ Review │  │ Approved   │
└────────┘  └─────┬──────┘
                  │
                  ▼
            ┌────────────┐
            │ 1-Hour     │
            │ Revoke     │
            │ Window     │
            └─────┬──────┘
                  │
                  ▼
            ┌────────────┐
            │ Delivered  │
            │ to Parent  │
            └────────────┘
```

### Summary Status Flow

```
pending_review → approved → delivered → viewed
                    │
                    └─► suppressed (coach rejected)

auto_approved → delivered → viewed
      │
      └─► suppressed (coach revoked within 1 hour)
```

### Sensitivity Classification

| Category | Description | Auto-Approve Eligible |
|----------|-------------|----------------------|
| `normal` | Standard feedback | ✅ Yes (Level 2+) |
| `injury` | Physical injury mention | ❌ Never (requires checklist) |
| `behavior` | Behavioral concerns | ❌ Never (manual review) |

---

## 9. Coach Notes Privacy Architecture

This section provides a comprehensive overview of how coach voice notes remain **private by default** and the technical mechanisms that enforce data isolation.

### Privacy Principles

1. **Coach Ownership:** Voice notes belong to the coach who created them
2. **Explicit Sharing Only:** Nothing reaches parents without coach approval
3. **Organization Isolation:** Notes are scoped to a single organization
4. **Role-Based Access:** Different users see different data based on their role
5. **Audit Trail:** All access and approvals are logged

### Data Isolation Model

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           VOICE NOTE PRIVACY LAYERS                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  LAYER 1: Organization Isolation                                                 │
│  ─────────────────────────────────                                               │
│  All voice notes filtered by orgId - coaches only see notes from their org       │
│                                                                                  │
│  LAYER 2: Coach Ownership                                                        │
│  ────────────────────────                                                        │
│  Within an org, coaches only see their OWN notes (filtered by coachId)          │
│  Exception: Admins can see all notes for audit purposes                          │
│                                                                                  │
│  LAYER 3: Insight Privacy                                                        │
│  ─────────────────────────                                                       │
│  Raw insights (voiceNotes.insights[]) are NEVER exposed to parents               │
│  Only AI-sanitized publicSummary can reach parents                               │
│                                                                                  │
│  LAYER 4: Approval Gate                                                          │
│  ─────────────────────────                                                       │
│  Parent summaries require explicit approval (manual or auto with trust)          │
│  Coach can suppress any summary at any time                                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Technical Implementation

#### 1. Coach Ownership Filter (Query Level)

All voice note queries enforce coach ownership. Here's the implementation:

**File:** `packages/backend/convex/models/voiceNotes.ts`

```typescript
// getVoiceNotesByCoach - Primary coach query
export const getVoiceNotesByCoach = query({
  args: {
    orgId: v.string(),
    coachId: v.string(),
  },
  handler: async (ctx, args) => {
    // PRIVACY: Filter by BOTH orgId AND coachId
    const notes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId_and_coachId", (q) =>
        q.eq("orgId", args.orgId).eq("coachId", args.coachId)
      )
      .collect();

    return notes;
  },
});
```

**Key Point:** The index `by_orgId_and_coachId` ensures efficient filtering at the database level, not application level.

#### 2. Frontend Coach ID Injection

The frontend automatically injects the current user's ID:

**File:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx`

```typescript
// Coach ID comes from authenticated session
const { data: session } = authClient.useSession();
const coachId = session?.user?.id;

// Query is skipped if no session (prevents unauthorized access)
const voiceNotes = useQuery(
  api.models.voiceNotes.getVoiceNotesByCoach,
  coachId ? { orgId, coachId } : "skip"  // ← "skip" if not authenticated
);
```

#### 3. Mutation Authorization

All mutations verify coach ownership:

**File:** `packages/backend/convex/models/voiceNotes.ts`

```typescript
export const updateInsightStatus = mutation({
  args: {
    noteId: v.id("voiceNotes"),
    insightId: v.string(),
    status: v.union(v.literal("applied"), v.literal("dismissed")),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // 2. Get the voice note
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Voice note not found");

    // 3. PRIVACY CHECK: Verify ownership
    if (note.coachId !== user.userId && note.coachId !== user._id) {
      throw new Error("Not authorized to modify this voice note");
    }

    // 4. Proceed with update...
  },
});
```

#### 4. Parent Summary Authorization

Parent summaries have strict ownership checks:

**File:** `packages/backend/convex/models/coachParentSummaries.ts`

```typescript
export const approveSummary = mutation({
  args: { summaryId: v.id("coachParentSummaries") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const userId = user?.userId || user?._id;

    const summary = await ctx.db.get(args.summaryId);

    // STRICT OWNERSHIP: Only the creating coach can approve
    if (summary.coachId !== userId) {
      throw new Error(
        "Only the coach who created this note can approve this summary"
      );
    }

    // Proceed with approval...
  },
});
```

### What Each Role Can See

#### Coach (Owner)

| Data | Access | Location |
|------|--------|----------|
| Own voice notes | ✅ Full | `voiceNotes` table |
| Own insights (raw) | ✅ Full | `voiceNotes.insights[]` |
| Own insights (table) | ✅ Full | `voiceNoteInsights` table |
| Own parent summaries | ✅ Full | `coachParentSummaries` |
| Other coaches' notes | ❌ None | N/A |
| Player profiles (assigned teams) | ✅ Read | Various tables |

**Frontend Routes:**
- `/orgs/[orgId]/coach/voice-notes` - Main dashboard
- Only shows notes where `coachId === session.user.id`

#### Admin (Organization)

| Data | Access | Location |
|------|--------|----------|
| All org voice notes | ✅ Read-only | `voiceNotes` table |
| All org insights | ✅ Read-only | `voiceNoteInsights` table |
| All org summaries | ✅ Read-only | `coachParentSummaries` |
| Cannot approve/dismiss | ❌ No mutations | N/A |

**Frontend Route:**
- `/orgs/[orgId]/admin/voice-notes` - Audit dashboard

**Implementation:**

```typescript
// getAllVoiceNotes - Admin audit query
export const getAllVoiceNotes = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    // Verify user is admin (checked via Better Auth org membership)
    const member = await verifyOrgMembership(ctx, args.orgId);
    if (member.role !== "owner" && member.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Return ALL notes for the org (no coachId filter)
    return ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});
```

#### Parent

| Data | Access | Location |
|------|--------|----------|
| Voice notes | ❌ Never | N/A |
| Raw insights | ❌ Never | N/A |
| Private insight text | ❌ Never | N/A |
| Public summary (approved) | ✅ Read | `coachParentSummaries.publicSummary` |
| Summary status | ✅ Limited | Only own children's summaries |

**Frontend Route:**
- `/orgs/[orgId]/parent/dashboard` - Parent dashboard
- Messages tab shows approved summaries only

**Implementation:**

```typescript
// Parent can only see summaries for their linked children
export const getParentSummariesByChildAndSport = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    // 1. Find guardian identity for this user
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!guardianIdentity) return [];

    // 2. Get linked players (children)
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", guardianIdentity._id)
      )
      .collect();

    // 3. For each child, get ONLY approved/delivered summaries
    // Parents NEVER see pending_review or suppressed
    for (const link of links) {
      const summaries = await ctx.db
        .query("coachParentSummaries")
        .withIndex("by_player_org_status", (q) =>
          q.eq("playerIdentityId", link.playerIdentityId)
           .eq("organizationId", args.organizationId)
           .eq("status", "approved")  // ← Only approved
        )
        .collect();

      // Return ONLY publicSummary, never privateInsight
      return summaries.map(s => ({
        ...s,
        privateInsight: undefined,  // ← Explicitly removed
      }));
    }
  },
});
```

### Data Flow: What Parents See vs What Coaches See

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         SAME INSIGHT, DIFFERENT VIEWS                         │
└──────────────────────────────────────────────────────────────────────────────┘

COACH SEES (Full Context):
┌──────────────────────────────────────────────────────────────────────────────┐
│ Voice Note #1234                                                             │
│ Date: Jan 26, 2026 | Type: Training | Status: Completed                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Transcription:                                                               │
│ "Good session tonight. Sarah Malone took a knock to her ankle during the     │
│ tackle drill, looks like a minor sprain. She was limping but walked it off.  │
│ I'm concerned about her form lately, might be overtraining. Need to chat     │
│ with her parents about reducing her schedule."                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ Insights Extracted:                                                          │
│                                                                              │
│ [INJURY] Sarah Malone - Ankle Sprain                                         │
│ Description: Minor ankle sprain during tackle drill, limping observed        │
│ Recommended: Rest and ice, monitor for 48 hours                              │
│ Confidence: 0.89                                                             │
│ Status: [Apply] [Dismiss]                                                    │
│                                                                              │
│ [BEHAVIOR] Sarah Malone - Overtraining Concern                               │
│ Description: Coach concerned about form degradation, possible overtraining   │
│ Recommended: Discuss reduced schedule with parents                           │
│ Confidence: 0.72                                                             │
│ Status: [Apply] [Dismiss]                                                    │
└──────────────────────────────────────────────────────────────────────────────┘

PARENT SEES (Sanitized Summary - ONLY after coach approves):
┌──────────────────────────────────────────────────────────────────────────────┐
│ Message from Coach                                                           │
│ Jan 26, 2026                                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ "Hi! Just wanted to let you know that Sarah had a good training session      │
│ tonight. She did take a small knock to her ankle during one of the drills,   │
│ but she's doing fine. You might want to keep an eye on it and let her rest   │
│ if needed. See you at the next session!"                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Mark as Read] [View Sarah's Passport]                                       │
└──────────────────────────────────────────────────────────────────────────────┘

WHAT PARENT NEVER SEES:
❌ Original voice note transcription
❌ "minor sprain" severity assessment
❌ "limping observed" clinical observation
❌ "overtraining concern" behavioral flag
❌ "discuss reduced schedule" internal recommendation
❌ AI confidence scores
❌ Insight categories (injury, behavior)
```

### Privacy-Critical Code Paths

| Operation | File | Function | Privacy Check |
|-----------|------|----------|---------------|
| View notes | `voiceNotes.ts` | `getVoiceNotesByCoach` | `coachId` filter in index |
| View all (admin) | `voiceNotes.ts` | `getAllVoiceNotes` | Role check |
| Apply insight | `voiceNotes.ts` | `updateInsightStatus` | `note.coachId === userId` |
| Approve summary | `coachParentSummaries.ts` | `approveSummary` | `summary.coachId === userId` |
| Suppress summary | `coachParentSummaries.ts` | `suppressSummary` | `summary.coachId === userId` |
| Revoke auto-approved | `coachParentSummaries.ts` | `revokeSummary` | `summary.coachId === userId` |
| Parent view summary | `coachParentSummaries.ts` | `getParentSummariesByChildAndSport` | Guardian-player link check |

### Database Indexes for Privacy

These indexes enforce privacy at the database level:

```typescript
// voiceNotes table
.index("by_orgId", ["orgId"])                    // Org isolation
.index("by_orgId_and_coachId", ["orgId", "coachId"])  // Coach ownership

// voiceNoteInsights table
.index("by_coach_org_status", ["coachId", "organizationId", "status"])

// coachParentSummaries table
.index("by_coach_org_status", ["coachId", "organizationId", "status"])  // Coach view
.index("by_player_org_status", ["playerIdentityId", "organizationId", "status"])  // Parent view
```

### Security Guarantees

| Guarantee | Implementation |
|-----------|----------------|
| Coach A cannot see Coach B's notes | Index filter + no cross-coach queries |
| Parents cannot see raw insights | `privateInsight` never returned to parent queries |
| Parents cannot see pending summaries | Status filter: only `approved`/`delivered` |
| Admins cannot modify coach notes | No admin mutations, read-only access |
| Unauthenticated users see nothing | All queries require `authComponent.safeGetAuthUser` |

---

## 10. Data Flow Diagrams

### Voice Note Creation Flow

```
User Records Audio
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│ Frontend: new-note-tab.tsx                                │
│ 1. MediaRecorder captures audio                           │
│ 2. generateUploadUrl() gets storage URL                   │
│ 3. Upload blob to Convex storage                          │
│ 4. createRecordedNote() with storageId                    │
└───────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│ Backend: voiceNotes.createRecordedNote                    │
│ 1. Insert voiceNotes record                               │
│ 2. Schedule transcribeAudio action                        │
└───────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│ Backend: voiceNotes.transcribeAudio (Action)              │
│ 1. Fetch audio from storage                               │
│ 2. Call OpenAI Whisper API                                │
│ 3. Update voiceNotes.transcription                        │
│ 4. Schedule buildInsights action                          │
└───────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│ Backend: voiceNotes.buildInsights (Action)                │
│ 1. Get player roster for coach's teams                    │
│ 2. Build AI prompt with roster context                    │
│ 3. Call GPT-4o for insight extraction                     │
│ 4. Match players by name/ID                               │
│ 5. Update voiceNotes.insights[] (embedded)                │
│ 6. Insert voiceNoteInsights records (table)               │
│ 7. Check auto-apply eligibility                           │
│ 8. Schedule parent summary generation                     │
└───────────────────────────────────────────────────────────┘
```

### Insight Application Flow

```
Coach Reviews Insight
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│ Frontend: insights-tab.tsx                                │
│ User clicks "Apply" or "Dismiss"                          │
└───────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│ Backend: voiceNotes.updateInsightStatus                   │
│ 1. Update voiceNotes.insights[] status                    │
│ 2. Update voiceNoteInsights table status                  │
│ 3. If "applied" with skill_rating:                        │
│    - Parse skill name and rating                          │
│    - Update/create skillAssessments record                │
│ 4. If "applied" with injury:                              │
│    - Create playerInjuries record                         │
│ 5. If "applied" with goal:                                │
│    - Create passportGoals record                          │
│ 6. Update trust metrics (approval count)                  │
└───────────────────────────────────────────────────────────┘
```

---

## 11. AI Prompts & Insight Processing Deep Dive

This section provides low-level detail on the AI prompts, inputs, outputs, and how insights are applied to player profiles.

### 11.1 Complete Processing Pipeline with All Checks

The insight extraction and parent summary generation involves multiple stages with various checks. Here's the complete flow:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE VOICE NOTE PROCESSING PIPELINE                       │
└─────────────────────────────────────────────────────────────────────────────────┘

STAGE 1: INSIGHT EXTRACTION (buildInsights action)
─────────────────────────────────────────────────
┌─────────────────┐
│ Voice Note      │
│ Created         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CHECK: Does note have coachId?                                  │
│ ─────────────────────────────                                   │
│ YES → Fetch players from COACH'S ASSIGNED TEAMS only            │
│ NO  → Fetch ALL players in org (legacy/WhatsApp notes)          │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ GATHER CONTEXT FOR AI PROMPT                                    │
│ ─────────────────────────────                                   │
│ 1. Player roster (from coach's teams)                           │
│ 2. Coach's assigned teams (for team_culture matching)           │
│ 3. Fellow coaches roster (for TODO assignment)                  │
│ 4. Recording coach details (default TODO assignee)              │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CALL GPT-4o: Extract Insights                                   │
│ ─────────────────────────────                                   │
│ Input: transcription + roster context + teams + coaches         │
│ Output: summary + insights[]                                    │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ POST-PROCESSING                                                 │
│ ─────────────────                                               │
│ 1. Match player names to roster IDs (findMatchingPlayer)        │
│ 2. Deduplicate by playerIdentityId                              │
│ 3. Store in voiceNotes.insights[] (embedded)                    │
│ 4. Store in voiceNoteInsights table (Phase 7)                   │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CHECK: Auto-Apply Eligibility (Phase 7.3)                       │
│ ─────────────────────────────────────────                       │
│ For each insight:                                               │
│   - Is trust level >= 2?                                        │
│   - Is confidence >= threshold?                                 │
│   - Is category enabled in preferences?                         │
│   - Is NOT injury/medical?                                      │
│ If all YES → Auto-apply to player profile                       │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CHECK: Parent Summaries Enabled?                                │
│ ─────────────────────────────────                               │
│ Query: isParentSummariesEnabled(coachId, orgId)                 │
│ If NO → Skip parent summary generation entirely                 │
└────────┬────────────────────────────────────────────────────────┘
         │ YES
         ▼
STAGE 2: PARENT SUMMARY GENERATION (for each player-linked insight)


STAGE 2: PARENT SUMMARY GENERATION (processVoiceNoteInsight action)
──────────────────────────────────────────────────────────────────
┌─────────────────┐
│ Insight with    │
│ playerIdentityId│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CHECK 1: Rate Limit (US-009)                                    │
│ ──────────────────────────────                                  │
│ Query: checkRateLimit(organizationId)                           │
│ Purpose: Prevent abuse or runaway loops                         │
│ If exceeded → EXIT (no AI call, no cost)                        │
└────────┬────────────────────────────────────────────────────────┘
         │ OK
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CHECK 2: Budget Limit (US-004)                                  │
│ ──────────────────────────────                                  │
│ Query: checkOrgCostBudget(organizationId)                       │
│ Purpose: Fail fast if daily/monthly budget exceeded             │
│ If exceeded → Log event, EXIT (no AI call)                      │
└────────┬────────────────────────────────────────────────────────┘
         │ OK
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ AI CALL: Classify Sensitivity (Claude Haiku)                    │
│ ─────────────────────────────────────────────                   │
│ Input: insightTitle + insightDescription                        │
│ Output: { category: "normal"|"injury"|"behavior",               │
│           confidence: 0.0-1.0, reason: string }                 │
│ Circuit breaker: Returns fallback if AI service down            │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CHECK 3: Skip Sensitive Insights?                               │
│ ─────────────────────────────────                               │
│ If category is "injury" or "behavior":                          │
│   Query: shouldSkipSensitiveInsights(coachId, orgId)            │
│   If YES → EXIT (coach opted out of sensitive summaries)        │
└────────┬────────────────────────────────────────────────────────┘
         │ Continue
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ GATHER CONTEXT                                                  │
│ ──────────────────                                              │
│ 1. Get player info (name, DOB)                                  │
│ 2. Get player's sport passport                                  │
│ 3. Get organization name                                        │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ AI CALL: Generate Parent Summary (Claude Haiku)                 │
│ ─────────────────────────────────────────────                   │
│ Input: privateInsight + playerName + sportContext               │
│ Output: Parent-friendly summary text                            │
│ Rules: No jargon, encouraging tone, no severity ratings         │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CREATE coachParentSummaries RECORD                              │
│ ──────────────────────────────────                              │
│ - Store privateInsight (coach only)                             │
│ - Store publicSummary (parent facing)                           │
│ - Set sensitivityCategory                                       │
│ - Set initial status                                            │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ DECISION: Auto-Approve? (Trust Level System)                    │
│ ─────────────────────────────────────────────                   │
│ decideAutoApproval(trustLevel, summaryProps):                   │
│   - Is trust level >= 2? (required)                             │
│   - Is sensitivity "normal"? (injury/behavior → always manual)  │
│   - Is confidence >= threshold? (default 0.7)                   │
│                                                                 │
│ If all YES:                                                     │
│   - status = "auto_approved"                                    │
│   - scheduledDeliveryAt = now + 1 hour (revoke window)          │
│ If NO:                                                          │
│   - status = "pending_review" (manual approval required)        │
└─────────────────────────────────────────────────────────────────┘
```

### 11.2 Pre-Processing Checks Detail

Before any AI processing occurs, multiple safeguards are checked:

#### Rate Limiting (`checkRateLimit`)

**File:** `packages/backend/convex/models/rateLimits.ts`

| Check | Limit | Reset |
|-------|-------|-------|
| Summaries per minute | 10 | Rolling window |
| Summaries per hour | 100 | Rolling window |
| Summaries per day | 500 | Midnight UTC |

```typescript
// Returns { allowed: boolean, reason?: string, resetAt?: number }
const rateCheck = await ctx.runQuery(
  internal.models.rateLimits.checkRateLimit,
  { organizationId }
);
```

#### Budget Limiting (`checkOrgCostBudget`)

**File:** `packages/backend/convex/models/orgCostBudgets.ts`

| Budget Type | Default | Configurable |
|-------------|---------|--------------|
| Daily limit | $5.00 | Per-org |
| Monthly limit | $50.00 | Per-org |

```typescript
// Returns { withinBudget: boolean, reason?: "daily_exceeded"|"monthly_exceeded" }
const budgetCheck = await ctx.runQuery(
  internal.models.orgCostBudgets.checkOrgCostBudget,
  { organizationId }
);
```

#### Circuit Breaker (`shouldCallAPI`)

**File:** `packages/backend/convex/lib/circuitBreaker.ts`

Prevents cascading failures when AI services are down:

| State | Behavior |
|-------|----------|
| CLOSED | Normal operation, calls allowed |
| OPEN | Failures exceeded threshold, calls blocked |
| HALF_OPEN | Testing recovery, limited calls |

```typescript
if (!shouldCallAPI(serviceHealth)) {
  // Return fallback classification instead of calling AI
  return { category: "normal", confidence: 0.5, isFallback: true };
}
```

#### Skip Sensitive Insights Check

**File:** `packages/backend/convex/models/coachTrustLevels.ts`

Coach preference to skip injury/behavior summaries entirely:

```typescript
// If coach has skipSensitiveInsights enabled and insight is injury/behavior
if (classification.category === "injury" || classification.category === "behavior") {
  const shouldSkip = await ctx.runQuery(
    internal.models.coachTrustLevels.shouldSkipSensitiveInsights,
    { coachId, organizationId }
  );
  if (shouldSkip) return null; // No summary created
}
```

### 11.3 Insight Extraction: Input/Output Specification

#### Input to `buildInsights` Action

**File:** `packages/backend/convex/actions/voiceNotes.ts:237`

| Input | Type | Source | Description |
|-------|------|--------|-------------|
| `noteId` | `Id<"voiceNotes">` | Scheduler | Voice note to process |
| `transcription` | `string` | `voiceNotes.transcription` | Text from Whisper or typed input |
| `players` | `Array<PlayerFromOrg>` | `getPlayersForCoachTeamsInternal` | Roster of players from coach's teams |
| `teamsList` | `Array<Team>` | Better Auth teams query | Coach's assigned teams |
| `coachesRoster` | `Array<Coach>` | `getFellowCoachesForTeams` | Coaches for TODO assignment |

**Player Object Structure:**

```typescript
type PlayerFromOrg = {
  _id: Id<"playerIdentities">;
  playerIdentityId: Id<"playerIdentities">;
  firstName: string;
  lastName: string;
  name: string;           // Full name: "firstName lastName"
  ageGroup: string;       // e.g., "U14", "Senior"
  sport: string | null;   // e.g., "GAA", "Soccer"
};
```

#### The AI Prompt (Actual System Prompt)

```
You are an expert sports coaching assistant that analyzes coach voice notes
and extracts actionable insights.

Your task is to:
1. Summarize the key points from the voice note
2. Extract specific insights about individual players or the team
3. Match player names to the roster when possible
4. Categorize insights:
   - injury: physical injuries, knocks, strains (PLAYER-SPECIFIC)
   - skill_rating: when coach mentions a specific numeric rating/score (PLAYER-SPECIFIC)
   - skill_progress: general skill improvement without numeric ratings (PLAYER-SPECIFIC)
   - behavior: attitude, effort, teamwork issues (PLAYER-SPECIFIC)
   - performance: match/training performance observations (PLAYER-SPECIFIC)
   - attendance: presence/absence at sessions (PLAYER-SPECIFIC)
   - team_culture: team morale, culture, collective behavior (TEAM-WIDE, no player)
   - todo: action items the coach needs to do - NOT about players
5. Suggest concrete actions the coach should take

CATEGORIZATION RULES:
- If it's about a specific player → must have playerName
- If it's about the whole team → use team_culture, playerName should be null
- If it's a task/action for the coach → use todo, playerName should be null
- skill_rating: include the rating number in recommendedUpdate (e.g., "Set to 3/5")

Team Roster (JSON array - players):
${rosterContext}

Coach's Teams (JSON array):
${teamsList}

Coaches on Same Teams (JSON array - for TODO assignment):
${coachesRoster}

CRITICAL PLAYER MATCHING INSTRUCTIONS:
- When you identify a player name in the voice note, find them in the roster JSON
- Compare to "fullName" field first (exact or partial match)
- If only first name mentioned, check "firstName" in roster
- When match found, copy EXACT "id" field value into playerId
- If no match, set playerId to null but still include playerName
```

#### Expected Output (Zod Schema)

```typescript
const insightSchema = z.object({
  summary: z.string().describe("A brief summary of the voice note content"),
  insights: z.array(
    z.object({
      title: z.string().describe("A short title for the insight"),
      description: z.string().describe("Detailed description of the insight"),
      playerName: z.string().nullable().describe("Name of the player, if any"),
      playerId: z.string().nullable().describe("ID from roster, if matched"),
      category: z.string().nullable().describe(
        "Category: injury, skill_rating, skill_progress, behavior, performance, attendance, team_culture, todo"
      ),
      recommendedUpdate: z.string().nullable().describe(
        "Suggested action based on this insight"
      ),
      confidence: z.number().min(0).max(1).describe(
        "AI confidence score (0.0-1.0). 1.0 = explicit statement, 0.6-0.7 = inference"
      ),
      teamId: z.string().nullable().optional().describe("Team ID for team_culture"),
      teamName: z.string().nullable().optional().describe("Team name for team_culture"),
      assigneeUserId: z.string().nullable().optional().describe("Coach ID for TODO"),
      assigneeName: z.string().nullable().optional().describe("Coach name for TODO"),
    })
  ).min(0),
});
```

#### Example AI Input/Output

**Input Transcription:**
```
"Good training session tonight. Clodagh Barlow's hand pass has really improved,
I'd give her a 4 out of 5 now. Sarah took a knock to her ankle, nothing serious
but keep an eye on it. The U14 girls showed great team spirit. I need to order
new training cones before next week."
```

**AI Output:**
```json
{
  "summary": "Positive training session with individual skill progress noted, minor injury, good team morale, and equipment need identified.",
  "insights": [
    {
      "title": "Hand pass improvement",
      "description": "Clodagh Barlow's hand pass skill has significantly improved",
      "playerName": "Clodagh Barlow",
      "playerId": "mx7fsvhh9m9v8qayeetcjvn5g17y95dv",
      "category": "skill_rating",
      "recommendedUpdate": "Set hand_pass skill rating to 4/5",
      "confidence": 0.95,
      "teamId": null,
      "teamName": null,
      "assigneeUserId": null,
      "assigneeName": null
    },
    {
      "title": "Ankle injury",
      "description": "Sarah took a knock to her ankle during training, described as minor",
      "playerName": "Sarah",
      "playerId": null,
      "category": "injury",
      "recommendedUpdate": "Monitor ankle, apply RICE protocol if needed",
      "confidence": 0.88,
      "teamId": null,
      "teamName": null,
      "assigneeUserId": null,
      "assigneeName": null
    },
    {
      "title": "Team spirit",
      "description": "U14 girls demonstrated excellent team spirit and cohesion",
      "playerName": null,
      "playerId": null,
      "category": "team_culture",
      "recommendedUpdate": "Continue encouraging team bonding activities",
      "confidence": 0.82,
      "teamId": "team_u14_female_123",
      "teamName": "U14 Female",
      "assigneeUserId": null,
      "assigneeName": null
    },
    {
      "title": "Order training cones",
      "description": "Coach needs to order new training cones before next week's session",
      "playerName": null,
      "playerId": null,
      "category": "todo",
      "recommendedUpdate": "Order training cones",
      "confidence": 0.98,
      "teamId": null,
      "teamName": null,
      "assigneeUserId": "coach_user_id_123",
      "assigneeName": "Coach Neil"
    }
  ]
}
```

### 11.4 Player Profile Update Implementation

When an insight is applied (manually or auto-applied), the system updates the player's profile. Here's the detailed implementation:

#### Skill Rating Application

**Trigger:** `category === "skill_rating"`

**Code Path:** `voiceNotes.ts → updateInsightStatus → applySkillRatingInsight`

```typescript
// Parse skill name and rating from insight
// Example: "Set hand_pass skill rating to 4/5"
const skillMatch = insight.recommendedUpdate?.match(
  /(?:set|update)?\s*(\w+)\s*(?:skill)?\s*(?:rating)?\s*(?:to)?\s*(\d)(?:\/5)?/i
);

if (skillMatch && insight.playerIdentityId) {
  const [, skillName, ratingStr] = skillMatch;
  const rating = parseInt(ratingStr, 10);

  // Find existing skill assessment or create new
  const existingAssessment = await ctx.db
    .query("skillAssessments")
    .withIndex("by_player_skill", (q) =>
      q.eq("playerIdentityId", insight.playerIdentityId)
       .eq("skillName", skillName.toLowerCase())
    )
    .first();

  if (existingAssessment) {
    // Update existing
    await ctx.db.patch(existingAssessment._id, {
      rating,
      notes: insight.description,
      assessedBy: userId,
      assessedAt: Date.now(),
      source: "voice_note",
      voiceNoteId: noteId,
    });
  } else {
    // Create new
    await ctx.db.insert("skillAssessments", {
      playerIdentityId: insight.playerIdentityId,
      organizationId: note.orgId,
      skillName: skillName.toLowerCase(),
      rating,
      notes: insight.description,
      assessedBy: userId,
      assessedAt: Date.now(),
      source: "voice_note",
      voiceNoteId: noteId,
    });
  }
}
```

**Fields Updated in `skillAssessments`:**

| Field | Value Source | Description |
|-------|--------------|-------------|
| `playerIdentityId` | `insight.playerIdentityId` | Player being assessed |
| `skillName` | Parsed from `recommendedUpdate` | e.g., "hand_pass", "tackling" |
| `rating` | Parsed from `recommendedUpdate` | 1-5 scale |
| `notes` | `insight.description` | AI-generated description |
| `assessedBy` | `userId` (coach) | Who applied the insight |
| `source` | `"voice_note"` | Origin tracking |
| `voiceNoteId` | `noteId` | Link back to source |

#### Injury Application

**Trigger:** `category === "injury"`

**Code Path:** `voiceNotes.ts → updateInsightStatus → applyInjuryInsight`

```typescript
if (insight.category === "injury" && insight.playerIdentityId) {
  // Create injury record
  await ctx.db.insert("playerInjuries", {
    playerIdentityId: insight.playerIdentityId,
    organizationId: note.orgId,
    type: parseInjuryType(insight.description),  // "ankle", "knee", etc.
    severity: "minor",  // Default, coach can edit
    description: insight.description,
    reportedBy: userId,
    reportedAt: Date.now(),
    status: "active",
    source: "voice_note",
    voiceNoteId: noteId,
  });
}
```

**Fields Created in `playerInjuries`:**

| Field | Value Source | Description |
|-------|--------------|-------------|
| `playerIdentityId` | `insight.playerIdentityId` | Injured player |
| `type` | Parsed from description | Body part/injury type |
| `severity` | Default `"minor"` | Coach can edit later |
| `description` | `insight.description` | Full AI description |
| `status` | `"active"` | Injury tracking status |
| `source` | `"voice_note"` | Origin tracking |

#### Goal/Progress Application

**Trigger:** `category === "skill_progress"` (general improvement, not numeric)

**Code Path:** `voiceNotes.ts → updateInsightStatus → applyGoalInsight`

```typescript
if (insight.category === "skill_progress" && insight.playerIdentityId) {
  await ctx.db.insert("passportGoals", {
    playerIdentityId: insight.playerIdentityId,
    organizationId: note.orgId,
    title: insight.title,
    description: insight.description,
    status: "in_progress",
    createdBy: userId,
    createdAt: Date.now(),
    source: "voice_note",
    voiceNoteId: noteId,
  });
}
```

#### TODO Task Application

**Trigger:** `category === "todo"`

**Code Path:** `voiceNotes.ts → updateInsightStatus → applyTodoInsight`

```typescript
if (insight.category === "todo") {
  const taskId = await ctx.db.insert("coachTasks", {
    organizationId: note.orgId,
    assigneeUserId: insight.assigneeUserId || userId,  // Default to recording coach
    assigneeName: insight.assigneeName,
    title: insight.title,
    description: insight.description,
    status: "pending",
    priority: "normal",
    createdBy: userId,
    createdAt: Date.now(),
    source: "voice_note",
    voiceNoteId: noteId,
  });

  // Link task back to insight
  await updateInsight(noteId, insightId, { linkedTaskId: taskId });
}
```

#### Team Observation Application

**Trigger:** `category === "team_culture"`

**Code Path:** `voiceNotes.ts → updateInsightStatus → applyTeamObservation`

```typescript
if (insight.category === "team_culture") {
  await ctx.db.insert("teamObservations", {
    organizationId: note.orgId,
    teamId: insight.teamId,  // May be null (unassigned)
    teamName: insight.teamName,
    title: insight.title,
    description: insight.description,
    sentiment: inferSentiment(insight.description),  // positive/neutral/concern
    observedBy: userId,
    observedAt: Date.now(),
    source: "voice_note",
    voiceNoteId: noteId,
  });
}
```

### 11.5 Complete Insight Application Matrix

| Category | Target Table | Creates New | Updates Existing | Fields Set |
|----------|--------------|-------------|------------------|------------|
| `skill_rating` | `skillAssessments` | ✅ If no prior | ✅ If exists | rating, notes, assessedBy, assessedAt |
| `injury` | `playerInjuries` | ✅ Always | ❌ | type, severity, description, status |
| `skill_progress` | `passportGoals` | ✅ Always | ❌ | title, description, status |
| `behavior` | `behaviorNotes` | ✅ Always | ❌ | content, sentiment |
| `performance` | `performanceNotes` | ✅ Always | ❌ | content, category |
| `attendance` | `attendanceRecords` | ✅ Always | ❌ | status, notes |
| `team_culture` | `teamObservations` | ✅ Always | ❌ | title, description, sentiment |
| `todo` | `coachTasks` | ✅ Always | ❌ | title, description, assignee |

#### Visual: Insight → Player Passport Mapping

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    VOICE NOTE INSIGHT → PLAYER PASSPORT FLOW                     │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   VOICE NOTE     │
│ "Clodagh's hand  │
│  pass is now 4/5,│
│  ankle knock..."  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ AI EXTRACTION (buildInsights)                                                    │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐                   │
│ │ Insight #1       │ │ Insight #2       │ │ Insight #3       │                   │
│ │ skill_rating     │ │ injury           │ │ team_culture     │                   │
│ │ "Hand pass 4/5"  │ │ "Ankle knock"    │ │ "Great spirit"   │                   │
│ │ player: Clodagh  │ │ player: Clodagh  │ │ player: null     │                   │
│ │ confidence: 0.95 │ │ confidence: 0.88 │ │ confidence: 0.82 │                   │
│ └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘                   │
└──────────┼───────────────────┼───────────────────┼───────────────────────────────┘
           │                   │                   │
           ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ skillAssessments │ │ playerInjuries   │ │ teamObservations │
│ ────────────────│ │ ────────────────│ │ ────────────────│
│ playerIdentityId │ │ playerIdentityId │ │ teamId           │
│ skillName: hand_ │ │ type: ankle      │ │ title: Great     │
│   pass           │ │ severity: minor  │ │   spirit         │
│ rating: 4        │ │ description:...  │ │ sentiment:       │
│ assessedBy:coach │ │ reportedBy:coach │ │   positive       │
│ source: voice_   │ │ source: voice_   │ │ source: voice_   │
│   note           │ │   note           │ │   note           │
│ voiceNoteId: xxx │ │ voiceNoteId: xxx │ │ voiceNoteId: xxx │
└────────┬─────────┘ └────────┬─────────┘ └──────────────────┘
         │                   │
         ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    PLAYER PASSPORT                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CLODAGH BARLOW                                          │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │                                                         │ │
│ │ SKILLS                        │ INJURIES                │ │
│ │ ┌─────────────────────────┐   │ ┌─────────────────────┐ │ │
│ │ │ Hand Pass    ████░ 4/5  │   │ │ Ankle (minor)       │ │ │
│ │ │ Solo Run     ███░░ 3/5  │   │ │ Jan 26, 2026        │ │ │
│ │ │ Tackling     ███░░ 3/5  │   │ │ Status: Active      │ │ │
│ │ └─────────────────────────┘   │ └─────────────────────┘ │ │
│ │                               │                         │ │
│ │ GOALS                         │ ATTENDANCE              │ │
│ │ ┌─────────────────────────┐   │ ┌─────────────────────┐ │ │
│ │ │ Improve first touch     │   │ │ Sessions: 12/15     │ │ │
│ │ │ Status: In Progress     │   │ │ Rate: 80%           │ │ │
│ │ └─────────────────────────┘   │ └─────────────────────┘ │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

TRACEABILITY:
─────────────
• Each passport record has `source: "voice_note"` + `voiceNoteId`
• Enables "View source" links from passport back to original note
• Auto-applied insights also stored in `autoAppliedInsights` for audit
```

#### Data Lineage

```
Voice Note ──► voiceNotes.insights[] ──► voiceNoteInsights table
                                                │
                                    ┌───────────┴───────────┐
                                    │                       │
                              (if applied)            (if auto-applied)
                                    │                       │
                                    ▼                       ▼
                            Target Table            autoAppliedInsights
                         (skillAssessments,         (audit trail with
                          playerInjuries,            previousValue for
                          passportGoals, etc.)       undo capability)
```

### 11.6 Auto-Applied Insight Audit Trail

When an insight is auto-applied, a record is created in `autoAppliedInsights`:

```typescript
await ctx.db.insert("autoAppliedInsights", {
  insightId: insight._id,
  voiceNoteId: noteId,
  playerIdentityId: insight.playerIdentityId,
  coachId: note.coachId,
  organizationId: note.orgId,
  category: insight.category,
  confidenceScore: insight.confidenceScore,
  insightTitle: insight.title,
  insightDescription: insight.description,
  appliedAt: Date.now(),
  autoAppliedByAI: true,

  // For rollback support
  changeType: insight.category,           // e.g., "skill_rating"
  targetTable: "skillAssessments",        // Table that was modified
  targetRecordId: newRecordId,            // ID of created/updated record
  fieldChanged: "rating",                 // Specific field changed
  previousValue: existingRating?.toString(), // For undo
  newValue: newRating.toString(),         // What was set
});
```

---

## 12. Limitations & Improvement Opportunities

### 12.1 Current Limitations

#### Player Matching Limitations

| Limitation | Impact | Current Workaround |
|------------|--------|-------------------|
| **First-name only ambiguity** | If 2 players share a first name, AI can't disambiguate | Returns `playerId: null`, coach assigns manually |
| **Nickname handling** | "Tommy" won't match "Thomas" | No automatic nickname resolution |
| **Spelling variations** | "Clodagh" vs "Cloda" | Partial match attempts, often fails |
| **Non-roster players** | Guest players, trial players | Creates insight without player link |

**Improvement Opportunity:**
- Implement fuzzy matching with Levenshtein distance
- Add nickname aliases to player profiles
- Train custom embedding model for name matching

#### AI Confidence Calibration

| Limitation | Impact |
|------------|--------|
| **Uncalibrated scores** | 0.85 confidence doesn't mean 85% accurate |
| **Category-blind** | Same threshold for injuries vs performance |
| **No feedback loop** | Undo reasons don't retrain the model |

**Improvement Opportunity:**
- Implement calibration based on coach override patterns
- Per-category thresholds based on historical accuracy
- Fine-tune model on club-specific vocabulary

#### Transcription Quality

| Limitation | Impact |
|------------|--------|
| **Irish accents** | Whisper trained on American/British English |
| **GAA terminology** | "Solo run", "hand pass" may be misheard |
| **Background noise** | Training sessions are noisy environments |
| **Short notes** | <5 second notes often fail |

**Improvement Opportunity:**
- Fine-tune Whisper on Irish sports audio
- Add GAA glossary to post-processing
- Implement noise reduction pre-processing

#### Privacy & Consent

| Limitation | Impact |
|------------|--------|
| **No player consent tracking** | Can't verify player agreed to be in notes |
| **No GDPR data export** | No automated export of all player mentions |
| **Retention policy** | No automatic deletion of old notes |

**Improvement Opportunity:**
- Add consent management per player
- Implement GDPR-compliant data export
- Add configurable retention policies

### 12.2 Scalability Limitations

| Area | Current Limit | Bottleneck |
|------|---------------|------------|
| **Roster size** | ~200 players | Prompt length (GPT-4o context) |
| **Concurrent notes** | No explicit limit | OpenAI rate limits |
| **Transcription length** | 25MB audio | Whisper file size limit |
| **Insights per note** | No limit | Response parsing time |

**Improvement Opportunity:**
- Implement roster chunking for large clubs
- Add queue system with rate limiting
- Support long-form audio via chunking

### 12.3 UX Limitations

| Limitation | User Impact |
|------------|-------------|
| **No offline recording** | Can't record without network |
| **No edit transcription** | Can't fix AI mishearing |
| **No bulk operations** | Must apply insights one by one |
| **No templates** | Can't save common note structures |

**Improvement Opportunity:**
- Implement offline-first with sync
- Add transcription editing UI
- Add "Apply All" for trusted coaches
- Add note templates for session types

### 12.4 Integration Gaps

| Gap | Impact |
|-----|--------|
| **No calendar integration** | Can't auto-tag session date/type |
| **No video link** | Can't attach video clips to insights |
| **No parent app** | Parents must use web dashboard |
| **No notification system** | Parents not notified of new summaries |

**Improvement Opportunity:**
- Integrate with Google/Outlook calendars
- Add video attachment support
- Build native parent mobile app
- Implement push notifications

### 12.5 Recommended Priority Improvements

| Priority | Improvement | Effort | Impact |
|----------|-------------|--------|--------|
| 🔴 High | Fuzzy name matching | Medium | Reduces manual assignment by ~40% |
| 🔴 High | Transcription editing | Low | Improves data quality |
| 🟡 Medium | Offline recording | High | Enables sideline notes |
| 🟡 Medium | Push notifications | Medium | Parent engagement |
| 🟢 Low | Video attachments | High | Enhanced context |
| 🟢 Low | GDPR export | Medium | Compliance |

### 12.6 Known Technical Debt

| Area | Debt | Risk |
|------|------|------|
| **Dual storage** | Insights in both `voiceNotes.insights[]` AND `voiceNoteInsights` table | Data sync bugs |
| **Legacy `playerId`** | Old string field alongside new `playerIdentityId` | Confusion |
| **Hardcoded thresholds** | Trust levels (10, 50, 200) not configurable | Inflexibility |
| **No retry logic** | OpenAI failures not retried | Lost notes |

**Recommended Actions:**
1. Migrate fully to `voiceNoteInsights` table, deprecate embedded array
2. Remove `playerId` field after migration
3. Move thresholds to `aiModelConfig` table
4. Add exponential backoff retry for AI calls

---

## 13. Key Files Reference

### Backend Files

| File | Purpose |
|------|---------|
| `packages/backend/convex/models/voiceNotes.ts` | Core queries/mutations |
| `packages/backend/convex/models/voiceNoteInsights.ts` | Insight table management |
| `packages/backend/convex/models/coachTrustLevels.ts` | Trust system |
| `packages/backend/convex/models/coachParentSummaries.ts` | Parent communication |
| `packages/backend/convex/actions/voiceNotes.ts` | AI processing |
| `packages/backend/convex/actions/coachParentSummaries.ts` | Summary generation |
| `packages/backend/convex/lib/trustLevelCalculator.ts` | Trust calculation |
| `packages/backend/convex/lib/autoApprovalDecision.ts` | Auto-approve logic |
| `packages/backend/convex/schema.ts` | Database schema (lines 1368-1556) |

### Frontend Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/orgs/[orgId]/coach/voice-notes/page.tsx` | Entry point |
| `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx` | Main dashboard |
| `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/new-note-tab.tsx` | Recording UI |
| `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx` | Insights review |
| `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx` | Trust settings |
| `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/auto-approved-tab.tsx` | Sent summaries |
| `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/review-tab.tsx` | Parent summaries |
| `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/history-tab.tsx` | Note history |
| `apps/web/src/app/orgs/[orgId]/admin/voice-notes/page.tsx` | Admin audit view |
| `apps/web/src/components/coach/trust-level-slider.tsx` | Trust UI component |

### Related Documentation

| File | Purpose |
|------|---------|
| `docs/features/voice-notes.md` | Feature overview |
| `docs/features/voice-notes-three-lens-architecture.md` | Three-lens design |
| `docs/testing/whatsapp-voice-notes-uat.md` | WhatsApp testing |
| `docs/bugs/CRITICAL_PRIVACY_AUDIT_voice_insights.md` | Privacy audit |

---

## 14. Troubleshooting Guide

### Common Issues

#### 1. Player Not Matched

**Symptom:** Insight has `playerName` but no `playerIdentityId`

**Causes:**
- Player not in coach's assigned teams
- Name mismatch (nickname vs official name)
- Multiple players with same first name (ambiguous)

**Debug:**
```typescript
// Check console logs in buildInsights action
console.warn(`[Player Matching] ❌ No match for "${searchName}"`);
```

**Fix:**
- Manually assign player via UI
- Ensure coach is assigned to correct teams
- Use full name in voice notes

#### 2. Transcription Failed

**Symptom:** `transcriptionStatus: "failed"`

**Causes:**
- Audio file too short/silent
- Unsupported format
- OpenAI API error

**Debug:**
```typescript
// Check transcriptionError field
console.error("Transcription failed:", error);
```

**Fix:**
- Retry recording with longer/clearer audio
- Check OpenAI API status
- Verify OPENAI_API_KEY env var

#### 3. Insights Not Extracted

**Symptom:** `insightsStatus: "failed"` or empty insights array

**Causes:**
- Transcription is empty/unclear
- AI couldn't parse meaningful content
- API error

**Debug:**
```typescript
// Check insightsError field
console.error("Failed to build insights:", error);
```

**Fix:**
- Provide more structured verbal input
- Mention player names clearly
- Retry with clearer transcription

#### 4. Auto-Apply Not Working

**Symptom:** Insights stay "pending" despite meeting criteria

**Debug Checklist:**
1. Is trust level >= 2?
2. Is confidence score >= threshold (default 0.7)?
3. Is category enabled in preferences?
4. Is category NOT injury/medical?
5. Is insight status "pending"?

**Console Logs:**
```typescript
console.log(`[Auto-Apply] ❌ NOT ELIGIBLE: ${insight.title} (${reasons.join(", ")})`);
```

#### 5. Parent Summary Not Generated

**Symptom:** No summary in `coachParentSummaries`

**Causes:**
- Parent summaries disabled in settings
- Skip sensitive enabled (for injury/behavior)
- Player not matched to insight
- Player has no linked guardians

**Debug:**
```typescript
// Check if parentSummariesEnabled
const enabled = await ctx.runQuery(
  internal.models.coachTrustLevels.isParentSummariesEnabled,
  { coachId, organizationId }
);
```

### Performance Considerations

1. **Index Usage:** All queries use `.withIndex()` - never use `.filter()` on large datasets
2. **Roster Deduplication:** Players are deduplicated by `playerIdentityId` before AI processing
3. **Batch Operations:** Insights are processed in a single AI call, not individually
4. **Scheduled Jobs:** Heavy AI processing is done in scheduled actions, not blocking mutations

### Security Notes

1. **Coach Scoping:** Coaches can only see/modify their own voice notes
2. **Trust Verification:** Auto-apply validates trust level server-side
3. **Parent Access:** Parents can only view summaries for their linked children
4. **Injury Safeguard:** Injury/medical insights NEVER auto-apply
5. **1-Hour Revoke:** Auto-approved summaries can be revoked before delivery

### Known Production Issues (GitHub Issue #355)

These issues were identified during production testing and should be verified/addressed:

#### 1. Team-Based Filtering Bug

**Issue:** Team Insights tab shows ALL voice notes from a coach instead of only notes relevant to shared teams.

**Expected:** If Coach A and Coach B share Team X but not Team Y, Coach B should only see Coach A's notes about Team X players.

**Current:** Coach B sees all of Coach A's notes regardless of team.

**Root Cause:** Query `getVoiceNotesForCoachTeams` may not be filtering correctly by shared team membership.

**Location:** `packages/backend/convex/models/voiceNotes.ts` - `getVoiceNotesForCoachTeams`

#### 2. Action Attribution Display Error

**Issue:** Voice notes with TODO insights show incorrect coach attribution in Team Insights and My Tasks views.

**Expected:** Action should show "Assigned by Coach A to Coach B"

**Current:** Attribution displays incorrectly or missing

**Location:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/team-insights-tab.tsx`

#### 3. Help Modal System

**Status:** ✅ Implemented

A help modal displays on first coach access to the voice notes feature, providing guided onboarding.

**Location:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/` (help modal component)

**Future Enhancement:** Consider guided training feature to help coaches effectively use voice functionality with interactive tutorials.

### Cross-Reference: Original Requirements

The following items from the original planning (Issue #355) are now documented:

| Original Item | Section in This Document |
|---------------|-------------------------|
| Real-time capture feedback | Section 16.5 (Audio Storage) |
| Admin insights on performance | Section 15 (Admin Observability) |
| Coach controls for parent messaging | Section 18 (Prompt Flexibility) |
| Learning/feedback loop for coaches | Section 17 (Coach Learning) |
| Insights linking to passport | Section 11.5 (Visual Diagram) |
| Team collaboration hub | Section 19 (Collaboration Hub) |
| Coach AI visibility gap | Section 20 (Coach Impact Visibility) |
| Tab visibility documentation | Referenced: `COMPLETE_TAB_REFERENCE.md` |

---

## 15. Admin Observability & Platform Analytics

This section covers what insights and analytics are available to organization admins and platform staff for monitoring voice notes performance, coach usage, costs, and system health.

### 15.1 Current Admin Capabilities

#### Voice Notes Audit Dashboard

**Location:** `/orgs/[orgId]/admin/voice-notes/page.tsx`

**Query:** `getAllVoiceNotes` (up to 1,000 most recent notes)

| Data Point | Description | Use Case |
|------------|-------------|----------|
| Transcription status | pending/processing/completed/failed | Identify processing issues |
| Transcription errors | Error message if failed | Debug failures |
| Insights status | pending/processing/completed/failed | Track AI extraction success |
| Insights count | Number of insights extracted | Measure value generation |
| Source channel | app_recorded/app_typed/whatsapp_audio/text | Understand input patterns |
| Coach attribution | Which coach created the note | Usage by coach |

**Filter Capabilities:**
- By note type (training, match, general)
- By transcription text search
- By insight content and player names
- Date range (coming soon)
- Coach filter (coming soon)

### 15.2 AI Usage & Cost Tracking

**Backend Files:**
- `models/aiUsageLog.ts` - Per-call logging
- `models/aiUsageDailyAggregates.ts` - Daily rollup (100x faster queries)

#### Per-API-Call Metrics

| Metric | Description | Available From |
|--------|-------------|----------------|
| `operation` | voice_transcription, voice_insights, sensitivity_classification, parent_summary | All calls |
| `inputTokens` | Tokens sent to AI | All calls |
| `cachedTokens` | Tokens served from cache | Anthropic only |
| `outputTokens` | Tokens received | All calls |
| `cost` | USD cost for this call | All calls |
| `coachId` | Which coach triggered | All calls |
| `playerId` | Player context (optional) | Player-specific calls |

#### Organization-Level Analytics

**Query:** `getOrgUsage(organizationId, dateRange)`

```typescript
{
  totalCost: number,           // Total USD spent
  totalCalls: number,          // API call count
  tokenBreakdown: {
    input: number,
    cached: number,
    output: number,
  },
  averageCacheHitRate: number, // 0.0-1.0
  byOperation: {               // Cost breakdown by feature
    voice_transcription: { cost, calls },
    voice_insights: { cost, calls },
    parent_summary: { cost, calls },
    // ...
  },
  topCoachesByCost: [          // Top 5 coaches
    { coachId, coachName, cost, callCount },
  ],
  topPlayersByMentions: [      // Top 5 players in insights
    { playerId, playerName, cost, callCount },
  ],
}
```

#### Platform-Level Analytics (Staff Only)

**Query:** `getPlatformUsage(dateRange)`

```typescript
{
  totalCost: number,
  totalOrganizations: number,
  byOrganization: [            // Top 10 orgs
    { orgId, orgName, cost, callCount },
  ],
  dailyTrend: [                // For charting
    { date, cost, calls },
  ],
}
```

### 15.3 Cost Budgeting & Alerts

**Backend File:** `models/orgCostBudgets.ts`

#### Budget Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `dailyBudgetUsd` | $5.00 | Daily spend limit |
| `monthlyBudgetUsd` | $50.00 | Monthly spend limit |
| `alertThresholdPercent` | 80% | When to warn admins |
| `enabled` | true | Whether budget enforced |

#### Budget Enforcement Flow

```
┌─────────────────┐
│ AI Call Request │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ checkOrgCostBudget(organizationId)      │
│ ─────────────────────────────────────── │
│ Returns:                                │
│   withinBudget: boolean                 │
│   dailyRemaining: number                │
│   monthlyRemaining: number              │
│   reason: "daily_exceeded" | "monthly_exceeded" | null │
└────────┬────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────────────────────────┐
│ ALLOW  │  │ BLOCK + logBudgetExceeded  │
│ Call   │  │ (no AI cost incurred)      │
└────────┘  └────────────────────────────┘
```

#### Automatic Alerts

**Backend File:** `models/platformCostAlerts.ts`

**Cron:** Every 10 minutes

| Alert Type | Trigger | Severity |
|------------|---------|----------|
| `org_daily_threshold` | 80% of daily budget | ⚠️ Warning |
| `org_daily_exceeded` | 100% of daily budget | 🔴 Critical |
| `org_monthly_threshold` | 80% of monthly budget | ⚠️ Warning |
| `org_monthly_exceeded` | 100% of monthly budget | 🔴 Critical |

**Deduplication:** Same alert not created within 60 minutes

### 15.4 Processing Failures & Service Health

**Backend File:** `models/aiServiceHealth.ts`

#### Circuit Breaker Pattern

| State | Description | Behavior |
|-------|-------------|----------|
| `closed` | Healthy | All calls proceed |
| `open` | Too many failures | Calls blocked, return fallback |
| `half_open` | Testing recovery | Limited calls allowed |

#### Health Metrics

```typescript
{
  status: "healthy" | "degraded" | "down",
  circuitBreakerState: "closed" | "open" | "half_open",
  lastSuccessAt: timestamp,
  lastFailureAt: timestamp,
  recentFailureCount: number,
  failureWindowMs: number,      // Default: 60000 (1 minute)
}
```

**Admin Functions:**
- `getPlatformServiceHealth()` - View current health (platform staff only)
- `forceResetCircuitBreaker()` - Manual reset when service recovers

### 15.5 Coach Correction & Override Analytics

**Backend File:** `models/coachOverrideAnalytics.ts`

#### What Corrections Are Tracked

| Override Type | Trigger | What It Tells You |
|---------------|---------|-------------------|
| `coach_approved_low_confidence` | Coach approved insight with confidence < threshold | AI being too conservative |
| `coach_rejected_high_confidence` | Coach dismissed high-confidence insight | AI making wrong predictions |
| `coach_edited` | Coach modified AI text | Summary tone/content issues |
| `coach_revoked_auto` | Coach undid auto-applied insight | Auto-apply too aggressive |

#### Analytics Query

**Query:** `getCoachOverridePatterns(organizationId, dateRange)`

```typescript
{
  totalOverrides: number,
  byType: {
    coach_approved_low_confidence: number,
    coach_rejected_high_confidence: number,
    coach_edited: number,
    coach_revoked_auto: number,
  },
  averageConfidenceWhenRejected: number,  // Helps tune threshold
  feedbackReasons: {
    wasInaccurate: number,
    wasTooSensitive: number,
    timingWasWrong: number,
    otherReason: number,
  },
  overrideRateByCategory: {
    normal: number,      // % overridden
    injury: number,
    behavior: number,
  },
}
```

#### Undo Reason Analytics

**Query:** `getUndoReasonStats(organizationId)`

```typescript
{
  totalUndone: number,
  byReason: {
    wrong_player: { count, percentage },
    wrong_rating: { count, percentage },
    insight_incorrect: { count, percentage },
    changed_mind: { count, percentage },
    duplicate: { count, percentage },
    other: { count, percentage },
  },
  recentUndone: [        // Last 10 for investigation
    { insightTitle, reason, undoneAt, coachName },
  ],
}
```

### 15.6 Coach Trust Level Distribution

**Backend File:** `models/coachTrustLevels.ts`

#### Trust Level Distribution Query

```typescript
// Proposed: getOrgTrustDistribution(organizationId)
{
  level0_manual: number,      // Coaches requiring manual review
  level1_learning: number,    // 10+ approvals
  level2_trusted: number,     // 50+ approvals, <10% suppression
  level3_expert: number,      // 200+ approvals, full automation
  averageApprovalRate: number,
  averageSuppressionRate: number,
}
```

#### Preview Mode Analytics (Phase 7.1)

Tracks "what would have auto-applied" vs "what coach actually did":

```typescript
{
  wouldAutoApplyInsights: number,
  coachAppliedThose: number,
  coachDismissedThose: number,
  agreementRate: number,       // (applied / wouldAutoApply) * 100
}
```

**Use Case:** High agreement rate → coach ready for Level 2 upgrade

### 15.7 Key Admin Tables Reference

| Table | Purpose | Key Metrics |
|-------|---------|-------------|
| `aiUsageLog` | Per-call cost tracking | cost, tokens, operation, coachId |
| `aiUsageDailyAggregates` | Fast 30-day views | dailyCost, dailyCalls |
| `orgCostBudgets` | Budget enforcement | currentDailySpend, currentMonthlySpend |
| `platformCostAlerts` | Threshold notifications | alertType, severity, triggered |
| `aiServiceHealth` | API health | status, circuitBreakerState |
| `aiModelConfig` | Model settings | modelId, temperature, maxTokens |
| `aiModelConfigLog` | Config audit trail | previousValue, newValue, changedBy |
| `voiceNoteInsights` | Insight analytics | status, wouldAutoApply, confidenceScore |
| `autoAppliedInsights` | Auto-apply audit | undoReason, previousValue, newValue |
| `coachTrustLevels` | Trust tracking | currentLevel, totalApprovals, levelHistory |
| `coachOrgPreferences` | Per-org settings | parentSummariesEnabled, skipSensitive |

### 15.8 System Tuning Insights

#### How to Use Analytics for Improvement

| Observation | What It Means | Action |
|-------------|---------------|--------|
| High `coach_rejected_high_confidence` | AI too aggressive | Lower confidence threshold |
| High `coach_approved_low_confidence` | AI too conservative | Raise confidence threshold |
| Many `wrong_player` undos | Name matching failing | Improve fuzzy matching |
| High `coach_edited` rate | Summary tone wrong | Adjust parent summary prompt |
| Budget exceeded frequently | Heavy usage or runaway | Review per-coach usage |
| Circuit breaker opening | AI service issues | Check provider status |
| Low cache hit rate | Prompt not stable | Stabilize prompt templates |

#### Recommended Monitoring Dashboards

**Org Admin Dashboard (To Build):**
1. Voice notes created (daily trend)
2. AI cost (daily trend)
3. Success rate (transcription + insights)
4. Coach leaderboard (notes created, insights applied)
5. Common insight categories
6. Override/correction rate

**Platform Staff Dashboard (To Build):**
1. Total platform cost (daily trend)
2. Org cost distribution
3. Service health status
4. Model performance comparison
5. Alert history

### 15.9 Current Gaps & Improvement Opportunities

| Gap | Impact | Priority |
|-----|--------|----------|
| **No dedicated voice notes analytics page** | Admins must query raw data | 🔴 High |
| **No historical trend charts** | Can't see patterns over time | 🔴 High |
| **No export functionality** | Can't do offline analysis | 🟡 Medium |
| **No transcription quality metrics** | Can't measure Whisper accuracy | 🟡 Medium |
| **No per-feature cost breakdown in UI** | Hard to optimize spending | 🟡 Medium |
| **No insight accuracy validation** | Can't measure AI correctness | 🟢 Low |
| **No confidence score distribution** | Can't tune thresholds visually | 🟢 Low |

### 15.10 Implementation Files

| File | Line Count | Key Functions |
|------|------------|---------------|
| `models/aiUsageLog.ts` | ~400 | `logAIUsage`, `getOrgUsage`, `getPlatformUsage` |
| `models/orgCostBudgets.ts` | ~300 | `checkOrgCostBudget`, `updateOrgDailySpend` |
| `models/platformCostAlerts.ts` | ~250 | `checkAndCreateAlerts`, `acknowledgeAlert` |
| `models/aiServiceHealth.ts` | ~200 | `recordSuccess`, `recordFailure`, `shouldCallAPI` |
| `models/aiModelConfig.ts` | ~350 | `getConfigForFeature`, `updateModelConfig` |
| `models/coachOverrideAnalytics.ts` | ~200 | `getCoachOverridePatterns`, `trackOverride` |

---

## 16. Audio Storage Architecture

This section covers how audio recordings are stored, accessed, and managed.

### 16.1 Storage Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIO STORAGE FLOW                            │
└─────────────────────────────────────────────────────────────────┘

Coach Records Audio
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND: MediaRecorder API                                     │
│ - Format: audio/webm                                            │
│ - Collects audio in chunks                                      │
│ - Creates Blob on stop                                          │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ CONVEX STORAGE (generateUploadUrl → POST blob)                  │
│ - Direct browser upload via signed URL                          │
│ - Returns storageId: Id<"_storage">                             │
│ - No server relay (efficient)                                   │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ DATABASE: voiceNotes.audioStorageId                             │
│ - Links note to storage blob                                    │
│ - Source: app_recorded | whatsapp_audio                         │
└─────────────────────────────────────────────────────────────────┘
```

### 16.2 File Formats

| Source | MIME Type | Extension | Notes |
|--------|-----------|-----------|-------|
| App Recording | `audio/webm` | `.webm` | Browser MediaRecorder default |
| WhatsApp Audio | `audio/ogg` | `.ogg` | WhatsApp native format |

### 16.3 Current Capabilities

| Capability | Status | Notes |
|------------|--------|-------|
| Upload from browser | ✅ Implemented | Direct to Convex storage |
| Storage reference | ✅ Implemented | `audioStorageId` in voiceNotes |
| Delete with note | ✅ Implemented | `deleteVoiceNote()` cleans up |
| Audio playback | ❌ Not implemented | No player UI |
| Download audio | ❌ Not implemented | `getUrl()` available but unused |
| Retention policy | ❌ Not implemented | Indefinite storage |
| Storage quotas | ❌ Not implemented | No limits |

### 16.4 Potential Uses for Stored Audio

| Use Case | Description | Implementation Effort |
|----------|-------------|----------------------|
| **Playback Review** | Coach listens to original recording | Low - add audio player |
| **Re-transcription** | Re-process with better model | Low - call transcribeAudio again |
| **Quality Audit** | Admin reviews transcription accuracy | Medium - add comparison UI |
| **Training Data** | Improve Whisper for Irish accents | High - export pipeline |
| **Compliance** | GDPR data export | Medium - bulk download |
| **Dispute Resolution** | Verify what was actually said | Low - playback access |

### 16.5 Recording UI Feedback (Current State)

**Location:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/new-note-tab.tsx`

| Feedback | Status | Description |
|----------|--------|-------------|
| Button color change | ✅ | Green → Red when recording |
| Pulsing animation | ✅ | Red ring pulses during recording |
| Status badge | ✅ | "Recording... tap to stop" |
| Upload indicator | ✅ | "Uploading..." with spinner |
| **Waveform visualization** | ❌ | No audio amplitude display |
| **Audio level meter** | ❌ | No real-time level feedback |
| **Duration counter** | ❌ | No recording time shown |

### 16.6 Gaps & Recommendations

#### Audio Playback (High Priority)

```typescript
// Proposed: Add to voice note detail view
const audioUrl = await ctx.storage.getUrl(note.audioStorageId);

// Frontend component
<audio controls src={audioUrl}>
  Your browser does not support audio playback.
</audio>
```

#### Waveform Visualization (Medium Priority)

Would require:
1. Web Audio API `AnalyserNode` for frequency data
2. Canvas or SVG rendering for waveform
3. Real-time update during recording

#### Retention Policy (High Priority)

```typescript
// Proposed schema addition
voiceNotes: defineTable({
  // ... existing fields
  retentionExpiresAt: v.optional(v.number()),  // TTL timestamp
})

// Proposed cron job (daily)
export const cleanupExpiredAudio = internalMutation({
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("voiceNotes")
      .withIndex("by_retention_expires")
      .filter(q => q.lt(q.field("retentionExpiresAt"), Date.now()))
      .collect();

    for (const note of expired) {
      if (note.audioStorageId) {
        await ctx.storage.delete(note.audioStorageId);
      }
      // Keep note record but mark audio deleted
      await ctx.db.patch(note._id, {
        audioStorageId: undefined,
        audioDeletedAt: Date.now(),
      });
    }
  },
});
```

---

## 17. Coach Learning & Feedback Loop

This section covers how coaches can learn from the system's corrections and how the system learns from coach behavior.

### 17.1 Current Feedback Mechanisms

#### What's Tracked When Coaches Correct AI

| Action | Data Captured | Table |
|--------|--------------|-------|
| Approve low-confidence insight | confidenceScore, category | `coachOverrideAnalytics` |
| Reject high-confidence insight | confidenceScore, reason | `coachOverrideAnalytics` |
| Edit AI-generated text | before/after text | `coachOverrideAnalytics` |
| Undo auto-applied insight | undoReason, previousValue | `autoAppliedInsights` |
| Reassign player | wrongPlayer → correctPlayer | `voiceNotes` |
| Change category | wrongCategory → correctCategory | `voiceNotes` |

#### Trust Level Progression

Coaches see their trust level in Settings tab:

```
Level 0 (Manual) ──► Level 1 (Learning) ──► Level 2 (Trusted) ──► Level 3 (Expert)
                    10 approvals           50 approvals          200 approvals
                                           <10% suppression       opt-in required
```

### 17.2 What Coaches Currently See

| Feedback | Location | Status |
|----------|----------|--------|
| Trust level | Settings tab | ✅ Visible |
| Progress to next level | Settings tab | ✅ Visible (%) |
| Total approvals | Settings tab | ✅ Visible |
| Suppression rate | Settings tab | ❌ Not shown |
| Correction history | Nowhere | ❌ Not implemented |
| AI accuracy for their notes | Nowhere | ❌ Not implemented |
| Examples of applied insights | Nowhere | ❌ Not implemented |

### 17.3 Proposed Coach Learning Dashboard

#### Correction Summary View

```
┌─────────────────────────────────────────────────────────────────┐
│ YOUR AI ACCURACY                                    Last 30 Days │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │     87%      │  │     12       │  │      3       │           │
│  │  Agreement   │  │  Corrections │  │  Undos       │           │
│  │    Rate      │  │   Made       │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  COMMON CORRECTIONS:                                             │
│  • Wrong player assigned (5x) - Try using full names            │
│  • Wrong category (4x) - AI confused skill_rating/skill_progress│
│  • Confidence too high (3x) - Threshold may need adjustment     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Applied Insights Examples

```
┌─────────────────────────────────────────────────────────────────┐
│ RECENT APPLIED INSIGHTS                              View All ► │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ✅ "Hand pass improved to 4/5" → Sarah's Passport               │
│    Applied: Jan 26, 2026 | Source: Training note                │
│    [View in Passport] [View Original Note]                      │
│                                                                  │
│ ✅ "Ankle knock during drill" → Sarah's Injury Record           │
│    Applied: Jan 26, 2026 | Source: Training note                │
│    [View Record] [View Original Note]                           │
│                                                                  │
│ ⏪ "Solo run rating 3/5" → UNDONE (wrong player)                │
│    Undone: Jan 25, 2026 | Original target: Clodagh              │
│    [View Original Note]                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 17.4 System Learning from Coach Behavior

#### Current AI Tuning Mechanisms

| Mechanism | Implementation | Status |
|-----------|---------------|--------|
| Per-coach confidence threshold | `insightConfidenceThreshold` in coachTrustLevels | ✅ Implemented |
| Threshold adjustment cron | `adjustInsightThresholds` (daily) | ✅ Implemented |
| Undo reason analytics | `getUndoReasonStats` | ✅ Implemented |
| Override pattern tracking | `coachOverrideAnalytics` | ✅ Implemented |
| **Prompt improvement from corrections** | Not implemented | ❌ Gap |
| **Per-coach vocabulary learning** | Not implemented | ❌ Gap |

#### Threshold Adjustment Logic

```typescript
// Daily cron adjusts coach's threshold based on behavior
export const adjustInsightThresholds = internalMutation({
  handler: async (ctx) => {
    // For each coach with sufficient data
    // If high override rate on high-confidence insights:
    //   → Raise their threshold (more conservative)
    // If low override rate and high agreement:
    //   → Lower their threshold (more automation)
  },
});
```

### 17.5 Improvement Opportunities

#### Coach-Facing Improvements

| Feature | Value | Effort |
|---------|-------|--------|
| **Correction history view** | Coach sees their corrections over time | Medium |
| **Applied insights gallery** | See examples of what went to passport | Medium |
| **Tips based on patterns** | "Try using full names for better matching" | Low |
| **Compare with other coaches** | Anonymous benchmarks | Medium |
| **Voice note best practices** | Guided examples of effective notes | Low |

#### System-Learning Improvements

| Feature | Value | Effort |
|---------|-------|--------|
| **Nickname learning** | "Tommy" → Thomas for this coach | Medium |
| **Sport-specific vocabulary** | Learn GAA terms from corrections | High |
| **Per-org prompt tuning** | Customize prompts per organization | Medium |
| **Correction → prompt feedback** | Auto-improve prompts from patterns | High |

### 17.6 Clickable Links: Insights ↔ Passport

#### Current State

| Navigation | Status |
|------------|--------|
| Insight → Player Passport | ❌ No direct link |
| Passport → Source Voice Note | ❌ No backlink |
| History → Applied Record | ❌ No navigation |
| Undo view → Original Insight | ❌ No link |

#### Proposed Implementation

```typescript
// In insight card component
<Link href={`/orgs/${orgId}/players/${playerIdentityId}/passport`}>
  View {playerName}'s Passport →
</Link>

// In passport skill assessment
{source === "voice_note" && (
  <Link href={`/orgs/${orgId}/coach/voice-notes?noteId=${voiceNoteId}`}>
    From voice note (Jan 26) →
  </Link>
)}

// In auto-applied insights view
<Link href={`/orgs/${orgId}/players/${playerIdentityId}/passport#skills`}>
  View applied change →
</Link>
```

---

## 18. Prompt Flexibility & Tone Controls

This section covers current prompt configuration and proposed flexibility.

### 18.1 Current Prompt Configuration

**Location:** `packages/backend/convex/actions/voiceNotes.ts` (lines 413-525)

| Aspect | Current State | Configurable? |
|--------|---------------|---------------|
| System prompt | Hardcoded in code | ❌ No |
| Categories | Hardcoded list | ❌ No |
| Matching instructions | Hardcoded | ❌ No |
| Confidence scoring guidance | Hardcoded | ❌ No |
| Sport-specific vocabulary | Not included | ❌ No |

### 18.2 AI Model Configuration (Exists)

**Location:** `packages/backend/convex/models/aiModelConfig.ts`

Currently configurable per feature:
- Model ID (gpt-4o, whisper-1, etc.)
- Max tokens
- Temperature
- Provider (openai, anthropic)

**Not configurable:**
- Prompt text itself
- Sport-specific terminology
- Tone preferences

### 18.3 Proposed: Parent Summary Tone Controls

#### Coach Preferences for Summary Style

```typescript
// Proposed addition to coachOrgPreferences
{
  coachId: string,
  organizationId: string,
  parentSummaryPreferences: {
    tone: "warm" | "professional" | "brief",  // Default: warm
    verbosity: "concise" | "detailed",        // Default: concise
    includeActionItems: boolean,              // Default: true
    includeEncouragement: boolean,            // Default: true
  },
}
```

#### Tone Examples

| Tone | Example Output |
|------|----------------|
| **Warm (default)** | "Hi! Great news - Sarah showed wonderful improvement in her hand pass today. She's really putting in the effort and it's paying off! 🌟" |
| **Professional** | "Sarah demonstrated measurable improvement in hand pass technique during today's session. Rating increased from 3/5 to 4/5." |
| **Brief** | "Sarah: Hand pass improved to 4/5. Good session." |

#### Verbosity Examples

| Verbosity | Example |
|-----------|---------|
| **Concise** | "Sarah's tackling has improved. Keep encouraging practice at home." |
| **Detailed** | "During today's training session, Sarah showed notable improvement in her tackling technique. She's now more confident going into challenges and her timing has improved significantly. At home, you might encourage her to watch some professional matches and notice how defenders position themselves before a tackle." |

### 18.4 Proposed: Prompt Template System

```typescript
// Proposed: promptTemplates table
promptTemplates: defineTable({
  feature: v.string(),           // "voice_insights", "parent_summary"
  scope: v.union(
    v.literal("platform"),       // Default for all
    v.literal("organization"),   // Org-specific override
  ),
  organizationId: v.optional(v.string()),
  promptText: v.string(),        // The actual prompt template
  variables: v.array(v.string()), // ["rosterContext", "teamsList"]
  isActive: v.boolean(),
  createdBy: v.string(),
  createdAt: v.number(),
})
```

#### Benefits

1. **A/B Testing:** Run different prompts to compare accuracy
2. **Sport Customization:** GAA vs Soccer vs Rugby terminology
3. **Org Preferences:** Formal clubs vs casual teams
4. **Rapid Iteration:** Change prompts without code deploy

### 18.5 Parent Communication Frequency Controls

#### Current State

- Summaries generated for every insight with a player
- No batching or throttling
- Coach must suppress individually

#### Proposed Controls

```typescript
// Addition to coachOrgPreferences
{
  parentCommunicationPreferences: {
    frequency: "every_insight" | "daily_digest" | "weekly_digest",
    minInsightsForDigest: 2,        // Don't send digest with just 1 item
    quietHours: {
      enabled: boolean,
      startHour: 21,                // 9 PM
      endHour: 8,                   // 8 AM
    },
    maxSummariesPerPlayerPerWeek: 5, // Prevent spam
  },
}
```

#### Frequency Options

| Option | Behavior | Use Case |
|--------|----------|----------|
| `every_insight` | Immediate (current behavior) | Engaged parents |
| `daily_digest` | Batch at 6 PM | Reduce notification fatigue |
| `weekly_digest` | Sunday evening summary | Casual communication |

---

## 19. Team Insights Collaboration Hub

This section explores how the Team Insights page can evolve into a comprehensive collaboration hub for coaches and support staff involved with a team.

### 19.1 Current Implementation

#### Two Team Insight Features

| Feature | Location | Purpose |
|---------|----------|---------|
| **Team Insights Tab** | Voice notes dashboard | Real-time collaborative insights from fellow coaches |
| **Team Insights Page** | `/coach/team-insights` | Persistent team observations and culture notes |

#### Current Capabilities

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       CURRENT TEAM INSIGHTS ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ TEAM INSIGHTS TAB (Voice Notes Dashboard)                                        │
│ ───────────────────────────────────────────────────────────────────────────────  │
│ • Voice notes from all coaches on shared teams                                   │
│ • Player-specific insights with attribution                                      │
│ • Apply/Dismiss actions for insights                                             │
│ • Filter by pending vs all, search by player                                     │
│ • Auto-discovery of fellow coaches via coachAssignments                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ TEAM INSIGHTS PAGE (/coach/team-insights)                                        │
│ ───────────────────────────────────────────────────────────────────────────────  │
│ • Persistent team observations (teamObservations table)                          │
│ • Team culture notes from voice notes                                            │
│ • Grouped by team with filtering                                                 │
│ • Source tracking (voice_note vs manual)                                         │
│ • Coach attribution and timestamps                                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Data Flow

```
Coach Records Voice Note
         │
         ▼
AI Extracts team_culture Insight
         │
         ▼
Coach Assigns to Team + Applies
         │
         ▼
teamObservations Record Created
         │
         ▼
Visible to All Coaches on That Team
```

### 19.2 Industry Best Practices Research

Based on analysis of leading sports collaboration platforms:

#### Communication Platforms

| Platform | Key Features | Relevance |
|----------|--------------|-----------|
| **[Teamworks](https://teamworks.com/)** | "Operating System for Sports" - unified platform for coordination, development, talent deployment | Enterprise-level integration model |
| **[Heja](https://heja.io/)** | Team messaging, family inclusion, carpool coordination | Community engagement |
| **[sportsYou](https://sportsyou.com/)** | Data-secure coach-athlete messaging, real-time communication | Privacy-first communication |
| **[Sportlyzer](https://www.sportlyzer.com/)** | Scheduling, attendance, performance tracking | Administrative efficiency |
| **[Luceo Sports](https://www.luceosports.com/)** | Dynamic playbooks, video telestration, coaching moments | Teaching & preparation tools |

#### Key Industry Trends (2025-2026)

| Trend | Description | Application to PlayerARC |
|-------|-------------|-------------------------|
| **AI-Driven Insights** | Real-time performance analytics, tactical assistants | Already have with voice notes AI |
| **Wearable Integration** | Health/workload tracking connected to platform | Future opportunity |
| **Unified Calendar** | Practice, games, tournaments in one view | Integration opportunity |
| **Dynamic Playbooks** | Interactive teaching materials | Session planning integration |
| **Real-time Overlays** | Speed, distance, heat maps during video | Video attachment feature |

### 19.3 Proposed Collaboration Hub Vision

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    TEAM COLLABORATION HUB - PROPOSED VISION                      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ TEAM: U14 Female                                         [Switch Team ▼]        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  INSIGHTS   │ │   TASKS     │ │  PLANNING   │ │  ACTIVITY   │               │
│  │    (12)     │ │    (5)      │ │   (Next:    │ │   FEED      │               │
│  │             │ │             │ │  Thu 6PM)   │ │             │               │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  RECENT INSIGHTS FROM COACHING TEAM                                              │
│  ─────────────────────────────────                                               │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ 🏃 Coach Sarah (Yesterday)                                                 │  │
│  │ "Great team spirit at training - the girls are really gelling"             │  │
│  │ [Team Culture] [Applied ✓]                                                 │  │
│  │ 💬 2 comments  👍 Coach Neil liked this                                    │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ ⚽ Coach Neil (2 days ago)                                                 │  │
│  │ "Clodagh's hand pass improved significantly - 4/5 now"                     │  │
│  │ [Skill Rating] [Player: Clodagh Barlow]                                    │  │
│  │ [View in Passport →]                                                       │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  TEAM ACTION ITEMS                                           [+ Add Task]       │
│  ─────────────────                                                               │
│  ☐ Order new training cones (Neil) - Due: Fri                                   │
│  ☐ Book pitch for challenge match (Sarah) - Due: Next Mon                       │
│  ☑ Update player medical forms (Neil) - Completed ✓                             │
│                                                                                  │
│  UPCOMING SESSIONS                                                               │
│  ─────────────────                                                               │
│  📅 Thu 23 Jan, 6:00 PM - Training @ Main Pitch                                 │
│     Coaches: Neil, Sarah | Players confirmed: 14/16                              │
│     [View Session Plan] [Add Notes]                                              │
│                                                                                  │
│  📅 Sat 25 Jan, 10:00 AM - Match vs Kilmacud                                    │
│     Coaches: Neil | Players confirmed: 12/16                                     │
│     [Prep Checklist] [View Opponent Notes]                                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 19.4 Proposed Features

#### 19.4.1 Insight Reactions & Comments

```typescript
// Proposed: insightReactions table
insightReactions: defineTable({
  insightId: v.string(),
  userId: v.string(),
  type: v.union(v.literal("like"), v.literal("helpful"), v.literal("flag")),
  createdAt: v.number(),
})

// Proposed: insightComments table
insightComments: defineTable({
  insightId: v.string(),
  voiceNoteId: v.id("voiceNotes"),
  userId: v.string(),
  userName: v.string(),
  content: v.string(),
  createdAt: v.number(),
})
```

**Value:** Coaches can discuss insights, ask clarifying questions, build on observations.

#### 19.4.2 Shared Task Management

```typescript
// Extend existing coachTasks table
coachTasks: defineTable({
  // ... existing fields
  visibility: v.union(
    v.literal("personal"),     // Only creator sees
    v.literal("team"),         // All team coaches see
    v.literal("organization")  // All org coaches see
  ),
  assigneeUserId: v.string(),
  collaborators: v.array(v.string()),  // Multiple coaches involved
  linkedInsightId: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("in_progress"),
    v.literal("blocked"),
    v.literal("completed")
  ),
  comments: v.array(v.object({
    userId: v.string(),
    content: v.string(),
    createdAt: v.number(),
  })),
})
```

**Use Cases:**
- "Order cones" task visible to all team coaches
- "Prepare match analysis" with multiple collaborators
- Task handoff when coach unavailable

#### 19.4.3 Session Preparation Hub

```typescript
// Proposed: sessionPrep table
sessionPrep: defineTable({
  teamId: v.string(),
  organizationId: v.string(),
  sessionDate: v.string(),
  sessionType: v.union(v.literal("training"), v.literal("match")),
  createdBy: v.string(),
  objectives: v.array(v.string()),
  focusAreas: v.array(v.string()),
  equipmentNeeded: v.array(v.string()),
  playerNotes: v.array(v.object({
    playerIdentityId: v.id("playerIdentities"),
    note: v.string(),
    addedBy: v.string(),
  })),
  attachments: v.array(v.object({
    type: v.union(v.literal("drill"), v.literal("video"), v.literal("document")),
    url: v.string(),
    title: v.string(),
  })),
  status: v.union(v.literal("draft"), v.literal("shared"), v.literal("completed")),
})
```

**Features:**
- Collaborative session planning
- Pre-populated player notes from recent insights
- Equipment checklist
- Drill library integration (future)

#### 19.4.4 Activity Feed

```typescript
// Proposed: teamActivityFeed table
teamActivityFeed: defineTable({
  teamId: v.string(),
  organizationId: v.string(),
  activityType: v.union(
    v.literal("insight_created"),
    v.literal("insight_applied"),
    v.literal("task_created"),
    v.literal("task_completed"),
    v.literal("session_planned"),
    v.literal("comment_added"),
    v.literal("player_update")
  ),
  actorUserId: v.string(),
  actorName: v.string(),
  targetType: v.string(),        // "insight", "task", "player", etc.
  targetId: v.string(),
  summary: v.string(),           // "Neil applied skill rating to Clodagh"
  createdAt: v.number(),
})
```

**Value:** Real-time visibility into team activity without checking multiple tabs.

### 19.5 Collaboration Patterns from Industry Leaders

#### Pattern 1: Unified Team Dashboard (Teamworks Model)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ All team information in ONE place - reduces context switching                    │
│ • Insights feed                                                                  │
│ • Task list                                                                      │
│ • Calendar                                                                       │
│ • Quick actions                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:** Merge team-insights-tab and team-insights-page into single hub.

#### Pattern 2: Real-time Notifications (Heja Model)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Push notifications when teammates take actions:                                  │
│ • "Coach Sarah added an insight about team culture"                              │
│ • "New task assigned: Order cones"                                               │
│ • "Session plan updated for Thursday training"                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:** Add notification system with coach preferences.

#### Pattern 3: Smart Suggestions (AI-Powered like Luceo)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ AI surfaces relevant information at the right time:                              │
│ • Before training: "3 players had injury insights this week"                     │
│ • Before match: "Opponent analysis available from last encounter"                │
│ • After session: "Would you like to record observations?"                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:** Context-aware prompts based on schedule and recent activity.

#### Pattern 4: Role-Based Views (Sportlyzer Model)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Different views for different roles:                                             │
│ • Head Coach: Strategic overview, all insights, all tasks                        │
│ • Assistant Coach: Player-focused, assigned tasks only                           │
│ • Physio/Support: Injury insights, medical notes                                 │
│ • Volunteer: Read-only access, attendance tracking                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:** Extend functional roles with team-specific permissions.

### 19.6 Insights from Enterprise Collaboration Platforms

Deep research into leading collaboration platforms reveals patterns that can elevate the Team Insights hub from a simple information display to a true collaboration environment.

#### 19.6.1 Notion: Block-Based Modularity & Real-Time Presence

**Source:** [Notion Review 2026](https://research.com/software/reviews/notion) | [Notion Help Center](https://www.notion.com/help/collaborate-within-a-workspace)

**Key Patterns:**

| Pattern | How Notion Does It | Application to Team Insights |
|---------|-------------------|------------------------------|
| **Block Architecture** | Every piece of content is a modular block (50+ types) that can be nested, moved, arranged | Insights, tasks, observations as composable blocks that coaches can reorganize |
| **Synced Blocks** | Content mirrors across pages automatically | Share an insight card across multiple team views without duplication |
| **Real-time Presence** | Colored cursors show where teammates are working | Show which coaches are viewing the team hub right now |
| **Inline Comments** | Comments attach to any content block | Thread discussions directly on insights |
| **@mentions** | Notify teammates in context | "@Coach Sarah - can you follow up on this injury?" |

**Proposed Feature: Block-Based Insight Cards**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ INSIGHT BLOCK (Draggable, Nestable)                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ⭐ Emma's Tackling Improved (4/5)                           [📍 Synced] [:::] │
│ Coach Neil • 2 hours ago • skill_rating                                         │
│                                                                                  │
│ "Showed great technique in 1v1 drills"                                          │
│                                                                                  │
│ 💬 2 comments   👍 Coach Sarah   📎 Linked to Thursday session                  │
│ ────────────────────────────────────────────────────────────────────────────── │
│ └─ @Coach Sarah: Should we move her to starting lineup?                         │
│    └─ @Coach Neil: Yes, ready for Saturday                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### 19.6.2 ClickUp: Multi-View Flexibility & AI Workflows

**Source:** [ClickUp Review 2026](https://hackceleration.com/clickup-review/) | [ClickUp Blog](https://clickup.com/blog/workspace-software/)

**Key Patterns:**

| Pattern | How ClickUp Does It | Application to Team Insights |
|---------|---------------------|------------------------------|
| **15+ Views** | Same data rendered as Kanban, Gantt, Calendar, Table, Mind Map | Insights viewable as: List, Board (by status), Calendar (by date), Player (grouped) |
| **Hierarchical Structure** | Spaces → Folders → Lists → Tasks | Teams → Sessions → Insights → Actions |
| **100+ Automations** | Triggers and conditions eliminate manual steps | "When injury insight applied → Create follow-up task for physio" |
| **AI Workflow Generation** | Create entire workflows from a single prompt | "Generate pre-match review checklist from recent insights" |
| **Dashboards** | Real-time customizable visualizations | Team health dashboard with insight trends |

**Proposed Feature: Multi-View Toggle**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ U14 FEMALE INSIGHTS                    [List] [Board] [Calendar] [Players]      │
├─────────────────────────────────────────────────────────────────────────────────┤

LIST VIEW:                          BOARD VIEW:
┌────────────────────┐              ┌──────────┐ ┌──────────┐ ┌──────────┐
│ • Emma: Tackling ↑ │              │ PENDING  │ │ APPLIED  │ │ FOLLOW-UP│
│ • Sarah: Injury    │              │ ──────── │ │ ──────── │ │ ──────── │
│ • Team: Great vibe │              │ [Card 1] │ │ [Card 3] │ │ [Card 5] │
│ • Clodagh: Solo ↑  │              │ [Card 2] │ │ [Card 4] │ │          │
└────────────────────┘              └──────────┘ └──────────┘ └──────────┘

CALENDAR VIEW:                      PLAYER VIEW:
┌─────┬─────┬─────┬─────┐          ┌──────────────────────────┐
│ Mon │ Tue │ Wed │ Thu │          │ EMMA BARLOW              │
├─────┼─────┼─────┼─────┤          │ • Tackling 4/5 (Jan 26)  │
│  ●  │     │ ●●  │  ●  │          │ • Performance (Jan 24)   │
│     │     │     │     │          │ • Attendance ✓ (Jan 22)  │
└─────┴─────┴─────┴─────┘          └──────────────────────────┘
```

#### 19.6.3 Figma: Multiplayer Presence & Cursor Awareness

**Source:** [Figma Multiplayer Blog](https://www.figma.com/blog/multiplayer-editing-in-figma/) | [Frontend Simplified](https://medium.com/frontend-simplified/deconstructing-the-magic-how-figma-achieved-seamless-real-time-multi-user-collaboration-37347f2ee292)

**Key Patterns:**

| Pattern | How Figma Does It | Application to Team Insights |
|---------|-------------------|------------------------------|
| **Live Cursors** | See exactly where teammates are working in real-time | See which insight Coach Sarah is currently reviewing |
| **Cursor Chat** | Quick messages appear next to your cursor | Quick contextual comments without opening a modal |
| **Observation Mode** | Follow a teammate's cursor during presentations | "Watch me review these insights" for training |
| **Presence Indicators** | Avatars show who's in the document | Colored dots showing active coaches on team hub |
| **Conflict Resolution** | CRDTs ensure edits don't overwrite each other | Two coaches editing same insight gracefully merges |

**Proposed Feature: Live Collaboration Presence**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ U14 FEMALE                                    🟢 Neil  🔵 Sarah  🟡 Mike        │
│ Team Insights Hub                             (3 coaches viewing)               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ 🟢← Neil is here                                                            ││
│  │ ⭐ Emma's Tackling Improved                                                 ││
│  │ "Showed great technique..."                                                 ││
│  │                                                                             ││
│  │ 🔵 Sarah: "Should we start her Saturday?" (cursor chat)                     ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ 🟡← Mike is here                                                            ││
│  │ 🏥 Sarah's Ankle - Minor                                                    ││
│  │ "Knock during drill..."                                                     ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Technical Implementation (WebSocket-based):**

```typescript
// Real-time presence via Convex subscriptions
export const getTeamPresence = query({
  args: { teamId: v.string() },
  returns: v.array(v.object({
    odz: v.string(),
    name: v.string(),
    avatarColor: v.string(),
    currentViewingInsightId: v.optional(v.string()),
    lastActiveAt: v.number(),
  })),
  handler: async (ctx, args) => {
    // Query active sessions for this team
    const presence = await ctx.db
      .query("coachPresence")
      .withIndex("by_team", q => q.eq("teamId", args.teamId))
      .filter(q => q.gt(q.field("lastActiveAt"), Date.now() - 60000)) // Active in last minute
      .collect();
    return presence;
  },
});
```

#### 19.6.4 Activity Feed Design Patterns

**Source:** [Activity Feed Design Guide](https://getstream.io/blog/activity-feed-design/) | [Smashing Magazine Notifications UX](https://www.smashingmagazine.com/2025/07/design-guidelines-better-notifications-ux/)

**Key Patterns:**

| Pattern | Best Practice | Application to Team Insights |
|---------|--------------|------------------------------|
| **Actor-Verb-Object** | "Sarah applied injury insight to Emma" | Clear, scannable activity descriptions |
| **Read/Unread States** | Visual distinction for new items | Bold unread items, badge counts |
| **Categorization** | Group by type (transactional, system, etc.) | Filter by: Insights, Tasks, Sessions, Comments |
| **Notification Levels** | High/Medium/Low attention | 🔴 Injury = high, 🟡 Skill = medium, 🟢 Attendance = low |
| **User Control** | Let users configure what they see | "Notify me about: Injuries ✓, Tasks ✓, Skills ○" |

**Proposed Feature: Smart Activity Feed**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TEAM ACTIVITY                                          [Filter ▼] [Mark All Read]│
├─────────────────────────────────────────────────────────────────────────────────┤
│ TODAY                                                                            │
│ ─────                                                                            │
│ ● 🔴 Coach Neil applied INJURY insight to Sarah Malone           2 min ago      │
│   "Ankle knock during drill - monitor for 48 hours"                              │
│   [View Insight] [View Player]                                                   │
│                                                                                  │
│ ○ ⭐ Coach Sarah applied SKILL insight to Emma Barlow             1 hour ago    │
│   "Tackling improved: 3 → 4"                                                     │
│   [View Insight] [View Player]                                                   │
│                                                                                  │
│ ○ 📝 Coach Mike added COMMENT on "Team spirit" insight            2 hours ago   │
│   "Agreed - best session this month"                                             │
│   [View Thread]                                                                  │
│                                                                                  │
│ YESTERDAY                                                                        │
│ ─────────                                                                        │
│ ○ ✅ Coach Neil completed TASK: Order training cones              Yesterday     │
│   [View Task]                                                                    │
│                                                                                  │
│ ○ 📅 Coach Sarah created SESSION PLAN for Thu 23 Jan              Yesterday     │
│   Focus: Defensive positioning, Ball retention                                   │
│   [View Plan]                                                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### 19.6.5 Asana/Monday.com: Scalability & Templates

**Source:** [Asana vs Monday.com](https://monday.com/blog/project-management/asana-vs-monday-com-which-to-choose/) | [Monday.com Review](https://www.morgen.so/blog-posts/clickup-review)

**Key Patterns:**

| Pattern | Best Practice | Application to Team Insights |
|---------|--------------|------------------------------|
| **Templates** | Pre-built workflows for common scenarios | "Pre-Match Review" template, "Season Planning" template |
| **Scalable Permissions** | Multi-level access control that grows with team | Expand from 3 coaches to 10 without restructuring |
| **Cross-Team Visibility** | See relevant info from other teams | Head coach sees all teams, assistant sees assigned only |
| **Workload Management** | Visualize who has capacity | See which coaches have pending tasks/insights |
| **Dependencies** | Link related items | "Follow-up task blocked by: Injury check complete" |

**Proposed Feature: Session Templates**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ CREATE SESSION PLAN                                    [Use Template ▼]         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ TEMPLATES:                                                                       │
│ ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────┐│
│ │ 📋 Pre-Match Review     │ │ 🏃 Training Session     │ │ 📊 Season Review    ││
│ │ • Review recent insights│ │ • Warm-up objectives    │ │ • Player progress   ││
│ │ • Injury status check   │ │ • Drill focus areas     │ │ • Goal assessment   ││
│ │ • Opponent notes        │ │ • Player rotation       │ │ • Team culture      ││
│ │ • Starting lineup       │ │ • Equipment list        │ │ • Recommendations   ││
│ │                         │ │                         │ │                     ││
│ │ [Use This Template]     │ │ [Use This Template]     │ │ [Use This Template] ││
│ └─────────────────────────┘ └─────────────────────────┘ └─────────────────────┘│
│                                                                                  │
│ AI SUGGESTION: Based on your recent insights, we recommend the "Pre-Match        │
│ Review" template. 3 players have injury notes that need review before Saturday.  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### 19.6.6 Summary: Platform Pattern Matrix

| Capability | Notion | ClickUp | Figma | Asana/Monday | Priority for PlayerARC |
|------------|--------|---------|-------|--------------|------------------------|
| **Block-based content** | ✅ Core | Partial | ❌ | ❌ | 🟡 Medium |
| **Multi-view flexibility** | ✅ | ✅ Core | ❌ | ✅ | 🔴 High |
| **Live presence/cursors** | ✅ | ❌ | ✅ Core | ❌ | 🟡 Medium |
| **@mentions & comments** | ✅ | ✅ | ✅ | ✅ | 🔴 High |
| **Automations/triggers** | Limited | ✅ Core | ❌ | ✅ | 🟡 Medium |
| **Templates** | ✅ | ✅ | ✅ | ✅ Core | 🔴 High |
| **Activity feed** | ✅ | ✅ | Limited | ✅ | 🔴 High |
| **AI suggestions** | ✅ (2025) | ✅ (2025) | ❌ | ✅ (2025) | 🔴 High (already have) |
| **Mobile-first** | ✅ | ✅ | Limited | ✅ | 🔴 High |

### 19.7 Implementation Roadmap (Updated)

| Phase | Features | Inspiration | Effort | Value |
|-------|----------|-------------|--------|-------|
| **Phase 1** | Activity feed + @mentions | Notion, ClickUp | Medium | 🔴 High |
| **Phase 2** | Multi-view toggle (List/Board/Calendar) | ClickUp | Medium | 🔴 High |
| **Phase 3** | Comments & threaded discussions | Notion, Figma | Medium | 🔴 High |
| **Phase 4** | Session templates library | Asana, Monday | Medium | 🟡 Medium |
| **Phase 5** | Live presence indicators | Figma | High | 🟡 Medium |
| **Phase 6** | Cursor chat & observation mode | Figma | High | 🟢 Low |
| **Phase 7** | Block-based drag & drop | Notion | High | 🟢 Low |

### 19.8 Database Schema Additions

```typescript
// New tables for collaboration hub

teamActivityFeed: defineTable({
  teamId: v.string(),
  organizationId: v.string(),
  activityType: v.string(),
  actorUserId: v.string(),
  actorName: v.string(),
  targetType: v.string(),
  targetId: v.string(),
  summary: v.string(),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
})
.index("by_team", ["teamId"])
.index("by_org", ["organizationId"])
.index("by_created", ["createdAt"]),

insightComments: defineTable({
  insightId: v.string(),
  voiceNoteId: v.id("voiceNotes"),
  teamId: v.optional(v.string()),
  userId: v.string(),
  userName: v.string(),
  content: v.string(),
  createdAt: v.number(),
})
.index("by_insight", ["insightId"])
.index("by_voice_note", ["voiceNoteId"]),

sessionPrep: defineTable({
  teamId: v.string(),
  organizationId: v.string(),
  sessionDate: v.string(),
  sessionType: v.string(),
  createdBy: v.string(),
  objectives: v.array(v.string()),
  focusAreas: v.array(v.string()),
  equipmentNeeded: v.array(v.string()),
  playerNotes: v.array(v.any()),
  attachments: v.array(v.any()),
  status: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_team_date", ["teamId", "sessionDate"])
.index("by_org", ["organizationId"]),
```

### 19.9 Key Files Reference

| Current File | Lines | Purpose |
|--------------|-------|---------|
| `components/team-insights-tab.tsx` | 324 | Collaborative voice note insights |
| `coach/team-insights/page.tsx` | 351 | Persistent team observations |
| `models/teamObservations.ts` | 174 | Team observation storage |
| `models/coaches.ts` | 492 | Coach assignments and team discovery |

### 19.10 Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Insights viewed by teammates | Unknown | 80% | Activity feed tracking |
| Tasks completed collaboratively | 0 | 30% of tasks | Task visibility + completion |
| Session prep completion | N/A | 60% of sessions | Session prep usage |
| Time to prepare for session | Unknown | -25% | User survey |
| Coach satisfaction with collaboration | Unknown | 4.5/5 | In-app feedback |

---

## 20. Coach Impact Visibility Gap

This section documents a significant UX gap: coaches at Level 0-1 have **no visibility** into the results of their work, while Level 2+ coaches get the "Sent to Parents" tab. All coaches need to answer basic questions about their coaching impact.

### 20.1 The Problem

#### Questions Coaches Can't Answer (Level 0-1)

| Question | Current Answer | Impact |
|----------|----------------|--------|
| "What did I send to Emma's parent last week?" | ❌ No way to check | Coach can't follow up on conversations |
| "Did that skill rating actually get applied?" | ❌ Must check player passport manually | No confidence in system |
| "How many insights did I approve this month?" | ❌ No tracking | Can't measure own productivity |
| "Which voice notes led to player updates?" | ❌ No traceability | Can't learn from patterns |
| "What summaries are pending delivery?" | ❌ No visibility | No understanding of parent communication |

#### Visibility Asymmetry by Trust Level

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    COACH VISIBILITY BY TRUST LEVEL                               │
└─────────────────────────────────────────────────────────────────────────────────┘

LEVEL 0-1 COACHES (Manual Review Required)
──────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────────────┐
│ WHAT THEY DO:                          │ WHAT THEY CAN SEE AFTER:               │
│ ───────────────                        │ ──────────────────────────             │
│ • Record voice notes                   │ ✅ Voice notes in History tab          │
│ • Review every insight manually        │ ❌ NO "where did this go" tracking     │
│ • Approve every parent summary         │ ❌ NO sent summary history             │
│ • Fix unmatched players                │ ❌ NO applied insight history          │
│ • Assign teams to observations         │ ❌ NO parent response visibility       │
│                                        │ ❌ NO "my impact" dashboard            │
└─────────────────────────────────────────────────────────────────────────────────┘

LEVEL 2+ COACHES (AI-Assisted)
──────────────────────────────
┌─────────────────────────────────────────────────────────────────────────────────┐
│ WHAT THEY DO:                          │ WHAT THEY CAN SEE AFTER:               │
│ ───────────────                        │ ──────────────────────────             │
│ • Record voice notes                   │ ✅ Voice notes in History tab          │
│ • AI auto-applies eligible insights    │ ✅ Auto-Applied tab (with undo)        │
│ • AI auto-approves parent summaries    │ ✅ Sent to Parents tab (30 days)       │
│ • Review edge cases only               │ ✅ Parent view/acknowledge status      │
│                                        │ ✅ Confidence scores on insights       │
│                                        │ ✅ "Would auto-apply" predictions      │
└─────────────────────────────────────────────────────────────────────────────────┘

RESULT: Level 0-1 coaches do MORE work but have LESS visibility into outcomes.
```

### 20.2 Current Tab Availability

| Tab | Level 0-1 | Level 2+ | Shows |
|-----|-----------|----------|-------|
| **New** | ✅ | ✅ | Recording interface |
| **Parents** | ✅ (pending only) | ✅ (pending only) | Summaries awaiting approval |
| **Insights** | ✅ (pending only) | ✅ (pending + auto-applied) | Insights needing action |
| **Team** | ✅ | ✅ | Fellow coaches' insights |
| **Sent to Parents** | ❌ **HIDDEN** | ✅ | History of sent summaries |
| **History** | ✅ | ✅ | Voice note archive |
| **Auto-Applied** (sub-tab) | ❌ Empty state | ✅ | Auto-applied insight history |

### 20.3 What Level 0-1 Coaches Are Missing

#### 1. Sent Summary History

**Current State:** After a Level 0-1 coach approves a parent summary, it disappears from the Parents tab. They have **no way** to:
- See what was sent
- Check if parent viewed it
- Review what they communicated last week
- Follow up on injury notifications

**Impact:** Coaches can't maintain continuity in parent communication.

#### 2. Applied Insight Traceability

**Current State:** When a Level 0-1 coach applies an insight, it's marked "applied" in the embedded array but there's **no applied history view**.

**Impact:** Coaches can't:
- See which insights led to profile changes
- Understand patterns in their coaching notes
- Verify data was correctly applied
- Learn what categories they most often create

#### 3. My Impact Dashboard

**Current State:** No aggregate view of coaching activity and outcomes.

**Impact:** Coaches can't answer:
- "How productive was my week?"
- "What value did my voice notes create?"
- "Am I improving over time?"

### 20.4 Proposed Solution: "My Impact" Tab

Add a new **My Impact** tab visible to **ALL coaches** (Level 0+):

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ MY IMPACT                                                   [This Month ▼]      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │     12       │  │      8       │  │      5       │  │     85%      │        │
│  │ Voice Notes  │  │   Insights   │  │  Summaries   │  │   Parent     │        │
│  │   Created    │  │   Applied    │  │    Sent      │  │   View Rate  │        │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  SENT TO PARENTS                                               [View All →]     │
│  ─────────────────                                                               │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ 👁 Emma Barlow - "Great improvement in tackling..."                        │  │
│  │    Sent: 2 hours ago | Viewed by Emma's Mum | ✓ Acknowledged               │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ ✉️ Sarah Malone - "Minor ankle knock during training..."                   │  │
│  │    Sent: Yesterday | Delivered (not yet viewed)                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  APPLIED TO PLAYER PROFILES                                    [View All →]     │
│  ──────────────────────────────                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ ⭐ Emma Barlow - Tackling: 3 → 4                                           │  │
│  │    From: "Training session Jan 26" | Applied: 2 hours ago                  │  │
│  │    [View in Passport →]                                                    │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ 🏥 Sarah Malone - Injury: Ankle (minor) added                              │  │
│  │    From: "Training session Jan 26" | Applied: 2 hours ago                  │  │
│  │    [View Record →]                                                         │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  TEAM OBSERVATIONS                                             [View All →]     │
│  ──────────────────                                                              │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ 👥 U14 Female - "Great team spirit at training"                            │  │
│  │    From: "Training session Jan 26" | Applied: Yesterday                    │  │
│  │    [View in Team Insights →]                                               │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 20.5 Implementation Approach

#### Option A: Extend Existing Tabs

| Change | Effort | Benefit |
|--------|--------|---------|
| Show "Sent to Parents" tab to ALL levels | Low | Immediate visibility |
| Add "Applied History" section to History tab | Medium | Traceability |
| Add summary stats to dashboard header | Low | Quick impact view |

**Pros:** Minimal new code, uses existing components
**Cons:** Fragmented experience, still no unified "my impact" view

#### Option B: New "My Impact" Tab (Recommended)

| Change | Effort | Benefit |
|--------|--------|---------|
| New `my-impact-tab.tsx` component | Medium | Unified experience |
| New `getCoachImpactSummary` query | Medium | Aggregate data |
| Reuse existing summary/insight components | Low | Consistent UI |

**Pros:** Single destination for all impact questions, clear value proposition
**Cons:** New tab increases navigation complexity

### 20.6 Data Already Available

The data needed for "My Impact" **already exists**:

| Data | Source | Query Exists? |
|------|--------|---------------|
| Sent summaries | `coachParentSummaries` | ✅ `getAutoApprovedSummaries` (extend filter) |
| Parent view status | `coachParentSummaries.viewedAt` | ✅ Available |
| Applied insights | `voiceNoteInsights` (status=applied) | ⚠️ Need new query |
| Skill changes | `skillAssessments` (source=voice_note) | ⚠️ Need new query |
| Injury records | `playerInjuries` (source=voice_note) | ⚠️ Need new query |
| Team observations | `teamObservations` | ✅ `getOrganizationObservations` |

#### Proposed New Query: `getCoachImpactSummary`

```typescript
export const getCoachImpactSummary = query({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    dateRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
  },
  returns: v.object({
    voiceNotesCreated: v.number(),
    insightsApplied: v.number(),
    insightsDismissed: v.number(),
    summariesSent: v.number(),
    summariesViewed: v.number(),
    summariesAcknowledged: v.number(),
    parentViewRate: v.number(),
    skillChanges: v.array(v.object({
      playerName: v.string(),
      skillName: v.string(),
      previousValue: v.optional(v.number()),
      newValue: v.number(),
      appliedAt: v.number(),
      voiceNoteId: v.id("voiceNotes"),
    })),
    injuriesRecorded: v.array(v.object({
      playerName: v.string(),
      type: v.string(),
      severity: v.string(),
      appliedAt: v.number(),
      voiceNoteId: v.id("voiceNotes"),
    })),
    recentSummaries: v.array(v.object({
      playerName: v.string(),
      summaryPreview: v.string(),
      sentAt: v.number(),
      status: v.string(),
      viewedAt: v.optional(v.number()),
      acknowledgedAt: v.optional(v.number()),
    })),
    teamObservations: v.array(v.object({
      teamName: v.string(),
      title: v.string(),
      appliedAt: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    // Aggregate from multiple tables
    // voiceNotes, voiceNoteInsights, coachParentSummaries,
    // skillAssessments, playerInjuries, teamObservations
  },
});
```

### 20.7 UX Recommendations

#### For All Coaches (Level 0+)

1. **Always show "My Impact" tab** - Don't hide the destination for impact visibility
2. **Include clickable links** - Every item links to source note or target profile
3. **Show date filtering** - This week / This month / All time
4. **Highlight engagement** - Parent view rate is a motivating metric

#### For Level 0-1 Specifically

1. **Show sent summary history** - Same as Level 2+, just no auto-approval
2. **Show applied insight history** - Even though manual, still valuable
3. **Encourage with progress** - "12 insights applied this month!"
4. **Link to trust level progress** - "5 more reviews to unlock auto-apply"

### 20.8 Priority & Effort

| Feature | Priority | Effort | Value |
|---------|----------|--------|-------|
| Show "Sent to Parents" to Level 0-1 | 🔴 High | Low | Immediate gap fix |
| Add `getCoachImpactSummary` query | 🔴 High | Medium | Enables dashboard |
| Create "My Impact" tab component | 🔴 High | Medium | Unified experience |
| Clickable links to passports/records | 🟡 Medium | Low | Better navigation |
| Date range filtering | 🟡 Medium | Low | Usability |
| Export impact report | 🟢 Low | Medium | Coach portfolios |

### 20.9 Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Coaches who can answer "what did I send?" | 0% (L0-1) | 100% |
| Time to find sent summary | N/A | < 10 seconds |
| Coach confidence in system | Unknown | Survey: 4.5/5 |
| Support tickets about "where did it go" | Unknown | -80% |

---

## Appendix: Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (required) | - |
| `OPENAI_MODEL_TRANSCRIPTION` | Transcription model | `whisper-1` |
| `OPENAI_MODEL_INSIGHTS` | Insight extraction model | `gpt-4o` |

---

*Document maintained by the PlayerARC Engineering Team*
