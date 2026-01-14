# Invitation Acceptance Spinner Bug - Issue #237

**Issue**: https://github.com/NB-PDP-Testing/PDP/issues/237
**Date**: January 14, 2026
**Status**: In Progress

## Problem Statement

When a user accepts an organization invitation:
1. User receives invitation email
2. Clicks accept button in browser
3. Sees invitation details and permissions
4. Clicks accept
5. **BUG**: Page shows spinning circle and gets stuck - never progresses to full login/dashboard
6. User must manually refresh the page to see the proper screen

## Root Cause Analysis

### Current Flow

**File**: `apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx`

1. **Invitation Acceptance** (Lines 291-425):
   ```typescript
   const acceptInvitation = async (userEmail: string) => {
     // 1. Accept invitation via Better Auth
     const result = await authClient.organization.acceptInvitation({ invitationId });

     // 2. Sync functional roles from invitation metadata
     const syncResult = await syncFunctionalRolesFromInvitation({
       invitationId,
       organizationId,
       userId: session.user.id,
       userEmail: session.user.email,
     });

     // 3. Set organization as active
     await authClient.organization.setActive({ organizationId });

     // 4. Redirect with 2-second delay
     setTimeout(() => {
       router.push(`/orgs/${organizationId}`);
     }, 2000);
   }
   ```

2. **Redirect Target** - `/orgs/[orgId]/page.tsx` (Lines 32-97):
   ```typescript
   // This page queries for member data to determine redirect
   const member = useQuery(
     api.models.members.getMemberByUserId,
     session?.user?.id && orgId
       ? { userId: session.user.id, organizationId: orgId }
       : "skip"
   );

   // Wait for member query to complete
   if (member === undefined) {
     console.log("[OrgDashboard] Waiting for member data...");
     return; // ← STUCK HERE
   }

   // Redirect based on active functional role
   const activeFunctionalRole = member.activeFunctionalRole || member.functionalRoles?.[0];
   router.push(`/orgs/${orgId}/${activeFunctionalRole}`);
   ```

3. **The page shows a spinner while waiting** (Line 100-103):
   ```tsx
   return (
     <div className="flex min-h-screen items-center justify-center">
       <Loader />
     </div>
   );
   ```

### The Race Condition

**The problem occurs because of timing:**

1. ✅ Invitation is accepted via Better Auth API
2. ✅ `syncFunctionalRolesFromInvitation` mutation runs and completes
3. ✅ Organization is set as active
4. ⏱️ **2-second delay** via `setTimeout`
5. ✅ Router redirects to `/orgs/${organizationId}`
6. ❌ **RACE CONDITION**: The redirected page queries for member data
7. ❌ The Convex query may return `undefined` because:
   - The mutation hasn't propagated through Convex's subscription system yet
   - There's network latency
   - The query runs before the member record is fully updated
8. ❌ `member === undefined` persists indefinitely
9. ❌ Page shows spinner forever
10. ❌ User must manually refresh to trigger a new query

### Why the 2-Second Delay Doesn't Fix It

The `setTimeout` with 2 seconds (Line 408) was likely added to give time for the mutation to complete and propagate. However:

- **2 seconds might not be enough** in slow network conditions
- **The delay happens BEFORE the redirect**, not before the query
- Even if the mutation completes, the Convex subscription on the target page might not reflect the updated data immediately
- **There's no retry mechanism** if the query doesn't return data

### Visual Proof

The user sees:
1. Success message: "Invitation Accepted!" ✅
2. "Redirecting..." message ✅
3. Brief redirect occurs ✅
4. **New page loads showing only a spinner** ❌
5. **Spinner never goes away** ❌

**Why it works on refresh:**
- Manual refresh triggers a NEW query
- By this time, the member data has propagated through Convex
- Query returns the member object successfully
- Redirect logic works and sends user to the correct dashboard

## Contributing Factors

### 1. Convex Subscription Propagation Delay

Convex uses optimistic updates and eventual consistency. When a mutation updates data:
- The mutation completes on the server
- Subscriptions are notified
- React components re-render with new data

But there can be a delay between mutation completion and subscription update, especially under:
- Network latency
- High server load
- Multiple concurrent mutations

### 2. No Fallback or Timeout Mechanism

The `/orgs/[orgId]/page.tsx` has no:
- **Timeout**: No max wait time before showing error
- **Retry**: No mechanism to re-query if data doesn't load
- **Error boundary**: No fallback if query fails
- **User feedback**: No indication that something is wrong

Note: There IS a 15-second timeout in the accept-invitation page (lines 44-77), but once redirected, the target page has no such protection.

### 3. Query Returns `undefined` vs `null`

The query uses "skip" when parameters aren't ready:
```typescript
const member = useQuery(
  api.models.members.getMemberByUserId,
  session?.user?.id && orgId
    ? { userId: session.user.id, organizationId: orgId }
    : "skip"
);
```

- `undefined` = query is loading or skipped
- `null` = query completed, member not found

The code correctly handles both cases, but if the query perpetually returns `undefined`, the page stays stuck.

## Why Manual Refresh Works

When the user refreshes:
1. New page load triggers new session check
2. New Convex subscription is created
3. **Enough time has passed** for the member data to propagate
4. Query successfully returns member object
5. Redirect logic executes correctly
6. User lands on correct dashboard

## Proposed Solutions

### Solution 1: Remove setTimeout and Use Synchronous Redirect (Recommended)

**Change in `accept-invitation/[invitationId]/page.tsx`** (Line 407-410):

**BEFORE:**
```typescript
// Redirect to the organization dashboard after a short delay
setTimeout(() => {
  router.push(`/orgs/${organizationId}`);
}, 2000);
```

**AFTER:**
```typescript
// Redirect immediately - sync is already complete
router.push(`/orgs/${organizationId}`);
```

**Reasoning:**
- The `await syncFunctionalRolesFromInvitation()` already waits for the mutation to complete
- The 2-second delay doesn't help because the query on the target page might still not get the updated data
- Removing the delay doesn't make the race condition worse - it's already present
- This eliminates the confusing "Redirecting..." message sitting for 2 seconds

### Solution 2: Add Timeout and Error Handling to Redirector Page (Required)

**Add to `/orgs/[orgId]/page.tsx`** (After line 36):

```typescript
useEffect(() => {
  // Timeout protection: if stuck loading for >10 seconds, show error
  const timeout = setTimeout(() => {
    if (member === undefined && !isRedirecting) {
      console.error("[OrgDashboard] TIMEOUT: Stuck waiting for member data");
      setError("Unable to load your organization membership. Please refresh the page or contact support.");
    }
  }, 10_000); // 10 seconds

  return () => clearTimeout(timeout);
}, [member, isRedirecting]);
```

**Add error state** (Line 15):
```typescript
const [isRedirecting, setIsRedirecting] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Add error UI** (After line 99):
```typescript
if (error) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Loading Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{error}</p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button variant="outline" onClick={() => router.push("/orgs")}>
              Back to Organizations
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Solution 3: Use Skeleton Loading Instead of Spinner (UX Improvement)

**Change in `/orgs/[orgId]/page.tsx`** (Line 99-103):

**BEFORE:**
```typescript
return (
  <div className="flex min-h-screen items-center justify-center">
    <Loader />
  </div>
);
```

**AFTER:**
```typescript
// Next.js will automatically use loading.tsx which has PageSkeleton
// No need to explicitly render Loader here
return null;
```

OR if we want to keep the explicit loading state:

```typescript
return <PageSkeleton showBreadcrumbs={false} variant="dashboard" />;
```

**Benefits:**
- Matches UX mockup requirements for skeleton loading states
- Reduces perceived loading time
- Prevents layout shift
- Better user experience

### Solution 4: Add Retry Logic (Advanced)

**Add to `/orgs/[orgId]/page.tsx`**:

```typescript
const [retryCount, setRetryCount] = useState(0);

useEffect(() => {
  if (member === undefined && session?.user?.id && orgId && retryCount < 3) {
    // Retry query after 2 seconds
    const retryTimer = setTimeout(() => {
      console.log("[OrgDashboard] Retrying member query...");
      setRetryCount(prev => prev + 1);
      // Force re-render to trigger new query
    }, 2000);

    return () => clearTimeout(retryTimer);
  }
}, [member, session, orgId, retryCount]);
```

**Note:** Convex queries are reactive, so they should update automatically. This is more of a fallback.

## Recommended Implementation Plan

### Phase 1: Immediate Fixes (Critical)

1. ✅ **Remove setTimeout from accept-invitation redirect**
   - File: `apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx`
   - Line: 407-410
   - Change: Remove `setTimeout`, use direct `router.push()`

2. ✅ **Add timeout and error handling to redirector page**
   - File: `apps/web/src/app/orgs/[orgId]/page.tsx`
   - Add: 10-second timeout with error state
   - Add: Error UI with refresh button

### Phase 2: UX Improvements (High Priority)

3. ✅ **Replace Loader with skeleton state**
   - File: `apps/web/src/app/orgs/[orgId]/page.tsx`
   - Change: Use `PageSkeleton` instead of `<Loader />`
   - Benefit: Matches UX mockup requirements

### Phase 3: Enhanced Reliability (Medium Priority)

4. ⏳ **Add better logging for debugging**
   - Add timestamps to console logs
   - Log query state transitions
   - Track time spent in each state

5. ⏳ **Consider using React Query for better cache management**
   - Could help with subscription propagation issues
   - Provides built-in retry logic
   - Better error handling

## Testing Plan

### Manual Testing

1. **Happy path - Normal conditions:**
   - Send invitation to test user
   - Accept invitation in browser
   - Verify smooth redirect to correct dashboard
   - NO spinner should appear indefinitely

2. **Slow network simulation:**
   - Use Chrome DevTools Network throttling (Slow 3G)
   - Accept invitation
   - Verify timeout kicks in after 10 seconds if stuck
   - Verify error message shows with refresh button

3. **Multiple concurrent acceptances:**
   - Accept multiple invitations in different tabs
   - Verify each redirects correctly

4. **Refresh during acceptance:**
   - Start accepting invitation
   - Refresh page mid-process
   - Verify graceful recovery

### Automated Testing

**File**: `apps/web/uat/tests/admin/invitations.spec.ts`

Add test case:
```typescript
test('invitation acceptance redirects correctly without hanging', async ({ page }) => {
  // Send invitation
  await sendInvitation(page, testEmail);

  // Accept invitation
  await acceptInvitation(page, invitationId);

  // Wait for redirect (should complete within 5 seconds)
  await page.waitForURL(/\/orgs\/.*\/(admin|coach|parent|player)/, { timeout: 5000 });

  // Verify no spinner is present
  const spinner = page.locator('[data-testid="loader"]');
  await expect(spinner).not.toBeVisible({ timeout: 1000 });

  // Verify correct dashboard loaded
  await expect(page).toHaveURL(/\/orgs\/.*\/admin/);
});
```

## Success Criteria

### Must Have
- ✅ User accepts invitation and is redirected to correct dashboard within 5 seconds
- ✅ No indefinite spinner appears
- ✅ If loading takes >10 seconds, user sees error message with refresh button
- ✅ Manual refresh always works as fallback

### Should Have
- ✅ Skeleton loading state instead of generic spinner
- ✅ Clear console logging for debugging
- ✅ Graceful error handling

### Nice to Have
- ⏳ Automatic retry on failed query
- ⏳ Progress indicator showing what's loading
- ⏳ Optimistic UI updates

## Files to Modify

1. **`apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx`**
   - Line 407-410: Remove `setTimeout`, use direct redirect

2. **`apps/web/src/app/orgs/[orgId]/page.tsx`**
   - Add timeout and error handling
   - Replace `<Loader />` with skeleton state
   - Add error UI

3. **`apps/web/uat/tests/admin/invitations.spec.ts`**
   - Add test case for redirect timing

## Related Issues

- Issue #226: Role switcher sync (recently fixed with useEffect monitoring)
- Issue #224: Empty organizations in role switcher (recently fixed)

Both use similar patterns with useEffect and URL monitoring, which could be helpful references.

## Additional Context

### Skeleton Loading States - Already Implemented ✅

The UX mockup requirement for skeleton loading states (Mockup #5) has been **ALREADY IMPLEMENTED**:

- ✅ `Skeleton` component exists: `apps/web/src/components/ui/skeleton.tsx`
- ✅ `PageSkeleton` component exists: `apps/web/src/components/loading/page-skeleton.tsx`
- ✅ `loading.tsx` exists for `/orgs/[orgId]` with skeleton implementation
- ✅ Skeleton states used throughout admin, coach, parent pages

**Current Status:**
- The `/orgs/[orgId]/page.tsx` explicitly renders `<Loader />` instead of using Next.js's Suspense/loading.tsx
- Should be updated to use the existing skeleton system for consistency

**UX Mockup Requirement:**
> "Skeleton screens reduce perceived loading time by up to 10% and decrease layout shift by maintaining the spatial structure during data retrieval."

✅ This requirement is MET for most pages, but NOT for the org redirector page.

---

**Analysis completed by**: Claude Sonnet 4.5
**Date**: 2026-01-14
