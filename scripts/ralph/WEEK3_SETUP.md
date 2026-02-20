# Phase 9 Week 3 - Setup for Ralph

**Date:** 2026-01-31
**Status:** Ready for Implementation
**Branch:** `ralph/team-collaboration-hub-p9`

---

## ✅ Prerequisites Complete

### Weeks 1 & 2 Completed (22/22 stories ✅)

**Week 1: Collaboration Foundations (8 stories)**
- Real-time presence indicators
- Comments with priority
- Reactions system (like/helpful/flag)
- Team activity feed foundation
- All backend tables created
- All components implemented

**Week 2: Activity Feed & AI Copilot (14 stories)**
- Activity feed with filtering
- @Mention autocomplete (smart + contextual)
- Priority notifications with preferences UI
- AI Copilot smart suggestions (insight + session contexts)
- SmartActionBar with reasoning field and action handlers
- NotificationCenter with bell icon
- Notification preferences matrix UI

**Commits on Branch:**
- `af22bab2` - Week 2 complete
- `edd4125e` - US-P9-044 SmartActionBar
- `208e19df` - US-P9-043 Session Planning Suggestions
- `b9a276e6` - Complete AI Copilot with reasoning
- `89554b51` - Action handlers implementation

---

## 📋 Week 3 Scope

**16 Stories, ~41 hours**

### Multi-View Layouts (11h)
1. US-P9-019: InsightsView Container (3h)
2. US-P9-020: Board View (4h)
3. US-P9-021: Calendar View (5h)
4. US-P9-022: Player View (3h)
5. US-P9-033: View Preferences Schema (1h)

### Team Decisions Voting (8h)
6. US-P9-026: Backend (5h)
7. US-P9-027: Voting UI (4h)

### Productivity Features (6h)
8. US-P9-028: Command Palette (4h)
9. US-P9-029: Keyboard Shortcuts (2h)

### Comment Threading (4h)
10. US-P9-030: Threading Backend + UI (4h)

### UX Polish (3h)
11. US-P9-031: Loading Skeletons (2h)
12. US-P9-032: Empty States (2h)

### Mobile Gestures (5h)
13. US-P9-045: Swipeable Cards (3h)
14. US-P9-046: Long-Press Actions (2h)
15. US-P9-047: Touch Optimization (0.5h)
16. US-P9-048: Gesture Settings (0.5h)

### Session Editor Enhancement (2h)
17. US-P9-025b: Real-Time Collaboration (2h)

---

## 🗂️ Schema Changes Required

Ralph must apply these schema changes BEFORE implementing functions:

### 1. Comment Threading
```typescript
// Modify insightComments table
insightComments: defineTable({
  // ... existing fields ...
  parentCommentId: v.optional(v.id("insightComments")), // NEW
})
  .index("by_insight", ["insightId"])
  .index("by_parent", ["parentCommentId"]), // NEW
```

### 2. Team Decisions Voting
```typescript
// Add teamDecisions table
teamDecisions: defineTable({
  organizationId: v.string(),
  teamId: v.string(),
  createdBy: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  options: v.array(v.object({
    id: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
  })),
  votingType: v.union(v.literal("simple"), v.literal("weighted")),
  status: v.union(v.literal("open"), v.literal("closed"), v.literal("finalized")),
  deadline: v.optional(v.number()),
  finalizedAt: v.optional(v.number()),
  finalizedBy: v.optional(v.string()),
  winningOption: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_team", ["teamId"])
  .index("by_team_and_status", ["teamId", "status"])
  .index("by_org", ["organizationId"])
  .index("by_org_and_status", ["organizationId", "status"]),

// Add decisionVotes table
decisionVotes: defineTable({
  decisionId: v.id("teamDecisions"),
  userId: v.string(),
  optionId: v.string(),
  weight: v.number(),
  comment: v.optional(v.string()),
  votedAt: v.number(),
})
  .index("by_decision", ["decisionId"])
  .index("by_decision_and_user", ["decisionId", "userId"])
  .index("by_user", ["userId"]),
```

### 3. View Preferences
```typescript
// Modify coachOrgPreferences table
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
```

---

## 📦 Libraries to Install

Ralph must install these before implementation:

```bash
# Command Palette
npx shadcn@latest add command

# Keyboard Shortcuts
npm install react-hotkeys-hook

# Mobile Gestures
npm install framer-motion
```

---

## 🎯 Critical Patterns (MANDATORY)

```typescript
// 1. Better Auth Adapter Pattern
const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "user",
  where: [{ field: "_id", value: userId, operator: "eq" }]
});

// 2. ALWAYS use withIndex()
const insights = await ctx.db
  .query("voiceNoteInsights")
  .withIndex("by_org", (q) => q.eq("organizationId", orgId))
  .collect();

// 3. ALWAYS include validators
export const myQuery = query({
  args: { userId: v.string() },
  returns: v.union(v.object({ ... }), v.null()),
  handler: async (ctx, args) => { ... }
});

// 4. Batch fetch to avoid N+1 queries
const userIds = [...new Set(items.map(i => i.userId))];
const users = await Promise.all(userIds.map(id => ctx.db.get(id)));
const userMap = new Map(users.map(u => [u._id, u]));
const enriched = items.map(i => ({ ...i, user: userMap.get(i.userId) }));

// 5. Skeleton loaders
<ListSkeleton items={5} />  // NOT rows={5}

// 6. Visual verification
~/.claude/skills/dev-browser/server.sh &
```

---

## 📅 Implementation Order (9 Days)

**Day 1: Schema Changes (3h)**
- US-P9-033: Extend Preferences
- US-P9-030: Threading Backend

**Day 2: Backend (8h)**
- US-P9-026: Team Decisions Backend
- US-P9-030: Threading UI

**Day 3-4: Multi-View (11h)**
- US-P9-019: Container
- US-P9-020: Board View
- US-P9-022: Player View

**Day 5: Calendar (5h)**
- US-P9-021: Calendar View

**Day 6: Voting UI (4h)**
- US-P9-027: Voting Card

**Day 7: Command Palette (6h)**
- US-P9-028: Command Palette
- US-P9-029: Keyboard Shortcuts

**Day 8: Mobile (5h)**
- US-P9-045: Swipeable Cards
- US-P9-046-048: Long-Press + Touch

**Day 9: Polish (4h)**
- US-P9-031: Loading Skeletons
- US-P9-032: Empty States
- US-P9-025b: Session Collab

---

## 🚨 Important Notes

### DO NOT Rebuild Session Planning

Session planning is **FULLY IMPLEMENTED** at `/coach/session-plans`:
- AI-generated plans with Anthropic Claude
- Template library (3 built-in templates)
- Plan voting (like/dislike)
- Sharing features (private/club/platform)
- Drill library with effectiveness tracking
- Full CRUD operations

**Only add:** Real-time collaboration (US-P9-025b)

### Team Decisions vs Plan Voting

- **Team Decisions** (Week 3): Vote on lineup, tactics, team policies (NEW)
- **Plan Voting** (Existing): Like/dislike on session plans (ALREADY EXISTS)

These are separate features with separate schemas.

### Comment Threading

- Max 3 levels to prevent deep nesting
- Recursive component pattern
- Optional field (safe additive change)

---

## ✅ Ready to Run Ralph

**Files prepared:**
1. ✅ `scripts/ralph/prd.json` - Week 3 configuration
2. ✅ `scripts/ralph/prds/Coaches Voice Insights/P9_WEEK3_MULTIVIEW_GESTURES_V2.md` - Detailed PRD
3. ✅ `scripts/ralph/prds/Coaches Voice Insights/P9_WEEK3_ASSESSMENT.md` - Gap analysis
4. ✅ `scripts/ralph/prds/Coaches Voice Insights/P9_COMPREHENSIVE_REVIEW.md` - Full codebase review

**Ralph configuration:**
- Branch: `ralph/team-collaboration-hub-p9` (continue on same branch)
- Stories: 16 (all defined in prd.json)
- Effort: ~41 hours
- All stories marked `passes: false` (ready for implementation)

**Command to start Ralph:**
```bash
# Ensure on correct branch
git checkout ralph/team-collaboration-hub-p9

# Start Ralph for Week 3
# (Use Ralph agent script with prd.json)
```

**Success criteria:**
- All 16 stories marked `passes: true`
- Type check passes
- All schema changes applied
- All libraries installed
- Visual verification complete

---

## 📝 Quality Checklist

Before marking each story complete, Ralph must verify:

- [ ] File created at exact path specified
- [ ] Args and returns validators included
- [ ] withIndex() used for all queries
- [ ] Better Auth adapter used for user enrichment
- [ ] Batch fetching used (no N+1 queries)
- [ ] Loading skeleton implemented
- [ ] Empty state implemented
- [ ] Type check passes (`npm run check-types`)
- [ ] Visual verification with dev-browser (UI stories only)
- [ ] Codegen run (`npx -w packages/backend convex codegen`)

---

**Ralph is ready to implement Week 3!** 🚀
