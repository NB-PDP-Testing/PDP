# Team Hub Error - Executive Summary

**Date**: 2026-02-02
**Status**: ROOT CAUSE IDENTIFIED - DATA CORRUPTION CONFIRMED
**Severity**: HIGH - All coach assignments corrupted, Team Hub blocked

---

## TL;DR

**Problem**: Team Hub page crashes with validation error.

**Root Cause**: `coachAssignments.teams` array contains **team names** instead of **team IDs**. One assignment also has a **medical profile ID**.

**Impact**: 5 coach assignments (100%) corrupted across 2 organizations. Team Hub and related features cannot function.

**Fix**: Run data migration to convert team names → team IDs. Already implemented and ready to deploy.

---

## Audit Results

**Scan Date**: 2026-02-02 13:30 UTC
**Environment**: Production
**Query**: `lib/auditCoachAssignments:auditAllCoachAssignments`

### Statistics

| Metric | Count |
|--------|-------|
| Total Assignments | 5 |
| Corrupted Assignments | 5 |
| Clean Assignments | 0 |
| **Corruption Rate** | **100%** |

### Issue Breakdown

| Issue Type | Count | Examples |
|------------|-------|----------|
| Team Names | 5 | "Senior Women", "U18 Female", "DMC" |
| Medical Profile IDs | 1 | "js79xewp66skzqe3tv8r0ztd457y9qeh" |
| Player IDs | 0 | - |
| Other Corruption | 0 | - |

### Affected Organizations

1. **jh7f6k14jw7j4sj9rr9dfzekr97xm9j7** (4 corrupted assignments)
2. **jh73c402cnayr0j9r5kh9trpx17ywzbc** (1 corrupted assignment)

### Affected Users

1. `k175sxnms1s6r8z66qdya70cb97w89d7` (2 assignments)
2. `k17aqe558mmrjwnzrvy34d5mkn7yzkaf` (1 assignment)
3. `k17fwp081bcxjyxcv4t43xq7997z1py1` (1 assignment - has medical profile ID)
4. `k17cx7vnr8tz6qdr0mh4s09psh7ze0wa` (1 assignment)

---

## Root Cause Analysis

### Primary Cause: Admin UI Bug (FIXED)

**File**: `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`
**Fixed In**: Commit `0b48f2dd` (2026-02-02)

**Previous Code** (lines 469-492):
```typescript
// BUG: Converted team IDs to team names before saving
const teamNames = (state.teams || [])
  .map((teamIdOrName: string) => {
    const teamById = teams?.find((t: any) => t._id === teamIdOrName);
    if (teamById) {
      return teamById.name;  // ← WRONG! Saved name instead of ID
    }
    return teamIdOrName;
  })

await updateCoachAssignments({
  teams: teamNames  // ← Corrupted data
});
```

**Current Code**:
```typescript
// FIXED: Pass team IDs directly
const teamIds = (state.teams || []).filter(Boolean);
await updateCoachAssignments({
  teams: teamIds  // ← Correct
});
```

**Impact**: Every time an admin updated a coach assignment via the Users page, team IDs were converted to team names and saved. This corrupted the database.

### Secondary Cause: Medical Profile ID

**Assignment**: `kn762sy375svwe19wppb5emhnh7z1emf`
**User**: `k17fwp081bcxjyxcv4t43xq7997z1py1`
**Corrupted Value**: `js79xewp66skzqe3tv8r0ztd457y9qeh` (medical profile ID)

**Analysis**: This ID does not appear anywhere in the codebase. Most likely causes:
1. Manual entry via Convex dashboard
2. Copy/paste error
3. Test/seed script bug

**Note**: This user (Neil) is probably a developer/admin testing the system.

---

## Data Flow Analysis

### How Team Hub Crashes

1. **Team Hub Page** queries `getCoachAssignmentsWithTeams`
2. Query attempts to look up teams by ID/name
3. Corrupted values don't match any teams
4. Query returns raw corrupted values as fallback
5. Page passes corrupted ID to `PresenceIndicators` component
6. Component calls `getTeamPresence` with corrupted ID
7. **Validation fails**: ID is from wrong table (medicalProfiles, not team)
8. **Page crashes** with ArgumentValidationError

### Query Flow

```
Frontend (team-hub/page.tsx)
  ↓ calls getCoachAssignmentsWithTeams
Backend (coaches.ts)
  ↓ looks up teams by ID/name
  ↓ NOT FOUND → returns raw value
  ↓ returns { teamId: "js79...", teamName: "js79..." }
Frontend (team-hub/page.tsx)
  ↓ filters out some invalid IDs (line 97 check)
  ↓ BUT medical profile ID starts with "js7" not "players"
  ↓ passes through filter
  ↓ sends to PresenceIndicators
Frontend (presence-indicators.tsx)
  ↓ casts teamId to `any` (line 26) - UNSAFE!
  ↓ calls getTeamPresence
Backend (teamCollaboration.ts)
  ↓ validates teamId: v.id("team")
  ↓ ID is from medicalProfiles table
  ✗ VALIDATION ERROR: ArgumentValidationError
```

---

## Fix Strategy

### Phase 1: Data Migration (REQUIRED)

**Goal**: Convert all team names and corrupted IDs to valid Better Auth team IDs.

**Status**: Migration function already exists in `coaches.ts` (line 451).

**Command**:
```bash
# Run migration for all organizations
npx convex run models/coaches:migrateCoachAssignmentsToTeamIds '{}'
```

**What It Does**:
1. For each coach assignment:
   - Look up team by name in same org
   - Replace name with team._id
   - For medical profile ID: look up patient → player → teams
   - Remove any unresolvable values
2. Save updated assignment
3. Return detailed report

**Expected Result**:
```json
{
  "assignmentsUpdated": 5,
  "conversions": [
    { "userId": "k175...", "teamName": "Senior Women", "teamId": "jh7..." },
    { "userId": "k175...", "teamName": "U18 Female", "teamId": "jh7..." },
    // ...
  ],
  "warnings": [
    "User k17fwp...: Unknown team 'js79xewp...' - removed"
  ]
}
```

### Phase 2: Frontend Hardening (RECOMMENDED)

**Goal**: Prevent crashes even if corrupted data exists.

**Changes**:

1. **Remove unsafe type cast** in `presence-indicators.tsx`:
   ```typescript
   // BEFORE (line 26):
   teamId: teamId as any,  // ← REMOVE

   // AFTER:
   teamId && isValidTeamId(teamId)
     ? { teamId: teamId as Id<"team">, organizationId }
     : "skip"
   ```

2. **Improve validation** in `team-hub/page.tsx`:
   ```typescript
   // Add better ID format check (line 97):
   if (!team.teamId.startsWith("jh7")) {
     console.error(`[Team Hub] Invalid teamId format: ${team.teamId}`);
     return false;
   }
   ```

3. **Filter invalid data** in `getCoachAssignmentsWithTeams`:
   ```typescript
   // Don't return unresolvable teams (line 158):
   if (!team) {
     console.error(`Unresolvable team value: ${teamValue}`);
     return null;  // ← Filter out instead of returning raw value
   }
   ```

### Phase 3: Backend Validation (RECOMMENDED)

**Goal**: Prevent corruption at write time.

**Change**: Add validation to `updateCoachAssignments` mutation:
```typescript
// Validate team IDs before saving
for (const teamId of args.teams) {
  if (!teamId.startsWith("jh7")) {
    throw new Error(`Invalid team ID format: ${teamId}`);
  }
  // Verify team exists in Better Auth
  const team = await ctx.runQuery(
    components.betterAuth.adapter.findOne,
    { model: "team", where: { field: "_id", value: teamId } }
  );
  if (!team) {
    throw new Error(`Team ID ${teamId} not found`);
  }
}
```

---

## Execution Plan

### Step 1: Run Migration (NOW)

```bash
# Navigate to backend
cd /Users/neil/Documents/GitHub/PDP/packages/backend

# Run migration for all orgs
npx convex run models/coaches:migrateCoachAssignmentsToTeamIds '{}'

# Save output
npx convex run models/coaches:migrateCoachAssignmentsToTeamIds '{}' > migration_report.json

# Verify results
cat migration_report.json
```

**Expected Duration**: < 1 minute
**Risk**: LOW - Function only updates corrupted records
**Rollback**: Can manually restore from audit results if needed

### Step 2: Verify Fix (NOW)

```bash
# Re-run audit
npx convex run lib/auditCoachAssignments:auditAllCoachAssignments '{}'

# Expected result: All clean
# {
#   "corruptedAssignments": [],
#   "cleanAssignments": [5 IDs],
#   "statistics": { "validTeamIds": N, ... }
# }
```

### Step 3: Test Team Hub (NOW)

1. Open Team Hub page in browser
2. Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/coach/team-hub`
3. Verify page loads without errors
4. Check presence indicators appear
5. Test all tabs

### Step 4: Apply Frontend Hardening (OPTIONAL)

```bash
# Edit files with improved validation
# Commit changes
git add -A
git commit -m "fix: Add validation to prevent corrupted team IDs"
git push
```

### Step 5: Add Backend Validation (OPTIONAL)

```bash
# Edit coaches.ts mutation
# Deploy
npx convex deploy
```

---

## Timeline

| Time | Event |
|------|-------|
| 2026-01-XX | Admin UI bug introduced (team ID → name conversion) |
| 2026-02-02 09:00 | Team Hub error first reported |
| 2026-02-02 10:14 | Commit `a711da28` - Added defensive filtering to team-hub |
| 2026-02-02 13:02 | Commit `0b48f2dd` - Fixed admin UI bug (prevents future corruption) |
| 2026-02-02 13:30 | **Audit run** - Confirmed 5 corrupted assignments |
| 2026-02-02 13:45 | **Root cause analysis complete** |
| 2026-02-02 14:00 | **Ready to migrate** |

---

## Recommendations

### Immediate (Do Now)

1. ✅ ~~Run audit~~ - COMPLETE
2. ✅ ~~Identify root cause~~ - COMPLETE
3. ⏹ **Run migration** - READY TO EXECUTE
4. ⏹ **Verify fix** - After migration

### Short-term (This Week)

5. ⏹ Apply frontend hardening
6. ⏹ Add backend validation
7. ⏹ Add integration tests

### Long-term (Next Sprint)

8. ⏹ Implement audit monitoring job (weekly)
9. ⏹ Review all tables for similar issues
10. ⏹ Document ID format conventions

---

## Files Created

1. `/scripts/ralph/TEAM_HUB_ERROR_ROOT_CAUSE_ANALYSIS.md` - Full technical analysis (23 pages)
2. `/scripts/ralph/AUDIT_RESULTS_2026-02-02.json` - Raw audit data
3. `/scripts/ralph/TEAM_HUB_ERROR_SUMMARY.md` - This document
4. `/packages/backend/convex/lib/auditCoachAssignments.ts` - Audit queries (deployed)

---

## Next Steps

**IMMEDIATE ACTION REQUIRED**:

```bash
# Run this command NOW to fix the database:
cd /Users/neil/Documents/GitHub/PDP/packages/backend
npx convex run models/coaches:migrateCoachAssignmentsToTeamIds '{}'
```

After migration completes, Team Hub will work correctly.

---

**Analysis Complete**: 2026-02-02 14:00
**Status**: READY FOR MIGRATION
**Priority**: HIGH
**Blocker**: YES - Team Hub cannot function until fixed
