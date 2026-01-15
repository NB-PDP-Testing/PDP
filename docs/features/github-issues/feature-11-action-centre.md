# Action Centre for All Roles

## Overview
Create a comprehensive Action Centre (task management cockpit) for all user roles that helps them stay organized, prioritize tasks, and feel accomplished as they complete items. Research industry best practices and implement a system that leverages dopamine-driven task completion.

## Current State
- Quick actions have been created for coaches
- Basic task concept exists in coach dashboard
- No comprehensive action centre or to-do system
- No research on industry best practices for task management

## Purpose
Provide users with a centralized "cockpit" of tasks, reminders, and action items relevant to their role. The Action Centre helps users:
- See everything that needs their attention
- Prioritize tasks effectively
- Feel accomplished as they complete tasks (dopamine effect)
- Never miss important deadlines or actions
- Stay organized and productive

## Role-Agnostic Design
The Action Centre should adapt its content and features based on the user's current role, but use a consistent design system across all roles.

### Coach Action Centre
- Review pending player assessments
- Respond to parent messages
- Complete attendance for recent sessions
- Review voice notes that need categorization
- Prepare for upcoming training session
- Review development goals due this week
- Acknowledge injury reports
- Complete wellness checks (for senior teams)

### Parent Action Centre
- Update child's medical information (annual reminder)
- Acknowledge new coach feedback
- Mark attendance for upcoming events
- Complete permission forms
- Pay outstanding fees
- Respond to club announcements
- Review child's development goals
- Book parent-coach meeting (if needed)

### Admin Action Centre
- Review pending join requests
- Approve new team creations
- Review compliance reports (incomplete medical cards)
- Respond to support requests
- Review platform announcements
- Complete onboarding tasks for new clubs
- Process refunds or fee adjustments
- Review flagged content

### Platform Staff Action Centre
- Review new organization applications
- Monitor system health alerts
- Review flagged content across platform
- Respond to escalated support tickets
- Review analytics anomalies
- Approve new flow deployments
- Review security alerts

## Industry Best Practices Research

### Leading Task Management Apps
**Research these platforms:**
1. **Todoist** - Task prioritization, recurring tasks, productivity tracking
2. **Things 3** - Elegant design, Today/Upcoming/Someday organization
3. **Asana** - Team collaboration, task dependencies, project views
4. **Linear** - Engineering task management, keyboard shortcuts, fast UX
5. **Monday.com** - Visual task boards, automation, notifications

**Key Patterns to Study:**
- How do they prioritize tasks? (Today, This Week, Later)
- How do they handle recurring tasks?
- What makes task completion satisfying?
- How do they reduce cognitive load?
- What notification strategies do they use?

### Dopamine-Driven Design Research
**The Psychology of Task Completion:**
- Visual satisfaction of checking off items
- Progress bars and completion metrics
- Celebration of milestones
- Streaks and consistency tracking
- Gamification elements (points, badges)

**Research Papers/Articles:**
- The neuroscience of checking off to-do lists
- Dopamine release and habit formation
- Motivation through small wins
- Progress visualization and engagement

## Key Features

### 1. Task Organization
**Priority Levels**
- Urgent (due today or overdue) - Red
- Important (due this week) - Yellow
- Normal (due later) - Default

**Time-Based Views**
- Today: Tasks due today
- This Week: Tasks due within 7 days
- Upcoming: Tasks due later
- Overdue: Past due tasks (highlighted prominently)

**Categories**
- By role (Coach tasks, Parent tasks, Admin tasks)
- By type (Assessments, Communications, Administrative, Health)
- By source (System-generated, User-created, Flow-triggered)

### 2. Task Types

**System-Generated Tasks**
- Triggered by platform events (e.g., new player enrollment → update medical card)
- Based on rules (e.g., annual medical card update reminder)
- From flows (e.g., onboarding flow tasks)
- From notifications (e.g., coach left voice note → parent acknowledgment)

**User-Created Tasks**
- Manual to-dos
- Reminders
- Follow-ups
- Notes to self

**Recurring Tasks**
- Daily (e.g., wellness check for senior players)
- Weekly (e.g., review team performance)
- Monthly (e.g., submit attendance reports)
- Custom frequency

**Collaborative Tasks**
- Tasks assigned by others (e.g., admin assigns coach to complete training)
- Shared tasks (e.g., team parents coordinating event)

### 3. Task Completion Experience
**Completion Animations**
- Satisfying checkmark animation
- Task fade-out effect
- Confetti for milestone completions (e.g., 10 tasks today!)
- Sound effect (optional, user preference)

**Progress Tracking**
- Daily completion count
- Weekly productivity score
- Streak tracking (consecutive days with completed tasks)
- Personal bests (most tasks completed in a day)

**Celebrations**
- "Great job! You've completed all tasks for today!"
- Weekly summary: "You completed 25 tasks this week! 🎉"
- Milestone badges (100 tasks completed, 30-day streak, etc.)

### 4. Smart Features
**Task Suggestions**
- AI suggests tasks based on role and context
- "You haven't reviewed Player X's development goals in 30 days"
- "Upcoming match tomorrow - prepare team lineup?"

**Task Dependencies**
- Some tasks unlock others
- Some tasks block others from completion

**Snooze & Reschedule**
- Snooze task to later today, tomorrow, or next week
- Bulk reschedule overdue tasks

**Quick Actions**
- Complete task with one tap
- Mark task as done from notification
- Add task from anywhere in app (floating button)

### 5. Notifications
**Smart Notifications**
- Morning summary: "You have 5 tasks today"
- Midday reminder: "3 tasks remaining"
- End-of-day: "Great job! All tasks completed" or "2 tasks remaining - tackle tomorrow?"
- Customizable notification preferences

**Notification Channels**
- In-app notifications
- Email digest (daily/weekly)
- Push notifications (mobile)
- SMS (for critical/urgent tasks only)

### 6. Views & Filters
**Multiple View Modes**
- List view (default)
- Kanban board (To Do / In Progress / Done)
- Calendar view (tasks by date)
- Timeline view (for long-term planning)

**Filters & Search**
- Filter by priority, category, due date, status
- Search tasks by keyword
- Saved filter presets (e.g., "My coaching tasks")

## User Workflows

### Coach: Morning Routine
1. Coach opens app in morning
2. Action Centre shows: "Good morning! You have 6 tasks today"
3. Reviews list:
   - Mark attendance for yesterday's training ✓
   - Leave voice note for Player A (after last night's match) ✓
   - Review development goals for Player B (due today)
   - Prepare lineup for tomorrow's match
   - Respond to parent message from Player C's mom
   - Complete weekly team assessment
4. Tackles high-priority items first
5. Checks off each task → Satisfying animation
6. By end of day: "All tasks completed! Great job! 🎉"

### Parent: Weekly Check-in
1. Parent opens Action Centre
2. Sees 3 tasks:
   - Acknowledge coach feedback from Tuesday ✓
   - Update Alex's medical card (annual reminder) - Due Friday
   - Mark attendance for Saturday's match ✓
3. Completes two quick tasks
4. Snoozes medical card update to Friday morning
5. Receives notification Friday: "Don't forget to update Alex's medical card today"
6. Completes task → "All caught up!"

### Admin: Onboarding Flow
1. Admin starts onboarding new club
2. Action Centre generates checklist:
   - Create organization profile ✓
   - Set up teams ✓
   - Import player roster ✓
   - Configure organization settings
   - Train coaches on platform
   - Launch announcement flow
3. Completes tasks over several days
4. Progress bar shows 4/6 completed
5. Completes final tasks → "Club onboarding complete! 🎉"

## Design Specifications

### Visual Design
- Clean, minimal interface
- Clear visual hierarchy (urgent tasks stand out)
- Satisfying animations (not distracting)
- Dark mode support
- Accessible colors and contrast

### Mobile-First
- Action Centre is primary dashboard on mobile
- Swipe gestures (swipe right to complete, swipe left for options)
- Pull to refresh
- Bottom sheet for task details
- Floating action button to add task

### Desktop Experience
- Sidebar or dedicated page for Action Centre
- Keyboard shortcuts (Cmd+K to add task, Enter to complete)
- Drag-and-drop to reorder priorities
- Multi-select for bulk actions

## Technical Considerations

### Database Schema
```typescript
tasks {
  id: string
  userId: string
  organizationId: string
  title: string
  description: string
  type: "system" | "user" | "flow" | "recurring"
  priority: "urgent" | "important" | "normal"
  dueDate: Date
  status: "pending" | "in_progress" | "completed" | "snoozed"
  category: string
  source: string // What created this task
  relatedEntityId?: string // Link to player, team, assessment, etc.
  relatedEntityType?: string
  isRecurring: boolean
  recurrenceRule?: string
  completedAt?: Date
}

taskTemplates {
  // Pre-defined task templates for common scenarios
}

userTaskPreferences {
  // User notification preferences
  // Snooze settings
  // Celebration preferences
}
```

### Performance
- Fast loading (render tasks instantly)
- Optimistic UI (task completes immediately, sync in background)
- Offline support (complete tasks offline, sync later)
- Real-time updates (tasks added by system appear immediately)

### Integration Points
- Flow system (flows can generate tasks)
- Notification system (tasks trigger notifications)
- Voice note system (voice notes create acknowledgment tasks)
- Assessment system (pending assessments appear as tasks)

## Success Metrics
- **Adoption**: % of active users who use Action Centre weekly
- **Completion Rate**: % of tasks completed vs. created
- **Engagement**: Average tasks completed per user per week
- **Satisfaction**: User rating of Action Centre feature (4.5+ target)
- **Retention**: Do users with active task lists have higher retention?

## Implementation Phases

### Phase 1: Core Action Centre
- Task list with basic CRUD
- System-generated tasks from key events
- Completion animations
- Priority levels and filtering

### Phase 2: Smart Features
- Task suggestions
- Recurring tasks
- Snooze and reschedule
- Progress tracking and streaks

### Phase 3: Enhancements
- Multiple view modes (Kanban, Calendar)
- Collaborative tasks
- Advanced analytics
- Gamification elements

## References
- Research leading task management apps
- Dopamine and task completion research
- Quick actions feature (already implemented for coaches)
- Flow system for task generation: `docs/architecture/flow-wizard-system.md`

## Open Questions
1. Should tasks be shareable between users? (e.g., coach assigns task to another coach)
2. What's the right balance of system-generated vs. user-created tasks?
3. Should we integrate with external task managers (Todoist, Things, etc.)?
4. How aggressive should notifications be without being annoying?
5. Should there be a team/organization task board? (beyond individual)
