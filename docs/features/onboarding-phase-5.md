# Onboarding Phase 5 - First User Onboarding

> Auto-generated documentation - Last updated: 2026-01-28 17:03

## Status

- **Branch**: `ralph/onboarding-phase-5`
- **Progress**: 12 / 12 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-001: Create isFirstUser helper function

As the system, I can detect if the current user is the first user on a fresh deployment.

**Acceptance Criteria:**
- Create: packages/backend/convex/lib/firstUser.ts
- 
- Export async function isFirstUser(ctx): Promise<boolean> {
-   // Check if any users exist with isPlatformStaff = true
-   const existingStaff = await ctx.db
-     .query('user')
-     .filter(q => q.eq(q.field('isPlatformStaff'), true))
-     .first();
- 
-   return existingStaff === null;
- }
- 
- Note: This should use an index. Consider adding:
-   .index('by_isPlatformStaff', ['isPlatformStaff'])
- to the user table in schema.ts
- 
- Run: npm run check-types

### US-002: Add setup wizard fields to user schema

As the system, I track first user's progress through the setup wizard.

**Acceptance Criteria:**
- Edit: packages/backend/convex/schema.ts
- Find the user table definition (Better Auth extended user)
- Add these optional fields:
-   setupComplete: v.optional(v.boolean()),    // True after first user completes wizard
-   setupStep: v.optional(v.string()),         // Current step: 'gdpr', 'welcome', 'create-org', 'invite', 'complete'
- 
- Run: npx -w packages/backend convex codegen
- Run: npm run check-types

### US-003: Auto-assign Platform Staff on first user signup

As the first user signing up, I automatically receive Platform Staff role.

**Acceptance Criteria:**
- Edit: packages/backend/convex/models/users.ts (or auth hook location)
- Find the post-signup hook or user creation logic
- After user is created, add:
- 
- // Check if this is the first user
- const firstUser = await isFirstUser(ctx);
- if (firstUser) {
-   // Grant Platform Staff
-   await ctx.db.patch(userId, {
-     isPlatformStaff: true,
-     setupComplete: false,
-     setupStep: 'gdpr',
-   });
- }
- 
- Run: npm run check-types
- Test: Fresh deployment → Sign up → Verify isPlatformStaff = true

### US-004: Create setup wizard layout with protection

As a non-Platform Staff user, I cannot access /setup routes.

**Acceptance Criteria:**
- Create: apps/web/src/app/setup/layout.tsx
- 
- Layout logic:
- export default function SetupLayout({ children }) {
-   const { data: session, isPending } = useSession();
-   const router = useRouter();
- 
-   useEffect(() => {
-     if (isPending) return;
-     
-     // Not logged in - redirect to login
-     if (!session?.user) {
-       router.push('/login');
-       return;
-     }
-     
-     // Not platform staff - redirect to home
-     if (!session.user.isPlatformStaff) {
-       router.push('/');
-       return;
-     }
-     
-     // Setup already complete - redirect to orgs
-     if (session.user.setupComplete) {
-       router.push('/orgs');
-       return;
-     }
-   }, [session, isPending, router]);
- 
-   if (isPending || !session?.user?.isPlatformStaff || session.user.setupComplete) {
-     return <LoadingSpinner />;
-   }
- 
-   return (
-     <div className='min-h-screen flex flex-col'>
-       <SetupProgress currentStep={session.user.setupStep} />
-       {children}
-     </div>
-   );
- }
- 
- Run: npm run check-types

### US-005: Create SetupProgress indicator component

As a first user going through setup, I see a progress indicator showing my current step.

**Acceptance Criteria:**
- Create: apps/web/src/components/setup/setup-progress.tsx
- 
- Props: { currentStep: string }
- 
- Define steps array:
- const SETUP_STEPS = [
-   { id: 'gdpr', label: 'Privacy' },
-   { id: 'welcome', label: 'Welcome' },
-   { id: 'create-org', label: 'Create Club' },
-   { id: 'invite', label: 'Invite Team' },
-   { id: 'complete', label: 'Done' },
- ];
- 
- UI structure:
- - Horizontal stepper showing all 5 steps
- - Current step highlighted
- - Completed steps show checkmark
- - Future steps shown as numbers
- - Use shadcn/ui styling (flex, badges)
- 
- Run: npm run check-types

### US-006: Create setup wizard Step 1: GDPR consent page

As a first user, my first setup step is accepting GDPR consent.

**Acceptance Criteria:**
- Create: apps/web/src/app/setup/page.tsx
- 
- This is Step 1: GDPR consent
- 
- Reuse the GdprConsentStep component from Phase 2:
- import { GdprConsentStep } from '@/components/onboarding/gdpr-consent-step';
- 
- Page logic:
- export default function SetupGdprPage() {
-   const router = useRouter();
-   const gdprVersion = useQuery(api.models.gdpr.getCurrentGdprVersion);
-   const updateSetupStep = useMutation(api.models.setup.updateSetupStep);
- 
-   const handleAccept = async () => {
-     await updateSetupStep({ step: 'welcome' });
-     router.push('/setup/welcome');
-   };
- 
-   if (!gdprVersion) return <LoadingSpinner />;
- 
-   return (
-     <div className='container max-w-2xl mx-auto py-8'>
-       <h1>Setup Your Platform</h1>
-       <p>Step 1 of 5: Privacy Policy</p>
-       <GdprConsentStep
-         gdprVersion={gdprVersion}
-         onAccept={handleAccept}
-       />
-     </div>
-   );
- }
- 
- Run: npm run check-types

### US-007: Create setup wizard Step 2: Welcome page

As a first user, I see a welcome message explaining what I can do as Platform Staff.

**Acceptance Criteria:**
- Create: apps/web/src/app/setup/welcome/page.tsx
- 
- UI structure:
- - Title: 'Welcome to PlayerARC'
- - Subtitle: 'You are the first user and have been granted Platform Staff access'
- - Explanation cards:
-   - 'Create Organizations': 'Set up clubs and teams for your sports programs'
-   - 'Manage Users': 'Invite coaches, parents, and administrators'
-   - 'Track Development': 'Monitor player progress across all organizations'
- - Button: 'Continue' → navigates to /setup/create-org
- 
- On continue:
- const updateSetupStep = useMutation(api.models.setup.updateSetupStep);
- 
- const handleContinue = async () => {
-   await updateSetupStep({ step: 'create-org' });
-   router.push('/setup/create-org');
- };
- 
- Run: npm run check-types

### US-008: Create setup wizard Step 3: Create organization page

As a first user, I create my first organization/club during setup.

**Acceptance Criteria:**
- Create: apps/web/src/app/setup/create-org/page.tsx
- 
- Form fields (reuse existing org creation patterns):
- - Organization name (required)
- - Organization slug (auto-generated from name)
- - Primary sport (dropdown)
- - Logo upload (optional)
- - Primary color picker
- - Secondary color picker
- - Tertiary color picker
- 
- Create mutation: createFirstOrganization
- In packages/backend/convex/models/setup.ts:
- 
- export const createFirstOrganization = mutation({
-   args: {
-     name: v.string(),
-     slug: v.string(),
-     sport: v.optional(v.string()),
-     colors: v.optional(v.array(v.string())),
-   },
-   handler: async (ctx, args) => {
-     // Verify user is Platform Staff
-     // Create organization using Better Auth organization plugin
-     // Set user as Owner
-     // Update user setupStep to 'invite'
-     // Return orgId
-   },
- });
- 
- On success: router.push('/setup/invite')
- 
- Run: npm run check-types

### US-009: Create setup wizard Step 4: Invite team page

As a first user, I can optionally invite initial team members during setup.

**Acceptance Criteria:**
- Create: apps/web/src/app/setup/invite/page.tsx
- 
- UI structure:
- - Title: 'Invite Your Team'
- - Subtitle: 'Add colleagues to help manage your organization (you can skip this)'
- - Repeatable row for invitations:
-   - Email input
-   - Role dropdown (Admin, Coach)
-   - Remove button
- - 'Add Another' button
- - Footer buttons:
-   - 'Skip for Now' (secondary) → goes to /setup/complete
-   - 'Send Invitations' (primary) → sends invites then goes to /setup/complete
- 
- Create mutation: sendSetupInvitations
- Args: { orgId: v.string(), invitations: v.array(v.object({ email, role })) }
- Logic: Create invitations for each, send emails
- 
- Run: npm run check-types

### US-010: Create setup wizard Step 5: Complete page

As a first user completing setup, I see a success message and am redirected to my organization.

**Acceptance Criteria:**
- Create: apps/web/src/app/setup/complete/page.tsx
- 
- On mount: Mark setup as complete
- useEffect(() => {
-   completeSetup();
- }, []);
- 
- const completeSetup = useMutation(api.models.setup.completeSetup);
- 
- completeSetup mutation logic:
-   - Update user: setupComplete = true, setupStep = 'complete'
- 
- UI structure:
- - Success icon (CheckCircle)
- - Title: 'You\'re All Set!'
- - Text: 'Your organization has been created and you\'re ready to go.'
- - If invitations were sent: 'Your team members will receive their invitations shortly.'
- - Button: 'Go to Dashboard' → navigates to /orgs/[orgId]
- 
- Auto-redirect after 5 seconds:
- useEffect(() => {
-   const timer = setTimeout(() => {
-     router.push(`/orgs/${orgId}`);
-   }, 5000);
-   return () => clearTimeout(timer);
- }, []);
- 
- Run: npm run check-types

### US-011: Create setup queries and mutations file

As the system, I have a dedicated file for all setup wizard backend logic.

**Acceptance Criteria:**
- Create: packages/backend/convex/models/setup.ts
- 
- Query: getSetupProgress
- Args: none (uses authenticated user)
- Returns: v.object({ step: v.string(), isComplete: v.boolean() })
- Logic: Return user.setupStep and user.setupComplete
- 
- Mutation: updateSetupStep
- Args: { step: v.string() }
- Returns: v.null()
- Logic: Update user.setupStep = step
- 
- Mutation: completeSetup
- Args: none
- Returns: v.null()
- Logic: Update user.setupComplete = true, setupStep = 'complete'
- 
- Mutation: createFirstOrganization (from US-008)
- Mutation: sendSetupInvitations (from US-009)
- 
- Run: npm run check-types

### US-012: Add redirect to setup for first user after login

As a first user who hasn't completed setup, I am redirected to /setup after login.

**Acceptance Criteria:**
- Edit: apps/web/src/app/(auth)/login/page.tsx or auth callback handler
- 
- After successful login, add check:
- if (user.isPlatformStaff && !user.setupComplete) {
-   router.push('/setup');
-   return;
- }
- 
- Also check on the home/orgs page:
- Edit: apps/web/src/app/orgs/page.tsx (or main dashboard)
- If user.isPlatformStaff && !user.setupComplete, redirect to /setup
- 
- Edge case: User refreshes during setup
- - Layout already handles this by checking setupStep
- - Redirect to correct step based on setupStep value
- 
- Run: npm run check-types
- Test: First user signs up → Automatically redirected to /setup


## Implementation Notes

### Key Patterns & Learnings


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
