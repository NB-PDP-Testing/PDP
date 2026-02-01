# Phase 9 Week 3 - Comprehensive Assessment

**Date:** 2026-01-31
**Based on:** Lessons from Week 1 & Week 2 implementation
**Purpose:** Identify gaps, risks, and improvements before starting Week 3

---

## Executive Summary

### Critical Issues Found: 8
- Missing detailed acceptance criteria (validators, indexes, args/returns)
- Missing schema definitions (session plans, voting, threading)
- Missing performance considerations (N+1 queries, batch fetching)
- Missing mobile-specific requirements (touch targets already addressed but needs detail)
- Missing integration points with existing features
- Vague backend requirements (no query/mutation specs)

### Medium Issues Found: 12
- Missing loading/error states in some stories
- Missing visual verification requirements
- Missing keyboard navigation details
- Missing real-time collaboration specs

### Total Stories: 15
- **High Risk:** 5 stories (missing schema + backend details)
- **Medium Risk:** 7 stories (missing detailed criteria)
- **Low Risk:** 3 stories (mostly frontend polish)

---

## Story-by-Story Analysis

### US-P9-019: Create InsightsView Container ⚠️ MEDIUM RISK

**Current Requirements:**
- View type state: list | board | calendar | players
- Toggle buttons (tabs)
- Load/save preference from coachOrgPreferences

**Missing from Week 2 Learnings:**

1. **Schema Changes Not Specified:**
   ```typescript
   // Need to add to schema.ts
   coachOrgPreferences: {
     // ... existing fields
     teamInsightsViewPreference: v.optional(
       v.union(
         v.literal("list"),
         v.literal("board"),
         v.literal("calendar"),
         v.literal("players")
       )
     ),
   }
   ```

2. **Backend Query Not Specified:**
   - Need query: `getCoachViewPreference`
   - Need mutation: `updateCoachViewPreference`
   - Args validators missing
   - Returns validators missing

3. **Missing Acceptance Criteria:**
   - ❌ No file path specified
   - ❌ No skeleton loader requirement
   - ❌ No URL persistence (?view=board)
   - ❌ No mobile responsive requirement
   - ❌ No visual verification requirement
   - ❌ No type check requirement

**Recommended Additions:**
```markdown
### US-P9-019: Create InsightsView Container (3h, was 2h)

**File Path:**
- Create: apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-view-container.tsx

**Schema Changes:**
- Modify: packages/backend/convex/schema.ts
- Add teamInsightsViewPreference to coachOrgPreferences table
- Type: v.optional(v.union(v.literal("list"), v.literal("board"), v.literal("calendar"), v.literal("players")))
- Default: "list"

**Backend Queries:**
- Already exists: getCoachOrgPreferences (use this)
- Already exists: updateCoachOrgPreference (use this)

**Acceptance Criteria:**
- Create insights-view-container.tsx
- State: view type (list/board/calendar/players)
- Tabs component from shadcn/ui with 4 tabs
- Icons: List (ListIcon), Board (LayoutDashboardIcon), Calendar (CalendarIcon), Players (UsersIcon)
- Load preference from getCoachOrgPreferences query
- Save preference on tab change via updateCoachOrgPreference mutation
- URL persistence via useSearchParams (?view=board)
- URL overrides saved preference
- Skeleton loader while preferences loading (TabsSkeleton or custom)
- Mobile responsive: tabs scroll horizontally on small screens
- Type check passes
- Visual verification with dev-browser (all 4 views accessible)
```

---

### US-P9-020: Create InsightsBoardView 🔴 HIGH RISK

**Current Requirements:**
- 3 columns: Pending, Applied, Dismissed
- Responsive: stack on mobile

**Missing from Week 2 Learnings:**

1. **Backend Query Not Specified:**
   - How to fetch insights by status?
   - Existing query or new query?
   - Need to check if `getVoiceNotesByCoach` can be filtered by status

2. **Drag-and-Drop Not Specified:**
   - Is drag-and-drop required? (typical for kanban boards)
   - If yes, need library (dnd-kit recommended)
   - If no, clarify it's view-only

3. **Performance Concerns:**
   - Three separate queries or one query filtered client-side?
   - Risk of N+1 queries if fetching insights per column

4. **Missing Acceptance Criteria:**
   - ❌ No data fetching strategy
   - ❌ No empty state per column
   - ❌ No loading state
   - ❌ No card component specification
   - ❌ No action buttons (apply/dismiss from board view?)

**Critical Questions:**
- Q1: Is this drag-and-drop enabled or view-only?
- Q2: Should cards have quick actions (apply/dismiss buttons)?
- Q3: How are insights fetched? (one query or three?)
- Q4: Should this show ALL insights or just current coach's?

**Recommended Additions:**
```markdown
### US-P9-020: Create InsightsBoardView (4h, was 2h)

**File Path:**
- Create: apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-board-view.tsx

**Dependencies:**
- Assumes insights data passed as prop from container (no new backend queries)
- Data structure: insights grouped by status (pending/applied/dismissed)
- Parent container handles data fetching

**Acceptance Criteria:**
- Create insights-board-view.tsx
- 3 columns: Pending, Applied, Dismissed
- Column headers with count badges
- Each column uses flexbox/grid layout
- Compact insight cards (title, player, category, date only)
- NO drag-and-drop (view-only board for MVP)
- Empty state per column with friendly message
- Loading skeleton: 3 CardSkeleton per column while loading
- Responsive: columns stack vertically on mobile (<768px)
- Responsive: 3 columns side-by-side on tablet/desktop
- Each card has status badge and category badge
- Cards use same styling as insights-tab.tsx for consistency
- Type check passes
- Visual verification: all 3 columns visible, cards display correctly

**Future Enhancement (Week 4+):**
- Add drag-and-drop with dnd-kit library
- Dragging card between columns changes status
```

---

### US-P9-021: Create InsightsCalendarView 🔴 HIGH RISK

**Current Requirements:**
- Month grid with insight dots
- Click day → popover with insights
- Uses date-fns

**Missing from Week 2 Learnings:**

1. **Data Grouping Not Specified:**
   - How are insights grouped by date?
   - Use insight creation date or voice note date?
   - Need efficient date-based query or client-side grouping

2. **Performance Concerns:**
   - Loading all insights for month could be heavy
   - Need indexed query: `by_org_and_creationTime` or similar
   - Risk of loading too much data

3. **Calendar Library Not Specified:**
   - Build custom or use library?
   - Recommend: react-day-picker or custom with date-fns

4. **Missing Acceptance Criteria:**
   - ❌ No navigation between months
   - ❌ No "today" indicator
   - ❌ No max insights per day (what if 50 insights on one day?)
   - ❌ No popover library specified

**Recommended Additions:**
```markdown
### US-P9-021: Create InsightsCalendarView (5h, was 3h)

**File Path:**
- Create: apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-calendar-view.tsx

**Dependencies:**
- Assumes insights data passed as prop from container
- Library: date-fns for date manipulation
- Component: Popover from shadcn/ui
- NO external calendar library (custom grid with date-fns)

**Data Strategy:**
- Group insights by noteDate (voice note recording date)
- Format: YYYY-MM-DD string keys
- Client-side grouping (insights already loaded by container)

**Acceptance Criteria:**
- Create insights-calendar-view.tsx
- Month grid (7 columns × 5-6 rows)
- Month/year header with prev/next navigation buttons
- Today highlighted with distinct background color
- Each day cell shows:
  - Day number
  - Colored dots (max 3 visible, "+N more" if >3)
  - Dot colors: injury (red), skill (blue), team (purple), other (gray)
- Click day → Popover opens with insights list
- Popover shows:
  - Date header
  - List of insights (title, player, category)
  - "View in List" link (scrolls to insight in list view)
  - Max 10 insights shown, "See all (N)" link if more
- Empty days: no dots, light gray background
- Responsive: reduce font size on mobile, maintain 7 columns
- Loading skeleton: grid with shimmer effect
- Uses formatDistanceToNow from date-fns for relative dates
- Type check passes
- Visual verification: month displays, dots appear, popover works
```

---

### US-P9-022: Create InsightsPlayerView ⚠️ MEDIUM RISK

**Current Requirements:**
- Grouped by player
- Expand/collapse per player
- Search filter

**Missing from Week 2 Learnings:**

1. **Data Grouping Not Specified:**
   - How to group insights by player?
   - What about team insights (no player)?
   - What about unmatched insights?

2. **Expand/Collapse State:**
   - All collapsed by default?
   - URL state or local state?
   - Remember expanded state?

3. **Search Implementation:**
   - Search player names only or insight content too?
   - Debounced search?
   - Highlight matches?

**Recommended Additions:**
```markdown
### US-P9-022: Create InsightsPlayerView (3h, was 2h)

**File Path:**
- Create: apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-player-view.tsx

**Dependencies:**
- Assumes insights data passed as prop from container
- Component: Collapsible from shadcn/ui
- Component: Input from shadcn/ui (for search)

**Data Strategy:**
- Group insights by playerName
- Special group: "Team Insights" for team_culture category
- Special group: "Unmatched" for insights without playerIdentityId
- Sort groups: alphabetically by player name

**Acceptance Criteria:**
- Create insights-player-view.tsx
- Search input at top (placeholder: "Search players...")
- Debounced search (300ms) filters player names only
- Each player group is Collapsible component
- Collapsed by default (all groups closed on load)
- Collapsible header shows:
  - Player name
  - Insight count badge
  - Expand/collapse icon (ChevronDown/ChevronUp)
- Expanded state shows list of insights (compact cards)
- Empty search result: "No players found matching '[query]'"
- Loading skeleton: 5 CollapsibleSkeleton items
- Responsive: full width on all screens
- Type check passes
- Visual verification: groups collapse/expand, search filters
```

---

### US-P9-023: Create Session Templates Backend 🔴 HIGH RISK

**Current Requirements:**
- 3 templates: Pre-Match, Post-Training, Season Planning
- Auto-populate from recent insights (last 7 days)

**CRITICAL: Missing Schema Definition!**

**Missing from Week 2 Learnings:**

1. **No Schema Table Specified:**
   ```typescript
   // Need to add to schema.ts
   sessionPlans: defineTable({
     organizationId: v.string(),
     teamId: v.string(),
     createdBy: v.string(), // userId
     title: v.string(),
     templateType: v.union(
       v.literal("pre_match"),
       v.literal("post_training"),
       v.literal("season_planning"),
       v.literal("custom")
     ),
     objectives: v.array(v.string()),
     drills: v.array(v.object({
       name: v.string(),
       duration: v.number(), // minutes
       description: v.optional(v.string()),
       equipment: v.optional(v.array(v.string())),
     })),
     playerNotes: v.array(v.object({
       playerIdentityId: v.id("playerIdentities"),
       note: v.string(),
     })),
     status: v.union(
       v.literal("draft"),
       v.literal("published"),
       v.literal("completed")
     ),
     scheduledDate: v.optional(v.number()), // timestamp
   })
     .index("by_org", ["organizationId"])
     .index("by_team", ["teamId"])
     .index("by_org_and_status", ["organizationId", "status"]),
   ```

2. **Template Generation Logic Not Specified:**
   - How are insights auto-populated?
   - What if no insights in last 7 days?
   - How are drills generated from insights?

3. **Missing Acceptance Criteria:**
   - ❌ No query specifications
   - ❌ No mutation specifications
   - ❌ No args/returns validators
   - ❌ No index specifications

**Recommended Additions:**
```markdown
### US-P9-023: Create Session Templates Backend (4h, was 2h)

**File Path:**
- Modify: packages/backend/convex/schema.ts (add sessionPlans table)
- Create: packages/backend/convex/models/sessionPlanning.ts

**Schema Changes:**
[See schema definition above]

**Backend Functions:**

1. **getSessionTemplates** (query)
   - Args: { organizationId: v.string() }
   - Returns: v.array(v.object({ templateType, title, description, estimatedDuration }))
   - Returns 3 static templates (no DB query, just template metadata)

2. **createSessionFromTemplate** (mutation)
   - Args: {
       organizationId: v.string(),
       teamId: v.string(),
       templateType: v.union(...),
       userId: v.string()
     }
   - Returns: v.id("sessionPlans")
   - Logic:
     - Query recent insights (last 7 days) for team
     - Filter by category based on template type
     - Auto-generate objectives from insight titles
     - Auto-generate drills based on insight recommendations
     - Auto-populate player notes from injury insights
     - Insert sessionPlans record
     - Return session ID

3. **getSessionPlan** (query)
   - Args: { sessionId: v.id("sessionPlans") }
   - Returns: sessionPlan object or null
   - Use Better Auth adapter to enrich createdBy with user name

**Template Auto-Population Rules:**
- Pre-Match template:
  - Objectives from injury insights (check player fitness)
  - Drills from skill insights (last 7 days)
  - Player notes from injury + medical insights
- Post-Training template:
  - Objectives from skill gaps identified
  - Player notes from performance insights
- Season Planning template:
  - Objectives from all categories
  - Aggregate insights into themes

**Acceptance Criteria:**
- Add sessionPlans table to schema.ts
- Create models/sessionPlanning.ts
- Export getSessionTemplates query (returns 3 templates)
- Export createSessionFromTemplate mutation
- Export getSessionPlan query
- All functions have args + returns validators
- Use withIndex() for insight queries (by_team, by_org_and_creationTime)
- Use Better Auth adapter for user enrichment
- Type check passes
- Run npx -w packages/backend convex codegen
- Test in Convex dashboard: creating session auto-populates from insights
```

---

### US-P9-024: Create Session Templates UI ⚠️ MEDIUM RISK

**Current Requirements:**
- Gallery of 3 template cards
- "Use Template" button

**Missing:** Integration with backend, loading states, team selection

**Recommended Additions:**
```markdown
### US-P9-024: Create Session Templates UI (3h, was 2h)

**File Path:**
- Create: apps/web/src/app/orgs/[orgId]/coach/session-planning/page.tsx
- Create: apps/web/src/app/orgs/[orgId]/coach/session-planning/components/template-gallery.tsx

**Dependencies:**
- Requires: US-P9-023 complete (backend)
- Component: Card from shadcn/ui
- Component: Select from shadcn/ui (team selector)

**Acceptance Criteria:**
- Create session-planning/page.tsx
- Create template-gallery.tsx component
- Team selector dropdown at top (if coach has multiple teams)
- Query getSessionTemplates (organizationId)
- Display 3 template cards in grid (3 columns on desktop, 1 on mobile)
- Each card shows:
  - Template icon (Calendar/Trophy/TrendingUp)
  - Template name
  - Description (1-2 sentences)
  - Estimated duration
  - "Use Template" button
- Click "Use Template":
  - Call createSessionFromTemplate mutation
  - Show loading spinner on button (disable all buttons)
  - On success: navigate to session editor (US-P9-025)
  - On error: show error toast
- Loading skeleton: 3 CardSkeleton while templates loading
- Empty state: "No templates available" (should never show)
- Responsive: 3 columns → 1 column on mobile
- Type check passes
- Visual verification: templates display, clicking creates session
```

---

### US-P9-025: Create Session Plan Editor 🔴 HIGH RISK

**Current Requirements:**
- Editable objectives, drills, player notes
- Presence indicators
- Real-time collaborative editing

**CRITICAL: Missing Real-Time Collaboration Spec!**

**Missing from Week 2 Learnings:**

1. **Real-Time Collaboration Details:**
   - How are presence indicators implemented?
   - Operational Transform or Last-Write-Wins?
   - Conflict resolution strategy?
   - Cursor/selection sharing?

2. **Editing UX Not Specified:**
   - Inline editing or form?
   - Auto-save or manual save?
   - Optimistic updates?

3. **Backend Mutations Not Specified:**
   - updateSessionObjectives
   - updateSessionDrills
   - updateSessionPlayerNotes
   - Need validators for all

**Recommended Additions:**
```markdown
### US-P9-025: Create Session Plan Editor (6h, was 4h)

**File Path:**
- Create: apps/web/src/app/orgs/[orgId]/coach/session-planning/[sessionId]/page.tsx
- Modify: packages/backend/convex/models/sessionPlanning.ts (add mutations)

**Backend Mutations:**

1. **updateSessionPlan** (mutation)
   - Args: {
       sessionId: v.id("sessionPlans"),
       objectives: v.optional(v.array(v.string())),
       drills: v.optional(v.array(v.object(...))),
       playerNotes: v.optional(v.array(v.object(...))),
     }
   - Returns: v.id("sessionPlans")
   - Last-write-wins strategy (no OT for MVP)

2. **setSessionEditorPresence** (mutation)
   - Args: {
       sessionId: v.id("sessionPlans"),
       userId: v.string(),
       lastActive: v.number(), // timestamp
     }
   - Updates presence indicator
   - Expire presence after 30s of inactivity

**Frontend Architecture:**
- Real-time via useQuery (session plan updates automatically)
- Presence via separate presence table (like Week 1)
- Auto-save on blur (300ms debounce)
- Optimistic updates for instant feedback

**Acceptance Criteria:**
- Create session-planning/[sessionId]/page.tsx
- Query getSessionPlan (sessionId)
- Presence indicators in header (same pattern as Week 1)
- Editable objectives: add/remove/reorder with drag handles
- Editable drills: add/remove/edit (name, duration, description, equipment)
- Editable player notes: add/remove/edit with player autocomplete
- Auto-save on blur (show "Saving..." indicator)
- Optimistic UI updates (instant feedback)
- Collaborative: updates from other coaches appear in real-time
- Loading skeleton: SessionPlanSkeleton
- Error handling: show toast on save failure
- Back button to templates gallery
- "Publish" button changes status to published
- Type check passes
- Visual verification: editing works, presence shows, real-time updates
```

---

### US-P9-026: Create Team Decisions Backend 🔴 HIGH RISK

**Current Requirements:**
- Voting system with weighted votes
- createDecision, castVote, finalizeDecision mutations

**CRITICAL: Missing Schema Definition!**

**Missing from Week 2 Learnings:**

1. **No Schema Tables Specified:**
   ```typescript
   teamDecisions: defineTable({
     organizationId: v.string(),
     teamId: v.string(),
     createdBy: v.string(), // userId
     title: v.string(),
     description: v.optional(v.string()),
     options: v.array(v.object({
       id: v.string(), // unique option ID
       label: v.string(),
       description: v.optional(v.string()),
     })),
     votingType: v.union(
       v.literal("simple"), // one vote per person
       v.literal("weighted") // head coach vote worth more
     ),
     status: v.union(
       v.literal("open"),
       v.literal("closed"),
       v.literal("finalized")
     ),
     deadline: v.optional(v.number()), // timestamp
     finalizedAt: v.optional(v.number()),
     finalizedBy: v.optional(v.string()), // userId
     winningOption: v.optional(v.string()), // option ID
   })
     .index("by_team", ["teamId"])
     .index("by_team_and_status", ["teamId", "status"]),

   decisionVotes: defineTable({
     decisionId: v.id("teamDecisions"),
     userId: v.string(),
     optionId: v.string(),
     weight: v.number(), // 1.0 for normal coach, 2.0 for head coach
     comment: v.optional(v.string()),
   })
     .index("by_decision", ["decisionId"])
     .index("by_decision_and_user", ["decisionId", "userId"]),
   ```

2. **Weighted Vote Logic Not Specified:**
   - How is weight calculated?
   - Who gets higher weight? (head coach, owner?)
   - How to determine user's role?

**Recommended Additions:**
```markdown
### US-P9-026: Create Team Decisions Backend (5h, was 3h)

**File Path:**
- Modify: packages/backend/convex/schema.ts (add tables)
- Create: packages/backend/convex/models/teamDecisions.ts

**Schema Changes:**
[See schema definitions above]

**Backend Functions:**

1. **createDecision** (mutation)
   - Args: {
       organizationId: v.string(),
       teamId: v.string(),
       title: v.string(),
       description: v.optional(v.string()),
       options: v.array(v.object({ label: v.string() })),
       votingType: v.union(...),
       deadline: v.optional(v.number()),
     }
   - Returns: v.id("teamDecisions")
   - Auto-generate option IDs
   - Set status to "open"
   - Create teamActivityFeed entry

2. **castVote** (mutation)
   - Args: {
       decisionId: v.id("teamDecisions"),
       optionId: v.string(),
       userId: v.string(),
       comment: v.optional(v.string()),
     }
   - Returns: v.id("decisionVotes")
   - Check if decision is still open
   - Calculate weight based on user's role:
     - Head coach (activeFunctionalRole === "coach" + isTeamLead): 2.0
     - Coach: 1.0
     - Other roles: 0.5
   - Upsert vote (update if already voted)
   - Create teamActivityFeed entry

3. **finalizeDecision** (mutation)
   - Args: {
       decisionId: v.id("teamDecisions"),
       userId: v.string(),
     }
   - Returns: v.id("teamDecisions")
   - Only head coach can finalize
   - Calculate weighted vote totals
   - Set winningOption to option with highest total
   - Set status to "finalized"
   - Create teamActivityFeed entry

4. **getTeamDecisions** (query)
   - Args: {
       teamId: v.string(),
       status: v.optional(v.union("open", "closed", "finalized")),
     }
   - Returns: v.array(decision objects with vote counts)
   - Use withIndex("by_team_and_status")
   - Enrich with Better Auth user data (createdBy name)
   - Include vote totals per option

5. **getDecisionVotes** (query)
   - Args: { decisionId: v.id("teamDecisions") }
   - Returns: v.array(vote objects with user names)
   - Use withIndex("by_decision")
   - Enrich with Better Auth user data

**Acceptance Criteria:**
- Add teamDecisions + decisionVotes tables to schema.ts
- Create models/teamDecisions.ts
- Export all 5 functions above
- All functions have args + returns validators
- Use withIndex() for all queries
- Use Better Auth adapter for user enrichment
- Weighted vote calculation: head coach × 2.0, coach × 1.0, other × 0.5
- Type check passes
- Run npx -w packages/backend convex codegen
- Test in Convex dashboard: create decision, cast votes, finalize
```

---

### US-P9-027: Create Voting Card Component ⚠️ MEDIUM RISK

**Current Requirements:**
- Display decision, options, vote counts
- Cast vote on click
- Finalize button (head coach only)

**Missing:** Loading states, optimistic updates, vote visualization

**Recommended Additions:**
```markdown
### US-P9-027: Create Voting Card Component (4h, was 3h)

**File Path:**
- Create: apps/web/src/app/orgs/[orgId]/coach/team-hub/components/voting-card.tsx
- Create: apps/web/src/app/orgs/[orgId]/coach/team-hub/components/voting-list.tsx

**Dependencies:**
- Requires: US-P9-026 complete (backend)
- Component: Card from shadcn/ui
- Component: Progress from shadcn/ui (vote bars)
- Component: RadioGroup from shadcn/ui (option selection)

**Acceptance Criteria:**
- Create voting-card.tsx component
- Props: decisionId
- Query getTeamDecisions + getDecisionVotes
- Display:
  - Decision title + description
  - Created by (user name) + relative timestamp
  - Deadline countdown (if set, using date-fns)
  - Status badge (Open/Closed/Finalized)
  - Options list with vote visualization:
    - Option label
    - Vote count + percentage
    - Progress bar (filled based on percentage)
    - Winning option highlighted (if finalized)
    - Current user's vote highlighted (checkmark icon)
- Vote casting:
  - Radio buttons if decision open and user hasn't voted
  - "Cast Vote" button (disabled until option selected)
  - Optimistic update: highlight selected option immediately
  - Show "Voting..." loading state on button
  - On success: refresh votes, show success toast
  - On error: revert optimistic update, show error toast
- Finalize button:
  - Only visible if user is head coach AND status is "open"
  - Confirmation dialog: "Are you sure? This cannot be undone"
  - On finalize: show winning option with trophy icon
- Loading skeleton: CardSkeleton while loading
- Responsive: full width on mobile
- Type check passes
- Visual verification: votes cast, bars update, finalize works
```

---

### US-P9-028: Create Command Palette ⚠️ MEDIUM RISK

**Current Requirements:**
- Opens with Cmd+K
- Fuzzy search
- Sections: Quick Actions, Navigation, Recent Players

**Missing:** Library specification, action implementations

**Recommended Additions:**
```markdown
### US-P9-028: Create Command Palette (4h, was 2h)

**File Path:**
- Create: apps/web/src/components/coach/command-palette.tsx
- Create: apps/web/src/hooks/use-command-palette.ts

**Dependencies:**
- Library: cmdk from shadcn/ui (NOT custom implementation)
- Component: Dialog from shadcn/ui
- Hook: useHotkeys or custom keyboard listener

**Data Sources:**
- Quick Actions: static list (hardcoded)
- Navigation: static routes
- Recent Players: query recent voice notes, extract unique players

**Acceptance Criteria:**
- Create command-palette.tsx component
- Install cmdk: npx shadcn@latest add command
- Opens with Cmd+K (Mac) or Ctrl+K (Windows/Linux)
- Closes with Escape or clicking outside
- Input field with autofocus
- Fuzzy search across all items
- Sections:
  1. Quick Actions (if query matches):
     - "New Voice Note" → navigate to /coach/voice-notes
     - "View Team Hub" → navigate to /coach/team-hub
     - "Add Comment" → open comment form (if on insight page)
     - "Apply All Pending" → trigger bulk apply
  2. Navigation (if query matches):
     - All main coach routes (Players, Teams, Voice Notes, etc.)
  3. Recent Players (if query matches):
     - Last 10 players from recent voice notes
     - Navigate to player passport on select
- Keyboard navigation: Arrow Up/Down, Enter to select
- Show "No results found" if query doesn't match anything
- Loading state while fetching recent players
- Type check passes
- Visual verification: opens with Cmd+K, search works, navigation works
```

---

### US-P9-029: Add Global Keyboard Shortcuts ✅ LOW RISK

**Current Requirements:**
- Cmd+K → palette
- K → new note, C → comment, N/P → navigation
- ? → shortcuts help

**Well-specified, minor additions:**

**Recommended Additions:**
```markdown
### US-P9-029: Add Global Keyboard Shortcuts (2h, was 1h)

**File Path:**
- Modify: apps/web/src/app/orgs/[orgId]/coach/layout.tsx
- Create: apps/web/src/components/coach/keyboard-shortcuts-help.tsx

**Dependencies:**
- Library: react-hotkeys-hook or custom useEffect
- Component: Dialog from shadcn/ui (for help modal)

**Shortcuts:**
- Cmd/Ctrl+K → Open command palette
- K → New voice note (navigate to recording page)
- C → Focus comment input (if on page with comments)
- N → Next item (in list views)
- P → Previous item (in list views)
- ? → Show keyboard shortcuts help dialog
- Escape → Close modals/dialogs

**Acceptance Criteria:**
- Install react-hotkeys-hook: npm install react-hotkeys-hook
- Add keyboard listener to coach layout.tsx
- Implement all shortcuts above
- Shortcuts work from any page under /coach/*
- Shortcuts disabled when typing in input/textarea
- Create keyboard-shortcuts-help.tsx modal
- Help modal shows:
  - Title: "Keyboard Shortcuts"
  - Sections: Navigation, Actions, Views, Help
  - Each shortcut with key combo + description
  - Platform-aware: show Cmd (Mac) or Ctrl (Windows)
- Type check passes
- Visual verification: all shortcuts work, help modal displays
```

---

### US-P9-030: Add Comment Threading UI ⚠️ MEDIUM RISK

**Current Requirements:**
- Reply button on comments
- Indented replies with border-left
- Recursive rendering

**Missing:** Backend schema changes, reply mutation

**CRITICAL: Backend Changes Required!**

**Recommended Additions:**
```markdown
### US-P9-030: Add Comment Threading UI (4h, was 2h)

**File Path:**
- Modify: packages/backend/convex/schema.ts (add parentCommentId)
- Modify: packages/backend/convex/models/teamCollaboration.ts (update addComment)
- Modify: apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insight-comments.tsx
- Modify: apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/comment-form.tsx

**Schema Changes:**
```typescript
insightComments: defineTable({
  // ... existing fields
  parentCommentId: v.optional(v.id("insightComments")), // NEW
})
  .index("by_insight", ["insightId"])
  .index("by_parent", ["parentCommentId"]), // NEW
```

**Backend Changes:**
- Modify addComment mutation:
  - Add parentCommentId to args (optional)
  - If parentCommentId provided, verify it exists and belongs to same insight
- Query getInsightComments:
  - Return comments with parent/child relationships
  - Option 1: Flat list with parentCommentId (client builds tree)
  - Option 2: Nested structure (backend builds tree)
  - Recommend: Flat list (simpler backend, more flexible frontend)

**Frontend Changes:**

1. insight-comments.tsx:
   - Build comment tree from flat list
   - Recursive CommentItem component
   - Indentation: 16px × depth level (max 3 levels deep)
   - Border-left on replies: 2px solid muted
   - "Reply" button on each comment

2. comment-form.tsx:
   - Add replyingTo prop (optional)
   - If replyingTo set, show "Replying to @username" header
   - Cancel reply button (clears replyingTo)
   - Include parentCommentId in addComment call

**Acceptance Criteria:**
- Add parentCommentId to insightComments schema
- Add by_parent index
- Modify addComment mutation (add parentCommentId arg)
- Modify getInsightComments to include parent relationships
- Update insight-comments.tsx with recursive rendering
- Max thread depth: 3 levels
- "Reply" button on each comment
- Clicking reply opens comment form with replyingTo context
- Replies indented with border-left
- Collapse/expand thread (show/hide replies)
- Type check passes
- Run npx -w packages/backend convex codegen
- Visual verification: threading works, indentation correct
```

---

### US-P9-031: Add Loading Skeletons ✅ LOW RISK

**Well-specified, follows Week 2 pattern**

**Minor Additions:**
```markdown
### US-P9-031: Add Loading Skeletons (2h)

**File Path:**
- Create: apps/web/src/components/loading/card-skeleton.tsx (if not exists)
- Create: apps/web/src/components/loading/calendar-skeleton.tsx
- Create: apps/web/src/components/loading/board-skeleton.tsx

**Acceptance Criteria:**
- CardSkeleton for board view (3 columns × 3 cards each)
- CalendarSkeleton for calendar view (month grid with shimmer)
- Use existing ListSkeleton for list view (items={5})
- Use existing ListSkeleton for player view (items={5})
- All skeletons use shimmer animation (animate-pulse)
- Type check passes
```

---

### US-P9-032: Add Empty States ✅ LOW RISK

**Well-specified, follows Week 2 pattern**

**Minor Additions:**
```markdown
### US-P9-032: Add Empty States (2h, was 1h)

**File Path:**
- Use existing Empty component from shadcn/ui
- Add to all views

**Acceptance Criteria:**
- Board view:
  - Per column: "No [status] insights yet"
  - Icon: Inbox
- Calendar view:
  - No insights in month: "No insights recorded this month"
  - Icon: Calendar
- Player view:
  - No players: "No player insights yet"
  - Search no results: "No players found matching '[query]'"
  - Icon: Users
- Session planning:
  - No sessions: "Create your first session plan"
  - Icon: ClipboardList
- Voting:
  - No decisions: "No team decisions yet"
  - Icon: CheckSquare
- All use Empty, EmptyMedia, EmptyTitle, EmptyDescription components
- Consistent styling across all empty states
- Type check passes
```

---

### US-P9-033: Extend coachOrgPreferences (View) ✅ LOW RISK

**Well-specified, covered in US-P9-019**

---

### US-P9-045: Create Swipeable Insight Card ⚠️ MEDIUM RISK

**Current Requirements:**
- Framer Motion swipe animations
- Swipe RIGHT → Apply (green)
- Swipe LEFT → Dismiss (red)
- Haptic feedback

**Missing:** Mobile detection, fallback for desktop

**Recommended Additions:**
```markdown
### US-P9-045: Create Swipeable Insight Card (3h, was 2h)

**File Path:**
- Create: apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/swipeable-insight-card.tsx

**Dependencies:**
- Library: framer-motion (npm install framer-motion)
- Mobile detection: check window.matchMedia or user agent
- Haptic: window.navigator.vibrate (if available)

**Acceptance Criteria:**
- Create swipeable-insight-card.tsx
- Wraps existing insight card component
- Mobile only: swipe gestures disabled on desktop (>768px)
- Uses framer-motion <motion.div> with drag="x"
- Swipe threshold: 100px
- Visual feedback while dragging:
  - Swipe RIGHT: green overlay fades in
  - Swipe LEFT: red overlay fades in
  - Icon follows finger: checkmark (right), X (left)
- On release:
  - If threshold met: complete action (apply/dismiss)
  - If threshold not met: spring back to center
- Haptic feedback on action complete (if supported)
- Accessibility: swipe not required, buttons still visible
- Type check passes
- Visual verification on mobile: swipe works, animations smooth
```

---

### US-P9-046: Add Long-Press Quick Actions ⚠️ MEDIUM RISK

**Current Requirements:**
- 500ms long-press detection
- Overlay menu: Apply, Comment, @Mention, Cancel

**Missing:** Library specification, desktop support

**Recommended Additions:**
```markdown
### US-P9-046: Add Long-Press Quick Actions (2h, was 1h)

**File Path:**
- Modify: apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/swipeable-insight-card.tsx
- Or create: apps/web/src/hooks/use-long-press.ts

**Dependencies:**
- Custom hook for long-press detection (no library needed)
- Component: DropdownMenu from shadcn/ui

**Acceptance Criteria:**
- Create use-long-press.ts hook
- Hook detects 500ms press on touch or mouse
- On long-press: show overlay menu (DropdownMenu)
- Menu options:
  - "Apply Insight" (checkmark icon)
  - "Add Comment" (message icon)
  - "@Mention Coach" (at icon)
  - "Cancel" (X icon)
- Clicking option executes action
- Clicking outside dismisses menu
- Works on mobile AND desktop
- Haptic feedback on menu open (mobile only)
- Type check passes
- Visual verification: long-press opens menu, actions execute
```

---

### US-P9-047: Add Touch Target Optimization ✅ LOW RISK

**Well-specified**

---

### US-P9-048: Add Gesture Customization Settings ✅ LOW RISK

**Well-specified**

---

## Summary of Required Changes

### Critical Schema Additions Needed:

1. **sessionPlans table** (US-P9-023)
2. **teamDecisions table** (US-P9-026)
3. **decisionVotes table** (US-P9-026)
4. **insightComments.parentCommentId** (US-P9-030)
5. **coachOrgPreferences.teamInsightsViewPreference** (US-P9-019)

### Backend Functions Needed:

| Story | Functions Required | Current Status |
|-------|-------------------|----------------|
| US-P9-023 | getSessionTemplates, createSessionFromTemplate, getSessionPlan | ❌ Not specified |
| US-P9-025 | updateSessionPlan, setSessionEditorPresence | ❌ Not specified |
| US-P9-026 | createDecision, castVote, finalizeDecision, getTeamDecisions, getDecisionVotes | ❌ Not specified |
| US-P9-030 | Modify addComment, modify getInsightComments | ❌ Not specified |

### Missing Technical Specs:

- Real-time collaboration architecture (US-P9-025)
- Drag-and-drop specification (US-P9-020 - clarified as view-only for MVP)
- Calendar data grouping strategy (US-P9-021)
- Command palette library (US-P9-028)
- Keyboard shortcuts library (US-P9-029)
- Mobile gesture libraries (US-P9-045, US-P9-046)

### Performance Risks:

- Calendar view: loading all insights for month (US-P9-021)
- Board view: N+1 queries if not batched (US-P9-020)
- Player view: client-side grouping might be slow with many insights (US-P9-022)

---

## Recommendations

### Before Starting Week 3:

1. ✅ **Update PRD with detailed acceptance criteria** (use this assessment)
2. ✅ **Create detailed schema definitions** for all new tables
3. ✅ **Specify all backend query/mutation signatures** with validators
4. ✅ **Choose libraries** for command palette, gestures, keyboard shortcuts
5. ✅ **Design real-time collaboration strategy** for session editor
6. ✅ **Create data flow diagrams** for complex features (voting, threading)

### During Week 3:

1. ✅ **Start with schema changes** (US-P9-033, US-P9-023, US-P9-026, US-P9-030)
2. ✅ **Build backend first** for each feature cluster
3. ✅ **Visual verification** for every UI story
4. ✅ **Mobile testing** for gesture stories (use dev-browser mobile mode)
5. ✅ **Integration testing** at end of week

### Week 3 Revised Effort Estimate:

| Original | Revised | Reason |
|----------|---------|--------|
| 28 hours | **40 hours** | Missing backend specs, schema work, real-time collaboration complexity |

---

**Assessment Complete**
**Recommendation: Update PRD before starting implementation**
