# PRD: Parent Experience Improvements - Phases 3-5

**Project:** Parent Experience Enhancement - Passport Reorganization, Dashboard Improvements, Visual Polish
**Branch:** `ralph/parent-experience-p3-p5`
**Created:** January 22, 2026
**Status:** Ready for Implementation
**Estimated Time:** 7-10 hours (16-20 user stories)

---

## Executive Summary

Complete the parent experience improvements by enhancing the Player Passport, improving the parent dashboard, and adding visual polish. All backend infrastructure is already implemented - this is purely frontend work.

**What's Already Done (Phases 1-2 + Bonus):**
- ✅ Backend acknowledgment system with `acknowledgeParentSummary` mutation
- ✅ Schema fields: `acknowledgedAt`, `acknowledgedBy` on summaries
- ✅ Parent dashboard with "Mark as Read" functionality
- ✅ "NEW" and "Acknowledged" badges
- ✅ Sport icons and unread count badges
- ✅ Shareable summary images
- ✅ Coach name lookup (handles userId and id fields)
- ✅ AI Practice Assistant with GPT-4 integration

**What This PRD Delivers:**

### Phase 3: Player Passport Reorganization
- Move "Coach Updates" section to TOP of passport (after basic info)
- Add Active/History tabs to Coach Updates
- Active tab shows unacknowledged messages only
- History tab shows acknowledged messages
- "Mark as Read" button on each summary in passport
- Enhanced visual hierarchy with coach avatars and better dates

### Phase 4: Enhanced Parent Dashboard
- Unified message inbox showing all children's messages chronologically
- Child summary cards with stats (avg skill rating, unread count)
- Action items panel for outstanding acknowledgments
- Quick navigation to passport from cards

### Phase 5: Visual Polish
- Coach avatars throughout (initials if no photo)
- Better date formatting (`formatDistanceToNow` from date-fns)
- Category-specific icons for summaries
- Mobile responsiveness improvements
- Smooth animations and transitions

---

## Context & Architecture

### Backend APIs (Already Implemented)

**All queries/mutations exist in `packages/backend/convex/models/coachParentSummaries.ts`:**

```typescript
// Queries
api.models.coachParentSummaries.getParentSummariesByChildAndSport({
  organizationId: string
}) // Returns summaries grouped by child → sport

api.models.coachParentSummaries.getParentUnreadCount({
  organizationId: string
}) // Returns count of unacknowledged messages

api.models.coachParentSummaries.getPassportLinkForSummary({
  summaryId: Id<"coachParentSummaries">
}) // Returns { section: string, url: string }

// Mutations
api.models.coachParentSummaries.acknowledgeParentSummary({
  summaryId: Id<"coachParentSummaries">
}) // Marks single summary as read

api.models.coachParentSummaries.acknowledgeAllForPlayer({
  playerIdentityId: Id<"playerIdentities">,
  organizationId: string
}) // Marks all summaries for a player as read

api.models.coachParentSummaries.markSummaryViewed({
  summaryId: Id<"coachParentSummaries">,
  viewSource: "dashboard" | "notification_click" | "direct_link"
}) // Records view event

api.models.coachParentSummaries.trackShareEvent({
  summaryId: Id<"coachParentSummaries">,
  shareDestination: "download" | "native_share" | "copy_link"
}) // Records share event
```

**Player passport data:**
```typescript
api.models.sportPassports.getFullPlayerPassportView({
  playerIdentityId: Id<"playerIdentities">,
  organizationId: string
}) // Returns full passport with skills, stats, etc.
```

### Schema Fields

**coachParentSummaries table** (already has all fields needed):
- `_id`, `voiceNoteId`, `insightId`, `coachId`, `playerIdentityId`
- `organizationId`, `sportId`
- `privateInsight`: { title, description, category, sentiment }
- `publicSummary`: { content, confidenceScore, generatedAt }
- `sensitivityCategory`: "normal" | "injury" | "behavior"
- `status`: "pending_review" | "approved" | "suppressed" | "auto_approved" | "delivered" | "viewed"
- `createdAt`, `approvedAt`, `deliveredAt`, `viewedAt`
- **`acknowledgedAt`** (number, optional) ✅ Already exists
- **`acknowledgedBy`** (string, optional) ✅ Already exists

**No new backend work needed!**

### File Locations

**Files to Modify:**
```
apps/web/src/app/orgs/[orgId]/
├── players/[playerId]/
│   ├── page.tsx                                    # Phase 3.1: Move Coach Updates
│   └── components/
│       └── parent-summaries-section.tsx            # Phase 3.2: Add tabs
└── parents/
    ├── page.tsx                                    # Phase 4: Dashboard enhancements
    └── components/
        ├── coach-feedback.tsx                      # Phase 5: Visual polish
        └── parent-summary-card.tsx                 # Phase 3.3: Acknowledgment button
```

**Files to Create:**
```
apps/web/src/
├── app/orgs/[orgId]/parents/components/
│   ├── child-summary-card.tsx          # Phase 4.2: Child stats cards
│   ├── unified-inbox-view.tsx          # Phase 4.1: All messages view
│   └── action-items-panel.tsx          # Phase 4.3: Action items
└── components/shared/
    └── coach-avatar.tsx                # Phase 5.1: Reusable avatar
```

---

## Implementation Guidelines

### Task Sizing
- Each user story should be completable in ONE Claude context window
- Modify 1-3 files per story maximum
- Break large features into smaller stories

### Quality Checks
Before marking any story as complete:
```bash
# Type check (MUST pass)
npm run check-types

# Lint (MUST pass)
npx ultracite fix

# Manual verification (for UI changes)
# - Navigate to affected page
# - Test on desktop and mobile (use browser dev tools)
# - Verify functionality works as expected
```

### Convex Patterns (Critical!)
```typescript
// ✅ ALWAYS use indexes for queries
const summaries = await ctx.db
  .query("coachParentSummaries")
  .withIndex("by_player_org_status", (q) =>
    q.eq("playerIdentityId", playerId)
     .eq("organizationId", orgId)
     .eq("status", "approved")
  )
  .collect();

// ❌ NEVER use .filter()
const summaries = await ctx.db
  .query("coachParentSummaries")
  .filter((q) => q.eq(q.field("status"), "approved")) // ❌ BAD!
  .collect();

// ✅ ALWAYS add validators
export const myQuery = query({
  args: { playerId: v.id("playerIdentities") },
  returns: v.array(v.object({ ... })),
  handler: async (ctx, args) => { ... }
});

// ✅ Auth pattern
const user = await authComponent.safeGetAuthUser(ctx);
if (!user) throw new Error("Not authenticated");
const userId = user.userId || user._id; // Handle both fields

// ✅ Real-time updates with useQuery
const data = useQuery(api.models.coachParentSummaries.getSomething, { orgId });
// Data updates automatically when backend changes!
```

### Component Patterns
```typescript
// ✅ Use existing shadcn/ui components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ✅ Use lucide-react for icons
import { Check, MessageSquare, Sparkles, ArrowRight } from "lucide-react";

// ✅ Date formatting with date-fns
import { formatDistanceToNow, format } from "date-fns";

// Recent: "2 hours ago"
{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}

// Older: "Jan 15, 2026"
{format(new Date(timestamp), "MMM d, yyyy")}

// ✅ Responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// ✅ Mobile-friendly spacing
<div className="flex flex-col sm:flex-row gap-2">
```

### Testing Checklist

For each UI change:
- [ ] Desktop view works (1920px)
- [ ] Tablet view works (768px)
- [ ] Mobile view works (375px)
- [ ] Touch targets adequate (min 44px)
- [ ] Text readable (min 14px body)
- [ ] Real-time updates work (test with 2 browser windows)
- [ ] Loading states display correctly
- [ ] Error states handled gracefully

---

## Phase 3: Player Passport Reorganization

### 3.1 Move Coach Updates to Top

**Problem:** Parents have to scroll past skills, benchmarks, and goals to see coach updates. Updates should be prominent.

**Solution:** Reorder sections in passport page so Coach Updates appear right after Basic Information.

**Current Order:**
1. Basic Information
2. Skills Radar Chart
3. Benchmark Comparison
4. Goals
5. Coach Updates ← buried here
6. Notes, Skills, Positions

**New Order (for parents only):**
1. Basic Information
2. **Coach Updates** ← moved here
3. Skills Radar Chart
4. Benchmark Comparison
5. Goals
6. Notes, Skills, Positions

**Implementation:** Modify `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx` around line 342

### 3.2 Add Active/History Tabs

**Problem:** Parents see all messages mixed together, can't distinguish new from read.

**Solution:** Add tabs to Coach Updates section:
- **Active tab:** Shows only unacknowledged messages (`!acknowledgedAt`)
- **History tab:** Shows only acknowledged messages (`acknowledgedAt` exists)

**UI Design:**
```
┌─────────────────────────────────┐
│ Coach Updates          (12)     │
├─────────────────────────────────┤
│ [Active (5)] [History (7)]      │ ← Tabs
├─────────────────────────────────┤
│ Active Tab Content:             │
│ ┌─────────────────────────────┐ │
│ │ [NEW] Skill improvement     │ │
│ │ "Great progress on..."      │ │
│ │ [Mark as Read] [View...]    │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Implementation:** Modify `ParentSummariesSection` component

### 3.3 Add Acknowledgment to Passport

**Problem:** Parents currently acknowledge on dashboard but not in passport.

**Solution:** Add "Mark as Read" button to summary cards in passport view.

**Implementation:** Add button using `acknowledgeParentSummary` mutation

---

## Phase 4: Enhanced Parent Dashboard

### 4.1 Unified Message Inbox

**Problem:** Parents with multiple children in different sports see messages grouped by child/sport. Hard to see "what's new overall".

**Solution:** Add view toggle:
- **By Child** (current): Groups messages by child → sport
- **All Messages** (new): Shows ALL messages chronologically

**UI Design:**
```
┌─────────────────────────────────┐
│ [By Child] [All Messages (15)]  │ ← View toggle
├─────────────────────────────────┤
│ All Messages View:              │
│ ┌─────────────────────────────┐ │
│ │ [NEW] Sarah - GAA          │ │
│ │ "Great progress..."  2h ago│ │
│ ├─────────────────────────────┤ │
│ │ [NEW] John - Soccer        │ │
│ │ "Excellent game..." 4h ago │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Implementation:** Add state toggle and flatten summaries array

### 4.2 Child Summary Cards

**Problem:** No quick overview of each child's status.

**Solution:** Add cards at top of dashboard showing:
- Child name with avatar
- Average skill rating (from passport)
- Unread message count
- Quick link to passport

**UI Design:**
```
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ 👤 Sarah      │ │ 👤 John       │ │ 👤 Emma       │
│ ─────────────│ │ ─────────────│ │ ─────────────│
│ Avg: 4.2 ⭐  │ │ Avg: 3.8 ⭐  │ │ Avg: 4.5 ⭐  │
│ 3 New        │ │ 1 New        │ │ 0 New        │
│ [View Pass..]│ │ [View Pass..]│ │ [View Pass..]│
└───────────────┘ └───────────────┘ └───────────────┘
```

### 4.3 Action Items Panel

**Problem:** No clear call-to-action for parents with unread messages.

**Solution:** Show prominent alert at top when there are unacknowledged messages.

**UI Design:**
```
┌─────────────────────────────────────────────┐
│ ⓘ You have 5 new coach updates              │
│                              [Review Now →] │
└─────────────────────────────────────────────┘
```

---

## Phase 5: Visual Polish

### 5.1 Coach Avatars

**Problem:** Summaries show coach names but no visual identity.

**Solution:** Add coach avatar (initials) next to each message.

**Implementation:** Create `CoachAvatar` component that:
- Shows initials in colored circle
- Accepts `coachName` prop
- Extracts first letter of first + last name
- Uses consistent color per coach (hash name to color)

### 5.2 Better Date Formatting

**Problem:** Dates show as "Jan 22, 2026" even for messages from 2 hours ago.

**Solution:** Use relative dates for recent messages:
- < 1 day: "2 hours ago"
- < 7 days: "3 days ago"
- Older: "Jan 15, 2026"

**Implementation:** Use `date-fns` library (already installed)

### 5.3 Category Icons

**Problem:** Message categories not visually distinct.

**Solution:** Add icon per category:
- skill_rating → Target icon
- skill_progress → TrendingUp icon
- injury → Heart icon
- behavior → AlertCircle icon
- performance → Trophy icon
- attendance → Calendar icon

### 5.4 Mobile Responsiveness

**Problem:** Some layouts don't work well on mobile.

**Solution:**
- Stack cards vertically on mobile
- Make tabs scrollable horizontally if needed
- Ensure min 44px touch targets
- Test at 375px, 768px, 1920px widths

### 5.5 Smooth Animations

**Problem:** UI changes feel abrupt.

**Solution:** Add subtle transitions:
- Card hover: `hover:shadow-lg hover:scale-[1.02]`
- New badge: `animate-pulse` class
- Tab switching: fade animation
- Button states: `transition-colors duration-200`

---

## Success Metrics

### User Experience
- ✅ Parents see new messages immediately (< 3 sec load)
- ✅ One-click acknowledgment works consistently
- ✅ No messages lost or hidden in UI
- ✅ Mobile experience is seamless

### Technical
- ✅ No N+1 queries (use existing batch queries)
- ✅ Real-time updates work (Convex subscriptions)
- ✅ Type check passes: `npm run check-types`
- ✅ Lint passes: `npx ultracite fix`
- ✅ No console errors

### Performance
- ✅ Initial page load < 2 seconds
- ✅ UI interactions < 100ms response
- ✅ Smooth 60fps animations
- ✅ Works on mobile 4G connection

---

## Common Pitfalls to Avoid

### Backend
- ❌ **Don't create new backend functions** - everything exists
- ❌ **Don't modify schema** - all fields present
- ❌ **Don't use `.filter()`** - always use `.withIndex()`
- ❌ **Don't forget validators** - args and returns required

### Frontend
- ❌ **Don't break coach/admin views** - only modify parent-facing components
- ❌ **Don't forget mobile testing** - 60%+ parents use mobile
- ❌ **Don't hardcode orgId** - get from params/props
- ❌ **Don't forget loading states** - queries can take time

### General
- ❌ **Don't make stories too big** - keep to 1-3 files per story
- ❌ **Don't skip quality checks** - always run type check and lint
- ❌ **Don't commit broken code** - test thoroughly first
- ❌ **Don't forget to document** - update progress.txt with learnings

---

## Quick Reference

### Useful Commands
```bash
# Type check
npm run check-types

# Lint and format
npx ultracite fix

# Start dev server (if not running)
npm run dev

# Check current branch
git branch

# View recent commits
git log --oneline -10

# Check PRD status
cat scripts/ralph/prd.json | jq '.userStories[] | {id, title, passes}'
```

### Key Files
- **Schema:** `packages/backend/convex/schema.ts` (line ~1630 for summaries)
- **Backend:** `packages/backend/convex/models/coachParentSummaries.ts`
- **Parent Page:** `apps/web/src/app/orgs/[orgId]/parents/page.tsx`
- **Passport Page:** `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx`
- **Components:** `apps/web/src/app/orgs/[orgId]/parents/components/`

### Contact Points
- Implementation plan: `docs/features/parent-experience-phase-3-5-implementation-plan.md`
- Original plan: `docs/features/parent-experience-improvements.md`
- Ralph docs: `scripts/ralph/README.md`

---

**Document Version:** 1.0
**Last Updated:** January 22, 2026
**Author:** Claude Sonnet 4.5
