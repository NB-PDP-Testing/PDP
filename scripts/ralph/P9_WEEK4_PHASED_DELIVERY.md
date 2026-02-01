# Phase 9 Week 4: Team Hub - Phased Delivery Plan
**Date:** 2026-02-01
**Status:** Ready for Implementation
**Approach:** Enhance existing `/coach/team-hub/` with incremental features

---

## 🔍 Current State Analysis

### What Already Exists
**Location:** `/apps/web/src/app/orgs/[orgId]/coach/team-hub/`

**Files:**
- ✅ `page.tsx` - Main hub page with team selector
- ✅ `components/activity-feed-view.tsx` - Activity feed with tab filtering
- ✅ `components/presence-indicators.tsx` - Real-time presence tracking
- ✅ `components/voting-card.tsx` - Team decision voting UI
- ✅ `components/voting-list.tsx` - List of team votes

**Backend Functions:**
- ✅ `teamCollaboration.getTeamActivityFeed` - Activity with filtering
- ✅ `teamCollaboration.updatePresence` - Presence tracking
- ✅ `teamCollaboration.getTeamPresence` - Active viewers
- ✅ `teamDecisions.createDecision` - Create team vote
- ✅ `teamDecisions.castVote` - Vote on decision
- ✅ `teamDecisions.getTeamDecisions` - Get decisions

**What's Missing:**
- Overview dashboard (cockpit view with stats)
- Players tab with health badges
- Planning tab with session plans
- Health & Safety widget
- Coach tasks management
- Voice notes integration
- Shared insights view
- Mobile-first responsive layout
- Quick actions menu

---

## 📊 Reorganized Story Dependencies

### Dependency Graph
```
Phase 1: Foundation
├─ US-P9-063: Mobile-First Layout (no deps)
│
Phase 2: Core Widgets
├─ US-P9-055: Health Widget (no deps)
├─ US-P9-056: Activity Feed Enhancement (depends: existing activity-feed-view.tsx)
│
Phase 3: Tab Views
├─ US-P9-052: Overview Dashboard (depends: US-P9-055, US-P9-056)
├─ US-P9-053: Players Tab (no deps)
├─ US-P9-054: Planning Tab (no deps)
│
Phase 4: Collaboration Features
├─ US-P9-059: Coach Tasks (schema change required FIRST)
├─ US-P9-060: Team Decision Voting (depends: existing voting-card.tsx)
├─ US-P9-061: Voice Notes Integration (depends: US-P9-056, US-P9-053, US-P9-054)
├─ US-P9-064: Shared Insights View (depends: US-P9-063)
│
Phase 5: Polish
└─ US-P9-057: Quick Actions Menu (depends: US-P9-059)
```

---

## 🚀 PHASE 1: Foundation & Layout (6 hours)

**Goal:** Set up responsive layout and schema for Week 4 features

### Story 1.1: Schema Changes (MUST DO FIRST)
**ID:** US-P9-SCHEMA
**Estimate:** 1 hour
**Priority:** P0 (Blocker)

**Tasks:**
1. Add `coachTasks` table to schema
2. Add `sessionId` field to `voiceNotes` table
3. Run `npx -w packages/backend convex dev`
4. Verify schema applied in Convex dashboard

**Schema Code:**
```typescript
// packages/backend/convex/schema.ts

// ADD NEW TABLE
coachTasks: defineTable({
  teamId: v.id("team"),
  organizationId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  assignedTo: v.array(v.string()), // user IDs
  createdBy: v.string(),
  dueDate: v.optional(v.number()),
  priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  status: v.union(v.literal("incomplete"), v.literal("complete")),
  completedAt: v.optional(v.number()),
  completedBy: v.optional(v.string()),
})
  .index("by_team", ["teamId"])
  .index("by_team_and_status", ["teamId", "status"])
  .index("by_assignee", ["assignedTo"])
  .index("by_org", ["organizationId"]),

// MODIFY EXISTING TABLE (voiceNotes)
// Add field:
sessionId: v.optional(v.id("sessionPlans")),
// Add index:
.index("by_session", ["sessionId"])
```

**Acceptance Criteria:**
- [ ] Schema changes compile without errors
- [ ] Tables visible in Convex dashboard
- [ ] Indexes created successfully
- [ ] Run `npx -w packages/backend convex codegen`
- [ ] Type check passes: `npm run check-types`

**Why First?** All subsequent backend functions depend on these schema changes.

---

### Story 1.2: Mobile-First Responsive Layout
**ID:** US-P9-063
**Estimate:** 5 hours
**Priority:** P0
**Dependencies:** None

**Goal:** Transform existing team-hub page into mobile-first responsive layout with tab navigation.

**Current File:** `apps/web/src/app/orgs/[orgId]/coach/team-hub/page.tsx`

**Tasks:**
1. **Add Tab Navigation**
   - Create `<Tabs>` wrapper with 4 tabs: Overview, Players, Planning, Insights
   - URL persistence via `useSearchParams(?tab=overview)`
   - Mobile: Horizontal scrollable tabs (full width)
   - Desktop: Tab bar at top with fixed width

2. **Responsive Layout Shell**
   - Mobile (<768px): Single column, drawer for filters
   - Tablet (768-1024px): 2-column grid where applicable
   - Desktop (>1024px): 3-column grid, sidebar visible

3. **Tab Content Placeholders**
   - Overview: "Coming soon" with activity feed (existing)
   - Players: "Coming soon" placeholder
   - Planning: "Coming soon" placeholder
   - Insights: "Coming soon" placeholder

4. **Preserve Existing Features**
   - Team selector dropdown (keep existing)
   - Activity feed (move to Overview tab)
   - Presence indicators (keep in header)
   - Voting cards (move to Overview tab)

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/page.tsx` (main changes)

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/tab-navigation.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/overview-tab.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/players-tab.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/planning-tab.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/insights-tab.tsx`

**Acceptance Criteria:**
- [ ] Tab navigation works (click to switch)
- [ ] URL updates when tab changes (`?tab=overview`)
- [ ] Existing activity feed appears in Overview tab
- [ ] Existing voting cards appear in Overview tab
- [ ] Mobile: Tabs scroll horizontally without overflow
- [ ] Desktop: Tabs display in fixed bar
- [ ] Responsive breakpoints working (768px, 1024px)
- [ ] Type check passes
- [ ] Visual verification with dev-browser (mobile + desktop)

**Reuse Patterns:**
- Tab component: See `insights-view-container.tsx` (Week 3)
- Responsive grid: See `coach/dashboard/page.tsx`

---

## 🎯 PHASE 2: Core Widgets (8 hours)

**Goal:** Build foundational data displays (health, activity)

### Story 2.1: Health & Safety Widget
**ID:** US-P9-055
**Estimate:** 3 hours
**Priority:** P0
**Dependencies:** None

**Goal:** Create standalone health widget showing active injuries and medical alerts.

**Backend Functions to Create:**
```typescript
// packages/backend/convex/models/injuries.ts (enhance existing)

export const getTeamHealthSummary = query({
  args: { teamId: v.id("team") },
  returns: v.object({
    activeInjuries: v.array(v.object({
      injuryId: v.id("injuries"),
      playerId: v.id("orgPlayerEnrollments"),
      playerName: v.string(),
      injuryType: v.string(),
      severity: v.union(
        v.literal("minor"),
        v.literal("moderate"),
        v.literal("severe")
      ),
      daysSinceInjury: v.number(),
      status: v.string(), // "Out", "Limited", "Cleared"
    })),
    allergyCount: v.number(),
    medicationCount: v.number(),
  }),
  handler: async (ctx, args) => {
    // 1. Get team player identities
    const teamPlayers = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const playerIds = teamPlayers.map(tp => tp.playerIdentityId);

    // 2. Get active injuries for these players (batch fetch)
    const allInjuries = await Promise.all(
      playerIds.map(async (playerId) => {
        return await ctx.db
          .query("injuries")
          .withIndex("by_player", (q) => q.eq("playerIdentityId", playerId))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();
      })
    );

    const injuries = allInjuries.flat();

    // 3. Enrich with player names (batch fetch)
    const uniquePlayerIds = [...new Set(injuries.map(i => i.playerIdentityId))];
    const players = await Promise.all(
      uniquePlayerIds.map(id => ctx.db.get(id))
    );
    const playerMap = new Map(players.map(p => [p!._id, p]));

    // 4. Calculate days since injury and format
    const activeInjuries = injuries.map(injury => {
      const player = playerMap.get(injury.playerIdentityId);
      const daysSince = Math.floor(
        (Date.now() - injury._creationTime) / (1000 * 60 * 60 * 24)
      );

      return {
        injuryId: injury._id,
        playerId: injury.playerIdentityId,
        playerName: player ? `${player.firstName} ${player.lastName}` : "Unknown",
        injuryType: injury.injuryType,
        severity: injury.severity,
        daysSinceInjury: daysSince,
        status: injury.returnToPlayStatus || "Out",
      };
    });

    // 5. Get medical alert counts (TODO: implement if medicalProfiles exist)
    const allergyCount = 0; // Placeholder
    const medicationCount = 0; // Placeholder

    return {
      activeInjuries,
      allergyCount,
      medicationCount,
    };
  },
});
```

**Frontend Component:**
```typescript
// apps/web/src/app/orgs/[orgId]/coach/team-hub/components/health-safety-widget.tsx

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Activity, Pill, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export function HealthSafetyWidget({ teamId }: { teamId: string }) {
  const healthSummary = useQuery(
    api.models.injuries.getTeamHealthSummary,
    { teamId: teamId as any }
  );

  if (!healthSummary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health & Safety</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { activeInjuries, allergyCount, medicationCount } = healthSummary;

  if (activeInjuries.length === 0 && allergyCount === 0 && medicationCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Health & Safety
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No active injuries - great job keeping the team healthy! 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  const severityColors = {
    minor: "bg-yellow-100 text-yellow-800",
    moderate: "bg-orange-100 text-orange-800",
    severe: "bg-red-100 text-red-800",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          Health & Safety
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Injuries */}
        {activeInjuries.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Active Injuries ({activeInjuries.length})</h4>
            <div className="space-y-2">
              {activeInjuries.slice(0, 5).map((injury) => (
                <div
                  key={injury.injuryId}
                  className="flex items-start justify-between gap-2 p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{injury.playerName}</p>
                    <p className="text-xs text-muted-foreground">{injury.injuryType}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {injury.daysSinceInjury} days ago • {injury.status}
                    </p>
                  </div>
                  <Badge className={severityColors[injury.severity]}>
                    {injury.severity}
                  </Badge>
                </div>
              ))}
            </div>
            {activeInjuries.length > 5 && (
              <Link
                href={`/orgs/${teamId}/coach/injuries`}
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                View all {activeInjuries.length} injuries →
              </Link>
            )}
          </div>
        )}

        {/* Medical Alerts */}
        {(allergyCount > 0 || medicationCount > 0) && (
          <div className="flex gap-4 pt-2 border-t">
            {allergyCount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Pill className="h-4 w-4 text-orange-500" />
                <span>{allergyCount} allergy alerts</span>
              </div>
            )}
            {medicationCount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-blue-500" />
                <span>{medicationCount} medication notes</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Acceptance Criteria:**
- [ ] Backend function `getTeamHealthSummary` created
- [ ] Uses batch fetch pattern (no N+1 queries)
- [ ] Uses `withIndex("by_team")` for team players
- [ ] Uses `withIndex("by_player")` for injuries
- [ ] Frontend component created
- [ ] Shows active injuries (max 5)
- [ ] Severity badges display correctly (🟡 minor, 🟠 moderate, 🔴 severe)
- [ ] Days since injury calculated correctly
- [ ] "View all X injuries" link if >5
- [ ] Empty state displays when no injuries
- [ ] Medical alert counts shown (if data available)
- [ ] Skeleton loader while loading
- [ ] Type check passes
- [ ] Visual verification with dev-browser

**Integration:**
- Will be used in US-P9-052 (Overview Dashboard)

---

### Story 2.2: Activity Feed Enhancement
**ID:** US-P9-056
**Estimate:** 5 hours
**Priority:** P0
**Dependencies:** Existing `activity-feed-view.tsx`

**Goal:** Enhance existing activity feed with pagination, better filtering, and new activity types.

**Current File:** `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/activity-feed-view.tsx`

**Backend Enhancement:**
```typescript
// packages/backend/convex/models/teamCollaboration.ts

// ENHANCE existing getTeamActivityFeed query
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
    page: v.array(v.object({
      _id: v.string(),
      type: v.string(),
      userId: v.string(),
      userName: v.string(),
      userAvatar: v.optional(v.string()),
      timestamp: v.number(),
      description: v.string(),
      entityId: v.optional(v.string()),
      entityType: v.optional(v.string()),
      priority: v.optional(v.string()),
    })),
    continueCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Implementation with pagination support
    // (existing logic + add pagination)
  },
});
```

**Frontend Enhancement:**
```typescript
// MODIFY: apps/web/src/app/orgs/[orgId]/coach/team-hub/components/activity-feed-view.tsx

// Add pagination state
const [cursor, setCursor] = useState<string | null>(null);
const [allItems, setAllItems] = useState<ActivityItem[]>([]);

// Use paginated query
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

// Load more handler
const handleLoadMore = () => {
  if (activityPage?.continueCursor) {
    setCursor(activityPage.continueCursor);
  }
};

// Add "Load More" button at bottom
{!activityPage?.isDone && (
  <Button onClick={handleLoadMore} variant="outline" className="w-full">
    Load More
  </Button>
)}
```

**New Activity Types to Support:**
- ✅ Voice note added (existing)
- ✅ Insight applied/dismissed (existing)
- ✅ Comment added (existing)
- ✅ Reaction added (existing)
- ✅ Player assessed (existing)
- ✅ Goal created (existing)
- ✅ Injury logged (existing)
- ✅ Decision created/voted (existing)
- ⭐ Task created/completed (NEW - Phase 4)
- ⭐ Session plan created (NEW)

**Acceptance Criteria:**
- [ ] Backend function enhanced with pagination
- [ ] Pagination uses cursor-based approach (Convex native)
- [ ] Frontend shows "Load More" button
- [ ] Button hidden when `isDone: true`
- [ ] Clicking "Load More" appends next 50 items
- [ ] Activity items show all existing types
- [ ] Date range filter added to UI (optional)
- [ ] Filter persists in URL (`?filter=insights`)
- [ ] Real-time updates work (new items appear at top)
- [ ] Skeleton loader while loading first page
- [ ] Empty state when no activity
- [ ] Type check passes
- [ ] Visual verification

**Integration:**
- Will be used in US-P9-052 (Overview Dashboard)

---

## 📑 PHASE 3: Tab Views (10 hours)

**Goal:** Build Overview, Players, and Planning tabs

### Story 3.1: Overview Dashboard (Cockpit View)
**ID:** US-P9-052
**Estimate:** 4 hours
**Priority:** P0
**Dependencies:** US-P9-055 (Health Widget), US-P9-056 (Activity Feed), US-P9-063 (Layout)

**Goal:** Create cockpit-style overview with quick stats, widgets, and activity feed.

**Backend Functions to Create:**
```typescript
// packages/backend/convex/models/teams.ts (enhance existing)

export const getTeamOverviewStats = query({
  args: { teamId: v.id("team") },
  returns: v.object({
    totalPlayers: v.number(),
    activeInjuries: v.number(),
    attendancePercent: v.number(), // Last 4 weeks average
    upcomingEventsCount: v.number(), // Next 7 days
  }),
  handler: async (ctx, args) => {
    // 1. Count total players
    const teamPlayers = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const totalPlayers = teamPlayers.length;

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

    // 3. Calculate attendance % (placeholder - requires attendance tracking)
    const attendancePercent = 85; // TODO: Implement when attendance data available

    // 4. Count upcoming events (sessions in next 7 days)
    const sevenDaysFromNow = Date.now() + (7 * 24 * 60 * 60 * 1000);
    const upcomingSessions = await ctx.db
      .query("sessionPlans")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.lte(q.field("scheduledDate"), sevenDaysFromNow))
      .filter((q) => q.gte(q.field("scheduledDate"), Date.now()))
      .collect();

    const upcomingEventsCount = upcomingSessions.length;

    return {
      totalPlayers,
      activeInjuries,
      attendancePercent,
      upcomingEventsCount,
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
    type: v.string(), // "session" or "game"
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

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HealthSafetyWidget } from "./health-safety-widget";
import { ActivityFeedView } from "./activity-feed-view";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, AlertCircle, Calendar, TrendingUp } from "lucide-react";

export function OverviewTab({ teamId }: { teamId: string }) {
  const stats = useQuery(api.models.teams.getTeamOverviewStats, { teamId: teamId as any });
  const upcomingEvents = useQuery(api.models.teams.getUpcomingEvents, { teamId: teamId as any, limit: 3 });

  return (
    <div className="space-y-6">
      {/* Quick Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Players"
          value={stats?.totalPlayers || 0}
          color="blue"
        />
        <StatCard
          icon={AlertCircle}
          label="Active Injuries"
          value={stats?.activeInjuries || 0}
          color="red"
        />
        <StatCard
          icon={TrendingUp}
          label="Attendance"
          value={`${stats?.attendancePercent || 0}%`}
          color="green"
        />
        <StatCard
          icon={Calendar}
          label="Upcoming Events"
          value={stats?.upcomingEventsCount || 0}
          color="purple"
        />
      </div>

      {/* Two-column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Widgets */}
        <div className="lg:col-span-1 space-y-6">
          {/* Health Widget */}
          <HealthSafetyWidget teamId={teamId} />

          {/* Upcoming Events Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!upcomingEvents || upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming events scheduled
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.eventId} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString()} {event.time && `at ${event.time}`}
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
        </div>

        {/* Right column: Activity Feed */}
        <div className="lg:col-span-2">
          <ActivityFeedView teamId={teamId} />
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
```

**Acceptance Criteria:**
- [ ] Backend functions created: `getTeamOverviewStats`, `getUpcomingEvents`
- [ ] Quick stats panel shows 4 metrics
- [ ] Health widget integrated (from US-P9-055)
- [ ] Upcoming events widget shows next 3 events
- [ ] Activity feed integrated (from US-P9-056)
- [ ] Desktop: 2-column layout (widgets left, activity right)
- [ ] Mobile: Single column (stacked)
- [ ] Skeleton loaders while loading
- [ ] Empty states for widgets
- [ ] Type check passes
- [ ] Visual verification

---

### Story 3.2: Players Tab with Health Badges
**ID:** US-P9-053
**Estimate:** 3 hours
**Priority:** P0
**Dependencies:** US-P9-063 (Layout)

**Goal:** Display team roster in grid with health badges and filtering.

**Reuse Existing:**
- Player card patterns from `/coach/dashboard/page.tsx` (SmartCoachDashboard)
- Player filtering logic
- Health status display

**Backend Function:**
```typescript
// packages/backend/convex/models/teams.ts

export const getTeamPlayersWithHealth = query({
  args: { teamId: v.id("team") },
  returns: v.array(v.object({
    playerId: v.id("orgPlayerEnrollments"),
    fullName: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    jerseyNumber: v.optional(v.string()),
    position: v.optional(v.string()),
    ageGroup: v.string(),
    sport: v.string(),
    healthStatus: v.union(
      v.literal("healthy"),
      v.literal("recovering"),
      v.literal("injured")
    ),
    isPlayingUp: v.boolean(),
    photoUrl: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    // 1. Get team players
    const teamPlayers = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    // 2. Batch fetch player enrollments
    const playerIds = teamPlayers.map(tp => tp.playerIdentityId);
    const players = await Promise.all(
      playerIds.map(id => ctx.db.get(id))
    );

    // 3. Batch fetch injuries
    const allInjuries = await Promise.all(
      playerIds.map(async (playerId) => {
        return await ctx.db
          .query("injuries")
          .withIndex("by_player", (q) => q.eq("playerIdentityId", playerId))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();
      })
    );

    // 4. Create injury map
    const injuryMap = new Map();
    allInjuries.flat().forEach(injury => {
      if (!injuryMap.has(injury.playerIdentityId)) {
        injuryMap.set(injury.playerIdentityId, injury);
      }
    });

    // 5. Enrich and return
    return players
      .filter(p => p !== null)
      .map(player => {
        const injury = injuryMap.get(player!._id);
        let healthStatus: "healthy" | "recovering" | "injured" = "healthy";

        if (injury) {
          healthStatus = injury.severity === "severe" ? "injured" : "recovering";
        }

        return {
          playerId: player!._id,
          fullName: `${player!.firstName} ${player!.lastName}`,
          firstName: player!.firstName,
          lastName: player!.lastName,
          jerseyNumber: player!.jerseyNumber,
          position: player!.position,
          ageGroup: player!.ageGroup,
          sport: player!.sport,
          healthStatus,
          isPlayingUp: false, // TODO: Calculate based on team age group
          photoUrl: player!.photoUrl,
        };
      });
  },
});
```

**Frontend Component:**
```typescript
// apps/web/src/app/orgs/[orgId]/coach/team-hub/components/players-tab.tsx

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, User } from "lucide-react";
import Link from "next/link";

export function PlayersTab({ teamId, orgId }: { teamId: string; orgId: string }) {
  const players = useQuery(api.models.teams.getTeamPlayersWithHealth, { teamId: teamId as any });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "injured" | "recovering">("all");
  const [sortBy, setSortBy] = useState<"name" | "jersey" | "position">("name");

  // Filter and sort logic
  const filteredPlayers = players
    ?.filter(p => {
      const matchesSearch = p.fullName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && p.healthStatus === "healthy") ||
        (statusFilter === "injured" && p.healthStatus === "injured") ||
        (statusFilter === "recovering" && p.healthStatus === "recovering");
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.fullName.localeCompare(b.fullName);
      if (sortBy === "jersey") return (a.jerseyNumber || "").localeCompare(b.jerseyNumber || "");
      if (sortBy === "position") return (a.position || "").localeCompare(b.position || "");
      return 0;
    });

  const healthIcons = {
    healthy: "🟢",
    recovering: "🟡",
    injured: "🔴",
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <option value="all">All Players</option>
          <option value="active">Active Only</option>
          <option value="injured">Injured</option>
          <option value="recovering">Recovering</option>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <option value="name">Sort: Name</option>
          <option value="jersey">Sort: Jersey #</option>
          <option value="position">Sort: Position</option>
        </Select>
      </div>

      {/* Player Grid */}
      {!filteredPlayers ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No players found matching filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlayers.map((player) => (
            <Link
              key={player.playerId}
              href={`/orgs/${orgId}/coach/players/${player.playerId}`}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{player.fullName}</h3>
                      <p className="text-xs text-muted-foreground">{player.position || "No position"}</p>
                    </div>
                    <span className="text-2xl">{healthIcons[player.healthStatus]}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="outline">#{player.jerseyNumber || "—"}</Badge>
                    <span className="text-muted-foreground">{player.ageGroup}</span>
                  </div>
                  {player.isPlayingUp && (
                    <Badge className="mt-2 text-xs" variant="secondary">Playing Up</Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Backend function `getTeamPlayersWithHealth` created
- [ ] Uses batch fetch (no N+1 queries)
- [ ] Player grid displays (1/2/3/4 columns responsive)
- [ ] Health badges show (🟢 healthy, 🟡 recovering, 🔴 injured)
- [ ] Search filter works (by name)
- [ ] Status filter works (All/Active/Injured/Recovering)
- [ ] Sort options work (Name/Jersey/Position)
- [ ] Click player → navigate to Player Passport
- [ ] Touch targets ≥44px
- [ ] Empty state when no players match filter
- [ ] Skeleton loader while loading
- [ ] Type check passes
- [ ] Visual verification

---

### Story 3.3: Planning Tab (Simple List + Season Milestones)
**ID:** US-P9-054
**Estimate:** 3 hours
**Priority:** P1
**Dependencies:** US-P9-063 (Layout)

**Goal:** Display session plans in simple list with season milestones timeline.

**Backend Functions:**
```typescript
// packages/backend/convex/models/sessionPlans.ts (enhance existing)

export const getSeasonMilestones = query({
  args: { teamId: v.id("team") },
  returns: v.object({
    seasonStart: v.optional(v.number()),
    seasonEnd: v.optional(v.number()),
    keyDates: v.array(v.object({
      date: v.number(),
      title: v.string(),
      type: v.union(v.literal("game"), v.literal("tournament"), v.literal("review")),
    })),
  }),
  handler: async (ctx, args) => {
    // Get team
    const team = await ctx.db.get(args.teamId);
    if (!team) return { keyDates: [] };

    // Extract season dates from team.season field (if exists)
    const seasonStart = team.season?.startDate;
    const seasonEnd = team.season?.endDate;

    // Calculate mid-season review (halfway between start/end)
    const keyDates = [];
    if (seasonStart && seasonEnd) {
      const midpoint = seasonStart + (seasonEnd - seasonStart) / 2;
      keyDates.push({
        date: midpoint,
        title: "Mid-Season Review",
        type: "review" as const,
      });
    }

    // TODO: Add games/tournaments when that data is available

    return {
      seasonStart,
      seasonEnd,
      keyDates,
    };
  },
});

// Reuse existing: api.models.sessionPlans.listByTeam
```

**Frontend Component:**
```typescript
// apps/web/src/app/orgs/[orgId]/coach/team-hub/components/planning-tab.tsx

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";

export function PlanningTab({ teamId, orgId }: { teamId: string; orgId: string }) {
  const sessionPlans = useQuery(api.models.sessionPlans.listByTeam, { teamId: teamId as any });
  const milestones = useQuery(api.models.sessionPlans.getSeasonMilestones, { teamId: teamId as any });

  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");

  const now = Date.now();
  const filteredPlans = sessionPlans?.filter(plan => {
    if (filter === "upcoming") return plan.scheduledDate >= now;
    if (filter === "past") return plan.scheduledDate < now;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Season Timeline */}
      {milestones && milestones.keyDates.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Season Milestones
            </h3>
            <div className="space-y-2">
              {milestones.seasonStart && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Season:</span>{" "}
                  {format(milestones.seasonStart, "MMM d")} - {format(milestones.seasonEnd!, "MMM d, yyyy")}
                </div>
              )}
              {milestones.keyDates.map((date, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{date.type}</Badge>
                  <span>{date.title}</span>
                  <span className="text-muted-foreground">• {format(date.date, "MMM d, yyyy")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & Quick Create */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === "upcoming" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("upcoming")}
          >
            Upcoming
          </Button>
          <Button
            variant={filter === "past" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("past")}
          >
            Past
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
        </div>
        <Link href={`/orgs/${orgId}/coach/session-plans/new?teamId=${teamId}`}>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Session Plan
          </Button>
        </Link>
      </div>

      {/* Session Plan List */}
      {!filteredPlans ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No session plans {filter !== "all" && filter}</p>
          <Link href={`/orgs/${orgId}/coach/session-plans/new?teamId=${teamId}`}>
            <Button className="mt-4">Create Your First Session Plan</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPlans.map((plan) => {
            const isToday = format(plan.scheduledDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");

            return (
              <Link key={plan._id} href={`/orgs/${orgId}/coach/session-plans/${plan._id}`}>
                <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${isToday ? "border-primary border-2" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{plan.title}</h3>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(plan.scheduledDate, "MMM d, yyyy")}
                          </span>
                          {plan.scheduledTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {plan.scheduledTime}
                            </span>
                          )}
                          {plan.venue && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {plan.venue}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isToday && <Badge>Today</Badge>}
                        {plan.isCompleted && <Badge variant="outline">✓ Completed</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Backend function `getSeasonMilestones` created
- [ ] Season timeline shows season dates and mid-season review
- [ ] Session plan list displays
- [ ] Filter tabs work (Upcoming/Past/All)
- [ ] Today's session highlighted (border + badge)
- [ ] Click session → navigate to session plan detail
- [ ] "New Session Plan" button links to creation page
- [ ] Empty state when no sessions
- [ ] Skeleton loader while loading
- [ ] Type check passes
- [ ] Visual verification

---

## 🤝 PHASE 4: Collaboration Features (12 hours)

**Goal:** Add tasks, voting, voice notes integration, shared insights

### Story 4.1: Coach Tasks Management
**ID:** US-P9-059
**Estimate:** 4 hours
**Priority:** P1
**Dependencies:** US-P9-SCHEMA (coachTasks table), US-P9-057 (Quick Actions)

**Goal:** Create and manage coach tasks with assignment and completion tracking.

**Backend Functions:**
```typescript
// packages/backend/convex/models/coachTasks.ts (NEW FILE)

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { components } from "../_generated/api";

export const createTask = mutation({
  args: {
    teamId: v.id("team"),
    organizationId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    assignedTo: v.array(v.string()), // user IDs
    dueDate: v.optional(v.number()),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  },
  returns: v.id("coachTasks"),
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) throw new Error("Unauthorized");

    const taskId = await ctx.db.insert("coachTasks", {
      ...args,
      createdBy: userId.subject,
      status: "incomplete",
      completedAt: undefined,
      completedBy: undefined,
    });

    // Create activity feed entry
    await ctx.db.insert("teamCollaborationActivity", {
      teamId: args.teamId,
      userId: userId.subject,
      action: "task_created",
      entityType: "task",
      entityId: taskId,
      priority: args.priority === "high" ? "important" : "normal",
    });

    return taskId;
  },
});

export const completeTask = mutation({
  args: { taskId: v.id("coachTasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) throw new Error("Unauthorized");

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.taskId, {
      status: "complete",
      completedAt: Date.now(),
      completedBy: userId.subject,
    });

    // Create activity feed entry
    await ctx.db.insert("teamCollaborationActivity", {
      teamId: task.teamId,
      userId: userId.subject,
      action: "task_completed",
      entityType: "task",
      entityId: args.taskId,
      priority: "normal",
    });

    return null;
  },
});

export const getTeamTasks = query({
  args: {
    teamId: v.id("team"),
    status: v.optional(v.union(v.literal("incomplete"), v.literal("complete"))),
  },
  returns: v.array(v.object({
    _id: v.id("coachTasks"),
    title: v.string(),
    description: v.optional(v.string()),
    assignedTo: v.array(v.object({
      id: v.string(),
      name: v.string(),
      avatar: v.optional(v.string()),
    })),
    createdBy: v.object({
      id: v.string(),
      name: v.string(),
    }),
    dueDate: v.optional(v.number()),
    priority: v.string(),
    status: v.string(),
    completedAt: v.optional(v.number()),
    isOverdue: v.boolean(),
  })),
  handler: async (ctx, args) => {
    // Query tasks
    let tasksQuery = ctx.db
      .query("coachTasks")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId));

    if (args.status) {
      tasksQuery = ctx.db
        .query("coachTasks")
        .withIndex("by_team_and_status", (q) =>
          q.eq("teamId", args.teamId).eq("status", args.status)
        );
    }

    const tasks = await tasksQuery.collect();

    // Batch fetch user details
    const uniqueUserIds = [
      ...new Set([
        ...tasks.map(t => t.createdBy),
        ...tasks.flatMap(t => t.assignedTo),
      ])
    ];

    const users = await Promise.all(
      uniqueUserIds.map(async (userId) => {
        const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: userId, operator: "eq" }],
        });
        return user;
      })
    );

    const userMap = new Map(
      users.filter(u => u).map(u => [u!._id, u])
    );

    // Enrich tasks
    const now = Date.now();
    return tasks.map(task => {
      const creator = userMap.get(task.createdBy);
      const assigned = task.assignedTo
        .map(id => userMap.get(id))
        .filter(u => u)
        .map(u => ({
          id: u!._id,
          name: `${u!.firstName} ${u!.lastName}`,
          avatar: u!.image,
        }));

      const isOverdue = task.status === "incomplete" && task.dueDate && task.dueDate < now;

      return {
        _id: task._id,
        title: task.title,
        description: task.description,
        assignedTo: assigned,
        createdBy: {
          id: task.createdBy,
          name: creator ? `${creator.firstName} ${creator.lastName}` : "Unknown",
        },
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status,
        completedAt: task.completedAt,
        isOverdue,
      };
    });
  },
});
```

**Frontend Components:**
```typescript
// apps/web/src/app/orgs/[orgId]/coach/team-hub/components/task-list-widget.tsx

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function TaskListWidget({ teamId }: { teamId: string }) {
  const tasks = useQuery(api.models.coachTasks.getTeamTasks, {
    teamId: teamId as any,
    status: "incomplete",
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

  const incompleteTasks = tasks?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Team Tasks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {incompleteTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tasks - click + to create one
          </p>
        ) : (
          <div className="space-y-3">
            {incompleteTasks.map((task) => (
              <div key={task._id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
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
                      <span className={`text-xs ${task.isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                        {task.isOverdue && <AlertCircle className="inline h-3 w-3 mr-1" />}
                        Due {format(task.dueDate, "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {tasks && tasks.length > 5 && (
              <button className="text-sm text-primary hover:underline">
                View all {tasks.length} tasks →
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// apps/web/src/app/orgs/[orgId]/coach/team-hub/components/task-creation-modal.tsx
// (Implementation similar to existing modals in the app)
```

**Acceptance Criteria:**
- [ ] Schema table `coachTasks` exists (from Phase 1)
- [ ] Backend functions created: `createTask`, `completeTask`, `getTeamTasks`
- [ ] Task widget shows incomplete tasks (max 5)
- [ ] Checkbox to mark complete works (optimistic UI)
- [ ] Overdue tasks highlighted in red
- [ ] High priority tasks show badge
- [ ] Task creation modal (basic version)
- [ ] Tasks appear in activity feed
- [ ] Real-time updates work
- [ ] Type check passes
- [ ] Visual verification

**Note:** Full task creation UI can be simplified for MVP - basic title + assignee + due date.

---

### Story 4.2: Team Decision Voting Enhancement
**ID:** US-P9-060
**Estimate:** 2 hours
**Priority:** P1
**Dependencies:** Existing voting-card.tsx

**Goal:** Enhance existing voting cards to appear in activity feed with inline voting.

**Current State:** Voting cards already exist at `team-hub/components/voting-card.tsx`

**Tasks:**
1. Integrate voting cards into activity feed (US-P9-056)
2. Add inline voting (no need to navigate away)
3. Real-time vote count updates

**Acceptance Criteria:**
- [ ] Decision items appear in activity feed
- [ ] Inline voting works (click vote → instant update)
- [ ] Vote counts update in real-time
- [ ] Can undo vote (toggle)
- [ ] Empty state when no decisions
- [ ] Mobile: stacked buttons, Desktop: horizontal
- [ ] Type check passes
- [ ] Visual verification

**Note:** Most functionality already exists - just needs integration into activity feed.

---

### Story 4.3: Voice Notes Integration (3 Ways)
**ID:** US-P9-061
**Estimate:** 4 hours
**Priority:** P1
**Dependencies:** US-P9-056 (Activity Feed), US-P9-053 (Players Tab), US-P9-054 (Planning Tab), US-P9-SCHEMA (voiceNotes.sessionId)

**Goal:** Integrate voice notes in activity feed, player cards, and session plans.

**Backend Functions:**
```typescript
// packages/backend/convex/models/voiceNotes.ts (enhance existing)

export const linkNoteToSession = mutation({
  args: {
    noteId: v.id("voiceNotes"),
    sessionId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.noteId, { sessionId: args.sessionId });
    return null;
  },
});

export const getSessionNotes = query({
  args: { sessionId: v.id("sessionPlans") },
  returns: v.array(v.object({
    noteId: v.id("voiceNotes"),
    title: v.string(),
    summary: v.string(),
    insightCount: v.number(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return notes.map(note => ({
      noteId: note._id,
      title: note.title || "Untitled Note",
      summary: note.transcript?.slice(0, 100) + "..." || "",
      insightCount: note.insights?.length || 0,
      createdAt: note._creationTime,
    }));
  },
});

export const getPlayerNoteCount = query({
  args: { playerId: v.id("orgPlayerEnrollments") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", args.playerId))
      .collect();

    return notes.length;
  },
});
```

**Integration Points:**

1. **Activity Feed** (modify ActivityFeedView):
   - Voice note items already supported
   - Add AI summary preview (first 100 chars)
   - Add insight count badge
   - Click → navigate to note detail

2. **Player Cards** (modify PlayersTab):
   - Add note count badge to each player card
   - Click badge → navigate to Player Passport → Voice Notes tab filtered

3. **Planning Tab** (modify PlanningTab):
   - Add linked notes count to each session plan
   - Click session → show "Related Notes" section
   - Add "Link Note" button to attach existing note

**Acceptance Criteria:**
- [ ] Schema: `voiceNotes.sessionId` field exists (from Phase 1)
- [ ] Backend functions created: `linkNoteToSession`, `getSessionNotes`, `getPlayerNoteCount`
- [ ] Activity feed shows voice note items with AI summary
- [ ] Player cards show note count badge
- [ ] Session plans show linked notes count
- [ ] Click session → "Related Notes" section visible
- [ ] Can link existing note to session
- [ ] Real-time updates work
- [ ] Type check passes
- [ ] Visual verification (all 3 integration points)

---

### Story 4.4: Shared Insights View
**ID:** US-P9-064
**Estimate:** 2 hours
**Priority:** P1
**Dependencies:** US-P9-063 (Mobile Layout)

**Goal:** Create Insights tab showing all team coaches' insights with consensus indicators.

**Reuse:** InsightsBoardView from Week 3 (already exists)

**Backend Function:**
```typescript
// packages/backend/convex/models/voiceNoteInsights.ts (NEW or enhance existing)

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
    appliedBy: v.array(v.object({ id: v.string(), name: v.string() })),
    dismissedBy: v.array(v.object({ id: v.string(), name: v.string() })),
    status: v.string(),
    commentCount: v.number(),
    hasConsensus: v.boolean(),
  })),
  handler: async (ctx, args) => {
    // Get all voice notes for team
    const notes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Extract all insights from notes
    // Enrich with coach info
    // Calculate consensus (2+ coaches applied = consensus)
    // Filter by status if provided

    // Implementation details...
  },
});
```

**Frontend Component:**
```typescript
// apps/web/src/app/orgs/[orgId]/coach/team-hub/components/insights-tab.tsx

// Reuse InsightsBoardView from Week 3
// Add filters: status, coach, category
// Add consensus badges
// Integrate SwipeableInsightCard for mobile
```

**Acceptance Criteria:**
- [ ] Backend function `getTeamInsights` created
- [ ] Insights tab shows all team insights (not just current user)
- [ ] Filter by status works (Pending/Applied/Dismissed)
- [ ] Consensus badge shows when 2+ coaches applied
- [ ] Board view option works (reuse from Week 3)
- [ ] List view option works (default)
- [ ] Mobile: swipeable cards (reuse SwipeableInsightCard)
- [ ] Empty state when no insights
- [ ] Type check passes
- [ ] Visual verification

---

## ✨ PHASE 5: Polish (2 hours)

**Goal:** Quick actions menu for fast task creation

### Story 5.1: Quick Actions Menu (FAB)
**ID:** US-P9-057
**Estimate:** 2 hours
**Priority:** P2
**Dependencies:** US-P9-059 (Tasks - so "Create Task" action has somewhere to go)

**Goal:** Floating action button with speed dial for quick create actions.

**Frontend Component:**
```typescript
// apps/web/src/app/orgs/[orgId]/coach/team-hub/components/quick-actions-menu.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, CalendarPlus, AlertCircle, CheckSquare, Target, Plus, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export function QuickActionsMenu({ teamId, orgId }: { teamId: string; orgId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: Mic, label: "Voice Note", href: `/orgs/${orgId}/coach/voice-notes/new` },
    { icon: CalendarPlus, label: "Session Plan", href: `/orgs/${orgId}/coach/session-plans/new?teamId=${teamId}` },
    { icon: AlertCircle, label: "Log Injury", href: `/orgs/${orgId}/coach/injuries/new` },
    { icon: CheckSquare, label: "Create Task", onClick: () => {/* Open task modal */} },
    { icon: Target, label: "Add Goal", href: `/orgs/${orgId}/coach/goals/new` },
  ];

  return (
    <div className="fixed bottom-6 right-6 md:absolute md:top-4 md:bottom-auto z-50">
      {/* FAB */}
      <Button
        size="lg"
        className="h-14 w-14 md:h-10 md:w-auto rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        <span className="hidden md:inline ml-2">Quick Actions</span>
      </Button>

      {/* Speed Dial */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-16 right-0 md:top-12 md:bottom-auto md:right-0 bg-popover border rounded-lg shadow-lg p-2 min-w-[200px]"
          >
            {actions.map((action, i) => (
              <Link key={i} href={action.href || "#"} onClick={() => setIsOpen(false)}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12"
                  onClick={action.onClick}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] FAB positioned correctly (mobile: bottom-right, desktop: top-right of header)
- [ ] Click FAB → speed dial opens
- [ ] 5 actions: Voice Note, Session Plan, Injury, Task, Goal
- [ ] Actions navigate to creation pages
- [ ] Smooth animations (scale + fade)
- [ ] Click outside → menu closes
- [ ] ESC key closes menu
- [ ] Touch-friendly (56px FAB, 44px menu items)
- [ ] Type check passes
- [ ] Visual verification

---

## 📦 Summary: 5 Phases, 11 Stories

| Phase | Stories | Estimate | Status |
|-------|---------|----------|--------|
| **Phase 1: Foundation** | US-P9-SCHEMA, US-P9-063 | 6h | Ready |
| **Phase 2: Core Widgets** | US-P9-055, US-P9-056 | 8h | Ready |
| **Phase 3: Tab Views** | US-P9-052, US-P9-053, US-P9-054 | 10h | Ready |
| **Phase 4: Collaboration** | US-P9-059, US-P9-060, US-P9-061, US-P9-064 | 12h | Ready |
| **Phase 5: Polish** | US-P9-057 | 2h | Ready |
| **TOTAL** | **12 Stories** | **38h** | **Ready** |

---

## ✅ Delivery Checklist (Per Phase)

After completing each phase:
- [ ] All acceptance criteria met
- [ ] Type check passes: `npm run check-types`
- [ ] Lint check passes: `npx ultracite fix`
- [ ] Visual verification with dev-browser (mobile + desktop)
- [ ] Git commit with descriptive message
- [ ] Update prd.json story status to `passes: true`

---

## 🚀 Ready for Ralph!

Each phase is:
- ✅ **Self-contained** - Can be delivered independently
- ✅ **Testable** - Clear acceptance criteria
- ✅ **Incremental** - Builds on previous phases
- ✅ **Well-defined** - Backend + frontend specs complete

Ralph can now execute Phase 1 → 2 → 3 → 4 → 5 sequentially, delivering clean, testable value at each step!
