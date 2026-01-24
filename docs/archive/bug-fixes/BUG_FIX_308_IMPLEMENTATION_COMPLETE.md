# Guardian Management Implementation - Issue #308

## Summary

Implemented guardian management functionality on the admin edit player page, allowing administrators to add and remove guardians for youth players.

## Implementation Details

### New Components Created

#### 1. GuardiansSection (`apps/web/src/app/orgs/[orgId]/admin/players/[playerId]/edit/components/guardians-section.tsx`)

A comprehensive guardian display and management component that:
- Fetches guardians using `getGuardiansForPlayer` query
- Displays guardian cards in a responsive grid layout
- Shows guardian details: name, email, phone, relationship
- Displays status badges: Primary (green), Pending (orange), Declined (red)
- Provides "Add Guardian" button for admins
- Provides "Remove Guardian" button with confirmation dialog
- Handles loading and empty states

#### 2. AddGuardianModal (`apps/web/src/app/orgs/[orgId]/admin/players/[playerId]/edit/components/add-guardian-modal.tsx`)

A modal dialog for adding new guardians that:
- Accepts email address and relationship type (mother, father, guardian, grandparent, other)
- Shows real-time status of the email:
  - Green: User is already org member (will be linked directly)
  - Blue: User exists but not in org (invitation will be sent)
  - Orange: New user (invitation will be sent to create account)
- Handles three invitation flows:
  1. **Existing org member**: Calls `linkPlayersToGuardian` directly
  2. **Existing user not in org**: Sends invitation via Better Auth
  3. **New user**: Sends invitation to create account

### Backend Updates

#### 1. New Query: `checkUserAndMembership` (`packages/backend/convex/models/members.ts`)

```typescript
export const checkUserAndMembership = query({
  args: {
    email: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
    exists: v.boolean(),
    isMember: v.boolean(),
    userId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => { ... }
});
```

Checks if a user exists in the system and whether they're a member of a specific organization.

#### 2. Updated: `syncFunctionalRolesFromInvitation` (`packages/backend/convex/models/members.ts`)

Modified to handle the new object format for `suggestedPlayerLinks`:

**Before**: Expected `string[]` (array of player IDs)
**After**: Handles both `string[]` (legacy) and `object[]` with `{id, name, relationship}`

Changes:
- Parse `suggestedPlayerLinks` to normalize both formats
- Extract `id` and `relationship` from player link metadata
- Use relationship from metadata instead of hardcoding "guardian"
- Determine `isPrimary` based on existing guardians for the player
- Validate relationship against allowed enum values

### Files Modified

| File | Changes |
|------|---------|
| `apps/web/src/app/orgs/[orgId]/admin/players/[playerId]/edit/page.tsx` | Added GuardiansSection component, fixed infinite re-render loop by moving `formatDateForInput` outside component |
| `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx` | Removed GuardiansSection (not appropriate for coach/parent view) |
| `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/basic-info-section.tsx` | Restored read-only parents display |
| `packages/backend/convex/models/members.ts` | Added `checkUserAndMembership` query, updated `syncFunctionalRolesFromInvitation` |

### Bug Fixes

#### 1. Infinite Re-render Loop
**Problem**: The admin edit player page was causing "Maximum update depth exceeded" errors.

**Cause**: `formatDateForInput` was defined inside the component and included in useEffect dependency array, causing the effect to re-run on every render.

**Fix**: Moved `formatDateForInput` function outside the component to ensure stable reference.

#### 2. Guardian Links Not Created on Invitation Accept
**Problem**: When a new user accepted an invitation, they were added to the org but not linked to the child.

**Cause**: `syncFunctionalRolesFromInvitation` expected `suggestedPlayerLinks` as `string[]`, but `AddGuardianModal` was sending `object[]`.

**Fix**: Updated backend to parse both formats and extract player ID and relationship from objects.

## Location of Feature

**Path**: Admin → Players → [Select Player] → Edit

The "Parents & Guardians" section appears after the two-column grid of Basic Information and Enrollment Details, before the Team Assignments section.

## Access Control

- **Who can see**: Admins only (on admin edit player page)
- **Who can manage**: Admins only
- **Which players**: Youth players only (adults don't show guardian section)

## Guardian Flow Logic

### Adding a Guardian

1. Admin enters email and selects relationship
2. System checks if user exists:
   - **Exists + In Org**: Link created immediately, parent sees "claim child" modal on next login
   - **Exists + Not In Org**: Invitation sent, link created when invitation accepted
   - **New User**: Invitation sent, link created when user creates account and accepts

### Primary Guardian Logic

- First guardian added is automatically marked as primary
- Subsequent guardians are secondary
- When primary is deleted, oldest remaining guardian is auto-promoted to primary (handled by existing `deleteGuardianPlayerLink` mutation)

### Guardian Status

- **Primary**: Green badge - main contact for the player
- **Pending**: Orange badge - link created but parent hasn't acknowledged yet
- **Declined**: Red badge - parent declined the link (card shown with reduced opacity)

## Pull Request

PR #326: https://github.com/NB-PDP-Testing/PDP/pull/326

## Commits

1. `feat: Add guardian management section to player page (#308)` - Initial implementation
2. `fix: Move guardian management to admin edit player page (#308)` - Relocated to correct page
3. `fix: Prevent infinite re-render loop in admin edit player page` - Fixed useEffect issue
4. `fix: Handle object format for suggestedPlayerLinks in invitation sync` - Fixed invitation flow
