# Adult Player Multi-Role Workflows & Experience

## Overview
Comprehensively review and optimize the experience for adult players who may have multiple roles in the system (player, coach, parent, admin). Ensure all workflows, flows, and features are properly designed for adults with complex role combinations.

## Current State
- Some workflows manually implemented for adult players
- Not fully wired up or tested
- No comprehensive flow mapping
- Role combinations not fully thought through
- Adult player experience is unclear

## Purpose
Adults in the system may simultaneously be:
- A player on senior/adult team
- A coach for youth teams
- A parent of a child player
- An organization admin

Each role has different needs, dashboards, and permissions. We need to:
- Design seamless role-switching experiences
- Ensure adults can access all their roles efficiently
- Avoid confusion about which role they're currently acting in
- Properly handle permissions for each role
- Create optimized workflows for common multi-role scenarios

## Adult Player Role Combinations

### Common Scenarios

**1. Adult Player + Parent**
- Plays on men's/women's team
- Has child on youth team
- Needs to access own player profile AND child's profile
- Example: Sarah plays on women's team, has son on U12 team

**2. Adult Player + Coach**
- Plays on adult team
- Coaches youth team
- Needs player dashboard AND coach dashboard
- Example: John plays on men's team, coaches U10 team

**3. Adult Player + Coach + Parent**
- All three roles simultaneously
- Most complex scenario
- Example: Mike plays on men's team, coaches U14 team, has daughter on U10 team

**4. Adult Player + Admin**
- Plays on team and manages club
- Needs admin access + player experience
- Example: Club chairperson who also plays

**5. Coach + Parent (No Playing)**
- Not a player, but coaches and has child
- Common scenario already mostly handled
- Example: Most youth coaches

## Key Challenges to Solve

### 1. Dashboard Clarity
**Problem**: Adults with multiple roles land on a dashboard that may not reflect their current needs.

**Questions to Answer:**
- Which dashboard do they see by default?
- How do they switch between role-specific dashboards?
- Should there be a unified dashboard showing all roles?
- Can they customize their landing page?

### 2. Navigation & Role Context
**Problem**: User may be confused about which role they're acting in.

**Questions to Answer:**
- How do we clearly indicate current role context?
- How easy is it to switch roles mid-session?
- Do permissions change based on current role selection?
- Can they perform cross-role actions (e.g., as coach, view own child's profile)?

### 3. Permissions & Access Control
**Problem**: Complex permission matrix for multi-role users.

**Scenarios to Handle:**
- Coach viewing their own player profile (should see more than other coaches)
- Parent who is also coach viewing own child (parent view or coach view?)
- Admin who is also player editing team settings while on that team
- Platform staff with multiple test accounts

### 4. Profile & Identity
**Problem**: Adults may need multiple profile views depending on context.

**Questions to Answer:**
- Does adult player have separate profile from their parent/coach identity?
- When viewing "My Profile," what do they see?
- Can other users see all their roles?
- How does search/directory handle multi-role users?

### 5. Onboarding & Registration
**Problem**: How do adults register when they have multiple roles?

**Scenarios:**
- Existing parent becomes a coach: How do we add coach role?
- Existing coach joins as player: How do we link player enrollment?
- New user who is player+parent: Which role do they register as first?
- Role changes over time: Coach retires from coaching but continues as parent

## Comprehensive Review Required

### Audit Codebase
**What to Review:**
1. Existing adult player implementation
   - What code exists?
   - What workflows are partially implemented?
   - What's commented out or disabled?

2. Role management system
   - How are roles assigned and stored?
   - How does role-switching work currently?
   - What's the relationship between roles and permissions?

3. Dashboard routing
   - Where do multi-role users land on login?
   - How does `/orgs/[orgId]` route determine user's view?
   - What's the default dashboard logic?

4. Profile system
   - How are adult player profiles structured?
   - Relationship to parent/coach/admin identities?
   - Player passport for adult players vs. youth players?

### Audit Flows
**Review All Flows:**
- First-time user onboarding (adult player)
- Adding additional roles to existing account
- Role-specific onboarding (separate flows for player, coach, parent?)
- Adult player registration flow
- Permission grant flows (adult accessing their own data)

### Feature Mapping
**List All Features by Role:**
- Player features (player passport, own assessments, own development goals)
- Coach features (team management, assessments, voice notes)
- Parent features (child profiles, communications, medical card)
- Admin features (organization management, user management)

**Identify Overlaps:**
- Features used by multiple roles
- Features that need different views per role
- Features that conflict across roles

## Proposed Solution: Role Switcher

### Primary Role Concept
**User sets a primary role:**
- Default dashboard when logging in
- Influences which quick actions are shown
- Determines notification preferences
- Can be changed anytime in settings

### Role Switcher UI
**Global role switcher in navbar:**
```
[Current Role: Coach ▾]

Dropdown:
✓ Coach (5 teams)
  Player (Men's Team A)
  Parent (2 children)
  Admin
```

**Clicking switches active role:**
- Dashboard changes to role-specific view
- Navigation items adjust
- Quick actions change
- Permissions apply based on selected role

### Unified Dashboard Option
**Alternative: Single dashboard showing all roles**
- Sectioned by role (Coach section, Parent section, Player section)
- User can customize which sections to show
- Quick role-based filters
- More complex but shows everything at once

## User Workflows to Design

### Scenario 1: Morning Check-in (Player + Coach + Parent)
1. Mike logs in, default role is "Coach" (his primary)
2. Sees coach dashboard with 5 tasks
3. Completes 2 quick coaching tasks
4. Switches to "Parent" role
5. Checks daughter's upcoming matches
6. Acknowledges coach feedback about daughter
7. Switches to "Player" role
8. Reviews own player passport
9. Sees upcoming training tonight
10. Logs out

### Scenario 2: First-Time Adult Player Registration
1. Sarah signs up as parent (has 2 children)
2. Completes parent onboarding flow
3. Later decides to join women's team
4. Navigates to "Add Role" in settings
5. Selects "I'm also a player"
6. Completes player registration
7. Now has both Parent and Player roles
8. Sets "Parent" as primary role (sees parent dashboard by default)

### Scenario 3: Coach Viewing Own Child's Profile
1. John is logged in as "Coach"
2. Viewing his U10 team roster
3. Sees his son in the roster
4. Clicks on son's profile
5. System detects: Coach has parent relationship with this player
6. Shows enhanced view (parent + coach combined view)
7. Can perform both coach actions (assessments) and parent actions (medical card update)

### Scenario 4: Admin Playing on Team They Manage
1. Emma is club admin and plays on women's team
2. Logged in as "Admin"
3. Navigating to women's team management
4. Wants to add herself to match lineup
5. System allows (she's both admin and player on this team)
6. Can manage team as admin OR view as player
7. Clear indication of current role context

## Technical Implementation

### Database Schema
**User Role Management:**
```typescript
// Better Auth member table (extended)
member {
  userId: string
  organizationId: string
  role: "owner" | "admin" | "coach" | "parent" | "member"
  functionalRoles: string[] // ["coach", "parent", "player"]
  activeFunctionalRole: string // Current selected role
  primaryFunctionalRole: string // Default on login
}

// Adult player enrollment
orgPlayerEnrollments {
  // Same as youth players, but ageGroup is "adult"/"senior"
  // Linked to user via userId (if adult player)
}

// Link between adult player and their user account
adultPlayerLinks {
  userId: string
  playerId: Id<"orgPlayerEnrollments">
  organizationId: string
}
```

### Role Switching Logic
```typescript
// Context hook
const { currentRole, availableRoles, switchRole } = useRoleContext()

// Switch role
switchRole("coach") // Updates activeFunctionalRole
// Dashboard re-renders with coach view
// Navigation updates
// Permissions adjust
```

### Permission Checks
```typescript
// Enhanced permission check
function canAccess(user, resource, action) {
  // Check user's current role
  // Check user's relationship to resource
  // Apply role-specific rules
  // Handle special cases (viewing own data, etc.)
}
```

## Design Requirements

### Role Clarity
- Always show current role prominently
- Easy access to role switcher (1-2 clicks max)
- Visual distinction between roles (icons, colors)
- Breadcrumb or context indicator

### Dashboard Customization
- Users can set primary role
- Option to customize dashboard layout
- Show/hide sections based on roles
- Quick action customization per role

### Mobile Optimization
- Role switcher accessible on mobile
- Touch-friendly interface
- Role-specific mobile views
- Consistent navigation across roles

## Success Criteria
- Adults with multiple roles can easily switch contexts
- No confusion about which role they're acting in
- All role combinations work seamlessly
- Permission system properly handles multi-role scenarios
- User satisfaction with multi-role experience is high (4.5+ rating)
- Clear documentation of all flows and features per role

## Implementation Phases

### Phase 1: Audit & Documentation
- Review existing codebase for adult player implementation
- Document all flows and their current state
- Map all features by role
- Identify gaps and inconsistencies

### Phase 2: Role Switching Infrastructure
- Implement role switcher UI
- Build role context system
- Update permission checks
- Test role switching across app

### Phase 3: Dashboard Optimization
- Design role-specific dashboards
- Implement primary role setting
- Build unified dashboard option
- User testing with multi-role scenarios

### Phase 4: Edge Cases & Polish
- Handle complex permission scenarios
- Optimize workflows for common role combinations
- User testing and feedback
- Documentation and help content

## References
- Existing Better Auth member table with `functionalRoles`
- `activeFunctionalRole` field (already in schema)
- Adult player enrollment implementation (partially done)
- Multi-team player system: `docs/architecture/multi-team-system.md`

## Open Questions
1. Should role switching require re-authentication for sensitive roles (admin)?
2. Can users have multiple roles in different organizations?
3. Should there be role-specific notification preferences?
4. How do we handle role conflicts (e.g., coach and parent of player on same team)?
5. Should adult players see youth-focused development features or different ones?
6. Do we need separate player passports for adults vs. youth players?
