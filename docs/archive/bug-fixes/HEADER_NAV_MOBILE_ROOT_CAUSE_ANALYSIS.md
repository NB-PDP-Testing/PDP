# Header Navigation Mobile - Comprehensive Root Cause Analysis

**Date**: January 17, 2026
**Issue**: HOME & PLATFORM links missing on mobile for Platform Staff on /orgs and /platform routes
**Status**: 🔍 **ROOT CAUSE IDENTIFIED**

---

## User Requirement

**Platform Staff should ALWAYS see HOME & PLATFORM navigation links when on:**
- `/orgs` route (organization listing)
- `/platform` routes (platform management pages)

**Regardless of screen size** (mobile or desktop)

---

## Files Reviewed

### 1. Header Component
**File**: `/apps/web/src/components/header.tsx` (210 lines)
**Status**: ✅ Reviewed completely

### 2. Layout Files
**Files Reviewed**:
- `/apps/web/src/app/layout.tsx` (root layout) ✅
- `/apps/web/src/app/orgs/layout.tsx` (orgs layout) ✅
- `/apps/web/src/app/platform/layout.tsx` (platform layout) ✅

### 3. Page Files
**Files Reviewed**:
- `/apps/web/src/app/orgs/page.tsx` (organizations listing) ✅
- `/apps/web/src/app/platform/page.tsx` (platform dashboard) ✅

### 4. Feature Flags
**File**: `/apps/web/src/hooks/use-ux-feature-flags.ts` (405 lines) ✅

---

## Current Implementation Analysis

### /orgs Routes

**Layout**: `/apps/web/src/app/orgs/layout.tsx`
- **Line 80**: Renders `<Header />` component
- All /orgs routes use the standard Header component

**Header Component** (`/apps/web/src/components/header.tsx`):

**Lines 137-155** - HOME & PLATFORM links rendering:
```tsx
{(!useMinimalHeaderNav ||
  pathname?.startsWith("/platform") ||
  shouldHideOrgContent) && (
  <nav
    className={cn(
      "hidden items-center gap-4 text-lg sm:flex",  // ⚠️ ISSUE HERE
      headerTextStyle
    )}
  >
    <Link className="py-3" href="/">
      Home
    </Link>
    {user?.isPlatformStaff && (
      <Link className="py-3" href="/platform">
        Platform
      </Link>
    )}
  </nav>
)}
```

**Conditional Logic Evaluation for /orgs:**
- `pathname` = `/orgs`
- `shouldHideOrgContent` = `true` (line 71-76 defines this)
- `useMinimalHeaderNav` = `false` (default, unless feature flag enabled)
- **Result**: `(!false || false || true)` = `true` ✅ **Condition PASSES**

**CSS Classes**: `"hidden items-center gap-4 text-lg sm:flex"`
- `hidden` = display: none (all screen sizes)
- `sm:flex` = display: flex (≥ 640px only)

**Root Cause #1**: The `hidden sm:flex` classes cause the nav to be:
- **Mobile (< 640px)**: `display: none` ❌ **HIDDEN**
- **Desktop (≥ 640px)**: `display: flex` ✅ **VISIBLE**

---

### /platform Routes

**Layout**: `/apps/web/src/app/platform/layout.tsx`
- **Line 48**: Returns `{children}` only
- **Does NOT render `<Header />` component**

**Page**: `/apps/web/src/app/platform/page.tsx`
- **Lines 23-32**: Custom "Back to Home" button
- **No standard Header component**
- **No "Platform" link**

**Root Cause #2**: /platform routes don't use the standard Header component at all, so there's no HOME & PLATFORM navigation links like on /orgs routes.

---

## Evidence Summary

### Test 1: Desktop (≥ 640px)
**User Confirmed**: "I AM CAN SEE THEM ON A DESKTOP SIZED!"

**Analysis**:
- CSS class `sm:flex` applies → `display: flex`
- Links are visible ✅

### Test 2: Mobile (< 640px)
**User Confirmed**: "I AM TESTIGN ON A MOBILE SIZED SCREEN"

**Analysis**:
- CSS class `hidden` applies → `display: none`
- Links are NOT visible ❌

### Test 3: Conditional Logic
**For /orgs route**:
- `shouldHideOrgContent` = `true` (is orgs listing page)
- Conditional: `(!useMinimalHeaderNav || pathname?.startsWith("/platform") || shouldHideOrgContent)`
- **Result**: `true` ✅ Nav should render

**For /platform routes**:
- Header component not used at all
- Custom navigation only

---

## Root Causes Identified

### Root Cause #1: Mobile CSS Hiding (Critical)

**Location**: `/apps/web/src/components/header.tsx` Line 142

**Issue**: The navigation containing HOME & PLATFORM links has CSS class `hidden sm:flex` which hides it on mobile screens (< 640px).

**Impact**:
- Platform staff on mobile cannot see HOME or PLATFORM links on /orgs routes
- Must use browser back button or type URLs manually
- Poor user experience for mobile users

**Severity**: **HIGH** - Breaks navigation for platform staff on mobile

---

### Root Cause #2: /platform Routes Missing Standard Header (Medium)

**Location**: `/apps/web/src/app/platform/layout.tsx`

**Issue**: Platform routes don't render the standard `<Header />` component. Instead, they have custom navigation on each page (e.g., "Back to Home" button on dashboard).

**Impact**:
- Inconsistent navigation between /orgs and /platform
- No "Platform" link to navigate within platform section
- Different UX pattern for platform staff

**Severity**: **MEDIUM** - Functional but inconsistent UX

---

## Additional Findings

### Feature Flag: `useMinimalHeaderNav`

**Location**: `/apps/web/src/hooks/use-ux-feature-flags.ts` Line 270

**Purpose**: "Hide header nav links (Home, Platform, Coach, Parent, Admin) - users should use the switcher"

**Current Behavior**:
- When enabled, hides nav links EXCEPT on `/platform` routes and `/orgs` listing/join/create pages
- **Default**: `false` (disabled) unless explicitly enabled in PostHog

**Analysis**: This flag is NOT the issue. The conditional logic correctly includes `/orgs` in the exception list via `shouldHideOrgContent`.

---

### Conditional Logic Analysis

**Lines 137-139**:
```tsx
{(!useMinimalHeaderNav ||
  pathname?.startsWith("/platform") ||
  shouldHideOrgContent) && (
```

**Truth Table**:

| Route | `useMinimalHeaderNav` | `pathname?.startsWith("/platform")` | `shouldHideOrgContent` | Condition Result |
|-------|-----------------------|-------------------------------------|----------------------|------------------|
| `/orgs` | `false` (default) | `false` | `true` | `(!false \|\| false \|\| true)` = **true** ✅ |
| `/orgs` | `true` (enabled) | `false` | `true` | `(!true \|\| false \|\| true)` = **true** ✅ |
| `/platform` | `false` | `true` | `false` | `(!false \|\| true \|\| false)` = **true** ✅ |
| `/platform` | `true` | `true` | `false` | `(!true \|\| true \|\| false)` = **true** ✅ |

**Conclusion**: The conditional logic is **CORRECT**. The issue is purely the CSS `hidden sm:flex` classes hiding on mobile.

---

## Fix Plan

### Fix #1: Remove Mobile Hiding for /orgs and /platform Routes (Critical - REQUIRED)

**File**: `/apps/web/src/components/header.tsx`
**Line**: 142

**Current**:
```tsx
<nav
  className={cn(
    "hidden items-center gap-4 text-lg sm:flex",
    headerTextStyle
  )}
>
```

**Proposed Solution A - Show on All Screen Sizes for These Routes**:
```tsx
<nav
  className={cn(
    // Always visible on /orgs and /platform routes
    pathname === "/orgs" || pathname === "/orgs/" || pathname?.startsWith("/platform")
      ? "flex items-center gap-2 text-sm sm:gap-4 sm:text-lg"
      : "hidden items-center gap-4 text-lg sm:flex",
    headerTextStyle
  )}
>
```

**Rationale**:
- Platform staff on /orgs and /platform routes see HOME & PLATFORM links on all screen sizes
- Mobile gets smaller text (text-sm) and tighter gap (gap-2) for space efficiency
- Other routes maintain current behavior (hidden on mobile)

**Alternative Solution B - Always Show for Platform Staff**:
```tsx
<nav
  className={cn(
    user?.isPlatformStaff
      ? "flex items-center gap-2 text-sm sm:gap-4 sm:text-lg"
      : "hidden items-center gap-4 text-lg sm:flex",
    headerTextStyle
  )}
>
```

**Rationale**:
- Platform staff always see HOME & PLATFORM links regardless of route or screen size
- Simpler logic
- Ensures platform staff can always navigate

**Recommendation**: **Solution B** - Simpler, covers all cases for platform staff

---

### Fix #2: Add Standard Header to /platform Routes (Optional - Nice to Have)

**File**: `/apps/web/src/app/platform/layout.tsx`
**Line**: 48

**Current**:
```tsx
return <>{children}</>;
```

**Proposed**:
```tsx
import Header from "@/components/header";

// ...

return (
  <>
    <Header />
    {children}
  </>
);
```

**Rationale**:
- Consistent navigation across all platform staff routes
- HOME & PLATFORM links available on all /platform pages
- Standard UX pattern matching /orgs routes

**Trade-off**:
- /platform/page.tsx has custom "Back to Home" button (lines 23-32) which would be redundant
- Could remove custom button after adding Header

**Recommendation**: Implement this for consistency, remove custom navigation buttons from individual pages

---

## Implementation Steps

### Step 1: Fix Mobile Hiding (Critical)

1. Edit `/apps/web/src/components/header.tsx`
2. Update line 142 CSS classes to show on mobile for platform staff
3. Use **Solution B** (always show for platform staff)
4. Test on mobile and desktop

### Step 2: Add Header to /platform (Optional)

1. Edit `/apps/web/src/app/platform/layout.tsx`
2. Import and render `<Header />` component
3. Remove custom "Back to Home" buttons from platform pages
4. Test navigation consistency

### Step 3: Verify

1. Login as platform staff
2. Navigate to `/orgs` on mobile - verify HOME & PLATFORM links visible
3. Navigate to `/platform` on mobile - verify Header renders (if Step 2 implemented)
4. Verify desktop still works correctly
5. Verify non-platform-staff users don't see changes

---

## Testing Checklist

### Platform Staff User

**Mobile (< 640px)**:
- [ ] Navigate to `/orgs` - HOME link visible
- [ ] Navigate to `/orgs` - PLATFORM link visible
- [ ] Navigate to `/platform` - Header visible (if Fix #2 implemented)
- [ ] Links are tappable (adequate touch targets)
- [ ] Text readable (size appropriate for mobile)

**Desktop (≥ 640px)**:
- [ ] Navigate to `/orgs` - HOME link visible
- [ ] Navigate to `/orgs` - PLATFORM link visible
- [ ] Navigate to `/platform` - Header visible (if Fix #2 implemented)
- [ ] Layout looks professional (not cramped)

### Non-Platform Staff User

**All Screen Sizes**:
- [ ] HOME link visible on /orgs
- [ ] PLATFORM link NOT visible (user is not platform staff)
- [ ] No access to /platform routes (existing guard works)

---

## Risk Assessment

### Risk #1: Layout Shift on Mobile

**Issue**: Adding visible nav links on mobile might cause layout shift or overflow

**Mitigation**: Use smaller text (text-sm) and tighter gap (gap-2) on mobile

**Severity**: Low

### Risk #2: Breaking Other Routes

**Issue**: Changing CSS classes might affect other routes unexpectedly

**Mitigation**: Use conditional CSS based on `user?.isPlatformStaff` check

**Severity**: Very Low (isolated change)

### Risk #3: Feature Flag Interaction

**Issue**: `useMinimalHeaderNav` flag might conflict with new behavior

**Mitigation**: Our fix applies regardless of flag state for platform staff

**Severity**: None (logic is independent)

---

## Recommendation

**Priority**: **CRITICAL**

**Implement**: **Fix #1 - Solution B** (Always show for platform staff)

**Timeline**: Immediate

**Rationale**:
- Restores critical navigation for platform staff on mobile
- Simple, low-risk change
- No dependencies
- Improves UX immediately

**Optional**: Implement Fix #2 for consistency after Fix #1 is verified

---

## Status

✅ **Root cause identified with evidence**
✅ **Fix plan created and validated**
✅ **Ready for implementation**

