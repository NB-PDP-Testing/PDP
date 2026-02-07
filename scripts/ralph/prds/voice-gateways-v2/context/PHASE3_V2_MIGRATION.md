# Phase 3-6: v2 Pipeline Migration - Implementation Guide

**Duration**: 15 days (Phases 3-6 combined)
**Dependencies**: Phase 2 complete and deployed to production
**Primary Reference**: `docs/architecture/voice-notes-pipeline-v2.md`

---

## Overview

Phases 3-6 implement the full Voice Notes Pipeline v2 architecture incrementally:

- **Phase 3**: Artifacts & Transcripts tables (foundation)
- **Phase 4**: Claims extraction (atomic units per player)
- **Phase 5**: Entity resolution & disambiguation
- **Phase 6**: Drafts & confirmation workflow

**Migration Strategy**: Coexistence (v1 and v2 run in parallel via feature flags).

---

## Phase 3: v2 Artifacts Foundation (3 days)

**Goal**: Create v2 tables and dual-path processing without breaking v1.

### New Tables

```typescript
// voiceNoteArtifacts - Source-agnostic record
voiceNoteArtifacts: defineTable({
  artifactId: v.string(),
  sourceChannel: v.union(
    v.literal("whatsapp_audio"),
    v.literal("whatsapp_text"),
    v.literal("app_recorded"),
    v.literal("app_typed")
  ),
  senderUserId: v.string(),
  orgContextCandidates: v.array(...),
  status: v.union(...),  // received, transcribing, transcribed, etc.
  voiceNoteId: v.optional(v.id("voiceNotes")),  // Backward compat link
  createdAt: v.number()
});

// voiceNoteTranscripts - Detailed transcription with segments
voiceNoteTranscripts: defineTable({
  artifactId: v.id("voiceNoteArtifacts"),
  fullText: v.string(),
  segments: v.array(v.object({
    text: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    confidence: v.number()  // Whisper per-segment confidence
  })),
  modelUsed: v.string(),
  language: v.string(),
  duration: v.number()
});
```

### Dual-Path Processing

```typescript
// actions/whatsapp.ts - Modified processIncomingMessage

const useV2 = await shouldUseV2Pipeline(ctx, orgId, coachId);

if (useV2) {
  // v2 path: Create artifact
  const artifactId = await ctx.runMutation(
    internal.models.voiceNoteArtifacts.create,
    { sourceChannel: "whatsapp_audio", ... }
  );

  // Still create v1 voice note for backward compat
  const voiceNoteId = await ctx.runMutation(
    api.models.voiceNotes.createRecordedNote,
    { ... }
  );

  // Link them
  await ctx.runMutation(
    internal.models.voiceNoteArtifacts.linkToVoiceNote,
    { artifactId, voiceNoteId }
  );
} else {
  // v1 path: Existing flow (unchanged)
  const voiceNoteId = await ctx.runMutation(
    api.models.voiceNotes.createRecordedNote,
    { ... }
  );
}
```

**Reference**: `voice-notes-pipeline-v2.md` lines 145-252

---

## Phase 4: Claims Extraction (4 days)

**Goal**: Segment transcripts into atomic claims (one per player mention).

### New Table

```typescript
// voiceNoteClaims - Atomic units
voiceNoteClaims: defineTable({
  claimId: v.string(),
  artifactId: v.id("voiceNoteArtifacts"),
  sourceText: v.string(),  // "John did well in training"
  timestampStart: v.optional(v.number()),
  timestampEnd: v.optional(v.number()),
  topic: v.union(
    v.literal("injury"),
    v.literal("wellbeing"),
    v.literal("performance"),
    ...
  ),
  entityMentions: v.array(v.object({
    mentionType: v.union(
      v.literal("player_name"),
      v.literal("team_name"),
      v.literal("group_reference")  // "the twins"
    ),
    rawText: v.string(),  // "Shawn"
    position: v.number()
  })),
  extractionConfidence: v.number(),
  status: v.union(...),
  createdAt: v.number()
});
```

### Claim Extraction Logic

Use GPT-4 to segment transcript into atomic claims:

**Prompt**:
```
Segment this coach's voice note into atomic claims (one per player/team mentioned):

Transcript: "John did well in training today but Sarah struggled with tackling"

Return JSON:
[
  {
    "sourceText": "John did well in training today",
    "topic": "performance",
    "entityMentions": [{ "mentionType": "player_name", "rawText": "John" }],
    "sentiment": "positive"
  },
  {
    "sourceText": "Sarah struggled with tackling",
    "topic": "performance",
    "entityMentions": [{ "mentionType": "player_name", "rawText": "Sarah" }],
    "sentiment": "concerned"
  }
]
```

**Reference**: `voice-notes-pipeline-v2.md` lines 255-330

---

## Phase 5: Entity Resolution & Disambiguation (4 days)

**Goal**: Resolve player mentions using fuzzy matching from Phase 1.

### New Table

```typescript
// voiceNoteEntityResolutions
voiceNoteEntityResolutions: defineTable({
  claimId: v.id("voiceNoteClaims"),
  mentionIndex: v.number(),
  rawText: v.string(),  // "Shawn"
  candidates: v.array(v.object({
    entityType: v.literal("player"),
    entityId: v.string(),  // playerIdentityId
    entityName: v.string(),  // "Seán O'Brien"
    score: v.number(),  // From Phase 1 fuzzy matching!
    matchReason: v.string()
  })),
  status: v.union(
    v.literal("auto_resolved"),  // Single high-confidence match
    v.literal("needs_disambiguation"),  // Multiple candidates
    v.literal("user_resolved"),
    v.literal("unresolved")
  ),
  resolvedEntityId: v.optional(v.string()),
  resolvedAt: v.optional(v.number())
});
```

### Resolution Flow

```typescript
// Resolve each entity mention in claims
for (const claim of claims) {
  for (const mention of claim.entityMentions) {
    if (mention.mentionType === "player_name") {
      // USE PHASE 1 FUZZY MATCHING!
      const candidates = await ctx.runQuery(
        api.models.orgPlayerEnrollments.findSimilarPlayers,
        {
          organizationId: claim.orgId,
          coachUserId: claim.coachId,
          searchName: mention.rawText,
          limit: 5
        }
      );

      // Auto-resolve if single high-confidence match
      if (candidates.length === 1 && candidates[0].similarity > 0.9) {
        status = "auto_resolved";
        resolvedEntityId = candidates[0].playerIdentityId;
      } else if (candidates.length > 1) {
        status = "needs_disambiguation";
      } else {
        status = "unresolved";
      }

      // Store resolution
      await ctx.db.insert("voiceNoteEntityResolutions", { ... });
    }
  }
}
```

**Reference**: `voice-notes-pipeline-v2.md` lines 332-379

---

## Phase 6: Drafts & Confirmation (5 days)

**Goal**: Create drafts instead of immediately applying insights.

### New Table

```typescript
// insightDrafts - Pending confirmation
insightDrafts: defineTable({
  draftId: v.string(),
  artifactId: v.id("voiceNoteArtifacts"),
  claimId: v.id("voiceNoteClaims"),
  playerIdentityId: v.optional(v.id("playerIdentities")),
  insightType: v.union(...),
  title: v.string(),
  description: v.string(),
  evidence: v.object({
    transcriptSnippet: v.string(),
    timestampStart: v.optional(v.number()),
    audioClipStorageId: v.optional(v.id("_storage"))
  }),
  aiConfidence: v.number(),
  resolutionConfidence: v.number(),
  overallConfidence: v.number(),
  requiresConfirmation: v.boolean(),
  status: v.union(
    v.literal("pending"),
    v.literal("confirmed"),
    v.literal("rejected"),
    v.literal("applied")
  ),
  createdAt: v.number()
});
```

### WhatsApp Confirmation Workflow

```
Coach sends voice note
         ↓
System: "✅ Got it. Transcribing..."
         ↓
System: "I captured 4 updates:
1. Ella - hamstring tightness
2. Aoife - felt anxious
3. Saoirse - missed training
4. 'The twins' - ❓ I'm not sure

Reply:
• CONFIRM 1,2,3 to save those
• TWINS = Emma & Niamh to identify
• CANCEL to discard"
         ↓
Coach: "CONFIRM 1,2,3 TWINS = Emma and Niamh U12"
         ↓
System: "✅ Saved 3 updates
✅ The twins = Emma & Niamh

Updated players: Ella, Aoife, Saoirse, Emma, Niamh"
```

**Reference**: `voice-notes-pipeline-v2.md` lines 872-918

---

## Feature Flag Evaluation

Phases 3-6 use a `featureFlags` table with cascading scope evaluation.

**IMPORTANT**: The original design referenced APIs that don't exist in this codebase:
- ~~`api.models.platformConfig.get`~~ — No platformConfig table exists
- ~~`api.models.organizations.getById`~~ — No such function (Better Auth manages organizations)
- ~~`api.models.coaches.getCoach`~~ — No such function (use member table)
- ~~`member.betaFeatures`~~ — No betaFeatures field on member table
- ~~`organization.settings.voiceNotesVersion`~~ — No such field

**Correct approach**: Create a `featureFlags` table following the `aiModelConfig` pattern
(see `packages/backend/convex/models/aiModelConfig.ts` for the feature/scope/org cascade).

```typescript
// packages/backend/convex/lib/featureFlags.ts
// This is an internalQuery — call via ctx.runQuery from actions

export const shouldUseV2Pipeline = internalQuery({
  args: {
    organizationId: v.string(),
    userId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // 1. Environment variable (global kill switch / enable)
    const envFlag = process.env.VOICE_NOTES_V2_GLOBAL;
    if (envFlag === "true") return true;
    if (envFlag === "false") return false;

    // 2. Platform-level flag
    const platformFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_featureKey_and_scope", (q) =>
        q.eq("featureKey", "voice_notes_v2").eq("scope", "platform")
      )
      .first();
    if (platformFlag) return platformFlag.enabled;

    // 3. Organization-level flag
    const orgFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_featureKey_scope_org", (q) =>
        q
          .eq("featureKey", "voice_notes_v2")
          .eq("scope", "organization")
          .eq("organizationId", args.organizationId)
      )
      .first();
    if (orgFlag) return orgFlag.enabled;

    // 4. User-level flag
    const userFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_featureKey_scope_user", (q) =>
        q
          .eq("featureKey", "voice_notes_v2")
          .eq("scope", "user")
          .eq("userId", args.userId)
      )
      .first();
    if (userFlag) return userFlag.enabled;

    // 5. Default to v1
    return false;
  },
});
```

---

## Migration Script (Optional)

```bash
# Bulk migrate all historical voice notes to v2
npm run migrate:voice-notes-to-v2

# What it does:
# - Creates artifacts from voiceNotes
# - Creates transcripts from voiceNotes.transcript
# - Creates claims from voiceNotes.insights (best effort)
# - Links everything via voiceNoteId
```

**Script Location**: `scripts/migrations/voice-notes-to-v2.ts`

---

## Testing Strategy

### Integration Tests (New)

```typescript
// __tests__/voiceNotesV2Pipeline.test.ts

describe("v2 Pipeline End-to-End", () => {
  it("should process WhatsApp message through v2 pipeline", async () => {
    // 1. Send message → creates artifact
    // 2. Transcribe → stores in transcripts table
    // 3. Extract claims → segments by player
    // 4. Resolve entities → uses Phase 1 fuzzy matching
    // 5. Create drafts → awaiting confirmation
    // 6. Confirm → applies to player records
  });
});
```

### Manual Testing

1. Enable v2 for test coach: Add `voice_notes_v2` to `betaFeatures`
2. Send voice note via WhatsApp mentioning 2 players
3. Verify claims created (2 separate records)
4. Verify entity resolution ran (candidates found)
5. Verify drafts created (not immediately applied)
6. Reply "CONFIRM 1,2" → verify drafts applied

---

## Success Criteria (Phases 3-6)

- ✅ v2 tables created and indexed
- ✅ Dual-path processing works (v1 and v2 coexist)
- ✅ Claims extraction segments by player
- ✅ Entity resolution uses Phase 1 fuzzy matching
- ✅ Disambiguation UI shows candidates
- ✅ Drafts require confirmation before applying
- ✅ WhatsApp commands work (CONFIRM, CANCEL, etc.)
- ✅ Migration script successfully migrates historical data
- ✅ Feature flags control rollout
- ✅ No regressions in v1 pipeline

---

## Rollout Strategy

1. **Week 3**: Phase 3 complete, v2 available for beta testers
2. **Week 4**: Phase 4 complete, claims extraction working
3. **Week 5**: Phase 5 complete, entity resolution integrated
4. **Week 6**: Phase 6 complete, full v2 pipeline operational
5. **Week 7-8**: Gradual rollout (10% → 50% → 100%)
6. **Week 9**: Deprecate v1 (optional, keep both if needed)

---

## Related Documentation

- **v2 Architecture**: `docs/architecture/voice-notes-pipeline-v2.md`
- **MCP Integration**: `docs/architecture/mcp-integration-plan.md`
- **Phase 1 Fuzzy Matching**: `PHASE1_QUALITY_GATES.md` (US-VN-005, US-VN-006)
- **Phase 2 Quick Review**: `PHASE2_MOBILE_REVIEW.md`
