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
9. [Data Flow Diagrams](#9-data-flow-diagrams)
10. [Key Files Reference](#10-key-files-reference)
11. [Troubleshooting Guide](#11-troubleshooting-guide)

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

## 9. Data Flow Diagrams

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

## 10. Key Files Reference

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

## 11. Troubleshooting Guide

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
