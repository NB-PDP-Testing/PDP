# Onboarding Phase 1B - Invitation Lifecycle (User-Facing)

> Auto-generated documentation - Last updated: 2026-01-28 14:27

## Status

- **Branch**: `ralph/onboarding-phase-1b`
- **Progress**: 8 / 8 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-001: Add invitation settings fields to organization schema

As an admin, I can configure invitation expiration and auto re-invite settings for my organization.

**Acceptance Criteria:**
- Edit: packages/backend/convex/schema.ts
- Find the organization table definition
- Add these optional fields:
-   invitationExpirationDays: v.optional(v.number()),      // Default: 7
-   autoReInviteOnExpiration: v.optional(v.boolean()),     // Default: false
-   maxAutoReInvitesPerInvitation: v.optional(v.number()), // Default: 2
-   adminContactEmail: v.optional(v.string()),
-   notifyAdminsOnInvitationRequest: v.optional(v.boolean()), // Default: true
- 
- Run: npx -w packages/backend convex codegen
- Run: npm run check-types
- Verify in Convex dashboard that organization table has new fields

### US-002: Create invitationRequests table for user self-service

As a user with an expired invitation, I can request a new one and it's tracked in the database.

**Acceptance Criteria:**
- Edit: packages/backend/convex/schema.ts
- Add new table invitationRequests:
- 
- invitationRequests: defineTable({
-   originalInvitationId: v.string(),
-   organizationId: v.string(),
-   userEmail: v.string(),
-   requestedAt: v.number(),
-   requestNumber: v.number(),  // 1, 2, or 3 (max 3 per invitation)
-   status: v.union(
-     v.literal('pending'),
-     v.literal('approved'),
-     v.literal('denied')
-   ),
-   processedAt: v.optional(v.number()),
-   processedBy: v.optional(v.string()),
-   denyReason: v.optional(v.string()),
-   newInvitationId: v.optional(v.string()),
- })
-   .index('by_organization_status', ['organizationId', 'status'])
-   .index('by_email', ['userEmail'])
-   .index('by_original_invitation', ['originalInvitationId']),
- 
- Run: npx -w packages/backend convex codegen
- Run: npm run check-types

### US-003: Create createInvitationRequest mutation with rate limiting

As a user clicking an expired invitation link, I can request a new invitation (max 3 times).

**Acceptance Criteria:**
- Create or edit: packages/backend/convex/models/invitations.ts
- Add mutation: createInvitationRequest
- Args: { originalInvitationId: v.string(), userEmail: v.string() }
- Returns: v.object({ success: v.boolean(), requestNumber: v.number(), message: v.string() })
- 
- Mutation logic:
- 1. Verify invitation exists and is expired
- 2. Count existing requests for this invitation:
-    const existingRequests = await ctx.db
-      .query('invitationRequests')
-      .withIndex('by_original_invitation', q => q.eq('originalInvitationId', args.originalInvitationId))
-      .collect();
- 3. If existingRequests.length >= 3, return { success: false, requestNumber: 3, message: 'Maximum requests reached. Please contact the organization directly.' }
- 4. Check rate limit - no request in last 60 seconds:
-    const recentRequest = existingRequests.find(r => r.requestedAt > Date.now() - 60000);
-    if (recentRequest) return { success: false, message: 'Please wait before requesting again.' }
- 5. Create request record with requestNumber = existingRequests.length + 1
- 6. Return { success: true, requestNumber, message: 'Request submitted.' }
- 
- Run: npm run check-types

### US-004: Create checkInvitationStatus query for expired link page

As a user clicking an invitation link, the page can check if it's expired and show appropriate UI.

**Acceptance Criteria:**
- Edit: packages/backend/convex/models/invitations.ts
- Add query: checkInvitationStatus
- Args: { invitationId: v.string() }
- Returns: v.object({
-   status: v.union(v.literal('valid'), v.literal('expired'), v.literal('accepted'), v.literal('not_found')),
-   invitation: v.optional(v.object({ ... })),
-   organization: v.optional(v.object({ name: v.string(), adminContactEmail: v.optional(v.string()) })),
-   canRequestNew: v.boolean(),
-   requestCount: v.number(),
- })
- 
- Query logic:
- 1. Get invitation by ID
- 2. If not found, return { status: 'not_found' }
- 3. Get organization for org name and settings
- 4. Check expiration: invitation.expiresAt < Date.now()
- 5. Count existing requests for this invitation
- 6. Return full status object
- 
- Run: npm run check-types

### US-005: Create ExpiredInvitationView component

As a user clicking an expired link, I see a clear message with the org name, my role, and options to request a new invitation.

**Acceptance Criteria:**
- Create: apps/web/src/components/expired-invitation-view.tsx
- 
- Props: {
-   organizationName: string;
-   role: string;
-   originalInviteDate: Date;
-   expiredDate: Date;
-   adminContactEmail?: string;
-   canRequestNew: boolean;
-   requestCount: number;
-   onRequestNew: () => void;
- }
- 
- UI structure using shadcn/ui Card:
- - Icon: AlertTriangle (from lucide-react)
- - Title: 'Invitation Expired'
- - Text: 'Your invitation to join {organizationName} has expired.'
- - Details: 'You were invited as: {role}'
- - Details: 'Original invitation: {date}'
- - Details: 'Expired: {date}'
- 
- If canRequestNew && requestCount < 3:
-   - Button: 'Request New Invitation' (calls onRequestNew)
-   - Text: 'Request {requestCount}/3'
- 
- If requestCount >= 3:
-   - Text: 'Maximum requests reached.'
- 
- Footer: 'Or contact the organization directly:'
-   - Email link to adminContactEmail (if provided)
- 
- Run: npm run check-types

### US-006: Update accept-invitation page to handle expired status

As a user clicking an expired invitation link, I see the ExpiredInvitationView instead of an error.

**Acceptance Criteria:**
- Edit: apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- Import checkInvitationStatus query
- Import ExpiredInvitationView component
- Import createInvitationRequest mutation
- 
- Add useQuery for checkInvitationStatus
- Add useMutation for createInvitationRequest
- 
- Update render logic:
- if (status.status === 'expired') {
-   return (
-     <ExpiredInvitationView
-       organizationName={status.organization?.name ?? 'Unknown'}
-       role={status.invitation?.role ?? 'Member'}
-       originalInviteDate={new Date(status.invitation?.createdAt)}
-       expiredDate={new Date(status.invitation?.expiresAt)}
-       adminContactEmail={status.organization?.adminContactEmail}
-       canRequestNew={status.canRequestNew}
-       requestCount={status.requestCount}
-       onRequestNew={handleRequestNew}
-     />
-   );
- }
- 
- Implement handleRequestNew:
-   - Call createInvitationRequest mutation
-   - Show toast on success/failure
-   - Refetch status to update UI
- 
- Run: npm run check-types
- Test: Create invitation, manually expire it, click link, verify UI

### US-007: Create RequestConfirmation component for post-request state

As a user who requested a new invitation, I see a confirmation message.

**Acceptance Criteria:**
- Create: apps/web/src/components/request-invitation-confirmation.tsx
- 
- Props: { organizationName: string }
- 
- UI using shadcn/ui Card:
- - Icon: CheckCircle (lucide-react)
- - Title: 'Request Submitted'
- - Text: 'Your request for a new invitation has been sent to the organization administrators.'
- - Text: 'You'll receive an email when your request is processed.'
- - Button: 'Done' (navigates to /login or home)
- 
- Run: npm run check-types

### US-008: Implement auto re-invite logic for enabled organizations

As a user clicking an expired link for an org with auto re-invite enabled, I automatically get a new invitation.

**Acceptance Criteria:**
- Edit: packages/backend/convex/models/invitations.ts
- Add mutation: processAutoReInvite
- Args: { invitationId: v.string() }
- Returns: v.object({ success: v.boolean(), newInvitationId: v.optional(v.string()), message: v.string() })
- 
- Mutation logic:
- 1. Get invitation and organization
- 2. Check org.autoReInviteOnExpiration === true
- 3. Check invitation.autoReInviteCount < (org.maxAutoReInvitesPerInvitation ?? 2)
- 4. If both true:
-    - Create new invitation with same details
-    - Increment autoReInviteCount on original invitation
-    - Send invitation email
-    - Return { success: true, newInvitationId, message: 'New invitation sent' }
- 5. If not eligible:
-    - Return { success: false, message: 'Auto re-invite not available' }
- 
- Update checkInvitationStatus query:
- - Add field: autoReInviteAvailable: boolean
- - True if org setting enabled AND count not exceeded
- 
- Update accept-invitation page:
- - If autoReInviteAvailable, call processAutoReInvite automatically
- - Show 'New invitation sent!' message
- 
- Run: npm run check-types


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Better Auth tables must be accessed via `components.betterAuth.adapter.findOne` pattern, not ctx.db.get()
- Better Auth adapter.create uses `{ input: { model, data } }` structure
- Custom fields on Better Auth tables go in betterAuth/schema.ts, not main schema.ts
- ctx.db.get() doesn't work for Better Auth tables (invitation, organization, user, member)
- Must include all return fields in query returns validator - TypeScript catches missing fields
- Pre-existing Remotion module errors in codebase (unrelated to this work)
- Pre-existing Biome lint errors (328 errors) - not from this work

**Gotchas encountered:**
- ctx.db.get() doesn't work for Better Auth tables (invitation, organization, user, member)
- Must include all return fields in query returns validator - TypeScript catches missing fields
- Pre-existing Remotion module errors in codebase (unrelated to this work)
- Pre-existing Biome lint errors (328 errors) - not from this work
- betterAuth/schema.ts changes require codegen
- accept-invitation page already had complex state machine - new states added carefully
---

### Files Changed

- packages/backend/convex/betterAuth/schema.ts (+12)
- packages/backend/convex/schema.ts (+22)
- packages/backend/convex/models/invitations.ts (new, ~410 lines)
- apps/web/src/components/expired-invitation-view.tsx (new, ~140 lines)
- apps/web/src/components/request-invitation-confirmation.tsx (new, ~60 lines)
- apps/web/src/components/auto-reinvited-view.tsx (new, ~60 lines)
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx (+160)
- ✅ Type check: passed (excluding pre-existing Remotion errors)
- ✅ Linting: passed for changed files (pre-existing errors in codebase)
- ✅ Codegen: passed
- Better Auth tables must be accessed via `components.betterAuth.adapter.findOne` pattern, not ctx.db.get()
- Better Auth adapter.create uses `{ input: { model, data } }` structure
- Custom fields on Better Auth tables go in betterAuth/schema.ts, not main schema.ts


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
