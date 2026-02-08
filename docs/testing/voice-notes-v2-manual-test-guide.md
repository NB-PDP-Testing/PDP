# Voice Notes V2 — Complete Manual Test Guide

> **Branch:** `feat/voice-gateways-v2`
> **Date:** 2026-02-08
> **Stories:** 21 (US-VN-001 through US-VN-021)
> **Phases:** 6

This document describes everything implemented in Voice Gateways V2, organized by phase, with manual testing instructions for each feature.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Feature Flag Setup (REQUIRED FIRST)](#feature-flag-setup)
3. [Phase 1: Quality Gates & Fuzzy Matching](#phase-1-quality-gates--fuzzy-matching)
4. [Phase 2: Coach Quick Review Microsite](#phase-2-coach-quick-review-microsite)
5. [Phase 3: V2 Artifacts Foundation](#phase-3-v2-artifacts-foundation)
6. [Phase 4: Claims Extraction](#phase-4-claims-extraction)
7. [Phase 5: Entity Resolution & Disambiguation](#phase-5-entity-resolution--disambiguation)
8. [Phase 6: Drafts, Confirmation & Migration](#phase-6-drafts-confirmation--migration)
9. [Database Tables Reference](#database-tables-reference)
10. [Known Limitations](#known-limitations)

---

## Architecture Overview

### What Changed (V1 vs V2)

**V1 Pipeline (existing):**
1. Coach sends WhatsApp audio/text message
2. Audio is transcribed (OpenAI Whisper)
3. AI extracts insights (player mentions, categories)
4. Insights stored in `voiceNotes.insights[]` array
5. Coach reviews insights in web app → Apply or Dismiss

**V2 Pipeline (new, runs alongside V1):**
1. Coach sends WhatsApp audio/text message
2. **Quality gates** validate the message (Phase 1)
3. **Duplicate detection** prevents reprocessing (Phase 1)
4. A `voiceNoteArtifact` record is created (Phase 3)
5. Transcript stored in `voiceNoteTranscripts` table (Phase 3)
6. AI extracts **claims** — atomic facts with 15 topic categories (Phase 4)
7. **Entity resolution** matches player/team names to database records (Phase 5)
8. **Disambiguation UI** lets coach resolve ambiguous names (Phase 5)
9. **Insight drafts** are generated with confidence scoring (Phase 6)
10. Coach confirms/cancels via **WhatsApp commands** (Phase 6)

**Both pipelines coexist.** The V2 pipeline is gated behind a feature flag (see below). When V2 is enabled, it creates artifacts AND still creates V1 voice notes for backward compatibility.

### Data Flow Diagram

```
WhatsApp Message
    │
    ├── Quality Gate (reject/confirm/process)
    ├── Duplicate Check (block if duplicate within 5 min)
    │
    ▼
┌─────────────────┐     ┌──────────────────────┐
│  voiceNotes     │     │  voiceNoteArtifacts   │  (V2 only)
│  (V1 record)    │     │  (source-agnostic)    │
└─────────────────┘     └──────────┬───────────┘
                                   │
                        ┌──────────┴───────────┐
                        │  voiceNoteTranscripts │
                        └──────────┬───────────┘
                                   │
                        ┌──────────┴───────────┐
                        │  voiceNoteClaims      │  (15 topic categories)
                        └──────────┬───────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   │  voiceNoteEntityResolutions    │  (ambiguous mentions)
                   └───────────────┬───────────────┘
                                   │
                        ┌──────────┴───────────┐
                        │  insightDrafts        │  (pending confirmation)
                        └──────────────────────┘
```

---

## Feature Flag Setup

**You MUST enable the V2 feature flag to test Phases 3-6.** Phases 1-2 work regardless of the flag.

### Option A: Environment Variable (Global Override)

Set in your Convex deployment environment variables:
```
VOICE_NOTES_V2_GLOBAL=true
```
This forces V2 for ALL coaches across ALL organizations.

### Option B: Per-Organization (Convex Dashboard)

1. Open the Convex Dashboard
2. Navigate to the `featureFlags` table
3. Insert a new document:
```json
{
  "featureKey": "voice_notes_v2",
  "scope": "organization",
  "organizationId": "<your-org-id>",
  "enabled": true,
  "updatedAt": 1707350400000,
  "notes": "Testing V2 pipeline"
}
```

### Option C: Per-Coach (Convex Dashboard)

Same as above but with:
```json
{
  "featureKey": "voice_notes_v2",
  "scope": "user",
  "userId": "<coach-user-id>",
  "enabled": true,
  "updatedAt": 1707350400000,
  "notes": "Beta tester"
}
```

### Entity Resolution Flag

To also enable entity resolution (Phase 5), set a second flag:
```json
{
  "featureKey": "entity_resolution_v2",
  "scope": "platform",
  "enabled": true,
  "updatedAt": 1707350400000
}
```
Or use the environment variable: `ENTITY_RESOLUTION_V2_GLOBAL=true`

---

## Phase 1: Quality Gates & Fuzzy Matching

**Purpose:** Prevent garbage data from entering the pipeline. Improve player name matching.

### US-VN-001: Text Message Quality Gate

**What it does:** Validates incoming WhatsApp text messages before processing.

**5 Quality Checks:**
1. Empty message detection
2. Minimum length (must be > 10 characters)
3. Minimum word count (must be > 3 words)
4. Average word length check (rejects keyboard-mash like "asdfghjkl")
5. Repeated character detection (rejects "aaaaaaa" or "!!!!!!!")

**Where:** `packages/backend/convex/lib/messageValidation.ts` → `validateTextMessage()`

**How to test:**
- [ ] Send an empty WhatsApp message → should be rejected with feedback
- [ ] Send "hi" → should be rejected (too short)
- [ ] Send "ok ok" → should be rejected (too few words, too short)
- [ ] Send "asdkjfhaskdjfhaskjdfh" → should be rejected (keyboard mash)
- [ ] Send "!!!!!!!!!!!!!!!!!!!!" → should be rejected (repeated chars)
- [ ] Send a normal 2-3 sentence message about a player → should be accepted

### US-VN-002: Transcript Quality Validation

**What it does:** After audio transcription, validates the transcript quality before extracting insights.

**Checks:**
- Uncertainty marker detection (words like "inaudible", "[unclear]", etc.)
- Sports context boosting (sports-related words increase confidence)
- Overall confidence score (0-1 scale)

**Three outcomes:**
- `process` — transcript is good, continue to insights
- `ask_user` — quality is borderline, ask coach via WhatsApp to confirm
- `reject` — transcript is unintelligible, reject with feedback

**Where:** `packages/backend/convex/lib/messageValidation.ts` → `validateTranscriptQuality()`

**How to test:**
- [ ] Send a clear audio recording → should transcribe and continue to insights
- [ ] Send a noisy/unclear audio recording → should get a "Is this correct?" confirmation message back on WhatsApp
- [ ] Send an audio of background noise only → should be rejected with feedback

### US-VN-003: Duplicate Message Detection

**What it does:** Prevents the same message from being processed twice within a 5-minute window.

**Detection criteria:**
- Same coach
- Same organization
- Same message type (text or audio)
- Same text content (for text messages)
- Within 5 minutes of previous message

**Where:** `packages/backend/convex/lib/duplicateDetection.ts` → `checkForDuplicateMessage()`

**How to test:**
- [ ] Send a WhatsApp text message about a player
- [ ] Immediately send the exact same text again → should be blocked with "Duplicate detected" feedback
- [ ] Wait 6 minutes, send the same text again → should be processed normally
- [ ] Send a different text immediately → should be processed normally

### US-VN-004: Enhanced WhatsApp Feedback Messages

**What it does:** Sends structured, helpful feedback to coaches via WhatsApp when things go wrong or need attention.

**5 Feedback categories:**
1. Quality rejection (poor audio/text)
2. Duplicate detection
3. Processing confirmation
4. Error notification
5. Action required (e.g., confirm unclear transcript)

**Workflow buttons sent:** CONFIRM / RETRY / CANCEL

**Where:** `packages/backend/convex/lib/feedbackMessages.ts` → `sendDetailedFeedback()`

**How to test:**
- [ ] Trigger each quality check (above) and verify you receive a well-formatted WhatsApp message back
- [ ] Check that the feedback message includes specific reasons for rejection
- [ ] Verify CONFIRM/RETRY/CANCEL buttons appear in WhatsApp for confirmation requests

### US-VN-005: Levenshtein Fuzzy Matching

**What it does:** Fuzzy string matching for player names. Handles typos, phonetic variations, and Irish name forms (O'Brien → OBrien, Mac → Mc, etc.).

**Key functions:**
- `levenshteinDistance()` — edit distance between two strings
- `levenshteinSimilarity()` — similarity score (0-1)
- `normalizeForMatching()` — removes diacritics (e.g., Seán → Sean), strips O'/Mc/Mac prefixes for comparison

**Where:** `packages/backend/convex/lib/stringMatching.ts`

**How to test:**
- [ ] In a voice note, refer to a player as "Shawn" when their name is "Sean" → should still match
- [ ] Refer to "O'Brien" when database has "Obrien" → should match
- [ ] Refer to "MacCarthy" when database has "McCarthy" → should match
- [ ] Refer to "Séan" (with accent) when database has "Sean" → should match
- [ ] Use a completely wrong name → should NOT match (similarity below 0.85 threshold)

### US-VN-006: Find Similar Players Query

**What it does:** Given a name string, finds matching players in the organization using fuzzy matching with context weighting.

**Context weighting:**
- Recently mentioned players: +0.1 score boost
- Players on same team as coach: +0.15 score boost

**Where:** `packages/backend/convex/models/orgPlayerEnrollments.ts` → `findSimilarPlayers()`

**How to test:**
- [ ] Call the query with an exact player name → should return that player with high score
- [ ] Call with a slightly misspelled name → should return the correct player
- [ ] Call with a name that matches multiple players → should return all matches, ranked by score
- [ ] Verify that players on the coach's team rank higher than players on other teams

---

## Phase 2: Coach Quick Review Microsite

**Purpose:** A zero-login mobile web page where coaches can review and approve AI insights by clicking a link sent via WhatsApp.

### US-VN-007: Review Links Backend

**What it does:** Creates aggregated, coach-scoped review links. Instead of one link per voice note, a single link aggregates ALL pending items for that coach.

**Key properties:**
- 8-character alphanumeric code (e.g., `abc12def`)
- 48-hour expiry (link stops working after 48h)
- Device fingerprint binding (optional — binds to first device that opens it)
- Access audit log (tracks who opened the link and when)

**Where:** `packages/backend/convex/models/whatsappReviewLinks.ts`

**Schema fields:**
- `code` — the 8-char code
- `coachId` — the coach this link belongs to
- `organizationId` — org scope
- `expiresAt` — timestamp when link expires
- `status` — "active", "expired", "revoked"
- `accessLog` — array of `{ timestamp, deviceFingerprint, ipAddress }`
- `pendingItems` — array of voice note IDs with insights to review

**How to test:**
- [ ] Have a coach send a voice note via WhatsApp
- [ ] After processing, a review link should be sent back to the coach
- [ ] The link should be in format: `https://<domain>/r/<8-char-code>`
- [ ] Opening the link in a browser should work without login
- [ ] The same link should aggregate multiple pending voice notes
- [ ] After 48 hours, the link should show an expired message

### US-VN-008: Quick Review Microsite Page

**What it does:** A public web page at `/r/[code]` that shows the coach's pending review items. No authentication required — the code IS the token.

**URL:** `https://<your-domain>/r/<code>`

**Where:** `apps/web/src/app/r/[code]/page.tsx`

**Components:**
- `page.tsx` — main page, validates code, fetches data
- `quick-review-header.tsx` — branded header with coach name and stats
- `review-queue.tsx` — the main content area
- `loading-skeleton.tsx` — loading state
- `expired-link-view.tsx` — shown when link has expired
- `invalid-link-view.tsx` — shown when code doesn't exist

**How to test:**
- [ ] Open a valid review link → should show the review page with coach's name
- [ ] Open an invalid code (e.g., `/r/xxxxxxxx`) → should show "Invalid Link" page
- [ ] Open an expired link → should show "Link Expired" page with option to request a new one
- [ ] Page should be mobile-responsive (test on phone or mobile viewport)
- [ ] No login prompt should appear — page loads directly

### US-VN-009: Review Queue Sections & Batch Actions

**What it does:** Organizes pending items into 6 priority-sorted sections with batch approve/dismiss actions.

**6 sections (in priority order):**
1. **Injuries** — highest priority, red highlight
2. **Unmatched Players** — needs coach attention, amber highlight
3. **Pending Insights** — standard review items
4. **TODOs** — task items for the coach
5. **Team Observations** — team-level insights
6. **Auto-Applied** — already applied, shown for awareness

**Batch actions:**
- "Apply All" button (applies all insights in a section)
- "Dismiss All" button
- Individual apply/dismiss per insight
- Progress counter showing "3 of 12 reviewed"

**"All Caught Up" state:** When all items are reviewed, shows a congratulatory message.

**Where:** `apps/web/src/app/r/[code]/review-queue.tsx`

**How to test:**
- [ ] Have multiple voice notes with different insight categories → verify they sort into correct sections
- [ ] Injury insights should appear first with red styling
- [ ] Unmatched players should appear second with amber styling
- [ ] Use "Apply All" on a section → all items in that section should be applied
- [ ] Use "Dismiss All" → all items dismissed
- [ ] Review all items → should see "All Caught Up" message
- [ ] Progress counter should update as you review items (e.g., "5 of 10 reviewed")

### US-VN-010: Unmatched Player Cards + Text Reply

**What it does:** When AI can't match a player name, shows a card with fuzzy suggestions and a text input for the coach to type the correct name.

**Where:** `apps/web/src/app/r/[code]/unmatched-player-card.tsx`

**Features:**
- Shows the unmatched name from the transcript
- Displays up to 5 fuzzy match suggestions with similarity scores
- Coach can tap a suggestion to select it
- Coach can type a name manually in the text input
- Uses `findSimilarPlayersForReview` (public query wrapper)

**How to test:**
- [ ] Send a voice note mentioning a player with a slightly wrong name
- [ ] Open the review link → the unmatched player card should appear
- [ ] Fuzzy suggestions should be shown below the unmatched name
- [ ] Tap a suggestion → it should be selected and applied
- [ ] Type a different name manually → should search and match
- [ ] If no match exists at all, should allow dismissal

### US-VN-011: Trust-Adaptive Messages + WhatsApp Quick Actions

**What it does:** WhatsApp response messages adapt to the coach's trust level (TL0-3). Higher trust = less detail, more automation.

**Trust levels:**
| Level | Name | Behavior |
|-------|------|----------|
| TL0 | New Coach | Full details, all insights listed, no auto-apply |
| TL1 | Building Trust | Summary + key insights, some auto-apply |
| TL2 | Trusted | Brief summary + running totals |
| TL3 | Highly Trusted | Minimal message, most things auto-applied |

**WhatsApp quick replies:**
- `OK` — apply all matched insights from the last message
- `R` — resend the review link

**Running totals:** Messages include cumulative stats like "12 insights applied this week, 3 pending"

**Where:** `packages/backend/convex/actions/whatsapp.ts` → `formatResultsMessage()`

**How to test:**
- [ ] Send voice notes as a TL0 coach → should receive detailed WhatsApp messages listing every insight
- [ ] As the same coach builds trust (or manually set TL2 in DB) → messages should become shorter
- [ ] Reply `OK` to a WhatsApp message → should apply all pending matched insights
- [ ] Reply `R` → should receive a new review link
- [ ] Check that running totals appear in messages ("5 insights applied this session")

### US-VN-012: Link Expiry & Cleanup

**What it does:** A daily cron job cleans up expired review links (older than 7 days). Also handles the expired link UI.

**Where:**
- Cron: `packages/backend/convex/crons.ts`
- UI: `apps/web/src/app/r/[code]/expired-link-view.tsx`

**Lifecycle:**
1. Link created → status: "active"
2. After 48h → status: "expired" (link stops working)
3. After 7 days → daily cron deletes the record entirely

**How to test:**
- [ ] Open a link that was created > 48h ago → should show expired view
- [ ] Expired view should show a message like "This link has expired" with the original expiry time
- [ ] Verify the cron job exists in `crons.ts` (runs daily)
- [ ] To force-test: manually set `expiresAt` to a past timestamp in Convex dashboard, then open the link

---

## Phase 3: V2 Artifacts Foundation

**Purpose:** Create the new data model for source-agnostic voice note storage that supports the V2 pipeline.

### US-VN-013: Artifacts & Transcripts Tables

**What it does:** Introduces two new tables that form the backbone of V2 processing.

**`voiceNoteArtifacts` table:**
| Field | Type | Description |
|-------|------|-------------|
| `artifactId` | string | Unique ID (crypto-generated) |
| `organizationId` | string | Org scope |
| `coachUserId` | string | Coach who created it |
| `sourceChannel` | string | "whatsapp_text", "whatsapp_audio", "app_recorded", "app_typed" |
| `voiceNoteId` | optional ID | Link back to V1 voice note |
| `status` | string | "pending", "transcribing", "transcribed", "extracting_claims", "resolving_entities", "generating_drafts", "completed", "failed" |
| `rawText` | optional string | Original text (for text messages) |
| `duration` | optional number | Audio duration in seconds |
| `language` | optional string | Detected language |
| `createdAt` | number | Timestamp |

**Indexes:**
- `by_artifactId`
- `by_org_and_coach`
- `by_org_and_status`
- `by_voiceNoteId`

**`voiceNoteTranscripts` table:**
| Field | Type | Description |
|-------|------|-------------|
| `artifactId` | string | Link to artifact |
| `fullText` | string | Complete transcript text |
| `segments` | array | `{ start, end, text, confidence }` |
| `modelUsed` | string | e.g., "whisper-1" |
| `language` | string | Detected language code |
| `duration` | number | Audio duration |
| `createdAt` | number | Timestamp |

**Where:** `packages/backend/convex/models/voiceNoteArtifacts.ts` and `voiceNoteTranscripts.ts`

**How to test:**
- [ ] Enable V2 flag (see Feature Flag Setup)
- [ ] Send a WhatsApp message → verify a `voiceNoteArtifacts` record is created in Convex dashboard
- [ ] Check `sourceChannel` is correct ("whatsapp_text" or "whatsapp_audio")
- [ ] For audio: verify a `voiceNoteTranscripts` record is created with segments
- [ ] Verify `status` progresses through the pipeline stages

### US-VN-014: Dual-Path Processing

**What it does:** When V2 is enabled, the WhatsApp handler creates BOTH a V1 voice note AND a V2 artifact. The V1 path continues as before. The V2 path triggers the new pipeline (claims → entity resolution → drafts).

**Feature flag cascade:**
1. `VOICE_NOTES_V2_GLOBAL` env var (highest priority)
2. Platform-level flag in `featureFlags` table
3. Organization-level flag
4. User-level flag
5. Default: false

**Where:** `packages/backend/convex/lib/featureFlags.ts` → `shouldUseV2Pipeline()`

**How to test:**
- [ ] With V2 flag OFF: send WhatsApp message → only `voiceNotes` record created, no artifact
- [ ] With V2 flag ON: send WhatsApp message → both `voiceNotes` AND `voiceNoteArtifacts` records created
- [ ] Set flag at org level only → only that org's coaches get V2
- [ ] Set flag at user level → only that specific coach gets V2
- [ ] Set env var `VOICE_NOTES_V2_GLOBAL=false` → overrides all other flags, V2 disabled

---

## Phase 4: Claims Extraction

**Purpose:** Extract structured, atomic claims from transcripts using AI. A "claim" is a single factual statement (e.g., "Player X has a knee injury", "Player Y showed great passing skills").

### US-VN-015: Claims Table & Extraction Action

**What it does:** After transcription, AI (GPT-4) analyzes the transcript and extracts individual claims with metadata.

**`voiceNoteClaims` table:**
| Field | Type | Description |
|-------|------|-------------|
| `claimId` | string | Unique claim identifier |
| `artifactId` | string | Parent artifact |
| `organizationId` | string | Org scope |
| `coachUserId` | string | Coach |
| `rawText` | string | Original text snippet |
| `normalizedText` | string | Cleaned/standardized text |
| `topic` | string | One of 15 categories (see below) |
| `mentionedEntities` | array | `{ rawText, entityType, resolvedId? }` |
| `confidence` | number | AI confidence (0-1) |
| `status` | string | "pending", "resolved", "applied", "dismissed" |
| `createdAt` | number | Timestamp |

**15 Topic Categories:**
| Category | Description | Example |
|----------|-------------|---------|
| `injury` | Physical injury reports | "Sean hurt his knee at training" |
| `skill_rating` | Specific skill score | "His passing is a 4 out of 5" |
| `skill_progress` | Skill improvement/decline | "Her dribbling has improved massively" |
| `behavior` | Behavioral observations | "Jack was disruptive during warm-up" |
| `performance` | Match/training performance | "She was outstanding in the second half" |
| `attendance` | Attendance notes | "Missing from last 3 sessions" |
| `wellbeing` | Emotional/mental state | "He seemed upset after the game" |
| `recovery` | Recovery from injury | "Back to full training next week" |
| `development_milestone` | Key achievement | "First time she completed the full drill" |
| `physical_development` | Physical growth | "He's grown 3 inches this season" |
| `parent_communication` | Parent interaction | "Spoke with his mother about attendance" |
| `tactical` | Tactical observations | "Plays better on the left wing" |
| `team_culture` | Team dynamics | "Great team spirit in training today" |
| `todo` | Action items for coach | "Need to call the physio about Sean" |
| `session_plan` | Training plan notes | "Focus on set pieces next session" |

**Coach Context Helper:**
`packages/backend/convex/lib/coachContext.ts` — builds a context object with the coach's teams, players, and recent activity to improve AI accuracy.

**Where:**
- Action: `packages/backend/convex/actions/claimsExtraction.ts`
- Model: `packages/backend/convex/models/voiceNoteClaims.ts`

**How to test:**
- [ ] Enable V2 flag
- [ ] Send a voice note mentioning several players with different topics
- [ ] Check `voiceNoteClaims` table in Convex dashboard → should see individual claims
- [ ] Each claim should have a `topic` from the 15 categories
- [ ] Each claim should have `mentionedEntities` with raw player/team names
- [ ] Claims should have confidence scores (0-1)
- [ ] A single voice note saying "Sean hurt his knee, and Emma's passing was excellent" should produce at least 2 claims: one `injury` and one `skill_rating` or `skill_progress`

### US-VN-016: Pipeline Integration & Claims Viewer

**What it does:**
1. Claims extraction is automatically triggered after transcription (scheduled in parallel with V1 insight building)
2. A debug viewer page at `/platform/v2-claims` shows recent artifacts and their extracted claims

**Claims Viewer URL:** `https://<your-domain>/platform/v2-claims`

**Where:** `apps/web/src/app/platform/v2-claims/page.tsx`

**Viewer features:**
- Lists recent artifacts with status
- Expandable claims per artifact
- Shows claim topic, confidence, entities, status
- Platform staff only (requires `isPlatformStaff`)

**How to test:**
- [ ] Process several voice notes with V2 enabled
- [ ] Navigate to `/platform/v2-claims` as a platform staff user
- [ ] Should see a list of recent artifacts
- [ ] Expand an artifact → should see its extracted claims
- [ ] Each claim should show topic category, confidence score, and mentioned entities
- [ ] Non-platform-staff users should NOT be able to access this page

---

## Phase 5: Entity Resolution & Disambiguation

**Purpose:** When AI extracts a claim mentioning "Alex", which Alex does it mean? Entity resolution tries to automatically match names to database records. When it can't, the disambiguation UI lets the coach choose.

### US-VN-017: Entity Resolution Table, Aliases & Action

**What it does:**

**Entity Resolution Action** (`actions/entityResolution.ts` → `resolveEntities`):
1. Takes an artifact with extracted claims
2. For each mentioned entity, attempts to resolve it:
   - Check `coachPlayerAliases` (coach's saved nicknames/abbreviations)
   - Exact name match against enrolled players
   - Fuzzy match (Levenshtein, 0.85+ threshold)
   - Irish name aliases (Sean/Shaun/Shawn, Niamh/Neve, etc.)
3. For each entity, stores resolution candidates with match reasons and confidence

**`voiceNoteEntityResolutions` table:**
| Field | Type | Description |
|-------|------|-------------|
| `artifactId` | string | Parent artifact |
| `claimId` | string | Parent claim |
| `organizationId` | string | Org scope |
| `coachUserId` | string | Coach |
| `rawText` | string | Original name text (e.g., "Alex") |
| `entityType` | string | "player", "team", "coach" |
| `status` | string | "pending", "resolved", "rejected", "skipped" |
| `candidates` | array | `{ playerId, playerName, confidence, matchReason }` |
| `resolvedEntityId` | optional string | Final resolved player/team ID |
| `resolvedBy` | optional string | "auto" or "coach" |
| `createdAt` | number | Timestamp |

**Match reasons on candidates:**
- `exact_first_name` — first name matches exactly
- `exact_full_name` — full name matches exactly
- `fuzzy_full_name` — fuzzy match above threshold
- `fuzzy_first_name` — first name fuzzy match
- `irish_alias` — known Irish name variant
- `last_name_match` — last name matches
- `coach_alias` — coach's saved alias for this player

**`coachPlayerAliases` table:**
| Field | Type | Description |
|-------|------|-------------|
| `coachUserId` | string | Coach |
| `organizationId` | string | Org scope |
| `alias` | string | The alias/nickname (e.g., "Big Sean") |
| `playerIdentityId` | ID | The resolved player |
| `createdAt` | number | Timestamp |

When a coach resolves an ambiguous name, it's saved as an alias so future notes auto-resolve.

**Trust-adaptive auto-resolve (Enhancement E1):**
- Each coach has an `insightConfidenceThreshold` (from trust levels)
- If top candidate's confidence exceeds the threshold, auto-resolve without asking coach
- Higher trust = lower threshold = more auto-resolution

**Where:**
- Action: `packages/backend/convex/actions/entityResolution.ts`
- Model: `packages/backend/convex/models/voiceNoteEntityResolutions.ts`
- Aliases: `packages/backend/convex/models/coachPlayerAliases.ts`

**How to test:**
- [ ] Enable V2 + entity resolution flags
- [ ] Send a voice note mentioning a player by first name only (e.g., "Alex did really well today")
- [ ] Check `voiceNoteEntityResolutions` table → should see candidates for "Alex"
- [ ] If only one "Alex" in the org → should auto-resolve
- [ ] If multiple "Alex" players → should be "pending" for coach disambiguation
- [ ] Check that `matchReason` is populated on each candidate
- [ ] Resolve a name manually, then send another note with the same name → should auto-resolve via alias

### US-VN-018: Disambiguation UI

**What it does:** A web page where coaches resolve ambiguous player mentions.

**URL:** `/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]`

**UI Features:**
- Groups mentions by raw text (all "Alex" mentions grouped together)
- Shows candidate matches with:
  - Player name
  - Confidence percentage (0-100%)
  - Match reason badge (e.g., "Irish alias", "Fuzzy match", "Exact name")
  - "On your team" indicator
- Radio button selection for choosing the correct match
- "None of these" button with confirmation dialog
- Batch resolution: selecting one "Alex" applies to ALL "Alex" mentions in that artifact
- Skip all remaining button
- Mobile-responsive (touch targets 44px+)

**Disambiguation Banner:**
- Appears on the main voice notes dashboard when there are pending resolutions
- Shows count of unique names and notes needing attention
- Clickable → navigates to disambiguation page

**Analytics events tracked:**
- `disambiguate_accept` — coach selected a candidate
- `disambiguate_reject_all` — coach said "none of these"
- `disambiguate_skip` — coach skipped the resolution

**Where:**
- Page: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]/page.tsx`
- Banner: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/disambiguation-banner.tsx`

**How to test:**
- [ ] Create voice notes with ambiguous player names (multiple players with same first name)
- [ ] Navigate to coach voice notes dashboard → should see disambiguation banner
- [ ] Banner should show "2 names in 1 note need your attention" (or similar)
- [ ] Click the banner → should navigate to disambiguation page
- [ ] On disambiguation page:
  - [ ] Each ambiguous name should be shown as a group
  - [ ] Candidates should have confidence scores and match reason badges
  - [ ] Select a candidate → confirm → should resolve the mention
  - [ ] All same-name mentions should be resolved together (batch)
  - [ ] Click "None of these" → confirmation dialog should appear
  - [ ] Click "Skip all remaining" → remaining items should be skipped
- [ ] After resolving all → should redirect back to voice notes dashboard
- [ ] Disambiguation banner should disappear when no pending items remain

---

## Phase 6: Drafts, Confirmation & Migration

**Purpose:** Create draft insights from resolved claims, let coaches confirm/cancel via WhatsApp, and provide a migration path for V1 data.

### US-VN-019: Drafts Table

**What it does:** After claims are extracted and entities resolved, generates "insight drafts" — proposed changes that need coach confirmation before being applied.

**`insightDrafts` table:**
| Field | Type | Description |
|-------|------|-------------|
| `draftId` | string | Unique draft identifier |
| `artifactId` | string | Parent artifact |
| `claimId` | string | Source claim |
| `organizationId` | string | Org scope |
| `coachUserId` | string | Coach |
| `playerIdentityId` | optional ID | Resolved player |
| `playerName` | optional string | Player name |
| `title` | string | Insight title |
| `description` | string | Insight description |
| `category` | string | Topic category |
| `recommendedAction` | string | What to do (e.g., "Add injury record") |
| `aiConfidence` | number | AI extraction confidence (0-1) |
| `resolutionConfidence` | number | Entity resolution confidence (0-1) |
| `combinedConfidence` | number | `aiConfidence * resolutionConfidence` |
| `requiresConfirmation` | boolean | Whether coach must explicitly confirm |
| `status` | string | "pending", "confirmed", "cancelled", "auto_applied" |
| `confirmedAt` | optional number | Timestamp of confirmation |
| `cancelledAt` | optional number | Timestamp of cancellation |
| `createdAt` | number | Timestamp |

**Confidence scoring:**
- `combinedConfidence = aiConfidence * resolutionConfidence`
- If `combinedConfidence >= coach's threshold` AND `category` is not injury/behavior → `requiresConfirmation = false` (auto-apply eligible)
- Otherwise `requiresConfirmation = true` (must confirm)

**Where:**
- Action: `packages/backend/convex/actions/draftGeneration.ts`
- Model: `packages/backend/convex/models/insightDrafts.ts`

**How to test:**
- [ ] Enable V2 flag and process a voice note through the full pipeline
- [ ] Check `insightDrafts` table → should see draft records
- [ ] Each draft should have `aiConfidence`, `resolutionConfidence`, and `combinedConfidence`
- [ ] Drafts for injury/behavior topics should always have `requiresConfirmation = true`
- [ ] High-confidence drafts for non-sensitive topics should have `requiresConfirmation = false`
- [ ] Draft status should start as "pending"

### US-VN-020: WhatsApp Commands

**What it does:** Lets coaches manage drafts directly from WhatsApp by sending text commands.

**Commands:**
| Command | Action | Example |
|---------|--------|---------|
| `CONFIRM` | Confirm ALL pending drafts from the latest artifact | Coach sends "CONFIRM" |
| `CONFIRM 1,2,3` | Confirm specific drafts by number | Coach sends "CONFIRM 1,3" |
| `CANCEL` | Cancel ALL pending drafts from the latest artifact | Coach sends "CANCEL" |
| `TWINS=Sean:Sean A, Sean B` | Map an ambiguous name to specific players | Coach sends "TWINS=Alex:Alex Murphy, Alex Kelly" |

**Command parsing:** Case-insensitive, trims whitespace, supports comma-separated lists.

**Where:**
- Parser: `packages/backend/convex/lib/whatsappCommands.ts` → `parseCommand()`
- Handler: `packages/backend/convex/lib/whatsappCommandHandler.ts`
- Integration: `packages/backend/convex/actions/whatsapp.ts` (checks for commands before normal processing)

**How to test:**
- [ ] Process a voice note, receive drafts pending confirmation
- [ ] Send "CONFIRM" via WhatsApp → all pending drafts should be confirmed
- [ ] Send "CANCEL" via WhatsApp → all pending drafts should be cancelled
- [ ] Process another note, then send "CONFIRM 1,3" → only drafts 1 and 3 confirmed, rest remain pending
- [ ] Send "TWINS=Alex:Alex Murphy, Alex Kelly" → should create alias mappings
- [ ] Commands should be case-insensitive ("confirm" = "CONFIRM" = "Confirm")
- [ ] Sending a regular message (not a command) should be processed normally as a voice note

### US-VN-021: V1 to V2 Migration Script

**What it does:** A migration action that backfills existing V1 voice notes into the V2 pipeline (creates artifacts, transcripts, and claims for existing data).

**Where:** `packages/backend/convex/actions/migration.ts`

**Features:**
- Batch processing (configurable, default 50 records per batch, max 200)
- Queries completed V1 voice notes that haven't been migrated yet
- For each V1 note: creates artifact → transcript → triggers claims extraction
- Dry-run mode (preview what would be migrated without making changes)
- Progress logging every 50 records
- Per-note error handling (one failure doesn't stop the batch)
- Returns summary: `{ total, migrated, skipped, errors }`

**Status:** Implementation exists in code but was flagged as incomplete in QA audit. The file exists at `packages/backend/convex/actions/migration.ts` but may need verification of all acceptance criteria.

**How to test:**
- [ ] Have existing V1 voice notes in the database (with transcriptions and insights)
- [ ] Run migration with `dryRun: true` → should return count of notes that would be migrated, no actual changes
- [ ] Run migration with `limit: 5` → should migrate only 5 notes
- [ ] Check that migrated notes have corresponding `voiceNoteArtifacts` and `voiceNoteTranscripts` records
- [ ] Run migration again → already-migrated notes should be skipped
- [ ] Check error handling: if a note fails to migrate, the batch should continue with remaining notes

---

## Database Tables Reference

### New Tables Added in V2

| Table | Phase | Purpose |
|-------|-------|---------|
| `featureFlags` | 3 | Feature flag storage (platform/org/user scope) |
| `voiceNoteArtifacts` | 3 | Source-agnostic voice note containers |
| `voiceNoteTranscripts` | 3 | Transcript text with segments and timing |
| `voiceNoteClaims` | 4 | Extracted factual claims (15 topics) |
| `voiceNoteEntityResolutions` | 5 | Entity disambiguation candidates |
| `coachPlayerAliases` | 5 | Coach-specific player name aliases |
| `insightDrafts` | 6 | Pending insight drafts for confirmation |
| `whatsappReviewLinks` | 2 | Coach-scoped review link codes |
| `reviewAnalytics` | 2.5 | Review interaction analytics |

### Modified Tables

| Table | Changes |
|-------|---------|
| `voiceNotes` | Added `transcriptQuality`, `transcriptValidation`, quality gate fields |
| `whatsappMessages` | Added duplicate detection fields |

### Index Count by Table

| Table | Indexes |
|-------|---------|
| `voiceNoteArtifacts` | 4 |
| `voiceNoteTranscripts` | 1 |
| `voiceNoteClaims` | 7 |
| `voiceNoteEntityResolutions` | 4 |
| `coachPlayerAliases` | 2 |
| `insightDrafts` | 4+ |
| `whatsappReviewLinks` | 3+ |
| `featureFlags` | 3 |

---

## Known Limitations

1. **No admin UI for feature flags** — Must toggle via Convex dashboard or environment variables
2. **Review microsite has no authentication** — The 8-char code is the only security. Anyone with the link can access it (mitigated by 48h expiry and device binding)
3. **US-VN-021 (Migration) may be incomplete** — QA flagged this story as not meeting all acceptance criteria. The file exists but needs verification
4. **Entity resolution requires the separate `entity_resolution_v2` flag** — It's not automatically enabled with `voice_notes_v2`
5. **Claims extraction uses GPT-4** — Requires OpenAI API key and will incur costs
6. **WhatsApp commands are prefix-matched** — A message starting with "CONFIRM" will be treated as a command, not a voice note. This could cause issues if a coach starts a message with that word naturally
7. **Dual-path creates duplicate data** — When V2 is enabled, both V1 and V2 records are created. This is intentional for backward compatibility but increases storage
8. **Irish name aliases are hardcoded** — The list of Irish name variants is in `stringMatching.ts` and not configurable
9. **Disambiguation UI requires org login** — Unlike the `/r/[code]` review microsite, the disambiguation page at `/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]` requires normal authentication
10. **Claims viewer is platform-staff only** — The `/platform/v2-claims` debug page is restricted to platform staff

---

## Quick Test Checklist (End-to-End)

Use this for a full end-to-end test of the V2 pipeline:

### Prerequisites
- [ ] V2 feature flag enabled (see Feature Flag Setup)
- [ ] Entity resolution flag enabled
- [ ] Coach user with WhatsApp connected
- [ ] Players enrolled in the organization
- [ ] Coach assigned to at least one team with players

### Happy Path
1. [ ] Coach sends a WhatsApp voice note mentioning 2-3 players by name
2. [ ] Verify quality gate passes (no rejection message)
3. [ ] Verify no duplicate detection triggered
4. [ ] Check Convex dashboard: `voiceNoteArtifacts` record created with `status: "completed"`
5. [ ] Check `voiceNoteTranscripts` record has transcript text
6. [ ] Check `voiceNoteClaims` has individual claims with correct topics
7. [ ] Check `voiceNoteEntityResolutions` has candidates for each mentioned player
8. [ ] If ambiguous names: check disambiguation banner appears on voice notes dashboard
9. [ ] Resolve ambiguous names via disambiguation UI
10. [ ] Check `insightDrafts` are generated
11. [ ] Coach sends "CONFIRM" via WhatsApp → drafts confirmed
12. [ ] Verify coach receives confirmation message on WhatsApp
13. [ ] Open `/r/[code]` review link → verify it works without login
14. [ ] Review and apply insights via the microsite
15. [ ] Verify all items show "All Caught Up" when done

### Error Paths
16. [ ] Send a very short message → quality gate rejects it
17. [ ] Send the same message twice quickly → duplicate detected
18. [ ] Open an expired review link → expired view shown
19. [ ] Open an invalid review link code → invalid view shown
20. [ ] Send "CANCEL" via WhatsApp → pending drafts cancelled

---

## Automated E2E Test Suite Reference

**Location:** `apps/web/uat/tests/voice-notes/`
**Framework:** Playwright | **Total Tests:** 73 | **Last Run:** 2026-02-08 (69 passed, 4 flaky)

Run command:

```bash
npx -w apps/web playwright test --config=uat/playwright.config.ts uat/tests/voice-notes/
```

### Test Accounts

| Role | Email | Fixture | Notes |
|------|-------|---------|-------|
| Owner | neil.b@blablablak.com | `ownerPage` | Platform staff, "coach" role in Grange org |
| Admin | neiltest2@skfjkadsfdgsjdgsj.com | `adminPage` | Org admin in Grange |
| Coach | neiltesting@example.com | `coachPage` | Multi-role: admin + coach + parent |
| Parent | neiltest3@skfjkadsfdgsjdgsj.com | `parentPage` | Parent-only role |

### File 1: dashboard.spec.ts (19 tests)

Tests the main coach voice notes dashboard page.

| # | Group | Test Name | What It Verifies | Role |
|---|-------|-----------|------------------|------|
| 1 | VN-DASH-001 | should load the voice notes dashboard | "Voice Notes" heading renders | Coach |
| 2 | VN-DASH-001 | should display the subtitle text | "Record and analyze" subtitle | Coach |
| 3 | VN-DASH-001 | should show a back button | Back navigation exists | Coach |
| 4 | VN-DASH-002 | should display core tabs | New, History, My Impact tabs visible | Coach |
| 5 | VN-DASH-002 | should switch to the History tab | History tab shows search/empty state | Coach |
| 6 | VN-DASH-002 | should switch to the My Impact tab | Tab click works, URL stays on voice-notes | Coach |
| 7 | VN-DASH-003 | should show the New Voice Note card | "New Voice Note" card title | Coach |
| 8 | VN-DASH-003 | should display note type selector buttons | Training, Match, General buttons | Coach |
| 9 | VN-DASH-003 | should show recording button | Mic button with "recording" title | Coach |
| 10 | VN-DASH-003 | should show typed note textarea | "Type your coaching notes" placeholder | Coach |
| 11 | VN-DASH-003 | should have Save button disabled when textarea empty | Save disabled with no text | Coach |
| 12 | VN-DASH-003 | should enable Save button when text entered | Save enables after typing | Coach |
| 13 | VN-DASH-003 | should toggle between note types | Match/General buttons respond to clicks | Coach |
| 14 | VN-DASH-004 | should show history tab with search bar | History search input visible | Coach |
| 15 | VN-DASH-004 | should show empty state or note cards | Notes or "no recordings yet" | Coach |
| 16 | VN-DASH-005 | parent should not see voice notes dashboard | Parent redirected/denied | Parent |

Gotcha: Dashboard auto-switches from "New" tab when pending items exist.

### File 2: admin-audit.spec.ts (13 tests)

Tests the admin voice notes audit page at `/orgs/[orgId]/admin/voice-notes`.

| # | Group | Test Name | What It Verifies | Role |
|---|-------|-----------|------------------|------|
| 17 | VN-ADMIN-001 | should load the audit page for admin user | "Voice Notes Audit" heading | Admin |
| 18 | VN-ADMIN-001 | should show Admin badge | "Admin" badge text | Admin |
| 19 | VN-ADMIN-001 | should show subtitle about organization-wide oversight | Oversight/compliance subtitle | Admin |
| 20 | VN-ADMIN-001 | should show export button (disabled/coming soon) | Export button disabled | Admin |
| 21 | VN-ADMIN-002 | should show search input | Search field visible | Admin |
| 22 | VN-ADMIN-002 | should show filter toggle button | Filter button visible | Admin |
| 23 | VN-ADMIN-002 | should toggle filter panel visibility | Click filter shows "Note type" | Admin |
| 24 | VN-ADMIN-002 | should show empty state or results | "No voice notes yet" or count | Admin |
| 25 | VN-ADMIN-002 | should allow typing in search field | Search input accepts text | Admin |
| 26 | VN-ADMIN-003 | coach should see audit page or access denied | Coach allowed or denied | Coach |
| 27 | VN-ADMIN-003 | parent should see access denied | Parent denied/redirected | Parent |
| 28 | VN-ADMIN-003 | owner should see audit page or be redirected | Owner allowed/denied/redirected | Owner |
| 29 | VN-ADMIN-004 | should have back button to admin dashboard | Back link to /admin | Admin |

### File 3: review-microsite.spec.ts (13 tests)

Tests the public review microsite at `/r/[code]` (no auth required).

| # | Group | Test Name | What It Verifies | Role |
|---|-------|-----------|------------------|------|
| 30 | VN-REVIEW-001 | should display invalid link view for bogus code | "Invalid Link" heading | Public |
| 31 | VN-REVIEW-001 | should show explanation text for invalid link | "no longer exists" description | Public |
| 32 | VN-REVIEW-001 | should show PlayerARC branding on invalid link page | PlayerARC logo/text | Public |
| 33 | VN-REVIEW-002 | should show header with PlayerARC logo | Header branding | Public |
| 34 | VN-REVIEW-002 | should show Voice Note Review indicator | "Voice Note Review" text | Public |
| 35 | VN-REVIEW-002 | should show footer with copyright and login link | Footer with Log In link | Public |
| 36 | VN-REVIEW-002 | login link should point to /login | Login link href | Public |
| 37 | VN-REVIEW-003 | should show loading skeleton before data loads | Skeleton animation during load | Public |
| 38 | VN-REVIEW-004 | should handle various invalid code formats | Short/special/long codes handled | Public |
| 39 | VN-REVIEW-005 | expired link should show re-generation instructions | Expired/invalid view shown | Public |
| 40 | VN-REVIEW-006 | should be accessible without authentication | No redirect to /login | Public |

Covers US-VN-008 (structure/errors) and US-VN-012 (expired view). Queue sections/batch actions not testable without seeded data.

### File 4: typed-note-flow.spec.ts (10 tests)

Tests creating typed voice notes (no audio hardware needed).

| # | Group | Test Name | What It Verifies | Role |
|---|-------|-----------|------------------|------|
| 41 | VN-TYPED-001 | should type a note and see Save button enabled | Fill textarea, Save enables | Coach |
| 42 | VN-TYPED-001 | should submit a typed note and show processing | Click Save, toast or textarea clears | Coach |
| 43 | VN-TYPED-002 | should create training type note by default | Training button visible | Coach |
| 44 | VN-TYPED-002 | should allow switching to match type before saving | Match type, textarea works, Save enables | Coach |
| 45 | VN-TYPED-003 | should show notes in history after creation | History tab has search/empty state | Coach |
| 46 | VN-TYPED-004 | should support multi-line input | Multi-line text preserved | Coach |
| 47 | VN-TYPED-004 | should clear textarea after switching tabs and back | Tab switch no crash, textarea visible | Coach |

### File 5: platform-claims-viewer.spec.ts (8 tests)

Tests the platform staff claims viewer at `/platform/v2-claims`.

| # | Group | Test Name | What It Verifies | Role |
|---|-------|-----------|------------------|------|
| 48 | VN-CLAIMS-001 | should load the claims viewer for platform staff | "v2 Claims Viewer" heading | Owner |
| 49 | VN-CLAIMS-001 | should show back button to platform | Back link to /platform | Owner |
| 50 | VN-CLAIMS-002 | should display stats cards or empty state | "Artifacts" or "No artifacts yet" | Owner |
| 51 | VN-CLAIMS-003 | should show meaningful content when loaded | Content renders | Owner |
| 52 | VN-CLAIMS-004 | should show claims by topic if data exists | Topic breakdown (soft check) | Owner |
| 53 | VN-CLAIMS-005 | coach should not access claims viewer | Coach redirected/denied | Coach |
| 54 | VN-CLAIMS-005 | parent should not access claims viewer | Parent redirected/denied | Parent |
| 55 | VN-CLAIMS-005 | admin should not access claims viewer | Admin denied or allowed if staff | Admin |

Covers US-VN-016. Gotcha: platform layout auth race condition requires retry.

### File 6: disambiguation.spec.ts (3 tests)

Tests the disambiguation page at `/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]`.

| # | Group | Test Name | What It Verifies | Role |
|---|-------|-----------|------------------|------|
| 56 | VN-DISAMB-001 | should handle non-existent artifact gracefully | Fake ID shows error/empty, no crash | Coach |
| 57 | VN-DISAMB-002 | should show page title when loaded | Page renders content/redirects | Coach |
| 58 | VN-DISAMB-002 | should have a back navigation link | Back link to voice-notes | Coach |
| 59 | VN-DISAMB-003 | parent should not access disambiguation page | Parent denied/redirected | Parent |

Covers US-VN-018 (page structure only). Candidate selection/batch resolution not testable without seeded entity data.

### File 7: navigation-integration.spec.ts (7 tests)

Cross-cutting navigation, mobile, and performance tests.

| # | Group | Test Name | What It Verifies | Role |
|---|-------|-----------|------------------|------|
| 60 | VN-NAV-001 | should navigate to voice notes from coach dashboard | Click voice notes link | Coach |
| 61 | VN-NAV-001 | should navigate using direct URL helper | Direct URL works | Coach |
| 62 | VN-NAV-002 | voice notes page should load within timeout | Dashboard loads < 20s | Coach |
| 63 | VN-NAV-002 | review microsite should load quickly (no auth) | Public page loads < 10s | Public |
| 64 | VN-NAV-003 | voice notes dashboard responsive on mobile | No horizontal scroll at 375px | Coach |
| 65 | VN-NAV-003 | review microsite responsive on mobile | No horizontal scroll at 375px | Public |
| 66 | VN-NAV-004 | should maintain tab state on page refresh | History tab content persists | Coach |
| 67 | VN-NAV-005 | should navigate from voice notes to admin audit | Admin audit loads | Admin |
| 68 | VN-NAV-005 | should navigate between platform pages | Claims viewer reachable | Owner |
| 69 | VN-NAV-006 | should handle 404 for non-existent sub-routes | 404 or redirect | Coach |

### Coverage by v2 Story

| Story | Phase | Automated | Coverage Level | Manual Testing Needed? |
|-------|-------|-----------|----------------|----------------------|
| US-VN-001 | 1 | 0 tests | NONE | YES - WhatsApp quality gate |
| US-VN-002 | 1 | 0 tests | NONE | YES - audio quality validation |
| US-VN-003 | 1 | 0 tests | NONE | YES - duplicate detection |
| US-VN-004 | 1 | 0 tests | NONE | YES - WhatsApp feedback messages |
| US-VN-005 | 1 | 0 tests | NONE | Backend only - verify via Convex dashboard |
| US-VN-006 | 1 | 0 tests | NONE | Backend only - verify via Convex dashboard |
| US-VN-007 | 2 | 0 tests | NONE | Backend only - verify via Convex dashboard |
| US-VN-008 | 2 | 11 tests | Structure + errors | YES - queue sections with real data |
| US-VN-009 | 2 | 0 tests | NONE | YES - batch actions, inline edit |
| US-VN-010 | 2 | 0 tests | NONE | YES - fuzzy suggestions, text reply |
| US-VN-011 | 2 | 0 tests | NONE | YES - WhatsApp trust-adaptive messages |
| US-VN-012 | 2 | 1 test | Expired view only | YES - 48h expiry, link reuse |
| US-VN-012a-d | 2.5 | 0 tests | NONE | YES - swipe, snooze, PWA, analytics |
| US-VN-013 | 3 | 0 tests | NONE | Backend only - verify tables in Convex |
| US-VN-014 | 3 | 0 tests | NONE | YES - dual-path v1+v2 coexistence |
| US-VN-015 | 4 | 0 tests | NONE | Backend only - verify claims extraction |
| US-VN-016 | 4 | 8 tests | UI + access control | YES - verify claims appear after pipeline |
| US-VN-017 | 5 | 0 tests | NONE | Backend only - entity resolution |
| US-VN-018 | 5 | 4 tests | Page structure | YES - candidate selection, alias learning |
| US-VN-019 | 6 | 0 tests | NONE | YES - drafts auto-confirm logic |
| US-VN-020 | 6 | 0 tests | NONE | YES - WhatsApp CONFIRM/CANCEL commands |
| US-VN-021 | 6 | 0 tests | NONE | YES - migration dry-run + execution |

### What a Human Tester Should Focus On

The automated tests cover UI structure, navigation, access control, mobile responsiveness, and error states. A human tester should focus on:

1. **Full pipeline walkthrough** (see Quick Test Checklist above) - send a WhatsApp voice note and verify every stage
2. **Review microsite with real data** - queue sections, batch Apply All, inline edit, progress counter, "All Caught Up"
3. **Disambiguation workflow** - ambiguous names, candidate selection, batch resolution, alias stored
4. **Quality gates** - send gibberish, duplicates, very short messages
5. **WhatsApp commands** - CONFIRM, CANCEL, YES, NO, R (regenerate link)
6. **Dual-path verification** - v1 insights AND v2 claims both created for v2-enabled coaches

---

*Generated 2026-02-08 from branch `feat/voice-gateways-v2` (50 commits, 21 stories, 6 phases)*
