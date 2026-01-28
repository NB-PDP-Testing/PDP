# P8 Week 2 - Ralph Context & Learnings

**For**: Ralph (AI Agent)
**Phase**: P8 Week 2 - My Impact Dashboard
**Date**: January 28, 2026
**Prerequisites**: Week 1 ✅ Complete, Week 1.5 ✅ Complete

---

## 🎯 What You're Building (Week 2)

**Goal**: Complete "My Impact" dashboard that shows coaches their coaching activity and outcomes.

**7 User Stories**:
1. US-P8-005: Impact Summary Cards (4 metric cards)
2. US-P8-006: Sent Summaries Section (parent engagement)
3. US-P8-007: Applied Insights Section (grouped by category)
4. US-P8-008: Date Range Filtering (this week, this month, all time)
5. US-P8-009: Team Observations Section
6. US-P8-010: Add Search to Applied Insights
7. US-P8-011: Add Category Filters to Applied Insights

**What's Already Done**:
- ✅ Backend query `getCoachImpactSummary` exists (US-P8-001)
- ✅ My Impact tab structure exists (`my-impact-tab.tsx`)
- ✅ Tab navigation exists (tab shows in dashboard)
- ✅ Trust gate system working (Week 1.5)
- ✅ All shadcn/ui components available
- ✅ Date utilities (date-fns) available

---

## 🎓 Critical Learnings from Week 1.5

### 1. Better Auth Integration Patterns ⚠️ CRITICAL

**NEVER use Convex queries directly for Better Auth tables.** Use the Better Auth component.

#### ❌ WRONG (DO NOT DO THIS):
```typescript
// WRONG - Direct query on Better Auth tables causes errors
const org = await ctx.db
  .query("organization")
  .withIndex("by_id", q => q.eq("_id", organizationId))
  .first();

// WRONG - Update directly
await ctx.db.patch(org._id, {
  adminBlanketBlock: true
});
```

#### ✅ CORRECT (DO THIS):
```typescript
import { components } from "../_generated/api";

// Query Better Auth tables through component
const orgs = await ctx.runQuery(components.betterAuth.adapter.findMany, {
  input: {
    model: "organization",
    where: [{ field: "_id", value: organizationId, operator: "eq" }],
  },
});
const org = orgs[0];

// Update Better Auth tables through component
await ctx.runMutation(components.betterAuth.adapter.updateOne, {
  input: {
    model: "organization",
    where: [{ field: "_id", value: organizationId, operator: "eq" }],
    update: {
      adminBlanketBlock: true,
      adminBlanketBlockSetBy: currentUser._id,
      adminBlanketBlockSetAt: Date.now(),
    },
  },
});
```

**Why?** Better Auth manages these tables with internal logic. Direct queries bypass that logic and can cause sync issues.

**Which Tables Use Better Auth Component?**
- `user` ✅ Use Better Auth component
- `organization` ✅ Use Better Auth component
- `member` ✅ Use Better Auth component
- `team` ✅ Use Better Auth component (extended in our schema)
- `invitation` ✅ Use Better Auth component

**Which Tables Use Regular Convex Queries?**
- `voiceNotes` ✅ Regular Convex queries
- `coachParentSummaries` ✅ Regular Convex queries
- `coachTrustLevels` ✅ Regular Convex queries
- `coachOrgPreferences` ✅ Regular Convex queries
- `skillAssessments` ✅ Regular Convex queries
- `playerInjuries` ✅ Regular Convex queries
- ALL other application tables ✅ Regular Convex queries

**How to Tell?**
- If the table is defined in `betterAuth/schema.ts` → Use Better Auth component
- If the table is defined in `schema.ts` → Use regular Convex queries

---

### 2. Authentication Patterns ⚠️ CRITICAL

**Getting Current User**:
```typescript
import { components } from "../_generated/api";

// Get authenticated user (throws if not logged in)
const currentUser = await ctx.runQuery(
  components.betterAuth.functions.auth.getAuthUser,
  {}
);
if (!currentUser) {
  throw new Error("Not authenticated");
}

// Use userId (Better Auth ID) for queries
const userId = currentUser.userId || currentUser._id;
```

**Checking Roles**:
```typescript
// Check if platform staff
const user = await ctx.runQuery(components.betterAuth.adapter.findMany, {
  input: {
    model: "user",
    where: [{ field: "_id", value: currentUser._id, operator: "eq" }],
  },
});
const isPlatformStaff = user[0]?.isPlatformStaff === true;

// Check if org admin
const members = await ctx.runQuery(components.betterAuth.adapter.findMany, {
  input: {
    model: "member",
    where: [
      { field: "organizationId", value: organizationId, operator: "eq" },
      { field: "userId", value: userId, operator: "eq" },
    ],
  },
});
const member = members[0];
const isAdmin = member?.role === "admin" || member?.role === "owner";
```

---

### 3. Query Patterns (Regular Convex Tables)

**Always Use Indexes** ⚠️ NEVER use `.filter()`

```typescript
// ✅ CORRECT - Use index
const notes = await ctx.db
  .query("voiceNotes")
  .withIndex("by_coach_org", (q) =>
    q.eq("coachId", coachId).eq("organizationId", organizationId)
  )
  .collect();

// ❌ WRONG - Never use filter (performance issue)
const notes = await ctx.db
  .query("voiceNotes")
  .filter((q) => q.eq(q.field("coachId"), coachId))
  .collect();
```

**Creating Indexes**:
```typescript
// In schema.ts
defineTable({
  coachId: v.string(),
  organizationId: v.string(),
  // ... other fields
})
.index("by_coach_org", ["coachId", "organizationId"])
```

**Query Syntax (New Style)**:
```typescript
export const myQuery = query({
  args: {
    coachId: v.string(),
    organizationId: v.string()
  },
  returns: v.object({
    notes: v.array(v.any()),
    count: v.number(),
  }),
  handler: async (ctx, args) => {
    // Implementation
    return { notes: [], count: 0 };
  },
});
```

---

### 4. Mutation Patterns

**Mutation Structure**:
```typescript
export const myMutation = mutation({
  args: {
    organizationId: v.string(),
    value: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // 1. Auth check
    const currentUser = await ctx.runQuery(
      components.betterAuth.functions.auth.getAuthUser,
      {}
    );
    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    // 2. Permission check
    // ... verify user can perform action

    // 3. Perform action
    await ctx.db.patch(someId, { field: args.value });

    // 4. Return result
    return {
      success: true,
      message: "Updated successfully",
    };
  },
});
```

**Error Handling**:
```typescript
// Backend: Throw descriptive errors
if (!isAdmin) {
  throw new Error("Only organization admins can perform this action");
}

// Frontend: Catch and toast
try {
  await mutation({ ... });
  toast.success("Updated successfully");
} catch (error: any) {
  toast.error(`Failed: ${error.message}`);
}
```

---

### 5. Component Patterns (Frontend)

**shadcn/ui Component Imports**:
```typescript
// Card components
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Table components
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

// Badge
import { Badge } from "@/components/ui/badge";

// Button
import { Button } from "@/components/ui/button";

// Switch
import { Switch } from "@/components/ui/switch";

// Dialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Dropdown
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Toast notifications
import { toast } from "sonner";

// Icons
import { Mic, Send, Users, Lock, ChevronDown, EyeOff } from "lucide-react";
```

**useQuery Pattern**:
```typescript
import { useQuery } from "convex/react";
import { api } from "@pdp/backend/convex/_generated/api";

const data = useQuery(
  api.models.voiceNotes.getCoachImpactSummary,
  coachId && orgId ? { coachId, organizationId: orgId } : "skip"
);

// Handle loading
if (data === undefined) {
  return <div>Loading...</div>;
}

// Handle data
return <div>{data.voiceNotesCreated} notes</div>;
```

**useMutation Pattern**:
```typescript
import { useMutation } from "convex/react";

const myMutation = useMutation(api.models.something.doSomething);

const handleClick = async () => {
  try {
    await myMutation({ organizationId: orgId, value: true });
    toast.success("Success!");
  } catch (error: any) {
    toast.error(`Failed: ${error.message}`);
  }
};
```

---

### 6. Responsive Design Patterns

**Grid Layout**:
```typescript
// 1 column mobile, 2 tablet, 4 desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Cards */}
</div>

// 1 column mobile, 3 desktop
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Sections */}
</div>
```

**Text Sizes**:
```typescript
// Mobile-first approach
<h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
  Title
</h1>

<p className="text-sm sm:text-base text-gray-600">
  Description
</p>
```

**Spacing**:
```typescript
// Gap spacing
className="space-y-4"  // Vertical spacing
className="gap-4"      // Grid/flex gap

// Padding
className="p-4 sm:p-6"  // Responsive padding
```

---

### 7. Date Formatting Patterns

**Use date-fns** (already installed):
```typescript
import { formatDistanceToNow, format } from "date-fns";

// Recent times: "2 hours ago"
{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}

// Older dates: "Jan 15, 2026"
{format(new Date(timestamp), "MMM d, yyyy")}

// Full date: "January 15, 2026 at 3:45 PM"
{format(new Date(timestamp), "MMMM d, yyyy 'at' h:mm a")}

// Conditional formatting
{timestamp < Date.now() - 7 * 24 * 60 * 60 * 1000
  ? format(new Date(timestamp), "MMM d, yyyy")
  : formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
```

---

### 8. Empty States Pattern

**Always provide helpful empty states**:
```typescript
{data.length === 0 && (
  <div className="text-center py-12 px-4">
    <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      No data yet
    </h3>
    <p className="text-sm text-gray-500 mb-4">
      Get started by recording your first voice note
    </p>
    <Button onClick={handleCreate}>
      Create Voice Note
    </Button>
  </div>
)}
```

---

### 9. Loading States Pattern

**Use Skeleton components**:
```typescript
import { Skeleton } from "@/components/ui/skeleton";

{data === undefined && (
  <div className="space-y-4">
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
)}
```

**Or simple loading message**:
```typescript
{data === undefined && (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    <span className="ml-3 text-gray-600">Loading impact data...</span>
  </div>
)}
```

---

### 10. Color & Icon Patterns (Established in Week 1.5)

**Status Badges**:
```typescript
// Success/Active
<Badge className="bg-green-100 text-green-700">✓ Active</Badge>

// Blocked/Error
<Badge variant="destructive">🚫 Blocked</Badge>

// Info/Secondary
<Badge variant="secondary">👤 Self-Off</Badge>

// Default
<Badge>No Access</Badge>
```

**Icon Colors**:
```typescript
// Skills: Green
<TrendingUp className="h-5 w-5 text-green-600" />

// Injuries: Red
<AlertCircle className="h-5 w-5 text-red-600" />

// Attendance: Blue
<Calendar className="h-5 w-5 text-blue-600" />

// Parent Communication: Purple
<Send className="h-5 w-5 text-purple-600" />

// Voice Notes: Green
<Mic className="h-5 w-5 text-green-600" />
```

**Card Colors** (for Impact Summary Cards):
```typescript
// Voice Notes: Blue
<div className="bg-blue-100 text-blue-600 p-3 rounded-full">
  <Mic className="h-6 w-6" />
</div>

// Insights Applied: Green
<div className="bg-green-100 text-green-600 p-3 rounded-full">
  <CheckCircle className="h-6 w-6" />
</div>

// Summaries Sent: Purple
<div className="bg-purple-100 text-purple-600 p-3 rounded-full">
  <Send className="h-6 w-6" />
</div>

// Parent View Rate: Amber
<div className="bg-amber-100 text-amber-600 p-3 rounded-full">
  <Eye className="h-6 w-6" />
</div>
```

---

### 11. TypeScript Patterns

**Type Imports**:
```typescript
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import type { Doc } from "@pdp/backend/convex/_generated/dataModel";
```

**Component Props**:
```typescript
interface MyComponentProps {
  orgId: BetterAuthId<"organization">;
  coachId: string;
  data: {
    voiceNotesCreated: number;
    insightsApplied: number;
  };
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function MyComponent({
  orgId,
  coachId,
  data,
  onSuccess,
  onError
}: MyComponentProps) {
  // Component implementation
}
```

---

### 12. File Organization (Established Pattern)

**Component Files**:
```
apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/
├── voice-notes-dashboard.tsx           # Main dashboard
├── my-impact-tab.tsx                   # Main impact tab container
├── impact-summary-cards.tsx            # NEW (US-P8-005)
├── sent-summaries-section.tsx          # NEW (US-P8-006)
├── applied-insights-section.tsx        # NEW (US-P8-007)
├── team-observations-section.tsx       # NEW (US-P8-009)
├── new-note-tab.tsx                    # Existing
├── parents-tab.tsx                     # Existing
├── insights-tab.tsx                    # Existing
├── auto-approved-tab.tsx               # Existing (formerly auto-sent)
└── history-tab.tsx                     # Existing
```

**Backend Files**:
```
packages/backend/convex/models/
├── voiceNotes.ts                       # Contains getCoachImpactSummary
├── coachParentSummaries.ts             # Summaries queries
├── coachTrustLevels.ts                 # Trust level queries
└── trustGatePermissions.ts             # Permission queries (Week 1.5)
```

---

### 13. What Worked Well in Week 1.5 ✅

1. **Component Composition**: Breaking features into small components
2. **Shadcn/ui Usage**: Consistent use of design system
3. **Real-time Updates**: useQuery for live data
4. **Toast Notifications**: User feedback for all actions
5. **Confirmation Dialogs**: Prevent accidental destructive actions
6. **Empty States**: Guide users when no data exists
7. **Loading States**: Show loading while data fetches
8. **Responsive Design**: Mobile-first with breakpoints
9. **TypeScript**: Strong typing prevents bugs
10. **Documentation**: Comprehensive testing guides created

---

### 14. What to Avoid ❌

1. **❌ Direct Better Auth Table Queries**: Use Better Auth component
2. **❌ Using `.filter()` in Queries**: Always use indexes
3. **❌ Missing Validators**: Always include `args` and `returns`
4. **❌ Inline Styles**: Use Tailwind classes
5. **❌ Hardcoded Strings**: Use constants for repeated text
6. **❌ Missing Error Handling**: Always try/catch mutations
7. **❌ No Loading States**: Always show loading while fetching
8. **❌ No Empty States**: Always handle empty data
9. **❌ Skipping Type Checks**: Always run `npm run check-types`
10. **❌ Skipping Linting**: Always run `npx ultracite fix`

---

## 📋 Week 2 Story-by-Story Guide

### US-P8-005: Impact Summary Cards

**What**: 4 metric cards at top of dashboard

**Component Structure**:
```typescript
// impact-summary-cards.tsx
interface SummaryCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  colorClasses: string;
}

function SummaryCard({ label, value, icon: Icon, colorClasses }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ImpactSummaryCards({ data }: { data: CoachImpactSummary }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        label="Voice Notes"
        value={data.voiceNotesCreated}
        icon={Mic}
        colorClasses="bg-blue-100 text-blue-600"
      />
      <SummaryCard
        label="Insights Applied"
        value={data.insightsApplied}
        icon={CheckCircle}
        colorClasses="bg-green-100 text-green-600"
      />
      <SummaryCard
        label="Summaries Sent"
        value={data.summariesSent}
        icon={Send}
        colorClasses="bg-purple-100 text-purple-600"
      />
      <SummaryCard
        label="Parent View Rate"
        value={`${data.parentViewRate}%`}
        icon={Eye}
        colorClasses="bg-amber-100 text-amber-600"
      />
    </div>
  );
}
```

**Integration in my-impact-tab.tsx**:
```typescript
import { ImpactSummaryCards } from "./impact-summary-cards";

// Inside component
{data && <ImpactSummaryCards data={data} />}
```

---

### US-P8-006: Sent Summaries Section

**What**: List of recent parent summaries with engagement status

**Key Points**:
- Show last 10 summaries
- Display player name, preview, sent time, engagement status
- Use badges for viewed/acknowledged status
- "View All" link to existing "Sent to Parents" tab

**Component Pattern**:
```typescript
interface SentSummariesSectionProps {
  summaries: Array<{
    summaryId: string;
    playerName: string;
    summaryPreview: string;
    sentAt: number;
    viewedAt?: number;
    acknowledgedAt?: number;
  }>;
}
```

---

### US-P8-007: Applied Insights Section

**What**: Insights grouped by category (Skills, Injuries, Attendance)

**Key Points**:
- Group by category with icons
- Show most recent 20 insights
- Each insight shows player, change description, timestamp
- "View in Passport" links (implement in Week 3)

**Component Pattern**:
```typescript
const groupedInsights = {
  skills: data.skillChanges || [],
  injuries: data.injuriesRecorded || [],
  attendance: [], // If available
};

// Render each group
Object.entries(groupedInsights).map(([category, insights]) => (
  <div key={category}>
    <h3>{category}</h3>
    {insights.map(insight => (
      <InsightCard key={insight.id} insight={insight} />
    ))}
  </div>
))
```

---

### US-P8-008: Date Range Filtering

**What**: Dropdown to filter by week/month/all time

**Key Points**:
- Use Select component from shadcn/ui
- Persist preference in localStorage
- Update query when selection changes
- All sections update with filtered data

**Pattern**:
```typescript
const [dateRange, setDateRange] = useState<"week" | "month" | "all">(
  () => (localStorage.getItem("impact-date-range") as any) || "month"
);

useEffect(() => {
  localStorage.setItem("impact-date-range", dateRange);
}, [dateRange]);

// Calculate start/end dates
const { start, end } = useMemo(() => {
  const now = Date.now();
  if (dateRange === "week") {
    return { start: now - 7 * 24 * 60 * 60 * 1000, end: now };
  }
  if (dateRange === "month") {
    return { start: now - 30 * 24 * 60 * 60 * 1000, end: now };
  }
  return { start: 0, end: now }; // All time
}, [dateRange]);

// Pass to query
const data = useQuery(
  api.models.voiceNotes.getCoachImpactSummary,
  coachId && orgId ? { coachId, organizationId: orgId, dateRange: { start, end } } : "skip"
);
```

---

### US-P8-009: Team Observations Section

**What**: Team-level insights list

**Key Points**:
- Show most recent 5 observations
- Display team name, observation text, timestamp
- "View All" link to Team Insights page
- Empty state if no observations

---

### US-P8-010: Search in Applied Insights

**What**: Search input to filter insights

**Key Points**:
- Debounced search (300ms)
- Filter by player name, skill name, category
- Clear button when text entered
- Preserve category grouping

**Pattern**:
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [debouncedQuery, setDebouncedQuery] = useState("");

useEffect(() => {
  const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
  return () => clearTimeout(timer);
}, [searchQuery]);

const filteredInsights = useMemo(() => {
  if (!debouncedQuery) return insights;
  return insights.filter(insight =>
    insight.playerName.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
    insight.description.toLowerCase().includes(debouncedQuery.toLowerCase())
  );
}, [insights, debouncedQuery]);
```

---

### US-P8-011: Category Filters

**What**: Filter chips above insights

**Key Points**:
- Options: All, Skills, Injuries, Attendance
- Multiple can be selected (OR logic)
- Works with search (combine filters)
- Count badge on each chip

**Pattern**:
```typescript
const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
  new Set(["all"])
);

const filteredInsights = useMemo(() => {
  let filtered = insights;

  // Apply search
  if (debouncedQuery) {
    filtered = filtered.filter(/* search logic */);
  }

  // Apply category filter
  if (!selectedCategories.has("all")) {
    filtered = filtered.filter(insight =>
      selectedCategories.has(insight.type)
    );
  }

  return filtered;
}, [insights, debouncedQuery, selectedCategories]);
```

---

## ✅ Quality Checklist (Run After Each Story)

### Before Committing
```bash
# 1. Type check
npm run check-types

# 2. Lint
npx ultracite fix

# 3. Visual verification
# - Navigate to /orgs/{orgId}/coach/voice-notes
# - Click "My Impact" tab
# - Verify component renders correctly
# - Test on mobile (375px), tablet (768px), desktop (1920px)
# - Test with empty data
# - Test with mock data
```

### Story Acceptance Criteria
- [ ] Component created/modified
- [ ] Props properly typed
- [ ] Empty state handled
- [ ] Loading state handled
- [ ] Responsive design works
- [ ] Icons and colors match design
- [ ] Real-time updates work
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Visual verification complete

---

## 🚀 Commit Message Pattern

Follow Week 1.5 pattern:
```
feat: US-P8-005 - Create Impact Summary Cards Component

Implements 4 metric cards showing coach activity at a glance:
- Voice Notes Created (blue)
- Insights Applied (green)
- Summaries Sent (purple)
- Parent View Rate (amber)

Features:
- Responsive grid (1/2/4 columns)
- Icon + colored background per card
- Real-time data from getCoachImpactSummary
- Empty state handled
- Loading state handled

Files:
- Created: impact-summary-cards.tsx
- Modified: my-impact-tab.tsx

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## 📚 Reference Documents

**Week 2 Prep**: `scripts/ralph/P8_WEEK2_PREPARATION.md`
**Week 1.5 Checkpoint**: `scripts/ralph/P8_CHECKPOINT_JAN28.md`
**Main PRD**: `scripts/ralph/prds/Coaches Voice Insights/P8_COACH_IMPACT_VISIBILITY.md`
**Testing Guide**: `docs/testing/Voice Insights/p8-week1.5-quick-test-guide.md`

---

## 🎯 Success Criteria for Week 2

Week 2 is complete when:
- ✅ All 7 user stories implemented
- ✅ Dashboard shows comprehensive coaching impact
- ✅ Date filtering works across all sections
- ✅ Search and category filters work together
- ✅ Empty states and loading states handled
- ✅ Responsive design works (mobile, tablet, desktop)
- ✅ Type checking passes
- ✅ Linting passes
- ✅ Visual verification complete
- ✅ Real-time data updates work

---

**Ready to Build**: All prerequisites complete. Start with US-P8-005 (Impact Summary Cards). 🚀
