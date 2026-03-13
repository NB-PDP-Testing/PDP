# Voice Notes UX Button & Action Map

**Created:** 2026-03-13
**Source:** [Comprehensive Audit](../../audit/voice-insights-comprehensive-audit.md)
**Related Issues:** #639 (button confusion), #618 (apply without assignment)

---

## Summary Table

| Component | Button Label | Mutation | Visibility Condition | Line |
|-----------|-------------|----------|---------------------|------|
| InsightsTab (Pending) | Apply | `updateInsightStatus` | status="pending" && !needsAction | :1116 |
| InsightsTab (Pending) | Dismiss | `updateInsightStatus` | status="pending" | :1135 |
| InsightsTab (Pending) | Edit | `updateInsightContent` | Always | :1106 |
| InsightsTab (Needs) | Assign Player | `assignPlayerToInsight` | isUnmatched | :1019 |
| InsightsTab (Needs) | Classify | `classifyInsight` | isUncategorized | :1037 |
| InsightsTab (Needs) | Assign Team | `classifyInsight` | isTeamWithoutTeamId | :1055 |
| InsightsTab (Needs) | Assign Coach | `classifyInsight` | isTodoWithoutAssignee | :1074 |
| InsightsTab (Ready) | Bulk Apply | `bulkApplyInsights` | readyToApplyCount > 1 | :1249 |
| InsightsTab (Auto) | Undo | `undoAutoAppliedInsight` | canUndo && elapsed < 1h | :1410 |
| AutoApprovedTab | Restrict/Allow | `setNoteChildRestriction` | Always | :547 |
| AutoApprovedTab | Revoke | `revokeSummary` | isRevocable=true | :574 |
| DraftsTab | Confirm | `confirmDraft` | Always | :410 |
| DraftsTab | Reject | `rejectDraft` | Always | :397 |
| DraftsTab | Confirm All | `confirmAllDrafts` | Always | :247 |
| DraftsTab | Reject All | `rejectAllDrafts` | Always | :262 |
| TeamInsightsTab | Apply to Profile | `updateInsightStatus` | status="pending" | :379 |
| TeamInsightsTab | Dismiss | `updateInsightStatus` | status="pending" | :394 |
| SummaryApprovalCard | Approve & Share | `approveSummary` | Always | :309 |
| SummaryApprovalCard | Don't Share | `suppressSummary` | Always | :327 |
| InjuryApprovalCard | Edit | sets editing state | !isEditing | :210 |
| InjuryApprovalCard | Save | `editSummaryContent` | isEditing | :229 |
| InjuryApprovalCard | Approve & Share | `approveInjurySummary` | canApprove (3 checkboxes) | :364 |
| InjuryApprovalCard | Don't Share | `suppressSummary` | Always | :382 |
| BehaviorApprovalCard | Edit | sets editing state | !isEditing | :202 |
| BehaviorApprovalCard | Save | `editSummaryContent` | isEditing | :221 |
| BehaviorApprovalCard | Approve & Share | `approveSummary` | !editing | :299 |
| BehaviorApprovalCard | Don't Share | `suppressSummary` | Always | :317 |

---

## InsightsTab (insights-tab.tsx)

**File:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`
**Lines:** ~2102 | **Mutations registered:** lines 242-263

### Mutations Used

| Mutation | API | Line |
|----------|-----|------|
| `updateInsightStatus` | `api.models.voiceNotes.updateInsightStatus` | 242 |
| `updateInsightContent` | `api.models.voiceNotes.updateInsightContent` | 245 |
| `assignPlayerToInsight` | `api.models.voiceNotes.assignPlayerToInsight` | 248 |
| `classifyInsight` | `api.models.voiceNotes.classifyInsight` | 251 |
| `bulkApplyInsights` | `api.models.voiceNotes.bulkApplyInsights` | 252 |
| `undoAutoAppliedInsight` | `api.models.voiceNoteInsights.undoAutoAppliedInsight` | 255 |

### Apply (Pending Insights)

- **Line:** 1116 | **Icon:** CheckCircle
- **Handler:** `handleApplyInsight()` (lines 509-541) -> `updateInsightStatus({ status: "applied" })`
- **Visibility:** `insight.status === "pending"`
- **Disabled when:** `needsAction` is true (unmatched player, unassigned team/todo, or uncategorized)
- **Disabled tooltip:** Context-specific message ("Assign player first", "Select team first", etc.)

### Dismiss (Pending Insights)

- **Line:** 1135 | **Icon:** XCircle
- **Handler:** `handleDismissInsight()` (lines 543-558) -> `updateInsightStatus({ status: "dismissed" })`
- **Visibility:** `insight.status === "pending"`
- **Disabled when:** Never (always dismissable)

### Edit (Pending Insights)

- **Line:** 1106 | **Icon:** Pencil
- **Handler:** Opens edit dialog -> `updateInsightContent()` on save (line ~1615)
- **Visibility:** Always shown for pending insights
- **Opens:** Edit Dialog (lines 1547-1628) with title + description textarea

### Assign Player (Needs Attention - Unmatched)

- **Line:** 1019 | **Icon:** UserPlus
- **Handler:** `handleAssignPlayer()` (lines 269-295) -> `assignPlayerToInsight()`
- **Visibility:** `isUnmatched && needsAttention`
- **Opens:** Player search dialog (lines 1631-1716) with searchable player list

### Classify (Needs Attention - Uncategorized)

- **Line:** 1037
- **Handler:** Opens classify dialog -> `classifyInsight()`
- **Visibility:** `isUncategorized`
- **Opens:** Dialog with 3 tabs: Team Insight, Todo, Other (lines 1994-2092)

### Assign Team (Team Culture without Team)

- **Line:** 1055
- **Handler:** `handleAssignTeam()` (lines 297-319) -> `classifyInsight({ category: "team_culture" })`
- **Visibility:** `isTeamWithoutTeamId`
- **Opens:** Team selection dialog (lines 1719-1798)

### Assign Coach (Todo without Assignee)

- **Line:** 1074
- **Handler:** `handleAssignCoach()` (lines 321-349) -> `classifyInsight({ category: "todo" })`
- **Visibility:** `isTodoWithoutAssignee`
- **Opens:** Coach selection dialog (lines 1800-1954)

### Bulk Apply (Ready to Apply Section)

- **Line:** 1249
- **Label:** "Apply All ({readyToApplyCount})"
- **Handler:** `handleBulkApply()` (lines 560-589) -> `bulkApplyInsights()`
- **Visibility:** `readyToApplyCount > 1`
- **Loading state:** Spinner + "Applying..."

### Undo (Auto-Applied Tab)

- **Line:** 1410
- **Label:** "Undo" / "Undone" / "Expired"
- **Handler:** `handleUndoAutoApplied()` (lines 416-442) -> `undoAutoAppliedInsight()`
- **Visibility:** All auto-applied insights
- **Disabled when:** `!canUndo || isSaving` (1-hour window: `elapsed < 3_600_000 && !insight.undoneAt`)
- **Opens:** Undo reason dialog (lines 1441-1545) with options: wrong_player, wrong_rating, other

---

## AutoApprovedTab (auto-approved-tab.tsx)

**File:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/auto-approved-tab.tsx`
**Lines:** ~628 | **Mutations registered:** lines 145-152

### Restrict/Allow Child View (Phase 7)

- **Line:** 547 | **Icon:** EyeOff
- **Handler:** `handleToggleChildRestriction()` (lines 176-197) -> `setNoteChildRestriction()`
- **Visibility:** Always shown on each summary card
- **Toggle tooltip:** "Allow child to see this note" / "Restrict from child view"

### Revoke

- **Line:** 574 | **Icon:** AlertCircle
- **Label:** "Revoke"
- **Handler:** `handleRevoke()` (lines 154-174) -> `revokeSummary({ reason: "Coach override" })`
- **Visibility:** `summary.isRevocable === true`
- **Opens:** Confirmation dialog (lines 604-625)

---

## DraftsTab (drafts-tab.tsx)

**File:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/drafts-tab.tsx`
**Lines:** ~430 | **Mutations registered:** lines 110-115

| Mutation | API | Line |
|----------|-----|------|
| `confirmDraft` | `api.models.insightDrafts.confirmDraft` | 110 |
| `rejectDraft` | `api.models.insightDrafts.rejectDraft` | 111 |
| `confirmAllDrafts` | `api.models.insightDrafts.confirmAllDrafts` | 112 |
| `rejectAllDrafts` | `api.models.insightDrafts.rejectAllDrafts` | 115 |

### Confirm (Individual)
- **Line:** 410 | Green-600 background
- **Handler:** `handleConfirm()` (lines 117-131)

### Reject (Individual)
- **Line:** 397 | Outline variant
- **Handler:** `handleReject()` (lines 133-147)

### Confirm All (Batch)
- **Line:** 247
- **Label:** "Confirm All ({count})"
- **Handler:** `handleConfirmAll()` (lines 149-167) | Parameters: `artifactId`, `organizationId`

### Reject All (Batch)
- **Line:** 262
- **Label:** "Reject All ({count})"
- **Handler:** `handleRejectAll()` (lines 169-187) | Opens confirmation alert dialog

---

## TeamInsightsTab (team-insights-tab.tsx)

**File:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/team-insights-tab.tsx`
**Lines:** ~440 | **Mutations registered:** lines 78-80

### Apply to Profile
- **Line:** 379 | **Icon:** CheckCircle
- **Handler:** `handleApplyInsight()` (lines 84-108) -> `updateInsightStatus({ status: "applied" })`
- **Visibility:** `insight.status === "pending"`

### Dismiss
- **Line:** 394 | **Icon:** XCircle
- **Handler:** `handleDismissInsight()` (lines 110-134) -> `updateInsightStatus({ status: "dismissed" })`
- **Visibility:** `insight.status === "pending"`

---

## ParentsTab (parents-tab.tsx)

**File:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/parents-tab.tsx`
**Lines:** ~230 | **Mutations registered:** lines 54-59

Routes to specialized approval cards based on sensitivity:
- **Injury summaries** -> `InjuryApprovalCard` (line 210)
- **Behavior summaries** -> `BehaviorApprovalCard` (line 214)
- **Normal summaries** -> `SummaryApprovalCard` (line 219)

### SummaryApprovalCard (summary-approval-card.tsx)

| Mutation | API |
|----------|-----|
| `approveSummary` | `api.models.coachParentSummaries.approveSummary` |
| `suppressSummary` | `api.models.coachParentSummaries.suppressSummary` |

- **Approve & Share** (line 309): `approveSummary({ restrictChildView })` | Always visible
- **Don't Share** (line 327): Opens feedback dialog -> `suppressSummary({ feedback })` | Always visible
- **Restrict from child view** (line 290): Checkbox, affects `restrictChildView` parameter

### InjuryApprovalCard (injury-approval-card.tsx)

| Mutation | API |
|----------|-----|
| `approveInjurySummary` | `api.models.coachParentSummaries.approveInjurySummary` |
| `editSummaryContent` | `api.models.coachParentSummaries.editSummaryContent` |

- **Approve & Share** (line 364): Requires 3 checklist items checked (personally observed, severity accurate, no medical advice)
- **Don't Share** (line 382): `suppressSummary()` | Always visible
- **Edit/Save/Cancel** (lines 210-246): Inline edit of summary content

### BehaviorApprovalCard (behavior-approval-card.tsx)

| Mutation | API |
|----------|-----|
| `approveSummary` | `api.models.coachParentSummaries.approveSummary` |
| `suppressSummary` | `api.models.coachParentSummaries.suppressSummary` |
| `editSummaryContent` | `api.models.coachParentSummaries.editSummaryContent` |

- **Approve & Share** (line 299): No checklist required (unlike injury)
- **Don't Share** (line 317): `suppressSummary()` | Always visible
- **Edit/Save/Cancel** (lines 202-238): Inline edit of summary content

---

## Review Microsite (whatsappReviewLinks.ts)

**File:** `packages/backend/convex/models/whatsappReviewLinks.ts`
These mutations are called from the `/r/[code]` microsite, not the main dashboard.

| Mutation | Line | Parameters |
|----------|------|------------|
| `applyInsightFromReview` | 725 | `code`, `voiceNoteId`, `insightId` |
| `dismissInsightFromReview` | 791 | `code`, `voiceNoteId`, `insightId` |
| `batchApplyInsightsFromReview` | 854 | `code`, `items[]` |
| `batchDismissInsightsFromReview` | 963 | `code`, `items[]` |
| `editInsightFromReview` | 666 | `code`, `voiceNoteId`, `insightId`, `updates` |
| `assignPlayerFromReview` | 1591 | `code`, `voiceNoteId`, `insightId`, `playerIdentityId` |
| `addTodoFromReview` | 1183 | `code`, `voiceNoteId`, `insightId`, `assigneeUserId` |
| `saveTeamNoteFromReview` | 1251 | `code`, `voiceNoteId`, `insightId`, `teamId` |

---

## Context-Awareness Issues

### Issue 1: All action buttons shown regardless of category (#639)

**Problem:** InsightsTab shows Apply, Dismiss, Edit, Classify, and Assign buttons for ALL insights regardless of category type.

**Expected behavior by category:**

| Category | Should Show | Should Hide |
|----------|-------------|-------------|
| `skill_rating` (with player) | Apply, Dismiss, Edit | Assign Team, Assign Coach |
| `skill_rating` (no player) | Assign Player, Dismiss, Edit | Apply (disabled), Assign Team |
| `team_culture` | Assign Team, Dismiss, Edit | Apply, Assign Player, Assign Coach |
| `todo` | Assign Coach, Dismiss, Edit | Apply, Assign Player, Assign Team |
| `injury` (with player) | Apply, Dismiss, Edit | Assign Team, Assign Coach |
| `injury` (no player) | Assign Player, Dismiss, Edit | Apply (disabled) |
| Uncategorized | Classify, Dismiss | Apply, Assign |

**Current state:** The "Needs Attention" section does separate insights by type (unmatched, uncategorized, team without team, todo without assignee) and shows appropriate buttons per section. However, the "Pending" section shows Apply + Dismiss + Edit for ALL pending insights regardless of category -- the Apply button is only disabled (not hidden) when `needsAction` is true.

### Issue 2: Apply without player assignment (#618)

**Problem:** Microsite `applyInsightFromReview` (whatsappReviewLinks.ts:725) does NOT check for `playerIdentityId` before allowing apply. Creates zombie data -- an "applied" insight with no player.

**Fix needed:** Add guard in `applyInsightFromReview`: `if (!insight.playerIdentityId) throw new Error("Player assignment required")`

### Issue 3: "Engage Team" button context

**Problem:** The "Engage Team" / team-related actions appear for non-team categories.

**Rule:** `TEAM_LEVEL_CATEGORIES = ['team_culture', 'todo']`. Only these categories should show team-related UI (Assign Team button).

### Issue 4: Duplicate mutation paths

The same `updateInsightStatus` mutation is called from 5+ locations:
1. insights-tab.tsx (Apply/Dismiss)
2. team-insights-tab.tsx (Apply to Profile/Dismiss)
3. review-tab.tsx (legacy)
4. swipeable-insight-card.tsx (mobile swipe)
5. board-insight-card.tsx (kanban board)

No shared hook exists -- each component implements its own handler with error handling and toast notifications.
