# Bug Fix: Guardian Email Update Conflict - Issue #307

## Problem Summary

When editing a guardian's email address to one that already exists in the system, the application crashed with the error:
```
Uncaught Error: Guardian with email jkobrien@gmail.com already exists
```

This prevented admins from correcting guardian email addresses when the "correct" email was already associated with another guardian identity.

## Root Cause

The `updateGuardianIdentity` mutation had a uniqueness check that threw an error if the new email matched any existing guardian identity. While this was designed to prevent duplicates, it didn't account for the legitimate use case of reassigning a player to an existing guardian.

## Solution

Instead of failing with an error, the system now offers to **reassign** the player to the existing guardian:

### New Behavior

1. **Real-time conflict detection**: As the admin types a new email, the system checks if it conflicts with an existing guardian
2. **Visual hint**: A warning message appears below the email field indicating the email belongs to someone else
3. **Preview modal**: When saving with a conflicting email, a modal shows the existing guardian's details:
   - Name
   - Email
   - Phone (if available)
   - Verification status
   - Number of linked players
4. **Reassignment option**: Admin can confirm reassigning the player to the existing guardian
5. **Audit preservation**: The original guardian identity is kept for audit purposes (not deleted)

## Technical Changes

### Backend

**New Query: `checkGuardianEmailConflict`** (`guardianIdentities.ts`)
- Checks if an email conflicts with an existing guardian
- Returns existing guardian details for preview
- Excludes current guardian being edited from conflict check

**New Mutation: `reassignPlayerToGuardian`** (`guardianPlayerLinks.ts`)
- Updates `guardianPlayerLink` to point to a different guardian
- Resets acknowledgement status (new guardian must acknowledge)
- Preserves relationship type (can be updated during reassign)
- Prevents duplicate links (same guardian + same player)

### Frontend

**New Component: `ReassignGuardianModal`**
- Shows preview of existing guardian details
- Displays number of other players linked to that guardian
- Allows cancel or confirm reassignment

**Modified: `EditGuardianModal`**
- Added real-time email conflict checking via `useQuery`
- Shows warning hint when conflict detected
- Opens ReassignGuardianModal on save if conflict exists
- Added `playerName` prop for context in reassign modal

**Modified: Admin Guardians Page**
- Updated state type to include `playerName`
- Passes `playerName` to EditGuardianModal

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/backend/convex/models/guardianIdentities.ts` | Modified | Added `checkGuardianEmailConflict` query |
| `packages/backend/convex/models/guardianPlayerLinks.ts` | Modified | Added `reassignPlayerToGuardian` mutation |
| `apps/web/src/app/orgs/[orgId]/admin/guardians/components/reassign-guardian-modal.tsx` | New | Reassignment confirmation modal |
| `apps/web/src/app/orgs/[orgId]/admin/guardians/components/edit-guardian-modal.tsx` | Modified | Added conflict detection and reassign flow |
| `apps/web/src/app/orgs/[orgId]/admin/guardians/page.tsx` | Modified | Pass playerName to edit modal |

## Validation Steps

### Prerequisites
1. Have at least two different guardian identities in the system with different email addresses
2. Have at least one player linked to each guardian
3. Know the email addresses of both guardians

### Test Case 1: Normal Edit (No Conflict)
1. Navigate to **Admin → Guardian Management**
2. Find a guardian and click the **Edit** button (pencil icon)
3. Change a non-email field (e.g., phone number)
4. Click **Save Changes**
5. **Expected**: Changes save successfully with toast "Guardian information updated successfully"

### Test Case 2: Email Conflict Detection
1. Navigate to **Admin → Guardian Management**
2. Find Guardian A and click **Edit**
3. Change the email to Guardian B's email address
4. **Expected**:
   - A warning appears below the email field: "This email belongs to an existing guardian (Name). Saving will offer to reassign the player."

### Test Case 3: Reassignment Flow
1. Continue from Test Case 2
2. Click **Save Changes**
3. **Expected**: A modal appears with title "Reassign Guardian" showing:
   - Guardian B's name
   - Guardian B's email
   - Guardian B's phone (if available)
   - Verification status badge
   - Number of players linked to Guardian B
   - Message asking to confirm reassigning the player
4. Click **Reassign Guardian**
5. **Expected**:
   - Toast: "Player reassigned to existing guardian successfully"
   - Modal closes
   - The player is now linked to Guardian B instead of Guardian A
   - Guardian A still exists in the system (for audit)

### Test Case 4: Cancel Reassignment
1. Repeat steps 1-3 from Test Case 3
2. Click **Cancel** on the reassignment modal
3. **Expected**: Modal closes, no changes made, edit modal still open

### Test Case 5: Duplicate Link Prevention
1. Find a player who is already linked to Guardian B
2. Try to edit the guardian for that player to Guardian B's email
3. **Expected**: Error message "This guardian is already linked to this player"

### Test Case 6: Verify Audit Trail
1. After performing Test Case 3
2. Check the database or Guardian Management page
3. **Expected**:
   - Guardian A still exists (not deleted)
   - The player's guardian link now points to Guardian B
   - Guardian B's acknowledgement status is reset (pending)

## Pull Request

Branch: `fix/307-guardian-email-update-conflict`
