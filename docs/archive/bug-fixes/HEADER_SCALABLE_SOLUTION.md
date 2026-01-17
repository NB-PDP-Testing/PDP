# Header Scalable Solution - Platform vs Organization Context

**Date**: January 17, 2026
**Status**: ✅ **DESIGN COMPLETE**

---

## User Requirements

Based on user feedback:

1. ❌ **NO org logo** on `/orgs` and `/platform` routes
2. ❌ **NO role switcher** on `/orgs` and `/platform` routes
3. ✅ **Clean, scalable approach** that clearly separates platform-level vs org-specific contexts

---

## Desired Headers

### Platform-Level Routes (/orgs, /platform)
```
[HOME] [PLATFORM]                    [UserMenu] [ModeToggle]
```

**Clean and minimal**: Navigation links + user controls only.

### Organization-Specific Routes (/orgs/[orgId]/...)
```
[HOME] [PLATFORM] [Org Logo + Name] [Coach] [Parent] [Admin]     [OrgRoleSwitcher] [UserMenu] [ModeToggle]
```

**Full context**: Org branding + functional role navigation + context switcher.

---

## Scalable Design Pattern

### Concept: Route Context Detection

Define two clear route contexts:

1. **Platform-Level Context**: User is navigating platform-wide features
   - `/orgs` (organization listing)
   - `/orgs/join` (joining an organization)
   - `/orgs/create` (creating an organization)
   - `/platform` (platform management - all subroutes)

2. **Organization-Specific Context**: User is working within a specific organization
   - `/orgs/[orgId]/coach`
   - `/orgs/[orgId]/admin`
   - `/orgs/[orgId]/parents`
   - etc.

---

## Implementation Strategy

### Step 1: Centralize Context Detection

Create a single source of truth for route context:

```tsx
// Detect platform-level routes (no org-specific context)
const isPlatformLevelRoute =
  pathname === "/orgs" ||
  pathname === "/orgs/" ||
  pathname?.startsWith("/orgs/join") ||
  pathname === "/orgs/create" ||
  pathname?.startsWith("/platform");
```

**Rationale**:
- Single variable = easy to maintain
- Easy to add new platform-level routes
- Semantic name makes code self-documenting

---

### Step 2: Apply Context-Based Rendering

Use `isPlatformLevelRoute` to drive ALL conditional rendering:

```tsx
{/* HOME & PLATFORM navigation - Always show on platform-level routes */}
{(!useMinimalHeaderNav || isPlatformLevelRoute) && (
  <nav className={cn(
    isPlatformLevelRoute
      ? "flex items-center gap-2 text-sm sm:gap-4 sm:text-lg"
      : "hidden items-center gap-4 text-lg sm:flex",
    headerTextStyle
  )}>
    <Link className="py-3" href="/">Home</Link>
    {user?.isPlatformStaff && (
      <Link className="py-3" href="/platform">Platform</Link>
    )}
  </nav>
)}

{/* Org-specific content - ONLY show when NOT on platform-level routes */}
{org && !isPlatformLevelRoute && (
  <>
    <Link href={`/orgs/${orgId}` as Route}>
      {/* Org logo and name */}
    </Link>
    {!(useMinimalHeaderNav || isMemberPending) && validMember && (
      <OrgNav member={validMember} />
    )}
  </>
)}

{/* OrgRoleSwitcher - ONLY show when NOT on platform-level routes */}
{!isPlatformLevelRoute && <OrgRoleSwitcher />}
```

---

### Step 3: Clean Header Background Logic

Simplify header background styling:

```tsx
// Platform-level routes always use PDP brand navy
// Org-specific routes use org theme primary color
const headerBackgroundStyle = isPlatformLevelRoute
  ? { backgroundColor: "#1E3A5F" }  // PDP brand navy
  : { backgroundColor: theme.primary };  // Org primary color
```

**Benefit**: Clear visual distinction between platform and org contexts.

---

## Code Changes Required

### File: `/apps/web/src/components/header.tsx`

**Changes**:

1. **Line ~71-76**: Add `isPlatformLevelRoute` detection
2. **Line ~105-111**: Simplify background logic using `isPlatformLevelRoute`
3. **Line ~137-160**: Update nav rendering to use `isPlatformLevelRoute`
4. **Line ~163-191**: Update org content to check `!isPlatformLevelRoute`
5. **Line ~199**: Update OrgRoleSwitcher to check `!isPlatformLevelRoute`

**Deprecate**: `shouldHideOrgContent` variable (replace with semantic `isPlatformLevelRoute`)

---

## Benefits

### 1. Clear Separation of Concerns
- Platform-level routes have platform-level UI
- Org-specific routes have org-specific UI
- No ambiguity about context

### 2. Scalability
- Adding a new platform-level route? Add one line to the check.
- Easy to understand and maintain
- Self-documenting code (`isPlatformLevelRoute` is clear)

### 3. Consistency
- All platform-level routes have identical headers
- Predictable UX for users
- Reduces cognitive load

### 4. Reduced Complexity
- Single variable controls all conditional logic
- No multiple overlapping conditions
- Fewer edge cases to test

---

## Visual Comparison

### Before (Current - Confusing)

**On /platform:**
```
[HOME] [PLATFORM] [Dublin GAA Logo + Name]     [OrgRoleSwitcher] [UserMenu] [ModeToggle]
```
❌ Org branding on platform page (wrong context)
❌ OrgRoleSwitcher unnecessary (no org context)

### After (Proposed - Clean)

**On /platform:**
```
[HOME] [PLATFORM]                    [UserMenu] [ModeToggle]
```
✅ Clean, platform-level context
✅ No org-specific elements
✅ Consistent with /orgs listing page

**On /orgs:**
```
[HOME] [PLATFORM]                    [UserMenu] [ModeToggle]
```
✅ Clean, platform-level context
✅ Users browse orgs, then select one

**On /orgs/[orgId]/coach:**
```
[HOME] [PLATFORM] [Dublin GAA Logo] [Coach] [Parent] [Admin]     [OrgRoleSwitcher] [UserMenu] [ModeToggle]
```
✅ Full org context
✅ OrgRoleSwitcher for switching orgs/roles
✅ Org branding visible

---

## Edge Cases Handled

### Case 1: User with No Organizations
**Route**: `/orgs`
**Behavior**: Platform-level header shows, no org content
**Result**: ✅ Correct

### Case 2: Platform Staff on /platform
**Route**: `/platform`
**Behavior**: HOME and PLATFORM links show, no org branding
**Result**: ✅ Correct

### Case 3: User Navigating from /orgs to /orgs/[orgId]/coach
**Behavior**: Header changes from minimal platform UI to full org UI
**Result**: ✅ Clear visual transition showing context change

### Case 4: Feature Flag `useMinimalHeaderNav` Enabled
**Behavior**: Still shows HOME/PLATFORM on platform-level routes (exception preserved)
**Result**: ✅ Correct

---

## Testing Checklist

### Platform-Level Routes

**On /orgs:**
- [ ] HOME link visible (mobile & desktop)
- [ ] PLATFORM link visible (platform staff only)
- [ ] NO org logo
- [ ] NO OrgRoleSwitcher
- [ ] PDP brand navy background (#1E3A5F)

**On /platform:**
- [ ] HOME link visible (mobile & desktop)
- [ ] PLATFORM link visible
- [ ] NO org logo
- [ ] NO OrgRoleSwitcher
- [ ] PDP brand navy background (#1E3A5F)

**On /orgs/join:**
- [ ] Minimal header (same as /orgs)
- [ ] No org-specific content

**On /orgs/create:**
- [ ] Minimal header (same as /orgs)
- [ ] No org-specific content

### Organization-Specific Routes

**On /orgs/[orgId]/coach:**
- [ ] HOME and PLATFORM links visible (desktop)
- [ ] Org logo and name visible
- [ ] Functional role links (Coach, Parent, Admin based on permissions)
- [ ] OrgRoleSwitcher visible
- [ ] Org primary color background

**On /orgs/[orgId]/admin:**
- [ ] Same as coach route
- [ ] Admin link highlighted (if applicable)

---

## Migration Notes

### What Changes
- `shouldHideOrgContent` → `isPlatformLevelRoute` (semantic rename)
- Org logo/OrgRoleSwitcher now hide on `/platform` routes
- Header background logic simplified

### What Stays the Same
- Feature flag `useMinimalHeaderNav` still works
- Auth page header (minimal with ModeToggle)
- Landing page header (null, uses FloatingHeader)
- Org-specific page headers unchanged

### Rollback Safety
- Changes are localized to header.tsx
- No schema changes
- No backend changes
- Can revert with git if needed

---

## Implementation Summary

**One variable to rule them all**: `isPlatformLevelRoute`

This single variable controls:
1. ✅ Navigation visibility (show on mobile for platform routes)
2. ✅ Org logo visibility (hide on platform routes)
3. ✅ OrgRoleSwitcher visibility (hide on platform routes)
4. ✅ Header background color (PDP navy for platform, org color for org routes)

**Clean, scalable, maintainable.**

---

## Status

✅ **Design complete, ready for implementation**
