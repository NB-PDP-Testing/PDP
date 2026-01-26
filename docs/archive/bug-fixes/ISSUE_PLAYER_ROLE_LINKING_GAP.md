# Player Role Missing Identity Linking During Approval

## Bug Summary

When a user is granted the "player" functional role, there is no mechanism to link them to a specific `playerIdentity` record. The player dashboard page (`/orgs/[orgId]/player`) relies solely on email matching, which is fragile and often fails, resulting in an infinite loading state.

## Current Behavior

### 1. User Requests Player Role
- User requests "player" functional role via `/orgs/[orgId]/request-role`
- Admin approves the request in `/orgs/[orgId]/admin/users/approvals`
- **No linking step occurs** - the role is simply added to `functionalRoles[]`

### 2. User Visits Player Dashboard
- Page queries `playerIdentities.findPlayerByEmail(user.email)`
- If no `playerIdentity` has a matching email → query returns `null`
- **Bug**: Page gets stuck in infinite loading due to flawed loading check

### 3. The Loading Bug (Immediate Issue)
```tsx
// apps/web/src/app/orgs/[orgId]/player/page.tsx - Line 109
if (playerData === undefined || playerIdentity === undefined) {
  return <Loading />  // STUCK HERE
}

if (!playerIdentity) {
  return "Profile Not Found"  // NEVER REACHED
}
```

When `playerIdentity` is `null` (not found):
- `playerData` query is skipped → stays `undefined`
- Condition `playerData === undefined` is always true
- Loading state never exits
- "Profile Not Found" message never displays

## Root Cause

The player role implementation is incomplete compared to the parent role:

| Aspect | Parent Role | Player Role |
|--------|-------------|-------------|
| Linking table | `guardianPlayerLinks` | **None** |
| Smart matching during approval | ✅ Yes | ❌ No |
| Admin can select children/players | ✅ Yes | ❌ No |
| Explicit association stored | ✅ Yes | ❌ No |
| Page lookup method | Via explicit links | Email match only |

## Impact

1. **Users with player role cannot access their dashboard** unless their login email exactly matches a `playerIdentity.email`
2. **Infinite loading** frustrates users - no clear error message
3. **No way for admins to fix** - can't manually link users to player identities
4. **Adult players (18+)** are the primary users of this feature and are currently blocked

## Suggested Fixes

### Short-term Fix (Immediate)
Fix the loading logic to properly show "Profile Not Found":

```tsx
// Fix loading check order
if (playerIdentity === undefined) {
  return <Loading />  // Still loading player identity lookup
}

if (!playerIdentity) {
  return <ProfileNotFound />  // Player identity not found
}

if (playerData === undefined) {
  return <Loading />  // Still loading player data
}
```

### Medium-term Fix (Recommended)
Add player identity linking during role approval:

1. **Extend approval dialog** for player role requests (similar to parent role)
2. **Add smart matching** to suggest player identities based on:
   - Email match
   - Name match
   - Date of birth match (if provided)
3. **Store explicit link** either:
   - On the `member` record: `linkedPlayerIdentityId`
   - Or in a new `playerUserLinks` table
4. **Update player page** to use explicit link instead of email lookup

### Long-term Fix (Ideal)
Consider unifying the linking approach:
- `userIdentityLinks` table for all role-based identity associations
- Consistent linking UI for coach, parent, and player roles
- Single source of truth for user-to-identity mappings

## Files Affected

- `apps/web/src/app/orgs/[orgId]/player/page.tsx` - Player dashboard (loading bug)
- `apps/web/src/app/orgs/[orgId]/admin/users/approvals/page.tsx` - Needs player linking UI
- `packages/backend/convex/models/members.ts` - May need `linkedPlayerIdentityId` field
- `packages/backend/convex/schema.ts` - If adding new linking table

## Related Code

### How Parent Linking Works (Reference)
```tsx
// In approvals page - parent role approval dialog
const smartMatches = useQuery(
  api.models.guardianPlayerLinks.getSmartMatchesForGuardian,
  isParentRequest ? { email, surname, phone, address, children } : "skip"
);

// Admin selects which players to link
// On approve: linkedPlayerIds passed to approveRequest mutation
```

### Current Player Page Lookup
```tsx
// apps/web/src/app/orgs/[orgId]/player/page.tsx
const playerIdentity = useQuery(
  api.models.playerIdentities.findPlayerByEmail,
  userEmail ? { email: userEmail.toLowerCase() } : "skip"
);
```

## Acceptance Criteria

### Immediate Fix
- [ ] Player page shows "Profile Not Found" message instead of infinite loading
- [ ] Message explains that player identity needs to be linked
- [ ] Provides guidance on contacting admin

### Full Fix
- [ ] Admin can link users to player identities during player role approval
- [ ] Smart matching suggests likely player identity matches
- [ ] Explicit link stored and used by player page
- [ ] Player page works reliably for users with player role
