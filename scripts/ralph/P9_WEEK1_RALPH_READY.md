# Phase 9 Week 1: Ralph Execution Ready ✅

**Created:** January 30, 2026
**Status:** Ready to start tonight
**Branch:** `ralph/team-collaboration-hub-p9`

---

## ✅ Setup Complete - All Files Ready

### 1. Reference PRD Files (4 weeks)

| File | Stories | Status |
|------|---------|--------|
| `prds/Coaches Voice Insights/P9_WEEK1_FOUNDATIONS.md` | 8 stories, detailed | ✅ Created |
| `prds/Coaches Voice Insights/P9_WEEK2_ACTIVITY_FEED.md` | 10 stories, summary | ✅ Created |
| `prds/Coaches Voice Insights/P9_WEEK3_MULTIVIEW_GESTURES.md` | 15 stories, summary | ✅ Created |
| `prds/Coaches Voice Insights/P9_WEEK4_POLISH.md` | 7 stories, summary | ✅ Created |

### 2. Master Planning Documents

| File | Purpose | Status |
|------|---------|--------|
| `P9_PHASE_BREAKDOWN.md` | Comprehensive phase breakdown with deliverables | ✅ Created |
| `P9_ENHANCED_RECOMMENDATIONS.md` | Research findings from collaboration platforms | ✅ Created |
| `P9_BLEEDING_EDGE_FEATURES.md` | Cutting-edge 2025-2026 patterns | ✅ Created |
| `P9_TEAM_COLLABORATION_HUB_V3.md` | Full PRD (all 48 stories) | ✅ Created |

### 3. Ralph Execution Files

| File | Content | Status |
|------|---------|--------|
| `prd.json` | **Week 1 only** (8 stories: US-P9-001 to US-P9-008) | ✅ Ready |
| `progress.txt` | Codebase Patterns section at top with P8 learnings | ✅ Updated |
| `prompt.md` | Instructions for Ralph (already configured) | ✅ Ready |

### 4. AGENTS.md Files (Context for Future Work)

| Location | Content | Status |
|----------|---------|--------|
| `packages/backend/convex/models/AGENTS.md` | Better Auth adapter pattern, index usage, N+1 prevention | ✅ Created |
| `apps/web/src/app/orgs/[orgId]/coach/AGENTS.md` | React patterns, skeleton loading, theming, testing | ✅ Created |

### 5. Git Setup

| Item | Status |
|------|--------|
| Branch created: `ralph/team-collaboration-hub-p9` | ✅ |
| Based on latest `main` | ✅ |
| All P9 setup files staged (not committed yet) | ✅ |

---

## Week 1 Scope (Tonight's Execution)

### 8 User Stories

1. **US-P9-001**: Create teamCollaboration Backend Model (2h)
2. **US-P9-002**: Create Database Tables (3h)
3. **US-P9-003**: Implement Presence Backend (2h)
4. **US-P9-004**: Create Presence Indicators Component (2h)
5. **US-P9-005**: Implement Comment Backend (2h)
6. **US-P9-006**: Implement Reactions Backend (1h)
7. **US-P9-007**: Create InsightComments UI Component (2h)
8. **US-P9-008**: Create CommentForm Component (1h)

**Total Effort:** ~15 hours

### Week 1 Deliverables

**For Coaches:**
- See who's online and what they're viewing (presence indicators)
- Comment on insights to discuss observations
- React to insights (👍 like, 🌟 helpful, 🚩 flag)

**Technical Foundation:**
- 4 new database tables (comments, reactions, activity, presence)
- Real-time presence system
- Backend model files structured with Better Auth patterns
- AI Copilot backend ready for Week 2

---

## Critical Patterns (MANDATORY)

### 1. Better Auth Adapter Pattern

**NEVER query Better Auth tables directly:**
```typescript
// ❌ BAD
const user = await ctx.db.get(userId);

// ✅ GOOD
const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  table: "user",
  where: { field: "id", value: userId }
});
```

### 2. Index Usage

**NEVER use `.filter()` - ALWAYS use `.withIndex()`:**
```typescript
// ❌ BAD
.filter((q) => q.eq(q.field("insightId"), insightId))

// ✅ GOOD
.withIndex("by_insight", (q) => q.eq("insightId", insightId))
```

### 3. Skeleton Loading

**ALWAYS show skeletons while loading:**
```typescript
if (data === undefined) {
  return <ListSkeleton rows={3} />;
}
```

### 4. Visual Verification

**REQUIRED for all UI changes:**
- Use dev-browser skill
- Test on http://localhost:3000
- Login: `neil.B@blablablak.com` / `lien1979`
- Verify on desktop + mobile viewports

---

## Quality Requirements

**Before committing ANY story:**

1. ✅ **Type Check**: `npm run check-types` must pass
2. ✅ **Format**: `npx ultracite fix` (auto-fixes)
3. ✅ **Lint**: `npm run check` must pass
4. ✅ **Browser Test** (UI changes): dev-browser verification
5. ✅ **Backend Test**: Test queries/mutations in Convex dashboard

---

## Running Ralph

### Start Ralph for Week 1

```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/ralph.sh 10
```

Ralph will:
1. Read `prd.json` (8 Week 1 stories)
2. Read `progress.txt` (Codebase Patterns at top)
3. Pick highest priority incomplete story (US-P9-001)
4. Implement that story
5. Run quality checks
6. Commit if checks pass
7. Update `prd.json` to mark story complete
8. Repeat until all 8 stories have `passes: true`

### Monitor Progress

```bash
# See which stories are done
cat scripts/ralph/prd.json | jq '.userStories[] | {id, title, passes}'

# See learnings
cat scripts/ralph/progress.txt

# Check git history
git log --oneline -10

# View session history
cat scripts/ralph/session-history.txt
```

---

## After Week 1 Complete

### Next Steps

1. **Review Week 1 implementation**
2. **Update prd.json with Week 2 stories** (10 stories: US-P9-009 to US-P9-018, US-P9-041 to US-P9-044)
3. **Run Ralph for Week 2**
4. **Repeat for Weeks 3 and 4**

### Week 2 Preview

- Activity feed with real-time updates
- @mention coaches in comments
- Priority-based notifications
- **AI Copilot UI (smart suggestions appear on insights)**

---

## File Tree

```
scripts/ralph/
├── prd.json                                          # Week 1 stories ONLY
├── progress.txt                                      # Codebase Patterns at top
├── prompt.md                                         # Ralph instructions
├── P9_PHASE_BREAKDOWN.md                            # Master plan (all 4 weeks)
├── P9_WEEK1_RALPH_READY.md                          # This file
├── P9_ENHANCED_RECOMMENDATIONS.md                   # Research
├── P9_BLEEDING_EDGE_FEATURES.md                     # 2025-2026 patterns
└── prds/Coaches Voice Insights/
    ├── P9_TEAM_COLLABORATION_HUB_V3.md              # Full PRD (48 stories)
    ├── P9_WEEK1_FOUNDATIONS.md                      # Week 1 detailed reference
    ├── P9_WEEK2_ACTIVITY_FEED.md                    # Week 2 reference
    ├── P9_WEEK3_MULTIVIEW_GESTURES.md               # Week 3 reference
    └── P9_WEEK4_POLISH.md                           # Week 4 reference
```

---

## Success Criteria

Week 1 is **COMPLETE** when:
- ✅ All 8 stories have `passes: true` in prd.json
- ✅ All quality checks pass (type, lint, browser verification)
- ✅ Coaches can comment on insights (with real-time updates)
- ✅ Coaches can react to insights (👍 like, 🌟 helpful, 🚩 flag)
- ✅ Coaches can see who's online with presence indicators
- ✅ All backend uses Better Auth adapter pattern
- ✅ All queries use indexes (no .filter())
- ✅ All UI components use skeleton loaders

---

## Contact

**Questions?**
- Check `P9_WEEK1_FOUNDATIONS.md` for detailed implementation guidance
- Check `AGENTS.md` files for directory-specific patterns
- Check `progress.txt` for Codebase Patterns section
- Check `CLAUDE.md` in project root for overall architecture

---

**✅ READY TO START RALPH TONIGHT**

**Command:**
```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/ralph.sh 10
```

**Expected Duration:** ~15 hours across 8 stories
**Completion Target:** Week 1 complete, ready for Week 2

---

**Document Version:** 1.0
**Created:** January 30, 2026
**Status:** ✅ Ready for Execution
