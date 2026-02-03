# Pattern B Migration Plan - Path Forward Options

**Date**: 2026-02-02
**Status**: Awaiting user decision

---

## Current State

### ✅ Already Using Pattern B (Correct)
- `/coach/team-hub` (Team Hub Overview + Health Widget)
- `/coach/assess` (Player Assessment)
- `/coach/session-plans` (Session Plans)
- `/coach/goals` (Development Goals)

### ⚠️ Still Using Pattern A (Inconsistent)
- `/coach` (Main Dashboard) - `apps/web/src/app/orgs/[orgId]/coach/coach-dashboard.tsx`
- `/coach/players` (Players View) - `apps/web/src/app/orgs/[orgId]/coach/coach-players-view.tsx`
- `/coach/todos` (Todos View) - `apps/web/src/app/orgs/[orgId]/coach/coach-todos-view.tsx`

### 🔍 Data Quality Issue
- `coachAssignments.teams` array contains **mixed formats**:
  - Team IDs: `"jh7abc123"` (correct format)
  - Team names: `"Senior Women"` (legacy format from admin UI bug)
  - Player IDs: `"js79xewp..."` (data corruption)
- Better Auth `team` table is **empty** in test environment
- Both patterns handle this defensively, but it masks underlying issue

---

## Option 1: Full Consistency Migration (RECOMMENDED)

**Goal**: Standardize entire codebase on Pattern B

### Actions

#### 1A. Migrate Pattern A Files to Pattern B
Update 3 files to use `getCoachAssignmentsWithTeams`:

**Files to modify:**
```
apps/web/src/app/orgs/[orgId]/coach/
  ├── coach-dashboard.tsx         (lines 50-161: replace dual query + resolution)
  ├── coach-players-view.tsx      (similar pattern as dashboard)
  └── coach-todos-view.tsx        (similar pattern as dashboard)
```

**Changes per file:**
- Replace 2 queries with 1 query to `getCoachAssignmentsWithTeams`
- Remove 30+ lines of client-side resolution logic
- Use simple `coachAssignments.teams.map()` pattern like Team Hub
- Remove duplicate defensive code for legacy data

**Estimated effort**: 2-3 hours (straightforward refactor)

#### 1B. Fix Root Cause of Data Corruption (OPTIONAL)
**File**: `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx` (lines 469-492)

**Problem**: Admin UI converts team IDs → names before saving
```typescript
// Current (WRONG):
const teamNames = (state.teams || [])
  .map((teamIdOrName: string) => {
    const teamById = teams?.find((t: any) => t._id === teamIdOrName);
    if (teamById) {
      return teamById.name; // ← Converts ID to name!
    }
    return teamIdOrName;
  })

// Should be:
const teamIds = state.teams || []; // Pass IDs directly
```

**Impact**: Prevents future data corruption when admins update assignments

#### 1C. Run Data Migration (OPTIONAL - When Teams Exist)
**File**: `packages/backend/convex/migrations/fixCoachTeams.ts` (already created)

**What it does**:
- Converts team names → team IDs in existing `coachAssignments` records
- Handles player ID corruption (looks up player's teams)
- Only runs when `team` table has data

**Run command**: `npx convex run migrations/fixCoachTeams:fix`

**Note**: Currently would do nothing (team table empty). Run after test data created.

### Pros
- ✅ **Consistency**: All coach pages use same pattern
- ✅ **Performance**: 50% fewer queries site-wide (10 → 5 subscriptions)
- ✅ **Maintainability**: Single source of truth for team resolution
- ✅ **Future-proof**: New pages follow established Pattern B standard
- ✅ **Code quality**: Remove 90+ lines of duplicate logic

### Cons
- ⚠️ **Testing required**: Must verify all 3 migrated pages still work correctly
- ⚠️ **Time investment**: 2-3 hours development + testing

### Timeline
1. Migrate `coach-dashboard.tsx` (1 hour)
2. Test main dashboard thoroughly (30 min)
3. Migrate `coach-players-view.tsx` (45 min)
4. Migrate `coach-todos-view.tsx` (45 min)
5. Full regression testing (1 hour)
6. (Optional) Fix admin UI bug (30 min)
7. (Optional) Run migration when test data exists (5 min)

---

## Option 2: Document Pattern B as Standard (MINIMAL)

**Goal**: Accept current state, standardize for future only

### Actions

#### 2A. Document Pattern Decision
Create `docs/development/query-patterns.md`:
```markdown
## Coach Team Assignment Queries

### Standard Pattern (Use for ALL new code)
Use `getCoachAssignmentsWithTeams` for single-query enriched data.

### Legacy Pattern (Do NOT use for new code)
Pattern A (dual query) exists in 3 files for backward compatibility.
Do not copy this pattern.
```

#### 2B. Add Code Comments
Add comments to Pattern A files:
```typescript
// LEGACY PATTERN: This file uses dual-query pattern for historical reasons.
// New code should use getCoachAssignmentsWithTeams (see team-hub/page.tsx).
// TODO: Migrate to Pattern B in future refactor.
```

### Pros
- ✅ **Low effort**: 30 minutes documentation
- ✅ **No risk**: No code changes, no testing needed
- ✅ **Future clarity**: Developers know which pattern to use

### Cons
- ❌ **Inconsistency remains**: 4 files use Pattern B, 3 use Pattern A
- ❌ **Performance impact**: 5 extra subscriptions per coach session
- ❌ **Maintenance burden**: Must maintain both patterns
- ❌ **Confusion**: New developers must understand two approaches
- ❌ **Code duplication**: 90+ lines of duplicate resolution logic

---

## Option 3: Hybrid Approach (PRAGMATIC)

**Goal**: Migrate opportunistically as pages are touched

### Actions

#### 3A. Document Pattern B as Standard (Same as Option 2A)

#### 3B. Create Migration Checklist
Add to project backlog:
```markdown
## Technical Debt: Pattern A → Pattern B Migration

**Priority**: Medium
**Effort**: 3-4 hours

Migrate these files when making changes:
- [ ] coach-dashboard.tsx
- [ ] coach-players-view.tsx
- [ ] coach-todos-view.tsx

**Benefits**: 50% fewer queries, cleaner code, better performance
```

#### 3C. Migrate Files as Touched
When making future changes to any Pattern A file:
- Migrate to Pattern B in same PR
- Add 30-45 minutes to estimate
- Test thoroughly

### Pros
- ✅ **Low immediate effort**: Just documentation
- ✅ **Gradual improvement**: Consistency improves over time
- ✅ **No dedicated testing**: Migration happens with feature work

### Cons
- ⚠️ **Slow progress**: May take months if files rarely touched
- ⚠️ **Inconsistency persists**: No guaranteed timeline for completion
- ⚠️ **Opportunity cost**: Performance impact continues

---

## Comparison Matrix

| Aspect | Option 1: Full Migration | Option 2: Document Only | Option 3: Hybrid |
|--------|-------------------------|------------------------|------------------|
| **Immediate Effort** | 2-3 hours | 30 minutes | 30 minutes |
| **Performance Gain** | Immediate (50% fewer queries) | None | Gradual |
| **Consistency** | Complete | Documented only | Eventual |
| **Risk** | Low (straightforward refactor) | None | Low |
| **Testing Required** | Yes (3 files) | No | Per-file as migrated |
| **Time to Completion** | 1 day | N/A | Months (opportunistic) |
| **Code Quality** | Excellent | Status quo | Gradual improvement |
| **Future Maintenance** | Single pattern | Dual patterns | Transitions to single |

---

## Recommendation: Option 1 (Full Consistency Migration)

### Why?

1. **Small Investment, Big Return**
   - 2-3 hours effort → permanent 50% query reduction
   - Remove 90+ lines of duplicate code
   - Eliminate confusion for future developers

2. **Already Validated**
   - Pattern B proven in 4 production pages
   - Same refactor pattern applies to all 3 files
   - Low risk of regression

3. **Performance Impact**
   - Current: 10 Convex subscriptions per coach session (5 pages × 2 queries)
   - After: 5 Convex subscriptions per coach session (5 pages × 1 query)
   - At scale: Significant cost savings (see Jan 2026 optimization project)

4. **Right Time**
   - Just completed comprehensive analysis of both patterns
   - Full understanding of code and data model fresh in context
   - Ralph just finished Phase 9 work - good checkpoint for cleanup

5. **Clean Foundation**
   - Team Hub (new feature) already uses Pattern B correctly
   - Migrating old files matches new standard
   - Leaves codebase in excellent state for future phases

### Implementation Plan (if Option 1 chosen)

**Phase 1: Migrate Main Dashboard**
1. Create branch: `refactor/pattern-b-coach-pages`
2. Update `coach-dashboard.tsx`:
   - Replace lines 50-51 (dual queries) with single Pattern B query
   - Delete lines 126-161 (resolution logic)
   - Add simple mapping like team-hub (lines 83-95)
3. Test `/coach` page thoroughly
4. Commit: "refactor: migrate coach dashboard to Pattern B"

**Phase 2: Migrate Remaining Files**
5. Update `coach-players-view.tsx` (same pattern)
6. Update `coach-todos-view.tsx` (same pattern)
7. Test all coach pages end-to-end
8. Commit: "refactor: migrate all coach pages to Pattern B"

**Phase 3: Fix Root Cause (Optional)**
9. Update `admin/users/page.tsx` lines 469-492
10. Test admin user assignment flow
11. Commit: "fix: admin UI saves team IDs not names"

**Phase 4: Documentation**
12. Update `docs/development/query-patterns.md`
13. Add migration notes to CHANGELOG
14. Commit: "docs: document Pattern B as standard"

**Total Time**: 3-4 hours including testing

---

## Data Migration Considerations

### Current Database State
- Better Auth `team` table: **EMPTY**
- `coachAssignments.teams`: Contains team names (legacy) and one player ID (corruption)
- No actual teams exist in test environment

### When to Run Migration

**DO NOT run migration now** - it would fail (no teams to map to)

**Run migration when:**
1. Test teams are created via admin UI or seed script
2. Org has real team data in `team` table
3. Want to clean up legacy team name references

**Migration is optional** - both patterns handle legacy data defensively. The migration just cleans it up for consistency.

---

## Questions for User

1. **Which option do you prefer?**
   - Option 1: Full migration now (2-3 hours, complete consistency)
   - Option 2: Document only (30 min, accept inconsistency)
   - Option 3: Migrate opportunistically (30 min now, gradual over time)

2. **Should we fix admin UI bug?** (lines 469-492 in admin/users/page.tsx)
   - Prevents future data corruption
   - 30 minutes effort
   - Recommended: Yes

3. **Data migration priority?**
   - Run after test data exists? (5 min when ready)
   - Skip it? (both patterns handle legacy data)
   - Recommended: Run when test teams exist

4. **Testing approach?**
   - Manual testing in browser (thorough but time-consuming)
   - Visual verification with dev-browser (faster)
   - Just type-check and run (risky but fast)
   - Recommended: Visual verification + spot-check critical flows

---

## Next Steps (Awaiting Decision)

Once you choose an option, I will:
- [ ] Implement chosen approach
- [ ] Update documentation
- [ ] Run tests/verification
- [ ] Create commit(s) with clear messages
- [ ] Update this plan with completion status

**Status**: Ready to proceed with any option
