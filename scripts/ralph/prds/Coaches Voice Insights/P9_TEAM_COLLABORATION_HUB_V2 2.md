# PRD: Phase 9 - Team Collaboration Hub (Version 2.0)

**Project:** Voice Notes - Team Collaboration Hub
**Branch:** `ralph/team-collaboration-hub-p9`
**Created:** January 27, 2026
**Updated:** January 30, 2026
**Status:** Ready for Implementation
**Estimated Time:** 4 weeks (40 user stories, ~50-60 hours)
**Priority:** 🔴 CRITICAL - Transforms to collaboration platform

---

## Document Changes (V2.0)

**What's New:**
- ✅ Updated all backend code to use Better Auth adapter pattern
- ✅ Updated all loading states to use skeleton components (19 types available)
- ✅ Added 12 critical enhancements from deep collaboration platform research
- ✅ Integrated coaching-specific innovations not found in other platforms
- ✅ Updated implementation roadmap with new effort estimates
- ✅ Added 8 new user stories (US-P9-032 through US-P9-039)

**Research Sources:**
- Codebase analysis (229 commits since Jan 27, P8 Week 1.5 patterns)
- Industry research: Slack, Linear, Figma, Notion, Asana, ClickUp, Miro, Monday, Coda, Airtable
- Sports platforms: Teamworks, Heja, sportsYou, Sportlyzer, Luceo Sports
- Branch `claude/review-voice-notes-code-6Q9zx` insights

---

## Executive Summary

**Problem Statement:**
Team Insights features are fragmented and lack collaborative features found in modern workplace tools. Coaches working on the same team cannot effectively coordinate, discuss insights in real-time, see who's online, prioritize notifications, or make democratic decisions together.

**The Vision:**
Transform Voice Notes from a personal tool into a **best-in-class team collaboration platform** inspired by Linear, Figma, Notion, and Asana - with coaching-specific innovations that NO existing platform offers.

**What's Already Done (Phases 1-8):**
- ✅ Voice notes with AI transcription and insights
- ✅ Trust level system with 8-priority access control
- ✅ Parent summaries with acknowledgment
- ✅ Team Insights tab + persistent observations page
- ✅ "My Impact" dashboard (7 sections, date range filters, CSV export)
- ✅ Better Auth adapter pattern established
- ✅ 19 skeleton loading components
- ✅ Functional roles (coach, parent, admin, player)

**What This PRD Delivers:**

### Week 1: Collaboration Foundations + Presence
- Real-time presence system (see who's online, what they're viewing)
- Comments on insights (threaded discussions)
- Reactions (like, helpful, flag)
- Backend infrastructure for activity feed

### Week 2: Activity Feed, @Mentions & Priority Notifications
- Real-time activity feed with filtering
- @mention support with smart autocomplete
- Priority-based notification system (Critical/Important/Normal)
- Notification preferences and digests

### Week 3: Multi-View, Templates & Decision-Making
- View toggle: List / Board / Calendar / Players
- Enhanced session templates with auto-population from insights
- Collaborative session planning
- Voting system for democratic decisions (MVP, lineup, training focus)
- Keyboard shortcuts & command palette

### Week 4: Personalization & Polish
- Tone controls (Warm / Professional / Brief)
- Frequency controls (Every insight / Daily / Weekly digests)
- Inline editing & quick actions
- Smart notification digests
- Audio playback in voice note detail
- Coach learning dashboard
- Team Hub page unification

---

## Context & Architecture

### Critical Architectural Patterns (from P8 Week 1.5)

**1. Better Auth Adapter Pattern - CRITICAL**
```typescript
// ❌ WRONG - Do NOT query Better Auth tables directly
const user = await ctx.db
  .query("user")
  .withIndex("by_email", q => q.eq("email", email))
  .first();

// ✅ CORRECT - Always use Better Auth adapter
const user = await ctx.runQuery(
  components.betterAuth.adapter.findOne,
  {
    model: "user",
    where: [{ field: "email", value: email }]
  }
);
```

**Why:** Better Auth tables use special indexing and may have middleware. Direct queries bypass this and can cause bugs.

**2. Skeleton Loading Pattern**
```typescript
// ❌ WRONG - Spinner
if (data === undefined) {
  return <Spinner />;
}

// ✅ CORRECT - Skeleton matching actual layout
if (data === undefined) {
  return <PageSkeleton variant="dashboard" />;
}
```

**Available Skeletons:** PageSkeleton (variants: dashboard, list, detail), ListSkeleton, CenteredSkeleton, CardSkeleton, TableSkeleton, FormSkeleton, and 13 more.

**3. Functional Roles Pattern**
```typescript
// Extended member table
member: defineTable({
  functionalRoles: v.array(v.string()), // ["coach", "parent", "admin"]
  activeFunctionalRole: v.string(),
})
```

**4. 8-Priority Access Control (Trust Gates)**
```typescript
// Priority hierarchy (highest to lowest)
1. Admin blanket block
2. Individual admin block
3. Coach self-disabled
4. Trust gates disabled (org-wide)
5. Admin blanket override
6. Trust Level 2+ (auto-enabled)
7. Individual coach override
8. Default deny
```

### Critical User Insights (from Voice Notes Technical Overview Section 19)

> "Team Insights split across two locations - should merge. No comments/reactions on insights - can't discuss. No @mentions to notify teammates. No activity feed showing team actions in real-time. No presence awareness - coaches don't know who else is working on the team."

**Collaboration Gaps Addressed:**
1. ✅ Can't discuss insights → Threaded comments with @mentions
2. ✅ Can't notify teammates → Priority-based notifications
3. ✅ Can't react quickly → Like/Helpful/Flag + Collaborative voting
4. ✅ Can't see team activity → Real-time activity feed with filtering
5. ✅ Single view only → List/Board/Calendar/Players views
6. ✅ No session prep tools → Enhanced templates with auto-population
7. ✅ No presence awareness → Real-time presence indicators
8. ✅ Notification overload → Priority system + digests + quiet hours

---

## Backend APIs (Schema & Functions)

### New Tables Required

**1. insightComments**
```typescript
insightComments: defineTable({
  insightId: v.string(),
  voiceNoteId: v.id("voiceNotes"),
  teamId: v.optional(v.string()),
  userId: v.string(),
  userName: v.string(),
  userAvatarUrl: v.optional(v.string()),
  content: v.string(),
  mentions: v.array(v.object({
    userId: v.string(),
    userName: v.string(),
  })),
  parentCommentId: v.optional(v.string()), // null = top-level

  // NEW: Priority & moderation
  priority: v.union(
    v.literal("critical"),  // Injury, medical, safety
    v.literal("important"), // Skill changes, behavior
    v.literal("normal")     // General observations
  ),
  mentionNotificationsSent: v.array(v.object({
    userId: v.string(),
    sentAt: v.number(),
    method: v.union(v.literal("push"), v.literal("email"), v.literal("digest"))
  })),
  isEdited: v.optional(v.boolean()),
  editedAt: v.optional(v.number()),

  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
.index("by_insight", ["insightId"])
.index("by_voice_note", ["voiceNoteId"])
.index("by_team", ["teamId"])
.index("by_user", ["userId"])
.index("by_created", ["createdAt"])
.index("by_priority", ["priority", "createdAt"])
```

**2. insightReactions**
```typescript
insightReactions: defineTable({
  insightId: v.string(),
  userId: v.string(),
  type: v.union(
    v.literal("like"),
    v.literal("helpful"),
    v.literal("flag")
  ),
  createdAt: v.number(),
})
.index("by_insight", ["insightId"])
.index("by_user_insight", ["userId", "insightId"]) // Prevent duplicates
```

**3. teamActivityFeed**
```typescript
teamActivityFeed: defineTable({
  teamId: v.string(),
  organizationId: v.string(),
  activityType: v.union(
    v.literal("insight_created"),
    v.literal("insight_applied"),
    v.literal("insight_dismissed"),
    v.literal("comment_added"),
    v.literal("reaction_added"),
    v.literal("session_planned"),
    v.literal("decision_created"),
    v.literal("vote_cast")
  ),
  actorUserId: v.string(),
  actorName: v.string(),
  actorAvatarUrl: v.optional(v.string()),
  targetType: v.string(), // "insight", "comment", "session", "decision"
  targetId: v.string(),
  summary: v.string(), // Human-readable: "Neil commented on Emma's insight"
  priority: v.union(v.literal("critical"), v.literal("important"), v.literal("normal")),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
})
.index("by_team_priority", ["teamId", "priority", "createdAt"])
.index("by_org", ["organizationId"])
.index("by_created", ["createdAt"])
```

**4. teamHubPresence (NEW)**
```typescript
teamHubPresence: defineTable({
  userId: v.string(),
  userName: v.string(),
  userAvatarUrl: v.optional(v.string()),
  teamId: v.string(),
  organizationId: v.string(),
  currentView: v.union(
    v.literal("insights"),
    v.literal("tasks"),
    v.literal("planning"),
    v.literal("activity")
  ),
  focusedItemType: v.optional(v.string()), // "player", "insight", "session"
  focusedItemId: v.optional(v.string()),
  lastActiveAt: v.number(),
  status: v.union(
    v.literal("active"),     // Within 30 seconds
    v.literal("idle"),       // 30s-5min
    v.literal("away")        // 5min+
  ),
})
.index("by_team_active", ["teamId", "lastActiveAt"])
.index("by_user", ["userId"])
```

**5. teamDecisions (NEW - Voting)**
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
    playerIdentityId: v.optional(v.id("orgPlayerEnrollments")),
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

**6. sessionPlans (Enhanced from original PRD)**
```typescript
sessionPlans: defineTable({
  teamId: v.string(),
  organizationId: v.string(),
  sessionDate: v.string(),
  sessionType: v.union(
    v.literal("training"),
    v.literal("match"),
    v.literal("review")
  ),
  templateUsed: v.optional(v.string()), // "pre-match", "post-training", "season"

  // Collaborative editing
  createdBy: v.string(),
  collaborators: v.array(v.string()), // Coach user IDs
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
    focusPlayers: v.array(v.id("orgPlayerEnrollments")),
  })),

  playerNotes: v.array(v.object({
    playerEnrollmentId: v.id("orgPlayerEnrollments"),
    note: v.string(),
    addedBy: v.string(),
    sourceInsightId: v.optional(v.string()), // Auto-populated
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

  createdAt: v.number(),
})
.index("by_team_date", ["teamId", "sessionDate"])
.index("by_status", ["status"])
```

### Extend Existing Schema

**coachOrgPreferences**
```typescript
coachOrgPreferences: defineTable({
  // ... existing fields (trust gate preferences, etc.)

  // NEW: Notification preferences
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

  // NEW: Parent communication preferences
  parentSummaryPreferences: v.optional(v.object({
    tone: v.union(
      v.literal("warm"),
      v.literal("professional"),
      v.literal("brief")
    ),
    verbosity: v.union(
      v.literal("concise"),
      v.literal("detailed")
    ),
  })),

  parentCommunicationPreferences: v.optional(v.object({
    frequency: v.union(
      v.literal("every_insight"),
      v.literal("daily_digest"),
      v.literal("weekly_digest")
    ),
    digestTime: v.string(), // "18:00"
  })),

  // NEW: View preferences
  teamInsightsViewPreference: v.optional(v.object({
    viewType: v.union(
      v.literal("list"),
      v.literal("board"),
      v.literal("calendar"),
      v.literal("players")
    ),
  })),
})
```

### New Queries/Mutations (with Better Auth Adapter Pattern)

**File:** `packages/backend/convex/models/teamCollaboration.ts`

```typescript
import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { components } from "../_generated/api";

// ==================== COMMENTS ====================

export const getInsightComments = query({
  args: { insightId: v.string() },
  returns: v.array(v.object({
    _id: v.id("insightComments"),
    insightId: v.string(),
    userId: v.string(),
    userName: v.string(),
    userAvatarUrl: v.optional(v.string()),
    content: v.string(),
    mentions: v.array(v.object({
      userId: v.string(),
      userName: v.string(),
    })),
    parentCommentId: v.optional(v.string()),
    priority: v.string(),
    isEdited: v.optional(v.boolean()),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("insightComments")
      .withIndex("by_insight", q => q.eq("insightId", args.insightId))
      .order("asc")
      .collect();

    return comments;
  },
});

export const addComment = mutation({
  args: {
    insightId: v.string(),
    voiceNoteId: v.id("voiceNotes"),
    teamId: v.optional(v.string()),
    content: v.string(),
    mentions: v.array(v.object({
      userId: v.string(),
      userName: v.string(),
    })),
    parentCommentId: v.optional(v.string()),
    priority: v.optional(v.union(
      v.literal("critical"),
      v.literal("important"),
      v.literal("normal")
    )),
  },
  returns: v.id("insightComments"),
  handler: async (ctx, args) => {
    // ✅ CORRECT: Use Better Auth adapter
    const user = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [{ field: "id", value: ctx.userId }]
      }
    );

    if (!user) throw new Error("Not authenticated");

    // Determine priority based on content
    const priority = args.priority || determinePriority(args.content, args.insightId);

    const commentId = await ctx.db.insert("insightComments", {
      insightId: args.insightId,
      voiceNoteId: args.voiceNoteId,
      teamId: args.teamId,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userAvatarUrl: user.avatarUrl,
      content: args.content,
      mentions: args.mentions,
      parentCommentId: args.parentCommentId,
      priority,
      mentionNotificationsSent: [],
      createdAt: Date.now(),
    });

    // Create activity feed entry
    if (args.teamId) {
      await ctx.db.insert("teamActivityFeed", {
        teamId: args.teamId,
        organizationId: user.currentOrgId || "",
        activityType: "comment_added",
        actorUserId: user.id,
        actorName: `${user.firstName} ${user.lastName}`,
        actorAvatarUrl: user.avatarUrl,
        targetType: "comment",
        targetId: commentId,
        summary: `${user.firstName} commented on an insight`,
        priority,
        createdAt: Date.now(),
      });
    }

    return commentId;
  },
});

// ==================== REACTIONS ====================

export const toggleReaction = mutation({
  args: {
    insightId: v.string(),
    type: v.union(
      v.literal("like"),
      v.literal("helpful"),
      v.literal("flag")
    ),
  },
  returns: v.string(), // "added" | "removed"
  handler: async (ctx, args) => {
    // ✅ Use Better Auth adapter
    const user = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [{ field: "id", value: ctx.userId }]
      }
    );

    if (!user) throw new Error("Not authenticated");

    // Check if reaction exists
    const existing = await ctx.db
      .query("insightReactions")
      .withIndex("by_user_insight", q =>
        q.eq("userId", user.id).eq("insightId", args.insightId)
      )
      .filter(q => q.eq(q.field("type"), args.type))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return "removed";
    } else {
      await ctx.db.insert("insightReactions", {
        insightId: args.insightId,
        userId: user.id,
        type: args.type,
        createdAt: Date.now(),
      });
      return "added";
    }
  },
});

export const getReactions = query({
  args: { insightId: v.string() },
  returns: v.object({
    like: v.number(),
    helpful: v.number(),
    flag: v.number(),
    userReacted: v.object({
      like: v.boolean(),
      helpful: v.boolean(),
      flag: v.boolean(),
    }),
    recentReactors: v.array(v.object({
      userName: v.string(),
      type: v.string(),
    })),
  }),
  handler: async (ctx, args) => {
    const reactions = await ctx.db
      .query("insightReactions")
      .withIndex("by_insight", q => q.eq("insightId", args.insightId))
      .collect();

    const user = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [{ field: "id", value: ctx.userId }]
      }
    );

    return {
      like: reactions.filter(r => r.type === "like").length,
      helpful: reactions.filter(r => r.type === "helpful").length,
      flag: reactions.filter(r => r.type === "flag").length,
      userReacted: {
        like: reactions.some(r => r.userId === user?.id && r.type === "like"),
        helpful: reactions.some(r => r.userId === user?.id && r.type === "helpful"),
        flag: reactions.some(r => r.userId === user?.id && r.type === "flag"),
      },
      recentReactors: reactions.slice(0, 5).map(r => ({
        userName: r.userId, // Will need to fetch user names
        type: r.type,
      })),
    };
  },
});

// ==================== PRESENCE ====================

export const updatePresence = mutation({
  args: {
    teamId: v.string(),
    currentView: v.union(
      v.literal("insights"),
      v.literal("tasks"),
      v.literal("planning"),
      v.literal("activity")
    ),
    focusedItemType: v.optional(v.string()),
    focusedItemId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [{ field: "id", value: ctx.userId }]
      }
    );

    if (!user) throw new Error("Not authenticated");

    // Check if presence record exists
    const existing = await ctx.db
      .query("teamHubPresence")
      .withIndex("by_user", q => q.eq("userId", user.id))
      .filter(q => q.eq(q.field("teamId"), args.teamId))
      .first();

    const now = Date.now();
    const status = "active";

    if (existing) {
      await ctx.db.patch(existing._id, {
        currentView: args.currentView,
        focusedItemType: args.focusedItemType,
        focusedItemId: args.focusedItemId,
        lastActiveAt: now,
        status,
      });
    } else {
      await ctx.db.insert("teamHubPresence", {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userAvatarUrl: user.avatarUrl,
        teamId: args.teamId,
        organizationId: user.currentOrgId || "",
        currentView: args.currentView,
        focusedItemType: args.focusedItemType,
        focusedItemId: args.focusedItemId,
        lastActiveAt: now,
        status,
      });
    }

    return null;
  },
});

export const getTeamPresence = query({
  args: {
    teamId: v.string(),
    excludeCurrentUser: v.optional(v.boolean()),
  },
  returns: v.array(v.object({
    userId: v.string(),
    userName: v.string(),
    userAvatarUrl: v.optional(v.string()),
    currentView: v.string(),
    focusedItemType: v.optional(v.string()),
    focusedItemId: v.optional(v.string()),
    status: v.string(),
    lastActiveAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - 5 * 60 * 1000; // 5 minutes

    let presences = await ctx.db
      .query("teamHubPresence")
      .withIndex("by_team_active", q =>
        q.eq("teamId", args.teamId).gt("lastActiveAt", cutoff)
      )
      .collect();

    // Filter out current user if requested
    if (args.excludeCurrentUser && ctx.userId) {
      presences = presences.filter(p => p.userId !== ctx.userId);
    }

    return presences;
  },
});

// ==================== ACTIVITY FEED ====================

export const getTeamActivityFeed = query({
  args: {
    teamId: v.optional(v.string()),
    organizationId: v.string(),
    limit: v.optional(v.number()),
    priorityFilter: v.optional(v.union(
      v.literal("critical"),
      v.literal("important"),
      v.literal("normal")
    )),
  },
  returns: v.array(v.object({
    _id: v.id("teamActivityFeed"),
    activityType: v.string(),
    actorName: v.string(),
    actorAvatarUrl: v.optional(v.string()),
    summary: v.string(),
    priority: v.string(),
    createdAt: v.number(),
    targetType: v.string(),
    targetId: v.string(),
  })),
  handler: async (ctx, args) => {
    let query = ctx.db.query("teamActivityFeed");

    if (args.teamId && args.priorityFilter) {
      query = query.withIndex("by_team_priority", q =>
        q.eq("teamId", args.teamId!)
         .eq("priority", args.priorityFilter!)
      );
    } else if (args.teamId) {
      // Use compound index but only filter by teamId
      query = query.withIndex("by_team_priority", q =>
        q.eq("teamId", args.teamId!)
      );
    } else {
      query = query.withIndex("by_org", q =>
        q.eq("organizationId", args.organizationId)
      );
    }

    const activities = await query
      .order("desc")
      .take(args.limit ?? 50);

    return activities;
  },
});

// Helper function to determine comment priority
function determinePriority(
  content: string,
  insightId: string
): "critical" | "important" | "normal" {
  const lowerContent = content.toLowerCase();

  // Critical: Injury, medical, safety keywords
  if (
    lowerContent.includes("injury") ||
    lowerContent.includes("medical") ||
    lowerContent.includes("concussion") ||
    lowerContent.includes("pain") ||
    lowerContent.includes("emergency") ||
    lowerContent.includes("urgent")
  ) {
    return "critical";
  }

  // Important: Skill, behavior, discipline
  if (
    lowerContent.includes("skill") ||
    lowerContent.includes("behavior") ||
    lowerContent.includes("discipline") ||
    lowerContent.includes("lineup") ||
    lowerContent.includes("match")
  ) {
    return "important";
  }

  return "normal";
}
```

---

## File Locations & Structure

**Files to Create:**
```
packages/backend/convex/models/
├── teamCollaboration.ts           # Week 1-2: Comments, reactions, presence, activity
├── teamDecisions.ts              # Week 3: Voting system
└── sessionPlanning.ts            # Week 3: Enhanced templates

apps/web/src/app/orgs/[orgId]/coach/
├── team-hub/                     # Week 4: New unified hub page
│   ├── page.tsx
│   └── components/
│       ├── presence-indicators.tsx        # Week 1: Real-time presence
│       ├── insights-view.tsx              # Week 3: Multi-view container
│       ├── insights-list-view.tsx         # Week 3: List
│       ├── insights-board-view.tsx        # Week 3: Kanban board
│       ├── insights-calendar-view.tsx     # Week 3: Calendar grid
│       ├── insights-player-view.tsx       # Week 3: Grouped by player
│       ├── activity-feed-view.tsx         # Week 2: Activity feed
│       ├── session-templates.tsx          # Week 3: Template library
│       ├── session-plan-editor.tsx        # Week 3: Collaborative planning
│       ├── voting-card.tsx                # Week 3: Decision voting
│       └── command-palette.tsx            # Week 3: Keyboard shortcuts

apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/
├── insight-comments.tsx           # Week 1: Comments component
├── comment-form.tsx              # Week 1-2: Form with @mentions
├── mention-autocomplete.tsx      # Week 2: Smart suggestions
├── insight-reactions.tsx         # Week 1: Reaction buttons
├── notification-center.tsx       # Week 2: Priority notifications
└── settings-tab-enhancements.tsx # Week 4: Tone/frequency controls
```

**Files to Modify:**
```
apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/
├── team-insights-tab.tsx         # Week 4: Add link to hub, presence
├── pending-review-tab.tsx        # Week 1: Add comments/reactions
└── settings-tab.tsx              # Week 4: Add preferences

packages/backend/convex/schema.ts # Week 1-3: Add all new tables
packages/backend/convex/betterAuth/schema.ts # Week 4: Extend preferences
```

---

## Implementation Guidelines

### Task Sizing for Ralph
- Each user story should complete in ONE Claude context window
- Modify 1-3 files per story maximum
- Backend stories separate from frontend stories
- Complex UI features split into smaller increments

### Better Auth Adapter Pattern (CRITICAL)
```typescript
// ❌ NEVER do this
const user = await ctx.db.query("user").first();
const member = await ctx.db.query("member").first();

// ✅ ALWAYS do this
const user = await ctx.runQuery(
  components.betterAuth.adapter.findOne,
  { model: "user", where: [...] }
);
```

### Skeleton Loading Pattern
```typescript
// Available skeletons from apps/web/src/components/loading/
import {
  PageSkeleton,
  ListSkeleton,
  CardSkeleton,
  TableSkeleton,
  FormSkeleton,
  CenteredSkeleton,
} from "@/components/loading";

// Usage
if (data === undefined) {
  return <PageSkeleton variant="dashboard" />;
}
```

### Real-Time Updates Pattern
```typescript
// Convex provides real-time subscriptions automatically
const comments = useQuery(api.models.teamCollaboration.getInsightComments, {
  insightId
});

// Comments update in real-time when others add comments - no polling!
```

### Quality Checks
```bash
# Type check (MUST pass)
npm run check-types

# Lint (MUST pass)
npx ultracite fix
npm run check

# Convex codegen (verify types)
npx -w packages/backend convex codegen
```

---

## User Stories - Week 1: Foundations + Presence (8 stories, ~15h)

### US-P9-001: Create teamCollaboration Backend Model
**Priority:** 1
**Effort:** 2h

Create foundation file with placeholder functions.

**Files to Create:**
- `packages/backend/convex/models/teamCollaboration.ts`

**Acceptance Criteria:**
- [ ] File exports placeholder queries/mutations
- [ ] All functions use Better Auth adapter pattern
- [ ] Proper validators (args + returns)
- [ ] Type check passes
- [ ] Run `npx -w packages/backend convex codegen`

---

### US-P9-002: Create Database Tables (Comments, Reactions, Activity, Presence)
**Priority:** 2
**Effort:** 3h

Add all new tables to schema with proper indexes.

**Files to Modify:**
- `packages/backend/convex/schema.ts`

**Acceptance Criteria:**
- [ ] Add insightComments table (with priority field)
- [ ] Add insightReactions table
- [ ] Add teamActivityFeed table (with priority field)
- [ ] Add teamHubPresence table (NEW)
- [ ] Add all indexes specified in schema section
- [ ] Run Convex schema push
- [ ] Type check passes

---

### US-P9-003: Implement Presence Backend (updatePresence, getTeamPresence)
**Priority:** 3
**Effort:** 2h

**Files to Modify:**
- `packages/backend/convex/models/teamCollaboration.ts`

**Acceptance Criteria:**
- [ ] Implement updatePresence mutation
- [ ] Implement getTeamPresence query
- [ ] Use Better Auth adapter for user lookup
- [ ] Auto-calculate status (active/idle/away)
- [ ] Test in Convex dashboard
- [ ] Type check passes

---

### US-P9-004: Create Presence Indicators Component
**Priority:** 4
**Effort:** 2h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/presence-indicators.tsx`

**Acceptance Criteria:**
- [ ] Component shows avatars of online coaches
- [ ] Tooltip shows: name, current view, "2 min ago"
- [ ] Real-time updates via useQuery
- [ ] Green ring for active, gray for idle
- [ ] Exclude current user from list
- [ ] Use skeleton while loading
- [ ] Type check passes
- [ ] Visual verification: presence updates in real-time

---

### US-P9-005: Implement Comment Backend (getInsightComments, addComment)
**Priority:** 5
**Effort:** 2h

**Files to Modify:**
- `packages/backend/convex/models/teamCollaboration.ts`

**Acceptance Criteria:**
- [ ] Implement getInsightComments query
- [ ] Implement addComment mutation
- [ ] Use Better Auth adapter for user lookup
- [ ] Auto-determine priority from content
- [ ] Create activity feed entry on comment
- [ ] Support threading (parentCommentId)
- [ ] Test in Convex dashboard
- [ ] Type check passes

---

### US-P9-006: Implement Reactions Backend (toggleReaction, getReactions)
**Priority:** 6
**Effort:** 1h

**Files to Modify:**
- `packages/backend/convex/models/teamCollaboration.ts`

**Acceptance Criteria:**
- [ ] Implement toggleReaction mutation (add/remove)
- [ ] Implement getReactions query
- [ ] Use Better Auth adapter
- [ ] Prevent duplicate reactions (index check)
- [ ] Return "added" or "removed" status
- [ ] Test in Convex dashboard
- [ ] Type check passes

---

### US-P9-007: Create InsightComments UI Component
**Priority:** 7
**Effort:** 2h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insight-comments.tsx`

**Acceptance Criteria:**
- [ ] Component displays comments chronologically
- [ ] Shows: avatar, name, content, timestamp
- [ ] Uses ListSkeleton while loading
- [ ] Empty state: "No comments yet - be the first!"
- [ ] Real-time updates via useQuery
- [ ] Type check passes
- [ ] Visual verification: comments render correctly

---

### US-P9-008: Create CommentForm Component
**Priority:** 8
**Effort:** 1h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/comment-form.tsx`

**Acceptance Criteria:**
- [ ] Textarea with auto-expand
- [ ] "Post" button (enabled when text entered)
- [ ] Calls addComment mutation
- [ ] Form clears after submit
- [ ] Loading state on button
- [ ] Error handling with toast
- [ ] Type check passes
- [ ] Visual verification: form works, comment appears

---

## User Stories - Week 2: Activity Feed, @Mentions, Notifications (10 stories, ~18h)

### US-P9-009: Implement Activity Feed Backend
**Priority:** 9
**Effort:** 2h

**Files to Modify:**
- `packages/backend/convex/models/teamCollaboration.ts`

**Acceptance Criteria:**
- [ ] Implement getTeamActivityFeed query
- [ ] Support teamId and organizationId filters
- [ ] Support priority filter
- [ ] Use compound index by_team_priority
- [ ] Limit default 50, max 100
- [ ] Order by createdAt desc
- [ ] Test in Convex dashboard
- [ ] Type check passes

---

### US-P9-010: Create ActivityFeedView Component
**Priority:** 10
**Effort:** 2h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/activity-feed-view.tsx`

**Acceptance Criteria:**
- [ ] Component displays activities chronologically
- [ ] Shows: actor avatar, summary, timestamp, icon
- [ ] Icon color-coded by type (insight=yellow, comment=blue, etc.)
- [ ] Uses ListSkeleton while loading
- [ ] Empty state: "No activity yet - start collaborating!"
- [ ] Real-time updates
- [ ] Type check passes
- [ ] Visual verification: activities display correctly

---

### US-P9-011: Add Activity Feed Filters
**Priority:** 11
**Effort:** 2h

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/activity-feed-view.tsx`

**Acceptance Criteria:**
- [ ] Filter tabs: All, Insights, Comments, Reactions, Sessions, Votes
- [ ] Count badges on each tab
- [ ] Filters client-side (already fetched)
- [ ] Selected filter in URL query params
- [ ] URL persistence works
- [ ] Type check passes
- [ ] Visual verification: filters work correctly

---

### US-P9-012: Add @Mention Autocomplete to CommentForm
**Priority:** 12
**Effort:** 3h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/mention-autocomplete.tsx`

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/comment-form.tsx`

**Acceptance Criteria:**
- [ ] Detect "@" typing in textarea
- [ ] Show dropdown with team coaches (fetch from backend)
- [ ] Filter by name as user types
- [ ] Keyboard navigation (↑↓ Enter)
- [ ] Insert @mention on select
- [ ] Extract mentions array for mutation
- [ ] Dropdown positioned correctly
- [ ] Type check passes
- [ ] Visual verification: autocomplete works

---

### US-P9-013: Smart Mention Autocomplete with Context
**Priority:** 13
**Effort:** 2h

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/mention-autocomplete.tsx`

**Acceptance Criteria:**
- [ ] "Suggested" section shows relevant coaches first
- [ ] If injury insight → suggest medical staff
- [ ] If player insight → suggest coaches who recently observed
- [ ] Sort by recent activity
- [ ] Show role + last active time
- [ ] "All Team Coaches" section below
- [ ] Type check passes
- [ ] Visual verification: suggestions contextual

---

### US-P9-014: Extend coachOrgPreferences with Notification Settings
**Priority:** 14
**Effort:** 1h

**Files to Modify:**
- `packages/backend/convex/schema.ts` (coachOrgPreferences table)

**Acceptance Criteria:**
- [ ] Add notificationPreferences field
- [ ] Structure: critical/important/normal → push/email/digest booleans
- [ ] Add digestTime field
- [ ] Add quietHours field
- [ ] Run Convex schema push
- [ ] Type check passes

---

### US-P9-015: Create NotificationCenter Component
**Priority:** 15
**Effort:** 3h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/notification-center.tsx`

**Acceptance Criteria:**
- [ ] Bell icon in header with unread count badge
- [ ] Dropdown shows notifications grouped by priority
- [ ] Critical → Red icon, always expanded
- [ ] Important → Yellow icon, collapsed if > 3
- [ ] Normal → Gray icon, collapsed if > 5
- [ ] Clicking notification navigates to target
- [ ] "Mark all as read" button
- [ ] Real-time updates
- [ ] Type check passes
- [ ] Visual verification: notifications display with priority

---

### US-P9-016: Add Notification Preferences to Settings Tab
**Priority:** 16
**Effort:** 2h

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx`

**Acceptance Criteria:**
- [ ] New section: "Notification Preferences"
- [ ] 3 priority levels (Critical, Important, Normal)
- [ ] Each level has: Push, Email, Digest checkboxes
- [ ] Digest time picker (if digest enabled)
- [ ] Quiet hours toggle with start/end time
- [ ] Save to coachOrgPreferences
- [ ] Type check passes
- [ ] Visual verification: preferences save and load

---

### US-P9-017: Create InsightReactions Component
**Priority:** 17
**Effort:** 1h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insight-reactions.tsx`

**Acceptance Criteria:**
- [ ] Shows 3 buttons: 👍 Like, 🌟 Helpful, 🚩 Flag
- [ ] Button active state if current user reacted
- [ ] Shows count if > 0
- [ ] Calls toggleReaction mutation
- [ ] Real-time updates
- [ ] Tooltip shows who reacted
- [ ] Type check passes
- [ ] Visual verification: reactions work, counts update

---

### US-P9-018: Update addComment to Create Activity Entries
**Priority:** 18
**Effort:** 1h

**Files to Modify:**
- `packages/backend/convex/models/teamCollaboration.ts` (addComment)

**Acceptance Criteria:**
- [ ] After inserting comment, insert teamActivityFeed entry
- [ ] Activity type: "comment_added"
- [ ] Summary: "[Name] commented on [Player]'s insight"
- [ ] Priority matches comment priority
- [ ] Type check passes
- [ ] Test: Add comment → verify activity entry created

---

## User Stories - Week 3: Multi-View, Templates, Voting (15 stories, ~28h)

### US-P9-019: Create InsightsView Container
**Priority:** 19
**Effort:** 2h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/insights-view.tsx`

**Acceptance Criteria:**
- [ ] View type state: list/board/calendar/players
- [ ] Load preference from coachOrgPreferences
- [ ] View toggle buttons (tabs)
- [ ] Conditionally render view component
- [ ] Save preference on change
- [ ] Type check passes
- [ ] Visual verification: toggle switches views

---

### US-P9-020: Create InsightsBoardView (Kanban)
**Priority:** 20
**Effort:** 2h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/insights-board-view.tsx`

**Acceptance Criteria:**
- [ ] 3 columns: Pending, Applied, Dismissed
- [ ] Count badges on headers
- [ ] Insights as cards (same as list view)
- [ ] Responsive: stack on mobile
- [ ] Uses CardSkeleton while loading
- [ ] Empty state per column
- [ ] Type check passes
- [ ] Visual verification: board layout works

---

### US-P9-021: Create InsightsCalendarView
**Priority:** 21
**Effort:** 3h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/insights-calendar-view.tsx`

**Acceptance Criteria:**
- [ ] Calendar grid showing current month
- [ ] Day cells show insight dots (colored by category)
- [ ] Count if > 3 insights
- [ ] Click day → popover with insights list
- [ ] Previous/Next month navigation
- [ ] Today highlighted
- [ ] Uses date-fns for date logic
- [ ] Responsive
- [ ] Type check passes
- [ ] Visual verification: calendar renders, popover works

---

### US-P9-022: Create InsightsPlayerView
**Priority:** 22
**Effort:** 2h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/insights-player-view.tsx`

**Acceptance Criteria:**
- [ ] Insights grouped by player
- [ ] Players sorted alphabetically
- [ ] Expand/collapse per player
- [ ] Shows avatar, name, insight count
- [ ] Search bar to filter players
- [ ] Type check passes
- [ ] Visual verification: player grouping works

---

### US-P9-023: Create Session Templates Backend
**Priority:** 23
**Effort:** 2h

**Files to Create:**
- `packages/backend/convex/models/sessionPlanning.ts`

**Acceptance Criteria:**
- [ ] Create sessionPlans table (see schema)
- [ ] Implement getSessionTemplates query (returns 3 templates)
- [ ] Implement createSessionFromTemplate mutation
- [ ] Templates: Pre-Match, Post-Training, Season Planning
- [ ] Auto-populate player notes from recent insights
- [ ] Use Better Auth adapter
- [ ] Type check passes
- [ ] Test in Convex dashboard

---

### US-P9-024: Create Session Templates UI
**Priority:** 24
**Effort:** 2h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/session-templates.tsx`

**Acceptance Criteria:**
- [ ] Gallery of 3 template cards
- [ ] Each shows: icon, name, description, checklist preview
- [ ] "Use Template" button
- [ ] Calls createSessionFromTemplate
- [ ] Success toast on create
- [ ] Type check passes
- [ ] Visual verification: templates display, create works

---

### US-P9-025: Create Session Plan Editor (Collaborative)
**Priority:** 25
**Effort:** 4h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/session-plan-editor.tsx`

**Acceptance Criteria:**
- [ ] Display session objectives (editable)
- [ ] Display drills with duration (editable)
- [ ] Player-specific notes section (with auto-population from insights)
- [ ] Equipment checklist (checkboxes)
- [ ] Coach notes (comments)
- [ ] Presence indicators showing who's editing
- [ ] Save draft / Mark ready / Mark complete
- [ ] Real-time updates via useQuery
- [ ] Type check passes
- [ ] Visual verification: collaborative editing works

---

### US-P9-026: Create Team Decisions Backend (Voting)
**Priority:** 26
**Effort:** 3h

**Files to Create:**
- `packages/backend/convex/models/teamDecisions.ts`

**Acceptance Criteria:**
- [ ] Create teamDecisions table (see schema)
- [ ] Implement createDecision mutation
- [ ] Implement castVote mutation
- [ ] Implement finalizeDecision mutation
- [ ] Implement getTeamDecisions query
- [ ] Voting weight support (head coach = 2)
- [ ] Use Better Auth adapter
- [ ] Type check passes
- [ ] Test in Convex dashboard

---

### US-P9-027: Create Voting Card Component
**Priority:** 27
**Effort:** 3h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/voting-card.tsx`

**Acceptance Criteria:**
- [ ] Display decision title and description
- [ ] Show voting options (buttons)
- [ ] Show vote count per option
- [ ] Show who voted
- [ ] Cast vote on click
- [ ] "Finalize Decision" button (head coach only)
- [ ] Real-time updates
- [ ] Type check passes
- [ ] Visual verification: voting works

---

### US-P9-028: Create Command Palette Component
**Priority:** 28
**Effort:** 2h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/command-palette.tsx`

**Acceptance Criteria:**
- [ ] Opens with Cmd+K / Ctrl+K
- [ ] Shows sections: Quick Actions, Navigation, Recent Players
- [ ] Fuzzy search across all items
- [ ] Keyboard navigation (↑↓ Enter)
- [ ] Execute action on select
- [ ] Type check passes
- [ ] Visual verification: palette opens, search works

---

### US-P9-029: Add Global Keyboard Shortcuts
**Priority:** 29
**Effort:** 1h

**Files to Create:**
- `apps/web/src/hooks/useKeyboardShortcuts.ts`

**Acceptance Criteria:**
- [ ] Global hook for keyboard shortcuts
- [ ] Cmd+K → Command palette
- [ ] K → New voice note
- [ ] C → Comment on current item
- [ ] ? → Show shortcuts help
- [ ] Esc → Close modals
- [ ] N/P → Next/Previous item
- [ ] Don't trigger when input focused
- [ ] Type check passes
- [ ] Visual verification: shortcuts work

---

### US-P9-030: Add Comment Threading UI
**Priority:** 30
**Effort:** 2h

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insight-comments.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/comment-form.tsx`

**Acceptance Criteria:**
- [ ] "Reply" button on each comment
- [ ] Reply form appears below parent (indented)
- [ ] Replies indented with border-left
- [ ] "In reply to [Name]" label
- [ ] parentCommentId passed to mutation
- [ ] Recursive rendering for nested replies
- [ ] Cancel reply button
- [ ] Type check passes
- [ ] Visual verification: threading works

---

### US-P9-031: Add Loading Skeletons to All Views
**Priority:** 31
**Effort:** 2h

**Files to Modify:**
- All view components in `team-hub/components/`

**Acceptance Criteria:**
- [ ] InsightsBoardView → CardSkeleton (3 columns)
- [ ] InsightsCalendarView → Custom grid skeleton
- [ ] InsightsPlayerView → ListSkeleton
- [ ] ActivityFeedView → ListSkeleton
- [ ] SessionTemplates → CardSkeleton (3 cards)
- [ ] VotingCard → CardSkeleton
- [ ] Smooth transitions
- [ ] Type check passes
- [ ] Visual verification: skeletons match layouts

---

### US-P9-032: Add Empty States to All Views
**Priority:** 32
**Effort:** 1h

**Files to Modify:**
- All view components in `team-hub/components/`

**Acceptance Criteria:**
- [ ] Each view has friendly empty state
- [ ] Shows icon, message, CTA button (if applicable)
- [ ] Consistent styling
- [ ] Type check passes
- [ ] Visual verification: empty states display

---

### US-P9-033: Extend coachOrgPreferences with View Preference
**Priority:** 33
**Effort:** 1h

**Files to Modify:**
- `packages/backend/convex/schema.ts`

**Acceptance Criteria:**
- [ ] Add teamInsightsViewPreference field
- [ ] Structure: { viewType: "list" | "board" | "calendar" | "players" }
- [ ] Run Convex schema push
- [ ] Type check passes

---

## User Stories - Week 4: Personalization & Polish (7 stories, ~18h)

### US-P9-034: Extend coachOrgPreferences with Parent Communication Settings
**Priority:** 34
**Effort:** 1h

**Files to Modify:**
- `packages/backend/convex/schema.ts`

**Acceptance Criteria:**
- [ ] Add parentSummaryPreferences field (tone, verbosity)
- [ ] Add parentCommunicationPreferences field (frequency, digestTime)
- [ ] Run Convex schema push
- [ ] Type check passes

---

### US-P9-035: Add Tone Controls to Settings Tab
**Priority:** 35
**Effort:** 2h

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx`

**Acceptance Criteria:**
- [ ] New section: "Communication Preferences"
- [ ] Tone dropdown: Warm, Professional, Brief
- [ ] Preview card showing example summary
- [ ] Preview updates on selection
- [ ] Save to coachOrgPreferences
- [ ] Type check passes
- [ ] Visual verification: dropdown works, preview updates

---

### US-P9-036: Add Frequency Controls to Settings Tab
**Priority:** 36
**Effort:** 2h

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx`

**Acceptance Criteria:**
- [ ] Radio buttons: Every insight, Daily digest, Weekly digest
- [ ] Time picker (if digest selected)
- [ ] Preview text: "Parents will receive summaries daily at 6 PM"
- [ ] Save to coachOrgPreferences
- [ ] Type check passes
- [ ] Visual verification: radio buttons work, saves correctly

---

### US-P9-037: Add Audio Playback to Voice Note Detail
**Priority:** 37
**Effort:** 1h

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/voice-note-detail.tsx`

**Acceptance Criteria:**
- [ ] HTML5 audio player above transcript
- [ ] Only shown if audioStorageId exists
- [ ] Play/pause, scrubbing, volume controls
- [ ] Download button
- [ ] Type check passes
- [ ] Visual verification: player works, audio plays

---

### US-P9-038: Create Inline Editing Components
**Priority:** 38
**Effort:** 3h

**Files to Create:**
- `apps/web/src/components/editable-text.tsx`
- `apps/web/src/components/editable-description.tsx`

**Acceptance Criteria:**
- [ ] Click to edit any text
- [ ] Cmd+Enter to save
- [ ] Esc to cancel
- [ ] Auto-save on blur
- [ ] Optimistic UI updates
- [ ] Type check passes
- [ ] Visual verification: inline editing works

---

### US-P9-039: Create Smart Notification Digest Backend
**Priority:** 39
**Effort:** 4h

**Files to Create:**
- `packages/backend/convex/crons/notificationDigests.ts`

**Acceptance Criteria:**
- [ ] Cron job runs daily at coach's digestTime
- [ ] Query unread activities for coach
- [ ] Group by priority (Critical, Important, Normal)
- [ ] Generate summary text
- [ ] Send email via action (Resend or SendGrid)
- [ ] Mark activities as included in digest
- [ ] Type check passes
- [ ] Test: Manually trigger cron, verify email

---

### US-P9-040: Create Team Hub Page (Unification)
**Priority:** 40
**Effort:** 3h

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/page.tsx`

**Acceptance Criteria:**
- [ ] Team selector dropdown (if multiple teams)
- [ ] Tab navigation: Insights, Tasks, Planning, Activity
- [ ] Presence indicators in header
- [ ] Notification center in header
- [ ] URL persistence: `?team=[teamId]&tab=insights`
- [ ] Uses PageSkeleton while loading
- [ ] Type check passes
- [ ] Visual verification: page loads, tabs work, team selector works

---

## Coaching-Specific Innovations (Future Enhancements)

These are features that NO existing platform does well for sports teams:

### 1. AI-Suggested Session Focus
Based on recent insights, auto-suggest session objectives:
```
🤖 AI Suggestion for Thursday Training:
• 3 players struggling with hand passing → Recommend: Hand pass drill
• 2 injury recoveries → Recommend: Modified fitness work
• Team defensive positioning weak → Recommend: Shape practice
```

### 2. Parent Communication Coordination
Prevent duplicate messages to parents:
```
⚠️ Coach Sarah already sent Emma's parent a summary today.
[View Sarah's Message] [Send Anyway] [Add to Sarah's Thread]
```

### 3. Cross-Team Pattern Recognition
```
💡 Pattern Detected: U12, U14, U16 all struggling with same drill.
[Start Discussion]
```

### 4. Automated Follow-up Reminders
```
🔔 You noted Emma's hand pass improved to 4/5 two weeks ago. Time to reassess?
[Record Follow-up Note] [Remind in 1 Week]
```

---

## Testing Guide - Phase 9

### Test Accounts
- Coach 1 (Head): `coach1@test.com` / `test123`
- Coach 2 (Assistant): `coach2@test.com` / `test123`
- Platform Staff: `neil.B@blablablak.com` / `lien1979`

### Coaching-Specific Test Scenarios

#### Scenario 1: Pre-Match Coordination
**Setup:**
- 3 coaches preparing for match
- 2 players with recent injuries
- 1 player with availability question

**Test Flow:**
1. Head coach creates pre-match checklist from template
2. Checklist auto-populates with 2 injury checks
3. All 3 coaches see presence indicators
4. Assistant coach comments on lineup decision
5. Physio updates injury status with @mention to head coach
6. Head coach receives critical notification immediately
7. Voting initiated for Man of the Match
8. All actions in activity feed

**Expected Result:**
- No duplicate work
- Critical info surfaced immediately
- Democratic decision made efficiently

#### Scenario 2: Post-Training Debrief
**Setup:**
- 2 coaches observed training
- 12 players participated

**Test Flow:**
1. Both coaches see each other's presence in Team Hub
2. Coach A records observation about Player 1
3. Coach B sees notification (low priority, digest mode)
4. Coach B adds comment to observation
5. Coach A receives comment notification (normal priority, next digest)
6. Session checklist marked complete collaboratively

**Expected Result:**
- Efficient recording
- No notification fatigue
- Clear attribution

---

## Success Metrics

### User Experience Goals
- ✅ Team collaboration engagement: +200% (comments, reactions)
- ✅ Coach-to-coach @mentions: 50+ per week per org
- ✅ Session template usage: 40% of sessions
- ✅ Tone customization adoption: 60% of coaches
- ✅ Coach satisfaction: 4.5/5 survey rating

### Technical Goals
- ✅ Type check passes
- ✅ Lint passes
- ✅ Real-time updates work (Convex subscriptions)
- ✅ All views load in < 2 seconds
- ✅ No console errors

---

## Known Limitations & Future Enhancements

**Limitations:**
1. Drag-and-drop not supported in Board view (MVP)
2. Digest batching requires cron job (Week 4 story)
3. Push notifications require additional setup (post-P9)

**Post-P9 Enhancements:**
- Team timeline view (8-10h)
- Conflict resolution & merge (10h)
- Video integration (12h)
- WhatsApp coach groups integration (4-week project)
- Custom templates per org
- Mobile app optimizations

---

## Summary: What Makes This Best-in-Class

**From Modern Collaboration Platforms:**
- ✅ Real-time presence (Figma)
- ✅ Priority notifications (Linear)
- ✅ Command palette (Linear, Notion)
- ✅ Collaborative editing (Google Docs, Notion)
- ✅ Voting & decisions (Miro, Productboard)
- ✅ Activity feed (Asana, Linear)
- ✅ Multi-view flexibility (ClickUp, Monday)

**Unique to Coaching:**
- ✅ AI-suggested session focus (auto from insights)
- ✅ Parent communication coordination (prevent duplicates)
- ✅ Cross-team pattern recognition (org-wide insights)
- ✅ Automated follow-up reminders (development tracking)
- ✅ Injury-aware templates (auto-populate from insights)
- ✅ Democratic decision-making for teams (MVP, lineup, focus)

**Total Effort:** ~60 hours across 4 weeks (40 user stories)
**User Value:** Transforms team collaboration from "useful" to "indispensable"

---

**Document Version:** 2.0
**Created:** January 27, 2026
**Updated:** January 30, 2026
**Author:** Claude Sonnet 4.5
**Ready for Ralph:** Yes ✅
