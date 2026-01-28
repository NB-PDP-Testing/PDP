# P8 Week 2 - My Impact Dashboard - Preparation Guide

**Status**: Ready to Start
**Prerequisites**: ✅ Week 1 Complete, ✅ Week 1.5 Complete
**Estimated Time**: 5-7 days (7 user stories)
**Branch**: Continue on `ralph/coach-impact-visibility-p8-week1`

---

## 📋 Week 2 Overview

### What We're Building
Complete "My Impact" dashboard that shows coaches their coaching activity and impact across:
- Summary cards (4 metrics at a glance)
- Sent summaries section (parent engagement tracking)
- Applied insights section (grouped by category)
- Team observations section (team-level insights)
- Search and filtering capabilities

### Why This Matters
Coaches (especially Level 0-1) currently have ZERO visibility into outcomes of their work. Week 2 delivers the core dashboard that answers:
- "How many voice notes did I create this month?"
- "Which insights actually got applied to player profiles?"
- "Are parents viewing the summaries I send?"
- "What's my overall coaching impact?"

---

## ✅ Prerequisites Complete

### From Week 1
- ✅ Backend query: `getCoachImpactSummary` - Aggregates all coach activity
- ✅ My Impact tab structure: `my-impact-tab.tsx` with basic layout
- ✅ Tab navigation: "My Impact" tab added to voice notes dashboard
- ✅ Date filtering state: `selectedDateRange` state exists

### From Week 1.5
- ✅ Trust gate system: Access control working
- ✅ Tab visibility: Respects new permission system
- ✅ Real-time updates: useQuery patterns established

### Existing Components
- ✅ shadcn/ui components: Card, Badge, Button, Table, etc.
- ✅ date-fns: formatDistanceToNow, format
- ✅ Lucide icons: All needed icons available
- ✅ Responsive patterns: Mobile-first CSS established

---

## 📊 User Stories (7 Stories)

### US-P8-005: Create Impact Summary Cards Component ⏳

**Description**: As a coach, I want to see 4 key metrics at the top of My Impact so I can quickly understand my coaching activity.

**Acceptance Criteria**:
- Create `impact-summary-cards.tsx` component
- 4 cards in responsive grid (1 col mobile, 2 cols tablet, 4 cols desktop)
- Cards show:
  1. Voice Notes Created (blue) - Count + trend
  2. Insights Applied (green) - Count + trend
  3. Summaries Sent (purple) - Count + trend
  4. Parent View Rate (amber) - Percentage + trend
- Data from `getCoachImpactSummary` query
- Loading skeletons while data loads
- Empty state when no data (encourages recording notes)

**Files to Create**:
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/impact-summary-cards.tsx`

**Files to Modify**:
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx` (import and render cards)

**Estimated Time**: 2-3 hours

---

### US-P8-006: Create Sent Summaries Section Component ⏳

**Description**: As a coach, I want to see all summaries I've sent to parents with engagement status so I know who's viewing and acknowledging.

**Acceptance Criteria**:
- Create `sent-summaries-section.tsx` component
- Table with columns:
  - Player Name (with avatar/initials)
  - Summary Preview (first 100 chars)
  - Sent At (relative time: "2 hours ago")
  - Status (Badge: Sent/Viewed/Acknowledged)
  - Parent Engagement (View time + Ack time if applicable)
- Data from `getCoachImpactSummary.recentSummaries`
- Shows last 10 summaries by default
- "View All" button → links to existing "Sent to Parents" tab
- Empty state when no summaries sent
- Responsive: Stacks on mobile, table on desktop

**Files to Create**:
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/sent-summaries-section.tsx`

**Files to Modify**:
- `my-impact-tab.tsx` (import and render section)

**Estimated Time**: 3-4 hours

---

### US-P8-007: Create Applied Insights Section Component ⏳

**Description**: As a coach, I want to see insights I've applied grouped by category so I understand what types of observations I'm making.

**Acceptance Criteria**:
- Create `applied-insights-section.tsx` component
- Group insights by category: Skills, Injuries, Attendance, Behavior, Notes
- Each category shows:
  - Category header with icon + count
  - List of recent insights (last 5 per category)
  - "View All" link per category
- Insight cards show:
  - Player name
  - Insight text (truncated to 1 line)
  - Applied at (relative time)
  - "View in Passport" link
- Data from `getCoachImpactSummary.skillChanges`, `injuriesRecorded`, etc.
- Collapsible sections (expand/collapse categories)
- Empty state per category when no insights

**Files to Create**:
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/applied-insights-section.tsx`

**Files to Modify**:
- `my-impact-tab.tsx` (import and render section)

**Estimated Time**: 4-5 hours

---

### US-P8-008: Add Date Range Filtering to My Impact Tab ⏳

**Description**: As a coach, I want to filter My Impact data by date range so I can see specific time periods (this week, this month, this season).

**Acceptance Criteria**:
- Add date range selector component at top of tab
- Preset options:
  - Last 7 Days (default)
  - Last 30 Days
  - Last 3 Months
  - This Season
  - All Time
  - Custom Range (date picker)
- Selected range passed to `getCoachImpactSummary` query
- All sections update when range changes
- Save preference to localStorage
- Show selected range in heading (e.g., "My Impact - Last 30 Days")

**Files to Modify**:
- `my-impact-tab.tsx` (add date selector, update query args)

**Estimated Time**: 2-3 hours

**Note**: May need to create reusable `DateRangeSelector` component in `components/ui/`

---

### US-P8-009: Create Team Observations Section Component ⏳

**Description**: As a coach, I want to see team-level observations I've made so I can track team dynamics and culture insights.

**Acceptance Criteria**:
- Create `team-observations-section.tsx` component
- Shows team-level insights (category: "team_culture", "todo")
- List view with cards showing:
  - Observation text
  - Team name (if specific team, else "General")
  - Created at (relative time)
  - Tags (if any)
- Data from `getCoachImpactSummary.teamObservations`
- Limit to 10 most recent
- "View All" button if more than 10
- Empty state when no team observations

**Files to Create**:
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/team-observations-section.tsx`

**Files to Modify**:
- `my-impact-tab.tsx` (import and render section)

**Estimated Time**: 2-3 hours

---

### US-P8-010: Add Search to Applied Insights Section ⏳

**Description**: As a coach, I want to search applied insights so I can quickly find specific observations or players.

**Acceptance Criteria**:
- Add search input above applied insights section
- Search filters by:
  - Player name (fuzzy match)
  - Insight text (contains search term)
  - Category (exact match if specified)
- Debounced search (300ms delay)
- Clear button (X) to reset search
- Shows count: "Showing 5 of 23 insights"
- Highlights search term in results (bold)
- Empty state when no results match search

**Files to Modify**:
- `applied-insights-section.tsx` (add search input, filter logic)

**Estimated Time**: 2-3 hours

**Note**: Use `useDeferredValue` or `useMemo` for performance with large datasets

---

### US-P8-011: Add Category Filters to Applied Insights Section ⏳

**Description**: As a coach, I want to filter applied insights by category so I can focus on specific types of observations.

**Acceptance Criteria**:
- Add category filter chips above applied insights
- Filter options:
  - All (default, selected)
  - Skills
  - Injuries
  - Attendance
  - Behavior
  - Notes
- Clicking chip toggles filter
- Multiple categories can be selected (OR logic)
- Shows count per category badge
- Persists selection while on page
- Works with search (search + filter combined)

**Files to Modify**:
- `applied-insights-section.tsx` (add filter chips, combine with search)

**Estimated Time**: 2-3 hours

**Note**: Consider extracting filter logic into custom hook `useInsightFilters`

---

## 🎨 Design Patterns to Follow

### Component Structure
```tsx
// Example: impact-summary-cards.tsx
export function ImpactSummaryCards({
  data
}: {
  data: CoachImpactSummary
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        title="Voice Notes"
        value={data.voiceNotesCreated}
        trend="+5 this week"
        icon={Mic}
        color="blue"
      />
      {/* ... more cards ... */}
    </div>
  );
}
```

### Responsive Grid Pattern
```tsx
// Mobile: 1 column
// Tablet: 2 columns
// Desktop: 4 columns
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
```

### Date Formatting Pattern
```tsx
// Recent: "2 hours ago"
{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}

// Older: "Jan 15, 2026"
{format(new Date(timestamp), "MMM d, yyyy")}
```

### Empty State Pattern
```tsx
{data.length === 0 && (
  <div className="text-center py-12">
    <Icon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-medium">No data yet</h3>
    <p className="mt-1 text-sm text-gray-500">
      Record a voice note to see your impact
    </p>
  </div>
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

### Per-Story Testing
After completing each story:
1. Visual verification in browser
2. Test with no data (empty state)
3. Test with mock data (1, 10, 100 items)
4. Test responsive layouts (mobile, tablet, desktop)
5. Test loading states
6. Type check passes
7. Lint passes

### Integration Testing (End of Week 2)
After all stories complete:
1. Full dashboard flow: Filter by date → See all sections update
2. Search flow: Search insights → Filter by category → Clear
3. Navigation flow: Click "View in Passport" → Verify link works
4. Real data flow: Create voice note → Approve insight → See in dashboard
5. Parent engagement flow: Parent views summary → See status update
6. Cross-browser: Test in Chrome, Safari, Firefox
7. Performance: Test with 100+ insights (should not lag)

---

## 📁 File Structure After Week 2

```
apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/
├── my-impact-tab.tsx                       # Main container (modified)
├── impact-summary-cards.tsx                # NEW - US-P8-005
├── sent-summaries-section.tsx              # NEW - US-P8-006
├── applied-insights-section.tsx            # NEW - US-P8-007
└── team-observations-section.tsx           # NEW - US-P8-009

(no backend changes needed - getCoachImpactSummary already exists)
```

---

## 🎯 Success Criteria

Week 2 is complete when:
- ✅ All 7 user stories implemented
- ✅ Dashboard shows comprehensive coaching impact
- ✅ Date filtering works across all sections
- ✅ Search and category filters work
- ✅ Empty states and loading states handled
- ✅ Responsive design works on all screen sizes
- ✅ Type checking passes
- ✅ Linting passes
- ✅ Visual verification complete
- ✅ Real-time data updates work

---

## 🚀 Recommended Order

### Day 1-2: Core Dashboard
1. US-P8-005: Impact Summary Cards (2-3 hours)
2. US-P8-008: Date Range Filtering (2-3 hours)
3. Test: Verify cards update when date range changes

### Day 3: Summaries Section
4. US-P8-006: Sent Summaries Section (3-4 hours)
5. Test: Verify summaries display with engagement status

### Day 4-5: Insights Section
6. US-P8-007: Applied Insights Section (4-5 hours)
7. US-P8-010: Add Search (2-3 hours)
8. US-P8-011: Add Category Filters (2-3 hours)
9. Test: Verify search + filter combo works

### Day 6: Team Observations
10. US-P8-009: Team Observations Section (2-3 hours)
11. Final integration testing
12. Polish and bug fixes

---

## 💡 Tips for Success

### Component Reuse
- Look for repeated patterns (card layouts, empty states, loading skeletons)
- Create subcomponents for reuse (SummaryCard, InsightCard, etc.)
- Extract hooks for complex logic (useInsightFilters, useDateRange)

### Performance
- Use `useMemo` for expensive computations (filtering, sorting)
- Use `React.memo` for components that don't change often
- Debounce search input to avoid excessive re-renders
- Limit initial data display (10 items, "View All" for more)

### Accessibility
- Add proper ARIA labels for interactive elements
- Ensure keyboard navigation works
- Use semantic HTML (section, article, nav)
- Test with screen reader if possible

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
- **Lines Added**: ~1,500 lines
- **Components**: 15+ (cards, sections, filters)

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

## 🔗 Related Documents

- `scripts/ralph/prds/Coaches Voice Insights/P8_COACH_IMPACT_VISIBILITY.md` - Main PRD (Week 2 section)
- `scripts/ralph/P8_CHECKPOINT_JAN28.md` - Week 1 & 1.5 checkpoint
- `packages/backend/convex/models/voiceNotes.ts` - getCoachImpactSummary query

---

**Ready to Start**: Week 2 can begin immediately after Week 1.5 manual testing completes ✅
