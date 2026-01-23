# CRITICAL: Voice Insights Privacy Audit

**Date**: January 21, 2026
**Severity**: CRITICAL - Privacy Breach
**Status**: IMMEDIATE FIX REQUIRED

---

## THE PROBLEM

**Current Implementation Shows Coach's Raw Internal Notes to Parents**

The current implementation displays the raw insight content (title, description, recommendedUpdate) directly to parents. These insights are AI-generated from coach's voice transcriptions and contain coach-internal language and observations that were NEVER intended for parent viewing.

### What's Being Shown to Parents Right Now

```typescript
// InsightCard component displays:
- insight.title            // ❌ COACH INTERNAL
- insight.description      // ❌ COACH INTERNAL
- insight.recommendedUpdate // ❌ COACH INTERNAL
```

**Example of what parents might see:**
> Title: "Clodagh struggling with left-foot passing under pressure"
> Description: "Noticed significant hesitation when closed down by defenders. Right-side bias very pronounced. Confidence issues when receiving on left."
> Recommended: "Need to work on footwork drills, possibly address confidence concerns with parents"

**This is coach's internal diary language - NOT parent-appropriate!**

---

## ROOT CAUSE ANALYSIS

### Design Flaw: Two Different Data Models Confused

#### Model 1: Raw Voice Note Insights (Coach Internal)
- **Table**: `voiceNotes.insights[]`
- **Content**: AI-generated from raw transcription
- **Language**: Coach-to-coach, clinical observations
- **Audience**: Coaches only (internal diary)
- **Fields**: `title`, `description`, `recommendedUpdate`

#### Model 2: Parent Summaries (Parent-Appropriate)
- **Table**: `coachParentSummaries`
- **Content**: AI-filtered, parent-friendly version
- **Language**: Positive, constructive, parent-appropriate
- **Audience**: Parents (shareable)
- **Fields**: `publicSummary.content` (the parent-safe version)

### The Bug

**Current Implementation:**
```typescript
// Shows RAW insights filtered by status
<InsightCard
  insight={insight}  // ❌ Raw coach-internal content
  ...
/>
```

**What It SHOULD Do:**
```typescript
// For parents: Show parent summary content
// For coaches: Show raw insight content
<InsightCard
  insight={isParent ? parentSummary.publicSummary : insight}
  ...
/>
```

---

## PHASE 4 PARENT SUMMARIES - HOW THEY WORK

**The Correct Flow (Phase 4):**
1. Coach creates voice note → AI generates insights (coach-internal)
2. AI creates **parent summary** → Safe, filtered version
3. Coach approves parent summary
4. Parents see ONLY the approved parent summary content

**Why We Have Two Versions:**
- **Private Insight**: "Struggling with confidence, anxious during drills"
- **Public Summary**: "Working on building confidence in high-pressure situations"

---

## PRIVACY VIOLATIONS IN CURRENT IMPLEMENTATION

### 1. **Wrong Data Source**
- ✅ CORRECT: Parents should see `publicSummary.content` from `coachParentSummaries`
- ❌ WRONG: Currently showing `insight.title/description` from `voiceNotes.insights`

### 2. **Missing Parent Summary Linkage**
We query parent summaries:
```typescript
const parentSummaries = useQuery(
  api.models.coachParentSummaries.getParentSummariesByChildAndSport,
  { organizationId: orgId }
);
```

But we ONLY use it to show "Shared with Parents" badge - we DON'T display the parent summary content!

### 3. **Transcription Protected (Good) But Insight Exposed (Bad)**
```typescript
// ✅ This works - transcription hidden from parents
showTranscription={canSeeTranscriptions}  // false for parents

// ❌ This doesn't work - insight content is raw coach notes
insight={insight}  // Shows coach-internal title/description
```

---

## IMMEDIATE FIX REQUIRED

### Fix 1: Separate Data Display by Role

**For Parents:**
- Query: `getParentSummariesByChildAndSport`
- Display: `publicSummary.content` ONLY
- Filter: Only show approved summaries (`status = "approved" | "delivered" | "viewed"`)
- NO raw insight content

**For Coaches/Admins:**
- Query: `getVoiceNotesForPlayer`
- Display: `insight.title`, `insight.description`, `insight.recommendedUpdate`
- Show ALL insights (pending/applied/dismissed)
- Show transcriptions

### Fix 2: Create Separate Components

**Option A: Two Different Components**
```typescript
{isParent ? (
  <ParentSummariesSection
    playerIdentityId={playerId}
    orgId={orgId}
  />
) : (
  <VoiceInsightsSection
    playerIdentityId={playerId}
    orgId={orgId}
    isCoach={isCoach}
    isAdmin={isAdmin}
  />
)}
```

**Option B: Single Component with Separate Render Paths**
```typescript
// Inside VoiceInsightsSection
if (isParent) {
  return renderParentSummaries();
} else {
  return renderCoachInsights();
}
```

### Fix 3: Parent Summary Card Component

**New Component: `ParentSummaryCard`**
- Shows: `publicSummary.content` (the parent-safe message)
- Date: `summary.createdAt`
- Coach: `summary.coachId` → coach name
- Sport: `summary.sportId` → sport name
- Sentiment: Visual indicator (positive/neutral/concern)
- NO raw insight content
- NO transcriptions
- NO recommendedUpdate

---

## DATA FLOW COMPARISON

### Current (WRONG) Flow:
```
Coach Voice Note
  ↓
AI Insights (coach-internal)
  ↓ [FILTERED BY STATUS ONLY]
Parent View ❌ (Shows coach-internal language)
```

### Correct Flow:
```
Coach Voice Note
  ↓
AI Insights (coach-internal) → Coach View ✅
  ↓
AI Parent Summary (parent-safe)
  ↓
Coach Approval
  ↓
Parent View ✅ (Shows parent-safe summary only)
```

---

## SCHEMA REFERENCE

### Parent Summaries Schema
```typescript
coachParentSummaries {
  voiceNoteId: Id<"voiceNotes">
  insightId: string  // Links to insight

  // PRIVATE (coach internal) - NEVER show to parents
  privateInsight: {
    title: string
    description: string
    category: string
    sentiment: "positive" | "neutral" | "concern"
  }

  // PUBLIC (parent-safe) - SHOW THIS to parents
  publicSummary: {
    content: string  // ← THIS is what parents should see
    confidenceScore: number
    generatedAt: number
  }

  status: "pending_review" | "approved" | "suppressed" | "delivered" | "viewed"
}
```

---

## RISK ASSESSMENT

**Severity**: CRITICAL
**Impact**: HIGH - Breaches coach-parent trust, violates privacy expectations
**Probability**: HIGH - Affects all parents viewing any player with voice notes

### Consequences if Not Fixed:
1. **Trust Breakdown**: Parents see coach's raw observations meant for internal use
2. **Legal Risk**: Privacy expectations violated
3. **User Churn**: Coaches won't use voice notes if parents see raw content
4. **Reputation Damage**: Platform seen as not protecting privacy

---

## TESTING CHECKLIST

After fix is implemented:

### Parent View Tests
- [ ] Parent sees ONLY approved parent summaries
- [ ] Parent DOES NOT see insight title/description
- [ ] Parent DOES NOT see recommendedUpdate
- [ ] Parent DOES NOT see transcriptions
- [ ] Parent DOES NOT see pending/dismissed insights
- [ ] Parent summary content is parent-appropriate language
- [ ] Empty state shows if no summaries approved yet

### Coach View Tests
- [ ] Coach sees raw insight content
- [ ] Coach sees transcriptions
- [ ] Coach sees all statuses (pending/applied/dismissed)
- [ ] Coach sees "View in Voice Notes" button
- [ ] Coach can navigate to voice notes tab

### Admin View Tests
- [ ] Admin sees same as coach (oversight capability)
- [ ] Admin can see both raw insights and parent summaries

---

## RECOMMENDED IMPLEMENTATION PRIORITY

1. **IMMEDIATE** (Today): Disable parent view of VoiceInsightsSection entirely
2. **HIGH PRIORITY** (Next 24h): Implement separate ParentSummariesSection
3. **MEDIUM** (This week): Add additional privacy safeguards and audit logging

---

## ADDITIONAL PRIVACY SAFEGUARDS

### 1. Double-Check Permission Gates
```typescript
// Add explicit safety check
if (isParent && insight.privateInsight) {
  console.error("PRIVACY VIOLATION: Attempted to show private insight to parent");
  return null;
}
```

### 2. Audit Logging
Log when parents view summaries:
```typescript
// Track what parents are shown
await ctx.db.insert("parentViewAuditLog", {
  parentUserId: user._id,
  summaryId: summary._id,
  viewedAt: Date.now(),
  contentShown: summary.publicSummary.content
});
```

### 3. Coach Warning System
When coach creates voice note, remind them:
> "Your voice transcription is private. Only approved parent summaries will be shared."

---

## RELATED PHASE 4 WORK

This implementation SHOULD have integrated with Phase 4 parent summaries:
- ✅ Phase 4 creates parent-safe versions
- ✅ Phase 4 has approval workflow
- ❌ Phase 5 (this integration) displays raw insights instead of approved summaries

**We missed the connection between the two systems!**

---

*End of Audit*
