# US-P9-057 Tasks Tab - Testing Checklist

**Date**: February 3, 2026
**Story**: US-P9-057 - Tasks Tab with Team Task Management
**Status**: Code Complete - Awaiting Manual Testing

---

## Code Verification (Pre-Test) ✅

### Backend Verification
- [x] **Schema field added**: `status` field exists in coachTasks table (schema.ts:943-945)
- [x] **Task action types added**: task_created, task_completed, task_assigned in teamActivityFeed enum
- [x] **getTeamOverviewStats enhanced**: Returns openTasks and overdueCount (teams.ts:801-802)
- [x] **getTeamTasks query created**: teams.ts:1124 (uses by_team_and_org index)
- [x] **Mutations created** in coachTasks.ts:
  - [x] createTask (lines 139-202) with activity feed integration
  - [x] updateTask (lines 298-328)
  - [x] deleteTask (lines 279-293)
  - [x] toggleTask (lines 254-274)
  - [x] reassignTask (lines 333-373)
  - [x] createTaskFromInsight (lines 208-249)

### Frontend Verification
- [x] **Components created**:
  - [x] task-card.tsx (5.7KB)
  - [x] task-filters.tsx (4.4KB)
  - [x] tasks-tab.tsx (8.8KB)
  - [x] create-task-modal.tsx (7.2KB)
  - [x] task-detail-modal.tsx (10KB)
- [x] **TasksTab imported** in page.tsx (line 47)
- [x] **TasksTab rendered** in page.tsx (lines 294-303)
- [x] **Props passed correctly**: currentUserId, currentUserName, organizationId, teamId
- [x] **Quick Stats Panel updated**: Attendance → Open Tasks with CheckSquare icon

### Type Safety Verification
- [x] **Type check passes**: Confirmed with `npm run check-types` (zero errors)
- [x] **All imports resolve**: No missing module errors
- [x] **API calls typed correctly**: useQuery with proper api.models.teams.getTeamTasks

---

## Manual Testing Checklist

### Pre-requisites
- [ ] Dev server running on http://localhost:3000
- [ ] Logged in as test user: neil.B@blablablak.com
- [ ] Have at least one organization and team accessible
- [ ] Browser console open to check for errors

### Test 1: Tasks Tab Rendering
**Navigate to**: `/orgs/[orgId]/coach/team-hub` → Click "Tasks" tab

**Expected**:
- [ ] Tasks tab loads without errors
- [ ] No console errors
- [ ] Loading skeleton shows while data fetches
- [ ] Page renders one of:
  - Empty state: "No Tasks Created" (if no tasks exist)
  - Task grid with existing tasks

**Screenshot**: `tasks-tab-initial-render.png`

---

### Test 2: Empty State
**If no tasks exist**:

**Expected**:
- [ ] CheckSquare icon displays
- [ ] "No Tasks Created" title
- [ ] Helpful description text
- [ ] "Create Task" button visible

**Screenshot**: `tasks-empty-state.png`

---

### Test 3: Create Task - Basic
**Action**: Click "Create Task" button

**Expected**:
- [ ] Modal opens with form fields:
  - [ ] Task title (text input)
  - [ ] Assigned to (dropdown - should show team members)
  - [ ] Priority (dropdown: Low/Medium/High)
  - [ ] Due date (date picker - optional)
  - [ ] Player (dropdown - optional)
- [ ] "Create" button at bottom
- [ ] "Cancel" button to close

**Fill in**:
- Title: "Test Task - Basic"
- Assigned to: Select current user
- Priority: High
- Due date: Tomorrow
- Player: Leave empty

**Click "Create"**

**Expected**:
- [ ] Modal closes
- [ ] New task appears in grid
- [ ] Task shows:
  - [ ] Title "Test Task - Basic"
  - [ ] High priority badge (red)
  - [ ] Due date (tomorrow's date)
  - [ ] Assigned user name
  - [ ] Status: "Open" (or similar indicator)
- [ ] No console errors

**Screenshot**: `task-created-basic.png`

---

### Test 4: Quick Stats Panel Update
**Navigate to**: "Overview" tab

**Expected**:
- [ ] Quick Stats Panel shows:
  - [ ] "Open Tasks" card (third card, orange color)
  - [ ] Count shows "1" (or correct number)
  - [ ] CheckSquare icon
  - [ ] NO "Attendance %" card

**Screenshot**: `quick-stats-open-tasks.png`

---

### Test 5: Activity Feed Integration
**Navigate to**: "Activity" tab

**Expected**:
- [ ] Recent entry shows: "Created task: Test Task - Basic"
- [ ] Entry includes:
  - [ ] Actor name (current user)
  - [ ] Timestamp (just now)
  - [ ] Task icon or indicator
- [ ] Priority marked as "important" if task priority was high

**Screenshot**: `activity-feed-task-created.png`

---

### Test 6: Task Filters
**Navigate back to**: "Tasks" tab

**Test Status Filter**:
- [ ] Click status dropdown
- [ ] Options: All, Open, In Progress, Done
- [ ] Select "Open"
- [ ] Only open tasks display

**Test Priority Filter**:
- [ ] Click priority dropdown
- [ ] Options: All, High, Medium, Low
- [ ] Select "High"
- [ ] Only high priority tasks display

**Test Assignee Filter**:
- [ ] Click assignee dropdown
- [ ] Shows "All" + list of team members who have tasks
- [ ] Select current user
- [ ] Only tasks assigned to current user display

**Test Search**:
- [ ] Type "Basic" in search input
- [ ] Only tasks with "Basic" in title display
- [ ] Clear search
- [ ] All filtered tasks return

**Test Sort**:
- [ ] Click sort dropdown
- [ ] Options: Due Date, Priority, Created Date
- [ ] Select "Priority"
- [ ] Tasks reorder (high → medium → low)

**Expected for all**:
- [ ] Filters work independently
- [ ] Filters combine correctly (AND logic)
- [ ] Empty state shows if no tasks match: "No Tasks Match Filters"
- [ ] No console errors

**Screenshot**: `task-filters-working.png`

---

### Test 7: Task Detail View
**Action**: Click on the test task card

**Expected**:
- [ ] Detail modal opens
- [ ] Shows all task fields:
  - [ ] Title
  - [ ] Assigned to
  - [ ] Priority
  - [ ] Due date
  - [ ] Status
  - [ ] Created date
  - [ ] Player (if linked)
  - [ ] Voice note indicator (if linked)
- [ ] Action buttons available:
  - [ ] Edit
  - [ ] Delete
  - [ ] Change status (dropdown or buttons)
- [ ] Close button (X) works

**Screenshot**: `task-detail-modal.png`

---

### Test 8: Update Task Status
**In detail modal**:
- [ ] Change status from "Open" → "In Progress"

**Expected**:
- [ ] Status updates immediately
- [ ] Modal can be closed
- [ ] Task card reflects new status
- [ ] Activity feed shows status change (check Activity tab)

**Screenshot**: `task-status-updated.png`

---

### Test 9: Complete Task
**In detail modal**:
- [ ] Change status to "Done"

**Expected**:
- [ ] Task marked as complete
- [ ] Activity feed shows "task_completed" event
- [ ] Quick Stats "Open Tasks" count decreases by 1
- [ ] Task may still show in grid (depends on filter)
- [ ] If status filter = "Open", task disappears from grid

**Screenshot**: `task-completed.png`

---

### Test 10: Edit Task
**In detail modal**:
- [ ] Click "Edit" or equivalent
- [ ] Change title to "Test Task - Edited"
- [ ] Change priority to Medium
- [ ] Save changes

**Expected**:
- [ ] Changes persist
- [ ] Task card updates
- [ ] No duplicate tasks created
- [ ] Activity feed may log change (depending on implementation)

**Screenshot**: `task-edited.png`

---

### Test 11: Delete Task
**In detail modal**:
- [ ] Click "Delete" button
- [ ] Confirmation prompt appears (if implemented)
- [ ] Confirm deletion

**Expected**:
- [ ] Modal closes
- [ ] Task removed from grid
- [ ] Quick Stats count updates
- [ ] If was last task, empty state appears

**Screenshot**: `task-deleted.png`

---

### Test 12: Create Task with Player Link
**Action**: Create new task with player linked

**Fill in**:
- Title: "Follow up on John Doe's fitness"
- Assigned to: Current user
- Priority: Medium
- Player: Select a player from dropdown
- Due date: Next week

**Expected**:
- [ ] Task created successfully
- [ ] Player name shows on task card
- [ ] Player avatar/icon displays (if implemented)
- [ ] Opening detail shows player link

**Screenshot**: `task-with-player.png`

---

### Test 13: Voice Note Integration (If voice notes exist)
**Pre-requisite**: Have a voice note with tasks created from it

**Expected**:
- [ ] Tasks created from voice notes show microphone icon/badge
- [ ] Clicking voice note indicator navigates to voice note
- [ ] Task card indicates source = "voice_note"

**Screenshot**: `task-from-voice-note.png`

---

### Test 14: Multiple Tasks Display
**Action**: Create 5-10 tasks with varying:
- Statuses (open, in-progress, done)
- Priorities (high, medium, low)
- Due dates (past, today, future, none)
- Assignees

**Expected**:
- [ ] All tasks display in responsive grid
- [ ] Grid adapts: 1 col (mobile) → 2 col (tablet) → 3 col (desktop)
- [ ] Overdue tasks show red indicator
- [ ] High priority tasks stand out visually
- [ ] Scrolling works smoothly
- [ ] No layout issues or overlaps

**Screenshot**: `tasks-grid-full.png`

---

### Test 15: Mobile Responsiveness
**Action**: Resize browser to mobile width (375px)

**Expected**:
- [ ] Tasks tab accessible via bottom nav
- [ ] Task grid becomes single column
- [ ] Filters collapse or stack vertically
- [ ] Create button accessible
- [ ] Modals fit mobile screen
- [ ] All text readable
- [ ] Touch targets large enough

**Screenshot**: `tasks-mobile-view.png`

---

### Test 16: Performance Check
**With 10+ tasks loaded**:

**Check**:
- [ ] Initial load < 2 seconds
- [ ] Filtering instant (< 200ms)
- [ ] Sorting instant (< 200ms)
- [ ] Search typing responsive (debounced)
- [ ] Modal open/close smooth
- [ ] No memory leaks (check DevTools Performance tab)

**Console**:
- [ ] No warnings
- [ ] No errors
- [ ] No excessive re-renders (React DevTools Profiler)

---

### Test 17: Edge Cases

**Test: Task with no due date**
- [ ] Creates successfully
- [ ] Sorts to end when sorting by due date
- [ ] Displays as "No due date" or similar

**Test: Very long task title**
- [ ] Title: "This is a very long task title that should be truncated or wrapped properly to avoid breaking the layout of the task card"
- [ ] Card handles gracefully (ellipsis or wrap)

**Test: Task assigned to deleted user**
- [ ] Displays "Unknown" or handles missing assignee gracefully

**Test: Rapid filter changes**
- [ ] No crashes
- [ ] No race conditions
- [ ] Final result matches selected filters

---

## Acceptance Criteria Verification

### Backend ✅
- [x] ⚠️ CRITICAL: Used EXISTING coachTasks table (not created teamTasks)
- [x] Schema: Added status field (open/in-progress/done)
- [x] Schema: Reused existing fields correctly
- [x] Query: getTeamTasks uses by_team_and_org index
- [x] Query: Uses batch fetch pattern (no N+1)
- [x] Mutations: createTask creates activity feed entry
- [x] Activity Feed: task_created, task_completed, task_assigned events
- [x] Overview: openTasks and overdueCount fields added

### Frontend ✅
- [x] Built tasks-tab.tsx following player-tab pattern
- [x] Built task-card.tsx with voice note badge support
- [x] Built task-filters.tsx with status/priority/assignee/sort
- [x] Built create-task-modal.tsx with validation
- [x] Built task-detail-modal.tsx with voice note link
- [x] Updated quick-stats-panel.tsx (Attendance → Open Tasks)
- [x] Type check passes

### Integration Points (Needs Manual Testing)
- [ ] Activity Feed shows task events
- [ ] Overview Dashboard shows task counts
- [ ] Voice Notes link works (if tasks from voice notes exist)
- [ ] Quick Stats Panel updates correctly

---

## Test Results Summary

### Pass Criteria
- All tests marked ✅ without blockers
- No console errors during any workflow
- All acceptance criteria met
- Performance within acceptable limits

### If Issues Found
Document in this format:
```
**Issue**: [Description]
**Severity**: [Blocker/High/Medium/Low]
**Steps to Reproduce**: [Steps]
**Expected**: [Expected behavior]
**Actual**: [Actual behavior]
**Screenshot**: [Filename]
```

---

## Manual Tester Instructions

1. **Start testing**: Work through tests 1-17 in order
2. **Check each checkbox** as you verify
3. **Take screenshots** at each indicated point
4. **Document any issues** immediately
5. **Console check**: Keep DevTools console open throughout
6. **Note**: If dev-browser available, can automate parts of this

**Estimated testing time**: 45-60 minutes

**Tester**: _________________
**Date**: _________________
**Browser**: _________________
**OS**: _________________

---

## Post-Testing Actions

### If All Tests Pass ✅
1. Mark US-P9-057 as `passes: true` in prd.json
2. Add US-P9-057 to `.audited-stories`
3. Update progress.txt with test results
4. Commit testing documentation
5. Proceed to US-P9-058 (Insights Tab)

### If Blockers Found ❌
1. Document all blockers in detail
2. Fix blockers before proceeding
3. Re-test affected areas
4. Once passing, proceed with post-testing actions above

---

**Code Quality**: Excellent - Ralph did solid work
**Test Coverage**: Comprehensive manual tests defined
**Ready for Testing**: YES ✅
