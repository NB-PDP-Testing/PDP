# Onboarding Phase 1 - Foundation & Critical Bug Fixes

> Auto-generated documentation - Last updated: 2026-01-28 14:04

## Status

- **Branch**: `ralph/onboarding-phase-1`
- **Progress**: 7 / 7 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-001: Debug and fix syncFunctionalRolesFromInvitation to persist child links

As a parent accepting an invitation with pre-linked children, I expect those children to be visible on my dashboard after acceptance.

**Acceptance Criteria:**
- Edit packages/backend/convex/models/members.ts
- Find syncFunctionalRolesFromInvitation function
- Add console.log to trace invitation.metadata.suggestedPlayerLinks
- Verify suggestedPlayerLinks array is being read from invitation metadata
- For each suggested link, create guardianPlayerLink with:
-   - guardianIdentityId: from the matched/created guardian identity
-   - playerIdentityId: from suggestedPlayerLinks[].playerIdentityId
-   - relationship: from suggestedPlayerLinks[].relationship
-   - acknowledgedByParentAt: undefined (pending state)
-   - status: 'pending'
- Ensure guardianIdentity is created/matched BEFORE creating links
- Run: npm run check-types
- Test: Create invitation with 2 children → Accept → Query guardianPlayerLinks → Verify 2 links exist

### US-002: Create getOnboardingTasks query to evaluate pending tasks

As the system, I need to evaluate all pending onboarding tasks for a user and return them in priority order.

**Acceptance Criteria:**
- Create new file: packages/backend/convex/models/onboarding.ts
- Create query: getOnboardingTasks
- Args: none (uses authenticated user from ctx)
- Returns: v.array(v.object({ type: v.string(), priority: v.number(), data: v.any() }))
- 
- Query logic - check in this order:
- 1. Check pending invitations: query invitation table where email = user.email AND status = 'pending'
- 2. Check pending child links: query guardianPlayerLinks where guardianIdentity.userId = user.id AND acknowledgedByParentAt = undefined
- 3. (Future: GDPR check will be added in Phase 2)
- 
- Build task array with priority:
-   - accept_invitation: priority 1
-   - child_linking: priority 2
-   - welcome: priority 3 (if first login to org)
- 
- Return tasks sorted by priority ascending
- Run: npm run check-types
- Run: npx -w packages/backend convex codegen

### US-003: Create OnboardingOrchestrator component skeleton

As a user, I see onboarding steps presented one at a time in a coordinated flow, not multiple overlapping dialogs.

**Acceptance Criteria:**
- Create new file: apps/web/src/components/onboarding/onboarding-orchestrator.tsx
- Create OnboardingOrchestrator component that:
-   - Uses useQuery to call getOnboardingTasks
-   - Maintains state for currentStepIndex (starts at 0)
-   - Renders children (rest of app) always
-   - If tasks.length > 0, renders modal for current task
- 
- Component structure:
- export function OnboardingOrchestrator({ children }: { children: React.ReactNode }) {
-   const tasks = useQuery(api.models.onboarding.getOnboardingTasks);
-   const [currentStepIndex, setCurrentStepIndex] = useState(0);
-   
-   const currentTask = tasks?.[currentStepIndex];
-   
-   const handleStepComplete = () => {
-     setCurrentStepIndex(prev => prev + 1);
-   };
-   
-   return (
-     <>
-       {children}
-       {currentTask && (
-         <OnboardingStepRenderer task={currentTask} onComplete={handleStepComplete} />
-       )}
-     </>
-   );
- }
- 
- Create placeholder OnboardingStepRenderer that just shows task.type in a modal
- Run: npm run check-types

### US-004: Integrate OnboardingOrchestrator into app layout

As the system, I wrap the org layout with OnboardingOrchestrator so it can intercept and present onboarding steps.

**Acceptance Criteria:**
- Edit: apps/web/src/app/orgs/[orgId]/layout.tsx
- Import OnboardingOrchestrator from '@/components/onboarding/onboarding-orchestrator'
- Wrap the layout children with OnboardingOrchestrator:
- 
- return (
-   <OrgThemeProvider>
-     <OnboardingOrchestrator>
-       {children}
-     </OnboardingOrchestrator>
-   </OrgThemeProvider>
- );
- 
- Ensure OnboardingOrchestrator is INSIDE any auth/theme providers
- Run: npm run check-types
- Visual test: Load any org page, verify no errors in console

### US-005: Migrate BulkClaimProvider logic into orchestrator

As a parent with pending guardian claims, I see the claim prompt through the orchestrator instead of the old BulkClaimProvider.

**Acceptance Criteria:**
- Read: apps/web/src/components/bulk-claim-provider.tsx to understand current logic
- The key logic to migrate:
-   - Query for claimable guardian identities (email match, no userId)
-   - Query for pending child acknowledgements
-   - Show BulkGuardianClaimDialog when claims exist
- 
- Update getOnboardingTasks query to include guardian_claim task type:
-   - Check guardianIdentities where email = user.email AND userId = undefined
-   - If found, add task: { type: 'guardian_claim', priority: 1, data: { identities: [...] } }
- 
- Update OnboardingOrchestrator to handle guardian_claim type:
-   - When currentTask.type === 'guardian_claim', render BulkGuardianClaimDialog
-   - Pass onComplete callback to dialog's onClaimComplete prop
- 
- Import BulkGuardianClaimDialog in orchestrator
- Run: npm run check-types
- Test: User with pending guardian claim → Sees dialog through orchestrator

### US-006: Remove BulkClaimProvider from codebase

As a developer, I no longer have the old BulkClaimProvider creating duplicate dialogs.

**Acceptance Criteria:**
- Search codebase for BulkClaimProvider usage:
-   grep -r 'BulkClaimProvider' apps/web/src/
- 
- Remove BulkClaimProvider from wherever it's used (likely in a layout or provider)
- Delete file: apps/web/src/components/bulk-claim-provider.tsx
- Keep: apps/web/src/components/bulk-guardian-claim-dialog.tsx (still used by orchestrator)
- 
- Update any imports that referenced BulkClaimProvider
- Run: npm run check-types
- Run: npm run build (ensure no broken imports)
- Test: Invite parent → Sign up → Accept → Verify SINGLE dialog appears (not two)

### US-007: End-to-end testing of Phase 1 fixes

As QA, I verify that bugs #297 and #327 are fixed and all existing functionality works.

**Acceptance Criteria:**
- Test Bug #297 - Parent child links:
-   1. Admin invites parent@test.com with children John and Jane
-   2. Parent signs up and accepts invitation
-   3. Parent dashboard shows John and Jane linked
-   4. Query guardianPlayerLinks in Convex dashboard to verify records exist
- 
- Test Bug #327 - Double dialog:
-   1. Admin invites new parent with children
-   2. Parent clicks invite link, signs up
-   3. Parent accepts invitation
-   4. Verify ONLY ONE dialog appears (not two overlapping)
-   5. After accepting, lands on dashboard
- 
- Regression tests:
-   - Existing user invited to new org → Can accept
-   - Coach invitation → Works correctly
-   - Admin invitation → Works correctly
-   - Join request flow → Still works
- 
- All tests pass
- Document any issues found


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- The `getPlayersForGuardian` query filters out links without `acknowledgedByParentAt` - children won't show in parent dashboard without this field
- Guardian identity must have `userId` set for `getGuardianForCurrentUser` to find it
- The `useGuardianIdentity` hook has email fallback, but `getPlayersForGuardian` still filters by acknowledgment
- Previous "Option B" behavior (require explicit claim) was intentional but caused Bug #297
- The PRD acceptance criteria said to set `acknowledgedByParentAt: undefined` but that's what caused the bug! The fix required setting it to `Date.now()`
- The `suggestedPlayerLinks` in invitation metadata uses `.id` not `.playerIdentityId` - code already handles this correctly

**Gotchas encountered:**
- The PRD acceptance criteria said to set `acknowledgedByParentAt: undefined` but that's what caused the bug! The fix required setting it to `Date.now()`
- The `suggestedPlayerLinks` in invitation metadata uses `.id` not `.playerIdentityId` - code already handles this correctly
- `syncFunctionalRolesFromInvitation` is called after invitation acceptance
- Parent dashboard uses `useGuardianChildrenInOrg` hook which chains to `getPlayersForGuardian`
- Initially thought the bug might be in how `suggestedPlayerLinks` was being read, but that code was correct
- Had to trace through multiple files to understand the full data flow

### Files Changed

- packages/backend/convex/models/members.ts (+23, -10)
- ✅ Convex codegen: passed
- ⚠️ Type check: pre-existing remotion module errors (not related to changes)
- ⚠️ Linting: pre-existing errors (not related to changes)
- ⏭️ Browser verification: not applicable for backend-only change
- The `getPlayersForGuardian` query filters out links without `acknowledgedByParentAt` - children won't show in parent dashboard without this field
- Guardian identity must have `userId` set for `getGuardianForCurrentUser` to find it
- The `useGuardianIdentity` hook has email fallback, but `getPlayersForGuardian` still filters by acknowledgment
--
- packages/backend/convex/models/onboarding.ts (+358, new file)
- ✅ Convex codegen: passed
- ✅ Biome lint: passed
---
- Created `apps/web/src/components/onboarding/onboarding-orchestrator.tsx`
- Orchestrator wraps children and shows modals on top


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
