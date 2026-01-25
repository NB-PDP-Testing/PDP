# Bug Fix #206: Goal Setting Does Not Have an Edit Button

## Issue Summary
**GitHub Issue:** #206
**Status:** Fixed
**Branch:** `fix/206-goal-edit-milestone-management`

## Problem Description
When a goal was created, users could not:
1. Edit the goal details (title, description, priority, target date, etc.)
2. Edit milestone descriptions
3. Delete milestones
4. Mark completed milestones as incomplete (uncomplete)

Additionally, there was a question about how the progress percentage bar is calculated.

## Root Cause Analysis

### Finding 1: Missing "Edit Goal" UI
The backend `updateGoal` mutation (in `passportGoals.ts:243-314`) fully supported editing all goal fields:
- title, description, category, priority, status, progress, targetDate
- linkedSkills, parentActions, parentCanView, coachNotes, playerNotes

However, the frontend `GoalDetailDialog` component only exposed:
- Status updates (dropdown)
- Delete goal
- Add/Complete milestones
- Edit linked skills

**No UI existed to edit the core goal details.**

### Finding 2: Missing Milestone Management
The backend only had two milestone operations:
- `addMilestone` - Add a new milestone
- `completeMilestone` - Mark a milestone as complete

Missing backend operations:
- `deleteMilestone` - Remove a milestone
- `updateMilestone` - Edit milestone description
- `uncompleteMilestone` - Mark a completed milestone as incomplete

### Finding 3: Progress Bar Calculation
The progress percentage is **automatically calculated** based on milestone completion:

```typescript
// passportGoals.ts:405-410
const completedCount = milestones.filter((m) => m.completed).length;
const progress = milestones.length > 0
  ? Math.round((completedCount / milestones.length) * 100)
  : 0;
```

- 3 milestones, 1 completed = 33%
- 3 milestones, 2 completed = 67%
- No milestones = 0%

## Solution Implemented

### Backend Changes (`packages/backend/convex/models/passportGoals.ts`)

Added 3 new mutations:

1. **`deleteMilestone`** - Removes a milestone and recalculates progress
2. **`updateMilestone`** - Updates a milestone's description
3. **`uncompleteMilestone`** - Marks a completed milestone as incomplete and recalculates progress

All three mutations properly recalculate the progress percentage using the same formula.

### Frontend Changes (`apps/web/src/app/orgs/[orgId]/coach/goals/page.tsx`)

1. **New `EditGoalDialog` component**
   - Allows editing: title, description, priority, target date, coach notes, parent actions, parent visibility
   - Category is displayed but **locked** (cannot be changed after creation, per requirements)

2. **Updated `GoalDetailDialog` component**
   - Added "Edit Goal" button in footer
   - Milestones now have:
     - **Inline editing**: Click on milestone text to edit in place
     - **Delete button**: Trash icon to remove milestone
     - **Uncomplete button**: Undo icon on completed milestones to mark as incomplete

3. **New handlers added**
   - `handleDeleteMilestone`
   - `handleUpdateMilestone`
   - `handleUncompleteMilestone`

4. **New state**
   - `showEditDialog` - Controls edit dialog visibility
   - `editingMilestoneId` / `editingMilestoneText` - For inline milestone editing

## Files Modified

| File | Changes |
|------|---------|
| `packages/backend/convex/models/passportGoals.ts` | Added `deleteMilestone`, `updateMilestone`, `uncompleteMilestone` mutations |
| `apps/web/src/app/orgs/[orgId]/coach/goals/page.tsx` | Added EditGoalDialog, updated GoalDetailDialog with edit button and milestone management |

## Testing Checklist

- [ ] Create a new goal and verify it appears correctly
- [ ] Click "Edit Goal" button and verify edit dialog opens
- [ ] Edit goal title, description, priority, target date, coach notes, parent actions
- [ ] Verify category is displayed but locked (not editable)
- [ ] Save changes and verify they persist
- [ ] Add a milestone and verify progress updates
- [ ] Click on milestone text to edit inline
- [ ] Press Enter to save milestone edit
- [ ] Press Escape to cancel milestone edit
- [ ] Click delete (trash) icon on a milestone and verify it's removed
- [ ] Verify progress recalculates after milestone deletion
- [ ] Complete a milestone and verify progress updates
- [ ] Click uncomplete (undo) icon on a completed milestone
- [ ] Verify progress recalculates after uncompleting

## Design Decisions

1. **Category locked after creation**: Per user requirement, the category field cannot be changed after a goal is created. It is displayed in the edit dialog but not editable.

2. **Progress auto-calculated**: The progress bar remains auto-calculated from milestone completion. No manual override was added.

3. **No delete confirmation for milestones**: Per user requirement, milestone deletion does not require confirmation.

4. **Inline milestone editing**: Per user requirement, milestone editing uses click-to-edit inline rather than a modal/popup.

## Related Documentation
- Goal system architecture: `docs/features/` (if applicable)
- Convex development rules: `.ruler/convex_rules.md`
