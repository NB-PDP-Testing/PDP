# Phase 5: Entity Resolution & Disambiguation - Implementation Guide

**Duration**: 4 days (US-VN-017 + US-VN-018)
**Dependencies**: Phase 4 complete (claims extraction working)
**Branch**: feat/voice-gateways-v2

---

## Overview

Phase 5 resolves entity mentions in claims to actual players/teams/coaches. Phase 4 already does best-effort player matching (deterministic + fuzzy at 0.85 threshold), so Phase 5 focuses on:

1. **Unresolved claims** — Where Phase 4 couldn't find a match
2. **Detailed resolution records** — Capturing multiple candidates with scores and rich match reasons
3. **Coach alias learning** — Resolve once, remember forever (Enhancement E5)
4. **Batch same-name resolution** — Group duplicate mentions, resolve all at once (Enhancement E6)
5. **Trust-adaptive thresholds** — Personalized auto-resolve per coach (Enhancement E1)
6. **Coach-facing disambiguation UI** — With matchReason badges and analytics (Enhancements E3, E4)

**Enhancement Reference**: See `context/PHASE5_ENHANCEMENTS_CATALOG.md` for full details on all 12 assessed enhancements (6 included, 6 deferred).

---

## Enhancements Included in Phase 5

| # | Enhancement | What It Does | Key Files |
|---|-------------|--------------|-----------|
| E1 | Trust-Adaptive Threshold | Uses coach's `insightConfidenceThreshold` instead of hardcoded 0.9 | `entityResolution.ts` |
| E2 | Feature Flag Gating | `entity_resolution_v2` flag controls whether resolution runs | `claimsExtraction.ts` |
| E3 | Disambiguation Analytics | Logs `disambiguate_accept/reject_all/skip` events | `voiceNoteEntityResolutions.ts` |
| E4 | Rich matchReason | Shows WHY a candidate matched (irish_alias, fuzzy, etc.) | `entityResolution.ts`, UI |
| E5 | Coach Alias Learning | `coachPlayerAliases` table — resolve once, auto-resolve forever | `coachPlayerAliases.ts`, `entityResolution.ts` |
| E6 | Batch Same-Name | Groups mentions by rawText, resolves all at once | `entityResolution.ts`, UI |

---

## What Phase 4 Already Does (DO NOT DUPLICATE)

**File**: `packages/backend/convex/actions/claimsExtraction.ts`

The `resolveClaimPlayer()` function (lines 326-362) already:
1. Runs deterministic matching against the roster (`findMatchingPlayerFromRoster`)
2. Falls back to fuzzy matching via `internal.models.orgPlayerEnrollments.findSimilarPlayers` with 0.85 threshold
3. Populates `resolvedPlayerIdentityId` and `resolvedPlayerName` on each claim

**Claims with `resolvedPlayerIdentityId` set are ALREADY RESOLVED. Skip them in Phase 5.**

Phase 5 only processes claims where `resolvedPlayerIdentityId === undefined`.

---

## Claim Status Flow

```
Phase 4 creates claims:    status = "extracted"
                           resolvedPlayerIdentityId = set (if matched) or undefined

Phase 5 entity resolution:
  1. [E2] Check entity_resolution_v2 feature flag → if disabled, return early
  2. [E5] For each unique player name, check coachPlayerAliases
     → HIT: Auto-resolve ALL mentions of that name (matchReason = "coach_alias")
     → MISS: Continue to fuzzy matching
  3. [E1] Fetch coach's insightConfidenceThreshold (fallback 0.9)
  4. For remaining unresolved names:
     - If single candidate with score >= trust threshold → "auto_resolved"
     - If multiple candidates → "needs_disambiguation"
     - If no candidates → "unresolved"
  5. [E6] Group by rawText: all mentions of same name get same resolution
  6. Update claim statuses:
     - All mentions auto_resolved → claim status = "resolved"
     - Any mention needs_disambiguation → claim status = "needs_disambiguation"
     - All mentions unresolved → claim status = "needs_disambiguation" (coach can review)

Coach disambiguation UI:
  1. Coach sees candidates with [E4] matchReason badges
  2. [E6] Grouped by rawText: "Tommy (5 claims)" shown as single card
  3. Coach selects correct player → status = "user_resolved"
  4. [E6] All other resolutions for same rawText in artifact → also updated
  5. [E5] Coach alias stored: rawText → resolvedEntityId
  6. [E3] Analytics event logged: disambiguate_accept + confidenceScore
  7. Claim's resolvedPlayerIdentityId/Name updated → claim status → "resolved"
```

---

## Key Infrastructure (Already Built)

### Fuzzy Matching (Phase 1)

**File**: `packages/backend/convex/lib/playerMatching.ts`
- `findSimilarPlayersLogic()` — Levenshtein-based scoring with team context bonus
- Handles Irish name phonetic aliases (Sean/Shawn, Niamh/Neeve, etc.)
- Returns `SimilarPlayerResult[]` with `playerId`, `fullName`, `similarity`, `ageGroup`, `sport`

**File**: `packages/backend/convex/lib/stringMatching.ts`
- `calculateMatchScore` (lines 161-214) — Tries 6 strategies in order:
  1. Irish alias match (returns 0.9)
  2. Full name Levenshtein
  3. First name only
  4. Last name only
  5. Reversed full name
  6. Multi-word part matching
- `IRISH_NAME_ALIASES` — 19 alias groups for Irish names
- **Used by Enhancement E4** to compute rich matchReason values

**File**: `packages/backend/convex/models/orgPlayerEnrollments.ts`
- `findSimilarPlayers` — **internalQuery** (NOT public). Call via `ctx.runQuery(internal.models.orgPlayerEnrollments.findSimilarPlayers, {...})`
- Args: `{ organizationId, coachUserId, searchName, limit? }`

### Coach Context (Phase 4)

**File**: `packages/backend/convex/lib/coachContext.ts`
- `gatherCoachContext` — **internalQuery** returning `{ players, teams, coaches, recordingCoachName, rosterJson, teamsJson, coachesJson }`
- Reuse this for team/coach matching (no need to re-gather)

### Claims Model (Phase 4)

**File**: `packages/backend/convex/models/voiceNoteClaims.ts`
- `getClaimsByArtifact` — internalQuery, returns all claims for an artifact
- `getClaimsByArtifactAndStatus` — internalQuery, filter by status
- `updateClaimStatus` — internalMutation, update claim status by claimId

### Coach Trust Levels (Phase 2.5) — Enhancement E1

**File**: `packages/backend/convex/models/coachTrustLevels.ts`
- `getCoachTrustLevelInternal` — **internalQuery**, args: `{ coachId: v.string() }` (NOT coachUserId, NOT organizationId — trust levels are platform-wide per coach)
- Returns `{ currentLevel, insightConfidenceThreshold?, insightAutoApplyPreferences?, ... }`
- Threshold is personalized, adjusted weekly by `adjustPersonalizedThresholds` cron (Sunday 2 AM)
- Level 0 coach: ~0.9, Level 3 "Expert" coach: ~0.85

### Feature Flags (Phase 3) — Enhancement E2

**File**: `packages/backend/convex/lib/featureFlags.ts`
- `shouldUseEntityResolution` — **internalQuery** (NEW, created for Phase 5), cascade: env var `ENTITY_RESOLUTION_V2_GLOBAL` → platform → org → user → default(false). Returns `v.boolean()`. Args: `{ organizationId, userId }`
- `shouldUseV2Pipeline` — Reference implementation (same cascade pattern)
- `getFeatureFlag` — Single-scope lookup, returns full record or null (DO NOT use for cascade evaluation)
- `setFeatureFlag` — Upsert at any scope
- Admin UI at `/platform/feature-flags` for managing flags

### Review Analytics (Phase 2) — Enhancement E3

**File**: `packages/backend/convex/models/reviewAnalytics.ts`
- `logReviewEvent` — **internalMutation**, args include `linkCode: v.optional(v.string())` (optional — disambiguation events have no linkCode), `confidenceScore`, `category`, `wasAutoApplyCandidate`
- Event types: `apply|dismiss|edit|snooze|batch_apply|batch_dismiss|disambiguate_accept|disambiguate_reject_all|disambiguate_skip`
- Schema + model already updated with the 3 new event types and optional linkCode (pre-implementation fix)
- Events feed into weekly `adjustPersonalizedThresholds` cron → completes the feedback loop with E1

---

## Batch Pattern for Entity Resolution (MANDATORY)

**NEVER do this (N+1 anti-pattern):**
```typescript
// BAD: Query per entity mention
for (const claim of claims) {
  for (const mention of claim.entityMentions) {
    const candidates = await ctx.runQuery(
      internal.models.orgPlayerEnrollments.findSimilarPlayers,
      { searchName: mention.rawText, ... }
    );
  }
}
```

**ALWAYS do this (Batch pattern with E5 alias lookup + E6 grouping):**
```typescript
// GOOD: Collect unique names, check aliases first, query once per remaining name

// 1. Collect unique player names across ALL unresolved claims [E6]
const mentionGroups = new Map<string, Array<{ claimId: Id<"voiceNoteClaims">, mentionIndex: number }>>();
for (const claim of unresolvedClaims) {
  for (const [idx, mention] of claim.entityMentions.entries()) {
    if (mention.mentionType === "player_name") {
      const key = mention.rawText.toLowerCase().trim();
      if (!mentionGroups.has(key)) mentionGroups.set(key, []);
      mentionGroups.get(key)!.push({ claimId: claim._id, mentionIndex: idx });
    }
  }
}

// 2. [E5] Check aliases first — resolve hits immediately
const aliasResolved = new Set<string>();
for (const rawText of mentionGroups.keys()) {
  const alias = await ctx.runQuery(
    internal.models.coachPlayerAliases.lookupAlias,
    { coachUserId, organizationId, rawText }
  );
  if (alias) {
    // Auto-resolve ALL mentions in this group
    for (const { claimId, mentionIndex } of mentionGroups.get(rawText)!) {
      resolutions.push({
        claimId, artifactId, mentionIndex,
        mentionType: "player_name",
        rawText,
        candidates: [{ entityType: "player", entityId: alias.resolvedEntityId,
                       entityName: alias.resolvedEntityName, score: 1.0,
                       matchReason: "coach_alias" }],
        status: "auto_resolved",
        resolvedEntityId: alias.resolvedEntityId,
        resolvedEntityName: alias.resolvedEntityName,
        resolvedAt: Date.now(),
        organizationId, createdAt: Date.now(),
      });
    }
    aliasResolved.add(rawText);
    // Increment alias useCount
    await ctx.runMutation(internal.models.coachPlayerAliases.storeAlias, {
      coachUserId, organizationId, rawText,
      resolvedEntityId: alias.resolvedEntityId,
      resolvedEntityName: alias.resolvedEntityName,
    });
  }
}

// 3. Query once per remaining unique name (NOT per mention)
const candidateMap = new Map<string, SimilarPlayerResult[]>();
for (const rawText of mentionGroups.keys()) {
  if (aliasResolved.has(rawText)) continue; // Already resolved via alias
  const results = await ctx.runQuery(
    internal.models.orgPlayerEnrollments.findSimilarPlayers,
    { organizationId, coachUserId, searchName: rawText, limit: 5 }
  );
  candidateMap.set(rawText, results);
}

// 4. [E1] Get personalized threshold
// NOTE: getCoachTrustLevelInternal takes { coachId } (NOT coachUserId/organizationId)
const trustData = await ctx.runQuery(
  internal.models.coachTrustLevels.getCoachTrustLevelInternal,
  { coachId: coachUserId }
);
const autoResolveThreshold = trustData?.insightConfidenceThreshold ?? 0.9;

// 5. [E6] For each unique name group, create resolution records
for (const [rawText, mentions] of mentionGroups.entries()) {
  if (aliasResolved.has(rawText)) continue;
  const candidates = candidateMap.get(rawText) ?? [];

  // [E4] Compute rich matchReason for each candidate
  const enrichedCandidates = candidates.map(c => ({
    entityType: "player" as const,
    entityId: c.playerId,
    entityName: c.fullName,
    score: c.similarity,
    matchReason: computeMatchReason(rawText, c), // See E4 section below
  }));

  // Determine resolution status
  let status: "auto_resolved" | "needs_disambiguation" | "unresolved";
  let resolvedId: string | undefined;
  let resolvedName: string | undefined;

  if (enrichedCandidates.length === 1 && enrichedCandidates[0].score >= autoResolveThreshold) {
    status = "auto_resolved";
    resolvedId = enrichedCandidates[0].entityId;
    resolvedName = enrichedCandidates[0].entityName;
  } else if (enrichedCandidates.length > 0) {
    status = "needs_disambiguation";
  } else {
    status = "unresolved";
  }

  // Create resolution record for EACH mention in the group [E6]
  for (const { claimId, mentionIndex } of mentions) {
    resolutions.push({
      claimId, artifactId, mentionIndex,
      mentionType: "player_name", rawText,
      candidates: enrichedCandidates,
      status,
      ...(resolvedId && { resolvedEntityId: resolvedId, resolvedEntityName: resolvedName, resolvedAt: Date.now() }),
      organizationId, createdAt: Date.now(),
    });
  }
}
```

---

## Schema: voiceNoteEntityResolutions

```typescript
voiceNoteEntityResolutions: defineTable({
  claimId: v.id("voiceNoteClaims"),
  artifactId: v.id("voiceNoteArtifacts"),       // Denormalized for queries
  mentionIndex: v.number(),                       // Position in claim.entityMentions
  mentionType: v.union(
    v.literal("player_name"),
    v.literal("team_name"),
    v.literal("group_reference"),
    v.literal("coach_name")
  ),
  rawText: v.string(),                            // e.g., "Shawn"
  candidates: v.array(v.object({
    entityType: v.union(
      v.literal("player"),
      v.literal("team"),
      v.literal("coach")
    ),
    entityId: v.string(),
    entityName: v.string(),
    score: v.number(),                            // 0.0-1.0 similarity
    matchReason: v.string(),                      // E4: "irish_alias", "fuzzy_full_name+team_context", etc.
  })),
  status: v.union(
    v.literal("auto_resolved"),
    v.literal("needs_disambiguation"),
    v.literal("user_resolved"),
    v.literal("unresolved")
  ),
  resolvedEntityId: v.optional(v.string()),
  resolvedEntityName: v.optional(v.string()),
  resolvedAt: v.optional(v.number()),
  organizationId: v.string(),                     // Denormalized for auth filtering
  createdAt: v.number(),
})
  .index("by_claimId", ["claimId"])
  .index("by_artifactId", ["artifactId"])
  .index("by_artifactId_and_status", ["artifactId", "status"])
  .index("by_org_and_status", ["organizationId", "status"]),
  // NOTE: No by_status index — use by_org_and_status to avoid unbounded table scans
```

---

## Schema: coachPlayerAliases (Enhancement E5)

```typescript
coachPlayerAliases: defineTable({
  coachUserId: v.string(),
  organizationId: v.string(),
  rawText: v.string(),              // Normalized lowercase: "shawn"
  resolvedEntityId: v.string(),     // playerIdentityId
  resolvedEntityName: v.string(),   // "Sean O'Brien"
  useCount: v.number(),             // How many times this alias auto-resolved
  lastUsedAt: v.number(),
  createdAt: v.number(),
})
  .index("by_coach_org_rawText", ["coachUserId", "organizationId", "rawText"])
  .index("by_coach_org", ["coachUserId", "organizationId"]),
```

**Flow**:
```
1. Entity mention "Shawn" arrives
2. CHECK: coachPlayerAliases for this coach + org + "shawn" (normalized)
   → HIT: Auto-resolve immediately (status = "auto_resolved", matchReason = "coach_alias")
         Increment useCount, update lastUsedAt
   → MISS: Proceed to fuzzy matching as normal
3. When coach manually resolves disambiguation:
   → INSERT or UPDATE coachPlayerAliases with the resolution
   → Increment useCount, update lastUsedAt
```

---

## Rich matchReason Computation (Enhancement E4)

**Purpose**: Show coaches WHY a candidate matched, not just a percentage.

```typescript
// In entityResolution.ts — compute after getting fuzzy match results
function computeMatchReason(rawText: string, candidate: SimilarPlayerResult): string {
  const normalizedSearch = rawText.toLowerCase().trim();
  const normalizedName = candidate.fullName.toLowerCase().trim();
  const [firstName, ...lastParts] = normalizedName.split(" ");
  const lastName = lastParts.join(" ");

  // Check Irish alias first (from stringMatching.ts IRISH_NAME_ALIASES)
  const searchParts = normalizedSearch.split(" ");
  for (const alias of IRISH_NAME_ALIASES) {
    const canonicalSet = alias.map(a => a.toLowerCase());
    if (canonicalSet.includes(searchParts[0]) && canonicalSet.includes(firstName)) {
      return candidate.similarity >= 0.95 ? "irish_alias" : "irish_alias+fuzzy";
    }
  }

  // Exact first name
  if (searchParts[0] === firstName) {
    return "exact_first_name";
  }

  // Last name match
  if (normalizedSearch === lastName || searchParts.includes(lastName)) {
    return "last_name_match";
  }

  // Reversed name
  const reversedSearch = searchParts.reverse().join(" ");
  if (levenshteinSimilarity(reversedSearch, normalizedName) > 0.85) {
    return "reversed_name";
  }

  // Fuzzy full name (default)
  if (candidate.similarity >= 0.7) {
    return "fuzzy_full_name";
  }

  // Fuzzy first name only
  if (levenshteinSimilarity(searchParts[0], firstName) >= 0.7) {
    return "fuzzy_first_name";
  }

  return "partial_match";
}

// Append team context bonus indicator
if (candidateIsOnCoachTeam) {
  matchReason += "+team_context";
}
```

**Match Reason Values** (displayed as badges in UI):

| Reason | Badge Label | Example |
|--------|-------------|---------|
| `coach_alias` | "Known alias" | Previous resolution: "Shawn" → "Sean O'Brien" |
| `irish_alias` | "Irish name alias" | "Shawn" → "Sean" via IRISH_NAME_ALIASES |
| `exact_first_name` | "Exact first name" | "Sean" → "Sean Murphy" |
| `fuzzy_full_name` | "Similar name" | "Sean Murfy" → "Sean Murphy" |
| `fuzzy_first_name` | "Similar first name" | "Seen" → "Sean" |
| `last_name_match` | "Last name match" | "Murphy" → "Sean Murphy" |
| `reversed_name` | "Reversed name" | "Murphy Sean" → "Sean Murphy" |
| `partial_match` | "Partial match" | "young Murphy" → "Sean Murphy" |
| `+team_context` | "On your team" | Appended to primary reason when team bonus applied |

---

## Trust-Adaptive Threshold (Enhancement E1)

**Purpose**: Use the coach's personalized threshold instead of hardcoded 0.9.

```typescript
// In entityResolution.ts resolveEntities action:
// IMPORTANT: getCoachTrustLevelInternal takes { coachId } — NOT { coachUserId, organizationId }
// Trust levels are platform-wide per coach, not per-org
const trustData = await ctx.runQuery(
  internal.models.coachTrustLevels.getCoachTrustLevelInternal,
  { coachId: coachUserId }
);
const autoResolveThreshold = trustData?.insightConfidenceThreshold ?? 0.9;

// Use autoResolveThreshold in auto-resolve decision:
if (topCandidate.score >= autoResolveThreshold && candidates.length === 1) {
  status = "auto_resolved";
}
```

**How it works**: The `insightConfidenceThreshold` is personalized per coach, adjusted weekly by the `adjustPersonalizedThresholds` cron job (Sunday 2 AM). It uses the coach's override patterns and review analytics agreement rate to tune the threshold. A Level 3 "Expert" coach who rarely overrides AI suggestions gets ~0.85, while a new Level 0 coach stays at ~0.9.

**Fallback**: If no trust data exists for the coach, use 0.9 (safe default).

**API contract**: `getCoachTrustLevelInternal({ coachId: v.string() })` → returns `{ currentLevel, insightConfidenceThreshold?, ... }`. The `coachId` is the user's `_id` field (same as `senderUserId` on the artifact).

---

## Feature Flag Gating (Enhancement E2)

**Purpose**: Control entity resolution independently of the v2 pipeline.

**IMPORTANT**: Use `shouldUseEntityResolution` (returns boolean, cascade evaluation), NOT `getFeatureFlag` (returns full record, single-scope only).

```typescript
// In claimsExtraction.ts, after storeClaims (line ~563):
const entityResolutionEnabled = await ctx.runQuery(
  internal.lib.featureFlags.shouldUseEntityResolution,
  { organizationId, userId: coachUserId }
);

if (entityResolutionEnabled) {
  await ctx.scheduler.runAfter(
    0,
    internal.actions.entityResolution.resolveEntities,
    { artifactId: args.artifactId }
  );
}
```

**Cascade evaluation**: env var `ENTITY_RESOLUTION_V2_GLOBAL` → platform → org → user → default(false). The function `shouldUseEntityResolution` is already created in `featureFlags.ts` (pre-implementation fix). The flag defaults to disabled; platform staff enable it per-org or per-user via the existing admin UI at `/platform/feature-flags`.

---

## Disambiguation Analytics Events (Enhancement E3)

**Purpose**: Track how coaches interact with disambiguation. Feeds into weekly threshold adjustment.

**New Event Types**:

| Event Type | When | Data |
|------------|------|------|
| `disambiguate_accept` | Coach selects a candidate | `confidenceScore` = selected candidate's similarity score |
| `disambiguate_reject_all` | Coach clicks "None of these" | `confidenceScore` = top candidate's score |
| `disambiguate_skip` | Coach clicks "Skip All Remaining" | `confidenceScore` = top candidate's score |

```typescript
// In resolveEntity mutation (after successful resolution):
// NOTE: linkCode is optional — omit it for disambiguation events (no review link involved)
await ctx.scheduler.runAfter(0, internal.models.reviewAnalytics.logReviewEvent, {
  coachUserId,
  organizationId,
  eventType: "disambiguate_accept",
  confidenceScore: selectedCandidate.score,
  category: claim.topic,
});
```

**Feedback Loop**: Over time, if a coach consistently accepts the top candidate at 0.85 similarity, the weekly cron raises their personalized threshold → fewer disambiguation prompts → less coach workload. This directly feeds Enhancement E1.

---

## Auth Guards (MANDATORY — Lesson from Phase 4)

All public queries AND mutations MUST check auth:

```typescript
// Pattern for PUBLIC queries
export const getResolutionsByClaim = query({
  args: { claimId: v.id("voiceNoteClaims") },
  returns: v.array(resolutionObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    return await ctx.db
      .query("voiceNoteEntityResolutions")
      .withIndex("by_claimId", (q) => q.eq("claimId", args.claimId))
      .collect();
  },
});

// Pattern for PUBLIC mutations
export const resolveEntity = mutation({
  args: {
    resolutionId: v.id("voiceNoteEntityResolutions"),
    resolvedEntityId: v.string(),
    resolvedEntityName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }
    // ... resolution logic including E5 alias storage, E6 batch update, E3 analytics
    return null;
  },
});
```

---

## Integration Point

**File to modify**: `packages/backend/convex/actions/claimsExtraction.ts`

After claims are stored (line ~563), add feature flag check + scheduler call:

```typescript
// 9. Store claims + mark completed
if (claimsToStore.length > 0) {
  await ctx.runMutation(internal.models.voiceNoteClaims.storeClaims, {
    claims: claimsToStore,
  });

  // [E2] Schedule entity resolution (feature-flag gated)
  // Use shouldUseEntityResolution (returns boolean, cascade evaluation)
  // NOT getFeatureFlag (returns full record, single-scope only)
  const entityResolutionEnabled = await ctx.runQuery(
    internal.lib.featureFlags.shouldUseEntityResolution,
    { organizationId, userId: coachUserId }
  );

  if (entityResolutionEnabled) {
    await ctx.scheduler.runAfter(
      0,
      internal.actions.entityResolution.resolveEntities,
      { artifactId: args.artifactId }
    );
  }
}
```

**DO NOT reference `claimProcessing.ts`** — that file does not exist. The actual file is `claimsExtraction.ts`.

---

## Entity Type Handling

| mentionType | Phase 5 Action | Resolution |
|-------------|---------------|------------|
| `player_name` | [E5] Alias check → fuzzy match via findSimilarPlayers | auto_resolved / needs_disambiguation / unresolved |
| `team_name` | Match against coachContext.teams by name | auto_resolved or unresolved |
| `group_reference` | Always create as unresolved | Phase 6 handles group expansion |
| `coach_name` | Match against coachContext.coaches by name | auto_resolved or unresolved |

---

## resolveEntity Mutation — Full Behavior (US-VN-017 + US-VN-018)

The public `resolveEntity` mutation in `voiceNoteEntityResolutions.ts` does ALL of the following when a coach selects a candidate:

```typescript
export const resolveEntity = mutation({
  args: {
    resolutionId: v.id("voiceNoteEntityResolutions"),
    resolvedEntityId: v.string(),
    resolvedEntityName: v.string(),
    selectedScore: v.number(),     // For analytics
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Auth guard
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");

    // 2. Get the resolution record
    const resolution = await ctx.db.get(args.resolutionId);
    if (!resolution) throw new Error("Resolution not found");

    // 3. [W2] Organization isolation — verify the coach belongs to this org
    // The resolution's organizationId must match the coach's active org
    // This prevents cross-org resolution tampering
    // NOTE: Verify via membership or token claims — implementation should check
    // identity.subject matches the coach who created the claims, OR
    // the user has access to this organizationId

    // 4. Update THIS resolution: user_resolved
    await ctx.db.patch(args.resolutionId, {
      status: "user_resolved",
      resolvedEntityId: args.resolvedEntityId,
      resolvedEntityName: args.resolvedEntityName,
      resolvedAt: Date.now(),
    });

    // 5. [E6] Batch: Find all OTHER resolutions in same artifact with same rawText
    const sameNameResolutions = await ctx.db
      .query("voiceNoteEntityResolutions")
      .withIndex("by_artifactId", (q) => q.eq("artifactId", resolution.artifactId))
      .collect();
    for (const r of sameNameResolutions) {
      if (r._id !== args.resolutionId &&
          r.rawText.toLowerCase() === resolution.rawText.toLowerCase() &&
          r.status === "needs_disambiguation") {
        await ctx.db.patch(r._id, {
          status: "user_resolved",
          resolvedEntityId: args.resolvedEntityId,
          resolvedEntityName: args.resolvedEntityName,
          resolvedAt: Date.now(),
        });
        // Also update the parent claim
        const batchClaim = await ctx.db.get(r.claimId);
        if (batchClaim) {
          await ctx.db.patch(r.claimId, {
            resolvedPlayerIdentityId: args.resolvedEntityId,
            resolvedPlayerName: args.resolvedEntityName,
            status: "resolved",
            updatedAt: Date.now(),
          });
        }
      }
    }

    // 6. Update the primary claim's resolved fields
    const claim = await ctx.db.get(resolution.claimId);
    await ctx.db.patch(resolution.claimId, {
      resolvedPlayerIdentityId: args.resolvedEntityId,
      resolvedPlayerName: args.resolvedEntityName,
      status: "resolved",
      updatedAt: Date.now(),
    });

    // 7. [E5] Store coach alias — inline upsert (NOT via scheduler)
    // Mutations CAN call db operations directly, no need for scheduler
    const normalizedRawText = resolution.rawText.toLowerCase().trim();
    const existingAlias = await ctx.db
      .query("coachPlayerAliases")
      .withIndex("by_coach_org_rawText", (q) =>
        q.eq("coachUserId", identity.subject)
         .eq("organizationId", resolution.organizationId)
         .eq("rawText", normalizedRawText)
      )
      .first();

    if (existingAlias) {
      await ctx.db.patch(existingAlias._id, {
        resolvedEntityId: args.resolvedEntityId,
        resolvedEntityName: args.resolvedEntityName,
        useCount: existingAlias.useCount + 1,
        lastUsedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("coachPlayerAliases", {
        coachUserId: identity.subject,
        organizationId: resolution.organizationId,
        rawText: normalizedRawText,
        resolvedEntityId: args.resolvedEntityId,
        resolvedEntityName: args.resolvedEntityName,
        useCount: 1,
        lastUsedAt: Date.now(),
        createdAt: Date.now(),
      });
    }

    // 8. [E3] Log analytics event (fire-and-forget via scheduler is fine here)
    await ctx.scheduler.runAfter(0, internal.models.reviewAnalytics.logReviewEvent, {
      coachUserId: identity.subject,
      organizationId: resolution.organizationId,
      eventType: "disambiguate_accept",
      confidenceScore: args.selectedScore,
      category: claim?.topic ?? "unknown",
    });

    return null;
  },
});
```

---

## Disambiguation UI Patterns

### Query Lifting (From CLAUDE.md Performance Rules)
```typescript
// GOOD: Fetch all data at page level, pass as props
function DisambiguationPage({ params }) {
  const resolutions = useQuery(
    api.models.voiceNoteEntityResolutions.getDisambiguationQueue,
    { organizationId: params.orgId }
  );

  // [E6] Group by rawText for batch display
  const grouped = useMemo(() => {
    if (!resolutions) return [];
    const groups = new Map<string, typeof resolutions>();
    for (const r of resolutions) {
      const key = r.rawText.toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    return Array.from(groups.entries()).map(([rawText, items]) => ({
      rawText: items[0].rawText,
      candidates: items[0].candidates, // Same candidates for all mentions of same name
      claimCount: items.length,
      primaryResolutionId: items[0]._id,
      allResolutionIds: items.map(i => i._id),
    }));
  }, [resolutions]);

  return grouped.map(group => (
    <ResolutionGroupCard key={group.rawText} group={group} />
  ));
}

// BAD: Query inside each card
function ResolutionCard({ claimId }) {
  const resolutions = useQuery(..., { claimId }); // N+1!
}
```

### Match Reason Badges (Enhancement E4)
```typescript
const MATCH_REASON_LABELS: Record<string, { label: string; variant: string }> = {
  coach_alias: { label: "Known alias", variant: "default" },
  irish_alias: { label: "Irish name alias", variant: "secondary" },
  exact_first_name: { label: "Exact first name", variant: "outline" },
  fuzzy_full_name: { label: "Similar name", variant: "outline" },
  fuzzy_first_name: { label: "Similar first name", variant: "outline" },
  last_name_match: { label: "Last name match", variant: "outline" },
  reversed_name: { label: "Reversed name", variant: "outline" },
  partial_match: { label: "Partial match", variant: "outline" },
};

// In candidate row:
<Badge variant={MATCH_REASON_LABELS[reason]?.variant ?? "outline"}>
  {MATCH_REASON_LABELS[reason]?.label ?? reason}
</Badge>
{matchReason.includes("+team_context") && (
  <Badge variant="default">On your team</Badge>
)}
```

### Mobile Touch Targets
- Minimum 44x44px for all interactive elements
- Radio buttons should have full-width tap areas
- Bottom action bar sticky on mobile

### Org Theming
```typescript
import { useOrgTheme } from "@/hooks/use-org-theme";
// Use for primary color accents on Confirm buttons, progress bars
```

---

## Threshold Reference

| Phase | Function | Threshold | Purpose |
|-------|----------|-----------|---------|
| Phase 1 | findSimilarPlayers | 0.5 (SIMILARITY_THRESHOLD) | Minimum to appear as candidate |
| Phase 4 | resolveClaimPlayer | 0.85 | Auto-populate resolvedPlayerIdentityId |
| Phase 5 | resolveEntities | **Personalized** (E1) | Auto-resolve without coach intervention |
| Phase 5 | resolveEntities (fallback) | 0.9 | Default when no trust data exists |

The escalating thresholds are intentional:
- 0.5 = "could be this player" (show as option)
- 0.85 = "probably this player" (set on claim for display)
- 0.9 / personalized = "almost certainly this player" (no human review needed)

**Enhancement E1** replaces the fixed 0.9 with the coach's `insightConfidenceThreshold` from their trust level record. A Level 3 "Expert" coach who rarely overrides AI suggestions gets ~0.85, while a new Level 0 coach stays at ~0.9+.

---

## Architecture Review Corrections (ADR-VN2-015 through ADR-VN2-022)

The following corrections were applied after the Phase 5 architectural review:

| # | Issue | Severity | Fix Applied |
|---|-------|----------|-------------|
| C1 | `getCoachTrustLevelInternal` takes `{ coachId }` not `{ coachUserId, organizationId }` | CRITICAL | All E1 code examples corrected to `{ coachId: coachUserId }` |
| C2 | `logReviewEvent` only accepted 6 event types + `linkCode` was required | CRITICAL | Schema + model **already updated** with 3 new event types + optional linkCode (pre-implementation fix) |
| C3 | `getFeatureFlag` returns record (not boolean) and does single-scope lookup | CRITICAL | New `shouldUseEntityResolution` cascade function **already created** in featureFlags.ts. All E2 code examples corrected |
| W1 | `by_status` index is unbounded (no org filter) | WARNING | Removed from schema — use `by_org_and_status` instead |
| W2 | `resolveEntity` mutation lacked org isolation | WARNING | Added organization verification step in mutation |
| W3 | `storeAlias` via scheduler was unnecessary from mutation | WARNING | Inlined alias upsert directly in resolveEntity mutation |

**Pre-implementation code changes already committed:**
- `packages/backend/convex/schema.ts` — reviewAnalyticsEvents: linkCode optional, 3 new event types
- `packages/backend/convex/models/reviewAnalytics.ts` — logReviewEvent: linkCode optional, 3 new event types
- `packages/backend/convex/lib/featureFlags.ts` — New `shouldUseEntityResolution` cascade function

---

## Files Summary

| File | Action | What |
|------|--------|------|
| `packages/backend/convex/schema.ts` | MODIFY | Add voiceNoteEntityResolutions + coachPlayerAliases tables (4 indexes on resolutions, not 5) |
| `packages/backend/convex/models/voiceNoteEntityResolutions.ts` | CREATE | 5 internal + 3 public functions (resolveEntity includes inline alias upsert + org isolation) |
| `packages/backend/convex/models/coachPlayerAliases.ts` | CREATE | 2 internal + 1 public functions (E5) |
| `packages/backend/convex/actions/entityResolution.ts` | CREATE | resolveEntities internalAction (with E1, E4, E5, E6) |
| `packages/backend/convex/actions/claimsExtraction.ts` | MODIFY | Add `shouldUseEntityResolution` flag check (E2) + scheduler.runAfter |
| `apps/web/src/app/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]/page.tsx` | CREATE | Disambiguation UI (with E3, E4, E6 batch display) |
| `apps/web/src/app/orgs/[orgId]/coach/voice-notes/page.tsx` | MODIFY | Add disambiguation badge/link |

---

## Execution Order

### Day 1: Schema + Model Functions + Feature Flag
1. Add `voiceNoteEntityResolutions` table to schema.ts
2. Add `coachPlayerAliases` table to schema.ts (E5)
3. Create `models/voiceNoteEntityResolutions.ts` (8 functions)
4. Create `models/coachPlayerAliases.ts` (3 functions) (E5)
5. Run `npx -w packages/backend convex codegen` to verify types

### Day 2: resolveEntities Action
1. Create `actions/entityResolution.ts`
2. Implement 14-step logic (E1 trust threshold, E2 flag check via integration, E4 matchReason, E5 alias lookup, E6 batch grouping)
3. Add feature flag check + scheduler call in `claimsExtraction.ts` (E2)
4. Run `npm run check-types`

### Day 3: Disambiguation UI + Integration
1. Create disambiguation page at `/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]/page.tsx`
2. Implement grouped cards (E6), matchReason badges (E4), analytics logging (E3)
3. Add disambiguation badge/link to voice notes list page
4. Run `npm run build`

### Day 4: Polish + Testing
1. Mobile-responsive polish (touch targets, sticky action bar)
2. Manual test: alias learning flow (E5)
3. Manual test: batch resolution flow (E6)
4. Manual test: trust-adaptive threshold (E1)
5. Manual test: analytics events in reviewAnalyticsEvents table (E3)
6. End-to-end verification
