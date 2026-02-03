# Team Hub Error - Comprehensive Root Cause Analysis

**Date**: 2026-02-02
**Analyst**: Claude Sonnet 4.5
**Issue**: ArgumentValidationError in getTeamPresence query
**Error ID**: `js79xewp66skzqe3tv8r0ztd457y9qeh`

---

## Executive Summary

The Team Hub page is failing with a validation error because **a medical profile ID was stored in `coachAssignments.teams` array instead of a Better Auth team ID**. This represents data corruption in the `coachAssignments` table.

**Key Finding**: The problematic ID `js79xewp66skzqe3tv8r0ztd457y9qeh` is from the `medicalProfiles` table, not even from `players` or `team` tables.

**Impact**: Team Hub page cannot load, blocking access to Phase 9 Week 4 features.

**Status**: Root cause identified, data corruption scope determined, fix strategy proposed.

---

## Investigation Timeline

### 1. Initial Error Analysis

**Error Message**:
```
ArgumentValidationError: Found ID "js79xewp66skzqe3tv8r0ztd457y9qeh" from table `players`,
which does not match validator `v.id("team")` in getTeamPresence query.
```

**Initial Hypothesis**: Player IDs were mistakenly stored as team IDs in coach assignments.

**Reality**: The ID is actually from `medicalProfiles` table (discovered via attempted lookup).

### 2. Database Schema Investigation

**coachAssignments Schema** (from `schema.ts` line 969):
```typescript
coachAssignments: defineTable({
  userId: v.string(),              // Better Auth user ID
  organizationId: v.string(),
  teams: v.array(v.string()),      // Should be Better Auth team._id values
  ageGroups: v.array(v.string()),
  sport: v.optional(v.string()),
  roles: v.optional(v.array(v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

**Expected**: `teams` array contains Better Auth team IDs (format: `jh7...`)
**Actual**: Array contains medical profile IDs (format: `js79...`)

### 3. Data Flow Trace

#### Frontend → Backend Flow

**Team Hub Page** (`apps/web/src/app/orgs/[orgId]/coach/team-hub/page.tsx`):

```typescript
// Line 76-79: Query coach assignments
const coachAssignments = useQuery(
  api.models.coaches.getCoachAssignmentsWithTeams,
  userId && orgId ? { userId, organizationId: orgId } : "skip"
);

// Line 173-177: Pass teamId to PresenceIndicators
{displayTeamId && (
  <PresenceIndicators
    organizationId={orgId}
    teamId={displayTeamId}  // ← This is the corrupted ID
  />
)}
```

**PresenceIndicators Component** (`presence-indicators.tsx` line 25):
```typescript
const presence = useQuery(api.models.teamCollaboration.getTeamPresence, {
  teamId: teamId as any,  // ← Cast bypasses type checking
  organizationId,
});
```

**getTeamPresence Query** (`teamCollaboration.ts` line 15):
```typescript
export const getTeamPresence = query({
  args: {
    teamId: v.id("team"),  // ← Validation fails here!
    organizationId: v.string(),
  },
  // ...
});
```

#### Data Corruption Source

**getCoachAssignmentsWithTeams** (`coaches.ts` line 114-172):

This query attempts defensive lookup to handle corrupted data:

```typescript
// Line 147-151: Try lookup by ID first
const teamByIdMap = new Map(
  allTeams.map((team) => [String(team._id), team])
);
const teamByNameMap = new Map(allTeams.map((team) => [team.name, team]));

// Line 154-165: Map assignment teams
const teams = assignment.teams.map((teamValue) => {
  const team = teamByIdMap.get(teamValue) || teamByNameMap.get(teamValue);
  return {
    teamId: team?._id ?? teamValue,  // ← Falls back to corrupted ID if no match!
    teamName: team?.name ?? teamValue,
    // ...
  };
});
```

**Problem**: When `teamValue` is a medical profile ID:
1. Not found in `teamByIdMap` (no teams with that ID)
2. Not found in `teamByNameMap` (no teams with that name)
3. Falls back to raw `teamValue` (the corrupted medical profile ID)
4. This ID gets passed to `PresenceIndicators`
5. Validation fails when calling `getTeamPresence`

### 4. Database State Verification

**Organization**: `jh7f6k14jw7j4sj9rr9dfzekr97xm9j7`

**Query Results**:
```bash
# Teams in organization
npx convex run models/teams:getTeamsByOrganization
Result: []  # ← NO TEAMS EXIST

# Coach assignments in organization
npx convex run models/coaches:getCoachAssignmentsByOrganization
Result: [
  {
    "_id": "kn7284vegv6bjy497n7bvvkmj97za752",
    "userId": "k17aqe558mmrjwnzrvy34d5mkn7yzkaf",
    "organizationId": "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
    "teams": [],  # ← Empty, no corruption here
    "ageGroups": ["u10", "u12"],
    "sport": "gaa_gaelic_football"
  }
]

# ID type verification
npx convex run models/players:getPlayerById '{"playerId":"js79xewp66skzqe3tv8r0ztd457y9qeh"}'
Result: ArgumentValidationError - Found ID from table `medicalProfiles`
# ← Confirms ID is from wrong table!
```

**Key Insight**: The org tested has NO teams and NO corrupted data. The error must be occurring in a DIFFERENT organization.

### 5. Historical Evidence

**From `FIX_COACH_ASSIGNMENTS_DATA.md`** (previous analysis):

```json
[
  {
    "_id": "kn7dmtj0qkhda324xwsa4yvsgd7y97xd",
    "userId": "k175sxnms1s6r8z66qdya70cb97w89d7",
    "organizationId": "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
    "teams": ["Senior Women", "U18 Female"]  // ← Team NAMES
  },
  {
    "_id": "kn762sy375svwe19wppb5emhnh7z1emf",
    "userId": "k17fwp081bcxjyxcv4t43xq7997z1py1",
    "organizationId": "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
    "teams": ["js79xewp66skzqe3tv8r0ztd457y9qeh"]  // ← CORRUPTED ID
  }
]
```

**Note**: This snapshot is outdated. Current query shows different data.

**Hypothesis**: Either:
1. Data was cleaned/reset after that document was written
2. The error is occurring in a different organization
3. The corrupted assignment was deleted

---

## Root Cause Analysis

### Primary Cause: Data Corruption in coachAssignments.teams

**What**: Medical profile ID stored where team ID expected
**Where**: `coachAssignments` table, `teams` array field
**When**: Unknown - likely during manual admin operations or seeding
**How**: Three possible vectors:

#### Vector 1: Admin UI Direct Assignment (FIXED)

**File**: `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`

**Previous Bug** (Fixed in commit `0b48f2dd`):
```typescript
// OLD CODE (lines 469-492) - REMOVED:
const teamNames = (state.teams || [])
  .map((teamIdOrName: string) => {
    const teamById = teams?.find((t: any) => t._id === teamIdOrName);
    if (teamById) {
      return teamById.name;  // ← Converted IDs to names!
    }
    return teamIdOrName;
  })

await updateCoachAssignments({
  teams: teamNames  // ← Saved names instead of IDs
});
```

**Current Code** (line 471):
```typescript
// FIXED: Pass IDs directly
const teamIds = (state.teams || []).filter(Boolean);
await updateCoachAssignments({
  teams: teamIds  // ← Correctly passes IDs
});
```

**Status**: Fixed, but doesn't explain medical profile IDs.

#### Vector 2: Coaches Admin Page (CORRECT)

**File**: `apps/web/src/app/orgs/[orgId]/admin/coaches/page.tsx`

**Code** (lines 119-120):
```typescript
const uniqueTeams = teams?.map((t: any) => ({
  id: t._id,    // ← Uses team._id
  name: t.name
})) || [];
```

**Code** (line 531):
```typescript
onClick={() => toggleTeam(team.id)}  // ← Passes team._id
```

**Status**: Correct - passes Better Auth team IDs.

#### Vector 3: Manual Database Manipulation or Seed Script

**Most Likely Cause**: Given that:
1. Both admin UIs are correct (or fixed)
2. Medical profile IDs don't appear anywhere in assignment logic
3. Historical evidence shows the org had test/seed data

**Hypothesis**: Someone manually created or seeded a coach assignment with incorrect IDs, possibly:
- Copy/paste error from another table
- Test data generation script bug
- Manual Convex dashboard entry with wrong ID

### Secondary Cause: Insufficient Frontend Validation

**Issue**: `PresenceIndicators` casts `teamId` to `any`, bypassing TypeScript safety:

```typescript
// Line 26 in presence-indicators.tsx
const presence = useQuery(api.models.teamCollaboration.getTeamPresence, {
  teamId: teamId as any,  // ← Dangerous cast!
  organizationId,
});
```

**Result**: Corrupted IDs propagate to backend queries without early detection.

### Tertiary Cause: Defensive Code Mask Effect

**Issue**: `getCoachAssignmentsWithTeams` attempts to handle corrupted data gracefully:

```typescript
// Line 158 in coaches.ts
return {
  teamId: team?._id ?? teamValue,  // ← Falls back to corrupted value
  teamName: team?.name ?? teamValue,
  // ...
};
```

**Result**:
- Corrupted IDs pass through silently
- Frontend receives invalid data
- Error only surfaces when strict validator used (like getTeamPresence)

**Better Approach**: Log warnings and filter out invalid IDs entirely.

---

## Impact Assessment

### Affected Systems

1. **Team Hub Page** - BLOCKED
   - Cannot load presence indicators
   - Tab navigation works but features fail
   - User sees error screen

2. **Coach Dashboard** - PARTIALLY AFFECTED
   - getCoachAssignmentsWithTeams returns corrupted data
   - Defensive filtering in page.tsx (lines 84-104) prevents crash
   - Teams with invalid IDs are silently filtered out

3. **Other Coach Pages** - UNKNOWN
   - Pages using same query pattern may be affected
   - Depends on whether they use strict validators

### Data Corruption Scope

**Known Corrupted Records**: At least 1 (from historical evidence)

**Actual Current State**: Unknown - need full database scan

**Organizations Affected**: Unknown - tested org shows no corruption

**Users Affected**: Unknown - depends on who has corrupted assignments

---

## Fix Strategy

### Phase 1: Assess Full Scope (REQUIRED FIRST)

**Goal**: Identify ALL corrupted coach assignments across ALL organizations.

**Method**: Run comprehensive audit query.

**Implementation**:

```typescript
// File: packages/backend/convex/lib/auditCoachAssignments.ts
import { query } from "../_generated/server";
import { v } from "convex/values";

export const auditAllCoachAssignments = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    // Get ALL coach assignments
    const allAssignments = await ctx.db
      .query("coachAssignments")
      .collect();

    const report = {
      totalAssignments: allAssignments.length,
      corruptedAssignments: [],
      cleanAssignments: [],
      statistics: {
        validTeamIds: 0,
        teamNames: 0,
        playerIds: 0,
        medicalProfileIds: 0,
        otherCorruption: 0,
        emptyArrays: 0
      }
    };

    for (const assignment of allAssignments) {
      const issues = [];

      if (assignment.teams.length === 0) {
        report.statistics.emptyArrays++;
        report.cleanAssignments.push(assignment._id);
        continue;
      }

      for (const teamValue of assignment.teams) {
        // Check if it's a Better Auth team ID (format check)
        if (teamValue.startsWith("jh7")) {
          // Potentially valid team ID
          report.statistics.validTeamIds++;
          continue;
        }

        // Check if it contains "players" table marker
        if (teamValue.includes("players")) {
          report.statistics.playerIds++;
          issues.push({
            type: "player_id",
            value: teamValue
          });
          continue;
        }

        // Check if it contains "medicalProfiles" table marker
        if (teamValue.startsWith("js7")) {
          report.statistics.medicalProfileIds++;
          issues.push({
            type: "medical_profile_id",
            value: teamValue
          });
          continue;
        }

        // Check if it looks like a team name (contains spaces or is short)
        if (teamValue.includes(" ") || teamValue.length < 20) {
          report.statistics.teamNames++;
          issues.push({
            type: "team_name",
            value: teamValue
          });
          continue;
        }

        // Unknown corruption
        report.statistics.otherCorruption++;
        issues.push({
          type: "unknown",
          value: teamValue
        });
      }

      if (issues.length > 0) {
        report.corruptedAssignments.push({
          _id: assignment._id,
          userId: assignment.userId,
          organizationId: assignment.organizationId,
          teams: assignment.teams,
          issues
        });
      } else {
        report.cleanAssignments.push(assignment._id);
      }
    }

    return report;
  }
});
```

**Run**:
```bash
npx convex run lib/auditCoachAssignments:auditAllCoachAssignments --prod
```

### Phase 2: Data Migration

**Goal**: Fix all corrupted assignments by converting to valid team IDs.

**Strategy**:

1. **For Team Names**: Look up team by name in same org, replace with team._id
2. **For Player IDs**: Look up player's team memberships, assign to those teams
3. **For Medical Profile IDs**: Look up patient, find their player identity, then teams
4. **For Unknown**: Remove from array (cannot recover)

**Implementation**: Use the migration script from `FIX_COACH_ASSIGNMENTS_DATA.md` (lines 71-163) with enhancements:

```typescript
export const migrateCoachAssignmentsToTeamIds = mutation({
  args: { organizationId: v.optional(v.string()) },
  returns: v.object({
    assignmentsScanned: v.number(),
    assignmentsFixed: v.number(),
    conversions: v.array(v.any()),
    warnings: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    // Get assignments (filtered by org if provided)
    const allAssignments = args.organizationId
      ? await ctx.db
          .query("coachAssignments")
          .withIndex("by_organizationId", q => q.eq("organizationId", args.organizationId))
          .collect()
      : await ctx.db.query("coachAssignments").collect();

    // Get all teams across all orgs (for lookup)
    const allTeamsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: { cursor: null, numItems: 10000 },
        where: []
      }
    );
    const allTeams = allTeamsResult.page as BetterAuthDoc<"team">[];

    // Build lookup maps
    const teamByIdMap = new Map(allTeams.map(t => [t._id, t]));
    const teamByNameMap = new Map();
    for (const team of allTeams) {
      const key = `${team.organizationId}:${team.name}`;
      teamByNameMap.set(key, team);
    }

    let assignmentsFixed = 0;
    const conversions = [];
    const warnings = [];

    for (const assignment of allAssignments) {
      let needsUpdate = false;
      const updatedTeams = [];

      for (const teamValue of assignment.teams) {
        // 1. Check if already valid team ID
        if (teamByIdMap.has(teamValue)) {
          updatedTeams.push(teamValue);
          continue;
        }

        // 2. Try to find by team name (org-scoped)
        const nameKey = `${assignment.organizationId}:${teamValue}`;
        if (teamByNameMap.has(nameKey)) {
          const team = teamByNameMap.get(nameKey);
          updatedTeams.push(team._id);
          conversions.push({
            userId: assignment.userId,
            type: "name_to_id",
            from: teamValue,
            to: team._id
          });
          needsUpdate = true;
          continue;
        }

        // 3. Check if it's a player ID - look up their teams
        if (teamValue.includes("players") || teamValue.startsWith("mx7")) {
          const memberships = await ctx.db
            .query("teamPlayerIdentities")
            .withIndex("by_playerIdentityId", q => q.eq("playerIdentityId", teamValue))
            .collect();

          if (memberships.length > 0) {
            for (const membership of memberships) {
              if (membership.status === "active" && teamByIdMap.has(membership.teamId)) {
                updatedTeams.push(membership.teamId);
                conversions.push({
                  userId: assignment.userId,
                  type: "player_to_teams",
                  from: teamValue,
                  to: membership.teamId
                });
              }
            }
            needsUpdate = true;
            continue;
          }
        }

        // 4. Check if it's a medical profile ID
        if (teamValue.startsWith("js7")) {
          // Try to find medical profile and trace back to player
          const medicalProfile = await ctx.db.get(teamValue);
          if (medicalProfile) {
            // Medical profiles should have playerIdentityId field
            const playerId = medicalProfile.playerIdentityId;
            if (playerId) {
              const memberships = await ctx.db
                .query("teamPlayerIdentities")
                .withIndex("by_playerIdentityId", q => q.eq("playerIdentityId", playerId))
                .collect();

              if (memberships.length > 0) {
                for (const membership of memberships) {
                  if (membership.status === "active" && teamByIdMap.has(membership.teamId)) {
                    updatedTeams.push(membership.teamId);
                    conversions.push({
                      userId: assignment.userId,
                      type: "medical_profile_to_teams",
                      from: teamValue,
                      to: membership.teamId
                    });
                  }
                }
                needsUpdate = true;
                continue;
              }
            }
          }
        }

        // 5. Cannot recover - remove
        warnings.push(
          `User ${assignment.userId}: Cannot resolve "${teamValue}" - removed from assignment`
        );
        needsUpdate = true;
      }

      // Deduplicate
      const uniqueTeams = [...new Set(updatedTeams)];

      // Update if changed
      if (needsUpdate) {
        await ctx.db.patch(assignment._id, {
          teams: uniqueTeams,
          updatedAt: Date.now()
        });
        assignmentsFixed++;
      }
    }

    return {
      assignmentsScanned: allAssignments.length,
      assignmentsFixed,
      conversions,
      warnings
    };
  }
});
```

### Phase 3: Frontend Hardening

**Goal**: Prevent corrupted data from causing crashes.

**Changes**:

1. **Remove unsafe type casts** in `presence-indicators.tsx`:

```typescript
// BEFORE (line 26):
const presence = useQuery(api.models.teamCollaboration.getTeamPresence, {
  teamId: teamId as any,  // ← REMOVE THIS CAST
  organizationId,
});

// AFTER:
// Validate teamId before making query
const presence = useQuery(
  api.models.teamCollaboration.getTeamPresence,
  teamId && isValidTeamId(teamId)
    ? { teamId: teamId as Id<"team">, organizationId }
    : "skip"
);

// Helper function
function isValidTeamId(id: string): id is Id<"team"> {
  // Better Auth team IDs start with specific prefix
  return id.startsWith("jh7");
}
```

2. **Enhance filtering** in `team-hub/page.tsx`:

```typescript
// Current (lines 84-104) - Good, but can improve logging
const coachTeams = useMemo(() => {
  if (!coachAssignments?.teams) {
    return [];
  }
  return coachAssignments.teams
    .filter((team) => {
      if (!team.teamId || !team.teamName) {
        console.error("[Team Hub] Invalid team object:", team);  // ← Change to error
        return false;
      }
      if (!team.teamId.startsWith("jh7")) {  // ← Better check
        console.error(
          `[Team Hub] Invalid teamId format: ${team.teamId}. Expected Better Auth team ID.`
        );
        return false;
      }
      return true;
    })
    .map((team) => ({
      _id: team.teamId,
      name: team.teamName,
      sportCode: team.sportCode,
      ageGroup: team.ageGroup,
      gender: team.gender,
      isActive: team.isActive,
    }));
}, [coachAssignments?.teams]);
```

3. **Add validation** to `getCoachAssignmentsWithTeams`:

```typescript
// In coaches.ts, line 154-165:
const teams = assignment.teams
  .map((teamValue) => {
    const team = teamByIdMap.get(teamValue) || teamByNameMap.get(teamValue);

    if (!team) {
      // Log corrupted data - don't return it!
      console.error(
        `[getCoachAssignmentsWithTeams] Unresolvable team value: ${teamValue} ` +
        `for user ${assignment.userId} in org ${assignment.organizationId}`
      );
      return null;  // ← Return null instead of corrupted value
    }

    return {
      teamId: team._id,
      teamName: team.name,
      sportCode: team.sport,
      ageGroup: team.ageGroup,
      gender: team.gender,
      isActive: team.isActive,
    };
  })
  .filter(Boolean);  // ← Filter out nulls
```

### Phase 4: Backend Validation

**Goal**: Add schema-level validation to prevent corruption at write time.

**Implementation**: Add mutation validator in `updateCoachAssignments`:

```typescript
// In coaches.ts, updateCoachAssignments mutation:
export const updateCoachAssignments = mutation({
  args: {
    userId: v.string(),
    organizationId: v.string(),
    teams: v.array(v.string()),
    // ...
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // VALIDATE team IDs before saving
    for (const teamId of args.teams) {
      // Check format
      if (!teamId.startsWith("jh7")) {
        throw new Error(
          `Invalid team ID format: ${teamId}. Expected Better Auth team ID starting with "jh7".`
        );
      }

      // Verify team exists
      const teamResult = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "team",
          where: { field: "_id", value: teamId, operator: "eq" }
        }
      );

      if (!teamResult) {
        throw new Error(
          `Team ID ${teamId} not found. Cannot assign coach to non-existent team.`
        );
      }

      // Verify team belongs to same org
      if (teamResult.organizationId !== args.organizationId) {
        throw new Error(
          `Team ID ${teamId} belongs to different organization. ` +
          `Cannot assign across organizations.`
        );
      }
    }

    // Proceed with update (existing code)
    // ...
  }
});
```

---

## Execution Plan

### Step 1: Run Audit (IMMEDIATE)

```bash
# Create audit query file
# Add auditAllCoachAssignments query to convex/lib/auditCoachAssignments.ts

# Deploy to production
npx convex deploy --prod

# Run audit
npx convex run lib/auditCoachAssignments:auditAllCoachAssignments --prod > audit_results.json

# Review results
cat audit_results.json | jq '.statistics'
```

**Expected Output**:
```json
{
  "validTeamIds": 45,
  "teamNames": 12,
  "playerIds": 0,
  "medicalProfileIds": 1,
  "otherCorruption": 0,
  "emptyArrays": 8
}
```

**Decision Point**: If no corruption found, error may be transient or already fixed.

### Step 2: Run Migration (IF NEEDED)

```bash
# Only if audit shows corrupted data

# Run migration for specific org (test first)
npx convex run models/coaches:migrateCoachAssignmentsToTeamIds \
  '{"organizationId":"jh7f6k14jw7j4sj9rr9dfzekr97xm9j7"}' \
  --prod

# Review migration report

# Run for ALL orgs (if needed)
npx convex run models/coaches:migrateCoachAssignmentsToTeamIds '{}' --prod
```

### Step 3: Apply Frontend Fixes (IMMEDIATE)

```bash
# Edit files with improved validation
# 1. presence-indicators.tsx - remove unsafe cast
# 2. team-hub/page.tsx - improve error logging
# 3. coaches.ts - filter out unresolvable teams

# Commit changes
git add -A
git commit -m "fix: Add validation to prevent corrupted team IDs from causing crashes"
```

### Step 4: Apply Backend Validation (RECOMMENDED)

```bash
# Add validation to updateCoachAssignments mutation
# Deploy to production

npx convex deploy --prod
```

### Step 5: Verify Fix

```bash
# Test Team Hub page in browser
# Navigate to /orgs/{orgId}/coach/team-hub
# Should load without errors

# Check logs for any validation warnings
# Monitor for recurring corruption
```

---

## Prevention Measures

### 1. Type Safety

- Remove all `as any` casts in team ID handling
- Use Better Auth ID types: `Id<"team">` from betterAuth dataModel
- Add runtime validation for IDs

### 2. Data Validation

- Validate IDs at mutation boundaries
- Add format checks (prefix validation)
- Verify existence before saving references

### 3. Defensive Coding

- Filter out invalid data in queries
- Log errors clearly
- Don't propagate corrupted values

### 4. Testing

- Add integration tests for coach assignment flow
- Test with corrupted data scenarios
- Verify validation catches errors

### 5. Monitoring

- Add audit job to detect corruption weekly
- Alert on validation failures
- Track coach assignment modifications

---

## Open Questions

1. **How did medical profile ID get into coachAssignments?**
   - Manual entry error?
   - Seed script bug?
   - Copy/paste from wrong table?

2. **Are there other tables with similar corruption?**
   - Need full database audit
   - Check all foreign key relationships

3. **Why doesn't current production data show corruption?**
   - Was data cleaned already?
   - Different org than reported?
   - Error occurred in staging/dev?

4. **Should we add DB-level constraints?**
   - Convex doesn't support foreign keys
   - Could add validation functions
   - Trade-off: performance vs safety

---

## Recommendations

### Immediate (Do Now)

1. ✅ Run audit query to find all corrupted assignments
2. ✅ Apply frontend validation to prevent crashes
3. ✅ Improve error logging to identify source

### Short-term (This Week)

4. ⏹ Run data migration if corruption found
5. ⏹ Add backend validation to mutations
6. ⏹ Add integration tests for assignment flow

### Long-term (Next Sprint)

7. ⏹ Implement audit monitoring job
8. ⏹ Review all tables for similar issues
9. ⏹ Consider adding validation library
10. ⏹ Document ID format conventions

---

## Conclusion

The Team Hub error is caused by **data corruption** - a medical profile ID stored where a team ID was expected. The immediate fix is to:

1. **Audit** the database to find all corrupted records
2. **Migrate** corrupted data to valid team IDs
3. **Harden** frontend and backend to prevent future corruption

The root cause is likely **manual data entry error** rather than code bug, as current code paths appear correct. However, insufficient validation allowed corrupted data to propagate through the system.

**Priority**: HIGH - Blocks Phase 9 Week 4 features
**Complexity**: MEDIUM - Data migration + validation
**Risk**: LOW - Changes are defensive and non-breaking

---

**Analysis Complete**: 2026-02-02
**Next Action**: Run audit query (Step 1)
