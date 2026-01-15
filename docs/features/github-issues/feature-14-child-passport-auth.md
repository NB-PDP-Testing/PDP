# Child Player Passport Authorization for Parents

## Overview
Design and implement a comprehensive system that allows parents/guardians to authorize their under-18 child to view their own player passport. This feature must be fully thought out, comprehensively reviewed against existing codebase, and deliver a seamless experience.

## Current State
- Wired up but not fully tested
- Parent authorization mechanism exists (partially)
- Unclear what the full intent and user experience should be
- Not integrated across all relevant features
- Edge cases not fully handled

## Purpose
Enable parents to grant their child (under 18) access to view their own player development information on the platform. This:
- Empowers young athletes to take ownership of their development
- Encourages self-reflection and goal-setting
- Supports player autonomy as they mature
- Maintains parental control and oversight
- Complies with child safety and privacy regulations

## Key Concepts

### Parental Consent Required
- By default, children under 18 cannot access the platform
- Parents must explicitly authorize their child's access
- Authorization can be granted, revoked, or modified at any time
- Different authorization levels available

### Child Account Types
1. **No Access** (Default)
   - Child has no login, parent views everything for them
   - Safest option for young children

2. **View-Only Access**
   - Child can log in and view their player passport
   - Cannot edit information or interact
   - Appropriate for ages 13-17

3. **Limited Interaction**
   - Can view passport + set own development goals
   - Can acknowledge coach feedback
   - Cannot modify medical information
   - Appropriate for mature teens (16-17)

4. **Full Access at 18**
   - Automatic transition when child turns 18
   - Full control of their own data
   - Parent access becomes optional (child must grant)

## What is Included in Player Passport?

When authorized, child can view:
- Personal information (name, DOB, team assignments)
- Skill assessments and ratings
- Development goals and progress
- Coach feedback and voice notes (if parent allows)
- Training attendance
- Match participation
- Achievements and milestones
- Performance reviews
- Progress charts and visualizations

**NOT included (parent-only):**
- Medical information (medical card, injuries, health)
- Emergency contacts
- Parent communications with coach
- Administrative information (fees, registrations)
- Sensitive coach notes (if marked as parent-only)

## User Workflows

### Workflow 1: Parent Grants Access for First Time
1. Parent navigates to child's profile settings
2. Sees section: "Grant Access to Child"
3. Toggle: "Allow [child name] to view their player passport"
4. Selects access level:
   - View only (recommended for ages 13-15)
   - View + interact (recommended for ages 16-17)
5. Reviews what child will see (preview)
6. Confirms authorization
7. System generates child account invitation
8. Child receives email: "Your parent has given you access to view your player development"
9. Child creates password/passkey (if first time)
10. Child logs in and sees their player passport

### Workflow 2: Child Logs In and Views Passport
1. Child opens platform and logs in
2. Sees dashboard: "Welcome, [Name]! Here's your player development"
3. Views sections:
   - My Teams
   - Recent Assessments
   - My Development Goals
   - Coach Feedback
   - Upcoming Events
   - Progress Charts
4. Explores their skill ratings over time
5. Reads coach feedback: "Great improvement in passing!"
6. Feels motivated and engaged

### Workflow 3: Parent Revokes Access
1. Parent has concerns about child's usage (e.g., obsessing over ratings)
2. Navigates to child's profile settings
3. Toggles off "Allow [child name] to view their player passport"
4. Confirms revocation
5. Child's access is immediately disabled
6. Next time child logs in: "Your parent has temporarily disabled access. Talk to them if you have questions."

### Workflow 4: Child Turns 18
1. System detects child has turned 18 (birthday)
2. Automatically upgrades child to full adult account
3. Notifies child: "Happy birthday! You now have full control of your account."
4. Notifies parent: "[Child] is now 18 and has full access to their account. Your parental access has been removed unless they grant you access."
5. Child can now:
   - View and edit all their information
   - Grant parent continued access (if they want)
   - Make all their own decisions

### Workflow 5: Child Interacts (Limited Access)
1. Child (age 16) has "View + Interact" access
2. Logs in and sees: "Your coach set a new development goal for you"
3. Views goal: "Improve free-kick accuracy"
4. Can add personal notes: "I'll practice 10 free-kicks after each training"
5. Tracks own progress toward goal
6. Cannot modify coach-set milestones
7. Parent can see child's notes and engagement

## Authorization Levels in Detail

### Level 1: View Only
**Child Can:**
- Log in to platform
- View their player passport
- See assessments, goals, feedback
- View upcoming events
- See progress charts

**Child Cannot:**
- Edit any information
- Respond to coach feedback
- Set their own goals
- Change settings
- View medical information

**Use Case**: Young teens (13-15) who benefit from seeing their progress but shouldn't have editing rights.

### Level 2: View + Interact
**Child Can:**
- Everything from Level 1, PLUS:
- Set personal development goals (coach approval required)
- Add notes to coach feedback
- Track own training activities
- Mark attendance (pending coach approval)
- Acknowledge coach messages

**Child Cannot:**
- Edit personal information
- View/edit medical information
- Communicate directly with coach (parent mediates)
- Change team assignments

**Use Case**: Mature teens (16-17) who are ready for more autonomy in their development.

### Level 3: Full Access (18+)
**Child (now adult) Can:**
- Everything from Level 2, PLUS:
- Edit all personal information
- View and manage medical information
- Communicate directly with coaches
- Make decisions about data sharing
- Grant/revoke parent access

## Technical Implementation

### Database Schema

```typescript
// Enhanced player enrollment with authorization
orgPlayerEnrollments {
  // ... existing fields

  // Authorization fields for child access
  childAccessEnabled: boolean // Can child log in?
  childAccessLevel: "none" | "view_only" | "view_interact" | "full" // Default: "none"
  childAccessGrantedAt?: Date
  childAccessGrantedBy?: Id<"user"> // Which parent granted it

  // Child user account (if access granted)
  childUserId?: Id<"user"> // Linked user account for child
}

// Parent-child authorization
parentChildAuthorizations {
  id: string
  parentUserId: Id<"user">
  childPlayerId: Id<"orgPlayerEnrollments">
  accessLevel: "view_only" | "view_interact"
  grantedAt: Date
  revokedAt?: Date

  // What can child see?
  includeCoachFeedback: boolean // Default: true
  includeVoiceNotes: boolean // Default: true
  includeDevelopmentGoals: boolean // Default: true
  includeAssessments: boolean // Default: true

  // Never included (parent-only)
  // - Medical information
  // - Emergency contacts
  // - Administrative info
}

// Child account (under 18)
user {
  // ... existing fields

  isChildAccount: boolean // True if under 18
  parentUserId?: Id<"user"> // Link to parent account
  dateOfBirth: Date // For auto-upgrade at 18
  accessLevel: "view_only" | "view_interact" | "full"
}
```

### Permission Checks

```typescript
// Can child access their player passport?
function canChildAccessPassport(childUser, playerId) {
  // Check if child is under 18
  if (calculateAge(childUser.dateOfBirth) >= 18) {
    return true // Full access for adults
  }

  // Check if parent has granted access
  const auth = getParentAuthorization(childUser.id, playerId)

  if (!auth || auth.accessLevel === "none") {
    return false
  }

  return true
}

// Can child edit specific field?
function canChildEdit(childUser, field) {
  if (childUser.accessLevel === "view_only") {
    return false
  }

  if (childUser.accessLevel === "view_interact") {
    // Only certain fields
    return EDITABLE_FIELDS_FOR_CHILD.includes(field)
  }

  if (childUser.accessLevel === "full") {
    return true
  }

  return false
}
```

### Auto-Upgrade at 18

```typescript
// Scheduled job runs daily
async function upgradeChildAccountsAt18() {
  const today = new Date()

  // Find children who turned 18 today
  const children = await ctx.db
    .query("user")
    .withIndex("by_isChildAccount", q => q.eq("isChildAccount", true))
    .collect()

  for (const child of children) {
    const age = calculateAge(child.dateOfBirth)

    if (age >= 18) {
      // Upgrade to full account
      await ctx.db.patch(child._id, {
        isChildAccount: false,
        accessLevel: "full",
        parentUserId: undefined, // Remove parent link
      })

      // Notify child and parent
      await sendEmail(child.email, "You now have full account access!")
      await sendEmail(parent.email, `${child.firstName} is now 18...`)

      // Log the upgrade
      await ctx.db.insert("auditLog", {
        action: "child_account_upgraded",
        userId: child._id,
        timestamp: Date.now(),
      })
    }
  }
}
```

## UI/UX Design

### Parent Settings Page
```
[Child Name]'s Access Settings

Access to Player Passport:
[ Toggle ON/OFF ]

Access Level:
( ) View only - [Child] can see their development but not edit
(•) View + interact - [Child] can also set goals and add notes
( ) No access

What [Child] can see:
✓ Skill assessments and ratings
✓ Development goals
✓ Coach feedback and voice notes
✓ Training attendance
✓ Progress charts

What [Child] cannot see:
• Medical information (you control this)
• Emergency contacts
• Administrative information
• Parent-coach private communications

[Preview what child sees] [Save Changes]
```

### Child Dashboard (View Only)
```
Welcome, Sarah!

Here's your player development

📊 My Progress
Recent assessment: 4.2/5.0 (↑ 0.3 from last month)
[View details]

🎯 My Goals
1. Improve passing accuracy - 75% complete
2. Increase sprint speed - 45% complete
[View all goals]

💬 Coach Feedback
"Great improvement this week, Sarah!" - 2 days ago
[View all feedback]

📅 Upcoming
Training: Tomorrow at 6 PM
Match: Saturday at 10 AM
```

### Child Dashboard (View + Interact)
```
[Same as above, plus:]

🎯 My Goals
1. Improve passing accuracy - 75% complete
   [Add note] [Mark milestone complete]
2. Increase sprint speed - 45% complete
   [Add note]
[+ Set personal goal]

💬 Coach Feedback
"Great improvement this week, Sarah!" - 2 days ago
[Add note: "Thank you! I'll keep working on it!"]
```

## Edge Cases to Handle

### Multiple Parents
- If child has 2 parents/guardians, both must agree on access level?
- Or first parent to grant access wins?
- Can parents override each other?

**Proposed Solution**: Either parent can grant access. Any parent can revoke. If revoked by one, must be re-granted by both parents.

### Divorced/Separated Parents
- Child linked to both parents' accounts
- Both parents can see child's passport
- Access level is set per parent? Or unified?

**Proposed Solution**: Unified access level. Either parent can modify (logged for transparency).

### Child with Multiple Teams/Sports
- Child has different player enrollments in different sports
- Access granted per enrollment or globally?

**Proposed Solution**: Global setting. If granted access, child sees all their enrollments.

### Sensitive Coach Feedback
- Coach leaves feedback that parent doesn't want child to see
- E.g., "Concerns about emotional maturity"

**Proposed Solution**:
1. Coach can mark notes as "Parent-only" (child never sees)
2. Parent can hide specific voice notes from child
3. Default: All feedback visible to child (if access granted)

### Child Creates Second Account
- Child already has parent-managed account
- Child creates new account with different email
- Now has 2 identities

**Prevention**:
- Email verification required
- Name + DOB check against existing enrollments
- Alert parents if new account matches child

### Transition at 18 is Mid-Season
- Child turns 18 during active season
- Parent has been managing everything
- Sudden transition might be disruptive

**Solution**:
- Notify child AND parent 30 days before 18th birthday
- Gradual handover: Child gets "full" access but parent maintains view access temporarily
- After 18, child must explicitly grant parent continued access if they want

## Compliance & Safety

### Privacy Regulations
- COPPA (USA): Children under 13 cannot create accounts
- GDPR (EU): Parental consent required for children under 16
- Regional variations: Comply with local laws

**Solution**:
- Minimum age for child access: 13 years
- Require parental consent for 13-17
- Auto-upgrade at 18

### Child Safety
- Monitor child interactions on platform
- Prevent child-to-child messaging (unless 18+)
- Coach-to-child communication must be transparent to parent
- Report inappropriate content

### Data Protection
- Child data is sensitive
- Extra protections for under-18 data
- Audit log of all child account changes
- Parental control and visibility

## Success Criteria
- Parents can easily grant/revoke child access
- Children feel empowered by seeing their progress
- No unauthorized access by children
- Smooth transition to adult account at 18
- Compliance with child safety regulations
- 90%+ parent satisfaction with feature
- Increased player engagement (if access granted)

## Implementation Phases

### Phase 1: Audit & Review
- Review existing codebase for partial implementation
- Document current state
- Identify gaps and issues
- Test existing flows

### Phase 2: Core Authorization System
- Implement parent settings page
- Build child access authorization logic
- Create child account system
- Test grant/revoke workflows

### Phase 3: Child Dashboard
- Design and build child player dashboard
- Implement view-only experience
- Filter sensitive content
- Test with child user accounts

### Phase 4: Interaction Features
- Implement "view + interact" level
- Allow child to set goals, add notes
- Build approval workflows
- Parent visibility of child actions

### Phase 5: Transition & Edge Cases
- Implement auto-upgrade at 18
- Handle edge cases (multiple parents, etc.)
- Build admin tools for support
- Documentation and help content

## References
- Existing partial implementation (locate in codebase)
- Parent dashboard: Feature #8
- Player Passport: `docs/architecture/player-passport.md`
- COPPA and GDPR compliance requirements

## Open Questions
1. Should children be able to download/export their passport?
2. Can children share their passport with friends (e.g., for club transfers)?
3. Should there be gamification elements visible to children (badges, achievements)?
4. Can children delete their account or only parents?
5. Should children receive notifications directly or via parent?
6. What happens if parent and child have conflicting data updates?
