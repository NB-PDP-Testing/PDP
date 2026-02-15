# PlayerARC - Phase 4.4: Sync Engine & Automation

> Auto-generated documentation - Last updated: 2026-02-15 23:40

## Status

- **Branch**: `ralph/phase-4.4-sync-engine`
- **Progress**: 5 / 8 stories complete
- **Phase Status**: 🔄 In Progress

## Completed Features

### US-P4.4-001: Create cron scheduler for automated syncs

As the platform, I need to automatically sync federation data nightly for all connected organizations without manual triggering.

**Acceptance Criteria:**
- Update packages/backend/convex/crons.ts
- Add federationSync cron job with schedule: '0 2 * * *' (2 AM daily)
- Cron calls scheduledFederationSync action
- scheduledFederationSync queries all active connectors with syncConfig.enabled = true
- For each enabled connector, get all connectedOrganizations
- Queue sync job for each organization (don't run all at once)
- Use rate limiting: sync max 5 organizations concurrently
- Call syncGAAMembers action from Phase 4.2 for each org
- Update connector's lastSyncAt timestamp after completion
- Log sync results: success/failure, duration, records synced
- Send notification to org admins on sync failures
- Run npx -w packages/backend convex codegen

### US-P4.4-002: Implement change detection for federation data

As the sync engine, I need to detect which fields changed between federation data and local data to avoid unnecessary updates.

**Acceptance Criteria:**
- Create packages/backend/convex/lib/federation/changeDetector.ts
- Implement detectChanges function: (federationData, localData) => ChangeSummary
- Compare each field: firstName, lastName, DOB, email, phone, address
- Return ChangeSummary: { hasChanges: boolean, changedFields: string[], conflicts: Conflict[] }
- A conflict occurs when: both federation and local modified since last sync, values differ
- Changed field = federation value differs from local value AND local not modified since last sync
- Use lastSyncedAt timestamp to determine if local data modified
- Handle null/undefined gracefully: null vs empty string = no change
- Normalize before comparing: trim whitespace, lowercase emails, normalize phone numbers
- Add TypeScript types: ChangeSummary, Conflict
- Run npx ultracite fix

### US-P4.4-003: Implement conflict resolution strategies

As an organization admin, I need configurable conflict resolution so I can choose whether federation or local data takes precedence when conflicts occur.

**Acceptance Criteria:**
- Add to packages/backend/convex/lib/federation/changeDetector.ts
- Implement resolveConflicts function: (conflicts, strategy) => ResolvedData
- Strategy 'federation_wins': always use federation value (default)
- Strategy 'local_wins': always keep local value
- Strategy 'merge': use federation for unmodified fields, local for modified fields
- merge strategy requires lastModifiedBy field to track who made changes
- Return ResolvedData: merged object with resolved values and resolution notes
- Resolution notes explain which strategy was used for each conflict
- Add validation: ensure strategy is one of: federation_wins, local_wins, merge
- Add TypeScript types: ConflictResolutionStrategy, ResolvedData
- Run npx ultracite fix and npm run check-types

### US-P4.4-004: Create sync engine orchestrator with conflict resolution

As the sync engine, I need to orchestrate the full sync process including change detection, conflict resolution, and atomic updates.

**Acceptance Criteria:**
- Create packages/backend/convex/actions/federationSyncEngine.ts
- Implement syncWithConflictResolution action with args: connectorId, organizationId, strategy
- Fetch federation data using connector's sync action (e.g., syncGAAMembers)
- For each federation member, find matching local player by externalIds
- If no match, create new player (no conflict)
- If match found, call detectChanges to identify changed fields and conflicts
- If conflicts exist, call resolveConflicts with configured strategy
- Apply resolved changes to local data atomically (all or nothing)
- Update player's lastSyncedAt timestamp
- Record sync in import session with conflict details
- Track stats: playersCreated, playersUpdated, conflictsDetected, conflictsResolved
- On error, rollback all changes and log failure
- Run npx -w packages/backend convex codegen and npm run check-types

### US-P4.4-005: Add sync queue to prevent concurrent syncs

As the platform, I need to prevent multiple syncs running concurrently for the same organization to avoid race conditions and data corruption.

**Acceptance Criteria:**
- Create packages/backend/convex/models/syncQueue.ts
- Add syncQueue table to schema: organizationId, connectorId, status (pending/running/completed/failed), startedAt, completedAt, error
- Add indexes: by_organizationId, by_status, by_org_and_status
- Implement enqueueSyncJob mutation: creates pending sync job
- Implement claimSyncJob mutation: atomically marks pending job as running
- claimSyncJob fails if another job already running for same org+connector
- Implement completeSyncJob mutation: marks job as completed, updates stats
- Implement failSyncJob mutation: marks job as failed, logs error
- Sync engine checks queue before starting: skip if job already running
- Add timeout: mark jobs as failed if running >30 minutes (likely stuck)
- Add getSyncQueueStatus query: returns queue status for organization
- Run npx -w packages/backend convex codegen


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Convex cron jobs use `crons.daily()`, `crons.hourly()`, `crons.interval()`, `crons.weekly()`
- Cron syntax: `{ hourUTC: 2, minuteUTC: 15 }` for daily jobs at specific times
- All cron jobs must call internal functions via `internal.<path>.<function>`
- Existing crons run at various times: 12 AM (budget), 1 AM (usage), 2 AM (reviews), 3 AM (cleanup), etc.
- Chose 2:15 AM to spread load from other 2 AM jobs
- Biome linter rejects `++` and `--` operators - must use `+= 1` instead
- Pre-commit hook runs lint-staged which enforces this
- Import paths for internal functions: `internal.actions.federationScheduler` (note: "actions" not "models")
--
- Biome prefers `type` over `interface` for TypeScript types

**Gotchas encountered:**
- Biome linter rejects `++` and `--` operators - must use `+= 1` instead
- Pre-commit hook runs lint-staged which enforces this
- Import paths for internal functions: `internal.actions.federationScheduler` (note: "actions" not "models")
- scheduledFederationSync depends on:
--
- Initial error: `v.record(v.string(), v.optional(v.string()))` is invalid
- Fix: Use `v.any()` with TypeScript type hint for Records with optional values
- Biome unsafe fixes can auto-convert interface to type declarations
- None - this is pure library code with no external dependencies
- Will be used by sync engine orchestrator (US-P4.4-004)

### Files Changed

- packages/backend/convex/actions/federationScheduler.ts (+215 new file)
- packages/backend/convex/crons.ts (+8, -1)
- ✅ Type check: passed (no new errors)
- ✅ Convex codegen: passed
- ✅ Linting: passed (fixed increment operators to use += instead of ++)
- ✅ Browser verification: N/A (backend-only change)
- Convex cron jobs use `crons.daily()`, `crons.hourly()`, `crons.interval()`, `crons.weekly()`
- Cron syntax: `{ hourUTC: 2, minuteUTC: 15 }` for daily jobs at specific times
- All cron jobs must call internal functions via `internal.<path>.<function>`
- Existing crons run at various times: 12 AM (budget), 1 AM (usage), 2 AM (reviews), 3 AM (cleanup), etc.
- Chose 2:15 AM to spread load from other 2 AM jobs
- Biome linter rejects `++` and `--` operators - must use `+= 1` instead
--
- packages/backend/convex/lib/federation/changeDetector.ts (+295 new file)
- ✅ Type check: passed (no new errors)


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
