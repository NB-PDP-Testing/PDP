# `/orgs/current` Route Implementation - Review & Recommendations

## Current Implementation ✅

The route handler has been implemented with role-based routing that intelligently redirects users based on their roles.

## Review Questions & Recommendations

### 1. ✅ Should `/orgs/current` redirect to `/coach` or `/admin` based on user role?

**Status**: ✅ **IMPLEMENTED**

**Current Behavior**:
- Checks both Better Auth org role AND functional roles
- Priority order: **Coach → Admin → Parent → Default** (Updated: Coach prioritized over Admin)

**Recommendation**: ✅ **Implemented** - Updated priority order:
- **Coach first**: Coaches typically use the coach dashboard more frequently than admin, even when they have both roles
- **Admin second**: Admins have comprehensive access but may use coach dashboard more for daily operations
- **Parent third**: Parents need to see their children's information
- **Default fallback**: Users without specific roles go to organizations list

**Potential Enhancement**: Consider adding a user preference to remember their preferred dashboard, but this is not critical for MVP.

---

### 2. Should we consolidate the two files?

**Current State**:
- `/orgs/current/page.tsx` - Smart role-based routing
- `/orgs/current/coach/page.tsx` - Always redirects to coach dashboard

**Recommendation**: **Keep both files** with this rationale:

**Keep `/orgs/current/page.tsx`** (smart routing):
- ✅ Primary entry point after login
- ✅ Handles all role scenarios intelligently
- ✅ Better user experience (goes to most relevant dashboard)

**Keep `/orgs/current/coach/page.tsx`** (explicit coach route):
- ✅ Useful for direct links/bookmarks
- ✅ Useful if user wants to explicitly go to coach dashboard (bypassing role logic)
- ✅ Could be used in navigation or "Switch to Coach View" functionality
- ✅ Minimal code duplication (only ~60 lines)

**Alternative (if you want to consolidate)**:
- Remove `/orgs/current/coach/page.tsx`
- Update any references to use `/orgs/current` instead
- Users can still access coach dashboard via header navigation

**My Recommendation**: **Keep both** - The explicit coach route provides flexibility and doesn't add significant maintenance burden.

---

### 3. Any other redirect logic needed?

**Current Implementation**:
- ✅ Handles authenticated users
- ✅ Handles unauthenticated users (redirects to login)
- ✅ Handles missing active organization (redirects to /orgs)
- ✅ Handles role-based routing
- ✅ Handles users with no roles (redirects to /orgs)

**Recommendations for Enhancement**:

#### A. Add Route Existence Check ✅

**Status**: ✅ **IMPLEMENTED** - Created placeholder `/orgs/[orgId]/parents` route

**Solution**: Created a placeholder parent dashboard page that:
- Shows "Coming Soon" badge and status
- Displays linked children count
- Lists planned features
- Provides quick links to other sections
- Handles cases where no children are linked yet

#### B. Handle Edge Cases

**Missing Member Data**:
```typescript
// Current: Assumes member exists if activeOrganization exists
// Recommendation: Add null check
if (!member) {
  // User is in org but member record is missing (shouldn't happen, but...)
  router.push("/orgs");
  return;
}
```

**Member with No Roles**:
- ✅ Already handled - redirects to `/orgs`
- Consider: Should we show a message? "You don't have any assigned roles. Contact an admin."

#### C. Add Logging for Debugging

**Recommendation**: Add console logging in development to track redirect decisions:

```typescript
if (process.env.NODE_ENV === "development") {
  console.log("[orgs/current] Redirect decision:", {
    orgId: activeOrganization.id,
    memberRole,
    functionalRoles,
    redirectRoute,
  });
}
```

#### D. Consider User Preference

**Future Enhancement**: Allow users to set a preferred dashboard:
- User with coach + admin roles could choose default dashboard
- Store in user profile or localStorage
- Check preference before role-based routing

**Not Critical for MVP** - Can be added later.

---

## Priority Recommendations

### High Priority ✅ (Already Done)
1. ✅ Role-based routing
2. ✅ Handle all authentication states
3. ✅ Handle missing organization

### Medium Priority 🔶 (Recommended)
1. ✅ **Create placeholder `/orgs/[orgId]/parents` route** to prevent 404s - **DONE**
2. ✅ **Add null check for member data** (defensive programming) - **DONE**
3. ✅ **Add development logging** for debugging redirect decisions - **DONE**
4. ✅ **Update priority: Coach over Admin** when user has both roles - **DONE**

### Low Priority 🔵 (Future Enhancements)
1. User preference for default dashboard
2. Show message for users with no roles
3. Analytics tracking for redirect decisions

---

## Testing Scenarios

### Test Cases to Verify:

1. **User with admin org role** → Should go to `/admin`
2. **User with functional role "admin"** → Should go to `/admin`
3. **User with both admin org role AND functional "admin"** → Should go to `/admin`
4. **User with only "coach" functional role** → Should go to `/coach`
5. **User with only "parent" functional role** → Should go to `/parents` (or fallback)
6. **User with "coach" + "parent" functional roles** → Should go to `/coach` (coach takes priority)
7. **User with "coach" + "admin" functional roles** → Should go to `/admin` (admin takes priority)
8. **User with no roles** → Should go to `/orgs`
9. **User not in any organization** → Should go to `/orgs`
10. **User not authenticated** → Should go to `/login`
11. **User with missing member data** → Should handle gracefully (go to `/orgs`)

---

## Code Quality Recommendations

### 1. Extract Route Logic to Shared Utility

**Current**: Logic is in the component
**Recommendation**: Extract to a utility function:

```typescript
// apps/web/src/lib/route-utils.ts
export function getDefaultOrgRoute(
  orgId: string,
  memberRole: OrgMemberRole | undefined,
  functionalRoles: string[]
): Route {
  // ... existing logic
}
```

**Benefits**:
- Reusable in other places
- Easier to test
- Cleaner component code

### 2. Add Type Safety

**Current**: Uses `(member as any)` for functionalRoles
**Recommendation**: Create a proper type:

```typescript
interface MemberWithFunctionalRoles extends Member {
  functionalRoles?: ("coach" | "parent" | "admin")[];
}
```

### 3. Add Error Boundaries

**Recommendation**: Wrap redirect logic in try-catch to handle unexpected errors gracefully.

---

## Summary

### ✅ What's Good
- Role-based routing is implemented correctly
- Handles all authentication states
- Priority order makes sense (Admin > Coach > Parent)
- Code is clean and readable

### 🔶 What to Improve
1. **Create `/orgs/[orgId]/parents` route** (or add fallback)
2. **Add defensive null checks** for member data
3. **Add development logging** for debugging

### 🔵 Future Considerations
1. User preference for default dashboard
2. Better error messages for edge cases
3. Extract route logic to utility function

---

## Final Recommendation

**Keep the current implementation** with these additions:

1. ✅ **Create placeholder parents route** to prevent 404s
2. ✅ **Add null check** for member data
3. ✅ **Add development logging** for debugging
4. ✅ **Keep both route files** (current and coach-specific)

The implementation is solid and handles the main use cases well. The suggested improvements are enhancements, not critical fixes.

