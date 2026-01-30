# Phase 9 Week 3: Multi-View, Templates, Voting + Mobile Gestures

**Branch:** `ralph/team-collaboration-hub-p9`
**Stories:** 15 stories (US-P9-019 to US-P9-033, US-P9-045 to US-P9-048)
**Effort:** ~28 hours
**Prerequisite:** Week 2 complete

---

## Week 3 Deliverables

- 4 different view layouts: List, Board (kanban), Calendar, Players
- Session plan templates with auto-population
- Democratic voting system
- Command palette (Cmd+K) + keyboard shortcuts
- **Mobile gesture controls (swipe, long-press)**
- Comment threading
- Loading skeletons + empty states for all views

---

## User Stories

### US-P9-019: Create InsightsView Container (2h)
- View type state: list | board | calendar | players
- Toggle buttons (tabs)
- Load/save preference from coachOrgPreferences

### US-P9-020: Create InsightsBoardView (2h)
- 3 columns: Pending, Applied, Dismissed
- Responsive: stack on mobile

### US-P9-021: Create InsightsCalendarView (3h)
- Month grid with insight dots
- Click day → popover with insights
- Uses date-fns

### US-P9-022: Create InsightsPlayerView (2h)
- Grouped by player
- Expand/collapse per player
- Search filter

### US-P9-023: Create Session Templates Backend (2h)
- 3 templates: Pre-Match, Post-Training, Season Planning
- Auto-populate from recent insights (last 7 days)

### US-P9-024: Create Session Templates UI (2h)
- Gallery of 3 template cards
- "Use Template" button

### US-P9-025: Create Session Plan Editor (4h)
- Editable objectives, drills, player notes
- Presence indicators
- Real-time collaborative editing

### US-P9-026: Create Team Decisions Backend (3h)
- Voting system with weighted votes
- `createDecision`, `castVote`, `finalizeDecision` mutations

### US-P9-027: Create Voting Card Component (3h)
- Display decision, options, vote counts
- Cast vote on click
- Finalize button (head coach only)

### US-P9-028: Create Command Palette (2h)
- Opens with Cmd+K
- Fuzzy search
- Sections: Quick Actions, Navigation, Recent Players

### US-P9-029: Add Global Keyboard Shortcuts (1h)
- Cmd+K → palette
- K → new note, C → comment, N/P → navigation
- ? → shortcuts help

### US-P9-030: Add Comment Threading UI (2h)
- Reply button on comments
- Indented replies with border-left
- Recursive rendering

### US-P9-031: Add Loading Skeletons (2h)
- CardSkeleton for all card views
- ListSkeleton for list views
- Custom skeleton for calendar

### US-P9-032: Add Empty States (1h)
- Friendly messages with icons
- Consistent styling

### US-P9-033: Extend coachOrgPreferences (View) (1h)
- Add teamInsightsViewPreference field

---

## NEW: Mobile Gesture Stories

### US-P9-045: Create Swipeable Insight Card (2h)
- Framer Motion swipe animations
- Swipe RIGHT → Apply (green)
- Swipe LEFT → Dismiss (red)
- Haptic feedback

### US-P9-046: Add Long-Press Quick Actions (1h)
- 500ms long-press detection
- Overlay menu: Apply, Comment, @Mention, Cancel

### US-P9-047: Add Touch Target Optimization (0.5h)
- Min 44px × 44px buttons
- 24px checkboxes with 10px padding
- Remove tap highlight

### US-P9-048: Add Gesture Customization Settings (0.5h)
- Settings: Mobile Gestures section
- Dropdowns: Swipe Right/Left actions
- Toggle: Enable/Disable gestures

---

## Success Criteria

Week 3 complete when:
- ✅ All 4 view types work (list, board, calendar, players)
- ✅ Session templates create sessions with auto-populated data
- ✅ Voting system works
- ✅ Command palette opens with Cmd+K
- ✅ **Mobile swipe gestures work on iOS + Android**
- ✅ Comment threading works
- ✅ All views have skeletons + empty states

---

**Document Version:** 1.0
**Created:** January 30, 2026
