# Phase 3 Agent Context

**Date:** 2026-02-02
**Current Phase:** Week 4 Phase 3 (Players + Planning Tabs)
**Branch:** ralph/p9-week4-team-hub

---

## ✅ Completed: Phase 1 & Phase 2

### Phase 1 Stories
- US-P9-063: Tab Navigation ✅
- US-P9-SCHEMA: sessionPlanId field ✅
- US-P9-056: Activity Feed pagination ✅

### Phase 2 Stories
- US-P9-055: Health & Safety Widget ✅
- US-P9-052: Overview Dashboard ✅

---

## 🔴 CRITICAL: Recent Bug Fixes

### 1. Validator Bug (Commit: 65804748)
**Problem:** Team Hub was failing with "Found ID from table players" error

**Root Cause:** Better Auth IDs are plain strings, NOT Convex IDs

**Fix:**
```typescript
// ❌ WRONG
args: { teamId: v.id("team") }

// ✅ CORRECT
args: { teamId: v.string() }
```

**Rule:** NEVER use `v.id()` for Better Auth table IDs (team, user, organization, member)

### 2. Pattern B Migration (Commit: 49d489f4)
**Pattern B:** `getCoachAssignmentsWithTeams` (server-side join) ✅
**Pattern A:** Dual queries with client join ❌ DEPRECATED

**Always use Pattern B** to avoid N+1 queries

### 3. Data Migration (Commit: 9912053d)
**Problem:** Coach assignments had team NAMES instead of IDs
**Fix:** Migration converted names → IDs
**Defensive code:** Skip corrupted IDs (e.g., IDs containing "players")

---

## 📋 Phase 3: What To Build

### US-P9-053: Players Tab (3h)
- Grid layout with health badges (🔴🟡🟢)
- Filters: All/Active/Injured/On Break
- Position filter, search, sort
- Backend: `getTeamPlayersWithHealth` query

### US-P9-054: Planning Tab (3h)
- Session plan list (upcoming + past)
- Season milestones timeline
- Filter tabs, quick create
- Backend: `getSeasonMilestones` query

---

## 🛡️ Mandatory Patterns

### Validators
✅ Use `v.string()` for Better Auth IDs
✅ Use `v.id("tableName")` for Convex table IDs only
✅ Schema and validators must match exactly

### Queries
✅ Use Pattern B: `getCoachAssignmentsWithTeams`
✅ Batch fetch with Map lookup (no N+1)
✅ Use `withIndex()`, NEVER `.filter()` alone
✅ Include args and returns validators

### UI
✅ Mobile-first (44px touch targets)
✅ Skeleton loaders (not spinners)
✅ Empty states with icon + title + description
✅ Reuse existing components

### Testing
✅ Type check: `npm run check-types`
✅ Visual: dev-browser
✅ All breakpoints: mobile, tablet, desktop

---

## ⚠️ Common Mistakes to Avoid

1. ❌ Using `v.id("team")` for Better Auth team IDs → Use `v.string()`
2. ❌ Using Pattern A (dual queries) → Use Pattern B
3. ❌ Using `.filter()` without `.withIndex()` → Always index first
4. ❌ N+1 queries in loops → Batch fetch with Map
5. ❌ Trusting Convex errors blindly → Verify with direct queries

---

## 📊 Current Architecture

Team Hub tabs:
- Overview ✅ (Phase 2)
- Players 📋 (Phase 3 - TODO)
- Planning 📋 (Phase 3 - TODO)
- Activity ✅ (Phase 1 - reused)
- Decisions ✅ (Phase 1 - reused)
- Tasks 📋 (Phase 4)
- Insights 📋 (Phase 4)

---

## ✅ Ready to Execute

Start with: **US-P9-053** (Players Tab)
No dependencies, can begin immediately.

Full context: `scripts/ralph/PHASE3_CONTEXT.md`
PRD config: `scripts/ralph/prd.json`
