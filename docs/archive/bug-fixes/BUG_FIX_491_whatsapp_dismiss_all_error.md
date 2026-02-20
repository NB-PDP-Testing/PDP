# Bug Fix #491: WhatsApp Dismiss All Causes an Error

## Issue
**GitHub:** [#491](https://github.com/NB-PDP-Testing/PDP/issues/491)
**Title:** UAT - RQ-005 WhatsApp Dismiss All Causes an Error

## Root Cause

`batchDismissInsightsFromReview` in `whatsappReviewLinks.ts` was writing a `dismissedDate` string field into the `voiceNotes.insights` array objects. This field does not exist in the schema validator for `voiceNotes.insights`, causing Convex to throw a validation error on every Dismiss All call.

The timestamp was already correctly captured by `dismissedAt: now` (a number). `dismissedDate` was a redundant string duplicate that was never added to the schema.

## What Was Changed

**File:** `packages/backend/convex/models/whatsappReviewLinks.ts`

Removed the invalid line from the insight update in `batchDismissInsightsFromReview`:

```ts
// Removed:
dismissedDate: new Date().toISOString(),
```

## Files Modified

- `packages/backend/convex/models/whatsappReviewLinks.ts`
