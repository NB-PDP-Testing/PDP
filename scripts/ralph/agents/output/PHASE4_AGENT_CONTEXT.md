# Phase 4 Agent Context - Claims Extraction

**Date:** 2026-02-06
**Current Phase:** Voice Gateways v2 Phase 4 (Claims Extraction)
**Branch:** feat/voice-gateways-v2

---

## Completed: Phases 1-3

### Phase 1: Quality Gates & Fuzzy Matching (US-VN-001 to US-VN-006)
- Message validation, duplicate detection, WhatsApp feedback
- Levenshtein distance, player fuzzy matching
- 349 tests passing

### Phase 2: Coach Quick Review Microsite (US-VN-007 to US-VN-012)
- Review links backend, /r/[code] microsite
- Batch actions, unmatched player cards, trust-adaptive messages
- Link expiry crons

### Phase 2.5: Review Microsite Polish (US-VN-012a-d)
- Analytics, swipe gestures, snooze, PWA support

### Phase 3: v2 Artifacts Foundation (US-VN-013 to US-VN-014)
- voiceNoteArtifacts + voiceNoteTranscripts tables
- featureFlags table with shouldUseV2Pipeline cascade
- Dual-path processing in whatsapp.ts
- v2 transcript storage after transcription completes

---

## Phase 4: What To Build

### US-VN-015: Claims Table & Extraction Action (2 days)

**Files to CREATE:**
- `packages/backend/convex/models/voiceNoteClaims.ts` (6 functions)
- `packages/backend/convex/lib/coachContext.ts` (internalQuery)
- `packages/backend/convex/actions/claimsExtraction.ts` (internalAction)

**Files to MODIFY:**
- `packages/backend/convex/schema.ts` (add voiceNoteClaims table)
- `packages/backend/convex/models/voiceNoteArtifacts.ts` (add getArtifactById)

### US-VN-016: Pipeline Integration & Claims Viewer (1 day)

**Files to CREATE:**
- `apps/web/src/app/platform/v2-claims/page.tsx`

**Files to MODIFY:**
- `packages/backend/convex/actions/voiceNotes.ts` (~3 lines: scheduler call)
- `packages/backend/convex/models/voiceNoteArtifacts.ts` (getRecentArtifacts public query)
- `packages/backend/convex/models/voiceNoteClaims.ts` (optional getRecentClaims public query)

---

## Key Integration Points (Line Numbers)

| Location | Line(s) | What |
|----------|---------|------|
| voiceNotes.ts | 228-257 | v2 transcript storage (after transcription) |
| voiceNotes.ts | 233 | `if (artifacts.length > 0)` block — ADD claims scheduler here |
| voiceNotes.ts | 280-286 | v1 buildInsights scheduler (DO NOT MODIFY) |
| voiceNotes.ts | 340-471 | Coach context gathering (PORT to coachContext.ts) |
| voiceNotes.ts | 486-604 | GPT-4 prompt matching rules (PORT to claims prompt) |
| voiceNotes.ts | 651-724 | Player matching + fuzzy fallback (REPLICATE pattern) |
| voiceNotes.ts | 29-70 | getAIConfig function (REUSE pattern) |
| schema.ts | ~4220 | After voiceNoteTranscripts (INSERT voiceNoteClaims) |
| voiceNoteArtifacts.ts | 132-169 | getArtifactByArtifactId pattern (ADD getArtifactById) |

---

## Mandatory Patterns

### Schema
- 15 topic literals in v.union() — injury, skill_rating, skill_progress, behavior, performance, attendance, wellbeing, recovery, development_milestone, physical_development, parent_communication, tactical, team_culture, todo, session_plan
- 7 indexes — by_artifactId, by_artifactId_and_status, by_claimId, by_topic, by_org_and_coach, by_org_and_status, by_resolvedPlayerIdentityId
- Denormalized organizationId + coachUserId on claims

### Actions
- `"use node"` at top of claimsExtraction.ts
- OpenAI + zodTextFormat for structured output
- try/catch with artifact status update to "failed" on error
- getAIConfig with feature: "voice_insights"

### Player Matching
- Deterministic match first (AI's playerId from roster)
- Fuzzy fallback via findSimilarPlayers (threshold >= 0.85)
- resolvedPlayerIdentityId is v.id("playerIdentities")

### Validators
- v.string() for Better Auth IDs (userId, organizationId, teamId)
- v.id("tableName") for Convex doc IDs (playerIdentities, voiceNoteArtifacts)
- All functions MUST have args AND returns validators
- Define shared validators at module scope

---

## Common Mistakes to Avoid

1. Don't add claims logic inside voiceNotes.ts — use separate claimsExtraction.ts
2. Don't modify v1 buildInsights — it must remain unchanged
3. Don't use .filter() — always .withIndex()
4. Don't forget "use node" on action files using OpenAI SDK
5. Don't use v.any() — always typed validators
6. Don't call public mutations from internalActions
7. Biome: block statements { }, top-level regex, max 4 params, max 15 cognitive complexity
8. Biome auto-removes imports — add import AND usage in same edit

---

## Full Context

- PRD: `scripts/ralph/prd.json`
- Implementation Guide: `scripts/ralph/prds/voice-gateways-v2/context/PHASE4_CLAIMS_EXTRACTION.md`
- Progress: `scripts/ralph/progress.txt`
