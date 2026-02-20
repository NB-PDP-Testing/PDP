# Bug Fix: Organization Logo Removal (#350)

**Issue:** [#350](https://github.com/NB-PDP-Testing/PDP/issues/350)
**Branch:** `fix/350-org-logo-removal`
**Commit:** `47117db6`
**Date:** 2026-02-01

---

## Problem Summary

Organization logos could not be removed once uploaded. When a user clicked the remove button and saved, the logo remained visible and persisted in the database.

## Root Cause Analysis

The bug was caused by how Better Auth handles `undefined` values in its `organization.update()` method.

**The problematic code in `settings/page.tsx` (line 271):**
```typescript
await authClient.organization.update({
  organizationId: orgId,
  data: {
    name,
    logo: logo || undefined,  // BUG: undefined is ignored by Better Auth
  },
});
```

**Why this failed:**
1. When the user removes a logo, `logo` state becomes an empty string `""`
2. `logo || undefined` converts empty string to `undefined`
3. Better Auth's update method **ignores `undefined` fields** (they are treated as "no change")
4. The logo field in the database remains unchanged

**Database behavior:**
- `undefined` = Skip this field (no update)
- `null` = Explicitly clear/remove this field

## Solution Implemented

Created a dedicated Convex mutation following the established pattern from `updateOrganizationSocialLinks`.

### Files Changed

#### 1. `packages/backend/convex/models/organizations.ts`

**Added new mutation** `updateOrganizationLogo` (lines 1530-1593):

```typescript
export const updateOrganizationLogo = mutation({
  args: {
    organizationId: v.string(),
    logo: v.union(v.null(), v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Authentication check
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Permission check (owner/admin only)
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "userId", value: user._id, operator: "eq" },
          { field: "organizationId", value: args.organizationId, operator: "eq", connector: "AND" },
        ],
      }
    );

    if (!memberResult) {
      throw new Error("You are not a member of this organization");
    }

    const role = memberResult.role;
    if (role !== "owner" && role !== "admin") {
      throw new Error("Only organization owners and admins can update logos");
    }

    // Convert empty string to null for proper database clearing
    const logoValue = args.logo || null;

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "organization",
        where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
        update: {
          logo: logoValue,
        },
      },
    });

    return null;
  },
});
```

#### 2. `apps/web/src/app/orgs/[orgId]/admin/settings/page.tsx`

**Added mutation hook** (after line 181):
```typescript
const updateOrganizationLogo = useMutation(
  api.models.organizations.updateOrganizationLogo
);
```

**Updated `handleSave` function** (lines 259-291):
```typescript
const handleSave = async () => {
  if (!name.trim()) {
    toast.error("Organization name is required");
    return;
  }

  setSaving(true);
  try {
    // Update name via Better Auth client
    await authClient.organization.update({
      organizationId: orgId,
      data: {
        name,
      },
    });

    // Update logo via dedicated Convex mutation
    // This properly handles clearing (empty string → null)
    await updateOrganizationLogo({
      organizationId: orgId,
      logo: logo || null,
    });

    toast.success("Organization updated successfully");
    setOrg((prev) => (prev ? { ...prev, name, logo } : null));
  } catch (error) {
    console.error("Error updating organization:", error);
    toast.error("Failed to update organization");
  } finally {
    setSaving(false);
  }
};
```

### Database Changes

**No schema changes required.** The existing `logo` field in the `organization` table already supports `null`:

```typescript
// packages/backend/convex/betterAuth/schema.ts (line 97)
logo: v.optional(v.union(v.null(), v.string()))
```

The fix ensures `null` is properly written to clear the field.

---

## Manual Testing Completed

### Test Environment
- Local development server
- Test organization with existing logo

### Test Cases Verified

| # | Test Case | Steps | Expected | Result |
|---|-----------|-------|----------|--------|
| 1 | Remove uploaded logo | 1. Go to Settings<br>2. Click X on logo preview<br>3. Click Save | Logo removed, preview cleared | PASS |
| 2 | Remove URL logo | 1. Enter URL logo<br>2. Save<br>3. Click X<br>4. Save | Logo removed | PASS |
| 3 | Upload new logo | 1. Remove existing<br>2. Upload new<br>3. Save | New logo displayed | PASS |
| 4 | Replace logo | 1. With existing logo<br>2. Upload different<br>3. Save | New logo replaces old | PASS |
| 5 | Cancel removal | 1. Click X on logo<br>2. Navigate away without saving | Logo unchanged | PASS |
| 6 | Permission check | 1. Login as member (not admin)<br>2. Try to modify logo | Operation rejected | PASS |
| 7 | Persistence after refresh | 1. Remove logo<br>2. Save<br>3. Refresh page | Logo remains removed | PASS |

### Verification Steps
1. Confirmed logo removed from UI preview
2. Confirmed database field set to `null` (checked via Convex dashboard)
3. Confirmed logo stays removed after page refresh
4. Confirmed other organization fields (name, colors) unaffected

---

## Technical Notes

### Pattern Followed
This fix follows the established pattern from `updateOrganizationSocialLinks` which also uses `|| null` to handle empty strings:

```typescript
// Existing pattern (social links)
website: website.trim() || null,
socialLinks: {
  facebook: socialFacebook.trim() || null,
  // ...
}
```

### Why Not Fix in Better Auth?
Better Auth's behavior of ignoring `undefined` is intentional - it allows partial updates. The correct solution is to explicitly pass `null` when clearing a field, which requires a dedicated mutation since the client SDK doesn't distinguish between "no change" and "clear".

### Alternative Considered
Could have modified `authClient.organization.update()` to pass `logo: null` directly, but:
- Better Auth client may still ignore/convert this
- Dedicated mutation provides explicit control and follows existing patterns
- Easier to debug and maintain

---

## Deployment Notes

1. Backend changes will be deployed automatically via Convex
2. Frontend changes require standard deployment process
3. No database migration required
4. No breaking changes to existing functionality

---

## Related Files

- `apps/web/src/components/logo-upload.tsx` - Logo upload component (unchanged, works correctly)
- `packages/backend/convex/betterAuth/schema.ts` - Schema definition (unchanged)
- `packages/backend/convex/models/organizations.ts` - Organization mutations (updated)
- `apps/web/src/app/orgs/[orgId]/admin/settings/page.tsx` - Settings page (updated)
