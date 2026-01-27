# PRD: Phase 8 - Coach Impact Visibility & Traceability

**Project:** Voice Notes - Coach Impact Visibility
**Branch:** `ralph/coach-impact-visibility-p8`
**Created:** January 27, 2026
**Status:** Ready for Implementation
**Estimated Time:** 3 weeks (20-25 user stories)
**Priority:** 🔴 CRITICAL - Fixes fundamental UX gap

---

## Executive Summary

**Problem Statement:**
Coaches at Trust Level 0-1 (manual review users) have **zero visibility** into the outcomes of their work. They cannot see what parent summaries they've sent, cannot track which insights were applied to player profiles, and have no way to measure their coaching impact.

**The Paradox:**
Coaches doing MORE work (manual review) get LESS feedback than automated users (Level 2+). This is a fundamental UX failure that undermines coach confidence in the system.

**Solution:**
Create a unified "My Impact" dashboard visible to ALL coaches that shows:
- Sent parent summaries with view/acknowledge status
- Applied insights with links to player profiles
- Aggregate coaching activity metrics
- Traceability from insights → passport → source voice notes

**What's Already Done:**
- ✅ All backend queries exist (`getAutoApprovedSummaries`, `getCoachImpactSummary` needs creation)
- ✅ Schema fields for parent summaries (`viewedAt`, `acknowledgedAt`)
- ✅ Voice notes infrastructure with insight tracking
- ✅ Player passport with skills, injuries, attendance data
- ✅ Trust level system and preferences

**What This PRD Delivers:**

### Week 1: Foundation & Quick Wins
- Create `getCoachImpactSummary` backend query
- Remove trust level gate from "Sent to Parents" tab (immediate impact)
- Add basic "My Impact" tab structure

### Week 2: My Impact Dashboard
- Summary cards (notes created, insights applied, summaries sent, parent view rate)
- Sent summaries section with parent engagement data
- Applied insights section grouped by category

### Week 3: Navigation & Polish
- Clickable links from insights → player passports
- Backlinks from passport → source voice notes
- Date filtering with preferences
- Search and filters for applied insights

---

## Context & Architecture

### Critical User Insight (from Section 20)

> "Coaches at Level 0-1 have NO visibility into the results of their work, while Level 2+ coaches get the 'Sent to Parents' tab. All coaches need to answer basic questions about their coaching impact."

**Questions Coaches Can't Answer:**
1. "What did I send to Emma's parent last week?" ❌ No way to check
2. "Did that skill rating actually get applied?" ❌ Must check passport manually
3. "How many insights did I approve this month?" ❌ No tracking
4. "Which voice notes led to player updates?" ❌ No traceability
5. "Are parents reading what I send?" ❌ No engagement visibility

### Visibility Asymmetry

**LEVEL 0-1 COACHES** (Manual Review):
- What They Do: Record notes → Review every insight → Approve every summary
- What They See After: ❌ NOTHING (no tracking, no history, no impact visibility)

**LEVEL 2+ COACHES** (AI-Assisted):
- What They Do: Record notes → AI auto-applies eligible insights
- What They See After: ✅ Sent to Parents tab, Auto-Applied tab, Parent engagement status

**Result:** Level 0-1 coaches do MORE work but have LESS visibility. 🔴 **This is backwards.**

### Backend APIs (Existing)

**Already Implemented:**
```typescript
// Queries
api.models.coachParentSummaries.getAutoApprovedSummaries({
  organizationId: string,
  trustLevel: number,
  daysToShow: number
}) // Returns sent summaries (currently gated by trustLevel >= 2)

api.models.voiceNotes.getCoachVoiceNotes({
  organizationId: string,
  coachId: string
}) // Returns coach's voice notes

api.models.coachParentSummaries.getParentSummariesByChildAndSport({
  organizationId: string
}) // Returns summaries grouped by player

// Mutations (already implemented)
api.models.coachParentSummaries.markSummaryViewed({...})
api.models.coachParentSummaries.acknowledgeParentSummary({...})
```

**Need to Create:**
```typescript
api.models.voiceNotes.getCoachImpactSummary({
  coachId: string,
  organizationId: string,
  dateRange: { start: number, end: number }
}) // NEW - Aggregates coach activity across 6 tables
```

### Schema Fields (Already Exist)

**coachParentSummaries:**
- `viewedAt`, `acknowledgedAt` ✅ Track parent engagement
- `status`: "pending_review" | "approved" | "auto_approved" | "delivered" | "viewed"

**voiceNoteInsights:**
- `status`: "pending" | "applied" | "dismissed" | "needs_attention"
- `appliedAt`, `playerIdentityId` ✅ Track application

**skillAssessments, playerInjuries, playerAttendance:**
- `source`: "voice_note" ✅ Traceability
- `voiceNoteId` ✅ Link back to source

### File Locations

**Files to Create:**
```
apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/
├── my-impact-tab.tsx                        # Week 2: Main dashboard
├── impact-summary-cards.tsx                 # Week 2: Stat cards
├── sent-summaries-section.tsx               # Week 2: Sent summaries with engagement
├── applied-insights-section.tsx             # Week 2: Applied insights grouped
└── team-observations-section.tsx            # Week 3: Team observations

packages/backend/convex/models/
└── voiceNotes.ts                            # Week 1: Add getCoachImpactSummary query
```

**Files to Modify:**
```
apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/
├── auto-approved-tab.tsx                    # Week 1: Remove trust level gate
└── voice-notes-dashboard.tsx                # Week 2: Add My Impact tab

apps/web/src/app/orgs/[orgId]/players/[playerId]/
└── components/
    ├── skill-assessment-display.tsx         # Week 3: Add source badge
    └── injury-record-display.tsx            # Week 3: Add source badge
```

---

## Implementation Guidelines

### Task Sizing for Ralph
- Each user story should complete in ONE Claude context window
- Modify 1-3 files per story maximum
- Backend stories separate from frontend stories
- Test stories separate from implementation stories

### Quality Checks
```bash
# Type check (MUST pass)
npm run check-types

# Lint (MUST pass)
npx ultracite fix
npm run check

# Visual verification (for UI changes)
# - Navigate to /orgs/[orgId]/coach/voice-notes
# - Test on desktop (1920px) and mobile (375px)
# - Verify functionality works as expected
```

### Convex Patterns (Critical!)
```typescript
// ✅ ALWAYS use indexes
const summaries = await ctx.db
  .query("coachParentSummaries")
  .withIndex("by_org_coach_status", (q) =>
    q.eq("organizationId", orgId)
     .eq("coachId", coachId)
     .eq("status", "delivered")
  )
  .collect();

// ✅ ALWAYS add validators
export const myQuery = query({
  args: { coachId: v.string(), organizationId: v.string() },
  returns: v.object({ ... }),
  handler: async (ctx, args) => { ... }
});

// ✅ Auth pattern
const user = await authComponent.safeGetAuthUser(ctx);
if (!user) throw new Error("Not authenticated");
const userId = user.userId || user._id;
```

### Component Patterns
```typescript
// ✅ Use existing shadcn/ui components
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// ✅ Use date-fns for formatting
import { formatDistanceToNow, format } from "date-fns";

// Recent: "2 hours ago"
{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}

// Older: "Jan 15, 2026"
{format(new Date(timestamp), "MMM d, yyyy")}

// ✅ Responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

---

## User Stories - Week 1: Foundation & Quick Wins

### US-P8-001: Create getCoachImpactSummary Backend Query

**As a** backend developer
**I want to** create a query that aggregates coach activity across multiple tables
**So that** the My Impact dashboard can display comprehensive coaching metrics

**Acceptance Criteria:**
- [ ] Create `getCoachImpactSummary` query in `packages/backend/convex/models/voiceNotes.ts`
- [ ] Query accepts `coachId`, `organizationId`, `dateRange: { start, end }`
- [ ] Query returns typed object with:
  - `voiceNotesCreated: number`
  - `insightsApplied: number`
  - `insightsDismissed: number`
  - `summariesSent: number`
  - `summariesViewed: number`
  - `summariesAcknowledged: number`
  - `parentViewRate: number` (calculated percentage)
  - `skillChanges: array` (recent skill changes from voice notes)
  - `injuriesRecorded: array` (recent injuries from voice notes)
  - `recentSummaries: array` (last 10 sent summaries)
  - `teamObservations: array` (team-level insights)
- [ ] Query uses indexes (NEVER `.filter()`)
- [ ] Include `args` and `returns` validators
- [ ] Calculate `parentViewRate` = (summariesViewed / summariesSent) * 100
- [ ] Aggregate from tables:
  - `voiceNotes` (created count, filtered by coachId + dateRange)
  - `voiceNoteInsights` (applied/dismissed counts)
  - `coachParentSummaries` (sent/viewed/ack counts)
  - `skillAssessments` (where source="voice_note")
  - `playerInjuries` (where source="voice_note")
  - `teamObservations` (where createdBy=coachId)
- [ ] Type check passes
- [ ] Run `npx -w packages/backend convex codegen` to verify types

**Files to Create:**
- None (modify existing file)

**Files to Modify:**
- `packages/backend/convex/models/voiceNotes.ts` (add query at bottom)

**Technical Notes:**
- Use `.withIndex()` for all queries
- Use `v.object()` with complete type definition in `returns`
- Handle edge cases: no data (return zeros), coach not found (return null)
- Date range filtering: `q => q.gte("createdAt", start).lte("createdAt", end)`

**Priority:** 1 (foundational - required by all frontend stories)

---

### US-P8-002: Remove Trust Level Gate from Sent to Parents Tab

**As a** Level 0-1 coach
**I want to** see the "Sent to Parents" tab
**So that** I can view summaries I've sent without needing Level 2+

**Acceptance Criteria:**
- [ ] Remove trust level check in `auto-approved-tab.tsx` that hides tab for Level 0-1
- [ ] Tab visible to ALL coaches (Level 0+)
- [ ] Tab shows all sent summaries for coach's organization
- [ ] Existing functionality preserved (search, filter, parent view status)
- [ ] Type check passes
- [ ] Visual verification: Navigate to voice notes dashboard as Level 0 coach, verify tab visible

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/auto-approved-tab.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx` (tab visibility logic)

**Technical Notes:**
```typescript
// OLD - Remove this check
if (coachTrustLevel < 2) {
  return <EmptyState message="Available at Trust Level 2+" />;
}

// NEW - Show for all coaches
// Just remove the check entirely
```

**Priority:** 2 (quick win - immediate impact)

---

### US-P8-003: Create My Impact Tab Component Structure

**As a** frontend developer
**I want to** create the skeleton for the My Impact tab
**So that** we have a foundation for adding dashboard sections

**Acceptance Criteria:**
- [ ] Create `my-impact-tab.tsx` in voice notes components folder
- [ ] Tab exports `MyImpactTab` component
- [ ] Component accepts `orgId` and `coachId` props
- [ ] Component uses `useQuery` to fetch data from `getCoachImpactSummary`
- [ ] Component has date range state (`"week" | "month" | "all"`, default "month")
- [ ] Date range picker component renders at top (simple dropdown)
- [ ] Loading state shows spinner while query loads
- [ ] Error state shows error message if query fails
- [ ] Empty state shows "No activity yet" if no data
- [ ] Component structure has sections for:
  - Summary cards (placeholder)
  - Sent summaries (placeholder)
  - Applied insights (placeholder)
  - Team observations (placeholder)
- [ ] Type check passes
- [ ] Visual verification: Tab appears in dashboard

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx`

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx` (add tab to navigation)

**Technical Notes:**
```typescript
// Date range helper
function getDateRangeForFilter(filter: "week" | "month" | "all") {
  const now = Date.now();
  const start = filter === "week" ? now - 7 * 24 * 60 * 60 * 1000 :
                filter === "month" ? now - 30 * 24 * 60 * 60 * 1000 :
                0; // all time
  return { start, end: now };
}
```

**Priority:** 3 (foundation for Week 2 work)

---

### US-P8-004: Add My Impact Tab to Voice Notes Dashboard Navigation

**As a** coach
**I want to** see "My Impact" as a tab option in the voice notes dashboard
**So that** I can access my impact summary

**Acceptance Criteria:**
- [ ] Add "My Impact" tab to dashboard tab list
- [ ] Tab visible to coaches with functional role "Coach"
- [ ] Tab visible to platform staff when viewing coach dashboard
- [ ] Tab NOT visible to parents, admins without coach role
- [ ] Tab shows badge with icon (e.g., `<BarChart3>` from lucide-react)
- [ ] Tab positioned after "History" tab, before "Settings"
- [ ] Clicking tab renders `MyImpactTab` component
- [ ] Type check passes
- [ ] Visual verification: Tab appears and navigates correctly

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx`

**Technical Notes:**
```typescript
// Role check pattern
const hasCoachRole = member?.functionalRoles?.includes("Coach");
const isPlatformStaff = user?.isPlatformStaff;

// Show tab if coach or platform staff
{(hasCoachRole || isPlatformStaff) && (
  <TabsTrigger value="my-impact">
    <BarChart3 className="h-4 w-4 mr-2" />
    My Impact
  </TabsTrigger>
)}
```

**Priority:** 4 (enables tab visibility)

---

## User Stories - Week 2: My Impact Dashboard

### US-P8-005: Create Impact Summary Cards Component

**As a** coach
**I want to** see summary cards showing my coaching activity at a glance
**So that** I understand my productivity without diving into details

**Acceptance Criteria:**
- [ ] Create `impact-summary-cards.tsx` component
- [ ] Component displays 4 cards in responsive grid:
  1. **Voice Notes Created** (count, icon: `<Mic>`)
  2. **Insights Applied** (count, icon: `<CheckCircle>`)
  3. **Summaries Sent** (count, icon: `<Send>`)
  4. **Parent View Rate** (percentage, icon: `<Eye>`)
- [ ] Cards use shadcn Card component with consistent styling
- [ ] Grid responsive: 1 col mobile, 2 cols tablet, 4 cols desktop
- [ ] Each card shows:
  - Icon in colored circle (blue, green, purple, indigo)
  - Label (e.g., "Voice Notes")
  - Large number/percentage
  - Subtle background gradient
- [ ] Cards update in real-time when data changes
- [ ] Type check passes
- [ ] Visual verification: Cards display correctly at 375px, 768px, 1920px

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/impact-summary-cards.tsx`

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx` (import and use cards)

**Technical Notes:**
```typescript
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string; // e.g., "bg-blue-100 text-blue-600"
}
```

**Priority:** 5 (high visibility feature)

---

### US-P8-006: Create Sent Summaries Section Component

**As a** coach
**I want to** see a list of parent summaries I've sent recently
**So that** I can review past communications and check engagement

**Acceptance Criteria:**
- [ ] Create `sent-summaries-section.tsx` component
- [ ] Component accepts `summaries` array prop from impact query
- [ ] Section header shows "Sent to Parents" with count badge
- [ ] Lists most recent 10 summaries (sorted by `sentAt` desc)
- [ ] Each summary card shows:
  - Player name with avatar (first initial)
  - Sport icon
  - Summary preview (first 100 chars)
  - Sent timestamp (formatDistanceToNow if < 7 days, else format date)
  - View status badge (viewed/not viewed)
  - Acknowledge status badge (acknowledged/pending)
- [ ] Badges use colors: green (viewed/ack), gray (pending)
- [ ] Cards clickable to expand full summary
- [ ] "View All" link at bottom navigates to "Sent to Parents" tab
- [ ] Empty state if no summaries sent
- [ ] Type check passes
- [ ] Visual verification: Summaries render correctly with engagement status

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/sent-summaries-section.tsx`

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx` (import and use section)

**Technical Notes:**
```typescript
interface SentSummary {
  summaryId: string;
  playerName: string;
  summaryPreview: string;
  sentAt: number;
  viewedAt?: number;
  acknowledgedAt?: number;
}
```

**Priority:** 6 (addresses core user pain point)

---

### US-P8-007: Create Applied Insights Section Component

**As a** coach
**I want to** see which insights were applied to player profiles
**So that** I can verify my voice notes led to actual data updates

**Acceptance Criteria:**
- [ ] Create `applied-insights-section.tsx` component
- [ ] Component accepts `skillChanges` and `injuriesRecorded` arrays
- [ ] Section header shows "Applied to Player Profiles" with count badge
- [ ] Insights grouped by category with expandable sections:
  - Skills (green icon: `<TrendingUp>`)
  - Injuries (red icon: `<AlertCircle>`)
  - Attendance (blue icon: `<Calendar>`)
- [ ] Each insight card shows:
  - Player name with avatar
  - Change description (e.g., "Tackling: 3 → 4")
  - Category badge
  - Applied timestamp
  - Source voice note title (truncated)
- [ ] Cards clickable to navigate to player passport (see US-P8-012)
- [ ] Show most recent 20 insights
- [ ] "View All" expands to show full list
- [ ] Empty state if no insights applied
- [ ] Type check passes
- [ ] Visual verification: Insights grouped correctly, cards clickable

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/applied-insights-section.tsx`

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx` (import and use section)

**Technical Notes:**
```typescript
interface AppliedInsight {
  type: "skill" | "injury" | "attendance";
  playerName: string;
  playerIdentityId: string;
  description: string; // "Tackling: 3 → 4"
  appliedAt: number;
  voiceNoteId: string;
  voiceNoteTitle: string;
}
```

**Priority:** 7 (addresses core user pain point)

---

### US-P8-008: Add Date Range Filtering to My Impact Tab

**As a** coach
**I want to** filter my impact dashboard by date range
**So that** I can see weekly, monthly, or all-time activity

**Acceptance Criteria:**
- [ ] Date range dropdown at top of My Impact tab
- [ ] Options: "This Week", "This Month", "All Time"
- [ ] Default: "This Month"
- [ ] Selecting option updates query dateRange parameter
- [ ] All sections update with filtered data:
  - Summary cards
  - Sent summaries
  - Applied insights
  - Team observations
- [ ] Date range selection persists in coach preferences (localStorage)
- [ ] Current range displayed in UI: "Showing: Jan 1-27, 2026"
- [ ] Type check passes
- [ ] Visual verification: Filter updates all sections correctly

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx`

**Technical Notes:**
```typescript
// Date range state
const [dateRange, setDateRange] = useState<"week" | "month" | "all">(
  () => localStorage.getItem("impact-date-range") as any || "month"
);

// Persist preference
useEffect(() => {
  localStorage.setItem("impact-date-range", dateRange);
}, [dateRange]);

// Date range display
function getDateRangeDisplay(range: string, start: number, end: number) {
  if (range === "week") return "Showing: Last 7 days";
  if (range === "month") return "Showing: Last 30 days";
  return `Showing: ${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}
```

**Priority:** 8 (enhances usability)

---

### US-P8-009: Create Team Observations Section Component

**As a** coach
**I want to** see team-level insights I've created
**So that** I can track team culture and group dynamics observations

**Acceptance Criteria:**
- [ ] Create `team-observations-section.tsx` component
- [ ] Component accepts `teamObservations` array prop
- [ ] Section header shows "Team Observations" with count badge
- [ ] Lists most recent 5 observations
- [ ] Each observation card shows:
  - Team name with team icon
  - Observation title/preview (first 100 chars)
  - Applied timestamp
  - Source voice note title
  - Category badge (e.g., "Team Culture", "Group Dynamics")
- [ ] Cards clickable to navigate to Team Insights page
- [ ] "View All" link navigates to Team Insights page
- [ ] Empty state if no team observations
- [ ] Type check passes
- [ ] Visual verification: Observations render with correct team context

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/team-observations-section.tsx`

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx` (import and use section)

**Technical Notes:**
```typescript
interface TeamObservation {
  observationId: string;
  teamName: string;
  teamId: string;
  title: string;
  appliedAt: number;
  voiceNoteId: string;
  category: string;
}
```

**Priority:** 9 (completes dashboard sections)

---

### US-P8-010: Add Search to Applied Insights Section

**As a** coach
**I want to** search applied insights by player name or skill
**So that** I can quickly find specific updates

**Acceptance Criteria:**
- [ ] Search input above Applied Insights list
- [ ] Placeholder text: "Search by player name or skill..."
- [ ] Search filters insights in real-time (debounced 300ms)
- [ ] Search matches:
  - Player name (case-insensitive)
  - Skill name (case-insensitive)
  - Category (case-insensitive)
- [ ] Search preserves category grouping
- [ ] Clear button appears when text entered
- [ ] Empty state if no results: "No insights matching '[query]'"
- [ ] Type check passes
- [ ] Visual verification: Search filters correctly, clears properly

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/applied-insights-section.tsx`

**Technical Notes:**
```typescript
// Debounced search
import { useState, useEffect } from "react";

const [searchQuery, setSearchQuery] = useState("");
const [debouncedQuery, setDebouncedQuery] = useState("");

useEffect(() => {
  const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
  return () => clearTimeout(timer);
}, [searchQuery]);

// Filter function
const filteredInsights = insights.filter(insight =>
  insight.playerName.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
  insight.description.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
  insight.type.toLowerCase().includes(debouncedQuery.toLowerCase())
);
```

**Priority:** 10 (enhances usability for coaches with many insights)

---

### US-P8-011: Add Category Filters to Applied Insights Section

**As a** coach
**I want to** filter applied insights by category (Skills, Injuries, Attendance)
**So that** I can focus on specific types of updates

**Acceptance Criteria:**
- [ ] Filter buttons/chips above insights list
- [ ] Options: "All", "Skills", "Injuries", "Attendance"
- [ ] Default: "All" (show everything)
- [ ] Selecting filter updates visible insights
- [ ] Filter state persists in URL query params
- [ ] Count badge on each filter showing number of insights
- [ ] Selected filter has active state (colored background)
- [ ] Filter works with search (combine both filters)
- [ ] Type check passes
- [ ] Visual verification: Filters work correctly with search

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/applied-insights-section.tsx`

**Technical Notes:**
```typescript
import { useSearchParams } from "next/navigation";

const [searchParams, setSearchParams] = useSearchParams();
const categoryFilter = searchParams.get("category") || "all";

function handleFilterChange(category: string) {
  const params = new URLSearchParams(searchParams);
  if (category === "all") {
    params.delete("category");
  } else {
    params.set("category", category);
  }
  setSearchParams(params);
}
```

**Priority:** 11 (enhances usability)

---

## User Stories - Week 3: Navigation & Polish

### US-P8-012: Add "View in Passport" Links to Insight Cards

**As a** coach
**I want to** click an insight card and jump directly to the player's passport
**So that** I can see the full context of what was applied

**Acceptance Criteria:**
- [ ] Every insight card in Applied Insights section shows link
- [ ] Link text: "View in [PlayerName]'s Passport →"
- [ ] Link styled as primary color with hover underline
- [ ] Link navigates to `/orgs/[orgId]/players/[playerIdentityId]/passport`
- [ ] Deep link to specific section if possible:
  - Skill insight → Skills tab (scroll to skill if possible)
  - Injury insight → Health tab, injuries section
  - Attendance insight → Attendance tab
- [ ] Link opens in same tab (not new window)
- [ ] Link shows loading state during navigation
- [ ] Type check passes
- [ ] Visual verification: Links navigate correctly to passport sections

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/applied-insights-section.tsx`

**Technical Notes:**
```typescript
// Link with section targeting
const passportUrl = insight.type === "skill"
  ? `/orgs/${orgId}/players/${insight.playerIdentityId}/passport?tab=skills`
  : insight.type === "injury"
  ? `/orgs/${orgId}/players/${insight.playerIdentityId}/passport?tab=health#injuries`
  : `/orgs/${orgId}/players/${insight.playerIdentityId}/passport?tab=attendance`;

<Link href={passportUrl} className="text-primary hover:underline text-sm">
  View in {insight.playerName}'s Passport →
</Link>
```

**Priority:** 12 (addresses core navigation gap)

---

### US-P8-013: Add Source Badge to Skill Assessments in Passport

**As a** coach viewing a player passport
**I want to** see when a skill assessment came from a voice note
**So that** I can review the original context if needed

**Acceptance Criteria:**
- [ ] When viewing skill assessment with `source: "voice_note"`
- [ ] Show small badge: "From voice note (Jan 26)"
- [ ] Badge positioned below skill value, subtle gray color
- [ ] Badge clickable to navigate to voice note detail
- [ ] Badge includes small icon: `<Mic>` from lucide-react
- [ ] Badge NOT shown for manual assessments (source: "manual")
- [ ] Type check passes
- [ ] Visual verification: Badge appears for voice note skills, clickable

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/skill-assessment-display.tsx`

**Technical Notes:**
```typescript
{assessment.source === "voice_note" && assessment.voiceNoteId && (
  <Link
    href={`/orgs/${orgId}/coach/voice-notes?noteId=${assessment.voiceNoteId}`}
    className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mt-1"
  >
    <Mic className="h-3 w-3" />
    From voice note ({format(assessment.createdAt, "MMM d")})
  </Link>
)}
```

**Priority:** 13 (completes bi-directional navigation)

---

### US-P8-014: Add Source Badge to Injury Records in Passport

**As a** coach viewing a player passport
**I want to** see when an injury record came from a voice note
**So that** I can review the original context if needed

**Acceptance Criteria:**
- [ ] When viewing injury record with `source: "voice_note"`
- [ ] Show small badge: "From voice note (Jan 26)"
- [ ] Badge positioned below injury description
- [ ] Badge clickable to navigate to voice note detail
- [ ] Badge includes small icon: `<Mic>` from lucide-react
- [ ] Badge NOT shown for manual injury entries
- [ ] Type check passes
- [ ] Visual verification: Badge appears for voice note injuries, clickable

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/injury-record-display.tsx`

**Technical Notes:**
```typescript
{injury.source === "voice_note" && injury.voiceNoteId && (
  <Link
    href={`/orgs/${orgId}/coach/voice-notes?noteId=${injury.voiceNoteId}`}
    className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mt-2"
  >
    <Mic className="h-3 w-3" />
    From voice note ({format(injury.recordedAt, "MMM d")})
  </Link>
)}
```

**Priority:** 14 (completes bi-directional navigation)

---

### US-P8-015: Add Voice Note Deep Linking from Passport

**As a** coach
**I want to** click a source badge and see the specific insight highlighted
**So that** I can quickly find the relevant part of the voice note

**Acceptance Criteria:**
- [ ] Voice notes page accepts `noteId` query param
- [ ] When `noteId` present, scroll to that note in History tab
- [ ] Highlight the note card with subtle animation (fade border pulse)
- [ ] Expand the note detail if collapsed
- [ ] If insight ID also provided, highlight specific insight within note
- [ ] URL format: `/coach/voice-notes?noteId=X&insightId=Y`
- [ ] Type check passes
- [ ] Visual verification: Deep linking works, highlight visible

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/history-tab.tsx`

**Technical Notes:**
```typescript
// In voice-notes-dashboard.tsx
const searchParams = useSearchParams();
const noteId = searchParams.get("noteId");

useEffect(() => {
  if (noteId) {
    // Switch to History tab
    setActiveTab("history");
    // Scroll to note (handled in history-tab)
  }
}, [noteId]);

// In history-tab.tsx
useEffect(() => {
  if (noteId) {
    const element = document.getElementById(`note-${noteId}`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.classList.add("ring-2", "ring-primary", "ring-offset-2");
    setTimeout(() => {
      element?.classList.remove("ring-2", "ring-primary", "ring-offset-2");
    }, 2000);
  }
}, [noteId]);
```

**Priority:** 15 (enhances navigation UX)

---

### US-P8-016: Add Least Engaged Parents Section to My Impact

**As a** coach
**I want to** see which parents are not viewing summaries
**So that** I can follow up with them personally

**Acceptance Criteria:**
- [ ] Add "Parent Engagement" section to My Impact tab
- [ ] Section shows parents with lowest view rate
- [ ] Display format:
  - Parent name (guardian name if available, else "Parent of [Player]")
  - Player name
  - Summaries sent count
  - View rate percentage
  - Last viewed timestamp (or "Never viewed")
- [ ] List shows bottom 5 least engaged parents
- [ ] Red/warning color if view rate < 30%
- [ ] Yellow/caution color if view rate 30-60%
- [ ] Green if view rate > 60%
- [ ] Empty state if all parents engaged or no summaries sent
- [ ] Type check passes
- [ ] Visual verification: Shows least engaged parents with color coding

**Files to Modify:**
- `packages/backend/convex/models/voiceNotes.ts` (extend getCoachImpactSummary to include parent engagement)
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx` (add section)

**Technical Notes:**
```typescript
// Add to getCoachImpactSummary return type
parentEngagement: v.array(v.object({
  guardianId: v.optional(v.string()),
  guardianName: v.optional(v.string()),
  playerName: v.string(),
  playerIdentityId: v.id("playerIdentities"),
  summariesSent: v.number(),
  summariesViewed: v.number(),
  viewRate: v.number(), // percentage
  lastViewedAt: v.optional(v.number()),
}))

// Sort by viewRate ascending, take bottom 5
const leastEngaged = parentEngagement
  .filter(p => p.summariesSent > 0)
  .sort((a, b) => a.viewRate - b.viewRate)
  .slice(0, 5);
```

**Priority:** 16 (addresses user-requested feature)

---

### US-P8-017: Add Engagement Trends Chart to My Impact

**As a** coach
**I want to** see trends in parent engagement over time
**So that** I can understand if my communication is improving

**Acceptance Criteria:**
- [ ] Add "Engagement Trends" chart below parent engagement section
- [ ] Chart shows last 4 weeks of data
- [ ] Two lines plotted:
  1. Summaries sent (blue line)
  2. Summaries viewed (green line)
- [ ] X-axis: Week labels ("Week 1", "Week 2", etc.)
- [ ] Y-axis: Count
- [ ] Hover tooltip shows exact values
- [ ] Chart responsive: shrinks on mobile, full width on desktop
- [ ] Use recharts library (already in project)
- [ ] Empty state if insufficient data (< 2 weeks)
- [ ] Type check passes
- [ ] Visual verification: Chart renders correctly, responsive

**Files to Modify:**
- `packages/backend/convex/models/voiceNotes.ts` (extend getCoachImpactSummary to include weekly trends)
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx` (add chart)

**Technical Notes:**
```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Data format
const trendData = [
  { week: "Week 1", sent: 5, viewed: 4 },
  { week: "Week 2", sent: 8, viewed: 6 },
  { week: "Week 3", sent: 6, viewed: 5 },
  { week: "Week 4", sent: 10, viewed: 9 },
];

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={trendData}>
    <XAxis dataKey="week" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="sent" stroke="#3b82f6" name="Sent" />
    <Line type="monotone" dataKey="viewed" stroke="#10b981" name="Viewed" />
  </LineChart>
</ResponsiveContainer>
```

**Priority:** 17 (enhances analytics)

---

### US-P8-018: Add Export Impact Report Button

**As a** coach
**I want to** export my impact summary as a PDF or CSV
**So that** I can share it with club management or keep records

**Acceptance Criteria:**
- [ ] "Export Report" button in My Impact tab header
- [ ] Button shows dropdown: "PDF" or "CSV"
- [ ] Selecting PDF:
  - Generates PDF with summary cards, sent summaries, applied insights
  - PDF includes date range and coach name
  - PDF downloads to user's device
  - File name: `impact-report-[coach-name]-[date].pdf`
- [ ] Selecting CSV:
  - Generates CSV with applied insights data
  - Columns: Date, Player, Type, Description, Status
  - CSV downloads to user's device
  - File name: `applied-insights-[coach-name]-[date].csv`
- [ ] Loading state during generation
- [ ] Toast notification on success
- [ ] Type check passes
- [ ] Visual verification: Export works, files valid

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx`

**Technical Notes:**
```typescript
// For CSV export (simple)
function exportCSV(insights: AppliedInsight[]) {
  const csv = [
    ["Date", "Player", "Type", "Description", "Status"],
    ...insights.map(i => [
      format(i.appliedAt, "yyyy-MM-dd"),
      i.playerName,
      i.type,
      i.description,
      "Applied"
    ])
  ].map(row => row.join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `applied-insights-${coachName}-${format(Date.now(), "yyyy-MM-dd")}.csv`;
  a.click();
}

// For PDF export, use jsPDF library (need to install)
// OR skip PDF for MVP, focus on CSV only
```

**Priority:** 18 (nice-to-have, lower priority)

---

### US-P8-019: Add Comparison with Previous Period

**As a** coach
**I want to** see how my current period compares to the previous one
**So that** I can understand if I'm improving

**Acceptance Criteria:**
- [ ] Summary cards show comparison with previous period
- [ ] Display format: "+3 vs last month" or "-2 vs last week"
- [ ] Green text/icon for improvements (↑)
- [ ] Red text/icon for decreases (↓)
- [ ] Gray if no change (=)
- [ ] Comparison based on current date range filter:
  - "This Week" → compare with previous 7 days
  - "This Month" → compare with previous 30 days
  - "All Time" → no comparison shown
- [ ] Comparison hidden if insufficient historical data
- [ ] Type check passes
- [ ] Visual verification: Comparisons show correctly with color coding

**Files to Modify:**
- `packages/backend/convex/models/voiceNotes.ts` (extend getCoachImpactSummary to include previous period data)
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/impact-summary-cards.tsx`

**Technical Notes:**
```typescript
interface StatCardProps {
  // ... existing
  previousValue?: number;
  comparisonLabel?: string; // "vs last month"
}

function getComparisonDisplay(current: number, previous: number) {
  const diff = current - previous;
  if (diff === 0) return { text: "No change", color: "text-gray-500", icon: "=" };
  if (diff > 0) return { text: `+${diff}`, color: "text-green-600", icon: "↑" };
  return { text: `${diff}`, color: "text-red-600", icon: "↓" };
}
```

**Priority:** 19 (enhances analytics)

---

### US-P8-020: Add Loading Skeleton to My Impact Tab

**As a** user
**I want to** see a loading skeleton while data fetches
**So that** the page doesn't appear broken or empty

**Acceptance Criteria:**
- [ ] Loading skeleton shows while `getCoachImpactSummary` query pending
- [ ] Skeleton mimics actual layout:
  - 4 card skeletons for summary cards
  - 3 list item skeletons for sent summaries
  - 3 list item skeletons for applied insights
  - 2 list item skeletons for team observations
- [ ] Skeleton uses shadcn Skeleton component
- [ ] Skeleton has subtle pulse animation
- [ ] Skeleton replaced by real data when query completes
- [ ] Type check passes
- [ ] Visual verification: Skeleton shows on initial load, smooth transition to data

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx`

**Technical Notes:**
```typescript
import { Skeleton } from "@/components/ui/skeleton";

if (isLoading) {
  return (
    <div className="space-y-6">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-12 w-12 rounded-full mb-2" />
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Sections skeleton... */}
    </div>
  );
}
```

**Priority:** 20 (UX polish)

---

## Testing Guide - Phase 8

### Setup for Testing

**Prerequisites:**
- Dev server running on port 3000
- Test user with coach role in an organization
- Multiple voice notes created with insights
- Some insights applied to player profiles
- Some parent summaries sent
- Test data at different trust levels (Level 0, Level 1, Level 2)

**Test Accounts:**
- Coach Level 0: `coach-l0@test.com` / `test123`
- Coach Level 1: `coach-l1@test.com` / `test123`
- Coach Level 2: `coach-l2@test.com` / `test123`
- Platform Staff: `neil.B@blablablak.com` / `lien1979`

### Test Cases - Week 1

#### TC-P8-001: Backend Query - getCoachImpactSummary

**Prerequisites:** Coach has created voice notes with insights

**Test Steps:**
1. Open Convex dashboard
2. Navigate to Functions → voiceNotes → getCoachImpactSummary
3. Execute query with test coachId, orgId, dateRange
4. Verify response contains all required fields:
   - [ ] voiceNotesCreated (number)
   - [ ] insightsApplied (number)
   - [ ] summariesSent (number)
   - [ ] parentViewRate (percentage)
   - [ ] skillChanges (array)
   - [ ] injuriesRecorded (array)
   - [ ] recentSummaries (array)
   - [ ] teamObservations (array)
5. Verify counts match expected values
6. Change dateRange to "week" and verify counts decrease
7. Test with coach who has no data → verify returns zeros

**Expected Result:**
- ✅ Query returns valid data structure
- ✅ Counts accurate based on date range
- ✅ No errors in Convex logs
- ✅ Query executes in < 500ms

---

#### TC-P8-002: Remove Trust Level Gate

**Prerequisites:** Test accounts at different trust levels

**Test Steps:**
1. Login as Level 0 coach
2. Navigate to `/orgs/[orgId]/coach/voice-notes`
3. Verify "Sent to Parents" tab is VISIBLE
4. Click tab → verify summaries displayed
5. Logout and login as Level 1 coach
6. Repeat steps 2-4 → verify tab visible
7. Login as Level 2 coach
8. Verify tab still visible (regression test)

**Expected Result:**
- ✅ "Sent to Parents" tab visible for ALL coaches (L0, L1, L2)
- ✅ Tab shows sent summaries for each level
- ✅ No "Available at Level 2+" message shown
- ✅ Existing functionality preserved (search, filter work)

---

#### TC-P8-003: My Impact Tab Structure

**Prerequisites:** Query implemented, tab added to navigation

**Test Steps:**
1. Login as coach
2. Navigate to voice notes dashboard
3. Verify "My Impact" tab visible
4. Click tab → verify page loads without errors
5. Verify loading state shows spinner
6. Wait for data to load
7. Verify empty states shown if no data
8. Verify date range picker visible
9. Change date range → verify query re-executes
10. Check browser console for errors

**Expected Result:**
- ✅ Tab visible in navigation
- ✅ Tab loads without console errors
- ✅ Loading state displays
- ✅ Date range picker functional
- ✅ Empty states show when appropriate

---

### Test Cases - Week 2

#### TC-P8-004: Impact Summary Cards

**Prerequisites:** Coach has activity data

**Test Steps:**
1. Navigate to My Impact tab
2. Verify 4 summary cards display:
   - [ ] Voice Notes Created (with count)
   - [ ] Insights Applied (with count)
   - [ ] Summaries Sent (with count)
   - [ ] Parent View Rate (with percentage)
3. Verify each card has icon and colored background
4. Verify cards responsive:
   - Mobile (375px): 1 column
   - Tablet (768px): 2 columns
   - Desktop (1920px): 4 columns
5. Change date range to "This Week"
6. Verify counts update correctly
7. Verify percentages calculated correctly

**Expected Result:**
- ✅ 4 cards display with correct data
- ✅ Icons and colors match design
- ✅ Responsive layout works
- ✅ Real-time updates when filter changes

---

#### TC-P8-005: Sent Summaries Section

**Prerequisites:** Coach has sent parent summaries

**Test Steps:**
1. Navigate to My Impact tab
2. Scroll to "Sent to Parents" section
3. Verify section header shows count badge
4. Verify most recent 10 summaries listed
5. For each summary, verify displays:
   - [ ] Player name with avatar
   - [ ] Sport icon
   - [ ] Summary preview (truncated)
   - [ ] Sent timestamp
   - [ ] View status badge (green if viewed, gray if not)
   - [ ] Acknowledge status badge
6. Click summary card → verify expands to show full text
7. Click "View All" → verify navigates to "Sent to Parents" tab
8. Test with no summaries → verify empty state

**Expected Result:**
- ✅ Summaries display correctly
- ✅ Engagement badges accurate
- ✅ Click interactions work
- ✅ Empty state shows when appropriate

---

#### TC-P8-006: Applied Insights Section

**Prerequisites:** Coach has applied insights

**Test Steps:**
1. Navigate to My Impact tab
2. Scroll to "Applied to Player Profiles" section
3. Verify insights grouped by category:
   - [ ] Skills (green icon)
   - [ ] Injuries (red icon)
   - [ ] Attendance (blue icon)
4. Expand each category
5. Verify each insight shows:
   - [ ] Player name with avatar
   - [ ] Change description (e.g., "Tackling: 3 → 4")
   - [ ] Category badge
   - [ ] Applied timestamp
   - [ ] Source voice note title
6. Verify most recent 20 insights shown
7. Click "View All" → verify expands full list
8. Test with no insights → verify empty state

**Expected Result:**
- ✅ Insights grouped correctly
- ✅ Category icons and colors accurate
- ✅ Change descriptions formatted properly
- ✅ Timestamps display correctly
- ✅ Empty state works

---

#### TC-P8-007: Date Range Filtering

**Prerequisites:** Coach has data across multiple weeks

**Test Steps:**
1. Navigate to My Impact tab
2. Verify default date range is "This Month"
3. Verify current range displayed: "Showing: Jan 1-27, 2026"
4. Change to "This Week"
5. Verify all sections update:
   - [ ] Summary cards show week data
   - [ ] Sent summaries filtered to week
   - [ ] Applied insights filtered to week
6. Change to "All Time"
7. Verify all data shown
8. Close and reopen tab
9. Verify date range persisted (localStorage)

**Expected Result:**
- ✅ Date range filter works across all sections
- ✅ Date display accurate
- ✅ Preference persists between sessions
- ✅ No console errors

---

#### TC-P8-008: Search Applied Insights

**Prerequisites:** Coach has many applied insights

**Test Steps:**
1. Navigate to My Impact tab
2. Scroll to Applied Insights section
3. Verify search input visible
4. Type player name (e.g., "Emma")
5. Verify insights filtered in real-time
6. Verify category grouping preserved
7. Type skill name (e.g., "Tackling")
8. Verify filters to matching insights
9. Clear search
10. Verify all insights return
11. Test search with no matches
12. Verify empty state: "No insights matching 'xyz'"

**Expected Result:**
- ✅ Search filters instantly (debounced)
- ✅ Category grouping preserved
- ✅ Clear button works
- ✅ Empty state shows for no matches

---

#### TC-P8-009: Category Filters

**Prerequisites:** Coach has insights in multiple categories

**Test Steps:**
1. Navigate to Applied Insights section
2. Verify filter buttons: "All", "Skills", "Injuries", "Attendance"
3. Verify count badges on each filter
4. Click "Skills"
5. Verify only skill insights shown
6. Verify URL updates: `?category=skills`
7. Click "Injuries"
8. Verify only injury insights shown
9. Use search + filter together
10. Verify both filters apply
11. Navigate away and back
12. Verify filter persisted from URL

**Expected Result:**
- ✅ Filters work correctly
- ✅ Count badges accurate
- ✅ URL persistence works
- ✅ Filters combine with search

---

### Test Cases - Week 3

#### TC-P8-010: View in Passport Links

**Prerequisites:** Insights applied to player profiles

**Test Steps:**
1. Navigate to Applied Insights section
2. For each insight card, verify link: "View in [Player]'s Passport →"
3. Click skill insight link
4. Verify navigates to player passport
5. Verify lands on Skills tab
6. Click injury insight link
7. Verify lands on Health tab, injuries section
8. Click attendance insight link
9. Verify lands on Attendance tab
10. Verify navigation happens in same tab (not new window)

**Expected Result:**
- ✅ Links present on all insights
- ✅ Navigation correct for each type
- ✅ Deep linking to tabs works
- ✅ Same tab navigation

---

#### TC-P8-011: Source Badges on Skills

**Prerequisites:** Player has skills from voice notes

**Test Steps:**
1. Navigate to player passport
2. Go to Skills tab
3. Identify skill with source="voice_note"
4. Verify badge shows: "From voice note (Jan 26)"
5. Verify badge has mic icon
6. Click badge
7. Verify navigates to voice notes dashboard
8. Verify voice note highlighted in History tab
9. Test skill with source="manual"
10. Verify NO badge shown

**Expected Result:**
- ✅ Badge shows for voice note skills
- ✅ Badge clickable and navigates correctly
- ✅ No badge for manual skills
- ✅ Icon and formatting correct

---

#### TC-P8-012: Source Badges on Injuries

**Prerequisites:** Player has injuries from voice notes

**Test Steps:**
1. Navigate to player passport
2. Go to Health tab
3. Scroll to Injuries section
4. Identify injury with source="voice_note"
5. Verify badge shows: "From voice note (Jan 26)"
6. Verify badge has mic icon
7. Click badge
8. Verify navigates to voice notes with note highlighted
9. Test injury with source="manual"
10. Verify NO badge shown

**Expected Result:**
- ✅ Badge shows for voice note injuries
- ✅ Badge clickable and navigates correctly
- ✅ No badge for manual injuries
- ✅ Deep linking works

---

#### TC-P8-013: Voice Note Deep Linking

**Prerequisites:** Multiple voice notes exist

**Test Steps:**
1. From player passport, click voice note source badge
2. Verify lands on voice notes dashboard
3. Verify History tab selected
4. Verify specific note scrolled into view
5. Verify note highlighted with border pulse animation
6. Wait 2 seconds
7. Verify highlight fades away
8. Verify note detail expanded
9. Test URL manually: `/coach/voice-notes?noteId=XXX`
10. Verify same behavior

**Expected Result:**
- ✅ Deep linking works from badges
- ✅ Note scrolls into view
- ✅ Highlight animation shows
- ✅ Note auto-expands
- ✅ URL direct access works

---

#### TC-P8-014: Least Engaged Parents

**Prerequisites:** Multiple parents with varying engagement

**Test Steps:**
1. Navigate to My Impact tab
2. Scroll to "Parent Engagement" section
3. Verify shows bottom 5 least engaged parents
4. For each parent, verify displays:
   - [ ] Parent/guardian name
   - [ ] Player name
   - [ ] Summaries sent count
   - [ ] View rate percentage
   - [ ] Last viewed timestamp (or "Never viewed")
5. Verify color coding:
   - [ ] Red if view rate < 30%
   - [ ] Yellow if view rate 30-60%
   - [ ] Green if view rate > 60%
6. Test with all parents engaged
7. Verify empty state or "All parents engaged" message

**Expected Result:**
- ✅ Shows 5 least engaged parents
- ✅ Data accurate
- ✅ Color coding correct
- ✅ Empty state when appropriate

---

#### TC-P8-015: Engagement Trends Chart

**Prerequisites:** 4+ weeks of data

**Test Steps:**
1. Navigate to My Impact tab
2. Scroll to "Engagement Trends" chart
3. Verify chart displays last 4 weeks
4. Verify two lines shown:
   - [ ] Blue line: Summaries sent
   - [ ] Green line: Summaries viewed
5. Hover over data points
6. Verify tooltip shows exact values
7. Test on mobile (375px width)
8. Verify chart responsive
9. Test with < 2 weeks data
10. Verify empty state: "Insufficient data for trends"

**Expected Result:**
- ✅ Chart renders correctly
- ✅ Lines show accurate data
- ✅ Tooltips work
- ✅ Responsive on mobile
- ✅ Empty state for insufficient data

---

#### TC-P8-016: Export Impact Report

**Prerequisites:** Coach has impact data

**Test Steps:**
1. Navigate to My Impact tab
2. Click "Export Report" button
3. Select "CSV" from dropdown
4. Verify loading state shows
5. Verify CSV file downloads
6. Open CSV file
7. Verify contains:
   - [ ] Header row: Date, Player, Type, Description, Status
   - [ ] Data rows with applied insights
   - [ ] Correct filename: `applied-insights-[coach]-[date].csv`
8. Test "PDF" export (if implemented)
9. Verify PDF contains summary cards, sent summaries, applied insights

**Expected Result:**
- ✅ Export works without errors
- ✅ CSV format correct
- ✅ Data accurate
- ✅ Filename includes coach and date
- ✅ Toast notification on success

---

#### TC-P8-017: Comparison with Previous Period

**Prerequisites:** Data across multiple periods

**Test Steps:**
1. Navigate to My Impact tab
2. Select date range: "This Month"
3. Verify summary cards show comparison:
   - [ ] "+3 vs last month" (green with ↑)
   - [ ] "-2 vs last month" (red with ↓)
   - [ ] "No change" (gray with =)
4. Change to "This Week"
5. Verify comparison updates to "vs last week"
6. Change to "All Time"
7. Verify no comparison shown
8. Test with insufficient historical data
9. Verify comparison hidden

**Expected Result:**
- ✅ Comparisons show correctly
- ✅ Color coding accurate (green up, red down)
- ✅ Hidden when inappropriate
- ✅ Updates with date range

---

#### TC-P8-018: Loading Skeleton

**Prerequisites:** Slow network or large data set

**Test Steps:**
1. Navigate to My Impact tab
2. Throttle network to "Slow 3G" in dev tools
3. Reload page
4. Verify loading skeleton shows:
   - [ ] 4 card skeletons
   - [ ] List skeletons for each section
5. Verify skeleton has pulse animation
6. Wait for data to load
7. Verify smooth transition from skeleton to real data
8. Verify no layout shift

**Expected Result:**
- ✅ Skeleton shows during loading
- ✅ Pulse animation visible
- ✅ Smooth transition to data
- ✅ No layout shift (skeleton matches final layout)

---

### Regression Testing

After all stories complete, verify:

#### RT-P8-001: Existing Features Unaffected
- [ ] Voice note recording still works
- [ ] Insights tab functionality preserved
- [ ] Parents tab functionality preserved
- [ ] Team tab functionality preserved
- [ ] Settings tab functionality preserved
- [ ] Trust level progression still works
- [ ] Auto-apply at Level 2+ still works

#### RT-P8-002: Performance
- [ ] My Impact tab loads in < 2 seconds
- [ ] No N+1 queries (check Convex dashboard)
- [ ] Real-time updates work (test with 2 browser windows)
- [ ] No memory leaks (Chrome DevTools Memory profiler)

#### RT-P8-003: Mobile Experience
- [ ] All sections work on mobile (375px width)
- [ ] Touch targets adequate (min 44px)
- [ ] No horizontal scroll
- [ ] Responsive grid layouts work
- [ ] Charts responsive

#### RT-P8-004: Error Handling
- [ ] Graceful error if query fails
- [ ] Empty states show correctly
- [ ] Loading states work
- [ ] No console errors

---

## Success Metrics

### User Experience Goals
- ✅ 100% of coaches can see sent summary history (up from ~30% Level 2+ only)
- ✅ Time to find sent summary: < 10 seconds (down from N/A)
- ✅ Coach confidence in system: 4.5/5 survey rating
- ✅ Support tickets about "where did it go": -80%

### Technical Goals
- ✅ Type check passes: `npm run check-types`
- ✅ Lint passes: `npx ultracite fix && npm run check`
- ✅ No console errors
- ✅ Real-time updates work (Convex subscriptions)
- ✅ Page load < 2 seconds

### Completion Checklist

**Week 1:**
- [ ] US-P8-001: getCoachImpactSummary query complete
- [ ] US-P8-002: Trust level gate removed
- [ ] US-P8-003: My Impact tab structure created
- [ ] US-P8-004: Tab added to navigation
- [ ] All Week 1 test cases pass

**Week 2:**
- [ ] US-P8-005: Summary cards component
- [ ] US-P8-006: Sent summaries section
- [ ] US-P8-007: Applied insights section
- [ ] US-P8-008: Date range filtering
- [ ] US-P8-009: Team observations section
- [ ] US-P8-010: Search applied insights
- [ ] US-P8-011: Category filters
- [ ] All Week 2 test cases pass

**Week 3:**
- [ ] US-P8-012: View in Passport links
- [ ] US-P8-013: Source badges on skills
- [ ] US-P8-014: Source badges on injuries
- [ ] US-P8-015: Voice note deep linking
- [ ] US-P8-016: Least engaged parents
- [ ] US-P8-017: Engagement trends chart
- [ ] US-P8-018: Export report
- [ ] US-P8-019: Comparison with previous period
- [ ] US-P8-020: Loading skeleton
- [ ] All Week 3 test cases pass
- [ ] All regression tests pass

---

## Known Limitations

1. **Historical Data**: Coaches who had Level 0-1 before this feature won't have historical sent summaries (data not tracked)
2. **Performance**: Coaches with 1000s of insights may need pagination (implement if needed)
3. **Export PDF**: Not implemented in MVP, CSV only (can add in future phase)
4. **Real-time Notifications**: Parent engagement updates not real-time (coach must refresh)

---

## Future Enhancements (Post-P8)

- Email digest: "Your weekly impact summary" sent to coach
- Coach leaderboard (opt-in, gamification)
- Compare with anonymous org average ("You're in top 20%")
- Coach portfolio export (professional PDF for performance reviews)
- AI insights: "Your parent view rate increased 15% this month"

---

**Document Version:** 1.0
**Created:** January 27, 2026
**Last Updated:** January 27, 2026
**Author:** Claude Sonnet 4.5
**Ready for Ralph:** Yes ✅
