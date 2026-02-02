# Phase 4 Final Recommendations
## Ready for Ralph Execution

**Date**: 2026-02-02
**Status**: All gaps resolved, ready to update PRD

---

## ✅ Decisions Made

### 1. Table Name: Use `coachTasks` (Already Exists)
**Why**: Schema line 925 shows `coachTasks` already exists with rich structure
**Action**: Change all `teamTasks` → `coachTasks` in Phase 4 PRD
**Schema Enhancement**: Add only ONE field:
```typescript
status: v.optional(v.union(
  v.literal("open"),
  v.literal("in-progress"),
  v.literal("done")
))
```

**Benefits**:
- ✅ Voice note linking already exists (`voiceNoteId` field)
- ✅ Player linking already exists (`playerIdentityId` field)
- ✅ Team scope already exists (`teamId` field)
- ✅ Priorities, due dates, source tracking all exist
- ✅ Indexes already optimized (`by_team_and_org`, `by_assigned_user_and_org`)

**Query Pattern**:
```typescript
// Get team tasks
const teamTasks = await ctx.db
  .query("coachTasks")
  .withIndex("by_team_and_org", q =>
    q.eq("teamId", args.teamId).eq("organizationId", args.organizationId)
  )
  .filter(q => q.neq(q.field("completed"), true)) // For "open" filter
  .collect();
```

---

### 2. Bottom Nav: 5 Items in User-Specified Order
**Order**: Overview → Players → Voice (center) → Team Hub → Tasks

**Rationale**:
- Voice in center-right for quick access (user's key feature)
- Team Hub accessible for comprehensive team view
- Tasks at end for personal task management
- 5 items fits on mobile (max recommended)

**Code**:
```typescript
const coachBottomNavItems: BottomNavItem[] = [
  { id: "overview", icon: Home, label: "Overview" },
  { id: "players", icon: Users, label: "Players" },
  { id: "voice", icon: Mic, label: "Voice", highlight: true }, // Center-right, highlighted
  { id: "team-hub", icon: LayoutDashboard, label: "Hub" },
  { id: "todos", icon: CheckSquare, label: "Tasks" },
];
```

---

## 📋 Required PRD Updates

### Update 1: US-P9-057 (Tasks Tab) Changes

#### Schema Section - Change From:
```json
"Schema fields: _id, teamId, organizationId, title, description, assigneeId (userId), assigneeName, dueDate, priority (high/medium/low), status (open/in-progress/done), createdBy, createdAt, updatedAt, completedAt"
```

#### Schema Section - Change To:
```json
"Schema: Enhance EXISTING coachTasks table (no new table needed!)",
"Add ONE field: status: v.optional(v.union(v.literal('open'), v.literal('in-progress'), v.literal('done')))",
"Existing fields to use: text (=title), assignedToUserId (=assigneeId), assignedToName, teamId, organizationId, priority, dueDate, completed, createdAt, completedAt, playerIdentityId, voiceNoteId",
"Note: 'completed' field exists (boolean), 'status' field adds granularity for in-progress tracking"
```

#### Backend Section - Add:
```json
"Backend: Use EXISTING coachTasks table, not new teamTasks",
"Backend: Add status field to schema (optional, defaults to null for existing tasks)",
"Backend: Filter by teamId for team-scoped tasks",
"Backend: Use existing indexes: by_team_and_org, by_assigned_user_and_org",
"Query pattern: .withIndex('by_team_and_org').filter(status check)"
```

#### New Acceptance Criteria - Add:
```json
"Backend: Create activity feed entries on task create/complete/assign",
"Schema: Add task_created, task_completed, task_assigned to teamActivityFeed.actionType enum",
"Frontend: Tasks appear in Activity Feed tab with appropriate icons",
"Integration: Update Quick Stats Panel to show 'Open Tasks' count (replace attendance placeholder)",
"Integration: getTeamOverviewStats query returns openTasks, overdueCount",
"Voice Notes: Task card shows voice note icon badge if linkedTaskId exists"
```

---

### Update 2: US-P9-058 (Insights Tab) Changes

#### New Acceptance Criteria - Add:
```json
"Backend: Create activity feed entries on insight generation",
"Schema: Add insight_generated to teamActivityFeed.actionType enum",
"Frontend: Insights appear in Activity Feed tab with AI sparkle icon",
"Integration: Update Quick Stats Panel to show 'Unread Insights' count (replace events placeholder)",
"Integration: getTeamOverviewStats query returns unreadInsights, highPriorityInsights",
"Voice Notes Integration: Voice notes tab shows 'X insights generated' badge on note cards",
"Voice Notes Integration: Click voice note → detail modal → 'View Generated Insights' button",
"Player/Planning Tabs: Show voice note icon badge if player has recent notes (optional)",
"Create Task from Insight: Add action button in insight detail modal to pre-fill task from insight (optional)"
```

---

### Update 3: Navigation Integration

#### Add to Phase 4 Checklist:
```json
"⬜ Add Team Hub to sidebar navigation (Development group, after Team Insights)",
"⬜ Update bottom nav to 5 items: Overview, Players, Voice, Team Hub, Tasks",
"⬜ Set Voice item with highlight: true for center emphasis",
"⬜ Test navigation on mobile (5 icons should fit, no overflow)"
```

---

### Update 4: Activity Feed Schema

#### Add to US-P9-057 and US-P9-058:
```json
"Schema: Extend teamActivityFeed.actionType enum:",
"  - Add: v.literal('task_created')",
"  - Add: v.literal('task_completed')",
"  - Add: v.literal('task_assigned')",
"  - Add: v.literal('insight_generated')",
"Schema: Extend teamActivityFeed.entityType enum:",
"  - Add: v.literal('task')",
"  - Add: v.literal('team_insight')"
```

---

### Update 5: Quick Stats Panel Enhancement

#### Add to getTeamOverviewStats Query:
```typescript
// Add to backend query return type
returns: v.object({
  totalPlayers: v.number(),
  activeInjuries: v.number(),
  attendancePercent: v.number(), // Keep as placeholder for now
  upcomingEventsCount: v.number(), // Keep as placeholder for now
  openTasks: v.number(),          // NEW
  overdueCount: v.number(),       // NEW
  unreadInsights: v.number(),     // NEW
  highPriorityInsights: v.number(), // NEW
})
```

#### Add to Acceptance Criteria:
```json
"Backend: getTeamOverviewStats includes openTasks, overdueCount (from coachTasks)",
"Backend: getTeamOverviewStats includes unreadInsights, highPriorityInsights (from teamInsights)",
"Frontend: Quick Stats Panel replaces placeholders:",
"  - Replace 'Attendance %' → 'Open Tasks' with overdue badge",
"  - Replace 'Upcoming Events' → 'Unread Insights' with priority badge",
"Frontend: Click Open Tasks stat → Navigate to Tasks tab",
"Frontend: Click Unread Insights stat → Navigate to Insights tab"
```

---

## 📊 Updated Effort Estimate

| Story | Original | Schema Fix | Activity Feed | Overview | Voice Link | New Total |
|-------|----------|------------|---------------|----------|------------|-----------|
| US-P9-057 (Tasks) | 5h | -0.5h (reuse!) | +0.5h | +0.5h | N/A | **5.5h** |
| US-P9-058 (Insights) | 4h | N/A | +0.5h | N/A | +0.5h | **5h** |
| Navigation | N/A | N/A | N/A | N/A | N/A | **0.5h** |
| **Phase 4 Total** | **9h** | | | | | **11h** |

**Why Lower Than Expected?**
- Schema already exists! Just add 1 field (-0.5h)
- Voice note linking already exists! Just display (-0.5h)
- Player linking already exists! Just display (-0.5h)
- Existing indexes can be reused (-0.5h)

**Net Effect**: Original 9h + 2h enhancements - 2h reuse savings = **11h total**

---

## 🎯 Phase 4 Success Criteria (Updated)

### Must Have (Blocking)
- ✅ Tasks Tab shows team tasks filtered by teamId
- ✅ Tasks use existing `coachTasks` table with new `status` field
- ✅ Insights Tab shows AI-generated insights with pagination
- ✅ Activity Feed shows task and insight events
- ✅ Quick Stats shows "Open Tasks" and "Unread Insights" counts
- ✅ Navigation: Team Hub in sidebar (Development group)
- ✅ Navigation: Bottom nav has 5 items with Voice highlighted
- ✅ Type check passes
- ✅ Visual verification with dev-browser

### Should Have (Important)
- ✅ Voice notes tab shows "X insights" badge
- ✅ Tasks link to voice notes (already in schema!)
- ✅ Insights link to voice notes (already in schema!)
- ✅ Overview dashboard Quick Stats integration

### Nice to Have (Optional)
- ⚪ Create task from insight action
- ⚪ Player/Planning tabs voice note badges
- ⚪ Keyboard shortcuts for task creation

---

## 🚀 Ready for Ralph: Action Items

### Before Starting Phase 4:
1. ✅ Update PHASE4_PRD.json with all changes above
2. ✅ Update PHASE4_CONTEXT.md with:
   - Existing `coachTasks` schema documentation
   - Activity feed creation pattern examples
   - Quick Stats query enhancement examples
3. ✅ Update progress.txt with gap analysis findings
4. ✅ Commit all planning docs

### Ralph's First Tasks:
1. Add `status` field to `coachTasks` schema
2. Extend `teamActivityFeed` schema (actionType + entityType)
3. Implement Tasks Tab using existing `coachTasks` table
4. Implement Insights Tab with activity feed integration
5. Update Quick Stats Panel UI and query
6. Add Team Hub to navigation (sidebar + bottom nav)
7. Visual verification with dev-browser

---

## 📝 Files to Update

### Configuration Files:
- `/scripts/ralph/prd.json` (or `/scripts/ralph/PHASE4_PRD.json`)
- `/scripts/ralph/PHASE4_CONTEXT.md`
- `/scripts/ralph/progress.txt`

### Implementation Files (Ralph will create/modify):
- `packages/backend/convex/schema.ts` (add status field)
- `packages/backend/convex/models/teams.ts` (enhance getTeamOverviewStats)
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/tasks-tab.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/insights-tab.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/quick-stats-panel.tsx`
- `apps/web/src/components/layout/coach-sidebar.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/layout.tsx`

---

## ✨ Why This Is Better Than Original Plan

| Aspect | Original Plan | Final Plan | Benefit |
|--------|--------------|------------|---------|
| **Schema** | Create new `teamTasks` table | Enhance existing `coachTasks` | -0.5h, reuse 8 fields + 4 indexes |
| **Voice Linking** | Build from scratch | Use existing `voiceNoteId` field | -0.5h, already tested |
| **Player Linking** | Build from scratch | Use existing `playerIdentityId` field | -0.5h, already tested |
| **Integration** | Isolated features | Activity Feed + Overview + Voice Notes | +2h, better UX |
| **Navigation** | Not specified | 5-item bottom nav + sidebar | +0.5h, mobile-optimized |
| **Total Effort** | 9h isolated | 11h integrated | +2h for 4x integration |

**ROI**: +2 hours effort = 4 major integrations (activity feed, overview, voice notes, navigation)

---

## 🎉 Next Step: Update PRD and Start Ralph

All planning complete. Ready to update PHASE4_PRD.json and begin implementation.

