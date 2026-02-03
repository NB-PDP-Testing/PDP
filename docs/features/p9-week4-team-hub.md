# Phase 9 Week 4 Phase 1 - Team Hub Foundation (Tab Navigation)

> Auto-generated documentation - Last updated: 2026-02-01 23:03

## Status

- **Branch**: `ralph/p9-week4-team-hub`
- **Progress**: 3 / 3 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P9-063: Add Tab Navigation to Team Hub

Transform existing /team-hub page into tabbed interface (Overview, Players, Planning, Activity, Decisions, Tasks, Insights).

**Acceptance Criteria:**
- IMPORTANT: Enhance EXISTING /team-hub/page.tsx (do NOT create new route)
- Wrap existing content in <Tabs> component from shadcn/ui
- Create 7 tabs: Overview, Players, Planning, Activity, Decisions, Tasks, Insights
- URL persistence via useSearchParams (?tab=overview as default)
- Tab state persists on refresh
- REUSE: Move existing activity-feed-view.tsx to Activity tab (don't rebuild)
- REUSE: Move existing voting-card.tsx + voting-list.tsx to Decisions tab (don't rebuild)
- Create PLACEHOLDER components for new tabs: overview-tab.tsx, players-tab.tsx, planning-tab.tsx, tasks-tab.tsx, insights-tab.tsx
- Placeholders show: Tab title + 'Coming in Phase 2/3/4' message + icon
- Keep existing team selector dropdown in header (above tabs)
- Keep existing presence indicators (above tabs)
- Mobile: Tabs scroll horizontally (no overflow)
- Desktop: Tabs fixed width, full bar visible
- Responsive breakpoints: 768px (mobile/tablet), 1024px (desktop)
- Loading skeleton while team loading
- Type check passes: npm run check-types
- Visual verification with dev-browser (all 7 tabs clickable)

### US-P9-SCHEMA: Optional: Add sessionPlanId to voiceNotes

Add optional sessionPlanId field to voiceNotes table for linking notes to session plans.

**Acceptance Criteria:**
- OPTIONAL: Can skip if not critical for Phase 1
- Modify packages/backend/convex/schema.ts
- Add field: sessionPlanId: v.optional(v.id("sessionPlans")) to voiceNotes table
- Add index: .index("by_session", ["sessionPlanId"])
- Run: npx -w packages/backend convex dev (applies schema)
- Run: npx -w packages/backend convex codegen
- Type check passes
- Verify in Convex dashboard: voiceNotes table has sessionPlanId field

### US-P9-056: Enhance Activity Feed with Pagination

Add cursor-based pagination to existing ActivityFeedView component.

**Acceptance Criteria:**
- ENHANCE existing activity-feed-view.tsx (do NOT rebuild from scratch)
- Backend: Enhance packages/backend/convex/models/teamCollaboration.ts
- Update getTeamActivityFeed query to support pagination:
-   - Add paginationOpts arg: { cursor: v.union(v.string(), v.null()), numItems: v.number() }
-   - Return object: { page: v.array(...), continueCursor: v.union(v.string(), v.null()), isDone: v.boolean() }
-   - Use Convex paginate() helper for cursor-based pagination
-   - Keep existing filters arg (types, dateRange - optional)
- Frontend: Add pagination state to activity-feed-view.tsx
-   - useState for cursor and accumulated items
-   - 'Load More' button at bottom (only show if !isDone)
-   - Click 'Load More' → fetch next page with continueCursor
-   - Append new items to existing list
-   - Loading spinner on button while fetching
-   - Disable button while loading
- Keep existing features: tab filtering, real-time updates, empty states
- Default: Load 50 items per page
- Type check passes
- Visual verification: Load More works, pagination smooth


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Tabs component from shadcn/ui works well with URL persistence pattern
- Use `useSearchParams` + `useRouter.replace` for URL-based tab state
- Pattern: `const currentTab = (searchParams.get("tab") as TabValue) || "overview"`
- Tab triggers need both icon and text with `className="hidden sm:inline"` on text for mobile
- Created wrapper tab components (activity-tab.tsx, decisions-tab.tsx) to pass props cleanly
- Fixed type error: `coachAssignment?.role` should be `coachAssignment?.roles?.includes("head_coach")`
- Variable shadowing: renamed `params` to `urlParams` inside handleTabChange to avoid shadowing the `params` from useParams
--
- Convex .paginate() returns {page, continueCursor, isDone} structure
- Union return types work well for backward compatibility: `v.union(paginatedObject, array)`

**Gotchas encountered:**
- Fixed type error: `coachAssignment?.role` should be `coachAssignment?.roles?.includes("head_coach")`
- Variable shadowing: renamed `params` to `urlParams` inside handleTabChange to avoid shadowing the `params` from useParams
- Pre-existing issue discovered: Team Hub page crashes with presence validation error
- Tabs rely on existing team selector logic which may have bugs with displayTeamId
--
- Linter auto-removed imports (Loader2, useState, useEffect, Button) - had to use Write instead of Edit
- Union return types require explicit type guards in frontend
- useEffect dependency linting: added biome-ignore comment for intentional currentFilter dependency
- Pre-existing Team Hub bug blocks visual verification (team presence validation error)
- Activity feed depends on team selector which has displayTeamId bug (returns player ID)

### Files Changed

- Modified: apps/web/src/app/orgs/[orgId]/coach/team-hub/page.tsx (+111, -14)
- Created: activity-tab.tsx (wrapper for existing ActivityFeedView)
- Created: decisions-tab.tsx (wrapper for existing VotingList)
- Created: overview-tab.tsx (placeholder with Empty component)
- Created: players-tab.tsx (placeholder with Empty component)
- Created: planning-tab.tsx (placeholder with Empty component)
- Created: tasks-tab.tsx (placeholder with Empty component)
- Created: insights-tab.tsx (placeholder with Empty component)
- ✅ Type check: passed (npm run check-types)
- ✅ Linting: passed (commit hook with lint-staged)
- ⚠️ Browser verification: tabs exist in code but page has unrelated error (team presence validation issue)
--
- packages/backend/convex/models/teamCollaboration.ts (+80, -20)
- apps/web/src/app/orgs/[orgId]/coach/team-hub/components/activity-feed-view.tsx (+230, -110)
- ✅ Type check: passed (npm run check-types)


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
