# Phase 9 Week 1: Collaboration Foundations + AI Copilot Backend

**Branch:** `ralph/team-collaboration-hub-p9`
**Stories:** 8 stories (US-P9-001 to US-P9-008)
**Effort:** ~15 hours
**Status:** Ready for Implementation

---

## Week 1 Deliverables

**For Coaches:**
- See who's on the platform and what they're viewing (presence indicators)
- Comment on insights to discuss observations
- React to insights (👍 like, 🌟 helpful, 🚩 flag)
- Backend ready for AI smart suggestions

**Technical Foundation:**
- All database tables created (comments, reactions, activity, presence)
- Real-time presence system working
- Backend model files structured
- AI Copilot backend logic complete (2 new stories)

---

## User Stories

### US-P9-001: Create teamCollaboration Backend Model
**Priority:** 1 | **Effort:** 2h

Create foundation file with Better Auth adapter pattern.

**Acceptance Criteria:**
- [ ] Create `packages/backend/convex/models/teamCollaboration.ts`
- [ ] File exports placeholder queries/mutations
- [ ] **CRITICAL:** All functions use Better Auth adapter pattern:
  ```typescript
  const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    table: "user",
    where: { field: "id", value: userId }
  });
  ```
- [ ] Proper validators (args + returns)
- [ ] Type check passes
- [ ] Run `npx -w packages/backend convex codegen`

**Files to Create:**
- `packages/backend/convex/models/teamCollaboration.ts`

---

### US-P9-002: Create Database Tables
**Priority:** 2 | **Effort:** 3h

Add insightComments, insightReactions, teamActivityFeed, teamHubPresence tables with indexes.

**Schema Additions:**

```typescript
// insightComments
defineTable({
  insightId: v.id("voiceNoteInsights"),
  authorId: v.string(), // Better Auth user ID
  content: v.string(),
  priority: v.union(
    v.literal("critical"),
    v.literal("important"),
    v.literal("normal")
  ),
  parentCommentId: v.optional(v.id("insightComments")), // For threading
  mentions: v.array(v.string()), // @mentioned user IDs
  organizationId: v.string(),
  teamId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_insight", ["insightId"])
  .index("by_author_and_org", ["authorId", "organizationId"])
  .index("by_team", ["teamId"]),

// insightReactions
defineTable({
  insightId: v.id("voiceNoteInsights"),
  userId: v.string(), // Better Auth user ID
  reactionType: v.union(
    v.literal("like"),
    v.literal("helpful"),
    v.literal("flag")
  ),
  organizationId: v.string(),
  createdAt: v.number(),
})
  .index("by_insight", ["insightId"])
  .index("by_insight_and_user", ["insightId", "userId"]) // Prevent duplicates
  .index("by_user_and_org", ["userId", "organizationId"]),

// teamActivityFeed
defineTable({
  teamId: v.string(),
  organizationId: v.string(),
  activityType: v.union(
    v.literal("insight_created"),
    v.literal("insight_applied"),
    v.literal("comment_added"),
    v.literal("reaction_added"),
    v.literal("session_created"),
    v.literal("vote_cast"),
    v.literal("decision_finalized")
  ),
  actorId: v.string(), // Better Auth user ID
  summary: v.string(), // "[Name] commented on [Player]'s insight"
  priority: v.union(
    v.literal("critical"),
    v.literal("important"),
    v.literal("normal")
  ),
  metadata: v.any(), // { insightId, commentId, etc. }
  createdAt: v.number(),
})
  .index("by_team", ["teamId"])
  .index("by_team_priority", ["teamId", "priority"])
  .index("by_org", ["organizationId"]),

// teamHubPresence
defineTable({
  userId: v.string(), // Better Auth user ID
  organizationId: v.string(),
  teamId: v.string(),
  currentView: v.string(), // "insights", "player-passport", "session-plan"
  status: v.union(
    v.literal("active"),
    v.literal("idle"),
    v.literal("away")
  ),
  lastActiveAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_team", ["teamId"])
  .index("by_user_and_team", ["userId", "teamId"])
  .index("by_org", ["organizationId"]),
```

**Acceptance Criteria:**
- [ ] All 4 tables added to schema.ts
- [ ] All indexes created
- [ ] Run `npx convex dev` to push schema
- [ ] Type check passes

---

### US-P9-003: Implement Presence Backend
**Priority:** 3 | **Effort:** 2h

Real-time presence tracking (updatePresence, getTeamPresence).

**Backend Functions:**

```typescript
export const updatePresence = mutation({
  args: {
    userId: v.string(),
    organizationId: v.string(),
    teamId: v.string(),
    currentView: v.string(),
  },
  returns: v.id("teamHubPresence"),
  handler: async (ctx, args) => {
    // Check if presence exists
    const existing = await ctx.db
      .query("teamHubPresence")
      .withIndex("by_user_and_team", (q) =>
        q.eq("userId", args.userId).eq("teamId", args.teamId)
      )
      .unique();

    const now = Date.now();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        currentView: args.currentView,
        lastActiveAt: now,
        status: "active",
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new
      return await ctx.db.insert("teamHubPresence", {
        ...args,
        status: "active",
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const getTeamPresence = query({
  args: {
    teamId: v.string(),
    organizationId: v.string(),
  },
  returns: v.array(v.object({
    userId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    currentView: v.string(),
    status: v.string(),
    lastActiveAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const presenceRecords = await ctx.db
      .query("teamHubPresence")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const now = Date.now();
    const enriched = [];

    for (const record of presenceRecords) {
      // Auto-calculate status based on lastActiveAt
      const minutesAgo = (now - record.lastActiveAt) / (1000 * 60);
      let status = "active";
      if (minutesAgo > 15) {
        status = "away";
      } else if (minutesAgo > 5) {
        status = "idle";
      }

      // Get user details using Better Auth adapter
      const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        table: "user",
        where: { field: "id", value: record.userId }
      });

      if (user) {
        enriched.push({
          userId: record.userId,
          firstName: user.firstName || "Unknown",
          lastName: user.lastName || "",
          currentView: record.currentView,
          status,
          lastActiveAt: record.lastActiveAt,
        });
      }
    }

    return enriched;
  },
});
```

**Acceptance Criteria:**
- [ ] `updatePresence` mutation implemented
- [ ] `getTeamPresence` query implemented
- [ ] Uses Better Auth adapter for user lookup
- [ ] Auto-calculates status (active < 5min, idle 5-15min, away > 15min)
- [ ] Test in Convex dashboard
- [ ] Type check passes

---

### US-P9-004: Create Presence Indicators Component
**Priority:** 4 | **Effort:** 2h

UI showing online coaches with avatars and tooltips.

**Component:**

```tsx
// apps/web/src/app/orgs/[orgId]/coach/team-hub/components/presence-indicators.tsx

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface PresenceIndicatorsProps {
  teamId: string;
  organizationId: string;
  currentUserId: string;
}

export function PresenceIndicators({
  teamId,
  organizationId,
  currentUserId,
}: PresenceIndicatorsProps) {
  const presence = useQuery(api.models.teamCollaboration.getTeamPresence, {
    teamId,
    organizationId,
  });

  if (presence === undefined) {
    return (
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-full" />
        ))}
      </div>
    );
  }

  // Filter out current user and only show active/idle
  const onlineCoaches = presence.filter(
    (p) => p.userId !== currentUserId && p.status !== "away"
  );

  if (onlineCoaches.length === 0) {
    return null;
  }

  const displayCoaches = onlineCoaches.slice(0, 5);
  const remainingCount = onlineCoaches.length - 5;

  return (
    <div className="flex items-center gap-2">
      {displayCoaches.map((coach) => (
        <Tooltip key={coach.userId}>
          <TooltipTrigger>
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {coach.firstName.charAt(0)}
                  {coach.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {/* Status ring */}
              <div
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                  coach.status === "active" ? "bg-green-500" : "bg-gray-400"
                }`}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p className="font-semibold">
                {coach.firstName} {coach.lastName}
              </p>
              <p className="text-muted-foreground">
                {formatCurrentView(coach.currentView)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatLastActive(coach.lastActiveAt)}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      ))}

      {remainingCount > 0 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

function formatCurrentView(view: string): string {
  const viewMap: Record<string, string> = {
    insights: "Viewing Insights",
    "player-passport": "Viewing Player Passport",
    "session-plan": "Editing Session Plan",
  };
  return viewMap[view] || "Active";
}

function formatLastActive(timestamp: number): string {
  const minutesAgo = Math.floor((Date.now() - timestamp) / (1000 * 60));
  if (minutesAgo < 1) return "Just now";
  if (minutesAgo === 1) return "1 min ago";
  if (minutesAgo < 60) return `${minutesAgo} mins ago`;
  return "Active";
}
```

**Acceptance Criteria:**
- [ ] Component shows avatars (max 5, then +N)
- [ ] Tooltip with name, view, last active
- [ ] Real-time updates via useQuery
- [ ] Green ring for active, gray for idle
- [ ] Exclude current user
- [ ] Skeleton while loading
- [ ] Type check passes
- [ ] **Visual verification using dev-browser:** presence updates in real-time

---

### US-P9-005: Implement Comment Backend
**Priority:** 5 | **Effort:** 2h

Backend for comments with threading and priority detection.

**Backend Functions:**

```typescript
export const getInsightComments = query({
  args: {
    insightId: v.id("voiceNoteInsights"),
  },
  returns: v.array(v.object({
    _id: v.id("insightComments"),
    content: v.string(),
    authorId: v.string(),
    authorName: v.string(),
    priority: v.string(),
    parentCommentId: v.optional(v.id("insightComments")),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("insightComments")
      .withIndex("by_insight", (q) => q.eq("insightId", args.insightId))
      .collect();

    const enriched = [];
    for (const comment of comments) {
      const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        table: "user",
        where: { field: "id", value: comment.authorId }
      });

      enriched.push({
        _id: comment._id,
        content: comment.content,
        authorId: comment.authorId,
        authorName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
        priority: comment.priority,
        parentCommentId: comment.parentCommentId,
        createdAt: comment.createdAt,
      });
    }

    // Sort chronologically
    return enriched.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const addComment = mutation({
  args: {
    insightId: v.id("voiceNoteInsights"),
    content: v.string(),
    parentCommentId: v.optional(v.id("insightComments")),
    mentions: v.array(v.string()),
    authorId: v.string(),
    organizationId: v.string(),
    teamId: v.optional(v.string()),
  },
  returns: v.id("insightComments"),
  handler: async (ctx, args) => {
    // Auto-determine priority from content
    const priority = detectPriority(args.content);

    const commentId = await ctx.db.insert("insightComments", {
      insightId: args.insightId,
      authorId: args.authorId,
      content: args.content,
      priority,
      parentCommentId: args.parentCommentId,
      mentions: args.mentions,
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create activity feed entry (will be done in US-P9-018)

    return commentId;
  },
});

function detectPriority(content: string): "critical" | "important" | "normal" {
  const lower = content.toLowerCase();
  if (lower.includes("injury") || lower.includes("urgent") || lower.includes("emergency")) {
    return "critical";
  }
  if (lower.includes("important") || lower.includes("concern") || lower.includes("issue")) {
    return "important";
  }
  return "normal";
}
```

**Acceptance Criteria:**
- [ ] `getInsightComments` query implemented
- [ ] `addComment` mutation implemented
- [ ] Supports `parentCommentId` for threading
- [ ] Auto-determines priority from keywords
- [ ] Uses Better Auth adapter for user lookups
- [ ] Test in Convex dashboard
- [ ] Type check passes

---

### US-P9-006: Implement Reactions Backend
**Priority:** 6 | **Effort:** 1h

Backend for like/helpful/flag reactions.

**Backend Functions:**

```typescript
export const toggleReaction = mutation({
  args: {
    insightId: v.id("voiceNoteInsights"),
    reactionType: v.union(
      v.literal("like"),
      v.literal("helpful"),
      v.literal("flag")
    ),
    userId: v.string(),
    organizationId: v.string(),
  },
  returns: v.union(v.literal("added"), v.literal("removed")),
  handler: async (ctx, args) => {
    // Check if reaction already exists
    const existing = await ctx.db
      .query("insightReactions")
      .withIndex("by_insight_and_user", (q) =>
        q.eq("insightId", args.insightId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("reactionType"), args.reactionType))
      .unique();

    if (existing) {
      // Remove reaction
      await ctx.db.delete(existing._id);
      return "removed";
    } else {
      // Add reaction
      await ctx.db.insert("insightReactions", {
        insightId: args.insightId,
        userId: args.userId,
        reactionType: args.reactionType,
        organizationId: args.organizationId,
        createdAt: Date.now(),
      });
      return "added";
    }
  },
});

export const getReactions = query({
  args: {
    insightId: v.id("voiceNoteInsights"),
  },
  returns: v.object({
    like: v.number(),
    helpful: v.number(),
    flag: v.number(),
    byUser: v.record(v.string(), v.array(v.string())), // { like: [userId1, userId2] }
  }),
  handler: async (ctx, args) => {
    const reactions = await ctx.db
      .query("insightReactions")
      .withIndex("by_insight", (q) => q.eq("insightId", args.insightId))
      .collect();

    const counts = { like: 0, helpful: 0, flag: 0 };
    const byUser: Record<string, string[]> = { like: [], helpful: [], flag: [] };

    for (const reaction of reactions) {
      counts[reaction.reactionType]++;
      byUser[reaction.reactionType].push(reaction.userId);
    }

    return { ...counts, byUser };
  },
});
```

**Acceptance Criteria:**
- [ ] `toggleReaction` mutation implemented (add/remove)
- [ ] `getReactions` query implemented
- [ ] Prevents duplicate reactions (index check)
- [ ] Returns "added" or "removed" status
- [ ] Test in Convex dashboard
- [ ] Type check passes

---

### US-P9-007: Create InsightComments UI
**Priority:** 7 | **Effort:** 2h

Display comments with real-time updates.

**Acceptance Criteria:**
- [ ] Create `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insight-comments.tsx`
- [ ] Displays comments chronologically
- [ ] Shows avatar, name, content, timestamp
- [ ] Uses ListSkeleton while loading
- [ ] Empty state: "No comments yet - be the first to share your thoughts!"
- [ ] Real-time updates via useQuery
- [ ] Type check passes
- [ ] Visual verification using dev-browser

---

### US-P9-008: Create CommentForm Component
**Priority:** 8 | **Effort:** 1h

Form for posting comments.

**Acceptance Criteria:**
- [ ] Create `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/comment-form.tsx`
- [ ] Textarea with auto-expand
- [ ] Post button (enabled when text entered)
- [ ] Calls `addComment` mutation
- [ ] Form clears after submit
- [ ] Loading state on button
- [ ] Error handling with toast
- [ ] Type check passes
- [ ] Visual verification: form works, comment appears in list

---

## Quality Requirements (Week 1)

**Before committing ANY story:**
1. **Type Check**: `npm run check-types` must pass
2. **Lint**: `npx ultracite fix` then `npm run check` must pass
3. **Browser Testing** (UI changes only):
   - Use dev-browser skill
   - Test on http://localhost:3000
   - Login: `neil.B@blablablak.com` / `lien1979`
4. **Backend Testing**:
   - Test all queries/mutations in Convex dashboard
   - Verify Better Auth adapter calls work

---

## Critical Patterns for Week 1

### Better Auth Adapter Pattern (MANDATORY)

**NEVER query Better Auth tables directly:**
```typescript
// ❌ BAD - Direct db query
const user = await ctx.db.get(userId);

// ✅ GOOD - Better Auth adapter
const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  table: "user",
  where: { field: "id", value: userId }
});
```

### Index Usage (MANDATORY)

**NEVER use `.filter()` - ALWAYS use `.withIndex()`:**
```typescript
// ❌ BAD
const comments = await ctx.db
  .query("insightComments")
  .filter((q) => q.eq(q.field("insightId"), insightId))
  .collect();

// ✅ GOOD
const comments = await ctx.db
  .query("insightComments")
  .withIndex("by_insight", (q) => q.eq("insightId", insightId))
  .collect();
```

### Skeleton Loading (MANDATORY)

**ALWAYS show skeletons while loading:**
```typescript
if (data === undefined) {
  return <ListSkeleton rows={3} />;
}
```

### Real-Time Updates (MANDATORY)

**ALWAYS use useQuery for real-time:**
```typescript
// ✅ GOOD - Real-time subscriptions
const comments = useQuery(api.models.teamCollaboration.getInsightComments, {
  insightId,
});
```

---

## Success Criteria

Week 1 is complete when:
- ✅ All 8 stories have `passes: true` in prd.json
- ✅ All quality checks pass
- ✅ Browser verification complete
- ✅ Coaches can comment, react, see presence
- ✅ AI Copilot backend ready for Week 2 integration

---

**Document Version:** 1.0
**Created:** January 30, 2026
**Ready for Ralph:** ✅ Yes
