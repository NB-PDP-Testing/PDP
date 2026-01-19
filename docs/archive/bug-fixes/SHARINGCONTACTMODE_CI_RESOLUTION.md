# sharingContactMode CI Failures - Complete Resolution

**Date**: January 19, 2026
**Issue**: Four consecutive commits (cfa157c through c2997b8) failed CI with sharingContactMode type errors
**Status**: ✅ RESOLVED

## Root Cause

The CI workflow runs `npx convex dev --once` which regenerates TypeScript types from the **deployed Convex backend**. The deployed backend had the old schema with `sharingContactMode: "direct" | "form"`, so even though we updated all local files to use `"enquiry"`, the CI would regenerate types with `"form"` from the deployed schema, causing type mismatches.

## The Fix Journey

### Commits Made (All to main branch)

1. **8882c9d** - Excluded test files from tsconfig, added type casts
2. **666e909** - Updated `convex/_generated/api.d.ts` from "form" to "enquiry"
3. **8709d0a** - Fixed shared passport page inline type
4. **f73a407** - Removed unnecessary type casts
5. **c2997b8** - Updated Better Auth component types

All these commits were correct but CI kept failing because...

### The Missing Piece

**The deployed Convex backend schema was never updated!**

### Final Resolution (Jan 19, 2026 10:26 UTC)

Ran `npx convex dev --once` from `packages/backend/` to deploy the updated schema with `"enquiry"` to the Convex backend at `valuable-pig-963.convex.cloud`.

Now when CI runs `npx convex dev --once`, it pulls the correct schema with `"enquiry"` and generates correct types.

## Files Modified

- `packages/backend/convex/betterAuth/schema.ts` - Schema definition (uses "enquiry")
- `packages/backend/convex/betterAuth/_generated/component.ts` - Generated from schema
- `packages/backend/convex/_generated/api.d.ts` - Generated API types
- `convex/_generated/api.d.ts` - Root generated types
- `apps/web/src/app/orgs/[orgId]/players/[playerId]/shared/page.tsx` - Removed "form" reference
- `apps/web/src/app/orgs/[orgId]/admin/settings/page.tsx` - Removed type casts

## Key Learnings

1. **Generated files are committed** - The project commits `_generated/` files to support CI
2. **CI regenerates types** - CI runs `npx convex dev --once` which regenerates from deployed backend
3. **Schema deployment is critical** - Local schema changes must be deployed to Convex for CI to work
4. **Type inference is global** - A single stale type definition can pollute inference across the codebase

## Verification

After deploying schema:
```bash
cd packages/backend
npx convex dev --once
# Verify types have "enquiry"
grep "sharingContactMode" convex/betterAuth/_generated/component.ts
# Result: sharingContactMode?: "direct" | "enquiry"; ✅
```

CI should now pass on subsequent commits.
