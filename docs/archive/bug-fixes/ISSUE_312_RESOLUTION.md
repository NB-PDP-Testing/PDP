# Issue #312 - Guardian Trust Level Null Values - RESOLVED

## Resolution

The issue has been resolved. The "Seed Default" button in the admin interface successfully populated the missing `trustLevel` values for existing guardian player links.

## Root Cause

The `trustLevel` field was added to the `guardianPlayerLinks` table schema but existing records in the database had `null` values, causing TypeScript type safety violations.

## Fix Applied

The manual "Seed Default" operation in the admin interface applied the default trust level (`"FULL_ACCESS"`) to all existing guardian player links that had `null` values.

## Verification

User confirmed that pressing the "Seed Default" button worked and resolved the issue.

## Related Files

- Schema: `packages/backend/convex/schema.ts`
- Migration script: `packages/backend/convex/scripts/migrateCoachTrustLevels.ts`
- Documentation: `docs/archive/bug-fixes/ISSUE_PARENT_COACH_FEEDBACK_LINK.md`

## Status

✅ **CLOSED** - Issue resolved via manual seed operation
