# Phase 9 Week 3 - Implementation Status

**Date:** 2026-01-31
**Branch:** `ralph/team-collaboration-hub-p9`
**Status:** ✅ **Ready for Ralph Implementation**

---

## ✅ Prerequisites Complete

### Schema Changes (Commit fc64a6af)
✅ **teamDecisions** table added
- Organization/team scoped voting on lineup, tactics, policies
- Options array with id/label/description
- Voting types: simple, weighted
- Status tracking: open, closed, finalized
- Proper indexes for team and org queries

✅ **decisionVotes** table added
- Individual votes linked to decisions
- Vote weight and optional comment
- Composite indexes for decision+user lookups

✅ **teamInsightsViewPreference** field added to coachOrgPreferences
- Supports: "list" (default), "board", "calendar", "players"
- Per-coach, per-org preference storage

✅ **parentCommentId** field already in insightComments
- Comment threading support (max 3 levels)
- Index on by_parent for efficient queries

### Libraries Installed
✅ **react-hotkeys-hook** - Keyboard shortcuts (Cmd+K, etc.)
✅ **framer-motion** - Mobile gesture animations
✅ **command component** - Already installed (shadcn/ui)

### Quality Checks
✅ **Convex codegen** - TypeScript types generated
✅ **Type check passes** - No TypeScript errors
✅ **Lint check passes** - Pre-commit hooks passed

---

## 📋 Week 3 Scope

**16 Stories, ~41 hours**

### Multi-View Layouts (11h) - Priority 1
1. **US-P9-033** - View Preferences Schema (backend) - 1h
2. **US-P9-019** - InsightsView Container - 3h
3. **US-P9-020** - Board View - 4h
4. **US-P9-021** - Calendar View - 5h
5. **US-P9-022** - Player View - 3h

### Team Decisions Voting (8h) - Priority 2
6. **US-P9-026** - Team Decisions Backend - 5h
7. **US-P9-027** - Voting UI Card - 4h

### Productivity Features (6h) - Priority 3
8. **US-P9-028** - Command Palette (Cmd+K) - 4h
9. **US-P9-029** - Keyboard Shortcuts - 2h

### Comment Threading (4h) - Priority 4
10. **US-P9-030** - Threading Backend + UI - 4h

### UX Polish (3h) - Priority 5
11. **US-P9-031** - Loading Skeletons - 2h
12. **US-P9-032** - Empty States - 2h

### Mobile Gestures (5h) - Priority 6
13. **US-P9-045** - Swipeable Cards - 3h
14. **US-P9-046** - Long-Press Actions - 2h
15. **US-P9-047** - Touch Optimization - 0.5h
16. **US-P9-048** - Gesture Settings - 0.5h

### Real-Time Collaboration (2h) - Priority 7
17. **US-P9-025b** - Session Editor Collab - 2h

---

## 🚨 Critical Patterns for Ralph

### 1. Better Auth Adapter Pattern
```typescript
const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "user",
  where: [{ field: "_id", value: userId, operator: "eq" }]
});
```

### 2. ALWAYS Use withIndex()
```typescript
// ❌ NEVER
await ctx.db.query("insights").filter(q => q.eq(q.field("status"), "active"))

// ✅ ALWAYS
await ctx.db.query("insights").withIndex("by_status", q => q.eq("status", "active"))
```

### 3. ALWAYS Include Validators
```typescript
export const myQuery = query({
  args: { userId: v.string() },
  returns: v.union(v.object({ ... }), v.null()),
  handler: async (ctx, args) => { ... }
});
```

### 4. Batch Fetch to Avoid N+1 Queries
```typescript
const userIds = [...new Set(items.map(i => i.userId))];
const users = await Promise.all(userIds.map(id => ctx.db.get(id)));
const userMap = new Map(users.map(u => [u._id, u]));
const enriched = items.map(i => ({ ...i, user: userMap.get(i.userId) }));
```

### 5. Skeleton Loaders Use "items" Not "rows"
```typescript
<ListSkeleton items={5} />  // ✅ Correct
<ListSkeleton rows={5} />   // ❌ Wrong
```

### 6. Visual Verification Required
```bash
~/.claude/skills/dev-browser/server.sh &
# Verify all UI changes visually before marking story complete
```

---

## 📝 Implementation Order (Recommended)

**Day 1:** Schema + Backend
- US-P9-033 (view preferences backend)
- US-P9-026 (team decisions backend)
- US-P9-030 (threading backend)

**Day 2-3:** Multi-View Core
- US-P9-019 (container with tabs)
- US-P9-020 (board view)
- US-P9-022 (player view)

**Day 4:** Calendar
- US-P9-021 (calendar view)

**Day 5:** Voting UI
- US-P9-027 (voting card component)

**Day 6:** Command Palette
- US-P9-028 (command palette)
- US-P9-029 (keyboard shortcuts)

**Day 7:** Mobile Gestures
- US-P9-045 (swipeable cards)
- US-P9-046-048 (long-press + touch)

**Day 8:** Polish
- US-P9-031 (loading skeletons)
- US-P9-032 (empty states)
- US-P9-030 (threading UI)

**Day 9:** Final Story
- US-P9-025b (session editor real-time collab)

---

## 🔍 Quality Checklist (Per Story)

Before marking each story complete:

- [ ] File created at exact path specified
- [ ] Args and returns validators included
- [ ] withIndex() used for all queries
- [ ] Better Auth adapter used for user enrichment
- [ ] Batch fetching used (no N+1 queries)
- [ ] Loading skeleton implemented
- [ ] Empty state implemented
- [ ] Type check passes (`npm run check-types`)
- [ ] Visual verification with dev-browser (UI stories)
- [ ] Codegen run (`npx -w packages/backend convex codegen`)

---

## 📊 Ralph Monitoring

Ralph's monitoring agents are running:

- **Quality Monitor** (60s) - Type/lint checks
- **PRD Auditor** (90s) - Story verification
- **Test Runner** (30s) - UAT + unit tests
- **Security Tester** - XSS/auth/injection checks

**Feedback file:** `scripts/ralph/agents/output/feedback.md` (2140 lines)

Current status from agents:
- Type check: ✅ Passing
- Lint: ⚠️ Pre-existing biome errors (not blocking)
- Security: ⚠️ Medium issues (XSS, missing auth checks - existing codebase)

---

## 🎯 Success Criteria

Week 3 is complete when:

- ✅ All 17 stories marked `passes: true` in prd.json
- ✅ Type check passes
- ✅ All schema changes applied and tested
- ✅ All UI components visually verified
- ✅ No regressions in Week 1 & 2 features
- ✅ All tests passing

---

## 📂 Key Files

**PRD:**
- `scripts/ralph/prd.json` - Week 3 configuration
- `scripts/ralph/prds/Coaches Voice Insights/P9_WEEK3_MULTIVIEW_GESTURES_V2.md` - Detailed specs
- `scripts/ralph/WEEK3_SETUP.md` - Setup instructions

**Schema:**
- `packages/backend/convex/schema.ts` - All tables defined

**Documentation:**
- `scripts/ralph/prds/Coaches Voice Insights/P9_COMPREHENSIVE_REVIEW.md` - Full codebase review
- `scripts/ralph/prds/Coaches Voice Insights/P9_WEEK3_ASSESSMENT.md` - Gap analysis

---

**Ralph is ready to implement Week 3!** 🚀

All prerequisites complete. Schema changes committed. Libraries installed. Quality checks passing.

**Next step:** Ralph should begin with US-P9-033 (View Preferences Backend) as the foundation for multi-view layouts.
