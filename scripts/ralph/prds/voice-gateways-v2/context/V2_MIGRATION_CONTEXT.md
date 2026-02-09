# Voice Notes v2 Migration - Context Document

**Project**: Voice Notes v1→v2 Unified Pipeline Migration
**Branch**: feat/voice-gateways-v2
**Prerequisite**: All 6 prior phases (US-VN-001 through US-VN-021) COMPLETE

---

## Background

Over 6 phases, we built a complete v2 voice notes pipeline:
- Phase 1: Quality gates + fuzzy matching (`lib/messageValidation.ts`, `lib/stringMatching.ts`)
- Phase 2: Coach quick review microsite (`/r/[code]`, `whatsappReviewLinks`)
- Phase 3: v2 artifacts foundation (`voiceNoteArtifacts`, `voiceNoteTranscripts`, `featureFlags`)
- Phase 4: Claims extraction (`voiceNoteClaims`, `claimsExtraction.ts`, 15 categories)
- Phase 5: Entity resolution & disambiguation (`voiceNoteEntityResolutions`, `coachPlayerAliases`)
- Phase 6: Drafts & confirmation workflow (`insightDrafts`, `whatsappCommands`)

**The problem**: The v2 backend infrastructure is complete but **almost entirely disconnected from the frontend and in-app notes**. The frontend reads exclusively from v1 data structures. Only the WhatsApp path creates v2 artifacts (when feature-flagged).

---

## Current State

### v1 Pipeline (Production — All Frontend Uses This)
```
Coach Input (App/WhatsApp)
    → createTypedNote / createRecordedNote (mutation in models/voiceNotes.ts)
    → [transcribeAudio if recorded]
    → buildInsights (action — GPT-4o single-pass extraction)
    → writes insights[] array into voiceNotes table + creates voiceNoteInsights records
Frontend reads: voiceNotes, voiceNoteInsights, autoAppliedInsights, coachParentSummaries
```

### v2 Pipeline (Backend Only, WhatsApp-Only When Feature-Flagged)
```
WhatsApp Message (when v2 flag ON)
    → createArtifact (internalMutation in models/voiceNoteArtifacts.ts)
    → createRecordedNote/createTypedNote (v1 note also created)
    → transcribeAudio → createTranscript (v2) + buildInsights (v1, runs in parallel!)
    → extractClaims (GPT-4 structured output → 15 categories)
    → resolveEntities (Levenshtein fuzzy matching + alias learning)
    → generateDrafts (creates insightDrafts with confidence scoring)
    → applyDraft → writes to voiceNoteInsights (v1 table!)
```

### Critical Finding: v2 Writes Back to v1
`insightDrafts.applyDraft` (models/insightDrafts.ts:455-529) creates a `voiceNoteInsights` record when a draft is confirmed. This means:
- The frontend **doesn't need new queries** for viewing applied insights
- But it **does need new UI** for the draft confirmation workflow
- Both v1 and v2 currently produce `voiceNoteInsights` records (duplication risk)

---

## Key Architecture Decision

**v2 replaces the AI processing layer. v1 tables remain the read model.**

```
ANY Source (App typed, App recorded, WhatsApp text, WhatsApp audio)
    → Create voiceNotes record (v1 — stays for backward compat)
    → Create voiceNoteArtifact (v2 — new for in-app sources)
    → [transcribeAudio → createTranscript (v2)]
    → extractClaims (v2 — replaces buildInsights)
    → resolveEntities (v2 — fuzzy matching + aliases)
    → generateDrafts (v2 — confidence-scored drafts)
    → Auto-confirm (high confidence + trusted coach) OR pending (needs review)
    → applyDraft → voiceNoteInsights (v1 table — frontend reads this)
               → trigger coachParentSummaries (v1 — for parent visibility)
               → autoAppliedInsights (v1 — for audit trail)
```

---

## Critical Code Locations

### In-App Note Creation (NEEDS v2 WIRING)
- `packages/backend/convex/models/voiceNotes.ts:554-584` — `createTypedNote`: Creates v1 voiceNotes, schedules `buildInsights`. **No artifact creation.**
- `packages/backend/convex/models/voiceNotes.ts:591-624` — `createRecordedNote`: Creates v1 voiceNotes, schedules `transcribeAudio`. **No artifact creation.**

### WhatsApp v2 Path (ALREADY WIRED)
- `packages/backend/convex/actions/whatsapp.ts:753-813` — Audio: creates artifact + v1 note when v2 enabled
- `packages/backend/convex/actions/whatsapp.ts:867-920` — Text: creates artifact + v1 note when v2 enabled

### Transcription → v2 Bridge (ALREADY WORKS)
- `packages/backend/convex/actions/voiceNotes.ts:228-264` — `transcribeAudio`: Already checks for existing artifacts, creates transcripts, schedules `extractClaims` if artifact exists

### v1 Insight Processing (TO BE REPLACED)
- `packages/backend/convex/actions/voiceNotes.ts:311-866` — `buildInsights`: v1 single-pass extraction
- `packages/backend/convex/actions/voiceNotes.ts:287-293` — schedules `buildInsights` after transcription

### v2 Claims Pipeline (ALREADY COMPLETE)
- `packages/backend/convex/actions/claimsExtraction.ts:427+` — `extractClaims`
- `packages/backend/convex/actions/entityResolution.ts:97+` — `resolveEntities`
- `packages/backend/convex/actions/draftGeneration.ts:153+` — `generateDrafts`

### Draft Management (ALREADY COMPLETE)
- `packages/backend/convex/models/insightDrafts.ts:135-166` — `getPendingDraftsForCoach`
- `packages/backend/convex/models/insightDrafts.ts:170-221` — `confirmDraft`
- `packages/backend/convex/models/insightDrafts.ts:223-271` — `confirmAllDrafts`
- `packages/backend/convex/models/insightDrafts.ts:273-318` — `rejectDraft`
- `packages/backend/convex/models/insightDrafts.ts:320-362` — `rejectAllDrafts`
- `packages/backend/convex/models/insightDrafts.ts:455-529` — `applyDraft` (writes to voiceNoteInsights)

### Feature Flags
- `packages/backend/convex/lib/featureFlags.ts:35-98` — `shouldUseV2Pipeline` (4-level cascade)
- `packages/backend/convex/lib/featureFlags.ts:111-174` — `shouldUseEntityResolution`

### Frontend Dashboard
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx` — Tab system (TabId type line 63-70, tabs builder lines 408-479, tab content lines 741-788)
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx` — 2110 lines, reads v1 data exclusively
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/disambiguation-banner.tsx` — Already exists (lines 16-59), queries `getDisambiguationQueue`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]/page.tsx` — Existing disambiguation UI (lines 107-280)

### Parent Summary Generation
- `packages/backend/convex/actions/coachParentSummaries.ts:586-782` — `processVoiceNoteInsight`: rate limit → budget → sensitivity → generate → store

---

## What We Are NOT Changing

- `voiceNoteInsights` table — stays as the read model for applied insights
- Frontend queries for applied insights (`getInsightsByVoiceNotes`, `getVoiceNotesByCoach`) — unchanged
- InsightsTab — continues reading from v1 tables (which v2 writes to via `applyDraft`)
- ParentsTab, AutoApprovedTab, HistoryTab, TeamInsightsTab, MyImpactTab — no changes to data source
- Admin voice notes page — continues reading v1 data
- Player passport voice insights section — continues reading v1 data
- Review microsite — continues working as-is

---

## Verified Function Signatures

These signatures were verified against the actual codebase. Ralph MUST use these exact args — do NOT guess or assume different parameter names.

### voiceNoteArtifacts (models/voiceNoteArtifacts.ts)

**createArtifact** (internalMutation, lines 62-97):
```typescript
args: {
  artifactId: v.string(),           // UUID — generate with crypto.randomUUID()
  sourceChannel: v.union(v.literal("whatsapp_audio"), v.literal("whatsapp_text"), v.literal("app_recorded"), v.literal("app_typed")),
  senderUserId: v.string(),         // Better Auth user ID (coach)
  orgContextCandidates: v.array(v.object({ organizationId: v.string(), confidence: v.number() })),
  rawMediaStorageId: v.optional(v.id("_storage")),  // Only for audio
  metadata: v.optional(v.object({ mimeType: v.optional(v.string()) })),
}
returns: v.id("voiceNoteArtifacts")   // Convex _id (use this for createTranscript, extractClaims)
```
**CRITICAL**: createArtifact does NOT accept `voiceNoteId`, `status`, or `createdAt`. It hardcodes `status: "received"` and sets timestamps internally.

**linkToVoiceNote** (internalMutation, lines 103-126):
```typescript
args: {
  artifactId: v.string(),           // UUID string (NOT Convex _id!)
  voiceNoteId: v.id("voiceNotes"),  // Convex _id of the v1 voice note
}
returns: v.null()
```
**CRITICAL**: Takes the UUID string, not the Convex _id. Call AFTER createArtifact + v1 note insertion.

**updateArtifactStatus** (internalMutation, line 132+):
```typescript
args: {
  artifactId: v.string(),           // UUID string
  status: v.string(),               // "received" | "transcribed" | "processing" | "completed" | "failed"
}
returns: v.null()
```

**getArtifactsByVoiceNote** (internalQuery):
```typescript
args: { voiceNoteId: v.id("voiceNotes") }
returns: v.array(...)  // Array of artifact docs
```

### voiceNoteTranscripts (models/voiceNoteTranscripts.ts)

**createTranscript** (internalMutation):
```typescript
args: {
  artifactId: v.id("voiceNoteArtifacts"),  // Convex _id (from createArtifact return)
  fullText: v.string(),
  segments: v.array(v.object({ text: v.string(), startTime: v.number(), endTime: v.number(), confidence: v.number() })),
  modelUsed: v.string(),         // "whisper-1", "user_typed", "migration"
  language: v.string(),          // "en"
  duration: v.number(),          // seconds, 0 for typed
}
returns: v.id("voiceNoteTranscripts")
```

### claimsExtraction (actions/claimsExtraction.ts)

**extractClaims** (internalAction):
```typescript
args: { artifactId: v.id("voiceNoteArtifacts") }  // Convex _id
returns: v.null()
```

### featureFlags (lib/featureFlags.ts)

**shouldUseV2Pipeline** (internalQuery, lines 35-98):
```typescript
args: { organizationId: v.string(), userId: v.string() }
returns: v.boolean()
```
Cascade: env var VOICE_NOTES_V2_GLOBAL → platform flag → org flag → user flag → default false

**shouldUseEntityResolution** (internalQuery, lines 111-174):
```typescript
args: { organizationId: v.string(), userId: v.string() }
returns: v.boolean()
```

**setFeatureFlag** (internalMutation, lines 244-317):
```typescript
args: {
  featureKey: v.string(),
  scope: v.union(v.literal("platform"), v.literal("organization"), v.literal("user")),
  organizationId: v.optional(v.string()),
  userId: v.optional(v.string()),
  enabled: v.boolean(),
  updatedBy: v.optional(v.string()),
  notes: v.optional(v.string()),
}
returns: v.id("featureFlags")
```

### insightDrafts (models/insightDrafts.ts)

**getPendingDraftsForCoach** (PUBLIC query, lines 139-166):
```typescript
args: { organizationId: v.string() }
// NOTE: NO coachUserId arg — uses ctx.auth.getUserIdentity().subject internally
returns: v.array(draftObjectValidator)  // Array of draft objects
```
Uses auth identity for coach filtering. Filters expired drafts (>7 days).

**confirmDraft** (PUBLIC mutation, lines 170-221):
```typescript
args: { draftId: v.string() }   // UUID string, NOT v.id("insightDrafts")!
returns: v.null()
```
Looks up draft by draftId index, verifies auth ownership via artifact.senderUserId, schedules applyDraft.

**confirmAllDrafts** (PUBLIC mutation, lines 225-271):
```typescript
args: { artifactId: v.id("voiceNoteArtifacts") }   // NOT coachUserId/organizationId!
returns: v.null()   // NOT v.object({ confirmed: v.number() })
```
Confirms all pending drafts for a specific artifact. Verifies auth ownership.

**rejectDraft** (PUBLIC mutation, lines 275-318):
```typescript
args: { draftId: v.string() }   // UUID string, NO reason parameter
returns: v.null()
```
Looks up draft by draftId index, verifies auth ownership.

**rejectAllDrafts** (PUBLIC mutation, lines 322-362):
```typescript
args: { artifactId: v.id("voiceNoteArtifacts") }   // NOT coachUserId/organizationId!
returns: v.null()   // NOT v.object({ rejected: v.number() })
```
Rejects all pending drafts for a specific artifact. Verifies auth ownership.

**applyDraft** (internalMutation, lines 457-529):
```typescript
args: { draftId: v.string() }   // UUID string, NOT v.id("insightDrafts")
returns: v.null()
// Writes to voiceNoteInsights table (v1 read model)
```

**getPendingDraftsInternal** (internalQuery, lines 367-389):
```typescript
args: { organizationId: v.string(), coachUserId: v.string() }
returns: v.array(draftObjectValidator)
```
Internal version with explicit coachUserId (no auth check). Used by WhatsApp command handler.

**confirmDraftInternal** (internalMutation, lines 394-422):
```typescript
args: { draftId: v.string() }
returns: v.null()
```
Internal version — no auth check, no applyDraft scheduling (caller handles).

**rejectDraftInternal** (internalMutation, lines 427-452):
```typescript
args: { draftId: v.string() }
returns: v.null()
```
Internal version — no auth check.

### processVoiceNoteInsight (actions/coachParentSummaries.ts:586-782)

**CRITICAL** — Requires 7 args (not 3):
```typescript
args: {
  voiceNoteId: v.id("voiceNotes"),
  insightId: v.string(),                         // UUID string
  insightTitle: v.string(),                       // Required!
  insightDescription: v.string(),                 // Required!
  playerIdentityId: v.id("playerIdentities"),     // Required!
  organizationId: v.string(),
  coachId: v.optional(v.string()),
}
returns: v.null()
```

### autoAppliedInsights Schema (schema.ts:1663-1705)

**WARNING: Many fields are REQUIRED (not optional). Missing any will cause insert to fail.**

```typescript
autoAppliedInsights: defineTable({
  // Source tracking
  insightId: v.id("voiceNoteInsights"),              // REQUIRED: Convex _id from voiceNoteInsights insert
  voiceNoteId: v.id("voiceNotes"),                   // REQUIRED

  // Context
  playerId: v.id("orgPlayerEnrollments"),             // REQUIRED (deprecated but NOT optional!)
  playerIdentityId: v.id("playerIdentities"),         // REQUIRED
  coachId: v.string(),                                // REQUIRED
  organizationId: v.string(),                         // REQUIRED

  // Insight metadata
  category: v.string(),                               // REQUIRED
  confidenceScore: v.number(),                        // REQUIRED
  insightTitle: v.string(),                           // REQUIRED
  insightDescription: v.string(),                     // REQUIRED

  // Application tracking
  appliedAt: v.number(),                              // REQUIRED
  autoAppliedByAI: v.boolean(),                       // REQUIRED

  // Undo tracking (optional)
  undoneAt: v.optional(v.number()),
  undoReason: v.optional(v.union(...)),               // "wrong_player" | "wrong_rating" | etc.
  undoReasonDetail: v.optional(v.string()),

  // Change tracking (REQUIRED!)
  changeType: v.string(),                             // REQUIRED: e.g., "insight_applied"
  targetTable: v.string(),                            // REQUIRED: e.g., "voiceNoteInsights"
  targetRecordId: v.optional(v.string()),             // Optional
  fieldChanged: v.optional(v.string()),               // Optional
  previousValue: v.optional(v.string()),              // Optional
  newValue: v.string(),                               // REQUIRED: serialized JSON string
})
```

**CRITICAL for Phase 7C**: `playerId`, `changeType`, `targetTable`, and `newValue` are ALL required.
- `playerId` is deprecated but NOT optional in schema — must provide a valid `v.id("orgPlayerEnrollments")`
- Need to resolve: either make `playerId` optional in schema first, or look up the player's enrollment ID from playerIdentityId
- `changeType`: use `"insight_applied"` for v2 draft applications
- `targetTable`: use `"voiceNoteInsights"`
- `newValue`: serialize the insight data as JSON string

### voiceNotes — Key Queries (models/voiceNotes.ts)

**getCompletedForMigration** (internalQuery, line 2696):
```typescript
args: { organizationId: v.optional(v.string()), limit: v.number() }
returns: v.array(v.object({ _id: v.id("voiceNotes"), orgId: v.string(), coachId: v.optional(v.string()), source: sourceValidator, transcription: v.optional(v.string()), transcriptionStatus: v.optional(statusValidator), insights: v.array(...) }))
```

### migration (actions/migration.ts)

**migrateVoiceNotesToV2** (internalAction, line 272):
```typescript
args: { organizationId: v.optional(v.string()), dryRun: v.boolean(), batchSize: v.optional(v.number()) }
returns: v.object({ processed: v.number(), artifacts: v.number(), transcripts: v.number(), claims: v.number(), errors: v.number(), skipped: v.number() })
```
NOTE: This is an internalAction — cannot be called directly via `convex run`. Requires a wrapper script.

---

## WhatsApp v2 Reference Pattern

This is the VERIFIED pattern from whatsapp.ts that Phase 7A should follow for in-app notes:

### Audio (whatsapp.ts:753-814):
```
1. useV2 = await ctx.runQuery(shouldUseV2Pipeline, { organizationId, userId: coachId })
2. if (useV2): artifactId = crypto.randomUUID()
3. if (useV2): await ctx.runMutation(createArtifact, { artifactId, sourceChannel: "whatsapp_audio", senderUserId, orgContextCandidates, rawMediaStorageId, metadata })
4. noteId = await createRecordedNote({ orgId, coachId, audioStorageId, noteType, source: "whatsapp_audio" })
5. if (useV2 && artifactId): await ctx.runMutation(linkToVoiceNote, { artifactId, voiceNoteId: noteId })
```

### Text (whatsapp.ts:867-923):
```
1. useV2 = await ctx.runQuery(shouldUseV2Pipeline, { organizationId, userId: coachId })
2. if (useV2): artifactId = crypto.randomUUID()
3. if (useV2): await ctx.runMutation(createArtifact, { artifactId, sourceChannel: "whatsapp_text", senderUserId, orgContextCandidates })
4. noteId = await createTypedNote({ orgId, coachId, noteText, noteType, source: "whatsapp_text" })
5. if (useV2 && artifactId): await ctx.runMutation(linkToVoiceNote, { artifactId, voiceNoteId: noteId })
```

### DOUBLE ARTIFACT WARNING (Phase 7D):
When WhatsApp calls createTypedNote/createRecordedNote, the v2 artifact is ALREADY created externally. If Phase 7A adds v2 artifact creation INSIDE createTypedNote/createRecordedNote, WhatsApp path will create DUPLICATE artifacts. Phase 7D resolves this with a `skipV2` optional arg.

---

## Mandatory Patterns

- **NEVER use `.filter()`** — always `.withIndex()`
- **JavaScript array `.filter()` after `.collect()` is FINE** — only Convex query `.filter()` is banned
- **Batch fetch + Map lookup** — never `Promise.all` with queries in loop
- **Better Auth**: use `user._id` (not `user.id`), `user.name` (not `user.firstName`)
- **Atomic imports**: add import + usage in same edit
- **Feature-flag all changes**: v1 continues as fallback when v2 is disabled
- **All queries must filter by organizationId** for data isolation
- **NEVER call shouldUseV2Pipeline twice** in the same function — store result in a variable
- **Scripts use camelCase filenames** (e.g., `enableV2ForOrg.ts`, not `enable-v2-for-org.ts`)
