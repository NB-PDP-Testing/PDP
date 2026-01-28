# Phase 7.1 Prerequisites - Already Completed

**Date**: 2026-01-25
**Branch**: `phase7/prerequisites-insight-auto-apply`
**Status**: ✅ Prerequisites merged into this branch

---

## What's Already Done

### US-001: Schema Fields (100% Complete)

The following fields were already added to `coachTrustLevels` table in the prerequisite work:

```typescript
// packages/backend/convex/schema.ts (lines 2089-2108)

// Phase 7: Insight auto-apply tracking (separate from parent summaries)
insightPreviewModeStats: v.optional(
  v.object({
    wouldAutoApplyInsights: v.number(),
    coachAppliedThose: v.number(),
    coachDismissedThose: v.number(),
    agreementRate: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
),
insightConfidenceThreshold: v.optional(v.number()), // Default 0.7
insightAutoApplyPreferences: v.optional(
  v.object({
    skills: v.boolean(),
    attendance: v.boolean(),
    goals: v.boolean(),
    performance: v.boolean(),
  })
)
```

**Impact**: US-001 acceptance criteria are already met. Ralph can skip this story or mark it complete immediately.

### Additional Prerequisite Work

1. **`voiceNoteInsights` Table**
   - Extracted insights from embedded array to dedicated table
   - Added `confidenceScore: v.number()` field
   - Added `wouldAutoApply: v.boolean()` field (for Phase 7.1 preview mode)
   - Status tracking with `auto_applied` option

2. **`autoAppliedInsights` Audit Trail**
   - Full audit trail table for Phase 7.2
   - Tracks `targetRecordId` for knowledge graph integration
   - 1-hour undo window support

3. **AI Confidence Scoring**
   - Updated `voiceNotes.ts` action to generate confidence scores
   - Zod schema includes confidence field
   - Default fallback to 0.7 if AI doesn't provide score

4. **Migration Completed**
   - All existing insights migrated to `voiceNoteInsights` table
   - 40 insights migrated successfully
   - Default confidence 0.7 for historical data

### Types Generated

All new tables have TypeScript types generated via `npx convex codegen`.

---

## What Ralph Needs to Do

### Phase 7.1 Remaining Stories

| Story | Status | Work Required |
|-------|--------|---------------|
| US-001 | ✅ DONE | Schema fields already added in prerequisites |
| US-002 | 🔨 TODO | Add `wouldAutoApply` calculation to queries |
| US-003 | 🔨 TODO | Add confidence visualization to insight cards (frontend) |
| US-004 | 🔨 TODO | Add preview mode prediction badge (frontend) |
| US-005 | 🔨 TODO | Track preview mode statistics when coaches apply/dismiss |

### Key Notes for Ralph

1. **US-001 is Complete**: The PRD says to add schema fields, but they're already there. Ralph should verify and move on.

2. **voiceNoteInsights Table Exists**: The PRD assumes insights are in an embedded array, but we've already extracted them to `voiceNoteInsights` table with indexes.

3. **Confidence Scores Available**: All insights have `confidenceScore` field (0.7 default for historical, AI-generated for new ones).

4. **Frontend Files to Modify**:
   - `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`
   - Individual insight card components (skill, attendance, goal, etc.)

5. **Backend Files to Modify**:
   - Create or update `packages/backend/convex/models/voiceNoteInsights.ts`
   - Queries: `getPendingInsights`, `applyInsight`, `dismissInsight`
   - Import from `coachTrustLevels` for trust level calculation

---

## Expected Ralph Workflow

### Step 1: Verify Prerequisites (Quick)
- Check schema has `insightPreviewModeStats` and `insightConfidenceThreshold`
- Mark US-001 as complete

### Step 2: Backend - wouldAutoApply Logic (US-002)
- Create/update `getPendingInsights` query in `voiceNoteInsights.ts`
- Add trust level calculation per insight
- Return `wouldAutoApply: boolean` field

### Step 3: Frontend - Confidence Visualization (US-003)
- Find insight card components
- Add confidence progress bar and percentage
- Color-code: Red <60%, Amber 60-79%, Green 80%+

### Step 4: Frontend - Preview Badge (US-004)
- Add "AI would auto-apply this" badge for high-confidence insights
- Show on cards where `wouldAutoApply = true`

### Step 5: Backend - Preview Tracking (US-005)
- Update `applyInsight` mutation to track preview stats
- Update `dismissInsight` mutation similarly
- Increment counters, calculate agreement rate
- Mark preview mode complete after 20 insights

---

## Files Ralph Should Read First

1. **Schema**: `packages/backend/convex/schema.ts` (lines 1439-1560, 2089-2108)
   - See `voiceNoteInsights` table structure
   - See `coachTrustLevels` preview mode fields

2. **Migration**: `packages/backend/convex/migrations/extractInsightsToTable.ts`
   - Understand how insights were extracted from embedded arrays

3. **AI Action**: `packages/backend/convex/actions/voiceNotes.ts`
   - See how confidence scores are generated

4. **Existing Frontend**: Look for existing voice note insight components
   - May already have insight cards that need enhancement

---

## Testing Checklist for Phase 7.1

After Ralph completes Phase 7.1:

- [ ] US-001: Schema fields exist (already verified)
- [ ] US-002: `getPendingInsights` returns `wouldAutoApply` boolean
- [ ] US-003: Insight cards show confidence percentage and progress bar
- [ ] US-004: High-confidence insights show "AI would auto-apply" badge
- [ ] US-005: Applying/dismissing insights increments preview mode counters
- [ ] US-005: After 20 insights, preview mode marked complete
- [ ] Type check passes: `npm run check-types`
- [ ] Linting passes: `npx ultracite fix`

---

**Ready for Ralph Phase 7.1 Execution** 🚀

Branch: `phase7/prerequisites-insight-auto-apply` (base)
New Branch: `ralph/coach-insights-auto-apply-p7-phase1` (for Phase 7.1 work)

---

**Prepared by**: Claude Sonnet 4.5
**Date**: 2026-01-25
