# Phase 4 Context - Tasks + Insights Tabs

**Date**: 2026-02-02
**Phase**: Phase 9 Week 4 Phase 4
**Status**: Ready to start
**Estimated Effort**: 9 hours (5h Tasks, 4h Insights)

## Executive Summary

Phase 4 completes Week 4 by adding **Tasks Tab** and **Insights Tab** to the Team Hub. This phase **builds directly on patterns** established in Phases 1-3. You will **copy and adapt** existing components rather than building from scratch.

**Key Principle**: Maximum code reuse. Every component you build should reference an existing component as a template.

---

## What Was Built in Phases 1-3

### Phase 1: Foundation ✅
- **Tab Navigation System** (7 tabs with URL persistence)
- **Activity Feed with Pagination** (cursor-based, 50 items/page)
- **Team Selector** (dropdown for multi-team coaches)
- **Presence Indicators** (real-time team viewing)

### Phase 2: Core Widgets ✅
- **Overview Dashboard** (2-column layout with widgets)
- **Quick Stats Panel** (4 KPI cards)
- **Health & Safety Widget** (injuries + medical alerts)
- **Upcoming Events Widget** (placeholder)

### Phase 3: Tab Views ✅
- **Players Tab** (grid with health badges, filters, search, sort)
- **Planning Tab** (session list + season timeline)
- **Player Card** (avatar, info, badges, click navigation)
- **Session Plan List** (upcoming/past sessions)

---

## Component Inventory (What You Can Reuse)

### 1. Filter Components

**Source**: `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/player-filters.tsx`

**Pattern**:
```typescript
// Props interface
type PlayerFiltersProps = {
  statusFilter: StatusFilter;
  positionFilter: string;
  searchQuery: string;
  sortBy: SortOption;
  onStatusFilterChange: (value: StatusFilter) => void;
  onPositionFilterChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onSortByChange: (value: SortOption) => void;
  availablePositions: string[];
};

// UI Structure
<div className="space-y-4">
  {/* Primary filter: Tabs */}
  <Tabs value={statusFilter} onValueChange={onStatusFilterChange}>
    <TabsList className="grid w-full grid-cols-4">
      <TabsTrigger value="all">All</TabsTrigger>
      <TabsTrigger value="active">Active</TabsTrigger>
      {/* ... */}
    </TabsList>
  </Tabs>

  {/* Secondary filters: Search + Dropdowns */}
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="relative max-w-sm flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
      <Input placeholder="Search..." />
    </div>

    <div className="flex gap-2">
      <Select value={positionFilter} onValueChange={onPositionFilterChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Position" />
        </SelectTrigger>
        {/* ... */}
      </Select>

      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        {/* ... */}
      </Select>
    </div>
  </div>
</div>
```

**For Phase 4**:
- **Tasks Tab**: Copy → rename to `task-filters.tsx`
  - Status tabs: All, Open, In Progress, Done
  - Priority dropdown: All, High, Medium, Low
  - Assignee dropdown: All + coach names
  - Sort: Due Date, Priority, Created Date
- **Insights Tab**: Copy → rename to `insight-filters.tsx`
  - Type tabs: All, Voice Notes, AI Insights, Manual
  - Player dropdown: All + player names
  - Topic dropdown: All, Technical, Tactical, Fitness, Behavioral
  - Sort: Newest, Oldest, Priority

---

### 2. Card Components

**Source**: `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/player-card.tsx`

**Pattern**:
```typescript
<Link href={`/orgs/${organizationId}/coach/players/${playerId}`}>
  <Card className="group cursor-pointer transition-all hover:border-primary hover:shadow-md">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        {/* Avatar/Icon */}
        <div className="flex-shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={fullName} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
              {initials}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-sm">{fullName}</h3>
              <p className="text-muted-foreground text-xs">{position || "No position"}</p>
            </div>

            {/* Watermark (jersey number, date, etc) */}
            <div className="flex-shrink-0 font-bold text-2xl text-muted-foreground/30">
              {jerseyNumber ? `#${jerseyNumber}` : "—"}
            </div>
          </div>

          {/* Badges */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant={healthVariant} className={healthClassName}>
              <HealthIcon className="mr-1 h-3 w-3" />
              {healthLabel}
            </Badge>
            {isPlayingUp && <Badge variant="outline">Playing Up</Badge>}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</Link>
```

**For Phase 4**:
- **Tasks Tab**: Copy → rename to `task-card.tsx`
  - Avatar: Assignee avatar + initials
  - Title: Task title (h3)
  - Metadata: Due date (relative time) or "No due date"
  - Watermark: Due date (MMM DD format) in large text
  - Badges: Priority (destructive=high, default=medium, secondary=low), Status (open/in-progress/done), Overdue badge (if past due)
  - Click: Open task detail modal (not navigation)

- **Insights Tab**: Copy → rename to `insight-card.tsx`
  - Avatar: Creator avatar + initials
  - Icon: Type icon (Mic/Sparkles/FileText) in colored circle
  - Title: Insight title (bold)
  - Metadata: Summary text (2-3 lines, truncated)
  - Watermark: None (use timestamp instead)
  - Badges: Topic badge, Priority badge (high only), Related player badges
  - Click: Open insight detail modal

---

### 3. List Components

**Source**: `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/session-plan-list.tsx`

**Pattern**:
```typescript
<div className="space-y-4">
  {sessions.map(session => (
    <Link href={`/orgs/${organizationId}/coach/session-plans/${session._id}`} key={session._id}>
      <Card className="transition-all hover:border-primary hover:shadow-md">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="font-medium leading-none">{session.title || "Untitled Session"}</p>
                <p className="text-muted-foreground text-xs">{formatDistanceToNow(session.createdAt, { addSuffix: true })}</p>
              </div>

              <div className="flex items-center gap-2">
                {isToday && <Badge variant="default">Today</Badge>}
                {session.usedInSession && <Badge variant="secondary"><Check className="h-3 w-3" /></Badge>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
              {session.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{session.duration} min</span>
                </div>
              )}
              {session.focusArea && (
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  <span>{session.focusArea}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  ))}
</div>
```

**For Phase 4**: Use for list variants (if needed) or as reference for card structure

---

### 4. Pagination Pattern

**Source**: `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/activity-feed-view.tsx` (lines 60-90)

**Pattern**:
```typescript
// State
const [paginatedItems, setPaginatedItems] = useState<Item[]>([]);
const [cursor, setCursor] = useState<string | null>(null);
const [isDone, setIsDone] = useState(false);
const [isLoadingMore, setIsLoadingMore] = useState(false);

// Initial load
useEffect(() => {
  if (data) {
    if (typeof data === "object" && "page" in data) {
      setPaginatedItems(data.page);
      setCursor(data.continueCursor);
      setIsDone(data.isDone);
    } else {
      setPaginatedItems(data);
      setIsDone(true);
    }
  }
}, [data]);

// Load more function
const handleLoadMore = async () => {
  if (!cursor || isDone || isLoadingMore) return;

  setIsLoadingMore(true);

  const result = await client.query(api.yourQuery, {
    teamId,
    organizationId,
    paginationOpts: { cursor, numItems: 50 },
  });

  if (result && typeof result === "object" && "page" in result) {
    setPaginatedItems((prev) => [...prev, ...result.page]);
    setCursor(result.continueCursor);
    setIsDone(result.isDone);
  }

  setIsLoadingMore(false);
};

// UI
<div className="space-y-4">
  {paginatedItems.map(item => <ItemCard key={item._id} {...item} />)}

  {!isDone && (
    <div className="flex justify-center pt-4">
      <Button onClick={handleLoadMore} disabled={isLoadingMore}>
        {isLoadingMore ? "Loading..." : "Load More"}
      </Button>
    </div>
  )}
</div>
```

**For Phase 4**: Use for **Insights Tab** (likely will have >50 insights over time)

---

### 5. Empty State Pattern

**Source**: Used throughout all tabs

**Pattern**:
```typescript
import { Empty, EmptyContent, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

<Empty>
  <EmptyMedia>
    <Icon className="h-12 w-12 text-muted-foreground" />
  </EmptyMedia>
  <EmptyContent>
    <EmptyTitle>No Items Found</EmptyTitle>
    <EmptyDescription>
      Description text here. Optional CTA.
    </EmptyDescription>
  </EmptyContent>
</Empty>
```

**For Phase 4**:
- Tasks: "No tasks created yet" with Clipboard icon + "Create your first task" CTA
- Tasks (no matches): "No tasks match filters" with Filter icon
- Insights: "No insights generated yet" with Lightbulb icon + "Generate insights from voice notes" CTA
- Insights (no matches): "No insights match filters" with Filter icon

---

### 6. Loading State Pattern

**Source**: `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/players-tab.tsx` (lines 104-123)

**Pattern**:
```typescript
if (!data) {
  return (
    <div className="space-y-6">
      {/* Filter skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-3">
          <Skeleton className="h-10 max-w-sm flex-1" />
          <Skeleton className="h-10 w-[140px]" />
          <Skeleton className="h-10 w-[140px]" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => `skeleton-${i}`).map((key) => (
          <Skeleton key={key} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
```

**For Phase 4**: Copy this pattern for Tasks and Insights tabs

---

## Backend Query Patterns (CRITICAL)

### Pattern 1: Batch Fetch with Map Lookup

**Source**: `packages/backend/convex/models/teams.ts` - `getTeamPlayersWithHealth`

```typescript
export const getTeamTasks = query({
  args: { teamId: v.string(), organizationId: v.string() },
  returns: v.array(taskValidator),
  handler: async (ctx, args) => {
    // Step 1: Get all tasks for team
    const tasks = await ctx.db
      .query("teamTasks")
      .withIndex("by_team_and_status", q => q.eq("teamId", args.teamId))
      .collect();

    // Step 2: Batch fetch assignees (avoid N+1)
    const uniqueAssigneeIds = [...new Set(tasks.map(t => t.assigneeId).filter(Boolean))];
    const assigneeResults = await Promise.all(
      uniqueAssigneeIds.map(id =>
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: id, operator: "eq" }],
        })
      )
    );

    // Step 3: Create Map for O(1) lookup
    const assigneeMap = new Map();
    for (const user of assigneeResults) {
      if (user) assigneeMap.set((user as any)._id, user);
    }

    // Step 4: Enrich tasks with assignee names
    return tasks.map(task => ({
      ...task,
      assigneeName: assigneeMap.get(task.assigneeId)?.name || "Unassigned",
      assigneeAvatar: assigneeMap.get(task.assigneeId)?.image || null,
    }));
  },
});
```

**For Phase 4**:
- **Tasks**: Batch fetch assignees (shown above)
- **Insights**: Batch fetch voice notes and player identities

---

### Pattern 2: Composite Index Usage

**CRITICAL**: Always use composite indexes for multi-field queries

```typescript
// ✅ CORRECT: Use composite index
const tasks = await ctx.db
  .query("teamTasks")
  .withIndex("by_team_and_status", q =>
    q.eq("teamId", args.teamId).eq("status", "open")
  )
  .collect();

// ❌ WRONG: Filter after withIndex (N+1 query)
const tasks = await ctx.db
  .query("teamTasks")
  .withIndex("by_team", q => q.eq("teamId", args.teamId))
  .filter(q => q.eq(q.field("status"), "open"))  // BAD!
  .collect();
```

**Indexes to Create**:
- `teamTasks`: `by_team_and_status`, `by_assignee_and_status`
- `teamInsights`: `by_team_and_type`, `by_voice_note`, `by_team_and_date`

---

### Pattern 3: Paginated Query

**Source**: `packages/backend/convex/models/teamCollaboration.ts` - `getTeamActivityFeed`

```typescript
export const getTeamInsights = query({
  args: {
    teamId: v.string(),
    organizationId: v.string(),
    paginationOpts: v.optional(v.object({
      cursor: v.union(v.string(), v.null()),
      numItems: v.number(),
    })),
  },
  returns: v.union(
    v.object({
      page: v.array(insightValidator),
      continueCursor: v.union(v.string(), v.null()),
      isDone: v.boolean(),
    }),
    v.array(insightValidator)
  ),
  handler: async (ctx, args) => {
    const baseQuery = ctx.db
      .query("teamInsights")
      .withIndex("by_team_and_date", q => q.eq("teamId", args.teamId))
      .order("desc");

    if (args.paginationOpts) {
      const result = await baseQuery.paginate(args.paginationOpts);
      return {
        page: result.page,
        continueCursor: result.continueCursor,
        isDone: result.isDone,
      };
    }

    return await baseQuery.collect();
  },
});
```

**For Phase 4**: Use for **Insights Tab** (Tasks probably won't need pagination initially)

---

## Schema Definitions

### teamTasks Table

```typescript
teamTasks: defineTable({
  teamId: v.string(), // Better Auth team ID
  organizationId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  assigneeId: v.optional(v.string()), // Better Auth user ID
  dueDate: v.optional(v.number()), // Timestamp
  priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  status: v.union(v.literal("open"), v.literal("in-progress"), v.literal("done")),
  createdBy: v.string(), // User ID
  createdAt: v.number(),
  updatedAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_team_and_status", ["teamId", "status"])
  .index("by_assignee_and_status", ["assigneeId", "status"])
  .index("by_due_date", ["dueDate"]),
```

### teamInsights Table

```typescript
teamInsights: defineTable({
  teamId: v.string(),
  organizationId: v.string(),
  type: v.union(v.literal("voice-note"), v.literal("ai-generated"), v.literal("manual")),
  title: v.string(),
  summary: v.string(), // 2-3 sentence summary
  fullText: v.optional(v.string()), // Full insight text
  voiceNoteId: v.optional(v.id("voiceNotes")),
  playerIds: v.optional(v.array(v.id("playerIdentities"))),
  topic: v.union(
    v.literal("technical"),
    v.literal("tactical"),
    v.literal("fitness"),
    v.literal("behavioral"),
    v.literal("other")
  ),
  priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  createdBy: v.string(), // User ID
  createdAt: v.number(),
  readBy: v.optional(v.array(v.string())), // User IDs who viewed
})
  .index("by_team_and_type", ["teamId", "type"])
  .index("by_voice_note", ["voiceNoteId"])
  .index("by_team_and_date", ["teamId", "createdAt"]),
```

---

## Step-by-Step Implementation Guide

### US-P9-057: Tasks Tab (5 hours)

#### Step 1: Backend (2 hours)

1. **Add schema** to `packages/backend/convex/schema.ts`:
   - Add `teamTasks` table with indexes (shown above)
   - Run `npx -w packages/backend convex codegen` to generate types

2. **Create query** in `packages/backend/convex/models/teams.ts`:
   - Add `getTeamTasks` query using batch fetch pattern (shown above)
   - Test query returns enriched task data

3. **Create mutations** in `packages/backend/convex/models/teams.ts`:
   ```typescript
   export const createTask = mutation({
     args: {
       teamId: v.string(),
       organizationId: v.string(),
       title: v.string(),
       description: v.optional(v.string()),
       assigneeId: v.optional(v.string()),
       dueDate: v.optional(v.number()),
       priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
     },
     returns: v.id("teamTasks"),
     handler: async (ctx, args) => {
       const identity = await ctx.auth.getUserIdentity();
       if (!identity) throw new Error("Not authenticated");

       return await ctx.db.insert("teamTasks", {
         ...args,
         status: "open",
         createdBy: identity.subject,
         createdAt: Date.now(),
         updatedAt: Date.now(),
       });
     },
   });

   export const updateTask = mutation({
     args: {
       taskId: v.id("teamTasks"),
       title: v.optional(v.string()),
       description: v.optional(v.string()),
       assigneeId: v.optional(v.string()),
       dueDate: v.optional(v.number()),
       priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
       status: v.optional(v.union(v.literal("open"), v.literal("in-progress"), v.literal("done"))),
     },
     returns: v.null(),
     handler: async (ctx, args) => {
       const { taskId, ...updates } = args;
       await ctx.db.patch(taskId, {
         ...updates,
         updatedAt: Date.now(),
         ...(updates.status === "done" && { completedAt: Date.now() }),
       });
     },
   });

   export const deleteTask = mutation({
     args: { taskId: v.id("teamTasks") },
     returns: v.null(),
     handler: async (ctx, args) => {
       await ctx.db.delete(args.taskId);
     },
   });
   ```

#### Step 2: Frontend Components (3 hours)

1. **Copy `player-card.tsx` → `task-card.tsx`**:
   - Replace avatar logic with assignee avatar
   - Replace name with task title
   - Replace position with due date
   - Replace watermark with formatted due date
   - Replace health badges with priority + status + overdue badges
   - Replace Link with `onClick` to open modal

2. **Copy `player-filters.tsx` → `task-filters.tsx`**:
   - Status tabs: All, Open, In Progress, Done
   - Replace position dropdown with priority dropdown
   - Add assignee dropdown (fetch coach list)
   - Sort options: Due Date, Priority, Created Date

3. **Copy `players-tab.tsx` → `tasks-tab.tsx` (replace entire file)**:
   - Import `useQuery(api.models.teams.getTeamTasks, ...)`
   - Copy filter state management
   - Copy `useMemo` filtering logic (adapt for tasks)
   - Replace grid with `sm:grid-cols-2 lg:grid-cols-3` (3 cols max)
   - Add "+ Create Task" button (top right)
   - Replace empty states

4. **Create `create-task-modal.tsx`** (new file):
   - Form with: title (input), description (textarea), assignee (select), due date (date picker), priority (select)
   - Use `useMutation(api.models.teams.createTask)`
   - Validation: title required, max 100 chars
   - On success: close modal, show toast, refresh query

5. **Create `task-detail-modal.tsx`** (new file):
   - Display full task details
   - Actions: Edit (switch to edit mode), Complete (if open/in-progress), Delete (with confirmation)
   - Use `useMutation(api.models.teams.updateTask)` and `deleteTask`

#### Step 3: Testing (30 mins)
- Visual verification with dev-browser
- Test create task (all fields)
- Test filtering (status, priority, assignee)
- Test sorting
- Test complete task
- Test delete task
- Check mobile responsive layout

---

### US-P9-058: Insights Tab (4 hours)

#### Step 1: Backend (1.5 hours)

1. **Add schema** to `packages/backend/convex/schema.ts`:
   - Add `teamInsights` table with indexes (shown above)
   - Run codegen

2. **Create query** in `packages/backend/convex/models/teams.ts`:
   - Add `getTeamInsights` query with pagination (shown above)
   - Use batch fetch to enrich with voice note data and player names
   - Support filter by type

3. **Create mutations**:
   ```typescript
   export const createInsight = mutation({
     args: {
       teamId: v.string(),
       organizationId: v.string(),
       type: v.union(v.literal("voice-note"), v.literal("ai-generated"), v.literal("manual")),
       title: v.string(),
       summary: v.string(),
       fullText: v.optional(v.string()),
       voiceNoteId: v.optional(v.id("voiceNotes")),
       playerIds: v.optional(v.array(v.id("playerIdentities"))),
       topic: v.union(
         v.literal("technical"),
         v.literal("tactical"),
         v.literal("fitness"),
         v.literal("behavioral"),
         v.literal("other")
       ),
       priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
     },
     returns: v.id("teamInsights"),
     handler: async (ctx, args) => {
       const identity = await ctx.auth.getUserIdentity();
       if (!identity) throw new Error("Not authenticated");

       return await ctx.db.insert("teamInsights", {
         ...args,
         createdBy: identity.subject,
         createdAt: Date.now(),
       });
     },
   });

   export const markInsightAsRead = mutation({
     args: { insightId: v.id("teamInsights") },
     returns: v.null(),
     handler: async (ctx, args) => {
       const identity = await ctx.auth.getUserIdentity();
       if (!identity) throw new Error("Not authenticated");

       const insight = await ctx.db.get(args.insightId);
       if (!insight) return;

       const readBy = insight.readBy || [];
       if (!readBy.includes(identity.subject)) {
         await ctx.db.patch(args.insightId, {
           readBy: [...readBy, identity.subject],
         });
       }
     },
   });
   ```

4. **Create AI action** in `packages/backend/convex/actions/teamInsights.ts` (new file):
   ```typescript
   import { v } from "convex/values";
   import { action } from "../_generated/server";
   import { api } from "../_generated/api";

   export const generateInsightsFromVoiceNotes = action({
     args: { teamId: v.string(), organizationId: v.string() },
     returns: v.number(), // Count of insights generated
     handler: async (ctx, args) => {
       // Placeholder: In production, this would call OpenAI/Claude API
       // For now, just create 2-3 sample insights

       const sampleInsights = [
         {
           type: "ai-generated" as const,
           title: "Positive trend in technical skills",
           summary: "Analysis of recent voice notes shows consistent improvement in technical execution across the team.",
           topic: "technical" as const,
           priority: "medium" as const,
         },
         {
           type: "ai-generated" as const,
           title: "Communication improving during drills",
           summary: "Coaches note better verbal communication and on-field decision making in practice sessions.",
           topic: "behavioral" as const,
           priority: "low" as const,
         },
       ];

       let count = 0;
       for (const insight of sampleInsights) {
         await ctx.runMutation(api.models.teams.createInsight, {
           teamId: args.teamId,
           organizationId: args.organizationId,
           ...insight,
           fullText: insight.summary, // Expand in production
         });
         count++;
       }

       return count;
     },
   });
   ```

#### Step 2: Frontend Components (2 hours)

1. **Copy `activity-feed-view.tsx` → `insights-tab.tsx`** (replace entire file):
   - Import `useQuery(api.models.teams.getTeamInsights, ...)`
   - Copy pagination logic (state, useEffect, handleLoadMore)
   - Copy filter tabs pattern
   - Add player dropdown and topic dropdown
   - Replace activity cards with insight cards
   - Add "Generate Insights" button (top right)

2. **Create `insight-card.tsx`** (new file):
   - Copy activity feed card structure
   - Avatar: Creator avatar + initials
   - Icon: Type icon (Mic for voice-note, Sparkles for AI, FileText for manual)
   - Title: Insight title (bold)
   - Summary: 2-3 lines, truncated
   - Badges: Topic, Priority (high only), Player badges
   - Timestamp: Relative time
   - Click: Open detail modal

3. **Create `insight-filters.tsx`** (new file):
   - Type tabs: All, Voice Notes, AI Insights, Manual
   - Player dropdown: All + player list
   - Topic dropdown: All + topics
   - Sort: Newest, Oldest, Priority

4. **Create `insight-detail-modal.tsx`** (new file):
   - Display full insight text
   - Show voice note link if applicable
   - Show related players
   - "Mark as Read" button
   - Close button

#### Step 3: Testing (30 mins)
- Visual verification
- Test "Generate Insights" button (creates 2-3 sample insights)
- Test pagination (Load More)
- Test filtering (type, player, topic)
- Test detail modal
- Check mobile layout

---

## Critical Lessons from Phase 3

### ✅ What Worked Well

1. **Copying patterns saves time**: Players Tab took 3h because we copied filter/card patterns
2. **Batch fetch prevents performance issues**: Always use Map lookup, never N+1 queries
3. **Composite indexes are mandatory**: Use `by_team_and_status`, not `by_team` + filter
4. **useMemo for filtering**: Client-side filtering is fine for <100 items
5. **Empty states improve UX**: Always show helpful empty states with CTAs

### ❌ Mistakes to Avoid

1. **Don't put arrays in useEffect deps**: Use `.length` or primitive values
2. **Don't put functions in useEffect deps**: Use data dependencies instead
3. **Don't use v.id() for Better Auth IDs**: Always use v.string()
4. **Don't filter after withIndex**: Use composite index instead
5. **Don't skip visual verification**: Always test with dev-browser

---

## Quality Checklist

Before committing Phase 4:

- [ ] Both schemas added with correct indexes
- [ ] All queries use composite indexes (no .filter() after .withIndex())
- [ ] All queries use batch fetch pattern (no N+1)
- [ ] All mutations have auth checks
- [ ] All functions have args and returns validators
- [ ] Tasks Tab shows real data from backend
- [ ] Task filtering works (status, priority, assignee, sort)
- [ ] Create task modal works (validation, assignee select)
- [ ] Complete task updates status correctly
- [ ] Insights Tab shows real data with pagination
- [ ] Load More button works
- [ ] Insight filtering works (type, player, topic)
- [ ] Generate Insights creates sample data
- [ ] Insight detail modal shows full text
- [ ] Empty states present for both tabs
- [ ] Loading states (skeletons) present
- [ ] Mobile responsive (test on small screen)
- [ ] Type check passes: `npm run check-types`
- [ ] Lint passes: `npx ultracite check`
- [ ] Visual verification: `dev-browser` on localhost:3000

---

## Success Criteria

Phase 4 is complete when:

1. **Tasks Tab functional**:
   - Shows task grid with filters
   - Create task works
   - Complete task works
   - Click task opens detail modal

2. **Insights Tab functional**:
   - Shows paginated insights
   - Generate Insights creates sample data
   - Load More pagination works
   - Click insight opens detail modal

3. **All quality checks pass**:
   - No TypeScript errors
   - No lint errors
   - Mobile responsive
   - Empty/loading states present

4. **Ready for PR**:
   - Commit message: `feat: Phase 9 Week 4 Phase 4 - Tasks + Insights Tabs`
   - All files added to git
   - Clean git diff (no unrelated changes)

---

## Files You'll Create/Modify

### Backend
- `packages/backend/convex/schema.ts` (modify - add 2 tables)
- `packages/backend/convex/models/teams.ts` (modify - add 2 queries + 4 mutations)
- `packages/backend/convex/actions/teamInsights.ts` (create - AI action)

### Frontend
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/tasks-tab.tsx` (replace)
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/task-card.tsx` (create)
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/task-filters.tsx` (create)
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/create-task-modal.tsx` (create)
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/task-detail-modal.tsx` (create)
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/insights-tab.tsx` (replace)
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/insight-card.tsx` (create)
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/insight-filters.tsx` (create)
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/insight-detail-modal.tsx` (create)

**Total**: 3 backend files, 9 frontend files

---

**Ready to start Phase 4!** Begin with US-P9-057 (Tasks Tab), then US-P9-058 (Insights Tab).

Remember: **Copy, don't create**. Every component has a template from Phases 1-3.
