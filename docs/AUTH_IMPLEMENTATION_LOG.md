# Authentication Implementation Log

This document tracks the implementation progress and updates made based on the [COMPREHENSIVE_AUTH_PLAN.md](./COMPREHENSIVE_AUTH_PLAN.md).

---

## Implementation Timeline

### December 17, 2025

#### Step 17: Role Switcher & Active Role Management - COMPLETED

**Commit:** `a65a6d8` - feat: fix role switching and add schema fields for active role management

##### Schema Updates

**File:** `packages/backend/convex/betterAuth/schema.ts`

Added two new fields to the `customMemberTable`:

```typescript
// Active functional role - which role the user is currently operating as
activeFunctionalRole: v.optional(
  v.union(v.literal("coach"), v.literal("parent"), v.literal("admin"))
),

// Pending role requests awaiting admin approval
pendingFunctionalRoleRequests: v.optional(
  v.array(
    v.object({
      role: v.union(
        v.literal("coach"),
        v.literal("parent"),
        v.literal("admin")
      ),
      requestedAt: v.string(),
      message: v.optional(v.string()),
    })
  )
),
```

**Why these fields were needed:**
- `activeFunctionalRole`: Tracks which role the user is currently operating as within an organization. This enables role switching without changing the user's assigned roles.
- `pendingFunctionalRoleRequests`: Stores role requests that are awaiting admin approval, enabling the self-service role request workflow.

##### Frontend Updates

**File:** `apps/web/src/components/org-role-switcher.tsx`

**Changes:**

1. **Fixed Role Switching Bug**
   - **Problem:** Role switching wasn't working because the `useEffect` with `pendingAction` pattern was unreliable - actions weren't executing after popover close.
   - **Solution:** Changed `handleSwitchRole` and `handleCancelPendingRequest` to execute directly instead of using a deferred pattern.

   Before (broken):
   ```typescript
   const handleSwitchRole = (orgId: string, role: FunctionalRole) => {
     setPendingAction({ type: "switch", orgId, role });
     setOpen(false);
   };

   useEffect(() => {
     if (!open && pendingAction) {
       // Execute action after popover closes
     }
   }, [open, pendingAction]);
   ```

   After (working):
   ```typescript
   const handleSwitchRole = async (orgId: string, role: FunctionalRole) => {
     setOpen(false);
     setSwitching(true);
     try {
       if (!isCurrentOrg) {
         await authClient.organization.setActive({ organizationId: orgId });
       }
       await switchActiveRole({ organizationId: orgId, functionalRole: role });
       router.push(getRoleDashboardRoute(orgId, role));
     } finally {
       setSwitching(false);
     }
   };
   ```

2. **Refactored Role Request UX**
   - **Problem:** Previously showed a "Request Role" option under each organization, creating a confusing experience with many clickable options.
   - **Solution:** Consolidated into a single "Request a Role" button that opens a dialog.

   **New Dialog-Based Approach:**
   - Single "Request a Role" button at bottom of dropdown
   - Opens a dialog with:
     - Organization selector (defaults to current org)
     - Role selector showing available roles for selected org
     - Roles already held or pending are excluded/disabled
   - User can change org and see different available roles
   - Submit sends request to admin for approval

3. **Added Loading State**
   - Shows spinner and "Switching..." text during role switch operations

4. **Improved Visual Feedback**
   - Active role shows green checkmark with "Active" label
   - Pending requests show yellow styling with clock icon
   - Cancel pending request by clicking on it

##### Bug Fix: ArgumentValidationError

**Problem:** When clicking to change role, console showed:
```
ArgumentValidationError: Value does not match validator.
Path: .input
Value: {model: "member", update: {activeFunctionalRole: "coach"}, ...}
```

**Root Cause:** The Better Auth adapter schema for the `member` table was missing the `activeFunctionalRole` and `pendingFunctionalRoleRequests` fields. The adapter only knew about:
- `createdAt`, `functionalRoles`, `organizationId`, `role`, `userId`

**Solution:** Added both fields to the schema (see Schema Updates above).

---

## Files Modified

### Step 17 Implementation

| File | Type | Changes |
|------|------|---------|
| `packages/backend/convex/betterAuth/schema.ts` | Schema | Added `activeFunctionalRole` and `pendingFunctionalRoleRequests` fields |
| `apps/web/src/components/org-role-switcher.tsx` | Component | Fixed role switching, added dialog-based request UX |
| `apps/web/src/app/orgs/[orgId]/request-role/page.tsx` | Page | Updated request role page |
| `packages/backend/convex/_generated/api.d.ts` | Generated | Auto-updated from schema changes |
| `packages/backend/convex/betterAuth/_generated/component.ts` | Generated | Auto-updated from schema changes |

---

## Backend Mutations/Queries Used

### From `packages/backend/convex/models/members.ts`

| Function | Type | Purpose |
|----------|------|---------|
| `switchActiveFunctionalRole` | Mutation | Updates the active functional role for a member |
| `requestFunctionalRole` | Mutation | Submits a role request for admin approval |
| `cancelFunctionalRoleRequest` | Mutation | Cancels a pending role request |
| `getMembersForAllOrganizations` | Query | Gets all memberships for a user across organizations |

---

## Testing Checklist

### Step 17: Role Switching

- [x] Role switching works within same organization
- [x] Role switching works when changing to different organization
- [x] Active role is visually indicated in dropdown
- [x] Pending role requests show with yellow styling
- [x] Can cancel pending role requests
- [x] Request role dialog opens with current org as default
- [x] Can change org in request dialog and see different available roles
- [x] Role request submission works
- [x] Loading state shows during role switch

---

## Next Steps (From COMPREHENSIVE_AUTH_PLAN.md)

### Step 18: Owner Role Management (Not Yet Started)

**Planned Features:**
- Transfer ownership UI in organization settings
- Display current owner information
- Backend mutations: `getCurrentOwner`, `transferOwnership`
- Permission checks for owner-only actions

**Files to Create/Modify:**
- `apps/web/src/app/orgs/[orgId]/admin/settings/page.tsx` - Add owner management section
- `packages/backend/convex/models/members.ts` - Add owner-related queries/mutations

---

## Architecture Decisions Made

### 1. Direct Execution vs Deferred Actions

**Decision:** Execute role switches directly instead of using `useEffect` with pending state.

**Rationale:** The deferred pattern using `pendingAction` state and `useEffect` was unreliable due to:
- React batching state updates
- Race conditions with Radix Popover's `onOpenChange`
- Effect not always firing when expected

### 2. Dialog-Based Role Requests

**Decision:** Use a single dialog for role requests instead of inline forms per organization.

**Rationale:**
- Cleaner UX with fewer clickable elements in dropdown
- Allows user to change organization context before requesting
- Consistent with other dialog patterns in the app
- Better mobile experience

### 3. Schema Extension for Better Auth

**Decision:** Extend Better Auth's member table with custom fields rather than creating separate tables.

**Rationale:**
- Keeps related data together (member record has all role info)
- Simpler queries - single table lookup
- Consistent with existing `functionalRoles` field approach
- Better Auth adapter supports custom fields

---

## Known Issues / Future Improvements

1. **Role Request Notifications**: Admin doesn't receive notifications when new role requests come in. Consider adding notification system.

2. **Role Request Message**: The `message` field in `pendingFunctionalRoleRequests` is optional but UI doesn't provide input for it yet.

3. **Bulk Role Operations**: No way to approve/reject multiple role requests at once from admin dashboard.

---

## Related Documentation

- [COMPREHENSIVE_AUTH_PLAN.md](./COMPREHENSIVE_AUTH_PLAN.md) - Full authentication architecture plan
- [Better Auth Documentation](https://www.better-auth.com/docs) - Official Better Auth docs
- [Better Auth Organization Plugin](https://www.better-auth.com/docs/plugins/organization) - Organization/team management
