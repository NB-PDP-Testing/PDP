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

---

## Week 1.5: Trust Gate Feature Flags Architecture

### Context: Why Week 1.5 Exists

**Problem Discovered in Week 1:**
US-P8-002 removed trust gates entirely, making "Sent to Parents" tab visible to ALL coaches regardless of trust level. The story was titled "Remove Trust Level Gate" which Ralph interpreted literally.

**What Happened:**
```typescript
// BEFORE (Week 1 - had trust gate)
if (currentLevel >= 2) {
  baseTabs.push({ id: "auto-sent", label: "Sent to Parents", icon: Send });
}

// AFTER Ralph's change (Week 1 - no gate at all)
baseTabs.push({ id: "auto-sent", label: "Sent to Parents", icon: Send });
```

**Impact**: All coaches (including Level 0-1) can now see sent summaries, defeating the trust system built in P5-P7.

**User Request**: Flexible 3-tier permission system where Platform Staff, Org Admins, and Coaches can control trust gate access.

---

### Trust Gate Permission System Architecture

#### 3-Tier Control Hierarchy

```
TIER 1: PLATFORM STAFF
├─ Enable/disable org-level trust gates (org.voiceNotesTrustGatesEnabled)
├─ Enable admin delegation (org.allowAdminDelegation)
└─ Enable coach overrides (org.allowCoachOverrides)
      ↓
TIER 2: ORG ADMINS (if delegation enabled)
├─ Set blanket override (org.adminOverrideTrustGates) - affects ALL coaches
└─ Grant individual coach overrides (coachOrgPreferences.trustGateOverride)
      ↓
TIER 3: COACHES (if overrides enabled)
├─ Request override from admins (coachOverrideRequests table)
└─ Inherit permissions from admin blanket or org default
```

#### Permission Calculation Priority

**Order** (highest priority first):
1. **Individual Coach Override** (`coachOrgPreferences.trustGateOverride === true`)
   - Returns: `{ gatesActive: false, source: 'coach_override' }`
   - Beats all other settings

2. **Admin Blanket Override** (`org.adminOverrideTrustGates !== undefined`)
   - Returns: `{ gatesActive: !org.adminOverrideTrustGates, source: 'admin_blanket' }`
   - Affects all coaches in organization

3. **Org Default** (`org.voiceNotesTrustGatesEnabled ?? true`)
   - Returns: `{ gatesActive: org.voiceNotesTrustGatesEnabled ?? true, source: 'org_default' }`
   - Fallback if no overrides set

---

### Schema Extensions for Week 1.5

#### Extend `organization` Table
```typescript
// In packages/backend/convex/schema.ts

// Master control
voiceNotesTrustGatesEnabled: v.optional(v.boolean()), // default: true (conservative)

// Delegation controls
allowAdminDelegation: v.optional(v.boolean()),  // Can admins manage gates?
allowCoachOverrides: v.optional(v.boolean()),   // Can coaches request bypass?

// Admin blanket override
adminOverrideTrustGates: v.optional(v.boolean()),  // Overrides org default for ALL
adminOverrideSetBy: v.optional(v.string()),        // Who set it
adminOverrideSetAt: v.optional(v.number()),        // When set
```

**Why `.optional()`**: Supports existing data without migration. Undefined treated as default value.

#### Extend `coachOrgPreferences` Table
```typescript
// Individual coach overrides
trustGateOverride: v.optional(v.boolean()),     // Bypass trust gates
overrideGrantedBy: v.optional(v.string()),      // Admin who granted
overrideGrantedAt: v.optional(v.number()),      // When granted
overrideReason: v.optional(v.string()),         // Why granted
overrideExpiresAt: v.optional(v.number()),      // Optional time-boxing
```

#### NEW: `orgAdminPermissions` Table
```typescript
orgAdminPermissions: defineTable({
  organizationId: v.string(),
  memberId: v.string(),
  canManageFeatureFlags: v.boolean(),
  canManageCoachOverrides: v.boolean(),
  grantedBy: v.string(),          // Platform staff who granted
  grantedAt: v.number(),
})
  .index("by_org_member", ["organizationId", "memberId"]),
```

**Purpose**: Track which admins have explicit permission to manage feature flags.

#### NEW: `coachOverrideRequests` Table
```typescript
coachOverrideRequests: defineTable({
  coachId: v.string(),
  organizationId: v.string(),
  featureType: v.string(),        // 'trust_gates' for now, extensible
  reason: v.string(),             // Coach's justification
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("denied"),
    v.literal("expired")
  ),
  requestedAt: v.number(),
  reviewedBy: v.optional(v.string()),      // Admin who reviewed
  reviewedAt: v.optional(v.number()),
  reviewNotes: v.optional(v.string()),     // Admin's notes
})
  .index("by_coach_org", ["coachId", "organizationId"])
  .index("by_org_status", ["organizationId", "status"]),
```

**Purpose**: Workflow for coaches to request and admins to approve/deny overrides.

---

### Backend Queries (Week 1.5)

#### 1. `areTrustGatesActive` - Core Permission Check
```typescript
// In packages/backend/convex/models/trustGatePermissions.ts

export const areTrustGatesActive = query({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
    gatesActive: v.boolean(),
    source: v.string(),  // 'coach_override' | 'admin_blanket' | 'org_default'
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    const coachPrefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", q =>
        q.eq("coachId", args.coachId)
         .eq("organizationId", args.organizationId)
      )
      .first();

    // PRIORITY 1: Individual override
    if (coachPrefs?.trustGateOverride === true) {
      return {
        gatesActive: false,
        source: "coach_override",
        reason: coachPrefs.overrideReason,
      };
    }

    // PRIORITY 2: Admin blanket override
    if (org?.adminOverrideTrustGates !== undefined) {
      return {
        gatesActive: !org.adminOverrideTrustGates,
        source: "admin_blanket",
      };
    }

    // PRIORITY 3: Org default
    return {
      gatesActive: org?.voiceNotesTrustGatesEnabled ?? true,
      source: "org_default",
    };
  }
});
```

**Usage Pattern**: Call this query in frontend to determine feature visibility.

#### 2. `getOrgFeatureFlagStatus` - Org Admin Dashboard
```typescript
export const getOrgFeatureFlagStatus = query({
  args: { organizationId: v.string() },
  returns: v.object({
    voiceNotesTrustGatesEnabled: v.boolean(),
    allowAdminDelegation: v.boolean(),
    allowCoachOverrides: v.boolean(),
    adminOverrideTrustGates: v.optional(v.boolean()),
    adminOverrideSetBy: v.optional(v.string()),
    adminOverrideSetAt: v.optional(v.number()),
    totalCoaches: v.number(),
    coachesWithAccess: v.number(),
    activeOverrides: v.array(v.object({
      coachId: v.string(),
      coachName: v.string(),
      trustLevel: v.number(),
      reason: v.string(),
      grantedAt: v.number(),
      grantedBy: v.string(),
      expiresAt: v.optional(v.number()),
    })),
  }),
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    
    // Get all coaches in org
    const coaches = await ctx.db
      .query("member")
      .withIndex("by_organization", q => q.eq("organizationId", args.organizationId))
      .filter(q => q.eq(q.field("functionalRoles"), "Coach"))
      .collect();

    // Get coaches with individual overrides
    const overrides = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_org", q => q.eq("organizationId", args.organizationId))
      .filter(q => q.eq(q.field("trustGateOverride"), true))
      .collect();

    // Calculate access (overrides + admin blanket + Level 2+)
    const coachesWithAccess = coaches.filter(coach => {
      const hasOverride = overrides.some(o => o.coachId === coach.userId);
      const trustLevel = getTrustLevel(coach.userId); // Implement based on your logic
      return hasOverride || org?.adminOverrideTrustGates === true || trustLevel >= 2;
    }).length;

    return {
      voiceNotesTrustGatesEnabled: org?.voiceNotesTrustGatesEnabled ?? true,
      allowAdminDelegation: org?.allowAdminDelegation ?? false,
      allowCoachOverrides: org?.allowCoachOverrides ?? false,
      adminOverrideTrustGates: org?.adminOverrideTrustGates,
      adminOverrideSetBy: org?.adminOverrideSetBy,
      adminOverrideSetAt: org?.adminOverrideSetAt,
      totalCoaches: coaches.length,
      coachesWithAccess,
      activeOverrides: overrides.map(o => ({
        coachId: o.coachId,
        coachName: getCoachName(o.coachId), // Helper function
        trustLevel: getTrustLevel(o.coachId),
        reason: o.overrideReason ?? "",
        grantedAt: o.overrideGrantedAt ?? 0,
        grantedBy: o.overrideGrantedBy ?? "",
        expiresAt: o.overrideExpiresAt,
      })),
    };
  }
});
```

#### 3. `getAllOrgsFeatureFlagStatus` - Platform Staff Overview
```typescript
export const getAllOrgsFeatureFlagStatus = query({
  args: {},
  returns: v.array(v.object({
    orgId: v.string(),
    orgName: v.string(),
    gatesEnabled: v.boolean(),
    adminOverride: v.optional(v.boolean()),
    overridesCount: v.number(),
    pendingRequestsCount: v.number(),
    lastChangedBy: v.optional(v.string()),
    lastChangedAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    // Verify platform staff
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.isPlatformStaff) {
      throw new Error("Platform staff only");
    }

    const orgs = await ctx.db.query("organization").collect();

    return Promise.all(orgs.map(async (org) => {
      const overrides = await ctx.db
        .query("coachOrgPreferences")
        .withIndex("by_org", q => q.eq("organizationId", org._id))
        .filter(q => q.eq(q.field("trustGateOverride"), true))
        .collect();

      const pendingRequests = await ctx.db
        .query("coachOverrideRequests")
        .withIndex("by_org_status", q =>
          q.eq("organizationId", org._id).eq("status", "pending")
        )
        .collect();

      return {
        orgId: org._id,
        orgName: org.name,
        gatesEnabled: org.voiceNotesTrustGatesEnabled ?? true,
        adminOverride: org.adminOverrideTrustGates,
        overridesCount: overrides.length,
        pendingRequestsCount: pendingRequests.length,
        lastChangedBy: org.adminOverrideSetBy,
        lastChangedAt: org.adminOverrideSetAt,
      };
    }));
  }
});
```

#### 4. `getCoachOverrideRequests` - Pending Requests
```typescript
export const getCoachOverrideRequests = query({
  args: {
    organizationId: v.string(),
    status: v.optional(v.string()),
  },
  returns: v.array(v.object({
    requestId: v.string(),
    coachId: v.string(),
    coachName: v.string(),
    coachTrustLevel: v.number(),
    reason: v.string(),
    requestedAt: v.number(),
    status: v.string(),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    let requestsQuery = ctx.db
      .query("coachOverrideRequests")
      .withIndex("by_org_status", q => q.eq("organizationId", args.organizationId));

    if (args.status) {
      requestsQuery = requestsQuery.filter(q => q.eq(q.field("status"), args.status));
    }

    const requests = await requestsQuery.collect();

    return Promise.all(requests.map(async (req) => {
      const coachMember = await ctx.db
        .query("member")
        .withIndex("by_org_user", q =>
          q.eq("organizationId", args.organizationId)
           .eq("userId", req.coachId)
        )
        .first();

      const trustLevel = await ctx.db
        .query("coachTrustLevels")
        .withIndex("by_coach_org", q =>
          q.eq("coachId", req.coachId)
           .eq("organizationId", args.organizationId)
        )
        .first();

      return {
        requestId: req._id,
        coachId: req.coachId,
        coachName: `${coachMember?.firstName} ${coachMember?.lastName}`,
        coachTrustLevel: trustLevel?.currentLevel ?? 0,
        reason: req.reason,
        requestedAt: req.requestedAt,
        status: req.status,
        reviewedBy: req.reviewedBy,
        reviewedAt: req.reviewedAt,
        reviewNotes: req.reviewNotes,
      };
    }));
  }
});
```

---

### Backend Mutations (Week 1.5)

#### 1. `setPlatformFeatureFlags` - Platform Staff Control
```typescript
export const setPlatformFeatureFlags = mutation({
  args: {
    organizationId: v.string(),
    allowAdminDelegation: v.optional(v.boolean()),
    allowCoachOverrides: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.isPlatformStaff) {
      throw new Error("Platform staff only");
    }

    const updates: any = {};
    if (args.allowAdminDelegation !== undefined) {
      updates.allowAdminDelegation = args.allowAdminDelegation;
    }
    if (args.allowCoachOverrides !== undefined) {
      updates.allowCoachOverrides = args.allowCoachOverrides;
    }

    await ctx.db.patch(args.organizationId, updates);
    return { success: true };
  }
});
```

#### 2. `setAdminBlanketOverride` - Admin Blanket Control
```typescript
export const setAdminBlanketOverride = mutation({
  args: {
    organizationId: v.string(),
    override: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check org membership
    const member = await ctx.db
      .query("member")
      .withIndex("by_org_user", q =>
        q.eq("organizationId", args.organizationId)
         .eq("userId", identity.subject)
      )
      .first();

    if (!member || !["admin", "owner"].includes(member.role)) {
      throw new Error("Not authorized - must be admin or owner");
    }

    // Check delegation enabled
    const org = await ctx.db.get(args.organizationId);
    if (!org?.allowAdminDelegation) {
      throw new Error("Admin delegation not enabled for this organization");
    }

    await ctx.db.patch(args.organizationId, {
      adminOverrideTrustGates: args.override,
      adminOverrideSetBy: identity.subject,
      adminOverrideSetAt: Date.now(),
    });

    return { success: true };
  }
});
```

#### 3. `grantCoachOverride` - Individual Coach Override
```typescript
export const grantCoachOverride = mutation({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    reason: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check admin permissions
    const member = await ctx.db
      .query("member")
      .withIndex("by_org_user", q =>
        q.eq("organizationId", args.organizationId)
         .eq("userId", identity.subject)
      )
      .first();

    if (!member || !["admin", "owner"].includes(member.role)) {
      throw new Error("Not authorized");
    }

    // Check overrides enabled
    const org = await ctx.db.get(args.organizationId);
    if (!org?.allowCoachOverrides) {
      throw new Error("Coach overrides not enabled");
    }

    // Find or create coachOrgPreferences
    let prefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", q =>
        q.eq("coachId", args.coachId)
         .eq("organizationId", args.organizationId)
      )
      .first();

    if (!prefs) {
      prefs = await ctx.db.insert("coachOrgPreferences", {
        coachId: args.coachId,
        organizationId: args.organizationId,
        trustGateOverride: true,
        overrideGrantedBy: identity.subject,
        overrideGrantedAt: Date.now(),
        overrideReason: args.reason,
        overrideExpiresAt: args.expiresAt,
      });
    } else {
      await ctx.db.patch(prefs._id, {
        trustGateOverride: true,
        overrideGrantedBy: identity.subject,
        overrideGrantedAt: Date.now(),
        overrideReason: args.reason,
        overrideExpiresAt: args.expiresAt,
      });
    }

    return { success: true };
  }
});
```

#### 4. `revokeCoachOverride` - Remove Individual Override
```typescript
export const revokeCoachOverride = mutation({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check admin permissions
    const member = await ctx.db
      .query("member")
      .withIndex("by_org_user", q =>
        q.eq("organizationId", args.organizationId)
         .eq("userId", identity.subject)
      )
      .first();

    if (!member || !["admin", "owner"].includes(member.role)) {
      throw new Error("Not authorized");
    }

    const prefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", q =>
        q.eq("coachId", args.coachId)
         .eq("organizationId", args.organizationId)
      )
      .first();

    if (prefs) {
      await ctx.db.patch(prefs._id, {
        trustGateOverride: false,
        overrideGrantedBy: undefined,
        overrideGrantedAt: undefined,
        overrideReason: undefined,
        overrideExpiresAt: undefined,
      });
    }

    return { success: true };
  }
});
```

#### 5. `requestCoachOverride` - Coach Request Workflow
```typescript
export const requestCoachOverride = mutation({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify coach identity
    if (identity.subject !== args.coachId) {
      throw new Error("Can only request for self");
    }

    // Check overrides enabled
    const org = await ctx.db.get(args.organizationId);
    if (!org?.allowCoachOverrides) {
      throw new Error("Coach overrides not enabled");
    }

    // Check for existing pending request
    const existing = await ctx.db
      .query("coachOverrideRequests")
      .withIndex("by_coach_org", q =>
        q.eq("coachId", args.coachId)
         .eq("organizationId", args.organizationId)
      )
      .filter(q => q.eq(q.field("status"), "pending"))
      .first();

    if (existing) {
      throw new Error("Request already pending");
    }

    const requestId = await ctx.db.insert("coachOverrideRequests", {
      coachId: args.coachId,
      organizationId: args.organizationId,
      featureType: "trust_gates",
      reason: args.reason,
      status: "pending",
      requestedAt: Date.now(),
    });

    return { success: true, requestId };
  }
});
```

#### 6. `reviewCoachOverrideRequest` - Admin Review
```typescript
export const reviewCoachOverrideRequest = mutation({
  args: {
    requestId: v.id("coachOverrideRequests"),
    approved: v.boolean(),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    // Check admin permissions
    const member = await ctx.db
      .query("member")
      .withIndex("by_org_user", q =>
        q.eq("organizationId", request.organizationId)
         .eq("userId", identity.subject)
      )
      .first();

    if (!member || !["admin", "owner"].includes(member.role)) {
      throw new Error("Not authorized");
    }

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: args.approved ? "approved" : "denied",
      reviewedBy: identity.subject,
      reviewedAt: Date.now(),
      reviewNotes: args.reviewNotes,
    });

    // If approved, grant override
    if (args.approved) {
      await ctx.runMutation(internal.models.trustGatePermissions.grantCoachOverride, {
        coachId: request.coachId,
        organizationId: request.organizationId,
        reason: request.reason,
      });
    }

    return { success: true };
  }
});
```

---

### Frontend Patterns (Week 1.5)

#### Pattern 1: Feature Flag Check in Component
```typescript
// In any component that needs to check trust gates

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo } from "react";

function MyComponent({ coachId, orgId }: Props) {
  const gateStatus = useQuery(
    api.models.trustGatePermissions.areTrustGatesActive,
    coachId && orgId ? { coachId, organizationId: orgId } : 'skip'
  );

  const trustLevel = useQuery(
    api.models.coachTrustLevels.getCoachTrustLevel,
    coachId && orgId ? { coachId, organizationId: orgId } : 'skip'
  );

  const shouldShowFeature = useMemo(() => {
    // Loading state - hide feature
    if (gateStatus === undefined) return false;

    // Gates disabled via flags - show feature
    if (!gateStatus.gatesActive) return true;

    // Gates active - check trust level
    const currentLevel = trustLevel?.currentLevel ?? 0;
    return currentLevel >= 2;
  }, [gateStatus, trustLevel]);

  if (!shouldShowFeature) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" disabled className="opacity-50">
            <Lock className="h-4 w-4 mr-2" />
            Feature Name
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {gateStatus?.source === 'org_default' && 'Available at Trust Level 2+'}
            {gateStatus?.source === 'admin_blanket' && 'Contact your administrator for access'}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <ActualFeatureContent />;
}
```

#### Pattern 2: Admin Toggle with Toast Feedback
```typescript
// In org admin settings page

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

function AdminBlanketOverrideToggle({ orgId }: Props) {
  const setBlanketOverride = useMutation(
    api.models.trustGatePermissions.setAdminBlanketOverride
  );

  const handleToggle = async (checked: boolean) => {
    try {
      await setBlanketOverride({
        organizationId: orgId,
        override: checked,
      });
      toast.success(
        checked 
          ? "All coaches now have access regardless of trust level"
          : "Trust level gates re-enabled for all coaches"
      );
    } catch (error) {
      toast.error(`Failed: ${error.message}`);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h4 className="font-medium">Override for All Coaches</h4>
        <p className="text-sm text-muted-foreground">
          When enabled, all coaches can access features regardless of trust level
        </p>
      </div>
      <Switch
        checked={status?.adminOverrideTrustGates ?? false}
        onCheckedChange={handleToggle}
      />
    </div>
  );
}
```

#### Pattern 3: Platform Staff Table with Filters
```typescript
// In /platform-admin/feature-flags/page.tsx

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function FeatureFlagsPage() {
  const orgsStatus = useQuery(api.models.trustGatePermissions.getAllOrgsFeatureFlagStatus);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'issues' | 'recent'>('all');

  const filteredOrgs = useMemo(() => {
    if (!orgsStatus) return [];

    let filtered = orgsStatus;

    // Search filter
    if (search) {
      filtered = filtered.filter(org =>
        org.orgName.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Issue filter
    if (filter === 'issues') {
      filtered = filtered.filter(org =>
        !org.gatesEnabled || org.adminOverride !== undefined || org.pendingRequestsCount > 0
      );
    }

    // Recent filter
    if (filter === 'recent') {
      filtered = filtered.sort((a, b) =>
        (b.lastChangedAt ?? 0) - (a.lastChangedAt ?? 0)
      );
    }

    return filtered;
  }, [orgsStatus, search, filter]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Show All
        </Button>
        <Button
          variant={filter === 'issues' ? 'default' : 'outline'}
          onClick={() => setFilter('issues')}
        >
          Show Issues
        </Button>
        <Button
          variant={filter === 'recent' ? 'default' : 'outline'}
          onClick={() => setFilter('recent')}
        >
          Recently Changed
        </Button>
      </div>

      <Table>
        {filteredOrgs.map(org => (
          <TableRow key={org.orgId}>
            <TableCell>{org.orgName}</TableCell>
            <TableCell>
              <Badge variant={org.gatesEnabled ? 'default' : 'destructive'}>
                {org.gatesEnabled ? 'ON' : 'OFF'}
              </Badge>
            </TableCell>
            <TableCell>
              {org.adminOverride !== undefined && (
                <Badge variant="secondary">
                  Admin Override: {org.adminOverride ? 'DISABLED' : 'ENABLED'}
                </Badge>
              )}
            </TableCell>
            <TableCell>{org.overridesCount} coaches</TableCell>
            <TableCell>
              {org.pendingRequestsCount > 0 && (
                <Badge variant="warning">{org.pendingRequestsCount} pending</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}
```

---

### Migration Strategy

#### Conservative Approach (Default: Gates ON)

**Goal**: Preserve existing behavior for all organizations unless explicitly changed.

**Implementation**:
1. All new fields are `.optional()` in schema
2. Undefined values treated as defaults:
   - `voiceNotesTrustGatesEnabled: undefined` → treated as `true` (gates ON)
   - `allowAdminDelegation: undefined` → treated as `false` (delegation OFF)
   - `allowCoachOverrides: undefined` → treated as `false` (overrides OFF)
   - `adminOverrideTrustGates: undefined` → no blanket override
   - `trustGateOverride: undefined` → no individual override

**Why Conservative**:
- Existing orgs maintain trust level system without surprise access changes
- Platform staff must explicitly enable delegation/overrides per org
- Admins must explicitly grant overrides
- Coaches cannot suddenly access features they shouldn't

**Rollout Steps**:
1. Deploy schema changes (all optional fields)
2. Deploy backend queries/mutations
3. Deploy frontend UI changes
4. Platform staff can then enable delegation for specific orgs
5. Admins in those orgs can then manage overrides

---

### Testing Strategy for Week 1.5

#### Test Scenarios for Permission Calculation

| Scenario | Individual Override | Admin Blanket | Org Default | Expected Result |
|----------|-------------------|---------------|-------------|-----------------|
| 1 | true | - | true | Gates OFF (individual wins) |
| 2 | false | true | true | Gates OFF (admin blanket) |
| 3 | false | false | true | Gates ON (admin blanket OFF) |
| 4 | undefined | true | true | Gates OFF (admin blanket) |
| 5 | undefined | undefined | true | Gates ON (org default) |
| 6 | undefined | undefined | false | Gates OFF (org default) |

**Testing Approach**:
1. Create test org in Convex dashboard
2. Run `areTrustGatesActive` query with different combinations
3. Verify priority order: Individual > Blanket > Default
4. Test with Level 0, Level 1, and Level 2+ coaches

#### UI Testing Checklist

**Platform Staff UI** (`/platform-admin/feature-flags`):
- [ ] Overview cards show correct counts
- [ ] Organization table displays all orgs
- [ ] Search filter works
- [ ] Toggle admin delegation succeeds
- [ ] Toggle coach overrides succeeds
- [ ] Real-time updates work (open two browser windows)

**Org Admin UI** (`/orgs/[orgId]/settings/features`):
- [ ] Status card shows correct current state
- [ ] Blanket override toggle hidden if delegation disabled
- [ ] Blanket override toggle works if delegation enabled
- [ ] Individual overrides table displays correctly
- [ ] Pending requests section shows pending requests
- [ ] Grant override button works
- [ ] Revoke override button works
- [ ] Approve request button works
- [ ] Deny request button works

**Voice Notes Dashboard** (US-P8-002 fix):
- [ ] Level 0 coach + gates ON → Tab hidden, locked button shows
- [ ] Level 0 coach + individual override → Tab visible
- [ ] Level 0 coach + admin blanket → Tab visible
- [ ] Level 2 coach + gates ON → Tab visible (trust level sufficient)
- [ ] Tooltip shows correct message based on `gateStatus.source`

---

### Common Mistakes to Avoid (Week 1.5)

1. **Don't use `.filter()` for table scans**
   - Always use `.withIndex()` for queries
   - Filter in JavaScript after fetching if needed

2. **Don't forget auth checks in mutations**
   - Verify `isPlatformStaff` for platform-level operations
   - Verify `member.role` includes "admin" or "owner" for admin operations
   - Verify delegation flags before allowing admin actions

3. **Don't ignore loading states**
   - Check `if (data === undefined)` before rendering
   - Show skeleton or hide feature during loading

4. **Don't hardcode priorities**
   - Follow the established order: Individual > Blanket > Default
   - Document why if deviating

5. **Don't skip toast notifications**
   - Always show user feedback for mutations
   - Use appropriate variant: success (green), error (red), warning (yellow)

6. **Don't forget conditional rendering**
   - Check `allowAdminDelegation` before showing blanket override
   - Check `allowCoachOverrides` before showing individual override UI

---

### Week 1.5 Documentation References

**MUST READ BEFORE STARTING**:
1. **`scripts/ralph/TRUST_GATE_ARCHITECTURE_V2.md`**
   - Complete architecture design
   - All schemas, queries, mutations
   - UI component designs
   - User flows (5 detailed workflows)

2. **`scripts/ralph/TRUST_GATE_MVP_VS_GROUPS.md`**
   - MVP vs Groups comparison
   - Overview dashboard designs
   - Rationale for phased approach

3. **`scripts/ralph/P8_P9_COMPREHENSIVE_REFACTORING_PLAN.md`**
   - Full impact analysis across P8 and P9
   - Migration strategy details
   - Risk assessment
   - Testing strategy with test matrix

**CONTEXT REFERENCES**:
4. `packages/backend/convex/models/coachTrustLevels.ts` - Trust level query patterns
5. `packages/backend/convex/models/coachParentSummaries.ts` - Similar aggregation patterns
6. `apps/web/src/app/platform-admin/` - Platform staff UI patterns

---

