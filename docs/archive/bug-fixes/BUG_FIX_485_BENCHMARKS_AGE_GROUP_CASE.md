## Bug #485 — Benchmarks Not Showing Up

### Problem
Coach selects a player under "My Players", navigates to benchmark comparison, and sees "No benchmarks available for this player's age group" despite U12 benchmarks existing. Similarly, the Skills Overview shows "Benchmark coming soon" even though benchmarks have been created and applied.

### Root Cause
**Case-sensitive string comparison on `ageGroup` values.** Throughout the codebase, age group matching used strict `===` comparison (e.g., `"U12" === "u12"` returns `false`). If the stored age group on a player enrollment and the stored age group on a benchmark differed in casing, the benchmark lookup would silently return no results.

### Fix Applied
Added `.toLowerCase()` to all age group comparisons across 11 files — both backend (Convex) and frontend (Next.js).

#### Backend (5 files)

| File | Function/Context | Change |
|------|-----------------|--------|
| `convex/models/referenceData.ts` | `getBenchmarksForPlayer` — matches benchmark age group to player's age group code | Case-insensitive |
| `convex/models/skillBenchmarks.ts` | `getBenchmarksForAgeGroup` — filters benchmarks by age group | Case-insensitive |
| `convex/models/skillAssessments.ts` | `getClubBenchmarkAnalytics` — validates player enrollment age group | Case-insensitive |
| `convex/models/orgPlayerEnrollments.ts` | `getPlayersForOrg` — age group filter parameter | Case-insensitive |
| `convex/models/teams.ts` | "Is playing up" detection (`enrollment.ageGroup !== team.ageGroup`) | Case-insensitive |

#### Frontend (6 files)

| File | Context | Change |
|------|---------|--------|
| `coach/coach-dashboard.tsx` | Age group filter dropdown | Case-insensitive |
| `coach/players/components/coach-players-view.tsx` | Core team matching (team.ageGroup vs player.ageGroup) | Case-insensitive |
| `admin/players/page.tsx` | Admin player list age group filter | Case-insensitive |
| `admin/benchmarks/page.tsx` | Benchmark filter, sort ordering, and age group name lookup | Case-insensitive |
| `admin/player-import/page.tsx` | Import team matching | Case-insensitive |
| `components/gaa-import.tsx` | GAA import team matching | Case-insensitive |

### Verification
- `npx -w packages/backend convex codegen` — passed
- `npm run check-types` — passed (no new errors)
- `npx ultracite fix` — no new lint issues

### Branch
`jkobrien/485_FixAgeComparison`
