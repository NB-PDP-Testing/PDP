# Phase 8 Ralph Context - Coach Impact Visibility & Traceability

**Date**: 2026-01-27
**Purpose**: Provide Ralph with complete context from P1-P7 to implement P8 successfully
**Base Branch**: `main` (will create `ralph/coach-impact-visibility-p8`)

---

## Executive Summary

Phase 8 fixes a **critical UX gap** identified in Section 20 of the Voice Notes Technical Overview:

> **"Coaches at Trust Level 0-1 have ZERO visibility into the outcomes of their work."**

**The Problem:**
- Level 0-1 coaches do MORE work (manual review) but get LESS feedback
- Cannot see sent parent summaries after approval
- Cannot track which insights were applied to player profiles
- No way to measure coaching impact
- No traceability from insights → passport → source voice notes

**The Solution:**
Create unified "My Impact" dashboard for ALL coaches showing:
- Sent parent summaries with parent engagement (view/acknowledge status)
- Applied insights with links to player profiles
- Aggregate coaching activity metrics
- Traceability: insights → player passport → source voice notes

---

## Critical Context from Previous Phases

### Phase 5: Trust Level System for Parent Summaries

**What P5 Built:**
- Trust-based progressive automation (Level 0 → 1 → 2+)
- Preview mode stats (20-item baseline)
- Auto-approval at Level 2+ with 1-hour undo window
- Confidence visualization (color-coded, progress bars)

**Key Pattern from P5:**
```typescript
// Trust Level Check Pattern
const coachTrustLevel = await ctx.db
  .query("coachTrustLevels")
  .withIndex("by_coach_org", q =>
    q.eq("coachId", userId).eq("organizationId", orgId)
  )
  .first();

const effectiveLevel = Math.min(
  coachTrustLevel?.currentLevel ?? 0,
  coachTrustLevel?.preferredLevel ?? coachTrustLevel?.currentLevel ?? 0
);
```

**P5 Trust Level Gate:**
```typescript
// In auto-approved-tab.tsx
if (coachTrustLevel < 2) {
  return <EmptyState message="Available at Trust Level 2+" />;
}
```

**❌ PROBLEM**: This gate prevents Level 0-1 coaches from seeing sent summaries!

**✅ P8 FIX**: Remove this gate - ALL coaches should see sent summaries (US-P8-002)

---

### Phase 6: Monitoring, Safety & Scale

**What P6 Built:**
- Cost control (rate limiting, budget checks)
- Circuit breakers (graceful degradation when Anthropic API fails)
- Admin dashboard for monitoring AI usage
- Graceful degradation patterns

**Key Safety Pattern from P6:**
```typescript
// Check budget BEFORE expensive operation
const budget = await checkOrgBudget(orgId);
if (budget.dailySpend >= budget.dailyLimit) {
  throw new ConvexError("Daily budget exceeded");
}
```

**Lesson for P8:** Not directly applicable (P8 is read-only queries, no AI calls), but follow same principle: **fail fast** on errors.

---

### Phase 7: Insight Auto-Apply with Trust System

**What P7 Built:**
- Auto-apply for skill insights (mirroring P5's parent summary pattern)
- Preview mode for insights with `wouldAutoApply` flag
- Per-category auto-apply preferences (skills, attendance, goals, performance)
- **NEVER** auto-apply injury/medical insights (safety-critical)
- Undo tracking with `undoReason` field

**Key Schema from P7:**
```typescript
coachTrustLevels: {
  // ... P5 fields
  insightPreviewModeStats: v.optional(v.object({
    wouldAutoApplyInsights: v.number(),
    coachAppliedThose: v.number(),
    coachDismissedThose: v.number(),
    agreementRate: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })),
  insightConfidenceThreshold: v.optional(v.number()), // default 0.7
  insightAutoApplyPreferences: v.optional(v.object({
    skills: v.boolean(),
    attendance: v.boolean(),
    goals: v.boolean(),
    performance: v.boolean(),
  })),
}

autoAppliedInsights: defineTable({
  insightId: v.string(),
  coachId: v.string(),
  playerIdentityId: v.id("playerIdentities"),
  targetRecordId: v.string(), // 🔗 Important for P8 navigation
  targetTable: v.string(),
  changeType: v.string(),
  previousValue: v.string(), // JSON snapshot
  newValue: v.string(), // JSON snapshot
  appliedAt: v.number(),
  undoneAt: v.optional(v.number()),
  undoReason: v.optional(v.string()),
})
```

**Critical Field for P8:** `autoAppliedInsights.targetRecordId`

**Why:** P8 needs this to create clickable links: "View in [Player]'s Passport"

---

## Phase 8 Architecture Overview

### Backend Queries (New)

**US-P8-001: Create getCoachImpactSummary**

This is the FOUNDATION query for the entire "My Impact" dashboard. It aggregates data from 6 tables:

```typescript
export const getCoachImpactSummary = query({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    dateRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
  },
  returns: v.object({
    // Summary metrics
    voiceNotesCreated: v.number(),
    insightsApplied: v.number(),
    insightsDismissed: v.number(),
    summariesSent: v.number(),
    summariesViewed: v.number(),
    summariesAcknowledged: v.number(),
    parentViewRate: v.number(), // (viewed / sent) * 100

    // Detailed arrays
    skillChanges: v.array(v.object({
      playerName: v.string(),
      playerIdentityId: v.id("playerIdentities"),
      description: v.string(), // "Tackling: 3 → 4"
      appliedAt: v.number(),
      voiceNoteId: v.id("voiceNotes"),
      voiceNoteTitle: v.string(),
    })),
    injuriesRecorded: v.array(v.object({
      playerName: v.string(),
      playerIdentityId: v.id("playerIdentities"),
      injuryType: v.string(),
      severity: v.string(),
      recordedAt: v.number(),
      voiceNoteId: v.id("voiceNotes"),
    })),
    recentSummaries: v.array(v.object({
      summaryId: v.id("coachParentSummaries"),
      playerName: v.string(),
      summaryPreview: v.string(), // first 100 chars
      sentAt: v.number(),
      viewedAt: v.optional(v.number()),
      acknowledgedAt: v.optional(v.number()),
    })),
    teamObservations: v.array(v.object({
      observationId: v.string(),
      teamName: v.string(),
      teamId: v.string(),
      title: v.string(),
      appliedAt: v.number(),
      voiceNoteId: v.id("voiceNotes"),
    })),

    // Parent engagement details
    parentEngagement: v.array(v.object({
      guardianId: v.optional(v.string()),
      guardianName: v.optional(v.string()),
      playerName: v.string(),
      playerIdentityId: v.id("playerIdentities"),
      summariesSent: v.number(),
      summariesViewed: v.number(),
      viewRate: v.number(), // percentage
      lastViewedAt: v.optional(v.number()),
    })),

    // Trends (for chart)
    weeklyTrends: v.array(v.object({
      week: v.string(), // "Week 1"
      sent: v.number(),
      viewed: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    // Implementation details in US-P8-001
  },
});
```

**Data Sources:**
1. `voiceNotes` - Count notes created by coach in date range
2. `voiceNoteInsights` - Count applied/dismissed insights
3. `coachParentSummaries` - Count sent/viewed/acknowledged summaries
4. `autoAppliedInsights` - Get skill changes with targetRecordId
5. `playerInjuries` - Get injuries where `source: "voice_note"`
6. `teamObservations` - Get team-level insights

**Query Strategy:**
- Use `.withIndex()` for ALL queries (NEVER `.filter()`)
- Available indexes:
  - `voiceNotes`: `by_coach_org`, `by_created`
  - `voiceNoteInsights`: `by_voice_note`, `by_status`
  - `coachParentSummaries`: `by_org_coach_status`, `by_delivered_at`
  - `autoAppliedInsights`: `by_coach_org`, `by_applied_at`
  - `playerInjuries`: `by_player_org`
- Filter by date range AFTER fetching from index (in JS)

---

### Frontend Components (New)

**Component Hierarchy:**
```
my-impact-tab.tsx (container)
├── impact-summary-cards.tsx (4 stat cards)
├── sent-summaries-section.tsx (recent summaries with engagement)
├── applied-insights-section.tsx (insights grouped by category)
└── team-observations-section.tsx (team-level insights)
```

**Component Patterns from P5/P6/P7:**

1. **Date Range Filtering:**
```typescript
const [dateRange, setDateRange] = useState<"week" | "month" | "all">(
  () => localStorage.getItem("impact-date-range") as any || "month"
);

useEffect(() => {
  localStorage.setItem("impact-date-range", dateRange);
}, [dateRange]);
```

2. **Real-Time Updates:**
```typescript
const impactData = useQuery(
  api.models.voiceNotes.getCoachImpactSummary,
  { coachId, organizationId, dateRange: getDateRangeForFilter(dateRange) }
);
// Data updates automatically via Convex subscriptions
```

3. **Loading Skeleton:**
```typescript
if (impactData === undefined) {
  return (
    <div className="space-y-4">
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
  );
}
```

4. **Empty State:**
```typescript
if (impactData.voiceNotesCreated === 0) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Mic className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No voice notes yet</h3>
      <p className="text-muted-foreground mb-4">
        Record your first voice note to see your coaching impact
      </p>
      <Button onClick={() => router.push(`/orgs/${orgId}/coach/voice-notes`)}>
        Record Voice Note
      </Button>
    </div>
  );
}
```

---

## Week-by-Week Breakdown

### Week 1: Foundation & Quick Wins (US-P8-001 to US-P8-004)

**Goal:** Get basic infrastructure in place + immediate impact fix

**User Stories:**
1. **US-P8-001**: Create `getCoachImpactSummary` backend query (CRITICAL - all UI depends on this)
2. **US-P8-002**: Remove trust level gate from "Sent to Parents" tab (IMMEDIATE IMPACT - fixes visibility gap)
3. **US-P8-003**: Create `my-impact-tab.tsx` skeleton
4. **US-P8-004**: Add "My Impact" tab to navigation

**Ralph Notes:**
- US-P8-001 is COMPLEX - query spans 6 tables. Test thoroughly.
- US-P8-002 is SIMPLE - just remove if statement. Test visually.
- US-P8-003/004 are scaffolding - placeholders for Week 2 work.

---

### Week 2: My Impact Dashboard (US-P8-005 to US-P8-011)

**Goal:** Build complete dashboard with all sections

**User Stories:**
5. **US-P8-005**: Impact summary cards (voice notes, insights, summaries, parent view rate)
6. **US-P8-006**: Sent summaries section (list with engagement badges)
7. **US-P8-007**: Applied insights section (grouped by category: skills, injuries, attendance)
8. **US-P8-008**: Date range filtering (week/month/all)
9. **US-P8-009**: Team observations section
10. **US-P8-010**: Search applied insights (by player name, skill)
11. **US-P8-011**: Category filters for insights (All, Skills, Injuries, Attendance)

**Ralph Notes:**
- Components follow same pattern: fetch data → loading skeleton → empty state → content
- Use `formatDistanceToNow` for timestamps < 7 days, `format` for older dates
- Badge colors: Green (viewed/ack), Gray (pending)

---

### Week 3: Navigation & Polish (US-P8-012 to US-P8-020)

**Goal:** Connect all pieces with navigation + add advanced features

**User Stories:**
12. **US-P8-012**: "View in Passport" links from insight cards
13. **US-P8-013**: Source badges on skills in passport ("From voice note (Jan 26)")
14. **US-P8-014**: Source badges on injuries in passport
15. **US-P8-015**: Voice note deep linking (passport → voice notes dashboard)
16. **US-P8-016**: Least engaged parents section
17. **US-P8-017**: Engagement trends chart (last 4 weeks)
18. **US-P8-018**: Export impact report (CSV, optional PDF)
19. **US-P8-019**: Comparison with previous period
20. **US-P8-020**: Loading skeleton

**Ralph Notes:**
- US-P8-012: Deep linking pattern: `/orgs/${orgId}/players/${playerId}/passport?tab=skills`
- US-P8-013/014: Modify existing components (read first to see structure)
- US-P8-015: URL params pattern: `?noteId=X&insightId=Y`, scroll + highlight
- US-P8-017: Use recharts library (already in project): `<LineChart>`, `<Line>`, etc.
- US-P8-018: CSV generation is simple (map to rows, join with commas), PDF optional

---

## Critical Patterns for Ralph

### 1. Index Usage (From P5/P6/P7)

**✅ CORRECT:**
```typescript
const summaries = await ctx.db
  .query("coachParentSummaries")
  .withIndex("by_org_coach_status", q =>
    q.eq("organizationId", orgId)
     .eq("coachId", coachId)
     .eq("status", "delivered")
  )
  .collect();
```

**❌ WRONG (Ralph sometimes does this):**
```typescript
const summaries = await ctx.db
  .query("coachParentSummaries")
  .filter(q =>
    q.eq(q.field("organizationId"), orgId) &&
    q.eq(q.field("coachId"), coachId)
  )
  .collect();
```

**Why:** `.filter()` is slow and unsupported by Convex best practices. ALWAYS use `.withIndex()`.

---

### 2. Date Range Filtering

**Pattern:**
```typescript
// 1. Fetch from index (fast)
const records = await ctx.db
  .query("tableName")
  .withIndex("by_created", q => q.gte("createdAt", dateRange.start))
  .collect();

// 2. Filter in JavaScript (after fetching)
const filtered = records.filter(r =>
  r.createdAt >= dateRange.start && r.createdAt <= dateRange.end
);
```

**Why:** Indexes support `.gte()` and `.lte()` but not both. Fetch with one bound, filter with both in JS.

---

### 3. Navigation with Deep Linking

**Pattern:**
```typescript
// Link with query params
<Link href={`/orgs/${orgId}/players/${playerId}/passport?tab=skills`}>
  View in {playerName}'s Passport →
</Link>

// In target page (passport), read params
const searchParams = useSearchParams();
const activeTab = searchParams.get("tab") || "overview";

useEffect(() => {
  if (activeTab) {
    setSelectedTab(activeTab);
  }
}, [activeTab]);
```

**Why:** URL-driven state = shareable links + back button works.

---

### 4. Source Badges (Bi-Directional Navigation)

**Pattern:**
```typescript
// In skill assessment component
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

**Why:** Creates traceability loop: insight → passport → voice note.

---

### 5. Highlight Animation (Deep Linking)

**Pattern:**
```typescript
// In voice-notes-dashboard.tsx
const searchParams = useSearchParams();
const noteId = searchParams.get("noteId");

useEffect(() => {
  if (noteId) {
    // Switch to History tab
    setActiveTab("history");

    // Scroll to note
    setTimeout(() => {
      const element = document.getElementById(`note-${noteId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-2", "ring-primary", "ring-offset-2");

        // Remove highlight after 2 seconds
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
        }, 2000);
      }
    }, 300); // Wait for tab switch
  }
}, [noteId]);
```

**Why:** Visual feedback that user arrived at right place.

---

## Common Ralph Mistakes (Watch For These)

### 1. Forgetting to Run Codegen

**Symptom:** TypeScript errors saying "Property X does not exist on type Y"

**Fix:**
```bash
npx -w packages/backend convex codegen
```

**Reminder:** Add to acceptance criteria: "Run codegen and verify types pass"

---

### 2. Using .filter() Instead of .withIndex()

**Symptom:** Query works but is slow / unsupported

**Fix:** Always check schema for available indexes, use those

---

### 3. Missing Imports

**Symptom:** "Cannot find name 'Badge'" or similar

**Fix:** Check imports at top of file, add missing ones:
```typescript
import { Badge } from "@/components/ui/badge";
import { Mic } from "lucide-react";
```

---

### 4. Not Testing Visually

**Symptom:** Code compiles but UI looks wrong

**Fix:** Always verify in browser after UI changes (add to acceptance criteria)

---

### 5. Forgetting Loading/Empty States

**Symptom:** Component shows nothing during load or with no data

**Fix:** Every component needs:
```typescript
if (data === undefined) return <LoadingSkeleton />;
if (data.length === 0) return <EmptyState />;
return <ActualContent data={data} />;
```

---

## Testing Strategy for P8

### Backend Testing (Convex Dashboard)

For US-P8-001 (`getCoachImpactSummary`):
1. Open Convex dashboard
2. Navigate to Functions → voiceNotes → getCoachImpactSummary
3. Execute with test data:
   ```json
   {
     "coachId": "user_abc123",
     "organizationId": "org_xyz789",
     "dateRange": {
       "start": 1735689600000,
       "end": 1738368000000
     }
   }
   ```
4. Verify response structure matches return type
5. Check counts are accurate
6. Change date range, verify counts decrease

### Frontend Testing (Browser)

For US-P8-002 (Remove trust level gate):
1. Login as Level 0 coach
2. Navigate to `/orgs/[orgId]/coach/voice-notes`
3. Verify "Sent to Parents" tab VISIBLE
4. Click tab → verify summaries displayed
5. Repeat with Level 1 and Level 2 coaches

For US-P8-005 to US-P8-011 (Dashboard components):
1. Navigate to "My Impact" tab
2. Verify 4 summary cards display with correct data
3. Verify sections render (sent summaries, applied insights, team observations)
4. Test date range filter (week/month/all)
5. Test search (type player name)
6. Test category filters (Skills, Injuries, etc.)
7. Verify real-time updates (open 2 browser windows, apply insight in one, see in other)

For US-P8-012 to US-P8-015 (Navigation):
1. Click "View in [Player]'s Passport" link
2. Verify lands on correct tab (skills, health, attendance)
3. Verify source badge appears: "From voice note (Jan 26)"
4. Click badge
5. Verify navigates back to voice notes dashboard
6. Verify correct note highlighted

---

## Success Criteria

**Week 1:**
- ✅ `getCoachImpactSummary` query returns valid data
- ✅ Level 0 coaches can see "Sent to Parents" tab
- ✅ "My Impact" tab appears in navigation
- ✅ No TypeScript errors
- ✅ Lint passes

**Week 2:**
- ✅ All dashboard sections render correctly
- ✅ Summary cards show accurate counts
- ✅ Date range filtering works
- ✅ Search and filters work
- ✅ Real-time updates work (Convex subscriptions)

**Week 3:**
- ✅ Navigation links work (insight → passport)
- ✅ Source badges appear and link back
- ✅ Deep linking works (highlight animation)
- ✅ Engagement trends chart renders
- ✅ Export CSV works
- ✅ All test cases pass

**Overall:**
- ✅ Type check passes: `npm run check-types`
- ✅ Lint passes: `npx ultracite fix && npm run check`
- ✅ No console errors
- ✅ Mobile responsive (375px, 768px, 1920px)
- ✅ User feedback: "I can finally see where my voice notes went!" 🎉

---

## Ralph Execution Checklist

**Before Starting:**
- [ ] Read this entire document
- [ ] Read P7_RALPH_CONTEXT.md (trust level patterns)
- [ ] Check current branch: `main`
- [ ] Run `git status` to verify clean state
- [ ] Start agents: `./scripts/ralph/agents/start-all.sh`

**During Execution:**
- [ ] Run codegen after every schema change
- [ ] Use `.withIndex()`, never `.filter()`
- [ ] Add loading/empty states to every component
- [ ] Test visually after every UI change
- [ ] Document learnings in progress.txt

**After Completion:**
- [ ] All 20 user stories marked `passes: true`
- [ ] All test cases pass
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] Visual verification complete
- [ ] Stop agents: `./scripts/ralph/agents/stop-all.sh`

---

## Key Files Reference

**Backend:**
- `packages/backend/convex/models/voiceNotes.ts` - Add `getCoachImpactSummary`
- `packages/backend/convex/models/coachParentSummaries.ts` - Existing queries for summaries

**Frontend:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx` - Main dashboard
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/auto-approved-tab.tsx` - Remove gate
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx` - NEW
- `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/skill-assessment-display.tsx` - Add source badge
- `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/injury-record-display.tsx` - Add source badge

---

**Ready for Ralph Phase 8** 🚀

All context from P1-P7 consolidated. Ralph has full understanding of:
- Trust level system (P5)
- Monitoring patterns (P6)
- Insight auto-apply (P7)
- Critical UX gap being fixed (P8)

Let's fix this visibility gap and make coaches happy! 💪

---

**Prepared by**: Claude Sonnet 4.5
**Date**: 2026-01-27
**Related Docs**:
- `scripts/ralph/P7_RALPH_CONTEXT.md` (P7 learnings)
- `scripts/ralph/prds/Coaches Voice Insights/P8_COACH_IMPACT_VISIBILITY.md` (Full PRD)
- `docs/technical/VOICE_NOTES_TECHNICAL_OVERVIEW.md` (Section 20 - Coach Visibility Gap)
