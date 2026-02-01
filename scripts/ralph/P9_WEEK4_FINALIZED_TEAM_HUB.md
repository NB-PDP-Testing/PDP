# Phase 9 Week 4: Team Hub - FINALIZED PLAN
**Date:** 2026-02-01
**Status:** Ready for Implementation
**Scope:** 11 Stories, ~34 Hours (4-5 days)

---

## 🎯 Vision (User Requirements)

Based on user input:

1. ✅ **Cockpit Overview** - Dashboard showing key stats and activity at a glance
2. ✅ **Rich Collaboration** - Share notes, vote on ideas/goals, view insights, manage tasks together
3. ✅ **Health Widget** - Dedicated widget for injury/medical visibility
4. ✅ **Voice Notes Integration** - All three: activity feed + player-linked + session-linked
5. ✅ **Planning Tab** - Simple list with season key milestones
6. ✅ **Mobile-First** - Same rich functionality on desktop (no compromises)
7. ✅ **Performance** - Paginate at 50 items (recommended)
8. ✅ **Fixed Layout** - MVP with consistent experience for all coaches

---

## 📋 Story List

### Core Team Hub (Tier 1)
1. **US-P9-052:** Overview Dashboard (Cockpit View)
2. **US-P9-053:** Players Tab with Health Badges
3. **US-P9-056:** Recent Activity Feed (All Team Activity)
4. **US-P9-055:** Health & Safety Widget
5. **US-P9-063:** Mobile-First Responsive Layout

### Collaboration Features (Tier 2)
6. **US-P9-060:** Team Decision Voting (Vote on Ideas)
7. **US-P9-059:** Coach Tasks Management (Manage Tasks Together)
8. **US-P9-061:** Voice Notes Integration (Share Notes)
9. **US-P9-064:** Shared Insights View (View Fellow Coaches' Insights)

### Planning & Navigation (Tier 3)
10. **US-P9-054:** Planning Tab (Simple List + Season Milestones)
11. **US-P9-057:** Quick Actions Menu

---

## 📖 Detailed Specifications

### US-P9-052: Overview Dashboard (Cockpit View)
**Priority:** P0 (Must Have)
**Estimate:** 4 hours

**Description:**
Create a cockpit-style overview dashboard that shows key team information at a glance. Mobile-first design with same rich functionality on desktop.

**Acceptance Criteria:**
- [ ] Route created: `/orgs/[orgId]/coach/teams/[teamId]` (defaults to Overview tab)
- [ ] **Quick Stats Panel:**
  - Total roster size (active players)
  - Attendance % (last 4 weeks average)
  - Active injuries count (with severity breakdown)
  - Upcoming events count (next 7 days)
- [ ] **Upcoming Events Widget:**
  - Next 3 session plans or games
  - Date, time, location
  - Click to navigate to session plan detail
- [ ] **Health & Safety Widget:** (from US-P9-055)
  - Active injuries list (max 5, "View All" link if more)
  - Severity badges (minor/moderate/severe)
- [ ] **Recent Activity Feed:** (from US-P9-056)
  - Last 20 items, paginated at 50
  - Filter by type (notes, goals, decisions, injuries)
  - Real-time updates via Convex subscription
- [ ] Mobile-first responsive (drawer navigation, touch-friendly)
- [ ] Desktop shows 2-column layout (stats + activity side-by-side)
- [ ] Loading states (skeleton loaders)
- [ ] Empty states (new team, no activity)

**Backend Functions:**
```typescript
// NEW
export const getTeamOverviewStats = query({
  args: { teamId: v.id("team") },
  returns: v.object({
    totalPlayers: v.number(),
    activeInjuries: v.number(),
    attendancePercent: v.number(),
    upcomingEventsCount: v.number(),
  }),
  handler: async (ctx, args) => { /* ... */ }
});

// EXISTING (reuse)
// teamCollaboration.getTeamActivityFeed - activity feed
// sessionPlans.listByTeam - upcoming sessions
// injuries.listByOrg - health widget
```

**UI Components:**
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/page.tsx` (main)
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/overview-tab.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/quick-stats-panel.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/upcoming-events-widget.tsx`

**Dependencies:**
- US-P9-055 (Health Widget)
- US-P9-056 (Activity Feed)

---

### US-P9-053: Players Tab with Health Badges
**Priority:** P0 (Must Have)
**Estimate:** 3 hours

**Description:**
Display team roster in grid layout with health status badges. Mobile-first card layout, desktop grid.

**Acceptance Criteria:**
- [ ] Player grid layout (mobile: 1 column, tablet: 2 columns, desktop: 3-4 columns)
- [ ] **Player Cards:**
  - Player photo (fallback to initials)
  - Full name
  - Jersey number
  - Position
  - Health badge (🟢 healthy, 🟡 recovering, 🔴 injured)
  - Age group (if playing up/down, show badge)
- [ ] **Filter Controls:**
  - All / Active / Injured / On Break
  - Position filter (dropdown)
  - Search by name
- [ ] Click player card → navigate to Player Passport
- [ ] Touch-friendly cards (min 44px tap target)
- [ ] Loading state (skeleton grid)
- [ ] Empty state (no players, filtered view empty)
- [ ] Sort options: Name (A-Z), Jersey #, Position

**Backend Functions:**
```typescript
// EXISTING (reuse)
// teams.getTeamWithDetails - gets players with enrichment
// injuries.listByOrg - filter to get player injury status

// NEW (if needed for performance)
export const getTeamPlayersWithHealth = query({
  args: { teamId: v.id("team") },
  returns: v.array(v.object({
    playerId: v.id("orgPlayerEnrollments"),
    fullName: v.string(),
    jerseyNumber: v.optional(v.string()),
    position: v.optional(v.string()),
    healthStatus: v.union(
      v.literal("healthy"),
      v.literal("recovering"),
      v.literal("injured")
    ),
    isPlayingUp: v.boolean(),
    photoUrl: v.optional(v.string()),
  })),
  handler: async (ctx, args) => { /* Batch fetch pattern */ }
});
```

**UI Components:**
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/players-tab.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/player-card.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/player-filters.tsx`

**Dependencies:**
- None (can build independently)

---

### US-P9-056: Recent Activity Feed (All Team Activity)
**Priority:** P0 (Must Have)
**Estimate:** 4 hours

**Description:**
Chronological feed of all team activity (voice notes, goals, decisions, injuries, assessments). Real-time updates with filtering.

**Acceptance Criteria:**
- [ ] Activity feed showing last 20 items by default
- [ ] Pagination: "Load More" button at 50 items
- [ ] **Activity Types:**
  - Voice note added (with AI summary)
  - Insight applied/dismissed
  - Goal created/updated
  - Injury logged/updated
  - Decision created/voted
  - Assessment completed
  - Comment added (on any entity)
- [ ] **Each Activity Item Shows:**
  - Coach avatar + name
  - Action description ("added a voice note about passing drills")
  - Timestamp (relative: "2 hours ago")
  - Click to navigate to detail view
- [ ] **Filter Controls:**
  - All / Notes / Goals / Decisions / Health / Assessments
  - Date range picker (Last 7 days / 30 days / All time)
- [ ] Real-time updates (new items appear with slide-in animation)
- [ ] Empty state ("No activity yet - start by adding a voice note!")
- [ ] Loading state (skeleton list)
- [ ] Mobile: Stacked cards, desktop: 2-column grid

**Backend Functions:**
```typescript
// EXISTING (enhance)
export const getTeamActivityFeed = query({
  args: {
    teamId: v.id("team"),
    filters: v.optional(v.object({
      types: v.optional(v.array(v.string())),
      dateRange: v.optional(v.object({
        start: v.number(),
        end: v.number(),
      })),
    })),
    paginationOpts: v.object({
      cursor: v.union(v.string(), v.null()),
      numItems: v.number(),
    }),
  },
  returns: v.object({
    page: v.array(v.object({ /* activity item */ })),
    continueCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => { /* Already exists, enhance with filters */ }
});
```

**UI Components:**
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/activity-feed.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/activity-item.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/activity-filters.tsx`

**Dependencies:**
- Reuse existing `activity-feed-view.tsx` patterns from voice notes

---

### US-P9-055: Health & Safety Widget
**Priority:** P0 (Must Have)
**Estimate:** 2 hours

**Description:**
Dedicated widget showing active injuries and medical alerts. Prominent placement in Overview dashboard.

**Acceptance Criteria:**
- [ ] **Active Injuries List:**
  - Player name
  - Injury type (e.g., "Ankle Sprain")
  - Severity badge (🔴 Severe, 🟡 Moderate, 🟢 Minor)
  - Days since injury
  - Return-to-play status (Out / Limited / Cleared)
- [ ] Show max 5 injuries, "View All (X)" link if more
- [ ] Click injury → navigate to injury detail
- [ ] Empty state ("No active injuries - great job keeping the team healthy!")
- [ ] **Medical Alerts:**
  - Count of players with allergy alerts
  - Count of players with medication requirements
  - Click to view medical profiles
- [ ] Widget expandable on mobile (accordion style)
- [ ] Desktop: Always expanded card

**Backend Functions:**
```typescript
// EXISTING (reuse)
// injuries.listByOrg - filter by teamId and status: "active"

// NEW (if needed)
export const getTeamHealthSummary = query({
  args: { teamId: v.id("team") },
  returns: v.object({
    activeInjuries: v.array(v.object({
      playerId: v.id("orgPlayerEnrollments"),
      playerName: v.string(),
      injuryType: v.string(),
      severity: v.union(v.literal("minor"), v.literal("moderate"), v.literal("severe")),
      daysSinceInjury: v.number(),
      status: v.string(),
    })),
    allergyAlerts: v.number(),
    medicationAlerts: v.number(),
  }),
  handler: async (ctx, args) => { /* ... */ }
});
```

**UI Components:**
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/health-safety-widget.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/injury-card.tsx`

**Dependencies:**
- None (can build independently)

---

### US-P9-063: Mobile-First Responsive Layout
**Priority:** P0 (Must Have)
**Estimate:** 3 hours

**Description:**
Mobile-first responsive layout with drawer navigation, touch-friendly interactions, same rich functionality on desktop.

**Acceptance Criteria:**
- [ ] **Mobile (<768px):**
  - Hamburger menu for tab navigation (Overview, Players, Planning)
  - Drawer opens from left with smooth animation
  - Touch-friendly buttons (min 44px tap targets)
  - Single-column layout for all widgets
  - Bottom sheet for filters (slide up from bottom)
- [ ] **Tablet (768px - 1024px):**
  - Tab bar at top (horizontal tabs)
  - 2-column grid for Overview widgets
  - Player cards: 2 columns
- [ ] **Desktop (>1024px):**
  - Side navigation (persistent, left sidebar)
  - 3-column grid for Overview stats
  - Player cards: 3-4 columns
  - Activity feed: 2-column masonry layout
- [ ] All interactions work on touch and mouse
- [ ] Swipe gestures on mobile (swipe activity items for quick actions)
- [ ] No horizontal scrolling at any breakpoint
- [ ] Font sizes scale appropriately (16px min on mobile)
- [ ] Images lazy-load with blur-up placeholders

**Backend Functions:**
- None (frontend only)

**UI Components:**
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/layout.tsx` (responsive shell)
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/mobile-drawer.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/tab-navigation.tsx`

**Dependencies:**
- All other stories (layout wraps content)

---

### US-P9-060: Team Decision Voting (Vote on Ideas)
**Priority:** P1 (Should Have)
**Estimate:** 3 hours

**Description:**
Display team decisions in activity feed with inline voting UI. Real-time vote count updates.

**Acceptance Criteria:**
- [ ] **Decision Card in Activity Feed:**
  - Decision title + description
  - Created by (coach avatar + name)
  - Vote options (e.g., "Approve" / "Reject" or custom options)
  - Vote count per option (real-time updates)
  - User's vote highlighted
  - Finalized decisions show outcome badge
- [ ] **Inline Voting:**
  - Click vote button → optimistic update
  - Undo vote (click again to toggle)
  - Can't vote on finalized decisions
- [ ] **Vote Counts:**
  - Show X/Y coaches voted (e.g., "3/5 coaches voted")
  - Show vote distribution (progress bars)
- [ ] Click decision → navigate to full decision detail
- [ ] Empty state ("No decisions yet - create one to get team input")
- [ ] Mobile: Stacked vote buttons, desktop: Horizontal

**Backend Functions:**
```typescript
// EXISTING (from US-P9-025)
// teamDecisions.create
// teamDecisions.vote
// teamDecisions.listByTeam

// ENHANCE (add to activity feed return type)
// teamCollaboration.getTeamActivityFeed - include decision items
```

**UI Components:**
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/decision-card.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/vote-buttons.tsx`

**Dependencies:**
- US-P9-056 (Activity Feed)

---

### US-P9-059: Coach Tasks Management (Manage Tasks Together)
**Priority:** P1 (Should Have)
**Estimate:** 3 hours

**Description:**
Create and manage coach tasks from Team Hub. Assign to specific coaches, mark complete, view task list.

**Acceptance Criteria:**
- [ ] **Quick Actions Menu:** "Create Task" button in header
- [ ] **Task Creation Modal:**
  - Task title (required)
  - Description (optional, markdown support)
  - Assign to coach (dropdown, multi-select)
  - Due date (date picker)
  - Priority (High / Medium / Low)
- [ ] **Task List Widget (in Overview):**
  - Show incomplete tasks only (max 5)
  - Task title, assignee avatar, due date
  - Checkbox to mark complete (inline)
  - Overdue tasks highlighted (red text)
  - "View All Tasks" link (navigate to dedicated tasks page later)
- [ ] **Task Items in Activity Feed:**
  - Show when task created/completed
  - Click to view task detail (modal)
- [ ] Optimistic updates (mark complete → instant UI update)
- [ ] Real-time updates (other coaches see task completion)
- [ ] Empty state ("No tasks - click + to create one")

**Backend Functions:**
```typescript
// NEW
export const createCoachTask = mutation({
  args: {
    teamId: v.id("team"),
    title: v.string(),
    description: v.optional(v.string()),
    assignedTo: v.array(v.string()), // user IDs
    dueDate: v.optional(v.number()),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  },
  returns: v.id("coachTasks"),
  handler: async (ctx, args) => { /* ... */ }
});

export const completeCoachTask = mutation({
  args: { taskId: v.id("coachTasks") },
  returns: v.null(),
  handler: async (ctx, args) => { /* ... */ }
});

export const getTeamTasks = query({
  args: {
    teamId: v.id("team"),
    filters: v.optional(v.object({
      status: v.optional(v.union(v.literal("incomplete"), v.literal("complete"))),
      assignedTo: v.optional(v.string()),
    })),
  },
  returns: v.array(v.object({ /* task */ })),
  handler: async (ctx, args) => { /* ... */ }
});
```

**Schema Addition:**
```typescript
// packages/backend/convex/schema.ts
coachTasks: defineTable({
  teamId: v.id("team"),
  organizationId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  assignedTo: v.array(v.string()), // user IDs
  createdBy: v.string(), // user ID
  dueDate: v.optional(v.number()),
  priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  status: v.union(v.literal("incomplete"), v.literal("complete")),
  completedAt: v.optional(v.number()),
  completedBy: v.optional(v.string()),
})
  .index("by_team", ["teamId"])
  .index("by_team_and_status", ["teamId", "status"])
  .index("by_assignee", ["assignedTo"]),
```

**UI Components:**
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/task-list-widget.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/task-creation-modal.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/task-item.tsx`

**Dependencies:**
- US-P9-057 (Quick Actions Menu)

---

### US-P9-061: Voice Notes Integration (Share Notes)
**Priority:** P1 (Should Have)
**Estimate:** 3 hours

**Description:**
Integrate voice notes in all three ways: activity feed, player-linked, session-linked.

**Acceptance Criteria:**
- [ ] **Activity Feed Integration:**
  - Voice note items show in activity feed
  - Display: Coach avatar, "added a voice note", AI summary (first 100 chars)
  - Click → navigate to full voice note detail
  - Show insight count badge (e.g., "3 insights")
- [ ] **Player-Linked Notes:**
  - Player card shows note count badge (e.g., "5 notes")
  - Click player → Player Passport → Voice Notes tab pre-filtered to that player
- [ ] **Session-Linked Notes:**
  - Planning tab: Each session plan shows linked notes count
  - Click session → Session Plan detail → "Related Notes" section
  - Can link existing note to session (dropdown selector)
  - Can create new note linked to session (quick create)
- [ ] Real-time updates (new notes appear in all three places)
- [ ] Empty state for each integration point

**Backend Functions:**
```typescript
// EXISTING (reuse)
// voiceNotes.listByOrg - already exists
// teamCollaboration.getTeamActivityFeed - already includes notes

// NEW (for session linking)
export const linkVoiceNoteToSession = mutation({
  args: {
    noteId: v.id("voiceNotes"),
    sessionId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Add sessionId to voiceNotes table (optional field)
    await ctx.db.patch(args.noteId, { sessionId: args.sessionId });
  }
});

export const getSessionLinkedNotes = query({
  args: { sessionId: v.id("sessionPlans") },
  returns: v.array(v.object({ /* note summary */ })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("voiceNotes")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  }
});
```

**Schema Update:**
```typescript
// Add optional sessionId to voiceNotes table
voiceNotes: defineTable({
  // ... existing fields
  sessionId: v.optional(v.id("sessionPlans")), // NEW
})
  .index("by_session", ["sessionId"]), // NEW
```

**UI Components:**
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/voice-note-activity-item.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/session-linked-notes.tsx`
- Reuse existing `player-card.tsx` (add notes badge)

**Dependencies:**
- US-P9-056 (Activity Feed)
- US-P9-053 (Player Cards)
- US-P9-054 (Planning Tab)

---

### US-P9-064: Shared Insights View (View Fellow Coaches' Insights)
**Priority:** P1 (Should Have)
**Estimate:** 3 hours

**Description:**
Display insights from all team coaches in a shared view. Show who applied, who dismissed, consensus view.

**Acceptance Criteria:**
- [ ] **Team Insights Tab:**
  - New tab in Team Hub: "Insights"
  - Shows all insights from team voice notes (not just current user's)
  - Filter by status: Pending / Applied / Dismissed
  - Filter by coach (who created the insight)
  - Filter by category (injury, skill, tactical, etc.)
- [ ] **Insight Card Shows:**
  - Insight title + description
  - Coach who created (avatar + name)
  - Applied by (list of coach avatars if multiple coaches applied)
  - Status badge (Pending / Applied by 3 coaches / Dismissed)
  - Comment count
  - Click → full insight detail with comments
- [ ] **Consensus Indicators:**
  - If 2+ coaches applied same insight → "Team consensus" badge
  - If 1 coach applied, others dismissed → "Mixed feedback" badge
- [ ] Board view option (Kanban: Pending | Applied | Dismissed columns)
- [ ] List view option (default)
- [ ] Empty state ("No insights yet - add voice notes to generate insights")
- [ ] Mobile: Swipeable insight cards (apply/dismiss gestures)

**Backend Functions:**
```typescript
// NEW
export const getTeamInsights = query({
  args: {
    teamId: v.id("team"),
    filters: v.optional(v.object({
      status: v.optional(v.array(v.string())),
      coachId: v.optional(v.string()),
      category: v.optional(v.string()),
    })),
  },
  returns: v.array(v.object({
    insightId: v.id("voiceNoteInsights"),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    createdBy: v.object({ id: v.string(), name: v.string() }),
    appliedBy: v.array(v.object({ id: v.string(), name: v.string() })),
    dismissedBy: v.array(v.object({ id: v.string(), name: v.string() })),
    status: v.string(),
    commentCount: v.number(),
  })),
  handler: async (ctx, args) => {
    // Get all voice notes for team
    // Extract insights from each note
    // Enrich with coach info (batch fetch pattern)
    // Calculate consensus
  }
});
```

**UI Components:**
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/insights-tab.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/team-insight-card.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/insights-board-view.tsx`
- Reuse `SwipeableInsightCard` from Week 3

**Dependencies:**
- US-P9-063 (Mobile responsive layout)

---

### US-P9-054: Planning Tab (Simple List + Season Milestones)
**Priority:** P1 (Should Have)
**Estimate:** 3 hours

**Description:**
Display session plans in simple list view with season key milestones. Future: Calendar view option.

**Acceptance Criteria:**
- [ ] **Session Plan List:**
  - Upcoming sessions (next 4 weeks)
  - Past sessions (last 4 weeks, collapsed by default)
  - Each item shows: Date, time, title, location, linked notes count
  - Click → navigate to session plan detail (existing page)
- [ ] **Season Milestones:**
  - Season start/end dates
  - Key games/tournaments (pulled from team settings)
  - Mid-season review checkpoint
  - Display as timeline above session list
- [ ] **Quick Create:**
  - "+ New Session Plan" button (top right)
  - Launches session creation modal (reuse existing)
- [ ] **Filters:**
  - Upcoming / Past / All
  - Has notes attached / No notes
- [ ] **Visual Indicators:**
  - Today's session highlighted (border + background)
  - Sessions with linked notes show note icon
  - Completed sessions show checkmark
- [ ] Empty state ("No sessions planned - create your first one!")
- [ ] Mobile: Stacked cards, desktop: Table layout

**Backend Functions:**
```typescript
// EXISTING (reuse)
// sessionPlans.listByTeam - already exists

// NEW (for milestones)
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
    // Get team.season field (start/end dates)
    // Get games/tournaments from team settings (if we have this)
    // Calculate mid-season review (halfway between start/end)
  }
});
```

**UI Components:**
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/planning-tab.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/session-plan-list.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/season-timeline.tsx`

**Dependencies:**
- None (can build independently)

---

### US-P9-057: Quick Actions Menu
**Priority:** P2 (Nice to Have)
**Estimate:** 2 hours

**Description:**
Floating action button (FAB) with quick create actions. Mobile-first with speed dial options.

**Acceptance Criteria:**
- [ ] **FAB Position:**
  - Mobile: Bottom right corner (fixed position)
  - Desktop: Top right of Team Hub header
- [ ] **Actions:**
  - Add Voice Note
  - Create Session Plan
  - Log Injury
  - Create Task
  - Add Goal
- [ ] Click FAB → Speed dial opens (radial menu on mobile, dropdown on desktop)
- [ ] Each action → Navigate to creation page OR open modal
- [ ] Touch-friendly (min 56px FAB size, 44px menu items)
- [ ] Smooth animations (scale + fade)
- [ ] Keyboard accessible (Tab to focus, Enter to activate)
- [ ] Close on outside click or ESC key

**Backend Functions:**
- None (navigation only)

**UI Components:**
- `apps/web/src/app/orgs/[orgId]/coach/teams/[teamId]/components/quick-actions-menu.tsx`
- `apps/web/src/components/ui/floating-action-button.tsx` (reusable)

**Dependencies:**
- None (can build independently)

---

## 🏗️ Implementation Phases

### Phase A: Foundation (Day 1)
**Stories:** US-P9-063 (Layout)
- Create Team Hub route structure
- Tab navigation skeleton
- Mobile drawer + desktop sidebar
- Responsive breakpoints

### Phase B: Overview Dashboard (Day 2)
**Stories:** US-P9-052, US-P9-055, US-P9-056
- Quick Stats Panel
- Health & Safety Widget
- Activity Feed
- Upcoming Events Widget

### Phase C: Players & Planning (Day 3)
**Stories:** US-P9-053, US-P9-054
- Player grid with health badges
- Session plan list
- Season milestones timeline

### Phase D: Collaboration Features (Day 4)
**Stories:** US-P9-060, US-P9-059, US-P9-061, US-P9-064
- Team decision voting
- Coach tasks management
- Voice notes integration (3 ways)
- Shared insights view

### Phase E: Polish & Quick Actions (Day 5)
**Stories:** US-P9-057
- Quick actions FAB
- Final mobile testing
- Performance optimization (pagination, lazy loading)
- Empty states + error handling

---

## 🎯 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Time to find player info** | <5 seconds | Time from Team Hub landing → player info visible |
| **Coach engagement** | 50%+ daily visits | Track Team Hub page views vs total coach logins |
| **Mobile usage** | 30%+ mobile views | Track viewport size analytics |
| **Activity feed clicks** | 20%+ CTR | Clicks on activity items / total items shown |
| **Task completion** | 10+ tasks/week | Count coachTasks status: complete per week |
| **Decision engagement** | 5+ votes/week | Count teamDecisionVotes per week |

---

## 📊 Performance Considerations

### Query Optimization
- ✅ **Batch Fetch:** Use Map lookup for enriching related data (coaches, players)
- ✅ **Pagination:** Activity feed paginates at 50 items (cursor-based)
- ✅ **Index Usage:** All queries use `.withIndex()`, never `.filter()`
- ✅ **Query Skipping:** Skip queries when user/team context missing

### Real-Time Updates
- ✅ **Selective Subscriptions:** Only subscribe to active tab data
- ✅ **Optimistic Updates:** Vote clicks, task completion update UI immediately
- ⚠️ **Animation Throttling:** Limit real-time animation frequency to avoid jank

### Mobile Performance
- ✅ **Lazy Loading:** Images load on scroll (IntersectionObserver)
- ✅ **Code Splitting:** Tab content loads on demand (React.lazy)
- ✅ **Virtual Scrolling:** Use for 50+ player rosters (react-window)

---

## 🧪 Testing Plan

### Manual Testing Checklist

**Overview Dashboard:**
- [ ] Quick stats show correct counts
- [ ] Upcoming events display next 3 sessions
- [ ] Health widget shows active injuries
- [ ] Activity feed updates in real-time
- [ ] All click actions navigate correctly

**Players Tab:**
- [ ] Player cards show health badges correctly
- [ ] Filters work (active/injured/all)
- [ ] Search by name works
- [ ] Click player → navigates to Player Passport

**Planning Tab:**
- [ ] Session plans display in chronological order
- [ ] Season milestones appear above list
- [ ] Click session → navigates to session plan detail
- [ ] Linked notes count accurate

**Collaboration:**
- [ ] Vote on decision → count updates instantly
- [ ] Create task → appears in task widget
- [ ] Mark task complete → UI updates
- [ ] Voice notes appear in activity feed

**Mobile:**
- [ ] Drawer navigation opens/closes smoothly
- [ ] All touch targets ≥44px
- [ ] No horizontal scrolling
- [ ] Swipe gestures work on insight cards
- [ ] FAB accessible and doesn't obscure content

**Desktop:**
- [ ] Sidebar navigation visible
- [ ] Multi-column layouts display correctly
- [ ] Hover states work
- [ ] Keyboard navigation functional

---

## 📚 Reference Material

### Existing Patterns to Reuse
- **Activity Feed:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/activity-feed-view.tsx`
- **Player Cards:** `apps/web/src/app/orgs/[orgId]/coach/dashboard/page.tsx`
- **Batch Fetch:** `packages/backend/convex/models/teamCollaboration.ts` (lines 215-248)
- **Mobile Drawer:** `apps/web/src/components/coach/notification-center.tsx`
- **Swipe Cards:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/swipeable-insight-card.tsx`
- **Real-Time Presence:** `apps/web/src/app/orgs/[orgId]/coach/session-plans/[planId]/page.tsx`

### Backend Functions to Reuse
- `teamCollaboration.getTeamActivityFeed` - Activity feed data
- `teams.getTeamWithDetails` - Team info with coaches/players
- `sessionPlans.listByTeam` - Session plans
- `injuries.listByOrg` - Injury data
- `voiceNotes.listByOrg` - Voice notes
- `teamDecisions.listByTeam` - Team decisions

### New Backend Functions Needed
1. `getTeamOverviewStats` - Quick stats panel data
2. `getTeamPlayersWithHealth` - Player grid with health status
3. `getTeamHealthSummary` - Health widget data
4. `createCoachTask`, `completeCoachTask`, `getTeamTasks` - Task management
5. `linkVoiceNoteToSession`, `getSessionLinkedNotes` - Voice note linking
6. `getTeamInsights` - Shared insights view
7. `getSeasonMilestones` - Season timeline data

### Schema Changes Needed
1. **New Table: `coachTasks`**
   - Fields: teamId, organizationId, title, description, assignedTo[], createdBy, dueDate, priority, status
   - Indexes: by_team, by_team_and_status, by_assignee

2. **Update Table: `voiceNotes`**
   - Add field: `sessionId` (optional, id<"sessionPlans">)
   - Add index: by_session

---

## ✅ Ready to Build

**This plan is finalized based on user requirements:**
1. ✅ Cockpit overview with quick stats
2. ✅ Rich collaboration (notes, voting, tasks, insights)
3. ✅ Health widget (dedicated card)
4. ✅ Voice notes integration (all three ways)
5. ✅ Planning tab (simple list + milestones)
6. ✅ Mobile-first with desktop parity
7. ✅ Pagination at 50 items
8. ✅ Fixed layout (MVP)

**Estimated Timeline:** 4-5 days (34 hours across 11 stories)

**Next Step:** Begin Phase A (Foundation) - Create Team Hub route structure and responsive layout.

Let's build this! 🚀
