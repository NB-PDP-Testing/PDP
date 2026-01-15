# Quick Actions Management System

## Overview
Create a platform-wide quick actions management system that allows platform staff to define actions, organization admins to customize them, and users to access them based on their role and context. The system should be sport-agnostic and naturally handle sport-specific actions without explicit sport logic.

## Current State
- Quick actions have been implemented for coaches
- Actions are currently hardcoded
- No management interface for platform staff or org admins
- No user-level customization

## Purpose
Provide users with contextual, quick-access shortcuts to common actions based on their role, the sport they're working with, and organizational preferences. Enable platform staff to manage global quick actions and organization admins to customize for their club's needs.

## Design Philosophy: Sport-Agnostic
Rather than building sport-specific logic, the system should:
- Use tags/categories to classify actions
- Allow actions to declare their applicable contexts (roles, sports, features)
- Filter available actions based on current context
- Naturally support both universal and sport-specific actions

## Key Features

### 1. Platform Staff Management
**Quick Action Definition**
- Create new quick actions with:
  - Name and description
  - Icon
  - Target URL or action handler
  - Applicable roles (Coach, Parent, Admin, Player)
  - Context tags (e.g., "team_management", "player_assessment", "gaa", "soccer")
  - Enabled/disabled state
  - Sort order/priority

**Action Library**
- Browse all available quick actions
- Enable/disable actions platform-wide
- Set default actions for new organizations
- View usage analytics (which actions are most used)
- Create action templates for different sports

**Sport Context Tags**
- Actions can be tagged with sport names (e.g., "gaa", "soccer", "rugby")
- Actions can be tagged with feature categories (e.g., "assessment", "attendance", "medical")
- System automatically filters based on current context
- No hardcoded sport logic required

### 2. Organization Admin Customization
**Action Selection**
- View all available quick actions from platform library
- Enable/disable actions for their organization
- Reorder actions for their users
- Set role-specific actions (different actions for coaches vs. parents)

**Custom Actions (Future)**
- Create organization-specific quick actions
- Link to custom pages or external URLs
- Only visible to their organization

### 3. User Experience
**Contextual Display**
- Show relevant quick actions based on:
  - User's current role
  - Current page/context (team view, player view, dashboard)
  - Sport being viewed
  - Organization preferences

**User Customization**
- Pin favorite actions
- Reorder personal quick actions
- Hide actions they don't use
- Quick actions follow user across sessions

**Responsive Design**
- Mobile: Show top 3-4 actions, expandable menu for more
- Desktop: Show 6-8 actions, dropdown for more
- Tablet: Adaptive layout

## Example Quick Actions by Context

### Universal (All Sports)
- View Dashboard
- Create Announcement
- Message Parents
- View Schedule
- Mark Attendance

### GAA-Specific (Tagged with "gaa")
- Record Skills Test
- View Club Fixtures (GAA format)
- GAA Match Report

### Soccer-Specific (Tagged with "soccer")
- Formation Builder
- Match Stats Entry
- Training Session Planner

### Role-Specific
**Coach Actions:**
- Create Voice Note
- Quick Assessment
- View Team Roster
- Schedule Training

**Parent Actions:**
- View Child Progress
- Medical Info Update
- Upcoming Events
- Contact Coach

**Admin Actions:**
- Manage Teams
- User Management
- Import Players
- Compliance Dashboard

## Technical Architecture

### Database Schema
```typescript
quickActions {
  id: string
  name: string
  description: string
  icon: string
  targetUrl: string
  actionHandler?: string // For custom actions
  applicableRoles: string[] // ["coach", "parent", "admin", "player"]
  contextTags: string[] // ["gaa", "assessment", "attendance"]
  isEnabled: boolean
  isDefault: boolean
  sortOrder: number
  createdBy: "platform" | "org"
  organizationId?: string // For org-specific actions
}

organizationQuickActions {
  organizationId: string
  quickActionId: string
  isEnabled: boolean
  customSortOrder?: number
}

userQuickActions {
  userId: string
  quickActionId: string
  isPinned: boolean
  customSortOrder?: number
  isHidden: boolean
}
```

### Filtering Logic
When displaying quick actions:
1. Start with platform-enabled actions
2. Filter by organization preferences
3. Filter by user's current role
4. Filter by current context tags (sport, page, feature)
5. Apply user customization (pins, order, hidden)
6. Sort by priority and display

## User Flows

### Platform Staff Workflow
1. Navigate to Platform Admin → Quick Actions
2. View all quick actions in library
3. Create new action: "GAA Skills Assessment"
   - Add tags: ["gaa", "assessment", "coach"]
   - Set icon and target URL
   - Enable platform-wide
4. View usage analytics to see which actions are most popular

### Organization Admin Workflow
1. Navigate to Organization Settings → Quick Actions
2. View available quick actions filtered by their sports
3. Enable/disable actions for their coaches
4. Reorder actions by priority
5. Changes apply to all users in their organization

### User (Coach) Workflow
1. Coach opens dashboard
2. Sees quick actions relevant to coaching in their sport
3. Pins "Create Voice Note" to always show first
4. Hides "Import Players" (admin action they don't need)
5. Quick actions persist across sessions

## Success Criteria
- Platform staff can easily create and manage quick actions
- Organization admins can customize actions for their club
- Users see relevant actions based on role and context
- System naturally handles sport-specific actions without hardcoded logic
- High usage rates (users regularly use quick actions)
- Reduced clicks to common actions

## Implementation Phases

### Phase 1: Platform Staff Management
- Build action library and management UI
- Implement filtering logic based on tags
- Create default action set

### Phase 2: Organization Customization
- Org admin UI for enabling/disabling actions
- Reordering capability
- Analytics dashboard

### Phase 3: User Customization
- User-level pins and hiding
- Personal reordering
- Usage tracking

## References
- Current quick actions implementation for coaches
- Consider analytics integration (PostHog) for usage tracking
