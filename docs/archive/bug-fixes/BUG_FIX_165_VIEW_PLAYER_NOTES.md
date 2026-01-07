# Bug Fix: Issue #165 - Missing Information on the View Player Page

## Issue Summary
**GitHub Issue**: [#165](https://github.com/NB-PDP-Testing/PDP/issues/165)
**Status**: Fixed
**Date**: January 7, 2026

## Problem Description
On the View Player Page, Coach Notes and Player Notes were not visible. They were only seen on the Edit Player Page.

## Root Cause Analysis

The Coach Notes and Player Notes were not visible on the View Player page because of a **data source mismatch** between the Edit and View pages.

### Technical Details

1. **Edit Player page** (`apps/web/src/app/orgs/[orgId]/players/[playerId]/edit/page.tsx`) saves notes to the `orgPlayerEnrollments` table:
   ```tsx
   await updateEnrollment({
     enrollmentId: enrollment._id,
     coachNotes: formData.coachNotes || undefined,
   });
   ```

2. **View Player page** (via `getFullPlayerPassportView` query in `packages/backend/convex/models/sportPassports.ts`) was reading notes from the `sportPassports` table:
   ```tsx
   coachNotes: primaryPassport?.coachNotes,
   parentNotes: primaryPassport?.parentNotes,
   playerNotes: primaryPassport?.playerNotes,
   ```

3. These are **two different tables**, so notes saved in the enrollment were never retrieved for the view page.

### Additional Finding
The `orgPlayerEnrollments` table schema only has `coachNotes` - it does NOT have `parentNotes` or `playerNotes` fields. Those fields exist only on `sportPassports`.

## Fix Applied

Updated `packages/backend/convex/models/sportPassports.ts` in the `getFullPlayerPassportView` query to read `coachNotes` from enrollment (primary source) with passport as fallback:

```diff
- // Notes
- coachNotes: primaryPassport?.coachNotes,
- parentNotes: primaryPassport?.parentNotes,
- playerNotes: primaryPassport?.playerNotes,
+ // Notes - coachNotes from enrollment (primary), other notes from passport
+ coachNotes: enrollment?.coachNotes ?? primaryPassport?.coachNotes,
+ parentNotes: primaryPassport?.parentNotes,
+ playerNotes: primaryPassport?.playerNotes,
```

## Files Changed
- `packages/backend/convex/models/sportPassports.ts`

## Impact
- Coach Notes saved via the Edit Player page will now appear on the View Player page
- Backwards compatible - if no enrollment notes exist, falls back to passport notes (if any)
- Parent Notes and Player Notes continue to read from `sportPassports` (correct location for those)

## Testing Steps
1. Navigate to a player's Edit page (`/orgs/[orgId]/players/[playerId]/edit`)
2. Add/update Coach Notes and save
3. View the player page (`/orgs/[orgId]/players/[playerId]`) - Coach Notes should now be visible in the Development Notes section