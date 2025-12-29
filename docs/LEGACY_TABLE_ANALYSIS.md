# Legacy Table Analysis - Convex Schema

**Generated:** December 18, 2025  
**Updated:** December 22, 2025
**Purpose:** Document legacy tables vs new identity system tables and their current usage

---

## Executive Summary

The PDP platform has **completed the migration** from the legacy flat `players` table to the new normalized identity system. 

### Migration Status: ✅ COMPLETE

| Category | Status |
|----------|--------|
| Frontend pages | 100% migrated |
| Core data queries | 100% using new system |
| Parent-player linking | 100% using new system |
| Coach assessment flow | 100% using new system |
| Voice notes | 100% using new system |
| Goals | 100% using new system |
| Injuries | 100% using new system |

---

## Migration Completed (December 22, 2025)

### Backend Changes

1. **`guardianPlayerLinks.ts`** - Added new APIs:
   - `linkPlayersToGuardian` - Replaces `players.linkPlayersToParent`
   - `unlinkPlayersFromGuardian` - Replaces `players.unlinkPlayersFromParent`
   - `getLinkedChildrenInOrg` - Get children for a guardian in an org
   - `getSmartMatchesForGuardian` - Replaces `players.getSmartMatchesForParent`

2. **`members.ts`** - Updated `getMembersWithDetails`:
   - Now uses `guardianIdentities` table (by email index)
   - Now uses `guardianPlayerLinks` table (by guardian index)
   - Now uses `orgPlayerEnrollments` table (by player and org index)
   - No longer queries legacy `players` table

---

## Current Legacy Table Status

### 🟡 LEGACY TABLES (Deprecated but still in schema)

| Table              | Frontend Refs | Backend Refs | Status               | Notes                                          |
| ------------------ | ------------- | ------------ | -------------------- | ---------------------------------------------- |
| `players`          | 0 | Some | **DEPRECATED** | Legacy queries still work, writes blocked |
| `teamPlayers`      | 0 | Some | **DEPRECATED** | Legacy team membership |
| `injuries`         | 0 | 0 | **DEPRECATED** | All code uses `playerInjuries` |
| `developmentGoals` | 0 | 0 | **DEPRECATED** | All code uses `passportGoals` |
| `medicalProfiles`  | 0 | 0 | **DEPRECATED** | Not used |

### Remaining Legacy Code (Backend Only)

The legacy `players.ts` model file still exists with these functions:
- `getPlayersByOrganization` - Legacy list (unused by frontend)
- `getPlayersByTeam` - Legacy team query (unused by frontend)
- `getPlayersForCoach` - Legacy coach query (unused by frontend)
- `getPlayersForParent` - Legacy parent query (unused by frontend)
- `createPlayer` / `updatePlayer` / `deletePlayer` - Legacy CRUD (unused)
- `bulkImportPlayers` - Legacy import (still used for GAA imports)
- `getSmartMatchesForParent` - **Replaced by** `guardianPlayerLinks.getSmartMatchesForGuardian`
- `linkPlayersToParent` - **Replaced by** `guardianPlayerLinks.linkPlayersToGuardian`
- `unlinkPlayersFromParent` - **Replaced by** `guardianPlayerLinks.unlinkPlayersFromGuardian`

---

## ✅ MIGRATED - All Using New System

### Frontend Pages (All Migrated)

| Page | Previous Legacy API | Now Using |
|------|---------------------|-----------|
| `/admin/users` | `players.getPlayersByOrganization` | `orgPlayerEnrollments.getPlayersForOrg` |
| `/admin/users` | `players.linkPlayersToParent` | `guardianPlayerLinks.linkPlayersToGuardian` |
| `/admin/users` | `players.unlinkPlayersFromParent` | `guardianPlayerLinks.unlinkPlayersFromGuardian` |
| `/admin/users/approvals` | `players.getSmartMatchesForParent` | `guardianPlayerLinks.getSmartMatchesForGuardian` |
| `/admin/coaches` | `players.getPlayersByOrganization` | `orgPlayerEnrollments.getPlayersForOrg` |
| `/parents` | `players.getPlayersForParent` | `useGuardianChildrenInOrg` hook |
| `/players/[playerId]` | `players.getPlayerPassport` | `sportPassports.getFullPlayerPassportView` |
| `/coach/assess` | `players.skills` updates | `skillAssessments` table |
| `/coach/goals` | `developmentGoals` table | `passportGoals` table |
| `/coach/injuries` | `injuries` table | `playerInjuries` table |
| Voice notes insights | `players.playerId` | `playerIdentities.playerIdentityId` |

### Backend Functions (All Migrated)

| Function | Previous Implementation | Now Using |
|----------|-------------------------|-----------|
| `getMembersWithDetails` | Queried `players` table | Uses `guardianIdentities`, `guardianPlayerLinks`, `orgPlayerEnrollments` |

---

## 🟢 NEW IDENTITY TABLES (Active)

| Table                     | Usage Count     | Status       | Notes                             |
| ------------------------- | --------------- | ------------ | --------------------------------- |
| `playerIdentities`        | High | **ACTIVE**  | Platform-level player identity    |
| `guardianIdentities`      | High | **ACTIVE**  | Platform-level guardian identity  |
| `guardianPlayerLinks`     | High | **ACTIVE**  | N:M guardian-player relationships |
| `orgPlayerEnrollments`    | High | **ACTIVE**  | Org-specific player enrollment    |
| `sportPassports`          | High | **ACTIVE**  | Sport-specific skill tracking     |
| `skillAssessments`        | High | **ACTIVE**  | Point-in-time skill records       |
| `passportGoals`           | High | **ACTIVE**  | Development goals (new system)    |
| `playerInjuries`          | High | **ACTIVE**  | Platform-level injuries           |
| `teamPlayerIdentities`    | Medium | **ACTIVE**  | New team membership               |

---

## Data Status

### Legacy Tables (Empty - No Migration Needed)
```
players: 0 records in new orgs
injuries: 0 records
developmentGoals: 0 records
```

### New System Data
```
playerInjuries: Active
passportGoals: Active
skillAssessments: Active
sportPassports: Active
guardianPlayerLinks: Active
```

---

## Cleanup Recommendations

### Phase 1: Frontend Update (DONE)
- ✅ Update admin/users page to use new APIs
- ✅ Update admin/users/approvals page to use new APIs
- ✅ Update parent dashboard to use identity system

### Phase 2: Backend Cleanup (Future)
1. **Remove unused exports from `players.ts`** - Keep only:
   - `bulkImportPlayers` (still used for GAA imports)
   - `getPlayersByOrgId` (internal query for AI processing)

2. **Consider deprecating legacy tables**:
   - `players` → Data stored in `playerIdentities` + `orgPlayerEnrollments`
   - `teamPlayers` → Data stored in `teamPlayerIdentities`
   - `injuries` → Data stored in `playerInjuries`
   - `developmentGoals` → Data stored in `passportGoals`

### Phase 3: Schema Cleanup (Future)
- Remove legacy table definitions from schema (after confirming no data needs migration)
- Update all remaining internal queries to use identity system

---

## Data Migration Guide

For developers who have not yet migrated their backend from the legacy tables to the identity system, the following migration scripts are available in `packages/backend/convex/migrations/migrateLegacyData.ts`.

### Prerequisites

Before migrating, ensure:
1. Players exist in `playerIdentities` table
2. Players are enrolled in `orgPlayerEnrollments`
3. Sport passports exist in `sportPassports` (for goals migration)

### Step 1: Preview Migration Status

First, check what data needs to be migrated:

```bash
# Via Convex Dashboard or CLI
npx convex run migrations/migrateLegacyData:getMigrationPreview '{}'

# For specific organization
npx convex run migrations/migrateLegacyData:getMigrationPreview '{"organizationId": "org_xxx"}'
```

This returns:
- Count of legacy records (injuries, goals, players with notes)
- Count of existing records in new system
- Player matching results (how many can be matched to identities)

### Step 2: Migrate Injuries

Migrates `injuries` → `playerInjuries`:

```bash
# Dry run first (no changes made)
npx convex run migrations/migrateLegacyData:migrateInjuries '{"dryRun": true}'

# Actual migration
npx convex run migrations/migrateLegacyData:migrateInjuries '{"dryRun": false}'

# With batch size (default 50)
npx convex run migrations/migrateLegacyData:migrateInjuries '{"dryRun": false, "batchSize": 100}'

# For specific org
npx convex run migrations/migrateLegacyData:migrateInjuries '{"organizationId": "org_xxx", "dryRun": false}'
```

**Field Mappings:**
| Legacy Field | New Field | Notes |
|--------------|-----------|-------|
| `playerId` | `playerIdentityId` | Matched by name + DOB |
| `severity` | `severity` | "Minor" → "minor" |
| `status` | `status` | "Active" → "active" |
| `relatedToMatch` | `occurredDuring` | true → "match" |
| `relatedToTraining` | `occurredDuring` | true → "training" |

### Step 3: Migrate Goals

Migrates `developmentGoals` → `passportGoals`:

```bash
# Dry run first
npx convex run migrations/migrateLegacyData:migrateGoals '{"dryRun": true}'

# Actual migration
npx convex run migrations/migrateLegacyData:migrateGoals '{"dryRun": false}'
```

**Field Mappings:**
| Legacy Field | New Field | Notes |
|--------------|-----------|-------|
| `playerId` | `playerIdentityId` | Matched by name + DOB |
| `category` | `category` | "Technical" → "technical", "Team" → "social" |
| `priority` | `priority` | "High" → "high" |
| `status` | `status` | "Not Started" → "not_started" |
| `coachNotes[]` | `coachNotes` | Combined into single string |
| `playerNotes[]` | `playerNotes` | Combined into single string |

### Step 4: Migrate Coach Notes

Migrates `players.coachNotes` → `orgPlayerEnrollments.coachNotes`:

```bash
# Dry run first
npx convex run migrations/migrateLegacyData:migrateCoachNotes '{"dryRun": true}'

# Actual migration
npx convex run migrations/migrateLegacyData:migrateCoachNotes '{"dryRun": false}'
```

### Handling Migration Errors

The migration scripts return:
```typescript
{
  processed: number,    // Records attempted
  migrated: number,     // Successfully migrated
  skipped: number,      // Already existed or no match
  errors: Array<{
    playerId: string,
    playerName: string,
    error: string       // "No matching playerIdentity found"
  }>,
  remaining: number     // Records not yet processed
}
```

**Common errors and fixes:**

1. **"No matching playerIdentity found"**
   - The legacy player has no corresponding `playerIdentity` record
   - Fix: Create the player identity first, or manually link by updating the migration script

2. **"No sportPassport found for player"**
   - Player exists but has no sport passport (required for goals)
   - Fix: Create a sport passport for the player first

3. **"No enrollment found in orgPlayerEnrollments"**
   - Player identity exists but not enrolled in the org
   - Fix: Create an enrollment record for the player

### Running Migrations in Production

⚠️ **Important**: Always run with `dryRun: true` first!

```bash
# 1. Preview
npx convex run migrations/migrateLegacyData:getMigrationPreview '{}'

# 2. Dry run each migration
npx convex run migrations/migrateLegacyData:migrateInjuries '{"dryRun": true}'
npx convex run migrations/migrateLegacyData:migrateGoals '{"dryRun": true}'
npx convex run migrations/migrateLegacyData:migrateCoachNotes '{"dryRun": true}'

# 3. Run actual migrations in batches
npx convex run migrations/migrateLegacyData:migrateInjuries '{"dryRun": false, "batchSize": 50}'
# Repeat until remaining: 0

npx convex run migrations/migrateLegacyData:migrateGoals '{"dryRun": false, "batchSize": 50}'
# Repeat until remaining: 0

npx convex run migrations/migrateLegacyData:migrateCoachNotes '{"dryRun": false, "batchSize": 50}'
# Repeat until remaining: 0
```

### Post-Migration Verification

After migration, verify:

1. **Injuries**: Check `playerInjuries` has expected count
2. **Goals**: Check `passportGoals` has expected count
3. **Coach Notes**: Sample check `orgPlayerEnrollments.coachNotes`

```bash
# Via Convex Dashboard
# Query playerInjuries table
# Query passportGoals table
# Spot-check some enrollments for coachNotes
```

---

## Summary

The platform has successfully migrated **100%** of frontend and core backend functionality to the new identity-based tables. The legacy tables remain in the schema for backwards compatibility but are no longer actively used.

### Key Migrations Completed:
1. ✅ Parent-player linking now uses `guardianPlayerLinks`
2. ✅ Smart matching now uses identity tables
3. ✅ `getMembersWithDetails` now uses identity tables
4. ✅ All frontend pages use new APIs

### What Remains (Low Priority):
- Legacy `players.ts` file can be cleaned up
- Legacy table schema definitions can be removed after data audit
