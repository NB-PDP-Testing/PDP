# Phase 3 Context: Players + Planning Tabs

**Date:** 2026-02-02
**Phase:** Week 4 Phase 3 (6 hours, 2 stories)
**Branch:** `ralph/p9-week4-team-hub`

---

## What We've Completed So Far

### ✅ Week 1-3 (Complete)
- Week 1: Collaboration Foundations (8 stories)
- Week 2: Activity Feed & AI Copilot (14 stories)
- Week 3: Multi-View, Voting, Command Palette & Gestures (17 stories)

### ✅ Week 4 Phase 1 (Complete)
**Commit:** `ae3acd71` - Tab Navigation
- Added 7-tab navigation to Team Hub
- Reused Activity Feed and Decisions (Voting) components
- Created placeholder tabs for Overview, Players, Planning, Tasks, Insights
- URL persistence with `?tab=` query parameter

**Commit:** `0b8bb284` - Schema change
- Added `sessionPlanId` to voiceNotes table (optional field)

**Commit:** `fa96d53d` - Activity Feed pagination
- Enhanced activity feed with pagination support

### ✅ Week 4 Phase 2 (Complete)
**Commit:** `140217a6` - Health & Safety Widget (US-P9-055)
- Created `getTeamHealthSummary` query
- Built Health & Safety Widget with injury severity badges
- Shows active injuries, allergy alerts, medication alerts

**Commit:** `371a02be` - Overview Dashboard (US-P9-052)
- Created `getTeamOverviewStats` and `getUpcomingEvents` queries
- Built cockpit-style Overview tab with Quick Stats panel
- Integrated Health Widget, Upcoming Events, Activity Feed summary
- Responsive 2-column desktop layout, single column mobile

### ✅ Bug Fixes & Improvements (Today)
**Commit:** `49d489f4` - Pattern B Migration
- Migrated team-insights page to Pattern B (getCoachAssignmentsWithTeams)
- Eliminated dual query pattern, reduced from 22 lines to 6 lines

**Commit:** `9912053d` - Data Migration
- Migrated coach assignments from team names to team IDs
- Fixed 5 assignments across 2 organizations

**Commit:** `65804748` - Team Hub Validator Fix + UX
- **CRITICAL FIX:** Changed teamCollaboration validators from `v.id("team")` to `v.string()`
  - Better Auth IDs are plain strings, not Convex IDs
  - This was causing "Found ID from table players" error
- Auto-select first team when multiple teams available
- Hide team selector dropdown when coach has only one team
- Show simplified team header for single-team coaches

---

## Critical Lessons Learned

### 🔴 CRITICAL: Better Auth IDs Are Strings
```typescript
// ❌ WRONG - Causes validator mismatch
export const getTeamPresence = query({
  args: { teamId: v.id("team") },  // Wrong!
});

// ✅ CORRECT - Better Auth IDs are strings
export const getTeamPresence = query({
  args: { teamId: v.string() },  // Correct!
});
```

**Why:** Better Auth tables (team, user, organization, member) use string IDs, not Convex's internal ID format. Schema uses `v.string()`, so validators MUST match.

### 🔴 CRITICAL: Pattern B is Standard
```typescript
// ✅ Pattern B: Single query with server-side join (RECOMMENDED)
const coachAssignment = useQuery(
  api.models.coaches.getCoachAssignmentsWithTeams,
  userId && orgId ? { userId, organizationId: orgId } : "skip"
);
// Returns: { teams: [{ teamId, teamName, sportCode, ... }], roles, ... }

// ❌ Pattern A: Dual queries with client-side join (DEPRECATED)
const coachAssignment = useQuery(api.models.coaches.getCoachAssignments, ...);
const allTeams = useQuery(api.models.teams.getTeamsByOrganization, ...);
// Then manually join in client code (causes N+1 queries)
```

**Migration Status:**
- ✅ team-insights: Migrated (commit 49d489f4)
- ✅ team-hub: Already using Pattern B
- ⚠️ coach-dashboard, coach-players-view: Added defensive filtering

### 🟡 Data Quality
- **Issue:** Admin UI was saving team NAMES instead of team IDs
- **Fix:** Commit 0b48f2dd fixed admin UI to save IDs directly
- **Migration:** `migrateCoachAssignmentsToTeamIds` converted 5 assignments
- **Defensive Code:** Added filtering to skip corrupted team IDs:
```typescript
coachAssignments.teams
  .filter((team) => {
    if (!(team.teamId && team.teamName)) return false;
    if (team.teamId.includes("players")) {
      console.warn(`Skipping corrupted teamId: ${team.teamId}`);
      return false;
    }
    return true;
  })
```

### 🟡 UX Patterns
- Auto-select first team using `useEffect` when multiple teams available
- Hide dropdown when single team (show simplified header instead)
- Use `!(a && b)` instead of `!a || !b` (Biome lint preference)

### 🟢 Process
- Convex error messages can be misleading (always verify with direct queries)
- Use git commit workflow: `status → diff → log → stage → commit with heredoc`
- Pre-commit hooks run Biome linting automatically

---

## Current Architecture

### Team Hub Structure
```
/orgs/[orgId]/coach/team-hub/page.tsx
├── Team Selector (conditional: only if >1 team)
├── Presence Indicators
└── Tabs
    ├── Overview Tab ✅ (Phase 2 - Complete)
    │   ├── Quick Stats Panel
    │   ├── Health & Safety Widget
    │   ├── Upcoming Events Widget
    │   └── Activity Feed Summary
    ├── Players Tab 📋 (Phase 3 - TODO)
    ├── Planning Tab 📋 (Phase 3 - TODO)
    ├── Activity Tab ✅ (Phase 1 - Complete, reused)
    ├── Decisions Tab ✅ (Phase 1 - Complete, reused)
    ├── Tasks Tab 📋 (Phase 4 - TODO)
    └── Insights Tab 📋 (Phase 4 - TODO)
```

### Backend Queries Created
- ✅ `getCoachAssignmentsWithTeams` - Pattern B standard query
- ✅ `getTeamHealthSummary` - Health widget data
- ✅ `getTeamOverviewStats` - Quick stats panel
- ✅ `getUpcomingEvents` - Next 3 events
- ✅ `getTeamPresence` - Real-time presence (validator fixed)
- ✅ `updatePresence` - Update presence (validator fixed)

---

## Phase 3: What To Build

### Story 1: US-P9-053 - Players Tab (3h)
**Goal:** Display team roster with health badges

**Backend:**
- Create `getTeamPlayersWithHealth` in `packages/backend/convex/models/teams.ts`
- Returns: playerId, fullName, jerseyNumber, position, healthStatus, isPlayingUp, photoUrl
- Health status: 🔴 Injured (severe/recent), 🟡 Recovering, 🟢 Healthy
- Use batch fetch pattern with Map (avoid N+1)

**Frontend:**
- Replace placeholder `players-tab.tsx`
- Grid layout: Mobile 1 col, Tablet 2 cols, Desktop 3-4 cols
- Player cards with photo (fallback initials), name, jersey, position, health badge
- Filters: All/Active/Injured/On Break, Position dropdown, Search, Sort (Name/Jersey/Position)
- Click card → Player Passport
- Loading: Skeleton grid (6 cards)
- Empty: "No players on this team" or "No players match filters"
- **REUSE:** PassportAvailabilityBadges, PlayerTeamBadges

**Files:**
- Modify: `players-tab.tsx`, `packages/backend/convex/models/teams.ts`
- Create: `player-card.tsx`, `player-filters.tsx`

### Story 2: US-P9-054 - Planning Tab (3h)
**Goal:** Display session plans with season milestones

**Backend:**
- Create `getSeasonMilestones` in `packages/backend/convex/models/sessionPlans.ts`
- Returns: seasonStart, seasonEnd, keyDates[]
- Calculate mid-season review (halfway between start/end)

**Frontend:**
- Replace placeholder `planning-tab.tsx`
- Session list: Upcoming (next 4 weeks) + Past (last 4 weeks, collapsed)
- Each session: Date, time, title, location, linked notes count
- **REUSE:** Existing `sessionPlans.listByTeam` query
- Season timeline: Shows season start, mid-season, end, key games
- Filter tabs: Upcoming/Past/All
- Today's session highlighted (border + background)
- Sessions with notes show badge, completed show checkmark
- Click session → session detail page
- Quick create: "+ New Session Plan" button (reuse existing modal)
- Loading: Skeleton list (5 items)
- Empty: "No sessions planned - create your first one!"
- Mobile: Stacked cards, Desktop: Table layout

**Files:**
- Modify: `planning-tab.tsx`, `packages/backend/convex/models/sessionPlans.ts`
- Create: `session-plan-list.tsx`, `season-timeline.tsx`

---

## Success Criteria

### Players Tab
- [ ] Team roster shows in responsive grid (1/2/3-4 cols)
- [ ] Health badges visible: 🟢 Healthy, 🟡 Recovering, 🔴 Injured
- [ ] Filters work: All, Active, Injured, On Break
- [ ] Position filter and search work correctly
- [ ] Click player → navigates to Player Passport
- [ ] Loading skeleton and empty states work
- [ ] Type check passes

### Planning Tab
- [ ] Session list shows upcoming and past sessions
- [ ] Season milestones timeline visible above sessions
- [ ] Filter tabs work: Upcoming/Past/All
- [ ] Today's session highlighted
- [ ] Click session → navigates to session detail
- [ ] "+ New Session Plan" button works
- [ ] Loading skeleton and empty states work
- [ ] Type check passes

### Overall
- [ ] Responsive layout works on mobile, tablet, desktop
- [ ] No TypeScript errors introduced
- [ ] Visual verification with dev-browser
- [ ] Commit: "feat: Phase 9 Week 4 Phase 3 - Players + Planning Tabs"

---

## Important Reminders

### Validators
- ✅ Use `v.string()` for Better Auth IDs (team, user, organization, member)
- ✅ Never use `v.id("team")` for Better Auth team IDs
- ✅ Schema and validators must match exactly

### Query Patterns
- ✅ Use Pattern B: `getCoachAssignmentsWithTeams`
- ✅ Batch fetch with Map lookup (no N+1 queries)
- ✅ Use `withIndex()`, never `.filter()` alone
- ✅ Include args and returns validators on ALL queries

### UI Patterns
- ✅ Mobile-first design (44px touch targets)
- ✅ Skeleton loaders (not spinners)
- ✅ Empty states with icon + title + description + CTA
- ✅ Reuse existing components when possible

### Testing
- ✅ Type check: `npm run check-types`
- ✅ Visual verification: dev-browser
- ✅ Test all breakpoints: mobile, tablet, desktop
- ✅ Test loading states and empty states

---

## Next Steps After Phase 3

**Phase 4:** Collaboration (Tasks + Insights) - 9h, 4 stories
- US-P9-059: Coach Tasks Management
- US-P9-060: Team Decision Voting (verify existing)
- US-P9-061: Voice Notes Integration (3 ways)
- US-P9-064: Shared Insights View

**Phase 5:** Quick Actions Verification - 0h (already complete from Week 3)

---

**Ready to begin Phase 3!** 🚀

Start with US-P9-053 (Players Tab) - no dependencies.
