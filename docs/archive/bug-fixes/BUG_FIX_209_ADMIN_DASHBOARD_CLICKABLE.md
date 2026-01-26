# Bug Fix: Admin Dashboard Pending Requests Not Clickable (#209)

## Issue
None of the data in the "Pending Membership Requests" section on the admin dashboard (`/orgs/[orgId]/admin`) was clickable to take action.

## Root Cause
In `apps/web/src/app/orgs/[orgId]/admin/page.tsx`:

1. Individual pending request items were plain `<div>` elements, not clickable links
2. The "View all" button only appeared when there were more than 5 pending requests
3. Users with 1-5 pending requests had no obvious way to navigate to the approvals page from the card

## Fix Applied
**File:** `apps/web/src/app/orgs/[orgId]/admin/page.tsx`

### Changes:
1. **Made individual request items clickable** - Wrapped each request item in a `<Link>` component that navigates to `/orgs/[orgId]/admin/users/approvals`

2. **Added hover feedback** - Added `cursor-pointer`, `transition-colors`, and `hover:bg-muted/50` classes for visual feedback on hover

3. **Always show action button** - The "Manage Requests" button now always appears at the bottom of the card (previously only showed when > 5 requests)

4. **Dynamic button text** - Button shows:
   - "Manage Requests" when 1-5 pending requests
   - "View all X pending requests" when > 5 pending requests

## Testing
- Navigate to `/orgs/[orgId]/admin` as an admin
- Verify pending request items show hover state and are clickable
- Verify clicking a request item navigates to the approvals page
- Verify the "Manage Requests" button always appears
- Verify button text changes appropriately based on request count

## Commit
```
fix: Make pending membership requests clickable on admin dashboard (#209)
```
