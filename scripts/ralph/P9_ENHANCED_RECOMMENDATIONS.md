# Phase 9 Enhanced Recommendations
## Team Collaboration Hub - Deep Research Synthesis

**Date:** January 30, 2026
**Sources:**
- Branch `claude/review-voice-notes-code-6Q9zx` industry research
- Comprehensive collaboration platform analysis (Slack, Linear, Asana, ClickUp, Figma, Miro, Monday, Notion, Coda, Airtable)
- Current P9 PRD (Jan 27, 2026)
- Codebase comprehensive review (Jan 30, 2026)

---

## EXECUTIVE SUMMARY

Based on deep research into 10+ leading collaboration platforms and sports-specific tools, we've identified **12 critical enhancements** to the current P9 PRD that will transform the Team Collaboration Hub from a good feature into a **best-in-class coaching collaboration platform**.

### Key Finding

> **The current P9 PRD is solid but misses critical patterns from modern collaboration platforms that coaches need most: presence awareness, priority notifications, keyboard shortcuts, and collaborative decision-making.**

### Impact Assessment

| Enhancement | User Value | Implementation | Priority |
|-------------|-----------|----------------|----------|
| Presence System | High | Medium | Must Have |
| Priority Notifications | Critical | Low | Must Have |
| Collaborative Voting | High | Low | Should Have |
| Keyboard Shortcuts | Medium | Low | Should Have |
| Session Checklists | High | Medium | Must Have |
| Team Timeline View | Medium | High | Nice to Have |

---

## ENHANCEMENT 1: Real-Time Presence System 🔴 CRITICAL

### Research Insights

**From Figma:**
- Live cursors showing exactly where teammates are working
- Observation mode (follow a teammate's cursor)
- Presence indicators on every object

**From Notion:**
- Colored avatars showing who's viewing a page
- Real-time typing indicators
- "X people are viewing this" header

**From Linear:**
- Subtle presence dots on issues
- Last viewed timestamps
- Notification when teammate views same item

### Why Coaches Need This

**Scenario:** Head coach reviewing player insights while assistant coach simultaneously reviews same player.

**Current P9 PRD:** No awareness of each other - may both start recording duplicate observations

**With Presence:**
```
┌──────────────────────────────────────────────────┐
│ Emma Barlow - Player Insights                    │
│ 👁 Coach Sarah is viewing this (just now)       │
├──────────────────────────────────────────────────┤
│ Recent Insights:                                 │
│ • Hand pass 4/5 (Coach Neil, 2 days ago)        │
│   💬 Coach Sarah is typing...                   │
```

### Implementation

**New Table:**
```typescript
teamHubPresence: defineTable({
  userId: v.string(),
  userName: v.string(),
  teamId: v.string(),
  currentView: v.union(
    v.literal("insights"),
    v.literal("tasks"),
    v.literal("planning"),
    v.literal("activity")
  ),
  focusedItemType: v.optional(v.string()), // "player", "insight", "task"
  focusedItemId: v.optional(v.string()),
  lastActiveAt: v.number(),
  status: v.union(
    v.literal("active"),     // Within 30 seconds
    v.literal("idle"),       // 30s-5min
    v.literal("away")        // 5min+
  ),
})
.index("by_team_active", ["teamId", "lastActiveAt"])
```

**Real-Time Update Pattern:**
```typescript
// Frontend: useQuery for real-time subscriptions
const presenceData = useQuery(
  api.models.teamCollaboration.getTeamPresence,
  { teamId, excludeCurrentUser: true }
);

// Backend: Convex query (real-time by default)
export const getTeamPresence = query({
  args: { teamId: v.string(), excludeCurrentUser: v.boolean() },
  returns: v.array(v.object({
    userId: v.string(),
    userName: v.string(),
    currentView: v.string(),
    focusedItemId: v.optional(v.string()),
    status: v.string()
  })),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - 5 * 60 * 1000; // 5 min
    return await ctx.db
      .query("teamHubPresence")
      .withIndex("by_team_active", q =>
        q.eq("teamId", args.teamId)
         .gt("lastActiveAt", cutoff)
      )
      .collect();
  }
});
```

**UI Components:**
```typescript
// Presence indicator component
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  {presenceData?.map(p => (
    <Tooltip key={p.userId}>
      <TooltipTrigger>
        <Avatar className="h-6 w-6 ring-2 ring-green-500">
          {p.userName[0]}
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>
        {p.userName} is viewing {p.currentView}
      </TooltipContent>
    </Tooltip>
  ))}
</div>
```

**Priority:** 🔴 Must Have - Week 1
**Effort:** Medium (3-4 hours)
**Impact:** High - Prevents duplicate work, enables coordination

---

## ENHANCEMENT 2: Priority-Based Notification System 🔴 CRITICAL

### Research Insights

**From Linear:**
- High/Medium/Low priority labels on notifications
- Smart grouping (3 updates on same issue → 1 notification)
- "Mark all in project as read" bulk actions

**From Slack:**
- Notification keywords (mention, direct message, reaction)
- Per-channel notification settings
- Do Not Disturb schedules

**From Asana:**
- Daily digests vs immediate notifications
- Project-level notification preferences
- Mention-only mode for busy projects

### Why Coaches Need This

**Problem:** Not all insights are equally urgent
- 🔴 **Critical:** Injury insights (immediate notification needed)
- 🟡 **Important:** Skill assessments (notification within day)
- 🟢 **Normal:** Team culture notes (digest okay)

**Current P9 PRD:** All @mentions treated equally

### Implementation

**Extend insightComments schema:**
```typescript
insightComments: defineTable({
  // ... existing fields
  priority: v.union(
    v.literal("critical"),  // Injury, medical, safety
    v.literal("important"), // Skill changes, behavior
    v.literal("normal")     // General observations
  ),
  mentionedUserIds: v.array(v.string()),
  mentionNotificationsSent: v.array(v.object({
    userId: v.string(),
    sentAt: v.number(),
    method: v.union(v.literal("push"), v.literal("email"), v.literal("digest"))
  })),
})
```

**Coach Notification Preferences:**
```typescript
// Extend coachOrgPreferences
notificationPreferences: v.optional(v.object({
  critical: v.object({
    push: v.boolean(),        // Default: true
    email: v.boolean(),       // Default: true
    digest: v.boolean(),      // Default: false
  }),
  important: v.object({
    push: v.boolean(),        // Default: true
    email: v.boolean(),       // Default: false
    digest: v.boolean(),      // Default: true (daily)
  }),
  normal: v.object({
    push: v.boolean(),        // Default: false
    email: v.boolean(),       // Default: false
    digest: v.boolean(),      // Default: true (daily)
  }),
  digestTime: v.string(),     // "18:00"
  quietHours: v.object({
    enabled: v.boolean(),
    start: v.string(),        // "22:00"
    end: v.string(),          // "07:00"
  }),
})),
```

**Notification Rules:**
```typescript
function determineNotificationPriority(
  insightCategory: string,
  commentContent: string
): "critical" | "important" | "normal" {
  // Critical: Injury, medical, safety keywords
  if (["injury", "medical", "concussion", "pain"].some(k =>
    insightCategory.includes(k) || commentContent.toLowerCase().includes(k)
  )) {
    return "critical";
  }

  // Important: Skill assessments, behavior issues
  if (["skill_rating", "behavior", "discipline"].includes(insightCategory)) {
    return "important";
  }

  // Normal: Everything else
  return "normal";
}
```

**UI: Notification Center**
```typescript
<NotificationCenter>
  <NotificationGroup priority="critical" count={2}>
    <NotificationItem>
      <AlertTriangle className="text-red-500" />
      Coach Sarah mentioned you on Emma's injury insight
      <span className="text-xs">2 min ago</span>
    </NotificationItem>
  </NotificationGroup>

  <NotificationGroup priority="important" count={5} collapsed>
    <span>5 skill assessment discussions</span>
  </NotificationGroup>
</NotificationCenter>
```

**Priority:** 🔴 Must Have - Week 2
**Effort:** Low (2-3 hours)
**Impact:** Critical - Prevents notification overload, ensures urgent items seen

---

## ENHANCEMENT 3: Collaborative Voting System 🟡 HIGH VALUE

### Research Insights

**From Miro:**
- Dot voting on ideas
- Emoji reactions as lightweight votes
- Vote tallying with participant list

**From Productboard:**
- Upvoting features
- Score aggregation
- Voting weight by role

**From Asana:**
- Task voting for prioritization
- "Thumbs up" count visible to all

### Why Coaches Need This

**Use Cases:**
1. **MVP Selection** - Multiple coaches vote on Man of the Match
2. **Lineup Decisions** - Democratic selection when head coach wants input
3. **Training Focus** - Vote on which skills to prioritize next session
4. **Session Planning** - Vote on drill options

**Current P9 PRD:** Reactions (like, helpful, flag) are present but not voting

### Implementation

**New Table:**
```typescript
teamDecisions: defineTable({
  teamId: v.string(),
  organizationId: v.string(),
  decisionType: v.union(
    v.literal("mvp_selection"),
    v.literal("lineup_vote"),
    v.literal("training_focus"),
    v.literal("drill_selection"),
    v.literal("player_award")
  ),
  title: v.string(),
  description: v.string(),
  options: v.array(v.object({
    id: v.string(),
    label: v.string(),
    playerIdentityId: v.optional(v.id("playerIdentities")),
  })),
  votes: v.array(v.object({
    userId: v.string(),
    userName: v.string(),
    optionId: v.string(),
    votedAt: v.number(),
    weight: v.optional(v.number()), // Head coach vote = 2, assistant = 1
  })),
  allowMultipleVotes: v.boolean(),
  maxVotesPerPerson: v.number(),
  createdBy: v.string(),
  createdAt: v.number(),
  expiresAt: v.optional(v.number()),
  status: v.union(
    v.literal("open"),
    v.literal("closed"),
    v.literal("decided")
  ),
  finalDecision: v.optional(v.object({
    optionId: v.string(),
    decidedBy: v.string(),
    decidedAt: v.number(),
    notes: v.optional(v.string()),
  })),
})
.index("by_team_status", ["teamId", "status"])
.index("by_expires", ["expiresAt"])
```

**UI: Voting Component**
```tsx
<DecisionCard>
  <CardHeader>
    <Trophy className="h-5 w-5" />
    <h3>Man of the Match - U14 vs Kilmacud</h3>
    <Badge>3/5 coaches voted</Badge>
  </CardHeader>

  <CardContent>
    <VotingOptions>
      {options.map(option => (
        <VoteOption
          key={option.id}
          player={option.label}
          votes={getVotesForOption(option.id)}
          hasVoted={hasUserVoted(option.id)}
          onClick={() => castVote(option.id)}
        >
          <Avatar>{option.label[0]}</Avatar>
          <span>{option.label}</span>
          <VoteCount>{getVotesForOption(option.id).length}</VoteCount>
        </VoteOption>
      ))}
    </VotingOptions>

    <VotedBy>
      Voted: {votes.map(v => v.userName).join(", ")}
    </VotedBy>

    {isHeadCoach && (
      <Button onClick={finalizeDecision}>
        Finalize Decision
      </Button>
    )}
  </CardContent>
</DecisionCard>
```

**Priority:** 🟡 Should Have - Week 3
**Effort:** Medium (4-5 hours)
**Impact:** High - Empowers democratic decision-making, increases engagement

---

## ENHANCEMENT 4: Keyboard Shortcuts (Command Palette) 🟡 PRODUCTIVITY

### Research Insights

**From Linear:**
- Cmd+K command palette (instant access to any action)
- Keyboard shortcuts for everything
- Fuzzy search across all items

**From Notion:**
- Slash commands (/) for formatting
- Quick add (Cmd+N)
- Search anywhere (Cmd+P)

**From Slack:**
- Quick switcher (Cmd+K)
- Jump to unread (Alt+Shift+↑)
- Mark as read (Esc)

### Why Coaches Need This

**Problem:** Mouse-heavy workflows slow down experienced users

**With Keyboard Shortcuts:**
- `K` - Quick add insight
- `C` - Comment on current item
- `@` - Mention teammate
- `/` - Command palette
- `?` - Show shortcuts help
- `Esc` - Close modals
- `N/P` - Next/Previous item
- `E` - Edit current item

### Implementation

**Command Palette Component:**
```tsx
<CommandPalette open={isOpen} onOpenChange={setIsOpen}>
  <CommandInput placeholder="Type a command or search..." />

  <CommandList>
    <CommandGroup heading="Quick Actions">
      <CommandItem onSelect={() => router.push('/coach/voice-notes/new')}>
        <Mic className="mr-2" />
        Record Voice Note
        <CommandShortcut>K</CommandShortcut>
      </CommandItem>

      <CommandItem onSelect={createTask}>
        <CheckSquare className="mr-2" />
        Create Task
        <CommandShortcut>T</CommandShortcut>
      </CommandItem>
    </CommandGroup>

    <CommandGroup heading="Navigation">
      <CommandItem onSelect={() => switchTab('insights')}>
        <Lightbulb className="mr-2" />
        Team Insights
      </CommandItem>

      <CommandItem onSelect={() => switchTab('activity')}>
        <Activity className="mr-2" />
        Activity Feed
      </CommandItem>
    </CommandGroup>

    <CommandGroup heading="Recent Players">
      {recentPlayers.map(player => (
        <CommandItem key={player.id} onSelect={() => viewPlayer(player.id)}>
          <User className="mr-2" />
          {player.name}
        </CommandItem>
      ))}
    </CommandGroup>
  </CommandList>
</CommandPalette>
```

**Global Keyboard Handler:**
```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Cmd/Ctrl + K - Command Palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCommandPaletteOpen(true);
    }

    // Quick actions (when not in input)
    if (!isInputFocused()) {
      switch(e.key) {
        case 'k':
          router.push('/coach/voice-notes/new');
          break;
        case 'c':
          openCommentDialog();
          break;
        case '?':
          showKeyboardShortcuts();
          break;
      }
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

**Priority:** 🟡 Should Have - Week 3
**Effort:** Low (2-3 hours)
**Impact:** Medium - Power users become 3x faster

---

## ENHANCEMENT 5: Session Checklists & Templates 🔴 MUST HAVE

### Research Insights

**From Asana:**
- Project templates with pre-filled tasks
- Task dependencies (can't start Y until X done)
- Recurring templates for regular processes

**From ClickUp:**
- Checklist templates
- Template variables (insert team name, date, etc.)
- Template library with sharing

**From Notion:**
- Database templates
- Template buttons (one-click create)
- Template gallery

### Why Coaches Need This

**Current P9 PRD:** Session templates mentioned (US-P9-020) but underspecified

**Enhanced Session Templates:**

**1. Pre-Match Checklist**
```typescript
const PRE_MATCH_TEMPLATE = {
  name: "Pre-Match Review",
  description: "Complete before every match",
  sections: [
    {
      title: "Team Readiness",
      tasks: [
        { label: "Review injury report", required: true },
        { label: "Confirm player availability (call parents)", required: true },
        { label: "Check weather forecast & adjust tactics", required: false },
        { label: "Verify equipment (balls, cones, first aid)", required: true },
      ]
    },
    {
      title: "Tactical Preparation",
      tasks: [
        { label: "Review opponent's recent results", required: false },
        { label: "Confirm starting lineup", required: true },
        { label: "Plan set pieces (corners, free kicks)", required: true },
        { label: "Identify opponent's key players to watch", required: false },
      ]
    },
    {
      title: "Admin",
      tasks: [
        { label: "Confirm referee assignment", required: true },
        { label: "Submit team sheet to league", required: true },
        { label: "Notify parents of meet time/location", required: true },
      ]
    }
  ],
  autoPopulateInsights: true, // Pull recent injury/performance insights
  playerSpecificNotes: true,   // Show player-specific notes from voice insights
};
```

**2. Post-Training Template**
```typescript
const POST_TRAINING_TEMPLATE = {
  name: "Post-Training Debrief",
  sections: [
    {
      title: "Session Review",
      tasks: [
        { label: "Record key observations (voice note)", required: true },
        { label: "Note standout performances", required: false },
        { label: "Identify players who struggled", required: false },
        { label: "Equipment to replace/repair", required: false },
      ]
    },
    {
      title: "Follow-up Actions",
      tasks: [
        { label: "Schedule 1-on-1 conversations", required: false },
        { label: "Update skill ratings", required: false },
        { label: "Plan next session focus areas", required: true },
      ]
    }
  ]
};
```

**3. Season Planning Template**
```typescript
const SEASON_PLANNING_TEMPLATE = {
  name: "Season Planning",
  sections: [
    {
      title: "Team Goals",
      tasks: [
        { label: "Set win/loss targets", required: true },
        { label: "Identify development priorities", required: true },
        { label: "Plan tournament participation", required: false },
      ]
    },
    {
      title: "Player Development",
      tasks: [
        { label: "Individual player goals", required: true },
        { label: "Position assignments", required: true },
        { label: "Leadership roles (captain, vice)", required: false },
      ]
    }
  ],
  duration: "season",
  reviewCadence: "monthly",
};
```

**UI: Template Selector**
```tsx
<TemplateGallery>
  <TemplateCard onClick={() => createFromTemplate('pre-match')}>
    <Trophy className="h-8 w-8 text-blue-500" />
    <h3>Pre-Match Review</h3>
    <p className="text-sm text-muted-foreground">
      Complete before every match (12 checklist items)
    </p>
    <Badge>Most Popular</Badge>
  </TemplateCard>

  <TemplateCard onClick={() => createFromTemplate('post-training')}>
    <Clipboard className="h-8 w-8 text-green-500" />
    <h3>Post-Training Debrief</h3>
    <p className="text-sm text-muted-foreground">
      Record observations after training (8 items)
    </p>
  </TemplateCard>

  <TemplateCard onClick={() => createFromTemplate('season-planning')}>
    <Calendar className="h-8 w-8 text-purple-500" />
    <h3>Season Planning</h3>
    <p className="text-sm text-muted-foreground">
      Set goals and track progress (10 items)
    </p>
  </TemplateCard>
</TemplateGallery>
```

**Auto-Population from Insights:**
```typescript
async function createPreMatchChecklist(teamId: string, matchDate: string) {
  // 1. Get recent injury insights
  const injuries = await getRecentInjuries(teamId, { days: 7 });

  // 2. Get low-attendance players
  const attendanceIssues = await getAttendanceIssues(teamId, { days: 14 });

  // 3. Pre-populate checklist
  const checklist = PRE_MATCH_TEMPLATE;

  // Add injury review items
  if (injuries.length > 0) {
    checklist.sections[0].tasks.push({
      label: `Check on ${injuries.map(i => i.playerName).join(', ')}`,
      required: true,
      notes: `Recent injuries: ${injuries.map(i => i.description).join('; ')}`,
    });
  }

  // Add attendance follow-up items
  if (attendanceIssues.length > 0) {
    checklist.sections[0].tasks.push({
      label: `Confirm availability: ${attendanceIssues.map(p => p.playerName).join(', ')}`,
      required: true,
      notes: "Players with recent attendance issues",
    });
  }

  return checklist;
}
```

**Priority:** 🔴 Must Have - Week 3
**Effort:** Medium (5-6 hours)
**Impact:** High - Reduces cognitive load, ensures nothing forgotten

---

## ENHANCEMENT 6: Team Timeline View 🟢 NICE TO HAVE

### Research Insights

**From Linear:**
- Roadmap view (timeline with milestones)
- Drag items to adjust dates
- Dependencies shown as arrows

**From Monday.com:**
- Gantt chart view
- Color-coded by status
- Zoom in/out for different time scales

**From Asana:**
- Timeline view with dependencies
- Critical path highlighting
- Resource allocation view

### Why Coaches Need This

**Use Case:** Season overview showing key events and player development milestones

**Timeline Visualization:**
```
SEASON 2026 TIMELINE

Sep ──────── Oct ──────── Nov ──────── Dec ──────── Jan ──────── Feb
│             │            │            │            │            │
● Season     ● Autumn     ● Winter     ● Indoor    ● Spring    ● Finals
  Kickoff      Tournament   Break        Training     League      Week
│                          │                         │
├─ Emma: Tackling 3→4     ├─ Sarah: Injury         ├─ Emma: 4→5
├─ Clodagh: Solo 2→3      │   Recovery              └─ Team: Tournament
└─ Team: Defensive        └─ Michael: Captainship       Champions
    Formation                 Awarded
```

**Implementation:**
```typescript
// Timeline events from multiple sources
const timelineEvents = [
  // From voice insights
  { date: '2026-09-15', type: 'skill_change', player: 'Emma', description: 'Tackling 3→4' },

  // From injuries
  { date: '2026-11-02', type: 'injury', player: 'Sarah', description: 'Ankle injury - 4 week recovery' },

  // From matches
  { date: '2026-10-15', type: 'tournament', team: 'U14', description: 'Autumn Tournament' },

  // From goals/milestones
  { date: '2026-12-01', type: 'achievement', player: 'Michael', description: 'Captainship awarded' },
];

<Timeline>
  {timelineEvents.map(event => (
    <TimelineItem
      key={event.id}
      date={event.date}
      type={event.type}
      icon={getIconForEventType(event.type)}
      color={getColorForEventType(event.type)}
    >
      {event.description}
    </TimelineItem>
  ))}
</Timeline>
```

**Priority:** 🟢 Nice to Have - Post-P9
**Effort:** High (8-10 hours)
**Impact:** Medium - Useful for long-term planning but not urgent

---

## ENHANCEMENT 7: Inline Editing & Quick Actions 🟡 PRODUCTIVITY

### Research Insights

**From Notion:**
- Edit any text inline (click to edit)
- Hover menus for quick actions
- Drag handles to reorder

**From Linear:**
- Cmd+Enter to save
- Tab to next field
- Keyboard shortcuts for status changes

**From Airtable:**
- Click any cell to edit
- Arrow keys to navigate
- Copy/paste between records

### Implementation

**Quick Edit Pattern:**
```tsx
<InsightCard>
  <CardHeader>
    <EditableTitle
      value={insight.title}
      onSave={(newTitle) => updateInsight({ title: newTitle })}
      placeholder="Add title..."
    />
  </CardHeader>

  <CardContent>
    <EditableDescription
      value={insight.description}
      onSave={(newDesc) => updateInsight({ description: newDesc })}
      multiline
    />
  </CardContent>

  <CardActions>
    <QuickActionMenu>
      <QuickAction onClick={() => applyInsight()}>
        <CheckCircle /> Apply
      </QuickAction>
      <QuickAction onClick={() => dismissInsight()}>
        <XCircle /> Dismiss
      </QuickAction>
      <QuickAction onClick={() => assignToCoach()}>
        <UserPlus /> Assign
      </QuickAction>
    </QuickActionMenu>
  </CardActions>
</InsightCard>
```

**Priority:** 🟡 Should Have - Week 4
**Effort:** Medium (3-4 hours)
**Impact:** Medium - Reduces clicks, faster workflows

---

## ENHANCEMENT 8: Smart Notifications Digest 🟡 REDUCE NOISE

### Research Insights

**From GitHub:**
- Daily digest emails
- Grouped by repository
- Smart summarization

**From Slack:**
- Notification schedule (only during work hours)
- Thread-level muting
- Keyword filters

### Implementation

**Daily Digest Email:**
```
Subject: Team Hub Digest - U14 Female - Jan 30, 2026

🔴 URGENT (Requires Action):
• Emma Barlow injury update - Coach Sarah mentioned you
• Pre-match checklist incomplete (Match tomorrow at 10 AM)

🟡 IMPORTANT (Review Today):
• 3 new skill assessments from Coach Neil
• MVP voting still open (2/5 coaches voted)

🟢 FYI (Low Priority):
• 12 team culture observations this week
• Season planning checklist 80% complete

[View Full Activity →]
```

**Digest Generation Query:**
```typescript
export const generateDailyDigest = internalMutation({
  args: { coachId: v.string(), teamId: v.string() },
  handler: async (ctx, args) => {
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;

    // Critical items
    const critical = await ctx.db
      .query("teamActivityFeed")
      .withIndex("by_team_created", q =>
        q.eq("teamId", args.teamId).gt("createdAt", yesterday)
      )
      .filter(q => q.eq(q.field("priority"), "critical"))
      .collect();

    // Group by type
    const grouped = groupByType(critical);

    // Generate summary
    return {
      critical: grouped.critical,
      important: grouped.important,
      normal: grouped.normal,
      totalItems: critical.length + important.length + normal.length,
    };
  }
});
```

**Priority:** 🟡 Should Have - Week 4
**Effort:** Medium (4-5 hours)
**Impact:** High - Prevents notification fatigue

---

## ENHANCEMENT 9: Conflict Resolution & Merge 🟢 ADVANCED

### Research Insights

**From Figma:**
- Version history with restore
- Branching and merging
- Conflict detection

**From Notion:**
- Page history
- Restore from any point
- Compare versions

### Why Coaches Need This

**Scenario:** Two coaches simultaneously edit same player insight

**Without Conflict Resolution:**
- Last save wins (data loss)
- No warning to coaches
- Confusion about which version is correct

**With Conflict Resolution:**
```
┌──────────────────────────────────────────────────┐
│ ⚠️ Conflict Detected                             │
├──────────────────────────────────────────────────┤
│ Coach Sarah and Coach Neil both edited           │
│ Emma's tackling assessment.                      │
│                                                  │
│ Coach Sarah (2 min ago):                        │
│ "Tackling: 4/5 - Great improvement"             │
│                                                  │
│ Coach Neil (just now):                          │
│ "Tackling: 3/5 - Still needs work on form"     │
│                                                  │
│ [Keep Sarah's] [Keep Neil's] [Merge Both]      │
└──────────────────────────────────────────────────┘
```

**Priority:** 🟢 Nice to Have - Post-P9
**Effort:** High (10+ hours)
**Impact:** Low - Rare occurrence, can defer

---

## ENHANCEMENT 10: Activity Feed Filtering & Search 🟡 USABILITY

### Research Insights

**From Linear:**
- Advanced filters (created by, type, date)
- Saved filter views
- Filter presets

**From Slack:**
- Search within channel
- Filter by sender, date, attachments
- Star important messages

### Implementation

**Activity Feed Filters:**
```tsx
<ActivityFeedFilters>
  <FilterGroup>
    <Label>Show:</Label>
    <ToggleGroup type="multiple" value={filters.types}>
      <Toggle value="insights">Insights</Toggle>
      <Toggle value="comments">Comments</Toggle>
      <Toggle value="tasks">Tasks</Toggle>
      <Toggle value="decisions">Votes</Toggle>
    </ToggleGroup>
  </FilterGroup>

  <FilterGroup>
    <Label>From:</Label>
    <Select value={filters.coach} onValueChange={setCoachFilter}>
      <SelectItem value="all">All Coaches</SelectItem>
      {coaches.map(c => (
        <SelectItem value={c.id}>{c.name}</SelectItem>
      ))}
    </Select>
  </FilterGroup>

  <FilterGroup>
    <Label>Time:</Label>
    <Select value={filters.timeRange}>
      <SelectItem value="today">Today</SelectItem>
      <SelectItem value="week">This Week</SelectItem>
      <SelectItem value="month">This Month</SelectItem>
    </Select>
  </FilterGroup>

  <Button onClick={saveCurrentFilters}>
    <Star /> Save Filter View
  </Button>
</ActivityFeedFilters>
```

**Priority:** 🟡 Should Have - Week 2
**Effort:** Low (2-3 hours)
**Impact:** Medium - Improves findability

---

## ENHANCEMENT 11: Collaborative Session Planning 🔴 HIGH VALUE

### Research Insights

**From Miro:**
- Collaborative whiteboard
- Sticky notes and frameworks
- Real-time collaboration

**From Coda:**
- Interactive docs with tables
- Voting and decision tracking
- Connected data sources

### Why Coaches Need This

**Current P9 PRD:** Basic session templates

**Enhanced Collaborative Planning:**

```
┌──────────────────────────────────────────────────────────┐
│ SESSION PLAN: Training - Jan 30, 6:00 PM                 │
│ Coaches: Neil (lead), Sarah (assisting)                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 🎯 OBJECTIVES (Drag to Reorder)                         │
│ ├─ 1. Improve hand passing under pressure               │
│ ├─ 2. Work on defensive positioning                     │
│ └─ 3. Fitness conditioning                              │
│                                                          │
│ 🏃 DRILLS (60 min total)                                │
│ ├─ [15 min] Warmup + Stretching                        │
│ ├─ [20 min] Hand Pass Drill (Pressure Scenarios)       │
│ │   👁 Coach Sarah is editing...                       │
│ ├─ [15 min] Defensive Shape Practice                   │
│ └─ [10 min] Small-Sided Game                           │
│                                                          │
│ 👥 PLAYER-SPECIFIC FOCUS                                │
│ ├─ Emma: Work on weak-side passing                     │
│ ├─ Michael: Leadership role in drills                  │
│ └─ Sarah: Modified drills (injury recovery)            │
│     [Auto-populated from recent injury insight]         │
│                                                          │
│ 📦 EQUIPMENT NEEDED                                      │
│ ☑ 12 cones                                              │
│ ☑ 8 bibs (4 red, 4 blue)                               │
│ ☐ 4 footballs                                           │
│ ☐ First aid kit                                         │
│                                                          │
│ 💬 COACH NOTES                                           │
│ Coach Sarah: "Focus on Emma's confidence - she's been  │
│              struggling with mistakes lately"           │
│                                                          │
│ [Save Draft] [Share with Team] [Mark as Complete]      │
└──────────────────────────────────────────────────────────┘
```

**Schema:**
```typescript
sessionPlans: defineTable({
  teamId: v.string(),
  organizationId: v.string(),
  sessionDate: v.string(),
  sessionType: v.union(v.literal("training"), v.literal("match")),

  // Collaborative editing
  createdBy: v.string(),
  collaborators: v.array(v.string()), // Coach IDs
  lastEditedBy: v.string(),
  lastEditedAt: v.number(),

  // Session content
  objectives: v.array(v.object({
    id: v.string(),
    description: v.string(),
    order: v.number(),
  })),

  drills: v.array(v.object({
    id: v.string(),
    name: v.string(),
    duration: v.number(), // minutes
    description: v.string(),
    equipment: v.array(v.string()),
    focusPlayers: v.array(v.id("playerIdentities")),
  })),

  playerNotes: v.array(v.object({
    playerIdentityId: v.id("playerIdentities"),
    note: v.string(),
    addedBy: v.string(),
    sourceInsightId: v.optional(v.string()), // Auto-populated from insights
  })),

  equipmentChecklist: v.array(v.object({
    item: v.string(),
    quantity: v.number(),
    checked: v.boolean(),
    checkedBy: v.optional(v.string()),
  })),

  coachNotes: v.array(v.object({
    userId: v.string(),
    userName: v.string(),
    content: v.string(),
    createdAt: v.number(),
  })),

  status: v.union(
    v.literal("draft"),
    v.literal("ready"),
    v.literal("in_progress"),
    v.literal("completed")
  ),
})
```

**Priority:** 🔴 Must Have - Week 3
**Effort:** High (6-8 hours)
**Impact:** High - Core collaboration feature

---

## ENHANCEMENT 12: Mention Autocomplete with Context 🟡 UX POLISH

### Research Insights

**From Slack:**
- @-mention with instant dropdown
- Filter by name or role
- Recent collaborators first

**From Linear:**
- Smart autocomplete (knows context)
- Keyboard navigation
- Avatar + name + role display

### Implementation

**Smart Mention Component:**
```tsx
<CommentInput>
  {showMentionDropdown && (
    <MentionAutocomplete
      query={mentionQuery}
      context={{
        teamId: currentTeam.id,
        recentCollaborators: getRecentCollaborators(),
        relevantCoaches: getCoachesForCurrentPlayer(),
      }}
    >
      <MentionGroup heading="Suggested">
        {relevantCoaches.map(coach => (
          <MentionOption value={coach.id}>
            <Avatar>{coach.name[0]}</Avatar>
            <div>
              <div>{coach.name}</div>
              <div className="text-xs text-muted-foreground">
                {coach.role} • Last active 2h ago
              </div>
            </div>
          </MentionOption>
        ))}
      </MentionGroup>

      <MentionGroup heading="All Team Coaches">
        {allCoaches.map(coach => (
          <MentionOption value={coach.id}>
            <Avatar>{coach.name[0]}</Avatar>
            {coach.name}
          </MentionOption>
        ))}
      </MentionGroup>
    </MentionAutocomplete>
  )}
</CommentInput>
```

**Smart Suggestions:**
```typescript
function getRelevantCoaches(context: {
  playerIdentityId?: string,
  insightCategory?: string,
  teamId: string,
}): Coach[] {
  // If commenting on injury insight, suggest physio/medical staff first
  if (context.insightCategory === "injury") {
    return coaches.filter(c =>
      c.functionalRoles.includes("medical") ||
      c.specialization === "physio"
    );
  }

  // If commenting on player, suggest coaches who recently worked with that player
  if (context.playerIdentityId) {
    return getCoachesWhoRecentlyObserved(context.playerIdentityId);
  }

  // Default: team coaches sorted by recent activity
  return coaches.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}
```

**Priority:** 🟡 Should Have - Week 2
**Effort:** Low (2-3 hours)
**Impact:** Medium - Better UX for mentions

---

## PRIORITY SUMMARY & IMPLEMENTATION ROADMAP

### Week 1: Core Collaboration Infrastructure

**Must Have (Critical):**
1. ✅ **Presence System** - See who's online/viewing
   - Schema: teamHubPresence table
   - Query: getTeamPresence (real-time)
   - UI: Presence avatars component
   - Effort: 3-4 hours

2. ✅ **Backend Tables** (from original P9 PRD)
   - insightComments, insightReactions, teamActivityFeed
   - Enhanced with priority, moderation fields
   - Effort: 2-3 hours

**Total Week 1:** ~5-7 hours

---

### Week 2: Communication & Notifications

**Must Have (Critical):**
1. ✅ **Priority Notifications** - Critical/Important/Normal
   - Schema: Extend insightComments with priority
   - Notification preferences in coachOrgPreferences
   - UI: Notification center with grouping
   - Effort: 2-3 hours

2. ✅ **Comments UI** (from original P9 PRD)
   - Enhanced with inline editing
   - Mention autocomplete with smart suggestions
   - Effort: 4-5 hours

**Should Have:**
3. ✅ **Activity Feed Filtering**
   - Filter by type, coach, time range
   - Saved filter views
   - Effort: 2-3 hours

**Total Week 2:** ~8-11 hours

---

### Week 3: Planning & Decision Tools

**Must Have (Critical):**
1. ✅ **Session Checklists & Templates**
   - Pre-match, post-training, season planning templates
   - Auto-population from insights
   - Collaborative editing
   - Effort: 6-8 hours

2. ✅ **Collaborative Session Planning**
   - Real-time co-editing
   - Player-specific notes
   - Equipment checklist
   - Effort: 4-5 hours

**Should Have:**
3. ✅ **Collaborative Voting**
   - MVP selection, lineup decisions
   - Vote tallying and finalization
   - Effort: 4-5 hours

4. ✅ **Keyboard Shortcuts**
   - Command palette (Cmd+K)
   - Quick actions (K, C, @, ?)
   - Effort: 2-3 hours

**Total Week 3:** ~16-21 hours

---

### Week 4: Polish & Productivity

**Should Have:**
1. ✅ **Inline Editing & Quick Actions**
   - Edit any text inline
   - Hover menus for quick actions
   - Effort: 3-4 hours

2. ✅ **Smart Notifications Digest**
   - Daily digest emails
   - Grouped by priority
   - Effort: 4-5 hours

3. ✅ **Tone Controls** (from original P9 PRD)
   - WITH backend integration
   - Effort: 3-4 hours

**Total Week 4:** ~10-13 hours

---

### Post-P9 (Future Enhancements)

**Nice to Have:**
1. Team Timeline View (8-10 hours)
2. Conflict Resolution & Merge (10+ hours)
3. Advanced Analytics Dashboard (8-10 hours)
4. Video Integration (12+ hours)
5. Mobile App Optimizations (20+ hours)

---

## COACHING-SPECIFIC INNOVATIONS

These are features that NO existing platform does well for sports teams:

### 1. **AI-Suggested Session Focus**

Based on recent insights, auto-suggest session objectives:

```
🤖 AI Suggestion for Thursday Training:

Based on last week's insights:
• 3 players struggling with hand passing → Recommend: Hand pass drill
• 2 injury recoveries → Recommend: Modified fitness work
• Team defensive positioning weak → Recommend: Shape practice

[Accept All] [Customize] [Ignore]
```

### 2. **Parent Communication Coordination**

Prevent duplicate messages to parents:

```
⚠️ Coach Sarah already sent Emma's parent a summary today
   about hand passing progress.

   [View Sarah's Message] [Send Anyway] [Add to Sarah's Thread]
```

### 3. **Cross-Team Pattern Recognition**

Show patterns across multiple teams:

```
💡 Pattern Detected:

U12, U14, and U16 teams all struggling with same drill this week.
Consider discussing alternative approach with coaching staff.

[View Details] [Start Discussion]
```

### 4. **Automated Follow-up Reminders**

Smart reminders based on insights:

```
🔔 Follow-up Reminder:

You noted Emma's hand pass improved to 4/5 two weeks ago.
Time to reassess?

[Record Follow-up Note] [Remind in 1 Week] [Dismiss]
```

---

## TECHNICAL ARCHITECTURE RECOMMENDATIONS

### 1. WebSocket for Presence (Leverage Convex Real-Time)

Convex already provides real-time subscriptions via WebSocket. No additional infrastructure needed.

### 2. Notification Priority Framework

Use RRF (Relative Recency & Frequency) scoring:

```typescript
function calculateNotificationScore(activity: Activity): number {
  const recency = Date.now() - activity.createdAt;
  const priority = { critical: 100, important: 50, normal: 10 }[activity.priority];
  const engagement = activity.commentCount + activity.reactionCount;

  // Higher score = higher priority
  return (priority * 1000) / Math.max(recency, 1) + engagement;
}
```

### 3. Optimistic UI Updates

For instant feedback on comments/reactions:

```typescript
const addComment = useMutation(api.models.teamCollaboration.addComment);

const optimisticComment = {
  _id: tempId(),
  content: commentText,
  userName: currentUser.name,
  createdAt: Date.now(),
  isPending: true,
};

// Add optimistically
setComments(prev => [...prev, optimisticComment]);

// Persist to backend
try {
  const result = await addComment({ content: commentText, ... });
  // Replace optimistic with real
  setComments(prev => prev.map(c =>
    c._id === optimisticComment._id ? result : c
  ));
} catch (error) {
  // Remove optimistic on error
  setComments(prev => prev.filter(c => c._id !== optimisticComment._id));
  toast.error("Failed to add comment");
}
```

---

## UPDATED P9 USER STORIES (NEW/ENHANCED)

### US-P9-032: Real-Time Presence System (NEW)
**Week:** 1
**Effort:** 3-4h
**Priority:** 🔴 Must Have

### US-P9-033: Priority-Based Notifications (NEW)
**Week:** 2
**Effort:** 2-3h
**Priority:** 🔴 Must Have

### US-P9-034: Collaborative Voting (NEW)
**Week:** 3
**Effort:** 4-5h
**Priority:** 🟡 Should Have

### US-P9-035: Keyboard Shortcuts & Command Palette (NEW)
**Week:** 3
**Effort:** 2-3h
**Priority:** 🟡 Should Have

### US-P9-036: Enhanced Session Templates (ENHANCED)
**Week:** 3
**Effort:** 6-8h
**Priority:** 🔴 Must Have
**Changes:** Auto-population from insights, collaborative editing

### US-P9-037: Activity Feed Filtering (ENHANCED)
**Week:** 2
**Effort:** 2-3h
**Priority:** 🟡 Should Have
**Changes:** Saved views, advanced filters

### US-P9-038: Inline Editing (NEW)
**Week:** 4
**Effort:** 3-4h
**Priority:** 🟡 Should Have

### US-P9-039: Smart Notification Digest (NEW)
**Week:** 4
**Effort:** 4-5h
**Priority:** 🟡 Should Have

---

## TESTING SCENARIOS (COACHING-SPECIFIC)

### Scenario 1: Pre-Match Coordination

**Setup:**
- 3 coaches (Head, Assistant, Physio) preparing for match
- 2 players with recent injuries
- 1 player with parent availability question

**Test Flow:**
1. Head coach creates pre-match checklist from template
2. Checklist auto-populates with 2 injury checks
3. All 3 coaches see presence indicators (know who's reviewing)
4. Assistant coach comments on lineup decision
5. Physio updates injury status with @mention to head coach
6. Head coach receives critical notification immediately
7. Voting initiated for Man of the Match selection
8. All actions visible in activity feed with filters

**Expected Result:**
- No duplicate work
- All coaches coordinated
- Critical info surfaced immediately
- Democratic decision made efficiently

### Scenario 2: Post-Training Debrief

**Setup:**
- 2 coaches observed training session
- 12 players participated
- Multiple observations to record

**Test Flow:**
1. Both coaches see each other's presence in Team Hub
2. Coach A records observation about Player 1
3. Coach B sees real-time notification (low priority, digest mode)
4. Coach B adds comment to Coach A's observation
5. Coach A receives comment notification (normal priority, next digest)
6. Session checklist marked complete collaboratively
7. Activity feed shows both coaches' contributions

**Expected Result:**
- Efficient observation recording
- No notification fatigue
- Clear attribution of observations
- Collaborative completion tracking

---

## CONCLUSION

These **12 enhancements** transform P9 from a good collaboration feature into a **best-in-class coaching platform** by:

1. ✅ Adding real-time awareness (presence, typing indicators)
2. ✅ Preventing notification overload (priority system, digests)
3. ✅ Enabling democratic decision-making (voting)
4. ✅ Accelerating workflows (keyboard shortcuts, inline editing)
5. ✅ Automating repetitive tasks (template auto-population)
6. ✅ Surfacing relevant information (smart suggestions, filters)

**Recommended Approach:**
- Weeks 1-2: Core features (presence, notifications, comments)
- Weeks 3-4: Power features (templates, voting, shortcuts)
- Post-P9: Advanced features (timeline, conflict resolution)

**Total Additional Effort:** ~40-50 hours across 4 weeks
**User Value:** Transforms team collaboration from "useful" to "indispensable"

---

**Next Steps:**
1. Review and prioritize enhancements
2. Update P9 PRD with selected enhancements
3. Create detailed implementation specs for Week 1
4. Begin development with presence system + priority notifications
