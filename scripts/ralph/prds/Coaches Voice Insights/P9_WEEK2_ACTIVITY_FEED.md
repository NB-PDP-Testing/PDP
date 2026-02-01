# Phase 9 Week 2: Activity Feed, @Mentions, Notifications + AI Copilot UI

**Branch:** `ralph/team-collaboration-hub-p9`
**Stories:** 10 stories (US-P9-009 to US-P9-018, US-P9-041 to US-P9-044)
**Effort:** ~18 hours
**Prerequisite:** Week 1 complete

---

## Week 2 Deliverables

- Real-time activity feed showing all team actions
- @mention coaches in comments with smart autocomplete
- Priority-based notification system (Critical/Important/Normal)
- **AI Copilot UI with one-click smart actions**
- Notification preferences

---

## User Stories

### US-P9-009: Implement Activity Feed Backend (2h)
- `getTeamActivityFeed` query with priority filtering
- Support teamId, organizationId filters
- Use compound index `by_team_priority`
- Limit 50 default, max 100

### US-P9-010: Create ActivityFeedView Component (2h)
- Chronological display
- Actor avatar, summary, timestamp, icon color-coded
- ListSkeleton while loading
- Real-time updates

### US-P9-011: Add Activity Feed Filters (2h)
- Tabs: All, Insights, Comments, Reactions, Sessions, Votes
- Count badges
- URL persistence (?filter=insights)

### US-P9-012: Add @Mention Autocomplete (3h)
- Detect @ typing
- Dropdown with coaches
- Keyboard navigation
- Insert @mention on select

### US-P9-013: Smart Mention Autocomplete (2h)
- Contextual suggestions
- Injury → medical staff first
- Player → recent observers first

### US-P9-014: Extend coachOrgPreferences (Notifications) (1h)
- Add notificationPreferences field
- Add digestTime, quietHours fields

### US-P9-015: Create NotificationCenter Component (3h)
- Bell icon with badge
- Priority-grouped dropdown
- Critical → red, Important → yellow, Normal → gray
- Click navigates to target

### US-P9-016: Add Notification Preferences UI (2h)
- Settings section: Notification Preferences
- 3 levels × 3 channels (Push, Email, Digest)
- Digest time picker
- Quiet hours toggle

### US-P9-017: Create InsightReactions Component (1h)
- 3 buttons: 👍 Like, 🌟 Helpful, 🚩 Flag
- Active state if user reacted
- Tooltip shows who reacted

### US-P9-018: addComment Creates Activity Entries (1h)
- Modify addComment mutation
- Insert teamActivityFeed entry after comment
- Summary: "[Name] commented on [Player]'s insight"

---

## NEW: AI Copilot Stories

### US-P9-041: Create AI Copilot Backend Model (2h)
- Create `packages/backend/convex/models/aiCopilot.ts`
- `getSmartSuggestions` query
- Support 4 contexts: viewing_insight, creating_session, viewing_activity, viewing_player_passport

### US-P9-042: Implement Insight Context Suggestions (3h)
- `generateInsightSuggestions` function
- 5 suggestion types: apply, @mention, add to session, create task, link to observation
- Return top 4 sorted by confidence

### US-P9-043: Implement Session Planning Suggestions (2h)
- `generateSessionSuggestions` function
- Auto-suggest: injury checks, focus areas, equipment
- Return top 3 sorted by confidence

### US-P9-044: Create SmartActionBar Component (2h)
- UI component showing AI suggestions
- One-click action execution
- Loading states, tooltips with reasoning
- Mobile responsive

---

## Success Criteria

Week 2 complete when:
- ✅ Activity feed shows real-time team activity
- ✅ @mentions work with autocomplete
- ✅ Notifications grouped by priority
- ✅ **AI Copilot suggestions appear on insights**
- ✅ All quality checks pass

---

**Document Version:** 1.0
**Created:** January 30, 2026
