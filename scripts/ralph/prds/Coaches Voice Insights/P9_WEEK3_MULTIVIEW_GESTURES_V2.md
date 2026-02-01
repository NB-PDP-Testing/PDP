# Phase 9 Week 3: Multi-View, Voting, Command Palette & Mobile Gestures (REVISED)

**Version:** 2.0 (Revised 2026-01-31)
**Branch:** `ralph/team-collaboration-hub-p9`
**Stories:** 16 stories (revised from 15)
**Effort:** ~41 hours (revised from 28 hours)
**Prerequisite:** Week 2 complete

---

## 📋 Revision Summary

**Changes from v1.0:**
- ❌ **REMOVED** US-P9-023, US-P9-024 (Session planning already exists - see /coach/session-plans)
- ❌ **REMOVED** Most of US-P9-025 (Session editor exists, only need collaborative editing)
- ✅ **ADDED** US-P9-025b (Real-time collaboration for existing session editor)
- ✅ **ADDED** Detailed acceptance criteria (args, returns, validators)
- ✅ **ADDED** Schema specifications for all new tables
- ✅ **ADDED** Backend function signatures
- ✅ **ADDED** Library choices (cmdk, framer-motion, react-hotkeys-hook)
- ✅ **ADDED** File paths for all components
- ✅ **ADDED** Integration points with existing features
- ✅ **UPDATED** Effort estimates based on detailed requirements

**Why these changes:**
- Comprehensive codebase review revealed session planning fully implemented
- Missing backend specifications caused Week 2 rework
- Schema changes require upfront planning
- Performance patterns from Week 1 & 2 need to be applied

---

## 🎯 Week 3 Deliverables

- ✅ 4 view layouts for insights: List (exists), Board, Calendar, Players
- ✅ Team decisions democratic voting system
- ✅ Command palette (Cmd+K) with fuzzy search
- ✅ Global keyboard shortcuts
- ✅ Comment threading (replies to comments)
- ✅ Mobile gesture controls (swipe, long-press)
- ✅ Loading skeletons + empty states
- ✅ Real-time collaborative session editing

---

## 📊 Critical Patterns (MANDATORY)

```typescript
// MANDATORY: Use Better Auth adapter pattern
const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "user",
  where: [{ field: "_id", value: userId, operator: "eq" }]
});

// MANDATORY: Use withIndex(), NEVER use filter()
const insights = await ctx.db
  .query("voiceNoteInsights")
  .withIndex("by_org", (q) => q.eq("organizationId", orgId))
  .collect();

// MANDATORY: Always include args and returns validators
export const myQuery = query({
  args: { userId: v.string() },
  returns: v.union(v.object({ ... }), v.null()),
  handler: async (ctx, args) => { ... }
});

// MANDATORY: Use skeleton loaders (ListSkeleton uses 'items' prop)
<ListSkeleton items={5} />

// MANDATORY: Visual verification with dev-browser for all UI changes
~/.claude/skills/dev-browser/server.sh &
```

---

## 🗂️ Schema Changes Required

### 1. Comment Threading (US-P9-030)

```typescript
// Modify: packages/backend/convex/schema.ts

insightComments: defineTable({
  // ... existing fields ...
  parentCommentId: v.optional(v.id("insightComments")), // NEW
})
  .index("by_insight", ["insightId"])
  .index("by_parent", ["parentCommentId"]), // NEW
```

### 2. Team Decisions Voting (US-P9-026)

```typescript
// Add: packages/backend/convex/schema.ts

teamDecisions: defineTable({
  // Identity
  organizationId: v.string(),
  teamId: v.string(),
  createdBy: v.string(), // userId

  // Content
  title: v.string(),
  description: v.optional(v.string()),

  // Options
  options: v.array(
    v.object({
      id: v.string(), // unique option ID (generated)
      label: v.string(),
      description: v.optional(v.string()),
    })
  ),

  // Voting Configuration
  votingType: v.union(
    v.literal("simple"), // one vote per person, equal weight
    v.literal("weighted") // head coach vote worth more
  ),

  // Status
  status: v.union(
    v.literal("open"),
    v.literal("closed"),
    v.literal("finalized")
  ),

  // Results
  deadline: v.optional(v.number()), // timestamp
  finalizedAt: v.optional(v.number()),
  finalizedBy: v.optional(v.string()), // userId
  winningOption: v.optional(v.string()), // option ID

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_team", ["teamId"])
  .index("by_team_and_status", ["teamId", "status"])
  .index("by_org", ["organizationId"])
  .index("by_org_and_status", ["organizationId", "status"]),

decisionVotes: defineTable({
  decisionId: v.id("teamDecisions"),
  userId: v.string(),
  optionId: v.string(),
  weight: v.number(), // 2.0 for head coach, 1.0 for coach, 0.5 for other
  comment: v.optional(v.string()),
  votedAt: v.number(),
})
  .index("by_decision", ["decisionId"])
  .index("by_decision_and_user", ["decisionId", "userId"])
  .index("by_user", ["userId"]),
```

### 3. View Preferences (US-P9-033)

```typescript
// Modify: packages/backend/convex/schema.ts

coachOrgPreferences: defineTable({
  // ... existing fields ...
  teamInsightsViewPreference: v.optional(
    v.union(
      v.literal("list"),
      v.literal("board"),
      v.literal("calendar"),
      v.literal("players")
    )
  ), // NEW - default: "list"
})
  // ... existing indexes ...
```

---

## 📚 User Stories (Revised)

### US-P9-019: Create InsightsView Container (3h, was 2h)

**Purpose:** Multi-view wrapper with tabs for switching between list/board/calendar/players views.

**File Paths:**
- Create: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-view-container.tsx`
- Modify: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx` (integrate container)

**Backend (Existing):**
- Query: `getCoachOrgPreferences(coachId, organizationId)` - Already exists
- Mutation: `updateCoachOrgPreference(coachId, organizationId, field, value)` - Already exists

**Dependencies:**
- Component: `Tabs` from shadcn/ui
- Icons: `List`, `LayoutDashboard`, `Calendar`, `Users` from lucide-react
- Hook: `useSearchParams` from next/navigation

**Acceptance Criteria:**

1. **File Creation:**
   - Create `insights-view-container.tsx`
   - Export `InsightsViewContainer` component

2. **Props:**
   ```typescript
   type InsightsViewContainerProps = {
     orgId: string;
     insights: Array<InsightWithMeta>; // Pass insights from parent
     onInsightUpdate?: () => void; // Callback for mutations
   }
   ```

3. **State Management:**
   - URL state: `useSearchParams()` for `?view=board|calendar|players|list`
   - URL overrides saved preference
   - If no URL param, use saved preference from `getCoachOrgPreferences`
   - On tab change: update URL AND save preference via `updateCoachOrgPreference`

4. **UI Layout:**
   - Tabs component with 4 tabs:
     - List (ListIcon) - default view (existing insights-tab content)
     - Board (LayoutDashboardIcon) - kanban view
     - Calendar (CalendarIcon) - month grid view
     - Players (UsersIcon) - grouped by player
   - Active tab highlighted
   - Tab content area below

5. **Loading State:**
   - Show skeleton while preferences loading
   - Use custom TabsSkeleton (4 tab buttons + content area shimmer)

6. **Responsive:**
   - Desktop (≥768px): Tabs horizontal
   - Mobile (<768px): Tabs scrollable horizontally

7. **Integration:**
   - Pass insights data to child views
   - Pass callbacks (onInsightUpdate) to child views
   - Preserve existing functionality (reactions, smart actions, etc.)

8. **Quality:**
   - Type check passes
   - Visual verification with dev-browser (all 4 views accessible)
   - URL persistence works (refresh page maintains view)
   - Preference saves correctly (check Convex dashboard)

**Testing:**
- Click Board tab → URL updates to `?view=board`
- Refresh page → Board view still active
- Check `coachOrgPreferences` in Convex dashboard → `teamInsightsViewPreference: "board"`

---

### US-P9-020: Create InsightsBoardView (4h, was 2h)

**Purpose:** Kanban board view with 3 columns: Pending, Applied, Dismissed.

**File Paths:**
- Create: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-board-view.tsx`
- Create: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/board-insight-card.tsx`

**Dependencies:**
- Component: `Card` from shadcn/ui
- Component: `Badge` from shadcn/ui
- NO drag-and-drop library (view-only for MVP)

**Data Strategy:**
- Receives insights as prop from container
- Groups insights client-side by status
- No additional backend queries

**Acceptance Criteria:**

1. **File Creation:**
   - Create `insights-board-view.tsx`
   - Create `board-insight-card.tsx` (compact card variant)

2. **Props:**
   ```typescript
   type InsightsBoardViewProps = {
     insights: Array<InsightWithMeta>;
     onInsightUpdate?: () => void;
   }
   ```

3. **Layout:**
   - 3 columns: Pending | Applied | Dismissed
   - Column headers show:
     - Status name
     - Count badge (e.g., "Pending (12)")
     - Icon (Inbox | CheckCircle | XCircle)
   - Desktop: 3 columns side-by-side (equal width)
   - Mobile: 3 columns stacked vertically

4. **Board Insight Card:**
   - Compact layout (title, player, category, date only)
   - Status badge (colored by status)
   - Category badge
   - Player badge (if assigned)
   - Click card → navigate to detail OR expand inline
   - NO drag handles (view-only board)

5. **Empty States:**
   - Per column: "No [status] insights yet"
   - Icon: Inbox (empty folder visual)
   - Light gray background for empty columns

6. **Loading State:**
   - While insights loading: 3 columns with CardSkeleton (3 per column)

7. **Responsive:**
   - Desktop (≥1024px): 3 columns, 33% width each
   - Tablet (768-1023px): 3 columns, scrollable horizontally
   - Mobile (<768px): 3 columns stacked vertically

8. **Quality:**
   - Type check passes
   - Visual verification: all 3 columns visible, cards display correctly
   - Mobile test: columns stack, scrollable

**Testing:**
- View board with mix of pending/applied/dismissed insights
- Verify counts match actual insight counts
- Test empty state (filter to status with no insights)

---

### US-P9-021: Create InsightsCalendarView (5h, was 3h)

**Purpose:** Month calendar view with insight dots and day popover.

**File Paths:**
- Create: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-calendar-view.tsx`
- Create: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/calendar-day-popover.tsx`

**Dependencies:**
- Library: `date-fns` (already installed)
- Component: `Popover` from shadcn/ui
- Component: `Button` from shadcn/ui
- NO external calendar library (custom grid)

**Data Strategy:**
- Receives insights as prop from container
- Groups insights by `noteDate` (voice note recording date)
- Format: `YYYY-MM-DD` string keys
- Client-side grouping (no additional queries)

**Acceptance Criteria:**

1. **File Creation:**
   - Create `insights-calendar-view.tsx`
   - Create `calendar-day-popover.tsx`

2. **Props:**
   ```typescript
   type InsightsCalendarViewProps = {
     insights: Array<InsightWithMeta>;
     onInsightUpdate?: () => void;
   }
   ```

3. **Calendar Grid:**
   - Month view: 7 columns (Sun-Sat) × 5-6 rows
   - Month/year header with navigation:
     - "← Previous Month" button
     - Month Year (e.g., "January 2026")
     - "Next Month →" button
   - Weekday headers (Sun, Mon, Tue, etc.)
   - Day cells with date number (1-31)

4. **Today Highlighting:**
   - Today's date: distinct background (blue-50)
   - Today's date number: bold

5. **Insight Dots:**
   - Each day cell shows colored dots for insights
   - Dot colors by category:
     - Injury/Medical: red
     - Skill: blue
     - Team: purple
     - Other: gray
   - Max 3 dots visible
   - If >3 insights: "+N more" text below dots
   - Dot size: 6px × 6px circles
   - Dots arranged horizontally

6. **Day Popover:**
   - Click day cell → Popover opens
   - Popover content:
     - Date header (e.g., "January 15, 2026")
     - List of insights for that day (max 10 shown)
     - Each insight: title, player name, category badge
     - If >10 insights: "See all (N)" link at bottom
     - "View in List" link (closes popover, navigates to list view, scrolls to first insight)
   - Click outside popover → closes
   - ESC key → closes

7. **Empty Days:**
   - No dots
   - Light gray background (muted-50)
   - Clickable but shows "No insights on this day" in popover

8. **Loading State:**
   - Calendar grid with shimmer effect (skeleton)
   - 7 × 6 grid of skeleton cells

9. **Responsive:**
   - Desktop: Full calendar grid
   - Mobile: Reduce font sizes, maintain 7 columns
   - Mobile: Smaller dots (4px), max 2 visible

10. **Quality:**
    - Type check passes
    - Visual verification: month displays, dots appear, popover works
    - Test edge cases: month with 31 days, February, leap years

**Testing:**
- Navigate between months (verify correct days shown)
- Click day with insights (popover opens, insights listed)
- Click day without insights (popover shows empty message)
- Click "View in List" (navigates and scrolls to insight)

---

### US-P9-022: Create InsightsPlayerView (3h, was 2h)

**Purpose:** Grouped view with insights organized by player.

**File Paths:**
- Create: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-player-view.tsx`

**Dependencies:**
- Component: `Collapsible` from shadcn/ui
- Component: `Input` from shadcn/ui (search)
- Component: `Badge` from shadcn/ui
- Icons: `ChevronDown`, `ChevronUp`, `Search` from lucide-react

**Data Strategy:**
- Receives insights as prop from container
- Groups insights by `playerName` client-side
- Special groups:
  - "Team Insights" for `category: "team_culture"`
  - "Unmatched" for insights without `playerIdentityId`
- Sort groups alphabetically by player name

**Acceptance Criteria:**

1. **File Creation:**
   - Create `insights-player-view.tsx`

2. **Props:**
   ```typescript
   type InsightsPlayerViewProps = {
     insights: Array<InsightWithMeta>;
     onInsightUpdate?: () => void;
   }
   ```

3. **Search Bar:**
   - Input field at top
   - Placeholder: "Search players..."
   - Debounced search (300ms delay)
   - Filters player names only (not insight content)
   - Search is case-insensitive
   - Clear button (X icon) when search has value

4. **Player Groups:**
   - Each player group is a Collapsible component
   - Collapsed by default (all groups closed on initial load)
   - Collapsible header shows:
     - Player name
     - Insight count badge (e.g., "(5)")
     - Expand/collapse icon (ChevronDown/ChevronUp)
   - Expanded state shows:
     - List of insights for that player (compact cards)
     - Same card format as board view

5. **Special Groups:**
   - "Team Insights" group (if any team_culture insights exist)
   - "Unmatched" group (if any insights without playerIdentityId)
   - Special groups appear at top (before alphabetical players)

6. **Empty States:**
   - No insights: "No player insights yet" with Users icon
   - Search no results: "No players found matching '[query]'" with Search icon

7. **Loading State:**
   - While insights loading: 5 CollapsibleSkeleton items

8. **Responsive:**
   - Full width on all screens
   - Mobile: Slightly smaller text, maintain full functionality

9. **Quality:**
   - Type check passes
   - Visual verification: groups collapse/expand, search filters
   - Test with 0, 1, and many players

**Testing:**
- Search for player name (verify group appears/disappears)
- Expand group (verify insights listed)
- Collapse group (verify insights hidden)
- Test "Team Insights" and "Unmatched" groups

---

### US-P9-026: Create Team Decisions Backend (5h, was 3h)

**Purpose:** Democratic voting system backend with weighted votes.

**File Paths:**
- Modify: `packages/backend/convex/schema.ts` (add tables - see Schema Changes section)
- Create: `packages/backend/convex/models/teamDecisions.ts`

**Acceptance Criteria:**

1. **Schema Changes:**
   - Add `teamDecisions` table (see Schema Changes section above)
   - Add `decisionVotes` table (see Schema Changes section above)
   - Run: `npx -w packages/backend convex dev` (applies schema)

2. **Backend Functions:**

   **Function 1: createDecision** (mutation)
   ```typescript
   export const createDecision = mutation({
     args: {
       organizationId: v.string(),
       teamId: v.string(),
       title: v.string(),
       description: v.optional(v.string()),
       options: v.array(v.object({
         label: v.string(),
         description: v.optional(v.string()),
       })),
       votingType: v.union(
         v.literal("simple"),
         v.literal("weighted")
       ),
       deadline: v.optional(v.number()),
     },
     returns: v.id("teamDecisions"),
     handler: async (ctx, args) => {
       // 1. Get current user
       const identity = await ctx.auth.getUserIdentity();
       if (!identity) throw new Error("Not authenticated");

       // 2. Generate option IDs
       const optionsWithIds = args.options.map((opt, idx) => ({
         id: `opt_${Date.now()}_${idx}`,
         label: opt.label,
         description: opt.description,
       }));

       // 3. Insert decision
       const decisionId = await ctx.db.insert("teamDecisions", {
         organizationId: args.organizationId,
         teamId: args.teamId,
         createdBy: identity.subject,
         title: args.title,
         description: args.description,
         options: optionsWithIds,
         votingType: args.votingType,
         status: "open",
         deadline: args.deadline,
         createdAt: Date.now(),
         updatedAt: Date.now(),
       });

       // 4. Create activity feed entry
       await ctx.db.insert("teamActivityFeed", {
         teamId: args.teamId,
         organizationId: args.organizationId,
         actorId: identity.subject,
         actionType: "decision_created",
         targetType: "decision",
         targetId: decisionId,
         summary: `created decision: ${args.title}`,
         priority: "normal",
       });

       return decisionId;
     }
   });
   ```

   **Function 2: castVote** (mutation)
   ```typescript
   export const castVote = mutation({
     args: {
       decisionId: v.id("teamDecisions"),
       optionId: v.string(),
       comment: v.optional(v.string()),
     },
     returns: v.id("decisionVotes"),
     handler: async (ctx, args) => {
       // 1. Get current user
       const identity = await ctx.auth.getUserIdentity();
       if (!identity) throw new Error("Not authenticated");

       // 2. Get decision
       const decision = await ctx.db.get(args.decisionId);
       if (!decision) throw new Error("Decision not found");
       if (decision.status !== "open") throw new Error("Voting is closed");

       // 3. Calculate vote weight
       // Get user's role in organization
       const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
         model: "member",
         where: [
           { field: "userId", value: identity.subject, operator: "eq" },
           { field: "organizationId", value: decision.organizationId, operator: "eq" }
         ]
       });

       let weight = 1.0; // Default: normal coach
       if (member) {
         if (member.role === "owner" || member.role === "admin") {
           weight = 2.0; // Head coach / leadership
         } else if (member.activeFunctionalRole === "coach") {
           weight = 1.0; // Regular coach
         } else {
           weight = 0.5; // Other roles
         }
       }

       // 4. Check if user already voted
       const existingVote = await ctx.db
         .query("decisionVotes")
         .withIndex("by_decision_and_user", (q) =>
           q.eq("decisionId", args.decisionId).eq("userId", identity.subject)
         )
         .first();

       // 5. Upsert vote
       let voteId;
       if (existingVote) {
         // Update existing vote
         await ctx.db.patch(existingVote._id, {
           optionId: args.optionId,
           weight,
           comment: args.comment,
           votedAt: Date.now(),
         });
         voteId = existingVote._id;
       } else {
         // Insert new vote
         voteId = await ctx.db.insert("decisionVotes", {
           decisionId: args.decisionId,
           userId: identity.subject,
           optionId: args.optionId,
           weight,
           comment: args.comment,
           votedAt: Date.now(),
         });
       }

       // 6. Create activity feed entry
       await ctx.db.insert("teamActivityFeed", {
         teamId: decision.teamId,
         organizationId: decision.organizationId,
         actorId: identity.subject,
         actionType: "vote_cast",
         targetType: "decision",
         targetId: args.decisionId,
         summary: `voted on: ${decision.title}`,
         priority: "normal",
       });

       return voteId;
     }
   });
   ```

   **Function 3: finalizeDecision** (mutation)
   ```typescript
   export const finalizeDecision = mutation({
     args: {
       decisionId: v.id("teamDecisions"),
     },
     returns: v.id("teamDecisions"),
     handler: async (ctx, args) => {
       // 1. Get current user
       const identity = await ctx.auth.getUserIdentity();
       if (!identity) throw new Error("Not authenticated");

       // 2. Get decision
       const decision = await ctx.db.get(args.decisionId);
       if (!decision) throw new Error("Decision not found");
       if (decision.status !== "open") throw new Error("Decision already finalized");

       // 3. Check if user is head coach/admin
       const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
         model: "member",
         where: [
           { field: "userId", value: identity.subject, operator: "eq" },
           { field: "organizationId", value: decision.organizationId, operator: "eq" }
         ]
       });

       if (!member || (member.role !== "owner" && member.role !== "admin")) {
         throw new Error("Only organization admins can finalize decisions");
       }

       // 4. Get all votes and calculate totals
       const votes = await ctx.db
         .query("decisionVotes")
         .withIndex("by_decision", (q) => q.eq("decisionId", args.decisionId))
         .collect();

       // 5. Calculate weighted totals per option
       const totals = new Map<string, number>();
       for (const vote of votes) {
         const current = totals.get(vote.optionId) || 0;
         totals.set(vote.optionId, current + vote.weight);
       }

       // 6. Find winning option
       let winningOption: string | undefined;
       let maxVotes = 0;
       for (const [optionId, total] of totals.entries()) {
         if (total > maxVotes) {
           maxVotes = total;
           winningOption = optionId;
         }
       }

       // 7. Update decision
       await ctx.db.patch(args.decisionId, {
         status: "finalized",
         finalizedAt: Date.now(),
         finalizedBy: identity.subject,
         winningOption,
         updatedAt: Date.now(),
       });

       // 8. Create activity feed entry
       await ctx.db.insert("teamActivityFeed", {
         teamId: decision.teamId,
         organizationId: decision.organizationId,
         actorId: identity.subject,
         actionType: "decision_finalized",
         targetType: "decision",
         targetId: args.decisionId,
         summary: `finalized decision: ${decision.title}`,
         priority: "important",
       });

       return args.decisionId;
     }
   });
   ```

   **Function 4: getTeamDecisions** (query)
   ```typescript
   export const getTeamDecisions = query({
     args: {
       teamId: v.string(),
       status: v.optional(
         v.union(
           v.literal("open"),
           v.literal("closed"),
           v.literal("finalized")
         )
       ),
     },
     returns: v.array(
       v.object({
         _id: v.id("teamDecisions"),
         organizationId: v.string(),
         teamId: v.string(),
         createdBy: v.string(),
         createdByName: v.string(), // Enriched
         title: v.string(),
         description: v.optional(v.string()),
         options: v.array(
           v.object({
             id: v.string(),
             label: v.string(),
             description: v.optional(v.string()),
             voteCount: v.number(), // Calculated
             weightedTotal: v.number(), // Calculated
           })
         ),
         votingType: v.union(v.literal("simple"), v.literal("weighted")),
         status: v.union(
           v.literal("open"),
           v.literal("closed"),
           v.literal("finalized")
         ),
         deadline: v.optional(v.number()),
         finalizedAt: v.optional(v.number()),
         finalizedBy: v.optional(v.string()),
         finalizedByName: v.optional(v.string()), // Enriched
         winningOption: v.optional(v.string()),
         createdAt: v.number(),
         updatedAt: v.number(),
       })
     ),
     handler: async (ctx, args) => {
       // 1. Query decisions
       let decisionsQuery = ctx.db.query("teamDecisions");

       if (args.status) {
         decisionsQuery = decisionsQuery.withIndex("by_team_and_status", (q) =>
           q.eq("teamId", args.teamId).eq("status", args.status)
         );
       } else {
         decisionsQuery = decisionsQuery.withIndex("by_team", (q) =>
           q.eq("teamId", args.teamId)
         );
       }

       const decisions = await decisionsQuery.collect();

       // 2. Get all votes for these decisions (batch)
       const decisionIds = decisions.map(d => d._id);
       const allVotes = await ctx.db
         .query("decisionVotes")
         .withIndex("by_decision")
         .filter((q) =>
           decisionIds.some(id => q.eq(q.field("decisionId"), id))
         )
         .collect();

       // 3. Get unique user IDs (batch)
       const userIds = [
         ...new Set([
           ...decisions.map(d => d.createdBy),
           ...decisions.map(d => d.finalizedBy).filter(Boolean),
         ])
       ];

       // 4. Batch fetch user names (Better Auth adapter)
       const users = await Promise.all(
         userIds.map(userId =>
           ctx.runQuery(components.betterAuth.adapter.findOne, {
             model: "user",
             where: [{ field: "_id", value: userId, operator: "eq" }]
           })
         )
       );

       const userMap = new Map();
       for (const user of users) {
         if (user) {
           userMap.set(user._id, user.name || "Unknown");
         }
       }

       // 5. Enrich decisions with vote counts and user names
       return decisions.map(decision => {
         const votes = allVotes.filter(v => v.decisionId === decision._id);

         const enrichedOptions = decision.options.map(option => {
           const optionVotes = votes.filter(v => v.optionId === option.id);
           const voteCount = optionVotes.length;
           const weightedTotal = optionVotes.reduce((sum, v) => sum + v.weight, 0);

           return {
             ...option,
             voteCount,
             weightedTotal,
           };
         });

         return {
           ...decision,
           createdByName: userMap.get(decision.createdBy) || "Unknown",
           finalizedByName: decision.finalizedBy
             ? userMap.get(decision.finalizedBy) || "Unknown"
             : undefined,
           options: enrichedOptions,
         };
       });
     }
   });
   ```

   **Function 5: getDecisionVotes** (query)
   ```typescript
   export const getDecisionVotes = query({
     args: {
       decisionId: v.id("teamDecisions"),
     },
     returns: v.array(
       v.object({
         _id: v.id("decisionVotes"),
         decisionId: v.id("teamDecisions"),
         userId: v.string(),
         userName: v.string(), // Enriched
         optionId: v.string(),
         weight: v.number(),
         comment: v.optional(v.string()),
         votedAt: v.number(),
       })
     ),
     handler: async (ctx, args) => {
       // 1. Get votes
       const votes = await ctx.db
         .query("decisionVotes")
         .withIndex("by_decision", (q) => q.eq("decisionId", args.decisionId))
         .collect();

       // 2. Get unique user IDs (batch)
       const userIds = [...new Set(votes.map(v => v.userId))];

       // 3. Batch fetch user names
       const users = await Promise.all(
         userIds.map(userId =>
           ctx.runQuery(components.betterAuth.adapter.findOne, {
             model: "user",
             where: [{ field: "_id", value: userId, operator: "eq" }]
           })
         )
       );

       const userMap = new Map();
       for (const user of users) {
         if (user) {
           userMap.set(user._id, user.name || "Unknown");
         }
       }

       // 4. Enrich votes with user names
       return votes.map(vote => ({
         ...vote,
         userName: userMap.get(vote.userId) || "Unknown",
       }));
     }
   });
   ```

3. **Quality:**
   - All functions have args + returns validators
   - All queries use withIndex()
   - Better Auth adapter used for user enrichment
   - Batch fetching to avoid N+1 queries
   - Type check passes
   - Run: `npx -w packages/backend convex codegen`

4. **Testing:**
   - Test in Convex dashboard:
     - createDecision → verify decision created
     - castVote → verify vote recorded with correct weight
     - castVote again (same user) → verify vote updated (not duplicated)
     - getTeamDecisions → verify vote counts calculated correctly
     - finalizeDecision → verify winning option determined

---

### US-P9-027: Create Voting Card Component (4h, was 3h)

**Purpose:** UI component for displaying and interacting with team decisions.

**File Paths:**
- Create: `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/voting-card.tsx`
- Create: `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/voting-list.tsx`

**Dependencies:**
- Component: `Card` from shadcn/ui
- Component: `Progress` from shadcn/ui (vote bars)
- Component: `RadioGroup` from shadcn/ui (option selection)
- Component: `Badge` from shadcn/ui
- Component: `Dialog` from shadcn/ui (finalize confirmation)
- Icons: `Trophy`, `CheckCircle`, `Clock` from lucide-react
- Library: `date-fns` for countdown

**Acceptance Criteria:**

1. **File Creation:**
   - Create `voting-card.tsx` component
   - Create `voting-list.tsx` component (list view wrapper)

2. **Props:**
   ```typescript
   type VotingCardProps = {
     decisionId: Id<"teamDecisions">;
     organizationId: string;
     currentUserId: string;
     isHeadCoach: boolean; // Can finalize?
   }
   ```

3. **Data Fetching:**
   - Query: `getTeamDecisions(teamId, status: "open")`
   - Query: `getDecisionVotes(decisionId)`
   - Real-time updates via useQuery

4. **Card Layout:**
   - Header:
     - Decision title
     - Status badge (Open/Closed/Finalized)
     - Created by: "[Coach Name]"
     - Relative timestamp (e.g., "2 hours ago")
   - Deadline (if set):
     - Countdown: "Voting closes in 2 days"
     - Or past: "Voting closed 1 day ago"
   - Description (if provided)
   - Options list

5. **Options Display:**
   - Each option shows:
     - Radio button (if decision open and user hasn't voted)
     - OR checkmark icon (if user voted for this option)
     - Option label
     - Vote visualization:
       - Vote count: "5 votes" (simple) or "7.5 points" (weighted)
       - Percentage bar (Progress component)
       - Percentage text: "45%"
     - If finalized and winning option:
       - Trophy icon
       - Green highlight background

6. **Voting Interaction:**
   - If decision open and user hasn't voted:
     - Show RadioGroup for option selection
     - "Cast Vote" button (disabled until option selected)
     - Optional comment textarea
     - Click "Cast Vote":
       - Show loading spinner on button
       - Call `castVote` mutation
       - Optimistic update: highlight selected option
       - On success: show success toast, refresh votes
       - On error: revert optimistic update, show error toast
   - If user already voted:
     - Show selected option with checkmark
     - "Change Vote" button (allows re-voting)

7. **Finalize Button:**
   - Only visible if:
     - Current user is head coach/admin (isHeadCoach prop)
     - AND decision status is "open"
   - Click "Finalize Decision":
     - Show confirmation dialog:
       - Title: "Finalize Decision?"
       - Message: "This will close voting and select the winning option. This cannot be undone."
       - Cancel button
       - Confirm button (danger variant)
     - On confirm:
       - Call `finalizeDecision` mutation
       - Show loading state
       - On success: show winning option with trophy, refresh
       - On error: show error toast

8. **Finalized State:**
   - Show winning option highlighted (green background)
   - Trophy icon next to winning option
   - "Finalized by [Coach Name] on [Date]"
   - Disable voting interactions

9. **Loading State:**
   - While decision/votes loading: CardSkeleton

10. **Empty State:**
    - No decisions: "No team decisions yet" with CheckSquare icon

11. **Responsive:**
    - Full width on mobile
    - Progress bars adapt to container width

12. **Quality:**
    - Type check passes
    - Visual verification: votes cast, bars update, finalize works
    - Test finalize confirmation dialog
    - Test optimistic updates revert on error

**Testing:**
- Create decision with 3 options
- Cast vote (verify bar updates, percentage calculates correctly)
- Change vote (verify new option selected, old vote removed)
- Finalize decision (verify winning option determined correctly)
- Test weighted voting (head coach vote worth 2x)

---

### US-P9-028: Create Command Palette (4h, was 2h)

**Purpose:** Cmd+K command palette for quick navigation and actions.

**File Paths:**
- Create: `apps/web/src/components/coach/command-palette.tsx`
- Create: `apps/web/src/hooks/use-command-palette.ts`
- Modify: `apps/web/src/app/orgs/[orgId]/coach/layout.tsx` (integrate palette)

**Dependencies:**
- **Library:** `cmdk` from shadcn/ui (NOT custom implementation)
- Install: `npx shadcn@latest add command`
- Component: `Dialog` from shadcn/ui
- Hook: `useRouter` from next/navigation
- Hook: Custom `useHotkeys` or `useEffect` for keyboard listener

**Acceptance Criteria:**

1. **Install cmdk:**
   ```bash
   npx shadcn@latest add command
   ```

2. **File Creation:**
   - Create `command-palette.tsx` component
   - Create `use-command-palette.ts` hook

3. **Keyboard Trigger:**
   - Opens with Cmd+K (Mac) or Ctrl+K (Windows/Linux)
   - Closes with Escape or clicking outside
   - Global shortcut (works from any page under /coach/*)
   - Shortcut disabled when typing in input/textarea

4. **Command Palette UI:**
   - Modal dialog (full screen on mobile, centered on desktop)
   - Input field with autofocus
   - Placeholder: "Type a command or search..."
   - Fuzzy search across all items
   - Keyboard navigation: Arrow Up/Down, Enter to select, Escape to close

5. **Command Sections:**

   **Section 1: Quick Actions**
   - "New Voice Note" → navigate to `/coach/voice-notes/new`
   - "View Team Hub" → navigate to `/coach/team-hub`
   - "Session Plans" → navigate to `/coach/session-plans`
   - "View Players" → navigate to `/coach/players`
   - Icon for each action

   **Section 2: Navigation** (all coach routes)
   - "Voice Notes" → `/coach/voice-notes`
   - "Team Hub" → `/coach/team-hub`
   - "Players" → `/coach/players`
   - "Teams" → `/coach/teams`
   - "Session Plans" → `/coach/session-plans`
   - "Settings" → `/coach/settings`
   - Icon for each route

   **Section 3: Recent Players**
   - Last 10 players from recent voice notes
   - Query: `getVoiceNotesByCoach`, extract unique players
   - Format: "[Player Name] - [Age Group]"
   - Navigate to player passport on select

6. **Empty State:**
   - No matches: "No results found for '[query]'"

7. **Loading State:**
   - While fetching recent players: Show skeleton items

8. **Integration:**
   - Add to coach layout.tsx
   - Provider wrapper for global state
   - Hook: `useCommandPalette()` returns `{ open, setOpen }`

9. **Quality:**
   - Type check passes
   - Visual verification: opens with Cmd+K, search works, navigation works
   - Test keyboard navigation (arrows, enter, escape)
   - Test on Mac and Windows (Cmd vs Ctrl)

**Testing:**
- Press Cmd+K (palette opens)
- Type "voice" (shows voice-related commands)
- Arrow down, press Enter (navigates to selected command)
- Press Escape (closes palette)
- Open while typing in input (shortcut doesn't trigger)

---

### US-P9-029: Add Global Keyboard Shortcuts (2h, was 1h)

**Purpose:** Global keyboard shortcuts for productivity.

**File Paths:**
- Modify: `apps/web/src/app/orgs/[orgId]/coach/layout.tsx` (add shortcuts)
- Create: `apps/web/src/components/coach/keyboard-shortcuts-help.tsx` (help modal)

**Dependencies:**
- **Library:** `react-hotkeys-hook`
- Install: `npm install react-hotkeys-hook`
- Component: `Dialog` from shadcn/ui (for help modal)
- Component: `Kbd` from shadcn/ui (keyboard key display)

**Shortcuts:**
- `Cmd/Ctrl+K` → Open command palette (already in US-P9-028)
- `K` → New voice note (navigate to `/coach/voice-notes/new`)
- `C` → Focus comment input (if on page with comments)
- `N` → Next item (in list views - scroll to next item)
- `P` → Previous item (in list views - scroll to previous item)
- `?` → Show keyboard shortcuts help dialog
- `Escape` → Close modals/dialogs

**Acceptance Criteria:**

1. **Install Library:**
   ```bash
   npm install react-hotkeys-hook
   ```

2. **File Creation:**
   - Create `keyboard-shortcuts-help.tsx` component
   - Modify `coach/layout.tsx` to add shortcuts

3. **Shortcut Implementation:**
   ```typescript
   import { useHotkeys } from 'react-hotkeys-hook';

   // In coach layout.tsx
   useHotkeys('k', (e) => {
     e.preventDefault();
     router.push('/coach/voice-notes/new');
   }, { enableOnFormTags: false }); // Disabled in inputs

   useHotkeys('?', (e) => {
     e.preventDefault();
     setShowHelp(true);
   });

   // etc. for other shortcuts
   ```

4. **Shortcuts Disabled When:**
   - User is typing in input/textarea/contenteditable
   - Modal/dialog is open (except Escape)
   - Use `enableOnFormTags: false` option

5. **Help Modal:**
   - Opens with `?` shortcut
   - Title: "Keyboard Shortcuts"
   - Sections:
     - **Navigation**
       - Cmd+K: Open command palette
       - N/P: Next/Previous item
     - **Actions**
       - K: New voice note
       - C: Focus comment
     - **Views**
       - (List view-specific shortcuts)
     - **Help**
       - ?: Show this help
       - Escape: Close dialogs
   - Each shortcut shows:
     - Key visualization (Kbd component)
     - Description
   - Platform-aware: Show "Cmd" on Mac, "Ctrl" on Windows
   - Close button + Escape to close

6. **Platform Detection:**
   ```typescript
   const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
   const modifierKey = isMac ? '⌘' : 'Ctrl';
   ```

7. **Quality:**
   - Type check passes
   - Visual verification: all shortcuts work, help modal displays
   - Test on Mac and Windows
   - Test shortcuts don't fire when typing in inputs

**Testing:**
- Press K (navigates to new voice note)
- Type in search box, press K (shortcut doesn't fire)
- Press ? (help modal opens)
- Press Escape (help modal closes)
- Test Cmd+K vs Ctrl+K on different platforms

---

### US-P9-030: Add Comment Threading UI (4h, was 2h)

**Purpose:** Enable nested replies to comments.

**File Paths:**
- Modify: `packages/backend/convex/schema.ts` (add parentCommentId - see Schema Changes)
- Modify: `packages/backend/convex/models/teamCollaboration.ts` (update addComment)
- Modify: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insight-comments.tsx` (recursive rendering)
- Modify: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/comment-form.tsx` (reply mode)

**Dependencies:**
- Component: `Button` from shadcn/ui (reply button)
- Icons: `Reply`, `X` from lucide-react

**Acceptance Criteria:**

1. **Schema Changes:**
   - Add `parentCommentId` to `insightComments` table (see Schema Changes section)
   - Add `by_parent` index
   - Run schema migration

2. **Backend Changes:**

   **Modify addComment mutation:**
   ```typescript
   export const addComment = mutation({
     args: {
       insightId: v.id("voiceNoteInsights"),
       content: v.string(),
       priority: v.union(v.literal("critical"), v.literal("important"), v.literal("normal")),
       mentions: v.optional(v.array(v.string())),
       parentCommentId: v.optional(v.id("insightComments")), // NEW
     },
     returns: v.id("insightComments"),
     handler: async (ctx, args) => {
       // ... existing logic ...

       // NEW: Validate parent comment exists and belongs to same insight
       if (args.parentCommentId) {
         const parentComment = await ctx.db.get(args.parentCommentId);
         if (!parentComment) {
           throw new Error("Parent comment not found");
         }
         if (parentComment.insightId !== args.insightId) {
           throw new Error("Parent comment belongs to different insight");
         }
       }

       // Insert comment with parentCommentId
       const commentId = await ctx.db.insert("insightComments", {
         // ... existing fields ...
         parentCommentId: args.parentCommentId, // NEW
       });

       // ... existing activity feed logic ...

       return commentId;
     }
   });
   ```

   **Update getInsightComments query:**
   - Return all comments (flat list with parentCommentId)
   - Frontend will build tree structure
   - No changes needed to query (just return parentCommentId field)

3. **Frontend Changes:**

   **insight-comments.tsx:**
   ```typescript
   // Recursive CommentItem component
   type CommentItemProps = {
     comment: CommentWithMeta;
     depth: number; // 0 = top-level, 1 = reply, 2 = nested reply
     maxDepth: number; // 3 = max nesting
     onReply: (commentId: string) => void;
   };

   function CommentItem({ comment, depth, maxDepth, onReply }: CommentItemProps) {
     const replies = comments.filter(c => c.parentCommentId === comment._id);
     const canReply = depth < maxDepth;

     return (
       <div style={{ marginLeft: depth > 0 ? '16px' : '0' }}>
         {depth > 0 && (
           <div style={{ borderLeft: '2px solid var(--muted)', paddingLeft: '12px' }}>
         )}

         {/* Comment content */}
         <div>
           <div className="flex items-center gap-2">
             <Avatar>...</Avatar>
             <span>{comment.userName}</span>
             <span className="text-muted-foreground">{relativeTime}</span>
           </div>
           <p>{comment.content}</p>

           {/* Reply button */}
           {canReply && (
             <Button variant="ghost" size="sm" onClick={() => onReply(comment._id)}>
               <Reply className="h-3 w-3 mr-1" />
               Reply
             </Button>
           )}
         </div>

         {/* Recursive replies */}
         {replies.length > 0 && (
           <div className="mt-2">
             {replies.map(reply => (
               <CommentItem
                 key={reply._id}
                 comment={reply}
                 depth={depth + 1}
                 maxDepth={maxDepth}
                 onReply={onReply}
               />
             ))}
           </div>
         )}

         {depth > 0 && </div>}
       </div>
     );
   }

   // Build comment tree
   const topLevelComments = comments.filter(c => !c.parentCommentId);
   ```

   **comment-form.tsx:**
   ```typescript
   type CommentFormProps = {
     insightId: Id<"voiceNoteInsights">;
     organizationId: string;
     replyingTo?: {
       commentId: Id<"insightComments">;
       userName: string;
     }; // NEW
     onCancelReply?: () => void; // NEW
   };

   // If replyingTo is set:
   // - Show "Replying to @username" header
   // - Show X button to cancel reply
   // - Pass parentCommentId to addComment mutation
   ```

4. **Threading Rules:**
   - Max depth: 3 levels (top-level → reply → nested reply)
   - Beyond 3 levels: "Reply" button disabled, show "Max thread depth reached"
   - Indentation: 16px per level
   - Border-left on replies: 2px solid muted

5. **Quality:**
   - Type check passes
   - Run: `npx -w packages/backend convex codegen`
   - Visual verification: threading works, indentation correct
   - Test 3-level nesting (verify 4th level disabled)

**Testing:**
- Add top-level comment
- Click "Reply" (comment form shows "Replying to @User")
- Add reply (appears indented below parent)
- Click "Reply" on reply (nested reply)
- Click "Reply" on nested reply (verify disabled or shows max depth message)

---

### US-P9-031: Add Loading Skeletons (2h)

**Purpose:** Loading states for all new views.

**File Paths:**
- Create: `apps/web/src/components/loading/board-skeleton.tsx`
- Create: `apps/web/src/components/loading/calendar-skeleton.tsx`
- Reuse: `apps/web/src/components/loading/list-skeleton.tsx` (already exists)

**Dependencies:**
- Component: Existing skeleton patterns
- Animation: `animate-pulse` from Tailwind

**Acceptance Criteria:**

1. **BoardSkeleton:**
   - 3 columns
   - Each column: header + 3 CardSkeleton items
   - Shimmer animation

2. **CalendarSkeleton:**
   - Month grid (7 × 6)
   - Each cell: shimmer box
   - Header: shimmer text

3. **Reuse Existing:**
   - ListSkeleton for list view: `<ListSkeleton items={5} />`
   - ListSkeleton for player view: `<ListSkeleton items={5} />`

4. **Quality:**
   - Type check passes
   - Consistent shimmer animation across all skeletons
   - Responsive (adapt to container)

---

### US-P9-032: Add Empty States (2h, was 1h)

**Purpose:** Friendly empty states for all views.

**File Paths:**
- Modify views to add empty states (insights-board-view, insights-calendar-view, etc.)
- Use existing `Empty` component from shadcn/ui

**Dependencies:**
- Component: `Empty`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription` from shadcn/ui
- Icons: `Inbox`, `Calendar`, `Users`, `CheckSquare` from lucide-react

**Acceptance Criteria:**

1. **Board View Empty States:**
   - Per column: "No [status] insights yet"
   - Icon: Inbox
   - Light gray background

2. **Calendar View Empty State:**
   - No insights in month: "No insights recorded this month"
   - Icon: Calendar
   - Click day with no insights: "No insights on this day"

3. **Player View Empty States:**
   - No players: "No player insights yet" with Users icon
   - Search no results: "No players found matching '[query]'"

4. **Voting Empty State:**
   - No decisions: "No team decisions yet"
   - Icon: CheckSquare
   - "Create Decision" button (if head coach)

5. **Consistent Styling:**
   - All use `Empty` component
   - Centered layout
   - Icon + title + description
   - Optional CTA button

6. **Quality:**
   - Type check passes
   - Visual verification: all empty states display correctly

---

### US-P9-033: Extend coachOrgPreferences (View) (1h)

**Purpose:** Add view preference field to schema.

**File Paths:**
- Modify: `packages/backend/convex/schema.ts`

**Acceptance Criteria:**

1. **Schema Change:**
   - Add `teamInsightsViewPreference` field (see Schema Changes section)
   - Default: "list"

2. **Migration:**
   - Additive change (optional field)
   - No data migration needed
   - Existing records: field will be undefined → defaults to "list"

3. **Quality:**
   - Schema compiles
   - Run: `npx -w packages/backend convex dev` (applies schema)
   - Type check passes
   - Run: `npx -w packages/backend convex codegen`

---

### US-P9-025b: Add Real-Time Collaboration to Session Editor (2h)

**Purpose:** Add presence indicators and auto-save to existing session plan editor.

**File Paths:**
- Modify: `apps/web/src/app/orgs/[orgId]/coach/session-plans/[planId]/page.tsx`
- Create: `packages/backend/convex/models/sessionPlanPresence.ts`

**Backend (Optional - Use Existing Presence Pattern):**
- Reuse presence pattern from Week 1 (teamMemberPresence table)
- OR create sessionPlanPresence table (similar structure)

**Acceptance Criteria:**

1. **Presence Indicators:**
   - Show avatars of coaches currently viewing/editing plan
   - Use existing presence pattern from Week 1
   - Update presence on mount, unmount, every 30s
   - Expire presence after 60s of inactivity

2. **Auto-Save:**
   - Debounce: 300ms after last edit
   - Show "Saving..." indicator while saving
   - Show "Saved" checkmark on success
   - Show error toast on failure
   - Don't navigate away if unsaved changes (confirm dialog)

3. **Conflict Detection (Simple):**
   - Last-write-wins strategy (no operational transform for MVP)
   - If another user edits: show toast "Another coach is editing this plan"
   - Don't block edits, just warn

4. **Quality:**
   - Type check passes
   - Visual verification: presence shows, auto-save works
   - Test with 2 coaches editing same plan (different browsers)

---

### US-P9-045: Create Swipeable Insight Card (3h, was 2h)

**Purpose:** Mobile swipe gestures for apply/dismiss actions.

**File Paths:**
- Create: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/swipeable-insight-card.tsx`

**Dependencies:**
- **Library:** `framer-motion`
- Install: `npm install framer-motion`
- Mobile detection: `window.matchMedia('(max-width: 768px)')`
- Haptic: `window.navigator.vibrate()` (if available)

**Acceptance Criteria:**

1. **Install Library:**
   ```bash
   npm install framer-motion
   ```

2. **File Creation:**
   - Create `swipeable-insight-card.tsx`
   - Wraps existing insight card component

3. **Swipe Detection:**
   - Mobile only (disabled on desktop ≥768px)
   - Uses framer-motion `<motion.div>` with `drag="x"`
   - Swipe threshold: 100px

4. **Visual Feedback:**
   - While dragging:
     - Swipe RIGHT: green overlay fades in
     - Swipe LEFT: red overlay fades in
     - Icon follows finger: ✓ (right), ✗ (left)
   - On release:
     - If threshold met: complete action (apply/dismiss)
     - If threshold not met: spring back to center

5. **Actions:**
   - Swipe RIGHT (>100px) → Apply insight
   - Swipe LEFT (<-100px) → Dismiss insight
   - Call existing mutations (updateInsightStatus)

6. **Haptic Feedback:**
   - On action complete: vibrate(50) (if supported)
   - Check: `'vibrate' in navigator`

7. **Accessibility:**
   - Swipe not required (buttons still visible)
   - Screen readers: ignore swipe interactions

8. **Quality:**
   - Type check passes
   - Visual verification on mobile: swipe works, animations smooth
   - Test on iOS Safari and Android Chrome

**Testing:**
- Open on mobile device
- Swipe insight card right (verify green overlay, apply action)
- Swipe insight card left (verify red overlay, dismiss action)
- Swipe halfway and release (verify springs back)

---

### US-P9-046: Add Long-Press Quick Actions (2h, was 1h)

**Purpose:** Long-press context menu for quick actions.

**File Paths:**
- Create: `apps/web/src/hooks/use-long-press.ts`
- Modify: `swipeable-insight-card.tsx` (add long-press)

**Dependencies:**
- Component: `DropdownMenu` from shadcn/ui
- Custom hook: `use-long-press.ts`

**Acceptance Criteria:**

1. **File Creation:**
   - Create `use-long-press.ts` hook

2. **Long-Press Hook:**
   ```typescript
   export function useLongPress(
     onLongPress: () => void,
     delay = 500
   ) {
     // Detect 500ms press on touch or mouse
     // Return handlers: onMouseDown, onMouseUp, onTouchStart, onTouchEnd
   }
   ```

3. **Long-Press Detection:**
   - 500ms delay
   - Works on touch AND mouse
   - Cancel on move (if finger/cursor moves >10px)

4. **Context Menu:**
   - Opens DropdownMenu on long-press
   - Menu options:
     - "Apply Insight" (✓ icon)
     - "Dismiss Insight" (✗ icon)
     - "Add Comment" (💬 icon)
     - "@Mention Coach" (@ icon)
     - "Cancel" (closes menu)
   - Clicking option executes action
   - Clicking outside dismisses menu

5. **Haptic Feedback:**
   - On menu open: vibrate(50) (mobile only)

6. **Quality:**
   - Type check passes
   - Visual verification: long-press opens menu, actions execute
   - Test on desktop and mobile

**Testing:**
- Long-press insight card (500ms)
- Verify menu opens
- Click "Apply Insight" (verify insight applied)
- Long-press and move finger (verify menu doesn't open)

---

### US-P9-047: Add Touch Target Optimization (0.5h)

**Purpose:** Ensure all interactive elements meet 44×44px minimum.

**File Paths:**
- Modify: Global CSS or component styles

**Acceptance Criteria:**

1. **Button Sizes:**
   - All buttons: min 44px × 44px
   - Small buttons: add padding to reach 44×44

2. **Checkboxes/Radio:**
   - Input: 24px × 24px
   - Clickable area (padding): 10px around input
   - Total: 44px × 44px

3. **Remove Tap Highlight:**
   ```css
   * {
     -webkit-tap-highlight-color: transparent;
   }
   ```

4. **Quality:**
   - Visual verification: all interactive elements easy to tap
   - Test on mobile device

---

### US-P9-048: Add Gesture Customization Settings (0.5h)

**Purpose:** Settings page for gesture preferences.

**File Paths:**
- Create: `apps/web/src/app/orgs/[orgId]/coach/settings/gesture-preferences.tsx`

**Dependencies:**
- Component: `Select` from shadcn/ui
- Component: `Switch` from shadcn/ui
- Modify: `coachOrgPreferences` schema (add gesture fields)

**Schema Changes:**
```typescript
coachOrgPreferences: {
  // ... existing fields ...
  gesturesEnabled: v.optional(v.boolean()), // Default: true
  swipeRightAction: v.optional(v.union(
    v.literal("apply"),
    v.literal("dismiss"),
    v.literal("disabled")
  )), // Default: "apply"
  swipeLeftAction: v.optional(v.union(
    v.literal("apply"),
    v.literal("dismiss"),
    v.literal("disabled")
  )), // Default: "dismiss"
}
```

**Acceptance Criteria:**

1. **Settings UI:**
   - Section: "Mobile Gestures"
   - Toggle: "Enable swipe gestures"
   - Dropdown: "Swipe Right Action" (Apply / Dismiss / Disabled)
   - Dropdown: "Swipe Left Action" (Apply / Dismiss / Disabled)
   - Save button

2. **Save Preferences:**
   - Call `updateCoachOrgPreference` mutation
   - Show success toast

3. **Quality:**
   - Type check passes
   - Visual verification: preferences save and apply

---

## 🎯 Success Criteria

Week 3 complete when:

- ✅ All 4 view types work (list, board, calendar, players)
- ✅ Team decisions voting works (create, vote, finalize)
- ✅ Command palette opens with Cmd+K
- ✅ Keyboard shortcuts work (K, C, N, P, ?)
- ✅ Comment threading works (3 levels deep)
- ✅ Mobile swipe gestures work on iOS + Android
- ✅ All views have skeletons + empty states
- ✅ Session editor has real-time collaboration
- ✅ All 16 stories have `passes: true` in prd.json
- ✅ Type check passes
- ✅ Visual verification complete for all UI changes

---

## 📅 Implementation Order (9 Days)

**Day 1: Schema Changes (3h)**
- US-P9-033: Extend Preferences (1h)
- US-P9-030: Comment Threading Backend (2h)

**Day 2: Backend (8h)**
- US-P9-026: Team Decisions Backend (5h)
- US-P9-030: Comment Threading UI (3h)

**Day 3-4: Multi-View (11h)**
- US-P9-019: InsightsView Container (3h)
- US-P9-020: InsightsBoardView (4h)
- US-P9-022: InsightsPlayerView (4h)

**Day 5: Calendar (5h)**
- US-P9-021: InsightsCalendarView (5h)

**Day 6: Voting UI (4h)**
- US-P9-027: Voting Card Component (4h)

**Day 7: Command Palette (6h)**
- US-P9-028: Command Palette (4h)
- US-P9-029: Keyboard Shortcuts (2h)

**Day 8: Mobile (5h)**
- US-P9-045: Swipeable Cards (3h)
- US-P9-046-048: Long-Press + Touch (2h)

**Day 9: Polish (4h)**
- US-P9-031: Loading Skeletons (2h)
- US-P9-032: Empty States (1h)
- US-P9-025b: Session Collab (1h)

---

## 🔧 Libraries to Install

```bash
# Command Palette
npx shadcn@latest add command

# Keyboard Shortcuts
npm install react-hotkeys-hook

# Mobile Gestures
npm install framer-motion
```

---

## 📚 Integration Points

**Multi-View Insights:**
- Integrates with: insights-tab.tsx (replace single view)
- Uses: InsightReactions (Week 1), SmartActionBar (Week 2)
- Preserves: Comment form (Week 2), Apply/dismiss actions

**Comment Threading:**
- Modifies: insight-comments.tsx, comment-form.tsx
- Backend: addComment mutation (add parentCommentId arg)

**Command Palette:**
- Integrates with: coach/layout.tsx (global)
- Uses: All coach routes (navigation)

**Team Decisions:**
- Integrates with: team-hub/page.tsx (new tab)
- Creates: Activity feed entries (voting events)

**Mobile Gestures:**
- Wraps: Insight cards (insights-tab.tsx)
- Uses: Existing mutations (updateInsightStatus)

---

## ⚠️ Risk Mitigation

**High Risk:**
1. **Calendar Performance:** Lazy load days, limit insights per day to 10
2. **Threading Schema Change:** Test on dev first, additive change (safe)
3. **Real-Time Collab:** Last-write-wins for MVP, add OT later
4. **Weighted Voting:** Define weight calculation upfront (2.0 / 1.0 / 0.5)

**Medium Risk:**
5. **Command Palette:** Use battle-tested cmdk from shadcn
6. **Mobile Gestures:** Test on iOS + Android, use framer-motion

---

## 📝 Notes

**Session Planning Already Exists:**
- DO NOT rebuild US-P9-023, US-P9-024
- Session editor at `/coach/session-plans/[planId]` already has full CRUD
- Only add real-time collaboration (US-P9-025b)

**Team Decisions vs Plan Voting:**
- Team decisions: Vote on lineup, tactics, team policies
- Plan voting: Already exists (like/dislike on session plans)
- These are separate features with separate schemas

**Comment Threading:**
- Max 3 levels to prevent deep nesting
- Recursive component pattern for rendering
- Optional field (safe additive change)

---

**Document Version:** 2.0 (Revised)
**Created:** January 31, 2026
**Status:** Ready for Implementation
