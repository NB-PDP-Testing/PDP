# Legacy Table Analysis - Convex Schema

**Generated:** December 18, 2025  
**Purpose:** Document legacy tables vs new identity system tables and their current usage

---

## Executive Summary

The PDP platform has two parallel data models:

1. **Legacy System** - Flat `players` table with embedded parent info
2. **New Identity System** - Normalized multi-table structure with platform-level identities

Currently, **the frontend and core workflows are still primarily using the LEGACY system**, while the new identity tables have backend models but limited frontend integration.

---

## Table Classification

### 🔴 LEGACY TABLES (Still in Active Use)

| Table              | Usage Count      | Status               | Notes                                          |
| ------------------ | ---------------- | -------------------- | ---------------------------------------------- |
| `players`          | 20 frontend refs | **ACTIVE - PRIMARY** | Main player data, skills, parent info embedded |
| `teamPlayers`      | 3 backend files  | **ACTIVE**           | Legacy team membership joins                   |
| `injuries`         | 1 backend file   | **MINIMAL**          | Player injury tracking (legacy)                |
| `developmentGoals` | 1 backend file   | **MINIMAL**          | Player goals (legacy)                          |
| `medicalProfiles`  | 1 backend file   | **MINIMAL**          | Medical info (legacy)                          |

### 🟢 NEW IDENTITY TABLES (Partially Implemented)

| Table                     | Usage Count     | Status       | Notes                             |
| ------------------------- | --------------- | ------------ | --------------------------------- |
| `playerIdentities`        | 4 frontend refs | **PARTIAL**  | Platform-level player identity    |
| `guardianIdentities`      | 1 frontend ref  | **MINIMAL**  | Platform-level guardian identity  |
| `guardianPlayerLinks`     | 3 frontend refs | **PARTIAL**  | N:M guardian-player relationships |
| `orgPlayerEnrollments`    | 8 frontend refs | **GROWING**  | Org-specific player enrollment    |
| `orgGuardianProfiles`     | 1 frontend ref  | **MINIMAL**  | Org-specific guardian prefs       |
| `sportPassports`          | 3 frontend refs | **PARTIAL**  | Sport-specific skill tracking     |
| `skillAssessments`        | 4 frontend refs | **PARTIAL**  | Point-in-time skill records       |
| `passportGoals`           | Backend only    | **MINIMAL**  | Development goals (new system)    |
| `teamPlayerIdentities`    | Backend only    | **MINIMAL**  | New team membership               |
| `playerInjuries`          | Backend only    | **NOT USED** | Platform-level injuries           |
| `playerEmergencyContacts` | 1 frontend ref  | **MINIMAL**  | Adult player contacts             |

### 🟡 REFERENCE DATA TABLES (Active)

| Table              | Status     | Notes                        |
| ------------------ | ---------- | ---------------------------- |
| `sports`           | **ACTIVE** | Sport definitions            |
| `ageGroups`        | **ACTIVE** | Age group reference          |
| `skillCategories`  | **ACTIVE** | Skill groupings              |
| `skillDefinitions` | **ACTIVE** | Individual skill definitions |
| `skillBenchmarks`  | **ACTIVE** | NGB benchmark standards      |

### 🔵 APPLICATION TABLES (Active, Not Legacy)

| Table                     | Usage Count | Notes                      |
| ------------------------- | ----------- | -------------------------- |
| `members`                 | 26 refs     | Better Auth org membership |
| `teams`                   | 15 refs     | Better Auth teams          |
| `organizations`           | 14 refs     | Better Auth orgs           |
| `orgJoinRequests`         | 9 refs      | User org join requests     |
| `voiceNotes`              | 5 refs      | AI-powered coach notes     |
| `coaches`                 | 4 refs      | Coach assignments          |
| `coachAssignments`        | Backend     | Coach team/age assignments |
| `coachInsightPreferences` | Backend     | AI preferences             |
| `teamGoals`               | Backend     | Team-level goals           |
| `approvalActions`         | Backend     | Audit trail                |
| `orgDeletionRequests`     | Backend     | Org deletion workflow      |
| `demoAsks`                | 1 ref       | Demo request forms         |
| `todos`                   | Backend     | Simple todos (test)        |

---

## Frontend Pages Using Legacy `players` Table

### High-Usage Pages (Critical Migration Points)

1. **`/orgs/[orgId]/admin/gaa-import/page.tsx`**
   - `api.models.players.getPlayersByOrganization`
   - `api.models.players.createPlayerForImport`
   - `api.models.players.bulkImportPlayers`
   - `api.models.players.deletePlayer`
   - `api.models.players.addPlayerToTeam`

2. **`/orgs/[orgId]/admin/teams/page.tsx`**
   - `api.models.players.getPlayerCountByTeam`
   - `api.models.players.getPlayersByTeam`
   - `api.models.players.getPlayersByOrganization`
   - `api.models.players.addPlayerToTeam`
   - `api.models.players.removePlayerFromTeam`

3. **`/orgs/[orgId]/admin/users/page.tsx`**
   - `api.models.players.getPlayersByOrganization`
   - `api.models.players.linkPlayersToParent`
   - `api.models.players.unlinkPlayersFromParent`

4. **`/orgs/[orgId]/admin/users/approvals/page.tsx`**
   - `api.models.players.getSmartMatchesForParent`

5. **`/orgs/[orgId]/admin/coaches/page.tsx`**
   - `api.models.players.getPlayersByOrganization`

6. **`/orgs/[orgId]/admin/page.tsx`** (Admin Dashboard)
   - `api.models.players.getPlayersByOrganization`

7. **`/orgs/[orgId]/parents/page.tsx`**
   - `api.models.players.getPlayersForParent`

8. **`/orgs/[orgId]/players/[playerId]/page.tsx`** (Player Passport)
   - `api.models.players.getPlayerPassport`

---

## Backend Models Analysis

### Legacy `players.ts` Model Functions

Located in: `packages/backend/convex/models/players.ts`

Key functions still in use:

- `getPlayersByOrganization` - Lists all players for an org
- `getPlayersByTeam` - Players in a specific team
- `getPlayerCountByTeam` - Count players per team
- `createPlayerForImport` - Creates legacy player record
- `bulkImportPlayers` - Batch import players
- `deletePlayer` - Delete player
- `addPlayerToTeam` - Add to `teamPlayers` join table
- `removePlayerFromTeam` - Remove from team
- `getPlayersForParent` - Get players linked to parent email
- `getSmartMatchesForParent` - AI matching for parent-player links
- `linkPlayersToParent` - Set parent email on player
- `unlinkPlayersFromParent` - Clear parent link
- `getPlayerPassport` - Full player data for passport view

### New Identity System Files

These backend models exist but have **limited frontend integration**:

| File                         | Purpose                     | Frontend Integration |
| ---------------------------- | --------------------------- | -------------------- |
| `playerIdentities.ts`        | Platform player records     | Partial - some pages |
| `guardianIdentities.ts`      | Platform guardian records   | Minimal              |
| `guardianPlayerLinks.ts`     | Guardian-player N:M         | Partial              |
| `orgPlayerEnrollments.ts`    | Org-specific enrollment     | Growing              |
| `orgGuardianProfiles.ts`     | Org-specific guardian prefs | Minimal              |
| `sportPassports.ts`          | Sport skill tracking        | Partial              |
| `skillAssessments.ts`        | Skill assessment records    | Partial              |
| `passportGoals.ts`           | Development goals (new)     | Backend only         |
| `teamPlayerIdentities.ts`    | New team membership         | Backend only         |
| `playerInjuries.ts`          | Platform injuries           | Not used             |
| `playerEmergencyContacts.ts` | Adult contacts              | Minimal              |

---

## Data Model Comparison

### Legacy `players` Table Structure

```
players {
  name: string
  ageGroup: string
  sport: string
  gender: string
  organizationId: string
  season: string

  // Skills stored as JSON record
  skills: Record<string, number>

  // Parent info EMBEDDED in player record (denormalized)
  parentFirstName?: string
  parentSurname?: string
  parentEmail?: string
  parentPhone?: string
  parents?: Array<{id, firstName, surname, email, phone, relationship}>

  // Inferred parent data from imports
  inferredParentFirstName?: string
  inferredParentEmail?: string

  // All other fields: positions, fitness, notes, etc.
}
```

### New Identity System Structure

```
playerIdentities (Platform-level)
  ├── firstName, lastName, dateOfBirth, gender
  ├── playerType: "youth" | "adult"
  ├── userId (Better Auth link)
  └── verificationStatus

guardianIdentities (Platform-level)
  ├── firstName, lastName, email, phone
  ├── userId (Better Auth link)
  └── verificationStatus

guardianPlayerLinks (N:M relationship)
  ├── guardianIdentityId
  ├── playerIdentityId
  ├── relationship: "mother" | "father" | "guardian" | etc.
  ├── isPrimary, hasParentalResponsibility
  └── consentedToSharing (cross-org)

orgPlayerEnrollments (Org-specific)
  ├── playerIdentityId
  ├── organizationId
  ├── ageGroup, season, status
  └── attendance, notes

sportPassports (Sport-specific)
  ├── playerIdentityId
  ├── sportCode
  ├── organizationId
  ├── positions, ratings
  └── assessmentTracking

skillAssessments (Point-in-time)
  ├── passportId
  ├── skillCode
  ├── rating (1-5)
  ├── assessmentDate, assessmentType
  └── benchmarkComparison
```

---

## Migration Path Recommendations

### Phase 1: Parallel Operation (Current State)

- Legacy `players` table remains primary
- New identity tables used for specific features
- Both systems coexist

### Phase 2: Identity Bridge

- Create migration functions to sync `players` → `playerIdentities`
- Update import flows to create both records
- Add identity ID reference to legacy player records

### Phase 3: Frontend Migration

Priority order for page migration:

1. **Player Passport Page** (`/orgs/[orgId]/players/[playerId]`)
   - Should use `sportPassports` + `skillAssessments`
   - Currently uses `players.getPlayerPassport`

2. **Parent Dashboard** (`/orgs/[orgId]/parents`)
   - Should use `guardianPlayerLinks` + `orgPlayerEnrollments`
   - Currently uses `players.getPlayersForParent`

3. **Coach Assessment Flow**
   - Should use `skillAssessments` mutations
   - Currently updates `players.skills` record

4. **Admin Player List** (`/orgs/[orgId]/admin/players`)
   - Should use `orgPlayerEnrollments`
   - Currently uses `players.getPlayersByOrganization`

5. **Import Flows** (`gaa-import`, `player-import`)
   - Should create `playerIdentities` + `orgPlayerEnrollments`
   - Currently creates `players` records only

### Phase 4: Deprecation

- Remove legacy table mutations
- Archive legacy data
- Drop legacy tables

---

## Key Findings

### ⚠️ Critical Issues

1. **Player Passport page uses LEGACY data**
   - The core passport feature still reads from `players.skills`
   - New `sportPassports` and `skillAssessments` tables are not fully integrated

2. **Parent matching uses embedded email fields**
   - `parentEmail`, `inferredParentEmail` on `players` table
   - New `guardianPlayerLinks` system exists but not used for matching

3. **Team membership uses LEGACY `teamPlayers`**
   - Not using new `teamPlayerIdentities` table
   - Team management pages all use legacy joins

4. **Import flows create LEGACY records only**
   - GAA import, player import both create `players` records
   - Don't create `playerIdentities` or `orgPlayerEnrollments`

### ✅ What's Working with New System

1. **Reference data** - Sports, age groups, skill definitions active
2. **Skill benchmarks** - NGB standards in `skillBenchmarks` table
3. **Some enrollment queries** - `orgPlayerEnrollments` has 8 frontend refs
4. **Backend models ready** - All new identity models implemented

---

## Recommended Next Steps

1. **Create data synchronization** - Sync legacy `players` to `playerIdentities`
2. **Update Player Passport** - Read from `sportPassports` + `skillAssessments`
3. **Update skill assessment flow** - Write to `skillAssessments` table
4. **Update parent dashboard** - Use `guardianPlayerLinks`
5. **Update import flows** - Create identity records alongside legacy
6. **Gradual frontend migration** - Page by page, starting with passport

---

## Files to Review

### Backend (Legacy Model)

- `packages/backend/convex/models/players.ts` - All legacy CRUD operations

### Backend (New Identity Models)

- `packages/backend/convex/models/playerIdentities.ts`
- `packages/backend/convex/models/guardianIdentities.ts`
- `packages/backend/convex/models/guardianPlayerLinks.ts`
- `packages/backend/convex/models/orgPlayerEnrollments.ts`
- `packages/backend/convex/models/sportPassports.ts`
- `packages/backend/convex/models/skillAssessments.ts`

### Frontend (High Priority Migration)

- `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx` - Player Passport
- `apps/web/src/app/orgs/[orgId]/parents/page.tsx` - Parent Dashboard
- `apps/web/src/app/orgs/[orgId]/admin/teams/page.tsx` - Team Management
- `apps/web/src/app/orgs/[orgId]/admin/gaa-import/page.tsx` - Player Import
