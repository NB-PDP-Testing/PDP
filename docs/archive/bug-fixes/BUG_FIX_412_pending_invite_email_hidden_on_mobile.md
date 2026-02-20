# Bug Fix #412: Pending Invite Email Hidden on Mobile

## Issue
**GitHub:** [#412](https://github.com/NB-PDP-Testing/PDP/issues/412)
**Title:** UAT - Pending invite error on mobile

## Root Cause

Three `<p>` elements in the admin Users page used `sm:truncate` (truncate only at ≥640px). On real mobile devices (below the `sm` breakpoint), no `overflow-hidden` was applied. Inside `min-w-0 flex-1` flex containers, this causes the text to collapse to zero visible width in real mobile Chrome — even though desktop DevTools emulation renders it correctly.

The regression was introduced in commit `a4eb329e` which changed `truncate` to `sm:truncate` intending to show full emails on mobile, but instead made them invisible.

## What Was Changed

**File:** `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`

Changed `font-medium sm:truncate` → `truncate font-medium` on three elements:

| Line | Section | Field |
|------|---------|-------|
| 1151 | Pending Invitations | `invitation.email` |
| 1500 | Join Requests | `request.userEmail` |
| 1560 | Guardian Links | `link.guardianName (email)` |

All three share the same `min-w-0 flex-1` container pattern and were affected identically.

## Files Modified

- `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`
