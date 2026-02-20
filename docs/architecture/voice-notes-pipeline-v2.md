# Voice Notes Pipeline v2: Artifact → Claims → Drafts

## Executive Summary

This document proposes an evolution of PlayerARC's voice notes pipeline to properly handle:
- **Multiple players** in a single voice note
- **Multiple organizations** in a single message
- **Disambiguation** when player mentions are ambiguous
- **Draft-based workflow** with confirmation before committing

The pattern: **Artifact → Claims → Resolution → Drafts → Confirmation → Commit**

This is the foundation for the PlayerARC MCP Service.

---

## Current State vs. Target State

### Current Implementation (v1)

```
Voice Note (WhatsApp/App)
         ↓
    Store Audio
         ↓
    Transcribe (Whisper)
         ↓
    Extract Insights (GPT-4)
      - One array of insights
      - Player matching attempted
      - Confidence scores assigned
         ↓
    Auto-Apply (Trust-based)
      - Safe categories applied if TL2+
      - Sensitive categories need review
         ↓
    WhatsApp Reply (Summary)
```

**Limitations**:
1. Insights are extracted as a single pass - no claim segmentation
2. Unmatched players ("the twins") get stuck with no resolution workflow
3. Multi-org messages use heuristics (first match wins)
4. No confirmation step before apply
5. Auto-apply is immediate, not draft-based

### Target Implementation (v2)

```
Voice Note (WhatsApp/App/MCP)
         ↓
┌─────────────────────────────────────────────────────────┐
│              PHASE 1: ARTIFACT INGESTION                │
│                                                         │
│  Store as artifact with metadata:                       │
│  - artifact_id                                          │
│  - source_channel (whatsapp|app|mcp)                    │
│  - sender_user_id                                       │
│  - thread_context                                       │
│  - org_context_candidates                               │
│  - status: pending                                      │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│              PHASE 2: TRANSCRIPTION                     │
│                                                         │
│  Transcribe with timestamps:                            │
│  - Whisper with word-level timestamps                   │
│  - Store raw transcript + segments                      │
│  - status: transcribed                                  │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│              PHASE 3: CLAIM EXTRACTION                  │
│                                                         │
│  Segment into structured claims:                        │
│  - claim_id                                             │
│  - text (source utterance)                              │
│  - time_ref (today, yesterday, etc.)                    │
│  - topic (injury, wellbeing, performance, etc.)         │
│  - entity_mentions (player names, team refs)            │
│  - confidence                                           │
│  - timestamp_start, timestamp_end (from audio)          │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│              PHASE 4: ENTITY RESOLUTION                 │
│                                                         │
│  Resolve each mention:                                  │
│  - candidates with scores                               │
│  - context from thread/sender                           │
│  - needs_disambiguation flag                            │
│  - resolved_player_id (if confident)                    │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│              PHASE 5: ORG PARTITIONING                  │
│                                                         │
│  Partition by organization:                             │
│  - Check sender permissions per org                     │
│  - Group claims by org/team                             │
│  - Block unauthorized org references                    │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│              PHASE 6: DRAFT CREATION                    │
│                                                         │
│  Create InsightDrafts:                                  │
│  - draft_id                                             │
│  - player_id (if resolved)                              │
│  - org_id, team_id                                      │
│  - type (injury, performance, etc.)                     │
│  - content                                              │
│  - evidence (transcript + timestamps)                   │
│  - confidence                                           │
│  - requires_confirmation                                │
│  - status: pending                                      │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│              PHASE 7: CONFIRMATION                      │
│                                                         │
│  WhatsApp/App presents:                                 │
│  - List of drafts with details                          │
│  - Disambiguation prompts for unresolved                │
│  - Edit options                                         │
│  - CONFIRM / EDIT / CANCEL                              │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│              PHASE 8: COMMIT                            │
│                                                         │
│  On confirmation:                                       │
│  - Apply to player records                              │
│  - Create audit trail                                   │
│  - Queue parent summaries (if TL3)                      │
│  - Mark drafts as applied                               │
└─────────────────────────────────────────────────────────┘
```

---

## Schema Design

### 1. Voice Note Artifacts (Evolution of `voiceNotes`)

```typescript
// voiceNoteArtifacts - The raw audio/text artifact
voiceNoteArtifacts: defineTable({
  // Identity
  artifactId: v.string(),              // UUID

  // Source
  sourceChannel: v.union(
    v.literal("app_recorded"),
    v.literal("app_typed"),
    v.literal("whatsapp_audio"),
    v.literal("whatsapp_text"),
    v.literal("mcp")                   // New: via MCP API
  ),

  // Sender context
  senderUserId: v.string(),            // Better Auth user ID
  senderRole: v.union(
    v.literal("coach"),
    v.literal("parent"),
    v.literal("admin"),
    v.literal("player")
  ),

  // Thread context (for WhatsApp)
  threadId: v.optional(v.string()),    // WhatsApp chat/group ID
  threadType: v.optional(v.union(
    v.literal("individual"),
    v.literal("group")
  )),

  // Organization context candidates
  orgContextCandidates: v.array(v.object({
    orgId: v.string(),
    orgName: v.string(),
    confidence: v.number(),            // 0-1 based on sender memberships
    source: v.string(),                // "sender_membership", "thread_context", "explicit_mention"
  })),

  // Content
  mediaStorageId: v.optional(v.id("_storage")),  // Audio file
  textContent: v.optional(v.string()),           // For typed notes
  noteType: v.union(
    v.literal("training"),
    v.literal("match"),
    v.literal("general")
  ),

  // Processing status
  status: v.union(
    v.literal("received"),             // Just ingested
    v.literal("transcribing"),         // Transcription in progress
    v.literal("transcribed"),          // Transcription complete
    v.literal("extracting_claims"),    // Claim extraction in progress
    v.literal("claims_extracted"),     // Claims ready
    v.literal("resolving"),            // Entity resolution in progress
    v.literal("drafts_ready"),         // Ready for confirmation
    v.literal("awaiting_confirmation"),// Waiting on user
    v.literal("partially_confirmed"),  // Some drafts confirmed
    v.literal("completed"),            // All drafts processed
    v.literal("failed"),               // Processing failed
    v.literal("cancelled")             // User cancelled
  ),

  // Timestamps
  receivedAt: v.number(),
  transcribedAt: v.optional(v.number()),
  claimsExtractedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),

  // Error tracking
  lastError: v.optional(v.string()),
  retryCount: v.optional(v.number()),
})
.index("by_sender", ["senderUserId"])
.index("by_status", ["status"])
.index("by_thread", ["threadId"]);
```

### 2. Transcripts (New table for detailed transcription)

```typescript
// voiceNoteTranscripts - Detailed transcription with segments
voiceNoteTranscripts: defineTable({
  artifactId: v.id("voiceNoteArtifacts"),

  // Full transcript
  fullText: v.string(),

  // Word-level or segment-level timestamps
  segments: v.array(v.object({
    text: v.string(),
    startTime: v.number(),             // Seconds from start
    endTime: v.number(),
    confidence: v.number(),            // Whisper confidence
  })),

  // Metadata
  modelUsed: v.string(),               // "whisper-1", "deepgram-nova-3"
  language: v.string(),                // Detected language
  duration: v.number(),                // Audio duration in seconds

  createdAt: v.number(),
})
.index("by_artifact", ["artifactId"]);
```

### 3. Claims (New table - the atomic units)

```typescript
// voiceNoteClaims - Structured claims extracted from transcript
voiceNoteClaims: defineTable({
  claimId: v.string(),                 // UUID
  artifactId: v.id("voiceNoteArtifacts"),

  // Source
  sourceText: v.string(),              // The utterance this claim comes from
  timestampStart: v.optional(v.number()),
  timestampEnd: v.optional(v.number()),

  // Structured content
  topic: v.union(
    v.literal("injury"),
    v.literal("wellbeing"),
    v.literal("performance"),
    v.literal("attendance"),
    v.literal("skill"),
    v.literal("behavior"),
    v.literal("team_culture"),
    v.literal("todo"),
    v.literal("general")
  ),

  // Time reference
  timeReference: v.optional(v.string()), // "today", "yesterday", "last week"
  timeResolved: v.optional(v.string()),  // Resolved to ISO date

  // Entity mentions (raw, before resolution)
  entityMentions: v.array(v.object({
    mentionType: v.union(
      v.literal("player_name"),
      v.literal("player_nickname"),
      v.literal("player_number"),
      v.literal("team_name"),
      v.literal("group_reference"),    // "the twins", "the defenders"
      v.literal("coach_name")
    ),
    rawText: v.string(),               // As spoken
    position: v.number(),              // Character position in sourceText
  })),

  // Extracted details
  severity: v.optional(v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("critical")
  )),
  sentiment: v.optional(v.union(
    v.literal("positive"),
    v.literal("neutral"),
    v.literal("negative"),
    v.literal("concerned")
  )),

  // AI confidence
  extractionConfidence: v.number(),    // 0-1

  // Status
  status: v.union(
    v.literal("extracted"),
    v.literal("resolving"),
    v.literal("resolved"),
    v.literal("needs_disambiguation"),
    v.literal("merged"),               // Combined with another claim
    v.literal("discarded")             // Deemed irrelevant
  ),

  createdAt: v.number(),
})
.index("by_artifact", ["artifactId"])
.index("by_topic", ["topic"])
.index("by_status", ["status"]);
```

### 4. Entity Resolutions (New table)

```typescript
// voiceNoteEntityResolutions - Player/team resolution per mention
voiceNoteEntityResolutions: defineTable({
  claimId: v.id("voiceNoteClaims"),
  mentionIndex: v.number(),            // Which mention in the claim

  // The raw mention
  rawText: v.string(),
  mentionType: v.string(),

  // Resolution candidates
  candidates: v.array(v.object({
    entityType: v.union(
      v.literal("player"),
      v.literal("team"),
      v.literal("coach")
    ),
    entityId: v.string(),              // playerIdentityId, teamId, etc.
    entityName: v.string(),            // Full name for display
    orgId: v.string(),
    teamId: v.optional(v.string()),
    score: v.number(),                 // 0-1 confidence
    matchReason: v.string(),           // "exact_name", "nickname", "recent_context"
  })),

  // Resolution status
  status: v.union(
    v.literal("auto_resolved"),        // Single high-confidence match
    v.literal("needs_disambiguation"), // Multiple candidates
    v.literal("user_resolved"),        // User picked from candidates
    v.literal("unresolved"),           // No candidates found
    v.literal("new_entity")            // User indicated new player
  ),

  // Resolved entity
  resolvedEntityId: v.optional(v.string()),
  resolvedEntityType: v.optional(v.string()),
  resolvedOrgId: v.optional(v.string()),
  resolvedAt: v.optional(v.number()),
  resolvedBy: v.optional(v.string()),  // userId if user resolved

  createdAt: v.number(),
})
.index("by_claim", ["claimId"])
.index("by_status", ["status"]);
```

### 5. Insight Drafts (New table - replaces embedded insights)

```typescript
// insightDrafts - Pending insights awaiting confirmation
insightDrafts: defineTable({
  draftId: v.string(),                 // UUID
  artifactId: v.id("voiceNoteArtifacts"),
  claimId: v.id("voiceNoteClaims"),

  // Target
  playerIdentityId: v.optional(v.id("playerIdentities")),
  playerName: v.optional(v.string()),
  teamId: v.optional(v.string()),
  teamName: v.optional(v.string()),
  orgId: v.string(),

  // Content
  insightType: v.union(
    v.literal("injury"),
    v.literal("wellbeing"),
    v.literal("performance"),
    v.literal("attendance"),
    v.literal("skill_rating"),
    v.literal("skill_progress"),
    v.literal("behavior"),
    v.literal("team_culture"),
    v.literal("todo")
  ),
  title: v.string(),
  description: v.string(),
  recommendedAction: v.optional(v.string()),

  // Evidence
  evidence: v.object({
    transcriptSnippet: v.string(),
    timestampStart: v.optional(v.number()),
    timestampEnd: v.optional(v.number()),
    audioClipStorageId: v.optional(v.id("_storage")),
  }),

  // Confidence
  aiConfidence: v.number(),            // From claim extraction
  resolutionConfidence: v.number(),    // From entity resolution
  overallConfidence: v.number(),       // Combined score

  // Confirmation
  requiresConfirmation: v.boolean(),   // Based on confidence + topic
  confirmationReason: v.optional(v.string()), // Why confirmation needed

  // Status
  status: v.union(
    v.literal("pending"),              // Awaiting confirmation
    v.literal("confirmed"),            // User confirmed
    v.literal("edited"),               // User edited before confirming
    v.literal("rejected"),             // User rejected
    v.literal("auto_applied"),         // Applied without confirmation (high trust)
    v.literal("applied"),              // Confirmed and applied
    v.literal("failed")                // Application failed
  ),

  // User actions
  confirmedAt: v.optional(v.number()),
  confirmedBy: v.optional(v.string()),
  editedContent: v.optional(v.object({
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    playerIdentityId: v.optional(v.id("playerIdentities")),
  })),
  rejectionReason: v.optional(v.string()),

  // Application
  appliedAt: v.optional(v.number()),
  appliedToRecordId: v.optional(v.string()), // Skill assessment ID, etc.
  appliedToTable: v.optional(v.string()),    // Target table

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_artifact", ["artifactId"])
.index("by_player", ["playerIdentityId"])
.index("by_org", ["orgId"])
.index("by_status", ["status"])
.index("by_requires_confirmation", ["requiresConfirmation"]);
```

### 6. Org Partitions (New table)

```typescript
// voiceNoteOrgPartitions - Claims grouped by org
voiceNoteOrgPartitions: defineTable({
  artifactId: v.id("voiceNoteArtifacts"),
  orgId: v.string(),
  orgName: v.string(),

  // Claims in this partition
  claimIds: v.array(v.id("voiceNoteClaims")),

  // Authorization
  senderHasPermission: v.boolean(),    // Sender is member of this org
  senderRole: v.optional(v.string()),  // Role in this org

  // Status
  status: v.union(
    v.literal("authorized"),           // Ready to process
    v.literal("pending_authorization"),// Sender not confirmed for org
    v.literal("blocked")               // Sender has no access
  ),

  createdAt: v.number(),
})
.index("by_artifact", ["artifactId"])
.index("by_org", ["orgId"]);
```

---

## MCP Tool Schema for v1

Based on the pipeline phases, here's the granular MCP tool schema:

### Audio & Extraction Tools

```typescript
// MCP Tool: ingest_voice_artifact
{
  name: "ingest_voice_artifact",
  description: "Ingest a voice note artifact (audio URL or text) for processing",
  inputSchema: {
    type: "object",
    properties: {
      mediaUrl: { type: "string", description: "URL to audio file" },
      textContent: { type: "string", description: "Text content (for typed notes)" },
      noteType: { enum: ["training", "match", "general"] },
      threadContext: {
        type: "object",
        properties: {
          threadId: { type: "string" },
          threadType: { enum: ["individual", "group"] }
        }
      }
    },
    required: ["noteType"]
  },
  returns: {
    artifactId: "string",
    status: "string"
  }
}

// MCP Tool: transcribe_artifact
{
  name: "transcribe_artifact",
  description: "Transcribe an audio artifact",
  inputSchema: {
    type: "object",
    properties: {
      artifactId: { type: "string" }
    },
    required: ["artifactId"]
  },
  returns: {
    transcriptId: "string",
    fullText: "string",
    segmentCount: "number",
    duration: "number"
  }
}

// MCP Tool: extract_claims
{
  name: "extract_claims",
  description: "Extract structured claims from a transcript",
  inputSchema: {
    type: "object",
    properties: {
      artifactId: { type: "string" }
    },
    required: ["artifactId"]
  },
  returns: {
    claims: [{
      claimId: "string",
      sourceText: "string",
      topic: "string",
      entityMentions: [{ mentionType: "string", rawText: "string" }],
      confidence: "number"
    }]
  }
}
```

### Resolution Tools

```typescript
// MCP Tool: resolve_player_mentions
{
  name: "resolve_player_mentions",
  description: "Resolve player mentions in claims to player records",
  inputSchema: {
    type: "object",
    properties: {
      artifactId: { type: "string" },
      includeTeamContext: { type: "boolean", default: true },
      includeRecentHistory: { type: "boolean", default: true }
    },
    required: ["artifactId"]
  },
  returns: {
    resolutions: [{
      claimId: "string",
      mentionText: "string",
      status: "string",
      candidates: [{
        playerId: "string",
        playerName: "string",
        score: "number"
      }],
      needsDisambiguation: "boolean"
    }]
  }
}

// MCP Tool: disambiguate_mention
{
  name: "disambiguate_mention",
  description: "Provide disambiguation for an ambiguous player mention",
  inputSchema: {
    type: "object",
    properties: {
      claimId: { type: "string" },
      mentionIndex: { type: "number" },
      resolvedPlayerId: { type: "string" },
      // Or for group references:
      resolvedPlayerIds: { type: "array", items: { type: "string" } }
    },
    required: ["claimId", "mentionIndex"]
  }
}

// MCP Tool: partition_by_org
{
  name: "partition_by_org",
  description: "Partition resolved claims by organization",
  inputSchema: {
    type: "object",
    properties: {
      artifactId: { type: "string" }
    },
    required: ["artifactId"]
  },
  returns: {
    partitions: [{
      orgId: "string",
      orgName: "string",
      claimCount: "number",
      authorized: "boolean"
    }]
  }
}
```

### Draft & Commit Tools

```typescript
// MCP Tool: create_insight_drafts
{
  name: "create_insight_drafts",
  description: "Create insight drafts from resolved claims",
  inputSchema: {
    type: "object",
    properties: {
      artifactId: { type: "string" },
      orgId: { type: "string", description: "Filter to specific org (optional)" }
    },
    required: ["artifactId"]
  },
  returns: {
    drafts: [{
      draftId: "string",
      playerName: "string",
      insightType: "string",
      title: "string",
      confidence: "number",
      requiresConfirmation: "boolean"
    }]
  }
}

// MCP Tool: get_drafts_for_confirmation
{
  name: "get_drafts_for_confirmation",
  description: "Get formatted drafts ready for user confirmation",
  inputSchema: {
    type: "object",
    properties: {
      artifactId: { type: "string" },
      format: { enum: ["detailed", "summary", "whatsapp_friendly"] }
    },
    required: ["artifactId"]
  },
  returns: {
    formattedMessage: "string",
    draftsCount: "number",
    needsDisambiguation: [{ mentionText: "string", candidates: [] }]
  }
}

// MCP Tool: confirm_drafts
{
  name: "confirm_drafts",
  description: "Confirm specific insight drafts for application",
  inputSchema: {
    type: "object",
    properties: {
      draftIds: { type: "array", items: { type: "string" } },
      confirmAll: { type: "boolean", default: false }
    },
    required: []
  },
  returns: {
    confirmed: "number",
    applied: "number",
    failed: [{
      draftId: "string",
      reason: "string"
    }]
  }
}

// MCP Tool: edit_draft
{
  name: "edit_draft",
  description: "Edit a draft before confirmation",
  inputSchema: {
    type: "object",
    properties: {
      draftId: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      playerId: { type: "string" },
      insightType: { type: "string" }
    },
    required: ["draftId"]
  }
}

// MCP Tool: reject_drafts
{
  name: "reject_drafts",
  description: "Reject insight drafts",
  inputSchema: {
    type: "object",
    properties: {
      draftIds: { type: "array", items: { type: "string" } },
      reason: { type: "string" }
    },
    required: ["draftIds"]
  }
}
```

### Read-Only Query Tools

```typescript
// MCP Tool: get_player_overview_for_parent
{
  name: "get_player_overview_for_parent",
  description: "Get parent-appropriate player overview",
  inputSchema: {
    type: "object",
    properties: {
      playerId: { type: "string" }
    },
    required: ["playerId"]
  },
  returns: {
    playerName: "string",
    recentHighlights: [],
    upcomingFixtures: [],
    developmentGoals: [],
    // Note: Excludes sensitive coach notes
  }
}

// MCP Tool: get_team_fixtures
{
  name: "get_team_fixtures",
  description: "Get upcoming fixtures for a team",
  inputSchema: {
    type: "object",
    properties: {
      teamId: { type: "string" },
      dateRange: {
        type: "object",
        properties: {
          from: { type: "string", format: "date" },
          to: { type: "string", format: "date" }
        }
      }
    },
    required: ["teamId"]
  }
}

// MCP Tool: get_wellbeing_flags_summary
{
  name: "get_wellbeing_flags_summary",
  description: "Get summary of wellbeing flags for coach's teams",
  inputSchema: {
    type: "object",
    properties: {
      coachId: { type: "string" },
      includeResolved: { type: "boolean", default: false }
    },
    required: ["coachId"]
  },
  returns: {
    activeFlags: [{
      playerId: "string",
      playerName: "string",
      flagType: "string",
      severity: "string",
      lastUpdated: "string"
    }],
    count: "number"
  }
}
```

### Guardrail Tools

```typescript
// MCP Tool: check_consent_status
{
  name: "check_consent_status",
  description: "Check if actor has consent to access/contact an entity",
  inputSchema: {
    type: "object",
    properties: {
      actorId: { type: "string" },
      targetPlayerId: { type: "string" },
      actionType: { enum: ["view", "update", "message_parent"] }
    },
    required: ["actorId", "targetPlayerId", "actionType"]
  },
  returns: {
    hasConsent: "boolean",
    consentType: "string",
    restrictions: []
  }
}

// MCP Tool: get_allowed_topics_for_role
{
  name: "get_allowed_topics_for_role",
  description: "Get topics this role is allowed to discuss/update",
  inputSchema: {
    type: "object",
    properties: {
      role: { enum: ["coach", "parent", "player", "admin"] },
      orgId: { type: "string" }
    },
    required: ["role"]
  },
  returns: {
    canRead: ["string"],
    canWrite: ["string"],
    restricted: ["string"]
  }
}

// MCP Tool: flag_safeguarding_concern
{
  name: "flag_safeguarding_concern",
  description: "Flag content for safeguarding review (does not auto-process)",
  inputSchema: {
    type: "object",
    properties: {
      artifactId: { type: "string" },
      claimId: { type: "string" },
      concernType: { type: "string" },
      urgency: { enum: ["routine", "urgent", "immediate"] }
    },
    required: ["artifactId", "concernType"]
  }
}
```

---

## WhatsApp Confirmation Flow

When a coach sends a voice note mentioning multiple players:

### Step 1: Instant Ack
```
Coach → WhatsApp: [Voice note]
System → WhatsApp: "✅ Got it. Transcribing..."
```

### Step 2: Processing Complete
```
System → WhatsApp:
"I captured 4 updates from your voice note:

1. Ella (U14 Grange) – hamstring tightness during warm-up today
2. Aoife (U14 Grange) – felt anxious before match; improved after half-time
3. Saoirse (School team) – missed training due to exam stress
4. 'The twins' – ❓ I'm not sure which players you meant

Reply:
• CONFIRM 1,2,3 to save those
• TWINS = Emma & Niamh to identify the twins
• EDIT 2: ... to change an entry
• CANCEL to discard all"
```

### Step 3: User Response
```
Coach → WhatsApp: "CONFIRM 1,2,3 TWINS = Emma and Niamh U12"
```

### Step 4: Resolution & Confirmation
```
System → WhatsApp:
"✅ Saved 3 updates
✅ The twins = Emma O'Brien & Niamh Kelly (U12)

Updated players:
• Ella – injury note added
• Aoife – wellbeing note added
• Saoirse – attendance note added
• Emma & Niamh – positive note added

View in PlayerARC: [link]"
```

---

## Migration Strategy

### Phase 1: Parallel Operation
- Keep existing `voiceNotes` table working
- Add new tables alongside
- New WhatsApp messages go through v2 pipeline
- App continues using v1

### Phase 2: Feature Flag Rollout
- Enable v2 pipeline for 10% of coaches
- Monitor for issues
- Gradually increase

### Phase 3: Full Migration
- Migrate historical insights to draft format
- Deprecate v1 pipeline
- Remove legacy code

### Data Migration

```sql
-- Conceptual migration: voiceNotes.insights → insightDrafts
INSERT INTO insightDrafts (
  draftId,
  artifactId,
  playerIdentityId,
  insightType,
  title,
  description,
  status,
  appliedAt,
  ...
)
SELECT
  insight.id,
  voiceNote._id,
  insight.playerIdentityId,
  insight.category,
  insight.title,
  insight.description,
  CASE
    WHEN insight.status = 'applied' THEN 'applied'
    WHEN insight.status = 'auto_applied' THEN 'auto_applied'
    ELSE 'pending'
  END,
  insight.appliedAt,
  ...
FROM voiceNotes
CROSS JOIN UNNEST(voiceNotes.insights) AS insight
```

---

## Answers to Context Questions

### Q: WhatsApp messages - 1:1 or group chats?

**Current State**: 1:1 only (coach to PlayerARC number)

**Planned**: Group chat support via `whatsapp-coach-groups.md` spec

**Impact on v2 Pipeline**:
- Group messages have additional context (multiple senders)
- Thread ID becomes critical for context
- Entity resolution can use group membership for disambiguation

### Q: How is "org" modeled?

**PlayerARC Org Model**:
```
Organization (Better Auth)
├── Can be: Club, School, Academy, etc.
├── Multiple per user allowed
├── Each has own teams, players, coaches
└── Strict data isolation between orgs

User Memberships:
├── Coach at Grange GAA (org1)
├── Coach at Local School (org2)
└── Parent at Academy (org3)

Team Structure:
├── U14 Grange (org: Grange GAA, sport: GAA)
├── School Team (org: Local School, sport: soccer)
└── Academy Select (org: Academy, sport: GAA)
```

**Multi-Org Voice Note Handling**:
1. Extract org mentions from transcript
2. Check sender has membership in each mentioned org
3. Partition claims by org
4. Process each partition independently
5. Create drafts scoped to correct org

---

## Conclusion

The v2 pipeline transforms voice notes from a "transcribe and guess" system to a **robust, auditable, multi-entity workflow**.

Key improvements:
1. **Claims** as atomic units enable proper multi-player handling
2. **Entity resolution** with disambiguation prevents wrong attribution
3. **Org partitioning** respects multi-tenant boundaries
4. **Drafts** enable confirmation before any writes
5. **MCP tools** are granular, safe, and composable

This foundation supports:
- WhatsApp (current)
- Web app (current)
- MCP agents (future)
- Voice assistants (future)
- Bulk imports (future)

All through the same pipeline with consistent policies.
