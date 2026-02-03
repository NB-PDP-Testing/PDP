# Phase 9 Week 4: All Phases PRD Configurations

**Purpose:** Copy each phase's configuration into `scripts/ralph/prd.json` after completing the previous phase.

**Instructions:**
1. Complete Phase 1
2. After Phase 1 tests pass, copy "Phase 2 Configuration" below into prd.json
3. Repeat for each subsequent phase

---

## Phase 1 Configuration (CURRENT)

**Status:** ✅ Currently active in prd.json
**Duration:** 4 hours
**Stories:** 3 (US-P9-063, US-P9-SCHEMA, US-P9-056)

```json
{
  "project": "Phase 9 Week 4 Phase 1 - Team Hub Foundation (Tab Navigation)",
  "branchName": "ralph/p9-week4-team-hub",
  "description": "Week 4 Phase 1: Add tab navigation to existing Team Hub, enhance activity feed with pagination, optional schema change for voice notes.",
  "referencePRD": "scripts/ralph/P9_WEEK4_REVISED_PLAN.md",
  "previousWeeks": [
    "Week 1: Collaboration Foundations (8 stories) - COMPLETE ✅",
    "Week 2: Activity Feed & AI Copilot (14 stories) - COMPLETE ✅",
    "Week 3: Multi-View, Voting, Command Palette & Gestures (17 stories) - COMPLETE ✅"
  ],
  "currentPhase": "Week 4 Phase 1 - Foundation (3 stories, 4 hours)",
  "nextPhases": [
    "Phase 2: Core Widgets (Overview + Health) - 7h",
    "Phase 3: Tab Views (Players + Planning) - 6h",
    "Phase 4: Collaboration (Tasks + Insights) - 9h",
    "Phase 5: Already Complete (Quick Actions) - 0h"
  ],
  "totalPhase9Scope": "50 stories across 4 weeks (~125 hours)",
  "week4Effort": "~26 hours (11 stories + 1 schema) - 30% reduction via code reuse",
  "userStories": [
    {
      "id": "US-P9-063",
      "phase": 1,
      "title": "Add Tab Navigation to Team Hub",
      "description": "Transform existing /team-hub page into tabbed interface (Overview, Players, Planning, Activity, Decisions, Tasks, Insights).",
      "acceptanceCriteria": [
        "IMPORTANT: Enhance EXISTING /team-hub/page.tsx (do NOT create new route)",
        "Wrap existing content in <Tabs> component from shadcn/ui",
        "Create 7 tabs: Overview, Players, Planning, Activity, Decisions, Tasks, Insights",
        "URL persistence via useSearchParams (?tab=overview as default)",
        "Tab state persists on refresh",
        "REUSE: Move existing activity-feed-view.tsx to Activity tab (don't rebuild)",
        "REUSE: Move existing voting-card.tsx + voting-list.tsx to Decisions tab (don't rebuild)",
        "Create PLACEHOLDER components for new tabs: overview-tab.tsx, players-tab.tsx, planning-tab.tsx, tasks-tab.tsx, insights-tab.tsx",
        "Placeholders show: Tab title + 'Coming in Phase 2/3/4' message + icon",
        "Keep existing team selector dropdown in header (above tabs)",
        "Keep existing presence indicators (above tabs)",
        "Mobile: Tabs scroll horizontally (no overflow)",
        "Desktop: Tabs fixed width, full bar visible",
        "Responsive breakpoints: 768px (mobile/tablet), 1024px (desktop)",
        "Loading skeleton while team loading",
        "Type check passes: npm run check-types",
        "Visual verification with dev-browser (all 7 tabs clickable)"
      ],
      "priority": 1,
      "passes": false,
      "effort": "2h",
      "dependencies": [],
      "files": {
        "modify": ["apps/web/src/app/orgs/[orgId]/coach/team-hub/page.tsx"],
        "create": [
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/tab-navigation.tsx",
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/overview-tab.tsx",
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/players-tab.tsx",
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/planning-tab.tsx",
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/tasks-tab.tsx",
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/insights-tab.tsx"
        ],
        "reuse": [
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/activity-feed-view.tsx (move to Activity tab)",
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/voting-card.tsx (move to Decisions tab)",
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/voting-list.tsx (move to Decisions tab)"
        ]
      }
    },
    {
      "id": "US-P9-SCHEMA",
      "phase": 1,
      "title": "Optional: Add sessionPlanId to voiceNotes",
      "description": "Add optional sessionPlanId field to voiceNotes table for linking notes to session plans.",
      "acceptanceCriteria": [
        "OPTIONAL: Can skip if not critical for Phase 1",
        "Modify packages/backend/convex/schema.ts",
        "Add field: sessionPlanId: v.optional(v.id(\"sessionPlans\")) to voiceNotes table",
        "Add index: .index(\"by_session\", [\"sessionPlanId\"])",
        "Run: npx -w packages/backend convex dev (applies schema)",
        "Run: npx -w packages/backend convex codegen",
        "Type check passes",
        "Verify in Convex dashboard: voiceNotes table has sessionPlanId field"
      ],
      "priority": 2,
      "passes": false,
      "effort": "0.5h",
      "dependencies": [],
      "files": {
        "modify": ["packages/backend/convex/schema.ts"]
      },
      "note": "OPTIONAL - Enables US-P9-061 (Voice Notes Integration) in Phase 4. Can skip for now."
    },
    {
      "id": "US-P9-056",
      "phase": 1,
      "title": "Enhance Activity Feed with Pagination",
      "description": "Add cursor-based pagination to existing ActivityFeedView component.",
      "acceptanceCriteria": [
        "ENHANCE existing activity-feed-view.tsx (do NOT rebuild from scratch)",
        "Backend: Enhance packages/backend/convex/models/teamCollaboration.ts",
        "Update getTeamActivityFeed query to support pagination:",
        "  - Add paginationOpts arg: { cursor: v.union(v.string(), v.null()), numItems: v.number() }",
        "  - Return object: { page: v.array(...), continueCursor: v.union(v.string(), v.null()), isDone: v.boolean() }",
        "  - Use Convex paginate() helper for cursor-based pagination",
        "  - Keep existing filters arg (types, dateRange - optional)",
        "Frontend: Add pagination state to activity-feed-view.tsx",
        "  - useState for cursor and accumulated items",
        "  - 'Load More' button at bottom (only show if !isDone)",
        "  - Click 'Load More' → fetch next page with continueCursor",
        "  - Append new items to existing list",
        "  - Loading spinner on button while fetching",
        "  - Disable button while loading",
        "Keep existing features: tab filtering, real-time updates, empty states",
        "Default: Load 50 items per page",
        "Type check passes",
        "Visual verification: Load More works, pagination smooth"
      ],
      "priority": 3,
      "passes": false,
      "effort": "1.5h",
      "dependencies": [],
      "files": {
        "modify": [
          "packages/backend/convex/models/teamCollaboration.ts",
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/activity-feed-view.tsx"
        ]
      }
    }
  ],
  "phase1Checklist": [
    "✅ Read P9_WEEK4_REVISED_PLAN.md for complete context",
    "✅ Read P9_WEEK4_COMPARISON.md to understand code reuse strategy",
    "✅ Understand existing /team-hub has 817 lines of working code",
    "⚠️ DO NOT create new /teams/[teamId] route - enhance existing /team-hub",
    "⚠️ DO NOT rebuild activity feed - enhance with pagination only",
    "⚠️ DO NOT rebuild voting - move to Decisions tab as-is",
    "✅ Create tab navigation with 7 tabs",
    "✅ Create placeholder components for Phase 2-4 tabs",
    "✅ Add pagination to activity feed backend + frontend",
    "✅ Optional: Add voiceNotes.sessionPlanId field",
    "✅ Type check passes after all changes",
    "✅ Visual verification with dev-browser",
    "✅ Commit with message: 'feat: Phase 9 Week 4 Phase 1 - Team Hub tab navigation'",
    "✅ All existing features still work (activity feed, voting, presence)"
  ]
}
```

---

## Phase 2 Configuration

**Copy this into prd.json after Phase 1 is complete**
**Duration:** 7 hours
**Stories:** 2 (US-P9-055, US-P9-052)

```json
{
  "project": "Phase 9 Week 4 Phase 2 - Core Widgets (Overview + Health)",
  "branchName": "ralph/p9-week4-team-hub",
  "description": "Week 4 Phase 2: Build Overview Dashboard with Health & Safety Widget, quick stats panel, upcoming events.",
  "referencePRD": "scripts/ralph/P9_WEEK4_REVISED_PLAN.md",
  "previousWeeks": [
    "Week 1: Collaboration Foundations (8 stories) - COMPLETE ✅",
    "Week 2: Activity Feed & AI Copilot (14 stories) - COMPLETE ✅",
    "Week 3: Multi-View, Voting, Command Palette & Gestures (17 stories) - COMPLETE ✅",
    "Week 4 Phase 1: Foundation (3 stories, 4 hours) - COMPLETE ✅"
  ],
  "currentPhase": "Week 4 Phase 2 - Core Widgets (2 stories, 7 hours)",
  "nextPhases": [
    "Phase 3: Tab Views (Players + Planning) - 6h",
    "Phase 4: Collaboration (Tasks + Insights) - 9h",
    "Phase 5: Already Complete (Quick Actions) - 0h"
  ],
  "totalPhase9Scope": "50 stories across 4 weeks (~125 hours)",
  "week4Effort": "~26 hours (11 stories + 1 schema) - 30% reduction via code reuse",
  "completedStories": [
    "US-P9-063: Tab Navigation ✅",
    "US-P9-SCHEMA: Optional schema change ✅ (or skipped)",
    "US-P9-056: Activity Feed Pagination ✅"
  ],
  "userStories": [
    {
      "id": "US-P9-055",
      "phase": 2,
      "title": "Health & Safety Widget",
      "description": "Dedicated widget showing active injuries and medical alerts. Prominent placement in Overview dashboard.",
      "acceptanceCriteria": [
        "Backend: Create getTeamHealthSummary query in packages/backend/convex/models/injuries.ts",
        "Query returns: activeInjuries array (max 5), allergyAlerts count, medicationAlerts count",
        "Each injury includes: playerId, playerName, injuryType, severity (minor/moderate/severe), daysSinceInjury, status",
        "Use batch fetch pattern with Map lookup to enrich player names (avoid N+1)",
        "Frontend: Create health-safety-widget.tsx component",
        "Display active injuries with severity badges (🟢 minor, 🟡 moderate, 🔴 severe)",
        "Show days since injury calculated from injury date",
        "Show return-to-play status (Out / Limited / Cleared)",
        "If more than 5 injuries, show 'View All (X)' link",
        "Empty state: 'No active injuries - great job keeping the team healthy!'",
        "Medical alerts section: Show allergy count + medication count",
        "Click injury → navigate to injury detail",
        "Click medical alerts → navigate to medical profiles",
        "Mobile: Expandable accordion, Desktop: Always expanded card",
        "Type check passes: npm run check-types",
        "Visual verification with dev-browser"
      ],
      "priority": 1,
      "passes": false,
      "effort": "3h",
      "dependencies": [],
      "files": {
        "create": [
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/health-safety-widget.tsx"
        ],
        "modify": [
          "packages/backend/convex/models/injuries.ts"
        ]
      }
    },
    {
      "id": "US-P9-052",
      "phase": 2,
      "title": "Overview Dashboard (Cockpit View)",
      "description": "Create cockpit-style overview dashboard with quick stats, upcoming events, health widget, and activity feed summary.",
      "acceptanceCriteria": [
        "Backend: Create getTeamOverviewStats query in packages/backend/convex/models/teams.ts",
        "Query returns: totalPlayers, activeInjuries, attendancePercent, upcomingEventsCount",
        "Backend: Create getUpcomingEvents query in packages/backend/convex/models/teams.ts",
        "Query returns next 3 sessions/games with eventId, title, date, time, location, type",
        "Use batch fetch pattern to avoid N+1 queries",
        "Frontend: Replace placeholder overview-tab.tsx with full implementation",
        "Quick Stats Panel: 4 stat cards (Total Players, Active Injuries, Attendance %, Upcoming Events)",
        "Stats use icons: Users, AlertCircle, TrendingUp, Calendar from lucide-react",
        "Color-coded icons: blue (players), red (injuries), green (attendance), purple (events)",
        "REUSE: PresenceIndicators component at top of Overview tab",
        "REUSE: HealthSafetyWidget component (from US-P9-055)",
        "Upcoming Events Widget: Shows next 3 events with date/time/location",
        "Activity Feed Summary: Shows first 10 items with 'View all activity →' link to Activity tab",
        "Desktop: 2-column layout (widgets left, activity right)",
        "Tablet: 2-column layout (compact)",
        "Mobile: Single column (stacked)",
        "Loading states: Skeleton loaders for stats, widgets, feed",
        "Empty states: 'No upcoming events', 'New team - add players to get started'",
        "Type check passes: npm run check-types",
        "Visual verification with dev-browser (all breakpoints)"
      ],
      "priority": 2,
      "passes": false,
      "effort": "4h",
      "dependencies": ["US-P9-055"],
      "files": {
        "modify": [
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/overview-tab.tsx",
          "packages/backend/convex/models/teams.ts"
        ],
        "create": [
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/quick-stats-panel.tsx",
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/upcoming-events-widget.tsx"
        ]
      }
    }
  ],
  "phase2Checklist": [
    "✅ Phase 1 complete: Tab navigation working, Activity feed has pagination",
    "✅ Create getTeamHealthSummary query with batch fetch pattern",
    "✅ Build Health & Safety Widget component",
    "✅ Create getTeamOverviewStats query",
    "✅ Create getUpcomingEvents query",
    "✅ Build Overview Dashboard with all widgets",
    "✅ Verify responsive layout (mobile, tablet, desktop)",
    "✅ Test loading states and empty states",
    "✅ Type check passes after all changes",
    "✅ Visual verification with dev-browser",
    "✅ Commit with message: 'feat: Phase 9 Week 4 Phase 2 - Overview Dashboard + Health Widget'",
    "✅ Overview tab shows real data, no placeholders"
  ]
}
```

---

## Phase 3 Configuration

**Copy this into prd.json after Phase 2 is complete**
**Duration:** 6 hours
**Stories:** 2 (US-P9-053, US-P9-054)

```json
{
  "project": "Phase 9 Week 4 Phase 3 - Tab Views (Players + Planning)",
  "branchName": "ralph/p9-week4-team-hub",
  "description": "Week 4 Phase 3: Build Players Tab with health badges and Planning Tab with session list + season milestones.",
  "referencePRD": "scripts/ralph/P9_WEEK4_REVISED_PLAN.md",
  "previousWeeks": [
    "Week 1: Collaboration Foundations (8 stories) - COMPLETE ✅",
    "Week 2: Activity Feed & AI Copilot (14 stories) - COMPLETE ✅",
    "Week 3: Multi-View, Voting, Command Palette & Gestures (17 stories) - COMPLETE ✅",
    "Week 4 Phase 1: Foundation (3 stories, 4 hours) - COMPLETE ✅",
    "Week 4 Phase 2: Core Widgets (2 stories, 7 hours) - COMPLETE ✅"
  ],
  "currentPhase": "Week 4 Phase 3 - Tab Views (2 stories, 6 hours)",
  "nextPhases": [
    "Phase 4: Collaboration (Tasks + Insights) - 9h",
    "Phase 5: Already Complete (Quick Actions) - 0h"
  ],
  "totalPhase9Scope": "50 stories across 4 weeks (~125 hours)",
  "week4Effort": "~26 hours (11 stories + 1 schema) - 30% reduction via code reuse",
  "completedStories": [
    "US-P9-063: Tab Navigation ✅",
    "US-P9-SCHEMA: Optional schema change ✅",
    "US-P9-056: Activity Feed Pagination ✅",
    "US-P9-055: Health & Safety Widget ✅",
    "US-P9-052: Overview Dashboard ✅"
  ],
  "userStories": [
    {
      "id": "US-P9-053",
      "phase": 3,
      "title": "Players Tab with Health Badges",
      "description": "Display team roster in grid layout with health status badges. Mobile-first card layout, desktop grid.",
      "acceptanceCriteria": [
        "Backend: Create getTeamPlayersWithHealth query in packages/backend/convex/models/teams.ts",
        "Query returns array of: playerId, fullName, jerseyNumber, position, healthStatus (healthy/recovering/injured), isPlayingUp, photoUrl",
        "Health status calculation: 🔴 Injured = active injury with severe OR recent (<7 days), 🟡 Recovering = status 'recovering', 🟢 Healthy = no active/recovering injuries",
        "Use batch fetch pattern with Map lookup for injuries (avoid N+1)",
        "Frontend: Replace placeholder players-tab.tsx with full implementation",
        "Player grid layout: Mobile 1 col, Tablet 2 cols, Desktop 3-4 cols",
        "Player card shows: Photo (fallback initials), Full name, Jersey #, Position, Health badge",
        "Playing up/down badge if applicable (e.g., 'Playing Up')",
        "Filter controls: All / Active / Injured / On Break",
        "Position filter (dropdown)",
        "Search by name (real-time)",
        "Sort options: Name (A-Z), Jersey #, Position",
        "Click player card → navigate to Player Passport",
        "Touch-friendly cards (min 44px tap target)",
        "Loading state: Skeleton grid (6 cards)",
        "Empty states: 'No players on this team' or 'No players match filters'",
        "REUSE: PassportAvailabilityBadges component for health badges",
        "REUSE: PlayerTeamBadges component for playing up indicator",
        "Type check passes: npm run check-types",
        "Visual verification with dev-browser (all breakpoints, filters work)"
      ],
      "priority": 1,
      "passes": false,
      "effort": "3h",
      "dependencies": [],
      "files": {
        "modify": [
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/players-tab.tsx",
          "packages/backend/convex/models/teams.ts"
        ],
        "create": [
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/player-card.tsx",
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/player-filters.tsx"
        ]
      }
    },
    {
      "id": "US-P9-054",
      "phase": 3,
      "title": "Planning Tab (Simple List + Season Milestones)",
      "description": "Display session plans in simple list view with season key milestones. Future: Calendar view option.",
      "acceptanceCriteria": [
        "Backend: Create getSeasonMilestones query in packages/backend/convex/models/sessionPlans.ts",
        "Query returns: seasonStart, seasonEnd, keyDates array (date, title, type: game/tournament/review)",
        "Get season dates from team.season field (if exists)",
        "Calculate mid-season review (halfway between start/end)",
        "Frontend: Replace placeholder planning-tab.tsx with full implementation",
        "Session Plan List: Shows upcoming sessions (next 4 weeks) and past sessions (last 4 weeks, collapsed)",
        "Each session shows: Date, time, title, location, linked notes count",
        "Session list uses EXISTING sessionPlans.listByTeam query (already exists)",
        "Season Milestones: Timeline above session list showing season start, mid-season, end, key games",
        "Filter tabs: Upcoming / Past / All",
        "Visual indicator: Today's session highlighted (border + background)",
        "Sessions with linked notes show note icon badge",
        "Completed sessions show checkmark",
        "Click session → navigate to session plan detail page (existing route)",
        "Quick create: '+ New Session Plan' button (top right)",
        "Launches session creation modal (reuse existing)",
        "Loading state: Skeleton list (5 items)",
        "Empty state: 'No sessions planned - create your first one!'",
        "Mobile: Stacked cards, Desktop: Table layout",
        "Type check passes: npm run check-types",
        "Visual verification with dev-browser"
      ],
      "priority": 2,
      "passes": false,
      "effort": "3h",
      "dependencies": [],
      "files": {
        "modify": [
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/planning-tab.tsx",
          "packages/backend/convex/models/sessionPlans.ts"
        ],
        "create": [
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/session-plan-list.tsx",
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/season-timeline.tsx"
        ]
      }
    }
  ],
  "phase3Checklist": [
    "✅ Phase 2 complete: Overview Dashboard working, Health Widget shows data",
    "✅ Create getTeamPlayersWithHealth query with health status logic",
    "✅ Build Players Tab with grid layout",
    "✅ Implement player filters (status, position, search, sort)",
    "✅ Create getSeasonMilestones query",
    "✅ Build Planning Tab with session list + milestones timeline",
    "✅ Verify session list uses existing queries",
    "✅ Test responsive layout (mobile, tablet, desktop)",
    "✅ Test filters and search functionality",
    "✅ Type check passes after all changes",
    "✅ Visual verification with dev-browser",
    "✅ Commit with message: 'feat: Phase 9 Week 4 Phase 3 - Players + Planning Tabs'",
    "✅ Both tabs show real data, navigation works"
  ]
}
```

---

## Phase 4 Configuration

**Copy this into prd.json after Phase 3 is complete**
**Duration:** 9 hours
**Stories:** 4 (US-P9-059, US-P9-060, US-P9-061, US-P9-064)

```json
{
  "project": "Phase 9 Week 4 Phase 4 - Collaboration (Tasks + Insights)",
  "branchName": "ralph/p9-week4-team-hub",
  "description": "Week 4 Phase 4: Build Coach Tasks, enhance Team Decision Voting, integrate Voice Notes (3 ways), create Shared Insights View.",
  "referencePRD": "scripts/ralph/P9_WEEK4_REVISED_PLAN.md",
  "previousWeeks": [
    "Week 1: Collaboration Foundations (8 stories) - COMPLETE ✅",
    "Week 2: Activity Feed & AI Copilot (14 stories) - COMPLETE ✅",
    "Week 3: Multi-View, Voting, Command Palette & Gestures (17 stories) - COMPLETE ✅",
    "Week 4 Phase 1: Foundation (3 stories, 4 hours) - COMPLETE ✅",
    "Week 4 Phase 2: Core Widgets (2 stories, 7 hours) - COMPLETE ✅",
    "Week 4 Phase 3: Tab Views (2 stories, 6 hours) - COMPLETE ✅"
  ],
  "currentPhase": "Week 4 Phase 4 - Collaboration (4 stories, 9 hours)",
  "nextPhases": [
    "Phase 5: Already Complete (Quick Actions) - 0h"
  ],
  "totalPhase9Scope": "50 stories across 4 weeks (~125 hours)",
  "week4Effort": "~26 hours (11 stories + 1 schema) - 30% reduction via code reuse",
  "completedStories": [
    "US-P9-063: Tab Navigation ✅",
    "US-P9-SCHEMA: Optional schema change ✅",
    "US-P9-056: Activity Feed Pagination ✅",
    "US-P9-055: Health & Safety Widget ✅",
    "US-P9-052: Overview Dashboard ✅",
    "US-P9-053: Players Tab ✅",
    "US-P9-054: Planning Tab ✅"
  ],
  "userStories": [
    {
      "id": "US-P9-059",
      "phase": 4,
      "title": "Coach Tasks Management",
      "description": "Create and manage coach tasks from Team Hub. Assign to specific coaches, mark complete, view task list.",
      "acceptanceCriteria": [
        "Backend: Create new file packages/backend/convex/models/coachTasks.ts",
        "Backend: Create createTask mutation (teamId, title, description?, assignedTo[], dueDate?, priority)",
        "Backend: Create completeTask mutation (taskId)",
        "Backend: Create getTeamTasks query (teamId, filters: {status?, assignedTo?})",
        "Use batch fetch pattern with Map lookup to enrich assignedTo users (avoid N+1)",
        "Use withIndex for all queries (by_team, by_team_and_status)",
        "Enrich tasks with: isOverdue boolean (dueDate < now && !completed)",
        "Frontend: Replace placeholder tasks-tab.tsx with full implementation",
        "Task list shows incomplete tasks by default",
        "Each task item: Checkbox (to mark complete), Title, Priority badge (if high), Due date, Assigned to avatar/name",
        "Overdue tasks highlighted (red text + AlertCircle icon)",
        "Checkbox click → optimistic update → call completeTask mutation",
        "Create Task button (top right) → opens modal (basic for MVP)",
        "Empty state: 'No tasks - click + to create one'",
        "Loading state: Skeleton list (3 items)",
        "Real-time updates: Other coaches see task completion instantly",
        "Type check passes: npm run check-types",
        "Visual verification with dev-browser"
      ],
      "priority": 1,
      "passes": false,
      "effort": "4h",
      "dependencies": [],
      "files": {
        "create": [
          "packages/backend/convex/models/coachTasks.ts",
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/task-item.tsx"
        ],
        "modify": [
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/tasks-tab.tsx"
        ]
      }
    },
    {
      "id": "US-P9-060",
      "phase": 4,
      "title": "Team Decision Voting",
      "description": "Display team decisions in Decisions tab with inline voting UI. Real-time vote count updates.",
      "acceptanceCriteria": [
        "✅ Backend: REUSE existing teamDecisions functions (createDecision, castVote, getTeamDecisions, finalizeDecision)",
        "✅ Frontend: REUSE existing voting-card.tsx (393 lines) and voting-list.tsx (69 lines)",
        "VERIFY: Decisions tab shows VotingList component (should already work from Phase 1)",
        "VERIFY: Inline voting works (click vote button → optimistic update)",
        "VERIFY: Vote counts update in real-time (via Convex subscription)",
        "VERIFY: Finalized decisions show outcome badge",
        "VERIFY: Can't vote on finalized decisions",
        "VERIFY: Empty state shows: 'No decisions yet - create one to get team input'",
        "VERIFY: Mobile layout works (stacked vote buttons)",
        "VERIFY: Desktop layout works (horizontal vote buttons)",
        "No new code needed - just verification that existing components work correctly",
        "Type check passes: npm run check-types",
        "Visual verification with dev-browser"
      ],
      "priority": 2,
      "passes": false,
      "effort": "0h",
      "dependencies": [],
      "files": {
        "reuse": [
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/voting-card.tsx",
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/voting-list.tsx"
        ]
      },
      "note": "✅ 100% COMPLETE - Just verify existing implementation works in Decisions tab"
    },
    {
      "id": "US-P9-061",
      "phase": 4,
      "title": "Voice Notes Integration (Share Notes)",
      "description": "Integrate voice notes in all three ways: activity feed, player-linked, session-linked.",
      "acceptanceCriteria": [
        "Activity Feed Integration (should already work from Week 2):",
        "  - VERIFY: Voice note items show in Activity tab",
        "  - VERIFY: Display shows coach avatar, 'added a voice note', AI summary (first 100 chars)",
        "  - VERIFY: Click voice note item → navigate to full voice note detail",
        "Player-Linked Notes (NEW):",
        "  - Backend: Create getPlayerNoteCount query (playerId) → returns count",
        "  - Frontend: Modify player-card.tsx to show note count badge (e.g., '5 notes')",
        "  - Click badge → navigate to Player Passport with Voice Notes tab pre-selected",
        "Session-Linked Notes (OPTIONAL if US-P9-SCHEMA done):",
        "  - SKIP if sessionPlanId field not added in Phase 1",
        "  - OR: Store sessionPlanId in voiceNote.metadata field temporarily",
        "  - Planning tab: Each session shows linked notes count",
        "  - Click session → Session Plan detail shows 'Related Notes' section",
        "Activity feed already shows voice notes (verify working)",
        "Real-time updates: New notes appear in activity feed instantly",
        "Empty states for all integration points",
        "Type check passes: npm run check-types",
        "Visual verification with dev-browser"
      ],
      "priority": 3,
      "passes": false,
      "effort": "2h",
      "dependencies": ["US-P9-053"],
      "files": {
        "create": [
          "packages/backend/convex/models/voiceNotes.ts (add getPlayerNoteCount query)"
        ],
        "modify": [
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/player-card.tsx"
        ]
      }
    },
    {
      "id": "US-P9-064",
      "phase": 4,
      "title": "Shared Insights View (View Fellow Coaches' Insights)",
      "description": "Display insights from all team coaches in a shared view. Show who applied, who dismissed, consensus view.",
      "acceptanceCriteria": [
        "Backend: Create getTeamInsights query in packages/backend/convex/models/voiceNoteInsights.ts",
        "Query args: teamId, filters: {status?, coachId?, category?}",
        "Query returns: insightId, title, description, category, createdBy, appliedByCount, status, hasConsensus",
        "Get all voice notes for team → extract insights from each note",
        "Use batch fetch pattern with Map lookup to enrich coach names (avoid N+1)",
        "Calculate consensus: hasConsensus = appliedByCount >= 2",
        "Frontend: Replace placeholder insights-tab.tsx with full implementation",
        "Filter buttons: All / Pending / Applied / Dismissed",
        "Insight cards in grid layout (Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols)",
        "Each card shows: Title, Description, Category, Created by (coach name), Status badge",
        "Consensus badge if 2+ coaches applied ('Team consensus' with Users icon)",
        "Click insight → navigate to full insight detail",
        "Empty state: 'No insights yet - add voice notes to generate insights'",
        "Loading state: Skeleton grid (3 cards)",
        "Mobile: Consider adding swipe gestures (apply/dismiss) - optional",
        "Type check passes: npm run check-types",
        "Visual verification with dev-browser (grid layout, filters)"
      ],
      "priority": 4,
      "passes": false,
      "effort": "3h",
      "dependencies": [],
      "files": {
        "modify": [
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/insights-tab.tsx",
          "packages/backend/convex/models/voiceNoteInsights.ts"
        ],
        "create": [
          "apps/web/src/app/orgs/[orgId]/coach/team-hub/components/team-insight-card.tsx"
        ]
      }
    }
  ],
  "phase4Checklist": [
    "✅ Phase 3 complete: Players Tab working, Planning Tab working",
    "✅ Create coachTasks backend (createTask, completeTask, getTeamTasks)",
    "✅ Build Tasks Tab with task list",
    "✅ Verify Team Decision Voting works in Decisions tab (existing code)",
    "✅ Add player note count badge to player cards",
    "✅ Optional: Session-linked notes (if schema done)",
    "✅ Create getTeamInsights query with batch fetch pattern",
    "✅ Build Shared Insights Tab with grid layout",
    "✅ Test all collaboration features work together",
    "✅ Test real-time updates (tasks, voting, insights)",
    "✅ Type check passes after all changes",
    "✅ Visual verification with dev-browser",
    "✅ Commit with message: 'feat: Phase 9 Week 4 Phase 4 - Collaboration Features'",
    "✅ All tabs functional: Overview, Players, Planning, Activity, Decisions, Tasks, Insights"
  ]
}
```

---

## Phase 5 Configuration (OPTIONAL)

**Copy this into prd.json if you want to verify/enhance Quick Actions**
**Duration:** 0 hours (already exists)
**Story:** 1 (US-P9-057)

```json
{
  "project": "Phase 9 Week 4 Phase 5 - Quick Actions (Verification Only)",
  "branchName": "ralph/p9-week4-team-hub",
  "description": "Week 4 Phase 5: Verify Quick Actions Menu already exists and works correctly. Optional enhancements.",
  "referencePRD": "scripts/ralph/P9_WEEK4_REVISED_PLAN.md",
  "previousWeeks": [
    "Week 1: Collaboration Foundations (8 stories) - COMPLETE ✅",
    "Week 2: Activity Feed & AI Copilot (14 stories) - COMPLETE ✅",
    "Week 3: Multi-View, Voting, Command Palette & Gestures (17 stories) - COMPLETE ✅",
    "Week 4 Phase 1: Foundation (3 stories, 4 hours) - COMPLETE ✅",
    "Week 4 Phase 2: Core Widgets (2 stories, 7 hours) - COMPLETE ✅",
    "Week 4 Phase 3: Tab Views (2 stories, 6 hours) - COMPLETE ✅",
    "Week 4 Phase 4: Collaboration (4 stories, 9 hours) - COMPLETE ✅"
  ],
  "currentPhase": "Week 4 Phase 5 - Quick Actions Verification (0 hours)",
  "nextPhases": [],
  "totalPhase9Scope": "50 stories across 4 weeks (~125 hours)",
  "week4Effort": "~26 hours (11 stories + 1 schema) - 30% reduction via code reuse",
  "completedStories": [
    "US-P9-063: Tab Navigation ✅",
    "US-P9-SCHEMA: Optional schema change ✅",
    "US-P9-056: Activity Feed Pagination ✅",
    "US-P9-055: Health & Safety Widget ✅",
    "US-P9-052: Overview Dashboard ✅",
    "US-P9-053: Players Tab ✅",
    "US-P9-054: Planning Tab ✅",
    "US-P9-059: Coach Tasks ✅",
    "US-P9-060: Team Decision Voting ✅",
    "US-P9-061: Voice Notes Integration ✅",
    "US-P9-064: Shared Insights View ✅"
  ],
  "userStories": [
    {
      "id": "US-P9-057",
      "phase": 5,
      "title": "Quick Actions Menu (Verification)",
      "description": "Verify existing Quick Actions Menu works correctly. Optional enhancements if needed.",
      "acceptanceCriteria": [
        "✅ EXISTING: HeaderQuickActionsMenu component in coach layout",
        "✅ EXISTING: FAB with speed dial actions",
        "✅ EXISTING: Actions include: Voice Note, Session Plan, Goal, Injury, Task",
        "VERIFY: Quick actions menu visible in Team Hub",
        "VERIFY: FAB positioned correctly (mobile: bottom right, desktop: header)",
        "VERIFY: All actions navigate correctly",
        "VERIFY: Touch-friendly (min 56px FAB, 44px menu items)",
        "VERIFY: Smooth animations (scale + fade)",
        "VERIFY: Keyboard accessible (Tab, Enter, ESC)",
        "VERIFY: Close on outside click",
        "OPTIONAL: Add 'Create Decision' action if missing",
        "OPTIONAL: Add 'Add Insight' action if missing",
        "No major work needed - just verification",
        "Type check passes: npm run check-types",
        "Visual verification with dev-browser"
      ],
      "priority": 1,
      "passes": false,
      "effort": "0h",
      "dependencies": [],
      "files": {
        "reuse": [
          "apps/web/src/app/orgs/[orgId]/coach/layout.tsx (HeaderQuickActionsMenu)"
        ]
      },
      "note": "✅ 100% COMPLETE - Quick Actions already exists in coach layout. Just verify it works."
    }
  ],
  "phase5Checklist": [
    "✅ Phase 4 complete: All collaboration features working",
    "✅ Verify Quick Actions Menu visible in Team Hub",
    "✅ Verify all quick actions work (Voice Note, Session Plan, Goal, Injury, Task)",
    "✅ Optional: Add Create Decision or Add Insight actions if needed",
    "✅ Final visual verification with dev-browser (all breakpoints)",
    "✅ Final type check: npm run check-types",
    "✅ Test complete user flow: Overview → Players → Planning → Activity → Decisions → Tasks → Insights",
    "✅ Commit with message: 'feat: Phase 9 Week 4 Complete - Team Hub with all features'",
    "✅ Create PR to main branch",
    "✅ Update prd.json for next phase (if any)"
  ]
}
```

---

## Summary

### Phase Durations
1. **Phase 1:** 4 hours (Foundation - Tab Navigation + Pagination)
2. **Phase 2:** 7 hours (Core Widgets - Overview + Health)
3. **Phase 3:** 6 hours (Tab Views - Players + Planning)
4. **Phase 4:** 9 hours (Collaboration - Tasks + Insights)
5. **Phase 5:** 0 hours (Quick Actions - Already Complete)

**Total:** 26 hours across 11 stories (30% reduction from original 38 hours via code reuse)

### Story IDs by Phase
- **Phase 1:** US-P9-063, US-P9-SCHEMA, US-P9-056
- **Phase 2:** US-P9-055, US-P9-052
- **Phase 3:** US-P9-053, US-P9-054
- **Phase 4:** US-P9-059, US-P9-060, US-P9-061, US-P9-064
- **Phase 5:** US-P9-057

### Code Reuse Summary
- **100% Reuse:** US-P9-060 (Voting), US-P9-057 (Quick Actions)
- **90% Enhance:** US-P9-056 (Activity Feed - add pagination only)
- **60% Reuse:** US-P9-061 (Voice Notes - add player badges)
- **New Build:** US-P9-063, US-P9-055, US-P9-052, US-P9-053, US-P9-054, US-P9-059, US-P9-064

### Instructions for Ralph
1. Complete Phase 1 → Copy Phase 2 config into prd.json
2. Complete Phase 2 → Copy Phase 3 config into prd.json
3. Complete Phase 3 → Copy Phase 4 config into prd.json
4. Complete Phase 4 → Copy Phase 5 config (or skip if Quick Actions already verified)
5. After all phases → Create PR to main branch

🚀 **Ready for phased execution!**
