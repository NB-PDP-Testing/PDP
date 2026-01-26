# Better Auth User Table Index Warning

**Date**: 2026-01-26
**Severity**: Warning (Performance Issue)
**Status**: Pre-Existing (Not caused by Phase 7.1)

---

## Issue

Convex logs show multiple warnings when querying the Better Auth `user` table:

```
adapter:findOne
warn
Querying without an index on table "user". This can cause performance issues,
and may hit the document read limit. To fix, add an index that begins with
the following fields in order: [id]
```

**Frequency**: ~40 warnings per voice note page load

---

## Root Cause

The Better Auth Convex adapter (`@convex-dev/better-auth`) is querying the `user` table by an `id` field, but:

1. **Convex tables don't have an `id` field** - they have `_id` (internal ID)
2. **Better Auth uses `userId`** - the user table has a `userId` string field
3. **The adapter is not using indexes** - it's doing table scans via `.filter()`

### Current User Table Structure

Located in: `packages/backend/convex/betterAuth/schema.ts` (lines 9-40)

```typescript
const customUserTable = defineTable({
  name: v.string(),
  email: v.string(),
  emailVerified: v.boolean(),
  // ... other fields
  userId: v.optional(v.union(v.null(), v.string())),
  // ... custom fields
})
  .index("email_name", ["email", "name"])
  .index("name", ["name"])
  .index("userId", ["userId"]);  // ← Index exists for userId, NOT id
```

**Note**: There is NO `id` field in the schema.

---

## Why This Happens

The Better Auth Convex adapter likely expects:
- A field called `id` (not `userId`)
- OR the adapter is using the wrong query method

The adapter code is in `packages/backend/convex/betterAuth/adapter.ts`:

```typescript
import { createApi } from "@convex-dev/better-auth";

export const {
  create,
  findOne,   // ← This is generating the warnings
  findMany,
  updateOne,
  updateMany,
  deleteOne,
  deleteMany,
} = createApi(schema, createAuth);
```

The `findOne` function from `@convex-dev/better-auth` is querying by "id" when it should use "_id" or "userId".

---

## Impact

### Performance
- **Table scans** instead of index lookups
- ~40 warnings per page load (one per coach/user lookup)
- Could hit document read limits at scale
- Slows down voice note page loads (currently 1.1s)

### User Experience
- No visible errors to users
- Slight performance degradation
- May cause rate limiting at scale

---

## Why Not Caused by Phase 7.1

Phase 7.1 added:
- `voiceNoteInsights` table queries (uses proper indexes)
- `coachTrustLevels` queries (uses proper indexes)
- UI components (no backend queries)

**Phase 7.1 does NOT**:
- Query the `user` table directly
- Use the Better Auth adapter
- Modify Better Auth configuration

The warnings appear when loading the voice notes page, which has ALWAYS queried user data for coach lookups. This is pre-existing.

---

## Solutions

### Option 1: Regenerate Better Auth Schema (Recommended)
```bash
npx @better-auth/cli generate --output ./convex/betterAuth/generatedSchema.ts -y
```

Then check if the generated schema includes proper indexes for the fields Better Auth actually queries.

### Option 2: Add Custom ID Field
Add an `id` field to the user table that mirrors `_id`:

```typescript
const customUserTable = defineTable({
  // ... existing fields
  id: v.string(),  // Add this - copy of _id as string
  // ... rest of fields
})
  .index("id", ["id"]);  // Add this index
```

**Problem**: This requires a migration to backfill `id` for all existing users.

### Option 3: Update Adapter Configuration
Check if `@convex-dev/better-auth` has configuration options to:
- Specify which field to use for user lookups
- Use `_id` instead of `id`
- Use existing `userId` field

**Documentation**: https://github.com/get-convex/better-auth (check for ID field config)

### Option 4: Wait for Adapter Fix
This may be a known issue in `@convex-dev/better-auth`. Check:
- GitHub issues: https://github.com/get-convex/better-auth/issues
- Package version: Update to latest if fix is available

---

## Workaround (Temporary)

The warnings are non-blocking. The adapter falls back to table scans, which work but are slow.

**For now**: Accept the performance hit until one of the solutions above is implemented.

---

## Investigation Steps

1. **Check adapter version**:
   ```bash
   grep "@convex-dev/better-auth" package.json
   ```

2. **Check for updates**:
   ```bash
   npm outdated @convex-dev/better-auth
   ```

3. **Review adapter docs**:
   - https://github.com/get-convex/better-auth
   - Look for "id field" or "userId" configuration

4. **Test with regenerated schema**:
   ```bash
   npx @better-auth/cli generate --output ./convex/betterAuth/generatedSchema.ts -y
   ```

5. **Check if issue is upstream**:
   - Search Better Auth GitHub issues for "convex id field"
   - Search for "adapter:findOne warn"

---

## Recommendation

**Priority**: Medium (performance issue, not breaking)

**Action**:
1. Update `@convex-dev/better-auth` to latest version
2. Regenerate Better Auth schema
3. If still present, open issue with Better Auth maintainers

**Timeline**: After Phase 7.1 is merged and tested

---

## Related Files

- `packages/backend/convex/betterAuth/schema.ts` - User table definition
- `packages/backend/convex/betterAuth/generatedSchema.ts` - Generated base schema
- `packages/backend/convex/betterAuth/adapter.ts` - Adapter configuration
- `packages/backend/convex/auth.ts` - Better Auth setup

---

**Status**: OPEN - Investigation needed
**Assignee**: TBD
**Milestone**: Post-Phase 7.1 cleanup
