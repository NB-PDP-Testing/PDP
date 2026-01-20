# Issue #280 - Navigation Buttons UAT Report (Part 2)

**Date:** January 18, 2026
**Tester:** Claude (AI UAT)
**Environment:** Local dev (localhost:3000)
**Status:** Multiple navigation bugs confirmed

---

## Executive Summary

After the initial bugs were fixed, continued UAT testing revealed **critical navigation issues** affecting the Coach Dashboard. Both sidebar navigation and Quick Actions menu items fail to navigate, and direct URL navigation to sub-routes redirects back to the main coach page.

---

## Bugs Found

### Bug #3: Sidebar Navigation Links Don't Work

**Severity:** HIGH (P1)
**Impact:** Users cannot navigate using the sidebar

**Description:**
Clicking sidebar links (My Players, Assessments, Shared Passports) does not navigate to the corresponding pages. The click is registered but no navigation occurs.

**Steps to Reproduce:**
1. Log in and navigate to Coach Dashboard
2. Click "My Players" in the sidebar
3. Observe that URL remains `/coach` instead of changing to `/coach/players`
4. Sidebar still shows "Overview" as selected

**Expected Behavior:** Navigate to `/coach/players`
**Actual Behavior:** Stays on `/coach`

**Affected Links:**
- My Players → `/coach/players` ❌
- Assessments → `/coach/assess` ❌
- Shared Passports → `/coach/shared-passports` ❌

---

### Bug #4: Quick Actions Menu Items Don't Navigate

**Severity:** HIGH (P1)
**Impact:** Quick Actions feature is non-functional

**Description:**
The Quick Actions popover opens correctly, but clicking menu items (Assess Players, View Analytics, etc.) does not navigate to the corresponding pages. The popover closes but navigation doesn't occur.

**Steps to Reproduce:**
1. Log in and navigate to Coach Dashboard
2. Click "Quick Actions" button (works - popover opens)
3. Click "Assess Players" in the popover
4. Observe that popover closes but URL remains `/coach`

**Expected Behavior:** Navigate to assessment page
**Actual Behavior:** Popover closes, stays on `/coach`

---

### Bug #5: Direct URL Navigation Redirects to /coach

**Severity:** CRITICAL (P0)
**Impact:** Routes may be broken or missing

**Description:**
Even direct browser navigation to sub-routes redirects back to `/coach`. This indicates either:
1. Routes don't exist
2. Middleware is redirecting
3. Auth/permission check failing

**Test Results:**
| Route | Expected | Actual | Status |
|-------|----------|--------|--------|
| `/coach/players` | Stay on `/coach/players` | Redirects to `/coach` | ❌ FAIL |
| `/coach/assess` | Stay on `/coach/assess` | Redirects to `/coach` | ❌ FAIL |
| `/coach/shared-passports` | Stay on `/coach/shared-passports` | Redirects to `/coach` | ❌ FAIL |

---

## What Works

| Feature | Status |
|---------|--------|
| Login | ✅ Works |
| Coach Dashboard loads | ✅ Works |
| Sidebar displays correctly | ✅ Works |
| Quick Actions popover opens | ✅ Works |
| Dashboard stats display | ✅ Works |
| Team card displays | ✅ Works |
| Role switcher in header | ✅ Visible |
| User profile menu | ✅ Visible |

---

## Root Cause Analysis

The navigation failures are likely caused by one of:

1. **Missing Route Files:**
   - Check if `apps/web/src/app/orgs/[orgId]/coach/players/page.tsx` exists
   - Check if `apps/web/src/app/orgs/[orgId]/coach/assess/page.tsx` exists
   - Check if `apps/web/src/app/orgs/[orgId]/coach/shared-passports/page.tsx` exists

2. **Layout Redirect Logic:**
   - Check `apps/web/src/app/orgs/[orgId]/coach/layout.tsx` for redirects
   - May have auth/permission check that's failing

3. **Link Component Issues:**
   - Check if sidebar uses Next.js `<Link>` component correctly
   - Check if onClick handlers are intercepting navigation

4. **Quick Actions Configuration:**
   - Check Quick Actions component for navigation handlers
   - Verify router.push or Link usage

---

## Files to Investigate

1. `apps/web/src/app/orgs/[orgId]/coach/layout.tsx` - Layout/redirect logic
2. `apps/web/src/app/orgs/[orgId]/coach/players/page.tsx` - Route existence
3. `apps/web/src/components/coach/coach-sidebar.tsx` - Sidebar navigation
4. `apps/web/src/components/coach/quick-actions.tsx` - Quick actions menu
5. Any middleware files handling route protection

---

## Screenshots

- Dashboard loaded correctly: `tmp/uat-04-dashboard-loaded.png`
- Quick Actions opens: `tmp/uat-22-quick-actions-open.png`
- After sidebar click (no change): `tmp/uat-17-my-players-result.png`
- After Quick Actions click (no change): `tmp/uat-26-assess-result.png`
- Direct URL nav shows loading then redirects: `tmp/uat-direct-my-players.png`

---

## Recommendations

1. **Immediate:** Verify route files exist in `apps/web/src/app/orgs/[orgId]/coach/`
2. **Immediate:** Check layout.tsx for unexpected redirects
3. **Immediate:** Verify Link components use correct href patterns
4. **Test:** After fixes, re-run full navigation UAT

---

## Related

- Previous bugs in Part 1: getUserAuthMethod, infinite loop
- GitHub Issue: #280
- Recent stash integration work
