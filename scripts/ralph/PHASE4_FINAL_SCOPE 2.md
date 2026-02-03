# Phase 4 Final Scope - Ready to Execute

**Date**: 2026-02-02
**Status**: ✅ FINALIZED - Ready for Ralph
**Total Effort**: 13 hours (4 stories)

---

## Executive Summary

Phase 4 delivers a complete, well-rounded Team Hub with:
- ✅ **Tasks Tab** - Team task management with existing schema
- ✅ **Insights Tab** - AI-generated insights with pagination
- ✅ **Navigation** - Easy access via sidebar + bottom nav (Voice highlighted)
- ✅ **Tone Controls** - Parent communication customization ✨ NEW

Plus **4 major integrations**:
1. Activity Feed (task/insight events)
2. Overview Dashboard (task/insight counts)
3. Voice Notes (bidirectional linking)
4. Navigation (sidebar + 5-item bottom nav)

---

## 📋 Stories Included

### US-P9-057: Tasks Tab - Team Task Management (5.5h)

**What it delivers:**
- Task list using **existing coachTasks table** (schema line 925)
- Create/assign/complete tasks with priority and due dates
- Task filtering (status, priority, assignee, sort)
- Task cards show voice note badge if linked
- Activity Feed integration (task_created, task_completed, task_assigned events)
- Overview Dashboard integration (Open Tasks count with overdue badge)

**Key acceptance criteria:**
- ⚠️ CRITICAL: Use EXISTING coachTasks table (DON'T create teamTasks!)
- Add ONE new field: `status: v.optional(v.union('open', 'in-progress', 'done'))`
- Extend teamActivityFeed enums with task events
- Batch fetch pattern for assignees (avoid N+1 queries)
- Copy player-tab.tsx patterns (filters, cards, modals)
- Update Quick Stats Panel: Replace "Attendance %" → "Open Tasks"

**Files:**
- Schema: `packages/backend/convex/schema.ts` (add status field, extend enums)
- Backend: `packages/backend/convex/models/teams.ts` (getTeamTasks, mutations)
- Frontend: `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/tasks-tab.tsx`
- Components: task-card, task-filters, task-detail-modal, create-task-modal
- Integration: `quick-stats-panel.tsx` (add Open Tasks stat)

---

### US-P9-058: Insights Tab - AI-Generated Team Insights (5h)

**What it delivers:**
- Insights from voice notes and AI analysis
- Pagination (cursor-based, 50 items/page)
- Insight filtering (type, player, topic, sort)
- Generate Insights button (AI action - placeholder)
- Insight cards show voice note badge if linked
- Activity Feed integration (insight_generated events)
- Overview Dashboard integration (Unread Insights count)
- Optional: Voice notes tab shows insights badge

**Key acceptance criteria:**
- Create teamInsights table with composite indexes
- Extend teamActivityFeed enums with insight events
- Batch fetch pattern for voice notes and players
- Copy activity-feed-view.tsx pagination pattern
- Update Quick Stats Panel: Replace "Upcoming Events" → "Unread Insights"
- Optional: Add insights badge to voice notes tab

**Files:**
- Schema: `packages/backend/convex/schema.ts` (create teamInsights table)
- Backend: `packages/backend/convex/models/teams.ts` (getTeamInsights with pagination)
- Backend: `packages/backend/convex/actions/teamInsights.ts` (AI action)
- Frontend: `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/insights-tab.tsx`
- Components: insight-card, insight-filters, insight-detail-modal
- Integration: `quick-stats-panel.tsx` (add Unread Insights stat)
- Optional: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/page.tsx` (add badge)

---

### US-P9-NAV: Navigation Integration (0.5h)

**What it delivers:**
- Team Hub in sidebar (Development group)
- Team Hub in bottom nav (5 items)
- Voice item highlighted on mobile

**Key acceptance criteria:**
- Sidebar: Add after "Team Insights", icon: LayoutDashboard
- Bottom Nav: 5 items in order: Overview, Players, Voice, Team Hub, Tasks
- Voice item: `highlight: true` (emphasized styling)
- Mobile: 5 icons fit without overflow
- Desktop: Same styling as other sidebar items

**Bottom Nav code:**
```typescript
const coachBottomNavItems: BottomNavItem[] = [
  { id: 'overview', icon: Home, label: 'Overview', href: `/orgs/${orgId}/coach` },
  { id: 'players', icon: Users, label: 'Players', href: `/orgs/${orgId}/coach/players` },
  { id: 'voice', icon: Mic, label: 'Voice', href: `/orgs/${orgId}/coach/voice-notes`, highlight: true },
  { id: 'team-hub', icon: LayoutDashboard, label: 'Hub', href: `/orgs/${orgId}/coach/team-hub` },
  { id: 'todos', icon: CheckSquare, label: 'Tasks', href: `/orgs/${orgId}/coach/todos` }
]
```

**Files:**
- `apps/web/src/components/layout/coach-sidebar.tsx` (add Team Hub)
- `apps/web/src/app/orgs/[orgId]/coach/layout.tsx` (update bottom nav)

---

### US-P9-041: Tone Controls for Parent Summaries (2h) ✨ NEW

**What it delivers:**
- Configure AI tone for parent communications
- Tone dropdown: Warm, Professional, Brief
- Live preview card showing example summary in each tone
- Settings accessible from Team Hub OR Coach Settings

**Key acceptance criteria:**
- Extend coachOrgPreferences with `parentSummaryTone` field
- Backend: getCoachPreferences query + updateCoachPreferences mutation
- Frontend: parent-comms-settings.tsx component
- Live preview updates on tone selection (no save needed)
- Save button persists preference to database

**Example previews:**
- **Warm**: "Great news! Emma's tackling skills have really improved from 3/5 to 4/5. She's showing fantastic progress and we're so proud of her development!"
- **Professional**: "Emma's tackling rating has improved from 3/5 to 4/5. This demonstrates consistent progress in defensive fundamentals."
- **Brief**: "Emma: Tackling 3/5 → 4/5. Good progress."

**Files:**
- Schema: `packages/backend/convex/schema.ts` (extend coachOrgPreferences)
- Backend: `packages/backend/convex/models/coaches.ts` (preferences queries)
- Frontend: `apps/web/src/components/coach/parent-comms-settings.tsx`
- Integration: Team Hub Settings tab OR Coach Settings page

---

## 🎯 Phase 4 Integrations

### 1. Activity Feed Integration
**New event types:**
- `task_created` - When coach creates a task
- `task_completed` - When task marked done
- `task_assigned` - When task assigned to coach
- `insight_generated` - When AI creates an insight

**Pattern:**
```typescript
await ctx.db.insert('teamActivityFeed', {
  organizationId,
  teamId,
  actorId,
  actorName,
  actionType: 'task_created',
  entityType: 'task',
  entityId: taskId,
  summary: `Created task: ${title}`,
  priority: taskPriority === 'high' ? 'important' : 'normal'
})
```

### 2. Overview Dashboard Integration
**Enhanced Quick Stats Panel:**
- Replace "Attendance %" → **"Open Tasks"** (shows count + overdue badge)
- Replace "Upcoming Events" → **"Unread Insights"** (shows count + priority badge)
- Both clickable → navigate to respective tabs

**Backend enhancement:**
```typescript
// Add to getTeamOverviewStats return type
{
  openTasks: number,
  overdueCount: number,
  unreadInsights: number,
  highPriorityInsights: number
}
```

### 3. Voice Notes Integration
**Bidirectional linking:**
- Tasks → Voice Notes: Display voice note badge on task cards (voiceNoteId already exists!)
- Insights → Voice Notes: Display voice note badge on insight cards (voiceNoteId in new table)
- Voice Notes → Insights: Optional badge showing insight count (nice-to-have)

**Pattern:**
- If `voiceNoteId` exists on task/insight, show microphone icon badge
- Click badge → open voice note detail modal
- Batch fetch voice notes to avoid N+1 queries

### 4. Navigation Integration
**Sidebar:**
- Group: Development
- Position: After "Team Insights"
- Icon: LayoutDashboard
- Label: "Team Hub"

**Bottom Nav (Mobile):**
- 5 items: Overview, Players, **Voice** (highlighted), Hub, Tasks
- Voice center-right position (coach's key input feature)
- Hub and Tasks provide quick access to collaboration features

---

## 📊 Effort Breakdown

| Story | Backend | Frontend | Integration | Testing | Total |
|-------|---------|----------|-------------|---------|-------|
| US-P9-057 (Tasks) | 2h | 2.5h | 0.5h overview | 0.25h | **5.5h** |
| US-P9-058 (Insights) | 2h | 2h | 0.5h overview + 0.25h voice | 0.25h | **5h** |
| US-P9-NAV (Navigation) | 0h | 0.5h | - | - | **0.5h** |
| US-P9-041 (Tone Controls) | 0.5h | 1h | - | 0.25h | **2h** |
| **TOTAL** | **4.5h** | **6h** | **1.25h** | **0.75h** | **13h** |

**Delta from original Week 4 plan:**
- Original: Tasks + Insights + Navigation = 11h
- Added: Tone Controls = +2h
- Final: **13h** (~2 days at Ralph's pace)

---

## ✅ Success Criteria

### Tasks Tab Complete When:
- [x] Tasks shown using existing coachTasks table
- [x] Task filtering works (status, priority, assignee, sort)
- [x] Create/edit/delete/status update working
- [x] Task cards show voice note badge if linked
- [x] Activity Feed shows task events (created, completed, assigned)
- [x] Overview Dashboard shows "Open Tasks" with overdue count
- [x] Click Open Tasks → navigate to Tasks tab

### Insights Tab Complete When:
- [x] Insights shown with pagination (cursor-based, 50/page)
- [x] Insight filtering works (type, player, topic, sort)
- [x] Generate Insights button triggers AI action (placeholder)
- [x] Insight cards show voice note badge if linked
- [x] Activity Feed shows insight events (generated)
- [x] Overview Dashboard shows "Unread Insights" with priority count
- [x] Click Unread Insights → navigate to Insights tab
- [x] Optional: Voice notes tab shows insights badge

### Navigation Complete When:
- [x] Team Hub in sidebar (Development group)
- [x] Team Hub in bottom nav (5 items)
- [x] Voice item highlighted on mobile

### Tone Controls Complete When:
- [x] Tone dropdown shows Warm, Professional, Brief
- [x] Live preview card updates on selection
- [x] Save button persists preference
- [x] Settings accessible from Team Hub OR Coach Settings

### Phase 4 Complete When:
- [x] All acceptance criteria met for all 4 stories
- [x] Type check passes (npm run check-types)
- [x] No new lint errors
- [x] Mobile responsive (all tabs)
- [x] Empty states and loading states present
- [x] Visual verification with dev-browser
- [x] Commit message accurate

---

## 📝 Stories Deferred

### Deferred to Phase 5 (Requires Ideation)

**US-P9-042 + US-P9-043: Parent Communication Controls** (~19h evolved scope)

**Why deferred:**
- **Tester feedback**: "Don't want parents bombarded with messages"
- **Original design too simple**: Only controls TIMING (when to send), not VOLUME (how many)
- **Needs product ideation**: Should evolve into intelligent digest system
- **See**: `/scripts/ralph/PHASE5_PARENT_COMMS_IDEATION.md` for full design

**What needs to be designed:**
- Insight relevance filtering (only send insights about parent's child)
- Volume control (max X insights per digest)
- Priority-based routing (high priority → immediate, low → batched)
- Parent preferences (per-parent control of frequency/volume)
- AI summarization (condense 15 insights → highlights + summary)

---

### Deferred to Future Sprint (Polish Features)

The following 4 stories (~9h) are polish features:

1. **US-P9-037**: Audio Playback (1h)
   - HTML5 audio player for voice notes
   - Controls: play/pause, scrubbing, speed

2. **US-P9-038/040**: Inline Editing (3h)
   - Click-to-edit components
   - Cmd+Enter to save

3. **US-P9-044**: Team Switcher (2h)
   - Keyboard shortcut to switch teams

4. **US-P9-045**: Collaborative Editing Indicator (2h)
   - Show when others are editing

5. **Parent Communication Settings Schema** (1h)
   - Full schema for parent comms preferences (may be subsumed by Phase 5 design)

---

## 🎉 Why This Phase 4 Scope is Well-Rounded

### Core Collaboration Features ✅
- Tasks Tab → Team can manage action items
- Insights Tab → AI-generated observations surface automatically
- Navigation → Easy access on all devices

### Strategic Integrations ✅
- Activity Feed → All collaboration actions visible
- Overview Dashboard → Task/insight counts at a glance
- Voice Notes → Bidirectional linking (context preservation)

### Parent Communication Enhancement ✅
- Tone Controls → Coaches customize how AI writes to parents
- High-value UX → Small effort (2h), big impact on parent satisfaction

### Manageable Scope ✅
- 13h total (~2 days at Ralph's pace)
- 4 stories with clear acceptance criteria
- Low risk (only 2h added to 11h base)

### Clean Separation ✅
- Week 5 can focus on polish/personalization features
- No feature creep (deferred 7 stories clearly documented)
- Complete enough to ship and get feedback

---

## 🚀 Ready to Execute

**All prerequisites met:**
- ✅ PRD complete with comprehensive acceptance criteria
- ✅ Context file has all patterns and code examples
- ✅ Table name resolved (use coachTasks not teamTasks)
- ✅ Integration patterns documented
- ✅ Navigation requirements specified
- ✅ Effort estimate realistic (13h)
- ✅ User decision documented

**Ralph's checklist:**
1. Read PHASE4_PRD.json (full requirements)
2. Read PHASE4_CONTEXT.md (implementation patterns)
3. Read PHASE4_FINAL_RECOMMENDATIONS.md (key decisions)
4. Start with US-P9-057 (Tasks Tab)
5. Continue with US-P9-058 (Insights Tab)
6. Continue with US-P9-NAV (Navigation)
7. Finish with US-P9-041 (Tone Controls)
8. Visual verification with dev-browser
9. Commit: "feat: Phase 9 Week 4 Phase 4 - Tasks + Insights + Tone Controls with Full Integration"

**START RALPH NOW!** ✅

---
