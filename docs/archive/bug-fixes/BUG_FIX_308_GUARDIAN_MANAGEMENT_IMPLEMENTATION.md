# Implementation Plan: Guardian Management on Player Page

## Issue Reference
GitHub Issue #308 - Multiple Primary Guardians

## Summary
Adding guardian management functionality to the player passport page. This allows admins and coaches to view, add, and remove guardians for a player directly from the player page.

## Requirements
1. View guardians on player page (already exists but read-only)
2. Add multiple guardians to a player via invitation flow
3. First guardian added is always primary (backend already handles this)
4. Subsequent guardians are secondary (backend already handles this)
5. Auto-promote secondary when primary is deleted (backend already handles this)

## Scope
- **In Scope:** Admin/coach view on player passport page with add/delete functionality
- **Out of Scope (for now):** Parent dashboard guardian display - will be a separate feature

## Implementation Details

### Backend Status (Ready)
All necessary mutations exist in `packages/backend/convex/models/guardianPlayerLinks.ts`:
- `createGuardianPlayerLink` - Handles isPrimary logic correctly (first = primary, subsequent = secondary)
- `deleteGuardianPlayerLink` - Has auto-promote logic when deleting primary guardian
- `getGuardiansForPlayer` - Query for fetching guardians
- `setPrimaryGuardian` - Exists but no UI (future enhancement)
- `linkPlayersToGuardian` - Creates guardian identity and links if needed

### Frontend Changes

#### 1. New GuardiansSection Component
**File:** `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/guardians-section.tsx`

- Fetches guardians using `getGuardiansForPlayer` query
- Displays guardian cards with name, email, phone, relationship, primary badge
- Shows "Add Guardian" button (for admin/coach only)
- Shows "Remove" button on each guardian card (for admin/coach only)
- Handles delete with confirmation dialog

#### 2. New AddGuardianModal Component
**File:** `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/add-guardian-modal.tsx`

**Modal UI:**
- Email input (required)
- Relationship dropdown (mother, father, guardian, grandparent, other)

**Submit Logic:**
1. Check if user with email already exists in system
2. **If user does NOT exist:** Send invitation via `authClient.organization.inviteMember`
3. **If user EXISTS but not in org:** Send invitation
4. **If user EXISTS and is already in org:** Call `linkPlayersToGuardian` directly

#### 3. Update Player Passport Page
**File:** `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx`

- Import and add `GuardiansSection` component
- Place it after `BasicInformationSection`
- Pass `playerIdentityId`, `organizationId`, and permission flags

#### 4. Update Basic Info Section
**File:** `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/basic-info-section.tsx`

- Remove the "Parents & Guardians" section (lines 232-294)
- The new `GuardiansSection` will replace it with full management functionality

## Parent Acceptance Flow (Already Implemented)
- Parent logs in → sees batched claim modal for pending children
- Parent accepts → `acknowledgedByParentAt` is set
- Parent declines → `declinedByUserId` is set

## Testing Checklist

### Admin/Coach View
- [ ] Navigate to a player page as admin/coach
- [ ] Verify guardians section displays existing guardians
- [ ] Click "Add Guardian" with a new email (not in system) → Invitation is sent
- [ ] Click "Add Guardian" with existing user not in org → Invitation is sent
- [ ] Click "Add Guardian" with existing org member → Guardian link created immediately
- [ ] First guardian added → Should be marked Primary
- [ ] Second guardian added → Should be marked Secondary (no Primary badge)
- [ ] Delete the Primary guardian → Second guardian auto-promoted to Primary
