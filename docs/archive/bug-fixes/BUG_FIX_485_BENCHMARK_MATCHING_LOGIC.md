## Fix Benchmark Matching Logic (#485 Follow-up)

### Problem

After fixing case-insensitive age group comparisons (#487), benchmarks still don't show for players. Two symptoms remain:

1. **Benchmark Comparison** says "No benchmarks are available for this player's age group and sport (soccer)"
2. **Skills Overview** radar chart says "Benchmarks coming soon"

### Root Cause

The `getBenchmarksForPlayer` query in `packages/backend/convex/models/referenceData.ts` has two fundamental flaws:

1. **Exact age group matching only.** Production benchmarks exist at U10, U12, U14, U16, U18, and Senior — but NOT at U11, U13, U15, U17. Any player whose calculated age falls into a gap gets zero results.
2. **No fallback when DOB is missing.** The query requires `dateOfBirth` to calculate the age group. If DOB isn't set, the component shows "Date of birth is required" and never attempts to use the player's enrolled team age group.

### Production Data Verified

**Soccer** (468 benchmarks): U10, U12, U14, U16, U18, Senior — levels: recreational, competitive, elite — gender: all
**Athletics** (559 benchmarks): U10, U12, U14, U16, U18, U20, Senior — levels: recreational, competitive, elite — gender: male, female
**Rugby** (646 benchmarks): levels: recreational, competitive, elite

Athletics data was migrated from `development` → `recreational` level (398 records) on 2026-02-11.

### Required Behavior

1. **Primary:** Calculate age group from `dateOfBirth`
2. **Fallback:** If no DOB, use the player's enrolled team `ageGroup`
3. **Match upward:** Find the lowest benchmark age group that is **at or above** the player's calculated age group
   - Example: U11 player → gets U12 benchmarks
   - Example: U13 player → gets U14 benchmarks
   - Example: U15 player → gets U16 benchmarks
   - Example: U12 player → gets U12 benchmarks (exact match still works)

### Existing Utility to Reuse

`packages/backend/convex/lib/ageGroupUtils.ts` provides:
- `DEFAULT_AGE_GROUP_ORDER` = ["u6", "u7", "u8", ..., "u18", "minor", "adult", "senior"]
- `getAgeGroupRank(ageGroup)` — returns numeric index for comparison

### Implementation Phases

#### Phase 1: Backend — Update `getBenchmarksForPlayer` query
**File:** `packages/backend/convex/models/referenceData.ts`

- [ ] Make `dateOfBirth` argument optional (`v.optional(v.string())`)
- [ ] Add optional `ageGroup` argument (`v.optional(v.string())`) for enrollment fallback
- [ ] Import `getAgeGroupRank` and `DEFAULT_AGE_GROUP_ORDER` from `../lib/ageGroupUtils`
- [ ] Keep existing DOB-based age calculation as primary path
- [ ] Add fallback: if no DOB, use the passed `ageGroup` arg
- [ ] Replace exact age group matching with "match upward" algorithm:
  1. Get all active benchmarks for this `sportCode`
  2. Extract distinct benchmark age groups and their ranks
  3. Find the lowest-ranked benchmark age group where `rank >= playerRank`
  4. If nothing above, use the highest available (Senior)
  5. Filter by `targetAgeGroup`, `level`, and `gender`
- [ ] Update return validator if needed

#### Phase 2: Frontend — Update `BenchmarkComparison` component
**File:** `apps/web/src/components/benchmark-comparison.tsx`

- [ ] Make `dateOfBirth` optional in `BenchmarkComparisonProps`
- [ ] Add optional `ageGroup?: string` prop
- [ ] Pass both `dateOfBirth` and `ageGroup` to the query
- [ ] Skip query only when BOTH `dateOfBirth` and `ageGroup` are missing
- [ ] Update the "no DOB" empty state to show only when both are unavailable

#### Phase 3: Frontend — Update `SkillRadarChart` component
**File:** `apps/web/src/components/skill-radar-chart.tsx`

- [ ] Add optional `ageGroup?: string` prop
- [ ] Pass `ageGroup` to the query alongside `dateOfBirth`
- [ ] Skip query only when both DOB and ageGroup are missing (currently skips if just DOB is missing)

#### Phase 4: Frontend — Update parent pages to pass `ageGroup`
**Files:**
- `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx`
- `apps/web/src/app/orgs/[orgId]/player/page.tsx`

- [ ] Pass `ageGroup` from `playerData` to `BenchmarkComparison`
- [ ] Pass `ageGroup` from `playerData` to `SkillRadarChart`
- [ ] Data source: `getFullPlayerPassportView` already returns enrollment `ageGroup`

#### Phase 5: Quality checks and deploy

- [ ] `npx -w packages/backend convex codegen` — verify backend types
- [ ] `npm run check-types` — TypeScript clean
- [ ] `npx ultracite fix` then `npm run check` — lint clean
- [ ] Deploy to production
- [ ] Verify U12 soccer player sees benchmarks in Benchmark Comparison
- [ ] Verify Skills Overview radar chart shows benchmark overlay (not "coming soon")

### Branch
`jkobrien/FixBenchmarks`

### Related
- Original issue: #485
- Case-insensitive fix PR: #487 (merged)
