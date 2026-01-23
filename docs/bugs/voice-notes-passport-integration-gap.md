# Voice Notes / AI Insights - Passport Integration Gap

**Status**: NOT YET INTEGRATED
**Impact**: Voice notes and AI insights are isolated from player passport view

---

## Current State Analysis

### Where Voice Notes ARE Displayed

**Location**: `/orgs/[orgId]/coach/voice-notes` (Coach Voice Notes Tab)

**What's Shown**:
- **New Tab**: Create voice notes (recorded or typed)
- **Review Tab**: Review voice notes, see AI insights
- **Parents Tab**: Approve AI-generated parent summaries

**Components**:
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/new-note-tab.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/review-tab.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/parents-tab.tsx`

### Where Voice Notes are NOT Displayed

**Location**: `/orgs/[orgId]/players/[playerId]` (Player Passport)

**What's Currently Shown Instead**:
- `NotesSection` component displays only:
  - `coachNotes` (simple text field)
  - `parentNotes` (simple text field)
  - `playerNotes` (simple text field)

**File**: `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/notes-section.tsx`

**What's MISSING**:
- ❌ No display of voice note transcriptions
- ❌ No display of AI-generated insights
- ❌ No display of coach observations/analysis
- ❌ No link to related parent summaries

---

## The Architecture Gap

### Old System (Currently in Passport)

```typescript
// Simple text fields on player/passport record
type PlayerData = {
  coachNotes?: string;      // Single text blob
  parentNotes?: string;     // Single text blob
  playerNotes?: string;     // Single text blob
};
```

**Limitations**:
- No timestamps
- No categorization
- No AI insights
- No versioning/history
- No parent sharing workflow

### New System (Voice Notes + AI)

```typescript
// Rich voice note + insights system
type VoiceNote = {
  transcription: string;
  insights: Insight[];
  coachId: string;
  date: string;
  type: "training" | "match" | "general";
};

type Insight = {
  type: "skill_rating" | "injury" | "behavior" | ...;
  title: string;
  description: string;
  category: string;
  sentiment: "positive" | "neutral" | "concern";
  // ... AI analysis fields
};

type ParentSummary = {
  privateInsight: {...};   // Coach sees this
  publicSummary: {...};    // Parent sees this
  status: "pending_review" | "approved" | ...;
};
```

**Capabilities**:
- ✅ Timestamped observations
- ✅ AI-categorized insights
- ✅ Parent-friendly summaries
- ✅ Approval workflow
- ✅ Privacy controls (private vs public)

---

## Integration Options

### Option 1: Replace NotesSection with Voice Notes Timeline

**Replace** the old `NotesSection` with a new `InsightsTimeline` that shows:
- Voice note transcriptions (coach only)
- AI insights with categories
- Private/public toggle
- Link to parent summaries

**Pros**:
- Clean migration path
- Deprecates old system
- Full feature set available

**Cons**:
- Breaking change for existing notes
- Need to migrate old text notes

### Option 2: Add "AI Insights" Tab to Passport

**Keep** NotesSection for legacy notes
**Add** new "AI Insights" tab with voice notes

**Pros**:
- Non-breaking
- Gradual migration
- Both systems coexist

**Cons**:
- More complex UI
- Duplicate "notes" concept

### Option 3: Merge into Enhanced NotesSection

**Enhance** existing NotesSection to show:
- Legacy notes (if they exist)
- Voice notes timeline
- AI insights cards
- Parent summary status

**Pros**:
- Single notes view
- Backwards compatible
- Unified experience

**Cons**:
- Complex component
- Harder to maintain

---

## Recommended Approach

**Phase 1** (Quick Win - 2 hours):
- Add "Coach Insights" tab to player passport
- Show voice notes for this player only
- Read-only view (coach can see their own notes)
- Link to voice notes page for editing

**Phase 2** (Full Integration - 1 day):
- Create `InsightsTimeline` component
- Replace `NotesSection` with enhanced version
- Migrate old text notes to voice notes system
- Add parent summary status indicators

**Phase 3** (Polish - half day):
- Add inline editing capabilities
- Add filtering by category/date
- Add export functionality
- Add insights analytics

---

## Missing Queries

To display voice notes in passport, we need new backend queries:

### Query 1: Get Player Voice Notes

```typescript
export const getPlayerVoiceNotes = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.array(voiceNoteValidator),
  handler: async (ctx, args) => {
    // Get all voice notes mentioning this player
    // Filter by insights.playerIdentityId
    // Return with transcription + insights
  },
});
```

### Query 2: Get Player AI Insights

```typescript
export const getPlayerInsights = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    category: v.optional(v.string()), // Filter by category
  },
  returns: v.array(insightValidator),
  handler: async (ctx, args) => {
    // Get all AI insights for this player
    // From all voice notes
    // Categorized and timestamped
  },
});
```

### Query 3: Get Related Parent Summaries

```typescript
export const getPlayerParentSummaries = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.array(parentSummaryValidator),
  handler: async (ctx, args) => {
    // Get parent summaries for this player
    // Show approval status
    // Link to parent view
  },
});
```

---

## React Suspense Error (SEPARATE ISSUE)

**Error**: `We are cleaning up async info that was not on the parent Suspense boundary`

**File**: `/orgs/[orgId]/players/[playerId]/page.tsx`

**Root Cause**: The `useEffect` for redirect (lines 67-95) has dependencies that change on every render:

```typescript
useEffect(() => {
  // ... redirect logic
}, [
  roleDetails,           // ← Object reference changes
  ownPlayerIdentity,     // ← Object reference changes
  orgId,
  playerId,
  router.replace,        // ← Function reference
]);
```

**The Problem**:
1. `roleDetails` and `ownPlayerIdentity` are Convex queries
2. Every time they re-fetch, they return new object instances
3. useEffect triggers on every query update
4. React detects async cleanup happening outside Suspense boundary
5. Warning appears

**The Fix**:

```typescript
useEffect(() => {
  if (hasAttemptedRedirect.current) {
    return;
  }

  if (!roleDetails || ownPlayerIdentity === undefined) {
    return;
  }

  const hasPlayerRole = roleDetails.functionalRoles?.includes("player");
  const isOwnProfile = ownPlayerIdentity?._id === playerId;

  if (hasPlayerRole && isOwnProfile) {
    hasAttemptedRedirect.current = true;
    router.replace(`/orgs/${orgId}/player` as Route);
  }
}, [
  roleDetails?.functionalRoles,    // ✅ Depend on specific field
  ownPlayerIdentity?._id,           // ✅ Depend on specific field
  orgId,
  playerId,
  // router.replace,                // ❌ Remove function reference
]);
```

**Alternative Fix** (Better):

```typescript
// Move redirect logic to separate useMemo/useCallback
const shouldRedirect = useMemo(() => {
  if (!roleDetails || ownPlayerIdentity === undefined) {
    return false;
  }

  const hasPlayerRole = roleDetails.functionalRoles?.includes("player");
  const isOwnProfile = ownPlayerIdentity?._id === playerId;

  return hasPlayerRole && isOwnProfile;
}, [
  roleDetails?.functionalRoles,
  ownPlayerIdentity?._id,
  playerId,
]);

useEffect(() => {
  if (hasAttemptedRedirect.current || !shouldRedirect) {
    return;
  }

  hasAttemptedRedirect.current = true;
  router.replace(`/orgs/${orgId}/player` as Route);
}, [shouldRedirect, orgId, router]);
```

---

## Summary

### Voice Notes Integration
**Status**: ❌ NOT INTEGRATED into player passport
**Workaround**: View voice notes in coach's Voice Notes tab
**Recommendation**: Add "Coach Insights" tab to passport (Phase 1)

### Suspense Error
**Status**: ⚠️ Warning (non-breaking)
**Cause**: useEffect dependency array with object references
**Fix**: Depend on specific fields, not whole objects

**Priority**:
1. Fix Suspense error (15 minutes) ← Non-breaking fix
2. Add voice notes query (30 minutes) ← Backend work
3. Create Insights tab (2 hours) ← Frontend integration

---

*Analysis created: January 21, 2026*
