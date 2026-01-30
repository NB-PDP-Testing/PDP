# Onboarding Phase 7 - Player Dashboard & Graduation Flow

> Auto-generated documentation - Last updated: 2026-01-28 19:55

## Status

- **Branch**: `ralph/onboarding-phase-7`
- **Progress**: 11 / 11 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-001: Add claim fields to playerIdentities schema

As the system, I track when a player has claimed their account.

**Acceptance Criteria:**
- Edit: packages/backend/convex/schema.ts
- Find the playerIdentities table (or orgPlayerEnrollments if using that)
- Add these optional fields:
-   userId: v.optional(v.string()),           // Set when player claims account
-   claimedAt: v.optional(v.number()),        // Timestamp of claim
-   claimInvitedBy: v.optional(v.string()),   // Guardian userId who initiated
- 
- Run: npx -w packages/backend convex codegen
- Run: npm run check-types

### US-002: Create playerGraduations table for tracking

As the system, I track players who have turned 18 and their graduation status.

**Acceptance Criteria:**
- Edit: packages/backend/convex/schema.ts
- Add new table playerGraduations:
- 
- playerGraduations: defineTable({
-   playerIdentityId: v.id('playerIdentities'),  // or orgPlayerEnrollments
-   organizationId: v.string(),
-   dateOfBirth: v.number(),
-   turnedEighteenAt: v.number(),
-   status: v.union(
-     v.literal('pending'),          // Detected, not yet actioned
-     v.literal('invitation_sent'),  // Guardian sent invite
-     v.literal('claimed'),          // Player claimed account
-     v.literal('dismissed')         // Guardian dismissed prompt
-   ),
-   invitationSentAt: v.optional(v.number()),
-   invitationSentBy: v.optional(v.string()),
-   claimedAt: v.optional(v.number()),
-   dismissedAt: v.optional(v.number()),
-   dismissedBy: v.optional(v.string()),
- })
-   .index('by_status', ['status'])
-   .index('by_player', ['playerIdentityId']),
- 
- Run: npx -w packages/backend convex codegen
- Run: npm run check-types

### US-003: Create playerClaimTokens table

As the system, I generate secure tokens for players to claim their accounts.

**Acceptance Criteria:**
- Edit: packages/backend/convex/schema.ts
- Add new table playerClaimTokens:
- 
- playerClaimTokens: defineTable({
-   playerIdentityId: v.id('playerIdentities'),
-   token: v.string(),
-   email: v.string(),
-   createdAt: v.number(),
-   expiresAt: v.number(),           // 30 days validity
-   usedAt: v.optional(v.number()),
- })
-   .index('by_token', ['token'])
-   .index('by_player', ['playerIdentityId']),
- 
- Run: npx -w packages/backend convex codegen
- Run: npm run check-types

### US-004: Create birthday detection scheduled job

As the system, I detect players who have turned 18 and create graduation records.

**Acceptance Criteria:**
- Create: packages/backend/convex/jobs/graduations.ts
- 
- Create internal mutation: detectPlayerGraduations
- Logic:
-   - Get current date
-   - Query players where dateOfBirth <= 18 years ago AND no graduation record exists
-   - For each, create playerGraduations record with status = 'pending'
- 
- const EIGHTEEN_YEARS_MS = 18 * 365.25 * 24 * 60 * 60 * 1000;
- 
- export const detectPlayerGraduations = internalMutation({
-   handler: async (ctx) => {
-     const eighteenYearsAgo = Date.now() - EIGHTEEN_YEARS_MS;
-     
-     // Get players born 18+ years ago
-     const players = await ctx.db
-       .query('playerIdentities')
-       .filter(q => q.and(
-         q.lte(q.field('dateOfBirth'), eighteenYearsAgo),
-         q.eq(q.field('userId'), undefined)  // Not yet claimed
-       ))
-       .collect();
-     
-     let created = 0;
-     for (const player of players) {
-       // Check if graduation record already exists
-       const existing = await ctx.db
-         .query('playerGraduations')
-         .withIndex('by_player', q => q.eq('playerIdentityId', player._id))
-         .first();
-       
-       if (!existing) {
-         await ctx.db.insert('playerGraduations', {
-           playerIdentityId: player._id,
-           organizationId: player.organizationId,
-           dateOfBirth: player.dateOfBirth,
-           turnedEighteenAt: player.dateOfBirth + EIGHTEEN_YEARS_MS,
-           status: 'pending',
-         });
-         created++;
-       }
-     }
-     console.log(`Created ${created} graduation records`);
-   },
- });
- 
- Add to crons.ts:
- crons.daily('detect-player-birthdays', { hourUTC: 6, minuteUTC: 0 }, internal.jobs.graduations.detectPlayerGraduations);
- 
- Run: npm run check-types

### US-005: Create guardian prompt for pending graduations

As a guardian with a child who turned 18, I see a prompt to send them an account claim invitation.

**Acceptance Criteria:**
- Create: apps/web/src/components/graduation/guardian-prompt.tsx
- 
- Query: getPendingGraduations
- Args: none (uses authenticated user as guardian)
- Returns: v.array(v.object({ playerName, dateOfBirth, turnedEighteenAt, playerIdentityId }))
- Logic: Get guardian's linked children → Filter for those with pending graduation records
- 
- Component structure (shadcn/ui AlertDialog):
- - Title: '{playerName} has turned 18!'
- - Text: 'They can now have their own account to view their development history.'
- - Input: Email address for the player
- - Button: 'Send Invitation' → Creates claim token, sends email
- - Button: 'Not Now' (secondary) → Dismisses for now, shows again next login
- - Button: 'Don't Ask Again' (tertiary, text) → Marks as dismissed permanently
- 
- Add to OnboardingOrchestrator:
- - Check for pending graduations after other steps
- - If found, show GuardianPrompt
- 
- Run: npm run check-types

### US-006: Create sendGraduationInvite mutation

As a guardian, I can send an account claim invitation to my child who turned 18.

**Acceptance Criteria:**
- Create: packages/backend/convex/models/playerGraduations.ts
- 
- Mutation: sendGraduationInvite
- Args: { playerIdentityId: v.id('playerIdentities'), playerEmail: v.string() }
- Returns: v.object({ success: v.boolean(), token: v.optional(v.string()) })
- 
- Logic:
-   1. Verify current user is a guardian of this player
-   2. Verify graduation record exists and status = 'pending'
-   3. Generate secure token (use crypto.randomUUID or similar)
-   4. Create playerClaimTokens record:
-      {
-        playerIdentityId,
-        token,
-        email: playerEmail,
-        createdAt: Date.now(),
-        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,  // 30 days
-      }
-   5. Update graduation record:
-      status = 'invitation_sent',
-      invitationSentAt = Date.now(),
-      invitationSentBy = userId
-   6. Send email with claim link: /claim-account/{token}
-   7. Return { success: true, token }
- 
- Run: npm run check-types

### US-007: Create dismissGraduationPrompt mutation

As a guardian, I can dismiss the graduation prompt permanently.

**Acceptance Criteria:**
- Edit: packages/backend/convex/models/playerGraduations.ts
- 
- Mutation: dismissGraduationPrompt
- Args: { playerIdentityId: v.id('playerIdentities') }
- Returns: v.null()
- 
- Logic:
-   1. Verify current user is a guardian of this player
-   2. Update graduation record:
-      status = 'dismissed',
-      dismissedAt = Date.now(),
-      dismissedBy = userId
- 
- Run: npm run check-types

### US-008: Create claim account page and wizard

As a player receiving a claim invitation, I can claim my account through a wizard.

**Acceptance Criteria:**
- Create: apps/web/src/app/claim-account/[token]/page.tsx
- 
- Query: getPlayerClaimStatus
- Args: { token: v.string() }
- Returns: v.object({
-   valid: v.boolean(),
-   expired: v.boolean(),
-   used: v.boolean(),
-   playerName: v.optional(v.string()),
-   organizationName: v.optional(v.string()),
- })
- 
- If invalid/expired/used: Show error message with appropriate action
- 
- Claim wizard steps:
- 1. Welcome: 'Hi {playerName}! Claim your account to access your development history'
- 2. Account: Sign up or sign in (if already have account)
- 3. GDPR: Accept privacy policy (reuse GdprConsentStep)
- 4. Review: Show player profile summary, confirm
- 
- Create: apps/web/src/components/graduation/claim-wizard.tsx
- Stepper component with 4 steps
- 
- Run: npm run check-types

### US-009: Create claimPlayerAccount mutation

As a player completing the claim wizard, I finalize claiming my account.

**Acceptance Criteria:**
- Edit: packages/backend/convex/models/playerGraduations.ts
- 
- Mutation: claimPlayerAccount
- Args: {
-   token: v.string(),
-   userId: v.string(),  // From authenticated session
- }
- Returns: v.object({ success: v.boolean(), playerIdentityId: v.optional(v.id('playerIdentities')) })
- 
- Logic:
-   1. Verify token is valid and not expired or used
-   2. Get playerIdentityId from token
-   3. Update playerIdentities:
-      userId = args.userId,
-      claimedAt = Date.now(),
-      claimInvitedBy = (from graduation record)
-   4. Update graduation record:
-      status = 'claimed',
-      claimedAt = Date.now()
-   5. Mark token as used:
-      usedAt = Date.now()
-   6. Create notification for guardian: '{playerName} has claimed their account'
-   7. Return { success: true, playerIdentityId }
- 
- Run: npm run check-types

### US-010: Create basic player dashboard page

As a player who has claimed their account, I have a dashboard to view my information.

**Acceptance Criteria:**
- Create: apps/web/src/app/orgs/[orgId]/player/page.tsx
- 
- Page requires: User has a claimed playerIdentity in this org
- 
- Query: getPlayerDashboard
- Args: { organizationId: v.string() }
- Returns: Player info, teams, development goals, recent assessments
- 
- UI structure:
- - Welcome message with player name
- - Profile card: Photo, name, age group, position
- - Teams list: Current team assignments
- - Development goals: Progress on assigned goals
- - Recent activity: Latest coach notes, assessments
- 
- Keep it read-only for MVP. Players view, not edit.
- 
- Run: npm run check-types

### US-011: Add player dashboard link to navigation

As a player, I see a link to my dashboard in the navigation.

**Acceptance Criteria:**
- Edit: apps/web/src/components/layout/org-sidebar.tsx (or wherever nav is)
- 
- Add query: hasPlayerDashboard
- Args: { userId, organizationId }
- Returns: v.boolean()
- Logic: Check if user has a claimed playerIdentity in this org
- 
- In navigation:
- if (hasPlayerDashboard) {
-   // Add link
-   <NavLink href={`/orgs/${orgId}/player`} icon={User}>
-     My Dashboard
-   </NavLink>
- }
- 
- Run: npm run check-types


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- OnboardingOrchestrator uses task types - add new types to both frontend and backend
- Better Auth organization access: use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`
- Biome requires regex to be at module level (useTopLevelRegex rule)
- The `organization` table is managed by Better Auth - can't query directly with ctx.db
- Previous iteration (US-001-004) left uncommitted changes in working directory
- GuardianPrompt requires both getPendingGraduations query AND mutations to be defined

**Gotchas encountered:**
- The `organization` table is managed by Better Auth - can't query directly with ctx.db
- Previous iteration (US-001-004) left uncommitted changes in working directory
- GuardianPrompt requires both getPendingGraduations query AND mutations to be defined
- Adding task type to orchestrator requires updates in 3 places: type definition, handler, title/description switches
- [ ] US-008: Create claim account page and wizard at /claim-account/[token]
- [ ] US-009: Create claimPlayerAccount mutation

### Files Changed

- apps/web/src/components/graduation/guardian-prompt.tsx (+239, new)
- apps/web/src/components/onboarding/onboarding-orchestrator.tsx (+26)
- packages/backend/convex/models/playerGraduations.ts (+293, new)
- packages/backend/convex/models/onboarding.ts (+99, -3)
- packages/backend/convex/_generated/api.d.ts (+4)
- ✅ Type check: passed
- ✅ Linting: passed (pre-existing errors in other files not addressed)
- ⏭️ Browser verification: Not applicable (no UI changes visible without test data)
- OnboardingOrchestrator uses task types - add new types to both frontend and backend
- Better Auth organization access: use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`
- Biome requires regex to be at module level (useTopLevelRegex rule)
- The `organization` table is managed by Better Auth - can't query directly with ctx.db
- Previous iteration (US-001-004) left uncommitted changes in working directory


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
