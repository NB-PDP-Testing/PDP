# P8 Week 2 - My Impact Dashboard - Ready for Ralph 🚀

**Date**: January 28, 2026
**Status**: ✅ READY TO START
**Branch**: `ralph/coach-impact-visibility-p8-week1` (continue on same branch)
**Ralph Version**: Claude Sonnet 4.5

---

## ✅ Pre-Flight Checklist - ALL COMPLETE

### Documentation Ready
- [x] Week 2 PRD created: `scripts/ralph/prds/Coaches Voice Insights/p8-week2-my-impact-dashboard.prd.json`
- [x] Active PRD updated: `scripts/ralph/prd.json` ← **Ralph will read this**
- [x] Week 2 Preparation Guide: `scripts/ralph/P8_WEEK2_PREPARATION.md` (complete implementation guide)
- [x] Week 2 Ralph Context: `scripts/ralph/P8_WEEK2_RALPH_CONTEXT.md` (CRITICAL Better Auth patterns)
- [x] Week 1 & 1.5 Checkpoint: `scripts/ralph/P8_CHECKPOINT_JAN28.md` (complete status)
- [x] Main PRD updated: `scripts/ralph/prds/Coaches Voice Insights/P8_COACH_IMPACT_VISIBILITY.md` (Week 1.5 marked complete)

### Prerequisites from Week 1 ✅
- [x] Backend query exists: `getCoachImpactSummary` at `packages/backend/convex/models/voiceNotes.ts:2041`
- [x] Frontend skeleton exists: `my-impact-tab.tsx` at `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/`
- [x] Date range filtering working: week, month, all time (localStorage persistence)
- [x] Loading states implemented: 4 skeleton cards + content sections
- [x] Empty state implemented: "No voice notes yet" with CTA
- [x] Placeholder sections ready: Lines 197-265 marked with Week 2 comments

### Prerequisites from Week 1.5 ✅
- [x] Trust gate system: 8-priority access logic working
- [x] Better Auth patterns documented: **CRITICAL for Week 2** (see below)
- [x] Real-time updates: useQuery patterns established
- [x] Toast notifications: Sonner patterns established
- [x] Confirmation dialogs: AlertDialog patterns established

### Git State
- [x] Branch exists: `ralph/coach-impact-visibility-p8-week1`
- [x] Week 1 commits present: US-P8-001, 003, 004 (Week 1)
- [x] Week 1.5 commits present: US-P8-021, 002-FIX, 023, 027-030 (Week 1.5)
- [x] Working directory clean: All Week 1 & 1.5 work committed and pushed
- [x] Latest commit: 4d6b9f9c "docs: Mark P8 Week 1 & 1.5 status files as complete"

---

## 🎯 Week 2 Summary

### What We're Building
Complete "My Impact" dashboard with **7 user stories, 4 new components:**

| Story | Component | Lines | Priority |
|-------|-----------|-------|----------|
| US-P8-005 | `impact-summary-cards.tsx` | ~150 | 1 - Start here |
| US-P8-006 | `sent-summaries-section.tsx` | ~250 | 2 |
| US-P8-007 | `applied-insights-section.tsx` | ~400 | 3 - Most complex |
| US-P8-008 | Modify `my-impact-tab.tsx` (date range) | ~50 | 4 |
| US-P8-009 | `team-observations-section.tsx` | ~200 | 5 |
| US-P8-010 | Modify `applied-insights-section.tsx` (search) | ~80 | 6 |
| US-P8-011 | Modify `applied-insights-section.tsx` (filters) | ~100 | 7 |

**Total Estimated Time**: 18-23 hours (5-7 days)
**Total Lines of Code**: ~1,230 lines

### Why This Matters
- Coaches (especially Level 0-1) currently have **ZERO visibility** into outcomes of their work
- Week 2 delivers the **core dashboard** that answers:
  - "How many voice notes did I create this month?"
  - "Which insights actually got applied to player profiles?"
  - "Are parents viewing the summaries I send?"
  - "What's my overall coaching impact?"

---

## 🚨 CRITICAL: Better Auth Integration Patterns

**Week 1.5 revealed a CRITICAL pattern that Week 2 MUST follow:**

### Tables That Use Better Auth Component
If Week 2 needs to query these tables, **MUST use Better Auth component**:
```typescript
// ❌ WRONG - Direct query on Better Auth tables
const org = await ctx.db
  .query("organization")
  .withIndex("by_id", q => q.eq("_id", organizationId))
  .first();

// ✅ CORRECT - Use Better Auth component
const orgs = await ctx.runQuery(components.betterAuth.adapter.findMany, {
  input: {
    model: "organization",
    where: [{ field: "_id", value: organizationId, operator: "eq" }],
  },
});
const org = orgs[0];
```

**Better Auth Tables:**
- `organization` ← MUST use component
- `team` ← MUST use component
- `member` ← MUST use component
- `user` ← MUST use component
- `invitation` ← MUST use component

**Regular Convex Tables (Direct Queries OK):**
- `voiceNotes` ✅
- `voiceNoteInsights` ✅
- `coachParentSummaries` ✅
- `autoAppliedInsights` ✅
- `playerInjuries` ✅
- `teamObservations` ✅
- All other application tables ✅

**Week 2 Note**: Week 2 is **frontend only** and uses `getCoachImpactSummary` query (already exists). Backend already handles Better Auth correctly. **Ralph does NOT need to query Better Auth tables in Week 2.**

Full Better Auth patterns documented in: `scripts/ralph/P8_WEEK2_RALPH_CONTEXT.md`

---

## 📋 Week 2 User Stories (7 Stories)

### Story 1: US-P8-005 - Impact Summary Cards ⏳
**Priority**: 1 - **START HERE**
**Time**: 2-3 hours
**Create**: `impact-summary-cards.tsx`
**Modify**: `my-impact-tab.tsx` (replace placeholder lines 197-215)

**What**: 4 cards showing voiceNotesCreated, insightsApplied, summariesSent, parentViewRate
**Pattern**: Grid responsive (1 col mobile, 2 tablet, 4 desktop)
**Icons**: Mic (blue), CheckCircle (green), Send (purple), Eye (amber)

---

### Story 2: US-P8-006 - Sent Summaries Section ⏳
**Priority**: 2
**Time**: 3-4 hours
**Create**: `sent-summaries-section.tsx`
**Modify**: `my-impact-tab.tsx` (replace placeholder lines 217-231)

**What**: Table showing last 10 summaries with engagement status (Viewed/Acknowledged)
**Pattern**: Table on desktop, cards on mobile
**Badges**: Acknowledged (green), Viewed (gray), Sent (outline)

---

### Story 3: US-P8-007 - Applied Insights Section ⏳
**Priority**: 3 - **MOST COMPLEX**
**Time**: 4-5 hours
**Create**: `applied-insights-section.tsx`
**Modify**: `my-impact-tab.tsx` (replace placeholder lines 233-248)

**What**: Collapsible sections by category (Skills, Injuries)
**Pattern**: Collapsible with expand/collapse, links to player passports
**Icons**: TrendingUp (green), AlertCircle (red)

---

### Story 4: US-P8-008 - Date Range Filtering ⏳
**Priority**: 4
**Time**: 2-3 hours
**Create**: Nothing (enhancement to existing)
**Modify**: `my-impact-tab.tsx` (enhance existing date range selector)

**What**: Add "Last 3 Months" and "This Season" options to existing week/month/all
**Pattern**: Update DateRangeFilter type, add cases to getDateRangeForFilter

---

### Story 5: US-P8-009 - Team Observations Section ⏳
**Priority**: 5
**Time**: 2-3 hours
**Create**: `team-observations-section.tsx`
**Modify**: `my-impact-tab.tsx` (replace placeholder lines 250-265)

**What**: List of team-level observations with team names
**Pattern**: Card list, limit 10, "View All" if more
**Icon**: Users (blue)

---

### Story 6: US-P8-010 - Search Applied Insights ⏳
**Priority**: 6
**Time**: 2-3 hours
**Create**: Nothing
**Modify**: `applied-insights-section.tsx` (add search input + filter logic)

**What**: Search insights by player name or description, debounced 300ms
**Pattern**: Input with clear button (X), show result count

---

### Story 7: US-P8-011 - Category Filters ⏳
**Priority**: 7 - **FINAL STORY**
**Time**: 2-3 hours
**Create**: Nothing
**Modify**: `applied-insights-section.tsx` (add filter chips + logic)

**What**: Filter insights by category (All, Skills, Injuries)
**Pattern**: Toggle buttons with count badges, multi-select (OR logic)

---

## 🎨 Design Patterns to Follow

### Responsive Grid Pattern
```tsx
// Mobile: 1 column, Tablet: 2 columns, Desktop: 4 columns
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
```

### Date Formatting Pattern
```tsx
import { formatDistanceToNow, format } from "date-fns";

// Recent (< 7 days): "2 hours ago"
{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}

// Older: "Jan 15, 2026"
{format(new Date(timestamp), "MMM d, yyyy")}
```

### Empty State Pattern
```tsx
{data.length === 0 && (
  <Empty>
    <EmptyMedia><Icon className="h-12 w-12" /></EmptyMedia>
    <EmptyContent>
      <EmptyTitle>No data yet</EmptyTitle>
      <EmptyDescription>Description here</EmptyDescription>
    </EmptyContent>
  </Empty>
)}
```

### Loading Pattern
```tsx
{data === undefined && (
  <div className="space-y-4">
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
)}
```

---

## 🧪 Testing Strategy

### Per-Story Testing (After Each Story)
1. ✅ Visual verification in browser (localhost:3000)
2. ✅ Test with no data (empty state displays)
3. ✅ Test with mock data (1 item, 10 items, 100 items)
4. ✅ Test responsive layouts (375px mobile, 768px tablet, 1920px desktop)
5. ✅ Test loading states (query === undefined shows skeleton)
6. ✅ Type check passes: `npm run check-types`
7. ✅ Lint passes: `npx ultracite fix`

### Integration Testing (End of Week 2)
After all 7 stories complete:
1. Full dashboard flow: Change date range → All sections update
2. Search flow: Type query → Results filter → Clear button resets
3. Filter flow: Toggle categories → Sections hide/show → Combine with search
4. Navigation flow: Click "View in Passport" → Verify link works
5. Real data flow: Create voice note → Approve insight → See in dashboard
6. Parent engagement: Parent views summary → Status badge updates
7. Cross-browser: Chrome, Safari, Firefox
8. Performance: Test with 100+ insights (< 100ms render time)

---

## 📁 File Structure After Week 2

```
apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/
├── my-impact-tab.tsx                       # MODIFIED - Replace all 4 placeholders
├── impact-summary-cards.tsx                # NEW - US-P8-005
├── sent-summaries-section.tsx              # NEW - US-P8-006
├── applied-insights-section.tsx            # NEW - US-P8-007
└── team-observations-section.tsx           # NEW - US-P8-009

packages/backend/convex/models/
└── voiceNotes.ts                           # READ ONLY - getCoachImpactSummary exists (line 2041)
```

**No backend changes needed** - All data from `getCoachImpactSummary` query (already exists)

---

## 🎯 Success Criteria

Week 2 is complete when:
- ✅ All 7 user stories implemented (US-P8-005 to US-P8-011)
- ✅ 4 new components created
- ✅ my-impact-tab.tsx: All placeholders replaced with real components
- ✅ Dashboard shows comprehensive coaching impact
- ✅ Date filtering enhanced with quarter and season options
- ✅ Search and category filters work in Applied Insights
- ✅ Empty states and loading states handled for all sections
- ✅ Responsive design works on all screen sizes
- ✅ Type checking passes: `npm run check-types`
- ✅ Linting passes: `npx ultracite fix`
- ✅ Visual verification complete in browser
- ✅ Real-time data updates work (useQuery provides live updates)

---

## 🚀 Recommended Order (Follow Priority)

### Day 1-2: Core Dashboard (High Visibility)
1. **US-P8-005**: Impact Summary Cards (2-3 hours) ← **START HERE**
2. **US-P8-008**: Date Range Filtering enhancement (2-3 hours)
3. **Test**: Verify cards display, date range updates all sections

### Day 3: Summaries Section
4. **US-P8-006**: Sent Summaries Section (3-4 hours)
5. **Test**: Verify table on desktop, cards on mobile, badges correct

### Day 4-5: Insights Section (Most Complex)
6. **US-P8-007**: Applied Insights Section (4-5 hours) ← **MOST COMPLEX**
7. **US-P8-010**: Add Search (2-3 hours)
8. **US-P8-011**: Add Category Filters (2-3 hours)
9. **Test**: Verify collapse/expand, search, filters, links to passports

### Day 6: Team Observations + Final Polish
10. **US-P8-009**: Team Observations Section (2-3 hours)
11. **Final Integration Testing**: All sections work together
12. **Polish**: Fix any visual issues, responsive tweaks

---

## 💡 Tips for Success

### Component Reuse
- Look for repeated patterns (card layouts, empty states, loading skeletons)
- Create subcomponents for reuse (StatCard, InsightCard, etc.)
- Extract hooks for complex logic (useInsightFilters, useDateRange)

### Performance
- Use `useMemo` for expensive computations (filtering, sorting)
- Use `React.memo` for components that don't change often
- Debounce search input to avoid excessive re-renders (300ms)
- Limit initial data display (10 items, "View All" for more)

### Accessibility
- Add proper ARIA labels for interactive elements
- Ensure keyboard navigation works
- Use semantic HTML (section, article, nav)

### Error Handling
- Handle missing data gracefully (empty states)
- Show loading states while queries load
- Display error messages if queries fail
- Provide retry buttons for failed loads

---

## 📊 Week 2 Metrics (Estimated)

### Code Changes
- **Files Created**: 4 new components
- **Files Modified**: 1 component (my-impact-tab.tsx)
- **Lines Added**: ~1,230 lines
- **Components**: 10+ (cards, sections, filters, search)

### User Value
- **Visibility Gained**: 100% (from 0% to full visibility)
- **Questions Answered**: 8+ coaching impact questions
- **Time Saved**: ~30 min/week per coach (no manual tracking)

### Quality Metrics
- **Test Coverage**: Visual + integration tests for all 7 stories
- **Responsive**: 3 breakpoints (mobile, tablet, desktop)
- **Performance**: < 100ms render time with 100+ items
- **Accessibility**: WCAG AA compliant

---

## 🔗 Related Documents (MUST READ)

### Before Starting
1. **scripts/ralph/prd.json** ← **Active PRD Ralph will read**
2. **scripts/ralph/P8_WEEK2_RALPH_CONTEXT.md** ← **CRITICAL Better Auth patterns**
3. **scripts/ralph/P8_CHECKPOINT_JAN28.md** - Week 1 & 1.5 complete status

### During Implementation
4. **scripts/ralph/P8_WEEK2_PREPARATION.md** - Complete implementation guide
5. **scripts/ralph/prds/Coaches Voice Insights/P8_COACH_IMPACT_VISIBILITY.md** - Main PRD

### Reference
6. **packages/backend/convex/models/voiceNotes.ts:2041** - getCoachImpactSummary query return type
7. **apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx** - Current skeleton with placeholders

---

## 🚦 Quick Start Commands

```bash
# Verify on correct branch
git branch
# Should be: ralph/coach-impact-visibility-p8-week1

# View recent commits (should see Week 1 & 1.5 complete)
git log --oneline -5

# Type check
npm run check-types

# Lint
npx ultracite fix

# Start dev server (if not running)
npm run dev

# View dashboard
# Navigate to: http://localhost:3000/orgs/{orgId}/coach/voice-notes
# Click "My Impact" tab to see placeholders
```

---

## ✅ Verification Before Starting

Run these checks before starting Week 2:

```bash
# 1. Verify backend query exists
grep -n "export const getCoachImpactSummary" packages/backend/convex/models/voiceNotes.ts
# Should output: 2041:export const getCoachImpactSummary = query({

# 2. Verify my-impact-tab exists
ls -la apps/web/src/app/orgs/\[orgId\]/coach/voice-notes/components/my-impact-tab.tsx
# Should show file exists (created Week 1)

# 3. Verify working directory clean
git status
# Should show: nothing to commit, working tree clean

# 4. Verify on correct branch
git branch | grep "*"
# Should output: * ralph/coach-impact-visibility-p8-week1
```

All checks pass? ✅ **Ready to start Week 2!**

---

**Ralph**: Read `scripts/ralph/prd.json` for complete story details. Follow story order 1→7. Test after each story. Week 2 is frontend only - no backend changes needed. All data from `getCoachImpactSummary` query.

**Good luck! 🚀**
