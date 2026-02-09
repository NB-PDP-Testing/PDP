# Voice Notes v2 — Complete Technical Reference

> **Branch:** `feat/voice-gateways-v2`
> **Phases:** 1–6 (21 user stories, 38 ADRs)
> **Status:** Implementation complete, pending merge to main
> **Last updated:** 2026-02-08

This document is the single source of truth for the Voice Notes v2 system as built. It is intended for engineers who need to understand, maintain, or extend the system.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Processing Pipeline](#3-processing-pipeline)
4. [Database Schema](#4-database-schema)
5. [Backend API Surface](#5-backend-api-surface)
6. [Frontend Pages & Components](#6-frontend-pages--components)
7. [Feature Flag System](#7-feature-flag-system)
8. [Trust Level System](#8-trust-level-system)
9. [Quality Gates](#9-quality-gates)
10. [WhatsApp Integration](#10-whatsapp-integration)
11. [Key Architecture Decisions](#11-key-architecture-decisions)
12. [File Map](#12-file-map)
13. [Testing](#13-testing)
14. [Known Gaps & Future Work](#14-known-gaps--future-work)

---

## 1. Executive Summary

Voice Notes v2 evolves PlayerARC's voice notes system from a single-pass insight extraction model to an atomic claims pipeline with entity resolution, disambiguation, and draft-based confirmation.

**v1 (existing):** Coach sends voice note via WhatsApp or app -> transcription -> single AI pass extracts insights -> auto-apply based on trust level -> WhatsApp reply with review link.

**v2 (new, runs alongside v1):** Same input -> quality gates -> artifact record -> atomic claims extraction (15 topic categories) -> entity resolution with fuzzy matching and alias learning -> disambiguation UI for ambiguous names -> insight drafts with confidence scoring -> coach confirmation via WhatsApp commands or auto-confirm for trusted coaches.

Both pipelines coexist. v2 is gated behind feature flags. When enabled, v2 creates artifacts AND v1 still creates voice notes — zero regression.

### What v2 Solves

| v1 Limitation | v2 Solution |
|---------------|-------------|
| Single-pass extraction misses nuance | Atomic claims — one per entity mention, 15 categories |
| Unmatched players ("the twins") get stuck | Disambiguation UI with fuzzy suggestions |
| No resolution memory | Coach aliases — resolve once, remember forever |
| No quality filtering | Quality gates reject gibberish, duplicates, bad audio |
| Immediate auto-apply, no confirmation | Draft-based workflow with trust-gated auto-confirm |
| No command interface | WhatsApp commands: CONFIRM, CANCEL, YES/NO |

---

## 2. Architecture Overview

### System Diagram

```
                        ┌──────────────────────┐
                        │    WhatsApp (Twilio)  │
                        └──────────┬───────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   processIncomingMessage     │
                    │   (actions/whatsapp.ts)      │
                    ├─────────────────────────────┤
                    │ 1. Duplicate detection       │
                    │ 2. Coach lookup + org match  │
                    │ 3. Command parsing           │
                    │ 4. Quality gate (text)       │
                    └──────────┬───────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │ [v2 flag ON]   │                │
              ▼                ▼                │
     createArtifact    createRecordedNote       │
     (v2 pipeline)     or createTypedNote       │
              │            (v1 pipeline)        │
              │                │                │
              └───────┬────────┘                │
                      ▼                         │
              transcribeAudio (shared)          │
              ├──── Quality gate (transcript)   │
              │                                 │
        ┌─────┴─────┐                          │
        ▼            ▼                          │
   buildInsights  extractClaims                 │
   (v1 - GPT-4)  (v2 - GPT-4)                 │
        │            │                          │
        │      resolveEntities (Phase 5)        │
        │            │                          │
        │      generateDrafts (Phase 6)         │
        │            │                          │
        │      [auto-confirm] applyDraft        │
        │                                       │
        └────────────┬──────────────────────────┘
                     ▼
           checkAndAutoApply
           (WhatsApp reply + review link)
```

### In-App Entry Points

```
┌─────────────────────────┐     ┌──────────────────────────┐
│  Audio Recording (App)  │     │   Typed Note (App)       │
│  MediaRecorder API      │     │   Textarea input         │
└──────────┬──────────────┘     └──────────┬───────────────┘
           │                               │
           ▼                               ▼
    createRecordedNote              createTypedNote
           │                               │
    transcribeAudio                  buildInsights
    (then same as above)            (v1 only — see gap note)
```

**Gap note:** In-app typed notes do not currently trigger the v2 claims pipeline. The v2 artifact is only created in the WhatsApp handlers. See [Known Gaps](#14-known-gaps--future-work).

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | Convex (TypeScript) | Real-time serverless DB + functions |
| AI - Transcription | OpenAI Whisper (`whisper-1`) | Audio-to-text |
| AI - Extraction | OpenAI GPT-4o (configurable) | Insight/claims extraction |
| AI - Correction | OpenAI GPT-4o-mini | Player name correction |
| WhatsApp | Twilio API | Message send/receive |
| Frontend | Next.js 14 + shadcn/ui | App Router, React |
| Gestures | Framer Motion | Swipe actions |
| Charts | Recharts | Impact dashboard |

---

## 3. Processing Pipeline

### 3.1 WhatsApp Audio (Full v2 Flow)

```
processIncomingMessage (actions/whatsapp.ts)
│
├─ Store whatsappMessage
├─ Duplicate check ────────── GATE: reject if duplicate within 2min
├─ Coach lookup + org resolution
├─ Command chain: OK > R > SNOOZE > CONFIRM/CANCEL > v2 commands
├─ Send ack: "Voice note received. Transcribing..."
│
▼ processAudioMessage
├─ Download audio from Twilio
├─ Upload to Convex storage
├─ [v2] createArtifact (status: "received", sourceChannel: "whatsapp_audio")
├─ createRecordedNote (v1 voice note)
├─ [v2] linkToVoiceNote (connects artifact ↔ v1 note)
├─ Schedule checkAndAutoApply (30s delay)
│
▼ transcribeAudio (actions/voiceNotes.ts) — SHARED
├─ Call OpenAI Whisper
├─ Transcript quality gate ── GATE: reject/ask_user/process
├─ Update v1 voiceNote with transcription
├─ [v2] Create voiceNoteTranscript record
├─ [v2] Update artifact → "transcribed"
│
├─── Schedule buildInsights (v1) ──────────┐
├─── Schedule extractClaims (v2) ───────┐  │ PARALLEL
│                                       │  │
│    ┌──────────────────────────────────┘  │
│    ▼                                     ▼
│  extractClaims (Phase 4)           buildInsights (v1)
│  ├─ Gather coach context           ├─ Gather coach context
│  ├─ GPT-4 → 15-topic claims       ├─ GPT-4 → insights
│  ├─ Player matching per claim      ├─ Player matching
│  ├─ Store voiceNoteClaims          ├─ Store voiceNoteInsights
│  │                                 ├─ Auto-apply (trust-gated)
│  ▼ [entity_resolution_v2 flag]     └─ Schedule parent summaries
│  resolveEntities (Phase 5)
│  ├─ Alias lookup (E5)
│  ├─ Batch same-name (E6)
│  ├─ Fuzzy matching
│  ├─ Auto-resolve / needs_disambiguation
│  ├─ Store entityResolutions
│  │
│  ▼
│  generateDrafts (Phase 6)
│  ├─ Calculate confidence (ai × resolution)
│  ├─ Auto-confirm gate (trust + category + confidence)
│  ├─ Store insightDrafts
│  └─ [auto-confirmed] → applyDraft → voiceNoteInsight record
│
▼ checkAndAutoApply (30s later)
├─ Wait for insights (retry 5× at 10s)
├─ Trust-based categorization
├─ Generate review link (48h, rolling)
└─ WhatsApp reply (trust-adaptive format)
```

### 3.2 WhatsApp Text

Same as audio, except:
- Text quality gate runs BEFORE voice note creation (rejects gibberish/spam)
- No transcription step — text IS the transcript
- `sourceChannel: "whatsapp_text"`
- `checkAndAutoApply` scheduled at 15s (faster than audio's 30s)

### 3.3 In-App Audio

- `createRecordedNote` → `transcribeAudio` → same pipeline as WhatsApp audio
- v2 artifacts are NOT created from the in-app path (WhatsApp-only currently)

### 3.4 In-App Typed Note

- `createTypedNote` → `buildInsights` directly (no transcription)
- v1 only — no v2 claims extraction

### 3.5 WhatsApp Command Flow

```
Incoming text message
│
├─ parseCommand() — lib/whatsappCommands.ts
│  ├─ "CONFIRM" / "YES" / "Y" → confirm_all
│  ├─ "CONFIRM 1,2,3"         → confirm_specific (by displayOrder)
│  ├─ "CANCEL" / "NO" / "N"   → cancel (reject all pending)
│  └─ '"the twins" = Sarah'   → entity_mapping
│
▼ handleCommand() — lib/whatsappCommandHandler.ts
├─ confirm_all:     Get pending drafts → confirm each → schedule applyDraft
├─ confirm_specific: Map numbers to drafts by displayOrder → confirm matches
├─ cancel:          Get pending drafts → reject all
└─ entity_mapping:  Acknowledge (full implementation pending)
```

---

## 4. Database Schema

All tables defined in `packages/backend/convex/schema.ts`.

### 4.1 v2 Pipeline Tables

#### `voiceNoteArtifacts` — Phase 3

Source-agnostic record for any voice/text input. Links back to v1 `voiceNotes`.

| Field | Type | Description |
|-------|------|-------------|
| `artifactId` | string | UUID identifier |
| `sourceChannel` | `"whatsapp_audio"` \| `"whatsapp_text"` \| `"app_recorded"` \| `"app_typed"` | Input source |
| `senderUserId` | string | Better Auth user._id |
| `orgContextCandidates` | `[{ organizationId, confidence }]` | Ranked org candidates |
| `status` | `"received"` \| `"transcribing"` \| `"transcribed"` \| `"processing"` \| `"completed"` \| `"failed"` | Pipeline state |
| `voiceNoteId` | optional `Id<"voiceNotes">` | v1 backward compat link |
| `rawMediaStorageId` | optional `Id<"_storage">` | Audio file |
| `metadata` | optional `{ mimeType?, fileSize?, whatsappMessageId? }` | Source metadata |
| `createdAt` / `updatedAt` | number | Epoch ms |

**Indexes:** `by_artifactId`, `by_senderUserId_and_createdAt`, `by_voiceNoteId`, `by_status_and_createdAt`

#### `voiceNoteTranscripts` — Phase 3

Detailed transcription with per-segment confidence.

| Field | Type | Description |
|-------|------|-------------|
| `artifactId` | `Id<"voiceNoteArtifacts">` | Parent artifact |
| `fullText` | string | Complete transcript |
| `segments` | `[{ text, startTime, endTime, confidence }]` | Per-segment data |
| `modelUsed` | string | e.g. "whisper-1" |
| `language` | string | Detected language |
| `duration` | number | Audio duration (seconds) |
| `createdAt` | number | Epoch ms |

**Indexes:** `by_artifactId`

#### `voiceNoteClaims` — Phase 4

Atomic claims. One per entity mention, 15 topic categories.

| Field | Type | Description |
|-------|------|-------------|
| `claimId` | string | UUID |
| `artifactId` | `Id<"voiceNoteArtifacts">` | Parent artifact |
| `sourceText` | string | Exact transcript quote |
| `topic` | 15-value union | See topic table below |
| `title` / `description` | string | Claim content |
| `entityMentions` | `[{ mentionType, rawText, position }]` | Entity references |
| `resolvedPlayerIdentityId` | optional `Id<"playerIdentities">` | Matched player |
| `resolvedPlayerName` | optional string | Matched player name |
| `resolvedTeamId` / `resolvedTeamName` | optional string | Matched team |
| `resolvedAssigneeUserId` / `resolvedAssigneeName` | optional string | For TODO items |
| `severity` | optional `"low"` \| `"medium"` \| `"high"` \| `"critical"` | Injury/wellbeing |
| `sentiment` | optional `"positive"` \| `"neutral"` \| `"negative"` \| `"concerned"` | Observation tone |
| `skillName` / `skillRating` | optional string / number | For skill_rating (1–5) |
| `extractionConfidence` | number | AI confidence 0–1 |
| `organizationId` / `coachUserId` | string | Denormalized scope |
| `status` | `"extracted"` \| `"resolving"` \| `"resolved"` \| `"needs_disambiguation"` \| `"merged"` \| `"discarded"` \| `"failed"` | Resolution state |
| `createdAt` / `updatedAt` | number | Epoch ms |

**Indexes:** `by_artifactId`, `by_artifactId_and_status`, `by_claimId`, `by_topic`, `by_org_and_coach`, `by_org_and_status`, `by_resolvedPlayerIdentityId`, `by_coachUserId`

**15 Claim Topics:**

| # | Topic | Scope | What It Captures |
|---|-------|-------|-----------------|
| 1 | `injury` | Player | Physical injuries, knocks, strains |
| 2 | `skill_rating` | Player | Numeric rating (e.g. "hand pass is 4/5") |
| 3 | `skill_progress` | Player | General improvement without numbers |
| 4 | `behavior` | Player | Attitude, effort, teamwork, discipline |
| 5 | `performance` | Player | Match/training performance |
| 6 | `attendance` | Player | Presence/absence at sessions |
| 7 | `wellbeing` | Player | Mental health, stress, emotional state |
| 8 | `recovery` | Player | Rehab progress, return-to-play |
| 9 | `development_milestone` | Player | Achievements, selections, personal bests |
| 10 | `physical_development` | Player | Growth spurts, conditioning, fitness |
| 11 | `parent_communication` | Player | Things to discuss with parents |
| 12 | `tactical` | Player/Team | Position changes, formations |
| 13 | `team_culture` | Team | Team morale, collective behavior |
| 14 | `todo` | Coach | Action items, equipment, scheduling |
| 15 | `session_plan` | Team/None | Training focus areas, drill ideas |

#### `voiceNoteEntityResolutions` — Phase 5

Resolution records for entity mentions. Captures candidates for disambiguation.

| Field | Type | Description |
|-------|------|-------------|
| `claimId` | `Id<"voiceNoteClaims">` | Parent claim |
| `artifactId` | `Id<"voiceNoteArtifacts">` | Parent artifact |
| `mentionIndex` | number | Position in claim's entityMentions |
| `mentionType` | `"player_name"` \| `"team_name"` \| `"group_reference"` \| `"coach_name"` | Entity type |
| `rawText` | string | Original text as transcribed |
| `candidates` | `[{ entityType, entityId, entityName, score, matchReason }]` | Ranked candidates |
| `status` | `"auto_resolved"` \| `"needs_disambiguation"` \| `"user_resolved"` \| `"unresolved"` | State |
| `resolvedEntityId` / `resolvedEntityName` | optional string | Final resolution |
| `resolvedAt` | optional number | Resolution timestamp |
| `organizationId` | string | Org scope |
| `createdAt` | number | Epoch ms |

**Indexes:** `by_claimId`, `by_artifactId`, `by_artifactId_and_status`, `by_org_and_status`

#### `coachPlayerAliases` — Phase 5 (Enhancement E5)

"Resolve once, remember forever." Coach-specific name aliases.

| Field | Type | Description |
|-------|------|-------------|
| `coachUserId` | string | Coach user._id |
| `organizationId` | string | Org scope |
| `rawText` | string | Name as transcribed (e.g. "Johnny") |
| `resolvedEntityId` | string | Resolved player ID |
| `resolvedEntityName` | string | Resolved player name |
| `useCount` | number | Times alias was used |
| `lastUsedAt` / `createdAt` | number | Epoch ms |

**Indexes:** `by_coach_org_rawText`, `by_coach_org`

#### `insightDrafts` — Phase 6

Pending insights awaiting confirmation before applying.

| Field | Type | Description |
|-------|------|-------------|
| `draftId` | string | UUID |
| `artifactId` | `Id<"voiceNoteArtifacts">` | Parent artifact |
| `claimId` | `Id<"voiceNoteClaims">` | Source claim |
| `playerIdentityId` | optional `Id<"playerIdentities">` | Target player |
| `insightType` | 15-value union | Same as claim topic |
| `title` / `description` | string | Insight content |
| `evidence` | `{ transcriptSnippet, timestampStart? }` | Source evidence |
| `displayOrder` | number | 1-indexed for WhatsApp commands |
| `aiConfidence` | number | AI extraction confidence |
| `resolutionConfidence` | number | Entity resolution confidence |
| `overallConfidence` | number | `aiConfidence × resolutionConfidence` |
| `requiresConfirmation` | boolean | Whether manual confirmation needed |
| `status` | `"pending"` \| `"confirmed"` \| `"rejected"` \| `"applied"` \| `"expired"` | Lifecycle |
| `organizationId` / `coachUserId` | string | Scope |
| `confirmedAt` / `appliedAt` | optional number | Timestamps |
| `createdAt` / `updatedAt` | number | Epoch ms |

**Indexes:** `by_draftId`, `by_artifactId`, `by_artifactId_and_status`, `by_org_and_coach_and_status`, `by_playerIdentityId_and_status`

#### `featureFlags` — Phase 3

Cascading feature flags. See [Section 7](#7-feature-flag-system).

| Field | Type | Description |
|-------|------|-------------|
| `featureKey` | string | e.g. `"voice_notes_v2"` |
| `scope` | `"platform"` \| `"organization"` \| `"user"` | Flag level |
| `organizationId` / `userId` | optional string | Scope target |
| `enabled` | boolean | Flag value |
| `updatedBy` | optional string | Admin who toggled |
| `updatedAt` | number | Last update |

**Indexes:** `by_featureKey_and_scope`, `by_featureKey_scope_org`, `by_featureKey_scope_user`

### 4.2 Supporting Tables (v1 + Shared)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `voiceNotes` | v1 voice notes with embedded insights | transcription, summary, insights[], status |
| `voiceNoteInsights` | Extracted insights (v1 + v2 draft output) | voiceNoteId, category, confidence, status |
| `autoAppliedInsights` | Audit trail for auto-applied insights | insightId, coachId, undoneAt? |
| `coachTrustLevels` | Trust level tracking (0–3) | currentLevel, preferredLevel, totalApprovals |
| `coachOrgPreferences` | Per-org coach preferences | parentSummariesEnabled, autoApplyInsightsEnabled |
| `whatsappMessages` | Raw incoming WhatsApp messages | from, body, mediaUrl, processingStatus |
| `whatsappSessions` | Multi-org coach disambiguation sessions | coachUserId, pendingOrgSelection |
| `whatsappReviewLinks` | Review microsite links (48h, rolling) | code, coachUserId, expiresAt, accessCount |
| `reviewAnalyticsEvents` | Review analytics (9 event types) | eventType, coachUserId, metadata |
| `coachTasks` | Coach tasks from TODO insights | title, assigneeUserId, status |
| `teamObservations` | Team-level observations | teamId, title, description |
| `coachParentSummaries` | AI-generated parent summaries | playerIdentityId, sensitivityCategory |

---

## 5. Backend API Surface

All backend code lives in `packages/backend/convex/`.

### 5.1 Actions (External API Calls)

| File | Function | Type | Trigger | What It Does |
|------|----------|------|---------|-------------|
| `actions/whatsapp.ts` | `processIncomingMessage` | internalAction | Twilio webhook | Full WhatsApp message processing |
| `actions/whatsapp.ts` | `checkAndAutoApply` | internalAction | Scheduler (15–30s) | Wait for insights, send WhatsApp reply |
| `actions/whatsapp.ts` | `sendSnoozeReminder` | internalAction | Scheduler | Send snooze reminder via WhatsApp |
| `actions/voiceNotes.ts` | `transcribeAudio` | internalAction | Scheduler | Whisper transcription + quality gate |
| `actions/voiceNotes.ts` | `buildInsights` | internalAction | Scheduler | v1 GPT-4 insight extraction |
| `actions/voiceNotes.ts` | `correctInsightPlayerName` | internalAction | Mutation | AI-powered name correction |
| `actions/voiceNotes.ts` | `recheckAutoApply` | internalAction | Mutation | Re-check eligibility after corrections |
| `actions/claimsExtraction.ts` | `extractClaims` | internalAction | Scheduler | v2 GPT-4 atomic claims extraction |
| `actions/entityResolution.ts` | `resolveEntities` | internalAction | Scheduler | v2 entity resolution + alias lookup |
| `actions/draftGeneration.ts` | `generateDrafts` | internalAction | Scheduler | v2 draft generation + auto-confirm |
| `actions/migration.ts` | `migrateVoiceNotesToV2` | internalAction | Manual | v1→v2 backfill migration |

### 5.2 Models (Queries & Mutations)

#### `models/voiceNoteArtifacts.ts` (7 functions)

| Function | Type | Description |
|----------|------|-------------|
| `createArtifact` | internalMutation | Create artifact with "received" status |
| `linkToVoiceNote` | internalMutation | Link artifact to v1 voice note |
| `updateArtifactStatus` | internalMutation | Update processing status |
| `getArtifactByArtifactId` | internalQuery | Lookup by UUID |
| `getArtifactById` | internalQuery | Lookup by Convex _id |
| `getArtifactsByVoiceNote` | internalQuery | Get artifacts for a v1 voice note |
| `getRecentArtifacts` | query (public) | Recent artifacts for authenticated user |

#### `models/voiceNoteTranscripts.ts` (2 functions)

| Function | Type | Description |
|----------|------|-------------|
| `createTranscript` | internalMutation | Store transcript with segments |
| `getTranscriptByArtifact` | internalQuery | Get transcript for artifact |

#### `models/voiceNoteClaims.ts` (7 functions)

| Function | Type | Description |
|----------|------|-------------|
| `storeClaims` | internalMutation | Batch insert claims |
| `getClaimsByArtifact` | internalQuery | All claims for artifact |
| `getClaimsByArtifactAndStatus` | internalQuery | Claims filtered by status |
| `updateClaimStatus` | internalMutation | Update claim status |
| `getClaimByClaimId` | internalQuery | Lookup by claimId |
| `getClaimsByOrgAndCoach` | query (public) | Claims for authenticated coach |
| `getRecentClaims` | query (public) | Platform debug tool |

#### `models/voiceNoteEntityResolutions.ts` (10 functions)

| Function | Type | Description |
|----------|------|-------------|
| `storeResolutions` | internalMutation | Batch insert resolutions |
| `getResolutionsByArtifact` | internalQuery | All resolutions for artifact |
| `getResolutionsByArtifactAndStatus` | internalQuery | Filter by status |
| `updateResolutionStatus` | internalMutation | Update resolution outcome |
| `getResolutionsByClaim` | query (public) | Resolutions with ownership check |
| `getDisambiguationForArtifact` | query (public) | Pending disambiguations for UI |
| `getDisambiguationQueue` | query (public) | All pending for coach |
| `resolveEntity` | mutation (public) | User resolves ambiguity (stores alias, batch-resolves same-name, logs analytics) |
| `rejectResolution` | mutation (public) | Reject all candidates |
| `skipResolution` | mutation (public) | Skip disambiguation |

#### `models/coachPlayerAliases.ts` (3 functions)

| Function | Type | Description |
|----------|------|-------------|
| `lookupAlias` | internalQuery | Check if alias exists |
| `storeAlias` | internalMutation | Upsert alias with useCount |
| `getCoachAliases` | query (public) | All aliases for coach |

#### `models/insightDrafts.ts` (11 functions)

| Function | Type | Description |
|----------|------|-------------|
| `createDrafts` | internalMutation | Batch insert drafts |
| `getDraftsByArtifact` | internalQuery | All drafts for artifact |
| `getPendingDraftsForCoach` | query (public) | Pending drafts (7-day expiry) |
| `confirmDraft` | mutation (public) | Confirm single draft |
| `confirmAllDrafts` | mutation (public) | Confirm all for artifact |
| `rejectDraft` | mutation (public) | Reject single draft |
| `rejectAllDrafts` | mutation (public) | Reject all for artifact |
| `getPendingDraftsInternal` | internalQuery | For WhatsApp commands |
| `confirmDraftInternal` | internalMutation | Internal confirm (no auth) |
| `rejectDraftInternal` | internalMutation | Internal reject (no auth) |
| `applyDraft` | internalMutation | Apply confirmed draft → creates voiceNoteInsight |

#### `models/whatsappReviewLinks.ts` (22+ functions)

| Function | Type | Description |
|----------|------|-------------|
| `generateReviewLink` | internalMutation | Generate or reuse 48h rolling link |
| `getReviewLinkByCode` | query (public) | Look up link by 8-char code |
| `getCoachPendingItems` | query (public) | Aggregated pending items (6 categories) |
| `applyInsightFromReview` | mutation (public) | Apply insight via review microsite |
| `dismissInsightFromReview` | mutation (public) | Dismiss via review |
| `editInsightFromReview` | mutation (public) | Edit via review |
| `batchApplyInsightsFromReview` | mutation (public) | Batch apply |
| `addTodoFromReview` | mutation (public) | Create task from review |
| `saveTeamNoteFromReview` | mutation (public) | Create team observation |
| `findSimilarPlayersForReview` | query (public) | Fuzzy player matching |
| `assignPlayerFromReview` | mutation (public) | Assign player to insight |
| `snoozeReviewLink` | mutation (public) | Snooze (max 3, 1min–24h) |
| `markLinkAccessed` | mutation (public) | Track access |
| `expireActiveLinks` | internalMutation | Cron: expire 48h links |

### 5.3 Library Helpers

| File | Key Exports | Purpose |
|------|-------------|---------|
| `lib/featureFlags.ts` | `shouldUseV2Pipeline`, `shouldUseEntityResolution`, `setFeatureFlag` | Feature flag cascade |
| `lib/coachContext.ts` | `gatherCoachContext` | Shared AI prompt context (players, teams, coaches) |
| `lib/stringMatching.ts` | `levenshteinDistance`, `calculateMatchScore`, `ALIAS_TO_CANONICAL` | Fuzzy matching + Irish name aliases |
| `lib/playerMatching.ts` | `findSimilarPlayersLogic` | Player search with Levenshtein + team bonus |
| `lib/messageValidation.ts` | `validateTextMessage`, `validateTranscriptQuality` | Quality gates |
| `lib/duplicateDetection.ts` | `checkDuplicate` | Duplicate message detection (5min text, 2min audio) |
| `lib/feedbackMessages.ts` | `generateFeedbackMessage`, `parseConfirmationResponse` | WhatsApp feedback templates |
| `lib/whatsappCommands.ts` | `parseCommand` | v2 command parser (CONFIRM/CANCEL/YES/NO) |
| `lib/whatsappCommandHandler.ts` | `handleCommand` | v2 command dispatcher |
| `lib/circuitBreaker.ts` | `shouldCallAPI`, `calculateNextState` | AI service health circuit breaker |

---

## 6. Frontend Pages & Components

### 6.1 Pages

| Route | File | Auth | Purpose |
|-------|------|------|---------|
| `/orgs/[orgId]/coach/voice-notes` | `app/orgs/[orgId]/coach/voice-notes/page.tsx` | Coach | Main dashboard with 7+ tabs |
| `/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]` | `app/orgs/.../disambiguation/[artifactId]/page.tsx` | Coach | Resolve ambiguous entity mentions |
| `/orgs/[orgId]/admin/voice-notes` | `app/orgs/[orgId]/admin/voice-notes/page.tsx` | Admin/Owner | Organization-wide audit page |
| `/r/[code]` | `app/r/[code]/page.tsx` | **None (public)** | Quick review microsite |
| `/platform/v2-claims` | `app/platform/v2-claims/page.tsx` | Platform staff | Debug claims viewer |

### 6.2 Dashboard Tabs

The voice notes dashboard (`voice-notes-dashboard.tsx`, ~865 lines) renders these tabs:

| Tab | Component | Always Visible | Condition |
|-----|-----------|---------------|-----------|
| New | `new-note-tab.tsx` | Yes | — |
| Parents | `parents-tab.tsx` | No | `pendingSummariesCount > 0` |
| Insights | `insights-tab.tsx` (~2111 lines) | No | `pendingInsightsCount > 0` |
| Team | `team-insights-tab.tsx` | No | `pendingTeamInsightsCount > 0` |
| Sent to Parents | `auto-approved-tab.tsx` | No | Feature flag + trust level |
| History | `history-tab.tsx` | Yes | — |
| My Impact | `my-impact-tab.tsx` | Yes | — |

**Auto-switch behavior:** On load, the dashboard auto-switches from "New" to "Parents" (if pending summaries) or "Insights" (if pending insights). This runs once via a `hasAutoSwitched` guard.

**Deep linking:** URL param `?noteId=xxx` auto-switches to History tab and highlights the note.

### 6.3 Dashboard Features

| Feature | Component | What It Does |
|---------|-----------|-------------|
| Disambiguation banner | `disambiguation-banner.tsx` | Orange banner linking to disambiguation when pending entities exist |
| Degradation banner | `degradation-banner.tsx` | Amber warning when AI service is degraded |
| Trust nudge banner | `trust-nudge-banner.tsx` | Encouragement when close to next trust level |
| Notification center | `notification-center.tsx` | Bell icon with unread count, activity feed |
| 4 insight views | `insights-view-container.tsx` | List, Board (Kanban), Calendar, Players view |
| Swipe gestures | `swipeable-insight-card.tsx` | Right=apply, left=dismiss, mobile-only |
| Long-press menu | Uses `use-long-press.ts` hook | Context menu on 500ms press |
| @Mentions | `comment-form.tsx` | Coach mentions in comments with smart suggestions |
| Reactions | `insight-reactions.tsx` | Like/Helpful/Flag on insights |

### 6.4 Review Microsite (`/r/[code]`)

No-auth public page. 8-char URL codes serve as auth tokens.

| Component | Purpose |
|-----------|---------|
| `QuickReviewLayout` | Navy header, PlayerARC branding, footer with login link |
| `ReviewQueue` (~1159 lines) | Core review UI with 5 color-coded sections |
| `QuickReviewHeader` | Progress bar, reviewed/pending counts, time remaining |
| `UnmatchedPlayerCard` | Fuzzy suggestions, radio selection, manual search |
| `ExpiredLinkView` | Expiry message + WhatsApp re-generation instructions |
| `InvalidLinkView` | Invalid link error card |
| `LoadingSkeleton` | Skeleton loading state |
| `SnoozeBar` | Snooze options (1h, 2h, Tomorrow 9am) |
| `AllCaughtUpView` | Party popper when all items reviewed |

**Review queue sections (color-coded):**

| Section | Border Color | Priority | Content |
|---------|-------------|----------|---------|
| Injuries | Red | 1 (highest) | Injury-related insights |
| Unmatched Players | Amber | 2 | Insights with no player match |
| Needs Review | Yellow | 3 | Standard pending insights |
| Actions/Todos | Blue | 4 | TODO items |
| Team Notes | Green | 5 | Team-level observations |

**Swipe gestures:** Framer Motion `drag="x"`, 100px threshold, green/red overlays, haptic vibration.

### 6.5 Disambiguation Page

Groups entity resolutions by `rawText` into `MentionGroupCards`. Each shows:
- The raw name (e.g. "Johnny")
- Candidate players with similarity scores and match reasons (exact_first_name, irish_alias, fuzzy_full_name, nickname, reversed_name)
- Select / Reject / Skip actions
- When resolved, stores a coach alias (E5) and batch-resolves same-name mentions (E6)

### 6.6 Admin Audit Page

Organization-wide view of all voice notes. Features:
- Search, type filter (training/match/general)
- Expandable transcription, status badges
- Role-gated: owner/admin only

### 6.7 Claims Viewer (Platform Debug)

Stats cards (artifacts, claims, topics), expandable artifact rows with claim detail, topic breakdown badges. Platform staff only.

---

## 7. Feature Flag System

### Flags

| Flag Key | Env Variable Override | Purpose |
|----------|----------------------|---------|
| `voice_notes_v2` | `VOICE_NOTES_V2_GLOBAL` | Enable v2 artifact pipeline alongside v1 |
| `entity_resolution_v2` | `ENTITY_RESOLUTION_V2_GLOBAL` | Enable Phase 5 entity resolution after claims |

### Cascade (first match wins)

1. **Environment variable** — `"true"` or `"false"` (highest priority)
2. **Platform scope** — `featureFlags` record with `scope="platform"`
3. **Organization scope** — `scope="organization"` + matching orgId
4. **User scope** — `scope="user"` + matching userId
5. **Default** — `false`

### Integration Points

| Location | Flag Checked | Effect |
|----------|-------------|--------|
| `actions/whatsapp.ts` — `processAudioMessage` | `voice_notes_v2` | Creates artifact before v1 voice note |
| `actions/whatsapp.ts` — `processTextMessage` | `voice_notes_v2` | Creates artifact before v1 voice note |
| `actions/voiceNotes.ts` — `transcribeAudio` | (implicit: artifact exists?) | Stores v2 transcript, schedules claims |
| `actions/claimsExtraction.ts` — `extractClaims` | `entity_resolution_v2` | Schedules entity resolution |

### Enabling v2

```bash
# Option 1: Environment variable (all users)
VOICE_NOTES_V2_GLOBAL=true
ENTITY_RESOLUTION_V2_GLOBAL=true

# Option 2: Per-organization (via Convex dashboard)
# Insert into featureFlags:
# { featureKey: "voice_notes_v2", scope: "organization", organizationId: "...", enabled: true }

# Option 3: Per-user (for testing)
# { featureKey: "voice_notes_v2", scope: "user", userId: "...", enabled: true }
```

---

## 8. Trust Level System

### Levels

| Level | Name | Threshold | Auto-Apply Behavior |
|-------|------|-----------|-------------------|
| 0 | New | Default | Manual review for everything |
| 1 | Learning | 10+ approvals | Quick review with AI suggestions |
| 2 | Trusted | 50+ approvals, <10% suppression | Auto-apply non-sensitive insights |
| 3 | Expert | 200+ approvals | Full automation with coach opt-in |

### How Trust Affects Each Pipeline Stage

| Stage | Trust Effect |
|-------|-------------|
| **v1 Auto-Apply** | Level 2+ required. Confidence >= threshold. Injury/medical never auto-apply. Category must be enabled in preferences. |
| **v2 Entity Resolution** | Trust-adaptive threshold — `insightConfidenceThreshold` from trust level (default 0.9). Higher trust can lower threshold. |
| **v2 Auto-Confirm** | Level 2+ required. Confidence >= threshold. Sensitive types (injury, wellbeing, recovery) ALWAYS require confirmation. |
| **WhatsApp Reply Format** | TL0: verbose. TL1: standard. TL2: compact. TL3: minimal. |

### Coach Self-Service

- **Preferred level:** Coach can set a lower cap than their earned level via `TrustLevelSlider`
- **Effective level:** `min(currentLevel, preferredLevel)`
- **Category preferences:** Per-category toggles for auto-apply (skills, attendance, goals, performance)

---

## 9. Quality Gates

### Gate 1: Text Message Validation (US-VN-001)

**Location:** `processTextMessage()` → `validateTextMessage()` (`lib/messageValidation.ts`)

| Check | Threshold | Action on Fail |
|-------|-----------|---------------|
| Empty message | length === 0 | Reject, suggest "try again" |
| Too short | < 10 characters | Reject, suggest minimum length |
| Too few words | < 3 words | Reject, suggest more detail |
| Gibberish | avg word length > 20 or < 2 | Reject, suggest real words |
| Spam | repeated characters pattern | Reject |

### Gate 2: Transcript Quality (US-VN-002)

**Location:** `transcribeAudio()` → `validateTranscriptQuality()` (`lib/messageValidation.ts`)

| Check | Threshold | Action |
|-------|-----------|--------|
| Empty transcript | — | Reject |
| Short audio + short text | — | Reject |
| Whisper uncertainty markers | > 50% | Reject |
| Whisper uncertainty markers | > 20% | Ask user (awaiting_confirmation) |
| Sports keywords detected | — | Boost confidence |

### Gate 3: Duplicate Detection (US-VN-003)

**Location:** `processIncomingMessage()` → `checkDuplicate()` (`lib/duplicateDetection.ts`)

| Type | Window | Match Criteria |
|------|--------|---------------|
| Text | 5 minutes | Exact body match from same phone |
| Audio | 2 minutes | Same mediaContentType from same phone |

---

## 10. WhatsApp Integration

### Inbound Command Priority Chain

When a text message arrives, commands are checked in this order (first match wins):

| Priority | Command | Action |
|----------|---------|--------|
| 1 | `OK` | Batch apply all matched insights |
| 2 | `R` | Resend review link with summary |
| 3 | `SNOOZE` / `SNOOZE 2H` | Snooze review link (default 2h, max 3 snoozes) |
| 4 | `CONFIRM` / `RETRY` / `CANCEL` | v1 transcript confirmation |
| 5 | `CONFIRM` / `YES` / `CANCEL` / `NO` | v2 draft commands |
| 6 | (none matched) | Normal text processing |

### Outbound Reply Format (Trust-Adaptive)

| Trust Level | Format | Example |
|-------------|--------|---------|
| TL0 (New) | Verbose — full insight list with descriptions | "I found 3 insights about 2 players..." |
| TL1 (Learning) | Standard — summary with counts | "3 insights extracted. 2 need review." |
| TL2 (Trusted) | Compact — counts only with link | "3 insights (1 auto-applied). Review: [link]" |
| TL3 (Expert) | Minimal — confirmation only | "Done. 3 insights applied." |

### Review Link Lifecycle

1. **Generation:** `generateReviewLink` — creates 8-char code, 48h expiry, rolling (same coach+org reuses active link)
2. **Access:** Public `/r/[code]` page, no auth required, `markLinkAccessed` tracks visits
3. **Snooze:** 1h/2h/Tomorrow 9am options, max 3 snoozes, sends WhatsApp reminder when due
4. **Expiry:** Cron job `expireActiveLinks` expires 48h-old links; `cleanupExpiredLinks` removes old records

---

## 11. Key Architecture Decisions

38 ADRs in `docs/architecture/decisions/ADR-VN2-*.md`. Key decisions:

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-VN2-001 | Capability URL auth for review microsite | No login required; 8-char codes as auth tokens |
| ADR-VN2-002 | Coach-scoped rolling links | One active link per coach+org, reused across voice notes |
| ADR-VN2-007 | Feature flag cascade (env > platform > org > user) | Gradual rollout without code changes |
| ADR-VN2-009 | Dual-path processing order | v2 artifact created BEFORE v1 voice note |
| ADR-VN2-010 | Claims table denormalization | `organizationId` + `coachUserId` on claims avoids joins |
| ADR-VN2-015 | Entity resolution as separate action | Decoupled from claims extraction for independent scheduling |
| ADR-VN2-019 | Coach alias upsert with uniqueness | One alias per (coach, org, rawText) tuple |
| ADR-VN2-023 | Draft confidence = AI × resolution | Combined score gates auto-confirm decisions |
| ADR-VN2-024 | Sensitive types never auto-confirm | Injury, wellbeing, recovery always need manual review |
| ADR-VN2-027 | Migration batch size 50, max 200 | Prevents Convex function timeout |
| ADR-VN2-033 | In-app artifact creation pattern | Separate from WhatsApp; future extension point |
| ADR-VN2-037 | applyDraft output bridge | Draft → voiceNoteInsight record for v1 compatibility |

---

## 12. File Map

### Backend (`packages/backend/convex/`)

```
convex/
├── schema.ts                          # All table definitions
├── actions/
│   ├── voiceNotes.ts      (1313 lines) # v1 transcription + insight extraction
│   ├── whatsapp.ts        (1873 lines) # WhatsApp webhook + reply logic
│   ├── claimsExtraction.ts (595 lines) # v2 Phase 4 claims extraction
│   ├── entityResolution.ts (730 lines) # v2 Phase 5 entity resolution
│   ├── draftGeneration.ts  (337 lines) # v2 Phase 6 draft generation
│   └── migration.ts        (433 lines) # v1→v2 migration script
├── models/
│   ├── voiceNotes.ts      (2752 lines) # v1 CRUD + insight routing
│   ├── voiceNoteArtifacts.ts (226 lines) # v2 artifacts
│   ├── voiceNoteTranscripts.ts (75 lines) # v2 transcripts
│   ├── voiceNoteClaims.ts  (277 lines) # v2 atomic claims
│   ├── voiceNoteEntityResolutions.ts (530 lines) # v2 entity resolution
│   ├── coachPlayerAliases.ts (124 lines) # v2 alias learning
│   ├── insightDrafts.ts    (530 lines) # v2 draft confirmation
│   ├── voiceNoteInsights.ts (1426 lines) # v1 auto-apply system
│   ├── whatsappReviewLinks.ts (1753 lines) # Review microsite backend
│   └── reviewAnalytics.ts  (215 lines) # Analytics events
├── lib/
│   ├── featureFlags.ts     (318 lines) # Feature flag cascade
│   ├── coachContext.ts     (229 lines) # Shared AI prompt context
│   ├── stringMatching.ts   (215 lines) # Levenshtein + Irish aliases
│   ├── playerMatching.ts   (176 lines) # Fuzzy player search
│   ├── messageValidation.ts (240 lines) # Quality gates
│   ├── duplicateDetection.ts (101 lines) # Duplicate detection
│   ├── feedbackMessages.ts (195 lines) # WhatsApp templates
│   ├── whatsappCommands.ts (128 lines) # v2 command parser
│   ├── whatsappCommandHandler.ts (170 lines) # v2 command handler
│   └── circuitBreaker.ts  (229 lines) # AI service health
```

### Frontend (`apps/web/src/app/`)

```
app/
├── orgs/[orgId]/coach/voice-notes/
│   ├── page.tsx                        # Suspense wrapper
│   ├── loading.tsx                     # Skeleton loader
│   ├── voice-notes-dashboard.tsx (865) # Main dashboard with tabs
│   ├── components/
│   │   ├── new-note-tab.tsx            # Audio recording + typed notes
│   │   ├── insights-tab.tsx   (2111)   # Pending insights with 4 views
│   │   ├── parents-tab.tsx             # Parent summary approval
│   │   ├── team-insights-tab.tsx       # Team insights
│   │   ├── auto-approved-tab.tsx       # Sent to parents
│   │   ├── history-tab.tsx             # Note history + search
│   │   ├── my-impact-tab.tsx           # Impact dashboard + charts
│   │   ├── settings-tab.tsx            # AI preferences + trust
│   │   ├── disambiguation-banner.tsx   # Orange banner
│   │   ├── swipeable-insight-card.tsx  # Swipe gestures
│   │   ├── insights-view-container.tsx # List/Board/Calendar/Players
│   │   ├── insights-board-view.tsx     # Kanban board
│   │   ├── insights-calendar-view.tsx  # Monthly calendar
│   │   ├── insights-player-view.tsx    # Grouped by player
│   │   ├── unmatched-player-card.tsx   # (used in review microsite)
│   │   └── ... (20+ more components)
│   └── disambiguation/[artifactId]/
│       └── page.tsx           (552)    # Entity disambiguation UI
├── orgs/[orgId]/admin/voice-notes/
│   └── page.tsx               (520)    # Admin audit page
├── r/[code]/
│   ├── page.tsx               (199)    # Review microsite entry
│   ├── review-queue.tsx      (1159)    # Core review UI
│   ├── quick-review-header.tsx         # Progress header
│   ├── expired-link-view.tsx           # Expired link state
│   ├── invalid-link-view.tsx           # Invalid link state
│   ├── loading-skeleton.tsx            # Loading state
│   └── unmatched-player-card.tsx (503) # Fuzzy player matching
└── platform/v2-claims/
    └── page.tsx               (426)    # Debug claims viewer
```

---

## 13. Testing

### Automated E2E Tests

73 Playwright tests across 7 spec files in `apps/web/uat/tests/voice-notes/`:

| File | Tests | Coverage |
|------|-------|---------|
| `dashboard.spec.ts` | 19 | Dashboard UI, tabs, forms, access control |
| `admin-audit.spec.ts` | 13 | Audit page, search/filters, RBAC |
| `review-microsite.spec.ts` | 13 | Public pages, error states, no-auth |
| `typed-note-flow.spec.ts` | 10 | Typed note creation flow |
| `platform-claims-viewer.spec.ts` | 8 | Claims viewer, platform-staff access |
| `navigation-integration.spec.ts` | 7 | Cross-page nav, mobile, performance |
| `disambiguation.spec.ts` | 3 | Page structure, invalid artifacts |

**Run:** `npx -w apps/web playwright test --config=uat/playwright.config.ts uat/tests/voice-notes/`

**Coverage gaps:** WhatsApp integration, pipeline end-to-end, review microsite with data, disambiguation with real entities. See `docs/testing/voice-notes-v2-manual-test-guide.md` for full test reference.

### Architecture Decision Records

38 ADRs in `docs/architecture/decisions/ADR-VN2-001` through `ADR-VN2-038`.

---

## 14. Known Gaps & Future Work

| Gap | Description | Impact |
|-----|-------------|--------|
| **In-app typed notes skip v2** | `createTypedNote` schedules `buildInsights` directly, bypassing artifact creation and claims extraction | v2 pipeline only processes WhatsApp messages |
| **Entity mapping command** | `parseCommand` recognizes `"the twins" = Sarah, Jane` but handler only acknowledges — no actual mapping stored | Group name resolution is manual-only |
| **v2 typed notes via WhatsApp** | Text messages create v2 artifacts but claims extraction only triggers from `transcribeAudio` | WhatsApp text messages have artifacts but no claims |
| **Platform claims viewer** | Debug tool only — no production claims management UI | Platform staff can view but not act on claims |
| **Migration script** | `migrateVoiceNotesToV2` exists but hasn't been run against production data | Historical v1 notes not yet in v2 format |
| **Review microsite with v2 data** | Microsite still shows v1 insights, not v2 drafts | v2 drafts need their own review UI or bridge to v1 |

---

*Generated 2026-02-08 from branch `feat/voice-gateways-v2`*
