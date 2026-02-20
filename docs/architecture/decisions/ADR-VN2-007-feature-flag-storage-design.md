# ADR-VN2-007: Feature Flag Storage Design

**Date:** 2026-02-06
**Status:** Accepted
**Context:** Phase 3 - v2 Artifacts Foundation, Stories US-VN-013, US-VN-014

## Context and Problem Statement

Phase 3 introduces a dual-path processing model where coaches can be on either the v1 or v2 voice notes pipeline. We need a mechanism to control which coaches use v2 at platform, organization, and individual user granularity. The system must support incremental rollout (10% -> 50% -> 100%) and instant rollback.

The PRD specifies a cascade evaluation order: environment variable -> platform flag -> organization flag -> user flag -> default false.

## Decision Drivers

- **Incremental rollout**: Must support enabling v2 per-org or per-coach without affecting others
- **Instant rollback**: Environment variable must override all database flags for emergency disable
- **Existing pattern**: `aiModelConfig` table already implements a feature/scope/org cascade lookup
- **Performance**: Feature flag evaluation happens on every incoming WhatsApp message; must be fast
- **Simplicity**: Avoid over-engineering; this is a temporary migration mechanism, not a full-featured flag system
- **Convex constraints**: Actions cannot access `ctx.db` directly; flag evaluation must be via `ctx.runQuery`

## Considered Options

### Option 1: New `featureFlags` Table with 3-Scope Cascade (Recommended)

Create a dedicated `featureFlags` table following the `aiModelConfig` pattern but extended with a `user` scope level. Use composite indexes for each scope tier.

**Schema:**
```typescript
featureFlags: defineTable({
  featureKey: v.string(),          // "voice_notes_v2"
  scope: v.union(v.literal("platform"), v.literal("organization"), v.literal("user")),
  organizationId: v.optional(v.string()),
  userId: v.optional(v.string()),
  enabled: v.boolean(),
  updatedBy: v.optional(v.string()),
  updatedAt: v.number(),
  notes: v.optional(v.string()),
})
```

**Pros:**
- Follows established `aiModelConfig` pattern (team familiarity)
- Supports per-user granularity (needed for coach-level rollout)
- Generic: can be reused for other features beyond voice notes v2
- Simple boolean evaluation (no complex config objects)
- Environment variable provides global override outside database

**Cons:**
- New table added to schema
- 3 separate queries per flag evaluation (platform, org, user) in worst case

### Option 2: Extend `aiModelConfig` Table

Add `voice_notes_v2` as a new feature in the existing `aiModelConfig` table.

**Rejected because:**
- `aiModelConfig` stores model configuration (provider, modelId, temperature) -- not boolean flags
- Only has `platform` and `organization` scopes, missing `user` scope
- Adding a `user` scope to `aiModelConfig` would require new indexes and retroactively changes the table's purpose
- Boolean feature flags are semantically different from AI model configuration

### Option 3: Environment Variables Only

Use Convex environment variables exclusively (e.g., `VOICE_NOTES_V2_ORG_<orgId>=true`).

**Rejected because:**
- Cannot be changed at runtime without redeployment
- No per-user granularity
- Unmanageable at scale (hundreds of org-specific env vars)
- No audit trail

### Option 4: Add Fields to Existing Tables (member.betaFeatures, organization.voiceNotesVersion)

Add boolean or settings fields to the Better Auth `member` and `organization` tables.

**Rejected because:**
- PRD explicitly notes these fields DO NOT EXIST on the tables
- Better Auth manages `member` and `organization` tables; adding custom fields creates maintenance burden
- Scattered flag storage (check org table, then member table) is harder to reason about than centralized flags
- No platform-level override capability

## Decision Outcome

**Chosen option: Option 1 (New `featureFlags` table)**

This provides the right balance of granularity, performance, and pattern consistency. The table is generic enough to support future feature flags beyond voice notes v2.

### Index Strategy

Three composite indexes, one per scope tier, ensure each cascade step is a single indexed lookup:

```typescript
.index("by_featureKey_and_scope", ["featureKey", "scope"])
.index("by_featureKey_scope_org", ["featureKey", "scope", "organizationId"])
.index("by_featureKey_scope_user", ["featureKey", "scope", "userId"])
```

- **`by_featureKey_and_scope`**: Used for platform-level lookup (`featureKey=X, scope=platform`). At most 1 result.
- **`by_featureKey_scope_org`**: Used for org-level lookup. All 3 fields in the index ensure a single document match.
- **`by_featureKey_scope_user`**: Used for user-level lookup. All 3 fields ensure a single document match.

### Evaluation Function Design

The PRD specifies `shouldUseV2Pipeline` as an `internalQuery`. This is correct because:
1. Actions call it via `ctx.runQuery(internal.lib.featureFlags.shouldUseV2Pipeline, { ... })`
2. Queries are idempotent and cacheable
3. Convex can optimize repeated evaluations within the same transaction

**Cascade order (first match wins):**
1. `process.env.VOICE_NOTES_V2_GLOBAL` === `"true"` -> return true; `"false"` -> return false
2. Platform flag (featureKey + scope=platform) -> return `enabled`
3. Org flag (featureKey + scope=organization + organizationId) -> return `enabled`
4. User flag (featureKey + scope=user + userId) -> return `enabled`
5. Default: return false

### Performance Analysis

Worst case (no env var, no flags set): 3 indexed queries to `featureFlags` table.
- Each query is a point lookup on a composite index -> O(1)
- Table will have very few rows (one per feature/scope/entity combination)
- Total overhead: ~3ms in worst case

Best case (env var set): 0 queries, pure in-memory check.

This is acceptable overhead for a function called once per incoming WhatsApp message.

## Implementation Notes

- **File location**: `packages/backend/convex/lib/featureFlags.ts` (shared lib, not models, because it's a utility used by multiple domains)
- **Also export**: `getFeatureFlag` (generic internalQuery for any feature key) and `setFeatureFlag` (internalMutation for admin toggling)
- **Admin UI**: Not needed in Phase 3. Flags will be set via Convex dashboard or scripts.
- **Audit trail**: `updatedBy` and `notes` fields provide basic audit. A full audit log table (like `aiModelConfigLog`) can be added later if needed.

## Consequences

### Positive
- Clean separation from AI model config
- Reusable for future feature flags
- Environment variable provides emergency override
- Per-coach granularity enables targeted beta testing

### Negative
- 3 queries per evaluation in worst case (acceptable given frequency)
- No built-in percentage-based rollout (must manually set per-org/per-user flags)

### Risks
- **Stale cache**: If Convex caches `internalQuery` results, flag changes may not take effect immediately. Mitigation: Convex reactivity ensures queries re-evaluate when underlying data changes.
- **Missing cleanup**: After full v2 migration, `featureFlags` rows for `voice_notes_v2` should be cleaned up. Add a note in Phase 6 checklist.
