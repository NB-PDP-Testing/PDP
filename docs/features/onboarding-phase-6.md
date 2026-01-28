# Onboarding Phase 6 - Polish, Scheduled Jobs & Edge Cases

> Auto-generated documentation - Last updated: 2026-01-28 17:43

## Status

- **Branch**: `ralph/onboarding-phase-6`
- **Progress**: 15 / 15 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-001: Add error handling wrapper for onboarding components

As a user encountering an error during onboarding, I see a friendly message with retry option.

**Acceptance Criteria:**
- Create: apps/web/src/components/onboarding/error-boundary.tsx
- 
- Create OnboardingErrorBoundary component:
- - Wrap children with React error boundary
- - On error, show Card with:
-   - Title: 'Something went wrong'
-   - Message: 'We encountered an issue. Please try again.'
-   - Button: 'Try Again' (resets error boundary)
-   - Link: 'Contact Support' (opens support email/page)
- 
- Apply to OnboardingOrchestrator:
- Edit: apps/web/src/components/onboarding/onboarding-orchestrator.tsx
- Wrap OnboardingStepRenderer with OnboardingErrorBoundary
- 
- For mutations, add try/catch with toast errors:
- try {
-   await mutation(args);
- } catch (error) {
-   toast.error('Failed to complete. Please try again.');
-   // Log to error tracking service
- }
- 
- Run: npm run check-types

### US-002: Implement skip behavior for child linking

As a parent, I can skip child linking (max 3 times) and it will re-appear on next login.

**Acceptance Criteria:**
- Edit: packages/backend/convex/schema.ts
- Add to user table:
-   childLinkingSkipCount: v.optional(v.number()),  // Max 3
- 
- Edit: apps/web/src/components/onboarding/child-linking-step.tsx
- Add 'Skip for Now' button (secondary, only if skipCount < 3):
- 
- const handleSkip = async () => {
-   await incrementSkipCount();
-   onComplete();  // Closes modal, continues to next step
- };
- 
- If skipCount >= 3, don't show skip button (must action)
- 
- Edit: packages/backend/convex/models/onboarding.ts
- In getOnboardingTasks, for child_linking:
-   - Always include task if pending links exist (even if skipped)
-   - Include skipCount in task data so UI can hide/show skip button
- 
- Run: npm run check-types
- Test: Parent skips 3 times → Fourth time, no skip button available

### US-003: Add help footer to onboarding modals

As a user in an onboarding modal, I see help links at the bottom.

**Acceptance Criteria:**
- Create: apps/web/src/components/onboarding/help-footer.tsx
- 
- Component structure:
- - Separator line
- - Text: 'Need help?' + email link
- - Optional: Link to help docs/FAQ
- 
- const HelpFooter = () => (
-   <div className='mt-4 pt-4 border-t text-sm text-muted-foreground'>
-     <p>
-       Need help?{' '}
-       <a href='mailto:support@playerarc.com' className='underline'>
-         Contact Support
-       </a>
-     </p>
-   </div>
- );
- 
- Add to all onboarding step components:
- - GdprConsentStep
- - ChildLinkingStep
- - ExpiredInvitationView
- 
- Run: npm run check-types

### US-004: Add accessibility improvements to modals

As a user with accessibility needs, I can navigate onboarding modals with keyboard and screen reader.

**Acceptance Criteria:**
- Review all onboarding components for accessibility:
- 
- Keyboard navigation:
- - Tab moves between interactive elements
- - Enter activates buttons
- - Escape doesn't close modal (blocking modals)
- - Focus trapped within modal
- 
- Screen reader:
- - All modals have aria-labelledby (title)
- - All modals have aria-describedby (description)
- - Form inputs have labels
- - Error messages have aria-live='polite'
- - Progress indicators have aria-valuemin, aria-valuemax, aria-valuenow
- 
- Color contrast:
- - Verify all text meets WCAG AA (4.5:1 for normal, 3:1 for large)
- - Verify buttons have sufficient contrast
- 
- Test with keyboard only - should be able to complete all flows
- Test with VoiceOver/NVDA if available
- 
- Run: npm run check-types

### US-005: Add mobile responsive styles to modals

As a mobile user, onboarding modals display correctly on small screens.

**Acceptance Criteria:**
- Review all onboarding components for mobile:
- 
- For viewports < 640px:
- - Modals become full-screen (100vh, 100vw)
- - Remove rounded corners on full-screen
- - Scrollable content area
- - Sticky footer with action buttons
- 
- Add responsive classes:
- <AlertDialogContent className='sm:max-w-md max-sm:h-screen max-sm:w-screen max-sm:rounded-none'>
- 
- Touch-friendly:
- - All buttons min 44x44px tap target
- - Checkboxes have larger tap area (include label)
- - Adequate spacing between interactive elements
- 
- Test on mobile device or Chrome DevTools device mode
- 
- Run: npm run check-types

### US-006: Add analytics events for onboarding funnel

As the product team, I can track onboarding completion rates and drop-off points.

**Acceptance Criteria:**
- Edit: apps/web/src/lib/analytics.ts (or create if doesn't exist)
- 
- Add onboarding tracking functions:
- 
- export function trackOnboardingStarted(entryType: string, userType: string) {
-   posthog.capture('onboarding_started', { entry_type: entryType, user_type: userType });
- }
- 
- export function trackOnboardingStepShown(stepId: string, stepNumber: number) {
-   posthog.capture('onboarding_step_shown', { step_id: stepId, step_number: stepNumber });
- }
- 
- export function trackOnboardingStepCompleted(stepId: string, durationSeconds: number) {
-   posthog.capture('onboarding_step_completed', { step_id: stepId, duration_seconds: durationSeconds });
- }
- 
- export function trackOnboardingStepSkipped(stepId: string, skipCount: number) {
-   posthog.capture('onboarding_step_skipped', { step_id: stepId, skip_count: skipCount });
- }
- 
- export function trackOnboardingCompleted(totalDuration: number, stepsCompleted: number) {
-   posthog.capture('onboarding_completed', { total_duration: totalDuration, steps_completed: stepsCompleted });
- }
- 
- Add calls to OnboardingOrchestrator and step components
- 
- Run: npm run check-types

### US-007: Create archivedInvitations table

As the system, I store archived invitations separately for long-term audit.

**Acceptance Criteria:**
- Edit: packages/backend/convex/schema.ts
- Add new table archivedInvitations:
- 
- archivedInvitations: defineTable({
-   originalInvitationId: v.string(),
-   organizationId: v.string(),
-   email: v.string(),
-   role: v.string(),
-   metadata: v.any(),
-   createdAt: v.number(),
-   expiredAt: v.number(),
-   archivedAt: v.number(),
-   archivedReason: v.union(
-     v.literal('expired_30_days'),
-     v.literal('manual_archive'),
-     v.literal('user_cancelled')
-   ),
- })
-   .index('by_organization', ['organizationId'])
-   .index('by_archived_at', ['archivedAt']),
- 
- Run: npx -w packages/backend convex codegen
- Run: npm run check-types

### US-008: Create scheduled job: Mark expired invitations

As the system, I automatically mark invitations as expired when they pass their expiration date.

**Acceptance Criteria:**
- Create: packages/backend/convex/jobs/invitations.ts
- 
- Create internal mutation: markExpiredInvitations
- Logic:
-   - Query invitations where status = 'pending' AND expiresAt < Date.now()
-   - Update each to status = 'expired'
-   - Log count for monitoring
- 
- export const markExpiredInvitations = internalMutation({
-   handler: async (ctx) => {
-     const expired = await ctx.db
-       .query('invitation')
-       .withIndex('by_status_expires', q => q.eq('status', 'pending'))
-       .filter(q => q.lt(q.field('expiresAt'), Date.now()))
-       .collect();
- 
-     for (const inv of expired) {
-       await ctx.db.patch(inv._id, { status: 'expired' });
-     }
- 
-     console.log(`Marked ${expired.length} invitations as expired`);
-   },
- });
- 
- Note: May need to add index 'by_status_expires' to invitation table
- 
- Run: npm run check-types

### US-009: Create scheduled job: Auto re-invite for enabled orgs

As the system, I automatically resend invitations for organizations with auto re-invite enabled.

**Acceptance Criteria:**
- Edit: packages/backend/convex/jobs/invitations.ts
- 
- Create internal mutation: processAutoReInvites
- Logic:
-   - Query organizations where autoReInviteOnExpiration = true
-   - For each org, get expired invitations where autoReInviteCount < maxAutoReInvitesPerInvitation
-   - Create new invitation for each, increment autoReInviteCount
-   - Send email
- 
- export const processAutoReInvites = internalMutation({
-   handler: async (ctx) => {
-     const orgs = await ctx.db
-       .query('organization')
-       .filter(q => q.eq(q.field('autoReInviteOnExpiration'), true))
-       .collect();
- 
-     let totalResent = 0;
-     for (const org of orgs) {
-       const maxReInvites = org.maxAutoReInvitesPerInvitation ?? 2;
-       const expired = await ctx.db
-         .query('invitation')
-         .withIndex('by_organization_status', q => q.eq('organizationId', org._id).eq('status', 'expired'))
-         .filter(q => q.lt(q.field('autoReInviteCount') ?? 0, maxReInvites))
-         .collect();
- 
-       for (const inv of expired) {
-         // Create new invitation with same details
-         // Send email
-         // Increment autoReInviteCount on original
-         totalResent++;
-       }
-     }
-     console.log(`Auto re-invited ${totalResent} invitations`);
-   },
- });
- 
- Run: npm run check-types

### US-010: Create scheduled job: Admin expiration alerts

As an admin, I receive email alerts about invitations expiring soon.

**Acceptance Criteria:**
- Edit: packages/backend/convex/jobs/invitations.ts
- 
- Create internal mutation: sendExpirationAlerts
- Logic:
-   - For each organization, get admins
-   - Count invitations expiring in next 48 hours
-   - If count > 0 and org.notifyAdminsOnExpiration !== false, send summary email
- 
- Email content:
- Subject: '{count} invitations expiring soon'
- Body:
- - List of invitations expiring
- - Link to invitation management page
- - Option to bulk resend
- 
- Note: Email sending requires action (external API)
- Consider using Resend or similar email service
- 
- Run: npm run check-types

### US-011: Create scheduled job: Archive old invitations

As the system, I archive expired invitations older than 30 days.

**Acceptance Criteria:**
- Edit: packages/backend/convex/jobs/invitations.ts
- 
- Create internal mutation: archiveOldInvitations
- Logic:
-   - Query invitations where status = 'expired' AND expiredAt < Date.now() - 30 days
-   - For each, create record in archivedInvitations table
-   - Delete from invitation table
- 
- const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
- 
- export const archiveOldInvitations = internalMutation({
-   handler: async (ctx) => {
-     const cutoff = Date.now() - THIRTY_DAYS_MS;
-     const old = await ctx.db
-       .query('invitation')
-       .withIndex('by_status', q => q.eq('status', 'expired'))
-       .filter(q => q.lt(q.field('expiredAt') ?? q.field('expiresAt'), cutoff))
-       .collect();
- 
-     for (const inv of old) {
-       await ctx.db.insert('archivedInvitations', {
-         originalInvitationId: inv._id,
-         organizationId: inv.organizationId,
-         email: inv.email,
-         role: inv.role,
-         metadata: inv.metadata,
-         createdAt: inv.createdAt,
-         expiredAt: inv.expiredAt ?? inv.expiresAt,
-         archivedAt: Date.now(),
-         archivedReason: 'expired_30_days',
-       });
-       await ctx.db.delete(inv._id);
-     }
-     console.log(`Archived ${old.length} old invitations`);
-   },
- });
- 
- Run: npm run check-types

### US-012: Create scheduled job: Cleanup archived invitations

As the system, I delete archived invitations older than 90 days.

**Acceptance Criteria:**
- Edit: packages/backend/convex/jobs/invitations.ts
- 
- Create internal mutation: cleanupArchivedInvitations
- Logic:
-   - Query archivedInvitations where archivedAt < Date.now() - 90 days
-   - Delete each
- 
- const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
- 
- export const cleanupArchivedInvitations = internalMutation({
-   handler: async (ctx) => {
-     const cutoff = Date.now() - NINETY_DAYS_MS;
-     const old = await ctx.db
-       .query('archivedInvitations')
-       .withIndex('by_archived_at')
-       .filter(q => q.lt(q.field('archivedAt'), cutoff))
-       .collect();
- 
-     for (const inv of old) {
-       await ctx.db.delete(inv._id);
-     }
-     console.log(`Deleted ${old.length} archived invitations`);
-   },
- });
- 
- Run: npm run check-types

### US-013: Configure crons.ts with all scheduled jobs

As the system, I have all scheduled jobs configured in the crons file.

**Acceptance Criteria:**
- Create or edit: packages/backend/convex/crons.ts
- 
- import { cronJobs } from 'convex/server';
- import { internal } from './_generated/api';
- 
- const crons = cronJobs();
- 
- // Invitation lifecycle jobs
- crons.hourly('mark-expired-invitations', { minuteUTC: 0 }, internal.jobs.invitations.markExpiredInvitations);
- crons.daily('auto-reinvite', { hourUTC: 8, minuteUTC: 0 }, internal.jobs.invitations.processAutoReInvites);
- crons.daily('admin-expiration-alerts', { hourUTC: 9, minuteUTC: 0 }, internal.jobs.invitations.sendExpirationAlerts);
- crons.weekly('archive-old-invitations', { dayOfWeek: 'sunday', hourUTC: 2, minuteUTC: 0 }, internal.jobs.invitations.archiveOldInvitations);
- crons.monthly('cleanup-archived', { day: 1, hourUTC: 3, minuteUTC: 0 }, internal.jobs.invitations.cleanupArchivedInvitations);
- 
- export default crons;
- 
- Run: npx -w packages/backend convex codegen
- Run: npm run check-types
- Verify crons appear in Convex dashboard after deploy

### US-014: Handle edge case: User signs up with different email than invited

As a user who signed up with a different email, I see a helpful message about no pending invitations.

**Acceptance Criteria:**
- When user navigates to /orgs/accept-invitation/[id] with an invitation for a different email:
- 
- Edit: apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- 
- Check if invitation.email !== session.user.email:
-   - Show message: 'This invitation was sent to a different email address'
-   - Show the invited email (partially masked): 'Invitation for: j***@example.com'
-   - Suggest: 'Please sign in with the correct email address'
-   - Button: 'Sign Out' to allow signing in with correct account
- 
- Run: npm run check-types
- Test: Invite user@a.com → Sign in as user@b.com → Click link → See mismatch message

### US-015: Handle edge case: Organization deleted during onboarding

As a user whose organization was deleted mid-onboarding, I see an error and am redirected.

**Acceptance Criteria:**
- In OnboardingOrchestrator and individual step components:
- 
- When querying organization data, handle null case:
- const organization = useQuery(api.models.organizations.get, { orgId });
- 
- if (organization === null) {
-   toast.error('This organization no longer exists');
-   router.push('/orgs');
-   return null;
- }
- 
- Similarly for invitation acceptance:
- If invitation exists but organization doesn't, show:
-   - 'This organization no longer exists'
-   - Button: 'Go to Home'
- 
- Run: npm run check-types


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- biome-ignore comments must be directly above the line with the error, not before an `if` block
- Use `type` instead of `interface` for object type definitions per project style
- When shadowing variables in catch blocks, rename to descriptive names like `clearAllResult`
- Pre-commit hook uses `--diagnostic-level=error` so all errors must be fixed
- Moving regex to top-level requires defining const outside component
---
--
- Step components (gdpr-consent-step, child-linking-step) already have try/catch with toast
- Error boundary provides React-level error catching, mutations have app-level catching
- onRetry callback resets to step 0 for clean state

**Gotchas encountered:**
- Pre-commit hook uses `--diagnostic-level=error` so all errors must be fixed
- Moving regex to top-level requires defining const outside component
---

### Files Changed

- apps/web/src/app/login/page.tsx (+70, -28)
- apps/web/src/app/orgs/[orgId]/admin/dev-tools/page.tsx (+73, -40)
- ✅ Type check: passed
- ✅ Linting: passed
- biome-ignore comments must be directly above the line with the error, not before an `if` block
- Use `type` instead of `interface` for object type definitions per project style
- When shadowing variables in catch blocks, rename to descriptive names like `clearAllResult`
- Pre-commit hook uses `--diagnostic-level=error` so all errors must be fixed
- Moving regex to top-level requires defining const outside component
---
--
- apps/web/src/components/onboarding/error-boundary.tsx (new, +108)
- apps/web/src/components/onboarding/onboarding-orchestrator.tsx (+10, -5)
- ✅ Type check: passed
- ✅ Linting: passed


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
