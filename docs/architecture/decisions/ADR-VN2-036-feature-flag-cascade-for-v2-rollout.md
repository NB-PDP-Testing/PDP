# ADR-VN2-036: Feature Flag Cascade for v2 Pipeline Rollout

**Status**: Accepted
**Date**: 2026-02-08
**Phase**: 7A-7D (cross-cutting)

## Context

The v2 pipeline is gated by `shouldUseV2Pipeline` (internalQuery in `lib/featureFlags.ts`). This function uses a 4-level cascade to determine whether v2 is active for a given org+user. Phase 7A-7D relies on this cascade working correctly in both mutation and action contexts.

## Cascade Order (First Match Wins)

```
1. Environment variable: VOICE_NOTES_V2_GLOBAL ("true"/"false")
2. Platform-wide flag: featureFlags where featureKey="voice_notes_v2" AND scope="platform"
3. Organization flag: featureFlags where featureKey="voice_notes_v2" AND scope="organization" AND organizationId=X
4. User flag: featureFlags where featureKey="voice_notes_v2" AND scope="user" AND userId=X
5. Default: false (v1 pipeline)
```

## Calling Context Verification

### From Mutation (createTypedNote, createRecordedNote)
```typescript
const useV2 = await ctx.runQuery(internal.lib.featureFlags.shouldUseV2Pipeline, {
  organizationId: args.orgId,
  userId: args.coachId,
});
```
**VERIFIED**: `ctx.runQuery` from a mutation handler is valid in Convex. The internalQuery runs within the same transaction snapshot. No race conditions.

### From Action (whatsapp.ts processAudioMessage/processTextMessage)
```typescript
const useV2 = await ctx.runQuery(internal.lib.featureFlags.shouldUseV2Pipeline, {
  organizationId: args.organizationId,
  userId: args.coachId,
});
```
**VERIFIED**: `ctx.runQuery` from an action handler is valid in Convex. Actions can call internal queries via ctx.runQuery.

## Rollout Strategy (Phase 7D Scripts)

### Per-Organization Enablement
```bash
npx -w packages/backend convex run scripts/enableV2ForOrg '{"organizationId": "...", "enabledBy": "admin"}'
```
Sets TWO flags at organization scope:
- `voice_notes_v2` (controls artifact creation + extractClaims)
- `entity_resolution_v2` (controls entity resolution + draft generation)

Both flags must be enabled together for the full v2 pipeline. If only `voice_notes_v2` is on, artifacts and transcripts are created but claims/drafts are not.

### Rollback
```bash
npx -w packages/backend convex run scripts/disableV2ForOrg '{"organizationId": "..."}'
```
Sets both flags to `enabled: false`. Existing artifacts remain but new notes use v1 pipeline only.

### Platform-Wide Enablement
Set the platform-scope flag to enable for ALL organizations:
```typescript
await ctx.runMutation(internal.lib.featureFlags.setFeatureFlag, {
  featureKey: "voice_notes_v2",
  scope: "platform",
  enabled: true,
  updatedBy: "admin",
});
```

## Index Verification

All cascade queries use proper indexes:
- Level 2: `by_featureKey_and_scope` (featureKey, scope) -- matches platform flags
- Level 3: `by_featureKey_scope_org` (featureKey, scope, organizationId) -- matches org flags
- Level 4: `by_featureKey_scope_user` (featureKey, scope, userId) -- matches user flags

All three indexes exist in schema.ts (lines 4141-4157). No new indexes needed.

## Consistency Across Calls

A single voice note processing flow may check `shouldUseV2Pipeline` multiple times:
1. `createTypedNote` checks it (Phase 7A)
2. `buildInsights` checks for artifacts (Phase 7A defense-in-depth)

Between these checks, the flag value could theoretically change if an admin toggles it. This is acceptable because:
- The defense-in-depth check uses artifact existence, not the flag
- If the flag changes mid-processing, the worst case is one note getting both v1 and v2 processing (not data corruption)

## Consequences

- Gradual rollout: enable per org, verify, expand
- Instant rollback: disable per org without data loss
- Environment variable provides emergency global kill switch
- Two separate feature keys (voice_notes_v2 + entity_resolution_v2) allow partial rollout
- No new indexes needed -- existing indexes cover all cascade levels
