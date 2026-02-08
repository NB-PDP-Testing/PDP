# Voice Gateways V2 — Comprehensive Manual UAT Test Plan

> **Branch:** `feat/voice-gateways-v2`
> **Created:** 2026-02-08
> **Stories:** 21 (US-VN-001 through US-VN-021)
> **Phases:** 6
> **Total Test Cases:** 127

This document provides step-by-step manual test instructions for every feature in the Voice Gateways V2 branch. Each test case has explicit steps, expected results, and a pass/fail checkbox.

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Phase 1: Quality Gates & Fuzzy Matching](#2-phase-1-quality-gates--fuzzy-matching)
3. [Phase 2: Coach Quick Review Microsite](#3-phase-2-coach-quick-review-microsite)
4. [Phase 3: V2 Artifacts Foundation](#4-phase-3-v2-artifacts-foundation)
5. [Phase 4: Claims Extraction](#5-phase-4-claims-extraction)
6. [Phase 5: Entity Resolution & Disambiguation](#6-phase-5-entity-resolution--disambiguation)
7. [Phase 6: Drafts, Confirmation & Migration](#7-phase-6-drafts-confirmation--migration)
8. [End-to-End Happy Path](#8-end-to-end-happy-path)
9. [Regression Tests](#9-regression-tests)
10. [Cross-Cutting Concerns](#10-cross-cutting-concerns)
11. [Test Summary Tracker](#11-test-summary-tracker)

---

## 1. Test Environment Setup

### 1.1 Prerequisites

Before starting any tests, verify the following:

| # | Prerequisite | How to Verify | Status |
|---|-------------|---------------|--------|
| P-001 | Dev server running on `localhost:3000` | Open browser to `http://localhost:3000` | [ ] |
| P-002 | Convex backend deployed and running | Check Convex dashboard loads | [ ] |
| P-003 | WhatsApp integration connected (Twilio/Meta) | Check `WHATSAPP_*` env vars are set in Convex | [ ] |
| P-004 | OpenAI API key configured | Check `OPENAI_API_KEY` env var in Convex | [ ] |
| P-005 | At least one organization exists with players enrolled | Verify in Convex `orgPlayerEnrollments` table | [ ] |
| P-006 | At least one coach user assigned to a team with players | Verify in Convex `coachAssignments` table | [ ] |
| P-007 | Coach user has WhatsApp number linked | Check coach's phone number in user record | [ ] |

### 1.2 Test Accounts

| Role | Email | Notes |
|------|-------|-------|
| Platform Staff / Owner | `neil.b@blablablak.com` | Has `isPlatformStaff`, coach role in Grange org |
| Org Admin | `neiltest2@skfjkadsfdgsjdgsj.com` | Admin in Grange org |
| Coach | `neiltesting@example.com` | Multi-role: admin + coach + parent |
| Parent | `neiltest3@skfjkadsfdgsjdgsj.com` | Parent-only role |

### 1.3 Feature Flag Configuration

Feature flags must be set correctly for each test phase. All flags are set via the Convex dashboard `featureFlags` table or environment variables.

**Phase 1-2 tests:** No feature flags required (quality gates and review microsite work regardless).

**Phase 3-6 tests:** Require V2 pipeline flag enabled.

#### How to Enable V2 Pipeline Flag

**Option A: Environment Variable (Simplest)**
In Convex dashboard → Environment Variables, set:
```
VOICE_NOTES_V2_GLOBAL=true
```

**Option B: Per-Organization Flag**
Insert into `featureFlags` table:
```json
{
  "featureKey": "voice_notes_v2",
  "scope": "organization",
  "organizationId": "<your-org-id>",
  "enabled": true,
  "updatedAt": 1707350400000,
  "notes": "UAT testing"
}
```

**Option C: Per-User Flag**
```json
{
  "featureKey": "voice_notes_v2",
  "scope": "user",
  "userId": "<coach-user-id>",
  "enabled": true,
  "updatedAt": 1707350400000,
  "notes": "UAT testing"
}
```

#### How to Enable Entity Resolution Flag (Required for Phase 5-6)

**Option A: Environment Variable**
```
ENTITY_RESOLUTION_V2_GLOBAL=true
```

**Option B: Platform-Level Flag**
Insert into `featureFlags` table:
```json
{
  "featureKey": "entity_resolution_v2",
  "scope": "platform",
  "enabled": true,
  "updatedAt": 1707350400000,
  "notes": "UAT testing"
}
```

### 1.4 Flag Cascade Priority (Reference)

Flags evaluate in this order (first match wins):
1. Environment variable (`VOICE_NOTES_V2_GLOBAL` / `ENTITY_RESOLUTION_V2_GLOBAL`)
2. Platform-scope flag (`scope: "platform"`)
3. Organization-scope flag (`scope: "organization"` + matching orgId)
4. User-scope flag (`scope: "user"` + matching userId)
5. Default: `false`

---

## 2. Phase 1: Quality Gates & Fuzzy Matching

### US-VN-001: Text Message Quality Gate

**Backend file:** `packages/backend/convex/lib/messageValidation.ts` → `validateTextMessage()`

Five quality checks are applied to incoming WhatsApp text messages before processing.

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| QG-001 | Empty message rejected | 1. Send an empty text message to the coach WhatsApp number (just whitespace or empty) | Coach receives feedback: message was empty/invalid. No voice note created in DB. | [ ] |
| QG-002 | Very short message rejected | 1. Send "hi" via WhatsApp | Coach receives feedback about message being too short (< 10 chars). No voice note created. | [ ] |
| QG-003 | Too few words rejected | 1. Send "ok ok" via WhatsApp | Coach receives feedback about insufficient content (< 3 words). No voice note created. | [ ] |
| QG-004 | Keyboard mash rejected | 1. Send "asdkjfhaskdjfhaskjdfh" via WhatsApp | Coach receives feedback about unrecognizable content (average word length check fails). No voice note created. | [ ] |
| QG-005 | Repeated characters rejected | 1. Send "!!!!!!!!!!!!!!!!!!!!!!" via WhatsApp | Coach receives feedback about repeated characters. No voice note created. | [ ] |
| QG-006 | Normal message accepted | 1. Send "Sean did really well at training today. His passing has improved and he was great in the drills." via WhatsApp | Message is accepted and processed normally. Voice note record created in DB. | [ ] |
| QG-007 | Boundary: exactly 10 chars | 1. Send a message that is exactly 10 characters with 3+ words (e.g., "ok yes now") | Verify whether accepted or rejected — document the boundary behavior | [ ] |

### US-VN-002: Transcript Quality Validation

**Backend file:** `packages/backend/convex/lib/messageValidation.ts` → `validateTranscriptQuality()`

Three outcomes: `process` (good), `ask_user` (borderline), `reject` (unintelligible).

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| TQ-001 | Clear audio accepted | 1. Send a clear audio message via WhatsApp mentioning players by name, 10+ seconds | Transcript is clean. Quality validation returns `process`. Insights extracted normally. | [ ] |
| TQ-002 | Noisy audio triggers confirmation | 1. Send an audio recording with significant background noise but partially intelligible speech | Coach receives a WhatsApp message asking "Is this correct?" with the transcript text. Quality validation returns `ask_user`. | [ ] |
| TQ-003 | Unintelligible audio rejected | 1. Send an audio recording of pure background noise / music / no speech | Coach receives feedback that audio couldn't be understood. Quality validation returns `reject`. No insights extracted. | [ ] |
| TQ-004 | Uncertainty markers detected | 1. Send audio where transcription contains "[inaudible]" or "[unclear]" markers (simulate by checking DB after processing noisy audio) | `transcriptQuality` field on `voiceNotes` record should reflect low confidence score and uncertainty markers detected. | [ ] |
| TQ-005 | Sports context boosting | 1. Send clear audio about "training", "match", "drill", "session" etc. 2. Check the confidence score in DB | Confidence score should be boosted by sports context detection (higher than a non-sports transcript of similar quality). | [ ] |

### US-VN-003: Duplicate Message Detection

**Backend file:** `packages/backend/convex/lib/duplicateDetection.ts` → `checkForDuplicateMessage()`

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| DD-001 | Exact duplicate blocked | 1. Send "Sean did well at training today, his passing was excellent" via WhatsApp 2. Wait 10 seconds 3. Send the exact same text again | Second message should be blocked. Coach receives "Duplicate detected" feedback. Only one voice note in DB. | [ ] |
| DD-002 | Duplicate after 6 min allowed | 1. Send a text message via WhatsApp 2. Wait at least 6 minutes 3. Send the exact same text again | Second message should be processed normally (5-min window expired). Two voice notes in DB. | [ ] |
| DD-003 | Different message allowed | 1. Send a text message via WhatsApp 2. Immediately send a completely different text | Both messages processed. Two separate voice notes in DB. | [ ] |
| DD-004 | Different type not blocked | 1. Send a text message via WhatsApp 2. Immediately send an audio recording about the same topic | Both should be processed (different message types). | [ ] |

### US-VN-004: Enhanced WhatsApp Feedback Messages

**Backend file:** `packages/backend/convex/lib/feedbackMessages.ts` → `sendDetailedFeedback()`

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| FB-001 | Quality rejection feedback | 1. Trigger a quality gate rejection (send "hi" via WhatsApp) | Feedback message includes: specific reason for rejection (e.g., "message too short"), suggestion to send a longer message. Well-formatted, not generic. | [ ] |
| FB-002 | Duplicate feedback | 1. Send the same message twice quickly | Feedback message specifically mentions "duplicate detected" and includes the time window. | [ ] |
| FB-003 | Processing confirmation | 1. Send a valid voice note via WhatsApp | Coach receives a confirmation message that processing has started. Message includes relevant details (number of players mentioned, etc.). | [ ] |
| FB-004 | Error notification | 1. If possible, trigger a processing error (e.g., by temporarily invalidating the OpenAI key) | Coach receives an error message that is helpful (not a stack trace), with suggestion to retry. | [ ] |
| FB-005 | Confirmation request buttons | 1. Trigger a `ask_user` outcome from transcript quality (noisy audio) | WhatsApp message includes interactive elements or clear text instructions for CONFIRM / RETRY / CANCEL actions. | [ ] |

### US-VN-005: Levenshtein Fuzzy Matching

**Backend file:** `packages/backend/convex/lib/stringMatching.ts`

These are backend-only tests. Verify via Convex dashboard or by sending voice notes that reference players by misspelled/variant names.

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| FM-001 | Irish name: Sean/Shawn | 1. Ensure a player named "Sean" exists in the org 2. Send voice note referencing "Shawn" | Player "Sean" is matched as a candidate. Similarity score >= 0.85. | [ ] |
| FM-002 | Prefix: O'Brien/OBrien | 1. Ensure a player with "O'Brien" surname exists 2. Send voice note referencing "Obrien" | Player matched. `normalizeForMatching()` strips the apostrophe and prefix. | [ ] |
| FM-003 | Prefix: MacCarthy/McCarthy | 1. Ensure a player with "MacCarthy" or "McCarthy" surname exists 2. Reference the other variant in a voice note | Player matched. Mac/Mc normalization works. | [ ] |
| FM-004 | Diacritics: Sean/Sean | 1. Ensure a player named "Sean" exists (no accent in DB) 2. Reference "Sean" with fada (accent) in a typed message or confirm that the fada is stripped after transcription | Player matched. Diacritics removed by `normalizeForMatching()`. | [ ] |
| FM-005 | Wrong name: no match | 1. Reference a completely non-existent name like "Xylophone McSquiggle" | No player matched. Similarity below threshold. | [ ] |
| FM-006 | Unit tests pass | 1. Run: `cd packages/backend && npx vitest run __tests__/stringMatching.test.ts` | All string matching tests pass. | [ ] |

### US-VN-006: Find Similar Players Query

**Backend file:** `packages/backend/convex/models/orgPlayerEnrollments.ts` → `findSimilarPlayers()`

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| SP-001 | Exact name returns high score | 1. In Convex dashboard, run `findSimilarPlayers` with an exact player name from the org | Returns the player with highest score (close to 1.0). | [ ] |
| SP-002 | Misspelled name returns match | 1. Run query with a slightly misspelled player name | Returns the correct player with score > 0.85. | [ ] |
| SP-003 | Multiple matches ranked | 1. Run query with a common first name that matches multiple players (e.g., "Sean" when there are multiple Seans) | Returns all matching players, ranked by score (highest first). | [ ] |
| SP-004 | Context weighting: same team | 1. Have coach assigned to Team A 2. Query with a name that matches players on Team A and Team B | Players on the coach's team should rank higher (+0.15 boost). | [ ] |
| SP-005 | Unit tests pass | 1. Run: `cd packages/backend && npx vitest run __tests__/playerMatching.test.ts` | All player matching tests pass. | [ ] |

---

## 3. Phase 2: Coach Quick Review Microsite

### US-VN-007: Review Links Backend

**Backend file:** `packages/backend/convex/models/whatsappReviewLinks.ts`

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| RL-001 | Review link created after processing | 1. Send a valid voice note via WhatsApp 2. Wait for processing to complete 3. Check the WhatsApp response message | Message contains a review link in format `https://<domain>/r/<8-char-code>` | [ ] |
| RL-002 | Link code is 8 alphanumeric chars | 1. From RL-001, examine the code portion of the URL | Code is exactly 8 characters, alphanumeric (a-z, 0-9). | [ ] |
| RL-003 | Link aggregates multiple notes | 1. Send two voice notes in quick succession 2. Check the review link from the second response | The same link URL should aggregate pending items from both notes (check `pendingItems` in `whatsappReviewLinks` table). | [ ] |
| RL-004 | Link has 48-hour expiry | 1. Check the `whatsappReviewLinks` record in Convex dashboard | `expiresAt` field should be ~48 hours after creation. `status` should be "active". | [ ] |
| RL-005 | Access log populated | 1. Open a review link in browser 2. Check the `whatsappReviewLinks` record | `accessLog` array should contain an entry with timestamp and (optionally) device fingerprint. | [ ] |
| RL-006 | Unit tests pass | 1. Run: `cd packages/backend && npx vitest run __tests__/reviewLinks.test.ts` | All review link tests pass. | [ ] |

### US-VN-008: Quick Review Microsite Page

**URL:** `https://<domain>/r/<code>`
**Frontend files:** `apps/web/src/app/r/[code]/page.tsx` and sibling components

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| RM-001 | Valid link loads without login | 1. Get a valid review link code (from WhatsApp or DB) 2. Open `http://localhost:3000/r/<code>` in an incognito/private browser window | Page loads without any login prompt. Shows coach's name and review content. | [ ] |
| RM-002 | Invalid code shows error | 1. Navigate to `http://localhost:3000/r/xxxxxxxx` | Shows "Invalid Link" page with explanation text and PlayerARC branding. | [ ] |
| RM-003 | Expired link shows expiry view | 1. In Convex dashboard, manually set a link's `expiresAt` to a past timestamp 2. Open that link in browser | Shows "Link Expired" page with the original expiry time and instructions to request a new one. | [ ] |
| RM-004 | Loading skeleton shown | 1. Open a valid review link (observe initial load) | A loading skeleton animation appears briefly while data loads. | [ ] |
| RM-005 | Header shows PlayerARC branding | 1. Open a valid review link | Header displays PlayerARC logo/text and "Voice Note Review" indicator. | [ ] |
| RM-006 | Footer with login link | 1. Open a valid review link | Footer shows copyright text and a "Log In" link pointing to `/login`. | [ ] |
| RM-007 | Page is mobile responsive | 1. Open a valid review link 2. Use browser DevTools to set viewport to 375px width (iPhone SE) | No horizontal scrollbar. All content readable. Touch targets are minimum 44px. | [ ] |

### US-VN-009: Review Queue Sections & Batch Actions

**Frontend file:** `apps/web/src/app/r/[code]/review-queue.tsx`

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| RQ-001 | Injuries section appears first (red) | 1. Send voice notes that produce injury-type insights 2. Open review link | Injuries section appears at top with red/urgent styling. | [ ] |
| RQ-002 | Unmatched players section (amber) | 1. Send voice note with names that don't match any enrolled player 2. Open review link | "Unmatched Players" section appears second with amber styling. | [ ] |
| RQ-003 | Sections in correct priority order | 1. Create voice notes producing multiple insight types 2. Open review link | Sections appear in order: Injuries > Unmatched Players > Pending Insights > TODOs > Team Observations > Auto-Applied. | [ ] |
| RQ-004 | Apply All button works | 1. Open review link with pending insights in a section 2. Click "Apply All" for that section | All insights in the section change to "applied" state. Count updates. | [ ] |
| RQ-005 | Dismiss All button works | 1. Open review link with pending insights 2. Click "Dismiss All" for a section | All insights in that section are dismissed. | [ ] |
| RQ-006 | Individual apply works | 1. Open review link 2. Click apply on a single individual insight | Only that insight is applied. Others remain pending. | [ ] |
| RQ-007 | Individual dismiss works | 1. Open review link 2. Click dismiss on a single individual insight | Only that insight is dismissed. | [ ] |
| RQ-008 | Progress counter updates | 1. Open review link with multiple pending items 2. Apply/dismiss several items | Progress counter updates (e.g., "3 of 12 reviewed"). | [ ] |
| RQ-009 | All Caught Up state | 1. Review all pending items (apply or dismiss everything) | "All Caught Up" congratulatory message appears. No more pending items. | [ ] |

### US-VN-010: Unmatched Player Cards + Text Reply

**Frontend file:** `apps/web/src/app/r/[code]/unmatched-player-card.tsx`

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| UP-001 | Unmatched name displayed | 1. Send voice note mentioning a non-exact player name 2. Open review link | Card shows the raw unmatched name from the transcript. | [ ] |
| UP-002 | Fuzzy suggestions shown | 1. From UP-001, look at the unmatched player card | Up to 5 fuzzy match suggestions displayed below the unmatched name, each with a similarity score (percentage). | [ ] |
| UP-003 | Tap suggestion to select | 1. Tap one of the fuzzy match suggestions | Suggestion is selected/highlighted. Apply action becomes available. | [ ] |
| UP-004 | Type name manually | 1. Use the text input on the unmatched player card 2. Type a player name manually | Search results appear. Can select a player from manual search. | [ ] |
| UP-005 | Dismiss unmatched | 1. Click dismiss/skip on an unmatched player card that has no match | Card is dismissed. Not shown as an error. | [ ] |

### US-VN-011: Trust-Adaptive Messages + WhatsApp Quick Actions

**Backend file:** `packages/backend/convex/actions/whatsapp.ts` → `formatResultsMessage()`

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| TA-001 | TL0 coach: detailed message | 1. Ensure coach has trust level 0 (new coach or manually set in `coachTrustLevels` table) 2. Send a voice note | WhatsApp response lists every insight individually. Detailed format with full descriptions. | [ ] |
| TA-002 | TL2 coach: summary message | 1. Set coach to trust level 2 in `coachTrustLevels` table 2. Send a voice note | WhatsApp response shows brief summary with auto-applied items and pending count. Less detail than TL0. | [ ] |
| TA-003 | TL3 coach: minimal message | 1. Set coach to trust level 3 2. Send a voice note | WhatsApp response is minimal ("All done! Auto-applied X insights"). Most things auto-applied. | [ ] |
| TA-004 | Quick reply: OK applies all | 1. Process a voice note 2. Reply "OK" via WhatsApp | All pending matched insights from the last message are applied. Coach receives confirmation. | [ ] |
| TA-005 | Quick reply: R resends link | 1. Reply "R" via WhatsApp (after a voice note was processed) | Coach receives a new review link in the response. | [ ] |
| TA-006 | Running totals in messages | 1. Process several voice notes in the same session | WhatsApp messages include cumulative stats like "12 insights applied this week, 3 pending". | [ ] |

### US-VN-012: Link Expiry & Cleanup

**Backend files:** Cron in `packages/backend/convex/crons.ts`, UI in `apps/web/src/app/r/[code]/expired-link-view.tsx`

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| LE-001 | Link stops working after 48h | 1. In Convex dashboard, set a link's `expiresAt` to a past timestamp (e.g., now minus 1 hour) 2. Open the link | Shows "Link Expired" view with the original expiry time. | [ ] |
| LE-002 | Expired view content | 1. From LE-001, examine the expired view | Shows: "This link has expired" message, the original expiry time, and option to request a new one via WhatsApp. | [ ] |
| LE-003 | Cron job exists | 1. Open `packages/backend/convex/crons.ts` 2. Search for review link cleanup | A daily cron job is configured to delete review link records older than 7 days. | [ ] |
| LE-004 | Cron cleans up old links | 1. In Convex dashboard, create a test `whatsappReviewLinks` record with `expiresAt` set to 8 days ago 2. Wait for daily cron to run (or trigger manually if possible) | The old record should be deleted from the table. | [ ] |

---

## 4. Phase 3: V2 Artifacts Foundation

> **Prerequisite:** V2 feature flag must be enabled (see Section 1.3).

### US-VN-013: Artifacts & Transcripts Tables

**Backend files:** `packages/backend/convex/models/voiceNoteArtifacts.ts`, `voiceNoteTranscripts.ts`

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| AT-001 | Artifact created for text message | 1. Enable V2 flag 2. Send a text message via WhatsApp 3. Check `voiceNoteArtifacts` table in Convex dashboard | New record with `sourceChannel: "whatsapp_text"`, `status` progressing through pipeline stages. | [ ] |
| AT-002 | Artifact created for audio message | 1. Send an audio message via WhatsApp 2. Check `voiceNoteArtifacts` table | New record with `sourceChannel: "whatsapp_audio"`. | [ ] |
| AT-003 | Artifact has required fields | 1. Examine the artifact record from AT-001 or AT-002 | Record has: `artifactId` (UUID), `organizationId`, `coachUserId`, `sourceChannel`, `status`, `createdAt`. | [ ] |
| AT-004 | Transcript created for audio | 1. Send audio via WhatsApp with V2 enabled 2. Wait for transcription 3. Check `voiceNoteTranscripts` table | New record with: `artifactId` matching the artifact, `fullText`, `segments` array, `modelUsed`, `language`, `duration`. | [ ] |
| AT-005 | Artifact status progresses | 1. Send a message with V2 enabled 2. Monitor the artifact record over time (refresh Convex dashboard) | Status progresses: `pending` → `transcribing` → `transcribed` → `extracting_claims` → `resolving_entities` → `generating_drafts` → `completed` (some stages may be skipped depending on flags). | [ ] |
| AT-006 | Artifacts table indexes work | 1. In Convex dashboard, query `voiceNoteArtifacts` by org + coach 2. Query by org + status | Both queries return correct filtered results using indexes. | [ ] |

### US-VN-014: Dual-Path Processing

**Backend file:** `packages/backend/convex/lib/featureFlags.ts` → `shouldUseV2Pipeline()`

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| DP-001 | V2 OFF: only V1 record | 1. Ensure ALL V2 flags are disabled (no env var, no DB flags) 2. Send a WhatsApp message 3. Check both `voiceNotes` and `voiceNoteArtifacts` tables | `voiceNotes` has a new record. `voiceNoteArtifacts` has NO new record. | [ ] |
| DP-002 | V2 ON: both records created | 1. Enable V2 via env var `VOICE_NOTES_V2_GLOBAL=true` 2. Send a WhatsApp message 3. Check both tables | Both `voiceNotes` AND `voiceNoteArtifacts` have new records. Artifact links to voice note via `voiceNoteId`. | [ ] |
| DP-003 | Org-level flag scoping | 1. Set V2 flag at organization scope for Org A only 2. Send message as coach in Org A 3. Send message as coach in Org B (if possible) | Org A coach gets V2 (both records). Org B coach gets V1 only. | [ ] |
| DP-004 | User-level flag scoping | 1. Set V2 flag at user scope for Coach X only 2. Send message as Coach X 3. Send message as Coach Y (if possible) | Coach X gets V2. Coach Y gets V1 only. | [ ] |
| DP-005 | Env var overrides DB flags | 1. Set env var `VOICE_NOTES_V2_GLOBAL=false` 2. Set a platform-level DB flag `enabled: true` 3. Send a WhatsApp message | V1 only (env var `false` overrides DB `true`). | [ ] |
| DP-006 | V1 pipeline unchanged | 1. With V2 enabled, send a voice note 2. Check the V1 `voiceNotes` record | V1 record has all the same fields as before V2 was introduced. Insights extracted normally in V1 format. | [ ] |

---

## 5. Phase 4: Claims Extraction

> **Prerequisite:** V2 flag enabled. Phases 1-3 tests should pass first.

### US-VN-015: Claims Table & Extraction Action

**Backend files:** `packages/backend/convex/actions/claimsExtraction.ts`, `packages/backend/convex/models/voiceNoteClaims.ts`

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| CE-001 | Claims created from voice note | 1. Send voice note mentioning 2-3 players with different topics (e.g., "Sean hurt his knee at training. Emma's passing was excellent. Jack missed the last three sessions.") 2. Wait for V2 pipeline to complete 3. Check `voiceNoteClaims` table | At least 3 claims created, one per player mention. | [ ] |
| CE-002 | Claim topics correct | 1. From CE-001, examine each claim's `topic` field | "Sean hurt his knee" → `injury`. "Emma's passing was excellent" → `skill_progress` or `skill_rating`. "Jack missed" → `attendance`. | [ ] |
| CE-003 | 15 topic categories | 1. Check the schema for `voiceNoteClaims` in `schema.ts` | Topic field accepts exactly 15 values: `injury`, `skill_rating`, `skill_progress`, `behavior`, `performance`, `attendance`, `wellbeing`, `recovery`, `development_milestone`, `physical_development`, `parent_communication`, `tactical`, `team_culture`, `todo`, `session_plan`. | [ ] |
| CE-004 | Entity mentions populated | 1. From CE-001, check `mentionedEntities` on each claim | Each claim has at least one entity mention with `rawText` (the name as spoken), `entityType` ("player"), and `position`. | [ ] |
| CE-005 | Confidence scores present | 1. From CE-001, check `confidence` (or `extractionConfidence`) field | Each claim has a confidence score between 0 and 1. | [ ] |
| CE-006 | Claim status starts as extracted | 1. Check claim `status` fields immediately after creation | All new claims have status `"extracted"`. | [ ] |
| CE-007 | Coach context used | 1. Send a voice note referencing players specifically on the coach's team 2. Check claims | Players on coach's team should be matched with higher confidence (coach context includes roster). | [ ] |
| CE-008 | Error handling: failed artifact | 1. If possible, trigger a claims extraction failure (e.g., OpenAI rate limit) 2. Check artifact status | Artifact status should be `"failed"`. Error should not crash the pipeline. | [ ] |

### US-VN-016: Pipeline Integration & Claims Viewer

**Frontend file:** `apps/web/src/app/platform/v2-claims/page.tsx`
**URL:** `http://localhost:3000/platform/v2-claims`

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| CV-001 | Claims viewer loads for platform staff | 1. Log in as platform staff user (`neil.b@blablablak.com`) 2. Navigate to `http://localhost:3000/platform/v2-claims` | Page loads with "v2 Claims Viewer" heading. | [ ] |
| CV-002 | Recent artifacts listed | 1. Process several voice notes with V2 enabled 2. Open claims viewer | Lists recent artifacts with status (pending, completed, failed). | [ ] |
| CV-003 | Expand artifact shows claims | 1. Click/expand an artifact in the viewer | Shows extracted claims with: topic category, confidence score, mentioned entities, status. | [ ] |
| CV-004 | Stats cards or empty state | 1. Open claims viewer | Shows either "Artifacts" stats cards with counts, or "No artifacts yet" empty state. | [ ] |
| CV-005 | Topic breakdown shown | 1. Open claims viewer with processed data | Claims are grouped or filterable by topic category. | [ ] |
| CV-006 | Non-staff denied: coach | 1. Log in as coach user 2. Navigate to `/platform/v2-claims` | Access denied or redirected. Page content not visible. | [ ] |
| CV-007 | Non-staff denied: parent | 1. Log in as parent user 2. Navigate to `/platform/v2-claims` | Access denied or redirected. | [ ] |
| CV-008 | Non-staff denied: admin | 1. Log in as org admin (not platform staff) 2. Navigate to `/platform/v2-claims` | Access denied or redirected (unless admin also has `isPlatformStaff`). | [ ] |
| CV-009 | Back button navigates to platform | 1. On claims viewer, click back button | Navigates to `/platform` page. | [ ] |

---

## 6. Phase 5: Entity Resolution & Disambiguation

> **Prerequisites:** V2 flag AND Entity Resolution flag both enabled. Phases 1-4 tests should pass first.

### US-VN-017: Entity Resolution Table, Aliases & Action

**Backend files:** `packages/backend/convex/actions/entityResolution.ts`, `packages/backend/convex/models/voiceNoteEntityResolutions.ts`, `packages/backend/convex/models/coachPlayerAliases.ts`

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| ER-001 | Single match auto-resolves | 1. Ensure only ONE player named "Alex" exists in the org 2. Send voice note: "Alex did really well today" 3. Check `voiceNoteEntityResolutions` table | Record for "Alex" with `status: "resolved"` (or `"auto_resolved"`), `resolvedEntityId` pointing to the player. | [ ] |
| ER-002 | Multiple matches need disambiguation | 1. Ensure TWO or more players named "Alex" exist 2. Send voice note: "Alex was great at training" 3. Check `voiceNoteEntityResolutions` table | Record for "Alex" with `status: "pending"`, `candidates` array containing both Alex players with confidence scores. | [ ] |
| ER-003 | Candidates have match reasons | 1. From ER-002, examine the `candidates` array | Each candidate has `matchReason` populated: `exact_first_name`, `fuzzy_full_name`, `irish_alias`, etc. | [ ] |
| ER-004 | Fuzzy matching used | 1. Send voice note referencing "Shawn" when DB has "Sean" 2. Check entity resolution record | Candidate for "Sean" appears with `matchReason: "fuzzy_full_name"` or similar, confidence based on Levenshtein score. | [ ] |
| ER-005 | Irish name alias matching | 1. Send voice note referencing "Niamh" when DB has "Neve" (or vice versa) | Irish name variant detected. `matchReason` includes `"irish_alias"`. | [ ] |
| ER-006 | Coach alias auto-resolves | 1. First: resolve an ambiguous "Alex" to "Alex Murphy" via disambiguation UI 2. Then send another voice note mentioning "Alex" | Second time, "Alex" auto-resolves to "Alex Murphy" via the saved coach alias in `coachPlayerAliases` table. | [ ] |
| ER-007 | Alias saved after resolution | 1. Resolve an ambiguous name in disambiguation UI 2. Check `coachPlayerAliases` table | New alias record with coach's ID, org ID, the alias text, and the resolved player ID. | [ ] |
| ER-008 | Trust-adaptive auto-resolve threshold | 1. Set coach's `insightConfidenceThreshold` to a low value (e.g., 0.7) 2. Send voice note with a name that has a 0.85 confidence match | Should auto-resolve (0.85 > 0.7 threshold). Higher trust coaches get more auto-resolution. | [ ] |

### US-VN-018: Disambiguation UI

**Frontend files:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]/page.tsx`, `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/disambiguation-banner.tsx`

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| DU-001 | Banner appears on dashboard | 1. Create voice notes with ambiguous player names (trigger pending resolutions) 2. Navigate to coach voice notes dashboard | Disambiguation banner appears showing count of names and notes needing attention. | [ ] |
| DU-002 | Banner click navigates | 1. Click the disambiguation banner | Navigates to disambiguation page for the relevant artifact. | [ ] |
| DU-003 | Disambiguation page loads | 1. Navigate to `/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]` | Page loads showing ambiguous name groups. | [ ] |
| DU-004 | Names grouped correctly | 1. Send voice note mentioning "Alex" three times 2. Open disambiguation page | All three "Alex" mentions grouped into one resolution group. | [ ] |
| DU-005 | Candidates show details | 1. On disambiguation page, examine candidate list | Each candidate shows: player name, confidence percentage (0-100%), match reason badge (e.g., "Exact name", "Fuzzy match", "Irish alias"), "On your team" indicator where applicable. | [ ] |
| DU-006 | Select candidate resolves | 1. Select a candidate via radio button 2. Click confirm/resolve | The mention is resolved. `voiceNoteEntityResolutions` record updated with `resolvedEntityId` and `resolvedBy: "coach"`. | [ ] |
| DU-007 | Batch resolution | 1. Select "Alex Murphy" for one "Alex" mention | All "Alex" mentions in the same artifact resolve to "Alex Murphy" (batch). | [ ] |
| DU-008 | None of these option | 1. Click "None of these" for an ambiguous name | Confirmation dialog appears. After confirming, mention status becomes "rejected". | [ ] |
| DU-009 | Skip all remaining | 1. On disambiguation page with multiple unresolved groups 2. Click "Skip all remaining" | All remaining items marked as "skipped". Redirects back to voice notes dashboard. | [ ] |
| DU-010 | Banner disappears when resolved | 1. Resolve all pending disambiguation items 2. Return to voice notes dashboard | Disambiguation banner no longer appears. | [ ] |
| DU-011 | Mobile responsive | 1. Open disambiguation page at 375px viewport | Touch targets are 44px+. No horizontal scroll. All content readable. | [ ] |
| DU-012 | Non-existent artifact handled | 1. Navigate to `/orgs/[orgId]/coach/voice-notes/disambiguation/fake_id_12345` | Shows error/empty state gracefully. No crash. | [ ] |
| DU-013 | Parent cannot access | 1. Log in as parent 2. Navigate to disambiguation page URL | Access denied or redirected. | [ ] |
| DU-014 | Analytics events tracked | 1. Perform each action: select candidate, reject all, skip 2. Check `reviewAnalytics` table (if applicable) or console logs | Events tracked: `disambiguate_accept`, `disambiguate_reject_all`, `disambiguate_skip`. | [ ] |

---

## 7. Phase 6: Drafts, Confirmation & Migration

> **Prerequisites:** V2 flag, Entity Resolution flag enabled. Phases 1-5 tests should pass first.

### US-VN-019: Drafts Table

**Backend files:** `packages/backend/convex/actions/draftGeneration.ts`, `packages/backend/convex/models/insightDrafts.ts`

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| DR-001 | Drafts created after resolution | 1. Process a voice note through full V2 pipeline (claims extracted, entities resolved) 2. Check `insightDrafts` table | Draft records created for each resolved claim. | [ ] |
| DR-002 | Draft has confidence fields | 1. Examine a draft record | Has: `aiConfidence` (from claim), `resolutionConfidence` (from entity resolution), `combinedConfidence` (product of both). | [ ] |
| DR-003 | Injury/behavior always requires confirmation | 1. Process voice note with an injury mention 2. Check the draft | `requiresConfirmation: true` regardless of confidence score. | [ ] |
| DR-004 | High-confidence non-sensitive auto-eligible | 1. Process voice note with a high-confidence performance mention 2. Check the draft | If `combinedConfidence >= threshold` AND topic is not injury/behavior, `requiresConfirmation: false`. | [ ] |
| DR-005 | Draft status starts pending | 1. Check newly created drafts | All start with `status: "pending"`. | [ ] |
| DR-006 | Draft has player and claim links | 1. Examine draft record | Has: `artifactId`, `claimId`, `playerIdentityId` (if resolved), `playerName`, `category`, `title`, `description`. | [ ] |

### US-VN-020: WhatsApp Commands

**Backend files:** `packages/backend/convex/lib/whatsappCommands.ts` → `parseCommand()`, `packages/backend/convex/lib/whatsappCommandHandler.ts`

Supported commands (case-insensitive):
- `CONFIRM` / `YES` / `Y` / `OK` → confirm all pending drafts
- `CONFIRM 1,3` / `YES 1,2,3` → confirm specific drafts by number
- `CANCEL` / `NO` / `N` → cancel all pending drafts
- `Alex = Alex Murphy, Alex Kelly` → entity mapping (TWINS pattern)

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| WC-001 | CONFIRM all | 1. Process voice note → drafts created 2. Send "CONFIRM" via WhatsApp | All pending drafts for latest artifact change to `status: "confirmed"`. Coach receives confirmation message. | [ ] |
| WC-002 | YES all | 1. Process voice note → drafts created 2. Send "YES" via WhatsApp | Same as CONFIRM — all drafts confirmed. | [ ] |
| WC-003 | OK all | 1. Process voice note → drafts created 2. Send "OK" via WhatsApp | Same as CONFIRM — all drafts confirmed. | [ ] |
| WC-004 | CONFIRM specific | 1. Process voice note → 4 drafts created 2. Send "CONFIRM 1,3" via WhatsApp | Only drafts #1 and #3 confirmed. Drafts #2 and #4 remain pending. | [ ] |
| WC-005 | CANCEL all | 1. Process voice note → drafts created 2. Send "CANCEL" via WhatsApp | All pending drafts change to `status: "cancelled"`. Coach receives confirmation. | [ ] |
| WC-006 | NO cancels | 1. Send "NO" via WhatsApp after drafts created | Same as CANCEL. | [ ] |
| WC-007 | Entity mapping: TWINS | 1. Process voice note with ambiguous "Alex" 2. Send "Alex = Alex Murphy, Alex Kelly" via WhatsApp | Entity mapping created. "Alex" resolves to the specified players. Coach aliases saved. | [ ] |
| WC-008 | Entity mapping with team context | 1. Send "Alex = Alex Murphy U12" via WhatsApp | Entity mapping with `teamContext: "U12"`. | [ ] |
| WC-009 | Case insensitive | 1. Send "confirm" (lowercase) via WhatsApp 2. Send "Confirm" (mixed case) | Both treated as CONFIRM commands. | [ ] |
| WC-010 | Regular message not treated as command | 1. Send "Confirmed that Sean was at training today" via WhatsApp | Message is processed as a normal voice note (not intercepted as a command). The word "Confirmed" at the start should NOT trigger command parsing because it doesn't match the anchored regex `^CONFIRM$`. | [ ] |
| WC-011 | Unit tests pass | 1. Run: `cd packages/backend && npx vitest run __tests__/whatsappCommands.test.ts` | All WhatsApp command parser tests pass. | [ ] |

### US-VN-021: V1 to V2 Migration Script

**Backend file:** `packages/backend/convex/actions/migration.ts` → `migrateVoiceNotesToV2()`

This is an `internalAction` — run via Convex dashboard "Run Action" or scheduled job.

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| MG-001 | Dry run: no changes | 1. In Convex dashboard, run action `actions/migration:migrateVoiceNotesToV2` with args: `{ "dryRun": true }` 2. Check the return value | Returns stats: `{ processed: N, artifacts: N, transcripts: N, claims: N, errors: 0, skipped: 0 }`. No new records in `voiceNoteArtifacts` table. | [ ] |
| MG-002 | Limited batch | 1. Run migration with `{ "dryRun": false, "batchSize": 3 }` | Only 3 voice notes migrated. Stats show `processed: 3`. | [ ] |
| MG-003 | Artifacts created | 1. After MG-002, check `voiceNoteArtifacts` table | 3 new artifact records linked to the migrated voice notes (via `voiceNoteId`). | [ ] |
| MG-004 | Transcripts created | 1. Check `voiceNoteTranscripts` table for the migrated artifacts | Transcript records exist for voice notes that had transcriptions. `modelUsed: "migration"`. | [ ] |
| MG-005 | Claims created from insights | 1. Check `voiceNoteClaims` table for migrated artifacts | Claims created from existing V1 insights. `extractionConfidence: 0.8` (migration default). | [ ] |
| MG-006 | Idempotent: re-run skips | 1. Run migration again with same parameters | Already-migrated notes are skipped. Stats show `skipped: 3` (or however many were already migrated). No duplicate artifacts. | [ ] |
| MG-007 | Org-scoped migration | 1. Run migration with `{ "dryRun": false, "organizationId": "<specific-org-id>", "batchSize": 5 }` | Only voice notes from the specified org are migrated. | [ ] |
| MG-008 | Error handling: one failure continues | 1. If possible, corrupt one voice note record (missing coachId) 2. Run migration | The corrupted note is skipped with error. Other notes in the batch are still migrated. Stats show `errors: 1`. | [ ] |
| MG-009 | Source channel mapping | 1. After migration, check artifacts' `sourceChannel` field | Correctly mapped: V1 "whatsapp" → "whatsapp_audio", "typed" → "app_typed", etc. | [ ] |
| MG-010 | Max batch size enforced | 1. Run with `{ "dryRun": true, "batchSize": 500 }` | Batch size capped at 200 (MAX_BATCH_SIZE). | [ ] |

---

## 8. End-to-End Happy Path

This section walks through the complete V2 pipeline from start to finish. All feature flags must be enabled.

### Prerequisites
- [ ] V2 feature flag enabled (`VOICE_NOTES_V2_GLOBAL=true`)
- [ ] Entity resolution flag enabled (`ENTITY_RESOLUTION_V2_GLOBAL=true`)
- [ ] Coach user with WhatsApp connected
- [ ] Players enrolled: at least 3 players, including 2 with the same first name (e.g., "Alex Murphy" and "Alex Kelly")
- [ ] Coach assigned to at least one team with players

### Full Pipeline Walkthrough

| Step | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| E2E-001 | Coach sends WhatsApp voice note: "Quick update from training today. Sean hurt his knee during drills, he'll need to sit out tomorrow. Alex was absolutely brilliant with his passing, really improved this week. Alex — the other one, Alex Kelly — missed the last two sessions. And Emma showed great leadership in the warm-up." | Message received by system. | [ ] |
| E2E-002 | Quality gate passes | No rejection message sent back. Message proceeds to processing. | [ ] |
| E2E-003 | Duplicate check passes | Not flagged as duplicate (first message). | [ ] |
| E2E-004 | V1 voice note created | Check `voiceNotes` table — new record exists. | [ ] |
| E2E-005 | V2 artifact created | Check `voiceNoteArtifacts` table — new record with `sourceChannel: "whatsapp_audio"`. | [ ] |
| E2E-006 | Transcript created | Check `voiceNoteTranscripts` — `fullText` contains the transcribed speech. | [ ] |
| E2E-007 | Claims extracted | Check `voiceNoteClaims` — at least 4 claims: injury (Sean), skill_progress (Alex), attendance (Alex Kelly), performance/behavior (Emma). | [ ] |
| E2E-008 | Entity resolution runs | Check `voiceNoteEntityResolutions` — entries for "Sean", "Alex" (ambiguous?), "Alex Kelly", "Emma". | [ ] |
| E2E-009 | Unambiguous names auto-resolve | "Sean" (if unique) and "Emma" (if unique) auto-resolved. | [ ] |
| E2E-010 | Ambiguous "Alex" needs disambiguation | If two Alex players exist, "Alex" entry shows status "pending" with 2+ candidates. | [ ] |
| E2E-011 | Disambiguation banner on dashboard | Log in as the coach. Navigate to voice notes dashboard. Banner shows "1 name in 1 note needs your attention". | [ ] |
| E2E-012 | Resolve "Alex" via disambiguation UI | Click banner → disambiguation page. Select "Alex Murphy" for the ambiguous mention. Confirm. | All "Alex" mentions resolve to "Alex Murphy". Alias saved. | [ ] |
| E2E-013 | Drafts generated | Check `insightDrafts` table — drafts for each resolved claim. Injury draft has `requiresConfirmation: true`. | [ ] |
| E2E-014 | Coach receives WhatsApp summary | Coach gets message listing the drafts with numbers. Trust-appropriate format. | [ ] |
| E2E-015 | Coach sends "CONFIRM" via WhatsApp | All pending drafts confirmed. Status → "confirmed". | [ ] |
| E2E-016 | Coach receives confirmation | WhatsApp message: "Saved X updates. Updated players: Sean, Alex Murphy, Alex Kelly, Emma." | [ ] |
| E2E-017 | Review link works | Open the review link from the WhatsApp message. Page loads without login. Shows insights. | [ ] |
| E2E-018 | Review all items on microsite | Apply/dismiss any remaining items. Progress counter works. | [ ] |
| E2E-019 | All Caught Up | After reviewing all items, "All Caught Up" message displays. | [ ] |

---

## 9. Regression Tests

Verify that existing V1 functionality still works correctly when V2 is enabled.

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| REG-001 | V1 insights still created | 1. With V2 ON, send voice note 2. Check `voiceNotes` record | V1 `insights` array still populated as before. | [ ] |
| REG-002 | V1 dashboard still works | 1. Navigate to coach voice notes dashboard 2. Check existing voice notes in History tab | All existing voice notes visible and functional. | [ ] |
| REG-003 | V1 insight apply still works | 1. On a V1 voice note with insights, apply an insight manually | Insight applied successfully. Player data updated. | [ ] |
| REG-004 | Admin audit page still works | 1. Log in as admin 2. Navigate to voice notes audit page | Audit page loads. Shows voice notes. Search and filter work. | [ ] |
| REG-005 | V1-only coach unaffected | 1. Disable V2 for a specific coach (or don't enable) 2. Send voice note as that coach | Only V1 processing occurs. No artifacts, claims, or entity resolutions created. | [ ] |
| REG-006 | Existing voice notes accessible | 1. Check that voice notes created before V2 branch are still visible and functional | All pre-existing data intact. No data migration required for basic functionality. | [ ] |
| REG-007 | Coach dashboard tabs work | 1. Navigate to voice notes dashboard 2. Click New, History, My Impact tabs | All tabs load correctly. No errors in console. | [ ] |
| REG-008 | Typed note creation still works | 1. On coach dashboard, switch to typed note 2. Enter text 3. Click Save | Note saved. Toast notification shown. Appears in History tab. | [ ] |

---

## 10. Cross-Cutting Concerns

### 10.1 Mobile Responsiveness

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| MOB-001 | Review microsite at 375px | 1. Open review link 2. Set viewport to 375px wide | No horizontal scroll. All buttons reachable. Text readable. | [ ] |
| MOB-002 | Disambiguation page at 375px | 1. Open disambiguation page at 375px | Touch targets 44px+. Candidate cards stack properly. | [ ] |
| MOB-003 | Coach dashboard at 375px | 1. Open voice notes dashboard at 375px | Tabs and recording controls usable. | [ ] |
| MOB-004 | Claims viewer at 375px | 1. Open claims viewer at 375px (as platform staff) | Stats cards stack. Artifact list scrollable. | [ ] |

### 10.2 Access Control

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| AC-001 | Parent cannot see voice notes dashboard | 1. Log in as parent 2. Navigate to voice notes URL | Redirected or access denied. | [ ] |
| AC-002 | Parent cannot see disambiguation | 1. Log in as parent 2. Navigate to disambiguation URL | Redirected or access denied. | [ ] |
| AC-003 | Non-staff cannot see claims viewer | 1. Log in as non-platform-staff user 2. Navigate to `/platform/v2-claims` | Redirected or access denied. | [ ] |
| AC-004 | Review microsite has no auth requirement | 1. Open review link in incognito browser | Page loads without any authentication. | [ ] |
| AC-005 | Review microsite code is sole access control | 1. Try to access `/r/` without a code | Shows invalid link page, not a login prompt. | [ ] |

### 10.3 Performance

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| PERF-001 | Dashboard loads within 20s | 1. Navigate to coach voice notes dashboard 2. Measure load time | Page fully loaded within 20 seconds. | [ ] |
| PERF-002 | Review microsite loads within 10s | 1. Open a review link 2. Measure load time | Page fully loaded within 10 seconds (no auth overhead). | [ ] |
| PERF-003 | Claims viewer handles 100+ artifacts | 1. If 100+ artifacts exist, open claims viewer | Page doesn't hang or crash. Pagination or virtual scrolling works. | [ ] |

### 10.4 Backend Unit Tests

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| UT-001 | String matching tests | Run: `cd packages/backend && npx vitest run __tests__/stringMatching.test.ts` | All pass. | [ ] |
| UT-002 | Duplicate detection tests | Run: `cd packages/backend && npx vitest run __tests__/duplicateDetection.test.ts` | All pass. | [ ] |
| UT-003 | Message validation tests | Run: `cd packages/backend && npx vitest run __tests__/messageValidation.test.ts` | All pass. | [ ] |
| UT-004 | Player matching tests | Run: `cd packages/backend && npx vitest run __tests__/playerMatching.test.ts` | All pass. | [ ] |
| UT-005 | Review links tests | Run: `cd packages/backend && npx vitest run __tests__/reviewLinks.test.ts` | All pass. | [ ] |
| UT-006 | WhatsApp commands tests | Run: `cd packages/backend && npx vitest run __tests__/whatsappCommands.test.ts` | All pass. | [ ] |
| UT-007 | WhatsApp feedback tests | Run: `cd packages/backend && npx vitest run __tests__/whatsappFeedback.test.ts` | All pass. | [ ] |

### 10.5 Automated E2E Tests

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| E2E-A-001 | Full E2E suite | Run: `npx -w apps/web playwright test --config=uat/playwright.config.ts uat/tests/voice-notes/` | At least 69 of 73 tests pass (4 known flaky). | [ ] |

### 10.6 Build & Type Checks

| ID | Test Case | Steps | Expected Result | Pass |
|----|-----------|-------|-----------------|------|
| BUILD-001 | Convex codegen | Run: `npx -w packages/backend convex codegen` | No errors. | [ ] |
| BUILD-002 | TypeScript check | Run: `npm run check-types` | No NEW errors (pre-existing errors in migrations/ and coachParentSummaries are OK). | [ ] |
| BUILD-003 | Lint check | Run: `npx ultracite fix && npm run check` | Passes. | [ ] |

---

## 11. Test Summary Tracker

Use this table to track overall progress.

| Phase | Total Tests | Passed | Failed | Blocked | Notes |
|-------|------------|--------|--------|---------|-------|
| **Setup** (Section 1) | 7 | | | | Prerequisites |
| **Phase 1** - Quality Gates (US-VN-001 to 004) | 16 | | | | |
| **Phase 1** - Fuzzy Matching (US-VN-005, 006) | 11 | | | | |
| **Phase 2** - Review Microsite (US-VN-007 to 012) | 28 | | | | |
| **Phase 3** - Artifacts Foundation (US-VN-013, 014) | 12 | | | | |
| **Phase 4** - Claims Extraction (US-VN-015, 016) | 18 | | | | |
| **Phase 5** - Entity Resolution (US-VN-017, 018) | 22 | | | | |
| **Phase 6** - Drafts & Commands (US-VN-019 to 021) | 27 | | | | |
| **E2E Happy Path** | 19 | | | | |
| **Regression** | 8 | | | | |
| **Cross-Cutting** | 20 | | | | |
| **TOTAL** | **188** | | | | |

---

## Quick Reference: Key URLs

| Page | URL | Auth Required? |
|------|-----|---------------|
| Coach Voice Notes Dashboard | `/orgs/[orgId]/coach/voice-notes` | Yes (Coach role) |
| Admin Voice Notes Audit | `/orgs/[orgId]/admin/voice-notes` | Yes (Admin role) |
| Review Microsite | `/r/[code]` | No (code is the token) |
| Disambiguation Page | `/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]` | Yes (Coach role) |
| Claims Viewer | `/platform/v2-claims` | Yes (Platform Staff) |

## Quick Reference: Key Database Tables

| Table | Phase | What to Check |
|-------|-------|---------------|
| `voiceNotes` | V1 | Original voice note records (V1 pipeline) |
| `featureFlags` | 3 | Flag configuration for V2/entity resolution |
| `voiceNoteArtifacts` | 3 | V2 artifact records — check status progression |
| `voiceNoteTranscripts` | 3 | Transcript text with segments |
| `voiceNoteClaims` | 4 | Extracted claims — check topics, confidence |
| `voiceNoteEntityResolutions` | 5 | Entity resolution candidates — check status, candidates |
| `coachPlayerAliases` | 5 | Saved coach aliases — check after disambiguation |
| `insightDrafts` | 6 | Draft insights — check status, confidence, confirmation |
| `whatsappReviewLinks` | 2 | Review link codes — check expiry, access log |
| `reviewAnalytics` | 2.5 | Analytics events — check after interactions |

## Quick Reference: WhatsApp Commands

| Command | Aliases | Action |
|---------|---------|--------|
| `CONFIRM` | `YES`, `Y`, `OK` | Confirm all pending drafts |
| `CONFIRM 1,3` | `YES 1,3` | Confirm specific drafts by number |
| `CANCEL` | `NO`, `N` | Cancel all pending drafts |
| `Alex = Alex Murphy, Alex Kelly` | (any `X = Y, Z` pattern) | Entity mapping |

---

*Generated 2026-02-08 from branch `feat/voice-gateways-v2` (50 commits, 21 stories, 6 phases, 188 test cases)*
