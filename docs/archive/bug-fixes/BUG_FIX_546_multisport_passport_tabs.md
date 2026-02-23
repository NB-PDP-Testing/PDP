# Bug Fix: Multi-Sport Passport — Missing Sport Tabs and Raw Sport Code Label

**Issue:** #546
**Title:** UAT - too many clicks to view multiple passports for parents
**Branch:** `jkobrien/546_PassportsTabs_Mulitsport`

---

## Problems

1. **Only one sport tab shown** — When a child plays multiple sports, the passport page only ever showed "Primary Sport" and "Cross-Sport Analysis". There was no way to switch between sports without going back to the parent dashboard.

2. **Raw sport code as tab label** — The sport tab label showed the raw database code (e.g. `gaa-football`) instead of a readable name (e.g. `GAA Football`).

---

## Root Causes

In `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx`:

**Issue 1** — Lines 272–278 hardcoded a single `<TabsTrigger value="primary">` regardless of how many sports the player plays. The `allPassports` query was already fetching all passports for cross-sport analysis but was never used to generate per-sport tabs.

**Issue 2** — Line 275 rendered `{playerData.sportCode || "Primary Sport"}` — the raw code with no formatting. Hyphens and underscores were not converted to spaces and words were not capitalised.

---

## Fix

**`apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx`**

1. Added `formatSportName` helper: replaces hyphens and underscores with spaces, capitalises each word — `gaa-football` → `GAA Football`.

2. Added `activeSportCode` derived from the `?sport=` URL param (or the first passport's code as a fallback).

3. Changed `<Tabs defaultValue="primary">` to `defaultValue={activeSportCode}` with an `onValueChange` handler that navigates to `?sport=<code>` when a sport tab is selected (so the page loads the correct passport data for that sport).

4. Replaced the single hardcoded `<TabsTrigger>` with a `.map()` over `allPassports` (active passports only), producing one tab per sport with a formatted label.

5. Changed `<TabsContent value="primary">` to `value={playerData.sportCode || activeSportCode}` so the content section matches the active sport tab value.

---

## Files Modified

| File | Change |
|---|---|
| `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx` | Add `formatSportName`, `activeSportCode`; map sport tabs from `allPassports`; fix tab label and content value |

---

## Testing

1. Log in as a parent with a child enrolled in two sports (e.g. Soccer + Rugby)
2. Open the child's passport — tabs should show **Soccer**, **Rugby**, and **Cross-Sport Analysis**
3. Click the Rugby tab — passport data updates to show rugby skills/goals/etc.
4. Verify tab labels show formatted names (e.g. `GAA Football`, not `gaa-football`)
5. Verify single-sport players are unaffected (no tabs shown, layout unchanged)
