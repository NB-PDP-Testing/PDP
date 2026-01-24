# Bug Fix Analysis: Issue #317 - Pending Functional Role Requests Error

## Bug Summary

When a parent user requests an additional role (e.g., coach) via the role switcher, and an admin navigates to the Approvals tab to approve the request, the page crashes with a runtime error.

### Error Details

```
ReturnsValidationError: Object is missing the required field `memberId`
```

The returned object contains all fields except `memberId`:
```json
{
  "currentRoles": ["parent"],
  "message": null,
  "requestedAt": "2026-01-24T17:24:23.938Z",
  "requestedRole": "coach",
  "userEmail": "parent_pdp@outlook.com",
  "userId": "k174m8w0v61ev9qn5cxz9ddc0s7z1nzv",
  "userImage": null,
  "userName": "Parent User"
}
```

The validator expects `memberId: v.string()` but the field is missing entirely.

---

## Root Cause Analysis

### Location
`packages/backend/convex/models/members.ts` - Line 2809

### The Problem

The `getPendingFunctionalRoleRequests` query incorrectly accesses the member ID field:

```typescript
// Line 2809 - INCORRECT
pendingRequests.push({
  memberId: member.id,  // ❌ Returns undefined
  userId: member.userId,
  // ... other fields
});
```

Better Auth member objects use `_id` as the ID field, **not** `id`. When `member.id` returns `undefined`, JavaScript omits the property entirely from the object, causing the Convex return validator to fail.

### Evidence from the Same File

Other parts of the codebase correctly use `member._id`:

| Line | Code | Status |
|------|------|--------|
| 566 | `member._id` | ✅ Correct |
| 1702 | `member._id` | ✅ Correct |
| 4327 | `member._id` | ✅ Correct |
| **2809** | `member.id` | ❌ **Bug** |

---

## Suggested Fix

Change line 2809 from:
```typescript
memberId: member.id,
```

To:
```typescript
memberId: member._id,
```

### Full Context (Lines 2807-2819)

```typescript
for (const request of requests) {
  pendingRequests.push({
    memberId: member._id,  // ← Fix: Use _id instead of id
    userId: member.userId,
    userName: (userResult?.name as string) || null,
    userEmail: (userResult?.email as string) || null,
    userImage: (userResult?.image as string) || null,
    currentRoles: functionalRoles,
    requestedRole: request.role,
    requestedAt: request.requestedAt,
    message: request.message || null,
  });
}
```

---

## Impact

- **Affected Feature**: Admin approvals for functional role requests
- **Severity**: High - Blocks admins from approving any role requests
- **Fix Complexity**: Low - Single character change (`id` → `_id`)

---

## Testing Checklist

- [ ] Parent requests coach role via role switcher
- [ ] Admin navigates to Approvals tab → No error
- [ ] Admin can see pending role requests
- [ ] Admin can approve the request
- [ ] Admin can reject the request
- [ ] User receives the new role after approval
