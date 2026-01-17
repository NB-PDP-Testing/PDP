# Header Assessment - /orgs and /platform Routes

**Date**: January 17, 2026
**Status**: 🔍 **ASSESSMENT COMPLETE**

---

## Current Behavior Analysis

### /orgs Route (Organizations Listing)

**Context**: Platform-level page showing all organizations the user is a member of.

**What Currently Renders**:

| Element | Renders? | Logic | Correct? |
|---------|----------|-------|----------|
| HOME link | ✅ Yes | `shouldHideOrgContent = true` → exception shows nav | ✅ Correct |
| PLATFORM link | ✅ Yes | Same logic, platform staff only | ✅ Correct |
| Org Logo/Name | ❌ No | `{org && !shouldHideOrgContent}` = false | ✅ Correct (no specific org context) |
| OrgRoleSwitcher | ❌ No | `{!shouldHideOrgContent}` = false | ❓ **Question: Should it show?** |
| UserMenu/ModeToggle | ✅ Yes | Always shows | ✅ Correct |

**Current Layout on /orgs**:
```
[HOME] [PLATFORM]                    [UserMenu] [ModeToggle]
```

**Potential Issue**:
- No OrgRoleSwitcher on /orgs route
- User has no quick way to switch to a specific org from the listing page
- They must click into an org card to access that org

---

### /platform Routes (Platform Management)

**Context**: Platform-level pages for platform staff to manage system-wide settings.

**What Currently Renders**:

| Element | Renders? | Logic | Correct? |
|---------|----------|-------|----------|
| HOME link | ✅ Yes | `pathname.startsWith("/platform")` → exception | ✅ Correct |
| PLATFORM link | ✅ Yes | Same logic, platform staff only | ✅ Correct |
| Org Logo/Name | ✅ Yes | `{org && !shouldHideOrgContent}` = true if user has active org | ❌ **WRONG - Confusing** |
| OrgRoleSwitcher | ✅ Yes | `{!shouldHideOrgContent}` = true | ✅ Correct (user said they like it) |
| UserMenu/ModeToggle | ✅ Yes | Always shows | ✅ Correct |

**Current Layout on /platform**:
```
[HOME] [PLATFORM] [Dublin GAA Logo + Name]     [OrgRoleSwitcher] [UserMenu] [ModeToggle]
```

**Problem**:
- Org logo/name appears on platform routes even though platform is org-agnostic
- Confusing UX - user is in platform management, not organization context
- The org logo is whatever their "active org" is (from Better Auth state)
- OrgRoleSwitcher is good - allows jumping back to org context

---

## Code Analysis

### Key Variables (header.tsx)

```tsx
// Line 71-76
const isOrgsListingPage = pathname === "/orgs" || pathname === "/orgs/";
const isOrgsJoinPage = pathname === "/orgs/join" || pathname?.startsWith("/orgs/join/");
const isOrgsCreatePage = pathname === "/orgs/create";
const shouldHideOrgContent =
  isOrgsListingPage || isOrgsJoinPage || isOrgsCreatePage;
```

**Purpose**: `shouldHideOrgContent` was designed for pages where user isn't in a specific org context (listing, joining, creating).

**Issue**: `/platform` routes are NOT included in `shouldHideOrgContent`, so org-specific content renders.

---

### Truth Table

| Route | `shouldHideOrgContent` | Org Logo Shows? | OrgRoleSwitcher Shows? |
|-------|------------------------|-----------------|------------------------|
| `/orgs` | `true` | ❌ No | ❌ No |
| `/orgs/join` | `true` | ❌ No | ❌ No |
| `/orgs/create` | `true` | ❌ No | ❌ No |
| `/platform` | `false` | ✅ Yes (if org exists) | ✅ Yes |
| `/platform/sports` | `false` | ✅ Yes (if org exists) | ✅ Yes |
| `/orgs/[orgId]/coach` | `false` | ✅ Yes | ✅ Yes |

---

## User Requirements

From conversation:
1. ✅ HOME and PLATFORM links on mobile and desktop for platform staff on /orgs and /platform (DONE)
2. ❓ "love that the role switcher is there on the platform route" (keep OrgRoleSwitcher on /platform)
3. ❌ "logo etc is being pulled across?" (org logo should NOT show on /platform)
4. ❓ "might be cleaner to just have the home platform buttons?" (simplify /platform header)

---

## Proposed Solutions

### Option 1: Hide Org Content on Platform Routes (Recommended)

**Change**: Add `/platform` to the list of routes that should hide org-specific content, but explicitly show OrgRoleSwitcher.

**Code Change**:
```tsx
// Add isPlatformRoute check
const isPlatformRoute = pathname?.startsWith("/platform");

// Update shouldHideOrgContent logic (or create separate variable)
const shouldHideOrgLogo =
  isOrgsListingPage || isOrgsJoinPage || isOrgsCreatePage || isPlatformRoute;

// Line 163: Hide org logo on platform routes
{org && !shouldHideOrgLogo && (
  <>
    <Link href={`/orgs/${orgId}` as Route}>
      {/* Org logo */}
    </Link>
    {/* OrgNav */}
  </>
)}

// Line 199: Show OrgRoleSwitcher on platform routes
{(!shouldHideOrgContent || isPlatformRoute) && <OrgRoleSwitcher />}
```

**Result**:
- `/platform` header: `[HOME] [PLATFORM]                    [OrgRoleSwitcher] [UserMenu]`
- Clean, platform-level context
- OrgRoleSwitcher available for jumping to org context

---

### Option 2: Show OrgRoleSwitcher on All Non-Org Pages

**Change**: Show OrgRoleSwitcher on `/orgs` too, not just org-specific pages.

**Code Change**:
```tsx
// Line 199: Always show OrgRoleSwitcher (except join/create where user isn't a member)
{!(isOrgsJoinPage || isOrgsCreatePage) && <OrgRoleSwitcher />}
```

**Result**:
- `/orgs` header: `[HOME] [PLATFORM]                    [OrgRoleSwitcher] [UserMenu]`
- `/platform` header: `[HOME] [PLATFORM]                    [OrgRoleSwitcher] [UserMenu]`
- Consistent UX across both platform-level routes
- Still hide org logo (need Option 1 change for that)

---

### Option 3: Minimal Platform Header (Simplest)

**Change**: Create completely separate header logic for platform routes.

**Code Change**:
```tsx
const isPlatformRoute = pathname?.startsWith("/platform");

// Early return for platform routes
if (isPlatformRoute) {
  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1"
           style={{ backgroundColor: "#1E3A5F" }}>
        <nav className="flex items-center gap-2 text-sm text-white sm:gap-4 sm:text-lg">
          <Link className="py-3" href="/">Home</Link>
          <Link className="py-3" href="/platform">Platform</Link>
        </nav>
        <div className="flex items-center gap-2">
          <OrgRoleSwitcher />
          <UserMenu />
          <ModeToggle />
        </div>
      </div>
      <hr />
    </div>
  );
}
```

**Result**:
- Clean, minimal platform header
- No org branding confusion
- Keep OrgRoleSwitcher for navigation
- Separate logic = easier to maintain

---

## Recommendation

**Implement Option 1 + Option 2 together**:

1. Hide org logo on `/platform` routes (confusing, wrong context)
2. Show OrgRoleSwitcher on both `/orgs` and `/platform` (useful for navigation)
3. Keep HOME and PLATFORM links on both routes (already done)

**Final Headers**:

```
/orgs:
[HOME] [PLATFORM]                    [OrgRoleSwitcher] [UserMenu] [ModeToggle]

/platform:
[HOME] [PLATFORM]                    [OrgRoleSwitcher] [UserMenu] [ModeToggle]

/orgs/[orgId]/coach:
[HOME] [PLATFORM] [Org Logo + Name] [Coach] [Parent] [Admin]     [OrgRoleSwitcher] [UserMenu] [ModeToggle]
```

**Benefits**:
- ✅ Consistent platform-level headers (/orgs and /platform)
- ✅ No confusing org branding on platform pages
- ✅ OrgRoleSwitcher available for quick navigation
- ✅ Clear visual distinction: platform pages vs org pages

---

## Questions for User

1. Should OrgRoleSwitcher show on `/orgs` route too? (Currently hidden)
2. Confirm: Hide org logo completely from `/platform` routes?
3. Preference: Option 1+2 (recommended) or Option 3 (completely separate platform header)?

---

## Status

🔍 **Assessment complete, awaiting user direction**
