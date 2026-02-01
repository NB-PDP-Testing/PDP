# Phase 9: Team Collaboration Hub - Phase Breakdown

**Branch:** `ralph/team-collaboration-hub-p9`
**Total Stories:** 48 stories (~72 hours)
**Duration:** 4 weeks
**Status:** Ready for Ralph execution

---

## 🎯 What Phase 9 Delivers Overall

Phase 9 transforms Voice Notes from a personal tool into a **best-in-class team collaboration platform**. By the end of P9, coaches will be able to:

✅ See who's online and what they're viewing (real-time presence)
✅ Discuss insights with threaded comments and @mentions
✅ React to insights (like, helpful, flag)
✅ Get AI-powered one-click action suggestions (3x faster workflows)
✅ Use mobile gestures to apply/dismiss insights (swipe, long-press)
✅ View insights in 4 different layouts (List, Board, Calendar, Players)
✅ Create collaborative session plans with auto-population from insights
✅ Make democratic decisions with voting system (MVP, lineup, training focus)
✅ Receive priority-based notifications (Critical/Important/Normal)
✅ Access unified Team Hub page with all collaboration features

**Competitive Advantage:** No other sports coaching platform has ANY of these features.

---

## Week 1: Collaboration Foundations + AI Copilot Backend (8 stories, ~15h)

### What Week 1 Delivers

**For Coaches:**
- See who's on the platform and what they're viewing (presence indicators)
- Comment on insights to discuss observations
- React to insights (👍 like, 🌟 helpful, 🚩 flag)
- Backend ready for AI smart suggestions

**Technical Foundation:**
- All database tables created (comments, reactions, activity, presence)
- Real-time presence system working
- Backend model files structured
- AI Copilot backend logic complete

### User Stories (Priority 1-8)

| ID | Story | Effort | Delivers |
|----|-------|--------|----------|
| **US-P9-001** | Create teamCollaboration Backend Model | 2h | Foundation file with Better Auth patterns |
| **US-P9-002** | Create Database Tables | 3h | 4 new tables with indexes (comments, reactions, activity, presence) |
| **US-P9-003** | Implement Presence Backend | 2h | `updatePresence`, `getTeamPresence` queries |
| **US-P9-004** | Create Presence Indicators Component | 2h | See online coaches with avatars (green ring = active) |
| **US-P9-005** | Implement Comment Backend | 2h | `getInsightComments`, `addComment` mutations |
| **US-P9-006** | Implement Reactions Backend | 1h | `toggleReaction`, `getReactions` queries |
| **US-P9-007** | Create InsightComments UI Component | 2h | Display comments with real-time updates |
| **US-P9-008** | Create CommentForm Component | 1h | Post comments with auto-expand textarea |

### NEW AI Copilot Backend (2 stories, 5h)

| ID | Story | Effort | Delivers |
|----|-------|--------|----------|
| **US-P9-041** | Create AI Copilot Backend Model | 2h | `aiCopilot.ts` with context-aware suggestion engine |
| **US-P9-042** | Implement Insight Context Suggestions | 3h | 5 suggestion types: apply, @mention, add to session, create task, link |

### What Coaches Can Do After Week 1

```
Coach Sarah: Opens Team Insights
└─ Sees: "🟢 Coach Neil is viewing Emma's profile"
└─ Views insight: "Emma's tackling improved (4/5)"
   └─ Clicks "Comments" → Types "Great progress! I noticed this too in match."
   └─ Clicks 👍 Like → Reaction count updates in real-time
```

### Week 1 Acceptance Criteria Checklist

- [ ] All 8 database tables exist with indexes
- [ ] Presence indicators show online coaches
- [ ] Comments post and display in real-time
- [ ] Reactions toggle and count updates
- [ ] AI Copilot backend returns suggestions (tested in Convex dashboard)
- [ ] Type check passes
- [ ] All Convex functions use Better Auth adapter pattern
- [ ] Browser verification: presence, comments, reactions all work

---

## Week 2: Activity Feed, @Mentions, Notifications + AI Copilot Frontend (10 stories, ~18h)

### What Week 2 Delivers

**For Coaches:**
- Real-time activity feed showing all team actions
- @mention coaches in comments with smart autocomplete
- Priority-based notification system (injuries = critical, skills = normal)
- AI Copilot UI with one-click smart actions
- Notification preferences (push, email, digest)

**Examples:**

**Activity Feed:**
```
🟡 Coach Neil recorded insight: "Emma - Tackling Improved (4/5)" • 5 min ago
💬 Coach Sarah commented on Emma's insight • 10 min ago
👍 Coach Michael liked insight about team fitness • 15 min ago
🚩 Coach Neil flagged injury insight for Sarah M • 20 min ago (🔴 CRITICAL)
```

**@Mention Autocomplete:**
```
Coach types: "@sar"
Dropdown shows:
┌─────────────────────────────────────┐
│ SUGGESTED                           │
│ 👤 Sarah Murphy (Head Coach)        │
│    Last active: 5 min ago           │
│                                     │
│ ALL TEAM COACHES                    │
│ 👤 Sarah O'Brien (Assistant Coach)  │
│    Last active: 2 hours ago         │
└─────────────────────────────────────┘
```

**AI Copilot Smart Actions:**
```
Viewing insight: "Emma's ankle - Day 2 of monitoring"
┌─────────────────────────────────────────────────────────────┐
│ 🤖 SUGGESTED ACTIONS:                                       │
│ • @mention Sarah Murphy (she's the physio) → [1 click]     │
│ • Create Day 3 follow-up task → [1 click]                  │
│ • Add to Thu session checklist → [1 click]                 │
└─────────────────────────────────────────────────────────────┘
```

### User Stories (Priority 9-18)

| ID | Story | Effort | Delivers |
|----|-------|--------|----------|
| **US-P9-009** | Implement Activity Feed Backend | 2h | `getTeamActivityFeed` query with priority filter |
| **US-P9-010** | Create ActivityFeedView Component | 2h | Real-time chronological activity list |
| **US-P9-011** | Add Activity Feed Filters | 2h | Filter tabs: All, Insights, Comments, Reactions, etc. |
| **US-P9-012** | Add @Mention Autocomplete to CommentForm | 3h | Detect "@", show dropdown, keyboard nav |
| **US-P9-013** | Smart Mention Autocomplete with Context | 2h | Suggested section shows relevant coaches first |
| **US-P9-014** | Extend coachOrgPreferences with Notification Settings | 1h | Schema fields: notificationPreferences, digestTime, quietHours |
| **US-P9-015** | Create NotificationCenter Component | 3h | Bell icon with dropdown, priority grouping |
| **US-P9-016** | Add Notification Preferences to Settings Tab | 2h | Configure push/email/digest per priority level |
| **US-P9-017** | Create InsightReactions Component | 1h | 3 buttons: 👍 Like, 🌟 Helpful, 🚩 Flag |
| **US-P9-018** | Update addComment to Create Activity Entries | 1h | Auto-create activity feed entry on comment |

### NEW AI Copilot Frontend (2 stories, 4h)

| ID | Story | Effort | Delivers |
|----|-------|--------|----------|
| **US-P9-043** | Implement Session Planning Suggestions | 2h | Auto-suggest: injury checks, focus areas, equipment |
| **US-P9-044** | Create SmartActionBar Component | 2h | UI component showing suggestions with one-click actions |

### What Coaches Can Do After Week 2

```
Coach Neil: Creates voice note about Emma's injury
└─ AI suggests: "@mention Sarah Murphy (physio)"
   └─ Clicks suggestion → Comment form opens with "@Sarah Murphy " pre-filled
   └─ Types: "Can you assess Emma's ankle tomorrow?"
   └─ Sarah gets CRITICAL notification (red bell badge)

Sarah: Opens notification center
└─ Sees: "🔴 CRITICAL (2) | 🟡 IMPORTANT (5) | ⚪ NORMAL (12)"
   └─ Clicks critical → "Neil mentioned you in injury insight"
   └─ Clicks notification → Navigates to insight → Reads comment
   └─ Clicks 👍 on Neil's comment → Activity feed updates
```

### Week 2 Acceptance Criteria Checklist

- [ ] Activity feed displays all team actions in real-time
- [ ] @mention autocomplete works with keyboard navigation
- [ ] Smart mention shows contextual suggestions (injury → physio)
- [ ] Notification center shows priority-grouped notifications
- [ ] Notification preferences save and load correctly
- [ ] AI Copilot SmartActionBar appears on insights
- [ ] One-click actions execute successfully (apply, @mention, add to session)
- [ ] Type check passes
- [ ] Browser verification: all features work on desktop and mobile

---

## Week 3: Multi-View, Templates, Voting + Mobile Gestures (15 stories, ~28h)

### What Week 3 Delivers

**For Coaches:**
- 4 different view layouts: List (default), Board (kanban), Calendar, Players
- Session plan templates with auto-population from insights
- Collaborative session planning with presence indicators
- Democratic voting system for team decisions
- Command palette (Cmd+K) and keyboard shortcuts
- Mobile gesture controls (swipe, long-press)
- Comment threading (replies to comments)

**Multi-View Toggle:**
```
┌────────────────────────────────────────────────────────┐
│ Team Insights | [List] [Board] [Calendar] [Players]   │
├────────────────────────────────────────────────────────┤
│                                                        │
│ LIST VIEW (default):                                  │
│ • Chronological list of all insights                  │
│ • Filters: All, Pending, Applied, Dismissed           │
│                                                        │
│ BOARD VIEW (kanban):                                  │
│ • 3 columns: Pending | Applied | Dismissed            │
│ • Drag-and-drop (future enhancement)                  │
│                                                        │
│ CALENDAR VIEW:                                        │
│ • Month grid with insight dots (colored by category)  │
│ • Click day → popover with insights                   │
│                                                        │
│ PLAYERS VIEW:                                         │
│ • Grouped by player (alphabetical)                    │
│ • Expand/collapse per player                          │
│ • Search to filter players                            │
└────────────────────────────────────────────────────────┘
```

**Session Templates:**
```
CREATE SESSION PLAN:

Template 1: PRE-MATCH DEBRIEF
• Objectives: Review opposition, set tactics
• Checklist: Team sheet, injury checks, equipment
• Auto-populated from insights: 3 injury notes, 5 player focus areas

Template 2: POST-TRAINING REVIEW
• Objectives: Review session, player feedback
• Checklist: Session notes, equipment cleanup
• Auto-populated: 8 skill progress insights from today

Template 3: SEASON PLANNING
• Objectives: Long-term development goals
• Checklist: Review past season, set targets
• Auto-populated: 12 development goal insights
```

**Voting System:**
```
DECISION: MVP Selection (Match vs Cork City)
Created by: Coach Neil • 2 hours ago • VOTING OPEN

Options:
• Emma Malone (3 votes) ⬅ You voted
• Sarah O'Brien (2 votes)
• Michael Murphy (1 vote)

Who voted:
• Emma: Neil (2x weight), Sarah, Michael
• Sarah: John, Mary
• Michael: Tom

[Finalize Decision] ← Head coach only
```

**Mobile Gestures:**
```
INSIGHT CARD:
├─ Swipe RIGHT →     = Apply insight (green animation)
├─ Swipe LEFT ←      = Dismiss insight (red animation)
├─ Long Press (500ms) = Quick actions menu (Apply, Comment, @Mention)
└─ Double Tap        = React with 👍

ACTIVITY FEED:
├─ Pull Down         = Refresh
└─ Swipe LEFT        = Mark as read
```

### User Stories (Priority 19-33)

| ID | Story | Effort | Delivers |
|----|-------|--------|----------|
| **US-P9-019** | Create InsightsView Container | 2h | View type state + toggle buttons |
| **US-P9-020** | Create InsightsBoardView (Kanban) | 2h | 3 columns: Pending, Applied, Dismissed |
| **US-P9-021** | Create InsightsCalendarView | 3h | Month grid with insight dots, day popover |
| **US-P9-022** | Create InsightsPlayerView | 2h | Grouped by player with expand/collapse |
| **US-P9-023** | Create Session Templates Backend | 2h | 3 templates with auto-population logic |
| **US-P9-024** | Create Session Templates UI | 2h | Gallery of 3 template cards |
| **US-P9-025** | Create Session Plan Editor (Collaborative) | 4h | Editable objectives, drills, player notes, presence |
| **US-P9-026** | Create Team Decisions Backend (Voting) | 3h | Voting system with weighted votes |
| **US-P9-027** | Create Voting Card Component | 3h | Display decision, cast vote, finalize (head coach) |
| **US-P9-028** | Create Command Palette Component | 2h | Cmd+K opens fuzzy search palette |
| **US-P9-029** | Add Global Keyboard Shortcuts | 1h | K=new note, C=comment, N/P=navigation |
| **US-P9-030** | Add Comment Threading UI | 2h | Reply button, indented replies, recursive rendering |
| **US-P9-031** | Add Loading Skeletons to All Views | 2h | CardSkeleton, ListSkeleton for all views |
| **US-P9-032** | Add Empty States to All Views | 1h | Friendly messages with icons |
| **US-P9-033** | Extend coachOrgPreferences with View Preference | 1h | Save preferred view type |

### NEW Mobile Gestures (4 stories, 4h)

| ID | Story | Effort | Delivers |
|----|-------|--------|----------|
| **US-P9-045** | Create Swipeable Insight Card Component | 2h | Framer Motion swipe: RIGHT=apply, LEFT=dismiss |
| **US-P9-046** | Add Long-Press Quick Actions Menu | 1h | 500ms long-press shows action overlay |
| **US-P9-047** | Add Mobile Touch Target Optimization | 0.5h | Min 44px touch targets, remove tap highlight |
| **US-P9-048** | Add Gesture Customization Settings | 0.5h | Settings to customize/disable gestures |

### What Coaches Can Do After Week 3

```
DESKTOP WORKFLOW:
Coach Neil: Presses Cmd+K
└─ Command palette opens
   └─ Types "emma"
      └─ Sees: Emma's passport, recent insights, create note
      └─ Presses Enter → Navigates to Emma's passport

MOBILE WORKFLOW (NEW):
Coach Sarah: Opens Team Insights on iPhone
└─ Views insight: "Emma's tackling improved (4/5)"
   └─ Swipes RIGHT → Green animation → "Applied to Emma's passport ✅"

OR
   └─ Long-presses (500ms) → Quick actions menu appears
      └─ Taps "Add Comment" → Comment form opens

SESSION PLANNING:
Coach Neil: Creates Thursday training session
└─ Clicks "Use Template: Post-Training Review"
   └─ Session auto-populated with:
      • Objectives: "Review tackling drills, conditioning"
      • Checklist: "✓ Check Emma's ankle (Day 3), ✓ Review Michael's fitness"
      • Equipment: "12 cones (arrived yesterday)"
   └─ 🤖 AI SUGGESTIONS:
      • Add injury checks (3 players)
      • Focus areas: Defensive positioning (3 coaches mentioned)
   └─ Clicks [Use these objectives] → Auto-added to session

VOTING:
Coach Neil: Creates decision: "MVP for match vs Cork"
└─ Options: Emma Malone, Sarah O'Brien, Michael Murphy
   └─ Coaches vote throughout the day
   └─ Coach Neil (head coach) clicks [Finalize Decision]
      └─ Winner: Emma Malone (3 votes)
      └─ Activity feed: "Team selected Emma Malone as MVP"
```

### Week 3 Acceptance Criteria Checklist

- [ ] All 4 view types work (list, board, calendar, players)
- [ ] View preference saves and loads correctly
- [ ] Session templates create sessions with auto-populated data
- [ ] Collaborative session editor shows presence indicators
- [ ] Voting system allows vote casting and finalization
- [ ] Command palette opens with Cmd+K and searches all items
- [ ] Keyboard shortcuts work (K, C, N, P, ?)
- [ ] Comment threading works with indented replies
- [ ] Swipeable insight cards work on mobile (iOS + Android)
- [ ] Long-press quick actions menu appears
- [ ] Touch targets are minimum 44px
- [ ] Gesture settings save and apply
- [ ] All views have loading skeletons and empty states
- [ ] Type check passes
- [ ] Browser verification: desktop + mobile (dev-browser skill)

---

## Week 4: Personalization & Polish (7 stories, ~18h)

### What Week 4 Delivers

**For Coaches:**
- Tone controls for parent summaries (Warm, Professional, Brief)
- Frequency controls for parent communication (Every insight, Daily, Weekly)
- Audio playback in voice note detail view
- Inline editing for quick updates
- Smart notification digest (daily/weekly email summaries)
- Unified Team Hub page bringing everything together
- Coach learning dashboard (self-reflection metrics)

**Tone Controls:**
```
PARENT SUMMARY TONE:

┌─────────────────────────────────────────────────────────┐
│ Communication Preferences                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Tone: [Warm ▼]                                          │
│                                                         │
│ PREVIEW:                                                │
│ "Hi Emma's parents! Great news - Emma has been working  │
│  really hard on her tackling, and we've seen wonderful  │
│  improvement from 3/5 to 4/5. She's showing excellent   │
│  technique in 1v1 situations. Keep up the great work!"  │
│                                                         │
│ Other options:                                          │
│ • Professional: "Emma's tackling rating improved..."    │
│ • Brief: "Emma: Tackling improved 3→4/5. Good progress."│
└─────────────────────────────────────────────────────────┘
```

**Frequency Controls:**
```
PARENT COMMUNICATION FREQUENCY:

○ Every insight (real-time)
● Daily digest at [6:00 PM ▼]
○ Weekly digest on [Friday ▼] at [6:00 PM ▼]

Preview: "Parents will receive a daily summary of their child's
progress at 6:00 PM, including all insights from that day."
```

**Team Hub Page (Final Integration):**
```
┌───────────────────────────────────────────────────────────────┐
│ Team Hub - U14 Girls GAA                          [Team ▼]    │
│                                                                │
│ 🟢 Coach Sarah • 🟢 Coach Michael (viewing Emma's passport)   │
│ 🔔 (3 notifications)                                           │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│ [Insights] [Tasks] [Planning] [Activity]                      │
│                                                                │
│ ┌─ INSIGHTS TAB ─────────────────────────────────────────┐   │
│ │                                                         │   │
│ │ [List] [Board] [Calendar] [Players]                    │   │
│ │                                                         │   │
│ │ ⭐ Emma Malone - Tackling Improved (4/5)               │   │
│ │ Coach Neil • 2 hours ago                               │   │
│ │                                                         │   │
│ │ 🤖 SUGGESTED: Apply to passport, @mention Sarah        │   │
│ │                                                         │   │
│ │ 💬 2 comments • 👍 3 likes                             │   │
│ └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

**Smart Notification Digest (Email):**
```
Subject: Your Daily Team Summary - U14 Girls GAA (Thu Jan 30)

Hi Neil,

Here's what happened with your team today:

🔴 CRITICAL (1):
• Injury flagged: Sarah Malone ankle monitoring (Day 2)
  → Sarah Murphy commented: "Needs assessment tomorrow"

🟡 IMPORTANT (3):
• Emma's tackling improved 4/5 (2 coaches liked this)
• New session plan created for Saturday match
• Team voted: Emma Malone selected as MVP

⚪ NORMAL (8):
• Michael O'Brien commented on fitness insight
• Session template used: Pre-Match Debrief
• 5 new skill progress insights recorded

[View Full Activity Feed]
```

### User Stories (Priority 34-40)

| ID | Story | Effort | Delivers |
|----|-------|--------|----------|
| **US-P9-034** | Extend coachOrgPreferences with Parent Communication Settings | 1h | Schema fields: tone, verbosity, frequency |
| **US-P9-035** | Add Tone Controls to Settings Tab | 2h | Dropdown with preview card |
| **US-P9-036** | Add Frequency Controls to Settings Tab | 2h | Radio buttons with time picker |
| **US-P9-037** | Add Audio Playback to Voice Note Detail | 1h | HTML5 audio player with controls |
| **US-P9-038** | Create Inline Editing Components | 3h | Click to edit, Cmd+Enter to save |
| **US-P9-039** | Create Smart Notification Digest Backend | 4h | Cron job sends daily/weekly email summaries |
| **US-P9-040** | Create Team Hub Page (Unification) | 3h | Single page with tabs, presence, notifications |

### What Coaches Can Do After Week 4

```
PERSONALIZATION:
Coach Neil: Opens Settings
└─ Parent Communication section
   └─ Tone: Warm → Professional
   └─ Frequency: Daily digest at 6 PM
   └─ Preview updates: "Emma's tackling rating improved from 3/5 to 4/5..."
   └─ Clicks Save → Preferences applied

AUDIO PLAYBACK:
Coach Sarah: Opens voice note detail
└─ Sees audio player at top (if recording exists)
   └─ Clicks Play → Hears original voice note
   └─ Scrubs to 0:45 → Hears specific section
   └─ Clicks Download → Saves MP3

INLINE EDITING:
Coach Neil: Viewing session plan
└─ Clicks objective text → Enters edit mode
   └─ Edits: "Review defensive positioning"
   └─ Presses Cmd+Enter → Saves immediately
   └─ Optimistic UI update (no page reload)

TEAM HUB (UNIFIED EXPERIENCE):
Coach Neil: Navigates to /orgs/[orgId]/coach/team-hub
└─ Selects team: U14 Girls GAA
   └─ Sees all features in one place:
      • Insights tab (with all 4 views)
      • Tasks tab (future)
      • Planning tab (session templates)
      • Activity tab (activity feed)
   └─ Presence indicators in header
   └─ Notification center (bell icon)
   └─ All state persists in URL: ?team=123&tab=insights&view=board
```

### Week 4 Acceptance Criteria Checklist

- [ ] Tone controls work with preview
- [ ] Frequency controls work with time picker
- [ ] Tone and frequency save to coachOrgPreferences
- [ ] Audio player displays and plays voice notes
- [ ] Inline editing works (click, edit, Cmd+Enter, blur to save)
- [ ] Notification digest cron job sends emails
- [ ] Team Hub page loads with all tabs
- [ ] Team selector works (if multiple teams)
- [ ] URL persistence works (?team=X&tab=Y&view=Z)
- [ ] All features accessible from Team Hub
- [ ] Type check passes
- [ ] Browser verification: full end-to-end workflow works

---

## Success Metrics (How to Know P9 is Complete)

### User Experience Goals

- ✅ **Comments:** 50+ comments per week per org
- ✅ **@Mentions:** 20+ mentions per week per org
- ✅ **Reactions:** 100+ reactions per week per org
- ✅ **AI Copilot adoption:** 60% of coaches click smart suggestions
- ✅ **Mobile gestures:** 70% of mobile users swipe to apply/dismiss
- ✅ **Session templates:** 40% of sessions created from templates
- ✅ **Voting:** 5+ team decisions per month per team
- ✅ **View preference:** Each view used by 25%+ of coaches
- ✅ **Coach satisfaction:** 4.5/5 survey rating

### Technical Goals

- ✅ All 48 user stories have `passes: true` in prd.json
- ✅ Type check passes (`npm run check-types`)
- ✅ Lint passes (`npm run check`)
- ✅ All real-time subscriptions work (Convex)
- ✅ All views load in < 2 seconds
- ✅ Mobile gestures work on iOS + Android
- ✅ AI suggestions return in < 500ms
- ✅ No console errors in production
- ✅ Browser verification complete for all stories

---

## Integration with POST-P9 Features

### Mobile Quick Review (Separate 2-week project)

**Status:** POST-P9
**Link:** `/docs/features/MOBILE_QUICK_REVIEW_PLAN.md`

**Shared Components from P9:**
- `SwipeableInsightCard` (P9 creates, Quick Review extends)
- `InsightCard` base component
- Gesture preferences from Settings

**Differences:**
- P9 gestures: Team Hub insights (all coaches)
- Quick Review: WhatsApp deep link insights (`/r/[code]`)
- Quick Review adds: fuzzy player matching, trust-adaptive UI, 48h expiry

### WhatsApp Coach Groups (4-week project between P9-P10)

**Status:** Between P9 and P10
**Link:** `/docs/features/whatsapp-coach-groups.md`

**P9 Schema Preparation:**
- `sessionPlans.sessionType` matches WhatsApp enums
- `sessionPlans.sourceWhatsAppMeetingId` optional field
- `teamActivityFeed.activityType` includes WhatsApp events
- `voiceNotes.source` includes "group_meeting", "group_passive"

**Integration Points:**
- WhatsApp meetings → P9 session templates (auto-populate)
- WhatsApp insights → P9 activity feed (source badge)
- Multi-speaker insights → P9 comments (speaker attribution)

---

## Competitive Advantage Summary

After Phase 9, PlayerARC becomes the **only sports coaching platform** with:

1. ✅ Real-time team presence (see who's online)
2. ✅ AI-powered smart suggestions (3x faster workflows)
3. ✅ Mobile gesture controls (swipe, long-press)
4. ✅ Democratic voting system (MVP, lineup decisions)
5. ✅ Priority-based notifications (injuries flagged immediately)
6. ✅ Session auto-population (checklists from insights)
7. ✅ 4 different view layouts (list, board, calendar, players)
8. ✅ Threaded comments with @mentions
9. ✅ Collaborative session planning

**No competitor has ANY of these features.**

---

## Ralph Execution Notes

### For Ralph Agent:

This breakdown shows the **deliverables per week**. The actual `prd.json` file contains all 48 user stories with acceptance criteria.

**Story Sizing:**
- All stories sized to fit in one context window
- Effort ranges: 0.5h (small) to 4h (large)
- Average: 1.5h per story
- Total: ~72 hours across 48 stories

**Quality Requirements:**
- Type check: `npm run check-types`
- Lint: `npm run check` (after `npx ultracite fix`)
- Browser testing: Required for all UI changes (use dev-browser skill)

**Key Patterns:**
- Use Better Auth adapter for all user lookups
- Use indexes, never `.filter()` in Convex
- All functions need `args` and `returns` validators
- Use skeleton loaders (19 types available)
- Organization theming via CSS variables

**Branch Strategy:**
- Branch: `ralph/team-collaboration-hub-p9`
- Commit format: `feat: US-P9-XXX - [Story Title]`
- Update `prd.json` after each story completion

**Testing:**
- Dev server: http://localhost:3000 (usually running)
- Test account: `neil.B@blablablak.com` / `lien1979`
- Dev-browser server: `ws://127.0.0.1:9223`

---

**Document Version:** 1.0
**Created:** January 30, 2026
**Last Updated:** January 30, 2026
**Ready for Execution:** ✅ Yes
