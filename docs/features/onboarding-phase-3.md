# Onboarding Phase 3 - Child Linking & Admin Invitation Tools

> Auto-generated documentation - Last updated: 2026-01-28 16:15

## Status

- **Branch**: `ralph/onboarding-phase-3`
- **Progress**: 10 / 10 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-001: Add status and declinedAt fields to guardianPlayerLinks table

As the system, I track whether a parent has accepted, declined, or not yet responded to a child link.

**Acceptance Criteria:**
- Edit: packages/backend/convex/schema.ts
- Find the guardianPlayerLinks table definition
- Add these fields:
-   status: v.optional(v.union(
-     v.literal('pending'),    // Awaiting parent acknowledgement
-     v.literal('active'),     // Parent accepted
-     v.literal('declined')    // Parent declined
-   )),
-   declinedAt: v.optional(v.number()),
- 
- Run: npx -w packages/backend convex codegen
- Run: npm run check-types
- Verify in Convex dashboard that guardianPlayerLinks table has new fields

### US-002: Create child link queries and mutations

As the system, I can query pending child links and allow parents to accept/decline them.

**Acceptance Criteria:**
- Edit or create: packages/backend/convex/models/guardianPlayerLinks.ts
- 
- Query: getPendingChildLinks
- Args: none (uses authenticated user)
- Returns: v.array(v.object({ linkId, playerIdentityId, playerName, relationship, organizationName }))
- Logic: Get guardianIdentities for user → Get links where status = 'pending' → Join with player info
- 
- Query: getDeclinedChildLinks
- Args: { organizationId: v.string() }
- Returns: v.array(v.object({ linkId, playerName, guardianName, guardianEmail, declinedAt }))
- Logic: Admin view - get all declined links for org
- 
- Mutation: acceptChildLink
- Args: { linkId: v.id('guardianPlayerLinks'), consentToSharing: v.optional(v.boolean()) }
- Returns: v.null()
- Logic:
-   - Verify link belongs to current user's guardianIdentity
-   - Update: status = 'active', acknowledgedByParentAt = Date.now()
-   - Store consentToSharing if provided
- 
- Mutation: declineChildLink
- Args: { linkId: v.id('guardianPlayerLinks') }
- Returns: v.null()
- Logic:
-   - Verify link belongs to current user's guardianIdentity
-   - Update: status = 'declined', declinedAt = Date.now()
-   - Create notification for org admins
- 
- Mutation: acceptAllChildLinks
- Args: { guardianIdentityId: v.id('guardianIdentities'), consentToSharing: v.optional(v.boolean()) }
- Returns: v.null()
- Logic: Update all pending links for this guardianIdentity to active
- 
- Mutation: resendChildLink (admin)
- Args: { linkId: v.id('guardianPlayerLinks') }
- Returns: v.null()
- Logic: Reset status to 'pending', clear declinedAt
- 
- Run: npm run check-types

### US-003: Create ChildLinkingStep modal component

As a parent with pending child links, I see a modal showing all children awaiting my acknowledgement.

**Acceptance Criteria:**
- Create: apps/web/src/components/onboarding/child-linking-step.tsx
- 
- Props: { pendingLinks: ChildLink[]; onComplete: () => void }
- 
- Use shadcn/ui AlertDialog (cannot be dismissed without action)
- 
- UI structure:
- - Title: 'Confirm Your Children'
- - If user previously accepted GDPR without children, show privacy extension text:
-   'Your privacy consent now extends to the children below'
- - List of pending children as Cards:
-   - Child name
-   - Relationship (e.g., 'Parent of')
-   - Organization name
-   - Accept/Decline buttons per child
- - Checkbox: 'Allow sharing of my child's progress with coaches at other clubs'
- - Footer buttons:
-   - 'Accept All' (primary) - accepts all pending links
-   - Individual accept/decline work inline
- - When all links are actioned, call onComplete
- 
- Use useMutation for acceptChildLink, declineChildLink, acceptAllChildLinks
- Show toast on each action: 'Child linked successfully' or 'Link declined'
- 
- Run: npm run check-types

### US-004: Integrate ChildLinkingStep into OnboardingOrchestrator

As the system, I show the child linking modal when a parent has pending links.

**Acceptance Criteria:**
- Edit: packages/backend/convex/models/onboarding.ts
- Update getOnboardingTasks query:
-   - After GDPR check, add child_linking check:
-     const pendingLinks = await getPendingChildLinks(ctx);
-     if (pendingLinks.length > 0) {
-       tasks.push({ type: 'child_linking', priority: 2, data: { links: pendingLinks } });
-     }
- 
- Edit: apps/web/src/components/onboarding/onboarding-orchestrator.tsx
- Import ChildLinkingStep component
- 
- In OnboardingStepRenderer:
-   - When task.type === 'child_linking':
-     return <ChildLinkingStep pendingLinks={task.data.links} onComplete={handleStepComplete} />;
- 
- Run: npm run check-types
- Test: Admin adds guardian with 3 children → Parent logs in → Sees modal with all 3

### US-005: Create invitation management page for admins

As an admin, I have a dedicated page to manage all invitations with tabs for different statuses.

**Acceptance Criteria:**
- Create: apps/web/src/app/orgs/[orgId]/admin/invitations/page.tsx
- 
- Page requires admin/owner role (redirect if not authorized)
- 
- Create query: getInvitationsByStatus
- Args: { organizationId: v.string(), status: v.string() }
- Returns: v.array(Invitation)
- 
- Create query: getInvitationStats
- Args: { organizationId: v.string() }
- Returns: v.object({ active: v.number(), expiringSoon: v.number(), expired: v.number(), requests: v.number() })
- 
- UI structure:
- - Title: 'Invitation Management'
- - Tabs component (shadcn/ui Tabs):
-   - 'Active ({count})'
-   - 'Expiring Soon ({count})' - invitations expiring within 48 hours
-   - 'Expired ({count})'
-   - 'Requests ({count})'
- - Each tab shows filtered invitation list
- - Bulk selection checkboxes
- - Bulk action buttons: 'Resend Selected', 'Cancel Selected'
- 
- Run: npm run check-types

### US-006: Create InvitationCard component with actions

As an admin, I see each invitation as a card with relevant actions based on status.

**Acceptance Criteria:**
- Create: apps/web/src/components/admin/invitation-card.tsx
- 
- Props: {
-   invitation: Invitation;
-   isSelected: boolean;
-   onSelect: (id: string) => void;
-   onResend: (id: string) => void;
-   onCancel: (id: string) => void;
- }
- 
- UI structure (shadcn/ui Card):
- - Checkbox for selection
- - Invitee email
- - Role badge (Admin/Coach/Parent/Member)
- - Created date
- - Expires/Expired date with relative time ('Expires in 2 days' or 'Expired 3 days ago')
- - Action buttons based on status:
-   - Active: 'Resend', 'Cancel'
-   - Expiring Soon: 'Resend', 'Cancel'
-   - Expired: 'Resend', 'Archive'
- 
- Run: npm run check-types

### US-007: Implement bulk invitation mutations

As an admin, I can resend or cancel multiple invitations at once.

**Acceptance Criteria:**
- Edit: packages/backend/convex/models/invitations.ts
- 
- Mutation: resendInvitation
- Args: { invitationId: v.string() }
- Returns: v.object({ success: v.boolean(), newInvitationId: v.string() })
- Logic:
-   - Get original invitation
-   - Create new invitation with same details, new expiresAt
-   - Mark original as 'resent' status
-   - Send invitation email
- 
- Mutation: cancelInvitation
- Args: { invitationId: v.string() }
- Returns: v.null()
- Logic: Update invitation status to 'cancelled'
- 
- Mutation: bulkResendInvitations
- Args: { invitationIds: v.array(v.string()) }
- Returns: v.object({ success: v.number(), failed: v.number() })
- Logic: Loop through and call resendInvitation for each
- 
- Mutation: bulkCancelInvitations
- Args: { invitationIds: v.array(v.string()) }
- Returns: v.object({ success: v.number(), failed: v.number() })
- Logic: Loop through and call cancelInvitation for each
- 
- Run: npm run check-types

### US-008: Create invitation request queue UI

As an admin, I see pending invitation requests and can approve or deny them.

**Acceptance Criteria:**
- Create: apps/web/src/components/admin/invitation-request-card.tsx
- 
- Props: {
-   request: InvitationRequest;
-   onApprove: (id: string) => void;
-   onDeny: (id: string) => void;
- }
- 
- UI structure (shadcn/ui Card):
- - Requester email
- - Original invitation role
- - Request number (1/3, 2/3, 3/3)
- - Request date with relative time
- - Original organization they were invited to
- - Buttons: 'Approve' (green), 'Deny' (red/outline)
- 
- Edit: packages/backend/convex/models/invitations.ts
- Add mutations:
- 
- Mutation: approveInvitationRequest
- Args: { requestId: v.string() }
- Returns: v.object({ newInvitationId: v.string() })
- Logic:
-   - Update request status to 'approved'
-   - Create new invitation for the user
-   - Send email with new invitation link
- 
- Mutation: denyInvitationRequest
- Args: { requestId: v.string(), reason: v.optional(v.string()) }
- Returns: v.null()
- Logic:
-   - Update request status to 'denied'
-   - Store reason if provided
-   - Optionally send email notification to requester
- 
- Run: npm run check-types
- Test: User requests new invitation → Admin sees in Requests tab → Approve → User gets new email

### US-009: Add email checkbox to add-guardian dialog

As an admin adding a guardian to a player, I can choose whether to send an email notification.

**Acceptance Criteria:**
- Edit: apps/web/src/components/admin/add-guardian-dialog.tsx (or wherever guardian addition is)
- 
- Add checkbox to the form:
-   - Label: 'Send email notification to guardian'
-   - Default: checked (true)
-   - Description text: 'If unchecked, guardian will see prompt on next login'
- 
- Pass sendEmail boolean to the mutation that creates the guardian link
- 
- Edit: packages/backend/convex/models/guardianPlayerLinks.ts (or relevant file)
- Update the create mutation:
-   - Accept sendEmail: v.optional(v.boolean()) arg
-   - If sendEmail !== false, trigger notification email
-   - If sendEmail === false, just create the pending link
- 
- Run: npm run check-types
- Test: Add guardian with checkbox ON → Email sent
- Test: Add guardian with checkbox OFF → No email, guardian sees modal on next login

### US-010: Create admin notification for declined child links

As an admin, I receive a notification when a parent declines a child link.

**Acceptance Criteria:**
- Edit: packages/backend/convex/models/guardianPlayerLinks.ts
- In declineChildLink mutation, after updating status:
-   - Get organization admins
-   - For each admin, create notification:
-     {
-       userId: admin.userId,
-       organizationId: orgId,
-       type: 'child_declined',
-       title: 'Child Link Declined',
-       message: '{guardianName} declined link to {playerName}',
-       link: '/orgs/{orgId}/admin/invitations?tab=declined'
-     }
- 
- Create: apps/web/src/components/admin/declined-links-view.tsx
- Show list of declined links with 'Resend' button for each
- 
- Run: npm run check-types
- Test: Parent declines child → Admin sees notification toast → Click leads to declined links view


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- guardianIdentities.email is optional - must check with `!guardian.email ||` before comparing
- For complex joined query results in Convex, use `v.any()` for returns validator
- OnboardingOrchestrator dispatches to step components based on task.type
- TypeScript complex inline types for Id<> don't work well - use string and cast
- Pre-commit hooks require running ultracite fix before commit
- Remotion demo files cause type errors if not excluded
--
- Better Auth adapter.findMany requires paginationOpts: { cursor: null, numItems: N }
- Adapter returns { page: [] } not direct array
- Use += 1 instead of ++ for lint compliance

**Gotchas encountered:**
- TypeScript complex inline types for Id<> don't work well - use string and cast
- Pre-commit hooks require running ultracite fix before commit
- Remotion demo files cause type errors if not excluded
- Child linking depends on GDPR consent being accepted first (priority 3 vs 0)
- ChildLinkingStep needs guardianIdentityId for Accept All operation
- [x] US-001 to US-004 complete
--
- Ultracite fix may error but still modify files
- Block statements required for single-line if returns
- [x] US-006: Create InvitationCard component (extracted from page.tsx)

### Files Changed

- packages/backend/convex/schema.ts (+30 lines)
- packages/backend/convex/models/guardianPlayerLinks.ts (+400 lines)
- apps/web/src/components/onboarding/child-linking-step.tsx (new, ~250 lines)
- apps/web/src/components/onboarding/onboarding-orchestrator.tsx (+50 lines)
- apps/web/tsconfig.json (+2 excludes)
- apps/web/src/app/platform/page.tsx (minor fix)
- apps/web/src/components/onboarding/gdpr-consent-step.tsx (minor fix)
- ✅ Type check: passed
- ✅ Linting: passed (with ultracite fix)
- ⚠️ Browser verification: Not applicable (would need test data)
- guardianIdentities.email is optional - must check with `!guardian.email ||` before comparing
- For complex joined query results in Convex, use `v.any()` for returns validator
- OnboardingOrchestrator dispatches to step components based on task.type
--
- packages/backend/convex/models/invitations.ts (+160 lines)


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
