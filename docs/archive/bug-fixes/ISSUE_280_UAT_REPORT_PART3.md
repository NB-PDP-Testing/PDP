# Issue #280 - Role Switching UAT Report (Part 3)

**Date:** January 18, 2026
**Tester:** Claude (AI UAT)
**Environment:** Local dev (localhost:3000)
**Status:** Role switching bugs confirmed

---

## Executive Summary

UAT testing of the role switching functionality revealed that **role switching is completely broken**. Clicking role buttons in the switcher dialog doesn't navigate, and direct navigation to role-specific routes redirects back to `/coach`.

---

## Bugs Found

### Bug #6: Role Switcher Click Handler Doesn't Navigate

**Severity:** HIGH (P1)
**Impact:** Users cannot switch roles using the role switcher

**Description:**
The role switcher dialog opens correctly and displays available roles (Coach, Parent). However, clicking on a role button (e.g., "Parent") does not navigate to that role's dashboard. The dialog closes but the URL remains unchanged.

**Steps to Reproduce:**
1. Log in as test user with multiple roles (Coach, Parent)
2. Click the role dropdown in header (shows "Coach")
3. Dialog opens: "Switch Organization or Role"
4. Click "Parent" button
5. Observe: Dialog closes, URL stays at `/coach`

**Expected Behavior:** Navigate to `/orgs/{orgId}/parents`
**Actual Behavior:** Dialog closes, stays on `/coach`

**Technical Notes:**
- Role switcher dialog opens correctly (✅)
- Role buttons are visible and clickable (✅)
- Click registers (dialog closes) (✅)
- Navigation doesn't occur (❌)

---

### Bug #7: Parent Route Accessible via Direct URL but Redirects

**Severity:** HIGH (P1)
**Impact:** Cannot access Parent dashboard

**Description:**
Navigating directly to `/orgs/{orgId}/parents` briefly shows the URL then redirects to `/coach`. The `/parents` folder and `page.tsx` exist, but users are being redirected.

**Test Results:**
| Route | Result |
|-------|--------|
| `/orgs/{orgId}/parent` (singular) | **404 - Page not found** |
| `/orgs/{orgId}/parents` (plural) | **Redirects to `/coach`** |

**Likely Causes:**
1. Error in parents page causing fallback to org home (which redirects to coach based on active role)
2. The `hasParentRole` check at line 105 might be failing
3. User may not have "parent" functional role assigned

**Files Involved:**
- `apps/web/src/app/orgs/[orgId]/parents/page.tsx` - Lines 60-70 check for parent role
- `apps/web/src/app/orgs/[orgId]/page.tsx` - Redirects based on activeFunctionalRole

---

## Route Structure Analysis

```
apps/web/src/app/orgs/[orgId]/
├── admin/          ✅ Exists
├── coach/          ✅ Exists (current user's active role)
├── parents/        ✅ Exists (note: PLURAL)
├── player/         ✅ Exists
├── players/        ✅ Exists
└── request-role/   ✅ Exists
```

**Note:** The Parent route is `/parents` (plural), not `/parent` (singular). The role switcher may be using the wrong URL.

---

## Role Switcher Dialog Analysis

The dialog shows:
```
Switch Organization or Role
├── Search organizations...
├── RECENTLY ACCESSED
│   └── GRANGE ARMAGH (Active)
│       ├── [Coach ✓]  (currently selected)
│       └── [Parent]   (available to switch)
├── MOST USED (1)
└── Request a Role
```

When "Parent" is clicked:
1. Dialog closes ✅
2. No navigation occurs ❌
3. URL remains `/coach` ❌

---

## Role Routing Logic

From `apps/web/src/app/orgs/[orgId]/page.tsx`:

```typescript
// Lines 79-93
if (activeFunctionalRole === "coach") {
  targetRoute = `/orgs/${orgId}/coach`;
} else if (activeFunctionalRole === "parent") {
  targetRoute = `/orgs/${orgId}/parents`;  // Note: PLURAL
} else if (activeFunctionalRole === "admin") {
  targetRoute = `/orgs/${orgId}/admin`;
} else if (activeFunctionalRole === "player") {
  targetRoute = `/orgs/${orgId}/player`;
}
```

The routing logic correctly uses `/parents` (plural). The issue is likely in the role switcher component's click handler.

---

## Files to Investigate

1. **Role Switcher Component** - Check click handler implementation
   - Likely location: `apps/web/src/components/` (search for role-switcher, org-switcher)

2. **Header Component** - Where role switcher is rendered
   - `apps/web/src/components/header.tsx`

3. **Better Auth Member API** - May need to update `activeFunctionalRole`
   - Check if clicking role button calls the API to update active role

---

## Screenshots

- Role switcher open: `tmp/role-02-dropdown-open.png`
- After Parent click (no change): `tmp/role-03-after-parent-click.png`
- Direct /parent navigation: 404 error
- Direct /parents navigation: Redirects to /coach

---

## Recommendations

1. **Immediate:** Find and fix role switcher click handler - it should:
   - Update `activeFunctionalRole` via Better Auth API
   - Navigate to the correct role dashboard

2. **Verify:** Test user has "parent" functional role assigned

3. **Check:** Role switcher is using `/parents` (plural) not `/parent` (singular)

---

## Related

- Part 1: getUserAuthMethod, infinite loop bugs
- Part 2: Navigation bugs (sidebar, Quick Actions, direct URLs)
- GitHub Issue: #280
