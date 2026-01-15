# Cross-Organization Player Passport Sharing

## Overview
Implement a system that allows parents to authorize the sharing of their child's player passport from one sport/organization to another. This enables collaboration between clubs while keeping the player at the center and parents in full control of their child's data.

## Strategic Importance
This is one of the **core differentiating features** of PlayerARC. By enabling cross-sport, cross-organization collaboration, we:
- Put the player at the center of their development journey
- Enable clubs to learn from each other's coaching insights
- Support multi-sport athletes with unified development tracking
- Build trust through transparent, parent-controlled data sharing
- Create network effects (more orgs = more valuable)

## Current State
- Some thinking has been done (MD files exist)
- Research on industry best practices started
- No implementation exists
- Player data is org-scoped (siloed by design)

## Purpose
Enable parents to:
- Share their child's player passport across organizations
- Control exactly which organizations can see their child's data
- Toggle sharing on/off for specific organizations at any time
- Support their child's multi-sport or club transfer journey

Enable receiving organizations to:
- View shared player passports with parent consent
- Learn from other coaches' insights and assessments
- Make informed decisions about player recruitment
- Collaborate on player development

## User Requirements (From Clarification)
- **All-or-nothing sharing**: No granular field-level control (too complex)
- **Organization-specific control**: Parent can share with Org A but not Org B
- **Toggle control**: Easy on/off switch per organization
- **Simple UX**: Parent shouldn't need technical knowledge

## Key Concepts

### Data Ownership
- **Parent owns child's data** (for players under 18)
- **Adult players own their own data** (18+)
- Organizations are stewards, not owners
- Player passport belongs to player/parent, not club

### Consent-Based Sharing
- **Explicit opt-in**: Sharing is off by default
- **Informed consent**: Parent knows exactly what's shared
- **Revocable**: Can turn off sharing anytime
- **Auditable**: Log all sharing actions

### Cross-Organization Trust
- Organizations must respect parent consent
- Shared data is read-only for receiving org
- No unauthorized data harvesting
- Violations can lead to platform suspension

## User Workflows

### Scenario 1: Parent Shares Passport for Multi-Sport Athlete
1. Sarah's daughter plays GAA (Org A) and soccer (Org B)
2. Sarah is registered as parent in both organizations (separate enrollments)
3. In Org A, navigates to daughter's profile → Sharing Settings
4. Sees: "Share [Daughter]'s player passport with other organizations"
5. Searches for Org B (soccer club)
6. Toggles on: "Allow [Org B] to view [Daughter]'s player passport"
7. Reviews what will be shared (preview)
8. Confirms sharing
9. Org B coaches can now see daughter's GAA development data
10. They notice she has excellent spatial awareness (from GAA) → Useful for soccer position planning

### Scenario 2: Parent Controls Sharing for Club Transfer
1. John's son is transferring from Club X to Club Y (same sport)
2. Club Y wants to see son's development history
3. John authorizes temporary sharing with Club Y
4. Club Y reviews player passport, makes recruitment decision
5. Son joins Club Y
6. John revokes sharing with Club X (old club)
7. Club X loses access immediately
8. John keeps sharing enabled for Club Y (new club)

### Scenario 3: Coach Views Shared Passport
1. Coach at Org B receives notification: "New shared player passport available"
2. Navigates to Shared Passports section
3. Sees: "Sarah's daughter - Shared by parent from [Org A - GAA Club]"
4. Badge indicates: "Read-only - Shared with permission"
5. Opens passport, sees:
   - Skill assessments from GAA coaches
   - Development goals and progress
   - Voice notes (if parent allowed)
   - Training attendance patterns
6. Gains insights into player's strengths/weaknesses
7. Can use this information to optimize player development
8. Cannot edit any data (read-only)

### Scenario 4: Parent Revokes Sharing
1. Parent had shared child's passport with Org C
2. Child leaves Org C (stops playing that sport)
3. Parent navigates to Sharing Settings
4. Toggles off: "Allow [Org C] to view [Child]'s player passport"
5. Confirms revocation
6. Org C immediately loses access to passport
7. Audit log records revocation
8. Org C coach sees: "This shared passport is no longer available"

### Scenario 5: Adult Player (18+) Controls Own Sharing
1. Adult player turns 18, gains full control of account
2. Previously, parent controlled sharing
3. Now player manages their own sharing settings
4. Can share passport with potential clubs for recruitment
5. Can revoke access when no longer needed
6. Player is empowered to manage their own development data

## What Gets Shared?

### Included in Shared Passport (All-or-Nothing)
- ✅ Personal information (name, age, photo)
- ✅ Skill assessments and ratings
- ✅ Development goals and progress
- ✅ Coach feedback and voice notes (with notes about different org context)
- ✅ Training attendance patterns
- ✅ Match participation history
- ✅ Achievements and milestones
- ✅ Progress charts and trends
- ✅ Performance reviews

### NOT Included (Always Private)
- ❌ Medical information (medical card, injuries)
- ❌ Emergency contacts
- ❌ Parent contact information
- ❌ Administrative details (fees, registrations)
- ❌ Sensitive coach-only notes (marked private)

### Read-Only Access
- Receiving organization can view only
- Cannot edit, delete, or export data
- Cannot add their own assessments to shared passport
- Can take notes internally about shared player (their own system)

## Technical Implementation

### Database Schema

```typescript
// Cross-org sharing authorization
passportSharingAuthorizations {
  id: string

  // Source (player being shared)
  sourceOrganizationId: string
  sourcePlayerId: Id<"orgPlayerEnrollments">

  // Target (receiving organization)
  targetOrganizationId: string

  // Authorization
  authorizedBy: Id<"user"> // Parent or adult player
  authorizedAt: number
  revokedAt?: number
  isActive: boolean

  // Metadata
  reason?: string // Optional: "multi-sport", "transfer", "recruitment"
  expiresAt?: number // Optional: Auto-revoke after date
}

// Audit log for sharing actions
passportSharingAuditLog {
  id: string
  authorizationId: Id<"passportSharingAuthorizations">
  action: "authorized" | "revoked" | "accessed"
  performedBy: Id<"user">
  timestamp: number
  ipAddress?: string
  metadata?: object
}

// View tracking (who accessed shared passports)
passportSharingViews {
  id: string
  authorizationId: Id<"passportSharingAuthorizations">
  viewedBy: Id<"user"> // Coach or admin in receiving org
  viewedAt: number
  organizationId: string
}
```

### Query: Get Shared Passports for Organization
```typescript
export const getSharedPassports = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.object({
    // Shared player info
    player: v.object({ /* player data */ }),
    sourceOrganization: v.object({ name: v.string() }),
    sharedAt: v.number(),
    sharedBy: v.string(), // "Parent" or player name
  })),
  handler: async (ctx, args) => {
    // Get all active sharing authorizations for this org
    const auths = await ctx.db
      .query("passportSharingAuthorizations")
      .withIndex("by_targetOrg", q =>
        q.eq("targetOrganizationId", args.organizationId)
         .eq("isActive", true)
      )
      .collect()

    // Fetch player data for each authorization
    const sharedPassports = await Promise.all(
      auths.map(async auth => {
        const player = await ctx.db.get(auth.sourcePlayerId)
        const sourceOrg = await ctx.db
          .query("organization")
          .filter(q => q.eq(q.field("id"), auth.sourceOrganizationId))
          .first()

        return {
          player: {
            // Only include shareable fields
            id: player._id,
            firstName: player.firstName,
            lastName: player.lastName,
            ageGroup: player.ageGroup,
            sport: player.sport,
          },
          sourceOrganization: {
            name: sourceOrg?.name || "Unknown",
          },
          sharedAt: auth.authorizedAt,
          sharedBy: "Parent", // Or fetch actual user name
        }
      })
    )

    return sharedPassports
  },
})
```

### Permission Check
```typescript
function canViewPlayerPassport(user, playerId) {
  // 1. Check if user's organization owns this player
  if (isPlayerInMyOrganization(user, playerId)) {
    return true
  }

  // 2. Check if player's passport is shared with user's organization
  const sharing = getActiveSharingAuthorization(playerId, user.organizationId)

  if (sharing) {
    // Log the access
    logPassportView(sharing.id, user.id)
    return true
  }

  return false
}
```

## UI/UX Design

### Parent Settings Page
```
[Child]'s Player Passport Sharing

Share your child's player passport with other organizations to support their multi-sport development or club transfers.

Currently Sharing With:
• [Org B - Soccer Club] (✓ Active)
  Shared since: Jan 15, 2026
  [Revoke Access]

• [Org C - Rugby Club] (✗ Revoked)
  Shared: Dec 1 - Dec 31, 2025
  [Re-enable]

[+ Share with Another Organization]

What gets shared when you enable sharing:
✓ Skill assessments and development progress
✓ Coach feedback and insights
✓ Training attendance and participation
✓ Achievements and milestones

What does NOT get shared:
• Medical information
• Emergency contacts
• Administrative details

[Learn more about passport sharing]
```

### Share with Organization Flow
```
Share [Child]'s Passport

Step 1: Search for Organization
[Search: "Soccer club..." ]
Results:
- Midtown Soccer Club
- Riverside Soccer Academy
[Select]

Step 2: Review What Will Be Shared
[Org Name] will be able to see:
• Skill assessments and ratings from [Your org]
• Development goals and progress
• Coach feedback (read-only)
• Training patterns and attendance

They will NOT see:
• Medical information
• Your contact details
• Administrative information

Step 3: Confirm
[ ] I understand that I can revoke this access at any time
[ ] I authorize [Org Name] to view my child's player passport

[Cancel] [Authorize Sharing]
```

### Coach View (Receiving Org)
```
Shared Player Passports

These players' passports have been shared with your organization by their parents.

[Sarah's Daughter]
Shared from: Northside GAA Club
Sport: Gaelic Football | Age Group: U14
Shared since: Jan 15, 2026
[View Passport]

[Badge: "Read-Only - Shared with Permission"]

---

Clicking [View Passport]:

[Sarah's Daughter] - Player Passport (Shared)
🔒 This passport is shared with permission. You have read-only access.
📤 Shared from: Northside GAA Club

[Tabs: Overview | Skills | Development | Feedback | Progress]

... standard passport view, but with read-only indicator ...
```

## Privacy & Compliance

### GDPR Compliance
- **Right to Access**: Parent can see what's shared
- **Right to Erasure**: Parent can revoke sharing anytime
- **Right to Portability**: Player passport can be exported
- **Data Processing**: Receiving org is data processor, not controller
- **Consent**: Explicit opt-in required
- **Audit Trail**: Log all sharing and access events

### Child Safety
- For under-18 players, only parent can authorize sharing
- At 18, player takes control
- Organizations verified before they can receive shared data
- Platform staff can revoke sharing if abuse detected

### Organization Trust
- Organizations sign data protection agreement
- Agree not to misuse shared data
- Consequences for violations (suspension, removal)
- Regular audits of shared data access

## Research: Industry Best Practices

### Blockchain for Trust?
**Consideration**: Blockchain for immutable audit trail and decentralized trust

**Pros:**
- Immutable record of sharing authorizations
- No central authority controlling data
- Cryptographic proof of consent

**Cons:**
- Added complexity
- Slower performance
- Requires education (users don't understand blockchain)
- Overkill for current scale

**Decision**: Start with database-based system, explore blockchain if decentralization becomes critical.

### Other Platforms to Study
1. **Academic Transcripts**: Parchment, National Student Clearinghouse
2. **Medical Records**: Health information exchanges (HIEs)
3. **Employment**: LinkedIn endorsements, background checks
4. **Sports**: Existing sports transfer systems

**Key Learnings:**
- Simple consent UI is crucial
- Audit trails build trust
- Revocation must be instant
- Read-only is essential
- Receiving party must be identifiable

## Edge Cases

### Player Enrolled in Both Orgs
- Player has separate enrollments in Org A and Org B
- Org A shares passport with Org B
- Org B already has their own assessment data
- Solution: Show both views, clearly labeled ("From Org A" vs "Your assessments")

### Organization Name Changes
- Org changes name after sharing authorized
- Solution: Track by org ID, not name. Update display name automatically.

### Player Transfers, Sharing Should Follow
- Player moves from Org A to Org B
- Sharing was set up with Org C
- Solution: Sharing is player-centric, not org-centric. If parent still wants to share from new context, they re-authorize.

### Bulk Revocation
- Parent wants to revoke all sharing at once
- Solution: "Revoke All" button, requires confirmation

### Expired Sharing
- Optionally set expiration date (e.g., for recruitment period)
- Solution: Auto-revoke after date, notify parent

## Success Criteria
- **Adoption**: 30%+ of multi-sport players use cross-org sharing
- **Trust**: 90%+ of parents comfortable with sharing controls
- **Value**: Receiving orgs report insights are valuable (survey)
- **Safety**: Zero data misuse incidents
- **Compliance**: 100% GDPR compliant
- **UX**: 4.5+ star rating for sharing feature

## Implementation Phases

### Phase 1: Research & Design (2-3 weeks)
- Complete research on best practices
- Legal review (GDPR, data protection)
- Finalize UX designs
- Get stakeholder sign-off

### Phase 2: Core Sharing Infrastructure (4-5 weeks)
- Build sharing authorization system
- Implement parent sharing settings page
- Create audit log
- Test authorization flow

### Phase 3: Receiving Organization Experience (3-4 weeks)
- Build shared passport view for coaches
- Implement access controls (read-only)
- View tracking
- Test with beta organizations

### Phase 4: Edge Cases & Polish (2-3 weeks)
- Handle all edge cases
- Add bulk operations
- Enhance audit trail
- User testing and feedback

### Phase 5: Launch & Monitor (ongoing)
- Roll out to all organizations
- Monitor usage and trust metrics
- Iterate based on feedback
- Expand features (e.g., blockchain, if needed)

## References
- Existing MD files on passport sharing (locate and review)
- Player Passport architecture: `docs/architecture/player-passport.md`
- GDPR compliance requirements
- Blockchain research (if applicable)

## Related Features
- Parent Dashboard (Feature #8) - Where parents manage sharing
- Child Passport Authorization (Feature #14) - Child viewing own passport
- Adult Multi-Role (Feature #13) - Adult players sharing own passport

## Open Questions
1. Should there be organization-to-organization sharing requests (org initiates)?
2. Can receiving organizations request specific players' passports?
3. Should shared passports have badges/certifications from source org?
4. Can sharing be time-limited by default (e.g., auto-expire after 6 months)?
5. Should there be a "public profile" option (very limited data, discoverable by any org)?
6. How do we handle situations where organizations are competitors (privacy concerns)?
