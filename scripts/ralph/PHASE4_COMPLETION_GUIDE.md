# Phase 4 Completion Guide for Ralph

**Date**: February 3, 2026
**Branch**: ralph/p9-week4-team-hub
**Status**: 1 of 4 stories complete, 3 remaining

---

## ✅ Completed: US-P9-057 (Tasks Tab)

**Completion Date**: February 3, 2026
**Commits**: 160c45fd, 405f144e, d6ed8973, bef9c9a5, 796070bc, ebc527a3, 1153f5ac

### Key Deliverables:
- ✅ Schema: Added `status` field to coachTasks table
- ✅ Backend: getCoachesForTeam, getTeamTasks queries created
- ✅ Backend: createTask/updateTask/deleteTask mutations with activity feed integration
- ✅ Frontend: Full Tasks Tab with filters, cards, modals
- ✅ Integrations: Activity Feed events, Overview Dashboard (Open Tasks stat)
- ✅ Documentation: `.ruler/better-auth-patterns.md` created
- ✅ Bug Fixes: Better Auth user.name pattern corrected
- ✅ Testing: Manual browser testing complete

### Critical Learnings:
1. **Better Auth Fields**: Always use `user._id` (not `user.id`) and `user.name` (not `firstName/lastName`)
2. **Map Lookups**: `userMap.set(user._id, user)` is the correct pattern
3. **Display Names**: Use `user.name || user.email || "Unknown"` pattern
4. **Documentation**: See `.ruler/better-auth-patterns.md` for all patterns

---

## 🎯 Next: US-P9-058 (Insights Tab) - 5 hours

### Overview
Create an AI-generated insights tab showing team trends, patterns, and recommendations. Similar to Tasks Tab in structure, but with AI-generated content from voice notes and team data.

### Critical Requirements

#### 1. Schema (0.5h)
**File**: `packages/backend/convex/schema.ts`

Create NEW table `teamInsights`:
```typescript
teamInsights: defineTable({
  organizationId: v.string(),
  teamId: v.string(),
  title: v.string(),
  description: v.string(),
  category: v.union(
    v.literal("performance"),
    v.literal("attendance"),
    v.literal("development"),
    v.literal("health"),
    v.literal("engagement")
  ),
  priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  status: v.union(v.literal("new"), v.literal("viewed"), v.literal("dismissed")),
  sourceType: v.union(
    v.literal("voice_note"),
    v.literal("assessment"),
    v.literal("attendance"),
    v.literal("system")
  ),
  sourceId: v.optional(v.string()), // voice note ID, assessment ID, etc
  voiceNoteId: v.optional(v.id("voiceNotes")),
  metadata: v.optional(v.any()),
  generatedAt: v.number(),
  viewedAt: v.optional(v.number()),
})
  .index("by_team_and_org", ["teamId", "organizationId"])
  .index("by_org_and_status", ["organizationId", "status"])
  .index("by_voice_note", ["voiceNoteId"])
```

**Activity Feed Integration**:
- Extend `teamActivityFeed.actionType` enum: Add `v.literal("insight_generated")`
- Extend `teamActivityFeed.entityType` enum: Add `v.literal("insight")`

#### 2. Backend Queries (2h)
**File**: `packages/backend/convex/models/teams.ts`

**Query: getTeamInsights**
```typescript
export const getTeamInsights = query({
  args: {
    teamId: v.string(),
    organizationId: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    includeViewed: v.optional(v.boolean()),
  },
  returns: v.object({
    insights: v.array(insightReturnValidator),
    nextCursor: v.union(v.string(), v.null()),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Use cursor-based pagination (copy from activity-feed-view.tsx pattern)
    // Filter by status if includeViewed is false
    // Return insights with voice note metadata if voiceNoteId exists
  },
});
```

**Mutation: createInsight** (in `models/teamInsights.ts`):
- Create insight record
- Create activity feed entry with `actionType: "insight_generated"`

**Mutation: dismissInsight**:
- Update status to "dismissed"
- Update viewedAt timestamp

**Mutation: markInsightViewed**:
- Update status to "viewed"
- Update viewedAt timestamp

#### 3. Overview Dashboard Integration (0.5h)
**File**: `packages/backend/convex/models/teams.ts`

Enhance `getTeamOverviewStats` return type:
```typescript
returns: v.object({
  // ... existing fields
  unreadInsights: v.number(),
  highPriorityInsights: v.number(),
}),
```

Query logic:
- `unreadInsights`: Count insights with `status === 'new'`
- `highPriorityInsights`: Count insights with `priority === 'high' && status === 'new'`

**Update Quick Stats Panel**:
- File: `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/quick-stats-panel.tsx`
- Replace "Upcoming Events" card → "Unread Insights" card
- Show `stats.unreadInsights` count
- Subtitle: `stats.highPriorityInsights > 0 ? "${highPriorityInsights} high priority" : undefined`
- Icon: `Lightbulb` (import from lucide-react)
- Colors: `text-purple-500`, `bg-purple-500/10`
- Click: Navigate to Insights tab with "new" filter

#### 4. Frontend Components (2h)

**Component Structure** (copy from Tasks Tab):
```
apps/web/src/app/orgs/[orgId]/coach/team-hub/components/
├── insights-tab.tsx          # Main tab component
├── insight-card.tsx          # Individual insight card
├── insight-filters.tsx       # Filter controls
├── insight-detail-modal.tsx  # Detail view modal
└── create-insight-modal.tsx  # Manual insight creation (optional)
```

**insights-tab.tsx** (copy structure from tasks-tab.tsx):
- Use cursor-based pagination (copy from activity-feed-view.tsx lines 60-90)
- Load 50 insights per page
- Filter controls: Status (All/New/Viewed), Category (All/Performance/Attendance/etc), Priority, Sort
- Grid layout: 1 col mobile, 2 cols tablet, 3 cols desktop
- Empty states: "No insights generated", "No insights match filters"
- Loading state: Skeleton grid (6 cards)

**insight-card.tsx** (copy structure from task-card.tsx):
- Show: Category icon, Title, Description (truncated), Priority badge, Status badge
- Voice note badge: Show microphone icon if voiceNoteId exists (click → open voice note modal)
- Watermark: Generated date (relative time) in large text on right
- Click card: Open detail modal, auto-mark as "viewed"

**insight-filters.tsx** (copy from task-filters.tsx):
- Status tabs: All, New, Viewed
- Category dropdown: All, Performance, Attendance, Development, Health, Engagement
- Priority dropdown: All, High, Medium, Low
- Sort dropdown: Generated Date, Priority, Category
- Search input (searches title + description)

**insight-detail-modal.tsx**:
- Show full insight details
- Action buttons: Dismiss, View Voice Note (if voiceNoteId)
- Metadata section (source info)
- Auto-mark as "viewed" on open

#### 5. Voice Notes Badge (Optional Enhancement)
**File**: `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/voice-notes-tab.tsx`

Add insights badge to voice note cards:
- Query: Count insights where `voiceNoteId === note._id && status === 'new'`
- Badge: Show count of unread insights generated from this voice note
- Color: Purple badge (matches Insights tab theme)

---

## 🎯 Remaining Stories After US-P9-058

### US-P9-NAV: Navigation Integration (0.5h)
**Files**:
- `apps/web/src/app/orgs/[orgId]/coach/components/coach-sidebar.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/components/bottom-nav.tsx`

**Changes**:
1. Sidebar: Add "Team Hub" link in Development section (after "Team Insights")
2. Bottom Nav: Update to 5 items:
   - Overview (Home icon)
   - Players (Users icon)
   - Voice (Mic icon, **highlight: true**)
   - Hub (LayoutGrid icon)
   - Tasks (CheckSquare icon)

### US-P9-041: Tone Controls for Parent Summaries (2h)
**Backend**:
- Extend `coachOrgPreferences` schema: Add `parentSummaryTone: v.optional(v.union('warm', 'professional', 'brief'))`
- Create mutation: `updateParentSummaryTone`

**Frontend**:
- Add tone dropdown to coach preferences/settings page
- Add live preview card showing examples:
  - Warm: "Great news! Emma's tackling skills have really improved..."
  - Professional: "Emma's tackling rating has improved from 3/5 to 4/5..."
  - Brief: "Emma: Tackling 3/5 → 4/5. Good progress."

---

## ✅ Success Criteria for Phase 4 Completion

### Technical
- [ ] All 4 stories marked `passes: true` in prd.json
- [ ] Type check passes: `npm run check-types` (zero errors)
- [ ] Lint passes: `npx ultracite fix` (zero errors)
- [ ] All commits have Co-Authored-By: Claude Sonnet 4.5
- [ ] No console errors in browser
- [ ] Mobile responsive (test at 375px, 768px, 1024px widths)

### Functional
- [ ] Tasks Tab: Create, update, delete, filter, sort all working
- [ ] Insights Tab: Display, pagination, filters, dismiss all working
- [ ] Activity Feed: Shows task_created, insight_generated events
- [ ] Overview Dashboard: Shows Open Tasks, Unread Insights stats
- [ ] Navigation: Team Hub accessible from sidebar and bottom nav
- [ ] Tone Controls: Dropdown works, preview updates, save persists

### Integration
- [ ] Voice Notes → Tasks: voiceNoteId badge shows and links correctly
- [ ] Voice Notes → Insights: voiceNoteId badge shows and links correctly
- [ ] Quick Stats → Tabs: Clicking stats navigates to correct filtered tab
- [ ] Activity Feed → Entities: Clicking events navigates to correct entity

### Documentation
- [ ] All stories added to `.tested-stories`
- [ ] All stories added to `.audited-stories`
- [ ] All stories added to `.documented-stories`
- [ ] progress.txt updated with Phase 4 complete
- [ ] Any new patterns documented (like Better Auth patterns were)

---

## 🚨 Critical Patterns to Follow

### 1. Better Auth User Data
**Always use these patterns** (see `.ruler/better-auth-patterns.md`):
- Field: `user._id` (NOT `user.id`)
- Field: `user.name` (NOT `user.firstName/lastName`)
- Map: `userMap.set(user._id, user)`
- Display: `user.name || user.email || "Unknown"`

### 2. Composite Indexes
**Never use .filter() after .withIndex()**:
```typescript
// ✅ GOOD
const items = await ctx.db
  .query("table")
  .withIndex("by_team_and_org", q =>
    q.eq("teamId", teamId).eq("organizationId", orgId)
  )
  .collect();

// ❌ BAD
const items = await ctx.db
  .query("table")
  .withIndex("by_org", q => q.eq("organizationId", orgId))
  .filter(q => q.eq(q.field("teamId"), teamId))
  .collect();
```

### 3. Batch Fetch Pattern
**Always batch fetch, never N+1 queries**:
```typescript
// Step 1: Collect unique IDs
const uniqueIds = [...new Set(items.map(item => item.userId))];

// Step 2: Batch fetch
const usersData = await Promise.all(
  uniqueIds.map(id => ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", value: id, operator: "eq" }],
  }))
);

// Step 3: Create Map
const userMap = new Map();
for (const user of usersData) {
  if (user) userMap.set(user._id, user);
}

// Step 4: Enrich (synchronous, no await!)
const enriched = items.map(item => ({
  ...item,
  user: userMap.get(item.userId),
}));
```

### 4. Activity Feed Integration
**After every create/update/delete mutation**:
```typescript
await ctx.db.insert("teamActivityFeed", {
  organizationId: args.organizationId,
  teamId: args.teamId,
  actorId: args.userId,
  actorName: args.userName,
  actionType: "insight_generated", // or task_created, etc
  entityType: "insight", // or task, etc
  entityId: insightId,
  summary: `Generated insight: ${title}`,
  priority: priority === "high" ? "important" : "normal",
  metadata: { /* optional metadata */ },
});
```

### 5. Cursor-Based Pagination
**Copy from activity-feed-view.tsx (lines 60-90)**:
- Use `paginate()` with limit and cursor
- Return `{ items, nextCursor, hasMore }`
- UI: "Load More" button at bottom (not traditional pagination buttons)

---

## 📊 Progress Tracking Commands

```bash
# Check type errors
npm run check-types

# Check lint errors
npx ultracite fix

# View recent commits
git log --oneline -20

# View story progress
cat scripts/ralph/progress.txt

# View agent tracking
cat scripts/ralph/agents/output/.tested-stories
cat scripts/ralph/agents/output/.audited-stories
cat scripts/ralph/agents/output/.documented-stories
```

---

## 🎉 Final Delivery Checklist

Before marking Phase 4 complete:

1. **Code Quality**
   - [ ] All type checks pass
   - [ ] All lint checks pass
   - [ ] No console errors or warnings

2. **Testing**
   - [ ] Manual browser testing complete for all stories
   - [ ] All acceptance criteria verified
   - [ ] Mobile responsive verified

3. **Documentation**
   - [ ] All tracking files updated
   - [ ] progress.txt shows Phase 4 complete
   - [ ] Any new patterns documented

4. **Git**
   - [ ] All changes committed
   - [ ] Commit messages follow convention
   - [ ] Branch ready for PR/merge

5. **Integration**
   - [ ] All features work together correctly
   - [ ] No regressions in existing features
   - [ ] Navigation flows make sense

---

**Estimated Total Remaining**: 7.5 hours (3 stories)
**Target Completion**: February 3-4, 2026

**Ralph**: Focus on US-P9-058 (Insights Tab) next. Copy patterns from US-P9-057 (Tasks Tab). Use cursor-based pagination. Follow Better Auth patterns. Create activity feed entries. Update Overview Dashboard. Good luck! 🚀
