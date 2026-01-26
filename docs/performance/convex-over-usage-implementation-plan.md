# Convex Over-Usage - Implementation Plan

**Date:** 2026-01-22
**Status:** Awaiting Approval
**Dependencies:** See `convex-over-usage-analysis.md` for detailed findings

---

## Implementation Approach

This plan is organized into **4 phases** with clear dependencies and validation steps. Each phase can be implemented and tested independently.

**Estimated Total Time:** 2-3 days (with testing)
**Risk Level:** Medium (see risk assessment document)

---

## Phase 1: Diagnostic & Baseline Measurement

**Goal:** Understand current Convex usage metrics and establish baseline for comparison

**Duration:** 30 minutes
**Risk:** None (read-only operations)

### Step 1.1: Access Convex Dashboard

**Action:**
1. Navigate to Convex Dashboard: https://dashboard.convex.dev/d/brazen-squirrel-35
2. Log in with deployment credentials

**Data to Collect:**
- Current function calls per day
- Current database row count
- Current storage usage
- Current bandwidth usage
- Top 10 most-called functions
- Peak usage times

**Document findings in:** `/docs/performance/convex-usage-baseline.md`

### Step 1.2: Analyze Function Call Logs

**MCP Tool:** `mcp__convex__logs`

**Command:**
```typescript
mcp__convex__logs({
  deploymentSelector: "ownDev:...",
  entriesLimit: 1000,
  tokensLimit: 20000
})
```

**Analysis:**
- Identify most frequently called functions
- Look for subscription churn (queries starting/stopping rapidly)
- Identify any unexpected query patterns

### Step 1.3: Check Table Sizes

**MCP Tool:** `mcp__convex__tables`

**Data to collect:**
- Row count for each table
- Identify largest tables
- Verify data volume assumptions

**Document:** Create table size report

### Step 1.4: Verify Current Indexes

**Action:** Read `packages/backend/convex/schema.ts` completely and document all existing indexes

**Output:** Index inventory in implementation doc

**Deliverables for Phase 1:**
- [ ] Baseline metrics documented
- [ ] Top function calls identified
- [ ] Table sizes verified
- [ ] Current index inventory complete

---

## Phase 2: Frontend N+1 Pattern Fixes (Highest Impact)

**Goal:** Eliminate N+1 query patterns in parent and coach dashboards
**Expected Impact:** 70-80% reduction in parent dashboard queries
**Duration:** 4-6 hours
**Risk:** Medium (requires careful testing of data flow)

### Step 2.1: Create Bulk Query Functions for ChildCard Data

**Files to modify:**
1. `packages/backend/convex/models/playerInjuries.ts`
2. `packages/backend/convex/models/passportGoals.ts`

**Actions:**

#### A. Add Bulk Injuries Query

**File:** `packages/backend/convex/models/playerInjuries.ts`

**New function to add:**
```typescript
/**
 * Get injuries for multiple players in bulk
 * Optimized for parent dashboards with multiple children
 */
export const getBulkInjuriesForPlayers = query({
  args: {
    playerIdentityIds: v.array(v.id("playerIdentities")),
  },
  returns: v.array(
    v.object({
      playerIdentityId: v.id("playerIdentities"),
      injuries: v.array(v.any()), // Use proper injury validator
    })
  ),
  handler: async (ctx, args) => {
    // Fetch injuries for each player in parallel
    const results = await Promise.all(
      args.playerIdentityIds.map(async (playerIdentityId) => {
        const injuries = await ctx.db
          .query("playerInjuries")
          .withIndex("by_player", (q) =>
            q.eq("playerIdentityId", playerIdentityId)
          )
          .collect();

        return {
          playerIdentityId,
          injuries,
        };
      })
    );

    return results;
  },
});
```

**Validation:**
- Test with single player
- Test with 5 players
- Test with 10 players
- Verify all injury fields are present

#### B. Add Bulk Goals Query

**File:** `packages/backend/convex/models/passportGoals.ts`

**New function to add:**
```typescript
/**
 * Get goals for multiple players in bulk
 * Optimized for parent dashboards with multiple children
 */
export const getBulkGoalsForPlayers = query({
  args: {
    playerIdentityIds: v.array(v.id("playerIdentities")),
  },
  returns: v.array(
    v.object({
      playerIdentityId: v.id("playerIdentities"),
      goals: v.array(v.any()), // Use proper goal validator
    })
  ),
  handler: async (ctx, args) => {
    // Fetch goals for each player in parallel
    const results = await Promise.all(
      args.playerIdentityIds.map(async (playerIdentityId) => {
        const goals = await ctx.db
          .query("passportGoals")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", playerIdentityId)
          )
          .collect();

        return {
          playerIdentityId,
          goals,
        };
      })
    );

    return results;
  },
});
```

**Note:** The `getBulkPassportsForPlayers` function already exists in `sportPassports.ts` (lines 188-225).

#### C. Run Convex Codegen

**Command:**
```bash
npx -w packages/backend convex codegen
```

**Verify:** Check that new functions appear in `_generated/api.ts`

### Step 2.2: Modify Parent Dashboard to Use Bulk Queries

**Files to modify:**
1. `apps/web/src/app/orgs/[orgId]/parents/children/components/parent-children-view.tsx`
2. `apps/web/src/app/orgs/[orgId]/parents/page.tsx`

**Actions:**

#### A. Update parent-children-view.tsx

**Current code (Lines ~40-130):**
```typescript
export function ParentChildrenView({ orgId, session }: Props) {
  // ... existing code ...

  return (
    <div className="grid gap-6">
      {identityChildren.map((child) => (
        <ChildCard key={child.player._id} child={child} orgId={orgId} />
      ))}
    </div>
  );
}
```

**New code:**
```typescript
import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo } from "react";

export function ParentChildrenView({ orgId, session }: Props) {
  // ... existing code ...

  // NEW: Get all player IDs
  const playerIds = useMemo(() => {
    if (!identityChildren) return [];
    return identityChildren.map(child => child.player._id);
  }, [identityChildren]);

  // NEW: Bulk fetch passports
  const bulkPassports = useQuery(
    api.models.sportPassports.getBulkPassportsForPlayers,
    playerIds.length > 0 ? { playerIdentityIds: playerIds } : "skip"
  );

  // NEW: Bulk fetch injuries
  const bulkInjuries = useQuery(
    api.models.playerInjuries.getBulkInjuriesForPlayers,
    playerIds.length > 0 ? { playerIdentityIds: playerIds } : "skip"
  );

  // NEW: Bulk fetch goals
  const bulkGoals = useQuery(
    api.models.passportGoals.getBulkGoalsForPlayers,
    playerIds.length > 0 ? { playerIdentityIds: playerIds } : "skip"
  );

  // NEW: Create lookup maps
  const passportsByPlayer = useMemo(() => {
    if (!bulkPassports) return new Map();
    return new Map(
      bulkPassports.map(p => [p.playerIdentityId.toString(), p])
    );
  }, [bulkPassports]);

  const injuriesByPlayer = useMemo(() => {
    if (!bulkInjuries) return new Map();
    return new Map(
      bulkInjuries.map(i => [i.playerIdentityId.toString(), i.injuries])
    );
  }, [bulkInjuries]);

  const goalsByPlayer = useMemo(() => {
    if (!bulkGoals) return new Map();
    return new Map(
      bulkGoals.map(g => [g.playerIdentityId.toString(), g.goals])
    );
  }, [bulkGoals]);

  return (
    <div className="grid gap-6">
      {identityChildren.map((child) => (
        <ChildCard
          key={child.player._id}
          child={child}
          orgId={orgId}
          // NEW: Pass pre-fetched data as props
          passportData={passportsByPlayer.get(child.player._id.toString())}
          injuries={injuriesByPlayer.get(child.player._id.toString())}
          goals={goalsByPlayer.get(child.player._id.toString())}
        />
      ))}
    </div>
  );
}
```

#### B. Update parent page.tsx

**Similar changes** to the above pattern

### Step 2.3: Modify ChildCard to Accept Pre-fetched Data

**File:** `apps/web/src/app/orgs/[orgId]/parents/components/child-card.tsx`

**Current code (Lines 22-39):**
```typescript
type ChildCardProps = {
  child: {
    player: {
      _id: Id<"playerIdentities">;
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
    };
    enrollment?: {
      ageGroup?: string;
      status?: string;
      attendance?: { training?: number; matches?: number };
      lastReviewDate?: string;
      reviewStatus?: string;
    };
  };
  orgId: string;
};
```

**New code:**
```typescript
type ChildCardProps = {
  child: {
    player: {
      _id: Id<"playerIdentities">;
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
    };
    enrollment?: {
      ageGroup?: string;
      status?: string;
      attendance?: { training?: number; matches?: number };
      lastReviewDate?: string;
      reviewStatus?: string;
    };
  };
  orgId: string;
  // NEW: Optional pre-fetched data
  passportData?: any;
  injuries?: any[];
  goals?: any[];
};
```

**Current code (Lines 103-123):**
```typescript
export function ChildCard({ child, orgId }: ChildCardProps) {
  const { player, enrollment } = child;

  // Get passport data for this child
  const passportData = useQuery(
    api.models.sportPassports.getFullPlayerPassportView,
    {
      playerIdentityId: player._id,
      organizationId: orgId,
    }
  );

  // Get active injuries
  const injuries = useQuery(api.models.playerInjuries.getInjuriesForPlayer, {
    playerIdentityId: player._id,
  });

  // Get goals
  const goals = useQuery(api.models.passportGoals.getGoalsForPlayer, {
    playerIdentityId: player._id,
  });

  // ... rest of component
}
```

**New code:**
```typescript
export function ChildCard({
  child,
  orgId,
  passportData: preFetchedPassportData,
  injuries: preFetchedInjuries,
  goals: preFetchedGoals,
}: ChildCardProps) {
  const { player, enrollment } = child;

  // Fallback to individual queries if data not pre-fetched
  // This maintains backwards compatibility for other uses of ChildCard
  const fetchedPassportData = useQuery(
    api.models.sportPassports.getFullPlayerPassportView,
    !preFetchedPassportData && orgId
      ? {
          playerIdentityId: player._id,
          organizationId: orgId,
        }
      : "skip"
  );

  const fetchedInjuries = useQuery(
    api.models.playerInjuries.getInjuriesForPlayer,
    !preFetchedInjuries
      ? { playerIdentityId: player._id }
      : "skip"
  );

  const fetchedGoals = useQuery(
    api.models.passportGoals.getGoalsForPlayer,
    !preFetchedGoals
      ? { playerIdentityId: player._id }
      : "skip"
  );

  // Use pre-fetched data if available, otherwise use fetched data
  const passportData = preFetchedPassportData || fetchedPassportData;
  const injuries = preFetchedInjuries || fetchedInjuries;
  const goals = preFetchedGoals || fetchedGoals;

  // ... rest of component remains the same
}
```

**Benefits of this approach:**
- Maintains backwards compatibility
- ChildCard can still be used standalone
- When pre-fetched data is provided, queries are skipped
- Gradual migration path

### Step 2.4: Testing Phase 2

**Test Cases:**

1. **Parent with 1 child:**
   - Navigate to `/orgs/[orgId]/parents`
   - Verify child card displays correctly
   - Open browser DevTools → Network → Filter "convex"
   - Verify only 3 queries fire (not 3 per child)

2. **Parent with 5 children:**
   - Verify all 5 child cards display
   - Verify only 3 queries fire total
   - Verify real-time updates work (change a goal in another tab)

3. **Empty state:**
   - Test parent with no children
   - Verify no errors

4. **Loading states:**
   - Verify loading indicators display correctly
   - Verify no flash of incorrect data

**Rollback Plan:**
- Revert ChildCard changes
- Revert parent component changes
- Keep bulk query functions (no harm)

**Deliverables for Phase 2:**
- [ ] Bulk query functions created and tested
- [ ] Parent components updated to use bulk queries
- [ ] ChildCard updated to accept pre-fetched data
- [ ] All test cases passing
- [ ] DevTools verification shows reduced queries

---

## Phase 3: Coach Dashboard Optimization

**Goal:** Query only coach's assigned players, not all org players
**Expected Impact:** 60-85% reduction in coach dashboard queries
**Duration:** 3-4 hours
**Risk:** Medium (requires new backend function and filtering logic)

### Step 3.1: Create getPlayersForCoach Backend Function

**File:** `packages/backend/convex/models/orgPlayerEnrollments.ts`

**New function to add:**
```typescript
/**
 * Get players assigned to a specific coach
 * Returns only players on teams that the coach is assigned to
 */
export const getPlayersForCoach = query({
  args: {
    userId: v.string(), // Coach's user ID
    organizationId: v.string(),
  },
  returns: v.array(v.any()), // Use proper return validator
  handler: async (ctx, args) => {
    // 1. Get coach's team assignments
    const coachAssignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!coachAssignments || !coachAssignments.teams || coachAssignments.teams.length === 0) {
      return [];
    }

    const coachTeamIds = coachAssignments.teams;

    // 2. Get all team-player links for coach's teams
    const teamPlayerLinks = await Promise.all(
      coachTeamIds.map(async (teamId) => {
        return await ctx.db
          .query("teamPlayerIdentities")
          .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();
      })
    );

    // Flatten and get unique player IDs
    const playerIds = new Set<string>();
    for (const links of teamPlayerLinks) {
      for (const link of links) {
        playerIds.add(link.playerIdentityId);
      }
    }

    // 3. Fetch enrollments for these players
    const enrollments = await Promise.all(
      Array.from(playerIds).map(async (playerIdentityId) => {
        const enrollment = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q.eq("playerIdentityId", playerIdentityId as any)
             .eq("organizationId", args.organizationId)
          )
          .first();

        if (!enrollment) return null;

        // Fetch player identity
        const player = await ctx.db.get(enrollment.playerIdentityId);
        if (!player) return null;

        // Fetch sport passport for sportCode
        const passport = await ctx.db
          .query("sportPassports")
          .withIndex("by_player_and_org", (q) =>
            q.eq("playerIdentityId", enrollment.playerIdentityId)
             .eq("organizationId", args.organizationId)
          )
          .first();

        return {
          enrollment,
          player,
          sportCode: passport?.sportCode,
        };
      })
    );

    // Filter out nulls and return
    return enrollments.filter((e): e is NonNullable<typeof e> => e !== null);
  },
});
```

**Notes:**
- This function replicates the logic currently happening in the frontend
- It filters at the database level instead of in JavaScript
- Uses existing indexes

**Potential Issue:** The `.filter()` on line for `status === "active"` violates our own rule. Let's fix it:

**Better version:**
```typescript
// Check if index exists: by_team_and_status
// If not, add it to schema first

return await ctx.db
  .query("teamPlayerIdentities")
  .withIndex("by_team_and_status", (q) =>
    q.eq("teamId", teamId).eq("status", "active")
  )
  .collect();
```

**Schema change required:** Add index `by_team_and_status: ["teamId", "status"]` to `teamPlayerIdentities` table.

### Step 3.2: Update Coach Dashboard to Use New Function

**File:** `apps/web/src/app/orgs/[orgId]/coach/coach-dashboard.tsx`

**Current code (Lines 68-98):**
```typescript
// NEW: Get all players from identity system
const enrolledPlayersData = useQuery(
  api.models.orgPlayerEnrollments.getPlayersForOrg,
  {
    organizationId: orgId,
  }
);

// Transform identity-based players to legacy format for compatibility
const allPlayers = useMemo(() => {
  if (!enrolledPlayersData) return;
  return enrolledPlayersData.map(
    ({ enrollment, player, sportCode }: any) => ({
      _id: player._id,
      name: `${player.firstName} ${player.lastName}`,
      // ... more fields
    })
  );
}, [enrolledPlayersData]);
```

**New code:**
```typescript
// UPDATED: Get only coach's assigned players
const enrolledPlayersData = useQuery(
  api.models.orgPlayerEnrollments.getPlayersForCoach,
  userId && orgId
    ? {
        userId,
        organizationId: orgId,
      }
    : "skip"
);

// Transform to display format (same as before)
const allPlayers = useMemo(() => {
  if (!enrolledPlayersData) return;
  return enrolledPlayersData.map(
    ({ enrollment, player, sportCode }: any) => ({
      _id: player._id,
      name: `${player.firstName} ${player.lastName}`,
      // ... more fields
    })
  );
}, [enrolledPlayersData]);
```

**Changes:**
1. Replace `getPlayersForOrg` with `getPlayersForCoach`
2. Add `userId` parameter
3. Add skip condition for `userId`

**Lines 110-118 (playerSkillsData query) remain the same** - it will now receive a much smaller `allPlayers` array.

### Step 3.3: Add Skip Logic to Unconditional Queries

**File:** `apps/web/src/app/orgs/[orgId]/coach/coach-dashboard.tsx`

**Current code (Line 64-66):**
```typescript
// Get all teams for the organization
const teams = useQuery(api.models.teams.getTeamsByOrganization, {
  organizationId: orgId,
});
```

**New code:**
```typescript
// Get all teams for the organization
const teams = useQuery(
  api.models.teams.getTeamsByOrganization,
  orgId ? { organizationId: orgId } : "skip"
);
```

**Current code (Line 101-107):**
```typescript
// Get team-player links from new identity system
const teamPlayerLinks = useQuery(
  api.models.teamPlayerIdentities.getTeamMembersForOrg,
  {
    organizationId: orgId,
    status: "active",
  }
);
```

**New code:**
```typescript
// Get team-player links from new identity system
const teamPlayerLinks = useQuery(
  api.models.teamPlayerIdentities.getTeamMembersForOrg,
  orgId
    ? {
        organizationId: orgId,
        status: "active",
      }
    : "skip"
);
```

**Rationale:** These queries should only fire when `orgId` is available. This prevents unnecessary query attempts during initial render.

### Step 3.4: Testing Phase 3

**Test Cases:**

1. **Coach with 2 teams, 30 total players:**
   - Organization has 200 players
   - Navigate to `/orgs/[orgId]/coach`
   - Open DevTools → Network → Filter "convex"
   - Verify query for `getPlayersForCoach` only returns 30 players
   - Verify `playerSkillsData` query only includes 30 player IDs

2. **Coach with no team assignments:**
   - Verify "No Teams Assigned" message displays
   - Verify no error is thrown

3. **Coach dashboard real-time updates:**
   - Open dashboard in one tab
   - In another tab, add a player to coach's team
   - Verify dashboard updates to show new player

4. **Performance comparison:**
   - Before changes: Measure query response time and payload size
   - After changes: Compare same metrics
   - Expected: 60-85% reduction in payload size

**Rollback Plan:**
- Revert coach-dashboard.tsx changes
- Keep new backend function (no harm)
- Restore original query calls

**Deliverables for Phase 3:**
- [ ] `getPlayersForCoach` function created and tested
- [ ] Coach dashboard updated to use new function
- [ ] Skip logic added to unconditional queries
- [ ] All test cases passing
- [ ] Performance metrics improved

---

## Phase 4: Backend Index Optimization

**Goal:** Add missing composite indexes and remove .filter() violations
**Expected Impact:** 30-40% improvement in query performance
**Duration:** 2-3 hours
**Risk:** Low (indexes are additive, no breaking changes)

### Step 4.1: Add Missing Composite Indexes

**File:** `packages/backend/convex/schema.ts`

**Process:**
1. Read entire schema file
2. Locate each table mentioned in findings
3. Add composite indexes

**Indexes to Add:**

#### A. flows table

**Current indexes:**
```typescript
flows: defineTable({ /* ... */ })
  .index("by_scope", ["scope"])
  .index("by_organizationId", ["organizationId"])
  // ... other indexes
```

**Add:**
```typescript
flows: defineTable({ /* ... */ })
  .index("by_scope", ["scope"])
  .index("by_organizationId", ["organizationId"])
  .index("by_scope_and_type", ["scope", "type"]) // NEW
  .index("by_organization_and_active", ["organizationId", "active"]) // NEW
  // ... other indexes
```

#### B. playerEmergencyContacts table

**Add:**
```typescript
playerEmergencyContacts: defineTable({ /* ... */ })
  .index("by_player", ["playerIdentityId"])
  .index("by_priority", ["playerIdentityId", "priority"])
  .index("by_organizationId_and_status", ["organizationId", "status"]) // NEW (if organizationId field exists)
```

**Note:** Verify that `playerEmergencyContacts` table has `organizationId` field. If not, this index cannot be added.

#### C. skillAssessments table

**Add:**
```typescript
skillAssessments: defineTable({ /* ... */ })
  // ... existing indexes ...
  .index("by_player_and_org", ["playerIdentityId", "organizationId"]) // NEW
  .index("by_organizationId_and_sportCode", ["organizationId", "sportCode"]) // NEW
```

#### D. orgPlayerEnrollments table

**Check if exists, add if missing:**
```typescript
orgPlayerEnrollments: defineTable({ /* ... */ })
  // ... existing indexes ...
  .index("by_org_and_status", ["organizationId", "status"]) // Check if exists
```

**Note:** According to schema.ts lines 380-381, this index already exists. Verify during implementation.

#### E. teamPlayerIdentities table

**Add:**
```typescript
teamPlayerIdentities: defineTable({ /* ... */ })
  // ... existing indexes ...
  .index("by_team_and_status", ["teamId", "status"]) // NEW
  .index("by_org_and_sport", ["organizationId", "sport"]) // NEW (if these fields exist)
```

**Note:** Check schema for field availability before adding.

#### F. sportPassports table

**Add:**
```typescript
sportPassports: defineTable({ /* ... */ })
  // ... existing indexes ...
  .index("by_org_and_status", ["organizationId", "status"]) // NEW
```

### Step 4.2: Update Backend Queries to Use New Indexes

For each `.filter()` violation found in the analysis, update the query to use the new composite index.

#### A. firstUserSetup.ts

**File:** `packages/backend/convex/lib/firstUserSetup.ts` (Line 22)

**Current code:**
```typescript
const onboardingFlow = await ctx.db
  .query("flows")
  .withIndex("by_scope", (q) => q.eq("scope", scope))
  .filter((q) => q.eq(q.field("type"), "onboarding"))
  .first();
```

**New code:**
```typescript
const onboardingFlow = await ctx.db
  .query("flows")
  .withIndex("by_scope_and_type", (q) =>
    q.eq("scope", scope).eq("type", "onboarding")
  )
  .first();
```

#### B. emergencyContacts.ts

**File:** `packages/backend/convex/models/emergencyContacts.ts` (Line 94)

**Current code:**
```typescript
const activeContacts = await ctx.db
  .query("playerEmergencyContacts")
  .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
  .filter((q) => q.eq(q.field("status"), "active"))
  .collect();
```

**New code (if organizationId field exists):**
```typescript
const activeContacts = await ctx.db
  .query("playerEmergencyContacts")
  .withIndex("by_organizationId_and_status", (q) =>
    q.eq("organizationId", organizationId).eq("status", "active")
  )
  .collect();
```

**Otherwise:** Document that this optimization cannot be done without schema changes.

#### C. skillAssessments.ts

**File:** `packages/backend/convex/models/skillAssessments.ts`

**Line 242:**
```typescript
// Current
const assessments = await ctx.db
  .query("skillAssessments")
  .withIndex("by_player_and_sport", (q) =>
    q.eq("playerIdentityId", playerId).eq("sportCode", sport)
  )
  .filter((q) => q.eq(q.field("organizationId"), orgId))
  .collect();

// New
const assessments = await ctx.db
  .query("skillAssessments")
  .withIndex("by_player_sport_and_org", (q) =>
    q.eq("playerIdentityId", playerId)
     .eq("sportCode", sport)
     .eq("organizationId", orgId)
  )
  .collect();
```

**Required:** Add index `by_player_sport_and_org: ["playerIdentityId", "sportCode", "organizationId"]`

**Line 303:**
```typescript
// Current
const latestSkills = await ctx.db
  .query("skillAssessments")
  .withIndex("by_playerIdentityId", (q) => q.eq("playerIdentityId", playerId))
  .filter((q) => q.eq(q.field("organizationId"), orgId))
  .collect();

// New
const latestSkills = await ctx.db
  .query("skillAssessments")
  .withIndex("by_player_and_org", (q) =>
    q.eq("playerIdentityId", playerId).eq("organizationId", orgId)
  )
  .collect();
```

#### D. teams.ts

**File:** `packages/backend/convex/models/teams.ts`

**Multiple occurrences (Lines 653, 692, 726, 772):**
```typescript
// Current pattern
const activeTeams = await ctx.db
  .query("teams")
  .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
  .filter((q) => q.eq(q.field("isActive"), true))
  .collect();

// New pattern
const activeTeams = await ctx.db
  .query("teams")
  .withIndex("by_org_and_active", (q) =>
    q.eq("organizationId", orgId).eq("isActive", true)
  )
  .collect();
```

**Required:** Add index `by_org_and_active: ["organizationId", "isActive"]` to Better Auth `team` table extension.

**Note:** This requires modifying Better Auth schema extension. Check `packages/backend/convex/betterAuth/` for schema modifications.

#### E. flows.ts

**File:** `packages/backend/convex/models/flows.ts` (Line 27)

**Current:**
```typescript
const activeFlows = await ctx.db
  .query("flows")
  .withIndex("by_scope", (q) => q.eq("scope", scope))
  .filter((q) => q.eq(q.field("active"), true))
  .collect();
```

**New:**
```typescript
const activeFlows = await ctx.db
  .query("flows")
  .withIndex("by_organization_and_active", (q) =>
    q.eq("organizationId", orgId).eq("active", true)
  )
  .collect();
```

**Note:** Verify query parameters match index fields. If query uses `scope`, not `organizationId`, use `by_scope_and_active` index instead.

### Step 4.3: sportPassports.ts In-Memory Filter

**File:** `packages/backend/convex/models/sportPassports.ts` (Lines 132-136)

**Current:**
```typescript
if (args.status) {
  passports = passports.filter((p) => p.status === args.status);
}
```

**Options:**

**Option A:** Add index and modify query logic
```typescript
// Use different index based on whether status filter is provided
if (args.status) {
  const status = args.status;
  passports = await ctx.db
    .query("sportPassports")
    .withIndex("by_org_and_status", (q) =>
      q.eq("organizationId", args.organizationId).eq("status", status)
    )
    .collect();
} else {
  passports = await ctx.db
    .query("sportPassports")
    .withIndex("by_organizationId", (q) =>
      q.eq("organizationId", args.organizationId)
    )
    .collect();
}
```

**Option B:** Keep as-is if optimization isn't critical

**Recommendation:** Option A for consistency, but low priority.

### Step 4.4: Deploy and Test Index Changes

**Process:**

1. **Local Testing:**
   ```bash
   npm run dev
   ```
   - Verify Convex codegen succeeds
   - Check for index-related errors in Convex dashboard

2. **Verify Indexes Created:**
   - Check Convex dashboard → Data → Inspect table schemas
   - Verify new indexes appear

3. **Run Query Tests:**
   - Execute queries that use new indexes
   - Verify results are identical to before
   - Check query execution times

4. **Monitor for Issues:**
   - Watch Convex logs for errors
   - Check function success rates

**Rollback Plan:**
- Indexes can be removed from schema
- Redeploy previous schema version
- Revert query changes

**Deliverables for Phase 4:**
- [ ] All missing indexes added to schema
- [ ] Schema deployed successfully
- [ ] All .filter() violations fixed
- [ ] Query results verified identical
- [ ] Performance improvement measured

---

## Phase 5: Monitoring & Validation

**Goal:** Verify optimizations achieved expected impact
**Duration:** Ongoing (1 week monitoring)
**Risk:** None (read-only)

### Step 5.1: Re-measure Convex Usage Metrics

**Action:** Return to Convex Dashboard and collect same metrics as Phase 1

**Compare:**

| Metric | Baseline (Phase 1) | After Optimization | Change |
|--------|-------------------|-------------------|---------|
| Function calls/day | ___ | ___ | ___% |
| Peak subscriptions | ___ | ___ | ___% |
| Avg query time | ___ | ___ | ___% |
| Bandwidth | ___ | ___ | ___% |

**Target:** 50-70% reduction in function calls

### Step 5.2: User Acceptance Testing

**Test Scenarios:**

1. **Parent Dashboard:**
   - [ ] Parent with multiple children can view dashboard
   - [ ] All child cards display correct data
   - [ ] Real-time updates work (change child data, verify update)
   - [ ] No performance degradation
   - [ ] No errors in console

2. **Coach Dashboard:**
   - [ ] Coach sees only assigned players
   - [ ] Player count matches assignments
   - [ ] Filters work correctly
   - [ ] Skills data displays correctly
   - [ ] Team notes functionality works

3. **Admin Pages:**
   - [ ] All admin functions work
   - [ ] Player management works
   - [ ] Team management works

### Step 5.3: Create Monitoring Dashboard

**Optional but recommended:**

Create internal monitoring page at `/orgs/[orgId]/admin/performance` showing:
- Current active subscriptions
- Most frequently called functions
- Query response times
- Subscription churn rate

**Implementation:** Use Convex's built-in analytics or create custom dashboard.

### Step 5.4: Documentation Updates

**Update files:**
- `docs/architecture/system-overview.md` - Note optimization patterns
- `docs/development/convex-best-practices.md` - Create if doesn't exist
- `CLAUDE.md` - Add lessons learned

**Deliverables for Phase 5:**
- [ ] Usage metrics show improvement
- [ ] All UAT tests passing
- [ ] Monitoring in place
- [ ] Documentation updated

---

## Rollback Procedures

### Complete Rollback (All Phases)

If critical issues are discovered:

1. **Revert Frontend Changes:**
   ```bash
   git revert <commit-hash-phase-2>
   git revert <commit-hash-phase-3>
   ```

2. **Revert Backend Query Changes:**
   ```bash
   git revert <commit-hash-phase-4-queries>
   ```

3. **Keep Indexes:**
   - Indexes are additive and don't break existing functionality
   - Can be removed later if truly needed

4. **Redeploy:**
   ```bash
   npm run build
   npx -w packages/backend convex deploy
   ```

### Partial Rollback

Each phase can be rolled back independently:

- **Phase 2 only:** Revert ChildCard and parent component changes
- **Phase 3 only:** Revert coach dashboard changes
- **Phase 4 only:** Revert query changes (keep indexes)

---

## Success Criteria

**Phase 2 Success:**
- [ ] Parent dashboard queries reduced from N×3 to 3 for N children
- [ ] DevTools verification shows reduced query count
- [ ] All parent features working correctly

**Phase 3 Success:**
- [ ] Coach dashboard queries only assigned players
- [ ] Query payload size reduced by 60%+
- [ ] All coach features working correctly

**Phase 4 Success:**
- [ ] Zero .filter() violations after .withIndex()
- [ ] All missing indexes added
- [ ] Query performance improved

**Overall Success:**
- [ ] Convex usage below Free tier limits
- [ ] 50-70% reduction in function calls
- [ ] No user-facing functionality broken
- [ ] Real-time updates still work correctly

---

## Next Steps After Implementation

1. **Monitor for 1 week** - Ensure stability
2. **Measure cost savings** - Track Convex usage trends
3. **Document patterns** - Update team guidelines
4. **Plan further optimizations** - Identify next bottlenecks

---

**Document Status:** FINAL - Ready for Implementation
**Approval Required:** Yes
**Estimated Total Time:** 2-3 days
**Risk Level:** Medium (with comprehensive testing and rollback plans)
