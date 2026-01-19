# Bug Fix #207: Add Guardian Button Not Working

**Issue:** [GitHub #207](https://github.com/NB-PDP-Testing/PDP/issues/207)
**Branch:** `fix/add-guardian-button-207`
**Date Fixed:** 2026-01-19
**Commit:** c963f09

## Problem Description

The "Add Guardian" button in the Admin > Guardians page was not functioning. When clicked, nothing happened.

### Steps to Reproduce
1. Navigate to Admin > Guardians
2. Click on the "Status View" tab
3. Filter by "Missing Contact" status
4. Click the "Add Guardian" button next to any player without guardians
5. **Bug:** Nothing happens - no modal, no action

### Root Cause

The button had no `onClick` handler attached:

```tsx
// BEFORE (line 1097-1100 in page.tsx)
<Button size="sm" variant="outline">
  <Plus className="mr-2 h-4 w-4" />
  Add Guardian
</Button>
```

The button was purely presentational with no functionality.

## Solution

### 1. Created AddGuardianModal Component

Created a new modal component at:
`apps/web/src/app/orgs/[orgId]/admin/guardians/components/add-guardian-modal.tsx`

**Features:**
- Form fields for guardian information (firstName, lastName, email, phone, relationship)
- Client-side validation for required fields and email format
- Integration with Convex mutations:
  - `createGuardianIdentity` - Creates the guardian record
  - `createGuardianPlayerLink` - Links guardian to player
- Success/error toast notifications
- Proper loading states during submission

**Form Fields:**
- **First Name*** - Required, text input
- **Last Name*** - Required, text input
- **Email*** - Required, email validation
- **Phone** - Optional, tel input
- **Relationship*** - Required, dropdown (Mother, Father, Guardian, Grandparent, Other)

### 2. Updated Guardians Page

Modified `apps/web/src/app/orgs/[orgId]/admin/guardians/page.tsx`:

**Added State:**
```tsx
const [addGuardianModalOpen, setAddGuardianModalOpen] = useState(false);
const [selectedPlayer, setSelectedPlayer] = useState<{
  id: string;
  name: string;
} | null>(null);
```

**Added Imports:**
```tsx
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { AddGuardianModal } from "./components/add-guardian-modal";
```

**Updated Button:**
```tsx
<Button
  onClick={() => {
    setSelectedPlayer({
      id: player.playerId,
      name: player.playerName,
    });
    setAddGuardianModalOpen(true);
  }}
  size="sm"
  variant="outline"
>
  <Plus className="mr-2 h-4 w-4" />
  Add Guardian
</Button>
```

**Added Modal Component:**
```tsx
{/* Add Guardian Modal */}
{selectedPlayer && (
  <AddGuardianModal
    onOpenChange={setAddGuardianModalOpen}
    open={addGuardianModalOpen}
    playerId={selectedPlayer.id as Id<"playerIdentities">}
    playerName={selectedPlayer.name}
  />
)}
```

## Technical Implementation Details

### Backend Mutations Used

**1. createGuardianIdentity**
- File: `packages/backend/convex/models/guardianIdentities.ts`
- Purpose: Creates a new guardian identity record
- Parameters:
  - firstName, lastName, email (required)
  - phone, address, town, postcode, country (optional)
  - createdFrom: Set to "admin_guardians_page"

**2. createGuardianPlayerLink**
- File: `packages/backend/convex/models/guardianPlayerLinks.ts`
- Purpose: Links the guardian to the player
- Parameters:
  - guardianIdentityId, playerIdentityId, relationship (required)
  - isPrimary: Set to `true` (first guardian is primary)
  - hasParentalResponsibility: Set to `true`
  - canCollectFromTraining: Set to `true`
  - consentedToSharing: Set to `false` (requires explicit consent)

### Error Handling

The modal handles several error cases:
- **Duplicate Email:** If a guardian with the same email already exists, the backend returns an error
- **Validation Errors:** Client-side validation for required fields and email format
- **Network Errors:** Generic error handling with toast notifications

### User Experience Flow

1. User clicks "Add Guardian" button
2. Modal opens with empty form
3. User fills in guardian information
4. User clicks "Add Guardian" (submit)
5. Loading state shows (button disabled with spinner)
6. Backend creates guardian identity
7. Backend links guardian to player
8. Success toast appears with confirmation message
9. Modal closes and form resets
10. Page data refreshes automatically (Convex real-time updates)
11. Player moves from "Missing Contact" to appropriate status

## Testing

### Manual Test Steps

1. ✅ Navigate to `/orgs/[orgId]/admin/guardians`
2. ✅ Click "Status View" tab
3. ✅ Filter by "Missing Contact"
4. ✅ Click "Add Guardian" button
5. ✅ Verify modal opens
6. ✅ Fill in guardian information with valid data
7. ✅ Submit form
8. ✅ Verify success toast appears
9. ✅ Verify modal closes
10. ✅ Verify player no longer appears in "Missing Contact" list

### Edge Cases Tested

- ✅ Empty required fields - shows validation errors
- ✅ Invalid email format - shows validation error
- ✅ Duplicate email - shows backend error
- ✅ Modal cancel - closes without saving
- ✅ Optional phone field - works with and without value

## Files Changed

1. **Created:**
   - `apps/web/src/app/orgs/[orgId]/admin/guardians/components/add-guardian-modal.tsx`

2. **Modified:**
   - `apps/web/src/app/orgs/[orgId]/admin/guardians/page.tsx`

## Impact

- **Users Affected:** Admin users managing guardians
- **Severity:** High - blocking feature for adding guardians to players
- **Workaround (Before Fix):** None - could not add guardians from this view

## Related Issues

None

## Future Improvements

Potential enhancements (not in scope for this fix):
1. Add ability to search existing guardians before creating new ones
2. Add bulk guardian import functionality
3. Add guardian profile editing from this view
4. Add validation against existing player/guardian relationships
