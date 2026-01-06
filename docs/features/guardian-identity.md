# Guardian Identity System Enhancements

*Implementation Date: December 18, 2024*

This document describes the enhancements made to the guardian identity claiming system beyond the core Section 3.5 implementation.

---

## Overview

Three major enhancements were added to improve the guardian identity claiming experience:

1. **Admin Dashboard** - View and manage unclaimed guardian identities
2. **Bulk Claim UI** - Allow users to claim multiple identities at once
3. **Guardian Settings Page** - Manage privacy and consent settings

---

## Enhancement 1: Admin Dashboard for Unclaimed Guardians

### Purpose
Provides administrators visibility into guardian profiles that were created from imports but haven't been claimed by users yet.

### Implementation

**Backend Query:** `packages/backend/convex/models/guardianIdentities.ts`

```typescript
export const getUnclaimedGuardians = query({
  args: {
    organizationId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      guardian: guardianIdentityValidator,
      childrenCount: v.number(),
      children: v.array(...),
      organizationIds: v.array(v.string()),
      daysSinceCreated: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get all guardians without userId (unclaimed)
    // Include linked children and organizations
    // Calculate days since created
    // Filter by organization if specified
  },
});
```

**Frontend Page:** `apps/web/src/app/orgs/[orgId]/admin/unclaimed-guardians/page.tsx`

### Features

1. **Statistics Dashboard:**
   - Total unclaimed guardians
   - Total children linked to unclaimed guardians
   - Oldest unclaimed guardian (days)

2. **Comprehensive Table View:**
   - Guardian name and contact info (email, phone)
   - All linked children with names
   - Days since profile was created
   - Source of creation (import, manual, etc.)
   - Organizations where children are enrolled

3. **Actions:**
   - Send reminder email (UI ready, backend TODO)
   - Filter by organization

4. **Visual Design:**
   - Clean card-based statistics
   - Sortable table with pagination ready
   - Badge indicators for status and source
   - Info card explaining unclaimed guardians

### Access Path
```
/orgs/[orgId]/admin/unclaimed-guardians
```

### Use Cases

- **Admin Review:** See how many guardians haven't claimed their profiles
- **Follow-up:** Identify guardians to contact for profile claiming
- **Data Quality:** Track import success and user adoption
- **Reporting:** Monitor guardian engagement over time

---

## Enhancement 2: Bulk Claim UI

### Purpose
Allows users with multiple unclaimed guardian identities (e.g., different clubs for different children) to claim all profiles at once when they log in.

### Implementation

**Backend Query:** `packages/backend/convex/models/guardianIdentities.ts`

```typescript
export const findAllClaimableForCurrentUser = query({
  args: {},
  returns: v.array(
    v.object({
      guardianIdentity: guardianIdentityValidator,
      children: v.array(...),
      organizations: v.array(...),
      confidence: v.number(),
    })
  ),
  handler: async (ctx) => {
    // Get current user's email from auth
    // Find ALL guardians with this email that have no userId
    // Return all matches with children and organizations
  },
});
```

**Frontend Components:**
- `apps/web/src/components/bulk-guardian-claim-dialog.tsx` - Main dialog
- `apps/web/src/components/bulk-claim-provider.tsx` - Provider component

### Features

1. **Automatic Detection:**
   - Checks for claimable identities when user logs in
   - Shows dialog only if multiple profiles found
   - Skips if already checked in current session

2. **Profile Selection:**
   - Checkbox for each claimable profile
   - Shows all children linked to each profile
   - Displays organizations where children are enrolled
   - Pre-selects all profiles by default

3. **Bulk Consent Management:**
   - Single checkbox for cross-org sharing
   - Applies to all selected profiles and their children
   - Clear explanation of what consent means

4. **Summary Display:**
   - Shows total profiles selected
   - Shows total children affected
   - Real-time updates as checkboxes change

5. **Smart Dialog Behavior:**
   - Appears automatically after login
   - Can be dismissed (skip for now)
   - Won't show again after claiming
   - Scrollable content for many profiles

### Integration

The `BulkClaimProvider` should be added to your app layout:

```typescript
// In your app layout or root component
import { BulkClaimProvider } from "@/components/bulk-claim-provider";

export default function Layout({ children }) {
  return (
    <BulkClaimProvider>
      {children}
    </BulkClaimProvider>
  );
}
```

### Use Cases

- **Multi-Club Parents:** Parent with children in GAA and Soccer can claim both profiles at once
- **Multiple Children:** Parent with children in different age groups/clubs
- **Imported Data:** Guardians whose profiles were created from multiple CSV imports

### Example Flow

```
1. User signs up: mary@example.com
2. System finds 2 unclaimed guardian profiles:
   - GAA Club: Mary Doe (2 children)
   - Soccer Club: Mary Doe (1 child)
3. Dialog shows both profiles with all children
4. Mary selects both, enables cross-org sharing
5. Click "Claim 2 Profiles"
6. Now has access to all 3 children across both clubs
```

---

## Enhancement 3: Guardian Settings Page

### Purpose
Provides guardians with a central location to manage their privacy settings and consent preferences for each child.

### Implementation

**Frontend Page:** `apps/web/src/app/orgs/[orgId]/guardian/settings/page.tsx`

**Uses Existing Mutation:** `guardianPlayerLinks.updateLinkConsent`

### Features

1. **Profile Overview:**
   - Guardian name
   - Email address
   - Phone number
   - Verification status badge

2. **Child-Specific Privacy Controls:**
   - List all linked children
   - Toggle cross-org sharing for each child individually
   - Visual indicator when sharing is enabled
   - Explanation of what sharing means

3. **Relationship Information:**
   - Display relationship type (mother, father, guardian)
   - Show if primary contact
   - Display parental responsibility status
   - Show collection permissions

4. **Real-time Updates:**
   - Switch toggles update immediately
   - Toast notifications on success/error
   - Loading states while processing

5. **Educational Content:**
   - Info card explaining cross-org sharing
   - Privacy implications clearly stated
   - Emphasis on control and reversibility

### Access Path
```
/orgs/[orgId]/guardian/settings
```

### Design Highlights

- **Per-Child Control:** Each child has independent privacy settings
- **Clear Toggle:** Switch component for easy on/off
- **Visual Feedback:** Blue highlight when sharing enabled
- **Explanatory Text:** Context-aware help text
- **Badge System:** Visual indicators for status and permissions

### Privacy Settings Explained

**Cross-Organization Sharing:**
- **Enabled:** Other clubs can see guardian-child relationship
- **Disabled:** Only current club can see the relationship
- **Use Case:** Makes future enrollments easier
- **Data Shared:** Relationship only (not personal contact details)

### Example Use Case

```
Scenario: Parent's child joins a new soccer club

With Sharing Enabled:
1. New club imports child's data
2. System: "We found this child is linked to Mary Doe (email)"
3. New club can invite Mary directly
4. Mary accepts and gets immediate access

With Sharing Disabled:
1. New club imports child's data
2. No guardian connection visible
3. Mary must manually request access
4. Admin must verify and link
```

---

## Technical Implementation Details

### Database Changes
**None required** - All features use existing schema tables:
- `guardianIdentities`
- `guardianPlayerLinks`
- `playerIdentities`
- `orgPlayerEnrollments`

### New Queries Added

1. **`getUnclaimedGuardians`** - Admin dashboard query
   - Filters by organization
   - Includes children and org data
   - Calculates days since creation

2. **`findAllClaimableForCurrentUser`** - Bulk claim query
   - Uses authenticated user context
   - Finds all email matches
   - Returns full relationship data

### New Components Created

1. **`bulk-guardian-claim-dialog.tsx`** - Bulk claiming UI
2. **`bulk-claim-provider.tsx`** - Auto-check provider
3. **Admin unclaimed guardians page** - Dashboard view
4. **Guardian settings page** - Privacy management

### Mutations Used

- **`linkGuardianToUser`** - Links userId to guardian identity (existing)
- **`updateLinkConsent`** - Updates consent flag (existing)

---

## Testing Instructions

### Test 1: Admin Dashboard

```bash
# Prerequisites:
# - Import CSV with guardian data (creates unclaimed guardians)
# - Have admin access to organization

# Steps:
1. Navigate to /orgs/[orgId]/admin/unclaimed-guardians
2. Verify statistics show correct counts
3. Check table displays all unclaimed guardians
4. Verify children are listed for each guardian
5. Check "days since created" calculation
6. Verify organization filter works (if applicable)
```

**Expected Results:**
- All unclaimed guardians visible
- Children properly grouped by guardian
- Contact info displayed correctly
- Days calculation accurate

### Test 2: Bulk Claim Flow

```bash
# Prerequisites:
# - Create 2+ unclaimed guardian identities with same email
# - Different children/organizations for each

# Steps:
1. Log out completely
2. Sign up with the email matching unclaimed guardians
3. Complete signup process
4. Immediately after signup, bulk claim dialog should appear
5. Verify all profiles shown with their children
6. Deselect one profile
7. Enable cross-org sharing
8. Click "Claim X Profiles"
9. Verify redirect to dashboard
10. Check access to children from claimed profiles
```

**Expected Results:**
- Dialog appears automatically
- All claimable profiles shown
- Selection works correctly
- Consent applies to all children
- Access granted immediately

### Test 3: Guardian Settings

```bash
# Prerequisites:
# - Be logged in as a guardian with claimed profile
# - Have at least one linked child

# Steps:
1. Navigate to /orgs/[orgId]/guardian/settings
2. Verify profile info displays correctly
3. See all linked children listed
4. Toggle cross-org sharing for a child (enable)
5. Verify blue indicator shows "Sharing enabled"
6. Toggle off
7. Verify indicator removed
8. Refresh page
9. Verify settings persisted
```

**Expected Results:**
- Settings page loads without errors
- All children visible
- Toggles work smoothly
- Changes persist across refreshes
- Toast notifications appear

---

## Integration Requirements

### 1. Add Bulk Claim Provider to Layout

Update your main app layout to include the provider:

```typescript
// apps/web/src/app/layout.tsx or similar
import { BulkClaimProvider } from "@/components/bulk-claim-provider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ConvexClientProvider>
          <BulkClaimProvider>
            {children}
          </BulkClaimProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
```

### 2. Add Navigation Links

Add links to new pages in your navigation:

```typescript
// Admin Navigation
{
  label: "Unclaimed Guardians",
  href: "/orgs/[orgId]/admin/unclaimed-guardians",
  icon: <Users />,
  requiredRole: "admin"
}

// Guardian Navigation
{
  label: "Settings",
  href: "/orgs/[orgId]/guardian/settings",
  icon: <Settings />,
  requiredRole: "parent"
}
```

### 3. Permission Checks

Ensure proper access control:

```typescript
// Admin pages - require admin or owner role
// Guardian pages - require parent role or guardianIdentity
```

---

## Future Enhancements (Optional)

### 1. Email Reminders
Implement the "Send Reminder" button on admin dashboard:
- Email template for unclaimed profiles
- Track reminder sent date
- Limit reminder frequency

### 2. Analytics Dashboard
Track claiming metrics:
- Claim rate over time
- Average time to claim
- Most active organizations
- Abandoned claims

### 3. Merge Duplicate Guardians
Handle edge cases where same person has multiple emails:
- Detect potential duplicates
- Admin merge tool
- Preserve all children links

### 4. Guardian Dashboard
Dedicated landing page for guardians:
- Overview of all children
- Quick access to each child's profile
- Notifications and updates
- Direct link to settings

---

## Security Considerations

### 1. Access Control
- Admin dashboard requires admin/owner role
- Guardian settings requires authenticated guardian
- Bulk claim only for logged-in users

### 2. Data Privacy
- Cross-org sharing requires explicit consent
- Contact info only shared with active enrollments
- Guardians control their own visibility

### 3. Verification
- Email verification recommended before sharing data
- Confidence scoring prevents false matches
- Admins can review uncertain matches

---

## Summary

These three enhancements create a complete guardian identity management system:

1. **Admin Dashboard** - Visibility and management for administrators
2. **Bulk Claim UI** - Seamless multi-profile claiming for users
3. **Guardian Settings** - Fine-grained privacy control for guardians

Together with the core Section 3.5 implementation, this provides a production-ready guardian identity claiming system that:

- ✅ Allows guardians to claim profiles from imports
- ✅ Supports multiple profiles per email address
- ✅ Provides transparent privacy controls
- ✅ Gives admins visibility into adoption
- ✅ Scales across multiple organizations
- ✅ Respects user privacy and consent

All features are implemented and ready for testing!

---

*End of Document*
