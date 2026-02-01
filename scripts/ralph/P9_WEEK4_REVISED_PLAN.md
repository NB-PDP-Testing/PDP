# Phase 9 Week 4: Team Hub - REVISED PLAN
**Date:** 2026-02-01
**Status:** Ready for Implementation
**Based On:** Comprehensive codebase review

---

## 🔍 CRITICAL DECISION: Route Architecture

### Current State
- **Existing Route:** `/orgs/[orgId]/coach/team-hub`
  - Single page with team selector dropdown
  - Shows activity feed + presence + voting cards for selected team
  - 4 components: activity-feed-view, presence-indicators, voting-card, voting-list

### Week 4 Options

**Option A: Enhance Existing `/team-hub` (RECOMMENDED)**
- Keep `/coach/team-hub` route
- Add tab navigation (Overview, Players, Planning, Activity, Decisions, Tasks, Insights)
- Keep team selector dropdown in header
- Reuse 100% of existing components
- **Effort:** 28 hours (lowest risk)

**Option B: New `/teams/[teamId]` Route**
- Create team-scoped pages at `/coach/teams/[teamId]`
- Migrate existing components
- Add Teams to sidebar navigation
- Deprecate `/team-hub` later
- **Effort:** 34 hours (higher effort, cleaner architecture)

**RECOMMENDATION:** **Option A** - Enhance existing `/team-hub`
- Faster delivery
- Less risk
- Reuses existing work
- Can migrate to team-scoped routes in Phase 9 Week 5 if needed

---

## 📊 What EXISTS vs What's MISSING

### ✅ COMPLETE (Already Done - Weeks 1-3)

**Backend Tables:**
- ✅ `teamHubPresence` - Real-time presence
- ✅ `teamActivityFeed` - Activity stream
- ✅ `insightComments` - Comment system
- ✅ `insightReactions` - Reactions (like/helpful/flag)
- ✅ `teamDecisions` + `decisionVotes` - Voting system
- ✅ `coachTasks` - Task management (table only, no functions yet)
- ✅ `voiceNoteInsights` - Insights from voice notes
- ✅ `sessionPlans` - Session planning

**Backend Functions:**
- ✅ `teamCollaboration.getTeamActivityFeed` - Activity feed with filtering
- ✅ `teamCollaboration.getTeamPresence` - Presence indicators
- ✅ `teamCollaboration.updatePresence` - Heartbeat
- ✅ `teamDecisions.createDecision` - Create vote
- ✅ `teamDecisions.castVote` - Vote with weighting
- ✅ `teamDecisions.getTeamDecisions` - Get decisions + vote counts
- ✅ `teamDecisions.finalizeDecision` - Close voting
- ✅ All comment/reaction/mention functions

**Frontend Components:**
- ✅ `activity-feed-view.tsx` (235 lines) - Tab filtering, activity items, real-time
- ✅ `presence-indicators.tsx` (120 lines) - Who's online
- ✅ `voting-card.tsx` (393 lines) - Full voting UI
- ✅ `voting-list.tsx` (69 lines) - List of decisions

**Total Existing:** 817 lines of working code, 16+ backend functions, 8 tables

### ❌ MISSING (Week 4 Needs to Build)

**Backend Functions (8 new):**
- ❌ `teams.getTeamOverviewStats` - Quick stats (roster, attendance, injuries, events)
- ❌ `teams.getUpcomingEvents` - Next 3 sessions/games
- ❌ `teams.getTeamPlayersWithHealth` - Player grid with health status
- ❌ `injuries.getTeamHealthSummary` - Active injuries + medical alerts
- ❌ `sessionPlans.getSeasonMilestones` - Season timeline
- ❌ `coachTasks.createTask` - Create task
- ❌ `coachTasks.completeTask` - Mark complete
- ❌ `coachTasks.getTeamTasks` - Get team tasks with enrichment
- ❌ `voiceNoteInsights.getTeamInsights` - Shared insights for team

**Frontend Components (7 new):**
- ❌ Tab navigation wrapper
- ❌ Overview tab (cockpit dashboard)
- ❌ Players tab (grid with health badges)
- ❌ Planning tab (session list + milestones)
- ❌ Health & Safety Widget
- ❌ Task list widget
- ❌ Shared insights tab

**Schema Changes (1 optional):**
- ⚠️ `voiceNotes.sessionPlanId` field (optional - for session-linked notes)

---

## 🎯 REVISED Story Breakdown

### Stories Status

| Story | Title | Status | Effort | Notes |
|-------|-------|--------|--------|-------|
| US-P9-063 | Mobile-First Layout | ✅ 80% DONE | 2h | Has mobile nav, needs tabs |
| US-P9-055 | Health & Safety Widget | ❌ NEW | 3h | Build widget + backend |
| US-P9-056 | Activity Feed Enhancement | ✅ 90% DONE | 2h | Add date range, pagination |
| US-P9-052 | Overview Dashboard | ❌ NEW | 4h | Build cockpit with widgets |
| US-P9-053 | Players Tab | ❌ NEW | 3h | Build grid (reuse health badges) |
| US-P9-054 | Planning Tab | ❌ NEW | 3h | Build list + milestones |
| US-P9-060 | Team Decision Voting | ✅ 100% DONE | 0h | **REUSE** VotingCard |
| US-P9-059 | Coach Tasks | ⚠️ 20% DONE | 4h | Build backend + UI |
| US-P9-061 | Voice Notes Integration | ✅ 60% DONE | 2h | Enhance activity feed |
| US-P9-064 | Shared Insights View | ❌ NEW | 3h | Build insights tab |
| US-P9-057 | Quick Actions Menu | ✅ 100% DONE | 0h | **EXISTS** in header |

**Revised Total:** 26 hours (down from 38 hours)

---

## 🚀 PHASE 1: Foundation (4 hours)

### Story 1.1: Add Tab Navigation to Existing Team Hub
**ID:** US-P9-063
**Estimate:** 2 hours
**Current:** `/team-hub/page.tsx` shows activity feed + voting for selected team
**Goal:** Add 7 tabs: Overview, Players, Planning, Activity, Decisions, Tasks, Insights

**Tasks:**
1. Wrap existing `team-hub/page.tsx` content in `<Tabs>` component
2. Create tab list: Overview, Players, Planning, Activity, Decisions, Tasks, Insights
3. URL persistence: `?tab=overview` (default), `?tab=players`, etc.
4. Move existing activity feed to "Activity" tab
5. Move existing voting cards to "Decisions" tab
6. Create placeholder components for: Overview, Players, Planning, Tasks, Insights
7. Keep team selector dropdown in header (existing behavior)

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/page.tsx` (add tabs)

**Files to Create:**
- `components/tab-navigation.tsx` (tab bar component)
- `components/overview-tab.tsx` (placeholder → Phase 2)
- `components/players-tab.tsx` (placeholder → Phase 2)
- `components/planning-tab.tsx` (placeholder → Phase 3)
- `components/tasks-tab.tsx` (placeholder → Phase 4)
- `components/insights-tab.tsx` (placeholder → Phase 4)

**Acceptance Criteria:**
- [ ] Tab bar visible with 7 tabs
- [ ] Click tab → URL updates (?tab=players)
- [ ] Activity feed works in "Activity" tab (existing component)
- [ ] Voting cards work in "Decisions" tab (existing component)
- [ ] Placeholders show for new tabs (Overview, Players, Planning, Tasks, Insights)
- [ ] Mobile: tabs scroll horizontally
- [ ] Desktop: tabs fixed width
- [ ] Type check passes

**Reuse:**
- ✅ Tab component: shadcn/ui `<Tabs>`
- ✅ Pattern: voice-notes uses tabs, copy approach

---

### Story 1.2: Schema Change (Optional)
**ID:** US-P9-SCHEMA
**Estimate:** 0.5 hours
**Priority:** Optional (can skip for MVP)

**Goal:** Add `sessionPlanId` field to `voiceNotes` table for session-linked notes.

**Schema:**
```typescript
// packages/backend/convex/schema.ts

voiceNotes: defineTable({
  // ... existing fields
  sessionPlanId: v.optional(v.id("sessionPlans")), // NEW
})
  .index("by_session", ["sessionPlanId"]), // NEW
```

**Acceptance Criteria:**
- [ ] Field added to schema
- [ ] Index created
- [ ] Run `npx -w packages/backend convex dev`
- [ ] Run `npx -w packages/backend convex codegen`
- [ ] Type check passes

**Note:** Can skip this if Week 4 doesn't implement session-linked notes. Keep as nice-to-have.

---

### Story 1.3: Activity Feed Enhancement
**ID:** US-P9-056
**Estimate:** 1.5 hours
**Current:** `activity-feed-view.tsx` works but missing pagination + date range
**Goal:** Add date range filter and pagination

**Backend Enhancement:**
```typescript
// packages/backend/convex/models/teamCollaboration.ts

// ENHANCE getTeamActivityFeed query
export const getTeamActivityFeed = query({
  args: {
    teamId: v.id("team"),
    filters: v.optional(v.object({
      types: v.optional(v.array(v.string())), // EXISTING
      dateRange: v.optional(v.object({         // NEW
        start: v.number(),
        end: v.number(),
      })),
    })),
    paginationOpts: v.object({                 // NEW
      cursor: v.union(v.string(), v.null()),
      numItems: v.number(),
    }),
  },
  returns: v.object({
    page: v.array(v.object({ /* existing */ })),
    continueCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  // ... implementation
});
```

**Frontend Enhancement:**
```typescript
// MODIFY: activity-feed-view.tsx

// Add state
const [cursor, setCursor] = useState<string | null>(null);

// Update query call
const activityPage = useQuery(
  api.models.teamCollaboration.getTeamActivityFeed,
  selectedTeam
    ? {
        teamId: selectedTeam,
        filters: currentFilter !== "all" ? { types: [currentFilter] } : undefined,
        paginationOpts: { cursor, numItems: 50 },
      }
    : "skip"
);

// Add Load More button
{!activityPage?.isDone && (
  <Button onClick={() => setCursor(activityPage.continueCursor)}>
    Load More
  </Button>
)}
```

**Acceptance Criteria:**
- [ ] Backend: pagination with cursor support
- [ ] Frontend: "Load More" button
- [ ] Button hidden when no more items
- [ ] Type check passes

---

## 🎯 PHASE 2: Core Widgets (7 hours)

### Story 2.1: Health & Safety Widget
**ID:** US-P9-055
**Estimate:** 3 hours

**(See Phase 2 from previous plan - same implementation)**

**Backend Function:** `injuries.getTeamHealthSummary`
**Frontend Component:** `health-safety-widget.tsx`

**Acceptance Criteria:**
- [ ] Shows active injuries (max 5)
- [ ] Severity badges (🟢 minor, 🟡 moderate, 🔴 severe)
- [ ] Days since injury calculated
- [ ] Medical alerts count
- [ ] Empty state when no injuries
- [ ] Type check passes

---

### Story 2.2: Overview Dashboard (Cockpit View)
**ID:** US-P9-052
**Estimate:** 4 hours
**Dependencies:** US-P9-055 (Health Widget), US-P9-063 (Tabs)

**Backend Functions:**
```typescript
// NEW: packages/backend/convex/models/teams.ts

export const getTeamOverviewStats = query({
  args: { teamId: v.id("team") },
  returns: v.object({
    totalPlayers: v.number(),
    activeInjuries: v.number(),
    attendancePercent: v.number(),
    upcomingEventsCount: v.number(),
  }),
  handler: async (ctx, args) => {
    // 1. Count team players
    const teamPlayers = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    // 2. Count active injuries
    const playerIds = teamPlayers.map(tp => tp.playerIdentityId);
    const injuries = await Promise.all(
      playerIds.map(async (playerId) => {
        return await ctx.db
          .query("injuries")
          .withIndex("by_player", (q) => q.eq("playerIdentityId", playerId))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();
      })
    );
    const activeInjuries = injuries.flat().length;

    // 3. Calculate attendance (placeholder for MVP)
    const attendancePercent = 85;

    // 4. Count upcoming events (next 7 days)
    const sevenDaysFromNow = Date.now() + (7 * 24 * 60 * 60 * 1000);
    const upcomingSessions = await ctx.db
      .query("sessionPlans")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.lte(q.field("scheduledDate"), sevenDaysFromNow))
      .filter((q) => q.gte(q.field("scheduledDate"), Date.now()))
      .collect();

    return {
      totalPlayers: teamPlayers.length,
      activeInjuries,
      attendancePercent,
      upcomingEventsCount: upcomingSessions.length,
    };
  },
});

export const getUpcomingEvents = query({
  args: { teamId: v.id("team"), limit: v.optional(v.number()) },
  returns: v.array(v.object({
    eventId: v.id("sessionPlans"),
    title: v.string(),
    date: v.number(),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    type: v.string(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 3;
    const sessions = await ctx.db
      .query("sessionPlans")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.gte(q.field("scheduledDate"), Date.now()))
      .order("asc")
      .take(limit);

    return sessions.map(session => ({
      eventId: session._id,
      title: session.title,
      date: session.scheduledDate,
      time: session.scheduledTime,
      location: session.venue,
      type: "session",
    }));
  },
});
```

**Frontend Component:**
```typescript
// apps/web/src/app/orgs/[orgId]/coach/team-hub/components/overview-tab.tsx

import { HealthSafetyWidget } from "./health-safety-widget";
import { ActivityFeedView } from "./activity-feed-view";
import { PresenceIndicators } from "./presence-indicators";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, AlertCircle, Calendar, TrendingUp } from "lucide-react";

export function OverviewTab({ teamId }: { teamId: string }) {
  const stats = useQuery(api.models.teams.getTeamOverviewStats, { teamId: teamId as any });
  const upcomingEvents = useQuery(api.models.teams.getUpcomingEvents, { teamId: teamId as any });

  return (
    <div className="space-y-6">
      {/* Presence Indicators */}
      <PresenceIndicators teamId={teamId} />

      {/* Quick Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Players" value={stats?.totalPlayers || 0} color="blue" />
        <StatCard icon={AlertCircle} label="Active Injuries" value={stats?.activeInjuries || 0} color="red" />
        <StatCard icon={TrendingUp} label="Attendance" value={`${stats?.attendancePercent || 0}%`} color="green" />
        <StatCard icon={Calendar} label="Upcoming Events" value={stats?.upcomingEventsCount || 0} color="purple" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Widgets */}
        <div className="lg:col-span-1 space-y-6">
          <HealthSafetyWidget teamId={teamId} />
          <UpcomingEventsWidget events={upcomingEvents} />
        </div>

        {/* Right: Activity Feed Summary (first 10 items) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Link to Activity tab for full feed */}
              <ActivityFeedView teamId={teamId} limit={10} compact />
              <Link href="?tab=activity" className="text-sm text-primary hover:underline mt-4 inline-block">
                View all activity →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colorClasses = {
    blue: "text-blue-500",
    red: "text-red-500",
    green: "text-green-500",
    purple: "text-purple-500",
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${colorClasses[color]}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingEventsWidget({ events }: { events: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!events || events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming events
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.eventId} className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.date).toLocaleDateString()}
                  {event.time && ` at ${event.time}`}
                </p>
                {event.location && (
                  <p className="text-xs text-muted-foreground">{event.location}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Acceptance Criteria:**
- [ ] Backend functions created: `getTeamOverviewStats`, `getUpcomingEvents`
- [ ] Quick stats panel shows 4 metrics
- [ ] ✅ Reuses PresenceIndicators component
- [ ] ✅ Reuses HealthSafetyWidget component
- [ ] Shows upcoming events (next 3)
- [ ] Shows activity feed summary (first 10 items)
- [ ] Link to full activity tab
- [ ] Desktop: 2-column layout
- [ ] Mobile: single column
- [ ] Type check passes

---

## 📑 PHASE 3: Tab Views (6 hours)

### Story 3.1: Players Tab with Health Badges
**ID:** US-P9-053
**Estimate:** 3 hours

**(Implementation from previous plan - same backend + frontend)**

**Backend:** `teams.getTeamPlayersWithHealth`
**Frontend:** `players-tab.tsx`

**Reuse:**
- ✅ Health badge components: `PassportAvailabilityBadges`
- ✅ Player filtering patterns from coach/players

**Acceptance Criteria:**
- [ ] Player grid (1/2/3/4 cols responsive)
- [ ] Health badges (🟢 healthy, 🟡 recovering, 🔴 injured)
- [ ] Search by name
- [ ] Filter by status
- [ ] Sort by name/jersey/position
- [ ] Click player → Player Passport
- [ ] Type check passes

---

### Story 3.2: Planning Tab (Simple List + Milestones)
**ID:** US-P9-054
**Estimate:** 3 hours

**(Implementation from previous plan - same backend + frontend)**

**Backend:** `sessionPlans.getSeasonMilestones`
**Frontend:** `planning-tab.tsx`

**Reuse:**
- ✅ Session plan queries: `sessionPlans.listByTeam` (exists)
- ✅ Card patterns from session plans

**Acceptance Criteria:**
- [ ] Session plan list (upcoming/past)
- [ ] Season milestones timeline
- [ ] Filter tabs (Upcoming/Past/All)
- [ ] Today's session highlighted
- [ ] Click session → session detail
- [ ] Type check passes

---

## 🤝 PHASE 4: Collaboration Features (9 hours)

### Story 4.1: Coach Tasks Management
**ID:** US-P9-059
**Estimate:** 4 hours
**Current:** coachTasks table exists, no backend functions or UI

**Backend Functions:**
```typescript
// NEW: packages/backend/convex/models/coachTasks.ts

export const createTask = mutation({
  args: {
    teamId: v.id("team"),
    organizationId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    assignedTo: v.array(v.string()),
    dueDate: v.optional(v.number()),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  },
  returns: v.id("coachTasks"),
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) throw new Error("Unauthorized");

    return await ctx.db.insert("coachTasks", {
      ...args,
      text: args.title, // Map to existing field
      createdBy: userId.subject,
      completed: false,
    });
  },
});

export const completeTask = mutation({
  args: { taskId: v.id("coachTasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, { completed: true });
    return null;
  },
});

export const getTeamTasks = query({
  args: {
    teamId: v.id("team"),
    completed: v.optional(v.boolean()),
  },
  returns: v.array(v.object({
    _id: v.id("coachTasks"),
    title: v.string(),
    description: v.optional(v.string()),
    assignedTo: v.array(v.object({ id: v.string(), name: v.string() })),
    dueDate: v.optional(v.number()),
    priority: v.string(),
    completed: v.boolean(),
    isOverdue: v.boolean(),
  })),
  handler: async (ctx, args) => {
    let tasksQuery = ctx.db
      .query("coachTasks")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId));

    if (args.completed !== undefined) {
      tasksQuery = ctx.db
        .query("coachTasks")
        .withIndex("by_team_and_status", (q) =>
          q.eq("teamId", args.teamId).eq("completed", args.completed)
        );
    }

    const tasks = await tasksQuery.collect();

    // Batch fetch assigned users
    const uniqueUserIds = [...new Set(tasks.flatMap(t => t.assignedToUserId ? [t.assignedToUserId] : []))];
    const users = await Promise.all(
      uniqueUserIds.map(async (userId) => {
        return await ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: userId, operator: "eq" }],
        });
      })
    );
    const userMap = new Map(users.filter(u => u).map(u => [u!._id, u]));

    // Enrich tasks
    const now = Date.now();
    return tasks.map(task => {
      const assigned = task.assignedToUserId
        ? userMap.get(task.assignedToUserId)
        : null;

      return {
        _id: task._id,
        title: task.text,
        description: undefined,
        assignedTo: assigned
          ? [{ id: assigned._id, name: `${assigned.firstName} ${assigned.lastName}` }]
          : [],
        dueDate: task.dueDate,
        priority: task.priority || "medium",
        completed: task.completed,
        isOverdue: !task.completed && task.dueDate ? task.dueDate < now : false,
      };
    });
  },
});
```

**Frontend Component:**
```typescript
// apps/web/src/app/orgs/[orgId]/coach/team-hub/components/tasks-tab.tsx

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function TasksTab({ teamId }: { teamId: string }) {
  const tasks = useQuery(api.models.coachTasks.getTeamTasks, {
    teamId: teamId as any,
    completed: false,
  });

  const completeTask = useMutation(api.models.coachTasks.completeTask);

  const handleToggleComplete = async (taskId: string) => {
    try {
      await completeTask({ taskId: taskId as any });
      toast.success("Task completed!");
    } catch (error) {
      toast.error("Failed to complete task");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CheckSquare className="h-6 w-6" />
          Team Tasks
        </h2>
        <Button size="sm">+ Create Task</Button>
      </div>

      {!tasks ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No tasks yet - click + to create one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task._id} className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <Checkbox
                checked={false}
                onCheckedChange={() => handleToggleComplete(task._id)}
                className="mt-1"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {task.priority === "high" && (
                    <Badge variant="destructive" className="text-xs">High</Badge>
                  )}
                  {task.dueDate && (
                    <span className={`text-xs ${task.isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                      {task.isOverdue && <AlertCircle className="inline h-3 w-3 mr-1" />}
                      Due {format(task.dueDate, "MMM d")}
                    </span>
                  )}
                  {task.assignedTo.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Assigned to {task.assignedTo[0].name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Backend functions: `createTask`, `completeTask`, `getTeamTasks`
- [ ] Task list shows incomplete tasks
- [ ] Checkbox to mark complete (optimistic)
- [ ] Overdue tasks highlighted red
- [ ] High priority badge
- [ ] Create task button (can be basic for MVP)
- [ ] Empty state
- [ ] Type check passes

---

### Story 4.2: Team Decision Voting
**ID:** US-P9-060
**Estimate:** 0 hours
**Status:** ✅ **100% COMPLETE - REUSE ONLY**

**What Exists:**
- ✅ Backend: `teamDecisions.createDecision`, `castVote`, `getTeamDecisions`, `finalizeDecision`
- ✅ Frontend: `voting-card.tsx` (393 lines), `voting-list.tsx` (69 lines)

**Integration:**
- Already integrated in "Decisions" tab (Phase 1)
- ✅ Voting cards display and work
- ✅ Real-time vote updates work
- ✅ Weighted voting works

**Acceptance Criteria:**
- [x] ✅ VotingList component in Decisions tab
- [x] ✅ Inline voting works
- [x] ✅ Vote counts update real-time
- [x] ✅ Finalize button works

**Effort:** 0 hours (already done!)

---

### Story 4.3: Voice Notes Integration
**ID:** US-P9-061
**Estimate:** 2 hours
**Status:** ⚠️ 60% COMPLETE

**What Exists:**
- ✅ Activity feed shows `voice_note_added` events
- ✅ Voice notes linked to teams via `teamId` field
- ✅ Voice notes linked to players via `playerIdentityId` field

**What's Missing:**
- ❌ Session-linked voice notes (requires `sessionPlanId` field - optional for MVP)
- ❌ Player card note count badge

**Tasks:**
1. **Add note count to Players Tab** (1 hour):
   - Query: `voiceNotes.getPlayerNoteCount`
   - Display badge on player cards: "5 notes"
   - Click badge → navigate to Player Passport filtered

2. **Session-linked notes** (1 hour - OPTIONAL):
   - Skip if not critical for MVP
   - Or use `metadata` field to store sessionPlanId temporarily

**Acceptance Criteria:**
- [ ] Player cards show note count badge
- [ ] Activity feed shows voice notes (already works)
- [ ] Optional: Session plans show linked notes count
- [ ] Type check passes

---

### Story 4.4: Shared Insights View
**ID:** US-P9-064
**Estimate:** 3 hours

**Backend Function:**
```typescript
// NEW: packages/backend/convex/models/voiceNoteInsights.ts

export const getTeamInsights = query({
  args: {
    teamId: v.id("team"),
    status: v.optional(v.array(v.string())),
  },
  returns: v.array(v.object({
    insightId: v.string(),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    createdBy: v.object({ id: v.string(), name: v.string() }),
    appliedByCount: v.number(),
    status: v.string(),
    hasConsensus: v.boolean(),
  })),
  handler: async (ctx, args) => {
    // Get all voice notes for team
    const notes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Get all insights from those notes
    const noteIds = notes.map(n => n._id);
    const insights = await Promise.all(
      noteIds.map(async (noteId) => {
        return await ctx.db
          .query("voiceNoteInsights")
          .withIndex("by_voice_note", (q) => q.eq("voiceNoteId", noteId))
          .collect();
      })
    );

    const allInsights = insights.flat();

    // Filter by status if provided
    const filteredInsights = args.status
      ? allInsights.filter(i => args.status!.includes(i.status))
      : allInsights;

    // Batch fetch coaches
    const uniqueCoachIds = [...new Set(filteredInsights.map(i => i.coachId))];
    const coaches = await Promise.all(
      uniqueCoachIds.map(id =>
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: id, operator: "eq" }],
        })
      )
    );
    const coachMap = new Map(coaches.filter(c => c).map(c => [c!._id, c]));

    // Enrich insights
    return filteredInsights.map(insight => {
      const coach = coachMap.get(insight.coachId);

      // Calculate applied count (placeholder - need to track who applied)
      const appliedByCount = insight.status === "applied" ? 1 : 0;
      const hasConsensus = appliedByCount >= 2;

      return {
        insightId: insight._id,
        title: insight.title,
        description: insight.description,
        category: insight.category,
        createdBy: {
          id: insight.coachId,
          name: coach ? `${coach.firstName} ${coach.lastName}` : "Unknown",
        },
        appliedByCount,
        status: insight.status,
        hasConsensus,
      };
    });
  },
});
```

**Frontend Component:**
```typescript
// apps/web/src/app/orgs/[orgId]/coach/team-hub/components/insights-tab.tsx

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, Users } from "lucide-react";

export function InsightsTab({ teamId }: { teamId: string }) {
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const insights = useQuery(api.models.voiceNoteInsights.getTeamInsights, {
    teamId: teamId as any,
    status: statusFilter.length > 0 ? statusFilter : undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="h-6 w-6" />
          Team Insights
        </h2>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2">
        <Button
          variant={statusFilter.length === 0 ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter([])}
        >
          All
        </Button>
        <Button
          variant={statusFilter.includes("pending") ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter(["pending"])}
        >
          Pending
        </Button>
        <Button
          variant={statusFilter.includes("applied") ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter(["applied"])}
        >
          Applied
        </Button>
        <Button
          variant={statusFilter.includes("dismissed") ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter(["dismissed"])}
        >
          Dismissed
        </Button>
      </div>

      {/* Insights grid */}
      {!insights ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No insights yet - add voice notes to generate insights</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <Card key={insight.insightId} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm">{insight.title}</h3>
                  {insight.hasConsensus && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      Consensus
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {insight.description}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    By {insight.createdBy.name}
                  </span>
                  <Badge variant={insight.status === "applied" ? "default" : "outline"}>
                    {insight.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Backend function `getTeamInsights` created
- [ ] Shows all team insights (all coaches)
- [ ] Filter by status (All/Pending/Applied/Dismissed)
- [ ] Consensus badge when 2+ coaches applied
- [ ] Grid layout (3 columns desktop)
- [ ] Empty state
- [ ] Type check passes

---

## ✨ PHASE 5: Already Complete (0 hours)

### Story 5.1: Quick Actions Menu
**ID:** US-P9-057
**Status:** ✅ **100% COMPLETE**

**What Exists:**
- ✅ `HeaderQuickActionsMenu` component in coach layout
- ✅ FAB with speed dial actions
- ✅ Actions: Voice Note, Session Plan, Goal, Injury, Task

**Integration:**
- Already in header
- Works globally across coach routes

**Effort:** 0 hours (already exists!)

---

## 📦 FINAL SUMMARY

### Revised Effort Breakdown

| Phase | Stories | Original Estimate | Revised Estimate | Savings |
|-------|---------|-------------------|------------------|---------|
| **Phase 1: Foundation** | 3 stories | 6h | 4h | 2h (tabs simpler) |
| **Phase 2: Core Widgets** | 2 stories | 8h | 7h | 1h (reuse presence) |
| **Phase 3: Tab Views** | 2 stories | 10h | 6h | 4h (simplified) |
| **Phase 4: Collaboration** | 4 stories | 12h | 9h | 3h (voting done, voice notes partial) |
| **Phase 5: Polish** | 1 story | 2h | 0h | 2h (already exists) |
| **TOTAL** | **12 stories** | **38h** | **26h** | **12h savings** |

### Reuse vs Build Breakdown

| Component/Function | Status | Effort | Notes |
|--------------------|--------|--------|-------|
| Activity Feed | ✅ ENHANCE | 1.5h | Add pagination only |
| Voting System | ✅ REUSE | 0h | 100% complete |
| Presence Indicators | ✅ REUSE | 0h | 100% complete |
| Quick Actions Menu | ✅ REUSE | 0h | 100% complete |
| Voice Notes Integration | ✅ 60% DONE | 2h | Add player badges only |
| Health Widget | ❌ BUILD | 3h | New component + backend |
| Overview Dashboard | ❌ BUILD | 4h | New tab + stats |
| Players Tab | ❌ BUILD | 3h | New grid layout |
| Planning Tab | ❌ BUILD | 3h | New list + timeline |
| Coach Tasks | ❌ BUILD | 4h | Backend + UI |
| Shared Insights | ❌ BUILD | 3h | New query + tab |
| Tab Navigation | ❌ BUILD | 2h | Wrap existing page |

**Reuse:** 40% of effort saved
**New Build:** 60% of effort

---

## ✅ READY FOR RALPH

**Phase-by-phase delivery:**
1. **Phase 1 (4h):** Tab navigation + activity feed pagination → Delivers clickable tabs
2. **Phase 2 (7h):** Overview dashboard + health widget → Delivers cockpit view
3. **Phase 3 (6h):** Players + planning tabs → Delivers roster + sessions
4. **Phase 4 (9h):** Tasks + insights tabs → Delivers collaboration
5. **Phase 5 (0h):** Already done!

**Total:** 26 hours across 5 phases

Each phase delivers working, testable value that builds on the previous phase. Ralph can execute sequentially with clean checkpoints.

🚀 **Ready to begin!**
