# ADR-VN2-038: v2 Migration Status and Rollout Tooling

**Status**: Accepted
**Date**: 2026-02-08
**Phase**: 7D
**Story**: US-VN-029

## Context

Operators need tooling to:
1. Enable/disable v2 per organization (gradual rollout)
2. Check migration status (how many notes have v2 artifacts)
3. Run the migration script for historical data

The existing migration script (`actions/migration.ts`) is an `internalAction` and cannot be run via `convex run`. Scripts must be public queries/mutations/actions.

## Decision

Create four utility scripts in `packages/backend/convex/scripts/`:

### 1. enableV2ForOrg.ts (mutation)
Sets `voice_notes_v2` and `entity_resolution_v2` flags to `enabled: true` for a given org.
Must be a mutation (not query) because it calls `setFeatureFlag` internalMutation via `ctx.runMutation`.

### 2. disableV2ForOrg.ts (mutation)
Mirror of enableV2ForOrg with `enabled: false`.

### 3. v2MigrationStatus.ts (query)
Reports counts across all v2 tables for a given org. Some tables lack org-scoped indexes:

| Table | Org Index? | Query Strategy |
|-------|-----------|----------------|
| voiceNotes | by_orgId | withIndex |
| voiceNoteArtifacts | NONE | collect() + JS filter on orgContextCandidates |
| voiceNoteTranscripts | NONE (by_artifactId only) | collect() + JS filter via artifact lookup |
| voiceNoteClaims | by_organizationId | withIndex |
| voiceNoteEntityResolutions | NONE | collect() + JS filter via claim lookup |
| insightDrafts | by_org_and_coach_and_status | withIndex (partial, needs all 3 fields) |
| featureFlags | by_featureKey_scope_org | withIndex |

**Performance note**: This script collects entire tables for artifacts, transcripts, and entity resolutions. Acceptable for diagnostic use but would not scale for continuous monitoring. Consider adding `by_organizationId` index to `voiceNoteArtifacts` if migration status is needed frequently.

### 4. runMigration.ts (action)
Public wrapper around `internalAction migration.migrateVoiceNotesToV2`:
```typescript
export const runMigration = action({
  args: { organizationId: v.optional(v.string()), dryRun: v.boolean(), batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.runAction(internal.actions.migration.migrateVoiceNotesToV2, args);
  },
});
```

**Security note**: This is a public action with no auth check. Any authenticated user can run the migration. For production, consider adding a platform staff check. However, the migration is idempotent and creates no destructive changes (only adds data).

## Missing Index: voiceNoteArtifacts by_organizationId

The voiceNoteArtifacts table stores org context in `orgContextCandidates` (an array of objects). A direct `by_organizationId` index is not possible because the field is nested in an array. Options:

1. **Accept JS filter** (chosen for Phase 7D): Collect all artifacts, filter in JS.
2. **Add denormalized field**: Add `primaryOrganizationId: v.string()` to voiceNoteArtifacts and index it. Best for future if org-scoped artifact queries become common.
3. **Add a view table**: Create an `artifactOrgLookup` table for N:M org-artifact mapping.

For Phase 7D, Option 1 is acceptable since v2MigrationStatus is a diagnostic tool run infrequently.

## Consequences

- Operators can enable/disable v2 per org via CLI
- Migration status provides visibility into the v2 adoption gap
- Migration can be run via CLI (not just Convex dashboard)
- All scripts follow existing convention (camelCase filenames, public functions)
- No new indexes added in Phase 7D (diagnostic scripts accept full-table scans)
