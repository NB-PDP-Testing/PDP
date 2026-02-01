# Team Hub - Final Planning Review
**Date:** 2026-02-01
**Phase:** 9 Week 4 Enhanced Team Hub
**Status:** Research Complete - Awaiting User Input

---

## 🎯 Vision Statement

> "Make the team hub page a place where the coaches of a team can get all the info on their team in one place and collab with their fellow coaches"

---

## 📊 Research Summary

### Collaboration Platform Patterns Analyzed

#### 1. Monday.com
- **Activity Stream:** Real-time updates with filtering by type, person, date
- **Quick Actions:** Inline actions (reply, like, mention) without navigation
- **Dashboard Widgets:** Customizable cards showing KPIs, charts, pending items
- **Smart Notifications:** Context-aware suggestions based on activity patterns

#### 2. Asana
- **Team Inbox:** Centralized notifications with "For You" and "Team" tabs
- **Task Dependencies:** Visual indicators showing blockers and relationships
- **Project Overview:** Progress charts, workload distribution, timeline view
- **Collaboration Sidebar:** Comments, attachments, subtasks in single panel

#### 3. Notion
- **Linked Databases:** Multiple views (table, board, calendar, gallery) of same data
- **Inline Relations:** Click entity to see all related items in sidebar
- **Template System:** Quick-create templates for common workflows
- **Block-based Layout:** Modular, draggable sections

#### 4. TeamSnap (Sports-Specific)
- **Roster + Availability:** Player cards showing next game attendance status
- **Quick Message:** In-app messaging to individual players or groups
- **Event Timeline:** Combined view of games, practices, events
- **Health Alerts:** Injury status badges on player cards

#### 5. Heja (Youth Sports)
- **Parent Engagement:** Parent chat visible to coaches, read-only to parents
- **Player Stats Widget:** Top performers, recent assessments, growth charts
- **Team News Feed:** Announcements, photos, achievements in single stream

---

## 🔍 Deep Codebase Analysis

### Data Relationships Discovered

```
team (1) ──→ (many) teamPlayerIdentities ──→ (1) orgPlayerEnrollments
         ├──→ (many) coachAssignments
         ├──→ (many) sessionPlans
         ├──→ (many) voiceNotes (via team filter)
         ├──→ (many) injuries (via player filter)
         ├──→ (many) developmentGoals (via player filter)
         ├──→ (many) teamDecisions
         └──→ (many) teamCollaborationActivity
```

### Integration Gaps Identified

| Feature A | Feature B | Current State | Opportunity |
|-----------|-----------|---------------|-------------|
| Session Plans | Voice Notes | Isolated | Link notes to specific session objectives |
| Voice Notes | Team Hub | Manual navigation | Display recent notes in activity feed |
| Goals | Session Plans | Isolated | Show goal progress in planning tab |
| Injuries | Team Hub | No visibility | Health widget showing active injuries |
| Coach Tasks | Team Hub | Separate page | Inline task creation/completion |
| Team Decisions | Activity Feed | Basic display | Rich decision cards with voting UI |

### Performance Patterns Required

Based on typical coach workload (3 teams × 20 players = 60 entities):

- ✅ **Batch Fetch Pattern:** Already used in coach dashboard for multi-team data
- ✅ **Map Lookup:** Current best practice for enriching related data
- ⚠️ **Pagination:** Not implemented yet - needed for 50+ activity items
- ⚠️ **Virtual Scrolling:** Consider for large rosters (50+ players)
- ✅ **Query Skipping:** Already used when user/org context missing

### Mobile Experience Requirements

From existing responsive patterns:

- **Breakpoints:** `md:` at 768px, `lg:` at 1024px
- **Touch Targets:** Minimum 44px (already followed in SwipeableInsightCard)
- **Navigation:** Drawer pattern for mobile (see notification-center.tsx)
- **Gestures:** Swipe already implemented for insights - can extend to other cards

### UI Component Patterns to Follow

From codebase exploration:

- **Card Layouts:** `rounded-lg border bg-card p-4` (shadcn pattern)
- **Empty States:** Illustration + message + CTA button (see activity-feed-view.tsx)
- **Skeleton Loaders:** `Skeleton` component for async data (used in insights-tab.tsx)
- **Inline Actions:** Icon buttons with tooltips (see context-menu.tsx)
- **Smart Mentions:** `@coach` autocomplete (exists in comment-thread.tsx)

---

## 🤔 Critical Questions for User

### 1. Team Hub Layout Priority

**Question:** What should coaches see FIRST when landing on Team Hub?

**Options:**
- **A. Overview Dashboard** - Quick stats (upcoming games, active injuries, pending tasks) + activity feed
- **B. Player Grid** - Roster cards with health/attendance/recent notes at a glance
- **C. Planning Calendar** - Session plans + games in timeline view
- **D. Activity Stream** - Chronological feed of all team activity (notes, goals, decisions)

**Why it matters:** Determines above-the-fold real estate and initial data fetch strategy.

---

### 2. Collaboration Focus

**Question:** What collaboration features are MOST valuable for coaches working together?

**Rank these (1-5):**
- [ ] **Real-time presence** (see who's viewing team hub right now)
- [ ] **Shared annotations** (coaches can comment on player cards inline)
- [ ] **Task assignment** (assign follow-up tasks to specific coaches)
- [ ] **Decision voting** (team decisions with vote tallies)
- [ ] **Shared session planning** (co-edit session plans simultaneously)

**Why it matters:** Affects backend subscriptions, optimistic updates, and conflict resolution strategy.

---

### 3. Player Health Visibility

**Question:** How should injury/medical info appear in Team Hub?

**Options:**
- **A. Dedicated Widget** - Separate "Health & Safety" card showing all active injuries/alerts
- **B. Player Card Badges** - Inline injury status icon on each affected player's card
- **C. Both** - Widget for overview + badges for at-a-glance scanning
- **D. Alert Bar** - Top banner only when critical injuries exist

**Why it matters:** Medical data is sensitive - affects permissions, UI placement, and parent visibility.

---

### 4. Voice Notes Integration

**Question:** How should voice notes connect to Team Hub?

**Options:**
- **A. Activity Feed** - Recent notes appear in chronological stream (like "John Doe added note about passing drills")
- **B. Player-Linked** - Notes attached to player cards (click player → see all their notes)
- **C. Session-Linked** - Notes tied to specific session plans (click session → see related notes)
- **D. All Three** - Different views for different workflows

**Why it matters:** Determines data fetching (join patterns) and navigation structure.

---

### 5. Planning Tab Depth

**Question:** What should "Planning" tab include?

**Check all that apply:**
- [ ] **Session plans** (existing - list of upcoming/past sessions)
- [ ] **Training calendar** (visual timeline with drag-drop scheduling)
- [ ] **Season overview** (macro view - 12 weeks, game schedule, season goals)
- [ ] **Drill library** (reusable drills coaches can add to sessions)
- [ ] **Goal tracking** (team goals + player development goals in one view)

**Why it matters:** Scope creep risk - affects Week 4 timeline and backend complexity.

---

### 6. Mobile vs Desktop Priority

**Question:** What's the primary device for Team Hub usage?

**Options:**
- **A. Mobile-First** - Coaches will primarily use on sidelines during training (optimize for phone)
- **B. Desktop-First** - Pre/post-session planning happens at home (optimize for laptop)
- **C. Equal** - 50/50 split (responsive design, no compromises)

**Why it matters:** UI layout decisions, touch vs click interactions, data density.

---

### 7. Performance Tolerance

**Question:** How many items before we paginate?

**Context:** Activity feeds can grow large over a season.

**Options:**
- **A. Load All** - Show entire season (100+ items) with virtual scrolling
- **B. Paginate at 50** - "Load More" button after 50 items
- **C. Paginate at 25** - Fast initial load, smaller chunks
- **D. Infinite Scroll** - Auto-load as user scrolls

**Why it matters:** Affects Convex function complexity and real-time subscription costs.

---

### 8. Customization Needs

**Question:** Should Team Hub layout be customizable per coach?

**Options:**
- **A. Fixed Layout** - Same for all coaches (consistency, simpler)
- **B. Tab Preferences** - Coaches can set default tab (Overview vs Players vs Planning)
- **C. Widget Customization** - Coaches can show/hide widgets, reorder cards
- **D. Full Personalization** - Notion-style drag-drop, save custom layouts

**Why it matters:** Personalization adds backend (user preferences table) and frontend (drag-drop state) complexity.

---

## 📋 Week 4 Plan Comparison

### Original Week 4 (7 Stories, ~18 Hours)

| Story | Estimate |
|-------|----------|
| US-P9-052: Overview Dashboard | 3h |
| US-P9-053: Players Tab | 2h |
| US-P9-054: Planning Tab | 2h |
| US-P9-055: Health & Safety Widget | 2h |
| US-P9-056: Recent Activity Feed | 3h |
| US-P9-057: Quick Actions Menu | 2h |
| US-P9-058: Team Settings (Coach View) | 4h |

**Total:** 18 hours

### Enhanced Week 4 (12 Stories, ~35 Hours)

| Story | Estimate | New? |
|-------|----------|------|
| US-P9-052: Overview Dashboard | 4h | ⬆️ Enhanced |
| US-P9-053: Players Tab with Filters | 3h | ⬆️ Enhanced |
| US-P9-054: Planning Tab with Calendar | 4h | ⬆️ Enhanced |
| US-P9-055: Health & Safety Widget | 2h | ✅ Same |
| US-P9-056: Recent Activity Feed | 4h | ⬆️ Enhanced |
| US-P9-057: Quick Actions Menu | 2h | ✅ Same |
| US-P9-058: Team Settings (Coach View) | 4h | ✅ Same |
| **US-P9-059: Inline Coach Tasks** | **3h** | ⭐ **NEW** |
| **US-P9-060: Team Decision Voting** | **3h** | ⭐ **NEW** |
| **US-P9-061: Voice Notes Integration** | **3h** | ⭐ **NEW** |
| **US-P9-062: Session Plan Quick View** | **2h** | ⭐ **NEW** |
| **US-P9-063: Mobile Responsive Layout** | **3h** | ⭐ **NEW** |

**Total:** 37 hours

---

## 🎨 Recommended Week 4 Scope

Based on research and codebase analysis, here's what I recommend:

### Tier 1: MUST HAVE (Core Team Hub)
1. **US-P9-052: Overview Dashboard**
   - Activity feed (last 20 items, paginated)
   - Health widget (active injuries count)
   - Upcoming events widget (next 3 sessions/games)
   - Quick stats (roster size, attendance %)

2. **US-P9-053: Players Tab**
   - Player cards with health badges
   - Filter by status (active/injured/on-break)
   - Click player → navigate to Player Passport

3. **US-P9-056: Recent Activity Feed**
   - Voice notes, goals, decisions, injuries
   - Filter by type
   - Click item → navigate to detail

4. **US-P9-063: Mobile Responsive Layout**
   - Drawer navigation for tabs
   - Touch-friendly cards
   - Responsive breakpoints

### Tier 2: SHOULD HAVE (Enhanced Collaboration)
5. **US-P9-054: Planning Tab**
   - List of upcoming session plans
   - Click to view/edit (existing functionality)
   - Option to add calendar view later

6. **US-P9-060: Team Decision Voting**
   - Display existing decisions in activity feed
   - Vote buttons inline
   - Vote count updates real-time

### Tier 3: NICE TO HAVE (Future Enhancements)
7. **US-P9-059: Inline Coach Tasks**
   - Create tasks from Team Hub
   - Assign to coaches
   - Mark complete without navigation

8. **US-P9-061: Voice Notes Integration**
   - Show recent team notes in activity feed
   - Link to full voice notes page

9. **US-P9-062: Session Plan Quick View**
   - Preview session plan details in modal
   - Avoid full page navigation for quick checks

---

## 🚀 Implementation Strategy

### Phase A: Foundation (Day 1-2)
- Create Team Hub route: `/orgs/[orgId]/coach/teams/[teamId]`
- Tab navigation skeleton (Overview, Players, Planning)
- Responsive layout shell
- Basic data fetching (team, coaches, players)

### Phase B: Overview Tab (Day 2-3)
- Activity feed component (reuse from existing activity-feed-view.tsx)
- Health widget
- Upcoming events widget
- Quick stats

### Phase C: Players Tab (Day 3-4)
- Player grid layout
- Health badges
- Filter controls
- Click navigation

### Phase D: Planning Tab (Day 4-5)
- Session plan list
- Integration with existing session plan editor
- Optional: Calendar view toggle

### Phase E: Polish & Mobile (Day 5)
- Mobile drawer navigation
- Touch interactions
- Loading states
- Empty states

---

## 📊 Success Metrics

How will we know Team Hub is successful?

| Metric | Target |
|--------|--------|
| **Time to find player info** | <5 seconds (vs 15s with navigation) |
| **Coach engagement** | 50%+ of coaches visit Team Hub daily |
| **Mobile usage** | 30%+ of Team Hub views on mobile |
| **Activity feed clicks** | 20%+ click-through to detail views |
| **Collaboration actions** | 10+ team decisions voted per week |

---

## 🔄 Next Steps

**Once you answer the 8 critical questions above, I will:**

1. **Finalize Week 4 Plan** - Adjust stories based on your priorities
2. **Create Detailed Specs** - Write full acceptance criteria + backend function signatures
3. **Update PRD** - Add Team Hub stories to scripts/ralph/prd.json
4. **Begin Implementation** - Start with Phase A foundation

**Estimated Timeline (based on answers):**
- Tier 1 scope: 4-5 days
- Tier 1 + Tier 2: 6-7 days
- Full enhanced plan: 8-10 days

---

## 💡 Key Insights from Research

### What Makes Collaboration Dashboards Successful

1. **Single Source of Truth** - All team info accessible without navigation
2. **Contextual Actions** - Inline actions (reply, complete, vote) reduce friction
3. **Smart Filtering** - Show me "what needs my attention" not "all the data"
4. **Real-Time Updates** - See team activity as it happens (Convex already provides this)
5. **Mobile Parity** - Coaches use phones on the field - mobile can't be an afterthought

### Sports-Specific Learnings

1. **Health First** - Injury status should be impossible to miss
2. **Parent Communication** - Coaches need quick access to parent contact (already have this in Player Passport)
3. **Session Planning** - Most valuable when linked to past observations (voice notes integration)
4. **Team vs Individual** - Balance team-level overview with player-level drill-down

### Our Competitive Advantages

1. ✅ **Real-Time Backend** - Convex subscriptions beat polling-based competitors
2. ✅ **Voice Notes AI** - Unique feature - other platforms lack AI transcription
3. ✅ **Multi-Sport** - TeamSnap/Heja are single-sport focused
4. ✅ **Development Focus** - More than just scheduling (skill tracking, goals, assessments)

---

## ❓ Open Questions for Technical Decisions

1. **Pagination Strategy:** Should we use cursor-based (Convex native) or offset-based (simpler UX)?
2. **Real-Time Updates:** Should activity feed items appear with animation when new items arrive?
3. **Optimistic Updates:** Should vote clicks update UI immediately or wait for server confirmation?
4. **Error Handling:** What should happen if a coach loses connection while viewing Team Hub?
5. **Caching:** Should we cache Team Hub data in React Context to avoid refetch on tab switch?

---

## 📚 Reference Material

- **Research Sources:**
  - Monday.com collaboration patterns
  - Asana project overview design
  - Notion linked databases
  - TeamSnap roster + availability
  - Heja parent engagement model

- **Codebase Patterns:**
  - Activity feed: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/activity-feed-view.tsx`
  - Player cards: `apps/web/src/app/orgs/[orgId]/coach/dashboard/page.tsx`
  - Batch fetch: `packages/backend/convex/models/teamCollaboration.ts` (lines 215-248)
  - Mobile responsive: `apps/web/src/components/coach/notification-center.tsx`
  - Real-time presence: `apps/web/src/app/orgs/[orgId]/coach/session-plans/[planId]/page.tsx`

- **Existing Backend Functions:**
  - `teamCollaboration.getTeamActivityFeed` - Activity stream data
  - `teams.getTeamWithDetails` - Team info with coaches/players
  - `sessionPlans.listByTeam` - Session plans for planning tab
  - `injuries.listByOrg` - Injury data for health widget

---

## ✅ Ready to Proceed

**This planning review is complete. Awaiting your answers to the 8 critical questions to finalize Week 4 scope and begin implementation.**

**Your input will determine:**
- Layout priority (Overview vs Players vs Planning first)
- Collaboration depth (which features get built first)
- Health visibility strategy (widget vs badges vs both)
- Voice notes integration approach (activity feed vs player cards vs session plans)
- Planning tab scope (simple list vs full calendar)
- Mobile vs desktop optimization
- Performance strategy (pagination threshold)
- Customization level (fixed vs flexible layout)

Once you provide answers, I'll update the enhanced Week 4 plan and begin building the Team Hub! 🚀
