# Authentication & Identity Architecture Review

## Executive Summary

This document provides a comprehensive review of our Better Auth implementation, role system, and invitation flow. It identifies current issues, opportunities for improvement, and provides a recommended path forward to maximize Better Auth's capabilities while maintaining PlayerARC's multi-role requirements.

---

## Current Architecture

### 1. Role System (Dual-Layer)

We currently have **two separate role systems**:

#### A. Better Auth Organizational Roles
- **Purpose**: Organizational hierarchy and permissions
- **Roles**: `owner`, `admin`, `member`, `coach`, `parent`
- **Location**: `member.role` field in Better Auth `member` table
- **Used for**: Access control, organizational permissions
- **Defined in**: `packages/backend/convex/betterAuth/accessControl.ts`

#### B. Functional Roles (PlayerARC Capabilities)
- **Purpose**: User capabilities within the sports club context
- **Roles**: `["coach", "parent", "admin"]` (array)
- **Location**: `member.functionalRoles` field (custom Convex field)
- **Used for**: UI display, feature access, coach/parent assignments
- **Defined in**: `packages/backend/convex/betterAuth/schema.ts`

### 2. Current Flow

```
Invitation → Better Auth Role → Manual Mapping → Functional Roles
```

1. Admin invites user with Better Auth role (`member` or `admin`)
2. User accepts invitation → Better Auth creates `member` record with `role`
3. **Manual step**: We map Better Auth role to functional roles (currently only for "admin")
4. Admin manually assigns functional roles via UI checkboxes

### 3. Issues Identified

#### Issue 1: Role Confusion
- **Problem**: "coach" and "parent" exist as BOTH Better Auth roles AND functional roles
- **Impact**: Confusion about which system to use, potential conflicts
- **Example**: Better Auth role "coach" vs functional role "coach"

#### Issue 2: Invitation Limitations
- **Problem**: Invitations only set Better Auth role, not functional roles
- **Impact**: Users must be manually assigned functional roles after joining
- **Current**: Invite with `role: "member" | "admin"`, then admin assigns functional roles

#### Issue 3: Manual Mapping Required
- **Problem**: We manually map Better Auth "admin" → functional "admin" after acceptance
- **Impact**: Additional code complexity, potential for missed mappings
- **Current**: `acceptInvitation` page manually sets functional roles

#### Issue 4: Access Control Mismatch
- **Problem**: Access control uses Better Auth roles, but UI displays functional roles
- **Impact**: Permission checks may not match what users see in UI
- **Example**: User has Better Auth "member" but functional "admin" - what permissions do they have?

#### Issue 5: Not Using Better Auth Hooks
- **Problem**: We're not using Better Auth's `onMemberAdded` or `afterInvitationAccepted` hooks
- **Impact**: Missing opportunity for automatic role assignment
- **Current**: Manual post-acceptance logic in frontend

---

## Better Auth Capabilities We're Not Using

### 1. Custom Roles in Invitations
Better Auth supports custom roles in invitations:
```typescript
await authClient.organization.inviteMember({
  email: "coach@example.com",
  role: "coach", // Can use custom roles!
  organizationId: "org_123",
});
```

**Current State**: We only use `"member"` or `"admin"` in invitations

### 2. `onMemberAdded` Hook
Better Auth provides a hook that fires when a member is added:
```typescript
organization({
  async onMemberAdded(data) {
    // data.member, data.organization, data.role
    // Can set functional roles here automatically!
  },
})
```

**Current State**: Not implemented

### 3. Role-Based Access Control Integration
Better Auth's access control can check both Better Auth roles AND custom fields:
```typescript
// Can check functional roles in access control
if (member.functionalRoles?.includes("coach")) {
  // Grant coach permissions
}
```

**Current State**: Access control only checks Better Auth roles

### 4. Invitation Metadata
Better Auth invitations can store custom metadata:
```typescript
await authClient.organization.inviteMember({
  email: "coach@example.com",
  role: "member",
  metadata: {
    functionalRoles: ["coach", "parent"], // Custom data!
  },
});
```

**Current State**: Not using metadata field

---

## Recommended Architecture

### Option A: Simplified Dual-Layer (Recommended)

**Principle**: Use Better Auth roles for hierarchy, functional roles for capabilities

#### Structure:
```
Better Auth Roles (Hierarchy):
├── owner: Full org control
├── admin: Org management
└── member: Basic membership

Functional Roles (Capabilities):
├── admin: Admin UI access
├── coach: Coach capabilities
└── parent: Parent capabilities
```

#### Implementation:

1. **Invitation Flow**:
   ```typescript
   // Admin invites with Better Auth role
   await authClient.organization.inviteMember({
     email: "coach@example.com",
     role: "member", // Always "member" for new invites
     metadata: {
       suggestedFunctionalRoles: ["coach"], // Hint for auto-assignment
     },
   });
   ```

2. **Auto-Assignment Hook**:
   ```typescript
   organization({
     async onMemberAdded(data) {
       const suggestedRoles = data.invitation?.metadata?.suggestedFunctionalRoles || [];
       const betterAuthRole = data.member.role;
       
       // Auto-assign functional roles based on invitation
       if (suggestedRoles.length > 0) {
         await setFunctionalRoles(data.member.userId, suggestedRoles);
       }
       
       // Auto-map Better Auth "admin" to functional "admin"
       if (betterAuthRole === "admin" || betterAuthRole === "owner") {
         await addFunctionalRole(data.member.userId, "admin");
       }
     },
   })
   ```

3. **Access Control**:
   ```typescript
   // Check both Better Auth role AND functional roles
   const canManageOrg = member.role === "admin" || member.role === "owner";
   const canCoach = member.functionalRoles?.includes("coach");
   const canParent = member.functionalRoles?.includes("parent");
   ```

#### Benefits:
- ✅ Clear separation: hierarchy vs capabilities
- ✅ Automatic role assignment via hooks
- ✅ No manual mapping needed
- ✅ Uses Better Auth's built-in capabilities
- ✅ Maintains multi-role support

#### Migration:
1. Remove "coach" and "parent" from Better Auth roles (keep only owner/admin/member)
2. Add `onMemberAdded` hook to auto-assign functional roles
3. Update invitations to use metadata for suggested roles
4. Run sync mutation to fix existing members

---

### Option B: Unified Better Auth Roles

**Principle**: Use Better Auth roles exclusively, remove functional roles

#### Structure:
```
Better Auth Roles Only:
├── owner: Full org control
├── admin: Org admin + admin capabilities
├── coach: Coach capabilities
├── parent: Parent capabilities
└── member: Basic membership
```

#### Implementation:
- Use Better Auth's custom roles directly
- Remove `functionalRoles` field
- Use Better Auth role in invitations
- Access control uses Better Auth roles only

#### Benefits:
- ✅ Simpler architecture
- ✅ Single source of truth
- ✅ Better Auth handles everything

#### Drawbacks:
- ❌ Can't have multi-role (coach AND parent)
- ❌ Doesn't match MVP requirements
- ❌ Less flexible for future roles

**Recommendation**: ❌ Not recommended - doesn't support multi-role requirement

---

### Option C: Enhanced Functional Roles

**Principle**: Keep current dual-layer but improve automation

#### Structure:
- Keep Better Auth roles (owner/admin/member)
- Keep functional roles (coach/parent/admin)
- Add automatic mapping via hooks
- Add invitation metadata support

#### Implementation:
1. Add `onMemberAdded` hook for auto-assignment
2. Use invitation metadata for suggested roles
3. Improve sync mutation for retroactive fixes
4. Add UI to set functional roles during invitation

#### Benefits:
- ✅ Minimal changes to current architecture
- ✅ Maintains multi-role support
- ✅ Improves automation

#### Drawbacks:
- ⚠️ Still maintains dual-layer complexity
- ⚠️ Requires careful mapping logic

**Recommendation**: ✅ Good interim solution, can evolve to Option A

---

## Recommended Path Forward

### Phase 1: Immediate Fixes (Week 1)

1. **Add `onMemberAdded` Hook**
   - Auto-assign functional "admin" when Better Auth role is "admin"/"owner"
   - Use invitation metadata for suggested functional roles

2. **Improve Invitation UI**
   - Add functional role selection to invitation dialog
   - Store selected roles in invitation metadata

3. **Run Sync Mutation**
   - Fix existing members who are missing functional roles
   - Document the sync process

### Phase 2: Architecture Cleanup (Week 2-3)

1. **Remove Duplicate Roles**
   - Remove "coach" and "parent" from Better Auth roles
   - Keep only: owner, admin, member
   - Ensure all access control uses functional roles for capabilities

2. **Update Access Control**
   - Check functional roles for capability-based permissions
   - Check Better Auth roles for hierarchy-based permissions

3. **Update Documentation**
   - Document the dual-layer system clearly
   - Add examples of when to use each system

### Phase 3: Enhanced Features (Week 4+)

1. **Invitation Templates**
   - Pre-configured invitation types (Coach, Parent, Admin)
   - Auto-assign functional roles based on template

2. **Role Analytics**
   - Dashboard showing role distribution
   - Identify users with incomplete role assignments

3. **Bulk Role Management**
   - Assign roles to multiple users at once
   - Import roles from CSV

---

## Implementation Plan

### Step 1: Add `onMemberAdded` Hook

**File**: `packages/backend/convex/auth.ts`

```typescript
organization({
  // ... existing config ...
  
  async onMemberAdded(data) {
    const { member, organization, role, invitation } = data;
    
    // Get suggested functional roles from invitation metadata
    const suggestedRoles = invitation?.metadata?.suggestedFunctionalRoles || [];
    
    // Auto-assign functional roles based on invitation
    if (suggestedRoles.length > 0) {
      await ctx.runMutation(api.models.members.updateMemberFunctionalRoles, {
        organizationId: organization.id,
        userId: member.userId,
        functionalRoles: suggestedRoles,
      });
    }
    
    // Auto-map Better Auth "admin"/"owner" to functional "admin"
    if (role === "admin" || role === "owner") {
      const currentRoles = member.functionalRoles || [];
      if (!currentRoles.includes("admin")) {
        await ctx.runMutation(api.models.members.updateMemberFunctionalRoles, {
          organizationId: organization.id,
          userId: member.userId,
          functionalRoles: [...currentRoles, "admin"],
        });
      }
    }
  },
})
```

### Step 2: Update Invitation UI

**File**: `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`

Add functional role selection to invitation dialog:
```typescript
const [inviteFunctionalRoles, setInviteFunctionalRoles] = useState<FunctionalRole[]>([]);

// When inviting:
await authClient.organization.inviteMember({
  email: inviteEmail,
  organizationId: orgId,
  role: inviteRole as "member" | "admin",
  metadata: {
    suggestedFunctionalRoles: inviteFunctionalRoles, // Store for hook
  },
});
```

### Step 3: Remove Duplicate Better Auth Roles

**File**: `packages/backend/convex/betterAuth/accessControl.ts`

Remove "coach" and "parent" from Better Auth roles:
```typescript
// Keep only:
export const owner = ac.newRole({ ... });
export const admin = ac.newRole({ ... });
export const member = ac.newRole({ ... });

// Remove:
// export const coach = ac.newRole({ ... });
// export const parent = ac.newRole({ ... });
```

Update `auth.ts`:
```typescript
roles: {
  owner,
  admin,
  member,
  // Remove coach and parent
},
```

### Step 4: Update Access Control Logic

**File**: `packages/backend/convex/betterAuth/accessControl.ts`

Update to check functional roles:
```typescript
// For capability-based permissions, check functional roles
const canCoach = member.functionalRoles?.includes("coach");
const canParent = member.functionalRoles?.includes("parent");

// For hierarchy-based permissions, check Better Auth role
const canManageOrg = member.role === "admin" || member.role === "owner";
```

---

## Testing Checklist

- [ ] Invitation with functional roles → Auto-assigned on acceptance
- [ ] Invitation as "admin" → Auto-gets functional "admin"
- [ ] Invitation as "member" → No auto-assignment (admin assigns later)
- [ ] Existing members → Sync mutation fixes missing roles
- [ ] Multi-role support → User can be coach AND parent
- [ ] Access control → Permissions check both role systems correctly
- [ ] UI display → Shows functional roles correctly
- [ ] Role updates → Changes persist correctly

---

## Conclusion

**Recommended Approach**: **Option A (Simplified Dual-Layer)** with **Phase 1 immediate fixes**

This approach:
- ✅ Maximizes Better Auth's capabilities
- ✅ Maintains PlayerARC's multi-role requirements
- ✅ Reduces manual work through automation
- ✅ Provides clear separation of concerns
- ✅ Is maintainable and extensible

**Next Steps**:
1. Implement `onMemberAdded` hook (Phase 1)
2. Update invitation UI to support functional roles (Phase 1)
3. Run sync mutation to fix existing members (Phase 1)
4. Plan Phase 2 cleanup (remove duplicate roles)

---

## Questions to Consider

1. **Should we allow inviting with functional roles directly?**
   - Pro: Faster onboarding
   - Con: More complex invitation flow

2. **Should functional "admin" always map from Better Auth "admin"?**
   - Current: Yes, automatically
   - Alternative: Allow separate assignment

3. **Should we support role templates?**
   - "Coach Template": Better Auth "member" + functional "coach"
   - "Parent Template": Better Auth "member" + functional "parent"
   - "Admin Template": Better Auth "admin" + functional "admin"

4. **How should we handle role conflicts?**
   - Better Auth "member" but functional "admin" → What permissions?
   - Better Auth "admin" but no functional roles → What UI shows?

---

## References

- [Better Auth Organization Plugin](https://www.better-auth.com/docs/plugins/organization)
- [Better Auth Access Control](https://www.better-auth.com/docs/plugins/organization#custom-permissions)
- [Better Auth Hooks](https://www.better-auth.com/docs/plugins/organization#hooks)
- Current Implementation: `packages/backend/convex/auth.ts`
- Access Control: `packages/backend/convex/betterAuth/accessControl.ts`

