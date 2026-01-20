# Bug Fix #293: Guardian Player Connection Improvements

## Issue Summary
Fixed multiple issues with the Guardian Player Connection system to improve the user experience for both parents and admins when managing guardian-player relationships.

## Branch
`Bug293_fixGuardianPlayer`

## Fixes Implemented

### 1. **Pending Guardian Claims Notification Banner**
**Problem**: Parents with claimable guardian identities weren't seeing a notification on their dashboard - only the dialog appeared.

**Solution**: Added a visible notification banner to `/orgs/[orgId]/parents/page.tsx` that shows:
- Clear message about pending guardian connection
- Guardian information (name, email, children count)
- "Review & Claim Connection" button to open claim dialog
- Visible even when dialog is closed, only disappears when user clicks "This Isn't Me"

**Files Modified**:
- `apps/web/src/app/orgs/[orgId]/parents/page.tsx`

---

### 2. **Auto-Claim Behavior (Verified Working)**
**Behavior**: When an admin creates a guardian-player connection using their own email address while logged in, the system automatically claims the connection.

**Status**: This is expected and correct behavior - no changes needed.

---

### 3. **Fixed Infinite Loop on Dialog Dismiss**
**Problem**: Clicking the X button caused the dialog to keep reopening in an infinite loop.

**Solution**:
- Added `hasAutoOpened` flag to track if dialog has already auto-opened once
- Added `dismissedIdentityIds` state to track temporarily dismissed identities
- X button now calls `onOpenChange(false)` (just closes dialog)
- "This Isn't Me" button calls `onDismiss()` (permanently dismisses)

**Files Modified**:
- `apps/web/src/app/orgs/[orgId]/parents/page.tsx`
- `apps/web/src/components/guardian-identity-claim-dialog.tsx`

**Technical Details**:
```typescript
// Prevent auto-reopen with flag
const [hasAutoOpened, setHasAutoOpened] = useState(false);

useEffect(() => {
  if (claimableIdentities && claimableIdentities.length > 0 && !showClaimDialog && !hasAutoOpened) {
    setShowClaimDialog(true);
    setHasAutoOpened(true); // Mark as opened
  }
}, [claimableIdentities, showClaimDialog, hasAutoOpened]);
```

---

### 4. **Declined Status Implementation**
**Problem**: When a parent clicked "This Isn't Me", the decision wasn't persisted - dialog would reappear on next login.

**Solution**: Added `declinedByUserId` field to track declined connections:

**Schema Changes** (`packages/backend/convex/schema.ts`):
```typescript
guardianPlayerLinks: defineTable({
  // ... existing fields
  declinedByUserId: v.optional(v.string()), // Tracks who declined this connection
})
```

**Backend Mutations** (`packages/backend/convex/models/guardianPlayerLinks.ts`):
- Created `declineGuardianPlayerLink` mutation to set `declinedByUserId`
- Created `resetDeclinedLink` mutation to clear declined status (for resending)

**Frontend Changes**:
- Parent dashboard calls decline mutation when "This Isn't Me" clicked
- Admin guardians page shows "Declined" status badge (red with X icon)
- Query `findAllClaimableForCurrentUser` filters out declined links per user

**Files Modified**:
- `packages/backend/convex/schema.ts`
- `packages/backend/convex/models/guardianPlayerLinks.ts`
- `packages/backend/convex/models/guardianIdentities.ts`
- `apps/web/src/app/orgs/[orgId]/parents/page.tsx`

---

### 5. **Fixed Empty Dialog After Declining All Children**
**Problem**: After declining all children for a guardian identity, an empty dialog would still appear on next login with no children listed.

**Solution**: Updated `findAllClaimableForCurrentUser` query to only return guardian identities that have at least one non-declined child remaining:

```typescript
// Only include this guardian if they have non-declined children
if (children.length > 0) {
  results.push({
    guardianIdentity: guardian,
    children,
    organizations,
    confidence: 100,
  });
}
```

**Files Modified**:
- `packages/backend/convex/models/guardianIdentities.ts`

---

### 6. **Declined Tab and Count on Admin Page**
**Problem**:
- No way for admin to filter and view declined connections
- Player-level status showed "0 of 1 claimed" instead of indicating declined status

**Solution**:
- Added `declinedAccounts` to stats query
- Added `declinedCount` to each player's relationship data
- Added "❌ Declined" tab to admin guardians page
- Updated `getStatusBadge` to show declined count with red badge
- Updated filtering logic to support declined filter

**Admin Page Features**:
- **Declined Tab**: Filters to show only players with declined guardian connections
- **Status Badge**: Shows "X Declined" at player level (e.g., "1 Declined")
- **Tooltip**: Explains what declined means and suggests actions
- **Individual Guardian Status**: Shows red "Declined" badge on specific guardians

**Files Modified**:
- `packages/backend/convex/models/guardianManagement.ts`
- `apps/web/src/app/orgs/[orgId]/admin/guardians/page.tsx`

---

### 7. **Fixed Edit Button Parameter Mismatch**
**Problem**: Clicking Edit on a declined guardian connection caused error:
```
ArgumentValidationError: Object is missing the required field 'linkId'
```

**Cause**: Frontend was sending `guardianPlayerLinkId` but backend expected `linkId`

**Solution**: Fixed parameter name in `edit-guardian-modal.tsx`:
```typescript
// BEFORE:
await updateGuardianPlayerLink({
  guardianPlayerLinkId: guardianPlayerLinkId,
  relationship: formData.relationship,
});

// AFTER:
await updateGuardianPlayerLink({
  linkId: guardianPlayerLinkId,
  relationship: formData.relationship,
});
```

**Files Modified**:
- `apps/web/src/app/orgs/[orgId]/admin/guardians/components/edit-guardian-modal.tsx`

---

### 8. **Reset Declined Status ("Resend") Functionality**
**Problem**: After a parent declined a connection, admins had no way to reset the declined status after fixing guardian information (e.g., correcting email).

**Solution**:
- Created `resetDeclinedLink` mutation to clear `declinedByUserId` field
- Added Send icon button (visible only for declined connections)
- Admin workflow: Edit guardian info → Click Send icon → Guardian can claim again

**UI Implementation**:
- Send icon (blue) appears only when `guardian.declinedByUserId` is set
- Tooltip: "Reset declined status - Guardian can try claiming again"
- Success toast: "Reset connection for [Guardian Name]. They can now claim this connection."
- Connection moves from "Declined" tab back to "Pending" tab

**Files Modified**:
- `packages/backend/convex/models/guardianPlayerLinks.ts`
- `apps/web/src/app/orgs/[orgId]/admin/guardians/page.tsx`

---

### 9. **Removed Zero Badge on Messages Navigation**
**Problem**: Messages navigation item in parent dashboard showed "0" badge when there were no unread messages, which was confusing.

**Solution**: Only show the unread message badge when count is greater than 0:
```typescript
{
  href: `/orgs/${orgId}/parents/messages`,
  label: "Messages",
  icon: MessageSquare,
  ...(unreadMessagesCount && unreadMessagesCount > 0
    ? { badge: unreadMessagesCount }
    : {}),
}
```

**Files Modified**:
- `apps/web/src/components/layout/parent-sidebar.tsx`

---

## Complete Workflow After Fixes

### Parent User Experience:
1. **Login** → See notification banner about pending guardian connection
2. **Click "Review & Claim Connection"** → Dialog opens with guardian details
3. **Options**:
   - **"Claim This Profile"** → Connection claimed, can access children
   - **X button** → Dialog closes, banner remains visible
   - **"This Isn't Me"** → Connection declined, banner disappears, won't show again

### Admin User Experience:
1. **Navigate to Admin → Guardians**
2. **Filter tabs**:
   - All Claimed
   - Pending
   - **Declined** (NEW)
   - Missing Contact
3. **For Declined Connections**:
   - See red "Declined" badge at player level
   - Click **Edit** → Fix guardian information (e.g., correct email)
   - Click **Send icon** → Reset declined status
   - Parent can now try claiming again with updated info

---

## Technical Implementation Notes

### Database Schema Changes
- Added `declinedByUserId` field to `guardianPlayerLinks` table
- No migration needed (optional field, defaults to undefined)

### Backend Mutations Added
- `declineGuardianPlayerLink` - Sets declined status
- `resetDeclinedLink` - Clears declined status

### Backend Queries Updated
- `findAllClaimableForCurrentUser` - Filters declined per user
- `getGuardianStatsForOrg` - Includes declined count
- `getGuardianRelationshipsForOrg` - Includes declined count per player

### Frontend Components Modified
- Parent dashboard (`page.tsx`) - Added banner and decline handling
- Guardian claim dialog - Fixed X vs dismiss behavior
- Edit guardian modal - Fixed parameter name
- Admin guardians page - Added declined tab and reset button

---

## Testing Checklist

✅ Parent sees notification banner for claimable guardians
✅ Auto-claim works when admin uses their own email
✅ X button closes dialog without dismissing permanently
✅ "This Isn't Me" dismisses permanently and prevents reappearance
✅ Declined status persists across sessions
✅ Empty dialog doesn't appear after declining all children
✅ Admin sees "Declined" tab with filtered connections
✅ Player-level status shows declined count
✅ Edit button works without parameter error
✅ Send icon resets declined status
✅ Messages badge only shows when count > 0

---

## Files Changed

### Backend
- `packages/backend/convex/schema.ts`
- `packages/backend/convex/models/guardianPlayerLinks.ts`
- `packages/backend/convex/models/guardianIdentities.ts`
- `packages/backend/convex/models/guardianManagement.ts`

### Frontend
- `apps/web/src/app/orgs/[orgId]/parents/page.tsx`
- `apps/web/src/app/orgs/[orgId]/admin/guardians/page.tsx`
- `apps/web/src/app/orgs/[orgId]/admin/guardians/components/edit-guardian-modal.tsx`
- `apps/web/src/components/guardian-identity-claim-dialog.tsx`
- `apps/web/src/components/layout/parent-sidebar.tsx`

---

## Commits
- fix: Decline guardian connection and add declined status tracking
- fix: Only show guardian claim dialog if non-declined children exist
- fix: Add declined tab and count to admin guardians page
- fix: Edit button parameter and add reset declined functionality
- fix: Remove zero badge on Messages in parent nav

---

## Related Issues
Fixes #293
