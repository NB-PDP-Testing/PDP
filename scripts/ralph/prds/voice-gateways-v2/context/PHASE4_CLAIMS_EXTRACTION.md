# Phase 4: Claims Extraction - Implementation Guide

**Duration**: 3 days (US-VN-015 + US-VN-016)
**Dependencies**: Phase 3 complete (voiceNoteArtifacts, voiceNoteTranscripts, featureFlags all exist)
**Primary Branch**: feat/voice-gateways-v2

---

## Overview

Phase 4 segments voice note transcripts into **atomic claims** -- one per entity mention, 15 topic categories. Claims run IN PARALLEL with v1 `buildInsights` (no regression). Claims are the v2 data structure that Phase 5 (entity resolution) and Phase 6 (drafts) build upon.

---

## Architecture: How Claims Fit Into the Pipeline

```
WhatsApp Message
    |
    v
processIncomingMessage (whatsapp.ts)
    |-- v2 path: create artifact + v1 voiceNote
    |-- v1 path: create voiceNote only
    |
    v
transcribeAudio (voiceNotes.ts)
    |-- Update v1 voiceNote with transcript
    |-- If artifact exists: store v2 transcript, set artifact status = "transcribed"
    |
    v  (BOTH run in parallel after "transcribed")
    |
    |-----> buildInsights (voiceNotes.ts line 280-286)  [v1, UNCHANGED]
    |           |-> Creates insights[] embedded in voiceNote
    |           |-> Triggers auto-apply, parent summaries, review link
    |
    |-----> extractClaims (claimsExtraction.ts)  [v2, NEW - Phase 4]
                |-> Creates atomic claims in voiceNoteClaims table
                |-> Best-effort player/team resolution
                |-> Phase 5 will re-process for disambiguation
```

**Key Points:**
- Claims extraction is scheduled at voiceNotes.ts line ~257 (after artifact status set to "transcribed")
- buildInsights is scheduled at voiceNotes.ts line 280-286 (after quality check passes)
- They run independently -- claims extraction failure does NOT affect v1
- Only fires when an artifact exists (v2-enabled coaches only)

---

## 15 Claim Topic Categories

| # | Topic | Scope | What It Captures | Example |
|---|-------|-------|-----------------|---------|
| 1 | `injury` | Player | Physical injuries, knocks, strains | "Niamh hurt her ankle in training" |
| 2 | `skill_rating` | Player | Specific numeric rating | "I'd give Clodagh's hand_pass a 4 out of 5" |
| 3 | `skill_progress` | Player | General skill improvement (no numbers) | "Sarah's tackling has really improved" |
| 4 | `behavior` | Player | Attitude, effort, teamwork, discipline | "Great effort from the new lad today" |
| 5 | `performance` | Player | Match/training performance | "Ella was outstanding in the match" |
| 6 | `attendance` | Player | Presence/absence at sessions | "Aoife missed training again" |
| 7 | `wellbeing` | Player | Mental health, stress, anxiety | "Saoirse seemed anxious before the game" |
| 8 | `recovery` | Player | Rehab progress, return-to-play | "Niamh's ankle is healing well, should be back next week" |
| 9 | `development_milestone` | Player | Achievements, selections, personal bests | "Clodagh made the county panel" |
| 10 | `physical_development` | Player | Growth, conditioning, fitness | "Big growth spurt for the Doyle lad" |
| 11 | `parent_communication` | Player | Things to discuss with parents | "Need to chat with Ella's mam about the physio" |
| 12 | `tactical` | Player/Team | Position changes, formations | "Moving Sinead to centre-back" |
| 13 | `team_culture` | Team | Team morale, collective behavior | "Great spirit in training tonight" |
| 14 | `todo` | Coach | Action items, equipment, scheduling | "I need to book the pitch for Saturday" |
| 15 | `session_plan` | Team/None | Training focus areas, drill ideas | "Focus on tackling drills next session" |

**vs v1 Categories**: v1 has 7 categories (injury, skill_rating, skill_progress, behavior, performance, attendance, team_culture, todo). Phase 4 adds 8 new categories: wellbeing, recovery, development_milestone, physical_development, parent_communication, tactical, session_plan. This gives richer categorization for Phase 5-6 workflows.

---

## US-VN-015: Schema, Model, Helper, and Extraction Action

### 1. Schema Addition

Add to `packages/backend/convex/schema.ts` AFTER the `voiceNoteTranscripts` table (line ~4220) and BEFORE `platformStaffInvitations` (line ~4222):

```typescript
// ============================================================
// VOICE NOTE CLAIMS (v2 Pipeline)
// Atomic claims extracted from transcripts, one per entity mention
// 15 topic categories, best-effort entity resolution
// ============================================================
voiceNoteClaims: defineTable({
  claimId: v.string(), // UUID, unique per claim
  artifactId: v.id("voiceNoteArtifacts"),
  sourceText: v.string(), // Exact transcript quote
  timestampStart: v.optional(v.number()),
  timestampEnd: v.optional(v.number()),
  topic: v.union(
    v.literal("injury"),
    v.literal("skill_rating"),
    v.literal("skill_progress"),
    v.literal("behavior"),
    v.literal("performance"),
    v.literal("attendance"),
    v.literal("wellbeing"),
    v.literal("recovery"),
    v.literal("development_milestone"),
    v.literal("physical_development"),
    v.literal("parent_communication"),
    v.literal("tactical"),
    v.literal("team_culture"),
    v.literal("todo"),
    v.literal("session_plan")
  ),
  title: v.string(),
  description: v.string(),
  recommendedAction: v.optional(v.string()),
  timeReference: v.optional(v.string()), // "today", "yesterday", "last week"

  entityMentions: v.array(
    v.object({
      mentionType: v.union(
        v.literal("player_name"),
        v.literal("team_name"),
        v.literal("group_reference"),
        v.literal("coach_name")
      ),
      rawText: v.string(),
      position: v.number(),
    })
  ),

  // Best-effort resolved entities
  resolvedPlayerIdentityId: v.optional(v.id("playerIdentities")),
  resolvedPlayerName: v.optional(v.string()),
  resolvedTeamId: v.optional(v.string()),
  resolvedTeamName: v.optional(v.string()),
  resolvedAssigneeUserId: v.optional(v.string()),
  resolvedAssigneeName: v.optional(v.string()),

  // Topic-specific metadata
  severity: v.optional(
    v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    )
  ),
  sentiment: v.optional(
    v.union(
      v.literal("positive"),
      v.literal("neutral"),
      v.literal("negative"),
      v.literal("concerned")
    )
  ),
  skillName: v.optional(v.string()), // skill_rating only
  skillRating: v.optional(v.number()), // skill_rating only (1-5)

  extractionConfidence: v.number(), // 0.0-1.0
  organizationId: v.string(), // Denormalized from artifact
  coachUserId: v.string(), // Denormalized from artifact

  status: v.union(
    v.literal("extracted"),
    v.literal("resolving"),
    v.literal("resolved"),
    v.literal("needs_disambiguation"),
    v.literal("merged"),
    v.literal("discarded"),
    v.literal("failed")
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_artifactId", ["artifactId"])
  .index("by_artifactId_and_status", ["artifactId", "status"])
  .index("by_claimId", ["claimId"])
  .index("by_topic", ["topic"])
  .index("by_org_and_coach", ["organizationId", "coachUserId"])
  .index("by_org_and_status", ["organizationId", "status"])
  .index("by_resolvedPlayerIdentityId", ["resolvedPlayerIdentityId"]),
```

After adding, run: `npx -w packages/backend convex codegen`

### 2. Model File: `packages/backend/convex/models/voiceNoteClaims.ts`

Create this file with 6 functions. Follow the pattern in `voiceNoteArtifacts.ts`:

**Functions:**

1. **`storeClaims`** (internalMutation) -- Batch insert claims
   - Args: `{ claims: v.array(v.object({ ...all fields... })) }`
   - Returns: `v.array(v.id("voiceNoteClaims"))`
   - Loop through claims array, insert each, collect IDs

2. **`getClaimsByArtifact`** (internalQuery) -- All claims for an artifact
   - Args: `{ artifactId: v.id("voiceNoteArtifacts") }`
   - Returns: array of full claim objects
   - Use `.withIndex("by_artifactId", q => q.eq("artifactId", args.artifactId)).collect()`

3. **`getClaimsByArtifactAndStatus`** (internalQuery) -- Filtered by status
   - Args: `{ artifactId: v.id("voiceNoteArtifacts"), status: statusValidator }`
   - Returns: array of claim objects
   - Use `.withIndex("by_artifactId_and_status", q => q.eq("artifactId", args.artifactId).eq("status", args.status)).collect()`

4. **`updateClaimStatus`** (internalMutation) -- Update a claim's status
   - Args: `{ claimId: v.string(), status: statusValidator }`
   - Returns: `v.null()`
   - Look up by `.withIndex("by_claimId")`, patch status + updatedAt

5. **`getClaimByClaimId`** (internalQuery) -- Single claim lookup
   - Args: `{ claimId: v.string() }`
   - Returns: `v.union(claimObject, v.null())`
   - Use `.withIndex("by_claimId").first()`

6. **`getClaimsByOrgAndCoach`** (PUBLIC query) -- For claims viewer
   - Args: `{ organizationId: v.string(), coachUserId: v.string(), limit: v.optional(v.number()) }`
   - Returns: array of claim objects
   - Use `.withIndex("by_org_and_coach")`, take up to limit (default 50, max 200)

**IMPORTANT**: Define shared validators at the top of the file (topicValidator, statusValidator, sentimentValidator, severityValidator, entityMentionValidator) to reuse in both args and returns validators. Follow the pattern in voiceNoteArtifacts.ts where `sourceChannelValidator` and `statusValidator` are defined at module scope.

### 3. Helper: `packages/backend/convex/lib/coachContext.ts`

Extract the coach context gathering logic from `voiceNotes.ts` buildInsights (lines 340-471). This avoids duplicating 130+ lines of code.

```typescript
/**
 * Shared coach context gathering for AI processing.
 * Extracts roster, teams, and coaches for a given coach in an org.
 *
 * Used by:
 * - v2 claimsExtraction.ts (Phase 4)
 * - v1 buildInsights can optionally refactor to use this (future)
 */

import { api, components, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

// Type definitions
type PlayerInfo = {
  playerIdentityId: Id<"playerIdentities">;
  firstName: string;
  lastName: string;
  fullName: string;
  ageGroup: string;
  sport: string;
};

type TeamInfo = {
  id: string;
  name: string;
  ageGroup?: string;
  sport?: string;
};

type CoachInfo = {
  id: string;
  name: string;
};

type CoachContext = {
  players: PlayerInfo[];
  teams: TeamInfo[];
  coaches: CoachInfo[];
  recordingCoachName: string;
  rosterJson: string; // Pre-formatted JSON for AI prompt
  teamsJson: string;
  coachesJson: string;
};
```

**IMPORTANT**: Since this will be called from an internalAction (which has no ctx.db), wrap it as an **internalQuery** that returns the full context object. The action calls it via `ctx.runQuery(internal.lib.coachContext.gatherCoachContext, { organizationId, coachUserId })`.

**Logic** (port from voiceNotes.ts lines 340-471):
1. Fetch players via `getPlayersForCoachTeamsInternal` (line 342-351)
2. Fetch coach teams via `api.models.coaches.getCoachAssignments` (line 354-359)
3. Resolve team details from Better Auth adapter (line 362-393)
4. Get recording coach name via `components.betterAuth.userFunctions.getUserByStringId` (line 400-424)
5. Fetch fellow coaches via `api.models.coaches.getFellowCoachesForTeams` (line 430-448)
6. Deduplicate players by playerIdentityId (line 452-456)
7. Format roster/teams/coaches as JSON strings for AI prompt (line 458-471)

### 4. Extraction Action: `packages/backend/convex/actions/claimsExtraction.ts`

```typescript
"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
```

**Zod Schema** (`claimsExtractionSchema`):

```typescript
const claimsExtractionSchema = z.object({
  summary: z.string().describe("Brief summary of the entire voice note"),
  claims: z.array(
    z.object({
      sourceText: z.string().describe("Exact quote from transcript"),
      topic: z.enum([
        "injury", "skill_rating", "skill_progress", "behavior",
        "performance", "attendance", "wellbeing", "recovery",
        "development_milestone", "physical_development",
        "parent_communication", "tactical", "team_culture",
        "todo", "session_plan"
      ]),
      title: z.string().describe("Short descriptive title"),
      description: z.string().describe("Detailed description"),
      recommendedAction: z.string().optional(),
      timeReference: z.string().optional(),
      entityMentions: z.array(z.object({
        mentionType: z.enum(["player_name", "team_name", "group_reference", "coach_name"]),
        rawText: z.string(),
        position: z.number()
      })),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      sentiment: z.enum(["positive", "neutral", "negative", "concerned"]).optional(),
      skillName: z.string().optional(),
      skillRating: z.number().min(1).max(5).optional(),
      extractionConfidence: z.number().min(0).max(1),
      // AI's best guess from roster (for player resolution)
      playerId: z.string().nullable().optional(),
      playerName: z.string().nullable().optional(),
      teamId: z.string().nullable().optional(),
      teamName: z.string().nullable().optional(),
      assigneeUserId: z.string().nullable().optional(),
      assigneeName: z.string().nullable().optional(),
    })
  ),
});
```

**extractClaims handler** (10 steps):

```
1. Get artifact doc: ctx.runQuery(internal.models.voiceNoteArtifacts.getArtifactById, { _id: args.artifactId })
   - IMPORTANT: Need to add getArtifactById to voiceNoteArtifacts.ts (takes Convex _id, not string artifactId)
2. Set artifact status to "processing"
3. Get transcript: ctx.runQuery(internal.models.voiceNoteTranscripts.getTranscriptByArtifact, { artifactId: args.artifactId })
4. Determine org: artifact.orgContextCandidates sorted by confidence, take [0].organizationId
5. Gather coach context: ctx.runQuery(internal.lib.coachContext.gatherCoachContext, { organizationId, coachUserId: artifact.senderUserId })
6. Build system prompt (see below)
7. Get AI model config (getAIConfig pattern, feature: "voice_insights")
8. Call OpenAI with zodTextFormat(claimsExtractionSchema)
9. Parse + resolve players (deterministic first, fuzzy fallback)
10. Store claims via ctx.runMutation(internal.models.voiceNoteClaims.storeClaims, { claims: [...] })
11. Set artifact status to "completed"
```

**Error handling**: try/catch around entire handler. On error: set artifact status to "failed", log error. v1 pipeline is completely unaffected.

### 5. GPT-4 System Prompt Template

The prompt MUST cover all 15 categories. Port the matching instructions from v1 buildInsights (voiceNotes.ts lines 486-604) and extend with the 8 new categories:

```
You are an expert sports coaching assistant that analyzes coach voice notes and extracts atomic claims.

CRITICAL RULES:
1. ONE CLAIM per entity mention. If "John and Sarah both played well", that's TWO claims.
2. Claims must be ATOMIC - each captures ONE observation about ONE entity (player/team/coach).
3. sourceText must be the EXACT transcript quote for that specific claim.

CATEGORIZATION (15 topics):
- injury: Physical injuries, knocks, strains (PLAYER-SPECIFIC, set severity)
- skill_rating: Specific numeric rating/score for a skill (PLAYER-SPECIFIC, set skillName + skillRating 1-5)
- skill_progress: General skill improvement without numbers (PLAYER-SPECIFIC)
- behavior: Attitude, effort, teamwork, discipline (PLAYER-SPECIFIC)
- performance: Match/training performance observations (PLAYER-SPECIFIC)
- attendance: Presence/absence at sessions (PLAYER-SPECIFIC)
- wellbeing: Mental health, stress, anxiety, emotional state (PLAYER-SPECIFIC, set severity)
- recovery: Rehab progress, return-to-play status (PLAYER-SPECIFIC, distinct from initial injury)
- development_milestone: Achievements, selections, personal bests (PLAYER-SPECIFIC)
- physical_development: Growth spurts, conditioning, fitness benchmarks (PLAYER-SPECIFIC)
- parent_communication: Things to discuss with parents (PLAYER-SPECIFIC)
- tactical: Position changes, formations, role assignments (PLAYER or TEAM)
- team_culture: Team morale, collective behavior (TEAM-WIDE, no specific player)
- todo: Action items for coaches (COACH, no player)
- session_plan: Training focus areas, drill ideas (TEAM or NONE)

TITLE FORMAT RULES:
[Same rules as v1 - see voiceNotes.ts lines 503-514]

PLAYER MATCHING INSTRUCTIONS:
[Same as v1 - see voiceNotes.ts lines 531-559]

TEAM MATCHING INSTRUCTIONS:
[Same as v1 - see voiceNotes.ts lines 561-574]

TODO ASSIGNMENT INSTRUCTIONS:
[Same as v1 - see voiceNotes.ts lines 576-598]

ENTITY MENTION RULES:
- For each entity referenced in a claim, add to entityMentions:
  - "player_name": Any player name mentioned
  - "team_name": Any team name mentioned
  - "group_reference": Groups like "the twins", "the midfielders", "the new lads"
  - "coach_name": Any coach name mentioned (for todo assignment)
- position: character offset in the source text where the mention starts (approximate)

SEVERITY (for injury/wellbeing):
- low: Minor issue, can continue playing
- medium: Needs attention but not urgent
- high: Needs immediate attention
- critical: Medical emergency, stop activity

SENTIMENT:
- positive: Good news, improvement, praise
- neutral: Factual observation, no emotional tone
- negative: Bad news, decline, criticism
- concerned: Worry, uncertainty about the situation

Team Roster:
${rosterJson}

Coach's Teams:
${teamsJson}

Coaches on Same Teams (for TODO assignment):
${coachesJson}
```

### 6. Additional Query for voiceNoteArtifacts.ts

Add `getArtifactById` internalQuery to `packages/backend/convex/models/voiceNoteArtifacts.ts`:

```typescript
/**
 * Get artifact by Convex document _id.
 * Used by claimsExtraction action which receives the _id from scheduler.
 */
export const getArtifactById = internalQuery({
  args: {
    _id: v.id("voiceNoteArtifacts"),
  },
  returns: v.union(
    v.object({
      // ... same shape as getArtifactByArtifactId returns
    }),
    v.null()
  ),
  handler: async (ctx, args) => ctx.db.get(args._id),
});
```

### 7. AI Model Configuration

Reuse the existing `getAIConfig()` pattern from voiceNotes.ts (lines 29-70):

```typescript
async function getAIConfig(ctx, feature, organizationId?) {
  // Try database config
  const dbConfig = await ctx.runQuery(
    internal.models.aiModelConfig.getConfigForFeatureInternal,
    { feature, organizationId }
  );
  if (dbConfig) return { modelId: dbConfig.modelId, ... };
  // Fall back to env vars
  return { modelId: process.env.OPENAI_MODEL_INSIGHTS || "gpt-4o" };
}
```

Feature key: `"voice_insights"` (same as v1 buildInsights). This means both v1 and v2 use the same model configuration -- intentional so that switching models applies to both.

### 8. Player Matching in Claims

For each claim with player entity mentions:

```typescript
// Deterministic match first (from AI's playerId field)
if (claim.playerId) {
  // Verify it's a real player ID by checking roster
  const player = rosterMap.get(claim.playerId);
  if (player) {
    resolvedPlayerIdentityId = player.playerIdentityId;
    resolvedPlayerName = player.fullName;
  }
}

// Fuzzy fallback if no deterministic match
if (!resolvedPlayerIdentityId && claim.playerName) {
  const fuzzyResults = await ctx.runQuery(
    internal.models.orgPlayerEnrollments.findSimilarPlayers,
    { organizationId, coachUserId, searchName: claim.playerName, limit: 1 }
  );
  if (fuzzyResults.length > 0 && fuzzyResults[0].similarity >= 0.85) {
    resolvedPlayerIdentityId = fuzzyResults[0].playerId;
    resolvedPlayerName = fuzzyResults[0].fullName;
  }
}
```

---

## US-VN-016: Pipeline Integration & Claims Viewer

### 1. Pipeline Hook in voiceNotes.ts

Location: Inside the `if (artifacts.length > 0)` block at line ~233, AFTER the transcript creation and artifact status update (line ~257), add:

```typescript
// US-VN-016: v2 claims extraction -- runs in parallel with v1 buildInsights
await ctx.scheduler.runAfter(
  0,
  internal.actions.claimsExtraction.extractClaims,
  { artifactId: artifact._id }
);
```

This must go BEFORE the quality check branching (line ~260). The scheduler fires immediately, running in parallel with whatever happens next (including the v1 buildInsights scheduled at line 280).

**Why before quality check?** Claims extraction does its own quality assessment. Even if v1 rejects the quality, v2 claims might still extract useful data.

### 2. getRecentArtifacts Query

Add to `packages/backend/convex/models/voiceNoteArtifacts.ts`:

```typescript
import { query } from "../_generated/server";

/**
 * Get recent artifacts for the claims viewer (platform debug tool).
 * PUBLIC query -- used by the frontend /platform/v2-claims page.
 */
export const getRecentArtifacts = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(/* artifact object shape */),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 200);
    return await ctx.db
      .query("voiceNoteArtifacts")
      .withIndex("by_status_and_createdAt")
      .order("desc")
      .take(limit);
  },
});
```

### 3. Claims Viewer Page

Create `apps/web/src/app/platform/v2-claims/page.tsx` following the `ai-config/page.tsx` pattern:

- `"use client"` component
- `useCurrentUser()` for auth check
- `useQuery(api.models.voiceNoteArtifacts.getRecentArtifacts)` for artifact list
- For claims: either use `getClaimsByOrgAndCoach` per artifact, or add a new `getRecentClaims` public query
- Layout: header with back link, stats cards, artifact list with expandable claims
- Each claim: topic badge (color-coded), sourceText, title, entity mentions, confidence, status
- Uses: Card, Badge, Table, Skeleton from shadcn/ui

**Topic Badge Colors** (suggested):
- injury/recovery: red
- wellbeing: purple
- skill_rating/skill_progress: blue
- behavior: orange
- performance: green
- attendance: gray
- development_milestone: gold
- physical_development: teal
- parent_communication: pink
- tactical: indigo
- team_culture: emerald
- todo: amber
- session_plan: cyan

May need an additional public query `getRecentClaims` in voiceNoteClaims.ts:

```typescript
export const getRecentClaims = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(/* claim object shape */),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 100, 500);
    // Use a simple query - this is a debug tool, not performance-critical
    return await ctx.db
      .query("voiceNoteClaims")
      .order("desc")
      .take(limit);
  },
});
```

---

## Files Modified/Created Summary

| File | Action | Story | Changes |
|------|--------|-------|---------|
| `packages/backend/convex/schema.ts` | MODIFY | US-VN-015 | Add `voiceNoteClaims` table with 15 topics + 7 indexes |
| `packages/backend/convex/models/voiceNoteClaims.ts` | **NEW** | US-VN-015 | 6 CRUD functions (5 internal + 1 public) |
| `packages/backend/convex/lib/coachContext.ts` | **NEW** | US-VN-015 | `gatherCoachContext` internalQuery |
| `packages/backend/convex/actions/claimsExtraction.ts` | **NEW** | US-VN-015 | `extractClaims` internalAction + Zod schema + GPT-4 prompt |
| `packages/backend/convex/models/voiceNoteArtifacts.ts` | MODIFY | US-VN-015 | Add `getArtifactById` internalQuery |
| `packages/backend/convex/actions/voiceNotes.ts` | MODIFY | US-VN-016 | Add `ctx.scheduler.runAfter` for claims extraction (~3 lines) |
| `packages/backend/convex/models/voiceNoteArtifacts.ts` | MODIFY | US-VN-016 | Add `getRecentArtifacts` public query |
| `packages/backend/convex/models/voiceNoteClaims.ts` | MODIFY | US-VN-016 | Optionally add `getRecentClaims` public query |
| `apps/web/src/app/platform/v2-claims/page.tsx` | **NEW** | US-VN-016 | Claims viewer debug page |

---

## Existing Code References

### voiceNotes.ts Key Lines
- **Lines 1-10**: Imports (OpenAI, zodTextFormat, z, api, internal, internalAction)
- **Lines 29-70**: `getAIConfig()` function (reuse this pattern)
- **Lines 216-257**: Transcription completion + v2 transcript storage
- **Lines 280-286**: v1 `buildInsights` scheduler call
- **Lines 340-471**: Coach context gathering (port to coachContext.ts)
- **Lines 486-604**: GPT-4 system prompt (port matching rules to claims prompt)
- **Lines 651-724**: Player matching + fuzzy fallback (replicate pattern)

### voiceNoteArtifacts.ts
- **Lines 14-28**: Shared validators (sourceChannelValidator, statusValidator)
- **Lines 132-169**: `getArtifactByArtifactId` (takes string artifactId) -- add parallel `getArtifactById` (takes Convex _id)

### playerMatching.ts
- **Lines 37-175**: `findSimilarPlayersLogic()` -- already shared, called via `findSimilarPlayers` internalQuery

### featureFlags.ts
- **Lines 35-98**: `shouldUseV2Pipeline` -- already exists, Phase 4 doesn't modify it

---

## Verification Checklist

After both stories are complete:

1. `npx -w packages/backend convex codegen` -- types clean
2. `npm run check-types` -- 0 errors
3. `npx ultracite fix` -- no changes
4. `npm run build` -- succeeds
5. Manual: Enable v2 flag for test coach -> send voice note -> verify claims in DB
6. Manual: Check claims viewer at `/platform/v2-claims`
7. Manual: Non-v2 coach voice note -> verify no claims created, v1 insights work

---

## Common Pitfalls for This Phase

- **Don't add claims extraction inside buildInsights** -- it's a separate action file
- **Don't modify the v1 buildInsights flow** -- it must remain unchanged
- **Don't use `.filter()`** -- all queries must use `.withIndex()`
- **Don't forget `"use node"` directive** on claimsExtraction.ts (it uses OpenAI SDK)
- **Don't use `v.any()`** -- all validators must be typed
- **Don't call public mutations from internalActions** -- use internalMutation
- **Better Auth IDs are `v.string()` not `v.id()`** -- userId, organizationId, teamId
- **PlayerIdentityIds ARE `v.id("playerIdentities")`** -- these are Convex doc IDs
- **Biome removes unused imports** -- add import AND its usage in the same edit
- **Biome requires block statements** -- `if (x) { return; }` not `if (x) return;`
- **Biome max 4 params** -- use options objects for functions with more
- **Biome cognitive complexity max 15** -- extract sub-functions/components
