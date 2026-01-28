# P8 Week 3 - Navigation & Polish - READY TO RUN

**For**: Ralph (AI Agent)
**Phase**: P8 Week 3 - Navigation & Polish
**Date**: January 28, 2026
**Prerequisites**: Week 1 ✅, Week 1.5 ✅, Week 2 ✅
**Branch**: `ralph/coach-impact-visibility-p8-week3`

---

## 🎯 Mission: Complete Bi-Directional Navigation

**Goal**: Connect the My Impact dashboard to Player Passports with bi-directional deep linking, plus add parent engagement analytics.

### The User Problem
Coaches now have a beautiful My Impact dashboard showing:
- Applied skill insights
- Recorded injuries
- Sent parent summaries
- Team observations

**But there's a critical gap**: No easy way to navigate from insights → player passport → back to source voice note.

**Week 3 solves this with**:
1. **"View in Passport" links** on every insight card
2. **Source badges** in passport (skill assessments, injury records)
3. **Deep linking** from passport back to voice notes
4. **Parent engagement analytics** (least engaged parents, trends chart)
5. **Export capability** (CSV/PDF reports)

---

## 📋 User Stories (9 Total)

### Navigation & Deep Linking (5 stories)

**US-P8-012**: Add "View in Passport" Links to Insight Cards
- Every insight card gets a link: "View in [PlayerName]'s Passport →"
- Deep links to correct tab (Skills, Health, Attendance)
- Opens in same window with smooth navigation

**US-P8-013**: Add Source Badge to Skill Assessments in Passport
- When viewing skills in passport, show badge: "From voice note (Jan 26)"
- Badge includes mic icon, clickable to navigate to voice note
- Only shows for auto-applied skills (not manual assessments)

**US-P8-014**: Add Source Badge to Injury Records in Passport
- Same pattern as US-P8-013 but for injuries
- Badge shows below injury description
- Links to source voice note

**US-P8-015**: Add Voice Note Deep Linking from Passport
- Voice notes page accepts `?noteId=X` query param
- Auto-switches to History tab, scrolls to note, highlights it
- Expands note detail if collapsed
- 2-second highlight animation then fades

**US-P8-016**: Add Least Engaged Parents Section to My Impact
- Shows bottom 5 parents with lowest view rates
- Color coding: Red (<30%), Yellow (30-60%), Green (>60%)
- Helps coaches identify who needs follow-up

### Analytics & Export (3 stories)

**US-P8-017**: Add Engagement Trends Chart to My Impact
- Line chart showing last 4 weeks
- Two lines: Summaries sent (blue) vs Summaries viewed (green)
- Uses recharts library (already in project)
- Responsive: mobile-friendly

**US-P8-018**: Add Export Impact Report Button
- "Export Report" dropdown: PDF or CSV
- CSV exports applied insights with columns: Date, Player, Type, Description, Status
- PDF generates formatted report (optional - can defer)
- File naming: `impact-report-[coach-name]-[date].csv`

**US-P8-019**: Add Comparison with Previous Period
- Summary cards show: "+3 vs last month" or "-2 vs last week"
- Green for improvements (↑), Red for decreases (↓)
- Based on current date range filter

### Polish (1 story)

**US-P8-020**: Add Loading Skeleton to My Impact Tab
- Shows skeleton while data fetches
- Mimics layout: 4 card skeletons, 3 list item skeletons
- Uses shadcn Skeleton component with pulse animation

---

## 🏗️ Architecture Overview

### Backend Changes (2 files)

**File**: `packages/backend/convex/models/voiceNotes.ts`

**Extend `getCoachImpactSummary` query with**:
```typescript
returns: v.object({
  // Existing fields...
  voiceNotesCreated: v.number(),
  insightsApplied: v.number(),
  summariesSent: v.number(),
  parentViewRate: v.number(),

  // NEW for Week 3:
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

  weeklyTrends: v.array(v.object({
    weekLabel: v.string(), // "Week 1", "Week 2"
    weekStartDate: v.number(),
    summariesSent: v.number(),
    summariesViewed: v.number(),
  })),

  previousPeriodStats: v.optional(v.object({
    voiceNotesCreated: v.number(),
    insightsApplied: v.number(),
    summariesSent: v.number(),
    parentViewRate: v.number(),
  })),
})
```

**Implementation Notes**:
- Calculate parent engagement from `coachParentSummaries` table
- Group by guardian, calculate view rate per parent
- For weekly trends: Group summaries by week (last 4 weeks)
- For previous period: Query same range but shifted backward in time

---

### Frontend Changes (8 files)

#### 1. Applied Insights Section (US-P8-012)
**File**: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/applied-insights-section.tsx`

**Add to each insight card**:
```typescript
<Link
  href={`/orgs/${orgId}/players/${insight.playerIdentityId}/passport?tab=${getTabForInsightType(insight.type)}`}
  className="text-primary hover:underline text-sm mt-2 inline-flex items-center gap-1"
>
  View in {insight.playerName}'s Passport <ArrowRight className="h-3 w-3" />
</Link>

function getTabForInsightType(type: string): string {
  if (type === "skill") return "skills";
  if (type === "injury") return "health";
  if (type === "attendance") return "attendance";
  return "overview";
}
```

#### 2. Skill Assessment Display (US-P8-013)
**File**: `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/skill-assessment-display.tsx`

**Add source badge below skill value**:
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

**⚠️ Check First**: Does `skillAssessments` table have `source` and `voiceNoteId` fields?
- If YES: Proceed with badge
- If NO: Add to schema first, then implement

#### 3. Injury Record Display (US-P8-014)
**File**: `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/injury-record-display.tsx`

**Same pattern as skill assessments**:
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

#### 4. Voice Notes Dashboard (US-P8-015 Part 1)
**File**: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx`

**Add query param handling**:
```typescript
"use client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function VoiceNotesDashboard() {
  const [activeTab, setActiveTab] = useState("new");
  const searchParams = useSearchParams();
  const noteId = searchParams.get("noteId");

  useEffect(() => {
    if (noteId) {
      setActiveTab("history");
    }
  }, [noteId]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      {/* Pass noteId to History tab */}
      <HistoryTab noteId={noteId} />
    </Tabs>
  );
}
```

#### 5. History Tab (US-P8-015 Part 2)
**File**: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/history-tab.tsx`

**Add scroll and highlight logic**:
```typescript
interface HistoryTabProps {
  noteId?: string | null;
}

export function HistoryTab({ noteId }: HistoryTabProps) {
  const noteRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (noteId && noteRefs.current[noteId]) {
      const element = noteRefs.current[noteId];

      // Scroll to note
      element?.scrollIntoView({ behavior: "smooth", block: "center" });

      // Highlight with animation
      element?.classList.add("ring-2", "ring-primary", "ring-offset-2", "transition-all");

      // Remove highlight after 2 seconds
      setTimeout(() => {
        element?.classList.remove("ring-2", "ring-primary", "ring-offset-2");
      }, 2000);
    }
  }, [noteId]);

  return (
    <div>
      {notes.map(note => (
        <div
          key={note._id}
          ref={el => noteRefs.current[note._id] = el}
          id={`note-${note._id}`}
        >
          {/* Note content */}
        </div>
      ))}
    </div>
  );
}
```

#### 6. My Impact Tab - Parent Engagement (US-P8-016)
**File**: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx`

**Add new section**:
```typescript
<Card>
  <CardHeader>
    <CardTitle>Parent Engagement</CardTitle>
    <CardDescription>Parents who may need follow-up</CardDescription>
  </CardHeader>
  <CardContent>
    {leastEngaged.length === 0 ? (
      <p className="text-sm text-muted-foreground">All parents are engaged! 🎉</p>
    ) : (
      <div className="space-y-3">
        {leastEngaged.map(parent => (
          <div key={parent.guardianId || parent.playerIdentityId} className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium">{parent.guardianName || `Parent of ${parent.playerName}`}</p>
              <p className="text-sm text-muted-foreground">{parent.playerName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {parent.summariesSent} sent · {parent.summariesViewed} viewed
                {parent.lastViewedAt ? ` · Last viewed ${format(parent.lastViewedAt, "MMM d")}` : " · Never viewed"}
              </p>
            </div>
            <Badge className={getEngagementColor(parent.viewRate)}>
              {parent.viewRate.toFixed(0)}%
            </Badge>
          </div>
        ))}
      </div>
    )}
  </CardContent>
</Card>

function getEngagementColor(rate: number): string {
  if (rate < 30) return "bg-red-100 text-red-700 border-red-300";
  if (rate < 60) return "bg-yellow-100 text-yellow-700 border-yellow-300";
  return "bg-green-100 text-green-700 border-green-300";
}

const leastEngaged = impactData.parentEngagement
  .filter(p => p.summariesSent > 0)
  .sort((a, b) => a.viewRate - b.viewRate)
  .slice(0, 5);
```

#### 7. My Impact Tab - Trends Chart (US-P8-017)
**File**: Same file as above

**Add chart below parent engagement**:
```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

<Card>
  <CardHeader>
    <CardTitle>Engagement Trends</CardTitle>
    <CardDescription>Parent summary activity over last 4 weeks</CardDescription>
  </CardHeader>
  <CardContent>
    {impactData.weeklyTrends.length < 2 ? (
      <p className="text-sm text-muted-foreground">Not enough data yet. Keep sending summaries!</p>
    ) : (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={impactData.weeklyTrends}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="weekLabel" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="summariesSent"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Sent"
          />
          <Line
            type="monotone"
            dataKey="summariesViewed"
            stroke="#10b981"
            strokeWidth={2}
            name="Viewed"
          />
        </LineChart>
      </ResponsiveContainer>
    )}
  </CardContent>
</Card>
```

#### 8. Impact Summary Cards - Comparisons (US-P8-019)
**File**: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/impact-summary-cards.tsx`

**Add comparison to each card**:
```typescript
type ImpactSummaryCardsProps = {
  data: {
    voiceNotesCreated: number;
    insightsApplied: number;
    summariesSent: number;
    parentViewRate: number;
  };
  previousPeriod?: {
    voiceNotesCreated: number;
    insightsApplied: number;
    summariesSent: number;
    parentViewRate: number;
  };
  comparisonLabel?: string; // "vs last month"
};

function StatCard({
  label,
  value,
  icon,
  previousValue,
  comparisonLabel
}: StatCardProps) {
  const comparison = previousValue !== undefined
    ? getComparison(value, previousValue)
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {comparison && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${comparison.color}`}>
            <span>{comparison.icon}</span>
            <span>{comparison.text} {comparisonLabel}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function getComparison(current: number, previous: number) {
  const diff = current - previous;
  if (diff === 0) return { text: "No change", color: "text-gray-500", icon: "=" };
  if (diff > 0) return { text: `+${diff}`, color: "text-green-600", icon: "↑" };
  return { text: `${diff}`, color: "text-red-600", icon: "↓" };
}
```

#### 9. Export Functionality (US-P8-018)
**File**: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx`

**Add export button to header**:
```typescript
import { Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

function exportToCSV(insights: AppliedInsight[], coachName: string) {
  const headers = ["Date", "Player", "Type", "Description", "Status"];
  const rows = insights.map(i => [
    format(i.appliedAt, "yyyy-MM-dd"),
    i.playerName,
    i.type,
    i.description.replace(/,/g, ";"), // Escape commas
    "Applied"
  ]);

  const csv = [headers, ...rows]
    .map(row => row.join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `applied-insights-${coachName.replace(/\s+/g, "-")}-${format(Date.now(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// In component header
<div className="flex items-center justify-between mb-6">
  <div>
    <h2 className="text-2xl font-bold">My Impact</h2>
    <p className="text-muted-foreground">Your coaching activity and outcomes</p>
  </div>

  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export Report
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => exportToCSV(allInsights, coachName)}>
        Export as CSV
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => toast.info("PDF export coming soon!")}>
        Export as PDF (Coming Soon)
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

#### 10. Loading Skeleton (US-P8-020)
**File**: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx`

**Add at top of component**:
```typescript
import { Skeleton } from "@/components/ui/skeleton";

export function MyImpactTab() {
  const impactData = useQuery(api.models.voiceNotes.getCoachImpactSummary, { ... });

  if (impactData === undefined) {
    return (
      <div className="space-y-6">
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Section Skeletons */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render actual content...
}
```

---

## 🎓 Critical Learnings from Week 2

### 1. Type Safety is Critical ⚠️

**Issue**: Ralph used `string` for IDs instead of `Id<"tableName">` types
**Fix**: Always import and use proper Convex ID types

```typescript
// ❌ WRONG
type SkillChange = {
  playerIdentityId: string;
  voiceNoteId: string;
};

// ✅ CORRECT
import type { Id } from "@pdp/backend/convex/_generated/dataModel";

type SkillChange = {
  playerIdentityId: Id<"playerIdentities">;
  voiceNoteId: Id<"voiceNotes">;
};
```

### 2. Interface vs Type - Use Type ⚠️

**Biome Linting Rule**: Codebase uses `type`, not `interface`

```typescript
// ❌ WRONG - Fails lint
interface MyComponentProps {
  data: SomeType;
}

// ✅ CORRECT - Passes lint
type MyComponentProps = {
  data: SomeType;
};
```

### 3. Match Backend Return Types Exactly ⚠️

**Issue**: Frontend type used `appliedAt` but backend returned `recordedAt` for injuries

```typescript
// Backend returns:
{
  recordedAt: number;  // For injuries
  appliedAt: number;   // For skill changes
}

// Frontend must match exactly:
type Injury = {
  recordedAt: number;  // NOT appliedAt
};
```

**Solution**: Always read the backend query's `returns` validator before creating frontend types.

### 4. Recharts Library Already Available ✅

No need to install - just import:
```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
```

---

## 📝 Implementation Checklist

### Before You Start
- [ ] Read this entire document
- [ ] Review main PRD: `scripts/ralph/prds/Coaches Voice Insights/P8_COACH_IMPACT_VISIBILITY.md` (Week 3 section)
- [ ] Load Week 3 PRD: `scripts/ralph/prds/Coaches Voice Insights/p8-week3-navigation-polish.prd.json`
- [ ] Create new branch: `ralph/coach-impact-visibility-p8-week3`
- [ ] Verify Week 2 is merged to main (or merge first if not done)

### Story Implementation Order

**Phase 1: Backend Foundation** (30 minutes)
- [ ] US-P8-016: Extend `getCoachImpactSummary` with parent engagement
- [ ] US-P8-017: Add weekly trends to `getCoachImpactSummary`
- [ ] US-P8-019: Add previous period stats to `getCoachImpactSummary`
- [ ] Run codegen: `npx -w packages/backend convex codegen`
- [ ] Type check: `npm run check-types`

**Phase 2: Navigation Links** (1 hour)
- [ ] US-P8-012: Add "View in Passport" links to insight cards
- [ ] US-P8-013: Add source badge to skill assessments ⚠️ Check schema first
- [ ] US-P8-014: Add source badge to injury records ⚠️ Check schema first
- [ ] Type check after each story

**Phase 3: Deep Linking** (45 minutes)
- [ ] US-P8-015: Implement voice note deep linking with highlight animation
- [ ] Test: Click source badge → navigates to History tab → scrolls to note → highlights
- [ ] Type check

**Phase 4: Analytics & Export** (1.5 hours)
- [ ] US-P8-016: Add parent engagement section
- [ ] US-P8-017: Add engagement trends chart
- [ ] US-P8-019: Add comparison indicators to summary cards
- [ ] US-P8-018: Add CSV export (defer PDF for now)
- [ ] Type check

**Phase 5: Polish** (30 minutes)
- [ ] US-P8-020: Add loading skeleton
- [ ] Visual review: All sections look good
- [ ] Run linter: `npx ultracite fix`

**Phase 6: Testing & Documentation** (30 minutes)
- [ ] Create testing guide (similar to Week 2)
- [ ] Test all navigation flows manually
- [ ] Update session history
- [ ] Create checkpoint document

---

## 🧪 Testing Scenarios

### TC-W3-001: View in Passport Links
1. Go to My Impact tab
2. Scroll to Applied Insights section
3. Verify every insight card has "View in [Player]'s Passport →" link
4. Click skill insight link → verify lands on Skills tab
5. Click injury insight link → verify lands on Health tab
6. Click attendance insight link → verify lands on Attendance tab

**Expected**: All links navigate correctly to proper passport tabs

### TC-W3-002: Source Badges on Skills
1. Go to player passport
2. Navigate to Skills tab
3. Find skill with `source: "voice_note"`
4. Verify shows badge: "From voice note (date)" with mic icon
5. Click badge → verify navigates to voice notes page with noteId param

**Expected**: Badge shows for voice note skills, not manual assessments

### TC-W3-003: Deep Linking Highlight
1. From player passport, click source badge on skill assessment
2. Verify:
   - Navigates to voice notes page
   - Switches to History tab
   - Scrolls to specific note
   - Note highlighted with ring animation
   - Highlight fades after 2 seconds

**Expected**: Smooth navigation with visual feedback

### TC-W3-004: Parent Engagement Section
1. Go to My Impact tab
2. Scroll to Parent Engagement section
3. Verify shows bottom 5 least engaged parents
4. Verify color coding:
   - Red badge for <30% view rate
   - Yellow badge for 30-60%
   - Green badge for >60%
5. Verify shows: name, player, summaries sent/viewed, last viewed date

**Expected**: Accurate parent engagement data with color coding

### TC-W3-005: Engagement Trends Chart
1. Go to My Impact tab
2. Scroll to Engagement Trends chart
3. Verify shows last 4 weeks
4. Verify two lines: Sent (blue) and Viewed (green)
5. Hover over data points → verify tooltip shows exact values
6. Resize window → verify chart is responsive

**Expected**: Chart renders correctly, responsive

### TC-W3-006: Export CSV
1. Go to My Impact tab
2. Click "Export Report" button
3. Select "Export as CSV"
4. Verify CSV downloads
5. Open CSV → verify columns: Date, Player, Type, Description, Status
6. Verify filename format: `applied-insights-[coach-name]-[date].csv`

**Expected**: CSV exports with correct data and filename

### TC-W3-007: Previous Period Comparison
1. Go to My Impact tab with date range "This Month"
2. Verify summary cards show comparison: "+X vs last month"
3. Verify green color/up arrow for improvements
4. Verify red color/down arrow for decreases
5. Change date range to "All Time" → verify comparison hidden

**Expected**: Accurate comparisons with color coding

### TC-W3-008: Loading Skeleton
1. Go to My Impact tab
2. Before data loads, verify skeleton shows:
   - 4 card skeletons in grid
   - Section skeletons below
3. Verify pulse animation
4. Verify skeleton replaced by real data when loaded

**Expected**: Smooth loading experience

---

## ⚠️ Common Pitfalls to Avoid

### 1. Schema Fields May Not Exist Yet ⚠️

**Before implementing US-P8-013 and US-P8-014**, check:

```typescript
// Check if these fields exist in schema
// packages/backend/convex/schema.ts

skillAssessments: defineTable({
  // ...
  source: v.optional(v.string()), // Does this exist?
  voiceNoteId: v.optional(v.id("voiceNotes")), // Does this exist?
})

playerInjuries: defineTable({
  // ...
  source: v.optional(v.string()), // Does this exist?
  voiceNoteId: v.optional(v.id("voiceNotes")), // Does this exist?
})
```

**If fields DON'T exist**:
1. Add to schema first
2. Run codegen
3. Then implement badges

**If fields DO exist**: Proceed with implementation

### 2. Don't Guess Field Names ⚠️

Always check the actual backend query return type before creating frontend types.

**Wrong approach**:
```typescript
// Guessing field names
type Injury = {
  appliedAt: number; // ❌ Might be recordedAt
  noteId: string;     // ❌ Might be voiceNoteId
};
```

**Correct approach**:
```typescript
// Read backend query first
// packages/backend/convex/models/voiceNotes.ts
// Line XXX: Check actual return validator

// Then match exactly
type Injury = {
  recordedAt: number;  // ✅ Matches backend
  voiceNoteId: Id<"voiceNotes">; // ✅ Matches backend
};
```

### 3. Remember Responsive Design ⚠️

**Recharts must be wrapped in ResponsiveContainer**:
```typescript
// ❌ WRONG - Fixed width
<LineChart width={600} height={300} data={data}>
  ...
</LineChart>

// ✅ CORRECT - Responsive
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    ...
  </LineChart>
</ResponsiveContainer>
```

### 4. CSV Export - Escape Commas ⚠️

User data may contain commas. Escape them:

```typescript
// ❌ WRONG - Breaks CSV if description has comma
const row = [date, player, type, description, status];

// ✅ CORRECT - Escape commas
const row = [
  date,
  player,
  type,
  description.replace(/,/g, ";"), // Replace commas with semicolons
  status
];
```

### 5. Deep Linking - Clean Up Event Listeners ⚠️

```typescript
// ✅ CORRECT - Clean up setTimeout
useEffect(() => {
  let timeoutId: NodeJS.Timeout | undefined;

  if (noteId && noteRefs.current[noteId]) {
    const element = noteRefs.current[noteId];
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.classList.add("ring-2", "ring-primary", "ring-offset-2");

    timeoutId = setTimeout(() => {
      element?.classList.remove("ring-2", "ring-primary", "ring-offset-2");
    }, 2000);
  }

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
}, [noteId]);
```

---

## 🎯 Success Criteria

Week 3 is complete when:

1. **Navigation Works Bi-Directionally**
   - ✅ Can click insight → jump to passport
   - ✅ Can click passport skill/injury badge → jump to voice note
   - ✅ Deep linking highlights correct note with animation

2. **Parent Engagement Visible**
   - ✅ Shows least engaged parents with color coding
   - ✅ Shows engagement trends chart (last 4 weeks)
   - ✅ Coaches can identify who needs follow-up

3. **Export Capability**
   - ✅ Can export applied insights as CSV
   - ✅ Filename and format correct

4. **Polish Complete**
   - ✅ Previous period comparisons show on summary cards
   - ✅ Loading skeleton shows before data loads
   - ✅ All transitions smooth

5. **Quality Gates Pass**
   - ✅ Type checking passes: `npm run check-types`
   - ✅ Linting passes: `npx ultracite fix`
   - ✅ All test cases pass (manual testing)

---

## 📁 Files You'll Touch

### Backend (1 file)
- `packages/backend/convex/models/voiceNotes.ts` - Extend getCoachImpactSummary

### Frontend - Voice Notes (4 files)
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx` - Deep linking
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/history-tab.tsx` - Scroll & highlight
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/applied-insights-section.tsx` - "View in Passport" links
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx` - Parent engagement, trends, export, skeleton
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/impact-summary-cards.tsx` - Comparison indicators

### Frontend - Player Passport (2 files)
- `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/skill-assessment-display.tsx` - Source badge
- `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/injury-record-display.tsx` - Source badge

### Documentation (2 files)
- `scripts/ralph/P8_WEEK3_TESTING_GUIDE.md` - Create this
- `scripts/ralph/P8_WEEK3_CHECKPOINT.md` - Create this

---

## 🚀 Ready to Start?

1. **Load the PRD**: `scripts/ralph/prds/Coaches Voice Insights/p8-week3-navigation-polish.prd.json`
2. **Create branch**: `git checkout -b ralph/coach-impact-visibility-p8-week3`
3. **Start with backend**: Extend `getCoachImpactSummary` query
4. **Follow the order**: Backend → Navigation → Deep Linking → Analytics → Polish
5. **Test as you go**: Don't wait until the end
6. **Type check frequently**: Catch errors early

**Estimated Time**: 4-6 hours for all 9 stories

**Remember**: You've already proven you can deliver high-quality work in Week 1, 1.5, and 2. Week 3 is the final polish that ties everything together. Let's ship it! 🚀

---

**Status**: Ready to run ✅
**Blockers**: None - Week 2 complete
**Next Steps**: Load PRD, create branch, start coding
