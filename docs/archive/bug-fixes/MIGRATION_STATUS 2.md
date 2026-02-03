# Data Migration Status

**Date**: 2026-02-02
**Status**: SKIPPED - No teams in database

## Database State

Checked Better Auth `team` table for organization `jh7f6k14jw7j4sj9rr9dfzekr97xm9j7`:
- **Teams found**: 0 (empty table)
- **Coach assignments**: 2 records with legacy data (team names, not IDs)

## Migration Decision

The data migration script `packages/backend/convex/migrations/fixCoachTeams.ts` **cannot be run** because:

1. The `team` table is empty - no teams exist to map to
2. Migration would convert team names to IDs, but no IDs exist to convert to
3. Both Pattern A and Pattern B handle legacy data defensively, so no urgency

## When to Run Migration

Run the migration **after** teams are created in the database via:

**Option A**: Admin UI
- Navigate to `/admin/teams` as org admin
- Create teams manually
- Assign coaches to teams using team IDs (fixed admin UI now does this correctly)

**Option B**: Seed Script
- Run organization seed script if one exists
- Populates teams, players, coach assignments

**Option C**: Wait for Production Data
- Migration will be useful once real teams exist
- Can clean up legacy data at that time

## Migration Command (for future reference)

```bash
# When teams exist, run:
npx convex run migrations/fixCoachTeams:fix

# This will:
# - Convert team names → team IDs in coachAssignments.teams
# - Handle player ID corruption (rare case)
# - Return report of changes made
```

## Current State

With admin UI fix (commit `0b48f2dd`), future coach assignments will be saved correctly:
- ✅ Admin UI now saves team IDs directly
- ✅ No new corruption will occur
- ⚠️ Existing 2 assignments have legacy data (handled defensively by queries)

## Recommendation

**Accept current state** - No action needed until test data exists.

The Pattern B migration is complete and working correctly with empty database (shows appropriate empty states).
