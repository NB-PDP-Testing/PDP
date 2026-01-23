# Parent Experience Improvements - Phase 3-5 Implementation Plan

**Status:** Implementation roadmap for remaining work
**Created:** January 22, 2026
**Based on:** `docs/features/parent-experience-improvements.md` (Option C)

---

## ✅ What's Been Completed (Phases 1-2 + Bonus)

### Phase 1-2: Core Parent Summary System
- ✅ Backend acknowledgment system (`acknowledgeParentSummary`, `acknowledgeAllForPlayer`)
- ✅ Schema fields: `acknowledgedAt`, `acknowledgedBy` on `coachParentSummaries` table
- ✅ Parent dashboard acknowledgment UI with "Mark as Read" buttons
- ✅ "NEW" and "Acknowledged" badges on summary cards
- ✅ Sport icons and unread count badges (US-019, US-020)
- ✅ Shareable summary images for parents
- ✅ Coach name lookup fix (handles both userId and id fields)

### Bonus: AI Practice Assistant
- ✅ AI-powered practice plan generation (GPT-4 integration)
- ✅ Personalized 15-minute weekly plans based on player passport data
- ✅ 3 × 5-minute sport-specific drills with instructions
- ✅ Equipment lists, practice schedules, parent tips
- ✅ Download and share functionality
- ✅ Backend: `packages/backend/convex/actions/practicePlans.ts`
- ✅ Frontend: `apps/web/src/app/orgs/[orgId]/parents/components/ai-practice-assistant-enhanced.tsx`

**Git Status:** All above features committed to `ralph/coach-parent-summaries-p4` branch

---

## 🚧 Remaining Work (Phases 3-5)

## Phase 3: Player Passport Reorganization

**Goal:** Improve parent experience in Player Passport by making Coach Updates more prominent and organized.

### 3.1 Move Coach Updates to Top of Passport

**File:** `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx`

**Current Order:**
1. Basic Information
2. Skills Radar Chart
3. Benchmark Comparison
4. Goals
5. Voice Insights / Coach Updates (buried down here)
6. Notes
7. Skills
8. Positions/Fitness

**New Order (for Parents):**
1. Basic Information
2. **Coach Updates** ⬅️ MOVE TO TOP (after basic info)
3. Skills Radar Chart
4. Benchmark Comparison
5. Goals
6. Notes
7. Skills
8. Positions/Fitness

**Implementation:**
```typescript
// In page.tsx around line 342 (non-tabbed view)
// Move the ParentSummariesSection block to appear right after BasicInformationSection

{/* NEW POSITION: Coach Updates first for parents */}
{permissions.isParent && (
  <ParentSummariesSection
    orgId={orgId}
    playerIdentityId={playerId as Id<"playerIdentities">}
  />
)}

{/* Then other sections below */}
<SkillRadarChart ... />
<BenchmarkComparison ... />
<GoalsSection ... />
```

### 3.2 Add Active/History Tabs to Coach Updates

**File:** `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/parent-summaries-section.tsx`

**Current:** Single list of all summaries

**New:** Tabbed interface:
- **Active** tab: Unacknowledged messages only (`!acknowledgedAt`)
- **History** tab: Acknowledged messages (`acknowledgedAt` exists)

**Implementation:**
```typescript
// Add tab state
const [activeTab, setActiveTab] = useState<"active" | "history">("active");

// Split summaries
const activeSummaries = playerSummaries.filter(s => !s.acknowledgedAt);
const historySummaries = playerSummaries.filter(s => s.acknowledgedAt);

// Render with Tabs component
<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "history")}>
  <TabsList>
    <TabsTrigger value="active">
      Active ({activeSummaries.length})
      {activeSummaries.length > 0 && <Badge>New</Badge>}
    </TabsTrigger>
    <TabsTrigger value="history">
      History ({historySummaries.length})
    </TabsTrigger>
  </TabsList>

  <TabsContent value="active">
    {/* Render activeSummaries */}
    {/* Add "Mark as Read" button on each card */}
  </TabsContent>

  <TabsContent value="history">
    {/* Render historySummaries */}
    {/* Show "Read on [date]" badge */}
  </TabsContent>
</Tabs>
```

**Add Acknowledgment Handler:**
```typescript
const acknowledgeSummary = useMutation(
  api.models.coachParentSummaries.acknowledgeParentSummary
);

const handleAcknowledge = async (summaryId: Id<"coachParentSummaries">) => {
  try {
    await acknowledgeSummary({ summaryId });
    toast.success("Marked as read");
  } catch (error) {
    toast.error("Failed to mark as read");
  }
};
```

**Add to Summary Card:**
```typescript
{!summary.acknowledgedAt && (
  <Button onClick={() => handleAcknowledge(summary._id)} size="sm">
    <Check className="mr-1 h-4 w-4" />
    Mark as Read
  </Button>
)}
```

### 3.3 Enhanced Visual Hierarchy

**Improvements:**
- Show coach avatar/initials in summary cards
- Better date formatting using `formatDistanceToNow` from `date-fns`
- Category-specific icons (already partially done)
- Highlight unread messages with subtle animation or border

**Coach Avatar Component:**
```typescript
// Create new component: CoachAvatar.tsx
export function CoachAvatar({ coachName }: { coachName: string }) {
  const initials = coachName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
      {initials}
    </div>
  );
}
```

**Better Date Display:**
```typescript
// Replace current date display with:
<span className="text-muted-foreground text-xs">
  {formatDistanceToNow(new Date(summary.createdAt), { addSuffix: true })}
</span>
```

---

## Phase 4: Enhanced Parent Dashboard

**Goal:** Create a unified, actionable dashboard experience for parents.

### 4.1 Unified Message Inbox

**File:** `apps/web/src/app/orgs/[orgId]/parents/page.tsx`

**Current:** Messages grouped by child → sport → summaries

**New:** Add "All Messages" view that shows messages across ALL children in a single chronological feed.

**Implementation:**
```typescript
// Add view toggle
const [view, setView] = useState<"by-child" | "unified">("by-child");

// Flatten all summaries
const allMessages = useMemo(() => {
  if (!summariesData) return [];

  const messages = [];
  for (const child of summariesData) {
    for (const sportGroup of child.sportGroups) {
      for (const summary of sportGroup.summaries) {
        messages.push({
          ...summary,
          childName: `${child.player.firstName} ${child.player.lastName}`,
          sportName: sportGroup.sport?.name || "Unknown",
        });
      }
    }
  }

  return messages.sort((a, b) => b.createdAt - a.createdAt);
}, [summariesData]);

// Render view toggle
<div className="flex gap-2 mb-4">
  <Button
    variant={view === "by-child" ? "default" : "outline"}
    onClick={() => setView("by-child")}
  >
    By Child
  </Button>
  <Button
    variant={view === "unified" ? "default" : "outline"}
    onClick={() => setView("unified")}
  >
    All Messages ({allMessages.length})
  </Button>
</div>

{/* Conditional rendering */}
{view === "unified" ? (
  <UnifiedInboxView messages={allMessages} />
) : (
  <ByChildView data={summariesData} />
)}
```

### 4.2 Child Summary Cards

**Location:** Top of parent dashboard, above messages

**Shows for each child:**
- Child name and photo/avatar
- Average skill rating (fetch from passport)
- Attendance percentage (if available)
- Unread message count
- Quick link to passport

**Implementation:**
```typescript
// Create new component: ChildSummaryCard.tsx
type ChildSummaryCardProps = {
  player: {
    _id: Id<"playerIdentities">;
    firstName: string;
    lastName: string;
  };
  unreadCount: number;
  orgId: string;
};

export function ChildSummaryCard({ player, unreadCount, orgId }: ChildSummaryCardProps) {
  // Fetch passport data for stats
  const passportData = useQuery(
    api.models.sportPassports.getFullPlayerPassportView,
    {
      playerIdentityId: player._id,
      organizationId: orgId,
    }
  );

  // Calculate average skill rating
  const avgSkillRating = useMemo(() => {
    if (!passportData?.passports?.[0]?.skills) return null;
    const ratings = passportData.passports[0].skills.map(s => s.rating);
    if (ratings.length === 0) return null;
    return (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1);
  }, [passportData]);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>
              {player.firstName[0]}{player.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">
              {player.firstName} {player.lastName}
            </CardTitle>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {/* Stats */}
        {avgSkillRating && (
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {avgSkillRating}
            </div>
            <div className="text-xs text-muted-foreground">Avg Skill</div>
          </div>
        )}
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {unreadCount}
          </div>
          <div className="text-xs text-muted-foreground">New Updates</div>
        </div>

        {/* Quick Actions */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/orgs/${orgId}/players/${player._id}`)}
          className="col-span-2"
        >
          View Passport
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Add to Dashboard:**
```typescript
// In page.tsx, add above the CoachFeedback component
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
  {summariesData?.map((childData) => (
    <ChildSummaryCard
      key={childData.player._id}
      player={childData.player}
      unreadCount={childData.sportGroups.reduce(
        (sum, sg) => sum + sg.unreadCount,
        0
      )}
      orgId={orgId}
    />
  ))}
</div>
```

### 4.3 Action Items Section

**Location:** Top of dashboard (above child cards)

**Shows:**
- Unacknowledged messages count with "Review Now" button
- Upcoming performance reviews (if scheduled)
- Outstanding consent requests
- Medical info updates needed

**Implementation:**
```typescript
// Create new component: ActionItemsPanel.tsx
export function ActionItemsPanel({
  unreadCount,
  onReviewClick
}: {
  unreadCount: number;
  onReviewClick: () => void;
}) {
  if (unreadCount === 0) return null;

  return (
    <Alert className="border-blue-500 bg-blue-50 mb-6">
      <AlertCircle className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900">
        You have {unreadCount} new coach update{unreadCount > 1 ? 's' : ''}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span className="text-blue-800 text-sm">
          Review your child's latest progress updates
        </span>
        <Button onClick={onReviewClick} variant="default" size="sm">
          Review Now
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

---

## Phase 5: Visual Polish & Mobile Responsiveness

### 5.1 Coach Avatars Throughout

**Files to Update:**
- `parent-summaries-section.tsx`
- `coach-feedback.tsx` (parent dashboard)
- `voice-insights-section-improved.tsx` (if needed)

**Implementation:**
- Fetch coach user data and display avatar/initials
- Use shadcn Avatar component
- Fallback to initials if no photo

### 5.2 Better Date Formatting

**Replace all date displays with:**
```typescript
import { formatDistanceToNow, format } from "date-fns";

// For recent items (< 7 days)
{formatDistanceToNow(new Date(summary.createdAt), { addSuffix: true })}
// "2 hours ago", "3 days ago"

// For older items
{format(new Date(summary.createdAt), "MMM d, yyyy")}
// "Jan 15, 2026"
```

### 5.3 Category-Specific Icons

**Already partially implemented**, but ensure consistency:

```typescript
const categoryIcons = {
  skill_rating: Target,
  skill_progress: TrendingUp,
  injury: Heart,
  behavior: AlertCircle,
  performance: Trophy,
  attendance: Calendar,
};

const CategoryIcon = categoryIcons[summary.privateInsight.category] || MessageSquare;
```

### 5.4 Mobile Responsiveness

**Test and fix on mobile:**
- Summary cards stack properly on narrow screens
- Tabs are scrollable horizontally if needed
- Action buttons are touch-friendly (min 44px)
- Text sizes are readable (min 14px for body)
- Spacing is adequate for fat fingers

**Add responsive classes:**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Child summary cards */}
</div>

<div className="flex flex-col sm:flex-row gap-2">
  {/* Action buttons */}
</div>
```

### 5.5 Smooth Animations

**Add subtle transitions:**
```typescript
// On summary cards
className="transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"

// On new badge pulse
<Badge className="animate-pulse bg-blue-600">NEW</Badge>

// On acknowledgment success
{/* Show checkmark animation using framer-motion or CSS */}
```

---

## Testing Checklist

### Phase 3 Testing
- [ ] Coach Updates appear at top of passport for parents
- [ ] Active tab shows only unacknowledged messages
- [ ] History tab shows only acknowledged messages
- [ ] "Mark as Read" moves message from Active → History
- [ ] Badge counts update correctly
- [ ] Coach avatars display correctly

### Phase 4 Testing
- [ ] Child summary cards show accurate stats
- [ ] Unified inbox shows all messages chronologically
- [ ] Action items panel appears when there are unread messages
- [ ] "Review Now" scrolls to messages section
- [ ] Quick actions work from child cards

### Phase 5 Testing
- [ ] Test on mobile devices (iPhone, Android)
- [ ] Test on tablets (iPad)
- [ ] Test on desktop (various widths)
- [ ] Verify touch targets are adequate
- [ ] Check date formatting edge cases
- [ ] Verify animations are smooth (60fps)

---

## Database Schema Reference

### Existing Fields (Already in Production)

**coachParentSummaries table:**
```typescript
{
  _id: Id<"coachParentSummaries">,
  voiceNoteId: Id<"voiceNotes">,
  insightId: string,
  coachId: string,
  playerIdentityId: Id<"playerIdentities">,
  organizationId: string,
  sportId: Id<"sports">,
  privateInsight: {
    title: string,
    description: string,
    category: string,
    sentiment: "positive" | "neutral" | "concern",
  },
  publicSummary: {
    content: string,
    confidenceScore: number,
    generatedAt: number,
  },
  sensitivityCategory: "normal" | "injury" | "behavior",
  status: "pending_review" | "approved" | "suppressed" | "auto_approved" | "delivered" | "viewed",
  createdAt: number,
  approvedAt?: number,
  deliveredAt?: number,
  viewedAt?: number,
  acknowledgedAt?: number,  // ✅ Already exists
  acknowledgedBy?: string,  // ✅ Already exists
}
```

**No new tables or fields needed!** All backend infrastructure is ready.

---

## Backend Functions Reference

### Already Implemented (Use These)

```typescript
// Acknowledge a single summary
api.models.coachParentSummaries.acknowledgeParentSummary({
  summaryId: Id<"coachParentSummaries">
})

// Acknowledge all for a player
api.models.coachParentSummaries.acknowledgeAllForPlayer({
  playerIdentityId: Id<"playerIdentities">,
  organizationId: string
})

// Get summaries by child and sport (already groups them)
api.models.coachParentSummaries.getParentSummariesByChildAndSport({
  organizationId: string
})

// Get player passport (for child summary cards)
api.models.sportPassports.getFullPlayerPassportView({
  playerIdentityId: Id<"playerIdentities">,
  organizationId: string
})
```

**No new backend functions needed!**

---

## File Structure Reference

### Files to Create

```
apps/web/src/app/orgs/[orgId]/parents/components/
├── child-summary-card.tsx          (NEW - Phase 4.2)
├── unified-inbox-view.tsx          (NEW - Phase 4.1)
├── action-items-panel.tsx          (NEW - Phase 4.3)
└── coach-avatar.tsx                (NEW - Phase 5.1)
```

### Files to Modify

```
apps/web/src/app/orgs/[orgId]/
├── parents/
│   ├── page.tsx                                    (Phase 4)
│   └── components/
│       ├── coach-feedback.tsx                      (Phase 5)
│       └── parent-summary-card.tsx                 (Phase 5)
└── players/[playerId]/
    ├── page.tsx                                    (Phase 3.1)
    └── components/
        └── parent-summaries-section.tsx            (Phase 3.2, 3.3)
```

---

## Implementation Order Recommendation

1. **Start with Phase 3** (Player Passport improvements)
   - Quick wins, immediate value for parents
   - Self-contained changes
   - Estimated: 2-3 hours

2. **Then Phase 4** (Dashboard enhancements)
   - Builds on Phase 3
   - More complex (unified inbox)
   - Estimated: 3-4 hours

3. **Finish with Phase 5** (Polish)
   - Visual refinements
   - Cross-cutting changes
   - Estimated: 2-3 hours

**Total Estimated Time:** 7-10 hours of focused development

---

## Success Metrics

### User Experience
- ✅ Parents can see new updates immediately (< 3 seconds load time)
- ✅ Acknowledgment is one-click action
- ✅ No messages get lost in UI
- ✅ Mobile experience is seamless

### Technical
- ✅ No N+1 queries (use existing batch queries)
- ✅ Real-time updates work (Convex subscriptions)
- ✅ Accessibility: keyboard navigation works
- ✅ Performance: < 100ms UI response time

---

## Notes for Future Agent/Developer

### Important Context
1. **Backend is 100% ready** - All mutations, queries, and schema fields exist
2. **Don't break existing coach/admin flows** - Only modify parent-facing components
3. **Use existing components** - shadcn/ui components are already installed
4. **Follow existing patterns** - Look at `coach-feedback.tsx` for reference
5. **Test with real data** - Use the existing dev org with test data

### Common Pitfalls to Avoid
- ❌ Don't filter in memory - use Convex indexes
- ❌ Don't create new backend functions unless absolutely necessary
- ❌ Don't modify schema - everything needed is already there
- ❌ Don't break the coach dashboard - changes are parent-only
- ❌ Don't forget mobile testing - 60%+ of parents use mobile

### Quick Reference Links
- Original plan: `docs/features/parent-experience-improvements.md`
- Schema: `packages/backend/convex/schema.ts`
- Backend models: `packages/backend/convex/models/coachParentSummaries.ts`
- Parent dashboard: `apps/web/src/app/orgs/[orgId]/parents/page.tsx`
- Player passport: `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx`

---

## Questions?

If you encounter blockers:
1. Check the backend implementation in `coachParentSummaries.ts` first
2. Look at existing similar components for patterns
3. Test with the dev org (has sample data)
4. Ask in #development channel

---

**Document Version:** 1.0
**Last Updated:** January 22, 2026
**Author:** Claude Sonnet 4.5 (Implementation Planner)
