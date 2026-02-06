# Phase 0.8: Onboarding Flow Differentiation (Invited vs Self-Registered)

**Status**: Ready for Implementation
**Date**: 2026-02-05
**Branch**: `ralph/phase-0.8-onboarding-flow-differentiation`
**Dependencies**: Phase 0.7 (Profile Address Sync) complete

---

## Executive Summary

This phase introduces explicit differentiation between invited and self-registered users in the onboarding flow. Currently, all users go through guardian matching during onboarding, which is incorrect for self-registered users. Self-registered users should simply provide their information during profile completion, then request access to an organization - guardian matching should happen at admin approval time, not during onboarding.

### Key Changes

1. **Add `wasInvited` flag** to user schema to explicitly track user origin
2. **Skip guardian matching** for self-registered users during onboarding
3. **Remove `no_children_found`** step entirely (obsolete)
4. **Update profile completion messaging** to neutral "Additional Information"
5. **Fix admin approval** to create proper `guardianPlayerLinks` (currently broken)

---

## Problem Statement

### Current (Incorrect) Behavior

When a self-registered user signs up:
1. GDPR consent shown (correct)
2. Profile completion shown (correct)
3. Guardian matching runs based on email/phone (INCORRECT)
4. If matches found: `guardian_claim` task shown (INCORRECT)
5. If no matches: `no_children_found` task shown (INCORRECT)

### Why This Is Wrong

- Self-registered users haven't been assigned children by an admin
- Matching them during onboarding bypasses admin approval
- Creates confusion when user sees "No Children Found" (they haven't requested to join yet!)
- Admin approval flow has child matching, but uses broken code that patches old `players` table

### Required Behavior

**Invited Users** (admin-initiated):
- GDPR → Accept invitation (with child confirmation if parent) → Dashboard
- Guardian matching is appropriate because admin assigned children

**Self-Registered Users** (no invitation):
- GDPR → Profile completion ("Additional Information") → Onboarding complete
- Go directly to `/orgs/join` to browse and request access
- Guardian matching happens when admin reviews their join request
- Admin selects children to link, approves, creates proper links

---

## User Flow Diagrams

### Flow 1: Invited Coach/Admin/Player

```
Invitation Created (by Admin)
         ↓
User Signs Up / Logs In
         ↓
GDPR Consent (Priority 0)
         ↓
Accept Invitation (Priority 1)
   - See org name, role, teams
   - Click Accept
         ↓
wasInvited = true (set on user)
         ↓
Dashboard Access
```

### Flow 2: Invited Parent with Assigned Child

```
Invitation Created (by Admin)
   - includes suggestedPlayerLinks
         ↓
Parent Signs Up / Logs In
         ↓
GDPR Consent (Priority 0)
         ↓
Accept Invitation (Priority 1)
   - See org name, role
   - See "Children Assigned to You"
   - For each child: "Yes, this is mine" / "No, not mine"
         ↓
On Accept:
   - wasInvited = true
   - guardianPlayerLinks created for confirmed children
         ↓
Parent Dashboard (shows linked children)
```

### Flow 3: Self-Registered User (AFTER Phase 0.8)

```
User Signs Up (no invitation)
         ↓
GDPR Consent (Priority 0)
         ↓
Profile Completion (Priority 1.5)
   - Title: "Additional Information"
   - Collect: phone, postcode, address, alt email
   - NO mention of children or matching
         ↓
Onboarding COMPLETE
   - NO guardian_claim task
   - NO no_children_found task
         ↓
Redirect to /orgs/join
   - Browse organizations
   - Request to join with role selection
         ↓
Admin Reviews Join Request
   - Sees: user info, phone, address
   - Sees: "Suggested Children" from smart matching
   - Selects children to link
   - Approves
         ↓
On Approval:
   - guardianIdentity created for user
   - guardianPlayerLinks created for selected children
         ↓
User Notified
   - Access granted to org
   - Children appear on dashboard
```

---

## Technical Implementation

### Change 1: Add `wasInvited` Flag to User Schema

**File**: `packages/backend/convex/betterAuth/schema.ts`

**Location**: Near line 43, with other tracking fields

```typescript
// Invitation tracking
wasInvited: v.optional(v.boolean()), // True if user accepted an invitation
```

This flag:
- Defaults to `undefined` (treated as `false`)
- Set to `true` when user accepts an invitation
- Used by `getOnboardingTasks` to determine flow

### Change 2: Set Flag on Invitation Acceptance

**File**: `packages/backend/convex/models/members.ts`

**Location**: In `syncFunctionalRolesFromInvitation` or equivalent

After invitation is successfully accepted:

```typescript
// Mark user as invited for onboarding flow differentiation
await ctx.runMutation(components.betterAuth.adapter.updateOne, {
  input: {
    model: "user",
    where: [{ field: "_id", value: userId, operator: "eq" }],
    update: { wasInvited: true, updatedAt: Date.now() },
  },
});
```

### Change 3: Conditional Guardian Matching in Onboarding

**File**: `packages/backend/convex/models/onboarding.ts`

**Current code** (lines ~247-490): Always queries guardianIdentities and creates `guardian_claim` task

**Required change**:

```typescript
// Check if user was invited (explicit flag on user record)
const wasInvited = user?.wasInvited === true;

// PRIORITY 2: Guardian matching - ONLY for invited users
if (wasInvited) {
  // Query guardianIdentities by email/phone
  // If matches found with unacknowledged children, add guardian_claim task
  // ... existing guardian matching logic ...
}
// SELF-REGISTERED USERS: Skip guardian matching entirely
// Matching happens at admin approval time via getSmartMatchesForGuardian
```

### Change 4: Remove `no_children_found` Task

**File**: `packages/backend/convex/models/onboarding.ts`

**Current code** (around Priority 2.5): Creates `no_children_found` task when no guardian matches

**Required change**: Delete this section entirely. Self-registered users:
- Complete profile → Onboarding done
- No "No Children Found" message
- Redirect to `/orgs/join`

### Change 5: Update Profile Completion Messaging

**File**: `apps/web/src/components/onboarding/profile-completion-step.tsx`

**Changes**:
- Title: "Additional Information" (not "Help Us Find Your Children")
- Subtitle: "Please provide additional information to complete your profile"
- Remove any text mentioning children, matching, or finding

### Change 6: Fix Admin Approval to Create Proper Links

**File**: `packages/backend/convex/models/orgJoinRequests.ts`

**Current code** (lines 411-438):
```typescript
// BROKEN: Patches old "players" table
const allPlayers = await ctx.db.query("players")...
await ctx.db.patch(player._id, { parentEmail: normalizedEmail });
```

**Required code**:
```typescript
// When approving with linkedPlayerIds:
if (args.linkedPlayerIds && args.linkedPlayerIds.length > 0) {
  // 1. Get or create guardianIdentity for the user
  let guardianIdentity = await ctx.db
    .query("guardianIdentities")
    .withIndex("by_userId", q => q.eq("userId", request.userId))
    .first();

  if (!guardianIdentity) {
    // Create guardianIdentity from user data
    const user = await ctx.db.get(request.userId);
    const guardianId = await ctx.db.insert("guardianIdentities", {
      userId: request.userId,
      email: user?.email || request.email,
      firstName: user?.firstName || request.name?.split(' ')[0] || '',
      lastName: user?.lastName || request.name?.split(' ').slice(1).join(' ') || '',
      phone: user?.phone,
      address: user?.address,
      address2: user?.address2,
      town: user?.town,
      county: user?.county,
      postcode: user?.postcode,
      country: user?.country,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    guardianIdentity = await ctx.db.get(guardianId);
  }

  // 2. Create guardianPlayerLinks for each selected child
  for (const playerIdentityId of args.linkedPlayerIds) {
    await ctx.db.insert("guardianPlayerLinks", {
      guardianIdentityId: guardianIdentity._id,
      playerIdentityId,
      relationship: "parent",
      acknowledgedByParentAt: Date.now(), // Admin approved = parent confirmed
      organizationId: request.organizationId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `packages/backend/convex/betterAuth/schema.ts` | Add `wasInvited: v.optional(v.boolean())` |
| `packages/backend/convex/models/members.ts` | Set `wasInvited = true` on invitation acceptance |
| `packages/backend/convex/models/onboarding.ts` | Check `wasInvited` flag; skip guardian_claim for self-reg; remove no_children_found |
| `apps/web/src/components/onboarding/profile-completion-step.tsx` | Update text to "Additional Information" |
| `packages/backend/convex/models/orgJoinRequests.ts` | Fix approveJoinRequest to create guardianPlayerLinks |
| `apps/web/src/components/onboarding/onboarding-orchestrator.tsx` | Remove debug logging; remove no_children_found case |

---

## Test Plans

### Test Plan 1: Invited Coach/Admin Flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Admin invites user as Coach to Org X | Invitation created with role: coach |
| 2 | User signs up with invited email | Account created |
| 3 | User sees GDPR consent | GDPR dialog shown |
| 4 | User accepts GDPR | Moves to invitation step |
| 5 | User sees invitation | Shows: Org X, Role: Coach |
| 6 | User clicks Accept | User added to Org X as coach |
| 7 | Check user record | wasInvited = true |
| 8 | User lands on dashboard | Coach dashboard for Org X |

### Test Plan 2: Invited Parent with Child Flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Admin invites parent with child Emma | Invitation created with playerLinks |
| 2 | Parent signs up with invited email | Account created |
| 3 | Parent sees GDPR consent | GDPR dialog shown |
| 4 | Parent accepts GDPR | Moves to invitation step |
| 5 | Parent sees invitation | Shows: Org X, Role: Parent, Child: Emma |
| 6 | Parent clicks "Yes, this is mine" | Emma selected |
| 7 | Parent clicks Accept | wasInvited = true, guardianPlayerLink created |
| 8 | Parent lands on dashboard | Shows Emma as linked child |

### Test Plan 3: Self-Registered User Flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User signs up (no invitation) | Account created, wasInvited = undefined/false |
| 2 | User sees GDPR consent | GDPR dialog shown |
| 3 | User accepts GDPR | Moves to profile completion |
| 4 | User sees profile completion | Title: "Additional Information" |
| 5 | User fills phone, postcode | Profile saved |
| 6 | Onboarding completes | NO guardian_claim, NO no_children_found |
| 7 | User redirected | Goes to /orgs/join |
| 8 | User requests to join Org X | Join request created |
| 9 | Admin sees request | Shows: User info + "Suggested Children" |
| 10 | Admin selects Emma, approves | guardianIdentity + guardianPlayerLink created |
| 11 | User accesses Org X | Emma appears on parent dashboard |

---

## Success Criteria

- [ ] `wasInvited` flag added to user schema
- [ ] Flag set to `true` when user accepts invitation
- [ ] Self-registered users skip guardian_claim task entirely
- [ ] Self-registered users skip no_children_found task entirely
- [ ] Profile completion shows "Additional Information" (neutral text)
- [ ] Invited parents still see guardian_claim with assigned children
- [ ] approveJoinRequest creates guardianIdentity and guardianPlayerLinks
- [ ] No regression in invited user flows
- [ ] Debug logging removed from onboarding code
- [ ] All type checks pass
- [ ] All linting passes

---

## Related Issues

- Bug #297: Parent child links not persisting (related but separate)
- Bug #327: Double dialog issue (fixed in Phase 1)
- Current issue: Self-reg users incorrectly see guardian matching during onboarding

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Existing users without `wasInvited` flag | Treat undefined as false (self-registered) |
| Breaking invited parent flow | Thorough testing of all three flows |
| Admin approval regression | Test with/without child selection |

---

## Out of Scope

- Changing the smart matching algorithm (already works)
- Modifying the admin approval UI (already shows matches)
- Changing invited user flows (already work correctly)
- Email notifications for approval/rejection
