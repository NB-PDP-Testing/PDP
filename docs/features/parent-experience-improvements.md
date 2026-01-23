# Parent Experience Improvements - Implementation Plan
**Date:** January 21, 2026
**Status:** Design & Planning

---

## Issues to Address

### 1. "Unknown Coach" Problem
**Issue:** Parent summary cards showing "From Coach Unknown Coach"
**Root Cause:** Query searches for coach by `_id` but should search by `userId`
**Location:** `packages/backend/convex/models/coachParentSummaries.ts:718-720`
**Fix:** Change field name from `_id` to `userId` in Better Auth adapter query

### 2. Parent Player Passport Layout
**Issues:**
- Coach Updates section is too far down the page
- No acknowledgment functionality
- No active vs history organization
- Layout needs visual improvement

### 3. Parent Dashboard (Overview Page)
**Issues:**
- No central hub to see all children's updates
- No acknowledgment tracking across children
- Missing insights from MVP design patterns

---

## Solution 1: Fix "Unknown Coach" Issue

### Current Code (BROKEN):
```typescript
const coachResult = await ctx.runQuery(
  components.betterAuth.adapter.findOne,
  {
    model: "user",
    where: [
      {
        field: "_id",  // ❌ WRONG - This is the Convex _id
        value: summary.coachId,
        operator: "eq",
      },
    ],
  }
);
```

### Fixed Code:
```typescript
const coachResult = await ctx.runQuery(
  components.betterAuth.adapter.findOne,
  {
    model: "user",
    where: [
      {
        field: "userId",  // ✅ CORRECT - Better Auth userId field
        value: summary.coachId,
        operator: "eq",
      },
    ],
  }
);
```

**Impact:** Immediately shows correct coach names in parent view

---

## Solution 2: Improved Parent Player Passport

### Layout Reorganization

**New Order (Priority-based):**
```
Player Passport Page (Parent View)
├─ Header (Player name, photo)
├─ 1. Coach Updates Section ← MOVED UP (Most Important)
│  ├─ Active Tab (Unacknowledged messages)
│  ├─ History Tab (Acknowledged messages)
│  └─ Archive (Optional: 90+ days old)
├─ 2. Skills Overview
├─ 3. Development Goals
├─ 4. Attendance & Participation
└─ 5. Development Notes (Legacy)
```

### Coach Updates - Enhanced UI

#### Tab Structure:
```
┌─────────────────────────────────────────────┐
│ 📬 Coach Updates                      [2] ↕  │
├─────────────────────────────────────────────┤
│ Tabs: [Active (2)]  [History (15)]           │
├─────────────────────────────────────────────┤
│ ACTIVE TAB:                                  │
│ ┌──────────────────────────────────────────┐│
│ │ 🟢 NEW: Clodagh's Skill Progress         ││
│ │ From Coach Neil • Jan 21 • GAA Football  ││
│ │                                          ││
│ │ Clodagh is making great strides in her   ││
│ │ right-side play...                       ││
│ │                                          ││
│ │ [✓ Mark as Read]  [View Full Details]   ││
│ └──────────────────────────────────────────┘│
│                                             │
│ ┌──────────────────────────────────────────┐│
│ │ 🔴 INJURY: Hand Injury Requires Attention││
│ │ From Coach Sarah • Jan 20 • Soccer       ││
│ │ ...                                      ││
│ └──────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

#### Key Features:
1. **Visual Hierarchy:**
   - Red left border: Injury/Behavior
   - Orange: Follow-up needed
   - Blue: Standard updates
   - Green indicator: Unread

2. **Acknowledgment System:**
   - "Mark as Read" button (single click)
   - Moves to History tab when acknowledged
   - Backend tracks `acknowledgedAt` timestamp
   - Badge shows count of unread messages

3. **Better Metadata:**
   - Coach name (WITH PHOTO)
   - Date (relative: "2 days ago")
   - Sport/Team context
   - Category badge (Skill Progress, Performance, Injury, etc.)

4. **Actions:**
   - View Full Details → Expands inline
   - Acknowledge → Moves to History
   - Archive (optional) → Hides from main view

---

## Solution 3: Enhanced Parent Dashboard

### MVP Inspiration - What to Adopt:

From MVP's `ParentInsightsDashboard`:
1. ✅ **Latest Coach Feedback** (already implemented)
2. ✅ **Multi-child Summary Cards**
3. ✅ **AI Practice Plans** (future enhancement)
4. ✅ **Injury Summary** (active vs recovering)
5. ✅ **Top Skills Visualization**
6. ✅ **Attendance Tracking**

### New Parent Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│ 👪 Parent Dashboard                                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📊 Overview - All Children                              │
│ ┌──────────┬──────────┬──────────┬──────────┐          │
│ │    3     │    7     │    0     │    2     │          │
│ │ Children │ Unread   │ Injuries │ Upcoming │          │
│ │          │ Messages │  Active  │ Reviews  │          │
│ └──────────┴──────────┴──────────┴──────────┘          │
│                                                          │
│ 📬 Recent Coach Updates (All Children)                  │
│ ┌────────────────────────────────────────────┐         │
│ │ 🟢 Clodagh Barlow - Skill Progress (GAA)   │         │
│ │    From Coach Neil • 2 hours ago            │         │
│ │    [✓ Acknowledge]  [View Passport]         │         │
│ ├────────────────────────────────────────────┤         │
│ │ 🔴 Eabha Barlow - Hand Injury (Soccer)     │         │
│ │    From Coach Sarah • Yesterday             │         │
│ │    [✓ Acknowledge]  [View Passport]         │         │
│ ├────────────────────────────────────────────┤         │
│ │ 🟢 Bláithín Barlow - Excellent Session     │         │
│ │    From Coach Neil • 3 days ago             │         │
│ │    [✓ Acknowledge]  [View Passport]         │         │
│ └────────────────────────────────────────────┘         │
│                                                          │
│ 👧 Your Children                                        │
│ ┌──────────────┬──────────────┬──────────────┐         │
│ │ Clodagh      │ Eabha        │ Bláithín     │         │
│ │ Barlow       │ Barlow       │ Barlow       │         │
│ │              │              │              │         │
│ │ GAA U18      │ Soccer U14   │ GAA U10      │         │
│ │ ⭐ 4.2 avg   │ ⭐ 3.8 avg   │ ⭐ 4.5 avg   │         │
│ │ 📊 95% att.  │ 📊 88% att.  │ 📊 100% att. │         │
│ │ 💬 1 unread  │ 💬 2 unread  │ 💬 0 unread  │         │
│ │              │              │              │         │
│ │ [View Pass.] │ [View Pass.] │ [View Pass.] │         │
│ └──────────────┴──────────────┴──────────────┘         │
│                                                          │
│ 🔔 Action Items                                         │
│ │ • Acknowledge 7 coach messages                        │
│ │ • Review Eabha's injury update                        │
│ │ • Clodagh's review due in 5 days                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Key Features:

#### 1. Unified Inbox
- **All children's updates** in one place
- Sort by date (most recent first)
- Filter by child, sport, or category
- Badge indicators: 🟢 Standard, 🔴 Urgent, 🟡 Follow-up

#### 2. One-Click Acknowledgment
- "Acknowledge" button on each message
- Backend mutation: `acknowledgeParentSummary(summaryId)`
- Updates `acknowledgedAt` timestamp
- Moves to History tab/section

#### 3. Child Summary Cards
Inspired by MVP:
- Average skill rating (across all sports)
- Attendance percentage
- Unread message count
- Latest coach feedback snippet
- Quick link to full passport

#### 4. Action Items Section
- Outstanding acknowledgments
- Upcoming reviews
- Active injuries requiring attention
- Practice plan recommendations

---

## Implementation Phases

### Phase 1: Fix "Unknown Coach" (CRITICAL - 15 minutes)
**File:** `packages/backend/convex/models/coachParentSummaries.ts`
- [ ] Change `_id` to `userId` in Better Auth query (line 718)
- [ ] Test with existing parent summaries
- [ ] Commit fix

### Phase 2: Add Acknowledgment Backend (1 hour)
**Files:**
- `packages/backend/convex/models/coachParentSummaries.ts`
- `packages/backend/convex/schema.ts`

**Changes:**
1. Add `acknowledgedAt` field to schema
2. Add `acknowledgedBy` field (userId of parent)
3. Create mutation: `acknowledgeParentSummary`
4. Update query to separate acknowledged vs unacknowledged

**Schema Addition:**
```typescript
coachParentSummaries: defineTable({
  // ... existing fields
  acknowledgedAt: v.optional(v.number()),
  acknowledgedBy: v.optional(v.string()),
})
```

**New Mutation:**
```typescript
export const acknowledgeParentSummary = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(args.summaryId, {
      acknowledgedAt: Date.now(),
      acknowledgedBy: user._id,
    });

    return null;
  },
});
```

### Phase 3: Player Passport - Tabbed Updates (2-3 hours)
**Files:**
- `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/parent-summaries-section.tsx`

**Changes:**
1. Move section higher in passport (after header, before skills)
2. Add Tabs: Active, History, Archive (optional)
3. Add "Acknowledge" button to each card
4. Visual improvements:
   - Coach photo/avatar
   - Better date formatting (relative: "2 hours ago")
   - Category icons
   - Enhanced layout with better spacing

**Active Tab Filter:**
```typescript
const activeSummaries = playerSummaries.filter(s => !s.acknowledgedAt);
const historySummaries = playerSummaries.filter(s => s.acknowledgedAt);
```

### Phase 4: Parent Dashboard Enhancement (3-4 hours)
**File:** `apps/web/src/app/orgs/[orgId]/parent/dashboard/page.tsx`

**New Query:**
```typescript
// Get all summaries for all children
export const getParentDashboardSummaries = query({
  args: { organizationId: v.string() },
  returns: v.array(/* ... */),
  handler: async (ctx, args) => {
    // Get guardian identity
    // Get all children
    // Get all summaries across all children
    // Enrich with player names, coach names
    // Sort by date (most recent first)
    // Return unified list
  },
});
```

**Dashboard Components:**
1. Overview Stats Cards
2. Unified Message Inbox (all children)
3. Child Summary Cards
4. Action Items Section

### Phase 5: Visual Polish (1-2 hours)
1. Coach avatars/photos
2. Better date formatting
3. Category-specific icons
4. Loading states
5. Empty states
6. Mobile responsiveness

---

## Database Schema Changes

### Required Additions:

```typescript
// schema.ts
coachParentSummaries: defineTable({
  // ... existing fields
  acknowledgedAt: v.optional(v.number()),
  acknowledgedBy: v.optional(v.string()), // Parent userId who acknowledged
})
.index("by_player_acknowledged", ["playerIdentityId", "acknowledgedAt"])
.index("by_parent_acknowledged", ["acknowledgedBy", "acknowledgedAt"])
```

---

## New Backend Functions Needed

### 1. `acknowledgeParentSummary` (mutation)
Marks a summary as acknowledged by parent

### 2. `getParentDashboardSummaries` (query)
Gets all summaries across all children for dashboard

### 3. `getUnacknowledgedCount` (query)
Returns count of unacknowledged messages per child

---

## MVP Design Insights to Adopt

From reviewing MVP code (lines 3847-4100):

### 1. **Multi-Child Card Layout**
```tsx
// Group by child
const childCards = children.map(child => (
  <Card key={child.id}>
    <h3>{child.name}</h3>
    <Badge>{child.sport}</Badge>
    <p>Avg Rating: {avgRating}</p>
    <p>Attendance: {attendance}%</p>
    <p>{unreadCount} unread messages</p>
  </Card>
));
```

### 2. **Latest Coach Feedback Section**
```tsx
<section className="latest-feedback">
  <h2>Latest Coach Feedback</h2>
  {recentFeedback.map(item => (
    <FeedbackCard
      playerName={item.playerName}
      sport={item.sport}
      message={item.message}
      date={item.date}
    />
  ))}
</section>
```

### 3. **Injury Summary Alerts**
```tsx
{activeInjuries > 0 && (
  <Alert variant="danger">
    <AlertCircle />
    {activeInjuries} active injuries require attention
  </Alert>
)}
```

### 4. **AI Practice Plans** (Future Enhancement)
```tsx
<section className="practice-plans">
  <Sparkles /> AI-Personalized Practice Plans
  {children.map(child => (
    <PracticePlanCard
      player={child}
      weeklyFocus={getWeakestSkill(child)}
      drills={generateDrills(child)}
    />
  ))}
</section>
```

---

## Success Metrics

### Before:
- ❌ Shows "Unknown Coach"
- ❌ Updates buried at bottom of passport
- ❌ No acknowledgment system
- ❌ No cross-child overview
- ❌ No action tracking

### After:
- ✅ Shows correct coach names
- ✅ Updates prominent at top
- ✅ One-click acknowledgment
- ✅ Unified dashboard for all children
- ✅ Clear action items
- ✅ Better visual hierarchy
- ✅ Mobile-responsive
- ✅ Read/unread tracking

---

## Timeline Estimate

| Phase | Duration | Description |
|-------|----------|-------------|
| Phase 1 | 15 min | Fix "Unknown Coach" |
| Phase 2 | 1 hour | Acknowledgment backend |
| Phase 3 | 2-3 hours | Tabbed passport updates |
| Phase 4 | 3-4 hours | Enhanced dashboard |
| Phase 5 | 1-2 hours | Visual polish |
| **TOTAL** | **7-10 hours** | Full implementation |

**Quick Win Path** (2-3 hours):
- Phase 1: Fix Unknown Coach (15 min)
- Phase 2: Add acknowledgment (1 hour)
- Phase 3: Basic tabs on passport (1.5 hours)

---

## Next Steps

1. **Immediate:** Fix "Unknown Coach" issue (15 min commit)
2. **Today:** Implement acknowledgment backend
3. **Tomorrow:** Build tabbed parent view
4. **This Week:** Enhanced parent dashboard

---

*Plan created: January 21, 2026*
*Ready for implementation*
