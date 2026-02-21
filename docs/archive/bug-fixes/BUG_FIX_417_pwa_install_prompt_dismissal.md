# Bug Fix #417 — PWA Install Prompt Not Consistent (Dismissal Doesn't Persist)

## Issue

**GitHub Issue:** #417
**Title:** UAT Testing - Install App Popup not consistent
**Severity:** UX regression on iOS

## Symptoms

- Dismissing the install prompt did not persistently suppress it — the popup reappeared after 7 days
- On iOS specifically, the close (X) button was too small (24×24px) to reliably tap, meaning users thought they dismissed it but the dismissal was never recorded
- iOS users had no explicit "Not now" text button; only the small X icon

## Root Cause Analysis

Three issues in `apps/web/src/components/polish/pwa-install-prompt.tsx`:

1. **`DISMISSAL_COOLDOWN_DAYS = 7`** — Too short. After dismissal, the prompt reappeared every 7 days because the visit counter remained at ≥5. Industry standard is ~30 days.

2. **X button was 24×24px** (`h-6 w-6`) — Below the iOS HIG minimum of 44×44px for touch targets. Users on iOS frequently missed the tap, `handleDismiss()` was never called, and no dismissal timestamp was saved to `localStorage`. On the next page load the prompt would appear again.

3. **No "Not now" button on iOS** — Non-iOS users had an explicit "Not now" button. iOS users only had the hard-to-hit X, making dismissal less discoverable.

## Changes Made

**File:** `apps/web/src/components/polish/pwa-install-prompt.tsx`

| Change | Before | After |
|--------|--------|-------|
| Dismissal cooldown | `DISMISSAL_COOLDOWN_DAYS = 7` | `DISMISSAL_COOLDOWN_DAYS = 30` |
| X button size | `h-6 w-6` (24×24px) | `h-10 w-10` (40×40px) |
| iOS dismiss button | None (X only) | Added explicit "Not now" button |

## Manual Reset

To manually re-trigger the install prompt (e.g. after accidental dismissal), append `?pwa-debug=true` to any page URL. This bypasses all checks including the dismissal cooldown.
