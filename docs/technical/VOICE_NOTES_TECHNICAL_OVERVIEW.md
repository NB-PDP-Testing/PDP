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

#### `voiceNotes.ts` - Core Queries & Mutations

| Function | Type | Description |
|----------|------|-------------|
| `getVoiceNotesByCoach` | Query | Get all notes for a coach in an org |
| `getVoiceNoteById` | Query | Get single note by ID |
| `getAllVoiceNotes` | Query | Admin: Get all org notes |
| `createTypedNote` | Mutation | Create text-based note |
| `createRecordedNote` | Mutation | Create audio note + trigger transcription |
| `generateUploadUrl` | Mutation | Get Convex storage upload URL |
| `updateInsightStatus` | Mutation | Apply/dismiss individual insight |
| `classifyInsight` | Mutation | Manually set insight category |
| `assignPlayerToInsight` | Mutation | Manually assign player to insight |
| `deleteVoiceNote` | Mutation | Delete note and all related data |
| `updateTranscription` | Internal | Update transcription status/content |
| `updateInsights` | Internal | Update insights after AI processing |

**Key Implementation Details:**

1. **Coach Scoping**: All queries filter by `coachId` to ensure coaches only see their own notes
2. **Dual Update Pattern**: When updating insights, both the embedded array (`voiceNotes.insights`) and the separate table (`voiceNoteInsights`) are updated to maintain consistency
3. **Player Identity System**: Uses `playerIdentityId` (platform-level) rather than org-scoped player IDs

#### `voiceNoteInsights.ts` - Insight Management

| Function | Type | Description |
|----------|------|-------------|
| `getPendingInsights` | Query | Get pending insights with wouldAutoApply |
| `getAutoAppliedInsights` | Query | Get auto-applied insights with audit data |
| `applyInsight` | Mutation | Manually apply insight |
| `dismissInsight` | Mutation | Manually dismiss insight |
| `autoApplyInsight` | Mutation | Trigger auto-apply (requires auth) |
| `autoApplyInsightInternal` | Internal | Auto-apply from actions (no auth) |
| `undoAutoAppliedInsight` | Mutation | Undo within 1-hour window |
| `getUndoReasonStats` | Query | Analytics on undo patterns |

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

#### `coachTrustLevels.ts` - Trust System

| Function | Type | Description |
|----------|------|-------------|
| `getCoachTrustLevel` | Query | Get trust level + org preferences |
| `setCoachPreferredLevel` | Mutation | Set automation cap (0-3) |
| `setParentSummariesEnabled` | Mutation | Toggle parent summaries per-org |
| `setSkipSensitiveInsights` | Mutation | Skip injury/behavior from summaries |
| `setInsightAutoApplyPreferences` | Mutation | Enable/disable by category |
| `updateTrustMetrics` | Internal | Update after approve/suppress |
| `adjustInsightThresholds` | Internal | Daily cron to tune thresholds |

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

#### `coachParentSummaries.ts` - Parent Communication

| Function | Type | Description |
|----------|------|-------------|
| `createParentSummary` | Internal | Create summary after AI generation |
| `approveSummary` | Mutation | Coach approves for delivery |
| `approveInjurySummary` | Mutation | Injury approval with checklist |
| `suppressSummary` | Mutation | Coach blocks delivery |
| `revokeSummary` | Mutation | Revoke auto-approved (1-hour window) |
| `editSummaryContent` | Mutation | Edit before approval |
| `getCoachPendingSummaries` | Query | Get summaries awaiting review |
| `getAutoApprovedSummaries` | Query | Get sent summaries (last 30 days) |
| `markSummaryViewed` | Mutation | Parent views summary |
| `acknowledgeParentSummary` | Mutation | Parent acknowledges |
| `processScheduledDeliveries` | Internal | Cron: deliver auto-approved |

### Actions Layer (`packages/backend/convex/actions/`)

#### `voiceNotes.ts` - AI Processing

| Function | Type | Description |
|----------|------|-------------|
| `transcribeAudio` | Internal Action | OpenAI Whisper transcription |
| `buildInsights` | Internal Action | GPT-4o insight extraction |
| `correctInsightPlayerName` | Internal Action | AI name correction |
| `recheckAutoApply` | Internal Action | Re-evaluate after manual edit |

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

### 11.1 Insight Extraction: Input/Output Specification

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

### 11.2 Player Profile Update Implementation

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

### 11.3 Complete Insight Application Matrix

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

### 11.4 Auto-Applied Insight Audit Trail

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

---

## Appendix: Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (required) | - |
| `OPENAI_MODEL_TRANSCRIPTION` | Transcription model | `whisper-1` |
| `OPENAI_MODEL_INSIGHTS` | Insight extraction model | `gpt-4o` |

---

*Document maintained by the PlayerARC Engineering Team*
