# Bug Fix: ReturnsValidationError on Parent Dashboard (enrollmentValidator)

## Issue
**Error:** `ReturnsValidationError: Object contains extra field 'importSessionId' that is not in the validator.`
**Affected page:** Parent dashboard overview (`/orgs/[orgId]/parents`)
**Introduced by:** Commit `ed8dffe7` — Phase 4.1–4.5 Federation Connector Platform merge (19 Feb 2026)

## Root Cause

The `orgPlayerEnrollments` schema table had three new import/sync tracking fields added in the Phase 4 merge:

```ts
importSessionId: v.optional(v.id("importSessions")),
lastSyncedAt:    v.optional(v.number()),
syncSource:      v.optional(v.string()),
```

The `enrollmentValidator` in `orgPlayerEnrollments.ts` — used as the `returns` validator for `getEnrollmentsForOrg` and several other queries — was not updated to match, so Convex rejected any record that had these fields set, throwing a `ReturnsValidationError` on every page load for parents whose children had been imported.

## What Was Changed

**File:** `packages/backend/convex/models/orgPlayerEnrollments.ts`

Added the three missing fields to `enrollmentValidator`:

```ts
importSessionId: v.optional(v.id("importSessions")),
lastSyncedAt: v.optional(v.number()),
syncSource: v.optional(v.string()),
```

All queries that share `enrollmentValidator` as their `returns` type are fixed automatically:
- `getEnrollmentsForOrg`
- `listEnrollments`
- `getEnrollmentsForPlayer`
- others

## Files Modified

- `packages/backend/convex/models/orgPlayerEnrollments.ts`
