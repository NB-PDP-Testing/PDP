# CRITICAL: Better Auth Authentication Pattern (Ralph Bug Fix)

**Date**: 2026-01-27
**Issue**: Ralph US-P8-022/023 used incorrect auth pattern causing "Unauthorized: Platform staff only" errors
**Impact**: All `/platform/feature-flags` queries failed even for valid platform staff users

## THE PROBLEM ❌

Ralph wrote this auth pattern in `trustGatePermissions.ts`:

```typescript
// ❌ WRONG - This does NOT work!
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  throw new Error("Not authenticated");
}

const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "user",
  where: [{ field: "userId", value: identity.subject }],
});

if (!user?.isPlatformStaff) {
  throw new Error("Unauthorized: Platform staff only");
}
```

**Why it fails:**
1. Queries user by `userId` field (which is often `null`)
2. `identity.subject` is the Clerk/Auth0 subject, not Better Auth user ID
3. User lookup fails silently, returns `null`
4. Auth check fails even for valid platform staff

## THE SOLUTION ✅

Use the **exact same pattern** as working `/platform` pages in `models/users.ts`:

```typescript
// ✅ CORRECT - This works!
const currentUser = await authComponent.safeGetAuthUser(ctx);
if (!currentUser?.isPlatformStaff) {
  throw new Error("Unauthorized: Platform staff only");
}
```

**Why it works:**
1. `authComponent.safeGetAuthUser(ctx)` returns the full Better Auth user object
2. Includes all custom fields like `isPlatformStaff`
3. Handles session token validation automatically
4. Single line replaces 13 lines of broken code

## ALSO WRONG: Better Auth findMany Results ❌

Ralph wrote:
```typescript
const orgs = await ctx.runQuery(components.betterAuth.adapter.findMany, {
  model: "organization",
  ...
}) as Organization[];

orgs.map(...) // ❌ Fails: "n.map is not a function"
```

**Fix:**
```typescript
const orgsResult = await ctx.runQuery(components.betterAuth.adapter.findMany, {
  model: "organization",
  ...
});

const orgs = orgsResult.page; // ✅ findMany returns { page: [], ... }
orgs.map(...) // ✅ Works!
```

## FILES AFFECTED

- `packages/backend/convex/models/trustGatePermissions.ts` - All 8 queries had this bug

## FOR FUTURE RALPH ITERATIONS

**ALWAYS use this pattern for auth checks:**

```typescript
// Import at top of file
import { authComponent } from "../auth";

// In query/mutation handler
const currentUser = await authComponent.safeGetAuthUser(ctx);
if (!currentUser?.isPlatformStaff) {
  throw new Error("Unauthorized: Platform staff only");
}
```

**NEVER use:**
- `ctx.auth.getUserIdentity()` for Better Auth users
- Query user by `userId` field with `identity.subject`
- Cast Better Auth findMany results directly to arrays

**REFERENCE FILES (copy these patterns):**
- ✅ `packages/backend/convex/models/users.ts::getAllUsers`
- ✅ `packages/backend/convex/models/users.ts::updatePlatformStaffStatus`

## LESSON LEARNED

When implementing auth for Better Auth:
1. **Find a working example first** (`models/users.ts` has multiple)
2. **Copy the exact pattern** - don't invent new auth code
3. **Test auth immediately** - this bug blocked the entire feature

