# Review Microsite UX Improvements (2026-02-09)

## Overview

Comprehensive UX review and improvement plan for the WhatsApp review microsite (`/r/[code]`) based on analysis of current implementation and comparison with desktop voice notes functionality.

## Current State Analysis

### Review Microsite (`/r/[code]`)
- **Purpose**: Code-based auth for coaches to review voice note insights from WhatsApp
- **Sections**: Injuries, Unmatched Players, Needs Review, TODOs, Team Notes, Auto-Applied, Recently Reviewed
- **Key Components**:
  - `review-queue.tsx` - Main queue orchestrator
  - `unmatched-player-card.tsx` - Fuzzy player matching UI
  - `quick-review-header.tsx` - Header with stats

### Desktop Voice Notes (`/coach/voice-notes`)
- **Purpose**: Full-featured voice notes management for authenticated coaches
- **Tabs**: New, Parents, Insights, Drafts, Team, Sent to Parents, History, My Impact
- **Key Features**:
  - `SwipeableInsightCard` - Mobile-friendly swipe gestures
  - `InsightReactions` - Phase 9 reactions system
  - `SmartActionBar` - AI Copilot (Phase 9 Week 2)
  - Multiple dialogs for player assignment, team assignment, editing

## Critical UX Issues

### 1. Unmatched Players: Unnecessary Click Friction

**Current Flow:**
1. User sees fuzzy-matched radio suggestions
2. If name not in list, user clicks "Someone else..." button
3. Text input appears
4. User types name → searches → selects

**Problem:**
- Extra click creates friction
- "Someone else..." click is almost always needed for manual search
- No autocomplete as user types
- Search only triggers after full name entry

**Solution:**
```typescript
// Remove "Someone else..." button entirely
// Always show text input with live autocomplete

<div className="space-y-2">
  {/* Live search input always visible */}
  <div>
    <Label>Search for player</Label>
    <Input
      value={searchQuery}
      onChange={(e) => handleSearchChange(e.target.value)}
      placeholder="Start typing player name..."
      autoFocus
    />
  </div>

  {/* Suggestions from findSimilarPlayersForReview */}
  {searchQuery.length >= 2 && (
    <div className="space-y-1.5">
      {suggestions.map(player => (
        <SuggestionRadio
          key={player.playerId}
          onClick={() => onSelectPlayer(player.playerId)}
          selected={selectedPlayerId === player.playerId}
          suggestion={player}
        />
      ))}
    </div>
  )}
</div>
```

**Benefits:**
- Immediate autocomplete as coach types
- No extra click required
- Suggestions update live via `findSimilarPlayersForReview` query
- Matches desktop insights tab UX pattern

### 2. Entity Assignment Editing: No Ability to Change

**Current Limitation:**
- Insights are categorized by AI as player/team/todo
- If AI miscategorizes (e.g., player insight marked as team), coach cannot fix it
- No way to reassign insight to different player if AI matched wrong person
- No way to change team assignment
- No way to recategorize insight

**Desktop Comparison:**
Desktop insights tab has dedicated dialogs for:
- **Player Assignment**: `AssigningInsight` modal with search/dropdown
- **Team Assignment**: `AssigningTeamInsight` modal with team dropdown
- **Coach Assignment**: `AssigningCoachInsight` modal for TODOs
- **Classification**: `ClassifyingInsight` modal to change category

**Solution:**
Add "Edit Assignment" button to each insight card:

```typescript
// Add to each card type (matched, unmatched, team, todo)
<Button
  variant="outline"
  size="sm"
  onClick={() => setEditingAssignment({
    voiceNoteId,
    insightId,
    currentType: 'player', // or 'team', 'todo'
    currentEntityId: playerIdentityId,
  })}
>
  <Pencil className="mr-1 h-3.5 w-3.5" />
  Edit Assignment
</Button>

// New EditAssignmentDialog component
<EditAssignmentDialog
  open={!!editingAssignment}
  onOpenChange={() => setEditingAssignment(null)}
  insight={editingAssignment}
  code={code}
  coachPlayers={coachPlayers} // from findSimilarPlayersForReview
  coachTeams={coachTeams}     // new query needed
  onSave={handleReassign}
/>
```

**New Backend Mutation Needed:**
```typescript
export const reassignInsightEntity = mutation({
  args: {
    code: v.string(),
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(),
    entityType: v.union(
      v.literal("player"),
      v.literal("team"),
      v.literal("todo"),
      v.literal("uncategorized")
    ),
    playerIdentityId: v.optional(v.id("playerIdentities")),
    teamId: v.optional(v.string()),
    assigneeUserId: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ success: v.literal(false), reason: v.string() })
  ),
  handler: async (ctx, args) => {
    // 1. Validate code + scope
    // 2. Update insight entity assignment
    // 3. Clear mismatched fields (e.g., clear teamId when switching to player)
    // 4. Log analytics event
  },
});
```

### 3. Mobile Gesture Support: Missing in Microsite

**Desktop Has:**
- `SwipeableInsightCard` with swipe-to-apply and swipe-to-dismiss
- Mobile-optimized touch gestures
- Visual feedback on swipe

**Microsite Has:**
- Only button-based interactions
- No swipe gestures
- Less efficient on mobile

**Solution:**
Import and adapt `SwipeableReviewCard` from review-queue.tsx (already exists!) to all insight cards.

### 4. Batch Actions: Limited in Microsite

**Desktop Has:**
- Bulk apply ready insights
- Batch dismiss
- "Apply All Ready" smart action

**Microsite Has:**
- Only "Approve All" in needsReview section
- No batch dismiss
- No smart suggestions

**Solution:**
Add batch action bar at section level:

```typescript
{/* Batch Actions for matched insights */}
{needsReview.length > 0 && (
  <div className="mb-3 flex gap-2">
    <Button
      onClick={() => handleBatchApply(needsReview)}
      disabled={batchApplying}
    >
      <CheckCircle className="mr-1 h-4 w-4" />
      Apply All ({needsReview.length})
    </Button>
    <Button
      onClick={() => handleBatchDismiss(needsReview)}
      variant="outline"
    >
      <XCircle className="mr-1 h-4 w-4" />
      Dismiss All
    </Button>
  </div>
)}
```

### 5. Insight Reactions: Desktop-Only Feature

**Desktop Has:**
- Phase 9 Week 1: Insight reactions (👍/👎/❤️/🎯)
- Phase 9 Week 2: Smart Action Bar with AI Copilot
- Real-time reaction counts
- Social proof for insights

**Microsite Has:**
- No reactions
- No AI copilot
- Less engagement

**Solution:**
Add `InsightReactions` component to microsite cards (requires voiceNoteInsights records).

**Challenge:**
Microsite uses embedded insights (not voiceNoteInsights table), so need to:
1. Ensure voiceNoteInsights records exist for all insights
2. Pass correct Convex ID to InsightReactions component
3. Consider creating records on-demand if missing

### 6. Timestamp Display: Already Fixed ✅

**Status:** FIXED in commit 21ac3794
- Timestamps now show in Unmatched Players section
- Format matches review-queue.tsx implementation

### 7. Empty States: Missing Context

**Current:**
- Sections disappear when empty
- No guidance on what comes next

**Solution:**
Add helpful empty states:

```typescript
{unmatched.length === 0 && (
  <Empty>
    <EmptyContent>
      <EmptyMedia variant="icon">
        <CheckCircle className="h-6 w-6" />
      </EmptyMedia>
      <EmptyTitle>All players matched! 🎉</EmptyTitle>
      <EmptyDescription>
        All insights have been successfully matched to players in your roster.
      </EmptyDescription>
    </EmptyContent>
  </Empty>
)}
```

### 8. Trust Level Indicators: Missing in Microsite

**Desktop Has:**
- `TrustLevelIcon` showing coach trust level
- `TrustNudgeBanner` for progression nudges
- Visual confidence scores on insights
- "Would Auto-Apply" predictions

**Microsite Has:**
- No trust level visibility
- No confidence scores
- No auto-apply predictions

**Solution:**
Add trust level indicator to quick-review-header.tsx and confidence badges to insight cards.

## Inspiration from Desktop Insights Tab

### What Works Well on Desktop:

1. **Search & Filter**:
   - Real-time player search with dropdown
   - Category filtering
   - Status filtering (pending/applied/dismissed)

2. **Multi-Modal Assignment**:
   - Dedicated dialogs for each entity type
   - Clear separation of player/team/todo flows
   - Validation before assignment

3. **Visual Hierarchy**:
   - Color-coded cards by type (matched=blue, unmatched=amber, uncategorized=orange)
   - Clear badges for status and category
   - Progressive disclosure (expand for details)

4. **Smart Actions**:
   - AI-powered recommendations
   - Bulk actions with smart suggestions
   - Undo for auto-applied insights

### What to Bring to Microsite:

| Feature | Desktop | Microsite | Priority |
|---------|---------|-----------|----------|
| Live autocomplete search | ✅ | ❌ | **P0** |
| Edit entity assignment | ✅ | ❌ | **P0** |
| Swipe gestures | ✅ | ✅ (partial) | **P1** |
| Batch actions | ✅ | ⚠️ (limited) | **P1** |
| Insight reactions | ✅ | ❌ | **P2** |
| Smart action bar | ✅ | ❌ | **P2** |
| Trust level indicators | ✅ | ❌ | **P2** |
| Empty states | ✅ | ❌ | **P3** |

## Implementation Plan

### Phase 1: Critical UX Fixes (P0 - This Week)

#### US-RMS-001: Direct Autocomplete Search (Unmatched Players)
**Effort:** 2 hours
**Files:**
- `apps/web/src/app/r/[code]/unmatched-player-card.tsx`

**Changes:**
- Remove "Someone else..." button click requirement
- Always show text input at top of suggestions
- Trigger `findSimilarPlayersForReview` on every keystroke (debounced)
- Auto-focus search input
- Clear selected radio when search changes

**Acceptance Criteria:**
- [ ] Text input visible by default (no click needed)
- [ ] Suggestions update as user types (>= 2 chars)
- [ ] Debounced to avoid excessive queries (300ms)
- [ ] Radio suggestions still show initial fuzzy matches
- [ ] Search results replace radio suggestions when typing

#### US-RMS-002: Edit Entity Assignment
**Effort:** 6 hours
**Files:**
- `apps/web/src/app/r/[code]/review-queue.tsx` - Add edit buttons to all cards
- `apps/web/src/app/r/[code]/edit-assignment-dialog.tsx` - NEW component
- `packages/backend/convex/models/whatsappReviewLinks.ts` - NEW mutation

**Changes:**
- Add "Edit Assignment" button to matched-insight, unmatched-player, team-note, todo cards
- Create `EditAssignmentDialog` component with tabs for Player/Team/TODO
- Implement `reassignInsightEntity` mutation
- Support changing entity type (player → team, team → player, etc.)
- Validate assignments (e.g., can't assign injury insight to team)

**Acceptance Criteria:**
- [ ] Edit button visible on all insight cards
- [ ] Dialog shows current assignment
- [ ] Can switch entity type via tabs
- [ ] Can search/select new player/team/assignee
- [ ] Mutation clears incompatible fields (e.g., clear teamId when switching to player)
- [ ] Analytics event logged for reassignment
- [ ] Toast confirmation on success

### Phase 2: Enhanced Interactions (P1 - Next Week)

#### US-RMS-003: Batch Actions Enhancement
**Effort:** 3 hours
- Add batch dismiss for all sections
- Add "Clear Reviewed" button
- Confirmation dialogs for batch operations

#### US-RMS-004: Improved Mobile Gestures
**Effort:** 2 hours
- Ensure SwipeableReviewCard works on all card types
- Add visual swipe indicators
- Haptic feedback on mobile (if supported)

### Phase 3: Engagement Features (P2 - Future)

#### US-RMS-005: Insight Reactions
**Effort:** 4 hours
- Add InsightReactions component to microsite
- Ensure voiceNoteInsights records exist
- Show reaction counts

#### US-RMS-006: Trust Level Indicators
**Effort:** 3 hours
- Add trust level badge to header
- Show confidence scores on insights
- Add "Would Auto-Apply" indicators

### Phase 4: Polish (P3 - Future)

#### US-RMS-007: Empty States
**Effort:** 2 hours
- Add empty state components to all sections
- Contextual guidance messages
- Celebration states (e.g., "All matched!")

#### US-RMS-008: Smart Action Bar
**Effort:** 5 hours
- Integrate AI Copilot (Phase 9 Week 2)
- AI-powered suggestions
- Context-aware quick actions

## Technical Considerations

### Backend Mutations Needed:

1. **reassignInsightEntity** (US-RMS-002)
   - Path: `packages/backend/convex/models/whatsappReviewLinks.ts`
   - Signature: See "New Backend Mutation Needed" section above
   - Complexity: Medium (validate scope, update insight, clear incompatible fields)

2. **batchDismissInsightsFromReview** (US-RMS-003)
   - Path: `packages/backend/convex/models/whatsappReviewLinks.ts`
   - Signature: Similar to `batchApplyInsightsFromReview`
   - Complexity: Low (copy pattern from batchApply)

### Frontend Components Needed:

1. **EditAssignmentDialog** (US-RMS-002)
   - Path: `apps/web/src/app/r/[code]/edit-assignment-dialog.tsx`
   - Dependencies: Tabs, RadioGroup, Input, Button
   - Complexity: Medium (tabs for player/team/todo, search, validation)

2. **EnhancedBatchActionBar** (US-RMS-003)
   - Path: `apps/web/src/app/r/[code]/batch-action-bar.tsx`
   - Dependencies: Button, AlertDialog (for confirmation)
   - Complexity: Low (buttons + confirmation)

### Queries Needed:

1. **getCoachTeamsForReview** (US-RMS-002)
   - Path: `packages/backend/convex/models/whatsappReviewLinks.ts`
   - Purpose: Get coach's teams for team assignment dropdown
   - Signature:
   ```typescript
   export const getCoachTeamsForReview = query({
     args: { code: v.string() },
     returns: v.union(
       v.array(v.object({
         teamId: v.string(),
         teamName: v.string(),
         sport: v.optional(v.string()),
         ageGroup: v.optional(v.string()),
       })),
       v.null()
     ),
     handler: async (ctx, args) => {
       // 1. Validate code
       // 2. Get coach's team assignments
       // 3. Return team list
     },
   });
   ```

### Performance Considerations:

- **Debounce autocomplete search**: 300ms delay to avoid query spam
- **Batch operations**: Use Promise.all for parallel updates
- **Optimistic UI**: Update UI immediately, rollback on error
- **Loading states**: Show spinners for all async operations

### Mobile Considerations:

- **Touch targets**: Min 44x44px for buttons (already handled by shadcn)
- **Swipe gestures**: Already implemented in SwipeableReviewCard
- **Viewport**: Test at 375px width (iPhone SE)
- **Keyboard**: Auto-focus search input, dismiss keyboard on selection

## Testing Strategy

### Manual Testing:

1. **Unmatched Players Flow**:
   - [ ] Type 2 characters → suggestions appear
   - [ ] Type more characters → suggestions update
   - [ ] Select suggestion → assign works
   - [ ] Type wrong name → no suggestions, clear message

2. **Edit Assignment Flow**:
   - [ ] Click edit on player insight → dialog opens with player tab
   - [ ] Switch to team tab → can select team
   - [ ] Save → insight reassigned, card updates
   - [ ] Click edit on team insight → dialog opens with team tab

3. **Batch Actions Flow**:
   - [ ] Select multiple insights (future)
   - [ ] Click "Apply All" → confirmation → all applied
   - [ ] Click "Dismiss All" → confirmation → all dismissed

4. **Mobile Gestures**:
   - [ ] Swipe right → apply insight
   - [ ] Swipe left → dismiss insight
   - [ ] Half-swipe → preview action, release → cancel

### E2E Tests (Playwright):

```typescript
// apps/web/uat/tests/review-microsite-ux.spec.ts

test("Unmatched player: direct autocomplete search", async ({ page }) => {
  // Navigate to review link
  await page.goto("/r/QRqJu96g");

  // Find unmatched player card
  const unmatchedSection = page.locator('[data-testid="unmatched-section"]');

  // Search input should be visible (no click needed)
  const searchInput = unmatchedSection.locator('input[placeholder*="Start typing"]');
  await expect(searchInput).toBeVisible();

  // Type player name
  await searchInput.fill("Sha");

  // Wait for suggestions to load
  await page.waitForTimeout(400); // debounce

  // Suggestions should appear
  const suggestions = unmatchedSection.locator('[data-testid="player-suggestion"]');
  await expect(suggestions).toHaveCount(1, { greaterThan: 0 });

  // Click first suggestion
  await suggestions.first().click();

  // Assign button should be enabled
  const assignBtn = unmatchedSection.locator('button:has-text("Assign")');
  await expect(assignBtn).toBeEnabled();
});

test("Edit entity assignment: player to team", async ({ page }) => {
  // Navigate to review link
  await page.goto("/r/QRqJu96g");

  // Find matched insight (wrongly assigned to player)
  const matchedSection = page.locator('[data-testid="needs-review-section"]');
  const firstCard = matchedSection.locator('[data-testid="insight-card"]').first();

  // Click edit assignment button
  await firstCard.locator('button:has-text("Edit Assignment")').click();

  // Dialog should open
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  // Switch to Team tab
  await dialog.locator('button:has-text("Team")').click();

  // Select a team
  const teamRadio = dialog.locator('[data-testid="team-radio"]').first();
  await teamRadio.click();

  // Save
  await dialog.locator('button:has-text("Save")').click();

  // Dialog should close
  await expect(dialog).not.toBeVisible();

  // Card should now show team badge
  await expect(firstCard.locator('text=Team:')).toBeVisible();
});
```

## Success Metrics

### User Experience:
- **Unmatched assignment time**: Reduce from ~15s to ~5s (66% improvement)
- **Entity reassignment errors**: Reduce from "not possible" to < 5% error rate
- **Mobile completion rate**: Increase from 60% to 85% (swipe gestures)
- **Batch action usage**: Track adoption rate (target 40% of sessions)

### Technical:
- **Query count**: No increase (debouncing prevents spam)
- **Mutation success rate**: > 95% for reassignInsightEntity
- **Mobile performance**: No jank, 60fps swipe animations
- **Error rate**: < 1% for all new operations

### Coach Feedback:
- "Autocomplete is much faster than clicking 'Someone else'"
- "I can finally fix AI mistakes without going to desktop"
- "Swipe gestures make mobile review feel natural"
- "Batch actions save me 5 minutes per session"

## Risks & Mitigations

### Risk 1: Query Performance (Autocomplete)
**Impact:** Debounced autocomplete may still cause query spam if not implemented correctly
**Mitigation:**
- Use React useDebounce hook (300ms)
- Skip query if search string < 2 chars
- Cancel pending queries on unmount

### Risk 2: Entity Reassignment Complexity
**Impact:** Reassigning entity type may leave insights in invalid state
**Mitigation:**
- Validate entity type + category combinations (e.g., injury must have player)
- Clear incompatible fields (e.g., clear teamId when switching to player)
- Add server-side validation
- Log analytics events for all reassignments to catch patterns

### Risk 3: Mobile Keyboard Issues
**Impact:** Keyboard may cover search results on small screens
**Mitigation:**
- Use `ScrollView` to ensure results visible
- Add `keyboardShouldPersistTaps="handled"` on iOS
- Test on iPhone SE (smallest target device)

### Risk 4: Batch Operation Errors
**Impact:** Batch apply/dismiss may partially fail, leaving inconsistent state
**Mitigation:**
- Use transaction-like pattern (revert all on any failure)
- Show detailed error messages (e.g., "Applied 8 of 10 insights")
- Add retry button for failed operations

## References

- US-VN-009: WhatsApp Review Links
- US-VN-010: Phase 2 Unmatched Player Card
- Phase 9 Week 1: Insight Reactions
- Phase 9 Week 2: Smart Action Bar (AI Copilot)
- Desktop Insights Tab: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`
- Review Queue: `apps/web/src/app/r/[code]/review-queue.tsx`
- Unmatched Player Card: `apps/web/src/app/r/[code]/unmatched-player-card.tsx`

## Related Documentation

- `docs/architecture/voice-notes-phase-2-whatsapp.md` - WhatsApp integration architecture
- `docs/architecture/irish-name-aliases-expansion.md` - Fuzzy matching improvements
- `docs/architecture/review-microsite-ux-improvements.md` - **This document**

## Change Log

- **2026-02-09**: Initial UX review and improvement plan created
- **Next**: Implement US-RMS-001 and US-RMS-002 (Phase 1 - Critical Fixes)
