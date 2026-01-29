# PRD: Phase 9 - Team Collaboration Hub & AI Personalization

**Project:** Voice Notes - Team Collaboration Hub
**Branch:** `ralph/team-collaboration-hub-p9`
**Created:** January 27, 2026
**Status:** Ready for Implementation
**Estimated Time:** 4 weeks (30-35 user stories)
**Priority:** 🟡 HIGH - Transforms to collaboration platform

---

## Executive Summary

**Problem Statement:**
Team Insights features are fragmented across two locations (dashboard tab + separate page) and lack collaborative features found in modern workplace tools. Coaches working on the same team cannot discuss insights, react to observations, notify teammates with @mentions, or see real-time team activity.

Additionally, AI tone and frequency controls are hardcoded, limiting personalization for different coaching styles and parent preferences.

**The Vision:**
Transform Voice Notes from a personal tool into a **team collaboration platform** inspired by Notion, ClickUp, Figma, and Asana. Enable coaches to work together seamlessly, customize communication styles, and view insights in flexible formats.

**What's Already Done (Phases 1-8):**
- ✅ Voice notes with AI transcription and insights
- ✅ Trust level system with auto-apply
- ✅ Parent summaries with acknowledgment
- ✅ Team Insights tab (basic list view)
- ✅ Team Insights page (persistent observations)
- ✅ "My Impact" dashboard (Phase 8)

**What This PRD Delivers:**

### Week 1: Collaboration Foundations
- Comments on insights (threaded discussions)
- Reactions (like, helpful, flag)
- Backend infrastructure for activity feed
- Comments UI component

### Week 2: Activity Feed & @Mentions
- Real-time activity feed showing team actions
- @mention support in comments
- Notification system for mentions
- Read/unread states

### Week 3: Multi-View & Templates
- View toggle: List / Board / Calendar / Players
- Board view (Kanban by status)
- Calendar view (insights by date)
- Player view (grouped by player)
- Session templates (Pre-Match, Training, Season Review)

### Week 4: Personalization & Polish
- Tone controls (Warm / Professional / Brief)
- Frequency controls (Every insight / Daily digest / Weekly digest)
- Audio playback in voice note detail
- Coach learning dashboard (correction patterns)
- Team Hub page unification

---

## Context & Architecture

### Critical User Insights (from Section 19)

> "Team Insights split across two locations - should merge. No comments/reactions on insights - can't discuss. No @mentions to notify teammates. No activity feed showing team actions in real-time."

**Collaboration Gaps:**
1. **Can't discuss insights** - No threaded discussions
2. **Can't notify teammates** - No @mentions
3. **Can't react quickly** - No like/helpful/flag buttons
4. **Can't see team activity** - No real-time feed
5. **Single view only** - No Board/Calendar/Player alternatives
6. **No session prep tools** - No templates for common workflows

### Inspiration from Industry Leaders

**Notion Patterns:**
- Inline comments with threading
- @mentions with auto-suggest
- Real-time presence indicators
- Block-based modularity

**ClickUp Patterns:**
- Multiple view types (List, Board, Calendar, Table)
- View preferences per user
- Custom automations

**Figma Patterns:**
- Live cursors showing teammate locations
- Cursor chat for quick messages
- Observation mode (follow teammate)

**Asana Patterns:**
- Activity feed with actor-verb-object format
- Templates for recurring workflows
- Scalable permissions

### Backend APIs (Need to Create)

**New Tables Required:**
```typescript
// Comments on insights
insightComments: defineTable({
  insightId: v.string(),
  voiceNoteId: v.id("voiceNotes"),
  userId: v.string(),
  content: v.string(),
  mentions: v.array(v.object({ userId, userName })),
  createdAt: v.number(),
  parentCommentId: v.optional(v.string()), // for threading
})

// Reactions on insights
insightReactions: defineTable({
  insightId: v.string(),
  userId: v.string(),
  type: v.union("like", "helpful", "flag"),
  createdAt: v.number(),
})

// Team activity feed
teamActivityFeed: defineTable({
  teamId: v.string(),
  organizationId: v.string(),
  activityType: v.string(), // "insight_created", "comment_added", etc.
  actorUserId: v.string(),
  targetType: v.string(),
  targetId: v.string(),
  summary: v.string(), // "Neil applied injury insight to Sarah"
  createdAt: v.number(),
})

// Session prep templates
sessionPrep: defineTable({
  teamId: v.string(),
  sessionType: v.union("training", "match", "review"),
  createdBy: v.string(),
  objectives: v.array(v.string()),
  status: v.union("draft", "shared", "completed"),
  createdAt: v.number(),
})
```

**New Queries/Mutations:**
```typescript
// Comments
api.models.teamCollaboration.getInsightComments({ insightId })
api.models.teamCollaboration.addComment({ insightId, content, mentions })
api.models.teamCollaboration.deleteComment({ commentId })

// Reactions
api.models.teamCollaboration.toggleReaction({ insightId, type })
api.models.teamCollaboration.getReactions({ insightId })

// Activity Feed
api.models.teamCollaboration.getTeamActivityFeed({ teamId, limit })
api.models.teamCollaboration.markActivityRead({ activityId })

// Session Templates
api.models.teamCollaboration.getSessionTemplates({ orgId })
api.models.teamCollaboration.createSession({ teamId, template, objectives })
```

**Extend Existing Schema:**
```typescript
coachOrgPreferences: {
  // NEW: Parent communication preferences
  parentSummaryPreferences: {
    tone: "warm" | "professional" | "brief",
    verbosity: "concise" | "detailed",
  },
  parentCommunicationPreferences: {
    frequency: "every_insight" | "daily_digest" | "weekly_digest",
    digestTime: "18:00",
  },
  // NEW: View preferences
  teamInsightsViewPreference: {
    viewType: "list" | "board" | "calendar" | "players",
  },
}
```

### File Locations

**Files to Create:**
```
packages/backend/convex/models/
├── teamCollaboration.ts                     # Week 1: New model file
└── sessionTemplates.ts                      # Week 3: Templates

apps/web/src/app/orgs/[orgId]/coach/
├── team-insights-hub/                       # Week 4: New hub page
│   ├── page.tsx
│   └── components/
│       ├── insights-view.tsx                # Week 3: Multi-view container
│       ├── insights-list-view.tsx           # Week 3: List (migrate existing)
│       ├── insights-board-view.tsx          # Week 3: Kanban board
│       ├── insights-calendar-view.tsx       # Week 3: Calendar grid
│       ├── insights-player-view.tsx         # Week 3: Grouped by player
│       ├── activity-feed-view.tsx           # Week 2: Activity feed
│       └── session-templates.tsx            # Week 3: Template library

apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/
├── insight-comments.tsx                     # Week 1: Comments component
├── comment-form.tsx                         # Week 1: Comment input with @mentions
├── insight-reactions.tsx                    # Week 1: Reaction buttons
└── settings-tab-enhancements.tsx            # Week 4: Tone/frequency controls
```

**Files to Modify:**
```
apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/
├── team-insights-tab.tsx                    # Week 4: Add link to hub
└── pending-review-tab.tsx                   # Week 1: Add comments/reactions to insights
```

---

## Implementation Guidelines

### Task Sizing for Ralph
- Each user story should complete in ONE Claude context window
- Modify 1-3 files per story maximum
- Backend stories separate from frontend stories
- Complex UI features split into smaller increments

### Quality Checks
```bash
# Type check (MUST pass)
npm run check-types

# Lint (MUST pass)
npx ultracite fix
npm run check

# Visual verification (for UI changes)
# - Test comments: Add, edit, @mention, thread
# - Test reactions: Click to add/remove
# - Test views: Switch between List/Board/Calendar/Players
# - Test on desktop (1920px) and mobile (375px)
```

### Real-Time Updates Pattern
```typescript
// Use Convex subscriptions for real-time
const comments = useQuery(api.models.teamCollaboration.getInsightComments, {
  insightId
});

// Comments update automatically when others add comments
// No polling needed!
```

### Component Patterns
```typescript
// ✅ Threading support
interface Comment {
  _id: string;
  content: string;
  userId: string;
  userName: string;
  createdAt: number;
  parentCommentId?: string; // null for top-level, set for replies
  mentions: Array<{ userId: string, userName: string }>;
}

// ✅ @mention autocomplete
import { useState, useEffect } from "react";

function MentionAutocomplete({ query, onSelect }: Props) {
  const coaches = useQuery(api.models.teams.getTeamCoaches, { teamId });
  const filtered = coaches?.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );
  return <div>...</div>;
}
```

---

## User Stories - Week 1: Collaboration Foundations

### US-P9-001: Create teamCollaboration Backend Model

**As a** backend developer
**I want to** create the team collaboration model file
**So that** we have a foundation for comments, reactions, and activity feeds

**Acceptance Criteria:**
- [ ] Create `packages/backend/convex/models/teamCollaboration.ts`
- [ ] File exports placeholder queries/mutations:
  - `getInsightComments` (query)
  - `addComment` (mutation)
  - `toggleReaction` (mutation)
  - `getTeamActivityFeed` (query)
- [ ] Each function has proper validators (args + returns)
- [ ] Type check passes
- [ ] Run `npx -w packages/backend convex codegen`

**Files to Create:**
- `packages/backend/convex/models/teamCollaboration.ts`

**Technical Notes:**
```typescript
import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

export const getInsightComments = query({
  args: { insightId: v.string() },
  returns: v.array(v.any()), // Will define proper type in next story
  handler: async (ctx, args) => {
    // Placeholder implementation
    return [];
  },
});

// Add other placeholders...
```

**Priority:** 1 (foundation)

---

### US-P9-002: Create insightComments Database Table

**As a** backend developer
**I want to** create the insightComments table schema
**So that** we can store threaded discussions on insights

**Acceptance Criteria:**
- [ ] Add `insightComments` table to `packages/backend/convex/schema.ts`
- [ ] Table fields:
  - `insightId: v.string()` (reference to insight)
  - `voiceNoteId: v.id("voiceNotes")`
  - `teamId: v.optional(v.string())`
  - `userId: v.string()` (author)
  - `userName: v.string()` (cached for display)
  - `content: v.string()` (comment text)
  - `mentions: v.array(v.object({ userId: v.string(), userName: v.string() }))`
  - `parentCommentId: v.optional(v.string())` (null = top-level, set = reply)
  - `createdAt: v.number()`
  - `updatedAt: v.optional(v.number())`
- [ ] Add indexes:
  - `.index("by_insight", ["insightId"])`
  - `.index("by_voice_note", ["voiceNoteId"])`
  - `.index("by_team", ["teamId"])`
  - `.index("by_user", ["userId"])`
  - `.index("by_created", ["createdAt"])`
- [ ] Run Convex schema push
- [ ] Type check passes

**Files to Modify:**
- `packages/backend/convex/schema.ts`

**Technical Notes:**
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
  parentCommentId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
.index("by_insight", ["insightId"])
.index("by_voice_note", ["voiceNoteId"])
.index("by_team", ["teamId"])
.index("by_user", ["userId"])
.index("by_created", ["createdAt"]),
```

**Priority:** 2 (required for comments)

---

### US-P9-003: Create insightReactions Database Table

**As a** backend developer
**I want to** create the insightReactions table schema
**So that** coaches can quickly react to insights

**Acceptance Criteria:**
- [ ] Add `insightReactions` table to schema
- [ ] Table fields:
  - `insightId: v.string()`
  - `userId: v.string()`
  - `type: v.union("like", "helpful", "flag")`
  - `createdAt: v.number()`
- [ ] Add indexes:
  - `.index("by_insight", ["insightId"])`
  - `.index("by_user_insight", ["userId", "insightId"])` (prevent duplicates)
- [ ] Run Convex schema push
- [ ] Type check passes

**Files to Modify:**
- `packages/backend/convex/schema.ts`

**Technical Notes:**
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
.index("by_user_insight", ["userId", "insightId"]),
```

**Priority:** 3 (required for reactions)

---

### US-P9-004: Implement getInsightComments Query

**As a** backend developer
**I want to** implement the query to fetch comments for an insight
**So that** the UI can display threaded discussions

**Acceptance Criteria:**
- [ ] Implement `getInsightComments` in `teamCollaboration.ts`
- [ ] Query accepts `insightId: string`
- [ ] Query returns comments sorted by `createdAt` ascending
- [ ] Query fetches user details for each comment author
- [ ] Query supports threading (returns flat array, frontend handles nesting)
- [ ] Include proper validators
- [ ] Type check passes
- [ ] Test query in Convex dashboard

**Files to Modify:**
- `packages/backend/convex/models/teamCollaboration.ts`

**Technical Notes:**
```typescript
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
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
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
```

**Priority:** 4 (required for comments UI)

---

### US-P9-005: Implement addComment Mutation

**As a** backend developer
**I want to** implement the mutation to add a comment
**So that** coaches can comment on insights

**Acceptance Criteria:**
- [ ] Implement `addComment` in `teamCollaboration.ts`
- [ ] Mutation accepts: `insightId`, `content`, `mentions`, `parentCommentId` (optional)
- [ ] Mutation validates user is authenticated
- [ ] Mutation creates comment record with user details
- [ ] Mutation creates activity feed entry (see US-P9-010)
- [ ] Mutation returns comment ID
- [ ] Include proper validators
- [ ] Type check passes
- [ ] Test mutation in Convex dashboard

**Files to Modify:**
- `packages/backend/convex/models/teamCollaboration.ts`

**Technical Notes:**
```typescript
export const addComment = mutation({
  args: {
    insightId: v.string(),
    voiceNoteId: v.id("voiceNotes"),
    content: v.string(),
    mentions: v.array(v.object({
      userId: v.string(),
      userName: v.string(),
    })),
    parentCommentId: v.optional(v.string()),
  },
  returns: v.id("insightComments"),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const commentId = await ctx.db.insert("insightComments", {
      insightId: args.insightId,
      voiceNoteId: args.voiceNoteId,
      userId: user.userId || user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userAvatarUrl: user.avatarUrl,
      content: args.content,
      mentions: args.mentions,
      parentCommentId: args.parentCommentId,
      createdAt: Date.now(),
    });

    // TODO: Create activity feed entry (US-P9-010)

    return commentId;
  },
});
```

**Priority:** 5 (required for comments UI)

---

### US-P9-006: Implement toggleReaction Mutation

**As a** backend developer
**I want to** implement the mutation to toggle reactions
**So that** coaches can react to insights

**Acceptance Criteria:**
- [ ] Implement `toggleReaction` in `teamCollaboration.ts`
- [ ] Mutation accepts: `insightId`, `type` ("like" | "helpful" | "flag")
- [ ] Mutation validates user is authenticated
- [ ] If reaction exists → delete it (toggle off)
- [ ] If reaction doesn't exist → create it (toggle on)
- [ ] Mutation returns status: "added" | "removed"
- [ ] Include proper validators
- [ ] Type check passes
- [ ] Test mutation in Convex dashboard

**Files to Modify:**
- `packages/backend/convex/models/teamCollaboration.ts`

**Technical Notes:**
```typescript
export const toggleReaction = mutation({
  args: {
    insightId: v.string(),
    type: v.union(v.literal("like"), v.literal("helpful"), v.literal("flag")),
  },
  returns: v.string(), // "added" | "removed"
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const userId = user.userId || user._id;

    // Check if reaction exists
    const existing = await ctx.db
      .query("insightReactions")
      .withIndex("by_user_insight", q =>
        q.eq("userId", userId).eq("insightId", args.insightId)
      )
      .filter(q => q.eq(q.field("type"), args.type))
      .first();

    if (existing) {
      // Remove reaction (toggle off)
      await ctx.db.delete(existing._id);
      return "removed";
    } else {
      // Add reaction (toggle on)
      await ctx.db.insert("insightReactions", {
        insightId: args.insightId,
        userId,
        type: args.type,
        createdAt: Date.now(),
      });
      // TODO: Create activity feed entry if reaction type is "helpful" or "flag"
      return "added";
    }
  },
});
```

**Priority:** 6 (required for reactions UI)

---

### US-P9-007: Create InsightComments UI Component

**As a** frontend developer
**I want to** create the comments UI component
**So that** coaches can view and add comments on insights

**Acceptance Criteria:**
- [ ] Create `insight-comments.tsx` component
- [ ] Component accepts `insightId` and `voiceNoteId` props
- [ ] Component uses `useQuery` to fetch comments
- [ ] Component displays comments sorted chronologically
- [ ] Each comment shows:
  - [ ] Author name with avatar (first initial if no photo)
  - [ ] Comment content
  - [ ] Timestamp (formatDistanceToNow)
  - [ ] "Reply" button (for threading - implement in later story)
- [ ] Component shows "No comments yet" empty state
- [ ] Loading state shows skeleton
- [ ] Type check passes
- [ ] Visual verification: Comments display correctly

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insight-comments.tsx`

**Technical Notes:**
```typescript
interface InsightCommentsProps {
  insightId: string;
  voiceNoteId: string;
}

export function InsightComments({ insightId, voiceNoteId }: InsightCommentsProps) {
  const comments = useQuery(
    api.models.teamCollaboration.getInsightComments,
    { insightId }
  );

  if (comments === undefined) return <Skeleton />;
  if (comments.length === 0) return <EmptyState />;

  return (
    <div className="space-y-4">
      {comments.map(comment => (
        <CommentCard key={comment._id} comment={comment} />
      ))}
    </div>
  );
}
```

**Priority:** 7 (enables commenting)

---

### US-P9-008: Create CommentForm Component with Text Input

**As a** frontend developer
**I want to** create the comment form component
**So that** coaches can add comments

**Acceptance Criteria:**
- [ ] Create `comment-form.tsx` component
- [ ] Component accepts `insightId` and `voiceNoteId` props
- [ ] Component has textarea input (auto-expanding)
- [ ] Placeholder text: "Add a comment..."
- [ ] "Post" button enabled only when text entered
- [ ] Submit button calls `addComment` mutation
- [ ] Form clears after successful submission
- [ ] Loading state on button during submission
- [ ] Error handling with toast notification
- [ ] Type check passes
- [ ] Visual verification: Form works, comment appears in list

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/comment-form.tsx`

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insight-comments.tsx` (import and use form)

**Technical Notes:**
```typescript
export function CommentForm({ insightId, voiceNoteId }: Props) {
  const [content, setContent] = useState("");
  const addComment = useMutation(api.models.teamCollaboration.addComment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      await addComment({
        insightId,
        voiceNoteId,
        content,
        mentions: [], // Will add @mention parsing in next story
      });
      setContent("");
      toast.success("Comment added");
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**Priority:** 8 (enables commenting)

---

### US-P9-009: Create InsightReactions Component

**As a** frontend developer
**I want to** create the reactions UI component
**So that** coaches can react to insights

**Acceptance Criteria:**
- [ ] Create `insight-reactions.tsx` component
- [ ] Component accepts `insightId` prop
- [ ] Component shows 3 reaction buttons:
  - [ ] 👍 Like (blue on active)
  - [ ] 🌟 Helpful (yellow on active)
  - [ ] 🚩 Flag (red on active)
- [ ] Clicking button calls `toggleReaction` mutation
- [ ] Button shows count if reactions exist ("👍 5")
- [ ] Button shows active state if current user reacted
- [ ] Hover tooltip shows who reacted ("You, Sarah, and 3 others")
- [ ] Real-time updates when others react
- [ ] Type check passes
- [ ] Visual verification: Reactions work, count updates

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insight-reactions.tsx`

**Technical Notes:**
```typescript
export function InsightReactions({ insightId }: Props) {
  const reactions = useQuery(
    api.models.teamCollaboration.getReactions,
    { insightId }
  );
  const toggleReaction = useMutation(
    api.models.teamCollaboration.toggleReaction
  );

  const handleReact = async (type: "like" | "helpful" | "flag") => {
    try {
      await toggleReaction({ insightId, type });
    } catch (error) {
      toast.error("Failed to react");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <ReactionButton
        type="like"
        icon="👍"
        count={reactions?.like ?? 0}
        active={reactions?.userReacted.like}
        onClick={() => handleReact("like")}
      />
      {/* More buttons... */}
    </div>
  );
}
```

**Priority:** 9 (enables quick reactions)

---

## User Stories - Week 2: Activity Feed & @Mentions

### US-P9-010: Create teamActivityFeed Database Table

**As a** backend developer
**I want to** create the activity feed table schema
**So that** we can track team actions in real-time

**Acceptance Criteria:**
- [ ] Add `teamActivityFeed` table to schema
- [ ] Table fields:
  - `teamId: v.string()`
  - `organizationId: v.string()`
  - `activityType: v.string()` (see list below)
  - `actorUserId: v.string()`
  - `actorName: v.string()` (cached)
  - `targetType: v.string()` (insight, comment, session)
  - `targetId: v.string()`
  - `summary: v.string()` (human-readable)
  - `metadata: v.optional(v.any())` (extra context)
  - `createdAt: v.number()`
- [ ] Activity types:
  - "insight_created", "insight_applied", "insight_dismissed"
  - "comment_added", "reaction_added"
  - "session_planned", "task_created", "task_completed"
- [ ] Add indexes:
  - `.index("by_team", ["teamId"])`
  - `.index("by_org", ["organizationId"])`
  - `.index("by_created", ["createdAt"])`
- [ ] Type check passes

**Files to Modify:**
- `packages/backend/convex/schema.ts`

**Technical Notes:**
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
    v.literal("task_created"),
    v.literal("task_completed")
  ),
  actorUserId: v.string(),
  actorName: v.string(),
  actorAvatarUrl: v.optional(v.string()),
  targetType: v.string(),
  targetId: v.string(),
  summary: v.string(),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
})
.index("by_team", ["teamId"])
.index("by_org", ["organizationId"])
.index("by_created", ["createdAt"]),
```

**Priority:** 10 (foundation for activity feed)

---

### US-P9-011: Implement getTeamActivityFeed Query

**As a** backend developer
**I want to** implement the query to fetch team activity
**So that** the UI can display real-time team actions

**Acceptance Criteria:**
- [ ] Implement `getTeamActivityFeed` in `teamCollaboration.ts`
- [ ] Query accepts: `teamId` (optional), `organizationId`, `limit` (default 50)
- [ ] If `teamId` provided → filter by team
- [ ] If no `teamId` → show all teams in org where user is coach
- [ ] Query returns activities sorted by `createdAt` descending
- [ ] Include proper validators
- [ ] Type check passes
- [ ] Test query in Convex dashboard

**Files to Modify:**
- `packages/backend/convex/models/teamCollaboration.ts`

**Technical Notes:**
```typescript
export const getTeamActivityFeed = query({
  args: {
    teamId: v.optional(v.string()),
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("teamActivityFeed"),
    activityType: v.string(),
    actorName: v.string(),
    actorAvatarUrl: v.optional(v.string()),
    summary: v.string(),
    createdAt: v.number(),
    targetType: v.string(),
    targetId: v.string(),
  })),
  handler: async (ctx, args) => {
    let query = ctx.db.query("teamActivityFeed");

    if (args.teamId) {
      query = query.withIndex("by_team", q => q.eq("teamId", args.teamId!));
    } else {
      query = query.withIndex("by_org", q => q.eq("organizationId", args.organizationId));
    }

    const activities = await query
      .order("desc")
      .take(args.limit ?? 50);

    return activities;
  },
});
```

**Priority:** 11 (required for activity feed UI)

---

### US-P9-012: Update addComment to Create Activity Entry

**As a** backend developer
**I want to** update addComment mutation to create activity feed entries
**So that** comments appear in the team activity feed

**Acceptance Criteria:**
- [ ] Modify `addComment` mutation
- [ ] After creating comment, create activity feed entry
- [ ] Activity type: "comment_added"
- [ ] Summary format: "[ActorName] commented on [PlayerName]'s insight"
- [ ] Include teamId from insight context
- [ ] Type check passes
- [ ] Test: Add comment → verify activity entry created

**Files to Modify:**
- `packages/backend/convex/models/teamCollaboration.ts`

**Technical Notes:**
```typescript
// In addComment mutation, after inserting comment:
const voiceNote = await ctx.db.get(args.voiceNoteId);
const insight = JSON.parse(voiceNote?.insights || "[]").find(
  (i: any) => i.id === args.insightId
);

await ctx.db.insert("teamActivityFeed", {
  teamId: insight.teamId || "",
  organizationId: voiceNote?.organizationId || "",
  activityType: "comment_added",
  actorUserId: user.userId || user._id,
  actorName: `${user.firstName} ${user.lastName}`,
  actorAvatarUrl: user.avatarUrl,
  targetType: "comment",
  targetId: commentId,
  summary: `${user.firstName} commented on ${insight.playerName}'s insight`,
  createdAt: Date.now(),
});
```

**Priority:** 12 (enables activity feed)

---

### US-P9-013: Add @Mention Parsing to CommentForm

**As a** frontend developer
**I want to** add @mention autocomplete to comment form
**So that** coaches can notify teammates

**Acceptance Criteria:**
- [ ] Modify `comment-form.tsx`
- [ ] Detect "@" typing in textarea
- [ ] Show dropdown with team coaches (autocomplete)
- [ ] Filter coaches by name as user types
- [ ] Select coach from list → insert @mention
- [ ] @mention formatted as `@Coach Sarah` in text
- [ ] Mentions extracted and passed to mutation
- [ ] Dropdown positioned below cursor (or above if near bottom)
- [ ] Keyboard navigation (↑↓ to select, Enter to insert)
- [ ] Type check passes
- [ ] Visual verification: Autocomplete works, mentions parsed correctly

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/comment-form.tsx`

**Technical Notes:**
```typescript
import { useState, useEffect } from "react";

function useMentionAutocomplete(text: string, cursorPos: number) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  useEffect(() => {
    // Check if cursor is after "@"
    const beforeCursor = text.slice(0, cursorPos);
    const match = beforeCursor.match(/@(\w*)$/);

    if (match) {
      setMentionQuery(match[1]); // Text after @
    } else {
      setMentionQuery(null);
    }
  }, [text, cursorPos]);

  return mentionQuery;
}

// In component:
const coaches = useQuery(api.models.teams.getTeamCoaches, { teamId });
const filteredCoaches = coaches?.filter(c =>
  c.name.toLowerCase().includes(mentionQuery?.toLowerCase() || "")
);

function insertMention(coach: Coach) {
  // Replace "@query" with "@Coach Name"
  // Add to mentions array: [{ userId: coach.id, userName: coach.name }]
}
```

**Priority:** 13 (enables @mentions)

---

### US-P9-014: Create ActivityFeedView Component

**As a** frontend developer
**I want to** create the activity feed UI component
**So that** coaches can see team activity in real-time

**Acceptance Criteria:**
- [ ] Create `activity-feed-view.tsx` in team-insights-hub components
- [ ] Component accepts `teamId` and `organizationId` props
- [ ] Component uses `useQuery` to fetch activity
- [ ] Component displays activities in chronological order (newest first)
- [ ] Each activity shows:
  - [ ] Actor avatar (first initial)
  - [ ] Activity summary (e.g., "Neil applied injury insight to Sarah")
  - [ ] Timestamp (formatDistanceToNow)
  - [ ] Icon based on activity type (insight=star, comment=message, etc.)
  - [ ] Clickable to view target (insight, comment, session)
- [ ] Shows "No activity yet" empty state
- [ ] Loading state shows skeleton
- [ ] Type check passes
- [ ] Visual verification: Activities display correctly, real-time updates work

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-insights-hub/components/activity-feed-view.tsx`

**Technical Notes:**
```typescript
export function ActivityFeedView({ teamId, organizationId }: Props) {
  const activities = useQuery(
    api.models.teamCollaboration.getTeamActivityFeed,
    { teamId, organizationId, limit: 50 }
  );

  const getIcon = (type: string) => {
    switch (type) {
      case "insight_created": return <Star className="h-4 w-4 text-yellow-600" />;
      case "insight_applied": return <Check className="h-4 w-4 text-green-600" />;
      case "comment_added": return <MessageSquare className="h-4 w-4 text-blue-600" />;
      default: return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-2">
      {activities?.map(activity => (
        <ActivityCard key={activity._id} activity={activity} icon={getIcon(activity.activityType)} />
      ))}
    </div>
  );
}
```

**Priority:** 14 (enables activity visibility)

---

### US-P9-015: Add Activity Type Filter to Feed

**As a** coach
**I want to** filter activity feed by type
**So that** I can focus on specific actions

**Acceptance Criteria:**
- [ ] Add filter dropdown above activity feed
- [ ] Options: "All", "Insights", "Comments", "Reactions", "Sessions"
- [ ] Default: "All"
- [ ] Selecting filter updates visible activities (client-side filter)
- [ ] Count badge on each filter
- [ ] Selected filter has active state
- [ ] Filter state persists in URL query params
- [ ] Type check passes
- [ ] Visual verification: Filter works correctly

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/team-insights-hub/components/activity-feed-view.tsx`

**Technical Notes:**
```typescript
const [filterType, setFilterType] = useState<string>("all");

const filteredActivities = activities?.filter(a => {
  if (filterType === "all") return true;
  if (filterType === "insights") return a.activityType.includes("insight");
  if (filterType === "comments") return a.activityType === "comment_added";
  if (filterType === "reactions") return a.activityType === "reaction_added";
  return true;
});
```

**Priority:** 15 (enhances usability)

---

## User Stories - Week 3: Multi-View & Templates

### US-P9-016: Create InsightsView Container Component

**As a** frontend developer
**I want to** create a container for multi-view insights
**So that** coaches can switch between List/Board/Calendar/Players views

**Acceptance Criteria:**
- [ ] Create `insights-view.tsx` in team-insights-hub components
- [ ] Component accepts `teamId` and `organizationId` props
- [ ] Component has view type state: "list" | "board" | "calendar" | "players"
- [ ] Component loads preference from coach settings (localStorage initially)
- [ ] Component renders view toggle buttons at top
- [ ] Component conditionally renders view based on selection:
  - List → `InsightsListView`
  - Board → `InsightsBoardView`
  - Calendar → `InsightsCalendarView`
  - Players → `InsightsPlayerView`
- [ ] View preference saved when changed
- [ ] Type check passes
- [ ] Visual verification: View toggle works

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-insights-hub/components/insights-view.tsx`

**Technical Notes:**
```typescript
export function InsightsView({ teamId, organizationId }: Props) {
  const [viewType, setViewType] = useState<ViewType>(() =>
    (localStorage.getItem("team-insights-view") as ViewType) || "list"
  );

  useEffect(() => {
    localStorage.setItem("team-insights-view", viewType);
  }, [viewType]);

  return (
    <div>
      <ViewTypeTabs value={viewType} onChange={setViewType} />
      {viewType === "list" && <InsightsListView teamId={teamId} />}
      {viewType === "board" && <InsightsBoardView teamId={teamId} />}
      {viewType === "calendar" && <InsightsCalendarView teamId={teamId} />}
      {viewType === "players" && <InsightsPlayerView teamId={teamId} />}
    </div>
  );
}
```

**Priority:** 16 (foundation for multi-view)

---

### US-P9-017: Create InsightsBoardView Component (Kanban)

**As a** coach
**I want to** view insights in a Board (Kanban) layout
**So that** I can see insights organized by status

**Acceptance Criteria:**
- [ ] Create `insights-board-view.tsx` component
- [ ] Component fetches insights for team
- [ ] Board has 3 columns:
  - [ ] "Pending" (status=pending)
  - [ ] "Applied" (status=applied)
  - [ ] "Dismissed" (status=dismissed)
- [ ] Each column shows count badge
- [ ] Insights displayed as cards (same as list view)
- [ ] Cards show: player name, insight description, category, timestamp
- [ ] Drag-and-drop NOT implemented in MVP (future enhancement)
- [ ] Responsive: columns stack vertically on mobile
- [ ] Type check passes
- [ ] Visual verification: Board layout works, columns display correctly

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-insights-hub/components/insights-board-view.tsx`

**Technical Notes:**
```typescript
export function InsightsBoardView({ teamId }: Props) {
  const insights = useQuery(api.models.teamInsights.getTeamInsights, { teamId });

  const pending = insights?.filter(i => i.status === "pending");
  const applied = insights?.filter(i => i.status === "applied");
  const dismissed = insights?.filter(i => i.status === "dismissed");

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Column title="Pending" count={pending?.length} insights={pending} />
      <Column title="Applied" count={applied?.length} insights={applied} />
      <Column title="Dismissed" count={dismissed?.length} insights={dismissed} />
    </div>
  );
}
```

**Priority:** 17 (enables Board view)

---

### US-P9-018: Create InsightsCalendarView Component

**As a** coach
**I want to** view insights on a calendar
**So that** I can see patterns by date

**Acceptance Criteria:**
- [ ] Create `insights-calendar-view.tsx` component
- [ ] Component fetches insights for team
- [ ] Calendar shows current month (use date-fns for date logic)
- [ ] Each day cell shows:
  - [ ] Day number
  - [ ] Dots/badges for insights on that day (colored by category)
  - [ ] Count if > 3 insights: "5 insights"
- [ ] Clicking day opens popover with insights list for that day
- [ ] Month navigation: Previous/Next buttons
- [ ] Today highlighted
- [ ] Responsive: scales on mobile
- [ ] Type check passes
- [ ] Visual verification: Calendar renders correctly, clicking days works

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-insights-hub/components/insights-calendar-view.tsx`

**Technical Notes:**
```typescript
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";

export function InsightsCalendarView({ teamId }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const insights = useQuery(api.models.teamInsights.getTeamInsights, { teamId });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  function getInsightsForDay(day: Date) {
    return insights?.filter(i =>
      format(i.createdAt, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
    );
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(day => (
        <DayCell
          key={day.toString()}
          day={day}
          insights={getInsightsForDay(day)}
        />
      ))}
    </div>
  );
}
```

**Priority:** 18 (enables Calendar view)

---

### US-P9-019: Create InsightsPlayerView Component

**As a** coach
**I want to** view insights grouped by player
**So that** I can see all insights for each player

**Acceptance Criteria:**
- [ ] Create `insights-player-view.tsx` component
- [ ] Component fetches insights for team
- [ ] Insights grouped by player name
- [ ] Players sorted alphabetically
- [ ] Each player section has:
  - [ ] Player name with avatar (expandable)
  - [ ] Insight count badge
  - [ ] Insights listed chronologically
- [ ] Players with no insights hidden
- [ ] Expand/collapse each player section
- [ ] Search bar to filter players
- [ ] Type check passes
- [ ] Visual verification: Player grouping works, expand/collapse functional

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-insights-hub/components/insights-player-view.tsx`

**Technical Notes:**
```typescript
export function InsightsPlayerView({ teamId }: Props) {
  const insights = useQuery(api.models.teamInsights.getTeamInsights, { teamId });

  // Group by player
  const playerGroups = insights?.reduce((acc, insight) => {
    const player = insight.playerName;
    if (!acc[player]) acc[player] = [];
    acc[player].push(insight);
    return acc;
  }, {} as Record<string, Insight[]>);

  return (
    <div className="space-y-4">
      {Object.entries(playerGroups || {}).map(([playerName, playerInsights]) => (
        <PlayerSection
          key={playerName}
          playerName={playerName}
          insights={playerInsights}
        />
      ))}
    </div>
  );
}
```

**Priority:** 19 (enables Player view)

---

### US-P9-020: Create Session Templates Component

**As a** coach
**I want to** use pre-built session templates
**So that** I save time on session planning

**Acceptance Criteria:**
- [ ] Create `session-templates.tsx` component
- [ ] Component shows template library with 3 templates:
  1. **Pre-Match Review** - Checklist: injury check, formations, opposition analysis
  2. **Training Session** - Checklist: warmup plan, drills, skills focus
  3. **Season Review** - Checklist: player progress, goals achieved, next steps
- [ ] Each template card shows:
  - [ ] Template name with icon
  - [ ] Description
  - [ ] Checklist preview (first 3 items)
  - [ ] "Use Template" button
- [ ] Clicking "Use Template" creates new session with checklist
- [ ] Session saved to `sessionPrep` table
- [ ] Type check passes
- [ ] Visual verification: Templates display, create session works

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-insights-hub/components/session-templates.tsx`

**Technical Notes:**
```typescript
const TEMPLATES = [
  {
    id: "pre-match",
    name: "Pre-Match Review",
    description: "Prepare your team for the upcoming match",
    icon: <Trophy />,
    checklist: [
      "Review injury report and player availability",
      "Confirm formations and starting lineup",
      "Analyze opposition strengths and weaknesses",
      "Review set pieces and tactical plans",
      "Check equipment and travel arrangements",
    ],
  },
  // ... more templates
];

function createSession(template: Template) {
  await createSessionMutation({
    teamId,
    sessionType: template.id,
    objectives: template.checklist,
    status: "draft",
  });
  toast.success("Session created from template");
}
```

**Priority:** 20 (enables templates)

---

## User Stories - Week 4: Personalization & Polish

### US-P9-021: Extend coachOrgPreferences Schema

**As a** backend developer
**I want to** extend coach preferences to include communication settings
**So that** coaches can customize tone and frequency

**Acceptance Criteria:**
- [ ] Modify `coachOrgPreferences` table in schema
- [ ] Add `parentSummaryPreferences` field:
  - `tone: "warm" | "professional" | "brief"`
  - `verbosity: "concise" | "detailed"` (default: "detailed")
- [ ] Add `parentCommunicationPreferences` field:
  - `frequency: "every_insight" | "daily_digest" | "weekly_digest"`
  - `digestTime: string` (default: "18:00")
- [ ] Fields optional (use defaults if not set)
- [ ] Run Convex schema push
- [ ] Type check passes

**Files to Modify:**
- `packages/backend/convex/schema.ts`

**Technical Notes:**
```typescript
coachOrgPreferences: defineTable({
  // ... existing fields

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
})
```

**Priority:** 21 (foundation for personalization)

---

### US-P9-022: Add Tone Controls to Settings Tab

**As a** coach
**I want to** choose the tone for parent summaries
**So that** my communication matches my coaching style

**Acceptance Criteria:**
- [ ] Add "Communication Preferences" section to Settings tab
- [ ] Section shows tone dropdown: "Warm", "Professional", "Brief"
- [ ] Each option shows example summary preview
- [ ] Selecting option saves to `coachOrgPreferences`
- [ ] Current selection displayed as selected
- [ ] Preview updates instantly when selection changes
- [ ] Type check passes
- [ ] Visual verification: Dropdown works, preview shows, saves correctly

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx`

**Technical Notes:**
```typescript
const TONE_EXAMPLES = {
  warm: "Hi! Great news - Sarah showed wonderful improvement in her hand pass today. She's really putting in the effort and it's paying off! 🌟",
  professional: "Sarah demonstrated measurable improvement in hand pass technique during today's session. Rating increased from 3/5 to 4/5.",
  brief: "Sarah: Hand pass improved to 4/5. Good session.",
};

function TonePreference() {
  const [tone, setTone] = useState<Tone>("warm");
  const updatePrefs = useMutation(api.models.coachOrgPreferences.update);

  const handleChange = async (newTone: Tone) => {
    setTone(newTone);
    await updatePrefs({
      coachId,
      organizationId,
      parentSummaryPreferences: { tone: newTone },
    });
  };

  return (
    <div>
      <Select value={tone} onValueChange={handleChange}>...</Select>
      <PreviewCard text={TONE_EXAMPLES[tone]} />
    </div>
  );
}
```

**Priority:** 22 (enables personalization)

---

### US-P9-023: Add Frequency Controls to Settings Tab

**As a** coach
**I want to** batch parent summaries into digests
**So that** I don't overwhelm parents with notifications

**Acceptance Criteria:**
- [ ] Add "Frequency" section below tone controls
- [ ] Section shows radio buttons:
  - [ ] "Every insight" (immediate)
  - [ ] "Daily digest" (batched at 6 PM)
  - [ ] "Weekly digest" (batched Sunday evening)
- [ ] If digest selected, show time picker (default 18:00)
- [ ] Show preview: "Parents will receive summaries daily at 6 PM"
- [ ] Selecting option saves to `coachOrgPreferences`
- [ ] Type check passes
- [ ] Visual verification: Radio buttons work, saves correctly

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx`

**Technical Notes:**
```typescript
function FrequencyPreference() {
  const [frequency, setFrequency] = useState<Frequency>("every_insight");
  const [digestTime, setDigestTime] = useState("18:00");

  const previewText = {
    every_insight: "Parents will receive summaries immediately after approval",
    daily_digest: `Parents will receive summaries daily at ${digestTime}`,
    weekly_digest: "Parents will receive summaries Sunday at 6 PM",
  };

  return (
    <div>
      <RadioGroup value={frequency} onValueChange={setFrequency}>
        <RadioGroupItem value="every_insight" />
        <RadioGroupItem value="daily_digest" />
        <RadioGroupItem value="weekly_digest" />
      </RadioGroup>
      {frequency === "daily_digest" && (
        <Input type="time" value={digestTime} onChange={...} />
      )}
      <p className="text-sm text-muted-foreground">{previewText[frequency]}</p>
    </div>
  );
}
```

**Priority:** 23 (enables personalization)

---

### US-P9-024: Add Audio Playback to Voice Note Detail

**As a** coach
**I want to** listen to my original voice recording
**So that** I can verify transcription accuracy

**Acceptance Criteria:**
- [ ] Modify voice note detail view component
- [ ] If `audioStorageId` exists, show audio player
- [ ] Player positioned above transcript
- [ ] Player uses HTML5 `<audio>` element with controls
- [ ] Player shows:
  - [ ] Play/pause button
  - [ ] Scrubbing bar
  - [ ] Duration (e.g., "2:34")
  - [ ] Volume control
- [ ] "Download" button next to player
- [ ] Player NOT shown if no audio (WhatsApp text messages)
- [ ] Type check passes
- [ ] Visual verification: Player works, audio plays correctly

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/voice-note-detail.tsx` (or equivalent)

**Technical Notes:**
```typescript
{note.audioStorageId && (
  <div className="mb-4">
    <audio
      controls
      src={audioUrl}
      className="w-full"
      preload="metadata"
    >
      Your browser does not support audio playback.
    </audio>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => downloadAudio(audioUrl, note.title)}
    >
      <Download className="h-4 w-4 mr-2" />
      Download Audio
    </Button>
  </div>
)}
```

**Priority:** 24 (nice-to-have, low usage expected)

---

### US-P9-025: Create Coach Learning Dashboard Component

**As a** coach
**I want to** see my correction patterns and agreement rate
**So that** I can improve my voice note quality

**Acceptance Criteria:**
- [ ] Create new section in Settings tab: "Learning Insights"
- [ ] Section shows:
  - [ ] Agreement rate: "87% of insights not corrected"
  - [ ] Common corrections summary:
    - "Wrong player assigned (5x) - Try using full names"
    - "Wrong category (4x)"
    - "Confidence too high (3x)"
  - [ ] Tips based on patterns
  - [ ] Compare with org average (if available)
- [ ] Data sourced from `coachOverrideAnalytics` table
- [ ] Only shown if coach has 10+ voice notes (insufficient data otherwise)
- [ ] Type check passes
- [ ] Visual verification: Dashboard shows, data accurate

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx`
- `packages/backend/convex/models/voiceNotes.ts` (add query for learning data)

**Technical Notes:**
```typescript
const learningData = useQuery(
  api.models.voiceNotes.getCoachLearningInsights,
  { coachId, organizationId }
);

if (!learningData || learningData.totalNotes < 10) {
  return <EmptyState message="Create 10+ voice notes to see learning insights" />;
}

return (
  <div className="space-y-4">
    <StatCard
      label="Agreement Rate"
      value={`${learningData.agreementRate}%`}
      description="Insights you didn't need to correct"
    />
    <CorrectionsList corrections={learningData.commonCorrections} />
    <TipsList tips={learningData.tips} />
  </div>
);
```

**Priority:** 25 (enables coach improvement)

---

### US-P9-026: Create Team Hub Page Structure

**As a** frontend developer
**I want to** create the unified Team Hub page
**So that** coaches have a single destination for team collaboration

**Acceptance Criteria:**
- [ ] Create `team-insights-hub` directory under `/coach/`
- [ ] Create `page.tsx` for main hub page
- [ ] Page shows:
  - [ ] Team selector dropdown (if coach has multiple teams)
  - [ ] Tab navigation: Insights | Tasks | Planning | Activity
  - [ ] Selected tab content renders below
- [ ] Default tab: "Insights"
- [ ] Team selection persists in URL: `?team=[teamId]`
- [ ] Page accessible at `/orgs/[orgId]/coach/team-insights-hub`
- [ ] Type check passes
- [ ] Visual verification: Page loads, tabs switch, team selector works

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-insights-hub/page.tsx`

**Technical Notes:**
```typescript
export default function TeamInsightsHubPage() {
  const searchParams = useSearchParams();
  const [selectedTeam, setSelectedTeam] = useState(
    searchParams.get("team") || ""
  );
  const [activeTab, setActiveTab] = useState<TabType>("insights");

  const teams = useQuery(api.models.teams.getCoachTeams, { coachId, orgId });

  return (
    <div className="container py-6">
      <TeamSelector
        teams={teams}
        selected={selectedTeam}
        onChange={setSelectedTeam}
      />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="insights">
          <InsightsView teamId={selectedTeam} />
        </TabsContent>
        {/* More tabs... */}
      </Tabs>
    </div>
  );
}
```

**Priority:** 26 (unifies collaboration)

---

### US-P9-027: Add Link to Team Hub from Team Insights Tab

**As a** coach
**I want to** easily navigate from the Team Insights tab to the full hub
**So that** I can access deeper collaboration features

**Acceptance Criteria:**
- [ ] Modify Team Insights tab in voice notes dashboard
- [ ] Add button at top: "Open Team Hub →"
- [ ] Button navigates to `/coach/team-insights-hub?team=[teamId]`
- [ ] Button styled as secondary button with icon
- [ ] Tooltip: "View full team collaboration workspace"
- [ ] Type check passes
- [ ] Visual verification: Button visible, navigates correctly

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/team-insights-tab.tsx`

**Technical Notes:**
```typescript
<div className="flex items-center justify-between mb-4">
  <h2 className="text-lg font-semibold">Team Insights</h2>
  <Button
    variant="outline"
    size="sm"
    onClick={() => router.push(`/orgs/${orgId}/coach/team-insights-hub?team=${teamId}`)}
  >
    Open Team Hub
    <ArrowRight className="h-4 w-4 ml-2" />
  </Button>
</div>
```

**Priority:** 27 (enables navigation)

---

### US-P9-028: Add Comment Threading UI

**As a** frontend developer
**I want to** enable threaded replies to comments
**So that** discussions stay organized

**Acceptance Criteria:**
- [ ] Modify `insight-comments.tsx`
- [ ] Each comment shows "Reply" button
- [ ] Clicking Reply shows nested reply form
- [ ] Replies indented below parent comment
- [ ] Replies show "In reply to [ParentAuthor]" label
- [ ] Reply form has same @mention functionality
- [ ] Cancel button to close reply form
- [ ] Threads collapsible (future enhancement: just implement structure)
- [ ] Type check passes
- [ ] Visual verification: Reply works, threading displays correctly

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insight-comments.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/comment-form.tsx` (add parentCommentId prop)

**Technical Notes:**
```typescript
function CommentCard({ comment, onReply }: Props) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  return (
    <div className="border-l-2 pl-4">
      <div className="flex items-start gap-3">
        <Avatar>{comment.userName[0]}</Avatar>
        <div className="flex-1">
          <p className="text-sm font-medium">{comment.userName}</p>
          <p className="text-sm">{comment.content}</p>
          <Button size="sm" variant="ghost" onClick={() => setShowReplyForm(true)}>
            Reply
          </Button>
        </div>
      </div>

      {showReplyForm && (
        <div className="ml-12 mt-2">
          <CommentForm
            insightId={comment.insightId}
            parentCommentId={comment._id}
            onCancel={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {/* Render replies recursively */}
      {comment.replies?.map(reply => (
        <div className="ml-8 mt-2" key={reply._id}>
          <CommentCard comment={reply} onReply={onReply} />
        </div>
      ))}
    </div>
  );
}
```

**Priority:** 28 (enhances discussions)

---

### US-P9-029: Add Loading Skeletons to All Views

**As a** frontend developer
**I want to** add loading skeletons to all collaboration components
**So that** the UI doesn't appear broken during loading

**Acceptance Criteria:**
- [ ] Add skeletons to:
  - [ ] InsightsView (all view types)
  - [ ] ActivityFeedView
  - [ ] InsightComments
  - [ ] SessionTemplates
- [ ] Skeletons mimic actual layout
- [ ] Skeletons use shadcn Skeleton component
- [ ] Skeletons have pulse animation
- [ ] Smooth transition from skeleton to data
- [ ] Type check passes
- [ ] Visual verification: Skeletons show during load, transitions smooth

**Files to Modify:**
- All view components in `team-insights-hub/components/`

**Technical Notes:**
```typescript
if (data === undefined) {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-3 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Priority:** 29 (UX polish)

---

### US-P9-030: Add Empty States to All Views

**As a** frontend developer
**I want to** add empty states to all collaboration components
**So that** users understand when there's no data

**Acceptance Criteria:**
- [ ] Add empty states to:
  - [ ] InsightsBoardView: "No pending insights"
  - [ ] InsightsCalendarView: "No insights this month"
  - [ ] InsightsPlayerView: "No insights for this team yet"
  - [ ] ActivityFeedView: "No activity yet - start collaborating!"
  - [ ] InsightComments: "No comments yet - be the first!"
  - [ ] SessionTemplates: Shows even if no sessions (templates always available)
- [ ] Empty states show:
  - [ ] Icon (relevant to view)
  - [ ] Friendly message
  - [ ] Call-to-action button (if applicable)
- [ ] Empty states styled consistently
- [ ] Type check passes
- [ ] Visual verification: Empty states display correctly

**Files to Modify:**
- All view components in `team-insights-hub/components/`

**Technical Notes:**
```typescript
if (insights.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No insights yet</h3>
      <p className="text-muted-foreground mb-4">
        Record a voice note to create your first team insight
      </p>
      <Button onClick={goToVoiceNotes}>Record Voice Note</Button>
    </div>
  );
}
```

**Priority:** 30 (UX polish)

---

## Testing Guide - Phase 9

### Setup for Testing

**Prerequisites:**
- Dev server running on port 3000
- Multiple coaches in same team
- Test data: voice notes with insights, some applied, some pending
- At least 2 teams per coach for multi-team testing

**Test Accounts:**
- Coach 1 (Team Lead): `coach1@test.com` / `test123`
- Coach 2 (Assistant): `coach2@test.com` / `test123`
- Platform Staff: `neil.B@blablablak.com` / `lien1979`

### Test Cases - Week 1

#### TC-P9-001: Comments Backend

**Test Steps:**
1. Open Convex dashboard
2. Navigate to Functions → teamCollaboration
3. Test `getInsightComments` with test insightId
4. Verify returns empty array if no comments
5. Test `addComment` with valid data
6. Verify comment created in table
7. Test `getInsightComments` again
8. Verify returns created comment
9. Test `addComment` with mentions array
10. Verify mentions stored correctly

**Expected Result:**
- ✅ Queries execute without errors
- ✅ Comments persisted correctly
- ✅ Mentions array stored
- ✅ Timestamps accurate

---

#### TC-P9-002: Reactions Backend

**Test Steps:**
1. Test `toggleReaction` with type="like"
2. Verify reaction created in table
3. Test `toggleReaction` again (same user, same insight)
4. Verify reaction deleted (toggle off)
5. Test `toggleReaction` with different type
6. Verify new reaction created
7. Test with multiple users reacting to same insight
8. Verify each user can react independently

**Expected Result:**
- ✅ Toggle works (add/remove)
- ✅ Returns "added" or "removed"
- ✅ Multiple users can react
- ✅ No duplicate reactions per user/insight/type

---

#### TC-P9-003: Comments UI

**Test Steps:**
1. Login as Coach 1
2. Navigate to voice notes → Pending Review tab
3. Find insight with comments enabled
4. Verify comment section visible
5. Add test comment: "Great observation!"
6. Verify comment appears immediately
7. Login as Coach 2 (different browser/incognito)
8. Navigate to same insight
9. Verify Coach 1's comment visible
10. Add reply comment
11. Switch back to Coach 1 tab
12. Verify Coach 2's comment appeared (real-time)

**Expected Result:**
- ✅ Comments display correctly
- ✅ Real-time updates work
- ✅ Author names and avatars shown
- ✅ Timestamps formatted properly

---

#### TC-P9-004: Reactions UI

**Test Steps:**
1. Navigate to insight with reactions
2. Verify 3 reaction buttons visible: 👍 🌟 🚩
3. Click "Like" button
4. Verify button shows active state (colored)
5. Verify count shows: "👍 1"
6. Click "Like" again
7. Verify button deactivates (toggle off)
8. Verify count resets to hidden
9. Login as different coach
10. Click "Like" on same insight
11. Verify count now shows: "👍 1"
12. Hover over button
13. Verify tooltip shows: "You liked this"

**Expected Result:**
- ✅ Reactions toggle correctly
- ✅ Counts update real-time
- ✅ Active state visual feedback
- ✅ Tooltips show reactors

---

### Test Cases - Week 2

#### TC-P9-005: Activity Feed Backend

**Test Steps:**
1. Create test comment (triggers activity entry)
2. Query `getTeamActivityFeed` for team
3. Verify activity entry exists
4. Verify summary: "[Name] commented on [Player]'s insight"
5. Test with teamId filter
6. Verify only that team's activities shown
7. Test without teamId (all org teams)
8. Verify all activities shown
9. Test with limit=10
10. Verify only 10 activities returned

**Expected Result:**
- ✅ Activity entries created automatically
- ✅ Summaries human-readable
- ✅ Filters work correctly
- ✅ Sorted by createdAt desc

---

#### TC-P9-006: Activity Feed UI

**Test Steps:**
1. Navigate to Team Hub page
2. Click "Activity" tab
3. Verify activities listed chronologically
4. Verify each activity shows:
   - Actor avatar
   - Activity summary
   - Timestamp
   - Icon (color-coded by type)
5. Perform action (e.g., apply insight)
6. Return to Activity tab
7. Verify new activity appeared at top
8. Test with no activities
9. Verify empty state: "No activity yet"

**Expected Result:**
- ✅ Activities display correctly
- ✅ Real-time updates work
- ✅ Icons and colors appropriate
- ✅ Empty state shows

---

#### TC-P9-007: @Mention Autocomplete

**Test Steps:**
1. Navigate to comment form
2. Type: "Hey @"
3. Verify dropdown appears with team coaches
4. Verify current coach NOT in list (can't mention self)
5. Type: "Hey @sar"
6. Verify dropdown filters to "Sarah"
7. Press Down arrow key
8. Verify "Sarah" highlighted
9. Press Enter
10. Verify "@Sarah" inserted in text
11. Verify dropdown closes
12. Submit comment
13. Verify mention stored in DB

**Expected Result:**
- ✅ Autocomplete appears on "@"
- ✅ Filters by name typed
- ✅ Keyboard navigation works
- ✅ Mention inserted correctly
- ✅ Mentions saved to DB

---

#### TC-P9-008: Activity Feed Filters

**Test Steps:**
1. Navigate to Activity tab
2. Verify filter buttons: All, Insights, Comments, Reactions, Sessions
3. Verify count badges on each filter
4. Click "Insights" filter
5. Verify only insight activities shown
6. Verify URL updated: `?filter=insights`
7. Click "Comments" filter
8. Verify only comment activities shown
9. Click "All"
10. Verify all activities return
11. Navigate away and back
12. Verify filter persisted from URL

**Expected Result:**
- ✅ Filters work correctly
- ✅ Count badges accurate
- ✅ URL persistence works
- ✅ No console errors

---

### Test Cases - Week 3

#### TC-P9-009: Multi-View Toggle

**Test Steps:**
1. Navigate to Team Hub → Insights tab
2. Verify view toggle buttons visible: List | Board | Calendar | Players
3. Default view: List
4. Click "Board"
5. Verify Board view renders (Kanban columns)
6. Click "Calendar"
7. Verify Calendar view renders (month grid)
8. Click "Players"
9. Verify Player view renders (grouped by player)
10. Click "List"
11. Verify List view returns
12. Close tab and reopen
13. Verify last view (List) persisted

**Expected Result:**
- ✅ All 4 views render correctly
- ✅ Toggle switches views
- ✅ View preference persists
- ✅ No layout shift or flicker

---

#### TC-P9-010: Board View (Kanban)

**Test Steps:**
1. Select Board view
2. Verify 3 columns: Pending | Applied | Dismissed
3. Verify count badges on column headers
4. Verify insights displayed as cards
5. Verify cards show: player name, description, category, timestamp
6. Test with no pending insights
7. Verify "Pending" column shows empty state
8. Test on mobile (375px)
9. Verify columns stack vertically
10. Verify horizontal scroll not needed

**Expected Result:**
- ✅ Kanban layout works
- ✅ Cards display correctly
- ✅ Counts accurate
- ✅ Mobile responsive

---

#### TC-P9-011: Calendar View

**Test Steps:**
1. Select Calendar view
2. Verify current month displayed
3. Verify days numbered correctly
4. Identify day with insights
5. Verify colored dots/badges shown
6. Click day with insights
7. Verify popover opens showing insights list
8. Verify insight details displayed
9. Click outside popover
10. Verify popover closes
11. Click "Previous Month" button
12. Verify month navigates backward
13. Click "Next Month"
14. Verify month navigates forward
15. Test on mobile
16. Verify calendar responsive

**Expected Result:**
- ✅ Calendar renders correctly
- ✅ Insights plotted on correct days
- ✅ Popover works
- ✅ Month navigation works
- ✅ Mobile responsive

---

#### TC-P9-012: Player View

**Test Steps:**
1. Select Player view
2. Verify insights grouped by player
3. Verify players sorted alphabetically
4. Verify each player section shows:
   - Player name with avatar
   - Insight count badge
   - Insights listed chronologically
5. Click player section to expand
6. Verify insights visible
7. Click again to collapse
8. Verify insights hidden
9. Test search: Type player name
10. Verify filtered to matching players
11. Clear search
12. Verify all players return

**Expected Result:**
- ✅ Player grouping works
- ✅ Expand/collapse functional
- ✅ Search filters correctly
- ✅ Counts accurate

---

#### TC-P9-013: Session Templates

**Test Steps:**
1. Navigate to Team Hub → Planning tab
2. Verify 3 templates displayed:
   - Pre-Match Review
   - Training Session
   - Season Review
3. Verify each template shows:
   - Icon and name
   - Description
   - Checklist preview
   - "Use Template" button
4. Click "Use Template" on Pre-Match Review
5. Verify loading state on button
6. Verify success toast: "Session created from template"
7. Verify new session appears in sessions list
8. Open session detail
9. Verify checklist items from template loaded

**Expected Result:**
- ✅ Templates display correctly
- ✅ Create session works
- ✅ Checklist copied to session
- ✅ Toast notification shown

---

### Test Cases - Week 4

#### TC-P9-014: Tone Controls

**Test Steps:**
1. Navigate to Settings tab
2. Scroll to "Communication Preferences"
3. Verify tone dropdown: Warm | Professional | Brief
4. Select "Warm"
5. Verify preview shows warm-toned example
6. Select "Professional"
7. Verify preview updates to professional tone
8. Select "Brief"
9. Verify preview updates to brief tone
10. Save preference (auto-saves on change)
11. Close and reopen Settings
12. Verify tone persisted
13. Test: Create parent summary (Phase 8 feature)
14. Verify tone applied to generated summary

**Expected Result:**
- ✅ Dropdown works
- ✅ Previews update instantly
- ✅ Preference persists
- ✅ Tone applied to summaries

---

#### TC-P9-015: Frequency Controls

**Test Steps:**
1. Navigate to Settings tab
2. Scroll to "Frequency" section
3. Verify radio buttons:
   - Every insight (default)
   - Daily digest
   - Weekly digest
4. Select "Daily digest"
5. Verify time picker appears (default 18:00)
6. Change time to "20:00"
7. Verify preview: "Parents will receive summaries daily at 8 PM"
8. Select "Weekly digest"
9. Verify time picker hidden
10. Verify preview: "Parents will receive summaries Sunday at 6 PM"
11. Save preference
12. Close and reopen
13. Verify frequency persisted

**Expected Result:**
- ✅ Radio buttons work
- ✅ Time picker conditional
- ✅ Preview updates correctly
- ✅ Preference persists

---

#### TC-P9-016: Audio Playback

**Test Steps:**
1. Navigate to voice notes → History tab
2. Find voice note with audio (app-recorded or WhatsApp)
3. Click to expand note detail
4. Verify audio player visible above transcript
5. Click play button
6. Verify audio plays
7. Verify duration shows (e.g., "2:34")
8. Click pause button
9. Verify audio pauses
10. Drag scrubbing bar
11. Verify audio jumps to position
12. Click download button
13. Verify audio file downloads
14. Test voice note without audio (text-only WhatsApp)
15. Verify NO audio player shown

**Expected Result:**
- ✅ Player visible for audio notes
- ✅ Play/pause works
- ✅ Scrubbing works
- ✅ Download works
- ✅ Hidden for text-only notes

---

#### TC-P9-017: Coach Learning Dashboard

**Test Steps:**
1. Navigate to Settings tab
2. Scroll to "Learning Insights" section
3. If coach has < 10 notes:
   - Verify empty state: "Create 10+ voice notes to see learning insights"
4. If coach has 10+ notes:
   - Verify agreement rate displayed (e.g., "87%")
   - Verify common corrections list shown
   - Verify each correction shows:
     - Count (e.g., "Wrong player (5x)")
     - Tip (e.g., "Try using full names")
   - Verify org average comparison (if data available)
5. Test with coach who frequently corrects AI
6. Verify lower agreement rate
7. Test with coach who rarely corrects
8. Verify high agreement rate

**Expected Result:**
- ✅ Dashboard shows for 10+ notes
- ✅ Agreement rate accurate
- ✅ Corrections grouped correctly
- ✅ Tips helpful

---

#### TC-P9-018: Team Hub Page

**Test Steps:**
1. Navigate to `/orgs/[orgId]/coach/team-insights-hub`
2. Verify page loads without errors
3. Verify team selector visible (if multiple teams)
4. Select team from dropdown
5. Verify URL updates: `?team=[teamId]`
6. Verify tabs visible: Insights | Tasks | Planning | Activity
7. Click each tab
8. Verify content renders correctly
9. Verify tab state persists when navigating back/forward
10. Test with coach assigned to only 1 team
11. Verify team selector hidden (or disabled)

**Expected Result:**
- ✅ Page loads correctly
- ✅ Team selector works
- ✅ Tabs switch correctly
- ✅ URL persistence works

---

#### TC-P9-019: Link from Team Insights Tab

**Test Steps:**
1. Navigate to voice notes dashboard → Team tab
2. Verify "Open Team Hub →" button visible
3. Hover button
4. Verify tooltip: "View full team collaboration workspace"
5. Click button
6. Verify navigates to Team Hub page
7. Verify correct team pre-selected in hub
8. Verify Insights tab active by default

**Expected Result:**
- ✅ Button visible
- ✅ Navigation works
- ✅ Team context preserved

---

#### TC-P9-020: Comment Threading

**Test Steps:**
1. Navigate to insight with comments
2. Find top-level comment
3. Click "Reply" button
4. Verify reply form appears below comment
5. Type reply: "I agree with this!"
6. Click "Post"
7. Verify reply appears indented below parent
8. Verify reply shows: "In reply to [ParentAuthor]"
9. Test nested reply (reply to reply)
10. Verify indentation increases
11. Test collapse/expand thread (if implemented)
12. Verify thread visibility toggles

**Expected Result:**
- ✅ Reply form shows
- ✅ Replies indented correctly
- ✅ Threading visual hierarchy clear
- ✅ Nested replies work

---

### Regression Testing

#### RT-P9-001: Phase 8 Features Unaffected
- [ ] My Impact tab still works
- [ ] Sent to Parents tab still accessible
- [ ] Applied insights section works
- [ ] Date range filtering works
- [ ] Search and filters work

#### RT-P9-002: Existing Voice Notes Features
- [ ] Voice note recording works
- [ ] Insights extraction works
- [ ] Trust level progression works
- [ ] Auto-apply at Level 2+ works
- [ ] Parent summaries generate correctly

#### RT-P9-003: Performance
- [ ] Team Hub loads in < 2 seconds
- [ ] Real-time updates work (comments, reactions, activity)
- [ ] No memory leaks (Chrome DevTools)
- [ ] Multi-view switching smooth (no lag)

#### RT-P9-004: Mobile Experience
- [ ] All views work on mobile (375px)
- [ ] Comments form works on mobile
- [ ] Reactions buttons tappable (min 44px)
- [ ] Calendar view responsive
- [ ] Board view stacks columns on mobile

---

## Success Metrics

### User Experience Goals
- ✅ Team collaboration engagement: +200% (comments, reactions)
- ✅ Coach-to-coach @mentions: 50+ per week per org
- ✅ Session template usage: 40% of sessions
- ✅ Tone customization adoption: 60% of coaches
- ✅ Coach satisfaction with collaboration: 4.5/5 survey rating

### Technical Goals
- ✅ Type check passes: `npm run check-types`
- ✅ Lint passes: `npx ultracite fix && npm run check`
- ✅ No console errors
- ✅ Real-time updates work (Convex subscriptions)
- ✅ All views load in < 2 seconds

### Completion Checklist

**Week 1:**
- [ ] US-P9-001 to US-P9-009: Collaboration foundations complete
- [ ] All Week 1 test cases pass

**Week 2:**
- [ ] US-P9-010 to US-P9-015: Activity feed & @mentions complete
- [ ] All Week 2 test cases pass

**Week 3:**
- [ ] US-P9-016 to US-P9-020: Multi-view & templates complete
- [ ] All Week 3 test cases pass

**Week 4:**
- [ ] US-P9-021 to US-P9-030: Personalization & polish complete
- [ ] All Week 4 test cases pass
- [ ] All regression tests pass

---

## Known Limitations

1. **Drag-and-Drop**: Board view doesn't support drag-and-drop in MVP (future enhancement)
2. **Live Presence**: No real-time "who's online" indicators (future enhancement)
3. **Notification System**: @mentions create database entries but no push notifications (future)
4. **Digest Batching**: Frequency controls set preference but actual batching requires cron job (future)

---

## Future Enhancements (Post-P9)

- Live presence indicators (Figma-style cursors)
- Drag-and-drop in Board view
- Push notifications for @mentions
- Digest batching with cron jobs
- Voice note transcription editing
- WhatsApp coach groups integration (4-week project)
- Custom session templates per org
- Shared task management with dependencies

---

**Document Version:** 1.0
**Created:** January 27, 2026
**Last Updated:** January 27, 2026
**Author:** Claude Sonnet 4.5
**Ready for Ralph:** Yes ✅
