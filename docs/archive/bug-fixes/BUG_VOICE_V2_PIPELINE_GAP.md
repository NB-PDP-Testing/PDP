## Bug: V2 Voice Pipeline Gap - Phase 4 Inline Resolution Creates Dead End for Phases 5 & 6

### Summary

When Phase 4 (Claims Extraction) confidently resolves a player inline during AI extraction, Phase 5 (Entity Resolution) exits early without creating `voiceNoteEntityResolutions` records, and Phase 6 (Draft Generation) is never scheduled. Even if Phase 6 were manually triggered, it would produce zero drafts because it exclusively reads from `voiceNoteEntityResolutions` — which is empty.

**Result:** The `insightDrafts` table is never populated for single-match, high-confidence voice notes — which is the most common use case.

---

### Reproduction Steps

1. Ensure `entity_resolution_v2` and `ENTITY_RESOLUTION_V2_GLOBAL` feature flags are enabled
2. Submit a voice note mentioning a player who is the **only match** in the organization (e.g., only one "Clodagh")
3. Wait for the full pipeline to complete
4. Check `voiceNoteClaims` table — claims exist with `resolvedPlayerIdentityId` set (Phase 4 resolved inline)
5. Check `voiceNoteEntityResolutions` table — **empty** (Phase 5 skipped)
6. Check `insightDrafts` table — **empty** (Phase 6 never ran or produced no drafts)

### Expected Behavior

The `insightDrafts` table should contain draft insights for every resolved claim, regardless of whether resolution happened in Phase 4 or Phase 5.

### Actual Behavior

No insight drafts are generated. The pipeline silently terminates after Phase 5's early exit.

---

### Root Cause Analysis

The bug is a **pipeline handoff gap** across three locations:

#### 1. Phase 5 Early Exit (entityResolution.ts, lines 134-143)

```typescript
// packages/backend/convex/actions/entityResolution.ts

// 4. Filter to claims without resolvedPlayerIdentityId
const unresolvedClaims = claims.filter(
  (c) => !c.resolvedPlayerIdentityId
);

if (unresolvedClaims.length === 0) {
  console.info("[entityResolution] All claims already resolved by Phase 4");
  return null;  // ← EXITS HERE — never reaches Phase 6 scheduler on line 183
}
```

When Phase 4's AI confidently matches the player, it sets `resolvedPlayerIdentityId` on all claims. Phase 5 then finds zero unresolved claims and returns early — **before** scheduling Phase 6 (line 183-186) and **without** creating any `voiceNoteEntityResolutions` records.

#### 2. Phase 6 Only Scheduled From Phase 5 (entityResolution.ts, lines 182-187)

```typescript
// packages/backend/convex/actions/entityResolution.ts

// 15. Schedule draft generation (Phase 6)
await ctx.scheduler.runAfter(
  0,
  internal.actions.draftGeneration.generateDrafts,
  { artifactId: args.artifactId }
);
```

Phase 6 is **only** scheduled after Phase 5 processes resolutions. If Phase 5 exits early, Phase 6 is never invoked.

#### 3. Phase 6 Only Reads Entity Resolutions (draftGeneration.ts, lines 193-258)

```typescript
// packages/backend/convex/actions/draftGeneration.ts

// 4. Get entity resolutions and build lookup map
const resolutions = await ctx.runQuery(
  internal.models.voiceNoteEntityResolutions.getResolutionsByArtifact,
  { artifactId: args.artifactId }
);

// ...later, for each claim:
const claimResolutions = resolutionsByClaimId.get(claim._id) ?? [];
const playerResolution = findPlayerResolution(claimResolutions);

if (!playerResolution?.resolvedEntityId) {
  continue;  // ← Skips every claim because resolutions table is empty
}
```

Even if Phase 6 were triggered manually, it reads player identity exclusively from `voiceNoteEntityResolutions`. It never falls back to `claim.resolvedPlayerIdentityId` set by Phase 4.

---

### Impact

- **All single-match voice notes produce zero insight drafts** — this is the most common scenario (coach mentions a player by first name, only one match exists)
- The v2 pipeline effectively only generates drafts for ambiguous cases that go through full Phase 5 processing
- UAT test cases DR-001 through DR-series are all blocked

### Affected Tables

| Table | Expected | Actual |
|-------|----------|--------|
| `voiceNoteClaims` | Claims with `resolvedPlayerIdentityId` | Correct |
| `voiceNoteEntityResolutions` | Resolution records | **Empty** |
| `insightDrafts` | Draft insights | **Empty** |

---

### Suggested Fix Options

#### Option A: Phase 5 creates resolution records for Phase 4-resolved claims (Recommended)

Before the early exit in `entityResolution.ts`, create `voiceNoteEntityResolutions` records for claims that Phase 4 already resolved. This preserves the audit trail and ensures Phase 6 has data to work with.

```typescript
// After filtering unresolvedClaims but BEFORE the early exit check:
// Create resolution records for Phase 4-resolved claims
const phase4ResolvedClaims = claims.filter(c => c.resolvedPlayerIdentityId);
if (phase4ResolvedClaims.length > 0) {
  const phase4Resolutions = phase4ResolvedClaims.map(c => ({
    claimId: c._id,
    artifactId: args.artifactId,
    mentionIndex: 0,
    mentionType: "player_name",
    rawText: c.playerNameMentioned || "",
    candidates: [{ entityType: "player", entityId: c.resolvedPlayerIdentityId, entityName: "...", score: 1.0, matchReason: "phase4_ai_match" }],
    status: "auto_resolved",
    resolvedEntityId: c.resolvedPlayerIdentityId,
    resolvedEntityName: "...",  // Need to look up player name
    organizationId,
    createdAt: Date.now(),
  }));
  await storeResolutions(ctx, phase4Resolutions);
}

// ALWAYS schedule Phase 6, even if no Phase 5 work needed
await ctx.scheduler.runAfter(0, internal.actions.draftGeneration.generateDrafts, { artifactId });
```

#### Option B: Phase 6 falls back to claim-level resolution

Modify `draftGeneration.ts` to check `claim.resolvedPlayerIdentityId` when no entity resolution record exists:

```typescript
// In the claim processing loop:
let playerIdentityId = playerResolution?.resolvedEntityId;
let playerName = playerResolution?.resolvedEntityName;

// Fallback to Phase 4 inline resolution
if (!playerIdentityId && claim.resolvedPlayerIdentityId) {
  playerIdentityId = claim.resolvedPlayerIdentityId;
  playerName = claim.playerNameMentioned;
}

if (!playerIdentityId) {
  continue;
}
```

Also needs a separate trigger for Phase 6 from `claimsExtraction.ts` when all claims are resolved.

#### Option C: Both A and B

Apply both fixes for belt-and-suspenders reliability.

---

### Files to Modify

1. `packages/backend/convex/actions/entityResolution.ts` — Phase 5 early exit logic (lines 134-143, 182-187)
2. `packages/backend/convex/actions/draftGeneration.ts` — Phase 6 player resolution fallback (lines 251-258)
3. `packages/backend/convex/actions/claimsExtraction.ts` — Potentially add Phase 6 scheduling when Phase 5 is skipped

### Testing

After fix, verify:
- ER-001: Single match auto resolves → `voiceNoteEntityResolutions` record created
- DR-001: Insight drafts generated for single-match voice notes
- DR-series: All draft generation test cases pass
- Regression: Multi-match / ambiguous cases still work correctly
