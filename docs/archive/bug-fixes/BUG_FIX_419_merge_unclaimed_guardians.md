# Bug Fix: #419 — Merge Unclaimed Guardians into Guardians Tab

## Issue

**GitHub Issue:** #419
**Title:** UAT - Merging unclaimed guardians into the Guardians tab
**Label:** bug

## Root Cause

The admin "People" section had two separate, unlinked pages for Guardians (`/admin/guardians`) and Unclaimed Guardians (`/admin/unclaimed-guardians`). Both were listed independently in the sidebar and legacy navigation, requiring admins to navigate between two locations to get a full picture of guardian status.

## What Was Changed

### `apps/web/src/app/orgs/[orgId]/admin/guardians/page.tsx`
- Added `unclaimedGuardians` query using `api.models.guardianIdentities.getUnclaimedGuardians`
- Extended `StatusFilter` type to include `"unclaimed"`
- Added `UserX` icon import
- Added 5th stats card "Unclaimed Guardians" (clickable, navigates to unclaimed tab)
- Added "Unclaimed" tab to the status filter tab row
- Added unclaimed data display section (card per unclaimed guardian with name, contact, children badges, days since created, source badge, Send Reminder button)
- Updated "Group by Family" toggle and display conditions to exclude the unclaimed tab
- Added contextual help text for the unclaimed filter

### `apps/web/src/app/orgs/[orgId]/admin/layout.tsx`
- Removed the separate "Unclaimed" nav item from the legacy horizontal navigation

### `apps/web/src/components/layout/admin-sidebar.tsx`
- Removed the separate "Unclaimed Guardians" sidebar entry from the People section

## Files Not Changed

- `apps/web/src/app/orgs/[orgId]/admin/unclaimed-guardians/page.tsx` — Retained as-is so existing bookmarks/direct links continue to work
