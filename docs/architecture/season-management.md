# Season Management Analysis & Architecture

**Date**: December 30, 2025
**Status**: 🔍 Analysis Complete - Awaiting Architectural Decision
**Priority**: Medium (After Sport Field Architecture)

---

## 📋 Executive Summary

The current season management approach has inconsistent formats and no proper support for cross-year sports (e.g., Soccer: Sept→May). Season fields exist in multiple tables but are never used for filtering or queries. This document analyzes the current state and proposes two architectural options.

---

## 🔍 Current State Analysis

### Season Fields in Schema

| Table | Field | Type | Indexed? | Format | Example |
|-------|-------|------|----------|---------|---------|
| **orgPlayerEnrollments** | `season` | `v.string()` **required** | ❌ No | Year | `"2025"` |
| **teamPlayerIdentities** | `season` | `v.optional(v.string())` | ❌ No | Year range | `"2024-25"` |
| **players** (legacy) | `season` | `v.string()` | ❌ No | Year | `"2025"` |
| **sportPassports** | `currentSeason` | `v.optional(v.string())` | ❌ No | Year | `"2025"` |
| **sportPassports** | `seasonsPlayed` | `v.optional(v.array(v.string()))` | ❌ No | Array | `["2024", "2025"]` |

### 🚨 Critical Issues

1. **Inconsistent Format**:
   - `orgPlayerEnrollments`: `"2025"` (single year)
   - `teamPlayerIdentities`: `"2024-25"` (year range)
   - No standard across tables!

2. **No Indexes**:
   - Cannot efficiently query "all enrollments for season 2024-25"
   - No `by_season` or `by_org_and_season` indexes exist

3. **No Date Ranges**:
   - Cannot filter by actual dates (e.g., "Sept 2024 - May 2025")
   - Cannot determine if enrollment is "current" based on dates

4. **Cross-Year Sports Problem**:
   - Soccer season (Sept→May) spans two calendar years
   - Current model: `"2025"` doesn't capture Sept 2024→May 2025

5. **Default Values Problem**:
   ```typescript
   // medicalProfiles.ts:255
   season: new Date().getFullYear().toString()  // "2025"
   ```
   - Wrong for cross-year sports!
   - Soccer player registering in Sept 2024 gets `"2024"` but season is `"2024-25"`

---

## 💻 Current Usage Patterns

### Where Season is SET

```typescript
// medicalProfiles.ts:255 - PROBLEM: Auto-uses current year
season: new Date().getFullYear().toString()  // "2025"

// orgPlayerEnrollments.ts:313 - From user input
season: args.season  // User provides

// playerImport.ts:490 - From import file
season: args.season  // From CSV/import file

// teamPlayerIdentities.ts:440 - Optional parameter
season: args.season  // Optional
```

### Where Season is USED

Currently **NOT USED for filtering or queries**!

Season is only used for:
- ✅ Display purposes
- ✅ Audit trail
- ❌ **NOT** for filtering active enrollments
- ❌ **NOT** for season-specific team rosters
- ❌ **NOT** for historical reporting

**Code Search Results:**
- No `filter(q => q.eq(q.field("season"), ...))` found
- No `withIndex` queries on season
- Season is stored but never queried

---

## 🏗️ Proposed Architecture Options

### Option A: Standardized Year Range String (Quick Fix)

**Changes Required:**

1. **Standardize format** to `"YYYY-YY"` everywhere:

```typescript
// New helper function
export function formatSeason(startYear: number): string {
  const endYear = (startYear + 1) % 100;  // 2024 → 25
  return `${startYear}-${endYear.toString().padStart(2, '0')}`;
}

// Usage
season: formatSeason(2024)  // "2024-25"
```

2. **Add indexes**:

```typescript
orgPlayerEnrollments: defineTable({
  // ... existing fields
  season: v.string(),  // Format: "YYYY-YY"
})
.index("by_org_and_season", ["organizationId", "season"])
.index("by_season", ["season"])

teamPlayerIdentities: defineTable({
  // ... existing fields
  season: v.optional(v.string()),  // Format: "YYYY-YY"
})
.index("by_season", ["season"])
```

3. **Add helper fields** for year-based queries:

```typescript
orgPlayerEnrollments: defineTable({
  // ... existing fields
  season: v.string(),  // "2024-25"
  seasonStartYear: v.number(),  // 2024 (computed)
  seasonEndYear: v.number(),    // 2025 (computed)
})
```

**Pros:**
- ✅ Simple to implement
- ✅ Human-readable
- ✅ Can index for queries
- ✅ Handles cross-year sports

**Cons:**
- ❌ Still doesn't handle actual dates
- ❌ Ambiguous for northern/southern hemisphere
- ❌ No support for mid-year seasons (e.g., "Spring 2025")

---

### Option B: Date-Based Seasons Table (Proper Solution)

**New Table:**

```typescript
seasons: defineTable({
  organizationId: v.string(),
  sportCode: v.optional(v.string()),  // Sport-specific seasons

  // Display
  name: v.string(),  // "2024-25 Soccer Season", "2025 GAA Season"
  shortName: v.string(),  // "2024-25", "2025"

  // Date range
  startDate: v.string(),  // ISO: "2024-09-01"
  endDate: v.string(),    // ISO: "2025-05-31"

  // Status
  status: v.union(
    v.literal("upcoming"),   // Not started yet
    v.literal("active"),     // Currently running
    v.literal("completed"),  // Finished
    v.literal("archived")    // Historical only
  ),

  // Registration periods
  registrationOpenDate: v.optional(v.string()),
  registrationCloseDate: v.optional(v.string()),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_organization", ["organizationId"])
.index("by_org_and_sport", ["organizationId", "sportCode"])
.index("by_status", ["status"])
.index("by_org_status", ["organizationId", "status"])
```

**Updated Enrollment:**

```typescript
orgPlayerEnrollments: defineTable({
  // ... existing fields
  seasonId: v.id("seasons"),  // ← Reference to season
  // Keep old field for backward compatibility:
  season: v.optional(v.string()),  // DEPRECATED
})
.index("by_season", ["seasonId"])
.index("by_org_and_season", ["organizationId", "seasonId"])
```

**Helper Queries:**

```typescript
// Get active season for org/sport
export const getActiveSeason = query({
  args: {
    organizationId: v.string(),
    sportCode: v.optional(v.string())
  },
  returns: v.union(seasonValidator, v.null()),
  handler: async (ctx, args) => {
    const now = new Date().toISOString().split('T')[0];  // "2025-01-15"

    return await ctx.db
      .query("seasons")
      .withIndex("by_organization", q =>
        q.eq("organizationId", args.organizationId)
      )
      .filter(q =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.lte(q.field("startDate"), now),
          q.gte(q.field("endDate"), now),
          args.sportCode
            ? q.eq(q.field("sportCode"), args.sportCode)
            : true
        )
      )
      .first();
  }
});

// Check if enrollment is for current season
export const isCurrentSeasonEnrollment = query({
  args: { enrollmentId: v.id("orgPlayerEnrollments") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment?.seasonId) return false;

    const season = await ctx.db.get(enrollment.seasonId);
    return season?.status === "active";
  }
});

// Get all seasons for org
export const getSeasonsForOrg = query({
  args: {
    organizationId: v.string(),
    sportCode: v.optional(v.string()),
    status: v.optional(seasonStatusValidator)
  },
  returns: v.array(seasonValidator),
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("seasons")
      .withIndex("by_organization", q =>
        q.eq("organizationId", args.organizationId)
      );

    if (args.status) {
      query = query.filter(q => q.eq(q.field("status"), args.status));
    }

    if (args.sportCode) {
      query = query.filter(q =>
        q.eq(q.field("sportCode"), args.sportCode)
      );
    }

    return await query.collect();
  }
});
```

**Pros:**
- ✅ Proper date handling
- ✅ Sport-specific seasons
- ✅ Registration period tracking
- ✅ Query by actual date ranges
- ✅ Support multiple active seasons simultaneously
- ✅ Season lifecycle management (upcoming → active → completed → archived)
- ✅ Clear season boundaries

**Cons:**
- ⚠️ More complex migration required
- ⚠️ Requires season creation/management UI
- ⚠️ Backward compatibility handling needed
- ⚠️ More complex queries

---

## 📅 Cross-Year Sport Examples

### Soccer (European - Sept to May)

```typescript
{
  organizationId: "org_abc123",
  sportCode: "soccer",
  name: "2024-25 Soccer Season",
  shortName: "2024-25",
  startDate: "2024-09-01",
  endDate: "2025-05-31",
  status: "active",
  registrationOpenDate: "2024-07-01",
  registrationCloseDate: "2024-09-15"
}
```

### GAA (Ireland - Jan to Dec)

```typescript
{
  organizationId: "org_abc123",
  sportCode: "gaa_football",
  name: "2025 GAA Season",
  shortName: "2025",
  startDate: "2025-01-01",
  endDate: "2025-12-31",
  status: "active",
  registrationOpenDate: "2024-11-01",
  registrationCloseDate: "2025-01-15"
}
```

### Multi-Sport Organization

```typescript
// Organization runs both GAA and Soccer with different seasons
seasons: [
  {
    organizationId: "org_abc123",
    sportCode: "gaa_football",
    name: "2025 GAA Season",
    shortName: "2025",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    status: "active"
  },
  {
    organizationId: "org_abc123",
    sportCode: "soccer",
    name: "2024-25 Soccer Season",
    shortName: "2024-25",
    startDate: "2024-09-01",
    endDate: "2025-05-31",
    status: "active"
  }
]

// Player enrolled in both sports has TWO enrollments:
enrollments: [
  {
    playerIdentityId: "player_123",
    organizationId: "org_abc123",
    seasonId: "season_gaa_2025",  // References GAA season
    sport: "gaa_football"
  },
  {
    playerIdentityId: "player_123",
    organizationId: "org_abc123",
    seasonId: "season_soccer_2024-25",  // References Soccer season
    sport: "soccer"
  }
]
```

---

## 🔄 Season Lifecycle Management

```
┌─────────────────────────────────────────────────────────────────────┐
│ SEASON STATE TRANSITIONS                                            │
└─────────────────────────────────────────────────────────────────────┘

UPCOMING ─────────> ACTIVE ─────────> COMPLETED ─────────> ARCHIVED
   │                  │                    │                    │
   │                  │                    │                    │
   ├─ Create season  ├─ Registration      ├─ Season ends      ├─ Long-term
   ├─ Set dates      ├─ Enrollment        ├─ Finalize         │   storage
   ├─ Open reg       ├─ Games/training    │   results          ├─ Historical
   │                  ├─ Skills tracking   ├─ Reports          │   analysis
   │                  ├─ Team management   ├─ Read-only        ├─ Cannot
   │                  │                    │                    │   modify
```

### State Descriptions

| State | Description | Actions Allowed |
|-------|-------------|----------------|
| **upcoming** | Season created but not started | Edit dates, delete, open registration |
| **active** | Season currently running | Enroll players, manage teams, track skills |
| **completed** | Season finished | View data, generate reports, archive |
| **archived** | Historical data only | Read-only, analytics, compliance |

---

## 🎯 Implementation Recommendations

### Phase 1: Immediate (Option A Enhanced)

**Timeline**: 1-2 days

1. **Standardize season format** to `"YYYY-YY"`:
   - Create helper function `formatSeason(startYear: number): string`
   - Update all code that sets season to use this helper
   - Migrate existing data to new format

2. **Add indexes**:
   ```typescript
   .index("by_org_and_season", ["organizationId", "season"])
   .index("by_season", ["season"])
   ```

3. **Add computed fields** to enrollments:
   ```typescript
   seasonStartYear: v.number(),  // Parsed from "2024-25" → 2024
   seasonEndYear: v.number(),    // Parsed from "2024-25" → 2025
   ```

4. **Update import code** to use standardized format

### Phase 2: Proper Solution (Option B)

**Timeline**: 1-2 weeks

1. **Create seasons table** with schema above
2. **Build season management UI**:
   - List seasons
   - Create new season
   - Edit season dates
   - Activate/complete/archive seasons
3. **Migrate enrollments** to use `seasonId`
4. **Add season selector** to import wizard
5. **Update queries** to use season references
6. **Keep backward compatibility** with string season field

---

## ❓ Open Questions

Before implementing, we need to decide:

1. **Season Scope**:
   - Are seasons org-wide or sport-specific?
   - Can an org have different seasons for different sports? (e.g., Soccer Sept-May, GAA Jan-Dec)

2. **Season Transitions**:
   - How do we handle the transition period? (e.g., Sept 1st switch)
   - Can we have overlapping seasons? (e.g., Winter league + Summer league)

3. **Multiple Active Seasons**:
   - Can multiple seasons be active simultaneously?
   - How do we determine "current" season when there are multiple?

4. **Import Format**:
   - What season format is in your CSV import files? (`"2025"` or `"2024-25"`)
   - Should import wizard auto-detect current season?

5. **Default Season**:
   - When creating enrollment without season specified, what do we use?
   - Should it auto-select "active" season for that sport?

6. **Historical Data**:
   - Do we need to query across multiple seasons? (e.g., "player's stats over last 3 seasons")
   - How long do we keep archived season data?

---

## 📚 Related Documentation

- Schema definition: `/packages/backend/convex/schema.ts` (lines 314-363, 605-633)
- Enrollment functions: `/packages/backend/convex/models/orgPlayerEnrollments.ts`
- Import code: `/packages/backend/convex/models/playerImport.ts`

---

## 🎯 Next Steps

1. **Immediate**: Document this analysis (✅ DONE)
2. **Next**: Complete sport field architecture decision
3. **Then**: Return to season management with architectural decision
4. **Finally**: Implement chosen season approach

---

**Last Updated**: December 30, 2025
**Author**: Development Team
**Status**: Awaiting architectural decision
