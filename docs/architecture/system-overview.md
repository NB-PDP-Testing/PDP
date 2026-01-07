# Comprehensive Architecture Analysis: Multi-Sport Multi-Team Player System

**Date**: December 29, 2025
**Issue**: Team assignments not displaying for players (e.g., Clodagh Barlow)
**Root Cause**: Schema mismatch - `orgPlayerEnrollments` missing `sport` field

---

## Executive Summary

The current system expects `sport` to be stored in `orgPlayerEnrollments`, but the schema only has it in `sportPassports`. This architectural mismatch causes:
- ❌ `getEligibleTeamsForPlayer` returns empty array (checks `enrollment.sport` which doesn't exist)
- ❌ Player edit page shows no teams in assignment section
- ❌ Core team calculation impossible without sport field
- ✅ Coach/admin team roster page works (uses `teamPlayerIdentities` directly, doesn't need sport)

**Recommended Solution**: Hybrid approach combining immediate fix + schema enhancement.

---

## Current System Analysis

### Data Flow: How Teams ARE Displayed (Coach Page) ✅

**Query**: `getPlayersForTeam` (teamPlayerIdentities.ts:37-87)

```typescript
export const getPlayersForTeam = query({
  handler: async (ctx, args) => {
    // 1. Query teamPlayerIdentities by teamId
    const members = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .filter((m) => m.status === "active")
      .collect();

    // 2. Enrich with player details
    for (const member of members) {
      const player = await ctx.db.get(member.playerIdentityId);

      // 3. Get ageGroup from enrollment
      const enrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_player_and_org", (q) =>
          q.eq("playerIdentityId", player._id)
           .eq("organizationId", member.organizationId)
        )
        .first();

      // 4. Return player data (NO SPORT NEEDED!)
      results.push({
        _id: player._id,
        name: `${player.firstName} ${player.lastName}`,
        ageGroup: enrollment?.ageGroup || "",
      });
    }
  }
});
```

**Why it works**:
- ✅ Directly queries `teamPlayerIdentities` (source of truth for team membership)
- ✅ Doesn't need sport filtering
- ✅ Just enriches with player name + ageGroup

**Used by**:
- Admin teams page → shows roster correctly
- Coach dashboard → shows players correctly

---

### Data Flow: How Teams SHOULD Be Displayed (Player Edit Page) ❌

**Query**: `getEligibleTeamsForPlayer` (teamPlayerIdentities.ts:1096-1189)

```typescript
export const getEligibleTeamsForPlayer = query({
  handler: async (ctx, args) => {
    // 1. Get player's enrollment
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", ...)
      .first();

    // ❌ THIS CHECK FAILS!
    if (!(enrollment && enrollment.ageGroup && enrollment.sport)) {
      return [];  // Returns empty because enrollment.sport doesn't exist!
    }

    const playerSport = enrollment.sport;  // ❌ UNDEFINED!

    // 2. Get all teams and filter by sport
    const allTeams = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      { model: "team", where: [...] }
    );

    // 3. Filter teams by matching sport + validate eligibility
    // ... (never reached because query exits early)
  }
});
```

**Why it fails**:
- ❌ Checks `enrollment.sport` but schema has NO sport field in `orgPlayerEnrollments`
- ❌ Returns empty array before any processing
- ❌ Player edit page shows no teams

**Used by**:
- Player edit page → broken (shows no teams)
- Admin override page → broken (can't find eligible teams)

---

## Schema Analysis

### Table: `orgPlayerEnrollments` (schema.ts:314-356)

**Current Schema**:
```typescript
orgPlayerEnrollments: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  clubMembershipNumber: v.optional(v.string()),
  ageGroup: v.string(),        // ✅ Has this
  season: v.string(),          // ✅ Has this
  status: v.union(...),        // ✅ Has this
  // ❌ NO SPORT FIELD!

  // Review tracking
  reviewStatus: v.optional(v.string()),
  lastReviewDate: v.optional(v.string()),
  nextReviewDue: v.optional(v.string()),

  // Attendance
  attendance: v.optional(v.object({ ... })),

  // Notes
  coachNotes: v.optional(v.string()),
  adminNotes: v.optional(v.string()),

  // Metadata
  enrolledAt: v.number(),
  updatedAt: v.number(),
})
```

**Where sport ACTUALLY lives**: `sportPassports` table

```typescript
sportPassports: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  sportCode: v.string(),        // ✅ SPORT IS HERE!
  organizationId: v.string(),
  status: "active" | "inactive" | "archived",
  // ... positions, ratings, assessments, etc.
})
```

---

## Multi-Sport Multi-Team Scenarios

### Scenario 1: Single-Sport Player (e.g., Clodagh Barlow)

**Profile**: Plays GAA Football only

**Current Data**:
```json
{
  "playerIdentity": { "_id": "mx73...", "firstName": "Clodagh", "lastName": "Barlow" },
  "enrollment": { "ageGroup": "U18", "sport": null },  // ❌ PROBLEM!
  "sportPassport": { "sportCode": "gaa_football", "status": "active" },  // ✅ Sport here
  "teamMemberships": [
    { "teamId": "js7a...", "status": "active" }  // ✅ On U18 Girls team
  ]
}
```

**Team**: U18 Girls (Better Auth team)
```json
{
  "_id": "js7a...",
  "name": "U18 Girls",
  "ageGroup": "U18",
  "sport": "gaa_football"
}
```

**Issue**: `getEligibleTeamsForPlayer` returns `[]` because `enrollment.sport` is null.

---

### Scenario 2: Dual-Sport Player (e.g., Irish Dual Club)

**Profile**: Plays both GAA Football AND GAA Hurling (common in Ireland)

**Ideal Data Structure**:
```json
{
  "playerIdentity": { "_id": "abc123", "firstName": "Seán", "lastName": "Murphy" },

  "enrollments": [
    { "ageGroup": "U18", "sport": "gaa_football", "season": "2024-25" },
    { "ageGroup": "U18", "sport": "gaa_hurling", "season": "2024-25" }
  ],

  "sportPassports": [
    { "sportCode": "gaa_football", "status": "active" },
    { "sportCode": "gaa_hurling", "status": "active" }
  ],

  "teamMemberships": [
    { "teamId": "team_u18_football", "status": "active" },
    { "teamId": "team_u18_hurling", "status": "active" },
    { "teamId": "team_u16_football", "status": "active" }  // Playing up
  ]
}
```

**Teams**:
```json
[
  { "_id": "team_u18_football", "name": "U18 Football", "ageGroup": "U18", "sport": "gaa_football" },
  { "_id": "team_u18_hurling", "name": "U18 Hurling", "ageGroup": "U18", "sport": "gaa_hurling" },
  { "_id": "team_u16_football", "name": "U16 Football", "ageGroup": "U16", "sport": "gaa_football" }
]
```

**Core Team Logic**:
- Football core team: enrollment.sport="gaa_football" AND enrollment.ageGroup="U18" → U18 Football
- Hurling core team: enrollment.sport="gaa_hurling" AND enrollment.ageGroup="U18" → U18 Hurling

---

### Scenario 3: Player Enrolled But No Sport Yet

**Profile**: Just registered, enrollment created, no sport passport yet

**Data**:
```json
{
  "playerIdentity": { "_id": "def456", "firstName": "Emma", "lastName": "Kelly" },
  "enrollment": { "ageGroup": "U12", "sport": null, "status": "pending" },
  "sportPassports": [],  // ❌ No passport yet
  "teamMemberships": []  // ❌ Can't join teams without sport
}
```

**Behavior**:
- Cannot join any teams (don't know which sport)
- Admin must set sport first (via sport passport creation or enrollment update)

---

## Solution Options Comparison

### Option A: Add `sport` Field to `orgPlayerEnrollments` ✅ RECOMMENDED

**Changes**:
```typescript
orgPlayerEnrollments: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  ageGroup: v.string(),
  season: v.string(),
  sport: v.string(),  // ✅ ADD THIS FIELD
  // ... rest of fields
})
.index("by_player_org_sport", ["playerIdentityId", "organizationId", "sport"])
```

**Dual-Sport Handling**:
```typescript
// Create separate enrollment per sport
const footballEnrollment = await ctx.db.insert("orgPlayerEnrollments", {
  playerIdentityId: "abc123",
  organizationId: "org_dual_club",
  ageGroup: "U18",
  sport: "gaa_football",
  season: "2024-25",
  status: "active"
});

const hurlingEnrollment = await ctx.db.insert("orgPlayerEnrollments", {
  playerIdentityId: "abc123",
  organizationId: "org_dual_club",
  ageGroup: "U18",
  sport: "gaa_hurling",
  season: "2024-25",
  status: "active"
});
```

**Pros**:
- ✅ Simplest query path (one join instead of two)
- ✅ Aligns with current code expectations (`enrollment.sport`)
- ✅ Conceptually correct (enrollment IS sport-specific)
- ✅ Fast queries (one less table lookup)
- ✅ Easy to calculate core team (enrollment.sport + enrollment.ageGroup)
- ✅ Clear data model for dual-sport players (2 enrollments)

**Cons**:
- ⚠️ Schema migration required
- ⚠️ Dual-sport players have multiple enrollment records
- ⚠️ Need to backfill existing data

**Migration**:
```typescript
export const migrateEnrollmentSport = internalMutation({
  handler: async (ctx) => {
    const enrollments = await ctx.db.query("orgPlayerEnrollments").collect();

    for (const enrollment of enrollments) {
      // Get player's primary sport passport
      const passport = await ctx.db
        .query("sportPassports")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", enrollment.playerIdentityId)
        )
        .filter(q => q.eq(q.field("status"), "active"))
        .first();

      if (passport) {
        // Set sport from passport
        await ctx.db.patch(enrollment._id, {
          sport: passport.sportCode
        });
      }

      // For dual-sport players, create additional enrollments
      const allPassports = await ctx.db
        .query("sportPassports")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", enrollment.playerIdentityId)
        )
        .filter(q => q.eq(q.field("status"), "active"))
        .collect();

      if (allPassports.length > 1) {
        // Create additional enrollment per sport (skip the one we just updated)
        for (const otherPassport of allPassports.slice(1)) {
          await ctx.db.insert("orgPlayerEnrollments", {
            ...enrollment,
            sport: otherPassport.sportCode,
            _id: undefined,  // Generate new ID
          });
        }
      }
    }
  }
});
```

---

### Option B: Query `sportPassports` Instead

**Changes**:
```typescript
export const getEligibleTeamsForPlayer = query({
  handler: async (ctx, args) => {
    // 1. Get enrollment (ageGroup only)
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", ...)
      .first();

    if (!enrollment || !enrollment.ageGroup) {
      return [];
    }

    // 2. Get sport from sportPassport (NEW)
    const passport = await ctx.db
      .query("sportPassports")
      .withIndex("by_player_and_org", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
         .eq("organizationId", args.organizationId)
      )
      .filter(q => q.eq(q.field("status"), "active"))
      .first();

    if (!passport) {
      return [];  // No active sport
    }

    const playerSport = passport.sportCode;  // ✅ Get sport from passport

    // 3. Continue with team filtering
    // ...
  }
});
```

**Pros**:
- ✅ No schema changes needed
- ✅ Keeps sport in dedicated table (separation of concerns)
- ✅ Maintains current data model

**Cons**:
- ❌ More complex queries (2 joins instead of 1)
- ❌ Slower performance (extra table lookup every time)
- ❌ Dual-sport handling unclear (which passport to use?)
- ❌ What if player has no passport? (enrolled but no sport)
- ❌ Core team calculation harder (need to join 3 tables)

---

### Option C: Query `teamPlayerIdentities` Directly ✅ IMMEDIATE FIX

**Changes**:
```typescript
// NEW query - get current teams only (no eligibility check)
export const getCurrentTeamsForPlayer = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.array(v.object({
    teamId: v.string(),
    teamName: v.string(),
    ageGroup: v.string(),
    sport: v.string(),
    isCoreTeam: v.boolean(),
    status: v.string(),
  })),
  handler: async (ctx, args) => {
    // 1. Get team memberships (DIRECT LOOKUP - like coach page!)
    const memberships = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // 2. Get enrollment for core team calculation
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
         .eq("organizationId", args.organizationId)
      )
      .first();

    // 3. Enrich with team details from Better Auth
    const teams = [];
    for (const member of memberships) {
      const teamResult = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "team",
          where: [{ field: "_id", value: member.teamId, operator: "eq" }]
        }
      );

      if (teamResult) {
        const team = teamResult as BetterAuthDoc<"team">;

        // Calculate core team (ageGroup match + sport match if enrollment has sport)
        const isCoreTeam = enrollment &&
          team.ageGroup === enrollment.ageGroup;
          // Note: Can't check sport match yet since enrollment.sport doesn't exist

        teams.push({
          teamId: member.teamId,
          teamName: team.name,
          ageGroup: team.ageGroup,
          sport: team.sport,
          isCoreTeam,
          status: member.status,
        });
      }
    }

    return teams;
  }
});
```

**Update Player Edit Page**:
```typescript
// Change from:
const eligibleTeams = useQuery(
  api.models.teamPlayerIdentities.getEligibleTeamsForPlayer,
  { playerIdentityId, organizationId }
);

// To:
const currentTeams = useQuery(
  api.models.teamPlayerIdentities.getCurrentTeamsForPlayer,
  { playerIdentityId, organizationId }
);
```

**Pros**:
- ✅ **FIXES CLODAGH'S ISSUE IMMEDIATELY** (shows her U18 team)
- ✅ Uses proven pattern from coach page
- ✅ Simple, fast query (direct lookup)
- ✅ No schema changes needed
- ✅ Works with existing data

**Cons**:
- ⚠️ Only shows CURRENT teams (not potential eligible teams)
- ⚠️ Doesn't help with team assignment validation
- ⚠️ Can't calculate core team accurately without sport on enrollment
- ⚠️ Not a complete long-term solution

---

## Recommended Hybrid Approach

### Phase 1: IMMEDIATE FIX (Option C) - Deploy Today

**Goal**: Fix Clodagh's issue and unblock player team display

**Implementation**:
1. Create `getCurrentTeamsForPlayer` query (shows actual team memberships)
2. Update player edit page to use new query
3. Show only current teams (not "eligible" teams)
4. Display core team badge based on ageGroup match only (ignore sport for now)

**Result**: ✅ Players see their teams immediately

---

### Phase 2: SCHEMA ENHANCEMENT (Option A) - Deploy This Week

**Goal**: Proper multi-sport architecture with enrollment.sport

**Implementation**:

1. **Add sport field to schema**:
```typescript
orgPlayerEnrollments: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  ageGroup: v.string(),
  season: v.string(),
  sport: v.string(),  // ✅ ADD THIS
  // ... rest
})
.index("by_player_org_sport", ["playerIdentityId", "organizationId", "sport"])
```

2. **Create migration script**:
- For each enrollment, get player's primary sportPassport
- Set enrollment.sport = passport.sportCode
- For dual-sport players, create additional enrollments

3. **Update enrollment creation**:
```typescript
export const enrollPlayer = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    ageGroup: v.string(),
    season: v.string(),
    sport: v.string(),  // ✅ NOW REQUIRED
  },
  handler: async (ctx, args) => {
    // Create enrollment with sport
    const enrollmentId = await ctx.db.insert("orgPlayerEnrollments", {
      playerIdentityId: args.playerIdentityId,
      organizationId: args.organizationId,
      ageGroup: args.ageGroup,
      season: args.season,
      sport: args.sport,  // ✅ SET SPORT
      status: "active",
      enrolledAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Auto-create sport passport
    await ctx.db.insert("sportPassports", {
      playerIdentityId: args.playerIdentityId,
      sportCode: args.sport,
      organizationId: args.organizationId,
      status: "active",
      assessmentCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
});
```

4. **Update eligibility query**:
```typescript
export const getEligibleTeamsForPlayer = query({
  handler: async (ctx, args) => {
    // Get enrollment (now has sport!)
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", ...)
      .first();

    // ✅ NOW WORKS!
    if (!(enrollment && enrollment.ageGroup && enrollment.sport)) {
      return [];
    }

    const playerSport = enrollment.sport;  // ✅ EXISTS NOW!
    const playerAgeGroup = enrollment.ageGroup;

    // Continue with team filtering...
  }
});
```

5. **Core team calculation**:
```typescript
// Core team = enrollment.sport + enrollment.ageGroup matches team
const isCoreTeam =
  team.sport === enrollment.sport &&
  team.ageGroup === enrollment.ageGroup;
```

**Result**: ✅ Complete multi-sport multi-team system with proper validation

---

### Phase 3: DUAL-SPORT UI (Next Sprint)

**Goal**: UI for managing players in multiple sports

**Implementation**:
1. Player profile shows all sport enrollments
2. Admin can add/remove sports for a player
3. Each sport shows its own teams
4. Sport switcher in player edit page

---

## Migration Plan

### Step 1: Add sport field to schema

```typescript
// packages/backend/convex/schema.ts
orgPlayerEnrollments: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  clubMembershipNumber: v.optional(v.string()),
  ageGroup: v.string(),
  season: v.string(),
  sport: v.string(),  // ✅ ADD THIS - make required
  status: v.union(...),
  // ... rest
})
.index("by_player_org_sport", ["playerIdentityId", "organizationId", "sport"])
.index("by_org_sport_status", ["organizationId", "sport", "status"])
```

### Step 2: Migration script

```typescript
// packages/backend/convex/scripts/migrateEnrollmentSport.ts
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const migrateEnrollmentSport = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    processed: v.number(),
    updated: v.number(),
    duplicated: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    let processed = 0;
    let updated = 0;
    let duplicated = 0;
    const errors: string[] = [];

    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .collect();

    for (const enrollment of enrollments) {
      processed++;

      try {
        // Get all active sport passports for this player
        const passports = await ctx.db
          .query("sportPassports")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", enrollment.playerIdentityId)
          )
          .filter(q =>
            q.and(
              q.eq(q.field("organizationId"), enrollment.organizationId),
              q.eq(q.field("status"), "active")
            )
          )
          .collect();

        if (passports.length === 0) {
          errors.push(`No sport passport for player ${enrollment.playerIdentityId}`);
          continue;
        }

        // Update enrollment with first sport
        const primarySport = passports[0].sportCode;
        if (!dryRun) {
          await ctx.db.patch(enrollment._id, {
            sport: primarySport,
            updatedAt: Date.now(),
          });
        }
        updated++;

        // For dual-sport players, create additional enrollments
        for (let i = 1; i < passports.length; i++) {
          const otherSport = passports[i].sportCode;

          if (!dryRun) {
            await ctx.db.insert("orgPlayerEnrollments", {
              playerIdentityId: enrollment.playerIdentityId,
              organizationId: enrollment.organizationId,
              clubMembershipNumber: enrollment.clubMembershipNumber,
              ageGroup: enrollment.ageGroup,
              season: enrollment.season,
              sport: otherSport,
              status: enrollment.status,
              reviewStatus: enrollment.reviewStatus,
              lastReviewDate: enrollment.lastReviewDate,
              nextReviewDue: enrollment.nextReviewDue,
              attendance: enrollment.attendance,
              coachNotes: enrollment.coachNotes,
              adminNotes: enrollment.adminNotes,
              enrolledAt: enrollment.enrolledAt,
              updatedAt: Date.now(),
            });
          }
          duplicated++;
        }
      } catch (error) {
        errors.push(`Error processing enrollment ${enrollment._id}: ${error}`);
      }
    }

    return { processed, updated, duplicated, errors };
  }
});
```

### Step 3: Run migration

```bash
# Dry run first
npx convex run scripts/migrateEnrollmentSport:migrateEnrollmentSport '{"dryRun": true}'

# Review results, then run for real
npx convex run scripts/migrateEnrollmentSport:migrateEnrollmentSport '{"dryRun": false}'
```

### Step 4: Update enrollment mutations

```typescript
// packages/backend/convex/models/orgPlayerEnrollments.ts

export const enrollPlayer = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    ageGroup: v.string(),
    season: v.string(),
    sport: v.string(),  // ✅ NOW REQUIRED
    clubMembershipNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already enrolled in this org for this sport
    const existing = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_org_sport", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
         .eq("organizationId", args.organizationId)
         .eq("sport", args.sport)
      )
      .first();

    if (existing) {
      throw new Error("Player already enrolled in this sport");
    }

    const now = Date.now();

    // Create enrollment with sport
    const enrollmentId = await ctx.db.insert("orgPlayerEnrollments", {
      playerIdentityId: args.playerIdentityId,
      organizationId: args.organizationId,
      ageGroup: args.ageGroup,
      season: args.season,
      sport: args.sport,
      clubMembershipNumber: args.clubMembershipNumber,
      status: "active",
      enrolledAt: now,
      updatedAt: now,
    });

    // Auto-create or update sport passport
    const existingPassport = await ctx.db
      .query("sportPassports")
      .withIndex("by_player_and_sport", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
         .eq("sportCode", args.sport)
      )
      .first();

    let passportId;
    if (existingPassport) {
      passportId = existingPassport._id;
    } else {
      passportId = await ctx.db.insert("sportPassports", {
        playerIdentityId: args.playerIdentityId,
        sportCode: args.sport,
        organizationId: args.organizationId,
        status: "active",
        assessmentCount: 0,
        currentSeason: args.season,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { enrollmentId, passportId };
  }
});
```

---

## Testing Plan

### Test Case 1: Single-Sport Player (Clodagh)

**Setup**:
```typescript
// Player: Clodagh Barlow
// Sport: GAA Football
// Enrollment: U18, gaa_football
// Teams: U18 Girls (GAA Football)
```

**Tests**:
- [ ] Player edit page shows U18 Girls team ✅
- [ ] U18 Girls marked as core team (ageGroup=U18, sport=gaa_football) ✅
- [ ] Can add Clodagh to U16 Girls (playing down allowed with override) ✅
- [ ] Cannot add Clodagh to U18 Hurling (different sport) ❌

---

### Test Case 2: Dual-Sport Player

**Setup**:
```typescript
// Player: Seán Murphy
// Sports: GAA Football + GAA Hurling
// Enrollments:
//   - U18, gaa_football
//   - U18, gaa_hurling
// Teams: U18 Football, U18 Hurling, U16 Football
```

**Tests**:
- [ ] Player has 2 enrollments (one per sport) ✅
- [ ] Player edit page shows all 3 teams ✅
- [ ] U18 Football marked as core team for football enrollment ✅
- [ ] U18 Hurling marked as core team for hurling enrollment ✅
- [ ] Can switch between sports in UI ✅
- [ ] Eligibility validation checks correct sport ✅

---

### Test Case 3: New Player (No Sport Yet)

**Setup**:
```typescript
// Player: Emma Kelly
// Enrollments: None
// Sports: None
// Teams: None
```

**Tests**:
- [ ] Cannot join any teams without enrollment ❌
- [ ] Admin must create enrollment with sport first ✅
- [ ] After enrollment, can join teams matching sport ✅

---

## Summary & Next Steps

### ✅ Immediate Actions (Today)

1. **Create immediate fix query** (`getCurrentTeamsForPlayer`)
2. **Update player edit page** to use new query
3. **Deploy** to fix Clodagh's issue

**Files to modify**:
- `/packages/backend/convex/models/teamPlayerIdentities.ts` (add new query)
- `/apps/web/src/app/orgs/[orgId]/players/[playerId]/edit/page.tsx` (use new query)

---

### ✅ Schema Enhancement (This Week)

1. **Add sport to schema** (`orgPlayerEnrollments.sport`)
2. **Create migration script** (`migrateEnrollmentSport.ts`)
3. **Run migration** (dry run → production)
4. **Update enrollment mutations** (require sport)
5. **Update eligibility query** (use enrollment.sport)
6. **Test dual-sport scenarios**

**Files to modify**:
- `/packages/backend/convex/schema.ts`
- `/packages/backend/convex/scripts/migrateEnrollmentSport.ts` (new)
- `/packages/backend/convex/models/orgPlayerEnrollments.ts`
- `/packages/backend/convex/models/teamPlayerIdentities.ts`

---

### 🎯 Why This Approach is Best

1. **Multi-Sport Support**: ✅ Dual-sport players have separate enrollments per sport
2. **Performance**: ✅ Fast queries (enrollment.sport is indexed)
3. **Data Integrity**: ✅ Single source of truth (enrollment.sport)
4. **Core Team Calculation**: ✅ Simple logic (enrollment.sport + enrollment.ageGroup)
5. **Backwards Compatible**: ✅ Migration handles existing data
6. **Clear Semantics**: ✅ Enrollment IS sport-specific conceptually
7. **Immediate Fix**: ✅ Phase 1 unblocks users today
8. **Long-term Scalable**: ✅ Phase 2 provides proper architecture

---

**Questions for Review**:
1. Should we make sport required or optional in enrollment schema?
2. How should UI handle dual-sport enrollment creation?
3. Should we show all sports in player edit page or add sport switcher?
4. Migration timing - can we run during business hours or need downtime?
