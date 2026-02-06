# PlayerARC - Phase 0.8: Onboarding Flow Differentiation (Invited vs Self-Registered)

> Auto-generated documentation - Last updated: 2026-02-05 18:46

## Status

- **Branch**: `ralph/phase-0.8-onboarding-flow-differentiation`
- **Progress**: 8 / 8 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P0.8-001: Add wasInvited flag to user schema

As a developer, I need to track whether a user was invited or self-registered to determine their onboarding flow.

**Acceptance Criteria:**
- Add wasInvited: v.optional(v.boolean()) to user table in packages/backend/convex/betterAuth/schema.ts
- Add comment: '// Invitation tracking - true if user accepted an invitation'
- Place field near other tracking fields (around line 43, near onboardingComplete)
- Run npx -w packages/backend convex codegen successfully
- Typecheck passes: npm run check-types

### US-P0.8-002: Set wasInvited flag when user accepts invitation

As the system, I need to mark users as invited when they accept an invitation.

**Acceptance Criteria:**
- Find where invitation acceptance updates user record in packages/backend/convex/models/members.ts
- Locate syncFunctionalRolesFromInvitation or acceptInvitation logic
- After successful invitation acceptance, patch user record with wasInvited: true
- Use ctx.runMutation(components.betterAuth.adapter.updateOne, ...) pattern
- Ensure this runs AFTER user joins organization successfully
- Typecheck passes: npm run check-types
- Test: Accept invitation -> Query user record -> Verify wasInvited = true

### US-P0.8-003: Skip guardian_claim for self-registered users in getOnboardingTasks

As a self-registered user, I should NOT see guardian matching during onboarding - that happens at admin approval.

**Acceptance Criteria:**
- Edit packages/backend/convex/models/onboarding.ts
- In getOnboardingTasks query, fetch user.wasInvited flag
- Add check: const wasInvited = user?.wasInvited === true;
- Wrap guardian matching logic (Priority 2 section) with: if (wasInvited) { ... }
- Guardian matching query and guardian_claim task creation only runs for invited users
- Self-registered users skip directly to onboarding completion after profile_completion
- Typecheck passes: npm run check-types
- Test: Self-registered user completes profile -> No guardian_claim task shown

### US-P0.8-004: Remove no_children_found task entirely

As a self-registered user, I should not see 'No Children Found' message - this step is obsolete.

**Acceptance Criteria:**
- Edit packages/backend/convex/models/onboarding.ts
- Remove the no_children_found task creation code (Priority 2.5 section)
- Remove any conditional logic that shows this task
- Self-registered users: after profile_completion -> onboarding complete
- Update onboarding-orchestrator.tsx to remove no_children_found case from step renderer
- Keep NoChildrenFoundStep component file for now (can delete in cleanup phase)
- Typecheck passes: npm run check-types

### US-P0.8-005: Update profile completion step messaging

As a self-registered user, I see neutral 'Additional Information' text, not child-finding messaging.

**Acceptance Criteria:**
- Edit apps/web/src/components/onboarding/profile-completion-step.tsx
- Change title from any child-related text to 'Additional Information'
- Change subtitle/description to 'Please provide additional information to complete your profile'
- Remove any text mentioning 'children', 'matching', 'finding your children', etc.
- Keep all input fields: phone, postcode, address, alt email
- Keep skip functionality (max 3 skips)
- Update any analytics events to reflect neutral naming
- Typecheck passes: npm run check-types
- Visual test: Profile completion shows neutral messaging

### US-P0.8-006: Fix approveJoinRequest to create guardianPlayerLinks

As an admin approving a join request with child matches, proper guardian links should be created.

**Acceptance Criteria:**
- Edit packages/backend/convex/models/orgJoinRequests.ts
- Find approveJoinRequest mutation (around line 411)
- Remove old code that patches 'players' table with parentEmail (BROKEN)
- When linkedPlayerIds provided, get or create guardianIdentity for the user
- Create guardianIdentity with: userId, email, firstName, lastName, phone, address from join request
- For each linkedPlayerIds entry, create guardianPlayerLink record
- Set relationship: 'parent' as default
- Set acknowledgedByParentAt: Date.now() (admin approved = parent confirmed)
- Set organizationId from join request
- Typecheck passes: npm run check-types

### US-P0.8-007: Clean up debug logging from onboarding code

As a developer, I need production-ready code without excessive console logging.

**Acceptance Criteria:**
- Remove console.log statements added during debugging from:
-   - packages/backend/convex/models/onboarding.ts
-   - apps/web/src/components/onboarding/onboarding-orchestrator.tsx
- Keep any structured logging that uses proper logger (if exists)
- Remove any temporary comments like '// DEBUG' or '// TODO: remove'
- Run npx ultracite fix
- Typecheck passes: npm run check-types

### US-P0.8-008: End-to-end testing and verification

As QA, I need to verify all three user flows work correctly after changes.

**Acceptance Criteria:**
- Test Flow 1 - Invited Coach:
-   1. Admin invites coach@test.com
-   2. Coach signs up -> GDPR -> Invitation acceptance -> Dashboard
-   3. Verify wasInvited = true on user record
- Test Flow 2 - Invited Parent with Child:
-   1. Admin invites parent@test.com with child assigned
-   2. Parent signs up -> GDPR -> Invitation with child confirmation -> Accept
-   3. Verify guardianPlayerLink created with acknowledgedByParentAt set
-   4. Verify child appears on parent dashboard
- Test Flow 3 - Self-Registered User:
-   1. New user signs up (no invitation)
-   2. User sees GDPR consent -> Profile completion ('Additional Information')
-   3. Verify NO guardian_claim step shown
-   4. Verify NO no_children_found step shown
-   5. User redirected to /orgs/join after profile completion
-   6. User requests to join org as parent
-   7. Admin sees suggested child matches in approval UI
-   8. Admin approves with child selected
-   9. Verify guardianIdentity created for user
-   10. Verify guardianPlayerLink created correctly
-   11. User can access org and sees child on dashboard
- All tests pass
- Document any issues found


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- There are TWO invitation acceptance mutations in members.ts - both must be updated for any post-acceptance user patches
- Wrapping large code blocks in `if` guards: add the guard, close it, let ultracite fix indentation
- `approveJoinRequest` in orgJoinRequests.ts had broken code patching a non-existent `players` table - it now uses the proper guardianIdentity/guardianPlayerLink pattern
- The onboarding task type validator must stay in sync with the inline tasks array type declaration
- Pre-existing type errors: migrations/importGAAFootballBenchmarks.ts, migrations/importRugbyBenchmarks.ts, actions/coachParentSummaries.ts - these are NOT our fault
- `git stash pop` can conflict with linter changes to files - need to `git checkout` conflicting file first
- HMR errors in dev-browser on first load are transient - retry navigation resolves them

**Gotchas encountered:**
- Pre-existing type errors: migrations/importGAAFootballBenchmarks.ts, migrations/importRugbyBenchmarks.ts, actions/coachParentSummaries.ts - these are NOT our fault
- `git stash pop` can conflict with linter changes to files - need to `git checkout` conflicting file first
- HMR errors in dev-browser on first load are transient - retry navigation resolves them
- Removing a task type (no_children_found) requires updates in: backend validator, inline type, orchestrator handler, orchestrator switch cases, import statement
- wasInvited flag check in onboarding.ts depends on the flag being set in members.ts during invitation acceptance
- None significant - the stories were well-defined and the implementation was straightforward

### Files Changed

- packages/backend/convex/betterAuth/schema.ts (+3 - wasInvited field)
- packages/backend/convex/models/members.ts (+24 - wasInvited patches in both invitation mutations)
- packages/backend/convex/models/onboarding.ts (+8, -130 - wasInvited guard, no_children_found removal, debug log cleanup)
- packages/backend/convex/models/orgJoinRequests.ts (+99, -16 - guardianIdentity/guardianPlayerLink creation)
- apps/web/src/components/onboarding/onboarding-orchestrator.tsx (-30 - no_children_found removal, debug log cleanup)
- apps/web/src/components/onboarding/profile-completion-step.tsx (+5, -6 - neutral messaging)
- ✅ Convex codegen: passed
- ✅ Linting: passed (pre-commit hooks verified all 7 commits)
- ⚠️ Type check: pre-existing errors in migration files + coachParentSummaries.ts, our changes have zero type errors
- ✅ Browser verification: profile completion shows "Additional Information" title, neutral messaging, no debug logs in console
- There are TWO invitation acceptance mutations in members.ts - both must be updated for any post-acceptance user patches
- Wrapping large code blocks in `if` guards: add the guard, close it, let ultracite fix indentation
- `approveJoinRequest` in orgJoinRequests.ts had broken code patching a non-existent `players` table - it now uses the proper guardianIdentity/guardianPlayerLink pattern
- The onboarding task type validator must stay in sync with the inline tasks array type declaration


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
