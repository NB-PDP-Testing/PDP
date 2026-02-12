# Bug #479: Clear Reviewed Button Does Not Work

## Summary

The "Clear Reviewed" button on the voice note review microsite (`/r/[code]`) fails with the error: **"Failed to process 18 insights — Some insights may have already been reviewed."**

## Root Cause

The `batchDismissInsightsFromReview` backend mutation only processes insights with `status === "pending"`, but the "Clear Reviewed" button operates on items that have already been reviewed (status `"applied"` or `"dismissed"`). The mutation finds 0 matching pending items and reports all items as failures.

### Detailed Trace

1. User completes all reviews (18 items applied/dismissed)
2. The "Recently Reviewed" section shows with a "Clear Reviewed (18)" button
3. User clicks "Clear Reviewed" -> confirmation dialog appears
4. User clicks "Confirm"
5. Frontend (`batch-action-bar.tsx:68-69`) calls `batchDismissInsightsFromReview` mutation
6. Backend (`whatsappReviewLinks.ts:1007-1010`) filters: `i.status === "pending"` — finds 0 matches since all items are `"applied"` or `"dismissed"`
7. All 18 items counted as `failCount`
8. Frontend shows toast: "Failed to process 18 insights" / "Some insights may have already been reviewed."

## How the Recently Reviewed List is Built

In `getCoachPendingItems` (`whatsappReviewLinks.ts:504-505`):

```typescript
const recentlyReviewed = allInsights
  .filter((i) => i.status === "applied" || i.status === "dismissed")
```

Items appear in "Recently Reviewed" when their status is `"applied"` or `"dismissed"`. To clear them from this list, we add a boolean flag so the filter can exclude them without changing their status.

## Affected Files

| File | Role | Change |
|------|------|--------|
| `packages/backend/convex/models/whatsappReviewLinks.ts` | Backend — new `batchClearReviewedInsights` mutation | Sets `clearedFromReview: true` on matched insights |
| `packages/backend/convex/models/whatsappReviewLinks.ts` | Backend — `getCoachPendingItems` query | Add `&& !i.clearedFromReview` to recentlyReviewed filter |
| `apps/web/src/app/r/[code]/batch-action-bar.tsx` | Frontend — "Clear Reviewed" button handler | Call new mutation when `variant === "clear-reviewed"` |

## Fix: Boolean Flag (`clearedFromReview`)

Instead of introducing a new status value, we add a `clearedFromReview` boolean flag to each insight object. This is the simplest approach because:

- **Status values stay untouched** — no schema or validator changes needed
- **Review counts remain correct** — the `reviewedCount` calculation (line 524-529) checks status (`"applied"`, `"dismissed"`, `"auto_applied"`), not the flag, so progress bars are unaffected
- **Minimal blast radius** — only 3 targeted changes across 2 files

### 1. Backend: New `batchClearReviewedInsights` mutation

A dedicated mutation that:
- Accepts insight IDs and a review link code
- Finds insights with status `"applied"` or `"dismissed"`
- Sets `clearedFromReview: true` on each matched insight
- Does NOT change the status — applied data stays on player profiles, coach tasks remain, team observations remain

### 2. Backend: Update `getCoachPendingItems` query

Add `&& !i.clearedFromReview` to the recentlyReviewed filter:

```typescript
const recentlyReviewed = allInsights
  .filter((i) => (i.status === "applied" || i.status === "dismissed") && !i.clearedFromReview)
```

Cleared items no longer appear in the "Recently Reviewed" section but still count toward `reviewedCount`.

### 3. Frontend: Update `batch-action-bar.tsx`

When `variant === "clear-reviewed"`, call `batchClearReviewedInsights` instead of `batchDismissInsightsFromReview`.

### Why not reuse `batchDismiss`?

The `batchDismissInsightsFromReview` mutation is designed for dismissing **pending** items (setting them to `"dismissed"`). Clearing already-reviewed items is a conceptually different operation — it's cleaning up the UI, not making a review decision. A dedicated mutation avoids conflating these two use cases.

### Why not a new `"cleared"` status?

Adding a new status value ripples through schema validators, status checks, and anywhere status strings are referenced. A boolean flag is orthogonal to status — it answers "should this be visible in the review list?" without changing what the review decision was. This keeps the change minimal and avoids unintended side-effects.

## Risk Assessment

**Low risk.** The "Clear Reviewed" button is only used in the `RecentlyReviewedSection` of the `/r/[code]` microsite. The fix adds an optional boolean field that no existing code references, so there's no risk of breaking other features. All previously applied data (player insights, coach tasks, team observations) remains untouched.

## Notes

- The production deployment (`567f03d1`) and `origin/main` contain this code
- The `batch-action-bar.tsx` and related review microsite UX improvements were added in commits `e31e108a` through `567f03d1`
- The `batchDismissInsightsFromReview` mutation was introduced alongside the `BatchActionBar` component but its status filter was copied from the existing `batchApplyInsightsFromReview` pattern, which correctly only operates on pending items
